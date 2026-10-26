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

// Extra still dummies at the given offsets; returns them.
function dummies(g, offsets, type = 'tank') {
  return offsets.map(([x, y]) => {
    const e = g.spawnEnemy(type);
    Object.assign(e, { x, y, hp: 1e6, maxHp: 1e6, speed: 0, dmg: 0 });
    return e;
  });
}
const cast = (g, n, extra = {}) => hold(g, DT, { attack: false, [`skill${n}`]: true, ...extra });
const idle = (g, s, extra = {}) => hold(g, s, { attack: false, ...extra });

describe('serang otomatis', () => {
  it('menyerang sendiri bila ada musuh dalam jangkauan', () => {
    const { g, e } = arena('warrior', { x: 40 });
    idle(g, 1, { auto: true });
    expect(dealt(e)).toBeGreaterThan(0);
  });
  it('tidak mengayun ke udara bila musuh di luar jangkauan', () => {
    const { g, e } = arena('warrior', { x: 300 });
    idle(g, 1, { auto: true });
    expect(dealt(e)).toBe(0);
    expect(g.attackT).toBeLessThanOrEqual(0);
  });
  it('archer otomatis menembak musuh jauh', () => {
    const { g, e } = arena('archer', { x: 300 });
    idle(g, 1.5, { auto: true });
    expect(dealt(e)).toBeGreaterThan(0);
  });
});

describe('cooldown skill', () => {
  it('tidak bisa dipakai lagi sebelum cooldown habis', () => {
    const { g, e } = arena('warrior', { x: 40 });
    cast(g, 1);
    idle(g, 2);
    const once = dealt(e);
    cast(g, 1);
    idle(g, 2);
    expect(dealt(e)).toBe(once);
  });
  it('cdr mengurangi cooldown, maksimal 40%', () => {
    const a = arena('warrior', { stats: { cdr: 20 } });
    cast(a.g, 1);
    expect(a.g.skillCdMax[0]).toBeCloseTo(8 * 0.8);
    const b = arena('warrior', { stats: { cdr: 90 } });
    cast(b.g, 1);
    expect(b.g.skillCdMax[0]).toBeCloseTo(8 * 0.6);
  });
});

describe('skill warrior', () => {
  it('Putaran Pedang: 4 tik × 150% atk di sekeliling, mengikuti pemain', () => {
    const { g, e } = arena('warrior', { x: 50 });
    const [behind] = dummies(g, [[-50, 0]]);
    cast(g, 1);
    idle(g, 1.2);
    expect(dealt(e)).toBeCloseTo(4 * 1.5 * 14);
    expect(1e6 - behind.hp).toBeCloseTo(4 * 1.5 * 14);
  });
  it('Teriakan Baja: damage diterima −50% selama 4 s', () => {
    const { g } = arena('warrior', { x: 900, stats: { def: 0 } });
    cast(g, 2);
    const [biter] = dummies(g, [[0, 0]]);
    biter.dmg = 10;
    const hp = g.stats.hp;
    idle(g, DT);
    expect(hp - g.stats.hp).toBe(5);
    g.invuln = 0;
    idle(g, 4.2);
    g.invuln = 0;
    Object.assign(biter, { x: g.px, y: g.py, kx: 0, ky: 0 }); // touching knocks enemies back
    const hp2 = g.stats.hp;
    idle(g, DT);
    expect(hp2 - g.stats.hp).toBe(10);
  });
});

describe('skill archer', () => {
  it('Hujan Panah: 5 tik × 80% atk di titik bidik', () => {
    const { g, e } = arena('archer', { x: 200 });
    const [near] = dummies(g, [[0, 30]]);
    cast(g, 1, { aimAt: { x: 200, y: 0 } });
    idle(g, 2, { aimAt: { x: 200, y: 0 } });
    expect(dealt(e)).toBeCloseTo(5 * 0.8 * 11);
    expect(near.hp).toBe(1e6);
  });
  it('Hujan Panah: titik bidik dibatasi 320 px', () => {
    const { g } = arena('archer', { x: 900 });
    cast(g, 1, { aimAt: { x: 1000, y: 0 } });
    const area = g.hits.find((h) => h.fx === 'rain');
    expect(Math.hypot(area.x, area.y)).toBeCloseTo(320);
  });
  it('Tembakan Tembus: menembus semua musuh di garis, 300% atk', () => {
    const { g, e } = arena('archer', { x: 100 });
    const more = dummies(g, [[150, 0], [220, 0]]);
    cast(g, 2, { aimAt: { x: 500, y: 0 } });
    idle(g, 1);
    for (const x of [e, ...more]) expect(1e6 - x.hp).toBeCloseTo(3 * 11);
  });
});

describe('skill mage', () => {
  it('Nova Es: 120% atk dalam radius 90 dan membekukan 1,5 s', () => {
    const { g, e } = arena('mage', { x: 60 });
    const [far] = dummies(g, [[200, 0]]);
    e.speed = 40;
    cast(g, 1);
    expect(dealt(e)).toBeCloseTo(1.2 * 16);
    expect(far.hp).toBe(1e6);
    const x = e.x;
    idle(g, 1.2);
    expect(e.x).toBe(x);
    idle(g, 0.5);
    expect(e.x).not.toBe(x);
  });
  it('Petir Berantai: melompat ke 5 musuh, 180% atk', () => {
    const { g, e } = arena('mage', { x: 100 });
    const rest = dummies(g, [[200, 0], [300, 0], [400, 0], [500, 0], [600, 0]]);
    cast(g, 2, { aimAt: { x: 100, y: 0 } });
    const hitList = [e, ...rest].map((x) => 1e6 - x.hp);
    expect(hitList.slice(0, 5).every((d) => Math.abs(d - 1.8 * 16) < 1e-6)).toBe(true);
    expect(hitList[5]).toBe(0);
  });
});

describe('skill assassin', () => {
  it('Langkah Bayangan: melesat 150 px ke arah bidik, 250% atk ke yang dilewati, kebal', () => {
    const { g, e } = arena('assassin', { x: 60 });
    const [second] = dummies(g, [[120, 0]]);
    cast(g, 1, { aimAt: { x: 500, y: 0 } });
    expect(g.dodgeInv).toBeGreaterThan(0);
    idle(g, 0.4, { aimAt: { x: 500, y: 0 } });
    expect(g.px).toBeCloseTo(150, 0);
    expect(dealt(e)).toBeCloseTo(2.5 * 9);
    expect(1e6 - second.hp).toBeCloseTo(2.5 * 9);
  });
  it('Kipas Belati: 7 belati menyebar', () => {
    const { g } = arena('assassin', { x: 900 });
    cast(g, 2, { aimAt: { x: 500, y: 0 } });
    expect(g.hits.filter((h) => h.fx === 'dagger').length).toBe(7);
  });
});
