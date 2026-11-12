import { describe, it, expect } from 'vitest';
import { createTown, stepTown, npcAt, mapsOf, PLAYER_R } from './town.js';
import { TOWN, INTERIORS } from '../data/town.js';
import { TOWN_DEFS, townDef, doorsOf } from '../data/towns.js';
import { TOWN_IDS } from '../data/world.js';

const MAPS = mapsOf('home'), DOORS = doorsOf(townDef('home'));

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

// a point is free when no solid box is within the player's radius
const free = (map, x, y) => map.solids.every((b) => {
  const cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h));
  return (x - cx) ** 2 + (y - cy) ** 2 >= PLAYER_R * PLAYER_R;
});

describe('kota besar (§25.2)', () => {
  it('setiap kota di data dunia punya denah', () => {
    for (const id of TOWN_IDS) expect(TOWN_DEFS[id]?.id).toBe(id);
  });

  it('mulai di alun-alun / depan gerbang kota yang diminta, di tempat kosong', () => {
    for (const id of TOWN_IDS) {
      const def = townDef(id), maps = mapsOf(id);
      for (const at of ['spawn', 'gate']) {
        const t = createTown({ id, moveSpd: 120, hp: 1, maxHp: 1, at });
        expect(t.id).toBe(id);
        expect([t.x, t.y]).toEqual(at === 'gate' ? [def.gateSpawn.x, def.gateSpawn.y] : [def.spawn.x, def.spawn.y]);
        expect(free(maps.town, t.x, t.y)).toBe(true);
      }
    }
  });

  it('tiap toko punya interior, pintu, dan penjaga; pintu bisa dimasuki', () => {
    for (const id of ['rimba', 'beku', 'pasir', 'bara']) {
      const def = townDef(id), maps = mapsOf(id);
      for (const h of ['inn', 'potion', 'gear', 'guild', 'weapons', 'armor', 'jewelry', 'storage', 'mats']) {
        expect(maps[h], `${id}:${h}`).toBeDefined();
        expect(maps[h].npcs.length).toBeGreaterThan(0);
        const d = doorsOf(def).find((x) => x.house === h);
        const t = createTown({ id, moveSpd: 120, hp: 1, maxHp: 1 });
        Object.assign(t, { x: d.outside.x, y: d.outside.y });
        walk(t, 0, -1, 1);
        expect(t.map, `${id}:${h}`).toBe(h);
      }
    }
  });

  it('NPC tidak berdiri di dalam benda padat; ada batu teleport dan penjaga gerbang', () => {
    for (const id of TOWN_IDS) {
      const maps = mapsOf(id);
      for (const m of Object.values(maps)) for (const n of m.npcs) expect(free({ solids: m.solids.filter((b) => b.kind !== 'fire') }, n.x, n.y), `${id}:${n.id}`).toBe(true);
      expect(maps.town.npcs.some((n) => n.role === 'teleport')).toBe(true);
      expect(maps.town.npcs.some((n) => n.role === 'gate')).toBe(true);
    }
  });

  it('Kota Awal adalah desa besar yang ramai, dengan rumahmu sendiri', () => {
    const home = townDef('home');
    for (const id of ['rimba', 'beku', 'pasir', 'bara']) expect(home.w * home.h).toBeGreaterThanOrEqual(townDef(id).w * townDef(id).h * 0.9);
    expect(home.buildings.filter((b) => b.kind === 'house').length).toBeGreaterThanOrEqual(10);
    expect(home.npcs.filter((n) => n.role === 'talk').length).toBeGreaterThanOrEqual(15);
    expect(new Set(home.buildings.filter((b) => b.style).map((b) => b.style)).size).toBeGreaterThanOrEqual(4); // houses of different shapes
    expect(home.interiors.myhome.npcs.some((n) => n.role === 'rest')).toBe(true);
  });
});

describe('denah kota besar bisa dijelajahi', () => {
  // flood fill over a 10-unit grid from the plaza spawn
  function reach(id) {
    const def = townDef(id), m = mapsOf(id).town, S = 10;
    const cols = Math.ceil(def.w / S), rows = Math.ceil(def.h / S), seen = new Uint8Array(cols * rows);
    const q = [[Math.round(def.spawn.x / S), Math.round(def.spawn.y / S)]];
    seen[q[0][1] * cols + q[0][0]] = 1;
    while (q.length) {
      const [cx, cy] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx]) continue;
        if (!free(m, nx * S, ny * S)) continue;
        seen[ny * cols + nx] = 1; q.push([nx, ny]);
      }
    }
    return (x, y) => seen[Math.round(y / S) * cols + Math.round(x / S)] === 1;
  }

  it('dari alun-alun bisa ke semua pintu, gerbang, batu teleport, dan warga', () => {
    for (const id of ['rimba', 'beku', 'pasir', 'bara']) {
      const ok = reach(id), def = townDef(id);
      for (const d of doorsOf(def)) expect(ok(d.outside.x, d.outside.y), `${id}: pintu ${d.house}`).toBe(true);
      expect(ok(def.gateSpawn.x, def.gateSpawn.y), `${id}: gerbang`).toBe(true);
      for (const n of def.npcs) {
        const near = [[0, 30], [30, 0], [-30, 0], [0, -30]].some(([dx, dy]) => ok(n.x + dx, n.y + dy));
        expect(near, `${id}: ${n.id}`).toBe(true);
      }
    }
  });

  it('warga yang berjalan tidak menembus bangunan', () => {
    for (const id of ['rimba', 'beku', 'pasir', 'bara']) {
      const m = mapsOf(id).town;
      for (const n of townDef(id).npcs.filter((x) => x.wander)) {
        for (let s = 0; s < 120; s += 0.5) {
          const p = npcAt(n, s);
          expect(free(m, p.x, p.y), `${id}: ${n.id} @${s}`).toBe(true);
        }
      }
    }
  });

  it('denah keempat kota berbeda', () => {
    const sig = (id) => { const d = townDef(id); return `${d.w}x${d.h}:` + d.buildings.filter((b) => b.kind !== 'house' && b.kind !== 'gate' && b.kind !== 'stall').map((b) => b.kind).sort().join(','); };
    expect(new Set(['rimba', 'beku', 'pasir', 'bara'].map(sig)).size).toBe(4);
  });
});
