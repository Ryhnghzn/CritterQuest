import { describe, it, expect } from 'vitest';
import { needsAim, aimShape } from './aim.js';
import { CLASSES } from '../data/classes.js';

const all = Object.values(CLASSES).flatMap((c) => [...c.skills, c.ult]);
const byId = (id) => all.find((s) => s.id === id);

describe('aimed casting', () => {
  it('waits only for skills that need a direction or a spot', () => {
    expect(needsAim(byId('quake'))).toBe(true);   // line toward the aim
    expect(needsAim(byId('charge'))).toBe(true);  // dash toward the aim
    expect(needsAim(byId('chain'))).toBe(true);   // storm from the enemy nearest the aim
    expect(needsAim(byId('spin'))).toBe(false);   // spins on the player
    expect(needsAim(byId('shout'))).toBe(false);  // buff
    expect(needsAim(byId('bladestorm'))).toBe(false);
    expect(needsAim(null)).toBe(false);
  });
  it('every class skill has a known shape when it waits', () => {
    for (const s of all) if (needsAim(s)) expect(aimShape(s, 0, 0, 100, 0).length).toBeGreaterThan(0);
  });
  it('an aimed area stops at its max distance, like the cast', () => {
    const s = { kind: 'area', at: 'aim', maxDist: 200, r: 60 };
    const [range, spot] = aimShape(s, 10, 10, 1010, 10);
    expect(range).toMatchObject({ type: 'circle', x: 10, y: 10, r: 200, range: true });
    expect(spot.x).toBeCloseTo(210); expect(spot.y).toBeCloseTo(10); expect(spot.r).toBe(60);
    const [, near] = aimShape(s, 0, 0, 50, 0);
    expect(near.x).toBeCloseTo(50);
  });
  it('a projectile shows its full range toward the mouse, a back dash points away', () => {
    const [strip] = aimShape({ kind: 'proj', range: 400, r: 10 }, 0, 0, 0, 50);
    expect(strip).toMatchObject({ type: 'strip', len: 400, w: 20 });
    expect(strip.angle).toBeCloseTo(Math.PI / 2);
    const [back] = aimShape({ kind: 'dash', distance: 150, back: true }, 0, 0, 100, 0);
    expect(Math.cos(back.angle)).toBeCloseTo(-1);
  });
});
