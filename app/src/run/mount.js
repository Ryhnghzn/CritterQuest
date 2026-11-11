// Mount state for a region run (spec §35.1). Pure: the caller (run/run.js) asks it to start a
// summon, steps it, and knocks the rider off on actions / hits / leaving the open world.
import { MOUNT } from '../data/mounts.js';

// def: { id, rarity, fly, skin } of the active mount, or null when the character has none
export function freshMount(def = null) {
  return { id: def?.id ?? null, rarity: def?.rarity ?? 0, fly: !!def?.fly, skin: def?.skin ?? 0, state: 'none', t: 0, lock: 0 };
}
export const isRiding = (m) => m.state === 'riding';

export function startSummon(m) {
  if (!m.id || m.state !== 'none' || m.lock > 0) return false;
  m.state = 'summoning'; m.t = 0;
  return true;
}

// → 'rode' on the step the summon finishes, else null
export function stepMount(m, dt) {
  if (m.lock > 0) m.lock = Math.max(0, m.lock - dt);
  if (m.state !== 'summoning') return null;
  m.t += dt;
  if (m.t < MOUNT.summon) return null;
  m.state = 'riding'; m.t = 0;
  return 'rode';
}

// reason: 'action' (attack / skill / dodge: no lock), 'hit' (knocked off while riding: locked), 'leave'
export function dismount(m, reason) {
  if (m.state === 'none') return false;
  const wasRiding = m.state === 'riding';
  m.state = 'none'; m.t = 0;
  if (reason === 'hit' && wasRiding) m.lock = MOUNT.fallLock; // a hit during a summon only cancels it
  return true;
}

export const mountSpeedMul = (m) => (m.state === 'riding' ? MOUNT.speed[m.rarity] : 1);
export const canCrossWater = (m) => m.state === 'riding' && m.fly;

// A press that knocks the rider off. Only a real attack press counts (never auto-attack), and only
// presses that can act: can = { skill: [bool x4], dodge, ult } readiness from run/run.js.
export const wantsAction = (intent, can) => !!(intent.attack || (intent.dodge && can.dodge) || (intent.ult && can.ult)
  || [intent.skill1, intent.skill2, intent.skill3, intent.skill4].some((p, i) => p && can.skill[i]));
