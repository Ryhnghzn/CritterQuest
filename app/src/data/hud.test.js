import { describe, it, expect } from 'vitest';
import { HUD, fanReach } from './hud.js';

describe('HUD fan (spec §45.1)', () => {
  it('reaches at least past the inner ring and the attack button', () => {
    const r = fanReach();
    expect(r).toBeGreaterThanOrEqual(HUD.fan.skill.r);
    expect(r).toBeGreaterThanOrEqual(HUD.fan.atk / 2);
  });
  it('keeps every button on screen above the bottom edge', () => {
    const f = HUD.fan, centre = f.bottom + f.atk / 2;
    const below = (a, r, size) => r * Math.sin((a * Math.PI) / 180) + size / 2; // px under the centre
    const parts = [...[0, 1, 2, 3].map((i) => [f.skill.from + i * f.skill.step, f.skill.r, f.skill.size]),
      [f.ult.a, f.ult.r, f.ult.size], [f.mount.a, f.mount.r, f.mount.size], [f.dodge.a, f.dodge.r, f.dodge.size], [f.swap.a, f.swap.r, f.swap.size]];
    for (const p of parts) expect(below(...p)).toBeLessThan(centre);
  });
  it('a wider fan reaches further', () => {
    expect(fanReach({ ...HUD.fan, swap: { ...HUD.fan.swap, r: HUD.fan.swap.r + 50 } })).toBeGreaterThan(fanReach());
  });
});
