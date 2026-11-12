import { describe, it, expect } from 'vitest';
import { LoadGuard } from './loadguard.js';

const run = (g, seconds, foes, fps = 60) => { let L = g.level; for (let t = 0; t < seconds; t += 1 / fps) L = g.push(1 / fps, foes); return L; };

describe('LoadGuard', () => {
  it('stays at 0 in a quiet fight', () => {
    expect(run(new LoadGuard(), 5, 5)).toBe(0);
  });
  it('stills the HUD with many enemies, then the world with more', () => {
    const g = new LoadGuard();
    expect(run(g, 2, 20)).toBe(1);
    expect(run(g, 2, 40)).toBe(2);
  });
  it('a phone eases off with fewer enemies', () => {
    expect(run(new LoadGuard(true), 2, 14)).toBe(1);
    expect(run(new LoadGuard(false), 2, 14)).toBe(0);
  });
  it('low frames alone are enough', () => {
    expect(run(new LoadGuard(), 3, 2, 20)).toBe(2);
  });
  it('a short spike does not change anything', () => {
    const g = new LoadGuard();
    run(g, 0.5, 40);
    expect(run(g, 0.6, 3)).toBe(0);
  });
  it('comes down one level at a time once calm for a while', () => {
    const g = new LoadGuard();
    run(g, 2, 40);
    expect(run(g, 2, 3)).toBe(2);   // not yet: needs settle seconds
    expect(run(g, 5, 3)).toBe(1);
    expect(run(g, 5, 3)).toBe(0);
  });
});
