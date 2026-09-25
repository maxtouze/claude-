// Exporte la vidéo en MP4 : ouvre index.html dans Chromium (Playwright),
// capture chaque image avec seek(t) et l'envoie à ffmpeg.
//
//   npm install
//   npm run render            -> out/second-armor.mp4
//   npm run render -- --stills -> quelques captures PNG dans out/stills
//
// Variables utiles : FFMPEG=/chemin/ffmpeg, CHROMIUM=/chemin/chromium
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "out");
mkdirSync(out, { recursive: true });

const stills = process.argv.includes("--stills");
const vo = process.argv.includes("--vo");
let ffmpegPath = process.env.FFMPEG;
if (!ffmpegPath && !stills && !vo) {
  try { ffmpegPath = (await import("ffmpeg-static")).default; } catch { ffmpegPath = "ffmpeg"; }
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(root, "index.html")).href + "?render");
await page.evaluate(() => window.videoReady);
const { FPS, DURATION } = await page.evaluate(() => ({ FPS: window.VIDEO.FPS, DURATION: window.VIDEO.DURATION }));

if (vo) {
  // Génère VOICEOVER.md à partir des textes `vo` de COPY et du minutage réel des scènes.
  const { COPY, scenes } = await page.evaluate(() => ({ COPY: window.VIDEO.COPY, scenes: window.VIDEO.scenes }));
  const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`.replace(".", ",");
  let total = 0;
  const rows = scenes.map(([a, b, key]) => {
    const text = COPY[key].vo;
    const n = text.match(/[\p{L}\d']+/gu).length;
    total += n;
    return `| ${fmt(a)} – ${fmt(b)} | ${key} | ${text} | ${n} (${(n / (b - a)).toFixed(1).replace(".", ",")}/s) |`;
  });
  const md = [
    `# Voix off : Second Armor, founder story (${Math.round(DURATION)} s)`, "",
    "Texte à lire par Nico, calé sur les scènes. Rythme visé : 2 à 3 mots par seconde, ton posé, comme s'il parlait à un pote.",
    "Fichier généré par `npm run vo` à partir de `COPY` dans `video.js` : modifier les textes là-bas, pas ici.", "",
    "| Temps | Scène | Texte | Mots |", "|---|---|---|---|", ...rows, "",
    `Total : ${total} mots en ${DURATION.toFixed(1).replace(".", ",")} s.`, "",
    "## Conseils d'enregistrement", "",
    "- Enregistrer au téléphone, dans une pièce calme ; une prise par phrase, c'est plus simple à caler.",
    "- Laisser une demi-seconde de silence avant « Aujourd'hui » : c'est le moment de bascule de la vidéo.",
    "- Si la voix change, modifier aussi `vo` et `caption` dans `COPY` pour que l'écran dise la même chose.", "",
  ].join("\n");
  (await import("node:fs")).writeFileSync(path.join(root, "VOICEOVER.md"), md);
  console.log("VOICEOVER.md mis à jour");
} else if (stills) {
  mkdirSync(path.join(out, "stills"), { recursive: true });
  const ranges = await page.evaluate(() => window.VIDEO.scenes);
  for (const t of ranges.map(([a, b]) => Math.min(b - 0.3, a + (b - a) * 0.85))) {
    await page.evaluate((t) => window.VIDEO.seek(t), t);
    await page.screenshot({ path: path.join(out, "stills", `t${t.toFixed(1)}.png`) });
  }
  console.log("Captures dans out/stills");
} else {
  const file = path.join(out, "second-armor.mp4");
  const ff = spawn(ffmpegPath, [
    "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", file,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(FPS * DURATION);
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.VIDEO.seek(t), f / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % FPS === 0) process.stdout.write(`\r${Math.round((f / total) * 100)} %`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log(`\rOK -> ${path.relative(root, file)}`);
}
await browser.close();
