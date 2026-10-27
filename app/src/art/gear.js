// Gear art (spec §8, langkah 8A): one shape per look variant (tier 0–6) for
// every slot — 4 × 7 class weapons, 7 helms, 7 armours, 7 boots, 7 amulets,
// 7 rings. The same drawings dress the paper doll and make the bag icons.
// Weapons are drawn with the grip at the origin pointing up (−y).
import { RARITIES } from '../data/items.js';

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
// glowing line (runes, edges) — additive look without changing composite mode
function glowLine(g, color, w = 0.8, blur = 3) {
  g.save(); g.shadowColor = color; g.shadowBlur = blur; g.lineWidth = w; g.strokeStyle = color; g.stroke(); g.restore();
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

// weapon for a class at a tier, grip at origin, pointing up
export function drawWeapon(g, classId, tier, t = 0) {
  const m = material(tier);
  g.lineJoin = 'round';
  if (classId === 'warrior') { grip(g, m); SWORDS[tier](g, m, t); }
  else if (classId === 'archer') drawBow(g, tier, m, t);
  else if (classId === 'mage') STAVES[tier](g, m, t);
  else { grip(g, m, 3.5); g.beginPath(); g.roundRect(-3, -2, 6, 1.4, 0.6); ink(g, m.trim); DAGGERS[tier](g, m, t); }
}

// ——— helmets: drawn over a head (hx, hy, r) facing right ———
export function drawHelm(g, tier, hx, hy, r, t = 0) {
  const m = material(tier);
  const dome = (top = 1.12, low = 0.15) => {
    g.beginPath(); g.moveTo(hx - r * 1.08, hy + r * low);
    g.quadraticCurveTo(hx - r * 1.15, hy - r * top * 1.15, hx + r * 0.1, hy - r * top * 1.1);
    g.quadraticCurveTo(hx + r * 1.15, hy - r * top, hx + r * 1.05, hy + r * low);
    g.closePath();
  };
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
      g.save(); g.shadowColor = m.glow; g.shadowBlur = 5; g.fillStyle = m.glow; g.fill(); g.restore();
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
export const helmHidesHair = (tier) => tier !== 4;

// ——— armour: over a torso box (top y0 … bottom y1, half width w) ———
export function drawArmor(g, tier, y0, y1, w, t = 0) {
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
export function drawBoot(g, tier, x, y) {
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
    () => { star(g, 0, 2.5, 4.4, 2, '#fff1b0'); g.save(); g.shadowColor = '#ffd36b'; g.shadowBlur = 6; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 2.5, 1.3, 0, TAU); g.fill(); g.restore(); },
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
  if (tier >= 4) { g.save(); g.shadowColor = gem; g.shadowBlur = 5; g.fillStyle = gem; g.fill(); g.restore(); }
}

// ——— bag / ground icons ———
// Draws an item centred at the origin inside size × size (Epik+ glow behind it).
export function drawGearIcon(g, item, size, t = 0) {
  const k = size / 26;
  g.save();
  g.scale(k, k);
  g.lineJoin = 'round';
  if (item.rarity >= 3) {
    const c = RARITIES[item.rarity].color;
    const gr = g.createRadialGradient(0, 0, 1, 0, 0, 13);
    gr.addColorStop(0, `${c}66`); gr.addColorStop(1, `${c}00`);
    g.fillStyle = gr; g.fillRect(-13, -13, 26, 26);
  }
  const tier = item.variant;
  switch (item.slot) {
    case 'weapon':
      g.rotate(item.classId === 'archer' ? 0.6 : Math.PI / 4);
      g.translate(0, item.classId === 'mage' ? 8 : item.classId === 'archer' ? 0 : 6);
      if (item.classId === 'mage') g.scale(0.72, 0.72);
      drawWeapon(g, item.classId, tier, t);
      break;
    case 'helm': g.translate(0, 3); drawHelm(g, tier, 0, 0, 8, t); break;
    case 'armor': g.scale(1.25, 1.25); g.translate(0, 8); drawArmor(g, tier, -14, -1, 6.5, t); break;
    case 'boots': g.scale(2.3, 2.3); drawBoot(g, tier, -1, 3.2); break;
    case 'amulet': g.scale(1.25, 1.25); g.translate(0, 2); drawAmulet(g, tier, t); break;
    default: g.scale(1.25, 1.25); drawRing(g, tier); break;
  }
  g.restore();
}

// A crisp DOM <canvas> of an item icon.
export function gearCanvas(item, cssSize) {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(cssSize * dpr);
  c.style.width = c.style.height = `${cssSize}px`;
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  drawGearIcon(g, item, cssSize * dpr);
  return c;
}
