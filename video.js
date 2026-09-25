// Second Armor — founder story (TikTok 9:16, ~45 s)
// Tout est piloté par le temps : seek(t) dessine l'image exacte à t secondes.
// Ça permet de prévisualiser dans le navigateur ET d'exporter image par image (render.mjs).

// ---------------------------------------------------------------------------
// Textes et médias : c'est ici qu'on modifie la vidéo.
// *mot* = surligné en orange.
// `vo` = ce que Nico dit en voix off pendant la scène (repris dans VOICEOVER.md via `npm run vo`).
// Fil rouge : le risque. Risquer sa vie en mission : ok. Se faire arnaquer sur un gilet : non.
// Règle : un seul texte principal à l'écran à la fois, et il colle à la voix off.
// ---------------------------------------------------------------------------
const COPY = {
  intro: {
    vo: "Salut, moi c'est Nico. J'ai créé Second Armor.",
    caption: "Salut, moi c'est Nico.",
    brand: "SECOND ARMOR",
  },
  riskOk: {
    vo: "Risquer ma vie en mission, pour un truc auquel je crois ? Ok.",
    caption: "Risquer ma vie en mission, pour un truc auquel je crois ?",
    stamp: "OK",
  },
  riskNo: {
    vo: "Risquer de me faire arnaquer sur un gilet à 400 balles ? Non.",
    caption: "Me faire arnaquer sur un gilet à *400 balles ?*",
    price: "400 €",
    stamp: "NON",
  },
  channels: {
    vo: "Sauf que pour s'équiper, c'était ça : Facebook, Telegram, quinze canaux différents…",
    caption: "Sauf que pour s'équiper, c'était ça :",
    stamp: "15 CANAUX",
    tabs: [
      ["Facebook · Groupe matos tactique", "annonce supprimée"],
      ["Telegram · Canal occaz", "« dispo ? » (vu)"],
      ["Facebook · Surplus entre militaires", "VENDU"],
      ["Telegram · Vente OPEX", "paiement ami ?"],
      ["Facebook · Équipement occasion", "RUPTURE"],
      ["Discord · #vente-matos", "…"],
      ["Telegram · Bons plans gear", "lien mort"],
      ["Facebook · Airsoft & tactique", "hors-sujet"],
      ["Telegram · Canal #2", "T.39 only"],
      ["Facebook · Groupe privé", "demande envoyée"],
      ["Discord · #annonces", "VENDU"],
      ["Telegram · Canal #3", "photo floue"],
      ["Facebook · Treillis & co", "RUPTURE"],
      ["Telegram · Canal #4", "?"],
      ["Facebook · Encore un groupe", "déjà vendu"],
    ],
  },
  ban: {
    vo: "…et au moindre mot de travers, à la moindre photo jugée suspecte : compte banni.",
    caption: "Au moindre mot de travers, à la moindre photo *suspecte*…",
    listingTitle: "Gilet porte-plaques",
    listingPrice: "400 €",
    listingText: ["Gilet", "porte-plaques", "tactique", "taille", "M,", "très", "bon", "état."],
    flaggedWord: "tactique",
    flagPhoto: "Photo jugée suspecte",
    flagWord: "Mot non autorisé",
    stamp: "COMPTE BANNI",
  },
  turn: {
    vo: "Alors j'ai fait un truc. Juste pour mon unité.",
    caption: "Alors j'ai fait un truc.",
    aside: "…juste pour mon unité.",
  },
  app: {
    vo: "Vendeurs vérifiés. Ton argent bloqué tant que t'as pas reçu ton colis. Entre nous.",
    caption: "Un endroit *entre nous*.",
    appName: "SECOND ARMOR",
    listing: ["Gilet porte-plaques", "400 €"],
    // [texte, instant d'apparition en s dans la scène], calés sur la voix off
    checks: [["Vendeurs vérifiés", 0.9], ["Argent bloqué jusqu'à réception", 2.6], ["Entre militaires, flics, sécu", 5.0]],
  },
  growth: {
    vo: "Aujourd'hui, on est 10 000.",
    caption: "Aujourd'hui, on est…",
    target: 10000,
    aside: "membres actifs.",
  },
  // Vrais avis d'utilisateurs, à coller ici (la scène est sautée tant que la liste est vide).
  // Format : { text: "…", author: "Julien", role: "Gendarme", stars: 5 }
  reviews: {
    vo: "Et ce sont eux qui en parlent le mieux.",
    caption: "Ce qu'ils en disent :",
    items: [],
  },
  end: {
    vo: "Second Armor. Parce que des risques, on en prend déjà assez en mission.",
    brand: "SECOND ARMOR",
    tagline: "Des risques, on en prend déjà\nassez en mission.",
    sub: "Le Vinted militaire.",
    cta: "Lien en bio",
  },
};

const W = 1080, H = 1920, FPS = 30;
let DURATION = 0; // calculée à partir des durées de scènes

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
    if (hl) { words.push(el("span", "w hl", box, esc(raw))); return; }
    raw.split(/[ \t\n]+/).forEach((w, i) => {
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

// Logo Second Armor : le « A » entre quatre carrés, vectorisé d'après l'icône officielle de l'app.
function logoMark(parent, w, color = WHITE) {
  const sq = (x, y) => `<path d="M${x + 6} ${y} h78 l6 6 v76 l-6 6 h-78 l-6 -6 v-76 Z"/>`;
  return svg(parent, w, (w * 513) / 857, "83 255 857 513", `
    <g fill="${color}">
      ${sq(83, 255)}${sq(850, 255)}${sq(83, 680)}${sq(850, 680)}
      <path fill-rule="evenodd" d="M272 768 L422 255 L595 255 L752 768 L652 768 L618 652 L395 652 L361 768 Z M469 357 L541 357 L551 418 L598 574 L413 574 L459 418 Z"/>
    </g>`);
}

// Zones sûres TikTok : rien d'important sous y ≈ 1500 (légende, pseudo) ni collé au bord droit (boutons).

// Gilet porte-plaques dessiné — viewBox 300x320
function vest(parent, w) {
  return svg(parent, w, (w * 320) / 300, "0 0 300 320", `
    <path d="M70 40 L110 40 Q150 72 190 40 L230 40 L240 110 L262 122 L262 290 Q150 312 38 290 L38 122 L60 110 Z" ${stroke(8)} fill="#b9ad86" style="fill-opacity:0" data-fill="1"/>
    <path d="M60 110 L240 110" ${stroke(6)}/>
    <path d="M52 150 L248 150 M52 172 L248 172" ${stroke(4)} opacity=".6"/>
    <path d="M66 196 h48 v64 h-48 Z" ${stroke(6)} fill="#a39570" style="fill-opacity:0" data-fill="1"/>
    <path d="M126 196 h48 v64 h-48 Z" ${stroke(6)} fill="#a39570" style="fill-opacity:0" data-fill="1"/>
    <path d="M186 196 h48 v64 h-48 Z" ${stroke(6)} fill="#a39570" style="fill-opacity:0" data-fill="1"/>
  `);
}

// ---------------------------------------------------------------------------
// Scènes
// ---------------------------------------------------------------------------
const scenes = [];
function scene(key, dur, build) {
  const root = el("div", "scene", stage);
  const update = build(root);
  scenes.push({ key, from: DURATION, to: DURATION + dur, root, update });
  DURATION += dur;
}

// 1. Intro
scene("intro", 3.5, (root) => {
  const cap = caption(root, COPY.intro.caption, 540, 400);
  const nico = place(stickman(root, 380), 540, 880);
  const brand = place(el("div", "a brandword", root, COPY.intro.brand), 540, 1290);
  return (t) => {
    cap.update(t, 0.1);
    drawOn(nico, prog(t, 0, 0.9));
    nico.querySelector(".arm").style.transform = `rotate(${t > 0.9 ? Math.sin((t - 0.9) * 11) * 22 : 0}deg)`;
    set(nico, { r: boil(t, 1) * 0.8 });
    set(brand, slam(t, 1.5));
    const sh = shake(t, 1.78, 0.3, 14);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 2. Risquer sa vie en mission : ok
scene("riskOk", 5, (root) => {
  const cap = caption(root, COPY.riskOk.caption, 540, 380);
  const land = place(svg(root, 1080, 500, "0 0 1080 500", `
    <path d="M-20 330 Q200 250 420 310 T800 290 T1100 300" ${stroke(8)}/>
    <path d="M820 300 L820 150" ${stroke(8)}/>
    <path d="M820 150 L910 176 L820 202" ${stroke(7, ORANGE)}/>
    <path d="M150 300 l20 -40 l20 40 M600 305 l14 -30 l14 30" ${stroke(6)} opacity=".6"/>
  `), 540, 1080);
  set(land);
  const nico = place(stickman(root, 330), 360, 940);
  const stamp = place(el("div", "a stamp ok", root, COPY.riskOk.stamp), 700, 860);
  stamp.style.fontSize = "170px";
  return (t) => {
    cap.update(t, 0, 0.08);
    drawOn(land, prog(t, 0.2, 1.2));
    drawOn(nico, prog(t, 0.3, 0.9));
    set(nico, { r: boil(t, 2) * 0.8 });
    set(stamp, { ...slam(t, 3.2), r: -10 });
    const sh = shake(t, 3.48, 0.3, 18);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 3. Se faire arnaquer sur un gilet : non
scene("riskNo", 5, (root) => {
  const cap = caption(root, COPY.riskNo.caption, 540, 380);
  const v = place(vest(root, 400), 390, 920);
  const tag = place(el("div", "a pricetag", root, esc(COPY.riskNo.price)), 690, 740);
  const stamp = place(el("div", "a stamp", root, COPY.riskNo.stamp), 710, 1080);
  stamp.style.fontSize = "170px";
  return (t) => {
    cap.update(t, 0, 0.08);
    drawOn(v, prog(t, 0.2, 1.1));
    set(v, { r: boil(t, 3) * 0.6 });
    const tp = pop(t, 1.2, 0.35, 0.3);
    set(tag, { ...tp, r: 8 + Math.sin(t * 3) * 5 });
    set(stamp, { ...slam(t, 3.3), r: -10 });
    const sh = shake(t, 3.58, 0.3, 24);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 4. Quinze canaux
scene("channels", 6, (root) => {
  const cap = caption(root, COPY.channels.caption, 540, 330);
  const tabsData = COPY.channels.tabs;
  const counter = place(el("div", "a marker", root, ""), 540, 490);
  counter.style.fontSize = "54px";
  const r = rng(42);
  const tabs = tabsData.map(([url, tag], i) => {
    const e = el("div", "a tab", root, `
      <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${esc(url)}</span></div>
      <div class="body"><div class="img"></div><div class="lines"><div class="line" style="width:90%"></div><div class="line" style="width:70%"></div><div class="line" style="width:50%"></div><div class="tag">${esc(tag)}</div></div></div>`);
    const x = lerp(330, 720, r()), y = lerp(720, 1230, i / (tabsData.length - 1)) + lerp(-30, 30, r());
    place(e, x, y);
    return { e, rot: lerp(-9, 9, r()) };
  });
  const stamp = place(el("div", "a stamp", root, COPY.channels.stamp), 540, 1000);
  stamp.style.fontSize = "130px";
  const t0 = 0.5, step = 0.26;
  return (t) => {
    cap.update(t, 0);
    tabs.forEach(({ e, rot }, i) => set(e, { ...pop(t, t0 + i * step, 0.28, 0.3), r: rot }));
    const n = clamp(Math.floor((t - t0) / step) + 1, 0, tabs.length);
    counter.textContent = n ? `onglet ${n}/${tabs.length}` : "";
    set(counter, { r: -3 + boil(t, 9), o: n ? 1 : 0 });
    set(stamp, { ...slam(t, 4.5), r: -8 });
    const sh = shake(t, 4.78, 0.35, 26);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 5. Le ban
scene("ban", 6, (root) => {
  const B = COPY.ban;
  const cap = caption(root, B.caption, 540, 340);
  const card = place(el("div", "a listing", root, `
    <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">grande-plateforme.com</span></div>
    <div class="lbody">
      <div class="lpic"><div class="flag">⚠ ${esc(B.flagPhoto)}</div></div>
      <div class="linfo">
        <div class="ltitle">${esc(B.listingTitle)}</div>
        <div class="lprice">${esc(B.listingPrice)}</div>
        <div class="ltext">${B.listingText.map((w) => `<span class="${w === B.flaggedWord ? "bad" : ""}">${esc(w)}</span>`).join(" ")}</div>
      </div>
    </div>`), 540, 920);
  vest(card.querySelector(".lpic"), 190).setAttribute("class", "");
  drawOn(card.querySelector(".lpic svg"), 1);
  const flag = card.querySelector(".flag");
  const bad = card.querySelector(".bad");
  const note = place(el("div", "a marker", root, B.flagWord), 700, 1260);
  note.style.color = "#c8252c"; note.style.fontSize = "52px";
  const stamp = place(el("div", "a stamp", root, B.stamp), 540, 960);
  stamp.style.fontSize = "124px";
  return (t) => {
    cap.update(t, 0, 0.07);
    set(card, { ...pop(t, 0.2, 0.4, 0.8), r: -1.5 });
    const f = pop(t, 1.9, 0.3, 0.5);
    flag.style.opacity = f.o; flag.style.transform = `scale(${f.s})`;
    bad.classList.toggle("on", t > 3.0);
    set(note, { ...pop(t, 3.0), r: -4 + boil(t, 11) });
    const s = slam(t, 4.7);
    set(stamp, { ...s, r: -12 });
    card.style.filter = t > 4.95 ? "grayscale(1)" : "";
    const sh = shake(t, 4.98, 0.35, 28);
    root.style.transform = `translate(${sh.x}px,${sh.y}px)`;
  };
});

// 6. Le déclic
scene("turn", 4, (root) => {
  const cap = caption(root, COPY.turn.caption, 540, 400);
  const nico = place(stickman(root, 300), 540, 830);
  const squad = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI * (0.1 + (0.8 * i) / 7);
    return place(stickman(root, 96, ORANGE), 540 - Math.cos(a) * 400, 1010 + Math.sin(a) * 170);
  });
  const aside = place(el("div", "a marker", root, COPY.turn.aside), 540, 1390);
  return (t) => {
    cap.update(t, 0);
    drawOn(nico, prog(t, 0.1, 0.8));
    set(nico, { r: boil(t, 12) * 0.8 });
    squad.forEach((m, i) => {
      drawOn(m, prog(t, 1.7 + i * 0.07, 0.4));
      set(m, { r: boil(t, 20 + i) * 2, y: t > 2.4 ? -Math.abs(Math.sin((t - 2.4) * 8 + i)) * 10 : 0 });
    });
    set(aside, { ...pop(t, 2.0), r: -2 + boil(t, 30) });
  };
});

// 7. L'app
scene("app", 7, (root) => {
  const A = COPY.app;
  const cap = caption(root, A.caption, 540, 300);
  const [lt, lp] = A.listing;
  const phone = place(el("div", "a phone", root, `
    <div class="screen">
      <div class="app-head"><span class="mark"></span>${esc(A.appName)}</div>
      <div class="card"><div class="thumb"></div><div><div class="t">${esc(lt)}</div><div class="price">${esc(lp)}</div></div></div>
      <div class="checks"></div>
    </div>`), 540, 900);
  logoMark(phone.querySelector(".mark"), 60, WHITE).setAttribute("class", "");
  vest(phone.querySelector(".thumb"), 104).setAttribute("class", "");
  drawOn(phone.querySelector(".thumb svg"), 1);
  const checks = A.checks.map(([c, at]) => ({ at, e: el("div", "check", phone.querySelector(".checks"), `<span class="tick">✓</span>${esc(c)}`) }));
  return (t) => {
    cap.update(t, 5.6);
    const up = ease.out(prog(t, 0, 0.6));
    set(phone, { y: lerp(1400, 0, up), s: 0.85, r: lerp(8, -2, up) });
    checks.forEach(({ e, at }) => {
      const a = pop(t, at, 0.3, 0.7);
      e.style.opacity = a.o; e.style.transform = `scale(${a.s})`;
    });
  };
});

// 8. La croissance
scene("growth", 5, (root) => {
  const cap = caption(root, COPY.growth.caption, 540, 360);
  cap.box.style.fontSize = "96px";
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

// 9. Avis d'utilisateurs (sautée tant que COPY.reviews.items est vide)
if (COPY.reviews.items.length) {
  const items = COPY.reviews.items.slice(0, 3);
  scene("reviews", 1.8 + items.length * 2.2, (root) => {
    const cap = caption(root, COPY.reviews.caption, 540, 300);
    const stack = place(el("div", "a reviews", root), 540, 900);
    set(stack);
    const cards = items.map((rv) => el("div", "review", stack, `
      <div class="stars">${"★".repeat(rv.stars || 5)}</div>
      <div class="rtext">${esc(rv.text)}</div>
      <div class="rauthor">${esc(rv.author || "")}${rv.role ? " · " + esc(rv.role) : ""}</div>`));
    return (t) => {
      cap.update(t, 0);
      cards.forEach((c, i) => {
        const a = pop(t, 0.8 + i * 2.2, 0.4, 0.6);
        c.style.opacity = a.o;
        c.style.transform = `scale(${a.s}) rotate(${(i % 2 ? 1.5 : -1.5) + boil(t, 70 + i) * 0.3}deg)`;
      });
    };
  });
}

// Fin (couleurs de la marque)
scene("end", 5.5, (root) => {
  const E = COPY.end;
  root.style.background = NAVY;
  const mark = place(logoMark(root, 330), 540, 560);
  const brand = place(el("div", "a brandword", root, E.brand), 540, 800);
  brand.style.color = WHITE;
  const tag = place(el("div", "a marker", root, esc(E.tagline).replace(/\n/g, "<br>")), 540, 1000);
  Object.assign(tag.style, { color: TEAL, fontSize: "62px", textAlign: "center", lineHeight: 1.25, whiteSpace: "normal", width: "960px" });
  const sub = place(el("div", "a", root, esc(E.sub)), 540, 1180);
  Object.assign(sub.style, { font: '800 50px "Inter"', color: WHITE, whiteSpace: "nowrap" });
  const cta = place(el("div", "a pill", root, E.cta), 540, 1340);
  return (t) => {
    const w = ease.out(prog(t, 0, 0.45));
    root.style.clipPath = `circle(${w * 130}% at 50% 50%)`;
    set(mark, pop(t, 0.3, 0.4, 0.2));
    set(brand, slam(t, 0.6, 0.25, 2.2));
    set(tag, { ...pop(t, 1.4, 0.4, 0.8), r: -2 + boil(t, 61) * 0.5 });
    set(sub, pop(t, 3.4, 0.35, 0.9));
    const pulse = t > 4.2 ? 1 + Math.sin((t - 4.2) * 7) * 0.04 : 1;
    const c = pop(t, 3.8);
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
window.VIDEO = { W, H, FPS, DURATION, seek, COPY, scenes: scenes.map((s) => [s.from, s.to, s.key]) };
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
