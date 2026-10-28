# Critter Quest — Arcade: Spesifikasi Desain

| | |
|---|---|
| **Status** | Disetujui (2026-10-26); **diubah 2026-10-26: Kota & Dungeon (§13)** — §13 mengalahkan bagian lain bila bertentangan |
| **Basis kode** | Prototipe `app/` (Critter Survivors, Vite + JavaScript murni + canvas) |
| **Konsep induk** | [`docs/2026-10-26-konsep-critter-quest.md`](../../2026-10-26-konsep-critter-quest.md) — versi RPG penuh; dokumen ini adalah langkah pertamanya |
| **Perkiraan** | 2–4 sesi kerja |

Semua angka keseimbangan di dokumen ini adalah **nilai awal** dan akan disetel saat uji main. Angka disimpan di file data, tidak ditulis langsung di logika.

---

## 1. Tujuan

Mengubah prototipe survival arena menjadi **action roguelite dengan kota**: pemain tinggal di **kota** yang bisa dijelajahi (Inn, toko), lalu masuk **dungeon berlantai**; karakter, level, uang, HP, potion, dan gear **tersimpan permanen di IndexedDB**. Bisa dimainkan di PC dan HP. (Rancangan awal "Kemah + ronde arcade" diganti — lihat §13.)

**Ukuran berhasil:**
1. Pemain bisa membuat karakter (nama, rambut, kelas), bermain beberapa ronde, menutup browser, membuka lagi, dan semua progres masih ada.
2. Keempat kelas terasa berbeda cara mainnya.
3. Gear yang dipakai terlihat di badan karakter.
4. Bisa dimainkan penuh di HP dengan kontrol sentuh.

## 2. Di luar lingkup

Job lanjutan, item Legendaris, dungeon kedua dst., Pandai Besi/tempa, Papan Quest, Gudang, PWA, fitur online, simpan di tengah dungeon. (Kota dan satu dungeon berlantai **masuk lingkup** sejak 2026-10-26, §13.)

## 3. Alur & Layar

> Diganti oleh §13.1 (Kemah dihapus; kota + dungeon). Tabel di bawah tetap berlaku untuk Judul, Pilih Slot, Buat Karakter, HUD, Level-up.

```
Judul ─► Pilih Slot (3) ─► [slot kosong] Buat Karakter ─┐
                    │                                    ▼
                    └──────[slot terisi]──────────────► KEMAH
                                                         │
          ┌──────────────────────────────────────────────┤
          ▼                                              │
     Ronde Arcade ──► (Level-up kartu / Jeda) ──► Hasil ─┘ (auto-save)
```

| Layar | Isi |
|---|---|
| **Judul** | Logo, tombol Main, tombol suara |
| **Pilih Slot** | 3 slot: nama, kelas, level, potret paper doll; tombol Hapus (dengan konfirmasi); tombol Ekspor / Impor save |
| **Buat Karakter** | Nama (1–12 karakter), 5 gaya rambut × 6 warna, pilih kelas; pratinjau paper doll langsung |
| **Kemah** | Potret karakter + stat; tab **Mulai Ronde**, **Gear** (inventori + slot terpasang), **Toko** |
| **HUD Ronde** | HP, EXP ronde, waktu, kill, uang ronde, ikon skill + cooldown; kontrol sentuh di HP |
| **Level-up** | 3 kartu berkah sementara (dipertahankan dari prototipe) |
| **Jeda** | Lanjut, Menyerah (mengakhiri ronde dengan hadiah tetap didapat) |
| **Hasil** | Waktu bertahan, kill, EXP & level naik, uang, daftar gear didapat (warna rarity) |

## 4. Karakter

### 4.1 Model stat

```
stat akhir = dasar kelas
           + pertumbuhan level × (level − 1)
           + upgrade permanen toko
           + gear terpasang
           × berkah sementara ronde (kartu level-up)
```

| Stat | Arti |
|---|---|
| `maxHp` | Darah maksimal |
| `atk` | Damage dasar |
| `def` | Pengurang damage diterima (flat) |
| `atkSpd` | Pengali kecepatan serang (1 = normal) |
| `crit` | Peluang kritis (%) |
| `critDmg` | Pengali damage kritis (awal 1,5) |
| `moveSpd` | Kecepatan gerak (px/detik) |
| `cdr` | Pengurangan cooldown skill (%, maks 40) |
| `magnet` | Jangkauan tarik pickup (px) |

### 4.2 Kelas

| | Warrior | Archer | Mage | Assassin |
|---|---|---|---|---|
| maxHp | 140 | 95 | 85 | 90 |
| atk | 14 | 11 | 16 | 9 |
| def | 2 | 0 | 0 | 0 |
| crit | 5% | 8% | 5% | 20% |
| moveSpd | 105 | 115 | 100 | 125 |
| Jeda serangan dasar | 0,55 s | 0,45 s | 0,8 s | 0,3 s |
| Pertumbuhan / level | +12 HP, +1,4 atk | +8 HP, +1,2 atk | +7 HP, +1,6 atk | +8 HP, +1,0 atk |

| Kelas | Serangan dasar | Skill 1 (Q) | Skill 2 (E) |
|---|---|---|---|
| **Warrior** | Tebasan busur 100° radius 46 di arah bidik | **Putaran Pedang** — area radius 70 di sekeliling, 4 tik selama 1 s, 150% atk/tik; cd 8 s | **Teriakan Baja** — damage diterima −50% selama 4 s; cd 14 s |
| **Archer** | Panah lurus, laju 380, jangkauan 450 | **Hujan Panah** — area radius 60 di titik bidik, 5 tik / 1,5 s, 80% atk/tik; cd 9 s | **Tembakan Tembus** — panah besar menembus semua musuh, 300% atk; cd 7 s |
| **Mage** | Bola api laju 260, meledak radius 36 saat kena | **Nova Es** — radius 90 di sekeliling, 120% atk + membekukan 1,5 s; cd 10 s | **Petir Berantai** — melompat ke 5 musuh, 180% atk; cd 7 s |
| **Assassin** | Tusukan jarak 34 di arah bidik | **Langkah Bayangan** — dash 150 px menembus musuh, 250% atk ke yang dilewati; cd 6 s | **Kipas Belati** — 7 belati menyebar 60°, 90% atk; cd 8 s |

**Dodge (semua kelas):** dash 150 px dalam 0,18 s, kebal 0,25 s, cd 1,2 s.

### 4.3 Level & EXP permanen

- EXP karakter = total nilai **permata EXP yang diambil** dalam ronde (sama dengan sumber EXP ronde, §5.4); diberikan di layar Hasil.
- EXP untuk naik level: `30 + 20 × level`.
- Level maks versi ini: 50.

## 5. Pertarungan

### 5.1 Kontrol

| Aksi | PC | HP |
|---|---|---|
| Gerak | WASD / panah | Joystick virtual (setengah layar kiri, muncul di titik sentuh) |
| Bidik | Kursor mouse | Otomatis ke musuh terdekat dalam jangkauan; bila tidak ada, arah gerak |
| Serang | Klik / tahan kiri | Tahan tombol serang |
| Skill 1 / 2 | Q / E | Tombol skill (dengan lingkaran cooldown) |
| Dodge | Spasi | Tombol dodge |
| Minum potion (§7) | R | Tombol potion (tampil bila punya) |
| Jeda | Esc | Tombol jeda di HUD |

Kontrol sentuh tampil bila perangkat memakai pointer kasar (`matchMedia('(pointer: coarse)')`) atau ada sentuhan pertama.

**Mode AUTO** (ditambahkan 2026-10-26 atas permintaan pemilik): tombol **F** atau tombol AUTO di HUD (PC & HP). Saat aktif, serangan dasar keluar sendiri setiap ada musuh dalam jangkauan serangan kelas (jarak dekat: radius serangan + 14 px; proyektil: jangkauan proyektil) dan bidik otomatis ke musuh terdekat — bisa dimainkan hanya dengan keyboard. Skill dan dodge tetap manual. Pilihan disimpan di `settings.autoAttack`.

### 5.2 Aturan damage

- `damage = atk × pengali_skill × (kritis ? critDmg : 1)`
- `damage diterima = max(1, damage_musuh − def)` (lalu dikali pengurang aktif seperti Teriakan Baja)
- **Tidak ada masa kebal musuh bersama.** Setiap instans serangan menyimpan daftar musuh yang sudah dikenai:
  - serangan sekali-kena (panah, tebasan, belati) mengenai tiap musuh **maksimal sekali**;
  - area bertahan (Putaran Pedang, Hujan Panah) mengenai tiap musuh sekali **per tik**.
  Ini mengganti mekanisme `hurtCd` bersama di prototipe (bug #4).
- Pemain kebal 0,7 s setelah terkena (dipertahankan dari prototipe).

### 5.3 Musuh & gelombang

- Jenis musuh, gelombang, dan bos setiap 150 s **dipertahankan** dari prototipe (`data.js`).
- **Musuh elite (baru):** setelah detik ke-60, 3% musuh yang muncul menjadi elite — HP ×3, ukuran ×1,3, bercahaya, **pasti menjatuhkan 1 gear**.
- Musuh bisa dibekukan (Nova Es): diam dan berwarna biru selama durasi.

### 5.4 Pickup

| Pickup | Sumber | Efek |
|---|---|---|
| Permata EXP | Semua musuh | EXP ronde (untuk kartu level-up) **dan** EXP karakter |
| Koin | 30% musuh biasa (1–3), elite (10), bos (100) | Uang |
| Hati | 1,8% musuh | +20 HP |
| Gear | Elite, bos, 0,5% musuh biasa | Masuk daftar "didapat ronde ini" |

Semua pickup tertarik oleh `magnet`. Gear di tanah memancarkan sinar warna rarity.

### 5.5 Berkah sementara (kartu level-up)

Dipertahankan dari prototipe (`STAT_UPS`) tetapi hanya berlaku selama ronde. Kartu senjata baru dihapus karena kelas sudah menentukan serangan.

### 5.6 Akhir ronde

- Diganti oleh §13.4 (akhir perjalanan dungeon: pulang lewat portal / mati / menyerah, hukuman separuh).

## 6. Gear & Rarity

### 6.1 Slot

| Slot | Terlihat di badan | Stat dasar |
|---|---|---|
| Senjata (khusus kelas) | Ya | atk |
| Helm | Ya (menutupi rambut) | maxHp |
| Armor | Ya | def + maxHp |
| Cincin | Tidak | — (bonus saja) |

### 6.2 Rarity

| Rarity | Warna | Bonus acak | Pengali stat dasar |
|---|---|---|---|
| 0 Biasa | Putih `#e8e8e8` | 0 | ×1,00 |
| 1 Bagus | Hijau `#6ee7a0` | 1 | ×1,00 |
| 2 Langka | Biru `#6ec9ff` | 2 | ×1,05 |
| 3 Epik | Ungu `#c26bd8` | 3 | ×1,15 |

Cincin selalu minimal Bagus (punya ≥1 bonus).

### 6.3 Pembuatan item

- **Level item** = `min(levelKarakter + 3, 1 + floor(detikRonde / 30))`, minimal 1.
- **Stat dasar** = `dasarSlot × (1 + 0,12 × (levelItem − 1)) × pengaliRarity`, dibulatkan.
- **Bonus acak:** diambil tanpa duplikat dari `atk, maxHp, atkSpd, crit, moveSpd, cdr`; nilainya diskalakan dengan level item.
- **Visual:** tiap slot punya 3 varian tampilan (mis. Pedang Kayu / Besi / Baja) dipilih dari rentang level item. Epik diberi kilau.
- **Nama:** `<varian> <akhiran bonus pertama>`, mis. "Pedang Besi Kilat".
- Pembuatan item memakai RNG yang bisa di-seed agar bisa dites.

### 6.4 Peluang rarity

| Sumber | Biasa | Bagus | Langka | Epik |
|---|---|---|---|---|
| Musuh biasa / elite / peti Toko | 70% | 23% | 6% | 1% |
| Bos (2 item) | — | — | 65% | 35% |

### 6.5 Inventori

- Maksimal **30 item**. Bila penuh, gear baru di ronde tetap tercatat tetapi pemain harus menjual/membuang sebelum ronde berikutnya (layar Hasil mengarahkan ke tab Gear).
- Pasang/lepas di tab Gear, dengan perbandingan stat (naik hijau / turun merah).
- Jual: harga = `5 × levelItem × (1 + rarity)`.

## 7. Toko (Kemah)

> Diganti oleh §13.2: toko kini NPC di kota. Potion dibeli di Toko Ramuan (bukan upgrade "Potion Awal"); Peti Gear di Toko Gear (langkah 5); Upgrade HP/ATK/Magnet pindah ke NPC Pelatih (langkah 6); Ganti Rambut ke Tukang Cukur (langkah 6).

| Barang | Efek | Harga |
|---|---|---|
| Upgrade HP (maks 10) | +6% maxHp | `50 × 1,5^tingkat` |
| Upgrade ATK (maks 10) | +5% atk | `60 × 1,5^tingkat` |
| Upgrade Magnet (maks 5) | +20 magnet | `40 × 1,6^tingkat` |
| Potion Awal (maks 3) | Mulai ronde dengan N potion (pulih 40% HP, tombol khusus) | `120 × 2^tingkat` |
| **Peti Gear** | 1 item acak, level = level karakter | `30 + 10 × levelKarakter` |
| Ganti Rambut | Ubah gaya/warna | 50 |

Setiap transaksi langsung di-auto-save.

## 8. Paper Doll & Aset

> Diubah 2026-10-26 (langkah 3A): gaya **pixel art → kartun vektor halus** atas permintaan pemilik.

- Semua aset dibuat lewat kode dengan gaya **kartun vektor**: bentuk membulat, outline tebal gelap, gradien & sorot cahaya lembut, bayangan elips di bawah entitas. UI memakai font Fredoka, panel membulat, tombol pil bergradien.
- Canvas digambar pada resolusi penuh (`devicePixelRatio`); zoom menyesuaikan layar (sisi pendek ≈ 360 unit dunia). Musuh, pickup, dan dekor di-*bake* ke canvas offscreen sesuai skala dan dibuat ulang saat ukuran layar berubah.
- **Kerangka karakter:** chibi ± 24 × 44 unit dunia, titik asal di tengah kaki; menghadap kanan, arah kiri memakai flip horizontal.
- **Pose** (pengganti frame sprite): diam, jalan (ayunan kaki + badan memantul), serang, terkena — dihitung prosedural dari parameter pose.
- **Lapisan (bawah → atas):** badan → armor → rambut (disembunyikan bila helm terpasang) → helm → senjata.
- Tiap lapisan digambar relatif terhadap **titik jangkar** (kepala, badan, tangan) yang dihitung per pose, sehingga gear selalu pas.
- Rambut: 5 gaya × 6 warna (warna = palet). Baju diberi warna & ciri khas per kelas.
- Potret menu digambar sekali ke canvas; karakter di ronde digambar langsung tiap frame (cukup murah untuk satu karakter).

## 9. Save (IndexedDB)

### 9.1 Basis data

- Nama DB: `critter-quest`, versi 1.
- Object store `slots` (keyPath `slot`, nilai 0–2) dan `settings` (kunci `main`).

### 9.2 Bentuk data slot (versi 1)

```js
{
  version: 1,
  slot: 0,                       // 0..2
  createdAt: 1761436800000,      // epoch ms
  updatedAt: 1761436800000,
  name: 'Reyhan',                // 1–12 karakter
  look: { hair: 2, hairColor: 4 },
  classId: 'warrior',            // warrior | archer | mage | assassin
  level: 1, exp: 0,
  gold: 0,
  upgrades: { hp: 0, atk: 0, magnet: 0, potion: 0 },
  inventory: [ /* Item, maks 30 */ ],
  equipped: { weapon: null, helm: null, armor: null, ring: null }, // id item
  records: { bestTime: 0, runs: 0, kills: 0, bossKills: 0 },
}

// Item
{
  id: 'it_k3f9x2',               // unik dalam slot
  slot: 'weapon',                // weapon | helm | armor | ring
  classId: 'warrior',            // hanya senjata; selain itu null
  variant: 1,                    // indeks varian tampilan
  rarity: 2,                     // 0..3
  itemLevel: 12,
  base: { atk: 24 },
  bonuses: [ { stat: 'atkSpd', value: 0.08 }, { stat: 'maxHp', value: 15 } ],
}

// settings (versi 2; v1 tanpa autoAttack dimigrasi otomatis dengan autoAttack: false)
{ version: 2, muted: false, lastSlot: 0, autoAttack: false }
```

### 9.3 Aturan

- **Auto-save:** setelah layar Hasil, setiap transaksi Toko, pasang/lepas gear, buat/hapus karakter.
- **Validasi saat memuat:** bila data rusak atau tidak dikenal, slot ditampilkan "Data rusak" dengan pilihan Ekspor (untuk diselamatkan) atau Hapus. Data rusak **tidak pernah** ditimpa otomatis.
- **Migrasi versi:** fungsi `migrate(data)` menaikkan versi lama selangkah demi selangkah; versi lebih baru dari yang dikenal game → perlakukan sebagai rusak (jangan ditimpa).
- **Ekspor:** unduh file `critter-quest-<nama>.json` (satu slot). **Impor:** unggah file → validasi → pilih slot tujuan → konfirmasi bila menimpa.
- **IndexedDB tidak tersedia** (mode privat tertentu, diblokir): game tetap jalan dengan penyimpanan di memori + spanduk peringatan "Progres tidak akan tersimpan".
- Meminta `navigator.storage.persist()` saat karakter pertama dibuat (bila didukung).
- Rekor lama prototipe (`localStorage: cs-best`, `cs-muted`) tidak dimigrasi; `cs-muted` dibaca sekali sebagai nilai awal `settings.muted`.

## 10. Struktur Kode

> Tambahan §13.6: `town/`, `data/town.js`, `data/dungeon.js`, `meta/shop.js`, `run/dungeon.js`, `render/town.js`, `render/light.js`, `ui/npc.js`, `ui/charpanel.js`; `ui/camp.js` dihapus.

```
app/src/
  main.js              # bootstrap: buat layanan, pasang layar, mulai loop
  core/
    loop.js            # fixed-timestep 60 Hz
    input.js           # keyboard, mouse (bidik), sentuh (joystick + tombol)
    audio.js           # dipertahankan dari prototipe
    rng.js             # mulberry32 yang bisa di-seed (instans, bukan global)
  data/
    classes.js  enemies.js  items.js  shop.js  balance.js   # semua angka
  run/                 # simulasi satu ronde — tidak tahu soal save/DOM
    run.js             # state ronde, step(dt), hasil ronde
    player.js  skills.js  enemies.js  pickups.js  hits.js
  meta/                # progres permanen — tanpa DOM
    save.js            # wrapper IndexedDB + fallback memori
    schema.js          # validasi + migrate()
    character.js       # buat karakter, hitung stat akhir, EXP/level
    itemgen.js         # pembuatan item & rarity
    shop.js            # harga & transaksi
  art/
    sprites.js         # sprite musuh/pickup/ikon (dari prototipe)
    doll.js            # kerangka paper doll + lapisan + cache
  render/
    world.js           # gambar arena, entitas, efek
  ui/
    screens.js         # pengatur layar (tampil/sembunyi)
    title.js  slots.js  create.js  camp.js  gear.js  shopui.js  hud.js  results.js  touch.js
```

**Batas modul:** `run/` dan `meta/` adalah logika murni (bisa dites tanpa browser). `ui/` dan `render/` hanya membaca state dan memanggil fungsi publik. `run.js` menerima stat akhir dari `character.js` dan mengembalikan **hasil ronde** (`{ time, kills, exp, gold, items[], bossKills }`) yang lalu diterapkan ke save oleh `meta/`.

## 11. Pengujian

| Jenis | Alat | Cakupan |
|---|---|---|
| Unit | **Vitest** | `itemgen` (rarity sesuai tabel pada sampel besar ber-seed, jumlah bonus, tanpa duplikat), `schema` (validasi, migrasi, data rusak), `character` (stat akhir, EXP/level), `shop` (harga, uang tidak cukup, batas tingkat), `hits` (sekali-kena per instans, tik area) |
| IndexedDB | Vitest + **fake-indexeddb** | simpan/muat/hapus slot, fallback memori |
| Asap (smoke) di browser | Playwright (instalasi yang sudah ada di mesin) | buat karakter → main ronde singkat → hasil tersimpan → muat ulang halaman → progres masih ada; klik kartu level-up; kontrol sentuh tampil di viewport HP |
| Manual | Uji main | Rasa tiap kelas, keseimbangan |

## 12. Urutan Pembangunan

| Langkah | Isi | Bisa diuji |
|---|---|---|
| 0 | `git init` + `CLAUDE.md` di folder PKS | — |
| 1 | Rapikan struktur folder sesuai §10 tanpa mengubah perilaku; pasang Vitest | Game lama masih jalan, tes kosong hijau |
| 2 | Save (IndexedDB) + Pilih Slot + Buat Karakter + Kemah kerangka | Karakter tersimpan setelah muat ulang |
| 3 | 4 kelas + serangan manual + skill + dodge + kontrol sentuh; sistem hit baru | Main ronde dengan tiap kelas di PC & HP |
| 4 | **(diubah, §13)** 4A Kota + tema gelap + Inn + Toko Ramuan + panel Karakter + save v2; 4B Dungeon 5 lantai, portal, koin, HP & potion terbawa, hukuman mati, Hasil Perjalanan | Siklus kota ↔ dungeon lengkap |
| 5 | Item, rarity, drop, elite, inventori, paper doll gear + Toko Gear (beli/jual/peti) | Gear didapat, dipasang, terlihat, tersimpan |
| 6 | Pelatih (upgrade permanen), Tukang Cukur, ekspor/impor, polesan, penyeimbangan | Siap dibagikan |

## 13. Kota & Dungeon (perubahan 2026-10-26)

Atas permintaan pemilik: masuk game langsung ke **kota** yang bisa dijelajahi, dengan NPC penjual, Inn untuk memulihkan darah, dan gerbang ke **dungeon**. Tema **gelap** (dark fantasy kartun).

### 13.1 Alur

```
Judul ─► Pilih Slot ─► [Buat Karakter] ─► KOTA ⇄ DUNGEON (Lantai 1 → … → 5 BOS)
                                            ▲         │ portal tiap lantai: Turun / Pulang
                                            └─ Hasil Perjalanan ◄─ pulang / mati / menyerah
```
Kemah dihapus. Stat & rekor dilihat di **panel Karakter** (tombol C / ikon di kota).

### 13.2 Kota

- Peta tetap ± 900 × 700 unit, dibatasi tembok; bangunan dan tembok tidak bisa ditembus (tabrakan kotak).
- Malam berkabut: lapisan gelap di atas dunia, terang hanya di sekitar lentera, obor, api unggun, jendela, dan pemain (cahaya jingga hangat). Jalan batu bulat, rumah kayu beratap curam.
- Karakter berjalan dengan kontrol yang sama dengan dungeon (WASD/joystick); tidak ada pertarungan, tombol serang/skill disembunyikan.
- **Interaksi:** NPC dalam radius 48 → gelembung "E Bicara"; di HP muncul tombol **Bicara**. Aksi terbuka di jendela panel.

| NPC | Aksi |
|---|---|
| Penginapan | Tidur: HP penuh seketika, biaya `10 + 2 × level` koin |
| Toko Ramuan | Beli potion (pulih 40% HP maks), 25 koin, maks 5 dibawa |
| Toko Gear | Belum buka sampai langkah 5 (dialog saja) |
| Penjaga gerbang | Masuk dungeon (mulai Lantai 1) |

- Di kota HP pulih 1% HP maks per detik (agar tidak pernah buntu tanpa uang).
- Potion diminum dengan **R** / tombol potion, di kota maupun dungeon; jeda minum 1 detik.
- NPC digambar dengan paper doll yang sama (warna baju/rambut sendiri) + ikon peran di atas kepala.
- Muncul di kota: di depan gerbang setelah dungeon, di alun-alun saat memuat slot. Posisi tidak disimpan.

### 13.3 Dungeon "Ruang Bawah Tanah Bayangan"

- 5 lantai; tiap lantai satu ruangan batu bundar (radius ± 560) berdinding, obor dinding & jamur bercahaya; musuh masuk dari 4 lorong di tepi.
- Komposisi gelombang per lantai di `data/dungeon.js` (awal: L1 3 gelombang lendir; L2 3 lendir+kelelawar; L3 4 +golem; L4 4 campuran padat; L5 bos Raja Maw + pengawal). HP musuh × (1 + 0,25 × (lantai − 1)).
- Lantai selesai bila semua gelombang sudah muncul dan musuh habis → dua portal di tengah: **biru = turun**, **emas = pulang**. Setelah bos lantai 5 hanya portal emas + spanduk "Dungeon tamat!".
- Koin: 30% musuh biasa jatuhkan 1–3, bos 100; bonus `10 × lantai` tiap lantai selesai.
- Kartu berkah level-up dan EXP ronde berlaku selama satu perjalanan (lintas lantai).
- Gelombang berikut dimulai setelah gelombang sekarang muncul semua dan musuh tersisa ≤ 2 (jeda 1,5 detik). Pemain mulai di tengah ruangan.
- Portal aktif setelah 1 detik **dan** setelah pemain keluar dari lingkarannya (tidak menyedot pemain yang kebetulan berdiri di tengah). Permata & koin yang tersisa ikut terpungut saat masuk portal.
- `records.bestFloor` = lantai terdalam yang dicapai (termasuk bila mati di lantai itu).

### 13.4 Akhir perjalanan

| Cara | Akibat |
|---|---|
| Pulang lewat portal | Semua hadiah dibawa; HP disimpan apa adanya (dibatasi HP maks karakter) |
| Mati | EXP tetap; koin perjalanan × 0,5 (dibulatkan ke bawah); tiap gear perjalanan 50% hilang (langkah 5); bangun di kota dengan HP 10% |
| Menyerah (menu jeda) | Sama dengan mati |

Setelahnya layar **Hasil Perjalanan** (lantai terdalam, kill, EXP, koin, yang hilang), lalu kota. Karakter disimpan saat masuk gerbang dan saat perjalanan berakhir; menutup browser di tengah dungeon = kembali ke keadaan saat masuk (tanpa hadiah, tanpa hukuman).

### 13.5 Save versi 2

Slot naik ke `version: 2`; `migrate()` v1 → v2:
- tambah `hp: null` (null = penuh) dan `potions: 0`;
- `upgrades` menjadi `{ hp, atk, magnet }` (`potion` dihapus);
- `records` menjadi `{ bestFloor: 0, clears: 0, trips: runs, kills, bossKills }` (`bestTime` dibuang).

`hp` disimpan sebagai bilangan bulat ≥ 0 atau `null`; saat dimuat dibatasi ke HP maks karakter. Settings tetap versi 2 (§9.2).

### 13.6 Struktur kode & pengujian

| Modul | Isi | Tes |
|---|---|---|
| `data/town.js` | peta, tembok, bangunan, NPC, lampu, titik muncul | — |
| `data/dungeon.js` | lantai & gelombang, ruangan, portal, koin, bonus, hukuman, harga Inn/potion, regen kota | — |
| `town/town.js` | gerak + tabrakan kotak, NPC terdekat, regen HP — tanpa DOM | Vitest |
| `meta/shop.js` | `innRest`, `buyPotion` (uang kurang, stok maks) | Vitest |
| `meta/character.js` | `currentHp`, `applyTrip` (pulang / mati: koin × 0,5, HP 10%, rekor) | Vitest |
| `meta/schema.js` | v2 + migrasi v1 → v2 | Vitest |
| `run/dungeon.js` | lantai, gelombang, portal, akhir perjalanan | Vitest |
| `render/light.js`, `render/town.js` | lapisan gelap + cahaya, gambar kota | screenshot |
| `ui/npc.js`, `ui/charpanel.js` | jendela NPC, panel Karakter | smoke Playwright |

Dikerjakan dalam dua bagian, masing-masing dicek manual oleh pemilik: **4A** kota (gerbang sementara menuju arena lama), **4B** dungeon berlantai.

## 14. Poin Stat & Gear Diperluas (perubahan 2026-10-27)

Atas permintaan pemilik: kartu berkah level-up dihapus, naik level memberi **poin stat** yang dibagi sendiri; gear dibuat **banyak** dengan **6 rarity** dan **6 slot**. Bagian ini mengalahkan §4.1, §4.3, §5.5, §6 bila bertentangan.

### 14.1 Level & poin stat

- Level ronde & kartu berkah (§5.5) **dihapus**. Permata EXP langsung menambah EXP **karakter**, juga di tengah dungeon; naik level di dungeon → spanduk "Naik level!" tanpa menghentikan permainan.
- Tiap naik level: **+3 poin**. Poin tersedia = `3 × (level − 1) − poin terpakai` (tidak disimpan terpisah).
- Poin dibagi di panel Karakter (tombol C / ikon; di dungeon membuka panel sambil menjeda). Tombol [+] menandai, lalu **Simpan** / **Batal**. Pembagian permanen (atur ulang menyusul di langkah 6).
- Di dungeon, poin dari level yang baru didapat bisa langsung dipakai dan stat ronde ikut berubah; disimpan ke save bersama hasil perjalanan (juga bila mati).

| Atribut | Per poin |
|---|---|
| STR | atk +1 |
| VIT | maxHp +8, def +0,25 |
| AGI | atkSpd +0,015, moveSpd +0,8 |
| DEX | crit +0,5%, cdr +0,4% |
| LUK | critDmg +0,02, magnet +2, peluang rarity lebih tinggi (langkah 5B) |

Stat akhir = dasar kelas + pertumbuhan level + atribut + gear (+ upgrade Pelatih, langkah 6).

### 14.2 Gear

**Slot (6):** Senjata (khusus kelas, atk), Helm (maxHp), Armor (def + maxHp), Sepatu (moveSpd), Kalung (crit), Cincin (hanya bonus, minimal Bagus). Helm, armor, sepatu, senjata terlihat di paper doll.

**Rarity (6):**

| Rarity | Warna | Bonus acak | Pengali dasar | Lain |
|---|---|---|---|---|
| 0 Biasa | `#e8e8e8` | 0 | ×1,00 | |
| 1 Bagus | `#6ee7a0` | 1 | ×1,00 | |
| 2 Langka | `#6ec9ff` | 2 | ×1,08 | |
| 3 Epik | `#c26bd8` | 3 | ×1,18 | kilau |
| 4 Legendaris | `#ffb547` | 3 | ×1,30 | + 1 efek khusus, nama unik |
| 5 Mitos | `#ff4d6d` | 4 | ×1,45 | + 1 efek khusus, hanya dari bos lantai 5 / peti mahal |

**Ditetapkan di langkah 5B** (`data/items.js`):
- **Varian:** 7 tingkat per slot (level item 1/5/10/16/23/31/40), senjata 7 per kelas → 63 model; nama = varian + akhiran bonus pertama (Ganas, Kokoh, Baja, Kilat, Tajam, Maut, Angin, Bijak, Pemikat).
- **Bonus acak** (tanpa duplikat): atk, maxHp, def, atkSpd, crit, critDmg, moveSpd, cdr, magnet; nilai 70–100% dari maksimum yang tumbuh dengan level item.
- **Item unik:** 13 Legendaris + 7 Mitos dengan nama & efek khusus (menghisap darah, duri, petir berantai, eksekusi, perisai, regenerasi, koin/EXP +, dodge cepat, amuk, damage bos, ledakan, bangkit sekali). Drop Legendaris/Mitos selalu salah satu item unik yang cocok dengan kelas. Efek aktif di langkah 5C.
- **Level item** = level karakter − 1 + lantai ± 1, maks level karakter + 4.
- **Sumber & bobot rarity** (Biasa…Mitos): musuh biasa 1,5% drop `60/27/10/2,4/0,6/0`; elite selalu 1 `36/34/20/7,5/2,5/0`; peti tiap lantai bersih 1 `44/32/16/6/2/0`; bos 2 item `0/0/55/32/11/2`. LUK: bobot Langka ke atas × (1 + 0,01 × LUK).
- **Elite:** peluang 3–7% per musuh (naik per lantai), HP ×4, damage ×1,4, ukuran ×1,35, EXP ×5, 10 koin, aura emas.
- Gear di tanah: sinar & cahaya warna rarity; dipungut seperti permata. Mati → tiap gear 50% hilang. Tas maks **60**; bila penuh, sisanya ditinggal (disebut di Hasil Perjalanan).
- Item save mendapat field opsional `unique` (id item unik atau `null`).

**Ditetapkan di langkah 5C:**
- Tab **Gear** di panel Karakter: 6 slot terpasang, tas (urut rarity lalu level), kartu detail (stat dasar, bonus, efek ★, perbandingan "Bila dipakai" hijau/merah), tombol Pasang / Lepas / Buang (konfirmasi). Di dungeon hanya bisa dilihat ("Ganti gear di kota").
- Gear menambah stat akhir; memasang/melepas tidak memulihkan HP (hanya dibatasi HP maks).
- Efek unik di dungeon (`FX` di `data/dungeon.js`): eksekusi < 30% HP; petir berantai ke musuh terdekat (jangkauan 140, 80% ATK); perisai tiap 10 detik; amuk < 50% HP; ledakan radius 46; duri = penyerang terkena {v}% ATK; menghisap darah, regenerasi, koin/EXP +, jeda dodge −, damage bos & elite +; Cincin Phoenix bangkit sekali per perjalanan (kebal 2 detik).
- Paper doll: senjata per kelas (pedang/busur/tongkat/belati), helm (menyembunyikan rambut; tanduk, jambul, mahkota per tingkat), armor, sepatu — warna bahan per tingkat (kayu → besi → baja → ksatria → runa → obsidian → naga), kilau warna rarity untuk Epik ke atas.

### 14.3 Save versi 3

`migrate()` v2 → v3: tambah `attrs: { str: 0, vit: 0, agi: 0, dex: 0, luk: 0 }`; `equipped` mendapat `boots: null, amulet: null`. Validasi: jumlah `attrs` ≤ `3 × (level − 1)`.

## 15. Rumah Bisa Dimasuki, Ramuan Beragam, Lanjut Dungeon (perubahan 2026-10-27)

Atas permintaan pemilik. Mengalahkan §13.2 bila bertentangan.

### 15.1 Rumah & warga

- Empat rumah bisa dimasuki dengan berjalan ke pintunya (keluar lewat celah pintu di dinding bawah, layar memudar singkat): **Penginapan**, **Toko Ramuan**, **Pandai Besi** (Toko Gear), **Balai Petualang** (menggantikan "Rumah"). Penjual berada **di dalam** rumah.
- Tampilan luar sesuai yang dijual: Penginapan (pot bunga, lentera), Toko Ramuan (kuali hijau menggelegak, tanaman obat tergantung), Pandai Besi (dinding batu, landasan tempa, percikan api), Balai Petualang (dua panji, lambang perisai); papan nama di atas pintu.
- Interior (`data/town.js` `INTERIORS`): lantai kayu/batu, dinding belakang, perabot padat (meja, konter, perapian, tungku, kuali, rak senjata, papan tugas, dsb.), cahaya hangat sesuai sumbernya.
- **Warga** (`role: 'talk'`): di kota (Dara, Kakek Odo, Pip, Prajurit Gani, Sela) dan di dalam rumah (tamu Penginapan, murid penyihir, murid pandai besi, para petualang di Balai). Tiap kali diajak bicara mengucapkan kalimat berikutnya dari daftar. Sebagian berjalan-jalan pelan di sekitar tempatnya.
- Posisi pemain tetap tidak disimpan; memuat slot selalu mulai di alun-alun.

### 15.2 Ramuan

| Ramuan | Efek | Harga |
|---|---|---|
| Merah | Pulih 40% HP | 25 |
| Besar | Pulih 80% HP | 60 |
| Perisai | Perisai menyerap damage sebesar 30% HP maks, 8 detik | 45 |
| Angin | Gerak +35%, jeda dodge −50%, 10 detik | 40 |
| Amuk | ATK +30%, kec. serang +20%, 10 detik | 50 |

- Maks 5 per jenis. **Sabuk 4 slot**: tombol 1–4 (R = slot 1) / tombol sabuk di HUD; isi sabuk diatur di Toko Ramuan (ketuk slot untuk ganti jenis). Jeda minum 1 detik bersama.
- Di kota hanya ramuan pulih yang bisa diminum. Buff aktif tampil sebagai chip di HUD dungeon; perisai tampil sebagai gelembung di sekitar pemain.
- **Save versi 4:** `potions` menjadi `{ red, big, shield, wind, rage }`, tambah `belt: [4 jenis | null]`; `migrate()` v3 → v4: ramuan lama menjadi Ramuan Merah, sabuk bawaan `red, big, shield, rage`.

### 15.3 Lanjut dungeon

Penjaga gerbang: tombol utama **"Lanjut ke Lantai X"** (X = lantai terdalam yang pernah dicapai, `records.bestFloor`), plus tombol untuk tiap lantai di atasnya. Perjalanan berjalan seperti biasa dari lantai itu.

## 16. Toko Gear & Panel Cheat (2026-10-27)

### 16.1 Pandai Besi (langkah 5D)
- **Peti Gear:** `30 + 10 × level` koin, 1 gear selevel karakter, bobot rarity peti (`44/32/16/6/2/0`).
- **Peti Agung:** `150 + 40 × level` koin, 1 gear selevel karakter, bobot `0/0/50/35/12/3` (bisa Mitos). LUK tetap berlaku. Peluang ditampilkan di kartu peti.
- **Jual:** ketuk gear untuk memilih (bisa banyak), atau "Pilih semua Biasa" / "Pilih ≤ Bagus"; harga `5 × level item × (1 + rarity)`. Gear yang sedang dipakai tidak bisa dijual.
- Tas penuh → peti ditolak.

### 16.2 Panel cheat (khusus pengujian)
Aktif hanya di `npm run dev` atau bila alamat diberi `?cheat`; dibuka dengan tombol CHEAT atau tombol <kbd>`</kbd>. Di kota: koin, level, ramuan penuh, HP penuh, reset poin, buka lantai 1–5, gear per rarity & slot, semua item unik kelas, kosongkan tas. Di dungeon: kebal, bunuh semua, bersihkan lantai, +EXP, lompat lantai, jatuhkan gear. Perubahan karakter disimpan seperti biasa.

## 17. Pelatih & Tukang Cukur (langkah 6A, 2026-10-27)

- **Pelatih — Guru Hadi** (Balai Petualang, di samping boneka latihan). Angka di `data/shop.js`:

| Latihan | Efek per tingkat | Maks | Harga tingkat berikut |
|---|---|---|---|
| Daya Tahan | HP maks +6% | 10 | `50 × 1,5^tingkat` |
| Tempur | ATK +5% | 10 | `60 × 1,5^tingkat` |
| Kepekaan | Magnet +20 | 5 | `40 × 1,6^tingkat` |
| Atur Ulang Poin | semua poin atribut kembali (konfirmasi) | — | `100 + 20 × level` |

  Persen dihitung dari total stat (kelas + level + atribut + gear). Upgrade/atur ulang tidak memulihkan HP.
- **Tukang Cukur — Bang Rudi**: kios beratap belang di sudut barat daya kota. Pilih gaya & warna rambut dengan pratinjau; 50 koin per potongan; gaya yang sama ditolak.

## 18. Monster Baru, Skill Berenergi, Dungeon Bertema, Siang–Malam (perubahan 2026-10-27)

Atas permintaan pemilik. Dikerjakan sebagai langkah 7 (ekspor/impor & polesan langkah 6 ditunda).

### 18.1 Monster (langkah 7A)
| Monster | Perilaku | Cara melawan |
|---|---|---|
| Penembak (Katak Ludah) | Menjaga jarak, berhenti sebentar (bersinar) lalu meludahkan proyektil | Dodge / bergerak menyamping |
| Penyerbu (Babi Batu) | Mendekat, berhenti dengan garis merah peringatan, lalu menyeruduk lurus cepat | Keluar dari garis |
| Pemanggil (Dukun Tengkorak) | Menjaga jarak, memanggil 3 anak buah tiap beberapa detik (maks 6) | Prioritaskan |
| Penyembuh (Peri Lumut) | Menjaga jarak, memulihkan musuh di sekitarnya | Prioritaskan |
| Peledak (Jamur Bom) | Berlari cepat; dekat pemain → lingkaran merah lalu meledak; mati → meledak juga | Menjauh dari lingkaran |
| Berperisai (Kura Baja) | Perisai menghadap pemain, berputar pelan; serangan dasar dari depan −85% | Serang dari samping/belakang, atau pakai skill (menembus perisai) |

- Proyektil musuh & area bahaya ditandai merah sebelum mengenai; dodge (kebal) menghindari semuanya.
- **Raja Maw** punya pola serangan acak tiap beberapa detik: cincin proyektil, spiral, hentakan berantai di posisi pemain, serudukan, panggil anak buah; di bawah 50% HP lebih cepat dan lebih rapat.
- Angka semua monster di `data/enemies.js`.

### 18.2 Skill berenergi (langkah 7B)
Serangan dasar yang kena mengisi **energi** (maks 100, mulai 50 tiap perjalanan, pulih 3/detik); Q/E memakai energi, cooldown pendek, dan jauh lebih kuat. Skill menembus perisai Kura Baja.

| Kelas | Energi / musuh kena | Q (biaya, cd) | E (biaya, cd) |
|---|---|---|---|
| Warrior | 7 | Putaran Pedang 35, 3 s — r 95, 5 tik × 220%, menarik musuh | Teriakan Baja 50, 8 s — damage diterima −60% 5 s + gelombang kejut 250% r 115 mendorong |
| Archer | 8 | Hujan Panah 40, 3 s — r 85, 6 tik × 160% | Tembakan Tembus 35, 2,5 s — 600%, menembus |
| Mage | 9 | Nova Es 45, 4 s — r 125, 300%, beku 2,2 s, mendorong | Petir Berantai 35, 2,5 s — 8 lompatan × 350% |
| Assassin | 4 | Langkah Bayangan 30, 2 s — 180 px, 500% | Kipas Belati 40, 3 s — 11 belati × 180% |

### 18.3 Dungeon bertema (langkah 7C)
Empat dungeon terbuka berurutan — dungeon berikutnya terbuka setelah yang sebelumnya tamat. Angka di `data/dungeons.js`:

| Dungeon | HP musuh | Damage | EXP & koin | Level gear | Bos | Tema |
|---|---|---|---|---|---|---|
| Ruang Bawah Tanah Bayangan | ×1 | ×1 | ×1 | +0 | Raja Maw | obor & jamur bercahaya |
| Gua Kristal | ×2,2 | ×1,5 | ×2 | +8 | Golem Kristal (cincin kristal rapat, hentakan, seruduk, panggil Kura Baja) | kristal biru |
| Hutan Jamur Busuk | ×4 | ×2,1 | ×3,5 | +16 | Ratu Spora (spiral spora, panggil Jamur Bom) | jamur raksasa hijau/ungu |
| Benteng Lava | ×7 | ×2,9 | ×5 | +26 | Raja Lava (hentakan api beruntun, cincin & spiral api) | retakan lava & anglo |

- **Bentuk ruangan** diacak tiap lantai (`run/room.js`): bundar, aula berpilar, salib, dua ruang bersambung (dengan pilar), gua tak beraturan. Lantai 1 dungeon pertama selalu bundar. Lorong masuk musuh dicari otomatis di tepi; tengah selalu kosong untuk portal.
- **Gerbang:** kartu dungeon (terbuka / terkunci + syaratnya), lalu "Lanjut ke Lantai X" atau lantai lain.
- **Save versi 5:** `records` menjadi `{ trips, kills, bossKills, dungeons: { shadow|crystal|fungus|lava: { bestFloor, clears } } }`; `migrate()` v4 → v5 memindahkan rekor lama ke dungeon pertama.

### 18.4 Siang–malam (langkah 7D)
- 1 hari dalam game = 8 menit nyata (3 menit game per detik). Jam berjalan saat berjalan di kota dan saat bertarung di dungeon; berhenti di menu, dialog, dan jeda.
- Bagian hari: **Pagi** 05:00, **Siang** 10:00, **Sore** 15:00, **Malam** 18:00. HUD kota & dungeon: "Hari 3 · 18:40 · Sore".
- Kota: lapisan gelap & warnanya mengikuti jam (`data/time.js` `SKY`), cahaya matahari di siang hari, cahaya jingga saat fajar/senja, lentera/jendela/obor gerbang menyala hanya saat gelap, kabut hanya malam. Jendela di dalam rumah menampilkan langit siang atau bulan.
- Dungeon tetap gelap (bawah tanah) dengan suasana per tema.
- Tidur di Penginapan: waktu maju ke 07:00 berikutnya.
- **Save versi 6:** tambah `clock` (menit sejak Hari 1 00:00); karakter baru mulai 07:00; `migrate()` v5 → v6 mengisi 07:00.

## 19. Desain Ulang Dark Fantasy (langkah 8, 2026-10-27)

Atas permintaan pemilik ("terlalu ke anak-anakan"). Mengalahkan §8 untuk gaya gambar.

- **Gaya:** dark fantasy stylized — proporsi kepala ±1:3, mata almond kecil dengan alis, tanpa pipi merah, outline tipis gelap (`#16121c`), warna kalem, highlight logam & bayangan tegas.
- **8A Karakter & gear:** baju kelas berwarna redup dengan ciri (Warrior jubah panjang & tali dada; Archer jerkin bertali, tudung terlipat, tabung panah; Mage jubah panjang berkerah tinggi; Assassin sabuk silang, masker kain, syal). NPC memakai tubuh yang sama dengan warna baju sendiri.
- **Gear per varian** (`art/gear.js`): tiap tingkat punya siluet sendiri — mis. pedang kayu → besi → baja → ksatria (pelindung sayap emas) → runa (rune bercahaya) → obsidian (bergerigi, tepi ungu) → naga (bilah api melengkung); helm topi kulit → helm besi bertepi → bertanduk → helm ksatria berjambul → lingkar runa (rambut tetap terlihat) → obsidian berduri (celah mata bercahaya) → helm naga bersirip. Bentuk yang sama dipakai di badan, ikon tas/toko/hasil, dan gear di tanah; Epik ke atas berpendar warna rarity.
- **8B Aura** (`art/aura.js`): lingkaran rune di kaki tiap 10 level (emas di level 50); aura tubuh per efek item unik (sayap api Phoenix, kabut merah, duri, bara, daun, kilau koin/EXP, petir, angin, mata merah, perisai, amuk); gear Epik+ berpendar di badan; partikel untuk Legendaris/Mitos; ayunan & proyektil meninggalkan jejak warna rarity senjata. Di kota dan dungeon.
- **8C Monster:** semua monster & bos digambar ulang dengan mata sipit menyala, taring/tanduk/duri, warna gelap; outline bersama `#16121c`.
- **8D UI:** font Cinzel (judul, tombol) + Barlow (teks, angka di kanvas); palet arang–perunggu–emas, sudut 3–6 px, tombol berbingkai logam, panel berbingkai ganda, bar HP merah tua / energi biru / EXP emas.

## 20. Tempa, Material & Permata (langkah 9A, 2026-10-27)

Tujuan: setiap drop berguna dan ada alasan grinding jangka panjang. Angka di `data/forge.js`.

- **Material:** Debu Rune, Kristal Arkana, Inti Kegelapan. Didapat dari **mengurai** gear (Biasa 2 debu … Mitos 15 debu + 6 kristal + 3 inti; Epik+ 35% peluang permata Retak), **tiap lantai bersih** (3 debu × lantai), **elite** (50%: 1–3 debu), **bos** (3 kristal + 1 inti + 1 permata Retak acak). Mati: material separuh, tiap permata 50% hilang.
- **Tempa +0 … +15** (Pandai Brom): stat dasar × (1 + 0,1 × tingkat). Biaya langkah +p: koin `10 × level item × (p+1)`, debu `2 + 2p`, kristal `p − 4` (mulai +5), inti 1 (mulai +10). Peluang berhasil 100% sampai +5, lalu 90 / 80 / 70 / 60 / 50 / 40 / 35 / 30 / 25 / 20%. Gagal di bawah +10: tetap; dari +10: turun 1. Nama item diberi awalan "+N".
- **Asah ulang:** satu baris bonus diganti stat lain (yang belum ada di item) dengan nilai acak baru; 2 kristal + `5 × level item` koin.
- **Permata** (Tukang Permata Sari, di Pandai Besi): Rubi (ATK), Zamrud (HP maks), Berlian (DEF), Topas (Kritis), Kecubung (Dmg kritis), Safir (CDR); tingkat Retak / Biasa / Jernih / Sempurna / Agung. Soket: Langka 1, Epik 1, Legendaris 2, Mitos 2. Pasang gratis; lepas 30 koin (permata kembali); gabung 3 → 1 tingkat lebih tinggi seharga `40 × tingkat`. Mengurai gear mengembalikan permata di soketnya.
- **Save versi 7:** `mats { dust, crystal, core }`, `gems { jenis: [jumlah per tingkat 1–5] }`; item mendapat `plus` (0–15) dan `sockets` (panjang sesuai rarity, isi `null` atau `{ gem, tier }`). `migrate()` v6 → v7 mengisi nol / soket kosong.

## 21. Pool Skill & Bakat (langkah 9B, 2026-10-27)

- **Skill:** tiap kelas punya 6 skill (`data/classes.js`); dua bawaan terbuka di LV 1, lalu LV 5 / 10 / 15 / 20. Dua skill dipasang di Q & E (tab **Skill** di panel Karakter, hanya di kota; memilih skill yang sudah di tombol lain = tukar).
  - Warrior: Putaran Pedang, Teriakan Baja, Hantaman Bumi (area di titik bidik, 450%, beku sesaat), Terjang (dash 220, 320%), Lempar Kapak (tembus, 300%), Amarah Perang (ATK +35%, kec. serang +30%).
  - Archer: Hujan Panah, Tembakan Tembus, Panah Beruntun (5 × 200%), Lompatan Mundur (lompat menjauh + ledakan es), Ladang Jebakan (8 × 90%, 4 dtk), Mata Elang (kritis +30%, kec. serang +25%).
  - Mage: Nova Es, Petir Berantai, Meteor (600% area besar), Teleportasi (230 px), Bola Api Raksasa (400% meledak luas), Perisai Mana (damage diterima −55%, ATK +20%).
  - Assassin: Langkah Bayangan, Kipas Belati, Kabut Racun (8 × 90%), Bom Asap (beku 1,2 dtk + damage diterima −40%), Shuriken (3 × 300%, tembus 2), Naluri Pembunuh (kritis +40%, dmg kritis +60%).
  - Semua serangan dari skill (termasuk ledakannya) tidak mengisi energi, menembus perisai, dan mendapat bonus "damage skill".
- **Bakat** (`data/talents.js`): 1 poin tiap 2 level; 8 bakat × maks 5 tingkat — Kekuatan (ATK +3%), Ketahanan (HP +4%), Ketajaman (kritis +1,5%), Fokus Sihir (damage skill +8%), Aliran Energi (energi +10%), Kegesitan (jeda dodge −6%), Dahaga Darah (hisap 0,6%), Keberuntungan (koin & EXP +5%). Efek perjalanan dijumlah dengan efek item unik. Atur ulang bakat di Pelatih: `80 + 15 × level` koin.
- **Save versi 8:** `skills: [Q, E]` (id skill kelas), `talents: { id: tingkat }`; `migrate()` v7 → v8 memasang dua skill bawaan, bakat nol.

## 22. Empat Slot Skill, Ultimate & Tombol Baru (2026-10-27)

Atas permintaan pemilik: skill maksimal 4 terpasang + 1 ultimate; teks game tetap bahasa Indonesia (rencana terjemahan dibatalkan).

- **Tombol (PC):** gerak WASD, serang klik kiri, **skill 1–4**, **ultimate 5**, dodge Spasi, **ramuan Z X C V**, bicara **E**, panel Karakter **I**, auto F, menu Esc. HP: joystick + 4 tombol skill, tombol ultimate (cincin emas terisi), dodge, serang.
- **Skill:** dari pool 6 skill kelas (§21) pasang maksimal 4 di slot 1–4 (tab Skill: tombol 1–4 per skill, "×" untuk melepas; minimal 1 skill terpasang). Slot kosong tidak berbuat apa-apa.
- **Ultimate** (satu per kelas, terbuka LV 25, `ult` di `data/classes.js`): tanpa energi & cooldown, memakai **bar ultimate** sendiri (0–100, `ULT` di `data/balance.js`): +3 per kill, +10 elite, +25 bos, +40 per 100% HP maks yang hilang; mulai 0 tiap perjalanan; penuh → tombol 5 menyala.
  - Warrior **Badai Pedang**: 2,5 dtk berputar, 10 × 300% radius 150, menarik musuh, damage diterima −50%.
  - Archer **Hujan Bintang**: 3 dtk di titik bidik, 12 × 250% radius 200, memperlambat.
  - Mage **Hujan Meteor**: 2,4 dtk di titik bidik, 6 × 600% radius 220, mendorong.
  - Assassin **Tarian Seribu Bayangan**: kebal 2 dtk, 12 × 260% radius 130 di sekeliling.
- **Save versi 9:** `skills` menjadi 4 slot (`null` = kosong); `migrate()` v8 → v9 menambah dua slot kosong.

## 23. Dua Bahasa: Inggris & Indonesia (2026-10-27)

- Game tampil dalam **bahasa Inggris (bawaan)** atau **bahasa Indonesia**. Tombol **EN · ID** ada di layar judul dan menu jeda; memilih bahasa menyimpan pengaturan lalu memuat ulang halaman.
- **Teks sumber tetap bahasa Indonesia di kode.** Bahasa Inggris diambil dari kamus `src/i18n/` yang memakai teks Indonesia sebagai kunci:
  - `en-ui.js` untuk `ui/*` dan `index.html`;
  - `en-game.js` untuk pesan `main.js`, `run/`, `render/` dan `meta/`;
  - `data-en.js` (`localizeData()`) mengganti nama dan deskripsi di `data/` ke bahasa Inggris saat game dimulai.
- **Cara menulis teks baru:**
  - teks biasa memakai `tr('…')`;
  - teks berisi angka memakai `t('… {n} …', { n })`;
  - angka desimal memakai `num()`, yang menampilkan koma di bahasa Indonesia dan titik di bahasa Inggris;
  - di HTML pakai atribut `data-tr`, `data-tr-title` atau `data-tr-label`;
  - lalu tambahkan terjemahannya ke kamus yang sesuai.
- Satu teks Indonesia hanya bisa punya satu terjemahan. Jika artinya harus berbeda, pakai kata Indonesia yang berbeda; misalnya tab soket di Tukang Permata berlabel "Soket", bukan "Pasang".
- Di bahasa Inggris, akhiran bonus di nama item ditaruh di depan (misalnya "Swift Iron Sword").
- Modul `i18n` bawaannya bahasa Indonesia, sehingga tes Vitest tetap memakai teks Indonesia. Tes `data-en.test.js` memeriksa bahwa semua data punya terjemahan.
- **Pengaturan versi 3:** menambah `lang` (`'en'` | `'id'`). `migrate()` v2 → v3 mengisi `'en'`. Save karakter tidak berubah.

## 24. Papan Tugas, Lencana & Koleksi (langkah 9C, 2026-10-27)

Tujuan: target jangka pendek di setiap perjalanan dan bonus permanen kecil untuk grinding jangka panjang. Angka ada di `data/bounties.js` dan `data/collection.js`.

- **Papan Tugas** (Kapten Vera di Balai Petualang): selalu ada **3 tugas**. Progres dihitung dari setiap perjalanan, termasuk perjalanan yang berakhir mati atau menyerah. Jenis tugas:
  - **Buru**: kalahkan N musuh jenis tertentu yang muncul di dungeon yang sudah terbuka.
  - **Elite**: kalahkan N musuh elite.
  - **Bos**: kalahkan bos dungeon tertentu.
  - **Lantai**: bersihkan N lantai di dungeon tertentu.
  - **Koin**: kumpulkan N koin di dungeon.
- **Hadiah tugas:** koin dan EXP (bertambah dengan level), Debu Rune, dan **Lencana**. Tugas yang selesai diklaim di papan, lalu langsung diganti tugas baru. Tugas boleh diganti dengan biaya `15 × level` koin.
- **Toko Lencana** di tempat yang sama:
  - Peti Lencana: 1 gear **Epik** seharga 12 Lencana;
  - 5 Kristal Arkana seharga 4 Lencana;
  - 1 Inti Kegelapan seharga 5 Lencana;
  - 1 permata acak tingkat Biasa seharga 6 Lencana;
  - 20 Debu Rune seharga 2 Lencana.
- **Koleksi** (tab baru di panel Karakter):
  - **Bestiari**: jumlah kill per jenis musuh. Tonggak 25 / 100 / 300 / 1000 kill (bos: 1 / 5 / 15 / 40) masing-masing memberi bonus stat permanen yang khas untuk jenis musuh itu, misalnya Lendir menambah HP maks dan Kura Baja menambah DEF.
  - **Kodeks Unik**: setiap item Legendaris atau Mitos yang pernah ditemukan tercatat. Tiap item memberi Koin & EXP +1% di dungeon.
- **Save versi 10:**
  - `bounties` (3 tugas: `{ kind, target, need, have }`);
  - `marks` (Lencana);
  - `records.bestiary` (kill per jenis musuh);
  - `records.uniques` (id unik yang ditemukan).
  - `migrate()` v9 → v10 mengisi 3 tugas awal, nol Lencana, bestiari kosong, dan kodeks dari item unik yang ada di tas.

## 25. Dunia Terbuka: Wilayah, Kota Besar & Pedagang (langkah 9D, 2026-10-27)

Keputusan pemilik (2026-10-27):
- **Perjalanan:** wilayah tersambung. Gerbang kota mengarah ke peta wilayah biome, dan di ujung wilayah ada kota besar.
- **Urutan wilayah bebas.** Setiap wilayah punya **rentang level tetap**:
  - Hutan Kelam LV 1–15;
  - Padang Es LV 10–25;
  - Gurun Merah LV 20–35;
  - Gunung Api LV 30–50.
- **Musuh:** varian biome dari perilaku yang ada, ditambah 1–2 musuh khas per biome, ditambah 1 mini bos penjaga harta per wilayah.
- **Pedagang:** etalase gear yang terlihat (stok baru tiap pagi di jam game) ditambah peti. Kota di wilayah sulit punya etalase lebih banyak, rarity lebih tinggi, dan harga lebih mahal. Kota besar juga punya:
  - toko gear khusus: Pandai Senjata, Penjahit Zirah, Toko Perhiasan;
  - pedagang keliling malam;
  - Gudang;
  - pedagang bahan & permata.
- **Tumbang di wilayah:** bangun di kota terakhir yang dikunjungi, kehilangan 10% koin; barang aman. Dungeon tetap memakai aturan §13.4.
- **Peta wilayah:** bagian yang belum dilewati gelap (kabut), dengan peta mini di HUD.

### 25.1 Dunia & perjalanan (9D-1)
- `data/world.js`: daftar wilayah (biome, rentang level, ukuran, jalan, rintangan, titik masuk/keluar, daftar musuh). Bentuk peta tetap, tidak acak.
- **Hutan Kelam** berukuran 4000 × 2400 dan memuat:
  - jalan setapak berkelok dari barat (kota awal) ke timur (Kota Rimbawana);
  - rumpun pohon dan batu sebagai rintangan;
  - sungai dengan jembatan;
  - reruntuhan.
- **Mode wilayah** (`run/field.js`):
  - Memakai mesin pertarungan dungeon: skill, ultimate, ramuan, dodge, energi, siang–malam.
  - Musuh muncul berkelompok 3–6 di luar layar dekat pemain, maksimal 25 sekaligus. Musuh yang tertinggal jauh dihapus.
  - Kekuatan musuh naik dari level bawah ke level atas rentang, dari barat ke timur. Jalan setapak lebih jarang didatangi kelompok musuh, dan malam hari kelompoknya lebih banyak.
- **Drop dan EXP** langsung disimpan ke karakter:
  - setiap 60 detik;
  - saat keluar wilayah;
  - saat tumbang (dikurangi 10% koin).
- **Peta:**
  - Tombol M membuka peta layar penuh; peta mini ada di HUD.
  - Kabut berupa kisi petak 100 × 100 dan terbuka dalam radius 300 di sekitar pemain.
- **Gerbang kota awal** menawarkan dua pilihan: Dungeon (seperti sebelumnya) atau Wilayah (dengan rentang level; wilayah yang belum dibuat bertanda "Segera").
- **Save versi 11:**
  - `location` (kota terakhir);
  - `towns` (kota yang sudah dikunjungi);
  - `regions { id: { fog } }`, dengan fog berupa string base64 bit per petak.

### 25.2 Kota besar & pedagang (9D-2)
Keputusan pemilik (2026-10-28): **keempat kota besar dibuat sekaligus**, Gudang **per karakter** (bisa dibuka di kota besar mana pun), teleport lewat **batu teleport berbayar**.

- **Kota besar** (`data/towns.js`), satu di ujung timur tiap wilayah. Tingkat barang naik dari kota ke kota (`TOWNS[].tier`):

  | Kota | Wilayah | Tingkat |
  |---|---|---|
  | Rimbawana | Hutan Kelam | 1 |
  | Bekubara | Padang Es | 2 |
  | Pasirluas | Gurun Merah | 3 |
  | Baraapi | Gunung Api | 4 |

- **Tata letak:** setiap kota besar punya denah dan gaya bangunan sendiri (permintaan pemilik 2026-10-28: tidak boleh satu cetakan). Semuanya memuat 9 bangunan: Penginapan, Toko Ramuan, Pandai Besi, Balai Petualang, Pandai Senjata, Penjahit Zirah, Toko Perhiasan, Gudang, Pedagang Bahan. Selain itu ada rumah warga, batu teleport, Tukang Cukur, dan 5 warga.

  | Kota | Ukuran | Bentuk |
  |---|---|---|
  | Rimbawana | 1900 × 1500 | Desa cincin pondok kayu di sekitar pohon raksasa berlentera, pagar kayu runcing, sumur, kebun |
  | Bekubara | 1400 × 1700 | Benteng tinggi: dua kolom balai batu bersalju di kiri-kanan jalan tengah, kolam beku, patung, menara di sudut, citadel di puncak |
  | Pasirluas | 2400 × 1150 | Kota bazar lebar: rumah bata lumpur beratap datar, oasis di tengah, deretan lapak pasar menuju gerbang |
  | Baraapi | 1900 × 1500 | Kota tempa terbelah kanal lava dengan tiga jembatan batu, landasan tempa raksasa, rumah basalt, api unggun di alun-alun selatan |

- **Tema per kota:** warna tanah dan pola lantai, gaya tembok, pepohonan di luar tembok, kabut malam, dan partikel melayang (daun, salju, pasir, bara).
- **Perjalanan:**
  - Tepi timur wilayah membawa ke kota tujuannya; tepi barat membawa ke kota asalnya.
  - Gerbang kota besar membawa ke wilayahnya, masuk dari timur.
  - Kota yang dimasuki dicatat di `towns` dan menjadi `location`; tumbang di wilayah atau di dungeon membuatmu bangun di `location`.
- **Batu teleport** ada di alun-alun setiap kota, termasuk Kota Awal:
  - hanya ke kota yang sudah pernah dikunjungi;
  - biaya `15 + 25 × tingkat` kota tujuan (`TELEPORT` di `data/world.js`).
- **Pedagang** (9D-2b; semua angka di `data/market.js`, logika di `meta/market.js`):
  - **Hari pasar** berganti pukul 05:00 jam game. Stok dibuat dari `world.seed` + kota + toko + hari, jadi sama sepanjang hari dan tidak disimpan. Yang disimpan hanya barang yang sudah dibeli: `shops["kota:toko"] = { day, sold }`.
  - **Etalase gear:** Pandai Senjata (senjata kelasmu), Penjahit Zirah (helm, armor, sepatu), Toko Perhiasan (kalung, cincin). Tiap barang hanya satu.

    | Tingkat | Barang per toko (senjata / zirah / perhiasan) | Rarity (Bagus … Mitos) | Rentang LV barang | Harga |
    |---|---|---|---|---|
    | 1 Rimbawana | 4 / 6 / 4 | 30 · 45 · 20 · 5 · 0 | 3–18 | harga jual × 5 |
    | 2 Bekubara | 5 / 7 / 5 | 10 · 45 · 35 · 9 · 1 | 10–28 | × 5,5 |
    | 3 Pasirluas | 5 / 8 / 5 | 0 · 35 · 45 · 17 · 3 | 20–38 | × 6 |
    | 4 Baraapi | 6 / 9 / 6 | 0 · 20 · 45 · 28 · 7 | 30–50 | × 6,5 |

    LV barang = level pemain (dibatasi rentang kota) + 0–2. Legendaris/Mitos selalu item unik yang cocok slot & kelas (bila tak ada, turun ke Epik). Peti tetap dijual di Pandai Besi.
  - **Pedagang malam (Garo)** muncul dengan gerobaknya di alun-alun kota besar pukul 18:00–05:00: 3–4 gear Langka ke atas dari slot apa pun (harga × 8–9) dan 2–3 permata tingkat 1–4 (× 1,5 harga permata).
  - **Pedagang bahan & permata:** debu, kristal, inti, dan permata dengan stok harian terbatas yang bertambah di kota sulit; harga +10% per tingkat kota di atas 1. Permata: tingkat 1 (Rimbawana), 1–2 (Bekubara, Pasirluas), 2–3 (Baraapi).
- **Gudang** per karakter (9D-2c), maks 120 barang.
- **Save versi 13:** `shops` (pembelian hari ini per toko) dan `stash` (isi Gudang). `migrate()` v12 → v13 mengisi keduanya kosong.

### 25.3 Harta karun & mini bos (9D-3)
(Portal bos lama digantikan gerbang dungeon di dunia, §25.5.) Semua angka di `TREASURE` (`data/world.js`).
- **Letak:** 4 peti per wilayah di tempat tetap (sama untuk semua karakter, dari seed wilayah), tersebar barat → timur, 420–900 dari jalan, tidak tertutup benda padat. Peti ke-4 (paling timur) milik **Penguasa** wilayah.
- **Penjaga:** dalam radius 520 dari peti muncul mini bos bermahkota — musuh khas wilayah (bukan penyembuh/pemanggil/bom) yang diperbesar: HP ×14, damage ×1,5, ukuran ×1,8, dengan 3 pengawal. Penguasa: HP ×26, damage ×1,7, ukuran ×2,1, 5 pengawal, mahkota berbatu merah. Kekuatan ikut level wilayah di titik peti. Penjaga tidak hilang walau ditinggal jauh.
- **Peti** dirantai selama penjaga hidup; setelah penjaga tumbang, sentuh peti untuk membukanya:
  - koin `60 + 14 × level` (Penguasa ×2,5);
  - bahan (debu & kristal; Penguasa kristal & inti);
  - 1 permata tingkat `1 + level/15` (Penguasa +1);
  - gear bobot Peti Agung: 1 buah (Penguasa 2).
- Peti yang dibuka tercatat per karakter dan tidak muncul lagi. Peti tampil di peta (ikon peti; terbuka = redup) setelah tempatnya terbuka dari kabut.
- **Save versi 14:** `treasures { regionId: [indeks peti terbuka] }`; `migrate()` v13 → v14 mengisinya kosong.
- Cheat wilayah: "Ke harta".

### 25.4 Musuh biome & Makam Pasir (9D-4)
(Ketiga wilayah dan kota besar lainnya sudah dibuat di 9D-1b dan 9D-2.)
- **Musuh khas** (perilaku baru atau gabungan, angka di `data/enemies.js`):

  | Wilayah | Musuh khas | Perilaku |
  |---|---|---|
  | Hutan Kelam | Serigala Bayang | terjangan pendek dan sering |
  | Padang Es | Yeti | terjangan berat, memperlambat |
  | Padang Es | Roh Es | 3 tembakan menyebar, memperlambat |
  | Gurun Merah | Kalajengking | terjangan, meracuni |
  | Gurun Merah | Cacing Pasir | menyelam (tak bisa dipukul) mendekati pemain, lingkaran bahaya, menyembur keluar, lalu menyelam lagi |
  | Gunung Api | Imp Api | bola api, membakar |
  | Gunung Api | Salamander | terjangan yang meninggalkan semburan api, membakar |

- **Varian biome** (`kin` = musuh asal; bestiari menghitung ke musuh asal):
  - Padang Es: Lendir Beku, Katak Salju, Golem Es (memperlambat);
  - Gurun Merah: Lendir Pasir (cepat), Burung Nasar;
  - Gunung Api: Lendir Magma (membakar), Jamur Bara (ledakan lebih besar, membakar).
- **Efek pada pemain** (`onHit`): lambat `[−k kecepatan, detik]`; racun/api `[k × damage pukulan per detik, detik]`. Racun dan api tetap melukai walau pemain sedang kebal sesaat setelah dipukul.
- **Bestiari** bertambah 7 musuh khas. **Save versi 15:** `migrate()` v14 → v15 menambah entri bestiari bernilai 0.
- **Makam Pasir** (9D-4b): dungeon kelima, di Gurun Merah (gerbang di pita 25–70% lebar wilayah, diacak per karakter seperti gerbang lain).
  - Tingkat kesulitan di antara Hutan Jamur dan Benteng Lava: HP ×5,5, damage ×2,5, hadiah ×4,2, level item +21.
  - Musuhnya Kalajengking, Cacing Pasir, Lendir Pasir, Burung Nasar, dan musuh lama.
  - **Bos Raja Mumi:** spiral & cincin pasir, hantaman bertubi, terjangan, memanggil kalajengking.
  - **Ekspedisi** LV 20–32.
  - Tampilan makam: lantai batu pasir berdebu pasir, pilar berukir, sarkofagus, guci, obor hangat.
  - **Save versi 16:** `migrate()` v15 → v16 menambah rekor `tomb` dan entri bestiari `tombboss`.

### 25.5 Dunia besar & gerbang dungeon di dunia (9D-1b, permintaan 2026-10-27)
- **Ukuran wilayah:** 20000 × 12000 (sekitar 3 menit melintas). **Keempat wilayah dibuat sekarang**, yaitu Hutan Kelam, Padang Es, Gurun Merah, dan Gunung Api. Semuanya berangkat dari gerbang kota awal, dengan kota tujuan di ujung timur yang masih ditutup sampai 9D-2.
- **Tata letak** dibuat dari seed tetap per wilayah:
  - jalan utama berkelok dari barat ke timur, dengan 4–6 cabang;
  - 2 sungai dengan jembatan di setiap persilangan jalan, dan beberapa danau (di Gunung Api berupa kolam lava);
  - rumpun pohon dan batu khas biome;
  - reruntuhan.
  
  Musuh dasar sementara memakai jenis yang sudah ada, dengan campuran berbeda per biome; varian biome menyusul di 9D-4.
- **Gerbang dungeon tidak lagi di kota.** Penjaga Rolan hanya mengantar ke wilayah.
  - Letak gerbang diacak **per karakter** (`world.seed` di save), di pita level yang sesuai dan tidak jauh dari jalan atau cabangnya.
  - Pembagian dungeon: Bayangan dan Hutan Jamur di Hutan Kelam, Gua Kristal di Padang Es, Benteng Lava di Gunung Api. Gurun Merah mendapat Makam Pasir di 9D-4.
- **Menemukan gerbang:** gerbang tercatat begitu masuk radius pandang, lalu tampil di peta. Dekati gerbang dan tekan E untuk memilih lantai.
  - Pulang lewat portal emas: kembali ke wilayah di depan gerbang.
  - Tumbang di dungeon: bangun di kota (aturan §13.4).
- **Ekspedisi** (tab di Papan Tugas):
  - Satu ekspedisi aktif per dungeon pilihan, dengan rentang level yang disarankan: "bersihkan N lantai".
  - Gerbangnya ditandai di peta walau masih berkabut, dan panah di layar menunjuk ke arahnya.
  - Hadiah berupa koin, EXP, dan Lencana; diklaim di papan.
- **Peta:** kabut dengan petak 150 dan radius 350. Peta mini menampilkan jendela sekitar pemain, sedangkan peta penuh menampilkan seluruh wilayah.
- **Save versi 12:**
  - `world { seed }`;
  - `found` (dungeon yang gerbangnya ditemukan);
  - `expedition` (`null` atau `{ dungeon, need, have }`).
  - `migrate()` v11 → v12 membuat seed dari `createdAt`, menganggap dungeon yang pernah dimasuki sudah ditemukan, dan mengosongkan kabut lama karena petanya berubah.

## 26. Petualangan: Quest Utama & Side Quest (langkah 9F, 2026-10-28)

Keputusan pemilik (2026-10-28):
- **Quest utama** menuntun ke semua kota dan kelima dungeon. Setelah 5 bos dikalahkan, **wilayah baru kecil** terbuka menuju **dungeon akhir** dengan bos akhir 3 fase dan epilog.
- **Rumah/orang tersembunyi** di wilayah, **letak tetap untuk semua karakter**: 4 per wilayah (16).
- **Side quest** dari penghuni tersembunyi, warga kota, dan penjaga toko: **32 quest** (16 tersembunyi + 16 di kota). Jenis: buru, antar/kumpul, cari tempat/orang, rantai cerita.

### 26.1 Cerita
Dahulu sebuah gerhana hendak menelan dunia. Para tetua menyegelnya dan memecah segelnya menjadi **5 Pecahan Segel**, lalu menitipkan tiap pecahan di tempat yang dalam. Kini makhluk-makhluk di sana (kelima bos dungeon) terbangun dan memakan kekuatan pecahan itu. Bila kelimanya terkumpul, retakan di timur Baraapi terbuka ke **Tanah Gerhana**, tempat **Menara Gerhana** berdiri.

### 26.2 Mesin quest
- Data di `data/quests.js`, logika murni di `meta/quests.js` (tes Vitest).
- **Langkah** (`step.kind`):
  - `talk` (bicara dengan NPC: `{ town, npc }` atau penghuni tersembunyi `{ hidden }`);
  - `town` (masuk kota);
  - `gate` (menemukan gerbang dungeon);
  - `boss` (bos dungeon dikalahkan; dihitung dari rekor `clears`);
  - `kill` (`{ enemy, n, region? }`; varian dihitung ke musuh asal lewat `kin`);
  - `elite` (`{ n, region?, enemy? }`);
  - `guard` (`{ region, lord? }`, mini bos penjaga harta atau Penguasa);
  - `reach` (`{ region, at: [fx, fy] }`, titik tetap; tercapai dalam radius 160);
  - `give` (serahkan bahan, permata, ramuan, atau gear dengan syarat slot/rarity minimum; gear dipilih sendiri dari tas, gear yang dipakai tidak bisa);
  - `drop` (`{ item, n, enemy, region, chance }`, barang quest yang hanya jatuh selama quest aktif; disimpan sebagai angka progres, bukan di tas).
- Progres dihitung dari hasil perjalanan dungeon (`applyTrip`) dan bagian wilayah (`applyField`). Wilayah juga melaporkan titik `reach` yang tercapai dan barang `drop` yang jatuh.
- Langkah yang sudah terpenuhi saat dimulai langsung selesai (kota sudah dikunjungi, gerbang sudah ditemukan, bos sudah pernah dikalahkan). Save lama otomatis maju sejauh progresnya.
- Side quest aktif maksimal **6**; quest utama tidak dihitung. Side quest bisa dibatalkan di jurnal (progres hilang).
- **Hadiah** (`reward`): koin, EXP, Lencana, bahan, permata `{gem?, tier}`, ramuan, gear `{rarity, slot?}` (LV = level pemain), atau unik quest. Hadiah gear masuk Gudang bila tas penuh.
- **Unik quest:** 4 item unik baru (`quest: true`) yang hanya didapat dari rantai cerita, dan 1 dari bab akhir. Tercatat di Kodeks dan memakai jenis efek unik yang sudah ada.
- **Save versi 17:** `quests { main: { ch, step, prog }, side: { id: { step, prog } }, done: [id] }`. `migrate()` v16 → v17 memulai bab 1 lalu memajukannya sesuai progres yang sudah ada.

### 26.3 Antarmuka
- **Jurnal** (tombol J / tombol HUD, juga tab di panel Karakter): quest utama di atas, lalu side quest aktif dengan langkah, progres, pemberi, dan hadiah. Satu quest bisa **dilacak**; quest utama dilacak bila tidak ada pilihan lain.
- **Tanda di atas kepala NPC:** `!` emas = quest bisa diambil, `?` emas = siap dilapor, `…` abu = sedang berjalan.
- **Dialog NPC** menampilkan cerita quest dengan tombol Terima / Lapor / Serahkan, di atas menu tokonya.
- **Penanda tujuan** di peta penuh dan peta mini untuk quest yang dilacak: titik untuk `reach`/penghuni/kota, **lingkaran petunjuk** (radius 1500, pusat digeser acak tetap) untuk gerbang yang belum ditemukan. Di wilayah, panah tepi layar menunjuk ke tujuan, seperti panah ekspedisi.
- Tulisan pengumuman singkat saat langkah selesai ("Pecahan Segel 2/5").

### 26.4 Quest utama (9F-1)

| Bab | Judul | Langkah | Hadiah |
|---|---|---|---|
| 1 | Bayangan di Bawah Tanah | bicara Kakek Odo → temukan gerbang Bayangan (Hutan Kelam) → kalahkan Raja Maw → lapor Kakek Odo | Pecahan 1, gear Langka |
| 2 | Kota di Akar Tua | capai Rimbawana → bicara Kapten Selasih → temukan Gua Kristal (Padang Es) → kalahkan bosnya → capai Bekubara → lapor Kapten Ingrid | Pecahan 2, gear Epik |
| 3 | Busuk di Timur Hutan | bicara Nenek Akar (Rimbawana) → temukan Hutan Jamur → kalahkan bosnya → lapor Nenek Akar | Pecahan 3, gear Epik, permata tk 2 |
| 4 | Makam di Bawah Pasir | capai Pasirluas → bicara Zahra → temukan Makam Pasir → kalahkan Raja Mumi → lapor Zahra | Pecahan 4, gear Epik, permata tk 3 |
| 5 | Api yang Tak Padam | capai Baraapi → bicara Ignis → temukan Benteng Lava → kalahkan bosnya → lapor Ignis | Pecahan 5, gear Legendaris |
| 6 | Gerhana | bicara Kakek Odo → masuk Tanah Gerhana (gerbang Baraapi) → temukan Menara Gerhana → kalahkan Sang Gerhana → epilog | unik quest "Mahkota Fajar" (kalung, semua kelas) |

Urutan dungeon sama dengan urutan buka dungeon (§18.3). Rentang level wilayah tetap jadi panduan; tidak ada kunci level.

### 26.5 Rumah & orang tersembunyi (9F-2)
- 4 per wilayah, letak tetap `[fx, fy]` di `data/quests.js`, dirancang manual di luar jalan dan tidak di atas benda padat (dites). Pondok bergaya biome dengan penghuninya di depan pintu; satu tempat per wilayah berupa orang tanpa rumah (tersesat, terjebak).
- Tertutup kabut; tampil di peta (ikon rumah, `!`/`?`) setelah tempatnya terbuka. Dekati dan tekan E untuk bicara. Musuh tidak muncul dalam radius 400 dari rumah.

| Wilayah | Penghuni | Quest | Jenis |
|---|---|---|---|
| Hutan Kelam | Pak Gaharu, pemburu tua | kalahkan 30 Serigala Bayang | buru |
| Hutan Kelam | Nenek Kunyit, peramu | kumpulkan 5 Jamur Bercahaya (jatuh dari Jamur Bom di Hutan Kelam) | kumpul |
| Hutan Kelam | Resi Sunyi, pertapa reruntuhan | **rantai:** baca 3 batu tulis → kalahkan Penguasa Hutan Kelam → serahkan 1 Inti Kegelapan + 1 gear Epik → unik "Kalung Akar Tua" | rantai |
| Hutan Kelam | Lio, anak tersesat di tepi sungai | antar Lio pulang: bicara dengan Melati di Rimbawana | cari orang |
| Padang Es | Bjorn, pemburu yeti | kalahkan 6 Yeti | buru |
| Padang Es | Frida, penyihir menara es | serahkan 10 Kristal Arkana + 2 Safir tk 1 | antar |
| Padang Es | Nenek Salju, pengamat bintang | **rantai:** temukan 3 bintang jatuh → kalahkan 4 Roh Es elite → kalahkan Penguasa Padang Es → unik "Cincin Bintang Beku" | rantai |
| Padang Es | Gustav, kurir terjebak salju | antar surat ke Astrid di Bekubara | cari orang |
| Gurun Merah | Hasan, pengembara | kalahkan 40 Kalajengking | buru |
| Gurun Merah | Layla, penjaga oase | kumpulkan 8 Sisik Cacing (dari Cacing Pasir) | kumpul |
| Gurun Merah | Amun, penjaga makam tua | **rantai:** temukan 3 tugu → kalahkan 2 mini bos penjaga Gurun Merah → serahkan 3 permata tk 2 → unik "Topeng Pasir Abadi" (helm) | rantai |
| Gurun Merah | Zaid, kurir kehausan | serahkan 3 ramuan HP | antar |
| Gunung Api | Grom, pandai buangan | serahkan 2 gear Epik | antar |
| Gunung Api | Agni, pendeta api | kalahkan 50 Imp Api | buru |
| Gunung Api | Penjaga Kawah | **rantai:** padamkan 3 api abadi → kalahkan 4 Salamander elite → kalahkan Penguasa Gunung Api → unik "Zirah Sisik Kawah" (armor) | rantai |
| Gunung Api | Bara, penambang terjebak | sampaikan kabar ke Ignis di Baraapi | cari orang |

### 26.6 Side quest kota (9F-3)

| Kota | Pemberi | Quest | Jenis |
|---|---|---|---|
| Kota Awal | Bu Marta (Penginapan) | antar sup ke Nenek Kunyit di Hutan Kelam | cari orang |
| Kota Awal | Nenek Mira (Ramuan) | kumpulkan 6 Lendir Kental (dari Lendir di Hutan Kelam) | kumpul |
| Kota Awal | Pandai Brom | serahkan 1 gear Langka + 40 Debu Rune | antar |
| Kota Awal | Pip | temukan Kerang Bercahaya di tepi danau Hutan Kelam | cari tempat |
| Rimbawana | Tole | kalahkan 15 Jamur Bom di Hutan Kelam | buru |
| Rimbawana | Nenek Akar (Ramuan) | kumpulkan 5 Bunga Kunang (jatuh dari musuh Hutan Kelam pada malam hari) | kumpul |
| Rimbawana | Pandai Kayan (Senjata) | kalahkan 10 elite di Hutan Kelam | buru |
| Bekubara | Arne | kalahkan 25 Katak Salju | buru |
| Bekubara | Bu Hangat (Penginapan) | antar sup ke Bjorn di Padang Es | cari orang |
| Bekubara | Ibu Bulu (Zirah) | serahkan 2 zirah (helm/armor/sepatu) Langka | antar |
| Pasirluas | Omar | temukan unta Omar di Gurun Merah | cari tempat |
| Pasirluas | Nona Mirage (Perhiasan) | serahkan 3 permata tk 2 | antar |
| Pasirluas | Yusuf (Bahan) | kalahkan 30 Cacing Pasir | buru |
| Baraapi | Puntung | kumpulkan 10 Bara Abadi (dari Lendir Magma) | kumpul |
| Baraapi | Pandai Gora (Senjata) | kalahkan Penguasa Gunung Api | buru |
| Baraapi | Sela Api (Bahan) | serahkan 5 Inti Kegelapan | antar |

Hadiah side quest disesuaikan tingkat wilayah/kota: koin & EXP (rumus seperti Papan Tugas, ×3), Lencana 2–6, dan satu hadiah khas (gear Langka–Epik, permata, bahan, atau ramuan). Angka di `data/quests.js`.

### 26.7 Tanah Gerhana & Menara Gerhana (9F-4)
- **Tanah Gerhana:** wilayah kelima yang kecil (8000 × 5000), LV 45–50, terbuka setelah bab 6 dimulai. Masuk dari gerbang Baraapi; tepi barat kembali ke Baraapi, tepi timur tertutup. Tampilan: tanah ungu gelap, kristal hitam, batu melayang, langit gerhana. Musuh: varian gerhana dari musuh lama (lebih kuat, berkilau ungu) dan 1 musuh khas. Peti: 2 + Penguasa.
- **Menara Gerhana:** dungeon keenam, gerbang di titik tetap ujung timur. 5 lantai, kesulitan di atas Benteng Lava; ekspedisi LV 45–50.
- **Sang Gerhana**, bos akhir 3 fase:
  1. **Matahari Hitam:** cincin & spiral cahaya, sinar berputar.
  2. **Gerhana** (HP ≤ 66%): arena menggelap (cahaya hanya di sekitar pemain), bergantian memakai satu serangan khas tiap bos dungeon.
  3. **Kehampaan** (HP ≤ 33%): lebih cepat, lubang hitam yang menarik pemain, memanggil bayangan.
- **Epilog:** layar cerita singkat dan rangkuman (waktu bermain, kill, bos), lalu kembali ke Kota Awal. Game tetap berlanjut; Menara bisa diulang. Rekor `records.ending` (waktu tamat pertama).
- Save naik (v18) untuk rekor dungeon baru, bestiari musuh baru, dan `records.ending`.

### 26.8 Pembagian kerja
- **9F-1:** mesin quest, save v17, jurnal, tanda NPC, penanda peta/panah, quest utama bab 1–5 (bab 6 menunggu 9F-4).
- **9F-2:** 16 rumah/orang tersembunyi, side quest-nya, 4 rantai & unik quest, barang quest yang jatuh.
- **9F-3:** 16 side quest kota.
- **9F-4:** Tanah Gerhana, Menara Gerhana, Sang Gerhana, bab 6, epilog.
