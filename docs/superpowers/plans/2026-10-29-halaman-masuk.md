# Halaman Masuk, Loading & Pengaturan

Spesifikasi: `../specs/2026-10-26-critter-quest-arcade-design.md` §29. Konsep: `app/masuk.html` (dipilih: A. Api Unggun, Pengaturan sesuai konsep — pemilik 2026-10-29).
Tiap bagian dicek manual sebelum commit.

## Bagian 1 — Loading & lag masuk game
- [x] `index.html`: loader awal CSS murni (sebelum JS), dihapus saat judul siap
- [x] Halaman judul tidak lagi menggambar kota 3D di belakang menu
- [x] `ui/loading.js`: layar loading (gerhana progres, pahlawan berlari, langkah, tips) + kamus EN
- [x] `render3d`: bangun dunia bertahap (`prepare` di Town25 / Field25 / Dungeon25: init WebGL → adegan → tempat → `compileAsync`)
- [x] `main.js`: masuk kota (judul/slot, teleport, pulang), keluar ke wilayah, masuk dungeon lewat layar loading
- [x] Verifikasi: tes, build, screenshot (HP mendatar diemulasikan, CPU 4× lebih lambat)
- [ ] Cek manual di HP oleh pemilik

## Bagian 2 — Halaman judul "Api Unggun"
- [x] `ui/title.js` + `art/titlebg.js`: latar api unggun (2D, kanvas), empat kelas, logo + slogan, menu kiri, kartu Lanjutkan dari slot terakhir, Enter = Lanjutkan
- [x] Tata letak HP mendatar
- [x] Verifikasi: screenshot PC & HP (emulasi)

## Bagian 3 — Menu Pengaturan (pengaturan v5)
- [x] `meta/schema.js`: pengaturan v5 + `migrate()` v4 → v5 — tes
- [x] `core/audio.js`: volume musik & efek terpisah
- [x] `ui/settings.js`: panel 4 tab (Suara, Grafis, Permainan, Bahasa), dari judul & Jeda; tombol lama di Jeda (EN·ID, Efek) diganti tombol Pengaturan
- [x] Sambungkan: 2.5D/2D, kualitas efek (auto/penuh/ringan), ketajaman (`SHARP`), FPS, guncangan layar, angka damage, zoom awal
- [x] Verifikasi: tes, build, screenshot; ganti 2D/2.5D langsung berlaku, pengaturan tersimpan setelah muat ulang

- [ ] Cek manual Bagian 2 & 3 oleh pemilik
