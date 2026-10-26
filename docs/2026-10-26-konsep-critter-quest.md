# Konsep Game — "Critter Quest" (nama sementara)

| | |
|---|---|
| **Status** | DRAF brainstorming untuk versi RPG penuh — masih ada pertanyaan terbuka (lihat §12). Langkah pertama yang sedang dibangun: **versi Arcade**, lihat `superpowers/specs/2026-10-26-critter-quest-arcade-design.md` |
| **Tanggal** | 2026-10-26 |
| **Asal** | Pengembangan dari prototipe `app/` (Critter Survivors) menjadi action RPG |
| **Tanda** | *(ide)* = usulan tambahan, boleh dibuang |

---

## 1. Ringkasan

Action RPG berbasis browser yang bisa dimainkan di **PC dan HP**. Pemain membuat karakter sendiri, memilih 1 dari 4 kelas, berpetualang di dungeon untuk mendapat EXP, uang, dan gear, lalu kembali ke kota untuk memperkuat diri. Di level tertentu karakter naik ke **job lanjutan**. Tampilan karakter berubah sesuai gear yang dipakai.

## 2. Keputusan yang sudah diambil

| Topik | Keputusan |
|---|---|
| Genre pertarungan | **Action RPG** — pemain mengendalikan serangan sendiri (gaya Diablo / Ragnarok Online) |
| Platform | Browser, harus nyaman di **HP** juga |
| Kustomisasi karakter | Saat dibuat **hanya rambut**; selebihnya tampilan ditentukan **gear yang dipakai** (paper doll) |
| Mode | **Satu pemain** dulu; fitur online menyusul nanti |
| Save | **Di browser** (IndexedDB), tanpa server — data disusun agar bisa dipindah ke server nanti |
| Hosting | **Gratis**, file statis |

## 3. Alur bermain

```
KOTA ──► siapkan diri (beli/tempa gear, ambil quest, beli potion)
  ▲              │
  │              ▼
  │        MASUK DUNGEON ──► lantai 1 → 2 → 3 → BOS
  │              │            (bertarung, dapat EXP, uang, loot)
  │              ▼
  └──── pulang (menang) / mati (loot bawaan hilang sebagian)
```

Satu kali masuk dungeon ± **5–15 menit** — cocok untuk sesi singkat di HP.

## 4. Karakter

- **Pembuatan karakter:** nama, gaya + warna rambut, pilih 1 dari 4 kelas.
- **3 slot karakter** per pemain.
- **Gear yang terlihat di badan:** senjata, helm, armor badan, sepatu.
- **Gear tidak terlihat (stat saja):** cincin, kalung.
- Helm yang dipakai menutupi rambut.
- *(ide)* **Tukang Cukur** di kota — ganti rambut dengan bayaran uang.

### Lapisan gambar karakter (paper doll)

```
senjata      ← sesuai senjata (pedang/busur/tongkat/belati)
helm         ← menutupi rambut bila dipakai
armor badan
celana / sepatu
rambut       ← dipilih saat membuat karakter
badan dasar
```

Setiap lapisan wajib memakai **kerangka animasi yang sama** dengan badan dasar (jalan, serang, kena serang, mati; beberapa arah) agar gear tidak terlihat melayang.

## 5. Kelas & Job Lanjutan

Job lanjutan di **level 30** lewat **Ujian Job** (dungeon khusus). Tiap kelas bercabang dua:

| Kelas awal | Gaya | Cabang A | Cabang B |
|---|---|---|---|
| **Warrior** | Jarak dekat, tahan banting | **Knight** — perisai, menarik perhatian musuh | **Berserker** — damage besar, makin kuat saat HP rendah |
| **Archer** | Jarak jauh, gesit | **Ranger** — tembakan beruntun, jebakan | **Beastmaster** *(ide)* — hewan peliharaan ikut bertarung |
| **Mage** | Sihir area, rapuh | **Wizard** — api / es / petir | **Cleric** — penyembuhan diri, sihir suci |
| **Assassin** | Cepat, kritis | **Shadow** — menghilang, serangan dari belakang | **Venomancer** *(ide)* — racun menumpuk |

- Tiap kelas: **serangan dasar + 3 skill + dodge**.
- Setelah job lanjutan: **+1–2 skill**.
- Jenis senjata per kelas: Warrior = pedang, Archer = busur, Mage = tongkat, Assassin = belati.

## 6. Pertarungan

| | PC | HP |
|---|---|---|
| Gerak | WASD | Joystick virtual (kiri) |
| Bidik & serang | Mouse | Tombol serang (kanan) + **bidik otomatis** ke musuh terdekat |
| Skill | Tombol 1–3 | Tombol skill (kanan) |
| Menghindar | Spasi | Tombol dodge |

- Musuh punya **pola serangan yang bisa dibaca** (ada tanda sebelum menyerang) sehingga menghindar penting — inti rasa seru action RPG.

## 7. Item & Rarity

### 7.1 Tingkat rarity

| Tingkat | Warna | Isi | Sumber |
|---|---|---|---|
| **Biasa** | Putih | Stat dasar saja | Musuh biasa, toko |
| **Bagus** | Hijau | Stat dasar + **1** bonus acak | Musuh biasa |
| **Langka** | Biru | Stat dasar + **2** bonus acak | Musuh elite, peti |
| **Epik** | Ungu | Stat dasar + **3** bonus acak, stat dasar sedikit lebih tinggi | Elite, bos |
| **Legendaris** *(ide)* | Oranye | Stat tetap + **1 efek unik** yang mengubah cara main | Hanya bos, peluang kecil |

Contoh efek Legendaris:
- **Busur Angin Utara** — panah memantul ke 2 musuh lain.
- **Jubah Bayangan** — setelah dodge, serangan berikutnya pasti kritis.
- **Palu Gempa** — tiap serangan ke-5 memicu gempa kecil.

### 7.2 Contoh kartu item

```
┌──────────────────────────────┐
│ Pedang Taring Serigala  +3   │  ← nama + level tempa
│ LANGKA · Pedang · Lv 12      │  ← warna biru
├──────────────────────────────┤
│ ATK 24 (+6 dari tempa)       │  ← stat dasar
│ + 8% Kecepatan Serang        │  ← bonus acak 1
│ + 15 HP Maks                 │  ← bonus acak 2
├──────────────────────────────┤
│ Khusus: Warrior · Butuh Lv 10│
└──────────────────────────────┘
```

### 7.3 Aturan

- **Stat dasar** mengikuti **level item** (makin dalam dungeon, makin tinggi).
- **Daftar bonus acak:** STR / AGI / INT / VIT, ATK, peluang kritis, damage kritis, kecepatan serang, kecepatan gerak, HP maks, pemulihan HP, lifesteal, damage elemen, pengurangan cooldown.
- **Rarity** menentukan **jumlah bonus**; **tempa** menaikkan **stat dasar**. Item Langka +7 bisa mengalahkan Epik +0.

### 7.4 Peluang drop (awal, disetel saat uji main)

| | Biasa | Bagus | Langka | Epik | Legendaris |
|---|---|---|---|---|---|
| Musuh biasa | 70% | 23% | 6% | 1% | — |
| Bos | — | — | 60% | 35% | 5% |

Bos **selalu** menjatuhkan minimal Langka.

### 7.5 Rasa memuaskan

- Item di tanah memancarkan **sinar warna rarity**; Epik/Legendaris disertai suara khusus.
- Gear Epik/Legendaris yang dipakai **sedikit bercahaya** di badan karakter.
- *(ide)* **Hancurkan item** menjadi bahan tempa — gudang tidak penuh sampah, uang tidak menumpuk.

## 8. Dungeon

- Tata ruang **diacak setiap kali masuk**.
- Tiap dungeon punya tema, musuh, dan bos sendiri. Contoh urutan: **Gua Lendir → Hutan Terkutuk → Kuil Tenggelam → Benteng Api**.
- Struktur: beberapa lantai, bos di lantai terakhir.
- *(ide)* **Mode Neraka** untuk dungeon yang sudah tamat — musuh lebih kuat, loot lebih bagus.

## 9. Kota & Ekonomi

| NPC | Fungsi |
|---|---|
| Pedagang | Potion, gear dasar, jual loot |
| Pandai Besi | Tempa +1 s/d +10 |
| Master Job | Ujian job lanjutan |
| Papan Quest *(ide)* | Misi ("bunuh 20 lendir") berhadiah uang/item |
| Gudang | Simpan gear |
| Tukang Cukur *(ide)* | Ganti rambut |

- **Sumber uang:** musuh, jual loot, quest.
- **Pemakaian uang:** potion, tempa, beli gear, ganti rambut.
- *(ide)* **Tempa gaya Ragnarok:** +1 s/d +4 selalu aman; di atas +4 ada risiko gagal (gear turun level). Penyerap uang utama.

## 10. Teknis

### 10.1 Save

- Disimpan di **IndexedDB** browser, **satu objek JSON bernomor versi** (karakter, gear, uang, progres).
- **Ekspor/impor save** (unduh/unggah file) — pengaman sekaligus cara pindah PC ↔ HP.
- Struktur data disiapkan agar kelak cukup mengganti tempat simpan ke server tanpa mengubah logika game.

### 10.2 Hosting gratis

| Layanan | Peran |
|---|---|
| **Cloudflare Pages** (atau GitHub Pages / Netlify) | Rumah utama, deploy otomatis saat kode di-push |
| **itch.io** | Etalase — tempat pemain menemukan game |

Catatan penting:
- **Save terikat alamat situs** — pilih satu alamat sejak awal; pindah alamat = save lama tidak ikut.
- **Safari iPhone menghapus data situs yang tidak dibuka 7 hari.** Solusi: jadikan **PWA** (pasang ke layar utama) + tombol ekspor save.

### 10.3 Aset

| Pilihan | Kelebihan | Kekurangan |
|---|---|---|
| 1. Dibuat Claude lewat kode | Cepat mulai, tanpa urusan lisensi | Sederhana (± 24 px, sedikit frame) |
| 2. Paket **LPC** (Liberated Pixel Cup) | Paper doll lengkap 4 arah; animasi cocok untuk 4 kelas (tebas, panah, rapal, tusuk) | Lisensi CC-BY-SA / GPL — wajib kredit, turunan dibagikan dengan lisensi sama |
| 3. **Gabungan** *(usulan)* | Karakter & gear dari LPC; tile, musuh, efek, suara dibuat Claude / paket CC0 | Perlu mengunduh aset LPC |

Semua gambar dimuat lewat **sprite sheet** agar bisa diganti tanpa mengubah logika game.

### 10.4 Belum dibahas

- Pilihan engine (lanjut canvas murni seperti prototipe, atau memakai engine seperti Phaser).
- Struktur kode dan pembagian modul.

## 11. Tahapan Pembangunan

| Tahap | Isi | Hasil |
|---|---|---|
| **1** | Buat karakter (rambut), 4 kelas + skill dasar, 1 dungeon, drop gear (Biasa–Epik) yang terlihat di badan, save, kontrol HP | Bisa dimainkan; uji apakah pertarungan seru |
| 2 | Kota, uang, Pedagang, Gudang, UI inventori | Alur kota ↔ dungeon lengkap |
| 3 | Pandai Besi (tempa), Papan Quest, dungeon ke-2 & ke-3, Legendaris | Progres lebih panjang |
| 4 | 8 job lanjutan + Ujian Job | Tujuan jangka panjang |
| Nanti | Online, party, trading | Bila diinginkan |

### Perkiraan token (kasar, bisa meleset ±2×)

| Tahap | Perkiraan kode | Token output | Total diproses (mayoritas cache) | Sesi kerja |
|---|---|---|---|---|
| 1 | 6–8 rb baris | 0,4–0,8 jt | 20–50 jt | 4–8 |
| 2 | 3–4 rb baris | 0,2–0,4 jt | 10–25 jt | 2–4 |
| 3 | 3–5 rb baris | 0,3–0,5 jt | 15–30 jt | 3–5 |
| 4 | 3–5 rb baris | 0,3–0,5 jt | 15–30 jt | 3–5 |
| **Total** | **15–22 rb baris** | **1,2–2,2 jt** | **60–135 jt** | **12–22** |

Cadangkan **+30–50%** untuk perbaikan bug dan penyeimbangan. Penghematan terbesar: spesifikasi tertulis sebelum coding, satu sesi baru per tahap, dan memakai LPC untuk karakter.

## 12. Pertanyaan Terbuka

1. **Rarity:** 5 tingkat (Legendaris dibuat di tahap 3) atau cukup 4 tingkat? — *usulan: 5 tingkat*
2. **Aset:** 1 (buat sendiri) / 2 (LPC) / 3 (gabungan)? Ada rencana game dijual? — *usulan: 3*
3. **Nama & cabang job** — setuju dengan tabel §5, atau ada yang diganti?
4. **Hukuman mati di dungeon** — berapa banyak loot/uang yang hilang?
5. **Sistem tempa** — pakai risiko gagal di atas +4 atau selalu aman?
6. **Engine & struktur kode** — dibahas setelah konsep disetujui.
7. **Nama game** final.

## Lampiran — Prototipe `app/`

`app/` berisi prototipe awal **Critter Survivors** (survival arena, serangan otomatis; Vite + JavaScript murni). Menjalankan:

```bash
cd app
npm install --replace-registry-host=always   # lockfile menunjuk mirror msh.team yang tidak terjangkau
npm run dev                                   # http://localhost:5173
```

Bug yang sudah diperbaiki 2026-10-26: kartu level-up tidak bisa diklik mouse, pemain bisa hidup lagi setelah mati, HUD senjata tertinggal, getar layar merusak replay deterministik, permata di luar layar tetap digambar, tombol suara tertutup layar menu, sprite asimetris. Belum diubah: semua senjata berbagi masa kebal musuh (soal keseimbangan).
