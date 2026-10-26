# Langkah 2 — Save IndexedDB + Pilih Slot + Buat Karakter + Kemah kerangka

Spesifikasi: `../specs/2026-10-26-critter-quest-arcade-design.md` §3, §4.1–4.3, §8, §9, §12 (langkah 2).
Target: karakter dibuat, main ronde, progres (EXP/level/rekor) tetap ada setelah halaman dimuat ulang.

## Data
- [x] `data/classes.js`: `CLASSES` (4 kelas, tabel §4.2) + `CLASS_BASE` (atkSpd, critDmg, cdr, magnet). Ronde masih memakai critter prototipe lewat `protoCritter` (sementara, dihapus di langkah 3)
- [x] `data/balance.js`: kurva EXP karakter (`30 + 20 × level`, maks 50), jumlah slot, panjang nama, jumlah gaya/warna rambut, batas inventori

## Logika murni + tes Vitest
- [x] `meta/schema.js`: `SAVE_VERSION`, `migrate()`, `validateSlot()`, `readSlot()` (ok / rusak / versi lebih baru = rusak), `readSettings()`
- [x] `meta/character.js`: `validateName()`, `createCharacter()`, `expToNext()`, `addExp()`, `finalStats()` (dasar kelas + pertumbuhan level; toko & gear menyusul), `applyRunResult()`
- [x] `meta/save.js`: IndexedDB `critter-quest` v1 (store `slots`, `settings`), fallback memori, `loadSlots()`; slot ditulis hanya bila lolos validasi; slot rusak tak pernah ditimpa
- [x] `run/run.js`: lacak EXP & bos yang dibunuh, `result()` sesuai §10, `surrender()`; hapus `localStorage` (rekor kini per karakter)

## Tampilan
- [x] `art/doll.js`: paper doll 16×20 (badan + baju warna kelas + 5 gaya rambut × 6 warna), cache per kombinasi, format sheet (frame `idle`; frame lain di langkah 3)
- [x] `ui/`: `screens.js` (tampil/sembunyi + dialog konfirmasi), `slots.js`, `create.js`, `camp.js` (tab Mulai Ronde / Gear / Toko — dua terakhir masih placeholder), `results.js` (ringkas)
- [x] Alur Judul → Pilih Slot → Buat Karakter / Kemah → Ronde → Hasil (auto-save) → Kemah; Jeda: Lanjut / Menyerah
- [x] Pengaturan suara di `settings` (nilai awal dari `cs-muted`); spanduk "Progres tidak akan tersimpan" bila IndexedDB tak tersedia; `navigator.storage.persist()` saat karakter pertama dibuat
- [x] Ketikan di kolom nama tidak memicu pintasan keyboard game

## Verifikasi
- [x] `npm test` hijau, `npm run build` sukses
- [x] Smoke Playwright: buat karakter → ronde singkat → menyerah → hasil → muat ulang → karakter & rekor masih ada; viewport HP
  - Hasil: 59 tes Vitest hijau; simulasi ronde identik dengan prototipe (sidik jari 3 critter); kartu level-up bisa diklik; slot rusak tampil "DATA RUSAK" dan hanya bisa dihapus (dengan konfirmasi); IndexedDB diblokir → spanduk peringatan + tetap bisa main; ketik "M"/spasi di kolom nama tidak memicu pintasan; tanpa scroll horizontal di 320 px & 390 px
  - Skrip smoke belum masuk repo (memakai playwright-core dari proyek lain di mesin ini)

Ditunda sesuai §12: Ekspor/Impor (langkah 6 — slot rusak sementara hanya bisa dihapus), gear/toko/uang (langkah 4–5), kelas di dalam ronde (langkah 3).
