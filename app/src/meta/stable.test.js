import { describe, it, expect } from 'vitest';
import { freshMounts, grantMount, activeMountSetup, setActiveMount, buyMount, buySkin, mountFx, mountStatMul, storyMounts, rollMountDrops, mountGains } from './stable.js';
import { MOUNT_DEFS, SKIN_PRICE, MOUNT_DROP } from '../data/mounts.js';
import { SIDE } from '../data/quests.js';
const char = (extra = {}) => ({ gold: 0, mounts: freshMounts(), updatedAt: 0, ...extra });
const seq = (...v) => () => v.shift() ?? 0;

describe('kandang (§35.2)', () => {
  it('mount pertama yang didapat jadi aktif, warna pertama', () => {
    const c = char();
    expect(grantMount(c, 'horse')).toBe('new');
    expect(c.mounts.owned.horse).toEqual([0]);
    expect(c.mounts.active).toBe('horse');
    expect(activeMountSetup(c)).toEqual({ id: 'horse', rarity: 0, fly: false, skin: 0 });
  });
  it('dapat lagi: warna baru yang belum dimiliki; semua warna ada → null', () => {
    const c = char(); grantMount(c, 'horse');
    expect(grantMount(c, 'horse', seq(0))).toBe('skin');
    expect(c.mounts.owned.horse.length).toBe(2);
    grantMount(c, 'horse', seq(0));
    expect(grantMount(c, 'horse', seq(0))).toBe(null);
  });
  it('mount kedua tidak menggeser yang aktif', () => {
    const c = char(); grantMount(c, 'horse'); grantMount(c, 'dragon');
    expect(c.mounts.active).toBe('horse');
  });
  it('beli di Kandang: hanya yang source stable, cukup emas, belum punya', () => {
    const price = MOUNT_DEFS.snowwolf.price;
    expect(buyMount(char({ gold: price - 1 }), 'snowwolf', 1).reason).toBe('gold');
    expect(buyMount(char({ gold: 99999 }), 'dragon', 1).reason).toBe('none');
    const r = buyMount(char({ gold: price }), 'snowwolf', 1);
    expect(r.ok).toBe(true); expect(r.char.gold).toBe(0); expect(r.char.mounts.owned.snowwolf).toEqual([0]);
    expect(buyMount(r.char, 'snowwolf', 2).reason).toBe('owned');
    const src = char({ gold: price });
    const r2 = buyMount(src, 'snowwolf', 7);
    expect(src.gold).toBe(price); expect(src.mounts.owned).toEqual({}); expect(r2.char.updatedAt).toBe(7);
  });
  it('beli warna: punya mountnya, belum punya warnanya', () => {
    const c = char({ gold: SKIN_PRICE }); grantMount(c, 'horse');
    const r = buySkin(c, 'horse', 2, 1);
    expect(r.ok).toBe(true); expect(r.char.mounts.owned.horse).toEqual([0, 2]); expect(r.char.gold).toBe(0);
    expect(buySkin(r.char, 'horse', 2, 1).reason).toBe('owned');
    expect(buySkin(char({ gold: 9999 }), 'horse', 1, 1).reason).toBe('none');
  });
  it('pilih aktif: hanya mount & warna yang dimiliki', () => {
    const c = char(); grantMount(c, 'horse'); grantMount(c, 'dragon');
    expect(setActiveMount(c, 'dragon', 0, 1).char.mounts.active).toBe('dragon');
    expect(setActiveMount(c, 'dragon', 3, 1).ok).toBe(false);
    expect(setActiveMount(c, 'lion', 0, 1).ok).toBe(false);
  });
  it('bonus hanya dari mount aktif; stat dipisah dari efek perjalanan', () => {
    const c = char(); expect(mountFx(c)).toEqual({}); expect(mountStatMul(c)).toEqual({});
    grantMount(c, 'skywhale');
    expect(mountFx(c)).toEqual({ matfind: 0.05 });
    expect(mountStatMul(c)).toEqual({ magnet: 1.1 });
  });
});

const q = (done, ending = null) => char({ quests: { done }, records: { ending } });

describe('mount dari cerita (§35.2)', () => {
  it('bab 1 → Kuda; Bintang Jatuh → Griffin; tamat → Naga; idempoten', () => {
    const c = q(['ch1', 's_salju'], 123);
    expect(storyMounts(c).sort()).toEqual(['dragon', 'griffin', 'horse']);
    expect(storyMounts(c)).toEqual([]);
  });
  it('semua quest sampingan → Paus Langit', () => {
    expect(storyMounts(q(SIDE.map((s) => s.id).slice(1)))).not.toContain('skywhale');
    expect(storyMounts(q(SIDE.map((s) => s.id)))).toContain('skywhale');
  });
});
describe('jatuhan bos dengan jaminan', () => {
  it('peluang base + step × gagal; gagal menambah hitungan', () => {
    const c = char();
    expect(rollMountDrops(c, { any: 1, eclipse: 0 }, () => 0.99)).toEqual([]);
    expect(c.mounts.pity.tiger).toBe(1);
    expect(rollMountDrops(c, { any: 1, eclipse: 0 }, () => MOUNT_DROP.base + MOUNT_DROP.step - 0.001)).toEqual(['tiger']);
    expect(c.mounts.pity.tiger).toBe(0);
  });
  it('dijamin pada bos ke-guarantee', () => {
    const c = char();
    const got = rollMountDrops(c, { any: MOUNT_DROP.guarantee, eclipse: 0 }, () => 0.999);
    expect(got).toEqual(['tiger']);
  });
  it('Tanah Gerhana menggulir Pegasus dan Harimau; tempat lain hanya Harimau', () => {
    const c = char();
    expect(rollMountDrops(c, { any: 0, eclipse: 1 }, () => 0)).toEqual(['tiger', 'pegasus']);
    const d = char();
    rollMountDrops(d, { any: 1, eclipse: 0 }, () => 0.99);
    expect(d.mounts.pity.pegasus).toBe(0);
  });
  it('semua warna sudah ada: tidak dicatat, hitungan jaminan tetap diulang', () => {
    const c = char(); c.mounts.pity.tiger = 5;
    for (let i = 0; i < 3; i++) grantMount(c, 'tiger', () => 0);
    expect(rollMountDrops(c, { any: 1, eclipse: 0 }, () => 0)).toEqual([]);
    expect(c.mounts.pity.tiger).toBe(0);
  });
  it('mount yang sudah dimiliki → warna baru dicatat', () => {
    const c = char(); grantMount(c, 'tiger');
    expect(rollMountDrops(c, { any: 1, eclipse: 0 }, () => 0)).toEqual(['tiger']);
    expect(c.mounts.owned.tiger.length).toBe(2);
  });
});

describe('kabar mount baru', () => {
  it('mount baru vs warna baru', () => {
    const before = char(); grantMount(before, 'horse');
    const after = structuredClone(before);
    grantMount(after, 'tiger'); grantMount(after, 'horse', () => 0);
    expect(mountGains(before, after, ['tiger', 'horse', 'tiger'])).toEqual([
      { id: 'tiger', isNew: true, skins: [0] },
      { id: 'horse', isNew: false, skins: [1] },
    ]);
  });
});
