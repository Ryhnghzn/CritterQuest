// Endgame tahap 1 (docs/superpowers/plans/2026-11-13-endgame.md): what the run does at the top level.
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { expToNext } from '../meta/character.js';

describe('Bar Bonus di level 50', () => {
  it('bar EXP terus terisi, penuh → spanduk & mulai lagi (hadiahnya dibayar saat disimpan)', () => {
    const g = new Game();
    g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, level: 50, exp: expToNext(50) - 5 });
    g.spawnT = 1e9;
    let banner = null; g.showBanner = (s) => { banner = s; };
    g.gems.push({ x: g.px, y: g.py, v: 12, mag: true, big: true, t: 0 });
    for (let i = 0; i < 30 && g.gems.length; i++) { g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 }; g.step(1 / 60); }
    expect(g.level).toBe(50);
    expect(g.xp).toBeCloseTo(7);
    expect(banner).toMatch(/Bar Bonus/);
  });
});
