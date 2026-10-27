import { describe, it, expect } from 'vitest';
import { makeRoom, inside, confine, outline, SHAPES } from './room.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

describe('bentuk ruangan', () => {
  it('tiap bentuk: tengah terbuka, 4 lorong di tepi', () => {
    for (const shape of SHAPES) {
      for (let k = 0; k < 20; k++) {
        const r = makeRoom(shape, seeded(k));
        expect(inside(r, 0, 0, 40)).toBe(true);
        expect(r.lanes).toHaveLength(4);
        for (const l of r.lanes) {
          expect(inside(r, l.x - l.dx * 10, l.y - l.dy * 10, 0)).toBe(true);
          expect(inside(r, l.x + l.dx * 10, l.y + l.dy * 10, 0)).toBe(false);
          expect(Math.hypot(l.x, l.y)).toBeGreaterThan(150);
        }
        for (const p of r.pillars) expect(Math.hypot(p.x, p.y)).toBeGreaterThan(p.r + 60); // portals stay clear
      }
    }
  });

  it('confine: menahan tubuh di dalam dinding dan di luar pilar', () => {
    for (const shape of SHAPES) {
      const room = makeRoom(shape, seeded(3));
      for (let i = 0; i < 200; i++) {
        const o = { x: (i * 37 % 1600) - 800, y: (i * 53 % 1600) - 800 };
        confine(room, o, 12);
        expect(inside(room, o.x, o.y, 12 - 1e-6)).toBe(true);
        for (const q of room.pillars) expect(Math.hypot(o.x - q.x, o.y - q.y)).toBeGreaterThanOrEqual(q.r + 12 - 1e-6);
      }
    }
  });

  it('titik dinding untuk dekorasi berada di tepi luar', () => {
    const room = makeRoom('cross', seeded(1));
    const pts = outline(room, 120);
    expect(pts.length).toBeGreaterThan(10);
    for (const p of pts) expect(inside(room, p.x + p.nx * 8, p.y + p.ny * 8, 0)).toBe(false);
  });
});
