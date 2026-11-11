// Jobs & skill points (spec §43.2–43.3): replaces meta/talents.js. Each job keeps its own build in
// char.jobs[classId] = { sp: { id: level }, pages: [[4 ids], [4 ids]], page, ult, branch, freeRespec }.
// Pure — changes return { ok: true, char } or { ok: false, reason }
// ('locked' | 'max' | 'sp' | 'gold' | 'bad' | 'same' | 'none').
import { CLASSES } from '../data/classes.js';
import { SKILL_SLOTS } from '../data/balance.js';
import {
  SP_PER_LEVEL, SKILL_COST, SKILL_MAX, ULT_COST, ULT_MAX, PASSIVE_COST, PASSIVE_MAX, UMUM_COST,
  SP_RESPEC, FREE_START_LEVEL, PASSIVES, UMUM,
} from '../data/skilltree.js';

const ultsOf = (classId) => CLASSES[classId].ults || [CLASSES[classId].ult]; // Fokus joins in part F
const starters = (classId) => CLASSES[classId].skills.filter((s) => s.unlock <= 1).map((s) => s.id);

// What an id is in a job's tree: { kind: 'skill' | 'ult' | 'passive' | 'umum', def } or null
export function nodeOf(classId, id) {
  const C = CLASSES[classId];
  if (!C) return null;
  let def = C.skills.find((s) => s.id === id);
  if (def) return { kind: 'skill', def, max: SKILL_MAX };
  def = ultsOf(classId).find((u) => u.id === id);
  if (def) return { kind: 'ult', def, max: ULT_MAX };
  def = (PASSIVES[classId] || []).find((p) => p.id === id);
  if (def) return { kind: 'passive', def, max: def.max ?? PASSIVE_MAX };
  def = UMUM.find((u) => u.id === id);
  if (def) return { kind: 'umum', def, max: def.max };
  return null;
}
// SP to go from level `from` to level `to` of a node (the free start levels cost nothing)
function cost(classId, id, kind, from, to) {
  let n = 0;
  for (let l = from + 1; l <= to; l++) {
    if (kind === 'skill' && l <= FREE_START_LEVEL && starters(classId).includes(id)) continue;
    n += kind === 'skill' ? SKILL_COST[l - 1] : kind === 'ult' ? ULT_COST : kind === 'passive' ? PASSIVE_COST : UMUM_COST;
  }
  return n;
}

// A fresh build: the two starting skills at level 1 (free) on A1 / A2.
export function newJob(classId, freeRespec = true) {
  const st = starters(classId);
  return { sp: Object.fromEntries(st.map((id) => [id, FREE_START_LEVEL])), pages: [[st[0] ?? null, st[1] ?? null, null, null], [null, null, null, null]], page: 0, ult: null, branch: null, freeRespec };
}
export const jobOf = (char) => char.jobs?.[char.classId] || newJob(char.classId);
export const spTotal = (level) => Math.max(0, level - 1) * SP_PER_LEVEL;
export function spSpent(job, classId) {
  let n = 0;
  for (const [id, lv] of Object.entries(job.sp)) { const node = nodeOf(classId, id); if (node) n += cost(classId, id, node.kind, 0, lv); }
  return n;
}
export const spFree = (char) => spTotal(char.level) - spSpent(jobOf(char), char.classId);
export const levelOf = (char, id) => jobOf(char).sp[id] || 0;
const unlockOf = (node) => node.def.unlock ?? 1;

// a copy of the character with its current job's build changed by fn(job)
function withJob(char, now, fn) {
  const c = structuredClone(char);
  c.jobs ||= {};
  c.jobs[c.classId] = structuredClone(jobOf(char));
  fn(c.jobs[c.classId], c);
  c.updatedAt = now;
  return { ok: true, char: c };
}

// One more level of a skill / ultimate / passive / Umum talent.
export function raise(char, id, now) {
  const node = nodeOf(char.classId, id);
  if (!node) return { ok: false, reason: 'bad' };
  if (unlockOf(node) > char.level) return { ok: false, reason: 'locked' };
  const lv = levelOf(char, id);
  if (lv >= node.max) return { ok: false, reason: 'max' };
  if (cost(char.classId, id, node.kind, lv, lv + 1) > spFree(char)) return { ok: false, reason: 'sp' };
  return withJob(char, now, (job) => { job.sp[id] = lv + 1; });
}

export const spRespecPrice = (char) => SP_RESPEC.base + SP_RESPEC.perLevel * char.level;
// Every SP back (this job only): the build returns to the two starting skills on A1 / A2.
export function respecSp(char, now) {
  const job = jobOf(char), fresh = newJob(char.classId, false);
  if (JSON.stringify(job.sp) === JSON.stringify(fresh.sp)) return { ok: false, reason: 'none' };
  const price = job.freeRespec ? 0 : spRespecPrice(char);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  return withJob(char, now, (j, c) => { c.gold -= price; Object.assign(j, { sp: fresh.sp, pages: fresh.pages, ult: null, freeRespec: false }); });
}

// Wear skill id in page 0|1, slot 0–3; a skill already worn elsewhere moves here; id null clears.
// Page A always keeps at least one skill.
export function equip(char, page, slot, id, now) {
  if (![0, 1].includes(page) || !Number.isInteger(slot) || slot < 0 || slot >= SKILL_SLOTS) return { ok: false, reason: 'bad' };
  const job = jobOf(char);
  if (id === null) {
    if (!job.pages[page][slot]) return { ok: false, reason: 'bad' };
    if (page === 0 && job.pages[0].filter(Boolean).length <= 1) return { ok: false, reason: 'bad' };
    return withJob(char, now, (j) => { j.pages[page][slot] = null; });
  }
  const node = nodeOf(char.classId, id);
  if (!node || node.kind !== 'skill') return { ok: false, reason: 'bad' };
  if (!(job.sp[id] > 0)) return { ok: false, reason: 'locked' };
  if (job.pages[page][slot] === id) return { ok: false, reason: 'same' };
  const pages = job.pages.map((p) => p.map((x) => (x === id ? null : x)));
  pages[page][slot] = id; // whatever sat there comes off
  if (!pages[0].some(Boolean)) return { ok: false, reason: 'bad' }; // page A keeps a skill
  return withJob(char, now, (j) => { j.pages = pages; });
}
// The skills on a page as data (null = empty), and as ids (for the run).
export const wornIds = (char, page = 0) => [...jobOf(char).pages[page]];
export function wornSkills(char, page = 0) {
  const pool = CLASSES[char.classId].skills;
  return wornIds(char, page).map((id) => (id ? pool.find((s) => s.id === id) || null : null));
}
// The ultimate picked for key 5 (learned, level ≥ 1), or null
export function equippedUlt(char) {
  const job = jobOf(char);
  return job.ult && job.sp[job.ult] > 0 ? ultsOf(char.classId).find((u) => u.id === job.ult) || null : null;
}
export function setUlt(char, id, now) {
  const node = nodeOf(char.classId, id);
  if (!node || node.kind !== 'ult') return { ok: false, reason: 'bad' };
  if (!(levelOf(char, id) > 0)) return { ok: false, reason: 'locked' };
  if (jobOf(char).ult === id) return { ok: false, reason: 'same' };
  return withJob(char, now, (j) => { j.ult = id; });
}

// Effects for the run (same keys as gear effects) and stat changes for finalStats.
export function umumFx(char) {
  const fx = {}, sp = jobOf(char).sp;
  for (const u of UMUM) for (const [k, v] of Object.entries(u.fx || {})) fx[k] = (fx[k] || 0) + v * (sp[u.id] || 0);
  return fx;
}
export function passiveFx(char) {
  const fx = {}, sp = jobOf(char).sp;
  for (const p of PASSIVES[char.classId] || []) for (const [k, v] of Object.entries(p.fx || {})) fx[k] = (fx[k] || 0) + v * (sp[p.id] || 0);
  return fx;
}
// stat changes: [{ pct: {stat: k}, add: {stat: v} }] already × level — Umum talents, then passives
export function treeStats(char) {
  const sp = jobOf(char).sp, out = [];
  for (const u of UMUM) if (sp[u.id]) out.push({ pct: mul(u.pct, sp[u.id]), add: mul(u.add, sp[u.id]) });
  for (const p of PASSIVES[char.classId] || []) if (sp[p.id] && p.stat) out.push({ pct: mul(p.stat, sp[p.id]), add: {} });
  return out;
}
const mul = (o, n) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, v * n]));

// Gear + tree effects: values add up (shared keys such as lifesteal).
export function mergeFx(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) if (v) out[k] = (out[k] || 0) + v;
  return out;
}

// Points not yet spent, for the Karakter badge
export const spBadge = (char) => spFree(char);
