// Item generation (spec §6.3, §14.2). Pure; every random choice comes from the
// `rng` passed in (a () => [0, 1) function), so tests can seed it.
import {
  RARITIES, LEGENDARY, SLOTS, SLOT_IDS, TIER_LEVELS, VARIANTS, LEVEL_GROWTH, BONUSES, BONUS_IDS,
  ROLL_MIN, UNIQUES, EFFECTS, DROP_WEIGHTS, LUK_RARITY, DROP,
} from '../data/items.js';
import { SOCKETS, ENHANCE, GEMS } from '../data/forge.js';
import { CHAR_LEVEL_MAX } from '../data/balance.js';

const ROUND = { atk: 0, maxHp: 0, moveSpd: 1, def: 1, crit: 1, cdr: 1, magnet: 0, atkSpd: 3, critDmg: 3 };
const round = (stat, v) => { const k = 10 ** ROUND[stat]; return Math.round(v * k) / k; };
const UNIQUE_BY_ID = Object.fromEntries(UNIQUES.map((u) => [u.id, u]));

export const uniqueOf = (item) => (item.unique ? UNIQUE_BY_ID[item.unique] : null);

export function tierFor(level) {
  let t = 0;
  for (let i = 0; i < TIER_LEVELS.length; i++) if (level >= TIER_LEVELS[i]) t = i;
  return t;
}

export function itemLevelFor(charLevel, floor, rng) {
  const s = DROP.levelSpread;
  const roll = charLevel - 1 + floor + Math.floor(rng() * (2 * s + 1)) - s;
  return Math.max(1, Math.min(roll, charLevel + DROP.levelAhead, CHAR_LEVEL_MAX));
}

// source: 'enemy' | 'elite' | 'chest' | 'boss'; luk shifts weight toward Langka and up.
export function rollRarity(source, luk, rng) {
  const w = DROP_WEIGHTS[source].map((x, r) => (r >= 2 ? x * (1 + LUK_RARITY * luk) : x));
  let roll = rng() * w.reduce((a, b) => a + b, 0);
  for (let r = 0; r < w.length; r++) {
    roll -= w[r];
    if (roll < 0 && w[r] > 0) return r;
  }
  return w.findLastIndex((x) => x > 0);
}

function rollId(rng) {
  let s = 'it_';
  for (let i = 0; i < 8; i++) s += Math.floor(rng() * 36).toString(36);
  return s;
}

// One item of a known slot / rarity / level. classId: the owner's class (weapons only);
// unique: id from UNIQUES for Legendary / Mythic.
export function makeItem({ slot, classId, rarity, itemLevel, unique = null }, rng) {
  const def = SLOTS[slot];
  const rar = RARITIES[rarity];
  const grow = 1 + LEVEL_GROWTH * (itemLevel - 1);
  const base = {};
  for (const [stat, v] of Object.entries(def.base)) base[stat] = round(stat, v * grow * rar.mul);
  const pool = BONUS_IDS.slice();
  const bonuses = [];
  for (let i = 0; i < rar.bonuses; i++) {
    const stat = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const b = BONUSES[stat];
    const max = b.v * (1 + b.growth * (itemLevel - 1));
    const value = round(stat, max * (ROLL_MIN + (1 - ROLL_MIN) * rng()));
    bonuses.push({ stat, value: value > 0 ? value : round(stat, max) });
  }
  return {
    id: rollId(rng), slot, classId: slot === 'weapon' ? classId : null,
    variant: tierFor(itemLevel), rarity, itemLevel, base, bonuses, unique,
    plus: 0, sockets: Array(SOCKETS[rarity]).fill(null), // forge level & gem sockets (spec §20)
  };
}

// A random drop for a character: rarity by source (+ LUK), slot at random; a
// Legendary / Mythic roll becomes one of the uniques that fit the class.
// level: fixed item level (shop chests), otherwise rolled from character level + floor.
export function dropItem({ source, classId, charLevel, floor, luk = 0, level = null }, rng) {
  const itemLevel = level ?? itemLevelFor(charLevel, floor, rng);
  let rarity = rollRarity(source, luk, rng);
  if (rarity >= LEGENDARY) {
    const fits = UNIQUES.filter((u) => u.rarity === rarity && (u.classId === null || u.classId === classId));
    const u = fits[Math.floor(rng() * fits.length)];
    return makeItem({ slot: u.slot, classId, rarity, itemLevel, unique: u.id }, rng);
  }
  const slot = SLOT_IDS[Math.floor(rng() * SLOT_IDS.length)];
  rarity = Math.max(rarity, SLOTS[slot].minRarity || 0);
  return makeItem({ slot, classId, rarity, itemLevel }, rng);
}

export function itemName(item) {
  const u = uniqueOf(item);
  const names = item.slot === 'weapon' ? VARIANTS.weapon[item.classId] : VARIANTS[item.slot];
  const first = item.bonuses[0];
  const plus = item.plus ? `+${item.plus} ` : '';
  return plus + (u ? u.name : first ? `${names[item.variant]} ${BONUSES[first.stat].suffix}` : names[item.variant]);
}

// Every stat the item adds: base (× forge level) + bonuses + socketed gems, summed per stat.
export function itemStats(item) {
  const s = {};
  const k = 1 + ENHANCE.perPlus * (item.plus || 0);
  // forged bases keep one decimal so every +1 shows, even on low-level gear
  for (const [stat, v] of Object.entries(item.base)) s[stat] = item.plus ? Math.round(v * k * 10) / 10 : round(stat, v);
  for (const g of item.sockets || []) if (g) { const def = GEMS[g.gem]; s[def.stat] = round(def.stat, (s[def.stat] || 0) + def.values[g.tier - 1]); }
  for (const b of item.bonuses) s[b.stat] = round(b.stat, (s[b.stat] || 0) + b.value);
  return s;
}

export function effectText(item) {
  const u = uniqueOf(item);
  if (!u) return null;
  const v = Math.round(u.v * 1000) / 10; // every effect value is a fraction
  return EFFECTS[u.effect].desc.replace('{v}', String(v).replace('.', ','));
}

// "+12 ATK", "+4,5% Kec. serang" …
export function statText(stat, value) {
  const b = BONUSES[stat];
  const shown = b.pct ? `${Math.round(value * 1000) / 10}%` : `${value}${b.unit || ''}`;
  return `+${shown.replace('.', ',')} ${b.label}`;
}
