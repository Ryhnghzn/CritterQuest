import { describe, it, expect } from 'vitest';
import { createTown, stepTown, npcAt, MAPS, PLAYER_R } from './town.js';
import { TOWN, INTERIORS, DOORS } from '../data/town.js';

const DT = 1 / 60;
const fresh = (over = {}) => ({ ...createTown({ moveSpd: 120, hp: 50, maxHp: 100 }), ...over });
function walk(t, x, y, seconds) {
  for (let s = 0; s < seconds - 1e-9; s += DT) stepTown(t, { move: { x, y } }, DT);
}
const fence = TOWN.buildings.find((b) => b.id === 'fence1');
const inn = TOWN.buildings.find((b) => b.id === 'inn');
const innDoor = DOORS.find((d) => d.house === 'inn');

describe('gerak di kota', () => {
  it('mulai di alun-alun atau di depan gerbang', () => {
    expect([fresh().x, fresh().y, fresh().map]).toEqual([TOWN.spawn.x, TOWN.spawn.y, 'town']);
    const g = createTown({ moveSpd: 120, hp: 1, maxHp: 1, at: 'gate' });
    expect([g.x, g.y]).toEqual([TOWN.gateSpawn.x, TOWN.gateSpawn.y]);
  });

  it('berjalan dengan moveSpd', () => {
    const t = fresh();
    walk(t, 1, 0, 0.5);
    expect(t.x).toBeCloseTo(TOWN.spawn.x + 60);
  });

  it('dinding rumah (di luar pintu) tidak bisa ditembus', () => {
    const t = fresh({ x: inn.x + 30, y: inn.y + inn.h + 40 });
    walk(t, 0, -1, 2);
    expect(t.map).toBe('town');
    expect(t.y).toBeGreaterThanOrEqual(inn.y + inn.h + PLAYER_R - 1e-6);
  });

  it('pagar tidak bisa ditembus; menyusuri saat bergerak miring', () => {
    const t = fresh({ x: fence.x + fence.w / 2, y: fence.y + fence.h + PLAYER_R + 1 });
    walk(t, Math.SQRT1_2, -Math.SQRT1_2, 0.4);
    expect(t.y).toBeGreaterThanOrEqual(fence.y + fence.h + PLAYER_R - 1e-6);
    expect(t.x).toBeGreaterThan(fence.x + fence.w / 2 + 20);
  });

  it('tetap di dalam tembok kota', () => {
    const t = fresh({ x: 480, y: 450 });
    walk(t, -1, 0, 10);
    expect(t.x).toBeGreaterThanOrEqual(TOWN.wall + PLAYER_R - 1e-6);
  });
});

describe('pintu & interior', () => {
  it('berjalan ke pintu rumah → masuk ke dalam; berjalan keluar pintu → kembali ke depan rumah', () => {
    const t = fresh({ x: innDoor.outside.x, y: innDoor.outside.y });
    walk(t, 0, -1, 1);
    expect(t.map).toBe('inn');
    const r = INTERIORS.inn;
    expect(t.y).toBeLessThan(r.h);
    walk(t, 0, 0.0, 0.5);
    walk(t, 0, 1, 1.5);
    expect(t.map).toBe('town');
    expect(t.y).toBeGreaterThan(inn.y + inn.h);
  });

  it('tiap rumah punya interior dan pintu', () => {
    for (const id of ['inn', 'potion', 'gear', 'guild']) {
      expect(INTERIORS[id]).toBeDefined();
      expect(DOORS.some((d) => d.house === id)).toBe(true);
    }
  });

  it('di dalam: dinding & perabot padat menahan pemain', () => {
    const r = INTERIORS.potion;
    const t = fresh({ map: 'potion', x: r.w / 2, y: 200 });
    walk(t, 0, -1, 3);
    const counter = r.furniture.find((f) => f.kind === 'counter');
    expect(t.y).toBeGreaterThanOrEqual(counter.y + counter.h + PLAYER_R - 1e-6);
    walk(t, -1, 0, 5);
    expect(t.x).toBeGreaterThanOrEqual(r.wall + PLAYER_R - 1e-6);
  });

  it('penjual ada di dalam; bisa diajak bicara dari depan meja', () => {
    const r = INTERIORS.potion;
    const t = fresh({ map: 'potion', x: 220, y: 150 });
    stepTown(t, { move: { x: 0, y: 0 } }, DT);
    expect(t.near?.role).toBe('potion');
    expect(TOWN.npcs.some((n) => n.role === 'potion')).toBe(false);
  });
});

describe('NPC & HP', () => {
  it('warga kota bisa diajak bicara dan punya dialog', () => {
    const odo = TOWN.npcs.find((n) => n.id === 'odo');
    const t = fresh({ x: odo.x + 20, y: odo.y + 20 });
    stepTown(t, { move: { x: 0, y: 0 } }, DT);
    expect(t.near?.id).toBe('odo');
    for (const m of Object.values(MAPS)) {
      for (const n of m.npcs) if (n.role === 'talk') expect(n.lines.length).toBeGreaterThan(0);
    }
  });

  it('warga yang berjalan-jalan tetap di sekitar tempatnya', () => {
    const pip = TOWN.npcs.find((n) => n.id === 'pip');
    for (let s = 0; s < 60; s += 0.7) {
      const p = npcAt(pip, s);
      expect(Math.abs(p.x - pip.x)).toBeLessThanOrEqual(pip.wander.rx + 1e-6);
      expect(Math.abs(p.y - pip.y)).toBeLessThanOrEqual(pip.wander.ry + 1e-6);
    }
  });

  it('HP pulih 1% per detik, tidak melebihi maks', () => {
    const t = fresh({ x: 200, y: 600 });
    walk(t, 0, 0, 10);
    expect(t.hp).toBeCloseTo(60);
    walk(t, 0, 0, 60);
    expect(t.hp).toBe(100);
  });
});
