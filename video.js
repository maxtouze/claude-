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
// Moto, centrée sur (0,0) au niveau des moyeux
function moto() {
  return Circ(-230, 0, 92, { w: 12, fill: PAPER }) + Circ(-230, 0, 24, { w: 8 }) +
    Circ(230, 0, 92, { w: 12, fill: PAPER }) + Circ(230, 0, 24, { w: 8 }) +
    P("M-230 0 L-120 -110 L90 -110 L230 0", { w: 12 }) +
    P("M-150 -110 Q-150 -170 -60 -170 L110 -165 Q150 -150 140 -110 Z", { fill: "#2b2f36", w: 8 }) +
    P("M-130 -150 Q-40 -200 60 -170", { w: 8, fill: "none" }) +
    P("M150 -120 L200 -210 L250 -215", { w: 12 }) +
    P("M-260 -40 L-120 -60", { w: 10 }) + P("M-150 -40 h-70", { w: 14, c: "#666" });
}
// Caddie
function cart() {
  return P("M-90 -130 L90 -130 L70 -40 L-70 -40 Z", { w: 6, fill: PAPER }) +
    P("M-50 -130 L-40 -40 M0 -130 V-40 M50 -130 L40 -40 M-82 -95 H84", { w: 3, op: 0.6 }) +
    P("M90 -130 L120 -170 H150", { w: 6 }) + P("M-70 -40 L-80 -12 H80", { w: 6 }) + Circ(-60, 0, 12, { w: 5 }) + Circ(60, 0, 12, { w: 5 });
}
// Logo Second Armor (le « A » entre quatre carrés), centré sur (0,0), largeur ~ w
function logoMark(w, color = NAVY) {
  const k = w / 857;
  const sq = (x, y) => `<path d="M${x + 6} ${y} h78 l6 6 v76 l-6 6 h-78 l-6 -6 v-76 Z"/>`;
  return `<g transform="scale(${n2(k)}) translate(-511 -511)" fill="${color}">${sq(83, 255)}${sq(850, 255)}${sq(83, 680)}${sq(850, 680)}` +
    `<path fill-rule="evenodd" d="M272 768 L422 255 L595 255 L752 768 L652 768 L618 652 L395 652 L361 768 Z M469 357 L541 357 L551 418 L598 574 L413 574 L459 418 Z"/></g>`;
}
// Nico « comme il se voit » : costaud, casque, lunettes, gilet, kalach — boîte 300x420, origine en haut à gauche
function buffNico() {
  const limb = (d, c, wOut = 40, wIn = 27) =>
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${wOut}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${c}" stroke-width="${wIn}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const line = (d, sw = 7, c = INK, fill = "none") => `<path fill="${fill}" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`;
  const WOOD = "#8a5a2b", GUN = "#2a2f38", VST = "#b9ad86", SK = "#f6efe0";
  return limb("M124 290 L114 392", "#3d4f5c") + limb("M176 290 L186 392", "#3d4f5c") +
    `<path d="M92 392 h40 v16 h-46 Z M168 392 h40 l6 16 h-46 Z" fill="${INK}"/>` +
    line("M84 150 Q150 134 216 150 L206 294 L94 294 Z", 7, INK, VST) +
    line("M100 200 H200", 5) + line("M98 222 H202", 5) +
    line("M104 240 h28 v40 h-28 Z M136 240 h28 v40 h-28 Z M168 240 h28 v40 h-28 Z", 5, INK, "#a39570") +
    line("M134 118 h32 v28 h-32 Z", 6, INK, SK) +
    line("M112 76 Q112 40 150 40 Q188 40 188 76 L186 104 Q172 128 150 128 Q128 128 114 104 Z", 7, INK, SK) +
    line("M104 82 Q102 22 150 22 Q198 22 196 82 L208 86 Q150 74 92 86 Z", 7, INK, "#8d9478") +
    `<path d="M118 82 h28 l-3 13 h-23 Z M154 82 h28 l-3 13 h-23 Z" fill="${INK}"/>` + line("M144 86 H156", 4) +
    line("M138 111 Q150 107 164 110", 5) +
    limb("M82 162 Q54 200 70 234 L132 257", "#8d9478", 44, 31) +
    limb("M218 162 Q252 190 238 216 L207 192", "#8d9478", 44, 31) +
    `<g transform="rotate(-30 165 220)">` +
    line("M40 214 L90 207 L90 233 L46 245 Z", 5, INK, WOOD) + line("M88 205 H192 V231 H88 Z", 5, INK, GUN) +
    line("M190 208 H242 V227 H190 Z", 5, INK, WOOD) + line("M190 205 H252", 5) + line("M242 216 H296", 7) +
    line("M288 216 V203", 5) + line("M150 231 Q151 262 132 290 L113 281 Q130 257 129 231 Z", 5, INK, GUN) +
    line("M112 231 L104 258 L119 260 L125 231 Z", 5, INK, GUN) + `</g>` +
    `<circle cx="132" cy="257" r="15" fill="${SK}" stroke="${INK}" stroke-width="6"/>` +
    `<circle cx="207" cy="192" r="15" fill="${SK}" stroke="${INK}" stroke-width="6"/>`;
}
// Le « décor en carton » : Nico version moto, centré sur (0,0), 1000 x 1780
function fantasyBoard(t) {
  let g = Rect(-500, -890, 1000, 1780, { fill: CARD, sw: 10, c: "#b89a66" });
  g += boom(t, 230, -170, 320, 5);
  // lignes de vitesse
  g += P("M-480 290 h160 M-470 350 h120 M-480 410 h170", { w: 6, op: 0.5 });
  // la femme derrière, cheveux au vent
  g += stick({ x: -215, y: 270, s: 1.1, acc: ["blonde", "hairwind"], la: [60, -150], ra: [90, -140], ll: [30, -60, 10, 0], rl: [60, -60, 40, 0], mouth: "smile" });
  g += G(moto(), { x: 0, y: 410, s: 1.05 });
  g += G(buffNico(), { x: -150, y: -190, s: 1.13 });
  g += T("VROOOM", 0, -560, { font: MARK, size: 160, c: ACC, r: -6, stroke: [10, INK] });
  return g;
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
function shot(key, cues, draw, opt = {}) {
  const { lead = 0.12, min = 0, dark = false, subs = true } = opt;
  let t = lead;
  const cs = cues.map(([text, pause = 0.25, sub]) => {
    const c = { text, sub: sub ?? text, at: t, dur: speakDur(text) };
    t += c.dur + pause;
    return c;
  });
  SHOTS.push({ key, cues: cs, draw, dur: Math.max(t, min), dark, subs });
}
// Le petit spectateur assis dans le coin (sections 3 à 5)
const spectator = (t, o = {}) => stick({ x: 970, y: 1300, s: 0.62, la: [-30, -150], ra: [30, -150], ll: [40, -160, 70, -110], rl: [50, -150, 85, -110], ...o });

// 1. Présentation
shot("salut", [["Salut, moi c'est Nico.", 0.35]], (t, c) => {
  const q = prog(t, 0, 0.9);
  const wave = t > 0.9 ? Math.sin((t - 0.9) * 10) * 22 : 0;
  return stick({ x: 540, y: 1180, s: 1.6, q, ra: t > 0.9 ? [70 + wave, -300] : [48, -118] }) +
    label(t, 1.0, "moi", 830, 560, 640, 700, { size: 64 });
});
shot("respect", [["… Euh. Un peu de respect.", 1.1]], (t) => {
  const zoom = lerp(1.14, 1.08, ease.out(prog(t, 0, 2)));
  return G(fantasyBoard(t), { x: 540, y: 860 + jit(t, 1), s: zoom }) +
    label(t, 1.1, "moi (réel)", 230, 470, 470, 690, { size: 68, c: INK, from: [300, 520] });
});
shot("carton", [["Voilà. Je préfère.", 0.35], ["Tant que personne vérifie, c'est bon.", 0.9]], (t, c) => {
  const k = ease.inOut(prog(t, 0.15, 2.2));
  const s = lerp(1.14, 0.42, k), cy = lerp(860, 560, k);
  let g = "";
  // parking de supermarché
  g += Rect(40, 820, 330, 200, { fill: PAPER, sw: 6 }) + Rect(70, 780, 270, 60, { fill: PAPER, sw: 6 }) + T("SUPERMARCHÉ", 205, 810, { size: 34, font: SANS, weight: 800 });
  g += P("M0 1270 H1080", { w: 6 }) + P("M120 1270 l-40 60 M330 1270 l-40 60 M750 1270 l40 60 M960 1270 l40 60", { w: 5, c: "#999" });
  const cx = lerp(1250, -250, prog(t, c[1] - 0.2, 3.2));
  g += G(cart(), { x: cx, y: 1260, s: 0.9 });
  // le petit Nico qui tient le carton, sur la pointe des pieds, en tremblant
  const tr = jit(t, 2.5);
  g += stick({ x: 540 + tr, y: 1262, s: 0.95, la: [-40, -290], ra: [40, -290], ll: [-18, -8], rl: [18, -8], eyes: "dot" });
  g += G(fantasyBoard(t), { x: 540 + tr * (1 - k), y: cy + tr * 0.5, s });
  g += label(t, c[1] + 0.2, "personne\nne vérifie", 880, 1080, 770, 870, { size: 50 });
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
    if (i < 2) r = 88 * ease.in(prog(t, tf, 0.3));
    else {
      const fq = prog(t, tf, 0.75);
      dy = -Math.sin(fq * Math.PI) * 260;
      r = -360 * ease.inOut(fq) + 88 * ease.in(prog(t, tf + 0.75, 0.25));
    }
    const sign = Rect(-46, -186, 92, 50, { fill: PAPER, sw: 4 }) + T("MÉCHANT", 0, -161, { size: 22, font: SANS, weight: 800 }) + P("M-30 -186 L0 -206 L30 -186", { w: 3 });
    const man = stick({ acc: ["mask", "mustache"], la: [-60, -150], ra: [60, -150], eyes: "dot" }) + sign;
    return G(G(man, { y: dy }), { x, y: 1150, s: 0.85, r });
  };
  g += vil(0, 660) + vil(1, 780) + vil(2, 900);
  if (t > 1.3) g += label(t, 1.55, "salto\n(inutile)", 820, 560, 890, 760, { size: 50 });
  return Z(g, 1.18, 560, 1000);
});
// 3. Les risques inutiles
shot("graphe", [["Mais il m'arrive aussi d'en prendre des inutiles.", 0.3]], (t, c) => {
  const cz = c[0] + 1.6;
  return risksGraph(t, { mission: pop(t, 0.3), zero: prog(t, cz, 0.4) }) + spectator(t);
});
shot("poele", [["Toucher une poêle pour voir si elle est chaude.", 0.2]], (t, c, d) => {
  const g0 = d - 0.9;
  if (t >= g0) return risksGraph(t, { zero: 1, poele: pop(t, g0 + 0.15) }) + spectator(t);
  if (t < 1.7) {
    const k = ease.inOut(prog(t, 0.1, 1.0));
    const tx = lerp(420, 505, k), ty = lerp(700, 890, k);
    let g = Rect(80, 960, 920, 120, { fill: PAPER, sw: 7 }) + Circ(300, 1020, 40, { w: 5 }) + Circ(780, 1020, 40, { w: 5 });
    g += `<ellipse cx="540" cy="930" rx="230" ry="58" fill="${DARK}" stroke="${INK}" stroke-width="7"/>` + P("M765 925 L1010 890", { w: 18 });
    for (let i = 0; i < 4; i++) g += P(`M${400 + i * 90} ${860 - ((t * 60 + i * 30) % 90)} q12 -18 0 -36 q-12 -18 0 -36`, { w: 4, op: 0.45 });
    g += P(`M-40 520 L${tx - 60} ${ty - 120}`, { w: 16 }) + Circ(tx - 60, ty - 120, 36, { w: 7, fill: SKIN }) + P(`M${tx - 40} ${ty - 95} L${tx} ${ty}`, { w: 12 });
    if (t > 1.1) g += Dot(tx, ty, 13, RED) + T("TSSS", 760, 700, { size: 90, font: MARK, r: 8, op: clamp((t - 1.1) * 5) });
    return g;
  }
  return stick({ x: 540, y: 1200, s: 1.45, ra: [60, -250, 70, -330], eyes: "dot" }) + Dot(540 + 70 * 1.45, 1200 - 330 * 1.45, 13, RED) +
    label(t, 2.0, "elle était\nchaude", 850, 560, 660, 700, { size: 54 });
}, { min: 3.9 });
shot("ouioui", [["Répondre « oui oui » quand ma meuf me demande si je l'écoute.", 0.35]], (t, c, d) => {
  const g0 = d - 0.9;
  if (t >= g0) return risksGraph(t, { zero: 1, poele: 1, ouioui: pop(t, g0 + 0.15) }) + spectator(t);
  let g = "";
  // canapé
  g += P("M150 1150 V930 Q150 880 200 880 H880 Q930 880 930 930 V1150", { fill: "#e9e4dc", w: 7 }) + P("M150 1040 H930", { w: 6 }) + P("M150 1150 H930 M180 1150 v40 M900 1150 v40", { w: 7 });
  const stare = t > 2.9;
  g += stick({ x: 360, y: 1150, s: 1.0, acc: ["blonde", "fringe"], look: [8, 0], eyes: stare ? "flat" : "dot", la: [-40, -120], ra: [50, -130], ll: [-40, -60, -40, 0], rl: [0, -60, 0, 0] });
  g += stick({ x: 700, y: 1150, s: 1.0, look: [4, 9], la: [-20, -140], ra: [20, -140], ll: [-20, -60, -30, 0], rl: [20, -60, 30, 0], acc: t > 3.2 ? ["sweat"] : [] });
  g += Rect(678, 990, 44, 70, { fill: "#cfe8ff", sw: 5, rx: 8 });
  // bulles
  let inner = "";
  if (t < 1.6) {
    const n = Math.floor(t * 9);
    for (let i = 0; i < Math.min(n, 9); i++) inner += P(`M${190 + (i % 3) * 120} ${520 + Math.floor(i / 3) * 55} q20 -20 40 0 t40 0 t40 0`, { w: 5 });
  } else inner += T("Tu m'écoutes ?", 390, 580, { size: 58 });
  g += bubble(390, 580, 440, 230, 380, 760, inner, { s: pop(t, 0.1) });
  g += bubble(790, 700, 260, 120, 720, 800, T("oui oui", 790, 700, { size: 54 }), { s: pop(t, 2.1) });
  return Z(g, 1.3, 540, 880);
}, { min: 4.6 });
shot("inconnu", [["Envoyer 400 balles à un inconnu sur internet.", 1.4]], (t, c, d) => {
  const talk = c[0] + 2.7; // fin de la phrase (approx.)
  if (t < talk) {
    const k = ease.inOut(prog(t, 0.5, 1.8));
    const s = lerp(1, 0.52, k);
    const py = lerp(GR.y0 - 250, GR.y0 - 1480, ease.out(prog(t, 0.5, 1.9)));
    let g = risksGraph(t, { zero: 1, poele: 1, ouioui: 1 });
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
  const bip = c[0] + 1.8;
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
  g += stick({ x: 140, y: 1220, s: 0.85, ...crossed, eyes: "flat" }) + stick({ x: 300, y: 1250, s: 0.8, ...crossed, eyes: "flat" }) + stick({ x: 940, y: 1230, s: 0.85, ...crossed, eyes: "flat" });
  g += bubble(170, 810, 260, 110, 150, 930, T("t'es con", 170, 810, { size: 50 }), { s: pop(t, c[0] + 1.6) });
  g += bubble(340, 610, 230, 110, 310, 960, T("Vinted", 340, 610, { size: 50 }), { s: pop(t, c[0] + 2.4) });
  g += bubble(890, 780, 290, 110, 930, 930, T("bah eBay ?", 890, 780, { size: 50 }), { s: pop(t, c[0] + 3.0) });
  return Z(g, 1.12, 540, 1000);
});
shot("deguis", [["Sauf que là-bas, ton porte-plaques, il est rangé dans « Déguisements ».", 0.6]], (t, c, d) => {
  let g = P("M130 480 H950 M170 480 V1250 M910 480 V1250 M120 1250 H220 M860 1250 H960", { w: 8 });
  const hanger = (x) => P(`M${x} 480 q0 -30 20 -30 M${x} 480 L${x - 90} 540 H${x + 90} Z`, { w: 5 });
  // pirate
  g += hanger(300) + P("M225 545 H375 L390 800 H210 Z", { fill: PAPER, w: 6 }) + P("M218 600 H382 M214 660 H386 M212 720 H388", { w: 10, c: RED, op: 0.8 });
  g += P("M220 440 Q300 380 380 440 Q300 420 220 440 Z", { fill: INK, w: 4 });
  g += T("pirate", 300, 860, { size: 44 });
  // porte-plaques
  g += hanger(540) + G(vest(), { x: 540, y: 700, s: 0.8 });
  // infirmière
  g += hanger(780) + P("M720 545 H840 L890 860 H670 Z", { fill: PAPER, w: 6 }) + P("M765 620 h30 M780 605 v30", { w: 9, c: RED });
  g += T("infirmière\nsexy", 780, 930, { size: 44 });
  const kc = prog(t, c[0] + 1.3, 0.5);
  if (kc > 0) g += P("M540 505 C700 505 700 900 540 900 C380 900 380 505 560 500", { c: RED, w: 7, q: kc }) + label(t, c[0] + 1.6, "ton\nporte-plaques", 540, 1060, 540, 915, { c: RED, size: 50 });
  g += stamp("DÉGUISEMENTS", 540, 300, t, d - 1.8, { c: INK, r: -3, size: 78 });
  return g;
});
shot("refresh", [["Alors pour trouver du matos, tu rafraîchis la page.", 0.25], ["Toute la nuit.", 1.0]], (t, c) => {
  const L = "#eaeaea";
  let g = Rect(-10, -10, 1100, 1940, { fill: "#10151f", sw: 0, c: "none" });
  const mins = 3 * 60 + 12 + Math.floor(t * 9) + (t > c[1] ? 150 : 0);
  const hh = Math.floor(mins / 60) % 24, mm = mins % 60;
  let z = Rect(120, 1000, 190, 100, { fill: "#000", sw: 5, c: L, rx: 10 }) + T(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, 215, 1052, { size: 58, font: SANS, weight: 800, c: "#ff5b4a" });
  // lit
  z += P("M330 1250 V1080 H1000 V1250 M330 1150 H1000", { w: 7, c: L });
  z += `<polygon points="560,1010 640,860 700,860 660,1010" fill="#9fd3ff" opacity="0.18"/>`;
  z += stick({ x: 640, y: 1150, s: 1.0, c: L, face: "#1b2230", look: [6, 10], la: [-10, -130, 20, -175], ra: [70, -140, 40, -175] });
  const bags = Math.min(1, t / 4);
  z += P(`M${640 - 26} ${1150 - 236} q12 ${8 + bags * 8} 24 0 M${640 + 6} ${1150 - 236} q12 ${8 + bags * 8} 24 0`, { c: "#8aa", w: 3 + bags * 3 });
  z += P("M420 1080 Q640 1020 980 1080", { w: 7, c: L, fill: "#2a3244" });
  z += Rect(655, 975, 50, 80, { fill: "#cfe8ff", sw: 4, c: L, rx: 8 });
  g += Z(z, 1.3, 560, 1100);
  const n = Math.floor(t * 7) + 1;
  g += T(`rafraîchissements : ${n}`, 540, 360, { size: 70, c: L });
  g += T("0 nouveau résultat", 540, 460, { size: 52, c: "#8aa" });
  const ang = (t * 720) % 360;
  g += G(P("M0 -30 A30 30 0 1 1 -28 10", { c: L, w: 6 }) + P("M-38 0 L-28 12 L-16 0", { c: L, w: 6 }), { x: 540, y: 620, r: ang, s: 1.4 });
  return g;
}, { dark: true });
shot("algo", [["Si tu t'es pas fait bannir.", 0.2], ["Parce que pour un algorithme bien-pensant, « porte-chargeur », c'est de l'apologie du terrorisme.", 0.9]], (t, c) => {
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
shot("couilles", [["Ce qu'il nous fallait, c'est un Vinted avec deux paires de couilles.", 0.6]], (t, c) => {
  let g = "";
  const ox = lerp(540, -400, ease.in(prog(t, 0.1, 0.8)));
  if (ox > -300) g += stick({ x: ox, y: 1180, s: 1.0, acc: ["longhair", "roundglasses", "fringe"], body: P("M-58 -205 Q0 -222 58 -205 L74 -100 H-74 Z", { fill: BEIGE, w: 6 }), eyes: "wide", r: -8 }) +
    G(P("M-40 -50 L40 -50 L50 50 L-50 50 Z", { fill: "#cda46b", w: 5 }), { x: ox, y: 1180 - 225, s: 0.5 });
  const k = pop(t, 1.0, 0.4);
  if (k > 0) {
    const flex = Math.sin(t * 6) * 8;
    let icon = P("M-70 180 L-80 330 M70 180 L80 330", { w: 12 });
    icon += Rect(-180, -180, 360, 360, { rx: 70, fill: PAPER, sw: 10 }) + Dot(-55, -40, 12) + Dot(55, -40, 12);
    const arm = (k) => P(`M${k * 180} 40 L${k * 300} 20 L${k * 290} ${-120 - flex}`, { w: 14 }) + `<ellipse cx="${k * 262}" cy="${n2(-5 - flex * 0.5)}" rx="${n2(38 + flex)}" ry="30" fill="${PAPER}" stroke="${INK}" stroke-width="8"/>` + Circ(k * 290, -135 - flex, 20, { w: 7, fill: PAPER });
    icon += arm(-1) + arm(1);
    icon += P("M-90 40 Q-45 5 0 30 Q45 5 90 40 Q100 70 125 55 M-90 40 Q-100 70 -125 55", { w: 12 });
    g += G(icon, { x: 540, y: 820, s: k });
  }
  g += label(t, c[0] + 2.4, "le Vinted qu'il\nnous fallait", 540, 390, 540, 600, { size: 70 });
  return g;
});
function modDesk(t, o = {}) {
  const { glasses = 0 } = o;
  let g = "";
  g += stick({ x: 360, y: 1130, s: 1.05, acc: ["cap"], la: [-40, -150, 10, -170], ra: [48, -118] }) + Rect(365, 925, 36, 44, { fill: PAPER, sw: 5, rx: 4 });
  g += stick({ x: 720, y: 1130, s: 1.05, acc: ["cap"], la: [-48, -118], ra: [40, -150, -10, -170] });
  g += Rect(676, 925, 36, 44, { fill: PAPER, sw: 5, rx: 4 });
  g += P(`M${720 - 36} ${1130 - 262 * 1.05 + glasses * 22} h26 v14 q-13 6 -26 0 Z M${720 + 9} ${1130 - 262 * 1.05 + glasses * 22} h26 v14 q-13 6 -26 0 Z`, { fill: INK, w: 3 });
  g += Rect(170, 1040, 740, 200, { fill: PAPER, sw: 7 }) + T("MODÉRATION", 540, 1140, { size: 56, font: SANS, weight: 800 });
  return g;
}
shot("moderation", [["Des gars du milieu, à la place d'un algorithme qui panique.", 0.5]], (t, c) => {
  let g = modDesk(t);
  const cardK = pop(t, 0.3);
  if (cardK > 0) {
    let card = Rect(-230, -110, 460, 220, { fill: PAPER, sw: 6, rx: 14 }) + G(pouch(), { x: -150, y: 0, s: 0.8 }) +
      T("Porte-chargeur", -80, -40, { size: 36, anchor: "start", font: SANS, weight: 800 }) + T("bon état · 15 €", -80, 10, { size: 32, anchor: "start" });
    if (t > c[0] + 3.0) card += T("catégorie : porte-plaques ✓", -80, 58, { size: 26, anchor: "start", c: GREEN });
    g += G(card, { x: 540, y: 470, s: cardK });
  }
  g += bubble(250, 700, 330, 110, 330, 820, T("… c'est une poche.", 250, 700, { size: 44 }), { s: pop(t, c[0] + 1.0) });
  g += stamp("VALIDÉ", 700, 330, t, c[0] + 2.2, { c: GREEN, size: 76, r: -10 });
  return Z(g, 1.2, 540, 800);
});
shot("verifient", [["Et eux, ils vérifient.", 0.3], ["… ok.", 0.9]], (t, c) => {
  const sl = ease.out(prog(t, 0.1, 0.7));
  const fall = ease.in(prog(t, 1.75, 0.3));
  let g = G(modDesk(t, { glasses: prog(t, 0.9, 0.3) }), { x: 330, y: 230, s: 0.72 });
  // le petit Nico, caché derrière le carton
  const nx = lerp(-300, 270, sl), ny = 1260;
  const down = fall >= 1 && t > c[1] - 0.1;
  g += stick({ x: nx, y: ny, s: 0.8, la: down ? [-48, -118] : [-40, -290], ra: down ? [48, -118] : [40, -290], eyes: "dot" });
  const top = ny - 0.8 * 290, bh = 1780 * 0.36;
  if (fall < 1) g += G(G(fantasyBoard(t), { y: -890 }), { x: nx, y: top + 10, s: 0.36, sy: 0.36 * (1 - fall) });
  else g += P(`M${nx - 190} ${ny + 4} H${nx + 190}`, { w: 14, c: "#b89a66" });
  if (fall < 1) g += stamp("REFUSÉ", nx, top - bh / 2, t, 1.3, { size: 80, r: -12 });
  g += bubble(nx + 150, ny - 330, 170, 100, nx + 40, ny - 250, T("… ok.", nx + 150, ny - 330, { size: 50 }), { s: pop(t, c[1]) });
  return g;
});
shot("garantie", [["Et chaque transaction garantie.", 2.9]], (t) => {
  let g = stick({ x: 170, y: 1220, s: 0.9 }) + T("toi", 170, 1290, { size: 44 });
  g += stick({ x: 910, y: 1220, s: 0.9, acc: ["cap"] }) + T("vendeur", 910, 1290, { size: 44 });
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
  g += Rect(250, 1000, 580, 40, { fill: "#c9b98f", sw: 7 }) + P("M300 1040 L360 1250 M780 1040 L720 1250 M300 1250 L780 1040 M780 1250 L300 1040", { w: 6 });
  for (let i = 0; i < 3; i++) g += Rect(430 + i * 60, 985, 44, 18, { fill: PAPER, sw: 3 });
  const pushed = ease.inOut(prog(t1, 1.4, 0.6));
  if (t > c[1] + 0.2) g += bill(lerp(240, 520, pushed), lerp(960, 975, pushed), { s: 0.55 }) + bill(lerp(260, 560, pushed), lerp(975, 985, pushed), { s: 0.55, r: 10 });
  const shrug = t1 > 2.1;
  g += soldier(190, 1240, 1.0, { la: shrug ? [-60, -200, -70, -260] : [60, -160], ra: shrug ? [60, -200, 80, -250] : [80, -170], eyes: "dot" });
  g += soldier(890, 1240, 1.0, { la: t1 > 0.9 ? [-60, -220, -40, -290] : [-80, -160], ra: t1 > 0.9 ? [60, -220, 40, -290] : [-60, -150], mouth: t1 > 0.9 ? "smile" : null });
  if (t1 > 0.9) g += T("belote !", 890, 830, { size: 50, op: clamp((t1 - 0.9) * 4) });
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

const params = new URLSearchParams(location.search);
window.VIDEO = {
  W, H, FPS, DURATION, seek,
  shots: SHOTS.map((s) => ({ key: s.key, from: s.from, to: s.from + s.dur, cues: s.cues.map((c) => ({ text: c.text, at: s.from + c.at, dur: c.dur })) })),
  subs: SUBS,
};
window.videoReady = document.fonts.ready;

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
