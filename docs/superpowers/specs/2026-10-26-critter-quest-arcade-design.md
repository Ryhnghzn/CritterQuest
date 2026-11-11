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

- **Papan Tugas** (Kapten Vera di Balai Petualang): selalu ada **3 tugas**. Tugas harus **diambil** dulu (tombol Ambil, gratis); progres hanya dihitung untuk tugas yang sudah diambil, dari setiap perjalanan sesudahnya, termasuk yang berakhir mati atau menyerah. Tugas yang sudah diambil bisa dibatalkan (progresnya hilang) tetapi tidak bisa diganti (perubahan 2026-10-29, save v20). Jenis tugas:
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

> **Catatan 2026-11-11:** tata letak wilayah di bagian ini (empat peta terpisah 20000 × 12000 dari gerbang Kota Awal, keluar di tepi barat/timur) sudah **digantikan §40 Satu Dunia Tersambung**. Isi lain (rentang level, musuh biome, pedagang, harta & mini bos, gerbang dungeon per karakter, ekspedisi) tetap berlaku, ditempatkan di dunia lewat `zoneToWorld`.

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
- **Save versi 17:** `quests { main: { ch, step, prog }, side: { id: { step, prog } }, done: [id], track }`. `migrate()` v16 → v17 memulai bab 1 lalu memajukannya sesuai progres yang sudah ada.

### 26.3 Antarmuka
- **Jurnal:** tab **Quest** di panel Karakter (tombol J, atau tombol Karakter di HP). Isinya quest utama di atas, lalu side quest aktif dengan langkah, progres, dan hadiah. Satu quest bisa **dilacak**; quest utama dilacak bila tidak ada pilihan lain.
- **Pelacak quest** (permintaan pemilik 2026-10-28) di pojok kiri, di bawah HUD: judul quest yang dilacak dan langkahnya sekarang (dengan progres). Ketuk judulnya untuk mengecilkan menjadi nama quest saja; pilihan ini diingat per perangkat. Disembunyikan saat dialog/panel terbuka.
- Bangunan yang di dalamnya ada NPC bertanda juga mendapat tanda di atas pintunya.
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
| 6 | Gerhana | bicara Kakek Odo → masuk Tanah Gerhana (gerbang Baraapi) → temukan Menara Gerhana → kalahkan Sang Gerhana (epilog) → lapor Kakek Odo | unik quest "Mahkota Fajar" (helm Mitos, semua kelas, damage +70% ke bos & elite), 10 Lencana |

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

- **Rincian 9F-2:**
  - Letak rumah dan titik quest (`HIDDEN`, `SPOTS` di `data/quests.js`) dicari sekali dengan skrip, lalu ditulis tetap. Tes memastikan semuanya tidak di benda padat dan berjarak > 500 dari peti harta. Pondok padat (radius 58), dan kelompok musuh tidak muncul dalam radius 400.
  - Bicara dengan penghuni (E) menyimpan dulu hasil di wilayah. Bila quest selesai atau barang diserahkan, wilayah dimuat ulang di tempat yang sama agar level, ramuan, dan tas sesuai save.
  - **Titik "cari tempat"** (batu tulis, bintang jatuh, tugu makam, api abadi) tampil bercahaya di dunia selama langkahnya aktif. Berdiri dalam radius 160 menandainya; progres disimpan satu bit per titik.
  - **Barang quest** (Jamur Bercahaya 40% dari Jamur Bom di Hutan Kelam, Sisik Cacing 50% dari Cacing Pasir) hanya jatuh selama langkahnya aktif dan langsung dihitung, tidak masuk tas.
  - **Penjaga harta:** dihitung dari peti yang sudah dibuka di wilayah itu (peti terakhir = Penguasa), jadi peti yang dibuka sebelum quest diambil ikut dihitung.
  - **Serahkan:** gear dipilih otomatis, yaitu yang paling biasa dan memenuhi syarat, tidak pernah yang sedang dipakai. Daftar barang yang akan diserahkan tampil di dialog. Permata tanpa jenis diambil dari jenis yang paling banyak.
  - Penghuni yang ikut pergi (Lio, Gustav, Bara) hilang dari wilayah setelah quest-nya diterima.
  - **Unik quest** (Legendaris, tidak pernah jatuh, tidak dijual, tidak keluar dari peti): Kalung Akar Tua (pulih 1% HP/detik), Cincin Bintang Beku (perisai 12%), Topeng Pasir Abadi (hisap 2,5%), Zirah Sisik Kawah (duri 70%). LV-nya mengikuti level pemain saat diterima.
  - **Jurnal:** tombol **Lacak** (pelacak, panah, dan penanda peta mengikuti quest itu) dan **Batalkan** (progres hilang, quest bisa diambil lagi), hanya di kota.
  - Peta: rumah tampil (ikon rumah, `!`/`?`, nama) setelah tempatnya terbuka dari kabut.
  - Tidak ada perubahan struktur save; progres side quest memakai `quests.side` dari v17.

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

- **Rincian 9F-3:** Bunga Kunang jatuh 12% dari musuh apa pun di Hutan Kelam, hanya pada malam hari. Lendir Kental jatuh 30% dari Lendir; Bara Abadi 35% dari Lendir Magma. Katak Salju dihitung lewat jenis asalnya (Katak) di Padang Es saja. Bila satu NPC punya beberapa quest, yang sedang berjalan tampil lebih dulu, misalnya antar sup sebelum quest Nenek Kunyit sendiri.

Hadiah side quest disesuaikan tingkat wilayah/kota: koin & EXP (rumus seperti Papan Tugas, ×3), Lencana 2–6, dan satu hadiah khas (gear Langka–Epik, permata, bahan, atau ramuan). Angka di `data/quests.js`.

### 26.7 Tanah Gerhana & Menara Gerhana (9F-4)
- **Tanah Gerhana** (9F-4a): wilayah kelima yang kecil (8000 × 5000), LV 45–50.
  - Muncul di daftar gerbang Baraapi setelah kelima Pecahan Segel terkumpul (`unlock` di `data/world.js`). Tepi barat kembali ke Baraapi; tepi timur buntu ("Tidak ada jalan lagi ke timur").
  - Tampilan: tanah ungu kehitaman, menara kristal hitam, batu melayang, kolam hampa berbintang.
  - Musuh varian gerhana: Lendir Hampa (memperlambat), Kelelawar Gerhana, Katak Hampa (3 tembakan menyebar), dan Golem Gerhana (memperlambat).
  - Musuh khas **Hantu Gerhana**: menghilang (tak bisa dipukul), muncul 130–190 dari pemain, lalu menembak cincin 10 peluru.
  - Peti harta: 4, termasuk Penguasa, seperti wilayah lain.
  - **Save versi 18:** `migrate()` v17 → v18 menambah Hantu Gerhana ke bestiari.
- **Menara Gerhana** (9F-4b): dungeon keenam, terbuka setelah Benteng Lava tamat. Gerbangnya di pita 84–94% lebar Tanah Gerhana (diacak per karakter seperti gerbang lain). 5 lantai berisi musuh gerhana; HP ×8,5, damage ×3,4, hadiah ×6, LV item +32. Ekspedisi LV 45–50.
- **Sang Gerhana**, bos akhir 3 fase:
  1. **Matahari Hitam:** cincin & spiral cahaya, sinar (4 garis dari bos, 3 sapuan yang bergeser), terjangan.
  2. **Gerhana** (HP ≤ 66%): arena menggelap (cahaya hanya di sekitar pemain). "Gema": memakai cincin/spiral/hantaman salah satu dari lima bos dungeon dengan angka & warnanya, nama bos itu muncul di atas kepalanya.
  3. **Kehampaan** (HP ≤ 33%): lebih cepat (mengamuk), 2 lubang hitam yang menarik pemain lalu meledak, memanggil Hantu Gerhana.
  - HP 1500 (dasar). Pergantian fase: jeda sebentar, pengumuman nama fase, guncangan.
- **Epilog:** muncul sekali setelah Sang Gerhana pertama kali tumbang (setelah layar Hasil Perjalanan): tiga paragraf cerita dan rangkuman (pahlawan, level, hari, perjalanan, kill, bos), lalu kembali. Game tetap berlanjut; Menara bisa diulang. Rekor `records.ending` (waktu tamat pertama).
- **Save versi 19** (9F-4b): rekor dungeon Menara Gerhana, bos baru di bestiari, `records.ending`.

### 26.8 Pembagian kerja
- **9F-1:** mesin quest, save v17, jurnal, tanda NPC, penanda peta/panah, quest utama bab 1–5 (bab 6 menunggu 9F-4).
- **9F-2:** 16 rumah/orang tersembunyi, side quest-nya, 4 rantai & unik quest, barang quest yang jatuh.
- **9F-3:** 16 side quest kota.
- **9F-4:** Tanah Gerhana, Menara Gerhana, Sang Gerhana, bab 6, epilog.

## 28. Perbaikan Pengalaman Pemain (permintaan pemilik 2026-10-29)
- **Tugas papan wajib diambil** (§24): `bounties[i].taken`; hanya tugas yang diambil yang maju. **Save v20**: `migrate()` v19 → v20 menandai tugas yang sudah berprogres sebagai diambil, sisanya belum. Quest utama tetap otomatis aktif. Langkah quest yang memeriksa riwayat (gerbang, bos, kota, penjaga peti) tetap dihitung dari riwayat, karena penjaga peti hanya bisa dikalahkan sekali.
- **Pop-up hadiah meriah** saat quest, tugas papan, atau ekspedisi diklaim: judul emas, sinar berputar, konfeti, satu kartu per hadiah (gear dengan ikonnya, permata, Lencana, bahan, ramuan), koin & EXP menghitung naik, "Naik level!", fanfare. Ketuk / Enter / Esc menutup. Angka di `data/itemfx.js` (`REWARD_POP`).
- **Rincian hadiah quest** di jurnal dan dialog NPC: satu chip per hadiah dengan ikon dan angka pasti (koin & EXP sesuai level sekarang, rarity gear, nama permata, jumlah bahan). Dihitung oleh `rewardPreview()` di `meta/quests.js`, yang juga dipakai saat membayar.
- **Poin belum dibagi**: angka berdenyut di tombol Karakter (poin atribut + bakat) dan toast setiap kali jumlahnya naik (juga sekali saat karakter dimuat).
- **UI tidak "ter-reset"**: panel NPC dan panel Karakter digambar ulang di tempat; posisi scroll dipertahankan dan animasi masuk tidak diputar lagi (`keepView` di `ui/screens.js`). Ganti tab tetap mulai dari atas.
- **Dialog NPC besar menempel di bawah**: kiri potret besar, nama, ucapan, quest, pesan, Tutup; kanan isi toko/papan yang bisa di-scroll sendiri. Warga yang hanya bicara memakai satu kolom lebar. Di layar sempit (≤ 700 px) kedua kolom bertumpuk. **Potret dada ke atas (2026-11-11, gaya visual novel):** di atas ucapan, warga digambar besar dari depan (rambut sampai dada, 220 px; 190 px di HP landscape) dari sistem karakter anime + filter pixel (`art/bust.js` `npcBust`), latar pendar warna pakaiannya, nama & jabatan menumpang di bawah potret, masuk bergeser lalu bernapas pelan. Benda (batu teleport) dan `?lama` tetap potret kecil.
- **Tampilan 2.5D lebih tajam**: kamera mulai dari jauh (zoom 1.35, rentang 0.85–1.6), resolusi render sampai 2× (Ringan 1×), tekstur tanah, lantai dungeon, karakter, dan NPC beresolusi lebih tinggi + anisotropic filtering. Angka di `SHARP` (`render3d/stage.js`).

## 29. Halaman Masuk, Loading & Pengaturan (permintaan pemilik 2026-10-29)
Konsep dipilih pemilik dari `app/masuk.html`: **A. Api Unggun** + menu Pengaturan seperti di konsep.

- **Masalah:** saat game dibuka di HP, layar hitam dan tidak bisa disentuh beberapa detik. Penyebab: (1) bundel JS ±1,4 MB diunduh tanpa tampilan apa pun; (2) halaman judul menggambar kota 3D di belakang menu, jadi WebGL, kota, dan semua shader dibangun di frame pertama; (3) masuk kota/wilayah/dungeon membangun dunia 3D dalam satu frame.
- **Loader awal** di `index.html` (CSS murni, tampil sebelum JS): gerhana kecil berputar + "Memuat…". Hilang saat halaman judul siap.
- **Halaman judul tanpa 3D:** latar 2D sendiri (api unggun), jadi langsung bisa disentuh. Dunia 3D baru dibangun saat masuk game.
- **Layar loading** (`ui/loading.js`) setiap kali dunia 3D dibangun (masuk kota dari judul/slot, teleport, keluar ke wilayah, masuk dungeon): gerhana yang menutup sebagai progres, pahlawan (karakter yang dimainkan) berlari, langkah yang sedang dikerjakan, tips bergantian. Pembangunan dipecah per langkah (WebGL → adegan → bangunan/tanah → shader `compileAsync` → frame pertama), dengan jeda frame di antaranya agar layar tetap hidup.
- **Halaman judul A. Api Unggun:** malam di tepi hutan, empat kelas duduk mengelilingi api unggun (gambar asli game), bara naik, bulan, bintang. Logo "Critter Quest" + slogan. Menu kiri: kartu **Lanjutkan** (petualang terakhir: potret, nama, kelas, LV, lokasi; sekali ketuk langsung main), Pilih Petualang, Pengaturan, EN/ID. Enter = Lanjutkan. HP mendatar: menu tetap kiri, gambar diperkecil.
- **Menu Pengaturan** (dari halaman judul dan menu Jeda), tersimpan langsung. Pengaturan **versi 5** + `migrate()`:
  - Suara: `musicVol`, `sfxVol` (0–100), `muted`.
  - Grafis: `view` ('25d' | '2d'), `effects` ('auto' | 'full' | 'lite'; 'auto' = Penuh lalu turun ke Ringan saat FPS rendah, seperti sekarang), `sharp` ('save' | 'normal' | 'sharp'; mengatur `SHARP`), `showFps`.
  - Permainan: `autoAttack`, `shake` (guncangan layar), `dmgNumbers` (angka damage), `zoom` ('near' | 'mid' | 'far' = zoom awal kamera).
  - Bahasa: `lang` (masih memuat ulang halaman).
  - `migrate()` v4 → v5: `effects` 'full' → 'auto', volume 80/80, `view` '25d', `sharp` 'normal', `zoom` 'far', `shake`/`dmgNumbers` aktif, `showFps` mati.

- **Api unggun hidup (2026-11-11, permintaan pemilik):** keempat kelas tidak lagi potret yang berdiri menghadap pemain. Mereka duduk di batang kayu lukisan, menyamping menghadap api, masing-masing sibuk (Warrior mengasah pedang, Archer memeriksa busur, Mage menghangatkan tangan, Assassin memutar belati; pose `sit` di `art/hero/rig.js`), bernapas, digambar pixel seperti game dan diwarnai cahaya api (hangat di sisi api, bayangan ungu di sisi lain); gear polos tanpa cahaya rarity. Hero terakhir dimainkan duduk di depan kiri dengan rambutnya sendiri.

## 27. HP Hanya Landscape (permintaan pemilik 2026-10-28)
- Di HP (layar sentuh, lebar ≤ 900 px) game **hanya bisa dimainkan mendatar**. Dalam posisi tegak muncul kartu "Putar HP-mu ke posisi mendatar". Perjalanan yang sedang berlangsung dijeda saat HP diputar tegak. Di Android, sentuhan yang selesai (jari diangkat) mencoba layar penuh + kunci landscape; kalau ditolak, sentuhan berikutnya mencoba lagi sampai berhasil sekali. iPhone tidak punya layar penuh untuk halaman web, jadi di sana game mengikuti ukuran jendela browser.
- Di itch.io game berjalan dalam iframe seukuran embed, dan game tidak bisa mengubah ukuran iframe itu dari dalam. Supaya pas di HP, halaman itch memakai "Click to launch in fullscreen". Di layar sentuh joystick hanya mulai dari kanvas `#game`; sentuhan pada elemen lain dibiarkan menjadi `click`.
- Layar pendek (HP mendatar, tinggi ≤ 540 px): HUD, pelacak quest, tombol atas, tombol aksi, sabuk ramuan, joystick, dan isi panel diperkecil (CSS `zoom`). Peta mini lebih kecil.
- Kolom isian di layar pendek tetap berukuran teks minimal 16 px setelah `zoom`, karena iPhone memperbesar halaman untuk kolom yang lebih kecil. Saat keyboard ditutup, halaman dikembalikan ke posisi awal.
- Tampilan dunia di layar pendek memperlihatkan ±440 satuan pada sisi pendek (bukan 360), jadi musuh terlihat lebih awal.

## 30. Peta Kota (permintaan pemilik 2026-10-29)
Supaya pemain tahu ada quest dan toko apa saja di kota. Detail diserahkan ke Claude.

- **Peta mini** di pojok kanan atas saat di luar rumah (kanvas `#minimap` yang sama dengan wilayah), disembunyikan di dalam rumah. Ketuk/klik → peta penuh.
- **Peta penuh** (layar `fieldmap` yang sama dengan wilayah): tombol **M** di kota (sebelumnya M = bisukan; tombol suara tetap ada), Esc / M / Tutup menutup. Isi: tembok, rumah toko dengan ikon & nama, rumah warga polos, fitur kota (kolam, lava, jembatan, pohon besar, dll.), gerbang, orang di luar rumah (layanan berikon + nama, warga sebagai titik), pedagang malam hanya saat malam, tanda **!** / **?** di atas rumah (tanda terkuat penghuninya, `?` mengalahkan `!`) dan orang, posisi pemain (di dalam rumah: di depan pintunya, "Kamu (di dalam)").
- **Daftar di bawah peta:** "Quest di kota ini" (tanda, judul quest, pemberi · tempat; `?` dulu) lalu "Toko & layanan" (ikon, tempat, layanan · penjaga). Ketuk satu baris → tempatnya dilingkari di peta dan peta digulir ke layar.
- Kode: `town/townmap.js` (logika murni + tes: `townMapInfo`, `playerSpot`, `townLegend`), `data/townmap.js` (teks layanan & ikon, warna fitur), `render/townmap.js` (gambar), `ui/townmap.js` (daftar), `main.js` (`openTownMap`, `drawTownMinimap`). Save tidak berubah.

## 31. Kelas Lebih Hidup: Mekanik Khas & Pengaturan Skill (permintaan pemilik 2026-10-29)

Masalah: Warrior terasa datar, lambat membunuh, susah mengejar, dan cepat mati dibanding Mage. Semua musuh memberi damage sentuhan, jadi kelas jarak jauh bisa menghindarinya sepenuhnya, sedangkan Warrior harus menerimanya tanpa imbalan. Jawabannya: tiap kelas mendapat **satu mekanik khas** yang mengubah cara bermain, ditambah penyetelan angka. Mengatur skill juga dipermudah. Job lanjutan (konsep §5) dirancang terpisah nanti, di atas mekanik khas ini.

### 31.1 Aturan umum mekanik khas
- Satu bar/penghitung per kelas, hidup selama satu ekspedisi atau dungeon (mulai 0, tidak disimpan). **Save tidak berubah.**
- Tampil di HUD di bawah bar energi, warna per kelas: Murka merah, Panas jingga, Bidik hijau, Kombo ungu (5 belati kecil).
- Angka di `data/classes.js` (blok `trait` per kelas). Logika di `run/traits.js` (murni, tes Vitest), dipanggil dari `damageEnemy()`, `hurtPlayer()`, pemakaian skill, dan pembaruan per frame.
- Teks baru lewat `tr()`/`t()` + kamus EN.

### 31.2 Warrior: Murka (Rage), 0–100
- **Mengisi:** +3 per musuh yang kena serangan dasar; saat terkena damage +1,5 per 1% HP maks yang hilang (10% HP → +15).
- **Menyusut:** −12/detik setelah 3 detik tanpa memberi/menerima damage.
- **Naik bertahap 0 → 100:** jangkauan tebas 46 → 72 px, sudut 100° → 160°; serangan dasar menyedot HP 0 → 4% damage; damage diterima −0 → −20%.
- **Mengamuk:** otomatis saat Murka 100, 6 detik: kecepatan serang +40%, kebal efek lambat, tiap tebasan memancarkan gelombang kejut kecil yang mendorong; aura merah, getar layar kecil, teks "MENGAMUK!". Setelahnya Murka 0. Selama Mengamuk, Murka tidak mengisi.
- **Penyetelan:** kecepatan lari dasar 105 → 112; Terjang terbuka di LV 1 (sebelumnya LV 10); Terjang yang membunuh musuh memulihkan jedanya seketika.

### 31.3 Mage: Panas (Heat), 0–100
- **Mengisi:** tiap skill menambah biaya energinya × 0,6 (Meteor 55 → +33). Serangan dasar dan ultimate tidak.
- **Menyusut:** −15/detik.
- **Bonus:** damage skill +0 → +30% saat Panas naik ke 80 (tetap +30% di 80–99).
- **Kepanasan:** Panas mencapai 100 → semua skill terkunci 2,5 detik, Mage melambat 30%, Panas lalu 0. Ditandai asap & teks "Kepanasan!".
- **Penyetelan:** beku Nova Es 2,2 → 1,5 detik.

### 31.4 Archer: Bidik (Focus), 0–100
- **Mengisi:** +60/detik selama tidak bergerak (tidak ada input gerak) sambil menyerang.
- **Kosong:** bergerak atau menghindar → 0.
- **Bidik penuh:** panah dasar berikutnya pasti kritis, menembus 3 musuh, ukuran ×2; lalu Bidik 0. Ditandai lingkaran bidik yang mengecil di depan Archer.
- **Lompatan Mundur** langsung mengisi Bidik penuh.

### 31.5 Assassin: Kombo (Combo), 0–5 titik
- **Mengisi:** +1 titik tiap 3 tusukan dasar yang kena.
- **Hilang:** semua titik hilang setelah 4 detik tanpa menyerang.
- **Dipakai:** skill apa pun (bukan ultimate) menghabiskan semua titik; damage skill itu +25% per titik.
- **Eksekusi:** dengan 5 titik, musuh biasa (bukan bos/elite) yang terkena skill itu dan HP-nya di bawah 30% langsung mati.

### 31.6 Mengatur skill
- **Tab Skill baru:** baris atas 4 kartu slot (ikon, nama, nomor tombol; slot kosong menampilkan `+`) dan kartu Ultimate (5, hanya tampilan). Di bawahnya daftar pool skill; yang terpasang diberi lencana nomornya, yang terkunci menampilkan LV-nya.
- **Dua ketukan:** pilih slot lalu skill, atau skill lalu slot. Skill yang sudah ada di slot lain bertukar (`equipSkill()` yang ada). Pilihan disorot; ketuk lagi untuk batal. Kartu slot yang terisi punya tombol × untuk melepas (minimal satu skill tetap terpasang).
- **Kapan saja:** di kota, wilayah, dan dungeon (game berhenti selama panel terbuka). Skill yang baru dimasukkan ke slot mulai dengan jeda penuh. Simulasi yang sedang berjalan langsung memakai susunan baru. **Bakat tetap hanya di kota.**
- **Pasang otomatis:** saat naik level membuka skill baru dan masih ada slot kosong, skill itu masuk ke slot kosong pertama, dengan pesan "Skill baru: {nama} (tombol {n})".

### 31.7 Skill lebay: bentuk baru untuk 8 skill
Dua skill per kelas diganti bentuk geraknya (id, ikon, slot, biaya, dan jeda tetap; nama baru lewat kamus). Total damage disetel supaya kira-kira setara skill lamanya. Jenis gerak baru di simulasi (`run/skills.js`): `line` (ledakan berurutan sepanjang garis), `boomerang` (pergi lalu kembali ke pemain), `split` (proyektil pecah di tengah jalan), `storm` (sambaran tertunda satu per satu), `orbit` (mengelilingi pemain lalu dilempar). Efek visual memakai RNG efek sendiri (aturan Efek Lebay), angka di `data/classes.js` (gerak/damage) dan `data/skillfx.js` (visual).

| Kelas | id | Nama baru | Bentuk |
|---|---|---|---|
| Warrior | `quake` | Retakan Bumi | Retakan menjalar ke arah bidik; 5 pilar batu-api meletus berurutan (jeda 0,08 dtk) sepanjang 260 px, tiap pilar 120% + melempar & beku sesaat |
| Warrior | `axe` | Kapak Bumerang | Kapak besar berputar maju 360 px lalu kembali ke pemain; kena saat pergi dan pulang (2×200%), menyeret musuh searah |
| Archer | `pierce` | Panah Naga | Tahan 0,3 dtk, lalu naga cahaya meliuk menembus semua (600%), meninggalkan jejak terbakar 2 dtk (4×40%) |
| Archer | `volley` | Panah Pecah | 3 panah; setelah 160 px tiap panah pecah jadi 3 (9 total), masing-masing 120% |
| Mage | `chain` | Badai Petir | Awan gelap di atas pemain; 8 sambaran ke musuh berbeda satu per satu (jeda 0,1 dtk), masing-masing 350%, kilat layar tipis |
| Mage | `inferno` | Matahari Kecil | Bola api lambat (speed 200) membakar jalur (zona 1,5 dtk), meledak 300% lalu memecah 6 bola api kecil 120% |
| Assassin | `fan` | Lingkaran Belati | 11 belati melayang mengelilingi pemain 0,4 dtk, lalu melesat keluar berpola spiral, masing-masing 180% |
| Assassin | `shuriken` | Shuriken Raksasa | Satu shuriken besar mengorbit pemain 3 dtk (radius 70, kena tiap 0,25 dtk 80%), lalu dilempar ke titik bidik 300% |

### 31.8 Momen puncak mekanik khas
- **Mengamuk:** sosok Warrior membesar 15%, mata menyala, kedip merah di layar, tulisan besar "MENGAMUK!".
- **Panas:** di atas 80 tongkat Mage menyala jingga makin terang; saat Kepanasan jubah berasap.
- **Bidik penuh:** garis cahaya menembus layar searah tembakan + hit-stop singkat.
- **Eksekusi 5 Kombo:** layar sesaat hitam-putih, musuh terbelah tebasan merah.
- Semua ikut tingkat efek (Penuh/Ringan) dan "kurangi gerakan" di pengaturan.

## 32. Main Offline & Pasang di HP (permintaan pemilik 2026-10-29)

Game bisa dipasang ke layar HP (PWA) dan dimainkan tanpa internet setelah dibuka sekali.

- **Manifest** (`public/manifest.webmanifest`): nama Critter Quest, layar penuh, mendatar, warna latar `#0f0c12`. Ikon dibuat lewat kode (`pwa/icon.js`: gerhana emas dan pedang), dirender ke `public/icons/*.png` oleh `pwa/make-icons.mjs`.
- **Service worker** (`pwa/sw.js` → `dist/sw.js` saat build, lewat plugin di `vite.config.js`): saat dipasang, semua file build disimpan di HP; font Google ikut disimpan. Halaman apa pun (dengan `?cheat`/`?2d`) dilayani dari `index.html` simpanan. Hanya aktif di build, tidak di `npm run dev`.
- **Versi baru**: nama simpanan memakai sidik daftar file. Versi baru diunduh diam-diam saat online. Kalau terpasang saat game terbuka: di halaman judul langsung dimuat ulang, saat bermain muncul pesan "Versi baru terpasang. Muat ulang game untuk memakainya."
- **Main di HP tanpa hosting (Android + Chrome)**: di laptop `npm run phone` (build + server di port 4173 untuk jaringan rumah). Di HP, buka `chrome://flags`, opsi *Insecure origins treated as secure*, isi `http://<IP laptop>:4173`, lalu Relaunch. Buka alamat itu sekali, pilih menu Chrome → *Add to Home screen / Install app*. Setelah itu game jalan offline tanpa laptop; untuk update, nyalakan `npm run phone` lagi dan buka game saat satu jaringan.
- Save tetap di IndexedDB HP. Menghapus data situs/aplikasi di Chrome menghapus save juga (ekspor/impor save §6B masih ditunda).

### 32.1 Tambahan 2026-10-29: tanda quest & sensitivitas kamera
- **Tanda quest dibedakan** (melengkapi §26.3): cerita utama = "!"/"?" jingga-emas di atas lencana belah ketupat emas; quest sampingan = "!"/"?" biru muda tanpa lencana. Berlaku di atas kepala NPC, rumah, peta kota, peta wilayah, dan daftar quest peta kota. Bila satu orang punya beberapa: langkah mengalahkan quest baru, cerita utama mengalahkan sampingan (`meta/quests.js` `strongerMark`).
- **Sensitivitas putar kamera** (Pengaturan → Permainan, pengaturan v6): Lambat / Normal / Cepat / Sangat cepat = ×1 / ×1,8 / ×2,6 / ×3,6 (`data/settings.js` `CAM_SENS`). Di HP kamera kini juga bisa diputar dengan **menggeser dua jari ke samping**, selain memutar dua jari.

## 33. Hack and Slash Serba Cepat (permintaan pemilik 2026-10-29, dirancang 2026-10-30)

Pemilik ingin game terasa hack and slash. Yang terasa lambat: **gerak & serangan** dan **menunggu** (musuh berjalan jauh dari lorong, jeda gelombang, jalan jauh di wilayah). Keputusan pemilik: tempo naik **sedang (±1,5×)**; supaya tidak jadi gampang, musuh **lebih banyak & datang cepat** (bukan lebih cepat/agresif); jalan jauh di wilayah diatasi dengan **mount** (§35, dikerjakan setelah bagian ini); tingkat kesulitan & Celah tanpa batas (9E) dirancang **setelah** tempo baru, di atas angka baru.

Pendekatan: sisi pemain lewat satu blok pengali `TEMPO`, sisi musuh lewat aturan kedatangan `HORDE`; keduanya di `data/balance.js`, dipakai di `run/` di titik pemakaiannya (stat yang tampil di layar karakter tidak berubah). Kecepatan, telegraf, peluru musuh, dan pola bos **tidak** dipercepat: bahayanya datang dari jumlah.

### 33.1 Tempo pemain (`TEMPO`)
- Gerak ×1,5 (Warrior 112 → 168), dipakai di `run/player.js` setelah semua bonus (gear, AGI, ramuan, lambat).
- Jeda serangan dasar ×0,7 (`run/skills.js`, `a.interval / atkSpd × 0,7`).
- Kecepatan proyektil serangan dasar pemain ×1,3 (panah, bola api); jangkauan tetap.
- Menghindar: jarak ×1,2 (150 → 180 px), jeda ×0,65 (1,2 → 0,78 dtk); lama & kebal tetap.
- Skill, jeda skill, dan energi tidak diubah di sini (musuh yang lebih banyak sudah mengisi energi lebih cepat).

### 33.2 Kedatangan musuh di dungeon (`HORDE`)
- **Berkelompok:** antrean gelombang keluar per kelompok 3–6 musuh sekaligus dari satu lorong (bos selalu sendiri dan pertama). Jeda antarkelompok = `every × 2,5` dari data gelombang.
- **Lebih dekat:** lorong 240 → 140 px; musuh muncul di separuh luar lorong (tersembunyi) lalu masuk.
- **Tumpang tindih:** gelombang berikutnya mulai saat gelombang sekarang sudah keluar semua dan musuh hidup ≤ 40% jumlah gelombang itu (bukan lagi ≤ 2), setelah jeda 0,6 dtk (dari 1,5).
- **Jumlah ×1,6, HP ×0,8** untuk musuh biasa (dibulatkan per jenis, minimal 1; bos & mini bos tidak berubah). Elite: peluang per musuh ×0,75 supaya jumlah elite per lantai tidak melonjak.
- **Batas hidup 45 musuh** di dungeon (kelompok berikutnya menunggu) supaya HP tetap ≥ 40 FPS.
- Lantai bersih: semua permata EXP & koin di lantai **terbang sendiri** ke pemain; portal aktif setelah 0,4 dtk (dari 1).

### 33.3 Wilayah
- Kawanan 3–6 → 5–10, muncul tiap 3 dtk (malam 2) dari 4,2 (2,8); batas hidup 25 → 40.
- HP ×0,8 sama seperti dungeon (bukan mini bos). Mini bos, harta, dan gerbang tidak berubah.

### 33.4 Hadiah tetap seimbang
Musuh ×1,6 berarti hadiah per menit naik; itu disengaja (hack and slash terasa memuaskan), tapi tidak boleh meledak:
- EXP, peluang koin, peluang gear, dan peluang barang quest per musuh biasa ×0,65 (EXP tidak lagi dibulatkan ke bilangan bulat per musuh, permata kecil digabung saat jatuh berdekatan).
- Isi ultimate per bunuh 3 → 2. Elite, bos, peti lantai, dan material per lantai tidak berubah.
- Sasaran: EXP dan emas per lantai ±20% dari sebelumnya, waktu per lantai turun ±35%.

### 33.5 Uji
- Tes Vitest di `run/` untuk tiap aturan (pengali gerak/serangan/menghindar, kelompok & batas hidup, ambang gelombang, sedot permata, angka hadiah). Tes lama yang memakai angka mentah diperbarui ke angka baru.
- Simulasi tanpa layar (seperti `simulate()` di `run.test.js`) mencatat waktu per lantai, EXP, dan emas sebelum/sesudah untuk tiap kelas; hasilnya ditulis di laporan bagian.
- Cek manual pemilik di PC & HP: rasa cepat, FPS di HP dengan 40+ musuh, pola bos masih terbaca.

### 33.5b Hasil ukur (2026-10-30, simulasi lantai 1–3 dungeon pertama, LV 8)
| Kelas | Detik/lantai | EXP/lantai | Emas/lantai |
|---|---|---|---|
| Warrior | 60 → 34 (−44%) | 77 → 79 (+3%) | 52 → 64 (+23%) |
| Archer | 55 → 39 (−30%) | 71 → 79 (+11%) | 60 → 66 (+10%) |
| Mage | 125 → 58 (−54%) | 77 → 76 (−1%) | 58 → 66 (+14%) |
| Assassin | 66 → 36 (−45%) | 65 → 73 (+13%) | 48 → 55 (+14%) |

Emas sedikit di atas sasaran karena bonus koin per lantai tetap dan elite per lantai ±1,2× lebih banyak; dibiarkan, disetel ulang di 9E bila perlu.

### 33.6 Di luar bagian ini
Mount (§35), tingkat kesulitan & Celah tanpa batas (9E), pet. Angka di §33 bisa disetel ulang saat 9E.

## 34. Musik & Efek Suara dari File (permintaan pemilik 2026-10-31)

- **Sumber:** file asli di `art-src/audio/` (tidak masuk git), `npm run audio` (`app/scripts/audio.mjs`, perlu ffmpeg) menghasilkan `app/public/audio/*.mp3`: musik diratakan kerasnya, 96 kbps; jingle dipotong 3–5 detik; efek suara mono, hening awal dibuang, dipotong 0,4–1 detik.
- **Daftar:** `app/src/data/audio.js`. Beberapa file di satu nama dipilih acak. Yang belum punya file tetap memakai suara sintetis `core/audio.js`; musik yang gagal dimuat jatuh ke lagu chiptune lama.
- **Musik:** judul (menu), kota, wilayah (dua lagu acak, tidak sama berturut-turut), dungeon, bos (selama ada bos hidup), epilog. Hening di layar Hasil Perjalanan. Dua elemen `<audio>` streaming, crossfade 2 detik antar-adegan dan menjelang akhir lagu. Service worker melayani permintaan Range supaya tetap jalan offline.
- **Efek suara:** didekode sekali saat gestur pertama; jeda minimum dan batas suara per nama supaya pertarungan ramai tidak menumpuk; nada diacak ±8% (`Math.random`, bukan RNG simulasi). Jingle: naik level, lantai bersih, kalah. Portal dan Bangkit dari abu memakai bunyi pendek `chime`.

## 35. Mount (permintaan pemilik 2026-10-29, dirancang 2026-11-05)

Wilayah 20.000 × 12.000 px masih terasa jauh walau tempo §33 sudah naik. Mount mempercepat perjalanan di wilayah terbuka dan menjadi koleksi. Gambar 9 mount megah ada di `art/mounts.js` (halaman konsep `pet.html`, `?lama` = konsep pertama di `art/companions.js`). Keputusan pemilik: koleksi bertahap; naik lewat tombol, turun otomatis; mount terbang boleh menyeberang air; tiap mount punya kecepatan per rarity + satu bonus kecil; mount harus terlihat **megah, bukan seperti monster** (2026-11-06, prototipe disetujui).

### 35.1 Cara main
- **Hanya di wilayah terbuka.** Tidak di kota, dungeon, interior. Masuk kota/dungeon/interior/portal → turun tanpa jeda.
- **Panggil:** tombol <kbd>R</kbd> (PC; M sudah dipakai untuk peta) / ikon kuda dekat tombol skill (HP). Waktu panggil **1 dtk** (bar kecil di atas kepala); boleh berjalan selama memanggil; batal bila menyerang, memakai skill, menghindar, atau kena pukul. Belum punya mount → pesan singkat "Belum punya mount".
- **Kecepatan menunggang** (pengali dari kecepatan jalan sesudah §33): Biasa ×1,6 · Bagus ×1,65 · Langka ×1,7 · Epik ×1,8 · Legendaris ×1,9 · Mitos ×2,0.
- **Mount terbang** (Legendaris ke atas: Pegasus Fajar, Griffin, Naga, Paus Langit): menyeberang sungai & danau (solid `water`/`lake`). Pohon, batu, pagar, pondok, dan batas wilayah tetap menghalangi. Keluar wilayah tetap hanya di ujung jalan setapak.
- **Musuh tetap mengejar dan menyerang** pemain yang menunggang. Mount untuk menghindari pertarungan, bukan untuk kebal.
- **Turun otomatis:**
  - Tekan serang / skill / ultimate / menghindar → turun, dan aksi itu langsung dijalankan di langkah yang sama (input tidak hilang).
  - Serang otomatis tidak menurunkan (dan tidak menyerang selama menunggang atau memanggil); hanya tekanan serang yang sungguhan.
  - Tekanan yang tidak bisa jalan tidak menurunkan: slot skill kosong atau masih jeda, ultimate belum siap, menghindar masih jeda.
  - Kena pukul → jatuh, tombol R terkunci **3 dtk** (cincin jeda di ikon). Kena pukul saat baru memanggil hanya membatalkan panggilan, tanpa kunci.
  - Turun di atas air (mount terbang) → didorong ke tepi daratan terdekat.
- Ramuan bisa diminum tanpa turun.

### 35.2 Koleksi, sumber, bonus
Koleksi per slot save (per karakter). Bonus hanya dari **mount aktif**, berlaku juga saat tidak menunggang. Bonus tidak pernah menambah damage.

| Mount (id) | Rarity | Sumber | Bonus |
|---|---|---|---|
| Kuda Perang (`horse`) | Biasa | Hadiah bab 1 (mount pertama; membuka tombol R) | +5% emas |
| Serigala Raksasa (`snowwolf`) | Langka | Kandang, emas | +15% jangkauan magnet permata |
| Rusa Cahaya (`stag`) | Langka | Kandang, emas | +10% pemulihan ramuan |
| Singa Kerajaan (`lion`) | Epik | Toko Lencana Kapten Vera | +5% HP maks |
| Harimau Putih (`tiger`) | Epik | Jatuh dari bos dungeon & mini bos wilayah (peluang kecil) | +5% material tempa |
| Pegasus Fajar (`pegasus`) | Legendaris | Jatuh dari bos & mini bos Tanah Gerhana (peluang kecil) | +5% EXP |
| Griffin (`griffin`) | Legendaris | Quest sampingan berantai "Bintang Jatuh" (`s_salju`) | +5% peluang gear |
| Naga (`dragon`) | Mitos | Mengalahkan Sang Gerhana (epilog) | +5% EXP, +5% emas |
| Paus Langit (`skywhale`) | Mitos | Menyelesaikan semua quest sampingan | +10% magnet, +5% material |

- **Jaminan jatuh:** peluang Harimau Putih & Pegasus Fajar naik sedikit tiap bos yang kalah tanpa hasil; dijamin pada bos ke-25. Hitungan terpisah per mount, direset saat mount itu jatuh.
- **Varian warna** (dari `skins` tiap mount): warna pertama gratis saat mount didapat. Warna lain dibeli di Kandang dengan emas, atau didapat acak bila mount yang sudah dimiliki jatuh lagi dari bos.
- **Penjaga Kandang:** NPC baru di Kota Awal. Tab **Beli** (Serigala, Rusa, warna) dan tab **Kandang** (pilih mount aktif & warna, pratinjau mount bergerak).
- **Panel Karakter:** tab **Mount** (lihat koleksi; ganti mount aktif & warna saat di kota). Tab Koleksi mendapat baris "Mount n/9".
- **Ditunda:** pelana, jejak, aura, topi dari halaman konsep; pet (nanti memakai aturan tampilan 35.3 yang sama).

### 35.3 Tampilan megah (prototipe `pet.html`, disetujui 2026-11-06)
Kebalikan bahasa gambar monster, supaya mount selalu terbaca sebagai teman pahlawan:
- **Ukuran & postur:** skala ±1,35–1,45 dari konsep pertama (`scale` per mount); kepala tegak, langkah panjang; telinga kuda/rusa berhenti sedikit di atas kepala penunggang, kepala singa/harimau di bawahnya.
- **Cahaya:** garis tepi putih/emas hangat (`holy`, `gold`, `ice`, `rose`, `jade`, `dusk`), tanpa arsiran komik. Warna kulit tidak memakai palet jahat (tanpa Bayang/Bara/Gagak/Gerhana).
- **Mata tenang:** iris + kilau + garis kelopak; tidak pernah mata menyala.
- **Zirah naik per rarity:** Biasa pelat muka baja + kain berpinggir gading · Langka pinggir emas, kalung/pelat leher, cincin emas tanduk · Epik jambul bulu, pelat dada emas, lambang matahari di kain · Legendaris panji berkibar di belakang penunggang, kuku emas, partikel cahaya · Mitos + cahaya di tanah, partikel lebih banyak. Cahaya lembut dari atas mulai Epik.
- **Panggil:** cincin rune emas terbuka di tanah, cahaya turun, mount muncul dari cahaya lalu mengangkat kaki depan sekali (yang terbang hanya mendongak).
- **Kode:** `art/mounts.js` — `MAJESTIC_MOUNTS`, `drawMajesticRidden` (mount pada skalanya, penunggang tetap 0,82), `drawMajesty`, `drawSummonRing`; alat gambar dipinjam dari `art/companions.js` (`kit`).

### 35.4 Teknis
- **`data/mounts.js`:** kecepatan per rarity, waktu panggil, jeda jatuh, harga mount & warna, peluang jatuh dasar & kenaikan, jaminan 25, bonus tiap mount. Daftar id dicocokkan dengan `MAJESTIC_MOUNTS` di `art/mounts.js` (tes).
- **`run/mount.js`** (logika murni + tes): keadaan `none → summoning → riding`; `startSummon`, `stepMount`, `dismount(reason)`, `mountSpeed()`, `canCrossWater()`. Dipanggil dari `run/run.js` (gerak, aksi, kena pukul) dan `run/field.js`.
- **`run/fieldmap.js`:** `pushOut(map, o, r, { fly })` melewatkan solid `water`/`lake` bila `fly`; fungsi tepi daratan terdekat untuk turun di atas air.
- **`meta/stable.js`** (logika murni + tes): beli mount/warna, pilih aktif, `mountBonus(char)`, hadiah quest & jatuhan bos dengan jaminan. Jatuhan bos lewat `applyTrip`; hadiah quest lewat alur quest yang sudah ada. Bonus disuntikkan ke perhitungan yang sudah ada (emas, EXP, magnet, ramuan, material, peluang gear, HP maks).
- **Save v21:** `char.mounts = { owned: { horse: [0] }, active: 'horse', skin: { horse: 0 }, pity: { tiger: 0, pegasus: 0 } }` (`owned`: id → daftar indeks warna; `pity` dibuat dari mount ber-source 'drop'). `migrate()` v20→v21: isi kosong, lalu berikan mount yang haknya sudah didapat (bab 1 selesai → Kuda; Sang Gerhana kalah → Naga; `s_salju` selesai → Griffin; semua quest sampingan → Paus Langit). Tes migrasi & validasi.
- **Gambar:** `render3d/actors.js` `drawHero` memakai `drawMajesticRidden` saat menunggang (dengan `drawMajesty`; animasi panggil dari `drawSummonRing`); kanvas billboard pemain diperbesar hanya selama menunggang; mount terbang melayang dengan bayangan di tanah. Bar panggil di atas kepala; debu saat naik/turun (RNG efek sendiri, bukan RNG simulasi). Tampilan 2D lama (`?2d`) ikut memakai `drawMajesticRidden`.
- **Input & HUD:** <kbd>R</kbd> di `core/input.js`; ikon kuda + cincin jeda di HUD HP; tombol tersembunyi sampai mount pertama didapat.
- **Teks:** semua dibungkus `tr()`/`t()`, kamus EN di `src/i18n/`.
- **Suara:** `chime` saat naik; langkah kaki kuda menyusul lewat `data/audio.js`.
- **Cheat:** +Kuda, +semua mount.

### 35.5 Urutan kerja (berhenti untuk cek pemilik tiap bagian)
- **A** Naik/turun & kecepatan dengan Kuda lewat cheat: `data/mounts.js`, `run/mount.js` + tes, gambar menunggang, tombol R & ikon HP.
- **B** Mount terbang menyeberang air + gambar melayang.
- **C** Koleksi: save v21, `meta/stable.js`, Penjaga Kandang, tab Mount, bonus.
- **D** Sumber hadiah (bab 1, quest, bos dengan jaminan, Lencana), Koleksi, kamus EN.

## 36. Tampilan Matang — arah A (permintaan pemilik 2026-11-06)

Pemilik menilai visual sekarang terlalu "childish" (warna terlalu terang & jenuh, cahaya datar, semua objek sama terangnya, lingkungan dari bentuk polos). Dua arah diuji di prototipe `app/pixel.html` (tidak masuk game): **A · Matang** (tetap vektor/3D halus) dan **B · Pixel HD-2D**. Pemilik memilih **A dulu** (B ±4–5× lebih berat: semua karakter, gear, monster, efek harus digambar ulang).

**Yang tetap:** gameplay, `run/`, `meta/`, angka keseimbangan, save (tanpa naik versi), karakter/monster/gear gaya D, UI gelap yang sudah disetujui, efek lebay (hanya glow-nya disesuaikan).

**Yang berubah (lapisan gambar 2.5D saja):**
1. **Cahaya & palet terpusat** (`data/look.js`): material dunia (toon, tanah) diredam saturasinya; cahaya ambien lebih rendah, cahaya utama (matahari/bulan) dan titik cahaya (obor, lentera, jendela) lebih kuat → kontras & arah cahaya terasa; billboard karakter tidak lagi "bersinar sendiri" sekuat dulu (pemain sedikit lebih terang dari NPC/musuh); bloom lebih halus (ambang lebih tinggi, kekuatan lebih rendah). Karakter, efek skill, dan api tetap berwarna penuh supaya menonjol dari lingkungan.
2. **Material lingkungan**: warna rata diganti tekstur buatan kode (plester, kayu, batu, genteng, tanah, rumput) — kota, wilayah, dungeon, interior.
3. **Vegetasi & props halus**: pohon, semak, batu dirancang ulang dengan siluet berlapis, bukan bola/kerucut polos.
4. **Efek & glow** diselaraskan dengan cahaya baru (tidak silau).

Rencana: `docs/superpowers/plans/2026-11-06-tampilan-matang.md`.

## 37. Bidik Skill Dulu, Klik untuk Melepas (permintaan pemilik 2026-11-06)

Dengan mouse (PC, mode serang otomatis mati), skill yang butuh arah atau titik tidak langsung keluar saat tombolnya ditekan:
1. Tekan **1–4** (atau **5** untuk ultimate, atau klik tombol skillnya di HUD) → **mode bidik**: penanda tipis emas di tanah mengikuti mouse.
2. **Klik kiri** → skill dilepas ke arah/titik itu (klik ini tidak dihitung serangan biasa).
3. **Klik kanan** atau **Esc** → batal (Esc tidak membuka jeda saat membidik). Tombol skill yang sama ditekan lagi → langsung dilepas di posisi mouse (cast cepat). Tombol skill lain → pindah membidik skill itu.

Penanda per jenis skill (`run/aim.js`, digambar `render/aim.js` di atas dunia 2.5D maupun 2D): proyektil & garis & terjang → jalur berpanah sepanjang jangkauan (proyektil yang meledak: lingkaran ledakan di ujung); area di titik bidik → lingkaran jangkauan maksimal (garis putus) + lingkaran area yang berhenti di batas; kipas → kerucut; badai petir → jangkauan + titik awal rantai; pisau orbit → jangkauan lempar.

**Tetap langsung keluar:** skill yang berpusat di pemain (buff, putaran, kipas 360°, ultimate area yang mengikuti), skill yang masih cooldown (supaya tetap ada umpan balik), mode serang otomatis, dan kontrol sentuh di HP (bidik otomatis). Logika skill (`run/skills.js`) tidak berubah: skill tetap mengarah ke posisi mouse saat dilepas. Save tidak berubah.

## 38. Arah Hadap: Ikut Kamera, Berbalik seperti Kertas, Pose Depan/Belakang (permintaan pemilik 2026-11-07)

Masalah: karakter, NPC, dan mount selalu terlihat menyamping, dan saat bertarung arah hadap diambil dari sumbu X dunia sehingga salah kalau kamera diputar. Contoh yang disetujui: `app/arah.html` (prototipe, tidak masuk game).

- **A, arah ikut layar:** arah hadap dihitung dari arah di layar (`render3d/facing.js` `screenX`). Hero menghadap ke arah bidik, monster ke hero (atau ke arah terjangnya), warga yang berjalan ke arah jalannya, dan warga yang diam ke hero.
- **B, berbalik seperti kertas:** saat ganti arah, gambar menyempit menjadi garis tipis lalu melebar terbalik, dengan lompatan kecil. Hero condong ke arah jalannya. Angka ada di `data/look.js` `facing` (`turn` 0,16 dtk, `hop` 4, `lean` 0,11 rad). `?lama` = langsung berbalik, tanpa lompat dan condong (A tetap berlaku).
- **C ringan, pose depan & belakang:** hero dan NPC memakai pose depan saat berjalan mendekati kamera dan pose belakang saat menjauh. Pose depan/belakang hanya untuk berjalan dan diam. Saat menyerang, memakai skill, atau menghindar, karakter kembali menyamping menghadap bidikannya. NPC yang diam menghadap kamera. Monster dan pet tetap menyamping. **Mount (2026-11-11):** ikut aturan hero — tampak depan saat berjalan mendekati kamera, tampak belakang saat menjauh (`art/mountviews.js`, 7 bentuk tubuh untuk 9 mount, zirah per rarity sama dengan tampak samping). Tampak depan: kepala, dada, dan kaki depan mount di depan penunggang, kepala direndahkan ke bawah bahu penunggang supaya wajahnya tetap terlihat. Tampak belakang: kepala di balik penunggang (telinga/tanduk mengintip), pantat, ekor, dan kaki belakang di depan. Penunggang memakai pose yang sama. Contoh: `app/pet.html` (tombol Putar/Samping/Depan/Belakang); `?lama` = selalu menyamping.

Rencana: `docs/superpowers/plans/2026-11-09-arah-hadap.md`.

## 39. Karakter Pixel Art (permintaan pemilik 2026-11-09)

Pemilik lebih suka karakter versi pixel ("tidak terlihat seperti anak kecil") setelah melihat contoh `app/anime.html` (gaya anime fantasi, mode Pixel sedang). Arah: karakter dan monster jadi pixel art di dunia 3D Tampilan Matang (gaya HD-2D). Dunia, cahaya, dan efek skill tetap halus.

- **Langkah 1 (lapisan pixel):** gambar karakter yang sekarang digambar kecil, `LOOK.pixel.k` = 2 piksel per satuan game (hero ±80 px), sama untuk hero, warga kota, dan monster supaya ukuran pikselnya seragam. Lalu diolah `render3d/pixelate.js`: tepi tajam (alpha di-dither pola Bayer 4×4, jadi cahaya bertitik), warna dibulatkan ke 7 tingkat per kanal, garis luar tinta 1 piksel. Teksturnya diperbesar tanpa penghalusan. `?lama` = gambar halus seperti dulu. NPC tersembunyi, penjaga gerbang, dan titik quest di wilayah (`render3d/field.js`, kartu yang memuat label teks) belum diubah.
- **Berikutnya:** desain anime per kelas (Warrior dulu) di atas kerangka gerak `art/hero/rig.js`, frame disimpan jadi supaya ringan di HP, pose depan/belakang gaya anime menggantikan §38 bagian 2.
- **Langkah 2 (hero anime di game, 2026-11-09):** empat job digambar ulang gaya anime fantasi di `src/art/anime/` (desain sendiri), digerakkan kerangka `art/hero/rig.js` sehingga jalan, serangan, skill, dan guling tetap sama. `drawHero` memakai gambar anime bila `pose.anime` (dinyalakan renderer bila `LOOK.anime`; `?lama` = gaya D halus). Rambut save → gaya anime (Pendek→Klimis, Jabrik, Panjang, Bob→Belah Tengah, Kuncir), warna rambut → 6 warna anime. Rarity senjata → elemen (Biasa/Bagus polos, Langka Es, Epik Kehampaan, Legendaris Cahaya, Mitos elemen khas job: Warrior Api, Archer Petir, Mage Kehampaan, Assassin Darah); tiap elemen punya efek sendiri (`art/anime/elemfx.js`), digambar setelah filter pixel supaya halus. Lari per job (`rig.js` `GAIT`, hanya bila `pose.gait`), pose depan/belakang gaya anime. Warga kota dan potret menu belum gaya anime. Ikon item gaya anime (`art/anime/items.js`, pixel 40 px) siap tetapi belum dipasang ke UI.
- **Halaman contoh:** `app/anime.html` (desain karakter, semua job, arah, lari, skill, pixel/halus), `app/item.html` (ikon item per rarity, Mitos besar).
- **Ringan di HP (2026-11-11):** warga kota digambar ulang sesuai jatah `LOOK.npcFps` (diam 8/dtk, berjalan 12/dtk, jauh dari kamera 4/dtk; saat berbalik tiap frame), bukan tiap 2 frame. NPC tersembunyi dan penjaga gerbang di wilayah (`render3d/field.js` kartu) kini pixel seperti hero, labelnya tetap tajam. Penghitung FPS sudah ada di panel cheat ("FPS: tampilkan"). `?lama` = perilaku lama.

## 40. Satu Dunia Tersambung (permintaan pemilik 2026-11-11)

Masalah: gerbang kota besar hanya menawarkan wilayahnya sendiri (Rimbawana → Hutan Kelam saja) karena dunia berbentuk bintang (§25). Keputusan pemilik (2026-11-11):
- **Satu dunia besar ±70000 × 70000** (±5 menit dari Kota Awal ke kota besar). Kota Awal di **pusat**; empat biome mengelilinginya: barat Hutan Kelam, utara Padang Es, timur Gurun Merah, selatan Gunung Api. Kota besar di ujung luar tiap lengan; Tanah Gerhana kantong di ujung selatan di balik Baraapi.
- **Biome tidak menempel.** Tiap perbatasan punya pembatas alam berbeda dan hanya bisa diseberangi di titik tertentu; peralihan pendek (±400) hanya di titik penyeberangan.
- **Kota tetap layar sendiri** dengan gerbang yang terlihat di dunia.
- **Pendekatan A:** kerangka kecil sekali buat + isi per petak yang dibuat saat didekati.

### 40.1 Tata letak
| Perbatasan | Pembatas | Penyeberangan |
|---|---|---|
| Hutan ↔ Padang Es (barat laut) | pegunungan bersalju | 2 celah gunung |
| Padang Es ↔ Gurun (timur laut) | sungai besar (beku di sisi Es) | 2 jembatan batu |
| Gurun ↔ Gunung Api (tenggara) | ngarai dalam | 2 jembatan gantung |
| Gunung Api ↔ Hutan (barat daya) | tebing vulkanik + sungai lava | tidak ada (memutar) |
| Gunung Api → Tanah Gerhana | tebing hitam | 1 celah, tertutup sampai 5 Pecahan Segel |

- Kota Awal di **dataran netral** (rumput, radius ±3000) tempat keempat pembatas berhenti; empat jalan utama keluar dari sana ke keempat kota besar.
- **Jalan lingkar** menghubungkan kota besar bertetangga lewat celah/jembatan (Rimbawana–Bekubara–Pasirluas–Baraapi), tidak lewat sisi barat daya.
- **Zona = wilayah lama.** Id `forest`, `ice`, `desert`, `volcano`, `eclipse` tetap. `zoneAt(x, y)` memberi zona di suatu titik (arah dari pusat; Gerhana = kantong selatan). `zoneToWorld(zone, fx, fy)` memetakan koordinat pecahan lama: `fx` 0→1 = dari tepi dataran Kota Awal ke kota besar, `fy` = melintang lengan. Penghuni tersembunyi, tempat quest, pita gerbang dungeon, dan pita harta tetap memakai data lamanya.
- **Level** naik dengan `fx` di lengannya (rentang lama: Hutan 1–15, Es 10–25, Gurun 20–35, Gunung Api 30–50, Gerhana 45–50).

### 40.2 Mesin peta
- **Kerangka** (`run/worldmap.js`), dibuat sekali dari seed tetap yang sama untuk semua karakter: jalan, pembatas beserta celah/jembatannya, sungai kecil & danau per lengan, letak kota & gerbangnya, kantong Gerhana.
- **Petak 4000 × 4000** (18 × 18): pohon, batu, reruntuhan, dan benda padat pembatas dibuat per petak dari seed `(dunia, ix, iy)` — selalu sama. Yang ada di memori hanya petak di sekitar pemain (3 × 3); petak jauh dibuang dan dibuat ulang identik. Pembuatan dicicil maksimal satu petak per frame, mulai sebelum terlihat. `blocked`/`pushOut`/`solidsNear` tetap dengan pencarian per petak.
- **Tanah** per ubin memilih pola biome di posisinya; di penyeberangan dua pola dibaurkan. **Props 3D** dibangun/dibuang per petak. Pembatas digambar khusus (punggung gunung, sungai besar + jembatan batu, ngarai + jembatan gantung, sungai lava + tebing).
- **Peta penuh (M) & peta mini** satu peta dunia: warna biome, pembatas, jalan, kota, gerbang yang ditemukan, kabut. **Kabut** satu untuk dunia, sel 250 (±78 ribu sel).

### 40.3 Aturan main
- **Musuh** dari zona di titik muncul; dekat penyeberangan (radius 600) campuran dua zona.
- **Gerbang dungeon, harta & mini bos, penghuni, tempat quest:** letak dari data lama lewat `zoneToWorld`, digeser ke titik bebas terdekat bila jatuh di benda padat (deterministik).
- **Masuk kota:** berjalan ke gerbang kota di dunia (kota pertama kali didatangi tercatat, `visitTown`). **Keluar kota:** gerbang Rolan di kota mana pun punya satu tombol "Keluar ke dunia"; muncul di depan gerbang kota itu. Teleport tetap.
- **Simpan:** tiap 60 detik, saat masuk kota/dungeon, saat tumbang, **dan saat berpindah zona** (supaya hitungan quest/tugas per zona tetap benar dengan `trip.region` = zona saat itu).
- **Quest "injak wilayah"** tercatat saat pertama masuk zona. Target quest ke kota = gerbang kota itu di dunia.
- **Tumbang:** bangun di kota terakhir, kehilangan 10% koin (tetap).

### 40.4 Save versi 22
- `world { seed, fog }` — kabut dunia (base64). `regions { [zona]: {} }` hanya penanda zona yang pernah diinjak (kabut lama dibuang karena petanya berubah).
- `treasures` (per zona, indeks peti) dan `found` tetap; letaknya pindah tapi yang sudah dibuka/ditemukan tetap tercatat.
- `migrate()` v21 → v22 (v21 sudah dipakai Mount §35).
- Rencana kerja: `docs/superpowers/plans/2026-11-11-satu-dunia.md`.
- **Warga kota anime di game (2026-11-11):** warga kota & interior (`render3d/town.js`), NPC tersembunyi di wilayah (`render3d/field.js`), dan potret NPC memakai `art/anime/npc.js` (22 jenis dari `art/hero/npc.js` `archParts`, gerak diam pekerjaan dari rig `npc`), lewat `drawHero` bila `pose.anime`. Penjaga gerbang wilayah kini digambar sebagai warga jenis Penjaga (helm, tombak), bukan Warrior. `?lama` = gaya D. Contoh: `app/npc.html`.

## 41. Tantangan: Musuh Beragam, Bos Khas, Tingkat Kesulitan, Job Lanjutan (permintaan pemilik 2026-11-11)

Masalah (pemilik, main Mage): game terlalu gampang dan membosankan. Jarang hampir mati kecuali melawan bos. Jenis musuh terlalu sedikit: varian biome kebanyakan hanya ganti kulit (Lendir Beku/Pasir/Magma/Hampa = Lendir + efek). Lima bos dungeon memakai jurus yang sama (`ring`, `spiral`, `slam`, `charge`, `summon`), hanya beda warna dan angka; yang punya jurus sendiri hanya Sang Gerhana. Mage membunuh dari jauh dengan serangan area sebelum musuh sempat beraksi.

Keputusan pemilik: "lakukan saja semuanya", dengan urutan **A musuh → B bos → C tingkat kesulitan (9E) → D Job Lanjutan**. Job Lanjutan menambah kekuatan, jadi dikerjakan paling akhir, didapat lewat **ujian**, dan **mengubah cara main** (cabang), bukan sekadar menambah angka. Rincian di bawah diputuskan Claude atas permintaan pemilik dan boleh dikoreksi saat cek manual. Tiap proyek punya rencana kerja sendiri dan dikerjakan per bagian.

Prinsip untuk semua proyek: musuh dan bos baru harus **memaksa bergerak atau memilih sasaran**, dengan tanda bahaya yang terlihat dulu (lingkaran/garis seperti sekarang). Sakit kalau kena, adil kalau diperhatikan. Tidak boleh ada serangan tanpa tanda.

### 41.1 Proyek A: musuh beragam & elite bersifat acak

**Delapan perilaku baru** (`run/enemies.js`, angka di `data/enemies.js`), dua musuh baru per biome. Musuh baru ikut muncul di dunia (`data/world.js` `enemies`) dan di gelombang dungeon bertema biome itu.

| Biome | Musuh | Perilaku (`ai`) | Yang dipaksa ke pemain |
|---|---|---|---|
| Hutan | Katak Rawa | `leap`: menandai lingkaran di posisi pemain, 0,7 dtk kemudian mendarat di sana | Terus bergerak |
| Hutan | Semak Penyergap | `ambush`: diam menyamar jadi semak (tak bisa dibidik), menyergap dengan terjang pendek saat pemain dalam 110 | Waspada saat lewat semak |
| Es | Roh Embun | `trail`: melayang mendekat dan meninggalkan genangan es yang memperlambat 40% selama 4 dtk | Jangan bertarung di tempat yang sama |
| Es | Penjaga Cermin | `mirror`: tiap 4 dtk mengangkat cermin 1,5 dtk (berkilat dulu 0,4 dtk); proyektil pemain yang kena dari depan dipantulkan balik | Tahan serangan atau ambil sisi |
| Gurun | Hyena Pasir | `pack`: datang 4–6 ekor, berputar mengepung di jarak 160, lalu menyerbu bersamaan setelah lolongan (tanda garis tiap ekor) | Keluar dari kepungan sebelum lolongan |
| Gurun | Kumbang Pembelah | `split`: saat mati pecah jadi 2 kumbang kecil, yang kecil pecah lagi jadi 2 tungau | Jangan anggap remeh kerumunan |
| Gunung Api | Meriam Magma | `mortar`: berdiri jauh (jarak 360, lebih jauh dari jangkauan Mage) dan menembak lambung: lingkaran bahaya di posisi pemain, 1 dtk | Kejar atau terus bergerak |
| Gunung Api | Totem Bara | `totem`: tidak bergerak; musuh dalam radius 200 mendapat +30% kecepatan dan perisai 20% HP selama totem hidup | Pilih sasaran: hancurkan totem dulu |
| Gerhana | Obelisk Hampa | `totem` + sinar: seperti Totem Bara, ditambah sinar berputar pelan dari obelisk | Pilih sasaran sambil menghindar |
| Gerhana | Kembar Hampa | `twin`: muncul berpasangan, tersambung sinar yang melukai bila dilewati; yang mati bangkit lagi dalam 4 dtk kecuali kembarannya juga mati | Bunuh berdua berdekatan |

**Elite bersifat acak** (`data/enemies.js` `AFFIXES`, nama sifat di atas kepala elite, mis. "Golem Cepat · Berlapis"). Elite mendapat 1 sifat (2 sifat di level dunia ≥ 25 atau lantai dungeon ≥ 4; tingkat kesulitan menambah, §41.3):

| Sifat | Efek |
|---|---|
| Cepat | kecepatan ×1,5, jeda aksi ×0,7 |
| Berlapis | perisai 35% HP maks yang harus dihabiskan dulu; pulih bila tidak diserang 4 dtk |
| Pemanggil | memanggil 2 kroco biome-nya tiap 6 dtk (maks 4) |
| Berduri | saat kena serangan, paling sering tiap 1 dtk menembakkan 8 duri ke segala arah |
| Meledak | saat mati: lingkaran bahaya radius 110, 1 dtk |
| Beraura | tiap 1,6 dtk meninggalkan letupan kecil di tempatnya (radius 44), membawa efek musuh itu (lambat/bakar/racun) |
| Penjelajah | tiap 5 dtk menghilang dan muncul di dekat pemain (tanda 0,5 dtk) |

- Peluang dan hadiah elite tetap (`ELITE` di dungeon, `FIELD.eliteChance` di dunia); sifat tidak mengubah drop di proyek A.
- Uji manual: panel cheat (Wilayah/Dungeon) punya tombol "Elite 2 sifat".
- Sifat dipilih dengan RNG simulasi (deterministik per seed seperti spawn); efek gambar memakai RNG efek.
- Gambar musuh baru dibuat lewat kode di gaya yang sama dengan musuh sekarang (§36/§39), satu sprite per musuh + varian kecil (anak Kumbang, tungau).

### 41.2 Proyek B: bos dengan jurus khas & fase

Tiap bos dungeon mendapat **2 jurus khas** yang hanya dia punya, dan **satu pergantian fase di 50% HP** (judul besar seperti Sang Gerhana, kebal 1,2 dtk, guncangan). Di fase kedua jurus khas lebih kuat dan ada satu jurus baru. Jurus umum (`ring`/`spiral`/`slam`/`charge`/`summon`) tetap ada sebagai selingan, maksimal 2 per bos.

| Bos | Jurus khas | Fase 50% |
|---|---|---|
| Raja Maw (Bayangan) | **Telan**: membuka mulut, menarik pemain 2 dtk (seperti `hole`), lalu gigitan besar di depannya. **Bayang Kembar**: 2 bayangan palsu yang ikut menembakkan cincin, mati sekali pukul | "LAPAR!": 3 bayangan, Telan lebih kuat menarik |
| Golem Kristal | **Prisma**: menancapkan 3 kristal di arena, sinar garis menyala bergantian di antara kristal (kristal bisa dihancurkan). **Hujan Serpih**: deretan lingkaran kecil jatuh berurutan menyapu arena | "RETAK!": tiap kena serangan memercikkan serpih; Prisma 4 kristal |
| Ratu Spora | **Ladang Jamur**: menanam 5 jamur yang membesar 3 dtk lalu meledak (bisa dihancurkan sebelum meledak). **Awan Racun**: awan pelan yang mengikuti pemain 6 dtk | "MEKAR!": tepi arena jadi racun, arena menyempit 25% |
| Raja Mumi | **Kutukan**: tanda di pemain, 3 dtk kemudian ledakan di sekitar pemain dan kutukan menular ke musuh lain di dekatnya. **Badai Pasir**: angin mendorong pemain ke satu arah 3 dtk sambil menembakkan peluru pasir | "KUTUKAN FIRAUN!": membangkitkan 3 mumi dari peti (kroco kuat) |
| Raja Lava | **Erupsi**: retakan lava menjalar dari bos dalam 3 garis yang berbelok. **Meteor**: 3 meteor dengan bayangan yang membesar 1,5 dtk | "LANTAI MENDIDIH!": 30% arena jadi lava tetap (zona bahaya permanen) |
| Sang Gerhana | tetap (`beam`, `hole`, fase); `echo` kini meniru **jurus khas** bos lain, bukan cincin/spiral/hantam | tetap |

- **Bentuk baru (dikerjakan lebih dulu, 2026-11-11):** dulu kelima bos berkerangka sama (badan trapesium, dua gumpalan lengan, dua mata, hiasan di atas), hanya beda warna, dan detailnya hilang oleh filter pixel. Kini tiap bos punya siluet sendiri dan digambar dalam kotak ±2,4r (musuh lain ±1,6r, `art/monsters.js` `artExt`) tanpa mengubah hitbox: **Raja Maw** rendah & sangat lebar, hampir semuanya mulut, tiga mata bertangkai, enam kaki pendek; **Golem Kristal** tinggi bergerigi dengan satu lengan kristal raksasa; **Ratu Spora** topi jamur selebar payung di atas batang ramping, spora bergelantungan; **Raja Mumi** ramping melayang di atas peti mati, perban berkibar; **Raja Lava** berbahu lebar, empat lengan (dua terangkat), tanduk melengkung, lava menetes. Pembanding lama/baru (halus & pixel): `app/bos.html`.
- **Gaya anime (keputusan pemilik 2026-11-11, arah C):** bos digambar ulang dari **sistem karakter anime** (`drawAnime`, kerangka `rig.js`, kepala & rambut `head.js`, pakaian kustom `OUTFITS`, zirah/senjata Mitos), diperbesar 2,3× hero, ditambah bagian khusus bersudut tajam (tanduk, mahkota, dsb.) dan **aura pixel** (bara, lidah api, serpih kristal, spora, pasir, hampa) yang makin kuat di fase 2. Para raja/ratu (Raja Maw, Ratu Spora, Raja Mumi, Raja Lava) jadi tokoh penjahat; Golem Kristal jadi ksatria berzirah batu-kristal. Gambar poligon manual ditolak ("terlalu bulat", "tidak sebagus karakter"). Bos hanya punya tampak **depan, kanan, kiri** (tidak belakang, selalu menghadap pemain). Koreksi pemilik: v2 (Warrior anime yang diperbesar) "terlalu mirip karakter"; bos harus **lebih aneh, tidak terlalu berbentuk manusia**: kerangka gerak, pewarnaan cel, dan senjata/efek elemen tetap dari sistem karakter, tetapi tubuhnya monster (Raja Lava v3: tengkorak iblis bermoncong dengan surai api, empat lengan bercakar, kaki terbalik, ekor berduri, sayap selaput api, rusuk lava). Contoh: `app/bosanime.html`.
- **Di game (2026-11-11):** `src/art/bosses/` (satu modul per bos, `kit.js` alat bersama, `aura.js` aura pixel, `index.js` `drawBoss`/`bossPortrait`). Raja Maw: iblis rakus membungkuk, perut berupa rahang raksasa bertaring yang membuka-tutup, lima mata merah, mata bertangkai di punggung, lengan sangat panjang bercakar, sulur bayangan, mahkota karatan miring. Golem Kristal: ksatria raksasa batu-kristal, bahu bertumpuk, kepala kecil bercelah V, jantung kristal segi enam, lengan bilah kristal yang berayun seperti pedang hero, perisai batu. Ratu Spora: tanpa kaki (rok akar), badan kayu berusuk, topeng porselen bermata ungu di bawah tudung jamur bergerigi berbintik bercahaya, untaian spora, tongkat jamur. Raja Mumi: lich firaun melayang, ekor perban, empat lengan (tongkat kait & cambuk, dua tangan tulang berkuku), tengkorak bermata api toska di balik nemes emas-lapis, ankh, tutup peti mati emas melayang. Raja Lava: seperti contoh v3. Sang Gerhana: raksasa hampa melayang, jubah buyar, cakram gerhana bermahkota emas, topeng polos bermata sabit, kerah duri emas, enam lengan berbola hampa. Renderer 3D (`render3d/actors.js` `drawAnimeBoss`) menggambar bos tiap frame di kanvas sendiri seperti hero: filter pixel, efek elemen senjata, kilat saat kena, aura pixel di belakang & depan; menghadap depan bila pemain di bawahnya (ke arah kamera), selain itu menyamping; saat beraksi (ancang-ancang, terjang, pola) menyamping dengan ayunan kerangka; fase 2 saat HP di bawah `enrageAt`. Potret Koleksi memakai tampak depan. Tampilan 2D (`?2d`) dan `?lama` tetap memakai gambar lama. Galeri: `app/bosanime.html`.
- **Jurus khas di game (bagian B2–B4, 2026-11-11):** `data/enemies.js` (`signature`, `phases`, angka tiap jurus), `run/enemies.js` `stepPattern`, tes `run/bossmoves.test.js`. Penyederhanaan dari tabel di atas: kristal Prisma dan jamur Ladang Jamur tidak bisa dihancurkan (cukup dihindari); Bayang Kembar berupa bayangan sesaat yang menembakkan cincin (bukan musuh); fase 2 Ratu Spora/Raja Lava = genangan racun / kolam lava menetap (jenis bahaya baru `zone`, maks 6, juga dipakai Awan Racun yang mengejar); Badai Pasir = jenis bahaya `push`; Kutukan = lingkaran yang mengikuti pemain lalu berhenti (`chase`); fase 2 Golem Kristal "RETAK!" = Hujan Serpih & Prisma lebih sering dan rapat. Saat marah (`enrageAt`) jumlah/kecepatan jurus naik. **Mini bos dunia** (penjaga harta) meminjam satu jurus khas bos dungeon zonanya (`data/enemies.js` `MINI_MOVES`: Hutan → Ratu Spora, Es → Golem Kristal, Gurun → Raja Mumi, Gunung Api → Raja Lava, Gerhana → Raja Maw), dipakai tiap 5–7 dtk (penguasa lebih sering), damage disetel ke kekuatan penjaga (`run/minimove.js`); nama bos pemilik jurus muncul di atas kepalanya.
- **Bentuk peluru & zona (bagian B1):** peluru musuh tidak lagi bola cahaya yang hanya beda warna. Tiap bos punya gambar peluru pixel sendiri (`data/enemies.js` `SHOT_LOOKS`, `art/pix/fx.js` `SHOT_ART`): Raja Maw ludah ungu bertaring, Golem Kristal serpih kristal berputar, Ratu Spora bola spora berduri, Raja Mumi kumbang emas, Raja Lava batu lava berekor api, Sang Gerhana bulan sabit hitam; penembak biasa memakai ludah hijau / serpih / lava / sabit sesuai biome. Zona hantaman bos tetap bergaris merah dengan motif di dalamnya (taring, kristal, spora, cincin pasir, retakan, pusaran).
- Mini bos dunia (penjaga harta, §25) memakai **1 jurus khas** dari bos dungeon biome-nya, dengan angka lebih kecil.
- Jurus baru memakai `run.hazards` & `run.shots`; jenis hazard baru seperlunya: `zone` (genangan/lava/racun tetap, melukai tiap 0,5 dtk), `push` (angin), dan `crystal` (benda yang bisa dihancurkan, dibuat sebagai musuh tanpa gerak dengan `prop: true`).

### 41.3 Proyek C: tingkat kesulitan & Celah tanpa batas (9E)

**Tingkat kesulitan** satu setelan per karakter, diganti di Balai Petualang (Papan Tugas), berlaku untuk dunia dan dungeon. Dipilih di awal sebuah trip; saat di dunia, gantinya hanya di kota.

| Tingkat | Terbuka | Musuh | Elite | Hadiah |
|---|---|---|---|---|
| Normal | sejak awal | angka sekarang | 1–2 sifat | sekarang |
| Sulit | sejak awal | HP ×2, damage ×1,6 | peluang ×2, +1 sifat | koin & EXP ×1,5, rarity naik satu tingkat lebih sering |
| Neraka | setelah tamat (Sang Gerhana) di Sulit | HP ×4, damage ×2,5, jeda aksi ×0,8 | peluang ×3, +2 sifat | koin & EXP ×2,5, Mitos ×3, bahan langka |

- Tumbang di Sulit/Neraka: koin hilang 15%/25% (Normal tetap 10%).
- Angka §33 dan sisa penyeimbangan disetel ulang di sini, sesudah A dan B, dengan sasaran: Mage berlevel pas di Normal pernah turun di bawah 50% HP di sebagian besar lantai dungeon.

**Celah tanpa batas** (terbuka setelah tamat, gerbang di Kota Awal):
- Lantai bertambah terus; musuh campuran semua biome, kekuatan +8% per lantai di atas tingkat kesulitan yang dipilih.
- Tiap 5 lantai: bos acak dengan jurus khasnya, lalu **titik simpan**. Hadiah yang terkumpul sampai titik simpan aman; tumbang hanya menghilangkan hadiah sesudahnya.
- Tiap lantai biasa: pilih **1 dari 3 berkah** yang berlaku sampai keluar, beberapa dengan harga (mis. "+30% serangan, HP maks −20%", "musuh lebih banyak, koin ×2").
- **Rekor lantai terdalam** per karakter, tampil di Balai Petualang.

Save: `difficulty`, `unlocked` (Neraka, Celah), `rift { best, checkpoint }`. Versi save naik satu dari versi terakhir saat dikerjakan, dengan `migrate()`.

### 41.4 Proyek D: Job Lanjutan

> Diperbarui oleh §43 (2026-11-11): Job Lanjutan jadi bagian H proyek §43; ujian tidak lagi menunggu tingkat Sulit (§43.8); tiap cabang menambah 2 skill + 1 ultimate + 2 pasif ke pohon skill (§43.2).

- **Syarat:** level 30, lalu **ujian** di Pelatih: arena khusus melawan **Bayangan Diri**, yaitu bos yang memakai skill kelasmu sendiri dan mekanik khasnya, di tingkat Sulit atau lebih. Menang = memilih satu dari dua cabang. Ganti cabang di Pelatih dengan biaya besar.
- **Cabang mengganti mekanik khas (§31) dan menambah 2 skill + 1 ultimate baru**, bukan hanya menambah angka. Stat dasar naik sedikit (±10%) saja.

| Kelas | Cabang 1 | Cabang 2 |
|---|---|---|
| Warrior | **Berserker**: Murka tidak turun selama terus menyerang; makin rendah HP makin kuat; tanpa kurangi damage | **Paladin**: perisai suci menyerap damage, aura menyembuhkan pelan, serangan mendorong mundur |
| Archer | **Penembak Jitu**: Bidik penuh = tembakan tembus besar, makin jauh makin sakit, harus diam | **Pemburu**: hewan pendamping ikut menyerang, panah memantul ke musuh lain, kuat sambil berlari |
| Mage | **Penyihir Api**: Panas menumpuk jadi ledakan berantai besar, mantra lebih lambat | **Penyihir Waktu**: area memperlambat musuh, memutar balik diri ke posisi & HP 3 dtk lalu, memantulkan peluru |
| Assassin | **Bayangan**: menghilang, serangan dari belakang pasti kritikal | **Penari Pedang**: Kombo tak terbatas, makin tinggi makin cepat, kombo putus = hilang semua |

- Tampilan: gelar baru di atas nama dan warna/aura cabang. Teks baru dua bahasa (§23).
- Save: `job` (id cabang atau null), versi naik + `migrate()`.

### 41.5 Urutan & rencana kerja
1. Proyek A: `docs/superpowers/plans/2026-11-11-musuh-beragam.md`.
2. Proyek B, C, D: rencana masing-masing ditulis saat proyek sebelumnya selesai dicek pemilik. **Diubah 2026-11-11:** setelah A dan B (keduanya sedang berjalan) dikerjakan §43 (Job & Skill Bertingkat, menggantikan D), lalu C.
3. Satu Dunia (§40) bagian B7–D tetap berjalan; proyek A hanya menyentuh daftar `enemies` per zona di `data/world.js`, bukan peta.

## 42. Quest Beragam (permintaan pemilik 2026-11-11)

Masalah: hampir semua quest berpola "bicara → kalahkan X / kumpulkan Y / datangi Z → bicara". Keputusan pemilik: tambah 8 bentuk baru — **Kawal, Bertahan, Buronan, Sarang, Penyelamatan, Balapan, Peristiwa dunia, Pilihan**.

### 42.1 Aturan umum
- Bentuk lapangan (Kawal, Bertahan, Buronan, Sarang, Penyelamatan, Balapan) adalah langkah quest jenis `event` `{ event, at, … }`: dimulai saat pemain mendekati titik mulainya (`at`, koordinat pecahan zona seperti `SPOTS`), berjalan di dunia, lalu **berhasil** (langkah selesai) atau **gagal** (tanpa hukuman: kembali ke awal langkah, bisa dicoba lagi dengan mendekati titik mulainya).
- Logika di `run/questev.js` (murni, tes Vitest), angka di `data/questev.js`. Tanda di peta, peta mini, dan panah tujuan seperti quest lain.
- **16 quest sampingan baru** (2 per bentuk, tersebar di zona), total 48.

### 42.2 Bentuk
| Bentuk | Inti |
|---|---|
| Kawal | NPC berjalan sendiri menyusuri rute ke tujuan; musuh mengincarnya; HP di atas kepala; berhenti menunggu bila pemain > 500 jauhnya. Gagal bila tumbang. |
| Bertahan | Altar/pondok ber-HP; 3–4 gelombang makin ganas selama ±75 detik, sebagian menyerang altar. Gagal bila altar hancur atau pemain menjauh > 700. |
| Buronan | Elite bernama (lebih kuat, pola khusus), lokasi hanya lingkaran jejak di peta; pada HP 50% kabur ke titik lain (lingkaran baru). |
| Sarang | 3–5 sarang/totem ber-HP yang memunculkan musuh berkala sampai dihancurkan. |
| Penyelamatan | Kamp: penjaga + kandang; kalahkan penjaga, buka kandang (E), tawanan lari ke kota. |
| Balapan | Cincin cahaya berurutan di jalan + batas waktu; hadiah perunggu/perak/emas menurut waktu; rekor tercatat. Gagal bila waktu habis. |
| Pilihan | Langkah `choice` di dialog: dua jawaban dengan hadiah & akibat berbeda (NPC pergi, Lencana, koin); tercatat di jurnal. |
| Peristiwa dunia | Kejadian acak di zona dekat pemain tiap 5–8 menit (karavan diserang = kawal singkat, hujan meteor = hindari & ambil kristal, serbuan jembatan = bertahan singkat); tanda "!" di peta mini; hilang bila diabaikan; hadiah langsung. |

### 42.3 Save versi 23
- `quests.choices { [questId]: index }` (jawaban Pilihan), `quests.races { [questId]: detik terbaik }`.
- `migrate()` v22 → v23.
- Rencana kerja: `docs/superpowers/plans/2026-11-11-quest-beragam.md` (A Kawal & Bertahan · B Buronan & Sarang · C Penyelamatan & Balapan · D Pilihan & Peristiwa dunia).

## 43. Job & Skill Bertingkat (permintaan pemilik 2026-11-11)

Acuan: Dragon Nest (poin skill, level skill, dua halaman skill, dua pilihan ultimate). Masalah: tiap kelas hanya punya 6 skill + 1 ultimate tanpa level, dan kelas dipilih sebelum pemain tahu rasanya. Keputusan pemilik: mulai tanpa job (Pengembara), pilih job lalu bisa ganti dengan biaya, poin skill (SP) dengan level skill, 2 ultimate per job, 2 halaman skill, skill dengan tempo berbeda, dan musuh tetap tidak gampang. Proyek ini **memperbarui §41.4** (Job Lanjutan) dan maju sebelum §41 proyek C (lihat §43.9).

### 43.1 Pengembara & pemilihan job
- **Buat Karakter:** hanya nama & rambut; pilihan kelas dihapus. Karakter baru = **Pengembara** (`classId: 'novice'`).
- **Pengembara:** stat dasar `maxHp 110, atk 12, def 1, crit 6, moveSpd 112`, pertumbuhan `maxHp 9, atk 1,3`; serangan biasa tebasan pendek (`arc`, r 40, 90°, jeda 0,5, energi 6). Dua skill tetap (tanpa level): **Ayunan Lebar** (area di sekeliling r 70, 180%, energi 30, cd 3) dan **Guling Serang** (dash 140, 200% ke yang dilewati, energi 20, cd 3). Tanpa mekanik khas, tanpa ultimate, tanpa halaman B. Senjata bawaan Pengembara; selama Pengembara **senjata tidak jatuh** (gear lain tetap). SP tetap terkumpul. **EXP berhenti di level 10** sampai memilih job.
- **Coba Job** (menu Pelatih Guru Hadi): arena kecil di samping boneka latihan, main sebagai job pilihan (level sama, skill bawaan terpasang level 1, mekanik khas aktif) melawan boneka + gelombang musuh lemah. Gratis, tanpa batas, tanpa hadiah; keluar = kembali Pengembara.
- **Pilih job** (level ≥ 5, quest "Pilih Jalanmu" dari Guru Hadi): pertama kali **gratis**. Dapat senjata awal kelas itu (rarity biasa, level item = level karakter), mekanik khas, pohon skill (SP terkumpul siap dipakai), halaman A.
- **Ganti job** (Pelatih, hanya di kota): biaya `(200 + 30 × level) × 1,5^n`, n = jumlah ganti job sebelumnya. Tetap: level, EXP, semua gear (senjata kelas lain tetap di tas), koin, quest. **Per job tersimpan:** susunan SP, halaman A/B, ultimate terpasang, cabang Job Lanjutan. **Poin atribut dikembalikan gratis** tiap ganti job. Pertama kali masuk job yang belum pernah dipakai: senjata awalnya + SP bebas.

- **Di game (bagian B, 2026-11-11):** `CLASSES.novice` + `JOB_IDS` (`data/classes.js`), `pickJob`/`changeJob`/`jobChangePrice` (`meta/jobs.js`), batas level 10 (`levelCap`, `data/balance.js`), Pengembara tidak mendapat senjata dari drop, digambar sebagai Warrior anime berpakaian pengelana polos dengan pedang biasa. Buat Karakter tanpa pilihan kelas. Pelatih: bagian **Job** (Coba · Pilih · Ganti + harga). Penyederhanaan: memilih job terbuka langsung di Pelatih mulai level 5 (tanpa quest "Pilih Jalanmu"); **Coba Job** = lantai 1 Ruang Bawah Tanah Bayangan sebagai job itu (skill bawaan level 1, senjata biasa sementara), tidak disimpan, tanpa hadiah, keluar lewat Jeda → Menyerah atau tumbang (bukan arena boneka). Senjata job lain dilepas saat ganti job; kembali ke job lama memakai senjata terbaiknya di tas.

### 43.2 Poin skill (SP) & pohon skill
- **2 SP tiap naik level** (mulai level 2; level 50 = 98 SP). Pohon terisi penuh butuh ±170 SP → harus memilih.
- SP **menggantikan bakat (§21)**; 8 bakat lama pindah ke tab **Umum** dengan efek & batas sama.
- Pohon per job, 4 tab (angka di `data/skilltree.js`):

| Tab | Isi | Level | Biaya |
|---|---|---|---|
| Aktif | 8 skill job (§43.4), +2 skill cabang | 1–5 | 1 SP untuk level 1–2, 2 SP untuk level 3–5 (8 SP sampai maks) |
| Ultimate | Luas & Fokus (§43.5), +1 ultimate cabang | 1–3 | 3 SP per level |
| Pasif | 3 pasif khas job (§43.3), +2 pasif cabang | 1–3 | 2 SP per level |
| Umum | 8 bakat lama | 1–5 | 1 SP per level |

- Syarat buka = **level karakter** saja (`unlock`), tanpa syarat skill lain. Skill aktif harus level ≥ 1 untuk dipasang.
- **Level skill aktif:** damage +12% per level (level 5 = 148%); **level 3 dan level 5 memberi efek tambahan** (§43.4). **Level ultimate:** +15% damage per level; level 3: Luas durasi +0,5 dtk, Fokus area +20%.
- **Skill bawaan gratis (keputusan 2026-11-11):** dua skill job yang terbuka di level 1 mulai di **level 1 tanpa biaya SP** dan terpasang di A1/A2, karena karakter level 1 belum punya SP dan karakter lama bisa memakai 4 skill dengan sedikit SP. Atur ulang SP kembali ke susunan itu. Save §43 = **v25** (v24 dipakai buku monster §41.1).
- **Atur ulang SP** (Pelatih): `80 + 15 × level`, hanya job yang sedang dipakai. **Gratis** sekali setelah pembaruan dan pertama kali memakai job baru.
- **Tab Skill:** tab Aktif · Ultimate · Pasif · Umum + sisa SP; tiap baris ikon, nama, titik level (●●●○○), tombol **+**, tombol pasang; di atas daftar dua baris slot A1–A4 & B1–B4 + slot ultimate.

### 43.3 Pasif khas job (efek per level, maks 3)
| Job | Pasif |
|---|---|
| Warrior | **Darah Panas** Murka masuk +15% · **Kulit Baja** damage diterima −4% saat Murka > 50 · **Tebasan Lebar** lebar tebasan biasa +8% |
| Archer | **Napas Tenang** Bidik terisi +15% · **Kaki Ringan** gerak +4% · **Mata Tajam** kritis +3% ke musuh berjarak > 250 |
| Mage | **Darah Dingin** Panas turun +15% · **Hemat Mana** energi skill −5% · **Ledakan Besar** area skill +6% |
| Assassin | **Ingatan Otot** Kombo bertahan +1 dtk · **Bilah Racun** 5% peluang serangan biasa meracuni (3 dtk, 20% ATK tiap 0,5 dtk) · **Lolos Tipis** kritis +10% selama 2 dtk setelah menghindar |

### 43.4 Skill aktif: 8 per job, efek level 3 & 5
Enam skill lama tetap (angka §31/`data/classes.js` = level 1). Dua skill **tempo** baru per job: buka level 8 dan 12.

**Jenis tempo baru** (`kind` baru di `run/skills.js`):
- `charge` (isi): tahan → cincin terisi sampai `full` dtk; lepas → kekuatan menurut lama menahan. Penuh = kilatan + bunyi "ting".
- `channel` (salur): tahan sampai `max` dtk; jalan terus (tick), energi dikuras per detik (`drain`), gerak diperlambat.
- `chain` (rantai): tahap ① bayar energi; tekan lagi dalam `window` dtk → tahap berikut (maks 3); berhenti = cooldown mulai. Tombol berkedip selama jendela.
- `parry` (tangkis): jendela `window` dtk; terkena serangan/peluru (selain peluru merah "tak tertangkis") → damage batal + balasan; waktu melambat 0,15 dtk.
- `turret` / `clone` (pasang): benda/klon tinggal di arena `duration` dtk dengan bilah waktu kecil.
- `rune` (tanda tertunda): rune berdetak makin cepat lalu meledak setelah `fuse` dtk.

| Job | Skill | Jenis | Level 1 | L3 | L5 |
|---|---|---|---|---|---|
| Warrior | Putaran Pedang | area | (lama) | +2 tebasan | pusaran 2 dtk menarik musuh, 40% per tebasan |
| | Teriakan Baja | buff | (lama) | durasi +2 dtk | gelombang kejut membekukan 0,8 dtk |
| | Terjang | dash | (lama) | jarak +60 | jejak api 1,5 dtk, 30% tiap 0,25 dtk |
| | Retakan Bumi | line | (lama) | +2 pilar | pilar terakhir meledak besar (area 90, 300%) |
| | Kapak Bumerang | proj | (lama) | kapak kedua menyusul | kapak berputar di ujung 0,6 dtk sebelum kembali |
| | Amarah Perang | buff | (lama) | gerak +20% | Murka langsung +40 |
| | **Tebasan Raksasa** | charge | tahan s/d 1,2 dtk: tebasan depan, jangkauan 70→160, 200%→700%; penuh = menembus, dorong jauh, memecah perisai Berlapis; energi 40, cd 4 | jangkauan maks +30 | penuh dalam 0,8 dtk |
| | **Tangkis Baja** | parry | jendela 0,5 dtk; berhasil: gelombang 600% area 90, Murka +30; energi 20, cd 4 | jendela 0,7 dtk | peluru yang ditangkis memantul ke penembaknya |
| Archer | Hujan Panah | area | (lama) | area +25% | memperlambat 40% |
| | Panah Naga | proj | (lama) | jejak terbakar +1 dtk | dua naga (±10°) |
| | Panah Pecah | fan | (lama) | pecah jadi 4 | pecahan memantul sekali |
| | Lompatan Mundur | dash | (lama) | bisa 2× berturut | Bidik langsung penuh setelah melompat |
| | Ladang Jebakan | area | (lama) | durasi +2 dtk | meledak di akhir 300% |
| | Mata Elang | buff | (lama) | damage kritis +20% | panah biasa menembus 1 musuh selama buff |
| | **Sinar Panah** | channel | tahan s/d 2 dtk: sinar lurus 8×/dtk, 60% tiap tick; gerak −60%; energi 15 + 20/dtk, cd 5 | maks 3 dtk | lebar sinar ×2 di detik terakhir |
| | **Menara Panah** | turret | menara di titik bidik 8 dtk, tembak musuh terdekat tiap 0,4 dtk, 120%; maks 2; energi 35, cd 6 | tembakan menembus 1 | maks 3 menara |
| Mage | Nova Es | area | (lama) | beku +0,5 dtk | musuh beku yang mati pecah jadi 4 serpihan es 100% |
| | Badai Petir | storm | (lama) | +3 sambaran | tiap sambaran menyetrum area 50 |
| | Meteor | area | (lama) | area +25% | lava 2 dtk, 40% tiap 0,5 dtk |
| | Teleportasi | dash | (lama) | bisa 2× berturut | ledakan es di titik awal (150%, beku 0,8 dtk) |
| | Matahari Kecil | proj | (lama) | +3 serpihan | meledak dua kali |
| | Perisai Mana | buff | (lama) | durasi +2 dtk | meledak 300% area 100 saat habis |
| | **Bom Waktu** | rune | rune di titik bidik meledak setelah 2 dtk, 800% area 90; tiap pukulan pemain ke musuh di dalam rune +10% (maks +100%); energi 45, cd 6 | meledak setelah 1,5 dtk | rune kedua kecil (400%) 1 dtk kemudian |
| | **Semburan Api** | channel | tahan s/d 2 dtk: kerucut api jangkauan 120, 10×/dtk, 50% tiap tick; Panas +20/dtk; energi 15 + 15/dtk, cd 4 | kerucut +20° | membakar 2 dtk, 20% tiap 0,5 dtk |
| Assassin | Langkah Bayangan | dash | (lama) | bisa 2× berturut | bayangan menebas lagi 0,3 dtk kemudian |
| | Lingkaran Belati | fan | (lama) | +4 belati | belati kembali sekali ke pemain |
| | Kabut Racun | area | (lama) | area +25% | musuh di dalam kabut menerima +15% damage |
| | Bom Asap | buff | (lama) | beku +0,5 dtk | kebal 1 dtk saat dilempar |
| | Shuriken Raksasa | orbit | (lama) | radius +20 | membelah jadi 3 saat dilempar |
| | Naluri Pembunuh | buff | (lama) | durasi +2 dtk | tiap kill +0,5 dtk (maks +3 dtk) |
| | **Tarian Tiga Tebasan** | chain | ① melesat menebas 250% · ② putaran 300% area 70 · ③ tusukan menukik 600% + pingsan 1 dtk; jendela 0,8 dtk; energi 35 (tahap ①), cd 5 | jendela 1 dtk | tahap ③ menebar gelombang 300% area 100 |
| | **Klon Bayangan** | clone | klon 6 dtk meniru serangan biasa 50%; separuh musuh sekitar mengincar klon; energi 40, cd 10 | damage klon 70% | klon meledak 400% area 90 saat habis |

**Di game (bagian C, 2026-11-11):** `run/skilllevel.js` `leveled(def, level, ult)` (damage +12%/level termasuk `mult` bersarang, tambalan `lv3`/`lv5` di `data/classes.js`, teks efek `up`), run menerima `levels` (SP job) dan ultimate yang sudah di-level. Efek yang butuh mekanik baru dibuat saat skill dirapal (area tertunda: pusaran, lava, ledakan akhir, jejak api, gema bayangan, ledakan Perisai Mana) atau di `run/hits.js` (kapak berhenti di ujung, ledak dua kali, shuriken membelah), `run/run.js` (gerak dari buff, Kabut Racun +15%), `run/skilllevel.js` `levelDeath` (serpihan Nova Es, perpanjangan Naluri Pembunuh). **2× berturut** = cast kedua dalam 2 dtk (jeda 0,25 dtk), jeda penuh mulai setelah cast kedua atau jendela habis. Penyederhanaan: Panah Pecah L5 "memantul" → pecahan **menembus satu musuh lagi**; Lompatan Mundur kini mengisi Bidik penuh **hanya di L5** (dulu selalu). Tab Skill menampilkan baris L3/L5 (redup sampai tercapai).

**Dua halaman skill di game (bagian D, 2026-11-11):** run menyimpan `pageDefs`/`pageCd`/`pageCdMax` (2 × 4); `skillDefs`/`skillCd`/`skillCdMax` = halaman yang dipakai, jeda kedua halaman berjalan. **Q** (`core/input.js`) / tombol **⇄** kecil di samping tombol skill (A/B + 4 ikon redup halaman tersembunyi dengan jedanya) menukar seketika; terkunci di bawah level 15 atau bila halaman B kosong. Halaman terakhir diingat di `jobs[id].page`. Tab Skill: baris A1–A4 dan B1–B4 (B mulai level 15). Spanduk sekali saat mencapai level 15.

**Skill tempo di game (bagian E-1, 2026-11-11):** `run/tempo.js` (tahan-isi, salur, tangkis), `input.held` (tombol angka / tombol sentuh yang masih ditekan), klik kanan = batal. Tebasan Raksasa (Warrior, level 8), Tangkis Baja (Warrior, level 12), Semburan Api (Mage, level 12). Jeda mulai setelah tahan/salur selesai; skill lain tidak bisa dipakai selama menahan; tukar halaman membatalkan. Tanda di tanah: cincin terisi (terang saat penuh) dan perisai emas selama jendela tangkis. Gerak tubuh sementara meminjam Retakan Bumi / Teriakan Baja / Nova Es.

**Skill tempo E-2 (2026-11-11):** `run/summons.js` (menara, klon, rune) + rantai di `run/skills.js`. Sinar Panah (Archer 8), Menara Panah (Archer 12), Bom Waktu (Mage 8), Tarian Tiga Tebasan (Assassin 8; tombol berkedip selama jendela), Klon Bayangan (Assassin 12; satu klon sekaligus, musuh berindeks genap dalam 220 mengejarnya kecuali pemain < 80). Benda di arena digambar di lapisan tanah (menara kayu, bayangan ungu, rune berdetak dengan +%). **Peluru merah tak tertangkis:** spiral semua bos dungeon (`UNPARRYABLE`, `data/enemies.js`). Skill baru ditaruh di akhir daftar tiap job (urutan skill lama tetap).

### 43.5 Dua ultimate per job
- Keduanya buka **level 25**; satu dipasang di tombol 5 (tab Skill), tukar gratis di luar pertarungan; bar isi sama (`ULT`). Ultimate cabang (Job Lanjutan) = pilihan ketiga.
- **Luas** (yang sekarang): area besar, beberapa detik, damage tersebar. **Fokus** (baru): keluar < 1 dtk, area kecil, total ke satu sasaran ≈ **1,8×** Luas; meleset = bar tetap habis. Fokus punya tanda bidik singkat yang menyala, lalu getar layar keras + waktu melambat sesaat saat kena.

| Job | Luas | Fokus |
|---|---|---|
| Warrior | Badai Pedang (lama) | **Hantaman Langit**: melompat ke titik bidik, menghantam dalam 0,6 dtk, 1×5400%, area 70, pingsan 2 dtk; Murka penuh +30% |
| Archer | Hujan Bintang (lama) | **Panah Penembus Langit**: bidik 0,5 dtk lalu sinar lurus panjang lebar 40, 5400% ke semua di garis; Bidik penuh = pasti kritikal |
| Mage | Hujan Meteor (lama) | **Matahari Runtuh**: bola di titik bidik menyedot 0,8 dtk lalu meledak 1×6500% area 60; Panas > 80 tidak membuat terlalu panas |
| Assassin | Tarian Seribu Bayangan (lama) | **Eksekusi Bayangan**: teleport ke belakang musuh yang dibidik, 3 tebasan dalam 0,4 dtk total 5600%, kebal selama jurus; musuh biasa HP < 30% mati seketika; +10% per poin Kombo |

**Di game (bagian F, 2026-11-11):** `CLASSES[job].fokus` + `ults = [ult, fokus]`, mekanik `run/focus.js` (kind `focus`, `move`: leap / beam / implode / behind), tanda bidik `run.focusMark` di tanah, getar keras + waktu melambat saat kena (`h.focusHit`). Sinar Panah Penembus Langit = peluru sangat cepat yang menembus semua (tiap musuh kena sekali). Matahari Runtuh = benda `implode` (`run/summons.js`). "Panas > 80 tidak membuat terlalu panas" tidak perlu mekanik: ultimate memang tidak menambah Panas. Tombol Pakai ultimate hanya di kota. Gerak tubuh meminjam gerakan skill lama.

### 43.6 Dua halaman skill (A/B)
- Halaman A buka saat memilih job; **halaman B buka level 15** (pesan sekali). 4 slot per halaman; satu skill hanya di satu slot.
- Tukar: **Q** (PC), tombol **⇄** di atas tombol skill (HP). Langsung, tanpa cooldown. Cooldown halaman tersembunyi tetap berjalan; halaman tersembunyi tampil sebagai 4 ikon kecil redup + putaran cooldown, huruf A/B kecil menandai halaman aktif.
- Tukar halaman **membatalkan** skill `charge`/`channel` yang sedang ditahan dan `chain` yang sedang berjalan. Ultimate tidak ikut berganti. Halaman terakhir diingat per job.

### 43.7 Kontrol skill tempo
| Jenis | PC | HP (bidik otomatis) |
|---|---|---|
| charge | tahan tombol angka, penanda ikut mouse, lepas = tembak, klik kanan = batal | tahan tombol, lepas = tembak ke musuh terdekat di arah gerak |
| channel | tahan tombol angka, arah ikut mouse, lepas = berhenti | tahan tombol, arah ikut joystick gerak (diam = musuh terdekat) |
| chain | tekan tombol yang sama lagi | ketuk lagi |
| parry | langsung | langsung |
| turret / clone / rune | mode bidik §37 | bidik otomatis: musuh/kelompok terdekat |

### 43.8 Keseimbangan: musuh tidak gampang
- Proyek ini menambah kekuatan pemain (level skill, 8 slot, pasif, Fokus). **Kurva HP & ATK musuh per level** (`data/balance.js`) naik mengikuti rata-rata tambahan dari SP.
- **Tes patokan Vitest** (bot build rata-rata, level 10/20/30/40, kesulitan Normal): rombongan biasa selevel mati 4–8 dtk dengan skill; tanpa menghindar pemain kehilangan 40–60% HP melawan satu rombongan elite; bos selevel 60–90 dtk dengan ultimate Fokus. Tes gagal bila angka membuat game terlalu gampang.
- **Musuh membalas:** elite Berlapis kebal pingsan selama perisai ada; sebagian peluru musuh **merah = tak tertangkis**; musuh mengabaikan klon/menara bila pemain berada < 80 darinya.
- **Ujian Job Lanjutan** (Bayangan Diri) memakai angka kerasnya sendiri (tidak menunggu tingkat kesulitan §41.3).

**Di game (bagian G, 2026-11-11):** pengukuran awal membenarkan keluhan pemilik — HP hilang vs rombongan elite 0–19%, bos tumbang 5–34 dtk. Penyebab utama: **peluru & zona bahaya musuh tidak ikut skala** level/kesulitan (hanya damage sentuh). Kini semua yang dibuat seekor musuh (peluru, zona, jurus bos, ledakan saat mati) dikali `foePower` (kesulitan dungeon × level dunia × elite × `ENEMY_POWER`), dan `data/balance.js` `ENEMY_POWER = { hp: 2.2, bossHp: 7.5, dmg: 4.5, bossDmg: 0.6 }`, `data/world.js` `FIELD_SCALE = { hp: 0.32, dmg: 0.06 }` (dulu 0,2 / 0,075). Tes patokan `run/bench.test.js` (bot `run/benchkit.js`: SP ke 4 skill utama lalu pasif, Fokus mulai 25, atribut rata, gear rarity naik per 12 level; tanpa menghindar): rata-rata rombongan 5,4 dtk, elite −56% HP, bos 89 dtk (bot kebal untuk bos: hanya waktunya yang diukur). Sebaran per level masih ada (elite ±31% di level 10, ±80% di level 40) — dibatasi longgar per level, disetel lagi bersama rasa main pemilik. Elite Berlapis kebal beku/pingsan selama perisainya ada.

### 43.10 Job Lanjutan (bagian H, dirancang 2026-11-11 atas "lakukan semuanya")
- **Syarat & ujian:** level 30 + job dipilih → Pelatih: **Ujian Cabang**. Arena = lantai 5 Ruang Bawah Tanah Bayangan tanpa gelombang, melawan **Bayangan Diri** (bos `shadowself`: gambar hero-mu sendiri yang digelapkan + aura ungu, jurus bos umum + menerjang; HP & damage sendiri di `data/enemies.js`, diskalakan level). Tidak disimpan, tanpa hadiah; menang → pilih satu dari dua cabang (gratis pertama kali). Kalah/menyerah → kembali ke kota, boleh coba lagi.
- **Ganti cabang** di Pelatih: `JOB_CHANGE` × 2 (tanpa ujian ulang). Cabang tersimpan per job (`jobs[id].branch`, sudah ada di save v25 → **tanpa versi save baru**).
- **Isi tiap cabang:** penanda mekanik khas (`trait` fx), 2 skill (buka level 30 & 35), 1 ultimate (level 30, tab Ultimate, pilihan ketiga), 2 pasif (3 level), gelar di Karakter & HUD, warna aura. Skill & ultimate cabang memakai jenis yang sudah ada (area, dash, fan, buff, orbit, clone, line, focus) + satu jenis baru `rewind`.

| Job | Cabang | Mekanik khas berubah | Skill (lv 30 / 35) | Ultimate | Pasif |
|---|---|---|---|---|---|
| Warrior | **Berserker** | Murka tidak turun selama menyerang; damage naik makin rendah HP (s/d +40% di HP 20%); tanpa pengurangan damage Murka | Amuk Darah (buff ATK & kec. serang +40%, menghisap 3%, damage diterima +20%) · Lompatan Amuk (dash 600%, kill = siap lagi) | Ragnarok (area 2 dtk, 8×400%) | Haus Darah (damage di HP rendah +15%/lv) · Kulit Tebal (HP maks +5%/lv) |
| Warrior | **Paladin** | tiap pukulan biasa menambah perisai suci 1% HP maks (maks 20%); pulih 1% HP/dtk; pukulan biasa mendorong | Perlindungan Suci (buff damage diterima −60% 6 dtk) · Palu Penghakiman (area di bidik 500%, beku 0,6) | Tanah Suci (area 3 dtk, 6×250%) | Iman (pulih +0,3%/dtk/lv) · Benteng (DEF +2/lv) |
| Archer | **Penembak Jitu** | Bidik terisi 50% lebih cepat; tembakan Bidik +1% damage tiap 4 unit jarak | Tembakan Kepala (panah 700%, menembus 2, bidik 0,4 dtk) · Fokus Mantap (buff kritis +40%, dmg kritis +50%) | Mata Maut (Fokus sinar 7000%) | Jarak Jauh (+10%/lv damage jauh) · Sabar (Bidik +20%/lv) |
| Archer | **Pemburu** | panah biasa 25% memantul (petir berantai); damage +15% saat bergerak | Panggil Serigala (klon pendamping 12 dtk, 80%) · Hujan Lari (kipas 7 panah 160%) | Gelombang Buru (garis 8 pilar 300%) | Lincah (kec. serang +4%/lv) · Pelacak (+5%/lv damage saat bergerak) |
| Mage | **Penyihir Api** | Panas penuh = ledakan besar di sekitar (r 150, 600%) dan kepanasan lebih singkat; jeda skill +10% | Badai Api (area di bidik 2 dtk, 6×160%) · Bakar Habis (area 500% di sekitar) | Supernova (area 2000% r 220) | Pemantik (skill membakar 8%/lv) · Jantung Api (damage skill +4%/lv) |
| Mage | **Penyihir Waktu** | musuh dalam 150 di sekitarmu −30% gerak; 6% peluru dipantulkan | Putar Balik (kembali ke posisi & HP 3 dtk lalu) · Medan Waktu (area di bidik 4 dtk memperlambat) | Hentikan Waktu (area r 260 membekukan 4 dtk, 200%) | Percepat (CDR +3%/lv) · Tangkis Waktu (pantul +6%/lv) |
| Assassin | **Bayangan** | 1,5 dtk setelah menghindar/teleport: pukulan pertama pasti kritikal ×1,5 | Menghilang (kebal 1,5 dtk + jendela serang) · Serangan Bayangan (dash 600%) | Gerhana Bayangan (Fokus belakang 7000%) | Gorok (dmg kritis +8%/lv) · Selubung Malam (bonus serangan bayangan +15%/lv) |
| Assassin | **Penari Pedang** | Kombo maks 10 (bukan 5); kec. serang +3% per poin Kombo; putus = hilang semua | Pusaran Pedang (pedang mengitari 3 dtk) · Hujan Tebasan (kipas 9 belati 180%) | Seribu Sayatan (area 2,5 dtk, 20×120%) | Irama (+1%/lv kec. serang per Kombo) · Tajam (kritis +2/lv) |

- **Teks** dua bahasa. **Bagian kerja:** H-a ujian + pilih/ganti cabang + gelar + kerangka efek cabang; H-b isi Warrior & Archer; H-c isi Mage & Assassin; masing-masing dites & di-commit.
- **Catatan pelaksanaan (2026-11-11, dikerjakan sekaligus):** data `data/branches.js` (`BRANCH`, `BRANCHES`, `skillPool`); efek di `run/branch.js` + `run/traits.js` (Murka/Panas/Kombo) memakai kunci `fx` (`rageKeep`, `lowHpDmg`, `rageNoArmor`, `holyShield`, `basicKnock`, `snipe`, `moveDmg`, `farDmg`, `heatBlast`, `overheatShort`, `timeSlow`, `timeReflect`, `ambush`, `ambushDmg`, `comboMax`, `comboSpd`, `skillBurn`), sisanya memakai efek gear yang sudah ada (`regen`, `chain`, `skillDmg`). `meta/jobs.js` `pickBranch` / `changeBranch` / `canTrial`; validasi save menerima `branch` yang sah. Arena `TRIAL_DUNGEON` (`data/dungeons.js`, `trialAt(level)`: HP ×4,5, damage ×3,2 di level 30, +4% per level di atasnya — patokan bot ±1,5 menit, bot yang tidak menghindar kehilangan 40–100% HP dalam 30 dtk). Menang → dialog dua pilihan (pertama gratis). Gambar Bayangan Diri: `art/bosses/shadow.js` (hero pemain via `drawAnime`, ditelan bayangan, mata merah) + aura pixel ungu. Aura cabang `art/branchaura.js`; gelar di Karakter & daftar slot. CHEAT → "Lulus Ujian Cabang".

### 43.9 Data, save, urutan
- Data: `data/classes.js` (+`novice`, skill tempo, ultimate Fokus, efek `lv3`/`lv5`), `data/skilltree.js` (biaya SP, pasif, Umum), `data/balance.js` (SP per level, biaya ganti job, kurva musuh). Logika murni + tes: `meta/jobs.js` (pilih/ganti job, biaya, SP, susunan per job), `run/skills.js` + modul jenis tempo di `run/`. Teks dua bahasa (§23).
- **Save** (versi berikut yang tersedia saat dikerjakan; Quest Beragam memakai v23): `jobs { [classId]: { sp { [id]: level }, pages [[4], [4]], page, ult, branch } }`, `jobChanges`; `skills` dan `talents` dihapus. Validasi: SP terpakai per job ≤ 2 × (level − 1). `migrate()`: `classId` tetap (karakter lama dianggap sudah memilih job), skill yang terpasang jadi level 1 di halaman A, sisa SP bebas, bakat lama dikembalikan jadi SP + pesan sekali "Poin skill dikembalikan, susun lagi di tab Skill".
- **Bagian kerja** (cek manual tiap bagian): A Pengembara & pilih/ganti job & Coba Job · B SP, pohon, tab Skill, Umum, atur ulang · C level skill & efek L3/L5 · D dua halaman · E skill tempo (per jenis) · F ultimate Fokus · G keseimbangan & tes patokan · H Job Lanjutan (§41.4: ujian, cabang dengan 2 skill + 1 ultimate + 2 pasif; dirinci saat bagian G selesai).
- **Urutan proyek:** §41 proyek A (musuh beragam) dan B (bos khas), yang sudah berjalan, selesai dulu → **§43** → §41 proyek C (9E). Proyek D §41 digantikan bagian H.

## 44. Cerita & Cutscene (permintaan pemilik 2026-11-11)

Masalah: cerita hanya tersampaikan lewat teks di kotak dialog dan satu panel epilog. Keputusan: cutscene di dalam game (bukan video), pendek (±10–40 detik), bisa dilewati, bisa diputar ulang.

- **Panggung pixel:** adegan digambar di kanvas kecil 480×270 lalu diperbesar tanpa penghalusan; aktor (hero anime, warga, bos anime `art/bosses`) memakai filter pixel game. Latar per tempat dilukis kode (langit, siluet berlapis paralaks, tanah; dungeon dengan obor). Teks (dialog dengan potret pembicara, kartu judul) tetap tajam di atasnya. Pita sinematik atas-bawah, tombol **Lewati**.
- **Naskah sebagai data** (`data/scenes.js`): langkah `bg, put, hide, cam, move, look, say, panel, title, fx, fade, wait` (lihat komentar di file). Pemutar murni `run/cutscene.js` (+ tes), gambar `render/cutscene.js`, lapisan DOM `ui/cutscene.js`. Ketuk/klik/Spasi/Enter/E = lanjut (teks langsung utuh, lalu lanjut); Esc = lewati; baris lanjut sendiri setelah waktu baca.
- **Adegan:** Pembuka (kilas balik 2 panel ilustrasi + Kakek Odo, saat karakter baru dibuat) · kemunculan 6 bos (sekali per sesi per bos) · Pecahan Segel I–V (setelah bab selesai; penglihatan tempat berikutnya) · Celah Tanah Gerhana (setelah pecahan kelima) · Epilog "Fajar Kembali" (sebelum panel catatan akhir) · momen kecil setelah Kawal/Penyelamatan (§42).
- **Panel ilustrasi:** `public/img/story_past_eclipse.webp`, `story_past_seal.webp` bila ada (prompt di `docs/2026-10-29-prompt-gambar.md` bagian D); bila belum ada, digambar kode bergaya sepia.
- **Kenangan:** panel di Jurnal, memutar ulang adegan yang sudah dialami (diturunkan dari progres, tanpa data save baru). Panel CHEAT punya tombol semua adegan untuk uji.
- Teks dua bahasa di `i18n/en-story.js`.
