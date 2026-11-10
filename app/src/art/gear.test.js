import { describe, it, expect } from 'vitest';
import { drawItemIcon } from './gear.js';

// fake 2D context (no DOM): every method no-op, gradients accept colour stops.
function fakeCtx() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (String(k).startsWith('create')) return () => gradient;
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

describe('ikon item anime (spesifikasi §39)', () => {
  it('semua slot × semua rarity tergambar tanpa error (Node: jalur anime halus)', () => {
    for (const slot of ['weapon', 'helm', 'armor', 'boots', 'amulet', 'ring']) {
      for (let rarity = 0; rarity <= 5; rarity++) {
        for (const classId of [null, 'warrior', 'archer', 'mage', 'assassin']) {
          const item = { slot, classId, rarity };
          expect(() => drawItemIcon(fakeCtx(), item, 40, 1)).not.toThrow();
        }
      }
    }
  });
});