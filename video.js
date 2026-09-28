// Second Armor — founder story v5 (TikTok 9:16), style « Casually Explained ».
// Tout est piloté par le temps : seek(t) redessine l'image exacte à t secondes.
// Chaque plan renvoie son dessin SVG pour l'instant t (mode « immédiat », comme un canvas).
// Ça permet de prévisualiser dans le navigateur ET d'exporter image par image (render.mjs).
//
// Le texte de la voix off est dans les `cues` de chaque plan : il sert aux sous-titres,
// au minutage des plans et à VOICEOVER.md (`npm run vo`).
// Minutage : estimé à partir d'un débit posé (pince-sans-rire). Quand la vraie voix sera
// enregistrée, on remplace les durées estimées par les vraies (option `at` sur chaque cue).

const W = 1080, H = 1920, FPS = 30;
const WORDS_PER_SEC = 3.4; // débit de la voix off (mots par seconde), ton posé

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, x) => a + (b - a) * x;
const prog = (t, start, dur) => clamp((t - start) / dur);
const ease = {
  out: (x) => 1 - Math.pow(1 - x, 3),
  in: (x) => x * x * x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: (x) => { const c = 1.9, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
};
const pop = (t, start, dur = 0.3) => (t < start ? 0 : ease.back(prog(t, start, dur)));
const on = (t, start) => t >= start;
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const n2 = (v) => Math.round(v * 100) / 100;

// Couleurs : encre noire, une couleur d'accent (orange), rouge pour les tampons.
const INK = "#161616", ACC = "#e8622c", RED = "#d23a2a", GREEN = "#2e7d4f", PAPER = "#ffffff";
const NAVY = "#192230", TEAL = "#5b8990", GREY = "#cfcfcf", DARK = "#3b3b3b", BLONDE = "#f2cf55";
const BROWN = "#7a5234", BEIGE = "#e8d6b3", CARD = "#efe3c8", SKIN = "#ffffff";
const HAND = "Hand", MARK = "Marker", STENCIL = "Stencil", SANS = "Inter";

// ---------------------------------------------------------------------------
// Primitives SVG (renvoient des chaînes)
// ---------------------------------------------------------------------------
// q < 1 : tracé partiel (effet « dessiné à la main »)
function P(d, o = {}) {
  const { w = 7, c = INK, fill = "none", q = 1, op = 1, dash } = o;
  if (q <= 0) return "";
  let a = `d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  a += ` fill="${fill}"${q < 1 && fill !== "none" ? ' fill-opacity="0"' : ""}`;
  if (q < 1) a += ` pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${n2(1 - q)}"`;
  else if (dash) a += ` stroke-dasharray="${dash}"`;
  if (op < 1) a += ` opacity="${op}"`;
  return `<path ${a}/>`;
}
const Circ = (cx, cy, r, o = {}) => {
  const { w = 7, c = INK, fill = "none", op = 1 } = o;
  return `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" stroke="${c}" stroke-width="${w}" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ""}/>`;
};
const Dot = (cx, cy, r, c = INK) => `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" fill="${c}"/>`;
function T(str, x, y, o = {}) {
  const { size = 52, anchor = "middle", c = INK, r = 0, font = HAND, weight = 400, op = 1, lh = 1.1, stroke } = o;
  const lines = String(str).split("\n");
  const y0 = y - ((lines.length - 1) * size * lh) / 2;
  const tsp = lines.map((l, i) => `<tspan x="${n2(x)}" y="${n2(y0 + i * size * lh)}">${esc(l)}</tspan>`).join("");
  const st = stroke ? ` stroke="${stroke[1]}" stroke-width="${stroke[0]}" paint-order="stroke" stroke-linejoin="round"` : "";
  return `<text font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${c}" text-anchor="${anchor}" dominant-baseline="central"${st}${r ? ` transform="rotate(${r} ${n2(x)} ${n2(y)})"` : ""}${op < 1 ? ` opacity="${op}"` : ""}>${tsp}</text>`;
}
function G(inner, o = {}) {
  const { x = 0, y = 0, s = 1, r = 0, o: op = 1, sx, sy } = o;
  if (op <= 0 || s === 0) return "";
  const sc = sx != null || sy != null ? `scale(${n2(sx ?? s)} ${n2(sy ?? s)})` : `scale(${n2(s)})`;
  return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(r)}) ${sc}"${op < 1 ? ` opacity="${n2(op)}"` : ""}>${inner}</g>`;
}
const Rect = (x, y, w, h, o = {}) => {
  const { rx = 0, c = INK, fill = "none", sw = 7 } = o;
  return `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${rx}" fill="${fill}" stroke="${c}" stroke-width="${sw}"/>`;
};
// Flèche manuscrite, légèrement courbée
function arrow(x1, y1, x2, y2, o = {}) {
  const { c = INK, w = 6, q = 1, bend = 0.18 } = o;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
  const cx = mx - dy * bend, cy = my + dx * bend;
  const a = Math.atan2(y2 - cy, x2 - cx), L = 26;
  const h1 = [x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)];
  const h2 = [x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)];
  return P(`M${n2(x1)} ${n2(y1)} Q${n2(cx)} ${n2(cy)} ${n2(x2)} ${n2(y2)}`, { c, w, q }) +
    (q >= 1 ? P(`M${n2(h1[0])} ${n2(h1[1])} L${n2(x2)} ${n2(y2)} L${n2(h2[0])} ${n2(h2[1])}`, { c, w }) : "");
}
// Étiquette manuscrite + flèche vers (ax, ay)
function label(t, start, text, tx, ty, ax, ay, o = {}) {
  if (t < start) return "";
  const q = prog(t, start, 0.3);
  const { size = 50, c = INK, r = -3, from } = o;
  const [fx, fy] = from || [tx + (ax > tx ? 30 : -30) * 0, ty + (ay > ty ? size * 0.75 : -size * 0.75)];
  return T(text, tx, ty, { size, c, r, op: clamp(q * 2) }) + (ax != null ? arrow(fx, fy, ax, ay, { c, q: clamp(q * 1.3) }) : "");
}
// Bulle de dialogue
function bubble(x, y, w, h, tx, ty, inner, o = {}) {
  const { s = 1, fill = PAPER } = o;
  if (s <= 0) return "";
  const r = Math.min(40, h / 2);
  const bx = x - w / 2, by = y - h / 2;
  const d = `M${bx + r} ${by} H${bx + w - r} Q${bx + w} ${by} ${bx + w} ${by + r} V${by + h - r} Q${bx + w} ${by + h} ${bx + w - r} ${by + h} ` +
    `H${x + 30} L${tx} ${ty} L${x - 10} ${by + h} H${bx + r} Q${bx} ${by + h} ${bx} ${by + h - r} V${by + r} Q${bx} ${by} ${bx + r} ${by} Z`;
  return G(G(P(d, { fill, w: 6 }) + inner, { x: -x, y: -y }), { x, y, s });
}
// Tampon
function stamp(text, x, y, t, start, o = {}) {
  if (t < start) return "";
  const { c = RED, r = -12, size = 120 } = o;
  const q = prog(t, start, 0.18);
  const s = lerp(2.4, 1, ease.in(q));
  const w = text.length * size * 0.72 + 70, h = size * 1.35;
  return G(Rect(-w / 2, -h / 2, w, h, { c, sw: 12, rx: 18 }) + T(text, 0, 4, { font: STENCIL, size, c }), { x, y, s, r, o: q > 0 ? 0.92 : 0 });
}
// Mouche : vole en boucle autour de (x, y)
function fly(t, x, y, o = {}) {
  const { s = 1, seed = 1, rad = 60 } = o;
  const a = t * 3.1 + seed, px = x + Math.cos(a) * rad + Math.sin(t * 7.3 + seed) * 14, py = y + Math.sin(a * 1.3) * rad * 0.6;
  const flap = 0.4 + Math.abs(Math.sin(t * 60)) * 0.6;
  return G(`<ellipse cx="-9" cy="-8" rx="11" ry="${n2(7 * flap)}" fill="#dfe8ef" stroke="${INK}" stroke-width="2.5"/>` +
    `<ellipse cx="9" cy="-8" rx="11" ry="${n2(7 * flap)}" fill="#dfe8ef" stroke="${INK}" stroke-width="2.5"/>` +
    `<ellipse cx="0" cy="0" rx="10" ry="8" fill="${INK}"/>`, { x: px, y: py, s });
}
// Agrandit tout un dessin autour de (cx, cy)
const Z = (g, s, cx = 540, cy = 960) => G(G(g, { x: -cx, y: -cy }), { x: cx, y: cy, s });
// Petit « bruit » quand on veut qu'un truc tremble
const jit = (t, amp = 2, seed = 0) => Math.sin(t * 43 + seed) * amp;

// ---------------------------------------------------------------------------
// Bonhomme bâton
// Origine = milieu des pieds. Épaules (0,-200), hanches (0,-110), tête centrée (0,-250).
// Bras/jambes : [x, y] (main/pied) ou [xCoude, yCoude, xMain, yMain].
// ---------------------------------------------------------------------------
function stick(o = {}) {
  const {
    x = 0, y = 0, s = 1, c = INK, w = 7,
    la = [-48, -118], ra = [48, -118], ll = [-34, 0], rl = [34, 0],
    eyes = "dot", look = [0, 0], mouth = null, acc = [], q = 1, face = SKIN, body = null, r = 0,
  } = o;
  const has = (k) => acc.includes(k);
  const lim = (from, p) => (p.length === 4 ? `M${from} L${p[0]} ${p[1]} L${p[2]} ${p[3]}` : `M${from} L${p[0]} ${p[1]}`);
  const qs = (i) => clamp(q * 6 - i);
  const hx = 0, hy = -250, hr = 42;
  let back = "", front = "";
  // Cheveux derrière la tête
  if (has("blonde") || has("longhair")) {
    const hc = has("blonde") ? BLONDE : BROWN;
    back += P(`M-44 -262 Q-52 -200 -66 -150 Q-20 -160 0 -170 Q20 -160 66 -150 Q52 -200 44 -262 Q30 -300 0 -300 Q-30 -300 -44 -262 Z`, { fill: hc, w: 5 });
  }
  if (has("hairwind")) back += P(`M-40 -280 Q-120 -290 -190 -250 Q-140 -250 -120 -230 Q-180 -220 -220 -190 Q-140 -200 -40 -215 Z`, { fill: BLONDE, w: 5 });
  // Corps
  let limbs = "";
  if (body) limbs += body; // pull, etc.
  limbs += P(`M0 -208 L0 -110`, { c, w, q: qs(1) });
  limbs += P(lim("0 -190", la), { c, w, q: qs(2) });
  limbs += P(lim("0 -190", ra), { c, w, q: qs(3) });
  limbs += P(lim("0 -110", ll), { c, w, q: qs(4) });
  limbs += P(lim("0 -110", rl), { c, w, q: qs(5) });
  // Tête
  let head = q < 1 ? P(`M0 ${hy - hr} a${hr} ${hr} 0 1 0 0.1 0`, { c, w, q: qs(0), fill: face }) : Circ(hx, hy, hr, { c, w, fill: face });
  if (has("balaclava")) head = Circ(hx, hy, hr, { c, w, fill: INK }) + P(`M-30 -262 H30 V-240 H-30 Z`, { fill: PAPER, w: 3 });
  if (has("mask")) head += P(`M-40 -262 Q0 -270 40 -262 L38 -240 Q0 -248 -38 -240 Z`, { fill: INK, w: 3 });
  // Yeux
  const [lx, ly] = look;
  let f = "";
  if (q >= 1 && !has("balaclava")) {
    if (eyes === "dot") f += Dot(-14 + lx, -254 + ly, 5.5, c) + Dot(14 + lx, -254 + ly, 5.5, c);
    else if (eyes === "wide") f += Circ(-16, -256, 13, { w: 4, c, fill: PAPER }) + Circ(16, -256, 13, { w: 4, c, fill: PAPER }) + Dot(-16 + lx, -256 + ly, 4, c) + Dot(16 + lx, -256 + ly, 4, c);
    else if (eyes === "flat") f += P(`M-22 ${-254 + ly} h14 M8 ${-254 + ly} h14`, { c, w: 5 });
    else if (eyes === "closed") f += P(`M-22 -252 q7 6 14 0 M8 -252 q7 6 14 0`, { c, w: 4 });
  } else if (q >= 1 && has("balaclava")) f += Dot(-13 + lx, -251, 5, INK) + Dot(13 + lx, -251, 5, INK);
  if (q >= 1 && mouth === "flat") f += P(`M-12 -226 h24`, { c, w: 4 });
  if (q >= 1 && mouth === "o") f += Circ(0 + lx * 0.5, -224, 7, { c, w: 4 });
  if (q >= 1 && mouth === "smile") f += P(`M-14 -230 q14 12 28 0`, { c, w: 4 });
  if (q >= 1 && mouth === "sad") f += P(`M-14 -222 q14 -10 28 0`, { c, w: 4 });
  // Accessoires
  if (has("helmet")) front += P(`M-50 -256 Q-48 -306 0 -306 Q48 -306 50 -256 L58 -252 Q0 -266 -58 -252 Z`, { fill: "#8d9478", w: 6 });
  if (has("cap")) front += P(`M-42 -266 Q-40 -300 0 -300 Q40 -300 42 -266 Z`, { fill: GREY, w: 6 }) + P(`M40 -266 L80 -262`, { w: 8 });
  if (has("sunglasses")) front += P(`M-34 -262 h26 v14 q-13 6 -26 0 Z M8 -262 h26 v14 q-13 6 -26 0 Z`, { fill: INK, w: 3 }) + P(`M-8 -258 h16`, { w: 4 });
  if (has("roundglasses")) front += Circ(-15 + lx, -254, 14, { w: 3.5 }) + Circ(15 + lx, -254, 14, { w: 3.5 }) + P(`M${-1 + lx} -254 h2`, { w: 3 });
  if (has("mustache")) front += P(`M-30 -226 Q-15 -240 0 -230 Q15 -240 30 -226 Q36 -214 44 -222`, { w: 6 }) + P(`M-30 -226 Q-36 -214 -44 -222`, { w: 6 });
  if (has("sweat")) front += P(`M56 -290 q10 18 0 26 q-10 -8 0 -26 Z`, { fill: "#8fd0ff", w: 3 });
  if (has("fringe")) front += P(`M-42 -262 Q-20 -300 0 -296 Q20 -300 42 -262 Q20 -278 0 -272 Q-20 -278 -42 -262 Z`, { fill: has("blonde") ? BLONDE : BROWN, w: 4 });
  return G(back + limbs + head + f + front, { x, y, s, r });
}
const BIG = (o) => stick({ s: 1.35, ...o });

// Grosse tête face caméra (gros plan)
function bigFace(x, y, r, o = {}) {
  const { eyes = "dot", mouth = "flat", look = [0, 0], acc = [] } = o;
  let g = P(`M${x - r * 0.9} ${y + r * 2.2} Q${x - r * 0.8} ${y + r * 1.25} ${x} ${y + r * 1.15} Q${x + r * 0.8} ${y + r * 1.25} ${x + r * 0.9} ${y + r * 2.2}`, { w: 9 });
  g += P(`M${x} ${y + r} V${y + r * 1.15}`, { w: 9 });
  g += Circ(x, y, r, { w: 9, fill: SKIN });
  const [lx, ly] = look;
  if (eyes === "dot") g += Dot(x - r * 0.32 + lx, y - r * 0.12 + ly, r * 0.07) + Dot(x + r * 0.32 + lx, y - r * 0.12 + ly, r * 0.07);
  if (mouth === "flat") g += P(`M${x - r * 0.22} ${y + r * 0.45} h${r * 0.44}`, { w: 7 });
  if (acc.includes("helmet")) g += P(`M${x - r * 1.08} ${y - r * 0.08} Q${x - r * 1.1} ${y - r * 1.12} ${x} ${y - r * 1.12} Q${x + r * 1.1} ${y - r * 1.12} ${x + r * 1.08} ${y - r * 0.08} L${x + r * 1.25} ${y} Q${x} ${y - r * 0.3} ${x - r * 1.25} ${y} Z`, { fill: "#8d9478", w: 8 });
  return g;
}

// ---------------------------------------------------------------------------
// Objets
// ---------------------------------------------------------------------------
// Gilet porte-plaques, centré sur (0,0), ~300 de large
function vest(o = {}) {
  const { fill = "#b9ad86", pocket = "#a39570", q = 1 } = o;
  return G(
    P("M70 40 L110 40 Q150 72 190 40 L230 40 L240 110 L262 122 L262 290 Q150 312 38 290 L38 122 L60 110 Z", { w: 8, fill, q }) +
    (q >= 1 ? P("M60 110 L240 110", { w: 6 }) + P("M52 150 L248 150 M52 172 L248 172", { w: 4, op: 0.6 }) +
      P("M66 196 h48 v64 h-48 Z M126 196 h48 v64 h-48 Z M186 196 h48 v64 h-48 Z", { w: 6, fill: pocket }) : ""),
    { x: -150, y: -175 });
}
// Carton ouvert, centré en bas sur (0,0)
function box(o = {}) {
  const { w = 220, h = 150 } = o;
  const x0 = -w / 2;
  return P(`M${x0} ${-h} h${w} v${h} h${-w} Z`, { fill: "#d9b77e", w: 6 }) +
    P(`M${x0} ${-h} l-40 -50 l${w * 0.5} 0 l30 50 Z`, { fill: "#caa66b", w: 6 }) +
    P(`M${x0 + w} ${-h} l40 -50 l${-w * 0.5} 0 l-30 50 Z`, { fill: "#caa66b", w: 6 }) +
    P(`M${x0 + 10} ${-h + 22} h${w - 20}`, { w: 4, op: 0.5 });
}
// Billet de 100 €
function bill(x, y, o = {}) {
  const { s = 1, r = 0, legs = false, t = 0 } = o;
  let g = Rect(-60, -32, 120, 64, { fill: "#b8dcb0", sw: 5, rx: 6 }) + T("100", 0, 2, { size: 34, font: SANS, weight: 800, c: "#2f5d2a" });
  if (legs) { const k = Math.sin(t * 16) * 12; g += P(`M-20 32 l${k} 40 M20 32 l${-k} 40`, { w: 5 }); }
  return G(g, { x, y, s, r });
}
// Téléphone
function phone(x, y, w, h, inner = "", o = {}) {
  const { fill = PAPER } = o;
  return Rect(x - w / 2, y - h / 2, w, h, { rx: 44, sw: 8, fill: INK }) +
    Rect(x - w / 2 + 16, y - h / 2 + 16, w - 32, h - 32, { rx: 32, sw: 0, fill, c: "none" }) + inner;
}
// Porte-chargeur (une poche)
function pouch(o = {}) {
  return P("M-38 -60 h76 v120 h-76 Z", { fill: "#8d9478", w: 6 }) + P("M-42 -60 h84 l-8 40 h-68 Z", { fill: "#7c8368", w: 6 }) +
    P("M-20 -34 h40", { w: 4, op: 0.6 }) + P("M-22 20 h44 M-22 36 h44", { w: 3, op: 0.5 });
}
// Explosion
function boom(t, x, y, r, seed = 3) {
  const R = rng(seed);
  const pts = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2, rr = r * (i % 2 ? 0.58 : 1) * (0.85 + R() * 0.3) * (1 + Math.sin(t * 9 + i) * 0.04);
    return `${n2(x + Math.cos(a) * rr)} ${n2(y + Math.sin(a) * rr)}`;
  });
  const inner = pts.map((p) => p.split(" ").map(Number)).map(([px, py]) => `${n2(x + (px - x) * 0.6)} ${n2(y + (py - y) * 0.6)}`);
  return P(`M${pts.join(" L")} Z`, { fill: ACC, w: 6 }) + P(`M${inner.join(" L")} Z`, { fill: "#ffd24a", w: 4 });
}
// Logo Second Armor (le « A » entre quatre carrés), centré sur (0,0), largeur ~ w
function logoMark(w, color = NAVY) {
  const k = w / 857;
  const sq = (x, y) => `<path d="M${x + 6} ${y} h78 l6 6 v76 l-6 6 h-78 l-6 -6 v-76 Z"/>`;
  return `<g transform="scale(${n2(k)}) translate(-511 -511)" fill="${color}">${sq(83, 255)}${sq(850, 255)}${sq(83, 680)}${sq(850, 680)}` +
    `<path fill-rule="evenodd" d="M272 768 L422 255 L595 255 L752 768 L652 768 L618 652 L395 652 L361 768 Z M469 357 L541 357 L551 418 L598 574 L413 574 L459 418 Z"/></g>`;
}
// ---------------------------------------------------------------------------
// Vraies images découpées (style collage), dans img/ — domaine public (CC0, rawpixel)
// ---------------------------------------------------------------------------
const IMG = { moto: [900, 398], ak: [900, 258], flammes: [700, 245], velo: [900, 555] };
function Img(name, cx, cy, w, o = {}) {
  const { r = 0, op = 1, flip = false } = o;
  const [iw, ih] = IMG[name];
  const h = (w * ih) / iw;
  return G(`<image href="img/${name}.png" x="${n2(-w / 2)}" y="${n2(-h / 2)}" width="${n2(w)}" height="${n2(h)}" preserveAspectRatio="none"${flip ? ' transform="scale(-1 1)"' : ""}/>`, { x: cx, y: cy, r, o: op });
}
// Vraies photos (événement, expédition) : facultatives. Si le fichier manque, un cadre « photo à venir » s'affiche.
const PHOTOS = { caen: "img/photos/caen.jpg", amazonie: "img/photos/amazonie.jpg" };
const PHOTO_OK = {};
// Polaroid scotché, centré sur (cx, cy), largeur w, photo au format 4:5
function polaroid(name, cx, cy, w, o = {}) {
  const { r = 0, s = 1, caption = "" } = o;
  const pw = w - 50, ph = pw * 1.25, h = ph + 150;
  let g = Rect(-w / 2 + 10, -h / 2 + 14, w, h, { fill: "#d8d8d8", sw: 0 }) + Rect(-w / 2, -h / 2, w, h, { fill: PAPER, sw: 6 });
  const px = -pw / 2, py = -h / 2 + 25;
  if (PHOTO_OK[name]) g += `<image href="${PHOTOS[name]}" x="${n2(px)}" y="${n2(py)}" width="${n2(pw)}" height="${n2(ph)}" preserveAspectRatio="xMidYMid slice"/>` + Rect(px, py, pw, ph, { sw: 5 });
  else g += Rect(px, py, pw, ph, { fill: "#e9e9e9", sw: 5 }) + P(`M${px + 60} ${py + ph - 80} l120 -150 l90 100 l60 -60 l110 110`, { w: 6, op: 0.5 }) +
    Dot(px + pw - 110, py + 110, 34, "#bdbdbd") + T("photo à venir", 0, py + ph / 2, { size: 44, c: "#8a8a8a" });
  if (caption) g += T(caption, 0, h / 2 - 62, { size: 50 });
  g += Rect(-70, -h / 2 - 26, 140, 52, { fill: "#f3e7a8", sw: 0, op: 0.85 });
  return G(g, { x: cx, y: cy, r, s });
}
// Clope au bec : à placer dans le repère d'un bonhomme (bouche vers (8, -226))
function clope(t, o = {}) {
  const { smoke = true } = o;
  let g = G(Rect(0, -7, 62, 14, { fill: PAPER, sw: 4 }) + Rect(0, -7, 18, 14, { fill: "#e0a04a", sw: 4 }) + Dot(64, 0, 7, "#e0402a"), { x: 10, y: -226, r: 8 });
  if (smoke) for (let i = 0; i < 2; i++) {
    const k = (t * 0.8 + i * 0.5) % 1;
    g += P(`M${76 + k * 10} ${-222 - k * 90} q14 -14 0 -28 q-14 -14 0 -28`, { w: 4, c: "#9a9a9a", op: 1 - k });
  }
  return g;
}
// Nico « baraqué » : même tête que le bonhomme, torse en V et gros bras. k = 0 (bâton) à 1 (baraqué)
function buffStick(o = {}) {
  const { x = 0, y = 0, s = 1, k = 1, la = [-120, -120], ra = [120, -120], ll = [-40, 0], rl = [40, 0], look = [0, 0], glasses = false, glassesDy = 0, cig = false, t = 0, cap = false } = o;
  const sw = lerp(0, 100, k), ww = lerp(0, 48, k), aw = lerp(0, 30, k), lw = lerp(0, 22, k);
  const thick = (d, wi) => (wi < 2 ? P(d, { w: 7 }) : P(d, { w: wi + 14 }) + P(d, { w: wi, c: PAPER }));
  const lim = (fx, fy, p) => (p.length === 4 ? `M${fx} ${fy} L${p[0]} ${p[1]} L${p[2]} ${p[3]}` : `M${fx} ${fy} L${p[0]} ${p[1]}`);
  let g = "";
  g += thick(lim(-ww * 0.5, -110, ll), lw) + thick(lim(ww * 0.5, -110, rl), lw);
  if (k > 0.05) {
    g += P(`M${-sw} -200 Q0 -214 ${sw} -200 L${ww} -106 L${-ww} -106 Z`, { fill: PAPER, w: 7 });
    g += P(`M${-sw * 0.65} -168 Q${-sw * 0.32} -150 0 -166 Q${sw * 0.32} -150 ${sw * 0.65} -168`, { w: 5 });
    g += P(`M0 -160 V-114 M${-ww * 0.55} -142 H${ww * 0.55} M${-ww * 0.45} -125 H${ww * 0.45}`, { w: 4, op: 0.8 });
  } else g += P("M0 -208 L0 -110");
  const shx = sw * 0.92;
  g += thick(lim(-shx, -192, la), aw) + thick(lim(shx, -192, ra), aw);
  if (k > 0.3) {
    const bic = (sx, p) => { const ex = p.length === 4 ? p[0] : (sx + p[0]) / 2, ey = p.length === 4 ? p[1] : (-192 + p[1]) / 2; return `<ellipse cx="${n2((sx + ex) / 2)}" cy="${n2((-192 + ey) / 2)}" rx="${n2(aw * 1.05)}" ry="${n2(aw * 0.8)}" fill="${PAPER}" stroke="${INK}" stroke-width="6"/>`; };
    g += bic(-shx, la) + bic(shx, ra);
  }
  if (k > 0.05) g += P(`M-18 -212 V-196 M18 -212 V-196`, { w: 7 });
  g += Circ(0, -250, 42, { fill: PAPER });
  const [lx, ly] = look;
  g += Dot(-14 + lx, -254 + ly, 5.5) + Dot(14 + lx, -254 + ly, 5.5);
  if (cap) g += P(`M-42 -266 Q-40 -300 0 -300 Q40 -300 42 -266 Z`, { fill: GREY, w: 6 }) + P(`M40 -266 L80 -262`, { w: 8 });
  if (glasses) g += G(P(`M-38 -266 h32 v16 q-16 8 -32 0 Z M6 -266 h32 v16 q-16 8 -32 0 Z`, { fill: INK, w: 3 }) + P(`M-8 -261 h14 M-38 -262 l-8 -4 M38 -262 l8 -4`, { w: 4 }), { y: glassesDy });
  if (cig) g += clope(t);
  g += P(`M-10 -226 h20`, { w: 4 });
  return G(g, { x, y, s });
}
// La meuf caricaturale du fantasme : cheveux blonds raides (traits droits), haut de bikini triangle
function bikiniGirl(o = {}) {
  const { x = 0, y = 0, s = 1, la = [-70, -150], ra = [80, -280], ll = [-40, 0], rl = [40, 0] } = o;
  let g = P(`M-44 -270 Q-46 -300 0 -302 Q46 -300 44 -270 L50 -150 L-50 -150 Z`, { fill: BLONDE, w: 5 });
  for (let i = -4; i <= 4; i++) g += P(`M${i * 11} -290 L${i * 12.5} -152`, { w: 2.5, c: "#c9a22e" });
  g += stick({ la, ra, ll, rl, mouth: "smile", acc: ["fringe", "blonde"] });
  g += P("M-30 -186 L-8 -186 L-19 -166 Z M8 -186 L30 -186 L19 -166 Z", { fill: RED, w: 4 }) + P("M-8 -184 H8 M-30 -186 L-44 -196 M30 -186 L44 -196", { w: 3 });
  return G(g, { x, y, s });
}
// Nuage de pensée centré sur (cx, cy)
function cloud(cx, cy, w, h, inner = "") {
  const n = 14, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * w / 2, cy + Math.sin(a) * h / 2]);
  }
  let d = `M${n2(pts[0][0])} ${n2(pts[0][1])}`;
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n], q = pts[i - 1];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ox = (mx - cx) * 0.22, oy = (my - cy) * 0.22;
    d += ` Q${n2(mx + ox)} ${n2(my + oy)} ${n2(p[0])} ${n2(p[1])}`;
  }
  return P(d + " Z", { fill: PAPER, w: 7 }) + inner;
}
// Le fantasme complet (lunettes, clope, baraqué, kalach, bécane, meuf, flammes), en coordonnées écran.
// st : k (baraqué 0-1), glasses, cig, ak, moto (0-1 arrivée), girl, fire
function fantasy(t, st) {
  const mk = ease.out(clamp(st.moto ?? 0));
  const nx = lerp(540, 500, mk), ny = lerp(1180, 1150, mk), ns = lerp(1.6, 1.3, mk);
  let g = "";
  if (st.fire) g += Img("flammes", 1010, 1195, 470, { op: clamp(st.fire * 3) }) + Img("flammes", 1040, 1120, 320, { op: clamp(st.fire * 3) * 0.9 });
  if (mk > 0) g += Img("moto", lerp(-600, 560, mk), 1195, 860);
  if (st.girl) g += bikiniGirl({ x: 700, y: 1150, s: 1.05 * st.girl, ll: [-30, -60, -40, 0], rl: [30, -60, 40, 0] });
  const legs = mk > 0.5 ? { ll: [-50, -60, -70, 0], rl: [50, -60, 70, 0] } : {};
  const arms = st.ak ? { la: [-80, -150, -40, -150], ra: [110, -120, 60, -160] } : { la: [-110, -110], ra: [110, -110] };
  g += buffStick({ x: nx + jit(t, st.shake ? 4 : 0), y: ny, s: ns, k: st.k ?? 0, glasses: st.glasses, cig: st.cig, t, ...arms, ...legs });
  if (st.ak) g += Img("ak", nx + 10, ny - 150 * ns, 470 * st.ak, { r: -18 });
  if (st.vroom) g += T("VROOOM", 540, 520, { font: MARK, size: 170, c: ACC, r: -6, stroke: [10, INK], op: clamp(st.vroom * 3) });
  return g;
}
// Le vrai Nico : petit bonhomme sur un vélo, clope au bec
function nicoBike(t, x, y, o = {}) {
  const { s = 1, pedal = true } = o;
  const a = pedal ? t * 5 : 0;
  const fx = Math.cos(a) * 34, fy = Math.sin(a) * 34;
  let g = Img("velo", 0, 0, 520);
  g += G(stick({ la: [150, -170, 250, -145], ra: [150, -160, 255, -140], ll: [30, -50, 60 + fx, 80 + fy], rl: [20, -40, 60 - fx, 80 - fy] }) + clope(t), { x: -104, y: -45 + 110 * 0.95, s: 0.95 });
  return G(g, { x, y: y + Math.abs(Math.sin(t * 5)) * 3, s });
}
// La fenêtre de navigateur d'une annonce
function win(x, y, title, text, o = {}) {
  const { s = 1, r = 0, hl = false } = o;
  let g = Rect(-230, -115, 460, 230, { fill: PAPER, sw: 6, rx: 14 }) + Rect(-230, -115, 460, 50, { fill: "#e6e6e6", sw: 6, rx: 14 });
  g += Dot(-200, -90, 7, "#bbb") + Dot(-178, -90, 7, "#bbb") + T(title, -150, -90, { size: 26, anchor: "start", font: SANS, weight: 600, c: "#555" });
  g += Rect(-205, -45, 120, 120, { fill: "#f0ece2", sw: 4, rx: 8 });
  g += T(text, -65, 10, { size: 36, anchor: "start", c: hl ? RED : INK });
  return G(g, { x, y, s, r });
}
// L'algorithme : cheveux longs, lunettes rondes, gros pull beige
function algoGirl(t, x, y, s, o = {}) {
  const { panic = false, bag = false, r = 0 } = o;
  const sweater = P("M-58 -205 Q0 -222 58 -205 L74 -100 H-74 Z", { fill: BEIGE, w: 6 });
  const arms = panic ? { la: [-60, -170, -30, -240], ra: [60, -170, 30, -240] } : { la: [-70, -150, -40, -110], ra: [70, -150, 40, -110] };
  let g = stick({ acc: ["longhair", "roundglasses", "fringe"], body: sweater, ...arms, eyes: panic ? "wide" : "dot", mouth: panic ? "o" : null, face: panic ? "#eef3ff" : SKIN });
  if (bag) { const b = 1 + Math.sin(t * 14) * 0.18; g += G(P("M-40 -50 L40 -50 L50 50 L-50 50 Z", { fill: "#cda46b", w: 5 }), { y: -225, s: b * 0.55 }); }
  return G(g, { x, y, s, r });
}

// ---------------------------------------------------------------------------
// Graphiques
// ---------------------------------------------------------------------------
// « Mes risques » : origine (170, 1150), 700 x 820
const GR = { x0: 170, y0: 1150, w: 700, h: 820 };
function risksGraph(t, st) {
  const { x0, y0, w, h } = GR;
  let g = T("Mes risques", 520, 235, { size: 96 }) + P("M320 295 Q520 283 720 297", { w: 6 });
  g += arrow(x0, y0, x0, y0 - h, { bend: 0 }) + arrow(x0, y0, x0 + w, y0, { bend: 0 });
  g += T("risque", x0 - 45, y0 - h / 2, { size: 60, r: -90 });
  g += T("utilité", x0 + w - 70, y0 + 60, { size: 60 });
  g += P(`M${x0 + 230} ${y0 - h + 30} V${y0 - 6}`, { w: 4, dash: "14 14", op: 0.6 });
  if (st.zero) g += T("zéro\nutilité", x0 + 115, y0 - h + 90, { size: 52, op: clamp(st.zero), r: -3 });
  const pt = (x, y, txt, k, c = INK, size = 56) => k > 0
    ? G(Dot(0, 0, 16, c) + T(txt, 0, -52, { size, c }), { x, y, s: k }) : "";
  g += pt(x0 + w - 110, y0 - h + 130, "mission", st.mission ?? 1);
  g += pt(x0 + 80, y0 - 300, "poêle", st.poele ?? 0);
  g += pt(x0 + 160, y0 - 470, "oui oui", st.ouioui ?? 0);
  return g;
}
// « Nombre de fois où j'ai refait la connerie »
function tallyGraph(t, st) {
  const base = 1150;
  let g = "";
  // colonne « poêle » : paquets de 5 bâtons qui montent
  const n = Math.floor(st.poele ?? 0);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 5), k = i % 5, yb = base - 20 - row * 72;
    if (k < 4) g += P(`M${205 + k * 26} ${yb} v-56`, { w: 6 });
    else g += P(`M195 ${yb - 8} L${320} ${yb - 48}`, { w: 6 });
  }
  g += T("Nombre de fois où\nj'ai refait la connerie", 660, 260, { size: 70 });
  g += P(`M110 ${base} H970`, { w: 7 });
  g += T("poêle", 260, base + 60, { size: 60 }) + T("oui oui", 540, base + 60, { size: 60 }) + T("400 € à\nun inconnu", 820, base + 90, { size: 54 });
  if (st.inf) g += G(T("∞", 0, 0, { size: 230, font: SANS }) + T("(en cours)", 0, 130, { size: 54 }), { x: 540, y: 880, s: st.inf });
  if (st.one) g += P(`M820 ${base - 20} v-70`, { w: 7 });
  if (st.circle) g += P(`M820 ${base - 150} C900 ${base - 150} 900 ${base - 5} 820 ${base - 5} C740 ${base - 5} 735 ${base - 150} 830 ${base - 155}`, { c: RED, w: 7, q: st.circle });
  if (st.meme) g += label(t, st.meme, "même moi", 840, 760, 830, base - 160, { c: RED, size: 56 });
  if (st.plus) g += T("+1", 380, 520, { size: 70, c: ACC, op: st.plus });
  return g;
}

// ---------------------------------------------------------------------------
// Plans
// Chaque plan : des répliques (cues) [texte, pause après, sous-titre si différent],
// et draw(t, c, d) qui renvoie le dessin à l'instant t (c = début de chaque réplique, d = durée du plan).
// ---------------------------------------------------------------------------
const SHOTS = [];
const speakDur = (s) => {
  const words = s.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;
  const beats = (s.match(/[,:…]/g) || []).length;
  return Math.max(0.7, words / WORDS_PER_SEC + beats * 0.12 + 0.1);
};
// Prises de Nico : si voice/timing.js existe (généré par `npm run voice`), chaque réplique prend la durée réelle
// de sa prise au lieu de l'estimation. Les répliques sont numérotées dans l'ordre du script (01, 02…).
const VOICE_TIMING = window.VOICE_TIMING || {};
let CUE_N = 0;
function shot(key, cues, draw, opt = {}) {
  const { lead = 0.12, min = 0, dark = false, subs = true } = opt;
  let t = lead;
  const cs = cues.map(([text, pause = 0.25, sub]) => {
    const n = ++CUE_N;
    const c = { n, text, sub: sub ?? text, at: t, dur: VOICE_TIMING[n] ?? speakDur(text) };
    t += c.dur + pause;
    return c;
  });
  SHOTS.push({ key, cues: cs, draw, dur: Math.max(t, min), dark, subs });
}
// Fin d'une réplique (en temps local du plan) : suit la vraie prise quand elle existe
const cueEnd = (key, i = 0) => { const c = SHOTS.find((s) => s.key === key).cues[i]; return c.at + c.dur; };
// Le petit spectateur assis dans le coin (sections 3 à 5)
const spectator = (t, o = {}) => stick({ x: 970, y: 1300, s: 0.62, la: [-30, -150], ra: [30, -150], ll: [40, -160, 70, -110], rl: [50, -150, 85, -110], ...o });

// 1. Présentation
shot("salut", [["Salut, moi c'est Nico.", 0.35]], (t, c) => {
  const q = prog(t, 0, 0.9);
  const wave = t > 0.9 ? Math.sin((t - 0.9) * 10) * 22 : 0;
  return stick({ x: 540, y: 1180, s: 1.6, q, ra: t > 0.9 ? [70 + wave, -300] : [48, -118] }) +
    label(t, 1.0, "moi", 830, 560, 640, 700, { size: 64 });
});
// Le fantasme se construit sur le même bonhomme, fond blanc : lunettes, clope, muscles, kalach, bécane, meuf, flammes.
const FANTASY = { k: 1, glasses: 1, cig: 1, ak: 1, moto: 1, girl: 1, fire: 1, vroom: 1 };
const bam = (t, at, x, y, txt = "BAM") => (t > at && t < at + 0.45 ? T(txt, x, y, { font: MARK, size: 70, c: ACC, r: -10, stroke: [8, INK], op: clamp((at + 0.45 - t) * 4) }) : "");
shot("respect", [["… Euh. Un peu de respect.", 2.3]], (t) => {
  const st = {
    glasses: t > 0.9, cig: t > 1.2, k: ease.back(prog(t, 1.45, 0.4)), shake: t > 1.45 && t < 1.9,
    ak: pop(t, 2.1), moto: prog(t, 2.5, 0.45), girl: pop(t, 3.05), fire: prog(t, 3.35, 0.2), vroom: prog(t, 3.45, 0.2),
  };
  let g = fantasy(t, st);
  g += bam(t, 0.9, 780, 640) + bam(t, 1.45, 300, 700) + bam(t, 2.1, 820, 820);
  if (t < 3.6) g += T("moi", 830, 560, { size: 64, r: -3 }) + arrow(830, 610, t > 1.45 ? 610 : 640, 730);
  else g += label(t, 3.6, "moi (réel)", 190, 760, 390, 820, { size: 66, from: [220, 810] });
  return g;
});
shot("bulle", [["Voilà. Je préfère.", 0.3], ["Tant que personne vérifie, c'est bon.", 1.3]], (t, c) => {
  const k = ease.inOut(prog(t, c[1] - 0.15, 0.9));
  const s = lerp(1, 0.46, k), cx = lerp(560, 640, k), cy = lerp(890, 560, k);
  let g = "";
  if (k > 0) {
    g += nicoBike(t, lerp(-300, 330, k), 1180);
    g += G(cloud(0, 0, 900, 820), { x: cx, y: cy, s: s * clamp(k * 1.5), o: clamp(k * 2) });
    [[440, 1000, 14], [490, 930, 20], [540, 850, 28]].forEach(([x, y, r], i) => { if (k > 0.6 + i * 0.1) g += Circ(x, y, r, { w: 6, fill: PAPER }); });
  }
  g += G(G(fantasy(t, FANTASY), { x: -560, y: -890 }), { x: cx, y: cy, s });
  return g;
});
// 2. Le métier
shot("militaire", [["Dans la vie, je suis militaire.", 0.25], ["Des risques, j'en prends.", 0.5]], (t, c) => {
  let g = P("M0 1150 H1080", { w: 6 });
  // Nico casqué + fusil
  g += stick({ x: 290, y: 1150, s: 1.05, acc: ["helmet"], la: [60, -165], ra: [100, -170], eyes: "dot" });
  g += P("M320 972 L470 960 M330 985 l-12 30", { w: 11 });
  // muret
  g += Rect(170, 1000, 280, 150, { fill: PAPER, sw: 7 }) + P("M170 1050 H450 M170 1100 H450 M260 1000 V1050 M360 1000 V1050 M220 1050 V1100 M320 1050 V1100 M410 1050 V1100 M260 1100 V1150 M360 1100 V1150", { w: 4, op: 0.6 });
  const shots = [0.45, 0.85, 1.25];
  shots.forEach((st, i) => {
    if (t > st && t < st + 0.12) g += boom(t, 490, 958, 34, i);
    if (t > st) g += T("PEW", 600 + i * 30, 820 - i * 70, { size: 58, font: MARK, r: -8 + i * 5, op: clamp(1 - (t - st - 1.2)) });
  });
  const vil = (i, x) => {
    const tf = shots[i] + 0.15;
    let r = 0, dy = 0;
    r = 88 * ease.in(prog(t, tf, 0.3));
    const sign = Rect(-46, -186, 92, 50, { fill: PAPER, sw: 4 }) + T("MÉCHANT", 0, -161, { size: 22, font: SANS, weight: 800 }) + P("M-30 -186 L0 -206 L30 -186", { w: 3 });
    const man = stick({ acc: ["mask", "mustache"], la: [-60, -150], ra: [60, -150], eyes: "dot" }) + sign;
    return G(G(man, { y: dy }), { x, y: 1150, s: 0.85, r });
  };
  g += vil(0, 660) + vil(1, 780) + vil(2, 900);
  return Z(g, 1.18, 560, 1000);
});
// 3. Les risques inutiles
shot("graphe", [["Mais il m'arrive aussi d'en prendre des inutiles.", 0.3]], (t, c) => {
  const cz = c[0] + 1.6;
  return risksGraph(t, { mission: pop(t, 0.3), zero: prog(t, cz, 0.4) }) + spectator(t);
});
shot("poele", [["Toucher une poêle pour voir si elle est chaude.", 2.7]], (t, c, d) => {
  const vo = cueEnd("poele");
  const g0 = d - 0.9;
  if (t >= g0) return risksGraph(t, { zero: 1, poele: pop(t, g0 + 0.15) }) + spectator(t);
  if (t < vo + 0.35) {
    // gros plan : feu vif, la main arrive, touche
    const k = ease.inOut(prog(t, 0.2, vo - 0.7));
    const tx = lerp(400, 520, k), ty = lerp(640, 905, k);
    let g = Rect(80, 990, 920, 110, { fill: PAPER, sw: 7 });
    const fl = 1 + Math.sin(t * 23) * 0.06;
    g += Img("flammes", 420, 950, 260 * fl, { r: -90 }) + Img("flammes", 640, 950, 260 / fl, { r: -90 }) + Img("flammes", 540, 960, 220 * fl, { r: -90 });
    g += `<ellipse cx="540" cy="900" rx="250" ry="62" fill="${DARK}" stroke="${INK}" stroke-width="7"/>` + P("M785 895 L1030 860", { w: 20 });
    for (let i = 0; i < 4; i++) g += P(`M${410 + i * 85} ${820 - ((t * 70 + i * 30) % 90)} q12 -18 0 -36 q-12 -18 0 -36`, { w: 4, op: 0.5 });
    g += P(`M-60 420 L${tx} ${ty}`, { w: 13 });
    if (t > vo - 0.5) g += Dot(tx, ty, 14, RED) + T("TSSS", 790, 700, { size: 100, font: MARK, r: 8, c: ACC, stroke: [8, INK], op: clamp((t - vo + 0.5) * 6) });
    return g;
  }
  // presque rien : il lève la main, le doigt en feu
  const hx = 540 + 60 * 1.5, hy = 1230 - 360 * 1.5;
  const fl = 1 + Math.sin(t * 25) * 0.08;
  return stick({ x: 540, y: 1230, s: 1.5, ra: [70, -290, 60, -360] }) + Img("flammes", hx, hy - 50, 170 * fl, { r: -90 }) +
    label(t, vo + 0.9, "elle était\nchaude", 250, 560, 470, 650, { size: 60 });
}, { min: 4 });
shot("ouioui", [["Répondre « oui oui » quand ma meuf me demande si je l'écoute.", 5.3]], (t, c, d) => {
  const e = cueEnd("ouioui");
  const g0 = d - 0.9;
  if (t >= g0) return risksGraph(t, { zero: 1, poele: 1, ouioui: pop(t, g0 + 0.15) }) + spectator(t);
  const turn = t > e + 2.9 && t < e + 4.0;
  let g = "";
  g += P("M150 1150 V930 Q150 880 200 880 H880 Q930 880 930 930 V1150", { fill: "#e9e4dc", w: 7 }) + P("M150 1040 H930", { w: 6 }) + P("M150 1150 H930 M180 1150 v40 M900 1150 v40", { w: 7 });
  g += stick({ x: 360, y: 1150, s: 1.0, acc: ["blonde", "fringe"], look: [9, 0], eyes: t > e + 0.5 ? "flat" : "dot", la: [-40, -120], ra: [50, -130], ll: [-40, -60, -40, 0], rl: [0, -60, 0, 0], mouth: t < e ? (Math.sin(t * 22) > 0 ? "o" : "flat") : "flat" });
  g += stick({ x: 700, y: 1150, s: 1.0, look: turn ? [-11, 0] : [3, 11], la: [-20, -140], ra: [20, -140], ll: [-20, -60, -30, 0], rl: [20, -60, 30, 0] });
  g += Rect(678, 990, 44, 70, { fill: "#cfe8ff", sw: 5, rx: 8 });
  // elle parle, parle… puis s'arrête
  let inner = "";
  if (t < e) {
    const n = Math.floor(t * 8);
    for (let i = 0; i < Math.min(n, 9); i++) inner += P(`M${190 + (i % 3) * 120} ${520 + Math.floor(i / 3) * 55} q20 -20 40 0 t40 0 t40 0`, { w: 5 });
  } else inner += T("Tu m'écoutes ?", 390, 580, { size: 58 });
  g += bubble(390, 580, 440, 230, 380, 760, inner, { s: pop(t, 0.1) });
  if (t > e + 3.2) g += bubble(790, 700, 260, 120, 720, 800, T("oui oui", 790, 700, { size: 54 }), { s: pop(t, e + 3.2) });
  // le blanc : on se rapproche lentement de Nico, qui fixe son téléphone
  const z = lerp(1.3, 2.1, ease.inOut(prog(t, e + 0.5, 2.3)));
  return Z(g, z, lerp(540, 700, prog(t, e + 0.5, 2.3)), lerp(880, 930, prog(t, e + 0.5, 2.3)));
}, { min: 6 });
shot("inconnu", [["Envoyer 400 balles à un inconnu sur internet.", 1.4]], (t, c, d) => {
  const talk = cueEnd("inconnu") + 0.13; // fin de la phrase
  if (t < talk) {
    const k = ease.inOut(prog(t, 0.5, 1.8));
    const s = lerp(1, 0.52, k);
    const py = lerp(GR.y0 - 250, GR.y0 - 1480, ease.out(prog(t, 0.5, 1.9)));
    let g = risksGraph(t, { zero: 1, poele: 1, ouioui: SHOTS.some((x) => x.key === "ouioui") ? 1 : 0 });
    if (t > talk - 0.5) g += P(`M${GR.x0 - 30} ${GR.y0 - GR.h + 40} l60 30 l-60 30 l60 30`, { w: 8, c: RED }) + T("crac", GR.x0 + 110, GR.y0 - GR.h + 60, { size: 56, font: MARK, c: RED });
    g += G(Dot(0, 0, 22, RED) + T("400 balles\nà un inconnu", 250, 0, { size: 70, c: RED, anchor: "start" }), { x: GR.x0 + 110, y: py, s: 1 / Math.max(s, 0.55) });
    return G(G(g, { x: -540, y: -1150 }), { x: 540, y: 1150 + jit(t, t > talk - 0.5 ? 6 : 0), s }) + spectator(t);
  }
  // coupe sèche : Nico regarde la caméra, le spectateur tourne la tête
  const turned = t > talk + 0.25;
  return bigFace(540, 700, 250) +
    spectator(t, { look: turned ? [-10, 0] : [0, 0] }) +
    bubble(820, 1020, 230, 110, 930, 1130, T("frère ?", 820, 1020, { size: 52 }), { s: pop(t, talk + 0.45) });
});
shot("justif", [["… Non mais le mec avait 40 avis.", 0.2], ["Il m'a envoyé des photos, une vidéo.", 0.2], ["Tout était carré.", 0.5]], (t, c) => {
  let inner = Circ(330, 450, 52, { w: 6, fill: PAPER }) + Dot(314, 445, 5) + Dot(346, 445, 5) + P("M316 470 q14 10 28 0", { w: 4 });
  inner += T("Thomas R.", 400, 425, { size: 50, anchor: "start", font: SANS, weight: 800 });
  if (t > c[0] + 1.0) inner += T("★★★★★", 400, 480, { size: 40, anchor: "start", c: ACC, font: SANS }) + T("40 avis", 590, 482, { size: 38, anchor: "start", font: SANS, weight: 600 });
  const thumb = (x, y, k) => k > 0 ? G(Rect(-110, -95, 220, 190, { fill: "#f3efe5", sw: 5, rx: 14 }) + G(vest(), { s: 0.5 }), { x, y, s: k }) : "";
  inner += thumb(410, 660, pop(t, c[1] + 0.8)) + thumb(670, 660, pop(t, c[1] + 1.1));
  const vk = pop(t, c[1] + 1.8);
  if (vk > 0) inner += G(Rect(-240, -110, 480, 220, { fill: "#2b2f36", sw: 5, rx: 14 }) + Circ(0, 0, 52, { w: 6, c: PAPER }) + P("M-14 -26 L26 0 L-14 26 Z", { fill: PAPER, w: 3, c: PAPER }), { x: 540, y: 930, s: vk });
  let g = phone(540, 760, 620, 1000, inner);
  if (t > c[2]) g += ["✓", "✓", "✓"].map((m, i) => T(m, 130, 540 + i * 170, { size: 110, c: ACC, font: SANS, weight: 800, op: clamp((t - c[2] - i * 0.2) * 5) })).join("");
  const nod = t > c[2] ? Math.abs(Math.sin((t - c[2]) * 9)) * 10 : 0;
  return g + spectator(t, { y: 1300 + nod * 0.3, look: [0, nod * 0.6] });
});
// 4. Le gilet furtif
shot("furtif", [["Sur les photos, il était parfait.", 0.25], ["En vrai, le camo était tellement bon…", 0.55], ["que je l'ai jamais vu.", 0.8]], (t, c) => {
  let g = P("M540 230 V1260", { w: 5, dash: "18 16" });
  g += T("sur les photos", 270, 300, { size: 62 }) + G(vest(), { x: 270, y: 780, s: 0.95 });
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3, k = 0.6 + Math.abs(Math.sin(t * 4 + i)) * 0.6;
    g += G(P("M0 -24 L6 -6 L24 0 L6 6 L0 24 L-6 6 L-24 0 L-6 -6 Z", { fill: "#ffd24a", w: 3 }), { x: 270 + Math.cos(a) * 190, y: 780 + Math.sin(a) * 210, s: k });
  }
  if (t > c[1] - 0.1) {
    g += T("en vrai", 810, 300, { size: 62 });
    g += G(box({ w: 170, h: 120 }), { x: 690, y: 1240 });
    const hold = t > c[1] + 0.5;
    g += stick({ x: 880, y: 1240, s: 1.2, la: hold ? [-40, -170, -75, -205] : [-48, -118], ra: hold ? [40, -170, 75, -205] : [48, -118] });
    g += fly(t, 700, 1060, { seed: 2, rad: 50 });
    g += label(t, c[2] - 0.2, "gilet (camo\nniveau expert)", 800, 520, 880, 960, { size: 54 });
  }
  return g;
});
shot("bip", [["… Bon. Je me suis fait enculer.", 0.6, "… Bon. Je me suis fait ████."]], (t, c) => {
  const bip = cueEnd("bip") - 0.18; // « enculer » est le dernier mot
  let g = bigFace(540, 700, 250);
  if (t > bip) g += Rect(380, 780, 320, 80, { fill: INK, sw: 0, c: "none" }) + T("BIP", 540, 822, { size: 60, font: STENCIL, c: PAPER });
  return g;
});
shot("pasleseul", [["Et j'étais pas le seul.", 1.3]], (t, c) => {
  const k = ease.inOut(prog(t, 0.35, 1.4));
  const s = lerp(1.25, 0.45, k);
  const fx = lerp(0, 820, k), fy = lerp(-140, -330, k);
  let world = "";
  // la file, de l'arrière vers l'avant
  for (let i = 12; i >= 1; i--) {
    const wx = i * 185, wy = -i * 32;
    world += G(stick({ acc: ["helmet"], la: [-40, -165], ra: [40, -165] }) + G(box({ w: 120, h: 90 }), { y: -130 }) + fly(t, 0, -300, { seed: i, rad: 30, s: 0.8 }), { x: wx, y: wy });
  }
  world += stick({ la: [-40, -165], ra: [40, -165], eyes: "dot" }) + G(box({ w: 120, h: 90 }), { y: -130 }) + fly(t, 0, -300, { seed: 0, rad: 30, s: 0.8 });
  // SAV
  world += P("M-330 0 V-420", { w: 8 }) + Rect(-470, -560, 280, 150, { fill: PAPER, sw: 6 }) + T("SAV ARNAQUES", -330, -512, { size: 34, font: SANS, weight: 800 }) + T("prenez un ticket", -330, -455, { size: 36 });
  world += Rect(-400, -330, 140, 80, { fill: INK, sw: 4 }) + T("n° 4812", -330, -290, { size: 34, c: "#ff5b4a", font: SANS, weight: 800 });
  world += P("M-900 0 H3000", { w: 6 });
  return G(G(world, { x: -fx, y: -fy }), { x: 540, y: 1030, s });
});
shot("arrete", [["Je touche encore des poêles.", 0.2], ["Mais ça… même moi, j'ai arrêté.", 0.8]], (t, c) => {
  return tallyGraph(t, {
    poele: 90 * ease.out(prog(t, 0.2, 1.8)), inf: pop(t, c[0] + 0.9),
    one: t > c[1] + 0.3, circle: prog(t, c[1] + 0.8, 0.5), meme: c[1] + 1.4,
  });
});
// 5. « Nico, t'es con »
shot("tescon", [["Et là, vous allez me dire : « Nico, t'es con. Va sur Vinted. »", 0.5]], (t, c) => {
  const crossed = { la: [30, -150], ra: [-30, -160] };
  let g = stick({ x: 620, y: 1200, s: 1.2, mouth: t > 0.3 && t < 1.5 && Math.sin(t * 20) > 0 ? "o" : "flat" });
  g += stick({ x: 140, y: 1220, s: 0.85, ...crossed, eyes: "flat" }) + stick({ x: 300, y: 1250, s: 0.8, ...crossed, eyes: "flat" }) + stick({ x: 850, y: 1230, s: 0.85, ...crossed, eyes: "flat" });
  g += bubble(170, 810, 260, 110, 150, 930, T("t'es con", 170, 810, { size: 50 }), { s: pop(t, c[0] + 1.6) });
  g += bubble(340, 610, 230, 110, 310, 960, T("Vinted", 340, 610, { size: 50 }), { s: pop(t, c[0] + 2.4) });
  g += bubble(760, 780, 290, 110, 840, 930, T("bah eBay ?", 760, 780, { size: 50 }), { s: pop(t, c[0] + 3.0) });
  return Z(g, 1.12, 540, 1000);
});
const WINS = [
  ["Marketplace · Déguisements", "Porte-plaques\n(déguisement)"], ["Groupe Facebook · Matos", "Plaque de\ncuisson"], ["Telegram · Occaz", "« dispo ? »\n(vu)"],
  ["Vinted", "Costume\nde pirate"], ["eBay", "Plaquettes\nde frein"], ["Groupe Facebook #2", "Annonce\nsupprimée"], ["Telegram #2", "Lien mort"],
  ["Marketplace", "Tondeuse"], ["Discord · #vente", "…"], ["Vinted", "Treillis\n2 ans"], ["Groupe privé", "Demande\nenvoyée"],
  ["eBay", "Gilet jaune"], ["Telegram #3", "Photo floue"], ["Facebook", "VENDU"], ["Marketplace", "Porte-plaques\n400 €"],
];
shot("ordi", [["Sauf que là-bas, ton porte-plaques, il est rangé dans « Déguisements ».", 0.25], ["Alors trouver du matos, c'est une chasse au trésor.", 0.25], ["Et si tu tombes enfin sur le bon truc… t'as de la chance.", 0.5]], (t, c, d) => {
  let g = Rect(60, 320, 960, 640, { fill: "#f4f6f8", sw: 10, rx: 18 }) + P("M540 960 V1020 M430 1020 H650", { w: 10 });
  const R = rng(11);
  const pos = WINS.map((_, i) => (i === 0 ? [540, 610, 0] : i === WINS.length - 1 ? [540, 620, 0] : [lerp(300, 780, R()), lerp(450, 800, R()), lerp(-8, 8, R())]));
  const t0 = c[0] + 0.3, t1 = c[1] + 0.2, step = (c[2] - t1) / (WINS.length - 2);
  WINS.forEach(([title, text], i) => {
    const at = i === 0 ? t0 : i === WINS.length - 1 ? c[2] + 0.9 : t1 + (i - 1) * step;
    const k = pop(t, at, 0.22);
    if (k > 0) g += win(pos[i][0], pos[i][1], title, text, { s: k * (i === WINS.length - 1 ? 1.6 : 1.3), r: pos[i][2] });
  });
  if (t > t0 + 1.4 && t < t1) g += P("M250 490 C520 440 800 450 790 505 C780 550 470 560 250 535 C210 530 210 500 280 485", { c: RED, w: 7, q: prog(t, t0 + 1.4, 0.4) });
  const n = WINS.filter((_, i) => t > (i === 0 ? t0 : i === WINS.length - 1 ? c[2] + 0.9 : t1 + (i - 1) * step)).length;
  if (n > 1) g += T(`onglet ${n}/${WINS.length}`, 540, 260, { size: 60, c: n >= WINS.length ? ACC : INK });
  if (t > c[1] + 0.8 && t < c[2] + 0.9) g += T("chasse au trésor", 540, 190, { size: 64, r: -3, c: ACC });
  if (t > c[2] + 1.2) g += P("M200 560 C520 470 900 490 890 620 C880 760 520 780 190 700 C120 680 130 590 260 550", { c: ACC, w: 9, q: prog(t, c[2] + 1.2, 0.4) }) + T("enfin !", 860, 400, { size: 70, c: ACC, r: 8 });
  // Nico, de dos, devant l'écran
  g += P("M400 1330 V1210 Q400 1180 430 1180 H650 Q680 1180 680 1210 V1330", { fill: "#d9d9d9", w: 7 });
  g += Circ(540, 1090, 64, { fill: PAPER, w: 8 }) + P("M540 1154 V1300 M540 1190 L430 1120 M540 1190 L650 1120", { w: 9 });
  return g;
});
shot("algo", [["Enfin… si tu t'es pas fait bannir.", 0.2], ["Parce que pour un algorithme bien-pensant, « porte-chargeur », c'est de l'apologie du terrorisme.", 0.9]], (t, c) => {
  const t1 = t - c[1];
  const panic = t1 > 2.0, bag = t1 > 3.1 && t1 < 4.3, tel = t1 > 4.1;
  let g = "";
  // l'algorithme : cheveux longs, lunettes rondes, gros pull beige, tote bag
  const sweater = P("M-58 -205 Q0 -222 58 -205 L74 -100 H-74 Z", { fill: BEIGE, w: 6 });
  const arms = panic ? { la: [-60, -170, -30, -240], ra: [60, -170, 30, -240] } : { la: [-70, -150, -40, -110], ra: [70, -150, 40, -110] };
  g += stick({ x: 740, y: 1180, s: 1.15, acc: ["longhair", "roundglasses", "fringe"], body: sweater, ...arms, eyes: panic ? "wide" : "dot", mouth: panic ? "o" : null, face: panic ? "#eef3ff" : SKIN });
  // tote bag
  g += P("M800 960 L810 900 L850 900 L860 960", { w: 5 }) + Rect(780, 960, 110, 120, { fill: "#f1ead6", sw: 5 }) + T("bien-\nveillance", 835, 1020, { size: 22 });
  if (bag) { const b = 1 + Math.sin(t1 * 14) * 0.18; g += G(P("M-40 -50 L40 -50 L50 50 L-50 50 Z", { fill: "#cda46b", w: 5 }), { x: 740, y: 1180 - 1.15 * 225, s: b * 0.55 }); }
  // bureau
  g += Rect(110, 1080, 860, 34, { fill: PAPER, sw: 7 }) + P("M150 1114 V1260 M930 1114 V1260", { w: 7 });
  // gourde + tisane + safe space
  g += Rect(560, 960, 44, 120, { fill: "#bfe3d0", sw: 5, rx: 10 }) + Dot(572, 1000, 8, ACC) + Dot(590, 1035, 7, "#e06aa8") + Dot(575, 1058, 6, "#5b8990");
  g += P("M900 1030 h55 v50 h-55 Z M955 1042 q18 0 18 14 q0 14 -18 14", { fill: PAPER, w: 5 });
  for (let i = 0; i < 2; i++) g += P(`M${915 + i * 22} ${1010 - ((t * 40 + i * 20) % 40)} q8 -10 0 -20`, { w: 3, op: 0.5 });
  g += P("M130 1080 L170 1010 H290 L330 1080", { fill: PAPER, w: 5 }) + T("safe space", 230, 1045, { size: 30 });
  // écran avec l'annonce
  const fall = t1 > 5.6 ? ease.in(prog(t1, 5.6, 0.6)) : 0;
  let scr = Rect(140, 640, 430, 280, { fill: PAPER, sw: 8, rx: 12 }) + P("M355 920 V960 M305 960 H405", { w: 7 });
  let card = G(pouch(), { x: 215, y: 770, s: 0.8 }) + T("Porte-chargeur", 275, 720, { size: 30, anchor: "start", font: SANS, weight: 800 }) + T("bon état · 15 €", 275, 770, { size: 32, anchor: "start" }) + T("vendu par Nico", 275, 820, { size: 30, anchor: "start", c: "#666" });
  if (t1 > 2.6) card += G(P("M0 -46 L48 40 H-48 Z", { fill: "#ffd24a", w: 5 }) + T("!", 0, 14, { size: 50, font: SANS, weight: 800 }) + T("contenu choquant", 0, 80, { size: 30, c: RED }), { x: 350, y: 800, s: pop(t1, 2.6) });
  if (t1 > 5.0) card += stamp("FICHÉ S", 350, 780, t1, 5.0, { size: 60, r: -14 });
  g += scr + G(card, { y: fall * 700, r: fall * 25 });
  if (fall > 0) g += `<ellipse cx="350" cy="1300" rx="170" ry="26" fill="${INK}"/>`;
  // téléphone rouge + gyrophare
  if (tel) {
    g += P("M640 1040 h90 v40 h-90 Z", { fill: RED, w: 5 });
    const blink = Math.floor(t1 * 6) % 2;
    g += P("M320 640 v-40 h60 v40", { fill: blink ? RED : "#7a1f18", w: 5 });
    if (blink) g += P("M280 600 l-40 -30 M420 600 l40 -30 M350 580 v-45", { c: RED, w: 6 });
  }
  g += label(t, c[0] + 0.3, "l'algorithme", 800, 560, 745, 690, { size: 60 });
  return Z(g, 1.15, 560, 1000);
});
shot("poche", [["… C'est une poche.", 0.9]], (t) => {
  return stick({ x: 540, y: 1220, s: 1.45, ra: [60, -250, 70, -320] }) + G(pouch(), { x: 540 + 70 * 1.45, y: 1220 - 350 * 1.45, s: 1.1 }) +
    label(t, 0.5, "une poche", 860, 480, 700, 640, { size: 58 });
});
// 6. La solution
function modDesk(o = {}) {
  let g = Rect(170, 1040, 740, 200, { fill: PAPER, sw: 7 }) + T("MODÉRATION", 540, 1140, { size: 56, font: SANS, weight: 800 });
  return g;
}
shot("couilles", [["Ce qu'il nous fallait, c'est un Vinted avec deux paires de couilles.", 1.7]], (t, c, d) => {
  const walk = ease.out(prog(t, 0.2, 1.0));
  const bx = lerp(-250, 380, walk);
  const grab = t > 1.35, thr = prog(t, 2.0, 0.9);
  let g = "";
  g += Rect(470, 1040, 440, 30, { fill: PAPER, sw: 7 }) + P("M500 1070 V1240 M880 1070 V1240", { w: 7 });
  // l'algorithme, qui panique dans son sac en papier… puis s'envole
  if (thr < 1) {
    const ax = grab ? lerp(bx + 150, 1000, ease.out(thr)) : 690, ay = grab ? lerp(760, 150, ease.out(thr)) - (thr > 0 ? 0 : 0) : 1180;
    g += algoGirl(t, ax, ay, grab ? lerp(0.9, 0.05, thr) : 1, { panic: true, bag: !grab, r: grab ? thr * 900 : 0 });
  } else if (t < 3.3) g += G(P("M0 -30 L8 -8 L30 0 L8 8 L0 30 L-8 8 L-30 0 L-8 -8 Z", { fill: "#ffd24a", w: 4 }), { x: 1000, y: 150, s: 1 + Math.sin(t * 30) * 0.3 }) + T("ting", 1000, 220, { size: 44 });
  // le gars du milieu : baraqué, calme
  const sit = t > 3.1;
  const arms = grab && thr < 0.3 ? { la: [-120, -140], ra: [110, -330] } : sit ? { la: [-110, -150, -60, -170], ra: [120, -120] } : { la: [-120, -120], ra: [120, -120] };
  g += buffStick({ x: sit ? 690 : bx, y: 1180, s: 1.05, k: 1, glasses: true, cap: true, ...arms });
  if (sit) g += Rect(620, 990, 46, 54, { fill: PAPER, sw: 5, rx: 5 }) + P("M635 975 q8 -12 0 -24", { w: 3, op: 0.5 });
  g += label(t, d - 1.3, "deux paires\nde couilles", 330, 700, 600, 830, { size: 56 });
  return Z(g, 1.3, 600, 1000);
});
const LISTINGS = [["Porte-chargeur", "15 €", true, "… c'est une poche."], ["Porte-plaques", "400 €", true, null], ["Grenade (vraie)", "30 €", false, "non."]];
shot("moderation", [["Des gars du milieu, à la place d'un algorithme qui panique.", 1.6]], (t) => {
  let g = buffStick({ x: 540, y: 1150, s: 1.1, k: 1, glasses: true, cap: true, la: [-110, -150, -60, -170], ra: [130, -200, 170, -300] });
  g += Rect(470, 950, 46, 54, { fill: PAPER, sw: 5, rx: 5 }) + modDesk();
  LISTINGS.forEach(([name, price, ok, say], i) => {
    const t0 = 0.3 + i * 1.45;
    const inK = ease.out(prog(t, t0, 0.35)), outK = ease.in(prog(t, t0 + 1.15, 0.3));
    if (inK <= 0 || outK >= 1) return;
    const x = lerp(-300, 540, inK) + outK * (ok ? 900 : 0), y = 560 + (ok ? 0 : outK * 900), r = ok ? 0 : outK * 200;
    let card = Rect(-240, -95, 480, 190, { fill: PAPER, sw: 6, rx: 14 }) + G(ok && i === 0 ? pouch() : i === 1 ? vest() : Circ(0, 0, 60, { fill: "#6c7556" }) + P("M0 -60 v-20 h20", { w: 6 }), { x: -160, y: 0, s: i === 1 ? 0.45 : 0.8 });
    card += T(name, -70, -30, { size: 40, anchor: "start", font: SANS, weight: 800 }) + T(price, -70, 30, { size: 40, anchor: "start" });
    card += stamp(ok ? "VALIDÉ" : "REFUSÉ", 60, 0, t, t0 + 0.55, { c: ok ? GREEN : RED, size: 64, r: -10 });
    g += G(card, { x, y, r });
    if (say && t > t0 + 0.3 && t < t0 + 1.2) g += bubble(820, 820, 380, 100, 640, 890, T(say, 820, 820, { size: 44 }));
  });
  return g;
});
shot("verifient", [["Et eux, ils vérifient.", 0.3], ["… ok.", 1.1]], (t, c) => {
  const ride = ease.out(prog(t, 0, 0.8));
  const bx = lerp(-400, 300, ride);
  let g = buffStick({ x: 800, y: 1150, s: 0.95, k: 1, glasses: true, cap: true, glassesDy: 22 * prog(t, 0.9, 0.3), la: [-110, -130], ra: [110, -130] });
  g += Rect(620, 1060, 420, 200, { fill: PAPER, sw: 7 }) + T("MODÉRATION", 830, 1160, { size: 46, font: SANS, weight: 800 });
  g += nicoBike(t, bx, 1200, { pedal: t < 0.8 || t > c[1] + 0.6 });
  const popK = prog(t, 1.9, 0.25);
  if (popK < 1) {
    const cx = bx + 150, cy = 560;
    g += [[bx - 30, 1000, 14], [bx + 20, 930, 20], [bx + 70, 850, 28]].map(([x, y, r]) => Circ(x, y, r, { w: 6, fill: PAPER })).join("");
    g += G(cloud(0, 0, 900, 820) + G(fantasy(t, FANTASY), { x: -560, y: -890 }), { x: cx, y: cy, s: 0.42 * (1 + popK * 0.3), o: 1 - popK });
    g += stamp("REFUSÉ", cx, cy, t, 1.35, { size: 76, r: -12 });
  } else if (t < 2.6) g += T("POP", bx + 150, 560, { font: MARK, size: 110, c: ACC, stroke: [8, INK], op: clamp((2.6 - t) * 2) });
  g += bubble(bx + 260, 880, 170, 100, bx + 120, 1000, T("… ok.", bx + 260, 880, { size: 50 }), { s: pop(t, c[1]) });
  return g;
});
shot("garantie", [["Et chaque transaction garantie.", 2.9]], (t) => {
  let g = stick({ x: 170, y: 1220, s: 0.9 }) + T("toi", 170, 1290, { size: 44 });
  g += stick({ x: 860, y: 1220, s: 0.9, acc: ["cap"] }) + T("vendeur", 860, 1290, { size: 44 });
  // coffre-fort
  g += Rect(400, 820, 280, 260, { fill: "#d9dde3", sw: 8, rx: 14 }) + Circ(540, 950, 60, { w: 7, fill: PAPER }) + P("M540 950 l30 -30 M600 950 h40", { w: 7 }) + T("Second Armor", 540, 1130, { size: 44 });
  const bx1 = lerp(230, 540, ease.inOut(prog(t, 0.3, 0.7))), by1 = lerp(1000, 950, ease.inOut(prog(t, 0.3, 0.7)));
  if (t < 1.05) g += bill(bx1, by1);
  else if (t < 2.5) g += bill(540, 740 + jit(t, 2), { s: 0.8 });
  const bk = ease.inOut(prog(t, 1.1, 0.8));
  if (t > 1.1) g += G(box({ w: 120, h: 90 }), { x: lerp(860, 260, bk), y: 1225 });
  g += Rect(430, 520, 60, 60, { fill: PAPER, sw: 6 }) + T("reçu ?", 600, 550, { size: 52 });
  if (t > 2.05) g += P("M440 550 l18 20 l32 -44", { w: 9, c: GREEN, q: prog(t, 2.05, 0.25) });
  if (t > 2.5) g += bill(lerp(540, 860, ease.inOut(prog(t, 2.5, 0.6))), lerp(740, 1000, ease.inOut(prog(t, 2.5, 0.6))));
  if (t > 3.2) g += G(vest(), { x: 260, y: 1000, s: 0.45 * pop(t, 3.2) }) + label(t, 3.6, "pas de mouche", 330, 700, 280, 900, { size: 52 });
  return Z(g, 1.12, 540, 950);
});
shot("cree", [["Alors oui, je touche encore des poêles.", 0.2], ["Mais ça, c'est moi qui l'ai créé.", 0.2], ["Ça s'appelle Second Armor.", 0.5]], (t, c) => {
  const point = t > c[1];
  let g = stick({ x: 220, y: 1220, s: 1.25, ra: point ? [110, -230] : [60, -250, 70, -320] });
  if (!point) g += Dot(220 + 70 * 1.25, 1220 - 320 * 1.25, 12, RED);
  else g += Dot(220 + 110 * 1.25, 1220 - 230 * 1.25, 12, RED);
  const drop = ease.in(prog(t, c[1] + 0.2, 0.35));
  const sh = t > c[1] + 0.55 && t < c[1] + 0.9 ? jit(t * 3, 12) : 0;
  if (t > c[1] + 0.2) g += G(logoMark(430, NAVY), { x: 680 + sh, y: lerp(-300, 700, drop) + sh });
  if (t > c[1] + 0.55) g += T("BOUM", 900, 470, { size: 70, font: MARK, r: 10, op: clamp(1.5 - (t - c[1] - 0.55)) });
  if (t > c[2]) g += G(T("SECOND ARMOR", 0, 0, { size: 82, font: SANS, weight: 800, c: NAVY }), { x: 690, y: 1000, s: pop(t, c[2]) });
  return g;
});
shot("dixmille", [["Et faut croire que c'est pas trop con :", 0.15], ["on est déjà 10 000,", 0.15], ["avec plus de 300 transactions notées cinq étoiles.", 0.8]], (t, c) => {
  const x0 = 140, y0 = 1120, w = 800, h = 640;
  let g = arrow(x0, y0, x0, y0 - h - 40, { bend: 0 }) + arrow(x0, y0, x0 + w + 20, y0, { bend: 0 }) + T("membres", x0 + 20, y0 - h - 70, { size: 46, anchor: "start" });
  const k = ease.inOut(prog(t, 0.2, c[1] + 1.0));
  const curve = (u) => [x0 + u * w, y0 - 20 - Math.pow(u, 2.4) * (h - 40)];
  const pts = [];
  for (let i = 0; i <= 40; i++) pts.push(curve((i / 40) * k));
  g += P("M" + pts.map((p) => `${n2(p[0])} ${n2(p[1])}`).join(" L"), { w: 8, c: ACC });
  // bonshommes sous la courbe
  const R = rng(7);
  let men = 0;
  for (let i = 0; i < 170; i++) {
    const u = R(), v = R();
    if (u > k) continue;
    const [, cy] = curve(u);
    const y = y0 - 8 - v * (y0 - cy - 30);
    if (y > y0 - 4) continue;
    men++;
    g += stick({ x: x0 + 20 + u * (w - 30), y, s: 0.14, w: 16 });
  }
  if (t > 0.5) g += label(t, 0.5, "au début :\nmon unité", 360, 780, x0 + 40, y0 - 60, { size: 44 });
  const n = Math.round(10000 * ease.out(prog(t, c[1], 1.0)));
  if (t > c[1]) g += T(n.toLocaleString("fr-FR").replace(/ | /g, " "), 540, 300, { size: 150, font: SANS, weight: 800, c: NAVY });
  if (t > c[2]) {
    g += T("300+ transactions", 470, 1240, { size: 50, font: SANS, weight: 800 });
    for (let i = 0; i < 5; i++) g += G(T("★", 0, 0, { size: 60, c: ACC, font: SANS }), { x: 740 + i * 58, y: 1240, s: pop(t, c[2] + 1.0 + i * 0.15) });
  }
  return g;
});
// 6 bis. Rendre à la communauté
const AMAZONIE_COMPTE = "@son.compte"; // À REMPLACER : le compte de l'ancien des forces spéciales
shot("rendre", [["Et le but, c'est de rendre à la communauté au fur et à mesure qu'on grandit.", 0.3], ["Pour l'instant, on est encore en perte.", 1.3]], (t, c) => {
  let g = "";
  if (t < c[1]) {
    // Nico tend des cartons à la section
    for (let i = 0; i < 5; i++) {
      const x = 610 + (i % 3) * 150 + (i > 2 ? 75 : 0), y = i > 2 ? 1300 : 1180;
      g += stick({ x, y, s: 0.7, acc: ["helmet"], la: [-40, -130], ra: [40, -130], mouth: t > 1.2 + i * 0.3 ? "smile" : null });
    }
    const k = ease.inOut(prog(t, 0.5, 0.8));
    g += stick({ x: 230, y: 1240, s: 1.1, la: [-40, -120], ra: [lerp(60, 120, k), -150] });
    g += G(box({ w: 150, h: 100 }), { x: lerp(340, 470, k), y: lerp(1090, 1060, k) });
    g += label(t, 1.6, "la communauté", 700, 780, 700, 930, { size: 54 });
    return Z(g, 1.25, 560, 1100);
  }
  // En perte : la courbe plonge, Nico retourne ses poches
  const t1 = t - c[1];
  const x0 = 140, y0 = 620, w = 800;
  g += arrow(x0, 1000, x0, 300, { bend: 0 }) + P(`M${x0} ${y0} H${x0 + w}`, { w: 5, op: 0.5 }) + T("compte en banque", x0 + 20, 270, { size: 46, anchor: "start" }) + T("0 €", x0 - 20, y0 + 10, { size: 38, anchor: "end" });
  const k = ease.inOut(prog(t1, 0.1, 1.4));
  const pts = [];
  for (let i = 0; i <= 40; i++) { const u = (i / 40) * k; pts.push([x0 + u * w, y0 - 60 + Math.pow(u, 1.8) * 360]); }
  g += P("M" + pts.map((p) => `${n2(p[0])} ${n2(p[1])}`).join(" L"), { w: 8, c: RED });
  g += stick({ x: 540, y: 1290, s: 0.95, la: [-60, -60], ra: [60, -60], eyes: "dot" });
  g += P("M515 1180 q-30 5 -40 30 q25 10 45 -10 Z M565 1180 q30 5 40 30 q-25 10 -45 -10 Z", { fill: PAPER, w: 5 });
  if (t1 > 0.8) g += fly(t1, 540, 1060, { s: 0.8, rad: 50 });
  g += label(t, c[1] + 1.4, "c'est un\ninvestissement", 820, 1080, 900, 970, { size: 50 });
  return g;
});
shot("hockey", [["Mais on a déjà sponsorisé les Frères d'Armes :", 0.15], ["un match de hockey à Caen, pour le D-Day,", 0.15], ["au profit du Bleuet de France.", 1.0]], (t, c) => {
  const k = ease.out(prog(t, 0.1, 0.5));
  let g = T("LES FRÈRES D'ARMES", 540, 190, { size: 76, font: STENCIL, c: NAVY, op: clamp(t * 3) });
  g += T("Forces alliées vs Drakkars de Caen", 540, 265, { size: 46, op: clamp(t * 3 - 1) });
  g += polaroid("caen", lerp(1500, 600, k), 760, 600, { r: lerp(12, -3, k), caption: "Caen, 5 juin 2026" });
  if (t > c[0] + 0.8) g += G(logoMark(150, NAVY), { x: 880, y: 1100, r: 10, s: pop(t, c[0] + 0.8) });
  if (t > c[1]) g += label(t, c[1] + 0.3, "D-Day,\n6 juin 44", 160, 380, 290, 460, { size: 60, c: ACC });
  if (t > c[2]) {
    // bleuet dessiné
    const s = pop(t, c[2] + 0.2);
    let f = P("M0 0 V120", { w: 6, c: GREEN });
    for (let i = 0; i < 8; i++) f += G(`<ellipse cx="0" cy="-34" rx="16" ry="30" fill="#3f6fd1" stroke="${INK}" stroke-width="4"/>`, { r: i * 45 });
    f += Dot(0, 0, 14, NAVY);
    g += G(f, { x: 170, y: 1010, s }) + T("Bleuet\nde France", 170, 1200, { size: 44, op: clamp((t - c[2]) * 3) });
  }
  return g;
});
shot("amazonie", [["Et on soutient un ancien des forces spéciales,", 0.1], ["qui part dix jours en autonomie en Amazonie.", 0.3], ["Allez le suivre. Il va en avoir besoin.", 1.3]], (t, c) => {
  const k = ease.out(prog(t, 0.1, 0.5));
  let g = "";
  // feuillage dessiné autour
  for (let i = 0; i < 9; i++) {
    const x = [80, 1000, 60, 1020, 150, 930, 40, 1040, 540][i], y = [260, 240, 700, 660, 1050, 1030, 1640, 1620, 110][i];
    g += G(P("M0 0 q60 -80 0 -170 q-60 90 0 170 Z M0 0 v-160", { fill: "#6fae5c", w: 5 }), { x, y: y + 80, r: (i % 2 ? 1 : -1) * (20 + i * 7), s: 1.1 });
  }
  g += polaroid("amazonie", lerp(-500, 540, k), 640, 580, { r: lerp(-12, 3, k), caption: "10 jours, en autonomie" });
  if (t > c[1] + 0.3) g += fly(t, 800, 420, { rad: 70 }) + fly(t, 300, 560, { rad: 55, seed: 3 });
  if (t > c[2]) {
    // bouton « suivre »
    const s = pop(t, c[2]);
    const clicked = t > c[2] + 1.1;
    g += G(Rect(-400, -70, 800, 140, { fill: PAPER, sw: 6, rx: 70 }) + T(AMAZONIE_COMPTE, -360, 0, { size: 54, font: SANS, weight: 800, anchor: "start" }) +
      Rect(120, -48, 250, 96, { fill: clicked ? GREY : ACC, sw: 5, rx: 48 }) + T(clicked ? "Suivi ✓" : "Suivre", 245, 0, { size: 46, font: SANS, weight: 800, c: clicked ? INK : PAPER }), { x: 540, y: 1200, s });
    const m = ease.inOut(prog(t, c[2] + 0.4, 0.6));
    g += G(P("M0 0 L0 60 L16 46 L28 72 L38 67 L27 42 L48 42 Z", { fill: PAPER, w: 5 }), { x: lerp(1000, 800, m), y: lerp(1420, 1210, m), s: t > c[2] + 1.05 && t < c[2] + 1.2 ? 0.85 : 1 });
  }
  return g;
});
// 7. Fin
shot("continuez", [["Alors continuez à prendre des risques. Même des inutiles.", 0.4]], (t, c, d) => {
  return tallyGraph(t, { poele: 90, inf: 1, one: true, circle: 1, meme: -1, plus: prog(t, d * 0.5, 0.3) }) +
    (t > d * 0.5 ? P("M370 560 v-56", { w: 6, c: ACC }) : "");
});
shot("belote", [["Mais si vous devez perdre 400 balles…", 0.3], ["perdez-les à la belote avec la section.", 1.9]], (t, c) => {
  const t1 = t - c[1];
  let g = "";
  const soldier = (x, y, s, o = {}) => stick({ x, y, s, acc: ["helmet"], ...o });
  g += soldier(420, 1000, 0.8, { la: [-30, -150], ra: [30, -150] }) + soldier(660, 1000, 0.8, { la: [-30, -150], ra: [30, -150] });
  g += Rect(330, 1000, 420, 40, { fill: "#c9b98f", sw: 7 }) + P("M370 1040 L420 1250 M710 1040 L660 1250 M370 1250 L710 1040 M710 1250 L370 1040", { w: 6 });
  for (let i = 0; i < 3; i++) g += Rect(430 + i * 60, 985, 44, 18, { fill: PAPER, sw: 3 });
  const pushed = ease.inOut(prog(t1, 1.4, 0.6));
  if (t > c[1] + 0.2) g += bill(lerp(300, 520, pushed), lerp(960, 975, pushed), { s: 0.55 }) + bill(lerp(320, 560, pushed), lerp(975, 985, pushed), { s: 0.55, r: 10 });
  const shrug = t1 > 2.1;
  g += soldier(250, 1240, 1.0, { la: shrug ? [-60, -200, -70, -260] : [60, -160], ra: shrug ? [60, -200, 80, -250] : [80, -170], eyes: "dot" });
  g += soldier(830, 1240, 1.0, { la: t1 > 0.9 ? [-60, -220, -40, -290] : [-80, -160], ra: t1 > 0.9 ? [60, -220, 40, -290] : [-60, -150], mouth: t1 > 0.9 ? "smile" : null });
  if (t1 > 0.9) g += T("belote !", 800, 830, { size: 50, op: clamp((t1 - 0.9) * 4) });
  g += label(t, c[1] + 2.4, "au moins, je les\nai vus partir", 540, 620, 250, 900, { size: 54 });
  return Z(g, 1.2, 540, 1050);
});
shot("fin", [], (t) => {
  let g = Rect(-10, -10, 1100, 1940, { fill: NAVY, sw: 0, c: "none" });
  g += G(logoMark(430, PAPER), { x: 540, y: 700, s: pop(t, 0.1, 0.4) });
  g += G(T("SECOND ARMOR", 0, 0, { size: 100, font: SANS, weight: 800, c: PAPER }), { x: 540, y: 1000, s: pop(t, 0.4) });
  g += G(T("Le Vinted militaire.", 0, 0, { size: 60, c: "#a9c6cb" }), { x: 540, y: 1110, s: pop(t, 0.9) });
  const pk = pop(t, 1.4);
  if (pk > 0) g += G(Rect(-210, -58, 420, 116, { rx: 58, fill: ACC, sw: 0, c: "none" }) + T("Lien en bio", 0, 2, { size: 54, font: SANS, weight: 800, c: PAPER }), { x: 540, y: 1270, s: pk * (t > 2 ? 1 + Math.sin((t - 2) * 7) * 0.03 : 1) });
  if (t > 2.6) g += fly(t, lerp(1150, -100, prog(t, 2.6, 1.1)), 690, { rad: 20, s: 1.4 });
  return g;
}, { min: 4.0, subs: false });

// ---------------------------------------------------------------------------
// Moteur : seek(t), sous-titres, lecteur, mode export
// ---------------------------------------------------------------------------
// Versions : ?cut=court ne garde qu'une partie des plans (voir CUTS). Sans paramètre : la version complète.
const CUTS = {
  // sans « oui oui », « pas le seul », la file de modération ni le coffre-fort : environ 2:20 au lieu de 2:41
  court: ["salut", "respect", "bulle", "militaire", "graphe", "poele", "inconnu", "justif", "furtif", "bip", "arrete",
    "tescon", "ordi", "algo", "poche", "couilles", "verifient", "cree", "dixmille", "rendre", "hockey", "amazonie", "continuez", "belote", "fin"],
};
const params = new URLSearchParams(location.search);
const CUT = CUTS[params.get("cut")];
if (CUT) SHOTS.splice(0, SHOTS.length, ...SHOTS.filter((s) => CUT.includes(s.key)));
let DURATION = 0;
for (const s of SHOTS) { s.from = DURATION; DURATION += s.dur; }
DURATION = Math.round(DURATION * FPS) / FPS;

// Sous-titres : chaque réplique est découpée en morceaux courts
// (≤ 26 caractères, une ligne), coupés de préférence sur la ponctuation. Les guillemets et « : ? ! » restent collés au mot.
const SUBS = [];
for (const s of SHOTS) {
  if (!s.subs) continue;
  for (const c of s.cues) {
    const txt = c.sub.replace(/« /g, "«\u00a0").replace(/ »/g, "\u00a0»").replace(/ ([:;?!])/g, "\u00a0$1");
    const words = txt.split(/ +/).filter(Boolean);
    const chunks = [];
    let cur = [];
    const len = (a) => a.join(" ").length;
    for (const w of words) {
      const last = cur[cur.length - 1];
      if (cur.length && (len([...cur, w]) > 26 || (/[.?!:,…»]$/.test(last) && len(cur) >= 12))) { chunks.push(cur); cur = []; }
      cur.push(w);
    }
    if (cur.length) {
      if (chunks.length && len(cur) < 10 && len([...chunks[chunks.length - 1], ...cur]) <= 40) chunks[chunks.length - 1].push(...cur);
      else chunks.push(cur);
    }
    const lines = chunks.map((ch) => ch.join(" "));
    const total = lines.reduce((a, ch) => a + ch.length, 0);
    let t = s.from + c.at;
    lines.forEach((ch, i) => {
      const d = (c.dur * ch.length) / total;
      // le dernier morceau reste affiché pendant la pause qui suit
      SUBS.push({ from: t, to: t + d + (i === lines.length - 1 ? 0.35 : 0), text: ch });
      t += d;
    });
  }
}

const stage = document.getElementById("stage");
stage.innerHTML = `
<svg id="art" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${[0, 1, 2].map((i) => `<filter id="boil${i}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="${i * 17 + 3}"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>`).join("")}</defs>
  <rect id="bg" width="${W}" height="${H}" fill="${PAPER}"/>
  <g id="draw"></g>
</svg>
<div id="sub"></div>`;
const drawLayer = document.getElementById("draw");
const subEl = document.getElementById("sub");

function seek(t) {
  t = clamp(t, 0, DURATION - 1e-6);
  const s = SHOTS.find((x) => t >= x.from && t < x.from + x.dur) || SHOTS[SHOTS.length - 1];
  const lt = t - s.from;
  const c = s.cues.map((q) => q.at);
  drawLayer.innerHTML = s.draw(lt, c, s.dur);
  // tremblement « dessin à la main » : 8 fois par seconde
  drawLayer.setAttribute("filter", `url(#boil${Math.floor(t * 8) % 3})`);
  const sub = SUBS.find((x) => t >= x.from && t < x.to && t >= s.from && x.from >= s.from - 0.01);
  subEl.textContent = sub ? sub.text : "";
  subEl.style.display = sub ? "block" : "none";
  subEl.classList.toggle("dark", s.dark);
}

window.VIDEO = {
  W, H, FPS, DURATION, seek,
  shots: SHOTS.map((s) => ({ key: s.key, from: s.from, to: s.from + s.dur, cues: s.cues.map((c) => ({ n: c.n, text: c.text, at: s.from + c.at, dur: c.dur })) })),
  subs: SUBS,
  cues: SHOTS.flatMap((s) => s.cues.map((c) => ({ n: c.n, text: c.text, at: s.from + c.at, dur: c.dur, bip: s.key === "bip" }))),
};
window.videoReady = Promise.all([document.fonts.ready, ...Object.keys(IMG).map((n) => { const im = new Image(); im.src = `img/${n}.png`; return im.decode(); }),
  ...Object.entries(PHOTOS).map(([n, src]) => { const im = new Image(); im.src = src; return im.decode().then(() => { PHOTO_OK[n] = true; }, () => {}); })]);

if (params.has("render")) {
  document.body.classList.add("render");
  stage.style.left = "0"; stage.style.top = "0";
  document.getElementById("viewport").style.display = "block";
  window.videoReady.then(() => seek(0));
} else {
  const viewport = document.getElementById("viewport");
  const fit = () => {
    const k = Math.min(viewport.clientWidth / W, viewport.clientHeight / H);
    stage.style.transform = `scale(${k})`;
  };
  window.addEventListener("resize", fit); fit();
  const btn = document.getElementById("play"), scrub = document.getElementById("scrub"), time = document.getElementById("time");
  scrub.max = DURATION;
  let playing = true, t0 = performance.now(), cur = 0;
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? "Pause" : "Lecture"; t0 = performance.now() - cur * 1000; };
  scrub.oninput = () => { cur = +scrub.value; t0 = performance.now() - cur * 1000; seek(cur); time.textContent = cur.toFixed(2) + " s"; };
  window.videoReady.then(() => {
    const loop = (now) => {
      if (playing) {
        cur = ((now - t0) / 1000) % DURATION;
        seek(cur); scrub.value = cur; time.textContent = cur.toFixed(2) + " s";
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
