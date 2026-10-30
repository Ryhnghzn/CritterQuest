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
export const ROOM = { r: 560, wall: 36, laneWidth: 96, laneLen: 140 }; // §33: lanes 240 → 140
export const FLOOR_HP_STEP = 0.25;        // enemy HP × (1 + step × (floor − 1))
// next wave once the current one has fully spawned and few enough remain (HORDE.nextAt), after `gap` s
export const WAVE = { gap: 0.6 }; // §33: 1.5 → 0.6
export const COINS = { chance: 0.3, min: 1, max: 3, boss: 100, floorBonus: 10 };
// portals appear at the centre when a floor is clear; usable after `armDelay` s
export const PORTAL = { r: 26, gap: 80, armDelay: 0.4 }; // §33: 1 → 0.4 s


