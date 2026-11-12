import { describe, it, expect } from 'vitest';
import { activeQuests, syncQuests, countQuests, talkOffers, npcMarks, questTalk, questTarget, shards, mainDone, rewardPreview, questDef, strongerMark, markChar, isMainMark } from './quests.js';
import { createCharacter, applyTrip } from './character.js';
import { applyField, visitTown, gateSpots } from './world.js';
import { validateSlot } from './schema.js';
import { MAIN, SHARDS, GATE_HINT } from '../data/quests.js';
import { regionById } from '../data/world.js';
import { INVENTORY_MAX } from '../data/balance.js';
import { mulberry } from '../run/fieldmap.js';
import { buildWorld, blocked as worldBlocked, zoneToWorld, zoneAt } from '../run/worldmap.js';

// an archer past the Prolog (ch0): the shard chapters start at ch 1
const make = (over = {}) => { const c = createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'archer' }, 1000); return { ...c, quests: { ...c.quests, main: { ch: 1, step: 0, prog: 0 }, done: ['ch0'] }, ...over }; };
const trip = (over = {}) => ({ dungeon: 'shadow', exp: 0, gold: 0, kills: 0, bossKills: 0, floor: 1, cleared: false, died: false, hp: 100, potions: { ...make().potions }, ...over });
const talk = (c, id, town, npc) => { const r = questTalk(c, id, town, npc, 5, mulberry(3)); expect(r.ok).toBe(true); return r; };

describe('quest utama', () => {
  it('dimulai dengan bicara pada Kakek Odo (tanda !)', () => {
    const c = make();
    expect(activeQuests(c)[0].id).toBe('ch1');
    expect(npcMarks(c, 'home').odo).toBe('M!');
    expect(talkOffers(c, 'home', 'odo')[0]).toMatchObject({ id: 'ch1', start: true, ends: false });
    expect(talkOffers(c, 'home', 'dara')).toEqual([]);
    expect(questTalk(c, 'ch1', 'home', 'dara', 5).ok).toBe(false);
  });

  it('langkah gerbang & bos selesai sendiri dari hasil perjalanan; lapor membayar hadiah', () => {
    let c = talk(make(), 'ch1', 'home', 'odo').char;
    expect(c.quests.main).toEqual({ ch: 1, step: 1, prog: 0 });
    c = applyTrip(c, trip({ floor: 2 }), 6).char;       // entering finds the gate
    expect(c.quests.main.step).toBe(2);
    c = applyTrip(c, trip({ floor: 5, cleared: true }), 7).char;
    expect(c.quests.main.step).toBe(3);
    expect(npcMarks(c, 'home').odo).toBe('M?');
    const r = talk(c, 'ch1', 'home', 'odo');
    expect(r.done).toBe(true);
    expect(r.got.shard).toBe(true);
    expect(r.got.items).toHaveLength(1);
    expect(r.got.items[0].rarity).toBe(2);
    expect(r.char.gold).toBeGreaterThan(c.gold);
    const pv = rewardPreview(c, questDef('ch1').reward); // what the journal promised is what was paid
    expect(r.got.gold).toBe(pv.gold);
    expect(r.got.exp).toBe(pv.exp);
    expect(pv.gear).toEqual({ rarity: 2 });
    expect(pv.shard).toBe(true);
    expect(r.char.inventory.at(-1)).toEqual(r.got.items[0]);
    expect(r.char.quests.done).toEqual(['ch0', 'ch1']);
    expect(r.mounts).toEqual(['horse']);
    expect(r.char.mounts.active).toBe('horse');
    expect(r.char.quests.main).toEqual({ ch: 2, step: 0, prog: 0 }); // ch2: walk into Rimbawana
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
    expect(c.quests.main).toEqual({ ch: 2, step: 1, prog: 0 }); // Rimbawana already visited
    expect(npcMarks(c, 'rimba').board).toBe('M?');
    c = talk(c, 'ch2', 'rimba', 'board').char;
    expect(c.quests.main.step).toBe(3);                  // crystal gate already found
  });

  it('masuk kota memajukan langkah kota', () => {
    let c = make();
    c.quests.main = { ch: 2, step: 0, prog: 0 };
    c = visitTown(c, 'rimba', 9);
    expect(c.quests.main.step).toBe(1);
  });

  it('bab berurutan sampai semua bab selesai; 5 Pecahan Segel', () => {
    let c = make();
    c.level = 30;
    c.found = ['shadow', 'crystal', 'fungus', 'tomb', 'lava'];
    c.towns = ['home', 'rimba', 'beku', 'pasir', 'bara'];
    c.found.push('spire');
    c.regions.eclipse = { fog: '' };
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
    expect(c.inventory.find((it) => it.unique === 'mahkotafajar')).toBeTruthy(); // ch6: the crown
    expect(c.inventory.find((it) => it.rarity === 4).unique).toBeTruthy();
    expect(activeQuests(c)).toEqual([]);
    expect(validateSlot(c)).toEqual([]);
  });

  it('hadiah gear masuk Gudang bila tas penuh; ditolak bila keduanya penuh', () => {
    let c = make();
    c.quests.main = { ch: 1, step: 3, prog: 0 };
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

describe('pratinjau hadiah', () => {
  it('koin & EXP mengikuti level, isi lain disalin apa adanya', () => {
    const rw = { gold: 2, exp: 3, gems: [{ tier: 2 }, { gem: 'ruby', tier: 1 }], marks: 4, mats: { dust: 5 }, potions: { red: 2 }, unique: 'x' };
    const p1 = rewardPreview(make(), rw), p5 = rewardPreview(make({ level: 5 }), rw);
    expect(p1.gold).toBe(2 * (40 + 12));
    expect(p1.exp).toBe(3 * (30 + 10));
    expect(p5.gold).toBe(2 * (40 + 12 * 5));
    expect(p1).toMatchObject({ gear: null, unique: 'x', marks: 4, mats: { dust: 5 }, potions: { red: 2 }, shard: false });
    expect(p1.gems).toEqual([{ gem: null, tier: 2 }, { gem: 'ruby', tier: 1 }]);
    expect(rewardPreview(make(), {})).toMatchObject({ gold: 0, exp: 0, gems: [], marks: 0 });
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
    c.quests.main = { ch: 2, step: 0, prog: 0 };
    const { towns } = buildWorld();
    expect(questTarget(c, 'forest')).toEqual({ kind: 'town', town: 'rimba', x: towns.rimba.x, y: towns.rimba.y });
    expect(questTarget(make())).toMatchObject({ kind: 'town', town: 'home', x: towns.home.x }); // ch1 starts at home (the middle)
  });
});

import { SIDE, SIDE_MAX, HIDDEN, SPOTS, HIDDEN_R } from '../data/quests.js';
import { abandonQuest, trackQuest, trackedQuest, hiddenIn, fieldQuests, canGive, hiddenXY } from './quests.js';
import { ENEMIES } from '../data/enemies.js';
import { TOWN_DEFS } from '../data/towns.js';
import { UNIQUES } from '../data/items.js';
import { treasureSpots } from './world.js';
import { dropItem } from './itemgen.js';
import { makeItem } from './itemgen.js';
import { TREASURE } from '../data/world.js';

const gearOf = (rarity, i, slot = 'ring') => ({ ...makeItem({ slot, classId: 'archer', rarity, itemLevel: 5 }, mulberry(i)), id: `g${i}` });
const field = (c, part) => applyField(c, { potions: c.potions, hp: 100, ...part }, 9).char;

describe('side quest', () => {
  it('ditawarkan oleh penghuni tersembunyi (tanda !), diterima, lalu tercatat', () => {
    const c = make();
    expect(npcMarks(c, 'wild').gaharu).toBe('!');
    const o = talkOffers(c, 'wild', 'gaharu')[0];
    expect(o).toMatchObject({ id: 's_gaharu', start: true });
    const r = talk(c, 's_gaharu', 'wild', 'gaharu');
    expect(r.char.quests.side.s_gaharu).toEqual({ step: 1, prog: 0 });
    expect(talkOffers(r.char, 'wild', 'gaharu')).toEqual([]);
    expect(validateSlot(r.char)).toEqual([]);
  });

  it('paling banyak SIDE_MAX side quest aktif', () => {
    let c = make();
    for (const q of SIDE.slice(0, SIDE_MAX)) c.quests.side[q.id] = { step: 1, prog: 0 };
    const q = SIDE[SIDE_MAX];
    const s = q.steps[0];
    expect(talkOffers(c, s.town, s.npc).find((o) => o.id === q.id).full).toBe(true);
    expect(questTalk(c, q.id, s.town, s.npc, 1).reason).toBe('journal');
  });

  it('buru: kill di wilayahnya saja, lalu lapor membayar Lencana & gear', () => {
    let c = talk(make(), 's_gaharu', 'wild', 'gaharu').char;
    c = field(c, { region: 'ice', killsBy: { wolf: 40 } });
    expect(c.quests.side.s_gaharu.prog).toBe(0);
    c = field(c, { region: 'forest', killsBy: { wolf: 31 } });
    expect(c.quests.side.s_gaharu).toEqual({ step: 2, prog: 0 });
    expect(npcMarks(c, 'wild').gaharu).toBe('?');
    const r = talk(c, 's_gaharu', 'wild', 'gaharu');
    expect(r.done).toBe(true);
    expect(r.char.marks).toBe(c.marks + 2);
    expect(r.char.quests.done).toContain('s_gaharu');
    expect(npcMarks(r.char, 'wild').gaharu).toBeUndefined(); // no second time
  });

  it('kumpul: barang quest dari wilayah', () => {
    let c = talk(make(), 's_kunyit', 'wild', 'kunyit').char;
    expect(fieldQuests(c, 'forest').drops).toEqual([{ item: 'glowcap', enemy: 'bomber', chance: 0.4, night: false, region: 'forest' }]);
    expect(fieldQuests(c, 'ice').drops).toEqual([]);
    c = field(c, { region: 'forest', questItems: { glowcap: 3 } });
    expect(c.quests.side.s_kunyit.prog).toBe(3);
    c = field(c, { region: 'forest', questItems: { glowcap: 4 } });
    expect(c.quests.side.s_kunyit.step).toBe(2);
    const r = talk(c, 's_kunyit', 'wild', 'kunyit');
    expect(r.char.potions.big).toBe(Math.min(5, c.potions.big + 2));
  });

  it('rantai: tempat (bit per titik), Penguasa, serahkan bahan + gear Epik, unik quest', () => {
    let c = talk(make({ level: 20 }), 's_resi', 'wild', 'resi').char;
    expect(fieldQuests(c, 'forest').spots.map((s) => s.spot)).toEqual(['stone1', 'stone2', 'stone3']);
    c = field(c, { region: 'forest', reached: ['stone2'] });
    expect(c.quests.side.s_resi).toEqual({ step: 1, prog: 2 });
    expect(fieldQuests(c, 'forest').spots.map((s) => s.spot)).toEqual(['stone1', 'stone3']);
    c = field(c, { region: 'forest', reached: ['stone1', 'stone3'] });
    expect(c.quests.side.s_resi.step).toBe(2);              // now the overlord
    c = field(c, { region: 'forest', opened: [TREASURE.count - 1] });
    expect(c.quests.side.s_resi.step).toBe(3);              // hand over
    const o = talkOffers(c, 'wild', 'resi')[0];
    expect(o.give).toBeTruthy();
    expect(o.can.ok).toBe(false);
    expect(questTalk(c, 's_resi', 'wild', 'resi', 1).reason).toBe('give');
    c.mats.core = 2;
    c.inventory = [gearOf(3, 1), gearOf(4, 2), gearOf(2, 3)];
    c.equipped.ring = 'g1';                                  // worn: never handed over
    expect(canGive(c, o.give).ok).toBe(true);
    expect(canGive(c, o.give).gear.map((it) => it.id)).toEqual(['g2']);
    const r = talk(c, 's_resi', 'wild', 'resi');
    expect(r.done).toBe(true);
    expect(r.char.mats.core).toBe(1);
    expect(r.char.inventory.map((it) => it.id)).not.toContain('g2');
    const u = r.char.inventory.find((it) => it.unique === 'akartua');
    expect(u).toBeTruthy();
    expect(u.itemLevel).toBe(20);
    expect(r.char.records.uniques).toContain('akartua');
    expect(validateSlot(r.char)).toEqual([]);
  });

  it('serahkan permata: tingkat yang diminta, dari jenis mana pun', () => {
    let c = make();
    c.quests.side.s_amun = { step: 3, prog: 0 };
    c.gems.ruby[1] = 2; c.gems.topaz[1] = 1;
    const r = talk(c, 's_amun', 'wild', 'amun');
    expect(r.char.gems.ruby[1] + r.char.gems.topaz[1]).toBe(0);
  });

  it('cari orang: penghuni pergi saat quest diterima; lapor di kota', () => {
    let c = make();
    expect(hiddenIn(c, 'forest').map((h) => h.id)).toContain('lio');
    c = talk(c, 's_lio', 'wild', 'lio').char;
    expect(hiddenIn(c, 'forest').map((h) => h.id)).not.toContain('lio');
    expect(npcMarks(c, 'rimba').folk1).toBe('?');
    const r = talk(c, 's_lio', 'rimba', 'folk1');
    expect(r.done).toBe(true);
    expect(hiddenIn(r.char, 'forest').map((h) => h.id)).not.toContain('lio');
  });

  it('elite jenis tertentu dihitung dari elitesBy', () => {
    const c = make();
    c.quests.side.s_salju = { step: 2, prog: 0 };
    const n = field(c, { region: 'ice', elites: 5, elitesBy: { yeti: 3, icewisp: 2 } });
    expect(n.quests.side.s_salju.prog).toBe(2);
  });

  it('batalkan & lacak', () => {
    let c = talk(make(), 's_gaharu', 'wild', 'gaharu').char;
    c = trackQuest(c, 's_gaharu', 1).char;
    expect(trackedQuest(c).id).toBe('s_gaharu');
    expect(questTarget(c, 'forest')).toBe(null);           // a hunt has no place
    c = abandonQuest(c, 's_gaharu', 2).char;
    expect(c.quests.side).toEqual({});
    expect(c.quests.track).toBe(null);
    expect(npcMarks(c, 'wild').gaharu).toBe('!');          // can be taken again
    expect(trackQuest(c, 's_gaharu', 3).ok).toBe(false);
  });

  it('penanda: penghuni tersembunyi & titik terdekat', () => {
    let c = talk(make(), 's_resi', 'wild', 'resi').char;
    c = trackQuest(c, 's_resi', 1).char;
    const t1 = questTarget(c, 'forest', zoneToWorld('forest', 0, 0.5));
    expect(t1).toMatchObject({ kind: 'spot', spot: 'stone1' });
    c.quests.side.s_resi = { step: 3, prog: 0 };
    expect(questTarget(c, 'forest')).toMatchObject({ kind: 'hidden', ...hiddenXY(HIDDEN.find((h) => h.id === 'resi')) });
  });
});

describe('data quest', () => {
  it('tiap langkah menunjuk musuh, NPC, tempat & unik yang ada', () => {
    const npcs = (town) => [...TOWN_DEFS[town].npcs, ...Object.values(TOWN_DEFS[town].interiors).flatMap((r) => r.npcs || [])].map((n) => n.id);
    for (const q of [...MAIN, ...SIDE]) {
      for (const s of q.steps) {
        if (s.enemy && s.enemy !== '*') expect(ENEMIES[s.enemy], `${q.id} ${s.enemy}`).toBeTruthy();
        if (s.show) expect(ENEMIES[s.show].kin).toBe(s.enemy);
        if ((s.kind === 'talk' || s.kind === 'give' || s.kind === 'choice') && s.town !== 'wild') expect(npcs(s.town), `${q.id} ${s.npc}`).toContain(s.npc);
        if (s.town === 'wild') expect(HIDDEN.some((h) => h.id === s.npc)).toBe(true);
        for (const id of s.spots || []) expect(SPOTS[id]).toBeTruthy();
      }
      if (q.reward.unique) expect(UNIQUES.find((u) => u.id === q.reward.unique)?.quest).toBe(true);
      const last = q.steps.at(-1).kind;
      expect(['talk', 'give', 'choice']).toContain(last);
    }
  });

  it('16 tempat tersembunyi (4 per wilayah) & titik quest: tidak di benda padat, jauh dari peti', () => {
    for (const r of ['forest', 'ice', 'desert', 'volcano']) expect(HIDDEN.filter((h) => h.region === r)).toHaveLength(4);
    for (const h of HIDDEN) {
      const region = regionById(h.region), p = hiddenXY(h);
      expect(worldBlocked(buildWorld(), p.x, p.y, HIDDEN_R.solid + 20), h.id).toBe(false);
      expect(zoneAt(buildWorld(), p.x, p.y), h.id).toBe(h.region);
      for (const tr of treasureSpots(region)) expect(Math.hypot(tr.x - p.x, tr.y - p.y), h.id).toBeGreaterThan(500);
    }
    for (const [id, s] of Object.entries(SPOTS)) {
      const p = zoneToWorld(s.region, s.at[0], s.at[1]);
      expect(zoneAt(buildWorld(), p.x, p.y), id).toBe(s.region);
    }
  });

  it('unik quest tidak pernah jatuh dari musuh / peti', () => {
    const rng = mulberry(5);
    for (let i = 0; i < 3000; i++) {
      const it = dropItem({ source: 'grand', classId: 'mage', charLevel: 40, floor: 5, luk: 200 }, rng);
      if (it.unique) expect(UNIQUES.find((u) => u.id === it.unique).quest).toBeFalsy();
    }
  });
});

describe('side quest kota', () => {
  it('16 quest kota: 4 di Kota Awal, 3 di tiap kota besar', () => {
    const towns = SIDE.filter((q) => q.id.startsWith('t_')).map((q) => q.steps[0].town);
    expect(towns).toHaveLength(16);
    expect(towns.filter((t) => t === 'home')).toHaveLength(4);
    for (const t of ['rimba', 'beku', 'pasir', 'bara']) expect(towns.filter((x) => x === t)).toHaveLength(3);
  });

  it('antar sup ke penghuni tersembunyi: tanda ? di pondoknya', () => {
    let c = talk(make(), 't_marta', 'home', 'inn').char;
    expect(npcMarks(c, 'wild').kunyit).toBe('?');
    const offers = talkOffers(c, 'wild', 'kunyit');
    expect(offers[0].id).toBe('t_marta');                   // the errand comes before her own quest
    const r = talk(c, 't_marta', 'wild', 'kunyit');
    expect(r.done).toBe(true);
  });

  it('serahkan zirah: hanya slot helm/armor/sepatu yang dihitung', () => {
    let c = talk(make(), 't_bulu', 'beku', 'armor').char;
    c.inventory = [gearOf(2, 1, 'ring'), gearOf(2, 2, 'helm')];
    expect(talkOffers(c, 'beku', 'armor')[0].can.ok).toBe(false);
    c.inventory.push(gearOf(3, 3, 'boots'));
    const r = talk(c, 't_bulu', 'beku', 'armor');
    expect(r.char.inventory[0].id).toBe('g1');                // the ring stays
    expect(r.char.inventory.some((it) => it.id === 'g2' || it.id === 'g3')).toBe(false);
  });

  it('kumpul malam hari dari musuh apa pun', () => {
    const c = talk(make(), 't_akar', 'rimba', 'potion').char;
    expect(fieldQuests(c, 'forest').drops).toEqual([{ item: 'firefly', enemy: '*', chance: 0.12, night: true, region: 'forest' }]);
  });

  it('bunuh varian: Katak Salju dihitung lewat kin di Padang Es saja', () => {
    let c = talk(make(), 't_arne', 'beku', 'folk0').char;
    c = field(c, { region: 'forest', killsBy: { spitter: 30 } });
    expect(c.quests.side.t_arne.prog).toBe(0);
    c = field(c, { region: 'ice', killsBy: { spitter: 25 } });
    expect(c.quests.side.t_arne.step).toBe(2);
  });
});

describe('bab 6 & akhir cerita (spec §26.7)', () => {
  it('masuk Tanah Gerhana, temukan menara, kalahkan Sang Gerhana: tamat dicatat sekali', () => {
    let c = make({ level: 48 });
    c.quests.main = { ch: 6, step: 1, prog: 0 };
    c.quests.done = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
    c = field(c, { region: 'eclipse', found: ['spire'] });
    expect(c.quests.main.step).toBe(3);                      // region & gate done, now the boss
    const r = applyTrip(c, trip({ dungeon: 'spire', floor: 5, cleared: true }), 77);
    expect(r.ending).toBe(true);
    expect(r.char.records.ending).toBe(77);
    expect(r.char.quests.main.step).toBe(4);
    const again = applyTrip(r.char, trip({ dungeon: 'spire', floor: 5, cleared: true }), 99);
    expect(again.ending).toBe(false);
    expect(again.char.records.ending).toBe(77);
    expect(validateSlot(again.char)).toEqual([]);
  });
});

describe('tanda quest', () => {
  it('langkah mengalahkan quest baru, cerita utama mengalahkan sampingan', () => {
    expect(strongerMark('!', '?')).toBe('?');
    expect(strongerMark('?', 'M!')).toBe('?');
    expect(strongerMark('!', 'M!')).toBe('M!');
    expect(strongerMark('M?', '?')).toBe('M?');
    expect(strongerMark(null, '!')).toBe('!');
    expect(strongerMark(undefined, undefined)).toBe(null);
    expect([markChar('M?'), markChar('!'), isMainMark('M!'), isMainMark('?')]).toEqual(['?', '!', true, false]);
  });
});

describe('langkah pilihan (§42)', () => {
  it('dua jawaban, hadiah berbeda, jawaban tercatat', async () => {
    const { createCharacter } = await import('./character.js');
    const { validateSlot } = await import('./schema.js');
    let c = createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'warrior' }, 1);
    c.towns.push('pasir'); c.location = 'pasir';
    c = questTalk(c, 'p_kantong', 'pasir', 'folk1', 2, () => 0.5).char;
    countQuests(c, { elites: 1, region: 'desert' });
    const offer = talkOffers(c, 'pasir', 'folk1').find((o) => o.id === 'p_kantong');
    expect(offer.choice.map((o) => o.label)).toEqual(['Kembalikan ke Omar', 'Simpan saja']);
    expect(questTalk(c, 'p_kantong', 'pasir', 'folk1', 3, () => 0.5).reason).toBe('choose');
    const keep = questTalk(c, 'p_kantong', 'pasir', 'folk1', 3, () => 0.5, 1), give = questTalk(c, 'p_kantong', 'pasir', 'folk1', 3, () => 0.5, 0);
    expect(keep.ok && give.ok).toBe(true);
    expect(keep.char.quests.choices.p_kantong).toBe(1);
    expect(give.char.quests.choices.p_kantong).toBe(0);
    expect(keep.got.gold).toBeGreaterThan(give.got.gold);
    expect(give.char.marks).toBeGreaterThan(keep.char.marks);
    expect(keep.say).toContain('gurun');
    expect(keep.char.quests.done).toContain('p_kantong');
    expect(validateSlot(keep.char)).toEqual([]);
  });
});

describe('Prolog (ch0)', () => {
  const novice = () => createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'novice' }, 1000);
  it('Odo → Dara → 8 lendir → Pak Darto → elite → level 5 → Guru Hadi → pilih job → Pandai Brom; tanpa Pecahan Segel', () => {
    let c = novice();
    expect(activeQuests(c)[0].id).toBe('ch0');
    c = talk(c, 'ch0', 'home', 'odo').char;
    c = talk(c, 'ch0', 'home', 'dara').char;
    c = countQuests(structuredClone(c), { killsBy: { slink: 8 } });
    c = talk(c, 'ch0', 'home', 'darto').char;
    c = countQuests(structuredClone(c), { elites: 1, elitesBy: {} });
    expect(activeQuests(c)[0].step.kind).toBe('level');
    c = syncQuests({ ...structuredClone(c), level: 5 });
    c = talk(c, 'ch0', 'home', 'trainer').char;
    expect(activeQuests(c)[0].step.kind).toBe('job');
    c = syncQuests({ ...structuredClone(c), classId: 'warrior' });
    const r = talk(c, 'ch0', 'home', 'gear');
    expect(r.char.quests.main.ch).toBe(1);
    expect(r.got.shard).toBe(false);
    expect(shards(r.char)).toBe(0);
    expect(activeQuests(r.char)[0].id).toBe('ch1');
  });
});

