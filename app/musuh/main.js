// New enemy gallery (app/musuh.html, spec §41.1 A2): each new enemy smooth and as pixel art beside
// a hero, with an older enemy of the same biome for comparison. Not part of the game.
import { MONSTER_ART } from '../src/art/monsters.js';
import { ENEMIES } from '../src/data/enemies.js';
import { drawDoll } from '../src/art/doll.js';
import { pixelData } from '../src/art/pixeldata.js';
import { bushDisguise, mirrorMark } from '../src/render/foes.js';

const NEW = [
  ['marshfrog', 'spitter', 'Hutan — melompat ke lingkaran di bawah pemain'],
  ['bushling', 'healer', 'Hutan — menyamar jadi semak, menerjang saat didekati'],
  ['mistwisp', 'icewisp', 'Padang Es — meninggalkan genangan es yang memperlambat'],
  ['mirrorguard', 'frosttank', 'Padang Es — mengangkat cermin, memantulkan proyektil dari depan'],
];
const PIXEL = { k: 2, levels: 7, solid: 0.8, ink: [19, 11, 26] }; // data/look.js pixel
const W = 230, H = 190, GROUND = 168, ZOOM = 2;
const HERO = { hair: 1, hairColor: 2, gear: { weapon: { tier: 4, rarity: 3 }, armor: { tier: 4, rarity: 3 } } };

function scene(g, type, extra) {
  const r = ENEMIES[type].r * 2; // twice the game size so the detail reads
  g.strokeStyle = 'rgba(201,162,74,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, GROUND); g.lineTo(W, GROUND); g.stroke();
  g.save(); g.translate(30, GROUND); g.scale(0.82, 0.82); drawDoll(g, 'mage', HERO, { t: 0 }); g.restore();
  const cx = 145, cy = GROUND - 1.05 * r;
  if (extra) { extra(g, cx, cy, r); return; }
  g.save(); g.translate(cx, cy); g.lineJoin = 'round'; MONSTER_ART[type](g, r); g.restore();
  g.save(); g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(cx, cy + r * 0.75, r, r * 0.4, 0, 0, Math.PI * 2); g.stroke(); g.restore();
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
for (const [type, old, note] of NEW) {
  const h = document.createElement('h2'); h.textContent = `${ENEMIES[type].name} — ${note}`;
  const row = document.createElement('div'); row.className = 'row';
  row.append(
    cell(`Pembanding: ${ENEMIES[old].name} (lama)`, (g) => scene(g, old), false),
    cell('Baru · halus', (g) => scene(g, type), false),
    cell('Baru · pixel', (g) => scene(g, type), true),
  );
  list.append(h, row);
}

// how the hidden bush and the raised mirror look on the ground
const h = document.createElement('h2'); h.textContent = 'Tanda di tanah: semak menyamar & cermin terangkat';
const row = document.createElement('div'); row.className = 'row';
row.append(
  cell('Semak Penyergap menyamar (tak bisa dibidik)', (g) => scene(g, 'bushling', (g2, cx, cy, r) => bushDisguise(g2, { x: cx, y: cy, r }, 0, false)), false),
  cell('Penjaga Cermin: cermin terangkat', (g) => scene(g, 'mirrorguard', (g2, cx, cy, r) => {
    g2.save(); g2.translate(cx, cy); MONSTER_ART.mirrorguard(g2, r); g2.restore();
    mirrorMark(g2, { x: cx, y: cy, r, face: 0, mode: 'hold' }, 0.3);
  }), false),
);
list.append(h, row);
