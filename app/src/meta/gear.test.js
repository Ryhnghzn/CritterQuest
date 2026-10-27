import { describe, it, expect } from 'vitest';
import { equip, unequip, discard, compare, gearEffects, dollGear, canEquip } from './gear.js';
import { createCharacter, finalStats, currentHp } from './character.js';
import { validateSlot } from './schema.js';

const NOW = 1761436800000;
const item = (id, over) => ({ id, slot: 'helm', classId: null, variant: 2, rarity: 2, itemLevel: 10, base: { maxHp: 30 }, bonuses: [{ stat: 'atk', value: 3 }], unique: null, ...over });
const make = (inventory = []) => ({
  ...createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, NOW),
  inventory,
});

describe('pasang & lepas', () => {
  it('memasang menambah stat item ke stat akhir', () => {
    const c = make([item('h1')]);
    const base = finalStats(c);
    const r = equip(c, 'h1', NOW + 1);
    expect(r.ok).toBe(true);
    expect(r.char.equipped.helm).toBe('h1');
    expect(finalStats(r.char).maxHp).toBe(base.maxHp + 30);
    expect(finalStats(r.char).atk).toBeCloseTo(base.atk + 3);
    expect(validateSlot(r.char)).toEqual([]);
  });

  it('memasang item lain di slot yang sama menggantinya', () => {
    const c = equip(make([item('h1'), item('h2', { base: { maxHp: 50 } })]), 'h1', NOW).char;
    const r = equip(c, 'h2', NOW);
    expect(r.char.equipped.helm).toBe('h2');
    expect(finalStats(r.char).maxHp).toBe(finalStats(make()).maxHp + 50);
  });

  it('senjata kelas lain tidak bisa dipasang', () => {
    const bow = item('w1', { slot: 'weapon', classId: 'archer', base: { atk: 9 } });
    expect(canEquip(make([bow]), bow)).toBe(false);
    expect(equip(make([bow]), 'w1', NOW)).toEqual({ ok: false, reason: 'class' });
    expect(equip(make(), 'nope', NOW)).toEqual({ ok: false, reason: 'missing' });
  });

  it('melepas mengembalikan stat; HP tidak dipulihkan, hanya dibatasi', () => {
    let c = equip(make([item('h1')]), 'h1', NOW).char;
    c = { ...c, hp: 160 };
    const r = unequip(c, 'helm', NOW);
    expect(r.char.equipped.helm).toBeNull();
    expect(currentHp(r.char)).toBe(140);
    const hurt = equip({ ...make([item('h1')]), hp: 50 }, 'h1', NOW).char;
    expect(currentHp(hurt)).toBe(50);
    expect(unequip(make(), 'helm', NOW).ok).toBe(false);
  });

  it('membuang item menghapusnya dari tas (dan melepasnya)', () => {
    const c = equip(make([item('h1'), item('h2')]), 'h1', NOW).char;
    const r = discard(c, 'h1', NOW);
    expect(r.char.inventory.map((x) => x.id)).toEqual(['h2']);
    expect(r.char.equipped.helm).toBeNull();
    expect(validateSlot(r.char)).toEqual([]);
  });
});

describe('perbandingan & efek', () => {
  it('perbandingan: naik/turun bila item ini dipakai', () => {
    const c = equip(make([item('h1'), item('h2', { base: { maxHp: 50 }, bonuses: [] })]), 'h1', NOW).char;
    expect(compare(c, 'h2')).toEqual({ maxHp: 20, atk: -3 });
    expect(compare(c, 'h1')).toEqual({ maxHp: 30, atk: 3 }); // yang sedang dipakai: sumbangannya
  });

  it('efek item unik yang terpasang; yang terkuat menang', () => {
    const a = item('r1', { slot: 'ring', rarity: 4, unique: 'amarah' });
    const b = item('h1', { rarity: 4, unique: 'tanduksetan' });
    let c = equip(make([a, b]), 'r1', NOW).char;
    c = equip(c, 'h1', NOW).char;
    expect(gearEffects(c)).toEqual({ frenzy: 0.3 });
    expect(gearEffects(make([a]))).toEqual({});
  });

  it('paper doll memakai tingkat & rarity gear yang terlihat', () => {
    const c = equip(make([item('h1', { variant: 4, rarity: 3 })]), 'h1', NOW).char;
    expect(dollGear(c)).toEqual({ helm: { tier: 4, rarity: 3 } });
  });
});
