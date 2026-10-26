// Deterministic PRNG (mulberry32). All randomness in the game flows through
// this module so a run can be replayed frame-for-frame (used by __seek/t? for
// screenshots and for debugging).
const SEED = 20261025;
let state = SEED;

export function resetRng(seed = SEED) { state = seed >>> 0; }

export function rand() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rrange(min, max) { return min + rand() * (max - min); }
export function rint(min, max) { return Math.floor(rrange(min, max + 1)); }
export function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
