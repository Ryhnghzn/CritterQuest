// Skill pool & talents (spec §21). Pure — changes return { ok, char } or { ok: false, reason }.
import { CLASSES } from '../data/classes.js';
import { TALENTS, TALENT_EVERY, TALENT_RESPEC } from '../data/talents.js';
import { SKILL_SLOTS } from '../data/balance.js';

export const talentPoints = (level) => Math.floor(level / TALENT_EVERY);
export const spentTalents = (char) => Object.values(char.talents).reduce((a, b) => a + b, 0);
export const freeTalents = (char) => talentPoints(char.level) - spentTalents(char);

// The skills worn on keys 1–4, as data (null = empty slot).
export function wornSkills(char) {
  const pool = CLASSES[char.classId].skills;
  return char.skills.map((id) => (id ? pool.find((s) => s.id === id) : null));
}

export const ultimateOf = (char) => (char.level >= CLASSES[char.classId].ult.unlock ? CLASSES[char.classId].ult : null);

// Wear a skill in slot 0–3 (keys 1–4); a skill already on another key swaps over. id null = clear.
export function equipSkill(char, slot, id, now) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SKILL_SLOTS) return { ok: false, reason: 'bad' };
  if (id === null) {
    if (!char.skills[slot] || char.skills.filter(Boolean).length <= 1) return { ok: false, reason: 'bad' }; // keep one skill
    const c = structuredClone(char); c.skills[slot] = null; c.updatedAt = now;
    return { ok: true, char: c };
  }
  const s = CLASSES[char.classId].skills.find((x) => x.id === id);
  if (!s) return { ok: false, reason: 'bad' };
  if (s.unlock > char.level) return { ok: false, reason: 'locked' };
  if (char.skills[slot] === id) return { ok: false, reason: 'same' };
  const c = structuredClone(char);
  const other = c.skills.indexOf(id);
  if (other >= 0) c.skills[other] = c.skills[slot];
  c.skills[slot] = id;
  c.updatedAt = now;
  return { ok: true, char: c };
}

// Spend talent points: add = { might: 1, … }; null when malformed or too many.
export function allocateTalents(char, add, now) {
  let total = 0;
  for (const [id, n] of Object.entries(add)) {
    const t = TALENTS.find((x) => x.id === id);
    if (!t || !Number.isInteger(n) || n < 0 || char.talents[id] + n > t.max) return null;
    total += n;
  }
  if (total > freeTalents(char)) return null;
  const c = structuredClone(char);
  for (const [id, n] of Object.entries(add)) c.talents[id] += n;
  c.updatedAt = now;
  return c;
}

export const talentRespecPrice = (char) => TALENT_RESPEC.base + TALENT_RESPEC.perLevel * char.level;

export function respecTalents(char, now) {
  if (!spentTalents(char)) return { ok: false, reason: 'none' };
  const price = talentRespecPrice(char);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  const c = structuredClone(char);
  c.gold -= price;
  for (const k in c.talents) c.talents[k] = 0;
  c.updatedAt = now;
  return { ok: true, char: c };
}

// Run effects from talents, same keys as gear effects (meta/gear.js gearEffects).
export function talentFx(char) {
  const fx = {};
  for (const t of TALENTS) {
    const n = char.talents[t.id];
    for (const [k, v] of Object.entries(t.fx || {})) fx[k] = (fx[k] || 0) + v * n;
  }
  return fx;
}

// Gear + talent effects: values add up (shared keys such as lifesteal).
export function mergeFx(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) if (v) out[k] = (out[k] || 0) + v;
  return out;
}
