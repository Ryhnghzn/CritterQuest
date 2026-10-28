// Style-D heroes (plan "Gaya D"): entry point used by drawDoll. Classes not moved to
// the new style yet return null so drawDoll keeps drawing the old paper doll.
import { rig } from './rig.js';
import { drawWarrior, hairPalette } from './warrior.js';
import { HAIR_PALETTE } from '../doll.js';

export const HERO_SCALE = 44 / 80; // keep the old doll height in the world
const DRAW = { warrior: drawWarrior };
// on-screen size per class (the hitbox stays the same): Warrior big, Assassin small
const SIZE = { warrior: 1.1, archer: 1.05, mage: 1.05, assassin: 0.9 };
const HAIR = new Map();

export const hasHero = (classId) => !!DRAW[classId];

// pose: as drawDoll ({ t, moving, walk, attack, hurt }) plus optional attackPhase (0..1, keyframed swing)
export function drawHero(g, classId, look, pose = {}) {
  const draw = DRAW[classId];
  if (!draw) return null;
  const hc = HAIR_PALETTE[look.hairColor] || HAIR_PALETTE[0];
  let hairP = HAIR.get(hc);
  if (!hairP) { hairP = hairPalette(hc); HAIR.set(hc, hairP); }
  const p = { t: pose.t || 0, moving: pose.moving || 0, walk: pose.walk || 0, hurt: !!pose.hurt, attack: pose.attackPhase ?? -1, snappy: pose.attackPhase != null && !pose.slow };
  const R = rig(classId, p);
  g.save();
  const S = HERO_SCALE * (SIZE[classId] || 1);
  g.scale(S, S);
  g.lineJoin = 'miter'; g.lineCap = 'round';
  draw(g, R, look, look.gear || {}, p, rig, hairP);
  g.restore();
  const head = R.W(2.6, -31.6);
  return { head: { x: head.x * S, y: head.y * S, r: 6.6 * S }, body: { x: R.hip.x * S, y: (R.hip.y - 12) * S }, hand: { x: R.hF.x * S, y: R.hF.y * S } };
}
