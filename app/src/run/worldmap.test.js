import { describe, it, expect } from 'vitest';
import { WORLD, ARMS, ARM_IDS, ECLIPSE } from '../data/worldmap.js';
import { FIELD } from '../data/world.js';
import { sample } from './fieldmap.js';
import {
  buildWorld, buildChunk, zoneAt, zoneToWorld, armFrac, levelAt, townGate, blocked, pushOut,
  ensureChunks, chunksNear, freeSpot, inHub,
} from './worldmap.js';

const world = buildWorld();

describe('dunia: zona & koordinat', () => {
  it('tiap kota besar jatuh di zonanya; Kota Awal di dataran', () => {
    for (const zone of ARM_IDS) {
      const g = townGate(zone);
      expect(zoneAt(world, g.x, g.y)).toBe(zone);
    }
    expect(inHub(WORLD.cx, WORLD.cy)).toBe(true);
    expect(zoneAt(world, (ECLIPSE.x0 + ECLIPSE.x1) / 2, ECLIPSE.y0 + 3000)).toBe('eclipse');
  });
  it('zoneToWorld dan armFrac bolak-balik, dan titiknya tetap di zonanya', () => {
    for (const zone of [...ARM_IDS, 'eclipse']) {
      for (const [fx, fy] of [[0.1, 0.2], [0.5, 0.5], [0.9, 0.85], [0.3, 0.05]]) {
        const p = zoneToWorld(zone, fx, fy), f = armFrac(zone, p.x, p.y);
        expect(f.fx).toBeCloseTo(fx, 5);
        expect(f.fy).toBeCloseTo(fy, 5);
        expect(zoneAt(world, p.x, p.y)).toBe(zone);
      }
    }
  });
  it('level naik dari dataran ke kota besar sesuai rentang zona', () => {
    const near = zoneToWorld('forest', 0, 0.5), far = zoneToWorld('forest', 1, 0.5);
    expect(levelAt(world, near.x, near.y)).toBe(1);
    expect(levelAt(world, far.x, far.y)).toBe(15);
    const v = zoneToWorld('volcano', 0.5, 0.5);
    expect(levelAt(world, v.x, v.y)).toBe(40);
  });
});

describe('dunia: kerangka', () => {
  it('sama untuk seed yang sama, dibuat cepat', () => {
    expect(buildWorld()).toBe(world);
    const t0 = Date.now();
    const other = buildWorld(99);
    expect(Date.now() - t0).toBeLessThan(3000);
    expect(other.roads[0].pts).not.toEqual(world.roads[0].pts);
  });
  it('tiga perbatasan punya 2 penyeberangan, Hutan–Gunung Api tidak ada', () => {
    const by = (id) => world.borders.find((b) => b.id === id).crossings.length;
    expect([by('nw'), by('ne'), by('se'), by('sw')]).toEqual([2, 2, 2, 0]);
  });
});

describe('dunia: petak', () => {
  it('petak yang dibuat ulang sama persis', () => {
    const a = buildChunk(world, 3, 8), b = buildChunk(world, 3, 8);
    expect(a.solids.length).toBeGreaterThan(50);
    expect(b.solids).toEqual(a.solids);
    expect(b.ruins).toEqual(a.ruins);
  });
  it('jalan bebas rintangan di seluruh dunia (penyeberangan & jembatan terbuka)', () => {
    for (const road of world.roads) {
      for (const [x, y] of sample(road.pts, 70)) {
        if (Math.hypot(x - WORLD.cx, y - WORLD.cy) < 60) continue;
        const near = Object.values(world.towns).some((t) => Math.hypot(t.x - x, t.y - y) < 40);
        if (near) continue;
        expect(blocked(world, x, y, 12), `${road.kind} ${road.zone} @ ${Math.round(x)},${Math.round(y)}`).toBe(false);
      }
    }
  }, 30000);
  it('perbatasan menghalangi di luar penyeberangan', () => {
    for (const bl of world.borders) {
      const mid = bl.pts[Math.floor(bl.pts.length * 0.5)];
      const far = bl.crossings.every((c) => Math.hypot(c.x - mid[0], c.y - mid[1]) > 3000);
      if (far) expect(blocked(world, mid[0], mid[1], 12)).toBe(true);
    }
  });
  it('berjalan lurus dari Hutan ke Gunung Api menabrak tebing', () => {
    const o = { x: WORLD.cx - 9000, y: WORLD.cy + 7000 }; // forest side of the south-west border
    expect(zoneAt(world, o.x, o.y)).toBe('forest');
    for (let i = 0; i < 4000; i++) { o.x += 2; o.y += 2; pushOut(world, o, 12); }
    expect(zoneAt(world, o.x, o.y)).not.toBe('volcano');
  });
  it('ensureChunks mencicil sesuai jatah; petak sekitar pemain tersedia', () => {
    const w = buildWorld(7);
    const g = zoneToWorld('ice', 0.5, 0.5);
    expect(ensureChunks(w, g.x, g.y, 2)).toBe(2);
    expect(w.chunks.size).toBe(2);
    expect(chunksNear(w, g.x, g.y).length).toBe(9);
    expect(w.chunks.size).toBeLessThanOrEqual(WORLD.cache);
  });
  it('freeSpot memberi titik yang tidak tertabrak', () => {
    const lake = world.lakes[0];
    const p = freeSpot(world, lake.x, lake.y, 90);
    expect(blocked(world, p.x, p.y, 90)).toBe(false);
  });
  it('gerbang kota tidak tertutup dan ada tembok di belakangnya', () => {
    for (const zone of ARM_IDS) {
      const t = world.towns[ARMS[zone].town];
      expect(blocked(world, t.x + t.out[0] * WORLD.spawnBack, t.y + t.out[1] * WORLD.spawnBack, 12)).toBe(false);
      expect(blocked(world, t.x - t.out[0] * (WORLD.townSolid + 120), t.y - t.out[1] * (WORLD.townSolid + 120), 12)).toBe(true);
    }
    expect(FIELD.pathWidth).toBeGreaterThan(0);
  });
});
