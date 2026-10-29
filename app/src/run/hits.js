// Attack instances (spec §5.2). There are no shared enemy i-frames: each
// instance decides on its own whom it may hit.
//  - area:  circle or cone; hits everything inside once per tick
//           (`ticks` spread evenly over `duration`; 1 tick = instant)
//  - sweep: circle that lives for `duration`; each enemy at most once
//  - proj:  moving circle; each enemy at most once; passes through `pierce`
//           more enemies, or bursts into an area (`explode`) on first contact
// stepHits() reports contacts through ctx.onHit(hit, enemy); damage is the caller's job.
const DEG = Math.PI / 180;
const FX_MIN = 0.18; // keep instant hits on screen long enough to be seen

export function makeArea({ x, y, r, angle = 0, arc = null, mult, ticks = 1, duration = 0, follow = false, freeze = 0, fx = null }) {
  const life = Math.max(duration, FX_MIN);
  return {
    kind: 'area', x, y, r, angle, arc: arc === null ? null : arc * DEG, mult, freeze, fx, follow,
    ticksLeft: ticks, tickEvery: ticks > 1 ? duration / ticks : 0, tickT: 0, life, maxLife: life,
  };
}

export function makeSweep({ x, y, r, mult, duration, follow = false, fx = null }) {
  return { kind: 'sweep', x, y, r, arc: null, mult, follow, fx, life: duration, maxLife: duration, hitSet: new Set() };
}

export function makeProjectile({ x, y, angle, speed, range, r, mult, pierce = 0, explode = null, fx = null }) {
  return {
    kind: 'proj', x, y, r, angle, mult, pierce, explode, fx,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, speed, dist: 0, range,
    hitSet: new Set(), life: 1, dead: false,
  };
}

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
  h.x += h.vx * dt; h.y += h.vy * dt;
  h.dist += h.speed * dt;
  for (const e of enemies) {
    if (e.hp <= 0 || h.hitSet.has(e) || !inShape(h, e)) continue;
    h.hitSet.add(e);
    if (h.explode) {
      const blast = makeArea({ x: h.x, y: h.y, r: h.explode.r, mult: h.mult, fx: 'boom' });
      blast.skill = h.skill; // a skill's explosion still counts as the skill
      blast.sid = h.sid;     // and looks like it (run/skillfx.js)
      blast.execute = h.execute; blast.crit = h.crit; // Kombo execute / forced crit carry over
      ctx.add(blast);
      h.dead = true;
      return;
    }
    ctx.onHit(h, e);
    if (h.pierce <= 0) { h.dead = true; return; }
    h.pierce--;
  }
  if (h.dist >= h.range) h.dead = true;
}
