// The themed dungeons (spec §18.3, §25.4), in order of difficulty. Each has
// 5 floors of waves, its own boss on floor 5, a difficulty step and a look.
//   mix: enemy type → count (a boss always comes first); every: seconds between spawns
//   hpMul / dmgMul: on top of the per-floor HP step; rewardMul: EXP & coins;
//   itemLevel: added to the level of gear found here
//   theme: colours for render/world.js (floor, wall, light, decor kind)
const W = (mix, every) => ({ mix, every });

export const DUNGEONS = [
  {
    id: 'shadow', name: 'Ruang Bawah Tanah Bayangan', short: 'Bayangan',
    hpMul: 1, dmgMul: 1, rewardMul: 1, itemLevel: 0,
    theme: { floor: ['#2b2838', '#1d1a28'], wall: '#3e3a55', light: '255,160,70', ambient: 'rgba(4,3,14,.82)', decor: 'torch', glow: ['90,230,255', '200,130,255'] },
    floors: [
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
  ],
  },
  {
    id: 'crystal', name: 'Gua Kristal', short: 'Kristal',
    hpMul: 2.2, dmgMul: 1.5, rewardMul: 2, itemLevel: 8,
    theme: { floor: ['#1f2a3d', '#141c2b'], wall: '#2f4a6b', light: '120,200,255', ambient: 'rgba(2,6,18,.84)', decor: 'crystal', glow: ['110,210,255', '190,140,255'] },
    floors: [
      { waves: [W({ slink: 8, spitter: 3 }, 0.5), W({ shielder: 2, dart: 6 }, 0.45), W({ spitter: 4, charger: 2, slink: 6 }, 0.4)] },
      { waves: [W({ shielder: 3, spitter: 4 }, 0.45), W({ charger: 3, dart: 8 }, 0.4), W({ tank: 2, spitter: 5, healer: 1 }, 0.4)] },
      { waves: [W({ shielder: 4, spitter: 4, slink: 6 }, 0.4), W({ charger: 4, bomber: 4 }, 0.35), W({ summoner: 2, spitter: 4 }, 0.4), W({ tank: 3, shielder: 3, healer: 1 }, 0.35)] },
      { waves: [W({ spitter: 7, shielder: 3 }, 0.35), W({ charger: 5, dart: 10 }, 0.3), W({ summoner: 2, healer: 2, tank: 3 }, 0.35), W({ shielder: 5, spitter: 6 }, 0.3)] },
      { waves: [W({ spitter: 5, shielder: 3, charger: 2 }, 0.35), W({ crystalboss: 1, spitter: 3, shielder: 2 }, 0.5)] },
    ],
  },
  {
    id: 'fungus', name: 'Hutan Jamur Busuk', short: 'Jamur',
    hpMul: 4, dmgMul: 2.1, rewardMul: 3.5, itemLevel: 16,
    theme: { floor: ['#26301f', '#182014'], wall: '#3d4a2e', light: '170,255,120', ambient: 'rgba(4,10,4,.84)', decor: 'shroom', glow: ['140,255,120', '230,120,255'] },
    floors: [
      { waves: [W({ bomber: 4, slink: 8 }, 0.45), W({ healer: 2, dart: 8 }, 0.4), W({ summoner: 1, bomber: 5, slink: 6 }, 0.4)] },
      { waves: [W({ bomber: 6, healer: 1, slink: 6 }, 0.4), W({ summoner: 2, spitter: 3 }, 0.4), W({ bomber: 6, charger: 3 }, 0.35)] },
      { waves: [W({ healer: 2, tank: 3, bomber: 4 }, 0.4), W({ summoner: 2, dart: 10 }, 0.35), W({ bomber: 8, spitter: 4 }, 0.3), W({ healer: 2, shielder: 3, summoner: 1 }, 0.35)] },
      { waves: [W({ bomber: 10, slink: 8 }, 0.3), W({ summoner: 3, healer: 2, tank: 2 }, 0.35), W({ bomber: 8, charger: 4 }, 0.3), W({ summoner: 2, spitter: 6, healer: 2 }, 0.3)] },
      { waves: [W({ bomber: 6, healer: 2, slink: 8 }, 0.35), W({ sporeboss: 1, healer: 1, bomber: 4 }, 0.5)] },
    ],
  },
  {
    // Makam Pasir (spec §25.4): under the Red Desert — scorpions, sand worms and the Mummy King
    id: 'tomb', name: 'Makam Pasir', short: 'Makam',
    hpMul: 5.5, dmgMul: 2.5, rewardMul: 4.2, itemLevel: 21,
    theme: { floor: ['#4a3826', '#33261a'], wall: '#6a5236', light: '255,200,120', ambient: 'rgba(12,8,2,.82)', decor: 'tomb', glow: ['255,210,120', '110,230,200'] },
    floors: [
      { waves: [W({ sandslink: 8, scorpion: 2 }, 0.45), W({ vulture: 6, spitter: 3 }, 0.4), W({ scorpion: 4, sandslink: 6 }, 0.4)] },
      { waves: [W({ scorpion: 4, shielder: 2 }, 0.4), W({ sandworm: 2, vulture: 6 }, 0.4), W({ summoner: 1, scorpion: 4, spitter: 3 }, 0.35)] },
      { waves: [W({ sandworm: 3, sandslink: 8 }, 0.35), W({ scorpion: 5, healer: 1, vulture: 6 }, 0.35), W({ tank: 3, spitter: 4 }, 0.35), W({ summoner: 2, scorpion: 4 }, 0.35)] },
      { waves: [W({ scorpion: 7, sandworm: 2 }, 0.3), W({ shielder: 4, summoner: 2, vulture: 6 }, 0.3), W({ sandworm: 4, healer: 2, spitter: 5 }, 0.3), W({ scorpion: 6, tank: 3, sandslink: 8 }, 0.25)] },
      { waves: [W({ scorpion: 4, sandworm: 2, spitter: 3 }, 0.35), W({ tombboss: 1, scorpion: 2, vulture: 4 }, 0.5)] },
    ],
  },
  {
    id: 'lava', name: 'Benteng Lava', short: 'Lava',
    hpMul: 7, dmgMul: 2.9, rewardMul: 5, itemLevel: 26,
    theme: { floor: ['#33201a', '#20130f'], wall: '#5a2f22', light: '255,120,50', ambient: 'rgba(14,3,2,.8)', decor: 'lava', glow: ['255,110,40', '255,190,80'] },
    floors: [
      { waves: [W({ charger: 3, tank: 2, slink: 6 }, 0.45), W({ spitter: 5, bomber: 3 }, 0.4), W({ charger: 4, shielder: 2, dart: 6 }, 0.35)] },
      { waves: [W({ tank: 3, spitter: 4 }, 0.4), W({ charger: 5, bomber: 5 }, 0.35), W({ shielder: 3, summoner: 1, spitter: 4 }, 0.35)] },
      { waves: [W({ charger: 5, tank: 3, healer: 1 }, 0.35), W({ spitter: 7, bomber: 5 }, 0.3), W({ shielder: 4, charger: 4 }, 0.35), W({ summoner: 2, tank: 3, spitter: 4 }, 0.3)] },
      { waves: [W({ charger: 7, bomber: 6 }, 0.3), W({ tank: 4, healer: 2, spitter: 6 }, 0.3), W({ shielder: 5, summoner: 2 }, 0.3), W({ charger: 6, spitter: 8, bomber: 6 }, 0.25)] },
      { waves: [W({ charger: 4, tank: 3, spitter: 4 }, 0.35), W({ lavaboss: 1, charger: 2, spitter: 3 }, 0.5)] },
    ],
  },
];
export const DUNGEON_IDS = DUNGEONS.map((d) => d.id);
export const dungeonById = (id) => DUNGEONS.find((d) => d.id === id) || DUNGEONS[0];
export const BOSS_TYPES = ['boss', 'crystalboss', 'sporeboss', 'tombboss', 'lavaboss'];
