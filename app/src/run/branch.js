// Job Lanjutan in a fight (spec §43.10): what a branch changes, read from run.fx (meta/jobs.js
// branchFx + passiveFx). The bar changes (Berserker's Murka, Penyihir Api's Panas, Penari Pedang's
// Kombo) live in run/traits.js; Hunter's ricochet uses the gear `chain` effect, Paladin's healing the
// gear `regen`. Pure logic on the run state; the simulation RNG for the reflect roll.
import { BRANCH } from '../data/branches.js';
import { PASSIVE_RULES } from '../data/skilltree.js';
import { makeArea, makeProjectile } from './hits.js';
import { rand } from '../core/rng.js';
import { tr } from '../i18n.js';

const fxOf = (run) => run.fx || {};

// Shadow (Bayangan): after a dodge or a dash skill the first hit is an ambush
export function armAmbush(run) {
  const a = fxOf(run).ambush;
  if (a) run.ambushT = Math.max(run.ambushT || 0, a);
}
// true once (and spends it) when the next hit should be an ambush
export function takeAmbush(run) {
  if (!(run.ambushT > 0)) return false;
  run.ambushT = 0;
  return true;
}

// Extra damage multiplier from the branch for a hit h on e (after the crit roll).
export function branchDmg(run, e, h, ambush) {
  const fx = fxOf(run), s = run.stats;
  let m = 1;
  if (fx.lowHpDmg) { // Berserker: grows as HP falls, full at BRANCH.lowHpAt
    const k = Math.min(1, Math.max(0, (1 - s.hp / s.maxHp) / (1 - BRANCH.lowHpAt)));
    m *= 1 + fx.lowHpDmg * k;
  }
  if (fx.moveDmg && run.moving) m *= 1 + fx.moveDmg;         // Pemburu, Pelacak
  const d2 = (e.x - run.px) ** 2 + (e.y - run.py) ** 2;
  if (fx.farDmg && d2 > PASSIVE_RULES.farCrit ** 2) m *= 1 + fx.farDmg; // Jarak Jauh
  if (fx.snipe && h.snipe) m *= 1 + Math.sqrt(d2) / BRANCH.snipePer / 100; // Penembak Jitu: the focus shot
  if (ambush) m *= BRANCH.ambushMul + (fx.ambushDmg || 0);   // Bayangan, Selubung Malam
  return m;
}

// Paladin: a basic hit adds to the holy shield and pushes the foe back
export function branchBasicHit(run, e) {
  const fx = fxOf(run), s = run.stats;
  if (fx.holyShield) {
    const cap = s.maxHp * BRANCH.holyCap;
    run.shield = Math.min(cap, (run.shield || 0) + s.maxHp * fx.holyShield);
    run.shieldMax = cap; run.shieldT = Math.max(run.shieldT || 0, 5); // stays while the blows keep coming
  }
  if (fx.basicKnock && !e.boss) {
    const dx = e.x - run.px, dy = e.y - run.py, d = Math.hypot(dx, dy) || 1;
    e.kx += (dx / d) * fx.basicKnock; e.ky += (dy / d) * fx.basicKnock;
  }
}

// Penyihir Waktu: speed factor for a foe near the player (1 = unchanged)
export function timeSlow(run, e) {
  const k = fxOf(run).timeSlow;
  if (!k) return 1;
  return (e.x - run.px) ** 2 + (e.y - run.py) ** 2 < BRANCH.timeAura ** 2 ? 1 - k : 1;
}

// Penyihir Waktu / Tangkis Waktu: an enemy shot about to hit may turn back at its maker. true = reflected
export function timeReflect(run, src) {
  const k = fxOf(run).timeReflect;
  if (!k || !src || src.vx === undefined || src.life === undefined || src.unparryable) return false;
  if (rand() >= k) return false;
  const p = makeProjectile({ x: src.x, y: src.y, angle: Math.atan2(-src.vy, -src.vx), speed: Math.hypot(src.vx, src.vy) * 1.5, range: 600, r: (src.r || 6) + 2, mult: 1.5, fx: 'shard' });
  p.skill = true;
  run.hits.push(p);
  src.life = 0;
  run.addFloater?.(run.px, run.py - 40, tr('PANTUL!'), '#7fd8ff');
  return true;
}

// Penyihir Api: a full Panas bursts around the player
export function heatBlast(run) {
  if (!fxOf(run).heatBlast) return;
  const b = BRANCH.heatBlast, h = makeArea({ x: run.px, y: run.py, r: b.r, mult: b.mult, fx: 'boom', duration: 0.35 });
  h.skill = true; h.knock = 160;
  run.hits.push(h);
  run.addShake?.('heavy');
}

// Putar Balik: where the player was, noted every BRANCH.rewind.every s for BRANCH.rewind.time s
export function noteRewind(run, dt) {
  if (!run.hasRewind) return;
  const R = BRANCH.rewind;
  run.rewindT = (run.rewindT || 0) - dt;
  if (run.rewindT > 0) return;
  run.rewindT = R.every;
  const log = (run.rewindLog ||= []);
  log.push({ x: run.px, y: run.py, hp: run.stats.hp });
  if (log.length > Math.round(R.time / R.every) + 1) log.shift();
}
// back to the oldest noted place; HP returns only if it was higher then; a blast where it lands
export function castRewind(run, s) {
  const old = run.rewindLog?.[0];
  if (old) {
    run.px = old.x; run.py = old.y;
    run.stats.hp = Math.max(run.stats.hp, Math.min(run.stats.maxHp, old.hp));
    run.rewindLog.length = 0;
  }
  run.dodgeInv = Math.max(run.dodgeInv || 0, 0.3);
  const h = makeArea({ x: run.px, y: run.py, r: s.r, mult: s.mult, fx: 'nova', duration: 0.35, freeze: s.freeze || 0 });
  h.knock = 120;
  run.hits.push(h);
}
