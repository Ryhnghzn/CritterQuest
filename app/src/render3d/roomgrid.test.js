import { describe, it, expect } from 'vitest';
import { isFloor, wallCells } from './roomgrid.js';
import { makeRoom, SHAPES } from '../run/room.js';

const rng = (() => { let s = 3; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

describe('2.5D — dinding dari bentuk ruangan', () => {
  it('tengah ruangan selalu lantai; jauh di luar bukan', () => {
    for (const shape of SHAPES) {
      const room = makeRoom(shape, rng);
      expect(isFloor(room, 0, 0)).toBe(true);
      expect(isFloor(room, room.bound + 900, room.bound + 900)).toBe(false);
    }
  });

  it('balok dinding mengelilingi lantai, tidak pernah di atas lantai, lorong tetap terbuka', () => {
    for (const shape of SHAPES) {
      const room = makeRoom(shape, rng);
      const cells = wallCells(room, 40, 2, () => 0.5);
      expect(cells.length).toBeGreaterThan(20);
      for (const c of cells) expect(isFloor(room, c.x, c.y)).toBe(false);
      for (const l of room.lanes) { // a point inside each corridor is floor, not wall
        const x = l.x + Math.cos(l.a) * 80, y = l.y + Math.sin(l.a) * 80;
        expect(isFloor(room, x, y)).toBe(true);
      }
    }
  });
});
