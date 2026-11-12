// Power (spec §47): one number for how strong a character is, and how the gap to a place's
// recommended Power softens or sharpens the fight. Logic in meta/power.js.

// Power = √(offense × effective HP) × scale × (1 + skill × skill levels spent)
//   offense = ATK × crit average × attack speed × (1 + cdr share)
//   effective HP = max HP × (1 + DEF / (DEF_K × (level + DEF_LV0)))  — the same DEF as below
export const POWER = { scale: 10, skill: 0.006, cdr: 0.5 };

// Defense as a share (spec §47.4): a hit is cut to raw × K / (K + DEF), K = DEF_K × (level + DEF_LV0)
// of the one hit; at most `cap` of it is taken off.
export const DEFENSE = { k: 0.6, lv0: 15, cap: 0.75 };

// Recommended Power by enemy level: an average build at that level (run/benchkit.js benchChar, the four
// jobs averaged), between the points straight lines. Checked by meta/power.test.js.
export const REC_POWER = [ // levels 1–5: a Pengembara without a job (lower than the bench's jobs)
  [1, 380], [5, 670], [10, 1495], [15, 2382], [20, 3228], [25, 4332], [30, 5543], [35, 6717], [40, 8016], [45, 9167], [50, 11112],
];

// The gap (spec §47.3): r = your Power / the recommended Power of the enemy's level.
//   taken: enemy damage × r^−over when stronger (down to min), × r^−under when weaker (up to max)
//   dealt: your damage × r^over (up to max), × r^under when weaker (down to min)
export const GAP = {
  taken: { over: 1.5, under: 0.68, min: 0.2, max: 2 },
  dealt: { over: 0.45, under: 0.415, min: 0.5, max: 1.6 },
};

// The level of a dungeon's enemies (for the gap), and how much each floor adds
export const DUNGEON_LEVEL = { shadow: 3, crystal: 10, fungus: 19, tomb: 26, lava: 33, spire: 45, perFloor: 1 };

// colours of a recommended Power next to yours (spec §47.6): green from safe×, yellow from even×
export const POWER_LOOK = { safe: 1.25, even: 0.85, colors: { safe: '#8ff5c8', even: '#ffd24a', danger: '#ff5a6e' } };
