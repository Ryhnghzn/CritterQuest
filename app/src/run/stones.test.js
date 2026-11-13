// Lingkaran Batu (plan docs/superpowers/plans/2026-11-13-eksplorasi.md bagian A).
import { describe, it, expect } from 'vitest';
import { Game } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';
import { STONES } from '../data/world.js';
import { wakes, nightOf, ruinKey } from './stones.js';
import { chunksNear } from './worldmap.js';

const idle = { move: { x: 0, y: 0 }, aimAt: null, dodge: false, attack: false, potion: -1 };
const NIGHT = 22 * 60, DAY = 12 * 60;
function setup() {
  const g = new Game();
  g.explore({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, at: 'rimba' });
  g.intent = idle; g.packT = 1e9; g.god = true; g.happenT = 1e9;
  // an awake ring somewhere along the way from the town into the world
  let ring = null;
  for (let k = 0; k < 40 && !ring; k++) {
    const x = g.px - k * 3000, y = g.py;
    for (const c of chunksNear(g.fmap, x, y, 1)) for (const ru of c.ruins) if (!ring && wakes(ru)) ring = ru;
  }
  return { g, ring };
}
const stand = (g, sec, clock) => { for (let i = 0; i < Math.round(sec * 60); i++) { g.phase = clock >= 18 * 60 || clock < 5 * 60 ? 'moon' : 'sun'; g.clock = clock; g.intent = idle; g.step(1 / 60); } };

describe('Lingkaran Batu', () => {
  it('sekitar satu dari enam reruntuhan terjaga, dipilih dari tempatnya (sama untuk semua save)', () => {
    let awake = 0;
    for (let i = 0; i < 6000; i++) if (wakes({ x: 431 + i * 11.7, y: 52011 - i * 7.3 })) awake++;
    expect(awake / 6000).toBeGreaterThan(1 / STONES.every - 0.04); expect(awake / 6000).toBeLessThan(1 / STONES.every + 0.04);
    const ru = { x: 1234.4, y: 5678.9 };
    expect(wakes(ru)).toBe(wakes({ x: 1234, y: 5679 }));
  });
  it('siang: hanya hiasan; malam: bercahaya, berdiri di tengah → hadiah sekali semalam', () => {
    const { g, ring } = setup();
    expect(ring).toBeTruthy();
    g.px = ring.x; g.py = ring.y;
    stand(g, STONES.hold + 1, DAY);
    expect(g.stonesLit.length).toBe(0); expect(g.eventsDone.length).toBe(0);
    const dust = g.mats.dust;
    stand(g, STONES.hold + 0.5, NIGHT);
    expect(g.mats.dust).toBeGreaterThan(dust);
    expect(g.eventsDone).toContain(`stones:${ruinKey(ring)}`);
    const n = g.eventsDone.length;
    stand(g, STONES.hold * 2, NIGHT + 30); // the same night: spent
    expect(g.eventsDone.length).toBe(n);
    expect(g.stonesLit.find((s) => s.x === ring.x).spent).toBe(true);
    stand(g, STONES.hold + 0.5, NIGHT + 1440); // the next night: again
    expect(g.eventsDone.length).toBe(n + 1);
  });
  it('pergi sebelum selesai: tidak ada hadiah', () => {
    const { g, ring } = setup();
    g.px = ring.x; g.py = ring.y;
    stand(g, STONES.hold * 0.6, NIGHT);
    g.px = ring.x + ring.r * 3;
    stand(g, STONES.hold * 2, NIGHT);
    expect(g.eventsDone.length).toBe(0);
  });
  it('malam dihitung dari sore: 23:00 dan 03:00 keesokannya adalah malam yang sama', () => {
    expect(nightOf(23 * 60)).toBe(nightOf(1440 + 3 * 60));
    expect(nightOf(23 * 60)).not.toBe(nightOf(1440 + 19 * 60));
  });
});
