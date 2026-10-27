// Enemy types. Which enemies appear on each dungeon floor lives in data/dungeon.js.
export const ENEMIES = {
  slink: { hp: 18, speed: 52, dmg: 8, r: 11, xp: 1, sprite: 'slink', score: 1 },
  dart: { hp: 12, speed: 95, dmg: 6, r: 9, xp: 1, sprite: 'dart', score: 1 },
  tank: { hp: 90, speed: 30, dmg: 16, r: 17, xp: 5, sprite: 'tank', score: 5 },
  boss: { hp: 900, speed: 38, dmg: 24, r: 30, xp: 0, sprite: 'boss', score: 100 },
};
