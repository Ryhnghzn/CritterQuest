// Character classes (spec §4.2). Stats every class starts with unless overridden.
export const CLASS_BASE = { atkSpd: 1, critDmg: 1.5, cdr: 0, magnet: 70 };

// Basic attack (held: click / attack button). interval is divided by atkSpd.
//   kind 'arc':  instant hit in a cone around the player — r (px), arc (degrees)
//   kind 'proj': projectile — speed, range (px), r, pierce (extra enemies), explode { r }
// fx picks the visual in render/world.js; mult scales atk (spec §5.2).
//
// Skills Q / E (cd in seconds, reduced by cdr):
//   'area'  — circle around the player (follow) or at the aim point (at: 'aim', maxDist);
//             ticks over duration; optional freeze (s)
//   'proj'  — like the basic projectile;  'fan' — `count` projectiles over `spread` degrees
//   'chain' — instant: first enemy near the aim point within range, then jumps to `count` total
//   'dash'  — player dashes `distance` along the aim, hurting each enemy passed once
//   'buff'  — dmgTaken multiplier for `duration`
export const CLASSES = {
  warrior: {
    id: 'warrior', name: 'Warrior', desc: 'Tebal darah, tebasan jarak dekat.',
    stats: { maxHp: 140, atk: 14, def: 2, crit: 5, moveSpd: 105 },
    growth: { maxHp: 12, atk: 1.4 },
    attack: { kind: 'arc', fx: 'slash', interval: 0.55, mult: 1, r: 46, arc: 100 },
    skills: [
      { id: 'spin', name: 'Putaran Pedang', kind: 'area', cd: 8, r: 70, ticks: 4, duration: 1, mult: 1.5, follow: true },
      { id: 'shout', name: 'Teriakan Baja', kind: 'buff', cd: 14, duration: 4, dmgTaken: 0.5 },
    ],
  },
  archer: {
    id: 'archer', name: 'Archer', desc: 'Panah jarak jauh, lincah.',
    stats: { maxHp: 95, atk: 11, def: 0, crit: 8, moveSpd: 115 },
    growth: { maxHp: 8, atk: 1.2 },
    attack: { kind: 'proj', fx: 'arrow', interval: 0.45, mult: 1, speed: 380, range: 450, r: 4, pierce: 0 },
    skills: [
      { id: 'rain', name: 'Hujan Panah', kind: 'area', at: 'aim', maxDist: 320, cd: 9, r: 60, ticks: 5, duration: 1.5, mult: 0.8 },
      { id: 'pierce', name: 'Tembakan Tembus', kind: 'proj', cd: 7, speed: 520, range: 600, r: 10, mult: 3, pierce: Infinity },
    ],
  },
  mage: {
    id: 'mage', name: 'Mage', desc: 'Sihir area yang sakit, tapi rapuh.',
    stats: { maxHp: 85, atk: 16, def: 0, crit: 5, moveSpd: 100 },
    growth: { maxHp: 7, atk: 1.6 },
    attack: { kind: 'proj', fx: 'fireball', interval: 0.8, mult: 1, speed: 260, range: 420, r: 6, pierce: 0, explode: { r: 36 } },
    skills: [
      { id: 'nova', name: 'Nova Es', kind: 'area', cd: 10, r: 90, mult: 1.2, freeze: 1.5, duration: 0.4 },
      { id: 'chain', name: 'Petir Berantai', kind: 'chain', cd: 7, count: 5, mult: 1.8, range: 420, jump: 180 },
    ],
  },
  assassin: {
    id: 'assassin', name: 'Assassin', desc: 'Cepat, kritis tinggi, tusukan beruntun.',
    stats: { maxHp: 90, atk: 9, def: 0, crit: 20, moveSpd: 125 },
    growth: { maxHp: 8, atk: 1.0 },
    attack: { kind: 'arc', fx: 'stab', interval: 0.3, mult: 1, r: 34, arc: 50 },
    skills: [
      { id: 'shadow', name: 'Langkah Bayangan', kind: 'dash', cd: 6, distance: 150, duration: 0.15, r: 20, mult: 2.5 },
      { id: 'fan', name: 'Kipas Belati', kind: 'fan', cd: 8, count: 7, spread: 60, speed: 420, range: 300, r: 4, mult: 0.9 },
    ],
  },
};
