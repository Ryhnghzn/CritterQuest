// Player movement, aim and dodge (spec §4.2, §5.1). Operates on the run state;
// `intent` comes from the input layer once per fixed step:
//   { move: {x, y} (length ≤ 1), aimAt: {x, y} world point | null (auto-aim), dodge: bool }
import { WORLD_R, DODGE, AUTO_AIM_RANGE } from '../data/balance.js';
import { sfx } from '../core/audio.js';

const DODGE_SPEED = DODGE.distance / DODGE.duration;

export function stepPlayer(run, intent, dt) {
  const mx = intent.move.x, my = intent.move.y;
  const moving = mx * mx + my * my > 0.0001;
  run.moveX = mx; run.moveY = my;

  // aim: mouse point, else nearest enemy in range, else movement, else keep
  let ax = 0, ay = 0;
  if (intent.aimAt) { ax = intent.aimAt.x - run.px; ay = intent.aimAt.y - run.py; }
  else {
    const e = run.nearestEnemy(AUTO_AIM_RANGE);
    if (e) { ax = e.x - run.px; ay = e.y - run.py; }
    else if (moving) { ax = mx; ay = my; }
  }
  const al = Math.hypot(ax, ay);
  if (al > 0.001) { run.aimX = ax / al; run.aimY = ay / al; }

  // dodge
  if (run.dodgeCd > 0) run.dodgeCd -= dt;
  if (intent.dodge && run.dodgeCd <= 0 && run.dodgeT <= 0) {
    const ml = Math.hypot(mx, my);
    run.dodgeX = moving ? mx / ml : run.aimX;
    run.dodgeY = moving ? my / ml : run.aimY;
    run.dodgeT = DODGE.duration;
    run.dodgeCd = DODGE.cooldown;
    run.dodgeInv = DODGE.invuln;
    sfx.dodge();
  }
  if (run.dodgeInv > 0) run.dodgeInv -= dt; // the dodge frame itself counts

  if (run.dodgeT > 0) {
    const step = Math.min(dt, run.dodgeT);
    run.px += run.dodgeX * DODGE_SPEED * step;
    run.py += run.dodgeY * DODGE_SPEED * step;
    run.dodgeT -= dt;
  } else {
    run.px += mx * run.stats.moveSpd * dt;
    run.py += my * run.stats.moveSpd * dt;
  }

  const d = Math.hypot(run.px, run.py);
  if (d > WORLD_R) { run.px *= WORLD_R / d; run.py *= WORLD_R / d; }
}
