import { describe, it, expect } from 'vitest';
import { initTrait, traitStep, traitBasicHit, traitHurt, traitCast, traitMods, traitLevel } from './traits.js';
import { CLASSES } from '../data/classes.js';

function mockRun(classId = 'warrior') {
  const run = {
    classId, stats: { maxHp: 200 }, trait: null, banners: [], buffed: 0,
    showBanner(text) { this.banners.push(text); },
    applyBuffs() { this.buffed++; },
  };
  initTrait(run);
  return run;
}

describe('Murka (warrior)', () => {
  it('initTrait menyiapkan keadaan awal', () => {
    expect(mockRun().trait).toEqual({ v: 0, idle: 0, on: 0, lock: 0, hits: 0, focus: false });
  });

  it('serangan dasar mengisi 3 per musuh', () => {
    const r = mockRun();
    for (let i = 0; i < 10; i++) traitBasicHit(r);
    expect(r.trait.v).toBe(30);
  });

  it('terkena damage mengisi 1,5 per 1% HP maks', () => {
    const r = mockRun();
    traitHurt(r, 20); // 10% of 200
    expect(r.trait.v).toBeCloseTo(15);
  });

  it('menyusut 12/detik setelah 3 detik tanpa bertarung', () => {
    const r = mockRun();
    r.trait.v = 50;
    traitStep(r, 3, false, false);
    expect(r.trait.v).toBe(50);
    traitStep(r, 1, false, false);
    expect(r.trait.v).toBeCloseTo(38);
  });

  it('bertarung mereset jeda menyusut', () => {
    const r = mockRun();
    r.trait.v = 50;
    traitStep(r, 2.9, false, false);
    traitBasicHit(r);
    expect(r.trait.idle).toBe(0);
    traitStep(r, 2.9, false, false);
    expect(r.trait.v).toBe(53);
    r.trait.idle = 0;
    traitHurt(r, 2);
    expect(r.trait.idle).toBe(0);
  });

  it('Murka tidak turun di bawah 0', () => {
    const r = mockRun();
    r.trait.v = 5;
    traitStep(r, 10, false, false);
    expect(r.trait.v).toBe(0);
  });

  it('jangkauan, sudut, sedot HP, dan damage diterima naik bertahap', () => {
    const r = mockRun();
    const m0 = traitMods(r);
    expect([m0.arcR, m0.arcDeg, m0.lifesteal, m0.dmgTaken]).toEqual([46, 100, 0, 1]);
    r.trait.v = 50;
    const m = traitMods(r);
    expect(m.arcR).toBe(59);
    expect(m.arcDeg).toBe(130);
    expect(m.lifesteal).toBeCloseTo(0.02);
    expect(m.dmgTaken).toBeCloseTo(0.9);
    expect(traitLevel(r)).toBeCloseTo(0.5);
  });

  it('traitMods memakai ulang objek yang sama', () => {
    const r = mockRun();
    expect(traitMods(r)).toBe(traitMods(r));
  });

  it('Murka 100 memicu Mengamuk 6 detik dan mengosongkan bar', () => {
    const r = mockRun();
    r.trait.v = 98;
    traitBasicHit(r);
    expect(r.trait.on).toBe(6);
    expect(r.trait.v).toBe(0);
    expect(r.banners).toEqual(['MENGAMUK!']);
    expect(r.buffed).toBe(1);
    expect(traitMods(r).slowImmune).toBe(true);
    expect(traitLevel(r)).toBeCloseTo(1);
  });

  it('selama Mengamuk Murka tidak mengisi', () => {
    const r = mockRun();
    r.trait.on = 6;
    traitBasicHit(r);
    traitHurt(r, 50);
    expect(r.trait.v).toBe(0);
  });

  it('Mengamuk berakhir dan menghitung mundur', () => {
    const r = mockRun();
    r.trait.on = 1;
    r.buffed = 0;
    traitStep(r, 0.5, false, false);
    expect(r.trait.on).toBeCloseTo(0.5);
    traitStep(r, 0.6, false, false);
    expect(r.trait.on).toBe(0);
    expect(r.buffed).toBe(1);
    expect(traitMods(r).slowImmune).toBe(false);
  });

  it('traitCast netral untuk Warrior', () => {
    expect(traitCast(mockRun(), { id: 'spin' })).toBe(1);
  });
});

describe('kelas tanpa trait', () => {
  it('berperilaku seperti biasa', () => {
    const cls = Object.keys(CLASSES).find((id) => !CLASSES[id].trait);
    const r = mockRun(cls);
    traitBasicHit(r); traitHurt(r, 50); traitStep(r, 5, true, true);
    expect(r.trait.v).toBe(0);
    const a = CLASSES[cls].attack;
    expect(traitMods(r)).toEqual({ arcR: a.r, arcDeg: a.arc, lifesteal: 0, dmgTaken: 1, skillDmg: 0, locked: false, slow: 0, slowImmune: false });
    expect(traitCast(r, { id: 'x' })).toBe(1);
    expect(traitLevel(r)).toBe(0);
  });
});
