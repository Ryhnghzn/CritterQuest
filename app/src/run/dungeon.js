// Dungeon floors (spec §13.3, §18.3): each floor is a randomly shaped room
// (run/room.js) of the chosen dungeon; waves walk in through the 4 lanes, a
// cleared floor opens portals in the centre (blue = down, gold = home). Pure
// logic on the run state (run/run.js); the run decides what an exit means.
import { tr, t } from '../i18n.js';
import { sfx } from '../core/audio.js';
import { rand, rrange, rint } from '../core/rng.js';
import { ROOM, WAVE, PORTAL, COINS, FLOOR_HP_STEP } from '../data/dungeon.js';
import { DUNGEONS } from '../data/dungeons.js';
import { makeRoom, inside, confine, SHAPES } from './room.js';
import { ELITE, DROP, RARITIES, MYTHIC } from '../data/items.js';
import { MYTHIC_PICK } from '../data/itemfx.js';
import { ENEMIES } from '../data/enemies.js';
import { dropItem, itemName, itemLevelFor } from '../meta/itemgen.js';
import { CHAR_LEVEL_MAX, HORDE } from '../data/balance.js';
import { MAT_DROPS, MATS, GEM_IDS, GEMS } from '../data/forge.js';

export const FLOOR_COUNT = DUNGEONS[0].floors.length; // every dungeon has 5 floors
const IN_ROOM = 30;           // an enemy is "in the room" once this far inside the wall
const FIRST_SPAWN = 1.2;      // seconds of calm at the start of a floor

// enemy HP multiplier: floor step × the dungeon's difficulty
export const hpMul = (floor, dungeon = DUNGEONS[0]) => (1 + FLOOR_HP_STEP * (floor - 1)) * dungeon.hpMul;
const floorsOf = (run) => run.dungeon.floors;

// Spawn order of one wave: bosses first, everything else shuffled; normal counts × HORDE.count (spec §33.2).
export function waveQueue(wave) {
  const lead = [], rest = [];
  for (const [type, k] of Object.entries(wave.mix)) {
    const n = ENEMIES[type].boss ? k : Math.max(1, Math.round(k * HORDE.count));
    for (let i = 0; i < n; i++) (ENEMIES[type].boss ? lead : rest).push(type);
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
  run.shots.length = 0; run.hazards.length = 0; run.pulses.length = 0;
  run.vfx.clear(); run.floaters.length = 0;
  run.px = 0; run.py = 0;
  run.dodgeT = 0;
  run.floorT = 0;
  run.floorClear = false; run.clearT = 0;
  run.portals = [];
  run.exit = null;
  // floor 1 of the first dungeon is always the round room; after that, any shape
  run.room = makeRoom(floor === 1 && run.dungeon === DUNGEONS[0] ? 'round' : SHAPES[Math.floor(rand() * SHAPES.length)], rand);
  beginWave(run, 0);
  run.spawnT = FIRST_SPAWN;
  run.showBanner(t('Lantai {n}', { n: floor }));
}

function beginWave(run, i) {
  run.wave = i;
  run.queue = waveQueue(floorsOf(run)[run.floor - 1].waves[i]);
  run.queueI = 0;
  run.spawnT = 0;
  run.waveGap = 0;
}

// One enemy at the far end of a lane (random unless given); it walks in before chasing.
export function spawnFromLane(run, type, lane = null) {
  const lanes = run.room.lanes;
  lane ||= lanes[Math.floor(rand() * lanes.length)];
  const along = ROOM.wall + ROOM.laneLen * rrange(0.5, 1);
  const side = rrange(-1, 1) * (ROOM.laneWidth / 2 - 14);
  const e = run.spawnEnemy(type);
  if (!e.boss) { // the horde: weaker one by one, elites a bit rarer (spec §33.2)
    e.hp *= HORDE.hp; e.maxHp *= HORDE.hp;
    if (rand() < ELITE.chance[run.floor - 1] * HORDE.eliteMul) makeElite(e);
  }
  e.x = lane.x + lane.dx * along - lane.dy * side;
  e.y = lane.y + lane.dy * along + lane.dx * side;
  e.lane = lane;
  e.entering = true;
  if (e.boss) run.showBanner(t('{name} DATANG!', { name: ENEMIES[type].name.toUpperCase() }));
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
    if (inside(run.room, e.x, e.y, IN_ROOM)) e.entering = false;
    else return { x: e.lane.x - e.lane.dx * (IN_ROOM + 30), y: e.lane.y - e.lane.dy * (IN_ROOM + 30) };
  }
  return { x: run.px, y: run.py };
}

export function confineEnemy(run, e) {
  if (!e.entering) confine(run.room, e, e.r);
}

const player = { x: 0, y: 0 };
export function confinePlayer(run) {
  player.x = run.px; player.y = run.py;
  confine(run.room, player, 12);
  run.px = player.x; run.py = player.y;
}

export function stepDungeon(run, dt) {
  run.floorT += dt;
  if (run.floorClear) { stepPortals(run, dt); return; }
  const waves = floorsOf(run)[run.floor - 1].waves;
  if (run.queueI < run.queue.length) {
    run.spawnT -= dt;
    if (run.spawnT <= 0) spawnGroup(run, waves[run.wave].every);
  } else if (run.wave + 1 < waves.length) {
    if (run.enemies.length <= Math.ceil(run.queue.length * HORDE.nextAt)) {
      run.waveGap += dt;
      if (run.waveGap >= WAVE.gap) {
        beginWave(run, run.wave + 1);
        run.showBanner(t('Gelombang {a}/{b}', { a: run.wave + 1, b: waves.length }));
      }
    }
  } else if (run.enemies.length === 0) {
    clearFloor(run);
  }
}

// The next group of the wave out of one lane (spec §33.2): a boss alone, others HORDE.pack at a
// time, none while the room holds HORDE.liveCap.
function spawnGroup(run, every) {
  const Q = run.queue;
  if (ENEMIES[Q[run.queueI]].boss) { spawnFromLane(run, Q[run.queueI++]); run.spawnT = every; return; }
  let k = Math.min(rint(HORDE.pack[0], HORDE.pack[1]), HORDE.liveCap - run.enemies.length);
  if (k <= 0) { run.spawnT = HORDE.retry; return; }
  const lane = run.room.lanes[Math.floor(rand() * run.room.lanes.length)];
  while (k-- > 0 && run.queueI < Q.length && !ENEMIES[Q[run.queueI]].boss) spawnFromLane(run, Q[run.queueI++], lane);
  run.spawnT = every * HORDE.packGap;
}

function clearFloor(run) {
  run.floorClear = true;
  run.clearT = 0;
  run.floorsCleared += 1;
  sfx.clear();
  const bonus = COINS.floorBonus * run.floor;
  run.addGold(bonus);
  addMats(run, { dust: MAT_DROPS.floor.dust * run.floor }, 0, -60);
  run.addFloater(run.px, run.py - 40, t('+{n} koin', { n: bonus }), '#ffd166');
  for (let i = 0; i < DROP.chestItems; i++) dropGear(run, 'chest', 0, 0);
  for (const g of run.gems) g.mag = true; // nothing left behind on the floor
  if (run.floor >= FLOOR_COUNT) {
    run.cleared = true;
    run.portals = [{ kind: 'home', x: 0, y: 0, armed: false }];
    run.showBanner(tr('Dungeon tamat!'));
  } else {
    run.portals = [
      { kind: 'down', x: -PORTAL.gap, y: 0, armed: false },
      { kind: 'home', x: PORTAL.gap, y: 0, armed: false },
    ];
    run.showBanner(t('Lantai {n} bersih!', { n: run.floor }));
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
  // deeper dungeons give higher-level gear
  const level = run.field // regions: around the level of the enemy that fell (spec §25.1)
    ? Math.max(1, Math.min(CHAR_LEVEL_MAX, (run.lootLevel || run.level) + Math.floor(rand() * 3) - 1))
    : Math.min(CHAR_LEVEL_MAX, itemLevelFor(run.level, run.floor, rand) + run.dungeon.itemLevel);
  const item = dropItem({ source, classId: run.classId, charLevel: run.level, floor: run.floor, luk: run.luk, level }, rand);
  const a = rand() * Math.PI * 2;
  run.gems.push({ x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18, v: 0, mag: false, big: false, gear: item, t: rand() * 6 });
  return item;
}

export function gearPickedUp(run, item) {
  run.loot.push(item);
  run.addFloater(run.px, run.py - 50, itemName(item), RARITIES[item.rarity].color);
  if (item.rarity === MYTHIC) { // red-gold flash; main.js shows the big card (visual only, no sim RNG)
    for (const [c, a, life] of MYTHIC_PICK.flash) run.vfx.flash(c, a, life);
    run.vfx.ring(run.px, run.py, { ...MYTHIC_PICK.ring, color: RARITIES[MYTHIC].color });
    run.vfx.burst('stars', run.px, run.py, ['#ffd166', '#ff4d6d', '#ffffff'], { n: 14 });
    run.mythicPick = item;
  }
}

// Forge materials found this trip (spec §20): straight into run.mats, with a floater.
export function addMats(run, mats, dx = 0, dy = -50) {
  for (const [m, base] of Object.entries(mats)) {
    if (!base) continue;
    let n = base;
    if (base > 0 && run.fx.matfind > 0) { // mount bonus: probabilistic rounding so small drops feel it too
      const x = base * (1 + run.fx.matfind), lo = Math.floor(x);
      n = lo + (rand() < x - lo ? 1 : 0);
    }
    run.mats[m] += n;
    run.addFloater(run.px + dx, run.py + dy, `+${n} ${MATS[m].name}`, MATS[m].color);
    dy -= 10;
  }
}

// Loot from a defeated enemy: gear (bosses 2, elites 1, others rarely), materials, gems and coins.
export function dropLoot(run, e) {
  run.lootLevel = e.level || 0;
  if (e.boss) {
    for (let i = 0; i < DROP.bossItems; i++) dropGear(run, 'boss', e.x, e.y);
    addMats(run, MAT_DROPS.boss);
    const gem = GEM_IDS[Math.floor(rand() * GEM_IDS.length)];
    run.gemsFound.push({ gem, tier: 1 });
    run.addFloater(run.px, run.py - 80, `+${GEMS[gem].name}`, GEMS[gem].color);
  } else if (e.elite) {
    dropGear(run, 'elite', e.x, e.y);
    if (rand() < MAT_DROPS.eliteDustChance) addMats(run, { dust: 1 + Math.floor(rand() * 3) });
  } else if (rand() < normalChance(DROP.enemyChance) * (1 + (run.fx.gearfind || 0))) dropGear(run, 'enemy', e.x, e.y);
  dropCoins(run, e);
}

// Chance of a reward from a normal enemy (spec §33.4): there are HORDE.count times as many.
export const normalChance = (base) => base * HORDE.reward;

// Coins from a defeated enemy: bosses and elites always pay, others sometimes drop a pickup.
export function dropCoins(run, e) {
  if (e.boss || e.elite) {
    const v = e.boss ? COINS.boss : ELITE.gold;
    run.addGold(v);
    run.addFloater(e.x, e.y - e.r - 10, t('+{n} koin', { n: v }), '#ffd166');
    return;
  }
  if (rand() >= normalChance(COINS.chance)) return;
  const v = COINS.min + Math.floor(rand() * (COINS.max - COINS.min + 1));
  run.gems.push({ x: e.x + rrange(-6, 6), y: e.y + rrange(-6, 6), v, mag: false, big: false, coin: true, t: rand() * 6 });
}
