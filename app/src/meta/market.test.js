import { describe, it, expect } from 'vitest';
import { displayStock, nightStock, matsStock, buyDisplay, buyNight, buyMats, marketDay, isNight } from './market.js';
import { createCharacter } from './character.js';
import { validateSlot } from './schema.js';
import { DISPLAY, DISPLAY_SHOPS, MAT_STOCK } from '../data/market.js';
import { SELL_PRICE, LEGENDARY } from '../data/items.js';
import { INVENTORY_MAX } from '../data/balance.js';
import { DAY } from '../data/time.js';

const at = (day, hour) => (day - 1) * DAY + hour * 60;
const make = (over = {}) => ({ ...createCharacter({ slot: 0, name: 'Rey', look: { hair: 0, hairColor: 0 }, classId: 'mage' }, 1000), gold: 1e7, level: 12, clock: at(3, 10), ...over });

describe('hari pasar', () => {
  it('stok berganti pukul 05:00; malam setelah 00:00 masih hari sebelumnya', () => {
    expect(marketDay(at(3, 10))).toBe(marketDay(at(4, 2)));
    expect(marketDay(at(4, 6))).toBe(marketDay(at(3, 10)) + 1);
  });
  it('pedagang malam buka 18:00–05:00', () => {
    expect(isNight(at(2, 19))).toBe(true);
    expect(isNight(at(2, 3))).toBe(true);
    expect(isNight(at(2, 12))).toBe(false);
  });
});

describe('etalase gear', () => {
  it('stok tetap sepanjang hari, berganti esok pagi, dan berbeda tiap toko & kota', () => {
    const c = make();
    const a = displayStock(c, 'rimba', 'weapons').map((e) => e.item);
    expect(displayStock({ ...c, clock: at(3, 16) }, 'rimba', 'weapons').map((e) => e.item)).toEqual(a);
    expect(displayStock({ ...c, clock: at(4, 8) }, 'rimba', 'weapons').map((e) => e.item)).not.toEqual(a);
    expect(displayStock(c, 'beku', 'weapons').map((e) => e.item)).not.toEqual(a);
  });

  it('isi sesuai toko: senjata untuk kelas sendiri, zirah, perhiasan', () => {
    const c = make();
    for (const [shop, slots] of Object.entries(DISPLAY_SHOPS)) {
      for (const e of displayStock(c, 'pasir', shop)) {
        expect(slots).toContain(e.item.slot);
        if (e.item.slot === 'weapon') expect(e.item.classId).toBe('mage');
      }
    }
  });

  it('kota sulit: lebih banyak barang, rarity lebih tinggi, lebih mahal', () => {
    const avg = (town) => {
      let r = 0, n = 0, p = 0;
      for (let d = 1; d <= 40; d++) for (const e of displayStock(make({ clock: at(d, 10), level: 30 }), town, 'armor')) { r += e.item.rarity; p += e.price / SELL_PRICE(e.item); n++; }
      return { rarity: r / n, markup: p / n, count: n / 40 };
    };
    const lo = avg('rimba'), hi = avg('bara');
    expect(hi.count).toBeGreaterThan(lo.count);
    expect(hi.rarity).toBeGreaterThan(lo.rarity + 1);
    expect(hi.markup).toBeGreaterThan(lo.markup);
  });

  it('Legendaris/Mitos selalu item unik yang cocok slot & kelas', () => {
    for (let d = 1; d <= 60; d++) {
      for (const shop of Object.keys(DISPLAY_SHOPS)) for (const e of displayStock(make({ clock: at(d, 10), level: 40 }), 'bara', shop)) {
        if (e.item.rarity >= LEGENDARY) expect(e.item.unique).toBeTruthy();
      }
    }
  });

  it('Kota Awal tidak punya etalase', () => {
    expect(displayStock(make(), 'home', 'weapons')).toEqual([]);
    expect(DISPLAY[0]).toBe(null);
  });

  it('membeli: koin berkurang, item masuk tas, tandai terjual hari itu saja', () => {
    const c = make();
    const e = displayStock(c, 'rimba', 'armor')[1];
    const r = buyDisplay(c, 'rimba', 'armor', '1', 5);
    expect(r.ok).toBe(true);
    expect(r.char.gold).toBe(c.gold - e.price);
    expect(r.char.inventory.at(-1)).toEqual(e.item);
    expect(validateSlot(r.char)).toEqual([]);
    expect(displayStock(r.char, 'rimba', 'armor')[1].sold).toBe(true);
    expect(buyDisplay(r.char, 'rimba', 'armor', '1', 6)).toEqual({ ok: false, reason: 'missing' });
    expect(displayStock({ ...r.char, clock: at(4, 9) }, 'rimba', 'armor').every((x) => !x.sold)).toBe(true);
  });

  it('menolak bila koin kurang atau tas penuh', () => {
    expect(buyDisplay(make({ gold: 0 }), 'rimba', 'armor', '0', 1)).toEqual({ ok: false, reason: 'gold' });
    const full = make();
    full.inventory = Array.from({ length: INVENTORY_MAX }, (_, i) => ({ ...displayStock(full, 'rimba', 'armor')[0].item, id: `f${i}` }));
    expect(buyDisplay(full, 'rimba', 'armor', '0', 1)).toEqual({ ok: false, reason: 'bag' });
  });
});

describe('pedagang malam', () => {
  it('hanya buka malam; jual gear langka dan permata', () => {
    const day = make({ clock: at(3, 12) }), night = make({ clock: at(3, 22) });
    const s = nightStock(night, 'beku');
    expect(s.items.length).toBeGreaterThan(0);
    expect(s.items.every((e) => e.item.rarity >= 2)).toBe(true);
    expect(s.gems.length).toBeGreaterThan(0);
    expect(buyNight(day, 'beku', 'i0', 1)).toEqual({ ok: false, reason: 'closed' });
    const r = buyNight(night, 'beku', 'g0', 1);
    expect(r.ok).toBe(true);
    expect(r.char.gems[r.gem.gem][r.gem.tier - 1]).toBe(night.gems[r.gem.gem][r.gem.tier - 1] + 1);
    expect(buyNight(r.char, 'beku', 'g0', 2)).toEqual({ ok: false, reason: 'missing' });
    expect(buyNight(night, 'beku', 'i0', 1).ok).toBe(true);
  });
});

describe('pedagang bahan & permata', () => {
  it('stok harian terbatas, makin banyak di kota sulit', () => {
    expect(MAT_STOCK[4].crystal).toBeGreaterThan(MAT_STOCK[1].crystal);
    const c = make();
    const dust = matsStock(c, 'rimba').find((e) => e.key === 'dust');
    const r = buyMats(c, 'rimba', 'dust', 1000, 1);
    expect(r.count).toBe(dust.left);
    expect(r.char.mats.dust).toBe(c.mats.dust + dust.left);
    expect(r.char.gold).toBe(c.gold - dust.price * dust.left);
    expect(buyMats(r.char, 'rimba', 'dust', 1, 2)).toEqual({ ok: false, reason: 'soldout' });
    expect(validateSlot(r.char)).toEqual([]);
  });

  it('permata dan harga lebih tinggi di kota sulit', () => {
    const c = make();
    const lo = matsStock(c, 'rimba'), hi = matsStock(c, 'bara');
    expect(Math.max(...hi.filter((e) => e.kind === 'gem').map((e) => e.tier))).toBeGreaterThan(Math.max(...lo.filter((e) => e.kind === 'gem').map((e) => e.tier)));
    expect(hi.find((e) => e.key === 'dust').price).toBeGreaterThan(lo.find((e) => e.key === 'dust').price);
    const g = lo.find((e) => e.kind === 'gem');
    const r = buyMats(c, 'rimba', g.key, 1, 1);
    expect(r.char.gems[g.id][g.tier - 1]).toBe(c.gems[g.id][g.tier - 1] + 1);
    expect(buyMats(make({ gold: 0 }), 'rimba', g.key, 1, 1)).toEqual({ ok: false, reason: 'gold' });
  });
});
