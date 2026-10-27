// Open world on the save (spec §25.1): fog of war per region (one bit per
// FIELD.fogCell square, stored as base64), progress written from a region,
// and the light penalty for falling there. Pure.
import { FIELD, regionById } from '../data/world.js';
import { INVENTORY_MAX } from '../data/balance.js';
import { DEATH } from '../data/dungeon.js';
import { addExp, allocate, finalStats } from './character.js';
import { addKills, discover } from './collection.js';
import { advanceBounties, isDone } from './bounties.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function fogSize(region) {
  const cols = Math.ceil(region.w / FIELD.fogCell), rows = Math.ceil(region.h / FIELD.fogCell);
  return { cols, rows, bytes: Math.ceil((cols * rows) / 8) };
}

export function encodeFog(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return s;
}

// base64 → bytes of the region's size (a bad or short string reads as unexplored)
export function decodeFog(str, region) {
  const out = new Uint8Array(fogSize(region).bytes);
  if (typeof str !== 'string') return out;
  const clean = str.replace(/=+$/, '');
  let bits = 0, acc = 0, o = 0;
  for (const ch of clean) {
    const v = B64.indexOf(ch);
    if (v < 0) return new Uint8Array(out.length);
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; if (o < out.length) out[o++] = (acc >> bits) & 255; }
  }
  return out;
}

export const isFogValid = (str, region) => typeof str === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length <= Math.ceil(fogSize(region).bytes / 3) * 4;

export function fogAt(bytes, cols, cx, cy) {
  const i = cy * cols + cx;
  return (bytes[i >> 3] >> (i & 7)) & 1;
}

// Uncovers every cell within `radius` of (x, y); true when something new showed.
export function revealFog(bytes, region, x, y, radius = FIELD.fogRadius) {
  const { cols, rows } = fogSize(region), c = FIELD.fogCell;
  let changed = false;
  for (let cy = Math.max(0, Math.floor((y - radius) / c)); cy <= Math.min(rows - 1, Math.floor((y + radius) / c)); cy++) {
    for (let cx = Math.max(0, Math.floor((x - radius) / c)); cx <= Math.min(cols - 1, Math.floor((x + radius) / c)); cx++) {
      if (((cx + 0.5) * c - x) ** 2 + ((cy + 0.5) * c - y) ** 2 > radius * radius) continue;
      const i = cy * cols + cx;
      if (!((bytes[i >> 3] >> (i & 7)) & 1)) { bytes[i >> 3] |= 1 << (i & 7); changed = true; }
    }
  }
  return changed;
}

export const explored = (bytes, region) => {
  const { cols, rows } = fogSize(region);
  let n = 0;
  for (let i = 0; i < cols * rows; i++) n += (bytes[i >> 3] >> (i & 7)) & 1;
  return n / (cols * rows);
};

function storeHp(c, hp) {
  const max = finalStats(c).maxHp;
  c.hp = hp >= max ? null : Math.max(1, Math.round(hp));
}

// Writes what was earned in a region since the last save.
// part: { region, fog, exp, gold, kills, killsBy, elites, items, mats, gems, hp, potions, attrs }
// → { char, levelsGained, itemsLeft, uniquesFound, bountiesDone }
export function applyField(char, part, now) {
  const leveled = addExp(char, part.exp || 0);
  const c = (part.attrs && allocate(leveled.char, part.attrs, now)) || leveled.char;
  c.gold += part.gold || 0;
  c.potions = { ...part.potions };
  storeHp(c, part.hp);
  c.records.kills += part.kills || 0;
  addKills(c, part.killsBy);
  const uniquesFound = discover(c, part.items);
  const before = c.bounties.filter(isDone).length;
  c.bounties = advanceBounties(c.bounties, { killsBy: part.killsBy, elites: part.elites, gold: part.gold, dungeon: part.region });
  const bountiesDone = c.bounties.filter(isDone).length - before;
  const itemsLeft = [];
  const ids = new Set(c.inventory.map((it) => it.id));
  for (const item of part.items || []) {
    if (c.inventory.length >= INVENTORY_MAX) { itemsLeft.push(item); continue; }
    const it = structuredClone(item);
    while (ids.has(it.id)) it.id += 'x';
    ids.add(it.id);
    c.inventory.push(it);
  }
  for (const [m, n] of Object.entries(part.mats || {})) c.mats[m] += n;
  for (const gm of part.gems || []) c.gems[gm.gem][gm.tier - 1] += 1;
  if (part.region && regionById(part.region)) c.regions = { ...c.regions, [part.region]: { fog: part.fog ?? c.regions[part.region]?.fog ?? '' } };
  c.updatedAt = now;
  return { char: c, levelsGained: leveled.levelsGained, itemsLeft, uniquesFound, bountiesDone };
}

// Falling in a region: wake in the last town with a little HP, minus a tenth of the coins.
export function fieldDeath(char, now) {
  const c = structuredClone(char);
  const lost = Math.floor(c.gold * FIELD.deathGoldLoss);
  c.gold -= lost;
  storeHp(c, Math.max(1, finalStats(c).maxHp * DEATH.wakeHp));
  c.updatedAt = now;
  return { char: c, goldLost: lost };
}

export function visitTown(char, townId, now) {
  if (char.location === townId && char.towns.includes(townId)) return char;
  const c = structuredClone(char);
  c.location = townId;
  if (!c.towns.includes(townId)) c.towns.push(townId);
  c.updatedAt = now;
  return c;
}
