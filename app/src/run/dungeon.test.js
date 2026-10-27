import { describe, it, expect } from 'vitest';
import { Game, ST } from './run.js';
import { waveQueue, FLOOR_COUNT, makeElite } from './dungeon.js';
import { inside } from './room.js';
import { DUNGEONS } from '../data/dungeons.js';
import { ELITE } from '../data/items.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { ENEMIES } from '../data/enemies.js';
import { ROOM, WAVE, PORTAL, COINS } from '../data/dungeon.js';
const FLOORS = DUNGEONS[0].floors;

const DT = 1 / 60;
const IDLE = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false };

function start() {
  const g = new Game();
  g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats, maxHp: 1e6 } });
  return g;
}

function step(g, intent = IDLE) {
  g.intent = intent;
  g.step(DT);
}

// Kills everything as soon as it spawns until the floor is clear; returns how many died.
function clearFloor(g) {
  const before = g.kills;
  for (let i = 0; i < 60 * 600 && !g.floorClear; i++) {
    for (const e of g.enemies) e.hp = 0;
    step(g);
  }
  return g.kills - before;
}

// Waits for the portal to arm, then walks the player into it.
function enter(g, kind) {
  const p = g.portals.find((q) => q.kind === kind);
  g.px = 0; g.py = 200;
  for (let i = 0; i < 60 * PORTAL.armDelay + 2; i++) step(g);
  g.px = p.x; g.py = p.y;
  step(g);
}

const total = (floor) => FLOORS[floor - 1].waves.reduce((n, w) => n + Object.values(w.mix).reduce((a, b) => a + b, 0), 0);

describe('gelombang', () => {
  it('urutan muncul: bos dulu, jumlah sesuai data', () => {
    const q = waveQueue({ mix: { slink: 3, boss: 1, tank: 2 } });
    expect(q[0]).toBe('boss');
    expect(q.filter((t) => t === 'slink')).toHaveLength(3);
    expect(q.filter((t) => t === 'tank')).toHaveLength(2);
  });

  it('musuh muncul di ujung lorong lalu masuk ke ruangan', () => {
    const g = start();
    for (let i = 0; i < 60 * 3; i++) step(g);
    const e = g.enemies[0];
    expect(inside(g.room, e.x, e.y, 0)).toBe(false);
    expect(e.entering).toBe(true);
    const lane = e.lane;
    const side = Math.abs(-lane.dy * (e.x - lane.x) + lane.dx * (e.y - lane.y));
    expect(side).toBeLessThanOrEqual(ROOM.laneWidth / 2);
    for (let i = 0; i < 60 * 20 && e.entering; i++) step(g);
    expect(e.entering).toBe(false);
    for (let i = 0; i < 60 * 5; i++) step(g);
    for (const m of g.enemies) if (!m.entering) expect(inside(g.room, m.x, m.y, m.r - 1e-6)).toBe(true);
  });

  it('gelombang berikut menunggu sampai musuh tersisa sedikit', () => {
    const g = start();
    for (let i = 0; i < 60 * 30; i++) step(g);
    expect(g.wave).toBe(0);
    expect(g.enemies.length).toBeGreaterThan(WAVE.nextAlive);
    for (const e of g.enemies) e.hp = 0;
    for (let i = 0; i < 60 * (WAVE.gap + 0.5); i++) step(g);
    expect(g.wave).toBe(1);
  });

  it('HP musuh × (1 + 0,25 × (lantai − 1))', () => {
    const g = start();
    g.floor = 3;
    expect(g.spawnEnemy('slink').maxHp).toBeCloseTo(ENEMIES.slink.hp * 1.5);
  });
});

describe('lantai & portal', () => {
  it('lantai bersih bila semua gelombang muncul dan musuh habis → bonus koin, portal turun & pulang', () => {
    const g = start();
    expect(clearFloor(g)).toBe(total(1));
    expect(g.gold).toBeGreaterThanOrEqual(COINS.floorBonus);
    expect(g.portals.map((p) => p.kind).sort()).toEqual(['down', 'home']);
  });

  it('portal tidak langsung aktif di bawah kaki pemain', () => {
    const g = start();
    clearFloor(g);
    const down = g.portals.find((p) => p.kind === 'down');
    g.px = down.x; g.py = down.y;
    for (let i = 0; i < 60 * 3; i++) step(g);
    expect(g.floor).toBe(1);
  });

  it('portal biru → lantai berikut; HP, EXP dan koin terbawa', () => {
    const g = start();
    clearFloor(g);
    g.stats.hp = 500;
    const gold = g.gold, exp = g.expGained;
    enter(g, 'down');
    expect(g.floor).toBe(2);
    expect(g.state).toBe(ST.PLAY);
    expect(g.stats.hp).toBeGreaterThanOrEqual(500); // hearts may heal, never a refill
    expect(g.stats.hp).toBeLessThan(1000);
    expect(g.gold).toBeGreaterThanOrEqual(gold);
    expect(g.expGained).toBeGreaterThanOrEqual(exp);
    expect(g.enemies).toHaveLength(0);
    expect(g.portals).toHaveLength(0);
  });

  it('portal emas → perjalanan selesai, pulang', () => {
    const g = start();
    clearFloor(g);
    enter(g, 'down');
    clearFloor(g);
    enter(g, 'home');
    expect(g.state).toBe(ST.OVER);
    expect(g.returned).toBe(true);
    expect(g.result()).toMatchObject({ floor: 2, cleared: false });
  });

  it('lantai 5: bos, lalu hanya portal emas dan dungeon tamat', () => {
    const g = start();
    for (let f = 1; f < FLOOR_COUNT; f++) { clearFloor(g); enter(g, 'down'); }
    expect(g.floor).toBe(FLOOR_COUNT);
    clearFloor(g);
    expect(g.bossKills).toBe(1);
    expect(g.portals.map((p) => p.kind)).toEqual(['home']);
    expect(g.cleared).toBe(true);
    enter(g, 'home');
    expect(g.result()).toMatchObject({ floor: FLOOR_COUNT, cleared: true, bossKills: 1 });
  });

  it('mati tetap mencatat lantai terdalam', () => {
    const g = start();
    clearFloor(g);
    enter(g, 'down');
    g.die();
    expect(g.state).toBe(ST.OVER);
    expect(g.returned).toBe(false);
    expect(g.result().floor).toBe(2);
  });
});

describe('koin', () => {
  it('bos memberi 100 koin', () => {
    const g = start();
    g.spawnT = 1e9;
    g.spawnEnemy('boss').hp = 0;
    step(g);
    expect(g.gold).toBe(COINS.boss);
  });

  it('sekitar 30% musuh biasa menjatuhkan 1–3 koin yang bisa dipungut', () => {
    const g = start();
    g.spawnT = 1e9;
    for (let i = 0; i < 400; i++) {
      const e = g.spawnEnemy('slink');
      e.x = 300; e.y = 0; e.hp = 0;
    }
    step(g);
    const coins = g.gems.filter((c) => c.coin);
    for (const c of coins) c.mag = true;
    expect(coins.length).toBeGreaterThan(400 * 0.2);
    expect(coins.length).toBeLessThan(400 * 0.4);
    for (const c of coins) expect(c.v).toBeGreaterThanOrEqual(COINS.min), expect(c.v).toBeLessThanOrEqual(COINS.max);
    const sum = coins.reduce((n, c) => n + c.v, 0);
    for (let i = 0; i < 60 * 5; i++) step(g);
    expect(g.gold).toBe(sum);
  });

  it('pemungut sisa permata & koin saat masuk portal', () => {
    const g = start();
    clearFloor(g);
    g.gems.length = 0;
    g.gems.push({ x: 400, y: 400, v: 7, mag: false, coin: true, t: 0 });
    const gold = g.gold;
    g.stats.magnet = 0;
    enter(g, 'down');
    expect(g.gold).toBe(gold + 7);
    expect(g.gems).toHaveLength(0);
  });
});

describe('gear & elite', () => {
  it('elite: HP ×4, lebih besar, selalu menjatuhkan gear dan 10 koin', () => {
    const g = start();
    g.spawnT = 1e9;
    const e = g.spawnEnemy('slink');
    makeElite(e);
    expect(e.maxHp).toBeCloseTo(ENEMIES.slink.hp * ELITE.hpMul);
    expect(e.r).toBeCloseTo(ENEMIES.slink.r * ELITE.size);
    e.x = 300; e.hp = 0;
    step(g);
    expect(g.gems.filter((x) => x.gear)).toHaveLength(1);
    expect(g.gold).toBe(ELITE.gold);
  });

  it('elite muncul di gelombang', () => {
    const g = start();
    let elites = 0;
    for (let f = 1; f <= 3; f++) {
      for (let i = 0; i < 60 * 600 && !g.floorClear; i++) {
        for (const e of g.enemies) { if (e.elite) elites++; e.hp = 0; }
        step(g);
      }
      if (f < 3) enter(g, 'down');
    }
    expect(elites).toBeGreaterThan(0);
  });

  it('bos menjatuhkan 2 gear minimal Langka; peti lantai 1 gear', () => {
    const g = start();
    g.spawnT = 1e9;
    const b = g.spawnEnemy('boss'); b.x = 300; b.hp = 0;
    step(g);
    const drops = g.gems.filter((x) => x.gear);
    expect(drops).toHaveLength(2);
    for (const d of drops) expect(d.gear.rarity).toBeGreaterThanOrEqual(2);
    const g2 = start();
    clearFloor(g2);
    expect(g2.gems.filter((x) => x.gear).length).toBeGreaterThanOrEqual(1);
  });

  it('gear yang dipungut masuk hasil perjalanan', () => {
    const g = start();
    clearFloor(g);
    enter(g, 'home');
    const items = g.result().items;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0]).toHaveProperty('rarity');
  });
});
