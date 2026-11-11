// Towers, clones, runes and chains (spec §43.4), and the red shots no parry stops (§43.8).
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { ENEMIES } from '../data/enemies.js';
import { fire } from './enemies.js';

const DT = 1 / 60, idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1, held: [false, false, false, false] };
function game(classId, id, levels = {}) {
  const g = new Game();
  g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, maxHp: 1e5, crit: 0 }, skills: [id, null, null, null], level: 30, levels });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99;
  g.aimX = 1; g.aimY = 0; g.aimPX = g.px + 150; g.aimPY = g.py; g.energy = 100;
  return g;
}
const step = (g, intent, n = 1) => { for (let i = 0; i < n; i++) { g.intent = { ...idle, ...intent }; g.step(DT); } };
const foe = (g, x, y = 0) => { const e = g.spawnEnemy('tank'); Object.assign(e, { x: g.px + x, y: g.py + y, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 }); return e; };

describe('Menara Panah', () => {
  it('stands at the aim point and shoots the nearest enemy; at most 2 (L5: 3)', () => {
    const g = game('archer', 'tower'), e = foe(g, 200);
    step(g, { skill1: true });
    expect(g.summons).toHaveLength(1);
    step(g, {}, 60);
    expect(e.hp).toBeLessThan(1e6);
    for (let k = 0; k < 3; k++) { g.skillCd[0] = 0; g.energy = 100; step(g, { skill1: true }); }
    expect(g.summons.filter((m) => m.kind === 'turret')).toHaveLength(2);
    const g5 = game('archer', 'tower', { tower: 5 });
    for (let k = 0; k < 4; k++) { g5.skillCd[0] = 0; g5.energy = 100; step(g5, { skill1: true }); }
    expect(g5.summons).toHaveLength(3);
  });
});

describe('Bom Waktu', () => {
  it('bursts after its fuse, stronger for every hit landed on foes inside', () => {
    const blast = (feed) => {
      const g = game('mage', 'timebomb'), e = foe(g, 150);
      step(g, { skill1: true });
      if (feed) for (let k = 0; k < 5; k++) g.damageEnemy({ mult: 0.01, fx: 'fireball' }, e);
      const rune = g.summons[0];
      step(g, {}, Math.round(2.1 * 60));
      return { bonus: rune.bonus, boom: g.hits.find((h) => h.fx === 'boom' && h.r === 90) };
    };
    const plain = blast(false), fed = blast(true);
    expect(fed.bonus).toBeCloseTo(0.5);
    expect(fed.boom.mult).toBeCloseTo(plain.boom.mult * 1.5);
  });
});

describe('Tarian Tiga Tebasan', () => {
  it('three presses = three steps; the cooldown waits for the end', () => {
    const g = game('assassin', 'tripledance');
    step(g, { skill1: true });
    expect(g.chain.step).toBe(1); expect(g.skillCd[0]).toBe(0);
    step(g, {}, 10); step(g, { skill1: true }); expect(g.chain.step).toBe(2);
    step(g, {}, 10); step(g, { skill1: true });
    expect(g.chain).toBe(null); expect(g.skillCd[0]).toBeGreaterThan(4);
    expect(g.hits.some((h) => h.freeze === 1)).toBe(true);
  });
  it('a missed window ends it after step 1', () => {
    const g = game('assassin', 'tripledance');
    step(g, { skill1: true }); step(g, {}, 60);
    expect(g.chain).toBe(null); expect(g.skillCd[0]).toBeGreaterThan(3);
  });
});

describe('Klon Bayangan', () => {
  it('slashes around itself and draws every other enemy near it (not when the hero is close)', () => {
    const g = game('assassin', 'shadowclone');
    step(g, { skill1: true });
    const c = g.summons[0];
    c.x = g.px + 300; c.y = g.py;
    const a = foe(g, 380), b = foe(g, 360);
    a.speed = b.speed = 60;
    step(g, {}, 30);
    const toward = (e) => Math.abs(e.x - c.x);
    expect([a, b].some((e) => toward(e) < 70)).toBe(true);
    step(g, {}, 30);
    expect(a.hp < 1e6 || b.hp < 1e6).toBe(true);
  });
});

describe('red shots', () => {
  it('every boss spiral is unparryable and red; the shot carries it', () => {
    expect(ENEMIES.boss.spiral.unparryable).toBe(true);
    const g = game('warrior', 'steelparry');
    fire(g, 0, 0, 0, ENEMIES.lavaboss.spiral, 'lavaboss');
    expect(g.shots[0].unparryable).toBe(true);
  });
});
