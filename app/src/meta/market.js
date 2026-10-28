// Big-town merchants (spec §25.2). Pure: stock is rolled from (world seed, town,
// shop, market day); char.shops[`${town}:${shop}`] = { day, sold: { key: n } }
// remembers what was bought that day. Buying returns { ok, char, … } | { ok: false, reason }.
import { TOWNS } from '../data/world.js';
import { DISPLAY_SHOPS, DISPLAY, DISPLAY_AHEAD, NIGHT, NIGHT_HOURS, MARKET_DAY_START, MAT_PRICE, MAT_STOCK, GEM_PRICE, GEM_SHOP, PRICE_TIER_UP } from '../data/market.js';
import { SLOTS, SELL_PRICE, UNIQUES, LEGENDARY } from '../data/items.js';
import { GEM_IDS } from '../data/forge.js';
import { INVENTORY_MAX, CHAR_LEVEL_MAX } from '../data/balance.js';
import { DAY } from '../data/time.js';
import { makeItem } from './itemgen.js';
import { discover } from './collection.js';
import { mulberry } from '../run/fieldmap.js';
import { minuteOfDay } from './clock.js';

const hash = (s) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
const tierOf = (townId) => TOWNS[townId]?.tier ?? 0;

// the market day: stock changes at 05:00, so the night after 00:00 still belongs to the evening before
export const marketDay = (clock) => Math.floor((clock - MARKET_DAY_START) / DAY);
export function isNight(clock) {
  const h = minuteOfDay(clock) / 60;
  return h >= NIGHT_HOURS[0] || h < NIGHT_HOURS[1];
}

const rngFor = (char, townId, shop, day) => mulberry((char.world.seed ^ hash(`${townId}:${shop}:${day}`)) >>> 0);
const sold = (char, townId, shop, day) => {
  const s = char.shops?.[`${townId}:${shop}`];
  return s && s.day === day ? s.sold : {};
};

function pickRarity(weights, rng) {
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let r = 0; r < weights.length; r++) { roll -= weights[r]; if (roll < 0 && weights[r] > 0) return r; }
  return weights.findLastIndex((w) => w > 0);
}

// One piece for sale: slot from the list; Legendary / Mythic become a unique that
// fits slot and class, or drop to Epic when none does.
function stockItem(slots, weights, itemLevel, classId, rng, idTag) {
  const slot = slots[Math.floor(rng() * slots.length)];
  let rarity = Math.max(pickRarity(weights, rng), SLOTS[slot].minRarity || 0);
  let unique = null;
  if (rarity >= LEGENDARY) {
    const fits = UNIQUES.filter((u) => u.rarity === rarity && u.slot === slot && (u.classId === null || u.classId === classId));
    if (fits.length) unique = fits[Math.floor(rng() * fits.length)].id;
    else rarity = LEGENDARY - 1;
  }
  const item = makeItem({ slot, classId, rarity, itemLevel, unique }, rng);
  item.id = `it_${idTag}`;
  return item;
}

const levelFor = (char, range, rng) => Math.min(CHAR_LEVEL_MAX, Math.max(range[0], Math.min(range[1], char.level)) + Math.floor(rng() * (DISPLAY_AHEAD + 1)));

// Gear on a display today: [{ key, item, price, sold }]. Empty for towns without displays.
export function displayStock(char, townId, shop) {
  const row = DISPLAY[tierOf(townId)];
  if (!row || !DISPLAY_SHOPS[shop]) return [];
  const day = marketDay(char.clock), rng = rngFor(char, townId, shop, day), gone = sold(char, townId, shop, day);
  return Array.from({ length: row.count[shop] }, (_, i) => {
    const item = stockItem(DISPLAY_SHOPS[shop], row.weights, levelFor(char, row.levels, rng), char.classId, rng, `${townId}${shop}${day}n${i}`);
    return { key: String(i), item, price: Math.round(SELL_PRICE(item) * row.markup), sold: !!gone[i] };
  });
}

// The night merchant's wares tonight: gear of any slot and a few gems.
export function nightStock(char, townId) {
  const row = NIGHT[tierOf(townId)];
  if (!row) return { items: [], gems: [] };
  const day = marketDay(char.clock), rng = rngFor(char, townId, 'night', day), gone = sold(char, townId, 'night', day);
  const lv = DISPLAY[tierOf(townId)].levels;
  const items = Array.from({ length: row.items }, (_, i) => {
    const item = stockItem(Object.keys(SLOTS), row.weights, levelFor(char, lv, rng), char.classId, rng, `${townId}night${day}n${i}`);
    return { key: `i${i}`, item, price: Math.round(SELL_PRICE(item) * row.markup), sold: !!gone[`i${i}`] };
  });
  const gems = Array.from({ length: row.gems }, (_, i) => {
    const gem = GEM_IDS[Math.floor(rng() * GEM_IDS.length)];
    const tier = row.gemTier[0] + Math.floor(rng() * (row.gemTier[1] - row.gemTier[0] + 1));
    return { key: `g${i}`, gem, tier, price: Math.round(GEM_PRICE[tier - 1] * 1.5), sold: !!gone[`g${i}`] };
  });
  return { items, gems };
}

// Materials & gems trader: [{ key, kind: 'mat' | 'gem', id, tier?, price, left }]
export function matsStock(char, townId) {
  const t = tierOf(townId);
  if (!MAT_STOCK[t]) return [];
  const gone = sold(char, townId, 'mats', marketDay(char.clock)), up = 1 + PRICE_TIER_UP * (t - 1);
  const out = Object.entries(MAT_STOCK[t]).map(([id, n]) => ({ key: id, kind: 'mat', id, price: Math.round(MAT_PRICE[id] * up), left: n - (gone[id] || 0) }));
  for (const tier of GEM_SHOP[t].tiers) for (const gem of GEM_IDS) {
    const key = `${gem}${tier}`;
    out.push({ key, kind: 'gem', id: gem, tier, price: Math.round(GEM_PRICE[tier - 1] * up), left: GEM_SHOP[t].each - (gone[key] || 0) });
  }
  return out;
}

function markSold(c, townId, shop, key, n) {
  const day = marketDay(c.clock), k = `${townId}:${shop}`;
  const prev = c.shops[k]?.day === day ? c.shops[k].sold : {};
  c.shops = { ...c.shops, [k]: { day, sold: { ...prev, [key]: (prev[key] || 0) + n } } };
}

function takeItem(char, townId, shop, entry, now) {
  if (!entry || entry.sold) return { ok: false, reason: 'missing' };
  if (char.inventory.length >= INVENTORY_MAX) return { ok: false, reason: 'bag' };
  if (char.gold < entry.price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  const item = structuredClone(entry.item);
  while (c.inventory.some((x) => x.id === item.id)) item.id += 'x';
  c.gold -= entry.price;
  c.inventory.push(item);
  discover(c, [item]);
  markSold(c, townId, shop, entry.key, 1);
  c.updatedAt = now;
  return { ok: true, char: c, item };
}

export function buyDisplay(char, townId, shop, key, now) {
  return takeItem(char, townId, shop, displayStock(char, townId, shop).find((e) => e.key === key), now);
}

export function buyNight(char, townId, key, now) {
  if (!isNight(char.clock)) return { ok: false, reason: 'closed' };
  const s = nightStock(char, townId);
  if (key.startsWith('i')) return takeItem(char, townId, 'night', s.items.find((e) => e.key === key), now);
  const g = s.gems.find((e) => e.key === key);
  if (!g || g.sold) return { ok: false, reason: 'missing' };
  if (char.gold < g.price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= g.price;
  c.gems[g.gem][g.tier - 1] += 1;
  markSold(c, townId, 'night', key, 1);
  c.updatedAt = now;
  return { ok: true, char: c, gem: g };
}

// Buy n of one material / gem from the trader (n is cut to what is left).
export function buyMats(char, townId, key, n, now) {
  const e = matsStock(char, townId).find((x) => x.key === key);
  if (!e) return { ok: false, reason: 'missing' };
  const count = Math.min(n, e.left);
  if (count <= 0) return { ok: false, reason: 'soldout' };
  if (char.gold < e.price * count) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= e.price * count;
  if (e.kind === 'mat') c.mats[e.id] += count;
  else c.gems[e.id][e.tier - 1] += count;
  markSold(c, townId, 'mats', key, count);
  c.updatedAt = now;
  return { ok: true, char: c, count, entry: e };
}

