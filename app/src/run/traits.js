// Class signature mechanics (spec §31): one bar / counter per class, living for one trip.
// Pure logic, no DOM, no RNG, no per-frame allocation (traitMods returns one reused object).
// Only 'rage' (Warrior) exists so far; other kinds plug into the switches below.
import { CLASSES } from '../data/classes.js';
import { tr } from '../i18n.js';

const MODS = { arcR: 0, arcDeg: 0, lifesteal: 0, dmgTaken: 1, skillDmg: 0, locked: false, slow: 0, slowImmune: false };

function cfg(run) { return CLASSES[run.classId].trait || null; }

export function initTrait(run) {
  run.trait = { v: 0, idle: 0, on: 0, lock: 0, hits: 0, focus: false };
}

// moving / attacking are for kinds that care (Heat, Focus); Rage ignores them.
export function traitStep(run, dt, moving, attacking) {
  const c = cfg(run), t = run.trait;
  if (!c || !t) return;
  switch (c.id) {
    case 'rage':
      if (t.on > 0) {
        t.on -= dt;
        if (t.on <= 0) { t.on = 0; run.applyBuffs(); }
      } else if (t.v > 0) {
        t.idle += dt;
        const over = t.idle - c.idleAfter;
        if (over > 0) t.v = Math.max(0, t.v - c.decay * Math.min(dt, over));
      }
      break;
  }
}

function rageAdd(run, c, n) {
  const t = run.trait;
  t.idle = 0;
  if (t.on > 0) return;
  t.v = Math.min(c.max, t.v + n);
  if (t.v >= c.max) {
    t.v = 0; t.on = c.frenzy.duration;
    run.showBanner(tr('MENGAMUK!'));
    run.applyBuffs();
  }
}

// Called once per enemy struck by a basic attack.
export function traitBasicHit(run) {
  const c = cfg(run);
  if (!c || !run.trait) return;
  if (c.id === 'rage') rageAdd(run, c, c.perHit);
}

// After the damage was reduced by the shield.
export function traitHurt(run, dmg) {
  const c = cfg(run);
  if (!c || !run.trait) return;
  if (c.id === 'rage') rageAdd(run, c, (dmg / run.stats.maxHp) * 100 * c.perHurtPct);
  else if (dmg > 0) run.trait.idle = 0;
}

// Damage multiplier for the hits of a skill that was just cast.
export function traitCast(run, skill) {
  return 1;
}

export function traitLevel(run) {
  const c = cfg(run), t = run.trait;
  if (!c || !t) return 0;
  if (c.id === 'rage') return t.on > 0 ? t.on / c.frenzy.duration : t.v / c.max;
  return 0;
}

export function traitMods(run) {
  const c = cfg(run), a = CLASSES[run.classId].attack, m = MODS;
  m.arcR = a.r; m.arcDeg = a.arc; m.lifesteal = 0; m.dmgTaken = 1; m.skillDmg = 0;
  m.locked = false; m.slow = 0; m.slowImmune = false;
  if (c && run.trait && c.id === 'rage') {
    const k = run.trait.v / c.max;
    m.arcR = c.arcR[0] + (c.arcR[1] - c.arcR[0]) * k;
    m.arcDeg = c.arcDeg[0] + (c.arcDeg[1] - c.arcDeg[0]) * k;
    m.lifesteal = c.lifesteal * k;
    m.dmgTaken = 1 - c.dmgTaken * k;
    m.slowImmune = run.trait.on > 0;
  }
  return m;
}
