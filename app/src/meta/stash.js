// Gudang (spec §25.2): one storehouse per character, open in every big town.
// Pure — returns { ok, char } | { ok: false, reason }.
import { INVENTORY_MAX, STASH_MAX } from '../data/balance.js';
import { isEquipped } from './gear.js';

// Bag → Gudang. Worn gear stays in the bag.
export function deposit(char, ids, now) {
  const set = new Set(ids);
  const items = char.inventory.filter((it) => set.has(it.id));
  if (!items.length) return { ok: false, reason: 'none' };
  if (items.some((it) => isEquipped(char, it))) return { ok: false, reason: 'equipped' };
  if (char.stash.length + items.length > STASH_MAX) return { ok: false, reason: 'stashfull' };
  const c = structuredClone(char);
  c.inventory = c.inventory.filter((it) => !set.has(it.id));
  c.stash.push(...structuredClone(items));
  c.updatedAt = now;
  return { ok: true, char: c, count: items.length };
}

// Gudang → bag.
export function withdraw(char, ids, now) {
  const set = new Set(ids);
  const items = char.stash.filter((it) => set.has(it.id));
  if (!items.length) return { ok: false, reason: 'none' };
  if (char.inventory.length + items.length > INVENTORY_MAX) return { ok: false, reason: 'bag' };
  const c = structuredClone(char);
  c.stash = c.stash.filter((it) => !set.has(it.id));
  for (const it of structuredClone(items)) {
    while (c.inventory.some((x) => x.id === it.id)) it.id += 'x';
    c.inventory.push(it);
  }
  c.updatedAt = now;
  return { ok: true, char: c, count: items.length };
}
