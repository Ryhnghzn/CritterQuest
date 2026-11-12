// Load guard (data/loadguard.js): from the frame times and the enemies alive, a level 0 (all on),
// 1 (HUD decorations still) or 2 (also the 3D world lite). It climbs after `rise` seconds over a
// line and comes down only after `settle` easy seconds, so it does not flicker. Pure.
import { LOAD_GUARD } from '../data/loadguard.js';

export class LoadGuard {
  constructor(touch = false, cfg = LOAD_GUARD) { this.touch = touch; this.cfg = cfg; this.reset(); }
  reset() { this.level = 0; this.t = 0; this.frames = 0; this.over = [0, 0, 0]; this.easy = 0; this.fps = 60; }
  // dt: seconds of the frame; foes: enemies alive. Returns the level (changes only per sample).
  push(dt, foes) {
    this.t += dt; this.frames++;
    const c = this.cfg;
    if (this.t < c.window) return this.level;
    this.fps = this.frames / this.t;
    const span = this.t; this.t = 0; this.frames = 0;
    const lines = [null, c.calm, c.lite];
    const want = (L) => foes >= (this.touch ? L.touchFoes : L.foes) || this.fps < L.fps;
    const fine = (L) => foes < (this.touch ? L.touchFoes : L.foes) * c.ease && this.fps >= L.fps + 10;
    for (const k of [1, 2]) this.over[k] = want(lines[k]) ? this.over[k] + span : 0;
    const up = this.over[2] >= c.rise ? 2 : this.over[1] >= c.rise ? 1 : 0;
    if (up > this.level) { this.level = up; this.easy = 0; return this.level; }
    if (this.level > 0 && fine(lines[this.level])) {
      this.easy += span;
      if (this.easy >= c.settle) { this.level--; this.easy = 0; }
    } else this.easy = 0;
    return this.level;
  }
}
