// Auras (plan "Efek Lebay" §D): level rings, rarity auras, the full-set pillar and
// the look of each unique effect. Visual only. Counts are for full quality; the
// lite setting draws about half (LITE_MUL).
export const LITE_MUL = 0.5;

// Body landmarks above the feet, in world units (doll at scale 0.82).
export const BODY = { chest: 18, head: 36, top: 46, hand: 20, handX: 9 };

// Level ring tiers, one per 10 levels (tier 0 = no ring below level 10).
export const RING = {
  per: 10, max: 5,
  r: 15, rStep: 1.6,                         // radius grows with the tier
  rgb: ['150,170,255', '150,170,255', '150,170,255', '170,160,255', '190,150,255', '255,210,110'],
  runes: 12, spin: 0.4,                      // tier 2+: rune ticks turning
  motes: 7, moteRise: 40,                    // tier 3+: particles rising from the ring
  pillarH: 70, floaters: 4,                  // tier 4+: thin light pillar + runes floating around it
  rays: 10, crownPts: 5,                     // tier 5: golden rays turning + crown of light over the head
};

// Rarity aura from the best gear worn (2 Langka … 5 Mitos).
export const RARITY_AURA = {
  glintEvery: 2.2,                           // Langka+: a glint on the weapon every N s
  mist: 5,                                   // Epik+: mist puffs at the feet
  flames: 9, motes: 8,                       // Legendaris+: soft flames around the body, rising motes
  stars: 7, wingFeathers: 6,                 // Mitos: 4-point stars, red-gold wings of light
  mythicRgb: ['255,77,109', '255,180,70', '200,120,255'], // rainbow glint red → gold → violet
};

// Full set (every slot Legendaris+): the auras merge into one big pillar after standing still.
export const SET_PILLAR = { still: 2, grow: 0.8, h: 160, w: 26, rings: 3 };

// Unique effects (data/items.js UNIQUES[].effect).
export const UNIQUE_AURA = {
  phoenix: { feathers: 7, flap: 3, embers: 8, rgb: '255,150,60' },
  lifesteal: { mist: 6, rgb: '200,20,50', threadChance: 0.5, drops: 5 },
  thorns: { spikes: 14, r: 13, spikeLen: 9, spin: 0.35 },
  explode: { embers: 10, rgb: '255,130,50' },
  regen: { leaves: 7, flowerEvery: 18, flowerLife: 1.8, flowers: 16, rgb: '120,255,140' },
  goldfind: { coins: 6, orbit: 16, rgb: '255,214,110' },
  expfind: { runes: 6, rgb: '120,230,255' },
  chain: { arcs: 3, strikeEvery: 1.4, rgb: '200,190,255' },
  execute: { skullBelow: 0.3, rgb: '255,40,60' },  // skull over enemies under this HP fraction
  dodgecd: { ribbons: 4, ghosts: 3, rgb: '180,255,230' },
  shield: { hexes: 7, r: 24, rgb: '150,200,255' },
  frenzy: { flames: 8, steam: 4, rgb: '255,60,40', pulse: 0.1 },
};

// Event bursts fired by the run (run/run.js → game.vfx).
export const AURA_EVENTS = {
  lifesteal: ['#ffd6d6', '#ff5a6e', '#c21f3a'],
  thorns: ['#c9b8d8', '#6a4a7a', '#2a1a2a'],
  explode: ['#ffffff', '#ffe27a', '#ff9a3c', '#c2321f'],
  phoenix: ['#ffffff', '#ffe27a', '#ff9a3c', '#ff4d2a'],
  shield: ['#ffffff', '#cfe6ff', '#96c8ff'],
  gold: ['#fff6c4', '#ffd166', '#e0a020'],
};
