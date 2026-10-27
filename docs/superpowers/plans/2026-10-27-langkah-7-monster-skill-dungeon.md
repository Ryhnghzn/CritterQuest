# Langkah 7 — Monster, Skill Berenergi, Dungeon Bertema, Siang–Malam

Spesifikasi: `../specs/2026-10-26-critter-quest-arcade-design.md` §18. Tiap bagian dicek manual sebelum commit.

## 7A — Monster baru & pola bos
- [x] `data/enemies.js`: 6 monster baru + anak buah; pola Raja Maw
- [x] `run/enemies.js`: AI (jaga jarak, tembak, seruduk, panggil, sembuh, ledak, perisai), proyektil musuh, area bahaya, pola bos — tes
- [x] Gambar 7 monster, proyektil, tanda bahaya, perisai
- [x] Gelombang lantai memakai monster baru
- [x] Verifikasi: tes, build, screenshot PC & HP

## 7B — Energi & skill kuat
- [x] Energi: serangan dasar yang kena mengisi (per kelas), pulih 3/detik, mulai 50 — tes
- [x] Q/E memakai energi, cooldown pendek, angka diperbesar; tarik/dorong; gelombang Teriakan Baja — tes
- [x] HUD: bar energi, biaya di tombol, redup bila kurang
## 7C — 4 dungeon bertema, ruangan acak
- [x] `data/dungeons.js`: 4 dungeon (gelombang, kesulitan, hadiah, level gear, tema) + 3 bos baru
- [x] `run/room.js`: 5 bentuk ruangan acak per lantai, pilar, lorong otomatis — tes
- [x] Save v5: rekor per dungeon, dungeon terbuka berurutan — tes
- [x] Gambar: lantai/dinding/dekor per tema, pilar; gerbang pilih dungeon; HUD, Hasil, slot, panel Karakter
- [x] Verifikasi: tes, build, screenshot 4 dungeon & bos
## 7D — Siang–malam di kota
