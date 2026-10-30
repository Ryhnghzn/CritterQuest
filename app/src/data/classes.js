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
//   'proj'  — like the basic projectile; optional delay (s), boomerang + pull, trail { every, r, life, ticks, mult };
//             `split { at, count, spread }` (on proj / fan) bursts each arrow into `count` more;
//             `explode { r, shards { count, speed, range, r, mult } }`;  'fan' — `count` projectiles over `spread` degrees
//             (360 = a full circle; `ring` px from the player, floating `delay` s first, then `curve` rad/s turning)
//   'line'  — `count` area pillars along the aim, `step` px apart, each `gap` s after the last, standing `life` s (spec §31.7)
//   'storm' — first enemy near the aim point within range, then jumps (`jump` px) to `count` enemies in total;
//             each gets a lightning strike (area `r`), `gap` s after the one before
//   'orbit' — a blade circling the player (`radius`, `spin` rad/s) for `duration`, hitting each enemy at most once per
//             `every` s, then thrown at the aim point as `throw` (a projectile)
//   'dash'  — player dashes `distance` along the aim, hurting each enemy passed once
//   'buff'  — for `duration`: dmgTaken multiplier and/or atk, atkSpd (fractions), crit, critDmg (added);
//             optional `blast` shockwave { r, mult, knock, freeze }
// knock on an area pushes enemies away from its centre (negative = pulls them in).
// Pool (spec §21): 6 skills per class, `unlock` = character level; up to four are worn on keys 1–4.
// ult: the class ultimate on key 5, unlocked at LV 25, fired from its own charge bar (spec §22).
// look: visual (render/world.js drawHit) when it differs from the id; icon: button icon; desc: shown in the Skill tab.
export const CLASSES = {
  warrior: {
    id: 'warrior', name: 'Warrior', desc: 'Tebal darah, tebasan jarak dekat.',
    stats: { maxHp: 140, atk: 14, def: 2, crit: 5, moveSpd: 112 },
    growth: { maxHp: 12, atk: 1.4 },
    attack: { kind: 'arc', fx: 'slash', interval: 0.55, mult: 1, r: 46, arc: 100, energy: 7 },
    // Signature mechanic (spec §31.2), logic in run/traits.js. Ranges [at 0, at max] scale with the bar.
    trait: {
      id: 'rage', max: 100, color: '#e0526a',
      perHit: 3,            // per enemy hit by a basic attack
      perHurtPct: 1.5,      // per 1% of max HP lost
      idleAfter: 3, decay: 12,
      arcR: [46, 72], arcDeg: [100, 160], lifesteal: 0.04, dmgTaken: 0.2, // scale 0 → max
      frenzy: { duration: 6, atkSpd: 0.4, wave: { r: 60, mult: 0.5, knock: 140 } },
    },
    ult: { id: 'bladestorm', name: 'Badai Pedang', unlock: 25, icon: 'spin', look: 'spin', desc: 'Berputar liar 2,5 detik: 10×300% di area besar, menarik musuh, damage diterima −50%.', kind: 'area', follow: true, r: 150, ticks: 10, duration: 2.5, mult: 3, knock: -200, dmgTaken: 0.5 },
    skills: [
      { id: 'spin', name: 'Putaran Pedang', unlock: 1, desc: 'Berputar menebas sekeliling 5×220%, menarik musuh.', kind: 'area', cost: 35, cd: 3, r: 95, ticks: 5, duration: 1, mult: 2.2, follow: true, knock: -140 },
      { id: 'shout', name: 'Teriakan Baja', unlock: 1, desc: 'Damage diterima −60% selama 5 detik + gelombang kejut 250%.', kind: 'buff', cost: 50, cd: 8, duration: 5, dmgTaken: 0.4, blast: { r: 115, mult: 2.5, knock: 320 } },
      { id: 'quake', name: 'Retakan Bumi', unlock: 5, desc: 'Retakan menjalar ke arah bidik: 5 pilar batu-api meletus berurutan, masing-masing 160%, melempar & membekukan sesaat.', icon: 'pow', kind: 'line', cost: 45, cd: 5, count: 5, step: 52, gap: 0.08, life: 0.45, r: 45, mult: 1.6, freeze: 0.3, knock: 160 },
      { id: 'charge', name: 'Terjang', unlock: 1, desc: 'Menerjang 220 px, 320% ke yang dilewati, kebal saat menerjang. Membunuh = siap lagi.', icon: 'spd', look: 'shadow', kind: 'dash', cost: 30, cd: 3, distance: 220, duration: 0.18, r: 30, mult: 3.2, resetOnKill: true },
      { id: 'axe', name: 'Kapak Bumerang', unlock: 15, desc: 'Kapak besar berputar maju lalu kembali ke pemain, 2×160%; menyeret musuh yang dilewati.', icon: 'pierce', kind: 'proj', cost: 30, cd: 2.5, boomerang: true, pull: true, speed: 420, range: 360, r: 18, mult: 1.6, pierce: Infinity },
      { id: 'warcry', name: 'Amarah Perang', unlock: 20, desc: 'ATK +35%, kecepatan serang +30% selama 6 detik.', icon: 'shout', kind: 'buff', cost: 55, cd: 12, duration: 6, dmgTaken: 1, atk: 0.35, atkSpd: 0.3 },
    ],
  },
  archer: {
    id: 'archer', name: 'Archer', desc: 'Panah jarak jauh, lincah.',
    stats: { maxHp: 95, atk: 11, def: 0, crit: 8, moveSpd: 115 },
    growth: { maxHp: 8, atk: 1.2 },
    attack: { kind: 'proj', fx: 'arrow', interval: 0.45, mult: 1, speed: 380, range: 450, r: 4, pierce: 0, energy: 8 },
    // Bidik (spec §31.4): fills while standing still and attacking; a full bar makes the next arrow a big piercing crit.
    trait: { id: 'focus', max: 100, color: '#7be08a', rate: 60, shot: { pierce: 3, size: 2 } },
    ult: { id: 'starfall', name: 'Hujan Bintang', unlock: 25, icon: 'rain', look: 'rain', desc: 'Hujan panah bintang 3 detik di area sangat luas: 12×250%, memperlambat.', kind: 'area', at: 'aim', maxDist: 350, r: 200, ticks: 12, duration: 3, mult: 2.5, freeze: 0.3 },
    skills: [
      { id: 'rain', name: 'Hujan Panah', unlock: 1, desc: 'Hujan panah di titik bidik, 6×160%.', kind: 'area', at: 'aim', maxDist: 320, cost: 40, cd: 3, r: 85, ticks: 6, duration: 1.5, mult: 1.6 },
      { id: 'pierce', name: 'Panah Naga', unlock: 1, desc: 'Tahan napas sebentar, lalu naga cahaya menembus semua musuh, 500%, dan meninggalkan jejak terbakar 2 detik.', kind: 'proj', cost: 35, cd: 2.5, delay: 0.3, speed: 560, range: 650, r: 16, mult: 5, pierce: Infinity, trail: { every: 0.1, r: 24, life: 2, ticks: 4, mult: 0.4 } },
      { id: 'volley', name: 'Panah Pecah', unlock: 5, desc: '5 panah; setelah melaju sejauh 160 px tiap panah pecah jadi 3 (15 total), masing-masing 160%.', icon: 'fan', look: 'arrow', kind: 'fan', cost: 30, cd: 2.5, count: 5, spread: 20, speed: 520, range: 480, r: 5, mult: 1.6, split: { at: 160, count: 3, spread: 30 } },
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
    // Panas (spec §31.3): skills add cost × perCost; bonus climbs to bonusAt; reaching max overheats (skills locked, slowed).
    trait: { id: 'heat', max: 100, color: '#ff8a3d', perCost: 0.6, decay: 15, bonusAt: 80, skillDmg: 0.3, overheat: { duration: 2.5, slow: 0.3 } },
    ult: { id: 'meteorstorm', name: 'Hujan Meteor', unlock: 25, icon: 'ember', look: 'boom', desc: 'Meteor berjatuhan 2,4 detik: 6×600% di area luas, mendorong.', kind: 'area', at: 'aim', maxDist: 340, r: 220, ticks: 6, duration: 2.4, mult: 6, knock: 120 },
    skills: [
      { id: 'nova', name: 'Nova Es', unlock: 1, desc: 'Ledakan es di sekeliling: 300%, membekukan 1,5 detik, mendorong.', kind: 'area', cost: 45, cd: 4, r: 125, mult: 3, freeze: 1.5, duration: 0.4, knock: 160 },
      { id: 'chain', name: 'Badai Petir', unlock: 1, desc: 'Awan petir menyambar 8 musuh berurutan, masing-masing 350%.', kind: 'storm', cost: 35, cd: 2.5, count: 8, gap: 0.1, r: 36, mult: 3.5, range: 450, jump: 200 },
      { id: 'meteor', name: 'Meteor', unlock: 5, desc: 'Meteor jatuh di titik bidik: 600% area besar.', icon: 'ember', look: 'boom', kind: 'area', at: 'aim', maxDist: 340, cost: 55, cd: 6, r: 110, mult: 6, knock: 180, duration: 0.4 },
      { id: 'blink', name: 'Teleportasi', unlock: 10, desc: 'Berpindah seketika 230 px ke arah bidikan.', icon: 'zap', look: 'shadow', kind: 'dash', cost: 20, cd: 3, distance: 230, duration: 0.08, r: 0, mult: 0 },
      { id: 'inferno', name: 'Matahari Kecil', unlock: 15, desc: 'Bola api raksasa melaju pelan membakar jalurnya; meledak 300% di area luas dan menebar 6 serpihan api 120%.', icon: 'ember', look: 'fireball', kind: 'proj', cost: 40, cd: 3, speed: 200, range: 480, r: 14, mult: 3, explode: { r: 85, shards: { count: 6, speed: 300, range: 160, r: 8, mult: 1.2 } }, trail: { every: 0.12, r: 26, life: 1.5, ticks: 3, mult: 0.2 } },
      { id: 'manashield', name: 'Perisai Mana', unlock: 20, desc: 'Damage diterima −55% dan ATK +20% selama 7 detik.', icon: 'bubble', kind: 'buff', cost: 50, cd: 14, duration: 7, dmgTaken: 0.45, atk: 0.2 },
    ],
  },
  assassin: {
    id: 'assassin', name: 'Assassin', desc: 'Cepat, kritis tinggi, tusukan beruntun.',
    stats: { maxHp: 90, atk: 9, def: 0, crit: 20, moveSpd: 125 },
    growth: { maxHp: 8, atk: 1.0 },
    attack: { kind: 'arc', fx: 'stab', interval: 0.3, mult: 1, r: 34, arc: 50, energy: 4 },
    // Kombo (spec §31.5): points from basic stabs; any skill spends them for +perPoint each; at max it executes weak normal enemies.
    trait: { id: 'combo', max: 5, color: '#b07cff', hitsPer: 3, idleAfter: 4, perPoint: 0.25, executeBelow: 0.3 },
    ult: { id: 'thousandshadows', name: 'Tarian Seribu Bayangan', unlock: 25, icon: 'shadow', look: 'spin', desc: 'Kebal 2 detik sambil menebas semua di sekitar: 12×260%.', kind: 'area', follow: true, r: 130, ticks: 12, duration: 2, mult: 2.6, invuln: 2 },
    skills: [
      { id: 'shadow', name: 'Langkah Bayangan', unlock: 1, desc: 'Melesat 180 px, 500% ke yang dilewati, kebal.', kind: 'dash', cost: 30, cd: 2, distance: 180, duration: 0.16, r: 26, mult: 5 },
      { id: 'fan', name: 'Lingkaran Belati', unlock: 1, desc: '11 belati melayang melingkar di sekitarmu, lalu melesat berputar ke luar, masing-masing 330%.', kind: 'fan', cost: 40, cd: 3, count: 11, spread: 360, ring: 40, delay: 0.4, curve: 2.2, speed: 400, range: 320, r: 6, mult: 3.3 },
      { id: 'poison', name: 'Kabut Racun', unlock: 5, desc: 'Kabut racun di titik bidik 3 detik: 8×90%.', icon: 'thorn', look: 'rain', kind: 'area', at: 'aim', maxDist: 220, cost: 35, cd: 5, r: 75, ticks: 8, duration: 3, mult: 0.9 },
      { id: 'smoke', name: 'Bom Asap', unlock: 10, desc: 'Asap membekukan musuh sekitar 1,2 detik; damage diterima −40% selama 4 detik.', icon: 'bubble', kind: 'buff', cost: 40, cd: 8, duration: 4, dmgTaken: 0.6, blast: { r: 100, mult: 1.5, knock: 0, freeze: 1.2 } },
      { id: 'shuriken', name: 'Shuriken Raksasa', unlock: 15, desc: 'Shuriken raksasa mengitarimu 3 detik, menebas 130% tiap 0,25 detik, lalu dilempar ke bidikan menembus semua musuh 450%.', icon: 'fan', look: 'dagger', kind: 'orbit', cost: 30, cd: 2.5, radius: 90, spin: 7, every: 0.25, duration: 3, r: 28, mult: 1.3, throw: { speed: 520, range: 420, r: 16, mult: 4.5, pierce: Infinity } },
      { id: 'assassinate', name: 'Naluri Pembunuh', unlock: 20, desc: 'Kritis +40% dan damage kritis +60% selama 6 detik.', icon: 'pow', kind: 'buff', cost: 50, cd: 12, duration: 6, dmgTaken: 1, crit: 40, critDmg: 0.6 },
    ],
  },
};
