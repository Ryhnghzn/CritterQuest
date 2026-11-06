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
};
