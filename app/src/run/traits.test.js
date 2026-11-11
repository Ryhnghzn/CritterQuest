import { describe, it, expect } from 'vitest';
import { leveled } from './skilllevel.js';
import { initTrait, traitDealt, traitStep, traitBasicHit, traitHurt, traitCast, traitMods, traitLevel, traitFocusShot, traitCastExecute } from './traits.js';
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

  it('damage yang diberikan skill menahan penyusutan tanpa menambah Murka', () => {
    const r = mockRun();
    r.trait.v = 50;
    traitStep(r, 2.9, false, false);
    traitDealt(r);
    traitStep(r, 2.9, false, false);
    expect(r.trait.v).toBe(50);
  });

  it('Mengamuk memakai nilai puncak Murka', () => {
    const r = mockRun();
    r.trait.on = 3;
    const m = traitMods(r);
    expect([m.arcR, m.arcDeg, m.lifesteal]).toEqual([72, 160, 0.04]);
    expect(m.dmgTaken).toBeCloseTo(0.8);
  });

  it('Mengamuk menghapus efek lambat', () => {
    const r = mockRun();
    r.slowT = 2;
    r.trait.v = 99;
    traitBasicHit(r);
    expect(r.slowT).toBe(0);
  });

  it('traitCast netral untuk Warrior', () => {
    expect(traitCast(mockRun(), { id: 'spin' })).toBe(1);
  });
});

describe('kelas tanpa trait', () => {
  it('berperilaku seperti biasa', () => {
    const cls = 'traitless'; // every real class has a trait now: use a stand-in
    CLASSES[cls] = { attack: { r: 40, arc: 90 } };
    const r = mockRun(cls);
    traitBasicHit(r); traitHurt(r, 50); traitStep(r, 5, true, true);
    expect(r.trait.v).toBe(0);
    const a = CLASSES[cls].attack;
    expect(traitMods(r)).toEqual({ arcR: a.r, arcDeg: a.arc, lifesteal: 0, dmgTaken: 1, skillDmg: 0, locked: false, slow: 0, slowImmune: false });
    expect(traitCast(r, { id: 'x' })).toBe(1);
    expect(traitLevel(r)).toBe(0);
    delete CLASSES[cls];
  });
});

const skillOf = (cls, id) => CLASSES[cls].skills.find((k) => k.id === id);

describe('Panas (mage)', () => {
  it('Meteor (biaya 55) menambah 33', () => {
    const r = mockRun('mage');
    expect(traitCast(r, skillOf('mage', 'meteor'))).toBe(1);
    expect(r.trait.v).toBeCloseTo(33);
  });

  it('bonus damage skill naik bertahap sampai 80 lalu tetap', () => {
    const r = mockRun('mage');
    expect(traitMods(r).skillDmg).toBe(0);
    r.trait.v = 40;
    expect(traitMods(r).skillDmg).toBeCloseTo(0.15);
    r.trait.v = 90;
    expect(traitMods(r).skillDmg).toBeCloseTo(0.3);
  });

  it('mencapai 100 memicu Kepanasan: kunci 2,5 dtk, lambat 30%, Panas 0', () => {
    const r = mockRun('mage');
    r.trait.v = 80;
    traitCast(r, skillOf('mage', 'meteor'));
    expect(r.trait.v).toBe(0);
    expect(r.trait.lock).toBe(2.5);
    const m = traitMods(r);
    expect([m.locked, m.slow, m.skillDmg]).toEqual([true, 0.3, 0]);
    traitStep(r, 2, false, false);
    expect(traitMods(r).locked).toBe(true);
    traitStep(r, 0.6, false, false);
    expect(r.trait.lock).toBe(0);
    expect(traitMods(r).locked).toBe(false);
    expect(traitMods(r).slow).toBe(0);
    expect(r.banners).toEqual(['KEPANASAN!']);
  });

  it('menyusut 15 per detik', () => {
    const r = mockRun('mage');
    r.trait.v = 50;
    traitStep(r, 1, false, false);
    expect(r.trait.v).toBeCloseTo(35);
    traitStep(r, 10, false, false);
    expect(r.trait.v).toBe(0);
  });

  it('serangan dasar tidak menambah Panas', () => {
    const r = mockRun('mage');
    traitBasicHit(r);
    expect(r.trait.v).toBe(0);
  });
});

describe('Bidik (archer)', () => {
  it('mengisi 60/dtk saat diam sambil menyerang', () => {
    const r = mockRun('archer');
    traitStep(r, 1, false, true);
    expect(r.trait.v).toBe(60);
    traitStep(r, 1, false, false); // not attacking: holds
    expect(r.trait.v).toBe(60);
  });

  it('bergerak mengosongkan', () => {
    const r = mockRun('archer');
    r.trait.v = 70;
    traitStep(r, 0.1, true, true);
    expect(r.trait.v).toBe(0);
  });

  it('penuh menyalakan focus; traitFocusShot sekali lalu kosong', () => {
    const r = mockRun('archer');
    expect(traitFocusShot(r)).toBe(false);
    traitStep(r, 2, false, true);
    expect(r.trait.v).toBe(100);
    expect(r.trait.focus).toBe(true);
    expect(traitLevel(r)).toBe(1);
    expect(traitFocusShot(r)).toBe(true);
    expect(r.trait.v).toBe(0);
    expect(traitFocusShot(r)).toBe(false);
  });

  it('Lompatan Mundur L5 langsung memenuhi Bidik; di bawah L5 tidak (spec §43.4)', () => {
    const r = mockRun('archer');
    traitCast(r, skillOf('archer', 'leap'));
    expect(r.trait.v).toBe(0);
    expect(traitCast(r, leveled(skillOf('archer', 'leap'), 5))).toBe(1);
    expect(r.trait.v).toBe(100);
    expect(r.trait.focus).toBe(true);
    traitCast(r, skillOf('archer', 'rain'));
    expect(r.trait.v).toBe(100);
  });
});

describe('Kombo (assassin)', () => {
  it('3 tusukan = 1 titik, maksimal 5', () => {
    const r = mockRun('assassin');
    for (let i = 0; i < 9; i++) traitBasicHit(r);
    expect(r.trait.v).toBe(3);
    for (let i = 0; i < 30; i++) traitBasicHit(r);
    expect(r.trait.v).toBe(5);
  });

  it('4 detik tanpa menyerang menghapus titik', () => {
    const r = mockRun('assassin');
    for (let i = 0; i < 6; i++) traitBasicHit(r);
    traitStep(r, 3.9, false, false);
    expect(r.trait.v).toBe(2);
    traitStep(r, 0.2, false, false);
    expect(r.trait.v).toBe(0);
    expect(r.trait.hits).toBe(0);
  });

  it('menyerang menahan penghapusan', () => {
    const r = mockRun('assassin');
    for (let i = 0; i < 3; i++) traitBasicHit(r);
    traitStep(r, 3.5, false, true);
    traitDealt(r);
    traitStep(r, 3.5, false, true);
    expect(r.trait.v).toBe(1);
  });

  it('5 titik: skill x2,25, eksekusi 0,3, titik habis', () => {
    const r = mockRun('assassin');
    r.trait.v = 5;
    expect(traitCast(r, skillOf('assassin', 'fan'))).toBe(2.25);
    expect(r.trait.v).toBe(0);
    expect(traitCastExecute()).toBe(0.3);
  });

  it('2 titik: x1,5 tanpa eksekusi; 0 titik: x1', () => {
    const r = mockRun('assassin');
    r.trait.v = 2;
    expect(traitCast(r, skillOf('assassin', 'fan'))).toBe(1.5);
    expect(traitCastExecute()).toBe(0);
    expect(traitCast(r, skillOf('assassin', 'fan'))).toBe(1);
  });

  it('level = titik / 5', () => {
    const r = mockRun('assassin');
    r.trait.v = 3;
    expect(traitLevel(r)).toBeCloseTo(0.6);
  });
});
