import { describe, it, expect } from 'vitest';
import {
  tierFor, itemLevelFor, rollRarity, makeItem, dropItem, itemName, itemStats, effectText, statText,
} from './itemgen.js';
import { RARITIES, SLOTS, SLOT_IDS, UNIQUES, DROP_WEIGHTS, VARIANTS, TIER_LEVELS, EFFECTS } from '../data/items.js';
import { validateSlot } from './schema.js';
import { createCharacter } from './character.js';
import { CLASSES } from '../data/classes.js';

// seeded mulberry32 so every test is repeatable
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const N = 20000;
const share = (source, luk = 0) => {
  const rng = seeded(7), counts = Array(RARITIES.length).fill(0);
  for (let i = 0; i < N; i++) counts[rollRarity(source, luk, rng)]++;
  return counts.map((c) => c / N);
};

describe('rarity', () => {
  it('sebaran sesuai bobot tiap sumber', () => {
    for (const source of Object.keys(DROP_WEIGHTS)) {
      const w = DROP_WEIGHTS[source], total = w.reduce((a, b) => a + b, 0);
      share(source).forEach((p, r) => expect(p).toBeCloseTo(w[r] / total, 1));
    }
  });

  it('Mitos hanya dari bos', () => {
    for (const source of ['enemy', 'elite', 'chest']) expect(share(source)[5]).toBe(0);
    expect(share('boss')[5]).toBeGreaterThan(0);
  });

  it('LUK menaikkan peluang Langka ke atas', () => {
    const up = (p) => p.slice(2).reduce((a, b) => a + b, 0);
    expect(up(share('enemy', 50))).toBeGreaterThan(up(share('enemy', 0)) * 1.3);
  });
});

describe('item', () => {
  it('stat dasar = dasar slot × (1 + 0,12 × (level − 1)) × pengali rarity', () => {
    const it = makeItem({ slot: 'weapon', classId: 'mage', rarity: 3, itemLevel: 11 }, seeded(1));
    expect(it.base.atk).toBe(Math.round(5 * 2.2 * 1.18));
    const ar = makeItem({ slot: 'armor', classId: 'mage', rarity: 0, itemLevel: 1 }, seeded(1));
    expect(ar.base).toEqual({ def: 1.2, maxHp: 10 });
    expect(ar.classId).toBeNull();
  });

  it('jumlah bonus sesuai rarity, tanpa duplikat, nilai positif', () => {
    const rng = seeded(3);
    for (let r = 0; r < RARITIES.length; r++) {
      for (let i = 0; i < 200; i++) {
        const it = makeItem({ slot: 'helm', classId: null, rarity: r, itemLevel: 1 + (i % 50) }, rng);
        expect(it.bonuses).toHaveLength(RARITIES[r].bonuses);
        expect(new Set(it.bonuses.map((b) => b.stat)).size).toBe(it.bonuses.length);
        for (const b of it.bonuses) expect(b.value).toBeGreaterThan(0);
      }
    }
  });

  it('varian tampilan mengikuti rentang level', () => {
    expect(tierFor(1)).toBe(0);
    expect(tierFor(4)).toBe(0);
    expect(tierFor(5)).toBe(1);
    expect(tierFor(50)).toBe(TIER_LEVELS.length - 1);
  });

  it('level item: sekitar level karakter + lantai, tak lebih dari +4 dan 50', () => {
    const rng = seeded(9);
    for (let i = 0; i < 500; i++) {
      const l = itemLevelFor(10, 5, rng);
      expect(l).toBeGreaterThanOrEqual(13);
      expect(l).toBeLessThanOrEqual(14);
    }
    expect(itemLevelFor(1, 1, () => 0)).toBe(1);
    expect(itemLevelFor(50, 5, () => 0.99)).toBe(50);
  });

  it('cincin selalu minimal Bagus', () => {
    const rng = seeded(11);
    for (let i = 0; i < 3000; i++) {
      const it = dropItem({ source: 'enemy', classId: 'archer', charLevel: 5, floor: 2 }, rng);
      if (it.slot === 'ring') expect(it.rarity).toBeGreaterThanOrEqual(1);
    }
  });

  it('senjata selalu untuk kelas pemilik, termasuk item unik', () => {
    const rng = seeded(12);
    for (const classId of Object.keys(CLASSES)) {
      for (let i = 0; i < 1500; i++) {
        const it = dropItem({ source: 'boss', classId, charLevel: 20, floor: 5 }, rng);
        if (it.slot === 'weapon') expect(it.classId).toBe(classId);
      }
    }
  });

  it('Legendaris & Mitos selalu item unik dengan efek khusus', () => {
    const rng = seeded(13);
    let seen = 0;
    for (let i = 0; i < 3000; i++) {
      const it = dropItem({ source: 'boss', classId: 'warrior', charLevel: 20, floor: 5 }, rng);
      if (it.rarity < 4) { expect(it.unique).toBeNull(); continue; }
      seen++;
      const u = UNIQUES.find((x) => x.id === it.unique);
      expect(u.rarity).toBe(it.rarity);
      expect(u.slot).toBe(it.slot);
      expect(itemName(it)).toBe(u.name);
      expect(effectText(it)).toMatch(/\S/);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('item hasil drop lolos validasi save', () => {
    const rng = seeded(21);
    const c = createCharacter({ slot: 0, name: 'Uji', look: { hair: 0, hairColor: 0 }, classId: 'assassin' }, 1);
    for (const source of Object.keys(DROP_WEIGHTS)) {
      c.inventory = Array.from({ length: 40 }, () => dropItem({ source, classId: 'assassin', charLevel: 30, floor: 4, luk: 10 }, rng));
      expect(validateSlot(c)).toEqual([]);
    }
  });
});

describe('nama & teks', () => {
  it('nama = varian + akhiran bonus pertama', () => {
    const it = { slot: 'helm', classId: null, variant: 1, rarity: 1, itemLevel: 6, base: { maxHp: 20 }, bonuses: [{ stat: 'atkSpd', value: 0.03 }], unique: null };
    expect(itemName(it)).toBe('Helm Besi Kilat');
    expect(itemName({ ...it, bonuses: [] })).toBe('Helm Besi');
    expect(itemName({ ...it, slot: 'weapon', classId: 'archer', variant: 6 })).toBe('Busur Phoenix Kilat');
  });

  it('stat item = dasar + bonus', () => {
    const it = { base: { def: 1.2, maxHp: 10 }, bonuses: [{ stat: 'maxHp', value: 7 }, { stat: 'crit', value: 1.5 }] };
    expect(itemStats(it)).toEqual({ def: 1.2, maxHp: 17, crit: 1.5 });
  });

  it('teks stat dan efek', () => {
    expect(statText('atkSpd', 0.045)).toBe('+4,5% Kec. serang');
    expect(statText('crit', 2.5)).toBe('+2,5% Kritis');
    expect(statText('atk', 12)).toBe('+12 ATK');
    expect(effectText({ unique: 'bulansabit' })).toBe('Menghisap 3% damage menjadi HP');
    expect(effectText({ unique: 'phoenix' })).toBe('Sekali per perjalanan: bangkit dengan 30% HP');
  });

  it('data lengkap: varian 7 tingkat di tiap slot & kelas, efek unik terdefinisi', () => {
    for (const slot of SLOT_IDS) {
      const lists = slot === 'weapon' ? Object.values(VARIANTS.weapon) : [VARIANTS[slot]];
      for (const l of lists) expect(l).toHaveLength(TIER_LEVELS.length);
      expect(SLOTS[slot]).toBeDefined();
    }
    expect(Object.keys(VARIANTS.weapon).sort()).toEqual(Object.keys(CLASSES).sort());
    for (const u of UNIQUES) expect(EFFECTS[u.effect]).toBeDefined();
    expect(new Set(UNIQUES.map((u) => u.id)).size).toBe(UNIQUES.length);
  });
});
