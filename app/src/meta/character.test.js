import { describe, it, expect } from 'vitest';
import {
  validateName, createCharacter, expToNext, addExp, finalStats, applyRunResult,
} from './character.js';

const NOW = 1761436800000;
const make = (over = {}) => createCharacter(
  { slot: 0, name: 'Reyhan', look: { hair: 2, hairColor: 4 }, classId: 'warrior', ...over }, NOW,
);
const run = (over = {}) => ({ time: 75.6, kills: 40, exp: 0, gold: 0, items: [], bossKills: 0, ...over });

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
  it('membuat slot versi 1 yang kosong progresnya', () => {
    const c = make();
    expect(c).toEqual({
      version: 1, slot: 0, createdAt: NOW, updatedAt: NOW,
      name: 'Reyhan', look: { hair: 2, hairColor: 4 }, classId: 'warrior',
      level: 1, exp: 0, gold: 0,
      upgrades: { hp: 0, atk: 0, magnet: 0, potion: 0 },
      inventory: [],
      equipped: { weapon: null, helm: null, armor: null, ring: null },
      records: { bestTime: 0, runs: 0, kills: 0, bossKills: 0 },
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

describe('applyRunResult', () => {
  it('menambah EXP, uang, dan rekor', () => {
    const before = { ...make(), records: { bestTime: 60, runs: 2, kills: 10, bossKills: 0 } };
    const { char, levelsGained } = applyRunResult(before, run({ exp: 55, gold: 7, bossKills: 1 }), NOW + 5);
    expect(char.level).toBe(2);
    expect(char.exp).toBe(5);
    expect(levelsGained).toBe(1);
    expect(char.gold).toBe(7);
    expect(char.records).toEqual({ bestTime: 75, runs: 3, kills: 50, bossKills: 1 });
    expect(char.updatedAt).toBe(NOW + 5);
    expect(before.records.runs).toBe(2);
  });
  it('rekor waktu tidak turun', () => {
    const before = { ...make(), records: { bestTime: 300, runs: 0, kills: 0, bossKills: 0 } };
    expect(applyRunResult(before, run(), NOW).char.records.bestTime).toBe(300);
  });
});
