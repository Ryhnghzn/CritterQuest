// Puts the English names & descriptions into the game data (spec §23). Runs
// once at start-up, before anything renders, when the language is English —
// switching language reloads the page, so data never needs switching back.
// Each map is keyed by the Indonesian text, so reordering the data is harmless;
// a text missing from its map stays Indonesian.
import { getLang } from '../i18n.js';
import { CLASSES } from '../data/classes.js';
import { RARITIES, SLOTS, VARIANTS, BONUSES, EFFECTS, UNIQUES, CHESTS } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';
import { DUNGEONS } from '../data/dungeons.js';
import { POTIONS } from '../data/potions.js';
import { MATS, GEMS, GEM_TIER_NAMES } from '../data/forge.js';
import { TALENTS } from '../data/talents.js';
import { UPGRADES } from '../data/shop.js';
import { ATTRS } from '../data/balance.js';
import { PHASES } from '../data/time.js';
import { TOWN_DEFS } from '../data/towns.js';
import { HAIR_NAMES, HAIR_COLOR_NAMES } from '../art/doll.js';
import { MARK_SHOP } from '../data/bounties.js';
import { REGIONS, TOWNS } from '../data/world.js';
import { MAIN, SIDE, HIDDEN, DROP_ITEMS } from '../data/quests.js';

export const CLASS_EN = {
  'Tebal darah, tebasan jarak dekat.': 'Thick-blooded, cleaves up close.',
  'Panah jarak jauh, lincah.': 'Long-range arrows, nimble.',
  'Sihir area yang sakit, tapi rapuh.': 'Painful area magic, but fragile.',
  'Cepat, kritis tinggi, tusukan beruntun.': 'Fast, high crit, rapid stabs.',
};

export const SKILL_EN = {
  'Putaran Pedang': 'Blade Spin',
  'Berputar menebas sekeliling 5×220%, menarik musuh.': 'Spin and slash all around for 5×220%, pulling enemies in.',
  'Teriakan Baja': 'Iron Shout',
  'Damage diterima −60% selama 5 detik + gelombang kejut 250%.': 'Damage taken −60% for 5 seconds + a 250% shockwave.',
  'Retakan Bumi': 'Fissure',
  'Retakan menjalar ke arah bidik: 5 pilar batu-api meletus berurutan, masing-masing 120%, melempar & membekukan sesaat.': 'A crack races along your aim: 5 stone-and-fire pillars erupt one after another, 120% each, knocking back & briefly freezing.',
  'Terjang': 'Charge',
  'Menerjang 220 px, 320% ke yang dilewati, kebal saat menerjang. Membunuh = siap lagi.': 'Charge 220 px, 320% to everything passed, invulnerable while charging. A kill makes it ready again.',
  'Kapak Bumerang': 'Boomerang Axe',
  'Kapak besar berputar maju lalu kembali ke pemain, 2×200%; menyeret musuh yang dilewati.': 'A huge axe spins out and returns to you, 2×200%; drags along the enemies it passes.',
  'Amarah Perang': 'War Fury',
  'ATK +35%, kecepatan serang +30% selama 6 detik.': 'ATK +35%, attack speed +30% for 6 seconds.',
  'Badai Pedang': 'Bladestorm',
  'Berputar liar 2,5 detik: 10×300% di area besar, menarik musuh, damage diterima −50%.': 'Spin wildly for 2.5 seconds: 10×300% in a large area, pulling enemies in, damage taken −50%.',
  'Hujan Panah': 'Arrow Rain',
  'Hujan panah di titik bidik, 6×160%.': 'Arrows rain on the aimed spot, 6×160%.',
  'Panah Naga': 'Dragon Arrow',
  'Tahan napas sebentar, lalu naga cahaya menembus semua musuh, 600%, dan meninggalkan jejak terbakar 2 detik.': 'Hold your breath, then a dragon of light pierces every enemy, 600%, leaving a burning trail for 2 seconds.',
  'Panah Pecah': 'Shatter Volley',
  '3 panah; setelah melaju sejauh 160 px tiap panah pecah jadi 3 (9 total), masing-masing 120%.': '3 arrows; after 160 px each one bursts into 3 (9 in all), 120% each.',
  'Lompatan Mundur': 'Backflip',
  'Melompat menjauh dari bidikan, meninggalkan ledakan es yang membekukan.': 'Leap away from your aim, leaving a freezing ice burst behind.',
  'Ladang Jebakan': 'Trap Field',
  'Jebakan duri di titik bidik 4 detik: 8×90%, memperlambat.': 'Spike traps on the aimed spot for 4 seconds: 8×90%, slowing.',
  'Mata Elang': 'Hawk Eye',
  'Kritis +30%, kecepatan serang +25% selama 6 detik.': 'Crit +30%, attack speed +25% for 6 seconds.',
  'Hujan Bintang': 'Starfall',
  'Hujan panah bintang 3 detik di area sangat luas: 12×250%, memperlambat.': 'Star-arrows rain for 3 seconds over a huge area: 12×250%, slowing.',
  'Nova Es': 'Frost Nova',
  'Ledakan es di sekeliling: 300%, membekukan 1,5 detik, mendorong.': 'An ice blast all around: 300%, freezes for 1.5 seconds, knocks back.',
  'Badai Petir': 'Thunderstorm',
  'Awan petir menyambar 8 musuh berurutan, masing-masing 350%.': 'A storm cloud strikes 8 enemies one after another, 350% each.',
  'Meteor': 'Meteor',
  'Meteor jatuh di titik bidik: 600% area besar.': 'A meteor strikes the aimed spot: 600% in a large area.',
  'Teleportasi': 'Blink',
  'Berpindah seketika 230 px ke arah bidikan.': 'Instantly teleport 230 px toward your aim.',
  'Matahari Kecil': 'Miniature Sun',
  'Bola api raksasa melaju pelan membakar jalurnya; meledak 300% di area luas dan menebar 6 serpihan api 120%.': 'A giant fireball drifts forward, scorching its path; it bursts for 300% over a wide area and scatters 6 fire shards at 120%.',
  'Perisai Mana': 'Mana Shield',
  'Damage diterima −55% dan ATK +20% selama 7 detik.': 'Damage taken −55% and ATK +20% for 7 seconds.',
  'Hujan Meteor': 'Meteor Storm',
  'Meteor berjatuhan 2,4 detik: 6×600% di area luas, mendorong.': 'Meteors rain down for 2.4 seconds: 6×600% over a wide area, knocking back.',
  'Langkah Bayangan': 'Shadow Step',
  'Melesat 180 px, 500% ke yang dilewati, kebal.': 'Dash 180 px, 500% to everything passed, invulnerable.',
  'Lingkaran Belati': 'Dagger Circle',
  '11 belati melayang melingkar di sekitarmu, lalu melesat berputar ke luar, masing-masing 180%.': '11 daggers float in a ring around you, then shoot outward in a spiral, 180% each.',
  'Kabut Racun': 'Poison Cloud',
  'Kabut racun di titik bidik 3 detik: 8×90%.': 'A poison cloud on the aimed spot for 3 seconds: 8×90%.',
  'Bom Asap': 'Smoke Bomb',
  'Asap membekukan musuh sekitar 1,2 detik; damage diterima −40% selama 4 detik.': 'Smoke freezes nearby enemies for 1.2 seconds; damage taken −40% for 4 seconds.',
  'Shuriken Raksasa': 'Giant Shuriken',
  'Shuriken raksasa mengitarimu 3 detik, menebas 80% tiap 0,25 detik, lalu dilempar ke bidikan menembus semua musuh 300%.': 'A giant shuriken circles you for 3 seconds, slicing 80% every 0.25 seconds, then is hurled at your aim piercing every enemy for 300%.',
  'Naluri Pembunuh': 'Killer Instinct',
  'Kritis +40% dan damage kritis +60% selama 6 detik.': 'Crit +40% and crit damage +60% for 6 seconds.',
  'Tarian Seribu Bayangan': 'Dance of a Thousand Shadows',
  'Kebal 2 detik sambil menebas semua di sekitar: 12×260%.': 'Invulnerable for 2 seconds while slashing everything nearby: 12×260%.',
};

const RARITY_EN = { Biasa: 'Common', Bagus: 'Uncommon', Langka: 'Rare', Epik: 'Epic', Legendaris: 'Legendary', Mitos: 'Mythic' };
const SLOT_EN = { Senjata: 'Weapon', Helm: 'Helmet', Armor: 'Armor', Sepatu: 'Boots', Kalung: 'Amulet', Cincin: 'Ring' };

export const VARIANT_EN = {
  'Pedang Kayu': 'Wooden Sword', 'Pedang Besi': 'Iron Sword', 'Pedang Baja': 'Steel Sword', 'Pedang Ksatria': "Knight's Sword",
  'Pedang Runa': 'Rune Sword', 'Pedang Obsidian': 'Obsidian Sword', 'Pedang Naga': 'Dragon Sword',
  'Busur Ranting': 'Twig Bow', 'Busur Pemburu': "Hunter's Bow", 'Busur Komposit': 'Composite Bow', 'Busur Elang': 'Hawk Bow',
  'Busur Runa': 'Rune Bow', 'Busur Bayangan': 'Shadow Bow', 'Busur Phoenix': 'Phoenix Bow',
  'Tongkat Kayu': 'Wooden Staff', 'Tongkat Kristal': 'Crystal Staff', 'Tongkat Bulan': 'Moon Staff', 'Tongkat Bintang': 'Star Staff',
  'Tongkat Runa': 'Rune Staff', 'Tongkat Kehampaan': 'Void Staff', 'Tongkat Matahari': 'Sun Staff',
  'Belati Karat': 'Rusty Dagger', 'Belati Besi': 'Iron Dagger', 'Belati Racun': 'Venom Dagger', 'Belati Senyap': 'Silent Dagger',
  'Belati Runa': 'Rune Dagger', 'Belati Malam': 'Night Dagger', 'Belati Taring Naga': 'Dragonfang Dagger',
  'Topi Kulit': 'Leather Cap', 'Helm Besi': 'Iron Helm', 'Helm Bertanduk': 'Horned Helm', 'Helm Ksatria': "Knight's Helm",
  'Mahkota Runa': 'Rune Circlet', 'Helm Obsidian': 'Obsidian Helm', 'Helm Naga': 'Dragon Helm',
  'Rompi Kain': 'Cloth Vest', 'Zirah Kulit': 'Leather Armor', 'Zirah Rantai': 'Chainmail', 'Zirah Pelat': 'Plate Armor',
  'Zirah Runa': 'Rune Armor', 'Zirah Obsidian': 'Obsidian Armor', 'Zirah Sisik Naga': 'Dragonscale Armor',
  'Sandal Jerami': 'Straw Sandals', 'Sepatu Kulit': 'Leather Boots', 'Sepatu Besi': 'Iron Boots', 'Sepatu Pengembara': "Wanderer's Boots",
  'Sepatu Runa': 'Rune Boots', 'Sepatu Bayangan': 'Shadow Boots', 'Sepatu Angin': 'Windwalkers',
  'Kalung Tulang': 'Bone Necklace', 'Kalung Perak': 'Silver Amulet', 'Kalung Taring': 'Fang Necklace', 'Kalung Mata Kucing': "Cat's Eye Amulet",
  'Kalung Runa': 'Rune Amulet', 'Kalung Bulan Darah': 'Blood Moon Amulet', 'Kalung Bintang Jatuh': 'Falling Star Amulet',
  'Cincin Tembaga': 'Copper Ring', 'Cincin Perak': 'Silver Ring', 'Cincin Emas': 'Gold Ring', 'Cincin Safir': 'Sapphire Ring',
  'Cincin Runa': 'Rune Ring', 'Cincin Kegelapan': 'Ring of Darkness', 'Cincin Abadi': 'Eternal Ring',
};

// bonus stat label & name suffix (in English the suffix becomes an adjective in front)
const LABEL_EN = { 'HP maks': 'Max HP', 'Kec. serang': 'Attack speed', Kritis: 'Crit', 'Dmg kritis': 'Crit damage', Gerak: 'Move speed' };
const SUFFIX_EN = { Ganas: 'Savage', Kokoh: 'Sturdy', Baja: 'Steeled', Kilat: 'Swift', Tajam: 'Keen', Maut: 'Deadly', Angin: 'Windborne', Bijak: 'Wise', Pemikat: 'Alluring' };

const EFFECT_EN = {
  lifesteal: 'Converts {v}% of damage dealt into HP',
  thorns: 'Attackers are pricked by thorns for {v}% ATK',
  chain: '{v}% of attacks arc lightning to the nearest enemy',
  execute: 'Damage +{v}% against enemies below 30% HP',
  shield: 'Shield of {v}% max HP every 10 seconds',
  regen: 'Regenerate {v}% max HP per second',
  goldfind: 'Coins +{v}%',
  expfind: 'EXP +{v}%',
  dodgecd: 'Dodge cooldown −{v}%',
  frenzy: 'Attack speed +{v}% while below 50% HP',
  bossdmg: 'Damage +{v}% against bosses & elites',
  explode: 'Slain enemies explode ({v}% ATK)',
  phoenix: 'Once per trip: rise again with {v}% HP',
};

const UNIQUE_EN = {
  'Pedang Fajar': 'Dawnblade', 'Busur Angin Utara': 'Northwind Bow', 'Tongkat Bara Abadi': 'Everember Staff', 'Belati Bulan Sabit': 'Crescent Dagger',
  'Mahkota Raja Lendir': 'Crown of the Slime King', 'Helm Tanduk Gelap': 'Darkhorn Helm', 'Zirah Duri Hitam': 'Black Thorn Armor', 'Jubah Penjaga': "Warden's Mantle",
  'Sepatu Kabut': 'Mistwalkers', 'Kalung Mata Naga': "Dragon's Eye Amulet", 'Liontin Keserakahan': 'Pendant of Greed', 'Cincin Sang Bijak': "Sage's Ring", 'Cincin Amarah': 'Ring of Wrath',
  'Taring Raja Maw': "King Maw's Fang", 'Busur Bintang Jatuh': 'Fallen Star Bow', 'Tongkat Kiamat': 'Staff of Ruin', 'Belati Ketiadaan': 'Voidpiercer',
  'Cincin Phoenix': 'Phoenix Ring', 'Zirah Raja Maw': "King Maw's Carapace", 'Mahkota Bayangan': 'Crown of Shadows',
  'Mahkota Fajar': 'Crown of Dawn', 'Kalung Akar Tua': 'Old Root Necklace', 'Cincin Bintang Beku': 'Frozen Star Ring', 'Topeng Pasir Abadi': 'Mask of Endless Sand', 'Zirah Sisik Kawah': 'Crater Scale Armor',
};
const CHEST_EN = { 'Peti Gear': 'Gear Chest', 'Peti Agung': 'Grand Chest' };

const REGION_EN = { 'Tanah Gerhana': 'Eclipse Lands', 'Hutan Kelam': 'Gloomwood', 'Padang Es': 'Frost Plains', 'Gurun Merah': 'Red Desert', 'Gunung Api': 'Fire Mountain' };
const TOWN_EN = { 'Kota Awal': 'Hometown', Rimbawana: 'Wildwood', Bekubara: 'Frosthold', Pasirluas: 'Sandreach', Baraapi: 'Emberfall' };

const MARK_EN = {
  'Peti Lencana': ['Badge Chest', '1 Epic gear piece'],
  'Kristal Arkana ×5': ['Arcane Crystal ×5', 'Forging material for +5 and up'],
  'Inti Kegelapan': ['Dark Core', 'Forging material for +10 and up'],
  'Permata acak': ['Random gem', '1 gem of Common tier'],
  'Debu Rune ×20': ['Rune Dust ×20', 'Forging material'],
};

const ENEMY_EN = {
  'Sang Gerhana': 'The Eclipse', 'Lendir Hampa': 'Void Slime', 'Kelelawar Gerhana': 'Eclipse Bat', 'Katak Hampa': 'Void Frog', 'Golem Gerhana': 'Eclipse Golem', 'Hantu Gerhana': 'Eclipse Wraith',
  Lendir: 'Ooze', Kelelawar: 'Bat', Golem: 'Golem', 'Lendir Kecil': 'Oozeling', 'Katak Ludah': 'Spitting Toad', 'Babi Batu': 'Stone Boar',
  'Dukun Tengkorak': 'Skull Shaman', 'Peri Lumut': 'Moss Wisp', 'Jamur Bom': 'Bomb Shroom', 'Kura Baja': 'Iron Tortoise',
  'Raja Maw': 'King Maw', 'Golem Kristal': 'Crystal Golem', 'Ratu Spora': 'Spore Queen', 'Raja Lava': 'Lava King',
  'Serigala Bayang': 'Shadow Wolf', 'Lendir Beku': 'Frost Ooze', 'Katak Salju': 'Snow Toad', 'Golem Es': 'Ice Golem', 'Roh Es': 'Frost Wisp',
  'Lendir Pasir': 'Sand Ooze', 'Burung Nasar': 'Vulture', Kalajengking: 'Scorpion', 'Cacing Pasir': 'Sandworm',
  'Lendir Magma': 'Magma Ooze', 'Jamur Bara': 'Ember Shroom', 'Imp Api': 'Fire Imp', 'Raja Mumi': 'Mummy King',
};
const PHASE_NAME_EN = { 'Matahari Hitam': 'Black Sun', 'GERHANA!': 'ECLIPSE!', 'KEHAMPAAN!': 'THE VOID!' };
const DUNGEON_EN = {
  'Menara Gerhana': ['Eclipse Spire', 'Spire'], 'Ruang Bawah Tanah Bayangan': ['Shadow Crypt', 'Shadow'], 'Gua Kristal': ['Crystal Cave', 'Crystal'],
  'Hutan Jamur Busuk': ['Rotting Mushroom Forest', 'Fungus'], 'Benteng Lava': ['Lava Fortress', 'Lava'], 'Makam Pasir': ['Sand Tomb', 'Tomb'],
};
const POTION_EN = {
  'Ramuan Merah': ['Red Potion', 'Restores 40% HP'], 'Ramuan Besar': ['Greater Potion', 'Restores 80% HP'],
  'Ramuan Perisai': ['Shield Potion', 'Shield of 30% max HP for 8 seconds'],
  'Ramuan Angin': ['Wind Potion', 'Move speed +35%, dodge cooldown −50% for 10 seconds'],
  'Ramuan Amuk': ['Rage Potion', 'ATK +30%, attack speed +20% for 10 seconds'],
};
const MAT_EN = { 'Debu Rune': 'Rune Dust', 'Kristal Arkana': 'Arcane Crystal', 'Inti Kegelapan': 'Dark Core' };
const GEM_EN = { Rubi: 'Ruby', Zamrud: 'Emerald', Berlian: 'Diamond', Topas: 'Topaz', Kecubung: 'Amethyst', Safir: 'Sapphire' };
const GEM_TIER_EN = { Retak: 'Chipped', Biasa: 'Flawed', Jernih: 'Clear', Sempurna: 'Flawless', Agung: 'Royal' };
const TALENT_EN = {
  Kekuatan: ['Might', 'ATK +3%'], Ketahanan: ['Vigor', 'Max HP +4%'], Ketajaman: ['Precision', 'Crit +1.5%'],
  'Fokus Sihir': ['Arcane Focus', 'Skill damage +8%'], 'Aliran Energi': ['Energy Flow', 'Energy from attacks +10%'],
  Kegesitan: ['Evasion', 'Dodge cooldown −6%'], 'Dahaga Darah': ['Bloodthirst', 'Converts 0.6% of damage into HP'],
  Keberuntungan: ['Fortune', 'Coins & EXP +5%'],
};
const UPGRADE_EN = {
  'Latihan Daya Tahan': ['Endurance Training', 'Max HP +6%'], 'Latihan Tempur': ['Combat Training', 'ATK +5%'],
  'Latihan Kepekaan': ['Awareness Training', 'Magnet +20'],
};
const ATTR_EN = {
  'ATK +1': 'ATK +1', 'HP maks +8, DEF +0,25': 'Max HP +8, DEF +0.25', 'Kec. serang +1,5%, gerak +0,8': 'Attack speed +1.5%, move +0.8',
  'Kritis +0,5%, CDR +0,4%': 'Crit +0.5%, CDR +0.4%', 'Dmg kritis +2%, magnet +2': 'Crit damage +2%, magnet +2',
};
const PHASE_EN = { Pagi: 'Morning', Siang: 'Day', Sore: 'Evening', Malam: 'Night' };
const HAIR_EN = { Pendek: 'Short', Jabrik: 'Spiky', Panjang: 'Long', Bob: 'Bob', Kuncir: 'Ponytail' };
const HAIR_COLOR_EN = { Hitam: 'Black', Cokelat: 'Brown', Pirang: 'Blond', Merah: 'Red', Biru: 'Blue', Putih: 'White' };

const BUILDING_EN = {
  Penginapan: 'Inn', 'Toko Ramuan': 'Potion Shop', 'Pandai Besi': 'Smithy', 'Balai Petualang': "Adventurers' Hall", 'Tukang Cukur': 'Barber',
  'Pandai Senjata': 'Weaponsmith', 'Penjahit Zirah': 'Armorer', 'Toko Perhiasan': 'Jeweller', Gudang: 'Storehouse', 'Pedagang Bahan': 'Materials Trader',
};
// honorifics of the big towns' people: 'Pak Rimbun' → 'Mr. Rimbun'
const HONORIFIC_EN = [
  ['Penjaga ', 'Warden '], ['Prajurit ', 'Guard '], ['Guru ', 'Master '], ['Kapten ', 'Captain '], ['Tabib ', 'Healer '],
  ['Nenek ', 'Granny '], ['Ibu ', 'Madam '], ['Nona ', 'Miss '], ['Bu ', 'Mrs. '], ['Pak ', 'Mr. '], ['Mak ', 'Ma '], ['Bang ', ''],
];
const nameEn = (name) => {
  if (name.startsWith('Pandai ')) return `${name.slice(7)} the Smith`;
  const h = HONORIFIC_EN.find(([id]) => name.startsWith(id));
  return h ? h[1] + name.slice(h[0].length) : name;
};
const NPC_NAME_EN = {
  'Penjaga Rolan': 'Warden Rolan', 'Bang Rudi': 'Rudi', 'Kakek Odo': 'Old Odo', 'Prajurit Gani': 'Guard Gani', 'Bu Marta': 'Mrs. Marta',
  'Petualang Lelah': 'Weary Adventurer', 'Nenek Mira': 'Granny Mira', 'Pandai Brom': 'Brom the Smith', 'Guru Hadi': 'Master Hadi', 'Kapten Vera': 'Captain Vera',
  'Batu Teleport': 'Teleport Stone', 'Sela Api': 'Sela Fire',
};
const NPC_TITLE_EN = {
  Petualang: 'Adventurer', 'Tetua Kota': 'Town Elder', 'Anak Kota': 'Town Kid', 'Penjaga Kota': 'Town Guard', 'Penyanyi Keliling': 'Wandering Bard',
  Tamu: 'Guest', 'Pedagang Keliling': 'Travelling Merchant', 'Murid Penyihir': 'Mage Apprentice', 'Murid Pandai Besi': 'Smith Apprentice',
  'Ketua Balai': 'Hall Master', Pemanah: 'Archer', Penyihir: 'Mage', Ksatria: 'Knight',
  Pemburu: 'Hunter', 'Penjual Bunga': 'Flower Seller', Pengelana: 'Wanderer', 'Nelayan Es': 'Ice Fisher', 'Pemahat Es': 'Ice Carver',
  Kafilah: 'Caravaneer', Penari: 'Dancer', Penambang: 'Miner', 'Pandai Kaca': 'Glassblower',
};
export const NPC_LINE_EN = {
  "Di Hutan Kelam bagian timur, musuhnya jauh lebih galak. Hati-hati.": "In the east of Gloomwood the enemies are far fiercer. Careful.",
  "Rimbawana dibangun di atas akar pohon tertua di hutan ini.": "Wildwood was built on the roots of the oldest tree in this forest.",
  "Bunga kunang-kunang hanya mekar di malam hari. Cantik, kan?": "Firefly blossoms only bloom at night. Pretty, aren't they?",
  "Pedagang di sini menjual barang lebih bagus dari Kota Awal, tapi lebih mahal juga.": "Merchants here sell better goods than Hometown, but pricier too.",
  "Batu teleport itu bisa membawamu ke kota mana pun yang pernah kau datangi!": "That teleport stone can take you to any town you've been to!",
  "Aku pernah lihat jamur raksasa di ujung timur hutan. Sumpah!": "I once saw a giant mushroom at the east end of the forest. I swear!",
  "Gerbang selatan menuju Hutan Kelam. Jalan ke Kota Awal ada di ujung baratnya.": "The south gate leads to Gloomwood. The road to Hometown is at its west end.",
  "Malam hari kawanan musuh di hutan bertambah banyak.": "At night more packs of enemies roam the forest.",
  "Kudengar ada dungeon tersembunyi di Hutan Kelam. Gerbangnya berbeda bagi tiap orang.": "I hear there are hidden dungeons in Gloomwood. Their gates are different for everyone.",
  "Gudang di sini menyimpan barangmu, dan bisa kau ambil di kota besar mana pun.": "The storehouse here keeps your things, and you can collect them in any big town.",
  "Danau di Padang Es membeku keras. Tapi jangan berdiri terlalu lama di atasnya.": "The lakes of the Frost Plains are frozen hard. Still, don't stand on them too long.",
  "Sup ikan Bu Hangat adalah alasan aku masih hidup.": "Mrs. Hangat's fish soup is the reason I'm still alive.",
  "Patung esku meleleh tiap siang. Jadi aku memahat lagi tiap pagi.": "My ice statues melt every noon. So I carve them again every morning.",
  "Gua Kristal ada di sisi barat Padang Es. Kristalnya berkilau seperti bintang.": "The Crystal Cave is on the west side of the Frost Plains. Its crystals sparkle like stars.",
  "Mau perang bola salju? Ah, kau sibuk ya…": "Snowball fight? Ah, you're busy…",
  "Ayahku bilang golem kristal itu dulunya manusia. Seram!": "My dad says the crystal golem used to be a person. Creepy!",
  "Bekubara tidak pernah jatuh. Dinginnya saja sudah mengusir musuh.": "Frosthold has never fallen. The cold alone drives enemies away.",
  "Gerbang selatan menuju Padang Es.": "The south gate leads to the Frost Plains.",
  "Etalase di sini lebih banyak barang Langka. Lihat-lihat dulu sebelum pergi.": "The displays here hold more Rare goods. Have a look before you go.",
  "Kalau tumbang di Padang Es, kau bangun di kota terakhir yang kau datangi.": "Fall in the Frost Plains and you wake in the last town you visited.",
  "Untaku hilang di Gurun Merah. Kalau kau melihatnya, jangan dimakan.": "My camel is lost in the Red Desert. If you see it, please don't eat it.",
  "Oase di gurun itu nyata. Fatamorgana juga nyata. Bedanya, yang satu bisa diminum.": "Oases in the desert are real. So are mirages. The difference: you can drink one of them.",
  "Pasirluas tidak pernah tidur. Pasar malamnya paling ramai di negeri ini.": "Sandreach never sleeps. Its night market is the busiest in the land.",
  "Konon ada makam kuno di bawah pasir, penuh harta dan kutukan.": "They say an ancient tomb lies under the sand, full of treasure and curses.",
  "Aku bisa berjalan di pasir panas tanpa sandal! Aw, aw, aw.": "I can walk on hot sand without sandals! Ow, ow, ow.",
  "Kak, kakak pernah melihat kalajengking raksasa?": "Hey, have you ever seen a giant scorpion?",
  "Gerbang selatan menuju Gurun Merah. Bawa ramuan yang cukup.": "The south gate leads to the Red Desert. Bring enough potions.",
  "Siang di gurun panas, malamnya lebih berbahaya.": "Desert days are hot; its nights are more dangerous.",
  "Pedagang di sini menjual barang Epik. Mahal, tapi pantas.": "Merchants here sell Epic goods. Expensive, but worth it.",
  "Teleport ke Kota Awal murah. Ke sini dari sana yang mahal.": "Teleporting to Hometown is cheap. Coming here from there is what costs.",
  "Batu di Gunung Api masih hangat. Sebagian masih bergerak.": "The rocks of Fire Mountain are still warm. Some of them still move.",
  "Benteng Lava ada di sisi barat gunung. Rajanya tidur di kolam api.": "The Lava Fortress is on the mountain's west side. Its king sleeps in a pool of fire.",
  "Kaca terbaik dibuat dari pasir gurun dan api gunung ini.": "The finest glass is made of desert sand and this mountain's fire.",
  "Baraapi adalah kota terakhir. Di sini, barang Legendaris dijual di etalase.": "Emberfall is the last town. Here, Legendary goods sit on the displays.",
  "Aku tidak takut api! …Tapi aku takut gelap.": "I'm not scared of fire! …But I'm scared of the dark.",
  "Kalau sudah besar aku mau jadi pandai besi seperti Pandai Magma!": "When I grow up I want to be a smith like Magma the Smith!",
  "Gerbang selatan menuju Gunung Api. Hanya yang terkuat yang kembali.": "The south gate leads to Fire Mountain. Only the strongest come back.",
  "Hujan abu lagi. Tutup mulutmu kalau berjalan.": "Ash rain again. Keep your mouth shut when you walk.",
  "Aku datang ke sini lewat batu teleport. Berjalan kaki? Tidak, terima kasih.": "I came here by teleport stone. Walking? No, thank you.",
  "Gunung Api: level 30 sampai 50. Jangan sok berani.": "Fire Mountain: level 30 to 50. Don't be a hero.",
  'Lendir itu lambat, tapi jangan biarkan mereka mengepungmu.': "Oozes are slow, but don't let them surround you.",
  'Kalau lantai sudah bersih, ambil dulu semua permata sebelum masuk portal.': 'Once a floor is clear, grab every gem before stepping into the portal.',
  'Musuh yang bersinar emas itu elite. Kuat, tapi selalu menjatuhkan barang bagus.': 'Enemies glowing gold are elites. Tough, but they always drop good loot.',
  'Aku pernah sampai Lantai 4… lalu golem itu menginjakku. Hahaha.': 'I once made it to Floor 4… then a golem stepped on me. Hahaha.',
  'Dulu Ruang Bawah Tanah itu gudang anggur. Sampai Raja Maw bangun dari tidurnya.': 'That crypt used to be a wine cellar. Until King Maw woke from his slumber.',
  'Raja Maw menunggu di lantai paling dalam. Bawa ramuan perisai, Nak.': 'King Maw waits on the deepest floor. Bring shield potions, child.',
  'Api unggun ini tak pernah padam sejak kota ini berdiri.': 'This bonfire has never gone out since the town was founded.',
  'Kak! Kak! Kakak petualang ya? Keren!': "Hey! Hey! You're an adventurer, right? So cool!",
  'Nenek Mira bilang ramuan amuk bikin orang jadi galak. Aku mau coba!': 'Granny Mira says rage potions make people mean. I wanna try one!',
  'Kalau besar nanti aku mau jadi pemanah seperti Kak Ruko.': "When I grow up I'm gonna be an archer like Ruko.",
  'Malam ini tenang. Semoga tetap begitu.': "Quiet night. Let's hope it stays that way.",
  'Pandai Brom menjual peti gear. Peti Agung mahal, tapi isinya bisa Mitos!': "Brom sells gear chests. Grand Chests are pricey, but they can hold Mythic gear!",
  'Jangan berkeliaran di dekat gerbang kalau HP-mu tipis.': "Don't loiter near the gate when your HP is low.",
  '♪ Di bawah tanah gelap gulita, sang petualang mencari cahaya… ♪': '♪ Deep below in pitch-black night, the wanderer seeks the light… ♪',
  'Lagu baruku tentang pahlawan yang mengalahkan Raja Maw. Mungkin tentangmu?': "My new song is about the hero who slays King Maw. Maybe it's about you?",
  'Penginapan Bu Marta punya sup terbaik di seluruh negeri.': "Mrs. Marta's inn serves the best soup in the land.",
  'Zzz… hah? Oh. Aku baru pulang dari Lantai 3. Lenganku masih gemetar.': "Zzz… huh? Oh. Just got back from Floor 3. My arms are still shaking.",
  'Tidur di sini memulihkan HP penuh. Mahal sedikit, tapi sepadan.': 'Sleeping here restores your HP fully. A bit pricey, but worth it.',
  'Barang dari dungeon laku keras di kota sebelah. Simpan yang langka-langka!': 'Dungeon loot sells like hot bread in the next town. Keep the rare ones!',
  'Kudengar ada cincin yang bisa membangkitkan orang mati. Cincin Phoenix namanya.': 'I hear there is a ring that brings the dead back to life. The Phoenix Ring.',
  'Ramuan Perisai itu menyerap pukulan. Pas untuk melawan bos!': 'Shield Potions soak up hits. Perfect against bosses!',
  'Ramuan Angin bikin kakimu ringan, dodge-mu juga lebih cepat siap.': 'Wind Potions make your feet light, and your dodge comes back sooner.',
  'Aku sedang belajar menyeduh Ramuan Besar. Baru meledak tiga kali.': "I'm learning to brew Greater Potions. Only blown up three times so far.",
  'Gear rongsokan dari dungeon bisa dijual ke Guru Brom. Lumayan buat beli ramuan.': 'You can sell junk gear from the dungeon to Master Brom. Good for potion money.',
  'Gear dari dungeon dipasang lewat panel Karakter, tab Gear.': 'Equip dungeon gear from the Character panel, Gear tab.',
  'Gear Mitos itu merah menyala. Aku belum pernah lihat langsung.': "Mythic gear glows blood red. I've never seen one myself.",
  'Selamat datang di Balai Petualang. Papan tugas akan segera dibuka.': "Welcome to the Adventurers' Hall. The quest board opens soon.",
  'Kau bisa melanjutkan dari lantai terdalam yang pernah kau capai. Bilang saja ke Rolan di gerbang.': "You can continue from the deepest floor you've reached. Just tell Rolan at the gate.",
  'Kepala di dinding itu? Replika. Raja Maw yang asli masih hidup di bawah sana.': 'That head on the wall? A replica. The real King Maw still lives down there.',
  'Jaga jarak, tembak, mundur. Itu rahasia pemanah.': "Keep your distance, shoot, fall back. That's the archer's secret.",
  'LUK menaikkan peluang barang langka. Aku menaruh semua poinku di sana… mungkin terlalu banyak.': 'LUK raises the chance of rare loot. I put all my points there… maybe too many.',
  'Nova Es membekukan semua di sekitarmu. Pakai saat terkepung.': 'Frost Nova freezes everything around you. Use it when surrounded.',
  'DEX memperpendek jeda skill. Penyihir sangat butuh itu.': 'DEX shortens skill cooldowns. Mages need that badly.',
  'VIT, VIT, VIT! Darah tebal tak pernah salah.': 'VIT, VIT, VIT! Thick blood is never wrong.',
  'Ramuan Amuk sebelum bos. Percayalah padaku.': 'Rage Potion before the boss. Trust me.',
};

// quests (spec §26): titles and what people say, keyed by the Indonesian text
const QUEST_TITLE_EN = {
  "Bayangan di Bawah Tanah": "Shadows Below",
  "Gerhana": "Eclipse",
  "Kota di Akar Tua": "The Town on Old Roots",
  "Busuk di Timur Hutan": "Rot in the Eastern Wood",
  "Makam di Bawah Pasir": "The Tomb Beneath the Sand",
  "Api yang Tak Padam": "The Undying Fire",
};
export const QUEST_LINE_EN = {
  "Lima pecahan… Hangatnya terasa sampai ke tulangku. Tapi lihat langit di timur, Nak. Gerhana itu tidak menunggu. Retakan sudah terbuka di balik Baraapi: Tanah Gerhana. Di ujungnya berdiri menaranya. Pergilah, dan akhiri ini.": "Five shards… I can feel their warmth in my bones. But look at the eastern sky, child. The eclipse will not wait. A rift has opened beyond Emberfall: the Eclipse Lands. Its spire stands at the far end. Go, and end this.",
  "Langitnya… cerah lagi. Kau melakukannya, Nak. Dunia ini berutang padamu, walau sebagian besar tak akan pernah tahu. Terimalah mahkota ini: dulu milik para tetua yang pertama menyegel gerhana. Kini milikmu.": "The sky… it's clear again. You did it, child. This world owes you, even if most will never know. Take this crown: it belonged to the elders who first sealed the eclipse. Now it is yours.",
  "Nak, dengarkan orang tua ini. Dahulu sebuah gerhana hendak menelan dunia. Para tetua menyegelnya, lalu memecah segelnya menjadi lima dan menyembunyikannya di tempat-tempat yang dalam. Kini makhluk-makhluk di sana terbangun dan memakan kekuatannya. Yang pertama ada di Ruang Bawah Tanah Bayangan, di Hutan Kelam. Temukan gerbangnya, kalahkan Raja Maw, dan bawa pulang pecahannya.": "Listen to this old man, child. Long ago an eclipse tried to swallow the world. The elders sealed it, broke the seal into five and hid the pieces in deep places. Now the creatures down there have woken and feed on that power. The first lies in the Shadow Crypt, in Gloomwood. Find its gate, defeat King Maw and bring the shard home.",
  "Pecahan Segel! Rasakan dinginnya… Masih ada empat lagi. Pergilah ke timur, ke Rimbawana, kota di akar pohon tertua. Kapten Selasih di Balai Petualang tahu jalan selanjutnya.": "A Seal Shard! Feel how cold it is… Four more remain. Head east to Wildwood, the town on the roots of the oldest tree. Captain Selasih at the Adventurers' Hall knows the way on.",
  "Kakek Odo mengirimmu? Kabar pecahan segel sampai juga ke sini. Pecahan kedua ada di Gua Kristal, di sisi barat Padang Es. Kalahkan penjaganya, lalu beri tahu Kapten Ingrid di Bekubara, kota benteng di ujung timur Padang Es.": "Old Odo sent you? Word of the seal shards reached us too. The second shard is in the Crystal Cave, on the west side of the Frost Plains. Defeat its keeper, then tell Captain Ingrid in Frosthold, the fortress town at the eastern end of the Frost Plains.",
  "Pecahan kedua… berkilau seperti es yang tak mau mencair. Selasih menitip pesan: Nenek Akar di Rimbawana mencium bau busuk dari timur hutan. Kembalilah ke sana.": "The second shard… it gleams like ice that refuses to melt. Selasih left word: Granny Akar in Wildwood smells rot coming from the east of the forest. Go back there.",
  "Hidungku tak pernah salah, Nak. Busuk ini datang dari Hutan Jamur Busuk di ujung timur Hutan Kelam. Pecahan ketiga membuat jamur di sana tumbuh liar. Hentikan sebelum seluruh hutan membusuk.": "My nose is never wrong, child. This rot comes from the Rotting Mushroom Forest at the far east of Gloomwood. The third shard makes the mushrooms there grow wild. Stop it before the whole forest rots.",
  "Udara sudah bersih lagi. Terima kasih, Nak. Pecahan keempat? Konon tersimpan di makam kuno di bawah Gurun Merah. Penari Zahra di Pasirluas tahu banyak dongeng tentangnya.": "The air is clean again. Thank you, child. The fourth shard? They say it rests in an ancient tomb beneath the Red Desert. Zahra the dancer in Sandreach knows many tales about it.",
  "Dongeng tentang Makam Pasir? Itu bukan dongeng. Raja Mumi tidur di sana bersama hartanya, dan sebuah pecahan yang membuat pasir bergerak sendiri. Gerbangnya tersembunyi di tengah Gurun Merah.": "Tales of the Sand Tomb? They are no tales. The Mummy King sleeps there with his treasure, and a shard that makes the sand move on its own. Its gate is hidden in the middle of the Red Desert.",
  "Kau kembali hidup-hidup! Akan kutarikan kisahmu malam ini. Pecahan terakhir ada di Gunung Api. Carilah Ignis si penambang di Baraapi.": "You came back alive! I'll dance your story tonight. The last shard lies in Fire Mountain. Look for Ignis the miner in Emberfall.",
  "Batu di gunung ini bergerak sejak pecahan itu terbangun. Benteng Lava, di sisi barat Gunung Api. Rajanya tidur di kolam api, dan dia tidak suka dibangunkan.": "The rocks on this mountain have moved ever since that shard woke. The Lava Fortress, on the west side of Fire Mountain. Its king sleeps in a pool of fire, and he hates being woken.",
  "Lima pecahan… Gunung ini berhenti bergetar. Bawa semuanya ke Kakek Odo di Kota Awal. Tapi hati-hati: langit di timur Baraapi mulai menggelap.": "Five shards… The mountain has stopped shaking. Take them all to Old Odo in Hometown. But beware: the sky east of Emberfall is growing dark.",
};

// side quests & people in the wild (spec §26.5)
const WILD_EN = {
  "Sup untuk Nenek Kunyit": "Soup for Granny Kunyit",
  "Lendir Kental": "Thick Goo",
  "Bahan Tungku": "Fuel for the Forge",
  "Kerang Bercahaya": "The Glowing Shell",
  "Jamur Raksasa": "The Giant Mushroom",
  "Bunga Kunang": "Firefly Blossoms",
  "Ujian Bilah": "Trial of the Blade",
  "Katak di Danau": "Frogs in the Lake",
  "Sup untuk Bjorn": "Soup for Bjorn",
  "Bulu untuk Musim Dingin": "Furs for Winter",
  "Unta yang Hilang": "The Lost Camel",
  "Permata untuk Kalung": "Gems for a Necklace",
  "Cacing di Jalur Dagang": "Worms on the Trade Road",
  "Bara Abadi": "Everlasting Embers",
  "Penguasa Gunung": "Lord of the Mountain",
  "Inti untuk Tungku": "Cores for the Furnace",
  "Nenek Kunyit, sahabat lamaku, tinggal di pondok tengah Hutan Kelam. Sudah lama ia tak turun gunung. Tolong antarkan sup hangat ini, ya?": "Granny Kunyit, my old friend, lives in a cabin in the middle of Gloomwood. She hasn't come down in ages. Would you take her this warm soup?",
  "Sup Marta! Masih hangat pula. Bilang padanya aku sehat. Dan ini, untuk kakimu yang lelah.": "Marta's soup! Still warm, too. Tell her I'm well. And this is for your tired feet.",
  "Hehehe… ramuan baruku butuh Lendir Kental. Lendir di Hutan Kelam kadang meninggalkannya. Enam saja, Sayang.": "Hehehe… my new brew needs Thick Goo. The slimes in Gloomwood sometimes leave some behind. Just six, dear.",
  "Kental dan lengket, sempurna! Ini, cicipi hasil kualiku.": "Thick and sticky, perfect! Here, taste what my cauldron made.",
  "Tungkuku lapar! Bawakan satu gear Langka dan empat puluh Debu Rune. Akan kuajari kau rahasia kecil.": "My forge is hungry! Bring me a Rare piece of gear and forty Rune Dust. I'll teach you a little secret.",
  "Bagus, bagus! Rahasianya? Pukul lebih keras. Hahaha! Ini bayaranmu.": "Good, good! The secret? Hit harder. Hahaha! Here's your pay.",
  "Kak! Katanya di tepi danau Hutan Kelam ada kerang yang bisa bercahaya! Carikan, dong! Aku mau lihat!": "Hey! They say there's a shell that glows by a lake in Gloomwood! Find it, please! I want to see it!",
  "Wuaaah, beneran ada?! Kakak keren! Ini, harta karunku. Jangan bilang Ibu ya.": "Whoaaa, it's real?! You're so cool! Here's my treasure. Don't tell Mom.",
  "Tidak ada yang percaya aku lihat jamur yang meledak! Kalahkan lima belas, biar mereka percaya!": "Nobody believes I saw exploding mushrooms! Defeat fifteen so they believe me!",
  "Tuh kan! Aku tidak bohong! Kakak pahlawanku!": "See! I wasn't lying! You're my hero!",
  "Bunga Kunang hanya mekar di malam hari, dan makhluk hutan suka membawanya. Lima tangkai, Nak, dari Hutan Kelam setelah gelap.": "Firefly Blossoms only bloom at night, and forest creatures like to carry them. Five stems, child, from Gloomwood after dark.",
  "Cahayanya masih menyala. Akan kujadikan ramuan paling terang. Ini untukmu.": "They're still glowing. I'll make the brightest potion from them. This is for you.",
  "Bilah terbaikku hanya untuk yang pantas. Kalahkan sepuluh elite di Hutan Kelam, lalu kembali.": "My finest blades are only for the worthy. Defeat ten elites in Gloomwood, then come back.",
  "Kau pantas. Pegang ini, rasakan beratnya.": "You are worthy. Hold this, feel its weight.",
  "Katak Salju menghabiskan ikan di danau. Dua puluh lima ekor, dan aku bisa memancing lagi.": "The Snow Frogs are eating all the fish in the lake. Twenty-five of them, and I can fish again.",
  "Ikannya kembali! Makan malam gratis di Bu Hangat untukmu. Dan ini.": "The fish are back! Dinner at Mrs. Hangat's is on me. And this.",
  "Bjorn si pemburu yeti tak pernah mampir lagi. Antarkan sup ikan ini ke pondoknya di barat Padang Es, ya.": "Bjorn the yeti hunter never drops by anymore. Take this fish soup to his cabin in the west of the Frost Plains, would you.",
  "Sup Bu Hangat! Ha! Hangat sampai ke tulang. Ini, untuk jasamu.": "Mrs. Hangat's soup! Ha! Warms me to the bone. Here, for your trouble.",
  "Aku membuat zirah musim dingin dari zirah lama. Bawakan dua helm, armor, atau sepatu Langka.": "I make winter armor out of old armor. Bring me two Rare helmets, armors or boots.",
  "Bagus sekali. Lihat, jadi lebih hangat dan lebih kuat.": "Very good. Look, warmer and stronger.",
  "Untaku kabur saat badai pasir. Namanya Kurma. Kalau kau temukan dia di Gurun Merah, beri tahu aku!": "My camel ran off in a sandstorm. Her name is Date. If you find her in the Red Desert, tell me!",
  "Kurma selamat?! Aku segera menjemputnya. Terima kasih, sahabat!": "Date is safe?! I'll fetch her right away. Thank you, friend!",
  "Pesanan istimewa dari sang sultan… aku butuh tiga permata Biasa. Kau punya?": "A special order from the sultan… I need three Flawed gems. Do you have any?",
  "Indah! Sang sultan akan puas. Ini bagianmu.": "Beautiful! The sultan will be pleased. Here's your share.",
  "Cacing pasir menelan dua gerobak bahanku! Kalahkan tiga puluh, dan stokku aman lagi.": "Sandworms swallowed two of my supply carts! Defeat thirty, and my stock is safe again.",
  "Gerobakku lewat dengan selamat! Ambil ini, langsung dari gudang.": "My carts got through safely! Take these, straight from the warehouse.",
  "Aku mau bikin lentera yang tak pernah padam! Lendir Magma kadang menjatuhkan Bara Abadi. Bawakan sepuluh!": "I want to make a lantern that never goes out! Magma Slimes sometimes drop Everlasting Embers. Bring me ten!",
  "Terang sekali! Sekarang aku tidak takut gelap lagi. Ini, hadiah dariku!": "So bright! Now I'm not scared of the dark anymore. Here, a present from me!",
  "Penguasa Gunung Api menjaga harta di ujung timur. Kalahkan dia, dan aku akan menempa senjata dari kemenanganmu.": "The Overlord of Fire Mountain guards a treasure in the far east. Defeat him, and I'll forge a weapon from your victory.",
  "Kau mengalahkannya?! Ini tempaan terbaikku. Pantas untuk sang penakluk.": "You beat him?! This is my finest work. Fit for a conqueror.",
  "Tungku kota butuh Inti Kegelapan. Lima buah, dan kau dapat harga khusus dariku.": "The town furnace needs Dark Cores. Five of them, and you'll get a special price from me.",
  "Tungku menyala lagi! Ini permata terbaik di lapakku, untukmu.": "The furnace burns again! The best gems on my stall, for you.",
  "Pemburu Tua": "Old Hunter",
  "Pengembara": "Wanderer",
  "Peramu": "Herbalist",
  "Pertapa": "Hermit",
  "Anak Tersesat": "Lost Child",
  "Pemburu Yeti": "Yeti Hunter",
  "Penyihir Es": "Ice Witch",
  "Pengamat Bintang": "Stargazer",
  "Kurir": "Courier",
  "Penjaga Oase": "Oasis Keeper",
  "Penjaga Makam Tua": "Old Tomb Keeper",
  "Kurir Kehausan": "Thirsty Courier",
  "Pandai Buangan": "The Exiled Smith",
  "Pendeta Api": "Fire Priest",
  "Penjaga Kawah": "Crater Keeper",
  "Penambang Terjebak": "Trapped Miner",
  "Hutan ini dulu sunyi. Sekarang serigala bayang berkeliaran sampai ke pintuku.": "These woods used to be quiet. Now shadow wolves prowl right up to my door.",
  "Duduklah sebentar. Teh akar ini menghangatkan tulang.": "Sit a while. This root tea warms the bones.",
  "Setiap akar punya khasiat, Nak. Asal tahu cara merebusnya.": "Every root has its use, child. You just have to know how to brew it.",
  "Bu Marta di Kota Awal masih ingat aku? Sup buatannya juara.": "Does Mrs. Marta in Hometown still remember me? Her soup is the best.",
  "Hening adalah guru yang paling sabar.": "Silence is the most patient teacher.",
  "Batu-batu tua di hutan ini mengingat lebih banyak daripada manusia.": "The old stones in this forest remember more than people do.",
  "Hiks… aku cuma mau memetik bunga kunang-kunang…": "Sniff… I only wanted to pick firefly blossoms…",
  "Jejak yeti sebesar perahu. Kau sudah lihat?": "Yeti tracks as big as boats. Have you seen them?",
  "Api unggunku tak pernah padam. Di sini, itu soal hidup.": "My campfire never goes out. Out here, that is a matter of life.",
  "Es menyimpan sihir lebih lama daripada kertas.": "Ice holds magic longer than paper does.",
  "Jangan sentuh rak itu. Isinya bisa membekukan jarimu.": "Don't touch that shelf. What's on it can freeze your fingers.",
  "Langit Padang Es adalah yang paling jernih di negeri ini.": "The sky over the Frost Plains is the clearest in the land.",
  "Bintang tidak jatuh sembarangan, Nak. Mereka memilih.": "Stars don't fall just anywhere, child. They choose.",
  "Kakiku membeku… suratnya harus sampai…": "My feet are frozen… the letter has to get there…",
  "Pasir tidak pernah diam. Begitu juga aku.": "Sand never stays still. Neither do I.",
  "Tendaku kecil, tapi tehnya manis.": "My tent is small, but the tea is sweet.",
  "Oase ini rahasia. Jangan ceritakan pada kafilah.": "This oasis is a secret. Don't tell the caravans.",
  "Airnya dingin, bahkan di siang hari.": "The water stays cold, even at noon.",
  "Keluargaku menjaga makam ini sejak sebelum ada kota.": "My family has guarded this tomb since before there were towns.",
  "Raja-raja tidur. Kami memastikan mereka tetap tidur.": "Kings sleep. We make sure they stay asleep.",
  "Air… sedikit saja…": "Water… just a little…",
  "Mereka mengusirku dari Baraapi karena tungkuku terlalu panas. Pengecut.": "They threw me out of Emberfall because my forge ran too hot. Cowards.",
  "Logam terbaik lahir dari api yang marah.": "The best metal is born of an angry fire.",
  "Api itu suci. Imp-imp itu menodainya.": "Fire is sacred. Those imps defile it.",
  "Duduklah di dekat bara. Biarkan ia mendengarmu.": "Sit by the embers. Let them hear you.",
  "Tiga api abadi menjaga gunung ini tetap tidur.": "Three eternal flames keep this mountain asleep.",
  "Kalau kau dengar gunung mendengkur, larilah.": "If you hear the mountain snore, run.",
  "Kakiku terjepit batu… tolong…": "My leg is pinned under a rock… help…",
  "Taring Serigala": "Wolf Fangs",
  "Jamur Bercahaya": "Glowcaps",
  "Bisikan Batu Tulis": "Whispers of the Rune Stones",
  "Tinta Es": "Ice Ink",
  "Bintang Jatuh": "Fallen Stars",
  "Surat Beku": "The Frozen Letter",
  "Sengat": "Stingers",
  "Sisik Cacing": "Worm Scales",
  "Makam yang Terlupa": "The Forgotten Tomb",
  "Api Suci": "Sacred Fire",
  "Api Abadi": "Eternal Flames",
  "Serigala bayang makin berani. Semalam mereka mencakar pintuku. Kalahkan tiga puluh ekor, biar mereka belajar takut lagi.": "The shadow wolves grow bolder. Last night they clawed at my door. Defeat thirty of them so they learn to fear again.",
  "Sunyi lagi. Terima kasih. Ambil busur… eh, ambil ini. Aku sudah terlalu tua untuk memakainya.": "Quiet again. Thank you. Take my bow… er, take this. I'm too old to use it.",
  "Ramuanku butuh Jamur Bercahaya. Jamur Bom di hutan ini menyimpannya di kepalanya. Bawakan lima, ya?": "My brews need Glowcaps. The Bomb Shrooms in this forest keep them on their heads. Bring me five, would you?",
  "Lihat cahayanya! Ini, ramuan hangat untukmu. Jangan diminum sekaligus.": "Look at that glow! Here, some warm potions for you. Don't drink them all at once.",
  "Tiga batu tulis di hutan ini menyimpan doa para tetua. Bacalah semuanya, lalu kembali padaku.": "Three rune stones in this forest hold the prayers of the elders. Read them all, then come back to me.",
  "Doanya meminta kekuatan sang Penguasa dan sepotong kegelapan. Bawakan satu Inti Kegelapan dan satu gear Epik, akan kutenun menjadi pelindung.": "The prayer asks for the Overlord's strength and a piece of darkness. Bring me a Dark Core and an Epic piece of gear, and I will weave them into a ward.",
  "Kakak… aku tersesat. Rumahku di Rimbawana. Ibu pasti cemas… Antar aku pulang, ya?": "I'm lost… My home is in Wildwood. Mom must be worried… Will you take me home?",
  "Lio! Ya ampun, Nak! Terima kasih, petualang. Ambillah ini, hanya ini yang kupunya.": "Lio! Oh, my child! Thank you, adventurer. Take these, they're all I have.",
  "Enam yeti merusak perangkapku. Aku sudah tua untuk berburu sendirian. Kau mau?": "Six yetis wrecked my traps. I'm too old to hunt alone. Will you?",
  "Enam! Ha! Kau pemburu sejati. Ambil ini, hasil tempaanku sendiri.": "Six! Ha! You're a true hunter. Take this, I forged it myself.",
  "Mantraku butuh tinta dari kristal dan safir. Sepuluh Kristal Arkana dan dua Safir Retak, kalau kau punya.": "My spells need ink made of crystal and sapphire. Ten Arcane Crystals and two Chipped Sapphires, if you have them.",
  "Sempurna. Ini permata yang kuperkuat dengan es abadi.": "Perfect. Here is a gem I strengthened with everlasting ice.",
  "Tiga bintang jatuh di Padang Es minggu ini. Pergilah ke tempat mereka mendarat, sebelum roh es menghisap cahayanya.": "Three stars fell on the Frost Plains this week. Go where they landed, before the ice wisps drink their light.",
  "Cahayanya kembali ke langit. Dan yang ini… sisa cahaya terakhir. Kubuat menjadi cincin untukmu.": "Their light has gone back to the sky. And this… the last of it. I made it into a ring for you.",
  "Surat ini untuk Astrid di Bekubara… aku tak sanggup berjalan lagi. Tolong antarkan.": "This letter is for Astrid in Frosthold… I can't walk any further. Please deliver it.",
  "Surat dari Gustav? Dia selamat? Syukurlah… Terima kasih. Ambil ini untuk perjalananmu.": "A letter from Gustav? He's safe? Thank goodness… Thank you. Take this for your travels.",
  "Kalajengking menyerbu jalur kafilahku. Empat puluh ekor, kurang lebih. Bersihkan, dan kau kubayar.": "Scorpions overran my caravan route. Forty or so. Clear them out, and I'll pay you.",
  "Jalurnya aman lagi! Seperti janjiku.": "The route is safe again! As I promised.",
  "Sisik Cacing Pasir menyaring air dengan sempurna. Delapan saja cukup untuk sumur oase ini.": "Sandworm scales filter water perfectly. Eight would be enough for this oasis well.",
  "Airnya jernih lagi! Ambil ini, dan kembalilah kapan saja kau haus.": "The water is clear again! Take these, and come back whenever you're thirsty.",
  "Tiga tugu makam tua tertimbun pasir. Temukan semuanya, agar arwah raja tahu kita masih menjaga.": "Three old tomb pillars lie buried in the sand. Find them all, so the spirits of the kings know we still keep watch.",
  "Para penjaga sudah tumbang. Persembahkan tiga permata Biasa, dan topeng ini milikmu.": "The guardians have fallen. Offer three Flawed gems, and this mask is yours.",
  "Airku habis sejak kemarin… Tiga Ramuan Merah saja, akan kubayar di kota.": "I ran out of water yesterday… Just three Red Potions, I'll pay you back in town.",
  "Ahh… hidup lagi! Ini, upahku untuk tiga hari. Pantas untukmu.": "Ahh… alive again! Here, three days' wages. You've earned it.",
  "Bawakan dua gear Epik. Akan kulebur di tungkuku dan kutempa jadi sesuatu yang lebih baik.": "Bring me two Epic pieces of gear. I'll melt them in my forge and make something better.",
  "Lihat ini! Mereka bilang tungkuku terlalu panas. Hah!": "Look at this! And they said my forge ran too hot. Hah!",
  "Imp Api menodai api suci gunung ini. Lima puluh, kira-kira. Bersihkanlah.": "Fire Imps defile this mountain's sacred fire. About fifty. Cleanse it.",
  "Bara di altar menyala jernih lagi. Terimalah berkat ini.": "The embers on the altar burn clean again. Accept this blessing.",
  "Tiga api abadi meredup. Kunjungi semuanya dan nyalakan kembali dengan tanganmu.": "The three eternal flames are fading. Visit each and rekindle it with your own hands.",
  "Gunung kembali tidur. Sisik ini dari naga api terakhir. Pakailah, ia akan melindungimu.": "The mountain sleeps again. These scales came from the last fire dragon. Wear them; they will protect you.",
  "Kakiku terjepit… aku bisa merangkak pulang, tapi tolong kabari Ignis di Baraapi. Dia pasti mencariku.": "My leg is pinned… I can crawl home, but please tell Ignis in Emberfall. He must be looking for me.",
  "Bara masih hidup? Aku segera menjemputnya! Ini, dari tabungan kami para penambang.": "Bara's alive? I'll go fetch him right away! Here, from our miners' savings.",
};
const WILD_NAME_EN = {"Resi Sunyi": "Silent Sage", "Penjaga Kawah": "Crater Keeper", "Pak Gaharu": "Old Gaharu"};
const DROP_EN = {"Jamur Bercahaya": "Glowcap", "Sisik Cacing": "Worm Scale", "Lendir Kental": "Thick Goo", "Bunga Kunang": "Firefly Blossom", "Bara Abadi": "Everlasting Ember"};

// helpers: replace a field / array entries through a map (keyed by the Indonesian text)
const swap = (obj, key, map) => { if (obj && obj[key] in map) obj[key] = map[obj[key]]; };
const swapAll = (arr, map) => arr.forEach((v, i) => { if (v in map) arr[i] = map[v]; });

export function localizeData() {
  if (getLang() !== 'en') return;
  for (const c of Object.values(CLASSES)) {
    swap(c, 'desc', CLASS_EN);
    for (const s of [...c.skills, c.ult]) { swap(s, 'name', SKILL_EN); swap(s, 'desc', SKILL_EN); }
  }
  for (const r of RARITIES) swap(r, 'name', RARITY_EN);
  for (const s of Object.values(SLOTS)) swap(s, 'name', SLOT_EN);
  for (const list of Object.values(VARIANTS.weapon)) swapAll(list, VARIANT_EN);
  for (const [slot, list] of Object.entries(VARIANTS)) if (slot !== 'weapon') swapAll(list, VARIANT_EN);
  for (const b of Object.values(BONUSES)) { swap(b, 'label', LABEL_EN); swap(b, 'suffix', SUFFIX_EN); }
  for (const [id, e] of Object.entries(EFFECTS)) if (EFFECT_EN[id]) e.desc = EFFECT_EN[id];
  for (const u of UNIQUES) swap(u, 'name', UNIQUE_EN);
  for (const c of Object.values(CHESTS)) swap(c, 'name', CHEST_EN);
  for (const r of REGIONS) swap(r, 'name', REGION_EN);
  for (const tw of Object.values(TOWNS)) swap(tw, 'name', TOWN_EN);
  for (const o of MARK_SHOP) { const en = MARK_EN[o.name]; if (en) [o.name, o.desc] = en; }
  for (const e of Object.values(ENEMIES)) { swap(e, 'name', ENEMY_EN); for (const ph of e.phases || []) swap(ph, 'name', PHASE_NAME_EN); }
  for (const d of DUNGEONS) { const en = DUNGEON_EN[d.name]; if (en) [d.name, d.short] = en; }
  for (const p of Object.values(POTIONS)) { const en = POTION_EN[p.name]; if (en) [p.name, p.desc] = en; }
  for (const m of Object.values(MATS)) swap(m, 'name', MAT_EN);
  for (const g of Object.values(GEMS)) swap(g, 'name', GEM_EN);
  swapAll(GEM_TIER_NAMES, GEM_TIER_EN);
  for (const tl of TALENTS) { const en = TALENT_EN[tl.name]; if (en) [tl.name, tl.desc] = en; }
  for (const u of Object.values(UPGRADES)) { const en = UPGRADE_EN[u.name]; if (en) [u.name, u.desc] = en; }
  for (const a of ATTRS) swap(a, 'desc', ATTR_EN);
  for (const p of PHASES) swap(p, 'name', PHASE_EN);
  swapAll(HAIR_NAMES, HAIR_EN);
  swapAll(HAIR_COLOR_NAMES, HAIR_COLOR_EN);
  for (const def of Object.values(TOWN_DEFS)) {
    for (const b of def.buildings) swap(b, 'name', BUILDING_EN);
    for (const r of Object.values(def.interiors)) swap(r, 'name', BUILDING_EN);
  }
  for (const q of [...MAIN, ...SIDE]) {
    swap(q, 'title', QUEST_TITLE_EN); swap(q, 'title', WILD_EN);
    for (const st of q.steps) {
      swap(st, 'say', QUEST_LINE_EN); swap(st, 'say', WILD_EN);
      if (st.who) st.who = WILD_NAME_EN[st.who] || NPC_NAME_EN[st.who] || nameEn(st.who);
    }
  }
  for (const h of HIDDEN) { h.name = WILD_NAME_EN[h.name] || nameEn(h.name); swap(h, 'title', WILD_EN); swapAll(h.lines, WILD_EN); }
  for (const d of Object.values(DROP_ITEMS)) swap(d, 'name', DROP_EN);
  const people = new Set(Object.values(TOWN_DEFS).flatMap((d) => [...d.npcs, ...Object.values(d.interiors).flatMap((r) => r.npcs || [])]));
  for (const n of people) {
    n.name = NPC_NAME_EN[n.name] || nameEn(n.name);
    swap(n, 'title', NPC_TITLE_EN);
    if (n.lines) swapAll(n.lines, NPC_LINE_EN);
  }
}
