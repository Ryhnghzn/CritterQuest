import { describe, it, expect } from 'vitest';
import { drawDoll, HAIR_NAMES, HAIR_PALETTE, HAIR_COLOR_NAMES, OUTFIT } from './doll.js';
import { ENEMY_ART, PICKUP_ART, DECOR_ART, ICON_IDS, drawIcon } from './sprites.js';
import { HAIR_STYLES, HAIR_COLORS } from '../data/balance.js';
import { CLASSES } from '../data/classes.js';
import { ENEMIES } from '../data/enemies.js';

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

describe('paper doll vektor', () => {
  it('jumlah gaya, warna, dan baju kelas cocok dengan data', () => {
    expect(HAIR_NAMES.length).toBe(HAIR_STYLES);
    expect(HAIR_PALETTE.length).toBe(HAIR_COLORS);
    expect(HAIR_COLOR_NAMES.length).toBe(HAIR_COLORS);
    expect(Object.keys(OUTFIT).sort()).toEqual(Object.keys(CLASSES).sort());
  });

  it('semua kombinasi kelas × rambut × warna × pose bisa digambar', () => {
    const poses = [{}, { moving: 1, walk: 1.2, t: 3 }, { attack: 1 }, { hurt: true }];
    for (const classId of Object.keys(CLASSES)) {
      for (let hair = 0; hair < HAIR_STYLES; hair++) {
        for (let hairColor = 0; hairColor < HAIR_COLORS; hairColor++) {
          for (const pose of poses) {
            const a = drawDoll(fakeCtx(), classId, { hair, hairColor }, pose);
            expect(a.head.r).toBeGreaterThan(0);
            expect(Number.isFinite(a.hand.x)).toBe(true);
          }
        }
      }
    }
  });
});

describe('sprite vektor', () => {
  it('tiap jenis musuh punya gambar', () => {
    for (const [type, e] of Object.entries(ENEMIES)) {
      expect(ENEMY_ART[type], type).toBeTypeOf('function');
      ENEMY_ART[type](fakeCtx(), e.r);
    }
  });

  it('pickup, dekor, dan ikon bisa digambar', () => {
    for (const f of [...Object.values(PICKUP_ART), ...Object.values(DECOR_ART)]) f(fakeCtx());
    for (const id of ICON_IDS) drawIcon(fakeCtx(), id, 32);
    drawIcon(fakeCtx(), 'iconEmber', 32);
  });
});
