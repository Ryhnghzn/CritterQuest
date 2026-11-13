// Enemy types (spec §5.3, §18.1). Which enemies appear on each floor lives in
// data/dungeon.js. ai picks the behaviour in run/enemies.js (default: chase);
// every = seconds between special actions, windup = warning before one.
export const ENEMIES = {
  slink: { name: 'Lendir', hp: 18, speed: 52, dmg: 8, r: 11, xp: 1, sprite: 'slink', score: 1 },
  dart: { name: 'Kelelawar', hp: 12, speed: 95, dmg: 6, r: 9, xp: 1, sprite: 'dart', score: 1 },
  tank: { name: 'Golem', hp: 90, speed: 30, dmg: 16, r: 17, xp: 5, sprite: 'tank', score: 5 },
  mini: { name: 'Lendir Kecil', hp: 8, speed: 72, dmg: 4, r: 7, xp: 0, sprite: 'mini', score: 0 },
  spitter: {
    name: 'Katak Ludah', hp: 26, speed: 50, dmg: 6, r: 11, xp: 2, sprite: 'spitter', score: 2,
    ai: 'ranged', keep: 190, every: 2.4, windup: 0.5, shot: { speed: 170, dmg: 10, r: 5, color: '#9dff6a' },
  },
  charger: {
    name: 'Babi Batu', hp: 60, speed: 42, dmg: 14, r: 15, xp: 4, sprite: 'charger', score: 4,
    ai: 'charge', range: 240, every: 2.5, windup: 0.75, dash: { speed: 340, time: 0.55 }, rest: 0.8,
  },
  summoner: {
    name: 'Dukun Tengkorak', hp: 55, speed: 36, dmg: 6, r: 13, xp: 5, sprite: 'summoner', score: 5,
    ai: 'summon', keep: 230, every: 5, windup: 0.8, summon: { type: 'mini', count: 3, max: 6 },
  },
  healer: {
    name: 'Peri Lumut', hp: 40, speed: 48, dmg: 5, r: 11, xp: 4, sprite: 'healer', score: 4,
    ai: 'heal', keep: 200, every: 3, windup: 0.6, heal: { radius: 130, amount: 0.25 },
  },
  bomber: {
    name: 'Jamur Bom', hp: 20, speed: 90, dmg: 0, r: 11, xp: 2, sprite: 'bomber', score: 2,
    ai: 'bomb', trigger: 42, fuse: 0.65, blast: { radius: 64, dmg: 22 },
  },
  shielder: {
    name: 'Kura Baja', hp: 85, speed: 34, dmg: 12, r: 16, xp: 5, sprite: 'shielder', score: 5,
    ai: 'shield', turn: 1.4, guard: { arc: 140, reduce: 0.85 },
  },
  // biome enemies (spec §25.4)
  // kin: the older enemy a biome variant is drawn from (bestiary counts it there);
  // onHit: what a landed hit does to the player — slow: [speed −k, seconds],
  // poison / burn: [k × the hit's damage per second, seconds].
  wolf: {
    name: 'Serigala Bayang', hp: 30, speed: 80, dmg: 10, r: 12, xp: 3, sprite: 'wolf', score: 3,
    ai: 'charge', range: 200, every: 1.6, windup: 0.35, dash: { speed: 420, time: 0.3 }, rest: 0.4,
  },
  frostslink: { kin: 'slink', name: 'Lendir Beku', hp: 22, speed: 46, dmg: 8, r: 11, xp: 1, sprite: 'frostslink', score: 1, onHit: { slow: [0.3, 1.2] } },
  frostspitter: {
    kin: 'spitter', name: 'Katak Salju', hp: 28, speed: 48, dmg: 6, r: 11, xp: 2, sprite: 'frostspitter', score: 2,
    ai: 'ranged', keep: 190, every: 2.4, windup: 0.5, shot: { speed: 170, dmg: 10, r: 6, color: '#bfe8ff', onHit: { slow: [0.35, 1.5] } },
  },
  frosttank: { kin: 'tank', name: 'Golem Es', hp: 100, speed: 28, dmg: 16, r: 17, xp: 5, sprite: 'frosttank', score: 5, onHit: { slow: [0.4, 1.5] } },
  yeti: {
    name: 'Yeti', hp: 140, speed: 36, dmg: 20, r: 19, xp: 8, sprite: 'yeti', score: 8,
    ai: 'charge', range: 260, every: 3, windup: 0.8, dash: { speed: 360, time: 0.5 }, rest: 1, onHit: { slow: [0.45, 1.8] },
  },
  icewisp: {
    name: 'Roh Es', hp: 30, speed: 55, dmg: 4, r: 10, xp: 3, sprite: 'icewisp', score: 3,
    ai: 'ranged', keep: 220, every: 2.2, windup: 0.5, shot: { speed: 190, dmg: 8, r: 5, color: '#a8e4ff', count: 3, spread: 0.26, onHit: { slow: [0.3, 1.2] } },
  },
  sandslink: { kin: 'slink', name: 'Lendir Pasir', hp: 18, speed: 64, dmg: 8, r: 11, xp: 1, sprite: 'sandslink', score: 1 },
  vulture: { kin: 'dart', name: 'Burung Nasar', hp: 16, speed: 100, dmg: 7, r: 10, xp: 1, sprite: 'vulture', score: 1 },
  scorpion: {
    name: 'Kalajengking', hp: 55, speed: 60, dmg: 10, r: 14, xp: 4, sprite: 'scorpion', score: 4,
    ai: 'charge', range: 180, every: 2, windup: 0.5, dash: { speed: 380, time: 0.35 }, rest: 0.6, onHit: { poison: [0.35, 3] },
  },
  sandworm: {
    name: 'Cacing Pasir', hp: 120, speed: 120, dmg: 18, r: 16, xp: 7, sprite: 'sandworm', score: 7,
    ai: 'burrow', under: 2.2, rise: 0.7, up: 2.6, upSpeed: 30, blast: { radius: 70, dmg: 24 },
  },
  magmaslink: { kin: 'slink', name: 'Lendir Magma', hp: 22, speed: 50, dmg: 9, r: 11, xp: 1, sprite: 'magmaslink', score: 1, onHit: { burn: [0.3, 2] } },
  emberbomber: { kin: 'bomber', name: 'Jamur Bara', hp: 22, speed: 92, dmg: 0, r: 11, xp: 2, sprite: 'emberbomber', score: 2, ai: 'bomb', trigger: 44, fuse: 0.6, blast: { radius: 78, dmg: 26, onHit: { burn: [0.3, 2.5] } } },
  imp: {
    name: 'Imp Api', hp: 34, speed: 70, dmg: 6, r: 10, xp: 4, sprite: 'imp', score: 4,
    ai: 'ranged', keep: 200, every: 1.8, windup: 0.4, shot: { speed: 220, dmg: 10, r: 6, color: '#ff7a2a', onHit: { burn: [0.3, 2.5] } },
  },
  salamander: {
    name: 'Salamander', hp: 80, speed: 46, dmg: 16, r: 15, xp: 6, sprite: 'salamander', score: 6,
    ai: 'charge', range: 260, every: 2.4, windup: 0.6, dash: { speed: 400, time: 0.5 }, rest: 0.7,
    trail: { every: 0.08, r: 26, fuse: 0.45, dmg: 0.6 }, onHit: { burn: [0.3, 2] },
  },
  // Tanah Gerhana (spec §26.7): eclipse variants and the wraith
  voidslink: { kin: 'slink', name: 'Lendir Hampa', hp: 26, speed: 64, dmg: 10, r: 11, xp: 1, sprite: 'voidslink', score: 1, onHit: { slow: [0.3, 1.2] } },
  voiddart: { kin: 'dart', name: 'Kelelawar Gerhana', hp: 16, speed: 115, dmg: 8, r: 9, xp: 1, sprite: 'voiddart', score: 1 },
  voidspitter: {
    kin: 'spitter', name: 'Katak Hampa', hp: 32, speed: 52, dmg: 7, r: 11, xp: 2, sprite: 'voidspitter', score: 2,
    ai: 'ranged', keep: 200, every: 2.2, windup: 0.5, shot: { speed: 190, dmg: 11, r: 6, color: '#b98aff', count: 3, spread: 0.22 },
  },
  voidtank: { kin: 'tank', name: 'Golem Gerhana', hp: 120, speed: 32, dmg: 18, r: 18, xp: 6, sprite: 'voidtank', score: 6, onHit: { slow: [0.35, 1.5] } },
  // Hantu Gerhana: fades out, reappears right beside the player and bursts into a ring of shots
  wraith: {
    name: 'Hantu Gerhana', hp: 70, speed: 58, dmg: 12, r: 13, xp: 7, sprite: 'wraith', score: 7,
    ai: 'blink', keep: 220, every: 3.4, fade: 0.55, appear: 0.45, near: [130, 190],
    ring: { count: 10, speed: 160, dmg: 12, r: 6, color: '#c79bff' },
  },
  // §41.1 new behaviours — Hutan
  // Katak Rawa: marks a circle where the player stands, flies there over `windup` s and lands on it
  marshfrog: {
    name: 'Katak Rawa', hp: 40, speed: 46, dmg: 12, r: 12, xp: 3, sprite: 'marshfrog', score: 3,
    ai: 'leap', range: 280, every: 2.6, windup: 0.7, rest: 0.5, land: { radius: 50, dmg: 18 },
  },
  // Semak Penyergap: a bush that cannot be targeted; pounces when the player comes within `trigger`,
  // fights, and hides again after `rehide` s far (> `lose`) from the player
  bushling: {
    name: 'Semak Penyergap', hp: 55, speed: 44, dmg: 14, r: 13, xp: 4, sprite: 'bushling', score: 4,
    ai: 'ambush', trigger: 110, dash: { speed: 420, time: 0.28 }, lose: 320, rehide: 3,
  },
  // §41.1 — Padang Es
  // Roh Embun: drifts at the player and leaves icy puddles (zone hazard) that slow
  mistwisp: {
    name: 'Roh Embun', hp: 34, speed: 54, dmg: 6, r: 10, xp: 3, sprite: 'mistwisp', score: 3,
    ai: 'trail', spacing: 26, puddle: { r: 34, life: 4, slow: [0.4, 0.5] },
  },
  // Penjaga Cermin: every `every` s flashes (`windup`) then holds a mirror for `hold` s; player
  // projectiles striking it from the front (within `arc`°) fly back at the player as `reflect`
  mirrorguard: {
    name: 'Penjaga Cermin', hp: 95, speed: 34, dmg: 14, r: 16, xp: 6, sprite: 'mirrorguard', score: 6,
    ai: 'mirror', every: 4, windup: 0.4, hold: 1.5, arc: 140, turn: 2.2,
    reflect: { speed: 260, dmg: 12, r: 6, color: '#cfefff', look: 'crystal' },
  },
  // §41.1 — Gurun Merah
  // Hyena Pasir: comes `group` at a time, circles the player at `ring`, then a howl (lines on the
  // ground, `windup` s) and every hyena of the pack rushes in at once
  hyena: {
    name: 'Hyena Pasir', hp: 34, speed: 96, dmg: 10, r: 12, xp: 3, sprite: 'hyena', score: 3, group: [4, 6],
    ai: 'pack', ring: 160, spin: 1.1, every: 3.4, windup: 0.8, dash: { speed: 460, time: 0.42 }, rest: 0.7,
  },
  // Kumbang Pembelah: bursts into `split.count` of `split.type` when it dies (they split once more)
  splitbeetle: {
    name: 'Kumbang Pembelah', hp: 64, speed: 40, dmg: 12, r: 15, xp: 4, sprite: 'splitbeetle', score: 4,
    ai: 'split', split: { type: 'beetlet', count: 2 },
  },
  beetlet: { kin: 'splitbeetle', name: 'Kumbang Kecil', hp: 24, speed: 62, dmg: 8, r: 10, xp: 1, sprite: 'beetlet', score: 1, ai: 'split', split: { type: 'mite', count: 2 } },
  mite: { kin: 'splitbeetle', name: 'Tungau', hp: 8, speed: 100, dmg: 5, r: 6, xp: 0, sprite: 'mite', score: 0 },
  // §41.1 — Gunung Api
  // Meriam Magma: stands back at `keep` (beyond a mage's reach) and lobs shells: a danger circle
  // where the player stands, bursting after `lob.fuse` s
  mortar: {
    name: 'Meriam Magma', hp: 52, speed: 36, dmg: 6, r: 14, xp: 5, sprite: 'mortar', score: 5,
    ai: 'mortar', keep: 360, every: 2.6, windup: 0.5, lob: { radius: 56, fuse: 1, dmg: 20, onHit: { burn: [0.3, 2] } },
  },
  // Totem Bara: does not move; enemies within `radius` are `haste` faster and get a ward of `ward` ×
  // their max HP (soaked before HP) while it stands. `single`: comes alone with a pack of others
  embertotem: {
    name: 'Totem Bara', hp: 130, speed: 0, dmg: 0, r: 16, xp: 6, sprite: 'embertotem', score: 6, single: true,
    ai: 'totem', radius: 200, haste: 0.3, ward: 0.2, color: '255,140,60',
  },
  // §41.1 — Tanah Gerhana
  // Obelisk Hampa: a Totem Bara with a slowly turning beam that hurts every `beam.every` s it touches
  voidobelisk: {
    name: 'Obelisk Hampa', hp: 170, speed: 0, dmg: 14, r: 18, xp: 8, sprite: 'voidobelisk', score: 8, single: true,
    ai: 'totem', radius: 200, haste: 0.3, ward: 0.2, color: '190,120,255', beam: { len: 280, w: 22, spin: 0.7, dmg: 14, every: 0.5 },
  },
  // Kembar Hampa: pairs bound by a beam (`link`) that hurts when crossed; they flank the player from
  // both sides. One falls → it rises again after `revive` s at `reviveHp`, unless its twin falls too
  voidtwin: {
    name: 'Kembar Hampa', hp: 72, speed: 62, dmg: 12, r: 13, xp: 6, sprite: 'voidtwin', score: 6, group: [2, 2],
    ai: 'twin', flank: 120, revive: 4, reviveHp: 0.5, link: { max: 340, w: 12, dmg: 10, every: 0.5 },
  },
  // Bayang Maw (plan "Bos Berkesan" A): a shadow of Raja Maw in its Bayang Kembar; stands, breaks, or
  // fires its ring and fades. No touch damage, no loot, not in the bestiary.
  mawshade: { name: 'Bayang Maw', hp: 1, speed: 0, dmg: 0, r: 16, xp: 0, sprite: 'mawshade', score: 0, ai: 'shade' },
  // Jamur Spora (plan "Bos Berkesan" E): a swelling mushroom of Ratu Spora's Ladang Jamur; break it before it bursts
  sporepod: { name: 'Jamur Spora', hp: 1, speed: 0, dmg: 0, r: 14, xp: 0, sprite: 'sporepod', score: 0, ai: 'pod' },
  // Penjaga Sarkofagus (plan "Bos Berkesan" B): raised by Raja Mumi's phase 2; stands still and shields it
  tombguard: { name: 'Penjaga Sarkofagus', hp: 1, speed: 0, dmg: 0, r: 20, xp: 0, sprite: 'tombguard', score: 0, ai: 'sarco' },
  // Raja Maw: chases slowly and every few seconds runs one random pattern;
  // below enrageAt HP faster and denser (spec §18.1).
  boss: {
    name: 'Raja Maw', boss: true, hp: 900, speed: 38, dmg: 24, r: 30, xp: 0, sprite: 'boss', score: 100,
    ai: 'boss', every: 2.8, enrageAt: 0.5, enragedEvery: 1.8,
    patterns: ['ring', 'spiral', 'slam', 'charge', 'summon'],
    ring: { count: 14, speed: 140, dmg: 12, waves: 2, gap: 0.45, r: 7, color: '#c26bd8' },
    spiral: { arms: 3, time: 2.4, every: 0.11, speed: 150, dmg: 10, turn: 2.2, r: 6, color: '#ff5f9e' },
    slam: { count: 3, gap: 0.45, fuse: 0.9, radius: 70, dmg: 26 },
    windup: 0.9, dash: { speed: 420, time: 0.6 }, rest: 0.6,
    summon: { type: 'mini', count: 4, max: 8 },
    // signature moves (spec §41.2): Telan pulls toward its mouth then bites; Bayang Kembar: shadows
    // appear around the player and each fires a ring. Phase 2 at 50%: "LAPAR!"
    signature: ['gulp', 'clones'],
    phases: [
      { at: 1, patterns: ['gulp', 'clones', 'ring', 'charge'] },
      { at: 0.5, name: 'LAPAR!', patterns: ['gulp', 'clones', 'clones', 'ring', 'charge', 'summon'] },
    ],
    gulp: { r: 95, pull: 150, fuse: 1.8, dmg: 36,
      // plan "Bos Berkesan" A: bites per phase (phase 2 aims again, the second bite quicker);
      // the last bite missing (out of reach, dodged or parried) chokes it: tired, takes more damage
      bites: [1, 2], again: 1.2, choke: { time: 2.2, taken: 0.3 } },
    clones: { count: 2, dist: 170, warn: 0.8, ring: { count: 12, speed: 150, dmg: 11, r: 6, color: '#c26bd8' },
      shade: { hp: 0.01, warn: 2.2 } }, // the shadows are things to break (HP × the boss's max HP); a broken one does not fire
    // plan "Bos Berkesan" A: seconds of wind-up before these moves (the rest show their own warnings),
    // and never the same move twice in a row
    tell: { ring: 0.6, summon: 0.6, spiral: 0.7 }, noRepeat: true,
  },
  // Golem Kristal (Gua Kristal): crystal shards in rings, slams, charges.
  crystalboss: {
    name: 'Golem Kristal', boss: true, hp: 900, speed: 30, dmg: 26, r: 32, xp: 0, sprite: 'crystalboss', score: 100,
    ai: 'boss', every: 2.6, enrageAt: 0.5, enragedEvery: 1.7,
    patterns: ['ring', 'slam', 'charge', 'ring'],
    ring: { count: 18, speed: 130, dmg: 13, waves: 3, gap: 0.4, r: 7, color: '#7fd8ff' },
    spiral: { arms: 2, time: 2, every: 0.12, speed: 140, dmg: 10, turn: 2, r: 6, color: '#7fd8ff' },
    slam: { count: 4, gap: 0.4, fuse: 0.85, radius: 75, dmg: 28 },
    windup: 0.8, dash: { speed: 460, time: 0.55 }, rest: 0.7,
    summon: { type: 'shielder', count: 2, max: 4 },
    // Prisma: crystals around the player, beams flaring between them in turn; Hujan Serpih: rows of
    // shards sweeping toward the player. Phase 2: "RETAK!"
    signature: ['prism', 'shardrain'],
    phases: [
      { at: 1, patterns: ['prism', 'shardrain', 'ring', 'slam'] },
      { at: 0.5, name: 'RETAK!', patterns: ['prism', 'shardrain', 'shardrain', 'spiral', 'prism'], shatter: true },
    ],
    // plan "Bos Berkesan" D: Kulit Kristal — a crust (× max HP) that soaks every hit; heavy hits (crit, skill,
    // ultimate) wear it × heavy, Tebasan Raksasa at full breaks it at once. Broken: stunned; grows back after
    // `regrow` s. Phase 2 (RETAK!) shatters it for good.
    crust: { hp: 0.06, heavy: 2.5, regrow: 9, stun: { time: 2.4, taken: 0.3 } },
    tell: { ring: 0.6, spiral: 0.7, summon: 0.6 }, noRepeat: true,
    prism: { count: 3, dist: 150, w: 18, fuse: 0.9, gap: 0.35, flashes: 6, dmg: 26 },
    shardrain: { rows: 8, step: 38, width: 2, gapW: 34, r: 22, fuse: 0.8, gap: 0.14, dmg: 22 },
  },
  // Ratu Spora (Hutan Jamur Busuk): spore spirals, calls bombers.
  sporeboss: {
    name: 'Ratu Spora', boss: true, hp: 900, speed: 36, dmg: 24, r: 30, xp: 0, sprite: 'sporeboss', score: 100,
    ai: 'boss', every: 2.4, enrageAt: 0.5, enragedEvery: 1.6,
    patterns: ['spiral', 'summon', 'ring', 'spiral'],
    ring: { count: 16, speed: 120, dmg: 12, waves: 2, gap: 0.5, r: 8, color: '#b7ff6a' },
    spiral: { arms: 4, time: 2.8, every: 0.13, speed: 125, dmg: 11, turn: 1.6, r: 7, color: '#d98aff' },
    slam: { count: 3, gap: 0.5, fuse: 0.9, radius: 70, dmg: 24 },
    windup: 0.9, dash: { speed: 400, time: 0.6 }, rest: 0.6,
    summon: { type: 'bomber', count: 3, max: 6 },
    // Ladang Jamur: mushrooms swell around the player and burst; Awan Racun: a slow cloud that
    // follows the player. Phase 2: "MEKAR!" — poison pools that stay.
    signature: ['shrooms', 'cloud'],
    phases: [
      { at: 1, patterns: ['shrooms', 'cloud', 'spiral', 'summon'] },
      { at: 0.5, name: 'MEKAR!', patterns: ['pools', 'shrooms', 'cloud', 'spiral', 'shrooms'] },
    ],
    tell: { ring: 0.6, spiral: 0.7, summon: 0.6 }, noRepeat: true,
    shrooms: { count: 5, near: [60, 200], r: 44, fuse: 2.6, dmg: 26, onHit: { poison: [0.35, 3] },
      // plan "Bos Berkesan" E: each mushroom is a pod to break (hp × the queen's max HP) before it bursts. Broken
      // within `near` of the queen its spores turn on her (hurt × max HP, a short stun); in phase 2 it soaks up
      // the poison pools within `clear`.
      pod: { hp: 0.006, near: 160, hurt: 0.025, stun: { time: 1.4, taken: 0.3 }, clear: 130 } },
    cloud: { r: 70, life: 6, dmg: 6, tick: 0.5, follow: 42, onHit: { poison: [0.3, 2] } },
    pools: { count: 3, max: 6, near: [120, 260], r: 80, life: 30, dmg: 7, tick: 0.5, onHit: { poison: [0.3, 2] } },
  },
  // Raja Mumi (Makam Pasir): sand rings and spirals, buried slams, calls scorpions.
  tombboss: {
    name: 'Raja Mumi', boss: true, hp: 900, speed: 34, dmg: 26, r: 32, xp: 0, sprite: 'tombboss', score: 100,
    ai: 'boss', every: 2.4, enrageAt: 0.5, enragedEvery: 1.6,
    patterns: ['spiral', 'slam', 'summon', 'ring', 'charge'],
    ring: { count: 16, speed: 140, dmg: 13, waves: 3, gap: 0.4, r: 7, color: '#e8c070' },
    spiral: { arms: 4, time: 2.6, every: 0.11, speed: 150, dmg: 11, turn: 2.4, r: 6, color: '#f2d38a' },
    slam: { count: 5, gap: 0.35, fuse: 0.85, radius: 80, dmg: 30 },
    windup: 0.8, dash: { speed: 440, time: 0.55 }, rest: 0.6,
    summon: { type: 'scorpion', count: 2, max: 4 },
    // Kutukan: a mark follows the player, stops, then bursts; Badai Pasir: wind pushes the player
    // while scarabs fly with it. Phase 2: "KUTUKAN FIRAUN!" — calls its guards more often.
    signature: ['curse', 'sandstorm'],
    phases: [
      { at: 1, patterns: ['curse', 'sandstorm', 'ring', 'slam'] },
      { at: 0.5, name: 'KUTUKAN FIRAUN!', patterns: ['summon', 'curse', 'sandstorm', 'curse', 'spiral'], guards: true },
    ],
    // plan "Bos Berkesan" B: a curse bursting on the mummy itself stuns it (hurt: × its max HP)
    curse: { r: 90, fuse: 3, follow: 2.3, dmg: 34, stun: { time: 2.2, taken: 0.3, hurt: 0.03 } },
    // phase 2: sarcophagus guards rise; while one stands the mummy takes `cut` less damage; the last one
    // broken brings the shield down and stuns it (hp: × the mummy's max HP each)
    guards: { count: 2, hp: 0.03, dist: 240, cut: 0.5, stun: { time: 2.5, taken: 0.3 } },
    tell: { ring: 0.6, summon: 0.6, spiral: 0.7 }, noRepeat: true,
    sandstorm: { time: 3, push: 70, every: 0.14, spread: 260, shot: { speed: 220, dmg: 10, r: 6, color: '#e8c070' } },
  },
  // Sang Gerhana (Menara Gerhana, spec §26.7): three phases by HP —
  //   1 Matahari Hitam: rings, spirals, sweeping beams;
  //   2 Gerhana (≤ 66%): the arena goes dark; echoes one attack of each dungeon boss;
  //   3 Kehampaan (≤ 33%): faster, black holes that pull, calls shadows.
  eclipseboss: {
    name: 'Sang Gerhana', boss: true, hp: 1500, speed: 36, dmg: 34, r: 36, xp: 0, sprite: 'eclipseboss', score: 200,
    ai: 'boss', every: 2.2, enrageAt: 0.33, enragedEvery: 1.3,
    patterns: ['ring', 'spiral', 'beam'],
    phases: [
      { at: 1, name: 'Matahari Hitam', patterns: ['ring', 'spiral', 'beam', 'charge'] },
      { at: 0.66, name: 'GERHANA!', patterns: ['echo', 'echo', 'beam'], dark: true },
      { at: 0.33, name: 'KEHAMPAAN!', patterns: ['hole', 'spiral', 'echo', 'beam', 'summon'], dark: true },
    ],
    echo: ['boss', 'crystalboss', 'sporeboss', 'tombboss', 'lavaboss'],
    ring: { count: 20, speed: 150, dmg: 15, waves: 3, gap: 0.4, r: 8, color: '#c79bff' },
    spiral: { arms: 4, time: 2.6, every: 0.1, speed: 160, dmg: 13, turn: 2.6, r: 7, color: '#ffe08a' },
    slam: { count: 5, gap: 0.35, fuse: 0.8, radius: 85, dmg: 34 },
    beam: { count: 4, sweeps: 3, gap: 0.55, fuse: 0.75, len: 520, w: 34, turn: 0.4, dmg: 32 },
    hole: { count: 2, r: 110, fuse: 2.4, pull: 120, dmg: 36,
      // plan "Bos Berkesan" F: its holes drag its own kind too (the boss at `self` × pull); collapsing they
      // tear the small ones (foe × their max HP) and, if it is caught, swallow it: hurt × max HP and a stun
      foe: 0.6, self: 0.35, stun: { time: 2.2, taken: 0.3, hurt: 0.03 } },
    // its echoes come in this order (one of each boss in turn), not at random
    echoInOrder: true,
    tell: { ring: 0.55, spiral: 0.65, summon: 0.55 },
    windup: 0.75, dash: { speed: 500, time: 0.5 }, rest: 0.5,
    summon: { type: 'wraith', count: 2, max: 4 },
  },
  // Raja Lava (Benteng Lava): heavy fire slams and fire rings.
  lavaboss: {
    name: 'Raja Lava', boss: true, hp: 900, speed: 34, dmg: 30, r: 34, xp: 0, sprite: 'lavaboss', score: 100,
    ai: 'boss', every: 2.3, enrageAt: 0.5, enragedEvery: 1.5,
    patterns: ['slam', 'ring', 'spiral', 'charge'],
    ring: { count: 20, speed: 150, dmg: 14, waves: 2, gap: 0.4, r: 8, color: '#ff8a3c' },
    spiral: { arms: 3, time: 2.4, every: 0.1, speed: 160, dmg: 12, turn: 2.6, r: 7, color: '#ffc04a' },
    slam: { count: 5, gap: 0.35, fuse: 0.8, radius: 85, dmg: 32 },
    windup: 0.75, dash: { speed: 480, time: 0.55 }, rest: 0.6,
    summon: { type: 'charger', count: 2, max: 4 },
    // Erupsi: three lava cracks crawling out from it; Meteor: big circles crashing down on the
    // player. Phase 2: "LANTAI MENDIDIH!" — lava pools that stay.
    signature: ['eruption', 'meteor'],
    phases: [
      { at: 1, patterns: ['eruption', 'meteor', 'ring', 'charge'] },
      { at: 0.5, name: 'LANTAI MENDIDIH!', patterns: ['pools', 'eruption', 'meteor', 'meteor', 'spiral'] },
    ],
    eruption: { lines: 3, spread: 0.5, steps: 9, step: 34, r: 24, fuse: 0.7, gap: 0.12, dmg: 26, onHit: { burn: [0.3, 2.5] } },
    meteor: { count: 3, r: 100, fuse: 1.4, gap: 0.5, spread: 40, dmg: 40,
      // plan "Bos Berkesan" C: after the volley it cools down: stands, its back (away from where the player
      // stood) glows; hits while standing in that `arc` (degrees) deal × back. In phase 2 its lava pools
      // within `cool` turn to stone.
      vent: { time: 2.6, back: 1.6, arc: 140, cool: 280 } },
    pools: { count: 4, max: 6, near: [100, 240], r: 70, life: 40, dmg: 8, tick: 0.5, onHit: { burn: [0.3, 2] } },
    tell: { ring: 0.6, summon: 0.6, spiral: 0.7 }, noRepeat: true,
  },
  // Bayangan Diri (spec §43.10): the Job Lanjutan trial — your own shadow, fast and relentless. Only in
  // the trial arena (data/dungeons.js TRIAL_DUNGEON); drawn as your hero in art/bosses/shadow.js.
  shadowself: {
    name: 'Bayangan Diri', boss: true, hp: 1300, speed: 70, dmg: 30, r: 28, xp: 0, sprite: 'shadowself', score: 0,
    ai: 'boss', every: 1.9, enrageAt: 0.5, enragedEvery: 1.2,
    patterns: ['charge', 'ring', 'clones', 'slam'],
    phases: [
      { at: 1, patterns: ['charge', 'ring', 'clones', 'slam', 'charge'] },
      { at: 0.5, name: 'BAYANGAN MENGAMUK!', patterns: ['charge', 'clones', 'spiral', 'slam', 'charge', 'ring'] },
    ],
    ring: { count: 16, speed: 160, dmg: 14, waves: 3, gap: 0.35, r: 7, color: '#b07cff' },
    spiral: { arms: 3, time: 2.2, every: 0.1, speed: 170, dmg: 12, turn: 2.4, r: 6, color: '#c79bff' },
    slam: { count: 4, gap: 0.35, fuse: 0.75, radius: 75, dmg: 30 },
    clones: { count: 3, dist: 170, warn: 0.7, ring: { count: 12, speed: 160, dmg: 12, r: 6, color: '#b07cff' } },
    tell: { ring: 0.45, spiral: 0.5 }, // plan "Bos Berkesan": short wind-ups, it stays relentless
    windup: 0.5, dash: { speed: 600, time: 0.45 }, rest: 0.35,
  },
};

// What each enemy's shots and slams look like (spec §41.2): a picture in art/pix/fx.js per look,
// instead of the same glowing ball in every colour. Copied onto the ring / spiral / shot / slam configs.
export const SHOT_LOOKS = {
  boss: 'maw', crystalboss: 'crystal', sporeboss: 'spore', tombboss: 'scarab', lavaboss: 'magma', eclipseboss: 'void', shadowself: 'void',
  spitter: 'spit', frostspitter: 'crystal', icewisp: 'crystal', imp: 'magma', voidspitter: 'void', wraith: 'void',
};
for (const [id, look] of Object.entries(SHOT_LOOKS)) for (const k of ['ring', 'spiral', 'shot', 'slam', 'meteor', 'shrooms', 'cloud', 'pools', 'shardrain', 'eruption', 'curse']) if (ENEMIES[id][k]) ENEMIES[id][k].look = look;
for (const [id, k] of [['boss', 'clones'], ['tombboss', 'sandstorm'], ['shadowself', 'clones']]) ENEMIES[id][k][k === 'clones' ? 'ring' : 'shot'].look = SHOT_LOOKS[id];

// Red shots that no parry can stop (spec §43.8): every dungeon boss's spiral. Drawn with a red glow.
export const UNPARRYABLE = { boss: ['spiral'], crystalboss: ['spiral'], sporeboss: ['spiral'], tombboss: ['spiral'], lavaboss: ['spiral'], eclipseboss: ['spiral'], shadowself: ['spiral'] };
for (const [id, keys] of Object.entries(UNPARRYABLE)) for (const k of keys) if (ENEMIES[id][k]) Object.assign(ENEMIES[id][k], { unparryable: true, color: '#ff2a3a' });

// Basic attacks hit a shield; skills (and gear lightning) go through it.
export const SHIELD_PIERCING = ['spin', 'rain', 'pierce', 'nova', 'chain', 'shadow', 'dagger', 'shout'];

// Elite traits (spec §41.1): each elite rolls AFFIX_COUNT of these (no two alike). `not`: behaviours
// a trait does not fit (they already hide or teleport). Shown over the elite as "Cepat · Berlapis".
export const AFFIXES = {
  fast: { name: 'Cepat', speed: 1.5, tempo: 1 / 0.7 },                       // walks ×1.5, acts every ×0.7
  armored: { name: 'Berlapis', shield: 0.35, idle: 4, regen: 0.25 },          // shield = 35% max HP; refills 25%/s after 4 s untouched
  caller: { name: 'Pemanggil', every: 6, count: 2, max: 4, type: 'mini' },
  thorny: { name: 'Berduri', cd: 1, dmgMul: 0.5, shot: { count: 8, speed: 170, r: 5, color: '#e6c27a' } }, // thorn damage = touch damage × dmgMul
  volatile: { name: 'Meledak', radius: 110, fuse: 1, dmgMul: 2 },            // on death: a danger circle, damage × the elite's touch damage
  aura: { name: 'Beraura', every: 1.6, r: 44, fuse: 0.9, dmgMul: 0.6 },      // small bursts left behind; the biome's onHit (slow / burn / poison)
  blinker: { name: 'Penjelajah', every: 5, warn: 0.5, near: [80, 140], not: ['burrow', 'blink', 'boss', 'ambush', 'totem'] },
};
// how many traits: 1, or 2 from world level / dungeon floor on
export const AFFIX_COUNT = { base: 1, more: 2, level: 25, floor: 4 };

// Treasure guardians in the open world borrow one signature move of their zone's dungeon boss
// (spec §41.2): zone → boss. every: seconds between uses; dmgMul: × (guardian touch damage ÷ boss
// touch damage), so the move hits as hard as the guardian does, a little softer.
export const MINI_MOVES = {
  zones: { forest: 'sporeboss', ice: 'crystalboss', desert: 'tombboss', volcano: 'lavaboss', eclipse: 'boss' },
  every: [5, 7], dmgMul: 0.8, lord: 0.6, // lords (the big guardians) use it more often: every × lord
};
