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
  if (e.actT > 0) e.actT -= dt * (e.tempo || 1); // Cepat elites act sooner (run/affix.js)
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
    for (let i = 0; i < n; i++) fire(run, e.x, e.y, a + (i - (n - 1) / 2) * (b.shot.spread || 0), b.shot, e.type);
  } else if (b.summon) summon(run, e, b.summon);
  else if (b.heal) {
    for (const o of run.enemies) {
      if (o.hp <= 0 || (o.x - e.x) ** 2 + (o.y - e.y) ** 2 > b.heal.radius ** 2) continue;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * b.heal.amount);
    }
    run.pulses.push({ x: e.x, y: e.y, r: b.heal.radius, t: 0.5, max: 0.5, color: '120,255,160' });
  }
}

// by: the enemy type firing it (death dialog)
export function fire(run, x, y, angle, s, by = null) {
  run.shots.push({ x, y, vx: Math.cos(angle) * s.speed, vy: Math.sin(angle) * s.speed, r: s.r, dmg: s.dmg, life: 5, color: s.color, onHit: s.onHit || null, by, look: s.look || null });
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
      run.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: b.trail.r, t: b.trail.fuse, max: b.trail.fuse, dmg: e.dmg * b.trail.dmg, onHit: b.onHit || null, small: true, by: e.type });
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
  run.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: b.blast.radius, t: b.fuse, max: b.fuse, dmg: b.blast.dmg, bomber: e, onHit: b.blast.onHit || null, by: e.type });
}

// Cacing Pasir (spec §25.4): swims under the sand (can't be hit) toward the player,
// stops, a danger circle shows where it will burst out, erupts, stays up a while, dives again.
function burrow(run, e, b) {
  if (e.mode === 'walk') { e.mode = 'under'; e.modeT = b.under; e.hidden = true; }
  if (e.mode === 'under') {
    const t = toward(e, run.px, run.py, e.speed);
    if (e.modeT <= 0 || t.d < 30) {
      e.mode = 'rise'; e.modeT = b.rise;
      run.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: b.blast.radius, t: b.rise, max: b.rise, dmg: b.blast.dmg, by: e.type });
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
      for (let i = 0; i < b.ring.count; i++) fire(run, e.x, e.y, (i / b.ring.count) * TAU, b.ring, e.type);
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
    run.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: b.blast.radius, t: 0.4, max: 0.4, dmg: b.blast.dmg, onHit: b.blast.onHit || null, by: e.type });
  }
}

// Raja Maw: one pattern at a time, standing still while it fires.
// Bosses with phases (Sang Gerhana) switch pattern lists as their HP drops.
function boss(run, e, b, dt) {
  const enraged = e.hp < e.maxHp * b.enrageAt;
  if (b.phases) {
    const ph = b.phases.reduce((n, p, i) => (e.hp <= e.maxHp * p.at ? i : n), 0);
    if (ph !== (e.phase || 0)) {
      e.phase = ph; e.pat = null; e.mode = 'walk'; e.actT = 1.2;
      run.dark = !!b.phases[ph].dark;
      run.showBanner?.(b.phases[ph].name);
      run.addShake?.('big');
      run.pulses.push({ x: e.x, y: e.y, r: 260, t: 0.8, max: 0.8, color: '199,155,255' });
      return { vx: 0, vy: 0 };
    }
  }
  if (e.mode === 'wind' || e.mode === 'dash' || e.mode === 'rest') {
    const v = charge(run, e, b);
    if (e.mode === 'walk') e.actT = enraged ? b.enragedEvery : b.every;
    return v;
  }
  if (e.pat) { stepPattern(run, e, b, dt, enraged); return { vx: 0, vy: 0 }; }
  if (e.actT <= 0) {
    const list = b.phases ? b.phases[e.phase || 0].patterns : b.patterns;
    const id = list[Math.floor(rand() * list.length)];
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
    if (id === 'echo') { // one attack of a dungeon boss, with its own numbers and colours
      const from = b.echo[Math.floor(rand() * b.echo.length)], cfg = ENEMIES[from];
      const sig = cfg.signature || ['ring', 'spiral', 'slam']; // its own moves (spec §41.2)
      e.pat.id = sig[Math.floor(rand() * sig.length)];
      e.pat.cfg = cfg; e.pat.echo = from;
      run.addFloater?.(e.x, e.y - e.r - 30, cfg.name, cfg.ring.color);
    }
    sfx.boss();
    return { vx: 0, vy: 0 };
  }
  return toward(e, run.px, run.py, e.speed);
}

function stepPattern(run, e, b0, dt, enraged) {
  const p = e.pat, b = p.cfg || b0;
  p.t += dt; p.fireT -= dt;
  const done = () => { e.pat = null; e.actT = enraged ? b0.enragedEvery : b0.every; };
  if (p.id === 'ring') {
    const r = b.ring, waves = r.waves + (enraged ? 1 : 0), count = r.count + (enraged ? 6 : 0);
    if (p.fireT <= 0 && p.n < waves) {
      const off = p.a0 + (p.n % 2) * (Math.PI / count);
      for (let i = 0; i < count; i++) fire(run, e.x, e.y, off + (i / count) * TAU, r, e.type);
      p.n++; p.fireT = r.gap;
    } else if (p.n >= waves && p.fireT <= 0) done();
  } else if (p.id === 'spiral') {
    const s = b.spiral, arms = s.arms + (enraged ? 1 : 0);
    if (p.fireT <= 0) {
      for (let i = 0; i < arms; i++) fire(run, e.x, e.y, p.a0 + p.t * s.turn + (i / arms) * TAU, s, e.type);
      p.fireT = s.every;
    }
    if (p.t >= s.time) done();
  } else if (p.id === 'slam') {
    const s = b.slam, count = s.count + (enraged ? 2 : 0);
    if (p.fireT <= 0 && p.n < count) {
      run.hazards.push({ kind: 'circle', x: run.px, y: run.py, r: s.radius, t: s.fuse, max: s.fuse, dmg: s.dmg, by: e.type, look: s.look || null });
      p.n++; p.fireT = s.gap * (enraged ? 0.75 : 1);
    } else if (p.n >= count && p.fireT <= 0) done();
  } else if (p.id === 'beam') { // beams from the boss outward, each sweep turned a little further
    const s = b.beam;
    if (p.fireT <= 0 && p.n < s.sweeps) {
      for (let i = 0; i < s.count; i++) {
        const a = p.a0 + p.n * s.turn + (i / s.count) * TAU;
        run.hazards.push({ kind: 'line', x: e.x, y: e.y, x2: e.x + Math.cos(a) * s.len, y2: e.y + Math.sin(a) * s.len, w: s.w, t: s.fuse, max: s.fuse, dmg: s.dmg, by: e.type });
      }
      p.n++; p.fireT = s.gap;
    } else if (p.n >= s.sweeps && p.fireT <= 0) done();
  } else if (p.id === 'hole') { // black holes near the player that pull, then collapse
    const s = b.hole;
    for (let i = 0; i < s.count; i++) {
      const a = rand() * TAU, d = 90 + rand() * 120;
      run.hazards.push({ kind: 'hole', x: run.px + Math.cos(a) * d, y: run.py + Math.sin(a) * d, r: s.r, t: s.fuse, max: s.fuse, dmg: s.dmg, pull: s.pull, by: e.type });
    }
    done();
  } else if (p.id === 'gulp') { // Raja Maw (spec §41.2): a pull toward its open mouth, then the bite
    const s = b.gulp;
    if (p.n === 0) {
      const a = Math.atan2(run.py - e.y, run.px - e.x);
      run.hazards.push({ kind: 'hole', x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, r: s.r, t: s.fuse, max: s.fuse, dmg: s.dmg, pull: s.pull * (enraged ? 1.3 : 1), by: e.type, look: 'maw' });
      p.n = 1;
    }
    if (p.t >= s.fuse) done();
  } else if (p.id === 'clones') { // shadows rise around the player, then each fires a ring
    const s = b.clones, n = s.count + (enraged ? 1 : 0);
    if (p.n === 0) {
      p.spots = [];
      for (let i = 0; i < n; i++) {
        const a = p.a0 + (i / n) * TAU, x = run.px + Math.cos(a) * s.dist, y = run.py + Math.sin(a) * s.dist;
        p.spots.push([x, y]);
        run.hazards.push({ kind: 'circle', x, y, r: 26, t: s.warn, max: s.warn, dmg: 0, look: 'maw' });
      }
      p.n = 1;
    }
    if (p.n === 1 && p.t >= s.warn) {
      for (const [x, y] of p.spots) { for (let i = 0; i < s.ring.count; i++) fire(run, x, y, p.a0 + (i / s.ring.count) * TAU, s.ring, e.type); run.spawnBurst(x, y, '#c26bd8', 12); }
      p.n = 2;
    }
    if (p.t >= s.warn + 0.4) done();
  } else if (p.id === 'prism') { // Golem Kristal: crystals around the player, beams flaring between them in turn
    const s = b.prism, n = s.count + (enraged ? 1 : 0);
    if (p.n === 0) { p.pts = Array.from({ length: n }, (_, i) => { const a = p.a0 + (i / n) * TAU; return [run.px + Math.cos(a) * s.dist, run.py + Math.sin(a) * s.dist]; }); p.n = 1; p.k = 0; }
    if (p.fireT <= 0 && p.k < s.flashes) {
      const A = p.pts[p.k % n], B = p.pts[(p.k + 1) % n];
      run.hazards.push({ kind: 'line', x: A[0], y: A[1], x2: B[0], y2: B[1], w: s.w, t: s.fuse, max: s.fuse, dmg: s.dmg, by: e.type });
      p.k++; p.fireT = s.gap;
    } else if (p.k >= s.flashes && p.fireT <= 0) done();
  } else if (p.id === 'shardrain') { // rows of falling shards sweeping from the boss toward the player
    const s = b.shardrain;
    if (p.n === 0) { p.dir = Math.atan2(run.py - e.y, run.px - e.x); p.n = 1; p.k = 0; }
    if (p.fireT <= 0 && p.k < s.rows) {
      const d = e.r + 30 + p.k * s.step, cx = e.x + Math.cos(p.dir) * d, cy = e.y + Math.sin(p.dir) * d, nx = -Math.sin(p.dir), ny = Math.cos(p.dir);
      for (let j = -s.width; j <= s.width; j++) run.hazards.push({ kind: 'circle', x: cx + nx * j * s.gapW, y: cy + ny * j * s.gapW, r: s.r, t: s.fuse, max: s.fuse, dmg: s.dmg, small: true, by: e.type, look: s.look });
      p.k++; p.fireT = s.gap * (enraged ? 0.75 : 1);
    } else if (p.k >= s.rows && p.fireT <= 0) done();
  } else if (p.id === 'shrooms') { // Ratu Spora: mushrooms swell around the player and burst
    const s = b.shrooms;
    for (let i = 0; i < s.count + (enraged ? 2 : 0); i++) {
      const a = rand() * TAU, d = s.near[0] + rand() * (s.near[1] - s.near[0]);
      run.hazards.push({ kind: 'circle', x: run.px + Math.cos(a) * d, y: run.py + Math.sin(a) * d, r: s.r, t: s.fuse, max: s.fuse, dmg: s.dmg, onHit: s.onHit, by: e.type, look: s.look });
    }
    done();
  } else if (p.id === 'cloud') { // a slow poison cloud that follows the player
    const s = b.cloud;
    run.hazards.push({ kind: 'zone', x: e.x, y: e.y, r: s.r, t: s.life, max: s.life, dmg: s.dmg, tick: s.tick, tk: 0, follow: s.follow, onHit: s.onHit, by: e.type, look: s.look });
    done();
  } else if (p.id === 'pools') { // phase 2 of Ratu Spora / Raja Lava: pools that stay a long while
    const s = b.pools;
    let mine = 0;
    for (const h of run.hazards) if (h.kind === 'zone' && h.pool && h.by === e.type) mine++;
    for (let i = 0; i < s.count && mine < s.max; i++, mine++) {
      const a = rand() * TAU, d = s.near[0] + rand() * (s.near[1] - s.near[0]);
      run.hazards.push({ kind: 'zone', pool: true, x: run.px + Math.cos(a) * d, y: run.py + Math.sin(a) * d, r: s.r, t: s.life, max: s.life, dmg: s.dmg, tick: s.tick, tk: 0, follow: 0, onHit: s.onHit, by: e.type, look: s.look });
    }
    done();
  } else if (p.id === 'curse') { // Raja Mumi: a mark that follows the player, stops, then bursts
    const s = b.curse;
    run.hazards.push({ kind: 'circle', x: run.px, y: run.py, r: s.r, t: s.fuse, max: s.fuse, dmg: s.dmg, chase: s.follow, by: e.type, look: s.look });
    done();
  } else if (p.id === 'sandstorm') { // wind pushes the player while scarabs fly along with it
    const s = b.sandstorm;
    if (p.n === 0) {
      p.dir = rand() * TAU;
      run.hazards.push({ kind: 'push', x: run.px, y: run.py, r: 0, t: s.time, max: s.time, vx: Math.cos(p.dir) * s.push, vy: Math.sin(p.dir) * s.push, dmg: 0, by: e.type });
      p.n = 1;
    }
    if (p.fireT <= 0 && p.t < s.time) {
      const off = (rand() - 0.5) * s.spread * 2, back = 320;
      fire(run, run.px - Math.cos(p.dir) * back - Math.sin(p.dir) * off, run.py - Math.sin(p.dir) * back + Math.cos(p.dir) * off, p.dir, s.shot, e.type);
      p.fireT = s.every * (enraged ? 0.7 : 1);
    }
    if (p.t >= s.time) done();
  } else if (p.id === 'eruption') { // Raja Lava: three lava cracks crawling out from it
    const s = b.eruption;
    if (p.n === 0) { const a0 = Math.atan2(run.py - e.y, run.px - e.x); p.dirs = Array.from({ length: s.lines }, (_, i) => a0 + (i - (s.lines - 1) / 2) * s.spread); p.n = 1; p.k = 0; }
    if (p.fireT <= 0 && p.k < s.steps) {
      p.dirs.forEach((a, i) => {
        const d = e.r + 20 + p.k * s.step, bend = Math.sin(p.k * 0.6 + i * 2) * 0.12 * p.k;
        run.hazards.push({ kind: 'circle', x: e.x + Math.cos(a + bend) * d, y: e.y + Math.sin(a + bend) * d, r: s.r, t: s.fuse, max: s.fuse, dmg: s.dmg, small: true, onHit: s.onHit, by: e.type, look: s.look });
      });
      p.k++; p.fireT = s.gap;
    } else if (p.k >= s.steps && p.fireT <= 0) done();
  } else if (p.id === 'meteor') { // big circles crashing down where the player stands
    const s = b.meteor, n = s.count + (enraged ? 2 : 0);
    if (p.fireT <= 0 && p.n < n) {
      const a = rand() * TAU, d = rand() * s.spread;
      run.hazards.push({ kind: 'circle', x: run.px + Math.cos(a) * d, y: run.py + Math.sin(a) * d, r: s.r, t: s.fuse, max: s.fuse, dmg: s.dmg, by: e.type, look: s.look });
      p.n++; p.fireT = s.gap;
    } else if (p.n >= n && p.fireT <= 0) done();
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
    if (hit && run.hurtPlayer(s.dmg, s.onHit, s.by)) s.life = 0;
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
    if (h.chase && h.max - h.t < h.chase) { h.x = run.px; h.y = run.py; } // a curse mark: follows, then stops
    if (h.kind === 'push') { // a gust (Badai Pasir): shoves the player while it blows
      if (h.t > 0) { run.px += h.vx * dt; run.py += h.vy * dt; h.x = run.px; h.y = run.py; continue; }
      H[i] = H[H.length - 1]; H.pop(); continue;
    }
    if (h.kind === 'zone') { // a lingering cloud / pool (spec §41.2): hurts every `tick` while the player is inside
      if (h.follow) { const dx = run.px - h.x, dy = run.py - h.y, d = Math.hypot(dx, dy) || 1; h.x += (dx / d) * Math.min(d, h.follow * dt); h.y += (dy / d) * Math.min(d, h.follow * dt); }
      if ((h.tk -= dt) <= 0 && (run.px - h.x) ** 2 + (run.py - h.y) ** 2 < h.r * h.r) { h.tk = h.tick; run.hurtPlayer(h.dmg, h.onHit, h.by); if (run.state !== 1) return; }
      if (h.t <= 0) { H[i] = H[H.length - 1]; H.pop(); }
      continue;
    }
    if (h.kind === 'hole' && h.t > 0) { // drags the player in
      const dx = h.x - run.px, dy = h.y - run.py, d = Math.hypot(dx, dy) || 1;
      if (d < h.r * 3) { run.px += (dx / d) * h.pull * dt; run.py += (dy / d) * h.pull * dt; }
    }
    if (h.t > 0) continue;
    if (h.kind === 'line' && h.dmg > 0) {
      const lx = h.x2 - h.x, ly = h.y2 - h.y, k = Math.max(0, Math.min(1, ((run.px - h.x) * lx + (run.py - h.y) * ly) / (lx * lx + ly * ly)));
      if (Math.hypot(h.x + lx * k - run.px, h.y + ly * k - run.py) < h.w / 2 + 8) run.hurtPlayer(h.dmg, h.onHit, h.by);
      run.pulses.push({ x: h.x2, y: h.y2, r: 30, t: 0.25, max: 0.25, color: '199,155,255' });
    }
    if (h.kind === 'hole' && h.dmg > 0) {
      if ((run.px - h.x) ** 2 + (run.py - h.y) ** 2 < (h.r * 0.6) ** 2) run.hurtPlayer(h.dmg, h.onHit, h.by);
      run.pulses.push({ x: h.x, y: h.y, r: h.r, t: 0.4, max: 0.4, color: '150,90,255' });
      run.addShake?.('medium');
    }
    if (h.kind === 'circle' && h.dmg > 0) {
      if ((run.px - h.x) ** 2 + (run.py - h.y) ** 2 < (h.r + 8) ** 2) run.hurtPlayer(h.dmg, h.onHit, h.by);
      run.spawnBurst(h.x, h.y, '#ff7a3c', h.small ? 6 : 18);
      run.pulses.push({ x: h.x, y: h.y, r: h.r, t: 0.3, max: 0.3, color: '255,140,60' });
      if (!h.small) { run.addShake('medium'); sfx.blast(); }
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
