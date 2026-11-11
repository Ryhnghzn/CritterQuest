// Anime townsfolk sample (app/npc.html): all 22 archetypes in a grid — side / front / back,
// standing (their job idle) or walking, smooth or pixel art, optionally next to the style-D ones.
import { drawAnimeNpc } from '../src/art/anime/npc.js';
import { ARCHETYPES } from '../src/art/hero/npc.js';
import { drawDoll } from '../src/art/doll.js';
import { pixelData } from '../src/art/pixeldata.js';

const $ = (id) => document.getElementById(id);
const NAMES = {
  smith: 'Pandai Besi', miner: 'Penambang', innkeeper: 'Pemilik Penginapan', herbalist: 'Peramu', jeweler: 'Perhiasan', tailor: 'Penjahit / Tukang Cukur',
  master: 'Pelatih', captain: 'Kapten', guard: 'Penjaga', clerk: 'Juru Tulis', merchant: 'Pedagang', night: 'Pedagang Malam', elder: 'Tetua', grandma: 'Nenek',
  child: 'Anak', mage: 'Penyihir', hunter: 'Pemburu', knight: 'Ksatria', dancer: 'Penari', florist: 'Penjual Bunga', traveler: 'Pengelana', villager: 'Warga',
};
const OUTFIT = { // [main, shade] like the game's NPC outfits
  smith: ['#6a3a22', '#2a160c'], miner: ['#7a6a4a', '#3a3020'], innkeeper: ['#8a3a2a', '#3a1610'], herbalist: ['#4a6a3a', '#1e2e16'], jeweler: ['#5a3a7a', '#24163a'],
  tailor: ['#3a5a8a', '#16243a'], master: ['#8a2a2a', '#3a0e0e'], captain: ['#2a3a5a', '#0e1626'], guard: ['#3a4a6a', '#141c2e'], clerk: ['#4a4a5a', '#1c1c26'],
  merchant: ['#a0702a', '#4a300e'], night: ['#2a2240', '#0e0a1a'], elder: ['#6a5a8a', '#2a2238'], grandma: ['#8a5a6a', '#3a222a'], child: ['#3a8a6a', '#16382a'],
  mage: ['#3a2a7a', '#140e34'], hunter: ['#3a5a2a', '#16260e'], knight: ['#5a2a3a', '#220e16'], dancer: ['#b0306a', '#4a0e2a'], florist: ['#c06a3a', '#4a2410'],
  traveler: ['#6a5a3a', '#2a2214'], villager: ['#5a7a3a', '#243216'],
};
const RENDERS = { anime: ['Anime'], px: ['Pixel', 80] };
const VIEWS = { side: ['Samping'], front: ['Depan'], back: ['Belakang'], spin: ['Putar otomatis'] };
const state = { render: 'px', view: 'side', walk: false, old: false };

function buttons(id, list, key) {
  const box = $(id);
  const draw = () => box.replaceChildren(...Object.entries(list).map(([k, v]) => {
    const b = document.createElement('button');
    b.className = `btn${state[key] === k ? ' on' : ''}`; b.textContent = v[0];
    b.onclick = () => { state[key] = k; draw(); };
    return b;
  }));
  draw();
}
buttons('render', RENDERS, 'render'); buttons('view', VIEWS, 'view');
for (const [id, key] of [['walk', 'walk'], ['old', 'old']]) $(id).onclick = () => { state[key] = !state[key]; $(id).classList.toggle('on', state[key]); };

const dpr = () => Math.min(devicePixelRatio || 1, 2);
const PIX = { levels: 7, solid: 0.8, ink: [19, 11, 26] };
const ART_H = 175, BOX = { x0: -70, x1: 110, y0: -205, y1: 22 };
const small = document.createElement('canvas');
// one figure at k screen px per art unit, feet at (x, y)
function figure(g, paint, k, x, y) {
  const n = RENDERS[state.render][1];
  if (!n) { g.setTransform(k, 0, 0, k, x, y); paint(g); return; }
  const s = n / ART_H, w = Math.ceil((BOX.x1 - BOX.x0) * s), h = Math.ceil((BOX.y1 - BOX.y0) * s);
  if (small.width !== w || small.height !== h) { small.width = w; small.height = h; }
  const sg = small.getContext('2d', { willReadFrequently: true });
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, w, h);
  sg.setTransform(s, 0, 0, s, -BOX.x0 * s, -BOX.y0 * s);
  paint(sg);
  const img = sg.getImageData(0, 0, w, h); pixelData(img.data, w, h, PIX); sg.putImageData(img, 0, 0);
  const z = k / s;
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  g.drawImage(small, x + BOX.x0 * k, y + BOX.y0 * k, w * z, h * z);
  g.imageSmoothingEnabled = true;
}

const ORDER = ['side', 'front', 'side', 'back'];
function draw(t) {
  const c = $('grid'), cols = innerWidth < 700 ? 3 : 6, rows = Math.ceil(ARCHETYPES.length / cols);
  const cssW = c.clientWidth, cell = cssW / cols;
  c.style.height = `${rows * cell * 1.15}px`;
  const W = Math.round(cssW * dpr()), H = Math.round(rows * cell * 1.15 * dpr());
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const g = c.getContext('2d'), cw = W / cols, ch = H / rows, view = state.view === 'spin' ? ORDER[Math.floor(t / 2.4) % 4] : state.view;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0b0810'; g.fillRect(0, 0, W, H);
  ARCHETYPES.forEach((arch, i) => {
    const cx = cw * (i % cols), cy = ch * Math.floor(i / cols);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = i % 2 ? '#100c16' : '#0d0a12'; g.fillRect(cx, cy, cw, ch);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(cx + cw * (state.old ? 0.62 : 0.5), cy + ch * 0.9, cw * 0.16, cw * 0.035, 0, 0, 7); g.fill();
    const o = { outfit: OUTFIT[arch], look: { hair: i % 6, hairColor: (i * 2) % 6 } }, k = (ch * 0.78) / 215 * (arch === 'child' ? 0.78 : 1);
    const pose = { t: t + i * 0.37, moving: state.walk ? 1 : 0, walk: (t + i) * 9, view };
    figure(g, (gg) => drawAnimeNpc(gg, arch, o, pose), k, cx + cw * (state.old ? 0.62 : 0.5), cy + ch * 0.9);
    if (state.old) { // the current style-D townsperson, same job, same size
      g.setTransform(1, 0, 0, 1, cx + cw * 0.24, cy + ch * 0.9); const kk = (ch * 0.78) / 62 * (arch === 'child' ? 0.78 : 1); g.scale(kk, kk);
      drawDoll(g, null, { ...o.look, outfit: o.outfit, npc: { role: 'talk', title: NAMES[arch] } }, { t: pose.t, moving: pose.moving, walk: pose.walk });
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#e8cf8e'; g.font = `600 ${Math.round(12.5 * dpr())}px Barlow, sans-serif`; g.textAlign = 'center';
    g.fillText(NAMES[arch], cx + cw / 2, cy + 18 * dpr());
  });
}
let last = -9;
function frame(ms) {
  const t = ms / 1000;
  if (t - last >= 1 / 30) { last = t; try { draw(t); } catch (e) { console.error('[npc]', e); } }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
