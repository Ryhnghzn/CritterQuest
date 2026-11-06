import { describe, it, expect } from 'vitest';
import { groundPixels, GROUND, GROUND_P } from './groundart.js';

describe('painted ground (plan C2)', () => {
  for (const kind of Object.keys(GROUND)) {
    it(`${kind}: repeats exactly every GROUND_P (no seam)`, () => {
      for (let t = 0.3; t < GROUND_P; t += 1.7) {
        for (const [a, b] of [[GROUND[kind](GROUND_P + 0.4, t), GROUND[kind](0.4, t)], [GROUND[kind](t, GROUND_P + 0.4), GROUND[kind](t, 0.4)]]) {
          expect(a[0]).toBe(b[0]); expect(a[1]).toBeCloseTo(b[1], 6);
        }
      }
    });
  }
  it('grass has tufts (light blades) and dark shadows, and a few flowers', () => {
    const kinds = new Set(); let hi = 0, lo = 0;
    for (let v = 0; v < GROUND_P; v++) for (let u = 0; u < GROUND_P; u++) {
      const [r, l] = GROUND.grass(u + 0.5, v + 0.5); kinds.add(r); if (l > 3) hi++; if (l < 1) lo++;
    }
    expect(kinds.has('flowerV') || kinds.has('flowerY')).toBe(true);
    expect(hi).toBeGreaterThan(500); expect(lo).toBeGreaterThan(500);
  });
  it('the same every time', () => {
    expect(Array.from(groundPixels('dirt', 0.5).rgba)).toEqual(Array.from(groundPixels('dirt', 0.5).rgba));
  });
});
