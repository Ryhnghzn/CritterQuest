// Open world (spec §25): regions out of the town gate. Each region is a big
// map (world units, origin top-left) laid out from its `seed`: a winding main
// path from the west edge (back to `from`) to the east edge (on to `to`) with
// side branches, rivers with bridges where paths cross, lakes (lava pools on the
// volcano), groves and rocks of the biome, ruins. Dungeon gates are placed per
// character (meta/world.js gateSpots) inside the `at` band (fraction of width).
//   levels: [west, east] enemy level across the map
//   density: solids per million square units; enemies: type → spawn weight
// tier: goods & prices of the town's merchants (spec §25.2); 0 = the starting town
export const TOWNS = {
  home: { name: 'Kota Awal', tier: 0 },
  rimba: { name: 'Rimbawana', tier: 1 },
  beku: { name: 'Bekubara', tier: 2 },
  pasir: { name: 'Pasirluas', tier: 3 },
  bara: { name: 'Baraapi', tier: 4 },
};
export const TOWN_IDS = Object.keys(TOWNS);
export const READY_TOWNS = TOWN_IDS;
// teleport stone: base + perTier × tier of the destination, only to towns already visited
export const TELEPORT = { base: 15, perTier: 25 };

const BIG = { w: 20000, h: 12000 };

export const REGIONS = [
  {
    id: 'forest', name: 'Hutan Kelam', biome: 'forest', levels: [1, 15], from: 'home', to: 'rimba', ...BIG, seed: 7,
    branches: 6, rivers: 2, lakes: 7, ruins: 16, density: { tree: 46, rock: 7 },
    enemies: { slink: 5, dart: 4, spitter: 3, wolf: 3, marshfrog: 3, bushling: 2, bomber: 2, charger: 2, healer: 1, shielder: 1, summoner: 1, tank: 1 },
    dungeons: [{ id: 'shadow', at: [0.05, 0.18] }, { id: 'fungus', at: [0.72, 0.92] }],
    theme: { ground: ['#1d2a1c', '#172317'], path: '#3a3022', water: '#1b3a4a', ambient: 'rgba(4,10,8,.78)' },
  },
  {
    id: 'ice', name: 'Padang Es', biome: 'ice', levels: [10, 25], from: 'home', to: 'beku', ...BIG, seed: 21,
    branches: 5, rivers: 2, lakes: 9, ruins: 12, density: { tree: 20, rock: 14 },
    enemies: { icewisp: 3, frostspitter: 3, frostslink: 3, mistwisp: 3, mirrorguard: 2, yeti: 2, frosttank: 2, shielder: 2, dart: 2, summoner: 1, healer: 1 },
    dungeons: [{ id: 'crystal', at: [0.08, 0.4] }],
    theme: { ground: ['#2a3442', '#222b38'], path: '#4a5566', water: '#2b5878', ambient: 'rgba(6,10,20,.8)' },
  },
  {
    id: 'desert', name: 'Gurun Merah', biome: 'desert', levels: [20, 35], from: 'home', to: 'pasir', ...BIG, seed: 33,
    branches: 5, rivers: 1, lakes: 4, ruins: 20, density: { tree: 6, rock: 16 },
    enemies: { scorpion: 4, sandslink: 3, vulture: 3, hyena: 3, splitbeetle: 3, sandworm: 2, spitter: 2, bomber: 2, charger: 2, summoner: 1, healer: 1 },
    dungeons: [{ id: 'tomb', at: [0.25, 0.7] }],
    theme: { ground: ['#4a3324', '#3f2b1e'], path: '#6a4c32', water: '#2f6a6a', ambient: 'rgba(16,8,4,.78)' },
  },
  {
    id: 'volcano', name: 'Gunung Api', biome: 'volcano', levels: [30, 50], from: 'home', to: 'bara', ...BIG, seed: 45,
    branches: 5, rivers: 1, lakes: 10, ruins: 12, density: { tree: 9, rock: 20 },
    enemies: { imp: 3, salamander: 3, magmaslink: 3, emberbomber: 3, mortar: 3, embertotem: 2, charger: 2, tank: 2, shielder: 2, summoner: 1, healer: 1 },
    dungeons: [{ id: 'lava', at: [0.05, 0.35] }],
    theme: { ground: ['#2a1a18', '#221413'], path: '#3e2a24', water: '#c2410c', ambient: 'rgba(14,4,2,.8)' },
  },
  // Tanah Gerhana (spec §26.7): past Baraapi, open once all five Seal Shards are in; a dead end
  // in the east (to: null) where Menara Gerhana stands (9F-4b).
  {
    id: 'eclipse', name: 'Tanah Gerhana', biome: 'eclipse', levels: [45, 50], from: 'bara', to: null, w: 8000, h: 5000, seed: 57,
    branches: 3, rivers: 1, lakes: 6, ruins: 10, density: { tree: 30, rock: 16 }, unlock: { shards: 5 },
    enemies: { voidslink: 3, voidspitter: 3, wraith: 3, voidtwin: 3, voidobelisk: 2, voiddart: 2, voidtank: 2, shielder: 1, summoner: 1, healer: 1 },
    dungeons: [{ id: 'spire', at: [0.84, 0.94] }],
    theme: { ground: ['#1c1426', '#160f1f'], path: '#33284a', water: '#2a1640', ambient: 'rgba(8,4,16,.82)' },
  },
];
export const REGION_IDS = REGIONS.map((r) => r.id);
// regions the town gate offers: next to the town, and opened (Tanah Gerhana: after the shards)
export const regionOpen = (region, shards) => !region.unlock || shards >= region.unlock.shards;
export const regionById = (id) => REGIONS.find((r) => r.id === id);
// the region that holds a dungeon's gate
export const regionOfDungeon = (dungeonId) => REGIONS.find((r) => r.dungeons.some((d) => d.id === dungeonId)) || null;

// Field rules (spec §25.1, §25.5)
export const FIELD = {
  pathWidth: 90, riverWidth: 130, bridgeHalf: 90, edge: 40,
  exitZone: 70,            // walking this close to the west / east edge leaves the region…
  exitHalf: 110,           // …but only at the road's end: within this far of its y (elsewhere the edge is a wall)
  gateWall: 460,           // the town gate there: its palisade reaches this far up and down the edge from the road
  spawnMin: 560, spawnMax: 760, despawn: 1500,
  maxEnemies: 40, pack: [5, 10], // §33: 25 → 40, packs 3–6 → 5–10
  packEvery: 3, nightPackEvery: 2, // seconds between packs (§33: 4.2 / 2.8 → 3 / 2)
  pathAvoid: 0.65,         // chance a pack rolled near the path is moved away
  eliteChance: 0.05,
  fogCell: 150, fogRadius: 350,
  gateR: 80,               // standing this close to a dungeon gate offers to enter
  saveEvery: 60,           // seconds between automatic saves in a region
  deathGoldLoss: 0.1,
};
// Hidden treasure (spec §25.3): `count` chests per region at fixed spots (same for
// every character), each guarded by a mini boss that appears when the player comes
// near; the last (easternmost) one by the region's overlord. Opened once per character.
// Lingkaran Batu (plan docs/superpowers/plans/2026-11-13-eksplorasi.md bagian A): about one ruin in `every` wakes
// at night (which ones: from where they stand, the same for everyone). Seen within `seen`: a small line and a chime.
// Standing within `inner` × its radius of its centre for `hold` seconds: a gift; once a night each. glow: motes / s.
export const STONES = {
  every: 6, seen: 900, inner: 0.55, hold: 3, glow: 10,
  gift: { dust: [3, 6], crystal: [1, 2], gem: 0.25 },
};
export const TREASURE = {
  count: 4, band: [0.12, 0.95],       // spread west → east over this part of the width
  offPath: [420, 900],                // distance from the nearest path
  triggerR: 520,                      // the guardian appears this close
  openR: 70,                          // walk this close to an unlocked chest to open it
  guard: { hp: 14, dmg: 1.5, size: 1.8, escort: 3 },
  lord: { hp: 26, dmg: 1.7, size: 2.1, escort: 5 },
  gold: { base: 60, perLevel: 14 }, lordGold: 2.5,
  items: 1, lordItems: 2, source: 'grand',
  mats: { dust: [6, 14], crystal: [1, 3] }, lordMats: { crystal: [3, 6], core: [1, 2] },
};

// enemy strength by level (matches the dungeon tiers: LV 26 ≈ Benteng Lava)
export const FIELD_SCALE = { hp: 0.32, dmg: 0.06, reward: 0.16 };

// Expeditions (spec §25.5): find a dungeon's gate and clear `floors` floors in it.
export const EXPEDITIONS = {
  shadow: { levels: [1, 8], floors: 3 },
  crystal: { levels: [8, 18], floors: 3 },
  fungus: { levels: [14, 26], floors: 3 },
  tomb: { levels: [20, 32], floors: 3 },
  lava: { levels: [24, 45], floors: 3 },
  spire: { levels: [45, 50], floors: 3 },
};
export const EXPEDITION_REWARD = { gold: { base: 80, perLevel: 25 }, exp: { base: 60, perLevel: 20 }, marks: 4 };
