// Stat points (spec §14.1): earned per character level, spent on attributes.
// per: what one point adds to the final stats.
export const POINTS_PER_LEVEL = 3;
export const ATTRS = [
  { id: 'str', name: 'STR', desc: 'ATK +1', per: { atk: 1 } },
  { id: 'vit', name: 'VIT', desc: 'HP maks +8, DEF +0,25', per: { maxHp: 8, def: 0.25 } },
  { id: 'agi', name: 'AGI', desc: 'Kec. serang +1,5%, gerak +0,8', per: { atkSpd: 0.015, moveSpd: 0.8 } },
  { id: 'dex', name: 'DEX', desc: 'Kritis +0,5%, CDR +0,4%', per: { crit: 0.5, cdr: 0.4 } },
  { id: 'luk', name: 'LUK', desc: 'Dmg kritis +2%, magnet +2', per: { critDmg: 0.02, magnet: 2 } },
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
