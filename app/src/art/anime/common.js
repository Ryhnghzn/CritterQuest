// Parts shared by the anime classes (spec §39): palettes, the weapon element colours, legs and
// arms placed on the skeleton, the front/back walk, the weapon trail.
import { part, stroke, glow, pal, far, limb, lerp2, mix, P, dir } from './kit.js';
import { GAIT } from '../hero/rig.js';

export const SKIN = pal('#f1c4a4', { shade: '#c4826c', hi: '#ffe6d4' });
export const STEEL = pal('#a4b0c6', { shade: '#4a526a', hi: '#f4f8ff' });
export const DARKSTEEL = pal('#4a4a5e', { shade: '#16141e', hi: '#9a9ab8' });
export const GOLD = pal('#e2a83a', { shade: '#86501a', hi: '#fff0a8' });
export const PANTS = pal('#2c2638', { shade: '#110d18', hi: '#4e465e' });
export const LEATHER = pal('#5a3a2a', { shade: '#24140e', hi: '#8a6046' });
export const GLOVE = pal('#3a2a2e', { shade: '#140c10', hi: '#6a5052' });

// the weapon's element: edge, white-hot core, glow, rune colour
export const ELEMENTS = {
  ice: { name: 'Es', edge: '#2aa8ff', core: '#eafcff', glow: '#4cc8ff', rune: '#bff2ff' },
  fire: { name: 'Api', edge: '#ff4a14', core: '#fff1b8', glow: '#ff7a1e', rune: '#ffe08a' },
  void: { name: 'Kehampaan', edge: '#8a2cff', core: '#f6e6ff', glow: '#a95cff', rune: '#e0b8ff' },
  holy: { name: 'Cahaya', edge: '#f2b21e', core: '#fffbe6', glow: '#ffd75a', rune: '#fff2b0' },
  blood: { name: 'Darah', edge: '#d0123a', core: '#ffe0e6', glow: '#ff2a55', rune: '#ffb0c0' },
  storm: { name: 'Petir', edge: '#3ad8c8', core: '#eafffb', glow: '#5af0e0', rune: '#c8fff6' },
};
for (const [k, v] of Object.entries(ELEMENTS)) v.fx = k; // which effect it draws (elemfx.js)
export const gem = (E) => pal(E.edge, { hi: E.core, rim: null });

// ankle from a skeleton foot (the boot reaches down to the ground)
export const ankle = (f) => { const a = P(f); return [a[0], a[1] - 3]; };

// side-view leg: thigh, shin, an optional greave along the shin and knee guard, a boot.
// o: { isFar, pants, boot: palette, greave: palette | null, knee: palette | null, cuff: colour, w }
export function legSide(g, hip, knee, ank, o = {}) {
  const f = (Pl) => (o.isFar ? far(Pl) : Pl), w = o.w || 1;
  part(g, limb(hip, knee, 17 * w, 12 * w), f(o.pants || PANTS), { sd: 3.4 });
  part(g, limb(knee, ank, 12 * w, 9 * w), f(o.pants || PANTS), { sd: 3 });
  if (o.wraps) for (const k of [0.3, 0.5, 0.7]) { const p = lerp2(knee, ank, k); stroke(g, [[p[0] - 5 * w, p[1] - 1.6], [p[0] + 5 * w, p[1] + 1.2]], o.isFar ? 'rgba(0,0,0,.4)' : o.wraps, 1.2); }
  if (o.greave) part(g, limb(lerp2(knee, ank, 0.12), lerp2(knee, ank, 0.92), 13.4 * w, 10.4 * w, 1.06), f(o.greave), { sd: 2.4, lw: 1.8 });
  if (o.tall) part(g, limb(lerp2(knee, ank, 0.05), ank, 13 * w, 10.6 * w, 1.04), f(o.boot || LEATHER), { sd: 2.4, lw: 1.8 });
  if (o.knee) part(g, [[knee[0] - 5.4, knee[1] - 0.6], [knee[0], knee[1] - 6.6, 1], [knee[0] + 5.4, knee[1] - 0.6], [knee[0], knee[1] + 5, 1]], f(o.knee), { sd: 1.6, lw: 1.6 });
  const [x, y] = ank;
  part(g, [[x - 6.5, y - 4], [x + 6, y - 5], [x + 13, y + 3], [x + 18, y + 6.5, 1], [x + 8, y + 8.2, 1], [x - 7.5, y + 8.2, 1], [x - 8, y + 2]], f(o.boot || LEATHER), { sd: 2.2, lw: 2 });
  if (!o.isFar && o.cuff) stroke(g, [[x - 6, y - 2], [x + 6, y - 2.6]], o.cuff, 1.3);
}
// front / back leg (the boot seen from the toe or the heel)
export function legFront(g, hip, knee, ank, o = {}) {
  const w = o.w || 1, back = !!o.back;
  part(g, limb(hip, knee, 17 * w, 12 * w), o.pants || PANTS, { sd: 3.4 });
  part(g, limb(knee, ank, 12 * w, 9 * w), o.pants || PANTS, { sd: 3 });
  if (o.wraps) for (const k of [0.3, 0.5, 0.7]) { const p = lerp2(knee, ank, k); stroke(g, [[p[0] - 5 * w, p[1] - 1.4], [p[0] + 5 * w, p[1] + 1]], o.wraps, 1.2); }
  if (o.greave && !back) part(g, limb(lerp2(knee, ank, 0.12), lerp2(knee, ank, 0.92), 13.4 * w, 10.4 * w, 1.06), o.greave, { sd: 2.4, lw: 1.8 });
  if (o.tall) part(g, limb(lerp2(knee, ank, 0.05), ank, 13 * w, 10.6 * w, 1.04), o.boot || LEATHER, { sd: 2.4, lw: 1.8 });
  if (o.knee && !back) part(g, [[knee[0] - 5.4, knee[1] - 0.6], [knee[0], knee[1] - 6.6, 1], [knee[0] + 5.4, knee[1] - 0.6], [knee[0], knee[1] + 5, 1]], o.knee, { sd: 1.6, lw: 1.6 });
  const [x, y] = ank, B = o.boot || LEATHER;
  if (back) part(g, [[x - 6, y - 5], [x + 6, y - 5], [x + 6.6, y + 8.2, 1], [x - 6.6, y + 8.2, 1]], B, { sd: 2, lw: 2 });
  else part(g, [[x - 6, y - 5], [x + 6, y - 5], [x + 7.4, y + 3.6], [x + 4.4, y + 8.2, 1], [x - 4.4, y + 8.2, 1], [x - 7.4, y + 3.6]], B, { sd: 2, lw: 2 });
  if (o.cuff && !back) stroke(g, [[x - 6, y - 2], [x + 6, y - 2.6]], o.cuff, 1.3);
}

// an arm: upper (sleeve), forearm, optional flared cuff, the hand (a fist)
export function arm(g, S, e, h, o = {}) {
  const f = (Pl) => (o.isFar ? far(Pl) : Pl), w = o.w || 1;
  part(g, limb(S, e, 12.6 * w, 10.8 * w), f(o.upper), { sd: 3 });
  part(g, limb(e, h, 11 * w, 9.4 * w, 1.15), f(o.fore || o.upper), { sd: 2.6 });
  if (o.cuff) {
    const d = [h[0] - e[0], h[1] - e[1]], n = Math.hypot(d[0], d[1]) || 1, u = [d[0] / n, d[1] / n], v = [-u[1], u[0]], c = lerp2(e, h, 0.55);
    part(g, [[c[0] + v[0] * 7.6 * w, c[1] + v[1] * 7.6 * w], [c[0] + u[0] * 6.5 + v[0] * 5.8 * w, c[1] + u[1] * 6.5 + v[1] * 5.8 * w], [c[0] + u[0] * 6.5 - v[0] * 5.8 * w, c[1] + u[1] * 6.5 - v[1] * 5.8 * w], [c[0] - v[0] * 7.6 * w, c[1] - v[1] * 7.6 * w, 1]], f(o.cuff), { sd: 1.8, lw: 1.7 });
  }
  if (o.hand !== false) fist(g, h, f(o.handP || GLOVE));
}
export function fist(g, h, Pl = GLOVE) {
  part(g, [[h[0] - 4.4, h[1] - 3.6], [h[0] + 3.2, h[1] - 4.6], [h[0] + 5.4, h[1] + 0.4], [h[0] + 3.4, h[1] + 4.6], [h[0] - 3.8, h[1] + 4]], Pl, { sd: 1.6, lw: 1.7 });
}

// the run seen from the front or the back, with the class's gait (rig.js GAIT): hips bounce,
// a knee comes up toward the camera, the arms pump (the assassin keeps them swept back).
// Shoulders at ±sw; returns everything in the figure frame.
const ARMS_FRONT = { warrior: [1, 1.2], archer: [0.8, 1.6], mage: [0.3, 0.6], assassin: [0.2, 0.4] }; // [sword-hand swing, free-hand swing]
export function body(pose, classId = 'warrior', { sw = 17 } = {}) {
  const t = pose.t || 0, m = pose.moving || 0, s = Math.sin(pose.walk || 0), G = GAIT[classId] || GAIT.warrior;
  const b = m ? -Math.abs(s) * 1.4 * m * G.bob - (G.float || 0) * 2 * m : Math.sin(t * 2) * 0.8;
  const lift = (k) => Math.max(0, k) * G.lift * 1.6 * m, hipY = -79 + b + (classId === 'assassin' ? 5 * m : 0);
  const leg = (sx, k) => ({ hip: [sx * 7, hipY + 2], knee: [sx * 9.5, -42 - lift(k) * 0.55], ank: [sx * 10.5, -8 - lift(k)] });
  const [aS, aF] = ARMS_FRONT[classId] || ARMS_FRONT.warrior, back = classId === 'assassin' ? m : 0;
  const armAt = (sx, k, amp) => {
    const S = [sx * sw, hipY - 40], h = [sx * (sw + 4.6 + Math.abs(k) * 1.4 * amp - back * 3), hipY - 2 - Math.max(0, k) * 7 * amp - back * 6];
    return { S, e: [sx * (sw + 4 - back * 1.4), (S[1] + h[1]) / 2], h };
  };
  return { t, moving: m, b, hipY, L: leg(-1, s * m), R: leg(1, -s * m), aL: armAt(-1, s * m, aS), aR: armAt(1, -s * m, aF), head: [0, hipY - 67] };
}

// the weapon trail along the real tip path: re-pose the skeleton a few moments back.
// tipAt(Q) → [[x, y] tip, [x, y] inner] in the figure frame
export function trail(g, R, pose, rigFn, classId, tipAt, E) {
  if (!(R.trail > 0)) return;
  const tips = [], mids = [], step = R.prof === 'snappy' ? 0.016 : 0.011;
  for (let j = 0; j < 12; j++) {
    const b = R.attack - j * step;
    if (b < 0) break;
    const [a, m] = tipAt(j ? rigFn(classId, { ...pose, attack: b }) : R);
    tips.push(a); mids.push(m);
  }
  if (tips.length < 2) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const ribbon = (inner, col, al) => {
    g.beginPath();
    tips.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    for (let i = tips.length - 1; i >= 0; i--) {
      const k = inner * (1 - i / tips.length) + i / tips.length;
      g.lineTo(tips[i][0] + (mids[i][0] - tips[i][0]) * k, tips[i][1] + (mids[i][1] - tips[i][1]) * k);
    }
    g.closePath(); g.globalAlpha = al * R.trail; g.fillStyle = col; g.fill();
  };
  ribbon(1, E.glow, 0.5);
  ribbon(0.35, E.core, 0.85);
  g.restore();
}
// a weapon held at the skeleton hand: tip and inner point for the trail
export const tipOf = (L) => (Q) => { const h = P(Q.hF), d = dir(Q.psi); return [[h[0] + d[0] * L, h[1] + d[1] * L], [h[0] + d[0] * L * 0.45, h[1] + d[1] * L * 0.45]]; };

// motes drifting up off a glowing weapon (in its own frame, along +x)
export function motes(g, E, t, len, n = 8) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const u = (t * 0.45 + i * 0.131) % 1, x = 10 + ((i * 37) % Math.max(10, len * 0.8)), y = -8 - u * 14 + Math.sin(t * 2 + i) * 2;
    g.globalAlpha = (1 - u) * 0.9; g.fillStyle = i % 3 ? E.rune : '#ffffff';
    g.beginPath(); g.arc(x, y, 0.9 + (i % 2) * 0.5, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
export const shade = (c, k) => mix(c, '#000000', k);
export { glow };
