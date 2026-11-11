import { describe, it, expect } from 'vitest';
import { CLASSES } from '../data/classes.js';
import { PASSIVES, UMUM, SP_RESPEC } from '../data/skilltree.js';
import {
  newJob, jobOf, spTotal, spSpent, spFree, levelOf, raise, respecSp, spRespecPrice, equip, wornIds, wornSkills,
  equippedUlt, setUlt, umumFx, passiveFx, treeStats, nodeOf,
} from './jobs.js';

const NOW = 1;
const charAt = (classId, level, gold = 0) => ({ classId, level, gold, jobs: { [classId]: newJob(classId) } });
const ok = (r) => { expect(r.ok, r.reason).toBe(true); return r.char; };

describe('skill tree data (spec §43.2–43.3)', () => {
  it('ids are unique per job across skills, ultimates, passives and Umum', () => {
    for (const id of ['warrior', 'archer', 'mage', 'assassin']) {
      const C = CLASSES[id], ids = [...C.skills.map((s) => s.id), ...(C.ults || [C.ult]).map((u) => u.id), ...PASSIVES[id].map((p) => p.id), ...UMUM.map((u) => u.id)];
      expect(new Set(ids).size, id).toBe(ids.length);
      expect(PASSIVES[id]).toHaveLength(3);
      for (const p of PASSIVES[id]) expect(p.max).toBe(3);
    }
    expect(UMUM).toHaveLength(8);
  });
});

describe('skill points', () => {
  it('2 SP per level from level 2: level 1 = 0, level 50 = 98', () => {
    expect(spTotal(1)).toBe(0); expect(spTotal(2)).toBe(2); expect(spTotal(50)).toBe(98);
  });
  it('a fresh job: the two starting skills at level 1 for free, worn on A1 / A2', () => {
    const c = charAt('mage', 1);
    expect(wornIds(c, 0)).toEqual(['nova', 'chain', null, null]);
    expect(levelOf(c, 'nova')).toBe(1);
    expect(spSpent(jobOf(c), 'mage')).toBe(0);
    expect(spFree(c)).toBe(0);
  });
  it('raising an active skill: levels 1–2 cost 1, 3–5 cost 2; locked, max and sp refusals', () => {
    let c = charAt('warrior', 20);                          // 38 SP
    c = ok(raise(c, 'spin', NOW)); expect(levelOf(c, 'spin')).toBe(2); expect(spFree(c)).toBe(37);
    c = ok(raise(c, 'spin', NOW)); expect(spFree(c)).toBe(35);   // level 3 costs 2
    c = ok(raise(c, 'spin', NOW)); c = ok(raise(c, 'spin', NOW));
    expect(raise(c, 'spin', NOW).reason).toBe('max');
    c = ok(raise(c, 'quake', NOW)); expect(spFree(c)).toBe(30);  // a non-starting skill pays for level 1
    expect(raise(charAt('warrior', 4), 'quake', NOW).reason).toBe('locked'); // opens at level 5
    expect(raise({ ...charAt('warrior', 2), jobs: { warrior: { ...newJob('warrior'), sp: { spin: 1, shout: 1, charge: 3 } } } }, 'spin', NOW).reason).toBe('sp');
  });
  it('passives cost 2 (max 3); ultimates cost 3 (max 3) and open at its unlock; Umum cost 1 (max 5)', () => {
    let c = charAt('archer', 50);
    c = ok(raise(c, 'calmbreath', NOW)); expect(spFree(c)).toBe(96);
    for (let i = 0; i < 2; i++) c = ok(raise(c, 'calmbreath', NOW));
    expect(raise(c, 'calmbreath', NOW).reason).toBe('max');
    const ult = CLASSES.archer.ult.id;
    c = ok(raise(c, ult, NOW)); expect(spFree(c)).toBe(89); // 98 − 3 × 2 − 3
    expect(raise(charAt('archer', CLASSES.archer.ult.unlock - 1), ult, NOW).reason).toBe('locked');
    c = ok(raise(c, 'might', NOW)); expect(spFree(c)).toBe(88);
  });
});

describe('wearing skills & the ultimate', () => {
  it('a skill needs level ≥ 1; wearing it elsewhere moves it; page A keeps one skill', () => {
    let c = charAt('mage', 10);
    expect(equip(c, 0, 2, 'meteor', NOW).reason).toBe('locked');
    c = ok(raise(c, 'meteor', NOW));
    c = ok(equip(c, 0, 2, 'meteor', NOW));
    c = ok(equip(c, 1, 0, 'meteor', NOW));
    expect(wornIds(c, 0)).toEqual(['nova', 'chain', null, null]);
    expect(wornIds(c, 1)[0]).toBe('meteor');
    c = ok(equip(c, 0, 1, null, NOW));
    expect(equip(c, 0, 0, null, NOW).reason).toBe('bad');           // the last one on A stays
    expect(equip(c, 1, 1, 'nova', NOW).reason).toBe('bad');          // moving it would empty A
    expect(wornSkills(c, 1)[0].id).toBe('meteor');
  });
  it('the ultimate must be learned, then picked', () => {
    let c = charAt('warrior', 30);
    const id = CLASSES.warrior.ult.id;
    expect(setUlt(c, id, NOW).reason).toBe('locked');
    c = ok(raise(c, id, NOW)); expect(equippedUlt(c)).toBe(null);
    c = ok(setUlt(c, id, NOW)); expect(equippedUlt(c).id).toBe(id);
  });
});

describe('atur ulang SP', () => {
  it('free the first time, then 80 + 15 × level; back to the starting build', () => {
    let c = charAt('assassin', 10, 1000);
    c = ok(raise(c, 'poison', NOW)); c = ok(equip(c, 0, 2, 'poison', NOW));
    c = ok(respecSp(c, NOW)); expect(c.gold).toBe(1000);
    expect(wornIds(c, 0)).toEqual(['shadow', 'fan', null, null]); expect(spFree(c)).toBe(18);
    c = ok(raise(c, 'poison', NOW));
    expect(spRespecPrice(c)).toBe(SP_RESPEC.base + SP_RESPEC.perLevel * 10);
    c = ok(respecSp(c, NOW)); expect(c.gold).toBe(1000 - 230);
    expect(respecSp(c, NOW).reason).toBe('none');
    expect(respecSp({ ...ok(raise(c, 'poison', NOW)), gold: 0 }, NOW).reason).toBe('gold');
  });
  it('only the current job changes', () => {
    let c = { ...charAt('mage', 10, 500), jobs: { mage: newJob('mage'), warrior: { ...newJob('warrior'), sp: { spin: 3, shout: 1, charge: 1 } } } };
    c = ok(raise(c, 'meteor', NOW)); c = ok(respecSp(c, NOW));
    expect(c.jobs.warrior.sp.spin).toBe(3);
  });
});

describe('effects', () => {
  it('Umum talents give the old talent effects; passives add up × level; Kaki Ringan is a stat', () => {
    let c = charAt('archer', 30);
    for (let i = 0; i < 3; i++) c = ok(raise(c, 'focus', NOW));
    for (let i = 0; i < 2; i++) c = ok(raise(c, 'sharpeye', NOW));
    c = ok(raise(c, 'lightfeet', NOW)); c = ok(raise(c, 'vigor', NOW));
    expect(umumFx(c).skillDmg).toBeCloseTo(0.24);
    expect(passiveFx(c).farCrit).toBe(6);
    const st = treeStats(c);
    expect(st.some((s) => s.pct.maxHp === 0.04)).toBe(true);
    expect(st.some((s) => s.pct.moveSpd === 0.04)).toBe(true);
    expect(nodeOf('archer', 'nope')).toBe(null);
  });
});
