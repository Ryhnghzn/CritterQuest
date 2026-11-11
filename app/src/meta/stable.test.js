import { describe, it, expect } from 'vitest';
import { freshMounts, grantMount, activeMountSetup, setActiveMount, buyMount, buySkin, mountFx, mountStatMul } from './stable.js';
import { MOUNT_DEFS, SKIN_PRICE } from '../data/mounts.js';
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
