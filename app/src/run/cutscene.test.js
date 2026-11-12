import { describe, it, expect } from 'vitest';
import { SCENES, CUTSCENE, momentScene, MEMORIES } from '../data/scenes.js';
import { makeCutscene, stepCutscene, shakeOf } from './cutscene.js';

const play = (scene, tapEvery = 0) => {
  const cs = makeCutscene(scene);
  let t = 0, n = 0;
  while (!cs.done && t < 200) { stepCutscene(cs, 1 / 30, { next: tapEvery > 0 && n++ % tapEvery === 0 }); t += 1 / 30; }
  return { cs, t };
};

describe('cutscene (§44)', () => {
  it('setiap adegan selesai sendiri tanpa disentuh, dalam batas waktunya', () => {
    for (const [id, scene] of Object.entries(SCENES)) {
      const { cs, t } = play(scene);
      expect(cs.done, id).toBe(true);
      expect(t, id).toBeLessThan(scene.maxLen || CUTSCENE.maxLen); // ends by itself, well before the safety stop
      expect(t, id).toBeGreaterThan(4);
    }
  });
  it('ketukan mempercepat: teks langsung utuh, lalu lanjut', () => {
    const slow = play(SCENES.opening).t, fast = play(SCENES.opening, 8).t;
    expect(fast).toBeLessThan(slow * 0.75);
  });
  it('lewati langsung selesai', () => {
    const cs = makeCutscene(SCENES.ending);
    stepCutscene(cs, 0.1);
    stepCutscene(cs, 0.1, { skip: true });
    expect(cs.done).toBe(true);
  });
  it('gerak, kamera, getar, judul: nilainya masuk akal', () => {
    const cs = makeCutscene(SCENES['boss:boss']);
    let sawTitle = false, sawShake = false, maxX = -Infinity;
    for (let i = 0; i < 30 * 20 && !cs.done; i++) {
      stepCutscene(cs, 1 / 30);
      if (cs.title) sawTitle = true;
      if (shakeOf(cs) > 0) sawShake = true;
      if (cs.actors.hero) maxX = Math.max(maxX, cs.actors.hero.x);
      expect(Number.isFinite(cs.cam.x) && Number.isFinite(cs.cam.zoom)).toBe(true);
    }
    expect(sawTitle && sawShake).toBe(true);
    expect(maxX).toBeCloseTo(-90, 0);
    expect(cs.actors.boss.kind).toBe('boss');
  });
  it('momen kawal & selamatkan, dan daftar kenangan menunjuk adegan yang ada', () => {
    for (const k of ['escort', 'rescue']) expect(play(momentScene(k, { name: 'X', look: { hair: 0, hairColor: 0 }, outfit: ['#fff', '#000'] })).cs.done).toBe(true);
    for (const m of MEMORIES) expect(SCENES[m.id], m.id).toBeTruthy();
  });
});
