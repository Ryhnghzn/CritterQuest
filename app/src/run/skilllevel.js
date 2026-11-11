// Skill levels (spec §43.2, §43.4): a skill definition + its level → the definition used in the run.
// Damage (every `mult`, nested ones too) +12% per level above 1 (ultimates +15%); from level 3 the
// skill's `lv3` patch applies, at level 5 its `lv5` patch too (patches merge deep: nested numbers are
// replaced, the rest kept). Ultimates at level 3: the wide one (Luas) lasts 0.5 s longer, the focused
// one (Fokus, part F) hits a 20% wider area. Pure — never changes `def`.
import { LEVEL_DMG, ULT_LEVEL_DMG } from '../data/skilltree.js';
import { makeProjectile } from './hits.js';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v;
  return out;
}
function scaleMults(o, k) {
  for (const [key, v] of Object.entries(o)) {
    if (key === 'mult' && typeof v === 'number') o[key] = v * k;
    else if (isObj(v)) scaleMults(v, k);
  }
}

export function leveled(def, level = 1, ult = false) {
  if (!def) return def;
  const lv = Math.max(1, level | 0);
  let d = { ...def };
  delete d.lv3; delete d.lv5;
  if (lv >= 3 && def.lv3) d = merge(d, def.lv3);
  if (lv >= 5 && def.lv5) d = merge(d, def.lv5);
  d = structuredClone(d);
  if (lv > 1) scaleMults(d, 1 + (ult ? ULT_LEVEL_DMG : LEVEL_DMG) * (lv - 1));
  if (ult && lv >= 3) {
    if (d.focus) d.r *= 1.2;
    else if (d.duration) d.duration += 0.5;
  }
  d.level = lv;
  return d;
}

// How long a Kabut Racun L5 mark lasts after its last tick (the mist re-marks while the foe stays in it).
export const VULN_TIME = 0.6;

// An enemy just died: a frozen one shatters while Nova Es L5 is fresh; a kill stretches Naluri Pembunuh L5.
export function levelDeath(run, e) {
  if (run.shatterT > 0 && e.frozen > 0 && run.shatter) {
    const s = run.shatter;
    for (let k = 0; k < s.count; k++) {
      const p = makeProjectile({ x: e.x, y: e.y, angle: (k / s.count) * Math.PI * 2 + 0.4, speed: s.speed, range: s.range, r: s.r, mult: s.mult, fx: 'shard' });
      p.skill = true; p.part = 'split';
      run.hits.push(p);
    }
  }
  const b = run.skillBuffT > 0 && run.skillBuff;
  if (b?.killExtend && b.extended < b.killExtend.max) {
    const add = Math.min(b.killExtend.per, b.killExtend.max - b.extended);
    b.extended += add; run.skillBuffT += add; run.buffT = Math.max(run.buffT, run.skillBuffT);
  }
}
