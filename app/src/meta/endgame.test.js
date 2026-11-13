// Endgame tahap 1 (docs/superpowers/plans/2026-11-13-endgame.md): Rift milestones, uniques with a source.
import { describe, it, expect } from 'vitest';
import { createCharacter, applyTrip } from './character.js';
import { RIFT_MILESTONE } from '../data/rift.js';
import { DROP_WEIGHTS, LEGENDARY, MYTHIC, UNIQUES, UNIQUE_FAVOR } from '../data/items.js';
import { pickUnique } from './itemgen.js';

const NOW = 1700000000000;
const hero = () => ({ ...createCharacter({ slot: 0, name: 'Reyhan', look: { hair: 2, hairColor: 4 }, classId: 'warrior' }, NOW), level: 50, marks: 0 });
const riftTrip = (best) => ({
  exp: 0, gold: 0, kills: 0, killsBy: {}, elites: 0, elitesBy: {}, bossKills: 0, floor: best, dungeon: 'rift', cleared: false, died: false,
  hp: 100, potions: { red: 0, blue: 0, wind: 0, rage: 0, shield: 0, purple: 0 }, items: [], mats: {}, gems: [], rift: { best, checkpoint: best - (best % 5) },
});
let seed = 1;
const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

describe('tonggak Celah', () => {
  it('melewati lantai 10, 20, 30 untuk pertama kali: Lencana naik tiap tonggak, gear Epik+, peti agung di 30', () => {
    const c = { ...hero(), rift: { best: 8, checkpoint: 5 } };
    const r = applyTrip(c, riftTrip(31), NOW, rng);
    expect(r.riftMilestones).toEqual([10, 20, 30]);
    const M = RIFT_MILESTONE;
    expect(r.char.marks).toBe(3 * M.marks + M.marksPer * (0 + 1 + 2));
    expect(r.itemsKept.length).toBe(4); // one per milestone + the great one at 30
    expect(r.itemsKept.every((it) => it.rarity >= 3)).toBe(true);
    expect(r.itemsKept.filter((it) => it.rarity >= LEGENDARY).length).toBeGreaterThanOrEqual(1);
    expect(r.char.rift.best).toBe(31);
  });
  it('sekali saja: mengulang lantai yang sama tidak memberi apa-apa', () => {
    const c = { ...hero(), rift: { best: 31, checkpoint: 30 } };
    const r = applyTrip(c, riftTrip(31), NOW, rng);
    expect(r.riftMilestones).toEqual([]);
    expect(r.char.marks).toBe(0);
    expect(r.itemsKept.length).toBe(0);
  });
  it('bobot hadiah: tonggak Epik ke atas, tonggak agung Legendaris ke atas', () => {
    expect(DROP_WEIGHTS.rift.slice(0, 3).every((w) => w === 0)).toBe(true);
    expect(DROP_WEIGHTS.riftGreat.slice(0, 4).every((w) => w === 0)).toBe(true);
  });
});

describe('item unik bersumber & pengurang sial', () => {
  const fits = UNIQUES.filter((u) => !u.quest && u.rarity === LEGENDARY && (u.classId === null || u.classId === 'warrior'));
  const share = (from, owned, id) => {
    seed = 7; let n = 0;
    for (let i = 0; i < 6000; i++) if (pickUnique(fits, from, owned, rng).id === id) n++;
    return n / 6000;
  };
  it('setiap unik yang bisa jatuh punya bos sumber', () => {
    for (const u of UNIQUES.filter((x) => !x.quest)) expect(u.from, u.id).toMatch(/boss$/);
  });
  it('bos sumbernya menjatuhkan unik itu lebih sering (Pedang Fajar dari Raja Mumi)', () => {
    const base = share(null, null, 'fajar'), fromMummy = share('tombboss', null, 'fajar');
    const own = fits.filter((u) => u.from === 'tombboss').length, k = UNIQUE_FAVOR.source;
    expect(base).toBeCloseTo(1 / fits.length, 1);
    expect(fromMummy).toBeCloseTo(k / (k * own + fits.length - own), 1); // its own share among its own favourites
    expect(fromMummy).toBeGreaterThan(base * 1.8);
  });
  it('yang belum ada di kodeks lebih sering; tanpa kodeks semua sama', () => {
    const owned = fits.map((u) => u.id).filter((id) => id !== 'amarah');
    const k = UNIQUE_FAVOR.fresh, expect1 = k / (k + fits.length - 1);
    expect(share(null, owned, 'amarah')).toBeCloseTo(expect1, 1);
    expect(share(null, owned, 'amarah')).toBeGreaterThan(share(null, null, 'amarah') * 2);
  });
  it('tiap bos punya unik Mitos atau Legendaris untuk kelas apa pun lewat item bersama', () => {
    for (const b of ['boss', 'crystalboss', 'sporeboss', 'tombboss', 'lavaboss', 'eclipseboss']) {
      expect(UNIQUES.filter((u) => u.from === b && u.classId === null).length, b).toBeGreaterThanOrEqual(1);
    }
    expect(UNIQUES.filter((u) => u.rarity === MYTHIC && !u.quest).every((u) => u.from)).toBe(true);
  });
});
