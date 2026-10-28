// Quests (spec §26). Pure: functions take a character and return new objects.
// char.quests = { main: { ch, step, prog }, side: { id: { step, prog } }, done: [id], track }
//   main.ch: index into MAIN (MAIN.length = every chapter so far is done)
//   step: index of the step being worked on; prog: count for counting steps (kill / elite /
//   drop), a bit per spot for reach steps
// Steps that only check what the character already did (town, gate, boss, guard) finish on
// their own whenever quests are synced; a quest always ends with a talk or a give, which pays.
// Talks in the wild use town 'wild' and the hidden person's id (data/quests.js HIDDEN).
import { MAIN, SIDE, SIDE_MAX, QUEST_REWARD, SHARDS, GATE_HINT, HIDDEN, SPOTS, hiddenById } from '../data/quests.js';
import { UNIQUES, SLOT_IDS, SLOTS, LEGENDARY } from '../data/items.js';
import { GEM_IDS } from '../data/forge.js';
import { POTION_MAX } from '../data/potions.js';
import { INVENTORY_MAX, STASH_MAX } from '../data/balance.js';
import { regionOfDungeon, regionById, TREASURE } from '../data/world.js';
import { makeItem } from './itemgen.js';
import { discover } from './collection.js';
import { isEquipped } from './gear.js';
import { addExp } from './character.js';
import { gateSpots } from './world.js';
import { mulberry, buildFieldMap } from '../run/fieldmap.js';

// the data objects themselves (titles & lines get translated in place at start-up), plus main / ch
const QUESTS = Object.fromEntries([
  ...MAIN.map((q, i) => [q.id, Object.create(q, { main: { value: true }, ch: { value: i } })]),
  ...SIDE.map((q) => [q.id, q]),
]);
export const questDef = (id) => QUESTS[id] || null;

// Quests being worked on: [{ id, def, state, step }] — the main quest first.
export function activeQuests(char) {
  const q = char.quests, out = [];
  const m = MAIN[q.main.ch];
  if (m) out.push({ id: m.id, def: QUESTS[m.id], state: q.main, step: m.steps[q.main.step] });
  for (const [id, state] of Object.entries(q.side)) {
    const def = QUESTS[id];
    if (def) out.push({ id, def, state, step: def.steps[state.step] });
  }
  return out;
}

export const shards = (char) => Math.min(SHARDS, char.quests.main.ch);
export const mainDone = (char) => char.quests.main.ch >= MAIN.length;
export const sideCount = (char) => Object.keys(char.quests.side).length;

const stateOf = (q, id) => (QUESTS[id]?.main ? (MAIN[q.main.ch]?.id === id ? q.main : null) : q.side[id] || null);
const sideOpen = (char, id) => !char.quests.side[id] && !char.quests.done.includes(id);

// Is a step that checks the character's own progress already met?
export function stepMet(char, step) {
  switch (step?.kind) {
    case 'town': return char.towns.includes(step.town);
    case 'gate': return char.found.includes(step.dungeon);
    case 'boss': return (char.records.dungeons[step.dungeon]?.clears || 0) > 0;
    case 'guard': { // a chest opens only after its guardian falls; the last one is the overlord's
      const opened = char.treasures[step.region] || [];
      return step.lord ? opened.includes(TREASURE.count - 1) : opened.filter((i) => i < TREASURE.count - 1).length >= (step.n || 1);
    }
    default: return false;
  }
}
const needOf = (step) => (step.kind === 'kill' || step.kind === 'elite' || step.kind === 'drop' ? step.n : 0);
const allSpots = (step) => (1 << step.spots.length) - 1;
export const spotsDone = (step, prog) => step.spots.filter((_, i) => prog & (1 << i)).length;

// Moves every active quest past the steps already met. Mutates c (a clone).
export function syncQuests(c) {
  for (const a of activeQuests(c)) {
    const st = a.state;
    while (st.step < a.def.steps.length) {
      const s = a.def.steps[st.step];
      const n = needOf(s);
      const met = s.kind === 'reach' ? st.prog === allSpots(s) : n ? st.prog >= n : stepMet(c, s);
      if (!met) break;
      st.step++;
      st.prog = 0;
    }
  }
  return c;
}

// Counts a trip or a field part toward the steps being worked on. Mutates c.
// trip: { killsBy: { type: n } (by kin), elites, elitesBy, questItems: { item: n }, reached: [spot], region? }
export function countQuests(c, trip) {
  for (const a of activeQuests(c)) {
    const s = a.step, st = a.state;
    if (!s || (s.region && s.region !== trip.region)) continue;
    if (s.kind === 'reach') {
      s.spots.forEach((id, i) => { if (trip.reached?.includes(id)) st.prog |= 1 << i; });
      continue;
    }
    let add = 0;
    if (s.kind === 'kill') add = trip.killsBy?.[s.enemy] || 0;
    if (s.kind === 'elite') add = s.enemy ? trip.elitesBy?.[s.enemy] || 0 : trip.elites || 0;
    if (s.kind === 'drop') add = trip.questItems?.[s.item] || 0;
    if (add) st.prog = Math.min(s.n, st.prog + add);
  }
  return syncQuests(c);
}

// ——— handing things over (give steps) ———
// The gear a give step would take: the plainest pieces in the bag that qualify, never worn ones.
function gearFor(char, want) {
  return char.inventory
    .filter((it) => it.rarity >= want.rarity && (!want.slots || want.slots.includes(it.slot)) && !isEquipped(char, it))
    .sort((a, b) => a.rarity - b.rarity || a.itemLevel - b.itemLevel || a.plus - b.plus)
    .slice(0, want.n || 1);
}

// gems of a tier: of one kind when named, else any kinds (the most plentiful first)
function gemsFor(char, want) {
  const kinds = want.gem ? [want.gem] : GEM_IDS.slice().sort((a, b) => char.gems[b][want.tier - 1] - char.gems[a][want.tier - 1]);
  const take = [];
  let left = want.n || 1;
  for (const gem of kinds) {
    const n = Math.min(left, char.gems[gem][want.tier - 1]);
    if (n > 0) { take.push({ gem, tier: want.tier, n }); left -= n; }
  }
  return left > 0 ? null : take;
}

// Does the character have everything a give step asks for? → { ok, gear: [items], gems: [...] }
export function canGive(char, step) {
  const gear = step.gear ? gearFor(char, step.gear) : [];
  const gems = [];
  let ok = !step.gear || gear.length >= (step.gear.n || 1);
  for (const [m, n] of Object.entries(step.mats || {})) if (char.mats[m] < n) ok = false;
  for (const [p, n] of Object.entries(step.potions || {})) if (char.potions[p] < n) ok = false;
  for (const g of step.gems || []) { const t = gemsFor(char, g); if (t) gems.push(...t); else ok = false; }
  return { ok, gear, gems };
}

// What the quests want said to this NPC: [{ id, title, who, say, start, ends, give?, can?, full? }]
//   start: it begins the quest / chapter; ends: this finishes it (and pays);
//   give: the step hands things over (can: they are in the bag); full: too many side quests.
export function talkOffers(char, townId, npcId) {
  const out = [];
  for (const a of activeQuests(char)) {
    const s = a.step;
    if ((s?.kind !== 'talk' && s?.kind !== 'give') || s.town !== townId || s.npc !== npcId) continue;
    const o = { id: a.id, title: a.def.title, who: s.who, say: s.say, start: a.state.step === 0, ends: a.state.step === a.def.steps.length - 1, reward: a.def.reward };
    if (s.kind === 'give') { o.give = s; o.can = canGive(char, s); }
    out.push(o);
  }
  for (const q of SIDE) {
    const s = q.steps[0];
    if (s.town !== townId || s.npc !== npcId || !sideOpen(char, q.id)) continue;
    out.push({ id: q.id, title: q.title, who: s.who, say: s.say, start: true, ends: false, reward: q.reward, full: sideCount(char) >= SIDE_MAX });
  }
  return out;
}

// Marks over NPCs: { npcId: '!' (a quest starts) | '?' (talk / hand over / report) }
export function npcMarks(char, townId) {
  const out = {};
  for (const o of activeQuests(char)) {
    const s = o.step;
    if ((s?.kind === 'talk' || s?.kind === 'give') && s.town === townId) out[s.npc] = o.state.step === 0 && out[s.npc] !== '?' ? '!' : '?';
  }
  for (const q of SIDE) {
    const s = q.steps[0];
    if (s.town === townId && sideOpen(char, q.id) && !out[s.npc]) out[s.npc] = '!';
  }
  return out;
}

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// A gear reward: any slot at the player's level; Legendary / Mythic become a fitting unique.
function rewardItem(char, rarity, rng) {
  if (rarity >= LEGENDARY) {
    const u = pick(UNIQUES.filter((x) => !x.quest && x.rarity === rarity && (x.classId === null || x.classId === char.classId)), rng);
    return makeItem({ slot: u.slot, classId: char.classId, rarity, itemLevel: char.level, unique: u.id }, rng);
  }
  const slot = pick(SLOT_IDS, rng);
  return makeItem({ slot, classId: char.classId, rarity: Math.max(rarity, SLOTS[slot].minRarity || 0), itemLevel: char.level }, rng);
}

// Pays a quest's reward into c (already cloned).
// → { char, got: { gold, exp, levelsGained, items, gems, shard, marks, mats, potions } }
function pay(c, reward, rng) {
  const lv = c.level, R = QUEST_REWARD;
  const gold = Math.round((R.gold.base + R.gold.perLevel * lv) * (reward.gold || 0));
  const exp = Math.round((R.exp.base + R.exp.perLevel * lv) * (reward.exp || 0));
  const items = [], gems = [], potions = {};
  if (reward.gear) items.push(rewardItem(c, reward.gear.rarity, rng));
  if (reward.unique) {
    const u = UNIQUES.find((x) => x.id === reward.unique);
    items.push(makeItem({ slot: u.slot, classId: c.classId, rarity: u.rarity, itemLevel: c.level, unique: u.id }, rng));
  }
  for (const g of reward.gems || []) {
    const gem = g.gem || pick(GEM_IDS, rng);
    c.gems[gem][g.tier - 1] += 1;
    gems.push({ gem, tier: g.tier });
  }
  for (const [m, n] of Object.entries(reward.mats || {})) c.mats[m] += n;
  for (const [p, n] of Object.entries(reward.potions || {})) {
    const add = Math.min(n, POTION_MAX - c.potions[p]);
    if (add > 0) { c.potions[p] += add; potions[p] = add; }
  }
  c.marks += reward.marks || 0;
  const ids = new Set([...c.inventory, ...c.stash].map((it) => it.id));
  for (const it of items) {
    while (ids.has(it.id)) it.id += 'x';
    ids.add(it.id);
    (c.inventory.length < INVENTORY_MAX ? c.inventory : c.stash).push(it);
  }
  discover(c, items);
  c.gold += gold;
  const leveled = addExp(c, exp);
  return { char: leveled.char, got: { gold, exp, levelsGained: leveled.levelsGained, items, gems, shard: !!reward.shard, marks: reward.marks || 0, mats: reward.mats || {}, potions } };
}

// Takes what a give step asks for out of c (already checked with canGive). → what went
function hand(c, step) {
  const { gear, gems } = canGive(c, step);
  const ids = new Set(gear.map((it) => it.id));
  c.inventory = c.inventory.filter((it) => !ids.has(it.id));
  for (const g of gems) c.gems[g.gem][g.tier - 1] -= g.n;
  for (const [m, n] of Object.entries(step.mats || {})) c.mats[m] -= n;
  for (const [p, n] of Object.entries(step.potions || {})) c.potions[p] -= n;
  return { gear, gems };
}

// Speaks (or hands over) to the NPC: a side quest starts, a step is done, the quest may finish and pay.
// → { ok, char, id, say, done, given?, got? } | { ok: false, reason: 'missing' | 'journal' | 'give' | 'bag' }
export function questTalk(char, id, townId, npcId, now, rng = Math.random) {
  const offer = talkOffers(char, townId, npcId).find((o) => o.id === id);
  if (!offer) return { ok: false, reason: 'missing' };
  if (offer.full) return { ok: false, reason: 'journal' };
  if (offer.give && !offer.can.ok) return { ok: false, reason: 'give' };
  const def = QUESTS[id], rw = def.reward;
  if (offer.ends && (rw.gear || rw.unique) && char.inventory.length >= INVENTORY_MAX && char.stash.length >= STASH_MAX) return { ok: false, reason: 'bag' };
  let c = structuredClone(char);
  if (!def.main && !c.quests.side[id]) c.quests.side[id] = { step: 0, prog: 0 };
  const given = offer.give ? hand(c, offer.give) : null;
  const st = stateOf(c.quests, id);
  st.step++;
  st.prog = 0;
  let got = null;
  if (st.step >= def.steps.length) {
    const r = pay(c, rw, rng);
    c = r.char;
    got = r.got;
    if (def.main) c.quests.main = { ch: c.quests.main.ch + 1, step: 0, prog: 0 };
    else delete c.quests.side[id];
    if (c.quests.track === id) c.quests.track = null;
    c.quests.done.push(id);
  }
  syncQuests(c);
  c.updatedAt = now;
  return { ok: true, char: c, id, say: offer.say, done: !!got, given, got };
}

// Drops a side quest (its progress is lost; it can be taken again).
export function abandonQuest(char, id, now) {
  if (!char.quests.side[id]) return { ok: false, reason: 'missing' };
  const c = structuredClone(char);
  delete c.quests.side[id];
  if (c.quests.track === id) c.quests.track = null;
  c.updatedAt = now;
  return { ok: true, char: c };
}

// Picks the quest the tracker, arrows and map follow (null = the main quest).
export function trackQuest(char, id, now) {
  if (id !== null && !activeQuests(char).some((a) => a.id === id)) return { ok: false, reason: 'missing' };
  const c = structuredClone(char);
  c.quests.track = id;
  c.updatedAt = now;
  return { ok: true, char: c };
}

export const trackedQuest = (char) => {
  const list = activeQuests(char);
  return list.find((q) => q.id === char.quests.track) || list[0] || null;
};

// ——— the wild (spec §26.5) ———
const spotXY = (id) => { const s = SPOTS[id], r = regionById(s.region); return { x: Math.round(s.at[0] * r.w), y: Math.round(s.at[1] * r.h) }; };
export const hiddenXY = (h) => { const r = regionById(h.region); return { x: Math.round(h.at[0] * r.w), y: Math.round(h.at[1] * r.h) }; };

// Who lives in a region and is still there (someone who walked off with a quest is gone),
// with their quest mark: [{ ...def, x, y, mark }]
export function hiddenIn(char, regionId) {
  const marks = npcMarks(char, 'wild');
  return HIDDEN.filter((h) => h.region === regionId && !(h.gone && (char.quests.side[h.gone] || char.quests.done.includes(h.gone))))
    .map((h) => ({ ...h, ...hiddenXY(h), mark: marks[h.id] || null }));
}

// What a region needs to know of the quests being worked on:
//   spots: places still to stand at [{ spot, x, y }]; drops: quest items that may fall [{ item, enemy, chance, night }]
export function fieldQuests(char, regionId) {
  const spots = [], drops = [];
  for (const a of activeQuests(char)) {
    const s = a.step;
    if (s?.kind === 'reach') s.spots.forEach((id, i) => { if (SPOTS[id].region === regionId && !(a.state.prog & (1 << i))) spots.push({ spot: id, ...spotXY(id) }); });
    if (s?.kind === 'drop' && s.region === regionId) drops.push({ item: s.item, enemy: s.enemy, chance: s.chance, night: !!s.night });
  }
  return { spots, drops };
}

// ——— where to go (spec §26.3) ———
// The tracked quest's target in a region: { kind, x, y, r? } in world units, or null.
//   gate not yet found → a hint circle (r) that holds the gate somewhere inside;
//   a hidden person / a place to stand → that point (the nearest unvisited place);
//   a town at either end of the region → the middle of that edge.
export function questTarget(char, regionId, from = null) {
  const a = trackedQuest(char);
  const s = a?.step;
  const region = regionById(regionId);
  if (!s || !region) return null;
  if (s.kind === 'gate' || s.kind === 'boss') {
    if (regionOfDungeon(s.dungeon)?.id !== regionId) return null;
    const g = gateSpots(region, char.world.seed).find((x) => x.dungeon === s.dungeon);
    if (char.found.includes(s.dungeon)) return { kind: 'gate', x: g.x, y: g.y };
    const rng = mulberry((char.world.seed ^ [...s.dungeon].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) >>> 0);
    const ang = rng() * Math.PI * 2, d = rng() * GATE_HINT.jitter;
    return { kind: 'hint', dungeon: s.dungeon, x: g.x + Math.cos(ang) * d, y: g.y + Math.sin(ang) * d, r: GATE_HINT.r };
  }
  if (s.kind === 'reach') {
    const left = s.spots.filter((id, i) => SPOTS[id].region === regionId && !(a.state.prog & (1 << i))).map((id) => ({ kind: 'spot', spot: id, ...spotXY(id) }));
    if (!left.length) return null;
    const p = from || { x: 0, y: region.h / 2 };
    return left.sort((u, v) => Math.hypot(u.x - p.x, u.y - p.y) - Math.hypot(v.x - p.x, v.y - p.y))[0];
  }
  if ((s.kind === 'talk' || s.kind === 'give') && s.town === 'wild') {
    const h = hiddenById(s.npc);
    return h.region === regionId ? { kind: 'hidden', ...hiddenXY(h) } : null;
  }
  const town = s.kind === 'town' || s.kind === 'talk' || s.kind === 'give' ? s.town : null;
  const map = town && buildFieldMap(region);
  if (town && region.to === town) return { kind: 'town', x: map.end.x, y: map.end.y };
  if (town && region.from === town) return { kind: 'town', x: map.start.x, y: map.start.y };
  return null;
}
