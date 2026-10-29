// Style-D gear icons (plan "Gaya D" §6): the item shapes inside drawGearIcon, matching
// what the heroes wear — angular, hard cel shading, ink lines. Shape by tier (variant
// 0–6), trims / gems / runes in the rarity colour, molten cracks for Mitos. Drawn in a
// 26-unit box centred at the origin (drawGearIcon scales it and adds halo, rays, motes).
import { RARITIES, MYTHIC } from '../../data/items.js';
import { fillPoly, glow, pal, mix, INK, TAU } from './cel.js';
import { LEATHER, GOLD, WOOD, METAL } from './common.js';

const RIM = 'rgba(255,240,220,.55)';
const rimmed = (P) => ({ ...P, rim: RIM });
const BLADE = [pal('#8a8c96'), pal('#90939e'), pal('#9aa0ac'), pal('#a2a8b6'), pal('#4a4456', { hi: '#e8deee' }), pal('#4a4456', { hi: '#e8deee' }), pal('#3a3446', { hi: '#f4e6f4' })];
const gemPal = (c) => pal(c, { hi: '#ffffff', shade: mix(c, '#0b0710', 0.55) });

function gem(g, x, y, s, rar, t) {
  if (rar < 2) return;
  const c = RARITIES[rar].color;
  fillPoly(g, [[x, y - s * 1.3], [x + s, y], [x, y + s * 1.3], [x - s, y]], gemPal(c), s * 0.6, s * 0.3, 0.6);
  if (rar >= 3) glow(g, x, y, s * 3.4, c, 0.5 + (rar >= 4 ? 0.25 * Math.sin(t * 4) : 0));
}
function trim(g, pts, piece) {
  if (piece.rarity < 1) return;
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.lineWidth = 0.8; g.strokeStyle = RARITIES[piece.rarity].color; g.stroke();
}
function molten(g, lines, t) {
  g.save(); g.globalCompositeOperation = 'lighter';
  g.beginPath(); for (const l of lines) l.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.lineWidth = 0.7; g.strokeStyle = `rgba(255,90,70,${0.6 + 0.4 * Math.sin(t * 4)})`; g.stroke();
  g.restore();
}

// weapons (drawn upright; drawGearIcon tilts them)
function sword(g, it, t) {
  const tier = it.variant, w = 2.2 + tier * 0.22, top = -13 + (6 - tier) * 0.5;
  fillPoly(g, [[-w, 3], [-w - 0.3, top + 4], [0, top], [w + 0.3, top + 4], [w, 3]], rimmed(BLADE[tier]), 2.2, 0.6, 1);
  g.beginPath(); g.moveTo(0, top + 3); g.lineTo(0, 2); g.lineWidth = 0.5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
  if (it.rarity >= 2) { g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.moveTo(0, top + 3); g.lineTo(0, 2); g.lineWidth = 0.7; g.strokeStyle = RARITIES[it.rarity].color; g.stroke(); g.restore(); }
  if (it.rarity === MYTHIC) molten(g, [[[0, top + 3], [-0.8, -6], [0.8, -2], [0, 2]]], t);
  const gw = tier >= 4 ? 7.5 : tier >= 2 ? 6 : 4.6;
  const guard = tier >= 4 ? [[-1.6, 3], [-gw, 1], [-gw + 1.2, 4.4], [-1.6, 5], [1.6, 5], [gw - 1.2, 4.4], [gw, 1], [1.6, 3]] : [[-gw, 2.8], [gw, 2.8], [gw, 4.8], [-gw, 4.8]];
  fillPoly(g, guard, tier >= 2 ? GOLD : METAL[1], 1, 0.5, 0.9);
  fillPoly(g, [[-1.2, 4.8], [1.2, 4.8], [1.2, 10], [-1.2, 10]], LEATHER, 0.8, 0.4, 0.8);
  fillPoly(g, [[0, 9.6], [1.8, 11.2], [0, 12.8], [-1.8, 11.2]], tier >= 2 ? GOLD : METAL[1], 0.8, 0.4, 0.8);
  gem(g, 0, 3.9, 1.1, it.rarity, t);
}
function bow(g, it, t) {
  const tier = it.variant, H = 11 + tier * 0.3, P = tier >= 4 ? pal('#4a3a5a', { hi: '#cbb8d8' }) : pal('#9a7044', { shade: '#3a2414', hi: '#e0b880' });
  for (const s of [-1, 1]) fillPoly(g, [[2.4, 0], [1.6, s * H * 0.4], [-1.8, s * H * 0.85], [-0.4, s * H], [1.2, s * (H + 1.8)], [-3.8, s * H * 0.86], [-0.6, s * H * 0.4], [-0.2, 0]], rimmed(P), 1, 0.5, 1);
  if (tier >= 4) for (const s of [-1, 1]) fillPoly(g, [[-1.2, s * H * 0.86], [1.4, s * (H + 3)], [0, s * H * 0.94]], GOLD, 0.8, 0.4, 0.8);
  fillPoly(g, [[-0.8, -2.4], [2.6, -2.4], [2.6, 2.4], [-0.8, 2.4]], LEATHER, 0.8, 0.4, 0.8);
  g.beginPath(); g.moveTo(-1, -H - 1); g.lineTo(-1, H + 1); g.lineWidth = 0.6; g.strokeStyle = it.rarity >= 2 ? RARITIES[it.rarity].color : '#e8e2d0'; g.stroke();
  gem(g, 1, 0, 1, it.rarity, t);
}
function staff(g, it, t) {
  const tier = it.variant, c = it.rarity >= 1 ? RARITIES[it.rarity].color : '#7fd8ff';
  fillPoly(g, [[-1.1, 13], [-1.2, -6], [1.2, -6], [1.1, 13]], tier >= 2 ? pal('#3a2826') : WOOD, 0.8, 0.4, 0.9);
  for (const y of [4, -3]) fillPoly(g, [[-1.6, y], [1.6, y], [1.6, y + 1.6], [-1.6, y + 1.6]], GOLD, 0.6, 0.3, 0.6);
  if (tier >= 2) for (const s of [-1, 1]) fillPoly(g, [[s * 0.8, -6], [s * (tier >= 4 ? 6 : 4.6), -9], [s * 3.4, -14.6], [s * 2.4, -10], [s * 0.4, -7]], GOLD, 1, 0.5, 0.9);
  else fillPoly(g, [[-2.4, -6], [-2.8, -9.6], [0, -11.4], [2.8, -9.4], [2, -6]], rimmed(WOOD), 1, 0.5, 0.9);
  const s = tier <= 1 ? 2 : tier >= 4 ? 3.2 : 2.6, y = -10.4;
  glow(g, 0, y, (6 + tier) * (0.85 + 0.15 * Math.sin(t * 4)), c, 0.8);
  fillPoly(g, [[0, y - s * 1.3], [s, y], [0, y + s * 1.3], [-s, y]], gemPal(c), 1, 0.5, 0.8);
}
function daggers(g, it, t) {
  const tier = it.variant, L = 9 + tier * 0.6, B = rimmed(BLADE[Math.max(2, tier)]);
  for (const s of [-1, 1]) {
    g.save(); g.rotate(s * 0.5); g.translate(s * 1.6, 2);
    fillPoly(g, [[-1.6, 0], [-1.8, -L * 0.6], [tier >= 4 ? s * 1.4 : 0, -L], [1.8, -L * 0.6], [1.6, 0]], B, 1.2, 0.5, 0.9);
    fillPoly(g, [[-3, 0], [3, 0], [3, 1.6], [-3, 1.6]], tier >= 4 ? GOLD : METAL[2], 0.6, 0.3, 0.7);
    fillPoly(g, [[-1, 1.6], [1, 1.6], [1, 6], [-1, 6]], LEATHER, 0.6, 0.3, 0.7);
    if (it.rarity >= 2) { g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.moveTo(-1.6, -L * 0.6); g.lineTo(tier >= 4 ? s * 1.4 : 0, -L); g.lineWidth = 0.6; g.strokeStyle = RARITIES[it.rarity].color; g.stroke(); g.restore(); }
    g.restore();
  }
  gem(g, 0, 3, 1, it.rarity, t);
}

// armour pieces
function helm(g, it, t) {
  const tier = it.variant, M = rimmed(METAL[tier]);
  if (tier <= 1) { // leather cap
    fillPoly(g, [[-8, 3], [-8.4, -3], [-5, -8.4], [1, -9.6], [6.8, -6.4], [8.4, 0], [8.4, 3]], rimmed(LEATHER), 3);
    trim(g, [[-8.2, 1], [8.4, 1]], it);
    return;
  }
  fillPoly(g, [[-8, 8], [-8.6, -2], [-6, -8.4], [0, -10.4], [6, -8.4], [8.6, -2], [8, 8], [0, 9.6]], M, 3.4);
  g.beginPath(); g.moveTo(0, -10.2); g.lineTo(0, 9.4); g.lineWidth = 0.6; g.strokeStyle = INK; g.stroke();
  trim(g, [[-8.4, -2.6], [8.4, -2.6]], it);
  if (tier <= 3) { // open face with a nasal bar
    fillPoly(g, [[-5.6, -1], [5.6, -1], [5, 7.6], [-5, 7.6]], pal('#1a1218'), 0.4, 0.2, 0.8);
    fillPoly(g, [[-1, -2.6], [1, -2.6], [1, 5], [-1, 5]], METAL[tier], 0.6, 0.3, 0.8);
  } else { // visor with glowing eyes
    g.beginPath(); g.rect(-6, -0.6, 12, 1.8); g.rect(-1, -0.6, 2, 6.4); g.fillStyle = '#05030a'; g.fill();
    const eye = it.rarity >= 2 ? RARITIES[it.rarity].color : '#ffcf8a';
    g.fillStyle = eye; g.fillRect(-5.6, -0.2, 4, 0.9); g.fillRect(1.6, -0.2, 4, 0.9);
    glow(g, 0, 0.3, 7, eye, 0.6 + 0.2 * Math.sin(t * 4));
  }
  if (tier >= 6) for (const [x, h, l] of [[-4.4, 6, -0.4], [0, 8, 0], [4.4, 6, 0.4]]) {
    g.save(); g.translate(x, -9); g.rotate(l); fillPoly(g, [[-1.4, 1], [0, -h], [1.4, 1]], GOLD, 0.8, 0.4, 0.8); g.restore();
  }
  gem(g, 0, -6, 1.2, it.rarity, t);
  if (it.rarity === MYTHIC) molten(g, [[[-6, -6], [-4, -4], [-5.4, -1.6]], [[6, 3], [4.6, 5.6]]], t);
}
function armor(g, it, t) {
  const tier = it.variant, M = tier >= 2 ? rimmed(METAL[tier]) : rimmed(pal('#6a4a34'));
  fillPoly(g, [[-8, -9], [8, -9], [6.6, 2], [5.4, 11], [-5.4, 11], [-6.6, 2]], tier >= 2 ? pal('#4a3428') : pal('#5a3e2a'), 2.6);
  fillPoly(g, [[-7, -9.6], [0, -11], [7, -9.6], [7.4, -2], [3.6, 3.6], [-3.6, 3.6], [-7.4, -2]], M, 3.6);
  g.beginPath(); g.moveTo(0, -11); g.lineTo(0, 3.4); g.lineWidth = 0.6; g.strokeStyle = INK; g.stroke();
  trim(g, [[-7.2, -4.6], [0, -2.6], [7.2, -4.6]], it);
  if (tier >= 2) for (const s of [-1, 1]) { // pauldrons, bigger and spiked with the tier
    const k = tier >= 4 ? 1.25 : 1;
    fillPoly(g, [[s * 6.2, -11.4], [s * (6.2 + 5 * k), -10.4], [s * (6.8 + 5.4 * k), -5.4], [s * 6.8, -6.4]].map(([x, y]) => [x, y]), M, 1.6, 0.5, 0.9);
    if (tier >= 6) fillPoly(g, [[s * 8, -11], [s * 10, -16], [s * 10.6, -10.4]], GOLD, 0.6, 0.3, 0.8);
  }
  for (const y of [5.2, 8]) fillPoly(g, [[-5.6, y], [5.6, y], [5.4, y + 2], [-5.4, y + 2]], LEATHER, 0.6, 0.3, 0.8);
  gem(g, 0, -4.6, 1.5, it.rarity, t);
  if (it.rarity === MYTHIC) molten(g, [[[-5, -8], [-3, -6], [-4.4, -3]], [[5, -8], [3.6, -5.4]]], t);
}
function boots(g, it, t) {
  const tier = it.variant, P = tier >= 2 ? rimmed(METAL[tier]) : rimmed(LEATHER);
  fillPoly(g, [[-5, -11], [2.6, -11], [2.4, 3], [8.6, 5.4], [9, 9.6], [-5.4, 9.6]], P, 3);
  fillPoly(g, [[-5.6, 9.2], [9.2, 9.2], [9.2, 11], [-5.6, 11]], pal('#2a2024'), 0.6, 0.3, 0.8);
  if (tier >= 2) fillPoly(g, [[-5.6, -4], [-1.2, -6.4], [3.2, -4], [-1.2, -1.6]], METAL[tier], 1, 0.5, 0.8);
  if (tier >= 4) fillPoly(g, [[1.6, -5.4], [7.4, -7.4], [3, -3]], GOLD, 0.6, 0.3, 0.8);
  trim(g, [[-5.2, -8.6], [2.6, -8.6]], it);
  gem(g, -1.2, -4, 1.1, it.rarity, t);
}
function amulet(g, it, t) {
  const tier = it.variant;
  g.beginPath(); g.moveTo(-7.6, -11); g.quadraticCurveTo(-7, -1, 0, 1.4); g.quadraticCurveTo(7, -1, 7.6, -11);
  g.lineWidth = 1.2; g.strokeStyle = tier >= 2 ? '#c9a24a' : '#8a7a6a'; g.stroke();
  const P = tier >= 2 ? GOLD : METAL[2];
  fillPoly(g, [[0, 0.6], [5.4, 4.4], [4, 10.6], [0, 12.6], [-4, 10.6], [-5.4, 4.4]], rimmed(P), 2);
  const c = it.rarity >= 1 ? RARITIES[it.rarity].color : '#b07a50';
  fillPoly(g, [[0, 3], [2.8, 6.4], [0, 10.2], [-2.8, 6.4]], gemPal(c), 1, 0.5, 0.8);
  if (it.rarity >= 3) glow(g, 0, 6.6, 8, c, 0.6 + 0.2 * Math.sin(t * 3));
  if (tier >= 4) for (const s of [-1, 1]) fillPoly(g, [[s * 4.6, 4], [s * 8, 2], [s * 5.8, 6.6]], P, 0.6, 0.3, 0.7);
}
function ring(g, it, t) {
  const tier = it.variant, P = tier >= 2 ? GOLD : METAL[2], n = 10;
  const out = Array.from({ length: n }, (_, i) => [Math.cos((i / n) * TAU) * 8, 2 + Math.sin((i / n) * TAU) * 7]);
  fillPoly(g, out, rimmed(P), 2.4);
  const hole = Array.from({ length: n }, (_, i) => [Math.cos((i / n) * TAU) * 5.2, 2.6 + Math.sin((i / n) * TAU) * 4.4]);
  g.beginPath(); hole.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = '#0c0912'; g.fill();
  g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke();
  const c = it.rarity >= 1 ? RARITIES[it.rarity].color : '#c9d1e0', s = 2.4 + tier * 0.25;
  fillPoly(g, [[0, -5 - s * 1.3], [s * 1.2, -5], [0, -5 + s], [-s * 1.2, -5]], gemPal(c), 1, 0.5, 0.8);
  if (tier >= 4) for (const sx of [-1, 1]) fillPoly(g, [[sx * 1.6, -4.6], [sx * 4.6, -8.4], [sx * 3.6, -3.6]], P, 0.6, 0.3, 0.7);
  if (it.rarity >= 3) glow(g, 0, -5, 8, c, 0.6 + 0.2 * Math.sin(t * 3));
}

const WEAPON = { warrior: sword, archer: bow, mage: staff, assassin: daggers };
// the item shape for drawGearIcon (26-unit box); weapons are tilted for a nicer read
export function drawGearShape(g, item, t = 0) {
  g.save();
  g.lineJoin = 'miter';
  if (item.slot === 'weapon') {
    g.rotate(item.classId === 'archer' ? 0.5 : item.classId === 'assassin' ? 0 : Math.PI / 4);
    (WEAPON[item.classId] || sword)(g, item, t);
  } else if (item.slot === 'helm') helm(g, item, t);
  else if (item.slot === 'armor') armor(g, item, t);
  else if (item.slot === 'boots') boots(g, item, t);
  else if (item.slot === 'amulet') amulet(g, item, t);
  else ring(g, item, t);
  g.restore();
}
