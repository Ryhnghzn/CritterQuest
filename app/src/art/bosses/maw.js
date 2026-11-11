// Raja Maw (spec §41.2): a hunched glutton demon whose belly is a huge toothed maw that opens and
// shuts, a small head with a cluster of five red eyes and a tilted tarnished crown, eyes on stalks
// along its back, very long arms dragging huge claws, shadow tendrils writhing from its back.
import { rig } from '../hero/rig.js';
import { body } from '../anime/common.js';
import { P, part, stroke, glow, pal, far, limb, chestFrame, reach, talons, digiLeg, strip } from './kit.js';

const HIDE = pal('#3e2650', { shade: '#170a22', hi: '#6e4a86', rim: 'rgba(255,90,160,.85)' });
const HIDE2 = pal('#2c1a3a', { shade: '#100618', hi: '#584070', rim: 'rgba(255,90,160,.7)' });
const BONE = pal('#e4d8c4', { shade: '#7a6a5a', hi: '#fffaf0', rim: 'rgba(255,120,170,.6)' });
const GUM = pal('#8a2a4a', { shade: '#3a0a1c', hi: '#d0507a', rim: null });
const CROWN = pal('#a8862a', { shade: '#4a3410', hi: '#ffe08a', rim: 'rgba(255,90,160,.7)' });
const SHADOW = pal('#1c1028', { shade: '#08040e', hi: '#3a2450', rim: 'rgba(200,120,255,.6)' });
const EYE = '#ff3a5a';

function eye(g, x, y, r, t, i, hot) {
  const blink = Math.sin(t * 1.3 + i * 2.1) > 0.97 ? 0.2 : 1;
  g.fillStyle = '#1a0610'; g.beginPath(); g.ellipse(x, y, r * 1.25, r * blink + 0.4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = hot > 1 ? '#ffd0d8' : EYE; g.beginPath(); g.ellipse(x + r * 0.15, y, r * 0.75, r * 0.75 * blink, 0, 0, Math.PI * 2); g.fill();
  glow(g, x, y, r * 3 * hot, EYE, 0.8);
}
// the belly maw: lips, two rows of fangs, a lolling tongue. c = centre, s = facing (+1 right, 0 front)
function maw(g, c, w, h, open, t, hot) {
  const [x, y] = c, o = h * (0.35 + 0.65 * open);
  part(g, [[x - w, y], [x - w * 0.6, y - o * 0.9], [x, y - o], [x + w * 0.6, y - o * 0.9], [x + w, y], [x + w * 0.6, y + o * 0.9], [x, y + o], [x - w * 0.6, y + o * 0.9]], GUM, { sd: 2, lw: 2 });
  g.fillStyle = '#12040a'; g.beginPath(); g.ellipse(x, y, w * 0.82, o * 0.72, 0, 0, Math.PI * 2); g.fill();
  glow(g, x, y, w * 0.9 * hot, '#ff4a8a', 0.55);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, fx = x - w * 0.8 + k * w * 1.6, edge = Math.sqrt(1 - ((k - 0.5) * 2) ** 2) * o * 0.72;
    part(g, [[fx - w * 0.09, y - edge], [fx, y - edge + o * 0.42], [fx + w * 0.09, y - edge]], BONE, { sd: 0.6, lw: 0.9 });
    part(g, [[fx - w * 0.08, y + edge], [fx + w * 0.02, y + edge - o * 0.36], [fx + w * 0.09, y + edge]], BONE, { sd: 0.6, lw: 0.9 });
  }
  strip(g, [[x - w * 0.2, y + o * 0.3], [x + w * 0.3, y + o * 0.9], [x + w * 0.5, y + o * 1.7]], w * 0.42, w * 0.2, pal('#d8507a', { shade: '#7a1a3a', hi: '#ff9ab8', rim: null }), t, 3);
}
function tendrils(g, root, t, side, n = 4) {
  for (let i = 0; i < n; i++) {
    const a = -2.2 - i * 0.35, L = 70 + i * 10, pts = [root, [root[0] + Math.cos(a) * L * 0.4, root[1] + Math.sin(a) * L * 0.4], [root[0] + Math.cos(a) * L * 0.75, root[1] + Math.sin(a) * L * 0.75 - 8], [root[0] + Math.cos(a) * L, root[1] + Math.sin(a) * L]];
    strip(g, pts, 10, 1, side > 0 ? SHADOW : far(SHADOW), t, 10, i * 1.7);
  }
}
function crown(g, x, y, tilt, Pl) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  part(g, [[-12, 0], [-13, -8], [-8, -4], [-4, -12], [0, -5], [5, -12], [8, -4], [13, -9], [12, 0]], Pl, { sd: 1.2, lw: 1.2 });
  glow(g, 0, -6, 5, '#ff4a8a', 0.6); g.restore();
}

export function side(g, t, phase, attack) {
  const hot = phase > 1 ? 1.4 : 1, open = 0.5 + 0.5 * Math.sin(t * 1.6) + (attack != null ? 0.4 : 0);
  const R = rig('warrior', { gait: true, t, moving: 0, walk: 0, attack: attack ?? -1, snappy: attack != null });
  g.save(); g.scale(R.flip, 1);
  const C = chestFrame(R, 0.4), hp = P(R.hip);
  tendrils(g, C(-14, -126), t, -1, 3);
  const sB = P(R.sB), hB = [reach(sB, P(R.hB), 1.6)[0], Math.min(-4, reach(sB, P(R.hB), 1.6)[1])], eB = reach(sB, P(R.eB), 1.4);
  part(g, limb(sB, eB, 15, 12), far(HIDE), { sd: 2.4 }); part(g, limb(eB, hB, 12, 10), far(HIDE2), { sd: 2.2 }); talons(g, hB, 0.6, 18, far(BONE), 4);
  digiLeg(g, P(R.hipB), P(R.kB), P(R.fB), far(HIDE2), far(BONE), 0.85);
  // bloated body bent forward
  part(g, [C(-26, -140), C(-34, -110), C(-24, -80), C(0, -70), C(30, -82), C(40, -110), C(30, -140), C(6, -150)], HIDE, { sd: 4, lw: 2 });
  for (let i = 0; i < 3; i++) stroke(g, [C(-24 + i * 4, -132 + i * 18), C(-30 + i * 3, -120 + i * 18)], 'rgba(10,4,16,.6)', 1.4);
  maw(g, C(22, -108), 17, 18, open, t, hot);
  digiLeg(g, P(R.hipF), P(R.kF), P(R.fF), HIDE2, BONE, 0.85);
  tendrils(g, C(-10, -132), t, 1, 4);
  for (const [i, k] of [[0, 0.3], [1, 0.55]]) { // eye stalks along the back
    const base = C(-18 + i * 10, -142 + i * 4), tip = [base[0] - 16 + Math.sin(t * 2 + i) * 4, base[1] - 30 - i * 6];
    strip(g, [base, [base[0] - 6, base[1] - 16], tip], 6, 4, HIDE2, t, 2, i);
    eye(g, tip[0], tip[1] - 2, 4.4, t, i + 7, hot);
  }
  // small head low on the shoulders: a bony face plate with five eyes, the crown
  const H = C(30, -150);
  part(g, [[H[0] - 12, H[1] - 6], [H[0] - 4, H[1] - 14], [H[0] + 10, H[1] - 12], [H[0] + 16, H[1] - 2], [H[0] + 12, H[1] + 8], [H[0] - 8, H[1] + 8]], BONE, { sd: 2 });
  for (const [i, [dx, dy, r]] of [[2, -6, 3.2], [9, -6, 3], [5, 1, 2.6], [12, 1, 2.2], [-3, 0, 2]].entries()) eye(g, H[0] + dx, H[1] + dy, r, t, i, hot);
  crown(g, H[0] - 2, H[1] - 14, -0.35, CROWN);
  const sF = P(R.sF), h = [reach(sF, P(R.hF), 1.6)[0], Math.min(-4, reach(sF, P(R.hF), 1.6)[1])], e = reach(sF, P(R.eF), 1.4);
  part(g, limb(sF, e, 17, 14), HIDE, { sd: 2.6 }); part(g, limb(e, h, 14, 11, 1.1), HIDE2, { sd: 2.4 });
  for (const k of [0.3, 0.55, 0.8]) { const p = [e[0] + (h[0] - e[0]) * k, e[1] + (h[1] - e[1]) * k]; part(g, [[p[0] - 3, p[1] - 2], [p[0] - 5, p[1] - 12], [p[0] + 3, p[1] - 3]], BONE, { sd: 0.6, lw: 1 }); }
  talons(g, h, attack != null ? R.psi - Math.PI / 2 : 0.4, 22, BONE, 4);
  g.restore();
}

export function front(g, t, phase) {
  const hot = phase > 1 ? 1.4 : 1, open = 0.5 + 0.5 * Math.sin(t * 1.6), B = body({ t }, 'warrior', { sw: 24 }), y0 = B.hipY + 8;
  for (const s of [-1, 1]) { g.save(); g.scale(s, 1); tendrils(g, [16, y0 - 54], t, 1, 4); g.restore(); }
  for (const leg of [B.L, B.R]) {
    const [hx, hy] = leg.hip, [kx, ky] = leg.knee, [ax, ay] = leg.ank, sx = Math.sign(hx);
    part(g, limb([hx * 1.8, hy + 8], [kx * 2, ky + 6], 22, 16), HIDE2, { sd: 3 });
    part(g, limb([kx * 2, ky + 6], [ax * 1.9, ay], 15, 11), HIDE2, { sd: 2.6 });
    talons(g, [ax * 1.9, ay + 4], Math.PI / 2 - sx * 0.3, 11, BONE);
  }
  part(g, [[-40, y0 - 50], [-46, y0 - 20], [-32, y0 + 6], [0, y0 + 12], [32, y0 + 6], [46, y0 - 20], [40, y0 - 50], [0, y0 - 64]], HIDE, { sd: 4, lw: 2 });
  maw(g, [0, y0 - 18], 28, 20, open, t, hot);
  for (const s of [-1, 1]) {
    const S = [s * 32, y0 - 46], e = [s * 50, y0 - 12], h = [s * 46, -6];
    part(g, limb(S, e, 17, 14), HIDE, { sd: 2.6 }); part(g, limb(e, h, 14, 11), HIDE2, { sd: 2.4 });
    talons(g, h, Math.PI / 2 - s * 0.3, 20, BONE, 4);
    const base = [s * 20, y0 - 60], tip = [s * (30 + Math.sin(t * 2 + s) * 4), y0 - 92];
    strip(g, [base, [s * 24, y0 - 76], tip], 6, 4, HIDE2, t, 2, s);
    eye(g, tip[0], tip[1] - 2, 4.4, t, s + 9, hot);
  }
  const H = [0, y0 - 70];
  part(g, [[H[0] - 14, H[1] - 4], [H[0] - 10, H[1] - 14], [H[0] + 10, H[1] - 14], [H[0] + 14, H[1] - 4], [H[0] + 9, H[1] + 8], [H[0] - 9, H[1] + 8]], BONE, { sd: 2 });
  for (const [i, [dx, dy, r]] of [[-6, -6, 3], [6, -6, 3], [0, -1, 3.2], [-9, 2, 2.2], [9, 2, 2.2]].entries()) eye(g, H[0] + dx, H[1] + dy, r, t, i, hot);
  crown(g, H[0] + 2, H[1] - 14, 0.25, CROWN);
}
export const GLOW = 'rgba(200,60,140,.5)';
