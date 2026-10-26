// Game content & tuning. All balance numbers live here so the game is easy to
// tweak: critters, weapons (+5 levels each), stat upgrades, enemy types, waves.
export const WORLD_R = 2600;          // playable radius
export const MAX_WEAPONS = 4;
export const XP_BASE = 6;             // xp needed = base + level * growth
export const XP_GROWTH = 4;

export const CRITTERS = [
  {
    id: 'ember', name: 'EMBERKIT', sprite: 'ember',
    desc: 'Rubah api. Cepat & tembakan tunggal yang sakit.',
    hp: 90, speed: 118, magnet: 70, weapon: 'ember',
  },
  {
    id: 'bulb', name: 'BULBLUB', sprite: 'bulb',
    desc: 'Katak gelembung. Tebal darah, tembakan menyebar.',
    hp: 125, speed: 100, magnet: 70, weapon: 'bubble',
  },
  {
    id: 'zep', name: 'ZEPWING', sprite: 'zep',
    desc: 'Burung angin. Pisau orbit & daya tarik permata besar.',
    hp: 85, speed: 112, magnet: 110, weapon: 'gale',
  },
];

// Weapon level tables. Each weapon fires automatically.
export const WEAPONS = {
  ember: {
    id: 'ember', name: 'Tembakan Api', icon: 'iconEmber',
    desc: (l) => `Proyektil api ke musuh terdekat. (Lv ${l})`,
    levels: [
      { dmg: 14, count: 1, rate: 0.85, speed: 300, pierce: 0 },
      { dmg: 18, count: 1, rate: 0.75, speed: 320, pierce: 0 },
      { dmg: 18, count: 2, rate: 0.75, speed: 320, pierce: 0 },
      { dmg: 24, count: 2, rate: 0.62, speed: 340, pierce: 1 },
      { dmg: 30, count: 3, rate: 0.55, speed: 360, pierce: 1 },
    ],
  },
  bubble: {
    id: 'bubble', name: 'Ledakan Gelembung', icon: 'iconBubble',
    desc: (l) => `Semprotan gelembung menyebar. (Lv ${l})`,
    levels: [
      { dmg: 9, count: 3, rate: 1.0, speed: 220, pierce: 0 },
      { dmg: 11, count: 4, rate: 0.95, speed: 230, pierce: 0 },
      { dmg: 13, count: 5, rate: 0.9, speed: 240, pierce: 0 },
      { dmg: 16, count: 6, rate: 0.85, speed: 250, pierce: 1 },
      { dmg: 20, count: 7, rate: 0.75, speed: 260, pierce: 1 },
    ],
  },
  gale: {
    id: 'gale', name: 'Cincin Angin', icon: 'iconGale',
    desc: (l) => `Pisau angin mengorbit, memantul pelan. (Lv ${l})`,
    levels: [
      { dmg: 10, count: 2, rate: 2.4, speed: 2.6, pierce: 99, radius: 62 },
      { dmg: 13, count: 3, rate: 2.4, speed: 2.8, pierce: 99, radius: 66 },
      { dmg: 16, count: 3, rate: 2.2, speed: 3.0, pierce: 99, radius: 72 },
      { dmg: 20, count: 4, rate: 2.0, speed: 3.2, pierce: 99, radius: 78 },
      { dmg: 26, count: 5, rate: 1.8, speed: 3.5, pierce: 99, radius: 86 },
    ],
  },
  zap: {
    id: 'zap', name: 'Sambaran Petir', icon: 'iconZap',
    desc: (l) => `Petir berantai melompat ke musuh terdekat. (Lv ${l})`,
    levels: [
      { dmg: 16, count: 2, rate: 1.6, speed: 0, pierce: 0 },
      { dmg: 20, count: 3, rate: 1.5, speed: 0, pierce: 0 },
      { dmg: 26, count: 4, rate: 1.4, speed: 0, pierce: 0 },
      { dmg: 32, count: 5, rate: 1.25, speed: 0, pierce: 0 },
      { dmg: 40, count: 7, rate: 1.1, speed: 0, pierce: 0 },
    ],
  },
  thorn: {
    id: 'thorn', name: 'Ladang Duri', icon: 'iconThorn',
    desc: (l) => `Zona duri berkala di sekitarmu. (Lv ${l})`,
    levels: [
      { dmg: 12, count: 1, rate: 2.2, speed: 0, pierce: 0, radius: 78 },
      { dmg: 16, count: 1, rate: 2.0, speed: 0, pierce: 0, radius: 90 },
      { dmg: 20, count: 1, rate: 1.8, speed: 0, pierce: 0, radius: 102 },
      { dmg: 26, count: 1, rate: 1.6, speed: 0, pierce: 0, radius: 114 },
      { dmg: 34, count: 1, rate: 1.4, speed: 0, pierce: 0, radius: 128 },
    ],
  },
};

// Repeatable stat boosts offered on level-up alongside weapon upgrades.
export const STAT_UPS = [
  { id: 'spd', name: 'Kaki Ringan', desc: () => 'Kecepatan gerak +12%', max: 5 },
  { id: 'vit', name: 'Jantung Besar', desc: () => 'Darah maks +25 & pulih 25', max: 5 },
  { id: 'pow', name: 'Taring Tajam', desc: () => 'Semua damage +15%', max: 5 },
  { id: 'hst', name: 'Reflex Kilat', desc: () => 'Kecepatan serang +12%', max: 5 },
  { id: 'mag', name: 'Hidung Penyelidik', desc: () => 'Jangkauan permata +35%', max: 5 },
  { id: 'arm', name: 'Kulit Tebal', desc: () => 'Damage kena -2 (min 1)', max: 3 },
];

export const ENEMIES = {
  slink: { hp: 18, speed: 52, dmg: 8, r: 11, xp: 1, sprite: 'slink', score: 1 },
  dart: { hp: 12, speed: 95, dmg: 6, r: 9, xp: 1, sprite: 'dart', score: 1 },
  tank: { hp: 90, speed: 30, dmg: 16, r: 17, xp: 5, sprite: 'tank', score: 5 },
  boss: { hp: 900, speed: 38, dmg: 24, r: 30, xp: 0, sprite: 'boss', score: 100 },
};

// Which enemies exist over time (seconds) and how the spawner escalates.
export const WAVES = [
  { at: 0, types: ['slink'], interval: 1.1, batch: 1 },
  { at: 45, types: ['slink', 'dart'], interval: 0.9, batch: 2 },
  { at: 100, types: ['slink', 'dart', 'tank'], interval: 0.75, batch: 2 },
  { at: 170, types: ['slink', 'dart', 'tank'], interval: 0.6, batch: 3 },
  { at: 260, types: ['slink', 'dart', 'tank'], interval: 0.5, batch: 4 },
  { at: 360, types: ['slink', 'dart', 'tank'], interval: 0.42, batch: 5 },
];

export const BOSS_EVERY = 150;  // first boss at 150s, then every 150s
export const MAX_ENEMIES = 170;
