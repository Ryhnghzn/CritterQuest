import { describe, it, expect } from 'vitest';
import { drawHero, hasHero } from './index.js';
import { rig, keyframes, hasMove, moveDuration } from './rig.js';
import { drawDoll } from '../doll.js';
import { HAIR_STYLES, HAIR_COLORS } from '../../data/balance.js';
import { RARITIES } from '../../data/items.js';
import { CLASSES } from '../../data/classes.js';

const CLASS_IDS = Object.keys(CLASSES);

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

  it('archer menarik tali lalu melepas; mage menyala saat merapal; assassin menusuk dua kali', () => {
    const drawn = rig('archer', { attack: 0.6 }), loose = rig('archer', { attack: 0.75 });
    expect(drawn.draw).toBeGreaterThan(0.9);
    expect(drawn.nock).toBe(1);
    expect(loose.draw).toBeLessThan(0.2);
    expect(rig('mage', { attack: 0.5 }).cast).toBeGreaterThan(0.9);
    expect(rig('mage', {}).cast).toBe(0);
    const first = rig('assassin', { attack: 0.4 }), second = rig('assassin', { attack: 0.52 });
    expect(first.phi).toBeGreaterThan(second.phi);   // front hand thrusts first
    expect(second.phiB).toBeGreaterThan(first.phiB); // then the back hand
  });
});

describe('gaya D — gerakan skill', () => {
  it('setiap skill & ultimate punya gerakan, durasinya masuk akal', () => {
    for (const [c, d] of Object.entries(CLASSES)) {
      for (const s of [...d.skills, d.ult]) {
        expect(hasMove(c, s.id)).toBe(true);
        const dur = moveDuration(c, s.id, s.duration);
        expect(dur).toBeGreaterThanOrEqual(0.4);
        expect(dur).toBeLessThanOrEqual(Math.max(1, s.duration || 0));
      }
    }
  });

  it('putaran membalik arah hadap; hantaman melompat; menghindar merunduk', () => {
    const flips = new Set();
    for (let i = 0; i <= 20; i++) flips.add(rig('warrior', { move: { id: 'spin', ph: i / 20, dur: 1 } }).flip);
    expect(flips).toEqual(new Set([1, -1]));
    expect(rig('warrior', { move: { id: 'quake', ph: 0.4 } }).lift).toBeGreaterThan(5);
    expect(rig('warrior', { dodge: 0.5 }).hip.y).toBeGreaterThan(rig('warrior', {}).hip.y + 4);
  });

  it('semua gerakan bisa digambar di semua fase', () => {
    for (const [c, d] of Object.entries(CLASSES)) {
      for (const s of [...d.skills, d.ult]) {
        for (const ph of [0, 0.3, 0.5, 0.9]) expect(() => drawDoll(fakeCtx(), c, { hair: 0, hairColor: 0 }, { move: { id: s.id, ph, dur: 1 } })).not.toThrow();
      }
    }
  });
});

describe('gaya D — keempat kelas', () => {
  it('drawDoll memakai gaya D untuk keempat kelas; NPC tetap boneka lama', () => {
    for (const c of CLASS_IDS) expect(hasHero(c)).toBe(true);
    expect(drawHero(fakeCtx(), null, { hair: 0, hairColor: 0, outfit: ['#555555', '#333333'] }, {})).toBe(null);
  });

  it('semua rambut × warna × pose bisa digambar dan mengembalikan titik jangkar', () => {
    const poses = [{}, { moving: 1, walk: 1.2, t: 3 }, { attackPhase: 0.2 }, { attackPhase: 0.7 }, { hurt: true }];
    for (let hair = 0; hair < HAIR_STYLES; hair++) {
      for (let hairColor = 0; hairColor < HAIR_COLORS; hairColor++) {
        for (const pose of poses) {
          for (const c of CLASS_IDS) {
            const a = drawDoll(fakeCtx(), c, { hair, hairColor }, pose);
            expect(a.head.r).toBeGreaterThan(0);
            expect(Number.isFinite(a.hand.x) && Number.isFinite(a.body.y)).toBe(true);
          }
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
          for (const c of CLASS_IDS) expect(() => drawDoll(fakeCtx(), c, { hair: 1, hairColor: 2, gear }, pose)).not.toThrow();
        }
      }
    }
  });
});
