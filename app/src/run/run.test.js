import { describe, it, expect } from 'vitest';
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { expToNext } from '../meta/character.js';

const setup = (classId) => ({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats } });
const CLASS_IDS = Object.keys(CLASSES);

// Plays a run headlessly: circle around the room attacking.
function simulate(classId, seconds) {
  const g = new Game();
  g.start(setup(classId));
  for (let i = 0; i < seconds * 60 && g.state !== ST.OVER; i++) {
    g.intent = { move: { x: Math.cos(g.time * 0.9), y: Math.sin(g.time * 0.9) }, aimAt: null, dodge: false, attack: true };
    g.step(1 / 60);
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
    for (let l = 1; l < g.level; l++) total += expToNext(l);
    const r = g.result();
    expect(r.exp).toBe(total);
    expect(r).toEqual({ time: g.time, kills: g.kills, exp: total, gold: g.gold, items: [], bossKills: 0, floor: g.deepest, cleared: false });
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

describe('HP awal & potion di ronde', () => {
  const start = (over) => {
    const g = new Game();
    g.start({ ...setup('warrior'), ...over });
    g.spawnT = 1e9;
    return g;
  };
  const step = (g, intent = {}) => {
    g.intent = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, ...intent };
    g.step(1 / 60);
  };

  it('ronde dimulai dengan HP karakter saat ini', () => {
    expect(start({ hp: 40, potions: 2 }).stats.hp).toBe(40);
    expect(start({}).stats.hp).toBe(140);
  });

  it('potion memulihkan 40% HP maks, jeda 1 detik, jumlah berkurang', () => {
    const g = start({ hp: 20, potions: 2 });
    step(g, { potion: true });
    expect(g.stats.hp).toBeCloseTo(76);
    expect(g.potions).toBe(1);
    step(g, { potion: true });
    expect(g.potions).toBe(1);
    for (let i = 0; i < 61; i++) step(g);
    step(g, { potion: true });
    expect(g.potions).toBe(0);
    expect(g.stats.hp).toBe(132);
  });

  it('tanpa potion tidak terjadi apa-apa', () => {
    const g = start({ hp: 20, potions: 0 });
    step(g, { potion: true });
    expect(g.stats.hp).toBe(20);
  });
});

describe('level karakter di dungeon', () => {
  const start = (level = 1, exp = 0) => {
    const g = new Game();
    g.start({ ...setup('warrior'), level, exp });
    g.spawnT = 1e9;
    return g;
  };
  const gem = (g, v) => { g.gems.push({ x: g.px, y: g.py, v, mag: false, big: false, t: 0 }); g.step(1 / 60); };

  it('permata EXP menambah EXP karakter dan naik level tanpa menghentikan permainan', () => {
    const g = start(2, 60); // butuh 70
    gem(g, 15);
    expect(g.level).toBe(3);
    expect(g.xp).toBe(5);
    expect(g.levelsGained).toBe(1);
    expect(g.state).toBe(ST.PLAY);
    expect(g.result().exp).toBe(15);
  });

  it('setStats: HP sekarang tetap, ditambah kenaikan HP maks', () => {
    const g = start();
    g.stats.hp = 50;
    g.setStats({ ...setup('warrior').stats, maxHp: 160 });
    expect(g.stats.hp).toBe(70);
    expect(g.stats.maxHp).toBe(160);
  });
});
