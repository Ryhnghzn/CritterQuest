// Item visuals (plan "Efek Lebay" §E): how much each rarity glows, sparkles and
// shines — bag icons, gear on the doll, drops on the floor, chests and the
// Mythic pickup card. Index = rarity (0 Biasa … 5 Mitos). Visual only.

// Bag / ground icons.
export const ICON_FX = {
  fps: 20,                       // animated DOM icons (Legendaris+) redraw at most this often
  animFrom: 4,                   // rarity from which DOM icons animate
  halo: [0, 0, 0, 0.4, 0.55, 0.7], // alpha of the glow behind the icon
  motes: [0, 0, 0, 0, 4, 7],     // orbiting sparkles
  rays: 8,                       // Mitos: rotating light rays behind the icon
};

// Gear worn on the doll.
export const DOLL_FX = {
  glowFrom: 4,                   // weapons glow in the hand from this rarity
  embers: [0, 0, 0, 0, 4, 8],    // sparks rising off the weapon
  trail: [0.28, 0.14],           // Mitos: afterimage alphas of the weapon while attacking
  trailStep: 0.32,               // radians between afterimages
};

// Gear lying on the floor: a beam of light in the rarity colour.
export const DROP_BEAM = {
  height: [24, 30, 40, 54, 92, 160],
  width: [8, 9, 10, 12, 15, 20],
  light: [50, 62, 76, 92, 130, 190], // radius of the light it casts in the dark
  motes: [0, 0, 0, 3, 6, 10],    // sparks rising up the beam
  pulse: 0.25,                   // Mitos: beam width pulse
  dingEvery: 1.3,                // Mitos: seconds between "ding" rings
  dingR: 48,
};

// Picking up a Mitos item mid-fight.
export const MYTHIC_PICK = {
  flash: [['#ff4d6d', 0.45, 0.25], ['#ffd166', 0.3, 0.45]], // [colour, alpha, seconds]
  ring: { r1: 90, life: 0.6, width: 6 },
  card: 2.2,                     // seconds the big item card stays up
};

// Opening a chest bought at the smith.
export const CHEST_FX = {
  duration: 2.6,                 // whole animation; tap skips to the end
  lidAt: 0.55,                   // lid flies off at this time
  shake: 0.45,                   // chest rattles until the lid pops
  beams: [3, 4, 6, 8, 11, 16],   // light beams out of the chest by rarity
  sparks: [6, 8, 12, 18, 26, 40],
};

// Reward pop-up (ui/reveal.js showRewardPop): seconds between cards popping in, confetti
// pieces and their life, coins/EXP count-up time, and how long a tap is ignored at first.
export const REWARD_POP = { stagger: 0.12, confetti: 120, life: 2.6, count: 0.9, guard: 0.45 };
