// An enemy's level for the Power gap (spec §47.3): its damage to the player and the player's damage to it
// follow your Power against that level's recommended Power (meta/power.js gapOf).
import { gapOf } from '../meta/power.js';

export function setFoeLevel(run, e, level) {
  const gap = gapOf(run.power, level);
  e.dmg *= gap.taken / (e.gap?.taken || 1);
  e.gap = gap; e.gapLv = level;
}
