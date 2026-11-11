// Golem Kristal (spec §41.2): a colossus of dark rock and blue crystal — huge stacked shoulders, a
// tiny helmed head with a glowing V visor, a hexagonal crystal heart, crystals bursting from the
// back and joints, a stone slab shield on one arm and the other forearm grown into a faceted
// crystal blade that swings like the heroes' greatsword.
import { rig } from '../hero/rig.js';
import { body } from '../anime/common.js';
import { P, part, stroke, glow, pal, far, limb, chestFrame, reach, alongPsi } from './kit.js';

const ROCK = pal('#3e4352', { shade: '#1a1c26', hi: '#727a8e', rim: 'rgba(130,220,255,.8)' });
const ROCK2 = pal('#2e3240', { shade: '#12141c', hi: '#5a6276', rim: 'rgba(130,220,255,.7)' });
const CRY = pal('#4aa8e8', { shade: '#1a4a8a', hi: '#d8f6ff', rim: 'rgba(255,255,255,.9)' });
const CRY2 = pal('#7ac8ff', { shade: '#2a6aa8', hi: '#ffffff', rim: 'rgba(255,255,255,.9)' });
const ICE = '#7fd8ff';

const shard = (g, x, y, h, w, lean, Pl) => part(g, [[x - w, y], [x + lean, y - h], [x + w, y]], Pl, { sd: 1.4, lw: 1.3 });
function shine(g, pts, t) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3); stroke(g, pts, '#e8fbff', 1.2); g.restore(); }
function blade(g, h, psi, t, hot) {
  g.save(); alongPsi(g, h, psi);
  glow(g, 60, 0, 60 * hot, ICE, 0.45);
  part(g, [[-8, -12], [10, -16], [40, -20], [96, -12], [128, 0], [96, 12], [40, 18], [10, 14], [-8, 10]], CRY, { sd: 3, lw: 1.8 });
  shine(g, [[12, -8], [70, -10], [124, 0]], t); shine(g, [[14, 6], [80, 8]], t + 1);
  for (const [x, s] of [[30, -1], [62, 1], [86, -1]]) shard(g, x, s * 16, 12, 5, 6, CRY2);
  g.restore();
}
function heart(g, [x, y], t, hot) {
  glow(g, x, y, 24 * hot, ICE, 0.8);
  part(g, [[x - 9, y], [x - 4.5, y - 8], [x + 4.5, y - 8], [x + 9, y], [x + 4.5, y + 8], [x - 4.5, y + 8]], CRY2, { sd: 1.4, lw: 1.3 });
  glow(g, x, y, 7, '#ffffff', 0.9);
}
function shoulder(g, S, s, Pl, C2) {
  const [x, y] = S;
  part(g, [[x - 18 * s, y + 6], [x - 14 * s, y - 12], [x + 4 * s, y - 20], [x + 20 * s, y - 10], [x + 18 * s, y + 8], [x, y + 4]], Pl, { sd: 2.4 });
  part(g, [[x - 14 * s, y - 2], [x - 10 * s, y - 16], [x + 8 * s, y - 24], [x + 22 * s, y - 14]], Pl, { sd: 1.6 });
  shard(g, x - 2 * s, y - 20, 22, 5, 4 * s, C2); shard(g, x + 10 * s, y - 20, 16, 4, 8 * s, C2);
}
function helm(g, [x, y], front, t, hot, phase) {
  part(g, front ? [[x - 9, y + 6], [x - 10, y - 8], [x, y - 14], [x + 10, y - 8], [x + 9, y + 6], [x, y + 9]] : [[x - 8, y + 6], [x - 8, y - 8], [x + 2, y - 14], [x + 10, y - 8], [x + 12, y + 2], [x + 6, y + 8]], ROCK2, { sd: 1.8 });
  g.fillStyle = phase > 1 ? '#ffffff' : '#bff4ff';
  g.beginPath(); if (front) { g.moveTo(x - 7, y - 3); g.lineTo(x, y + 2); g.lineTo(x + 7, y - 3); g.lineTo(x + 7, y - 1); g.lineTo(x, y + 4); g.lineTo(x - 7, y - 1); } else { g.moveTo(x + 2, y - 3); g.lineTo(x + 7, y + 1); g.lineTo(x + 12, y - 4); g.lineTo(x + 12, y - 2); g.lineTo(x + 7, y + 3); g.lineTo(x + 2, y - 1); } g.fill();
  glow(g, front ? x : x + 7, y, 9 * hot, ICE, 0.9);
  for (const [dx, h, l] of [[-5, 16, -6], [1, 22, -1], [6, 14, 4]]) shard(g, x + dx, y - 12, h, 3.4, l, CRY2);
}

export function side(g, t, phase, attack) {
  const hot = phase > 1 ? 1.4 : 1;
  const R = rig('warrior', { gait: true, t, moving: 0, walk: 0, attack: attack ?? -1, snappy: attack != null });
  g.save(); g.scale(R.flip, 1);
  const C = chestFrame(R, 0.08);
  for (const [x, y, h, w, l] of [[-22, -126, 46, 7, -14], [-12, -134, 58, 8, -4], [-2, -130, 40, 6, 6], [-28, -112, 34, 6, -18]]) shard(g, ...C(x, y), h, w, l, CRY);
  const sB = P(R.sB), hB = reach(sB, P(R.hB), 1.1), eB = reach(sB, P(R.eB), 1.08);
  part(g, limb(sB, eB, 20, 17), far(ROCK), { sd: 2.6 }); part(g, limb(eB, hB, 17, 15), far(ROCK2), { sd: 2.4 });
  part(g, [[hB[0] - 26, hB[1] - 30], [hB[0] + 4, hB[1] - 36], [hB[0] + 14, hB[1] + 6], [hB[0] + 4, hB[1] + 34], [hB[0] - 22, hB[1] + 30], [hB[0] - 32, hB[1]]], far(ROCK2), { sd: 3 });
  shard(g, hB[0] - 18, hB[1] - 4, 18, 5, -8, far(CRY));
  for (const [hip, k, f, Pl] of [[R.hipB, R.kB, R.fB, far(ROCK)], [R.hipF, R.kF, R.fF, ROCK]]) {
    if (Pl === ROCK) {
      part(g, [C(-28, -132), C(-34, -110), C(-24, -86), C(22, -84), C(34, -106), C(30, -132), C(4, -144)], ROCK, { sd: 4, lw: 2 });
      stroke(g, [C(-20, -128), C(-8, -110), C(-14, -94)], 'rgba(10,12,20,.8)', 1.6);
      heart(g, C(6, -112), t, hot);
      if (phase > 1) { g.save(); g.globalCompositeOperation = 'lighter'; stroke(g, [C(-24, -126), C(-12, -112), C(-20, -96)], '#9fe8ff', 2); stroke(g, [C(26, -122), C(16, -108), C(22, -94)], '#9fe8ff', 2); g.restore(); }
    }
    const [hp, kp, fp] = [P(hip), P(k), P(f)];
    part(g, limb(hp, kp, 26, 22), Pl, { sd: 3 }); part(g, limb(kp, [fp[0], fp[1] - 4], 22, 20), Pl, { sd: 3 });
    part(g, [[fp[0] - 12, fp[1] - 8], [fp[0] + 14, fp[1] - 8], [fp[0] + 20, fp[1] + 4], [fp[0] - 12, fp[1] + 4]], Pl === ROCK ? ROCK2 : far(ROCK2), { sd: 1.6 });
    part(g, [[kp[0] - 6, kp[1]], [kp[0], kp[1] - 8], [kp[0] + 6, kp[1]], [kp[0], kp[1] + 6]], Pl === ROCK ? CRY2 : far(CRY2), { sd: 1, lw: 1.2 });
  }
  helm(g, C(10, -148), false, t, hot, phase);
  shoulder(g, P(R.sB), -1, far(ROCK2), far(CRY));
  const sF = P(R.sF), h = reach(sF, P(R.hF), 1.1), e = reach(sF, P(R.eF), 1.08);
  const behind = R.psi > 2.2 && R.psi < 4.2;
  if (behind) blade(g, h, R.psi, t, hot);
  part(g, limb(sF, e, 21, 18), ROCK, { sd: 2.8 }); part(g, limb(e, h, 18, 16, 1.1), ROCK2, { sd: 2.6 });
  if (!behind) blade(g, h, R.psi, t, hot);
  shoulder(g, sF, 1, ROCK2, CRY);
  g.restore();
}

export function front(g, t, phase) {
  const hot = phase > 1 ? 1.4 : 1, B = body({ t }, 'warrior', { sw: 26 }), y0 = B.hipY;
  for (const [x, h, l] of [[-24, 40, -12], [-10, 54, -4], [10, 50, 4], [24, 36, 12]]) shard(g, x, y0 - 54, h, 7, l, CRY);
  for (const leg of [B.L, B.R]) {
    const [hx, hy] = leg.hip, [kx, ky] = leg.knee, [ax, ay] = leg.ank;
    part(g, limb([hx * 2, hy], [kx * 2, ky], 26, 22), ROCK, { sd: 3 }); part(g, limb([kx * 2, ky], [ax * 2, ay - 4], 22, 20), ROCK, { sd: 3 });
    part(g, [[ax * 2 - 13, ay - 8], [ax * 2 + 13, ay - 8], [ax * 2 + 15, ay + 4], [ax * 2 - 15, ay + 4]], ROCK2, { sd: 1.6 });
  }
  part(g, [[-36, y0 - 52], [-40, y0 - 26], [-26, y0 - 2], [26, y0 - 2], [40, y0 - 26], [36, y0 - 52], [0, y0 - 64]], ROCK, { sd: 4, lw: 2 });
  heart(g, [0, y0 - 32], t, hot);
  helm(g, [0, y0 - 70], true, t, hot, phase);
  for (const s of [-1, 1]) {
    const S = [s * 34, y0 - 52], e = [s * 48, y0 - 26], h = [s * 46, y0 - 2];
    part(g, limb(S, e, 21, 18), ROCK, { sd: 2.8 }); part(g, limb(e, h, 18, 16), ROCK2, { sd: 2.6 });
    if (s > 0) blade(g, h, 0.15, t, hot);
    else part(g, [[h[0] - 14, h[1] - 34], [h[0] + 14, h[1] - 34], [h[0] + 18, h[1] + 4], [h[0], h[1] + 30], [h[0] - 18, h[1] + 4]], ROCK2, { sd: 3 });
    shoulder(g, S, s, ROCK2, CRY);
  }
}
export const GLOW = 'rgba(90,180,255,.45)';
