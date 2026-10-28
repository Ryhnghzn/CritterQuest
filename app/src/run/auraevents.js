// One-off bursts for the unique gear effects (plan "Efek Lebay" §D), fired from
// run/run.js at the moment the effect does something. Visual only: everything
// goes through run.vfx, which has its own PRNG and honours the effects setting.
import { AURA_EVENTS as C, UNIQUE_AURA } from '../data/aurafx.js';

// blood flowing from the struck enemy into the player (lifesteal)
export function bloodThread(run, e) {
  const v = run.vfx;
  if (v.rand() > UNIQUE_AURA.lifesteal.threadChance) return;
  const n = Math.max(2, Math.round(6 * v.mul)), life = 0.32;
  for (let i = 0; i < n; i++) {
    const k = i / n, sx = e.x + (run.px - e.x) * k * 0.3, sy = e.y + (run.py - 18 - e.y) * k * 0.3;
    const tx = run.px + v.range(-4, 4), ty = run.py - 18 + v.range(-4, 4);
    v.spawn('dot', sx, sy, (tx - sx) / life, (ty - sy) / life, life * (1 - k * 0.3), v.range(1.4, 2.4), C.lifesteal);
  }
}

// thorns striking back at an attacker
export function thornsBurst(run, e) {
  const a = Math.atan2(e.y - run.py, e.x - run.px);
  run.vfx.burst('shards', run.px, run.py - 6, C.thorns, { n: 8, angle: a, spread: 1.2, speed: 1.3 });
  run.vfx.ring(run.px, run.py + 6, { r1: 26, life: 0.25, color: '#b07ad0', width: 3 });
}

// layered blast on a kill (explode)
export function killBlast(run, x, y) {
  const v = run.vfx;
  v.ring(x, y, { r1: 48, life: 0.35, color: '#ff9a3c', width: 5 });
  v.ring(x, y, { r1: 28, life: 0.25, color: '#ffe27a', width: 3 });
  v.burst('blast', x, y, C.explode, { n: 16 });
  v.burst('smoke', x, y, '#3a2a2a', { n: 4 });
  v.crack(x, y + 4, { rays: 5, len: 26, life: 0.8, color: '#ff9a3c' });
}

// rising from the ashes (phoenix): fire covers the screen
export function phoenixRise(run) {
  const v = run.vfx, x = run.px, y = run.py;
  v.flash('#ff8a3c', 0.6, 0.45);
  for (let i = 0; i < 3; i++) v.ring(x, y, { r1: 90 + i * 70, life: 0.5 + i * 0.15, color: i === 1 ? '#ffe27a' : '#ff6a2a', width: 7 - i * 2, delay: i * 0.08 });
  v.burst('blast', x, y, C.phoenix, { n: 60, speed: 1.6 });
  v.burst('stars', x, y - 20, C.phoenix, { n: 12, speed: 1.4 });
  v.burst('smoke', x, y, '#3a2420', { n: 10 });
  v.crack(x, y + 8, { rays: 9, len: 70, color: '#ff9a3c' });
  run.addShake('heavy');
}

// the shield soaking a hit
export function shieldFlash(run) {
  run.vfx.ring(run.px, run.py - 18, { r0: 18, r1: 30, life: 0.25, color: '#96c8ff', width: 3 });
  run.vfx.burst('shards', run.px, run.py - 18, C.shield, { n: 5, speed: 0.7 });
}

// gold glints where an enemy falls (goldfind)
export function goldGlint(run, e) {
  run.vfx.burst('stars', e.x, e.y - 6, C.gold, { n: 4, speed: 0.6 });
}
