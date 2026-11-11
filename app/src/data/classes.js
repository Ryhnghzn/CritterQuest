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
// lv3 / lv5: patches applied from skill level 3 / 5 (spec §43.4, run/skilllevel.js); the extra keys they add are
// read in run/skills.js & run/hits.js — after (a lingering area once it ends), finale (a big blast at the end),
// trail on a dash, twin (a second throw), pause (a boomerang waits at the far end), moveSpd / rage (buffs),
// count + spread on a proj, charges (cast twice in a row), focusFill, pierceBasic, shatter, explode.twice,
// endBlast, echo, returns, vuln, invuln, killExtend.
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
    fokus: { id: 'skyfall', name: 'Hantaman Langit', unlock: 25, icon: 'pow', look: 'quake', desc: 'Melompat ke titik bidik dan menghantam dalam 0,6 detik: 1×5400% area 70, pingsan 2 detik. Murka penuh: +30%.', kind: 'focus', move: 'leap', focus: true, at: 'aim', maxDist: 320, delay: 0.6, r: 70, mult: 54, freeze: 2, rageBonus: 0.3 },
    skills: [
      { id: 'spin', name: 'Putaran Pedang', unlock: 1, desc: 'Berputar menebas sekeliling 5×220%, menarik musuh.', kind: 'area', cost: 35, cd: 3, r: 95, ticks: 5, duration: 1, mult: 2.2, follow: true, knock: -140, up: ['+2 tebasan', 'Pusaran 2 detik menarik musuh, 40% per tebasan'], lv3: { ticks: 7, duration: 1.4 }, lv5: { after: { r: 95, mult: 0.4, ticks: 8, duration: 2, knock: -140, follow: true } } },
      { id: 'shout', name: 'Teriakan Baja', unlock: 1, desc: 'Damage diterima −60% selama 5 detik + gelombang kejut 250%.', kind: 'buff', cost: 50, cd: 8, duration: 5, dmgTaken: 0.4, blast: { r: 115, mult: 2.5, knock: 320 }, up: ['Durasi +2 detik', 'Gelombang kejut membekukan 0,8 detik'], lv3: { duration: 7 }, lv5: { blast: { freeze: 0.8 } } },
      { id: 'quake', name: 'Retakan Bumi', unlock: 5, desc: 'Retakan menjalar ke arah bidik: 5 pilar batu-api meletus berurutan, masing-masing 160%, melempar & membekukan sesaat.', icon: 'pow', kind: 'line', cost: 45, cd: 5, count: 5, step: 52, gap: 0.08, life: 0.45, r: 45, mult: 1.6, freeze: 0.3, knock: 160, up: ['+2 pilar', 'Pilar terakhir meledak besar (area 90, 300%)'], lv3: { count: 7 }, lv5: { finale: { r: 90, mult: 3 } } },
      { id: 'charge', name: 'Terjang', unlock: 1, desc: 'Menerjang 220 px, 320% ke yang dilewati, kebal saat menerjang. Membunuh = siap lagi.', icon: 'spd', look: 'shadow', kind: 'dash', cost: 30, cd: 3, distance: 220, duration: 0.18, r: 30, mult: 3.2, resetOnKill: true, up: ['Jarak +60', 'Jejak api 1,5 detik, 30% tiap 0,25 detik'], lv3: { distance: 280 }, lv5: { trail: { every: 0.04, r: 26, life: 1.5, ticks: 6, mult: 0.3 } } },
      { id: 'axe', name: 'Kapak Bumerang', unlock: 15, desc: 'Kapak besar berputar maju lalu kembali ke pemain, 2×160%; menyeret musuh yang dilewati.', icon: 'pierce', kind: 'proj', cost: 30, cd: 2.5, boomerang: true, pull: true, speed: 420, range: 360, r: 18, mult: 1.6, pierce: Infinity, up: ['Kapak kedua menyusul', 'Kapak berputar di ujung 0,6 detik sebelum kembali'], lv3: { twin: 0.2 }, lv5: { pause: 0.6 } },
      { id: 'warcry', name: 'Amarah Perang', unlock: 20, desc: 'ATK +35%, kecepatan serang +30% selama 6 detik.', icon: 'shout', kind: 'buff', cost: 55, cd: 12, duration: 6, dmgTaken: 1, atk: 0.35, atkSpd: 0.3, up: ['Gerak +20%', 'Murka langsung +40'], lv3: { moveSpd: 0.2 }, lv5: { rage: 40 } },
      // tempo skills (spec §43.4, run/tempo.js): hold-to-charge (released at full = pierces, knocks far, breaks a Berlapis shield); a parry window
      { id: 'greatslash', name: 'Tebasan Raksasa', unlock: 8, desc: 'Tahan hingga 1,2 detik lalu lepas: tebasan depan, jangkauan 70→160, 200%→700%. Penuh: menembus, mendorong jauh, memecah perisai Berlapis.', icon: 'pow', look: 'slash', kind: 'charge', cost: 40, cd: 4, full: 1.2, r: 70, rMax: 160, arc: 110, mult: 2, peak: 3.5, knock: 140, fullKnock: 420, up: ['Jangkauan maks +30', 'Penuh dalam 0,8 detik'], lv3: { rMax: 190 }, lv5: { full: 0.8 } },
      { id: 'steelparry', name: 'Tangkis Baja', unlock: 12, desc: 'Jendela tangkis 0,5 detik. Berhasil: serangan batal, gelombang 600% area 90, Murka +30.', icon: 'shout', kind: 'parry', cost: 20, cd: 4, window: 0.5, r: 90, mult: 6, knock: 260, rage: 30, up: ['Jendela 0,7 detik', 'Peluru yang ditangkis memantul ke penembaknya'], lv3: { window: 0.7 }, lv5: { reflect: true } },
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
    fokus: { id: 'skypierce', name: 'Panah Penembus Langit', unlock: 25, icon: 'pierce', look: 'pierce', desc: 'Membidik 0,5 detik lalu sinar lurus panjang selebar 40: 5400% ke semua di garis. Bidik penuh: pasti kritikal.', kind: 'focus', move: 'beam', focus: true, delay: 0.5, len: 640, w: 40, mult: 54 },
    skills: [
      { id: 'rain', name: 'Hujan Panah', unlock: 1, desc: 'Hujan panah di titik bidik, 6×160%.', kind: 'area', at: 'aim', maxDist: 320, cost: 40, cd: 3, r: 85, ticks: 6, duration: 1.5, mult: 1.6, up: ['Area +25%', 'Memperlambat 40%'], lv3: { r: 106 }, lv5: { freeze: 0.4 } },
      { id: 'pierce', name: 'Panah Naga', unlock: 1, desc: 'Tahan napas sebentar, lalu naga cahaya menembus semua musuh, 500%, dan meninggalkan jejak terbakar 2 detik.', kind: 'proj', cost: 35, cd: 2.5, delay: 0.3, speed: 560, range: 650, r: 16, mult: 5, pierce: Infinity, trail: { every: 0.1, r: 24, life: 2, ticks: 4, mult: 0.4 }, up: ['Jejak terbakar +1 detik', 'Dua naga (±10°)'], lv3: { trail: { life: 3 } }, lv5: { count: 2, spread: 20 } },
      { id: 'volley', name: 'Panah Pecah', unlock: 5, desc: '5 panah; setelah melaju sejauh 160 px tiap panah pecah jadi 3 (15 total), masing-masing 160%.', icon: 'fan', look: 'arrow', kind: 'fan', cost: 30, cd: 2.5, count: 5, spread: 20, speed: 520, range: 480, r: 5, mult: 1.6, split: { at: 160, count: 3, spread: 30 }, up: ['Pecah jadi 4', 'Pecahan menembus satu musuh lagi'], lv3: { split: { count: 4 } }, lv5: { split: { pierce: 1 } } },
      { id: 'leap', name: 'Lompatan Mundur', unlock: 10, desc: 'Melompat menjauh dari bidikan, meninggalkan ledakan es yang membekukan.', icon: 'gale', look: 'shadow', kind: 'dash', back: true, cost: 25, cd: 4, distance: 180, duration: 0.15, r: 0, mult: 0, blast: { r: 75, mult: 1.2, knock: 0, freeze: 1.2 }, up: ['Bisa 2× berturut', 'Bidik langsung penuh setelah melompat'], lv3: { charges: 2 }, lv5: { focusFill: true } },
      { id: 'trap', name: 'Ladang Jebakan', unlock: 15, desc: 'Jebakan duri di titik bidik 4 detik: 8×90%, memperlambat.', icon: 'thorn', look: 'rain', kind: 'area', at: 'aim', maxDist: 300, cost: 40, cd: 6, r: 80, ticks: 8, duration: 4, mult: 0.9, freeze: 0.4, up: ['Durasi +2 detik', 'Meledak di akhir 300%'], lv3: { duration: 6, ticks: 12 }, lv5: { finale: { r: 80, mult: 3 } } },
      { id: 'hawk', name: 'Mata Elang', unlock: 20, desc: 'Kritis +30%, kecepatan serang +25% selama 6 detik.', icon: 'hst', kind: 'buff', cost: 50, cd: 12, duration: 6, dmgTaken: 1, crit: 30, atkSpd: 0.25, up: ['Damage kritis +20%', 'Panah biasa menembus 1 musuh selama buff'], lv3: { critDmg: 0.2 }, lv5: { pierceBasic: 1 } },
      // tempo skills (spec §43.4): a channelled beam; an arrow tower at the aim point (run/summons.js)
      { id: 'beamshot', name: 'Sinar Panah', unlock: 8, desc: 'Tahan hingga 2 detik: sinar lurus 8× per detik, 60% tiap kali; gerak −60%.', icon: 'pierce', look: 'pierce', kind: 'channel', shape: 'beam', cost: 15, drain: 20, cd: 5, max: 2, rate: 8, len: 420, w: 24, mult: 0.6, slow: 0.6, up: ['Maksimal 3 detik', 'Lebar sinar ×2 di detik terakhir'], lv3: { max: 3 }, lv5: { wideLast: 2 } },
      { id: 'tower', name: 'Menara Panah', unlock: 12, desc: 'Menara di titik bidik selama 8 detik, menembak musuh terdekat tiap 0,4 detik, 120%; paling banyak 2.', icon: 'fan', look: 'arrow', kind: 'turret', at: 'aim', maxDist: 300, cost: 35, cd: 6, life: 8, every: 0.4, range: 380, speed: 520, r: 5, mult: 1.2, pierce: 0, maxN: 2, up: ['Tembakan menembus 1', 'Paling banyak 3 menara'], lv3: { pierce: 1 }, lv5: { maxN: 3 } },
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
    fokus: { id: 'sunfall', name: 'Matahari Runtuh', unlock: 25, icon: 'ember', look: 'boom', desc: 'Bola di titik bidik menyedot musuh 0,8 detik lalu meledak 1×6500% area 60.', kind: 'focus', move: 'implode', focus: true, at: 'aim', maxDist: 340, delay: 0.8, r: 60, pullR: 190, pull: 280, mult: 65 },
    skills: [
      { id: 'nova', name: 'Nova Es', unlock: 1, desc: 'Ledakan es di sekeliling: 300%, membekukan 1,5 detik, mendorong.', kind: 'area', cost: 45, cd: 4, r: 125, mult: 3, freeze: 1.5, duration: 0.4, knock: 160, up: ['Beku +0,5 detik', 'Musuh beku yang mati pecah jadi 4 serpihan es 100%'], lv3: { freeze: 2 }, lv5: { shatter: { count: 4, mult: 1, speed: 300, range: 160, r: 7, time: 3 } } },
      { id: 'chain', name: 'Badai Petir', unlock: 1, desc: 'Awan petir menyambar 8 musuh berurutan, masing-masing 350%.', kind: 'storm', cost: 35, cd: 2.5, count: 8, gap: 0.1, r: 36, mult: 3.5, range: 450, jump: 200, up: ['+3 sambaran', 'Tiap sambaran menyetrum area 50'], lv3: { count: 11 }, lv5: { r: 50 } },
      { id: 'meteor', name: 'Meteor', unlock: 5, desc: 'Meteor jatuh di titik bidik: 600% area besar.', icon: 'ember', look: 'boom', kind: 'area', at: 'aim', maxDist: 340, cost: 55, cd: 6, r: 110, mult: 6, knock: 180, duration: 0.4, up: ['Area +25%', 'Lava 2 detik, 40% tiap 0,5 detik'], lv3: { r: 137 }, lv5: { after: { r: 110, mult: 0.4, ticks: 4, duration: 2 } } },
      { id: 'blink', name: 'Teleportasi', unlock: 10, desc: 'Berpindah seketika 230 px ke arah bidikan.', icon: 'zap', look: 'shadow', kind: 'dash', cost: 20, cd: 3, distance: 230, duration: 0.08, r: 0, mult: 0, up: ['Bisa 2× berturut', 'Ledakan es di titik awal (150%, beku 0,8 detik)'], lv3: { charges: 2 }, lv5: { blast: { r: 75, mult: 1.5, knock: 0, freeze: 0.8 } } },
      { id: 'inferno', name: 'Matahari Kecil', unlock: 15, desc: 'Bola api raksasa melaju pelan membakar jalurnya; meledak 300% di area luas dan menebar 6 serpihan api 120%.', icon: 'ember', look: 'fireball', kind: 'proj', cost: 40, cd: 3, speed: 200, range: 480, r: 14, mult: 3, explode: { r: 85, shards: { count: 6, speed: 300, range: 160, r: 8, mult: 1.2 } }, trail: { every: 0.12, r: 26, life: 1.5, ticks: 3, mult: 0.2 }, up: ['+3 serpihan', 'Meledak dua kali'], lv3: { explode: { shards: { count: 9 } } }, lv5: { explode: { twice: 0.4 } } },
      { id: 'manashield', name: 'Perisai Mana', unlock: 20, desc: 'Damage diterima −55% dan ATK +20% selama 7 detik.', icon: 'bubble', kind: 'buff', cost: 50, cd: 14, duration: 7, dmgTaken: 0.45, atk: 0.2, up: ['Durasi +2 detik', 'Meledak 300% area 100 saat habis'], lv3: { duration: 9 }, lv5: { endBlast: { r: 100, mult: 3 } } },
      // tempo skill: hold to channel a cone of fire (Panas +20/s); level 5 sets foes ablaze
      { id: 'flamethrower', name: 'Semburan Api', unlock: 12, desc: 'Tahan hingga 2 detik: kerucut api jangkauan 120, 10× per detik, 50% tiap kali; Panas +20/detik.', icon: 'ember', look: 'fireball', kind: 'channel', shape: 'cone', cost: 15, drain: 15, cd: 4, max: 2, rate: 10, r: 120, arc: 50, mult: 0.5, heat: 20, slow: 0.3, up: ['Kerucut +20°', 'Membakar 2 detik, 20% tiap 0,5 detik'], lv3: { arc: 70 }, lv5: { burn: { time: 2, every: 0.5, mult: 0.2 } } },
      // tempo skill: a delayed rune that grows with every hit you land on the foes inside it
      { id: 'timebomb', name: 'Bom Waktu', unlock: 8, desc: 'Rune di titik bidik meledak setelah 2 detik, 800% area 90; tiap pukulanmu ke musuh di dalamnya +10% (maks +100%).', icon: 'ember', look: 'boom', kind: 'rune', at: 'aim', maxDist: 300, cost: 45, cd: 6, fuse: 2, r: 90, mult: 8, perHit: 0.1, maxBonus: 1, up: ['Meledak setelah 1,5 detik', 'Rune kedua kecil (400%) 1 detik kemudian'], lv3: { fuse: 1.5 }, lv5: { second: { delay: 1, r: 60, mult: 4 } } },
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
    fokus: { id: 'execution', name: 'Eksekusi Bayangan', unlock: 25, icon: 'shadow', look: 'shadow', desc: 'Teleport ke belakang musuh yang dibidik, 3 tebasan dalam 0,4 detik total 5600%, kebal; musuh biasa ber-HP < 30% mati seketika; +10% per poin Kombo.', kind: 'focus', move: 'behind', focus: true, range: 320, delay: 0.4, hits: 3, r: 55, mult: 56, execute: 0.3, perCombo: 0.1 },
    skills: [
      { id: 'shadow', name: 'Langkah Bayangan', unlock: 1, desc: 'Melesat 180 px, 500% ke yang dilewati, kebal.', kind: 'dash', cost: 30, cd: 2, distance: 180, duration: 0.16, r: 26, mult: 5, up: ['Bisa 2× berturut', 'Bayangan menebas lagi 0,3 detik kemudian'], lv3: { charges: 2 }, lv5: { echo: 0.3 } },
      { id: 'fan', name: 'Lingkaran Belati', unlock: 1, desc: '11 belati melayang melingkar di sekitarmu, lalu melesat berputar ke luar, masing-masing 330%.', kind: 'fan', cost: 40, cd: 3, count: 11, spread: 360, ring: 40, delay: 0.4, curve: 2.2, speed: 400, range: 320, r: 6, mult: 3.3, up: ['+4 belati', 'Belati kembali sekali ke pemain'], lv3: { count: 15 }, lv5: { returns: true } },
      { id: 'poison', name: 'Kabut Racun', unlock: 5, desc: 'Kabut racun di titik bidik 3 detik: 8×90%.', icon: 'thorn', look: 'rain', kind: 'area', at: 'aim', maxDist: 220, cost: 35, cd: 5, r: 75, ticks: 8, duration: 3, mult: 0.9, up: ['Area +25%', 'Musuh di dalam kabut menerima +15% damage'], lv3: { r: 94 }, lv5: { vuln: 0.15 } },
      { id: 'smoke', name: 'Bom Asap', unlock: 10, desc: 'Asap membekukan musuh sekitar 1,2 detik; damage diterima −40% selama 4 detik.', icon: 'bubble', kind: 'buff', cost: 40, cd: 8, duration: 4, dmgTaken: 0.6, blast: { r: 100, mult: 1.5, knock: 0, freeze: 1.2 }, up: ['Beku +0,5 detik', 'Kebal 1 detik saat dilempar'], lv3: { blast: { freeze: 1.7 } }, lv5: { invuln: 1 } },
      { id: 'shuriken', name: 'Shuriken Raksasa', unlock: 15, desc: 'Shuriken raksasa mengitarimu 3 detik, menebas 130% tiap 0,25 detik, lalu dilempar ke bidikan menembus semua musuh 450%.', icon: 'fan', look: 'dagger', kind: 'orbit', cost: 30, cd: 2.5, radius: 90, spin: 7, every: 0.25, duration: 3, r: 28, mult: 1.3, throw: { speed: 520, range: 420, r: 16, mult: 4.5, pierce: Infinity }, up: ['Radius +20', 'Membelah jadi 3 saat dilempar'], lv3: { radius: 110 }, lv5: { throw: { split: { at: 60, count: 3, spread: 30 } } } },
      { id: 'assassinate', name: 'Naluri Pembunuh', unlock: 20, desc: 'Kritis +40% dan damage kritis +60% selama 6 detik.', icon: 'pow', kind: 'buff', cost: 50, cd: 12, duration: 6, dmgTaken: 1, crit: 40, critDmg: 0.6, up: ['Durasi +2 detik', 'Tiap kill +0,5 detik (maks +3 detik)'], lv3: { duration: 8 }, lv5: { killExtend: { per: 0.5, max: 3 } } },
      // tempo skills: a three-step chain (press again within the window); a shadow clone that draws foes (run/summons.js)
      { id: 'tripledance', name: 'Tarian Tiga Tebasan', unlock: 8, desc: '① Melesat menebas 250% · ② putaran 300% area 70 · ③ tusukan menukik 600% + pingsan 1 detik. Tekan lagi dalam 0,8 detik untuk tahap berikutnya.', icon: 'shadow', look: 'shadow', kind: 'chain', cost: 35, cd: 5, window: 0.8, s1: { distance: 160, duration: 0.14, r: 26, mult: 2.5 }, s2: { r: 70, mult: 3 }, s3: { r: 60, mult: 6, freeze: 1 }, up: ['Jendela 1 detik', 'Tahap ③ menebar gelombang 300% area 100'], lv3: { window: 1 }, lv5: { s3: { wave: { r: 100, mult: 3 } } } },
      { id: 'shadowclone', name: 'Klon Bayangan', unlock: 12, desc: 'Klon 6 detik meniru serangan biasamu 50%; separuh musuh di sekitar mengincar klon.', icon: 'shadow', kind: 'clone', cost: 40, cd: 10, life: 6, every: 0.45, r: 50, arc: 120, mult: 0.5, lure: 220, up: ['Damage klon 70%', 'Klon meledak 400% area 90 saat habis'], lv3: { mult: 0.7 }, lv5: { endBlast: { r: 90, mult: 4 } } },
    ],
  },
  // Pengembara (spec §43.1): every new character starts here, without a job. Two fixed skills (no
  // levels), no signature mechanic, no ultimate; capped at level 10 until a job is picked.
  novice: {
    id: 'novice', name: 'Pengembara', desc: 'Belum punya job. Pilih job di Pelatih mulai level 5.',
    stats: { maxHp: 110, atk: 12, def: 1, crit: 6, moveSpd: 112 },
    growth: { maxHp: 9, atk: 1.3 },
    attack: { kind: 'arc', fx: 'slash', interval: 0.5, mult: 1, r: 40, arc: 90, energy: 6 },
    trait: null, ult: null, ults: [],
    skills: [
      { id: 'sweep', name: 'Ayunan Lebar', unlock: 1, desc: 'Ayunan memutar di sekeliling: 180%, mendorong.', icon: 'spin', look: 'spin', kind: 'area', cost: 30, cd: 3, r: 70, ticks: 1, duration: 0.3, mult: 1.8, follow: true, knock: 120 },
      { id: 'tumble', name: 'Guling Serang', unlock: 1, desc: 'Berguling 140 px ke arah bidik, 200% ke yang dilewati.', icon: 'spd', look: 'shadow', kind: 'dash', cost: 20, cd: 3, distance: 140, duration: 0.16, r: 24, mult: 2 },
    ],
  },
};
// the real jobs (not the novice): job choice, weapon drops, shops, the class gallery
export const JOB_IDS = ['warrior', 'archer', 'mage', 'assassin'];
// two ultimates per job (spec §43.5): the wide one (ult, Luas) and the focused one (fokus)
for (const id of JOB_IDS) CLASSES[id].ults = [CLASSES[id].ult, CLASSES[id].fokus];
