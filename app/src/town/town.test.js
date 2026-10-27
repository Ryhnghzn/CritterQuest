import { describe, it, expect } from 'vitest';
import { createTown, stepTown, PLAYER_R } from './town.js';
import { TOWN } from '../data/town.js';

const DT = 1 / 60;
const fresh = (over = {}) => ({ ...createTown({ moveSpd: 120, hp: 50, maxHp: 100 }), ...over });
function walk(t, x, y, seconds) {
  for (let s = 0; s < seconds - 1e-9; s += DT) stepTown(t, { move: { x, y } }, DT);
}
const inn = TOWN.buildings.find((b) => b.id === 'inn');

describe('gerak di kota', () => {
  it('mulai di alun-alun atau di depan gerbang', () => {
    expect([fresh().x, fresh().y]).toEqual([TOWN.spawn.x, TOWN.spawn.y]);
    const g = createTown({ moveSpd: 120, hp: 1, maxHp: 1, at: 'gate' });
    expect([g.x, g.y]).toEqual([TOWN.gateSpawn.x, TOWN.gateSpawn.y]);
  });

  it('berjalan dengan moveSpd', () => {
    const t = fresh();
    walk(t, 1, 0, 0.5);
    expect(t.x).toBeCloseTo(TOWN.spawn.x + 60);
  });

  it('tidak bisa masuk ke bangunan', () => {
    const t = fresh({ x: inn.x + inn.w / 2, y: inn.y + inn.h + 40 });
    walk(t, 0, -1, 2);
    expect(t.y).toBeGreaterThanOrEqual(inn.y + inn.h + PLAYER_R - 1e-6);
  });

  it('menyusuri dinding saat bergerak miring', () => {
    const t = fresh({ x: inn.x + inn.w / 2, y: inn.y + inn.h + PLAYER_R + 1 });
    walk(t, Math.SQRT1_2, -Math.SQRT1_2, 0.5);
    expect(t.x).toBeGreaterThan(inn.x + inn.w / 2 + 30);
  });

  it('tetap di dalam tembok kota', () => {
    const t = fresh({ x: 480, y: 450 });
    walk(t, -1, 0, 10);
    expect(t.x).toBeGreaterThanOrEqual(TOWN.wall + PLAYER_R - 1e-6);
  });
});

describe('NPC & HP', () => {
  it('NPC dalam jangkauan bicara terdeteksi', () => {
    const npc = TOWN.npcs.find((n) => n.id === 'inn');
    const t = fresh({ x: npc.x + 20, y: npc.y + 20 });
    stepTown(t, { move: { x: 0, y: 0 } }, DT);
    expect(t.near?.id).toBe('inn');
    const far = fresh();
    stepTown(far, { move: { x: 0, y: 0 } }, DT);
    expect(far.near).toBeNull();
  });

  it('HP pulih 1% per detik, tidak melebihi maks', () => {
    const t = fresh();
    walk(t, 0, 0, 10);
    expect(t.hp).toBeCloseTo(60);
    walk(t, 0, 0, 60);
    expect(t.hp).toBe(100);
  });
});
