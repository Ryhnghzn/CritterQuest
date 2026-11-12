import { describe, it, expect } from 'vitest';
import { defenseCut, powerFrom, powerOf, recPower, gapOf, powerTone } from './power.js';
import { DEFENSE, REC_POWER, GAP } from '../data/power.js';
import { benchChar } from '../run/benchkit.js';
import { makeItem } from './itemgen.js';

describe('Power (spec §47)', () => {
  it('DEF memotong persen: makin besar makin banyak, tidak lewat batas, level tinggi butuh DEF lebih', () => {
    expect(defenseCut(0, 10)).toBe(0);
    expect(defenseCut(10, 10)).toBeGreaterThan(defenseCut(5, 10));
    expect(defenseCut(1e6, 10)).toBe(DEFENSE.cap);
    expect(defenseCut(10, 40)).toBeLessThan(defenseCut(10, 10));
  });

  it('Power naik dengan ATK, HP, DEF, kritis, dan level skill', () => {
    const s = { atk: 50, maxHp: 500, def: 5, crit: 5, critDmg: 1.5, atkSpd: 1, cdr: 0 };
    const p = powerFrom(s, 10);
    for (const more of [{ atk: 60 }, { maxHp: 600 }, { def: 10 }, { crit: 30 }, { atkSpd: 1.3 }, { cdr: 20 }]) expect(powerFrom({ ...s, ...more }, 10)).toBeGreaterThan(p);
    expect(powerFrom(s, 10, { a: 5, b: 5 })).toBeGreaterThan(p);
  });

  it('gear Mitos memberi Power lebih tinggi dari gear biasa', () => {
    let seed = 9; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const c = benchChar('warrior', 40), before = powerOf(c);
    for (const slot of ['weapon', 'helm', 'armor', 'boots', 'amulet', 'ring']) { const it = makeItem({ slot, classId: 'warrior', rarity: 5, itemLevel: 40 }, rng); c.inventory.push(it); c.equipped[slot] = it.id; }
    expect(powerOf(c)).toBeGreaterThan(before);
  });

  it('Power disarankan = rata-rata bot uji di levelnya (±15%), naik terus, tersambung lurus', () => {
    for (const L of [10, 20, 30, 40, 50]) {
      const avg = ['warrior', 'archer', 'mage', 'assassin'].reduce((n, j) => n + powerOf(benchChar(j, L)), 0) / 4;
      expect(Math.abs(recPower(L) / avg - 1), `L${L}`).toBeLessThan(0.15);
    }
    for (let i = 1; i < REC_POWER.length; i++) expect(REC_POWER[i][1]).toBeGreaterThan(REC_POWER[i - 1][1]);
    expect(recPower(12)).toBeGreaterThan(recPower(10));
    expect(recPower(12)).toBeLessThan(recPower(15));
    expect(recPower(55)).toBeGreaterThan(recPower(50)); // past the table: the last step goes on
  });

  it('selisih Power: lebih kuat → musuh lebih pelan & seranganmu lebih kuat; lebih lemah → sebaliknya; ada batasnya', () => {
    const rec = recPower(30);
    expect(gapOf(rec, 30)).toEqual({ taken: 1, dealt: 1 });
    const strong = gapOf(rec * 2, 30), weak = gapOf(rec / 2, 30);
    expect(strong.taken).toBeLessThan(0.5); expect(strong.dealt).toBeGreaterThan(1.3);
    expect(weak.taken).toBeGreaterThan(1.5); expect(weak.dealt).toBeLessThan(0.8);
    expect(gapOf(rec * 100, 30).taken).toBe(GAP.taken.min);
    expect(gapOf(rec / 100, 30).taken).toBe(GAP.taken.max);
    expect(gapOf(rec * 100, 30).dealt).toBe(GAP.dealt.max);
    expect(gapOf(rec / 100, 30).dealt).toBe(GAP.dealt.min);
    expect(gapOf(0, 30)).toEqual({ taken: 1, dealt: 1 }); // no Power given: no gap
  });

  it('warna saran: aman / setara / bahaya', () => {
    expect(powerTone(2000, 1000)).toBe('safe');
    expect(powerTone(1000, 1000)).toBe('even');
    expect(powerTone(500, 1000)).toBe('danger');
  });
});
