// Animated monsters (plan "hybrid-visual" bagian 6): the frame plan and the frame picked at a time.
import { describe, it, expect } from 'vitest';
import { FOE_ANIM, FOE_ANIM_COLORS, FRAME_PLAN, framePose, frameAt } from './foeanim.js';

describe('musuh bergerak: gambar & pose', () => {
  it('rencana gambar: tiap keadaan punya gambar, total ±23 per jenis', () => {
    const n = FRAME_PLAN.reduce((a, [, k]) => a + k, 0);
    expect(n).toBe(23);
    for (const s of ['idle', 'walk', 'wind', 'strike', 'hurt', 'die']) expect(FRAME_PLAN.some(([k]) => k === s)).toBe(true);
  });
  it('pose: jalan memutar satu langkah penuh, mati berakhir rebah penuh', () => {
    expect(framePose('walk', 0, 6).walk).toBe(0);
    expect(framePose('walk', 3, 6).walk).toBeCloseTo(Math.PI);
    expect(framePose('die', 4, 5).die).toBe(1);
    expect(framePose('wind', 2, 3).wind).toBe(1);
  });
  it('jalan & diam berulang; ancang-ancang, kena pukul & mati berhenti di gambar terakhir', () => {
    expect(frameAt('walk', 0.5, 12, 6)).toBe(0); // 6 → wraps to 0
    expect(frameAt('walk', 7 / 12 + 1e-6, 12, 6)).toBe(1);
    expect(frameAt('wind', 5, 12, 3)).toBe(2);
    expect(frameAt('die', 0.1, 12, 5)).toBe(1);
    expect(frameAt('bite', 0.3, 12, 3)).toBe(0);
  });
  it('setiap gambar dari rencana tergambar tanpa error dan tanpa angka rusak', () => {
    const bad = [];
    const fake = () => new Proxy({}, { get: (o, k) => (k in o ? o[k] : (k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (...a) => { if (a.some((v) => typeof v === 'number' && !Number.isFinite(v))) bad.push(String(k)); })), set: (o, k, v) => { o[k] = v; return true; } });
    for (const [type, f] of Object.entries(FOE_ANIM)) for (const [s, n] of FRAME_PLAN) for (let i = 0; i < n; i++) f(fake(), FOE_ANIM_COLORS[type], framePose(s, i, n));
    expect(bad).toEqual([]);
  });
});
