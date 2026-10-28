// Parts shared by the style-D heroes: palettes, face and hair, plain legs and arms,
// and the weapon trail that follows the real tip path.
import { RARITIES } from '../../data/items.js';
import { fillPoly, limbPts, pal, dim, mix, INK, TAU } from './cel.js';

export const SKIN = pal('#b77656', { shade: '#3a1b1d', hi: '#f2b98e' });
export const LEATHER = pal('#4a3428', { shade: '#170d0e', hi: '#7c5a40' });
export const PANTS = pal('#2e2630', { shade: '#110c12', hi: '#55485a' });
export const GOLD = pal('#b07a26', { shade: '#3a2008', hi: '#ffe08a' });
export const WOOD = pal('#6a4a30', { hatch: true });
export const METAL = [ // by tier: dull iron → bright steel → dark steel
  pal('#66656c'), pal('#6c6b73'), pal('#7b7e8a'), pal('#80848f'), pal('#8a90a0', { hi: '#f1e3c4' }), pal('#8d93a3', { hi: '#f1e3c4' }), pal('#5e5a6a', { hi: '#e8d7ff' }),
];
export const rcol = (piece, plain = '#8a6a3a') => (piece && piece.rarity >= 1 ? RARITIES[piece.rarity].color : plain);
export const withRim = (P, rim) => ({ ...P, rim });

export function hairPalette([main, shade], rim) {
  return { base: main, shade: mix(shade, '#0b0710', 0.5), hi: mix(main, '#fff1d6', 0.35), rim };
}

// hair shapes in head-local coordinates (head centre at 0,0, facing +x)
export const HAIR = [
  { front: [[5.4, -4.6], [4.6, -8.2], [0, -9.2], [-4.6, -7.8], [-6, -4], [-5.6, -0.4], [-4, 1.2], [-3.4, -2.6], [0.6, -5.4], [3.6, -5]] },
  { front: [[5.6, -5.2], [4.4, -9], [1, -9.8], [-0.8, -12.4], [-2.4, -9.8], [-6.4, -11.6], [-5.6, -8.4], [-9.6, -8.4], [-6.6, -5.8], [-10, -3.4], [-5.8, -2.6], [-5.2, 1.8], [-3.6, -2], [0, -5.6], [3, -5.4]] },
  { back: (sw) => [[3, -7], [-6.6, -7.6], [-7.4, 2], [-6.8 + sw, 13], [-2 + sw * 0.5, 11], [-1.6, 2]], front: [[5.6, -4.6], [3.6, -9], [-2, -9.4], [-6, -6.6], [-5.4, -2], [-3.2, -4], [1, -6], [3.6, -5.2]] },
  { front: [[5.4, -4.6], [3.8, -9], [-1.6, -9.6], [-6.4, -6.4], [-7, 1], [-5.6, 5.6], [-2.6, 5.2], [-2.8, 0], [-1.6, -3], [2.4, -5], [4.2, -4]] },
  { back: (sw) => [[-5, -7], [-9 + sw, -5], [-12 + sw, 2], [-10.4 + sw, 8], [-8.6 + sw, 3], [-6.4, -3.6]], front: [[5.4, -4.6], [4.4, -8.6], [-0.6, -9.6], [-5.4, -7], [-5.8, -2.6], [-4, -0.6], [-3.2, -3.4], [0.6, -5.6], [3.8, -5]], tie: [-6, -5.2] },
];

// face (head-local); mask: cloth over nose & mouth (assassin)
export function face(g, R, rim, { mask = null, eye = '#ffcf8a' } = {}) {
  const t = R.t;
  fillPoly(g, [[-4.6, -3], [-3, -7.4], [2, -8.2], [5.2, -5], [5.6, -2.6], [5, -1.8], [6.8, 1.2], [5.4, 1.8], [5.7, 3.2], [4.7, 5.6], [2.2, 6.6], [-1.2, 4.8], [-3.6, 2.4], [-4.8, 0]], withRim(SKIN, rim), 3.8);
  fillPoly(g, [[-1.8, -0.6], [0, -1.2], [0.4, 1.8], [-1.4, 2.4]], SKIN, 1, 0.5, 0.8);
  const blink = R.hurt || t % 3.9 < 0.12;
  if (blink) { g.beginPath(); g.moveTo(3.4, -1.3); g.lineTo(5.1, -1.2); g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke(); }
  else {
    g.beginPath(); g.moveTo(3.4, -1.7); g.lineTo(5.1, -1.9); g.lineTo(4.5, -0.8); g.closePath(); g.fillStyle = INK; g.fill();
    g.beginPath(); g.arc(4.5, -1.4, 0.45, 0, TAU); g.fillStyle = eye; g.fill();
  }
  g.beginPath(); g.moveTo(1.8, R.hurt ? -3.8 : -3.4); g.lineTo(5.8, -2.6); g.lineWidth = 1.3; g.strokeStyle = INK; g.stroke();
  if (mask) fillPoly(g, [[-2.6, 0.6], [5.6, 0.2], [7, 1.6], [5.6, 4.6], [2.4, 7], [-1.4, 5.4], [-3.4, 2.6]], mask, 2.4);
  else { g.beginPath(); g.moveTo(4.2, 3.6); g.lineTo(5.6, R.hurt ? 3.9 : 3.3); g.lineWidth = 0.6; g.strokeStyle = INK; g.stroke(); }
}

export function hairBack(g, R, look, hairP) {
  const hs = HAIR[look.hair] || HAIR[0];
  if (hs.back) fillPoly(g, hs.back(Math.sin(R.t * 2) * 0.8 - R.moving * 2), hairP, 2.4);
}
export function hairFront(g, look, hairP) {
  const hs = HAIR[look.hair] || HAIR[0];
  fillPoly(g, hs.front, hairP, 2.4);
  if (hs.tie) fillPoly(g, [[hs.tie[0] - 1, hs.tie[1] - 1.4], [hs.tie[0] + 1.2, hs.tie[1] - 1], [hs.tie[0] + 0.6, hs.tie[1] + 1.4], [hs.tie[0] - 1.4, hs.tie[1] + 1]], GOLD, 0.8, 0.4, 0.8);
}

// slim leg: thigh, shin (cloth, or a greave from the boots), boot. w scales the widths.
export function leg(g, hip, knee, foot, back, { w = 1, pants = PANTS, boots = null, rim, pointed = false } = {}) {
  const d = (P) => (back ? dim(P) : withRim(P, rim));
  fillPoly(g, limbPts(hip, knee, 10 * w, 10.6 * w, 7.4 * w), back ? dim(pants) : pants, 3);
  if (boots) fillPoly(g, limbPts(knee, foot, 7.6 * w, 8.2 * w, 6 * w, 0.3), d(boots.tier >= 2 ? METAL[boots.tier] : LEATHER), 2.6);
  else fillPoly(g, limbPts(knee, foot, 7 * w, 7.4 * w, 5.6 * w, 0.3), back ? dim(pants) : pants, 2.4);
  if (boots && boots.rarity >= 2 && !back) { g.beginPath(); g.moveTo(knee.x - 2, knee.y + 3); g.lineTo(foot.x + 2, foot.y - 4.2); g.lineWidth = 0.7; g.strokeStyle = rcol(boots); g.stroke(); }
  const x = foot.x, y = foot.y, B = boots && boots.tier >= 2 ? METAL[boots.tier] : LEATHER;
  const toe = pointed ? [[x + 11, y + 0.4]] : [[x + 9.4, y + 0.2], [x + 9.4, y + 2.6]];
  fillPoly(g, [[x - 4, y - 4.4], [x + 2.6, y - 5], [x + 5.4, y - 1.8], ...toe, [x - 4.4, y + 2.6]], back ? dim(B) : B, 2);
}

// slim arm: upper (sleeve), forearm (sleeve / bracer), hand
export function arm(g, sh, el, hand, back, { w = 1, upper, fore, handP = SKIN, rim } = {}) {
  const d = (P) => (back ? dim(P) : withRim(P, rim));
  fillPoly(g, limbPts(sh, el, 7.6 * w, 8.4 * w, 6.4 * w), d(upper), 2.8);
  fillPoly(g, limbPts(el, hand, 6.8 * w, 7.2 * w, 5.6 * w, 0.25), d(fore), 2.4);
  const h = hand, s = w;
  fillPoly(g, [[h.x - 3.2 * s, h.y - 2.6 * s], [h.x + 2.4 * s, h.y - 3.4 * s], [h.x + 3.8 * s, h.y + 0.6 * s], [h.x + 1 * s, h.y + 3.6 * s], [h.x - 3 * s, h.y + 2.4 * s]], back ? dim(handP) : handP, 1.8);
}

// weapon trail along the real tip path: re-pose the rig a few moments back.
// tip(Q) → [[x, y] tip, [x, y] inner edge] for a rig state Q.
export function trail(g, R, pose, rig, classId, tip, color) {
  if (R.trail <= 0) return;
  const tips = [], mids = [], step = R.prof === 'snappy' ? 0.016 : 0.011;
  for (let j = 0; j < 12; j++) {
    const b = R.attack - j * step;
    if (b < 0) break;
    const [a, m] = tip(j ? rig(classId, { ...pose, attack: b }) : R);
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
  ribbon(1, color, 0.45);
  ribbon(0.35, '#fff0d8', 0.8);
  g.restore();
}
