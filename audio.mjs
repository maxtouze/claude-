// Piste son : les prises de voix placées sur le minutage de l'animation (+ le bip), posées sur la vidéo déjà rendue.
//
//   npm run audio                 -> out/second-armor-son.mp4 (à partir de out/second-armor.mp4)
//   npm run audio -- --cut=court  -> out/second-armor-court-son.mp4 (à partir de out/second-armor-court.mp4)
//   npm run audio -- --wav        -> out/mix.wav seulement, sans toucher à la vidéo
//
// La voix vient de out/voice/NN.f32, préparé par `npm run voice` (voir voice.mjs).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "out");
mkdirSync(out, { recursive: true });
const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=")[1] : null; };
const cut = arg("cut");
const wavOnly = process.argv.includes("--wav");
let ffmpegPath = process.env.FFMPEG;
if (!ffmpegPath) { try { ffmpegPath = (await import("ffmpeg-static")).default; } catch { ffmpegPath = "ffmpeg"; } }

// Minutage : on lit exactement celui de l'animation
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(root, "index.html")).href + "?render" + (cut ? `&cut=${cut}` : ""));
await page.evaluate(() => window.videoReady);
const { DURATION, cues } = await page.evaluate(() => ({ DURATION: window.VIDEO.DURATION, cues: window.VIDEO.cues }));
await browser.close();

const SR = 48000;
const mix = new Float32Array(Math.ceil((DURATION + 0.5) * SR));
const add = (buf, t, gain = 1) => { const o = Math.round(t * SR); for (let i = 0; i < buf.length && o + i < mix.length; i++) if (o + i >= 0) mix[o + i] += buf[i] * gain; };

// ---------------------------------------------------------------------------
// Voix
// ---------------------------------------------------------------------------
const voiceDir = path.join(out, "voice");
let voiced = 0, bipWin = null;
for (const c of cues) {
  const f = path.join(voiceDir, `${String(c.n).replace(/^\d+/, (d) => d.padStart(2, "0"))}.f32`);
  if (c.bip) bipWin = [c.at + c.dur - 0.6, c.at + c.dur + 0.1];
  if (!existsSync(f)) continue;
  const raw = readFileSync(f);
  const buf = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4).slice();
  if (c.bip) { // on coupe « enculer » sous le bip
    for (let i = 0; i < buf.length; i++) { const t = c.at + i / SR; if (t > bipWin[0] - 0.02 && t < bipWin[1]) buf[i] = 0; }
  }
  add(buf, c.at, 1);
  voiced++;
}
// Le bip sur « enculer »
if (bipWin && voiced) { const n = Math.round((bipWin[1] - bipWin[0]) * SR); add(Float32Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 1000 * i) / SR) * 0.35 * Math.min(1, i / 200, (n - i) / 200)), bipWin[0]); }

// Limiteur doux, puis WAV 16 bits
let peak = 0; for (const v of mix) peak = Math.max(peak, Math.abs(v));
const k = peak > 0.95 ? 0.95 / peak : 1;
const pcm = Buffer.alloc(mix.length * 2);
for (let i = 0; i < mix.length; i++) pcm.writeInt16LE(Math.round(Math.tanh(mix[i] * k * 1.1) * 32000), i * 2);
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write("WAVE", 8); hdr.write("fmt ", 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
hdr.write("data", 36); hdr.writeUInt32LE(pcm.length, 40);
const wav = path.join(out, cut ? `mix-${cut}.wav` : "mix.wav");
writeFileSync(wav, Buffer.concat([hdr, pcm]));
console.log(`${voiced}/${cues.length} répliques enregistrées -> ${path.relative(root, wav)}`);

if (!wavOnly) {
  const base = cut ? `second-armor-${cut}` : "second-armor";
  const video = path.join(out, `${base}.mp4`);
  if (!existsSync(video)) { console.error(`Pas de vidéo : lancer d'abord npm run render${cut ? ` -- --cut=${cut}` : ""}`); process.exit(1); }
  const dst = path.join(out, `${base}-son.mp4`);
  // -14 LUFS : le niveau des vidéos TikTok / Reels. Deux passes : une passe seule s'arrête vers -16 sur de la voix hachée.
  const LN = "loudnorm=I=-14:TP=-1.5:LRA=11";
  const m = await new Promise((r) => {
    let err = "";
    const p = spawn(ffmpegPath, ["-hide_banner", "-i", wav, "-af", LN + ":print_format=json", "-f", "null", "-"]);
    p.stderr.on("data", (d) => (err += d));
    p.on("close", () => { try { r(JSON.parse(err.slice(err.lastIndexOf("{")))); } catch { r(null); } });
  });
  const af = m ? `${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true` : LN;
  const ff = spawn(ffmpegPath, ["-y", "-loglevel", "error", "-i", video, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
    "-af", af, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", dst], { stdio: "inherit" });
  await new Promise((r) => ff.on("close", r));
  console.log(`OK -> ${path.relative(root, dst)}`);
}
