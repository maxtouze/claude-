// Second Armor — founder story (TikTok 9:16, 30 s)
// Tout est piloté par le temps : seek(t) dessine l'image exacte à t secondes.
// Ça permet de prévisualiser dans le navigateur ET d'exporter image par image (render.mjs).

// ---------------------------------------------------------------------------
// Textes et médias : c'est ici qu'on modifie la vidéo.
// *mot* = surligné en orange.
// `vo` = ce que Nico dit en voix off pendant la scène (repris dans VOICEOVER.md).
// Règle : un seul texte principal à l'écran à la fois, et il colle à la voix off.
// ---------------------------------------------------------------------------
const COPY = {
  intro: {
    vo: "Salut, moi c'est Nico. J'ai créé Second Armor, le Vinted militaire.",
    caption: "Salut, moi c'est Nico.",
    brand: "SECOND ARMOR",
    aside: "le Vinted militaire.",
  },
  hunt: {
    vo: "Avant, pour trouver du matos, je checkais quinze sites différents…",
    caption: "Avant, pour trouver du matos…",
    stamp: "15 SITES",
    tabs: [
      ["surplus-du-cousin.fr", "RUPTURE"],
      ["forum-airsoft-2009.net", "topic fermé"],
      ["vends-gilet-URGENT", "VENDU"],
      ["tacti-kool.shop", "livraison 6 sem."],
      ["groupe FB matos (privé)", "demande envoyée"],
      ["occaz-rangers.biz", "T.39 only"],
      ["lebonplan-kaki.fr", "« dispo ? » (vu)"],
      ["serveur Discord #3", "paiement ami ?"],
      ["topic page 47/112", "…"],
      ["vente-flash-ops.com", "RUPTURE"],
      ["annonce-sans-photo", "?"],
      ["marketplace-generaliste", "COMPTE BANNI"],
      ["surplus-du-cousin.fr/2", "RUPTURE"],
      ["groupe FB matos #5", "annonce supprimée"],
      ["déjà-vendu-désolé", "VENDU"],
    ],
  },
  money: {
    vo: "…et j'envoyais de l'argent sans aucune garantie.",
    caption: "…et je payais sans *aucune* garantie.",
    aside: "*prie très fort*",
    stamp: "ET MON COLIS ?",
  },
  build: {
    vo: "Alors j'ai créé un endroit sécurisé. Au début, juste pour mon unité.",
    caption: "Alors j'ai créé un endroit *sécurisé*.",
    appName: "SECOND ARMOR",
    listing: ["Gilet porte-plaques", "85 €"],
    checks: ["Vendeurs vérifiés", "Annonces validées à la main", "Argent bloqué jusqu'à réception"],
    aside: "…au début, juste pour mon unité.",
  },
  growth: {
    vo: "Aujourd'hui, on est dix mille.",
    caption: "Aujourd'hui ?",
    target: 10000,
    aside: "membres. (et ça grandit)",
  },
  community: {
    vo: "Et ce qu'on construit, on le redonne à la communauté.",
    caption: "Et on redonne à la *communauté*.",
    photoCaption: "Match de hockey des blessés\nde guerre : on sponsorise.",
    photo: null, // ex. "photos/hockey.jpg" pour remplacer le dessin par une vraie photo
  },
  end: {
    vo: "Second Armor. Par des pros, pour des pros.",
    brand: "SECOND ARMOR",
    tagline: "Par des pros, pour des pros.",
    sub: "Militaires, forces de l'ordre, sécurité :\nl'équipement tactique de seconde main, en confiance.",
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
const INK = "#192230", NAVY = "#192230", TEAL = "#5b8990", ORANGE = "#e8622c", WHITE = "#fbf8f1";
const stroke = (w = 9, c = INK) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" class="draw"`;

// Bonhomme (Nico) — viewBox 200x300
function stickman(parent, w, cap = TEAL) {
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

// Logo Second Armor : le « A » entre quatre carrés.
// Redessiné d'après le visuel du site : à remplacer par le SVG officiel dès qu'on l'a.
function logoMark(parent, w, color = WHITE) {
  return svg(parent, w, (w * 250) / 420, "0 0 420 250", `
    <g fill="${color}">
      <rect x="0" y="0" width="44" height="40" rx="4"/><rect x="376" y="0" width="44" height="40" rx="4"/>
      <rect x="0" y="210" width="44" height="40" rx="4"/><rect x="376" y="210" width="44" height="40" rx="4"/>
      <path fill-rule="evenodd" d="M92 250 L168 0 L252 0 L328 250 L260 250 L245 198 L175 198 L160 250 Z M190 148 L230 148 L210 76 Z"/>
    </g>`);
}

// Zones sûres TikTok : rien d'important sous y ≈ 1500 (légende, pseudo) ni collé au bord droit (boutons).

// ---------------------------------------------------------------------------
// Scènes
// ---------------------------------------------------------------------------
const scenes = [];
function scene(from, to, build) {
  const root = el("div", "scene", stage);
  const update = build(root);
  scenes.push({ from, to, root, update });
}

// 1. Intro — 0 → 4 s
scene(0, 4, (root) => {
  const cap = caption(root, COPY.intro.caption, 540, 380);
  const nico = place(stickman(root, 380), 540, 860);
  const brand = place(el("div", "a brandword", root, COPY.intro.brand), 540, 1250);
  const aside = place(el("div", "a marker", root, COPY.intro.aside), 540, 1380);
  return (t) => {
    cap.update(t, 0.15);
    drawOn(nico, prog(t, 0, 1.0));
    nico.querySelector(".arm").style.transform = `rotate(${t > 1 ? Math.sin((t - 1) * 11) * 22 : 0}deg)`;
    set(nico, { r: boil(t, 1) * 0.8 });
    set(brand, slam(t, 1.6));
    set(aside, { ...pop(t, 2.4), r: -3 + boil(t, 2) });
    const sh = shake(t, 1.88, 0.3, 14);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 2. La chasse au matos — 4 → 9 s
scene(4, 9, (root) => {
  const cap = caption(root, COPY.hunt.caption, 540, 330);
  const r = rng(42);
  const tabs = COPY.hunt.tabs.map(([url, tag], i) => {
    const e = el("div", "a tab", root, `
      <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${esc(url)}</span></div>
      <div class="body"><div class="img"></div><div class="lines"><div class="line" style="width:90%"></div><div class="line" style="width:70%"></div><div class="line" style="width:50%"></div><div class="tag">${esc(tag)}</div></div></div>`);
    const x = lerp(330, 720, r()), y = lerp(680, 1240, i / 14) + lerp(-40, 40, r());
    place(e, x, y);
    return { e, rot: lerp(-9, 9, r()) };
  });
  const stamp = place(el("div", "a stamp", root, COPY.hunt.stamp), 540, 960);
  return (t) => {
    cap.update(t, 0);
    tabs.forEach(({ e, rot }, i) => set(e, { ...pop(t, 0.4 + i * 0.17, 0.3, 0.3), r: rot }));
    set(stamp, { ...slam(t, 3.3), r: -8 });
    const sh = shake(t, 3.58, 0.35, 26);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 3. Payer dans le vide — 9 → 13.5 s
scene(9, 13.5, (root) => {
  const cap = caption(root, COPY.money.caption, 540, 360);
  const q = place(el("div", "a marker", root, "?"), 770, 900);
  q.style.fontSize = "360px"; q.style.color = "#8a8a90";
  const guy = place(stickman(root, 260), 250, 960);
  const bills = Array.from({ length: 9 }, () => {
    const b = el("div", "a", root, `<svg width="190" height="100" viewBox="0 0 190 100"><rect x="4" y="4" width="182" height="92" rx="10" fill="#9dbb84" stroke="${INK}" stroke-width="6"/><circle cx="95" cy="50" r="28" fill="none" stroke="${INK}" stroke-width="5"/><text x="95" y="63" text-anchor="middle" font-family="Inter" font-weight="800" font-size="38" fill="${INK}">€</text></svg>`);
    return place(b, 320, 900);
  });
  const aside = place(el("div", "a marker", root, COPY.money.aside), 300, 1260);
  const stamp = place(el("div", "a stamp", root, COPY.money.stamp), 540, 1000);
  stamp.style.fontSize = "112px";
  return (t) => {
    cap.update(t, 0, 0.08);
    drawOn(guy, 1);
    set(guy, { ...pop(t, 0.1, 0.3), r: boil(t, 5) });
    set(q, { ...pop(t, 0.4, 0.4), r: boil(t, 6) * 4 });
    bills.forEach((b, i) => {
      const f = prog(t, 0.6 + i * 0.17, 0.75);
      const e = ease.out(f);
      set(b, { x: lerp(0, 440, e), y: -Math.sin(Math.PI * f) * 300, s: lerp(1, 0.35, e), r: f * 540, o: f > 0 && f < 1 ? 1 : 0 });
    });
    set(aside, { ...pop(t, 1.5), r: -5 + boil(t, 7) });
    set(stamp, { ...slam(t, 3.0), r: -10 });
    const sh = shake(t, 3.28, 0.35, 28);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 4. La création — 13.5 → 18.5 s
scene(13.5, 18.5, (root) => {
  const cap = caption(root, COPY.build.caption, 540, 260);
  const [lt, lp] = COPY.build.listing;
  const phone = place(el("div", "a phone", root, `
    <div class="screen">
      <div class="app-head"><span class="mark"></span>${esc(COPY.build.appName)}</div>
      <div class="card"><div class="thumb"></div><div><div class="t">${esc(lt)}</div><div class="price">${esc(lp)}</div></div></div>
      <div class="checks"></div>
    </div>`), 540, 840);
  logoMark(phone.querySelector(".mark"), 60, WHITE).setAttribute("class", "");
  const checks = COPY.build.checks.map((c) => el("div", "check", phone.querySelector(".checks"), `<span class="tick">✓</span>${esc(c)}`));
  const squad = Array.from({ length: 8 }, (_, i) => place(stickman(root, 84, i === 3 ? ORANGE : TEAL), 225 + i * 90, 1290));
  const aside = place(el("div", "a marker", root, COPY.build.aside), 540, 1440);
  aside.style.fontSize = "56px";
  return (t) => {
    cap.update(t, 0);
    const up = ease.out(prog(t, 0.3, 0.7));
    set(phone, { y: lerp(1400, 0, up), s: 0.78, r: lerp(8, -2, up) });
    checks.forEach((c, i) => {
      const a = pop(t, 1.1 + i * 0.35, 0.3, 0.7);
      c.style.opacity = a.o; c.style.transform = `scale(${a.s})`;
    });
    squad.forEach((m, i) => {
      drawOn(m, prog(t, 2.6 + i * 0.07, 0.45));
      set(m, { r: boil(t, 20 + i) * 2, y: t > 3.3 ? -Math.abs(Math.sin((t - 3.3) * 8 + i)) * 10 : 0 });
    });
    set(aside, { ...pop(t, 3.0), r: -2 + boil(t, 30) });
  };
});

// 5. La croissance — 18.5 → 22.5 s
scene(18.5, 22.5, (root) => {
  const cap = caption(root, COPY.growth.caption, 540, 360);
  cap.box.style.fontSize = "110px";
  const num = place(el("div", "a counter", root, "1"), 540, 620);
  const aside = place(el("div", "a marker", root, COPY.growth.aside), 540, 800);
  const cv = el("canvas", "a", root);
  cv.width = 1000; cv.height = 520;
  set(place(cv, 540, 1150));
  const ctx = cv.getContext("2d");
  const cols = 20, rows = 8, N = cols * rows;
  const r = rng(7);
  const order = Array.from({ length: N }, (_, i) => ({ i, k: r() }));
  const firstUnit = new Set([68, 69, 70, 71, 88, 89, 90, 91]); // le groupe de départ, au centre
  order.forEach((o) => { if (firstUnit.has(o.i)) o.k = -1; });
  order.sort((a, b) => a.k - b.k);
  const rank = new Array(N);
  order.forEach((o, j) => (rank[o.i] = j));
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (t) => {
    cap.update(t, 0);
    const g = ease.inOut(prog(t, 0.6, 2.0));
    num.textContent = fmt(Math.max(1, Math.round(lerp(1, COPY.growth.target, g))));
    const p = pop(t, 0.35, 0.3);
    const bump = 0.08 * Math.sin(Math.PI * prog(t, 2.6, 0.25));
    set(num, { o: p.o, s: p.s + bump });
    set(aside, { ...pop(t, 2.7), r: -3 + boil(t, 40) });
    ctx.clearRect(0, 0, cv.width, cv.height);
    const shown = Math.max(8, Math.round(g * N));
    const cw = cv.width / cols, ch = cv.height / rows;
    for (let i = 0; i < N; i++) {
      if (rank[i] >= shown) continue;
      const cx = (i % cols) * cw + cw / 2, cy = Math.floor(i / cols) * ch + ch / 2;
      const c = firstUnit.has(i) ? ORANGE : NAVY;
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

// 6. La communauté — 22.5 → 26.5 s
scene(22.5, 26.5, (root) => {
  const cap = caption(root, COPY.community.caption, 540, 320);
  const pol = place(el("div", "a polaroid", root, `<div class="pic"></div><div class="cap">${esc(COPY.community.photoCaption).replace(/\n/g, "<br>")}</div>`), 540, 930);
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
      <path d="M454 90 L254 400 L184 400" ${stroke(18, TEAL)}/>
      <ellipse cx="292" cy="455" rx="44" ry="16" fill="${INK}"/>
      <path d="M60 470 l0 -30 M50 455 l20 0" ${stroke(8, ORANGE)}/>
      <path d="M520 60 l14 -26 l14 26 l-28 -16 l28 0 Z" ${stroke(6, ORANGE)}/>
    `, "");
  }
  const tape = place(el("div", "a tape", root), 540, 570);
  return (t) => {
    cap.update(t, 0);
    const d = ease.back(prog(t, 0.4, 0.55));
    set(pol, { y: lerp(-1400, 0, d), r: lerp(-20, 3, d) + boil(t, 50) * 0.3 });
    const svgEl = pic.querySelector("svg");
    if (svgEl) drawOn(svgEl, prog(t, 0.9, 1.0));
    set(tape, { ...pop(t, 0.95, 0.2, 1.4), r: -6 });
  };
});

// 7. Fin (couleurs de la marque) — 26.5 → 30 s
scene(26.5, 30, (root) => {
  root.style.background = NAVY;
  const mark = place(logoMark(root, 360), 540, 600);
  const brand = place(el("div", "a brandword", root, COPY.end.brand), 540, 850);
  brand.style.color = WHITE;
  const tag = place(el("div", "a marker", root, COPY.end.tagline), 540, 980);
  tag.style.color = TEAL; tag.style.fontSize = "64px";
  const sub = place(el("div", "a", root, esc(COPY.end.sub).replace(/\n/g, "<br>")), 540, 1140);
  Object.assign(sub.style, { font: '600 40px "Inter"', color: WHITE, textAlign: "center", width: "900px", lineHeight: 1.35 });
  const cta = place(el("div", "a pill", root, COPY.end.cta), 540, 1340);
  return (t) => {
    const w = ease.out(prog(t, 0, 0.45));
    root.style.clipPath = `circle(${w * 130}% at 50% 50%)`;
    set(mark, pop(t, 0.3, 0.4, 0.2));
    set(brand, slam(t, 0.7, 0.25, 2.2));
    set(tag, { ...pop(t, 1.1), r: -2 + boil(t, 61) });
    const sb = pop(t, 1.4, 0.35, 0.9);
    set(sub, { s: sb.s, o: sb.o * 0.85 });
    const pulse = t > 2.0 ? 1 + Math.sin((t - 2.0) * 7) * 0.04 : 1;
    const c = pop(t, 1.8);
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
window.VIDEO = { W, H, FPS, DURATION, seek, COPY, scenes: scenes.map((s) => [s.from, s.to]) };
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
