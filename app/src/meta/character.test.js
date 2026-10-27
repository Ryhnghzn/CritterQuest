import { describe, it, expect } from 'vitest';
import {
  validateName, createCharacter, expToNext, addExp, finalStats, currentHp, usePotion, applyTrip,
  freePoints, allocate,
} from './character.js';

const NOW = 1761436800000;
const pots = (o = {}) => ({ red: 0, big: 0, shield: 0, wind: 0, rage: 0, ...o });
const make = (over = {}) => createCharacter(
  { slot: 0, name: 'Reyhan', look: { hair: 2, hairColor: 4 }, classId: 'warrior', ...over }, NOW,
);

describe('validateName', () => {
  it('memangkas spasi dan menerima 1–12 karakter', () => {
    expect(validateName('  Rey  ')).toBe('Rey');
    expect(validateName('A')).toBe('A');
    expect(validateName('x'.repeat(12))).toBe('x'.repeat(12));
  });
  it('menolak kosong, terlalu panjang, dan bukan string', () => {
    expect(validateName('   ')).toBeNull();
    expect(validateName('x'.repeat(13))).toBeNull();
    expect(validateName(42)).toBeNull();
  });
});

describe('createCharacter', () => {
  it('membuat slot versi terkini yang kosong progresnya', () => {
    const c = make();
    expect(c).toEqual({
      version: 4, slot: 0, createdAt: NOW, updatedAt: NOW,
      name: 'Reyhan', look: { hair: 2, hairColor: 4 }, classId: 'warrior',
      level: 1, exp: 0, gold: 0,
      hp: null, potions: pots(), belt: ['red', 'big', 'shield', 'rage'],
      upgrades: { hp: 0, atk: 0, magnet: 0 },
      attrs: { str: 0, vit: 0, agi: 0, dex: 0, luk: 0 },
      inventory: [],
      equipped: { weapon: null, helm: null, armor: null, boots: null, amulet: null, ring: null },
      records: { bestFloor: 0, clears: 0, trips: 0, kills: 0, bossKills: 0 },
    });
  });
  it('menolak masukan tidak sah', () => {
    expect(() => make({ name: '' })).toThrow();
    expect(() => make({ classId: 'ninja' })).toThrow();
    expect(() => make({ look: { hair: 5, hairColor: 0 } })).toThrow();
    expect(() => make({ slot: 3 })).toThrow();
  });
});

describe('EXP & level', () => {
  it('butuh 30 + 20 × level untuk naik', () => {
    expect(expToNext(1)).toBe(50);
    expect(expToNext(2)).toBe(70);
  });
  it('naik beberapa level sekaligus dan menyimpan sisa', () => {
    const { char, levelsGained } = addExp(make(), 130);
    expect(char.level).toBe(3);
    expect(char.exp).toBe(10);
    expect(levelsGained).toBe(2);
  });
  it('berhenti di level 50 tanpa menimbun EXP', () => {
    const { char } = addExp({ ...make(), level: 49 }, 1e6);
    expect(char.level).toBe(50);
    expect(char.exp).toBe(0);
  });
  it('tidak mengubah objek asal', () => {
    const c = make();
    addExp(c, 500);
    expect(c.level).toBe(1);
  });
});

describe('finalStats', () => {
  it('level 1 = dasar kelas + stat umum', () => {
    expect(finalStats(make())).toEqual({
      maxHp: 140, atk: 14, def: 2, atkSpd: 1, crit: 5, critDmg: 1.5, moveSpd: 105, cdr: 0, magnet: 70,
    });
  });
  it('menambah pertumbuhan × (level − 1)', () => {
    const s = finalStats({ ...make(), level: 11 });
    expect(s.maxHp).toBe(260);
    expect(s.atk).toBeCloseTo(28);
  });
});

describe('HP & potion', () => {
  it('HP null berarti penuh; nilai disimpan dibatasi HP maks', () => {
    expect(currentHp(make())).toBe(140);
    expect(currentHp({ ...make(), hp: 50 })).toBe(50);
    expect(currentHp({ ...make(), hp: 999 })).toBe(140);
  });

  it('potion memulihkan 40% HP maks, tidak melebihi maks', () => {
    const c = usePotion({ ...make(), hp: 20, potions: pots({ red: 2 }) }, 'red', NOW);
    expect(c.hp).toBe(76);
    expect(c.potions.red).toBe(1);
    expect(usePotion({ ...make(), hp: 130, potions: pots({ red: 1 }) }, 'red', NOW).hp).toBeNull();
    expect(usePotion({ ...make(), hp: 20, potions: pots({ big: 1 }) }, 'big', NOW).hp).toBe(132);
  });

  it('tanpa potion, HP penuh, atau ramuan buff di kota: tidak berubah', () => {
    const none = { ...make(), hp: 20 };
    expect(usePotion(none, 'red', NOW)).toBe(none);
    const full = { ...make(), potions: pots({ red: 3 }) };
    expect(usePotion(full, 'red', NOW)).toBe(full);
    const buff = { ...make(), hp: 20, potions: pots({ rage: 3 }) };
    expect(usePotion(buff, 'rage', NOW)).toBe(buff);
    expect(usePotion(buff, null, NOW)).toBe(buff);
  });
});

const trip = (over = {}) => ({
  exp: 0, gold: 0, kills: 0, bossKills: 0, floor: 0, cleared: false, died: false, hp: 100, potions: pots(), ...over,
});

describe('applyTrip', () => {
  it('pulang: semua hadiah dibawa, HP disimpan, rekor naik', () => {
    const before = { ...make(), gold: 5, records: { bestFloor: 2, clears: 0, trips: 4, kills: 10, bossKills: 0 } };
    const { char, levelsGained, goldLost } = applyTrip(before, trip({ exp: 55, gold: 40, kills: 30, bossKills: 1, floor: 3, hp: 77, potions: pots({ red: 2, wind: 1 }) }), NOW + 5);
    expect(char.level).toBe(2);
    expect(levelsGained).toBe(1);
    expect(char.gold).toBe(45);
    expect(goldLost).toBe(0);
    expect(char.hp).toBe(77);
    expect(char.potions).toEqual(pots({ red: 2, wind: 1 }));
    expect(char.records).toEqual({ bestFloor: 3, clears: 0, trips: 5, kills: 40, bossKills: 1 });
    expect(char.updatedAt).toBe(NOW + 5);
    expect(before.records.trips).toBe(4);
  });

  it('pulang dengan HP penuh disimpan sebagai null; tamat menambah clears', () => {
    const { char } = applyTrip(make(), trip({ hp: 140, floor: 5, cleared: true }), NOW);
    expect(char.hp).toBeNull();
    expect(char.records.clears).toBe(1);
  });

  it('mati: EXP tetap, koin perjalanan separuh, bangun dengan HP 10%', () => {
    const before = { ...make(), gold: 100 };
    const { char, goldLost } = applyTrip(before, trip({ exp: 20, gold: 41, died: true, hp: 0, floor: 2 }), NOW);
    expect(char.exp).toBe(20);
    expect(char.gold).toBe(120);
    expect(goldLost).toBe(21);
    expect(char.hp).toBe(14);
    expect(char.records.bestFloor).toBe(2);
  });

  it('rekor lantai terdalam tidak turun', () => {
    const before = { ...make(), records: { bestFloor: 4, clears: 1, trips: 9, kills: 0, bossKills: 0 } };
    expect(applyTrip(before, trip({ floor: 1 }), NOW).char.records.bestFloor).toBe(4);
  });
});

describe('poin stat', () => {
  const lv = (level, attrs = {}) => ({ ...make(), level, attrs: { ...make().attrs, ...attrs } });

  it('3 poin per level di atas 1, dikurangi yang terpakai', () => {
    expect(freePoints(make())).toBe(0);
    expect(freePoints(lv(5))).toBe(12);
    expect(freePoints(lv(5, { str: 4, luk: 1 }))).toBe(7);
  });

  it('membagi poin sebanyak yang tersedia', () => {
    const c = allocate(lv(3), { str: 2, vit: 4 }, NOW + 1);
    expect(c.attrs).toEqual({ str: 2, vit: 4, agi: 0, dex: 0, luk: 0 });
    expect(c.updatedAt).toBe(NOW + 1);
    expect(freePoints(c)).toBe(0);
  });

  it('menolak poin berlebih, atribut tak dikenal, dan nilai bukan bulat positif', () => {
    expect(allocate(lv(2), { str: 4 }, NOW)).toBeNull();
    expect(allocate(lv(2), { int: 1 }, NOW)).toBeNull();
    expect(allocate(lv(2), { str: -1 }, NOW)).toBeNull();
    expect(allocate(lv(2), { str: 1.5 }, NOW)).toBeNull();
  });

  it('atribut menambah stat akhir', () => {
    const base = finalStats(lv(4));
    const s = finalStats(lv(4, { str: 3, vit: 2, agi: 2, dex: 2, luk: 1 }));
    expect(s.atk).toBeCloseTo(base.atk + 3);
    expect(s.maxHp).toBeCloseTo(base.maxHp + 16);
    expect(s.def).toBeCloseTo(base.def + 0.5);
    expect(s.atkSpd).toBeCloseTo(base.atkSpd + 0.03);
    expect(s.moveSpd).toBeCloseTo(base.moveSpd + 1.6);
    expect(s.crit).toBeCloseTo(base.crit + 1);
    expect(s.cdr).toBeCloseTo(base.cdr + 0.8);
    expect(s.critDmg).toBeCloseTo(base.critDmg + 0.02);
    expect(s.magnet).toBeCloseTo(base.magnet + 2);
  });

  it('poin yang dipakai di dungeon ikut tersimpan bersama hasil perjalanan', () => {
    const trip = { exp: 130, gold: 0, kills: 0, bossKills: 0, floor: 1, cleared: false, died: true, hp: 1, potions: pots(), attrs: { agi: 6 } };
    const { char } = applyTrip(make(), trip, NOW);
    expect(char.level).toBe(3);
    expect(char.attrs.agi).toBe(6);
    expect(freePoints(char)).toBe(0);
  });
});

describe('gear dari perjalanan', () => {
  const gear = (id) => ({ id, slot: 'helm', classId: null, variant: 0, rarity: 1, itemLevel: 2, base: { maxHp: 15 }, bonuses: [{ stat: 'crit', value: 1 }], unique: null });
  const trip = (over) => ({ exp: 0, gold: 0, kills: 0, bossKills: 0, floor: 1, cleared: false, died: false, hp: 50, potions: pots(), ...over });

  it('pulang: semua gear masuk tas', () => {
    const r = applyTrip(make(), trip({ items: [gear('a'), gear('b')] }), NOW);
    expect(r.char.inventory.map((i) => i.id)).toEqual(['a', 'b']);
    expect(r.itemsLost).toEqual([]);
  });

  it('mati: tiap gear 50% hilang', () => {
    const rolls = [0.2, 0.7, 0.49, 0.5];
    const r = applyTrip(make(), trip({ died: true, items: ['a', 'b', 'c', 'd'].map(gear) }), NOW, () => rolls.shift());
    expect(r.itemsKept.map((i) => i.id)).toEqual(['a', 'c']);
    expect(r.itemsLost.map((i) => i.id)).toEqual(['b', 'd']);
  });

  it('tas penuh: sisanya ditinggal; id ganda dibuat unik', () => {
    const full = { ...make(), inventory: Array.from({ length: 59 }, (_, i) => gear(`g${i}`)) };
    const r = applyTrip(full, trip({ items: [gear('g1'), gear('z')] }), NOW);
    expect(r.char.inventory).toHaveLength(60);
    expect(r.itemsKept[0].id).toBe('g1x');
    expect(r.itemsLeft.map((i) => i.id)).toEqual(['z']);
  });
});
