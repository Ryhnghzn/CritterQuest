// The Stable (spec §35.2): owned mounts + colours, the active one, purchases and bonuses.
import { MOUNT_DEFS, MOUNT_STATS, SKIN_PRICE, PITY_IDS, STORY_MOUNTS, MOUNT_DROP } from '../data/mounts.js';
import { SIDE } from '../data/quests.js';

export const freshMounts = () => ({ owned: {}, active: null, skin: {}, pity: Object.fromEntries(PITY_IDS.map((id) => [id, 0])) });

// Mutates c (callers already cloned). New mount -> 'new'; owned -> a random missing colour 'skin'; nothing left -> null.
export function grantMount(c, id, rng = Math.random) {
  const def = MOUNT_DEFS[id];
  if (!def) return null;
  const m = c.mounts;
  if (!m.owned[id]) { m.owned[id] = [0]; m.skin[id] = 0; if (!m.active) m.active = id; return 'new'; }
  const missing = Array.from({ length: def.skins }, (_, i) => i).filter((i) => !m.owned[id].includes(i));
  if (!missing.length) return null;
  m.owned[id] = [...m.owned[id], missing[Math.floor(rng() * missing.length)]].sort((a, b) => a - b);
  return 'skin';
}

export function activeMountSetup(char) {
  const id = char.mounts?.active;
  const def = id && MOUNT_DEFS[id];
  if (!def) return null;
  return { id, rarity: def.rarity, fly: !!def.fly, skin: char.mounts.skin[id] ?? 0 };
}

export function ownedMounts(char) {
  return Object.keys(char.mounts?.owned || {});
}

export function setActiveMount(char, id, skin, now) {
  const owned = char.mounts.owned[id];
  if (!owned || !owned.includes(skin)) return { ok: false, reason: 'none' };
  const c = structuredClone(char);
  c.mounts.active = id; c.mounts.skin[id] = skin; c.updatedAt = now;
  return { ok: true, char: c };
}

export function buyMount(char, id, now) {
  const def = MOUNT_DEFS[id];
  if (!def || def.source !== 'stable') return { ok: false, reason: 'none' };
  if (char.mounts.owned[id]) return { ok: false, reason: 'owned' };
  if (char.gold < def.price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= def.price;
  grantMount(c, id);
  c.updatedAt = now;
  return { ok: true, char: c };
}

export function buySkin(char, id, skin, now) {
  const def = MOUNT_DEFS[id];
  if (!def || !char.mounts.owned[id] || !Number.isInteger(skin) || skin < 0 || skin >= def.skins) return { ok: false, reason: 'none' };
  if (char.mounts.owned[id].includes(skin)) return { ok: false, reason: 'owned' };
  if (char.gold < SKIN_PRICE) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= SKIN_PRICE;
  c.mounts.owned[id] = [...c.mounts.owned[id], skin].sort((a, b) => a - b);
  c.updatedAt = now;
  return { ok: true, char: c };
}

// Run effects (goldfind, expfind, ...) of the active mount; stat multipliers are separate.
export function mountFx(char) {
  const id = char.mounts?.active; if (!id) return {};
  return Object.fromEntries(Object.entries(MOUNT_DEFS[id].bonus).filter(([k]) => !MOUNT_STATS.includes(k)));
}
export function mountStatMul(char) {
  const id = char.mounts?.active; if (!id) return {};
  return Object.fromEntries(Object.entries(MOUNT_DEFS[id].bonus).filter(([k]) => MOUNT_STATS.includes(k)).map(([k, v]) => [k, 1 + v]));
}

// Story mounts earned so far (spec §35.2) that are not owned yet; mutates c, idempotent. -> ids granted.
export function storyMounts(c, rng = Math.random) {
  const got = [];
  for (const [id, goal] of Object.entries(STORY_MOUNTS)) {
    if (c.mounts.owned[id]) continue;
    const met = goal === 'allSide' ? SIDE.every((s) => c.quests.done.includes(s.id))
      : goal === 'ending' ? c.records.ending !== null && c.records.ending !== undefined
        : c.quests.done.includes(goal);
    if (met && grantMount(c, id, rng)) got.push(id); // only ever a new mount here, so rng is never drawn
  }
  return got;
}

// Boss / mini-boss drops with a pity counter (spec §35.2). rolls: { any, eclipse } boss kills this trip.
// 'any' mounts roll on every roll; 'eclipse' mounts only on eclipse rolls. Mutates c.mounts.pity.
// -> ids of mounts (or extra colours) obtained, in PITY_IDS order per roll.
export function rollMountDrops(c, rolls, rng) {
  const got = [];
  const pity = c.mounts.pity;
  const n = (kind) => (rolls?.[kind] || 0);
  for (const kind of ['any', 'eclipse']) {
    for (let i = 0; i < n(kind); i++) {
      for (const id of PITY_IDS) {
        const from = MOUNT_DEFS[id].dropFrom;
        if (from !== 'any' && from !== kind) continue;
        const misses = pity[id] || 0;
        const hit = misses + 1 >= MOUNT_DROP.guarantee || rng() < Math.min(1, MOUNT_DROP.base + MOUNT_DROP.step * misses);
        if (!hit) { pity[id] = misses + 1; continue; }
        pity[id] = 0;
        if (grantMount(c, id, rng)) got.push(id);
      }
    }
  }
  return got;
}

// What the news should say about mounts just obtained (ids from storyMounts / rollMountDrops).
// -> [{ id, isNew, skins: [colour indexes added] }], one entry per mount; first: it is the character's first mount.
export function mountGains(before, after, ids) {
  return [...new Set(ids)].map((id) => {
    const had = before.mounts.owned[id];
    return { id, isNew: !had, skins: (after.mounts.owned[id] || []).filter((s) => !had || !had.includes(s)) };
  });
}
