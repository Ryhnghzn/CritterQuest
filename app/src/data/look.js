// Tampilan Matang (spec §36): the look of the 2.5D world in one place. Characters, skill
// effects, fire and lights keep their full colour; the world around them is calmer.
export const LOOK = {
  saturation: 0.74,   // world materials (toon, ground, floors): 1 = as painted, 0 = grey
  exposure: 1,        // renderer tone-mapping exposure
  bloom: { strength: 0.4, radius: 0.4, threshold: 0.88 }, // was 0.7 / 0.45 / 0.82
  bloomScale: 0.55,   // the town's day/night bloom strengths are multiplied by this
  bill: 0.24,         // self light of NPC / enemy billboards (was 0.42): they now catch the scene's light
  heroBill: 0.34,     // the hero stays a little more readable than everything else
  groundGlow: 0.45,   // multiplier on the region ground's self light (was as bright as the 2D paint)
  ambient: 0.7,       // multipliers on each scene's hemisphere light …
  key: 1.25,          // … sun / moon …
  points: 1.4,        // … and torches, lanterns, windows: contrast and a sense of where light comes from
};
