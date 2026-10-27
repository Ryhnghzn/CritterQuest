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
//   'buff'  — for `duration`: dmgTaken multiplier and/or atk, atkSpd (fractions), crit, critDmg (added);
//             optional `blast` shockwave { r, mult, knock, freeze }
// knock on an area pushes enemies away from its centre (negative = pulls them in).
// Pool (spec §21): 6 skills per class, `unlock` = character level; two are worn on Q / E.
// look: visual (render/world.js drawHit) when it differs from the id; icon: button icon; desc: shown in the Skill tab.
export const CLASSES = {
  warrior: {
    id: 'warrior', name: 'Warrior', desc: 'Tebal darah, tebasan jarak dekat.',
    stats: { maxHp: 140, atk: 14, def: 2, crit: 5, moveSpd: 105 },
    growth: { maxHp: 12, atk: 1.4 },
    attack: { kind: 'arc', fx: 'slash', interval: 0.55, mult: 1, r: 46, arc: 100, energy: 7 },
    skills: [
      { id: 'spin', name: 'Putaran Pedang', unlock: 1, desc: 'Berputar menebas sekeliling 5×220%, menarik musuh.', kind: 'area', cost: 35, cd: 3, r: 95, ticks: 5, duration: 1, mult: 2.2, follow: true, knock: -140 },
      { id: 'shout', name: 'Teriakan Baja', unlock: 1, desc: 'Damage diterima −60% selama 5 detik + gelombang kejut 250%.', kind: 'buff', cost: 50, cd: 8, duration: 5, dmgTaken: 0.4, blast: { r: 115, mult: 2.5, knock: 320 } },
      { id: 'quake', name: 'Hantaman Bumi', unlock: 5, desc: 'Menghantam titik bidik: 450%, melempar & membekukan sesaat.', icon: 'pow', look: 'nova', kind: 'area', at: 'aim', maxDist: 160, cost: 45, cd: 5, r: 95, mult: 4.5, freeze: 0.8, knock: 220, duration: 0.3 },
      { id: 'charge', name: 'Terjang', unlock: 10, desc: 'Menerjang 220 px, 320% ke yang dilewati, kebal saat menerjang.', icon: 'spd', look: 'shadow', kind: 'dash', cost: 30, cd: 3, distance: 220, duration: 0.18, r: 30, mult: 3.2 },
      { id: 'axe', name: 'Lempar Kapak', unlock: 15, desc: 'Kapak menembus semua musuh di garis, 300%.', icon: 'pierce', look: 'pierce', kind: 'proj', cost: 30, cd: 2.5, speed: 420, range: 420, r: 12, mult: 3, pierce: Infinity },
      { id: 'warcry', name: 'Amarah Perang', unlock: 20, desc: 'ATK +35%, kecepatan serang +30% selama 6 detik.', icon: 'shout', kind: 'buff', cost: 55, cd: 12, duration: 6, dmgTaken: 1, atk: 0.35, atkSpd: 0.3 },
    ],
  },
  archer: {
    id: 'archer', name: 'Archer', desc: 'Panah jarak jauh, lincah.',
    stats: { maxHp: 95, atk: 11, def: 0, crit: 8, moveSpd: 115 },
    growth: { maxHp: 8, atk: 1.2 },
    attack: { kind: 'proj', fx: 'arrow', interval: 0.45, mult: 1, speed: 380, range: 450, r: 4, pierce: 0, energy: 8 },
    skills: [
      { id: 'rain', name: 'Hujan Panah', unlock: 1, desc: 'Hujan panah di titik bidik, 6×160%.', kind: 'area', at: 'aim', maxDist: 320, cost: 40, cd: 3, r: 85, ticks: 6, duration: 1.5, mult: 1.6 },
      { id: 'pierce', name: 'Tembakan Tembus', unlock: 1, desc: 'Panah besar menembus semua musuh, 600%.', kind: 'proj', cost: 35, cd: 2.5, speed: 560, range: 650, r: 14, mult: 6, pierce: Infinity },
      { id: 'volley', name: 'Panah Beruntun', unlock: 5, desc: '5 panah menyebar sempit, masing-masing 200%.', icon: 'fan', look: 'arrow', kind: 'fan', cost: 30, cd: 2.5, count: 5, spread: 24, speed: 520, range: 480, r: 5, mult: 2 },
      { id: 'leap', name: 'Lompatan Mundur', unlock: 10, desc: 'Melompat menjauh dari bidikan, meninggalkan ledakan es yang membekukan.', icon: 'gale', look: 'shadow', kind: 'dash', back: true, cost: 25, cd: 4, distance: 180, duration: 0.15, r: 0, mult: 0, blast: { r: 75, mult: 1.2, knock: 0, freeze: 1.2 } },
      { id: 'trap', name: 'Ladang Jebakan', unlock: 15, desc: 'Jebakan duri di titik bidik 4 detik: 8×90%, memperlambat.', icon: 'thorn', look: 'rain', kind: 'area', at: 'aim', maxDist: 300, cost: 40, cd: 6, r: 80, ticks: 8, duration: 4, mult: 0.9, freeze: 0.4 },
      { id: 'hawk', name: 'Mata Elang', unlock: 20, desc: 'Kritis +30%, kecepatan serang +25% selama 6 detik.', icon: 'hst', kind: 'buff', cost: 50, cd: 12, duration: 6, dmgTaken: 1, crit: 30, atkSpd: 0.25 },
    ],
  },
  mage: {
    id: 'mage', name: 'Mage', desc: 'Sihir area yang sakit, tapi rapuh.',
    stats: { maxHp: 85, atk: 16, def: 0, crit: 5, moveSpd: 100 },
    growth: { maxHp: 7, atk: 1.6 },
    attack: { kind: 'proj', fx: 'fireball', interval: 0.8, mult: 1, speed: 260, range: 420, r: 6, pierce: 0, explode: { r: 36 }, energy: 9 },
    skills: [
      { id: 'nova', name: 'Nova Es', unlock: 1, desc: 'Ledakan es di sekeliling: 300%, membekukan 2,2 detik, mendorong.', kind: 'area', cost: 45, cd: 4, r: 125, mult: 3, freeze: 2.2, duration: 0.4, knock: 160 },
      { id: 'chain', name: 'Petir Berantai', unlock: 1, desc: 'Petir melompat ke 8 musuh, 350%.', kind: 'chain', cost: 35, cd: 2.5, count: 8, mult: 3.5, range: 450, jump: 200 },
      { id: 'meteor', name: 'Meteor', unlock: 5, desc: 'Meteor jatuh di titik bidik: 600% area besar.', icon: 'ember', look: 'boom', kind: 'area', at: 'aim', maxDist: 340, cost: 55, cd: 6, r: 110, mult: 6, knock: 180, duration: 0.4 },
      { id: 'blink', name: 'Teleportasi', unlock: 10, desc: 'Berpindah seketika 230 px ke arah bidikan.', icon: 'zap', look: 'shadow', kind: 'dash', cost: 20, cd: 3, distance: 230, duration: 0.08, r: 0, mult: 0 },
      { id: 'inferno', name: 'Bola Api Raksasa', unlock: 15, desc: 'Bola api besar meledak 400% di area luas.', icon: 'ember', look: 'fireball', kind: 'proj', cost: 40, cd: 3, speed: 300, range: 480, r: 12, mult: 4, explode: { r: 85 } },
      { id: 'manashield', name: 'Perisai Mana', unlock: 20, desc: 'Damage diterima −55% dan ATK +20% selama 7 detik.', icon: 'bubble', kind: 'buff', cost: 50, cd: 14, duration: 7, dmgTaken: 0.45, atk: 0.2 },
    ],
  },
  assassin: {
    id: 'assassin', name: 'Assassin', desc: 'Cepat, kritis tinggi, tusukan beruntun.',
    stats: { maxHp: 90, atk: 9, def: 0, crit: 20, moveSpd: 125 },
    growth: { maxHp: 8, atk: 1.0 },
    attack: { kind: 'arc', fx: 'stab', interval: 0.3, mult: 1, r: 34, arc: 50, energy: 4 },
    skills: [
      { id: 'shadow', name: 'Langkah Bayangan', unlock: 1, desc: 'Melesat 180 px, 500% ke yang dilewati, kebal.', kind: 'dash', cost: 30, cd: 2, distance: 180, duration: 0.16, r: 26, mult: 5 },
      { id: 'fan', name: 'Kipas Belati', unlock: 1, desc: '11 belati menyebar, masing-masing 180%.', kind: 'fan', cost: 40, cd: 3, count: 11, spread: 80, speed: 440, range: 320, r: 5, mult: 1.8 },
      { id: 'poison', name: 'Kabut Racun', unlock: 5, desc: 'Kabut racun di titik bidik 3 detik: 8×90%.', icon: 'thorn', look: 'rain', kind: 'area', at: 'aim', maxDist: 220, cost: 35, cd: 5, r: 75, ticks: 8, duration: 3, mult: 0.9 },
      { id: 'smoke', name: 'Bom Asap', unlock: 10, desc: 'Asap membekukan musuh sekitar 1,2 detik; damage diterima −40% selama 4 detik.', icon: 'bubble', kind: 'buff', cost: 40, cd: 8, duration: 4, dmgTaken: 0.6, blast: { r: 100, mult: 1.5, knock: 0, freeze: 1.2 } },
      { id: 'shuriken', name: 'Shuriken', unlock: 15, desc: '3 shuriken menembus 2 musuh, masing-masing 300%.', icon: 'fan', look: 'dagger', kind: 'fan', cost: 30, cd: 2.5, count: 3, spread: 14, speed: 500, range: 420, r: 6, mult: 3, pierce: 2 },
      { id: 'assassinate', name: 'Naluri Pembunuh', unlock: 20, desc: 'Kritis +40% dan damage kritis +60% selama 6 detik.', icon: 'pow', kind: 'buff', cost: 50, cd: 12, duration: 6, dmgTaken: 1, crit: 40, critDmg: 0.6 },
    ],
  },
};
