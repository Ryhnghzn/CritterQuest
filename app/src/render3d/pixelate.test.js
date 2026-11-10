import { describe, it, expect } from 'vitest';
import { pixelData } from './pixelate.js';

const P = { k: 2, levels: 7, solid: 0.8, ink: [19, 11, 26] };
const img = (w, h, f) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(f(x, y), (y * w + x) * 4); return d; };

describe('pixel art filter', () => {
  it('edges become hard: every pixel is fully opaque or empty', () => {
    const d = pixelData(img(8, 8, (x) => [200, 100, 50, x * 32]), 8, 8, P);
    for (let i = 3; i < d.length; i += 4) expect([0, 255]).toContain(d[i]);
  });
  it('rounds colours to a few steps', () => {
    const d = pixelData(img(4, 4, () => [100, 10, 250, 255]), 4, 4, P);
    const step = 255 / 7;
    for (const v of [d[0], d[1], d[2]]) expect(Math.abs(v / step - Math.round(v / step))).toBeLessThan(0.01);
  });
  it('draws a 1-pixel ink outline round the solid body', () => {
    const d = pixelData(img(5, 5, (x, y) => (x === 2 && y === 2 ? [255, 255, 255, 255] : [0, 0, 0, 0])), 5, 5, P);
    const at = (x, y) => Array.from(d.slice((y * 5 + x) * 4, (y * 5 + x) * 4 + 4));
    expect(at(1, 2)).toEqual([19, 11, 26, 255]);
    expect(at(2, 1)).toEqual([19, 11, 26, 255]);
    expect(at(0, 0)[3]).toBe(0);
  });
  it('a faint glow turns into a dotted pattern, not a solid block', () => {
    const d = pixelData(img(8, 8, () => [255, 200, 80, 90]), 8, 8, P);
    let on = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) on++;
    expect(on).toBeGreaterThan(0); expect(on).toBeLessThan(64);
  });
});
