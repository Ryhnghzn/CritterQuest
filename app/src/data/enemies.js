// Enemy types (spec §5.3, §18.1). Which enemies appear on each floor lives in
// data/dungeon.js. ai picks the behaviour in run/enemies.js (default: chase);
// every = seconds between special actions, windup = warning before one.
export const ENEMIES = {
  slink: { name: 'Lendir', hp: 18, speed: 52, dmg: 8, r: 11, xp: 1, sprite: 'slink', score: 1 },
  dart: { name: 'Kelelawar', hp: 12, speed: 95, dmg: 6, r: 9, xp: 1, sprite: 'dart', score: 1 },
  tank: { name: 'Golem', hp: 90, speed: 30, dmg: 16, r: 17, xp: 5, sprite: 'tank', score: 5 },
  mini: { name: 'Lendir Kecil', hp: 8, speed: 72, dmg: 4, r: 7, xp: 0, sprite: 'mini', score: 0 },
  spitter: {
    name: 'Katak Ludah', hp: 26, speed: 50, dmg: 6, r: 11, xp: 2, sprite: 'spitter', score: 2,
    ai: 'ranged', keep: 190, every: 2.4, windup: 0.5, shot: { speed: 170, dmg: 10, r: 5, color: '#9dff6a' },
  },
  charger: {
    name: 'Babi Batu', hp: 60, speed: 42, dmg: 14, r: 15, xp: 4, sprite: 'charger', score: 4,
    ai: 'charge', range: 240, every: 2.5, windup: 0.75, dash: { speed: 340, time: 0.55 }, rest: 0.8,
  },
  summoner: {
    name: 'Dukun Tengkorak', hp: 55, speed: 36, dmg: 6, r: 13, xp: 5, sprite: 'summoner', score: 5,
    ai: 'summon', keep: 230, every: 5, windup: 0.8, summon: { type: 'mini', count: 3, max: 6 },
  },
  healer: {
    name: 'Peri Lumut', hp: 40, speed: 48, dmg: 5, r: 11, xp: 4, sprite: 'healer', score: 4,
    ai: 'heal', keep: 200, every: 3, windup: 0.6, heal: { radius: 130, amount: 0.25 },
  },
  bomber: {
    name: 'Jamur Bom', hp: 20, speed: 90, dmg: 0, r: 11, xp: 2, sprite: 'bomber', score: 2,
    ai: 'bomb', trigger: 42, fuse: 0.65, blast: { radius: 64, dmg: 22 },
  },
  shielder: {
    name: 'Kura Baja', hp: 85, speed: 34, dmg: 12, r: 16, xp: 5, sprite: 'shielder', score: 5,
    ai: 'shield', turn: 1.4, guard: { arc: 140, reduce: 0.85 },
  },
  // Raja Maw: chases slowly and every few seconds runs one random pattern;
  // below enrageAt HP faster and denser (spec §18.1).
  boss: {
    name: 'Raja Maw', hp: 900, speed: 38, dmg: 24, r: 30, xp: 0, sprite: 'boss', score: 100,
    ai: 'boss', every: 2.8, enrageAt: 0.5, enragedEvery: 1.8,
    patterns: ['ring', 'spiral', 'slam', 'charge', 'summon'],
    ring: { count: 14, speed: 140, dmg: 12, waves: 2, gap: 0.45, r: 7, color: '#c26bd8' },
    spiral: { arms: 3, time: 2.4, every: 0.11, speed: 150, dmg: 10, turn: 2.2, r: 6, color: '#ff5f9e' },
    slam: { count: 3, gap: 0.45, fuse: 0.9, radius: 70, dmg: 26 },
    windup: 0.9, dash: { speed: 420, time: 0.6 }, rest: 0.6,
    summon: { type: 'mini', count: 4, max: 8 },
  },
};

// Basic attacks hit a shield; skills (and gear lightning) go through it.
export const SHIELD_PIERCING = ['spin', 'rain', 'pierce', 'nova', 'chain', 'shadow', 'dagger', 'shout'];
