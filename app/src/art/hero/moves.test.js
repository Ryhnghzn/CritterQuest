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
