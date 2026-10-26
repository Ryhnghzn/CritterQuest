// General tuning shared by the run: arena size, level curve, level-up boosts.
export const WORLD_R = 2600;          // playable radius
export const MAX_WEAPONS = 4;
export const XP_BASE = 6;             // xp needed = base + level * growth
export const XP_GROWTH = 4;

// Repeatable stat boosts offered on level-up alongside weapon upgrades.
export const STAT_UPS = [
  { id: 'spd', name: 'Kaki Ringan', desc: () => 'Kecepatan gerak +12%', max: 5 },
  { id: 'vit', name: 'Jantung Besar', desc: () => 'Darah maks +25 & pulih 25', max: 5 },
  { id: 'pow', name: 'Taring Tajam', desc: () => 'Semua damage +15%', max: 5 },
  { id: 'hst', name: 'Reflex Kilat', desc: () => 'Kecepatan serang +12%', max: 5 },
  { id: 'mag', name: 'Hidung Penyelidik', desc: () => 'Jangkauan permata +35%', max: 5 },
  { id: 'arm', name: 'Kulit Tebal', desc: () => 'Damage kena -2 (min 1)', max: 3 },
];

