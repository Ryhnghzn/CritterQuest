// Tempo skills (spec §43.4, §43.7): hold-to-charge, channel, parry.
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';

const DT = 1 / 60, idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1, held: [false, false, false, false] };
function game(classId, id, level = 30, levels = {}) {
  const g = new Game();
  g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, maxHp: 1e5, crit: 0 }, skills: [id, null, null, null], level, levels });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99;
  g.aimX = 1; g.aimY = 0; g.energy = 100;
  return g;
}
const step = (g, intent, n = 1) => { for (let i = 0; i < n; i++) { g.intent = { ...idle, ...intent }; g.step(DT); } };
const holdFor = (g, secs) => { step(g, { skill1: true, held: [true, false, false, false] }); step(g, { held: [true, false, false, false] }, Math.round(secs * 60)); };
const foe = (g, x = 100) => { const e = g.spawnEnemy('tank'); Object.assign(e, { x: g.px + x, y: g.py, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 }); return e; };

describe('Tebasan Raksasa (charge)', () => {
  it('a longer hold reaches further and hits harder; the cooldown starts on release', () => {
    const slash = (secs) => { const g = game('warrior', 'greatslash'); holdFor(g, secs); expect(g.skillCd[0]).toBe(0); step(g, {}); return { g, h: g.hits.find((h) => h.arc) }; };
    const short = slash(0.1), long = slash(1.3);
    expect(long.h.r).toBeGreaterThan(short.h.r + 60);
    expect(long.h.mult).toBeGreaterThan(short.h.mult * 2.5);
    expect(long.h.breakShield).toBe(true); expect(short.h.breakShield).toBeUndefined();
    expect(long.g.skillCd[0]).toBeGreaterThan(3);
  });
  it('right click lets it go unused (no slash, cooldown starts)', () => {
    const g = game('warrior', 'greatslash');
    holdFor(g, 0.5);
    step(g, { held: [true, false, false, false], cancel: true });
    expect(g.held).toBe(null); expect(g.hits.some((h) => h.arc)).toBe(false); expect(g.skillCd[0]).toBeGreaterThan(3);
  });
  it('at full it breaks a Berlapis shield', () => {
    const g = game('warrior', 'greatslash'), e = foe(g, 60);
    e.armor = 500; e.armorMax = 500; e.affixes = ['armored'];
    holdFor(g, 1.3); step(g, {}, 3);
    expect(e.armor).toBe(0); expect(e.hp).toBeLessThan(1e6);
  });
  it('level 5: full sooner', () => {
    const g = game('warrior', 'greatslash', 30, { greatslash: 5 });
    holdFor(g, 0.85); step(g, {});
    expect(g.hits.find((h) => h.arc).breakShield).toBe(true);
  });
});

describe('Semburan Api (channel)', () => {
  it('ticks a cone while held, drains energy, slows the hero, heats up; stops on release', () => {
    const g = game('mage', 'flamethrower'), e = foe(g, 80);
    holdFor(g, 0.5);
    expect(g.held).toBeTruthy(); expect(g.heldSlow).toBeGreaterThan(0);
    expect(g.energy).toBeLessThan(100 - 15 - 5);
    expect(g.trait.v).toBeGreaterThan(9);
    expect(e.hp).toBeLessThan(1e6);
    step(g, {});
    expect(g.held).toBe(null); expect(g.skillCd[0]).toBeGreaterThan(3);
  });
  it('stops on its own after max', () => {
    const g = game('mage', 'flamethrower');
    holdFor(g, 2.2);
    expect(g.held).toBe(null);
  });
  it('level 5 sets enemies ablaze', () => {
    const g = game('mage', 'flamethrower', 30, { flamethrower: 5 }), e = foe(g, 80);
    holdFor(g, 0.3);
    expect(e.psn).toBeTruthy();
  });
});

describe('Tangkis Baja (parry)', () => {
  it('cancels the next hit, answers with a wave and Murka', () => {
    const g = game('warrior', 'steelparry');
    step(g, { skill1: true });
    expect(g.parryT).toBeGreaterThan(0);
    const hp = g.stats.hp;
    expect(g.hurtPlayer(50)).toBe(false);
    expect(g.stats.hp).toBe(hp);
    expect(g.trait.v).toBeGreaterThanOrEqual(30);
    expect(g.hits.some((h) => h.fx === 'shout')).toBe(true);
    expect(g.hurtPlayer(50)).toBe(true); // the window is used up
  });
  it('a red (unparryable) shot gets through; the window closes in time', () => {
    const g = game('warrior', 'steelparry');
    step(g, { skill1: true });
    expect(g.hurtPlayer(50, null, null, { unparryable: true })).toBe(true);
    const g2 = game('warrior', 'steelparry');
    step(g2, { skill1: true }); step(g2, {}, 40);
    expect(g2.parryT).toBeLessThanOrEqual(0);
  });
  it('level 5 sends a parried shot back', () => {
    const g = game('warrior', 'steelparry', 30, { steelparry: 5 });
    step(g, { skill1: true });
    const shot = { x: g.px + 20, y: g.py, vx: -200, vy: 0, r: 5, dmg: 10, life: 5 };
    g.hurtPlayer(10, null, null, shot);
    expect(shot.life).toBe(0);
    expect(g.hits.some((h) => h.kind === 'proj' && h.vx > 0)).toBe(true);
  });
});
