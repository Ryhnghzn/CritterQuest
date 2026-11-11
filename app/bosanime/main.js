// Anime boss prototype (app/bosanime.html, spec §41.2 arah C). Each scene: the anime Mage for
// scale and a boss, drawn smooth or as pixel art (the game's pixel filter), with pixel auras
// drawn crisp on the pixel grid behind and in front of the body. Not part of the game.
import { drawDoll } from '../src/art/doll.js';
import { pixelData } from '../src/art/pixeldata.js';
import { drawLavaKing, lavaAura } from './lava.js';
import { drawLavaKingV2 } from './villain.js';
import { drawDemon } from './demon.js';
import { drawCrystalGolem, crystalAura } from './crystal.js';

const PIXEL = { k: 2, levels: 7, solid: 0.8, ink: [19, 11, 26] }; // data/look.js pixel
const W = 230, H = 130, GROUND = 120;      // scene in game units
const HERO_X = 28, BOSS_X = 112;
import { HERO_SCALE } from '../src/art/hero/index.js';
import { Z } from '../src/art/anime/kit.js';
const ART = HERO_SCALE * 1.05 / Z * 0.82;   // hand-drawn boss art unit → game units (the same as a hero's art unit)
const SHOW = 6;                             // on-screen canvas px per game unit (the same for every pixel size)
// pixel size: pixel-canvas px per game unit (Sedang = the game's LOOK.pixel.k); fewer = bigger pixels
const PIXEL_K = { kecil: 3, sedang: 2, besar: 1.25 };
const HERO = { hair: 1, hairColor: 2, gear: { weapon: { tier: 4, rarity: 3 }, armor: { tier: 4, rarity: 3 } } };
const state = { pixel: true, phase: 1, size: 'sedang', swing: false, view: 'right' };

function buttons(id, list, key) {
  const box = document.getElementById(id);
  const draw = () => { box.replaceChildren(...list.map(([v, label]) => { const b = document.createElement('button'); b.className = `btn${state[key] === v ? ' on' : ''}`; b.textContent = label; b.onclick = () => { state[key] = v; draw(); }; return b; })); };
  draw();
}
buttons('mode', [[true, 'Pixel (seperti game)'], [false, 'Halus']], 'pixel');
buttons('phase', [[1, 'Fase 1'], [2, 'Fase 2 (mengamuk)']], 'phase');
buttons('view', [['left', 'Kiri'], ['front', 'Depan'], ['right', 'Kanan']], 'view');
buttons('swing', [[false, 'Diam'], [true, 'Menyerang']], 'swing');
buttons('size', [['kecil', 'Kecil'], ['sedang', 'Sedang (game)'], ['besar', 'Besar']], 'size');

const small = () => document.createElement('canvas');
const fit = (c, k) => { const w = Math.round(W * k), h = Math.round(H * k); if (c.width !== w) { c.width = w; c.height = h; } };
const scenes = [
  { c: document.getElementById('lava3'), art: 1, draw: (g, t, p) => drawDemon(g, t, p, state.swing ? (t % 1.6) / 1.6 : null, state.view), aura: (g, x, y, s, t, p, front) => front && lavaAura(g, x, y, s, t, p) },
  { c: document.getElementById('lava2'), art: 1, draw: (g, t, p) => drawLavaKingV2(g, t, p, state.swing ? (t % 1.6) / 1.6 : null, state.view), aura: (g, x, y, s, t, p, front) => front && lavaAura(g, x, y, s, t, p) },
  { c: document.getElementById('lava'), draw: drawLavaKing, aura: (g, x, y, s, t, p, front) => front && lavaAura(g, x, y, s, t, p) },
  { c: document.getElementById('crystal'), draw: drawCrystalGolem, aura: crystalAura },
].map((s) => ({ ...s, body: small(), back: small(), front: small() }));

// the figures in game units: hero at HERO_X, boss at BOSS_X, feet on the ground line
function figures(g, sc, t) {
  g.save(); g.translate(HERO_X, GROUND); g.scale(0.82, 0.82); drawDoll(g, 'mage', HERO, { t, anime: true, view: 'side' }); g.restore();
  const a = sc.art ? 0.82 : ART; // v2 is drawn in the heroes' own units (scaled up inside)
  g.save(); g.translate(BOSS_X, GROUND); g.scale(a, a); g.lineJoin = 'round'; sc.draw(g, t, state.phase); g.restore();
  g.fillStyle = 'rgba(201,162,74,.25)'; g.fillRect(0, GROUND, W, 0.5);
}

function frame(now) {
  const t = now / 1000, k = PIXEL_K[state.size];
  for (const sc of scenes) {
    for (const c of [sc.body, sc.back, sc.front]) fit(c, k);
    const out = sc.c, Wd = W * SHOW, Hd = H * SHOW;
    if (out.width !== Wd) { out.width = Wd; out.height = Hd; }
    const g = out.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    g.fillStyle = '#0b0810'; g.fillRect(0, 0, Wd, Hd);
    // auras on the pixel grid (behind and in front)
    for (const [layer, front] of [[sc.back, false], [sc.front, true]]) {
      const a = layer.getContext('2d'); a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, layer.width, layer.height);
      sc.aura(a, BOSS_X * k, GROUND * k, ART * k, t, state.phase, front);
    }
    g.drawImage(sc.back, 0, 0, Wd, Hd);
    if (state.pixel) {
      const b = sc.body, bg = b.getContext('2d', { willReadFrequently: true });
      bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, b.width, b.height); bg.scale(k, k);
      figures(bg, sc, t);
      const img = bg.getImageData(0, 0, b.width, b.height); pixelData(img.data, b.width, b.height, { ...PIXEL, k }); bg.putImageData(img, 0, 0);
      g.drawImage(b, 0, 0, Wd, Hd);
    } else {
      g.save(); g.scale(SHOW, SHOW); figures(g, sc, t); g.restore();
    }
    g.drawImage(sc.front, 0, 0, Wd, Hd);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
