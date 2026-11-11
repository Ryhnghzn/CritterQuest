// Prototype C (app/arah.html): the style-D Warrior and a townsperson seen from the FRONT
// (walking toward the camera) and from the BACK (walking away). Same drawing kit as
// src/art/hero (cel shading, rim light, palettes), same frame: ~80 units tall, origin
// between the feet, drawn at the game's doll size. Not mirrored: `turn` (−1..1) only
// shifts the face a little to the left/right for a 3/4 look.
import { fillPoly, limbPts, glow, pal, dim, INK, TAU } from '../src/art/hero/cel.js';
import { SKIN, LEATHER, PANTS, GOLD, WOOD, METAL, rcol, hairPalette } from '../src/art/hero/common.js';
import { HERO_SCALE } from '../src/art/hero/index.js';
import { HAIR_PALETTE } from '../src/art/doll.js';
import { RARITIES, MYTHIC } from '../src/data/items.js';

const WARRIOR_RIM = 'rgba(255,92,60,.9)', NPC_RIM = 'rgba(255,205,150,.75)';
const CLOTH = pal('#77161f', { shade: '#22060d', hi: '#c43c36', hatch: true });
const BLADE = [pal('#77777c'), pal('#7d7f86'), pal('#868a94'), pal('#8a8f9c'), pal('#3a3442', { hi: '#e2d8e4' }), pal('#3a3442', { hi: '#e2d8e4' }), pal('#2e2836', { hi: '#f0e2f0' })];
const rim = (P, r) => ({ ...P, rim: r });
const HAIRS = new Map();
function hairOf(look, r) {
  const key = `${r}:${look.hairColor}`;
  if (!HAIRS.has(key)) HAIRS.set(key, hairPalette(HAIR_PALETTE[look.hairColor] || HAIR_PALETTE[0], r));
  return HAIRS.get(key);
}

// the walk seen head-on: the hips bob, a foot lifts and the arms swing in turn
function body(pose, bobK = 1.45) {
  const { t = 0, moving = 0, walk = 0 } = pose;
  const s = Math.sin(walk);
  const bob = moving ? -Math.abs(s) * 2 * moving * bobK : Math.sin(t * 2) * 0.45 * bobK;
  const hipY = -38.5 + bob;
  const lift = (k) => Math.max(0, k) * 5 * moving;
  return { t, moving, s, hipY, footL: { x: -5.6, y: -2.5 - lift(s) }, footR: { x: 5.6, y: -2.5 - lift(-s) }, swing: s * moving };
}

// ─── shared pieces ────────────────────────────────────────────────────────
function legFront(g, hip, foot, boots, r, back) {
  const knee = { x: (hip.x + foot.x) / 2 + Math.sign(hip.x) * 0.6, y: (hip.y + foot.y) / 2 };
  fillPoly(g, limbPts(hip, knee, 11.6, 12.2, 8.6), PANTS, 3.2);
  const M = boots ? METAL[boots.tier] : null;
  fillPoly(g, limbPts(knee, foot, 8.8, 9.6, 7.2, 0.3), M ? rim(M, r) : PANTS, 2.8);
  if (M && !back) {
    fillPoly(g, [[knee.x - 3.2, knee.y], [knee.x, knee.y - 3.8], [knee.x + 3.2, knee.y], [knee.x, knee.y + 3.6]], M, 1.4);
    if (boots.rarity >= 2) { g.beginPath(); g.moveTo(knee.x, knee.y + 3.6); g.lineTo(foot.x, foot.y - 5); g.lineWidth = 0.8; g.strokeStyle = rcol(boots); g.stroke(); }
  }
  const x = foot.x, y = foot.y, B = M || LEATHER;
  const shoe = back ? [[x - 4.2, y - 6], [x + 4.2, y - 6], [x + 4.4, y + 2.6], [x - 4.4, y + 2.6]]
    : [[x - 4.2, y - 6], [x + 4.2, y - 6], [x + 5, y + 0.6], [x + 3.4, y + 2.8], [x - 3.4, y + 2.8], [x - 5, y + 0.6]];
  fillPoly(g, shoe, B, 2);
}
function armFront(g, sh, el, hand, upper, fore, handP, r, w = 1) {
  fillPoly(g, limbPts(sh, el, 9.6 * w, 10.6 * w, 8 * w), rim(upper, r), 3);
  fillPoly(g, limbPts(el, hand, 8.4 * w, 9 * w, 7 * w, 0.25), rim(fore, r), 2.6);
  const h = hand;
  fillPoly(g, [[h.x - 3.2, h.y - 3], [h.x + 3.2, h.y - 3], [h.x + 3.6, h.y + 1.6], [h.x, h.y + 4], [h.x - 3.6, h.y + 1.6]], handP, 1.8);
}
// arms hang beside the body; walking swings them toward/away from the camera (hand rises a bit)
function arms(B, w = 1) {
  const sy = B.hipY - 21;
  const side = (sx, k) => {
    const sh = { x: sx * 11.4 * w, y: sy };
    const hand = { x: sx * (13.6 * w + Math.abs(k) * 1.2), y: B.hipY - 0.5 - Math.max(0, k) * 3.5 };
    const el = { x: sx * (14.6 * w), y: (sh.y + hand.y) / 2 + 0.5 };
    return { sh, el, hand };
  };
  return { L: side(-1, B.swing), R: side(1, -B.swing) };
}
function pauldronFront(g, at, armor, r) {
  if (!armor) return;
  const t = armor.tier, M = t >= 2 ? METAL[t] : LEATHER, sc = t >= 4 ? 1.05 : t >= 2 ? 0.86 : 0.7, sx = Math.sign(at.x);
  g.save(); g.translate(at.x, at.y + 1.6); g.scale(sc * sx, sc);
  if (t >= 6) fillPoly(g, [[-1, -5.4], [2, -15], [3.8, -5.6]], M, 1.4);
  else if (t >= 4) fillPoly(g, [[0, -5.6], [2.2, -11], [4.2, -5.4]], M, 1.2);
  fillPoly(g, [[-5.4, 3.4], [-6, -2.6], [-1, -6.4], [5.6, -4.6], [8, 1.4], [5, 4.2], [0, 2.6]], rim(M, r), 3.4);
  g.beginPath(); g.moveTo(-5.4, 2.6); g.lineTo(0, 1.8); g.lineTo(7.4, 1.2); g.lineWidth = 1; g.strokeStyle = rcol(armor); g.stroke();
  g.restore();
}

// ─── head & hair (head-local: centre of the head) ─────────────────────────
// hair index as in the game: 0 Pendek, 1 Jabrik, 2 Panjang, 3 Bob, 4 Kuncir
const CROWN = [[-6.6, -1.6], [-6.8, -6], [-4.2, -9.6], [0, -10.6], [4.2, -9.6], [6.8, -6], [6.6, -1.6]];
function hairBehind(g, look, hp, t, m) {
  const sw = Math.sin(t * 2) * 0.6 - m * 1.2;
  if (look.hair === 2) fillPoly(g, [[-7, -4], [7, -4], [8 + sw, 13], [3, 11], [-3, 11], [-8 + sw, 13]], hp, 2.4);
  if (look.hair === 3) fillPoly(g, [[-7.2, -3], [7.2, -3], [7.6, 5.4], [-7.6, 5.4]], hp, 2.4);
  if (look.hair === 4) fillPoly(g, [[5, -6], [10 + sw, -3], [11.4 + sw, 4], [9.6 + sw, 9], [8.4 + sw, 3], [6, -1]], hp, 2.2);
}
function fringe(g, look, hp, fx) {
  const top = [...CROWN];
  if (look.hair === 1) top.splice(2, 3, [-5.6, -10.4], [-3, -9.6], [-1.6, -13], [0.4, -10.4], [3, -12.4], [3.6, -9.6], [6.4, -9.8]);
  const bangs = look.hair === 1
    ? [[6.6, -1.6], [5.2, -5.4], [3.4, -3.2], [2, -6], [0 + fx, -3.6], [-2, -6], [-3.4, -3.4], [-5, -5.6]]
    : look.hair === 3
      ? [[6.6, -1.6], [5.6, -6], [1.6 + fx, -4.4], [-3 + fx, -5.6], [-5.8, -6]]
      : [[6.6, -1.6], [5, -5.2], [2 + fx, -4.4], [-0.6 + fx, -6], [-3.6, -4.6], [-5.4, -5.4]];
  fillPoly(g, [...top, ...bangs], hp, 2.4);
  if (look.hair === 2 || look.hair === 3) { // side locks over the cheeks
    const y2 = look.hair === 2 ? 10 : 5;
    for (const sx of [-1, 1]) fillPoly(g, [[sx * 6.8, -4], [sx * 7.4, y2], [sx * 5.2, y2 - 2.4], [sx * 5, -1.6]], hp, 1.8);
  }
}
function faceFront(g, rimC, t, fx, hurt) {
  fillPoly(g, [[-5.8, -3], [-4.8, -7], [0, -8.4], [4.8, -7], [5.8, -3], [5.6, 1.4], [3.6 + fx * 0.3, 5.2], [fx * 0.4, 6.8], [-3.6 + fx * 0.3, 5.2], [-5.6, 1.4]], rim(SKIN, rimC), 3.4);
  for (const sx of [-1, 1]) fillPoly(g, [[sx * 5.6, -1.6], [sx * 7, -2], [sx * 6.8, 1.4], [sx * 5.6, 1.8]], SKIN, 1, 0.5, 0.7); // ears
  const blink = hurt || t % 3.9 < 0.12;
  for (const sx of [-1, 1]) {
    const ex = fx + sx * 2.5;
    if (blink) { g.beginPath(); g.moveTo(ex - 1.1, -1); g.lineTo(ex + 1.1, -1); g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke(); }
    else {
      g.beginPath(); g.moveTo(ex - 1.3, -1.8); g.lineTo(ex + 1.3, -1.8); g.lineTo(ex + sx * 0.4, -0.2); g.closePath(); g.fillStyle = INK; g.fill();
      g.beginPath(); g.arc(ex + sx * 0.2, -1.3, 0.42, 0, TAU); g.fillStyle = '#ffcf8a'; g.fill();
    }
    g.beginPath(); g.moveTo(ex - sx * 1.4, hurt ? -4 : -3.4); g.lineTo(ex + sx * 1.6, -3.9); g.lineWidth = 1.2; g.strokeStyle = INK; g.stroke();
  }
  g.beginPath(); g.moveTo(fx + 0.3, -0.6); g.lineTo(fx + 0.9, 1.8); g.lineTo(fx - 0.2, 2); g.lineWidth = 0.6; g.strokeStyle = 'rgba(11,7,16,.7)'; g.stroke();
  g.beginPath(); g.moveTo(fx - 1.2, 3.8); g.lineTo(fx + 1.2, hurt ? 4.1 : 3.6); g.lineWidth = 0.7; g.strokeStyle = INK; g.stroke();
}
function headFront(g, at, look, hp, rimC, B, fx, hurt) {
  g.save(); g.translate(at.x, at.y);
  fillPoly(g, [[-2.8, 4], [2.8, 4], [3.2, 8.6], [-3.2, 8.6]], SKIN, 2);
  hairBehind(g, look, hp, B.t, B.moving);
  faceFront(g, rimC, B.t, fx, hurt);
  fringe(g, look, hp, fx);
  if (look.hair === 4) fillPoly(g, [[5.4, -6.6], [7.2, -6.2], [6.8, -4], [5, -4.4]], GOLD, 0.8, 0.4, 0.8);
  g.restore();
}
function headBack(g, at, look, hp, B) {
  g.save(); g.translate(at.x, at.y);
  fillPoly(g, [[-2.8, 4], [2.8, 4], [3.2, 8.6], [-3.2, 8.6]], dim(SKIN), 2);
  for (const sx of [-1, 1]) fillPoly(g, [[sx * 5.8, -1.6], [sx * 7.2, -2], [sx * 7, 1.4], [sx * 5.8, 1.8]], SKIN, 1, 0.5, 0.7);
  const sw = Math.sin(B.t * 2) * 0.6 - B.moving * 1.2;
  const low = look.hair === 2 ? [[8 + sw, 13], [0, 14.4], [-8 + sw, 13]] : look.hair === 3 ? [[7.6, 5.6], [0, 6.4], [-7.6, 5.6]] : [[6.4, 3], [3, 5.6], [-3, 5.6], [-6.4, 3]];
  let top = CROWN;
  if (look.hair === 1) top = [[-6.6, -1.6], [-9.4, -5], [-6.6, -7], [-6.8, -11], [-3, -10], [-1, -13.6], [1.4, -10.4], [4.6, -12.6], [5.4, -9], [9.4, -7.6], [6.8, -5], [6.6, -1.6]];
  fillPoly(g, [...top, ...low], hp, 2.6);
  // a parting line and a couple of strands so the back of the head reads as hair, not a ball
  g.beginPath(); g.moveTo(0, -10); g.lineTo(-0.6, -4); g.moveTo(-3.6, -8.4); g.lineTo(-4.6, -1); g.moveTo(3.6, -8.4); g.lineTo(4.4, -1);
  g.lineWidth = 0.55; g.strokeStyle = 'rgba(11,7,16,.55)'; g.stroke();
  if (look.hair === 4) {
    fillPoly(g, [[-1.8, -4], [1.8, -4], [2.6 + sw, 6], [0 + sw, 12], [-2.6 + sw, 6]], hp, 2.2);
    fillPoly(g, [[-1.8, -5], [1.8, -5], [1.6, -2.6], [-1.6, -2.6]], GOLD, 0.8, 0.4, 0.8);
  }
  g.restore();
}

// ─── Warrior's gear ───────────────────────────────────────────────────────
function sword(g, hand, ang, weapon) {
  const tier = weapon ? weapon.tier : 0, rar = weapon ? weapon.rarity : 0, L = 25 + tier * 1.6, w = 2.5 + tier * 0.22, c = RARITIES[rar].color;
  g.save(); g.translate(hand.x, hand.y); g.rotate(ang);
  fillPoly(g, [[-6.6, 0], [-5.2, -1.6], [-3.8, 0], [-5.2, 1.6]], GOLD, 1, 0.5, 0.8);
  fillPoly(g, [[-4, -1.3], [3, -1.4], [3, 1.4], [-4, 1.3]], LEATHER, 1, 0.4, 0.8);
  fillPoly(g, [[5.6, -w], [L - 9, -w - 0.4], [L, 0], [L - 9, w + 0.4], [5.6, w]], BLADE[tier], 2.2, 0.9, 1.1);
  if (rar >= 2) { g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.moveTo(7, 0); g.lineTo(L - 6, 0); g.lineWidth = 0.6; g.strokeStyle = c; g.stroke(); g.restore(); }
  if (rar >= 3) for (let i = 0; i < 4; i++) glow(g, 11 + i * (L - 14) / 4, 0, 7, c, (rar - 2) * 0.1);
  fillPoly(g, [[3, -1.6], [4.4, -6.2], [6, -5.6], [5.6, -1.6], [5.6, 1.6], [6, 5.6], [4.4, 6.2], [3, 1.6]], tier >= 2 ? GOLD : METAL[tier], 1.2, 0.6, 0.9);
  g.restore();
}
function shieldShape(tier) {
  const kite = tier >= 4;
  return kite ? [[-11, -14], [11, -14], [11.4, -3], [7, 8.6], [0, 17], [-7, 8.6], [-11.4, -3]] : [[-10, -12], [10, -12], [10, -2], [6, 7.4], [0, 12.6], [-6, 7.4], [-10, -2]];
}
const ring = (r, n = 14) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * TAU) * r, Math.sin((i / n) * TAU) * r]);
function shieldFace(g, at, weapon, t) { // the painted face, toward the camera
  const tier = weapon ? weapon.tier : 0, rar = weapon ? weapon.rarity : 0, M = METAL[tier], c = RARITIES[rar].color, tc = rar >= 1 ? c : '#8a6a3a';
  g.save(); g.translate(at.x, at.y); g.scale(0.92, 0.92);
  if (tier <= 1) {
    fillPoly(g, ring(11.5), rim(M, WARRIOR_RIM), 3); fillPoly(g, ring(9.6), WOOD, 3.4); fillPoly(g, ring(3.2, 8), M, 1.2, 0.6, 0.9);
  } else {
    const outer = shieldShape(tier), inner = outer.map(([x, y]) => [x * 0.78, y * 0.8 - 0.6]);
    fillPoly(g, outer, rim(M, WARRIOR_RIM), 4);
    fillPoly(g, inner, tier >= 4 ? pal('#3a2a44') : pal('#6a1a22'), 3);
    g.beginPath(); g.moveTo(0, inner[0][1]); g.lineTo(0, inner[4][1]); g.moveTo(inner[6][0], -3.4); g.lineTo(inner[2][0], -3.4);
    g.lineWidth = 1.4; g.strokeStyle = tc; g.stroke();
    if (rar >= 3) { fillPoly(g, [[0, -6.4], [2.4, -3.4], [0, -0.4], [-2.4, -3.4]], pal(c, { hi: '#fff4f6' }), 1, 0.6, 0.8); glow(g, 0, -3.4, 10, c, 0.4 + 0.2 * Math.sin(t * 3)); }
  }
  g.restore();
}
function shieldBackside(g, at, weapon) { // wooden back, straps and the arm through them
  const tier = weapon ? weapon.tier : 0, M = METAL[tier];
  g.save(); g.translate(at.x, at.y); g.scale(0.92, 0.92);
  const outer = tier <= 1 ? ring(11.5) : shieldShape(tier);
  fillPoly(g, outer, dim(M), 3);
  fillPoly(g, outer.map(([x, y]) => [x * 0.86, y * 0.88]), dim(WOOD), 3);
  for (const y of [-5, 3]) fillPoly(g, [[-7, y - 1.4], [7, y - 1.4], [7, y + 1.4], [-7, y + 1.4]], LEATHER, 1, 0.4, 0.8);
  g.restore();
}
function torsoFront(g, B, armor, r) {
  const tier = armor ? armor.tier : -1;
  g.save(); g.translate(0, B.hipY);
  fillPoly(g, [[-11, -23], [11, -23], [9.4, -12], [7.4, -1.6], [-7.4, -1.6], [-9.4, -12]], tier < 0 ? CLOTH : LEATHER, 3.4);
  if (tier >= 0) {
    const M = tier >= 2 ? METAL[tier] : pal('#6a4a34'), tc = rcol(armor);
    fillPoly(g, [[-10.8, -24.6], [10.8, -24.6], [11.4, -16], [7.4, -9], [0, -7.6], [-7.4, -9], [-11.4, -16]], rim(M, r), 4);
    g.beginPath(); g.moveTo(0, -24.6); g.lineTo(0, -7.6); g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(-10.6, -19.6); g.lineTo(0, -15.6); g.lineTo(10.6, -19.6); g.lineWidth = 1; g.strokeStyle = tc; g.stroke();
    if (tier >= 4) { g.beginPath(); g.moveTo(-8.6, -14); g.lineTo(0, -11); g.lineTo(8.6, -14); g.lineWidth = 0.9; g.strokeStyle = tc; g.stroke(); }
    if (armor.rarity >= 3) {
      const c = RARITIES[armor.rarity].color;
      fillPoly(g, [[0, -14.6], [2, -12], [0, -9.4], [-2, -12]], pal(c, { hi: '#fff4f6' }), 1, 0.6, 0.8);
      glow(g, 0, -12, 9, c, 0.4 + 0.25 * Math.sin(B.t * 3));
    }
    if (armor.rarity === MYTHIC) { g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.moveTo(-6, -21); g.lineTo(-3, -18); g.lineTo(-5, -15); g.lineWidth = 0.7; g.strokeStyle = 'rgba(255,90,70,.8)'; g.stroke(); g.restore(); }
    if (tier >= 2) for (const sx of [-1, 1]) fillPoly(g, [[sx * 7.6, -2.8], [sx * 2.6, -2.8], [sx * 3.4, 5], [sx * 8.4, 3.4]], M, 2);
  } else fillPoly(g, [[-9, -22.6], [-6, -23], [8.6, -6], [5.6, -5.2]], LEATHER, 1.2, 0.5, 0.9);
  fillPoly(g, [[-7.8, -6.8], [7.8, -6.8], [7.8, -3.4], [-7.8, -3.4]], LEATHER, 1.2, 0.6, 0.9);
  fillPoly(g, [[-1.8, -7.4], [1.8, -7.4], [1.8, -2.8], [-1.8, -2.8]], GOLD, 1, 0.5, 0.8);
  const sw = Math.sin(B.t * 3 + 1) * 0.6;
  fillPoly(g, [[-3.6, -3.4], [3.6, -3.4], [3.2 + sw, 9], [sw, 13.4], [-3.2 + sw, 9]], CLOTH, 2.4);
  g.restore();
}
function torsoBack(g, B, armor, r) {
  const tier = armor ? armor.tier : -1, M = tier >= 2 ? METAL[tier] : LEATHER;
  g.save(); g.translate(0, B.hipY);
  fillPoly(g, [[-11, -23], [11, -23], [9.4, -12], [7.4, -1.6], [-7.4, -1.6], [-9.4, -12]], tier < 0 ? CLOTH : rim(M, r), 3.4);
  fillPoly(g, [[-7.8, -6.8], [7.8, -6.8], [7.8, -3.4], [-7.8, -3.4]], LEATHER, 1.2, 0.6, 0.9);
  g.restore();
}
// the cape: from the front only its edges show beside the body; from the back it is the whole picture
function capeOf(B, armor, wide) {
  const tier = armor ? armor.tier : -1, y0 = B.hipY - 23, bottom = -12 + (tier + 1) * 1.2;
  const flap = (i) => Math.sin(B.t * 3 + i * 1.3) * (0.8 + B.moving * 1.6);
  const n = 7, W0 = 10.4, W1 = wide ? 14.6 + B.moving * 1.4 : 13.4;
  const pts = [[-W0, y0], [W0, y0], [W1 + flap(0), bottom - 6]];
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = W1 - k * W1 * 2;
    pts.push([x + flap(i), bottom + (i % 2 ? -3.4 : 0) + Math.abs(k - 0.5) * -3]);
  }
  pts.push([-W1 + flap(n), bottom - 6]);
  return pts;
}
function cape(g, B, armor, back) {
  const pts = capeOf(B, armor, back);
  fillPoly(g, pts, back ? rim(CLOTH, WARRIOR_RIM) : dim(CLOTH), 4.4);
  const tier = armor ? armor.tier : -1;
  if (back) { // folds and the trim
    g.beginPath();
    for (const x of [-6, -1.6, 3, 7.4]) { g.moveTo(x * 0.7, B.hipY - 20); g.lineTo(x + Math.sin(B.t * 3 + x) * 0.8, pts[5][1] - 4); }
    g.lineWidth = 0.6; g.strokeStyle = 'rgba(11,7,16,.5)'; g.stroke();
    if (tier >= 2) {
      g.beginPath(); g.moveTo(pts[2][0], pts[2][1]); for (let i = 3; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.lineWidth = 1.1; g.strokeStyle = armor.rarity >= 2 ? rcol(armor) : '#b08a3a'; g.stroke();
    }
  }
}

// ─── the two views ────────────────────────────────────────────────────────
export function drawWarriorView(g, view, look, pose, turn = 0) {
  const gear = look.gear || {}, { armor, boots, weapon } = gear, r = WARRIOR_RIM, hp = hairOf(look, r);
  const B = body(pose), A = arms(B, 1.05), t = armor ? armor.tier : -1;
  const upper = t >= 4 ? METAL[t] : SKIN, fore = t >= 2 ? METAL[t] : LEATHER, handP = t >= 4 ? METAL[t] : SKIN;
  const headAt = { x: 0, y: B.hipY - 30.4 }, fx = turn * 1.5;
  g.save(); const S = HERO_SCALE * 1.1; g.scale(S, S); g.lineJoin = 'miter'; g.lineCap = 'round';
  if (view === 'front') {
    // hero's right hand (sword) is on the screen's left; the shield on the left arm, face out
    cape(g, B, armor, false);
    legFront(g, { x: -4.6, y: B.hipY + 1 }, B.footL, boots, r, false);
    legFront(g, { x: 4.6, y: B.hipY + 1 }, B.footR, boots, r, false);
    torsoFront(g, B, armor, r);
    sword(g, A.L.hand, Math.atan2(1, -0.32), weapon);
    armFront(g, A.L.sh, A.L.el, A.L.hand, upper, fore, handP, r, 1.05);
    armFront(g, A.R.sh, A.R.el, A.R.hand, upper, fore, handP, r, 1.05);
    shieldFace(g, { x: A.R.hand.x + 1, y: A.R.hand.y - 6 }, weapon, B.t);
    headFront(g, headAt, look, hp, r, B, fx, pose.hurt);
    pauldronFront(g, A.L.sh, armor, r); pauldronFront(g, A.R.sh, armor, r);
  } else {
    // from behind: the sword hand is on the screen's right, the shield shows its wooden back
    shieldBackside(g, { x: A.L.hand.x - 1, y: A.L.hand.y - 6 }, weapon);
    sword(g, A.R.hand, Math.atan2(1, 0.32), weapon);
    legFront(g, { x: -4.6, y: B.hipY + 1 }, B.footL, boots, r, true);
    legFront(g, { x: 4.6, y: B.hipY + 1 }, B.footR, boots, r, true);
    torsoBack(g, B, armor, r);
    armFront(g, A.L.sh, A.L.el, A.L.hand, upper, fore, handP, r, 1.05);
    armFront(g, A.R.sh, A.R.el, A.R.hand, upper, fore, handP, r, 1.05);
    cape(g, B, armor, true);
    headBack(g, headAt, look, hp, B);
    pauldronFront(g, A.L.sh, armor, r); pauldronFront(g, A.R.sh, armor, r);
  }
  g.restore();
}

// a townsperson: tunic in the outfit colour, sleeves, a sash
export function drawNpcView(g, view, look, pose, turn = 0) {
  const r = NPC_RIM, hp = hairOf(look, r), B = body(pose, 0.9), A = arms(B, 0.86);
  const cloth = pal(look.outfit[0], { shade: look.outfit[1] }), sleeve = pal(look.outfit[1]);
  const headAt = { x: 0, y: B.hipY - 30.4 }, fx = turn * 1.5;
  g.save(); g.scale(HERO_SCALE, HERO_SCALE); g.lineJoin = 'miter'; g.lineCap = 'round';
  legFront(g, { x: -4, y: B.hipY + 1 }, { x: B.footL.x * 0.85, y: B.footL.y }, null, r, view === 'back');
  legFront(g, { x: 4, y: B.hipY + 1 }, { x: B.footR.x * 0.85, y: B.footR.y }, null, r, view === 'back');
  armFront(g, A.L.sh, A.L.el, A.L.hand, sleeve, sleeve, SKIN, r, 0.86);
  armFront(g, A.R.sh, A.R.el, A.R.hand, sleeve, sleeve, SKIN, r, 0.86);
  g.save(); g.translate(0, B.hipY);
  fillPoly(g, [[-9.4, -23], [9.4, -23], [8.4, -10], [10, 6], [-10, 6], [-8.4, -10]], rim(cloth, r), 3.4);
  if (view === 'front') {
    fillPoly(g, [[-3.4, -23], [3.4, -23], [0, -17]], SKIN, 1.2, 0.5, 0.8); // the neckline
    g.beginPath(); g.moveTo(0, -17); g.lineTo(0, 6); g.lineWidth = 0.7; g.strokeStyle = 'rgba(11,7,16,.5)'; g.stroke();
  }
  fillPoly(g, [[-8.8, -7], [8.8, -7], [8.8, -3.6], [-8.8, -3.6]], LEATHER, 1.2, 0.6, 0.9);
  g.restore();
  if (view === 'front') headFront(g, headAt, look, hp, r, B, fx, pose.hurt);
  else headBack(g, headAt, look, hp, B);
  g.restore();
}
