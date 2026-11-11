// Sang Gerhana (spec §41.2): a floating titan of the void — long dark robes fraying into motes, an
// eclipse behind the head (a black disc with a gold corona), a smooth faceless mask with one
// crescent eye, a collar of gold spikes, six thin arms fanned out, each holding a void orb.
import { rig } from '../hero/rig.js';
import { body } from '../anime/common.js';
import { P, part, stroke, glow, pal, far, limb, chestFrame, reach, talons, strip, TAU } from './kit.js';

const ROBE = pal('#1e1430', { shade: '#08040e', hi: '#3e2c5a', rim: 'rgba(199,155,255,.85)' });
const ROBE2 = pal('#2a1c42', { shade: '#0c0618', hi: '#4e3a70', rim: 'rgba(199,155,255,.7)' });
const MASK = pal('#e8e2f0', { shade: '#7a7088', hi: '#ffffff', rim: 'rgba(199,155,255,.8)' });
const GOLD = pal('#e0b040', { shade: '#7a5a10', hi: '#fff0a0', rim: 'rgba(199,155,255,.6)' });
const SKIN = pal('#3a2c50', { shade: '#140c22', hi: '#6a5888', rim: 'rgba(199,155,255,.7)' });
const VOID = '#a06ad8', CORONA = '#ffe08a';

function eclipseDisc(g, [x, y], R, t, hot) {
  glow(g, x, y, R * 1.9 * hot, CORONA, 0.45);
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = CORONA; g.lineWidth = 2;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + t * 0.3, L = R * (1.15 + 0.25 * Math.sin(t * 3 + i * 1.7)); g.beginPath(); g.moveTo(x + Math.cos(a) * R * 1.02, y + Math.sin(a) * R * 1.02); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  g.restore();
  g.fillStyle = '#05020a'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  g.strokeStyle = '#fff6c8'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
}
function orb(g, [x, y], t, i, hot) {
  glow(g, x, y, 12 * hot, VOID, 0.9);
  g.fillStyle = '#0a0414'; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
  g.strokeStyle = '#e0c8ff'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 5 + Math.sin(t * 4 + i) * 0.8, 0, TAU); g.stroke();
}
function mask(g, [x, y], front, t, hot) {
  part(g, front ? [[x - 9, y - 10], [x, y - 14], [x + 9, y - 10], [x + 10, y + 4], [x, y + 14], [x - 10, y + 4]] : [[x - 5, y - 11], [x + 6, y - 12], [x + 12, y - 2], [x + 8, y + 12], [x - 3, y + 12], [x - 6, y]], MASK, { sd: 1.8 });
  const ex = front ? x : x + 6, ey = y - 2;
  g.fillStyle = '#12061e'; g.beginPath(); g.arc(ex, ey, 4, -1.6, 1.6); g.arc(ex - 1.8, ey, 3.4, 1.4, -1.4, true); g.closePath(); g.fill();
  glow(g, ex, ey, 9 * hot, VOID, 0.95);
}
function collar(g, pts) { for (const [x, y, a] of pts) part(g, [[x - 3, y], [x + Math.cos(a) * 14, y + Math.sin(a) * 14], [x + 3, y]], GOLD, { sd: 0.8, lw: 1.1 }); }
function robeHem(g, top, w, t, n = 7) {
  for (let i = 0; i < n; i++) { const k = i / (n - 1) - 0.5; strip(g, [[top[0] + k * w * 0.6, top[1]], [top[0] + k * w * 0.9, top[1] + 40], [top[0] + k * w * 1.2 + Math.sin(t + i) * 5, top[1] + 74]], 18 - Math.abs(k) * 10, 1, i % 2 ? ROBE : ROBE2, t, 6, i); }
}

export function side(g, t, phase, attack) {
  const hot = phase > 1 ? 1.5 : 1, fl = -26 + Math.sin(t * 1.2) * 4;
  const R = rig('mage', { gait: true, t, moving: 0, walk: 0, attack: attack ?? -1, snappy: attack != null });
  g.save(); g.scale(R.flip, 1); g.translate(0, fl);
  const C = chestFrame(R, 0);
  eclipseDisc(g, C(-12, -168), 26, t, hot);
  const arms = (far2) => [[-110, 0.55], [-96, 0.2], [-82, -0.15]].map(([y, a], i) => {
    const S = C(far2 ? -6 : 8, y - 20), d = 34 + i * 4, e = [S[0] + Math.cos(a + (far2 ? 0.5 : 0)) * d * 0.5, S[1] + Math.sin(a) * d * 0.5 + 6], h = [S[0] + Math.cos(a + (far2 ? 0.5 : 0)) * d, S[1] + Math.sin(a) * d - 4 + Math.sin(t * 1.6 + i) * 3];
    return { S, e, h, i };
  });
  for (const a of arms(true)) { part(g, limb(a.S, a.e, 6, 5), far(SKIN), { sd: 1.4 }); part(g, limb(a.e, a.h, 5, 4), far(SKIN), { sd: 1.2 }); orb(g, a.h, t, a.i + 3, hot); }
  robeHem(g, C(0, -90), 44, t);
  part(g, [C(-16, -138), C(-20, -100), C(-14, -80), C(16, -80), C(20, -100), C(14, -138), C(0, -146)], ROBE, { sd: 3, lw: 1.8 });
  for (let i = 0; i < 3; i++) stroke(g, [C(-12 + i * 9, -132), C(-14 + i * 10, -84)], 'rgba(160,106,216,.35)', 1.2);
  collar(g, [[...C(-12, -140), -2.4], [...C(-4, -144), -1.9], [...C(6, -144), -1.3], [...C(14, -140), -0.8]]);
  mask(g, C(4, -158), false, t, hot);
  for (const a of arms(false)) { part(g, limb(a.S, a.e, 7, 6), SKIN, { sd: 1.6 }); part(g, limb(a.e, a.h, 6, 4), SKIN, { sd: 1.4 }); talons(g, a.h, 0, 6, SKIN, 3); orb(g, a.h, t, a.i, hot); }
  const sF = P(R.sF), h = reach(sF, P(R.hF), 1.3), e = reach(sF, P(R.eF), 1.25);
  part(g, limb(sF, e, 9, 7), ROBE2, { sd: 1.8 }); part(g, limb(e, h, 7, 5), SKIN, { sd: 1.6 });
  orb(g, h, t, 9, hot * 1.3);
  g.restore();
}

export function front(g, t, phase) {
  const hot = phase > 1 ? 1.5 : 1, B = body({ t }, 'mage', { sw: 18 }), y0 = B.hipY, fl = -26 + Math.sin(t * 1.2) * 4;
  g.save(); g.translate(0, fl);
  eclipseDisc(g, [0, y0 - 92], 28, t, hot);
  robeHem(g, [0, y0 - 4], 60, t, 9);
  part(g, [[-20, y0 - 58], [-24, y0 - 20], [-16, y0 + 2], [16, y0 + 2], [24, y0 - 20], [20, y0 - 58], [0, y0 - 66]], ROBE, { sd: 3, lw: 1.8 });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const S = [s * 18, y0 - 54 + i * 12], e = [s * (34 + i * 4), y0 - 64 + i * 18], h = [s * (52 + i * 6), y0 - 74 + i * 26 + Math.sin(t * 1.6 + i + s) * 3];
    part(g, limb(S, e, 7, 6), SKIN, { sd: 1.6 }); part(g, limb(e, h, 6, 4), SKIN, { sd: 1.4 }); orb(g, h, t, i + (s > 0 ? 3 : 0), hot);
  }
  collar(g, [[-14, y0 - 62, -2.4], [-6, y0 - 66, -1.9], [6, y0 - 66, -1.3], [14, y0 - 62, -0.8]]);
  mask(g, [0, y0 - 78], true, t, hot);
  g.restore();
}
export const GLOW = 'rgba(160,100,255,.5)';
