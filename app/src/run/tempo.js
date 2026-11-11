// Tempo skills (spec §43.4, §43.7): skills that are held instead of tapped, and the parry.
//   charge  — hold: the power fills over `full` s; let go: a frontal slash from r → rMax, mult → mult × peak;
//             at full it knocks far and breaks a Berlapis shield. Right click (intent.cancel) lets it go unused.
//   channel — hold up to `max` s: a cone (shape 'cone') or a beam (shape 'beam') every 1/rate s; energy drains
//             `drain`/s; the hero moves slower (`slow`); stops on release, empty energy, `max`, overheating.
//   parry   — a window of `window` s (cast like any skill): the next hit is cancelled and answered with a
//             blast (r, mult, knock) and Murka; with `reflect` an enemy shot flies back.
// State: run.held = { i, page, s, t, tick } while held; run.parryT / run.parryDef. Pure logic on the run.
import { makeArea, makeProjectile } from './hits.js';
import { traitRage, traitHeat, traitMods } from './traits.js';
import { tr } from '../i18n.js';

export const isHeld = (s) => !!s && (s.kind === 'charge' || s.kind === 'channel');

// The key went down (energy for the start already paid by run/skills.js).
export function beginHeld(run, i, s) {
  run.held = { i, page: run.page || 0, s, t: 0, tick: 0 };
  run.heldSlow = s.slow || 0;
}

// Ends the hold: its cooldown starts now. fired = whether a charge was let go (not cancelled).
function endHeld(run) {
  const h = run.held;
  run.held = null; run.heldSlow = 0;
  const cds = run.pageCd || [run.skillCd], maxes = run.pageCdMax || [run.skillCdMax];
  cds[h.page][h.i] = maxes[h.page][h.i];
}
export function cancelHeld(run) { if (run.held) endHeld(run); }

const aimAngle = (run) => Math.atan2(run.aimY, run.aimX);
function skillHit(run, h) { h.skill = true; run.hits.push(h); return h; }

// Once per step, before the skills (run/skills.js stepSkills). held[i]: is skill key i still down.
export function stepHeld(run, intent, dt) {
  if (run.parryT > 0) run.parryT -= dt;
  const H = run.held;
  if (!H) return;
  if (intent.cancel || (run.page || 0) !== H.page) { endHeld(run); return; } // right click / page swapped: nothing fires
  const s = H.s, down = !!intent.held?.[H.i];
  H.t += dt;
  if (s.kind === 'charge') {
    if (!H.full && H.t >= s.full) { H.full = true; run.addShake?.('light'); run.spawnBurst?.(run.px, run.py, '#ffd27a', 12); } // full: a flash
    if (!down) { releaseCharge(run, s, Math.min(1, H.t / s.full)); endHeld(run); }
    return;
  }
  // channel
  if (!down || H.t >= s.max || run.energy <= 0 || traitMods(run).locked) { endHeld(run); return; }
  run.energy = Math.max(0, run.energy - s.drain * dt);
  if (s.heat) traitHeat(run, s.heat * dt);
  H.tick -= dt;
  while (H.tick <= 0) {
    H.tick += 1 / s.rate;
    const a = aimAngle(run);
    if (s.shape === 'beam') {
      const wide = s.wideLast && H.t >= s.max - 1 ? s.wideLast : 1; // Sinar Panah L5: the last second twice as wide
      const n = Math.ceil(s.len / s.w);
      for (let k = 0; k < n; k++) { const d = (k + 0.5) * s.w; const hit = skillHit(run, makeArea({ x: run.px + Math.cos(a) * d, y: run.py + Math.sin(a) * d, r: (s.w * wide) / 2 + 4, mult: s.mult, fx: s.look || 'pierce', duration: 0.08 })); hit.beam = true; }
    } else {
      const hit = skillHit(run, makeArea({ x: run.px, y: run.py, r: s.r, angle: a, arc: s.arc, mult: s.mult, fx: s.look || 'fireball', duration: 0.08 }));
      if (s.burn) hit.burn = s.burn; // Semburan Api L5 (run/run.js damageEnemy)
    }
  }
}

function releaseCharge(run, s, p) {
  const full = p >= 1;
  const hit = skillHit(run, makeArea({ x: run.px, y: run.py, r: s.r + (s.rMax - s.r) * p, angle: aimAngle(run), arc: s.arc, mult: s.mult * (1 + (s.peak - 1) * p), fx: s.look || 'slash' }));
  hit.knock = full ? s.fullKnock : s.knock * p;
  if (full) { hit.breakShield = true; run.addShake?.('big'); run.addHitStop?.('crit'); }
}

// A parry window opens (castSkill 'parry').
export function openParry(run, s) { run.parryT = s.window; run.parryDef = s; }

// hurtPlayer asks first: true = the hit is parried (cancelled). src: the shot / hazard (unparryable ones get through).
export function tryParry(run, src) {
  if (!(run.parryT > 0) || src?.unparryable) return false;
  const s = run.parryDef;
  run.parryT = 0;
  const wave = skillHit(run, makeArea({ x: run.px, y: run.py, r: s.r, mult: s.mult, fx: 'shout', duration: 0.35 }));
  wave.knock = s.knock || 0;
  if (s.rage) traitRage(run, s.rage);
  run.addHitStop?.('crit'); run.addShake?.('medium');
  run.addFloater?.(run.px, run.py - 40, tr('TANGKIS!'), '#ffd27a');
  if (src && src.vx !== undefined && src.life !== undefined) { // an enemy shot: stopped, or (L5) sent back
    if (s.reflect) skillHit(run, makeProjectile({ x: src.x, y: src.y, angle: Math.atan2(-src.vy, -src.vx), speed: Math.hypot(src.vx, src.vy) * 1.6, range: 600, r: src.r + 2, mult: s.mult * 0.5, fx: 'shard' }));
    src.life = 0;
  }
  return true;
}
