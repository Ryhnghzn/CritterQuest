// Focused ultimates (spec §43.5).
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { ULT } from '../data/balance.js';

const DT = 1 / 60, idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1, held: [false, false, false, false] };
function game(classId) {
  const g = new Game();
  g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, maxHp: 1e5, crit: 0 }, skills: [CLASSES[classId].skills[0].id, null, null, null], level: 30, ult: CLASSES[classId].fokus });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99;
  g.aimX = 1; g.aimY = 0; g.aimPX = g.px + 150; g.aimPY = g.py; g.ultCharge = ULT.max;
  return g;
}
const step = (g, intent, n = 1) => { for (let i = 0; i < n; i++) { g.intent = { ...idle, ...intent }; g.step(DT); } };
const foe = (g, x, y = 0, hp = 1e7) => { const e = g.spawnEnemy('tank'); Object.assign(e, { x: g.px + x, y: g.py + y, hp, maxHp: hp, speed: 0, dmg: 0 }); return e; };

describe('focused ultimates', () => {
  it('every job has two ultimates: the wide one and a focused one', () => {
    for (const id of ['warrior', 'archer', 'mage', 'assassin']) { expect(CLASSES[id].ults).toHaveLength(2); expect(CLASSES[id].ults[1].kind).toBe('focus'); }
  });
  it('Hantaman Langit: leaps to the aim point and slams once, hard, with a glowing mark first', () => {
    const g = game('warrior'), e = foe(g, 150);
    step(g, { ult: true });
    expect(g.focusMark).toBeTruthy(); expect(g.ultCharge).toBe(0);
    step(g, {}, 50);
    expect(Math.abs(g.px - (e.x))).toBeLessThan(60);
    expect(1e7 - e.hp).toBeGreaterThan(g.stats.atk * 40);
  });
  it('Panah Penembus Langit: hits everything on the line once; full Bidik = a sure crit', () => {
    const g = game('archer'), a = foe(g, 120), b = foe(g, 400);
    g.trait.v = 100; g.trait.focus = true;
    step(g, { ult: true }); step(g, {}, 50);
    const once = g.stats.atk * CLASSES.archer.fokus.mult;
    expect(1e7 - a.hp).toBeGreaterThan(once * 1.4);   // crit
    expect(1e7 - b.hp).toBeLessThan(once * 2.5 * 1.01); // one hit each
  });
  it('Matahari Runtuh: pulls enemies in, then bursts', () => {
    const g = game('mage'), e = foe(g, 260), side = foe(g, 270, 130); // the ball lands on the nearest foe (auto aim)
    step(g, { ult: true });
    step(g, {}, 30);
    expect(side.y).toBeLessThan(g.py + 120);
    step(g, {}, 30);
    expect(e.hp).toBeLessThan(1e7);
  });
  it('Eksekusi Bayangan: teleports behind the target, spends Kombo for more, executes the weak', () => {
    const g = game('assassin'), e = foe(g, 150), weak = foe(g, 160, 20, 1000);
    weak.hp = 200;
    g.trait.v = 5;
    step(g, { ult: true });
    expect(g.px).toBeGreaterThan(e.x - 1);
    expect(g.trait.v).toBe(0);
    step(g, {}, 40);
    expect(weak.hp).toBeLessThanOrEqual(0);
    expect(1e7 - e.hp).toBeGreaterThan(g.stats.atk * 56 * 1.4);
  });
  it('a miss still empties the bar', () => {
    const g = game('assassin');
    step(g, { ult: true });
    expect(g.ultCharge).toBe(0);
  });
});
