// Mounts (spec §35). Ids and skins match art/mounts.js MAJESTIC_MOUNTS (tested).
// rarity: index into RARITIES; fly: crosses water & lava (rarity 4+);
// source: 'story' | 'stable' (gold) | 'marks' | 'drop' (bosses & mini bosses; dropFrom 'any' | 'eclipse')
// bonus: run effects (goldfind, expfind, potionheal, matfind, gearfind) and stat multipliers (maxHp, magnet)
export const MOUNT = {
  summon: 1.0,                         // seconds to call it (spec §35.1)
  fallLock: 3.0,                       // seconds the call stays locked after being knocked off
  speed: [1.6, 1.65, 1.7, 1.8, 1.9, 2.0], // × walking speed, by rarity
  fxTime: 0.4,                         // seconds of dust when mounting / being knocked off
  landTries: 12,                       // pushes to find dry land when landing over water
  box: { hx: 120, ht: 150 },           // hero billboard half-width / height while riding (game units)
};
export const MOUNT_DEFS = {
  horse:    { rarity: 0, skins: 3, source: 'story',  bonus: { goldfind: 0.05 } },
  snowwolf: { rarity: 2, skins: 3, source: 'stable', price: 1500, bonus: { magnet: 0.15 } },
  stag:     { rarity: 2, skins: 3, source: 'stable', price: 1500, bonus: { potionheal: 0.10 } },
  lion:     { rarity: 3, skins: 3, source: 'marks',  marks: 60, bonus: { maxHp: 0.05 } },
  tiger:    { rarity: 3, skins: 3, source: 'drop',   dropFrom: 'any', bonus: { matfind: 0.05 } },
  pegasus:  { rarity: 4, skins: 3, source: 'drop',   dropFrom: 'eclipse', fly: true, bonus: { expfind: 0.05 } },
  griffin:  { rarity: 4, skins: 3, source: 'story',  fly: true, bonus: { gearfind: 0.05 } },
  dragon:   { rarity: 5, skins: 4, source: 'story',  fly: true, bonus: { expfind: 0.05, goldfind: 0.05 } },
  skywhale: { rarity: 5, skins: 3, source: 'story',  fly: true, bonus: { magnet: 0.10, matfind: 0.05 } },
};
export const MOUNT_IDS = Object.keys(MOUNT_DEFS);
export const MOUNT_STATS = ['maxHp', 'magnet'];       // bonus keys that multiply final stats
// boss / mini-boss drop: chance = base + step × misses; the guarantee-th roll always drops
export const MOUNT_DROP = { base: 0.02, step: 0.02, guarantee: 25 };
// mounts with a pity counter (boss drops)
export const PITY_IDS = MOUNT_IDS.filter((id) => MOUNT_DEFS[id].source === 'drop');
export const SKIN_PRICE = 400;                         // gold per extra colour at the Stable
// story mounts (spec §35.2): quest id done → mount; 'allSide' = every side quest done; 'ending' = Sang Gerhana
export const STORY_MOUNTS = { horse: 'ch1', griffin: 's_salju', skywhale: 'allSide', dragon: 'ending' };
