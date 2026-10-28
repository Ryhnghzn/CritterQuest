// Skeleton for the style-D heroes (plan "Gaya D"): ~80 units tall, head ≈ 1/6 of the
// body, origin = between the feet on the ground, facing right (+x). drawDoll scales
// it down to the old doll height. Arm angles φ: 0 = hanging down, π/2 = forward, π = up.
// Motion is keyframed: each segment between two poses has its own easing.
export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
export const EASE = { inOut: smooth, in: (k) => k * k * k, out: (k) => 1 - (1 - k) ** 3, lin: (k) => k };

// keys: [[phase, ...values]], eases: one per segment → values at phase a
export function keyframes(keys, eases, a) {
  let i = 0;
  while (i < keys.length - 2 && a > keys[i + 1][0]) i++;
  const A = keys[i], B = keys[i + 1], u = EASE[eases[i]](clamp((a - A[0]) / (B[0] - A[0]), 0, 1));
  return A.map((v, j) => lerp(v, B[j], u)).slice(1);
}

// two-bone joint between a and b; bend +1 puts the joint on the +angle side
export function ik(a, b, l1, l2, bend) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01) || 0.01;
  const ang = Math.atan2(dy, dx);
  const off = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const t = ang - bend * off;
  return { x: a.x + Math.cos(t) * l1, y: a.y + Math.sin(t) * l1 };
}
const armTo = (s, phi, r) => ({ x: s.x + Math.sin(phi) * r, y: s.y + Math.cos(phi) * r });

// Per-class build: shoulder offsets (wider = bulkier), how heavily the body bobs while
// walking, and where the off hand rests (Warrior: shield up in front of the chest).
const BUILD = {
  warrior: { sF: [6.6, -20.4], sB: [-5.8, -21], bob: 1.45, guard: 1.2, guardSwing: 0.12 },
};
const DEFAULT_BUILD = { sF: [5, -20.5], sB: [-4.2, -21], bob: 1, guard: null, guardSwing: 0.45 };

// One-handed overhead slash with the shield arm counter-swinging:
// [phase, arm φ, sword offset from the arm, lean, crouch, step, off-arm φ].
// SLOW (showcase): wind-up, a held beat, a fast whip, overshoot, a slow settle.
// SNAPPY (in game): the hit lands the moment the attack fires, so the whip comes almost at once.
const SLASH = {
  slow: [[0, 0, 0.9, 0, 0, 0, 0], [0.3, 3.7, -0.4, -0.14, 1.8, -1.2, 1.55], [0.38, 3.55, -0.6, -0.1, 2.2, -0.6, 1.6], [0.47, 0.7, 0.5, 0.32, 3.2, 8, 0.45], [0.52, 0.5, 0.6, 0.36, 3.5, 8.6, 0.5], [0.62, 0.4, 0.75, 0.32, 2.8, 8, 0.8], [1, 0, 0.9, 0, 0, 0, 0]],
  snappy: [[0, 2.6, -0.2, -0.04, 1.4, 1.5, 1.4], [0.08, 3.5, -0.6, -0.1, 2.2, 0, 1.6], [0.24, 0.7, 0.5, 0.32, 3.2, 8, 0.45], [0.34, 0.5, 0.6, 0.36, 3.5, 8.6, 0.5], [0.5, 0.4, 0.75, 0.32, 2.8, 7, 0.8], [1, 0, 0.9, 0, 0, 0, 0]],
};
const SLASH_EASE = { slow: ['inOut', 'out', 'in', 'out', 'inOut', 'inOut'], snappy: ['out', 'in', 'out', 'inOut', 'inOut'] };
const STRIKE = { slow: [0.38, 0.47, 0.64], snappy: [0.08, 0.24, 0.5] }; // trail: from, peak, gone

// pose: { t, moving 0..1, walk (rad), attack: phase 0..1 (or −1 / undefined), snappy, hurt }
export function rig(classId, pose) {
  const { t = 0, moving = 0, walk = 0, hurt = false } = pose;
  const B = BUILD[classId] || DEFAULT_BUILD;
  const a = pose.attack ?? -1, prof = pose.snappy ? 'snappy' : 'slow';
  const s = Math.sin(walk), c = Math.cos(walk);
  const bob = moving ? -Math.abs(s) * 2 * moving * B.bob : Math.sin(t * 2) * 0.45 * B.bob;
  let lean = 0.09 * moving;
  const stride = 10 * moving;
  const fF = { x: 4 + s * stride, y: -2.5 - Math.max(0, c) * 6 * moving };
  const fB = { x: -4 - s * stride, y: -2.5 - Math.max(0, -c) * 6 * moving };

  let phi = 0.2 - s * 0.45 * moving, k = 0.9;
  let phiB = B.guard != null ? B.guard + s * B.guardSwing * moving : -0.15 + s * 0.45 * moving;
  let crouch = 0, step = 0, swing = 0, trail = 0;
  if (a >= 0 && a <= 1) {
    const K = SLASH[prof], last = K.length - 1;
    const keys = K.map((r, i) => (i === 0 || i === last ? [r[0], phi, r[2], lean, 0, 0, phiB] : r));
    if (prof === 'snappy') keys[0] = K[0]; // the swing starts already raised
    [phi, k, lean, crouch, step, phiB] = keyframes(keys, SLASH_EASE[prof], a);
    const [from, peak, gone] = STRIKE[prof];
    swing = clamp(1 - Math.abs(a - peak) / (gone - from), 0, 1);
    trail = a > from && a < gone ? (a < peak + 0.05 ? 1 : 1 - (a - peak - 0.05) / (gone - peak - 0.05)) : 0;
  }
  if (hurt) { lean -= 0.22; crouch += 1.5; phi += 0.5; phiB += 0.3; }
  const psi = phi + k;
  // lunge: the front foot steps in, the back foot slides and lifts its heel, the hips drop and follow
  fF.x += step; fB.x -= step * 0.25; fB.y -= Math.max(0, step) * 0.18;

  const hip = { x: step * 0.45, y: -38.5 + bob + crouch };
  const cl = Math.cos(lean), sl = Math.sin(lean);
  const W = (lx, ly) => ({ x: hip.x + lx * cl - ly * sl, y: hip.y + lx * sl + ly * cl });
  const hipF = W(2.6, 0), hipB = W(-2.6, 0);
  const sF = W(...B.sF), sB = W(...B.sB);
  const hF = armTo(sF, phi, 21);
  const hB = armTo(sB, phiB, 19);
  return {
    t, moving, lean, hip, W, fF, fB, hipF, hipB, sF, sB, hF, hB, phi, phiB, psi, swing, trail, attack: a, prof, hurt,
    kF: ik(hipF, fF, 19, 19, 1), kB: ik(hipB, fB, 19, 19, 1),
    eF: ik(sF, hF, 11.5, 11, -1), eB: ik(sB, hB, 10.5, 10, -1),
  };
}
