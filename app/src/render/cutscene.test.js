import { describe, it, expect } from 'vitest';
import { SCENES, momentScene, CUTSCENE } from '../data/scenes.js';
import { makeCutscene, stepCutscene } from '../run/cutscene.js';
import { drawBackdrop, drawActors, drawFx, drawPanel } from './cutscene.js';

// Canvas 2D stand-in that checks every coordinate is a finite number
function fakeCtx(bad) {
  const gradient = { addColorStop() {} };
  const NUM = new Set(['moveTo', 'lineTo', 'arc', 'ellipse', 'rect', 'fillRect', 'translate', 'scale', 'quadraticCurveTo', 'bezierCurveTo']);
  return new Proxy({ canvas: { width: CUTSCENE.w, height: CUTSCENE.h } }, {
    get(t, k) {
      if (k in t) return t[k];
      if (String(k).startsWith('create')) return () => gradient;
      if (NUM.has(k)) return (...a) => { if (a.slice(0, 4).some((v) => typeof v !== 'number' || !Number.isFinite(v))) bad.push(`${String(k)}(${a.slice(0, 4).join(',')})`); };
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const hero = { classId: 'warrior', look: { hair: 1, hairColor: 2, gear: {} } };

describe('gambar cutscene (§44)', () => {
  it('setiap adegan tergambar tiap detiknya tanpa angka rusak', () => {
    const scenes = { ...SCENES, m1: momentScene('escort', { name: 'X', look: { hair: 0, hairColor: 0 }, outfit: ['#fff', '#000'] }), m2: momentScene('rescue', { name: 'Y', look: { hair: 1, hairColor: 1 }, outfit: ['#fff', '#000'] }) };
    for (const [id, sc] of Object.entries(scenes)) {
      const cs = makeCutscene(sc), bad = [];
      for (let i = 0; i < 400 && !cs.done; i++) {
        stepCutscene(cs, 0.1);
        if (i % 4) continue;
        const g = fakeCtx(bad), t = i * 0.1;
        if (cs.panel) drawPanel(g, cs.panel.id, CUTSCENE.w, CUTSCENE.h, t);
        else { const gy = drawBackdrop(g, cs.bg, cs, CUTSCENE.w, CUTSCENE.h, t); drawActors(g, cs, CUTSCENE.w, CUTSCENE.h, t, hero); drawFx(g, cs, CUTSCENE.w, CUTSCENE.h, t, gy); }
      }
      expect(bad.slice(0, 3), id).toEqual([]);
    }
  });
});
