// Town services (spec §13.2): Inn and potion shop. Pure — returns
// { ok: true, char } with a new character, or { ok: false, reason } ('full' | 'gold').
import { INN, POTION } from '../data/dungeon.js';
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

export function buyPotion(char, now) {
  if (char.potions >= POTION.max) return { ok: false, reason: 'full' };
  if (char.gold < POTION.price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= POTION.price;
  c.potions += 1;
  c.updatedAt = now;
  return { ok: true, char: c };
}
