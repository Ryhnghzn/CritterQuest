// Skill & basic-attack effects (plan "Efek Lebay" §B, §C): which palette each
// skill uses and how much it throws around. Particle counts are before the
// quality multiplier (data/fx.js QUALITY). Visual only.

// skill id → { el: palette (data/fx.js PALETTES), n: main burst size, rate: particles/s while alive }
export const SKILL_FX = {
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
  chain: { el: 'lightning', n: 8 },
  meteor: { el: 'fire', n: 34 },
  blink: { el: 'lightning', n: 22, rate: 100 },
  inferno: { el: 'fire', n: 40, rate: 90 },
  manashield: { el: 'ice', n: 20, rate: 6 },
  meteorstorm: { el: 'fire', n: 26, rate: 8 },
  // assassin
  shadow: { el: 'shadow', n: 14, rate: 120 },
  fan: { el: 'shadow', n: 16, rate: 20 },
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
