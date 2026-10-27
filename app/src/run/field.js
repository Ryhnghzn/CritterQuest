// Region play (spec §25.1): the same fight as in a dungeon, on an open map.
// Packs of enemies walk in from just off-screen around the player, stronger
// toward the east; far stragglers vanish; walking off the west / east edge
// leaves the region. Pure logic on the run state (run/run.js).
import { t } from '../i18n.js';
import { rand, rrange, rint } from '../core/rng.js';
import { FIELD, FIELD_SCALE, READY_TOWNS, TOWNS, regionById } from '../data/world.js';
import { ENEMIES } from '../data/enemies.js';
import { buildFieldMap, pushOut, blocked, distToLine } from './fieldmap.js';
import { makeElite } from './dungeon.js';
import { revealFog } from '../meta/world.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// enemy level at x: the region's level range from west to east
export function fieldLevel(region, x) {
  const [a, b] = region.levels;
  return Math.round(a + (b - a) * clamp01(x / region.w));
}

export const fieldScale = (level) => ({
  hp: 1 + FIELD_SCALE.hp * (level - 1),
  dmg: 1 + FIELD_SCALE.dmg * (level - 1),
  reward: 1 + FIELD_SCALE.reward * (level - 1),
});

// at: 'west' (from the region's `from` town) or 'east'
export function startField(run, regionId, at = 'west') {
  const region = regionById(regionId);
  const map = buildFieldMap(region);
  run.field = true;
  run.region = region;
  run.fmap = map;
  // run.dungeon stands for "where we are" (rewards, theme, records key)
  run.dungeon = { id: region.id, name: region.name, short: region.name, hpMul: 1, dmgMul: 1, rewardMul: 1, itemLevel: 0, theme: region.theme };
  run.floor = 1; run.deepest = 0;
  const p = at === 'east' ? map.end : map.start;
  run.px = p.x; run.py = p.y;
  run.packT = 1.5; run.fogT = 0; run.edgeT = 0;
  run.night = false;
  if (run.fog) revealFog(run.fog, region, run.px, run.py);
  run.showBanner(t('{name} · LV {a}–{b}', { name: region.name, a: region.levels[0], b: region.levels[1] }));
}

function pickType(region) {
  const list = Object.entries(region.enemies);
  let roll = rand() * list.reduce((n, [, w]) => n + w, 0);
  for (const [id, w] of list) if ((roll -= w) < 0) return id;
  return list[0][0];
}

// A pack just off-screen around the player, away from walls and (mostly) the path.
export function spawnPack(run) {
  const map = run.fmap, region = run.region;
  let x = 0, y = 0, ok = false;
  for (let tries = 0; tries < 10 && !ok; tries++) {
    const a = rand() * Math.PI * 2, d = rrange(FIELD.spawnMin, FIELD.spawnMax);
    x = run.px + Math.cos(a) * d; y = run.py + Math.sin(a) * d;
    ok = x > FIELD.exitZone + 60 && y > 60 && x < map.w - FIELD.exitZone - 60 && y < map.h - 60 && !blocked(map, x, y, 40);
    if (ok && distToLine(region.path, x, y) < FIELD.pathWidth && rand() < FIELD.pathAvoid) ok = false;
  }
  if (!ok) return 0;
  const type = pickType(region);
  const level = fieldLevel(region, x);
  const sc = fieldScale(level);
  const n = Math.min(rint(FIELD.pack[0], FIELD.pack[1]), FIELD.maxEnemies - run.enemies.length);
  for (let i = 0; i < n; i++) {
    const e = run.spawnEnemy(type);
    e.hp *= sc.hp; e.maxHp *= sc.hp; e.dmg *= sc.dmg;
    e.xp = Math.round(ENEMIES[type].xp * sc.reward);
    e.level = level;
    const a = rand() * Math.PI * 2;
    e.x = x + Math.cos(a) * rrange(10, 60); e.y = y + Math.sin(a) * rrange(10, 60);
    pushOut(map, e, e.r);
    if (rand() < FIELD.eliteChance) makeElite(e);
  }
  return n;
}

export function stepField(run, dt) {
  const map = run.fmap, region = run.region;
  // stronger rewards deeper in (coins picked up use the level where the player stands)
  run.dungeon.rewardMul = fieldScale(fieldLevel(region, run.px)).reward;
  run.packT -= dt;
  if (run.packT <= 0) {
    run.packT = run.night ? FIELD.nightPackEvery : FIELD.packEvery;
    if (run.enemies.length < FIELD.maxEnemies) spawnPack(run);
  }
  // stragglers far behind vanish (no reward)
  const E = run.enemies, far = FIELD.despawn * FIELD.despawn;
  for (let i = E.length - 1; i >= 0; i--) {
    const e = E[i];
    if (!e.boss && (e.x - run.px) ** 2 + (e.y - run.py) ** 2 > far) { E[i] = E[E.length - 1]; E.pop(); }
  }
  if (run.fog && (run.fogT -= dt) <= 0) { run.fogT = 0.25; revealFog(run.fog, region, run.px, run.py); }
  // edges: west goes back, east on to the next town (closed until it is built)
  if (run.edgeT > 0) run.edgeT -= dt;
  if (run.px < FIELD.exitZone) run.exit = 'west';
  else if (run.px > map.w - FIELD.exitZone) {
    if (READY_TOWNS.includes(region.to)) run.exit = 'east';
    else {
      run.px = map.w - FIELD.exitZone - 4;
      if (run.edgeT <= 0) { run.edgeT = 3; run.showBanner(t('Gerbang {name} masih ditutup', { name: TOWNS[region.to].name })); }
    }
  }
}

export function confineFieldPlayer(run) {
  const o = { x: run.px, y: run.py };
  pushOut(run.fmap, o, 12);
  run.px = o.x; run.py = o.y;
}

export const confineFieldEnemy = (run, e) => pushOut(run.fmap, e, e.r);

// floater text for the region the player is in, e.g. "Hutan Kelam · LV 7"
export const fieldHere = (run) => `${run.region.name} · LV ${fieldLevel(run.region, run.px)}`;
