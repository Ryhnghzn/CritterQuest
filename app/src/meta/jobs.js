// Jobs & skill points (spec §43.2–43.3): replaces meta/talents.js. Each job keeps its own build in
// char.jobs[classId] = { sp: { id: level }, pages: [[4 ids], [4 ids]], page, ult, branch, freeRespec }.
// Pure — changes return { ok: true, char } or { ok: false, reason }
// ('locked' | 'max' | 'sp' | 'gold' | 'bad' | 'same' | 'none').
import { CLASSES, JOB_IDS } from '../data/classes.js';
import { SKILL_SLOTS, INVENTORY_MAX, JOB_PICK_LEVEL, JOB_CHANGE } from '../data/balance.js';
import { makeItem } from './itemgen.js';
import {
  SP_PER_LEVEL, SKILL_COST, SKILL_MAX, ULT_COST, ULT_MAX, PASSIVE_COST, PASSIVE_MAX, UMUM_COST,
  SP_RESPEC, FREE_START_LEVEL, PASSIVES, UMUM,
} from '../data/skilltree.js';
import { BRANCH, branchById, branchesOf, skillPool } from '../data/branches.js';

// the job's ultimates (Luas, Fokus) and, with a branch (spec §43.10), the branch's as a third
const ultsOf = (classId, branch = null) => {
  const C = CLASSES[classId], base = C.ults?.length || !C.ult ? C.ults || [] : [C.ult], b = branch && branchById(classId, branch);
  return b ? [...base, b.ult] : base;
};
const starters = (classId) => CLASSES[classId].skills.filter((s) => s.unlock <= 1).slice(0, 2).map((s) => s.id); // the first two

// What an id is in a job's tree: { kind: 'skill' | 'ult' | 'passive' | 'umum', def } or null
// branch: the job's branch id (its skills, ultimate and passives join the tree), or null
export function nodeOf(classId, id, branch = null) {
  const C = CLASSES[classId];
  if (!C) return null;
  let def = skillPool(C, branch).find((s) => s.id === id);
  if (def) return { kind: 'skill', def, max: SKILL_MAX };
  def = ultsOf(classId, branch).find((u) => u.id === id);
  if (def) return { kind: 'ult', def, max: ULT_MAX };
  def = passivesOf(classId, branch).find((p) => p.id === id);
  if (def) return { kind: 'passive', def, max: def.max ?? PASSIVE_MAX };
  def = UMUM.find((u) => u.id === id);
  if (def) return { kind: 'umum', def, max: def.max };
  return null;
}
const passivesOf = (classId, branch = null) => [...(PASSIVES[classId] || []), ...(branch ? branchById(classId, branch)?.passives || [] : [])];

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
  for (const [id, lv] of Object.entries(job.sp)) { const node = nodeOf(classId, id, job.branch); if (node) n += cost(classId, id, node.kind, 0, lv); }
  return n;
}
export const spFree = (char) => spTotal(char.level) - spSpent(jobOf(char), char.classId);
export const levelOf = (char, id) => jobOf(char).sp[id] || 0;
const unlockOf = (node) => node.def.unlock ?? 1;
const nodeIn = (char, id) => nodeOf(char.classId, id, jobOf(char).branch);
// the job's branch definition (data/branches.js), or null
export const branchOf = (char) => (char.classId === 'novice' ? null : branchById(char.classId, jobOf(char).branch));

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
  if (char.classId === 'novice') return { ok: false, reason: 'locked' }; // a Pengembara has no tree (spec §43.1)
  const node = nodeIn(char, id);
  if (!node) return { ok: false, reason: 'bad' };
  if (unlockOf(node) > char.level) return { ok: false, reason: 'locked' };
  const lv = levelOf(char, id);
  if (lv >= node.max) return { ok: false, reason: 'max' };
  if (cost(char.classId, id, node.kind, lv, lv + 1) > spFree(char)) return { ok: false, reason: 'sp' };
  return withJob(char, now, (job) => { job.sp[id] = lv + 1; });
}

// SP for the next level of a node, or null at its max / unknown
export function nextCost(char, id) {
  const node = nodeIn(char, id), lv = levelOf(char, id);
  return !node || lv >= node.max ? null : cost(char.classId, id, node.kind, lv, lv + 1);
}
// the job's tree as rows per tab: { skill: [...], ult: [...], passive: [...], umum: [...] } of { id, def, max, level }
export function treeRows(char) {
  const C = CLASSES[char.classId], br = jobOf(char).branch, b = branchOf(char);
  const row = (def, kind, max) => ({ id: def.id, def, kind, max, level: levelOf(char, def.id), branch: !!b && (b.skills.includes(def) || b.ult === def || b.passives.includes(def)) });
  return {
    skill: skillPool(C, br).map((d) => row(d, 'skill', SKILL_MAX)), ult: ultsOf(char.classId, br).map((d) => row(d, 'ult', ULT_MAX)),
    passive: passivesOf(char.classId, br).map((d) => row(d, 'passive', d.max ?? PASSIVE_MAX)), umum: UMUM.map((d) => row(d, 'umum', d.max)),
  };
}

export const spRespecPrice = (char) => SP_RESPEC.base + SP_RESPEC.perLevel * char.level;
// Every SP back (this job only): the build returns to the two starting skills on A1 / A2.
export function respecSp(char, now) {
  const job = jobOf(char), fresh = newJob(char.classId, false);
  if (JSON.stringify(job.sp) === JSON.stringify(fresh.sp)) return { ok: false, reason: 'none' };
  const price = job.freeRespec ? 0 : spRespecPrice(char);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  return withJob(char, now, (j, c) => { c.gold -= price; Object.assign(j, { sp: fresh.sp, pages: fresh.pages, ult: null, freeRespec: false }); }); // the branch stays
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
  const node = nodeIn(char, id);
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
  const pool = skillPool(CLASSES[char.classId], jobOf(char).branch);
  return wornIds(char, page).map((id) => (id ? pool.find((s) => s.id === id) || null : null));
}
// The ultimate picked for key 5 (learned, level ≥ 1), or null
export function equippedUlt(char) {
  const job = jobOf(char);
  return job.ult && job.sp[job.ult] > 0 ? ultsOf(char.classId, job.branch).find((u) => u.id === job.ult) || null : null;
}
export function setUlt(char, id, now) {
  const node = nodeIn(char, id);
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
// job (and branch) passives × level, plus the branch's own signature changes (spec §43.10)
export function passiveFx(char) {
  const fx = {}, job = jobOf(char), sp = job.sp, b = branchOf(char);
  for (const p of passivesOf(char.classId, job.branch)) for (const [k, v] of Object.entries(p.fx || {})) fx[k] = (fx[k] || 0) + v * (sp[p.id] || 0);
  if (b) for (const [k, v] of Object.entries(b.fx)) fx[k] = (fx[k] || 0) + v;
  return fx;
}
// stat changes: [{ pct: {stat: k}, add: {stat: v} }] already × level — Umum talents, then passives
export function treeStats(char) {
  const sp = jobOf(char).sp, out = [];
  for (const u of UMUM) if (sp[u.id]) out.push({ pct: mul(u.pct, sp[u.id]), add: mul(u.add, sp[u.id]) });
  const job = jobOf(char), b = branchOf(char);
  for (const p of passivesOf(char.classId, job.branch)) if (sp[p.id] && (p.stat || p.add)) out.push({ pct: mul(p.stat, sp[p.id]), add: mul(p.add, sp[p.id]) });
  if (b?.add) out.push({ pct: {}, add: { ...b.add } }); // Penyihir Api's slower skills
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

// ─── picking & changing job (spec §43.1) ─────────────────────────────────────
export const jobChangePrice = (char) => Math.round((JOB_CHANGE.base + JOB_CHANGE.perLevel * char.level) * JOB_CHANGE.growth ** (char.jobChanges || 0));

// Into job `id`: its build comes back (or a fresh one, the first time, with a plain starting weapon of
// level = character level and one free SP reset); a weapon of another job comes off; attribute points
// are refunded. rng: for the weapon's rolls.
function enterJob(c, id, now, rng) {
  const first = !c.jobs?.[id];
  c.jobs ||= {};
  if (first) c.jobs[id] = newJob(id, true);
  const worn = c.inventory.find((it) => it.id === c.equipped.weapon);
  if (worn && worn.classId !== id) c.equipped.weapon = null;
  if (first) {
    const w = makeItem({ slot: 'weapon', classId: id, rarity: 0, itemLevel: c.level }, rng);
    c.inventory.push(w);
    if (!c.equipped.weapon) c.equipped.weapon = w.id;
  } else if (!c.equipped.weapon) { // wear the best weapon of this job already in the bag
    const best = c.inventory.filter((it) => it.slot === 'weapon' && it.classId === id).sort((a, b) => b.itemLevel - a.itemLevel || b.rarity - a.rarity)[0];
    if (best) c.equipped.weapon = best.id;
  }
  for (const k in c.attrs) c.attrs[k] = 0;
  c.classId = id; c.hp = null; c.updatedAt = now;
  return { ok: true, char: c };
}
// The first job: a Pengembara from JOB_PICK_LEVEL, free.
export function pickJob(char, id, now, rng = Math.random) {
  if (!JOB_IDS.includes(id)) return { ok: false, reason: 'bad' };
  if (char.classId !== 'novice') return { ok: false, reason: 'same' };
  if (char.level < JOB_PICK_LEVEL) return { ok: false, reason: 'locked' };
  if (!char.jobs?.[id] && char.inventory.length >= INVENTORY_MAX) return { ok: false, reason: 'bag' };
  return enterJob(structuredClone(char), id, now, rng);
}
// Another job later, at the Trainer in town: costs jobChangePrice, each change dearer.
export function changeJob(char, id, now, rng = Math.random) {
  if (!JOB_IDS.includes(id)) return { ok: false, reason: 'bad' };
  if (char.classId === 'novice') return { ok: false, reason: 'locked' };
  if (char.classId === id) return { ok: false, reason: 'same' };
  const price = jobChangePrice(char);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  if (!char.jobs?.[id] && char.inventory.length >= INVENTORY_MAX) return { ok: false, reason: 'bag' };
  const c = structuredClone(char);
  c.gold -= price; c.jobChanges = (c.jobChanges || 0) + 1;
  return enterJob(c, id, now, rng);
}

// ─── Job Lanjutan (spec §43.10) ──────────────────────────────────────────────
// The trial opens at BRANCH.level for a job without a branch; winning it lets the player pick one.
export const canTrial = (char) => char.classId !== 'novice' && char.level >= BRANCH.level && !jobOf(char).branch;
export const branchChangePrice = (char) => jobChangePrice(char) * BRANCH.changeMul;
// a branch's own nodes, to take off when it is left
const branchIds = (classId, id) => { const b = branchById(classId, id); return b ? [...b.skills, b.ult, ...b.passives].map((d) => d.id) : []; };
function setBranch(char, id, now, price) {
  return withJob(char, now, (j, c) => {
    const old = new Set(branchIds(c.classId, j.branch));
    c.gold -= price;
    for (const k of old) delete j.sp[k];
    j.pages = j.pages.map((p) => p.map((x) => (old.has(x) ? null : x)));
    if (!j.pages[0].some(Boolean)) j.pages[0][0] = newJob(c.classId).pages[0][0];
    if (old.has(j.ult)) j.ult = null;
    j.branch = id;
  });
}
// After winning the trial: the first branch is free.
export function pickBranch(char, id, now) {
  if (char.classId === 'novice') return { ok: false, reason: 'locked' };
  if (!branchById(char.classId, id)) return { ok: false, reason: 'bad' };
  if (jobOf(char).branch) return { ok: false, reason: 'same' };
  if (char.level < BRANCH.level) return { ok: false, reason: 'locked' };
  return setBranch(char, id, now, 0);
}
// The other branch, at the Trainer, without another trial: its SP come back, its skills come off.
export function changeBranch(char, id, now) {
  if (char.classId === 'novice' || !jobOf(char).branch) return { ok: false, reason: 'locked' };
  if (!branchById(char.classId, id)) return { ok: false, reason: 'bad' };
  if (jobOf(char).branch === id) return { ok: false, reason: 'same' };
  const price = branchChangePrice(char);
  if (char.gold < price) return { ok: false, reason: 'gold' };
  return setBranch(char, id, now, price);
}
export { branchesOf };
