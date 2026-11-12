# Tingkat Kesulitan & Celah tanpa Batas — Rencana Kerja (9E, spesifikasi §41.3)

> Pemilik (2026-11-11): "lanjutkan" setelah §43 selesai. Dikerjakan sekaligus; cek manual menyusul.
> Agen cukup `npm test` + `npm run build`. Centang langkah yang selesai.

**Tujuan:** pemain yang sudah kuat punya tantangan lebih: tingkat Sulit / Neraka untuk dunia & dungeon, dan
Celah tanpa batas untuk adu rekor setelah tamat.

**Keputusan rincian (Claude, boleh dikoreksi saat cek manual):**
- Angka tingkat kesulitan di `data/difficulty.js`; run membawa `difficulty` (`run.diff`). Berlaku pada HP &
  damage musuh (termasuk peluru/zona lewat `foePower`), tempo aksi (Neraka), peluang & jumlah sifat elite,
  koin & EXP, peluang rarity naik satu tingkat, bobot Mitos, dan koin yang hilang saat tumbang.
- Ganti tingkat di Balai Petualang (tab baru **Tantangan**), hanya di kota. Neraka terbuka setelah tamat
  (Sang Gerhana) di Sulit atau Neraka.
- **Celah:** masuk dari tab Tantangan (Kota Awal), terbuka setelah tamat. Lantai tak berujung: 3 gelombang
  campuran musuh semua biome, tiap lantai +8% HP & damage; lantai kelipatan 5 = satu bos acak dengan jurus
  khasnya, lalu **titik simpan**. Hadiah (koin, gear, bahan, permata) sampai titik simpan aman; tumbang hanya
  menghapus yang sesudahnya (EXP tetap). Masuk lagi boleh mulai dari titik simpan terdalam.
- Tiap lantai biasa yang bersih: pilih 1 dari 3 **berkah** (berlaku sampai keluar), beberapa dengan harga.
- Save v26: `difficulty`, `unlocked { hell, rift }`, `rift { best, checkpoint }`.

## C1 — Tingkat kesulitan
- [x] C1.1 `data/difficulty.js` + save v26 (`migrate` 25→26, validasi), `meta/difficulty.js` (`setDifficulty`, `unlockedLevels`, buka Neraka/Celah saat tamat). Tes.
- [x] C1.2 Run: `difficulty` di `reset`, skala musuh/peluru/tempo/elite/hadiah/rarity; koin hilang saat tumbang ikut tingkat. Tes.
- [x] C1.3 UI: tab Tantangan di Balai Petualang, label tingkat di HUD & gerbang; kamus EN.

## C2 — Celah tanpa batas
- [x] C2.1 `data/rift.js` (lantai, campuran musuh, bos, berkah) + `run/rift.js` (lantai dibuat dari nomor, berkah, titik simpan). Tes.
- [x] C2.2 main.js: masuk Celah (mulai lantai 1 / titik simpan), pilihan berkah, akhir perjalanan (hadiah sampai titik simpan, rekor). Tes `meta`.
- [x] C2.3 UI rekor di tab Tantangan, HUD lantai Celah; kamus EN.

## Z
- [x] Z1 Spesifikasi §41.3 catatan pelaksanaan, `CLAUDE.md` status; ingatkan build + `butler push`.
