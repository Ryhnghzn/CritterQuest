import { describe, it, expect } from 'vitest';
import { bestiaryTier, collectionStats, codexFx, addKills, discover } from './collection.js';
import { createCharacter, finalStats, applyTrip } from './character.js';

const make = () => createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, 1);
const pots = { red: 0, big: 0, shield: 0, wind: 0, rage: 0 };
const trip = (over) => ({ exp: 0, gold: 0, kills: 0, bossKills: 0, floor: 1, cleared: false, died: false, hp: 50, potions: pots, ...over });

describe('bestiari', () => {
  it('tonggak 25 / 100 / 300 / 1000, bos 1 / 5 / 15 / 40', () => {
    expect([0, 24, 25, 99, 100, 1000, 5000].map((n) => bestiaryTier('slink', n))).toEqual([0, 0, 1, 1, 2, 4, 4]);
    expect([0, 1, 5, 40].map((n) => bestiaryTier('boss', n))).toEqual([0, 1, 2, 4]);
  });
  it('bonus stat masuk finalStats', () => {
    const c = make();
    const hp0 = finalStats(c).maxHp;
    addKills(c, { slink: 100, boss: 1, unknown: 5 });
    expect(collectionStats(c)).toEqual({ maxHp: 12, atk: 2 });
    expect(finalStats(c).maxHp).toBe(hp0 + 12);
  });
  it('applyTrip menambah kill per jenis', () => {
    const { char } = applyTrip(make(), trip({ killsBy: { slink: 30, dart: 2 } }), 2);
    expect(char.records.bestiary.slink).toBe(30);
    expect(char.records.bestiary.dart).toBe(2);
  });
});

describe('kodeks unik', () => {
  it('mencatat unik sekali saja; tiap unik +1% koin & EXP', () => {
    const c = make();
    expect(discover(c, [{ unique: 'fajar' }, { unique: null }, { unique: 'fajar' }])).toEqual(['fajar']);
    expect(discover(c, [{ unique: 'fajar' }])).toEqual([]);
    expect(codexFx(c)).toEqual({ goldfind: 0.01, expfind: 0.01 });
  });
  it('unik yang hilang karena mati tetap tercatat', () => {
    const items = [{ id: 'a', slot: 'weapon', classId: 'warrior', variant: 0, rarity: 4, itemLevel: 5, base: { atk: 9 }, bonuses: [], unique: 'fajar', plus: 0, sockets: [null, null] }];
    const r = applyTrip(make(), trip({ items, died: true }), 2, () => 0.99);
    expect(r.itemsLost).toHaveLength(1);
    expect(r.uniquesFound).toEqual(['fajar']);
    expect(r.char.records.uniques).toEqual(['fajar']);
  });
});
