import { describe, it, expect } from 'vitest';
import { drawAnime, CLASS_LOOK } from './index.js';
import { body } from './common.js';
import { strikePose, hasStrike } from './strike.js';

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
const JOBS = ['warrior', 'archer', 'mage', 'assassin'];
const look = (c) => ({ style: 'spiky', hair: 'black', eye: CLASS_LOOK[c].eye, element: 'fire', gear: { weapon: 4, armor: 3 } });

describe('pukulan tampak depan & belakang (spec §49)', () => {
  it('tiap job punya pukulan depan & belakang; bisa digambar di tiap fase', () => {
    for (const c of JOBS) for (const view of ['front', 'back']) {
      expect(hasStrike(c, view), `${c} ${view}`).toBe(true);
      for (let ph = 0; ph < 1; ph += 0.05) expect(drawAnime(fakeCtx(), c, look(c), { t: 1, view, attackPhase: ph })).toBeTruthy();
    }
  });

  it('tangan senjata bergerak jauh saat memukul, lalu kembali ke pose jalan', () => {
    for (const c of JOBS) for (const view of ['front', 'back']) {
      const rest = body({ t: 1, view }, c);
      const mid = body({ t: 1, view, attackPhase: 0.15 }, c);
      const end = body({ t: 1, view, attackPhase: 0.999 }, c);
      const hand = strikePose(c, view, 0.15, rest).S.hand;
      const d = Math.hypot(mid[hand].h[0] - rest[hand].h[0], mid[hand].h[1] - rest[hand].h[1]);
      expect(d, `${c} ${view}`).toBeGreaterThan(12);
      expect(Math.hypot(end[hand].h[0] - rest[hand].h[0], end[hand].h[1] - rest[hand].h[1])).toBeLessThan(1);
      expect(Number.isFinite(mid[hand].e[0]) && Number.isFinite(mid.wpsi)).toBe(true);
    }
  });

  it('tanpa serangan, tampak depan/belakang tidak berubah', () => {
    const a = body({ t: 2, view: 'front' }, 'warrior');
    expect(a.wpsi).toBeUndefined();
    expect(a.strike).toBeUndefined();
  });
});
