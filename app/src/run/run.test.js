import { describe, it, expect } from 'vitest';
import { Game, ST } from './run.js';
import { CRITTERS } from '../data/classes.js';
import { XP_BASE, XP_GROWTH } from '../data/balance.js';

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

describe('hasil ronde', () => {
  it('EXP = total nilai permata yang diambil', () => {
    const g = simulate(CRITTERS[1], 90);
    let total = g.xp;
    for (let l = 1; l < g.level; l++) total += XP_BASE + XP_GROWTH * l;
    const r = g.result();
    expect(r.exp).toBe(total);
    expect(r).toEqual({ time: g.time, kills: g.kills, exp: total, gold: 0, items: [], bossKills: 0 });
  });

  it('menghitung bos yang dikalahkan', () => {
    const g = new Game();
    g.start(CRITTERS[0]);
    g.moveVec = { x: 0, y: 0 };
    g.spawnEnemy('boss').hp = 0;
    g.step(1 / 60);
    expect(g.result().bossKills).toBe(1);
  });

  it('menyerah mengakhiri ronde tanpa kehilangan hadiah', () => {
    const g = simulate(CRITTERS[1], 20);
    const hp = g.stats.hp;
    const before = g.result();
    g.surrender();
    expect(g.state).toBe(ST.OVER);
    expect(g.stats.hp).toBe(hp);
    expect(g.result()).toEqual(before);
  });
});
