// Enemy behaviour (spec §18.1): keep-distance casters, chargers, bombers,
// shields, Raja Maw's attack patterns; enemy projectiles (run.shots) and
// telegraphed danger zones (run.hazards). Pure logic on the run state.
import { rand, rrange } from '../core/rng.js';
import { ENEMIES, SHIELD_PIERCING } from '../data/enemies.js';
import { sfx } from '../core/audio.js';

const TAU = Math.PI * 2;
const PIERCE = new Set(SHIELD_PIERCING);

export function initAi(e) {
  const b = ENEMIES[e.type];
  e.ai = b.ai || 'chase';
  e.mode = 'walk'; e.modeT = 0;
  e.actT = (b.every || 0) * rrange(0.4, 1);
  e.face = 0; e.dirX = 0; e.dirY = 0;
  e.owner = null; e.pat = null;
}

const toward = (e, x, y, speed) => {
  const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy) || 1;
  return { vx: (dx / d) * speed, vy: (dy / d) * speed, d };
};

// Desired velocity for this step; also runs the enemy's special action.
export function aiStep(run, e, dt) {
  const b = ENEMIES[e.type];
  if (e.modeT > 0) e.modeT -= dt;
  if (e.actT > 0) e.actT -= dt;
  switch (e.ai) {
    case 'ranged': case 'summon': case 'heal': return caster(run, e, b, dt);
    case 'charge': return charge(run, e, b, dt);
    case 'bomb': return bomb(run, e, b);
    case 'shield': {
      const want = Math.atan2(run.py - e.y, run.px - e.x);
      let diff = Math.atan2(Math.sin(want - e.face), Math.cos(want - e.face));
      e.face += Math.max(-b.turn * dt, Math.min(b.turn * dt, diff));
      return toward(e, run.px, run.py, e.speed);
    }
    case 'boss': return boss(run, e, b, dt);
    case 'burrow': return burrow(run, e, b);
    case 'blink': return blink(run, e, b);
    default: return toward(e, run.px, run.py, e.speed);
  }
}

// Keep a distance, strafe, then wind up and act (shoot / summon / heal).
function caster(run, e, b) {
  const t = toward(e, run.px, run.py, e.speed);
  if (e.mode === 'wind') {
    if (e.modeT <= 0) { act(run, e, b); e.mode = 'walk'; e.actT = b.every; }
    return { vx: 0, vy: 0 };
  }
  if (e.actT <= 0 && t.d < b.keep + 120) { e.mode = 'wind'; e.modeT = b.windup; return { vx: 0, vy: 0 }; }
  if (t.d > b.keep + 20) return t;
  if (t.d < b.keep - 40) return { vx: -t.vx, vy: -t.vy };
  return { vx: -t.vy * 0.5, vy: t.vx * 0.5 }; // strafe
}

function act(run, e, b) {
  if (b.shot) {
    const a = Math.atan2(run.py - e.y, run.px - e.x), n = b.shot.count || 1;
    for (let i = 0; i < n; i++) fire(run, e.x, e.y, a + (i - (n - 1) / 2) * (b.shot.spread || 0), b.shot);
  } else if (b.summon) summon(run, e, b.summon);
  else if (b.heal) {
    for (const o of run.enemies) {
      if (o.hp <= 0 || (o.x - e.x) ** 2 + (o.y - e.y) ** 2 > b.heal.radius ** 2) continue;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * b.heal.amount);
    }
    run.pulses.push({ x: e.x, y: e.y, r: b.heal.radius, t: 0.5, max: 0.5, color: '120,255,160' });
  }
}

export function fire(run, x, y, angle, s) {
  run.shots.push({ x, y, vx: Math.cos(angle) * s.speed, vy: Math.sin(angle) * s.speed, r: s.r, dmg: s.dmg, life: 5, color: s.color, onHit: s.onHit || null });
}

function summon(run, e, s) {
  let mine = 0;
  for (const o of run.enemies) if (o.owner === e && o.hp > 0) mine++;
  for (let i = 0; i < s.count && mine < s.max; i++, mine++) {
    const m = run.spawnEnemy(s.type);
    const a = rand() * TAU;
    m.x = e.x + Math.cos(a) * (e.r + 14); m.y = e.y + Math.sin(a) * (e.r + 14);
    m.owner = e;
  }
  run.pulses.push({ x: e.x, y: e.y, r: e.r * 2.5, t: 0.4, max: 0.4, color: '194,107,216' });
}

// Walk up, freeze with a warning line, dash straight, rest.
function charge(run, e, b, dt = 1 / 60) {
  const t = toward(e, run.px, run.py, e.speed);
  if (e.mode === 'wind') {
    if (e.modeT <= 0) { e.mode = 'dash'; e.modeT = b.dash.time; }
    return { vx: 0, vy: 0 };
  }
  if (e.mode === 'dash') {
    if (e.modeT <= 0) { e.mode = 'rest'; e.modeT = b.rest; }
    if (b.trail && (e.trailT = (e.trailT || 0) - dt) <= 0) { // fire bursts left behind (Salamander)
      e.trailT = b.trail.every;
      run.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: b.trail.r, t: b.trail.fuse, max: b.trail.fuse, dmg: e.dmg * b.trail.dmg, onHit: b.onHit || null, small: true });
    }
    return { vx: e.dirX * b.dash.speed, vy: e.dirY * b.dash.speed };
  }
  if (e.mode === 'rest') {
    if (e.modeT <= 0) { e.mode = 'walk'; e.actT = b.every; }
    return { vx: 0, vy: 0 };
  }
  if (e.actT <= 0 && t.d < b.range) {
    e.mode = 'wind'; e.modeT = b.windup;
    e.dirX = t.vx / (e.speed || 1); e.dirY = t.vy / (e.speed || 1);
    const len = b.dash.speed * b.dash.time;
    run.hazards.push({ kind: 'line', x: e.x, y: e.y, x2: e.x + e.dirX * len, y2: e.y + e.dirY * len, w: e.r * 2, t: b.windup, max: b.windup, dmg: 0 });
    return { vx: 0, vy: 0 };
  }
  return t;
}

// Run at the player; close enough → fuse (danger circle) → blast.
function bomb(run, e, b) {
  if (e.mode === 'fuse') return { vx: 0, vy: 0 };
  const t = toward(e, run.px, run.py, e.speed);
  if (t.d < b.trigger) explodeLater(run, e, b);
  return t;
}

function explodeLater(run, e, b) {
  e.mode = 'fuse';
  run.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: b.blast.radius, t: b.fuse, max: b.fuse, dmg: b.blast.dmg, bomber: e, onHit: b.blast.onHit || null });
}

// Cacing Pasir (spec §25.4): swims under the sand (can't be hit) toward the player,
// stops, a danger circle shows where it will burst out, erupts, stays up a while, dives again.
function burrow(run, e, b) {
  if (e.mode === 'walk') { e.mode = 'under'; e.modeT = b.under; e.hidden = true; }
  if (e.mode === 'under') {
    const t = toward(e, run.px, run.py, e.speed);
    if (e.modeT <= 0 || t.d < 30) {
      e.mode = 'rise'; e.modeT = b.rise;
      run.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: b.blast.radius, t: b.rise, max: b.rise, dmg: b.blast.dmg });
      return { vx: 0, vy: 0 };
    }
    return t;
  }
  if (e.mode === 'rise') {
    if (e.modeT <= 0) { e.mode = 'up'; e.modeT = b.up; e.hidden = false; run.spawnBurst(e.x, e.y, '#c9a26a', 14); }
    return { vx: 0, vy: 0 };
  }
  if (e.modeT <= 0) { e.mode = 'under'; e.modeT = b.under; e.hidden = true; run.spawnBurst(e.x, e.y, '#c9a26a', 10); return { vx: 0, vy: 0 }; }
  return toward(e, run.px, run.py, b.upSpeed);
}

// Hantu Gerhana: drifts at a distance, fades out (cannot be hit), appears beside the
// player and bursts into a ring of shots.
function blink(run, e, b) {
  if (e.mode === 'fade') {
    if (e.modeT <= 0) {
      const a = rand() * TAU, d = b.near[0] + rand() * (b.near[1] - b.near[0]);
      e.x = run.px + Math.cos(a) * d; e.y = run.py + Math.sin(a) * d;
      e.mode = 'appear'; e.modeT = b.appear; e.hidden = false;
      run.spawnBurst(e.x, e.y, b.ring.color, 12);
    }
    return { vx: 0, vy: 0 };
  }
  if (e.mode === 'appear') {
    if (e.modeT <= 0) {
      for (let i = 0; i < b.ring.count; i++) fire(run, e.x, e.y, (i / b.ring.count) * TAU, b.ring);
      e.mode = 'walk'; e.actT = b.every;
    }
    return { vx: 0, vy: 0 };
  }
  if (e.actT <= 0) {
    e.mode = 'fade'; e.modeT = b.fade; e.hidden = true;
    run.spawnBurst(e.x, e.y, b.ring.color, 10);
    return { vx: 0, vy: 0 };
  }
  const t = toward(e, run.px, run.py, e.speed);
  if (t.d > b.keep + 20) return t;
  if (t.d < b.keep - 40) return { vx: -t.vx, vy: -t.vy };
  return { vx: -t.vy * 0.5, vy: t.vx * 0.5 };
}

// Called when an enemy dies (before it is removed).
export function onDeath(run, e) {
  const b = ENEMIES[e.type];
  if (e.ai === 'bomb' && e.mode !== 'fuse') {
    run.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: b.blast.radius, t: 0.4, max: 0.4, dmg: b.blast.dmg, onHit: b.blast.onHit || null });
  }
}

// Raja Maw: one pattern at a time, standing still while it fires.
function boss(run, e, b, dt) {
  const enraged = e.hp < e.maxHp * b.enrageAt;
  if (e.mode === 'wind' || e.mode === 'dash' || e.mode === 'rest') {
    const v = charge(run, e, b);
    if (e.mode === 'walk') e.actT = enraged ? b.enragedEvery : b.every;
    return v;
  }
  if (e.pat) { stepPattern(run, e, b, dt, enraged); return { vx: 0, vy: 0 }; }
  if (e.actT <= 0) {
    const id = b.patterns[Math.floor(rand() * b.patterns.length)];
    if (id === 'charge') {
      e.actT = 0;
      e.mode = 'walk';
      const t = toward(e, run.px, run.py, e.speed);
      e.dirX = t.vx / (e.speed || 1); e.dirY = t.vy / (e.speed || 1);
      e.mode = 'wind'; e.modeT = b.windup;
      const len = b.dash.speed * b.dash.time;
      run.hazards.push({ kind: 'line', x: e.x, y: e.y, x2: e.x + e.dirX * len, y2: e.y + e.dirY * len, w: e.r * 2, t: b.windup, max: b.windup, dmg: 0 });
      return { vx: 0, vy: 0 };
    }
    if (id === 'summon') { summon(run, e, b.summon); e.actT = enraged ? b.enragedEvery : b.every; return { vx: 0, vy: 0 }; }
    e.pat = { id, t: 0, n: 0, fireT: 0, a0: rand() * TAU };
    sfx.boss();
    return { vx: 0, vy: 0 };
  }
  return toward(e, run.px, run.py, e.speed);
}

function stepPattern(run, e, b, dt, enraged) {
  const p = e.pat;
  p.t += dt; p.fireT -= dt;
  const done = () => { e.pat = null; e.actT = enraged ? b.enragedEvery : b.every; };
  if (p.id === 'ring') {
    const r = b.ring, waves = r.waves + (enraged ? 1 : 0), count = r.count + (enraged ? 6 : 0);
    if (p.fireT <= 0 && p.n < waves) {
      const off = p.a0 + (p.n % 2) * (Math.PI / count);
      for (let i = 0; i < count; i++) fire(run, e.x, e.y, off + (i / count) * TAU, r);
      p.n++; p.fireT = r.gap;
    } else if (p.n >= waves && p.fireT <= 0) done();
  } else if (p.id === 'spiral') {
    const s = b.spiral, arms = s.arms + (enraged ? 1 : 0);
    if (p.fireT <= 0) {
      for (let i = 0; i < arms; i++) fire(run, e.x, e.y, p.a0 + p.t * s.turn + (i / arms) * TAU, s);
      p.fireT = s.every;
    }
    if (p.t >= s.time) done();
  } else if (p.id === 'slam') {
    const s = b.slam, count = s.count + (enraged ? 2 : 0);
    if (p.fireT <= 0 && p.n < count) {
      run.hazards.push({ kind: 'circle', x: run.px, y: run.py, r: s.radius, t: s.fuse, max: s.fuse, dmg: s.dmg });
      p.n++; p.fireT = s.gap * (enraged ? 0.75 : 1);
    } else if (p.n >= count && p.fireT <= 0) done();
  } else done();
}

// Enemy projectiles: fly, hit the player (unless dodging / invulnerable), leave the room.
// bound: how far from (cx, cy) a shot may fly (the room, or around the player in a region)
export function stepShots(run, dt, bound, cx = 0, cy = 0) {
  const S = run.shots;
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    const hit = (s.x - run.px) ** 2 + (s.y - run.py) ** 2 < (s.r + 9) ** 2;
    if (hit && run.hurtPlayer(s.dmg, s.onHit)) s.life = 0;
    if (s.life <= 0 || (s.x - cx) ** 2 + (s.y - cy) ** 2 > (bound + 40) ** 2) { S[i] = S[S.length - 1]; S.pop(); }
  }
}

// Telegraphed zones: when the timer runs out, circles deal damage to whoever is inside.
export function stepHazards(run, dt) {
  const H = run.hazards;
  for (let i = H.length - 1; i >= 0; i--) {
    const h = H[i];
    h.t -= dt;
    if (h.bomber) { h.x = h.bomber.x; h.y = h.bomber.y; }
    if (h.t > 0) continue;
    if (h.kind === 'circle' && h.dmg > 0) {
      if ((run.px - h.x) ** 2 + (run.py - h.y) ** 2 < (h.r + 8) ** 2) run.hurtPlayer(h.dmg, h.onHit);
      run.spawnBurst(h.x, h.y, '#ff7a3c', h.small ? 6 : 18);
      run.pulses.push({ x: h.x, y: h.y, r: h.r, t: 0.3, max: 0.3, color: '255,140,60' });
      if (!h.small) { run.addShake('medium'); sfx.hurt(); }
      if (h.bomber) h.bomber.hp = 0;
    }
    H[i] = H[H.length - 1]; H.pop();
    if (run.state !== 1) return; // the blast killed the player
  }
}

// Damage multiplier for a hit on a shielded enemy: basic attacks from the front are blocked.
export function guardFactor(run, e, h) {
  if (e.ai !== 'shield' || PIERCE.has(h.fx) || h.chained) return 1;
  const g = ENEMIES[e.type].guard;
  const a = Math.atan2(run.py - e.y, run.px - e.x);
  const diff = Math.abs(Math.atan2(Math.sin(a - e.face), Math.cos(a - e.face)));
  return diff <= (g.arc * Math.PI) / 360 ? 1 - g.reduce : 1;
}
