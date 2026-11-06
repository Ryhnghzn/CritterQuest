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
export const INVENTORY_MAX = 60;
export const STASH_MAX = 120;      // Gudang in the big towns (spec §25.2)

// Controls (spec §4.2 dodge, §5.1).
export const DODGE = { distance: 180, duration: 0.18, invuln: 0.25, cooldown: 0.78 }; // §33: 150 → 180 px, 1.2 → 0.78 s
// Hack-and-slash tempo (spec §33.1): player side only, applied where used (run/player.js,
// run/skills.js), so the character screen still shows the plain stats.
export const TEMPO = { move: 1.5, attackInterval: 0.7, projSpeed: 1.3 };
// Enemy arrival & rewards (spec §33.2–33.4)
export const HORDE = {
  count: 1.6,        // normal enemies per wave × this (bosses unchanged)
  hp: 0.8,           // HP of horde enemies (dungeon waves, region packs & escorts; not bosses, guardians)
  pack: [3, 6],      // a wave comes out of one lane in groups of this many
  packGap: 2.5,      // seconds between groups = wave.every × this
  retry: 0.2,        // seconds before trying again while the room is full
  nextAt: 0.4,       // next wave once alive ≤ this × the current wave's size
  liveCap: 45,       // dungeon: no new group while this many are alive
  eliteMul: 0.75,    // elite chance per enemy × this
  reward: 0.65,      // EXP, coin chance, gear chance, quest-item chance of normal enemies × this
  merge: 24,         // a new EXP gem joins a resting one within this many px
};
export const AUTO_AIM_RANGE = 450;     // touch: aim at the nearest enemy within this range
export const AUTO_ATTACK_MARGIN = 14;  // auto mode: melee swings once an enemy centre is within r + this
export const CDR_MAX = 40;             // % (spec §4.1)
// Skill energy (spec §18.2): filled by basic-attack hits and slowly by itself.
export const ENERGY = { max: 100, start: 50, regen: 3 };
// Ultimate charge (spec §22): filled by kills and by damage taken; full = ready. §33: kill 3 → 2 (more enemies).
export const ULT = { max: 100, kill: 2, elite: 10, boss: 25, hurtPct: 40 }; // hurtPct: charge per 100% max HP lost
export const SKILL_SLOTS = 4;

// A boomerang's pull: knock-back speed added to every enemy it drags home (bosses are immune)
export const SKILL_PULL = 260;
// Boomerang safety: it is caught within RETURN_CATCH px of the player, and gives up (vanishes)
// once its total travel exceeds BOOMERANG_MAX_TRAVEL × its range, e.g. when the player runs off.
export const RETURN_CATCH = 20;
export const BOOMERANG_MAX_TRAVEL = 3;
