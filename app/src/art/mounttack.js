// Shared tack & majesty of the majestic mounts (spec §35.3): palettes, calm eyes, plumes,
// drapes, the sun crest, the pennant, the regal saddle, reins. Used by the side view
// (art/mounts.js) and the front / back views (art/mountviews.js).
import { kit } from './companions.js';
import { glow, pal, INK, TAU } from './hero/cel.js';

const { E, piece, bone } = kit;

export const RIMS = {
  holy: 'rgba(255,244,214,.95)', gold: 'rgba(255,214,120,.95)', ice: 'rgba(214,242,255,.95)',
  rose: 'rgba(255,214,228,.95)', jade: 'rgba(200,255,224,.95)', dusk: 'rgba(255,200,160,.95)',
};
export const R = (base, rim = 'holy', extra = {}) => pal(base, { rim: RIMS[rim], ...extra });
export const GOLD = R('#d6a23c', 'gold', { hi: '#ffe7a0' });
export const GOLD_HEX = '#ffd36a';
export const STEEL = R('#a7b0c4', 'holy', { hi: '#eef2fa' });
export const LEATHER = R('#5a3218', 'dusk');

// ─── shared tack & majesty ────────────────────────────────────────────────
// a calm eye looking forward: almond, dark iris, a highlight and a lid line
export function calmEye(g, x, y, s, iris = '#3a2414', soft) {
  if (soft) glow(g, x, y, s * 3.2, soft, 0.3);
  g.beginPath(); g.moveTo(x - s * 1.1, y); g.quadraticCurveTo(x, y - s * 0.95, x + s * 1.1, y - s * 0.1);
  g.quadraticCurveTo(x, y + s * 0.7, x - s * 1.1, y); g.closePath(); g.fillStyle = '#f6efe0'; g.fill();
  g.beginPath(); g.arc(x + s * 0.15, y - s * 0.05, s * 0.55, 0, TAU); g.fillStyle = iris; g.fill();
  g.beginPath(); g.arc(x + s * 0.36, y - s * 0.28, s * 0.2, 0, TAU); g.fillStyle = '#fff'; g.fill();
  g.lineWidth = 0.7; g.strokeStyle = INK;
  g.beginPath(); g.moveTo(x - s * 1.25, y + 0.1); g.quadraticCurveTo(x, y - s * 1.1, x + s * 1.2, y - s * 0.2); g.stroke();
}
// feathers sweeping back from (x, y)
export function plume(g, x, y, t, col, len = 11) {
  const Pc = R(col);
  for (let i = 0; i < 4; i++) {
    const a = -2.0 - i * 0.26 + Math.sin(t * 3 + i) * 0.08, L = len * (1 - i * 0.1);
    const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, bx = x + Math.cos(a + 0.35) * L * 0.55, by = y + Math.sin(a + 0.35) * L * 0.55;
    piece(g, [[x, y], [bx, by], [ex, ey], [x + Math.cos(a - 0.3) * L * 0.5, y + Math.sin(a - 0.3) * L * 0.5]], Pc, 0.6);
  }
  piece(g, E(x, y, 1.6, 1.6, 8), GOLD, 0.3);
}
// a cloth hanging from the back with a fringed hem and a gold (or ivory) trim
export function drape(g, top, yh, cloth, trim, t, emblem) {
  const xL = top[0][0], xR = top[top.length - 1][0], n = Math.max(4, Math.round((xR - xL) / 4.5));
  const hem = [];
  for (let i = n; i >= 0; i--) hem.push([xL + (xR - xL) * i / n, yh + (i % 2 ? 2.4 : 0) + Math.sin(t * 2.4 + i * 0.8) * 0.5]);
  piece(g, [...top, ...hem], R(cloth), 1.6);
  g.lineWidth = 1.4; g.strokeStyle = trim; g.beginPath();
  hem.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y - 2)); g.stroke();
  g.lineWidth = 0.9; g.beginPath(); top.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y + 1.2)); g.stroke();
  if (emblem) sunCrest(g, emblem.x, emblem.y, emblem.r || 3.2, t);
}
// a small gold sun crest (the heroes' sign)
export function sunCrest(g, x, y, r, t) {
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8 + t * 0.2, c = Math.cos(a), s = Math.sin(a);
    g.beginPath(); g.moveTo(x + c * r * 0.8 - s * 0.7, y + s * r * 0.8 + c * 0.7); g.lineTo(x + c * r * 1.6, y + s * r * 1.6); g.lineTo(x + c * r * 0.8 + s * 0.7, y + s * r * 0.8 - c * 0.7);
    g.fillStyle = GOLD_HEX; g.fill();
  }
  piece(g, E(x, y, r, r, 12), GOLD, 0.5);
  glow(g, x, y, r * 3, 'rgba(255,220,130,.8)', 0.25);
}
// a pennant on a pole behind the rider, waving back
export function pennant(g, x, y, t, col, h = 30) {
  bone(g, x, y, x, y - h, 1.2, 1.2, 1.1, R('#4a3020'));
  const top = [], bot = [];
  for (let i = 0; i <= 6; i++) {
    const k = i / 6, w = Math.sin(t * 5 - k * 4) * 2.2 * k;
    top.push([x - k * 16, y - h + 1 + w]); bot.push([x - k * 16, y - h + 9 - k * 3 + w]);
  }
  bot[6][0] += 3; bot[6][1] -= 2; // swallow tail
  piece(g, [...top, [bot[6][0] - 3, (top[6][1] + bot[6][1]) / 2 + 1], ...bot.reverse()], R(col, 'gold'), 0.8);
  g.lineWidth = 0.9; g.strokeStyle = GOLD_HEX; g.beginPath(); top.forEach(([px, py], i) => g[i ? 'lineTo' : 'moveTo'](px, py + 0.9)); g.stroke();
  piece(g, [[x - 1.6, y - h], [x, y - h - 4], [x + 1.6, y - h]], GOLD, 0.3);
}
// a regal saddle: blanket, leather seat with a high gold-capped pommel and cantle
export function regalSaddle(g, x, y, w, tier, cloth, t) {
  const trim = tier >= 2 ? GOLD_HEX : '#d8c8a0';
  piece(g, [[x - w * 0.62, y - 1], [x + w * 0.58, y - 1], [x + w * 0.5, y + 9], [x + w * 0.1, y + 11], [x - w * 0.24, y + 11], [x - w * 0.56, y + 9]], R(cloth), 1.2);
  g.lineWidth = 1.2; g.strokeStyle = trim;
  g.beginPath(); g.moveTo(x - w * 0.52, y + 8); g.lineTo(x - w * 0.2, y + 9.6); g.lineTo(x + w * 0.1, y + 9.6); g.lineTo(x + w * 0.46, y + 8); g.stroke();
  piece(g, [[x - w * 0.42, y - 6], [x - w * 0.34, y - 1.5], [x + w * 0.28, y - 1.5], [x + w * 0.38, y - 6], [x + w * 0.46, y - 2], [x + w * 0.36, y + 2], [x - w * 0.38, y + 2], [x - w * 0.52, y - 2]], LEATHER, 0.8);
  if (tier >= 2) { piece(g, E(x + w * 0.4, y - 6, 1.3, 1.3, 8), GOLD, 0.3); piece(g, E(x - w * 0.46, y - 6, 1.3, 1.3, 8), GOLD, 0.3); }
  if (tier >= 3) {
    piece(g, [[x, y + 3], [x + 2, y + 5], [x, y + 7], [x - 2, y + 5]], R('#4aa0ff', 'ice'), 0.4);
    glow(g, x, y + 5, 5, 'rgba(140,200,255,.9)', 0.4 + Math.sin(t * 3) * 0.15);
  }
}
// reins from the mouth to the rider's hands
export function reins(g, mx, my, sx, sy) {
  g.lineWidth = 0.8; g.strokeStyle = '#3a2010';
  g.beginPath(); g.moveTo(mx, my); g.quadraticCurveTo((mx + sx) / 2, Math.max(my, sy) + 4, sx, sy); g.stroke();
}

