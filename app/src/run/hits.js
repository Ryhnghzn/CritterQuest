// Attack instances (spec §5.2). There are no shared enemy i-frames: each
// instance decides on its own whom it may hit.
//  - area:  circle or cone; hits everything inside once per tick
//           (`ticks` spread evenly over `duration`; 1 tick = instant)
//  - sweep: circle that lives for `duration`; each enemy at most once
//  - proj:  moving circle; each enemy at most once; passes through `pierce`
//           more enemies, or bursts into an area (`explode`) on first contact
// An area may carry `only` (an enemy): then it damages that enemy alone (a lightning strike).
// Any hit may carry `delay` (seconds): until it runs out the hit neither moves, ticks nor
// ages. An area may carry `target` (an enemy): it then rides on that enemy.
// Projectile extras (all optional):
//  - boomerang: at `range` it turns back to the player (hitSet cleared once, so every
//    enemy can be hit again), and dies on reaching him; `pull` drags enemies it strikes
//    on the way home along with it
//  - trail { every, r, life, ticks, mult }: drops a small lingering area behind it
//  - split { at, count, spread, mult }: at distance `at` it bursts into `count` arrows
//  - curve: turning speed (rad/s), so the flight bends into a spiral
//  - hover: ring radius (px); while its `delay` runs it floats on that ring around the player (a dagger waiting in a circle)
//  - explode.shards { count, speed, range, r, mult }: the burst also throws `count` arrows outward
// orbit: a blade circling the player (`radius`, `spin` rad/s); each enemy at most once per `every` s;
//   when `duration` ends it flies off as a `throw` projectile at the aim point (ctx.aimPX / aimPY)
// stepHits() reports contacts through ctx.onHit(hit, enemy); damage is the caller's job.
const DEG = Math.PI / 180;
import { SKILL_PULL, RETURN_CATCH, BOOMERANG_MAX_TRAVEL } from '../data/balance.js';
const TAU = Math.PI * 2;
const FX_MIN = 0.18; // keep instant hits on screen long enough to be seen

export function makeArea({ x, y, r, angle = 0, arc = null, mult, ticks = 1, duration = 0, follow = false, freeze = 0, fx = null, delay = 0 }) {
  const life = Math.max(duration, FX_MIN);
  return {
    kind: 'area', x, y, r, angle, arc: arc === null ? null : arc * DEG, mult, mult0: mult, freeze, fx, follow, delay, target: null, only: null,
    ticksLeft: ticks, tickEvery: ticks > 1 ? duration / ticks : 0, tickT: 0, life, maxLife: life,
  };
}

export function makeSweep({ x, y, r, mult, duration, follow = false, fx = null, delay = 0 }) {
  return { kind: 'sweep', x, y, r, arc: null, mult, mult0: mult, follow, fx, delay, life: duration, maxLife: duration, hitSet: new Set() };
}

export function makeProjectile({ x, y, angle, speed, range, r, mult, pierce = 0, explode = null, fx = null, delay = 0, boomerang = false, pull = 0, trail = null, split = null, curve = 0, hover = 0 }) {
  return {
    kind: 'proj', x, y, r, angle, mult, mult0: mult, pierce, explode, fx, delay,
    boomerang, returning: false, pull: pull === true ? SKILL_PULL : pull || 0, trail, trailT: 0, split, curve, hover,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, speed, dist: 0, range,
    hitSet: new Set(), life: 1, dead: false,
  };
}

export function makeOrbit({ radius, spin, every, duration, r, mult, angle = 0, throw: thrown = null, fx = null }) {
  return {
    kind: 'orbit', x: 0, y: 0, r, angle, radius, spin, every, mult, mult0: mult, fx, delay: 0, throw: thrown,
    age: 0, cx: 0, cy: 0, life: duration, maxLife: duration, lastHit: new Map(), // enemy → age at its last hit (one Map per cast)
  };
}

// Children of a skill hit (blast, trail area, split arrow) count as the skill too: they take
// over its flags so Panas, Kombo (execute / forced crit) and the visuals keep working.
export function inherit(child, parent) {
  if (parent.skill) child.skill = parent.skill;
  if (parent.sid) child.sid = parent.sid;
  if (parent.execute) child.execute = parent.execute;
  if (parent.crit) child.crit = parent.crit;
  if (parent.ult) child.ult = parent.ult;
  return child;
}

// How much the cast multiplied the hit (Panas / Kombo bonus): a child with its own data
// `mult` is scaled by this so it benefits like its parent.
export const castScale = (h) => (h.mult0 ? h.mult / h.mult0 : 1);

// Does the hit's shape touch the enemy circle?
export function inShape(h, e) {
  if (e.hidden) return false; // under the sand
  const dx = e.x - h.x, dy = e.y - h.y;
  const reach = h.r + e.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= reach * reach) return false;
  if (h.arc === null || h.arc === undefined) return true;
  const d = Math.sqrt(d2);
  if (d < 1e-6) return true;
  let diff = Math.abs(Math.atan2(dy, dx) - h.angle) % (2 * Math.PI);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff <= h.arc / 2 + Math.asin(Math.min(1, e.r / d));
}

// ctx: { px, py, onHit(hit, enemy), add(hit) }
export function stepHits(hits, enemies, dt, ctx) {
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (h.delay > 0) { // not born yet
      if (h.hover) { h.x = ctx.px + Math.cos(h.angle) * h.hover; h.y = ctx.py + Math.sin(h.angle) * h.hover; } // rides the ring round the player
      h.delay -= dt;
      if (h.delay > 0) continue;
    }
    if (h.target && h.target.hp > 0) { h.x = h.target.x; h.y = h.target.y; }
    if (h.follow) { h.x = ctx.px; h.y = ctx.py; }
    if (h.kind === 'area') stepArea(h, enemies, dt, ctx);
    else if (h.kind === 'sweep') stepSweep(h, enemies, dt, ctx);
    else if (h.kind === 'orbit') stepOrbit(h, enemies, dt, ctx);
    else stepProjectile(h, enemies, dt, ctx);
    const done = h.kind === 'proj' ? h.dead : h.life <= 0 && (h.kind !== 'area' || h.ticksLeft <= 0);
    if (done) { hits[i] = hits[hits.length - 1]; hits.pop(); }
  }
}

function stepArea(h, enemies, dt, ctx) {
  if (h.ticksLeft > 0) {
    h.tickT -= dt;
    while (h.tickT <= 0 && h.ticksLeft > 0) {
      for (const e of enemies) if (e.hp > 0 && (!h.only || e === h.only) && inShape(h, e)) ctx.onHit(h, e);
      h.ticksLeft--;
      h.tickT += h.tickEvery;
      if (h.tickEvery === 0) break;
    }
  }
  h.life -= dt;
}

function stepSweep(h, enemies, dt, ctx) {
  for (const e of enemies) {
    if (e.hp <= 0 || h.hitSet.has(e) || !inShape(h, e)) continue;
    h.hitSet.add(e);
    ctx.onHit(h, e);
  }
  h.life -= dt;
}

function stepOrbit(h, enemies, dt, ctx) {
  h.angle += h.spin * dt;
  h.cx = ctx.px; h.cy = ctx.py; // orbit centre (the renderer draws afterimages along the circle)
  h.x = ctx.px + Math.cos(h.angle) * h.radius;
  h.y = ctx.py + Math.sin(h.angle) * h.radius;
  h.age += dt;
  for (const e of enemies) {
    if (e.hp <= 0 || !inShape(h, e)) continue;
    const last = h.lastHit.get(e);
    if (last !== undefined && h.age - last < h.every - 1e-9) continue;
    h.lastHit.set(e, h.age);
    ctx.onHit(h, e);
  }
  h.life -= dt;
  if (h.life <= 0 && h.throw) { // the blade leaves its orbit and is hurled at the aim point
    const th = h.throw;
    let a = Math.atan2(ctx.aimPY - h.y, ctx.aimPX - h.x);
    if (Number.isNaN(a) || Math.hypot(ctx.aimPX - h.x, ctx.aimPY - h.y) < 1e-6) a = h.angle;
    const c = makeProjectile({ x: h.x, y: h.y, angle: a, speed: th.speed, range: th.range, r: th.r, mult: th.mult * castScale(h), pierce: th.pierce || 0, fx: h.fx, split: th.split || null }); // th.split: Shuriken Raksasa L5
    c.mult0 = th.mult;
    c.part = 'throw';
    ctx.add(inherit(c, h));
  }
}

function stepProjectile(h, enemies, dt, ctx) {
  if (h.returning) { // boomerang on its way home: steer at the player
    const dx = ctx.px - h.x, dy = ctx.py - h.y, d = Math.hypot(dx, dy);
    if (d < RETURN_CATCH) { h.dead = true; return; }
    h.vx = (dx / d) * h.speed; h.vy = (dy / d) * h.speed;
    h.angle = Math.atan2(h.vy, h.vx);
  }
  if (h.curve && !h.returning) {
    h.angle += h.curve * dt;
    h.vx = Math.cos(h.angle) * h.speed; h.vy = Math.sin(h.angle) * h.speed;
  }
  h.x += h.vx * dt; h.y += h.vy * dt;
  h.dist += h.speed * dt;
  if (h.boomerang && h.dist >= h.range * BOOMERANG_MAX_TRAVEL) { h.dead = true; return; } // safety: never fly forever
  if (h.trail) {
    h.trailT += dt;
    const tr = h.trail;
    while (h.trailT >= tr.every) {
      h.trailT -= tr.every;
      const a = makeArea({ x: h.x, y: h.y, r: tr.r, mult: tr.mult * castScale(h), ticks: tr.ticks, duration: tr.life, fx: 'trail' });
      a.part = 'trail'; // drawn as a lingering patch, not like the parent (render/skillfx.js)
      ctx.add(inherit(a, h));
    }
  }
  for (const e of enemies) {
    if (e.hp <= 0 || h.hitSet.has(e) || !inShape(h, e)) continue;
    h.hitSet.add(e);
    if (ctx.reflect?.(h, e)) return; // a raised mirror sends it back (Penjaga Cermin, spec §41.1)
    if (h.explode) {
      const blast = makeArea({ x: h.x, y: h.y, r: h.explode.r, mult: h.mult, fx: 'boom' });
      ctx.add(inherit(blast, h)); // a skill's explosion still counts as the skill, looks like it and keeps Kombo
      if (h.explode.twice) ctx.add(inherit(makeArea({ x: h.x, y: h.y, r: h.explode.r, mult: h.mult, fx: 'boom', delay: h.explode.twice }), h)); // Matahari Kecil L5
      if (h.explode.shards) shardsOut(h, e, ctx);
      h.dead = true;
      return;
    }
    ctx.onHit(h, e);
    if (h.pull && h.returning && !e.boss) { e.kx += (h.vx / h.speed) * h.pull; e.ky += (h.vy / h.speed) * h.pull; }
    if (h.pierce <= 0) { h.dead = true; return; }
    h.pierce--;
  }
  if (h.split && h.dist >= h.split.at) { splitUp(h, ctx); h.dead = true; return; }
  if (h.dist >= h.range) {
    if (h.boomerang && !h.returning && h.pause > 0) { h.pause -= dt; h.x -= h.vx * dt; h.y -= h.vy * dt; h.dist -= h.speed * dt; if (h.hitSet.size) h.hitSet.clear(); return; } // Kapak Bumerang L5: spins in place
    if (h.boomerang && !h.returning) { h.returning = true; h.hitSet.clear(); } // second pass hits everything again
    else if (!h.boomerang) h.dead = true;
  }
}

// A split arrow bursts into a fan of plain arrows (they do not split again).
function splitUp(h, ctx) {
  const sp = h.split, n = sp.count, sm = sp.mult ?? 1;
  for (let k = 0; k < n; k++) {
    const a = h.angle + (n > 1 ? k / (n - 1) - 0.5 : 0) * sp.spread * DEG;
    const c = makeProjectile({ x: h.x, y: h.y, angle: a, speed: h.speed, range: Math.max(0, h.range - h.dist), r: h.r, mult: h.mult * sm, pierce: sp.pierce ?? h.pierce, fx: h.fx }); // sp.pierce: Panah Pecah L5
    c.mult0 = h.mult0 * sm;
    c.part = 'split';
    ctx.add(inherit(c, h));
  }
}

// The burst throws shards outward, evenly around the circle. The enemy that set it off is
// already inside the blast, so the shards skip it (otherwise they would all hit it point-blank).
function shardsOut(h, struck, ctx) {
  const sh = h.explode.shards, n = sh.count, scale = castScale(h);
  for (let k = 0; k < n; k++) {
    const c = makeProjectile({ x: h.x, y: h.y, angle: h.angle + (k / n) * TAU, speed: sh.speed, range: sh.range, r: sh.r, mult: sh.mult * scale, fx: h.fx });
    c.mult0 = sh.mult;
    c.part = 'shard';
    c.hitSet.add(struck);
    ctx.add(inherit(c, h));
  }
}
