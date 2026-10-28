// Quests (spec §26). Pure: functions take a character and return new objects.
// char.quests = { main: { ch, step, prog }, side: { id: { step, prog } }, done: [id], track }
//   main.ch: index into MAIN (MAIN.length = every chapter so far is done)
//   step: index of the step being worked on; prog: count for counting steps (kill / elite)
// Steps that only check what the character already did (town, gate, boss) finish on their
// own whenever quests are synced; a quest always ends with a talk, which pays the reward.
import { MAIN, SIDE, QUEST_REWARD, SHARDS, GATE_HINT } from '../data/quests.js';
import { UNIQUES, SLOT_IDS, SLOTS, LEGENDARY } from '../data/items.js';
import { GEM_IDS } from '../data/forge.js';
import { INVENTORY_MAX, STASH_MAX } from '../data/balance.js';
import { regionOfDungeon, regionById } from '../data/world.js';
import { makeItem } from './itemgen.js';
import { discover } from './collection.js';
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

const stateOf = (q, id) => (QUESTS[id]?.main ? (MAIN[q.main.ch]?.id === id ? q.main : null) : q.side[id] || null);

// Is a step that checks the character's own progress already met?
export function stepMet(char, step) {
  switch (step?.kind) {
    case 'town': return char.towns.includes(step.town);
    case 'gate': return char.found.includes(step.dungeon);
    case 'boss': return (char.records.dungeons[step.dungeon]?.clears || 0) > 0;
    case 'kill': case 'elite': return false;
    default: return false;
  }
}
const needOf = (step) => (step.kind === 'kill' || step.kind === 'elite' ? step.n : 0);

// Moves every active quest past the steps already met. Mutates c (a clone).
export function syncQuests(c) {
  for (const a of activeQuests(c)) {
    const st = a.state;
    while (st.step < a.def.steps.length) {
      const s = a.def.steps[st.step];
      const n = needOf(s);
      if (!(n ? st.prog >= n : stepMet(c, s))) break;
      st.step++;
      st.prog = 0;
    }
  }
  return c;
}

// Counts kills of a trip or a field part toward kill / elite steps. Mutates c.
// trip: { killsBy: { type: n } (by kin), elites, region? }
export function countQuests(c, trip) {
  for (const a of activeQuests(c)) {
    const s = a.step;
    if (!s || (s.region && s.region !== trip.region)) continue;
    let add = 0;
    if (s.kind === 'kill') add = trip.killsBy?.[s.enemy] || 0;
    if (s.kind === 'elite') add = trip.elites || 0;
    if (add) a.state.prog = Math.min(s.n, a.state.prog + add);
  }
  return syncQuests(c);
}

// What the quests want said to this NPC: [{ id, title, who, say, start, ends }]
//   start: it begins the quest / chapter; ends: talking finishes it (and pays).
export function talkOffers(char, townId, npcId) {
  const out = [];
  for (const a of activeQuests(char)) {
    const s = a.step;
    if (s?.kind !== 'talk' || s.town !== townId || s.npc !== npcId) continue;
    out.push({ id: a.id, title: a.def.title, who: s.who, say: s.say, start: a.state.step === 0, ends: a.state.step === a.def.steps.length - 1, reward: a.def.reward });
  }
  return out;
}

// Marks over the heads of a town's NPCs: { npcId: '!' (a quest starts) | '?' (talk / report) }
export function npcMarks(char, townId) {
  const out = {};
  for (const a of activeQuests(char)) {
    const s = a.step;
    if (s?.kind === 'talk' && s.town === townId) out[s.npc] = a.state.step === 0 && out[s.npc] !== '?' ? '!' : '?';
  }
  return out;
}

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// A gear reward: any slot at the player's level; Legendary / Mythic become a fitting unique.
function rewardItem(char, rarity, rng) {
  if (rarity >= LEGENDARY) {
    const u = pick(UNIQUES.filter((x) => x.rarity === rarity && (x.classId === null || x.classId === char.classId)), rng);
    return makeItem({ slot: u.slot, classId: char.classId, rarity, itemLevel: char.level, unique: u.id }, rng);
  }
  const slot = pick(SLOT_IDS, rng);
  return makeItem({ slot, classId: char.classId, rarity: Math.max(rarity, SLOTS[slot].minRarity || 0), itemLevel: char.level }, rng);
}

// Pays a quest's reward into c (already cloned). → { gold, exp, levelsGained, items, gems, shard }
function pay(c, reward, rng) {
  const lv = c.level, R = QUEST_REWARD;
  const gold = Math.round((R.gold.base + R.gold.perLevel * lv) * (reward.gold || 0));
  const exp = Math.round((R.exp.base + R.exp.perLevel * lv) * (reward.exp || 0));
  const items = [], gems = [];
  if (reward.gear) items.push(rewardItem(c, reward.gear.rarity, rng));
  for (const g of reward.gems || []) {
    const gem = g.gem || pick(GEM_IDS, rng);
    c.gems[gem][g.tier - 1] += 1;
    gems.push({ gem, tier: g.tier });
  }
  const ids = new Set([...c.inventory, ...c.stash].map((it) => it.id));
  for (const it of items) {
    while (ids.has(it.id)) it.id += 'x';
    ids.add(it.id);
    (c.inventory.length < INVENTORY_MAX ? c.inventory : c.stash).push(it);
  }
  discover(c, items);
  c.gold += gold;
  const leveled = addExp(c, exp);
  return { char: leveled.char, got: { gold, exp, levelsGained: leveled.levelsGained, items, gems, shard: !!reward.shard } };
}

// Says the step's lines to the NPC: the talk step is done; the quest may finish and pay.
// → { ok, char, id, say, done, got? } | { ok: false, reason }
export function questTalk(char, id, townId, npcId, now, rng = Math.random) {
  const offer = talkOffers(char, townId, npcId).find((o) => o.id === id);
  if (!offer) return { ok: false, reason: 'missing' };
  if (offer.ends && QUESTS[id].reward.gear && char.inventory.length >= INVENTORY_MAX && char.stash.length >= STASH_MAX) return { ok: false, reason: 'bag' };
  let c = structuredClone(char);
  const st = stateOf(c.quests, id);
  st.step++;
  st.prog = 0;
  let got = null;
  if (st.step >= QUESTS[id].steps.length) {
    const r = pay(c, QUESTS[id].reward, rng);
    c = r.char;
    got = r.got;
    if (QUESTS[id].main) c.quests.main = { ch: c.quests.main.ch + 1, step: 0, prog: 0 };
    else delete c.quests.side[id];
    c.quests.done.push(id);
  }
  syncQuests(c);
  c.updatedAt = now;
  return { ok: true, char: c, id, say: offer.say, done: !!got, got };
}

// ——— where to go (spec §26.3) ———
// The tracked quest's target in a region: { kind, x, y, r? } in world units, or null.
//   gate not yet found → a hint circle (r) that holds the gate somewhere inside;
//   a town at either end of the region → the middle of that edge.
export function questTarget(char, regionId) {
  const a = activeQuests(char).find((q) => q.id === (char.quests.track || MAIN[char.quests.main.ch]?.id)) || activeQuests(char)[0];
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
  const town = s.kind === 'town' || s.kind === 'talk' ? s.town : null;
  const map = town && buildFieldMap(region);
  if (town && region.to === town) return { kind: 'town', x: map.end.x, y: map.end.y };
  if (town && region.from === town) return { kind: 'town', x: map.start.x, y: map.start.y };
  return null;
}
