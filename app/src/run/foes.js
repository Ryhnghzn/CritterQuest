// New enemy behaviours of spec §41.1 (Proyek A): Katak Rawa `leap`, Semak Penyergap `ambush`,
// Roh Embun `trail` (with its `puddle` hazard), Penjaga Cermin `mirror`. Pure logic on the run
// state; run/enemies.js aiStep / stepHazards call in here. Numbers in data/enemies.js.
import { traitMods } from './traits.js';

const toward = (e, x, y, speed) => {
  const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy) || 1;
  return { vx: (dx / d) * speed, vy: (dy / d) * speed, d };
};
const STILL = { vx: 0, vy: 0 };

// Katak Rawa: walk in; in range → a danger circle on the player, fly onto it over `windup` s
// (the circle goes off as it lands), rest.
export function leap(run, e, b) {
  if (e.mode === 'air') {
    if (e.modeT <= 0) { e.mode = 'rest'; e.modeT = b.rest; e.x = e.toX; e.y = e.toY; return STILL; }
    return { vx: e.dirX, vy: e.dirY };
  }
  if (e.mode === 'rest') {
    if (e.modeT <= 0) { e.mode = 'walk'; e.actT = b.every; }
    return STILL;
  }
  const t = toward(e, run.px, run.py, e.speed);
  if (e.actT <= 0 && t.d < b.range) {
    e.mode = 'air'; e.modeT = b.windup;
    e.toX = run.px; e.toY = run.py;
    e.dirX = (run.px - e.x) / b.windup; e.dirY = (run.py - e.y) / b.windup; // velocity that lands on the mark
    run.hazards.push({ kind: 'circle', x: run.px, y: run.py, r: b.land.radius, t: b.windup, max: b.windup, dmg: b.land.dmg, by: e.type, look: 'leap' });
    return { vx: e.dirX, vy: e.dirY };
  }
  return t;
}

// Semak Penyergap: hidden (cannot be targeted or touched) until the player comes close, then a
// short pounce, then an ordinary chase; hides again after `rehide` s further than `lose` away.
export function ambush(run, e, b, dt) {
  if (e.mode === 'walk') { e.mode = 'hide'; e.hidden = true; } // spawns hidden
  const t = toward(e, run.px, run.py, e.speed);
  if (e.mode === 'hide') {
    if (t.d < b.trigger) {
      e.mode = 'pounce'; e.modeT = b.dash.time; e.hidden = false;
      e.dirX = t.vx / (e.speed || 1); e.dirY = t.vy / (e.speed || 1);
      run.spawnBurst(e.x, e.y, '#6fae4a', 14);
    }
    return STILL;
  }
  if (e.mode === 'pounce') {
    if (e.modeT <= 0) { e.mode = 'chase'; e.farT = 0; }
    return { vx: e.dirX * b.dash.speed, vy: e.dirY * b.dash.speed };
  }
  e.mode = 'chase';
  e.farT = t.d > b.lose ? (e.farT || 0) + dt : 0;
  if (e.farT >= b.rehide) { e.mode = 'hide'; e.hidden = true; e.farT = 0; run.spawnBurst(e.x, e.y, '#6fae4a', 8); return STILL; }
  return t;
}

// Roh Embun: drifts at the player, dropping an icy puddle every `spacing` px travelled.
export function trail(run, e, b) {
  if (e.lastX === undefined) { e.lastX = e.x; e.lastY = e.y; }
  if ((e.x - e.lastX) ** 2 + (e.y - e.lastY) ** 2 >= b.spacing ** 2) {
    e.lastX = e.x; e.lastY = e.y;
    const p = b.puddle;
    run.hazards.push({ kind: 'puddle', x: e.x, y: e.y, r: p.r, t: p.life, max: p.life, dmg: 0, slow: p.slow, by: e.type, look: 'ice' });
  }
  return toward(e, run.px, run.py, e.speed);
}

// Penjaga Cermin: turns to the player; every `every` s flashes (`flash`, `windup` s) then holds its
// mirror (`hold`, `hold` s) standing still. While holding, reflectShot turns frontal projectiles back.
export function mirror(run, e, b, dt) {
  const want = Math.atan2(run.py - e.y, run.px - e.x);
  if (!e.faced) { e.face = want; e.faced = true; } // starts facing the player
  const diff = Math.atan2(Math.sin(want - e.face), Math.cos(want - e.face));
  e.face += Math.max(-b.turn * dt, Math.min(b.turn * dt, diff));
  if (e.mode === 'flash') {
    if (e.modeT <= 0) { e.mode = 'hold'; e.modeT = b.hold; }
    return STILL;
  }
  if (e.mode === 'hold') {
    if (e.modeT <= 0) { e.mode = 'walk'; e.actT = b.every; }
    return STILL;
  }
  if (e.actT <= 0) { e.mode = 'flash'; e.modeT = b.windup; return STILL; }
  return toward(e, run.px, run.py, e.speed);
}

// A player projectile `h` touching enemy `e`: true when a raised mirror sends it back at the player
// (the projectile is spent, the enemy takes nothing). Frontal = the projectile flies against e.face.
export function reflectShot(run, h, e, b) {
  if (e.ai !== 'mirror' || e.mode !== 'hold') return false;
  const from = Math.atan2(-h.vy, -h.vx); // direction the projectile came from, seen from the enemy
  const diff = Math.abs(Math.atan2(Math.sin(from - e.face), Math.cos(from - e.face)));
  if (diff > (b.arc * Math.PI) / 360) return false;
  const r = b.reflect, a = Math.atan2(run.py - e.y, run.px - e.x);
  run.shots.push({ x: h.x, y: h.y, vx: Math.cos(a) * r.speed, vy: Math.sin(a) * r.speed, r: r.r, dmg: r.dmg, life: 4, color: r.color, onHit: null, by: e.type, look: r.look });
  run.pulses.push({ x: h.x, y: h.y, r: 26, t: 0.25, max: 0.25, color: '207,239,255' });
  h.dead = true;
  return true;
}

// An icy puddle (Roh Embun): while it lasts, a player inside is slowed. Returns true when it is gone.
// (Damaging pools are the bosses' `zone` hazard in run/enemies.js.)
export function stepPuddle(run, h) {
  const inside = (run.px - h.x) ** 2 + (run.py - h.y) ** 2 < (h.r + 6) ** 2;
  if (inside && !traitMods(run).slowImmune) { run.slowK = run.slowT > 0 ? Math.max(run.slowK, h.slow[0]) : h.slow[0]; run.slowT = Math.max(run.slowT, h.slow[1]); }
  return h.t <= 0;
}
