// Enemy types, spawn waves and boss timing.
export const ENEMIES = {
  slink: { hp: 18, speed: 52, dmg: 8, r: 11, xp: 1, sprite: 'slink', score: 1 },
  dart: { hp: 12, speed: 95, dmg: 6, r: 9, xp: 1, sprite: 'dart', score: 1 },
  tank: { hp: 90, speed: 30, dmg: 16, r: 17, xp: 5, sprite: 'tank', score: 5 },
  boss: { hp: 900, speed: 38, dmg: 24, r: 30, xp: 0, sprite: 'boss', score: 100 },
};

// Which enemies exist over time (seconds) and how the spawner escalates.
export const WAVES = [
  { at: 0, types: ['slink'], interval: 1.1, batch: 1 },
  { at: 45, types: ['slink', 'dart'], interval: 0.9, batch: 2 },
  { at: 100, types: ['slink', 'dart', 'tank'], interval: 0.75, batch: 2 },
  { at: 170, types: ['slink', 'dart', 'tank'], interval: 0.6, batch: 3 },
  { at: 260, types: ['slink', 'dart', 'tank'], interval: 0.5, batch: 4 },
  { at: 360, types: ['slink', 'dart', 'tank'], interval: 0.42, batch: 5 },
];

export const BOSS_EVERY = 150;  // first boss at 150s, then every 150s
export const MAX_ENEMIES = 170;
