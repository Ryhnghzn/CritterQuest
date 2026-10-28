import { describe, it, expect, vi } from 'vitest';
vi.mock('../core/audio.js', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { REGIONS, FIELD, regionById } from '../data/world.js';
import { buildFieldMap, blocked, sample } from './fieldmap.js';
import { fieldLevel, fieldScale, spawnPack } from './field.js';
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
