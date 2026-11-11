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
  // biome enemies (spec §25.4)
  // kin: the older enemy a biome variant is drawn from (bestiary counts it there);
  // onHit: what a landed hit does to the player — slow: [speed −k, seconds],
  // poison / burn: [k × the hit's damage per second, seconds].
  wolf: {
    name: 'Serigala Bayang', hp: 30, speed: 80, dmg: 10, r: 12, xp: 3, sprite: 'wolf', score: 3,
    ai: 'charge', range: 200, every: 1.6, windup: 0.35, dash: { speed: 420, time: 0.3 }, rest: 0.4,
  },
  frostslink: { kin: 'slink', name: 'Lendir Beku', hp: 22, speed: 46, dmg: 8, r: 11, xp: 1, sprite: 'frostslink', score: 1, onHit: { slow: [0.3, 1.2] } },
  frostspitter: {
    kin: 'spitter', name: 'Katak Salju', hp: 28, speed: 48, dmg: 6, r: 11, xp: 2, sprite: 'frostspitter', score: 2,
    ai: 'ranged', keep: 190, every: 2.4, windup: 0.5, shot: { speed: 170, dmg: 10, r: 6, color: '#bfe8ff', onHit: { slow: [0.35, 1.5] } },
  },
  frosttank: { kin: 'tank', name: 'Golem Es', hp: 100, speed: 28, dmg: 16, r: 17, xp: 5, sprite: 'frosttank', score: 5, onHit: { slow: [0.4, 1.5] } },
  yeti: {
    name: 'Yeti', hp: 140, speed: 36, dmg: 20, r: 19, xp: 8, sprite: 'yeti', score: 8,
    ai: 'charge', range: 260, every: 3, windup: 0.8, dash: { speed: 360, time: 0.5 }, rest: 1, onHit: { slow: [0.45, 1.8] },
  },
  icewisp: {
    name: 'Roh Es', hp: 30, speed: 55, dmg: 4, r: 10, xp: 3, sprite: 'icewisp', score: 3,
    ai: 'ranged', keep: 220, every: 2.2, windup: 0.5, shot: { speed: 190, dmg: 8, r: 5, color: '#a8e4ff', count: 3, spread: 0.26, onHit: { slow: [0.3, 1.2] } },
  },
  sandslink: { kin: 'slink', name: 'Lendir Pasir', hp: 18, speed: 64, dmg: 8, r: 11, xp: 1, sprite: 'sandslink', score: 1 },
  vulture: { kin: 'dart', name: 'Burung Nasar', hp: 16, speed: 100, dmg: 7, r: 10, xp: 1, sprite: 'vulture', score: 1 },
  scorpion: {
    name: 'Kalajengking', hp: 55, speed: 60, dmg: 10, r: 14, xp: 4, sprite: 'scorpion', score: 4,
    ai: 'charge', range: 180, every: 2, windup: 0.5, dash: { speed: 380, time: 0.35 }, rest: 0.6, onHit: { poison: [0.35, 3] },
  },
  sandworm: {
    name: 'Cacing Pasir', hp: 120, speed: 120, dmg: 18, r: 16, xp: 7, sprite: 'sandworm', score: 7,
    ai: 'burrow', under: 2.2, rise: 0.7, up: 2.6, upSpeed: 30, blast: { radius: 70, dmg: 24 },
  },
  magmaslink: { kin: 'slink', name: 'Lendir Magma', hp: 22, speed: 50, dmg: 9, r: 11, xp: 1, sprite: 'magmaslink', score: 1, onHit: { burn: [0.3, 2] } },
  emberbomber: { kin: 'bomber', name: 'Jamur Bara', hp: 22, speed: 92, dmg: 0, r: 11, xp: 2, sprite: 'emberbomber', score: 2, ai: 'bomb', trigger: 44, fuse: 0.6, blast: { radius: 78, dmg: 26, onHit: { burn: [0.3, 2.5] } } },
  imp: {
    name: 'Imp Api', hp: 34, speed: 70, dmg: 6, r: 10, xp: 4, sprite: 'imp', score: 4,
    ai: 'ranged', keep: 200, every: 1.8, windup: 0.4, shot: { speed: 220, dmg: 10, r: 6, color: '#ff7a2a', onHit: { burn: [0.3, 2.5] } },
  },
  salamander: {
    name: 'Salamander', hp: 80, speed: 46, dmg: 16, r: 15, xp: 6, sprite: 'salamander', score: 6,
    ai: 'charge', range: 260, every: 2.4, windup: 0.6, dash: { speed: 400, time: 0.5 }, rest: 0.7,
    trail: { every: 0.08, r: 26, fuse: 0.45, dmg: 0.6 }, onHit: { burn: [0.3, 2] },
  },
  // Tanah Gerhana (spec §26.7): eclipse variants and the wraith
  voidslink: { kin: 'slink', name: 'Lendir Hampa', hp: 26, speed: 64, dmg: 10, r: 11, xp: 1, sprite: 'voidslink', score: 1, onHit: { slow: [0.3, 1.2] } },
  voiddart: { kin: 'dart', name: 'Kelelawar Gerhana', hp: 16, speed: 115, dmg: 8, r: 9, xp: 1, sprite: 'voiddart', score: 1 },
  voidspitter: {
    kin: 'spitter', name: 'Katak Hampa', hp: 32, speed: 52, dmg: 7, r: 11, xp: 2, sprite: 'voidspitter', score: 2,
    ai: 'ranged', keep: 200, every: 2.2, windup: 0.5, shot: { speed: 190, dmg: 11, r: 6, color: '#b98aff', count: 3, spread: 0.22 },
  },
  voidtank: { kin: 'tank', name: 'Golem Gerhana', hp: 120, speed: 32, dmg: 18, r: 18, xp: 6, sprite: 'voidtank', score: 6, onHit: { slow: [0.35, 1.5] } },
  // Hantu Gerhana: fades out, reappears right beside the player and bursts into a ring of shots
  wraith: {
    name: 'Hantu Gerhana', hp: 70, speed: 58, dmg: 12, r: 13, xp: 7, sprite: 'wraith', score: 7,
    ai: 'blink', keep: 220, every: 3.4, fade: 0.55, appear: 0.45, near: [130, 190],
    ring: { count: 10, speed: 160, dmg: 12, r: 6, color: '#c79bff' },
  },
  // Raja Maw: chases slowly and every few seconds runs one random pattern;
  // below enrageAt HP faster and denser (spec §18.1).
  boss: {
    name: 'Raja Maw', boss: true, hp: 900, speed: 38, dmg: 24, r: 30, xp: 0, sprite: 'boss', score: 100,
    ai: 'boss', every: 2.8, enrageAt: 0.5, enragedEvery: 1.8,
    patterns: ['ring', 'spiral', 'slam', 'charge', 'summon'],
    ring: { count: 14, speed: 140, dmg: 12, waves: 2, gap: 0.45, r: 7, color: '#c26bd8' },
    spiral: { arms: 3, time: 2.4, every: 0.11, speed: 150, dmg: 10, turn: 2.2, r: 6, color: '#ff5f9e' },
    slam: { count: 3, gap: 0.45, fuse: 0.9, radius: 70, dmg: 26 },
    windup: 0.9, dash: { speed: 420, time: 0.6 }, rest: 0.6,
    summon: { type: 'mini', count: 4, max: 8 },
  },
  // Golem Kristal (Gua Kristal): crystal shards in rings, slams, charges.
  crystalboss: {
    name: 'Golem Kristal', boss: true, hp: 900, speed: 30, dmg: 26, r: 32, xp: 0, sprite: 'crystalboss', score: 100,
    ai: 'boss', every: 2.6, enrageAt: 0.5, enragedEvery: 1.7,
    patterns: ['ring', 'slam', 'charge', 'ring'],
    ring: { count: 18, speed: 130, dmg: 13, waves: 3, gap: 0.4, r: 7, color: '#7fd8ff' },
    spiral: { arms: 2, time: 2, every: 0.12, speed: 140, dmg: 10, turn: 2, r: 6, color: '#7fd8ff' },
    slam: { count: 4, gap: 0.4, fuse: 0.85, radius: 75, dmg: 28 },
    windup: 0.8, dash: { speed: 460, time: 0.55 }, rest: 0.7,
    summon: { type: 'shielder', count: 2, max: 4 },
  },
  // Ratu Spora (Hutan Jamur Busuk): spore spirals, calls bombers.
  sporeboss: {
    name: 'Ratu Spora', boss: true, hp: 900, speed: 36, dmg: 24, r: 30, xp: 0, sprite: 'sporeboss', score: 100,
    ai: 'boss', every: 2.4, enrageAt: 0.5, enragedEvery: 1.6,
    patterns: ['spiral', 'summon', 'ring', 'spiral'],
    ring: { count: 16, speed: 120, dmg: 12, waves: 2, gap: 0.5, r: 8, color: '#b7ff6a' },
    spiral: { arms: 4, time: 2.8, every: 0.13, speed: 125, dmg: 11, turn: 1.6, r: 7, color: '#d98aff' },
    slam: { count: 3, gap: 0.5, fuse: 0.9, radius: 70, dmg: 24 },
    windup: 0.9, dash: { speed: 400, time: 0.6 }, rest: 0.6,
    summon: { type: 'bomber', count: 3, max: 6 },
  },
  // Raja Mumi (Makam Pasir): sand rings and spirals, buried slams, calls scorpions.
  tombboss: {
    name: 'Raja Mumi', boss: true, hp: 900, speed: 34, dmg: 26, r: 32, xp: 0, sprite: 'tombboss', score: 100,
    ai: 'boss', every: 2.4, enrageAt: 0.5, enragedEvery: 1.6,
    patterns: ['spiral', 'slam', 'summon', 'ring', 'charge'],
    ring: { count: 16, speed: 140, dmg: 13, waves: 3, gap: 0.4, r: 7, color: '#e8c070' },
    spiral: { arms: 4, time: 2.6, every: 0.11, speed: 150, dmg: 11, turn: 2.4, r: 6, color: '#f2d38a' },
    slam: { count: 5, gap: 0.35, fuse: 0.85, radius: 80, dmg: 30 },
    windup: 0.8, dash: { speed: 440, time: 0.55 }, rest: 0.6,
    summon: { type: 'scorpion', count: 2, max: 4 },
  },
  // Sang Gerhana (Menara Gerhana, spec §26.7): three phases by HP —
  //   1 Matahari Hitam: rings, spirals, sweeping beams;
  //   2 Gerhana (≤ 66%): the arena goes dark; echoes one attack of each dungeon boss;
  //   3 Kehampaan (≤ 33%): faster, black holes that pull, calls shadows.
  eclipseboss: {
    name: 'Sang Gerhana', boss: true, hp: 1500, speed: 36, dmg: 34, r: 36, xp: 0, sprite: 'eclipseboss', score: 200,
    ai: 'boss', every: 2.2, enrageAt: 0.33, enragedEvery: 1.3,
    patterns: ['ring', 'spiral', 'beam'],
    phases: [
      { at: 1, name: 'Matahari Hitam', patterns: ['ring', 'spiral', 'beam', 'charge'] },
      { at: 0.66, name: 'GERHANA!', patterns: ['echo', 'echo', 'beam'], dark: true },
      { at: 0.33, name: 'KEHAMPAAN!', patterns: ['hole', 'spiral', 'echo', 'beam', 'summon'], dark: true },
    ],
    echo: ['boss', 'crystalboss', 'sporeboss', 'tombboss', 'lavaboss'],
    ring: { count: 20, speed: 150, dmg: 15, waves: 3, gap: 0.4, r: 8, color: '#c79bff' },
    spiral: { arms: 4, time: 2.6, every: 0.1, speed: 160, dmg: 13, turn: 2.6, r: 7, color: '#ffe08a' },
    slam: { count: 5, gap: 0.35, fuse: 0.8, radius: 85, dmg: 34 },
    beam: { count: 4, sweeps: 3, gap: 0.55, fuse: 0.75, len: 520, w: 34, turn: 0.4, dmg: 32 },
    hole: { count: 2, r: 110, fuse: 2.4, pull: 120, dmg: 36 },
    windup: 0.75, dash: { speed: 500, time: 0.5 }, rest: 0.5,
    summon: { type: 'wraith', count: 2, max: 4 },
  },
  // Raja Lava (Benteng Lava): heavy fire slams and fire rings.
  lavaboss: {
    name: 'Raja Lava', boss: true, hp: 900, speed: 34, dmg: 30, r: 34, xp: 0, sprite: 'lavaboss', score: 100,
    ai: 'boss', every: 2.3, enrageAt: 0.5, enragedEvery: 1.5,
    patterns: ['slam', 'ring', 'spiral', 'charge'],
    ring: { count: 20, speed: 150, dmg: 14, waves: 2, gap: 0.4, r: 8, color: '#ff8a3c' },
    spiral: { arms: 3, time: 2.4, every: 0.1, speed: 160, dmg: 12, turn: 2.6, r: 7, color: '#ffc04a' },
    slam: { count: 5, gap: 0.35, fuse: 0.8, radius: 85, dmg: 32 },
    windup: 0.75, dash: { speed: 480, time: 0.55 }, rest: 0.6,
    summon: { type: 'charger', count: 2, max: 4 },
  },
};

// Basic attacks hit a shield; skills (and gear lightning) go through it.
export const SHIELD_PIERCING = ['spin', 'rain', 'pierce', 'nova', 'chain', 'shadow', 'dagger', 'shout'];

// Elite traits (spec §41.1): each elite rolls AFFIX_COUNT of these (no two alike). `not`: behaviours
// a trait does not fit (they already hide or teleport). Shown over the elite as "Cepat · Berlapis".
export const AFFIXES = {
  fast: { name: 'Cepat', speed: 1.5, tempo: 1 / 0.7 },                       // walks ×1.5, acts every ×0.7
  armored: { name: 'Berlapis', shield: 0.35, idle: 4, regen: 0.25 },          // shield = 35% max HP; refills 25%/s after 4 s untouched
  caller: { name: 'Pemanggil', every: 6, count: 2, max: 4, type: 'mini' },
  thorny: { name: 'Berduri', cd: 1, dmgMul: 0.5, shot: { count: 8, speed: 170, r: 5, color: '#e6c27a' } }, // thorn damage = touch damage × dmgMul
  volatile: { name: 'Meledak', radius: 110, fuse: 1, dmgMul: 2 },            // on death: a danger circle, damage × the elite's touch damage
  aura: { name: 'Beraura', every: 1.6, r: 44, fuse: 0.9, dmgMul: 0.6 },      // small bursts left behind; the biome's onHit (slow / burn / poison)
  blinker: { name: 'Penjelajah', every: 5, warn: 0.5, near: [80, 140], not: ['burrow', 'blink', 'boss'] },
};
// how many traits: 1, or 2 from world level / dungeon floor on
export const AFFIX_COUNT = { base: 1, more: 2, level: 25, floor: 4 };
