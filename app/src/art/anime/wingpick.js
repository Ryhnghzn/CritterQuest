// Picks the anime hero's wing from what it wears (spec §39, data/wings.js). Pure: no DOM.
// avatar: { classId, look: { gear: { slot: { rarity } } }, fx: { effect: value }, set }
import { WING_UNIQUE, WING_FULL_SET, WING_MYTHIC_WEAPON, WING_MYTHIC_ANY } from '../../data/wings.js';
import { fullSet } from '../auratier.js';
import { MYTHIC } from '../../data/items.js';

export function pickWing(avatar) {
  if (!avatar) return null;
  const fx = avatar.fx || {}, gear = avatar.look?.gear || {};
  for (const [effect, wing] of WING_UNIQUE) if (fx[effect]) return wing;
  if (fullSet(avatar.set ?? -1)) return WING_FULL_SET;
  if (gear.weapon?.rarity >= MYTHIC) return WING_MYTHIC_WEAPON[avatar.classId] || WING_MYTHIC_ANY;
  for (const piece of Object.values(gear)) if (piece?.rarity >= MYTHIC) return WING_MYTHIC_ANY;
  return null;
}