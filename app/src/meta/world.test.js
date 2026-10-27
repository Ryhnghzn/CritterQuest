import { describe, it, expect } from 'vitest';
import { fogSize, encodeFog, decodeFog, revealFog, fogAt, explored, isFogValid, applyField, fieldDeath, visitTown } from './world.js';
import { createCharacter } from './character.js';
import { validateSlot } from './schema.js';
import { regionById } from '../data/world.js';

const forest = regionById('forest');
const make = () => createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'archer' }, 1);
const pots = { red: 1, big: 0, shield: 0, wind: 0, rage: 0 };

describe('kabut', () => {
  it('base64 bolak-balik', () => {
    const { bytes } = fogSize(forest);
    const a = new Uint8Array(bytes).map((_, i) => (i * 37) & 255);
    const s = encodeFog(a);
    expect(isFogValid(s, forest)).toBe(true);
    expect([...decodeFog(s, forest)]).toEqual([...a]);
    expect([...decodeFog('', forest)].every((b) => b === 0)).toBe(true);
    expect([...decodeFog('!!rusak', forest)].every((b) => b === 0)).toBe(true);
    expect(isFogValid('x'.repeat(999), forest)).toBe(false);
  });
  it('membuka sel dalam radius saja', () => {
    const { bytes, cols } = fogSize(forest);
    const f = new Uint8Array(bytes);
    expect(revealFog(f, forest, 1000, 1000, 300)).toBe(true);
    expect(revealFog(f, forest, 1000, 1000, 300)).toBe(false);
    expect(fogAt(f, cols, 10, 10)).toBe(1);
    expect(fogAt(f, cols, 14, 10)).toBe(0);
    expect(explored(f, forest)).toBeGreaterThan(0);
    expect(explored(f, forest)).toBeLessThan(0.05);
  });
});

describe('simpan dari wilayah', () => {
  it('EXP, koin, gear, bahan, bestiari, tugas & kabut masuk save', () => {
    const c = make();
    const item = { id: 'a', slot: 'helm', classId: null, variant: 0, rarity: 1, itemLevel: 3, base: { maxHp: 9 }, bonuses: [], unique: null, plus: 0, sockets: [] };
    const fog = encodeFog(new Uint8Array(fogSize(forest).bytes).fill(1));
    const r = applyField(c, { region: 'forest', fog, exp: 60, gold: 25, kills: 30, killsBy: { slink: 30 }, elites: 1, items: [item], mats: { dust: 2 }, gems: [{ gem: 'ruby', tier: 1 }], hp: 50, potions: pots }, 9);
    expect(r.char.level).toBe(2);
    expect(r.char.gold).toBe(25);
    expect(r.char.inventory).toHaveLength(1);
    expect(r.char.mats.dust).toBe(2);
    expect(r.char.gems.ruby[0]).toBe(1);
    expect(r.char.records.bestiary.slink).toBe(30);
    expect(r.char.records.kills).toBe(30);
    expect(r.char.bounties[0].have).toBe(25);
    expect(r.bountiesDone).toBe(1);
    expect(r.char.regions.forest.fog).toBe(fog);
    expect(r.char.records.trips).toBe(0);
    expect(validateSlot(r.char)).toEqual([]);
  });
  it('tumbang: −10% koin, bangun dengan sedikit HP', () => {
    const c = { ...make(), gold: 255 };
    const r = fieldDeath(c, 3);
    expect(r.goldLost).toBe(25);
    expect(r.char.gold).toBe(230);
    expect(r.char.hp).toBeGreaterThan(0);
    expect(validateSlot(r.char)).toEqual([]);
  });
  it('mengunjungi kota mencatat lokasi', () => {
    const c = visitTown(make(), 'rimba', 4);
    expect(c.location).toBe('rimba');
    expect(c.towns).toEqual(['home', 'rimba']);
    expect(visitTown(c, 'rimba', 5)).toBe(c);
  });
});
