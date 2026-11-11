// SpriteGenerator + SpriteAnimation for characters. Each character is a small skeleton
// (hip, knees, shoulders, hands, head) posed per frame; parts are shaded shapes drawn on
// that skeleton in a fixed order, then outlined. Frames are 48×48, feet on row 45,
// facing right (the renderer mirrors for left). Rotating the whole skeleton (death)
// redraws the figure in pixels instead of rotating a bitmap.
import { PixelSprite, ellipse, capsule, poly, rect, clip } from './sprite.js';
import { RAMP } from './palette.js';

export const FRAME = 48;
const G = 45; // ground row

function ik(a, b, l1, l2, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01) || 0.01;
  const ang = Math.atan2(dy, dx), off = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const t = ang - bend * off;
  return [a[0] + Math.cos(t) * l1, a[1] + Math.sin(t) * l1];
}
const add = (p, x, y) => [p[0] + x, p[1] + y];

// ---- humanoid skeleton -----------------------------------------------------------------
function humanoid(p) {
  const hip = [24, G - 14 + (p.crouch || 0) + (p.bob || 0)], lean = p.lean || 0;
  const u = [Math.sin(lean), -Math.cos(lean)], r = [Math.cos(lean), Math.sin(lean)];
  // fall: rotate everything around the feet, then shift (death frames)
  const piv = [24, G], fa = p.fall || 0, cs = Math.cos(fa), sn = Math.sin(fa), sx = p.shiftX || 0, sy = p.shiftY || 0;
  const F = ([x, y]) => [piv[0] + (x - piv[0]) * cs - (y - piv[1]) * sn + sx, piv[1] + (x - piv[0]) * sn + (y - piv[1]) * cs + sy];
  const raw = (a, b) => [hip[0] + r[0] * a + u[0] * b, hip[1] + r[1] * a + u[1] * b];
  const Q = (a, b) => F(raw(a, b));
  const footF = [24 + (p.stepF ?? 3), G - (p.liftF || 0)], footB = [24 + (p.stepB ?? -3), G - (p.liftB || 0)];
  const hipF = raw(1, 0), hipB = raw(-1, 0);
  const kneeF = ik(hipF, footF, 7.4, 7.4, 1), kneeB = ik(hipB, footB, 7.4, 7.4, 1);
  const shF = raw(2, 11), shB = raw(-1.5, 11);
  const arm = (sh, a, e) => { const el = add(sh, Math.sin(a) * 5, Math.cos(a) * 5); return [el, add(el, Math.sin(a + e) * 5, Math.cos(a + e) * 5)]; };
  const [elF, hF] = arm(shF, (p.aF ?? 0.35) + lean, p.eF ?? 0.9), [elB, hB] = arm(shB, (p.aB ?? -0.2) + lean, p.eB ?? 0.3);
  const hl = lean * 1.4, head = [hip[0] + Math.sin(hl) * 17 + Math.cos(hl) * 1.2, hip[1] - Math.cos(hl) * 17 + Math.sin(hl) * 1.2];
  return {
    Q, F, hip: F(hip), hipF: F(hipF), hipB: F(hipB), kneeF: F(kneeF), kneeB: F(kneeB), footF: F(footF), footB: F(footB),
    shF: F(shF), shB: F(shB), elF: F(elF), hF: F(hF), elB: F(elB), hB: F(hB), head: F(head),
  };
}

function leg(s, hip, knee, foot, pants, boot, bias) {
  s.paint(capsule(...hip, ...knee, 2.3, 2.0), pants, { bias });
  s.paint(capsule(...knee, foot[0], foot[1] - 1.4, 2.0, 1.8), boot, { bias });
  s.paint(ellipse(foot[0] + 1.3, foot[1] - 1.1, 2.6, 1.35), boot, { bias });
}

function face(s, H, o = {}) {
  const ex = Math.floor(H[0] + 2.2), ey = Math.floor(H[1] + 0.2);
  if (o.dead) s.fill(rect(ex - 1, ey + 1, 2, 1), 'skin', 0);
  else { s.fill(rect(ex, ey, 1, 2), 'ui', 0); s.fill(rect(ex - 1, ey - 1, 2, 1), o.brow || 'hair', o.browL ?? 1); }
  s.dot(ex + 1, ey + 3, 'skin', 1); // mouth corner
}

// ---- the hero: a knight in a red tabard, steel pauldron and longsword ---------------------
function hero(s, p) {
  const K = humanoid(p), Q = K.Q, H = K.head, sway = p.cape || 0;
  // cape behind
  s.paint(poly([Q(-1.2, 11.6), Q(1.4, 11.6), Q(-3.2, 2), Q(-5.5 - sway, -5.2), Q(-8.8 - sway * 1.6, -4.4), Q(-5.6, 5.5)]), 'red', { bias: -1 });
  // back arm, back leg
  s.paint(capsule(...K.shB, ...K.elB, 1.8), 'red', { bias: -1 });
  s.paint(capsule(...K.elB, ...K.hB, 1.7, 1.5), 'metal', { bias: -1 });
  s.paint(ellipse(...K.hB, 1.3, 1.3), 'leather', { bias: -1 });
  leg(s, K.hipB, K.kneeB, K.footB, 'blue', 'leather', -1);
  // breastplate
  const C = Q(0.5, 8);
  s.paint(poly([Q(-4, 11.8), Q(4.2, 11.8), Q(4.7, 8), Q(3.6, 2), Q(-3.4, 2), Q(-4.3, 7)], { cx: C[0], cy: C[1], rx: 5, ry: 6 }), 'metal');
  leg(s, K.hipF, K.kneeF, K.footF, 'blue', 'leather', 0);
  // tabard over the thighs, belt, buckle
  s.paint(poly([Q(-2.6, 8.4), Q(3.2, 8.4), Q(3.7, 1), Q(4.5, -5.2), Q(-1.6, -5.2), Q(-3.1, 1)]), 'red');
  s.fill(rect(...Q(0.4, 6.6), 1, 2), 'gold', 3);
  s.paint(capsule(...Q(-3.6, 2.6), ...Q(3.9, 2.6), 0.9), 'leather');
  s.dot(...Q(2.2, 2.2).map(Math.floor), 'gold', 4);
  // neck, head, hair, face
  s.paint(capsule(...Q(0.5, 11), ...Q(1, 13), 1.4), 'skin', { bias: -1 });
  s.paint(capsule(H[0] - 3.4, H[1] + 0.5, H[0] - 4.8, H[1] + 4.6, 1.7, 1.0), 'hair');
  s.paint(ellipse(...H, 3.9, 4.3), 'skin', { bias: 1 });
  s.paint(clip(ellipse(H[0] - 0.7, H[1] - 0.9, 4.4, 4.5), (x, y) => y < H[1] - 1.9 || x < H[0] - 0.6), 'hair', { rim: true });
  s.paint(poly([add(H, 0.6, -4.6), add(H, 4.4, -3), add(H, 3.4, -2.1), add(H, 1.4, -2.6)]), 'hair');
  face(s, H, { dead: p.dead });
  // swing smear (behind the arm)
  if (p.smear) smear(s, K.shF, p.smear[0], p.smear[1], p.smear[2] ?? 3.2);
  // pauldron with a gold rim
  const ps = add(K.shF, 0, 0.3);
  s.paint(ellipse(ps[0], ps[1], 3.4, 2.7), 'metal', { rim: true });
  s.paint(clip(ellipse(ps[0], ps[1], 3.4, 2.7), (x, y) => y > ps[1] + 1.5), 'gold');
  // front arm and sword
  s.paint(capsule(...K.shF, ...K.elF, 1.8), 'red');
  s.paint(capsule(...K.elF, ...K.hF, 1.7, 1.5), 'metal', { rim: true });
  if (p.dropSword) sword(s, [27, 43.6], Math.PI / 2 + 0.05);
  else sword(s, K.hF, p.w ?? 1.2);
  s.paint(ellipse(...K.hF, 1.4, 1.4), 'leather');
  return s.outline();
}

function sword(s, h, w) {
  const d = [Math.sin(w), -Math.cos(w)], n = [-d[1], d[0]], at = (k, m = 0) => [h[0] + d[0] * k + n[0] * m, h[1] + d[1] * k + n[1] * m];
  s.paint(capsule(...at(-2.2), ...at(1.4), 0.8), 'leather');
  s.paint(capsule(...at(2.2), ...at(15.5), 1.15, 0.55), 'metal', { rim: true });
  s.paint(capsule(...at(1.6, 2.6), ...at(1.6, -2.6), 0.85), 'gold');
  s.paint(ellipse(...at(-2.8), 1.1, 1.1), 'gold');
}

// a pale arc swept by the blade between angles a0 → a1 (0 = up, clockwise), width wd
function smear(s, c, a0, a1, wd) {
  const r0 = 12.5, r1 = r0 + wd;
  s.paint({ x0: c[0] - r1 - 1, y0: c[1] - r1 - 1, x1: c[0] + r1 + 1, y1: c[1] + r1 + 1, f: (x, y) => {
    const dx = x - c[0], dy = y - c[1], d = Math.hypot(dx, dy);
    if (d < r0 || d > r1) return null;
    const a = Math.atan2(dx, -dy);
    if (a < a0 || a > a1) return null;
    const along = (a - a0) / (a1 - a0); // brighter toward the blade's current angle
    return 0.05 + along * 0.55 + ((d - r0) / wd) * 0.3;
  } }, 'smear', { edge: false });
}

// ---- NPC: the lantern keeper (hooded elder, staff, hanging lantern) -----------------------
function keeper(s, p) {
  const K = humanoid({ ...p, stepF: 2, stepB: -2, aF: 0.55, eF: 0.75, aB: 0.25, eB: 0.5 }), Q = K.Q, H = K.head;
  // staff behind the body, taller than him
  const sx = K.hB[0] - 0.5;
  s.paint(capsule(sx, 5.5, sx + 0.6, G, 0.9), 'wood', { bias: -1 });
  s.paint(capsule(sx, 5.8, sx - 2.4, 4.2, 0.8), 'wood', { bias: -1 });
  s.paint(capsule(...K.shB, ...K.elB, 1.9), 'blue', { bias: -1 });
  s.paint(ellipse(...K.hB, 1.4, 1.4), 'skin', { bias: -1 });
  // feet tips under the robe
  s.paint(ellipse(K.footB[0] + 1.4, 44.2, 2.2, 1.1), 'leather', { bias: -1 });
  s.paint(ellipse(K.footF[0] + 1.4, 44.2, 2.2, 1.1), 'leather');
  // robe with a dark hem and a rope belt
  const robe = [Q(-4, 11.5), Q(4.4, 11.5), Q(5.4, 0), Q(6.3, -12.6), Q(-5.8, -12.6), Q(-4.9, 0)], C = Q(0, 2);
  s.paint(poly(robe, { cx: C[0], cy: C[1], rx: 6.5, ry: 13, flatY: 0.35 }), 'blue');
  s.paint(clip(poly(robe), (x, y) => y > G - 2.6), 'blue', { level: 1, edge: false });
  s.paint(clip(poly(robe), (x, y) => y > G - 3.3 && y <= G - 2.6), 'gold', { level: 1, edge: false });
  s.paint(capsule(...Q(-4.5, 3), ...Q(5, 3), 0.8), 'leather');
  s.paint(capsule(...Q(3, 2.6), ...Q(3.8, -3.4), 0.6), 'leather');
  // mantle and hood
  s.paint(poly([Q(-5.2, 12.6), Q(5.2, 12.6), Q(6, 7), Q(0, 5.6), Q(-5.6, 6.6)]), 'leather');
  s.paint(ellipse(H[0] - 0.9, H[1] - 0.4, 4.9, 5.2), 'leather', { rim: true });
  s.paint(clip(ellipse(H[0] + 0.5, H[1] + 0.5, 3.4, 3.8), (x) => x > H[0] - 0.4), 'skin');
  s.paint(poly([add(H, -0.2, 2.2), add(H, 3.9, 2), add(H, 3, 6.6), add(H, 0.9, 7.6), add(H, -0.6, 4.2)]), 'bone');
  face(s, H, { brow: 'bone', browL: 3 });
  // front arm with a wide sleeve, the lantern hanging from the hand
  s.paint(capsule(...K.shF, ...K.elF, 1.9), 'blue');
  s.paint(capsule(...K.elF, ...K.hF, 2.0, 1.6), 'blue', { rim: true });
  const lx = Math.round(K.hF[0] + (p.sway || 0)), ly = Math.round(K.hF[1]) + 2;
  s.fill(rect(Math.round(K.hF[0]), Math.round(K.hF[1]), 1, 2), 'metal', 1);
  s.fill(rect(lx - 2, ly, 5, 1), 'metal', 2);
  s.fill(rect(lx - 2, ly + 1, 5, 4), 'metal', 1);
  s.fill(rect(lx - 1, ly + 1, 3, 4), 'torch', 3);
  s.fill(rect(lx, ly + 2, 1, 2), 'torch', 4);
  s.fill(rect(lx - 1, ly + 5, 3, 1), 'metal', 2);
  s.paint(ellipse(...K.hF, 1.4, 1.4), 'skin');
  return s.outline();
}

// ---- enemy: a shadow wolf with a spiked ruff and ember eyes ------------------------------
function wolf(s, p) {
  const ox = 21 + (p.lunge || 0), oy = 31 + (p.crouch || 0) + (p.bob || 0), B = [ox, oy];
  const FS = [ox + 7, oy + 2], HS = [ox - 7, oy + 1], L = p.legs || [1, -1, 1, -1], lift = p.lift || [0, 0, 0, 0];
  const foot = (base, i) => (p.lie ? [base[0] + 7 + i, oy + 3.5] : [base[0] + L[i], G - lift[i]]);
  const limb = (base, f, bend, bias) => {
    const k = ik(base, f, 6.2, 6.6, bend);
    s.paint(capsule(...base, ...k, 2.1, 1.6), 'fur', { bias });
    s.paint(capsule(...k, ...f, 1.4, 1.1), 'fur', { bias });
    s.paint(ellipse(f[0] + 1, f[1] - 0.7, 1.9, 1.1), 'fur', { bias });
  };
  // far legs, tail
  limb(add(FS, -1.5, 0), foot(add(FS, -1.5, 0), 1), -1, -1);
  limb(add(HS, 1.5, 0), foot(add(HS, 1.5, 0), 3), 1, -1);
  const tl = p.tail || 0;
  s.paint(capsule(...add(B, -8.5, -2), ...add(B, -13.5, -4.5 + tl), 2.4, 1.8), 'fur');
  s.paint(capsule(...add(B, -13.5, -4.5 + tl), ...add(B, -18, -1.5 + tl * 1.5), 1.8, 0.8), 'fur');
  // body and chest, then the spiked ruff along the back
  s.paint(ellipse(ox, oy, 10.2, 5.4), 'fur');
  s.paint(ellipse(ox + 6, oy - 1, 5.6, 6.2), 'fur');
  for (const [i, hgt] of [[-7, 3], [-3.5, 4], [0, 4.5], [3.5, 5.5], [6.5, 6.5]]) {
    s.paint(poly([add(B, i - 2, -4.2), add(B, i - 4.5, -4.2 - hgt), add(B, i + 1.8, -4.6)]), 'fur', { rim: true });
  }
  // near legs
  limb(HS, foot(HS, 2), 1, 0);
  limb(FS, foot(FS, 0), -1, 0);
  // head
  const H = [ox + 13.5 + (p.headX || 0), oy - 4 + (p.headDown || 0)], jaw = p.jaw || 0;
  const J = add(H, 1.5, 2.6), jr = (x, y) => [J[0] + x * Math.cos(jaw) - y * Math.sin(jaw), J[1] + x * Math.sin(jaw) + y * Math.cos(jaw)];
  if (jaw > 0.15) s.paint(poly([add(H, 1.5, 2.4), add(H, 8, 2.4), jr(6, 1), jr(0.5, 1.8)]), 'red', { level: 1, edge: false });
  s.paint(poly([jr(0, 0), jr(6.6, 0.4), jr(6, 1.9), jr(0.5, 2.1)]), 'fur', { bias: -1 });
  s.paint(ellipse(H[0], H[1], 4.6, 3.9), 'fur', { rim: true });
  s.paint(poly([add(H, 1, -1.8), add(H, 8.6, 0.2), add(H, 8.6, 2.4), add(H, 1.6, 3)]), 'fur', { rim: true });
  s.paint(poly([add(H, -2.4, -2.4), add(H, -1.4, -8.4), add(H, 1.4, -2.8)]), 'fur', { rim: true });
  s.dot(Math.floor(H[0] + 8.6), Math.floor(H[1] + 0.4), 'ui', 0);
  if (jaw > 0.15) for (let i = 0; i < 3; i++) { s.dot(Math.floor(H[0] + 4 + i * 1.6), Math.floor(H[1] + 2.6), 'bone', 4); const q = jr(2.5 + i * 1.6, -0.2); s.dot(Math.floor(q[0]), Math.floor(q[1]), 'bone', 3); }
  const ex = Math.floor(H[0] + 2), ey = Math.floor(H[1] - 1);
  if (p.dead) s.fill(rect(ex, ey + 1, 2, 1), 'fur', 0);
  else { s.fill(rect(ex, ey, 2, 1), 'ember', 4); s.dot(ex - 1, ey, 'ember', 2); }
  return s.outline();
}


// ---- the mage: wide-brimmed pointed hat, long robe, staff with an arcane crystal -----------
function mage(s, p) {
  const K = humanoid({ stepF: 2, stepB: -2, ...p }), Q = K.Q, H = K.head, sway = p.cape || 0;
  // scarf/cape behind
  s.paint(poly([Q(-1, 11.4), Q(1.2, 11.4), Q(-3, 2), Q(-4.8 - sway, -8), Q(-7.6 - sway * 1.4, -7.2), Q(-5.2, 4)]), 'red', { bias: -1 });
  // back arm (free hand flares while casting)
  s.paint(capsule(...K.shB, ...K.elB, 1.8), 'blue', { bias: -1 });
  s.paint(ellipse(...K.hB, 1.3, 1.3), 'skin', { bias: -1 });
  if (p.handGlow) { s.fill(ellipse(K.hB[0], K.hB[1], 2.4, 2.4), 'arcane', 2); s.fill(ellipse(K.hB[0], K.hB[1], 1.2, 1.2), 'arcane', 4); }
  // feet under the robe
  s.paint(ellipse(K.footB[0] + 1.3, K.footB[1] - 0.8, 2.2, 1.1), 'leather', { bias: -1 });
  s.paint(ellipse(K.footF[0] + 1.3, K.footF[1] - 0.8, 2.2, 1.1), 'leather');
  // robe: split at the front so the stride shows, gold hem, sash
  const hemY = (K.footF[1] + K.footB[1]) / 2 - 1.8, fx = K.footF[0], bx = K.footB[0];
  const robe = [Q(-3.8, 11.4), Q(4.2, 11.4), Q(4.8, 2), [Math.max(fx, K.hip[0]) + 4, hemY + 0.6], [K.hip[0] + 0.5, hemY - 0.4], [Math.min(bx, K.hip[0]) - 4.2, hemY + 0.6], Q(-4.6, 2)];
  const C = Q(0, 3);
  s.paint(poly(robe, { cx: C[0], cy: C[1], rx: 6.5, ry: 12, flatY: 0.35 }), 'blue');
  s.paint(clip(poly(robe), (x, y) => y > hemY - 1.2), 'gold', { level: 2, edge: false });
  s.paint(clip(poly(robe), (x, y) => Math.abs(x - (K.hip[0] + 0.6) - (y - hemY) * 0.05) < 0.8 && y > K.hip[1] - 1), 'gold', { level: 1, edge: false });
  s.paint(capsule(...Q(-4, 3.2), ...Q(4.6, 3.2), 1.1), 'red');
  s.paint(capsule(...Q(-3.2, 3), ...Q(-4.4, -3.5), 0.7), 'red', { bias: -1 });
  // collar mantle
  s.paint(poly([Q(-4.6, 12.4), Q(4.8, 12.4), Q(5.4, 8), Q(0.4, 6.8), Q(-5, 7.6)]), 'blue', { rim: true });
  s.dot(...Q(1.4, 9).map(Math.floor), 'gold', 4);
  // head, then the hat (brim, bent cone, band)
  s.paint(capsule(H[0] - 2.6, H[1] + 1, H[0] - 3.6, H[1] + 5.4, 1.5, 1), 'hair');
  s.paint(ellipse(...H, 3.7, 4.1), 'skin', { bias: 1 });
  s.paint(clip(ellipse(H[0] - 0.8, H[1] - 0.6, 4.2, 4.3), (x, y) => x < H[0] - 0.8 || y < H[1] - 2.2), 'hair');
  face(s, H, { dead: p.dead });
  const tilt = p.hatTilt || 0, tip = add(H, -6.5 - tilt, -13.5 + Math.abs(tilt) * 0.3);
  s.paint(poly([add(H, -4.4, -3.6), add(H, 4.4, -3.4), add(H, 1.4, -8.4), tip, add(H, -2.6, -9)], { cx: H[0] - 2, cy: H[1] - 7, rx: 5, ry: 6 }), 'blue', { rim: true });
  s.paint(clip(poly([add(H, -4.4, -3.6), add(H, 4.4, -3.4), add(H, 1.4, -8.4), add(H, -2.6, -9)]), (x, y) => y > H[1] - 5.4), 'gold', { level: 2, edge: false });
  s.paint(ellipse(H[0] + 0.2, H[1] - 3.2, 7.2, 1.7), 'blue', { bias: -0 });
  // front arm with the staff (angle st, 0 = upright)
  const st = p.st ?? 0.12, gr = p.grip || 0, d = [Math.sin(st), -Math.cos(st)], at = (k) => [K.hF[0] + d[0] * (k - gr), K.hF[1] + d[1] * (k - gr)];
  if (!p.dropStaff) {
    s.paint(capsule(...at(-11), ...at(11), 0.95), 'wood', { rim: true });
    s.paint(capsule(...at(10.5), ...at(12.5), 1.6, 0.8), 'gold');
    const c = at(14.5), g = p.glow ?? 0;
    if (g > 0) { s.fill(ellipse(c[0], c[1], 3.4 + g * 2, 3.4 + g * 2), 'arcane', 1); s.fill(ellipse(c[0], c[1], 2.2 + g * 1.2, 2.2 + g * 1.2), 'arcane', 2); }
    s.paint(poly([add(c, 0, -3), add(c, 1.9, 0), add(c, 0, 3), add(c, -1.9, 0)]), 'arcane', { level: 3, edge: false });
    s.fill(rect(c[0] - 0.5, c[1] - 1.5, 1, 2), 'arcane', 4);
    if (g > 0.6) for (const [dx, dy] of [[0, -6], [5, 0], [0, 6], [-5, 0]]) s.fill(rect(c[0] + dx * (g * 0.7) - 0.5, c[1] + dy * (g * 0.7) - 0.5, 1, 1), 'arcane', 4);
  } else {
    s.paint(capsule(27, 44, 46, 43, 0.9), 'wood');
    s.paint(poly([[45, 41], [47.5, 43], [45, 45], [43, 43]]), 'arcane', { level: 1, edge: false });
  }
  s.paint(capsule(...K.shF, ...K.elF, 1.9), 'blue');
  s.paint(capsule(...K.elF, ...K.hF, 2.0, 1.5), 'blue', { rim: true });
  s.paint(ellipse(...K.hF, 1.4, 1.4), 'skin');
  return s.outline();
}

// ---- animation tables ------------------------------------------------------------------
const TAU = Math.PI * 2;
const rng6 = (f) => Array.from({ length: 6 }, (_, i) => f((i / 6) * TAU));
const HERO = {
  idle: [[0, 0], [0, 0.5], [1, 1], [1, 0.5]].map(([bob, cape]) => [{ bob, cape, aF: 0.35 + bob * 0.05 }, 0.2]),
  walk: rng6((ph) => [{
    stepF: Math.round(4.5 * Math.sin(ph)) + 1, stepB: Math.round(-4.5 * Math.sin(ph)) + 1,
    liftF: Math.round(Math.max(0, Math.cos(ph)) * 2), liftB: Math.round(Math.max(0, -Math.cos(ph)) * 2),
    bob: Math.abs(Math.sin(ph)) > 0.7 ? 1 : 0, lean: 0.08, aB: -0.6 * Math.sin(ph), aF: 0.35 + 0.15 * Math.sin(ph), cape: 1.4 + 0.6 * Math.sin(ph * 2),
  }, 0.09]),
  attack: [
    [{ aF: 2.4, eF: 0.3, w: -0.5, lean: -0.12, crouch: 1, cape: 0.5 }, 0.06],
    [{ aF: 2.8, eF: 0.4, w: -1.0, lean: -0.2, crouch: 1, stepF: 2, cape: 0 }, 0.07],
    [{ aF: 1.25, eF: 0.2, w: 2.0, lean: 0.25, stepF: 6, stepB: -4, smear: [-1.0, 2.0, 3.4], cape: 2 }, 0.06],
    [{ aF: 0.9, eF: 0.4, w: 2.5, lean: 0.3, stepF: 6, stepB: -4, smear: [1.0, 2.5, 2], cape: 2.4 }, 0.08],
    [{ aF: 0.6, eF: 0.8, w: 1.8, lean: 0.12, stepF: 4, cape: 1.5 }, 0.1],
  ],
  hurt: [[{ lean: -0.3, shiftX: -1, aF: 0.2, w: 2.4, flash: true, cape: 0 }, 0.08], [{ lean: -0.2, aF: 0.25, w: 2.0, cape: 0.5 }, 0.14]],
  death: [
    [{ lean: -0.35, crouch: 1, aF: 0.1, w: 2.6, flash: true }, 0.1],
    [{ lean: -0.2, crouch: 4, fall: -0.35, aF: 0.4, eF: 0.2, w: 2.9 }, 0.12],
    [{ crouch: 4, fall: -0.9, shiftX: 4, aF: 1.6, eF: 0.1, w: 3.4 }, 0.12],
    [{ fall: -1.5708, shiftX: 13, aF: 1.2, eF: 0.2, dropSword: true, dead: true }, 0.14],
    [{ fall: -1.5708, shiftX: 13, aF: 1.4, eF: 0.4, dropSword: true, dead: true }, 1],
  ],
};
const KEEPER = {
  idle: [[0, 0], [0, 1], [1, 0], [1, -1]].map(([bob, sway]) => [{ bob, sway, lean: 0.06 }, 0.3]),
};
const WOLF = {
  idle: [[0, 0], [0, 1], [1, 2], [1, 1]].map(([bob, tail]) => [{ bob, tail }, 0.18]),
  walk: rng6((ph) => {
    const a = Math.round(4 * Math.sin(ph)), b = -a, la = Math.round(Math.max(0, Math.cos(ph)) * 2.5), lb = Math.round(Math.max(0, -Math.cos(ph)) * 2.5);
    return [{ legs: [a, b, b, a], lift: [la, lb, lb, la], bob: Math.abs(Math.sin(ph)) > 0.7 ? 0 : -1, tail: 1 + Math.round(Math.sin(ph)) }, 0.08];
  }),
  attack: [
    [{ crouch: 2, lunge: -2, headDown: 2, tail: 2, legs: [2, 0, 3, 1] }, 0.12],
    [{ crouch: 3, lunge: -3, headDown: 1, jaw: 0.3, tail: 3, legs: [3, 1, 4, 2] }, 0.1],
    [{ crouch: -1, lunge: 6, headX: 2, jaw: 0.9, tail: -1, legs: [3, 1, -9, -10], lift: [3, 2, 0, 0] }, 0.07],
    [{ lunge: 7, headX: 1, jaw: 0.15, headDown: 1, legs: [1, -1, -8, -9] }, 0.09],
    [{ lunge: 2, jaw: 0.1, legs: [1, -1, -1, -3] }, 0.12],
  ],
  hurt: [[{ lunge: -3, headDown: -1, jaw: 0.4, flash: true, legs: [-1, -3, 1, -1] }, 0.08], [{ lunge: -2, jaw: 0.2 }, 0.14]],
  death: [
    [{ lunge: -2, jaw: 0.5, headDown: -2, flash: true }, 0.1],
    [{ crouch: 3, headDown: 2, jaw: 0.3, legs: [2, 0, 2, 0] }, 0.12],
    [{ crouch: 6, headDown: 4, legs: [3, 1, 3, 1] }, 0.12],
    [{ crouch: 9, headDown: 5, lie: true, tail: 4 }, 0.14],
    [{ crouch: 9, headDown: 5, lie: true, tail: 4, dead: true }, 1],
  ],
};

const MAGE = {
  idle: [[0, 0, 0.2], [0, 0.5, 0.35], [1, 1, 0.2], [1, 0.5, 0]].map(([bob, cape, glow]) => [{ bob, cape, glow, aF: 0.3, eF: 0.4, aB: -0.1 }, 0.22]),
  walk: rng6((ph) => [{
    stepF: Math.round(4 * Math.sin(ph)) + 1, stepB: Math.round(-4 * Math.sin(ph)) + 1,
    liftF: Math.round(Math.max(0, Math.cos(ph)) * 2), liftB: Math.round(Math.max(0, -Math.cos(ph)) * 2),
    bob: Math.abs(Math.sin(ph)) > 0.7 ? 1 : 0, lean: 0.07, aB: -0.5 * Math.sin(ph), aF: 0.35, eF: 0.4, st: 0.25, cape: 1.4 + 0.6 * Math.sin(ph * 2), hatTilt: 0.5,
  }, 0.09]),
  // basic bolt: pull back, thrust the staff forward (the bolt leaves on frame 1)
  attack: [
    [{ aF: 0.1, eF: 0.3, st: -0.35, lean: -0.1, glow: 0.6, cape: 0.5 }, 0.07],
    [{ aF: 1.25, eF: 0.15, st: 0.7, lean: 0.18, stepF: 5, glow: 1.4, cape: 1.8, hatTilt: 1 }, 0.07],
    [{ aF: 1.15, eF: 0.2, st: 0.6, lean: 0.14, stepF: 5, glow: 0.8, cape: 2 }, 0.08],
    [{ aF: 0.5, eF: 0.4, st: 0.25, lean: 0.05, stepF: 3, glow: 0.3, cape: 1.2 }, 0.1],
  ],
  // big spell: both arms up, crystal flares, staff slams down (the spell lands on frame 3)
  cast: [
    [{ aF: 0.6, eF: 0.4, aB: 0.6, st: 0, crouch: 1, glow: 0.8, handGlow: true }, 0.08],
    [{ aF: 2.6, eF: 0.1, aB: 2.5, eB: 0.2, st: -0.2, grip: 9, lean: -0.12, glow: 1.4, handGlow: true, cape: 1, hatTilt: -1 }, 0.1],
    [{ aF: 2.75, eF: 0.1, aB: 2.7, eB: 0.1, st: -0.25, grip: 10, lean: -0.15, glow: 2, handGlow: true, cape: 1.4, hatTilt: -1.4 }, 0.1],
    [{ aF: 0.9, eF: 0.1, aB: 0.7, st: 0.15, lean: 0.2, crouch: 2, stepF: 4, glow: 1.6, cape: 2.4, hatTilt: 1.4 }, 0.08],
    [{ aF: 0.6, eF: 0.3, aB: 0.1, st: 0.12, lean: 0.08, crouch: 1, glow: 0.6, cape: 1.6 }, 0.14],
  ],
  hurt: [[{ lean: -0.3, shiftX: -1, aF: 0.2, flash: true }, 0.08], [{ lean: -0.2, aF: 0.25, glow: 0 }, 0.14]],
  death: [
    [{ lean: -0.35, crouch: 1, aF: 0.1, flash: true }, 0.1],
    [{ lean: -0.2, crouch: 4, fall: -0.35, aF: 0.4, eF: 0.2, st: -0.4 }, 0.12],
    [{ crouch: 4, fall: -0.9, shiftX: 4, aF: 1.6, eF: 0.1, st: -1 }, 0.12],
    [{ fall: -1.5708, shiftX: 13, aF: 1.2, eF: 0.2, dropStaff: true, dead: true }, 0.14],
    [{ fall: -1.5708, shiftX: 13, aF: 1.4, eF: 0.4, dropStaff: true, dead: true }, 1],
  ],
};
const KINDS = { mage: [mage, MAGE], hero: [hero, HERO], keeper: [keeper, KEEPER], wolf: [wolf, WOLF] };
const FLASH = RAMP.smear[4];

// → { anim: [{ sprite, dur }] } for one character kind
export function buildCharacter(kind) {
  const [draw, table] = KINDS[kind], out = {};
  for (const [name, frames] of Object.entries(table)) {
    out[name] = frames.map(([pose, dur]) => {
      let spr = draw(new PixelSprite(FRAME, FRAME), pose);
      if (pose.flash) spr = spr.flash(FLASH);
      return { sprite: spr, dur };
    });
  }
  return out;
}
export const KIND_NAMES = Object.keys(KINDS);
