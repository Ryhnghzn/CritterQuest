// Particles for attacks and skills (plan "Efek Lebay" §B, §C). Runs in the
// fixed step but only writes to run.vfx (its own PRNG) and visual flags, so the
// simulation plays out exactly the same with or without it.
//   castFx    — the moment a skill / ultimate fires (tags its hits with `sid`)
//   stepHitFx — every step a hit lives: trails, storms, the closing blast
//   impactFx  — a hit lands on an enemy
//   stepPlayerFx — dash trails and buff auras that shed particles
import { PALETTES, elementOf } from '../data/fx.js';
import { SKILL_FX, BASIC_FX } from '../data/skillfx.js';
import { RARITIES } from '../data/items.js';

const TAU = Math.PI * 2;
const DUST = ['#8a7560', '#6a5a48', '#a08a70'];
const pal = (id) => PALETTES[SKILL_FX[id]?.el || 'steel'];
const weaponColor = (run) => RARITIES[run.weaponRarity || 0].color;
const steps = (v, rate, dt) => Math.floor(rate * v.mul * dt + v.rand()); // how many to emit this step

// random point inside a circle
function inside(v, x, y, r) {
  const a = v.rand() * TAU, d = Math.sqrt(v.rand()) * r;
  return [x + Math.cos(a) * d, y + Math.sin(a) * d];
}

// particle that starts on a ring of radius R and arrives at (x, y) after `life`
function suck(v, x, y, R, color, life = 0.35, kind = 'dot', size = 2) {
  const a = v.rand() * TAU, c = Math.cos(a), s = Math.sin(a);
  v.spawn(kind, x + c * R, y + s * R, (-c * R) / life, (-s * R) / life, life, size, color);
}

// embers drifting up from (x, y)
function rise(v, x, y, n, color, spread = 12, speed = 90) {
  for (let i = 0; i < n * v.mul; i++) {
    v.spawn('ember', x + v.range(-spread, spread), y + v.range(-4, 4), v.range(-20, 20), -v.range(speed * 0.4, speed),
      v.range(0.5, 1), v.range(1.4, 2.8), color, 0.97, -30);
  }
}

export function castFx(run, s, from) {
  const v = run.vfx, H = run.hits;
  for (let k = from; k < H.length; k++) H[k].sid = s.id;
  const x = run.px, y = run.py, a = Math.atan2(run.aimY, run.aimX), ca = Math.cos(a), sa = Math.sin(a);
  const P = pal(s.id), n = SKILL_FX[s.id]?.n ?? 10;
  const at = s.at === 'aim' && H[from] ? H[from] : { x, y };
  if (s.kind === 'dash') { run.dashSid = s.id; run.dashFromX = x; run.dashFromY = y; }
  if (s.kind === 'buff' || s.dmgTaken) run.buffSid = s.id;
  switch (s.id) {
    // warrior
    case 'spin':
      v.ring(x, y, { r1: s.r, life: 0.35, color: P[2], width: 5 });
      v.burst('smoke', x, y + 8, DUST, { n: 6 });
      break;
    case 'shout':
      for (let i = 0; i < 3; i++) v.ring(x, y, { r1: s.blast.r * (0.55 + 0.25 * i), life: 0.45, color: i ? P[2] : P[1], width: 7 - i * 2, delay: i * 0.09 });
      v.crack(x, y + 10, { rays: 9, len: 60, color: P[2] });
      v.burst('blast', x, y, P, { n });
      v.flash(P[1], 0.22, 0.15);
      run.addShake('medium');
      break;
    case 'quake': // the pillars add their own show when they erupt (pillarFx)
      v.ring(x, y + 8, { r1: 38, life: 0.3, color: '#d8b48a', width: 6 });
      v.burst('smoke', x + ca * 14, y + sa * 14 + 8, DUST, { n: 8, angle: a, spread: 0.6, speed: 1.6 });
      v.burst('shards', x + ca * 14, y + sa * 14 + 8, ['#7a5a3a', '#a07850', '#5a4030'], { n: 6, angle: a, spread: 0.8 });
      run.addShake('light');
      break;
    case 'charge':
      v.burst('smoke', x, y + 8, DUST, { n: 6 });
      v.burst('hit', x, y, P, { n: 8, angle: a + Math.PI, spread: 1.2 });
      break;
    case 'axe':
      v.burst('hit', x, y, PALETTES.steel, { n: 6, angle: a, spread: 0.8 });
      break;
    case 'warcry':
      v.ring(x, y, { r1: 70, life: 0.4, color: P[1], width: 5 });
      v.ring(x, y, { r1: 105, life: 0.45, color: P[2], width: 4, delay: 0.1 });
      rise(v, x, y + 8, n, P, 14, 130);
      v.flash(P[2], 0.18, 0.15);
      run.addShake('medium');
      break;
    case 'bladestorm':
      v.flash('#ffb08a', 0.35, 0.2);
      v.ring(x, y, { r1: s.r, life: 0.5, color: P[2], width: 7 });
      v.crack(x, y + 10, { rays: 10, len: 90, color: P[2] });
      break;
    // archer
    case 'rain':
    case 'starfall':
      v.ring(at.x, at.y, { r0: s.r * 0.3, r1: s.r, life: 0.4, color: P[2], width: 3 });
      v.burst('stars', at.x, at.y, P, { n: s.id === 'starfall' ? 14 : 6 });
      break;
    case 'pierce': {
      const hx = x + ca * 12, hy = y + sa * 12;
      for (let i = 0; i < n * v.mul; i++) suck(v, hx, hy, v.range(18, 34), P, 0.18);
      v.burst('hit', hx, hy, P, { n: 10, angle: a, spread: 0.5, speed: 1.5 });
      v.ring(hx, hy, { r1: 26, life: 0.25, color: P[1], width: 3 });
      run.addShake('light');
      break;
    }
    case 'volley':
      v.burst('hit', x + ca * 10, y + sa * 10, P, { n, angle: a, spread: 0.9, speed: 1.2 });
      v.burst('stars', x + ca * 10, y + sa * 10, P, { n: 4 });
      break;
    case 'leap': {
      const wind = ['#e8fff4', '#8ff5c8', '#3fd496'];
      for (let i = 0; i < 14 * v.mul; i++) { // swirl: tangential speed around the take-off point
        const q = v.rand() * TAU, R = v.range(6, 22);
        v.spawn('dot', x + Math.cos(q) * R, y + Math.sin(q) * R, -Math.sin(q) * 150, Math.cos(q) * 150, v.range(0.3, 0.5), v.range(1.5, 2.5), wind, 0.9);
      }
      v.burst('shards', x, y, wind, { n: 6, speed: 0.5 });
      break;
    }
    case 'trap':
      v.burst('shards', at.x, at.y, PALETTES.steel, { n, speed: 0.8 });
      v.ring(at.x, at.y, { r1: s.r, life: 0.35, color: '#9fb3c8', width: 3 });
      break;
    case 'hawk':
      v.burst('shards', x, y - 20, P, { n: 10, speed: 0.6 });
      v.ring(x, y - 20, { r1: 40, life: 0.4, color: P[2], width: 3 });
      v.burst('stars', x, y - 20, P, { n: 6 });
      break;
    // mage
    case 'nova':
      v.flash('#ffffff', 0.35, 0.12);
      v.ring(x, y, { r1: s.r, life: 0.4, color: P[2], width: 7 });
      v.ring(x, y, { r1: s.r * 0.7, life: 0.35, color: P[1], width: 4, delay: 0.08 });
      v.burst('shards', x, y, P, { n, speed: 1.4 });
      v.burst('stars', x, y, P, { n: 12, speed: 1.2 });
      v.burst('smoke', x, y, '#bfe8ff', { n: 8, speed: 2 });
      run.addShake('medium');
      break;
    case 'chain': // a dark storm cloud gathers over the player; every strike adds its own show (strikeFx)
      v.flash(P[2], 0.18, 0.1);
      v.burst('smoke', x, y - 56, ['#262638', '#3a3a52', '#1c1c2a'], { n: 18, speed: 1.2 });
      v.burst('stars', x, y - 56, P, { n: 5, speed: 0.6 });
      v.ring(x, y + 8, { r1: 50, life: 0.35, color: P[1], width: 3 });
      break;
    case 'meteor':
      v.flash('#ffb04a', 0.3, 0.15);
      v.ring(at.x, at.y, { r1: s.r * 1.2, life: 0.5, color: P[2], width: 8 });
      v.ring(at.x, at.y, { r1: s.r * 0.8, life: 0.4, color: P[1], width: 4, delay: 0.06 });
      v.crack(at.x, at.y, { rays: 12, len: s.r, color: P[2], life: 2 });
      v.burst('blast', at.x, at.y, P, { n, speed: 1.6 });
      v.burst('shards', at.x, at.y, ['#5a3020', '#ff9a3c', '#c2321f'], { n: 12, speed: 1.3 });
      v.burst('smoke', at.x, at.y, '#4a3838', { n: 12, speed: 2.5 });
      run.addShake('heavy');
      break;
    case 'blink':
      v.burst('shards', x, y, P, { n, speed: 1 });
      v.burst('stars', x, y, P, { n: 6 });
      break;
    case 'inferno':
      v.burst('blast', x + ca * 10, y + sa * 10, P, { n: 8, angle: a, spread: 0.8 });
      v.ring(x + ca * 14, y + sa * 14, { r1: 30, life: 0.3, color: P[2], width: 5 });
      break;
    case 'manashield':
      v.ring(x, y, { r1: 34, life: 0.4, color: P[2], width: 4 });
      v.burst('stars', x, y - 6, P, { n: 10 });
      break;
    case 'meteorstorm':
      v.flash('#ff6a3a', 0.3, 0.3);
      v.ring(at.x, at.y, { r1: s.r, life: 0.6, color: P[2], width: 6 });
      break;
    // assassin
    case 'shadow':
      v.burst('smoke', x, y, '#5a3a7a', { n: 10, speed: 1.5 });
      break;
    case 'fan': // the ring of daggers appears with a shimmer; they pulse until they launch
      v.ring(x, y, { r1: s.ring + 16, r0: 4, life: 0.35, color: P[2], width: 3 });
      v.burst('stars', x, y, P, { n: 6, speed: 0.6 });
      break;
    case 'poison':
      v.burst('smoke', at.x, at.y, '#5a9a3a', { n: 12, speed: 2 });
      v.burst('kill', at.x, at.y, P, { n: 10 });
      break;
    case 'smoke':
      v.burst('smoke', x, y, '#7a7088', { n: 24, speed: 3 });
      v.burst('smoke', x, y, '#4a4256', { n: 12, speed: 1.5 });
      v.ring(x, y, { r1: s.blast.r, life: 0.4, color: '#b8a8c8', width: 6 });
      v.burst('stars', x, y, ['#ffe27a', '#ffffff'], { n: 6 });
      break;
    case 'shuriken':
      v.ring(x, y, { r1: s.radius + 14, life: 0.3, color: PALETTES.steel[2], width: 3 });
      v.burst('hit', x, y, PALETTES.steel, { n: 8, speed: 0.8 });
      break;
    case 'assassinate':
      v.ring(x, y, { r1: 60, life: 0.4, color: P[2], width: 5 });
      rise(v, x, y + 8, n, ['#ff5a6e', '#5c0a18', '#c21f3a'], 14, 110);
      break;
    case 'thousandshadows':
      v.flash('#8a4cff', 0.3, 0.2);
      v.ring(x, y, { r1: s.r, life: 0.5, color: P[2], width: 6 });
      v.burst('smoke', x, y, '#3a1a5a', { n: 14, speed: 2.5 });
      break;
  }
}

// What a hit that is still waiting (h.delay > 0) shows: dust under a pillar about to erupt,
// breath drawn in before the dragon arrow flies.
function waitFx(run, h, dt) {
  const v = run.vfx, id = h.sid;
  if (id === 'quake') {
    for (let i = steps(v, SKILL_FX.quake.dust, dt); i > 0; i--) {
      v.spawn('dot', h.x + v.range(-h.r, h.r), h.y + v.range(-4, 6), v.range(-15, 15), -v.range(15, 45), v.range(0.25, 0.45), v.range(1.4, 2.6), DUST, 0.93);
    }
  } else if (id === 'pierce' && h.kind === 'proj') {
    const P = pal(id);
    for (let i = steps(v, SKILL_FX.pierce.charge, dt); i > 0; i--) suck(v, h.x, h.y, v.range(20, 40), P, 0.2);
  } else if (id === 'chain') { // sparks gather over the next victim
    const P = pal(id);
    for (let i = steps(v, SKILL_FX.chain.charge, dt); i > 0; i--) suck(v, h.x, h.y - 10, v.range(14, 30), P, 0.2, 'spark', 1.4);
  } else if (id === 'fan' && h.kind === 'proj') { // a dagger floating in the ring: wisps spin off it
    const P = pal(id);
    for (let i = steps(v, SKILL_FX.fan.charge, dt); i > 0; i--) suck(v, h.x, h.y, v.range(10, 22), P, 0.18);
  }
}

// One lightning strike lands on its victim: a bolt from the cloud above, a flash of light, a spark burst.
function strikeFx(run, h) {
  const v = run.vfx, P = pal('chain');
  v.bolt(h.x + v.range(-30, 30), h.y - 190, h.x, h.y, '#fff6b0', 0.28);
  v.bolt(h.x + v.range(-10, 10), h.y - 120, h.x + v.range(-8, 8), h.y - 4, P[2], 0.22);
  v.ring(h.x, h.y + 8, { r1: h.r * 1.6, life: 0.3, color: P[2], width: 4 });
  v.burst('hit', h.x, h.y, P, { n: 10 });
  v.burst('stars', h.x, h.y - 6, P, { n: 3 });
  v.flash('#dff0ff', 0.1, 0.06); // thin flash: eight strikes in a row must not blind the screen
  run.addShake('light');
}

// A pillar of the fissure bursts out of the ground; the crack leaps on to the next one.
function pillarFx(run, h) {
  const v = run.vfx, P = pal('quake');
  v.crack(h.x, h.y + 6, { rays: 7, len: h.r * 1.3, color: '#ff9a3c', life: 1.4 });
  v.ring(h.x, h.y + 6, { r1: h.r * 1.5, life: 0.35, color: '#d8b48a', width: 5 });
  v.burst('shards', h.x, h.y, ['#7a5a3a', '#a07850', '#5a4030'], { n: 8, speed: 1.3 });
  v.burst('blast', h.x, h.y, P, { n: 8 });
  v.burst('smoke', h.x, h.y + 6, DUST, { n: 5, speed: 1.5 });
  if (h.reach) v.beam(h.x, h.y + 6, h.x + Math.cos(h.angle) * h.reach, h.y + 6 + Math.sin(h.angle) * h.reach, '#ff9a3c', 0.3, 3);
  run.addShake('light');
}

// The boomerang reaches the end of its flight and comes about.
function turnFx(run, h) {
  const v = run.vfx;
  v.ring(h.x, h.y, { r1: h.r * 2.2, life: 0.3, color: PALETTES.steel[2], width: 4 });
  v.burst('hit', h.x, h.y, PALETTES.steel, { n: 10, angle: h.angle, spread: 1.6 });
  v.burst('stars', h.x, h.y, PALETTES.steel, { n: 4 });
}

// A split arrow bursts: a little firework where the volley breaks apart.
function splitFx(run, h) {
  const v = run.vfx, P = pal('volley');
  v.burst('stars', h.x, h.y, P, { n: 3, speed: 0.8 });
  v.burst('hit', h.x, h.y, P, { n: 3, angle: h.angle, spread: 0.7 });
}

// a star / meteor that falls from the sky and bursts where it lands (visual only;
// the area's damage ticks on its own schedule)
function fall(h, x, y, t, big) {
  (h.falls || (h.falls = [])).push({ x, y, t, max: t, big });
}

function landFall(run, h, f) {
  const v = run.vfx;
  if (h.sid === 'meteorstorm') {
    const P = PALETTES.fire, r = f.big ? 46 : 28;
    v.ring(f.x, f.y, { r1: r * 1.5, life: 0.4, color: P[2], width: f.big ? 6 : 4 });
    v.crack(f.x, f.y, { rays: f.big ? 9 : 6, len: r, color: P[2], life: 1.8 });
    v.burst('blast', f.x, f.y, P, { n: f.big ? 16 : 8 });
    v.burst('shards', f.x, f.y, ['#5a3020', '#ff9a3c'], { n: f.big ? 8 : 4 });
    v.burst('smoke', f.x, f.y, '#4a3838', { n: f.big ? 6 : 3 });
    if (f.big) run.addShake('medium');
  } else { // starfall
    const P = PALETTES.holy;
    v.ring(f.x, f.y, { r1: f.big ? 36 : 24, life: 0.35, color: P[2], width: 3 });
    v.crack(f.x, f.y, { rays: 5, len: f.big ? 26 : 16, color: P[1], life: 1.2 });
    v.burst('stars', f.x, f.y, P, { n: f.big ? 7 : 4 });
  }
}

// Called before stepHits, so the hit still has the life it had last step.
export function stepHitFx(run, h, dt) {
  if (h.delay > 0) { waitFx(run, h, dt); return; } // not born yet: only the build-up shows
  const v = run.vfx, id = h.sid, first = h.fxAge === undefined;
  h.fxAge = (h.fxAge || 0) + dt;
  const ticked = first ? 0 : (h.fxTicks ?? 0) - (h.ticksLeft ?? 0); // area ticks since last step
  h.fxTicks = h.ticksLeft;
  const last = h.kind !== 'proj' && h.life <= dt;

  if (h.kind === 'proj') {
    if (first && h.part === 'split') splitFx(run, h);
    if (h.returning && !h.fxTurned) { h.fxTurned = true; turnFx(run, h); }
    projTrail(run, h, dt);
    return;
  }

  if (first) {
    if (h.fx === 'boom') explosion(run, h);
    else if (id === 'quake') pillarFx(run, h);
    else if (id === 'chain') strikeFx(run, h);
    else if (h.fx === 'nova' && id === 'leap') { // ice blast left at the take-off point
      const P = PALETTES.ice;
      v.ring(h.x, h.y, { r1: h.r, life: 0.4, color: P[2], width: 6 });
      v.burst('shards', h.x, h.y, P, { n: 14, speed: 1.2 });
      v.burst('stars', h.x, h.y, P, { n: 8 });
    } else if (h.fx === 'slash' && !id) v.burst('smoke', run.px, run.py + 10, DUST, { n: BASIC_FX.slash.dust, speed: 0.6 });
  }

  const S = SKILL_FX[id], P = pal(id);
  switch (id) {
    case 'spin':
    case 'bladestorm': {
      const big = id === 'bladestorm';
      for (let i = steps(v, S.rate, dt); i > 0; i--) {
        if (v.rand() < 0.5) suck(v, h.x, h.y + 6, h.r * v.range(0.7, 1.1), DUST, 0.4, 'dot', v.range(1.5, 3));
        else {
          const q = v.rand() * TAU, R = h.r * 0.8, sp = v.range(120, 260);
          v.spawn('spark', h.x + Math.cos(q) * R, h.y + Math.sin(q) * R, Math.cos(q) * sp, Math.sin(q) * sp, v.range(0.15, 0.3), v.range(1.2, 2.2), P, 0.88);
        }
        if (big) { // fire tornado: embers spiralling up
          const q = v.rand() * TAU, R = v.range(10, h.r * 0.7);
          v.spawn('ember', h.x + Math.cos(q) * R, h.y + Math.sin(q) * R * 0.5, -Math.sin(q) * 140, Math.cos(q) * 70 - 60, v.range(0.4, 0.8), v.range(1.6, 3), P, 0.95, -40);
        }
      }
      if (last) {
        v.ring(h.x, h.y, { r1: h.r * (big ? 1.5 : 1.3), life: 0.45, color: P[2], width: big ? 8 : 6 });
        v.burst('blast', h.x, h.y, P, { n: big ? 30 : 14, speed: big ? 1.8 : 1.2 });
        if (big) {
          v.flash('#ffd0a0', 0.35, 0.2); v.crack(h.x, h.y + 10, { rays: 12, len: h.r, color: P[2] });
          run.addShake('heavy'); run.addHitStop('ult');
        }
      }
      break;
    }
    case 'rain':
      for (let i = steps(v, S.rate, dt); i > 0; i--) { const [px, py] = inside(v, h.x, h.y, h.r); v.burst('stars', px, py, P, { n: 2, speed: 0.5 }); }
      for (let i = 0; i < ticked * 2; i++) { const [px, py] = inside(v, h.x, h.y, h.r * 0.9); v.burst('hit', px, py, P, { n: 4, angle: -Math.PI / 2, spread: 2 }); }
      break;
    case 'trap':
      for (let i = 0; i < ticked * 3; i++) {
        const [px, py] = inside(v, h.x, h.y, h.r * 0.9);
        v.burst('shards', px, py, PALETTES.steel, { n: 3, angle: -Math.PI / 2, spread: 0.8 });
      }
      for (let i = steps(v, S.rate, dt); i > 0; i--) { const [px, py] = inside(v, h.x, h.y, h.r); v.spawn('star', px, py, 0, 0, 0.3, 2.5, '#e6eef8'); }
      break;
    case 'poison':
      for (let i = steps(v, S.rate, dt); i > 0; i--) {
        const [px, py] = inside(v, h.x, h.y, h.r * 0.9);
        if (v.rand() < 0.3) v.spawn('smoke', px, py, v.range(-10, 10), v.range(-14, -4), v.range(0.8, 1.3), v.range(8, 14), '#4a8a2a', 0.97);
        else v.spawn('dot', px, py, 0, v.range(-30, -10), v.range(0.5, 0.9), v.range(1.2, 2.4), P, 0.97, -10);
      }
      break;
    case 'starfall':
    case 'meteorstorm': {
      const storm = id === 'meteorstorm';
      for (let i = 0; i < ticked * (storm ? 2 : 3); i++) { const [px, py] = inside(v, h.x, h.y, h.r * 0.85); fall(h, px, py, storm ? 0.32 : 0.22, i === 0); }
      for (let i = steps(v, S.rate, dt); i > 0; i--) { const [px, py] = inside(v, h.x, h.y, h.r); fall(h, px, py, storm ? 0.28 : 0.2, false); }
      if (storm && v.rand() < dt * 6) run.addShake('light');
      break;
    }
    case 'pierce': // the dragon's burning trail: embers licking up off the patch
      for (let i = steps(v, S.patch, dt); i > 0; i--) {
        const [px, py] = inside(v, h.x, h.y, h.r * 0.8);
        v.spawn('ember', px, py, v.range(-12, 12), -v.range(30, 80), v.range(0.4, 0.8), v.range(1.4, 2.6), PALETTES.fire, 0.96, -30);
      }
      break;
    case 'inferno': // the scorched path of the little sun (the blast itself is handled in explosion)
      if (h.part !== 'trail') break;
      for (let i = steps(v, S.patch, dt); i > 0; i--) {
        const [px, py] = inside(v, h.x, h.y, h.r * 0.8);
        v.spawn('ember', px, py, v.range(-12, 12), -v.range(30, 90), v.range(0.4, 0.9), v.range(1.6, 3), PALETTES.fire, 0.96, -30);
      }
      break;
    case 'shuriken': // sparks flung off the orbiting blade
      for (let i = steps(v, S.rate, dt); i > 0; i--) {
        const q = h.angle + Math.PI / 2, c = Math.cos(q), s2 = Math.sin(q);
        v.spawn('spark', h.x + v.range(-6, 6), h.y + v.range(-6, 6), c * v.range(40, 120), s2 * v.range(40, 120), 0.22, 1.5, PALETTES.steel, 0.88);
      }
      break;
    case 'thousandshadows':
      for (let i = steps(v, S.rate, dt); i > 0; i--) { const [px, py] = inside(v, h.x, h.y, h.r); v.cut(px, py, v.rand() * TAU, v.range(16, 38), P[v.rand() < 0.5 ? 1 : 2], 0.25); }
      if (last) {
        for (let i = 0; i < 14 * v.mul; i++) { const [px, py] = inside(v, h.x, h.y, h.r); v.cut(px, py, v.rand() * TAU, v.range(30, 60), P[1], 0.35); }
        v.flash('#c9a8ff', 0.3, 0.18); v.ring(h.x, h.y, { r1: h.r * 1.3, life: 0.45, color: P[2], width: 7 });
        run.addShake('heavy'); run.addHitStop('ult');
      }
      break;
  }

  if (h.falls) {
    for (let i = h.falls.length - 1; i >= 0; i--) {
      const f = h.falls[i];
      if ((f.t -= dt) > 0) continue;
      landFall(run, h, f);
      h.falls.splice(i, 1);
    }
  }
}

// projectile exploding (fireball / Bola Api Raksasa)
function explosion(run, h) {
  const v = run.vfx, P = PALETTES.fire;
  if (h.sid === 'inferno') {
    v.flash('#ffb04a', 0.3, 0.15);
    v.ring(h.x, h.y, { r1: h.r * 1.3, life: 0.45, color: P[2], width: 8 });
    v.ring(h.x, h.y, { r1: h.r * 0.8, life: 0.35, color: P[1], width: 4, delay: 0.07 });
    v.burst('blast', h.x, h.y, P, { n: 26, speed: 1.6 });
    v.burst('shards', h.x, h.y, P, { n: 10, speed: 1.2 }); // bouncing embers
    v.burst('smoke', h.x, h.y, '#4a3838', { n: 10, speed: 2 });
    v.crack(h.x, h.y, { rays: 8, len: h.r * 0.8, color: P[2] });
    run.addShake('medium');
  } else {
    const b = BASIC_FX.fireball;
    v.ring(h.x, h.y, { r1: h.r * 1.2, life: 0.3, color: P[2], width: 4 });
    v.burst('blast', h.x, h.y, P, { n: b.embers });
    v.burst('smoke', h.x, h.y, '#4a3838', { n: b.smoke });
  }
}

function projTrail(run, h, dt) {
  const v = run.vfx, id = h.sid;
  const bx = -Math.cos(h.angle), by = -Math.sin(h.angle); // backwards
  if (!id) {
    if (h.fx === 'arrow') {
      for (let i = steps(v, BASIC_FX.arrow.trail, dt); i > 0; i--) v.spawn('dot', h.x + bx * 6, h.y + by * 6, bx * 20, by * 20, 0.22, 1.4, weaponColor(run), 0.9);
    } else if (h.fx === 'fireball') {
      for (let i = steps(v, BASIC_FX.fireball.trail, dt); i > 0; i--) {
        v.spawn('ember', h.x + v.range(-3, 3), h.y + v.range(-3, 3), bx * 40 + v.range(-25, 25), by * 40 + v.range(-25, 25), v.range(0.25, 0.45), v.range(1.4, 2.6), PALETTES.fire, 0.9, -40);
      }
    }
    return;
  }
  const S = SKILL_FX[id], P = pal(id);
  if (!S?.rate) return;
  if (h.part === 'shard') { // a fire shard of the little sun: a thin ember tail only
    for (let i = steps(v, S.shardRate, dt); i > 0; i--) v.spawn('ember', h.x + v.range(-2, 2), h.y + v.range(-2, 2), bx * 30 + v.range(-20, 20), by * 30 + v.range(-20, 20), v.range(0.2, 0.4), v.range(1.4, 2.2), PALETTES.fire, 0.9, -30);
    return;
  }
  for (let i = steps(v, S.rate, dt); i > 0; i--) {
    switch (id) {
      case 'pierce':
        v.spawn('spark', h.x + v.range(-4, 4), h.y + v.range(-4, 4), bx * 60 + v.range(-30, 30), by * 60 + v.range(-30, 30), 0.25, 1.6, P, 0.88);
        break;
      case 'axe': { // sparks thrown off the spinning edge
        const q = h.fxAge * 22 + v.rand(), c = Math.cos(q), s = Math.sin(q);
        v.spawn('spark', h.x + c * 14, h.y + s * 14, c * 160, s * 160, 0.2, 1.4, P, 0.85);
        break;
      }
      case 'inferno':
        if (v.rand() < 0.35) suck(v, h.x, h.y, v.range(28, 46), PALETTES.fire, 0.25, 'ember', 2);
        else v.spawn('ember', h.x + v.range(-6, 6), h.y + v.range(-6, 6), bx * 50 + v.range(-30, 30), by * 50 + v.range(-30, 30), v.range(0.3, 0.6), v.range(2, 3.4), PALETTES.fire, 0.92, -50);
        if (v.rand() < 0.15) v.spawn('smoke', h.x + bx * 10, h.y + by * 10, bx * 20, by * 20 - 10, 0.7, 7, '#4a3838', 0.95);
        break;
      default: // volley, fan, shuriken: a ribbon of dots
        v.spawn('dot', h.x + bx * 4, h.y + by * 4, bx * 20, by * 20, 0.25, 1.5, P, 0.9);
    }
  }
  if (id === 'pierce' || h.part === 'throw') v.beam(h.x + bx * h.speed * dt, h.y + by * h.speed * dt, h.x, h.y, P[2], 0.35, 2.5); // fading line left behind
}

// A hit lands on an enemy (replaces the plain spark burst).
export function impactFx(run, h, e, crit) {
  const v = run.vfx, id = h.sid, boost = crit ? 1.6 : 1;
  if (!id) {
    switch (h.fx) {
      case 'slash':
        v.burst('hit', e.x, e.y, ['#ffffff', weaponColor(run), PALETTES.steel[2]], { n: BASIC_FX.slash.sparks * boost });
        return;
      case 'arrow':
        v.burst('stars', e.x, e.y, ['#ffffff', weaponColor(run)], { n: BASIC_FX.arrow.stars * boost });
        v.spawn('shard', e.x, e.y, v.range(-40, 40), -60, 0.8, 2.5, '#e8e0d0', 0.95, 160); // a feather drops
        return;
      case 'stab': {
        const c = PALETTES.shadow[1];
        v.cut(e.x, e.y, h.angle + 0.8, 13 * boost, c); v.cut(e.x, e.y, h.angle - 0.8, 13 * boost, c);
        for (let i = 0; i < BASIC_FX.stab.drops * v.mul; i++) v.spawn('dot', e.x + v.range(-4, 4), e.y, v.range(-20, 20), v.range(-30, 0), 0.5, 1.6, PALETTES.shadow, 0.95, 260);
        return;
      }
      case 'chain':
        v.burst('hit', e.x, e.y, PALETTES.lightning, { n: 8 });
        v.bolt(e.x - 10, e.y - 12, e.x + 8, e.y + 10, PALETTES.lightning[2], 0.25);
        return;
      default:
        v.burst('hit', e.x, e.y, PALETTES[elementOf(h.fx)], { n: crit ? 10 : undefined });
        return;
    }
  }
  const P = pal(id);
  switch (id) {
    case 'charge':
    case 'shadow':
      v.cut(e.x, e.y, 0.8, 18, P[1], 0.3); v.cut(e.x, e.y, -0.8, 18, P[1], 0.3);
      v.burst('hit', e.x, e.y, P, { n: 10 });
      break;
    case 'thousandshadows':
      v.cut(e.x, e.y, v.rand() * TAU, 22, P[1], 0.25);
      break;
    case 'poison':
      v.spawn('dot', e.x + v.range(-6, 6), e.y - e.r * 0.5, 0, 20, 0.6, 2, P, 0.97, 200);
      break;
    case 'smoke':
      e.dizzyFx = 1.4; // stars circling its head (render/skillfx.js)
      break;
    case 'nova':
    case 'leap':
      e.iceFx = 1; // wrapped in crystal while frozen
      v.burst('shards', e.x, e.y, PALETTES.ice, { n: 3 });
      break;
    case 'spin':
    case 'bladestorm': {
      const q = Math.atan2(e.y - h.y, e.x - h.x);
      v.burst('hit', e.x, e.y, P, { n: 6 * boost, angle: q, spread: 1.4 });
      break;
    }
    case 'trap':
      e.vineFx = 1.2; // vines wrap it (render)
      v.burst('hit', e.x, e.y, PALETTES.steel, { n: 4 });
      break;
    default:
      v.burst('hit', e.x, e.y, P, { n: (crit ? 10 : 6) });
  }
}

// Dash trails & buff auras that shed particles; runs every step.
export function stepPlayerFx(run, dt) {
  const v = run.vfx, x = run.px, y = run.py;
  if (run.dashSid) {
    const id = run.dashSid, P = pal(id), S = SKILL_FX[id];
    if (run.dodgeT > 0) {
      const mv = Math.atan2(run.dodgeY, run.dodgeX);
      for (let i = steps(v, S.rate, dt); i > 0; i--) {
        switch (id) {
          case 'charge':
            v.spawn('ember', x + v.range(-6, 6), y + 8 + v.range(-3, 3), v.range(-20, 20), v.range(-40, -10), v.range(0.3, 0.6), v.range(1.6, 3), P, 0.94, -30);
            if (v.rand() < 0.4) v.cut(x - run.dodgeX * 14 + v.range(-8, 8), y + v.range(-10, 6), mv, 12, P[1], 0.15);
            break;
          case 'shadow':
            v.spawn('smoke', x + v.range(-5, 5), y + v.range(-8, 6), 0, -6, v.range(0.4, 0.7), v.range(5, 9), '#5a3a7a', 0.95);
            if (v.rand() < 0.4) v.cut(x - run.dodgeX * 14, y + v.range(-10, 6), mv, 14, '#1c0d2e', 0.18);
            break;
          case 'leap':
            v.spawn('dot', x + v.range(-6, 6), y + v.range(-6, 6), -run.dodgeX * 40, -run.dodgeY * 40, 0.35, 1.8, ['#e8fff4', '#8ff5c8'], 0.9);
            if (v.rand() < 0.2) v.spawn('shard', x, y, v.range(-30, 30), -30, 0.6, 2.4, '#e8fff4', 0.95, 60);
            break;
          default: // blink
            v.spawn('star', x + v.range(-6, 6), y + v.range(-10, 6), 0, 0, 0.3, 2.5, P);
        }
      }
    } else {
      if (id === 'blink') {
        v.beam(run.dashFromX, run.dashFromY, x, y, P[2], 0.45, 3);
        v.ring(x, y, { r1: 42, life: 0.4, color: P[2], width: 4 });
        v.ring(x, y, { r1: 26, life: 0.3, color: P[1], width: 2, delay: 0.06 });
        v.burst('stars', x, y, P, { n: 8 });
      } else if (id === 'charge') v.burst('smoke', x, y + 8, DUST, { n: 5 });
      else if (id === 'shadow') v.burst('smoke', x, y, '#5a3a7a', { n: 6 });
      run.dashSid = null;
    }
  }
  if (run.buffSid && run.buffT > 0) {
    const id = run.buffSid, P = pal(id), S = SKILL_FX[id];
    if (!S?.rate) return;
    for (let i = steps(v, S.rate, dt); i > 0; i--) {
      switch (id) {
        case 'warcry': // steam off the shoulders, embers from the feet
          if (v.rand() < 0.5) v.spawn('smoke', x + (v.rand() < 0.5 ? -8 : 8), y - 14, v.range(-6, 6), -30, 0.7, 5, '#a04040', 0.96, -10);
          else v.spawn('ember', x + v.range(-10, 10), y + 8, 0, -v.range(40, 90), 0.6, 2, P, 0.97, -20);
          break;
        case 'hawk': // golden feathers floating down
          v.spawn('shard', x + v.range(-20, 20), y - 30, v.range(-10, 10), 15, 1, 2.4, P, 0.98);
          break;
        case 'assassinate':
          v.spawn('ember', x + v.range(-10, 10), y + 6, 0, -v.range(30, 70), 0.7, 2, ['#ff5a6e', '#5c0a18'], 0.97, -20);
          break;
        case 'manashield':
          v.spawn('star', x + v.range(-22, 22), y + v.range(-26, 10), 0, -10, 0.5, 2.4, P);
          break;
      }
    }
  }
}
