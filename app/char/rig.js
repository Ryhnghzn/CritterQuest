// Skeleton for the heroic-proportion test characters: ~78 units tall, head ≈ 1/6
// of the body, origin = between the feet on the ground, facing right (+x).
// Arm angles φ: 0 = hanging down, π/2 = forward, π = straight up.
export const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOut = ease;
const easeIn = (k) => k * k * k;
const easeOut = (k) => 1 - (1 - k) ** 3;

// two-bone joint between a and b; bend +1 puts the joint on the +angle side
export function ik(a, b, l1, l2, bend) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01) || 0.01;
  const ang = Math.atan2(dy, dx);
  const off = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const t = ang - bend * off;
  return { x: a.x + Math.cos(t) * l1, y: a.y + Math.sin(t) * l1 };
}
const armTo = (s, phi, r) => ({ x: s.x + Math.sin(phi) * r, y: s.y + Math.cos(phi) * r });

// pose: { t, moving 0..1, walk (rad), attack 0..1 or −1 }
export function rig(classId, pose) {
  const { t = 0, moving = 0, walk = 0, attack = -1 } = pose;
  const s = Math.sin(walk), c = Math.cos(walk);
  const bob = moving ? -Math.abs(s) * 2 * moving : Math.sin(t * 2) * 0.45;
  let lean = 0.09 * moving;
  const stride = 10 * moving;
  const fF = { x: 4 + s * stride, y: -2.5 - Math.max(0, c) * 6 * moving };
  const fB = { x: -4 - s * stride, y: -2.5 - Math.max(0, -c) * 6 * moving };

  let phi = 0.2 - s * 0.45 * moving, k = 0.9, phiB = -0.15 + s * 0.45 * moving;
  let psi = null, slash = null, cast = 0, crouch = 0, step = 0, twoHand = 0, swing = 0;
  const a = attack;
  if (classId === 'warrior') {
    if (a >= 0) {
      // keyframes: [phase, arm φ, sword offset from arm, lean, crouch, step]; each segment has its own easing:
      // slow wind-up, a held beat of tension, a very fast whip, overshoot past the target, slow settle
      const K = [
        [0, phi, 0.9, lean, 0, 0],
        [0.3, 3.95, -0.55, -0.17, 2.2, -1.5],
        [0.38, 3.8, -0.75, -0.13, 2.6, -1],
        [0.47, 0.6, 0.55, 0.36, 3.6, 9],
        [0.52, 0.42, 0.65, 0.4, 3.9, 9.6],
        [0.62, 0.3, 0.8, 0.36, 3.2, 9],
        [1, 0.2, 0.9, 0.09 * moving, 0, 0],
      ];
      const EASE = [easeInOut, easeOut, easeIn, easeOut, easeInOut, easeInOut];
      let i = 0;
      while (i < K.length - 2 && a > K[i + 1][0]) i++;
      const A = K[i], B = K[i + 1], u = EASE[i](clamp((a - A[0]) / (B[0] - A[0]), 0, 1));
      phi = lerp(A[1], B[1], u); k = lerp(A[2], B[2], u); lean = lerp(A[3], B[3], u); crouch = lerp(A[4], B[4], u); step = lerp(A[5], B[5], u);
      twoHand = clamp(Math.min((a - 0.12) / 0.15, (0.8 - a) / 0.15), 0, 1);
      swing = clamp(1 - Math.abs(a - 0.47) / 0.2, 0, 1);
      if (a > 0.38 && a < 0.64) slash = { from: 3.8, to: phi, fade: a < 0.52 ? 1 : 1 - (a - 0.52) / 0.12 };
    }
    psi = phi + k;
  } else {
    phi = 0.45 - s * 0.2 * moving; psi = Math.PI - 0.08;
    if (a >= 0) {
      const up = ease(Math.min(1, a / 0.3)), down = ease((a - 0.65) / 0.35);
      const u = up * (1 - down);
      phi = lerp(phi, 1.35, u); psi = lerp(psi, Math.PI - 0.75, u); phiB = lerp(phiB, 1.2, u); lean = lerp(lean, 0.14, u);
      if (a > 0.28 && a < 0.7) cast = Math.sin(((a - 0.28) / 0.42) * Math.PI);
    }
  }
  // lunge: the front foot steps in, the back foot slides and lifts its heel, the hips drop and follow
  fF.x += step; fB.x -= step * 0.25; fB.y -= Math.max(0, step) * 0.18;

  const hip = { x: step * 0.45, y: -38.5 + bob + crouch };
  const cl = Math.cos(lean), sl = Math.sin(lean);
  const W = (lx, ly) => ({ x: hip.x + lx * cl - ly * sl, y: hip.y + lx * sl + ly * cl });
  const hipF = W(2.2, 0), hipB = W(-2.2, 0);
  const sF = W(5, -20.5), sB = W(-4.2, -21);
  const hF = armTo(sF, phi, 21);
  let hB = armTo(sB, phiB, 20);
  if (twoHand > 0) { // back hand joins the grip below the front hand
    const grip = { x: hF.x - Math.sin(psi) * 4.6, y: hF.y - Math.cos(psi) * 4.6 };
    hB = { x: lerp(hB.x, grip.x, twoHand), y: lerp(hB.y, grip.y, twoHand) };
  }
  return {
    t, moving, lean, hip, W, fF, fB, hipF, hipB, sF, sB, hF, hB, phi, psi, slash, cast, swing, attack: a,
    kF: ik(hipF, fF, 19, 19, 1), kB: ik(hipB, fB, 19, 19, 1),
    eF: ik(sF, hF, 11.5, 11, -1), eB: ik(sB, hB, 11, 10.5, -1),
  };
}
