import { describe, it, expect } from 'vitest';
import { innPrice, innRest, buyPotion } from './shop.js';
import { createCharacter } from './character.js';

const NOW = 1761436800000;
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
  it('beli: uang berkurang 25, potion bertambah', () => {
    const r = buyPotion(make({ gold: 60, potions: 1 }), NOW);
    expect(r.ok).toBe(true);
    expect(r.char.gold).toBe(35);
    expect(r.char.potions).toBe(2);
  });

  it('menolak bila uang kurang atau sudah membawa 5', () => {
    expect(buyPotion(make({ gold: 24 }), NOW)).toEqual({ ok: false, reason: 'gold' });
    expect(buyPotion(make({ gold: 999, potions: 5 }), NOW)).toEqual({ ok: false, reason: 'full' });
  });
});
