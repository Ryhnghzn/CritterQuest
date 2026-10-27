import { describe, it, expect, vi } from 'vitest';
vi.mock('../core/audio.js', () => ({ sfx: new Proxy({}, { get: () => () => {} }) }));
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { REGIONS, FIELD, regionById } from '../data/world.js';
import { buildFieldMap, blocked, distToLine } from './fieldmap.js';
import { fieldLevel, fieldScale, spawnPack } from './field.js';
import { fogSize } from '../meta/world.js';

const forest = regionById('forest');
const setup = (o = {}) => ({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, region: 'forest', ...o });
const idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 };

describe('peta wilayah', () => {
  const map = buildFieldMap(forest);
  it('tetap sama tiap dibangun (seed)', () => {
    expect(map.solids.length).toBeGreaterThan(400);
    expect(buildFieldMap(forest)).toBe(map);
  });
  it('jalan setapak & jembatan bebas rintangan; sungai menghalangi', () => {
    for (let i = 0; i <= 200; i++) {
      // walk along the path: never blocked (bridges cross the river)
      const k = i / 200, seg = Math.min(forest.path.length - 2, Math.floor(k * (forest.path.length - 1)));
      const f = k * (forest.path.length - 1) - seg;
      const [ax, ay] = forest.path[seg], [bx, by] = forest.path[seg + 1];
      expect(blocked(map, ax + (bx - ax) * f, ay + (by - ay) * f, 12)).toBe(false);
    }
    expect(blocked(map, 2283, 2100, 12)).toBe(true); // river away from the bridges
    expect(blocked(map, map.start.x, map.start.y, 12)).toBe(false);
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
    g.px = 1600; g.py = 1010;
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
    g.px = 1600; g.py = 1010;
    spawnPack(g);
    const n = g.enemies.length;
    g.enemies[0].x = g.px + FIELD.despawn + 200;
    g.intent = idle; g.packT = 99;
    g.step(1 / 60);
    expect(g.enemies.length).toBe(n - 1);
  });
  it('keluar di tepi barat; tepi timur tertutup bila kota belum siap', () => {
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
    h.px = forest.w - FIELD.exitZone + 5; h.py = 1100;
    h.step(1 / 60);
    expect(h.state).toBe(ST.PLAY);
    expect(h.px).toBeLessThan(forest.w - FIELD.exitZone);
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
  it('semua wilayah yang siap punya data peta', () => {
    for (const r of REGIONS.filter((x) => x.ready)) {
      expect(distToLine(r.path, 0, r.path[0][1])).toBe(0);
      expect(r.levels[0]).toBeLessThan(r.levels[1]);
    }
  });
});
