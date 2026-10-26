# PKS — Critter Quest

Proyek game browser pribadi (bukan ERP). Bahasa komunikasi: Indonesia.

## Status

- **Sedang dikerjakan:** Critter Quest — Arcade (roguelite, save IndexedDB).
- **Spesifikasi (sumber kebenaran):** `docs/superpowers/specs/2026-10-26-critter-quest-arcade-design.md`
- **Rencana kerja:** `docs/superpowers/plans/` — satu file per langkah §12; centang yang selesai. Langkah 1–3 selesai (3A–3D; tampilan kartun vektor). Langkah 4 diubah jadi **Kota & Dungeon** (spesifikasi §13, tema gelap) — dikerjakan 4A kota, 4B dungeon; item/gear pindah ke langkah 5.
- **Konsep jangka panjang (RPG penuh, masih draf):** `docs/2026-10-26-konsep-critter-quest.md`

Mulai setiap sesi dengan membaca spesifikasi + rencana kerja, lalu `git log --oneline` untuk melihat langkah terakhir.

## Kode

- `app/` — Vite 7 + JavaScript murni (ES modules) + canvas 2D. Tanpa framework, tanpa file gambar/suara (semua dibuat lewat kode).
- Jalankan: `cd app && npm install --replace-registry-host=always && npm run dev`
  (`package-lock.json` menunjuk mirror `npm.mirrors.msh.team` yang tidak terjangkau; opsi itu mengalihkan ke registry npm resmi.)
- Build: `npm run build` → `app/dist/`
- Tes: `npm test` (Vitest, lingkungan Node; file `src/**/*.test.js` di samping modulnya)
- Saat menambah paket, sebutkan versinya (`npm i -D paket@x.y.z --replace-registry-host=always`); tanpa versi, npm 10.8 bisa gagal dengan `Cannot read properties of null (reading 'edgesOut')`.

## Aturan

- Semua angka keseimbangan di `app/src/data/`, bukan di logika.
- `run/` dan `meta/` = logika murni tanpa DOM, wajib punya tes Vitest.
- Jangan ubah struktur data save tanpa menaikkan `version` dan menambah langkah `migrate()`.
- Commit tanpa baris `Co-Authored-By`. Jangan push tanpa diminta.
