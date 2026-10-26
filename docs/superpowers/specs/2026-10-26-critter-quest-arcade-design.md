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
