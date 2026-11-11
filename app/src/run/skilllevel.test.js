import { describe, it, expect } from 'vitest';
import { leveled } from './skilllevel.js';

const def = { id: 'x', kind: 'area', mult: 2, r: 80, duration: 1, blast: { r: 50, mult: 1 }, explode: { shards: { count: 4, mult: 1 } }, pierce: Infinity,
  lv3: { r: 100, blast: { r: 70 } }, lv5: { after: { r: 60, mult: 0.4, duration: 2, ticks: 4 } } };

describe('leveled (spec §43.2)', () => {
  it('level 1 = the definition (patches unused), the original never changes', () => {
    const d = leveled(def, 1);
    expect(d.mult).toBe(2); expect(d.r).toBe(80); expect(d.after).toBeUndefined(); expect(d.lv3).toBeUndefined();
    expect(def.r).toBe(80); expect(def.lv3).toBeTruthy();
  });
  it('+12% damage per level, nested mults too; Infinity survives', () => {
    const d = leveled(def, 2);
    expect(d.mult).toBeCloseTo(2.24); expect(d.blast.mult).toBeCloseTo(1.12); expect(d.explode.shards.mult).toBeCloseTo(1.12);
    expect(d.pierce).toBe(Infinity);
    expect(leveled(def, 5).mult).toBeCloseTo(2 * 1.48);
  });
  it('level 3 applies lv3 (deep merge), level 5 adds lv5', () => {
    const d3 = leveled(def, 3);
    expect(d3.r).toBe(100); expect(d3.blast).toEqual({ r: 70, mult: 1.24 }); expect(d3.after).toBeUndefined();
    const d5 = leveled(def, 5);
    expect(d5.r).toBe(100); expect(d5.after.mult).toBeCloseTo(0.4 * 1.48);
  });
  it('ultimates: +15% per level; level 3 Luas lasts 0.5 s longer, Fokus hits wider', () => {
    expect(leveled({ mult: 3, duration: 2.5 }, 3, true)).toMatchObject({ duration: 3 });
    expect(leveled({ mult: 3, duration: 2.5 }, 3, true).mult).toBeCloseTo(3 * 1.3);
    expect(leveled({ mult: 3, r: 50, focus: true }, 3, true).r).toBeCloseTo(60);
  });
});
