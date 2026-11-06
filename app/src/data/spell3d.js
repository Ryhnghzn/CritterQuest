// Spell effects standing in the 2.5D world (spec §36, plan B): sizes, timings, lights and
// sparks for render3d/spell3d.js. Frames come from art/spell/fx.js (design pixels).
// Sizes are relative to the hit radius in game units (S = 1/22 m per unit).
export const SPELL3D = {
  detail: 3,          // texels per design pixel
  ppm: 24,            // design pixels per metre at scale 1
  flyH: 26,           // flight height of projectiles, game units (as actors.js)
  maxSparks: 420,
  sparkSize: 0.16,    // metres
  lights: 2,          // pooled point lights (fixed count: no shader recompiles)
  // flying fireball (Mage basic attack, Matahari Kecil): width = r × len
  fireball: { len: 4, minR: 6, fps: 12, glow: 1.5, trail: 40, light: { color: 0xff7a30, peak: 16, dist: 5 } },
  // explosion on the ground: the fire ball's widest frame reaches r × fill
  boom: { fill: 0.7, fps: 15, glow: 1.25, sparks: 26, sparkSpeed: 4, light: { color: 0xff7a30, peak: 28, life: 0.6, dist: 2.6 } },
  // burnt patch left behind: diameter = r × fill
  scorch: { fill: 1.15, life: 4, fade: 1.5, opacity: 0.85 },
  // a meteor dropping in from the sky before its explosion
  meteor: { height: 9, drift: 3.5, fall: 0.16, size: 2.8 },  // size: length in metres
  storm: { big: 46, small: 28, size: [1.9, 1.3] },  // Hujan Meteor: blast radius (game units) and length (m) of a big / small meteor
  // Nova Es: the ring frame's outer radius is ringR design px (it reaches r); shards `shard` m tall
  nova: { ringR: 65, fps: 16, glow: 1.3, shard: 1.15, rings: [[0.45, 7], [0.8, 11]], wave: 0.25, sched: [0.04, 0.04, 0.55, 0.12, 0.12, 0.16],
    sparks: 34, sparkSpeed: 3.2, light: { color: 0x86c8ff, peak: 30, life: 0.6 } },
  // Badai Petir: one strike; height in metres, scorch diameter = r × scorch
  strike: { height: 7.5, fps: 22, life: 0.3, glow: 1.6, scorch: 1.6, sparks: 22, sparkSpeed: 4.5, light: { color: 0xc8e0ff, peak: 45, life: 0.35, dist: 9 } },
  // Teleportasi / Perisai Mana: a violet burst `size` metres wide
  arcane: { size: 1.3, fps: 18, glow: 1.5, sparks: 12, sparkSpeed: 2.5, blinkEnd: 0.1, light: { color: 0xa070ff, peak: 14, life: 0.3, dist: 4 } },
};
