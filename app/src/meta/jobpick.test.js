// The Pengembara, picking and changing job (spec §43.1).
import { describe, it, expect } from 'vitest';
import { createCharacter, addExp, expToNext } from './character.js';
import { validateSlot } from './schema.js';
import { pickJob, changeJob, jobChangePrice, raise, wornIds, levelOf } from './jobs.js';
import { dropItem } from './itemgen.js';
import { NOVICE_LEVEL_CAP } from '../data/balance.js';

const novice = (level = 1, gold = 0) => {
  const c = createCharacter({ slot: 0, name: 'Baru', look: { hair: 0, hairColor: 0 }, classId: 'novice' }, 1);
  return { ...c, level, gold };
};
const ok = (r) => { expect(r.ok, r.reason).toBe(true); return r.char; };
let seed = 7; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

describe('Pengembara', () => {
  it('a new character is a valid Pengembara wearing its two fixed skills, with no job build', () => {
    const c = novice();
    expect(validateSlot(c)).toEqual([]);
    expect(c.jobs).toEqual({});
    expect(wornIds(c, 0)).toEqual(['sweep', 'tumble', null, null]);
    expect(raise(c, 'sweep', 1).reason).toBe('locked');
  });
  it('stops at level 10 until it picks a job', () => {
    let c = novice(NOVICE_LEVEL_CAP - 1);
    c = addExp(c, expToNext(NOVICE_LEVEL_CAP - 1) * 5).char;
    expect(c.level).toBe(NOVICE_LEVEL_CAP); expect(c.exp).toBe(0);
  });
  it('finds no weapons', () => {
    for (let i = 0; i < 300; i++) expect(dropItem({ source: 'boss', classId: 'novice', charLevel: 20, floor: 5, luk: 50 }, rng).slot).not.toBe('weapon');
  });
});

describe('picking the first job', () => {
  it('from level 5, free: a starting weapon of level = character level, the build, SP waiting', () => {
    expect(pickJob(novice(4), 'mage', 1).reason).toBe('locked');
    const c = ok(pickJob(novice(8), 'mage', 1, rng));
    expect(c.classId).toBe('mage'); expect(c.gold).toBe(0);
    const w = c.inventory.find((it) => it.id === c.equipped.weapon);
    expect(w).toMatchObject({ slot: 'weapon', classId: 'mage', rarity: 0, itemLevel: 8 });
    expect(wornIds(c, 0)).toEqual(['nova', 'chain', null, null]);
    expect(validateSlot(c)).toEqual([]);
    expect(ok(raise(c, 'meteor', 1)).jobs.mage.sp.meteor).toBe(1);   // the SP gathered as a Pengembara are there
    expect(pickJob(c, 'warrior', 1).reason).toBe('same');           // only once
  });
});

describe('changing job', () => {
  it('price (200 + 30 × level) × 1.5^changes: level 20 → 800, 1200, 1800', () => {
    const base = { level: 20, jobChanges: 0 };
    expect(jobChangePrice(base)).toBe(800);
    expect(jobChangePrice({ ...base, jobChanges: 1 })).toBe(1200);
    expect(jobChangePrice({ ...base, jobChanges: 2 })).toBe(1800);
  });
  it('keeps each job build, refunds attributes, swaps the weapon; refusals', () => {
    let c = ok(pickJob(novice(20, 5000), 'warrior', 1, rng));
    c = ok(raise(c, 'quake', 1));
    c = { ...c, attrs: { ...c.attrs, str: 5 } };
    expect(changeJob(c, 'warrior', 1).reason).toBe('same');
    expect(changeJob({ ...c, gold: 10 }, 'archer', 1).reason).toBe('gold');
    c = ok(changeJob(c, 'archer', 1, rng));
    expect(c.classId).toBe('archer'); expect(c.gold).toBe(5000 - 800); expect(c.jobChanges).toBe(1);
    expect(c.attrs.str).toBe(0);
    expect(c.inventory.find((it) => it.id === c.equipped.weapon).classId).toBe('archer');
    expect(validateSlot(c)).toEqual([]);
    c = ok(changeJob(c, 'warrior', 1, rng));                        // back: the old build and weapon
    expect(levelOf(c, 'quake')).toBe(1);
    expect(c.inventory.find((it) => it.id === c.equipped.weapon).classId).toBe('warrior');
    expect(c.inventory.filter((it) => it.slot === 'weapon' && it.classId === 'warrior')).toHaveLength(1); // no second starting weapon
    expect(changeJob(novice(20, 9999), 'mage', 1).reason).toBe('locked');
  });
});
