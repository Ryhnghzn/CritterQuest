// Anime boss gallery (app/bosanime.html, spec §41.2): the six dungeon bosses from the game's own
// code (src/art/bosses), each beside the anime Mage for scale, smooth or pixel art, left / front /
// right, idle or swinging, phase 1 or 2, with their pixel auras. Not part of the game.
import { drawDoll } from '../src/art/doll.js';
import { pixelData } from '../src/art/pixeldata.js';
import { drawBoss, BOSS_AURAS, BOSS_K } from '../src/art/bosses/index.js';
import { BOSS_TYPES } from '../src/data/dungeons.js';
import { ENEMIES } from '../src/data/enemies.js';

const PIXEL = { levels: 7, solid: 0.8, ink: [19, 11, 26] }; // data/look.js pixel (k chosen below)
const W = 260, H = 150, GROUND = 138, HERO_X = 28, BOSS_X = 140, SHOW = 4, DOLL = 0.82;
const PIXEL_K = { kecil: 3, sedang: 2, besar: 1.25 };
const HERO = { hair: 1, hairColor: 2, gear: { weapon: { tier: 4, rarity: 3 }, armor: { tier: 4, rarity: 3 } } };
const state = { pixel: true, phase: 1, size: 'sedang', swing: false, view: 'right' };

function buttons(id, list, key) {
  const box = document.getElementById(id);
  const draw = () => box.replaceChildren(...list.map(([v, label]) => { const b = document.createElement('button'); b.className = `btn${state[key] === v ? ' on' : ''}`; b.textContent = label; b.onclick = () => { state[key] = v; draw(); }; return b; }));
  draw();
}
buttons('mode', [[true, 'Pixel (seperti game)'], [false, 'Halus']], 'pixel');
buttons('phase', [[1, 'Fase 1'], [2, 'Fase 2 (mengamuk)']], 'phase');
buttons('view', [['left', 'Kiri'], ['front', 'Depan'], ['right', 'Kanan']], 'view');
buttons('swing', [[false, 'Diam'], [true, 'Menyerang']], 'swing');
buttons('size', [['kecil', 'Kecil'], ['sedang', 'Sedang (game)'], ['besar', 'Besar']], 'size');

const list = document.getElementById('list');
const scenes = BOSS_TYPES.map((type) => {
  const h = document.createElement('h2'); h.textContent = ENEMIES[type].name;
  const c = document.createElement('canvas'); list.append(h, c);
  return { type, c, body: document.createElement('canvas') };
});
function frame(now) {
  const t = now / 1000, k = PIXEL_K[state.size], attack = state.swing ? (t % 0.9) / 0.9 : null;
  for (const sc of scenes) {
    const out = sc.c, Wd = W * SHOW, Hd = H * SHOW, b = sc.body;
    if (out.width !== Wd) { out.width = Wd; out.height = Hd; }
    const bw = Math.round(W * k), bh = Math.round(H * k);
    if (b.width !== bw) { b.width = bw; b.height = bh; }
    const bg = b.getContext('2d', { willReadFrequently: true });
    bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, bw, bh);
    bg.setTransform(k, 0, 0, k, 0, 0);
    bg.save(); bg.translate(HERO_X, GROUND); bg.scale(DOLL, DOLL); drawDoll(bg, 'mage', HERO, { t, anime: true, view: 'side' }); bg.restore();
    bg.save(); bg.translate(BOSS_X, GROUND); bg.scale(DOLL, DOLL); drawBoss(bg, sc.type, t, state.phase, state.view === 'front' ? null : attack, state.view); bg.restore();
    bg.setTransform(1, 0, 0, 1, 0, 0);
    if (state.pixel) { const img = bg.getImageData(0, 0, bw, bh); pixelData(img.data, bw, bh, { ...PIXEL, k }); bg.putImageData(img, 0, 0); }
    const aura = BOSS_AURAS[sc.type], s = k * DOLL * BOSS_K;
    bg.globalCompositeOperation = 'destination-over'; aura(bg, BOSS_X * k, GROUND * k, s, t, state.phase, false);
    bg.globalCompositeOperation = 'source-over'; aura(bg, BOSS_X * k, GROUND * k, s, t, state.phase, true);
    const g = out.getContext('2d'); g.imageSmoothingEnabled = !state.pixel;
    g.fillStyle = '#0b0810'; g.fillRect(0, 0, Wd, Hd);
    g.fillStyle = 'rgba(201,162,74,.25)'; g.fillRect(0, GROUND * SHOW, Wd, 2);
    g.drawImage(b, 0, 0, Wd, Hd);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
