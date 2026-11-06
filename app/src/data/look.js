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
};
// the look before §36, for comparing side by side
const LAMA = {
  saturation: 1, detail: 0, exposure: 1, bloom: { strength: 0.7, radius: 0.45, threshold: 0.82 }, bloomScale: 1,
  bill: 0.42, heroBill: 0.42, groundGlow: 1, ambient: 1, key: 1, points: 1,
};
const old = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lama');
export const LOOK = old ? LAMA : MATANG;
