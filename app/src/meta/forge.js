// Forge & jeweller (spec §20): enhance +0…+15, reroll a bonus line, salvage
// into materials, socket / unsocket / combine gems. Pure — every action returns
// { ok: true, char, … } or { ok: false, reason } ('gold' | 'mats' | 'max' | …);
// randomness comes from the `rng` passed in.
import { ENHANCE, enhanceCost, REROLL, SALVAGE, SALVAGE_GEM, GEMS, GEM_IDS, GEM_TIERS, GEM_COMBINE, UNSOCKET_GOLD, MAT_IDS } from '../data/forge.js';
import { BONUSES, BONUS_IDS, ROLL_MIN } from '../data/items.js';
import { isEquipped } from './gear.js';
import { currentHp, finalStats } from './character.js';

const find = (char, id) => char.inventory.find((x) => x.id === id) || null;
const canPay = (char, cost) => char.gold >= (cost.gold || 0) && MAT_IDS.every((m) => char.mats[m] >= (cost[m] || 0));
function pay(c, cost) {
  c.gold -= cost.gold || 0;
  for (const m of MAT_IDS) c.mats[m] -= cost[m] || 0;
}
// HP is kept (only clamped) when max HP changes with a worn item
function keepHp(before, c) {
  const hp = currentHp(before);
  c.hp = hp >= finalStats(c).maxHp ? null : Math.round(hp);
  return c;
}

// +p → +p+1: pay, then roll the chance; from +10 a failure drops one level.
// Also returns { success, plus }.
export function enhance(char, id, now, rng = Math.random) {
  const it = find(char, id);
  if (!it) return { ok: false, reason: 'missing' };
  const p = it.plus;
  if (p >= ENHANCE.max) return { ok: false, reason: 'max' };
  const cost = enhanceCost(it, p);
  if (!canPay(char, cost)) return { ok: false, reason: char.gold < cost.gold ? 'gold' : 'mats' };
  const c = structuredClone(char);
  pay(c, cost);
  const item = find(c, id);
  const success = rng() < ENHANCE.chance[p];
  if (success) item.plus += 1;
  else if (p >= ENHANCE.dropFrom) item.plus -= 1;
  c.updatedAt = now;
  return { ok: true, char: keepHp(char, c), success, plus: item.plus };
}

export const rerollCost = (item) => ({ gold: REROLL.goldPerLevel * item.itemLevel, crystal: REROLL.crystal });

// A new random stat (not already on the item) and value for one bonus line.
export function reroll(char, id, line, now, rng = Math.random) {
  const it = find(char, id);
  if (!it || !it.bonuses[line]) return { ok: false, reason: 'missing' };
  const cost = rerollCost(it);
  if (!canPay(char, cost)) return { ok: false, reason: char.gold < cost.gold ? 'gold' : 'mats' };
  const c = structuredClone(char);
  pay(c, cost);
  const item = find(c, id);
  const taken = new Set(item.bonuses.map((b, i) => (i === line ? null : b.stat)));
  const pool = BONUS_IDS.filter((s) => !taken.has(s));
  const stat = pool[Math.floor(rng() * pool.length)];
  const b = BONUSES[stat];
  const max = b.v * (1 + b.growth * (item.itemLevel - 1));
  const k = 10 ** ({ atk: 0, maxHp: 0, moveSpd: 1, def: 1, crit: 1, cdr: 1, magnet: 0, atkSpd: 3, critDmg: 3 }[stat]);
  const value = Math.max(1 / k, Math.round(max * (ROLL_MIN + (1 - ROLL_MIN) * rng()) * k) / k);
  item.bonuses[line] = { stat, value };
  c.updatedAt = now;
  return { ok: true, char: keepHp(char, c), bonus: item.bonuses[line] };
}

// What salvaging these items gives (before the gem roll).
export function salvageYield(items) {
  const out = Object.fromEntries(MAT_IDS.map((m) => [m, 0]));
  for (const it of items) for (const [m, n] of Object.entries(SALVAGE[it.rarity])) out[m] += n;
  return out;
}

// Break unworn items into materials; Epik+ may also give a tier-1 gem.
// Also returns { mats, gems: [{ gem, tier }] }.
export function salvage(char, ids, now, rng = Math.random) {
  const set = new Set(ids);
  const items = char.inventory.filter((it) => set.has(it.id));
  if (!items.length) return { ok: false, reason: 'none' };
  if (items.some((it) => isEquipped(char, it))) return { ok: false, reason: 'equipped' };
  const c = structuredClone(char);
  const mats = salvageYield(items);
  for (const m of MAT_IDS) c.mats[m] += mats[m];
  const gems = [];
  for (const it of items) {
    for (const s of it.sockets || []) if (s) { c.gems[s.gem][s.tier - 1] += 1; gems.push(s); } // socketed gems come back
    if (it.rarity >= SALVAGE_GEM.fromRarity && rng() < SALVAGE_GEM.chance) {
      const gem = GEM_IDS[Math.floor(rng() * GEM_IDS.length)];
      c.gems[gem][0] += 1;
      gems.push({ gem, tier: 1 });
    }
  }
  c.inventory = c.inventory.filter((it) => !set.has(it.id));
  c.updatedAt = now;
  return { ok: true, char: c, mats, gems };
}

// Put a gem from the bag into an empty socket.
export function socketGem(char, id, slot, gem, tier, now) {
  const it = find(char, id);
  if (!it || slot < 0 || slot >= it.sockets.length || it.sockets[slot]) return { ok: false, reason: 'socket' };
  if (!GEMS[gem] || !(char.gems[gem][tier - 1] > 0)) return { ok: false, reason: 'gem' };
  const c = structuredClone(char);
  c.gems[gem][tier - 1] -= 1;
  find(c, id).sockets[slot] = { gem, tier };
  c.updatedAt = now;
  return { ok: true, char: keepHp(char, c) };
}

// Take a gem out (it goes back to the bag) for a fee.
export function unsocket(char, id, slot, now) {
  const it = find(char, id);
  const s = it?.sockets[slot];
  if (!s) return { ok: false, reason: 'socket' };
  if (char.gold < UNSOCKET_GOLD) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= UNSOCKET_GOLD;
  c.gems[s.gem][s.tier - 1] += 1;
  find(c, id).sockets[slot] = null;
  c.updatedAt = now;
  return { ok: true, char: keepHp(char, c) };
}

export const combineCost = (tier) => GEM_COMBINE.goldPerTier * tier;

// 3 gems of a tier → 1 of the next tier.
export function combineGems(char, gem, tier, now) {
  if (!GEMS[gem] || tier < 1 || tier >= GEM_TIERS) return { ok: false, reason: 'max' };
  if (char.gems[gem][tier - 1] < GEM_COMBINE.count) return { ok: false, reason: 'gem' };
  if (char.gold < combineCost(tier)) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= combineCost(tier);
  c.gems[gem][tier - 1] -= GEM_COMBINE.count;
  c.gems[gem][tier] += 1;
  c.updatedAt = now;
  return { ok: true, char: c };
}
