// Ground marks of the spec §41.1 enemies, shared by the 2D view (render/world.js) and the 3D
// decal layer (render3d/actors.js): the bush a Semak Penyergap hides as, the mirror a Penjaga
// Cermin raises, and the icy puddle a Roh Embun leaves (hazard kind 'puddle').
import { ENEMIES } from '../data/enemies.js';

const TAU = Math.PI * 2;

// Katak Rawa in the air: height (px) along its jump arc, 0 on the ground.
export function leapHeight(e) {
  if (e.ai !== 'leap' || e.mode !== 'air') return 0;
  const w = ENEMIES[e.type].windup, k = 1 - Math.max(0, e.modeT) / w;
  return Math.sin(Math.PI * k) * 70;
}

// Semak Penyergap while hidden: an ordinary-looking bush that rustles when the player is close.
export function bushDisguise(g, e, t, near) {
  const rustle = near ? Math.sin(t * 22) * 1.6 : 0, x = e.x + rustle, y = e.y + e.r * 0.3, r = e.r;
  g.save();
  g.beginPath(); g.ellipse(e.x, y + r * 0.55, r * 1.25, r * 0.4, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
  for (const [dx, dy, s, c] of [[-0.6, 0.1, 0.75, '#22381a'], [0.6, 0.15, 0.7, '#22381a'], [0, -0.35, 0.85, '#2c4a20'], [-0.35, -0.05, 0.6, '#3a5e28'], [0.4, -0.2, 0.55, '#3a5e28']]) {
    g.beginPath(); g.arc(x + dx * r, y + dy * r, s * r, 0, TAU); g.fillStyle = c; g.fill();
  }
  g.fillStyle = 'rgba(160,210,120,.35)';
  for (const [dx, dy] of [[-0.3, -0.6], [0.25, -0.75], [0.6, -0.3], [-0.7, -0.1]]) { g.beginPath(); g.ellipse(x + dx * r, y + dy * r, r * 0.14, r * 0.07, dx, 0, TAU); g.fill(); }
  g.restore();
}

// Penjaga Cermin: a pale arc in front while it flashes (blinking) and a bright mirror while it holds.
export function mirrorMark(g, e, t) {
  if (e.mode !== 'flash' && e.mode !== 'hold') return;
  const on = e.mode === 'hold' || ((t * 14) | 0) % 2 === 0;
  if (!on) return;
  g.save();
  g.translate(e.x, e.y); g.rotate(e.face);
  g.globalCompositeOperation = 'lighter';
  const r0 = e.r + 4, r1 = e.r + (e.mode === 'hold' ? 14 : 9), a = 1.2;
  g.beginPath(); g.arc(0, 0, r1, -a, a); g.arc(0, 0, r0, a, -a, true); g.closePath();
  g.fillStyle = e.mode === 'hold' ? 'rgba(200,236,255,.75)' : 'rgba(200,236,255,.4)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.9)';
  g.beginPath(); g.arc(0, 0, r1, -a, a); g.stroke();
  if (e.mode === 'hold') { // a glint sliding along the mirror
    const k = Math.sin(t * 5) * a * 0.8;
    g.beginPath(); g.arc(0, 0, (r0 + r1) / 2, k - 0.15, k + 0.15); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.8)'; g.stroke();
  }
  g.restore();
}

// Roh Embun's puddle: frosty pale-blue sheet with a few glints, fading at both ends of its life.
export function puddle(g, h, t) {
  const life = Math.min(1, h.t / 0.6, (h.max - h.t) / 0.25);
  g.save();
  const grd = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
  grd.addColorStop(0, `rgba(200,236,255,${0.5 * life})`); grd.addColorStop(0.7, `rgba(150,210,245,${0.35 * life})`); grd.addColorStop(1, 'rgba(150,210,245,0)');
  g.beginPath(); g.ellipse(h.x, h.y, h.r, h.r * 0.8, 0, 0, TAU); g.fillStyle = grd; g.fill();
  g.lineWidth = 1.2; g.strokeStyle = `rgba(230,248,255,${0.55 * life})`;
  g.beginPath(); g.ellipse(h.x, h.y, h.r * 0.9, h.r * 0.72, 0, 0, TAU); g.stroke();
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + h.x * 0.05, d = h.r * 0.45, tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 2 + h.y);
    g.fillStyle = `rgba(255,255,255,${0.7 * life * tw})`;
    g.beginPath(); g.arc(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d * 0.8, 1.6, 0, TAU); g.fill();
  }
  g.restore();
}
