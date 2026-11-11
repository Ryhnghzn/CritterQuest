import { describe, it, expect } from 'vitest';
import { Game, ST } from './run.js';
import { waveQueue, FLOOR_COUNT, makeElite, spawnFromLane, stepDungeon, hpMul, normalChance, addMats } from './dungeon.js';
import { HORDE } from '../data/balance.js';
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

// enemies a floor sends: normal counts × HORDE.count (spec §33.2), bosses as they are
const many = (type, n) => (ENEMIES[type].boss ? n : Math.max(1, Math.round(n * HORDE.count)));
const total = (floor) => FLOORS[floor - 1].waves.reduce((n, w) => n + Object.entries(w.mix).reduce((a, [ty, k]) => a + many(ty, k), 0), 0);

describe('bonus mount: matfind', () => {
  it('debu × (1 + matfind), dibulatkan', () => {
    const g = new Game();
    g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats, maxHp: 1e6 }, effects: { matfind: 0.05 } });
    const before = g.mats.dust;
    addMats(g, { dust: 20 });
    expect(g.mats.dust - before).toBe(21);
  });
});

describe('gelombang', () => {
  it('urutan muncul: bos dulu, jumlah musuh biasa × HORDE.count (spec §33.2)', () => {
    const q = waveQueue({ mix: { slink: 3, boss: 1, tank: 2 } });
    expect(q[0]).toBe('boss');
    expect(q.filter((t) => t === 'boss')).toHaveLength(1);
    expect(q.filter((t) => t === 'slink')).toHaveLength(Math.round(3 * HORDE.count));
    expect(q.filter((t) => t === 'tank')).toHaveLength(Math.round(2 * HORDE.count));
  });

  it('musuh keluar berkelompok dari satu lorong', () => {
    const g = start();
    g.spawnT = 0;
    stepDungeon(g, DT);
    expect(g.enemies.length).toBeGreaterThanOrEqual(HORDE.pack[0]);
    expect(g.enemies.length).toBeLessThanOrEqual(HORDE.pack[1]);
    expect(new Set(g.enemies.map((e) => e.lane)).size).toBe(1);
    expect(g.spawnT).toBeCloseTo(FLOORS[0].waves[0].every * HORDE.packGap);
  });

  it('bos keluar sendirian', () => {
    const g = start();
    g.queue = ['boss', 'slink', 'slink', 'slink']; g.queueI = 0; g.spawnT = 0;
    stepDungeon(g, DT);
    expect(g.enemies.map((e) => e.type)).toEqual(['boss']);
  });

  it('tidak ada kelompok baru selama HORDE.liveCap musuh hidup', () => {
    const g = start();
    for (let i = 0; i < HORDE.liveCap; i++) g.spawnEnemy('slink');
    g.spawnT = 0;
    stepDungeon(g, DT);
    expect(g.enemies.length).toBe(HORDE.liveCap);
    expect(g.queueI).toBe(0);
  });

  it('HP musuh gerombolan × HORDE.hp, bos tidak', () => {
    const g = start();
    const s = spawnFromLane(g, 'slink');
    if (!s.elite) expect(s.maxHp).toBeCloseTo(ENEMIES.slink.hp * hpMul(1, g.dungeon) * HORDE.hp);
    expect(spawnFromLane(g, 'boss').maxHp).toBeCloseTo(ENEMIES.boss.hp * hpMul(1, g.dungeon));
  });

  it('peluang elite × HORDE.eliteMul', () => {
    const g = start();
    g.floor = 5;
    let n = 0;
    for (let i = 0; i < 6000; i++) { g.enemies.length = 0; if (spawnFromLane(g, 'slink').elite) n++; }
    expect(n / 6000).toBeCloseTo(ELITE.chance[4] * HORDE.eliteMul, 1);
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

  it('gelombang berikut datang saat hidup ≤ HORDE.nextAt × ukuran gelombang', () => {
    const g = start();
    for (let i = 0; i < 60 * 30 && g.queueI < g.queue.length; i++) step(g);
    expect(g.queueI).toBe(g.queue.length); // the whole wave is out
    const keep = Math.ceil(g.queue.length * HORDE.nextAt);
    while (g.enemies.length > keep + 1) g.enemies.pop();
    for (const e of g.enemies) { e.speed = 0; e.dmg = 0; }
    for (let i = 0; i < 60 * (WAVE.gap + 0.5); i++) step(g);
    expect(g.wave).toBe(0); // one too many still alive
    g.enemies.pop();
    for (let i = 0; i < 60 * (WAVE.gap + 0.1); i++) step(g);
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

  it('peluang hadiah musuh biasa × HORDE.reward (spec §33.4)', () => {
    expect(normalChance(0.3)).toBeCloseTo(0.3 * HORDE.reward);
  });

  it('EXP musuh biasa × HORDE.reward, elite tidak; permata berdekatan bergabung', () => {
    const g = start();
    g.spawnT = 1e9;
    const a = g.spawnEnemy('slink'); Object.assign(a, { x: 300, y: 0, xp: 10, hp: 0 });
    step(g);
    const gems = () => g.gems.filter((x) => !x.coin && !x.gear && !x.heart);
    expect(gems()).toHaveLength(1);
    expect(gems()[0].v).toBeCloseTo(10 * HORDE.reward);
    const b = g.spawnEnemy('slink'); Object.assign(b, { x: 305, y: 0, xp: 10, hp: 0 });
    step(g);
    expect(gems()).toHaveLength(1); // merged into the resting gem
    expect(gems()[0].v).toBeCloseTo(20 * HORDE.reward);
    const el = g.spawnEnemy('slink'); makeElite(el); Object.assign(el, { x: -300, y: 0, xp: 10, hp: 0 });
    step(g);
    expect(gems().find((x) => x.x < 0).v).toBe(10);
  });

  it('sekitar 30% × HORDE.reward musuh biasa menjatuhkan 1–3 koin yang bisa dipungut', () => {
    const g = start();
    g.spawnT = 1e9;
    for (let i = 0; i < 400; i++) {
      const e = g.spawnEnemy('slink');
      e.x = 300; e.y = 0; e.hp = 0;
    }
    step(g);
    const coins = g.gems.filter((c) => c.coin);
    for (const c of coins) c.mag = true;
    expect(coins.length).toBeGreaterThan(400 * 0.12);
    expect(coins.length).toBeLessThan(400 * 0.28);
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

describe('material', () => {
  it('lantai bersih memberi debu; bos memberi kristal, inti & permata', () => {
    const g = start();
    clearFloor(g);
    expect(g.mats.dust).toBeGreaterThanOrEqual(3);
    g.spawnT = 1e9;
    const b = g.spawnEnemy('boss'); b.x = 300; b.hp = 0;
    step(g);
    expect(g.mats.crystal).toBe(3);
    expect(g.mats.core).toBe(1);
    expect(g.gemsFound).toHaveLength(1);
    expect(g.result().mats.crystal).toBe(3);
  });
});
