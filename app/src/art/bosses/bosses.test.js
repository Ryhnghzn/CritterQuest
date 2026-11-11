import { describe, it, expect } from 'vitest';
import { drawBoss, BOSS_ART, BOSS_AURAS } from './index.js';
import { BOSS_TYPES } from '../../data/dungeons.js';

// a canvas context that accepts every call (Node has no canvas): the drawing code must run
function mockCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({ calls: 0 }, {
    get: (o, k) => (k in o ? o[k] : k === 'createRadialGradient' || k === 'createLinearGradient' ? () => grad : () => { o.calls++; }),
    set: (o, k, v) => { o[k] = v; return true; },
  });
}

describe('anime bosses (spec §41.2)', () => {
  it('every dungeon boss has art and an aura', () => {
    for (const type of BOSS_TYPES) { expect(BOSS_ART[type], type).toBeTruthy(); expect(BOSS_AURAS[type], type).toBeTruthy(); }
  });
  it('draws every view, both phases, idle and mid-swing, without errors', () => {
    for (const type of BOSS_TYPES) for (const view of ['left', 'front', 'right']) for (const phase of [1, 2]) for (const attack of [null, 0.2, 0.6, 0.95]) for (const t of [0, 1.7, 9.3]) {
      const g = mockCtx();
      expect(drawBoss(g, type, t, phase, attack, view)).toBe(true);
      expect(g.calls).toBeGreaterThan(50);
    }
  });
  it('auras draw behind and in front', () => {
    for (const type of BOSS_TYPES) for (const front of [false, true]) { const g = mockCtx(); BOSS_AURAS[type](g, 200, 280, 1.1, 3.3, 2, front); }
  });
  it('an unknown type draws nothing', () => expect(drawBoss(mockCtx(), 'slink', 0)).toBe(false));
});
