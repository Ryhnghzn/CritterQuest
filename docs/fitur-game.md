# Critter Quest: Semua Fitur Game

Keadaan per **2026-11-13** (branch `kelas-hidup`, termasuk perubahan yang belum di-commit). Isinya dicek ke **kode dan data**, bukan hanya ke spesifikasi. Spesifikasi (`docs/superpowers/specs/2026-10-26-critter-quest-arcade-design.md`) berupa catatan perubahan: bagian yang lebih baru mengalahkan yang lama. Kalau spesifikasi dan kode berbeda, dokumen ini mengikuti kode, dan perbedaannya dicatat di akhir tiap bagian ("Catatan: dihapus/berubah"). Path file ditulis relatif ke `app/src/` kecuali disebut lain.

## Daftar isi

1. Gambaran besar
2. Alur bermain
3. Yang belum ada di game
4. **Bagian A: Karakter, Kelas, Pertarungan & Progres** (karakter, stat, level, Pengembara, 4 job, skill, Job Lanjutan, pertarungan, Power, gear, tempa, tumbang)
5. **Bagian B: Dunia, Tempat, Musuh & Konten** (Kota Awal, 4 kota besar, pasar, dunia terbuka, harta, dungeon, Celah, musuh, bos, siang–malam, Papan Tugas, quest, Koleksi, cerita, mount, dialog)
6. **Bagian C: Layar, UI, Tampilan, Suara, Save & Teknis** (alur layar, HUD, kontrol, panel, Pengaturan, kamera, visual, suara, dua bahasa, save, offline/HP, pengaman beban, cheat, halaman contoh)

---

## 1. Gambaran besar

- **Jenis game:** action RPG *hack and slash* di browser, dilihat dari atas dengan tampilan 2.5D (dunia 3D + karakter 2D tegak bergaya anime dengan filter pixel), bernuansa *dark fantasy*. Bisa dimainkan di PC dan HP (offline/PWA, hanya mendatar di HP). Ada dua bahasa: Inggris (bawaan) dan Indonesia.
- **Karakter:** 3 slot simpanan. Semua mulai sebagai **Pengembara**, memilih satu dari **4 job** (Warrior, Archer, Mage, Assassin) di level 5, lalu satu dari **2 cabang Job Lanjutan** per job di level 30 (8 cabang). Level maksimum 50.
- **Isi utama:**
  - 1 desa awal + 4 kota besar dalam **satu dunia tersambung** 70000 × 76000 (4 lengan biome + Tanah Gerhana);
  - **6 dungeon** × 5 lantai, ditambah **Celah tanpa batas**;
  - **7 bab** cerita utama (Prolog sampai Gerhana) + epilog;
  - **46 side quest**, peristiwa dunia acak;
  - **7 bos** berfase, 10 musuh berperilaku khas, elite bersifat acak;
  - gear **6 slot × 6 rarity**, tempa, permata;
  - **9 mount**, buku monster, kodeks item unik.
- **Kesulitan:** otomatis dari **Power** karakter dibanding Power yang disarankan untuk level musuh. Normal/Sulit/Neraka sudah dihapus.

## 2. Alur bermain

**Satu putaran (beberapa menit):**
1. Di **kota**: belanja ramuan/gear, tempa, ambil tugas Papan Tugas, ambil atau lapor quest, bagi poin atribut dan SP, tidur.
2. Keluar ke **dunia** atau masuk **dungeon**: bunuh kelompok musuh, elite, mini bos penjaga peti, quest lapangan (kawal, bertahan, buronan, sarang, penyelamatan, balapan), peristiwa dunia.
3. Dapat **EXP, koin, gear, bahan, permata, Lencana**, dan kill untuk buku monster.
4. Pulang ke kota (portal emas, Batu Teleport) atau **tumbang** (koin perjalanan dan sebagian barang hilang).

**Tujuan menengah:**
- naik level dan buka skill baru;
- pilih job di level 5;
- buka halaman skill B di level 15;
- buka ultimate di level 25;
- ujian Bayangan Diri dan cabang di level 30;
- kejar gear Legendaris/Mitos dan tempa +15;
- temukan gerbang dungeon dan peti harta;
- kumpulkan mount.

**Tujuan jangka panjang:**
- tamatkan cerita: 5 Pecahan Segel → Tanah Gerhana → Menara Gerhana → Sang Gerhana → epilog;
- buka Celah tanpa batas dan kejar rekor lantai;
- lengkapi buku monster (bonus stat permanen), kodeks unik, 9 mount, dan semua side quest (hadiah Paus Langit).

## 3. Yang belum ada di game

Ringkasan ini untuk membantu memutuskan fitur berikutnya.

- **Rumah pribadi** saat ini hanya tempat tidur gratis di Kota Awal (`myhome`). Rumah belum bisa dihias, ditingkatkan, atau memberi bonus. Prototipe "Tata Rumah & Tingkat Rumah" baru ada di `app/rumah.html`, di luar game.
- **Membuat barang sendiri** (crafting) di luar tempa/permata belum ada, misalnya meracik ramuan atau membuat perabot.
- **Kegiatan santai**, misalnya bertani, memancing, memasak, atau pet tempur, belum ada. Ladang dan kandang di Kota Awal hanya hiasan atau tempat NPC.
- **Pencapaian** (achievement) selain Lencana, buku monster, dan kodeks belum ada.
- **Endgame lanjutan** (Kutukan Celah, Ujian Penguasaan Kelas, Gelar) hanya dicatat di `docs/superpowers/plans/2026-11-13-endgame.md` dan tidak direncanakan: pemilik menganggap game selesai saat cerita tamat.
- **Main bersama** (multiplayer/online) belum ada; semua tersimpan lokal di browser (bisa ekspor/impor).
- **Toko gaya baru** (§45.5) baru dipasang di Pandai Brom; toko lain masih panel lama.
- **Cek manual pemilik** masih menunggu untuk: §35 Mount, §43 Job & Skill Bertingkat, 9E Celah, §47 Power, §48 efek skill cabang (bagian 1 Prajurit, sisanya belum), §49 pukulan depan/belakang, dan §50 pencatat tertutup paksa.

---

## Bagian A: Karakter, Kelas, Pertarungan & Progres


---

### 1. Slot simpanan & membuat karakter

- **3 slot simpanan** (`SLOT_COUNT = 3`, `data/balance.js`). Ada ekspor/impor save di Pilih Slot (`meta/transfer.js`, `ui/slots.js`).
- **Buat Petualang** (`ui/create.js`, `meta/character.js` `createCharacter`):
  - Nama 1–12 karakter (`NAME_MAX = 12`, `validateName`).
  - Rambut: **6 gaya** (Pendek, Jabrik, Panjang, Bob, Kuncir, Poni Samping) × **6 warna** (Hitam, Cokelat, Pirang, Merah, Biru, Putih). Data ada di `art/doll.js` (`HAIR_NAMES`, `HAIR_COLOR_NAMES`, `HAIR_PALETTE`).
  - **Kelas tidak dipilih di sini.** Semua karakter baru mulai sebagai **Pengembara** (`classId: 'novice'`). Ada catatan di layar bahwa job bisa dicoba dan dipilih di Pelatih.
  - Karakter baru mulai dari level 1, 0 koin, sabuk ramuan bawaan `red, big, shield, rage`, 0 ramuan, tas kosong, 6 slot gear kosong, dan lokasi `home` (Kota Awal). Cutscene pembuka berjalan sekali (bukan bagian katalog ini).
- **Tukang Cukur, Bang Rudi** (`meta/shop.js` `changeLook`, harga `BARBER_PRICE = 50` di `data/shop.js`): ganti gaya dan warna rambut dengan pratinjau. Biayanya 50 koin per potongan. Memilih gaya yang sama ditolak.
- Kartu Pilih Karakter menampilkan **Power** (§47.6, `ui/power.js`), lalu gelar cabang Job Lanjutan bila sudah punya.

### 2. Stat karakter

#### 2.1 Daftar stat
Stat: `maxHp`, `atk`, `def`, `atkSpd` (pengali, 1 = normal), `crit` (%), `critDmg` (awal 1,5), `moveSpd`, `cdr` (% dengan batas **40**, `CDR_MAX`), dan `magnet` (awal 70). Nilai awal bersama ada di `CLASS_BASE = { atkSpd: 1, critDmg: 1.5, cdr: 0, magnet: 70 }` (`data/classes.js`).

#### 2.2 Rumus stat akhir (`meta/character.js` `finalStats`)
Urutan perhitungannya:
1. stat dasar kelas + pertumbuhan × (level − 1)
2. \+ poin atribut
3. \+ gear terpasang (stat dasar × tempa + bonus + permata)
4. \+ stat Koleksi/buku monster (`collectionStats`, §24)
5. × persen dari pohon skill (Umum dan pasif job/cabang), lalu + tambahan datar dari pohon
6. × latihan Pelatih (persen dari total) + magnet datar
7. × pengali mount yang aktif (`mountStatMul`, §35)

#### 2.3 Stat dasar per kelas (`data/classes.js`)

| | Pengembara | Warrior | Archer | Mage | Assassin |
|---|---|---|---|---|---|
| maxHp | 110 | 140 | 95 | 85 | 90 |
| atk | 12 | 14 | 11 | 16 | 9 |
| def | 1 | 2 | 0 | 0 | 0 |
| crit | 6% | 5% | 8% | 5% | 20% |
| moveSpd | 112 | 112 | 115 | 100 | 125 |
| Pertumbuhan/level | +9 HP, +1,3 atk | +12 HP, +1,4 atk | +8 HP, +1,2 atk | +7 HP, +1,6 atk | +8 HP, +1,0 atk |
| Serangan dasar | tebasan `arc` r40 90°, jeda 0,5 | tebasan r46 100°, jeda 0,55 | panah laju 380, jangkauan 450, jeda 0,45 | bola api laju 260, ledak r36, jeda 0,8 | tusukan r34 50°, jeda 0,3 |
| Energi per musuh kena | 6 | 7 | 8 | 9 | 4 |

#### 2.4 Poin atribut (§14.1, `data/balance.js` `ATTRS`, `POINTS_PER_LEVEL = 3`)
- Setiap naik level memberi **+3 poin**. Poin bebas dihitung `3 × (level − 1) − terpakai` (`freePoints`) dan tidak disimpan terpisah.

| Atribut | Per poin |
|---|---|
| STR | ATK +1 |
| VIT | HP maks +8, DEF +0,25 |
| AGI | kec. serang +1,5%, gerak +0,8 |
| DEX | kritis +0,5%, CDR +0,4% |
| LUK | dmg kritis +2%, magnet +2, bobot rarity Langka ke atas × (1 + 0,01 × LUK) |

- Poin dibagi di panel Karakter (tombol **I**). Tombol [+] hanya menandai; pilihan berlaku setelah **Simpan** (bisa **Batal**). Poin juga bisa dibagi saat di dungeon atau wilayah, dan stat langsung berubah.
- **Atur Ulang Poin** di Pelatih: `100 + 20 × level` koin (`RESPEC`, `meta/shop.js` `respec`).
- Poin atribut **dikembalikan gratis** setiap kali ganti job (`meta/jobs.js` `enterJob`).

#### 2.5 Latihan Pelatih, Guru Hadi (`data/shop.js` `UPGRADES`, `meta/shop.js` `buyUpgrade`)

| Latihan | Efek per tingkat | Maks | Harga tingkat berikut |
|---|---|---|---|
| Daya Tahan | HP maks +6% | 10 | `50 × 1,5^tingkat` |
| Tempur | ATK +5% | 10 | `60 × 1,5^tingkat` |
| Kepekaan | Magnet +20 | 5 | `40 × 1,6^tingkat` |

### 3. Level & EXP

- EXP untuk naik level: `30 + 20 × level` (`CHAR_EXP_BASE/GROWTH`, `meta/character.js` `expToNext`).
- **Level maks 50** (`CHAR_LEVEL_MAX`). **Pengembara berhenti di level 10** (`NOVICE_LEVEL_CAP`, `levelCap`) sampai memilih job; di batas itu EXP diatur ke 0.
- **Bar Bonus** (rencana `docs/superpowers/plans/2026-11-13-endgame.md`): di level 50 EXP terus mengisi bar (1030 EXP per bar). Tiap bar penuh memberi **1 Lencana, Debu Rune 12, Kristal Arkana 2** (`EXP_BONUS`, `meta/character.js` `addExp`), dengan spanduk "Bar Bonus penuh!" di perjalanan. Hadiah EXP dari quest, tugas, ekspedisi, kodeks, dan berkah Keserakahan tetap berguna di level 50.
- EXP datang dari permata EXP musuh dan langsung menambah EXP karakter, termasuk saat di dungeon. Naik level memunculkan spanduk tanpa menghentikan permainan. Ada juga EXP dari quest dan tugas.
- Saat level baru membuka skill (`newlyOpen`), skill itu bisa dipelajari dengan SP. Bila masih ada slot kosong, skill dipasang otomatis dan muncul pesan "Skill baru: {nama} (tombol {n})" (§31.6).
- Setiap naik level memberi +3 poin atribut dan +2 SP (mulai level 2).

### 4. Pengembara & pemilihan job (§43.1)

- **Pengembara** (`CLASSES.novice`): stat ada di tabel 2.3. Punya **2 skill tetap tanpa level**:
  - **Ayunan Lebar**: area sekeliling r70, 180%, mendorong; energi 30, cd 3.
  - **Guling Serang**: dash 140 px, 200% ke musuh yang dilewati; energi 20, cd 3.
  - Tidak punya mekanik khas, ultimate, maupun halaman B.
  - **Senjata tidak pernah jatuh** untuk Pengembara (`meta/itemgen.js` `dropItem`, `noWeapon`); gear lain tetap jatuh.
  - SP tetap terkumpul. Gambarnya berbaju penduduk tanpa senjata (`art/anime/npc.js` `drawAnimeWanderer`).
- **Prolog quest utama `ch0` "Anak Kota Awal"** (`data/quests.js`) memiliki langkah `level` (mencapai level 5) dan `job` (memilih job di Pelatih).
- **Bagian Job di Pelatih** (`ui/npc.js` `jobPanel`):
  - **Coba**: gratis dan tanpa batas. Pemain masuk ke lantai 1 Ruang Bawah Tanah Bayangan sebagai job itu, dengan level yang sama, skill bawaan level 1, senjata biasa sementara, dan atribut 0. Tidak ada yang disimpan dan tidak ada hadiah. Keluar lewat Jeda → Menyerah atau dengan tumbang (`main.js` `tryJob`).
  - **Pilih** (mulai **level 5**, `JOB_PICK_LEVEL`): pertama kali **gratis** (`meta/jobs.js` `pickJob`). Pemain mendapat senjata awal job itu (rarity Biasa, level item = level karakter, langsung dipasang), mekanik khas, pohon skill, dan halaman A. Ditolak bila tas penuh.
  - **Ganti** (hanya di kota): biaya `(200 + 30 × level) × 1,5^n`, dengan n = jumlah ganti job sebelumnya (`JOB_CHANGE`, `jobChangePrice`). Level, EXP, gear, koin, dan quest tetap. Senjata job lain dilepas. Saat kembali ke job lama, senjata terbaik job itu di tas dipasang lagi. Job baru mendapat senjata awal dan satu kali atur ulang SP gratis.
  - **Tersimpan per job** (`char.jobs[id]`): susunan SP, halaman A/B dan halaman terakhir, ultimate terpasang, dan cabang. Data job ada di `meta/jobs.js` `newJob`.

### 5. Empat job & mekanik khasnya (§31, `run/traits.js`, blok `trait` di `data/classes.js`)

Bar mekanik khas tampil di HUD di bawah energi. Bar mulai dari 0 di setiap perjalanan dan tidak disimpan.

| Job | Mekanik | Isi | Turun | Efek |
|---|---|---|---|---|
| **Warrior** | **Murka** 0–100 (merah) | +3 per musuh kena serangan dasar; +1,5 per 1% HP hilang | −12/dtk setelah 3 dtk tanpa bertukar damage | Bertahap: jangkauan tebas 46→72, sudut 100°→160°, hisap darah 0→4%, damage diterima −0→−20%. Di 100 masuk **MENGAMUK!** selama 6 dtk: kec. serang +40%, kebal lambat, tiap tebasan memancarkan gelombang kejut (r60, 50%, dorong 140). |
| **Mage** | **Panas** 0–100 (jingga) | biaya energi skill × 0,6 | −15/dtk | Damage skill +0→+30% sampai Panas 80. Di 100 terjadi **Kepanasan**: skill terkunci 2,5 dtk dan gerak −30%. |
| **Archer** | **Bidik** 0–100 (hijau) | +60/dtk saat diam sambil menyerang | jadi 0 saat bergerak atau menghindar | Saat penuh, panah berikutnya pasti kritis, menembus 3, dan berukuran ×2. |
| **Assassin** | **Kombo** 0–5 titik (ungu) | +1 per 3 tusukan kena | hilang semua setelah 4 dtk tanpa menyerang | Skill apa pun (bukan ultimate) menghabiskan titik: +25% damage per titik. Dengan 5 titik, musuh biasa ber-HP < 30% langsung mati. |

- **Momen puncak** (§31.8): Warrior membesar dan layar berkedip merah; tongkat Mage menyala lalu berasap; Bidik penuh memunculkan garis cahaya dan hit-stop; eksekusi Kombo membuat layar hitam-putih. Semuanya mengikuti tingkat efek dan pengaturan "kurangi gerakan".
- **Tanda yang makin kuat** (rencana Rasa Pukulan, bagian C; angka `TRAIT_FX` di `data/skillfx.js`, efek `run/skillfx.js`):
  - **Murka:** mulai 15%, bara naik dari kaki Warrior. Makin penuh, makin banyak (jumlah × isi²); di atas 75% baranya merah terang. Saat MENGAMUK ada auman dan kamera mendekat sedikit.
  - **Panas:** tongkat mulai menyala dari Panas 50 (dulu 80). Saat **Kepanasan**: kilat jingga, cincin panas, bara dan asap, guncangan sedang, bunyi desis.
  - **Bidik:** saat penuh ada bunyi "ting" tinggi dan cincin kecil yang mengecil ke titik bidik.
  - **Kombo:** titik-titik ungu berbentuk wajik di lantai, di sekeliling kaki Assassin (satu per titik Kombo; 10 untuk Penari Pedang). Saat penuh, titik-titik berputar, cincin berdenyut, dan ada bunyi "ting" + cincin keluar sekali. Skill yang dilepas dengan Kombo penuh (**finisher**) selalu bertanda: tebasan silang ungu, cincin, kilat tipis, guncangan sedang, jeda 0,05 dtk.
  - Bunyi-bunyi ini sintetis (`core/audio.js` `roar`, `sizzle`, `ready`).
- Terjang (Warrior) yang membunuh langsung siap dipakai lagi (`resetOnKill`).

### 6. Skill

#### 6.1 Pohon skill & SP (§43.2, `data/skilltree.js`, `meta/jobs.js`, `ui/skilltab.js`)
- **2 SP per level** mulai level 2 (level 50 = 98 SP). Pohon penuh butuh ±170 SP, jadi pemain harus memilih.
- Ada 4 tab: **Aktif · Ultimate · Pasif · Umum**.

| Tab | Isi | Level | Biaya |
|---|---|---|---|
| Aktif | 8 skill job (+2 skill cabang) | 1–5 | 1, 1, 2, 2, 2 SP (8 SP sampai maks) |
| Ultimate | Luas & Fokus (+1 ultimate cabang) | 1–3 | 3 SP per level |
| Pasif | 3 pasif job (+2 pasif cabang) | 1–3 | 2 SP per level |
| Umum | 8 bakat lama | 1–5 | 1 SP per level |

- Skill terbuka berdasarkan **level karakter** saja (`unlock`). Skill aktif harus minimal level 1 untuk dipasang.
- **Dua skill bawaan** (`unlock: 1`) gratis di level 1 dan langsung terpasang di A1/A2 (`FREE_START_LEVEL`).
- **Level skill aktif:** damage +12% per level (level 5 = 148%). **Level 3 dan level 5 memberi efek tambahan** (`lv3`/`lv5`, `run/skilllevel.js` `leveled`). **Level ultimate:** damage +15% per level.
- **Atur Ulang SP** di Pelatih: `80 + 15 × level` koin, hanya untuk job aktif. Gratis sekali saat pertama memakai job baru.
- SP hanya bisa dibelanjakan di kota (`treeEditable`). Susunan slot bisa diatur di mana saja, termasuk dungeon dan wilayah; game berhenti selama panel terbuka.
- **Umum** (bakat lama): Kekuatan ATK +3%, Ketahanan HP +4%, Ketajaman kritis +1,5, Fokus Sihir damage skill +8%, Aliran Energi energi +10%, Kegesitan jeda dodge −6%, Dahaga Darah hisap 0,6%, Keberuntungan koin & EXP +5%. Semua per level, maks 5.

#### 6.2 Pasif job (maks 3 level)

| Job | Pasif (buka lv 3 / 8 / 12) |
|---|---|
| Warrior | Darah Panas (Murka masuk +15%) · Kulit Baja (damage diterima −4% saat Murka > 50) · Tebasan Lebar (lebar tebasan +8%) |
| Archer | Napas Tenang (Bidik +15%) · Kaki Ringan (gerak +4%) · Mata Tajam (kritis +3% ke musuh > 250 px) |
| Mage | Darah Dingin (Panas turun +15%) · Hemat Mana (energi skill −5%) · Ledakan Besar (area skill +6%) |
| Assassin | Ingatan Otot (Kombo bertahan +1 dtk) · Bilah Racun (5% racun 3 dtk, 20% ATK/0,5 dtk) · Lolos Tipis (kritis +10% selama 2 dtk setelah menghindar) |

Logika pasif ada di `run/passives.js` (racun, bakar, Lolos Tipis) dan `run/traits.js`.

#### 6.3 Skill aktif per job (`data/classes.js`; angka di sini = level 1)

**Warrior**

| Skill | Buka | Jenis | Ringkas | L3 / L5 |
|---|---|---|---|---|
| Putaran Pedang | 1 | area | 5×220% r95, menarik; energi 35, cd 3 | +2 tebasan / pusaran 2 dtk |
| Teriakan Baja | 1 | buff | damage diterima −60% 5 dtk + gelombang 250% | +2 dtk / gelombang membekukan 0,8 dtk |
| Terjang | 1 | dash | 220 px 320%, kebal, kill = siap lagi | jarak +60 / jejak api |
| Retakan Bumi | 5 | line | 5 pilar 160% berurutan, beku sesaat | +2 pilar / pilar akhir 300% |
| Kapak Bumerang | 15 | proj | pergi-pulang 2×160%, menyeret | kapak kedua / berhenti 0,6 dtk di ujung |
| Amarah Perang | 20 | buff | ATK +35%, kec. serang +30% 6 dtk | gerak +20% / Murka +40 |
| **Tebasan Raksasa** | 8 | charge | tahan s/d 1,2 dtk: jangkauan 70→160, 200%→700%; penuh = menembus & memecah perisai | jangkauan +30 / penuh 0,8 dtk |
| **Tangkis Baja** | 12 | parry | jendela 0,5 dtk; berhasil = 600% r90, Murka +30 | jendela 0,7 / memantulkan peluru |

**Archer**

| Skill | Buka | Jenis | Ringkas | L3 / L5 |
|---|---|---|---|---|
| Hujan Panah | 1 | area bidik | 6×160% r85 | area +25% / lambat 40% |
| Panah Naga | 1 | proj | tahan 0,3 dtk, 500% menembus semua + jejak bakar | jejak +1 dtk / dua naga |
| Panah Pecah | 5 | fan | 5 panah, masing-masing pecah jadi 3, 160% | pecah 4 / pecahan menembus 1 |
| Lompatan Mundur | 10 | dash mundur | ledakan es beku 1,2 dtk | 2× berturut / Bidik penuh |
| Ladang Jebakan | 15 | area bidik | 8×90% 4 dtk, lambat | +2 dtk / ledak 300% |
| Mata Elang | 20 | buff | kritis +30%, kec. serang +25% 6 dtk | dmg kritis +20% / panah biasa menembus 1 |
| **Sinar Panah** | 8 | channel | sinar 8×/dtk 60%, gerak −60%, energi 15 + 20/dtk | maks 3 dtk / sinar ×2 di akhir |
| **Menara Panah** | 12 | turret | menara 8 dtk, tembak tiap 0,4 dtk 120%, maks 2 | tembus 1 / maks 3 |

**Mage**

| Skill | Buka | Jenis | Ringkas | L3 / L5 |
|---|---|---|---|---|
| Nova Es | 1 | area | 300% r125, beku 1,5 dtk | beku +0,5 / serpihan es |
| Badai Petir | 1 | storm | 8 sambaran × 350% | +3 sambaran / area 50 |
| Meteor | 5 | area bidik | 600% r110 | area +25% / lava 2 dtk |
| Teleportasi | 10 | dash | 230 px seketika | 2× berturut / ledakan es di titik awal |
| Matahari Kecil | 15 | proj | 300% meledak + 6 serpihan 120% | +3 serpihan / meledak dua kali |
| Perisai Mana | 20 | buff | damage diterima −55%, ATK +20% 7 dtk | +2 dtk / meledak 300% saat habis |
| **Bom Waktu** | 8 | rune | meledak setelah 2 dtk 800% r90, +10% per pukulan (maks +100%) | 1,5 dtk / rune kedua 400% |
| **Semburan Api** | 12 | channel | kerucut 120, 10×/dtk 50%, Panas +20/dtk | kerucut +20° / membakar |

**Assassin**

| Skill | Buka | Jenis | Ringkas | L3 / L5 |
|---|---|---|---|---|
| Langkah Bayangan | 1 | dash | 180 px 500%, kebal | 2× berturut / gema tebasan |
| Lingkaran Belati | 1 | fan 360° | 11 belati melingkar lalu spiral, 330% | +4 belati / belati kembali |
| Kabut Racun | 5 | area bidik | 8×90% 3 dtk | area +25% / musuh +15% damage |
| Bom Asap | 10 | buff | beku 1,2 dtk, damage diterima −40% 4 dtk | beku +0,5 / kebal 1 dtk |
| Shuriken Raksasa | 15 | orbit | mengorbit 3 dtk 130%/0,25 dtk, dilempar 450% | radius +20 / membelah 3 |
| Naluri Pembunuh | 20 | buff | kritis +40%, dmg kritis +60% 6 dtk | +2 dtk / kill +0,5 dtk |
| **Tarian Tiga Tebasan** | 8 | chain | ① 250% · ② 300% r70 · ③ 600% + pingsan 1 dtk; jendela 0,8 dtk | jendela 1 dtk / gelombang 300% |
| **Klon Bayangan** | 12 | clone | klon 6 dtk 50%, menarik separuh musuh | 70% / meledak 400% |

- Jenis gerak skill ada di `run/skills.js` dan `run/hits.js`: area, proj, fan, line, storm, orbit, dash, buff, charge, channel, chain, parry, turret, clone, rune, focus, rewind. Menara, klon, rune, dan implode ada di `run/summons.js`. Skill yang ditahan dan tangkis ada di `run/tempo.js`.
- Semua serangan skill tidak mengisi energi dan menembus perisai musuh.

#### 6.4 Slot skill, halaman A/B & ultimate
- **4 slot per halaman** (`SKILL_SLOTS = 4`), dengan **2 halaman (A/B)**. Halaman B terbuka di **level 15** (`PAGE_B_LEVEL`) dan memunculkan spanduk sekali. Satu skill hanya bisa berada di satu slot.
- Halaman ditukar dengan tombol **Q** (PC) atau **⇄** (HP), seketika. Jeda halaman yang tersembunyi tetap berjalan dan tampil sebagai 4 ikon redup. Menukar halaman membatalkan skill charge/channel/chain yang sedang berjalan. Halaman terakhir diingat per job.
- **Dua ultimate per job** terbuka di **level 25**. Satu dipasang di tombol **5**; menukarnya gratis (tombol Pakai hanya di kota). Ultimate cabang menjadi pilihan ketiga.
  - Bar ultimate (`ULT`, `data/balance.js`) maksimal 100: +2 per kill, +10 elite, +25 bos, +40 per 100% HP maks yang hilang. Bar mulai 0 di setiap perjalanan.

| Job | Luas | Fokus (keluar < 1 dtk, ≈1,8× Luas ke satu sasaran) |
|---|---|---|
| Warrior | Badai Pedang: 10×300% r150 2,5 dtk, menarik, damage diterima −50% | Hantaman Langit: lompat, 1×5400% r70, pingsan 2 dtk; Murka penuh +30% |
| Archer | Hujan Bintang: 12×250% r200 3 dtk, lambat | Panah Penembus Langit: bidik 0,5 dtk, sinar 5400% |
| Mage | Hujan Meteor: 6×600% r220 2,4 dtk | Matahari Runtuh: menyedot 0,8 dtk, 1×6500% r60 |
| Assassin | Tarian Seribu Bayangan: 12×260% r130, kebal 2 dtk | Eksekusi Bayangan: teleport ke belakang, 3 tebasan 5600%, eksekusi < 30%, +10% per Kombo |

- Logika Fokus ada di `run/focus.js` (leap, beam, implode, behind). Saat kena: getar keras dan waktu melambat.

#### 6.5 Bidik dulu, klik untuk melepas (§37, `run/aim.js`, `render/aim.js`)
- Berlaku dengan mouse saat serang otomatis mati. Tombol 1–4 atau 5 masuk mode bidik dengan penanda emas di tanah. **Klik kiri** melepas skill. **Klik kanan** atau **Esc** membatalkan. Menekan tombol yang sama lagi = cast cepat.
- Bentuk penanda: jalur berpanah, lingkaran jangkauan + area, atau kerucut.
- Skill yang langsung keluar tanpa bidik: buff, putaran, kipas 360°, dan ultimate yang mengikuti pemain. Di HP (layar sentuh), bidik otomatis ke musuh terdekat.
- Kontrol skill tempo (§43.7): **charge/channel** = tahan tombol (klik kanan batal); **chain** = tekan lagi; **turret/clone/rune** memakai mode bidik.

### 7. Job Lanjutan (§43.10, `data/branches.js`, `run/branch.js`, `meta/jobs.js`)

- **Syarat:** level **30** dan sudah memilih job. Ujian dimulai lewat Pelatih → **Mulai Ujian** (`canTrial`).
- **Ujian Bayangan Diri:** arena lantai 5 tanpa gelombang melawan bos `shadowself`, yaitu gambar hero pemain sendiri yang digelapkan dengan mata merah dan aura ungu (`art/bosses/shadow.js`). HP ×4,5 dan damage ×3,2 di level 30, +4% per level di atasnya (`BRANCH.trial`, `trialAt`). Tidak ada yang disimpan dan tidak ada hadiah. Menang membuka dialog pilih satu dari dua cabang (pertama kali gratis). Kalah boleh mencoba lagi.
- **Ganti cabang** di Pelatih: `jobChangePrice × 2`, tanpa ujian ulang. SP cabang lama dikembalikan dan skillnya dilepas.
- Setiap cabang memberi: perubahan mekanik khas (`fx`), 2 skill (lv 30 / 35), 1 ultimate (lv 30), 2 pasif (lv 30 / 32, maks 3), gelar ("Sang …") di Karakter, HUD, dan daftar slot, serta warna aura (`art/branchaura.js`). Ikon sendiri ada di `art/branchicons.js` dan efek megahnya di §48 (`render/branchfx.js`, `run/branchfx.js`, `render3d/branch3d.js`, `data/branchfx.js`).

| Job | Cabang | Mekanik berubah | Skill lv30 · lv35 | Ultimate | Pasif |
|---|---|---|---|---|---|
| Warrior | **Berserker** | Murka tidak turun; damage s/d +40% di HP 20%; tanpa pengurangan damage Murka | Amuk Darah (ATK & kec. serang +40%, hisap 3%, damage diterima +20%) · Lompatan Amuk (dash 600%, kill = siap lagi) | Ragnarok (8×400% 2 dtk) | Haus Darah · Kulit Tebal (HP +5%/lv) |
| Warrior | **Paladin** | perisai suci 1% HP per tebasan (maks 20%); pulih 1% HP/dtk; tebasan mendorong | Perlindungan Suci (−60% damage 6 dtk) · Palu Penghakiman (500% r90) | Tanah Suci (6×250%, −50% damage) | Iman (pulih +0,3%/lv) · Benteng (DEF +2/lv) |
| Archer | **Penembak Jitu** | Bidik +50% lebih cepat; +1% damage per 4 unit jarak | Tembakan Kepala (700%, tembus 2) · Fokus Mantap (kritis +40%, dmg kritis +50%) | Mata Maut (sinar 7000%) | Jarak Jauh · Sabar |
| Archer | **Pemburu** | 25% panah memantul (petir berantai); damage +15% saat bergerak | Panggil Serigala (klon 12 dtk 80%) · Hujan Lari (7 panah 160%) | Gelombang Buru (8 pilar 300%) | Lincah · Pelacak |
| Mage | **Penyihir Api** | Panas penuh meledak r150 600%; Kepanasan −50%; CDR −10% | Badai Api (6×160%) · Bakar Habis (500% r130) | Supernova (2000% r220) | Pemantik (skill membakar) · Jantung Api |
| Mage | **Penyihir Waktu** | musuh dalam 150 px −30% gerak; 6% peluru dipantulkan | Putar Balik (kembali ke posisi & HP 3 dtk lalu, ledakan 200%) · Medan Waktu | Hentikan Waktu (r260 beku 4 dtk) | Percepat (CDR +3/lv) · Tangkis Waktu |
| Assassin | **Bayangan** | 1,5 dtk setelah menghindar/melesat: pukulan pertama pasti kritis ×1,5 | Menghilang (kebal 1,5 dtk) · Serangan Bayangan (dash 600%) | Gerhana Bayangan (4 tebasan 7000%, eksekusi < 35%) | Gorok · Selubung Malam |
| Assassin | **Penari Pedang** | Kombo maks 10; kec. serang +3% per Kombo; Kombo putus = hilang semua | Pusaran Pedang (orbit) · Hujan Tebasan (9 belati 180%) | Seribu Sayatan (20×120%, kebal) | Irama · Tajam (kritis +2/lv) |

### 8. Pertarungan

#### 8.1 Kontrol PC (`core/input.js`, `main.js`)
| Aksi | Tombol |
|---|---|
| Gerak | WASD / panah |
| Serang | klik kiri / tahan |
| Skill | 1–4 · Ultimate 5 · tukar halaman Q |
| Menghindar | Spasi |
| Ramuan sabuk | Z X C V |
| Bicara | E |
| Mount | R |
| Panel Karakter | I |
| Jurnal quest | J |
| Peta | M |
| Serang otomatis | F |
| Menu/jeda | Esc |

HP: joystick, tombol serang, 4 tombol skill, ultimate, dodge, ⇄, dan sabuk (`ui/touch.js`). Bidik otomatis dalam jangkauan 450 px (`AUTO_AIM_RANGE`).

#### 8.2 Mode AUTO
Tombol F atau tombol AUTO menyerang sendiri bila ada musuh dalam jangkauan (jarak dekat: r + 14) dan membidik musuh terdekat. Skill dan dodge tetap manual.

#### 8.3 Tempo hack and slash (§33, `TEMPO` & `DODGE` di `data/balance.js`)
- Gerak ×1,5, jeda serangan dasar ×0,7, laju proyektil dasar ×1,3. Stat yang tampil di layar tidak berubah.
- **Menghindar:** jarak 180 px dalam 0,18 dtk, kebal 0,25 dtk, jeda 0,78 dtk.
- Musuh datang berkelompok 3–6 dengan jumlah ×1,6 dan HP ×0,8. Hadiah per musuh biasa ×0,65.

#### 8.4 Energi & damage
- **Energi:** maks 100, mulai 50, pulih 3/dtk, diisi oleh serangan dasar yang kena (`ENERGY`).
- Damage = ATK × pengali skill × (kritis ? critDmg : 1) × level skill × bonus mekanik/cabang × pengali selisih Power (`run/run.js`).
- **DEF memotong persen** (§47.4, `meta/power.js` `defenseCut`): pukulan × (1 − DEF / (DEF + 0,6 × (level + 15))), potongan maks 75%. Setiap pukulan minimal 1.
- Pemain kebal 0,7 dtk setelah terkena.
- **Efek item unik** (`data/dungeon.js` `FX`): eksekusi < 30%, petir berantai (jangkauan 140, 80%), perisai tiap 10 dtk, amuk < 50% HP, ledakan r46, Phoenix bangkit sekali dengan kebal 2 dtk.

#### 8.5 Ramuan & sabuk (`data/potions.js`, `meta/shop.js`)

| Ramuan | Efek | Harga |
|---|---|---|
| Merah | pulih 40% HP | 25 |
| Besar | pulih 80% HP | 60 |
| Perisai | perisai 30% HP maks, 8 dtk | 45 |
| Angin | gerak +35%, jeda dodge −50%, 10 dtk | 40 |
| Amuk | ATK +30%, kec. serang +20%, 10 dtk | 50 |

- Maks 5 per jenis. **Sabuk 4 slot** (Z X C V), diatur di Toko Ramuan. Jeda minum 1 dtk bersama.
- Di kota hanya ramuan pulih yang bisa diminum. Buff tampil sebagai chip di HUD dan perisai sebagai gelembung. Ada tanda saat minum ramuan.
- Pemulihan lain: Penginapan `10 + 2 × level` koin, tidur di rumah sendiri gratis (`homeRest`), dan pulih 1% HP/dtk di kota (`TOWN_REGEN`).

### 9. Power & tingkat kesulitan otomatis (§47)

- **Power** (`meta/power.js` `powerFrom`, angka di `data/power.js`): `√(serang × HP efektif) × 10 × (1 + 0,006 × total level skill)`.
  - serang = ATK × rata-rata kritis × kec. serang × (1 + 0,5 × CDR%)
  - HP efektif = HP maks / (1 − potongan DEF)
  - Power dihitung saat dibutuhkan dan tidak disimpan.
- **Power disarankan** per level musuh (`REC_POWER`): lv1 380, lv5 670, lv10 1495, lv15 2382, lv20 3228, lv25 4332, lv30 5543, lv35 6717, lv40 8016, lv45 9167, lv50 11112, dengan interpolasi linear di antaranya.
- **Level musuh:** wilayah = level dunia di titik itu. Dungeon = `DUNGEON_LEVEL` (shadow 3, crystal 10, fungus 19, tomb 26, lava 33, spire 45) + 1 per lantai. Celah dan Ujian Cabang = level karakter.
- **Selisih Power** (`gapOf`, `run/foelevel.js`), dengan r = Power ÷ saran:

| Keadaan | Pukulan musuh | Seranganmu |
|---|---|---|
| Lebih kuat (r ≥ 1) | × r^−1,5 (min 0,2) | × r^0,45 (maks 1,6) |
| Lebih lemah (r < 1) | × r^−0,68 (maks 2) | × r^0,415 (min 0,5) |

  Berlaku untuk sentuhan, peluru, zona, dan sinar musuh.
- **Kekuatan dasar musuh:** `ENEMY_POWER = { hp 2,2, bossHp 7,5, dmg 5,4, bossDmg 0,6 }`.
- **Tampilan:** Power muncul di kartu Pilih Karakter, panel Karakter (kilau dan +/− saat berubah), detail gear ("Power bila dipakai", `powerDelta`), kartu tujuan loading, dan nama wilayah ("Disarankan …"). Warna: hijau bila ≥ 1,25×, kuning bila ≥ 0,85×, merah di bawahnya (`ui/power.js`, `ui/power.css`).
- Celah tanpa batas tetap ada (naik +8% per lantai, dengan berkah `run.mods`), dimasuki dari tab Tantangan.

### 10. Gear

#### 10.1 Slot & rarity (`data/items.js`)
- **6 slot:**

| Slot | Stat dasar di item level 1 | Catatan |
|---|---|---|
| Senjata | ATK 5 | khusus kelas |
| Helm | HP 14 | |
| Armor | DEF 1,2 + HP 10 | |
| Sepatu | gerak 4 | |
| Kalung | kritis 1,5 | |
| Cincin | hanya bonus | minimal Bagus |

- **6 rarity:**

| Rarity | Warna | Bonus acak | Pengali | Soket |
|---|---|---|---|---|
| Biasa | `#e8e8e8` | 0 | ×1,00 | 0 |
| Bagus | `#6ee7a0` | 1 | ×1,00 | 0 |
| Langka | `#6ec9ff` | 2 | ×1,08 | 1 |
| Epik | `#c26bd8` | 3 | ×1,18 | 1 |
| Legendaris | `#ffb547` | 3 | ×1,30 | 2 |
| Mitos | `#ff4d6d` | 4 | ×1,45 | 2 |

#### 10.2 Pembuatan item (`meta/itemgen.js`)
- **Stat dasar** = dasar slot × (1 + 0,12 × (level item − 1)) × pengali rarity × (1 + 0,1 × tempa).
- **Bonus acak** tanpa duplikat dari 9 stat: atk, maxHp, def, atkSpd, crit, critDmg, moveSpd, cdr, magnet. Nilainya 70–100% dari maksimum yang tumbuh dengan level item.
- **Nama:** varian + akhiran bonus pertama (Ganas, Kokoh, Baja, Kilat, Tajam, Maut, Angin, Bijak, Pemikat).
- **7 varian tampilan** per slot, mengikuti level item 1/5/10/16/23/31/40. Senjata punya 7 varian per kelas (misalnya Pedang Kayu sampai Pedang Naga, Busur Ranting sampai Busur Phoenix). Bahan tampak berubah dari kayu sampai naga.
- **Level item** = level karakter − 1 + lantai ± 1, maks level karakter + 4 (dan ≤ 50).
- **Peluang rarity** (Biasa…Mitos):

| Sumber | Peluang | Bobot rarity |
|---|---|---|
| Musuh biasa | 1,5% (× 0,65 tempo) | 60/27/10/2,4/0,6/0 |
| Elite | selalu 1 | 36/34/20/7,5/2,5/0 |
| Peti lantai bersih | 1 | 44/32/16/6/2/0 |
| Bos | 2 item | 0/0/55/32/11/2 |
| Peti Agung | 1 | 0/0/50/35/12/3 |

  LUK menaikkan bobot Langka ke atas.
- **Item unik:** 13 Legendaris + 7 Mitos yang bisa jatuh, ditambah 5 hadiah quest. Drop Legendaris/Mitos selalu salah satu item unik yang cocok untuk kelas.
  - **Bersumber** (`UNIQUES[].from`, `UNIQUE_FAVOR`, `meta/itemgen.js` `pickUnique`): drop bos lebih sering (×4) menjadi item unik bos itu. Raja Maw: Taring & Zirah Raja Maw, Mahkota Raja Lendir, Helm Tanduk Gelap · Golem Kristal: Busur Angin Utara, Jubah Penjaga · Ratu Spora: Zirah Duri Hitam, Sepatu Kabut, Belati Bulan Sabit · Raja Mumi: Pedang Fajar, Liontin Keserakahan, Cincin Sang Bijak · Raja Lava: Tongkat Bara Abadi, Cincin Amarah, Cincin Phoenix · Sang Gerhana: Tongkat Kiamat, Belati Ketiadaan, Busur Bintang Jatuh, Mahkota Bayangan, Kalung Mata Naga. Bos acak di Celah juga.
  - **Pengurang sial:** item unik yang belum ada di kodeks karakter ×3 lebih sering (drop di perjalanan, Peti di toko, tonggak Celah). Efek yang ada: menghisap, duri, petir berantai, eksekusi, perisai, regenerasi, koin+, EXP+, dodge cepat, amuk, damage bos/elite, ledakan, bangkit sekali (Cincin Phoenix).
  - Contoh: Pedang Fajar, Busur Angin Utara, Tongkat Bara Abadi, Belati Bulan Sabit, Taring Raja Maw, Busur Bintang Jatuh, Tongkat Kiamat, Belati Ketiadaan, Mahkota Bayangan.
  - Hadiah quest (tidak bisa jatuh atau dijual): Kalung Akar Tua, Cincin Bintang Beku, Topeng Pasir Abadi, Zirah Sisik Kawah, Mahkota Fajar.
- **Elite** (`ELITE`): peluang 3–7% per lantai (× 0,75), HP ×4, damage ×1,4, EXP ×5, 10 koin. Sifat acak elite ada di `run/affix.js` (slice musuh).

#### 10.3 Tas & panel gear (`meta/gear.js`, `ui/gear.js`)
- Tas maks **60** (`INVENTORY_MAX`). Gudang 120 ada di kota besar.
- Tab Gear menampilkan 6 slot, isi tas, dan kartu detail: stat, bonus, efek ★, perbandingan hijau/merah, dan Power. Ada tombol Pasang/Lepas/Buang.
- Gear hanya bisa diganti di kota. Memasang gear tidak memulihkan HP.
- Senjata hanya bisa dipasang oleh kelas yang cocok (`canEquip`).

#### 10.4 Pandai Brom: Peti & Jual (`meta/shop.js`, toko baru §45.5)
- **Peti Gear** `30 + 10 × level` dan **Peti Agung** `150 + 40 × level`, berisi 1 gear selevel karakter. Peti dibuka dengan animasi `ui/reveal.js`. Tas penuh = ditolak.
- **Jual:** harga `5 × level item × (1 + rarity)`. Bisa memilih banyak, atau "Pilih semua Biasa" / "≤ Bagus". Gear yang sedang dipakai tidak bisa dijual.
- Panel toko baru: kisi barang berbingkai rarity, kartu detail dengan ▲/▼, stempel DIBELI, dan NPC yang bereaksi dengan mood.

#### 10.5 Tempa, material & permata (§20, `data/forge.js`, `meta/forge.js`, `ui/forge.js`)
- **Material:** Debu Rune, Kristal Arkana, Inti Kegelapan.
  - Mengurai gear: Biasa 2 debu … Mitos 15 debu + 6 kristal + 3 inti. Epik ke atas punya peluang 35% memberi permata Retak.
  - Lantai bersih: 3 debu × lantai. Elite: 50% peluang 1–3 debu. Bos: 3 kristal + 1 inti + 1 permata.
- **Tempa +0…+15:** setiap tingkat +10% stat dasar.
  - Biaya langkah +p: koin `10 × level item × (p+1)`, debu `2 + 2p`, kristal `p − 4` (mulai +5), inti 1 (mulai +10).
  - Peluang: 100% sampai +5, lalu 90/80/70/60/50/40/35/30/25/20%.
  - Gagal di bawah +10 = tetap. Gagal dari +10 ke atas = turun 1.
- **Asah ulang** satu baris bonus: 2 kristal + `5 × level item` koin.
- **Permata** (Tukang Permata Sari): Rubi (ATK 3→24), Zamrud (HP 15→120), Berlian (DEF 1→8), Topas (kritis 1→7), Kecubung (dmg kritis 0,05→0,35), Safir (CDR 1→7).
  - Tingkat: Retak, Biasa, Jernih, Sempurna, Agung.
  - Pasang gratis, lepas 30 koin. Gabung 3 → 1 tingkat lebih tinggi seharga `40 × tingkat` koin.

### 11. Tumbang & aturan kalah

- **Di dungeon** (`data/dungeon.js` `DEATH`, `meta/character.js` `applyTrip`):
  - Koin **dari perjalanan itu** tersisa **50%**.
  - Setiap gear temuan dan setiap permata punya 50% peluang hilang.
  - Material tersisa separuh.
  - Bangun dengan 10% HP.
  - EXP dan level tetap.
- **Di wilayah** (`meta/world.js` `fieldDeath`): kehilangan **10% dari seluruh koin** (`FIELD.deathGoldLoss`), lalu bangun di kota terakhir dengan 10% HP. Layar ada di `ui/death.js`; urutan Tumbang sebelum dialog di `ui/fall.js`.
- **Celah:** hadiah sampai titik simpan aman. Tumbang hanya memotong koin, gear, bahan, dan permata sesudah titik simpan; EXP tetap.
- **Coba Job & Ujian Cabang:** tidak disimpan. Karakter asli kembali ke kota.

---

### Catatan: dihapus/berubah (spesifikasi lama vs kode sekarang)

- **Normal/Sulit/Neraka dihapus** (§47.5, save v28). `data/difficulty.js` dan `meta/difficulty.js` sudah tidak ada. Kesulitan kini ditentukan oleh selisih Power. Tab Tantangan hanya berisi Celah. Aturan koin hilang 15%/25% di Sulit/Neraka dan kunci Neraka sudah tidak berlaku.
- **Pilihan kelas di Buat Karakter dihapus** (§43.1). Semua karakter mulai sebagai Pengembara. Tabel kelas §4.2 (moveSpd Warrior 105) sudah usang; sekarang 112.
- **Kartu berkah level-up** (§5.5) dihapus dan diganti poin atribut (§14).
- **Bakat** (`data/talents.js`, §21) dihapus dan menjadi tab **Umum** di pohon SP (§43.2). Save `skills`/`talents` diganti `jobs{}`.
- **Pool 6 skill + 1 ultimate tanpa level** (§21–22) diganti 8 skill per job dengan level 1–5, 2 ultimate, 2 halaman, dan skill cabang.
- **Q/E sebagai tombol skill** (§4.2, §18.2) sudah lama diganti tombol 1–4. Q kini menukar halaman skill dan E untuk bicara.
- **Ramuan di tombol 1–4 / R** (§15.2) diganti **Z X C V**. R kini untuk mount.
- **Rarity 4 tingkat & 4 slot** (§6) diganti 6 rarity dan 6 slot (§14.2). Tas 30 menjadi 60. Pengali Langka/Epik berubah dari 1,05/1,15 menjadi 1,08/1,18.
- **Rambut 5 gaya** (§8) kini **6 gaya** (`HAIR_STYLES = 6`).
- **Toko Kemah dan upgrade Potion Awal** (§7) dihapus dan dipecah ke NPC kota (Pelatih, Toko Ramuan, Pandai Brom, Tukang Cukur).
- **Koin tersisa saat tumbang:** tabel §41.3 menyebut 90% untuk Normal, tetapi kode memakai `DEATH.goldKeep = 0.5` (50% koin perjalanan). Di wilayah, kehilangan 10% dari seluruh koin.
- **Coba Job:** spesifikasi menyebut arena boneka. Kode memakai lantai 1 Ruang Bawah Tanah Bayangan. Quest "Pilih Jalanmu" tidak ada; pemilihan job dibuka di Pelatih mulai level 5 dan dirangkai lewat Prolog `ch0`.
- **Ujian Bayangan Diri** dulu disyaratkan di tingkat Sulit (§41.4). Sekarang memakai angka sendiri (`BRANCH.trial`).
- **Lompatan Mundur** mengisi Bidik penuh hanya di L5 (dulu selalu, §31.4). **Panah Pecah L5** "memantul" disederhanakan menjadi menembus 1 musuh. Panah Pecah kini 5 panah × 3 pecahan, 160% (bukan 3 × 3, 120%). Lingkaran Belati 330% (bukan 180%).
- **DEF datar** (`max(1, damage − def)`, §5.2) diganti DEF persen (§47.4).
- **Isi ultimate per kill** 3 → 2 (§33.4).
- **Elite** §5.3 (HP ×3, pasti gear) sudah usang. Sekarang HP ×4, damage ×1,4, ditambah sifat acak.
- **Penyetelan ulang angka §33** dengan patokan bot di 9E dicatat "belum" di spesifikasi dan kini digantikan pendekatan Power §47.
- **Sebutan "senjata bawaan Pengembara"** (§43.1): di kode Pengembara digambar tanpa senjata dan `createCharacter` tidak memberi senjata. Senjata baru diberikan saat memilih job.

---

## Bagian B: Dunia, Tempat, Musuh & Konten


---

### 1. Kota Awal (desa tempat lahir)

**File:** `data/town.js` (`TOWN`, `INTERIORS`, `DOORS`), `data/towns.js` (`home` = Kota Awal + Batu Teleport + Gerbang Celah), gambar `render3d/town.js`, `render3d/townbuild.js`.

- **Ukuran:** 2000 × 1600 unit, bertembok (tebal 30). Muncul di alun-alun (1000, 820) saat slot dimuat dan di depan gerbang (1000, 1420) setelah bepergian.
- **Tata letak:**
  - **Utara:** deretan toko (Penginapan, Toko Ramuan, Pandai Besi, Balai Petualang) mengapit **pohon raksasa**.
  - **Tengah:** alun-alun dengan **api unggun**, **Batu Teleport** di timur dan **Gerbang Celah** di barat.
  - **Barat:** rumahmu, rumah tetangga, sumur, 3 ladang, lumbung.
  - **Timur:** kandang berpagar, rumah lain, kolam.
  - **Selatan:** 2 lapak pasar (buah & kain) di jalan menuju gerbang.
- **Bangunan:**

  | Id | Nama | Keterangan |
  |---|---|---|
  | `inn` | Penginapan | Bu Marta. Tidur berbayar `10 + 2 × level`, HP penuh, jam maju ke 07:00 (`meta/shop.js` `innRest`) |
  | `potion` | Toko Ramuan | Nenek Mira. Ramuan & sabuk |
  | `gear` | Pandai Besi | Pandai Brom (Peti, Jual, Tempa, Urai) dan Sari (permata: Soket, Gabung) |
  | `guild` | Balai Petualang | Guru Hadi (Pelatih/pilih job/Ujian) dan Kapten Vera (Papan Tugas) |
  | `myhome` | **Rumahmu** | Pondok `cottage`. Di dalamnya ada **Tempat Tidur gratis** (role `rest`, `meta/shop.js` `homeRest`): HP penuh dan jam maju ke pagi berikutnya, hanya bila HP belum penuh |
  | `home1`–`home6` | Rumah warga | Gaya beragam: `cottage`, `tall`, `thatch`, `wing` (`render3d/townbuild.js`) |
  | `barn` | Lumbung | Gaya `barn` |
  | `barber` | Lapak Tukang Cukur | Bang Rudi |
  | `stable` | Lapak Kandang | **Mbah Sarju**, Penjaga Kandang (mount) |
  | `fence0–3` | Pagar kandang (paddock) | Di timur |
  | lainnya | Hiasan | Api unggun, pohon besar, sumur, 3 ladang (`garden`), kolam, 2 lapak pasar, patung, gerbang |

- **Interior:** setiap interior punya perabot padat dan cahaya hangat.
  - **Rumahmu:** tempat tidur, perapian, meja, rak, peti, karpet, tanaman.
  - **Penginapan:** konter, tangga, meja.
  - **Toko Ramuan:** kuali, rak botol, herba.
  - **Pandai Besi:** tungku, landasan, rak senjata.
  - **Balai Petualang:** papan tugas, trofi, panji, meja panjang, boneka latihan.
- **Warga (±20 NPC):**
  - **Di luar rumah (`role: 'talk'`, 17 orang):** Dara (Petualang), Kakek Odo (Tetua Kota), Pip (Anak Kota), Prajurit Gani (patroli), Sela (Penyanyi Keliling), Pak Darto (Petani), Bu Sri (Peramu Daun), Nenek Ijah (Tukang Cerita), Tika (Anak Desa), Bimo (Anak Kandang), Mas Joko (Pandai Kayu), Mbak Rini (Pedagang Buah), Bu Wati (Pedagang Kain), Lala (Penari Desa), Rangga (Pemburu), Sang Pengelana, Penjaga Sumi.
  - **Penjaga gerbang:** Penjaga Rolan.
  - **Di dalam rumah:** Petualang Lelah dan Garo (Penginapan), Lio (murid penyihir), Tika (murid pandai besi), serta Ruko, Lin, dan Bram (Balai Petualang).
  - Sebagian warga berjalan-jalan (`wander`). Setiap kali diajak bicara, warga mengucapkan baris berikutnya dari daftarnya.
- **Penjaga gerbang (Rolan):**
  - satu tombol **"Keluar ke dunia"**, ditambah daftar wilayah sebagai panduan level;
  - info ekspedisi aktif;
  - peringatan "HP-mu masih rendah" bila HP < 50% (`ui/npc.js`).
- **Regen kota:** 1% HP maks per detik (`data/dungeon.js` `TOWN_REGEN`).
- **Peta Kota (§30):** peta mini di kanan atas (disembunyikan di dalam rumah) dan peta penuh (tombol **M**).
  - Peta penuh menampilkan toko berikon, tanda `!`/`?` di atas rumah dan orang, pedagang malam (hanya saat malam), serta posisi pemain ("Kamu (di dalam)").
  - Daftar di bawah peta: "Quest di kota ini" dan "Toko & layanan". Ketuk satu baris untuk melingkari tempatnya.
  - File: `town/townmap.js`, `data/townmap.js`, `render/townmap.js`, `ui/townmap.js`.
- **Prototipe (tidak masuk game, belum di-commit):** `app/rumah.html` + `app/rumah/` berisi "Contoh Rumahmu" (Tata Rumah: seret perabot, Tas Perabot). Ada juga `app/kota3d.html`.

---

### 2. Kota Besar (4)

**File:** `data/towns.js` (`LAYOUTS`, `bigTown`, `NEW_ROOMS`), `data/world.js` `TOWNS`.

| Id | Kota | Tingkat barang | Ukuran | Bentuk | Ujung lengan |
|---|---|---|---|---|---|
| `rimba` | **Rimbawana** | 1 | 1900 × 1500 | Desa cincin pondok kayu di sekitar pohon lentera raksasa, pagar kayu runcing | Hutan Kelam (barat) |
| `beku` | **Bekubara** | 2 | 1400 × 1700 | Benteng tinggi: dua kolom balai batu, kolam beku, patung, 4 menara sudut, citadel | Padang Es (utara) |
| `pasir` | **Pasirluas** | 3 | 2400 × 1150 | Kota bazar lebar: rumah atap datar, oasis, 4 lapak pasar (kain, buah, guci, rempah) | Gurun Merah (timur) |
| `bara` | **Baraapi** | 4 | 1900 × 1500 | Kota tempa terbelah kanal lava dengan 3 jembatan batu, monumen landasan, api unggun | Gunung Api (selatan) |

- **Isi tiap kota besar:**
  - 9 bangunan: Penginapan, Toko Ramuan, Pandai Besi (+ penjual permata), Balai Petualang (Pelatih + Kapten), **Pandai Senjata**, **Penjahit Zirah**, **Toko Perhiasan**, **Gudang**, **Pedagang Bahan**;
  - rumah warga, Tukang Cukur, Batu Teleport, **Garo pedagang malam** (18:00–05:00), dan 5 warga.
  - Kota besar **tidak punya Kandang**; Kandang hanya ada di Kota Awal.
- **Penjaga tiap kota:**
  - **Rimbawana:** Penjaga Dirga, Mak Sumi (cukur), Pak Rimbun, Nenek Akar, Pandai Toro/Wulan, Guru Banyan, Kapten Selasih, Pandai Kayan, Ibu Lumut, Nona Embun, Pak Lumbung, Saga. Warga: Raka, Melati, Tole, Prajurit Bayu, Dewi.
  - **Bekubara:** Penjaga Haldor, Bu Salju, Bu Hangat, Tabib Kristal, Pandai Bjorn/Freya, Guru Ulfa, Kapten Ingrid, Pandai Gunnar, Ibu Bulu, Nona Aurora, Pak Beku, Sigrun. Warga: Arne, Liv, Kai, Prajurit Eskil, Astrid.
  - **Pasirluas:** Penjaga Farid, Bang Zaki, Bu Kurma, Tabib Gurun, Pandai Hamid/Laila, Guru Sahar, Kapten Nadira, Pandai Rasyid, Ibu Sutra, Nona Mirage, Pak Unta, Yusuf. Warga: Omar, Zahra, Ali, Prajurit Tariq, Samira.
  - **Baraapi:** Penjaga Vulkan, Bang Arang, Bu Bara, Tabib Abu, Pandai Magma/Rubi, Guru Obsidian, Kapten Pijar, Pandai Gora, Ibu Sisik, Nona Lahar, Pak Tungku, Sela Api. Warga: Ignis, Seruni, Puntung, Prajurit Karang, Vesta.
- **Tema per kota** (`theme`): warna tanah dan tembok, atap, pohon, kabut malam, partikel melayang (daun, salju, pasir, bara).
- **Batu Teleport:** ada di setiap kota, termasuk Kota Awal.
  - Hanya ke kota yang sudah pernah dikunjungi.
  - Biaya `15 + 25 × tingkat` kota tujuan (`data/world.js` `TELEPORT`, `meta/world.js` `teleport`).
- **Gudang:** satu per karakter, bisa dibuka di kota besar mana pun, maks 120 barang (`meta/stash.js`).

---

### 3. Pedagang & Pasar

**File:** `data/market.js`, `meta/market.js`, `ui/market.js`, `ui/shopui.js`.

- **Hari pasar** berganti pukul 05:00 jam game. Stok dibuat dari `world.seed` + kota + toko + hari, jadi tidak disimpan. Yang disimpan hanya barang yang sudah dibeli (`shops["kota:toko"]`).
- **Etalase gear** (Pandai Senjata = senjata kelasmu; Penjahit Zirah = helm, armor, sepatu; Toko Perhiasan = kalung, cincin):

  | Tingkat | Jumlah barang (senjata / zirah / perhiasan) | Bobot rarity (Biasa…Mitos) | LV barang | Harga |
  |---|---|---|---|---|
  | 1 Rimbawana | 4 / 6 / 4 | 0·30·45·20·5·0 | 3–18 | harga jual × 5 |
  | 2 Bekubara | 5 / 7 / 5 | 0·10·45·35·9·1 | 10–28 | × 5,5 |
  | 3 Pasirluas | 5 / 8 / 5 | 0·0·35·45·17·3 | 20–38 | × 6 |
  | 4 Baraapi | 6 / 9 / 6 | 0·0·20·45·28·7 | 30–50 | × 6,5 |

  LV barang = level pemain (dibatasi rentang kota) + 0–2.
- **Pedagang malam Garo** (18:00–05:00 di alun-alun kota besar):
  - 3–4 gear Langka ke atas dari slot apa pun, harga × 8–9;
  - 2–3 permata tingkat 1–4.
- **Pedagang Bahan:**
  - harga per buah: Debu 4, Kristal 45, Inti 260;
  - stok harian per tingkat: debu 150–300, kristal 10–30, inti 1–4;
  - permata tingkat 1–3, harga 120 / 420 / 1400 / 4500;
  - harga +10% per tingkat kota di atas 1.
- **Toko Lencana** (Kapten Vera): lihat §11.
- **Toko baru gaya potret (§45.5):** baru dipakai untuk **Pandai Brom** (tab Peti & Jual).
  - Kisi barang berbingkai rarity, kartu detail dengan ▲/▼ dibanding gear terpakai.
  - Efek setelah beli: koin terbang, stempel DIBELI, catatan "Masuk tas".
  - Tempa dan Urai tetap memakai panel lama. Toko lain menyusul.
  - Aktif bila `LOOK.dialog === 'vn'` (`data/look.js`).

---

### 4. Dunia Terbuka Tersambung (§40)

**File:** `data/worldmap.js` (semua angka bentuk dunia), `run/worldmap.js` (kerangka + isi per petak, murni & deterministik), `data/world.js` (`REGIONS` = zona, `FIELD`, `TREASURE`), `run/field.js`, `render3d/field.js`, `render/regionmap.js`.

- **Ukuran dunia:** 70000 × 76000. Pusatnya (35000, 35000) adalah **gerbang Kota Awal** di tengah **Padang Kota Awal**.
  - Padang Kota Awal adalah dataran netral berjari-jari 3000, tanpa pembatas dan tanpa kelompok musuh.
- **Kota Awal di dunia:** kota bundar bertembok (jari-jari 430, tembok 390) dengan **4 gerbang**, satu di tiap sisi. Masuk dengan berjalan ke gerbang (radius 130).
- **4 lengan biome:**

  | Zona | Nama | Arah | Kota di ujung | Jarak dari pusat | Level musuh |
  |---|---|---|---|---|---|
  | `forest` | Hutan Kelam | barat | Rimbawana | 32000 | 1–15 |
  | `ice` | Padang Es | utara | Bekubara | 32000 | 10–25 |
  | `desert` | Gurun Merah | timur | Pasirluas | 32000 | 20–35 |
  | `volcano` | Gunung Api | selatan | Baraapi | 28000 | 30–50 |
  | `eclipse` | Tanah Gerhana | kantong selatan di balik Baraapi (x 30500–39500, y 69000–76000) | — (buntu) | — | 45–50 |

- **Pembatas antar lengan** (`BORDERS`, berkelok ±900):

  | Antara | Pembatas | Cara menyeberang |
  |---|---|---|
  | Hutan ↔ Es (barat laut) | pegunungan | celah gunung (`pass`) |
  | Es ↔ Gurun (timur laut) | sungai besar | jembatan batu |
  | Gurun ↔ Gunung Api (tenggara) | ngarai | jembatan gantung (`rope`) |
  | Gunung Api ↔ Hutan (barat daya) | sungai lava + tebing | tidak bisa (harus memutar) |
  | Gunung Api → Tanah Gerhana | tebing hitam | 1 celah, tertutup sampai 5 Pecahan Segel |

- **Jalan:**
  - jalan utama berkelok (belok setiap 1100);
  - cabang per lengan: Hutan 7, Es 6, Gurun 6, Gunung Api 6;
  - jalan lingkar antar kota besar lewat titik penyeberangan.
- **Air:**
  - Hutan: 3 sungai, 14 danau;
  - Es: 3 sungai, 16 danau;
  - Gurun: 2 sungai, 8 danau;
  - Gunung Api: 2 sungai, 16 kolam lava;
  - Gerhana: 3 danau.

  Di setiap persilangan sungai dengan jalan ada jembatan.
- **Isi per petak:** petak 4000 × 4000, dibuat saat didekati (3 × 3 di sekitar pemain, cache 30 petak). Isinya pohon, batu, dan reruntuhan (rata-rata 0,6 per petak), selalu sama untuk seed yang sama (4242).
- **Peralihan biome:** tanah dua zona dibaurkan ±400 di titik penyeberangan. Dalam radius 600 dari penyeberangan, kelompok musuh berisi campuran dua zona.
- **Musuh di dunia** (`FIELD`):
  - muncul berkelompok 5–10 ekor, maks 40 sekaligus;
  - kelompok baru setiap 3 detik (malam: 2 detik);
  - 65% kelompok dijauhkan dari jalan;
  - peluang elite 5%;
  - level musuh naik dari dataran ke kota (`levelAt`).
- **Kabut perang:** satu untuk seluruh dunia, sel 250. Tombol **M** membuka peta penuh; peta mini juga tersedia. Peta menampilkan warna biome, pembatas, jalan, kota, dan gerbang yang sudah ditemukan.
- **Simpan otomatis:** tiap 60 detik, saat masuk kota/dungeon, saat tumbang, dan saat berpindah zona.
- **Tumbang di dunia:** bangun di kota terakhir, kehilangan 10% koin (`FIELD.deathGoldLoss`).
- **Nama tempat di HUD:** "Padang Kota Awal" atau "‹Zona› · LV n" (`fieldHere`).
- **Penghuni & tempat lama dipetakan ulang:** gerbang dungeon, harta, rumah tersembunyi, dan tempat quest tetap memakai koordinat pecahan lama, diubah lewat `zoneToWorld`, lalu digeser ke titik bebas terdekat.

#### Musuh per zona (`data/world.js` `REGIONS[].enemies`)

- **Hutan Kelam:** Lendir, Kelelawar, Katak Ludah, Serigala Bayang, Katak Rawa, Semak Penyergap, Jamur Bom, Babi Batu, Peri Lumut, Kura Baja, Dukun Tengkorak, Golem.
- **Padang Es:** Roh Es, Katak Salju, Lendir Beku, Roh Embun, Penjaga Cermin, Yeti, Golem Es, Kura Baja, Kelelawar, Dukun Tengkorak, Peri Lumut.
- **Gurun Merah:** Kalajengking, Lendir Pasir, Burung Nasar, Hyena Pasir, Kumbang Pembelah, Cacing Pasir, Katak Ludah, Jamur Bom, Babi Batu, Dukun Tengkorak, Peri Lumut.
- **Gunung Api:** Imp Api, Salamander, Lendir Magma, Jamur Bara, Meriam Magma, Totem Bara, Babi Batu, Golem, Kura Baja, Dukun Tengkorak, Peri Lumut.
- **Tanah Gerhana:** Lendir Hampa, Katak Hampa, Hantu Gerhana, Kembar Hampa, Obelisk Hampa, Kelelawar Gerhana, Golem Gerhana, Kura Baja, Dukun Tengkorak, Peri Lumut.

---

### 4b. Lingkaran Batu (rencana `docs/superpowers/plans/2026-11-13-eksplorasi.md`)

- Sekitar 1 dari 6 reruntuhan lingkaran batu di dunia (dipilih dari letaknya, sama untuk semua karakter) **terjaga di malam hari**. Siang hari semuanya hanya hiasan.
- Tanda: partikel biru naik dari batu, genangan cahaya dan rune di lantai, tulisan "Batu-batu itu bercahaya…" dan denting saat terlihat (900). Tidak ada penanda peta.
- Berdiri di tengah lingkaran 3 detik (cincin di lantai terisi) → Debu Rune 3–6, Kristal Arkana 1–2, 25% permata. Sekali per malam per lingkaran (diingat selama perjalanan, tidak disimpan). Hadiah langsung tersimpan.
- `data/world.js` `STONES`, `run/stones.js`, `render3d/field.js`.

### 4c. Peta Usang (rencana `docs/superpowers/plans/2026-11-13-eksplorasi.md`)

- Elite yang tumbang di dunia terbuka berpeluang 12% menjatuhkan **Peta Usang** (paling banyak satu sekaligus; spanduk "Peta Usang! Ada lingkaran di petamu (M).").
- Peta menandai **lingkaran cokelat** lebar 450 di peta penuh dan peta mini (panah di tepi bila di luar), 1400–2600 dari tempat peta jatuh. Harta ada di dalam lingkaran, tidak di tengahnya.
- Di tanah: gundukan bertanda silang yang berkilau saat dekat; tulisan "Tanah di sini pernah digali…" dalam 260.
- Berdiri di atasnya 2 detik (cincin terisi) → isi peti harta biasa (koin, bahan, permata, gear). 25% jebakan: 5 musuh zona (satu elite) keluar dulu, hartanya tetap.
- Hanya untuk perjalanan itu (tidak disimpan); hasil galian langsung tersimpan. `OLD_MAP` (`data/world.js`), `run/oldmap.js`.

### 5. Harta Karun & Mini Bos

**File:** `data/world.js` `TREASURE`, `run/field.js` (`spawnGuardian`, `openTreasure`, `stepTreasure`), `run/minimove.js`, `data/enemies.js` `MINI_MOVES`.

- **Letak:** 4 peti per zona di tempat tetap (sama untuk semua karakter), tersebar dari pita 12% sampai 95% panjang lengan, 420–900 dari jalan. Peti ke-4 milik **Penguasa** zona.
- **Penjaga:** muncul saat pemain dalam radius 520 dari peti. Penjaga adalah musuh khas zona berukuran besar dan bermahkota.

  | Penjaga | HP | Damage | Ukuran | Pengawal |
  |---|---|---|---|---|
  | Penjaga biasa | ×14 | ×1,5 | ×1,8 | 3 |
  | Penguasa | ×26 | ×1,7 | ×2,1 | 5 |

- **Jurus khas pinjaman (§41.2):** penjaga memakai satu jurus bos dungeon zonanya setiap 5–7 detik (Penguasa lebih sering, × 0,6 jeda), damage × 0,8. Nama bos pemilik jurus muncul di atas kepalanya.
  - Hutan → Ratu Spora
  - Es → Golem Kristal
  - Gurun → Raja Mumi
  - Gunung Api → Raja Lava
  - Gerhana → Raja Maw
- **Isi peti:**
  - koin `60 + 14 × level` (Penguasa × 2,5);
  - bahan: debu 6–14 dan kristal 1–3; Penguasa: kristal 3–6 dan inti 1–2;
  - permata;
  - gear berbobot Peti Agung: 1 buah (Penguasa 2).
- Peti yang sudah dibuka dicatat per karakter dan tidak muncul lagi.
- Mini bos juga bisa menjatuhkan mount (lihat §15).

---

### 6. Dungeon (6 bertema + Ujian + Celah)

**File:** `data/dungeons.js` (`DUNGEONS`, `TRIAL_DUNGEON`, `BOSS_TYPES`), `data/dungeon.js` (ruangan, gelombang, koin, portal, kematian), `run/dungeon.js`, `run/room.js`, `meta/world.js` (gerbang per karakter, ekspedisi).

| Id | Nama | Zona gerbang (pita panjang lengan) | HP × | Dmg × | Hadiah × | +LV item | Bos lantai 5 |
|---|---|---|---|---|---|---|---|
| `shadow` | Ruang Bawah Tanah Bayangan | Hutan Kelam (5–18%) | 1 | 1 | 1 | +0 | Raja Maw |
| `crystal` | Gua Kristal | Padang Es (8–40%) | 2,2 | 1,5 | 2 | +8 | Golem Kristal |
| `fungus` | Hutan Jamur Busuk | Hutan Kelam (72–92%) | 4 | 2,1 | 3,5 | +16 | Ratu Spora |
| `tomb` | Makam Pasir | Gurun Merah (25–70%) | 5,5 | 2,5 | 4,2 | +21 | Raja Mumi |
| `lava` | Benteng Lava | Gunung Api (5–35%) | 7 | 2,9 | 5 | +26 | Raja Lava |
| `spire` | Menara Gerhana | Tanah Gerhana (84–94%) | 8,5 | 3,4 | 6 | +32 | Sang Gerhana |

- **5 lantai per dungeon.**
  - Lantai 1–4 berisi 3–4 gelombang campuran musuh tema. Lantai 5 berisi 1 gelombang, lalu bos dengan pengawal.
  - HP musuh × (1 + 0,25 × (lantai − 1)).
- **Bentuk ruangan diacak** per lantai (`run/room.js`): bundar, aula berpilar, salib, dua ruang bersambung, gua. Ruangan berjari-jari 560, musuh masuk dari lorong (panjang 140). Lantai 1 dungeon pertama selalu bundar.
- **Gelombang:** gelombang berikutnya mulai setelah semua musuh gelombang ini muncul dan sisa musuh sedikit, dengan jeda 0,6 detik.
- **Portal:** saat lantai bersih, dua portal muncul di tengah: **biru = turun**, **emas = pulang**. Portal aktif setelah 0,4 detik.
- **Koin:** 30% musuh menjatuhkan 1–3 koin; bos 100; bonus `10 × lantai` tiap lantai selesai.
- **Tumbang di dungeon:** koin tersisa 50%, tiap gear perjalanan 50% hilang, bangun di kota dengan HP 10% (`DEATH`).
- **Gerbang dungeon ada di dunia**, letaknya diacak **per karakter** (`world.seed`). Gerbang tercatat begitu terlihat (`found`).
  - Di gerbang (tekan E): kartu dungeon dengan rekor "Lantai n/5 · tamat n×".
  - Tombol **"Lanjut ke Lantai X"** (X = lantai terdalam) atau "Masuk Dungeon", plus tombol tiap lantai di atasnya (`ui/npc.js` sekitar baris 617).
- **Pulang lewat portal emas:** kembali ke dunia di depan gerbang.
- **Ekspedisi** (tab di Papan Tugas): bersihkan 3 lantai dungeon pilihan. Satu ekspedisi aktif sekaligus; gerbangnya ditandai di peta dengan panah emas.
  - Rentang level disarankan: Bayangan 1–8, Kristal 8–18, Jamur 14–26, Makam 20–32, Lava 24–45, Menara 45–50.
  - Hadiah: koin `80 + 25 × level`, EXP `60 + 20 × level`, 4 Lencana (`EXPEDITIONS`, `EXPEDITION_REWARD`).
- **Ujian Cabang (Job Lanjutan §43.10):** arena `trial`. Hanya lantai 5, satu bos **Bayangan Diri** (HP 1300).
  - Syarat: level 30, didaftarkan di Pelatih.
  - HP × 4,5 dan damage × 3,2, naik 4% per level di atas 30 (`data/branches.js` `BRANCH.trial`).
  - Tidak tercatat di rekor.
- **Kuat-lemah musuh mengikuti Power (§47):** level musuh dungeon = `DUNGEON_LEVEL` + 1 per lantai. Selisih Power karakter terhadap Power disarankan mengubah pukulan musuh dan seranganmu (`run/foelevel.js`).

---

### 7. Celah Tanpa Batas (Rift)

**File:** `data/rift.js` (`RIFT`, `RIFT_POOL`, `BLESSINGS`, `RIFT_DUNGEON`, `RUN_MODS`), `run/rift.js`, `ui/challenge.js`.

- **Terbuka** setelah Sang Gerhana tumbang (`char.unlocked.rift`).
- **Masuk lewat Gerbang Celah fisik** di alun-alun Kota Awal (NPC `rift`, 780, 760, berupa lengkungan robek).
  - Tombol: "Masuk Celah (lantai 1)" dan "Mulai dari lantai n" (dari titik simpan terdalam).
  - Tab **Tantangan** di Balai Petualang hanya menampilkan rekor.
- **Kekuatan:** lantai 1 sekuat Menara Gerhana (HP × 8,5, dmg × 3,4, hadiah × 6, +LV item 32), lalu naik **+8% HP & damage per lantai** (linear). LV item +0,5 per lantai.
- **Lantai biasa:** 3 gelombang (14 / 18 / 22 musuh, +6% per lantai), 4 jenis musuh acak dari `RIFT_POOL` (semua musuh non-bos dari keenam dungeon).
- **Tiap 5 lantai:** satu bos acak sendirian (Raja Maw, Golem Kristal, Ratu Spora, Raja Mumi, Raja Lava; **Sang Gerhana ikut mulai lantai 20**), lalu **titik simpan**.
  - Hadiah sampai titik simpan aman.
  - Tumbang hanya memotong koin, gear, bahan, dan permata yang didapat sesudah titik simpan. EXP selalu tetap (`riftHaul`).
- **Berkah:** setiap selesai lantai biasa, pilih 1 dari 3 berkah. Berkah berlaku sampai keluar.

  | Berkah | Efek |
  |---|---|
  | Amarah | ATK +30%, HP maks −20% |
  | Keserakahan | Koin & EXP ×2, musuh +40% |
  | Angin | Gerak +20%, jeda menghindar −30% |
  | Darah | Hisap 3% damage |
  | Ketajaman | Kritis +15, damage kritis +30% |
  | Arus | Jeda skill −20%, energi dari serangan +50% |
  | Besi | Damage diterima −25%, gerak −10% |
  | Kaca | Damage +50%, damage diterima +40% |
  | Pemulihan | HP penuh, pulih 0,5% HP/detik |
  | Untung | Gear 20% lebih sering naik satu rarity |
  | Perburuan | Elite ×2, koin & EXP ×1,5 |
  | Terburu | Kecepatan serang +25%, HP maks −10% |

- **Rekor:** `char.rift { best, checkpoint }`. Titik simpan selalu kelipatan 5.
- **Hadiah tonggak** (`RIFT_MILESTONE`, `meta/character.js` `applyTrip`): saat rekor (lantai yang diselesaikan) melewati lantai 10, 20, 30, … **untuk pertama kali**: Lencana `5 + 3 × (tonggak ke-n − 1)` (10 → 5, 20 → 8, 30 → 11, …) dan 1 gear Epik ke atas (`DROP_WEIGHTS.rift`: Epik 62 / Legendaris 30 / Mitos 8). Tiap 30 lantai satu gear lagi, Legendaris ke atas (`riftGreat`: 75 / 25 Mitos). Level gear = level karakter + 2 (maks 50). Toast "Tonggak Celah lantai …!".

---

### 8. Musuh

**File:** `data/enemies.js` (angka), `run/enemies.js` (perilaku lama + pola bos), `run/foes.js` (10 perilaku baru §41.1), `run/affix.js` (sifat elite), gambar `art/foes.js`, `art/monsters.js`, `render/foes.js` (tanda di tanah). Galeri: `app/musuh.html`.

#### 8.1 Musuh dasar (lama)

| Id | Nama | Perilaku |
|---|---|---|
| `slink` | Lendir | mengejar |
| `mini` | Lendir Kecil | anak buah panggilan |
| `dart` | Kelelawar | cepat |
| `tank` | Golem | lambat, tebal |
| `spitter` | Katak Ludah | menjaga jarak, meludahkan proyektil |
| `charger` | Babi Batu | garis peringatan lalu seruduk |
| `summoner` | Dukun Tengkorak | memanggil 3 anak buah (maks 6) |
| `healer` | Peri Lumut | menyembuhkan musuh sekitar |
| `bomber` | Jamur Bom | lari lalu meledak (juga saat mati) |
| `shielder` | Kura Baja | perisai depan: serangan dasar −85%, skill menembus |

#### 8.2 Musuh khas & varian biome (§25.4, §26.7)

- **Khas:**
  - Serigala Bayang: terjangan sering.
  - Yeti: terjangan berat, memperlambat.
  - Roh Es: 3 tembakan menyebar, memperlambat.
  - Kalajengking: meracuni.
  - Cacing Pasir: menyelam lalu menyembur keluar.
  - Imp Api: bola api, membakar.
  - Salamander: terjangan berjejak api.
  - Hantu Gerhana: menghilang, muncul di samping pemain, lalu menembak cincin 10 peluru.
- **Varian** (`kin` = musuh asal; bestiari menghitung ke musuh asal):
  - Lendir Beku, Katak Salju, Golem Es (memperlambat);
  - Lendir Pasir, Burung Nasar;
  - Lendir Magma, Jamur Bara (membakar);
  - Lendir Hampa, Kelelawar Gerhana, Katak Hampa, Golem Gerhana.
- **Efek kena (`onHit`):** lambat, racun, atau bakar. Racun dan bakar tetap melukai walau pemain sedang kebal sesaat.

#### 8.3 Sepuluh musuh berperilaku baru (§41.1, `run/foes.js`)

| Biome | Musuh | AI | Inti |
|---|---|---|---|
| Hutan | Katak Rawa | `leap` | tandai lingkaran di posisi pemain, lalu mendarat di sana |
| Hutan | Semak Penyergap | `ambush` | menyamar jadi semak (tak bisa dibidik), menyergap saat pemain dekat |
| Es | Roh Embun | `trail` | meninggalkan genangan es yang memperlambat |
| Es | Penjaga Cermin | `mirror` | mengangkat cermin; proyektil dari depan dipantulkan balik |
| Gurun | Hyena Pasir | `pack` | 4–6 ekor mengepung, lalu menyerbu bersama setelah lolongan |
| Gurun | Kumbang Pembelah | `split` | mati → 2 Kumbang Kecil → masing-masing 2 Tungau |
| Gunung Api | Meriam Magma | `mortar` | berdiri jauh, tembakan lambung dengan lingkaran bahaya |
| Gunung Api | Totem Bara | `totem` | diam; musuh sekitar lebih cepat dan berperisai |
| Gerhana | Obelisk Hampa | `totem` + sinar | totem dengan sinar berputar |
| Gerhana | Kembar Hampa | `twin` | berpasangan, sinar penghubung melukai; bangkit lagi kecuali keduanya mati |

#### 8.4 Elite bersifat acak (`AFFIXES`, `run/affix.js`)

- **Jumlah sifat:** 1 sifat; 2 sifat mulai level dunia 25 atau lantai 4. Nama sifat tampil di atas kepala, mis. "Cepat · Berlapis".

| Sifat | Efek |
|---|---|
| Cepat | gerak ×1,5, aksi lebih sering |
| Berlapis | perisai 35% HP, pulih 25%/detik setelah 4 detik tidak diserang |
| Pemanggil | panggil 2 kroco tiap 6 detik (maks 4) |
| Berduri | 8 duri saat dipukul (jeda 1 detik) |
| Meledak | saat mati: lingkaran bahaya radius 110, damage ×2 |
| Beraura | letupan kecil tiap 1,6 detik membawa efek biome |
| Penjelajah | teleport ke dekat pemain tiap 5 detik |

#### 8.5 Bentuk peluru

`SHOT_LOOKS`: tiap bos dan penembak biome punya gambar peluru pixel sendiri (`art/pix/fx.js`). Spiral bos berwarna merah dan tidak bisa ditangkis (`UNPARRYABLE`).

---

### 9. Bos

**File:** `data/enemies.js` (pola, `signature`, `phases`), `run/enemies.js` `stepPattern`, gambar anime `art/bosses/` (`drawBoss`, `bossPortrait`, aura pixel), `render3d/actors.js` `drawAnimeBoss`. Galeri: `app/bosanime.html`, `app/bos.html`.

| Bos | Dungeon | HP | Pola fase 1 | Fase 2 (judul) |
|---|---|---|---|---|
| Raja Maw | Bayangan | 900 | Telan (`gulp`), Bayang Kembar (`clones`), cincin, seruduk | 50% "LAPAR!" + panggil |
| Golem Kristal | Kristal | 900 | Prisma, Hujan Serpih, cincin, hantam | 50% "RETAK!" + spiral |
| Ratu Spora | Jamur | 900 | Ladang Jamur (`shrooms`), Awan Racun, spiral, panggil | 50% "MEKAR!" + genangan racun (`pools`) |
| Raja Mumi | Makam | 900 | Kutukan, Badai Pasir, cincin, hantam | 50% "KUTUKAN FIRAUN!" + panggil |
| Raja Lava | Lava | 900 | Erupsi, Meteor, cincin, seruduk | 50% "LANTAI MENDIDIH!" + kolam lava menetap |
| Sang Gerhana | Menara | 1500 | "Matahari Hitam": cincin, spiral, sinar, seruduk | 66% "GERHANA!" (arena gelap, `echo` meniru jurus khas bos lain); 33% "KEHAMPAAN!" (lubang hitam, panggil) |
| Bayangan Diri | Ujian Cabang | 1300 | seruduk, cincin, clones, hantam | 50% "BAYANGAN MENGAMUK!" |

- **Pergantian fase:** jeda kebal, judul besar, guncangan besar, hit-stop 0,22 dtk, kilat ungu, dua cincin, percikan, dan raungan (Bagian C §6.8). Jenis bahaya baru: `zone` (genangan tetap), `push` (angin), `chase` (lingkaran mengikuti pemain).
- **Gambar anime:** tubuh monster dari sistem karakter anime, diperbesar ±2,3×, hanya tampak depan/kanan/kiri, dengan aura pixel yang menguat di fase 2. `?lama` / `?2d` memakai gambar lama.
- **Kemunculan bos memutar cutscene** (sekali per sesi per bos), lihat §14.
- **Bos yang berkesan** (rencana `docs/superpowers/plans/2026-11-13-bos-berkesan.md`; alat bersama dinyalakan per bos lewat data, semua 7 bos):
  - **Ancang-ancang** (`tell` di data bos): sebelum cincin (0,6 dtk), spiral (0,7) dan panggilan (0,6) bos berhenti dulu. Cincin: partikel berwarna jurus mengumpul ke tubuhnya + lingkaran menyusut + dengung naik. Spiral: partikel berputar searah putaran peluru + bunyi bergetar. Panggilan: asap gelap naik + seruan rendah. Angka partikel di `data/fx.js` `BOSS_TELL`.
  - **Tanpa ulang beruntun** (`noRepeat`): jurus yang sama tidak keluar dua kali berturut-turut.
  - **Lelah** (`run/enemies.js` `tire`): bos diam, tanpa damage sentuh, menerima damage lebih (tanda `vulnT/vulnK` yang sama dengan Kabut Racun), bintang berputar di atas kepala (`BOSS_TIRED`), tulisan kuning, cincin, hit-stop kecil, bunyi `choke`. Hilang saat ganti fase.
  - **Raja Maw — Telan:** kalau gigitan terakhir **meleset** (di luar jangkauan, dodge, atau ditangkis Tangkis Baja) Maw **TERSEDAK!**: lelah 2,2 dtk, damage diterima +30%. Fase 2 "LAPAR!": menggigit **dua kali** (gigitan kedua dibidik ulang, 1,2 dtk), tersedak hanya bila gigitan kedua meleset.
  - **Raja Maw — Bayang Kembar:** bayangan kini **Bayang Maw** (`mawshade`, gambar hantu berwarna Maw) yang bisa dipukul, HP 1% HP maks Maw, 2,2 dtk sebelum menembak. Yang hancur tidak menembak (pecah dengan bunyi `shadeBreak`); yang sempat menembak memudar. Tanpa hadiah, tidak dihitung kill/buku monster, hilang bersama Maw. Fase 2: 3 bayangan.
  - **Raja Mumi — Kutukan berbalik:** kalau tanda Kutukan meledak di tubuh Mumi (pancing tandanya ke dekat Mumi, lalu keluar sebelum meledak) Mumi **KUTUKAN BERBALIK!**: kehilangan 3% HP maks, lelah 2,2 dtk, damage diterima +30%.
  - **Raja Mumi — fase 2 "KUTUKAN FIRAUN!":** muncul 2 **Penjaga Sarkofagus** (`tombguard`, 240 dari Mumi, HP 3% HP maks Mumi masing-masing, diam, tanpa damage) dengan tali cahaya emas ke Mumi dan cincin perisai di kakinya. Selama satu masih berdiri Mumi menerima **50% damage**. Yang terakhir hancur → **PERISAI RUNTUH!**: lelah 2,5 dtk, damage +30%, guncangan. Bidik otomatis menganggap Mumi yang terlindung dua kali lebih jauh, jadi sarkofagus dalam jangkauan dibidik dulu (penting di HP). Sarkofagus tanpa hadiah, tidak dihitung kill, hilang bersama Mumi.
  - Ancang-ancang & tanpa ulang beruntun juga untuk Raja Mumi.
  - **Golem Kristal — Kulit Kristal:** lapisan kristal (6% HP maks) menyerap semua pukulan, digambar sebagai keping kristal berputar di sekitarnya (makin sedikit saat menipis) + busur di kakinya. Pukulan berat (kritikal, skill, ultimate) mengikisnya ×2,5; Tebasan Raksasa penuh memecahkannya seketika. Pecah → **KULIT KRISTAL PECAH!**: lelah 2,4 dtk, damage +30%; tumbuh lagi 9 dtk kemudian. Fase 2 "RETAK!": kulitnya hancur untuk selamanya (Golem lebih cepat seperti dulu). Ancang-ancang & tanpa ulang beruntun.
  - **Ratu Spora — Jamur Spora:** tiap jamur Ladang Jamur kini makhluk kecil (`sporepod`, HP 0,6% HP maks Ratu) di atas lingkaran merahnya. Dipukul pecah sebelum meledak → **tidak meledak** (kepul hijau); jamur yang dibiarkan meledak seperti dulu. Pecah dalam jarak 160 dari Ratu → **SPORA BERBALIK!**: Ratu kehilangan 2,5% HP maks dan lelah 1,4 dtk (sekali per kesempatan, bukan per jamur). Fase 2 "MEKAR!": jamur yang pecah **menyerap kolam racun** di dekatnya. Bidik otomatis membidik jamur terdekat dengan sendirinya. Tanpa hadiah, tidak dihitung kill. Ancang-ancang & tanpa ulang beruntun.
  - **Sang Gerhana:** gema "GERHANA!" kini **berurutan** (Raja Maw → Golem Kristal → Ratu Spora → Raja Mumi → Raja Lava, lalu ulang), jadi bisa dipelajari; jurus khas baru bos lain (tersedak, kulit, jamur, kutukan berbalik, kepanasan) tidak ikut tergema. Lubang hitam "KEHAMPAAN!" juga **menyeret anak buahnya** (dan Sang Gerhana sendiri 35%); saat runtuh mencabik anak buah di dalamnya (60% HP maks mereka) dan bila Sang Gerhana tertangkap → **TERTELAN KEHAMPAAN!** (3% HP maks, lelah 2,2 dtk). Ancang-ancang 0,55–0,65 dtk (tanpa larangan ulang: gema memang boleh beruntun).
  - **Bayangan Diri:** hanya ancang-ancang singkat (cincin 0,45, spiral 0,5 dtk); tetap tanpa ampun. Meniru job pemain belum dikerjakan (P3).
  - **Raja Lava — Kepanasan:** setelah hujan Meteor ia **mendinginkan diri** 2,6 dtk: diam, tanpa damage sentuh, uap & bara dari punggungnya, dan **irisan cahaya oranye di tanah di belakangnya** (sisi yang jauh dari tempat pemain berdiri). Pukulan dari dalam irisan itu (140°) ×1,6, dari depan biasa ("KEPANASAN! Serang punggungnya!"). Fase 2 "LANTAI MENDIDIH!": saat mendinginkan diri, kolam lava dalam jarak 280 darinya **membatu** (hilang). Ancang-ancang & tanpa ulang beruntun.
  - Hanya jurus bos sendiri: gema Sang Gerhana dan penjaga harta tetap seperti dulu.
  - Tes bench: bot kini menghancurkan perisai bos lebih dulu (`run/benchkit.js`); rata-rata bos 81,9 dtk setelah Raja Lava & Ratu Spora (Maw 68, Spora 101 — sebelumnya 110, Mumi 84, Lava 74).

---

### 10. Siang–Malam

**File:** `data/time.js` (`PHASES`, `SKY`), `meta/clock.js` (`phaseOf`, `clockText`, `skyAt`, `nextMorning`).

- **Kecepatan jam:** 1 hari = 8 menit nyata. Jam berjalan di kota, dunia, dan dungeon; berhenti di menu, dialog, dan jeda.
- **Bagian hari:** Pagi 05:00, Siang 10:00, Sore 15:00, Malam 18:00. HUD menampilkan "Hari n · jam · bagian".
- **Karakter baru** mulai pukul 07:00.
- **Tidur** di Penginapan atau Rumahmu memajukan jam ke 07:00 berikutnya.
- **Langit kota:** gelap dan warnanya mengikuti tabel `SKY`; ada cahaya fajar/senja; lentera dan jendela menyala saat gelap.
- **Dampak malam:**
  - di dunia, kelompok musuh lebih sering (2 detik, bukan 3);
  - pedagang malam Garo muncul (18:00–05:00);
  - Bunga Kunang hanya jatuh saat malam;
  - stok pasar berganti pukul 05:00.

---

### 11. Papan Tugas, Lencana, Ekspedisi (Balai Petualang)

**File:** `data/bounties.js`, `meta/bounties.js`, `ui/board.js`. Kapten di Balai Petualang (Kapten Vera di Kota Awal; Selasih, Ingrid, Nadira, atau Pijar di kota besar).

- **4 tab:** **Tugas**, **Ekspedisi**, **Lencana**, **Tantangan** (rekor Celah).
- **Tugas:**
  - Selalu 3 tugas. Harus **Ambil** dulu (gratis); progres dihitung dari setiap perjalanan setelah diambil, termasuk yang berakhir mati.
  - Tugas yang sudah diambil bisa **Batal** (progres hilang). Tugas yang belum diambil bisa **Ganti** dengan biaya `15 × level`.
  - Jenis tugas: Buru (20–40 musuh; musuh besar dihitung lebih berat), Elite (3–8), Bos (1), Lantai (3–8), Koin (150–400).
  - Hadiah: koin `40 + 12 × lv`, EXP `30 + 10 × lv`, Debu Rune `3 + 0,2 × lv`, dan Lencana 1–3.
- **Toko Lencana (lencana = mata uang `marks`):**
  - Peti Lencana (1 gear Epik): 12
  - Kristal Arkana ×5: 4
  - Inti Kegelapan: 5
  - Permata acak: 6
  - Debu Rune ×20: 2
  - **Singa Kerajaan** (mount Epik): 60

---

### 12. Quest

**File:** `data/quests.js` (`MAIN`, `SIDE`, `HIDDEN`, `SPOTS`, `DROP_ITEMS`), `meta/quests.js`, `data/questev.js` + `run/questev.js` (bentuk lapangan & peristiwa dunia), `ui/journal.js`.

#### 12.1 Mesin & antarmuka

- **Jenis langkah:** `talk`, `town`, `gate`, `boss`, `kill`, `elite`, `guard`, `reach`, `give`, `drop`, `region`, `level`, `job`, `choice`, `event`.
- **Batas quest:** side quest aktif maks **6**; quest utama tidak dihitung.
- **Jurnal:** tab Quest di panel Karakter (tombol J), dengan tombol Lacak dan Batalkan (di kota). Tersedia juga panel **Kenangan** (§14).
- **Pelacak quest** di pojok kiri bawah HUD. Ketuk judulnya untuk mengecilkan.
- **Tanda di atas NPC & pintu:** `!` = quest bisa diambil, `?` = siap dilapor, `…` = sedang berjalan.
- **Penanda tujuan:** titik di peta, lingkaran petunjuk berjari-jari 1500 untuk gerbang yang belum ditemukan, panah di tepi layar.
- **Pengumuman** di layar, mis. "Pecahan Segel 2/5" dan "Quest baru: …".
- **Hadiah quest:** koin `40 + 12 × lv` × faktor, EXP, Lencana, bahan, permata, ramuan, gear, unik quest, mount.

#### 12.2 Quest utama (7 bab)

| Bab | Id | Judul | Ringkasan | Hadiah |
|---|---|---|---|---|
| Prolog | `ch0` | **Anak Kota Awal** | Kakek Odo → Dara → kalahkan 8 Lendir → Pak Darto → kalahkan 1 elite → capai level 5 → Guru Hadi → **pilih job** → Pandai Brom | koin, EXP, 3 Ramuan Merah |
| 1 | `ch1` | Bayangan di Bawah Tanah | Odo → gerbang Bayangan → Raja Maw → Odo | Pecahan 1, gear Langka, **Kuda Perang** |
| 2 | `ch2` | Kota di Akar Tua | Rimbawana → Kapten Selasih → Gua Kristal → bos → Bekubara → Kapten Ingrid | Pecahan 2, gear Epik |
| 3 | `ch3` | Busuk di Timur Hutan | Nenek Akar → Hutan Jamur → bos → Nenek Akar | Pecahan 3, Epik, permata tk 2 |
| 4 | `ch4` | Makam di Bawah Pasir | Pasirluas → Zahra → Makam Pasir → Raja Mumi → Zahra | Pecahan 4, Epik, permata tk 3 |
| 5 | `ch5` | Api yang Tak Padam | Baraapi → Ignis → Benteng Lava → bos → Ignis | Pecahan 5, gear Legendaris |
| 6 | `ch6` | Gerhana | Odo → masuki Tanah Gerhana → Menara Gerhana → Sang Gerhana → Odo | **Mahkota Fajar** (helm Mitos unik, +70% damage ke bos), 10 Lencana |

- Karakter lama (sebelum save v27) otomatis melewati Prolog.
- Pecahan Segel: 5, satu dari tiap bos dungeon bab 1–5.

#### 12.3 Rumah & orang tersembunyi (16, 4 per zona)

Letak tetap untuk semua karakter (`HIDDEN`). Pondok padat; musuh tidak muncul dalam radius 400 dari pondok.

- **Hutan Kelam:**
  - Pak Gaharu, "Taring Serigala": 30 Serigala Bayang.
  - Nenek Kunyit, "Jamur Bercahaya": kumpulkan dari Jamur Bom.
  - Resi Sunyi, "Bisikan Batu Tulis" (rantai): 3 batu tulis → Penguasa → serahkan barang → **Kalung Akar Tua**.
  - Lio, "Anak Tersesat": antar ke Melati.
- **Padang Es:**
  - Bjorn, "Pemburu Yeti".
  - Frida, "Tinta Es".
  - Nenek Salju, "Bintang Jatuh" (rantai) → **Cincin Bintang Beku** + mount **Griffin**.
  - Gustav, "Surat Beku".
- **Gurun Merah:**
  - Hasan, "Sengat".
  - Layla, "Sisik Cacing".
  - Amun, "Makam yang Terlupa" (rantai) → **Topeng Pasir Abadi**.
  - Zaid, "Kurir Kehausan".
- **Gunung Api:**
  - Grom, "Pandai Buangan".
  - Agni, "Api Suci".
  - Penjaga Kawah, "Api Abadi" (rantai) → **Zirah Sisik Kawah**.
  - Bara, "Penambang Terjebak".
- **Tempat "cari"** (`SPOTS`): batu tulis ×3, kerang, bintang jatuh ×3, tugu ×3, unta, api abadi ×3. Bercahaya selama langkahnya aktif; tercapai dalam radius 160.
- **Barang quest** (tidak masuk tas): Jamur Bercahaya, Sisik Cacing, Lendir Kental, Bunga Kunang (malam), Bara Abadi.

#### 12.4 Side quest kota (16)

- **Kota Awal:** Bu Marta "Sup untuk Nenek Kunyit", Nenek Mira "Lendir Kental", Pandai Brom "Bahan Tungku", Pip "Kerang Bercahaya".
- **Rimbawana:** Tole "Jamur Raksasa", Nenek Akar "Bunga Kunang", Pandai Kayan "Ujian Bilah".
- **Bekubara:** Arne "Katak di Danau", Bu Hangat "Sup untuk Bjorn", Ibu Bulu "Bulu untuk Musim Dingin".
- **Pasirluas:** Omar "Unta yang Hilang", Nona Mirage "Permata untuk Kalung", Yusuf "Cacing di Jalur Dagang".
- **Baraapi:** Puntung "Bara Abadi", Pandai Gora "Penguasa Gunung", Sela Api "Inti untuk Tungku".

#### 12.5 Quest Beragam (§42): 14 quest bentuk baru

| Bentuk | Quest (id, zona) | Inti |
|---|---|---|
| Kawal | Peziarah di Jalan Hutan (`e_peziarah`, Hutan); Patung Es untuk Bekubara (`e_patung`, Es) | NPC ber-HP berjalan di rute; berhenti menunggu bila pemain > 520; kelompok musuh mengincarnya tiap 5–8 detik; pulih pelan bila aman |
| Bertahan | Pos Jaga Hutan (`e_pos`); Altar Cahaya Utara (`e_altar`) | Altar ber-HP; 75 detik, 4 gelombang (4/6/8/10 musuh); gagal bila altar hancur atau pemain menjauh > 720 selama 4 detik |
| Buronan | Si Ekor Merah (Kalajengking, Gurun); Lidah Bara (Salamander, Gunung Api) | Elite bernama (HP ×9, dmg ×1,5) dalam lingkaran jejak radius 900; pada HP 50% kabur ke titik lain dan pulih 15% |
| Sarang | Sarang di Bukit Pasir (4 sarang); Sarang di Lubang Kawah (5) | Sarang (HP ×7) mengirim 2 musuh tiap 5–8 detik (maks 14) sampai dihancurkan |
| Penyelamatan | Ayah Kai (Es); Murid Seruni (Gunung Api) | Kamp: 6 penjaga (1 elite); buka kandang dengan E; tawanan lari pulang |
| Balapan | Jalur Pemburu (Hutan); Balapan Kafilah (Gurun) | Cincin cahaya tiap 900; medali Perunggu/Perak/Emas menurut kecepatan rata-rata (135/200/260); rekor waktu tercatat (`quests.races`) |
| Pilihan | Kantong yang Jatuh (Zahra); Telur di Lereng Api (Puntung) | Dua jawaban, hadiah berbeda (mis. kembalikan → Lencana; simpan → koin); tercatat (`quests.choices`) |

- **Aturan umum:** langkah `event` dimulai saat pemain dalam radius 200 dari titik mulai. Gagal tanpa hukuman; bisa dicoba lagi setelah 3 detik.
- **Peristiwa dunia** (bukan quest, `HAPPEN`): kejadian acak dekat pemain. Yang pertama setelah 150 detik, lalu tiap 300–480 detik. Muncul 900–1400 dari pemain dan hilang setelah 150 detik bila diabaikan. Tanda "!" di peta mini.
  - **Karavan:** kawal singkat 1800 unit, imbalan koin.
  - **Serbuan (raid):** bertahan 40 detik, 3 gelombang.
  - **Hujan meteor:** 22 detik; hindari ledakan (16% HP maks), pungut kristal untuk koin.
  - **Waktu & kelangkaan** (rencana `docs/superpowers/plans/2026-11-13-momen-acak.md`): tiap jenis punya bobot dan waktu munculnya sendiri (`HAPPEN.kinds`, waktu dari `game.phase` = pagi/siang/sore/malam). Karavan hanya pagi–siang; Serbuan dan Meteor kapan saja; Cahaya Aneh hanya sore–malam; Raksasa Pengembara kapan saja tapi 3× lebih sering di malam hari, dan setelah muncul tidak bisa muncul lagi selama 15 menit. Tetap hanya satu peristiwa dunia sekaligus.
  - **Peristiwa "diam":** tidak ada banner dan tidak muncul di peta sampai pemain melihatnya sendiri (dalam jarak 950). Saat terlihat, muncul tulisan kecil ("Cahaya apa itu…?" / "Sesuatu yang besar…") lalu tanda "!" muncul di peta. Peristiwa diam yang diabaikan hilang dengan tulisan kecil, juga tanpa banner.
  - **Cahaya Aneh** (sore–malam, bobot 1): bola cahaya pucat yang melayang (partikel + genangan cahaya di tanah, bunyi denting halus) muncul 700–1100 dari pemain. Hilang sendiri setelah 2 menit kalau diabaikan. Kalau didekati (320), ia kabur sambil meliuk dan menghindari air/tebing (140/dtk; pemain berjalan ±168). Kalau tertangkap dalam 20 detik: **70% hadiah** (koin 1,2 × hadiah quest, Debu Rune 4–9, Kristal 0–2, 35% permata) atau **30% jebakan** (kawanan 6 musuh zona, satu elite). Kalau tidak tertangkap: "Cahaya itu lenyap."
  - **Raksasa Pengembara** (bobot 0,25, malam ×3, jeda 15 menit): raksasa bermahkota dari musuh zona (HP ×30, damage ×1,7, ukuran ×2,3, satu jurus bos dungeon zona) yang **berjalan pelan sendiri** dari titik ke titik, 1400–1900 dari pemain. Selama pemain dalam jarak 2400, tanah bergetar setiap 5–8 detik dengan bunyi langkah berat dan debu. Ia menyerang bila didekati (480) atau dipukul; namanya "‹musuh› Pengembara" dan bar HP muncul. Kalah → **harta Penguasa** (koin ×2,5, kristal & inti, permata, 2 gear), tercatat di buku monster, dan dihitung sebagai mini bos untuk peluang mount. Diabaikan → pergi setelah 4 menit atau saat ditinggal jauh, tanpa musuh tertinggal.
  - **Pedagang Kelana** (hanya malam, bobot 0,6, jeda 10 menit): pedagang berjubah dengan lentera (percik api + genangan cahaya hangat di tanah) berdiri 800–1200 dari pemain. Saat terlihat: "Lentera di kejauhan…". Didekati (150), ia menawarkan **satu barang langka**: 60% permata (satu tingkat di atas permata Cahaya Aneh, paling tinggi 4) seharga 2,2 × hadiah quest, atau 40% Kristal 4–8 + Inti 0–1 seharga 1,6 × hadiah quest. **Berdiri di dekatnya 2,5 detik = membeli** (cincin emas di tanah terisi); pergi = menolak. Koin kurang → "Koinmu kurang, kawan." Hanya satu penjualan; setelah itu ia berkemas 6 detik kemudian. Diabaikan → pergi setelah 200 detik. Tanpa layar toko: koin dibayar lewat `run.spent` (dipotong dari save di `applyField`; tugas "kumpulkan koin" tetap menghitung yang didapat saja). Koin yang dimiliki dibaca dari `game.wallet` (diisi `main.js`).
  - **Kabut Sunyi** (pagi & sore, bobot 0,5): suasana saja, tanpa hadiah dan tanpa tanda di peta. "Kabut turun… sunyi sekali." Selama 75 detik kabut 3D menebal (lebih dekat & lebih pucat, `game.mist` 0..1 dibaca `render3d/field.js` `tint`) dan gumpalan kabut melayang di sekitar pemain, lalu menipis perlahan. Tidak ada di Tanah Gerhana. Tampilan lama (`?lama`) tidak menampilkan kabut maupun pedagang.
  - **Simpan:** peristiwa tidak disimpan. Memuat ulang = peristiwa hilang; hadiah atau barang yang sudah didapat langsung disimpan.
- **Total side quest di kode: 46** (16 tersembunyi + 16 kota + 14 bentuk baru) ditambah 7 bab utama.

#### 12.6 Tanah Gerhana & Menara Gerhana

- **Tanah Gerhana:** kantong di selatan Baraapi, LV 45–50. Celah tebingnya terbuka setelah 5 Pecahan Segel.
  - 4 peti harta, termasuk Penguasa.
  - Musuh: varian hampa, Hantu Gerhana, Obelisk Hampa, Kembar Hampa.
- **Menara Gerhana:** dungeon keenam (lihat §6), bos akhir **Sang Gerhana** dengan 3 fase.
- **Epilog:** cutscene "Fajar Kembali", lalu panel catatan akhir (`ui/ending.js`). Rekor `records.ending`. Game tetap berlanjut; Menara bisa diulang.
- **Setelah tamat terbuka:** Celah tanpa batas dan mount Naga.

---

### 13. Koleksi (Bestiari, Kodeks Unik, Mount) — "buku monster"

**File:** `data/collection.js`, `meta/collection.js`, `ui/collection.js` (tab Koleksi di panel Karakter).

- **Bestiari:**
  - Mencatat kill per jenis musuh. Varian dihitung ke musuh asalnya.
  - Tonggak 25 / 100 / 300 / 1000 kill (bos: 1 / 5 / 15 / 40). Tiap tonggak memberi bonus stat permanen khas jenis itu (`BESTIARY`), misalnya Lendir +6 HP maks, Kura Baja +1,5 DEF, Raja Maw +2 ATK, Sang Gerhana +3 ATK.
  - **34 entri**, termasuk 10 musuh baru §41.1 (save v24).
- **Kodeks Unik:** setiap item Legendaris/Mitos unik yang pernah ditemukan tercatat (a/b). Tiap item memberi Koin & EXP +1% di dungeon.
- **Mount n/9:** koleksi mount.

---

### 14. Cerita & Cutscene (§44)

**File:** naskah `data/scenes.js` (`SCENES`, `MEMORIES`, `momentScene`), pemutar murni `run/cutscene.js`, panggung pixel `render/cutscene.js`, lapisan DOM `ui/cutscene.js`. Teks EN di `i18n/en-story.js`.

- **Panggung:** pixel 480 × 270 yang diperbesar, pita sinematik atas-bawah, tombol **Lewati** (Esc). Ketuk/Spasi/Enter/E = lanjut.
- **Langkah naskah:** `bg`, `put`, `hide`, `cam`, `move`, `look`, `say`, `panel`, `title`, `fx`, `fade`, `wait`.
- **Adegan:**
  - **Pembuka "Gerhana yang Disegel"** (±2 menit, saat karakter baru dibuat):
    - 3 panel kilas balik ilustrasi: `past_eclipse`, `past_seal`, `past_village`;
    - Kota Awal pada pagi Festival Api Unggun bersama Pip, Bu Marta, dan Kakek Odo;
    - malam segel retak.
  - **Kemunculan 6 bos:** Raja Maw "Mulut Bayangan", Golem Kristal "Penjaga Gua Beku", Ratu Spora "Ibu Hutan Busuk", Raja Mumi "Penguasa Makam Pasir", Raja Lava "Api yang Tak Padam", Sang Gerhana.
  - **Pecahan Segel I–V:** penglihatan tempat berikutnya.
  - **"Celah Tanah Gerhana"**.
  - **Epilog "Fajar Kembali"**.
  - **Momen kecil** setelah Kawal/Penyelamatan berhasil.
- **Kenangan:** di Jurnal, memutar ulang adegan yang sudah dialami. Daftarnya diturunkan dari progres (`MEMORIES`), tanpa data save baru.
- **CHEAT → Cutscene:** semua adegan bisa diputar untuk uji.
- **Gambar latar ilustrasi:** `public/img/story_*.webp` bila ada; bila belum, digambar kode bergaya sepia.

---

### 15. Mount (§35)

**File:** `data/mounts.js`, `run/mount.js` (`none → summoning → riding`), `meta/stable.js`, gambar `art/mounts.js` (`MAJESTIC_MOUNTS`, `drawMajesticRidden`), `ui/stable.js`. Penjaga Kandang **Mbah Sarju** di Kota Awal.

| Mount | Rarity | Terbang | Sumber | Bonus |
|---|---|---|---|---|
| Kuda Perang (`horse`) | Biasa | – | Hadiah bab 1 | +5% emas |
| Serigala Raksasa (`snowwolf`) | Langka | – | Kandang, 1500 koin | +15% magnet |
| Rusa Cahaya (`stag`) | Langka | – | Kandang, 1500 koin | +10% pemulihan ramuan |
| Singa Kerajaan (`lion`) | Epik | – | Toko Lencana, 60 Lencana | +5% HP maks |
| Harimau Putih (`tiger`) | Epik | – | Jatuh dari bos & mini bos mana pun | +5% material |
| Pegasus Fajar (`pegasus`) | Legendaris | ya | Jatuh dari bos & mini bos Tanah Gerhana | +5% EXP |
| Griffin (`griffin`) | Legendaris | ya | Quest "Bintang Jatuh" (`s_salju`) | +5% peluang gear |
| Naga (`dragon`) | Mitos | ya | Mengalahkan Sang Gerhana | +5% EXP, +5% emas |
| Paus Langit (`skywhale`) | Mitos | ya | Semua side quest selesai | +10% magnet, +5% material |

- **Hanya di dunia terbuka.** Panggil dengan tombol **R** atau ikon kuda di HUD HP; waktu panggil 1 detik.
- **Kecepatan menunggang** per rarity: ×1,6 / 1,65 / 1,7 / 1,8 / 1,9 / 2,0.
- **Mount terbang** bisa menyeberang air dan danau.
- **Turun otomatis** saat menyerang, memakai skill, atau menghindar (aksinya tetap jalan). Kena pukul membuat jatuh dan mengunci R selama 3 detik. Ramuan bisa diminum tanpa turun.
- **Peluang jatuh:** 2% + 2% per bos tanpa hasil, dijamin pada bos ke-25. Hitungan terpisah per mount.
- **Warna:** 3–4 varian warna per mount, 400 koin per warna di Kandang.
- **Kandang:** tab **Beli** dan **Kandang** (pilih mount aktif & warna). Panel Karakter juga punya tab Mount.
- **Bonus** hanya dari mount aktif dan tidak pernah menambah damage.

---

### 16. Dialog NPC Potret Besar & Gelembung Warga (§45.2–45.5)

**File:** `ui/npc.js` (gaya `vn` bila `LOOK.dialog === 'vn'`), `ui/dialog.css`, `meta/mood.js`, `ui/bubbles.js`, potret anime `art/anime/npc.js`. Contoh: `app/dialog.html`. `?lama` = dialog lama.

- **Potret:** NPC setengah badan besar di belakang kotak teks, bernapas, dengan lingkar rune.
- **Kotak teks:** plakat nama emas + gelar, teks mengetik ±45 huruf/detik, ▼ berdenyut bila ada lanjutan.
- **Pilihan:** tombol bernomor 1–4 yang meluncur masuk setelah teks selesai.
- **Emosi** (`meta/mood.js`):
  - mood: `angry`, `ask`, `shock`, `worry`, `happy`, `think`;
  - mood ditebak dari isi baris bila tidak ditulis (`?`, `!`, `…`, "haha");
  - tiap mood punya gerak potret dan simbol ala anime (urat, ?, !, keringat, not musik, …).
- **Gelembung warga:** warga biasa bicara lewat gelembung di atas kepala tanpa menghentikan permainan; baris berganti tiap ±6 detik. NPC penting bertanda **!** dan menampilkan tombol "Bicara (E)".
- **Warga & NPC tersembunyi** digambar dengan gaya anime: 22 jenis arketipe dengan gerak diam sesuai pekerjaan.

---

### Catatan: dihapus/berubah (spesifikasi vs kode sekarang)

- **§13.2 Kota ±900 × 700** → kini **2000 × 1600** (desa besar, 2026-11-12).
- **§13.2/§15.3 Penjaga gerbang masuk dungeon / "Lanjut ke Lantai X" di gerbang kota** → gerbang kota kini hanya **"Keluar ke dunia"**. "Lanjut ke Lantai X" pindah ke gerbang dungeon di dunia.
- **§18.3 "Empat dungeon terbuka berurutan"** → kini **6 dungeon** (+ Makam Pasir, Menara Gerhana). Gerbangnya ditemukan di dunia, bukan dibuka di kota.
- **§25.1/§25.5 Wilayah terpisah** (4000 × 2400, lalu 20000 × 12000, keluar di tepi barat/timur, kabut per wilayah) → digantikan **§40 satu dunia 70000 × 76000**. `REGIONS` tinggal sebagai data zona (level, musuh, pita gerbang/harta). `run/fieldmap.js` masih ada sebagai mesin lama.
- **§25.1 Kelompok musuh 3–6, maks 25** → kini 5–10, maks 40 (§33).
- **§26.7 "Tepi timur Tanah Gerhana buntu"** → kini kantong tertutup tebing di selatan Baraapi dengan satu celah.
- **§41.3 Tingkat kesulitan Normal/Sulit/Neraka** → **dihapus oleh §47 (save v28)**. Kesulitan kini mengikuti **Power** (`meta/power.js`, `run/foelevel.js`). `run.diff` menjadi `run.mods` (hanya berkah Celah). Koin tersisa saat tumbang di dungeon 50%. Kunci Neraka dibuang.
- **§41.3 "Celah masuk dari tab Tantangan, belum ada gerbang fisik"** → kini ada **Gerbang Celah fisik** di alun-alun Kota Awal (NPC `rift`). Tab Tantangan hanya menampilkan rekor dan menyuruh lewat gerbang.
- **§41.4 Ujian Job Lanjutan "di tingkat Sulit atau lebih"** → kini tanpa tingkat. Arena `trial` berskala level (HP × 4,5, dmg × 3,2, +4%/level di atas 30).
- **§42 "16 quest sampingan baru (2 per bentuk), total 48"** → di kode ada **14** (7 bentuk × 2). Peristiwa dunia bukan quest. Total side quest = **46**.
- **§41.2 tabel awal:** kristal Prisma dan jamur Ladang Jamur "bisa dihancurkan" → disederhanakan, **tidak bisa dihancurkan** (cukup dihindari). Bayang Kembar = bayangan sesaat, bukan musuh.
- **§35 "Wilayah 20000 × 12000"** (alasan adanya mount) → dunia kini satu peta besar; mount tetap hanya di dunia terbuka.
- **§45.5 Toko baru** baru diterapkan di **Pandai Brom** (Peti & Jual). Toko lain (Ramuan, Permata, Pasar, Kandang, Senjata, Zirah, Perhiasan) masih memakai panel lama.
- **§24 Papan Tugas** kini punya tab tambahan **Ekspedisi** dan **Tantangan**. Toko Lencana bertambah **Singa Kerajaan** (60 Lencana).
- **Kota besar tidak punya Kandang**; spesifikasi §35 menyebut Penjaga Kandang hanya di Kota Awal, dan kode sesuai.
- **Belum masuk game:** `app/rumah.html` + `app/rumah/` (prototipe "Tata Rumah", file baru belum di-commit).

---

## Bagian C: Layar, UI, Tampilan, Suara, Save & Teknis


---

### 1. Alur permainan & layar

Alur sekarang: **Loading pembuka → Halaman awal "Ketuk untuk mulai" → menu judul → Pilih Petualang (3 slot) → [slot kosong] Buat Petualang → cutscene pembuka → Kota Awal ⇄ wilayah dunia / dungeon → (Tumbang / Hasil Perjalanan) → kota.**
Wadah layar ada di `index.html` (`#title`, `#slots`, `#create`, `#npc`, `#charpanel`, `#fieldmap`, `#pause`, `#results`, `#ending`, `#settings`, `#confirm`), dibuka lewat `ui/screens.js` `showScreen` (selalu mulai dari atas, posisi gulir dipertahankan selama layar terbuka; `keepView` agar panel yang digambar ulang tidak "ter-reset").

#### 1.1 Loading pembuka (`index.html` `#boot`, §46)
- Tampil sebelum JS: gerhana (bulan gelap di depan korona emas), kabut, bara naik, judul + subjudul, tips bergantian.
- Bar emas berisi merah bara dengan kepala menyala + persen. Bar mengikuti yang benar-benar dimuat: unduhan kode game per byte 3–71% (`vite.config.js` plugin `bootLoader`, hanya di build) → kode berjalan 74% (`window.__boot(0.74)` di `main.js`) → pengaturan 80% → daftar petualang 88% → lukisan judul & huruf (maks 4 dtk) → 100% lalu memudar (`window.__bootEnd`).
- Bahasa loader dari pilihan terakhir (`localStorage cq.lang`), selain itu dari bahasa browser.

#### 1.2 Halaman judul (`ui/title.js`, `ui/judul.css`, `art/titlebg.js`; §29 + §46)
- **Bawaan = contoh D "Ketuk untuk mulai"**. Tahap 1: adegan api unggun lebar & redup, logo "Critter Quest" besar muncul huruf demi huruf (tiap huruf emas sendiri — aman untuk Safari), kilau menyapu, gelombang, cahaya berdenyut, percikan emas, tulisan "Ketuk untuk mulai / Tekan tombol apa saja" berdenyut.
- Tahap 2: ketukan/tombol → api berkilat, kamera menyelam ke api (perbesaran 1,38×), logo pindah ke kiri atas, menu masuk satu per satu. Ketukan ini juga menyalakan musik dan tidak ikut menekan Lanjutkan (`titleBusy()`). Pembuka hanya sekali per muat halaman.
- **Empat kelas duduk di api unggun**: Warrior, Archer, Mage, Assassin di batang kayu lukisan, menyamping menghadap api (pose `sit`, `art/hero/rig.js` `SIT` / `SIT_ACT`), digambar anime + filter pixel (`render3d/pixelate.js`), diwarnai cahaya api (hangat sisi api, ungu di sisi lain, berkedip). Kebanyakan diam bernapas; gerakan khas sesekali: asah pedang ±7 dtk, cek busur ±8 dtk, gosok tangan ±6 dtk, lempar belati ±5 dtk; digambar 24 fps. Gear polos tanpa cahaya rarity. Hero terakhir dimainkan duduk di kursi depan kiri dengan rambutnya sendiri (Pengembara meminjamkan rambutnya ke warrior).
- **Menu**: kartu **Lanjutkan** (potret, nama, kelas, LV, kota terakhir; sekali ketuk langsung main), **Pilih Petualang**, **Pengaturan**, tombol bahasa **English / Indonesia**. Kaki halaman: "Enter: lanjutkan sebagai {nama}" / "Enter: pilih petualang". Slogan: "Gerhana di Ujung Dunia".
- Pembanding: `?judul=a` (Kota Awal 3D di belakang), `?judul=b` (lukisan paralaks + kabut + bara), `?judul=c` (api unggun ditata ulang), `?judul=lama` (judul lama).

#### 1.3 Pilih Petualang / Pilih Slot (`ui/slots.js`)
- 3 slot (`SLOT_COUNT`). Slot terisi: potret dengan latar warna kelas, lencana LV, pil kelas (+ nama cabang Job Lanjutan bila ada), **chip Power** (§47.6), dungeon terdalam ("{dungeon} · Lantai n" / "Belum ke dungeon"), tombol **Ekspor**, **Impor**, **Hapus** (dengan konfirmasi). Ketuk kartu = buka.
- Slot kosong: "+", "Kosong. Buat petualang baru", tombol **Buat** dan **Impor**.
- Slot rusak: ikon peringatan, "Data rusak", "Slot n tidak bisa dibaca.", hanya **Ekspor** (untuk diselamatkan) dan **Hapus** — tidak pernah ditimpa otomatis.

#### 1.4 Buat Petualang (`ui/create.js`)
- Nama (1–12 karakter, divalidasi `meta/character.js` `validateName`; Enter = buat), 6 gaya rambut (chip) × 6 warna rambut (swatch), pratinjau potret langsung.
- **Tidak ada pilihan kelas**: semua mulai sebagai **Pengembara** (catatan: "di Pelatih kamu bisa mencoba Warrior, Archer, Mage, dan Assassin, lalu memilih job mulai level 5").
- Setelah dibuat: simpan, minta `navigator.storage.persist()` (karakter pertama), lalu **cutscene pembuka** (`playCutscene('opening')`) dan masuk Kota Awal.

#### 1.5 Layar loading antar-tempat (`ui/loading.js`, §29 + §46)
- Muncul setiap dunia 3D dibangun (masuk kota dari judul/slot, teleport, keluar ke wilayah, masuk dungeon). Pembangunan dipecah per langkah dengan jeda frame (WebGL → adegan → bangunan/tanah → shader → frame pertama). Teks langkah: "Menyalakan obor…", "Membangun kota…", "Menanam pepohonan…", "Menyusun lorong dungeon…", "Menyiapkan bayangan…", "Membangunkan warga…", "Membangunkan monster…", "Siap!".
- Latar: lukisan tempat tujuan (`public/img/load_<tempat>.webp` untuk town, forest, ice, desert, volcano, eclipse, shadow, crystal, fungus, tomb, lava, spire; `loading_bg.webp` umum dengan gerhana lukisan).
- Bar sama dengan loading pembuka; **hero anime + filter pixel** berlari.
- **Kartu tujuan** (`meta/destination.js`, murni + tes): jenis & level ("Wilayah · LV 1–15", "Dungeon · 5 lantai"), nama tempat huruf demi huruf, quest yang sedang diikuti, 4 musuh tersering (belum pernah dikalahkan = siluet "???"), bos dungeon berlabel "Penguasa", **Power disarankan** berwarna hijau (≥1,25×) / kuning (≥0,85×) / merah (`ui/power.js` `powerRecLine`).
- 8 tips bergantian (Papan Tugas, Spasi dodge, Pedagang Malam, angka hijau poin, gerbang dungeon di kabut, tidur di Penginapan, peti dijaga, ramuan Z X C V).
- Menghormati `prefers-reduced-motion`.

#### 1.6 Layar lain
- **Jeda** (`#pause`): Lanjut, Menyerah ("dihitung seperti tumbang: EXP tetap, separuh koin perjalanan hilang"), Ganti Slot, Pengaturan. Kota punya jeda sendiri (`townPause`).
- **Tumbang** (`ui/fall.js` urutan jatuh ±3 dtk, bisa dilewati setelah 1 dtk; `ui/death.js` sebab kematian + tombol bangkit).
- **Hasil Perjalanan** (`ui/results.js`): rangkuman perjalanan, daftar barang berwarna rarity; Enter/Spasi = lanjut.
- **Epilog** (`ui/ending.js`) setelah cerita tamat.
- **Cutscene** (`ui/cutscene.js`): Spasi/Enter/E lanjut, Esc/tombol = lewati.
- **Konfirmasi** (`#confirm`) dialog ya/tidak umum; **Toast** (`#toast`); **Banner** (`#banner`).
- **Pop-up hadiah meriah** dan **buka peti** (`ui/reveal.js`: `showChestOpen`, `showMythicCard`, `showRewardPop` — sinar berputar, konfeti, kartu per hadiah, angka menghitung naik; ketuk/Enter/Esc).
- **Dialog NPC Potret Besar** (`ui/npc.js` `buildVn`, `ui/dialog.css`, §45.2–45.5): potret setengah badan di belakang kotak teks, teks mengetik ±45 huruf/dtk, pilihan bernomor 1–4 muncul setelah teks selesai, "Quest baru: …" di tengah atas, emosi (`meta/mood.js`: angry/ask/shock/worry/happy/think dengan simbol & gerak tubuh).
- **Gelembung warga** (`ui/bubbles.js`): warga biasa bicara lewat gelembung di atas kepala tanpa menghentikan permainan, lencana ?, !, ♪, …
- **Toko gaya baru Pandai Brom** (`ui/shopui.js`): kisi barang berbingkai rarity, kartu detail dengan ▲/▼, tab Peti/Jual (tandai beberapa ✓), stempel DIBELI, koin & barang terbang ke tas.
- **Peta kota / wilayah** (`#fieldmap`, `ui/townmap.js`, `render/townmap.js`): peta mini kanan atas (bulat di HUD bola), peta penuh dengan daftar "Quest di kota ini" dan "Toko & layanan".
- **Kartu putar HP** (`#rotate`, §27) dan **spanduk tanpa simpan** (`#nosave`: "Progres tidak akan tersimpan di browser ini").

---

### 2. HUD

#### 2.1 HUD "Bola & Bingkai" (bawaan, `ui/hudorb.js` + `ui/hud-orb.css` + `ui/hud.js`, angka `data/hud.js`; §45.1)
- **PC**: dock tengah bawah — **bola HP** (kiri, merah pekat) dan **bola Energi** (kanan, biru tua) mengapit bingkai ukir berisi garis EXP + lencana LV, baris skill 1–4 + ultimate + menghindar, dan **sabuk ramuan** (4 slot). Angka HP/Energi di tengah bola. Diameter bola 112 px (PC) / 76 px (sentuh).
- **Cincin mekanik kelas** di sekeliling bola Energi (§31: Murka/Panas/Bidik; Kombo = titik-titik, maks 10 untuk Penari Pedang).
- Kiri atas: nama wilayah/lantai (+ level musuh di titik itu, Power disarankan), uang, kill, **chip berkah/buff** (`#buffs`); jam siang–malam (ikon ◒ ☀ ◓ ☾) dan **pelacak quest** (`#qtrack`, bisa dilipat). Kanan atas: peta mini bulat dengan sapuan radar.
- Tombol bulat untuk skill, ultimate, menghindar, ramuan; cooldown = sapuan melingkar + detik.
- **Hiasan beranimasi**: cincin rune berputar di bola, gelembung naik, riak cairan, kilau emas menyapu bingkai ±5 dtk, 14 bara api naik, titik cahaya di ujung EXP, nama wilayah berpendar; skill siap = lingkar putus-putus berputar, cooldown selesai = cincin meletup, ultimate penuh = kilatan emas, tombol serang = rune berputar + napas merah.
- **Kena pukul**: bola HP terguncang + tepi layar berkedip merah. **HP < 30%**: bola berdenyut + tepi layar berdenyut merah terus.
- **Kota**: dock sama tanpa baris skill (`#townhud`: nama, LV, HP, uang, ramuan, jam); tombol **Bicara** di tempat tombol serang di HP.
- `prefers-reduced-motion` dan efek Ringan (`body.hud-lite`) menghentikan hiasan; pengaman beban (`body.hud-calm`) juga.
- **Tombol pojok**: jeda (`#pausebtn`), Karakter (`#charbtn`, dengan **angka poin belum dibagi** berdenyut + toast saat bertambah, §28), serang otomatis (`#autobtn`), suara (`#mute`), CHEAT (hanya mode cheat).
- **Tanda simpan** (`#saved`): cakram kecil di kanan bawah setiap game tersimpan (hijau ±1,4 dtk; merah ±3,5 dtk bila gagal + toast "Gagal menyimpan").
- **FPS** (`#fps`) bila diaktifkan di Pengaturan.
- **Angka damage** (`#dmg`) melayang bila diaktifkan.

#### 2.2 Kontrol sentuh (`ui/touch.js`, `core/input.js`, `core/touchdot.js`; §5.1, §27, §45.1)
- Sentuhan pertama mengalihkan ke mode sentuh (`body.touch`).
- **Joystick mengambang** di separuh kiri layar (radius 56 px), hanya mulai dari kanvas `#game`.
- **Kipas tombol** di sekitar tombol serang kanan bawah (angka di `data/hud.js` `HUD.fan`): lingkar dalam skill 1–4; lingkar luar ultimate (atas), mount, menghindar (kiri atas), ⇄ ganti halaman skill. Tombol serang ditahan = serang terus. Skill tempo mengisi selama jari menempel (§43.7). Jarak tepi 30 px (sudut membulat/poni).
- Kontrol sentuh memakai **bidik otomatis**.
- Kamera: geser dua jari ke samping atau putar dua jari untuk memutar; cubit untuk zoom (lihat §5).

#### 2.3 Tombol keyboard & mouse (kode `core/input.js` + `main.js` `input.onAction`)
| Tombol | Fungsi |
|---|---|
| W A S D / panah | Bergerak |
| Mouse | Membidik; klik kiri = serang (atau lepas skill yang sedang dibidik) |
| Klik kanan | Batal bidik skill; lepas skill tempo yang sedang diisi tanpa dipakai; tahan + geser = putar kamera |
| Roda mouse | Zoom kamera (0,85–1,6) |
| Spasi | Menghindar (dodge); di judul/hasil = lanjut |
| 1 2 3 4 | Skill 1–4 (dengan mouse: masuk mode bidik dulu, tekan lagi = lepas cepat) |
| 5 | Ultimate |
| Q | Ganti halaman skill A/B (§43.6) |
| E | Bicara / interaksi (NPC, gerbang, NPC tersembunyi); lanjut cutscene |
| R | Naik/turun mount ("Belum punya mount" bila belum ada) |
| Z X C V | Ramuan sabuk slot 1–4 |
| F | Serang otomatis nyala/mati (saat perjalanan) |
| I | Panel Karakter |
| J | Panel Karakter tab Quest (Jurnal) |
| M | Peta (kota: peta kota; wilayah: peta wilayah); di tempat lain = bisukan suara |
| Enter | Judul: Lanjutkan/Pilih Petualang; kota: bicara ke NPC terdekat; Hasil: lanjut; pilihan dialog |
| 1–4 di dialog | Memilih jawaban dialog NPC |
| Esc | Batal bidik → tutup panel → jeda / lanjut; menutup Pengaturan; lewati cutscene |
| ` (backtick) | Panel cheat (hanya mode cheat) |

---

### 3. Panel

#### 3.1 Panel Karakter (`ui/charpanel.js`), 6 tab
- **Status**: baris stat (HP maks, ATK, DEF, Kec. serang, Kritis, Dmg kritis, Gerak, CDR, Magnet), bagi poin atribut dengan pratinjau tertunda (Tambah/Batal/Simpan), **Power** berkilau dengan +/− saat berubah (§47.6).
- **Skill** (`ui/skilltab.js`): sub-tab Aktif / Ultimate / Pasif / Umum; level skill dengan SP, slot menempel & pilih slot di bawah skill, 2 halaman skill A/B.
- **Gear (n)** (`ui/gear.js`): 6 slot terpasang (senjata, helm, zirah, sepatu, kalung, cincin) + inventori; detail item dengan stat, Power bila dipakai.
- **Quest** (Jurnal, `ui/journal.js`): kartu quest utama & sampingan, langkah, rincian hadiah sebagai chip (`rewardChips`), lacak/tinggalkan; Kenangan (cutscene yang sudah dilihat) di Jurnal.
- **Mount** (`ui/stable.js` `renderStableList`): koleksi mount, bonus, ganti mount/skin (di kota).
- **Koleksi** (`ui/collection.js`): buku monster (bestiary) & kodeks item unik.

#### 3.2 Panel di NPC/kota
- **Papan Tugas** (`ui/board.js`): ambil/klaim/ganti/lepas tugas, toko Lencana, Ekspedisi.
- **Pasar / pedagang** (`ui/market.js`): etalase kota besar, Pedagang Malam, bahan, Gudang (simpan/ambil).
- **Tempa** (`ui/forge.js`): tempa (+), acak ulang, urai (salvage), soket permata, gabung permata, bar bahan.
- **Kandang** (`ui/stable.js` `renderStableShop`): beli mount & skin, pratinjau beranimasi.
- **Tantangan** (`ui/challenge.js`, tab di Balai Petualang): hanya **Celah** (berkah Celah `showBlessings`).
- **Toko Brom** gaya baru (`ui/shopui.js`): lihat §1.6.
- Peta kota & legenda (`ui/townmap.js`).

---

### 4. Pengaturan (`ui/settings.js`, `data/settings.js`, simpan di IndexedDB store `settings` kunci `main`; versi pengaturan **8**)
Dibuka dari judul dan menu Jeda; tersimpan otomatis ("Tersimpan otomatis"); Esc menutup.

| Tab | Kunci | Pilihan (bawaan **tebal**) |
|---|---|---|
| Suara | `musicVol` | 0–100, langkah 5 (**80**) |
| Suara | `sfxVol` | 0–100 (**80**; mengubahnya memutar contoh bunyi) |
| Suara | `muted` | Bisukan semua (**mati**) |
| Grafis | `view` | **2.5D** / 2D |
| Grafis | `effects` | **Otomatis** / Penuh / Ringan (Otomatis = Penuh lalu turun ke Ringan bila FPS < 40 selama 3 dtk, `data/fx.js` `AUTO_LITE`) |
| Grafis | `sharp` | Hemat (×0,7) / **Normal** (×1) / Tajam (×1,25) — `SHARP_SCALE` |
| Grafis | `foeMotion` | Animasi musuh (**nyala**): musuh yang bergerak & melentur; bisa diubah saat bermain (v8) |
| Grafis | `rimLight` | Cahaya tepi karakter (**nyala**; tetap mati di Ringan) (v8) |
| Grafis | `showFps` | Tampilkan FPS (**mati**) |
| Permainan | `autoAttack` | Serang otomatis (**mati**; juga tombol F / `#autobtn`) |
| Permainan | `shake` | Guncangan layar (**nyala**) |
| Permainan | `dmgNumbers` | Angka damage (**nyala**) |
| Permainan | `zoom` | Zoom kamera awal: Dekat (1) / Sedang (1,18) / **Jauh (1,35)** |
| Permainan | `camSens` | Sensitivitas putar kamera: Lambat ×1 / **Normal ×1,8** / Cepat ×2,6 / Sangat cepat ×3,6 |
| Permainan | `camera` | Kamera (percobaan): **2.5D** / Belakang / Belakang + ikut |
| Bahasa | `lang` | **English** / Indonesia (memuat ulang halaman) |

Field tersembunyi: `lastSlot` (petualang terakhir untuk Lanjutkan).
Riwayat versi pengaturan (`meta/schema.js` `SETTINGS_MIGRATIONS`): v2 `autoAttack`; v3 `lang` = 'en'; v4 `effects`; v5 menu Pengaturan §29 (volume, view, sharp, zoom, shake, dmgNumbers, showFps; 'full' → 'auto'); v6 `camSens`; v7 `camera` = 'top'.

---

### 5. Kamera
- **Bawaan 2.5D** (`render3d/stage.js` `Stage`): kamera perspektif tetap dari atas, bisa diputar (PC: tahan klik kanan + geser; HP: geser/putar dua jari, kecepatan `CAM_SENS`) dan di-zoom (`ZOOM` min 0,85 – maks 1,6, mulai 1,35, langkah 0,08; roda mouse).
- **Kamera percobaan** (Pengaturan → Kamera, `data/look.js` `CAMERA`): "Belakang" = rendah di belakang hero (jarak 4,6, tinggi 2,3, FOV 52); "Belakang + ikut" berputar sendiri mengikuti arah jalan. URL `?kamera=belakang` (`&ikut`) mengalahkan pengaturan.
- **Tampilan 2D datar**: Pengaturan → Tampilan 2D atau `?2d`.
- Layar pendek (HP mendatar) memperlihatkan ±440 satuan pada sisi pendek.

---

### 6. Tampilan (visual)

#### 6.1 Gaya umum
- **Dark fantasy** (§19): palet arang–perunggu–emas, font **Cinzel** (judul, tombol) + **Barlow** (teks), panel berbingkai ganda, bar HP merah tua / energi biru / EXP emas (`ui/theme-dark.css`).
- **2.5D**: dunia 3D dibangun lewat kode (Three.js; `render3d/town.js`, `field.js`, `dungeon.js`, `townbuild.js`, interior) + karakter 2D tegak (billboard). Satu kanvas WebGL bersama (`Stage`), bloom (`UnrealBloomPass`), tone mapping ACES.
- Gambar karakter/monster/gear dibuat lewat kode; hanya latar layar penuh (judul, loading, epilog) dari `public/img/*.webp` (kode tetap cadangan).

#### 6.2 Karakter anime + filter pixel (§39)
- Empat job digambar gaya anime fantasi (`art/anime/warrior.js`, `archer.js`, `mage.js`, `assassin.js`, `common.js`, `head.js`, `kit.js`), digerakkan kerangka `art/hero/rig.js` (jalan, serangan, skill, guling, lari per job `GAIT`).
- **Filter pixel** (`render3d/pixelate.js`, `LOOK.pixel`: 2 px/satuan, 7 tingkat warna per kanal, alpha di-dither Bayer 4×4, garis tinta 1 px) untuk hero, warga, monster, NPC tersembunyi, penjaga gerbang.
- Rarity senjata → elemen (Langka Es, Epik Kehampaan, Legendaris Cahaya, Mitos khas job: Warrior Api, Archer Petir, Mage Kehampaan, Assassin Darah), efek elemen halus di atas pixel (`art/anime/elemfx.js`, `gearfx.js`); sayap (`art/anime/wings.js`).
- Pengembara berbaju penduduk tanpa senjata (`art/anime/npc.js` `drawAnimeWanderer`); warga kota anime (`art/anime/npc.js`), digambar ulang hemat sesuai `LOOK.npcFps` (diam 8, jalan 12, jauh 4 fps).
- Potret dada NPC (`art/bust.js`), mount tampak depan/belakang (`art/mountviews.js`).

#### 6.3 Aura (§19 8B)
- `art/aura.js`, `art/auratier.js`, `data/aurafx.js`: lingkaran rune di kaki tiap 10 level (emas di 50), aura tubuh per efek item unik (sayap api Phoenix, kabut merah, duri, bara, daun, kilau koin/EXP, petir, angin, mata merah, perisai, amuk), gear Epik+ berpendar, partikel Legendaris/Mitos, jejak warna rarity senjata.

#### 6.4 Tampilan Matang (§36, `data/look.js` `MATANG`)
- Cahaya & palet terpusat: saturasi dunia 0,6, ambien ×0,5, matahari/bulan ×1,3, obor/lentera/jendela ×1,7, bloom 0,3/0,35/0,9, billboard tidak bersinar sendiri (NPC 0,12, hero 0,26).
- **Bayangan matahari nyata** (Penuh saja; peta 2048, 1024 di HP) dan **senja hangat** (`mood`: matahari rendah barat-barat daya, bayangan panjang).
- **Tanah dilukis** (`art/groundart.js`; `paintGround` untuk biome forest/ice/desert/volcano/eclipse dan kota home/forest/ice/desert/volcano: rumput berumpun & bunga, jalan tanah berkerikil, jalan batu kota, AO di bawah pohon/batu).
- **Props ilustrasi** (`art/pix/props.js` + `render3d/billprops.js`): pohon, batu, semak lukisan; api, kunang-kunang, ranting.
- Material bertekstur kode (plester, kayu, batu, genteng, tanah, rumput).
- **`?lama`** = tampilan sebelum §36 untuk pembanding (juga mematikan anime, pixel, HUD bola, dialog VN, arah hadap baru).
- **Prototipe Hybrid 2D/3D** (rencana `docs/superpowers/plans/2026-11-13-hybrid-visual.md`; matikan satu per satu dengan `?tanpa=rim,miring,bayang,gerak`):
  - **Cahaya sisi & tepi** (`LOOK.rim`): shader billboard karakter (`render3d/actors.js` `billMat`/`lit`): sisi ke arah matahari/bulan lebih terang, sisi lain lebih gelap; garis cahaya tipis di tepi yang menghadap matahari/bulan dan obor/lentera terdekat.
  - **Bayangan kontak lembut** (`LOOK.contact`, `render/world.js` `contactShadow`): hero, musuh, bos, kartu NPC dunia luar; sedikit menjauhi matahari; juga di Ringan.
  - **Miring ke kamera** (`LOOK.lean` 0,3 rad, `stand()`): semua billboard orang/monster condong ke belakang ±17° agar tidak tampak pendek dari atas; kaki tetap.
  - **Ringan:** cahaya tepi mati (`BILL_U.uRimOn` dari `Stage.setQuality`, juga saat Auto turun ke Ringan); bayangan kontak (satu gambar yang dicap), kemiringan, gerak musuh tetap (hampir tanpa biaya). Permata/koin di tanah tetap memakai bayangan sederhana.
  - **Musuh benar-benar bergerak** (`LOOK.foeFrames`, `?tanpa=animasi`; contoh `app/gerak.html`): Serigala Bayang, Golem, Lendir dari kit anime dengan bagian tubuh yang digerakkan (`art/foeanim.js`): diam, jalan, ancang-ancang, serang (seruduk / gigit & hantam saat menempel), kena pukul, mati. Tiap jenis dilukis **sekali** jadi lembar 23 gambar (`render3d/foeframes.js`) dan diputar 12 fps tanpa menggambar saat bermain. Jenis lain menyusul.
  - **Musuh biasa bergerak** (`LOOK.foeAnim`): lentur gambar — condong saat jalan, mundur & merunduk saat ancang-ancang, menerjang, tersentak, bernapas; yang mati jatuh & memudar 0,35 dtk.

#### 6.5 Efek "lebay" & efek skill
- Mesin efek `run/vfx.js` + `run/skillfx.js` (RNG sendiri, tidak memakai RNG simulasi), gambar `render/fxkit.js` / `render/skillfx.js`, angka `data/fx.js`, `skillfx.js`, `aurafx.js`, `itemfx.js`: ledakan, cincin, retakan, kilatan, angka damage melayang (`FLOATER`), guncangan layar 4 tingkat (`SHAKE` ringan/sedang/berat/besar), **hit-stop** bertingkat (lihat 6.8), batas partikel Penuh 400 (HP 180) / Ringan 160 (HP 90).
- **Efek skill 3D gaya prototipe** (`render3d/spell3d.js`, gambar `art/pix/fx.js`, `data/spell3d.js`).
- **Skill Job Lanjutan megah** (§48): 24 ikon sendiri (`art/branchicons.js`), lantai/aura `render/branchfx.js`, partikel `run/branchfx.js`, 3D `render3d/branch3d.js` (tiang cahaya, palu jatuh, pusaran), angka `data/branchfx.js`; efek bertahan lebih lama dari hit, ultimate dengan warna layar (`ULT_TINT`).
- **Penanda bidik skill** (§37, `run/aim.js` + `render/aim.js`): jalur berpanah, lingkaran area, kerucut, dsb.
- Pop-up hadiah (`REWARD_POP`), animasi buka peti.

#### 6.6 Arah hadap & pukulan (§38, §49)
- Arah hadap dari arah di layar (`render3d/facing.js`), **berbalik seperti kertas** (menyempit lalu melebar, lompat 4, condong 0,11 rad, 0,16 dtk).
- Pose **depan/belakang** saat berjalan mendekat/menjauh (hero, NPC, mount); NPC yang diam menghadap kamera kecuali yang sedang bekerja (`jobIdles`: palu, gunting, goyang, kuda-kuda, membaca).
- **Pukulan biasa tampak depan/belakang** mengikuti arah bidik (`art/anime/strike.js`, `LOOK.facing.strike`): Prajurit membelah, Pemanah busur tegak, Penyihir tongkat didorong, Pembunuh belati X; aura senjata tertutup badan di tampak belakang (`fxBehind`).
- **Baru (belum di-commit):** skill berputar (gerak ber-`spin`) menampilkan badan bergantian kanan → depan → kiri → belakang (`art/hero/rig.js` `whirlView`, `LOOK.facing.whirl`).
- Pengembara tanpa senjata tetap menyamping saat memukul.

#### 6.7 Siang–malam
- Jam dunia (`meta/clock.js`, `data/time.js`) memengaruhi cahaya kota/wilayah, bloom, Pedagang Malam; ikon fase di HUD.

---

#### 6.8 Rasa pukulan: tangga dampak (rencana `docs/superpowers/plans/2026-11-13-rasa-pukulan.md`, bagian A–D)
Setiap jenis pukulan terasa berbeda, dan efek paling kuat disimpan untuk momen penting. Semua angka ada di `data/fx.js`. Semua ini hanya tampilan: damage, posisi musuh, dan hasil simulasi tidak berubah.

| Momen | Jeda (hit-stop) | Guncangan | Angka damage | Lainnya |
|---|---|---|---|---|
| Pukulan biasa | – | – | kecil, putih | musuh tersentak 3 px |
| Hit skill | 0,03 dtk, hanya musuh pertama per hit | – | **gaya skill**: sedang, warna elemen | tersentak 5 px |
| Kritikal | 0,03 dtk | – | miring, besar, bergoyang | tersentak 6 px |
| Hit ultimate | 0,05 dtk sekali per hit | ringan | emas | tersentak 7 px |
| Musuh biasa mati | – | – | – | cincin ungu kecil |
| Elite mati | 0,05 dtk | ringan | – | cincin emas + bintang |
| Finisher Kombo penuh | 0,05 dtk | sedang | – | tebasan silang ungu |
| Mengamuk (Warrior) | 0,06 dtk | sedang | – | auman, kamera 4% |
| Ultimate dilepas | 0,08 dtk | berat | – | kamera 7% |
| Bos ganti fase | 0,22 dtk | **besar** | judul fase | kilat ungu, 2 cincin, percikan, raungan, kamera 10% |
| Bos tumbang | 0,25 dtk | **besar** | "TUMBANG!" | cincin ganda, kamera 14% |

- **Kamera mendekat (bagian B):** untuk momen terbesar, kamera maju sedikit lalu mundur perlahan (`PUNCH` di `data/fx.js`, `render3d/stage.js` `leanIn`): Mengamuk 4%, ultimate dilepas & ultimate fokus kena 7%, bos ganti fase 10%, bos tumbang 14%. Saat hit-stop, kamera tertahan di posisi dekat. Mati bila Guncangan layar dimatikan atau "kurangi gerakan" aktif. Tetap jalan di efek Ringan karena tidak memakan tenaga. Hanya di tampilan 2.5D.
- **Musuh tersentak:** gambar musuh terdorong menjauhi arah pukulan lalu kembali dalam 0,14 dtk, sambil sedikit gepeng (`RECOIL`, `run/vfx.js` `recoilOf`, digambar di `render3d/actors.js` dan `render/world.js`). Bos hanya bergeser 35%. Posisi asli musuh tidak berubah.
- **Jeda yang tidak tersendat:** jeda kritikal dan skill paling sering sekali per 0,18 dtk, dan ultimate sekali per 0,3 dtk (`HITSTOP_GAP`). Jadi skill area dengan banyak kritikal tidak membuat game patah-patah.
- **Batas angka:** paling banyak 70 angka melayang (`FLOATER_MAX`). Angka biasa di atas itu dilewati saat gerombolan besar; kritikal dan ultimate tetap tampil.
- **Perbaikan:** dulu tiga momen (bos ganti fase, ultimate fokus kena, Tebasan Raksasa penuh) meminta guncangan "besar" yang belum ada. Akibatnya guncangan layar mati sampai perjalanan berakhir. Sekarang tingkat `big` ada, dan tingkat yang tidak dikenal diabaikan.
- **Kurangi gerakan (bagian D):** dengan pengaturan "kurangi gerakan" di perangkat, **semua** kilat layar dilewati (skill, cabang, bos), bukan hanya puncak kelas (`Vfx.calm`, disalin dari `run.calm` tiap langkah).
- Kilat fase bos dilewati bila pemain memilih "kurangi gerakan". Guncangan mengikuti pengaturan Guncangan layar dan mati di efek Ringan. Partikel dan cincin memakai pool lama yang terbatas.
- Angka damage di tampilan 2.5D digambar tanpa membuat objek baru setiap frame.
- Tes: `run/impact.test.js`.

### 7. Suara (`core/audio.js`, `data/audio.js`; §34)
- **Musik dari file** (`public/audio/*.mp3`, diolah `npm run audio` dari `art-src/audio/`): judul, kota, wilayah (2 lagu acak tidak berulang), dungeon, bos (selama bos hidup), epilog; hening di Hasil Perjalanan. Dua elemen `<audio>` streaming, **crossfade 2 dtk**.
- **Efek suara dari file**: serang pedang/belati/panah/sihir, hit biasa/keras/kritis, mati kecil/besar/bos (varian acak), luka ringan/berat, pemain mati, menghindar, energi habis, 11 suara skill + 4 ultimate (pemetaan `SKILL_SOUND`), jingle naik level / lantai bersih (tamat) / kalah. Jeda minimum & batas suara per nama, nada diacak ±8%.
- **Cadangan sintetis**: suara tanpa file (atau gagal dimuat) memakai synth `core/audio.js`; musik yang gagal → lagu chiptune lama.
- **Bunyi sintetis baru** (belum punya file): `tell` (ancang-ancang bos: cincin/spiral/panggilan), `choke` (Raja Maw tersedak), `shadeBreak` (Bayang Maw pecah), `roar` (Mengamuk), `sizzle` (Kepanasan), `ready` (Bidik penuh / Kombo penuh), `glint` (Cahaya Aneh terlihat/tertangkap, lentera Pedagang Kelana terlihat, membeli darinya), `rumble` (langkah Raksasa Pengembara, jebakan Cahaya Aneh). Bos ganti fase memakai `boss` yang sudah ada.
- Kontrol: volume musik & efek, bisukan (`#mute`, M di luar peta). Musik mulai pada gestur pertama (ketukan halaman judul).
- Service worker melayani permintaan Range agar audio jalan offline.

---

### 8. Dua bahasa EN/ID (`src/i18n.js`, `src/i18n/`; §23)
- **Inggris bawaan**, Indonesia pilihan; dipilih di halaman judul (English/Indonesia) atau Pengaturan → Bahasa; mengganti bahasa menyimpan pengaturan lalu memuat ulang.
- Teks sumber Indonesia di kode; kamus Inggris berkunci teks Indonesia: `en-ui.js` (UI & index.html), `en-game.js` (pesan main/run/render/meta), `en-story.js` (cerita/cutscene), `data-en.js` + `en-data.js` (`localizeData()` mengganti nama & deskripsi data). Tes `data-en.test.js` memastikan semua data diterjemahkan.
- Cara menulis: `tr('…')`, `t('… {n} …', { n })`, `num()` (koma/titik desimal), atribut HTML `data-tr`, `data-tr-title`, `data-tr-label`.
- Bahasa juga disimpan di `localStorage cq.lang` untuk loader awal.

---

### 9. Save (`meta/save.js`, `meta/schema.js`, `meta/transfer.js`; §9)
- **IndexedDB** `critter-quest` (versi DB 1), store `slots` (keyPath `slot`, 0–2) dan `settings` (kunci `main`). Tulis selesai setelah transaksi commit.
- **Cadangan memori** bila IndexedDB tidak tersedia/diblokir → spanduk `#nosave`.
- **Validasi saat memuat** (`readSlot` = `migrate` + `validateSlot`); data rusak ditampilkan "Data rusak", tidak pernah ditimpa (`saveSlot` menolak menulis di atas slot rusak). Versi lebih baru dari game = rusak.
- **Auto-save**: setiap transaksi/aksi penting; di kota regenerasi HP disimpan tiap ±10 dtk; Arena latihan & Ujian Cabang tidak disimpan. Tanda simpan `#saved`.
- `navigator.storage.persist()` diminta saat karakter pertama dibuat.
- **Ekspor/Impor** (§6B, tombol di Pilih Slot): ekspor ke `critter-quest-<nama>.json` (`{ game, version, exported, save }`; slot rusak juga bisa diekspor). Impor: pilih file → JSON → migrate + validasi → konfirmasi bila menimpa ("Timpa … Tidak bisa dibatalkan.") → simpan ke slot itu; file berisi slot polos juga diterima.

#### 9.1 Versi save sekarang: **28** (`SAVE_VERSION`)
Langkah `MIGRATIONS` (v → v+1):
| Ke | Isi |
|---|---|
| v2 | HP & ramuan terbawa kota ↔ dungeon; rekor per lantai (§13.5) |
| v3 | Poin stat (atribut) menggantikan kartu level-up; slot sepatu & kalung (§14.3) |
| v4 | Ramuan per jenis + sabuk 4 slot (§15.2) |
| v5 | Rekor per dungeon (§18.3) |
| v6 | Jam dunia disimpan (§18.4) |
| v7 | Bahan & permata; item punya level tempa & soket (§20) |
| v8 | Skill dari pool kelas + bakat (§21) |
| v9 | 4 slot skill (§22) |
| v10 | Papan Tugas, Lencana, bestiary, kodeks unik (§24) |
| v11 | Dunia terbuka: kota terakhir, kota dikunjungi, wilayah (§25.1) |
| v12 | Wilayah besar, benih dunia per karakter, dungeon ditemukan, ekspedisi (§25.5) |
| v13 | Belanja pedagang kota besar, Gudang (§25.2) |
| v14 | Peti harta per wilayah (§25.3) |
| v15–v16 | Bestiary musuh biome; Makam Pasir (§25.4) |
| v17 | Quest (§26) |
| v18–v19 | Hantu Gerhana, Menara Gerhana, tanggal tamat cerita (§26.7) |
| v20 | Tugas papan harus diambil (`taken`) (§28) |
| v21 | Kandang mount (§35) |
| v22 | Satu dunia tersambung: satu kabut dunia (§40) |
| v23 | Quest beragam: jawaban pilihan & rekor balapan (§42) |
| v24 | Musuh baru di buku monster (§41.1) |
| v25 | SP per job menggantikan skill+bakat, 1 respec gratis (§43) |
| v26 | Tingkat kesulitan, kunci Neraka/Celah, rekor Celah (§41.3) |
| v27 | Prolog `ch0`: karakter lama melewatinya (2026-11-12) |
| v28 | Normal/Sulit/Neraka dihapus: `difficulty` & `unlocked.hell` dibuang (§47.5) |

---

### 10. Offline/PWA & main di HP (§27, §32)
- **Manifest** `public/manifest.webmanifest`: layar penuh, mendatar, latar `#0f0c12`; ikon dibuat kode (`pwa/icon.js`, gerhana emas + pedang) → `public/icons/*.png` lewat `pwa/make-icons.mjs`.
- **Service worker** (`pwa/sw.js` → `dist/sw.js` oleh plugin `vite.config.js`, daftar via `core/pwa.js` hanya di build): simpan semua file build + font Google (cache `cq-<versi>` dan `cq-fonts`), melayani halaman apa pun dari `index.html` simpanan, mendukung Range untuk audio, hapus cache lama.
- **Versi baru**: diunduh diam-diam; di judul langsung muat ulang, saat bermain toast "Versi baru terpasang. Muat ulang game untuk memakainya."
- `npm run phone` (build + server port 4173) untuk Android via flag Chrome; hosting itch.io & Cloudflare.
- **Hanya landscape di HP** (sentuh, lebar ≤ 900 px): kartu `#rotate` saat tegak, perjalanan dijeda; Android mencoba layar penuh + kunci landscape pada `pointerup` (ulang sampai berhasil); iPhone mengikuti jendela browser.
- Layar pendek (tinggi ≤ 540 px): HUD, pelacak, tombol, panel diperkecil (CSS `zoom`); kolom isian minimal 16 px (iPhone tidak memperbesar).
- `core/pinpage.js`: halaman dikunci di scroll (0,0) agar ketukan di iOS/itch iframe tidak meleset setelah keyboard.
- Penghemat HP sentuh (`render3d/stage.js` `TOUCH_CAP`, §50.1): rasio render maks 1,5, ubin tanah 0,8, peta bayangan 1024, lantai dungeon maks 2048 px.

---

### 11. Pengaman beban (`run/loadguard.js`, angka `data/loadguard.js`)
- Level 0 = semua nyala; **level 1** (musuh hidup ≥ 18, HP ≥ 12, atau FPS < 40) = hiasan HUD diam (`body.hud-calm`); **level 2** (musuh ≥ 34, HP ≥ 24, atau FPS < 28) = juga dunia 3D dirender 1 piksel per piksel CSS (`STAGE.setCap(1)`) + efek Ringan sementara (`vfx.tempLite`), tanpa membangun ulang.
- Naik setelah 1 dtk melewati garis, turun setelah 4 dtk tenang (musuh < 70% dan FPS ≥ garis + 10); sampel 0,5 dtk. Murni + tes.
- Terpisah dari "Otomatis" efek (`FpsWatch`, `AUTO_LITE`) yang menurunkan ke Ringan untuk sesi itu.

### 12. Pencatat tertutup paksa (§50, `meta/lastexit.js` + tes; belum di-commit)
- Tiap 3 dtk (`BEAT_EVERY`) dan saat `visibilitychange` dicatat di `localStorage cq.alive`: waktu, tempat (kota / dunia luar / dungeon / menu), sejak kapan, halaman tersembunyi atau tidak.
- Keluar wajar (`pagehide`, muat ulang karena versi baru, ganti bahasa) menandai catatan ditutup.
- Saat dibuka berikutnya dan catatan belum ditutup: toast sekali — "Game tadi tertutup tiba-tiba saat bermain di {tempat} (setelah {m} menit). Biasanya karena memori HP penuh…" atau "Game tadi ditutup HP saat kamu pindah ke aplikasi lain… wajar di iPhone"; plus `console.warn('[cq] last exit')`.
- Pencegahan memori (§50.1): `core/freecanvas.js` menolkan kanvas yang dibuang (kartu NPC/penjaga/titik quest, billboard bos anime, warga kota lama, lantai dungeon lama) + `TOUCH_CAP`.

### 13. Panel cheat (`ui/cheat.js`, aksi di `main.js`)
- Aktif di `npm run dev` atau `?cheat`; tombol CHEAT / backtick.
- Semua adegan: daftar **Cutscene** (semua id `data/scenes.js` + momen kawal/selamatkan); **Efek** (ledakan uji, angka uji, hit-stop, getar ringan/sedang/berat — saat perjalanan; FPS tampil/sembunyi).
- Kota: +1.000/+10.000 koin, +1/+5 level, Level 50, ramuan penuh, HP penuh, reset poin, +material, +permata, +10 Lencana, selesaikan tugas, buka semua dungeon, +3/+12 jam, Lulus Ujian Cabang, Buka Celah, kunjungi semua kota; Gear masuk tas per rarity & slot (beri 1/10), semua item unik kelasku, kosongkan tas, +Kuda / +semua mount.
- Wilayah/dungeon: Kebal, bunuh semua, elite 2 sifat, panggil 10 musuh baru, buka seluruh peta, +100 EXP, warp (ujung timur, tengah, gerbang, harta), **munculkan peristiwa dunia** (Karavan, Serbuan, Meteor, Cahaya Aneh, Raksasa, Pedagang Kelana, Kabut Sunyi; mengabaikan jam & jeda) / bersihkan lantai, lompat lantai 1–5; mount; jatuhkan gear 1/5 di dekat pemain.

### 14. Parameter URL & kait uji
- `?lama` tampilan lama · `?2d` tampilan datar · `?cheat` panel cheat · `?judul=a|b|c|lama` contoh halaman judul · `?kamera=belakang[&ikut]` kamera percobaan · `?t=<detik>&class=…&region=…` lompat simulasi (tangkapan layar).
- Kait debug di `window`: `__game`, `__input`, `__town`, `__char`, `__explore`, `__dungeon`, `__avatar`, `__seek`, `__play`.

### 15. Halaman contoh (`app/*.html`, tidak masuk game)
- `index.html` — game itu sendiri.
- `anime.html` — Contoh Gaya Anime: desain karakter semua job, arah, lari, skill, pixel/halus.
- `arah.html` — Contoh Arah Hadap (ikut layar, berbalik seperti kertas, depan/belakang; §38).
- `bos.html` — Bos Dungeon (galeri bos dan jurusnya).
- `bosanime.html` — Bos Anime (bos bertubuh monster gaya anime).
- `char.html` — Perbandingan Karakter (gaya karakter berdampingan).
- `compare.html` — Perbandingan Gaya (pembanding gaya visual).
- `dialog.html` — Contoh Dialog NPC (`?v=A` Potret Besar, `?v=C` gelembung warga, toko Brom; §45).
- `hud.html` — Contoh HUD (`?v=A` Bola & Bingkai yang dipilih; §45.1).
- `item.html` — Ikon Item Anime per rarity (Mitos besar).
- `kota3d.html` — Kota 2.5D (uji kota 3D).
- `masuk.html` — Konsep Halaman Masuk (konsep A Api Unggun dipilih; §29).
- `musuh.html` — Musuh Baru (galeri 10 musuh berperilaku khas; §41.1).
- `npc.html` — NPC Anime (warga kota gaya anime).
- `pet.html` — Konsep Pet & Mount (9 mount, Putar/Samping/Depan/Belakang; §35).
- `pixel.html` (+ `pixel/`) — Uji Gaya Pixel: prototipe A Matang vs B Pixel HD-2D (§36).
- `pov.html` — Uji Sudut Kamera.
- `pov3d.html` — Uji Three.js (awal 2.5D).
- `pukul.html` — Contoh Pukulan Depan & Belakang (4 job × depan/samping/belakang, Baru vs Lama; §49).
- `rumah.html` (+ `rumah/main.js`, **baru, belum di-commit**) — Contoh Rumahmu: A = tata rumah sendiri (pindah/putar/taruh perabot dari tas, kenyamanan), B = tingkat rumah (Pondok → Rumah → Rumah Besar).
- `ui.html` — Usulan UI (usulan tampilan antarmuka awal).
- `warrior3d.html` — Warrior 3D (uji karakter 3D).

---

### Catatan: dihapus/berubah (spesifikasi lama vs kode sekarang)
- **Kemah** (§3, §7) dihapus sejak §13 — diganti kota + dungeon/dunia. Tabel layar §3 "Judul: Logo, tombol Main, tombol suara" kini halaman "Ketuk untuk mulai" + menu Lanjutkan/Pilih Petualang/Pengaturan/bahasa.
- **Kartu level-up berkah sementara** (§3, §5.5) dihapus di v3 (§14) — diganti poin stat. (Berkah kartu kini hanya untuk Celah.)
- **Buat Karakter memilih kelas** (§3) — dihapus: semua mulai sebagai Pengembara, job dipilih di Pelatih level 5 (§43.1).
- **Tombol EN · ID di menu Jeda** (§23) — di kode menu Jeda kini hanya Lanjut / Menyerah / Ganti Slot / Pengaturan; bahasa diganti lewat Pengaturan → Bahasa atau tombol di judul.
- **Pengaturan versi 5** (§29) — kini **versi 7** (+`camSens` v6, +`camera` v7).
- **Halaman judul A "Api Unggun" dengan menu langsung** (§29) — kini bawaan D "Ketuk untuk mulai" (§46); A/B/C dan `?judul=lama` hanya pembanding.
- **Loading lama** (gerhana menutup sebagai progres, pahlawan gaya lama, §29) — kini bar emas nyata + hero anime pixel + kartu tujuan (§46).
- **Loader awal "gerhana kecil berputar + Memuat…"** (§29) — kini loader gerhana dengan bar per byte (§46).
- **HUD lama** (bar HP/EXP, ikon skill kotak, §3) — kini HUD Bola & Bingkai; HUD lama hanya di `?lama`.
- **Dialog NPC panel menempel di bawah** (§28) — kini dialog Potret Besar VN (§45.2); panel lama hanya `?lama`.
- **Normal/Sulit/Neraka** (§41.3) — dihapus (§47, save v28); tab Tantangan hanya Celah; HUD & cheat dibersihkan.
- **"M = bisukan"** (sebelum §30) — kini M = peta di kota/wilayah, bisukan hanya di tempat lain.
- **Skill di Q / E** (save v8) — kini 1–4 + 5 ultimate; Q = ganti halaman skill (§43.6).
- **Talent/bakat** (v8) — dilebur ke SP per job (v25).
- **Rekor `localStorage cs-best`** prototipe tidak dimigrasi (sesuai §9.3).
- `?judul=d` di spesifikasi §46 disebut sebagai salah satu contoh — kini bawaan tanpa parameter.

---

