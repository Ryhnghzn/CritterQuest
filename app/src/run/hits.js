// Attack instances (spec §5.2). There are no shared enemy i-frames: each
// instance decides on its own whom it may hit.
//  - area:  circle or cone; hits everything inside once per tick
//           (`ticks` spread evenly over `duration`; 1 tick = instant)
//  - sweep: circle that lives for `duration`; each enemy at most once
//  - proj:  moving circle; each enemy at most once; passes through `pierce`
//           more enemies, or bursts into an area (`explode`) on first contact
// Any hit may carry `delay` (seconds): until it runs out the hit neither moves, ticks nor
// ages. An area may carry `target` (an enemy): it then rides on that enemy.
// Projectile extras (all optional):
//  - boomerang: at `range` it turns back to the player (hitSet cleared once, so every
//    enemy can be hit again), and dies on reaching him; `pull` drags enemies it strikes
//    on the way home along with it
//  - trail { every, r, life, ticks, mult }: drops a small lingering area behind it
//  - split { at, count, spread, mult }: at distance `at` it bursts into `count` arrows
// stepHits() reports contacts through ctx.onHit(hit, enemy); damage is the caller's job.
const DEG = Math.PI / 180;
import { SKILL_PULL } from '../data/balance.js';
const RETURN_CATCH = 20; // a boomerang this close to the player is caught
const FX_MIN = 0.18; // keep instant hits on screen long enough to be seen

export function makeArea({ x, y, r, angle = 0, arc = null, mult, ticks = 1, duration = 0, follow = false, freeze = 0, fx = null, delay = 0 }) {
  const life = Math.max(duration, FX_MIN);
  return {
    kind: 'area', x, y, r, angle, arc: arc === null ? null : arc * DEG, mult, mult0: mult, freeze, fx, follow, delay, target: null,
    ticksLeft: ticks, tickEvery: ticks > 1 ? duration / ticks : 0, tickT: 0, life, maxLife: life,
  };
}

export function makeSweep({ x, y, r, mult, duration, follow = false, fx = null, delay = 0 }) {
  return { kind: 'sweep', x, y, r, arc: null, mult, mult0: mult, follow, fx, delay, life: duration, maxLife: duration, hitSet: new Set() };
}

export function makeProjectile({ x, y, angle, speed, range, r, mult, pierce = 0, explode = null, fx = null, delay = 0, boomerang = false, pull = 0, trail = null, split = null }) {
  return {
    kind: 'proj', x, y, r, angle, mult, mult0: mult, pierce, explode, fx, delay,
    boomerang, returning: false, pull: pull === true ? SKILL_PULL : pull || 0, trail, trailT: 0, split,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, speed, dist: 0, range,
    hitSet: new Set(), life: 1, dead: false,
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
    if (h.delay > 0) { h.delay -= dt; if (h.delay > 0) continue; } // not born yet
    if (h.target && h.target.hp > 0) { h.x = h.target.x; h.y = h.target.y; }
    if (h.follow) { h.x = ctx.px; h.y = ctx.py; }
    if (h.kind === 'area') stepArea(h, enemies, dt, ctx);
    else if (h.kind === 'sweep') stepSweep(h, enemies, dt, ctx);
    else stepProjectile(h, enemies, dt, ctx);
    const done = h.kind === 'proj' ? h.dead : h.life <= 0 && (h.kind !== 'area' || h.ticksLeft <= 0);
    if (done) { hits[i] = hits[hits.length - 1]; hits.pop(); }
  }
}

function stepArea(h, enemies, dt, ctx) {
  if (h.ticksLeft > 0) {
    h.tickT -= dt;
    while (h.tickT <= 0 && h.ticksLeft > 0) {
      for (const e of enemies) if (e.hp > 0 && inShape(h, e)) ctx.onHit(h, e);
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

function stepProjectile(h, enemies, dt, ctx) {
  if (h.returning) { // boomerang on its way home: steer at the player
    const dx = ctx.px - h.x, dy = ctx.py - h.y, d = Math.hypot(dx, dy);
    if (d < RETURN_CATCH) { h.dead = true; return; }
    h.vx = (dx / d) * h.speed; h.vy = (dy / d) * h.speed;
    h.angle = Math.atan2(h.vy, h.vx);
  }
  h.x += h.vx * dt; h.y += h.vy * dt;
  h.dist += h.speed * dt;
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
    if (h.explode) {
      const blast = makeArea({ x: h.x, y: h.y, r: h.explode.r, mult: h.mult, fx: 'boom' });
      ctx.add(inherit(blast, h)); // a skill's explosion still counts as the skill, looks like it and keeps Kombo
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
    if (h.boomerang && !h.returning) { h.returning = true; h.hitSet.clear(); } // second pass hits everything again
    else if (!h.boomerang) h.dead = true;
  }
}

// A split arrow bursts into a fan of plain arrows (they do not split again).
function splitUp(h, ctx) {
  const sp = h.split, n = sp.count, sm = sp.mult ?? 1;
  for (let k = 0; k < n; k++) {
    const a = h.angle + (n > 1 ? k / (n - 1) - 0.5 : 0) * sp.spread * DEG;
    const c = makeProjectile({ x: h.x, y: h.y, angle: a, speed: h.speed, range: Math.max(0, h.range - h.dist), r: h.r, mult: h.mult * sm, pierce: h.pierce, fx: h.fx });
    c.mult0 = h.mult0 * sm;
    c.part = 'split';
    ctx.add(inherit(c, h));
  }
}
