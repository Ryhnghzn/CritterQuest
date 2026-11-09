// Tampilan Matang (spec §36): the look of the 2.5D world in one place. Characters, skill
// effects, fire and lights keep their full colour; the world around them is calmer, darker
// between the lights, and has a surface. `?lama` in the URL shows the old look to compare.
const MATANG = {
  saturation: 0.6,    // world materials (toon, ground, floors): 1 = as painted, 0 = grey
  detail: 1.9,        // contrast of the material surfaces (texkit.js): 0 = flat colour, 1 = the map as drawn
  exposure: 1,        // renderer tone-mapping exposure
  bloom: { strength: 0.3, radius: 0.35, threshold: 0.9 }, // was 0.7 / 0.45 / 0.82
  bloomScale: 0.45,   // the town's day/night bloom strengths are multiplied by this
  bill: 0.12,         // self light of NPC / enemy billboards (was 0.42): they catch the scene's light
  heroBill: 0.26,     // the hero stays a little more readable than everything else
  groundGlow: 0.3,    // multiplier on the region ground's self light (was as bright as the 2D paint)
  ambient: 0.5,       // multipliers on each scene's hemisphere light …
  key: 1.3,           // … sun / moon …
  points: 1.7,        // … and torches, lanterns, windows: contrast and a sense of where light comes from
  spells: true,       // spell effects standing in the world (render3d/spell3d.js); false = the old flat glows
  // real sun shadows (plan C1; Penuh only, Ringan has none): map size, half-width of the
  // shadowed square around the camera target (metres), darkness, acne guards
  shadows: { size: 2048, box: 24, intensity: 0.8, bias: -0.0006, normalBias: 0.035 },
  // dusk like the look prototype: by day the sky light, ground bounce, sun and fog lean this far
  // toward these warm colours (none at night); the sun sits low in the west-south-west so
  // shadows fall long, away from the camera
  // painted ground like the prototype (plan C2): regions of these biomes and these towns get
  // grass with tufts and flowers, dirt paths with pebbles (towns: cobbled roads); ao = how dark
  // the ground gets under a tree or rock
  paintGround: { biomes: ['forest', 'ice', 'desert', 'volcano', 'eclipse'], towns: ['home', 'forest', 'ice', 'desert', 'volcano'], ao: 0.42 },
  // illustrated props (plan C3): trees, rocks and bushes as the prototype's painted pictures in
  // regions of these biomes, and as town trees
  illustrated: { biomes: ['forest', 'ice', 'desert', 'volcano', 'eclipse'], towns: true },
  // which way upright figures face (spec §38, render3d/facing.js): by the screen, not the world;
  // turn = seconds of the paper turn, hop = its lift (game units), lean = radians at full walk speed
  facing: { turn: 0.16, hop: 4, lean: 0.11, dead: 0.05 },
  mood: { warm: 0.55, hemi: 0xb4927e, ground: 0x2c1f1a, sun: 0xffb070, fog: 0x2a1c1c, sunDir: [-11, 8, 7], sunDist: 24 },
};
// the look before §36, for comparing side by side
const LAMA = {
  saturation: 1, detail: 0, exposure: 1, bloom: { strength: 0.7, radius: 0.45, threshold: 0.82 }, bloomScale: 1,
  bill: 0.42, heroBill: 0.42, groundGlow: 1, ambient: 1, key: 1, points: 1, spells: false, shadows: null, mood: null, paintGround: null, illustrated: null,
  facing: { turn: 0, hop: 0, lean: 0, dead: 0.05 },
};
const old = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lama');
export const LOOK = old ? LAMA : MATANG;
