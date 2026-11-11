import { describe, it, expect } from 'vitest';
import { fogSize, encodeFog, decodeFog, revealFog, fogAt, explored, isFogValid, applyField, fieldDeath, visitTown, teleport, teleportPrice, gateSpots, regionGates, expeditionList, takeExpedition, claimExpedition, dropExpedition } from './world.js';
import { createCharacter as cc, applyTrip } from './character.js';
import { buildFieldMap, blocked } from '../run/fieldmap.js';
import { REGIONS } from '../data/world.js';
import { createCharacter } from './character.js';
import { validateSlot } from './schema.js';
import { regionById } from '../data/world.js';

const forest = regionById('forest');
const make = () => createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'archer' }, 1);
const pots = { red: 1, big: 0, shield: 0, wind: 0, rage: 0 };

describe('mount dari wilayah', () => {
  it('applyField menggulir jatuhan bos dengan rng yang diberikan', () => {
    const r = applyField(make(), { potions: pots, hp: 100, mountRolls: { any: 0, eclipse: 1 } }, 9, () => 0);
    expect(r.mountsFound).toEqual(['tiger', 'pegasus']);
    expect(applyField(make(), { potions: pots, hp: 100 }, 9).mountsFound).toEqual([]);
  });
});

describe('kabut', () => {
  it('base64 bolak-balik', () => {
    const { bytes } = fogSize(forest);
    const a = new Uint8Array(bytes).map((_, i) => (i * 37) & 255);
    const s = encodeFog(a);
    expect(isFogValid(s, forest)).toBe(true);
    expect([...decodeFog(s, forest)]).toEqual([...a]);
    expect([...decodeFog('', forest)].every((b) => b === 0)).toBe(true);
    expect([...decodeFog('!!rusak', forest)].every((b) => b === 0)).toBe(true);
    expect(isFogValid('x'.repeat(99999), forest)).toBe(false);
  });
  it('membuka sel dalam radius saja', () => {
    const { bytes, cols } = fogSize(forest);
    const f = new Uint8Array(bytes);
    expect(revealFog(f, forest, 1000, 1000, 300)).toBe(true);
    expect(revealFog(f, forest, 1000, 1000, 300)).toBe(false);
    expect(fogAt(f, cols, 6, 6)).toBe(1);
    expect(fogAt(f, cols, 12, 6)).toBe(0);
    expect(explored(f, forest)).toBeGreaterThan(0);
    expect(explored(f, forest)).toBeLessThan(0.05);
  });
});

describe('simpan dari wilayah', () => {
  it('EXP, koin, gear, bahan, bestiari, tugas & kabut masuk save', () => {
    const c = make();
    c.bounties[0].taken = true;
    const item = { id: 'a', slot: 'helm', classId: null, variant: 0, rarity: 1, itemLevel: 3, base: { maxHp: 9 }, bonuses: [], unique: null, plus: 0, sockets: [] };
    const fog = encodeFog(new Uint8Array(fogSize(forest).bytes).fill(1));
    const r = applyField(c, { region: 'forest', fog, exp: 60, gold: 25, kills: 30, killsBy: { slink: 30 }, elites: 1, items: [item], mats: { dust: 2 }, gems: [{ gem: 'ruby', tier: 1 }], hp: 50, potions: pots }, 9);
    expect(r.char.level).toBe(2);
    expect(r.char.gold).toBe(25);
    expect(r.char.inventory).toHaveLength(1);
    expect(r.char.mats.dust).toBe(2);
    expect(r.char.gems.ruby[0]).toBe(1);
    expect(r.char.records.bestiary.slink).toBe(30);
    expect(r.char.records.kills).toBe(30);
    expect(r.char.bounties[0].have).toBe(25);
    expect(r.bountiesDone).toBe(1);
    expect(r.char.regions.forest.fog).toBe(fog);
    expect(r.char.records.trips).toBe(0);
    expect(validateSlot(r.char)).toEqual([]);
  });
  it('tumbang: −10% koin, bangun dengan sedikit HP', () => {
    const c = { ...make(), gold: 255 };
    const r = fieldDeath(c, 3);
    expect(r.goldLost).toBe(25);
    expect(r.char.gold).toBe(230);
    expect(r.char.hp).toBeGreaterThan(0);
    expect(validateSlot(r.char)).toEqual([]);
  });
  it('mengunjungi kota mencatat lokasi', () => {
    const c = visitTown(make(), 'rimba', 4);
    expect(c.location).toBe('rimba');
    expect(c.towns).toEqual(['home', 'rimba']);
    expect(visitTown(c, 'rimba', 5)).toBe(c);
  });
});

describe('gerbang dungeon per karakter', () => {
  it('di pita dungeonnya, tidak terhalang, tetap untuk seed yang sama, beda untuk seed lain', () => {
    for (const r of REGIONS) {
      const map = buildFieldMap(r);
      const a = gateSpots(r, 12345), b = gateSpots(r, 12345), c = gateSpots(r, 999);
      expect(a).toEqual(b);
      a.forEach((g, i) => {
        const d = r.dungeons[i];
        expect(g.x).toBeGreaterThanOrEqual(r.w * d.at[0]);
        expect(g.x).toBeLessThanOrEqual(r.w * d.at[1]);
        expect(blocked(map, g.x, g.y, 40)).toBe(false);
      });
      if (a.length) expect(c).not.toEqual(a);
    }
  });
  it('tercatat ditemukan dari wilayah', () => {
    const c = make();
    expect(regionGates(c, forest).every((g) => !g.found)).toBe(true);
    const r = applyField(c, { region: 'forest', found: ['shadow'], potions: pots, hp: 100 }, 2);
    expect(regionGates(r.char, forest).find((g) => g.dungeon === 'shadow').found).toBe(true);
    expect(validateSlot(r.char)).toEqual([]);
  });
});

describe('ekspedisi', () => {
  it('ambil → bersihkan lantai di dungeonnya → klaim hadiah', () => {
    const c = make();
    expect(expeditionList(c).find((e) => e.dungeon === 'shadow').fits).toBe(true);
    const took = takeExpedition(c, 'shadow', 2).char;
    expect(took.expedition).toEqual({ dungeon: 'shadow', need: 3, have: 0 });
    expect(claimExpedition(took, 3).reason).toBe('notdone');
    const trip = { exp: 0, gold: 0, kills: 0, bossKills: 0, floor: 2, cleared: false, died: false, hp: 50, potions: pots, dungeon: 'shadow', floorsCleared: 5 };
    const after = applyTrip(took, trip, 4).char;
    expect(after.expedition.have).toBe(3);
    expect(after.found).toContain('shadow');
    const r = claimExpedition(after, 5);
    expect(r.ok).toBe(true);
    expect(r.char.expedition).toBe(null);
    expect(r.char.marks).toBe(4);
    expect(validateSlot(r.char)).toEqual([]);
    expect(dropExpedition(took, 6).char.expedition).toBe(null);
  });
  it('dungeon lain tidak memajukan ekspedisi', () => {
    const took = takeExpedition(make(), 'crystal', 2).char;
    const trip = { exp: 0, gold: 0, kills: 0, bossKills: 0, floor: 2, cleared: false, died: false, hp: 50, potions: pots, dungeon: 'shadow', floorsCleared: 2 };
    expect(applyTrip(took, trip, 4).char.expedition.have).toBe(0);
  });
});

describe('batu teleport', () => {
  it('harga naik dengan tingkat kota tujuan', () => {
    expect(teleportPrice('home')).toBeLessThan(teleportPrice('rimba'));
    expect(teleportPrice('rimba')).toBeLessThan(teleportPrice('bara'));
  });

  it('hanya ke kota yang sudah dikunjungi, bukan kota sekarang, bayar koin', () => {
    let c = { ...make(), gold: 1000 };
    expect(teleport(c, 'rimba', 1)).toEqual({ ok: false, reason: 'unknown' });
    expect(teleport(c, 'home', 1)).toEqual({ ok: false, reason: 'here' });
    c = visitTown(c, 'rimba', 2);
    const r = teleport(c, 'home', 3);
    expect(r.ok).toBe(true);
    expect(r.char.location).toBe('home');
    expect(r.char.gold).toBe(1000 - teleportPrice('home'));
    expect(validateSlot(r.char)).toEqual([]);
    expect(teleport({ ...r.char, gold: 0 }, 'rimba', 4)).toEqual({ ok: false, reason: 'gold' });
  });
});

describe('harta tersimpan', () => {
  it('applyField mencatat peti yang dibuka per wilayah, tanpa ganda', () => {
    const c = make();
    const a = applyField(c, { exp: 0, gold: 0, kills: 0, killsBy: {}, elites: 0, items: [], mats: {}, gems: [], hp: null, potions: c.potions, region: 'forest', fog: '', opened: [2] }, 1);
    const b = applyField(a.char, { exp: 0, gold: 0, kills: 0, killsBy: {}, elites: 0, items: [], mats: {}, gems: [], hp: null, potions: c.potions, region: 'forest', fog: '', opened: [0, 2] }, 2);
    expect(b.char.treasures).toEqual({ forest: [0, 2] });
    expect(validateSlot(b.char)).toEqual([]);
  });
});

describe('Tanah Gerhana (spec §26.7)', () => {
  it('terbuka setelah kelima Pecahan Segel; jalan buntu di timur', async () => {
    const { regionById, regionOpen } = await import('../data/world.js');
    const r = regionById('eclipse');
    expect(r.from).toBe('bara');
    expect(r.to).toBe(null);
    expect(regionOpen(r, 4)).toBe(false);
    expect(regionOpen(r, 5)).toBe(true);
    expect(regionOpen(regionById('forest'), 0)).toBe(true);
  });
});
