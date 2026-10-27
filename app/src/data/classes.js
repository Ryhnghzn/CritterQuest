// Character classes (spec §4.2). Stats every class starts with unless overridden.
export const CLASS_BASE = { atkSpd: 1, critDmg: 1.5, cdr: 0, magnet: 70 };

// Basic attack (held: click / attack button). interval is divided by atkSpd.
//   kind 'arc':  instant hit in a cone around the player — r (px), arc (degrees)
//   kind 'proj': projectile — speed, range (px), r, pierce (extra enemies), explode { r }
// fx picks the visual in render/world.js; mult scales atk (spec §5.2).
//
// energy: energy gained per enemy a basic attack hits (spec §18.2).
//
// Skills Q / E cost energy (`cost`) and have a short cooldown (cd in seconds, reduced by cdr):
//   'area'  — circle around the player (follow) or at the aim point (at: 'aim', maxDist);
//             ticks over duration; optional freeze (s)
//   'proj'  — like the basic projectile;  'fan' — `count` projectiles over `spread` degrees
//   'chain' — instant: first enemy near the aim point within range, then jumps to `count` total
//   'dash'  — player dashes `distance` along the aim, hurting each enemy passed once
//   'buff'  — dmgTaken multiplier for `duration`; optional `blast` shockwave { r, mult, knock }
// knock on an area pushes enemies away from its centre (negative = pulls them in).
export const CLASSES = {
  warrior: {
    id: 'warrior', name: 'Warrior', desc: 'Tebal darah, tebasan jarak dekat.',
    stats: { maxHp: 140, atk: 14, def: 2, crit: 5, moveSpd: 105 },
    growth: { maxHp: 12, atk: 1.4 },
    attack: { kind: 'arc', fx: 'slash', interval: 0.55, mult: 1, r: 46, arc: 100, energy: 7 },
    skills: [
      { id: 'spin', name: 'Putaran Pedang', kind: 'area', cost: 35, cd: 3, r: 95, ticks: 5, duration: 1, mult: 2.2, follow: true, knock: -140 },
      { id: 'shout', name: 'Teriakan Baja', kind: 'buff', cost: 50, cd: 8, duration: 5, dmgTaken: 0.4, blast: { r: 115, mult: 2.5, knock: 320 } },
    ],
  },
  archer: {
    id: 'archer', name: 'Archer', desc: 'Panah jarak jauh, lincah.',
    stats: { maxHp: 95, atk: 11, def: 0, crit: 8, moveSpd: 115 },
    growth: { maxHp: 8, atk: 1.2 },
    attack: { kind: 'proj', fx: 'arrow', interval: 0.45, mult: 1, speed: 380, range: 450, r: 4, pierce: 0, energy: 8 },
    skills: [
      { id: 'rain', name: 'Hujan Panah', kind: 'area', at: 'aim', maxDist: 320, cost: 40, cd: 3, r: 85, ticks: 6, duration: 1.5, mult: 1.6 },
      { id: 'pierce', name: 'Tembakan Tembus', kind: 'proj', cost: 35, cd: 2.5, speed: 560, range: 650, r: 14, mult: 6, pierce: Infinity },
    ],
  },
  mage: {
    id: 'mage', name: 'Mage', desc: 'Sihir area yang sakit, tapi rapuh.',
    stats: { maxHp: 85, atk: 16, def: 0, crit: 5, moveSpd: 100 },
    growth: { maxHp: 7, atk: 1.6 },
    attack: { kind: 'proj', fx: 'fireball', interval: 0.8, mult: 1, speed: 260, range: 420, r: 6, pierce: 0, explode: { r: 36 }, energy: 9 },
    skills: [
      { id: 'nova', name: 'Nova Es', kind: 'area', cost: 45, cd: 4, r: 125, mult: 3, freeze: 2.2, duration: 0.4, knock: 160 },
      { id: 'chain', name: 'Petir Berantai', kind: 'chain', cost: 35, cd: 2.5, count: 8, mult: 3.5, range: 450, jump: 200 },
    ],
  },
  assassin: {
    id: 'assassin', name: 'Assassin', desc: 'Cepat, kritis tinggi, tusukan beruntun.',
    stats: { maxHp: 90, atk: 9, def: 0, crit: 20, moveSpd: 125 },
    growth: { maxHp: 8, atk: 1.0 },
    attack: { kind: 'arc', fx: 'stab', interval: 0.3, mult: 1, r: 34, arc: 50, energy: 4 },
    skills: [
      { id: 'shadow', name: 'Langkah Bayangan', kind: 'dash', cost: 30, cd: 2, distance: 180, duration: 0.16, r: 26, mult: 5 },
      { id: 'fan', name: 'Kipas Belati', kind: 'fan', cost: 40, cd: 3, count: 11, spread: 80, speed: 440, range: 320, r: 5, mult: 1.8 },
    ],
  },
};
