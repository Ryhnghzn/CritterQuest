// Class signature mechanics (spec §31): one bar / counter per class, living for one trip.
// Pure logic, no DOM, no RNG, no per-frame allocation (traitMods returns one reused object).
// Kinds: 'rage' (Warrior), 'heat' (Mage), 'focus' (Archer), 'combo' (Assassin).
import { CLASSES } from '../data/classes.js';
import { tr } from '../i18n.js';
import { frenzyFx } from './skillfx.js';

const MODS = { arcR: 0, arcDeg: 0, lifesteal: 0, dmgTaken: 1, skillDmg: 0, locked: false, slow: 0, slowImmune: false };

let castExecute = 0; // execute threshold of the skill cast last (Combo at max), 0 = none

function cfg(run) { return CLASSES[run.classId].trait || null; }

export function initTrait(run) {
  run.trait = { v: 0, idle: 0, on: 0, lock: 0, hits: 0, focus: false };
}

// moving (input or dodge) / attacking are for Focus; Heat, Combo and Rage ignore them.
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
    case 'heat':
      if (t.lock > 0) { t.lock -= dt; if (t.lock < 0) t.lock = 0; } // overheated: the bar sits at 0 until it ends
      else if (t.v > 0) t.v = Math.max(0, t.v - c.decay * dt);
      break;
    case 'focus':
      if (moving) { t.v = 0; t.focus = false; }
      else if (attacking && !t.focus) {
        t.v = Math.min(c.max, t.v + c.rate * dt);
        if (t.v >= c.max) t.focus = true;
      }
      break;
    case 'combo':
      if (t.v > 0 || t.hits > 0) {
        t.idle += dt;
        if (t.idle >= c.idleAfter) { t.v = 0; t.hits = 0; }
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
    run.slowT = 0; // Mengamuk shrugs off an active slow
    run.showBanner(tr('MENGAMUK!'));
    run.applyBuffs();
    if (run.vfx) frenzyFx(run); // spec §31.8 (test stand-ins have no vfx)
  }
}

// Any damage the player deals (skills, ult, waves too): only restarts the decay timer, never adds to the bar.
export function traitDealt(run) {
  if (run.trait) run.trait.idle = 0;
}

// Called once per enemy struck by a basic attack.
export function traitBasicHit(run) {
  const c = cfg(run);
  if (!c || !run.trait) return;
  if (c.id === 'rage') rageAdd(run, c, c.perHit);
  else if (c.id === 'combo') {
    const t = run.trait;
    t.idle = 0;
    if (++t.hits >= c.hitsPer) { t.hits = 0; t.v = Math.min(c.max, t.v + 1); }
  }
}

// After the damage was reduced by the shield.
export function traitHurt(run, dmg) {
  const c = cfg(run);
  if (!c || !run.trait) return;
  if (c.id === 'rage') rageAdd(run, c, (dmg / run.stats.maxHp) * 100 * c.perHurtPct);
  else if (dmg > 0 && c.id !== 'combo') run.trait.idle = 0; // taking a hit is no attack: Combo keeps counting down
}

// Archer: true once when the bar is full (the next basic arrow is the focus shot); empties the bar.
export function traitFocusShot(run) {
  const t = run.trait;
  if (!t || !t.focus) return false;
  t.focus = false; t.v = 0;
  return true;
}

// Execute threshold (fraction of max HP) for the hits of the skill cast last; 0 = none. Read right after traitCast.
export function traitCastExecute() { return castExecute; }

// Called for every skill cast (not the ultimate). Returns the damage multiplier for that skill's hits.
export function traitCast(run, skill) {
  castExecute = 0;
  const c = cfg(run), t = run.trait;
  if (!c || !t) return 1;
  switch (c.id) {
    case 'heat':
      t.v += skill.cost * c.perCost;
      if (t.v >= c.max) {
        t.v = 0; t.lock = c.overheat.duration;
        run.showBanner(tr('KEPANASAN!'));
      }
      return 1;
    case 'focus':
      if (skill.id === 'leap') { t.v = c.max; t.focus = true; } // Lompatan Mundur fills the bar
      return 1;
    case 'combo': {
      const n = t.v;
      if (n >= c.max) castExecute = c.executeBelow;
      t.v = 0; t.hits = 0;
      return 1 + c.perPoint * n;
    }
  }
  return 1;
}

export function traitLevel(run) {
  const c = cfg(run), t = run.trait;
  if (!c || !t) return 0;
  if (c.id === 'rage') return t.on > 0 ? t.on / c.frenzy.duration : t.v / c.max;
  if (c.id === 'heat' && t.lock > 0) return t.lock / c.overheat.duration;
  return t.v / c.max;
}

export function traitMods(run) {
  const c = cfg(run), a = CLASSES[run.classId].attack, m = MODS;
  m.arcR = a.r; m.arcDeg = a.arc; m.lifesteal = 0; m.dmgTaken = 1; m.skillDmg = 0;
  m.locked = false; m.slow = 0; m.slowImmune = false;
  if (c && run.trait && c.id === 'rage') {
    const k = run.trait.on > 0 ? 1 : run.trait.v / c.max; // Mengamuk = peak values
    m.arcR = c.arcR[0] + (c.arcR[1] - c.arcR[0]) * k;
    m.arcDeg = c.arcDeg[0] + (c.arcDeg[1] - c.arcDeg[0]) * k;
    m.lifesteal = c.lifesteal * k;
    m.dmgTaken = 1 - c.dmgTaken * k;
    m.slowImmune = run.trait.on > 0;
  } else if (c && run.trait && c.id === 'heat') {
    const t = run.trait;
    if (t.lock > 0) { m.locked = true; m.slow = c.overheat.slow; }
    else m.skillDmg = c.skillDmg * Math.min(1, t.v / c.bonusAt);
  }
  return m;
}
