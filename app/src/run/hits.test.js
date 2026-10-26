import { describe, it, expect } from 'vitest';
import { makeArea, makeSweep, makeProjectile, inShape, stepHits } from './hits.js';

const DT = 1 / 60;
const enemy = (x, y, r = 10) => ({ x, y, r, hp: 1000 });

// Runs hits for `seconds`; returns how often each enemy was hit.
function run(hits, enemies, seconds, player = { x: 0, y: 0 }) {
  const count = new Map(enemies.map((e) => [e, 0]));
  const ctx = {
    px: player.x, py: player.y,
    onHit: (h, e) => count.set(e, count.get(e) + 1),
    add: (h) => hits.push(h),
  };
  for (let t = 0; t < seconds - 1e-9; t += DT) stepHits(hits, enemies, DT, ctx);
  return enemies.map((e) => count.get(e));
}

describe('bentuk', () => {
  it('lingkaran memperhitungkan radius musuh', () => {
    const h = makeArea({ x: 0, y: 0, r: 30, mult: 1 });
    expect(inShape(h, enemy(39, 0))).toBe(true);
    expect(inShape(h, enemy(41, 0))).toBe(false);
  });

  it('busur hanya mengenai arah bidik', () => {
    const h = makeArea({ x: 0, y: 0, r: 46, angle: 0, arc: 100, mult: 1 });
    expect(inShape(h, enemy(30, 0))).toBe(true);
    expect(inShape(h, enemy(20, 20))).toBe(true);   // 45° — inside the 50° half-arc
    expect(inShape(h, enemy(-30, 0))).toBe(false);  // behind
    expect(inShape(h, enemy(0, 40))).toBe(false);   // 90° to the side
  });
});

describe('area', () => {
  it('sekali-kena: tiap musuh di dalam kena tepat sekali', () => {
    const hits = [makeArea({ x: 0, y: 0, r: 46, angle: 0, arc: 100, mult: 1 })];
    expect(run(hits, [enemy(30, 0), enemy(30, 5), enemy(-30, 0)], 1)).toEqual([1, 1, 0]);
    expect(hits.length).toBe(0);
  });

  it('area bertahan: kena sekali per tik (4 tik / 1 s)', () => {
    const hits = [makeArea({ x: 0, y: 0, r: 70, mult: 1.5, ticks: 4, duration: 1 })];
    expect(run(hits, [enemy(20, 0), enemy(200, 0)], 1.5)).toEqual([4, 0]);
  });

  it('area yang mengikuti pemain berpindah bersama pemain', () => {
    const hits = [makeArea({ x: 0, y: 0, r: 20, mult: 1, ticks: 2, duration: 0.5, follow: true })];
    expect(run(hits, [enemy(300, 0)], 1, { x: 300, y: 0 })).toEqual([2]);
  });

  it('tidak ada kebal bersama: dua instans mengenai musuh yang sama di frame yang sama', () => {
    const hits = [makeArea({ x: 0, y: 0, r: 30, mult: 1 }), makeArea({ x: 0, y: 0, r: 30, mult: 1 })];
    expect(run(hits, [enemy(10, 0)], DT)).toEqual([2]);
  });
});

describe('sweep', () => {
  it('tiap musuh paling banyak sekali selama durasi', () => {
    const hits = [makeSweep({ x: 0, y: 0, r: 20, mult: 1, duration: 0.5 })];
    expect(run(hits, [enemy(5, 0), enemy(0, 5)], 1)).toEqual([1, 1]);
  });
});

describe('proyektil', () => {
  it('mengenai musuh pertama lalu hilang (pierce 0)', () => {
    const hits = [makeProjectile({ x: 0, y: 0, angle: 0, speed: 380, range: 450, r: 4, mult: 1 })];
    expect(run(hits, [enemy(100, 0), enemy(140, 0)], 1)).toEqual([1, 0]);
    expect(hits.length).toBe(0);
  });

  it('menembus semua musuh, masing-masing sekali, walau tumpang tindih beberapa frame', () => {
    const hits = [makeProjectile({ x: 0, y: 0, angle: 0, speed: 120, range: 600, r: 12, mult: 3, pierce: Infinity })];
    expect(run(hits, [enemy(100, 0, 20), enemy(150, 0, 20), enemy(200, 0, 20)], 4)).toEqual([1, 1, 1]);
  });

  it('hilang setelah jangkauannya', () => {
    const hits = [makeProjectile({ x: 0, y: 0, angle: 0, speed: 380, range: 450, r: 4, mult: 1 })];
    expect(run(hits, [enemy(500, 0)], 2)).toEqual([0]);
    expect(hits.length).toBe(0);
  });

  it('meledak: area mengenai semua di sekitar titik tumbukan, sasaran tidak kena dua kali', () => {
    const hits = [makeProjectile({ x: 0, y: 0, angle: 0, speed: 260, range: 420, r: 6, mult: 1, explode: { r: 36 } })];
    expect(run(hits, [enemy(100, 0), enemy(100, 30), enemy(100, 80)], 1)).toEqual([1, 1, 0]);
  });
});
