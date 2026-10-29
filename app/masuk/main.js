// Title-page concept page: three takes on the screen you land on (A campfire, B eclipse
// gate, C adventurer's hall), the loading screen shown while the world is built, and
// the Settings menu. Uses the game's own art: portraits, the animated doll, enemies.
import { portrait, drawDoll } from '../src/art/doll.js';
import { enemyCanvas } from '../src/art/sprites.js';
import { ENEMIES } from '../src/data/enemies.js';

const $ = (id) => document.getElementById(id);
function el(tag, cls, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const k of kids) if (k != null) e.append(typeof k === 'string' ? document.createTextNode(k) : k);
  return e;
}
const TAU = Math.PI * 2;
const MYTH = { tier: 6, rarity: 5 }, LEG = { tier: 5, rarity: 4 }, EPIC = { tier: 4, rarity: 3 };
const LOOKS = {
  warrior: { hair: 1, hairColor: 2, gear: { weapon: MYTH, helm: LEG, armor: MYTH, boots: LEG } },
  archer: { hair: 3, hairColor: 4, gear: { weapon: LEG, armor: EPIC, boots: EPIC } },
  mage: { hair: 2, hairColor: 6, gear: { weapon: LEG, helm: EPIC, armor: LEG } },
  assassin: { hair: 0, hairColor: 0, gear: { weapon: EPIC, armor: EPIC, boots: LEG } },
};
const LAST = { name: 'Rey', classId: 'warrior', cls: 'Warrior', lv: 24, where: 'Rimbawana', time: '6 j 40 m' };

// every animated canvas on the page, drawn by one loop (only while on screen)
const painters = [];
function animCanvas(cls, draw) {
  const c = el('canvas', cls);
  painters.push({ c, draw, seen: false });
  return c;
}
const io = new IntersectionObserver((es) => { for (const e of es) { const p = painters.find((x) => x.c === e.target); if (p) p.seen = e.isIntersecting; } });
function loop(now) {
  const t = now / 1000;
  for (const p of painters) {
    if (!p.seen) continue;
    const c = p.c, dpr = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    p.draw(g, w, h, t);
  }
  requestAnimationFrame(loop);
}

// a fixed scatter of points (stars, embers) — same every frame
const scatter = (n, seed) => Array.from({ length: n }, (_, i) => {
  const r = (k) => { const x = Math.sin((i + 1) * 12.9898 * k + seed * 78.233) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1), y: r(2), s: r(3), p: r(4) };
});
const STARS = scatter(140, 1), EMBERS = scatter(60, 2), RUNES = scatter(40, 3), MOTES = scatter(50, 4);

function stars(g, w, h, t, top = 0.62) {
  for (const s of STARS) {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.5 + s.s) + s.p * 9));
    g.fillStyle = `rgba(235,225,255,${a * (0.3 + s.s * 0.7)})`;
    g.fillRect(s.x * w, s.y * h * top, 1 + s.s * 1.2, 1 + s.s * 1.2);
  }
}
function treeline(g, w, h, y, color, seed, tall) {
  g.fillStyle = color;
  g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w + 20; x += 18) {
    const k = Math.sin(x * 0.013 + seed) * 0.5 + Math.sin(x * 0.051 + seed * 3) * 0.5;
    g.lineTo(x, y - tall * (0.55 + 0.45 * k)); g.lineTo(x + 9, y - tall * (0.2 + 0.3 * Math.abs(k)));
  }
  g.lineTo(w, h); g.closePath(); g.fill();
}
function flame(g, x, y, s, t) {
  for (let i = 0; i < 3; i++) {
    const k = 1 - i * 0.28, wob = Math.sin(t * 9 + i * 2) * 4 * s;
    const gr = g.createLinearGradient(0, y - 90 * s * k, 0, y);
    gr.addColorStop(0, 'rgba(255,240,180,0)'); gr.addColorStop(0.4, ['#ff7a2a', '#ffb03a', '#fff1b3'][i]); gr.addColorStop(1, ['#c8321e', '#ff6a1a', '#ffd166'][i]);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 28 * s * k, y);
    g.quadraticCurveTo(x - 30 * s * k, y - 40 * s * k, x + wob, y - (80 + Math.sin(t * 7 + i) * 10) * s * k);
    g.quadraticCurveTo(x + 30 * s * k, y - 40 * s * k, x + 28 * s * k, y); g.closePath(); g.fill();
  }
}
function glow(g, x, y, r, c, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, c.replace('A', a)); gr.addColorStop(1, c.replace('A', 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

// ——— A. Api Unggun: the four classes resting around a campfire at the forest edge ———
function bgCampfire(g, w, h, t) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#07060f'); sky.addColorStop(0.55, '#1a1026'); sky.addColorStop(1, '#0b0709');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  stars(g, w, h, t, 0.5);
  glow(g, w * 0.78, h * 0.16, 70, 'rgba(255,236,200,A)', 0.25);
  g.fillStyle = '#efe4c8'; g.beginPath(); g.arc(w * 0.78, h * 0.16, 16, 0, TAU); g.fill();
  treeline(g, w, h, h * 0.62, '#120b16', 1, h * 0.22);
  treeline(g, w, h, h * 0.7, '#0c0810', 4, h * 0.16);
  g.fillStyle = '#0a0709'; g.fillRect(0, h * 0.7, w, h);
  const fx = w * 0.5, fy = h * 0.86, pulse = 1 + Math.sin(t * 5) * 0.04 + Math.sin(t * 13) * 0.02;
  glow(g, fx, fy - 20, h * 0.55 * pulse, 'rgba(255,140,60,A)', 0.42);
  g.fillStyle = '#3a2216';
  for (const a of [-0.5, 0.5]) { g.save(); g.translate(fx, fy); g.rotate(a); g.fillRect(-34, -5, 68, 10); g.restore(); }
  flame(g, fx, fy, h / 540, t);
  for (const e of EMBERS) {
    const life = (t * (0.25 + e.s * 0.3) + e.p) % 1;
    const x = fx + (e.x - 0.5) * 60 + Math.sin(t * 2 + e.p * 9) * 20 * life, y = fy - 30 - life * h * 0.55;
    g.fillStyle = `rgba(255,${150 + e.s * 90},80,${(1 - life) * 0.9})`;
    g.fillRect(x, y, 2, 2);
  }
}
function conceptA() {
  const s = el('div', 'scr camp');
  s.append(animCanvas('bg', bgCampfire));
  const seat = (cls, x, y, flip, h) => {
    const p = el('div', `sit ${flip ? 'flip' : ''}`); p.style.left = x; p.style.bottom = y;
    p.append(portrait(cls, LOOKS[cls], h)); return p;
  };
  s.append(seat('warrior', '26%', '7%', false, 170), seat('archer', '36%', '17%', false, 130), seat('mage', '58%', '17%', true, 130), seat('assassin', '66%', '7%', true, 170));
  const logo = el('div', 'logo', el('span', 'l1', 'Critter'), el('span', 'l2', 'Quest'), el('span', 'tagline', 'Gerhana di Ujung Dunia'));
  const menu = el('div', 'menu left');
  menu.append(continueCard(), btn('Pilih Petualang'), btn('Pengaturan', 'ghost', () => openSettings(s)), langRow());
  s.append(logo, menu, el('div', 'foot', 'v0.9 · Tekan Enter untuk lanjut'));
  return s;
}

// ——— B. Gerbang Gerhana: a black sun with a living corona over the cliffs ———
function bgEclipse(g, w, h, t) {
  const sky = g.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, h);
  sky.addColorStop(0, '#2a1440'); sky.addColorStop(0.5, '#120a1e'); sky.addColorStop(1, '#050308');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  stars(g, w, h, t, 0.8);
  const cx = w / 2, cy = h * 0.4, R = h * 0.2;
  g.save(); g.translate(cx, cy); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU + t * 0.06, len = R * (0.35 + 0.35 * Math.abs(Math.sin(i * 1.7 + t * 0.8)));
    const gr = g.createLinearGradient(Math.cos(a) * R, Math.sin(a) * R, Math.cos(a) * (R + len), Math.sin(a) * (R + len));
    gr.addColorStop(0, 'rgba(200,140,255,.55)'); gr.addColorStop(1, 'rgba(120,60,200,0)');
    g.strokeStyle = gr; g.lineWidth = 3 + (i % 3);
    g.beginPath(); g.moveTo(Math.cos(a) * R, Math.sin(a) * R); g.lineTo(Math.cos(a) * (R + len), Math.sin(a) * (R + len)); g.stroke();
  }
  glow(g, 0, 0, R * 1.9, 'rgba(170,110,255,A)', 0.5);
  g.restore();
  g.fillStyle = '#030205'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,230,255,.85)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  for (const r of RUNES) {
    const life = (t * 0.08 + r.p) % 1, x = r.x * w, y = h * (0.95 - life * 0.8);
    g.fillStyle = `rgba(190,150,255,${Math.sin(life * Math.PI) * 0.6})`;
    g.fillRect(x, y, 2, 2 + r.s * 3);
  }
  g.fillStyle = '#08050c';
  g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.78); g.lineTo(w * 0.18, h * 0.74); g.lineTo(w * 0.3, h * 0.8); g.lineTo(w * 0.42, h * 0.77);
  g.lineTo(w * 0.58, h * 0.83); g.lineTo(w * 0.72, h * 0.72); g.lineTo(w * 0.84, h * 0.7); g.lineTo(w, h * 0.76); g.lineTo(w, h); g.fill();
  const fog = g.createLinearGradient(0, h * 0.7, 0, h);
  fog.addColorStop(0, 'rgba(90,50,140,0)'); fog.addColorStop(1, `rgba(90,50,140,${0.25 + Math.sin(t * 0.7) * 0.05})`);
  g.fillStyle = fog; g.fillRect(0, h * 0.7, w, h * 0.3);
}
function conceptB() {
  const s = el('div', 'scr eclipse');
  s.append(animCanvas('bg', bgEclipse));
  const foes = el('div', 'foes');
  for (const [id, x, sz] of [['wraith', '8%', 120], ['eclipseboss', '76%', 190], ['imp', '20%', 80]]) {
    const f = el('div', 'foe'); f.style.left = x; f.append(enemyCanvas(id, ENEMIES[id].r, sz)); foes.append(f);
  }
  const hero = el('div', 'lone', portrait('warrior', LOOKS.warrior, 150));
  const logo = el('div', 'logo center', el('span', 'l1', 'Critter Quest'), el('span', 'tagline', 'Gerhana di Ujung Dunia'));
  const menu = el('div', 'menu center');
  menu.append(btn(`Lanjutkan — ${LAST.name} · LV ${LAST.lv}`, 'big'), btn('Pilih Petualang'), el('div', 'pair', btn('Pengaturan', 'ghost', () => openSettings(s)), btn('EN · ID', 'ghost')));
  s.append(foes, hero, logo, menu, el('div', 'foot', 'v0.9'));
  return s;
}

// ——— C. Ruang Petualang: the last played hero on a pedestal, the slots beside ———
function bgHall(g, w, h, t) {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0d0911'); bg.addColorStop(1, '#170f12');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (const m of MOTES) { // warm bokeh drifting
    const x = (m.x * w + t * 8 * (m.s - 0.5) * 4 + w) % w, y = (m.y * h + Math.sin(t * 0.4 + m.p * 7) * 14);
    glow(g, x, y, 8 + m.s * 26, 'rgba(230,170,90,A)', 0.08 + m.s * 0.08);
  }
  const px = w * 0.3, py = h * 0.84;
  glow(g, px, py - h * 0.25, h * 0.5, 'rgba(255,90,110,A)', 0.22 + Math.sin(t * 2) * 0.04); // mythic aura
  g.fillStyle = '#1d1519'; g.beginPath(); g.ellipse(px, py, w * 0.15, 20, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(201,162,74,.6)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(px, py, w * 0.15, 20, 0, 0, TAU); g.stroke();
  g.save(); g.translate(px, py); g.rotate(t * 0.3); g.strokeStyle = 'rgba(255,209,102,.35)'; g.setLineDash([4, 10]);
  g.beginPath(); g.ellipse(0, 0, w * 0.12, 14, 0, 0, TAU); g.stroke(); g.restore();
}
function conceptC() {
  const s = el('div', 'scr hall');
  s.append(animCanvas('bg', bgHall));
  const hero = el('div', 'pedestal', portrait(LAST.classId, LOOKS.warrior, 300));
  const card = el('div', 'herocard', el('b', null, LAST.name), el('span', null, `${LAST.cls} · LV ${LAST.lv}`), el('span', 'dim', `${LAST.where} · ${LAST.time}`));
  const right = el('div', 'hallright');
  const logo = el('div', 'logo small', el('span', 'l1', 'Critter Quest'), el('span', 'tagline', 'Gerhana di Ujung Dunia'));
  const slots = el('div', 'slots3');
  for (const [cls, n, lv] of [['warrior', 'Rey', 24], ['mage', 'Sira', 9], [null, null, 0]]) {
    const sl = el('div', `slot3${cls ? '' : ' empty'}${n === 'Rey' ? ' on' : ''}`);
    if (cls) sl.append(portrait(cls, LOOKS[cls], 54), el('b', null, n), el('span', null, `LV ${lv}`));
    else sl.append(el('span', 'plus', '+'), el('span', null, 'Slot kosong'));
    slots.append(sl);
  }
  right.append(logo, btn('Lanjutkan', 'big'), slots, el('div', 'pair', btn('Pengaturan', 'ghost', () => openSettings(s)), btn('EN · ID', 'ghost')));
  s.append(hero, card, right, el('div', 'foot', 'v0.9'));
  return s;
}

// ——— loading screen: the eclipse closes as the world is built, the hero runs on ———
const STEPS = ['Menyalakan obor…', 'Membangun kota…', 'Menanam pepohonan…', 'Menyiapkan bayangan…', 'Membangunkan warga…'];
const TIPS = ['Ambil tugas di Papan Tugas dulu — progres baru dihitung setelah diambil.', 'Tekan Spasi untuk dodge: sesaat kebal terhadap serangan.', 'Pedagang Malam hanya buka setelah matahari terbenam.', 'Poin atribut yang belum dibagi ditandai angka hijau di tombol Karakter.'];
function bgLoading(g, w, h, t) {
  g.fillStyle = '#07050a'; g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.4, R = Math.min(w, h) * 0.13, k = (t * 0.18) % 1;
  glow(g, cx, cy, R * 2.4, 'rgba(201,162,74,A)', 0.18);
  g.strokeStyle = 'rgba(201,162,74,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  g.strokeStyle = '#e8cf8e'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
  g.fillStyle = '#07050a'; g.beginPath(); g.arc(cx + R * 0.35 * Math.cos(t), cy, R * 0.82, 0, TAU); g.fill(); // the moon sliding over
  for (let i = 0; i < 6; i++) { // runes orbiting
    const a = t * 0.8 + (i / 6) * TAU;
    g.fillStyle = `rgba(232,207,142,${0.4 + 0.4 * Math.sin(t * 3 + i)})`;
    g.save(); g.translate(cx + Math.cos(a) * R * 1.45, cy + Math.sin(a) * R * 1.45); g.rotate(a); g.fillRect(-2, -5, 4, 10); g.restore();
  }
  const gy = h * 0.8; // ground scrolling under a running hero
  g.strokeStyle = 'rgba(201,162,74,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w * 0.2, gy); g.lineTo(w * 0.8, gy); g.stroke();
  for (let x = 0; x < 12; x++) { const px = w * 0.2 + ((x * 50 - t * 140) % (w * 0.6) + w * 0.6) % (w * 0.6); g.fillStyle = 'rgba(201,162,74,.3)'; g.fillRect(px, gy + 4, 14, 2); }
  g.save(); g.translate(w / 2, gy); g.scale(1.6, 1.6);
  drawDoll(g, 'warrior', LOOKS.warrior, { t, moving: 1, walk: t * 9 });
  g.restore();
}
function loadingScreen() {
  const s = el('div', 'scr loading');
  s.append(animCanvas('bg', bgLoading));
  const bar = el('div', 'lbar'); const fill = el('i'); bar.append(fill);
  const step = el('div', 'lstep'), tip = el('div', 'ltip'), pct = el('span', 'lpct');
  s.append(el('div', 'ltitle', 'Critter Quest'), el('div', 'lbox', el('div', 'lrow', step, pct), bar), tip);
  let p = 0, last = 0;
  const tick = (now) => {
    if (now - last > 60) { last = now; p = (p + 0.6 + Math.random() * 1.6) % 112; }
    const v = Math.min(100, p);
    fill.style.width = `${v}%`; pct.textContent = `${Math.round(v)}%`;
    step.textContent = STEPS[Math.min(STEPS.length - 1, Math.floor(v / 20))];
    tip.textContent = `Tips: ${TIPS[Math.floor(now / 5000) % TIPS.length]}`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return s;
}

// ——— settings ———
const TABS = {
  Suara: [['Musik', 'slider', 60], ['Efek suara', 'slider', 80], ['Bisukan semua', 'toggle', false]],
  Grafis: [['Tampilan', 'seg', ['2.5D', '2D'], 0], ['Kualitas efek', 'seg', ['Otomatis', 'Penuh', 'Ringan'], 0], ['Ketajaman', 'seg', ['Hemat', 'Normal', 'Tajam'], 1], ['Tampilkan FPS', 'toggle', false]],
  Permainan: [['Serang otomatis', 'toggle', false], ['Guncangan layar', 'toggle', true], ['Angka damage', 'toggle', true], ['Zoom kamera awal', 'seg', ['Dekat', 'Sedang', 'Jauh'], 2]],
  Bahasa: [['Bahasa', 'seg', ['English', 'Indonesia'], 1]],
};
function settingsPanel(onClose) {
  const p = el('div', 'settings');
  const tabs = el('div', 'stabs'), body = el('div', 'sbody');
  let on = 'Suara';
  const draw = () => {
    tabs.replaceChildren(); body.replaceChildren();
    for (const k of Object.keys(TABS)) { const b = el('button', `stab${k === on ? ' on' : ''}`, k); b.onclick = () => { on = k; draw(); }; tabs.append(b); }
    for (const row of TABS[on]) {
      const [label, kind] = row, r = el('div', 'srow', el('span', 'slabel', label));
      if (kind === 'slider') { const i = el('input'); i.type = 'range'; i.value = row[2]; const v = el('b', 'sval', `${row[2]}%`); i.oninput = () => { v.textContent = `${i.value}%`; row[2] = +i.value; }; r.append(i, v); }
      if (kind === 'toggle') { const b = el('button', `tog${row[2] ? ' on' : ''}`, el('i')); b.onclick = () => { row[2] = !row[2]; b.classList.toggle('on', row[2]); }; r.append(b); }
      if (kind === 'seg') { const sg = el('div', 'seg'); row[2].forEach((o, i) => { const b = el('button', i === row[3] ? 'on' : '', o); b.onclick = () => { row[3] = i; draw(); }; sg.append(b); }); r.append(sg); }
      body.append(r);
    }
  };
  draw();
  const close = el('button', 'btn ghost', 'Tutup'); close.onclick = onClose;
  p.append(el('h2', null, 'Pengaturan'), el('div', 'scols', tabs, body), el('div', 'sfoot', el('span', 'dim', 'Tersimpan otomatis'), close));
  return p;
}
function openSettings(scr) {
  if (scr.querySelector('.settings')) return;
  const shade = el('div', 'shade');
  shade.append(settingsPanel(() => shade.remove()));
  scr.append(shade);
}
function settingsDemo() {
  const s = el('div', 'scr setdemo');
  s.append(animCanvas('bg', bgEclipse), el('div', 'shade', settingsPanel(() => {})));
  return s;
}

// ——— shared bits ———
function btn(label, kind = '', onClick = null) { const b = el('button', `btn ${kind}`, label); if (onClick) b.onclick = onClick; return b; }
function continueCard() {
  const c = el('button', 'cont');
  c.append(portrait(LAST.classId, LOOKS.warrior, 64), el('div', 'ct', el('small', null, 'LANJUTKAN'), el('b', null, LAST.name), el('span', null, `${LAST.cls} · LV ${LAST.lv} · ${LAST.where}`)));
  return c;
}
function langRow() { return el('div', 'pair', btn('EN', 'ghost small'), btn('ID', 'ghost small on')); }

// ——— page ———
const SECTIONS = [
  ['A. Api Unggun', 'Malam di tepi hutan: keempat kelas duduk mengelilingi api unggun, bara naik pelan. Menu di kiri dengan kartu "Lanjutkan" berisi petualang terakhir (sekali ketuk langsung main). Hangat dan mengundang; paling dekat dengan suasana kota.', conceptA],
  ['B. Gerbang Gerhana', 'Matahari hitam dengan korona ungu yang hidup, rune melayang, monster Tanah Gerhana di cakrawala dan satu pahlawan di tebing. Logo tepat di depan gerhana, menu di tengah. Paling dramatis; langsung menceritakan musuh utama.', conceptB],
  ['C. Ruang Petualang', 'Pahlawan terakhir berdiri besar di atas alas dengan aura gear-nya; di kanan logo, tombol Lanjutkan dan ketiga slot. Paling praktis: memilih slot tidak perlu pindah layar.', conceptC],
  ['Layar loading', 'Muncul segera setelah Lanjutkan/slot ditekan, sebelum dunia 3D dibangun — jadi tidak ada lagi layar hitam yang tidak bisa disentuh. Gerhana kecil menutup sebagai penanda progres, pahlawan berlari, langkah yang sedang dikerjakan + tips bergantian. Dunia dibangun bertahap (WebGL, kota, shader) sambil bar maju.', loadingScreen],
  ['Menu Pengaturan', 'Dibuka dari halaman masuk dan dari menu Jeda. Empat tab: Suara (musik & efek terpisah), Grafis (2.5D/2D, kualitas efek, ketajaman, FPS), Permainan (serang otomatis, guncangan layar, angka damage, zoom awal), Bahasa. Semua langsung tersimpan.', settingsDemo],
];
for (const [title, desc, make] of SECTIONS) {
  const sec = el('section', 'sec', el('h2', null, title), el('p', null, desc));
  const frame = el('div', 'frame'); frame.append(make());
  sec.append(frame);
  $('sections').append(sec);
}
for (const p of painters) io.observe(p.c);
requestAnimationFrame(loop);
