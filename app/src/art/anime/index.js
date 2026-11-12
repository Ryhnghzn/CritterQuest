// Anime heroes (spec §39): entry point. The side view moves on the same skeleton as the style-D
// heroes (art/hero/rig.js), so walking, attacks, skill moves and dodges all work as they do now;
// the front and back views have their own walk (common.js body()).
import { rig, gaitRate } from '../hero/rig.js';
import { ELEMENTS, body } from './common.js';
import { P } from './kit.js';
import { itemElement } from './items.js';
import { armourBack, bootsFx, ringGlint, cape, armourPieces } from './gearfx.js';
import { drawWings } from './wings.js';
import { ankle } from './common.js';
import { strikeTrail } from './strike.js';
import { fxBehind } from './elemfx.js';
import { HAIR_STYLES, HAIR_COLORS } from './head.js';
import * as warrior from './warrior.js';
import * as archer from './archer.js';
import * as mage from './mage.js';
import * as assassin from './assassin.js';

export const ANIME = { warrior, archer, mage, assassin };
export const CLASS_NAMES = { warrior: 'Warrior', archer: 'Archer', mage: 'Mage', assassin: 'Assassin' };
export { ELEMENTS, HAIR_STYLES, HAIR_COLORS };
export const ANIME_H = 175; // art units from toe to hair tip
export { gaitRate }; // how fast each class's legs turn over when running (× the walk phase)

// The game's look → an anime look: the save's hair (Pendek, Jabrik, Panjang, Bob, Kuncir, Poni Samping)
// and hair colour (Hitam, Cokelat, Pirang, Merah, Biru, Putih) become the nearest anime ones; the weapon's
// rarity picks the element (plain → ice → void → holy; Mitos: the class's own element).
const STYLE_OF = ['slick', 'spiky', 'long', 'part', 'tail', 'swept'];
const COLOUR_OF = ['black', 'brown', 'gold', 'crimson', 'azure', 'silver'];
export const CLASS_LOOK = {
  warrior: { eye: '#ffb43a', mythic: 'fire' }, archer: { eye: '#3ae0a0', mythic: 'storm' },
  mage: { eye: '#b46aff', mythic: 'void' }, assassin: { eye: '#ff3a5a', mythic: 'blood' },
};
export function animeLook(classId, look = {}) {
  const C = CLASS_LOOK[classId] || CLASS_LOOK.warrior, w = look.gear?.weapon;
  const gr = (slot) => (look.gear?.[slot] ? look.gear[slot].rarity : null);
  return { style: STYLE_OF[look.hair] || 'spiky', hair: COLOUR_OF[look.hairColor] || 'black', eye: C.eye, element: itemElement(w ? w.rarity : 0, C.mythic),
    gear: { weapon: gr('weapon') ?? 0, helm: gr('helm'), armor: gr('armor'), boots: gr('boots'), amulet: gr('amulet'), ring: gr('ring') } };
}

// o: { style, hair, eye, element (id or an element object), outfit (id), gear (rarity per slot), wings?: 'light' | 'phoenix' }
// pose: { t, moving, walk, attackPhase?, move?, dodge?, hurt?, slow?, view: 'side' | 'front' | 'back' }
// Returns anchor points in the figure frame (head, body, weapon hand), or null for an unknown class.
export function drawAnime(g, classId, o, pose = {}) {
  const C = ANIME[classId];
  if (!C) return null;
  const element = typeof o.element === 'object' ? o.element : ELEMENTS[o.element] || ELEMENTS.ice;
  const look = { ...o, t: pose.t || 0, element, outfit: o.outfit || Object.keys(C.OUTFITS)[0] };
  let at;
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  if (pose.view === 'front' || pose.view === 'back') {
    const B = body(pose, classId), G = o.gear || {};
    if (o.wings && pose.view === 'front') drawWings(g, o.wings, 'front', [0, -118 + B.b], look.t, pose.moving);
    armourBack(g, G.armor, [0, -112 + B.b], [B.aL.S, B.aR.S], look.t, pose.moving);
    if (pose.view === 'front') cape(g, G.armor, 'front', [0, -124 + B.b], look.t, pose.moving);
    // seen from behind, the weapon is in front of the body: its glow and the swing's arc hide behind it (spec §49)
    if (pose.view === 'back') { strikeTrail(g, B, element); fxBehind(true); }
    try { C[pose.view](g, B, look); } finally { fxBehind(false); }
    if (pose.view === 'front') strikeTrail(g, B, element); // the blade's arc / the release flash, in front
    if (pose.view === 'back') cape(g, G.armor, 'back', [0, -124 + B.b], look.t, pose.moving);
    armourPieces(g, G.armor, pose.view, { chest: [0, -110 + B.b], shoulders: [B.aL.S, B.aR.S], hips: [B.L.hip, B.R.hip] }, look.t);
    if (o.wings && pose.view === 'back') drawWings(g, o.wings, 'back', [0, -118 + B.b], look.t, pose.moving); // over the back
    bootsFx(g, G.boots, [B.L.ank, B.R.ank], look.t, pose.moving, -1);
    ringGlint(g, G.ring, pose.view === 'front' ? B.aL.h : B.aR.h, look.t);
    at = { head: [0, -146 + B.b], body: [0, -100 + B.b], hand: pose.view === 'front' ? B.aL.h : B.aR.h };
  } else {
    const rp = { gait: true, t: pose.t || 0, moving: pose.moving || 0, walk: pose.walk || 0, hurt: !!pose.hurt, attack: pose.attackPhase ?? -1, snappy: pose.attackPhase != null && !pose.slow, move: pose.move, dodge: pose.dodge, sit: pose.sit };
    const R = rig(classId, rp);
    g.scale(R.flip, 1);
    const G = o.gear || {}, hp0 = P(R.hip);
    armourBack(g, G.armor, [hp0[0] + 4, hp0[1] - 34], [P(R.sF), P(R.sB)], look.t, rp.moving);
    const cTop = [hp0[0] - 2 + Math.sin(R.lean) * 44, hp0[1] - 44 * Math.cos(R.lean)];
    if (o.wings) drawWings(g, o.wings, 'side', cTop, look.t, rp.moving);
    cape(g, G.armor, 'side', cTop, look.t, rp.moving);
    C.side(g, R, look, rp, rig);
    armourPieces(g, G.armor, 'side', { chest: [hp0[0] + 11 + Math.sin(R.lean) * 30, hp0[1] - 30], shoulders: [P(R.sF)], hips: [P(R.hipF)] }, look.t);
    bootsFx(g, G.boots, [ankle(R.fF), ankle(R.fB)], look.t, rp.moving, -1);
    ringGlint(g, G.ring, P(R.hF), look.t);
    const hp = P(R.hip), hd = P(R.hF);
    at = { head: [(hp[0] + 6.5) * R.flip, hp[1] - 64], body: [hp[0] * R.flip, hp[1] - 20], hand: [hd[0] * R.flip, hd[1]] };
  }
  g.restore();
  return at;
}
