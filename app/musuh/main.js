// New enemy gallery (app/musuh.html, spec §41.1 A2): each new enemy smooth and as pixel art beside
// a hero, with an older enemy of the same biome for comparison. Not part of the game.
import { MONSTER_ART } from '../src/art/monsters.js';
import { ENEMIES } from '../src/data/enemies.js';
import { drawDoll } from '../src/art/doll.js';
import { pixelData } from '../src/art/pixeldata.js';
import { bushDisguise, mirrorMark } from '../src/render/foes.js';
import { BEAST_ART } from '../src/art/beasts.js';
import { OLD_MONSTER_ART } from '../src/art/monsters.js';
import { ECLIPSE_ART } from '../src/art/eclipse.js';
import { FOE_UNIT } from '../src/art/foes.js';

const NEW = [
  ['marshfrog', 'spitter', 'Hutan — melompat ke lingkaran di bawah pemain'],
  ['bushling', 'healer', 'Hutan — menyamar jadi semak, menerjang saat didekati'],
  ['mistwisp', 'icewisp', 'Padang Es — meninggalkan genangan es yang memperlambat'],
  ['mirrorguard', 'frosttank', 'Padang Es — mengangkat cermin, memantulkan proyektil dari depan'],
  ['hyena', 'scorpion', 'Gurun — datang 4–6, mengepung, melolong lalu menyerbu bersamaan'],
  ['splitbeetle', 'sandslink', 'Gurun — mati pecah jadi 2 kumbang kecil, lalu 2 tungau'],
  ['beetlet', 'sandslink', 'Gurun — anak Kumbang Pembelah'],
  ['mite', 'sandslink', 'Gurun — tungau, pecahan terakhir'],
  ['mortar', 'imp', 'Gunung Api — berdiri jauh, menembak lambung ke posisimu'],
  ['embertotem', 'emberbomber', 'Gunung Api — diam; musuh di sekitarnya lebih cepat & berperisai'],
  ['voidobelisk', 'voidtank', 'Gerhana — totem dengan sinar berputar'],
  ['voidtwin', 'wraith', 'Gerhana — berpasangan, sinar penghubung; bangkit lagi kecuali keduanya mati'],
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

// Proposal (owner to approve before it enters the game): the older enemies redrawn with the anime kit
{
  const h = document.createElement('h2'); h.textContent = 'Musuh lama digambar ulang (kit anime) — sudah di game; ?lama = gambar lama';
  list.append(h);
  const drawNew = (type) => (g, cx, cy, r) => {
    g.save(); g.translate(cx, cy); g.lineJoin = 'round'; g.scale(r / FOE_UNIT, r / FOE_UNIT); BEAST_ART[type](g); g.restore();
    g.save(); g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(cx, cy + r * 0.75, r, r * 0.4, 0, 0, Math.PI * 2); g.stroke(); g.restore();
  };
  const drawOld = (type) => (g, cx, cy, r) => { g.save(); g.translate(cx, cy); g.lineJoin = 'round'; (OLD_MONSTER_ART[type] || ECLIPSE_ART[type])(g, r); g.restore(); };
  for (const type of Object.keys(BEAST_ART)) {
    const sub = document.createElement('h2'); sub.textContent = ENEMIES[type].name; sub.style.fontSize = '14px';
    const row = document.createElement('div'); row.className = 'row';
    row.append(
      cell('Lama', (g) => scene(g, type, drawOld(type)), false),
      cell('Baru · halus', (g) => scene(g, type, drawNew(type)), false),
      cell('Baru · pixel', (g) => scene(g, type, drawNew(type)), true),
    );
    list.append(sub, row);
  }
  const h2 = document.createElement('h2'); h2.textContent = 'Musuh baru §41.1 (sudah di game)';
  list.append(h2);
}
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
