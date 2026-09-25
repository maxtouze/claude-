// Second Armor — founder story (TikTok 9:16, 30 s)
// Tout est piloté par le temps : seek(t) dessine l'image exacte à t secondes.
// Ça permet de prévisualiser dans le navigateur ET d'exporter image par image (render.mjs).

// ---------------------------------------------------------------------------
// Textes et médias : c'est ici qu'on modifie la vidéo.
// *mot* = surligné en orange.
// ---------------------------------------------------------------------------
const COPY = {
  intro: { caption: "Salut, moi c'est Nico.", aside: "fondateur de", brand: "SECOND ARMOR" },
  hunt: {
    caption: "Pour trouver du matos, je checkais…",
    stamp: "15 SITES",
    tabs: [
      ["surplus-du-cousin.fr", "RUPTURE"],
      ["forum-airsoft-2009.net", "topic fermé"],
      ["vends-gilet-URGENT", "VENDU"],
      ["tacti-kool.shop", "livraison 6 sem."],
      ["groupe-fb-matos (privé)", "demande envoyée"],
      ["occaz-rangers.biz", "T.39 only"],
      ["lebonplan-kaki.fr", "« dispo ? » (vu)"],
      ["@gear_deal en MP", "paiement ami ?"],
      ["topic page 47/112", "…"],
      ["vente-flash-ops.com", "RUPTURE"],
      ["annonce-sans-photo", "?"],
      ["tactical-stuff.ru", "hmm."],
      ["surplus-du-cousin.fr/2", "RUPTURE"],
      ["compte-suspendu.com", "BANNI"],
      ["déjà-vendu-désolé", "VENDU"],
    ],
  },
  money: { caption: "…et j'envoyais de la thune sans *aucune* garantie.", aside: "*prie très fort*", stamp: "COMPTE BANNI" },
  build: {
    caption: "Alors j'ai créé un endroit *sécurisé*.",
    aside: "…juste pour mon unité.",
    appName: "SECOND ARMOR",
    listings: [
      ["Gilet porte-plaques", "85 €"],
      ["Rangers T.43", "40 €"],
      ["Sac 3 jours", "60 €"],
      ["Casque + couvre", "70 €"],
    ],
  },
  growth: { caption: "Aujourd'hui ?", target: 10000, aside: "membres. (et ça grandit)" },
  community: {
    caption: "Par des pros, *pour des pros*.",
    photoCaption: "Match de hockey des blessés\nde guerre — on sponsorise.",
    photo: null, // ex. "photos/hockey.jpg" pour remplacer le dessin par une vraie photo
    outro: "Et on redonne à la *communauté*.",
  },
  end: {
    brand: "SECOND ARMOR",
    tagline: "le Vinted militaire.",
    sub: "Équipement tactique de seconde main,\nentre ceux qui servent.",
    cta: "Lien en bio",
  },
};

const W = 1080, H = 1920, FPS = 30, DURATION = 30;

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, x) => a + (b - a) * x;
const prog = (t, start, dur) => clamp((t - start) / dur);
const ease = {
  out: (x) => 1 - Math.pow(1 - x, 3),
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: (x) => { const c = 1.9, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  in: (x) => x * x * x,
};
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
// Tremblement "dessin à la main" : change 8 fois par seconde, déterministe.
const boil = (t, seed = 0) => rng(Math.floor(t * 8) * 131 + seed * 7919)() * 2 - 1;

const stage = document.getElementById("stage");
const SVGNS = "http://www.w3.org/2000/svg";

function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}
function svg(parent, w, h, vb, inner, cls = "a") {
  const s = document.createElementNS(SVGNS, "svg");
  s.setAttribute("width", w); s.setAttribute("height", h);
  s.setAttribute("viewBox", vb);
  s.setAttribute("class", cls);
  s.innerHTML = inner;
  parent.appendChild(s);
  return s;
}
// Positionne un élément par son centre (cx, cy) puis applique x/y/échelle/rotation/opacité.
function place(e, cx, cy) { e.style.left = cx + "px"; e.style.top = cy + "px"; return e; }
function set(e, { x = 0, y = 0, s = 1, r = 0, o = 1 } = {}) {
  e.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`;
  e.style.opacity = o;
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Texte mot par mot, *mot* surligné.
function caption(parent, text, cx, cy, cls = "caption") {
  const box = place(el("div", "a " + cls, parent), cx, cy);
  set(box);
  const words = [];
  text.split(/(\*[^*]+\*)/).forEach((seg) => {
    if (!seg) return;
    const hl = seg.startsWith("*");
    const raw = hl ? seg.slice(1, -1) : seg;
    raw.split(/\s+/).forEach((w, i) => {
      if (!w) return;
      const glued = i === 0 && !/^\s/.test(raw) && words.length && !hl;
      if (glued) { words[words.length - 1].innerHTML += esc(w); return; }
      words.push(el("span", "w" + (hl ? " hl" : ""), box, esc(w)));
    });
  });
  return {
    box,
    update(t, start, stagger = 0.09) {
      words.forEach((w, i) => {
        const q = prog(t, start + i * stagger, 0.32);
        const b = ease.back(q);
        w.style.opacity = clamp(q * 3);
        w.style.transform = `translateY(${lerp(50, 0, b)}px) scale(${lerp(0.6, 1, b)})` + (w.classList.contains("hl") ? " rotate(-1.5deg)" : "");
      });
    },
  };
}
const pop = (t, start, dur = 0.35, from = 0.4) => {
  const q = prog(t, start, dur);
  return { s: lerp(from, 1, ease.back(q)), o: clamp(q * 3) };
};
const slam = (t, start, dur = 0.28, from = 2.6) => {
  const q = prog(t, start, dur);
  return { s: lerp(from, 1, ease.in(q)), o: q > 0 ? 1 : 0 };
};
const shake = (t, start, dur = 0.35, amp = 22) => {
  const q = prog(t, start, dur);
  if (q <= 0 || q >= 1) return { x: 0, y: 0 };
  const k = (1 - q) * amp;
  return { x: Math.sin(t * 90) * k, y: Math.cos(t * 70) * k };
};
// Tracé progressif des chemins SVG marqués .draw
function drawOn(root, q) {
  const paths = root.querySelectorAll(".draw");
  const n = paths.length;
  paths.forEach((p, i) => {
    const local = clamp(q * n - i);
    p.style.strokeDashoffset = 1 - local;
    if (p.dataset.fill) p.style.fillOpacity = local >= 1 ? 1 : 0;
  });
}
const INK = "#1c1c18", OLIVE = "#4b5320", KHAKI = "#c8b98a", ORANGE = "#e8622c", WHITE = "#fbf8f1";
const stroke = (w = 9, c = INK) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" class="draw"`;

// Bonhomme (Nico) — viewBox 200x300
function stickman(parent, w, cap = OLIVE) {
  const s = svg(parent, w, w * 1.5, "0 0 200 300", `
    <path d="M100 22 a38 38 0 1 0 0.01 0" ${stroke()}/>
    <path d="M58 52 Q60 12 100 12 Q140 12 142 52 Z" ${stroke(8)} fill="${cap}" style="fill-opacity:0" data-fill="1"/>
    <path d="M52 52 L150 52" ${stroke(8)}/>
    <path d="M86 64 L86 67" ${stroke(9)}/><path d="M114 64 L114 67" ${stroke(9)}/>
    <path d="M84 78 Q100 92 116 78" ${stroke(7)}/>
    <path d="M100 98 L100 190" ${stroke()}/>
    <path d="M100 190 L70 272" ${stroke()}/><path d="M100 190 L130 272" ${stroke()}/>
    <path d="M100 122 L62 176" ${stroke()}/>
    <g class="arm"><path d="M100 122 L148 84" ${stroke()}/></g>
  `);
  s.querySelector(".arm").style.transformOrigin = "100px 122px";
  return s;
}

// ---------------------------------------------------------------------------
// Scènes
// ---------------------------------------------------------------------------
const scenes = [];
function scene(from, to, build) {
  const root = el("div", "scene", stage);
  const update = build(root);
  scenes.push({ from, to, root, update });
}

// 1. Intro — 0 → 3.5 s
scene(0, 3.5, (root) => {
  const cap = caption(root, COPY.intro.caption, 540, 420);
  const nico = place(stickman(root, 400), 540, 950);
  const aside = place(el("div", "a marker", root, COPY.intro.aside), 540, 1340);
  const brand = place(el("div", "a stencil", root, COPY.intro.brand), 540, 1470);
  brand.style.fontSize = "116px";
  return (t) => {
    cap.update(t, 0.15);
    drawOn(nico, prog(t, 0, 1.0));
    nico.querySelector(".arm").style.transform = `rotate(${t > 1 ? Math.sin((t - 1) * 11) * 22 : 0}deg)`;
    set(nico, { r: boil(t, 1) * 0.8 });
    const a = pop(t, 1.5);
    set(aside, { ...a, r: -3 + boil(t, 2) });
    const b = slam(t, 1.85);
    set(brand, { ...b, r: -2 + boil(t, 3) * 0.3 });
    const sh = shake(t, 2.13, 0.3, 14);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 2. La chasse au matos — 3.5 → 8.5 s
scene(3.5, 8.5, (root) => {
  const cap = caption(root, COPY.hunt.caption, 540, 330);
  const r = rng(42);
  const tabs = COPY.hunt.tabs.map(([url, tag], i) => {
    const e = el("div", "a tab", root, `
      <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${esc(url)}</span></div>
      <div class="body"><div class="img"></div><div class="lines"><div class="line" style="width:90%"></div><div class="line" style="width:70%"></div><div class="line" style="width:50%"></div><div class="tag">${esc(tag)}</div></div></div>`);
    const x = lerp(330, 750, r()), y = lerp(720, 1380, i / 14) + lerp(-60, 60, r());
    place(e, x, y);
    return { e, rot: lerp(-9, 9, r()) };
  });
  const stamp = place(el("div", "a stamp", root, COPY.hunt.stamp), 540, 1050);
  return (t) => {
    cap.update(t, 0);
    tabs.forEach(({ e, rot }, i) => {
      const a = pop(t, 0.5 + i * 0.19, 0.3, 0.3);
      set(e, { ...a, r: rot });
    });
    const s = slam(t, 3.55);
    set(stamp, { ...s, r: -8 });
    const sh = shake(t, 3.83, 0.35, 26);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 3. L'argent dans le vide — 8.5 → 13 s
scene(8.5, 13, (root) => {
  const cap = caption(root, COPY.money.caption, 540, 360);
  const q = place(el("div", "a marker", root, "?"), 810, 1010);
  q.style.fontSize = "380px"; q.style.color = "#8a8270";
  const guy = place(stickman(root, 260), 230, 1060);
  const bills = Array.from({ length: 9 }, () => {
    const b = el("div", "a", root, `<svg width="190" height="100" viewBox="0 0 190 100"><rect x="4" y="4" width="182" height="92" rx="10" fill="#9dbb84" stroke="${INK}" stroke-width="6"/><circle cx="95" cy="50" r="28" fill="none" stroke="${INK}" stroke-width="5"/><text x="95" y="63" text-anchor="middle" font-family="Inter" font-weight="800" font-size="38" fill="${INK}">€</text></svg>`);
    return place(b, 300, 1000);
  });
  const aside = place(el("div", "a marker", root, COPY.money.aside), 300, 1400);
  const stamp = place(el("div", "a stamp", root, COPY.money.stamp), 540, 1080);
  stamp.style.fontSize = "118px";
  return (t) => {
    cap.update(t, 0, 0.07);
    drawOn(guy, 1);
    set(guy, { ...pop(t, 0.1, 0.3), r: boil(t, 5) });
    set(q, { ...pop(t, 0.4, 0.4), r: boil(t, 6) * 4 });
    bills.forEach((b, i) => {
      const f = prog(t, 0.6 + i * 0.17, 0.75);
      const e = ease.out(f);
      set(b, {
        x: lerp(0, 500, e), y: -Math.sin(Math.PI * f) * 340,
        s: lerp(1, 0.35, e), r: f * 540, o: f > 0 && f < 1 ? 1 : 0,
      });
    });
    set(aside, { ...pop(t, 1.5), r: -5 + boil(t, 7) });
    const s = slam(t, 2.9);
    set(stamp, { ...s, r: -12 });
    const sh = shake(t, 3.18, 0.35, 28);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 4. La création — 13 → 17.5 s
scene(13, 17.5, (root) => {
  const cap = caption(root, COPY.build.caption, 540, 260);
  const phone = place(el("div", "a phone", root, `<div class="screen"><div class="app-head">${esc(COPY.build.appName)}</div></div>`), 540, 880);
  const screen = phone.querySelector(".screen");
  const cards = COPY.build.listings.map(([t, p]) =>
    el("div", "card", screen, `<div class="thumb"></div><div><div class="t">${esc(t)}</div><div class="price">${esc(p)}</div><div class="ok">✓ entre militaires</div></div>`));
  // Le groupe de départ : 8 bonhommes
  const squad = Array.from({ length: 8 }, (_, i) => place(stickman(root, 92, i === 3 ? ORANGE : OLIVE), 225 + i * 90, 1470));
  const aside = place(el("div", "a marker", root, COPY.build.aside), 540, 1640);
  return (t) => {
    cap.update(t, 0);
    const up = ease.out(prog(t, 0.3, 0.7));
    set(phone, { y: lerp(1400, 0, up), s: 0.78, r: lerp(8, -2, up) });
    cards.forEach((c, i) => {
      const a = pop(t, 1.0 + i * 0.22, 0.3, 0.7);
      c.style.opacity = a.o; c.style.transform = `scale(${a.s})`;
    });
    squad.forEach((m, i) => {
      drawOn(m, prog(t, 2.0 + i * 0.08, 0.5));
      set(m, { r: boil(t, 20 + i) * 2, y: Math.abs(Math.sin((t - 2.8) * 8 + i)) * (t > 2.8 ? -10 : 0) });
    });
    set(aside, { ...pop(t, 2.6), r: -2 + boil(t, 30) });
  };
});

// 5. La croissance — 17.5 → 21.5 s
scene(17.5, 21.5, (root) => {
  const cap = caption(root, COPY.growth.caption, 540, 380);
  cap.box.style.fontSize = "110px";
  const num = place(el("div", "a stencil", root, "1"), 540, 700);
  num.style.fontSize = "250px";
  const aside = place(el("div", "a marker", root, COPY.growth.aside), 540, 900);
  const cv = el("canvas", "a", root);
  cv.width = 1000; cv.height = 560;
  place(cv, 540, 1320);
  const ctx = cv.getContext("2d");
  const cols = 20, rows = 8, N = cols * rows;
  const r = rng(7);
  const order = Array.from({ length: N }, (_, i) => ({ i, k: r() }));
  const firstUnit = new Set([63, 64, 65, 66, 83, 84, 85, 86]); // le groupe de départ, au centre
  order.forEach((o) => { if (firstUnit.has(o.i)) o.k = -1; });
  order.sort((a, b) => a.k - b.k);
  const rank = new Array(N);
  order.forEach((o, j) => (rank[o.i] = j));
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (t) => {
    cap.update(t, 0);
    const g = ease.inOut(prog(t, 0.6, 2.0));
    const val = Math.max(1, Math.round(lerp(1, COPY.growth.target, g)));
    num.textContent = fmt(val);
    set(num, { ...pop(t, 0.35, 0.3), s: pop(t, 0.35, 0.3).s * (1 + (g > 0 && g < 1 ? Math.sin(t * 40) * 0.015 : 0)) + (prog(t, 2.6, 0.2) > 0 ? 0.08 * Math.sin(Math.PI * prog(t, 2.6, 0.25)) : 0) });
    set(aside, { ...pop(t, 2.7), r: -3 + boil(t, 40) });
    ctx.clearRect(0, 0, cv.width, cv.height);
    const shown = Math.max(8, Math.round(g * N));
    const cw = cv.width / cols, ch = cv.height / rows;
    for (let i = 0; i < N; i++) {
      if (rank[i] >= shown) continue;
      const cx = (i % cols) * cw + cw / 2, cy = Math.floor(i / cols) * ch + ch / 2;
      const c = firstUnit.has(i) ? ORANGE : OLIVE;
      ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 4; ctx.lineCap = "round";
      const jig = firstUnit.has(i) ? 0 : boil(t, i) * 1.5;
      ctx.beginPath(); ctx.arc(cx + jig, cy - 18, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 12);
      ctx.moveTo(cx - 11, cy); ctx.lineTo(cx + 11, cy);
      ctx.moveTo(cx, cy + 12); ctx.lineTo(cx - 8, cy + 26);
      ctx.moveTo(cx, cy + 12); ctx.lineTo(cx + 8, cy + 26);
      ctx.stroke();
    }
  };
});

// 6. La communauté — 21.5 → 26.5 s
scene(21.5, 26.5, (root) => {
  const cap = caption(root, COPY.community.caption, 540, 300);
  const pol = place(el("div", "a polaroid", root, `<div class="pic"></div><div class="cap">${esc(COPY.community.photoCaption).replace(/\n/g, "<br>")}</div>`), 540, 950);
  const pic = pol.querySelector(".pic");
  if (COPY.community.photo) {
    el("img", "", pic).src = COPY.community.photo;
  } else {
    svg(pic, 584, 520, "0 0 584 520", `
      <rect width="584" height="520" fill="#dcebf2"/>
      <path d="M0 330 L584 330" stroke="#c8252c" stroke-width="10" opacity=".7"/>
      <path d="M0 150 L584 150" stroke="#2c5aa0" stroke-width="10" opacity=".6"/>
      <ellipse cx="292" cy="240" rx="80" ry="80" fill="none" stroke="#2c5aa0" stroke-width="6" opacity=".5"/>
      <path d="M130 90 L330 400 L400 400" ${stroke(18)}/>
      <path d="M454 90 L254 400 L184 400" ${stroke(18, OLIVE)}/>
      <ellipse cx="292" cy="455" rx="44" ry="16" fill="${INK}"/>
      <path d="M60 470 l0 -30 M50 455 l20 0" ${stroke(8, ORANGE)}/>
      <path d="M520 60 l14 -26 l14 26 l-28 -16 l28 0 Z" ${stroke(6, ORANGE)}/>
    `, "");
  }
  const tape = place(el("div", "a tape", root), 540, 590);
  const outro = caption(root, COPY.community.outro, 540, 1560);
  return (t) => {
    cap.update(t, 0);
    const d = ease.back(prog(t, 0.5, 0.55));
    set(pol, { y: lerp(-1400, 0, d), r: lerp(-20, 3, d) + boil(t, 50) * 0.3 });
    const svgEl = pic.querySelector("svg");
    if (svgEl) drawOn(svgEl, prog(t, 1.0, 1.0));
    set(tape, { ...pop(t, 1.05, 0.2, 1.4), r: -6 });
    outro.update(t, 2.4, 0.1);
  };
});

// 7. Fin — 26.5 → 30 s
scene(26.5, 30, (root) => {
  root.style.background = "#4b5320";
  const shield = place(svg(root, 260, 290, "0 0 200 224", `
    <path d="M100 10 L182 42 V112 C182 166 144 196 100 214 C56 196 18 166 18 112 V42 Z" ${stroke(12, KHAKI)}/>
    <path d="M60 104 L100 134 L140 104" ${stroke(14, KHAKI)}/>
    <path d="M60 140 L100 170 L140 140" ${stroke(14, WHITE)}/>
  `), 540, 640);
  const brand = place(el("div", "a stencil", root, COPY.end.brand), 540, 920);
  brand.style.fontSize = "112px"; brand.style.color = WHITE;
  const tag = place(el("div", "a marker", root, COPY.end.tagline), 540, 1060);
  tag.style.color = KHAKI; tag.style.fontSize = "76px";
  const sub = place(el("div", "a", root, esc(COPY.end.sub).replace(/\n/g, "<br>")), 540, 1230);
  Object.assign(sub.style, { font: '600 44px "Inter"', color: WHITE, textAlign: "center", width: "900px", lineHeight: 1.3, opacity: 0.9 });
  const cta = place(el("div", "a pill", root, COPY.end.cta), 540, 1440);
  return (t) => {
    const w = ease.out(prog(t, 0, 0.45));
    root.style.clipPath = `circle(${w * 130}% at 50% 50%)`;
    drawOn(shield, prog(t, 0.25, 0.8));
    set(shield, { r: boil(t, 60) * 0.8 });
    set(brand, slam(t, 0.6, 0.25, 2.2));
    set(tag, { ...pop(t, 1.0), r: -3 + boil(t, 61) });
    set(sub, { ...pop(t, 1.3, 0.35, 0.9), o: pop(t, 1.3).o * 0.9 });
    const pulse = t > 1.9 ? 1 + Math.sin((t - 1.9) * 7) * 0.04 : 1;
    const c = pop(t, 1.7);
    set(cta, { o: c.o, s: c.s * pulse });
  };
});

// ---------------------------------------------------------------------------
// Moteur : seek(t), lecteur, mode export
// ---------------------------------------------------------------------------
function seek(t) {
  for (const s of scenes) {
    const on = t >= s.from && (t < s.to || (s.to === DURATION && t <= DURATION));
    s.root.style.display = on ? "block" : "none";
    if (on) {
      const lt = t - s.from;
      const q = prog(lt, 0, 0.22);
      s.update(lt);
      // petite entrée "zoom" à chaque coupe
      if (s.from > 0 && !s.root.style.clipPath) {
        const sc = lerp(1.06, 1, ease.out(q));
        s.root.style.transform = (s.root.style.transform || "").replace(/ ?scale\([^)]*\)/, "") + ` scale(${sc})`;
      }
    }
  }
}

const params = new URLSearchParams(location.search);
window.VIDEO = { W, H, FPS, DURATION, seek };
window.videoReady = document.fonts.ready;

if (params.has("render")) {
  document.body.classList.add("render");
  stage.style.left = "0"; stage.style.top = "0";
  document.getElementById("viewport").style.display = "block";
  seek(0);
} else {
  const viewport = document.getElementById("viewport");
  const fit = () => {
    const k = Math.min(viewport.clientWidth / W, viewport.clientHeight / H);
    stage.style.transform = `scale(${k})`;
  };
  window.addEventListener("resize", fit); fit();
  const btn = document.getElementById("play"), scrub = document.getElementById("scrub"), time = document.getElementById("time");
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
