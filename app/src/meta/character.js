// Permanent character: creation, level/EXP and final stats (spec §4.1, §4.3).
// Every function returns new objects; save data is never mutated in place.
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { NAME_MAX, CHAR_EXP_BASE, CHAR_EXP_GROWTH, CHAR_LEVEL_MAX } from '../data/balance.js';
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
    upgrades: { hp: 0, atk: 0, magnet: 0, potion: 0 },
    inventory: [],
    equipped: { weapon: null, helm: null, armor: null, ring: null },
    records: { bestTime: 0, runs: 0, kills: 0, bossKills: 0 },
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

// Class base + level growth. Shop upgrades (langkah 5), gear (langkah 4) and
// run blessings are layered on top of this later.
export function finalStats(char) {
  const cls = CLASSES[char.classId];
  const lv = char.level - 1;
  const s = { ...CLASS_BASE, ...cls.stats };
  s.maxHp += cls.growth.maxHp * lv;
  s.atk += cls.growth.atk * lv;
  return s;
}

// Applies a run result ({ time, kills, exp, gold, items, bossKills }) to the save.
// Items join the inventory once gear exists (langkah 4).
export function applyRunResult(char, result, now) {
  const { char: c, levelsGained } = addExp(char, result.exp);
  c.gold += result.gold;
  const r = c.records;
  r.bestTime = Math.max(r.bestTime, Math.floor(result.time));
  r.runs += 1;
  r.kills += result.kills;
  r.bossKills += result.bossKills;
  c.updatedAt = now;
  return { char: c, levelsGained };
}
