// Bounty board & Lencana shop (spec §24). Pure: randomness comes from `rng`
// and every function returns new objects.
import { BOUNTY_KINDS, KILL_WEIGHT, BOUNTY_REWARD, BOUNTY_REROLL, MARK_SHOP } from '../data/bounties.js';
import { DUNGEONS } from '../data/dungeons.js';
import { SLOT_IDS } from '../data/items.js';
import { GEM_IDS } from '../data/forge.js';
import { INVENTORY_MAX } from '../data/balance.js';
import { makeItem } from './itemgen.js';
import { addExp } from './character.js';
import { grantMount } from './stable.js';

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const between = ([a, b], rng) => a + Math.floor(rng() * (b - a + 1));

// dungeons open to the character: each one after a cleared one (as meta/character.js)
function openDungeons(char) {
  const out = [];
  for (const d of DUNGEONS) { out.push(d); if (!char.records.dungeons[d.id].clears) break; }
  return out;
}

// every regular enemy type that walks in through the waves of open dungeons
function openEnemies(char) {
  const s = new Set();
  for (const d of openDungeons(char)) for (const f of d.floors) for (const w of f.waves) for (const id of Object.keys(w.mix)) if (KILL_WEIGHT[id]) s.add(id);
  return [...s];
}

const same = (a, b) => a.kind === b.kind && a.target === b.target;

// A new bounty unlike the ones in `others`.
export function rollBounty(char, rng, others = []) {
  const kinds = Object.entries(BOUNTY_KINDS);
  for (let tries = 0; tries < 20; tries++) {
    let roll = rng() * kinds.reduce((n, [, k]) => n + k.weight, 0);
    const [kind, def] = kinds.find(([, k]) => (roll -= k.weight) < 0) || kinds[0];
    let target = null, need = between(def.need, rng);
    if (kind === 'kill') { target = pick(openEnemies(char), rng); need = Math.max(5, Math.round(need / KILL_WEIGHT[target])); }
    if (kind === 'boss' || kind === 'floors') target = pick(openDungeons(char), rng).id;
    if (kind === 'gold') need = Math.round(need * (1 + 0.05 * (char.level - 1)) / 10) * 10;
    const b = { kind, target, need, have: 0, taken: false };
    if (!others.some((o) => same(o, b))) return b;
  }
  return { kind: 'elite', target: null, need: between(BOUNTY_KINDS.elite.need, rng), have: 0, taken: false };
}

export function bountyReward(char, b) {
  const r = BOUNTY_REWARD, lv = char.level;
  return {
    gold: r.gold.base + r.gold.perLevel * lv,
    exp: r.exp.base + r.exp.perLevel * lv,
    dust: Math.round(r.dust.base + r.dust.perLevel * lv),
    marks: r.marks[b.kind],
  };
}

// trip: { killsBy, elites, bossKills, dungeon, floorsCleared, gold }
export function progressOf(b, trip) {
  switch (b.kind) {
    case 'kill': return trip.killsBy?.[b.target] || 0;
    case 'elite': return trip.elites || 0;
    case 'boss': return trip.dungeon === b.target ? trip.bossKills || 0 : 0;
    case 'floors': return trip.dungeon === b.target ? trip.floorsCleared || 0 : 0;
    case 'gold': return trip.gold || 0;
    default: return 0;
  }
}

export const isDone = (b) => b.have >= b.need;

// only tasks taken from the board move on
export function advanceBounties(bounties, trip) {
  return bounties.map((b) => (b.taken ? { ...b, have: Math.min(b.need, b.have + progressOf(b, trip)) } : b));
}

// Take a task from the board → { ok, char } | { ok: false, reason: 'none' | 'taken' }
export function takeBounty(char, i, now) {
  const b = char.bounties[i];
  if (!b) return { ok: false, reason: 'none' };
  if (b.taken) return { ok: false, reason: 'taken' };
  const c = structuredClone(char);
  c.bounties[i].taken = true;
  c.updatedAt = now;
  return { ok: true, char: c };
}

// Put a task back (its progress is lost) → { ok, char } | { ok: false, reason: 'none' | 'nottaken' }
export function dropBounty(char, i, now) {
  const b = char.bounties[i];
  if (!b) return { ok: false, reason: 'none' };
  if (!b.taken) return { ok: false, reason: 'nottaken' };
  const c = structuredClone(char);
  c.bounties[i] = { ...b, taken: false, have: 0 };
  c.updatedAt = now;
  return { ok: true, char: c };
}

// Claim a finished bounty: rewards in, a fresh bounty in its place.
// → { ok, char, reward, levelsGained } | { ok: false, reason: 'notdone' }
export function claimBounty(char, i, rng, now) {
  const b = char.bounties[i];
  if (!b || !isDone(b)) return { ok: false, reason: 'notdone' };
  const reward = bountyReward(char, b);
  const { char: c, levelsGained } = addExp(char, reward.exp);
  c.gold += reward.gold;
  c.mats.dust += reward.dust;
  c.marks += reward.marks;
  c.bounties[i] = rollBounty(c, rng, c.bounties.filter((_, j) => j !== i));
  c.updatedAt = now;
  return { ok: true, char: c, reward, levelsGained };
}

export const rerollPrice = (char) => BOUNTY_REROLL.perLevel * char.level;

export function rerollBounty(char, i, rng, now) {
  if (!char.bounties[i]) return { ok: false, reason: 'none' };
  if (char.bounties[i].taken) return { ok: false, reason: 'taken' };
  const price = rerollPrice(char);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= price;
  c.bounties[i] = rollBounty(c, rng, c.bounties);
  c.updatedAt = now;
  return { ok: true, char: c };
}

// Lencana shop → { ok, char, item?, gem? } | { ok: false, reason: 'marks' | 'bag' | 'none' }
export function buyWithMarks(char, id, rng, now) {
  const offer = MARK_SHOP.find((o) => o.id === id);
  if (!offer) return { ok: false, reason: 'none' };
  if (char.marks < offer.price) return { ok: false, reason: 'marks' };
  if (offer.item && char.inventory.length >= INVENTORY_MAX) return { ok: false, reason: 'bag' };
  if (offer.mount && char.mounts.owned[offer.mount]) return { ok: false, reason: 'owned' };
  const c = structuredClone(char);
  c.marks -= offer.price;
  const out = { ok: true, char: c };
  for (const [m, n] of Object.entries(offer.mats || {})) c.mats[m] += n;
  if (offer.item) {
    const slot = pick(SLOT_IDS, rng);
    out.item = makeItem({ slot, classId: c.classId, rarity: offer.item.rarity, itemLevel: c.level }, rng);
    while (c.inventory.some((x) => x.id === out.item.id)) out.item.id += 'x';
    c.inventory.push(out.item);
  }
  if (offer.mount) { grantMount(c, offer.mount, rng); out.mount = offer.mount; }
  if (offer.gem) {
    out.gem = { gem: pick(GEM_IDS, rng), tier: offer.gem };
    c.gems[out.gem.gem][offer.gem - 1] += 1;
  }
  c.updatedAt = now;
  return out;
}
