import { describe, it, expect } from 'vitest';
import * as FX from './fx.js';

const opaque = (sp) => sp.px.reduce((n, c) => n + (c !== -1), 0);
const glowing = (sp) => sp.em.reduce((n, e) => n + e, 0);

describe('spell frames (plan B)', () => {
  it('every frame of the fire spells has something in it, and the fire glows', () => {
    for (const make of [() => FX.fireball(3), () => FX.explosion(3), () => [FX.scorch(1, 'stone', 3)]]) {
      for (const sp of make()) expect(opaque(sp)).toBeGreaterThan(0);
    }
    for (const sp of FX.fireball(3)) expect(glowing(sp)).toBeGreaterThan(opaque(sp) * 0.9);
  });
  it('the explosion starts as fire and ends as (unlit) smoke', () => {
    const f = FX.explosion(3);
    expect(f).toHaveLength(8);
    expect(glowing(f[0])).toBe(opaque(f[0]));
    expect(glowing(f[7])).toBeLessThan(opaque(f[7]) * 0.2);
  });
  it('the same design every time (seeded, never Math.random)', () => {
    expect(Array.from(FX.explosion(2)[3].px)).toEqual(Array.from(FX.explosion(2)[3].px));
  });
  it('k scales the texels, not the design', () => {
    const a = FX.fireball(1)[0], b = FX.fireball(3)[0];
    expect(b.w).toBe(a.w * 3); expect(b.w / b.k).toBe(a.w / a.k);
  });
});
