// Pure aura logic (no canvas): which level-ring tier, whether the full-set pillar
// shows, and per-character aura state (how long it has stood still, flowers left
// behind by regen). Drawn by art/aura.js.
import { RING, SET_PILLAR, UNIQUE_AURA } from '../data/aurafx.js';
import { LEGENDARY } from '../data/items.js';
import { EQUIP_SLOTS } from '../meta/schema.js';
import { equippedItem } from '../meta/gear.js';

// 0 below level 10, then one tier per 10 levels up to RING.max.
export function ringTier(level) {
  return Math.max(0, Math.min(RING.max, Math.floor((level || 0) / RING.per)));
}

// Lowest rarity over every equipment slot; -1 when any slot is empty.
export function setRarity(char) {
  let min = Infinity;
  for (const slot of EQUIP_SLOTS) {
    const it = equippedItem(char, slot);
    if (!it) return -1;
    min = Math.min(min, it.rarity);
  }
  return min === Infinity ? -1 : min;
}

export const fullSet = (setR) => setR >= LEGENDARY;

// Per character on screen: stillness for the set pillar, regen flowers.
export class AuraState {
  constructor() {
    this.x = null; this.y = null; this.t = 0;
    this.stillSince = 0;
    this.vx = 0; this.vy = 0;
    this.walked = 0;    // distance since the last flower
    this.flowers = [];   // { x, y, born, seed }
  }

  // Call once per frame with the feet position and the animation time (seconds).
  update(x, y, t, regen = false) {
    if (this.x === null || t < this.t || Math.hypot(x - this.x, y - this.y) > 200) { // first frame / time reset / teleport
      this.x = x; this.y = y; this.t = t; this.stillSince = t; this.walked = 0; this.vx = 0; this.vy = 0;
      return this;
    }
    const d = Math.hypot(x - this.x, y - this.y), dt = t - this.t;
    if (d > 0.05) this.stillSince = t;
    if (dt > 0) { // smoothed velocity (afterimages trail behind it)
      this.vx += ((x - this.x) / dt - this.vx) * 0.3;
      this.vy += ((y - this.y) / dt - this.vy) * 0.3;
    }
    if (regen) {
      this.walked += d;
      const R = UNIQUE_AURA.regen;
      if (this.walked >= R.flowerEvery) {
        this.walked = 0;
        this.flowers.push({ x, y, born: t, seed: (x * 13.7 + y * 7.1) % 6.28 });
        if (this.flowers.length > R.flowers) this.flowers.shift();
      }
    }
    this.flowers = this.flowers.filter((f) => t - f.born < UNIQUE_AURA.regen.flowerLife);
    this.x = x; this.y = y; this.t = t;
    return this;
  }

  stillFor(t) { return t - this.stillSince; }

  // 0…1: how far the full-set pillar has grown (0 while moving or not a full set)
  pillar(t, set) {
    if (!set) return 0;
    const s = this.stillFor(t) - SET_PILLAR.still;
    return s <= 0 ? 0 : Math.min(1, s / SET_PILLAR.grow);
  }
}
