// Skeleton for the style-D heroes (plan "Gaya D"): ~80 units tall, head ≈ 1/6 of the
// body, origin = between the feet on the ground, facing right (+x). drawDoll scales
// it down to the old doll height. Arm angles φ: 0 = hanging down, π/2 = forward, π = up.
// Motion is keyframed: each segment between two poses has its own easing.
export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const PI = Math.PI;
function smooth(k) { return k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k); }
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

// Per-class build and motion. A pose row is [phi, k, lean, crouch, step, phiB, x1, x2]:
// front-arm angle, weapon angle (k = offset from the arm, or absolute when abs), body lean,
// crouch, lunge step, off-arm angle, and two class values (archer: draw, nock; mage: cast;
// assassin: off-dagger offset). Key rows are [phase, ...pose] or [phase, 'idle'].
// SLOW = showcase timing (wind-up, held beat, fast hit, overshoot, slow settle);
// SNAPPY = in game, where the hit lands the moment the attack fires.
const CLASSES = {
  warrior: { // big and heavy: one-handed sword, shield up in front of the chest
    sF: [6.6, -20.4], sB: [-5.8, -21], bob: 1.45, reachB: 19,
    idle: (s, m) => [0.2 - s * 0.45 * m, 0.9, 0.09 * m, 0, 0, 1.2 + s * 0.12 * m, 0, 0],
    slow: [[0, 'idle'], [0.3, 3.7, -0.4, -0.14, 1.8, -1.2, 1.55], [0.38, 3.55, -0.6, -0.1, 2.2, -0.6, 1.6], [0.47, 0.7, 0.5, 0.32, 3.2, 8, 0.45], [0.52, 0.5, 0.6, 0.36, 3.5, 8.6, 0.5], [0.62, 0.4, 0.75, 0.32, 2.8, 8, 0.8], [1, 'idle']],
    slowEase: ['inOut', 'out', 'in', 'out', 'inOut', 'inOut'],
    snappy: [[0, 2.6, -0.2, -0.04, 1.4, 1.5, 1.4], [0.08, 3.5, -0.6, -0.1, 2.2, 0, 1.6], [0.24, 0.7, 0.5, 0.32, 3.2, 8, 0.45], [0.34, 0.5, 0.6, 0.36, 3.5, 8.6, 0.5], [0.5, 0.4, 0.75, 0.32, 2.8, 7, 0.8], [1, 'idle']],
    snappyEase: ['out', 'in', 'out', 'inOut', 'inOut'],
    strike: { slow: [0.38, 0.47, 0.64], snappy: [0.08, 0.24, 0.5] }, // trail: from, peak, gone
  },
  archer: { // slim and tall: bow in the front hand, the back hand draws the string
    sF: [4.8, -21], sB: [-3.8, -21.4], bob: 0.9, reachB: 20, abs: true,
    idle: (s, m) => [0.55 - s * 0.3 * m, 1.05, 0.09 * m, 0, 0, -0.2 + s * 0.4 * m, 0, 0],
    slow: [[0, 'idle'], [0.25, 1.5, 1.57, 0.02, 1, 1, 1.4, 0.15, 1], [0.55, 1.57, 1.57, -0.05, 1.3, 1, 1.6, 1, 1], [0.66, 1.57, 1.57, -0.05, 1.3, 1, 1.6, 1, 1], [0.7, 1.55, 1.57, 0.1, 1.2, 1, -0.5, 0, 0], [0.82, 1.45, 1.6, 0.08, 0.8, 0.5, -0.35, 0, 0], [1, 'idle']],
    slowEase: ['inOut', 'inOut', 'lin', 'out', 'out', 'inOut'],
    snappy: [[0, 1.55, 1.57, 0.04, 1.2, 0, 1.6, 1, 1], [0.06, 1.55, 1.57, 0.1, 1.2, 0, -0.5, 0, 0], [0.3, 1.45, 1.6, 0.06, 0.8, 0, -0.35, 0, 0], [1, 'idle']],
    snappyEase: ['out', 'inOut', 'inOut'],
  },
  mage: { // thin and tall: staff upright, thrust forward to cast, the free hand flares
    sF: [4.6, -21], sB: [-3.8, -21.4], bob: 0.7, reachB: 20, abs: true,
    idle: (s, m) => [0.45 - s * 0.2 * m, Math.PI - 0.08, 0.06 * m, 0, 0, -0.15 + s * 0.3 * m, 0, 0],
    slow: [[0, 'idle'], [0.3, 1.35, 2.39, 0.14, 0.6, 2.5, 1.2, 0.2], [0.5, 1.35, 2.39, 0.16, 0.8, 2.5, 1.25, 1], [0.7, 1.3, 2.45, 0.12, 0.5, 2, 1.1, 0.3], [1, 'idle']],
    slowEase: ['inOut', 'inOut', 'out', 'inOut'],
    snappy: [[0, 1.3, 2.45, 0.14, 0.5, 2, 1.15, 1], [0.3, 1.25, 2.5, 0.12, 0.4, 1.5, 1, 0.25], [1, 'idle']],
    snappyEase: ['out', 'inOut'],
  },
  assassin: { // small and crouched: two reverse-grip daggers, quick double stab
    sF: [4.2, -20.6], sB: [-3.4, -21], bob: 0.8, reachB: 20,
    idle: (s, m) => [0.95 - s * 0.3 * m, 2.84, 0.2 + 0.08 * m, 3.2, 0, 0.5 + s * 0.3 * m, 2.84, 0],
    slow: [[0, 'idle'], [0.25, 0.6, 2.84, 0.1, 4.8, -1, 0.3, 2.84], [0.4, 1.8, 2.5, 0.4, 3.8, 8, 0.3, 2.84], [0.52, 0.8, 2.9, 0.32, 3.6, 7, 1.85, 2.4], [0.65, 0.9, 2.84, 0.28, 3.4, 5, 0.7, 2.84], [1, 'idle']],
    slowEase: ['inOut', 'in', 'out', 'inOut', 'inOut'],
    snappy: [[0, 1.75, 2.5, 0.38, 3.8, 7, 0.3, 2.84], [0.12, 0.8, 2.9, 0.3, 3.6, 6, 1.85, 2.4], [0.26, 0.9, 2.84, 0.26, 3.4, 3, 0.7, 2.84], [1, 'idle']],
    snappyEase: ['inOut', 'out', 'inOut'],
    strike: { slow: [0.3, 0.42, 0.66], snappy: [-0.01, 0.03, 0.3] },
  },
  npc: { // townsfolk: the idle comes from the archetype's job (hammering, guarding, a cane…)
    sF: [4.8, -21], sB: [-4, -21.2], bob: 0.9, reachB: 20,
    idle: (s, m, t, kind) => (NPC_IDLE[kind] || NPC_IDLE.gesture)(t, s, m),
    slow: [[0, 'idle'], [1, 'idle']], slowEase: ['lin'], snappy: [[0, 'idle'], [1, 'idle']], snappyEase: ['lin'],
  },
};
// NPC idles → [phi, k, lean, crouch, step, phiB, x1, x2]
const NPC_IDLE = {
  gesture: (t, s, m) => [0.15 - s * 0.4 * m, 0.6, 0.05 * m, 0, 0, -0.1 + s * 0.4 * m + Math.max(0, Math.sin(t * 0.8)) ** 6 * 1.7, 0, 0],
  wait: (t, s, m) => [0.95 - s * 0.3 * m, 0.5, 0.04 * m, 0, 0, 0.95 + Math.sin(t * 1.7) * 0.05, 0, 0],
  hammer: (t) => {
    const u = (t * 1.1) % 1;
    const phi = u < 0.55 ? lerp(0.9, 2.9, smooth(u / 0.55)) : lerp(2.9, 0.8, clamp((u - 0.55) / 0.12, 0, 1));
    return [phi, 0.9, 0.15 + (u > 0.55 && u < 0.7 ? 0.08 : 0), 1, 0, 0.95, 0, 0];
  },
  guard: (t, s, m) => [0.55, PI - 0.55, 0.03 * m, 0, 0, -0.1 + s * 0.3 * m, 0, 0],
  old: (t, s, m) => [0.75, -0.65, 0.26, 2.4, 0, 0.3 + Math.sin(t * 1.2) * 0.05, 0, 0],
  snip: (t) => [1.2 + Math.sin(t * 9) * 0.12, 0.4, 0.06, 0, 0, 1.05, 0, 0],
  read: (t) => [1.15, 1.6, 0.08, 0, 0, 1.05 + Math.sin(t * 0.6) * 0.04, 0, 0],
  sway: (t) => [2.3 + Math.sin(t * 1.6) * 0.35, 0.6, Math.sin(t * 1.6) * 0.12, 1 + Math.sin(t * 3.2) * 0.8, 0, 2.1 - Math.sin(t * 1.6) * 0.35, 0, 0],
  child: (t, s, m) => [0.3 - s * 0.6 * m + Math.sin(t * 4) * 0.3, 0.6, 0.06, -Math.abs(Math.sin(t * 3)) * 2.4, 0, -0.2 + s * 0.6 * m - Math.sin(t * 4) * 0.3, 0, 0],
  stance: (t) => [1.35, 0.4, 0.08, 2.4 + Math.sin(t * 2) * 0.3, 2, 1.25, 0, 0],
};
// Sitting by a fire (the title screen, spec §29): what the arms do, per class →
// [phi, k, lean, crouch, step, phiB, x1, x2]; the hips sit on a log, the feet rest in front.
const SIT_ACT = {
  // sword across the knees, the front hand drawing a whetstone along it
  warrior: (t) => { const u = Math.sin(t * 2.6); return [1.25 + u * 0.22, 0.32, 0.22, 0, 0, 1.05 - u * 0.12, 0, 0]; },
  // the bow held up before the eyes, turned a little now and then, checking the string
  archer: (t) => [1.75 + Math.sin(t * 0.7) * 0.08, 1.57, 0.12, 0, 0, 1.45 + Math.max(0, Math.sin(t * 1.3)) ** 4 * 0.5, 0, 0.5 + Math.sin(t * 1.3) * 0.2],
  // the staff leaning on the shoulder, the free hand held out to the warmth
  mage: (t) => [0.95, Math.PI - 0.5, 0.18, 0, 0, 1.45 + Math.sin(t * 1.1) * 0.08, 0.15 + Math.sin(t * 2) * 0.1, 0],
  // leaning back, a dagger flipped over and over in the front hand
  assassin: (t) => { const f = (t * 1.6) % 1; return [1.35 + Math.sin(f * Math.PI * 2) * 0.35, 2.84 + f * Math.PI * 2, -0.08, 0, 0, 0.55, 2.84, 0]; },
};
export const SIT = { hip: -19.5, feet: [13, 9.5], breathe: 0.35 }; // hip height on a log, feet forward

// Running, one gait per class (spec §39; used when pose.gait is set — the anime heroes).
// stride / lift (foot height) / bob (hip bounce) in skeleton units, rate = how fast the legs turn
// over (× the walk phase), and arms(s, c, m) → the idle row while running:
// [phi, k, lean, crouch, step, phiB, x1, x2] (s, c = sin/cos of the walk phase, m = 0..1).
export const GAIT = {
  warrior: { // heavy and driving: long stamping strides, the greatsword carried low, the free arm pumping
    stride: 13, lift: 7, bob: 3, rate: 0.9,
    arms: (s, c, m) => [0.35 - s * 0.25 * m, 0.6, 0.16 * m, 1.5 * m, 0, 0.9 + s * 0.7 * m, 0, 0],
  },
  archer: { // light and springy: high knees, the bow held low in front, the string hand pumping
    stride: 12, lift: 10, bob: 2.4, rate: 1.1,
    arms: (s, c, m) => [0.85 + s * 0.15 * m, 1.3, 0.13 * m, 0.5 * m, 0, -0.1 + s * 0.8 * m, 0, 0],
  },
  mage: { // gliding: short steps under the robe, upright, the staff steady, barely any bounce
    stride: 7, lift: 3, bob: 0.5, rate: 1.15, float: 1.6,
    arms: (s, c, m) => [0.42 + s * 0.06 * m, Math.PI - 0.12, 0.03 * m, 0, 0, -0.05 + s * 0.25 * m, 0, 0],
  },
  assassin: { // a low, fast sprint leaning hard forward, both arms swept back with the daggers
    stride: 14, lift: 6, bob: 1.2, rate: 1.25,
    arms: (s, c, m) => [-0.7 + s * 0.12 * m, 2.84, 0.2 + 0.36 * m, 3.2 + 2.2 * m, 0, -0.8 - s * 0.12 * m, 2.84, 0],
  },
};
export const gaitRate = (classId) => GAIT[classId]?.rate || 1;

const pad = (row) => { const r = row.slice(); while (r.length < 10) r.push(0); return r; };

// Skill moves (plan "Gaya D" §3). Rows: [phase, phi, k, lean, crouch, step, phiB, x1, x2, lift]
// (lift = jump height). dur: seconds, or 'skill' = the skill's own duration (spins);
// spin: turns per second (the body flips facing to fake a whirl).
const W_SPIN = { dur: 'skill', spin: 2.6, keys: [[0, 'idle'], [0.08, 1.55, 0.05, 0.12, 3, 2, 1.3], [0.92, 1.55, 0.05, 0.12, 3, 2, 1.3], [1, 'idle']], ease: ['out', 'lin', 'inOut'] };
const A_SKY = { dur: 0.6, keys: [[0, 'idle'], [0.3, 2.5, 2.5, -0.15, 1, 0, 2.3, 1, 1], [0.42, 2.5, 2.5, -0.15, 1, 0, 2.3, 1, 1], [0.48, 2.5, 2.5, -0.1, 1, 0, -0.4], [1, 'idle']], ease: ['out', 'lin', 'out', 'inOut'] };
const M_CALL = { dur: 0.75, keys: [[0, 'idle'], [0.3, 3, 3.1, -0.2, 0, 0, 2.6, 0.6, 0, 1.5], [0.5, 3, 3.1, -0.22, 0, 0, 2.6, 1, 0, 1.5], [0.65, 1.2, 2.4, 0.25, 2.5, 3, 1.2, 0.6], [1, 'idle']], ease: ['out', 'lin', 'in', 'inOut'] };
const S_TOSS = { dur: 0.5, keys: [[0, 'idle'], [0.25, 0.9, 2.84, 0.25, 4, 0, -0.6, 2.84], [0.45, 0.9, 2.84, 0.2, 3.4, 2, 1.8, 2.84], [1, 'idle']], ease: ['out', 'in', 'inOut'] };
const S_SPIN = { dur: 'skill', spin: 4, keys: [[0, 'idle'], [0.06, 1.7, 2.4, 0.3, 4.4, 3, 1.7, 2.4], [0.94, 1.7, 2.4, 0.3, 4.4, 3, 1.7, 2.4], [1, 'idle']], ease: ['out', 'lin', 'inOut'] };
const MOVES = {
  warrior: {
    spin: W_SPIN,
    bladestorm: { ...W_SPIN, spin: 3.4 },
    shout: { dur: 0.7, keys: [[0, 'idle'], [0.2, 0.9, 0.6, -0.18, 1.6, -1, 1.5], [0.35, 1.25, 0.3, -0.3, 0.4, 0, 1, 0, 0, 1.2], [0.75, 1.2, 0.3, -0.28, 0.4, 0, 1, 0, 0, 0.6], [1, 'idle']], ease: ['out', 'out', 'lin', 'inOut'] },
    quake: { dur: 0.65, keys: [[0, 'idle'], [0.18, 3.6, -0.5, -0.15, 3, 0, 1.5], [0.4, 3.8, -0.6, -0.05, 0, 3, 1.6, 0, 0, 10], [0.55, 0.9, 0.5, 0.45, 5, 8, 0.5], [0.75, 0.8, 0.6, 0.4, 4.5, 8, 0.6], [1, 'idle']], ease: ['inOut', 'out', 'in', 'lin', 'inOut'] },
    charge: { dur: 0.45, keys: [[0, 1.3, 0.4, 0.5, 3, 6, 1.5], [0.6, 1.3, 0.4, 0.5, 3, 8, 1.5], [1, 'idle']], ease: ['lin', 'inOut'] },
    warcry: { dur: 0.8, keys: [[0, 'idle'], [0.25, 3, 0.1, -0.25, 1, 0, 1.4, 0, 0, 0.8], [0.75, 3, 0.1, -0.25, 1, 0, 1.4, 0, 0, 0.6], [1, 'idle']], ease: ['out', 'lin', 'inOut'] },
    axe: { dur: 0.55, keys: [[0, 'idle'], [0.25, 3.9, -0.5, -0.2, 2, -1, 1.5], [0.4, 1.4, 0.4, 0.35, 3, 6, 0.6], [0.6, 1, 0.6, 0.3, 2.6, 6, 0.8], [1, 'idle']], ease: ['out', 'in', 'out', 'inOut'] },
  },
  archer: {
    rain: A_SKY, starfall: { ...A_SKY, dur: 0.8 },
    pierce: { dur: 0.7, keys: [[0, 'idle'], [0.35, 1.57, 1.57, -0.08, 2, 1, 1.6, 1, 1], [0.5, 1.57, 1.57, -0.08, 2, 1, 1.6, 1, 1], [0.56, 1.6, 1.6, -0.25, 1, -5, -0.6], [1, 'idle']], ease: ['out', 'lin', 'out', 'inOut'] },
    volley: { dur: 0.45, keys: [[0, 1.55, 1.57, 0.04, 1.2, 0, 1.6, 1, 1], [0.1, 1.55, 1.57, 0.1, 1.2, 0, -0.5], [0.3, 1.45, 1.6, 0.06, 0.8, 0, -0.35], [1, 'idle']], ease: ['out', 'inOut', 'inOut'] },
    leap: { dur: 0.6, keys: [[0, 'idle'], [0.15, 0.6, 1.2, -0.1, 3, 0, -0.5], [0.45, 1.2, 1.4, -0.4, 0, -6, -1.2, 0, 0, 9], [0.75, 1, 1.3, -0.2, 2.5, -8, -0.6], [1, 'idle']], ease: ['out', 'out', 'in', 'inOut'] },
    trap: { dur: 0.55, keys: [[0, 'idle'], [0.3, 0.4, 1, 0.3, 4, 2, -0.8], [0.5, 0.4, 1, 0.25, 3.4, 3, 1.6], [1, 'idle']], ease: ['out', 'in', 'inOut'] },
    hawk: { dur: 0.8, keys: [[0, 'idle'], [0.3, 1.9, 1.57, -0.05, 0, 0, 2.4, 0, 0, 0.5], [0.8, 1.9, 1.57, -0.05, 0, 0, 2.4, 0, 0, 0.5], [1, 'idle']], ease: ['out', 'lin', 'inOut'] },
  },
  mage: {
    nova: { dur: 0.7, keys: [[0, 'idle'], [0.3, 2.8, 3, -0.1, 0, 0, 2.8, 0.4, 0, 2], [0.45, 0.6, 2.9, 0.2, 4, 0, 0.8, 1], [0.7, 0.6, 2.9, 0.18, 3.6, 0, 0.8, 0.5], [1, 'idle']], ease: ['out', 'in', 'lin', 'inOut'] },
    chain: { dur: 0.6, keys: [[0, 'idle'], [0.2, 1.3, 2.3, 0.12, 0.5, 2, 1.6, 1], [0.6, 1.3, 2.3, 0.12, 0.5, 2, 1.6, 0.8], [1, 'idle']], ease: ['out', 'lin', 'inOut'] },
    meteor: M_CALL, meteorstorm: { ...M_CALL, dur: 1 },
    blink: { dur: 0.4, keys: [[0, 0.45, PI - 0.08, 0.2, 4, 0, 0.8, 1], [0.3, 0.45, PI - 0.08, 0, 0, 0, 0.8, 0.5], [1, 'idle']], ease: ['out', 'inOut'] },
    inferno: { dur: 0.7, keys: [[0, 'idle'], [0.25, 2.2, 2.9, -0.1, 1, -1, 1.8, 0.5], [0.45, 1.4, 2.2, 0.25, 1.5, 4, 1.3, 1], [0.7, 1.3, 2.4, 0.15, 1, 3, 1.1, 0.4], [1, 'idle']], ease: ['out', 'in', 'out', 'inOut'] },
    manashield: { dur: 0.8, keys: [[0, 'idle'], [0.3, 0.9, 3.1, 0, 1, 1, 2.8, 1], [0.8, 0.9, 3.1, 0, 1, 1, 2.8, 0.7], [1, 'idle']], ease: ['out', 'lin', 'inOut'] },
  },
  assassin: {
    shadow: { dur: 0.4, keys: [[0, 1.6, 2.5, 0.6, 4.5, 8, 0, 2.84], [0.5, 1.6, 2.5, 0.6, 4.5, 10, 0, 2.84], [1, 'idle']], ease: ['lin', 'inOut'] },
    fan: { dur: 0.55, keys: [[0, 'idle'], [0.25, 0.2, 2.8, 0.1, 4, -1, -0.4, 2.8], [0.4, 2, 1.6, 0.3, 3, 3, 2.2, 1.6], [0.6, 1.9, 1.7, 0.28, 3, 3, 2, 1.7], [1, 'idle']], ease: ['out', 'in', 'lin', 'inOut'] },
    poison: S_TOSS,
    smoke: { dur: 0.55, keys: [[0, 'idle'], [0.2, 2.4, 2.8, 0.1, 2, 0, 2.4, 2.8, 0, 2], [0.45, 0.5, 2.8, 0.4, 6, 0, 0.5, 2.8], [1, 'idle']], ease: ['out', 'in', 'inOut'] },
    shuriken: { dur: 0.5, keys: [[0, 'idle'], [0.25, -0.4, 2.8, 0.1, 3.6, -1, 0.6, 2.84], [0.4, 1.9, 2.6, 0.35, 3.6, 4, 0.6, 2.84], [1, 'idle']], ease: ['out', 'in', 'inOut'] },
    assassinate: { dur: 0.8, keys: [[0, 'idle'], [0.3, 2.2, 2.4, 0, 2, 0, 2, 2.5], [0.8, 2.2, 2.4, 0, 2, 0, 2, 2.5], [1, 'idle']], ease: ['out', 'lin', 'inOut'] },
    thousandshadows: S_SPIN,
  },
};
// tempo skills (spec §43.4) borrow a move until they get their own
MOVES.warrior.greatslash = MOVES.warrior.quake; MOVES.warrior.steelparry = MOVES.warrior.shout;
MOVES.mage.flamethrower = MOVES.mage.nova;

// how long the renderer plays a skill's move (seconds)
export function moveDuration(classId, skillId, skillDur = 0) {
  const M = MOVES[classId]?.[skillId];
  if (!M) return 0.5;
  return M.dur === 'skill' ? Math.max(0.4, skillDur) : M.dur;
}
export const hasMove = (classId, skillId) => !!MOVES[classId]?.[skillId];

// pose: { t, moving 0..1, walk (rad), attack: phase 0..1 (or −1 / undefined), snappy, hurt,
//         move: { id, ph 0..1 } (a skill move, wins over the attack), dodge: 0..1 }
export function rig(classId, pose) {
  const { t = 0, moving = 0, walk = 0, hurt = false } = pose;
  const C = CLASSES[classId] || CLASSES.warrior;
  const a = pose.attack ?? -1, prof = pose.snappy ? 'snappy' : 'slow';
  const s = Math.sin(walk), c = Math.cos(walk);
  const G = pose.gait && moving > 0 ? GAIT[classId] : null;
  const bob = moving ? -Math.abs(s) * 2 * moving * (G ? G.bob : C.bob) - (G?.float || 0) * moving : Math.sin(t * 2) * 0.45 * C.bob;
  const stride = (G ? G.stride : 10) * moving, footLift = (G ? G.lift : 6) * moving;
  const fF = { x: 4 + s * stride, y: -2.5 - Math.max(0, c) * footLift };
  const fB = { x: -4 - s * stride, y: -2.5 - Math.max(0, -c) * footLift };

  const idle = [...(pose.sit ? (SIT_ACT[classId] || SIT_ACT.mage)(t) : G ? G.arms(s, c, moving) : C.idle(s, moving, t, pose.kind)), 0];
  let [phi, k, lean, crouch, step, phiB, x1, x2, lift] = idle;
  let swing = 0, trail = 0, flip = 1;
  const M = pose.move && MOVES[classId]?.[pose.move.id];
  if (M) {
    const ph = clamp(pose.move.ph, 0, 1);
    const keys = M.keys.map((r) => (r[1] === 'idle' ? [r[0], ...idle] : pad(r)));
    [phi, k, lean, crouch, step, phiB, x1, x2, lift] = keyframes(keys, M.ease, ph);
    if (M.spin) { // whirl: flip facing on every half turn, with a blur of swing
      const turns = ph * M.spin * (pose.move.dur || 1);
      flip = Math.cos(turns * PI * 2) >= 0 ? 1 : -1;
      swing = 1;
    }
  } else if (a >= 0 && a <= 1) {
    const keys = C[prof].map((r) => (r[1] === 'idle' ? [r[0], ...idle] : pad(r)));
    [phi, k, lean, crouch, step, phiB, x1, x2, lift] = keyframes(keys, C[prof + 'Ease'], a);
    const S = C.strike?.[prof];
    if (S) {
      const [from, peak, gone] = S;
      swing = clamp(1 - Math.abs(a - peak) / (gone - from), 0, 1);
      trail = a > from && a < gone ? (a < peak + 0.05 ? 1 : 1 - (a - peak - 0.05) / (gone - peak - 0.05)) : 0;
    }
  }
  if (pose.dodge != null) { // tuck low and lean into the roll, arms swept back
    const d = Math.sin(clamp(pose.dodge, 0, 1) * PI);
    lean += 0.5 * d; crouch += 6 * d; phi -= 0.9 * d; phiB -= 0.9 * d; step += 2 * d;
  }
  if (hurt) { lean -= 0.22; crouch += 1.5; phi += 0.5; phiB += 0.3; }
  const psi = C.abs ? k : phi + k;
  // lunge: the front foot steps in, the back foot slides and lifts its heel, the hips drop and follow
  fF.x += step; fB.x -= step * 0.25; fB.y -= Math.max(0, step) * 0.18;
  if (lift > 0) { fF.y -= lift * 0.7; fB.y -= lift * 0.55; fF.x -= lift * 0.2; } // airborne: feet leave the ground, knees tuck

  const hip = pose.sit ? { x: -2, y: SIT.hip + Math.sin(t * 1.8) * SIT.breathe } : { x: step * 0.45, y: -38.5 + bob + crouch - lift };
  if (pose.sit) { fF.x = SIT.feet[0]; fF.y = -2.5; fB.x = SIT.feet[1]; fB.y = -2.5; } // seated: knees up, feet in front
  const cl = Math.cos(lean), sl = Math.sin(lean);
  const W = (lx, ly) => ({ x: hip.x + lx * cl - ly * sl, y: hip.y + lx * sl + ly * cl });
  const hipF = W(2.6, 0), hipB = W(-2.6, 0);
  const sF = W(...C.sF), sB = W(...C.sB);
  const hF = armTo(sF, phi, 21);
  let hB = armTo(sB, phiB, C.reachB);
  const draw = classId === 'archer' ? x1 : 0, nock = classId === 'archer' ? x2 : 0;
  if (nock > 0) { // the string hand sits on the string, pulled back along the arrow
    const sp = { x: hF.x - Math.sin(psi) * (3 + draw * 17), y: hF.y - Math.cos(psi) * (3 + draw * 17) };
    hB = { x: lerp(hB.x, sp.x, nock), y: lerp(hB.y, sp.y, nock) };
  }
  return {
    t, moving, lean, hip, W, fF, fB, hipF, hipB, sF, sB, hF, hB, phi, phiB, psi, swing, trail, attack: a, prof, hurt, flip, lift,
    draw, nock, cast: classId === 'mage' ? x1 : 0, psiB: phiB + x1,
    kF: ik(hipF, fF, 19, 19, 1), kB: ik(hipB, fB, 19, 19, 1),
    eF: ik(sF, hF, 11.5, 11, -1), eB: ik(sB, hB, 10.5, 10, -1),
  };
}
