// Raja Lava (spec §41.2, approved as app/bosanime.html v3): a horned demon skull with a fanged snout
// and a mane of fire, four clawed arms, reverse knees, a spiked tail with a burning tip, tattered
// wings of flame membrane, a molten ribcage, the heroes' Mitos fire greatsword.
import { rig } from '../hero/rig.js';
import { body, ELEMENTS } from '../anime/common.js';
import { sword } from '../anime/warrior.js';
import { P, part, stroke, glow, pal, far, limb, LAVA, chestFrame, reach, veins, flame, talons, digiLeg, wing } from './kit.js';

const FIRE = ELEMENTS.fire;
const OBS = pal('#2a1e26', { shade: '#0e080e', hi: '#5e4652', rim: 'rgba(255,120,50,.85)' });
const OBS2 = pal('#3a2a32', { shade: '#140c12', hi: '#74586a', rim: 'rgba(255,140,60,.8)' });
const BONE = pal('#d6c8b4', { shade: '#6e5e50', hi: '#fff6e4', rim: 'rgba(255,150,80,.7)' });
const HIDE = pal('#4a2a2e', { shade: '#1c0c10', hi: '#7a4e50', rim: 'rgba(255,120,60,.8)' });
const WING = { M: pal('#5a1a14', { shade: '#240806', hi: '#a03a24', rim: null }), B: HIDE };

function tail(g, base, t, hot) {
  const w = Math.sin(t * 1.3) * 6, pts = [base, [base[0] - 26, base[1] + 16 + w * 0.3], [base[0] - 50, base[1] + 40 + w * 0.6], [base[0] - 66, base[1] + 66 + w]];
  for (let i = 0; i < 3; i++) {
    const a = pts[i], b = pts[i + 1];
    part(g, limb(a, b, 14 - i * 3.6, 10.4 - i * 3.6), HIDE, { sd: 2 });
    part(g, [[a[0] - 3, a[1] - 4], [a[0] - 6, a[1] - 14], [a[0] + 3, a[1] - 5]], BONE, { sd: 0.6, lw: 1 });
  }
  const e = pts[3]; part(g, [[e[0] + 3, e[1] - 3], [e[0] - 10, e[1] + 8], [e[0] - 2, e[1] + 4], [e[0] - 4, e[1] + 16], [e[0] + 4, e[1] + 4]], BONE, { sd: 0.8, lw: 1.1 });
  flame(g, e[0] - 2, e[1] + 4, 18, t, 7, hot);
}
function skullSide(g, [x, y], t, hot, phase) {
  for (let i = 0; i < 7; i++) {
    const k = i / 6, bx = x - 8 - k * 10, by = y - 12 + k * 22, L = 26 - k * 8 + Math.sin(t * 6 + i) * 4;
    part(g, [[bx, by - 4], [bx - L * 0.6, by - 8 - Math.sin(t * 5 + i) * 3], [bx - L, by - 2], [bx - L * 0.5, by + 3], [bx, by + 4]], pal(i % 2 ? '#ff7a2a' : '#ffb347', { shade: '#c0401a', hi: '#fff2b0', rim: null }), { sd: 1, lw: 1 });
  }
  part(g, [[x - 13, y - 7], [x - 6, y - 15], [x + 8, y - 15], [x + 18, y - 9], [x + 30, y - 4], [x + 32, y + 2], [x + 20, y + 4], [x + 6, y + 8], [x - 8, y + 6]], BONE, { sd: 2.4 });
  const open = 3 + Math.sin(t * 2) * 1.4 + (phase > 1 ? 2 : 0);
  part(g, [[x - 2, y + 6], [x + 22, y + 5 + open * 0.4], [x + 28, y + 8 + open], [x + 12, y + 14 + open], [x - 4, y + 12]], BONE, { sd: 1.6 });
  g.fillStyle = '#1a0608'; g.beginPath(); g.moveTo(x + 6, y + 6); g.lineTo(x + 28, y + 4); g.lineTo(x + 26, y + 7 + open); g.lineTo(x + 8, y + 9 + open * 0.6); g.fill();
  glow(g, x + 16, y + 6 + open * 0.5, 8 * hot, '#ff6a1a', 0.7);
  g.fillStyle = '#f4ead6';
  for (let i = 0; i < 4; i++) { const fx = x + 10 + i * 5; g.beginPath(); g.moveTo(fx, y + 4.5); g.lineTo(fx + 1.4, y + 8); g.lineTo(fx + 2.8, y + 4.5); g.fill(); g.beginPath(); g.moveTo(fx + 1, y + 8 + open); g.lineTo(fx + 2.4, y + 4.6 + open); g.lineTo(fx + 3.8, y + 8 + open); g.fill(); }
  g.fillStyle = phase > 1 ? '#fff6b0' : '#ffd060'; g.beginPath(); g.moveTo(x + 4, y - 6); g.lineTo(x + 14, y - 9); g.lineTo(x + 16, y - 5); g.lineTo(x + 7, y - 3); g.fill();
  glow(g, x + 11, y - 6, 9 * hot, '#ff8a2a', 0.9);
  for (const [ox, Pl, s] of [[-2, far(OBS2), 0.85], [2, OBS2, 1]]) part(g, [[x + ox - 4, y - 13], [x + ox - 12 * s, y - 26 * s], [x + ox - 28 * s, y - 36 * s], [x + ox - 46 * s, y - 34 * s], [x + ox - 30 * s, y - 30 * s], [x + ox - 14 * s, y - 20 * s], [x + ox + 4, y - 14]], Pl, { sd: 1.6 });
}
const tips = (hot, t) => (g, x, y, i) => flame(g, x, y, 12, t, i, hot);

export function side(g, t, phase, attack) {
  const hot = phase > 1 ? 1.45 : 1;
  const R = rig('warrior', { gait: true, t, moving: 0, walk: 0, attack: attack ?? -1, snappy: attack != null });
  g.save(); g.scale(R.flip, 1);
  const C = chestFrame(R, 0.18), hp = P(R.hip);
  wing(g, C(-8, -126), -1, t + 0.4, { ...WING, tips: tips(hot, t) });
  tail(g, [hp[0] - 10, hp[1] - 4], t, hot);
  wing(g, C(-6, -124), 1, t, { ...WING, tips: tips(hot, t) });
  const sB = P(R.sB), hB = reach(sB, P(R.hB), 1.2), eB = reach(sB, P(R.eB), 1.15);
  part(g, limb(sB, eB, 15, 12), far(HIDE), { sd: 2.4 }); part(g, limb(eB, hB, 12, 9), far(OBS), { sd: 2.2 }); talons(g, hB, 0.9, 11, far(BONE));
  const l2B = C(-6, -100), e2B = [l2B[0] + 6, l2B[1] + 22 + Math.sin(t * 2.2) * 2], h2B = [e2B[0] + 18, e2B[1] + 2];
  part(g, limb(l2B, e2B, 11, 9), far(HIDE), { sd: 2 }); part(g, limb(e2B, h2B, 9, 7), far(HIDE), { sd: 2 }); talons(g, h2B, 0.3, 9, far(BONE));
  digiLeg(g, P(R.hipB), P(R.kB), P(R.fB), far(OBS), far(BONE));
  part(g, [C(-16, -134), C(-20, -112), C(-12, -88), C(16, -86), C(26, -104), C(26, -124), C(12, -138)], OBS, { sd: 3.6, lw: 1.8 });
  for (let i = 0; i < 4; i++) { const r = [C(2, -126 + i * 8), C(12, -123 + i * 8), C(20, -126 + i * 8)]; part(g, [r[0], r[1], r[2], [r[2][0] - 1, r[2][1] + 2.6], [r[1][0], r[1][1] + 2.6], [r[0][0], r[0][1] + 2.6]], BONE, { sd: 0.8, lw: 1 }); }
  glow(g, ...C(12, -112), 22 * hot, '#ff7a2a', 0.8); glow(g, ...C(12, -112), 9, '#fff2b0', 0.9);
  veins(g, [[C(-14, -128), C(-8, -112), C(-12, -96)], [C(22, -118), C(18, -100)]], t, hot);
  part(g, [C(-12, -92), C(18, -90), C(20, -82), C(-12, -82)], OBS2, { sd: 1.6 });
  digiLeg(g, P(R.hipF), P(R.kF), P(R.fF), OBS, BONE);
  const l2 = C(14, -100), e2 = [l2[0] + 10, l2[1] + 20 + Math.sin(t * 2.2 + 1) * 2], h2 = [e2[0] + 20, e2[1] - 2];
  part(g, limb(l2, e2, 12, 10), HIDE, { sd: 2.2 }); part(g, limb(e2, h2, 10, 8), HIDE, { sd: 2 }); talons(g, h2, 0.15, 10, BONE);
  part(g, limb(C(4, -132), C(16, -140), 16, 13), HIDE, { sd: 2 });
  skullSide(g, C(20, -146), t, hot, phase);
  const sF = P(R.sF), h = reach(sF, P(R.hF), 1.15), e = reach(sF, P(R.eF), 1.12), behind = R.psi > 2.2 && R.psi < 4.2;
  if (behind) sword(g, h, R.psi, FIRE, t, 1.2, 5);
  part(g, limb(sF, e, 16, 13), HIDE, { sd: 2.6 }); part(g, limb(e, h, 13, 11, 1.1), OBS, { sd: 2.4 });
  veins(g, [[e, h]], t, hot, 1.1);
  if (!behind) sword(g, h, R.psi, FIRE, t, 1.2, 5);
  talons(g, h, R.psi - Math.PI / 2, 9, BONE);
  part(g, [[sF[0] - 14, sF[1] + 4], [sF[0] - 10, sF[1] - 10], [sF[0] + 2, sF[1] - 14], [sF[0] + 14, sF[1] - 6], [sF[0] + 12, sF[1] + 6], [sF[0], sF[1] + 2]], OBS2, { sd: 2 });
  for (const [dx, h0] of [[-6, 18], [3, 24], [11, 14]]) part(g, [[sF[0] + dx - 3, sF[1] - 9], [sF[0] + dx - 2, sF[1] - 9 - h0], [sF[0] + dx + 3, sF[1] - 10]], BONE, { sd: 0.8, lw: 1.1 });
  g.restore();
}

export function front(g, t, phase) {
  const hot = phase > 1 ? 1.45 : 1, B = body({ t }, 'warrior', { sw: 21 }), y0 = B.hipY;
  for (const s of [-1, 1]) { g.save(); g.scale(-s, 1); wing(g, [8, y0 - 46], -1, t + (s > 0 ? 0 : 0.5), WING); g.restore(); }
  for (const s of [-1, 1]) flame(g, s * 34, -8, 18, t, s + 3, hot);
  for (const leg of [B.L, B.R]) {
    const [hx, hy] = leg.hip, [kx, ky] = leg.knee, [ax, ay] = leg.ank, sx = Math.sign(hx);
    part(g, limb([hx * 1.3, hy], [kx * 1.5, ky], 22, 16), OBS, { sd: 3 });
    part(g, limb([kx * 1.5, ky], [ax * 1.4, ay], 15, 11), OBS, { sd: 2.6 });
    part(g, [[kx * 1.5 - 5, ky - 1], [kx * 1.5 + sx * 2, ky - 13], [kx * 1.5 + 5, ky - 1]], BONE, { sd: 1, lw: 1.2 });
    talons(g, [ax * 1.4, ay + 4], Math.PI / 2 - sx * 0.3, 11, BONE);
  }
  part(g, [[-26, y0 - 52], [-22, y0 - 30], [-14, y0 - 6], [14, y0 - 6], [22, y0 - 30], [26, y0 - 52], [12, y0 - 60], [-12, y0 - 60]], OBS, { sd: 3.4, lw: 1.8 });
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) part(g, [[s * 3, y0 - 50 + i * 8], [s * 16, y0 - 48 + i * 8], [s * 18, y0 - 45 + i * 8], [s * 3, y0 - 47 + i * 8]], BONE, { sd: 0.8, lw: 1 });
  glow(g, 0, y0 - 34, 22 * hot, '#ff7a2a', 0.8); glow(g, 0, y0 - 34, 9, '#fff2b0', 0.9);
  for (const [a, s] of [[B.aL, -1], [B.aR, 1]]) {
    const S = [a.S[0] * 1.25, a.S[1]], e = [a.e[0] * 1.45, a.e[1] + 6], h = [a.h[0] * 1.5, a.h[1] + 12];
    if (s > 0) sword(g, h, Math.PI + 0.35, FIRE, t, 1.2, 5);
    part(g, limb(S, e, 16, 13), HIDE, { sd: 2.6 }); part(g, limb(e, h, 13, 11), OBS, { sd: 2.4 });
    talons(g, h, Math.PI / 2 + s * 0.4, 9, BONE);
    part(g, [[S[0] - 13, S[1] + 4], [S[0] - 10, S[1] - 9], [S[0] + 10, S[1] - 9], [S[0] + 13, S[1] + 4]], OBS2, { sd: 2 });
    for (const dx of [-6, 0, 6]) part(g, [[S[0] + dx - 3, S[1] - 8], [S[0] + dx + s * 2, S[1] - 26 + Math.abs(dx)], [S[0] + dx + 3, S[1] - 8]], BONE, { sd: 0.8, lw: 1.1 });
    const l2 = [s * 20, y0 - 30], e2 = [s * 34, y0 - 14 + Math.sin(t * 2.2 + s) * 2], h2 = [s * 30, y0 + 2];
    part(g, limb(l2, e2, 12, 10), HIDE, { sd: 2.2 }); part(g, limb(e2, h2, 10, 8), HIDE, { sd: 2 }); talons(g, h2, Math.PI / 2 - s * 0.5, 9, BONE);
  }
  const [x, y] = [0, y0 - 72];
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42; flame(g, x + Math.cos(a) * 20, y + Math.sin(a) * 16 + 6, 22, t, i, hot); }
  for (const s of [-1, 1]) part(g, [[x + s * 8, y - 8], [x + s * 20, y - 20], [x + s * 36, y - 26], [x + s * 50, y - 44], [x + s * 34, y - 34], [x + s * 18, y - 28], [x + s * 6, y - 14]], OBS2, { sd: 1.6 });
  part(g, [[x - 14, y - 4], [x - 10, y - 14], [x + 10, y - 14], [x + 14, y - 4], [x + 11, y + 8], [x - 11, y + 8]], BONE, { sd: 2.4 });
  const open = 3 + Math.sin(t * 2) * 1.4 + (phase > 1 ? 2 : 0);
  part(g, [[x - 10, y + 6], [x + 10, y + 6], [x + 8, y + 14 + open], [x - 8, y + 14 + open]], BONE, { sd: 1.6 });
  g.fillStyle = '#1a0608'; g.fillRect(x - 8, y + 6, 16, 4 + open);
  glow(g, x, y + 8 + open / 2, 8 * hot, '#ff6a1a', 0.7);
  g.fillStyle = '#f4ead6'; for (let i = 0; i < 4; i++) { const fx = x - 7 + i * 4; g.beginPath(); g.moveTo(fx, y + 5.5); g.lineTo(fx + 1.4, y + 9); g.lineTo(fx + 2.8, y + 5.5); g.fill(); }
  for (const s of [-1, 1]) { g.fillStyle = phase > 1 ? '#fff6b0' : '#ffd060'; g.beginPath(); g.moveTo(x + s * 3, y - 4); g.lineTo(x + s * 10, y - 8); g.lineTo(x + s * 9, y - 3); g.lineTo(x + s * 3, y - 1); g.fill(); glow(g, x + s * 6.5, y - 4.5, 7 * hot, '#ff8a2a', 0.9); }
}
export const GLOW = 'rgba(255,90,30,.55)';
