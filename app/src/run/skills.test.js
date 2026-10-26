import { describe, it, expect } from 'vitest';
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { STAT_UPS } from '../data/balance.js';

const DT = 1 / 60;

// A run with no spawning and one dummy enemy (huge HP, standing still) at (x, y).
function arena(classId, { x = 30, y = 0, stats = {} } = {}) {
  const g = new Game();
  g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, crit: 0, ...stats } });
  g.spawnT = 1e9;
  const e = g.spawnEnemy('tank');
  Object.assign(e, { x, y, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 });
  return { g, e };
}
function hold(g, seconds, intent) {
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: true, ...intent };
    g.step(DT);
  }
}
const dealt = (e) => 1e6 - e.hp;

describe('serangan dasar', () => {
  it('tidak menyerang bila tombol tidak ditahan', () => {
    const { g, e } = arena('warrior');
    hold(g, 1, { attack: false });
    expect(dealt(e)).toBe(0);
  });

  it('ritme = interval / atkSpd selama ditahan', () => {
    const { g, e } = arena('warrior'); // 0.55 s, atk 14
    hold(g, 1);
    expect(dealt(e)).toBeCloseTo(2 * 14);
    const fast = arena('warrior', { stats: { atkSpd: 2 } }); // 0.275 s
    hold(fast.g, 1);
    expect(dealt(fast.e)).toBeCloseTo(4 * 14);
  });

  it('kritis mengalikan damage dengan critDmg', () => {
    const { g, e } = arena('warrior', { stats: { crit: 100 } });
    hold(g, DT);
    expect(dealt(e)).toBeCloseTo(14 * 1.5);
  });

  it('berkah "Taring Tajam" menambah damage 15%', () => {
    const { g, e } = arena('warrior');
    g.stats.dmgMul = 1.15;
    hold(g, DT);
    expect(dealt(e)).toBeCloseTo(14 * 1.15);
  });

  it('tebasan warrior tidak mengenai musuh di belakang', () => {
    const { g, e } = arena('warrior', { x: -30 });
    g.aimX = 1; g.aimY = 0;
    hold(g, 1, { aimAt: { x: 100, y: 0 } });
    expect(dealt(e)).toBe(0);
  });

  it('tusukan assassin jarak dekat saja', () => {
    const near = arena('assassin', { x: 30 });
    hold(near.g, DT);
    expect(dealt(near.e)).toBeGreaterThan(0);
    const far = arena('assassin', { x: 80 });
    hold(far.g, 1, { aimAt: { x: 200, y: 0 } });
    expect(dealt(far.e)).toBe(0);
  });

  it('panah archer mencapai musuh jauh', () => {
    const { g, e } = arena('archer', { x: 300 });
    hold(g, 1);
    expect(dealt(e)).toBeGreaterThan(0);
  });

  it('bola api mage meledak dan mengenai musuh di sekitar', () => {
    const { g, e } = arena('mage', { x: 200 });
    const side = g.spawnEnemy('slink');
    Object.assign(side, { x: 200, y: 30, hp: 1e6, speed: 0, dmg: 0 });
    hold(g, 1);
    expect(dealt(e)).toBeCloseTo(16);
    expect(1e6 - side.hp).toBeCloseTo(16);
  });
});

describe('kartu level-up', () => {
  it('hanya berkah stat (atau pulih bila habis)', () => {
    const { g } = arena('archer');
    g.pendingLevels = 1;
    g.step(DT);
    expect(g.state).toBe(ST.LEVELUP);
    const ids = STAT_UPS.map((s) => s.id);
    for (const c of g.choices) expect(c.kind === 'stat' ? ids.includes(c.id) : c.kind === 'heal').toBe(true);
  });
});
