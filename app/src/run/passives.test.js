// Job passives in a fight (spec §43.3): each read where it acts, from the run's effects.
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { traitStep, traitBasicHit, traitMods } from './traits.js';
import { skillCost } from './skills.js';
import { passiveCrit, poisonFoe, poisonStep } from './passives.js';
import { PASSIVE_RULES } from '../data/skilltree.js';
import { finalStats, createCharacter } from '../meta/character.js';
import { raise } from '../meta/jobs.js';

const game = (classId, effects = {}) => {
  const g = new Game();
  g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, maxHp: 1000 }, effects, level: 30 });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99;
  return g;
};

describe('Warrior', () => {
  it('Darah Panas: Murka fills faster', () => {
    const a = game('warrior'), b = game('warrior', { rageGain: 0.45 });
    traitBasicHit(a); traitBasicHit(b);
    expect(b.trait.v).toBeCloseTo(a.trait.v * 1.45);
  });
  it('Kulit Baja: less damage taken only above half Murka', () => {
    const g = game('warrior', { rageArmor: 0.12 });
    const low = traitMods(g).dmgTaken;
    g.trait.v = 60;
    expect(traitMods(g).dmgTaken).toBeLessThan(low * 0.9);
  });
  it('Tebasan Lebar: the basic slash is wider', () => {
    expect(traitMods(game('warrior', { arcWide: 0.24 })).arcDeg).toBeCloseTo(traitMods(game('warrior')).arcDeg * 1.24);
  });
});

describe('Archer', () => {
  it('Napas Tenang: Bidik fills faster while standing and shooting', () => {
    const a = game('archer'), b = game('archer', { focusGain: 0.3 });
    traitStep(a, 0.2, false, true); traitStep(b, 0.2, false, true);
    expect(b.trait.v).toBeCloseTo(a.trait.v * 1.3);
  });
  it('Mata Tajam: extra crit only against far enemies', () => {
    const g = game('archer', { farCrit: 9 });
    expect(passiveCrit(g, { x: g.px + 100, y: g.py })).toBe(0);
    expect(passiveCrit(g, { x: g.px + PASSIVE_RULES.farCrit + 10, y: g.py })).toBe(9);
  });
  it('Kaki Ringan: move speed through finalStats', () => {
    let c = createCharacter({ slot: 0, name: 'A', look: { hair: 0, hairColor: 0 }, classId: 'archer' }, 1);
    c = { ...c, level: 10 };
    const base = finalStats(c).moveSpd;
    c = raise(c, 'lightfeet', 2).char;
    expect(finalStats(c).moveSpd).toBeCloseTo(base * 1.04);
  });
});

describe('Mage', () => {
  it('Darah Dingin: Panas cools faster', () => {
    const a = game('mage'), b = game('mage', { heatDrop: 0.3 });
    a.trait.v = b.trait.v = 80;
    traitStep(a, 1, false, false); traitStep(b, 1, false, false);
    expect(80 - b.trait.v).toBeCloseTo((80 - a.trait.v) * 1.3);
  });
  it('Hemat Mana: skills cost less energy', () => {
    const nova = CLASSES.mage.skills[0];
    expect(skillCost(game('mage', { manaSave: 0.15 }), nova)).toBeCloseTo(nova.cost * 0.85);
  });
  it('Ledakan Besar: area skills reach further', () => {
    const go = (fx) => { const g = game('mage', fx); g.energy = 100; g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, skill1: true, potion: -1 }; g.step(1 / 60); return g.hits.find((h) => h.r)?.r; };
    expect(go({ areaUp: 0.18 })).toBeCloseTo(go({}) * 1.18);
  });
});

describe('Assassin', () => {
  it('Ingatan Otot: Kombo lasts longer before it drops', () => {
    const a = game('assassin'), b = game('assassin', { comboHold: 2 });
    for (const g of [a, b]) { g.trait.v = 3; g.trait.idle = 0; traitStep(g, CLASSES.assassin.trait.idleAfter + 1, false, false); }
    expect(a.trait.v).toBe(0); expect(b.trait.v).toBe(3);
  });
  it('Lolos Tipis: crit for a while after a dodge', () => {
    const g = game('assassin', { dodgeCrit: 20 });
    const far = { x: g.px + 50, y: g.py };
    expect(passiveCrit(g, far)).toBe(0);
    g.intent = { move: { x: 1, y: 0 }, aimAt: null, dodge: true, attack: false, potion: -1 }; g.step(1 / 60);
    expect(passiveCrit(g, far)).toBe(20);
    g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 };
    for (let i = 0; i < 60 * (PASSIVE_RULES.closeCall.time + 0.2); i++) g.step(1 / 60);
    expect(passiveCrit(g, far)).toBe(0);
  });
  it('Bilah Racun: a poisoned enemy loses HP every tick, then it wears off', () => {
    const g = game('assassin');
    const e = g.spawnEnemy('tank'); e.x = g.px + 300;
    poisonFoe(g, e);
    const hp = e.hp;
    for (let i = 0; i < 60; i++) poisonStep(g, e, 1 / 60);
    expect(e.hp).toBeLessThan(hp);
    for (let i = 0; i < 60 * 3; i++) if (e.psn) poisonStep(g, e, 1 / 60);
    expect(e.psn).toBe(null);
  });
});
