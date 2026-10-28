import { describe, it, expect } from 'vitest';
import { chestPhase, topRarity } from './reveal.js';
import { CHEST_FX } from '../data/itemfx.js';

describe('buka peti', () => {
  it('rarity tertinggi menentukan warna sinar', () => {
    expect(topRarity([{ rarity: 1 }, { rarity: 4 }, { rarity: 2 }])).toBe(4);
    expect(topRarity([])).toBe(0);
  });

  it('peti bergetar, lalu tutup terlempar, sinar & item muncul, lalu selesai', () => {
    const shut = chestPhase(CHEST_FX.lidAt * 0.5, 3);
    expect(shut.shake).toBeGreaterThan(0);
    expect(shut.lid).toBe(0);
    expect(shut.beams).toBe(0);
    expect(shut.rise).toBe(0);
    expect(shut.name).toBe(false);

    const open = chestPhase(CHEST_FX.lidAt + 1, 3);
    expect(open.shake).toBe(0);
    expect(open.lid).toBe(1);
    expect(open.beams).toBeGreaterThan(0.9);
    expect(open.rise).toBeGreaterThan(0.9);
    expect(open.name).toBe(true);
    expect(open.done).toBe(false);

    expect(chestPhase(CHEST_FX.duration, 3).done).toBe(true);
  });

  it('makin tinggi rarity, makin banyak sinar & percikan', () => {
    for (let r = 1; r < 6; r++) {
      expect(chestPhase(1, r).beamCount).toBeGreaterThan(chestPhase(1, r - 1).beamCount);
      expect(chestPhase(1, r).sparks).toBeGreaterThan(chestPhase(1, r - 1).sparks);
    }
  });

  it('nilai fase selalu dalam batas', () => {
    for (let t = 0; t <= CHEST_FX.duration + 1; t += 0.05) {
      const p = chestPhase(t, 5);
      for (const k of ['lid', 'beams', 'rise']) { expect(p[k]).toBeGreaterThanOrEqual(0); expect(p[k]).toBeLessThanOrEqual(1); }
    }
  });
});
