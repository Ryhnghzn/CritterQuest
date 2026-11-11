// Ratu Spora (spec §41.2): a fungal queen with no legs — a skirt of writhing roots — a thin ribbed
// body laced with vines, long root-fingered arms, a porcelain mask with hollow violet eyes under a
// huge scalloped mushroom cap that drips glowing spore strands, a staff grown from fungus.
import { rig } from '../hero/rig.js';
import { body, ELEMENTS } from '../anime/common.js';
import { staff } from '../anime/mage.js';
import { P, part, stroke, glow, pal, far, limb, chestFrame, reach, talons, strip } from './kit.js';

const SPORE_E = { ...ELEMENTS.holy, name: 'Spora', edge: '#7ad04a', core: '#f0ffd0', glow: '#9dff6a', rune: '#d98aff' };
const CAP = pal('#6a2a6a', { shade: '#2a0a2a', hi: '#a85aa8', rim: 'rgba(183,255,106,.85)' });
const GILL = pal('#c8a0b0', { shade: '#6a4a5a', hi: '#f0d8e0', rim: null });
const MASK = pal('#e8e0d4', { shade: '#8a8078', hi: '#ffffff', rim: 'rgba(183,255,106,.6)' });
const ROOT = pal('#4a3a2c', { shade: '#1a120c', hi: '#7a6450', rim: 'rgba(183,255,106,.6)' });
const BARK = pal('#5a4a3a', { shade: '#221810', hi: '#8a7660', rim: 'rgba(183,255,106,.7)' });
const LIME = '#b7ff6a', VIOLET = '#d98aff';

function cap(g, c, w, tilt, t, hot) {
  g.save(); g.translate(c[0], c[1]); g.rotate(tilt);
  const n = 9, rim = [];
  for (let i = 0; i <= n; i++) { const k = i / n, x = -w + k * w * 2; rim.push([x, 0], ...(i < n ? [[x + w / n, 7]] : [])); }
  part(g, [[-w, 0], [-w * 0.86, -w * 0.42], [-w * 0.5, -w * 0.66], [0, -w * 0.74], [w * 0.5, -w * 0.66], [w * 0.86, -w * 0.42], ...rim.reverse()], CAP, { sd: 4, lw: 2 });
  part(g, [[-w * 0.9, 2], [w * 0.9, 2], [w * 0.6, 9], [-w * 0.6, 9]], GILL, { sd: 1, lw: 1.2 });
  for (let i = -6; i <= 6; i++) stroke(g, [[i * w * 0.13, 3], [i * w * 0.1, 9]], 'rgba(60,30,50,.6)', 0.8);
  for (const [x, y, s] of [[-0.6, -0.36, 0.13], [-0.15, -0.58, 0.1], [0.32, -0.5, 0.15], [0.72, -0.28, 0.1], [0.05, -0.28, 0.08]]) {
    glow(g, x * w, y * w, s * w * 2.2 * hot, LIME, 0.7);
    part(g, [[x * w - s * w, y * w], [x * w, y * w - s * w * 0.7], [x * w + s * w, y * w], [x * w, y * w + s * w * 0.7]], pal(LIME, { shade: '#4a8a1a', hi: '#f0ffd0', rim: null }), { sd: 0.4, lw: 0.8 });
  }
  for (const [i, x] of [-0.85, -0.55, -0.2, 0.25, 0.6, 0.9].entries()) { // spore strands hanging from the rim
    const L = 18 + (i % 3) * 8 + Math.sin(t * 2 + i) * 3;
    stroke(g, [[x * w, 6], [x * w + Math.sin(t * 1.5 + i) * 3, 6 + L]], '#8a6a8a', 1);
    glow(g, x * w + Math.sin(t * 1.5 + i) * 3, 7 + L, 5 * hot, LIME, 0.9);
  }
  g.restore();
}
function mask(g, [x, y], front, t, hot) {
  const pts = front ? [[x - 9, y - 8], [x + 9, y - 8], [x + 10, y + 4], [x + 4, y + 14], [x - 4, y + 14], [x - 10, y + 4]]
    : [[x - 6, y - 8], [x + 8, y - 8], [x + 12, y + 2], [x + 6, y + 14], [x - 4, y + 12], [x - 7, y + 2]];
  part(g, pts, MASK, { sd: 1.6 });
  const eyes = front ? [[x - 4.5, y - 1], [x + 4.5, y - 1]] : [[x + 5, y - 1]];
  for (const [ex, ey] of eyes) { g.fillStyle = '#12060e'; g.beginPath(); g.ellipse(ex, ey, 2.6, 3.6, 0, 0, Math.PI * 2); g.fill(); glow(g, ex, ey, 6 * hot, VIOLET, 0.9); g.fillStyle = '#fbe8ff'; g.fillRect(ex - 0.6, ey - 0.6, 1.2, 1.2); }
  stroke(g, front ? [[x - 3, y + 8], [x + 3, y + 8]] : [[x + 3, y + 8], [x + 8, y + 7]], 'rgba(40,20,30,.7)', 1);
}
function rootSkirt(g, hip, t, n = 7, width = 40) {
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1) - 0.5, x0 = hip[0] + k * width * 0.6, end = [hip[0] + k * width * 1.8 + Math.sin(t * 1.2 + i) * 4, 4];
    strip(g, [[x0, hip[1]], [x0 + k * width * 0.5, hip[1] * 0.5], [end[0], end[1] - 12], end], 13 - Math.abs(k) * 6, 1, i % 2 ? ROOT : far(ROOT), t, 3, i);
  }
}

export function side(g, t, phase, attack) {
  const hot = phase > 1 ? 1.4 : 1;
  const R = rig('mage', { gait: true, t, moving: 0, walk: 0, attack: attack ?? -1, snappy: attack != null });
  g.save(); g.scale(R.flip, 1);
  const C = chestFrame(R, -0.06), hp = P(R.hip);
  const sB = P(R.sB), hB = reach(sB, P(R.hB), 1.4), eB = reach(sB, P(R.eB), 1.3);
  part(g, limb(sB, eB, 9, 7), far(BARK), { sd: 1.8 }); part(g, limb(eB, hB, 7, 5), far(ROOT), { sd: 1.6 }); talons(g, hB, 1.0, 14, far(ROOT), 4);
  rootSkirt(g, [hp[0], hp[1] + 4], t);
  part(g, [C(-10, -130), C(-12, -104), C(-6, -84), C(10, -84), C(14, -104), C(12, -130), C(2, -136)], BARK, { sd: 2.6, lw: 1.8 });
  for (let i = 0; i < 4; i++) stroke(g, [C(-8, -124 + i * 9), C(2, -120 + i * 9), C(12, -124 + i * 9)], 'rgba(20,12,8,.7)', 1.2);
  strip(g, [C(-10, -128), C(4, -110), C(-6, -96), C(8, -86)], 3, 2, pal('#3a6a22', { shade: '#123010', hi: '#7ac04a', rim: null }), t, 1);
  glow(g, ...C(2, -112), 12 * hot, LIME, 0.6);
  part(g, limb(C(0, -134), C(4, -144), 7, 6), BARK, { sd: 1.4 });
  mask(g, C(6, -152), false, t, hot);
  cap(g, C(2, -160), 46, -0.08 + Math.sin(t * 0.9) * 0.03, t, hot);
  const sF = P(R.sF), h = reach(sF, P(R.hF), 1.3), e = reach(sF, P(R.eF), 1.25);
  staff(g, h, R.psi, SPORE_E, t, R.cast, 1.35, 5);
  part(g, limb(sF, e, 10, 8), BARK, { sd: 2 }); part(g, limb(e, h, 8, 6), ROOT, { sd: 1.8 });
  talons(g, h, R.psi - Math.PI / 2, 8, ROOT, 4);
  g.restore();
}

export function front(g, t, phase) {
  const hot = phase > 1 ? 1.4 : 1, B = body({ t }, 'mage', { sw: 16 }), y0 = B.hipY;
  rootSkirt(g, [0, y0 + 6], t, 9, 54);
  part(g, [[-14, y0 - 52], [-16, y0 - 26], [-8, y0 - 4], [8, y0 - 4], [16, y0 - 26], [14, y0 - 52], [0, y0 - 58]], BARK, { sd: 2.6, lw: 1.8 });
  for (let i = 0; i < 4; i++) stroke(g, [[-12, y0 - 46 + i * 9], [0, y0 - 42 + i * 9], [12, y0 - 46 + i * 9]], 'rgba(20,12,8,.7)', 1.2);
  glow(g, 0, y0 - 32, 12 * hot, LIME, 0.6);
  for (const [a, s] of [[B.aL, -1], [B.aR, 1]]) {
    const S = [a.S[0] * 1.1, a.S[1]], e = [s * 30, y0 - 26], h = [s * 34, y0 - 2];
    if (s > 0) staff(g, h, Math.PI - 0.2, SPORE_E, t, 0, 1.35, 5);
    part(g, limb(S, e, 10, 8), BARK, { sd: 2 }); part(g, limb(e, h, 8, 6), ROOT, { sd: 1.8 });
    talons(g, h, Math.PI / 2 - s * 0.4, 9, ROOT, 4);
  }
  part(g, limb([0, y0 - 56], [0, y0 - 64], 7, 6), BARK, { sd: 1.4 });
  mask(g, [0, y0 - 72], true, t, hot);
  cap(g, [0, y0 - 80], 50, Math.sin(t * 0.9) * 0.03, t, hot);
}
export const GLOW = 'rgba(140,255,110,.4)';
