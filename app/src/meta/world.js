// Open world on the save (spec §25.1): fog of war per region (one bit per
// FIELD.fogCell square, stored as base64), progress written from a region,
// and the light penalty for falling there. Pure.
import { FIELD, TREASURE, TOWNS, TELEPORT, regionById, EXPEDITIONS, EXPEDITION_REWARD, regionOfDungeon } from '../data/world.js';
import { mulberry, sample } from '../run/fieldmap.js';
import { buildWorld, zoneAt, armFrac, zoneToWorld, blocked, freeSpot } from '../run/worldmap.js';
import { INVENTORY_MAX } from '../data/balance.js';
import { DEATH } from '../data/dungeon.js';
import { addExp, allocate, finalStats } from './character.js';
import { addKills, discover } from './collection.js';
import { advanceBounties, isDone } from './bounties.js';
import { countQuests, syncQuests } from './quests.js';
import { rollMountDrops } from './stable.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// region: anything with w, h (and fogCell — the world's is coarser than the old regions')
const cellOf = (region) => region.fogCell || FIELD.fogCell;
export function fogSize(region) {
  const cols = Math.ceil(region.w / cellOf(region)), rows = Math.ceil(region.h / cellOf(region));
  return { cols, rows, bytes: Math.ceil((cols * rows) / 8) };
}

export function encodeFog(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return s;
}

// base64 → bytes of the region's size (a bad or short string reads as unexplored)
export function decodeFog(str, region) {
  const out = new Uint8Array(fogSize(region).bytes);
  if (typeof str !== 'string') return out;
  const clean = str.replace(/=+$/, '');
  let bits = 0, acc = 0, o = 0;
  for (const ch of clean) {
    const v = B64.indexOf(ch);
    if (v < 0) return new Uint8Array(out.length);
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; if (o < out.length) out[o++] = (acc >> bits) & 255; }
  }
  return out;
}

export const isFogValid = (str, region) => typeof str === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length <= Math.ceil(fogSize(region).bytes / 3) * 4;

export function fogAt(bytes, cols, cx, cy) {
  const i = cy * cols + cx;
  return (bytes[i >> 3] >> (i & 7)) & 1;
}

// Uncovers every cell within `radius` of (x, y); true when something new showed.
export function revealFog(bytes, region, x, y, radius = FIELD.fogRadius) {
  const { cols, rows } = fogSize(region), c = cellOf(region);
  let changed = false;
  for (let cy = Math.max(0, Math.floor((y - radius) / c)); cy <= Math.min(rows - 1, Math.floor((y + radius) / c)); cy++) {
    for (let cx = Math.max(0, Math.floor((x - radius) / c)); cx <= Math.min(cols - 1, Math.floor((x + radius) / c)); cx++) {
      if (((cx + 0.5) * c - x) ** 2 + ((cy + 0.5) * c - y) ** 2 > radius * radius) continue;
      const i = cy * cols + cx;
      if (!((bytes[i >> 3] >> (i & 7)) & 1)) { bytes[i >> 3] |= 1 << (i & 7); changed = true; }
    }
  }
  return changed;
}

export const explored = (bytes, region) => {
  const { cols, rows } = fogSize(region);
  let n = 0;
  for (let i = 0; i < cols * rows; i++) n += (bytes[i >> 3] >> (i & 7)) & 1;
  return n / (cols * rows);
};

function storeHp(c, hp) {
  const max = finalStats(c).maxHp;
  c.hp = hp >= max ? null : Math.max(1, Math.round(hp));
}

// Writes what was earned in a region since the last save.
// part: { region, fog, found (dungeon gates found), exp, gold, kills, killsBy, elites, items, mats, gems, hp, potions, attrs }
// → { char, levelsGained, itemsLeft, uniquesFound, bountiesDone, mountsFound }
export function applyField(char, part, now, rng = Math.random) {
  const leveled = addExp(char, part.exp || 0);
  const c = (part.attrs && allocate(leveled.char, part.attrs, now)) || leveled.char;
  c.gold += part.gold || 0;
  c.potions = { ...part.potions };
  storeHp(c, part.hp);
  c.records.kills += part.kills || 0;
  addKills(c, part.killsBy);
  const uniquesFound = discover(c, part.items);
  const before = c.bounties.filter(isDone).length;
  c.bounties = advanceBounties(c.bounties, { killsBy: part.killsBy, elites: part.elites, gold: part.gold, dungeon: part.region });
  const bountiesDone = c.bounties.filter(isDone).length - before;
  const itemsLeft = [];
  const ids = new Set(c.inventory.map((it) => it.id));
  for (const item of part.items || []) {
    if (c.inventory.length >= INVENTORY_MAX) { itemsLeft.push(item); continue; }
    const it = structuredClone(item);
    while (ids.has(it.id)) it.id += 'x';
    ids.add(it.id);
    c.inventory.push(it);
  }
  for (const [m, n] of Object.entries(part.mats || {})) c.mats[m] += n;
  for (const gm of part.gems || []) c.gems[gm.gem][gm.tier - 1] += 1;
  for (const id of part.found || []) if (!c.found.includes(id)) c.found.push(id);
  // opened chests: { zone, idx } (or an index in part.region)
  for (const o of part.opened || []) {
    const zone = typeof o === 'number' ? part.region : o.zone, idx = typeof o === 'number' ? o : o.idx;
    if (!zone) continue;
    const had = c.treasures[zone] || [];
    if (!had.includes(idx)) c.treasures = { ...c.treasures, [zone]: [...had, idx].sort((a, b) => a - b) };
  }
  if (part.region && regionById(part.region) && !c.regions[part.region]) c.regions = { ...c.regions, [part.region]: {} };
  if (typeof part.fog === 'string') c.world = { ...c.world, fog: part.fog };
  countQuests(c, { killsBy: part.killsBy, elites: part.elites, elitesBy: part.elitesBy, questItems: part.questItems, reached: part.reached, region: part.region });
  const mountsFound = rollMountDrops(c, part.mountRolls || { any: 0, eclipse: 0 }, rng);
  c.updatedAt = now;
  return { char: c, levelsGained: leveled.levelsGained, itemsLeft, uniquesFound, bountiesDone, mountsFound };
}

// Falling in a region: wake in the last town with a little HP, minus a tenth of the coins.
export function fieldDeath(char, now) {
  const c = structuredClone(char);
  const lost = Math.floor(c.gold * FIELD.deathGoldLoss);
  c.gold -= lost;
  storeHp(c, Math.max(1, finalStats(c).maxHp * DEATH.wakeHp));
  c.updatedAt = now;
  return { char: c, goldLost: lost };
}

export function visitTown(char, townId, now) {
  if (char.location === townId && char.towns.includes(townId)) return char;
  const c = structuredClone(char);
  c.location = townId;
  if (!c.towns.includes(townId)) c.towns.push(townId);
  syncQuests(c);
  c.updatedAt = now;
  return c;
}

// hidden treasure (spec §25.3)
// Road points of a zone with their fx (spec §40: the zone's arm of the one world), cached.
const roadCache = new Map();
function zoneRoads(zone) {
  if (roadCache.has(zone)) return roadCache.get(zone);
  const world = buildWorld();
  const pts = [];
  for (const p of world.paths) for (const [x, y] of sample(p, 200)) {
    if (zoneAt(world, x, y) !== zone) continue;
    const f = armFrac(zone, x, y);
    pts.push([x, y, f.fx, f.fy]);
  }
  roadCache.set(zone, pts);
  return pts;
}

// A spot off the roads of a zone, inside the band [lo, hi] of its fx, clear of solids
// (a point in the band, moved to the nearest free spot, when nothing fits).
function spotInBand(zone, lo, hi, rng, off, clear) {
  const world = buildWorld();
  const near = zoneRoads(zone).filter(([, , fx]) => fx >= lo && fx <= hi);
  for (let tries = 0; tries < 600 && near.length; tries++) {
    const [px, py] = near[Math.floor(rng() * near.length)];
    const a = rng() * Math.PI * 2, d = off[0] + rng() * (off[1] - off[0]);
    const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
    if (zoneAt(world, x, y) !== zone) continue;
    const { fx } = armFrac(zone, x, y);
    if (fx < lo || fx > hi || world.pathDist(x, y) < off[0] * 0.6 || blocked(world, x, y, clear)) continue;
    return { x: Math.round(x), y: Math.round(y) };
  }
  const p = zoneToWorld(zone, (lo + hi) / 2, 0.5);
  return freeSpot(world, p.x, p.y, clear);
}

// The zone's treasure spots: fixed for everyone (from the region seed), off the roads,
// clear of solids, spread from the meadow out to the town; the last one is the overlord's.
const treasureCache = new Map();
export function treasureSpots(region) {
  if (treasureCache.has(region.id)) return treasureCache.get(region.id);
  const rng = mulberry((region.seed * 7919 + 101) >>> 0);
  const [b0, b1] = TREASURE.band, step = (b1 - b0) / TREASURE.count;
  const out = [];
  for (let i = 0; i < TREASURE.count; i++) {
    const p = spotInBand(region.id, b0 + step * i, b0 + step * (i + 1), rng, TREASURE.offPath, 90);
    out.push({ idx: i, zone: region.id, x: p.x, y: p.y, lord: i === TREASURE.count - 1 });
  }
  treasureCache.set(region.id, out);
  return out;
}

// teleport stone (spec §25.2)
export const teleportPrice = (townId) => TELEPORT.base + TELEPORT.perTier * TOWNS[townId].tier;

// Travel to a town already visited, for coins. { ok, char } | { ok: false, reason }.
export function teleport(char, townId, now) {
  if (!TOWNS[townId] || !char.towns.includes(townId)) return { ok: false, reason: 'unknown' };
  if (char.location === townId) return { ok: false, reason: 'here' };
  const price = teleportPrice(townId);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= price;
  c.location = townId;
  c.updatedAt = now;
  return { ok: true, char: c, price };
}

// dungeon gates & expeditions (spec §25.5)
const hash = (s) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

// This character's dungeon gates in a zone: off a road, in the dungeon's band,
// clear of anything solid. Deterministic from the character's world seed.
export function gateSpots(region, seed) {
  return region.dungeons.map((d) => {
    const rng = mulberry((seed ^ hash(region.id + d.id)) >>> 0);
    const p = spotInBand(region.id, d.at[0], d.at[1], rng, [240, 760], 90);
    return { dungeon: d.id, zone: region.id, x: p.x, y: p.y };
  });
}

// gates of a region with whether this character has found them
export const regionGates = (char, region) => gateSpots(region, char.world.seed).map((g) => ({ ...g, found: char.found.includes(g.dungeon) }));

export function expeditionReward(char) {
  const r = EXPEDITION_REWARD, lv = char.level;
  return { gold: r.gold.base + r.gold.perLevel * lv, exp: r.exp.base + r.exp.perLevel * lv, marks: r.marks };
}

// Every expedition with where its gate is and whether it suits the character's level.
export function expeditionList(char) {
  return Object.entries(EXPEDITIONS).map(([dungeon, e]) => {
    const region = regionOfDungeon(dungeon);
    return { dungeon, ...e, region: region?.id ?? null, found: char.found.includes(dungeon), fits: char.level >= e.levels[0] && char.level <= e.levels[1], active: char.expedition?.dungeon === dungeon };
  });
}

export function takeExpedition(char, dungeon, now) {
  const e = EXPEDITIONS[dungeon];
  if (!e || !regionOfDungeon(dungeon)) return { ok: false, reason: 'none' };
  const c = structuredClone(char);
  c.expedition = { dungeon, need: e.floors, have: 0 };
  c.updatedAt = now;
  return { ok: true, char: c };
}

export function dropExpedition(char, now) {
  if (!char.expedition) return { ok: false, reason: 'none' };
  const c = structuredClone(char);
  c.expedition = null;
  c.updatedAt = now;
  return { ok: true, char: c };
}

export function claimExpedition(char, now) {
  const x = char.expedition;
  if (!x || x.have < x.need) return { ok: false, reason: 'notdone' };
  const reward = expeditionReward(char);
  const { char: c, levelsGained } = addExp(char, reward.exp);
  c.gold += reward.gold;
  c.marks += reward.marks;
  c.expedition = null;
  c.updatedAt = now;
  return { ok: true, char: c, reward, levelsGained };
}
