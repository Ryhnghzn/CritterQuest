// Talents (spec §21): one point every TALENT_EVERY levels; each talent has up
// to `max` ranks. stat: added to final stats (pct = fraction of the stat, add =
// flat); fx: added to the run's effect values (same keys as gear effects).
export const TALENT_EVERY = 2;
export const TALENTS = [
  { id: 'might', name: 'Kekuatan', desc: 'ATK +3%', max: 5, pct: { atk: 0.03 } },
  { id: 'vigor', name: 'Ketahanan', desc: 'HP maks +4%', max: 5, pct: { maxHp: 0.04 } },
  { id: 'precision', name: 'Ketajaman', desc: 'Kritis +1,5%', max: 5, add: { crit: 1.5 } },
  { id: 'focus', name: 'Fokus Sihir', desc: 'Damage skill +8%', max: 5, fx: { skillDmg: 0.08 } },
  { id: 'flow', name: 'Aliran Energi', desc: 'Energi dari serangan +10%', max: 5, fx: { energy: 0.1 } },
  { id: 'evasion', name: 'Kegesitan', desc: 'Jeda dodge −6%', max: 5, fx: { dodgecd: 0.06 } },
  { id: 'vamp', name: 'Dahaga Darah', desc: 'Menghisap 0,6% damage jadi HP', max: 5, fx: { lifesteal: 0.006 } },
  { id: 'fortune', name: 'Keberuntungan', desc: 'Koin & EXP +5%', max: 5, fx: { goldfind: 0.05, expfind: 0.05 } },
];
export const TALENT_IDS = TALENTS.map((t) => t.id);
export const TALENT_RESPEC = { base: 80, perLevel: 15 };
