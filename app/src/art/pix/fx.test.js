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
  it('ice, lightning and arcane frames: every frame drawn, the bolt variants differ', () => {
    for (const fr of [FX.novaRing(1, 2), FX.iceShard(2), FX.lightning(3, 2), FX.arcaneHit(2)]) for (const sp of fr) expect(opaque(sp)).toBeGreaterThan(0);
    const [a, b] = FX.lightning(2, 1);
    expect(Array.from(a.px)).not.toEqual(Array.from(b.px));
    const ring = FX.novaRing(1, 1);
    expect(ring[0].w).toBe(ring[0].h); // round on the flat ground (no screen squash)
  });
  it('the same design every time (seeded, never Math.random)', () => {
    expect(Array.from(FX.explosion(2)[3].px)).toEqual(Array.from(FX.explosion(2)[3].px));
  });
  it('k scales the texels, not the design', () => {
    const a = FX.fireball(1)[0], b = FX.fireball(3)[0];
    expect(b.w).toBe(a.w * 3); expect(b.w / b.k).toBe(a.w / a.k);
  });
});

describe('illustrated props (plan C3, C4)', async () => {
  const P = await import('./props.js');
  it('every prop and flame frame has something in it; flames glow', () => {
    for (const sp of [P.oak('m', 1, 2), P.pine('l', 2, 2, true), P.rock('l', 1, 2, 'snow'), P.bush(2, 2, 'leaf', 'flowerV'), P.grassTuft(1, 2), P.frameBranch(3, 2)]) expect(opaque(sp)).toBeGreaterThan(0);
    for (const sp of P.flames(2)) expect(glowing(sp)).toBe(opaque(sp));
    for (const sp of [P.palm(1, 2), P.cactus(2, 2), P.deadTree(2, 2, 'charred'), P.crystal(1, 2), P.crystal(2, 2, 'obsidian'), P.rock('l', 1, 2, 'snow', 'iceStone')]) expect(opaque(sp)).toBeGreaterThan(200);
    expect(glowing(P.crystal(2, 2, 'obsidian'))).toBeGreaterThan(0); // the spire's violet veins
  });
});

describe('warrior frames (plan B4)', () => {
  it('every frame drawn; the pillar burns at its foot; the whirl is round (laid flat)', () => {
    for (const fr of [FX.slash(2), FX.whirl(2), FX.pillar(2), FX.dust(2), FX.axe(2), FX.novaRing(1, 2, 'torch')]) for (const sp of fr) expect(opaque(sp)).toBeGreaterThan(0);
    expect(glowing(FX.pillar(2)[2])).toBeGreaterThan(0);
    const w = FX.whirl(1)[0]; expect(w.w).toBe(w.h);
  });
});

describe('archer frames (plan B4)', () => {
  it('every frame drawn; the lance and the stars glow, the arrow does not', () => {
    for (const fr of [[FX.arrow(2)], FX.lightSpear(2), FX.star(2), FX.thorns(2)]) for (const sp of fr) expect(opaque(sp)).toBeGreaterThan(0);
    expect(glowing(FX.lightSpear(2)[0])).toBe(opaque(FX.lightSpear(2)[0]));
    expect(glowing(FX.arrow(2))).toBe(0);
  });
});
