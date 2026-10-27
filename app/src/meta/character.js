// Permanent character: creation, level/EXP and final stats (spec §4.1, §4.3).
// Every function returns new objects; save data is never mutated in place.
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { NAME_MAX, CHAR_EXP_BASE, CHAR_EXP_GROWTH, CHAR_LEVEL_MAX, ATTRS, POINTS_PER_LEVEL, INVENTORY_MAX } from '../data/balance.js';
import { DEATH } from '../data/dungeon.js';
import { POTIONS, POTION_IDS, DEFAULT_BELT, isHeal } from '../data/potions.js';
import { SAVE_VERSION, validateSlot, nameLength, EQUIP_SLOTS, freshDungeonRecords, freshMats, freshGems, freshTalents } from './schema.js';
import { TALENTS } from '../data/talents.js';
import { DUNGEONS } from '../data/dungeons.js';
import { START_TIME } from '../data/time.js';
import { itemStats } from './itemgen.js';
import { UPGRADES } from '../data/shop.js';

export function validateName(name) {
  if (typeof name !== 'string') return null;
  const n = name.trim();
  return nameLength(n) >= 1 && nameLength(n) <= NAME_MAX ? n : null;
}

export function createCharacter({ slot, name, look, classId }, now) {
  const c = {
    version: SAVE_VERSION, slot, createdAt: now, updatedAt: now,
    name: validateName(name),
    look: { hair: look?.hair, hairColor: look?.hairColor },
    classId,
    level: 1, exp: 0,
    gold: 0,
    clock: START_TIME,
    mats: freshMats(), gems: freshGems(),
    skills: CLASSES[classId] ? CLASSES[classId].skills.slice(0, 2).map((s) => s.id) : ['', ''],
    talents: freshTalents(),
    hp: null,
    potions: Object.fromEntries(POTION_IDS.map((id) => [id, 0])),
    belt: DEFAULT_BELT.slice(),
    upgrades: { hp: 0, atk: 0, magnet: 0 },
    attrs: { str: 0, vit: 0, agi: 0, dex: 0, luk: 0 },
    inventory: [],
    equipped: { weapon: null, helm: null, armor: null, boots: null, amulet: null, ring: null },
    records: { trips: 0, kills: 0, bossKills: 0, dungeons: freshDungeonRecords() },
  };
  const err = validateSlot(c);
  if (err.length) throw new Error(`karakter tidak sah: ${err.join(', ')}`);
  return c;
}

export function expToNext(level) { return CHAR_EXP_BASE + CHAR_EXP_GROWTH * level; }

export function addExp(char, amount) {
  const c = structuredClone(char);
  let levelsGained = 0;
  c.exp += Math.floor(amount);
  while (c.level < CHAR_LEVEL_MAX && c.exp >= expToNext(c.level)) {
    c.exp -= expToNext(c.level);
    c.level++;
    levelsGained++;
  }
  if (c.level >= CHAR_LEVEL_MAX) c.exp = 0;
  return { char: c, levelsGained };
}

// Every stat the equipped gear adds, summed.
export function gearStats(char) {
  const s = {};
  for (const slot of EQUIP_SLOTS) {
    const id = char.equipped[slot];
    const it = id && char.inventory.find((x) => x.id === id);
    if (!it) continue;
    for (const [k, v] of Object.entries(itemStats(it))) s[k] = (s[k] || 0) + v;
  }
  return s;
}

// Class base + level growth + attribute points (spec §14.1) + equipped gear,
// then trainer upgrades (spec §7: % of the total, flat magnet).
export function finalStats(char) {
  const cls = CLASSES[char.classId];
  const lv = char.level - 1;
  const s = { ...CLASS_BASE, ...cls.stats };
  s.maxHp += cls.growth.maxHp * lv;
  s.atk += cls.growth.atk * lv;
  for (const a of ATTRS) {
    const n = char.attrs[a.id];
    for (const [stat, v] of Object.entries(a.per)) s[stat] += v * n;
  }
  for (const [stat, v] of Object.entries(gearStats(char))) s[stat] += v;
  for (const t of TALENTS) { // talents (spec §21)
    const n = char.talents?.[t.id] || 0;
    for (const [stat, v] of Object.entries(t.pct || {})) s[stat] *= 1 + v * n;
    for (const [stat, v] of Object.entries(t.add || {})) s[stat] += v * n;
  }
  for (const [id, u] of Object.entries(UPGRADES)) {
    const n = char.upgrades[id];
    for (const [stat, v] of Object.entries(u.pct || {})) s[stat] *= 1 + v * n;
    for (const [stat, v] of Object.entries(u.flat || {})) s[stat] += v * n;
  }
  return s;
}

export function spentPoints(char) {
  return ATTRS.reduce((n, a) => n + char.attrs[a.id], 0);
}

export function freePoints(char) {
  return POINTS_PER_LEVEL * (char.level - 1) - spentPoints(char);
}

// Spend points: add = { str: 2, vit: 1, … }. Returns the new character, or
// null when the request is malformed or needs more points than are free.
export function allocate(char, add, now) {
  let total = 0;
  for (const [k, n] of Object.entries(add)) {
    if (!ATTRS.some((a) => a.id === k) || !Number.isInteger(n) || n < 0) return null;
    total += n;
  }
  if (total > freePoints(char)) return null;
  const c = structuredClone(char);
  for (const [k, n] of Object.entries(add)) c.attrs[k] += n;
  c.updatedAt = now;
  return c;
}

// Saved HP: null means full; anything above max (e.g. after a level change) is clamped.
export function currentHp(char) {
  const max = finalStats(char).maxHp;
  return char.hp === null ? max : Math.min(char.hp, max);
}

// Stores HP the way the save expects: whole number, or null when full.
function withHp(c, hp) {
  const max = finalStats(c).maxHp;
  c.hp = hp >= max ? null : Math.max(0, Math.round(hp));
  return c;
}

// Drink a healing potion outside a run (town); buffs only work in the dungeon.
// Returns the same object when nothing changes.
export function usePotion(char, id, now) {
  const max = finalStats(char).maxHp;
  const hp = currentHp(char);
  if (!id || !isHeal(id) || char.potions[id] <= 0 || hp >= max) return char;
  const c = structuredClone(char);
  c.potions[id] -= 1;
  withHp(c, hp + max * POTIONS[id].heal);
  c.updatedAt = now;
  return c;
}

// End of a dungeon trip (spec §13.4).
// trip: { dungeon, exp, gold, kills, bossKills, floor, cleared, died, hp, potions, attrs?, items? }
// attrs: points spent during the trip (on levels gained in it). items: gear picked
// up — after a death each piece survives with DEATH.gearKeepChance (rng decides);
// what does not fit in the bag is left behind.
// mats / gems: forge materials & gems found — a death keeps half the materials
// (rounded down) and each gem with DEATH.gearKeepChance.
// Returns { char, levelsGained, goldLost, itemsKept, itemsLost, itemsLeft, matsLost, gemsLost }.
export function applyTrip(char, trip, now, rng = Math.random) {
  const leveled = addExp(char, trip.exp);
  const levelsGained = leveled.levelsGained;
  const c = (trip.attrs && allocate(leveled.char, trip.attrs, now)) || leveled.char;
  const gold = trip.died ? Math.floor(trip.gold * DEATH.goldKeep) : trip.gold;
  c.gold += gold;
  c.potions = { ...trip.potions };
  withHp(c, trip.died ? Math.max(1, finalStats(c).maxHp * DEATH.wakeHp) : trip.hp);
  const r = c.records;
  const dr = r.dungeons[trip.dungeon || 'shadow'];
  dr.bestFloor = Math.max(dr.bestFloor, trip.floor);
  dr.clears += trip.cleared ? 1 : 0;
  r.trips += 1;
  r.kills += trip.kills;
  r.bossKills += trip.bossKills;
  const itemsKept = [], itemsLost = [], itemsLeft = [];
  const ids = new Set(c.inventory.map((it) => it.id));
  for (const item of trip.items || []) {
    if (trip.died && rng() >= DEATH.gearKeepChance) { itemsLost.push(item); continue; }
    if (c.inventory.length >= INVENTORY_MAX) { itemsLeft.push(item); continue; }
    const it = structuredClone(item);
    while (ids.has(it.id)) it.id += 'x'; // ids only need to be unique within the slot
    ids.add(it.id);
    c.inventory.push(it);
    itemsKept.push(it);
  }
  const matsLost = {};
  for (const [m, n] of Object.entries(trip.mats || {})) {
    const keep = trip.died ? Math.floor(n * DEATH.goldKeep) : n;
    c.mats[m] += keep;
    if (n - keep) matsLost[m] = n - keep;
  }
  const gemsLost = [];
  for (const gm of trip.gems || []) {
    if (trip.died && rng() >= DEATH.gearKeepChance) { gemsLost.push(gm); continue; }
    c.gems[gm.gem][gm.tier - 1] += 1;
  }
  c.updatedAt = now;
  return { char: c, levelsGained, goldLost: trip.gold - gold, itemsKept, itemsLost, itemsLeft, matsLost, gemsLost };
}

// Dungeons open one after another: the next once the previous has been cleared (spec §18.3).
export function unlockedDungeons(char) {
  const out = [];
  for (const d of DUNGEONS) {
    out.push(d);
    if (!char.records.dungeons[d.id].clears) break;
  }
  return out;
}
