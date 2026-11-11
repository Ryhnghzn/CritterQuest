// The Stable (spec §35.2): owned mounts + colours, the active one, purchases and bonuses.
import { MOUNT_DEFS, MOUNT_STATS, SKIN_PRICE, PITY_IDS } from '../data/mounts.js';

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
