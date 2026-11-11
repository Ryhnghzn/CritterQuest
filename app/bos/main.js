// Boss gallery (app/bos.html, spec §41.2): every dungeon boss before and after the redraw,
// smooth and as pixel art, beside a hero for scale. Not part of the game.
import { MONSTER_ART, artExt } from '../src/art/monsters.js';
import { MONSTER_ART as OLD_ART } from './lama.js';
import { ENEMIES } from '../src/data/enemies.js';
import { drawDoll } from '../src/art/doll.js';
import { pixelData } from '../src/art/pixeldata.js';

const BOSSES = ['boss', 'crystalboss', 'sporeboss', 'tombboss', 'lavaboss'];
const PIXEL = { k: 2, levels: 7, solid: 0.8, ink: [19, 11, 26] }; // data/look.js pixel
const W = 230, H = 190, GROUND = 168, ZOOM = 2; // world units, ground line, CSS px per unit (smooth)
const HERO = { hair: 1, hairColor: 2, gear: { weapon: { tier: 4, rarity: 3 }, armor: { tier: 4, rarity: 3 } } };

function scene(g, type, art, ext) {
  const r = ENEMIES[type].r;
  g.strokeStyle = 'rgba(201,162,74,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, GROUND); g.lineTo(W, GROUND); g.stroke();
  g.save(); g.translate(30, GROUND); g.scale(0.82, 0.82); drawDoll(g, 'mage', HERO, { t: 0 }); g.restore();
  const cx = 140, cy = GROUND - 1.05 * r;
  g.save(); g.translate(cx, cy); g.lineJoin = 'round'; art[type](g, r); g.restore();
  g.save(); g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(cx, cy + r * 0.75, r, r * 0.4, 0, 0, Math.PI * 2); g.stroke(); g.restore();
  return ext;
}

function cell(title, draw, pixel) {
  const fig = document.createElement('figure'), c = document.createElement('canvas'), cap = document.createElement('figcaption');
  const k = pixel ? PIXEL.k : ZOOM;
  c.width = W * k; c.height = H * k;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.scale(k, k);
  draw(g);
  if (pixel) { const img = g.getImageData(0, 0, c.width, c.height); pixelData(img.data, c.width, c.height, PIXEL); g.putImageData(img, 0, 0); }
  cap.textContent = title;
  fig.append(c, cap);
  return fig;
}

const list = document.getElementById('list');
for (const type of BOSSES) {
  const h = document.createElement('h2'); h.textContent = ENEMIES[type].name;
  const row = document.createElement('div'); row.className = 'row';
  row.append(
    cell('Lama · halus', (g) => scene(g, type, OLD_ART, 1.6), false),
    cell('Lama · pixel', (g) => scene(g, type, OLD_ART, 1.6), true),
    cell('Baru · halus', (g) => scene(g, type, MONSTER_ART, artExt(type)), false),
    cell('Baru · pixel', (g) => scene(g, type, MONSTER_ART, artExt(type)), true),
  );
  list.append(h, row);
}

// the shots (spec §41.2, art/pix/fx.js SHOT_ART): every frame of each look, enlarged
import { SHOT_ART } from '../src/art/pix/fx.js';
import { SHOT_LOOKS } from '../src/data/enemies.js';
const shotsHead = document.createElement('h2'); shotsHead.textContent = 'Peluru tiap bos & penembak';
const shotRow = document.createElement('div'); shotRow.className = 'row';
for (const [look, make] of Object.entries(SHOT_ART)) {
  const fr = make(1), fig = document.createElement('figure'), c = document.createElement('canvas'), cap = document.createElement('figcaption');
  const Z = 6, w = Math.max(...fr.map((s) => s.w)), h = Math.max(...fr.map((s) => s.h));
  c.width = (w + 4) * fr.length * Z; c.height = (h + 4) * Z;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  fr.forEach((s, i) => {
    const t = document.createElement('canvas'); t.width = s.w; t.height = s.h;
    t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(s.rgba()), s.w, s.h), 0, 0);
    g.drawImage(t, (i * (w + 4) + 2) * Z, 2 * Z, s.w * Z, s.h * Z);
  });
  cap.textContent = `${look} — ${Object.entries(SHOT_LOOKS).filter(([, l]) => l === look).map(([id]) => ENEMIES[id].name).join(', ')}`;
  fig.append(c, cap); shotRow.append(fig);
}
list.append(shotsHead, shotRow);
