// Things a tempo skill leaves in the arena (spec §43.4): run.summons = [{ kind, x, y, t, s, … }].
//   turret — an arrow tower: shoots the nearest enemy within `range` every `every` s for `life` s (`maxN` at once)
//   clone  — a shadow of the hero: slashes around itself like a basic attack (× `mult`) every `every` s for
//            `life` s; half the enemies near it chase it instead (run/run.js decoyFor), unless the hero is
//            closer than DECOY_IGNORE to that enemy; level 5 bursts at the end
//   rune   — a delayed blast: after `fuse` s, `mult` × (1 + bonus) in area `r`; every hit the hero lands on an
//            enemy inside it adds `perHit` (up to `maxBonus`); level 5 drops a second, smaller rune
// Pure logic on the run state.
import { makeArea, makeProjectile } from './hits.js';

export const DECOY_IGNORE = 80;
const skillHit = (run, h) => { h.skill = true; run.hits.push(h); return h; };

// place one (castSkill); x, y: the aim point (turret, rune) or the hero (clone)
export function summon(run, s, x, y) {
  run.summons ||= [];
  if (s.kind === 'turret') {
    const mine = run.summons.filter((m) => m.kind === 'turret');
    if (mine.length >= s.maxN) run.summons.splice(run.summons.indexOf(mine[0]), 1); // the oldest goes
    run.summons.push({ kind: 'turret', x, y, t: s.life, max: s.life, cd: 0, s });
  } else if (s.kind === 'clone') {
    for (const m of run.summons) if (m.kind === 'clone') m.t = 0; // one clone at a time
    run.summons.push({ kind: 'clone', x, y, t: s.life, max: s.life, cd: 0, s, id: Math.random() });
  } else if (s.kind === 'rune') {
    run.summons.push({ kind: 'rune', x, y, t: s.fuse, max: s.fuse, bonus: 0, r: s.r, mult: s.mult, s });
    if (s.second) run.summons.push({ kind: 'rune', x, y, t: s.fuse + s.second.delay, max: s.fuse + s.second.delay, bonus: 0, r: s.second.r, mult: s.second.mult, s });
  }
}

function nearest(run, x, y, range) {
  let best = null, bd = range * range;
  for (const e of run.enemies) {
    if (e.hp <= 0 || e.hidden) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

export function stepSummons(run, dt) {
  const S = run.summons;
  if (!S?.length) return;
  for (let i = S.length - 1; i >= 0; i--) {
    const m = S[i], s = m.s;
    m.t -= dt;
    if (m.kind === 'turret' && m.t > 0 && (m.cd -= dt) <= 0) {
      const e = nearest(run, m.x, m.y, s.range);
      if (e) {
        m.cd = s.every;
        skillHit(run, makeProjectile({ x: m.x, y: m.y - 10, angle: Math.atan2(e.y - m.y, e.x - m.x), speed: s.speed, range: s.range + 40, r: s.r, mult: s.mult, pierce: s.pierce || 0, fx: 'arrow' }));
      }
    }
    if (m.kind === 'clone' && m.t > 0 && (m.cd -= dt) <= 0) {
      m.cd = s.every;
      const e = nearest(run, m.x, m.y, s.r + 40);
      if (e) skillHit(run, makeArea({ x: m.x, y: m.y, r: s.r, angle: Math.atan2(e.y - m.y, e.x - m.x), arc: s.arc, mult: s.mult, fx: 'stab' }));
    }
    if (m.t > 0) continue;
    if (m.kind === 'rune') { skillHit(run, makeArea({ x: m.x, y: m.y, r: m.r, mult: m.mult * (1 + m.bonus), fx: 'boom', duration: 0.35 })); run.addShake?.('medium'); }
    if (m.kind === 'clone' && s.endBlast) skillHit(run, makeArea({ x: m.x, y: m.y, r: s.endBlast.r, mult: s.endBlast.mult, fx: 'shadow', duration: 0.35 }));
    S.splice(i, 1);
  }
}

// A hit of the hero landed on e: runes holding e grow (not the runes' own blasts)
export function runeFeed(run, e, h) {
  if (!run.summons?.length || h.fx === 'boom') return;
  for (const m of run.summons) {
    if (m.kind !== 'rune' || (e.x - m.x) ** 2 + (e.y - m.y) ** 2 > m.r * m.r) continue;
    m.bonus = Math.min(m.s.maxBonus, m.bonus + m.s.perHit);
  }
}

// The clone an enemy chases instead of the hero, or null: every other enemy near a clone, unless the hero is close.
export function decoyFor(run, e, index) {
  if (!run.summons?.length || index % 2) return null;
  if ((e.x - run.px) ** 2 + (e.y - run.py) ** 2 < DECOY_IGNORE * DECOY_IGNORE) return null;
  for (const m of run.summons) if (m.kind === 'clone' && m.t > 0 && (e.x - m.x) ** 2 + (e.y - m.y) ** 2 < m.s.lure * m.s.lure) return m;
  return null;
}
