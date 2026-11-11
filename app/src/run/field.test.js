import { describe, it, expect, vi } from 'vitest';
vi.mock('../core/audio.js', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { REGIONS, FIELD, regionById } from '../data/world.js';
import { WORLD, ECLIPSE } from '../data/worldmap.js';
import { buildWorld, blocked, pushOut, landAt, zoneToWorld, zoneAt, townGate } from './worldmap.js';
import { fieldScale, spawnPack, spawnGroup, spawnGuardian, questDrop, townExit } from './field.js';
import { ENEMIES } from '../data/enemies.js';
import { fire } from './enemies.js';
import { HORDE } from '../data/balance.js';
import { TREASURE } from '../data/world.js';
import { fogSize } from '../meta/world.js';

const world = buildWorld();
const forest = regionById('forest');
// out of Rimbawana's gate, in the forest
const setup = (o = {}) => ({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, at: 'rimba', ...o });
const idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 };
// a spot on the forest's main road, halfway out
const mid = () => { const r = world.roads.find((q) => q.kind === 'main' && q.zone === 'forest'); return r.pts[Math.floor(r.pts.length / 2)]; };

describe('mode dunia', () => {
  it('level musuh naik dari Kota Awal ke kota besar', () => {
    const g = new Game();
    g.explore(setup());
    expect(g.region.id).toBe('forest');
    expect(fieldScale(1)).toEqual({ hp: 1, dmg: 1, reward: 1 });
    expect(fieldScale(26).hp).toBeCloseTo(6, 5);
  });
  it('mulai di depan gerbang kota, kelompok musuh muncul di luar layar & dibatasi', () => {
    const g = new Game();
    g.explore(setup());
    expect(g.state).toBe(ST.PLAY);
    expect(g.field).toBe(true);
    const out = townExit(world, 'rimba');
    expect([g.px, g.py]).toEqual([out.x, out.y]);
    [g.px, g.py] = mid();
    for (let i = 0; i < 30; i++) spawnPack(g);
    expect(g.enemies.length).toBeLessThanOrEqual(FIELD.maxEnemies);
    expect(g.enemies.length).toBeGreaterThan(0);
    for (const e of g.enemies) {
      expect(Math.hypot(e.x - g.px, e.y - g.py)).toBeGreaterThan(FIELD.spawnMin - 120);
      expect(e.level).toBeGreaterThanOrEqual(1);
    }
  });
  it('dataran Kota Awal tenang: tidak ada kawanan, namanya sendiri', () => {
    const g = new Game();
    g.explore(setup({ at: 'home' }));
    expect(g.place).toBe('hub');
    for (let i = 0; i < 30; i++) spawnPack(g);
    expect(g.enemies).toHaveLength(0);
  });
  it('kawanan 5–10, HP × HORDE.hp (spec §33.3)', () => {
    const g = new Game();
    g.explore(setup());
    [g.px, g.py] = mid();
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
    const [mx, my] = mid();
    spawnGuardian(g, { x: mx, y: my, zone: 'forest', lord: false });
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
    [g.px, g.py] = mid();
    spawnPack(g);
    const n = g.enemies.length;
    g.enemies[0].x = g.px + FIELD.despawn + 200;
    g.intent = idle; g.packT = 99;
    g.step(1 / 60);
    expect(g.enemies.length).toBe(n - 1);
  });
  it('berjalan ke gerbang kota mana pun = masuk kota itu', () => {
    const g = new Game();
    g.explore(setup({ at: 'home' }));
    g.intent = idle; g.packT = 99;
    const t = world.towns.beku;
    g.px = t.x; g.py = t.y;
    g.step(1 / 60);
    expect(g.state).toBe(ST.OVER);
    expect(g.exitTo).toBe('beku');
  });
  it('keluar dari kota tidak langsung masuk lagi, sampai menjauh dulu', () => {
    const g = new Game();
    g.explore(setup());
    g.intent = idle; g.packT = 99;
    const t = world.towns.rimba;
    g.px = t.x + t.out[0] * 60; g.py = t.y + t.out[1] * 60;
    g.step(1 / 60);
    expect(g.state).toBe(ST.PLAY);
    g.px = t.x + t.out[0] * 600; g.py = t.y + t.out[1] * 600; g.step(1 / 60);
    g.px = t.x; g.py = t.y; g.step(1 / 60);
    expect(g.exitTo).toBe('rimba');
  });
  it('pindah zona: judul baru & tanda simpan; Tanah Gerhana tersegel sampai 5 pecahan', () => {
    const g = new Game();
    g.explore(setup({ at: 'home' }));
    g.intent = idle; g.packT = 99;
    const p = zoneToWorld('ice', 0.2, 0.5);
    g.px = p.x; g.py = p.y; g.step(1 / 60);
    expect(g.region.id).toBe('ice');
    expect(['forest', 'desert', 'volcano']).toContain(g.zoneChanged); // the meadow's quadrant left behind
    expect(g.place).toBe('ice');
    const e = zoneToWorld('eclipse', 0.5, 0.5);
    g.px = e.x; g.py = e.y; g.step(1 / 60);
    expect(g.region.id).not.toBe('eclipse');
    expect(g.py).toBeLessThan(ECLIPSE.y0);
    const h = new Game();
    h.explore(setup({ at: 'home', eclipseOpen: true }));
    h.intent = idle; h.packT = 99;
    h.px = e.x; h.py = e.y; h.step(1 / 60);
    expect(h.region.id).toBe('eclipse');
    expect(h.inEclipse).toBe(true);
  });
  it('membuka kabut di sekitar pemain', () => {
    const fog = new Uint8Array(fogSize(WORLD).bytes);
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
  it('bos & penjaga wilayah dihitung sebagai gulungan mount; takeProgress mengosongkan', () => {
    const g = new Game();
    g.explore(setup());
    g.killEnemy({ ...g.spawnEnemy('boss'), boss: true });
    g.killEnemy({ ...g.spawnEnemy('slink'), mini: true });
    g.killEnemy({ ...g.spawnEnemy('slink') });
    expect(g.takeProgress().mountRolls).toEqual({ any: 2, eclipse: 0 });
    expect(g.takeProgress().mountRolls).toEqual({ any: 0, eclipse: 0 });
    const h = new Game();
    h.explore(setup({ at: zoneToWorld('eclipse', 0.5, 0.5), eclipseOpen: true }));
    h.killEnemy({ ...h.spawnEnemy('boss'), boss: true });
    expect(h.result().mountRolls).toEqual({ any: 0, eclipse: 1 });
    const d = new Game();
    d.start({ ...setup(), eclipse: true });
    d.killEnemy({ ...d.spawnEnemy('boss'), boss: true });
    expect(d.result().mountRolls).toEqual({ any: 0, eclipse: 1 });
  });
  it('gerbang dungeon: ditemukan dari dekat, bisa dimasuki bila berdiri di dekatnya', () => {
    const g = new Game();
    const [gx, gy] = mid();
    g.explore(setup({ gates: [{ dungeon: 'shadow', x: gx, y: gy, found: false }] }));
    g.intent = idle; g.packT = 99;
    g.px = gx - FIELD.fogRadius + 20; g.py = gy;
    g.step(1 / 60);
    expect(g.gatesFound).toEqual(['shadow']);
    expect(g.nearGate).toBe(null);
    g.px = gx - 40;
    g.step(1 / 60);
    expect(g.nearGate?.dungeon).toBe('shadow');
  });
  it('mulai di depan gerbang bila diminta', () => {
    const g = new Game();
    g.explore(setup({ at: { x: 14000, y: 35000 } }));
    expect([g.px, g.py]).toEqual([14000, 35000]);
  });
});

describe('harta karun & mini bos (§25.3)', () => {
  it('setiap wilayah punya harta di tempat tetap, di luar jalan, tidak tertutup benda padat', async () => {
    const { treasureSpots } = await import('../meta/world.js');
    const { TREASURE } = await import('../data/world.js');
    const { armFrac } = await import('./worldmap.js');
    for (const r of REGIONS) {
      const spots = treasureSpots(r);
      expect(spots).toHaveLength(TREASURE.count);
      expect(spots.filter((s) => s.lord)).toHaveLength(1);
      for (const s of spots) {
        expect(blocked(world, s.x, s.y, 40)).toBe(false);
        expect(zoneAt(world, s.x, s.y)).toBe(r.id);
      }
      const fx = spots.map((s) => armFrac(r.id, s.x, s.y).fx);
      expect(fx).toEqual([...fx].sort((a, b) => a - b));
    }
  });

  it('mendekat → penjaga muncul; peti terkunci sampai penjaga tumbang; menyentuh peti → hadiah, tercatat', async () => {
    const { TREASURE } = await import('../data/world.js');
    const g = new Game();
    g.explore(setup());
    g.intent = idle; g.packT = 999; g.god = true;
    const tr = g.treasures.find((q) => q.zone === 'forest' && q.idx === 0);
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
    expect(g.treasuresOpened).toEqual([{ zone: 'forest', idx: 0 }]);
    expect(g.gemsFound.length).toBeGreaterThan(0);
    expect(g.gold).toBeGreaterThan(0);
  });

  it('peti yang sudah dibuka tidak memunculkan penjaga lagi', () => {
    const g = new Game();
    g.explore(setup({ opened: { forest: [0, 1, 2, 3] } }));
    g.intent = idle; g.packT = 999;
    const last = g.treasures.find((q) => q.zone === 'forest' && q.idx === 3);
    g.px = last.x; g.py = last.y + 30;
    g.step(1 / 60);
    expect(g.treasures.filter((t) => t.zone === 'forest').every((t) => t.state === 'open')).toBe(true);
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
  const lakeMap = () => ({ map: world, lake: world.lakes.map((l) => world.fixed.find((s) => s.kind === 'lake' && s.x === l.x)).find(Boolean) });
  it('pushOut biasa mendorong keluar danau, terbang tidak', () => {
    const { map, lake } = lakeMap();
    const a = { x: lake.x, y: lake.y }, b = { x: lake.x, y: lake.y };
    pushOut(map, a, 12); pushOut(map, b, 12, true);
    expect(Math.hypot(a.x - lake.x, a.y - lake.y)).toBeGreaterThanOrEqual(lake.r);
    expect(b).toEqual({ x: lake.x, y: lake.y });
  });
  it('terbang tetap ditahan pohon & batu', async () => {
    const { map } = lakeMap();
    const [mx, my] = mid();
    const { chunksNear } = await import('./worldmap.js');
    const tree = chunksNear(map, mx, my).flatMap((c) => c.solids).find((s) => s.kind === 'tree');
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
    const lake = lakeMap().lake;
    g.px = lake.x; g.py = lake.y; g.enemies.length = 0; g.step(1 / 60);
    expect(Math.hypot(g.px - lake.x, g.py - lake.y)).toBeLessThan(lake.r);
    g.invuln = 0; g.dodgeInv = 0; g.hurtPlayer(5); g.step(1 / 60);
    expect(blocked(g.fmap, g.px, g.py, 12)).toBe(false);
  });
});

describe('rombongan musuh khusus (spec §41.1)', () => {
  it('totem datang sendiri bersama musuh lain; hyena 4–6; kembar berpasangan', () => {
    const g = new Game();
    g.explore(setup());
    const tot = spawnGroup(g, g.px + 300, g.py, 8, 'forest', 'embertotem');
    expect(tot.length).toBe(8);
    expect(tot.filter((e) => e.type === 'embertotem').length).toBe(1);
    expect(tot.every((e) => e.type === 'embertotem' || !ENEMIES[e.type].single)).toBe(true);
    for (let i = 0; i < 10; i++) {
      const h = spawnGroup(g, g.px + 300, g.py, 10, 'forest', 'hyena');
      expect(h.length).toBeGreaterThanOrEqual(4);
      expect(h.length).toBeLessThanOrEqual(6);
    }
    expect(spawnGroup(g, g.px + 300, g.py, 9, 'forest', 'voidtwin').length).toBe(2);
  });
});

describe('Kota Awal bertembok (§40 C3)', () => {
  it('tembok padat, 4 gerbang terbuka; masuk lewat gerbang mana pun, keluar lewat gerbang yang sama', () => {
    const home = world.towns.home;
    expect(home.gates).toHaveLength(4);
    expect(blocked(world, home.x, home.y, 12)).toBe(true);
    for (let i = 0; i < 4; i++) {
      const out = townExit(world, 'home', i);
      expect(blocked(world, out.x, out.y, 12)).toBe(false);
      const g = new Game();
      g.explore(setup({ at: 'home', gate: i }));
      expect([g.px, g.py]).toEqual([out.x, out.y]);
      g.intent = idle; g.packT = 99;
      const other = home.gates[(i + 1) % 4];
      g.px = other.x; g.py = other.y; g.step(1 / 60);
      expect(g.exitTo).toBe('home');
      expect(g.exitGate).toBe((i + 1) % 4);
    }
  });
});
