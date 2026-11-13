// Animated monster sample (app/gerak.html): art/foeanim.js beside the one picture the game shows now.
// Not part of the game.
import { FOE_ANIM, FOE_ANIM_COLORS } from '../src/art/foeanim.js';
import { BEAST_ART } from '../src/art/beasts.js';
import { ENEMIES } from '../src/data/enemies.js';
import { FOE_UNIT } from '../src/art/foes.js';
import { pixelData } from '../src/art/pixeldata.js';

const PIXEL = { k: 2, levels: 7, solid: 0.8, ink: [19, 11, 26] }; // data/look.js pixel
const W = 170, H = 140, GROUND = 118, ZOOM = 2;
const ease = (k) => k * k * (3 - 2 * k), clamp = (v) => Math.max(0, Math.min(1, v));
const FOES = [['wolf', 'Serigala Bayang'], ['tank', 'Golem'], ['slink', 'Lendir']];
// each column: a looping state → the pose at time t (and how visible the figure is)
const STATES = [
  ['Diam', (t) => ({ t })],
  ['Jalan', (t) => ({ t, walk: t * 7, move: 1 })],
  ['Ancang-ancang', (t) => { const k = t % 1.6; return { t, wind: k < 0.4 ? ease(k / 0.4) : k < 1.2 ? 1 : ease(1 - (k - 1.2) / 0.4) }; }],
  ['Serang', (t) => {
    const k = t % 1.8;
    if (k < 0.6) return { t, wind: ease(k / 0.6) };
    if (k < 0.75) { const s = (k - 0.6) / 0.15; return { t, wind: 1 - s, strike: s }; }
    if (k < 1.15) return { t, strike: 1 };
    return { t, strike: ease(1 - (k - 1.15) / 0.65) };
  }],
  ['Kena pukul', (t) => { const k = t % 1.2; return { t, hurt: clamp(1 - k / 0.35) }; }],
  ['Mati', (t) => { const k = t % 2.4; return { t, die: clamp(k / 0.8), alpha: k > 1.8 ? 1 - (k - 1.8) / 0.6 : 1 }; }],
];

const cells = [];
const list = document.getElementById('list');
for (const [type, name] of FOES) {
  const h = document.createElement('h2'); h.textContent = name;
  const wrap = document.createElement('div'); wrap.className = 'scroll';
  const row = document.createElement('div'); row.className = 'row';
  const add = (title, draw, now = false) => {
    const fig = document.createElement('figure'), c = document.createElement('canvas'), cap = document.createElement('figcaption');
    if (now) fig.className = 'now';
    cap.textContent = title; fig.append(c, cap); row.append(fig);
    cells.push({ c, g: c.getContext('2d', { willReadFrequently: true }), type, draw });
  };
  // what the game shows now: one picture, squashed and leaned (render3d/actors.js foeBody)
  add('Sekarang di game', (g, t) => {
    const lean = Math.sin(t * 2.2) * 0.14, sq = 1 + Math.sin(t * 5) * 0.06;
    g.translate(0, 42); g.transform(1, 0, -lean, 1, 0, 0); g.scale(1 / sq, sq); g.translate(0, -42);
    BEAST_ART[type](g);
  }, true);
  for (const [title, pose] of STATES) add(title, (g, t) => { const p = pose(t); g.globalAlpha = p.alpha ?? 1; FOE_ANIM[type](g, FOE_ANIM_COLORS[type], p); });
  wrap.append(row); list.append(h, wrap);
}

const pixelBox = document.getElementById('pixel'), fastBox = document.getElementById('fast');
let last = 0;
function frame(ms) {
  requestAnimationFrame(frame);
  const fps = fastBox.checked ? 60 : 12;
  if (ms - last < 1000 / fps - 2) return;
  last = ms;
  const t = ms / 1000, pixel = pixelBox.checked, k = pixel ? PIXEL.k : ZOOM;
  for (const cell of cells) {
    const { c, g, type } = cell;
    if (c.width !== W * k) { c.width = W * k; c.height = H * k; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.scale(k, k);
    g.strokeStyle = 'rgba(201,162,74,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, GROUND); g.lineTo(W, GROUND); g.stroke();
    const s = (ENEMIES[type].r / FOE_UNIT) * ZOOM * 1.4; // a little bigger than in the game, so the motion reads
    g.save(); g.translate(W / 2, GROUND - 42 * s); g.scale(s, s); g.lineJoin = 'round';
    cell.draw(g, t);
    g.restore();
    if (pixel) { const img = g.getImageData(0, 0, c.width, c.height); pixelData(img.data, c.width, c.height, PIXEL); g.putImageData(img, 0, 0); }
  }
}
requestAnimationFrame(frame);
