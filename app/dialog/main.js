// Contoh Dialog NPC (prototipe, tidak masuk game): A Potret Besar (visual novel),
// B Sinematik (pita hitam + subtitle), C Gelembung warga + dialog besar untuk NPC penting.
import { pixelData } from '../src/art/pixeldata.js';
import { LOOK } from '../src/data/look.js';
import { shopUI } from './shop.js';
import { drawHero } from '../src/art/hero/index.js';
import { TOWN, INTERIORS } from '../src/data/town.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
// townsfolk outside and the shopkeepers inside their buildings (Pandai Brom lives in the smithy)
const NPC = Object.fromEntries([...TOWN.npcs, ...Object.values(INTERIORS).flatMap((r) => r.npcs || [])].map((n) => [n.id, n]));
const lookOf = (n) => ({ ...n.look, outfit: n.outfit, npc: n });

// chest-up portrait aimed at the head the figure reports (hair top near the canvas top, chest at the
// bottom), pixel-filtered like the game when LOOK.pixel is on
function bust_(n, cssH) {
  const dpr = Math.min(devicePixelRatio || 1, 2), cssW = Math.round(cssH * 0.9);
  const c = document.createElement('canvas');
  c.width = Math.round(cssW * dpr); c.height = Math.round(cssH * dpr);
  c.style.width = `${cssW}px`; c.style.height = `${cssH}px`;
  const P = LOOK.pixel, sm = document.createElement('canvas');
  sm.height = P ? Math.round(cssH / 2.2) : c.height; sm.width = Math.round(sm.height * 0.9);
  const probe = document.createElement('canvas').getContext('2d');
  const a = drawHero(probe, null, lookOf(n), { anime: true, t: 1, view: 'front' });
  const head = a ? a.head : { x: 0, y: -70, r: 7 };
  const k = sm.height / (head.r * 7.2);                 // ≈ hair top to mid-chest
  const g = sm.getContext('2d', { willReadFrequently: true });
  g.translate(sm.width / 2 - head.x * k, sm.height * 0.06 + head.r * 2 * k - head.y * k); g.scale(k, k);
  drawHero(g, null, lookOf(n), { anime: true, t: 1, view: 'front' });
  if (P) { const img = g.getImageData(0, 0, sm.width, sm.height); pixelData(img.data, sm.width, sm.height, P); g.putImageData(img, 0, 0); }
  const out = c.getContext('2d'); out.imageSmoothingEnabled = !P;
  out.drawImage(sm, 0, 0, c.width, c.height);
  return c;
}

const VARIANTS = {
  A: { name: 'A · Potret Besar', note: 'Potret setengah badan besar di kiri (bernapas pelan), kotak teks gelap di bawah dengan plakat nama emas, teks mengetik, ▼ berdenyut. Pilihan muncul setelah teks selesai. Penjual: panel toko di kanan. Klik / Spasi = lanjut, 1–4 = pilih.' },
  B: { name: 'B · Sinematik', note: 'Pita hitam turun dari atas & bawah, kamera mendekat ke NPC di dunia, teks seperti subtitle di pita bawah, pilihan di tengah layar. Klik / Spasi = lanjut, 1–4 = pilih.' },
  C: { name: 'C · Gelembung + Potret', note: 'Warga biasa bicara lewat gelembung di atas kepala tanpa menghentikan permainan. NPC penting punya tanda ! dan tombol Bicara (E) yang membuka dialog Potret Besar (A).' },
};

// percakapan contoh: tiap simpul = beberapa baris lalu pilihan; mood mengubah kotak (worry redup, angry bergetar)
const SCRIPTS = {
  odo: {
    start: { lines: [
      { t: 'Ah, kau sudah bangun, Nak. Api unggun semalam… kau lihat sendiri, kan?', mood: 'ask' },
      { t: 'Segel di bawah kota retak. Bayangan itu akan kembali, dan jumlahnya lebih banyak.', mood: 'worry' },
      { t: 'Hmm… kalau kau mau menolong orang tua ini, aku punya satu permintaan.', mood: 'think' },
    ], choices: [['Ceritakan tentang segel itu', 'seal'], ['Apa yang harus kulakukan?', 'quest'], ['Nanti saja, Kek.', 'bye']] },
    seal: { lines: [
      { t: 'Leluhur kita membuat segel itu dengan api unggun ini sebagai jantungnya.', mood: 'think' },
      { t: 'Selama api menyala, bayangan hanya bisa berbisik. Tapi semalam… apinya meredup.', mood: 'worry' },
    ], choices: [['Apa yang harus kulakukan?', 'quest'], ['Sampai jumpa.', 'bye']] },
    quest: { lines: [
      { t: 'Kau mau?! Bagus! Pergilah ke Hutan Kabut, bawa pulang Bara Abadi dari sarang serigala.', mood: 'shock' },
      { t: 'DAN JANGAN pergi tanpa ramuan! Hutan itu sudah menelan tiga pemuda tahun ini!', mood: 'angry' },
    ], quest: 'Quest baru: Bara Abadi', choices: [['Aku berangkat.', 'bye']] },
    bye: { lines: [{ t: 'Hati-hati, Nak. Api unggun selalu menunggumu pulang.', mood: 'happy' }], end: true },
  },
  gear: {
    start: { lines: [
      { t: 'Hah! Petualang lagi. Pedangmu itu… sudah tumpul seperti sendok sayur.', mood: 'shock' },
      { t: 'Mau beli peti, jual rongsokan, atau tempa gear?', mood: 'ask' },
    ], choices: [['Belanja', 'shop'], ['Jual gear', 'sell'], ['Pergi', 'bye']] },
    shop: { lines: [{ t: 'Lihat-lihat saja. Jangan sentuh yang masih panas!' }], shop: 'senjata' },
    sell: { lines: [{ t: 'Taruh rongsokanmu di meja. Akan kuhitung dengan jujur… kebanyakan.' }], shop: 'jual' },
    more: { lines: [{ t: 'Ada lagi?', mood: 'ask' }], choices: [['Belanja', 'shop'], ['Jual gear', 'sell'], ['Pergi', 'bye']] },
    bye: { lines: [{ t: 'Jangan kembali dengan pedang patah!', mood: 'angry' }], end: true },
  },
};

let variant = new URLSearchParams(location.search).get('v') || 'A';
let who = 'odo';
let D = null;      // open dialog: { node, li, shown, done, ui }
let t = 0;

// ---- jalannya dialog -----------------------------------------------------------
function open() {
  D = { node: 'start', li: 0, shown: 0, ui: (variant === 'B' ? buildB : buildA)() };
  $('dlg').replaceChildren(D.ui.root);
  requestAnimationFrame(() => D?.ui.root.classList.add('open'));
  if (variant === 'B') $('cam').classList.add('zoom');
  showLine();
}
function close() {
  if (!D) return;
  const r = D.ui.root; r.classList.remove('open'); r.classList.add('closing');
  setTimeout(() => r.remove(), 350);
  $('cam').classList.remove('zoom');
  D = null;
}
const node = () => SCRIPTS[who][D.node];
const line = () => D.custom || node().lines[D.li]; // custom: a reply said inside the shop
function showLine() {
  D.shown = 0; D.done = false;
  D.ui.setMood(line().mood);
  D.ui.choices([]);
}
// the shopkeeper answers while the shop stays open
function say(text, mood) { if (!D) return; D.custom = { t: text, mood }; showLine(); }
function leaveShop() { if (!D) return; D.custom = null; D.ui.shop(null); D.node = 'more'; D.li = 0; showLine(); }
function advance() {
  if (!D) return;
  if (!D.done) { D.shown = line().t.length; return; }
  if (D.custom) return;
  if (D.li < node().lines.length - 1) { D.li++; showLine(); return; }
  if (node().end) close();
}
function choose(i) {
  if (!D || !D.done || D.li < node().lines.length - 1) return;
  const c = node().choices?.[i];
  if (!c) return;
  D.node = c[1]; D.li = 0; showLine();
}
function tick(dt) {
  if (!D) return;
  const L = line();
  if (!D.done) {
    D.shown = Math.min(L.t.length, D.shown + dt * 45);
    if (D.shown >= L.t.length) {
      D.done = true;
      const last = !D.custom && D.li === node().lines.length - 1;
      if (last && node().choices) D.ui.choices(node().choices);
      if (last && node().shop) D.ui.shop(node().shop);
      if (last && node().quest) D.ui.toast(node().quest);
    }
  }
  const waits = D.custom || (D.li === node().lines.length - 1 && (node().choices || node().shop));
  D.ui.text(L.t.slice(0, Math.floor(D.shown)), D.done && !waits);
}

// ---- potongan bersama -----------------------------------------------------------
function choiceList(box, list) {
  box.replaceChildren(...list.map(([label], i) => {
    const b = el('button', 'ch', `<kbd>${i + 1}</kbd><span>${label}</span>`);
    b.style.setProperty('--i', i);
    b.onclick = (e) => { e.stopPropagation(); choose(i); };
    return b;
  }));
  box.classList.toggle('show', list.length > 0);
}
// tab: open the shop on that tab; null closes it
function shopToggle(root, box, tab) {
  root.classList.toggle('shopping', !!tab);
  if (tab) { box.replaceChildren(shopUI({ say, done: leaveShop, tab })); requestAnimationFrame(() => box.classList.add('show')); }
  else box.classList.remove('show');
}
function toastEl(root) {
  return (text) => {
    const tt = el('div', 'qtoast', `<i>!</i>${text}`);
    root.append(tt); setTimeout(() => tt.remove(), 2600);
  };
}
const EMBERS = Array.from({ length: 12 }, (_, i) => `<i style="left:${(i * 37) % 100}%;--d:${(i * 0.43) % 4}s;--s:${2.6 + (i % 4) * 0.5}s;--x:${(i % 2 ? 1 : -1) * (6 + (i % 5) * 4)}px"></i>`).join('');
const RUNE = '<svg class="rune" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" class="r1" pathLength="120"/><circle cx="50" cy="50" r="44" class="r2" pathLength="100"/></svg>';

// ---- A: Potret Besar --------------------------------------------------------------
function buildA() {
  const n = NPC[who], phone = $('wrap').classList.contains('phone');
  const root = el('div', 'va');
  const veil = el('div', 'veil');
  const bust = el('div', 'bust', `<div class="halo">${RUNE}</div>`);
  const fig = el('div', 'fig'); fig.append(bust_(n, phone ? 240 : 340));
  const emo = el('div', 'emo');
  bust.append(fig, emo);
  const box = el('div', 'box', `<div class="plate"><b>${n.name}</b><span>${n.title || roleTitle(n)}</span></div><p class="txt"></p><i class="next"></i><div class="embers">${EMBERS}</div>`);
  const ch = el('div', 'choices'), shopBox = el('div', 'shopwrap');
  root.append(veil, bust, shopBox, box, ch);
  return {
    root,
    text(s, more) { box.querySelector('.txt').textContent = s; box.classList.toggle('more', more); },
    setMood(m) {
      box.dataset.mood = m || '';
      if (m === 'angry') { box.classList.remove('jolt'); void box.offsetWidth; box.classList.add('jolt'); }
      // re-run the body reaction and the symbol even when the same mood comes twice
      bust.dataset.mood = ''; void fig.offsetWidth; bust.dataset.mood = m || '';
      emo.innerHTML = EMOTE[m] || '';
    },
    choices(list) { choiceList(ch, list); },
    shop(tab) { shopToggle(root, shopBox, tab); },
    toast: toastEl(root),
  };
}
// anime "manpu" symbols drawn near the head
const EMOTE = {
  angry: '<svg class="e-angry" viewBox="-20 -20 40 40"><path d="M-3-4C-4-10-10-12-14-9M4-3C10-4 12-10 9-14M3 4C4 10 10 12 14 9M-4 3C-10 4-12 10-9 14"/></svg>',
  ask: '<b class="e-ask">?</b>',
  shock: '<b class="e-shock">!</b><i class="e-lines"><i></i><i></i><i></i></i>',
  worry: '<i class="e-sweat"></i><i class="e-gloom"><i></i><i></i><i></i><i></i></i>',
  happy: '<b class="e-note n1">♪</b><b class="e-note n2">♫</b><i class="e-spark s1"></i><i class="e-spark s2"></i><i class="e-spark s3"></i>',
  think: '<b class="e-dots"><i></i><i></i><i></i></b>',
};
const roleTitle = (n) => ({ gear: 'Pandai Besi', inn: 'Penginapan', potion: 'Toko Ramuan' }[n.role] || '');

// ---- B: Sinematik -------------------------------------------------------------------
function buildB() {
  const n = NPC[who];
  const root = el('div', 'vb', `<i class="lb top"></i><i class="lb bot"></i>`);
  const sub = el('div', 'sub', `<b class="nm">${n.name}<span> · ${n.title || roleTitle(n)}</span></b><p class="txt"></p><i class="next"></i>`);
  const ch = el('div', 'choices'), shopBox = el('div', 'shopwrap');
  root.append(sub, ch, shopBox);
  return {
    root,
    text(s, more) { sub.querySelector('.txt').textContent = s; sub.classList.toggle('more', more); },
    setMood(m) { sub.dataset.mood = m || ''; if (m === 'angry') { sub.classList.remove('jolt'); void sub.offsetWidth; sub.classList.add('jolt'); } },
    choices(list) { choiceList(ch, list); },
    shop(tab) { shopToggle(root, shopBox, tab); },
    toast: toastEl(root),
  };
}

// ---- C: gelembung warga ---------------------------------------------------------------
// talkers in the scene: [npc id, x as a fraction of the width, chatter?]
const CROWD = [['pip', 0.17, true], ['sela', 0.83, true], ['dara', 0.93, true]];
const bubbles = new Map();
function bubbleFor(id) {
  let b = bubbles.get(id);
  if (!b) {
    b = { el: el('div', 'bub', '<i class="be"></i><span></span>'), i: Math.floor(Math.random() * 4), t: Math.random() * 3, shown: 0 };
    $('bubbles').append(b.el); bubbles.set(id, b);
  }
  return b;
}
const prompt = el('button', 'talk', '<kbd>E</kbd>Bicara');
prompt.onclick = (e) => { e.stopPropagation(); open(); };
const mark = el('div', 'mark', '!');

function updateBubbles(dt, heads) {
  const on = variant === 'C' && !D;
  $('bubbles').classList.toggle('show', on);
  if (!on) return;
  for (const [id, , chat] of CROWD) {
    const h = heads[id]; if (!h || !chat) continue;
    const b = bubbleFor(id), lines = NPC[id].lines;
    b.t += dt;
    const cycle = 6;
    if (b.t > cycle) { b.t = 0; b.i = (b.i + 1) % lines.length; b.shown = 0; }
    const text = lines[b.i];
    b.shown = Math.min(text.length, b.shown + dt * 30);
    b.el.lastChild.textContent = text.slice(0, Math.floor(b.shown));
    const sym = /ha(ha)+|keren/i.test(text) ? '♪' : /\?/.test(text) ? '?' : /!/.test(text) ? '!' : /…/.test(text) ? '…' : '';
    const be = b.el.firstChild; if (be.textContent !== sym) { be.textContent = sym; be.className = `be${sym ? ' on' : ''}`; }
    b.el.classList.toggle('show', b.t < cycle - 1.2);
    b.el.style.left = `${h.x}px`; b.el.style.top = `${h.y}px`;
  }
  const h = heads[who];
  if (h) {
    if (!mark.isConnected) $('bubbles').append(mark, prompt);
    mark.style.left = prompt.style.left = `${h.x}px`;
    mark.style.top = `${h.y}px`; prompt.style.top = `${h.y + 150 * h.k}px`;
  }
}

// ---- latar --------------------------------------------------------------------------
const bg = new Image(); bg.src = './img/load_town.webp';
const scene = $('scene'), sg = scene.getContext('2d');
function drawScene() {
  const r = $('stage').getBoundingClientRect(), st = $('stage');
  const W = st.clientWidth, H = st.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(W * dpr), h = Math.round(H * dpr);
  if (scene.width !== w || scene.height !== h) { scene.width = w; scene.height = h; }
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.fillStyle = '#0b0810'; sg.fillRect(0, 0, w, h);
  if (bg.complete && bg.naturalWidth) {
    const k = Math.max(w / bg.naturalWidth, h / bg.naturalHeight);
    sg.globalAlpha = 0.6; sg.drawImage(bg, (w - bg.naturalWidth * k) / 2, (h - bg.naturalHeight * k) / 2, bg.naturalWidth * k, bg.naturalHeight * k); sg.globalAlpha = 1;
  }
  const s = h / 250, ground = h * 0.7, heads = {};
  const figure = (x, draw, scale = 1) => {
    sg.save();
    sg.fillStyle = 'rgba(0,0,0,.4)'; sg.beginPath(); sg.ellipse(x, ground, 22 * s * scale, 7 * s * scale, 0, 0, 7); sg.fill();
    sg.translate(x, ground); sg.scale(s * scale, s * scale);
    const a = draw();
    sg.restore();
    return a ? { x: (x + a.head.x * s * scale) / dpr, y: (ground + (a.head.y - 22) * s * scale) / dpr, k: s * scale / dpr } : null;
  };
  figure(w * 0.38, () => drawHero(sg, 'warrior', { hairColor: 0, hair: 0 }, { anime: true, t, view: 'side' }));
  heads[who] = figure(w * 0.6, () => drawHero(sg, null, lookOf(NPC[who]), { anime: true, t, view: 'front' }), NPC[who].scale || 1);
  if (variant === 'C') for (const [id, x] of CROWD) heads[id] = figure(w * x, () => drawHero(sg, null, lookOf(NPC[id]), { anime: true, t: t + x * 3, view: 'front' }), NPC[id].scale || 1);
  return heads;
}

// ---- kontrol --------------------------------------------------------------------------
function mount() {
  close(); $('dlg').replaceChildren();
  $('note').textContent = VARIANTS[variant].note;
  for (const b of $('pick').children) b.classList.toggle('on', b.dataset.v === variant);
  for (const b of $('who').children) b.classList.toggle('on', b.dataset.w === who);
  mark.remove(); prompt.remove();
  $('cam').style.transformOrigin = '58% 55%';
  if (variant !== 'C') setTimeout(open, 250);
}
for (const [k, v] of Object.entries(VARIANTS)) {
  const b = el('button', 'btn', v.name); b.dataset.v = k;
  b.onclick = () => { variant = k; history.replaceState(null, '', `?v=${k}`); mount(); };
  $('pick').append(b);
}
for (const [id, label] of [['odo', 'Kakek Odo (cerita)'], ['gear', 'Pandai Brom (toko)']]) {
  const b = el('button', 'btn', label); b.dataset.w = id;
  b.onclick = () => { who = id; mount(); };
  $('who').append(b);
}
$('phone').onclick = () => { $('wrap').classList.toggle('phone'); $('phone').classList.toggle('on'); fit(); mount(); };
$('again').onclick = () => mount();
const TRY = [['', 'Netral', 'Baiklah. Ada yang bisa kubantu?'], ['angry', 'Marah', 'Siapa yang menginjak kebun lobakku?!'], ['ask', 'Tanya', 'Kau dari mana saja semalam?'],
  ['shock', 'Kaget', 'Apa?! Kau mengalahkan Raja Maw sendirian?!'], ['worry', 'Khawatir', 'Anakku belum pulang dari hutan sejak kemarin…'],
  ['happy', 'Senang', 'Ha ha! Festival tahun ini paling meriah!'], ['think', 'Berpikir', 'Hmm… peta ini… sepertinya aku pernah melihatnya…']];
for (const [m, label, text] of TRY) {
  const b = el('button', 'btn', label);
  b.onclick = (e) => { e.stopPropagation(); if (!D) open(); D.ui.shop?.(null); say(text, m || undefined); };
  $('moods').append(b);
}
$('stage').onclick = () => advance();
addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
  else if (e.key === 'e' || e.key === 'E') { if (!D && variant === 'C') open(); else advance(); }
  else if (e.key >= '1' && e.key <= '4') choose(+e.key - 1);
  else if (e.key === 'Escape') close();
});
function fit() {
  const st = $('stage'), wr = $('wrap');
  if (!wr.classList.contains('phone')) { st.style.transform = ''; return; }
  const k = Math.min(1, (wr.clientWidth - 16) / 844, (wr.clientHeight - 16) / 390);
  st.style.transform = `scale(${k})`;
}
addEventListener('resize', fit);

let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  tick(dt);
  acc += dt;
  if (acc > 1 / 30) { const heads = drawScene(); updateBubbles(acc, heads); acc = 0; }
  requestAnimationFrame(frame);
}
mount();
requestAnimationFrame(frame);
