# DESIGN.md: Critter Quest

Arah gaya yang sudah diputuskan pemilik. File ini hanya menyalin keputusan yang sudah ada
(sumbernya ditulis di setiap baris); tidak ada arah baru di sini. Ubah sesukamu.

## Identitas

- **Game:** roguelite aksi di browser, dark fantasy. Pemain PC dan HP (HP hanya mendatar). (sumber: spesifikasi §1, §27)
- **Gaya gambar:** komik gelap yang terinspirasi Hades: bentuk bersudut, bayangan cel tegas, cahaya tepi
  berwarna, garis tinta tipis. Gerakan berkeyframe yang luwes (ancang-ancang, jeda, tebasan cepat,
  overshoot); gerakan kaku ditolak. (sumber: `app/char.html` gaya D, keputusan 2026-10-28)
- **Bukan:** pixel art jadul, kartun chibi kepala bulat ("seperti game anak kecil"). (sumber: 2026-10-26, 2026-10-28)
- **Tampilan:** 2.5D. Dunia 3D dibuat lewat kode, karakter/monster/NPC 2D tegak (billboard). Kamera tetap
  miring + zoom. (sumber: rencana `2026-10-28-tampilan-2.5d.md`)
- **Tanpa file gambar/suara:** semua aset dibuat lewat kode, kecuali latar layar penuh (judul, loading, epilog) hasil generator gambar, dengan gaya komik gelap yang sama. (sumber: CLAUDE.md, keputusan 2026-10-29)

## Suasana

- Dunia malam/suram dengan cahaya lentera dan obor; karakter dan UI tetap berwarna agar kontras. (sumber: 2026-10-26)
- Tema gelap dipilih sengaja ("aku mau temanya dark"), bukan bawaan. (sumber: 2026-10-26)
- Efek gear/skill memang "lebay" (sengaja meriah), tetapi tidak boleh lag di HP lemah (mode Ringan). (sumber: rencana Efek Lebay, 2.5D)

## UI

- Panel datar gelap, bingkai emas tipis, sudut terpotong (bukan membulat), slot skill belah ketupat,
  ultimate segi enam. (sumber: `app/ui.html` disetujui 2026-10-28, `src/ui/theme-dark.css`)
- Tombol berbingkai logam, panel berbingkai ganda. (sumber: spesifikasi §19, 8D)

## Palet

Dari `src/ui/theme-dark.css` dan spesifikasi §19:

- Arang (latar panel): `#110d15`, `#0b080e`
- Perunggu / emas (bingkai, judul, aksen): `#4a3a28`, `#6e5426`, `#c9a24a`, `#e8cf8e`
- Merah tua (tombol utama, bar HP): `#c8323e`, `#5a1620`
- Biru (bar energi): `#3a78c8`
- Emas juga untuk bar EXP.
- Garis tinta bersama: `#16121c`

## Huruf

- **Cinzel**: judul, nama, tombol (rasa ukiran/prasasti fantasi). (sumber: spesifikasi §19, 8D)
- **Barlow**: teks isi dan angka di kanvas (mudah dibaca kecil). (sumber: spesifikasi §19, 8D)

## Bahasa

- Dua bahasa, Inggris bawaan, Indonesia pilihan (tombol EN · ID). (sumber: spesifikasi §23)

## Dial (diserahkan pemilik ke Claude, 2026-10-29)

Dial: ENERGY 3 / RHYTHM 2 / MOTION 3
(ENERGY tinggi karena efek "lebay" dan judul api unggun; RHYTHM sedang karena panel game memakai pola
yang sama dengan sengaja; MOTION tinggi karena animasi karakter, efek skill, dan pop-up hadiah.)

## Pengecualian antislop (disetujui pemilik 2026-10-29)

- Zoom halaman diblokir (`user-scalable=no`, R-39): cubit dipakai untuk zoom kamera, dan zoom browser
  merusak joystick. (sumber: audit-001 nomor 6)
