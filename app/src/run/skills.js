// Class attacks (spec §4.2): the basic attack (held, or automatic in auto mode)
// and the two skills Q / E with cooldowns reduced by cdr.
import { CLASSES } from '../data/classes.js';
import { AUTO_ATTACK_MARGIN, CDR_MAX } from '../data/balance.js';
import { makeArea, makeSweep, makeProjectile } from './hits.js';
import { sfx } from '../core/audio.js';

export const ATTACK_POSE = 0.15; // seconds the doll shows its attack pose
const DEG = Math.PI / 180;

// How close an enemy must be before auto mode bothers attacking.
function attackReach(a) { return a.kind === 'arc' ? a.r + AUTO_ATTACK_MARGIN : a.range; }

export function skillCooldown(stats, skill) {
  return skill.cd * (1 - Math.min(stats.cdr, CDR_MAX) / 100);
}

export function stepAttack(run, intent, dt) {
  if (run.attackT > 0) run.attackT -= dt;
  // only counts down to just below zero, so holding the button keeps an exact cadence
  if (run.atkCd > 0) run.atkCd -= dt;
  if (run.atkCd > 0) return;
  const a = CLASSES[run.classId].attack;
  const want = intent.attack || (intent.auto && run.nearestEnemy(attackReach(a)) !== null);
  if (!want) return;

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

export function stepSkills(run, intent, dt) {
  for (let i = 0; i < 2; i++) if (run.skillCd[i] > 0) run.skillCd[i] -= dt;
  if (run.buffT > 0) { run.buffT -= dt; if (run.buffT <= 0) run.dmgTakenMul = 1; }
  const skills = CLASSES[run.classId].skills;
  const pressed = [intent.skill1, intent.skill2];
  for (let i = 0; i < 2; i++) {
    if (!pressed[i] || run.skillCd[i] > 0) continue;
    run.skillCdMax[i] = skillCooldown(run.stats, skills[i]);
    run.skillCd[i] = run.skillCdMax[i];
    castSkill(run, skills[i]);
    run.attackT = ATTACK_POSE;
    sfx.skill(skills[i].id);
  }
}

function castSkill(run, s) {
  const angle = Math.atan2(run.aimY, run.aimX);
  switch (s.kind) {
    case 'area': {
      let x = run.px, y = run.py;
      if (s.at === 'aim') {
        let dx = run.aimPX - run.px, dy = run.aimPY - run.py;
        const d = Math.hypot(dx, dy);
        if (d > s.maxDist) { dx *= s.maxDist / d; dy *= s.maxDist / d; }
        x += dx; y += dy;
      }
      run.hits.push(makeArea({
        x, y, r: s.r, mult: s.mult, ticks: s.ticks ?? 1, duration: s.duration ?? 0,
        follow: !!s.follow, freeze: s.freeze ?? 0, fx: s.id,
      }));
      break;
    }
    case 'proj':
      run.hits.push(makeProjectile({
        x: run.px + run.aimX * 8, y: run.py + run.aimY * 8, angle,
        speed: s.speed, range: s.range, r: s.r, mult: s.mult, pierce: s.pierce, fx: s.id,
      }));
      break;
    case 'fan':
      for (let k = 0; k < s.count; k++) {
        const a = angle + (k / (s.count - 1) - 0.5) * s.spread * DEG;
        run.hits.push(makeProjectile({
          x: run.px, y: run.py, angle: a, speed: s.speed, range: s.range, r: s.r, mult: s.mult, fx: 'dagger',
        }));
      }
      break;
    case 'chain':
      chain(run, s);
      break;
    case 'dash':
      run.dodgeT = s.duration;
      run.dashSpeed = s.distance / s.duration;
      run.dodgeX = run.aimX; run.dodgeY = run.aimY;
      run.dodgeInv = Math.max(run.dodgeInv, s.duration + 0.1);
      run.hits.push(makeSweep({ x: run.px, y: run.py, r: s.r, mult: s.mult, duration: s.duration + 0.05, follow: true, fx: s.id }));
      break;
    case 'buff':
      run.buffT = s.duration;
      run.dmgTakenMul = s.dmgTaken;
      break;
    default:
      throw new Error(`unknown skill kind ${s.kind}`);
  }
}

// Petir Berantai: first target = enemy nearest the aim point within range,
// then each jump goes to the nearest enemy not yet struck.
function chain(run, s) {
  let cur = null, best = Infinity;
  for (const e of run.enemies) {
    if (e.hp <= 0 || Math.hypot(e.x - run.px, e.y - run.py) > s.range) continue;
    const d = Math.hypot(e.x - run.aimPX, e.y - run.aimPY);
    if (d < best) { best = d; cur = e; }
  }
  const struck = new Set();
  const hit = { mult: s.mult, freeze: 0, fx: 'chain' };
  let fx = run.px, fy = run.py;
  for (let i = 0; i < s.count && cur; i++) {
    run.damageEnemy(hit, cur);
    struck.add(cur);
    run.spawnLightning(fx, fy, cur.x, cur.y);
    fx = cur.x; fy = cur.y;
    let next = null, bd = s.jump;
    for (const e of run.enemies) {
      if (e.hp <= 0 || struck.has(e)) continue;
      const d = Math.hypot(e.x - fx, e.y - fy);
      if (d < bd) { bd = d; next = e; }
    }
    cur = next;
  }
}
