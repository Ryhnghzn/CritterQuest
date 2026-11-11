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

  it('gaya D dengan rambut ke-6 (Poni Samping) tidak error (spec §39)', () => {
    expect(() => drawDoll(fakeCtx(), 'warrior', { hair: 5, hairColor: 0 }, {})).not.toThrow();
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

describe('gear per varian', () => {
  it('tiap slot × tingkat (dan tiap senjata kelas) bisa digambar di badan dan sebagai ikon', async () => {
    const { drawGearIcon } = await import('./gear.js');
    for (let tier = 0; tier < 7; tier++) {
      for (const classId of Object.keys(CLASSES)) {
        const gear = { weapon: { tier, rarity: 3 }, helm: { tier, rarity: 4 }, armor: { tier, rarity: 5 }, boots: { tier, rarity: 1 } };
        drawDoll(fakeCtx(), classId, { hair: 2, hairColor: 1, gear }, { attack: 0.5, t: 1 });
        drawGearIcon(fakeCtx(), { slot: 'weapon', classId, variant: tier, rarity: tier % 6 }, 32, 1);
      }
      for (const slot of ['helm', 'armor', 'boots', 'amulet', 'ring']) drawGearIcon(fakeCtx(), { slot, classId: null, variant: tier, rarity: 5 }, 32, 1);
    }
  });

  it('tiap rarity (Biasa–Mitos) bisa digambar di badan (diam & menyerang) dan sebagai ikon', async () => {
    const { drawGearIcon } = await import('./gear.js');
    for (let rarity = 0; rarity < 6; rarity++) {
      for (const classId of Object.keys(CLASSES)) {
        const gear = Object.fromEntries(['weapon', 'helm', 'armor', 'boots'].map((s) => [s, { tier: rarity, rarity }]));
        for (const pose of [{ t: 2 }, { attack: 0.8, t: 3.3 }]) drawDoll(fakeCtx(), classId, { hair: 0, hairColor: 0, gear }, pose);
        drawGearIcon(fakeCtx(), { slot: 'weapon', classId, variant: 6, rarity }, 32, 2.5);
      }
      for (const slot of ['helm', 'armor', 'boots', 'amulet', 'ring']) drawGearIcon(fakeCtx(), { slot, classId: null, variant: 3, rarity }, 32, 2.5);
    }
  });

  it('helm Mitos menutupi rambut, lingkar Runa biasa tidak', async () => {
    const { helmHidesHair } = await import('./gear.js');
    expect(helmHidesHair(4, 3)).toBe(false);
    expect(helmHidesHair(4, 5)).toBe(true);
    expect(helmHidesHair(2, 0)).toBe(true);
  });
});
