// Open world (spec §25): regions between towns. Each region is one fixed,
// hand-shaped map (world units, origin top-left): a winding path from the west
// edge (back to `from`) to the east edge (on to `to`), a river with bridges,
// tree clusters and rocks generated from `seed`, a few ruins.
//   levels: [west, east] enemy level across the map
//   enemies: type → spawn weight
export const TOWNS = {
  home: { name: 'Kota Awal' },
  rimba: { name: 'Rimbawana' },   // ready in 9D-2
  beku: { name: 'Bekubara' },
  pasir: { name: 'Pasirluas' },
  bara: { name: 'Baraapi' },
};
export const TOWN_IDS = Object.keys(TOWNS);
export const READY_TOWNS = ['home'];

export const REGIONS = [
  {
    id: 'forest', name: 'Hutan Kelam', biome: 'forest', levels: [1, 15], ready: true,
    from: 'home', to: 'rimba', w: 4000, h: 2400, seed: 7,
    path: [[0, 1200], [480, 1160], [900, 1360], [1300, 1310], [1620, 1010], [2000, 900], [2400, 1100], [2800, 1360], [3200, 1260], [3600, 1060], [4000, 1100]],
    river: [[2150, -40], [2090, 480], [2250, 900], [2200, 1320], [2310, 1820], [2250, 2440]],
    bridges: [[2228, 1012], [2290, 1720]],
    ruins: [{ x: 3050, y: 520, r: 150 }, { x: 1150, y: 1920, r: 130 }, { x: 700, y: 520, r: 110 }],
    trees: 430, rocks: 70, clusters: 34,
    enemies: { slink: 5, dart: 4, spitter: 3, bomber: 2, charger: 2, healer: 1, shielder: 1, summoner: 1, tank: 1 },
    theme: { ground: ['#1d2a1c', '#172317'], path: '#3a3022', water: '#1b3a4a', ambient: 'rgba(4,10,8,.78)' },
  },
  { id: 'ice', name: 'Padang Es', biome: 'ice', levels: [10, 25], ready: false, from: 'home', to: 'beku' },
  { id: 'desert', name: 'Gurun Merah', biome: 'desert', levels: [20, 35], ready: false, from: 'home', to: 'pasir' },
  { id: 'volcano', name: 'Gunung Api', biome: 'volcano', levels: [30, 50], ready: false, from: 'home', to: 'bara' },
];
export const REGION_IDS = REGIONS.map((r) => r.id);
export const regionById = (id) => REGIONS.find((r) => r.id === id);

// Field rules (spec §25.1)
export const FIELD = {
  pathWidth: 90, riverWidth: 120, bridgeHalf: 80, edge: 40,
  exitZone: 70,            // walking this close to the west / east edge leaves the region
  spawnMin: 560, spawnMax: 760, despawn: 1500,
  maxEnemies: 25, pack: [3, 6],
  packEvery: 4.2, nightPackEvery: 2.8, // seconds between packs
  pathAvoid: 0.65,         // chance a pack rolled near the path is moved away
  eliteChance: 0.05,
  fogCell: 100, fogRadius: 300,
  saveEvery: 60,           // seconds between automatic saves in a region
  deathGoldLoss: 0.1,
};
// enemy strength by level (matches the dungeon tiers: LV 26 ≈ Benteng Lava)
export const FIELD_SCALE = { hp: 0.2, dmg: 0.075, reward: 0.16 };
