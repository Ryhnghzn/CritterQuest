// Shared kit for the anime bosses (spec §41.2): monsters on the heroes' skeleton (art/hero/rig.js)
// and cel shading (art/anime/kit.js), every corner sharp. Art units are the heroes' (≈175 tall);
// BOSS_K scales a boss to BOSS_SCALE × a hero in doll units (the renderer's DOLL_SCALE follows).
import { P, part as softPart, stroke, glow, pal, far, limb, mix, Z, TAU, alongPsi } from '../anime/kit.js';
import { HERO_SCALE } from '../hero/index.js';

export { P, stroke, glow, pal, far, limb, mix, TAU, alongPsi };
export const BOSS_SCALE = 2.3;
export const BOSS_K = BOSS_SCALE * HERO_SCALE * 1.1 / Z;
export const sharp = (pts) => pts.map((p) => [p[0], p[1], 1]);
export const part = (g, pts, Pl, o = {}) => softPart(g, sharp(pts), Pl, { lw: 1.6, ...o });
export const LAVA = ['#fff2b0', '#ffc04a', '#ff7a2a', '#d0381a'];

// the chest frame of a rig pose (as art/anime/warrior.js side() does), bent forward by `hunch`
export function chestFrame(R, hunch = 0) {
  const hp = P(R.hip), lean = R.lean + hunch, c = Math.cos(lean), s = Math.sin(lean);
  return (x, y) => { const yy = y + 80; return [hp[0] + x * c - yy * s, hp[1] + x * s + yy * c]; };
}
// stretch a limb point away from its root (long monster arms)
export const reach = (S, h, k) => [S[0] + (h[0] - S[0]) * k, S[1] + (h[1] - S[1]) * k];

// glowing lines (lava veins, cracks, runes); cols = [halo, core]
export function veins(g, lines, t, hot = 1, w = 1.4, cols = [LAVA[2], LAVA[1]]) {
  const p = (0.7 + 0.3 * Math.sin(t * 5)) * hot;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const l of lines) {
    g.beginPath(); l.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.globalAlpha = 0.35 * p; g.lineWidth = w * 3; g.strokeStyle = cols[0]; g.stroke();
    g.globalAlpha = Math.min(1, p); g.lineWidth = w; g.strokeStyle = cols[1]; g.stroke();
  }
  g.restore();
}
// a flickering flame of light; cols = [outer, core]
export function flame(g, x, y, h, t, i, hot = 1, cols = ['#ff7a2a', '#fff2b0']) {
  const f = 0.75 + 0.25 * Math.sin(t * 9 + i * 1.9);
  glow(g, x, y - h * f * 0.5, h * 0.55 * f * hot, cols[0], 0.85);
  glow(g, x, y - h * f * 0.35, h * 0.25 * f, cols[1], 0.9);
}
// three hooked talons at a hand or foot, pointing along angle a
export function talons(g, at, a, len, Pl, n = 3) {
  for (let i = 0; i < n; i++) {
    const b = a + (i - (n - 1) / 2) * 0.45, x = at[0], y = at[1], c = Math.cos(b), s = Math.sin(b);
    part(g, [[x - s * 2, y + c * 2], [x + c * len * 0.6 - s * 2.4, y + s * len * 0.6 + c * 2.4], [x + c * len, y + s * len + 2], [x + c * len * 0.55 + s * 1.2, y + s * len * 0.55 - c * 1.2], [x + s * 2, y - c * 2]], Pl, { sd: 0.8, lw: 1.1 });
  }
}
// a reverse-knee leg: thigh to the knee, shin back to a raised hock, a long foot, clawed toes
export function digiLeg(g, hip, knee, ank, Pl, Bone, w = 1) {
  const hock = [ank[0] - 9 * w, ank[1] - 15 * w];
  part(g, limb(hip, knee, 22 * w, 16 * w), Pl, { sd: 3 });
  part(g, limb(knee, hock, 15 * w, 11 * w), Pl, { sd: 2.6 });
  part(g, limb(hock, [ank[0] + 2, ank[1] + 3], 10 * w, 8 * w), Pl, { sd: 2.2 });
  part(g, [[knee[0] - 6, knee[1] - 2], [knee[0] + 4, knee[1] - 12 * w], [knee[0] + 8, knee[1] + 2]], Bone, { sd: 1, lw: 1.2 });
  talons(g, [ank[0] + 4, ank[1] + 4], 0.15, 13 * w, Bone);
}
// a tattered membrane wing from root, spreading back and up. side +1 near, −1 far.
// o: { M membrane palette, B bone palette, tips: (g, x, y, i) => void }
export function wing(g, root, side, t, o) {
  const f = Math.sin(t * 1.4) * 0.12, M = side > 0 ? o.M : far(o.M), B = side > 0 ? o.B : far(o.B), sc = o.size || 1;
  const r = (x, y) => [root[0] + (x * Math.cos(f) - y * Math.sin(f)) * sc, root[1] + (x * Math.sin(f) + y * Math.cos(f)) * sc];
  const el = r(-34, -46 - side * 6), tip = r(-92, -40), f1 = r(-80, -6), f2 = r(-58, 12), f3 = r(-30, 14);
  part(g, [root, el, tip, r(-86, -24), f1, r(-74, -2), r(-66, 6), f2, r(-50, 8), r(-40, 18), f3, r(-16, 6)], M, { sd: 4 });
  for (const e of [tip, f1, f2, f3]) stroke(g, [el, e], mix(B.base, '#000000', 0.2), 2.2);
  stroke(g, [root, el], B.base, 3.6);
  if (side > 0 && o.tips) [tip, f1, f2, f3].forEach((e, i) => o.tips(g, e[0], e[1], i));
}
// a wavy tentacle / bandage strip from a to the end, sharp tip; sway in art units
export function strip(g, pts, w0, w1, Pl, t, sway = 4, i = 0) {
  const P2 = pts.map(([x, y], k) => [x + Math.sin(t * 2 + i + k) * sway * (k / (pts.length - 1)), y]);
  const left = [], right = [];
  for (let k = 0; k < P2.length; k++) {
    const a = P2[Math.max(0, k - 1)], b = P2[Math.min(P2.length - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * (k / (P2.length - 1))) / 2, nx = -dy / L * w, ny = dx / L * w;
    left.push([P2[k][0] + nx, P2[k][1] + ny]); right.unshift([P2[k][0] - nx, P2[k][1] - ny]);
  }
  part(g, [...left, ...right], Pl, { sd: 1.6, lw: 1.3 });
}
