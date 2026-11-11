import { describe, it, expect, vi } from 'vitest';
vi.mock('../core/audio.js', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { REGIONS, FIELD, regionById } from '../data/world.js';
import { buildFieldMap, blocked, sample, pushOut, landAt } from './fieldmap.js';
import { fieldLevel, fieldScale, spawnPack, spawnGuardian, questDrop } from './field.js';
import { fire } from './enemies.js';
import { HORDE } from '../data/balance.js';
import { TREASURE } from '../data/world.js';
import { fogSize } from '../meta/world.js';

const forest = regionById('forest');
const setup = (o = {}) => ({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, region: 'forest', ...o });
const idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 };

describe('peta wilayah', () => {
  it('keempat wilayah dibangun cepat & tetap sama (seed)', () => {
    const t0 = Date.now();
    for (const r of REGIONS) {
      const m = buildFieldMap(r);
      expect(m.solids.length).toBeGreaterThan(1000);
      expect(buildFieldMap(r)).toBe(m);
    }
    expect(Date.now() - t0).toBeLessThan(4000);
  });
  it('semua jalan bebas rintangan (jembatan menyeberangi sungai); sungai menghalangi', () => {
    for (const r of REGIONS) {
      const map = buildFieldMap(r);
      for (const p of map.paths) for (const [x, y] of sample(p, 50)) {
        if (x < 60 || x > r.w - 60 || y < 60 || y > r.h - 60) continue;
        expect(blocked(map, x, y, 12)).toBe(false);
      }
      const water = map.solids.find((s) => s.kind === 'water' && map.bridges.every(([bx, by]) => Math.hypot(bx - s.x, by - s.y) > 400));
      if (water) expect(blocked(map, water.x, water.y, 12)).toBe(true);
      expect(blocked(map, map.start.x, map.start.y, 12)).toBe(false);
    }
  });
});

describe('mode wilayah', () => {
  it('level musuh naik dari barat ke timur', () => {
    expect(fieldLevel(forest, 0)).toBe(1);
    expect(fieldLevel(forest, forest.w)).toBe(15);
    expect(fieldScale(1)).toEqual({ hp: 1, dmg: 1, reward: 1 });
    expect(fieldScale(26).hp).toBeCloseTo(6, 5);
  });
  it('mulai di tepi barat, kelompok musuh muncul di luar layar & dibatasi', () => {
    const g = new Game();
    g.explore(setup());
    expect(g.state).toBe(ST.PLAY);
    expect(g.field).toBe(true);
    g.px = 6000; g.py = g.fmap.paths[0][5][1];
    for (let i = 0; i < 30; i++) spawnPack(g);
    expect(g.enemies.length).toBeLessThanOrEqual(FIELD.maxEnemies);
    expect(g.enemies.length).toBeGreaterThan(0);
    for (const e of g.enemies) {
      expect(Math.hypot(e.x - g.px, e.y - g.py)).toBeGreaterThan(FIELD.spawnMin - 120);
      expect(e.level).toBeGreaterThanOrEqual(1);
    }
  });
  it('kawanan 5–10, HP × HORDE.hp (spec §33.3)', () => {
    const g = new Game();
    g.explore(setup());
    g.px = 6000; g.py = g.fmap.paths[0][5][1];
    let n = 0;
    for (let i = 0; i < 20 && !n; i++) n = spawnPack(g);
    expect(n).toBeGreaterThanOrEqual(FIELD.pack[0]);
    expect(n).toBeLessThanOrEqual(FIELD.pack[1]);
    expect(FIELD.pack).toEqual([5, 10]);
    const e = g.enemies.find((m) => !m.elite);
    const plain = g.spawnEnemy(e.type).maxHp;
    expect(e.maxHp).toBeCloseTo(plain * fieldScale(e.level).hp * HORDE.hp);
  });
  it('penjaga harta tidak dilemahkan HORDE.hp, pengawalnya iya', () => {
    const g = new Game();
    g.explore(setup());
    g.enemies.length = 0;
    spawnGuardian(g, { x: 6000, y: g.fmap.paths[0][5][1], lord: false });
    const [guard, ...escort] = g.enemies;
    const plain = g.spawnEnemy(guard.type).maxHp, sc = fieldScale(guard.level);
    expect(guard.maxHp).toBeCloseTo(plain * sc.hp * TREASURE.guard.hp);
    for (const e of escort) if (!e.elite) expect(e.maxHp).toBeCloseTo(plain * sc.hp * HORDE.hp);
  });
  it('barang quest jatuh dengan peluang × HORDE.reward', () => {
    const g = new Game();
    g.explore(setup());
    g.questDrops = [{ item: 'goo', enemy: '*', chance: 1 }];
    const e = g.spawnEnemy('slink');
    for (let i = 0; i < 2000; i++) questDrop(g, e, 'slink');
    expect(g.questItems.goo / 2000).toBeCloseTo(HORDE.reward, 1);
  });
  it('musuh yang tertinggal jauh hilang', () => {
    const g = new Game();
    g.explore(setup());
    g.px = 6000; g.py = g.fmap.paths[0][5][1];
    spawnPack(g);
    const n = g.enemies.length;
    g.enemies[0].x = g.px + FIELD.despawn + 200;
    g.intent = idle; g.packT = 99;
    g.step(1 / 60);
    expect(g.enemies.length).toBe(n - 1);
  });
  it('keluar di tepi barat (kota asal) dan tepi timur (kota tujuan)', () => {
    const g = new Game();
    g.explore(setup());
    g.intent = idle; g.packT = 99;
    g.px = FIELD.exitZone - 5;
    g.step(1 / 60);
    expect(g.state).toBe(ST.OVER);
    expect(g.exitTo).toBe('west');
    const h = new Game();
    h.explore(setup());
    h.intent = idle; h.packT = 99;
    h.px = forest.w - FIELD.exitZone + 5; h.py = h.fmap.end.y;
    h.step(1 / 60);
    expect(h.state).toBe(ST.OVER);
    expect(h.exitTo).toBe('east');
  });
  it('tepi di luar ujung jalan adalah dinding, bukan jalan ke kota', () => {
    const g = new Game();
    g.explore(setup());
    g.intent = idle; g.packT = 99;
    g.px = FIELD.exitZone - 5; g.py = g.fmap.start.y + FIELD.exitHalf + 200;
    g.step(1 / 60);
    expect(g.state).toBe(ST.PLAY);
    expect(g.px).toBeGreaterThanOrEqual(FIELD.exitZone);
    const h = new Game();
    h.explore({ ...setup(), at: 'east' });
    h.intent = idle; h.packT = 99;
    h.px = forest.w - FIELD.exitZone + 5; h.py = h.fmap.end.y - FIELD.exitHalf - 200;
    h.step(1 / 60);
    expect(h.state).toBe(ST.PLAY);
    expect(h.px).toBeLessThanOrEqual(forest.w - FIELD.exitZone);
  });
  it('masuk dari timur tidak langsung keluar lagi', () => {
    const g = new Game();
    g.explore({ ...setup(), at: 'east' });
    g.intent = idle; g.packT = 99;
    g.step(1 / 60);
    expect(g.state).toBe(ST.PLAY);
    expect(g.px).toBeGreaterThan(forest.w * 0.9);
  });
  it('membuka kabut di sekitar pemain', () => {
    const fog = new Uint8Array(fogSize(forest).bytes);
    const g = new Game();
    g.explore(setup({ fog }));
    expect(fog.some((b) => b)).toBe(true);
  });
  it('takeProgress menyerahkan hasil dan mulai dari nol', () => {
    const g = new Game();
    g.explore(setup());
    g.gold = 30; g.expGained = 12.5; g.kills = 4; g.killsBy = { slink: 4 };
    const p = g.takeProgress();
    expect(p).toMatchObject({ gold: 30, exp: 12, kills: 4, killsBy: { slink: 4 } });
    expect(g.gold).toBe(0);
    expect(g.expGained).toBeCloseTo(0.5);
    expect(g.takeProgress().kills).toBe(0);
  });
  it('gerbang dungeon: ditemukan dari dekat, bisa dimasuki bila berdiri di dekatnya', () => {
    const g = new Game();
    g.explore(setup({ gates: [{ dungeon: 'shadow', x: 3000, y: 6000, found: false }] }));
    g.intent = idle; g.packT = 99;
    g.px = 3000 - FIELD.fogRadius + 20; g.py = 6000;
    g.step(1 / 60);
    expect(g.gatesFound).toEqual(['shadow']);
    expect(g.nearGate).toBe(null);
    g.px = 3000 - 40;
    g.step(1 / 60);
    expect(g.nearGate?.dungeon).toBe('shadow');
  });
  it('mulai di depan gerbang bila diminta', () => {
    const g = new Game();
    g.explore(setup({ at: { x: 4000, y: 5000 } }));
    expect([g.px, g.py]).toEqual([4000, 5000]);
  });
});

describe('harta karun & mini bos (§25.3)', () => {
  it('setiap wilayah punya harta di tempat tetap, di luar jalan, tidak tertutup benda padat', async () => {
    const { treasureSpots } = await import('../meta/world.js');
    const { TREASURE } = await import('../data/world.js');
    for (const r of REGIONS) {
      const spots = treasureSpots(r), map = buildFieldMap(r);
      expect(spots).toHaveLength(TREASURE.count);
      expect(spots.filter((s) => s.lord)).toHaveLength(1);
      for (const s of spots) {
        expect(blocked(map, s.x, s.y, 40)).toBe(false);
        expect(map.pathDist(s.x, s.y)).toBeGreaterThanOrEqual(TREASURE.offPath[0]);
      }
      expect(spots.map((s) => s.x)).toEqual([...spots.map((s) => s.x)].sort((a, b) => a - b));
    }
  });

  it('mendekat → penjaga muncul; peti terkunci sampai penjaga tumbang; menyentuh peti → hadiah, tercatat', async () => {
    const { TREASURE } = await import('../data/world.js');
    const g = new Game();
    g.explore(setup());
    g.intent = idle; g.packT = 999; g.god = true;
    const tr = g.treasures[0];
    g.px = tr.x - TREASURE.triggerR + 40; g.py = tr.y;
    g.step(1 / 60);
    expect(tr.state).toBe('guarded');
    const boss = tr.guard;
    expect(boss.mini).toBe(true);
    expect(boss.maxHp).toBeGreaterThan(5 * 20);
    g.px = tr.x; g.py = tr.y + 30;
    for (let i = 0; i < 5; i++) g.step(1 / 60);
    expect(tr.state).toBe('guarded'); // still locked
    boss.hp = 0;
    for (let i = 0; i < 10; i++) g.step(1 / 60);
    expect(['unlocked', 'open']).toContain(tr.state);
    for (let i = 0; i < 10; i++) g.step(1 / 60);
    expect(tr.state).toBe('open');
    expect(g.treasuresOpened).toEqual([0]);
    expect(g.gemsFound.length).toBeGreaterThan(0);
    expect(g.gold).toBeGreaterThan(0);
  });

  it('peti yang sudah dibuka tidak memunculkan penjaga lagi', () => {
    const g = new Game();
    g.explore(setup({ opened: [0, 1, 2, 3] }));
    g.intent = idle; g.packT = 999;
    g.px = g.treasures[3].x; g.py = g.treasures[3].y + 30;
    g.step(1 / 60);
    expect(g.treasures.every((t) => t.state === 'open')).toBe(true);
    expect(g.enemies).toHaveLength(0);
  });
});

describe('musuh biome (§25.4)', () => {
  const fresh = () => { const g = new Game(); g.explore(setup()); g.intent = idle; g.packT = 999; g.god = false; return g; };

  it('serangan es memperlambat langkah', () => {
    const g = fresh();
    const x0 = g.px;
    g.intent = { ...idle, move: { x: 1, y: 0 } };
    g.step(0.1);
    const normal = g.px - x0;
    expect(g.hurtPlayer(10, { slow: [0.5, 2] })).toBe(true);
    const x1 = g.px;
    g.step(0.1);
    expect(g.px - x1).toBeCloseTo(normal * 0.5, 1);
  });

  it('racun & api memberi damage berkala yang menembus kebal sesaat', () => {
    const g = fresh();
    g.hurtPlayer(20, { poison: [0.5, 2] });
    expect(g.dotKind).toBe('poison');
    const hp = g.stats.hp;
    for (let i = 0; i < 60; i++) g.step(1 / 60);
    expect(g.stats.hp).toBeLessThan(hp - 1);
    for (let i = 0; i < 120; i++) g.step(1 / 60);
    expect(g.dotT).toBeLessThanOrEqual(0);
  });

  it('penyebab tumbang tercatat: musuh terakhir yang memukul, racun, atau menyerah', () => {
    const g = fresh();
    expect(g.deathCause()).toEqual({ foe: null, dot: null, surrender: false });
    g.hurtPlayer(1, null, 'slink');
    g.invuln = 0;
    g.hurtPlayer(9999, null, 'tank');
    expect(g.state).toBe(ST.OVER);
    expect(g.deathCause()).toEqual({ foe: 'tank', dot: null, surrender: false });

    const p = fresh();
    p.hurtPlayer(1, { poison: [50, 5] }, 'scorpion');
    for (let i = 0; i < 600 && p.state === ST.PLAY; i++) p.step(1 / 60);
    expect(p.deathCause()).toEqual({ foe: 'scorpion', dot: 'poison', surrender: false });

    const s = fresh();
    s.surrender();
    expect(s.deathCause().surrender).toBe(true);
  });

  it('tembakan & ledakan musuh membawa jenis musuhnya', () => {
    const g = fresh();
    const e = g.spawnEnemy('slink');
    e.x = g.px + 600; e.y = g.py; e.dmg = 0;
    fire(g, g.px, g.py, 0, { speed: 0, r: 10, dmg: 9999 }, e.type);
    g.step(1 / 60);
    expect(g.deathCause().foe).toBe('slink');
  });

  it('cacing pasir tidak bisa dipukul saat menyelam, lalu muncul dengan semburan', () => {
    const g = fresh();
    const w = g.spawnEnemy('sandworm');
    w.x = g.px + 300; w.y = g.py;
    g.step(1 / 60);
    expect(w.hidden).toBe(true);
    const hp = w.hp;
    g.damageEnemy({ mult: 5 }, w);
    expect(w.hp).toBe(hp);
    let rose = false;
    for (let i = 0; i < 60 * 5 && !rose; i++) { g.step(1 / 60); if (w.mode === 'up') rose = true; }
    expect(rose).toBe(true);
    expect(w.hidden).toBe(false);
  });

  it('varian biome dihitung di bestiari musuh asalnya', () => {
    const g = fresh();
    const e = g.spawnEnemy('frostslink');
    g.killEnemy(e);
    expect(g.killsBy.slink).toBe(1);
    expect(g.killsBy.frostslink).toBeUndefined();
  });

  it('setiap wilayah hanya memakai musuh yang ada', async () => {
    const { ENEMIES } = await import('../data/enemies.js');
    for (const r of REGIONS) for (const id of Object.keys(r.enemies)) expect(ENEMIES[id], `${r.id}:${id}`).toBeDefined();
  });
});

const exploreGame = (extra = {}) => { const g = new Game(); g.explore({ ...setup(), ...extra }); return g; };
const rideNow = (g) => {
  g.intent = { ...g.intent, mount: true }; g.enemies.length = 0; g.step(1 / 60);
  g.intent = { ...g.intent, mount: false };
  for (let i = 0; i < 70; i++) { g.enemies.length = 0; g.step(1 / 60); }
};

describe('terbang di atas air (§35.1)', () => {
  const lakeMap = () => { const map = buildFieldMap(forest); return { map, lake: map.solids.find((s) => s.kind === 'lake') }; };
  it('pushOut biasa mendorong keluar danau, terbang tidak', () => {
    const { map, lake } = lakeMap();
    const a = { x: lake.x, y: lake.y }, b = { x: lake.x, y: lake.y };
    pushOut(map, a, 12); pushOut(map, b, 12, true);
    expect(Math.hypot(a.x - lake.x, a.y - lake.y)).toBeGreaterThanOrEqual(lake.r);
    expect(b).toEqual({ x: lake.x, y: lake.y });
  });
  it('terbang tetap ditahan pohon & batu', () => {
    const { map } = lakeMap();
    const tree = map.solids.find((s) => s.kind === 'tree');
    const o = { x: tree.x + 1, y: tree.y };
    pushOut(map, o, 12, true);
    expect(Math.hypot(o.x - tree.x, o.y - tree.y)).toBeGreaterThanOrEqual(tree.r + 12 - 0.01);
  });
  it('landAt: turun di tengah danau → berdiri di daratan', () => {
    const { map, lake } = lakeMap();
    const o = { x: lake.x, y: lake.y };
    landAt(map, o, 12);
    expect(blocked(map, o.x, o.y, 12)).toBe(false);
  });
  it('Game: Naga menyeberang, jatuh di atas air → di darat', () => {
    const g = exploreGame({ mount: { id: 'dragon', rarity: 5, fly: true, skin: 0 } }); rideNow(g);
    const lake = g.fmap.solids.find((s) => s.kind === 'lake');
    g.px = lake.x; g.py = lake.y; g.enemies.length = 0; g.step(1 / 60);
    expect(Math.hypot(g.px - lake.x, g.py - lake.y)).toBeLessThan(lake.r);
    g.invuln = 0; g.dodgeInv = 0; g.hurtPlayer(5); g.step(1 / 60);
    expect(blocked(g.fmap, g.px, g.py, 12)).toBe(false);
  });
});
