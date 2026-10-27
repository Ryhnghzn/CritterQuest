// Walking around town (spec §13.2): movement with box collisions, the NPC in
// talking range, slow HP regeneration. Pure — the caller writes HP back to the save.
import { TOWN } from '../data/town.js';
import { TOWN_REGEN } from '../data/dungeon.js';

export const PLAYER_R = 10;

// outer walls + buildings, as boxes
const SOLIDS = [
  { x: 0, y: 0, w: TOWN.w, h: TOWN.wall },
  { x: 0, y: TOWN.h - TOWN.wall, w: TOWN.w, h: TOWN.wall },
  { x: 0, y: 0, w: TOWN.wall, h: TOWN.h },
  { x: TOWN.w - TOWN.wall, y: 0, w: TOWN.wall, h: TOWN.h },
  ...TOWN.buildings,
];

function blocked(x, y) {
  for (const b of SOLIDS) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    if ((x - cx) ** 2 + (y - cy) ** 2 < PLAYER_R * PLAYER_R) return true;
  }
  return false;
}

// at: 'spawn' (plaza) or 'gate' (back from the dungeon)
export function createTown({ moveSpd, hp, maxHp, at = 'spawn' }) {
  const p = at === 'gate' ? TOWN.gateSpawn : TOWN.spawn;
  return { x: p.x, y: p.y, moveSpd, hp, maxHp, moveX: 0, moveY: 0, facing: 1, near: null, t: 0 };
}

// intent: { move: { x, y } }
export function stepTown(town, intent, dt) {
  town.t += dt;
  const { x: mx, y: my } = intent.move;
  town.moveX = mx; town.moveY = my;
  if (mx > 0.1) town.facing = 1; else if (mx < -0.1) town.facing = -1;
  // move each axis separately so the player slides along walls
  const nx = town.x + mx * town.moveSpd * dt;
  if (!blocked(nx, town.y)) town.x = nx;
  const ny = town.y + my * town.moveSpd * dt;
  if (!blocked(town.x, ny)) town.y = ny;

  town.hp = Math.min(town.maxHp, town.hp + town.maxHp * TOWN_REGEN * dt);

  let near = null, best = TOWN.talkRadius;
  for (const n of TOWN.npcs) {
    const d = Math.hypot(n.x - town.x, n.y - town.y);
    if (d < best) { best = d; near = n; }
  }
  town.near = near;
}
