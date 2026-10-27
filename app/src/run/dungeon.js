// Dungeon floors (spec §13.3): waves walk in through the 4 lanes, a cleared floor
// opens portals in the centre (blue = down, gold = home). Pure logic on the run
// state (run/run.js); the run decides what an exit means.
import { rand, rrange } from '../core/rng.js';
import { ROOM, FLOORS, WAVE, PORTAL, COINS, FLOOR_HP_STEP } from '../data/dungeon.js';
import { ELITE, DROP, RARITIES } from '../data/items.js';
import { dropItem, itemName } from '../meta/itemgen.js';

export const FLOOR_COUNT = FLOORS.length;
// lane directions: N, E, S, W
export const LANES = [0, 1, 2, 3].map((i) => {
  const a = (i * Math.PI) / 2 - Math.PI / 2;
  return { a, x: Math.round(Math.cos(a)), y: Math.round(Math.sin(a)) };
});
const MOUTH = ROOM.r - 40;    // an enemy is "in the room" once this close to the centre
const FIRST_SPAWN = 1.2;      // seconds of calm at the start of a floor

export const hpMul = (floor) => 1 + FLOOR_HP_STEP * (floor - 1);

// Spawn order of one wave: bosses first, everything else shuffled.
export function waveQueue(wave) {
  const lead = [], rest = [];
  for (const [type, n] of Object.entries(wave.mix)) {
    for (let i = 0; i < n; i++) (type === 'boss' ? lead : rest).push(type);
  }
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return lead.concat(rest);
}

export function startFloor(run, floor) {
  run.floor = floor;
  run.deepest = Math.max(run.deepest, floor);
  run.enemies.length = 0; run.hits.length = 0;
  run.particles.length = 0; run.floaters.length = 0;
  run.px = 0; run.py = 0;
  run.dodgeT = 0;
  run.floorT = 0;
  run.floorClear = false; run.clearT = 0;
  run.portals = [];
  run.exit = null;
  beginWave(run, 0);
  run.spawnT = FIRST_SPAWN;
  run.showBanner(`Lantai ${floor}`);
}

function beginWave(run, i) {
  run.wave = i;
  run.queue = waveQueue(FLOORS[run.floor - 1].waves[i]);
  run.queueI = 0;
  run.spawnT = 0;
  run.waveGap = 0;
}

// One enemy at the far end of a random lane; it walks in before chasing.
export function spawnFromLane(run, type) {
  const lane = LANES[Math.floor(rand() * LANES.length)];
  const along = ROOM.r + ROOM.wall + ROOM.laneLen * rrange(0.5, 1);
  const side = rrange(-1, 1) * (ROOM.laneWidth / 2 - 14);
  const e = run.spawnEnemy(type);
  if (type !== 'boss' && rand() < ELITE.chance[run.floor - 1]) makeElite(e);
  e.x = lane.x * along - lane.y * side;
  e.y = lane.y * along + lane.x * side;
  e.lane = lane;
  e.entering = true;
  if (type === 'boss') run.showBanner('RAJA MAW DATANG!');
  return e;
}

// Elite (spec §5.4): bigger, tougher, golden glow, always drops gear.
export function makeElite(e) {
  e.elite = true;
  e.hp *= ELITE.hpMul; e.maxHp *= ELITE.hpMul;
  e.dmg *= ELITE.dmgMul;
  e.r *= ELITE.size;
  e.xp *= ELITE.xpMul;
}

// Where an enemy walks: down its lane to the room, then at the player.
// Also keeps enemies already in the room inside the wall.
export function enemyGoal(run, e) {
  if (e.entering) {
    if (Math.hypot(e.x, e.y) < MOUTH) e.entering = false;
    else return { x: e.lane.x * (MOUTH - 30), y: e.lane.y * (MOUTH - 30) };
  }
  return { x: run.px, y: run.py };
}

export function confineEnemy(e) {
  if (e.entering) return;
  const max = ROOM.r - e.r, d = Math.hypot(e.x, e.y);
  if (d > max) { e.x *= max / d; e.y *= max / d; }
}

export function confinePlayer(run) {
  const max = ROOM.r - 12, d = Math.hypot(run.px, run.py);
  if (d > max) { run.px *= max / d; run.py *= max / d; }
}

export function stepDungeon(run, dt) {
  run.floorT += dt;
  if (run.floorClear) { stepPortals(run, dt); return; }
  const waves = FLOORS[run.floor - 1].waves;
  if (run.queueI < run.queue.length) {
    run.spawnT -= dt;
    if (run.spawnT <= 0) {
      run.spawnT = waves[run.wave].every;
      spawnFromLane(run, run.queue[run.queueI++]);
    }
  } else if (run.wave + 1 < waves.length) {
    if (run.enemies.length <= WAVE.nextAlive) {
      run.waveGap += dt;
      if (run.waveGap >= WAVE.gap) {
        beginWave(run, run.wave + 1);
        run.showBanner(`Gelombang ${run.wave + 1}/${waves.length}`);
      }
    }
  } else if (run.enemies.length === 0) {
    clearFloor(run);
  }
}

function clearFloor(run) {
  run.floorClear = true;
  run.clearT = 0;
  const bonus = COINS.floorBonus * run.floor;
  run.addGold(bonus);
  run.addFloater(run.px, run.py - 40, `+${bonus} koin`, '#ffd166');
  for (let i = 0; i < DROP.chestItems; i++) dropGear(run, 'chest', 0, 0);
  for (const g of run.gems) g.mag = true; // nothing left behind on the floor
  if (run.floor >= FLOOR_COUNT) {
    run.cleared = true;
    run.portals = [{ kind: 'home', x: 0, y: 0, armed: false }];
    run.showBanner('Dungeon tamat!');
  } else {
    run.portals = [
      { kind: 'down', x: -PORTAL.gap, y: 0, armed: false },
      { kind: 'home', x: PORTAL.gap, y: 0, armed: false },
    ];
    run.showBanner(`Lantai ${run.floor} bersih!`);
  }
}

// A portal arms after a short delay and once the player is not standing in it,
// so it never fires the moment it appears.
function stepPortals(run, dt) {
  run.clearT += dt;
  for (const p of run.portals) {
    const inside = (run.px - p.x) ** 2 + (run.py - p.y) ** 2 < PORTAL.r * PORTAL.r;
    if (!p.armed) { p.armed = run.clearT >= PORTAL.armDelay && !inside; continue; }
    if (inside) { run.exit = p.kind; return; }
  }
}

// A piece of gear on the ground; picked up like a gem (run.pickup).
export function dropGear(run, source, x, y) {
  const item = dropItem({ source, classId: run.classId, charLevel: run.level, floor: run.floor, luk: run.luk }, rand);
  const a = rand() * Math.PI * 2;
  run.gems.push({ x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18, v: 0, mag: false, big: false, gear: item, t: rand() * 6 });
  return item;
}

export function gearPickedUp(run, item) {
  run.loot.push(item);
  run.addFloater(run.px, run.py - 50, itemName(item), RARITIES[item.rarity].color);
}

// Loot from a defeated enemy: gear (bosses 2, elites 1, others rarely) and coins.
export function dropLoot(run, e) {
  if (e.type === 'boss') for (let i = 0; i < DROP.bossItems; i++) dropGear(run, 'boss', e.x, e.y);
  else if (e.elite) dropGear(run, 'elite', e.x, e.y);
  else if (rand() < DROP.enemyChance) dropGear(run, 'enemy', e.x, e.y);
  dropCoins(run, e);
}

// Coins from a defeated enemy: bosses and elites always pay, others sometimes drop a pickup.
export function dropCoins(run, e) {
  if (e.type === 'boss' || e.elite) {
    const v = e.type === 'boss' ? COINS.boss : ELITE.gold;
    run.addGold(v);
    run.addFloater(e.x, e.y - e.r - 10, `+${v} koin`, '#ffd166');
    return;
  }
  if (rand() >= COINS.chance) return;
  const v = COINS.min + Math.floor(rand() * (COINS.max - COINS.min + 1));
  run.gems.push({ x: e.x + rrange(-6, 6), y: e.y + rrange(-6, 6), v, mag: false, big: false, coin: true, t: rand() * 6 });
}
