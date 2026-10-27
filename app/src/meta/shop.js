// Town services (spec §13.2, §15.2): Inn, potion shop, potion belt. Pure — returns
// { ok: true, char } with a new character, or { ok: false, reason } ('full' | 'gold').
import { INN } from '../data/dungeon.js';
import { POTIONS, POTION_MAX, BELT_SIZE } from '../data/potions.js';
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
