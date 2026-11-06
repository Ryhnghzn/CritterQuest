import { describe, it, expect } from 'vitest';
import { oak, pine, bush, rock, VARIANTS } from './flora.js';

const ROCK = ['#3e3d42', '#4a4540'];
const builds = {
  oak: (v) => oak(v), pine: (v) => pine(v), snowpine: (v) => pine(v, true), bush: (v) => bush(v), rock: (v) => rock(v, ROCK, '#3d5a33'),
};

describe('flora (A5)', () => {
  for (const [name, make] of Object.entries(builds)) {
    it(`${name}: stands on the ground, coloured per vertex, light enough for many instances`, () => {
      for (let v = 0; v < VARIANTS; v++) {
        const g = make(v);
        g.computeBoundingBox();
        expect(g.boundingBox.min.y).toBeGreaterThan(-0.15); // feet at y = 0
        expect(g.attributes.color.count).toBe(g.attributes.position.count);
        expect(g.attributes.position.count).toBeLessThan(1800);
        expect(Number.isFinite(g.boundingSphere.radius)).toBe(true);
      }
    });
  }
  it('variants differ, and the same variant is built the same every time', () => {
    const a = oak(0).attributes.position.array, b = oak(1).attributes.position.array, a2 = oak(0).attributes.position.array;
    expect(a.length === b.length && a.every((x, i) => x === b[i])).toBe(false);
    expect(Array.from(a)).toEqual(Array.from(a2));
  });
  it('trees stay about as tall as before (the solids and the cutaway are sized for it)', () => {
    for (const g of [oak(0), pine(0), pine(2, true)]) {
      g.computeBoundingBox();
      expect(g.boundingBox.max.y).toBeGreaterThan(2.3);
      expect(g.boundingBox.max.y).toBeLessThan(3.6);
    }
  });
});
