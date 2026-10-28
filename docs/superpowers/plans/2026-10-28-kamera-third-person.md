# Kamera third-person (ditunda)

Status: **dicatat, belum dikerjakan** (pemilik, 2026-10-28: "catat dulu, nanti saja").
Prototipe: `app/pov.html` + `app/pov/main.js` (tidak ikut build; buka `/pov.html` saat `npm run dev`).

## Keputusan sementara
- Pemilik paling suka **Opsi 2 — kamera ikut berputar di belakang karakter** (2.5D: lantai & dinding berperspektif, karakter/monster = billboard tegak, tetap canvas 2D).
- Pilihan kamera di pengaturan: **Atas / Opsi 1 (miring dari belakang, arah tetap) / Opsi 2**. Satu mesin kamera untuk ketiganya; mode Atas = kamera bersudut ±89°. Tidak mempertahankan renderer lama.
- Logika `run/` & `meta/` dan struktur save **tidak berubah**. Pengaturan baru `camera` → versi pengaturan naik + `migrate()`.

## Kontrol HP (hasil uji di prototipe)
- **Joystick kiri = hanya jalan** (relatif terhadap kamera). Kamera tidak ikut berputar saat berjalan — "kamera ikut otomatis" mati bawaan, bisa dinyalakan.
- **Joystick kanan = tembak + arah kamera**: dorong ke arah mana pun → menembak ke sana (bidik otomatis yang "lengket" ke musuh di arah itu); dorongan ke kiri/kanan memutar kamera, makin jauh makin cepat.
- Skill 1–4 + ultimate melingkari joystick kanan; skill area jatuh di target terkunci / arah joystick kanan / musuh di depan.
- Ketuk monster = kunci target (kamera menjaga target di depan); seret area kosong kanan = putar kamera.
- Panah merah di tepi layar untuk musuh di luar pandangan (bos: lebih besar, tepi emas).
- Tombol atas: KAMERA, KUNCI, AUTO, LAYAR PENUH (Android: kunci mendatar; iPhone Safari tidak mendukung layar penuh).
- Pengaturan: sensitivitas putar 0,3×–2,5×, kamera ikut otomatis nyala/mati.
- Masukan pemilik: versi pertama terasa "ringkih" karena kamera ikut berputar saat berjalan → diganti skema dua joystick di atas. **Belum dicoba ulang** oleh pemilik.

## Performa
- Monster dipanggang ke kanvas sekali per jenis (seperti `bakeAll`), bukan digambar vektor tiap frame: Opsi 2 naik dari ±45 ke 60 FPS di PC.
- Resolusi turun otomatis (100% → 85% → 70% → 55%) bila FPS < 45 selama ±2 detik.

## Yang masih harus diputuskan / dikerjakan nanti
- [ ] Pemilik mencoba ulang skema dua joystick di HP (sensitivitas, ukuran & posisi joystick kanan, kekuatan bidik otomatis)
- [ ] Seni tampak belakang/samping untuk karakter & monster (Opsi 2 sekarang memperlihatkan tampak samping)
- [ ] Mesin kamera di game: dungeon dulu, lalu wilayah, kota, interior; peta & peta mini tetap dari atas
- [ ] Kontrol PC Opsi 2: kunci mouse + WASD relatif kamera (sudah ada di prototipe)
- [ ] Telegraf bos, efek lantai (rune, retakan, kawah) digambar di bidang lantai berperspektif
- [ ] Uji tiap layar di 3 mode, PC & HP
