// Enemy behaviour (spec §18.1): keep-distance casters, chargers, bombers,
// shields, Raja Maw's attack patterns; enemy projectiles (run.shots) and
// telegraphed danger zones (run.hazards). Pure logic on the run state.
import { rand, rrange } from '../core/rng.js';
import { ENEMIES, SHIELD_PIERCING } from '../data/enemies.js';
import { sfx } from '../core/audio.js';
import { t } from '../i18n.js';
import { DEATH_FX, BOSS_TELL, BOSS_TIRED } from '../data/fx.js';
import { leap, ambush, trail, mirror, stepPuddle, pack, mortar, totem, twin } from './foes.js';

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
    case 'leap': return leap(run, e, b); // spec §41.1 (run/foes.js)
    case 'ambush': return ambush(run, e, b, dt);
    case 'trail': return trail(run, e, b);
    case 'mirror': return mirror(run, e, b, dt);
    case 'pack': return pack(run, e, b, dt);
    case 'mortar': return mortar(run, e, b);
    case 'totem': return totem(run, e, b, dt);
    case 'twin': return twin(run, e, b);
    case 'shade': return shade(run, e, dt);
    case 'sarco': return sarco(run, e);
    case 'pod': return pod(run, e, dt);
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
  run.shots.push({ x, y, vx: Math.cos(angle) * s.speed, vy: Math.sin(angle) * s.speed, r: s.r, dmg: s.dmg, life: 5, color: s.color, onHit: s.onHit || null, by, look: s.look || null, unparryable: !!s.unparryable });
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

// A boss enters a new phase (plan "Rasa Pukulan" A): the world holds its breath, a flash
// (not with reduced motion), rings out of the boss, sparks, and a low roar.
function phaseFx(run, e) {
  run.addHitStop?.('phase'); run.addPunch?.('phase');
  sfx.boss();
  const v = run.vfx;
  if (!v) return; // test stand-ins
  const P = DEATH_FX.phase;
  if (!run.calm) v.flash(...P.flash);
  v.ring(e.x, e.y, { r0: e.r, r1: e.r * P.ring, life: 0.55, color: P.color, width: 7 });
  v.ring(e.x, e.y, { r0: e.r, r1: e.r * P.ring * 0.65, life: 0.45, color: '#ffffff', width: 3, delay: 0.1 });
  v.burst('blast', e.x, e.y, ['#ffffff', '#e8d4ff', P.color, '#6a2fb8'], { n: P.sparks, speed: 1.6 });
}

// Raja Maw: one pattern at a time, standing still while it fires.
// Bosses with phases (Sang Gerhana) switch pattern lists as their HP drops.
function boss(run, e, b, dt) {
  const enraged = e.hp < e.maxHp * b.enrageAt;
  if (b.phases) {
    const ph = b.phases.reduce((n, p, i) => (e.hp <= e.maxHp * p.at ? i : n), 0);
    if (ph !== (e.phase || 0)) {
      e.phase = ph; e.pat = null; e.mode = 'walk'; e.actT = 1.2; e.tired = 0; e.vent = null;
      run.dark = !!b.phases[ph].dark;
      run.showBanner?.(b.phases[ph].name);
      run.addShake?.('big');
      run.pulses.push({ x: e.x, y: e.y, r: 260, t: 0.8, max: 0.8, color: '199,155,255' });
      phaseFx(run, e);
      if (b.phases[ph].guards && b.guards) raiseGuards(run, e, b.guards); // Raja Mumi (plan "Bos Berkesan" B)
      if (b.phases[ph].shatter && e.crustMax) { e.crust = 0; e.crustMax = 0; run.vfx?.burst('shards', e.x, e.y, ['#9fe0ff', '#ffffff'], { n: 18, speed: 1.6 }); } // Golem Kristal: the crust is gone for good
      return { vx: 0, vy: 0 };
    }
  }
  if (b.crust) crustStep(run, e, b.crust, dt); // Golem Kristal (plan "Bos Berkesan" D)
  if (e.tired > 0) { tiredStep(run, e, dt); return { vx: 0, vy: 0 }; } // an opening (plan "Bos Berkesan")
  if (e.mode === 'wind' || e.mode === 'dash' || e.mode === 'rest') {
    const v = charge(run, e, b);
    if (e.mode === 'walk') e.actT = enraged ? b.enragedEvery : b.every;
    return v;
  }
  if (e.pat) { stepPattern(run, e, b, dt, enraged); return { vx: 0, vy: 0 }; }
  if (e.actT <= 0) {
    const list = b.phases ? b.phases[e.phase || 0].patterns : b.patterns;
    let id = list[Math.floor(rand() * list.length)];
    if (b.noRepeat) for (let i = 0; i < 6 && id === e.lastPat && list.some((x) => x !== id); i++) id = list[Math.floor(rand() * list.length)];
    e.lastPat = id;
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
    if (id === 'summon' && !b.tell?.summon) { summon(run, e, b.summon); e.actT = enraged ? b.enragedEvery : b.every; return { vx: 0, vy: 0 }; }
    e.pat = { id, t: 0, n: 0, fireT: 0, a0: rand() * TAU, tell: b.tell?.[id] || 0 };
    if (e.pat.tell) { tellStart(run, e, b, id); return { vx: 0, vy: 0 }; } // its own sound instead of the shared roar
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

export function stepPattern(run, e, b0, dt, enraged) {
  const p = e.pat, b = p.cfg || b0;
  if (p.tell > 0) { p.tell -= dt; tellStep(run, e, b, p, dt); return; } // the wind-up: nothing fires yet
  p.t += dt; p.fireT -= dt;
  const own = !p.cfg && b0 === ENEMIES[e.type]; // its own move, not an echo (Sang Gerhana) or a guardian's borrowed one
  const done = () => { e.pat = null; e.actT = enraged ? b0.enragedEvery : b0.every; };
  if (p.id === 'summon') { summon(run, e, b.summon); done(); return; }
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
    const s = b.gulp, bites = own && s.bites ? s.bites[Math.min(e.phase || 0, s.bites.length - 1)] : 1;
    // bite k starts at `at(k)`: the first after the full fuse, each next one aimed anew and quicker (plan "Bos Berkesan")
    const fuse = (k) => (k === 0 ? s.fuse : s.again), at = (k) => (k === 0 ? 0 : s.fuse + (k - 1) * s.again);
    if (p.n < bites && p.t >= at(p.n)) {
      const a = Math.atan2(run.py - e.y, run.px - e.x), last = p.n === bites - 1;
      run.hazards.push({ kind: 'hole', x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, r: s.r, t: fuse(p.n), max: fuse(p.n), dmg: s.dmg, pull: s.pull * (enraged ? 1.3 : 1), by: e.type, look: 'maw', miss: own && last && s.choke ? e : null });
      if (p.n > 0) sfx.boss();
      p.n++;
    }
    if (p.t >= at(bites - 1) + fuse(bites - 1)) done();
  } else if (p.id === 'clones') { // shadows rise around the player, then each fires a ring
    const s = b.clones, n = s.count + (enraged ? 1 : 0), shades = own && s.shade, warn = shades ? s.shade.warn : s.warn;
    if (p.n === 0) {
      p.spots = [];
      for (let i = 0; i < n; i++) {
        const a = p.a0 + (i / n) * TAU, x = run.px + Math.cos(a) * s.dist, y = run.py + Math.sin(a) * s.dist;
        const h = { kind: 'circle', x, y, r: 26, t: warn, max: warn, dmg: 0, look: 'maw' };
        run.hazards.push(h);
        p.spots.push([x, y, shades ? raiseShade(run, e, x, y, s.shade, h) : null]);
      }
      p.n = 1;
    }
    if (p.n === 1 && p.t >= warn) {
      for (const [x, y, sh] of p.spots) {
        if (sh && !(sh.hp > 0 && run.enemies.includes(sh))) continue; // broken in time: no ring
        if (sh) sh.hp = 0; // it fired: it fades (shade() ends it quietly)
        for (let i = 0; i < s.ring.count; i++) fire(run, x, y, p.a0 + (i / s.ring.count) * TAU, s.ring, e.type);
        run.spawnBurst(x, y, '#c26bd8', 12);
      }
      p.n = 2;
    }
    if (p.t >= warn + 0.4) done();
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
      const h = { kind: 'circle', x: run.px + Math.cos(a) * d, y: run.py + Math.sin(a) * d, r: s.r, t: s.fuse, max: s.fuse, dmg: s.dmg, onHit: s.onHit, by: e.type, look: s.look };
      run.hazards.push(h);
      if (own && s.pod) raisePod(run, e, h, s); // plan "Bos Berkesan" E
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
    run.hazards.push({ kind: 'circle', x: run.px, y: run.py, r: s.r, t: s.fuse, max: s.fuse, dmg: s.dmg, chase: s.follow, by: e.type, look: s.look, self: own && s.stun ? e : null });
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
    } else if (p.n >= n && p.fireT <= 0) { done(); if (own && s.vent) vent(run, e, s.vent); }
  } else done();
}

// ---- boss wind-ups, openings and shadows (plan "Bos Berkesan") ----
// The wind-up of a move with a `tell`: its own sound now, motes gathering while it lasts.
function tellStart(run, e, b, id) {
  sfx.tell(id);
  const col = (b[id]?.color) || '#c26bd8';
  if (id === 'ring') run.vfx?.ring(e.x, e.y, { r0: BOSS_TELL.from, r1: e.r, life: e.pat.tell, color: col, width: 3 });
}
function tellStep(run, e, b, p, dt) {
  const v = run.vfx;
  if (!v) return;
  const id = p.id, col = id === 'summon' ? ['#3a2a4a', '#6a4a8a'] : [b[id]?.color || '#c26bd8', '#ffffff'];
  if (id === 'summon') { // dark smoke rising off it
    for (let i = Math.floor(BOSS_TELL.summonSmoke * v.mul * dt + v.rand()); i > 0; i--) v.spawn('smoke', e.x + v.range(-e.r, e.r), e.y + v.range(-6, 6), v.range(-8, 8), -v.range(30, 60), v.range(0.6, 1), v.range(6, 10), col, 0.96, -20);
    return;
  }
  const spin = id === 'spiral' ? Math.sign(b.spiral?.turn || 1) : 0;
  for (let i = Math.floor(BOSS_TELL.motes * v.mul * dt + v.rand()); i > 0; i--) {
    const a = v.rand() * TAU, r = v.range(e.r + 20, BOSS_TELL.from), life = v.range(0.35, 0.5);
    const inV = r / life; // inward to the boss in its life; a spiral's motes also turn its way
    v.spawn(v.rand() < 0.3 ? 'star' : 'dot', e.x + Math.cos(a) * r, e.y + Math.sin(a) * r,
      -Math.cos(a) * inV * 0.8 - Math.sin(a) * inV * spin, -Math.sin(a) * inV * 0.8 + Math.cos(a) * inV * spin, life, v.range(1.6, 2.6), col, 1);
  }
}

// A boss caught out (Raja Maw bites air): it stands, does no touch damage and takes more damage for a while.
export function tire(run, e, c, text) {
  e.pat = null; e.mode = 'walk'; e.tired = c.time; e.vulnT = c.time; e.vulnK = c.taken;
  e.actT = Math.max(e.actT, 0.4);
  run.addFloater?.(e.x, e.y - e.r - 40, text, BOSS_TIRED.text);
  run.vfx?.ring(e.x, e.y, { r0: e.r, r1: e.r * 3, life: 0.4, color: BOSS_TIRED.text, width: 4 });
  run.addHitStop?.('elite');
  sfx.choke();
}
function tiredStep(run, e, dt) {
  e.tired -= dt;
  const v = run.vfx;
  if (e.vent) { // Raja Lava cooling: steam and sparks off its glowing back
    if (v) for (let i = Math.floor(14 * v.mul * dt + v.rand()); i > 0; i--) {
      const a = e.vent.a + v.range(-0.6, 0.6), x = e.x + Math.cos(a) * e.r * 0.8, y = e.y + Math.sin(a) * e.r * 0.5;
      v.spawn(v.rand() < 0.5 ? 'smoke' : 'ember', x, y - e.r, Math.cos(a) * 20, -v.range(40, 80), v.range(0.5, 0.9), v.range(3, 6), ['#ffb36a', '#ff6a2a', '#c8c0b8'], 0.96, -20);
    }
    if (e.tired <= 0) { e.tired = 0; e.vent = null; e.actT = Math.max(e.actT, 0.6); }
    return;
  }
  if (v) for (let i = Math.floor(BOSS_TIRED.stars * v.mul * dt + v.rand()); i > 0; i--) { // stars round its head
    const a = v.rand() * TAU;
    v.spawn('star', e.x + Math.cos(a) * e.r * 0.7, e.y - e.r * 1.6 + Math.sin(a) * e.r * 0.25, -Math.sin(a) * 40, Math.cos(a) * 12, v.range(0.4, 0.6), v.range(2.4, 3.4), BOSS_TIRED.color, 0.97);
  }
  if (e.tired <= 0) { e.tired = 0; e.vulnT = 0; e.actT = Math.max(e.actT, 0.6); }
}

// Kulit Kristal (plan "Bos Berkesan" D): Golem Kristal's crust soaks hits; heavy ones wear it faster.
function crustStep(run, e, c, dt) {
  if (e.crustMax == null) { if ((e.phase || 0) === 0) { e.crustMax = e.maxHp * c.hp; e.crust = e.crustMax; } else e.crustMax = 0; return; }
  if (!e.crustMax || e.crust > 0 || e.tired > 0) return;
  if ((e.crustT -= dt) > 0) return;
  e.crust = e.crustMax;
  run.addFloater?.(e.x, e.y - e.r - 40, t('Kulit kristal tumbuh lagi'), '#9fe0ff');
  run.vfx?.ring(e.x, e.y, { r0: e.r * 2.2, r1: e.r, life: 0.5, color: '#9fe0ff', width: 4 });
}
// A hit on the crust: returns the damage left for HP. heavy: a crit, skill or ultimate.
export function crustHit(run, e, dmg, h, heavy) {
  const c = ENEMIES[e.type].crust, k = h.breakShield ? Infinity : heavy ? c.heavy : 1;
  const into = dmg * k, soak = Math.min(e.crust, into);
  e.crust -= soak;
  if (run.time - (e.crustFxT || -1) > 0.12) { // a few chips, not one burst per hit
    e.crustFxT = run.time;
    run.vfx?.burst('shards', e.x, e.y - e.r * 0.5, ['#9fe0ff', '#ffffff'], { n: heavy ? 5 : 2 });
  }
  if (e.crust <= 0) {
    e.crust = 0; e.crustT = c.regrow;
    tire(run, e, c.stun, t('KULIT KRISTAL PECAH!'));
    run.vfx?.burst('shards', e.x, e.y, ['#9fe0ff', '#ffffff', '#5aa8d8'], { n: 20, speed: 1.6 });
    run.addShake?.('heavy');
  }
  return k === Infinity ? dmg : dmg * (1 - soak / into);
}

// Jamur Spora (plan "Bos Berkesan" E): a mushroom of Ladang Jamur made breakable. Broken in time, its
// burst is cancelled; near the queen its spores turn on her; in phase 2 it soaks up poison pools nearby.
function raisePod(run, e, h, s) {
  const p = run.spawnEnemy('sporepod');
  p.x = h.x; p.y = h.y; p.hp = p.maxHp = e.maxHp * s.pod.hp; p.dmg = 0;
  p.podOf = e; p.mark = h; p.life = s.fuse + 0.1; p.gap = e.gap;
}
function pod(run, e, dt) {
  if ((e.life -= dt) <= 0 || !(e.podOf?.hp > 0) || !run.enemies.includes(e.podOf)) { e.hp = 0; e.faded = true; } // burst on its own, or its queen is gone
  return { vx: 0, vy: 0 };
}
export function podDown(run, e) {
  if (e.faded) return; // the circle under it bursts as before (or its queen fell)
  const q = e.podOf, c = ENEMIES[q.type].shrooms.pod;
  e.mark.t = 0; e.mark.dmg = 0; // no burst
  run.vfx?.burst('smoke', e.x, e.y, ['#b7ff6a', '#6a8a2a'], { n: 8 });
  run.vfx?.ring(e.x, e.y, { r0: 6, r1: 50, life: 0.3, color: '#b7ff6a', width: 3 });
  sfx.shadeBreak();
  if ((q.phase || 0) > 0) { // MEKAR!: it soaks up the poison pools round it
    for (const h of run.hazards) if (h.pool && h.by === q.type && (h.x - e.x) ** 2 + (h.y - e.y) ** 2 < (c.clear + h.r) ** 2) { h.t = 0; h.dmg = 0; run.vfx?.burst('smoke', h.x, h.y, ['#b7ff6a', '#3a5a1a'], { n: 6 }); }
  }
  if (q.hp > 0 && !(q.tired > 0) && (q.x - e.x) ** 2 + (q.y - e.y) ** 2 < (c.near + q.r) ** 2) { // once per opening, not per mushroom
    q.hp -= q.maxHp * c.hurt; q.flash = 0.2;
    run.vfx?.burst('smoke', q.x, q.y, ['#b7ff6a', '#d98aff'], { n: 10 });
    tire(run, q, c.stun, t('SPORA BERBALIK!'));
  }
}

// Raja Lava cools down after its meteors (plan "Bos Berkesan" C): it stands with its back glowing —
// the side away from where the player stood. Hits from behind hurt more (run.js damageEnemy asks ventMul).
function vent(run, e, c) {
  e.pat = null; e.mode = 'walk'; e.tired = c.time;
  e.vent = { a: Math.atan2(e.y - run.py, e.x - run.px), back: c.back, half: (c.arc * Math.PI) / 360 };
  e.actT = Math.max(e.actT, 0.4);
  run.addFloater?.(e.x, e.y - e.r - 40, t('KEPANASAN! Serang punggungnya!'), '#ffb36a');
  sfx.sizzle();
  if ((e.phase || 0) > 0) { // phase 2: its lava pools nearby turn to stone
    let n = 0;
    for (const h of run.hazards) if (h.pool && h.by === e.type && (h.x - e.x) ** 2 + (h.y - e.y) ** 2 < c.cool * c.cool) { h.t = 0; h.dmg = 0; n++; run.vfx?.burst('smoke', h.x, h.y, ['#8a8078', '#5a524c'], { n: 8 }); }
    if (n) run.addFloater?.(e.x, e.y - e.r - 70, t('Lava membatu'), '#c8c0b8');
  }
}
// × damage a cooling Raja Lava takes from where the player stands (1 = not from behind)
export function ventMul(run, e) {
  if (!e.vent) return 1;
  const a = Math.atan2(run.py - e.y, run.px - e.x), d = Math.abs(Math.atan2(Math.sin(a - e.vent.a), Math.cos(a - e.vent.a)));
  return d <= e.vent.half ? e.vent.back : 1;
}

// Bayang Maw: a shadow raised by Bayang Kembar. Its HP is a share of its maker's; it never moves.
function raiseShade(run, e, x, y, c, h) {
  const sh = run.spawnEnemy('mawshade');
  sh.x = x; sh.y = y; sh.hp = sh.maxHp = e.maxHp * c.hp; sh.dmg = 0;
  sh.shadeOf = e; sh.life = c.warn + 0.2; sh.mark = h; sh.gap = e.gap;
  run.vfx?.burst('smoke', x, y, ['#2a1040', '#6a2a8a'], { n: 6 });
  return sh;
}
function shade(run, e, dt) {
  if ((e.life -= dt) <= 0 || !(e.shadeOf?.hp > 0) || !run.enemies.includes(e.shadeOf)) { e.hp = 0; e.faded = true; } // fired, timed out, or its maker is gone
  return { vx: 0, vy: 0 };
}
// A shade at 0 HP (run.js killEnemy asks first): broken by the player, or faded. No loot, no kill counted.
export function shadeDown(run, e) {
  if (e.mark) e.mark.t = 0;
  if (e.faded) { run.vfx?.burst('smoke', e.x, e.y, ['#2a1040', '#6a2a8a'], { n: 5 }); return; }
  run.vfx?.ring(e.x, e.y, { r0: 6, r1: 60, life: 0.35, color: '#c26bd8', width: 4 });
  run.vfx?.burst('shards', e.x, e.y, ['#c26bd8', '#2a1040', '#ffffff'], { n: 10 });
  sfx.shadeBreak();
}

// Penjaga Sarkofagus: raised round Raja Mumi in its phase 2; while one stands the mummy takes less
// damage (run.js damageEnemy asks guardCut). The last one broken brings the shield down and stuns it.
function raiseGuards(run, e, c) {
  e.guards = [];
  const a0 = Math.atan2(run.py - e.y, run.px - e.x) + Math.PI / 2;
  for (let i = 0; i < c.count; i++) {
    const a = a0 + (i / c.count) * TAU, g = run.spawnEnemy('tombguard');
    g.x = e.x + Math.cos(a) * c.dist; g.y = e.y + Math.sin(a) * c.dist;
    g.hp = g.maxHp = e.maxHp * c.hp; g.dmg = 0; g.guardOf = e; g.gap = e.gap;
    e.guards.push(g);
    run.vfx?.burst('smoke', g.x, g.y, ['#c8a060', '#8a6a3a'], { n: 8, speed: 1.4 });
  }
  run.addFloater?.(e.x, e.y - e.r - 60, t('Hancurkan sarkofagusnya!'), '#ffcf5a');
}
function sarco(run, e) {
  if (!(e.guardOf?.hp > 0) || !run.enemies.includes(e.guardOf)) { e.hp = 0; e.faded = true; } // its mummy is gone
  return { vx: 0, vy: 0 };
}
const standing = (g) => g.hp > 0 && !g.faded;
// damage share a guarded boss still takes (1 = all)
export function guardCut(e) {
  return e.guards?.some(standing) ? 1 - ENEMIES[e.type].guards.cut : 1;
}
export function sarcoDown(run, e) {
  run.vfx?.burst('shards', e.x, e.y, ['#ffcf5a', '#8a6a3a', '#ffffff'], { n: 12 });
  run.vfx?.ring(e.x, e.y, { r0: 8, r1: 80, life: 0.4, color: '#ffcf5a', width: 4 });
  if (e.faded) return;
  sfx.shadeBreak();
  const m = e.guardOf;
  if (m?.hp > 0 && m.guards && !m.guards.some((g) => g !== e && standing(g))) {
    m.guards = null;
    tire(run, m, ENEMIES[m.type].guards.stun, t('PERISAI RUNTUH!'));
    run.addShake?.('heavy');
  }
}

// Enemy projectiles: fly, hit the player (unless dodging / invulnerable), leave the room.
// bound: how far from (cx, cy) a shot may fly (the room, or around the player in a region)
export function stepShots(run, dt, bound, cx = 0, cy = 0) {
  const S = run.shots;
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    const hit = (s.x - run.px) ** 2 + (s.y - run.py) ** 2 < (s.r + 9) ** 2;
    if (hit && run.hurtPlayer(s.dmg, s.onHit, s.by, s)) s.life = 0;
    if (s.life <= 0 || (s.x - cx) ** 2 + (s.y - cy) ** 2 > (bound + 40) ** 2) { S[i] = S[S.length - 1]; S.pop(); }
  }
}

// Telegraphed zones: when the timer runs out, circles deal damage to whoever is inside.
export function stepHazards(run, dt) {
  const H = run.hazards;
  for (let i = H.length - 1; i >= 0; i--) {
    const h = H[i];
    h.t -= dt;
    if (h.kind === 'puddle') { // an icy puddle that slows (Roh Embun, run/foes.js)
      if (stepPuddle(run, h)) { H[i] = H[H.length - 1]; H.pop(); }
      continue;
    }
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
      const landed = (run.px - h.x) ** 2 + (run.py - h.y) ** 2 < (h.r * 0.6) ** 2 && run.hurtPlayer(h.dmg, h.onHit, h.by, h);
      if (!landed && h.miss?.hp > 0 && run.state === 1) tire(run, h.miss, ENEMIES[h.miss.type].gulp.choke, t('TERSEDAK!')); // Raja Maw bit air (plan "Bos Berkesan")
      run.pulses.push({ x: h.x, y: h.y, r: h.r, t: 0.4, max: 0.4, color: '150,90,255' });
      run.addShake?.('medium');
    }
    if (h.kind === 'circle' && h.dmg > 0) {
      if ((run.px - h.x) ** 2 + (run.py - h.y) ** 2 < (h.r + 8) ** 2) run.hurtPlayer(h.dmg, h.onHit, h.by);
      const me = h.self; // Raja Mumi's curse bursting on Raja Mumi (plan "Bos Berkesan" B)
      if (me?.hp > 0 && run.state === 1 && (me.x - h.x) ** 2 + (me.y - h.y) ** 2 < (h.r + me.r * 0.5) ** 2) {
        const c = ENEMIES[me.type].curse.stun;
        me.hp -= me.maxHp * c.hurt; me.flash = 0.2;
        tire(run, me, c, t('KUTUKAN BERBALIK!'));
      }
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
