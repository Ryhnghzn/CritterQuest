import { describe, it, expect } from 'vitest';
import { MAJESTIC_MOUNTS, drawMajesticRidden } from './mounts.js';
import { hasViews } from './mountviews.js';

// Canvas 2D stand-in that checks every coordinate is a finite number.
function fakeCtx(bad) {
  const gradient = { addColorStop() {} };
  const PATH = new Set(['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'ellipse', 'rect', 'fillRect', 'translate', 'scale']);
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (String(k).startsWith('create')) return () => gradient;
      if (PATH.has(k)) return (...a) => { if (a.slice(0, 4).some((v) => typeof v !== 'number' || !Number.isFinite(v))) bad.push(`${String(k)}(${a.join(',')})`); };
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

describe('mount tampak depan & belakang (§35.3, §38)', () => {
  it('kesembilan mount punya tampak depan & belakang', () => {
    for (const m of MAJESTIC_MOUNTS) expect(hasViews(m), m.id).toBe(true);
  });
  it('semua mount × warna × tampak × diam/berjalan tergambar tanpa angka rusak, penunggang di antara lapisan', () => {
    for (const m of MAJESTIC_MOUNTS) for (let skin = 0; skin < m.skins.length; skin++) for (const view of ['side', 'front', 'back']) for (const mv of [0, 1]) {
      const bad = [], seen = [];
      const g = fakeCtx(bad);
      drawMajesticRidden(g, m, { t: 2.3, m: mv, w: 4.1, skin, view }, { classId: 'warrior', look: {} }, (gg, cls, look, p) => seen.push(p.view || 'side'));
      expect(bad, `${m.id}/${skin}/${view}/${mv}`).toEqual([]);
      expect(seen).toEqual([view]);
    }
  });
});
