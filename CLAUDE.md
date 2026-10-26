# PKS — Critter Quest

Proyek game browser pribadi (bukan ERP). Bahasa komunikasi: Indonesia.

## Status

- **Sedang dikerjakan:** Critter Quest — Arcade (roguelite, save IndexedDB).
- **Spesifikasi (sumber kebenaran):** `docs/superpowers/specs/2026-10-26-critter-quest-arcade-design.md`
- **Rencana kerja:** `docs/superpowers/plans/` (bila sudah dibuat) — ikuti urutan langkahnya, centang yang selesai.
- **Konsep jangka panjang (RPG penuh, masih draf):** `docs/2026-10-26-konsep-critter-quest.md`

Mulai setiap sesi dengan membaca spesifikasi + rencana kerja, lalu `git log --oneline` untuk melihat langkah terakhir.

## Kode

- `app/` — Vite 7 + JavaScript murni (ES modules) + canvas 2D. Tanpa framework, tanpa file gambar/suara (semua dibuat lewat kode).
- Jalankan: `cd app && npm install --replace-registry-host=always && npm run dev`
  (`package-lock.json` menunjuk mirror `npm.mirrors.msh.team` yang tidak terjangkau; opsi itu mengalihkan ke registry npm resmi.)
- Build: `npm run build` → `app/dist/`

## Aturan

- Semua angka keseimbangan di `app/src/data/`, bukan di logika.
- `run/` dan `meta/` = logika murni tanpa DOM, wajib punya tes Vitest.
- Jangan ubah struktur data save tanpa menaikkan `version` dan menambah langkah `migrate()`.
- Commit tanpa baris `Co-Authored-By`. Jangan push tanpa diminta.
