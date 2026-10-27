// Small drawing helpers shared by the town and the building interiors.
import { drawDoll } from '../art/doll.js';
import { drawIcon, OUT } from '../art/sprites.js';

export const TAU = Math.PI * 2;
const DOLL = 0.82;
const ROLE_ICON = { inn: 'inn', potion: 'potion', gear: 'pow', gate: 'arm', talk: 'talk', trainer: 'trainer', barber: 'barber', jeweler: 'gearRing', board: 'board' };

export function ink(g, fill, lw = 1.5) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); }
export function lin(g, y0, y1, c0, c1) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
export function shadow(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill(); }

export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// a paper doll standing at (x, y) (feet), facing ±1, scale for children
export function actor(g, x, y, classId, look, pose, facing, scale = 1) {
  shadow(g, x, y + 10 * scale, 10 * scale, 3 * scale);
  g.save();
  g.translate(x, y + 10 * scale);
  g.scale(DOLL * scale * facing, DOLL * scale);
  drawDoll(g, classId, look, pose);
  g.restore();
}

// role icon above an NPC; name (and title) when the player is close
export function tag(g, n, x, y0, t, near) {
  const bob = Math.sin(t * 3 + n.x) * 2;
  const y = y0 - 40 * (n.scale || 1) + bob;
  g.beginPath(); g.arc(x, y, 11, 0, TAU);
  g.fillStyle = near ? 'rgba(255,201,77,.95)' : 'rgba(30,24,60,.85)'; g.fill();
  g.lineWidth = 1.6; g.strokeStyle = near ? '#fff' : 'rgba(255,255,255,.35)'; g.stroke();
  g.save(); g.translate(x, y); drawIcon(g, ROLE_ICON[n.role], 16); g.restore();
  if (near) {
    g.font = '600 9px Barlow, system-ui, sans-serif';
    g.textAlign = 'center';
    g.lineWidth = 3; g.strokeStyle = 'rgba(20,14,40,.9)';
    g.strokeText(n.name, x, y - 16);
    g.fillStyle = '#fff'; g.fillText(n.name, x, y - 16);
  }
}

// small text plate (shop names over doors)
export function plate(g, text, x, y, fill = '#3a2620') {
  g.font = '700 8px Barlow, system-ui, sans-serif';
  const w = g.measureText(text).width + 12;
  g.beginPath(); g.roundRect(x - w / 2, y - 7, w, 14, 4); ink(g, fill, 1.4);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffe3a1'; g.fillText(text, x, y + 0.5);
  g.textBaseline = 'alphabetic';
}
