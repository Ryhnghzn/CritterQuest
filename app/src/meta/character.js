// Permanent character: creation, level/EXP and final stats (spec §4.1, §4.3).
// Every function returns new objects; save data is never mutated in place.
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { NAME_MAX, CHAR_EXP_BASE, CHAR_EXP_GROWTH, CHAR_LEVEL_MAX, ATTRS, POINTS_PER_LEVEL } from '../data/balance.js';
import { POTION, DEATH } from '../data/dungeon.js';
import { SAVE_VERSION, validateSlot, nameLength } from './schema.js';

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
    hp: null, potions: 0,
    upgrades: { hp: 0, atk: 0, magnet: 0 },
    attrs: { str: 0, vit: 0, agi: 0, dex: 0, luk: 0 },
    inventory: [],
    equipped: { weapon: null, helm: null, armor: null, boots: null, amulet: null, ring: null },
    records: { bestFloor: 0, clears: 0, trips: 0, kills: 0, bossKills: 0 },
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

// Class base + level growth + attribute points (spec §14.1). Gear (langkah 5C)
// and trainer upgrades (langkah 6) are layered on top of this later.
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

// Drink a potion outside a run (town). Returns the same object when nothing changes.
export function usePotion(char, now) {
  const max = finalStats(char).maxHp;
  const hp = currentHp(char);
  if (char.potions <= 0 || hp >= max) return char;
  const c = structuredClone(char);
  c.potions -= 1;
  withHp(c, hp + max * POTION.heal);
  c.updatedAt = now;
  return c;
}

// End of a dungeon trip (spec §13.4).
// trip: { exp, gold, kills, bossKills, floor, cleared, died, hp, potions, attrs? }
// attrs: points spent during the trip (on levels gained in it). Gear joins the inventory in langkah 5B.
export function applyTrip(char, trip, now) {
  const leveled = addExp(char, trip.exp);
  const levelsGained = leveled.levelsGained;
  const c = (trip.attrs && allocate(leveled.char, trip.attrs, now)) || leveled.char;
  const gold = trip.died ? Math.floor(trip.gold * DEATH.goldKeep) : trip.gold;
  c.gold += gold;
  c.potions = trip.potions;
  withHp(c, trip.died ? Math.max(1, finalStats(c).maxHp * DEATH.wakeHp) : trip.hp);
  const r = c.records;
  r.bestFloor = Math.max(r.bestFloor, trip.floor);
  r.clears += trip.cleared ? 1 : 0;
  r.trips += 1;
  r.kills += trip.kills;
  r.bossKills += trip.bossKills;
  c.updatedAt = now;
  return { char: c, levelsGained, goldLost: trip.gold - gold };
}
