// Focused ultimates (spec §43.5): out in under a second, a small area, about 1.8 × the wide ultimate on one
// target; a miss still empties the bar. A short glowing mark shows where it lands (run.focusMark); the hit
// itself shakes hard and slows time for a moment (run/run.js damageEnemy, h.focusHit).
//   leap    — jump to the aim point and slam (Murka full / Mengamuk: × (1 + rageBonus))
//   beam    — after aiming, a long straight beam hitting everything on the line once (full Bidik: a sure crit)
//   implode — a ball at the aim point pulls enemies in, then bursts (run/summons.js kind 'implode')
//   behind  — teleport behind the enemy nearest the aim point, `hits` slashes; executes normal foes below
//             `execute` of their HP; + perCombo per Kombo point (the Kombo is spent)
import { makeArea, makeProjectile } from './hits.js';

function aimPoint(run, maxDist) {
  let dx = run.aimPX - run.px, dy = run.aimPY - run.py;
  const d = Math.hypot(dx, dy);
  if (d > maxDist) { dx *= maxDist / d; dy *= maxDist / d; }
  return [run.px + dx, run.py + dy];
}
const ultHit = (run, h) => { h.skill = true; h.ult = true; h.focusHit = true; run.hits.push(h); return h; };

export function castFocus(run, s) {
  const angle = Math.atan2(run.aimY, run.aimX);
  if (s.move === 'leap') {
    const [x, y] = aimPoint(run, s.maxDist), dist = Math.hypot(x - run.px, y - run.py) || 1;
    run.dodgeX = (x - run.px) / dist; run.dodgeY = (y - run.py) / dist;
    run.dodgeT = s.delay; run.dashSpeed = dist / s.delay; run.skillDash = true;
    run.dodgeInv = Math.max(run.dodgeInv, s.delay + 0.1);
    const rage = run.trait && CLASSES_RAGE(run) ? 1 + s.rageBonus : 1;
    ultHit(run, makeArea({ x, y, r: s.r, mult: s.mult * rage, freeze: s.freeze, fx: s.look, delay: s.delay, duration: 0.3 })).knock = 200;
    run.focusMark = { x, y, r: s.r, t: s.delay, max: s.delay };
  } else if (s.move === 'beam') {
    const p = ultHit(run, makeProjectile({ x: run.px, y: run.py, angle, speed: 4000, range: s.len, r: s.w / 2, mult: s.mult, pierce: Infinity, fx: s.look, delay: s.delay }));
    if (run.trait?.focus) { p.crit = true; run.trait.focus = false; run.trait.v = 0; } // full Bidik
    run.focusMark = { x: run.px, y: run.py, angle, len: s.len, w: s.w, t: s.delay, max: s.delay };
  } else if (s.move === 'implode') {
    const [x, y] = aimPoint(run, s.maxDist);
    run.summons ||= [];
    run.summons.push({ kind: 'implode', x, y, t: s.delay, max: s.delay, s });
    run.focusMark = { x, y, r: s.pullR, t: s.delay, max: s.delay };
  } else if (s.move === 'behind') {
    let best = null, bd = Infinity;
    for (const e of run.enemies) {
      if (e.hp <= 0 || e.hidden || (e.x - run.px) ** 2 + (e.y - run.py) ** 2 > s.range ** 2) continue;
      const d = (e.x - run.aimPX) ** 2 + (e.y - run.aimPY) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return; // a miss: the bar is spent all the same
    const dx = best.x - run.px, dy = best.y - run.py, d = Math.hypot(dx, dy) || 1;
    run.px = best.x + (dx / d) * (best.r + 18); run.py = best.y + (dy / d) * (best.r + 18);
    run.dodgeInv = Math.max(run.dodgeInv, s.delay + 0.2);
    let k = 1;
    if (run.trait && run.classId === 'assassin') { k += s.perCombo * run.trait.v; run.trait.v = 0; run.trait.hits = 0; }
    for (let i = 0; i < s.hits; i++) {
      const h = ultHit(run, makeArea({ x: best.x, y: best.y, r: s.r, mult: (s.mult / s.hits) * k, fx: s.look, delay: i * (s.delay / s.hits), duration: 0.1 }));
      h.execute = s.execute;
    }
    run.focusMark = { x: best.x, y: best.y, r: s.r, t: s.delay, max: s.delay };
  }
}
// Murka full (or Mengamuk on) for the Warrior's leap
const CLASSES_RAGE = (run) => run.trait.on > 0 || run.trait.v >= 100;
