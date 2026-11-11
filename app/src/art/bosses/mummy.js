// Raja Mumi (spec §41.2): a floating lich-pharaoh — no legs, a tail of bandage strips streaming
// below — a skeletal wrapped torso with a glowing ankh, four arms (a crook and a flail in the upper
// pair, long-nailed bony hands below), a skull with teal soul-fire eyes under a gold-and-lapis
// headdress and false beard, a golden sarcophagus lid hovering behind like a shield.
import { rig } from '../hero/rig.js';
import { body } from '../anime/common.js';
import { P, part, stroke, glow, pal, far, limb, chestFrame, reach, talons, strip, alongPsi } from './kit.js';

const WRAP = pal('#c8b890', { shade: '#6a5a40', hi: '#f4ead0', rim: 'rgba(90,255,224,.7)' });
const WRAP2 = pal('#a89870', { shade: '#504230', hi: '#d8caa8', rim: 'rgba(90,255,224,.6)' });
const BONE = pal('#e0d4bc', { shade: '#7a6a54', hi: '#fffaf0', rim: 'rgba(90,255,224,.7)' });
const GOLD = pal('#d0a030', { shade: '#6a4a10', hi: '#fff0a0', rim: 'rgba(90,255,224,.7)' });
const LAPIS = pal('#2a5aa8', { shade: '#0e2250', hi: '#6a9ae8', rim: null });
const TEAL = '#5affe0';

function lid(g, c, t, hot) { // the sarcophagus lid hovering behind
  const [x, y] = c, b = Math.sin(t * 1.1) * 3;
  part(g, [[x - 24, y - 70 + b], [x - 10, y - 86 + b], [x + 10, y - 86 + b], [x + 24, y - 70 + b], [x + 18, y + 30 + b], [x - 18, y + 30 + b]], far(GOLD), { sd: 3 });
  for (let i = 0; i < 5; i++) stroke(g, [[x - 18, y - 56 + i * 18 + b], [x + 18, y - 56 + i * 18 + b]], '#1e3e78', 2.2);
  glow(g, x, y - 20 + b, 30 * hot, TEAL, 0.35);
}
function skull(g, [x, y], front, t, hot) {
  // headdress (nemes) behind the face, then the skull, the beard, the cobra
  const nem = front ? [[x - 20, y + 16], [x - 18, y - 10], [x - 10, y - 20], [x, y - 22], [x + 10, y - 20], [x + 18, y - 10], [x + 20, y + 16], [x + 10, y + 4], [x - 10, y + 4]]
    : [[x - 22, y + 18], [x - 18, y - 8], [x - 8, y - 20], [x + 6, y - 21], [x + 12, y - 12], [x + 8, y + 2], [x - 6, y + 4]];
  part(g, nem, GOLD, { sd: 2.4 });
  for (let i = 0; i < 4; i++) stroke(g, front ? [[x - 17, y - 8 + i * 6], [x - 10, y - 10 + i * 6]] : [[x - 18, y - 6 + i * 6], [x - 8, y - 8 + i * 6]], '#1e3e78', 2);
  if (front) for (let i = 0; i < 4; i++) stroke(g, [[x + 10, y - 10 + i * 6], [x + 17, y - 8 + i * 6]], '#1e3e78', 2);
  const sk = front ? [[x - 9, y - 12], [x + 9, y - 12], [x + 10, y], [x + 6, y + 10], [x - 6, y + 10], [x - 10, y]] : [[x - 4, y - 13], [x + 9, y - 11], [x + 13, y - 2], [x + 10, y + 9], [x, y + 10], [x - 4, y]];
  part(g, sk, BONE, { sd: 1.8 });
  const eyes = front ? [[x - 4.5, y - 3], [x + 4.5, y - 3]] : [[x + 6, y - 3]];
  for (const [ex, ey] of eyes) { g.fillStyle = '#081210'; g.beginPath(); g.ellipse(ex, ey, 2.8, 3, 0, 0, Math.PI * 2); g.fill(); glow(g, ex, ey - 2, 8 * hot, TEAL, 0.95); glow(g, ex, ey - 6, 5 * hot, TEAL, 0.6); }
  g.fillStyle = '#081210'; for (let i = 0; i < (front ? 4 : 3); i++) g.fillRect((front ? x - 4 : x + 2) + i * 2.4, y + 5, 1.2, 3);
  part(g, front ? [[x - 3, y + 10], [x + 3, y + 10], [x + 2, y + 22], [x - 2, y + 22]] : [[x + 4, y + 10], [x + 9, y + 10], [x + 8, y + 22], [x + 5, y + 22]], LAPIS, { sd: 0.8, lw: 1.1 });
  part(g, front ? [[x - 3, y - 20], [x, y - 28], [x + 3, y - 20]] : [[x + 3, y - 20], [x + 8, y - 27], [x + 9, y - 19]], GOLD, { sd: 0.6, lw: 1 });
}
function crook(g, h, psi, t) { g.save(); alongPsi(g, h, psi); part(g, [[-6, -2], [64, -2], [64, 2], [-6, 2]], GOLD, { sd: 0.8, lw: 1.2 }); for (let i = 0; i < 6; i++) stroke(g, [[i * 11, -2.2], [i * 11 + 5, 2.2]], '#1e3e78', 2); part(g, [[60, -3], [74, -6], [78, -16], [72, -22], [70, -16], [72, -10], [62, 3]], GOLD, { sd: 1, lw: 1.2 }); g.restore(); }
function flail(g, h, psi, t) {
  g.save(); alongPsi(g, h, psi); part(g, [[-4, -2], [26, -2], [26, 2], [-4, 2]], GOLD, { sd: 0.6, lw: 1.1 });
  for (let i = 0; i < 3; i++) { const a = (i - 1) * 0.4 + Math.sin(t * 3 + i) * 0.15; strip(g, [[26, 0], [26 + Math.cos(a) * 14, Math.sin(a) * 14], [26 + Math.cos(a) * 26, Math.sin(a) * 26 + 4]], 4, 2, LAPIS, t, 1, i); }
  g.restore();
}
function bandageTail(g, hip, t, n = 5) {
  for (let i = 0; i < n; i++) { const k = i / (n - 1) - 0.5; strip(g, [[hip[0] + k * 18, hip[1]], [hip[0] + k * 22 - 6, hip[1] + 26], [hip[0] + k * 26 - 18, hip[1] + 50], [hip[0] + k * 30 - 34, hip[1] + 66]], 10 - Math.abs(k) * 6, 1.5, i % 2 ? WRAP2 : far(WRAP2), t, 8, i); }
}

export function side(g, t, phase, attack) {
  const hot = phase > 1 ? 1.4 : 1, fl = -24 + Math.sin(t * 1.4) * 3; // floats above the ground
  const R = rig('mage', { gait: true, t, moving: 0, walk: 0, attack: attack ?? -1, snappy: attack != null });
  g.save(); g.scale(R.flip, 1); g.translate(0, fl);
  const C = chestFrame(R, 0.05), hp = P(R.hip);
  lid(g, C(-28, -100), t, hot);
  for (let i = 0; i < 3; i++) strip(g, [C(-6, -128 + i * 10), C(-30, -130 + i * 12), C(-56 - i * 6, -128 + i * 16)], 6, 1, WRAP2, t, 7, i + 4); // strips flying back
  const sB = P(R.sB), hB = reach(sB, P(R.hB), 1.3), eB = reach(sB, P(R.eB), 1.25);
  flail(g, hB, R.psiB ?? 0.6, t);
  part(g, limb(sB, eB, 9, 7), far(WRAP), { sd: 1.8 }); part(g, limb(eB, hB, 7, 6), far(WRAP2), { sd: 1.6 });
  const l2B = C(-4, -104), e2B = [l2B[0] + 8, l2B[1] + 18], h2B = [e2B[0] + 20, e2B[1] - 4 + Math.sin(t * 2) * 3];
  part(g, limb(l2B, e2B, 7, 6), far(WRAP2), { sd: 1.6 }); part(g, limb(e2B, h2B, 5, 4), far(BONE), { sd: 1.4 }); talons(g, h2B, 0.1, 12, far(BONE), 4);
  bandageTail(g, [hp[0], hp[1] - 6], t);
  part(g, [C(-11, -132), C(-12, -106), C(-8, -86), C(10, -86), C(14, -106), C(12, -132), C(2, -138)], WRAP, { sd: 2.6, lw: 1.8 });
  for (let i = 0; i < 5; i++) stroke(g, [C(-11, -128 + i * 9), C(13, -124 + i * 9 - 4)], 'rgba(80,60,30,.55)', 1.2);
  part(g, [C(-12, -132), C(12, -132), C(16, -122), C(-14, -120)], GOLD, { sd: 1.4 }); // collar
  for (let i = 0; i < 4; i++) stroke(g, [C(-11 + i * 7, -131), C(-10 + i * 7, -122)], '#1e3e78', 2);
  const ank = C(4, -108); glow(g, ...ank, 12 * hot, TEAL, 0.8); stroke(g, [[ank[0], ank[1] - 6], [ank[0], ank[1] + 8]], '#e8fffa', 1.6); stroke(g, [[ank[0] - 5, ank[1] - 1], [ank[0] + 5, ank[1] - 1]], '#e8fffa', 1.6); g.strokeStyle = '#e8fffa'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(ank[0], ank[1] - 9, 3, 3.6, 0, 0, Math.PI * 2); g.stroke();
  const l2 = C(10, -104), e2 = [l2[0] + 10, l2[1] + 16], h2 = [e2[0] + 22, e2[1] - 6 + Math.sin(t * 2 + 1) * 3];
  part(g, limb(l2, e2, 8, 6), WRAP2, { sd: 1.6 }); part(g, limb(e2, h2, 6, 4), BONE, { sd: 1.4 }); talons(g, h2, -0.1, 13, BONE, 4);
  skull(g, C(8, -150), false, t, hot);
  const sF = P(R.sF), h = reach(sF, P(R.hF), 1.25), e = reach(sF, P(R.eF), 1.2);
  crook(g, h, R.psi, t);
  part(g, limb(sF, e, 10, 8), WRAP, { sd: 2 }); part(g, limb(e, h, 8, 6), WRAP2, { sd: 1.8 });
  talons(g, h, R.psi - Math.PI / 2, 6, BONE, 4);
  g.restore();
}

export function front(g, t, phase) {
  const hot = phase > 1 ? 1.4 : 1, B = body({ t }, 'mage', { sw: 16 }), y0 = B.hipY, fl = -24 + Math.sin(t * 1.4) * 3;
  g.save(); g.translate(0, fl);
  lid(g, [0, y0 - 40], t, hot);
  for (let i = 0; i < 7; i++) { const k = i / 6 - 0.5; strip(g, [[k * 22, y0], [k * 30, y0 + 24], [k * 40 + Math.sin(t + i) * 4, y0 + 52], [k * 48, y0 + 68]], 10 - Math.abs(k) * 8, 1.5, i % 2 ? WRAP2 : far(WRAP2), t, 6, i); }
  part(g, [[-14, y0 - 54], [-15, y0 - 28], [-9, y0 - 4], [9, y0 - 4], [15, y0 - 28], [14, y0 - 54], [0, y0 - 60]], WRAP, { sd: 2.6, lw: 1.8 });
  for (let i = 0; i < 5; i++) stroke(g, [[-14, y0 - 48 + i * 9], [14, y0 - 52 + i * 9]], 'rgba(80,60,30,.55)', 1.2);
  part(g, [[-18, y0 - 56], [18, y0 - 56], [14, y0 - 44], [-14, y0 - 44]], GOLD, { sd: 1.4 });
  glow(g, 0, y0 - 32, 12 * hot, TEAL, 0.8);
  for (const s of [-1, 1]) {
    const S = [s * 17, y0 - 52], e = [s * 30, y0 - 32], h = [s * 30, y0 - 14];
    if (s > 0) crook(g, h, Math.PI - 0.15, t); else flail(g, h, Math.PI + 0.3, t);
    part(g, limb(S, e, 10, 8), WRAP, { sd: 2 }); part(g, limb(e, h, 8, 6), WRAP2, { sd: 1.8 });
    const l2 = [s * 12, y0 - 34], e2 = [s * 32, y0 - 20], h2 = [s * 42, y0 - 30 + Math.sin(t * 2 + s) * 3];
    part(g, limb(l2, e2, 8, 6), WRAP2, { sd: 1.6 }); part(g, limb(e2, h2, 6, 4), BONE, { sd: 1.4 }); talons(g, h2, s > 0 ? -0.3 : Math.PI + 0.3, 12, BONE, 4);
  }
  skull(g, [0, y0 - 72], true, t, hot);
  g.restore();
}
export const GLOW = 'rgba(90,255,224,.35)';
