import { describe, it, expect } from 'vitest';
import { propKind, buildProps, indexProps, gatherNear, inCutaway, bridgeSpots, tilesAround } from './fieldprops.js';
import { buildFieldMap } from '../run/fieldmap.js';
import { REGIONS } from '../data/world.js';

describe('propKind', () => {
  it('gives each biome its own trees and keeps water out', () => {
    expect(propKind('forest', { kind: 'tree', v: 0.2 })).toBe('pine');
    expect(propKind('forest', { kind: 'tree', v: 0.8 })).toBe('oak');
    expect(propKind('ice', { kind: 'tree', v: 0.8 })).toBe('snowpine');
    expect(propKind('desert', { kind: 'tree', v: 0.1 })).toBe('cactus');
    expect(propKind('volcano', { kind: 'tree' })).toBe('deadtree');
    expect(propKind('eclipse', { kind: 'rock' })).toBe('floatrock');
    expect(propKind('forest', { kind: 'water' })).toBe(null);
    expect(propKind('forest', { kind: 'lake' })).toBe(null);
  });
});

describe('props of a region', () => {
  const map = buildFieldMap(REGIONS.find((r) => r.id === 'ice'));
  const props = buildProps(map);
  const index = indexProps(props, map.w, map.h);

  it('has every standing solid plus edge woods and lake crystals', () => {
    const standing = map.solids.filter((s) => s.kind !== 'water' && s.kind !== 'lake').length;
    expect(props.length).toBeGreaterThan(standing);
    expect(props.some((p) => p.kind === 'crystal')).toBe(true);
    expect(props.some((p) => p.x < 0 || p.y < 0 || p.x > map.w || p.y > map.h)).toBe(true);
  });

  it('gathers exactly the props within the radius', () => {
    const out = [];
    const x = map.start.x + 900, y = map.start.y, R = 1000;
    const n = gatherNear(index, props, x, y, R, out);
    const brute = props.map((p, i) => [p, i]).filter(([p]) => Math.hypot(p.x - x, p.y - y) <= R).map(([, i]) => i).sort((a, b) => a - b);
    expect(n).toBe(brute.length);
    expect([...out].sort((a, b) => a - b)).toEqual(brute);
  });

  it('indexes every prop once', () => {
    expect(index.items.length).toBe(props.length);
    expect(new Set(index.items).size).toBe(props.length);
  });
});

describe('cutaway', () => {
  it('sinks what stands between the hero and the camera only', () => {
    expect(inCutaway(0, 120, 0)).toBe(true);    // south of the hero, camera from the south
    expect(inCutaway(0, -120, 0)).toBe(false);  // behind the hero
    expect(inCutaway(400, 60, 0)).toBe(false);  // off to the side
    expect(inCutaway(120, 0, Math.PI / 2)).toBe(true); // camera turned to the east
  });
});

describe('bridges & tiles', () => {
  it('keeps one bridge per crossing, turned along the river', () => {
    const rivers = [[[0, 0], [0, 1000]]];
    const b = bridgeSpots([[0, 400], [0, 450], [0, 800]], rivers);
    expect(b.length).toBe(2);
    expect(b[0].a).toBeCloseTo(Math.PI / 2);
  });
  it('lists the ground tiles around a point', () => {
    const out = [];
    expect(tilesAround(1000, 1000, 900, 800, out)).toBe(9);
    expect(out.slice(0, 2)).toEqual([0, 0]);
  });
});
