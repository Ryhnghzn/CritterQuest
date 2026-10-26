import { describe, it, expect } from 'vitest';
import { Game, ST } from './run.js';
import { CRITTERS } from '../data/classes.js';

// Plays a run headlessly: circle around the arena, always take the first card.
function simulate(critter, seconds) {
  const g = new Game();
  g.start(critter);
  for (let i = 0; i < seconds * 60 && g.state !== ST.OVER; i++) {
    g.moveVec = { x: Math.cos(g.time * 0.9), y: Math.sin(g.time * 0.9) };
    g.step(1 / 60);
    if (g.state === ST.LEVELUP) g.applyChoice(g.choices[0]);
  }
  return g;
}

const snapshot = (g) => ({
  state: g.state, time: g.time, kills: g.kills, level: g.level, xp: g.xp,
  hp: g.stats.hp, px: g.px, py: g.py, enemies: g.enemies.length,
  weapons: g.weapons.map((w) => `${w.id}${w.level}`),
});

describe('run (prototipe)', () => {
  it('berjalan tanpa DOM untuk tiap critter', () => {
    for (const c of CRITTERS) {
      const g = simulate(c, 30);
      expect(g.time).toBeGreaterThan(0);
      expect(g.kills).toBeGreaterThan(0);
    }
  });

  it('deterministik: ronde yang sama menghasilkan state yang sama', () => {
    for (const c of CRITTERS) {
      expect(snapshot(simulate(c, 60))).toEqual(snapshot(simulate(c, 60)));
    }
  });
});
