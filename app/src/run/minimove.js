// A treasure guardian's borrowed boss move (spec §41.2): every few seconds it plays one signature
// move of its zone's dungeon boss through the boss's own pattern code (run/enemies.js stepPattern),
// with the numbers scaled to its strength. Its own behaviour keeps running meanwhile.
import { rand, rrange } from '../core/rng.js';
import { ENEMIES, MINI_MOVES } from '../data/enemies.js';
import { stepPattern } from './enemies.js';

const TAU = Math.PI * 2;
// a copy of a boss config with every damage number × k (nested shot configs too)
function scaled(o, k) {
  if (Array.isArray(o) || o === null || typeof o !== 'object') return o;
  const out = {};
  for (const [key, v] of Object.entries(o)) out[key] = key === 'dmg' && typeof v === 'number' ? v * k : scaled(v, k);
  return out;
}

// called once when a guardian is made; zone: the zone it guards
export function initMiniMove(g, zone) {
  const from = MINI_MOVES.zones[zone];
  const B = from && ENEMIES[from];
  if (!B?.signature) return;
  const id = B.signature[Math.floor(rand() * B.signature.length)];
  g.sig = { from, id, cfg: scaled(B, (g.dmg / B.dmg) * MINI_MOVES.dmgMul), wait: rrange(...MINI_MOVES.every) * (g.lord ? MINI_MOVES.lord : 1) * 0.5 };
}

// once per step for a living guardian with a borrowed move
export function miniStep(run, e, dt) {
  const s = e.sig;
  if (e.pat) {
    const keep = { every: e.actT, enragedEvery: e.actT }; // the pattern's end must not touch its own timer
    stepPattern(run, e, keep, dt, false);
    if (!e.pat) s.wait = rrange(...MINI_MOVES.every) * (e.lord ? MINI_MOVES.lord : 1);
    return;
  }
  if ((s.wait -= dt) > 0 || e.hidden || e.frozen > 0) return;
  e.pat = { id: s.id, t: 0, n: 0, fireT: 0, a0: rand() * TAU, cfg: s.cfg };
  run.addFloater?.(e.x, e.y - e.r - 24, ENEMIES[s.from].name, '#ffd27a');
}
