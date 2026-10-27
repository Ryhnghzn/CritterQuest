// Collection (spec §24): bestiary milestones → permanent stats; unique codex →
// coin & EXP find. Pure; `c` arguments of the add* helpers are mutated (callers
// pass their own clone).
import { BESTIARY, BESTIARY_IDS, BESTIARY_STEPS, BOSS_STEPS, CODEX_FX } from '../data/collection.js';
import { ENEMIES } from '../data/enemies.js';

export const stepsOf = (id) => (ENEMIES[id].boss ? BOSS_STEPS : BESTIARY_STEPS);

// milestones reached for one enemy type
export const bestiaryTier = (id, kills) => stepsOf(id).filter((n) => kills >= n).length;

export function collectionStats(char) {
  const s = {};
  for (const id of BESTIARY_IDS) {
    const n = bestiaryTier(id, char.records.bestiary?.[id] || 0);
    if (n) s[BESTIARY[id].stat] = (s[BESTIARY[id].stat] || 0) + BESTIARY[id].v * n;
  }
  return s;
}

export function codexFx(char) {
  const n = char.records.uniques?.length || 0;
  return Object.fromEntries(Object.entries(CODEX_FX).map(([k, v]) => [k, v * n]));
}

export function addKills(c, killsBy = {}) {
  for (const [id, n] of Object.entries(killsBy)) if (Object.hasOwn(c.records.bestiary, id)) c.records.bestiary[id] += n;
}

// Records the uniques among `items`; returns the ids seen for the first time.
export function discover(c, items = []) {
  const found = [];
  for (const it of items) {
    if (it?.unique && !c.records.uniques.includes(it.unique)) { c.records.uniques.push(it.unique); found.push(it.unique); }
  }
  return found;
}
