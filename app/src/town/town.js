// Walking around town (spec §13.2, §15.1): movement with box collisions, doors
// between the town and the building interiors, the NPC in talking range, slow
// HP regeneration. Pure — the caller writes HP back to the save.
import { TOWN, INTERIORS, DOORS } from '../data/town.js';
import { TOWN_REGEN } from '../data/dungeon.js';

export const PLAYER_R = 10;

// solid boxes per map: outer walls + buildings / furniture
function interiorSolids(r) {
  const half = r.w / 2, gap = r.doorW / 2;
  return [
    { x: 0, y: 0, w: r.w, h: r.back },
    { x: 0, y: 0, w: r.wall, h: r.h },
    { x: r.w - r.wall, y: 0, w: r.wall, h: r.h },
    { x: 0, y: r.h - r.wall, w: half - gap, h: r.wall },
    { x: half + gap, y: r.h - r.wall, w: half - gap, h: r.wall },
    { x: half - gap, y: r.h + 20, w: r.doorW, h: 10 }, // never walk past the door zone
    ...r.furniture.filter((f) => f.solid),
  ];
}

export const MAPS = {
  town: {
    w: TOWN.w, h: TOWN.h, npcs: TOWN.npcs, talkRadius: TOWN.talkRadius,
    solids: [
      { x: 0, y: 0, w: TOWN.w, h: TOWN.wall },
      { x: 0, y: TOWN.h - TOWN.wall, w: TOWN.w, h: TOWN.wall },
      { x: 0, y: 0, w: TOWN.wall, h: TOWN.h },
      { x: TOWN.w - TOWN.wall, y: 0, w: TOWN.wall, h: TOWN.h },
      ...TOWN.buildings,
    ],
    // walk up into a house door → its interior
    doors: DOORS.map((d) => ({ ...d.out, dy: -1, to: d.house, at: d.inside })),
  },
  ...Object.fromEntries(Object.values(INTERIORS).map((r) => {
    const d = DOORS.find((x) => x.house === r.id);
    return [r.id, {
      w: r.w, h: r.h, npcs: r.npcs, talkRadius: r.talkRadius, solids: interiorSolids(r),
      doors: [{ ...d.in, dy: 1, to: 'town', at: d.outside }],
    }];
  })),
};

function blocked(map, x, y) {
  for (const b of map.solids) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    if ((x - cx) ** 2 + (y - cy) ** 2 < PLAYER_R * PLAYER_R) return true;
  }
  return false;
}

// Where an NPC stands at time t: strollers trace a slow loop around their spot.
export function npcAt(n, t) {
  if (!n.wander) return { x: n.x, y: n.y, moving: 0 };
  const w = n.wander, a = t * w.speed + n.x * 0.01;
  return { x: n.x + Math.sin(a) * w.rx, y: n.y + Math.sin(a * 2) * w.ry, moving: 1, facing: Math.cos(a) >= 0 ? 1 : -1 };
}

// at: 'spawn' (plaza) or 'gate' (back from the dungeon)
export function createTown({ moveSpd, hp, maxHp, at = 'spawn' }) {
  const p = at === 'gate' ? TOWN.gateSpawn : TOWN.spawn;
  return { map: 'town', x: p.x, y: p.y, moveSpd, hp, maxHp, moveX: 0, moveY: 0, facing: 1, near: null, t: 0, doorT: 0, entered: null };
}

// intent: { move: { x, y } }. town.entered is set to the map id on the step a door is used.
export function stepTown(town, intent, dt) {
  town.t += dt;
  town.entered = null;
  if (town.doorT > 0) town.doorT -= dt;
  const map = MAPS[town.map];
  const { x: mx, y: my } = intent.move;
  town.moveX = mx; town.moveY = my;
  if (mx > 0.1) town.facing = 1; else if (mx < -0.1) town.facing = -1;
  // move each axis separately so the player slides along walls
  const nx = town.x + mx * town.moveSpd * dt;
  if (!blocked(map, nx, town.y)) town.x = nx;
  const ny = town.y + my * town.moveSpd * dt;
  if (!blocked(map, town.x, ny)) town.y = ny;

  for (const d of map.doors) {
    // touching the door zone while walking through it (up outdoors, down indoors)
    const cx = Math.max(d.x, Math.min(town.x, d.x + d.w)), cy = Math.max(d.y, Math.min(town.y, d.y + d.h));
    const touching = (town.x - cx) ** 2 + (town.y - cy) ** 2 <= (PLAYER_R + 2) ** 2 && town.x > d.x && town.x < d.x + d.w;
    if (touching && my * d.dy > 0.3) {
      town.map = d.to; town.x = d.at.x; town.y = d.at.y;
      town.entered = d.to; town.doorT = 0.35;
      break;
    }
  }

  town.hp = Math.min(town.maxHp, town.hp + town.maxHp * TOWN_REGEN * dt);

  const here = MAPS[town.map];
  let near = null, best = here.talkRadius;
  for (const n of here.npcs) {
    const p = npcAt(n, town.t);
    const d = Math.hypot(p.x - town.x, p.y - town.y);
    if (d < best) { best = d; near = n; }
  }
  town.near = near;
}
