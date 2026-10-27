import { describe, it, expect } from 'vitest';
import { enhance, reroll, salvage, salvageYield, socketGem, unsocket, combineGems, combineCost } from './forge.js';
import { equip } from './gear.js';
import { createCharacter, finalStats } from './character.js';
import { validateSlot } from './schema.js';
import { itemStats, itemName, makeItem } from './itemgen.js';
import { enhanceCost, ENHANCE } from '../data/forge.js';

const NOW = 1761436800000;
const helm = (over = {}) => ({ id: 'h1', slot: 'helm', classId: null, variant: 2, rarity: 2, itemLevel: 10, base: { maxHp: 30 }, bonuses: [{ stat: 'atk', value: 3 }, { stat: 'crit', value: 1 }], unique: null, plus: 0, sockets: [null], ...over });
const make = (over = {}) => ({
  ...createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, NOW),
  gold: 100000, mats: { dust: 999, crystal: 999, core: 99 }, inventory: [helm()], ...over,
});
const always = () => 0, never = () => 0.999;

describe('tempa', () => {
  it('+1: bayar koin & debu, stat dasar +10%', () => {
    const c = make();
    const r = enhance(c, 'h1', NOW, always);
    expect(r.success).toBe(true);
    expect(r.char.inventory[0].plus).toBe(1);
    const cost = enhanceCost(c.inventory[0], 0);
    expect(r.char.gold).toBe(100000 - cost.gold);
    expect(r.char.mats.dust).toBe(999 - cost.dust);
    expect(itemStats(r.char.inventory[0]).maxHp).toBe(33);
    expect(itemName(r.char.inventory[0])).toMatch(/^\+1 /);
    expect(validateSlot(r.char)).toEqual([]);
  });

  it('gagal di bawah +10: tetap; dari +10: turun satu', () => {
    expect(enhance(make({ inventory: [helm({ plus: 6 })] }), 'h1', NOW, never).char.inventory[0].plus).toBe(6);
    expect(enhance(make({ inventory: [helm({ plus: 11 })] }), 'h1', NOW, never).char.inventory[0].plus).toBe(10);
    expect(enhance(make({ inventory: [helm({ plus: 3 })] }), 'h1', NOW, never).char.inventory[0].plus).toBe(4); // +3→+4 selalu berhasil
  });

  it('ditolak: maks +15, uang atau material kurang', () => {
    expect(enhance(make({ inventory: [helm({ plus: ENHANCE.max })] }), 'h1', NOW).reason).toBe('max');
    expect(enhance(make({ gold: 0 }), 'h1', NOW).reason).toBe('gold');
    expect(enhance(make({ mats: { dust: 0, crystal: 0, core: 0 } }), 'h1', NOW).reason).toBe('mats');
  });

  it('gear terpasang yang ditempa langsung menaikkan stat akhir', () => {
    const c = equip(make(), 'h1', NOW).char;
    const before = finalStats(c).maxHp;
    const after = finalStats(enhance(c, 'h1', NOW, always).char).maxHp;
    expect(after).toBe(before + 3);
  });
});

describe('asah ulang', () => {
  it('satu baris bonus diganti stat lain yang belum ada', () => {
    const r = reroll(make(), 'h1', 0, NOW, () => 0.5);
    const b = r.char.inventory[0].bonuses;
    expect(b[1]).toEqual({ stat: 'crit', value: 1 });
    expect(b[0].stat).not.toBe('crit');
    expect(b[0].value).toBeGreaterThan(0);
    expect(r.char.mats.crystal).toBe(997);
  });
});

describe('urai', () => {
  it('gear → material sesuai rarity; permata dari soket kembali', () => {
    const c = make({ inventory: [helm({ rarity: 4, sockets: [{ gem: 'ruby', tier: 2 }, null], unique: null }), helm({ id: 'h2', rarity: 0, sockets: [] })] });
    expect(salvageYield(c.inventory)).toEqual({ dust: 12, crystal: 4, core: 1 });
    const r = salvage(c, ['h1', 'h2'], NOW, never);
    expect(r.char.inventory).toEqual([]);
    expect(r.char.mats).toEqual({ dust: 1011, crystal: 1003, core: 100 });
    expect(r.char.gems.ruby[1]).toBe(1);
  });

  it('Epik ke atas kadang memberi permata; gear terpasang tidak bisa diurai', () => {
    const r = salvage(make({ inventory: [helm({ rarity: 3, sockets: [null] })] }), ['h1'], NOW, always);
    expect(r.gems).toHaveLength(1);
    expect(salvage(equip(make(), 'h1', NOW).char, ['h1'], NOW).reason).toBe('equipped');
  });
});

describe('permata', () => {
  const withGems = (over) => make({ gems: { ruby: [5, 0, 0, 0, 0], emerald: [0, 0, 0, 0, 0], diamond: [0, 0, 0, 0, 0], topaz: [0, 0, 0, 0, 0], amethyst: [0, 0, 0, 0, 0], sapphire: [0, 0, 0, 0, 0] }, ...over });

  it('pasang permata ke soket: stat bertambah; lepas: kembali ke tas', () => {
    const r = socketGem(withGems(), 'h1', 0, 'ruby', 1, NOW);
    expect(r.char.gems.ruby[0]).toBe(4);
    expect(itemStats(r.char.inventory[0]).atk).toBe(3 + 3);
    expect(validateSlot(r.char)).toEqual([]);
    const u = unsocket(r.char, 'h1', 0, NOW);
    expect(u.char.gems.ruby[0]).toBe(5);
    expect(u.char.inventory[0].sockets[0]).toBeNull();
  });

  it('soket terisi / tidak punya permata ditolak', () => {
    const r = socketGem(withGems(), 'h1', 0, 'ruby', 1, NOW).char;
    expect(socketGem(r, 'h1', 0, 'ruby', 1, NOW).reason).toBe('socket');
    expect(socketGem(withGems(), 'h1', 0, 'topaz', 1, NOW).reason).toBe('gem');
  });

  it('gabung 3 → 1 tingkat lebih tinggi', () => {
    const r = combineGems(withGems(), 'ruby', 1, NOW);
    expect(r.char.gems.ruby).toEqual([2, 1, 0, 0, 0]);
    expect(r.char.gold).toBe(100000 - combineCost(1));
    expect(combineGems(r.char, 'ruby', 2, NOW).reason).toBe('gem');
    expect(combineGems(withGems(), 'ruby', 5, NOW).reason).toBe('max');
  });

  it('item baru punya soket sesuai rarity', () => {
    const counts = [0, 1, 2, 3, 4, 5].map((rarity) => makeItem({ slot: 'helm', classId: null, rarity, itemLevel: 5 }, Math.random).sockets.length);
    expect(counts).toEqual([0, 0, 1, 1, 2, 2]);
  });
});
