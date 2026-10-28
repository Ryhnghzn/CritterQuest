import { describe, it, expect } from 'vitest';
import { Vfx, FpsWatch, activeQuality } from './vfx.js';
import { QUALITY, CAPS, BURST } from '../data/fx.js';
import { rand, resetRng } from '../core/rng.js';

describe('Vfx pool', () => {
  it('tidak pernah melebihi batas partikel', () => {
    const v = new Vfx({ cap: 50, mul: 1 });
    for (let i = 0; i < 40; i++) v.burst('kill', 0, 0, '#fff', { n: 10 });
    expect(v.particles.size).toBe(50);
    expect(v.spawn('dot', 0, 0, 0, 0, 1, 1, '#fff')).toBeNull();
  });

  it('memakai ulang objek setelah partikel mati (tanpa alokasi baru)', () => {
    const v = new Vfx({ cap: 20, mul: 1 });
    v.burst('kill', 0, 0, '#fff', { n: 20 });
    const objs = new Set(v.particles.items);
    for (let i = 0; i < 120; i++) v.step(1 / 60); // all dead (life ≤ 0.6 s)
    expect(v.particles.size).toBe(0);
    v.burst('kill', 0, 0, '#fff', { n: 20 });
    expect(v.particles.items.length).toBe(20);
    for (const p of v.particles.items) expect(objs.has(p)).toBe(true);
  });

  it('mode Ringan memunculkan separuh partikel', () => {
    const full = new Vfx(QUALITY.full), lite = new Vfx(QUALITY.lite);
    full.burst('blast', 0, 0, '#fff'); lite.burst('blast', 0, 0, '#fff');
    expect(full.particles.size).toBe(BURST.blast.count);
    expect(lite.particles.size).toBe(Math.round(BURST.blast.count * 0.5));
  });

  it('menurunkan batas memangkas partikel yang hidup', () => {
    const v = new Vfx({ cap: 100, mul: 1 });
    v.burst('kill', 0, 0, '#fff', { n: 80 });
    v.setQuality(QUALITY.lite, 30);
    expect(v.particles.size).toBe(30);
    expect(v.mul).toBe(0.5);
  });

  it('cincin, retakan & kilat punya batas sendiri', () => {
    const v = new Vfx();
    for (let i = 0; i < 100; i++) { v.ring(0, 0); v.crack(0, 0); v.flash(); }
    expect(v.rings.size).toBe(CAPS.rings);
    expect(v.cracks.size).toBe(CAPS.cracks);
    expect(v.flashes.size).toBe(CAPS.flashes);
    for (let i = 0; i < 120; i++) v.step(1 / 60);
    expect(v.rings.size + v.cracks.size + v.flashes.size).toBe(0);
  });

  it('memilih warna dari palet', () => {
    const v = new Vfx();
    v.burst('hit', 0, 0, ['#a', '#b']);
    for (const p of v.particles.items.slice(0, v.particles.size)) expect(['#a', '#b']).toContain(p.color);
  });

  it('tidak memakai RNG simulasi', () => {
    resetRng(1); const a = rand();
    resetRng(1);
    const v = new Vfx();
    v.burst('blast', 0, 0, '#fff'); v.crack(0, 0);
    expect(rand()).toBe(a);
  });
});

describe('FpsWatch', () => {
  const run = (w, fps, seconds) => {
    let hit = false;
    for (let i = 0; i < fps * seconds; i++) hit = w.push(1 / fps) || hit;
    return hit;
  };
  it('turun ke Ringan bila FPS < 40 selama 3 detik', () => {
    const w = new FpsWatch({ fps: 40, seconds: 3 });
    expect(run(w, 30, 2.4)).toBe(false);
    expect(run(w, 30, 1)).toBe(true);
    expect(w.tripped).toBe(true);
  });
  it('FPS yang pulih mengulang hitungan', () => {
    const w = new FpsWatch({ fps: 40, seconds: 3 });
    run(w, 30, 2.5); run(w, 60, 1); run(w, 30, 2.5);
    expect(w.tripped).toBe(false);
  });
  it('hanya terpicu sekali', () => {
    const w = new FpsWatch({ fps: 40, seconds: 3 });
    expect(run(w, 20, 4)).toBe(true);
    expect(run(w, 20, 4)).toBe(false);
  });
  it('FPS lancar tidak pernah memicu', () => {
    expect(run(new FpsWatch(), 60, 10)).toBe(false);
  });
});

describe('activeQuality', () => {
  it.each([
    ['full', false, 'full'], ['full', true, 'lite'], ['lite', false, 'lite'], ['lite', true, 'lite'],
  ])('%s + paksa=%s → %s', (s, f, want) => { expect(activeQuality(s, f)).toBe(want); });
});
