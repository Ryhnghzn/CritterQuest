import { describe, it, expect } from 'vitest';
import { drawAnime, ANIME, ELEMENTS, HAIR_STYLES, HAIR_COLORS, animeLook } from './index.js';
import { hasMove, rig } from '../hero/rig.js';
import { setFxSink, FX_KINDS } from './elemfx.js';
import { drawAnimeItem } from './items.js';

// Canvas 2D stand-in: every method is a no-op, gradients accept colour stops.
function fakeCtx() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) { if (k in t) return t[k]; if (String(k).startsWith('create')) return () => gradient; return () => {}; },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const MOVES = { warrior: ['spin', 'shout', 'quake', 'charge', 'axe'], archer: ['rain', 'pierce', 'volley', 'leap', 'trap'], mage: ['nova', 'chain', 'meteor', 'blink', 'inferno'], assassin: ['shadow', 'fan', 'poison', 'smoke', 'shuriken'] };

describe('karakter anime (spesifikasi §39)', () => {
  it('semua job tergambar dari samping, depan, belakang, untuk tiap pakaian, rambut, elemen', () => {
    for (const cls of Object.keys(ANIME)) for (const outfit of Object.keys(ANIME[cls].OUTFITS)) for (const view of ['side', 'front', 'back'])
      for (const style of Object.keys(HAIR_STYLES)) {
        const o = { style, hair: Object.keys(HAIR_COLORS)[style.length % 6], eye: '#ffb43a', element: Object.keys(ELEMENTS)[outfit.length % 6], outfit };
        expect(drawAnime(fakeCtx(), cls, o, { t: 1.3, moving: 1, walk: 2, view }).head[1]).toBeLessThan(-100);
      }
  });
  it('save hair ke-6 memetakan ke gaya anime swept (spec §39)', () => {
    expect(animeLook('warrior', { hair: 5, hairColor: 0 }).style).toBe('swept');
  });
  it('dari samping memakai kerangka gerak game: serangan, skill, dan guling tergambar', () => {
    const o = { style: 'spiky', hair: 'silver', eye: '#46b8ff', element: 'fire' };
    for (const [cls, moves] of Object.entries(MOVES)) {
      for (let a = 0; a <= 1; a += 0.05) drawAnime(fakeCtx(), cls, o, { t: a, attackPhase: a });
      for (const id of moves) { expect(hasMove(cls, id)).toBe(true); for (const ph of [0.1, 0.5, 0.9]) drawAnime(fakeCtx(), cls, o, { t: ph, move: { id, ph, dur: 0.6 } }); }
      drawAnime(fakeCtx(), cls, o, { t: 0, dodge: 0.5, hurt: true });
    }
  });
  it('tiap elemen punya efeknya sendiri, bisa dikumpulkan untuk digambar halus di atas pixel', () => {
    expect(FX_KINDS.sort()).toEqual(Object.keys(ELEMENTS).sort());
    const g = fakeCtx(); g.getTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    for (const cls of Object.keys(ANIME)) for (const element of Object.keys(ELEMENTS)) {
      const list = []; setFxSink(list);
      try { drawAnime(g, cls, { style: 'spiky', hair: 'black', eye: '#fff', element }, { t: 1, view: 'side', attackPhase: 0.5, slow: true }); } finally { setFxSink(null); }
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].E.fx).toBe(element);
    }
  });
  it('cara lari beda per job; tanpa gait (gaya lama) kerangka tidak berubah', () => {
    const run = (c) => rig(c, { moving: 1, walk: 1.2, gait: true });
    expect(run('assassin').lean).toBeGreaterThan(run('warrior').lean);      // ninja sprint leans hardest
    expect(run('mage').fF.x).toBeLessThan(run('warrior').fF.x);             // short gliding steps
    expect(rig('warrior', { moving: 1, walk: 1.2 }).fF.x).toBeCloseTo(4 + Math.sin(1.2) * 10);
  });
  it('ikon item anime: semua jenis di semua rarity tergambar, Mitos memakai elemen pilihan', () => {
    const kinds = [...Object.keys(ANIME).map((classId) => ({ slot: 'weapon', classId })), ...['helm', 'armor', 'boots', 'amulet', 'ring'].map((slot) => ({ slot }))];
    for (const k of kinds) for (let rarity = 0; rarity <= 5; rarity++) for (const element of ['fire', 'storm']) drawAnimeItem(fakeCtx(), { ...k, rarity }, 64, 1.2, element);
    const g = fakeCtx(); g.getTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    const list = []; setFxSink(list);
    try { drawAnimeItem(g, { slot: 'weapon', classId: 'warrior', rarity: 5 }, 64, 1, 'storm'); drawAnimeItem(g, { slot: 'weapon', classId: 'warrior', rarity: 0 }, 64, 1); } finally { setFxSink(null); }
    expect(list.map((f) => f.E.fx)).toEqual(['storm']); // a common sword has no element effect
  });
  it('efek equipment: tiap slot di tiap rarity (dan kosong) tergambar dari semua arah, juga saat lari & menyerang', () => {
    for (const cls of Object.keys(ANIME)) for (const r of [null, 0, 1, 2, 3, 4, 5]) for (const view of ['side', 'front', 'back']) {
      const gear = { weapon: r ?? 0, helm: r, armor: r, boots: r, amulet: r, ring: r }, wings = r === 5 ? 'light' : r === 4 ? 'phoenix' : null;
      expect(drawAnime(fakeCtx(), cls, { style: 'tail', hair: 'gold', eye: '#fff', element: 'holy', gear, wings }, { t: 2.1, moving: 1, walk: 1, view, attackPhase: view === 'side' ? 0.45 : undefined })).toBeTruthy();
    }
  });
  it('kesembilan sayap tergambar dari tiap arah, diam maupun lari', async () => {
    const { WINGS } = await import('./wings.js');
    expect(Object.keys(WINGS)).toHaveLength(9);
    for (const wings of Object.keys(WINGS)) for (const view of ['side', 'front', 'back']) for (const moving of [0, 1])
      expect(drawAnime(fakeCtx(), 'warrior', { style: 'spiky', hair: 'black', eye: '#fff', element: 'ice', wings }, { t: 1.7, moving, walk: 1, view })).toBeTruthy();
  });
  it('save → tampilan anime membawa rarity tiap slot', async () => {
    const { animeLook } = await import('./index.js');
    const l = animeLook('mage', { hair: 4, hairColor: 5, gear: { helm: { tier: 3, rarity: 5 }, ring: { tier: 1, rarity: 2 } } });
    expect(l).toMatchObject({ style: 'tail', hair: 'silver', gear: { helm: 5, armor: null, ring: 2 } });
  });
  it('job tak dikenal tidak digambar', () => {
    expect(drawAnime(fakeCtx(), 'bard', {}, {})).toBe(null);
  });
});
