// Prépare les prises de Nico : une prise par réplique, nommée par son numéro dans VOICEOVER.md.
//
//   voice/01.m4a, voice/02.m4a…  (wav, m4a, mp3, aac, caf, ogg, flac : tout ce que lit ffmpeg ; « 01 salut.m4a » marche aussi)
//   npm run voice
//
// Pour chaque prise : coupe les blancs au début et à la fin, mesure la durée, écrit out/voice/NN.f32.
// Puis écrit voice/timing.js : l'animation et les sous-titres se calent sur ces vraies durées.
// Ensuite : npm run render, puis npm run audio.
import { spawnSync } from "node:child_process";
import { readdirSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "voice"), dst = path.join(root, "out", "voice");
mkdirSync(src, { recursive: true }); mkdirSync(dst, { recursive: true });
let ffmpegPath = process.env.FFMPEG;
if (!ffmpegPath) { try { ffmpegPath = (await import("ffmpeg-static")).default; } catch { ffmpegPath = "ffmpeg"; } }

const trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04";
const af = `highpass=f=80,${trim},areverse,${trim},areverse,afade=t=in:d=0.01`;
const timing = {};
const files = readdirSync(src).filter((f) => /^\d{1,2}[a-z]?\b.*\.(wav|m4a|mp3|aac|caf|ogg|flac|opus|aif|aiff)$/i.test(f)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));
for (const f of files) {
  // « 09a » : réplique ajoutée entre la 9 et la 10, sans renuméroter la suite
  const [, num, suf] = f.match(/^(\d{1,2})([a-z]?)/);
  const n = String(parseInt(num, 10)) + suf, id = num.padStart(2, "0") + suf;
  const o = path.join(dst, `${id}.f32`);
  const r = spawnSync(ffmpegPath, ["-y", "-loglevel", "error", "-i", path.join(src, f), "-ac", "1", "-ar", "48000", "-af", af, "-f", "f32le", o]);
  if (r.status !== 0) { console.error(`${f} : illisible`, r.stderr.toString()); continue; }
  timing[n] = Math.round((statSync(o).size / 4 / 48000) * 100) / 100;
  console.log(`${id}  ${timing[n].toFixed(2)} s  ${f}`);
}
writeFileSync(path.join(src, "timing.js"),
  "// Généré par `npm run voice` : durée réelle (s) de chaque prise, par numéro de réplique.\nwindow.VOICE_TIMING = " + JSON.stringify(timing, null, 1) + ";\n");
console.log(files.length ? `${files.length} prises -> voice/timing.js` : "Aucune prise dans voice/ : voice/timing.js vidé (minutage estimé).");
