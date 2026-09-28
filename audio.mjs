// Piste son : voix de Nico (si enregistrée) + bruitages synthétisés, mixés puis posés sur la vidéo déjà rendue.
// Aucun son externe : chaque bruitage est calculé ici (pas de droits, pas de fichiers à télécharger).
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
const noSfx = process.argv.includes("--no-sfx");
let ffmpegPath = process.env.FFMPEG;
if (!ffmpegPath) { try { ffmpegPath = (await import("ffmpeg-static")).default; } catch { ffmpegPath = "ffmpeg"; } }

// Minutage : on lit exactement celui de l'animation
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(root, "index.html")).href + "?render" + (cut ? `&cut=${cut}` : ""));
await page.evaluate(() => window.videoReady);
const { DURATION, cues, sfx } = await page.evaluate(() => ({ DURATION: window.VIDEO.DURATION, cues: window.VIDEO.cues, sfx: window.VIDEO.sfx }));
await browser.close();

const SR = 48000;
const mix = new Float32Array(Math.ceil((DURATION + 0.5) * SR));
const add = (buf, t, gain = 1) => { const o = Math.round(t * SR); for (let i = 0; i < buf.length && o + i < mix.length; i++) if (o + i >= 0) mix[o + i] += buf[i] * gain; };

// ---------------------------------------------------------------------------
// Synthèse
// ---------------------------------------------------------------------------
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
const len = (s) => new Float32Array(Math.round(s * SR));
const TAU = Math.PI * 2;
const lpA = (fc) => 1 - Math.exp((-TAU * fc) / SR);
function lowpass(b, fc) { let y = 0; const a = lpA(fc); for (let i = 0; i < b.length; i++) b[i] = y += a * (b[i] - y); return b; }
function highpass(b, fc) { let y = 0; const a = lpA(fc); for (let i = 0; i < b.length; i++) { y += a * (b[i] - y); b[i] -= y; } return b; }
function fade(b, fin = 0.004, fout = 0.01) { const a = fin * SR, z = fout * SR; for (let i = 0; i < b.length; i++) b[i] *= Math.min(1, i / a, (b.length - i) / z); return b; }
const gen = (s, f) => { const b = len(s); for (let i = 0; i < b.length; i++) b[i] = f(i / SR, i); return fade(b); };
const sum = (...bs) => { const b = len(Math.max(...bs.map((x) => x.length)) / SR); bs.forEach((x) => x.forEach((v, i) => (b[i] += v))); return b; };
const noise = (s, env) => gen(s, (t) => rnd() * env(t));
const tone = (s, f, env, shape = Math.sin) => { let ph = 0; return gen(s, (t) => { ph += (TAU * (typeof f === "function" ? f(t) : f)) / SR; return shape(ph) * env(t); }); };
const saw = (ph) => ((ph / TAU) % 1) * 2 - 1;
const sq = (ph) => (Math.sin(ph) > 0 ? 1 : -1);
const dec = (k) => (t) => Math.exp(-t * k);

const SYN = {
  bam: () => sum(lowpass(noise(0.3, dec(16)), 2500), tone(0.35, (t) => 90 - t * 120, dec(9))),
  whoosh: () => { const d = 0.4; const b = noise(d, (t) => Math.sin((Math.PI * t) / d) ** 2); return highpass(lowpass(b, 1800), 300).map((v) => v * 1.6); },
  clack: () => { const e = (t) => (t < 0.08 ? Math.exp(-t * 90) : Math.exp(-(t - 0.08) * 80)); return sum(tone(0.2, 2600, e), tone(0.2, 3900, e).map((v) => v * 0.6)); },
  moto: () => lowpass(tone(0.9, (t) => 45 + t * 70 + Math.sin(t * 40) * 6, (t) => Math.min(1, t * 8) * (1 - t / 0.9) * 0.9, saw), 900),
  vroom: () => lowpass(tone(1.3, (t) => (t < 0.5 ? 60 + t * 260 : 190 - (t - 0.5) * 60) + Math.sin(t * 55) * 8, (t) => Math.min(1, t * 6) * (1 - t / 1.3), (p) => Math.tanh(saw(p) * 3)), 1400),
  ding: () => sum(tone(0.9, 1320, dec(5)), tone(0.9, 2640, dec(9)).map((v) => v * 0.3)),
  fire: () => sum(lowpass(noise(0.9, (t) => Math.sin(Math.PI * t / 0.9)), 700).map((v) => v * 2), noise(0.9, (t) => (rnd() > 0.992 ? 1 : 0) * (1 - t / 0.9))),
  crackle: (l = 2) => sum(lowpass(noise(l, () => 0.5), 500).map((v) => v * 1.5), noise(l, () => (rnd() > 0.996 ? 0.8 : 0))),
  bell: () => { const r = (t) => (t < 0.18 ? 1 : t > 0.25 && t < 0.43 ? 1 : 0.35) * Math.exp(-(t % 0.25) * 6); return sum(tone(0.8, 2100, r), tone(0.8, 3150, r).map((v) => v * 0.5)); },
  pew: () => tone(0.2, (t) => 1800 - t * 7500, dec(12), sq).map((v) => v * 0.5),
  thud: () => sum(tone(0.25, (t) => 70 - t * 80, dec(14)), lowpass(noise(0.15, dec(30)), 600)),
  pop: () => tone(0.07, (t) => 500 + t * 9000, dec(50)),
  tsss: () => highpass(noise(1.0, (t) => Math.min(1, t * 30) * Math.exp(-t * 2.2)), 3500).map((v) => v * 1.4),
  tick: () => sum(tone(0.05, 950, dec(80)), highpass(noise(0.01, () => 1), 3000).map((v) => v * 0.6)),
  crack: () => { const b = len(0.35); for (const o of [0, 0.05, 0.12, 0.2]) add2(b, highpass(noise(0.08, dec(60)), 1500), o); return b; },
  sparkle: () => { const b = len(0.8); for (let k = 0; k < 6; k++) add2(b, tone(0.25, 2400 + k * 330, dec(14)).map((v) => v * 0.35), k * 0.09); return b; },
  buzz: (l = 2) => highpass(tone(l, (t) => 210 + Math.sin(t * 9) * 25 + Math.sin(t * 2.3) * 15, (t) => (0.45 + 0.3 * Math.sin(t * 3.1)) * Math.min(1, t * 5, (l - t) * 5), saw), 400).map((v) => v * 0.35),
  bip: () => tone(0.62, 1000, () => 0.55),
  scribble: () => lowpass(highpass(noise(0.55, (t) => Math.abs(Math.sin(t * 38)) * 0.9), 1200), 5000),
  click: () => sum(tone(0.02, 3800, dec(300)), tone(0.06, 2900, (t) => (t > 0.03 ? Math.exp(-(t - 0.03) * 300) : 0))).map((v) => v * 0.7),
  gasp: () => highpass(noise(0.35, (t) => Math.sin(Math.PI * t / 0.35) * 0.8), 1500),
  alarm: (l = 1.5) => tone(l, (t) => 850 + 250 * Math.sin(t * TAU * 2.5), () => 0.4, (p) => Math.tanh(Math.sin(p) * 2)),
  stamp: () => sum(tone(0.2, (t) => 110 - t * 150, dec(22)), lowpass(noise(0.12, dec(40)), 2500).map((v) => v * 1.3)),
  grab: () => lowpass(noise(0.12, dec(25)), 1200).map((v) => v * 1.5),
  ting: () => sum(tone(1.0, 3000, dec(5)), tone(1.0, 4520, dec(7)).map((v) => v * 0.4)).map((v) => v * 0.6),
  boum: () => sum(tone(1.4, (t) => 95 * Math.exp(-t * 2) + 40, dec(3.2)).map((v) => v * 1.2), lowpass(noise(0.2, dec(25)), 900)),
  count: (l = 1) => { const b = len(l); for (let x = 0; x < l; x += 0.045) add2(b, tone(0.02, 2200, dec(250)).map((v) => v * 0.4), x); return b; },
  star: () => tone(0.3, 1760, dec(12)).map((v) => v * 0.6),
  sad: () => {
    // « wah wah wah waaah » de trombone
    const notes = [[392, 0.38], [370, 0.38], [349, 0.38], [330, 1.1]];
    const b = len(2.4); let o = 0;
    for (const [f, d] of notes) { add2(b, lowpass(tone(d, (t) => f * (d > 1 ? 1 + 0.02 * Math.sin(t * 34) : 1), (t) => Math.min(1, t * 12) * Math.min(1, (d - t) * 6) * 0.8, saw), 1100), o); o += d + 0.04; }
    return b;
  },
  cards: () => highpass(noise(0.06, dec(70)), 2000).map((v) => v * 1.4),
};
function add2(b, x, t) { const o = Math.round(t * SR); for (let i = 0; i < x.length && o + i < b.length; i++) b[o + i] += x[i]; }
const GAIN = { buzz: 0.5, crackle: 0.5, alarm: 0.35, tick: 0.8, bip: 0.8, boum: 0.9, sad: 0.55, count: 0.7 };

// ---------------------------------------------------------------------------
// Voix
// ---------------------------------------------------------------------------
const voiceDir = path.join(out, "voice");
let voiced = 0, bipWin = null;
for (const c of cues) {
  const f = path.join(voiceDir, `${String(c.n).padStart(2, "0")}.f32`);
  if (c.bip) bipWin = [c.at + c.dur - 0.18, c.at + c.dur + 0.1];
  if (!existsSync(f)) continue;
  const raw = readFileSync(f);
  const buf = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4).slice();
  if (c.bip) { // on coupe « enculer » sous le bip
    for (let i = 0; i < buf.length; i++) { const t = c.at + i / SR; if (t > bipWin[0] - 0.02 && t < bipWin[1]) buf[i] = 0; }
  }
  add(buf, c.at, 1);
  voiced++;
}
if (!noSfx) for (const e of sfx) {
  const s = SYN[e.name];
  if (!s) { console.warn("bruitage inconnu :", e.name); continue; }
  add(e.name === "bip" ? SYN.bip() : s(e.len ?? undefined), e.t, (GAIN[e.name] ?? 0.6) * (voiced ? 0.55 : 1));
}

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
console.log(`${sfx.length} bruitages, ${voiced}/${cues.length} répliques enregistrées -> ${path.relative(root, wav)}`);

if (!wavOnly) {
  const base = cut ? `second-armor-${cut}` : "second-armor";
  const video = path.join(out, `${base}.mp4`);
  if (!existsSync(video)) { console.error(`Pas de vidéo : lancer d'abord npm run render${cut ? ` -- --cut=${cut}` : ""}`); process.exit(1); }
  const dst = path.join(out, `${base}-son.mp4`);
  // -14 LUFS : le niveau des vidéos TikTok / Reels
  const ff = spawn(ffmpegPath, ["-y", "-loglevel", "error", "-i", video, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", dst], { stdio: "inherit" });
  await new Promise((r) => ff.on("close", r));
  console.log(`OK -> ${path.relative(root, dst)}`);
}
