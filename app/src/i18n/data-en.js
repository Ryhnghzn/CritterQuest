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
  'Hantaman Bumi': 'Earthshatter',
  'Menghantam titik bidik: 450%, melempar & membekukan sesaat.': 'Smash the aimed spot: 450%, knocks back & briefly freezes.',
  'Terjang': 'Charge',
  'Menerjang 220 px, 320% ke yang dilewati, kebal saat menerjang.': 'Charge 220 px, 320% to everything passed, invulnerable while charging.',
  'Lempar Kapak': 'Axe Throw',
  'Kapak menembus semua musuh di garis, 300%.': 'An axe that pierces every enemy in a line, 300%.',
  'Amarah Perang': 'War Fury',
  'ATK +35%, kecepatan serang +30% selama 6 detik.': 'ATK +35%, attack speed +30% for 6 seconds.',
  'Badai Pedang': 'Bladestorm',
  'Berputar liar 2,5 detik: 10×300% di area besar, menarik musuh, damage diterima −50%.': 'Spin wildly for 2.5 seconds: 10×300% in a large area, pulling enemies in, damage taken −50%.',
  'Hujan Panah': 'Arrow Rain',
  'Hujan panah di titik bidik, 6×160%.': 'Arrows rain on the aimed spot, 6×160%.',
  'Tembakan Tembus': 'Piercing Shot',
  'Panah besar menembus semua musuh, 600%.': 'A heavy arrow that pierces every enemy, 600%.',
  'Panah Beruntun': 'Volley',
  '5 panah menyebar sempit, masing-masing 200%.': '5 arrows in a tight spread, 200% each.',
  'Lompatan Mundur': 'Backflip',
  'Melompat menjauh dari bidikan, meninggalkan ledakan es yang membekukan.': 'Leap away from your aim, leaving a freezing ice burst behind.',
  'Ladang Jebakan': 'Trap Field',
  'Jebakan duri di titik bidik 4 detik: 8×90%, memperlambat.': 'Spike traps on the aimed spot for 4 seconds: 8×90%, slowing.',
  'Mata Elang': 'Hawk Eye',
  'Kritis +30%, kecepatan serang +25% selama 6 detik.': 'Crit +30%, attack speed +25% for 6 seconds.',
  'Hujan Bintang': 'Starfall',
  'Hujan panah bintang 3 detik di area sangat luas: 12×250%, memperlambat.': 'Star-arrows rain for 3 seconds over a huge area: 12×250%, slowing.',
  'Nova Es': 'Frost Nova',
  'Ledakan es di sekeliling: 300%, membekukan 2,2 detik, mendorong.': 'An ice blast all around: 300%, freezes for 2.2 seconds, knocks back.',
  'Petir Berantai': 'Chain Lightning',
  'Petir melompat ke 8 musuh, 350%.': 'Lightning jumps between 8 enemies, 350%.',
  'Meteor': 'Meteor',
  'Meteor jatuh di titik bidik: 600% area besar.': 'A meteor strikes the aimed spot: 600% in a large area.',
  'Teleportasi': 'Blink',
  'Berpindah seketika 230 px ke arah bidikan.': 'Instantly teleport 230 px toward your aim.',
  'Bola Api Raksasa': 'Inferno Orb',
  'Bola api besar meledak 400% di area luas.': 'A huge fireball exploding for 400% over a wide area.',
  'Perisai Mana': 'Mana Shield',
  'Damage diterima −55% dan ATK +20% selama 7 detik.': 'Damage taken −55% and ATK +20% for 7 seconds.',
  'Hujan Meteor': 'Meteor Storm',
  'Meteor berjatuhan 2,4 detik: 6×600% di area luas, mendorong.': 'Meteors rain down for 2.4 seconds: 6×600% over a wide area, knocking back.',
  'Langkah Bayangan': 'Shadow Step',
  'Melesat 180 px, 500% ke yang dilewati, kebal.': 'Dash 180 px, 500% to everything passed, invulnerable.',
  'Kipas Belati': 'Dagger Fan',
  '11 belati menyebar, masing-masing 180%.': '11 daggers in a wide spread, 180% each.',
  'Kabut Racun': 'Poison Cloud',
  'Kabut racun di titik bidik 3 detik: 8×90%.': 'A poison cloud on the aimed spot for 3 seconds: 8×90%.',
  'Bom Asap': 'Smoke Bomb',
  'Asap membekukan musuh sekitar 1,2 detik; damage diterima −40% selama 4 detik.': 'Smoke freezes nearby enemies for 1.2 seconds; damage taken −40% for 4 seconds.',
  'Shuriken': 'Shuriken',
  '3 shuriken menembus 2 musuh, masing-masing 300%.': '3 shuriken that pierce 2 enemies, 300% each.',
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
};
const CHEST_EN = { 'Peti Gear': 'Gear Chest', 'Peti Agung': 'Grand Chest' };

const REGION_EN = { 'Hutan Kelam': 'Gloomwood', 'Padang Es': 'Frost Plains', 'Gurun Merah': 'Red Desert', 'Gunung Api': 'Fire Mountain' };
const TOWN_EN = { 'Kota Awal': 'Hometown', Rimbawana: 'Wildwood', Bekubara: 'Frosthold', Pasirluas: 'Sandreach', Baraapi: 'Emberfall' };

const MARK_EN = {
  'Peti Lencana': ['Badge Chest', '1 Epic gear piece'],
  'Kristal Arkana ×5': ['Arcane Crystal ×5', 'Forging material for +5 and up'],
  'Inti Kegelapan': ['Dark Core', 'Forging material for +10 and up'],
  'Permata acak': ['Random gem', '1 gem of Common tier'],
  'Debu Rune ×20': ['Rune Dust ×20', 'Forging material'],
};

const ENEMY_EN = {
  Lendir: 'Ooze', Kelelawar: 'Bat', Golem: 'Golem', 'Lendir Kecil': 'Oozeling', 'Katak Ludah': 'Spitting Toad', 'Babi Batu': 'Stone Boar',
  'Dukun Tengkorak': 'Skull Shaman', 'Peri Lumut': 'Moss Wisp', 'Jamur Bom': 'Bomb Shroom', 'Kura Baja': 'Iron Tortoise',
  'Raja Maw': 'King Maw', 'Golem Kristal': 'Crystal Golem', 'Ratu Spora': 'Spore Queen', 'Raja Lava': 'Lava King',
  'Serigala Bayang': 'Shadow Wolf', 'Lendir Beku': 'Frost Ooze', 'Katak Salju': 'Snow Toad', 'Golem Es': 'Ice Golem', 'Roh Es': 'Frost Wisp',
  'Lendir Pasir': 'Sand Ooze', 'Burung Nasar': 'Vulture', Kalajengking: 'Scorpion', 'Cacing Pasir': 'Sandworm',
  'Lendir Magma': 'Magma Ooze', 'Jamur Bara': 'Ember Shroom', 'Imp Api': 'Fire Imp',
};
const DUNGEON_EN = {
  'Ruang Bawah Tanah Bayangan': ['Shadow Crypt', 'Shadow'], 'Gua Kristal': ['Crystal Cave', 'Crystal'],
  'Hutan Jamur Busuk': ['Rotting Mushroom Forest', 'Fungus'], 'Benteng Lava': ['Lava Fortress', 'Lava'],
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
  "Pedagang di sini menjual barang lebih bagus dari Kota Awal — tapi lebih mahal juga.": "Merchants here sell better goods than Hometown — but pricier, too.",
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
  'Kau bisa melanjutkan dari lantai terdalam yang pernah kau capai — bilang saja ke Rolan di gerbang.': "You can continue from the deepest floor you've reached — just tell Rolan at the gate.",
  'Kepala di dinding itu? Replika. Raja Maw yang asli masih hidup di bawah sana.': 'That head on the wall? A replica. The real King Maw still lives down there.',
  'Jaga jarak, tembak, mundur. Itu rahasia pemanah.': "Keep your distance, shoot, fall back. That's the archer's secret.",
  'LUK menaikkan peluang barang langka. Aku menaruh semua poinku di sana… mungkin terlalu banyak.': 'LUK raises the chance of rare loot. I put all my points there… maybe too many.',
  'Nova Es membekukan semua di sekitarmu. Pakai saat terkepung.': 'Frost Nova freezes everything around you. Use it when surrounded.',
  'DEX memperpendek jeda skill. Penyihir sangat butuh itu.': 'DEX shortens skill cooldowns. Mages need that badly.',
  'VIT, VIT, VIT! Darah tebal tak pernah salah.': 'VIT, VIT, VIT! Thick blood is never wrong.',
  'Ramuan Amuk sebelum bos. Percayalah padaku.': 'Rage Potion before the boss. Trust me.',
};

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
  for (const e of Object.values(ENEMIES)) swap(e, 'name', ENEMY_EN);
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
  const people = new Set(Object.values(TOWN_DEFS).flatMap((d) => [...d.npcs, ...Object.values(d.interiors).flatMap((r) => r.npcs || [])]));
  for (const n of people) {
    n.name = NPC_NAME_EN[n.name] || nameEn(n.name);
    swap(n, 'title', NPC_TITLE_EN);
    if (n.lines) swapAll(n.lines, NPC_LINE_EN);
  }
}
