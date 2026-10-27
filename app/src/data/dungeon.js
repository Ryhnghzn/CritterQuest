// Town economy and dungeon trips (spec §13).
export const INN = { base: 10, perLevel: 2 };          // price = base + perLevel × level
export const TOWN_REGEN = 0.01;                         // fraction of max HP per second in town
export const DEATH = { goldKeep: 0.5, gearKeepChance: 0.5, wakeHp: 0.1 };

// "Ruang Bawah Tanah Bayangan" (spec §13.3): one round stone room per floor,
// enemies walk in through 4 lanes (N/E/S/W) cut through the wall.
export const ROOM = { r: 560, wall: 36, laneWidth: 96, laneLen: 240 };
export const FLOOR_HP_STEP = 0.25;        // enemy HP × (1 + step × (floor − 1))
// next wave once the current one has fully spawned and at most `nextAlive` enemies remain, after `gap` s
export const WAVE = { nextAlive: 2, gap: 1.5 };
export const COINS = { chance: 0.3, min: 1, max: 3, boss: 100, floorBonus: 10 };
// portals appear at the centre when a floor is clear; usable after `armDelay` s
export const PORTAL = { r: 26, gap: 80, armDelay: 1 };

// mix: enemy type → count (a boss always comes first); every: seconds between spawns
export const FLOORS = [
  { waves: [
    { mix: { slink: 6 }, every: 0.7 },
    { mix: { slink: 9 }, every: 0.6 },
    { mix: { slink: 12 }, every: 0.5 },
  ] },
  { waves: [
    { mix: { slink: 8, dart: 3 }, every: 0.6 },
    { mix: { slink: 8, dart: 6 }, every: 0.5 },
    { mix: { slink: 10, dart: 8 }, every: 0.45 },
  ] },
  { waves: [
    { mix: { slink: 10, dart: 4 }, every: 0.5 },
    { mix: { slink: 8, dart: 6, tank: 1 }, every: 0.45 },
    { mix: { slink: 10, dart: 6, tank: 2 }, every: 0.4 },
    { mix: { slink: 12, dart: 8, tank: 3 }, every: 0.35 },
  ] },
  { waves: [
    { mix: { slink: 14, dart: 8, tank: 2 }, every: 0.35 },
    { mix: { slink: 14, dart: 10, tank: 3 }, every: 0.3 },
    { mix: { slink: 16, dart: 12, tank: 4 }, every: 0.3 },
    { mix: { slink: 18, dart: 14, tank: 5 }, every: 0.25 },
  ] },
  { waves: [
    { mix: { slink: 12, dart: 6, tank: 2 }, every: 0.35 },
    { mix: { boss: 1, tank: 4, slink: 8 }, every: 0.5 },
  ] },
];
