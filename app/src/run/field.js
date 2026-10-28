// Region play (spec §25.1): the same fight as in a dungeon, on an open map.
// Packs of enemies walk in from just off-screen around the player, stronger
// toward the east; far stragglers vanish; walking off the west / east edge
// leaves the region. Pure logic on the run state (run/run.js).
import { t } from '../i18n.js';
import { rand, rrange, rint } from '../core/rng.js';
import { FIELD, FIELD_SCALE, TREASURE, READY_TOWNS, TOWNS, regionById } from '../data/world.js';
import { ENEMIES } from '../data/enemies.js';
import { dungeonById } from '../data/dungeons.js';
import { buildFieldMap, pushOut, blocked } from './fieldmap.js';
import { makeElite, addMats, dropGear } from './dungeon.js';
import { revealFog, treasureSpots } from '../meta/world.js';
import { GEM_IDS, GEMS } from '../data/forge.js';
import { HIDDEN_R, REACH_R, DROP_ITEMS } from '../data/quests.js';

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

// at: 'west' (from the region's `from` town), 'east', or { x, y } (back out of a dungeon gate)
// gates: [{ dungeon, x, y, found }] — this character's dungeon gates in the region (meta/world.js)
// target: { x, y } | null — where the expedition arrow points
// opened: indexes of this region's treasure chests already opened (spec §25.3)
export function startField(run, regionId, at = 'west', gates = [], target = null, opened = []) {
  const region = regionById(regionId);
  const map = buildFieldMap(region);
  run.field = true;
  run.region = region;
  run.fmap = map;
  // run.dungeon stands for "where we are" (rewards, theme, records key)
  run.dungeon = { id: region.id, name: region.name, short: region.name, hpMul: 1, dmgMul: 1, rewardMul: 1, itemLevel: 0, theme: region.theme };
  run.floor = 1; run.deepest = 0;
  const p = at === 'east' ? map.end : at === 'west' ? map.start : at;
  run.px = p.x; run.py = p.y;
  run.gates = gates.map((g) => ({ ...g }));
  run.gatesFound = [];   // dungeon ids found this visit (written to the save)
  run.nearGate = null;
  run.target = target;
  // state: 'idle' → 'guarded' (guardian out) → 'unlocked' (guardian down) → 'open'
  run.treasures = treasureSpots(region).map((tr) => ({ ...tr, state: opened.includes(tr.idx) ? 'open' : 'idle', guard: null }));
  run.treasuresOpened = []; // opened this visit (written to the save)
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
    if (ok && map.pathDist(x, y) < FIELD.pathWidth && rand() < FIELD.pathAvoid) ok = false;
    if (ok && run.hidden.some((h) => (h.x - x) ** 2 + (h.y - y) ** 2 < HIDDEN_R.calm ** 2)) ok = false; // homes stay quiet
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
    if (!e.boss && !e.mini && (e.x - run.px) ** 2 + (e.y - run.py) ** 2 > far) { E[i] = E[E.length - 1]; E.pop(); }
  }
  if (run.fog && (run.fogT -= dt) <= 0) { run.fogT = 0.25; revealFog(run.fog, region, run.px, run.py); }
  stepTreasure(run);
  stepQuestPlaces(run);
  // dungeon gates: seen within the fog radius, usable up close (spec §25.5)
  run.nearGate = null;
  for (const g of run.gates) {
    const d2 = (g.x - run.px) ** 2 + (g.y - run.py) ** 2;
    if (!g.found && d2 < FIELD.fogRadius * FIELD.fogRadius) {
      g.found = true;
      run.gatesFound.push(g.dungeon);
      run.showBanner(t('Gerbang {name} ditemukan!', { name: dungeonById(g.dungeon).name }));
    }
    if (d2 < FIELD.gateR * FIELD.gateR) run.nearGate = g;
  }
  // edges: west goes back, east on to the next town (closed until it is built)
  if (run.edgeT > 0) run.edgeT -= dt;
  if (run.px < FIELD.exitZone) run.exit = 'west';
  else if (run.px > map.w - FIELD.exitZone) {
    if (region.to && READY_TOWNS.includes(region.to)) run.exit = 'east';
    else {
      run.px = map.w - FIELD.exitZone - 4;
      if (run.edgeT <= 0) { run.edgeT = 3; run.showBanner(region.to ? t('Gerbang {name} masih ditutup', { name: TOWNS[region.to].name }) : t('Tidak ada jalan lagi ke timur')); }
    }
  }
}

export function confineFieldPlayer(run) {
  const o = { x: run.px, y: run.py };
  pushOut(run.fmap, o, 12);
  for (const h of run.hidden) if (h.hut) { // a cabin is solid
    const dx = o.x - h.x, dy = o.y - (h.y - 30), d = Math.hypot(dx, dy), r = HIDDEN_R.solid + 12;
    if (d < r && d > 0) { o.x = h.x + (dx / d) * r; o.y = h.y - 30 + (dy / d) * r; }
  }
  run.px = o.x; run.py = o.y;
}

export const confineFieldEnemy = (run, e) => pushOut(run.fmap, e, e.r);

// floater text for the region the player is in, e.g. "Hutan Kelam · LV 7"
export const fieldHere = (run) => `${run.region.name} · LV ${fieldLevel(run.region, run.px)}`;

// ——— hidden treasure (spec §25.3) ———
const GUARD_SKIP = ['healer', 'summoner', 'bomber']; // too soft to guard a chest

// The guardian (a crowned, giant version of a regional enemy) and its escort.
export function spawnGuardian(run, tr) {
  const region = run.region, rule = tr.lord ? TREASURE.lord : TREASURE.guard;
  let type = pickType(region);
  if (GUARD_SKIP.includes(type)) type = Object.keys(region.enemies).find((id) => !GUARD_SKIP.includes(id));
  const level = fieldLevel(region, tr.x), sc = fieldScale(level);
  const g = run.spawnEnemy(type);
  g.x = tr.x + 40; g.y = tr.y + 30;
  g.hp *= sc.hp * rule.hp; g.maxHp = g.hp; g.dmg *= sc.dmg * rule.dmg; g.r *= rule.size;
  g.xp = Math.round(ENEMIES[type].xp * sc.reward * rule.hp * 0.5);
  g.level = level; g.elite = true; g.mini = true; g.lord = tr.lord;
  pushOut(run.fmap, g, g.r);
  for (let i = 0; i < rule.escort; i++) {
    const e = run.spawnEnemy(type);
    e.hp *= sc.hp; e.maxHp *= sc.hp; e.dmg *= sc.dmg;
    e.xp = Math.round(ENEMIES[type].xp * sc.reward); e.level = level;
    const a = (i / rule.escort) * Math.PI * 2;
    e.x = tr.x + Math.cos(a) * 90; e.y = tr.y + Math.sin(a) * 90;
    pushOut(run.fmap, e, e.r);
  }
  tr.guard = g; tr.state = 'guarded';
  run.showBanner(t(tr.lord ? 'Penguasa {name} menjaga harta ini!' : 'Penjaga {name} muncul!', { name: ENEMIES[type].name }));
  return g;
}

// What a chest gives: coins, materials, a gem and gear of Grand Chest quality.
export function openTreasure(run, tr) {
  const level = fieldLevel(run.region, tr.x), sc = fieldScale(level);
  const gold = Math.round((TREASURE.gold.base + TREASURE.gold.perLevel * level) * (tr.lord ? TREASURE.lordGold : 1));
  run.addGold(gold);
  run.addFloater(tr.x, tr.y - 60, t('+{n} koin', { n: gold }), '#ffd166');
  const mats = {};
  for (const [m, [a, b]] of Object.entries(tr.lord ? TREASURE.lordMats : TREASURE.mats)) mats[m] = rint(a, b);
  addMats(run, mats);
  const gem = GEM_IDS[Math.floor(rand() * GEM_IDS.length)], tier = Math.min(4, 1 + Math.floor(level / 15) + (tr.lord ? 1 : 0));
  run.gemsFound.push({ gem, tier });
  run.addFloater(tr.x, tr.y - 90, `+${GEMS[gem].name}`, GEMS[gem].color);
  run.lootLevel = level;
  for (let i = 0; i < (tr.lord ? TREASURE.lordItems : TREASURE.items); i++) dropGear(run, TREASURE.source, tr.x, tr.y + 20);
  tr.state = 'open';
  run.treasuresOpened.push(tr.idx);
  run.showBanner(tr.lord ? t('Harta Penguasa {region} terbuka!', { region: run.region.name }) : t('Harta karun ditemukan!'));
  run.addShake?.('medium');
  return { gold, mats, gem, tier, sc };
}

export function stepTreasure(run) {
  for (const tr of run.treasures || []) {
    if (tr.state === 'open') continue;
    const d2 = (tr.x - run.px) ** 2 + (tr.y - run.py) ** 2;
    if (tr.state === 'idle' && d2 < TREASURE.triggerR ** 2) spawnGuardian(run, tr);
    else if (tr.state === 'guarded' && (tr.guard.hp <= 0 || !run.enemies.includes(tr.guard))) {
      tr.state = 'unlocked'; tr.guard = null;
      run.showBanner(t('Penjaga tumbang — petinya tidak terkunci lagi!'));
    } else if (tr.state === 'unlocked' && d2 < TREASURE.openR ** 2) openTreasure(run, tr);
  }
}

// ——— quests in the wild (spec §26.5) ———
// run.hidden: people living out here [{ id, x, y, hut, mark, … }]; run.questSpots: places a quest
// sends you to [{ spot, x, y }]; run.questDrops: quest items that may fall [{ item, enemy, chance }].
export function stepQuestPlaces(run) {
  run.nearHidden = null;
  for (const h of run.hidden) if ((h.x - run.px) ** 2 + (h.y + 20 - run.py) ** 2 < HIDDEN_R.talk ** 2) run.nearHidden = h;
  for (let i = run.questSpots.length - 1; i >= 0; i--) {
    const s = run.questSpots[i];
    if ((s.x - run.px) ** 2 + (s.y - run.py) ** 2 > REACH_R ** 2) continue;
    run.questSpots.splice(i, 1);
    run.reached.push(s.spot);
    run.showBanner(t('Tempat ditemukan!'));
    run.addFloater(s.x, s.y - 60, t('Quest: tempat ditemukan'), '#ffd24a');
  }
}

// A slain enemy may drop a quest item (only while that quest step is on).
export function questDrop(run, e, kin) {
  for (const d of run.questDrops) {
    if (d.enemy !== '*' && d.enemy !== e.type && d.enemy !== kin) continue;
    if ((d.night && !run.night) || rand() >= d.chance) continue;
    run.questItems[d.item] = (run.questItems[d.item] || 0) + 1;
    run.addFloater(e.x, e.y - 30, `+1 ${DROP_ITEMS[d.item].name}`, DROP_ITEMS[d.item].color);
  }
}
