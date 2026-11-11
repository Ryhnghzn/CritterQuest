// Job passives that act in a fight (spec §43.3), read from run.fx (meta/jobs.js passiveFx):
// Mata Tajam (crit against far enemies), Lolos Tipis (crit right after a dodge), Bilah Racun
// (a basic hit may poison). The bar passives live in run/traits.js, Hemat Mana / Ledakan Besar in
// run/skills.js, Kaki Ringan in finalStats. Pure logic on the run state.
import { PASSIVE_RULES } from '../data/skilltree.js';

// extra crit chance (percent points) for a hit on e
export function passiveCrit(run, e) {
  const fx = run.fx || {};
  let c = 0;
  if (fx.farCrit && (e.x - run.px) ** 2 + (e.y - run.py) ** 2 > PASSIVE_RULES.farCrit ** 2) c += fx.farCrit;
  if (fx.dodgeCrit && run.closeCallT > 0) c += fx.dodgeCrit;
  return c;
}

// Bilah Racun: poison e for a while (a new hit restarts it)
export function poisonFoe(run, e) { dotFoe(run, e, PASSIVE_RULES.poison); }
// any damage over time on an enemy: { time, every, mult (× ATK) } — poison, Semburan Api L5's burn
export function dotFoe(run, e, d) { e.psn = { t: d.time, tick: d.every, every: d.every, dmg: run.stats.atk * d.mult }; }

// once per step for a poisoned enemy: a little damage every tick (it can kill; the run removes the dead)
export function poisonStep(run, e, dt) {
  const p = e.psn;
  if ((p.t -= dt) <= 0) { e.psn = null; return; }
  if ((p.tick -= dt) > 0) return;
  p.tick += p.every || PASSIVE_RULES.poison.every;
  e.hp -= p.dmg; e.flash = Math.max(e.flash, 0.06);
  run.addFloater?.(e.x, e.y - e.r, String(Math.round(p.dmg)), '#9dff6a', null, true);
}
