// Aimed casting (spec §37): with a mouse, a skill that needs a direction or a spot waits for a
// left click after its key, and shows where it will land. Pure: which skills wait, and the
// marker's shape in world units (render/aim.js draws it).

// skills that land on the player alone (buffs, spins, full circles) fire at once
export function needsAim(s) {
  if (!s) return false;
  switch (s.kind) {
    case 'area': return s.at === 'aim';
    case 'turret': case 'rune': return true;
    case 'fan': return s.spread < 360;
    case 'proj': case 'line': case 'dash': case 'storm': case 'orbit': return true;
    default: return false;
  }
}

// → [{ type: 'circle', x, y, r, range? } | { type: 'strip', x, y, angle, len, w } | { type: 'cone', x, y, angle, r, spread }]
// (px, py): the player; (ax, ay): the mouse on the floor. range: the outer limit (drawn dashed)
export function aimShape(s, px, py, ax, ay) {
  let dx = ax - px, dy = ay - py;
  const d = Math.hypot(dx, dy) || 1, angle = Math.atan2(dy, dx);
  switch (s.kind) {
    case 'area': case 'turret': case 'rune': {
      if (d > s.maxDist) { dx *= s.maxDist / d; dy *= s.maxDist / d; } // castSkill clamps the same way
      return [{ type: 'circle', x: px, y: py, r: s.maxDist, range: true }, { type: 'circle', x: px + dx, y: py + dy, r: s.r }];
    }
    case 'proj': {
      const out = [{ type: 'strip', x: px, y: py, angle, len: s.range, w: s.r * 2 }];
      if (s.explode) out.push({ type: 'circle', x: px + Math.cos(angle) * s.range, y: py + Math.sin(angle) * s.range, r: s.explode.r });
      return out;
    }
    case 'line': return [{ type: 'strip', x: px, y: py, angle, len: s.step * s.count + s.r, w: s.r * 2 }];
    case 'dash': {
      const a = s.back ? angle + Math.PI : angle;
      return [{ type: 'strip', x: px, y: py, angle: a, len: s.distance, w: (s.r || 24) * 2 }];
    }
    case 'fan': return [{ type: 'cone', x: px, y: py, angle, r: s.range, spread: s.spread }];
    case 'storm': { // the chain starts at the enemy nearest the aim point within range
      const k = Math.min(1, s.range / d);
      return [{ type: 'circle', x: px, y: py, r: s.range, range: true }, { type: 'circle', x: px + dx * k, y: py + dy * k, r: s.r * 1.6 }];
    }
    case 'orbit': return [{ type: 'circle', x: px, y: py, r: s.radius + s.r, range: true }, { type: 'strip', x: px, y: py, angle, len: s.radius * 2, w: s.r * 2 }];
    default: return [];
  }
}
