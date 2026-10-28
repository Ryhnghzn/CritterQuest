// Gear art (spec §8, langkah 8A): one shape per look variant (tier 0–6) for
// every slot — 4 × 7 class weapons, 7 helms, 7 armours, 7 boots, 7 amulets,
// 7 rings. The same drawings dress the paper doll and make the bag icons.
// Weapons are drawn with the grip at the origin pointing up (−y).
// Rarity (plan "Efek Lebay" §E): Bagus+ adds engraving, Langka+ a gem, Epik+ a
// glowing rune, Legendaris+ glow and sparkles; Mitos swaps in its own shape per slot.
import { RARITIES, MYTHIC } from '../data/items.js';
import { ICON_FX } from '../data/itemfx.js';
import { glow } from '../render/fxkit.js';

const TAU = Math.PI * 2;
export const INK = '#16121c';           // thin dark outline of the new style

// tier materials: wood/leather, iron, steel, knight, rune, obsidian, dragon
const MAT = [
  { a: '#a2774f', b: '#5e3f27', trim: '#6e4a2c' },
  { a: '#b8bec9', b: '#5f6674', trim: '#7a5236' },
  { a: '#dfe4ec', b: '#7f8898', trim: '#4a4f5c' },
  { a: '#e8ebf2', b: '#8e96a8', trim: '#c9a24a' },
  { a: '#a9dcf5', b: '#3d6f9e', trim: '#7fe0ff', glow: '#7fe0ff' },
  { a: '#4a4060', b: '#1b1626', trim: '#b06bff', glow: '#b06bff' },
  { a: '#e0663a', b: '#6e1c12', trim: '#ffcf5a', glow: '#ff8a3c' },
];
export const material = (tier) => MAT[Math.max(0, Math.min(6, tier))];

function lin(g, x0, y0, x1, y1, c0, c1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  return gr;
}
function ink(g, fill, lw = 0.9) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
// glowing line (runes, edges): a soft wide stroke under a thin bright one (no shadowBlur — slow on phones)
function glowLine(g, color, w = 0.8, blur = 3, alpha = 1) {
  g.save();
  g.lineCap = 'round';
  g.globalAlpha *= alpha * 0.3; g.lineWidth = w + blur * 0.7; g.strokeStyle = color; g.stroke();
  g.globalAlpha /= 0.3; g.lineWidth = w; g.stroke();
  g.restore();
}
// additive glow sprite (render/fxkit.js); skipped where there is no DOM (tests)
const CAN_GLOW = typeof document !== 'undefined';
export function halo(g, x, y, r, color, alpha = 1) {
  if (!CAN_GLOW || alpha <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= alpha;
  glow(g, x, y, r, color);
  g.restore();
}

// ——— weapons ———
const SWORDS = [
  // 0 Pedang Kayu: blunt wooden blade with a cord grip
  (g, m) => { g.beginPath(); g.moveTo(-1.6, -2); g.lineTo(-1.8, -14); g.quadraticCurveTo(0, -17, 1.8, -14); g.lineTo(1.6, -2); g.closePath(); ink(g, lin(g, -2, 0, 2, 0, m.a, m.b)); },
  // 1 Pedang Besi: short straight blade
  (g, m) => { blade(g, m, 1.5, 16, 0.6); guard(g, m, 4); },
  // 2 Pedang Baja: long blade, fuller groove
  (g, m) => { blade(g, m, 1.7, 20, 0.5); g.beginPath(); g.moveTo(0, -3); g.lineTo(0, -16); g.lineWidth = 0.5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke(); guard(g, m, 5); },
  // 3 Pedang Ksatria: broad blade, gold winged guard
  (g, m) => { blade(g, m, 2.3, 21, 0.4); g.beginPath(); g.moveTo(-6, -1.5); g.quadraticCurveTo(-3, -4, 0, -2.6); g.quadraticCurveTo(3, -4, 6, -1.5); g.lineTo(0, -0.4); g.closePath(); ink(g, m.trim); },
  // 4 Pedang Runa: glowing runes along the blade
  (g, m) => { blade(g, m, 2, 21, 0.5); for (let y = -5; y > -18; y -= 4) { g.beginPath(); g.moveTo(-0.7, y); g.lineTo(0.7, y - 1.2); g.lineTo(-0.5, y - 2.2); glowLine(g, m.glow); } guard(g, m, 5); },
  // 5 Pedang Obsidian: jagged black blade with violet edge
  (g, m) => {
    g.beginPath(); g.moveTo(-1.8, -2);
    for (let i = 1; i <= 5; i++) g.lineTo(i % 2 ? -2.8 : -1.6, -2 - i * 3.6);
    g.lineTo(0, -23);
    for (let i = 5; i >= 1; i--) g.lineTo(i % 2 ? 2.8 : 1.6, -2 - i * 3.6);
    g.lineTo(1.8, -2); g.closePath(); ink(g, lin(g, -3, 0, 3, 0, m.a, m.b));
    g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -20); glowLine(g, m.glow, 0.6);
    guard(g, m, 5.5, true);
  },
  // 6 Pedang Naga: curved flame blade with a dragon-claw guard
  (g, m) => {
    g.beginPath(); g.moveTo(-1.8, -2); g.quadraticCurveTo(-3.5, -12, 1, -24); g.quadraticCurveTo(2.5, -14, 2.2, -2); g.closePath();
    ink(g, lin(g, -3, -24, 3, 0, m.trim, m.a));
    g.beginPath(); g.moveTo(-0.4, -5); g.quadraticCurveTo(-1.6, -13, 0.8, -20); glowLine(g, m.glow, 0.7);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -1.5); g.quadraticCurveTo(s * 5, -2, s * 6, -5); g.quadraticCurveTo(s * 4, -3, s * 1, -0.5); ink(g, m.b); }
  },
];
function blade(g, m, w, len, tipK) {
  g.beginPath(); g.moveTo(-w, -2); g.lineTo(-w, -len * (1 - tipK * 0.2)); g.lineTo(0, -len); g.lineTo(w, -len * (1 - tipK * 0.2)); g.lineTo(w, -2); g.closePath();
  ink(g, lin(g, -w, 0, w, 0, m.a, m.b));
  g.beginPath(); g.moveTo(-w * 0.3, -3); g.lineTo(-w * 0.3, -len * 0.85); g.lineWidth = 0.5; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
}
function guard(g, m, w, spiky = false) {
  g.beginPath();
  if (spiky) { g.moveTo(-w, -3); g.lineTo(-w + 1.5, -1.4); g.lineTo(w - 1.5, -1.4); g.lineTo(w, -3); g.lineTo(0, -1); }
  else g.roundRect(-w, -2.6, w * 2, 1.8, 0.8);
  ink(g, m.trim);
}
function grip(g, m, len = 4.5) {
  g.beginPath(); g.roundRect(-1, -1, 2, len, 0.8); ink(g, '#3a2a22');
  g.beginPath(); g.arc(0, len, 1.3, 0, TAU); ink(g, m.trim);
}

const BOWS = [
  // limbs drawn as a path from bottom to top; string straight
  { limb: (g) => { g.moveTo(0, 13); g.quadraticCurveTo(6, 0, 0, -13); } },
  { limb: (g) => { g.moveTo(0, 14); g.quadraticCurveTo(7, 7, 4, 0); g.quadraticCurveTo(7, -7, 0, -14); } },
  { limb: (g) => { g.moveTo(-1, 15); g.quadraticCurveTo(4, 12, 5, 6); g.lineTo(5, -6); g.quadraticCurveTo(4, -12, -1, -15); }, grips: true },
  { limb: (g) => { g.moveTo(-2, 15); g.quadraticCurveTo(8, 12, 5, 2); g.quadraticCurveTo(8, -12, -2, -15); }, wings: true },
  { limb: (g) => { g.moveTo(0, 15); g.quadraticCurveTo(8, 0, 0, -15); }, rune: true },
  { limb: (g) => { g.moveTo(-1, 16); g.lineTo(5, 9); g.lineTo(4, 3); g.lineTo(6, 0); g.lineTo(4, -3); g.lineTo(5, -9); g.lineTo(-1, -16); }, spikes: true },
  { limb: (g) => { g.moveTo(-2, 16); g.quadraticCurveTo(9, 8, 6, 0); g.quadraticCurveTo(9, -8, -2, -16); }, flame: true },
];
function drawBow(g, tier, m, t) {
  const b = BOWS[tier];
  g.beginPath(); b.limb(g);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = 3.2; g.strokeStyle = INK; g.stroke();
  g.lineWidth = 2; g.strokeStyle = tier === 0 ? m.a : lin(g, 0, -16, 0, 16, m.a, m.b); g.stroke();
  const top = tier >= 2 ? 15 : 13.5;
  g.beginPath(); g.moveTo(-1, -top); g.lineTo(-1, top); g.lineWidth = 0.5; g.strokeStyle = b.rune ? m.glow : '#e8e2d0'; g.stroke();
  if (b.rune) { g.beginPath(); g.moveTo(-1, -top); g.lineTo(-1, top); glowLine(g, m.glow, 0.6, 4); }
  g.beginPath(); g.roundRect(3, -2.5, 3, 5, 1); ink(g, '#3a2a22');
  if (b.grips) for (const y of [-9, 9]) { g.beginPath(); g.roundRect(3.5, y - 1, 2.6, 2, 0.6); ink(g, m.trim); }
  if (b.wings) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(5, s * 6); g.quadraticCurveTo(10, s * 9, 8, s * 14); g.quadraticCurveTo(7, s * 10, 4, s * 9); ink(g, '#e8e2d0'); }
  if (b.spikes) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(5, s * 9); g.lineTo(9, s * 11); g.lineTo(4.5, s * 7); ink(g, m.trim); }
  if (b.flame) for (const s of [-1, 1]) {
    const k = 1 + Math.sin(t * 9 + s) * 0.15;
    g.beginPath(); g.moveTo(4, s * 4); g.quadraticCurveTo(12 * k, s * 8, 6, s * 16); g.quadraticCurveTo(8, s * 9, 4, s * 7); ink(g, m.glow);
  }
}

const STAVES = [
  (g, m) => { gnarl(g, '#6e4a2c', 24); g.beginPath(); g.arc(1, -24, 2.2, 0, TAU); ink(g, '#8a5a36'); },
  (g, m) => { shaft(g, '#6e4a2c', 23); crystal(g, 0, -24, 3, 7, '#bfe6ff', '#4f8fd0'); },
  (g, m) => { shaft(g, '#3a2a40', 23); g.beginPath(); g.arc(0, -25, 5, Math.PI * 0.6, Math.PI * 2.4); g.arc(1.6, -26, 3.8, Math.PI * 2.3, Math.PI * 0.7, true); ink(g, '#e8ecff'); },
  (g, m) => { shaft(g, '#4a3a5a', 24); star(g, 0, -26, 5.5, 2.4, '#ffe27a'); },
  (g, m, t) => { shaft(g, '#2f3a5a', 24); g.beginPath(); g.arc(0, -26, 3, 0, TAU); ink(g, '#c9f0ff'); for (const r of [5, 6.8]) { g.beginPath(); g.ellipse(0, -26, r, r * 0.4, t * 1.5 + r, 0, TAU); glowLine(g, m.glow, 0.6, 4); } },
  (g, m, t) => { shaft(g, '#1b1626', 24); g.beginPath(); g.arc(0, -26, 3.8, 0, TAU); ink(g, '#120b1c'); g.beginPath(); g.arc(0, -26, 3.8, 0, TAU); glowLine(g, m.glow, 0.8, 6); for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; g.beginPath(); g.arc(Math.cos(a) * 6, -26 + Math.sin(a) * 3, 0.9, 0, TAU); g.fillStyle = m.glow; g.fill(); } },
  (g, m, t) => { shaft(g, '#6e1c12', 24); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + t * 0.6; g.beginPath(); g.moveTo(Math.cos(a) * 4, -26 + Math.sin(a) * 4); g.lineTo(Math.cos(a) * 7, -26 + Math.sin(a) * 7); g.lineWidth = 1; g.strokeStyle = '#ffcf5a'; g.stroke(); } g.beginPath(); g.arc(0, -26, 4, 0, TAU); ink(g, '#ffd36b'); },
];
function shaft(g, col, len) { g.beginPath(); g.roundRect(-1, -len + 2, 2, len + 6, 1); ink(g, col); }
function gnarl(g, col, len) { g.beginPath(); g.moveTo(-1, 8); g.quadraticCurveTo(-2.4, -len / 2, 0.5, -len); g.lineTo(1.6, -len + 1); g.quadraticCurveTo(-0.6, -len / 2, 1, 8); g.closePath(); ink(g, col); }
function crystal(g, x, y, w, h, c0, c1) { g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + w, y - h * 0.3); g.lineTo(x, y + h * 0.4); g.lineTo(x - w, y - h * 0.3); g.closePath(); ink(g, lin(g, x - w, y - h, x + w, y, c0, c1)); }
function star(g, x, y, r1, r2, col) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? r2 : r1; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); ink(g, col); }

const DAGGERS = [
  (g, m) => { g.beginPath(); g.moveTo(-1.4, -1.5); g.lineTo(-1.6, -7); g.lineTo(-0.6, -8); g.lineTo(-1.2, -9.5); g.lineTo(0.4, -11); g.lineTo(1.5, -1.5); g.closePath(); ink(g, lin(g, -2, 0, 2, 0, '#9a7f6a', '#5e4636')); },
  (g, m) => { g.beginPath(); g.moveTo(-1.4, -1.5); g.lineTo(0, -12); g.lineTo(1.4, -1.5); g.closePath(); ink(g, lin(g, -2, 0, 2, 0, m.a, m.b)); },
  (g, m) => { g.beginPath(); g.moveTo(-1.5, -1.5); g.quadraticCurveTo(-2, -8, 0, -12.5); g.quadraticCurveTo(1.8, -7, 1.5, -1.5); g.closePath(); ink(g, lin(g, -2, 0, 2, 0, '#a8e07a', '#3f7a2f')); g.beginPath(); g.arc(0.5, -6, 0.9, 0, TAU); g.fillStyle = '#c6ff6a'; g.fill(); },
  (g, m) => { g.beginPath(); g.moveTo(-0.7, -1.5); g.lineTo(0, -15); g.lineTo(0.7, -1.5); g.closePath(); ink(g, m.a); },
  (g, m) => { g.beginPath(); g.moveTo(-1.5, -1.5); g.lineTo(0, -13); g.lineTo(1.5, -1.5); g.closePath(); ink(g, lin(g, -2, 0, 2, 0, m.a, m.b)); g.beginPath(); g.moveTo(0, -3); g.lineTo(0, -10); glowLine(g, m.glow, 0.6); },
  (g, m) => { g.beginPath(); g.moveTo(-1.4, -1.5); g.quadraticCurveTo(-4, -8, 1.5, -13); g.quadraticCurveTo(-1, -8, 1.4, -1.5); g.closePath(); ink(g, lin(g, -2, 0, 2, 0, m.a, m.b)); g.beginPath(); g.moveTo(-1.6, -3); g.quadraticCurveTo(-3.4, -8, 1, -11.5); glowLine(g, m.glow, 0.5); },
  (g, m) => { g.beginPath(); g.moveTo(-1.6, -1.5); g.quadraticCurveTo(-2.5, -9, 2, -14); g.quadraticCurveTo(0.6, -8, 1.6, -1.5); g.closePath(); ink(g, lin(g, -2, -14, 2, 0, '#fff4dc', '#d8c8a0')); g.beginPath(); g.moveTo(-1.6, -3); g.quadraticCurveTo(-2.3, -9, 1.8, -13); glowLine(g, m.glow, 0.5); },
];

// weapon for a class at a tier, grip at origin, pointing up (Mitos: its own shape)
export function drawWeapon(g, classId, tier, t = 0, rarity = 0) {
  const m = material(tier);
  g.lineJoin = 'round';
  if (rarity === MYTHIC) { MYTH_WEAPON[classId] ? MYTH_WEAPON[classId](g, t) : MYTH_WEAPON.warrior(g, t); return; }
  if (classId === 'warrior') { grip(g, m); SWORDS[tier](g, m, t); }
  else if (classId === 'archer') drawBow(g, tier, m, t);
  else if (classId === 'mage') STAVES[tier](g, m, t);
  else { grip(g, m, 3.5); g.beginPath(); g.roundRect(-3, -2, 6, 1.4, 0.6); ink(g, m.trim); DAGGERS[tier](g, m, t); }
}

// ——— helmets: drawn over a head (hx, hy, r) facing right ———
function domePath(g, hx, hy, r, top = 1.12, low = 0.15) {
  g.beginPath(); g.moveTo(hx - r * 1.08, hy + r * low);
  g.quadraticCurveTo(hx - r * 1.15, hy - r * top * 1.15, hx + r * 0.1, hy - r * top * 1.1);
  g.quadraticCurveTo(hx + r * 1.15, hy - r * top, hx + r * 1.05, hy + r * low);
  g.closePath();
}
export function drawHelm(g, tier, hx, hy, r, t = 0, rarity = 0) {
  if (rarity === MYTHIC) { mythHelm(g, hx, hy, r, t); return; }
  const m = material(tier);
  const dome = (top, low) => domePath(g, hx, hy, r, top, low);
  switch (tier) {
    case 0: // leather cap with a flap
      dome(1, 0); ink(g, lin(g, 0, hy - r, 0, hy, m.a, m.b));
      g.beginPath(); g.moveTo(hx - r * 1.05, hy); g.lineTo(hx - r * 1.1, hy + r * 0.7); g.lineTo(hx - r * 0.6, hy + r * 0.2); ink(g, m.b);
      break;
    case 1: // kettle helm with wide brim
      dome(1.05, -0.1); ink(g, lin(g, 0, hy - r, 0, hy, m.a, m.b));
      g.beginPath(); g.ellipse(hx, hy - r * 0.05, r * 1.45, r * 0.28, 0, 0, TAU); ink(g, m.b);
      break;
    case 2: // horned
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(hx + s * r * 0.55, hy - r * 0.8); g.quadraticCurveTo(hx + s * r * 1.5, hy - r * 1.1, hx + s * r * 1.35, hy - r * 2); g.quadraticCurveTo(hx + s * r * 1.1, hy - r * 1.3, hx + s * r * 0.2, hy - r * 0.95); g.closePath(); ink(g, '#e8dfc8'); }
      dome(); ink(g, lin(g, 0, hy - r, 0, hy, m.a, m.b));
      g.beginPath(); g.rect(hx - r * 1.08, hy - r * 0.15, r * 2.15, r * 0.32); ink(g, m.trim);
      break;
    case 3: // knight's great helm with visor slit and red plume
      g.beginPath(); g.ellipse(hx - r * 0.4, hy - r * 1.5, r * 0.5, r * 0.95, -0.6, 0, TAU); ink(g, '#a8263a');
      g.beginPath(); g.roundRect(hx - r * 1.1, hy - r * 1.15, r * 2.25, r * 1.95, [r * 0.9, r * 0.9, r * 0.3, r * 0.3]); ink(g, lin(g, 0, hy - r, 0, hy + r, m.a, m.b));
      g.beginPath(); g.rect(hx - r * 0.1, hy - r * 0.15, r * 1.15, r * 0.22); g.fillStyle = INK; g.fill();
      g.beginPath(); g.moveTo(hx + r * 0.45, hy - r * 1.1); g.lineTo(hx + r * 0.45, hy + r * 0.75); g.lineWidth = 0.8; g.strokeStyle = m.trim; g.stroke();
      break;
    case 4: // rune circlet: silver band, glowing gem, hair stays visible
      g.beginPath(); g.ellipse(hx, hy - r * 0.55, r * 1.12, r * 0.42, 0, Math.PI * 0.95, Math.PI * 2.05); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = m.a; g.stroke();
      g.beginPath(); g.moveTo(hx + r * 0.75, hy - r * 1.25); g.lineTo(hx + r * 1.05, hy - r * 0.8); g.lineTo(hx + r * 0.75, hy - r * 0.45); g.lineTo(hx + r * 0.45, hy - r * 0.8); g.closePath(); ink(g, m.glow);
      halo(g, hx + r * 0.75, hy - r * 0.85, r * 0.7, m.glow, 0.8);
      break;
    case 5: // obsidian spiked helm, glowing eye slit
      dome(1.15, 0.35); ink(g, lin(g, 0, hy - r, 0, hy + r, m.a, m.b));
      for (const dx of [-0.6, -0.1, 0.45]) { g.beginPath(); g.moveTo(hx + r * (dx - 0.18), hy - r * 0.95); g.lineTo(hx + r * dx, hy - r * 1.8); g.lineTo(hx + r * (dx + 0.18), hy - r * 0.95); g.closePath(); ink(g, m.b); }
      g.beginPath(); g.moveTo(hx + r * 0.1, hy - r * 0.05); g.lineTo(hx + r * 1.1, hy - r * 0.15); glowLine(g, m.glow, 1.1, 5);
      break;
    default: // dragon helm: crest and swept horns
      for (const s of [0.9, 0.6]) { g.beginPath(); g.moveTo(hx - r * 0.2, hy - r * 0.9); g.quadraticCurveTo(hx - r * 1.4 * s, hy - r * 1.3, hx - r * 2 * s, hy - r * 0.6); g.quadraticCurveTo(hx - r * 1.2, hy - r * 0.9, hx - r * 0.6, hy - r * 0.4); g.closePath(); ink(g, m.trim); }
      dome(1.1, 0.3); ink(g, lin(g, 0, hy - r, 0, hy + r, m.a, m.b));
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(hx + r * (-0.6 + i * 0.4), hy - r * 1.05); g.lineTo(hx + r * (-0.45 + i * 0.4), hy - r * 1.45); g.lineTo(hx + r * (-0.3 + i * 0.4), hy - r * 1.05); ink(g, m.trim); }
      g.beginPath(); g.moveTo(hx + r * 0.2, hy); g.lineTo(hx + r * 1.05, hy - r * 0.1); glowLine(g, m.glow, 0.9, 4);
  }
}
// circlets leave the hair visible
export const helmHidesHair = (tier, rarity = 0) => rarity === MYTHIC || tier !== 4;

// ——— armour: over a torso box (top y0 … bottom y1, half width w) ———
export function drawArmor(g, tier, y0, y1, w, t = 0, rarity = 0) {
  if (rarity === MYTHIC) { mythArmor(g, y0, y1, w, t); return; }
  const m = material(tier);
  const plate = (top, bot, hw) => { g.beginPath(); g.moveTo(-hw, top + 1); g.quadraticCurveTo(0, top - 1, hw, top + 1); g.lineTo(hw * 0.85, bot); g.lineTo(-hw * 0.85, bot); g.closePath(); };
  switch (tier) {
    case 0: // cloth vest with lacing
      plate(y0, y1, w * 0.95); ink(g, lin(g, 0, y0, 0, y1, '#7a6a55', '#4e4234'));
      g.beginPath(); for (let y = y0 + 2; y < y1 - 1; y += 2.2) { g.moveTo(-0.8, y); g.lineTo(0.8, y + 1.1); } g.lineWidth = 0.5; g.strokeStyle = '#d8c8a0'; g.stroke();
      break;
    case 1: // leather with a cross strap
      plate(y0, y1, w); ink(g, lin(g, 0, y0, 0, y1, m.a, m.b));
      g.beginPath(); g.moveTo(-w * 0.9, y0 + 1); g.lineTo(w * 0.8, y1 - 1); g.lineWidth = 1.4; g.strokeStyle = '#3a2a22'; g.stroke();
      break;
    case 2: // chainmail
      plate(y0, y1, w); ink(g, lin(g, 0, y0, 0, y1, m.a, m.b));
      g.save(); g.clip(); g.strokeStyle = 'rgba(30,30,40,.45)'; g.lineWidth = 0.4;
      for (let y = y0; y < y1; y += 1.4) for (let x = -w; x < w; x += 1.6) { g.beginPath(); g.arc(x + ((y / 1.4) % 2) * 0.8, y, 0.7, 0, Math.PI); g.stroke(); }
      g.restore();
      break;
    default: { // plate (3), rune plate (4), obsidian (5), dragon scale (6)
      plate(y0, y1, w); ink(g, lin(g, -w, y0, w, y1, m.a, m.b));
      if (tier === 6) { // scales
        g.save(); g.clip();
        for (let y = y0 + 1; y < y1; y += 2.2) for (let x = -w; x < w; x += 2.4) { g.beginPath(); g.arc(x + ((y / 2.2) % 2) * 1.2, y, 1.3, 0, Math.PI); g.lineWidth = 0.5; g.strokeStyle = m.b; g.stroke(); }
        g.restore();
      } else {
        g.beginPath(); g.moveTo(0, y0 + 1); g.lineTo(0, y1); g.lineWidth = 0.5; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
        g.beginPath(); g.moveTo(-w * 0.8, (y0 + y1) / 2); g.lineTo(w * 0.8, (y0 + y1) / 2); g.stroke();
      }
      if (tier === 4) { g.beginPath(); g.arc(0, (y0 + y1) / 2 - 1, 1.6, 0, TAU); glowLine(g, m.glow, 0.7, 5); g.beginPath(); g.moveTo(-w * 0.5, y0 + 3); g.lineTo(-w * 0.2, y0 + 5); g.moveTo(w * 0.5, y0 + 3); g.lineTo(w * 0.2, y0 + 5); glowLine(g, m.glow, 0.5); }
      if (tier === 5) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * w * 0.6, y0 + 4); g.lineTo(s * w * 1.25, y0 - 1); g.lineTo(s * w * 0.9, y0 + 6); ink(g, m.b); }
      // pauldrons
      for (const s of [-1, 1]) {
        g.beginPath(); g.ellipse(s * w * 0.95, y0 + 1.5, w * 0.48, 2.6, s * 0.3, Math.PI, TAU); g.closePath();
        ink(g, tier === 3 ? lin(g, 0, y0 - 2, 0, y0 + 3, m.a, m.trim) : lin(g, 0, y0 - 2, 0, y0 + 3, m.a, m.b));
      }
      if (tier === 3) { g.beginPath(); g.moveTo(-w * 0.85, y1 - 1.2); g.lineTo(w * 0.85, y1 - 1.2); g.lineWidth = 0.9; g.strokeStyle = m.trim; g.stroke(); }
    }
  }
}

// ——— boots: one foot standing at (x, y), toe to the right ———
export function drawBoot(g, tier, x, y, t = 0, rarity = 0) {
  if (rarity === MYTHIC) { mythBoot(g, x, y, t); return; }
  const m = material(tier);
  const shaftH = [2.5, 4, 4.5, 6, 5, 5.5, 6][tier];
  g.beginPath(); g.moveTo(x - 2.2, y - shaftH); g.lineTo(x + 1.4, y - shaftH); g.lineTo(x + 1.6, y - 1.6);
  g.quadraticCurveTo(x + 4.4, y - 1.6, x + 4.4, y); g.lineTo(x - 2.4, y); g.closePath();
  ink(g, tier === 0 ? '#c8a878' : lin(g, 0, y - shaftH, 0, y, m.a, m.b));
  if (tier >= 3) { g.beginPath(); g.rect(x - 2.6, y - shaftH - 0.6, 4.4, 1.4); ink(g, m.trim, 0.6); }
  if (tier === 4) { g.beginPath(); g.moveTo(x - 1.4, y - 3); g.lineTo(x + 0.8, y - 3.6); glowLine(g, m.glow, 0.5); }
  if (tier === 5) { g.beginPath(); g.moveTo(x - 2.2, y - shaftH + 1); g.lineTo(x - 4, y - shaftH - 1); g.lineTo(x - 2.2, y - shaftH + 3); ink(g, m.b, 0.6); }
  if (tier === 6) { g.beginPath(); g.moveTo(x - 2.2, y - shaftH + 0.5); g.quadraticCurveTo(x - 6, y - shaftH - 2, x - 5, y - shaftH + 3); g.lineTo(x - 2.2, y - shaftH + 2.5); ink(g, '#e8f4ff', 0.6); }
}

// ——— amulets & rings (icons only) ———
const GEM = ['#b07a50', '#c9d1e0', '#ff6b8b', '#ffd36b', '#7fe0ff', '#b06bff', '#ff4d5e'];
function drawAmulet(g, tier, t) {
  const m = material(tier);
  g.beginPath(); g.arc(0, -6, 7, Math.PI * 0.12, Math.PI * 0.88, true); g.lineWidth = 1; g.strokeStyle = tier === 0 ? '#7a6a55' : m.trim; g.stroke();
  const shapes = [
    () => { g.beginPath(); g.moveTo(-1.5, -1); g.lineTo(1.5, -1); g.lineTo(0.6, 5); g.lineTo(-0.6, 5); g.closePath(); ink(g, '#e8dfc8'); }, // bone
    () => { g.beginPath(); g.arc(0, 2, 3.2, 0, TAU); ink(g, lin(g, 0, -1, 0, 5, '#eef1f8', '#8e96a8')); },
    () => { g.beginPath(); g.moveTo(-1.5, -1); g.quadraticCurveTo(-2, 4, 1, 7); g.quadraticCurveTo(0.5, 3, 1.5, -1); g.closePath(); ink(g, '#f1e9d8'); }, // fang
    () => { g.beginPath(); g.ellipse(0, 2.5, 3, 3.8, 0, 0, TAU); ink(g, '#ffd36b'); g.beginPath(); g.ellipse(0, 2.5, 0.8, 3, 0, 0, TAU); g.fillStyle = INK; g.fill(); }, // cat eye
    () => { star(g, 0, 2.5, 4, 1.8, m.a); g.beginPath(); g.arc(0, 2.5, 1.2, 0, TAU); g.fillStyle = m.glow; g.fill(); },
    () => { g.beginPath(); g.arc(0, 2.5, 3.6, 0, TAU); ink(g, '#2a0a12'); g.beginPath(); g.arc(-0.8, 1.6, 3, -0.6, 2.2); g.lineWidth = 1.2; g.strokeStyle = '#ff2a4a'; g.stroke(); }, // blood moon
    () => { star(g, 0, 2.5, 4.4, 2, '#fff1b0'); halo(g, 0, 2.5, 5, '#ffd36b', 0.8); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 2.5, 1.3, 0, TAU); g.fill(); },
  ];
  shapes[tier]();
}
function drawRing(g, tier) {
  const m = material(tier);
  const band = [['#c08050', '#7a4a2a'], ['#e0e4ec', '#8e96a8'], ['#ffe27a', '#c9902a'], ['#e0e4ec', '#8e96a8'], ['#a9dcf5', '#3d6f9e'], ['#4a4060', '#1b1626'], ['#ffe27a', '#c9902a']][tier];
  g.beginPath(); g.ellipse(0, 3, 5.5, 4.6, 0, 0, TAU); g.ellipse(0, 3, 3.6, 2.9, 0, 0, TAU, true);
  ink(g, lin(g, 0, -2, 0, 8, band[0], band[1]));
  if (tier === 0) return;
  const gem = GEM[tier];
  if (tier === 6) { // infinity ring: two gems
    for (const x of [-2, 2]) { g.beginPath(); g.arc(x, -2.2, 1.8, 0, TAU); ink(g, x < 0 ? '#ff4d5e' : '#7fe0ff'); }
    return;
  }
  g.beginPath(); g.moveTo(0, -5); g.lineTo(2.4, -2.2); g.lineTo(0, -0.6); g.lineTo(-2.4, -2.2); g.closePath(); ink(g, gem);
  if (tier >= 4) halo(g, 0, -2.8, 4, gem, 0.8);
}


// ——— Mitos: one grand shape per slot (plan "Efek Lebay" §E) ———
const MY = { a: '#fff2ea', b: '#8e1530', dark: '#3a0812', red: '#c2324a', gold: '#ffcf5a', gold2: '#a8741c', glow: '#ff4d6d', fire: '#ffb347' };

// teardrop flame rising from (x, y), size s, flickering
function flame(g, x, y, s, t, outer = '#ff5a2a', inner = '#ffe27a') {
  const w = Math.sin(t * 11 + x * 3) * 0.3 * s, h = 1 + Math.sin(t * 7 + y) * 0.12;
  for (const [k, c] of [[1, outer], [0.55, inner]]) {
    const z = s * k;
    g.beginPath(); g.moveTo(x - z, y);
    g.quadraticCurveTo(x - z * 0.9, y - z * 1.4 * h, x + w * k, y - z * 2.7 * h);
    g.quadraticCurveTo(x + z * 0.9, y - z * 1.4 * h, x + z, y);
    g.quadraticCurveTo(x, y + z * 0.75, x - z, y);
    g.fillStyle = c; g.fill();
  }
}
// cut gem: diamond with a highlight; lit = glow behind it
export function gemAt(g, x, y, s, color, lit = 0) {
  if (lit) halo(g, x, y, s * 3.2, color, lit);
  g.beginPath(); g.moveTo(x, y - s * 1.3); g.lineTo(x + s, y); g.lineTo(x, y + s * 1.3); g.lineTo(x - s, y); g.closePath();
  ink(g, color, 0.55);
  g.beginPath(); g.moveTo(x - s * 0.35, y - s * 0.55); g.lineTo(x, y - s * 0.95); g.lineWidth = 0.45; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
}
// tiny rune glyph centred at (x, y)
function rune(g, x, y, s, color, alpha) {
  g.beginPath(); g.moveTo(x - s, y + s); g.lineTo(x, y - s); g.lineTo(x + s, y + s); g.moveTo(x - s * 0.5, y + s * 0.1); g.lineTo(x + s * 0.5, y + s * 0.1);
  glowLine(g, color, 0.45, 2.5, alpha);
}

const MYTH_WEAPON = {
  // Pedang: wide serrated blade, runes flowing up it, winged guard, flame at the tip
  warrior(g, t) {
    grip(g, { trim: MY.gold }, 5);
    g.beginPath(); g.moveTo(-2.4, -2);
    for (let i = 1; i <= 6; i++) g.lineTo(i % 2 ? -4 : -2.8, -2 - i * 3.5);
    g.lineTo(0, -28);
    for (let i = 6; i >= 1; i--) g.lineTo(i % 2 ? 4 : 2.8, -2 - i * 3.5);
    g.lineTo(2.4, -2); g.closePath();
    ink(g, lin(g, -4, 0, 4, 0, MY.a, MY.b));
    g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -24); g.lineWidth = 1.5; g.strokeStyle = 'rgba(40,0,10,.55)'; g.stroke();
    for (let k = 0; k < 4; k++) {
      const y = -5 - ((k * 5 + t * 7) % 19);
      rune(g, 0, y, 0.8, MY.gold, Math.max(0, 1 - Math.abs(y + 14.5) / 10));
    }
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(0, -1.6);
      g.quadraticCurveTo(s * 5, -5, s * 9, -6.5); g.lineTo(s * 7.4, -4.2); g.lineTo(s * 8.6, -3.6); g.lineTo(s * 6.6, -2.2); g.lineTo(s * 7.2, -1.2);
      g.quadraticCurveTo(s * 3, -0.6, 0, -0.4); g.closePath();
      ink(g, lin(g, 0, -6, 0, 0, MY.gold, MY.gold2));
    }
    gemAt(g, 0, -1.4, 1.2, MY.glow, 0.7);
    flame(g, 0, -26.5, 2.2, t);
  },
  // Busur: winged crescent-moon bow, string of light, a star arrow nocked
  archer(g, t) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(3, s * (9 + i * 2));
      g.quadraticCurveTo(10 + i * 2, s * (11 + i * 3), 7 + i, s * (17 + i * 1.5));
      g.quadraticCurveTo(6, s * (12 + i * 2), 3, s * (10.5 + i * 2));
      ink(g, i % 2 ? '#ffe9e0' : '#ffc9b8', 0.55);
    }
    g.beginPath(); g.moveTo(-1, -17); g.quadraticCurveTo(13, 0, -1, 17); g.quadraticCurveTo(6.5, 0, -1, -17); g.closePath();
    ink(g, lin(g, 0, -17, 0, 17, '#fff0d8', MY.gold2));
    g.beginPath(); g.moveTo(-1, -17); g.lineTo(-1, 17); glowLine(g, '#ffe27a', 0.6, 4, 0.8 + 0.2 * Math.sin(t * 5));
    g.beginPath(); g.roundRect(4, -2.5, 3, 5, 1); ink(g, MY.dark);
    gemAt(g, 5.5, -5, 1, MY.glow, 0.6);
    g.beginPath(); g.moveTo(-3, 0); g.lineTo(12, 0); glowLine(g, '#fff3c4', 0.7, 3);
    halo(g, 14, 0, 6, '#ffd166', 0.8 + 0.2 * Math.sin(t * 6));
    g.save(); g.translate(14, 0); g.rotate(t * 2); star(g, 0, 0, 2.8, 1.1, '#fff3c4'); g.restore();
  },
  // Tongkat: floating crystal orb in a ring of runes, violet flame, drifting shards
  mage(g, t) {
    shaft(g, '#3a1030', 22);
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * 1, -20); g.quadraticCurveTo(s * 5.5, -23, s * 3.6, -30); g.lineTo(s * 2.8, -27.5); g.quadraticCurveTo(s * 3.6, -23, 0, -21.5); g.closePath();
      ink(g, MY.gold, 0.6);
    }
    const fy = -28 + Math.sin(t * 2.5) * 1.2;
    flame(g, 0, fy + 1, 3.6, t, '#8a3cff', '#e0b0ff');
    halo(g, 0, fy, 9, '#c060ff', 0.7);
    const orb = g.createRadialGradient(-1, fy - 1, 0.3, 0, fy, 3.8);
    orb.addColorStop(0, '#ffffff'); orb.addColorStop(0.45, '#ff8ad8'); orb.addColorStop(1, '#5a1478');
    g.beginPath(); g.arc(0, fy, 3.6, 0, TAU); ink(g, orb);
    g.beginPath(); g.ellipse(0, fy, 7.5, 2.6, Math.sin(t) * 0.3, 0, TAU); glowLine(g, '#ffd166', 0.55, 3);
    for (let i = 0; i < 6; i++) {
      const a = t * 1.6 + (i / 6) * TAU;
      rune(g, Math.cos(a) * 7.5, fy + Math.sin(a) * 2.6, 0.55, '#ffe9a0', 0.6 + 0.4 * Math.sin(a));
    }
    for (let i = 0; i < 3; i++) {
      const a = t * 1.1 + i * 2.1;
      crystal(g, Math.cos(a) * 9.5, fy - 2 + Math.sin(a * 1.3) * 4, 0.9, 2.2, '#ffd0f0', '#8a2a9a');
    }
  },
  // Belati: twin curved daggers, poison dripping, shadow smoke
  assassin(g, t) {
    for (let i = 0; i < 4; i++) { // smoke curling up from the grips
      const ph = (t * 0.5 + i / 4) % 1;
      g.beginPath(); g.arc(Math.sin(i * 2 + t) * 3, 2 - ph * 12, 1.5 + ph * 2.5, 0, TAU);
      g.fillStyle = `rgba(110,40,170,${0.35 * (1 - ph)})`; g.fill();
    }
    for (const s of [-1, 1]) {
      g.save(); g.rotate(s * 0.34); g.translate(s * 1.4, 0); g.scale(s, 1);
      grip(g, { trim: MY.gold }, 3.5);
      g.beginPath(); g.moveTo(-3.2, -1.4); g.quadraticCurveTo(0, -3.4, 3.2, -1.4); g.lineTo(0, -0.8); g.closePath(); ink(g, MY.gold, 0.6);
      g.beginPath(); g.moveTo(-1.6, -2); g.quadraticCurveTo(-5, -9, 1.6, -16); g.quadraticCurveTo(-1, -9, 1.6, -2); g.closePath();
      ink(g, lin(g, -3, -16, 2, 0, '#e9d8ff', '#3a1060'));
      g.beginPath(); g.moveTo(-2, -4); g.quadraticCurveTo(-4, -9, 0.8, -14.5); glowLine(g, '#c8ff5a', 0.5, 3, 0.85);
      const ph = (t * 1.3 + (s + 1) * 0.35) % 1; // poison drop sliding off the tip
      g.beginPath(); g.ellipse(1.6, -16 + ph * 9, 0.6, 0.9, 0, 0, TAU); g.fillStyle = `rgba(200,255,90,${1 - ph})`; g.fill();
      g.restore();
    }
  },
};

// Helm: great horns, glowing eye slit, a crown of fire
function mythHelm(g, hx, hy, r, t) {
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(hx + s * r * 0.45, hy - r * 0.7);
    g.bezierCurveTo(hx + s * r * 2.2, hy - r * 0.8, hx + s * r * 2.1, hy - r * 2.2, hx + s * r * 1.25, hy - r * 2.8);
    g.bezierCurveTo(hx + s * r * 1.55, hy - r * 1.8, hx + s * r * 1.2, hy - r * 1.25, hx + s * r * 0.15, hy - r * 1.0);
    g.closePath(); ink(g, lin(g, 0, hy - r * 2.8, 0, hy - r * 0.7, '#f2e6d8', '#4a2a2a'));
  }
  for (let i = 0; i < 5; i++) flame(g, hx + (i - 2) * r * 0.36, hy - r * 1.02, r * (i === 2 ? 0.3 : 0.2), t + i);
  domePath(g, hx, hy, r, 1.12, 0.45); ink(g, lin(g, 0, hy - r, 0, hy + r, MY.red, MY.dark));
  g.beginPath(); g.rect(hx - r * 1.08, hy - r * 0.42, r * 2.15, r * 0.3); ink(g, MY.gold, 0.6);
  for (let i = 0; i < 3; i++) { // crown points on the band
    const x = hx + (i - 1) * r * 0.6;
    g.beginPath(); g.moveTo(x - r * 0.16, hy - r * 0.42); g.lineTo(x, hy - r * 0.8); g.lineTo(x + r * 0.16, hy - r * 0.42); ink(g, MY.gold, 0.5);
  }
  g.beginPath(); g.moveTo(hx + r * 0.1, hy + r * 0.05); g.lineTo(hx + r * 1.05, hy - r * 0.05);
  glowLine(g, '#ffe27a', 1.1, 4, 0.75 + 0.25 * Math.sin(t * 4));
  gemAt(g, hx + r * 0.1, hy - r * 0.62, r * 0.13, MY.glow, 0.6);
}

// Zirah: breastplate with a pulsing core gem, horned pauldrons, magma cracks
function mythArmor(g, y0, y1, w, t) {
  const plate = () => { g.beginPath(); g.moveTo(-w, y0 + 1); g.quadraticCurveTo(0, y0 - 1.4, w, y0 + 1); g.lineTo(w * 0.85, y1); g.lineTo(-w * 0.85, y1); g.closePath(); };
  plate(); ink(g, lin(g, -w, y0, w, y1, MY.red, MY.dark));
  g.save(); plate(); g.clip();
  const cy = (y0 + y1) / 2;
  g.beginPath();
  g.moveTo(-w * 0.9, y1 - 1); g.lineTo(-w * 0.4, cy + 1); g.lineTo(-w * 0.55, cy - 2); g.lineTo(-w * 0.15, cy - 0.5);
  g.moveTo(w * 0.9, y1 - 2); g.lineTo(w * 0.35, cy + 2); g.lineTo(w * 0.5, cy - 1.5); g.lineTo(w * 0.12, cy);
  g.moveTo(-w * 0.2, y1); g.lineTo(0, cy + 2.5); g.lineTo(w * 0.25, y1);
  glowLine(g, '#ff9a3c', 0.5, 2.5, 0.6 + 0.4 * Math.sin(t * 3));
  g.restore();
  g.beginPath(); g.moveTo(-w * 0.85, y1 - 1); g.lineTo(w * 0.85, y1 - 1); g.lineWidth = 1; g.strokeStyle = MY.gold; g.stroke();
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * w * 1.05, y0 - 0.2); g.quadraticCurveTo(s * w * 1.75, y0 - 3, s * w * 1.55, y0 - 6.5); g.quadraticCurveTo(s * w * 1.3, y0 - 2.6, s * w * 0.75, y0 - 0.2); g.closePath();
    ink(g, '#efe2d2', 0.6);
    g.beginPath(); g.ellipse(s * w * 0.95, y0 + 1.5, w * 0.52, 2.8, s * 0.3, Math.PI, TAU); g.closePath();
    ink(g, lin(g, 0, y0 - 2, 0, y0 + 3, MY.gold, MY.gold2));
  }
  const p = 1 + Math.sin(t * 4) * 0.15;
  gemAt(g, 0, cy - 1.2, 1.7 * p, MY.glow, 0.9);
}

// Sepatu: little wings at the heel, flame trail, glowing sole
function mythBoot(g, x, y, t) {
  const sh = 6.5;
  g.beginPath(); g.moveTo(x - 2.2, y - sh); g.lineTo(x + 1.4, y - sh); g.lineTo(x + 1.6, y - 1.6);
  g.quadraticCurveTo(x + 4.6, y - 1.8, x + 4.6, y); g.lineTo(x - 2.4, y); g.closePath();
  ink(g, lin(g, 0, y - sh, 0, y, MY.red, MY.dark));
  g.beginPath(); g.rect(x - 2.6, y - sh - 0.6, 4.4, 1.4); ink(g, MY.gold, 0.5);
  const f = Math.sin(t * 8) * 0.8;
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(x - 2.2, y - sh + 1.4 + i * 0.9);
    g.quadraticCurveTo(x - 5.5 - i, y - sh - 1.5 + i * 1.2 + f, x - 6.2 - i * 0.4, y - sh + 0.5 + i * 1.6 + f);
    g.lineTo(x - 2.2, y - sh + 2.2 + i * 0.9); g.closePath(); ink(g, i % 2 ? '#ffe9e0' : '#fff', 0.45);
  }
  flame(g, x - 3.4, y - 0.2, 0.9, t, '#ff5a2a', '#ffe27a');
  g.beginPath(); g.moveTo(x - 2.4, y); g.lineTo(x + 4.6, y); glowLine(g, MY.fire, 0.7, 2.5, 0.7 + 0.3 * Math.sin(t * 5));
}

// Kalung: a dragon eye blinking inside the gem, gold chain
function mythAmulet(g, t) {
  g.beginPath(); g.arc(0, -6, 7, Math.PI * 0.12, Math.PI * 0.88, true); g.lineWidth = 1.4; g.strokeStyle = MY.gold2; g.stroke();
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.12 + (0.76 * i) / 8) + Math.PI; g.beginPath(); g.arc(-Math.cos(a) * 7, -6 - Math.sin(a) * 7, 0.55, 0, TAU); g.fillStyle = MY.gold; g.fill(); }
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 2.5, 0); g.quadraticCurveTo(s * 6, 0.5, s * 5, 5); g.quadraticCurveTo(s * 3.5, 3, s * 2.2, 3.5); g.closePath(); ink(g, MY.gold, 0.5); }
  halo(g, 0, 2.5, 8, MY.glow, 0.6 + 0.2 * Math.sin(t * 3));
  const gem = g.createRadialGradient(-0.8, 1.6, 0.2, 0, 2.5, 4);
  gem.addColorStop(0, '#ffd0a0'); gem.addColorStop(0.5, '#ff4d2a'); gem.addColorStop(1, '#5c0a18');
  g.beginPath(); g.ellipse(0, 2.5, 3.3, 4, 0, 0, TAU); ink(g, gem);
  const blink = (t % 3.4) < 0.16 ? 0.1 : 1;
  g.beginPath(); g.ellipse(0, 2.5, 0.75 * blink + 0.15, 3 * blink + 0.2, 0, 0, TAU); g.fillStyle = '#16060a'; g.fill();
  g.beginPath(); g.arc(-0.9, 1.3, 0.5, 0, TAU); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
}

// Cincin: a faceted stone turning, a little ring of fire orbiting it
function mythRing(g, t) {
  g.beginPath(); g.ellipse(0, 3, 5.6, 4.7, 0, 0, TAU); g.ellipse(0, 3, 3.5, 2.8, 0, 0, TAU, true);
  ink(g, lin(g, 0, -2, 0, 8, '#ffe27a', MY.gold2));
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 1.5, -0.8); g.lineTo(s * 4, -2.6); g.lineTo(s * 3.2, 0.2); g.closePath(); ink(g, MY.gold, 0.45); }
  halo(g, 0, -3, 7, MY.glow, 0.7);
  const n = 8, rot = t * 1.4;
  g.beginPath();
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU, rr = i % 2 ? 2.6 : 3.1; g.lineTo(Math.cos(a) * rr, -3 + Math.sin(a) * rr * 0.85); }
  g.closePath(); ink(g, lin(g, -3, -6, 3, 0, '#ff9aa8', '#8e1530'), 0.55);
  g.beginPath();
  for (let i = 0; i < 4; i++) { const a = rot + (i / 4) * TAU; g.moveTo(0, -3); g.lineTo(Math.cos(a) * 2.8, -3 + Math.sin(a) * 2.4); }
  g.lineWidth = 0.35; g.strokeStyle = 'rgba(255,255,255,.6)'; g.stroke();
  for (let i = 0; i < 5; i++) { // fire orbit
    const a = t * 3 + (i / 5) * TAU, x = Math.cos(a) * 5.4, y = -3 + Math.sin(a) * 1.8;
    if (Math.sin(a) < 0) continue; // behind the stone
    flame(g, x, y, 0.65, t + i, '#ff5a2a', '#ffe27a');
  }
}

// ——— rarity accents on ordinary shapes (Bagus → Legendaris) ———
// anchor per slot in the shape's own coordinates: gem spot + an engraving line
function accentSpot(slot, classId) {
  switch (slot) {
    case 'weapon':
      if (classId === 'archer') return { gx: 4.5, gy: 0, line: [2.2, -9, 3.6, -4], rx: 3, ry: -11 };
      if (classId === 'mage') return { gx: 0, gy: -16, line: [-1, -12, 1, -12], rx: 0, ry: -9 };
      if (classId === 'assassin') return { gx: 0, gy: -1.3, line: [0, -3, 0, -8], rx: 0, ry: -10 };
      return { gx: 0, gy: -1.7, line: [0, -5, 0, -13], rx: 0, ry: -16 };
    case 'helm': return { gx: 2, gy: -5.6, line: [-6.4, -2.8, 7.2, -3.2], rx: -3, ry: -6 };
    case 'armor': return { gx: 0, gy: -9, line: [-3.9, -12, 0, -10, 3.9, -12], rx: 0, ry: -5 };
    case 'boots': return { gx: -1.4, gy: -0.4, line: [-3, 2, 2, 2], rx: 0.4, ry: -1.6 };
    case 'amulet': return { gx: -4.9, gy: -1, line: [4.9, -1, 4.9, -1], rx: 0, ry: -9 };
    default: return { gx: -3.6, gy: 3, line: [-4.4, 5.4, 4.4, 5.4], rx: 3.6, ry: 3 };
  }
}
function accents(g, item, t) {
  const r = item.rarity;
  if (r < 1 || r === MYTHIC) return;
  const c = RARITIES[r].color, a = accentSpot(item.slot, item.classId);
  const L = a.line;
  g.beginPath(); g.moveTo(L[0], L[1]); for (let i = 2; i < L.length; i += 2) g.lineTo(L[i], L[i + 1]);
  if (r >= 3) glowLine(g, c, 0.45, 2, 0.7);
  else { g.lineWidth = 0.5; g.strokeStyle = c; g.stroke(); }
  if (r >= 2) gemAt(g, a.gx, a.gy, r >= 4 ? 1.2 : 1, c, r >= 3 ? 0.5 + (r >= 4 ? 0.3 * Math.sin(t * 4) : 0) : 0);
  if (r >= 3) rune(g, a.rx, a.ry, 0.9, c, r >= 4 ? 0.6 + 0.4 * Math.sin(t * 3) : 0.8);
}

// ——— bag / ground icons ———
// Draws an item centred at the origin inside size × size. t animates Legendaris+.
export function drawGearIcon(g, item, size, t = 0) {
  const k = size / 26, r = item.rarity, c = RARITIES[r]?.color || '#fff';
  g.save();
  g.scale(k, k);
  g.lineJoin = 'round';
  if (ICON_FX.halo[r]) {
    const pulse = r === MYTHIC ? 1 + 0.12 * Math.sin(t * 3) : 1;
    const gr = g.createRadialGradient(0, 0, 1, 0, 0, 13 * pulse);
    const al = Math.round(ICON_FX.halo[r] * 255).toString(16).padStart(2, '0');
    gr.addColorStop(0, `${c}${al}`); gr.addColorStop(1, `${c}00`);
    g.fillStyle = gr; g.fillRect(-13, -13, 26, 26);
  }
  if (r === MYTHIC) { // slow rotating rays, red and gold
    g.save(); g.globalCompositeOperation = 'lighter'; g.rotate(t * 0.4);
    for (let i = 0; i < ICON_FX.rays; i++) {
      g.rotate(TAU / ICON_FX.rays);
      g.beginPath(); g.moveTo(-1, 0); g.lineTo(0, -13); g.lineTo(1, 0); g.closePath();
      g.fillStyle = i % 2 ? 'rgba(255,209,102,.22)' : 'rgba(255,77,109,.22)'; g.fill();
    }
    g.restore();
  }
  const tier = item.variant;
  g.save();
  switch (item.slot) {
    case 'weapon':
      g.rotate(item.classId === 'archer' ? 0.6 : Math.PI / 4);
      g.translate(0, item.classId === 'mage' ? 8 : item.classId === 'archer' ? 0 : 6);
      if (item.classId === 'mage') g.scale(0.72, 0.72);
      if (r === MYTHIC) { // grand shapes are bigger: shrink them back into the frame
        if (item.classId === 'warrior') { g.translate(0, 2); g.scale(0.74, 0.74); }
        else if (item.classId === 'archer') { g.translate(-3, 0); g.scale(0.72, 0.72); }
        else if (item.classId === 'mage') { g.translate(0, -2); g.scale(0.9, 0.9); }
      }
      drawWeapon(g, item.classId, tier, t, r);
      break;
    case 'helm': g.translate(0, r === MYTHIC ? 8.5 : 3); if (r === MYTHIC) g.scale(0.72, 0.72); drawHelm(g, tier, 0, 0, 8, t, r); break;
    case 'armor': g.scale(1.25, 1.25); g.translate(0, r === MYTHIC ? 9 : 8); if (r === MYTHIC) g.scale(0.88, 0.88); drawArmor(g, tier, -14, -1, 6.5, t, r); break;
    case 'boots': if (r === MYTHIC) { g.scale(1.95, 1.95); g.translate(1.6, 0); } else g.scale(2.3, 2.3); drawBoot(g, tier, -1, 3.2, t, r); break;
    case 'amulet': g.scale(1.25, 1.25); g.translate(0, 2); if (r === MYTHIC) mythAmulet(g, t); else drawAmulet(g, tier, t); break;
    default: g.scale(1.25, 1.25); if (r === MYTHIC) mythRing(g, t); else drawRing(g, tier); break;
  }
  accents(g, item, t);
  g.restore();
  for (let i = 0; i < ICON_FX.motes[r]; i++) { // sparkles circling and rising
    const ph = (t * 0.35 + i / ICON_FX.motes[r]) % 1, a = i * 2.4 + t * 0.8;
    const x = Math.cos(a) * (8 + i % 3), y = 9 - ph * 20;
    const al = Math.sin(ph * Math.PI);
    halo(g, x, y, 2.2, r === MYTHIC && i % 2 ? '#ff4d6d' : '#ffd166', al);
    g.fillStyle = `rgba(255,255,240,${al})`; g.fillRect(x - 0.35, y - 0.35, 0.7, 0.7);
  }
  g.restore();
}

// A crisp DOM <canvas> of an item icon. Legendaris+ keep animating while on screen
// (one shared timer, ICON_FX.fps); a canvas taken out of the page drops out of it.
const live = new Set();
let ticking = false;
function tickIcons(now) {
  for (const c of live) {
    if (!c.isConnected) { if (c.dataset.seen || now - c._born > 2000) live.delete(c); continue; } // removed, or never shown
    c.dataset.seen = '1';
    paintIcon(c, now / 1000);
  }
  if (live.size) setTimeout(() => requestAnimationFrame(tickIcons), 1000 / ICON_FX.fps);
  else ticking = false;
}
function paintIcon(c, t) {
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.translate(c.width / 2, c.height / 2);
  drawGearIcon(g, c._item, c.width, t);
}
export function gearCanvas(item, cssSize) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(cssSize * dpr);
  c.style.width = c.style.height = `${cssSize}px`;
  c.className = `gi gi${item.rarity}`;
  c._item = item; c._born = performance.now();
  paintIcon(c, performance.now() / 1000);
  if (item.rarity >= ICON_FX.animFrom) {
    live.add(c);
    if (!ticking) { ticking = true; requestAnimationFrame(tickIcons); }
  }
  return c;
}
