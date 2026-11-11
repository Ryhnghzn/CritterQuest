import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { ENEMIES, MINI_MOVES } from '../data/enemies.js';
import { initMiniMove } from './minimove.js';

const DT = 1 / 60;
function start() {
  const g = new Game();
  g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats, maxHp: 100000 } });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99;
  return g;
}
const step = (g, n = 1) => { for (let i = 0; i < n; i++) { g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 }; g.step(DT); } };
const guardian = (g, zone, dmg = 12) => { const e = g.spawnEnemy('tank'); e.x = 220; e.y = 0; e.speed = 0; e.dmg = dmg; e.elite = true; e.mini = true; initMiniMove(e, zone); return e; };

describe('treasure guardians borrow a boss move (spec §41.2)', () => {
  it('each zone lends a signature move of its dungeon boss', () => {
    const g = start();
    for (const [zone, boss] of Object.entries(MINI_MOVES.zones)) {
      const e = guardian(g, zone);
      expect(e.sig.from).toBe(boss);
      expect(ENEMIES[boss].signature).toContain(e.sig.id);
    }
  });
  it('the borrowed numbers are scaled to the guardian, not the boss', () => {
    const g = start(), e = guardian(g, 'volcano', 6), B = ENEMIES.lavaboss;
    expect(e.sig.cfg.meteor.dmg).toBeCloseTo(B.meteor.dmg * (6 / B.dmg) * MINI_MOVES.dmgMul);
    expect(B.meteor.dmg).toBe(40); // the boss itself is untouched
  });
  it('uses the move after a while, then waits again; its own timer is left alone', () => {
    const g = start(), e = guardian(g, 'volcano');
    e.sig.wait = 0.1; const actT = e.actT;
    step(g, 10);
    expect(e.pat || g.hazards.length).toBeTruthy();
    step(g, 60 * 4);
    expect(e.pat).toBeFalsy();
    expect(e.sig.wait).toBeGreaterThan(0);
    expect(Number.isNaN(e.actT)).toBe(false);
    expect(e.actT === actT || e.actT <= actT).toBe(true);
  });
  it('a zone without a dungeon boss lends nothing', () => {
    const g = start(), e = guardian(g, 'hub');
    expect(e.sig).toBeUndefined();
  });
});
