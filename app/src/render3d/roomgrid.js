// Pure geometry for the 2.5D dungeon (plan "Tampilan 2.5D" §1): which grid cells around
// a room are wall. A room is a union of circles and boxes plus corridors (lanes); every
// cell outside it but within `depth` cells of the floor becomes a wall block.
import { ROOM } from '../data/dungeon.js';

function inPart(p, x, y) {
  if (p.kind === 'c') return (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r * p.r;
  return x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;
}
function inLane(l, x, y) { // a corridor from (l.x, l.y) outward along angle l.a
  const dx = x - l.x, dy = y - l.y, c = Math.cos(l.a), s = Math.sin(l.a);
  const along = dx * c + dy * s, side = -dx * s + dy * c;
  return along >= -ROOM.wall && along <= ROOM.wall + ROOM.laneLen + 400 && Math.abs(side) <= ROOM.laneWidth / 2;
}
export function isFloor(room, x, y) {
  return room.parts.some((p) => inPart(p, x, y)) || room.lanes.some((l) => inLane(l, x, y));
}

// → [{ x, y, h }] cell centres (world units) of wall blocks; h varies a little (crumbling look)
export function wallCells(room, cell = 40, depth = 2, rng = Math.random) {
  const R = room.bound + cell * (depth + 2);
  const n = Math.ceil((R * 2) / cell), x0 = -n * cell / 2;
  const floor = [];
  for (let j = 0; j < n; j++) {
    floor.push([]);
    for (let i = 0; i < n; i++) floor[j].push(isFloor(room, x0 + (i + 0.5) * cell, x0 + (j + 0.5) * cell));
  }
  const out = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (floor[j][i]) continue;
    let near = false;
    for (let dj = -depth; dj <= depth && !near; dj++) for (let di = -depth; di <= depth; di++) {
      const a = floor[j + dj]?.[i + di];
      if (a) { near = true; break; }
    }
    if (near) out.push({ x: x0 + (i + 0.5) * cell, y: x0 + (j + 0.5) * cell, h: 0.85 + rng() * 0.3 });
  }
  return out;
}
