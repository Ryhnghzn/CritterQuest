// Character classes (spec §4.2). Stats every class starts with unless overridden.
export const CLASS_BASE = { atkSpd: 1, critDmg: 1.5, cdr: 0, magnet: 70 };

// Basic attack (held: click / attack button). interval is divided by atkSpd.
//   kind 'arc':  instant hit in a cone around the player — r (px), arc (degrees)
//   kind 'proj': projectile — speed, range (px), r, pierce (extra enemies), explode { r }
// fx picks the visual in render/world.js; mult scales atk (spec §5.2).
export const CLASSES = {
  warrior: {
    id: 'warrior', name: 'Warrior', desc: 'Tebal darah, tebasan jarak dekat.',
    stats: { maxHp: 140, atk: 14, def: 2, crit: 5, moveSpd: 105 },
    growth: { maxHp: 12, atk: 1.4 },
    attack: { kind: 'arc', fx: 'slash', interval: 0.55, mult: 1, r: 46, arc: 100 },
  },
  archer: {
    id: 'archer', name: 'Archer', desc: 'Panah jarak jauh, lincah.',
    stats: { maxHp: 95, atk: 11, def: 0, crit: 8, moveSpd: 115 },
    growth: { maxHp: 8, atk: 1.2 },
    attack: { kind: 'proj', fx: 'arrow', interval: 0.45, mult: 1, speed: 380, range: 450, r: 4, pierce: 0 },
  },
  mage: {
    id: 'mage', name: 'Mage', desc: 'Sihir area yang sakit, tapi rapuh.',
    stats: { maxHp: 85, atk: 16, def: 0, crit: 5, moveSpd: 100 },
    growth: { maxHp: 7, atk: 1.6 },
    attack: { kind: 'proj', fx: 'fireball', interval: 0.8, mult: 1, speed: 260, range: 420, r: 6, pierce: 0, explode: { r: 36 } },
  },
  assassin: {
    id: 'assassin', name: 'Assassin', desc: 'Cepat, kritis tinggi, tusukan beruntun.',
    stats: { maxHp: 90, atk: 9, def: 0, crit: 20, moveSpd: 125 },
    growth: { maxHp: 8, atk: 1.0 },
    attack: { kind: 'arc', fx: 'stab', interval: 0.3, mult: 1, r: 34, arc: 50 },
  },
};
