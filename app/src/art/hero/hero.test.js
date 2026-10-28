import { describe, it, expect } from 'vitest';
import { drawHero, hasHero } from './index.js';
import { rig, keyframes } from './rig.js';
import { drawDoll } from '../doll.js';
import { HAIR_STYLES, HAIR_COLORS } from '../../data/balance.js';
import { RARITIES } from '../../data/items.js';

// Canvas 2D stand-in: every method is a no-op, gradients accept colour stops.
function fakeCtx() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (String(key).startsWith('create')) return () => gradient;
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
}

describe('gaya D — kerangka & keyframe', () => {
  it('keyframe menyisip nilai dan menahan ujung', () => {
    const keys = [[0, 0, 10], [0.5, 1, 20], [1, 0, 10]];
    expect(keyframes(keys, ['lin', 'lin'], 0)).toEqual([0, 10]);
    expect(keyframes(keys, ['lin', 'lin'], 0.25)).toEqual([0.5, 15]);
    expect(keyframes(keys, ['lin', 'lin'], 1)).toEqual([0, 10]);
  });

  it('tebasan cepat: pedang di atas kepala di awal, di depan saat kena', () => {
    const up = rig('warrior', { attack: 0.06, snappy: true });
    const hit = rig('warrior', { attack: 0.26, snappy: true });
    expect(up.phi).toBeGreaterThan(Math.PI * 0.8);           // raised
    expect(hit.phi).toBeLessThan(1);                        // down in front
    expect(hit.fF.x).toBeGreaterThan(up.fF.x);              // lunge forward
    expect(hit.trail).toBeGreaterThan(0.9);
    expect(rig('warrior', { attack: 0.95, snappy: true }).trail).toBe(0);
  });

  it('di luar serangan tidak ada jejak; semua titik terhingga', () => {
    for (const p of [{}, { moving: 1, walk: 2 }, { hurt: true }, { attack: 0.5 }]) {
      const R = rig('warrior', p);
      for (const k of ['hip', 'hF', 'hB', 'eF', 'eB', 'kF', 'kB', 'fF', 'fB']) {
        expect(Number.isFinite(R[k].x) && Number.isFinite(R[k].y)).toBe(true);
      }
    }
    expect(rig('warrior', {}).trail).toBe(0);
  });
});

describe('gaya D — Warrior', () => {
  it('drawDoll memakai gaya D untuk Warrior saja (kelas lain menyusul)', () => {
    expect(hasHero('warrior')).toBe(true);
    expect(hasHero('mage')).toBe(false);
    expect(drawHero(fakeCtx(), 'mage', { hair: 0, hairColor: 0 }, {})).toBe(null);
  });

  it('semua rambut × warna × pose bisa digambar dan mengembalikan titik jangkar', () => {
    const poses = [{}, { moving: 1, walk: 1.2, t: 3 }, { attackPhase: 0.2 }, { attackPhase: 0.7 }, { hurt: true }];
    for (let hair = 0; hair < HAIR_STYLES; hair++) {
      for (let hairColor = 0; hairColor < HAIR_COLORS; hairColor++) {
        for (const pose of poses) {
          const a = drawDoll(fakeCtx(), 'warrior', { hair, hairColor }, pose);
          expect(a.head.r).toBeGreaterThan(0);
          expect(Number.isFinite(a.hand.x) && Number.isFinite(a.body.y)).toBe(true);
        }
      }
    }
  });

  it('semua tingkat × rarity gear bisa digambar', () => {
    for (let tier = 0; tier <= 6; tier++) {
      for (let rarity = 0; rarity < RARITIES.length; rarity++) {
        const piece = { tier, rarity };
        const gear = { weapon: piece, helm: piece, armor: piece, boots: piece };
        for (const pose of [{ t: 1 }, { attackPhase: 0.25, t: 2 }]) {
          expect(() => drawDoll(fakeCtx(), 'warrior', { hair: 1, hairColor: 2, gear }, pose)).not.toThrow();
        }
      }
    }
  });
});
