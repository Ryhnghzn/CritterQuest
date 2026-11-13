// Visual effects (plan "Efek Lebay"): element palettes, particle budgets per
// quality level, screen shake tiers, hit-stop and damage-number styles.
// Visual only — nothing here changes the simulation.

// One palette per element, hottest first (white core → element colour → dark edge).
export const PALETTES = {
  fire: ['#ffffff', '#ffe27a', '#ff9a3c', '#c2321f'],
  ice: ['#ffffff', '#bff4ff', '#5fd3ff', '#2a6fd6'],
  lightning: ['#ffffff', '#f4ecff', '#c9a8ff', '#8a5cff'],
  poison: ['#f4ffd0', '#c8ff5a', '#6fd13a', '#2f6b1c'],
  shadow: ['#e9d8ff', '#b06bff', '#6a2fb8', '#1c0d2e'],
  holy: ['#ffffff', '#fff3c4', '#ffd166', '#c28a1a'],
  blood: ['#ffd6d6', '#ff5a6e', '#c21f3a', '#5c0a18'],
  steel: ['#ffffff', '#e6eef8', '#9fb3c8', '#4a5a6e'],
};

// Which element a hit's look (hit.fx) belongs to; unknown looks fall back to steel.
export const HIT_ELEMENT = {
  slash: 'steel', stab: 'shadow', arrow: 'steel', fireball: 'fire', boom: 'fire',
  spin: 'steel', nova: 'ice', shadow: 'shadow', pierce: 'steel', rain: 'holy',
  dagger: 'shadow', chain: 'lightning', shout: 'holy', quake: 'fire', trail: 'fire',
};
export const elementOf = (look) => HIT_ELEMENT[look] || 'steel';

// Quality levels (pause menu "Efek"): particle cap, spawn multiplier, shake on/off.
// touchCap applies on phones/tablets (coarse pointer).
export const QUALITY = {
  full: { cap: 400, touchCap: 180, mul: 1, shake: true },
  lite: { cap: 160, touchCap: 90, mul: 0.5, shake: false },
};
export const QUALITY_IDS = ['full', 'lite'];
// Full quality drops to lite for the session when FPS stays below `fps` for `seconds`.
export const AUTO_LITE = { fps: 40, seconds: 3 };

// Other pooled effects (rings, cracks, flashes) have small fixed caps.
export const CAPS = { rings: 32, cracks: 12, flashes: 4 };

// Screen shake tiers: strength 0–1 (decays at SHAKE_DECAY / s), SHAKE_PX = max offset.
// big: the rarest moments (boss phase, a focused ultimate landing, Tebasan Raksasa at full).
export const SHAKE = { light: 0.35, medium: 0.6, heavy: 1, big: 1.3 };
export const SHAKE_DECAY = 3;
export const SHAKE_PX = 9;

// Camera punch (plan "Rasa Pukulan" B): the camera moves this share closer for the biggest
// moments, then drifts back (falls by `decay` per second of game time, held during hit-stop;
// render3d/stage.js eases toward it by `ease` per frame). Off with screen shake or reduced motion.
export const PUNCH = { frenzy: 0.04, ult: 0.07, phase: 0.1, bossKill: 0.14, decay: 0.32, ease: 0.22 };

// Hit-stop: the simulation pauses this many seconds (the longest wins). The impact ladder
// (plan "Rasa Pukulan"): basic none < crit / skill < ultHit / elite < frenzy < ult < phase < bossKill.
export const HITSTOP = {
  crit: 0.03, skill: 0.03, ultHit: 0.05, elite: 0.05, frenzy: 0.06, boss: 0.06, ult: 0.08,
  phase: 0.22, bossKill: 0.25, max: 0.25,
};
// Small stops that can come in a stream (many crits in one area): at most one per this many seconds.
export const HITSTOP_GAP = { crit: 0.18, skill: 0.18, ultHit: 0.3 };

// An enemy struck jerks away from the blow for a moment (drawing only, its real position stays):
// px pushed back per kind of hit, seconds to settle, bosses move this share, squash at the peak.
export const RECOIL = { time: 0.14, normal: 3, crit: 6, skill: 5, ult: 7, boss: 0.35, squash: 0.14 };

// Floating damage numbers.
export const FLOATER = {
  normal: { size: 9, life: 0.7, rise: 26 },
  skill: { size: 12, life: 0.8, rise: 30, pop: 0.08 },
  crit: { size: 15, life: 0.9, rise: 34, skew: -0.25, wobble: 2.2, pop: 0.12 },
  ult: { size: 17, life: 1, rise: 30, skew: -0.2, wobble: 1.5, pop: 0.15, outline: '#ffd166' },
};

// At most this many numbers float at once; plain damage numbers beyond it are skipped (a horde).
export const FLOATER_MAX = 70;

// Deaths & boss moments (plan "Rasa Pukulan" A): ring sizes are × the enemy radius.
export const DEATH_FX = {
  normal: { ring: 1.8, life: 0.28, width: 3 },
  elite: { ring: 3.2, life: 0.45, width: 5, color: '#ffc864' },
  // a boss changes phase (every boss's enrage line is one of its phase lines)
  phase: { ring: 5, color: '#c79bff', flash: ['#e8d4ff', 0.4, 0.35], sparks: 24 },
};

// Particle presets for vfx.burst(): count (before the quality multiplier),
// speed / life / size ranges, drag (per 1/60 s), gravity (px/s², + = down).
export const BURST = {
  hit: { kind: 'spark', count: 6, speed: [80, 220], life: [0.15, 0.3], size: [1.2, 2.2], drag: 0.86 },
  kill: { kind: 'dot', count: 8, speed: [30, 140], life: [0.25, 0.6], size: [2, 4], drag: 0.92 },
  hurt: { kind: 'dot', count: 8, speed: [30, 140], life: [0.25, 0.6], size: [2, 4], drag: 0.92 },
  blast: { kind: 'ember', count: 14, speed: [60, 200], life: [0.4, 0.9], size: [1.5, 3], drag: 0.93, gravity: 120 },
  smoke: { kind: 'smoke', count: 6, speed: [10, 50], life: [0.6, 1.1], size: [6, 12], drag: 0.94, gravity: -20 },
  shards: { kind: 'shard', count: 8, speed: [90, 220], life: [0.35, 0.7], size: [2.5, 4.5], drag: 0.9, gravity: 260 },
  stars: { kind: 'star', count: 6, speed: [40, 140], life: [0.35, 0.7], size: [3, 5], drag: 0.9 },
};
