// New enemy behaviours of spec §41.1 (Proyek A): Katak Rawa `leap`, Semak Penyergap `ambush`,
// Roh Embun `trail` (with its `puddle` hazard), Penjaga Cermin `mirror`. Pure logic on the run
// state; run/enemies.js aiStep / stepHazards call in here. Numbers in data/enemies.js.
import { traitMods } from './traits.js';
import { ENEMIES } from '../data/enemies.js';

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
  run.shots.push({ x: h.x, y: h.y, vx: Math.cos(a) * r.speed, vy: Math.sin(a) * r.speed, r: r.r, dmg: r.dmg * (e.dmg / b.dmg), life: 4, color: r.color, onHit: null, by: e.type, look: r.look }); // made outside the enemy's step: scaled here like its touch
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

// --- A3/A4 (spec §41.1): Hyena Pasir `pack`, Kumbang Pembelah `split`, Meriam Magma `mortar`,
// Totem Bara / Obelisk Hampa `totem`, Kembar Hampa `twin`.

const segDist = (px, py, ax, ay, bx, by) => {
  const lx = bx - ax, ly = by - ay, k = Math.max(0, Math.min(1, ((px - ax) * lx + (py - ay) * ly) / (lx * lx + ly * ly || 1)));
  return Math.hypot(ax + lx * k - px, ay + ly * k - py);
};

// Hyena Pasir: circles the player at `ring`; when its timer is up the whole pack around the player
// howls together (a line on the ground for each), then rushes in.
export function pack(run, e, b, dt) {
  if (e.mode === 'wind') {
    if (e.modeT <= 0) { e.mode = 'dash'; e.modeT = b.dash.time; }
    return STILL;
  }
  if (e.mode === 'dash') {
    if (e.modeT <= 0) { e.mode = 'rest'; e.modeT = b.rest; }
    return { vx: e.dirX * b.dash.speed, vy: e.dirY * b.dash.speed };
  }
  if (e.mode === 'rest') {
    if (e.modeT <= 0) { e.mode = 'walk'; e.actT = b.every; e.ang = undefined; }
    return STILL;
  }
  if (e.ang === undefined) e.ang = Math.atan2(e.y - run.py, e.x - run.px);
  e.ang += b.spin * dt;
  const d = Math.hypot(e.x - run.px, e.y - run.py);
  if (e.actT <= 0 && Math.abs(d - b.ring) < 70) {
    for (const o of run.enemies) {
      if (o.ai !== 'pack' || o.hp <= 0 || o.mode !== 'walk' || Math.hypot(o.x - run.px, o.y - run.py) > b.ring + 220) continue;
      howl(run, o, ENEMIES[o.type]);
    }
    return STILL;
  }
  return toward(e, run.px + Math.cos(e.ang) * b.ring, run.py + Math.sin(e.ang) * b.ring, e.speed);
}
function howl(run, e, b) {
  e.mode = 'wind'; e.modeT = b.windup;
  const t = toward(e, run.px, run.py, 1);
  e.dirX = t.vx; e.dirY = t.vy;
  const len = b.dash.speed * b.dash.time;
  run.hazards.push({ kind: 'line', x: e.x, y: e.y, x2: e.x + e.dirX * len, y2: e.y + e.dirY * len, w: e.r * 2, t: b.windup, max: b.windup, dmg: 0, by: e.type });
}

// Meriam Magma: keeps far back; winds up, then lobs a shell — a danger circle on the player.
export function mortar(run, e, b) {
  if (e.mode === 'wind') {
    if (e.modeT <= 0) {
      const l = b.lob;
      run.hazards.push({ kind: 'circle', x: run.px, y: run.py, r: l.radius, t: l.fuse, max: l.fuse, dmg: l.dmg, onHit: l.onHit, by: e.type, look: 'magma', shell: { x: e.x, y: e.y } }); // scaled by run.js scaleMade
      e.mode = 'walk'; e.actT = b.every;
    }
    return STILL;
  }
  const t = toward(e, run.px, run.py, e.speed);
  if (e.actT <= 0 && t.d < b.keep + 220) { e.mode = 'wind'; e.modeT = b.windup; return STILL; }
  if (t.d > b.keep + 20) return t;
  if (t.d < b.keep - 40) return { vx: -t.vx, vy: -t.vy };
  return { vx: -t.vy * 0.4, vy: t.vx * 0.4 };
}

// Totem Bara / Obelisk Hampa: still; hastens and wards the enemies around it (foeStep takes the
// gift back once they leave or it falls). The obelisk also sweeps a turning beam.
export function totem(run, e, b, dt) {
  for (const o of run.enemies) {
    if (o === e || o.hp <= 0 || o.ai === 'totem' || o.boss || (o.x - e.x) ** 2 + (o.y - e.y) ** 2 > b.radius ** 2) continue;
    if (!o.warded) { o.warded = true; o.speedBase = o.speed; o.speed *= 1 + b.haste; o.wardMax = o.maxHp * b.ward; o.ward = o.wardMax; }
    o.hasteT = 0.25;
    o.wardBy = b.color;
  }
  if (b.beam) {
    const m = b.beam;
    e.beamA = (e.beamA ?? 0) + m.spin * dt;
    if (e.beamCd > 0) e.beamCd -= dt;
    const bx = e.x + Math.cos(e.beamA) * m.len, by = e.y + Math.sin(e.beamA) * m.len;
    if (!(e.beamCd > 0) && segDist(run.px, run.py, e.x, e.y, bx, by) < m.w / 2 + 9) { e.beamCd = m.every; run.hurtPlayer(m.dmg * (e.dmg / b.dmg), null, e.type); }
  }
  return STILL;
}

// Kembar Hampa: with a living twin, each takes one side of the player so the beam between them
// cuts across the player; alone, it just chases.
export function twin(run, e, b) {
  const p = e.partner;
  if (!p || p.hp <= 0) return toward(e, run.px, run.py, e.speed);
  const mx = (e.x + p.x) / 2, my = (e.y + p.y) / 2, axis = Math.atan2(my - run.py, mx - run.px) + (e.lead ? 1 : -1) * Math.PI / 2;
  return toward(e, run.px + Math.cos(axis) * b.flank, run.py + Math.sin(axis) * b.flank, e.speed);
}

// Every step for every living enemy, beside its behaviour: a totem's gift wearing off, twins
// finding each other and their beam.
export function foeStep(run, e, dt, b) {
  if (e.hasteT > 0 && (e.hasteT -= dt) <= 0) { e.speed = e.speedBase; e.ward = 0; e.wardMax = 0; e.warded = false; }
  if (e.ai !== 'twin') return;
  if (!e.partner || !run.enemies.includes(e.partner)) {
    e.partner = null; e.lead = false;
    let best = null, bd = b.link.max ** 2 * 4;
    for (const o of run.enemies) {
      if (o === e || o.ai !== 'twin' || o.hp <= 0 || (o.partner && run.enemies.includes(o.partner))) continue;
      const d = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
      if (d < bd) { bd = d; best = o; }
    }
    if (best) { e.partner = best; best.partner = e; e.lead = true; best.lead = false; }
  }
  const p = e.partner;
  if (!e.lead || !p || p.hp <= 0 || e.hp <= 0) return; // the lead twin owns the beam
  const L = b.link;
  if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > L.max ** 2) return;
  if (e.linkCd > 0) e.linkCd -= dt;
  if (!(e.linkCd > 0) && segDist(run.px, run.py, e.x, e.y, p.x, p.y) < L.w / 2 + 9) { e.linkCd = L.every; run.hurtPlayer(L.dmg * (e.dmg / b.dmg), null, e.type); }
}

// An enemy at 0 HP: true when it is only down (a twin whose twin still stands) and must not be
// removed this step; rises again after `revive` s.
export function twinDown(run, e, dt, b) {
  if (e.ai !== 'twin') return false;
  const p = e.partner, partnerUp = p && run.enemies.includes(p) && p.hp > 0;
  if (!e.down) {
    if (!partnerUp) return false;
    e.down = true; e.hidden = true; e.reviveT = b.revive; e.ward = 0;
    run.spawnBurst(e.x, e.y, '#b98aff', 12);
    return true;
  }
  if (!partnerUp) { e.down = false; e.hidden = false; return false; }
  if ((e.reviveT -= dt) <= 0) {
    e.down = false; e.hidden = false; e.hp = e.maxHp * b.reviveHp;
    run.spawnBurst(e.x, e.y, '#d8b8ff', 16);
    run.pulses.push({ x: e.x, y: e.y, r: e.r * 3, t: 0.4, max: 0.4, color: '190,120,255' });
  }
  return true;
}

// Death of a splitting beetle: its young, at the same strength ratio, around where it fell.
export function splitDeath(run, e, b) {
  if (!b.split) return;
  const k = e.maxHp / b.hp / (e.elite ? 2 : 1), kd = e.dmg / b.dmg;
  for (let i = 0; i < b.split.count; i++) {
    const c = run.spawnEnemy(b.split.type), base = ENEMIES[c.type];
    c.maxHp = c.hp = base.hp * Math.max(1, k * 0.8);
    c.dmg = base.dmg * kd;
    c.level = e.level; c.zone = e.zone; c.gap = e.gap; c.gapLv = e.gapLv; // kd already holds the parent's Power gap
    const a = (i / b.split.count) * Math.PI * 2 + 0.6;
    c.x = e.x + Math.cos(a) * (e.r + 4); c.y = e.y + Math.sin(a) * (e.r + 4);
    c.kx = Math.cos(a) * 160; c.ky = Math.sin(a) * 160;
  }
  run.spawnBurst(e.x, e.y, '#c9a26a', 14);
}
