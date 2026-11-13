// Peta Usang (plan docs/superpowers/plans/2026-11-13-eksplorasi.md bagian B).
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { OLD_MAP } from '../data/world.js';
import { placeMap, mapDrop } from './oldmap.js';
import { inHub } from './worldmap.js';

const idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 };
function setup() {
  const g = new Game();
  g.explore({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats, maxHp: 1e6 }, at: 'rimba' });
  g.intent = idle; g.packT = 1e9; g.god = true; g.happenT = 1e9;
  return g;
}
const run = (g, sec) => { for (let i = 0; i < Math.round(sec * 60); i++) { g.intent = idle; g.step(1 / 60); } };

describe('Peta Usang', () => {
  it('peta menandai lingkaran, bukan titik: gundukan di dalamnya, jauh dari pemain, bukan di padang kota', () => {
    const g = setup();
    for (let i = 0; i < 20; i++) {
      g.oldMap = null;
      const m = placeMap(g);
      expect(m).toBeTruthy();
      const d = Math.hypot(m.x - g.px, m.y - g.py);
      expect(d).toBeGreaterThanOrEqual(OLD_MAP.dist[0] - 1); expect(d).toBeLessThanOrEqual(OLD_MAP.dist[1] + 1);
      expect(Math.hypot(m.x - m.hx, m.y - m.hy)).toBeLessThan(m.r);
      expect(inHub(m.x, m.y)).toBe(false);
    }
  });
  it('hanya elite di dunia, satu peta sekaligus', () => {
    const g = setup();
    expect(mapDrop(g, { elite: false })).toBe(null);
    let got = null;
    for (let i = 0; i < 400 && !got; i++) got = mapDrop(g, { elite: true });
    expect(got).toBeTruthy();
    for (let i = 0; i < 200; i++) expect(mapDrop(g, { elite: true })).toBe(null); // already following one
  });
  it('gundukan: terlihat saat dekat, berdiri di atasnya → isi peti; peta habis', () => {
    const g = setup();
    const m = placeMap(g); m.trap = false;
    const gold = g.gold, gems = g.gems.length;
    g.px = m.x + OLD_MAP.seen - 20; g.py = m.y; run(g, 0.1);
    expect(m.seen).toBe(true);
    g.px = m.x; g.py = m.y; run(g, OLD_MAP.hold * 0.5);
    expect(g.oldMap).toBe(m); // not yet
    run(g, OLD_MAP.hold * 0.6 + 0.1);
    expect(g.oldMap).toBe(null);
    expect(g.eventsDone).toContain(m.key);
    expect(g.gold > gold || g.gems.length > gems).toBe(true);
  });
  it('jebakan: kawanan keluar dulu, hartanya tetap', () => {
    const g = setup();
    const m = placeMap(g); m.trap = true;
    const foes = g.enemies.length;
    g.px = m.x; g.py = m.y; run(g, OLD_MAP.hold + 0.2);
    expect(g.enemies.length).toBeGreaterThanOrEqual(foes + OLD_MAP.pack);
    expect(g.eventsDone).toContain(m.key);
  });
  it('perjalanan baru: peta lama hilang', () => {
    const g = setup();
    placeMap(g);
    g.explore({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, at: 'rimba' });
    expect(g.oldMap).toBe(null);
  });
});
