import { describe, it, expect, beforeAll } from 'vitest';
import { ringTier, setRarity, fullSet, AuraState } from './auratier.js';
import { SET_PILLAR, UNIQUE_AURA } from '../data/aurafx.js';
import { UNIQUES } from '../data/items.js';
import { EQUIP_SLOTS } from '../meta/schema.js';

// Canvas 2D stand-in: every method is a no-op; gradients reject unparsable colours
// (a real canvas throws on them — e.g. glow() given 'rgb(…)' instead of a hex colour).
function fakeCtx() {
  const gradient = { addColorStop(_, c) { if (/NaN/.test(c)) throw new Error(`bad colour ${c}`); } };
  return new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (String(key).startsWith('create')) return () => gradient;
      return () => {};
    },
    set(target, key, v) { target[key] = v; return true; },
  });
}

describe('ringTier', () => {
  it.each([[1, 0], [9, 0], [10, 1], [19, 1], [20, 2], [35, 3], [40, 4], [49, 4], [50, 5], [99, 5], [undefined, 0]])(
    'level %s → tier %s', (lv, tier) => { expect(ringTier(lv)).toBe(tier); });
});

describe('setRarity / fullSet', () => {
  const char = (rarities) => {
    const inventory = [], equipped = {};
    EQUIP_SLOTS.forEach((slot, i) => {
      if (rarities[i] === undefined) { equipped[slot] = null; return; }
      inventory.push({ id: `i${i}`, slot, rarity: rarities[i] });
      equipped[slot] = `i${i}`;
    });
    return { inventory, equipped };
  };
  it('rarity terendah dari semua slot', () => {
    expect(setRarity(char([5, 4, 4, 5, 4, 4]))).toBe(4);
    expect(setRarity(char([5, 5, 5, 5, 5, 5]))).toBe(5);
  });
  it('-1 bila ada slot kosong', () => {
    expect(setRarity(char([5, 5, 5, 5, 5]))).toBe(-1);
  });
  it('set lengkap = semua Legendaris ke atas', () => {
    expect(fullSet(setRarity(char([4, 4, 4, 4, 4, 4])))).toBe(true);
    expect(fullSet(setRarity(char([4, 4, 4, 4, 4, 3])))).toBe(false);
    expect(fullSet(-1)).toBe(false);
  });
});

describe('AuraState', () => {
  it('pilar muncul setelah diam 2 detik lalu tumbuh penuh', () => {
    const s = new AuraState();
    for (let i = 0; i <= 60; i++) s.update(i * (50 / 60), 0, i / 60); // walking, stops at x = 50 at t = 1
    expect(s.pillar(1, true)).toBe(0);
    s.update(50, 0, 1 + SET_PILLAR.still - 0.1);
    expect(s.pillar(1 + SET_PILLAR.still - 0.1, true)).toBe(0);
    const t1 = 1 + SET_PILLAR.still + SET_PILLAR.grow + 0.1;
    s.update(50, 0, t1);
    expect(s.pillar(t1, true)).toBe(1);
    expect(s.pillar(t1, false)).toBe(0); // not a full set
    s.update(60, 0, t1 + 0.1);           // moves again
    expect(s.pillar(t1 + 0.1, true)).toBe(0);
  });
  it('regen menanam bunga saat berjalan, layu setelah waktunya', () => {
    const s = new AuraState();
    let t = 0;
    for (; t < 1; t += 1 / 60) s.update(t * 120, 0, t, true);
    expect(s.flowers.length).toBeGreaterThan(3);
    expect(s.flowers.length).toBeLessThanOrEqual(UNIQUE_AURA.regen.flowers);
    s.update(120, 0, t + UNIQUE_AURA.regen.flowerLife + 0.1, true);
    expect(s.flowers.length).toBe(0);
  });
  it('lompatan jauh (teleport) tidak dihitung berjalan', () => {
    const s = new AuraState();
    s.update(0, 0, 0, true);
    s.update(5000, 0, 0.02, true);
    expect(s.flowers.length).toBe(0);
    expect(s.vx).toBe(0);
  });
});

describe('gambar aura (asap uji)', () => {
  beforeAll(() => {
    globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }) };
  });
  it('semua efek unik, semua rarity, semua tier level, mode penuh & ringan', async () => {
    const { levelRing, auraBack, auraFront } = await import('./aura.js');
    const fx = Object.fromEntries([...new Set(UNIQUES.map((u) => u.effect))].map((e) => [e, 0.5]));
    const g = fakeCtx(), host = {};
    const enemies = [{ x: 10, y: 10, r: 10, hp: 1, maxHp: 10 }];
    for (const lite of [false, true]) {
      for (let lv = 1; lv <= 60; lv += 10) levelRing(g, 0, 0, lv, 1.3, { lite });
      for (let best = -1; best <= 5; best++) {
        for (let t = 0; t < 5; t += 0.37) {
          const o = { host, lite, best, level: 50, set: 5, facing: -1, enemies, frenzyOn: true, shield: 0.5, hurt: true };
          expect(() => auraBack(g, t * 3, 0, fx, t, o)).not.toThrow();
          expect(() => auraFront(g, t * 3, 0, fx, best, t, o)).not.toThrow();
        }
      }
    }
    expect(() => auraFront(g, 0, 0, null, -1, 0)).not.toThrow(); // no options at all
  });
});
