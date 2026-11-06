import { describe, it, expect } from 'vitest';
import { groundPixels, GROUND, GROUND_P } from './groundart.js';

const lum = (a, i) => a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11;
describe('painted ground (plan C2)', () => {
  for (const kind of Object.keys(GROUND)) {
    it(`${kind}: tiles without a seam`, () => {
      const { rgba, size: N } = groundPixels(kind, 1);
      let edge = 0, inner = 0;
      for (let y = 0; y < N; y++) { // left/right edge vs two neighbouring columns inside
        edge += Math.abs(lum(rgba, (y * N) * 4) - lum(rgba, (y * N + N - 1) * 4));
        inner += Math.abs(lum(rgba, (y * N + 10) * 4) - lum(rgba, (y * N + 11) * 4));
      }
      expect(edge).toBeLessThan(inner * 1.6 + N);
      for (let x = 0; x < N; x += 7) expect(Math.abs(lum(rgba, x * 4) - lum(rgba, ((N - 1) * N + x) * 4))).toBeLessThan(90);
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
