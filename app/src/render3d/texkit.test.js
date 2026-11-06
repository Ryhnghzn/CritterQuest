import { describe, it, expect } from 'vitest';
import { detailPixels, DETAIL_KINDS, DETAIL_SIZE } from './texkit.js';

const N = DETAIL_SIZE;
const at = (px, x, y) => px[((y + N) % N) * N + ((x + N) % N)];

describe('material detail maps', () => {
  for (const kind of DETAIL_KINDS) {
    it(`${kind}: averages near ×1 so painted colours keep their brightness`, () => {
      const px = detailPixels(kind);
      const mean = px.reduce((a, v) => a + v, 0) / px.length;
      expect(mean).toBeGreaterThan(100);
      expect(mean).toBeLessThan(140);
    });
    it(`${kind}: wraps without a visible seam`, () => {
      const px = detailPixels(kind);
      // the jump across the tile edge is no bigger than the usual jump between neighbours
      let inner = 0, edge = 0;
      for (let i = 0; i < N; i++) {
        inner += Math.abs(at(px, N / 2, i) - at(px, N / 2 - 1, i)) + Math.abs(at(px, i, N / 2) - at(px, i, N / 2 - 1));
        edge += Math.abs(at(px, 0, i) - at(px, N - 1, i)) + Math.abs(at(px, i, 0) - at(px, i, N - 1));
      }
      expect(edge).toBeLessThan(inner * 2.5 + N * 4);
    });
  }
  it('is the same every time (no random source)', () => {
    expect(detailPixels('stone')).toEqual(detailPixels('stone'));
  });
});
