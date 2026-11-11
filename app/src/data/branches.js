// Job Lanjutan (spec §43.10): two branches per job, opened by beating Bayangan Diri at BRANCH.level.
// A branch adds to its job's tree: 2 skills (lv 30 / 35), 1 ultimate (a third choice on key 5) and
// 2 passives, and changes the job's signature mechanic through `fx` (always on while the branch is
// chosen; read in run/branch.js and run/traits.js). Skill / ultimate definitions use the same keys as
// data/classes.js. Passives: `fx` per level, or `stat` (pct per level) / `add` (flat per level).
export const BRANCH = {
  level: 30,                 // character level for the trial
  changeMul: 2,              // changing branch costs jobChangePrice × this
  lowHpAt: 0.2,              // Berserker: the damage bonus is full at this HP fraction
  holyCap: 0.2,              // Paladin: the holy shield caps at this share of max HP
  timeAura: 150,             // Penyihir Waktu: foes this close are slowed
  heatBlast: { r: 150, mult: 6 }, // Penyihir Api: a full Panas bursts around you
  snipePer: 4,               // Penembak Jitu: +1% per this many units of distance on the focus shot
  ambushMul: 1.5,            // Bayangan: the first hit after a dodge / dash is a crit × this
  rewind: { time: 3, every: 0.1 }, // Putar Balik: how far back, how often the place is noted
  // the trial arena's HP / damage steps at BRANCH.level (a boss fight of ~1–2 minutes; a bot that never
  // dodges falls), growing `perLevel` (fraction) for every level above it (data/dungeons.js trialAt)
  trial: { hpMul: 4.5, dmgMul: 3.2, perLevel: 0.04 },
};

// The trial arena (spec §43.10): no waves, one Bayangan Diri on floor 5 (see data/dungeons.js TRIAL_DUNGEON)
export const TRIAL_BOSS = 'shadowself';

export const BRANCHES = {
  warrior: [
    {
      id: 'berserker', name: 'Berserker', title: 'Sang Berserker', color: '#ff3b3b',
      desc: 'Murka tidak pernah turun; makin sekarat makin sakit (s/d +40% di HP 20%), tapi tanpa pengurangan damage dari Murka.',
      fx: { rageKeep: 1, lowHpDmg: 0.4, rageNoArmor: 1 },
      skills: [
        { id: 'bloodrage', name: 'Amuk Darah', unlock: 30, icon: 'shout', desc: 'ATK & kecepatan serang +40%, menghisap 3% damage selama 8 detik; damage diterima +20%.', kind: 'buff', cost: 45, cd: 14, duration: 8, dmgTaken: 1.2, atk: 0.4, atkSpd: 0.4, lifesteal: 0.03, up: ['Durasi +2 detik', 'Menghisap 6%'], lv3: { duration: 10 }, lv5: { lifesteal: 0.06 } },
        { id: 'rageleap', name: 'Lompatan Amuk', unlock: 35, icon: 'spd', look: 'shadow', desc: 'Menerjang 260 px, 600% ke yang dilewati, kebal. Membunuh = siap lagi.', kind: 'dash', cost: 30, cd: 4, distance: 260, duration: 0.2, r: 34, mult: 6, resetOnKill: true, up: ['Jarak +60', 'Gelombang 300% di akhir'], lv3: { distance: 320 }, lv5: { blast: { r: 90, mult: 3, knock: 200 } } },
      ],
      ult: { id: 'ragnarok', name: 'Ragnarok', unlock: 30, icon: 'spin', look: 'spin', desc: 'Badai amuk 2 detik di sekitar: 8×400%, menarik musuh.', kind: 'area', follow: true, r: 140, ticks: 8, duration: 2, mult: 4, knock: -160 },
      passives: [
        { id: 'bloodthirst', name: 'Haus Darah', desc: 'Bonus damage HP rendah +15% per level', max: 3, unlock: 30, fx: { lowHpDmg: 0.15 } },
        { id: 'thickhide', name: 'Kulit Tebal', desc: 'HP maks +5% per level', max: 3, unlock: 32, stat: { maxHp: 0.05 } },
      ],
    },
    {
      id: 'paladin', name: 'Paladin', title: 'Sang Paladin', color: '#ffe27a',
      desc: 'Tiap tebasan biasa menambah perisai suci 1% HP maks (maks 20%); pulih 1% HP per detik; tebasan mendorong.',
      fx: { holyShield: 0.01, regen: 0.01, basicKnock: 90 },
      skills: [
        { id: 'holyguard', name: 'Perlindungan Suci', unlock: 30, icon: 'bubble', desc: 'Damage diterima −60% selama 6 detik.', kind: 'buff', cost: 40, cd: 12, duration: 6, dmgTaken: 0.4, up: ['Durasi +2 detik', 'Gelombang suci 300% saat dipakai'], lv3: { duration: 8 }, lv5: { blast: { r: 110, mult: 3, knock: 260 } } },
        { id: 'judgment', name: 'Palu Penghakiman', unlock: 35, icon: 'pow', look: 'quake', desc: 'Palu cahaya jatuh di titik bidik: 500% area 90, membekukan 0,6 detik.', kind: 'area', at: 'aim', maxDist: 320, cost: 40, cd: 4, r: 90, mult: 5, freeze: 0.6, duration: 0.4, knock: 120, up: ['Area +25%', 'Palu kedua 1 detik kemudian'], lv3: { r: 112 }, lv5: { after: { r: 90, mult: 5, ticks: 1, duration: 0.4 } } },
      ],
      ult: { id: 'sanctuary', name: 'Tanah Suci', unlock: 30, icon: 'bubble', look: 'nova', desc: 'Lingkaran suci 3 detik mengikutimu: 6×250%; damage diterima −50%.', kind: 'area', follow: true, r: 160, ticks: 6, duration: 3, mult: 2.5, dmgTaken: 0.5 },
      passives: [
        { id: 'faith', name: 'Iman', desc: 'Pulih +0,3% HP per detik per level', max: 3, unlock: 30, fx: { regen: 0.003 } },
        { id: 'bulwark', name: 'Benteng', desc: 'DEF +2 per level', max: 3, unlock: 32, add: { def: 2 } },
      ],
    },
  ],
  archer: [
    {
      id: 'sniper', name: 'Penembak Jitu', title: 'Sang Penembak Jitu', color: '#9cf5a8',
      desc: 'Bidik terisi 50% lebih cepat; tembakan Bidik +1% damage tiap 4 unit jarak ke sasaran.',
      fx: { focusGain: 0.5, snipe: 1 },
      skills: [
        { id: 'headshot', name: 'Tembakan Kepala', unlock: 30, icon: 'pierce', look: 'pierce', desc: 'Membidik 0,4 detik lalu panah 700% menembus 2 musuh.', kind: 'proj', cost: 35, cd: 3, delay: 0.4, speed: 700, range: 700, r: 8, mult: 7, pierce: 2, up: ['Menembus +2', 'Pasti kritikal'], lv3: { pierce: 4 }, lv5: { crit: true } },
        { id: 'steadyaim', name: 'Fokus Mantap', unlock: 35, icon: 'hst', desc: 'Kritis +40% dan damage kritis +50% selama 6 detik.', kind: 'buff', cost: 45, cd: 12, duration: 6, dmgTaken: 1, crit: 40, critDmg: 0.5, up: ['Durasi +2 detik', 'Bidik langsung penuh'], lv3: { duration: 8 }, lv5: { focusFill: true } },
      ],
      ult: { id: 'deatheye', name: 'Mata Maut', unlock: 30, icon: 'pierce', look: 'pierce', desc: 'Membidik 0,6 detik lalu sinar maut panjang selebar 46: 7000% ke semua di garis.', kind: 'focus', move: 'beam', focus: true, delay: 0.6, len: 760, w: 46, mult: 70 },
      passives: [
        { id: 'longshot', name: 'Jarak Jauh', desc: 'Damage ke musuh berjarak > 250 +10% per level', max: 3, unlock: 30, fx: { farDmg: 0.1 } },
        { id: 'patience', name: 'Sabar', desc: 'Bidik terisi +20% per level', max: 3, unlock: 32, fx: { focusGain: 0.2 } },
      ],
    },
    {
      id: 'hunter', name: 'Pemburu', title: 'Sang Pemburu', color: '#c7e86a',
      desc: '25% panah biasa memantul ke musuh lain (petir berantai); damage +15% saat bergerak.',
      fx: { chain: 0.25, moveDmg: 0.15 },
      skills: [
        { id: 'wolf', name: 'Panggil Serigala', unlock: 30, icon: 'shadow', desc: 'Serigala bayangan menemanimu 12 detik, menerkam di sekitarnya 80%; separuh musuh mengincarnya.', kind: 'clone', cost: 40, cd: 14, life: 12, every: 0.4, r: 55, arc: 140, mult: 0.8, lure: 200, up: ['Damage 110%', 'Melolong 400% saat habis'], lv3: { mult: 1.1 }, lv5: { endBlast: { r: 90, mult: 4 } } },
        { id: 'runvolley', name: 'Hujan Lari', unlock: 35, icon: 'fan', look: 'arrow', desc: '7 panah menyebar 40°, masing-masing 160%, bisa sambil berlari.', kind: 'fan', cost: 30, cd: 2.5, count: 7, spread: 40, speed: 560, range: 480, r: 5, mult: 1.6, up: ['+3 panah', 'Panah menembus 1 musuh'], lv3: { count: 10 }, lv5: { pierce: 1 } },
      ],
      ult: { id: 'huntwave', name: 'Gelombang Buru', unlock: 30, icon: 'thorn', look: 'quake', desc: 'Delapan pilar duri meletus berurutan ke arah bidik, masing-masing 300%, memperlambat.', kind: 'line', count: 8, step: 50, gap: 0.07, life: 0.5, r: 48, mult: 3, freeze: 0.4, knock: 120 },
      passives: [
        { id: 'nimble', name: 'Lincah', desc: 'Kecepatan serang +4% per level', max: 3, unlock: 30, stat: { atkSpd: 0.04 } },
        { id: 'tracker', name: 'Pelacak', desc: 'Damage saat bergerak +5% per level', max: 3, unlock: 32, fx: { moveDmg: 0.05 } },
      ],
    },
  ],
  mage: [
    {
      id: 'pyro', name: 'Penyihir Api', title: 'Sang Penyihir Api', color: '#ff6a2a',
      desc: 'Panas penuh meledak di sekitarmu (600%, area 150) dan kepanasan 50% lebih singkat; jeda skill +10%.',
      fx: { heatBlast: 1, overheatShort: 0.5 }, add: { cdr: -0.1 },
      skills: [
        { id: 'firestorm', name: 'Badai Api', unlock: 30, icon: 'ember', look: 'boom', desc: 'Pusaran api di titik bidik 2 detik: 6×160%.', kind: 'area', at: 'aim', maxDist: 320, cost: 40, cd: 4, r: 110, ticks: 6, duration: 2, mult: 1.6, up: ['Area +25%', 'Membakar 2 detik, 20% tiap 0,5 detik'], lv3: { r: 137 }, lv5: { burn: { time: 2, every: 0.5, mult: 0.2 } } },
        { id: 'burnout', name: 'Bakar Habis', unlock: 35, icon: 'ember', look: 'nova', desc: 'Ledakan api di sekitarmu: 500% area 130, mendorong.', kind: 'area', follow: true, cost: 50, cd: 5, r: 130, mult: 5, duration: 0.4, knock: 200, up: ['Area +20%', 'Lantai api 2 detik, 40% tiap 0,5 detik'], lv3: { r: 156 }, lv5: { after: { r: 130, mult: 0.4, ticks: 4, duration: 2, follow: true } } },
      ],
      ult: { id: 'supernova', name: 'Supernova', unlock: 30, icon: 'ember', look: 'boom', desc: 'Matahari meledak di sekitarmu: 2000% area 220, mendorong jauh.', kind: 'area', follow: true, r: 220, mult: 20, duration: 0.5, knock: 320 },
      passives: [
        { id: 'igniter', name: 'Pemantik', desc: '8% per level skill membakar (2 detik, 20% tiap 0,5 detik)', max: 3, unlock: 30, fx: { skillBurn: 0.08 } },
        { id: 'fireheart', name: 'Jantung Api', desc: 'Damage skill +4% per level', max: 3, unlock: 32, fx: { skillDmg: 0.04 } },
      ],
    },
    {
      id: 'chrono', name: 'Penyihir Waktu', title: 'Sang Penyihir Waktu', color: '#7fd8ff',
      desc: 'Musuh dalam jarak 150 bergerak 30% lebih lambat; 6% peluru musuh dipantulkan.',
      fx: { timeSlow: 0.3, timeReflect: 0.06 },
      skills: [
        { id: 'rewind', name: 'Putar Balik', unlock: 30, icon: 'zap', look: 'shadow', desc: 'Kembali ke tempat & HP 3 detik lalu (HP tidak pernah turun), lalu ledakan waktu 200%.', kind: 'rewind', cost: 35, cd: 12, r: 90, mult: 2, up: ['Jeda −3 detik', 'Ledakan membekukan 1 detik'], lv3: { cd: 9 }, lv5: { freeze: 1 } },
        { id: 'timefield', name: 'Medan Waktu', unlock: 35, icon: 'bubble', look: 'nova', desc: 'Medan di titik bidik 4 detik: 8×40%, musuh di dalamnya hampir berhenti.', kind: 'area', at: 'aim', maxDist: 320, cost: 40, cd: 8, r: 120, ticks: 8, duration: 4, mult: 0.4, freeze: 0.5, up: ['Area +25%', 'Musuh di dalam menerima +20% damage'], lv3: { r: 150 }, lv5: { vuln: 0.2 } },
      ],
      ult: { id: 'timestop', name: 'Hentikan Waktu', unlock: 30, icon: 'zap', look: 'nova', desc: 'Waktu berhenti di sekitarmu: 200% area 260, semua musuh membeku 4 detik.', kind: 'area', follow: true, r: 260, mult: 2, freeze: 4, duration: 0.5 },
      passives: [
        { id: 'haste', name: 'Percepat', desc: 'Jeda skill −3% per level', max: 3, unlock: 30, add: { cdr: 0.03 } },
        { id: 'timeparry', name: 'Tangkis Waktu', desc: 'Peluru dipantulkan +6% per level', max: 3, unlock: 32, fx: { timeReflect: 0.06 } },
      ],
    },
  ],
  assassin: [
    {
      id: 'shade', name: 'Bayangan', title: 'Sang Bayangan', color: '#9a6bff',
      desc: '1,5 detik setelah menghindar atau melesat: pukulan pertama pasti kritikal ×1,5.',
      fx: { ambush: 1.5 },
      skills: [
        { id: 'vanish', name: 'Menghilang', unlock: 30, icon: 'shadow', desc: 'Kebal 1,5 detik dan pukulan pertama sesudahnya serangan bayangan.', kind: 'buff', cost: 30, cd: 10, duration: 1.5, dmgTaken: 1, invuln: 1.5, ambush: true, up: ['Jeda −2 detik', 'Gerak +40% selama menghilang'], lv3: { cd: 8 }, lv5: { moveSpd: 0.4 } },
        { id: 'shadowstrike', name: 'Serangan Bayangan', unlock: 35, icon: 'spd', look: 'shadow', desc: 'Melesat 200 px, 600% ke yang dilewati, kebal.', kind: 'dash', cost: 30, cd: 3, distance: 200, duration: 0.16, r: 28, mult: 6, up: ['Bisa 2× berturut', 'Bayangan menebas lagi 0,3 detik kemudian'], lv3: { charges: 2 }, lv5: { echo: 0.3 } },
      ],
      ult: { id: 'shadoweclipse', name: 'Gerhana Bayangan', unlock: 30, icon: 'shadow', look: 'shadow', desc: 'Teleport ke belakang musuh yang dibidik, 4 tebasan dalam 0,4 detik total 7000%, kebal; musuh biasa ber-HP < 35% mati seketika.', kind: 'focus', move: 'behind', focus: true, range: 340, delay: 0.4, hits: 4, r: 55, mult: 70, execute: 0.35, perCombo: 0.1 },
      passives: [
        { id: 'cutthroat', name: 'Gorok', desc: 'Damage kritis +8% per level', max: 3, unlock: 30, add: { critDmg: 0.08 } },
        { id: 'nightveil', name: 'Selubung Malam', desc: 'Serangan bayangan +15% per level', max: 3, unlock: 32, fx: { ambushDmg: 0.15 } },
      ],
    },
    {
      id: 'bladedancer', name: 'Penari Pedang', title: 'Sang Penari Pedang', color: '#ff7ad9',
      desc: 'Kombo sampai 10 (bukan 5); kecepatan serang +3% per poin Kombo; Kombo putus = hilang semua.',
      fx: { comboMax: 5, comboSpd: 0.03 },
      skills: [
        { id: 'bladevortex', name: 'Pusaran Pedang', unlock: 30, icon: 'spin', look: 'dagger', desc: 'Pedang mengitarimu 3 detik, 140% tiap 0,2 detik, lalu dilempar menembus 400%.', kind: 'orbit', cost: 30, cd: 3, radius: 70, spin: 9, every: 0.2, duration: 3, r: 30, mult: 1.4, throw: { speed: 520, range: 380, r: 16, mult: 4, pierce: Infinity }, up: ['Radius +20', 'Membelah jadi 3 saat dilempar'], lv3: { radius: 90 }, lv5: { throw: { split: { at: 60, count: 3, spread: 30 } } } },
        { id: 'slashrain', name: 'Hujan Tebasan', unlock: 35, icon: 'fan', look: 'dagger', desc: '9 belati menyebar 60°, masing-masing 180%.', kind: 'fan', cost: 35, cd: 2.5, count: 9, spread: 60, speed: 500, range: 360, r: 6, mult: 1.8, up: ['+4 belati', 'Belati kembali sekali ke pemain'], lv3: { count: 13 }, lv5: { returns: true } },
      ],
      ult: { id: 'thousandcuts', name: 'Seribu Sayatan', unlock: 30, icon: 'spin', look: 'spin', desc: 'Menari 2,5 detik sambil menyayat semua di sekitar: 20×120%, kebal.', kind: 'area', follow: true, r: 125, ticks: 20, duration: 2.5, mult: 1.2, invuln: 2.5 },
      passives: [
        { id: 'rhythm', name: 'Irama', desc: 'Kecepatan serang +1% per poin Kombo per level', max: 3, unlock: 30, fx: { comboSpd: 0.01 } },
        { id: 'keen', name: 'Tajam', desc: 'Kritis +2 per level', max: 3, unlock: 32, add: { crit: 2 } },
      ],
    },
  ],
};

export const branchesOf = (classId) => BRANCHES[classId] || [];
export const branchById = (classId, id) => branchesOf(classId).find((b) => b.id === id) || null;
// the skills a run can wear: the job's own, plus its branch's
export function skillPool(C, branch) {
  const b = branch ? branchById(C.id, branch) : null;
  return b ? [...C.skills, ...b.skills] : C.skills;
}
