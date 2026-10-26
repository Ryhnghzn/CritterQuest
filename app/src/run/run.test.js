import { describe, it, expect } from 'vitest';
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { XP_BASE, XP_GROWTH } from '../data/balance.js';

const setup = (classId) => ({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats } });
const CLASS_IDS = Object.keys(CLASSES);

// Plays a run headlessly: circle around the arena attacking, always take the first card.
function simulate(classId, seconds) {
  const g = new Game();
  g.start(setup(classId));
  for (let i = 0; i < seconds * 60 && g.state !== ST.OVER; i++) {
    g.intent = { move: { x: Math.cos(g.time * 0.9), y: Math.sin(g.time * 0.9) }, aimAt: null, dodge: false, attack: true };
    g.step(1 / 60);
    if (g.state === ST.LEVELUP) g.applyChoice(g.choices[0]);
  }
  return g;
}

const snapshot = (g) => ({
  state: g.state, time: g.time, kills: g.kills, level: g.level, xp: g.xp,
  hp: g.stats.hp, px: g.px, py: g.py, enemies: g.enemies.length,
});

describe('run', () => {
  it('berjalan tanpa DOM untuk tiap kelas', () => {
    for (const c of CLASS_IDS) {
      const g = simulate(c, 30);
      expect(g.time).toBeGreaterThan(0);
      expect(g.kills).toBeGreaterThan(0);
    }
  });

  it('deterministik: ronde yang sama menghasilkan state yang sama', () => {
    for (const c of CLASS_IDS) {
      expect(snapshot(simulate(c, 60))).toEqual(snapshot(simulate(c, 60)));
    }
  });
});

describe('hasil ronde', () => {
  it('EXP = total nilai permata yang diambil', () => {
    const g = simulate('warrior', 90);
    let total = g.xp;
    for (let l = 1; l < g.level; l++) total += XP_BASE + XP_GROWTH * l;
    const r = g.result();
    expect(r.exp).toBe(total);
    expect(r).toEqual({ time: g.time, kills: g.kills, exp: total, gold: 0, items: [], bossKills: 0 });
  });

  it('menghitung bos yang dikalahkan', () => {
    const g = new Game();
    g.start(setup('archer'));
    g.spawnEnemy('boss').hp = 0;
    g.step(1 / 60);
    expect(g.result().bossKills).toBe(1);
  });

  it('menyerah mengakhiri ronde tanpa kehilangan hadiah', () => {
    const g = simulate('warrior', 20);
    const hp = g.stats.hp;
    const before = g.result();
    g.surrender();
    expect(g.state).toBe(ST.OVER);
    expect(g.stats.hp).toBe(hp);
    expect(g.result()).toEqual(before);
  });
});

describe('stat kelas', () => {
  it('ronde dimulai dengan stat akhir karakter', () => {
    const g = new Game();
    const stats = { ...CLASS_BASE, ...CLASSES.warrior.stats, maxHp: 260 };
    g.start({ classId: 'warrior', stats });
    expect(g.stats.hp).toBe(260);
    expect(g.stats.def).toBe(2);
  });

  it('def mengurangi damage sentuh (minimal 1)', () => {
    const g = new Game();
    g.start({ ...setup('warrior'), stats: { ...setup('warrior').stats, def: 5 } });
    g.spawnT = 1e9;
    const e = g.spawnEnemy('slink'); // dmg 8
    e.x = 0; e.y = 0;
    g.step(1 / 60);
    expect(g.stats.hp).toBe(140 - 3);
  });
});
