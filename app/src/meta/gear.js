// Inventory & equipment (spec §6.5, §14.2): equip, unequip, discard, compare,
// and what the equipped gear means for the dungeon and the paper doll. Pure —
// every change returns { ok: true, char } or { ok: false, reason }.
import { EQUIP_SLOTS } from './schema.js';
import { finalStats, currentHp } from './character.js';
import { uniqueOf } from './itemgen.js';

const find = (char, id) => char.inventory.find((x) => x.id === id) || null;

export function equippedItem(char, slot) {
  const id = char.equipped[slot];
  return id ? find(char, id) : null;
}

export const isEquipped = (char, item) => char.equipped[item.slot] === item.id;
export const canEquip = (char, item) => item.slot !== 'weapon' || item.classId === char.classId;

// HP is saved as a number (null = full); changing max HP keeps the current HP,
// only clamped, so swapping armour never heals.
function keepHp(before, c) {
  const hp = currentHp(before);
  const max = finalStats(c).maxHp;
  c.hp = hp >= max ? null : Math.round(hp);
  return c;
}

export function equip(char, id, now) {
  const it = find(char, id);
  if (!it) return { ok: false, reason: 'missing' };
  if (!canEquip(char, it)) return { ok: false, reason: 'class' };
  const c = structuredClone(char);
  c.equipped[it.slot] = id;
  c.updatedAt = now;
  return { ok: true, char: keepHp(char, c) };
}

export function unequip(char, slot, now) {
  if (!EQUIP_SLOTS.includes(slot) || !char.equipped[slot]) return { ok: false, reason: 'empty' };
  const c = structuredClone(char);
  c.equipped[slot] = null;
  c.updatedAt = now;
  return { ok: true, char: keepHp(char, c) };
}

export function discard(char, id, now) {
  const it = find(char, id);
  if (!it) return { ok: false, reason: 'missing' };
  const c = structuredClone(char);
  c.inventory = c.inventory.filter((x) => x.id !== id);
  if (c.equipped[it.slot] === id) c.equipped[it.slot] = null;
  c.updatedAt = now;
  return { ok: true, char: keepHp(char, c) };
}

// Final stat changes if this item were worn instead of what is in its slot.
export function compare(char, id) {
  const it = find(char, id);
  const before = finalStats(char);
  const r = equip(char, id, 0);
  if (!it || !r.ok) return {};
  const after = finalStats(isEquipped(char, it) ? unequip(char, it.slot, 0).char : r.char);
  const out = {};
  for (const k of Object.keys(before)) {
    const d = isEquipped(char, it) ? before[k] - after[k] : after[k] - before[k];
    if (Math.abs(d) > 1e-9) out[k] = d;
  }
  return out;
}

// Special effects of the equipped uniques: { effect: value } (the stronger wins).
export function gearEffects(char) {
  const fx = {};
  for (const slot of EQUIP_SLOTS) {
    const it = equippedItem(char, slot);
    const u = it && uniqueOf(it);
    if (u) fx[u.effect] = Math.max(fx[u.effect] || 0, u.v);
  }
  return fx;
}

// What the paper doll wears: { slot: { tier, rarity } } for the visible slots.
export function dollGear(char) {
  const out = {};
  for (const slot of ['weapon', 'helm', 'armor', 'boots']) {
    const it = equippedItem(char, slot);
    if (it) out[slot] = { tier: it.variant, rarity: it.rarity };
  }
  return out;
}
