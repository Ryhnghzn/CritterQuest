// Town services (spec §13.2, §15.2, §6.5, §17): Inn, potion shop, potion belt,
// gear shop (sell, chests), trainer, barber. Pure — returns
// { ok: true, char } with a new character, or { ok: false, reason } ('full' | 'gold').
import { INN } from '../data/dungeon.js';
import { POTIONS, POTION_MAX, BELT_SIZE } from '../data/potions.js';
import { CHESTS, SELL_PRICE } from '../data/items.js';
import { INVENTORY_MAX, HAIR_STYLES, HAIR_COLORS } from '../data/balance.js';
import { UPGRADES, upgradePrice, RESPEC, BARBER_PRICE } from '../data/shop.js';
import { dropItem } from './itemgen.js';
import { isEquipped } from './gear.js';
import { currentHp, finalStats } from './character.js';
import { nextMorning } from './clock.js';

export function innPrice(char) { return INN.base + INN.perLevel * char.level; }

export function innRest(char, now) {
  if (currentHp(char) >= finalStats(char).maxHp) return { ok: false, reason: 'full' };
  const price = innPrice(char);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= price;
  c.hp = null;
  c.clock = nextMorning(c.clock); // a night's sleep
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

// keeps the current HP (not healed, only clamped) when max HP changes
function keepHp(before, c) {
  const hp = currentHp(before);
  c.hp = hp >= finalStats(c).maxHp ? null : Math.round(hp);
  return c;
}

// Trainer: next tier of a permanent upgrade.
export function buyUpgrade(char, id, now) {
  const tier = char.upgrades[id];
  if (tier >= UPGRADES[id].max) return { ok: false, reason: 'max' };
  const price = upgradePrice(id, tier);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= price;
  c.upgrades[id] += 1;
  c.updatedAt = now;
  return { ok: true, char: keepHp(char, c) };
}

export const respecPrice = (char) => RESPEC.base + RESPEC.perLevel * char.level;

// Trainer: give back every spent attribute point.
export function respec(char, now) {
  if (Object.values(char.attrs).every((n) => n === 0)) return { ok: false, reason: 'none' };
  const price = respecPrice(char);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= price;
  for (const k in c.attrs) c.attrs[k] = 0;
  c.updatedAt = now;
  return { ok: true, char: keepHp(char, c) };
}

// Barber: new hair style / colour.
export function changeLook(char, look, now) {
  const { hair, hairColor } = look;
  if (!Number.isInteger(hair) || hair < 0 || hair >= HAIR_STYLES || !Number.isInteger(hairColor) || hairColor < 0 || hairColor >= HAIR_COLORS) return { ok: false, reason: 'bad' };
  if (hair === char.look.hair && hairColor === char.look.hairColor) return { ok: false, reason: 'same' };
  if (char.gold < BARBER_PRICE) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= BARBER_PRICE;
  c.look = { hair, hairColor };
  c.updatedAt = now;
  return { ok: true, char: c };
}
