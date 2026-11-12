// Cutscenes (spec §44): short scripted scenes played on a small pixel stage over the game.
// A scene is a list of steps run in order; a step waits for its time (or, for a line, for a
// tap / its reading time) unless it says `go: true` (start it and go on at once).
//   bg     { bg }                                   — the backdrop (forest, ice, desert, volcano, eclipse,
//                                                     town, dawn, past, dungeon:<id>)
//   put    { put: id, kind: hero|npc|boss|shard, x, y?, face?, view?, look?, outfit?, type?, scale? }
//   hide   { hide: id }
//   cam    { cam: [x, y, zoom], dur? }               — pan / zoom (dur 0: cut)
//   move   { move: id, to: [x, y], dur, run? }       — walk (or run) there
//   look   { look: id, face?: 1 | -1, view?: side | front | back }
//   say    { say: id | null, text, who? }            — a line (id: the speaker on stage, for the portrait)
//   panel  { panel: id, text }                       — an illustration (public/img/story_<id>.webp, or drawn)
//   title  { title, sub?, vars?, dur }               — a big title card (vars fill {n}-style holes)
//   fx     { fx: light | crack | shard | eclipse | flash | shake | motes | dawn, at?: [x, y], dur }
//   fade   { fade: in | out, dur }
//   wait   { wait: seconds }
// Text is Indonesian and goes through the i18n dictionaries (i18n/en-story.js).

export const CUTSCENE = {
  w: 480, h: 270,          // the stage in pixels (enlarged without smoothing)
  zoom: 1.7,               // stage pixels per game unit by default
  ground: 0.74,            // the ground line, a part of the stage height
  type: 38,                // letters per second as a line types in
  read: 1.2, perChar: 0.03,  // a line moves on by itself after this long (+ per letter), or on a tap
  bar: 0.12,               // the cinema bars, a part of the stage height
  walk: 70, run: 150,      // units per second
  maxLen: 45,              // seconds (a safety stop)
};

// hero: the player's own character; odo: the town elder
const odo = { kind: 'npc', look: { hair: 4, hairColor: 2 }, outfit: ['#6d6a5c', '#4a473d'], name: 'Kakek Odo', role: 'talk' };
// the townsfolk of Kota Awal (data/town.js), for the opening
const pip = { kind: 'npc', look: { hair: 0, hairColor: 5 }, outfit: ['#3fa7d6', '#2a7aa3'], name: 'Pip', role: 'talk', scale: 0.72 };
const marta = { kind: 'npc', look: { hair: 3, hairColor: 1 }, outfit: ['#c2662d', '#8f4519'], name: 'Bu Marta', role: 'inn' };
const brom = { kind: 'npc', look: { hair: 0, hairColor: 3 }, outfit: ['#7a6f66', '#57504a'], name: 'Pandai Brom', role: 'gear' };
const dara = { kind: 'npc', look: { hair: 2, hairColor: 4 }, outfit: ['#b33a3a', '#7d2424'], name: 'Dara', role: 'talk' };
const sela = { kind: 'npc', look: { hair: 3, hairColor: 0 }, outfit: ['#d4a017', '#9c7410'], name: 'Sela', role: 'talk' };

// the bosses' entrance: the hero steps in, the camera finds the boss, its name in large letters
function bossIntro(dungeon, type, name, sub, line) {
  return [
    { bg: `dungeon:${dungeon}` },
    { put: 'hero', kind: 'hero', x: -150, face: 1 },
    { put: 'boss', kind: 'boss', type, x: 120, view: 'front', scale: 1 },
    { cam: [-120, -40, 2.2], dur: 0 },
    { fade: 'in', dur: 0.5, go: true },
    { move: 'hero', to: [-90, 0], dur: 1.1 },
    { cam: [100, -60, 1.6], dur: 1.3 },
    { fx: 'shake', dur: 0.6, go: true },
    { title: name, sub, dur: 2.2 },
    { say: 'boss', text: line },
    { cam: [0, -40, 1.5], dur: 0.6 },
  ];
}

// a Seal Shard rises from what is left of the boss and comes to the hero; then a glimpse of the next place
function shard(n, place, line) {
  return [
    { bg: place },
    { put: 'hero', kind: 'hero', x: -40, face: 1, view: 'front' },
    { put: 'shard', kind: 'shard', x: 60, y: -10 },
    { cam: [10, -40, 2.2], dur: 0 },
    { fade: 'in', dur: 0.6 },
    { fx: 'light', at: [60, 0], dur: 1.2, go: true },
    { move: 'shard', to: [60, -70], dur: 1.2 },
    { fx: 'motes', at: [60, -70], dur: 1.5, go: true },
    { move: 'shard', to: [-40, -30], dur: 0.9 },
    { hide: 'shard' },
    { fx: 'flash', dur: 0.4 },
    { title: 'Pecahan Segel {n}/{max}', vars: { n, max: 5 }, dur: 1.8 },
    { say: null, who: 'Bisikan segel', text: line },
    { fade: 'out', dur: 0.6 },
  ];
}

export const SCENES = {
  // A new character's first story (about 2 minutes; skippable): the legend, the village of your birth on
  // the morning of the bonfire festival, the townsfolk, Kakek Odo's gift, then the night the seal cracks
  // and a shadow climbs out of the ground — and the road out of the gate.
  opening: { title: 'Gerhana yang Disegel', maxLen: 150, steps: [
    { panel: 'past_eclipse', text: 'Dahulu kala, sebuah gerhana hendak menelan dunia. Matahari menghitam, dan makhluk-makhluk bangkit dari bayangan.' },
    { panel: 'past_seal', text: 'Para tetua menyegelnya. Lalu segel itu mereka pecah menjadi lima, dan disembunyikan di tempat-tempat yang dalam.' },
    { panel: 'past_village', text: 'Di kaki bukit, mereka membangun sebuah desa untuk menjaga jalan menuju kelima tempat itu. Desa itu bernama Kota Awal. Di sanalah kau lahir.' },
    // the morning of the festival
    { bg: 'village' },
    { put: 'hero', kind: 'hero', x: -60, face: 1, view: 'front' },
    { put: 'pip', ...pip, x: 260, face: -1 },
    { cam: [-40, -40, 2.3], dur: 0 },
    { fade: 'in', dur: 1 },
    { title: 'Kota Awal', sub: 'Pagi hari Festival Api Unggun', dur: 2.2 },
    { move: 'pip', to: [10, 0], dur: 1.1, run: true },
    { say: 'pip', text: 'Kak! Kaaak! Bangun! Hari ini Festival Api Unggun! Kakek Odo mencarimu dari tadi!' },
    { put: 'marta', ...marta, x: -230, face: 1 },
    { move: 'marta', to: [-130, 0], dur: 1.2, go: true },
    { cam: [-80, -40, 2.1], dur: 1.2 },
    { say: 'marta', text: 'Jangan teriak pagi-pagi, Pip. …Tapi dia benar, Nak. Hari ini umurmu genap tujuh belas. Kakek Odo punya sesuatu untukmu.' },
    { look: 'hero', face: 1, view: 'side' },
    { move: 'pip', to: [380, 0], dur: 1.4, run: true, go: true },
    { move: 'hero', to: [140, 0], dur: 2.4, go: true },
    { cam: [160, -40, 2.1], dur: 2.4 },
    { put: 'brom', ...brom, x: 250, face: -1, view: 'front' },
    { put: 'dara', ...dara, x: 330, face: -1, view: 'front' },
    { say: 'brom', text: 'Masih bertangan kosong, ya? Sabar. Senjata itu memilih tuannya, bukan sebaliknya. Datang ke Pelatih kalau kau sudah siap.' },
    { say: 'dara', text: 'Mulai hari ini kau boleh keluar tembok. Jangan menangis di depan lendir pertamamu, ya. Hahaha!' },
    { fade: 'out', dur: 0.8 },
    // Kakek Odo at the bonfire
    { hide: 'marta' }, { hide: 'brom' }, { hide: 'dara' }, { hide: 'pip' },
    { put: 'odo', ...odo, x: 60, face: -1, view: 'front' },
    { put: 'hero', kind: 'hero', x: -40, face: 1, view: 'side' },
    { cam: [10, -44, 2.4], dur: 0 },
    { fx: 'fire', at: [10, 0], dur: 60, go: true },
    { fade: 'in', dur: 0.8 },
    { say: 'odo', text: 'Tujuh belas tahun lalu, di malam gerhana kecil, kau lahir di rumah dekat api unggun ini. Para tetua bilang anak yang lahir malam itu bisa merasakan segel.' },
    { say: 'odo', text: 'Mulai hari ini kau seorang Pengembara. Belum punya jalan, belum punya senjata. Tapi jalan itu akan menemukanmu.' },
    { look: 'hero', view: 'front' },
    { fx: 'motes', at: [60, -40], dur: 1.6, go: true },
    { say: 'odo', text: 'Api unggun ini tak pernah padam sejak desa ini berdiri. Selama ia menyala, kau selalu punya tempat untuk pulang.' },
    { fade: 'out', dur: 1 },
    // that night
    { bg: 'festival' },
    { put: 'pip', ...pip, x: -120, face: 1 },
    { put: 'sela', ...sela, x: 130, face: -1, view: 'front' },
    { put: 'dara', ...dara, x: 200, face: -1 },
    { put: 'marta', ...marta, x: -200, face: 1 },
    { cam: [10, -44, 2], dur: 0 },
    { fade: 'in', dur: 1 },
    { move: 'pip', to: [-60, 0], dur: 0.8, run: true, go: true },
    { say: 'sela', text: '♪ Di bawah bulan, api tak padam, desa kecil menjaga dunia… ♪' },
    { move: 'pip', to: [-130, 0], dur: 0.8, run: true, go: true },
    { say: 'marta', text: 'Sup jamur! Siapa yang mau sup jamur hangat?' },
    // the seal cracks
    { fx: 'eclipse', dur: 2, go: true },
    { fx: 'shake', dur: 1.2 },
    { say: 'pip', text: 'B-bulannya… bulannya jadi hitam!' },
    { fx: 'crack', at: [-280, 0], dur: 1.2, go: true },
    { fx: 'shake', dur: 0.8 },
    { put: 'shade', kind: 'boss', type: 'wraith', x: -330, face: 1, scale: 0.7 },
    { cam: [-150, -44, 2], dur: 0.9 },
    { move: 'shade', to: [-230, 0], dur: 1.2 },
    { move: 'pip', to: [-20, 0], dur: 0.6, run: true, go: true },
    { move: 'dara', to: [-120, 0], dur: 0.9, run: true },
    { say: 'dara', text: 'Mundur semua! Itu makhluk dari bawah tanah!' },
    { look: 'hero', face: -1, view: 'side' },
    { move: 'hero', to: [-80, 0], dur: 0.6, run: true },
    { fx: 'light', at: [-80, 0], dur: 0.9, go: true },
    { fx: 'flash', dur: 0.5 },
    { hide: 'shade' },
    { fx: 'motes', at: [-230, -20], dur: 1.4, go: true },
    { say: 'dara', text: 'Kau… kau mengusirnya hanya dengan tanganmu? Kakek Odo benar tentang dirimu.' },
    // what has to be done
    { put: 'odo', ...odo, x: 40, face: -1, view: 'front' },
    { cam: [-20, -44, 2.2], dur: 0.8 },
    { say: 'odo', text: 'Kau rasakan itu? Segel gerhana mulai retak. Makhluk di dalam tanah memakan kekuatan pecahannya.' },
    { say: 'odo', text: 'Pecahan pertama ada di Ruang Bawah Tanah Bayangan, di Hutan Kelam. Temukan gerbangnya, dan bawa pulang pecahan itu.' },
    { say: 'pip', text: 'Kakak pasti pulang, kan? Janji?' },
    { say: 'odo', text: 'Pergilah, Nak. Desa ini akan menunggumu pulang.' },
    { look: 'hero', face: -1, view: 'side' },
    { move: 'hero', to: [-320, 0], dur: 2, go: true },
    { fade: 'out', dur: 1.6 },
  ] },

  'boss:boss': { title: 'Raja Maw', steps: bossIntro('shadow', 'boss', 'Raja Maw', 'Mulut Bayangan', 'Grrr… pecahan ini milikku. Akan kutelan kau bersamanya!') },
  'boss:crystalboss': { title: 'Golem Kristal', steps: bossIntro('crystal', 'crystalboss', 'Golem Kristal', 'Penjaga Gua Beku', 'Kristal… mengingat… semuanya. Kau… akan menjadi… kristal.') },
  'boss:sporeboss': { title: 'Ratu Spora', steps: bossIntro('fungus', 'sporeboss', 'Ratu Spora', 'Ibu Hutan Busuk', 'Hirup sporaku, makhluk kecil. Kau akan tumbuh indah di hutanku.') },
  'boss:tombboss': { title: 'Raja Mumi', steps: bossIntro('tomb', 'tombboss', 'Raja Mumi', 'Penguasa Makam Pasir', 'Seribu tahun aku tidur di atas pecahan ini. Siapa berani membangunkanku?') },
  'boss:lavaboss': { title: 'Raja Lava', steps: bossIntro('lava', 'lavaboss', 'Raja Lava', 'Api yang Tak Padam', 'Gunung ini adalah tubuhku! Terbakarlah!') },
  'boss:eclipseboss': { title: 'Sang Gerhana', steps: [
    ...bossIntro('spire', 'eclipseboss', 'Sang Gerhana', 'Matahari Hitam', 'Lima kepingan… kau kumpulkan untukku. Terima kasih, pahlawan kecil.'),
    { fx: 'eclipse', dur: 1.2, go: true },
    { say: 'boss', text: 'Sekarang, biar dunia ini tenggelam dalam bayanganku!' },
  ] },

  shard1: { title: 'Pecahan Segel I', steps: shard(1, 'dungeon:shadow', 'Jauh di utara, di bawah es Padang Es, sebuah gua kristal berkilau. Pecahan kedua berdenyut di sana…') },
  shard2: { title: 'Pecahan Segel II', steps: shard(2, 'dungeon:crystal', 'Jamur-jamur tumbuh liar di ujung timur Hutan Kelam. Pecahan ketiga memberi mereka makan…') },
  shard3: { title: 'Pecahan Segel III', steps: shard(3, 'dungeon:fungus', 'Di bawah pasir merah, seorang raja tua tidur di atas pecahan keempat…') },
  shard4: { title: 'Pecahan Segel IV', steps: shard(4, 'dungeon:tomb', 'Gunung api menyala lebih terang dari biasanya. Pecahan terakhir ada di jantungnya…') },
  shard5: { title: 'Pecahan Segel V', steps: shard(5, 'dungeon:lava', 'Kelima pecahan bersatu… dan di selatan Baraapi, tanah mulai retak.') },

  // all five shards in: the pass to Tanah Gerhana opens (about 22 s)
  eclipse: { title: 'Celah Tanah Gerhana', steps: [
    { bg: 'volcano' },
    { put: 'hero', kind: 'hero', x: -120, face: 1 },
    { cam: [-40, -40, 1.8], dur: 0 },
    { fade: 'in', dur: 0.8 },
    { move: 'hero', to: [-60, 0], dur: 1.2 },
    { fx: 'shake', dur: 1.2, go: true },
    { fx: 'crack', at: [80, 0], dur: 2 },
    { fx: 'eclipse', dur: 2, go: true },
    { cam: [80, -60, 1.5], dur: 1.5 },
    { say: null, who: 'Bisikan segel', text: 'Segel itu utuh lagi… tapi yang ia kurung sudah terbangun. Di balik celah ini, Menara Gerhana menunggu.' },
    { look: 'hero', view: 'back' },
    { say: null, who: 'Bisikan segel', text: 'Bawa kelima pecahan ke puncaknya. Hanya di sana gerhana bisa disegel untuk selamanya.' },
    { fade: 'out', dur: 1 },
  ] },

  // the end: the black sun breaks, dawn comes back, Kota Awal welcomes its hero (about 40 s)
  ending: { title: 'Fajar Kembali', steps: [
    { bg: 'eclipse' },
    { put: 'boss', kind: 'boss', type: 'eclipseboss', x: 90, view: 'front' },
    { put: 'hero', kind: 'hero', x: -90, face: 1 },
    { cam: [0, -50, 1.6], dur: 0 },
    { fade: 'in', dur: 0.6 },
    { say: 'boss', text: 'Mustahil… cahaya sekecil ini…' },
    { fx: 'shake', dur: 1.4, go: true },
    { fx: 'light', at: [90, 0], dur: 1.4 },
    { fx: 'flash', dur: 0.8 },
    { hide: 'boss' },
    { bg: 'dawn' },
    { fx: 'dawn', dur: 2.5, go: true },
    { cam: [-60, -40, 2], dur: 2.5 },
    { look: 'hero', view: 'front' },
    { say: null, who: 'Bisikan segel', text: 'Gerhana tersegel. Matahari terbit lagi di atas Menara.' },
    { fade: 'out', dur: 1 },
    { bg: 'town' },
    { put: 'odo', ...odo, x: 60, face: -1, view: 'front' },
    { put: 'hero', kind: 'hero', x: -250, face: 1 },
    { cam: [20, -40, 2], dur: 0 },
    { fade: 'in', dur: 0.8 },
    { move: 'hero', to: [-20, 0], dur: 2 },
    { look: 'hero', view: 'front' },
    { say: 'odo', text: 'Kau pulang. Lihat langit itu, Nak. Terang seperti dulu.' },
    { say: 'odo', text: 'Para tetua menyegel gerhana dengan lima pecahan. Kau menyegelnya dengan keberanian. Kota ini tak akan lupa.' },
    { fx: 'motes', at: [0, -40], dur: 2, go: true },
    { title: 'Fajar Kembali', dur: 2.6 },
    { fade: 'out', dur: 1.2 },
  ] },
};

// small moments after a quest event (spec §42): built from the event (who, how they look)
export function momentScene(kind, who) {
  const person = { kind: 'npc', look: who.look, outfit: who.outfit, name: who.name, role: 'talk' };
  if (kind === 'escort') return { title: who.name, steps: [
    { bg: who.bg || 'town' },
    { put: 'npc', ...person, x: -120, face: 1 },
    { put: 'hero', kind: 'hero', x: -170, face: 1 },
    { cam: [0, -40, 2.2], dur: 0 },
    { fade: 'in', dur: 0.4 },
    { move: 'npc', to: [30, 0], dur: 1.4, go: true },
    { move: 'hero', to: [-30, 0], dur: 1.4 },
    { look: 'npc', face: -1, view: 'front' },
    { say: 'npc', text: 'Kita sampai! Tanpamu aku sudah jadi santapan mereka. Terima kasih!' },
    { fade: 'out', dur: 0.5 },
  ] };
  return { title: who.name, steps: [ // rescue
    { bg: who.bg || 'forest' },
    { put: 'npc', ...person, x: 20, face: -1, view: 'front' },
    { put: 'hero', kind: 'hero', x: -70, face: 1 },
    { cam: [-20, -40, 2.2], dur: 0 },
    { fade: 'in', dur: 0.4 },
    { say: 'npc', text: 'Kau datang! Kukira aku tak akan pernah keluar dari kandang itu.' },
    { look: 'npc', face: 1, view: 'side' },
    { move: 'npc', to: [260, 0], dur: 1.6, run: true, go: true },
    { say: 'npc', text: 'Aku pulang dulu! Temui aku di kota, ya!' },
    { fade: 'out', dur: 0.5 },
  ] };
}

// memories (Jurnal → Kenangan): the scenes a character has already lived through, in story order
export const MEMORIES = [
  { id: 'opening', when: () => true },
  { id: 'boss:boss', when: (c) => c.found.includes('shadow') || (c.records.dungeons.shadow?.clears || 0) > 0 },
  { id: 'shard1', when: (c) => c.quests.main.ch >= 1 },
  { id: 'boss:crystalboss', when: (c) => (c.records.dungeons.crystal?.clears || 0) > 0 },
  { id: 'shard2', when: (c) => c.quests.main.ch >= 2 },
  { id: 'boss:sporeboss', when: (c) => (c.records.dungeons.fungus?.clears || 0) > 0 },
  { id: 'shard3', when: (c) => c.quests.main.ch >= 3 },
  { id: 'boss:tombboss', when: (c) => (c.records.dungeons.tomb?.clears || 0) > 0 },
  { id: 'shard4', when: (c) => c.quests.main.ch >= 4 },
  { id: 'boss:lavaboss', when: (c) => (c.records.dungeons.lava?.clears || 0) > 0 },
  { id: 'shard5', when: (c) => c.quests.main.ch >= 5 },
  { id: 'eclipse', when: (c) => c.quests.main.ch >= 5 },
  { id: 'boss:eclipseboss', when: (c) => (c.records.dungeons.spire?.clears || 0) > 0 },
  { id: 'ending', when: (c) => !!c.records.ending },
];
