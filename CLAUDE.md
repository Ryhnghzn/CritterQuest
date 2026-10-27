# PKS — Critter Quest

Proyek game browser pribadi (bukan ERP). Bahasa komunikasi: Indonesia.

## Status

- **Sedang dikerjakan:** Critter Quest — Arcade (roguelite, save IndexedDB).
- **Spesifikasi (sumber kebenaran):** `docs/superpowers/specs/2026-10-26-critter-quest-arcade-design.md`
- **Rencana kerja:** `docs/superpowers/plans/` — satu file per langkah; centang yang selesai. Langkah 1–8 selesai (kota & 4 dungeon bertema, poin stat & gear 6 rarity, rumah/ramuan, Pelatih & Tukang Cukur, monster & bos berpola, energi skill, siang–malam, desain ulang dark fantasy). Langkah 9 (konten grinding) sedang dikerjakan: 9A tempa/material/permata, 9B pool skill & bakat + 4 slot skill & ultimate (tombol 1–4, 5); berikutnya 9C–9E. Game dua bahasa (Inggris bawaan, tombol EN · ID; spesifikasi §23) — teks baru dibungkus `tr()`/`t()` dan ditambahkan ke kamus `src/i18n/`. Ekspor/impor save (6B) ditunda.
- **Konsep jangka panjang (RPG penuh, masih draf):** `docs/2026-10-26-konsep-critter-quest.md`

Mulai setiap sesi dengan membaca spesifikasi + rencana kerja, lalu `git log --oneline` untuk melihat langkah terakhir.

## Kode

- `app/` — Vite 7 + JavaScript murni (ES modules) + canvas 2D. Tanpa framework, tanpa file gambar/suara (semua dibuat lewat kode).
- Jalankan: `cd app && npm install --replace-registry-host=always && npm run dev`
  (`package-lock.json` menunjuk mirror `npm.mirrors.msh.team` yang tidak terjangkau; opsi itu mengalihkan ke registry npm resmi.)
- Build: `npm run build` → `app/dist/`
- Tes: `npm test` (Vitest, lingkungan Node; file `src/**/*.test.js` di samping modulnya)
- Panel cheat untuk uji manual: tombol CHEAT / <kbd>`</kbd> saat `npm run dev` (atau `?cheat` di build)
- Saat menambah paket, sebutkan versinya (`npm i -D paket@x.y.z --replace-registry-host=always`); tanpa versi, npm 10.8 bisa gagal dengan `Cannot read properties of null (reading 'edgesOut')`.

## Aturan

- Semua angka keseimbangan di `app/src/data/`, bukan di logika.
- `run/` dan `meta/` = logika murni tanpa DOM, wajib punya tes Vitest.
- Jangan ubah struktur data save tanpa menaikkan `version` dan menambah langkah `migrate()`.
- Commit tanpa baris `Co-Authored-By`. Jangan push tanpa diminta.
