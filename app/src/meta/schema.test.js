import { describe, it, expect } from 'vitest';
import { SAVE_VERSION, SETTINGS_VERSION, migrate, validateSlot, readSlot, readSettings } from './schema.js';
import { createCharacter } from './character.js';

const fresh = () => createCharacter(
  { slot: 1, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'mage' }, 1761436800000,
);
const item = (over = {}) => ({
  id: 'it_a1', slot: 'helm', classId: null, variant: 0, rarity: 1, itemLevel: 3,
  base: { maxHp: 20 }, bonuses: [{ stat: 'crit', value: 2 }], ...over,
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
    ['potion melebihi batas', (c) => { c.potions = 6; }],
    ['rekor lantai hilang', (c) => { delete c.records.bestFloor; }],
    ['rekor bukan angka', (c) => { c.records.kills = 'banyak'; }],
    ['inventori > 30', (c) => { c.inventory = Array.from({ length: 31 }, (_, i) => item({ id: `it_${i}` })); }],
    ['id item ganda', (c) => { c.inventory = [item(), item()]; }],
    ['rarity tak dikenal', (c) => { c.inventory = [item({ rarity: 4 })]; }],
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
    expect(validateSlot({ ...fresh(), hp: 37, potions: 5 })).toEqual([]);
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
    expect(r.data.version).toBe(2);
    expect(r.data.hp).toBeNull();
    expect(r.data.potions).toBe(0);
    expect(r.data.upgrades).toEqual({ hp: 2, atk: 1, magnet: 0 });
    expect(r.data.records).toEqual({ bestFloor: 0, clears: 0, trips: 7, kills: 400, bossKills: 2 });
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
    const s = { version: SETTINGS_VERSION, muted: true, lastSlot: 2, autoAttack: true };
    expect(readSettings(s)).toEqual(s);
  });
  it('memigrasi versi 1 (tanpa autoAttack) ke versi 2', () => {
    expect(readSettings({ version: 1, muted: true, lastSlot: 1 }))
      .toEqual({ version: 2, muted: true, lastSlot: 1, autoAttack: false });
  });
  it.each([
    [null],
    [{ version: 1, muted: 'ya', lastSlot: 0 }],
    [{ version: 2, muted: false, lastSlot: 3, autoAttack: false }],
    [{ version: 2, muted: false, lastSlot: 0, autoAttack: 'ya' }],
    [{ version: 3, muted: false, lastSlot: 0, autoAttack: false }],
  ])('menolak %j', (raw) => { expect(readSettings(raw)).toBeNull(); });
});
