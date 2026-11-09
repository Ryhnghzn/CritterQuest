import { describe, it, expect } from 'vitest';
import { screenX, towardCam, makeFacing, turnTo, pose2d } from './facing.js';

const F = { turn: 0.16, hop: 4, lean: 0.1, dead: 0.05 };
const OLD = { turn: 0, hop: 0, lean: 0, dead: 0.05 };

describe('screen direction', () => {
  it('east is right with the camera in the south, left once it is turned round', () => {
    expect(screenX(1, 0, 0)).toBeCloseTo(1);
    expect(screenX(1, 0, Math.PI)).toBeCloseTo(-1);
  });
  it('walking south comes toward the camera at yaw 0', () => {
    expect(towardCam(0, 1, 0)).toBeCloseTo(1);
    expect(towardCam(0, 1, Math.PI)).toBeCloseTo(-1);
  });
});

describe('paper turn', () => {
  it('turns through a thin sliver and ends mirrored after the turn time', () => {
    const f = makeFacing(1);
    turnTo(f, 1, 0, F);
    turnTo(f, -1, 0.01, F);
    expect(f.face).toBe(-1);
    turnTo(f, -1, 0.08, F);
    expect(Math.abs(pose2d(f, 0.08, 0, F).w)).toBeLessThan(0.3);
    for (let t = 0.09; t < 0.4; t += 0.016) turnTo(f, -1, t, F);
    expect(pose2d(f, 0.4, 0, F).w).toBe(-1);
  });
  it('hops only while turning', () => {
    const f = makeFacing(1);
    turnTo(f, 1, 0, F); turnTo(f, -1, 1, F);
    expect(pose2d(f, 1.08, 0, F).hop).toBeGreaterThan(3);
    expect(pose2d(f, 1.5, 0, F).hop).toBe(0);
  });
  it('ignores tiny sideways movement', () => {
    const f = makeFacing(1);
    turnTo(f, -0.01, 0, F);
    expect(f.face).toBe(1);
  });
  it('the old look flips at once, no hop, no lean', () => {
    const f = makeFacing(1);
    turnTo(f, -1, 0, OLD);
    expect(pose2d(f, 0, 1, OLD)).toEqual({ w: -1, hop: 0, lean: 0 });
  });
  it('leans with the walk, capped', () => {
    expect(pose2d(makeFacing(1), 0, 3, F).lean).toBeCloseTo(0.1);
  });
});
