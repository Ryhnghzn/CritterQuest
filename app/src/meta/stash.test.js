import { describe, it, expect } from 'vitest';
import { deposit, withdraw } from './stash.js';
import { createCharacter } from './character.js';
import { validateSlot } from './schema.js';
import { makeItem } from './itemgen.js';
import { equip } from './gear.js';
import { INVENTORY_MAX, STASH_MAX } from '../data/balance.js';

let n = 0;
const rng = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
const item = (slot = 'helm') => makeItem({ slot, classId: 'warrior', rarity: 2, itemLevel: 5 }, rng);
const make = (k = 3) => {
  const c = createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, 1);
  c.inventory = Array.from({ length: k }, () => item());
  return c;
};

describe('Gudang', () => {
  it('menitip dan mengambil barang', () => {
    const c = make();
    const ids = c.inventory.slice(0, 2).map((it) => it.id);
    const a = deposit(c, ids, 2);
    expect(a.ok).toBe(true);
    expect(a.char.inventory).toHaveLength(1);
    expect(a.char.stash.map((it) => it.id)).toEqual(ids);
    expect(validateSlot(a.char)).toEqual([]);
    const b = withdraw(a.char, [ids[0]], 3);
    expect(b.char.inventory).toHaveLength(2);
    expect(b.char.stash).toHaveLength(1);
    expect(validateSlot(b.char)).toEqual([]);
  });

  it('gear yang dipakai tidak bisa dititip', () => {
    const c = make();
    const worn = equip(c, c.inventory[0].id, 1);
    expect(deposit(worn.char ?? worn, [c.inventory[0].id], 2)).toEqual({ ok: false, reason: 'equipped' });
  });

  it('menolak bila Gudang atau tas penuh, atau tidak ada yang dipilih', () => {
    const c = make(1);
    c.stash = Array.from({ length: STASH_MAX }, () => item());
    expect(deposit(c, [c.inventory[0].id], 1)).toEqual({ ok: false, reason: 'stashfull' });
    const d = make(INVENTORY_MAX);
    d.stash = [item()];
    expect(withdraw(d, [d.stash[0].id], 1)).toEqual({ ok: false, reason: 'bag' });
    expect(deposit(make(), ['nope'], 1)).toEqual({ ok: false, reason: 'none' });
  });
});
