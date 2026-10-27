// Town services (spec §13.2, §15.2, §6.5): Inn, potion shop, potion belt, gear
// shop (sell, chests). Pure — returns
// { ok: true, char } with a new character, or { ok: false, reason } ('full' | 'gold').
import { INN } from '../data/dungeon.js';
import { POTIONS, POTION_MAX, BELT_SIZE } from '../data/potions.js';
import { CHESTS, SELL_PRICE } from '../data/items.js';
import { INVENTORY_MAX } from '../data/balance.js';
import { dropItem } from './itemgen.js';
import { isEquipped } from './gear.js';
import { currentHp, finalStats } from './character.js';

export function innPrice(char) { return INN.base + INN.perLevel * char.level; }

export function innRest(char, now) {
  if (currentHp(char) >= finalStats(char).maxHp) return { ok: false, reason: 'full' };
  const price = innPrice(char);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= price;
  c.hp = null;
  c.updatedAt = now;
  return { ok: true, char: c };
}

export function buyPotion(char, id, now) {
  const p = POTIONS[id];
  if (char.potions[id] >= POTION_MAX) return { ok: false, reason: 'full' };
  if (char.gold < p.price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= p.price;
  c.potions[id] += 1;
  c.updatedAt = now;
  return { ok: true, char: c };
}

// Put a potion type (or null) in belt slot i; a type sits in one slot at most.
export function setBelt(char, i, id, now) {
  if (!Number.isInteger(i) || i < 0 || i >= BELT_SIZE || (id !== null && !POTIONS[id])) return { ok: false, reason: 'bad' };
  const c = structuredClone(char);
  c.belt = c.belt.map((x) => (x === id ? null : x));
  c.belt[i] = id;
  c.updatedAt = now;
  return { ok: true, char: c };
}

export const chestPrice = (char, kind) => CHESTS[kind].base + CHESTS[kind].perLevel * char.level;

// Buy a chest: one random item at the character's level. Also returns { item }.
export function buyChest(char, kind, now, rng = Math.random) {
  const price = chestPrice(char, kind);
  if (char.inventory.length >= INVENTORY_MAX) return { ok: false, reason: 'bag' };
  if (char.gold < price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  const item = dropItem({ source: CHESTS[kind].source, classId: c.classId, charLevel: c.level, floor: 1, luk: c.attrs.luk, level: c.level }, rng);
  while (c.inventory.some((x) => x.id === item.id)) item.id += 'x';
  c.gold -= price;
  c.inventory.push(item);
  c.updatedAt = now;
  return { ok: true, char: c, item };
}

// Sell items by id (never ones being worn). Also returns { gold } earned.
export function sellItems(char, ids, now) {
  const set = new Set(ids);
  const sold = char.inventory.filter((it) => set.has(it.id));
  if (!sold.length) return { ok: false, reason: 'none' };
  if (sold.some((it) => isEquipped(char, it))) return { ok: false, reason: 'equipped' };
  const c = structuredClone(char);
  const gold = sold.reduce((n, it) => n + SELL_PRICE(it), 0);
  c.inventory = c.inventory.filter((it) => !set.has(it.id));
  c.gold += gold;
  c.updatedAt = now;
  return { ok: true, char: c, gold };
}

// ids of unworn items at or below a rarity (for "sell all")
export const junkIds = (char, maxRarity) => char.inventory.filter((it) => it.rarity <= maxRarity && !isEquipped(char, it)).map((it) => it.id);
