// Class attacks (spec §4.2). Basic attack while the attack input is held;
// skills Q/E arrive in langkah 3D.
import { CLASSES } from '../data/classes.js';
import { makeArea, makeProjectile } from './hits.js';
import { sfx } from '../core/audio.js';

export const ATTACK_POSE = 0.15; // seconds the doll shows its attack pose

export function stepAttack(run, intent, dt) {
  if (run.attackT > 0) run.attackT -= dt;
  // only counts down to just below zero, so holding the button keeps an exact cadence
  if (run.atkCd > 0) run.atkCd -= dt;
  if (!intent.attack || run.atkCd > 0) return;

  const a = CLASSES[run.classId].attack;
  run.atkCd += a.interval / run.stats.atkSpd;
  run.attackT = ATTACK_POSE;
  const angle = Math.atan2(run.aimY, run.aimX);
  if (a.kind === 'arc') {
    run.hits.push(makeArea({ x: run.px, y: run.py, r: a.r, angle, arc: a.arc, mult: a.mult, fx: a.fx }));
  } else {
    run.hits.push(makeProjectile({
      x: run.px + run.aimX * 8, y: run.py + run.aimY * 8, angle,
      speed: a.speed, range: a.range, r: a.r, mult: a.mult, pierce: a.pierce, explode: a.explode, fx: a.fx,
    }));
  }
  sfx.attack(a.fx);
}
