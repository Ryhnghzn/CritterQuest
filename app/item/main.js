// Item icon page (app/item.html): the anime item icons (src/art/anime/items.js) — the Mitos set
// big, and every item at every rarity as current icons, anime icons, or either as pixel art
// (the game's pixel filter, render3d/pixelate.js). Default: anime pixel art at 40 px.
import { drawAnimeItem } from '../src/art/anime/items.js';
import { ELEMENTS } from '../src/art/anime/common.js';
import { drawGearIcon } from '../src/art/gear.js';
import { pixelData } from '../src/render3d/pixelate.js';

const $ = (id) => document.getElementById(id);
const PIX = { levels: 7, solid: 0.8, ink: [19, 11, 26] };
const ROWS = [
  { slot: 'weapon', classId: 'warrior' }, { slot: 'weapon', classId: 'archer' }, { slot: 'weapon', classId: 'mage' }, { slot: 'weapon', classId: 'assassin' },
  { slot: 'helm' }, { slot: 'armor' }, { slot: 'boots' }, { slot: 'amulet' }, { slot: 'ring' },
];
const SIZES = { s24: ['24 px', 24], s32: ['32 px', 32], s40: ['40 px', 40] };
const KINDS = { now: 'Sekarang (halus)', anime: 'Anime (halus)', animepx: 'Anime pixel', nowpx: 'Sekarang pixel' };
const state = { element: 'fire', size: 's40', left: 'anime', right: 'animepx' };

const rows = [];
function buttons(id, list, key) {
  const box = $(id);
  const draw = () => box.replaceChildren(...Object.entries(list).map(([k, v]) => {
    const b = document.createElement('button');
    b.className = `btn${state[key] === k ? ' on' : ''}`; b.textContent = typeof v === 'string' ? v : v.name || v[0];
    b.onclick = () => { state[key] = k; rows.forEach((r) => r()); names(); };
    return b;
  }));
  rows.push(draw); draw();
}
const names = () => {
  const n = (k) => KINDS[k] + (k.endsWith('px') ? ` ${SIZES[state.size][0]}` : '');
  $('ileftname').textContent = n(state.left); $('irightname').textContent = n(state.right);
};
buttons('element', ELEMENTS, 'element'); buttons('ileft', KINDS, 'left'); buttons('iright', KINDS, 'right'); buttons('isize', SIZES, 'size');
names();

const dpr = () => Math.min(devicePixelRatio || 1, 2);
function fit(c) {
  const w = Math.round(c.clientWidth * dpr()), h = Math.round(c.clientHeight * dpr());
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c.getContext('2d');
}
const small = document.createElement('canvas');
// one icon of a kind centred at (x, y), size px
function icon(g, kind, item, x, y, size, t) {
  const paint = (gg, s) => (kind.startsWith('anime') ? drawAnimeItem(gg, item, s, t, state.element) : drawGearIcon(gg, item, s, t));
  if (!kind.endsWith('px')) { g.setTransform(1, 0, 0, 1, x, y); paint(g, size); return; }
  const n = SIZES[state.size][1];
  if (small.width !== n) small.width = small.height = n;
  const sg = small.getContext('2d', { willReadFrequently: true });
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, n, n); sg.translate(n / 2, n / 2);
  paint(sg, n);
  const img = sg.getImageData(0, 0, n, n); pixelData(img.data, n, n, PIX); sg.putImageData(img, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  g.drawImage(small, Math.round(x - size / 2), Math.round(y - size / 2), Math.round(size), Math.round(size));
  g.imageSmoothingEnabled = true;
}
const clear = (g, c) => { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#120e16'; g.fillRect(0, 0, c.width, c.height); };

function draw(t) {
  const cm = $('imythic'), gm = fit(cm), cell = cm.width / 9;
  clear(gm, cm);
  ROWS.forEach((row, i) => icon(gm, 'anime', { ...row, rarity: 5 }, cell * (i + 0.5), cm.height / 2, Math.min(cell, cm.height) * 0.92, t));
  for (const [id, kind] of [['ileftc', state.left], ['irightc', state.right]]) {
    const c = $(id), g = fit(c), w = c.width / 6;
    clear(g, c);
    ROWS.forEach((row, ri) => { for (let r = 0; r < 6; r++) icon(g, kind, { ...row, rarity: r, tier: Math.min(6, r + 1) }, w * (r + 0.5), w * (ri + 0.5), w * 0.86, t); });
  }
}
let last = -9;
function frame(ms) {
  const t = ms / 1000;
  if (t - last >= 1 / 20) { // 20 fps is plenty for icons
    last = t;
    try { draw(t); } catch (e) { console.error('[item]', e); }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
