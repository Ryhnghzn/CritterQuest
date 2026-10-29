import { describe, it, expect } from 'vitest';
import { makeArea, makeSweep, makeProjectile, makeOrbit, inShape, stepHits, inherit, castScale } from './hits.js';
import { BOOMERANG_MAX_TRAVEL } from '../data/balance.js';

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

describe('delay (umum)', () => {
  it('area tertunda tidak mengenai sebelum waktunya', () => {
    const hits = [makeArea({ x: 0, y: 0, r: 30, mult: 1, delay: 0.5 })];
    expect(run(hits, [enemy(5, 0)], 0.45)).toEqual([0]);
    expect(run(hits, [enemy(5, 0)], 0.2)).toEqual([1]);
  });

  it('proyektil tertunda diam di tempat lalu melesat', () => {
    const p = makeProjectile({ x: 0, y: 0, angle: 0, speed: 100, range: 400, r: 5, mult: 1, delay: 0.3 });
    const hits = [p];
    run(hits, [], 0.25);
    expect(p.x).toBe(0);
    expect(p.dist).toBe(0);
    run(hits, [], 0.35);
    expect(p.x).toBeGreaterThan(25);
    expect(p.x).toBeLessThan(35);
  });

  it('sweep tertunda umurnya baru berjalan setelah aktif', () => {
    const hits = [makeSweep({ x: 0, y: 0, r: 20, mult: 1, duration: 0.2, delay: 0.5 })];
    expect(run(hits, [enemy(5, 0)], 0.6)).toEqual([1]);
  });
});

describe('target (area)', () => {
  it('area mengikuti musuh sasarannya', () => {
    const e = enemy(200, 0);
    const a = makeArea({ x: 0, y: 0, r: 20, mult: 1, delay: 0.1, duration: 0.5 });
    a.target = e;
    const hits = [a];
    e.x = 300; e.y = 50;
    expect(run(hits, [e], 0.3)).toEqual([1]);
    expect(a.x).toBe(300);
    expect(a.y).toBe(50);
  });

  it('sasaran yang sudah mati: area bertahan di titik terakhir', () => {
    const e = enemy(200, 0);
    const a = makeArea({ x: 0, y: 0, r: 20, mult: 1 });
    a.target = e;
    e.hp = 0; e.x = 999;
    run([a], [e], 0.3);
    expect(a.x).toBe(0);
  });
});

describe('boomerang', () => {
  const boom = (over = {}) => makeProjectile({ x: 0, y: 0, angle: 0, speed: 200, range: 200, r: 10, mult: 2, pierce: Infinity, boomerang: true, ...over });

  it('pergi sejauh jangkauan lalu kembali ke pemain dan hilang', () => {
    const p = boom();
    const hits = [p];
    run(hits, [], 1.1);
    expect(p.x).toBeGreaterThan(150);
    expect(p.returning).toBe(true);
    run(hits, [], 1.2, { x: 0, y: 0 });
    expect(hits.length).toBe(0);
  });

  it('musuh di jalur kena dua kali: pergi dan pulang', () => {
    const e = enemy(100, 0, 15);
    const hits = [boom()];
    expect(run(hits, [e], 3)).toEqual([2]);
  });

  it('kembali ke posisi pemain yang berpindah', () => {
    const p = boom();
    const hits = [p];
    const ctx = { px: 0, py: 0, onHit() {}, add() {} };
    for (let i = 0; i < 70; i++) stepHits(hits, [], DT, ctx); // past the apex
    ctx.px = 0; ctx.py = 150;
    for (let i = 0; i < 20; i++) stepHits(hits, [], DT, ctx);
    expect(p.vy).toBeGreaterThan(0);
    expect(p.angle).toBeCloseTo(Math.atan2(p.vy, p.vx));
  });

  it('pull: musuh yang kena dalam perjalanan pulang terseret searah gerak', () => {
    const e = enemy(100, 0, 15);
    e.kx = 0; e.ky = 0;
    const hits = [boom({ pull: 300 })];
    const ctx = { px: 0, py: 0, onHit() {}, add() {} };
    for (let i = 0; i < 40; i++) stepHits(hits, [e], DT, ctx); // outbound pass: no pull
    expect(e.kx).toBe(0);
    for (let i = 0; i < 120 && e.kx === 0; i++) stepHits(hits, [e], DT, ctx);
    expect(e.kx).toBeLessThan(0); // dragged toward the player
  });

  it('batas aman: pemain yang tak terjangkau membuat bumerang mati setelah jarak tempuh maksimum', () => {
    const p = boom();
    const hits = [p];
    const ctx = { px: -1e5, py: 0, onHit() {}, add() {} }; // never catchable
    const frames = Math.ceil(((p.range * BOOMERANG_MAX_TRAVEL) / p.speed) / DT) + 5;
    for (let i = 0; i < frames; i++) stepHits(hits, [], DT, ctx);
    expect(hits.length).toBe(0);
  });

  it('pull tidak menyeret bos', () => {
    const e = { ...enemy(100, 0, 15), kx: 0, ky: 0, boss: true };
    const hits = [boom({ pull: 300 })];
    run(hits, [e], 3);
    expect(e.kx).toBe(0);
  });
});

describe('trail', () => {
  it('proyektil menaruh area kecil di jalurnya tiap trail.every dtk', () => {
    const p = makeProjectile({ x: 0, y: 0, angle: 0, speed: 200, range: 400, r: 5, mult: 6, trail: { every: 0.1, r: 24, life: 2, ticks: 4, mult: 0.4 } });
    p.skill = true; p.sid = 'pierce'; p.execute = 0.3; p.crit = true;
    const hits = [p];
    run(hits, [], 1);
    const areas = hits.filter((h) => h.kind === 'area');
    expect(areas.length).toBeGreaterThanOrEqual(9);
    expect(areas.length).toBeLessThanOrEqual(10);
    expect(areas[0].r).toBe(24);
    expect(areas[0].ticksLeft).toBeLessThanOrEqual(4);
    expect(areas[0].mult).toBeCloseTo(0.4);
    expect(areas[0].part).toBe('trail');
    expect(areas[0].x).toBeGreaterThan(10);
    expect(areas[1].x).toBeGreaterThan(areas[0].x);
    expect(areas.every((a) => a.skill && a.sid === 'pierce' && a.execute === 0.3 && a.crit)).toBe(true);
  });

  it('jejak mengikuti pengganda cast skill (Panas / Kombo)', () => {
    const p = makeProjectile({ x: 0, y: 0, angle: 0, speed: 200, range: 400, r: 5, mult: 6, trail: { every: 0.1, r: 24, life: 1, ticks: 2, mult: 0.4 } });
    p.mult *= 1.5; // what stepSkills does with traitCast
    const hits = [p];
    run(hits, [], 0.15);
    expect(hits.find((h) => h.kind === 'area').mult).toBeCloseTo(0.4 * 1.5);
  });

  it('proyektil tertunda belum menaruh jejak', () => {
    const p = makeProjectile({ x: 0, y: 0, angle: 0, speed: 200, range: 400, r: 5, mult: 6, delay: 0.5, trail: { every: 0.1, r: 24, life: 1, ticks: 2, mult: 0.4 } });
    const hits = [p];
    run(hits, [], 0.4);
    expect(hits.length).toBe(1);
  });

  it('jejak melukai musuh yang masuk ke dalamnya', () => {
    const p = makeProjectile({ x: 0, y: 0, angle: 0, speed: 200, range: 100, r: 5, mult: 6, trail: { every: 0.1, r: 24, life: 1, ticks: 4, mult: 0.4 } });
    const hits = [p];
    const e = enemy(40, 25, 10); // beside the line: only the trail reaches it
    expect(run(hits, [e], 2)[0]).toBeGreaterThan(0);
  });
});

describe('split', () => {
  const volley = (over = {}) => makeProjectile({ x: 0, y: 0, angle: 0, speed: 300, range: 480, r: 5, mult: 1.2, split: { at: 160, count: 3, spread: 30 }, ...over });

  it('3 proyektil pecah menjadi 9 di titik split', () => {
    const arrows = [-0.2, 0, 0.2].map((a) => volley({ angle: a }));
    arrows.forEach((a) => { a.skill = true; a.sid = 'volley'; });
    const hits = arrows.slice();
    run(hits, [], 0.6);
    expect(arrows.every((a) => a.dead || !hits.includes(a))).toBe(true);
    expect(hits.length).toBe(9);
  });

  it('anak menyebar split.spread derajat, mewarisi flag, dan tidak pecah lagi', () => {
    const p = volley();
    p.skill = true; p.sid = 'volley'; p.execute = 0.2; p.crit = true; p.mult *= 2;
    const hits = [p];
    run(hits, [], 0.6);
    expect(hits.length).toBe(3);
    const angles = hits.map((h) => h.angle).sort((a, b) => a - b);
    expect(angles[0]).toBeCloseTo(-Math.PI / 12);
    expect(angles[1]).toBeCloseTo(0);
    expect(angles[2]).toBeCloseTo(Math.PI / 12);
    for (const c of hits) {
      expect(c.split).toBeFalsy();
      expect(c.skill && c.sid === 'volley' && c.execute === 0.2 && c.crit).toBeTruthy();
      expect(c.mult).toBeCloseTo(1.2 * 2);
      expect(c.dist).toBeLessThan(30); // fresh range, not the parent's
    }
    run(hits, [], 2);
    expect(hits.length).toBe(0);
  });

  it('proyektil yang mengenai musuh sebelum titik split tidak pecah', () => {
    const hits = [volley()];
    expect(run(hits, [enemy(60, 0)], 1)).toEqual([1]);
    expect(hits.length).toBe(0);
  });
});

describe('inherit', () => {
  it('menyalin flag skill dari induk, tidak menyentuh yang kosong', () => {
    const c = makeArea({ x: 0, y: 0, r: 1, mult: 1 });
    inherit(c, { skill: true, sid: 'x', execute: 0.3, crit: true, ult: true, mult: 4, mult0: 2 });
    expect(c).toMatchObject({ skill: true, sid: 'x', execute: 0.3, crit: true, ult: true });
    const d = makeArea({ x: 0, y: 0, r: 1, mult: 1 });
    inherit(d, {});
    expect(d.skill).toBeUndefined();
    expect(d.execute).toBeUndefined();
  });

  it('castScale = pengganda cast pada induk', () => {
    expect(castScale({ mult: 9, mult0: 6 })).toBeCloseTo(1.5);
    expect(castScale({ mult: 3 })).toBe(1);
  });
});

describe('curve (proyektil melengkung)', () => {
  it('arah berputar curve rad/dtk, laju tetap', () => {
    const p = makeProjectile({ x: 0, y: 0, angle: 0, speed: 300, range: 1000, r: 5, mult: 1, curve: Math.PI });
    const hits = [p];
    run(hits, [], 0.5);
    expect(p.angle).toBeCloseTo(Math.PI / 2, 1);
    expect(Math.hypot(p.vx, p.vy)).toBeCloseTo(300);
    expect(p.vy).toBeGreaterThan(250);
  });
  it('tanpa curve lurus', () => {
    const p = makeProjectile({ x: 0, y: 0, angle: 0.3, speed: 300, range: 1000, r: 5, mult: 1 });
    run([p], [], 0.5);
    expect(p.angle).toBe(0.3);
  });
});

describe('explode.shards', () => {
  const ball = (over = {}) => makeProjectile({ x: 0, y: 0, angle: 0, speed: 200, range: 480, r: 14, mult: 3, explode: { r: 85, shards: { count: 6, speed: 300, range: 160, r: 8, mult: 1.2 } }, fx: 'fireball', ...over });

  it('ledakan menambah 6 serpihan radial dari titik tumbukan', () => {
    const hits = [ball()];
    const ctx = { px: 0, py: 0, onHit() {}, add: (h) => hits.push(h) };
    const e = enemy(30, 0, 15);
    for (let i = 0; i < 40 && !hits.some((h) => h.part === 'shard'); i++) stepHits(hits, [e], DT, ctx);
    const shards = hits.filter((h) => h.part === 'shard');
    expect(shards.length).toBe(6);
    const angles = shards.map((s) => ((s.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b);
    for (let i = 1; i < 6; i++) expect(angles[i] - angles[i - 1]).toBeCloseTo(Math.PI / 3);
    expect(shards.every((s) => s.kind === 'proj' && s.range === 160 && s.r === 8 && s.mult === 1.2)).toBe(true);
    expect(shards.every((s) => s.hitSet.has(e))).toBe(true); // the struck enemy is not hit again point-blank
  });

  it('serpihan mewarisi flag skill dan pengganda cast sekali saja', () => {
    const p = ball();
    p.skill = true; p.sid = 'inferno'; p.execute = 0.3; p.crit = true; p.mult *= 2.25;
    const hits = [p];
    const ctx = { px: 0, py: 0, onHit() {}, add: (h) => hits.push(h) };
    for (let i = 0; i < 40 && !hits.some((h) => h.part === 'shard'); i++) stepHits(hits, [enemy(30, 0, 15)], DT, ctx);
    const shards = hits.filter((h) => h.part === 'shard');
    expect(shards.length).toBe(6);
    for (const s of shards) {
      expect(s.skill && s.sid === 'inferno' && s.execute === 0.3 && s.crit).toBeTruthy();
      expect(s.mult).toBeCloseTo(1.2 * 2.25);
    }
  });

  it('serpihan melukai musuh lain yang jauh dari ledakan', () => {
    const hits = [ball()];
    const far = enemy(30 + 120, 0, 15);
    const counts = run(hits, [enemy(30, 0, 15), far], 1);
    expect(counts[1]).toBeGreaterThan(0);
  });
});

describe('orbit', () => {
  const aimCtx = (hits, extra = {}) => ({ px: 0, py: 0, aimPX: 500, aimPY: 0, onHit() {}, add: (h) => hits.push(h), ...extra });
  const shuri = (over = {}) => makeOrbit({ radius: 70, spin: 7, every: 0.25, duration: 3, r: 22, mult: 0.8, throw: { speed: 520, range: 420, r: 16, mult: 3, pierce: Infinity }, ...over });

  it('mengelilingi pemain pada jarak radius dan ikut berpindah', () => {
    const o = shuri();
    const hits = [o];
    const ctx = aimCtx(hits);
    for (let i = 0; i < 30; i++) stepHits(hits, [], DT, ctx);
    expect(Math.hypot(o.x - ctx.px, o.y - ctx.py)).toBeCloseTo(70);
    ctx.px = 200; ctx.py = 50;
    stepHits(hits, [], DT, ctx);
    expect(Math.hypot(o.x - 200, o.y - 50)).toBeCloseTo(70);
  });

  it('berputar sebesar spin rad/dtk', () => {
    const o = shuri();
    const hits = [o];
    const a0 = o.angle;
    const ctx = aimCtx(hits);
    for (let i = 0; i < 30; i++) stepHits(hits, [], DT, ctx);
    expect(o.angle - a0).toBeCloseTo(3.5, 1);
  });

  it('tiap musuh paling banyak duration/every kali, dan kena lebih dari sekali', () => {
    const o = shuri({ spin: 0.0001 }); // practically parked at (70, 0)
    const hits = [o];
    let n = 0;
    const ctx = aimCtx(hits, { onHit: () => n++ });
    const e = enemy(70, 0, 15);
    for (let t = 0; t < 3 - 1e-6; t += DT) stepHits(hits, [e], DT, ctx); // orbit only: the throw would hit too
    expect(n).toBeGreaterThan(8);
    expect(n).toBeLessThanOrEqual(3 / 0.25);
  });

  it('dua musuh dihitung terpisah', () => {
    const o = shuri({ spin: 0.0001 });
    const hits = [o];
    const per = new Map();
    const ctx = aimCtx(hits, { onHit: (h, e) => per.set(e, (per.get(e) || 0) + 1) });
    const a = enemy(70, 0, 15), b = enemy(70, 20, 15);
    for (let t = 0; t < 1; t += DT) stepHits(hits, [a, b], DT, ctx);
    expect(per.get(a)).toBeGreaterThanOrEqual(3);
    expect(per.get(b)).toBeGreaterThanOrEqual(3);
  });

  it('di akhir umur melempar proyektil ke titik bidik dan orbit hilang', () => {
    const o = shuri();
    o.skill = true; o.sid = 'shuriken'; o.execute = 0.3; o.crit = true; o.mult *= 2.25;
    const hits = [o];
    const ctx = aimCtx(hits, { aimPX: 0, aimPY: 400 });
    for (let t = 0; t < 3.1; t += DT) stepHits(hits, [], DT, ctx);
    expect(hits.includes(o)).toBe(false);
    expect(hits.length).toBe(1);
    const th = hits[0];
    expect(th.kind).toBe('proj');
    expect(th.part).toBe('throw');
    expect(th.vy).toBeGreaterThan(0);
    expect(Math.abs(th.vx)).toBeLessThan(th.vy);
    expect(th.pierce).toBe(Infinity);
    expect(th.skill && th.sid === 'shuriken' && th.execute === 0.3 && th.crit).toBeTruthy();
    expect(th.mult).toBeCloseTo(3 * 2.25);
  });

  it('tidak melempar sebelum umurnya habis', () => {
    const hits = [shuri()];
    const ctx = aimCtx(hits);
    for (let t = 0; t < 2.9; t += DT) stepHits(hits, [], DT, ctx);
    expect(hits.length).toBe(1);
    expect(hits[0].kind).toBe('orbit');
  });
});
