# HUD, Dialog & Toko Baru — Rencana Kerja

> **Untuk agen:** kerjakan per bagian (A–D), berhenti di akhir tiap bagian untuk cek manual pemilik (host lokal, pemilik kirim screenshot; jangan uji browser otomatis), commit setelah oke. Spesifikasi §45. Contoh acuan: `app/hud.html?v=A`, `app/dialog.html?v=A` / `?v=C` (jangan dihapus; pembanding). Angka (ukuran, sudut, waktu, radius) di `data/hud.js`. `run/` & `meta/` murni + tes. Teks baru `tr()`/`t()` + kamus EN. `?lama` = HUD & dialog lama. Commit tanpa Co-Authored-By. Tanpa perubahan save.

**Arsitektur:** HUD tetap DOM (`index.html` + `ui/hud.js` + `ui/theme-dark.css`), markup diganti ke dock bola + kipas sentuh; `updateHUD`/`updateActions`/`updateBelt` tetap jadi titik isi (id elemen dipertahankan bila bisa supaya `ui/touch.js`, cheat & tes tidak patah). Dialog: `ui/npc.js` `renderNpc` → tata letak potret-di-belakang-kotak; potret baru dibidik dari kepala (ganti/benahi `art/bust.js`); emosi `meta/mood.js` (murni) + CSS. Gelembung warga: lapisan DOM di atas kanvas kota memakai proyeksi dunia→layar yang sudah dipakai tanda/label kota. Toko: modul baru `ui/shopui.js` (kisi + kartu + tanda beli) dipakai `npc.js` untuk Brom.

## Bagian A — HUD Bola & Bingkai
- [x] A1 `data/hud.js` (ukuran bola PC/HP, sudut & jari-jari kipas, waktu hiasan, ambang HP kritis 0.3). Markup dock baru di `index.html`: bola HP/Energi (cairan, gelembung, rune), bingkai tengah (EXP + LV, baris skill, sabuk), kipas sentuh (serang, 4 skill, ultimate, menghindar, ⇄, mount), info wilayah kiri atas, peta mini bulat kanan atas.
- [x] A2 `ui/hud.js`: isi bola (tinggi cairan, angka), cincin mekanik kelas di bola Energi (Murka/Panas/Bidik; Kombo = titik di cincin), cooldown melingkar + detik, letupan saat siap, ultimate cincin isi + kilatan penuh, chip buff, halaman skill ⇄ (§43.6), rantai skill (§43.4), skill tempo tahan (§43.4), mount; tepi layar merah saat kena pukul & HP < 30% (gantikan kilatan `#dmg`).
- [x] A3 `theme-dark.css` (dipasang di `ui/hud-orb.css` + `ui/hudorb.js`): warna gelap, tombol bulat, semua hiasan beranimasi (§45.1), versi HP (pointer:coarse + mendatar) dengan kipas & jarak tepi 30 px, layar pendek ≤ 540 px, `prefers-reduced-motion`.
- [x] A4 HUD kota memakai dock yang sama tanpa baris skill (Bicara di tombol besar HP); pelacak quest, jam, AUTO, jeda, karakter, suara ditata ulang agar tidak bertabrakan. `?lama` = HUD lama. Kamus EN.
- [ ] A5 Cek manual pemilik (PC + iPhone) → commit.

## Bagian B — Dialog Potret Besar + Emosi
- [x] B1 Potret dibidik dari kepala (anchor `head` dari gambar anime) — perbaiki `art/bust.js` (di contoh potongan tetap membuat NPC kecil & terlalu bawah).
- [x] B2 `meta/mood.js` `moodOf(line)` (objek `{ t, mood }` atau tebakan dari tanda baca) + tes; dukung baris objek di `data/town.js` & quest.
- [x] B3 `ui/npc.js`: potret berdiri di belakang kotak teks, latar redup, plakat nama, teks mengetik + ▼, pilihan bernomor muncul setelah teks selesai (jawaban quest §42, aksi NPC), pengumuman quest baru; 1–4 & Spasi/E di `core/input.js` bila belum ada.
- [x] B4 Emosi: gerak potret + simbol dekat kepala + gaya kotak (§45.3); beri mood pada baris penting (Kakek Odo, Brom, quest utama).
- [x] B5 Versi HP; `?lama`; kamus EN. Cek manual → commit.

## Bagian C — Gelembung Warga
- [x] C1 Lapisan gelembung di atas kanvas kota/interior: posisi kepala lewat proyeksi yang ada; muncul saat dekat (`data/hud.js`), baris bergantian, mengetik, lencana mood; tidak menghentikan permainan.
- [x] C2 NPC penting: tanda ! memantul + tombol "Bicara (E)" saat dekat; ketuk gelembung/E = dialog besar.
- [x] C3 Batasi jumlah gelembung sekaligus (3 terdekat) supaya HP tetap ringan. Cek manual → commit.

## Bagian D — Toko Baru (percontohan Pandai Brom)
- [x] D1 `ui/shopui.js`: kepala (toko, tas + lencana, uang bergulir, ✕), tab, kisi berbingkai rarity, kartu detail (stat ▲/▼ vs gear terpakai, peluang peti, jumlah, Beli), mode dialog mengecil ke kiri bawah dengan tanggapan NPC ber-mood.
- [x] D2 Brom: Peti & Jual memakai `shopui` (memanggil `ctx.onBuyChest` / `ctx.onSell` yang ada); Tempa & Urai tetap panel lama dalam bingkai baru.
- [x] D3 Tanda sudah dibeli (§45.5): koin terbang, barang terbang ke tas, catatan "Masuk tas", cap DIBELI + ledakan sinar; peti lewat `ui/reveal.js` lalu catatan. Uang kurang = tombol terguncang + Brom marah.
- [x] D4 Versi HP; kamus EN. Cek manual → commit.

## Bagian E — Toko lain (setelah D disetujui)
- [ ] E1 Ramuan, Permata, Pasar, Kandang, Pandai Senjata, Penjahit Zirah, Perhiasan memakai `shopui`.
