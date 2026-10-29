import { describe, it, expect } from 'vitest';
import { wallCells, treesOf, occludes, inCutaway, nearest, mountOf, roomPanels, facesCamera } from './townkit.js';
import { TOWN_DEFS } from '../data/towns.js';

describe('2.5D kota — bantuan murni', () => {
  it('dinding kota mengelilingi kota dan berlubang di gerbang', () => {
    for (const def of Object.values(TOWN_DEFS)) {
      const cells = wallCells(def, 40), gate = def.buildings.find((b) => b.kind === 'gate');
      expect(cells.some((c) => c.side === 'n')).toBe(true);
      expect(cells.some((c) => c.side === 'w') && cells.some((c) => c.side === 'e')).toBe(true);
      const south = cells.filter((c) => c.side === 's');
      expect(south.length).toBeGreaterThan(0);
      expect(south.every((c) => c.x + c.len / 2 <= gate.x + 0.01 || c.x - c.len / 2 >= gate.x + gate.w - 0.01)).toBe(true);
    }
  });

  it('pohon tetap sama tiap kali dibuat dan berada di luar tembok', () => {
    const def = TOWN_DEFS.rimba;
    expect(treesOf(def)).toEqual(treesOf(def));
    for (const p of treesOf(def)) expect(p.x < 0 || p.x > def.w || p.y < 0 || p.y > def.h).toBe(true);
  });

  it('rumah di antara kamera (selatan) dan pemain menghalangi; yang di belakang pemain tidak', () => {
    // hero north of a house: the house is between the hero and a camera in the south
    expect(occludes(100, 300, 290, 490, 200, 280, 0, 260)).toBe(true);
    // hero south of the house (in front of its door): nothing to hide
    expect(occludes(100, 300, 290, 490, 200, 540, 0, 260)).toBe(false);
    // far to the side
    expect(occludes(100, 300, 290, 490, 700, 280, 0, 260)).toBe(false);
    // camera turned to look from the north: now the house south of the hero is behind
    expect(occludes(100, 300, 290, 490, 200, 280, Math.PI, 260)).toBe(false);
    expect(occludes(100, 300, 290, 490, 200, 540, Math.PI, 260)).toBe(true);
  });

  it('dinding di sisi kamera turun, yang jauh di belakang tetap', () => {
    expect(inCutaway(500, 760, 500, 600, 0)).toBe(true);
    expect(inCutaway(500, 15, 500, 600, 0)).toBe(false);
    expect(inCutaway(500, 15, 500, 200, Math.PI)).toBe(true);
  });

  it('memilih n terdekat tanpa membuat array baru', () => {
    const list = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 5, y: 5 }, { x: 50, y: 0 }];
    const out = [0, 0], d = [0, 0];
    expect(nearest(list, 0, 0, 2, out, d)).toBe(2);
    expect([...out].sort()).toEqual([0, 2]);
    expect(nearest(list.slice(0, 1), 0, 0, 2, out, d)).toBe(1);
  });

  it('perabot dinding menempel di dinding belakang; perabot lantai keluar dari pita dinding', () => {
    const r = { w: 480, h: 340, wall: 24, back: 76, doorW: 50 };
    const shelf = mountOf({ kind: 'shelf', x: 50, y: 20, w: 140, h: 50 }, r);
    expect(shelf.wall).toBe(true);
    expect(shelf.top).toBeGreaterThan(shelf.bottom);
    const fire = mountOf({ kind: 'fireplace', x: 300, y: 18, w: 96, h: 62 }, r);
    expect(fire.wall).toBe(false);
    expect(fire.y0).toBeGreaterThanOrEqual(r.back - 22);
    expect(fire.y1).toBeGreaterThan(fire.y0);
  });

  it('dinding depan ruangan menghadap kamera dari selatan; dinding belakang tidak', () => {
    const p = roomPanels({ w: 480, h: 340, wall: 24, back: 76, doorW: 50 });
    expect(p.filter((q) => facesCamera(q, 0)).length).toBe(2);
    expect(facesCamera(p[0], 0)).toBe(false);
    expect(facesCamera(p[0], Math.PI)).toBe(true);
  });
});
