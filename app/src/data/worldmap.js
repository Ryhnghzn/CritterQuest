// One connected world (spec §40): Kota Awal in the middle of a neutral meadow, four
// biome arms around it (west forest, north ice, east desert, south volcano), each
// arm ending at its big town; natural borders between the arms, crossed only at
// passes / bridges; Tanah Gerhana a walled pocket south of Baraapi. Every number
// of the world's shape lives here; run/worldmap.js builds it.

export const WORLD = {
  w: 70000, h: 76000,
  cx: 35000, cy: 35000,      // Kota Awal's gate (the middle of the meadow)
  hub: 3000,                 // the meadow's radius: no borders, no packs
  chunk: 4000,               // content is built per chunk of this size
  keep: 1,                   // chunks within this many of the player's stay built (3 × 3)
  cache: 30,                 // most chunks kept in memory before the oldest go
  seed: 4242,                // the same world for every character
  edge: 300,                 // nothing grows this close to the world's edge
  townSolid: 650,            // the town's wall behind its gate (radius)
  townClear: 1100,           // no trees / rocks this close to a town gate
  gateR: 130,                // walk this close to a town gate to enter the town
  spawnBack: 260,            // leaving a town: appear this far in front of its gate
  armFill: 0.82,             // an arm's content spreads over this part of its width
};

// arm: the zone, the way out from the middle, the town at its end (distance from the middle)
export const ARMS = {
  forest: { dir: [-1, 0], town: 'rimba', dist: 32000 },
  ice: { dir: [0, -1], town: 'beku', dist: 32000 },
  desert: { dir: [1, 0], town: 'pasir', dist: 32000 },
  volcano: { dir: [0, 1], town: 'bara', dist: 28000 },
};
export const ARM_IDS = Object.keys(ARMS);

// the borders between arms, along the diagonals out from the meadow's edge.
// half: half the width of the solid band; cross: where it can be crossed (fraction from the
// meadow's edge to the world's edge) and how; gap: the opening's radius
export const BORDERS = [
  { id: 'nw', between: ['forest', 'ice'], to: [-1, -1], kind: 'mountain', half: 420, cross: [0.3, 0.7], crossing: 'pass', gap: 520 },
  { id: 'ne', between: ['ice', 'desert'], to: [1, -1], kind: 'river', half: 230, cross: [0.3, 0.7], crossing: 'bridge', gap: 300 },
  { id: 'se', between: ['desert', 'volcano'], to: [1, 1], kind: 'canyon', half: 340, cross: [0.3, 0.7], crossing: 'rope', gap: 380 },
  { id: 'sw', between: ['volcano', 'forest'], to: [-1, 1], kind: 'lava', half: 420, cross: [], crossing: null, gap: 0 },
];
export const BORDER_WIGGLE = 900;   // how far a border wanders off its diagonal
export const BORDER_STEP = 1500;    // between its bends
export const CROSS_BLEND = 400;     // ground of both sides blends this far around a crossing
export const CROSS_MIX = 600;       // packs near a crossing mix both zones' enemies

// Tanah Gerhana: a pocket at the south edge behind Baraapi, ringed by black cliffs with one
// opening at the top (closed until all Seal Shards are in, spec §26.7)
export const ECLIPSE = { x0: 30500, x1: 39500, y0: 69000, y1: 76000, half: 320, gap: 420, kind: 'cliff' };

// roads
export const ROADS = {
  bend: 1100,            // main roads: a bend every this far…
  wiggle: 0.18,          // …off the straight line by up to this × the arm's half width there
  maxWiggle: 1800,
  branches: { forest: 7, ice: 6, desert: 6, volcano: 6 },
  branchLen: [4, 6],     // bends in a branch
  ringWiggle: 500,       // ring roads (town → crossing → town) wander this much
};

// per arm: small rivers across it (bridged where roads cross) and lakes
export const WATERS = {
  forest: { rivers: 3, lakes: 14 },
  ice: { rivers: 3, lakes: 16 },
  desert: { rivers: 2, lakes: 8 },
  volcano: { rivers: 2, lakes: 16 },
  eclipse: { rivers: 0, lakes: 3 },
};
export const RUINS_PER_CHUNK = 0.6;   // average ruins per chunk
export const HUB_TREES = 0.25;        // the meadow's trees as a part of the forest's
