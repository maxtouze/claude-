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
let ffmpegPath = process.env.FFMPEG;
if (!ffmpegPath && !stills) {
  try { ffmpegPath = (await import("ffmpeg-static")).default; } catch { ffmpegPath = "ffmpeg"; }
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(root, "index.html")).href + "?render");
await page.evaluate(() => window.videoReady);
const { FPS, DURATION } = await page.evaluate(() => ({ FPS: window.VIDEO.FPS, DURATION: window.VIDEO.DURATION }));

if (stills) {
  mkdirSync(path.join(out, "stills"), { recursive: true });
  for (const t of [3.0, 8.5, 11.0, 13.0, 18.0, 22.0, 26.0, 29.5]) {
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
