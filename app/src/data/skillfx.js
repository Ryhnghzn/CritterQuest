// Skill & basic-attack effects (plan "Efek Lebay" §B, §C): which palette each
// skill uses and how much it throws around. Particle counts are before the
// quality multiplier (data/fx.js QUALITY). Visual only.

// skill id → { el: palette (data/fx.js PALETTES), n: main burst size, rate: particles/s while alive }
export const SKILL_FX = {
  // Job Lanjutan (spec §43.10)
  bloodrage: { el: 'blood', n: 26, rate: 24 }, rageleap: { el: 'blood', n: 12, rate: 120 }, ragnarok: { el: 'blood', n: 34, rate: 150 },
  holyguard: { el: 'holy', n: 24, rate: 10 }, judgment: { el: 'holy', n: 30, dust: 20 }, sanctuary: { el: 'holy', n: 30, rate: 60 },
  headshot: { el: 'holy', n: 18, rate: 90, charge: 70 }, steadyaim: { el: 'holy', n: 18, rate: 6 }, deatheye: { el: 'holy', n: 44, rate: 90 },
  wolf: { el: 'shadow', n: 18, rate: 30 }, runvolley: { el: 'steel', n: 14, rate: 24 }, huntwave: { el: 'steel', n: 26, dust: 30 },
  firestorm: { el: 'fire', n: 24, rate: 60 }, burnout: { el: 'fire', n: 36 }, supernova: { el: 'fire', n: 60, rate: 40 },
  rewind: { el: 'ice', n: 24, rate: 60 }, timefield: { el: 'ice', n: 20, rate: 30 }, timestop: { el: 'ice', n: 50 },
  vanish: { el: 'shadow', n: 26, rate: 20 }, shadowstrike: { el: 'shadow', n: 12, rate: 120 }, shadoweclipse: { el: 'shadow', n: 44, rate: 80 },
  bladevortex: { el: 'steel', n: 12, rate: 50 }, slashrain: { el: 'steel', n: 14, rate: 24 }, thousandcuts: { el: 'shadow', n: 34, rate: 140 },
  // Pengembara (spec §43.1): plain steel
  // tempo skills (spec §43.4)
  greatslash: { el: 'steel', n: 18, rate: 60 },
  steelparry: { el: 'holy', n: 16, rate: 40 },
  flamethrower: { el: 'fire', n: 6, rate: 120 },
  beamshot: { el: 'lightning', n: 8, rate: 100 },
  // focused ultimates (spec §43.5)
  skyfall: { el: 'fire', n: 40, rate: 60 },
  skypierce: { el: 'holy', n: 40, rate: 80 },
  sunfall: { el: 'fire', n: 50, rate: 90 },
  execution: { el: 'shadow', n: 40, rate: 80 },
  tower: { el: 'steel', n: 10, rate: 20 },
  timebomb: { el: 'fire', n: 16, rate: 30 },
  tripledance: { el: 'shadow', n: 14, rate: 80 },
  shadowclone: { el: 'shadow', n: 18, rate: 30 },
  sweep: { el: 'steel', n: 10, rate: 40 },
  tumble: { el: 'steel', n: 8, rate: 90 },
  // warrior
  spin: { el: 'fire', n: 14, rate: 70 },
  shout: { el: 'holy', n: 24 },
  quake: { el: 'fire', n: 22, dust: 36 }, // dust: particles/s a waiting pillar rumbles with
  charge: { el: 'fire', n: 10, rate: 120 },
  axe: { el: 'steel', n: 8, rate: 50 },
  warcry: { el: 'blood', n: 26, rate: 18 },
  bladestorm: { el: 'fire', n: 30, rate: 140 },
  // archer
  rain: { el: 'holy', n: 10, rate: 26 },
  pierce: { el: 'holy', n: 18, rate: 90, charge: 70, patch: 16 }, // charge: wind-up particles/s; patch: embers/s per trail area
  volley: { el: 'holy', n: 14, rate: 24 },
  leap: { el: 'ice', n: 20, rate: 90 },
  trap: { el: 'steel', n: 14, rate: 22 },
  hawk: { el: 'holy', n: 18, rate: 6 },
  starfall: { el: 'holy', n: 30, rate: 30 },
  // mage
  nova: { el: 'ice', n: 30 },
  chain: { el: 'lightning', n: 8, charge: 30 }, // charge: sparks/s gathering over a target about to be struck
  meteor: { el: 'fire', n: 34 },
  blink: { el: 'lightning', n: 22, rate: 100 },
  inferno: { el: 'fire', n: 40, rate: 90, shardRate: 40, patch: 14 }, // shardRate: trail particles/s per shard; patch: embers/s per scorched-path area
  manashield: { el: 'ice', n: 20, rate: 6 },
  meteorstorm: { el: 'fire', n: 26, rate: 8 },
  // assassin
  shadow: { el: 'shadow', n: 14, rate: 120 },
  fan: { el: 'shadow', n: 16, rate: 20, charge: 14 }, // charge: wisps/s off a dagger floating in the ring
  poison: { el: 'poison', n: 18, rate: 30 },
  smoke: { el: 'shadow', n: 26 },
  shuriken: { el: 'steel', n: 8, rate: 40 },
  assassinate: { el: 'blood', n: 22, rate: 16 },
  thousandshadows: { el: 'shadow', n: 30, rate: 60 },
};

// Basic attacks (§B): sparks per hit; dust at the feet per swing.
export const BASIC_FX = {
  slash: { sparks: 8, dust: 3 },
  arrow: { stars: 5, trail: 30 },
  fireball: { embers: 16, smoke: 5, trail: 45 },
  stab: { sparks: 5, drops: 3 },
};
// weapon rarity (data/items.js index) that adds the echo every `echoEvery` attacks / the rainbow trail
export const ECHO_RARITY = 4;
export const ECHO_EVERY = 3;
export const RAINBOW_RARITY = 5;
export const RAINBOW = ['#ff4d6d', '#ffb547', '#ffd166', '#c26bd8'];

// Ultimates: tint over the screen while they last (rgb, alpha)
export const ULT_TINT = {
  bladestorm: ['255,40,30', 0.12],
  starfall: ['10,8,40', 0.35],
  meteorstorm: ['255,50,20', 0.16],
  thousandshadows: ['60,10,90', 0.3],
};

// Class signature peaks (spec §31.8). Lite effects drop the scale, smoke and screen line;
// reduced motion drops the flash and the black-and-white moment.
export const TRAIT_FX = {
  frenzy: { scale: 1.15, flash: ['#ff3040', 0.3, 0.2], ring: 95 },  // Mengamuk: hero size, red flash (colour, alpha, s)
  heat: { glowFrom: 80, smoke: 14 },                                   // Panas: staff glows above this; Kepanasan smoke/s
  focus: { line: 1500, ring: [34, 10], ahead: 70 },                    // Bidik: shot line length; aim ring radius empty → full, distance ahead
  execute: { gray: 0.15, slash: 2.6 },                                 // Kombo: black-and-white seconds; slash length × enemy radius
};
