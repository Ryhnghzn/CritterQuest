# PKS — Critter Quest

Proyek game browser pribadi (bukan ERP). Bahasa komunikasi: Indonesia.

## Status

- **Sedang dikerjakan:** Critter Quest — Arcade (roguelite, save IndexedDB).
- **Spesifikasi (sumber kebenaran):** `docs/superpowers/specs/2026-10-26-critter-quest-arcade-design.md`
- **Rencana kerja:** `docs/superpowers/plans/` — satu file per langkah; centang yang selesai. Langkah 1–8 selesai (kota & 4 dungeon bertema, poin stat & gear 6 rarity, rumah/ramuan, Pelatih & Tukang Cukur, monster & bos berpola, energi skill, siang–malam, desain ulang dark fantasy). Langkah 9 (konten grinding): 9A–9D (tempa, pool skill & 4 slot + ultimate, Papan Tugas/Koleksi, dunia terbuka 4 wilayah + kota besar, pedagang, harta & mini bos, musuh biome) dan 9F (quest utama & sampingan, Tanah Gerhana, Menara Gerhana & epilog, save v20) selesai; sisa 9E (tingkat kesulitan & Celah tanpa batas). Sisipan lain yang selesai: Tampilan 2.5D, halaman masuk & Pengaturan (§29), Peta Kota (§30), Kelas Lebih Hidup (§31: mekanik khas Murka/Panas/Bidik/Kombo, 8 skill lebay, momen puncak), main offline/PWA (§32). **Berikutnya:** brainstorming "hack and slash serba cepat" bersama 9E (menyentuh angka yang sama), lalu Job Lanjutan. Game dua bahasa (Inggris bawaan, tombol EN · ID; spesifikasi §23) — teks baru dibungkus `tr()`/`t()` dan ditambahkan ke kamus `src/i18n/`. Ekspor/impor save (6B) ditunda. Sisipan "Efek Lebay" (`docs/superpowers/plans/2026-10-27-efek-lebay.md`, bagian A–E selesai, pengaturan v4): efek di `run/vfx.js` + `run/skillfx.js` (RNG sendiri, tidak boleh memakai RNG simulasi), gambar di `render/fxkit.js`/`render/skillfx.js`, aura di `art/aura*.js`, ikon di `art/gear.js`; angka di `data/fx.js`, `skillfx.js`, `aurafx.js`, `itemfx.js`.
- **Konsep jangka panjang (RPG penuh, masih draf):** `docs/2026-10-26-konsep-critter-quest.md`

Mulai setiap sesi dengan membaca spesifikasi + rencana kerja, lalu `git log --oneline` untuk melihat langkah terakhir.

## Kode

- `app/` — Vite 7 + JavaScript murni (ES modules) + canvas 2D. Tanpa framework. Suara dari file `app/public/audio/*.mp3` (daftar di `data/audio.js`, status di `docs/2026-10-31-prompt-musik.md`, file asli di `art-src/audio/`, olah dengan `npm run audio`); yang belum punya file memakai suara sintetis `core/audio.js`. Gambar dibuat lewat kode, kecuali latar layar penuh (judul, loading, epilog) di `app/public/img/*.webp` — prompt di `docs/2026-10-29-prompt-gambar.md`, file asli di `art-src/` (tidak masuk git). Gambar dari kode tetap jadi cadangan.
- Jalankan: `cd app && npm install --replace-registry-host=always && npm run dev`
  (`package-lock.json` menunjuk mirror `npm.mirrors.msh.team` yang tidak terjangkau; opsi itu mengalihkan ke registry npm resmi.)
- Build: `npm run build` → `app/dist/` (ikut menulis `dist/sw.js` untuk main offline, spesifikasi §32)
- Main di HP lewat jaringan rumah: `npm run phone` (build + server port 4173); langkah flag Chrome di §32
- Tes: `npm test` (Vitest, lingkungan Node; file `src/**/*.test.js` di samping modulnya)
- Panel cheat untuk uji manual: tombol CHEAT / <kbd>`</kbd> saat `npm run dev` (atau `?cheat` di build)
- Saat menambah paket, sebutkan versinya (`npm i -D paket@x.y.z --replace-registry-host=always`); tanpa versi, npm 10.8 bisa gagal dengan `Cannot read properties of null (reading 'edgesOut')`.

## Aturan

- Semua angka keseimbangan di `app/src/data/`, bukan di logika.
- `run/` dan `meta/` = logika murni tanpa DOM, wajib punya tes Vitest.
- Jangan ubah struktur data save tanpa menaikkan `version` dan menambah langkah `migrate()`.
- Commit tanpa baris `Co-Authored-By`. Jangan push tanpa diminta.
