// Power (spec §47): how strong a character is, the recommended Power of an enemy level, and what the
// gap between them does to the fight. Pure.
import { POWER, DEFENSE, REC_POWER, GAP, POWER_LOOK } from '../data/power.js';
import { CDR_MAX } from '../data/balance.js';
import { finalStats } from './character.js';
import { jobOf } from './jobs.js';

// the share of a hit DEF takes off, for a character of `level` (spec §47.4)
export function defenseCut(def, level) {
  const k = DEFENSE.k * (Math.max(1, level) + DEFENSE.lv0);
  return Math.min(DEFENSE.cap, Math.max(0, def) / (k + Math.max(0, def)));
}

// stats: final stats (meta/character.js finalStats); sp: skill id → level
export function powerFrom(stats, level, sp = {}) {
  const crit = Math.min(100, Math.max(0, stats.crit || 0)) / 100;
  const offense = Math.max(1, stats.atk) * (1 + crit * Math.max(0, (stats.critDmg || 1.5) - 1)) * (stats.atkSpd || 1)
    * (1 + POWER.cdr * Math.min(CDR_MAX, Math.max(0, stats.cdr || 0)) / 100);
  const ehp = Math.max(1, stats.maxHp) / (1 - defenseCut(stats.def || 0, level));
  const skills = Object.values(sp).reduce((n, v) => n + (v || 0), 0);
  return Math.round(Math.sqrt(offense * ehp) * POWER.scale * (1 + POWER.skill * skills));
}

export const powerOf = (char) => powerFrom(finalStats(char), char.level, jobOf(char).sp);

// recommended Power for enemies of `level`, between the table's points
export function recPower(level) {
  const t = REC_POWER;
  if (level <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (level <= t[i][0]) {
      const [a, pa] = t[i - 1], [b, pb] = t[i];
      return Math.round(pa + (pb - pa) * (level - a) / (b - a));
    }
  }
  const [a, pa] = t[t.length - 2], [b, pb] = t[t.length - 1]; // past the end: the last step goes on
  return Math.round(pb + (pb - pa) * (level - b) / (b - a));
}

// what the gap does: { taken: enemy damage ×, dealt: your damage × }
export function gapOf(power, level) {
  const rec = recPower(level);
  if (!power || !rec) return { taken: 1, dealt: 1 };
  const r = power / rec, T = GAP.taken, D = GAP.dealt;
  return r >= 1
    ? { taken: Math.max(T.min, r ** -T.over), dealt: Math.min(D.max, r ** D.over) }
    : { taken: Math.min(T.max, r ** -T.under), dealt: Math.max(D.min, r ** D.under) };
}

// 'safe' | 'even' | 'danger': your Power next to a recommended one
export function powerTone(power, rec) {
  if (!rec) return 'safe';
  const r = power / rec;
  return r >= POWER_LOOK.safe ? 'safe' : r >= POWER_LOOK.even ? 'even' : 'danger';
}
