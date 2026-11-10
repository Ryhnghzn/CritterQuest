// Style-D heroes (plan "Gaya D"): entry point used by drawDoll for the four classes and
// for townsfolk (classId null + an outfit).
import { rig } from './rig.js';
import { hairPalette } from './common.js';
import { drawWarrior, RIM as WARRIOR_RIM } from './warrior.js';
import { drawArcher, RIM as ARCHER_RIM } from './archer.js';
import { drawMage, RIM as MAGE_RIM } from './mage.js';
import { drawAssassin, RIM as ASSASSIN_RIM } from './assassin.js';
import { drawNpc, archetypeOf, idleOf, RIM as NPC_RIM } from './npc.js';
import { HAIR_PALETTE } from '../doll.js';
import { drawAnime, animeLook } from '../anime/index.js';
import { Z } from '../anime/kit.js';

export const HERO_SCALE = 44 / 80; // keep the old doll height in the world
const DRAW = { warrior: drawWarrior, archer: drawArcher, mage: drawMage, assassin: drawAssassin };
const RIM = { warrior: WARRIOR_RIM, archer: ARCHER_RIM, mage: MAGE_RIM, assassin: ASSASSIN_RIM, npc: NPC_RIM };
// on-screen size per class (the hitbox stays the same): Warrior big, Assassin small
const SIZE = { warrior: 1.1, archer: 1.05, mage: 1.05, assassin: 0.9 };
const HAIR = new Map();

export const hasHero = (classId) => !!DRAW[classId];

// NPCs: the archetype needs the NPC's role/title. Renderers pass it as look.npc; a portrait
// (look without npc) finds it again through the outfit array, which each NPC owns.
const NPC_OF = new WeakMap();
function npcOf(look) {
  if (look.npc && look.outfit) NPC_OF.set(look.outfit, look.npc);
  return look.npc || (look.outfit && NPC_OF.get(look.outfit));
}

// pose: as drawDoll ({ t, moving, walk, attack, hurt }) plus optional attackPhase (0..1, keyframed swing),
// move ({ id: skill id, ph: 0..1, dur: s }) and dodge (0..1)
export function drawHero(g, classId, look, pose = {}) {
  const isNpc = !classId;
  const draw = isNpc ? null : DRAW[classId];
  if (!draw && !(isNpc && look.outfit)) return null;
  const rimKey = isNpc ? 'npc' : classId;
  const hc = HAIR_PALETTE[look.hairColor] || HAIR_PALETTE[0], key = `${rimKey}:${look.hairColor}`;
  let hairP = HAIR.get(key);
  if (!hairP) { hairP = hairPalette(hc, RIM[rimKey]); HAIR.set(key, hairP); }
  if (pose.anime && !isNpc) { // the anime heroes (spec §39), at the same height as these
    const S = HERO_SCALE * (SIZE[classId] || 1) / Z;
    g.save(); g.scale(S, S);
    const al = animeLook(classId, look);
    if (pose.wings) al.wings = pose.wings; // Mitos gear / Phoenix (replaces the thin wings of art/aura.js)
    const a = drawAnime(g, classId, al, pose);
    g.restore();
    if (a) return { head: { x: a.head[0] * S, y: a.head[1] * S, r: 13 * S }, body: { x: a.body[0] * S, y: a.body[1] * S }, hand: { x: a.hand[0] * S, y: a.hand[1] * S } };
  }
  const arch = isNpc ? archetypeOf(npcOf(look)) : null;
  const p = { t: pose.t || 0, moving: pose.moving || 0, walk: pose.walk || 0, hurt: !!pose.hurt, attack: pose.attackPhase ?? -1, snappy: pose.attackPhase != null && !pose.slow, move: pose.move, dodge: pose.dodge, kind: isNpc ? idleOf(arch) : undefined };
  const R = rig(isNpc ? 'npc' : classId, p);
  g.save();
  const S = HERO_SCALE * (SIZE[classId] || 1);
  g.scale(S * R.flip, S);
  g.lineJoin = 'miter'; g.lineCap = 'round';
  if (isNpc) drawNpc(g, R, look, arch, hairP);
  else draw(g, R, look, look.gear || {}, p, rig, hairP);
  g.restore();
  const head = R.W(2.6, -31.6);
  return { head: { x: head.x * S, y: head.y * S, r: 6.6 * S }, body: { x: R.hip.x * S, y: (R.hip.y - 12) * S }, hand: { x: R.hF.x * S, y: R.hF.y * S } };
}