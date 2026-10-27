import { describe, it, expect } from 'vitest';
import {
  validateName, createCharacter, expToNext, addExp, finalStats, currentHp, usePotion, applyTrip,
} from './character.js';

const NOW = 1761436800000;
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
      version: 2, slot: 0, createdAt: NOW, updatedAt: NOW,
      name: 'Reyhan', look: { hair: 2, hairColor: 4 }, classId: 'warrior',
      level: 1, exp: 0, gold: 0,
      hp: null, potions: 0,
      upgrades: { hp: 0, atk: 0, magnet: 0 },
      inventory: [],
      equipped: { weapon: null, helm: null, armor: null, ring: null },
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
    const c = usePotion({ ...make(), hp: 20, potions: 2 }, NOW);
    expect(c.hp).toBe(76);
    expect(c.potions).toBe(1);
    expect(usePotion({ ...make(), hp: 130, potions: 1 }, NOW).hp).toBeNull();
  });

  it('tanpa potion atau HP penuh: tidak berubah', () => {
    const none = { ...make(), hp: 20, potions: 0 };
    expect(usePotion(none, NOW)).toBe(none);
    const full = { ...make(), potions: 3 };
    expect(usePotion(full, NOW)).toBe(full);
  });
});

const trip = (over = {}) => ({
  exp: 0, gold: 0, kills: 0, bossKills: 0, floor: 0, cleared: false, died: false, hp: 100, potions: 0, ...over,
});

describe('applyTrip', () => {
  it('pulang: semua hadiah dibawa, HP disimpan, rekor naik', () => {
    const before = { ...make(), gold: 5, records: { bestFloor: 2, clears: 0, trips: 4, kills: 10, bossKills: 0 } };
    const { char, levelsGained, goldLost } = applyTrip(before, trip({ exp: 55, gold: 40, kills: 30, bossKills: 1, floor: 3, hp: 77, potions: 2 }), NOW + 5);
    expect(char.level).toBe(2);
    expect(levelsGained).toBe(1);
    expect(char.gold).toBe(45);
    expect(goldLost).toBe(0);
    expect(char.hp).toBe(77);
    expect(char.potions).toBe(2);
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
