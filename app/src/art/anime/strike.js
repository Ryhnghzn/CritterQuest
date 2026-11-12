// The basic attack seen from the front or the back (spec §49): the hero strikes toward / away from
// the camera instead of turning side-on. Keyframes per class and view move the weapon hand, the free
// hand, the weapon angle ψ (kit.js: 0 = down, π/2 = screen right, π = up) and dip the body; the
// class files draw the weapon at the hand with B.wpsi. Phase 0..1 is the game's ATTACK_ANIM; the hit
// lands at once (snappy), so the swing starts already wound up.
import { keyframes, ik } from '../hero/rig.js';
import { dir } from './kit.js';

const PI = Math.PI;
const UP = PI - 0.4; // the assassin's reverse grip (assassin.js)
// row: [phase, wx, wy, ψ, fx, fy, dip, extra] — weapon hand, its angle, free hand, body dip, class value
// (warrior: blade length 0..1, short = pointing at the camera; archer: string draw 0..1; mage: cast glow 0..1;
// assassin: the off dagger's ψ)
// 'rest' rows are filled from the walk pose at run time.
const K = {
  warrior: {
    // front: the sword raised straight over the head chops straight down at you; as it comes at the
    // camera the blade looks short (its tip points at you), so the arc runs down the middle of the body
    front: { hand: 'aL', free: 'aR', len: 92, trail: [0.02, 0.36],
      keys: [[0, -12, -160, PI - 0.08, 15, -106, -2, 1], [0.1, -6, -166, PI, 16, -108, -3, 1], [0.22, -3, -98, 0.05, 15, -104, 7, 0.4], [0.34, -5, -88, 0.12, 14, -104, 6, 0.5], [1, 'rest']],
      ease: ['out', 'in', 'out', 'inOut'] },
    // back: from behind the sword rises over the head and chops down away from you, behind the back
    back: { hand: 'aR', free: 'aL', len: 92, trail: [0.02, 0.36],
      keys: [[0, 26, -158, PI - 0.55, -20, -104, 0, 1], [0.1, 10, -166, PI - 0.05, -22, -106, -3, 1], [0.24, -2, -100, 0.15, -22, -100, 6, 0.6], [0.36, -4, -92, 0.05, -22, -98, 5, 0.7], [1, 'rest']],
      ease: ['out', 'in', 'out', 'inOut'] },
  },
  archer: {
    // front: the bow raised square at you, the string hand by the cheek, it lets go and flicks out
    front: { hand: 'aR', free: 'aL', len: 0, flash: [0.02, 0.22],
      keys: [[0, 5, -114, PI / 2, -6, -124, 0, 1], [0.05, 5, -114, PI / 2, -24, -128, 0, 0], [0.22, 6, -120, PI / 2 - 0.12, -28, -120, -2, 0], [0.5, 8, -112, PI / 2, -22, -104, 0, 0], [1, 'rest']],
      ease: ['out', 'out', 'inOut', 'inOut'] },
    back: { hand: 'aL', free: 'aR', len: 0, flash: [0.02, 0.22],
      keys: [[0, -4, -130, -PI / 2, 6, -132, 0, 1], [0.05, -4, -130, -PI / 2, 26, -134, 0, 0], [0.22, -6, -136, -PI / 2 + 0.12, 28, -124, -2, 0], [0.5, -8, -118, -PI / 2, 22, -106, 0, 0], [1, 'rest']],
      ease: ['out', 'out', 'inOut', 'inOut'] },
  },
  mage: {
    // front: the staff thrust up and toward you, the orb flaring; the free hand opens beside it
    front: { hand: 'aL', free: 'aR', len: 0, flash: [0, 0.4],
      keys: [[0, -12, -134, PI - 0.12, 22, -116, -3, 1], [0.12, -10, -140, PI - 0.2, 24, -120, -4, 1], [0.4, -16, -116, PI - 0.06, 20, -104, 0, 0.3], [1, 'rest']],
      ease: ['out', 'inOut', 'inOut'] },
    back: { hand: 'aR', free: 'aL', len: 0, flash: [0, 0.4],
      keys: [[0, 12, -140, PI + 0.12, -24, -120, -3, 1], [0.12, 10, -146, PI + 0.2, -26, -124, -4, 1], [0.4, 16, -120, PI + 0.06, -22, -106, 0, 0.3], [1, 'rest']],
      ease: ['out', 'inOut', 'inOut'] },
  },
  assassin: {
    // front: the daggers crossed high at the chest rip outward and down in an X toward you
    // (the weapon hand is the left, the free hand the right; extra = the right dagger's ψ)
    front: { hand: 'aL', free: 'aR', len: 34, both: true, trail: [0.03, 0.34],
      keys: [[0, 8, -126, PI - 0.2, -8, -126, -2, -(PI - 0.2)], [0.08, 6, -124, PI - 0.1, -6, -124, -3, -(PI - 0.1)], [0.22, -32, -84, -PI / 2 - 0.5, 32, -84, 7, PI / 2 + 0.5], [0.34, -34, -80, -PI / 2 - 0.7, 34, -80, 6, PI / 2 + 0.7], [1, 'rest']],
      ease: ['out', 'in', 'out', 'inOut'] },
    back: { hand: 'aL', free: 'aR', len: 34, both: true, trail: [0.03, 0.34],
      keys: [[0, 8, -134, -PI + 0.2, -8, -134, -2, PI - 0.2], [0.08, 6, -138, -PI + 0.1, -6, -138, -3, PI - 0.1], [0.22, -34, -106, -PI / 2 + 0.3, 34, -106, 6, PI / 2 - 0.3], [0.34, -36, -100, -PI / 2 + 0.1, 36, -100, 5, PI / 2 - 0.1], [1, 'rest']],
      ease: ['out', 'in', 'out', 'inOut'] },
  },
};
// the weapon angle each class holds while walking (front / back), matching the class files
const REST_PSI = {
  warrior: { front: -0.446, back: 0.446 }, archer: { front: PI / 2, back: -PI / 2 },
  mage: { front: PI, back: PI }, assassin: { front: -UP, back: -UP },
};
const REST_OFF = { assassin: { front: UP, back: UP }, warrior: { front: 1, back: 1 } };

export const hasStrike = (classId, view) => !!K[classId]?.[view];

// the attack pose at phase ph for a walk body B (common.js body()): null outside an attack
export function strikePose(classId, view, ph, B) {
  const S = K[classId]?.[view];
  if (!S || !(ph >= 0 && ph < 1)) return null;
  const w = B[S.hand], f = B[S.free];
  const rest = [w.h[0], w.h[1], REST_PSI[classId][view], f.h[0], f.h[1], 0, REST_OFF[classId]?.[view] ?? 0];
  const keys = S.keys.map((k) => (k[1] === 'rest' ? [k[0], ...rest] : k));
  const [wx, wy, psi, fx, fy, dip, extra] = keyframes(keys, S.ease, ph);
  return { S, wh: [wx, wy], psi, fh: [fx, fy], dip, extra };
}

// elbow for a shoulder → hand: bent outward, away from the body's middle
function elbow(Sh, h) {
  const a = { x: Sh[0], y: Sh[1] }, b = { x: h[0], y: h[1] }, out = Sh[0] < 0 ? -1 : 1;
  const e1 = ik(a, b, 20, 20, 1), e2 = ik(a, b, 20, 20, -1);
  const e = (e1.x - e2.x) * out > 0 ? e1 : e2;
  return [e.x, e.y];
}

// bends the walk body B into the attack: moves the hands, sets B.wpsi (weapon ψ), B.opsi (the off
// dagger), B.draw / B.cast (archer string, mage orb), B.strike (for the trail). Returns B.
export function applyStrike(B, classId, view, ph) {
  const s = strikePose(classId, view, ph, B);
  if (!s) return B;
  const rest = { aL: { h: B.aL.h }, aR: { h: B.aR.h } }; // the walk pose's hands, for the trail
  const arm = (a, h) => { const S0 = [a.S[0], a.S[1] + s.dip * 0.6]; return { S: S0, e: elbow(S0, h), h }; };
  B[s.S.hand] = arm(B[s.S.hand], [s.wh[0], s.wh[1] + s.dip]);
  B[s.S.free] = arm(B[s.S.free], [s.fh[0], s.fh[1] + s.dip]);
  B.b += s.dip; B.wpsi = s.psi;
  if (classId === 'assassin') B.opsi = s.extra;
  if (classId === 'warrior') B.wlen = s.extra;
  if (classId === 'archer') B.draw = s.extra;
  if (classId === 'mage') B.cast = s.extra;
  B.strike = { classId, view, ph, rest };
  return B;
}

// the glowing ribbon left by the blade(s), along the real tip path (as common.js trail())
export function strikeTrail(g, B, E) {
  const st = B.strike;
  if (!st) return;
  const S = K[st.classId][st.view];
  if (S.flash) return flash(g, B, E, S, st.ph);
  if (!S.len || st.ph < S.trail[0] || st.ph > S.trail[1] + 0.12) return;
  const fade = st.ph > S.trail[1] ? 1 - (st.ph - S.trail[1]) / 0.12 : 1;
  const hands = S.both ? [[S.hand, 3], [S.free, 7]] : [[S.hand, 3]];
  for (const [hand, at] of hands) {
    const tips = [], mids = [];
    for (let j = 0; j < 12; j++) {
      const b = st.ph - j * 0.014;
      if (b < S.trail[0]) break;
      const p = strikePose(st.classId, st.view, b, st.rest);
      const h = hand === S.hand ? p.wh : p.fh, psi = at === 3 ? p.psi : p.extra, d = dir(psi), L = S.len * (st.classId === 'warrior' ? p.extra : 1);
      tips.push([h[0] + d[0] * L, h[1] + p.dip + d[1] * L]); mids.push([h[0] + d[0] * L * 0.4, h[1] + p.dip + d[1] * L * 0.4]);
    }
    if (tips.length < 2) continue;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [inner, col, al] of [[1, E.glow, 0.5], [0.35, E.core, 0.85]]) {
      g.beginPath();
      tips.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      for (let i = tips.length - 1; i >= 0; i--) { const k = inner * (1 - i / tips.length) + i / tips.length; g.lineTo(tips[i][0] + (mids[i][0] - tips[i][0]) * k, tips[i][1] + (mids[i][1] - tips[i][1]) * k); }
      g.closePath(); g.globalAlpha = al * fade; g.fillStyle = col; g.fill();
    }
    g.restore();
  }
}
const st_mage = (S) => S === K.mage.front || S === K.mage.back;
// archer / mage: a burst of light where the arrow leaves / the spell is cast
function flash(g, B, E, S, ph) {
  if (ph < S.flash[0] || ph > S.flash[1]) return;
  const k = 1 - (ph - S.flash[0]) / (S.flash[1] - S.flash[0]), h = B[S.hand].h;
  const orb = st_mage(S) ? 80 : 0, d = dir(B.wpsi), at = [h[0] + d[0] * orb, h[1] + d[1] * orb]; // the staff's orb / the bow's grip
  g.save(); g.globalCompositeOperation = 'lighter';
  const r = 26 * (1.4 - k * 0.6);
  const gr = g.createRadialGradient(at[0], at[1], 0, at[0], at[1], r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, E.core); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = k; g.fillStyle = gr; g.beginPath(); g.arc(at[0], at[1], r, 0, PI * 2); g.fill();
  g.lineCap = 'round'; g.strokeStyle = E.glow; g.lineWidth = 2.4;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + ph * 6, r0 = r * 0.35, r1 = r * (0.9 + 0.3 * (i % 2)); g.beginPath(); g.moveTo(at[0] + Math.cos(a) * r0, at[1] + Math.sin(a) * r0); g.lineTo(at[0] + Math.cos(a) * r1, at[1] + Math.sin(a) * r1); g.stroke(); }
  g.restore();
}
