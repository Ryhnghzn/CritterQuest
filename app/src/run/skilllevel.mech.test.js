// The level 3 / level 5 effects of the 24 job skills (spec §43.4), each where it acts.
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';

const DT = 1 / 60;
const idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 };
function cast(classId, id, level, { steps = 1, setup } = {}) {
  const g = new Game();
  g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, maxHp: 1e5, crit: 0 }, skills: [id, null, null, null], level: 30, levels: { [id]: level } });
  g.spawnT = 1e9; g.queueI = g.queue.length; g.wave = 99;
  g.aimX = 1; g.aimY = 0; g.aimPX = g.px + 150; g.aimPY = g.py;
  setup?.(g);
  g.energy = 100; g.intent = { ...idle, skill1: true }; g.step(DT);
  g.intent = { ...idle };
  for (let i = 1; i < steps; i++) g.step(DT);
  return g;
}
const foe = (g, x = 120, y = 0, hp = 1e6) => { const e = g.spawnEnemy('tank'); Object.assign(e, { x: g.px + x, y: g.py + y, hp, maxHp: hp, speed: 0, dmg: 0 }); return e; };
const areas = (g) => g.hits.filter((h) => h.kind !== 'proj');

describe('Warrior', () => {
  it('Putaran Pedang: L3 +2 tebasan, L5 pusaran tertinggal', () => {
    expect(cast('warrior', 'spin', 3).skillDefs[0].ticks).toBe(CLASSES.warrior.skills[0].ticks + 2);
    expect(areas(cast('warrior', 'spin', 5)).some((h) => h.delay > 0.9)).toBe(true);
  });
  it('Terjang L5: jejak api di sepanjang terjangan', () => {
    expect(cast('warrior', 'charge', 5).hits.filter((h) => h.part === 'trail').length).toBeGreaterThanOrEqual(4);
  });
  it('Retakan Bumi L5: ledakan besar setelah pilar terakhir', () => {
    expect(cast('warrior', 'quake', 5).hits.some((h) => h.r === 90)).toBe(true);
  });
  it('Kapak Bumerang: L3 kapak kedua, L5 berhenti berputar di ujung', () => {
    expect(cast('warrior', 'axe', 3).hits.filter((h) => h.kind === 'proj')).toHaveLength(2);
    expect(cast('warrior', 'axe', 5).hits.find((h) => h.kind === 'proj').pause).toBe(0.6);
  });
  it('Amarah Perang: L3 gerak +20%, L5 Murka +40', () => {
    const base = cast('warrior', 'warcry', 1).stats.moveSpd;
    expect(cast('warrior', 'warcry', 3).stats.moveSpd).toBeCloseTo(base * 1.2);
    expect(cast('warrior', 'warcry', 5).trait.v).toBeGreaterThanOrEqual(40);
  });
});

describe('Archer', () => {
  it('Panah Naga L5: dua naga', () => expect(cast('archer', 'pierce', 5).hits.filter((h) => h.kind === 'proj')).toHaveLength(2));
  it('Lompatan Mundur L3: bisa 2× berturut, lalu baru jeda', () => {
    const g = cast('archer', 'leap', 3);
    expect(g.skillCd[0]).toBeLessThan(0.3);
    for (let i = 0; i < 20; i++) g.step(DT);
    g.energy = 100; g.intent = { ...idle, skill1: true }; g.step(DT);
    expect(g.skillCd[0]).toBeGreaterThan(1);
  });
  it('Ladang Jebakan L5: meledak di akhir', () => expect(cast('archer', 'trap', 5).hits.some((h) => h.r === 80 && h.delay >= 4)).toBe(true));
  it('Mata Elang L5: panah biasa menembus 1 selama buff', () => {
    const g = cast('archer', 'hawk', 5);
    g.intent = { ...idle, attack: true }; for (let i = 0; i < 30; i++) g.step(DT);
    expect(g.hits.some((h) => h.kind === 'proj' && h.pierce >= 1)).toBe(true);
  });
});

describe('Mage', () => {
  it('Nova Es L5: musuh beku yang mati pecah jadi serpihan', () => {
    const g = cast('mage', 'nova', 5, { setup: (gg) => foe(gg, 40, 0, 1) });
    for (let i = 0; i < 10; i++) g.step(DT);
    expect(g.hits.filter((h) => h.kind === 'proj').length).toBeGreaterThanOrEqual(4);
  });
  it('Meteor L5: lava tertinggal', () => expect(areas(cast('mage', 'meteor', 5)).some((h) => h.delay > 0.3 && h.r === 110)).toBe(true));
  it('Teleportasi L5: ledakan es di titik awal', () => expect(areas(cast('mage', 'blink', 5)).some((h) => h.freeze === 0.8)).toBe(true));
  it('Perisai Mana L5: meledak saat habis', () => expect(areas(cast('mage', 'manashield', 5)).some((h) => h.r === 100 && h.delay > 5)).toBe(true));
});

describe('Assassin', () => {
  it('Langkah Bayangan L5: bayangan menebas lagi', () => expect(areas(cast('assassin', 'shadow', 5)).filter((h) => h.delay >= 0.3).length).toBeGreaterThan(2));
  it('Lingkaran Belati L5: belati kembali', () => expect(cast('assassin', 'fan', 5).hits.every((h) => h.kind !== 'proj' || h.boomerang)).toBe(true));
  it('Kabut Racun L5: musuh di dalam menerima +15%', () => {
    const g = cast('assassin', 'poison', 5, { setup: (gg) => foe(gg, 150, 0) });
    for (let i = 0; i < 30; i++) g.step(DT);
    expect(g.enemies[0].vulnT).toBeGreaterThan(0);
  });
  it('Bom Asap L5: kebal 1 dtk', () => expect(cast('assassin', 'smoke', 5).dodgeInv).toBeGreaterThan(0.9));
  it('Naluri Pembunuh L5: tiap kill menambah durasi (maks +3)', () => {
    const g = cast('assassin', 'assassinate', 5);
    const t0 = g.skillBuffT;
    for (let i = 0; i < 10; i++) { const e = foe(g); e.hp = 0; g.step(DT); }
    expect(g.skillBuffT).toBeGreaterThan(t0 + 2.5);
    expect(g.skillBuff.extended).toBe(3);
  });
});
