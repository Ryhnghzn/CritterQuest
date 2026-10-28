import { describe, it, expect } from 'vitest';
import { SAVE_VERSION, SETTINGS_VERSION, migrate, validateSlot, readSlot, readSettings } from './schema.js';
import { createCharacter } from './character.js';

// an older save keeps its records in the pre-v5 shape
const legacy = (c) => ({ ...c, records: { bestFloor: 0, clears: 0, trips: 0, kills: 0, bossKills: 0 } });
const fresh = () => createCharacter(
  { slot: 1, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'mage' }, 1761436800000,
);
const item = (over = {}) => ({
  id: 'it_a1', slot: 'helm', classId: null, variant: 0, rarity: 1, itemLevel: 3,
  base: { maxHp: 20 }, bonuses: [{ stat: 'crit', value: 2 }], plus: 0, sockets: [], ...over,
});

describe('validateSlot', () => {
  it('menerima karakter baru', () => {
    expect(validateSlot(fresh())).toEqual([]);
  });

  it('menerima inventori + gear terpasang yang konsisten', () => {
    const c = { ...fresh(), inventory: [item()], equipped: { ...fresh().equipped, helm: 'it_a1' } };
    expect(validateSlot(c)).toEqual([]);
  });

  it.each([
    ['nama terlalu panjang', (c) => { c.name = 'x'.repeat(13); }],
    ['kelas tak dikenal', (c) => { c.classId = 'ninja'; }],
    ['level 0', (c) => { c.level = 0; }],
    ['level 51', (c) => { c.level = 51; }],
    ['uang negatif', (c) => { c.gold = -1; }],
    ['EXP pecahan', (c) => { c.exp = 1.5; }],
    ['rambut di luar rentang', (c) => { c.look.hair = 9; }],
    ['upgrade hilang', (c) => { delete c.upgrades.magnet; }],
    ['HP negatif', (c) => { c.hp = -1; }],
    ['HP pecahan', (c) => { c.hp = 10.5; }],
    ['potion melebihi batas', (c) => { c.potions.red = 6; }],
    ['potion bukan objek', (c) => { c.potions = 3; }],
    ['jenis potion asing', (c) => { c.potions.teh = 1; }],
    ['sabuk tidak 4 slot', (c) => { c.belt = ['red']; }],
    ['sabuk berisi jenis asing', (c) => { c.belt[0] = 'teh'; }],
    ['rekor dungeon hilang', (c) => { delete c.records.dungeons.crystal; }],
    ['rekor lantai > 5', (c) => { c.records.dungeons.shadow.bestFloor = 6; }],
    ['jam negatif', (c) => { c.clock = -5; }],
    ['tempa melebihi +15', (c) => { c.inventory = [item({ plus: 16 })]; }],
    ['soket tidak sesuai rarity', (c) => { c.inventory = [item({ sockets: [null] })]; }],
    ['material negatif', (c) => { c.mats.dust = -1; }],
    ['skill kelas lain', (c) => { c.skills = ['spin', 'nova', null, null]; }],
    ['skill sama di dua slot', (c) => { c.skills = ['nova', 'nova', null, null]; }],
    ['slot skill bukan 4', (c) => { c.skills = ['nova', 'chain']; }],
    ['bakat melebihi level', (c) => { c.talents.might = 3; }],
    ['rekor bukan angka', (c) => { c.records.kills = 'banyak'; }],
    ['inventori > 60', (c) => { c.inventory = Array.from({ length: 61 }, (_, i) => item({ id: `it_${i}` })); }],
    ['id item ganda', (c) => { c.inventory = [item(), item()]; }],
    ['rarity tak dikenal', (c) => { c.inventory = [item({ rarity: 6 })]; }],
    ['atribut hilang', (c) => { delete c.attrs.luk; }],
    ['poin atribut melebihi level', (c) => { c.level = 2; c.attrs.str = 4; }],
    ['bonus stat tak dikenal', (c) => { c.inventory = [item({ bonuses: [{ stat: 'luck', value: 1 }] })]; }],
    ['gear terpasang tidak ada di inventori', (c) => { c.equipped.helm = 'it_x'; }],
    ['gear dipasang di slot yang salah', (c) => { c.inventory = [item()]; c.equipped.armor = 'it_a1'; }],
  ])('menolak: %s', (_, mutate) => {
    const c = structuredClone(fresh());
    mutate(c);
    expect(validateSlot(c).length).toBeGreaterThan(0);
  });
});

describe('save versi 2', () => {
  it('HP null (penuh) atau bilangan bulat ≥ 0 sah', () => {
    expect(validateSlot({ ...fresh(), hp: null })).toEqual([]);
    expect(validateSlot({ ...fresh(), hp: 0 })).toEqual([]);
    expect(validateSlot({ ...fresh(), hp: 37, potions: { ...fresh().potions, red: 5 } })).toEqual([]);
  });

  it('migrasi v1 → v2: hp & potion baru, upgrade potion dibuang, rekor diubah', () => {
    const v1 = {
      ...fresh(), version: 1,
      upgrades: { hp: 2, atk: 1, magnet: 0, potion: 3 },
      records: { bestTime: 321, runs: 7, kills: 400, bossKills: 2 },
    };
    delete v1.hp; delete v1.potions;
    const r = readSlot(v1);
    expect(r.status).toBe('ok');
    expect(r.data.version).toBe(SAVE_VERSION);
    expect(r.data.hp).toBeNull();
    expect(r.data.potions.red).toBe(0);
    expect(r.data.upgrades).toEqual({ hp: 2, atk: 1, magnet: 0 });
    expect(r.data.records.trips).toBe(7);
    expect(r.data.records.kills).toBe(400);
    expect(r.data.records.dungeons.shadow).toEqual({ bestFloor: 0, clears: 0 });
  });

  it('migrasi v2 → v3: atribut nol, slot sepatu & kalung kosong, gear lama tetap', () => {
    const v2 = { ...legacy(fresh()), version: 2, level: 6, inventory: [item()], equipped: { weapon: null, helm: 'it_a1', armor: null, ring: null } };
    delete v2.attrs; delete v2.belt; v2.potions = 0;
    const r = readSlot(v2);
    expect(r.status).toBe('ok');
    expect(r.data.version).toBe(SAVE_VERSION);
    expect(r.data.attrs).toEqual({ str: 0, vit: 0, agi: 0, dex: 0, luk: 0 });
    expect(r.data.equipped).toEqual({ weapon: null, helm: 'it_a1', armor: null, ring: null, boots: null, amulet: null });
  });

  it('migrasi v3 → v4: ramuan lama menjadi Ramuan Merah, sabuk bawaan', () => {
    const v3 = { ...legacy(fresh()), version: 3, potions: 4 };
    delete v3.belt;
    const r = readSlot(v3);
    expect(r.status).toBe('ok');
    expect(r.data.potions).toEqual({ red: 4, big: 0, shield: 0, wind: 0, rage: 0 });
    expect(r.data.belt).toEqual(['red', 'big', 'shield', 'rage']);
  });

  it('migrasi v4 → v5: rekor lantai lama menjadi rekor dungeon pertama', () => {
    const v4 = { ...fresh(), version: 4, records: { bestFloor: 4, clears: 2, trips: 9, kills: 50, bossKills: 2 } };
    const r = readSlot(v4);
    expect(r.status).toBe('ok');
    expect(r.data.records.dungeons.shadow).toEqual({ bestFloor: 4, clears: 2 });
    expect(r.data.records.dungeons.lava).toEqual({ bestFloor: 0, clears: 0 });
    expect(r.data.records.bestFloor).toBeUndefined();
  });

  it('migrasi v5 → v6: jam dalam game mulai pukul 07:00', () => {
    const v5 = { ...fresh(), version: 5 };
    delete v5.clock;
    const r = readSlot(v5);
    expect(r.status).toBe('ok');
    expect(r.data.clock).toBe(7 * 60);
  });

  it('migrasi v6 → v7: material & permata kosong, item dapat tingkat tempa & soket', () => {
    const v6 = { ...fresh(), version: 6, inventory: [{ ...item({ rarity: 4 }), plus: undefined, sockets: undefined }] };
    delete v6.mats; delete v6.gems;
    const r = readSlot(v6);
    expect(r.status).toBe('ok');
    expect(r.data.mats).toEqual({ dust: 0, crystal: 0, core: 0 });
    expect(r.data.inventory[0].plus).toBe(0);
    expect(r.data.inventory[0].sockets).toEqual([null, null]);
  });

  it('migrasi v7 → v8 → v9: skill bawaan kelas di slot 1–2, bakat nol', () => {
    const v7 = { ...fresh(), version: 7 };
    delete v7.skills; delete v7.talents;
    const r = readSlot(v7);
    expect(r.status).toBe('ok');
    expect(r.data.skills).toEqual(['nova', 'chain', null, null]);
    expect(r.data.talents.might).toBe(0);
  });

  it('migrasi v9 → v10: papan tugas awal, Lencana nol, bestiari kosong, kodeks dari tas', () => {
    const v9 = { ...fresh(), version: 9, inventory: [item({ id: 'u1', rarity: 4, unique: 'fajar', sockets: [null, null] }), item()] };
    delete v9.bounties; delete v9.marks;
    v9.records = { ...v9.records }; delete v9.records.bestiary; delete v9.records.uniques;
    const r = readSlot(v9);
    expect(r.status).toBe('ok');
    expect(r.data.bounties.map((b) => b.kind)).toEqual(['kill', 'elite', 'floors']);
    expect(r.data.marks).toBe(0);
    expect(r.data.records.bestiary.slink).toBe(0);
    expect(r.data.records.uniques).toEqual(['fajar']);
  });

  it('menolak tugas yang progresnya melebihi target', () => {
    const c = fresh();
    c.bounties[0].have = 99;
    expect(validateSlot(c)).toContain('bounties');
  });

  it('migrasi v10 → v11: di kota awal, belum menjelajah', () => {
    const v10 = { ...fresh(), version: 10 };
    delete v10.location; delete v10.towns; delete v10.regions;
    const r = readSlot(v10);
    expect(r.status).toBe('ok');
    expect(r.data).toMatchObject({ location: 'home', towns: ['home'], regions: {} });
  });

  it('migrasi v11 → v12: seed dunia, dungeon yang pernah dimasuki = ditemukan, kabut lama dihapus', () => {
    const v11 = { ...fresh(), version: 11, regions: { forest: { fog: 'AAAA' } } };
    v11.records = structuredClone(v11.records); v11.records.dungeons.shadow.bestFloor = 2;
    delete v11.world; delete v11.found; delete v11.expedition;
    const r = readSlot(v11);
    expect(r.status).toBe('ok');
    expect(r.data.found).toEqual(['shadow']);
    expect(r.data.regions).toEqual({});
    expect(r.data.expedition).toBe(null);
    expect(Number.isInteger(r.data.world.seed)).toBe(true);
  });

  it('migrasi v12 → v13: stok toko & Gudang kosong', () => {
    const v12 = { ...fresh(), version: 12 };
    delete v12.shops; delete v12.stash; delete v12.treasures;
    const r = readSlot(v12);
    expect(r.status).toBe('ok');
    expect(r.data.shops).toEqual({});
    expect(r.data.stash).toEqual([]);
  });

  it('migrasi v13 → v14: harta kosong; harta rusak ditolak', () => {
    const v13 = { ...fresh(), version: 13 };
    delete v13.treasures;
    const r = readSlot(v13);
    expect(r.status).toBe('ok');
    expect(r.data.treasures).toEqual({});
    expect(validateSlot({ ...fresh(), treasures: { forest: [9] } })).toContain('treasures');
    expect(validateSlot({ ...fresh(), treasures: { mars: [0] } })).toContain('treasures');
  });

  it('migrasi v14 → v15: bestiari musuh biome mulai dari 0, hitungan lama tetap', () => {
    const v14 = structuredClone({ ...fresh(), version: 14 });
    v14.records.bestiary = { ...v14.records.bestiary, slink: 7 };
    for (const id of ['wolf', 'yeti', 'icewisp', 'scorpion', 'sandworm', 'imp', 'salamander']) delete v14.records.bestiary[id];
    const r = readSlot(v14);
    expect(r.status).toBe('ok');
    expect(r.data.records.bestiary.slink).toBe(7);
    expect(r.data.records.bestiary.sandworm).toBe(0);
  });

  it('menolak catatan toko & Gudang yang rusak', () => {
    expect(validateSlot({ ...fresh(), shops: { 'mars:weapons': { day: 1, sold: {} } } })).toContain('shops');
    expect(validateSlot({ ...fresh(), shops: { 'rimba:weapons': { day: 1, sold: { 0: 0 } } } })).toContain('shops');
    expect(validateSlot({ ...fresh(), stash: [{ id: 'x' }] })).toContain('stash[0]');
  });

  it('menolak wilayah atau kota yang tidak dikenal', () => {
    expect(validateSlot({ ...fresh(), regions: { mars: { fog: '' } } })).toContain('regions');
    expect(validateSlot({ ...fresh(), location: 'atlantis' })).toContain('location/towns');
  });

  it('v1 yang rusak tetap terbaca rusak setelah migrasi', () => {
    const v1 = { ...fresh(), version: 1, records: 'hilang' };
    delete v1.hp; delete v1.potions;
    expect(readSlot(v1).status).toBe('corrupt');
  });
});

describe('migrate', () => {
  it('versi terkini dikembalikan sebagai salinan', () => {
    const c = fresh();
    const out = migrate(c);
    expect(out).toEqual(c);
    expect(out).not.toBe(c);
  });

  it('menjalankan langkah migrasi selangkah demi selangkah', () => {
    const steps = {
      1: (d) => ({ ...d, version: 2, a: 1 }),
      2: (d) => ({ ...d, version: 3, b: d.a + 1 }),
    };
    expect(migrate({ version: 1 }, steps, 3)).toEqual({ version: 3, a: 1, b: 2 });
  });

  it('menolak versi lebih baru dan versi tanpa langkah', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow(/lebih baru/);
    expect(() => migrate({ version: 1 }, {}, 2)).toThrow();
    expect(() => migrate({ version: 'satu' })).toThrow();
  });
});

describe('readSlot', () => {
  it('data sah → ok', () => {
    expect(readSlot(fresh())).toEqual({ status: 'ok', data: fresh() });
  });

  it.each([
    ['null', null],
    ['string', 'halo'],
    ['objek kosong', {}],
    ['versi lebih baru', { ...fresh(), version: SAVE_VERSION + 1 }],
    ['field rusak', { ...fresh(), level: -3 }],
  ])('%s → rusak, data mentah disimpan', (_, raw) => {
    const r = readSlot(raw);
    expect(r.status).toBe('corrupt');
    expect(r.raw).toBe(raw);
    expect(typeof r.reason).toBe('string');
  });
});

describe('readSettings', () => {
  it('menerima pengaturan versi terkini', () => {
    const s = { version: SETTINGS_VERSION, muted: true, lastSlot: 2, autoAttack: true, lang: 'id', effects: 'lite' };
    expect(readSettings(s)).toEqual(s);
  });
  it('memigrasi versi 1 → 4 (autoAttack mati, bahasa Inggris, efek penuh)', () => {
    expect(readSettings({ version: 1, muted: true, lastSlot: 1 }))
      .toEqual({ version: 4, muted: true, lastSlot: 1, autoAttack: false, lang: 'en', effects: 'full' });
  });
  it('memigrasi versi 3 → 4 tanpa mengubah bahasa', () => {
    expect(readSettings({ version: 3, muted: false, lastSlot: 0, autoAttack: true, lang: 'id' }))
      .toEqual({ version: 4, muted: false, lastSlot: 0, autoAttack: true, lang: 'id', effects: 'full' });
  });
  it.each([
    [null],
    [{ version: 1, muted: 'ya', lastSlot: 0 }],
    [{ version: 2, muted: false, lastSlot: 3, autoAttack: false }],
    [{ version: 2, muted: false, lastSlot: 0, autoAttack: 'ya' }],
    [{ version: 3, muted: false, lastSlot: 0, autoAttack: false }],
    [{ version: 3, muted: false, lastSlot: 0, autoAttack: false, lang: 'fr' }],
    [{ version: 4, muted: false, lastSlot: 0, autoAttack: false, lang: 'en' }],
    [{ version: 4, muted: false, lastSlot: 0, autoAttack: false, lang: 'en', effects: 'ultra' }],
    [{ version: 5, muted: false, lastSlot: 0, autoAttack: false, lang: 'en', effects: 'full' }],
  ])('menolak %j', (raw) => { expect(readSettings(raw)).toBeNull(); });
});
