import { describe, it, expect } from 'vitest';
import { innPrice, innRest, buyPotion, setBelt, chestPrice, buyChest, sellItems, junkIds } from './shop.js';
import { equip } from './gear.js';
import { createCharacter } from './character.js';

const NOW = 1761436800000;
const pots = (o = {}) => ({ red: 0, big: 0, shield: 0, wind: 0, rage: 0, ...o });
const make = (over = {}) => ({
  ...createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, NOW),
  ...over,
});

describe('Penginapan', () => {
  it('harga = 10 + 2 × level', () => {
    expect(innPrice(make())).toBe(12);
    expect(innPrice(make({ level: 10 }))).toBe(30);
  });

  it('tidur: bayar, HP penuh (null)', () => {
    const r = innRest(make({ hp: 20, gold: 50 }), NOW + 1);
    expect(r.ok).toBe(true);
    expect(r.char.hp).toBeNull();
    expect(r.char.gold).toBe(38);
    expect(r.char.updatedAt).toBe(NOW + 1);
  });

  it('menolak bila HP sudah penuh atau uang kurang, tanpa mengubah data', () => {
    const full = make({ gold: 50 });
    expect(innRest(full, NOW)).toEqual({ ok: false, reason: 'full' });
    const poor = make({ hp: 20, gold: 11 });
    expect(innRest(poor, NOW)).toEqual({ ok: false, reason: 'gold' });
    expect(poor.gold).toBe(11);
  });
});

describe('Toko Ramuan', () => {
  it('beli: uang berkurang sesuai harga jenisnya, stok jenis itu bertambah', () => {
    const r = buyPotion(make({ gold: 60, potions: pots({ red: 1 }) }), 'red', NOW);
    expect(r.ok).toBe(true);
    expect(r.char.gold).toBe(35);
    expect(r.char.potions).toEqual(pots({ red: 2 }));
    expect(buyPotion(make({ gold: 60 }), 'big', NOW).char.gold).toBe(0);
  });

  it('menolak bila uang kurang atau sudah membawa 5 dari jenis itu', () => {
    expect(buyPotion(make({ gold: 24 }), 'red', NOW)).toEqual({ ok: false, reason: 'gold' });
    expect(buyPotion(make({ gold: 999, potions: pots({ shield: 5 }) }), 'shield', NOW)).toEqual({ ok: false, reason: 'full' });
    expect(buyPotion(make({ gold: 999, potions: pots({ shield: 5 }) }), 'wind', NOW).ok).toBe(true);
  });

  it('sabuk: pasang jenis ke slot; jenis yang sama pindah dari slot lama', () => {
    const r = setBelt(make(), 0, 'wind', NOW);
    expect(r.char.belt).toEqual(['wind', 'big', 'shield', 'rage']);
    expect(setBelt(make(), 3, 'red', NOW).char.belt).toEqual([null, 'big', 'shield', 'red']);
    expect(setBelt(make(), 1, null, NOW).char.belt).toEqual(['red', null, 'shield', 'rage']);
    expect(setBelt(make(), 4, 'red', NOW).ok).toBe(false);
    expect(setBelt(make(), 0, 'teh', NOW).ok).toBe(false);
  });
});

describe('Pandai Besi', () => {
  const gear = (id, rarity, itemLevel = 4) => ({ id, slot: 'helm', classId: null, variant: 0, rarity, itemLevel, base: { maxHp: 15 }, bonuses: [], unique: null });

  it('harga peti = dasar + per level × level karakter', () => {
    expect(chestPrice(make({ level: 1 }), 'chest')).toBe(40);
    expect(chestPrice(make({ level: 10 }), 'grand')).toBe(550);
  });

  it('beli peti: koin berkurang, 1 item selevel karakter masuk tas', () => {
    const r = buyChest(make({ gold: 1000, level: 7 }), 'grand', NOW, () => 0.42);
    expect(r.ok).toBe(true);
    expect(r.char.gold).toBe(1000 - chestPrice(make({ level: 7 }), 'grand'));
    expect(r.char.inventory).toHaveLength(1);
    expect(r.item.itemLevel).toBe(7);
    expect(r.item.rarity).toBeGreaterThanOrEqual(2); // Peti Agung: Langka ke atas
  });

  it('peti ditolak bila koin kurang atau tas penuh', () => {
    expect(buyChest(make({ gold: 10 }), 'chest', NOW).reason).toBe('gold');
    const full = make({ gold: 9999, inventory: Array.from({ length: 60 }, (_, i) => gear(`g${i}`, 0)) });
    expect(buyChest(full, 'chest', NOW).reason).toBe('bag');
  });

  it('jual: harga 5 × level item × (1 + rarity); yang terpasang tidak bisa dijual', () => {
    const c = make({ inventory: [gear('a', 0, 4), gear('b', 2, 10), gear('c', 1, 3)] });
    const r = sellItems(c, ['a', 'b'], NOW);
    expect(r.gold).toBe(20 + 150);
    expect(r.char.gold).toBe(170);
    expect(r.char.inventory.map((i) => i.id)).toEqual(['c']);
    const worn = equip(c, 'c', NOW).char;
    expect(sellItems(worn, ['c'], NOW).reason).toBe('equipped');
    expect(sellItems(c, ['zzz'], NOW).reason).toBe('none');
  });

  it('jual semua sampah: hanya rarity rendah yang tidak terpasang', () => {
    const worn = equip(make({ inventory: [gear('a', 0), gear('b', 1), gear('c', 2), gear('d', 0)] }), 'd', NOW).char;
    expect(junkIds(worn, 1)).toEqual(['a', 'b']);
  });
});
