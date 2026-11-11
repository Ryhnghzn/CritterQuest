// The open world (spec §25.1, §40): the same fight as in a dungeon, on one connected map.
// Packs of enemies walk in from just off-screen around the player, of the zone they
// appear in and stronger farther from Kota Awal; far stragglers vanish; walking into a
// town's gate enters that town. Pure logic on the run state (run/run.js).
import { t } from '../i18n.js';
import { rand, rrange, rint } from '../core/rng.js';
import { FIELD, FIELD_SCALE, TREASURE, regionById } from '../data/world.js';
import { WORLD, CROSS_MIX, ECLIPSE } from '../data/worldmap.js';
import { ENEMIES } from '../data/enemies.js';
import { affixCount } from './affix.js';
import { initMiniMove } from './minimove.js';
import { dungeonById } from '../data/dungeons.js';
import { buildWorld, zoneAt, levelAt, inHub, pushOut, blocked, ensureChunks } from './worldmap.js';
import { canCrossWater } from './mount.js';
import { makeElite, addMats, dropGear } from './dungeon.js';
import { revealFog, treasureSpots } from '../meta/world.js';
import { GEM_IDS, GEMS } from '../data/forge.js';
import { HIDDEN_R, REACH_R, DROP_ITEMS } from '../data/quests.js';
import { HORDE } from '../data/balance.js';
import { REGIONS } from '../data/world.js';

// enemy level at a point of the world
export const fieldLevel = (run, x, y) => levelAt(run.fmap, x, y);

export const fieldScale = (level) => ({
  hp: 1 + FIELD_SCALE.hp * (level - 1),
  dmg: 1 + FIELD_SCALE.dmg * (level - 1),
  reward: 1 + FIELD_SCALE.reward * (level - 1),
});

// run.dungeon stands for "where we are" (rewards, theme, records key): the zone the player is in
function setZone(run, zone) {
  const region = regionById(zone);
  run.region = region;
  run.inEclipse = zone === 'eclipse';
  run.dungeon = { id: region.id, name: region.name, short: region.name, hpMul: 1, dmgMul: 1, rewardMul: run.dungeon?.rewardMul ?? 1, itemLevel: 0, theme: region.theme };
}

// where a town's gate lets you out: a little in front of it
export function townExit(world, townId) {
  const g = world.towns[townId];
  return { x: g.x + g.out[0] * WORLD.spawnBack, y: g.y + g.out[1] * WORLD.spawnBack };
}

// at: a town id (out of its gate) or { x, y } (back out of a dungeon gate)
// gates: [{ dungeon, x, y, found }] — this character's dungeon gates (meta/world.js)
// target: { x, y } | null — where the expedition arrow points
// opened: { zone: [idx] } — treasure chests already opened (spec §25.3); eclipseOpen: all Seal Shards in
export function startField(run, at = 'home', gates = [], target = null, opened = {}, eclipseOpen = false) {
  const world = buildWorld();
  run.field = true;
  run.fmap = world;
  const p = typeof at === 'string' ? townExit(world, at) : at;
  run.px = p.x; run.py = p.y;
  run.dungeon = null;
  setZone(run, zoneAt(world, run.px, run.py));
  run.floor = 1; run.deepest = 0;
  run.zoneChanged = false;
  run.townLock = typeof at === 'string' ? at : null; // the gate just left does not take you back in at once
  run.eclipseOpen = eclipseOpen;
  run.gates = gates.map((g) => ({ ...g }));
  run.gatesFound = [];   // dungeon ids found this visit (written to the save)
  run.nearGate = null;
  run.target = target;
  // state: 'idle' → 'guarded' (guardian out) → 'unlocked' (guardian down) → 'open'
  const isOpen = (zone, idx) => Array.isArray(opened) ? opened.includes(idx) && zone === run.region.id : (opened[zone] || []).includes(idx);
  run.treasures = REGIONS.flatMap((r) => treasureSpots(r).map((tr) => ({ ...tr, state: isOpen(r.id, tr.idx) ? 'open' : 'idle', guard: null })));
  run.treasuresOpened = []; // [{ zone, idx }] opened this visit (written to the save)
  run.packT = 1.5; run.fogT = 0; run.edgeT = 0;
  run.night = false;
  ensureChunks(world, run.px, run.py, 9);
  if (run.fog) revealFog(run.fog, WORLD, run.px, run.py);
  run.place = inHub(run.px, run.py) ? 'hub' : run.region.id;
  run.showBanner(placeTitle(run));
}

// the meadow round Kota Awal has its own name; elsewhere the zone and its levels
const placeTitle = (run) => (run.place === 'hub' ? t('Padang Kota Awal') : zoneTitle(run.region));

export const zoneTitle = (region) => t('{name} · LV {a}–{b}', { name: region.name, a: region.levels[0], b: region.levels[1] });

function pickType(region) {
  const list = Object.entries(region.enemies);
  let roll = rand() * list.reduce((n, [, w]) => n + w, 0);
  for (const [id, w] of list) if ((roll -= w) < 0) return id;
  return list[0][0];
}

// the zone whose enemies come at (x, y): near a crossing, either side's
function packZone(world, x, y) {
  for (const c of world.crossings) {
    if ((c.x - x) ** 2 + (c.y - y) ** 2 > CROSS_MIX * CROSS_MIX) continue;
    const b = world.borders.find((bl) => bl.id === c.border);
    return b.between[rand() < 0.5 ? 0 : 1];
  }
  return zoneAt(world, x, y);
}

const nearTownGate = (world, x, y) => Object.values(world.towns).some((g) => (g.x - x) ** 2 + (g.y - y) ** 2 < WORLD.townClear * WORLD.townClear);

// A pack just off-screen around the player, away from walls, towns, the meadow and (mostly) the roads.
export function spawnPack(run) {
  const map = run.fmap;
  let x = 0, y = 0, ok = false;
  for (let tries = 0; tries < 10 && !ok; tries++) {
    const a = rand() * Math.PI * 2, d = rrange(FIELD.spawnMin, FIELD.spawnMax);
    x = run.px + Math.cos(a) * d; y = run.py + Math.sin(a) * d;
    ok = x > 60 && y > 60 && x < map.w - 60 && y < map.h - 60 && !inHub(x, y) && !nearTownGate(map, x, y) && !blocked(map, x, y, 40);
    if (ok && map.pathDist(x, y) < FIELD.pathWidth && rand() < FIELD.pathAvoid) ok = false;
    if (ok && run.hidden.some((h) => (h.x - x) ** 2 + (h.y - y) ** 2 < HIDDEN_R.calm ** 2)) ok = false; // homes stay quiet
    if (ok && !run.eclipseOpen && zoneAt(map, x, y) === 'eclipse') ok = false;
  }
  if (!ok) return 0;
  return spawnGroup(run, x, y, Math.min(rint(FIELD.pack[0], FIELD.pack[1]), FIELD.maxEnemies - run.enemies.length), packZone(map, x, y)).length;
}

// A group of n enemies of a zone round (x, y), at the level there (§33.3: the horde, weaker
// one by one; a few elites). Returns them. Used by packs and quest events (run/questev.js).
// type: an enemy kind to send (null: one of the zone's, by weight)
export function spawnGroup(run, x, y, n, zone, type = null) {
  const map = run.fmap;
  const region = regionById(zone);
  type ||= pickType(region);
  const def = ENEMIES[type];
  if (def.group) n = Math.min(n, rint(def.group[0], def.group[1])); // hyenas 4–6, twins in pairs (spec §41.1)
  const level = levelAt(map, x, y);
  const sc = fieldScale(level);
  const out = [];
  for (let i = 0; i < n; i++) {
    let kind = type;
    if (def.single && i > 0) for (let k = 0; k < 8 && (kind === type || ENEMIES[kind].single || ENEMIES[kind].group); k++) kind = pickType(region); // a totem comes alone with others
    if (def.single && i > 0 && (ENEMIES[kind].single || ENEMIES[kind].group)) kind = 'slink';
    const e = run.spawnEnemy(kind);
    e.hp *= sc.hp * HORDE.hp; e.maxHp *= sc.hp * HORDE.hp; e.dmg *= sc.dmg; // §33.3: the horde, weaker one by one
    e.xp = Math.round(ENEMIES[kind].xp * sc.reward);
    e.level = level; e.zone = zone;
    const a = rand() * Math.PI * 2;
    e.x = x + Math.cos(a) * rrange(10, 60); e.y = y + Math.sin(a) * rrange(10, 60);
    pushOut(map, e, e.r);
    if (rand() < FIELD.eliteChance * HORDE.eliteMul) makeElite(e, affixCount({ level }));
    out.push(e);
  }
  return out;
}

export function stepField(run, dt) {
  const map = run.fmap;
  ensureChunks(map, run.px, run.py, 1); // the chunks ahead, one per step at most
  // stronger rewards farther out (coins picked up use the level where the player stands)
  run.dungeon.rewardMul = fieldScale(levelAt(map, run.px, run.py)).reward;
  // a new zone: its title, and the progress so far is saved under the zone left (main.js)
  const zone = zoneAt(map, run.px, run.py);
  if (zone !== run.region.id) {
    if (zone === 'eclipse' && !run.eclipseOpen) { sealBack(run); return; }
    run.zoneChanged = run.region.id; // main.js saves the trip so far, then clears it
    setZone(run, zone);
  }
  const place = inHub(run.px, run.py) ? 'hub' : zone;
  if (place !== run.place) { run.place = place; run.showBanner(placeTitle(run)); }
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
  if (run.fog && (run.fogT -= dt) <= 0) { run.fogT = 0.25; revealFog(run.fog, WORLD, run.px, run.py); }
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
  // town gates: walking into one enters that town (spec §40.3)
  if (run.edgeT > 0) run.edgeT -= dt;
  for (const g of Object.values(map.towns)) {
    const d2 = (g.x - run.px) ** 2 + (g.y - run.py) ** 2;
    if (run.townLock === g.id) { if (d2 > (WORLD.gateR + 80) ** 2) run.townLock = null; continue; }
    if (d2 < WORLD.gateR * WORLD.gateR) { run.exit = g.id; break; }
  }
}

// Tanah Gerhana is sealed until all Seal Shards are in: back out of its opening
function sealBack(run) {
  const g = run.fmap.pocketGate;
  run.px = g.x; run.py = g.y - ECLIPSE.half - ECLIPSE.gap - 40;
  if (run.edgeT <= 0) { run.edgeT = 3; run.showBanner(t('Celah ke Tanah Gerhana tertutup segel. Kumpulkan kelima Pecahan Segel.')); }
}

export function confineFieldPlayer(run) {
  const o = { x: run.px, y: run.py };
  pushOut(run.fmap, o, 12, canCrossWater(run.mount));
  for (const h of run.hidden) if (h.hut) { // a cabin is solid
    const dx = o.x - h.x, dy = o.y - (h.y - 30), d = Math.hypot(dx, dy), r = HIDDEN_R.solid + 12;
    if (d < r && d > 0) { o.x = h.x + (dx / d) * r; o.y = h.y - 30 + (dy / d) * r; }
  }
  run.px = o.x; run.py = o.y;
}

export const confineFieldEnemy = (run, e) => pushOut(run.fmap, e, e.r);

// floater text for the zone the player is in, e.g. "Hutan Kelam · LV 7"
export const fieldHere = (run) => (run.place === 'hub' ? t('Padang Kota Awal') : `${run.region.name} · LV ${levelAt(run.fmap, run.px, run.py)}`);

// hidden treasure (spec §25.3)
const GUARD_SKIP = ['healer', 'summoner', 'bomber', 'embertotem', 'voidobelisk', 'voidtwin', 'bushling']; // too soft to guard a chest; still, paired or hidden (spec §41.1)

// The guardian (a crowned, giant version of a regional enemy) and its escort.
export function spawnGuardian(run, tr) {
  const region = regionById(tr.zone || run.region.id), rule = tr.lord ? TREASURE.lord : TREASURE.guard;
  let type = pickType(region);
  if (GUARD_SKIP.includes(type)) type = Object.keys(region.enemies).find((id) => !GUARD_SKIP.includes(id));
  const level = levelAt(run.fmap, tr.x, tr.y), sc = fieldScale(level);
  const g = run.spawnEnemy(type);
  g.x = tr.x + 40; g.y = tr.y + 30;
  g.hp *= sc.hp * rule.hp; g.maxHp = g.hp; g.dmg *= sc.dmg * rule.dmg; g.r *= rule.size;
  g.xp = Math.round(ENEMIES[type].xp * sc.reward * rule.hp * 0.5);
  g.level = level; g.elite = true; g.mini = true; g.lord = tr.lord;
  initMiniMove(g, tr.zone || run.region.id); // one move of the zone's dungeon boss (spec §41.2)
  pushOut(run.fmap, g, g.r);
  for (let i = 0; i < rule.escort; i++) {
    const e = run.spawnEnemy(type);
    e.hp *= sc.hp * HORDE.hp; e.maxHp *= sc.hp * HORDE.hp; e.dmg *= sc.dmg; // escorts are horde (§33.3)
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
  const level = levelAt(run.fmap, tr.x, tr.y), sc = fieldScale(level);
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
  run.treasuresOpened.push({ zone: tr.zone, idx: tr.idx });
  run.showBanner(tr.lord ? t('Harta Penguasa {region} terbuka!', { region: regionById(tr.zone || run.region.id).name }) : t('Harta karun ditemukan!'));
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
      run.showBanner(t('Penjaga tumbang. Petinya tidak terkunci lagi!'));
    } else if (tr.state === 'unlocked' && d2 < TREASURE.openR ** 2) openTreasure(run, tr);
  }
}

// quests in the wild (spec §26.5)
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
    if (d.region && d.region !== run.region.id) continue; // only falls in its zone
    if ((d.night && !run.night) || rand() >= d.chance * HORDE.reward) continue; // §33.4
    run.questItems[d.item] = (run.questItems[d.item] || 0) + 1;
    run.addFloater(e.x, e.y - 30, `+1 ${DROP_ITEMS[d.item].name}`, DROP_ITEMS[d.item].color);
  }
}
