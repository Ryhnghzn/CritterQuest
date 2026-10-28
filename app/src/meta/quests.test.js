import { describe, it, expect } from 'vitest';
import { activeQuests, syncQuests, talkOffers, npcMarks, questTalk, questTarget, shards, mainDone } from './quests.js';
import { createCharacter, applyTrip } from './character.js';
import { applyField, visitTown, gateSpots } from './world.js';
import { validateSlot } from './schema.js';
import { MAIN, SHARDS, GATE_HINT } from '../data/quests.js';
import { regionById } from '../data/world.js';
import { INVENTORY_MAX } from '../data/balance.js';
import { mulberry, buildFieldMap } from '../run/fieldmap.js';

const make = (over = {}) => ({ ...createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'archer' }, 1000), ...over });
const trip = (over = {}) => ({ dungeon: 'shadow', exp: 0, gold: 0, kills: 0, bossKills: 0, floor: 1, cleared: false, died: false, hp: 100, potions: { ...make().potions }, ...over });
const talk = (c, id, town, npc) => { const r = questTalk(c, id, town, npc, 5, mulberry(3)); expect(r.ok).toBe(true); return r; };

describe('quest utama', () => {
  it('dimulai dengan bicara pada Kakek Odo (tanda !)', () => {
    const c = make();
    expect(activeQuests(c)[0].id).toBe('ch1');
    expect(npcMarks(c, 'home')).toEqual({ odo: '!' });
    expect(talkOffers(c, 'home', 'odo')[0]).toMatchObject({ id: 'ch1', start: true, ends: false });
    expect(talkOffers(c, 'home', 'pip')).toEqual([]);
    expect(questTalk(c, 'ch1', 'home', 'pip', 5).ok).toBe(false);
  });

  it('langkah gerbang & bos selesai sendiri dari hasil perjalanan; lapor membayar hadiah', () => {
    let c = talk(make(), 'ch1', 'home', 'odo').char;
    expect(c.quests.main).toEqual({ ch: 0, step: 1, prog: 0 });
    c = applyTrip(c, trip({ floor: 2 }), 6).char;       // entering finds the gate
    expect(c.quests.main.step).toBe(2);
    c = applyTrip(c, trip({ floor: 5, cleared: true }), 7).char;
    expect(c.quests.main.step).toBe(3);
    expect(npcMarks(c, 'home')).toEqual({ odo: '?' });
    const r = talk(c, 'ch1', 'home', 'odo');
    expect(r.done).toBe(true);
    expect(r.got.shard).toBe(true);
    expect(r.got.items).toHaveLength(1);
    expect(r.got.items[0].rarity).toBe(2);
    expect(r.char.gold).toBeGreaterThan(c.gold);
    expect(r.char.inventory.at(-1)).toEqual(r.got.items[0]);
    expect(r.char.quests.done).toEqual(['ch1']);
    expect(r.char.quests.main).toEqual({ ch: 1, step: 0, prog: 0 }); // ch2: walk into Rimbawana
    expect(shards(r.char)).toBe(1);
    expect(validateSlot(r.char)).toEqual([]);
  });

  it('langkah yang sudah terpenuhi (save lama) langsung terlewati', () => {
    let c = make();
    c.found = ['shadow', 'crystal'];
    c.towns = ['home', 'rimba'];
    c.records.dungeons.shadow.clears = 3;
    c = talk(c, 'ch1', 'home', 'odo').char;
    expect(c.quests.main.step).toBe(3);                  // straight to the report
    c = talk(c, 'ch1', 'home', 'odo').char;
    expect(c.quests.main).toEqual({ ch: 1, step: 1, prog: 0 }); // Rimbawana already visited
    expect(npcMarks(c, 'rimba')).toEqual({ board: '?' });
    c = talk(c, 'ch2', 'rimba', 'board').char;
    expect(c.quests.main.step).toBe(3);                  // crystal gate already found
  });

  it('masuk kota memajukan langkah kota', () => {
    let c = make();
    c.quests.main = { ch: 1, step: 0, prog: 0 };
    c = visitTown(c, 'rimba', 9);
    expect(c.quests.main.step).toBe(1);
  });

  it('bab berurutan sampai semua bab selesai; 5 Pecahan Segel', () => {
    let c = make();
    c.level = 30;
    c.found = ['shadow', 'crystal', 'fungus', 'tomb', 'lava'];
    c.towns = ['home', 'rimba', 'beku', 'pasir', 'bara'];
    for (const id of Object.keys(c.records.dungeons)) c.records.dungeons[id].clears = 1;
    syncQuests(c);
    let guard = 0;
    while (!mainDone(c) && guard++ < 30) {
      const s = activeQuests(c)[0].step;
      c = talk(c, activeQuests(c)[0].id, s.town, s.npc).char;
    }
    expect(mainDone(c)).toBe(true);
    expect(shards(c)).toBe(SHARDS);
    expect(c.quests.done).toEqual(MAIN.map((q) => q.id));
    expect(c.inventory.filter((it) => it.rarity === 4)).toHaveLength(1); // ch5: a Legendary
    expect(c.inventory.find((it) => it.rarity === 4).unique).toBeTruthy();
    expect(activeQuests(c)).toEqual([]);
    expect(validateSlot(c)).toEqual([]);
  });

  it('hadiah gear masuk Gudang bila tas penuh; ditolak bila keduanya penuh', () => {
    let c = make();
    c.quests.main = { ch: 0, step: 3, prog: 0 };
    const piece = (i) => ({ id: `f${i}`, slot: 'ring', classId: null, variant: 1, rarity: 0, itemLevel: 1, base: { crit: 1 }, bonuses: [], unique: null, plus: 0, sockets: [] });
    c.inventory = Array.from({ length: INVENTORY_MAX }, (_, i) => piece(i));
    const r = talk(c, 'ch1', 'home', 'odo');
    expect(r.char.stash).toHaveLength(1);
    c.stash = Array.from({ length: 120 }, (_, i) => piece(`s${i}`));
    expect(questTalk(c, 'ch1', 'home', 'odo', 5).reason).toBe('bag');
  });

  it('progres dari wilayah juga dihitung (gerbang ditemukan di wilayah)', () => {
    let c = talk(make(), 'ch1', 'home', 'odo').char;
    c = applyField(c, { region: 'forest', found: ['shadow'], potions: c.potions, hp: 100 }, 8).char;
    expect(c.quests.main.step).toBe(2);
  });
});

describe('penanda tujuan', () => {
  it('gerbang yang belum ditemukan: lingkaran petunjuk yang memuat gerbang', () => {
    let c = talk(make(), 'ch1', 'home', 'odo').char;
    const t = questTarget(c, 'forest');
    const g = gateSpots(regionById('forest'), c.world.seed).find((x) => x.dungeon === 'shadow');
    expect(t.kind).toBe('hint');
    expect(t.r).toBe(GATE_HINT.r);
    expect(Math.hypot(t.x - g.x, t.y - g.y)).toBeLessThan(t.r);
    expect(questTarget(c, 'ice')).toBe(null);
    c.found = ['shadow'];
    syncQuests(c);
    expect(questTarget(c, 'forest')).toMatchObject({ kind: 'gate', x: g.x, y: g.y });
  });

  it('kota tujuan di ujung wilayah', () => {
    const c = make();
    c.quests.main = { ch: 1, step: 0, prog: 0 };
    const map = buildFieldMap(regionById('forest'));
    expect(questTarget(c, 'forest')).toEqual({ kind: 'town', x: map.end.x, y: map.end.y });
    expect(questTarget(make(), 'forest')).toMatchObject({ kind: 'town', x: map.start.x }); // ch1 starts at home (west)
  });
});
