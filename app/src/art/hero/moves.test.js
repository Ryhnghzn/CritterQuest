import { describe, it, expect } from 'vitest';
import { rig, hasMove } from './rig.js';
import { CLASSES, JOB_IDS } from '../../data/classes.js';
import { BRANCHES } from '../../data/branches.js';

const finite = (v) => (typeof v === 'number' ? Number.isFinite(v) : v && typeof v === 'object' ? Object.values(v).every(finite) : true);

describe('gerakan skill (§43 & Job Lanjutan)', () => {
  it('tiap skill & ultimate job dan cabang punya gerakan; kerangka tetap angka sah di sepanjang gerakan', () => {
    for (const job of JOB_IDS) {
      const ids = [...CLASSES[job].skills, ...CLASSES[job].ults, ...BRANCHES[job].flatMap((b) => [...b.skills, b.ult])].map((s) => s.id);
      for (const id of ids) {
        expect(hasMove(job, id), `${job}:${id}`).toBe(true);
        for (const ph of [0, 0.25, 0.5, 0.75, 1]) {
          const R = rig(job, { t: 1, move: { id, ph, dur: 1 }, gait: true });
          for (const k of ['hip', 'hF', 'hB', 'fF', 'fB', 'sF', 'sB']) expect(finite(R[k]), `${job}:${id}@${ph} ${k}`).toBe(true);
        }
      }
    }
  });
});

import { whirlView } from './rig.js';
describe('whirlView (owner 2026-11-13: spins turn through all four views)', () => {
  it('a whirl shows side, front, side and back in turn', () => {
    const seen = new Set();
    for (let ph = 0.1; ph < 0.9; ph += 0.01) seen.add(whirlView('warrior', { id: 'spin', ph, dur: 1 }));
    expect([...seen].sort()).toEqual(['back', 'front', 'side']);
  });
  it('the wind-up and finish stay side-on; other moves are no whirl', () => {
    expect(whirlView('warrior', { id: 'spin', ph: 0.02, dur: 1 })).toBeNull();
    expect(whirlView('warrior', { id: 'spin', ph: 0.97, dur: 1 })).toBeNull();
    expect(whirlView('warrior', { id: 'charge', ph: 0.5, dur: 1 })).toBeNull();
    expect(whirlView('warrior', null)).toBeNull();
  });
});
