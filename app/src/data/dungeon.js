// Town economy and dungeon trips (spec §13).
export const INN = { base: 10, perLevel: 2 };          // price = base + perLevel × level
export const TOWN_REGEN = 0.01;                         // fraction of max HP per second in town
export const DEATH = { goldKeep: 0.5, gearKeepChance: 0.5, wakeHp: 0.1 };

// Unique gear effects in the dungeon (spec §14.2; values per item in data/items.js).
export const FX = {
  executeBelow: 0.3,   // execute: bonus damage below this HP fraction
  chainRange: 140, chainMult: 0.8,
  shieldEvery: 10,     // shield: refreshed every N s
  frenzyBelow: 0.5,    // frenzy: active below this HP fraction
  explodeRadius: 46,
  phoenixInvuln: 2,
};

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
    { mix: { slink: 8, spitter: 1 }, every: 0.6 },
    { mix: { slink: 9, bomber: 2 }, every: 0.5 },
  ] },
  { waves: [
    { mix: { slink: 6, dart: 3, spitter: 2 }, every: 0.55 },
    { mix: { dart: 6, bomber: 3, charger: 1 }, every: 0.5 },
    { mix: { slink: 8, spitter: 3, charger: 2 }, every: 0.45 },
  ] },
  { waves: [
    { mix: { slink: 8, shielder: 2, spitter: 2 }, every: 0.5 },
    { mix: { charger: 3, bomber: 4, dart: 4 }, every: 0.45 },
    { mix: { healer: 1, tank: 2, slink: 8, spitter: 2 }, every: 0.4 },
    { mix: { shielder: 3, summoner: 1, dart: 6 }, every: 0.4 },
  ] },
  { waves: [
    { mix: { slink: 10, spitter: 4, healer: 1, bomber: 3 }, every: 0.35 },
    { mix: { charger: 4, shielder: 3, summoner: 1, dart: 6 }, every: 0.35 },
    { mix: { tank: 3, healer: 2, spitter: 5, slink: 8 }, every: 0.3 },
    { mix: { summoner: 2, bomber: 6, charger: 3, shielder: 2 }, every: 0.3 },
  ] },
  { waves: [
    { mix: { slink: 8, spitter: 3, shielder: 2, bomber: 3 }, every: 0.35 },
    { mix: { boss: 1, spitter: 2, healer: 1, slink: 6 }, every: 0.5 },
  ] },
];
