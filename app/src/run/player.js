// Player movement, aim and dodge (spec §4.2, §5.1). Operates on the run state;
// `intent` comes from the input layer once per fixed step:
//   { move: {x, y} (length ≤ 1), aimAt: {x, y} world point | null (auto-aim), dodge: bool, … }
// Also keeps run.aimPX/aimPY: the world point skills target (mouse, auto target, or ahead).
import { DODGE, AUTO_AIM_RANGE, TEMPO } from '../data/balance.js';
import { PASSIVE_RULES } from '../data/skilltree.js';
import { confinePlayer } from './dungeon.js';
import { confineFieldPlayer } from './field.js';
import { sfx } from '../core/audio.js';
import { traitMods } from './traits.js';
import { freshMount, mountSpeedMul } from './mount.js';

const NONE = freshMount(null); // runs built without reset() (tests)

const DODGE_SPEED = DODGE.distance / DODGE.duration;
const AIM_AHEAD = 120; // skill target point when there is nothing to aim at

export function stepPlayer(run, intent, dt) {
  const mx = intent.move.x, my = intent.move.y;
  const moving = mx * mx + my * my > 0.0001;
  run.moveX = mx; run.moveY = my;

  // aim: mouse point, else nearest enemy in range, else movement, else keep
  let ax = 0, ay = 0, point = null;
  if (intent.aimAt) point = intent.aimAt;
  else {
    const e = run.nearestEnemy(AUTO_AIM_RANGE);
    if (e) point = e;
    else if (moving) { ax = mx; ay = my; }
  }
  if (point) { ax = point.x - run.px; ay = point.y - run.py; }
  const al = Math.hypot(ax, ay);
  if (al > 0.001) { run.aimX = ax / al; run.aimY = ay / al; }
  run.aimPX = point ? point.x : run.px + run.aimX * AIM_AHEAD;
  run.aimPY = point ? point.y : run.py + run.aimY * AIM_AHEAD;

  // dodge
  if (run.dodgeCd > 0) run.dodgeCd -= dt;
  if (intent.dodge && run.dodgeCd <= 0 && run.dodgeT <= 0) {
    const ml = Math.hypot(mx, my);
    run.dodgeX = moving ? mx / ml : run.aimX;
    run.dodgeY = moving ? my / ml : run.aimY;
    run.dodgeT = DODGE.duration;
    run.dashSpeed = DODGE_SPEED;
    run.skillDash = false; // a real dodge (clears Bidik), unlike a skill dash
    run.dodgeCd = DODGE.cooldown * run.dodgeCdMul;
    run.dodgeInv = DODGE.invuln;
    if (run.fx?.dodgeCrit) run.closeCallT = PASSIVE_RULES.closeCall.time; // Lolos Tipis (spec §43.3)
    sfx.dodge();
  }
  if (run.dodgeInv > 0) run.dodgeInv -= dt; // the dodge frame itself counts
  if (run.closeCallT > 0) run.closeCallT -= dt;

  if (run.dodgeT > 0) {
    const step = Math.min(dt, run.dodgeT);
    run.px += run.dodgeX * run.dashSpeed * step;
    run.py += run.dodgeY * run.dashSpeed * step;
    run.dodgeT -= dt;
  } else {
    const spd = run.stats.moveSpd * TEMPO.move * mountSpeedMul(run.mount ?? NONE) * (run.slowT > 0 ? 1 - run.slowK : 1) * (1 - traitMods(run).slow); // frost slows (spec §25.4), Kepanasan too (§31.3)
    run.px += mx * spd * dt;
    run.py += my * spd * dt;
  }

  if (run.field) confineFieldPlayer(run); else confinePlayer(run);
}
