// General tuning shared by the run: level curve, level-up boosts. Room size: data/dungeon.js.
export const XP_BASE = 6;             // xp needed = base + level * growth
export const XP_GROWTH = 4;

// Run blessings offered on level-up (spec §5.5); they last until the run ends.
export const STAT_UPS = [
  { id: 'spd', name: 'Kaki Ringan', desc: () => 'Kecepatan gerak +12%', max: 5 },
  { id: 'vit', name: 'Jantung Besar', desc: () => 'Darah maks +25 & pulih 25', max: 5 },
  { id: 'pow', name: 'Taring Tajam', desc: () => 'Semua damage +15%', max: 5 },
  { id: 'hst', name: 'Reflex Kilat', desc: () => 'Kecepatan serang +12%', max: 5 },
  { id: 'mag', name: 'Hidung Penyelidik', desc: () => 'Jangkauan permata +35%', max: 5 },
  { id: 'arm', name: 'Kulit Tebal', desc: () => 'Damage kena -2 (min 1)', max: 3 },
];


// Permanent character progress (spec §4.3, §9).
export const SLOT_COUNT = 3;
export const NAME_MAX = 12;
export const HAIR_STYLES = 5;
export const HAIR_COLORS = 6;
export const CHAR_EXP_BASE = 30;      // exp to next level = base + growth * level
export const CHAR_EXP_GROWTH = 20;
export const CHAR_LEVEL_MAX = 50;
export const INVENTORY_MAX = 30;

// Controls (spec §4.2 dodge, §5.1).
export const DODGE = { distance: 150, duration: 0.18, invuln: 0.25, cooldown: 1.2 };
export const AUTO_AIM_RANGE = 450;     // touch: aim at the nearest enemy within this range
export const AUTO_ATTACK_MARGIN = 14;  // auto mode: melee swings once an enemy centre is within r + this
export const CDR_MAX = 40;             // % (spec §4.1)
