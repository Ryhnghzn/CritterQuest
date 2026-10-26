# Langkah 1 — Struktur folder §10 + Vitest

Spesifikasi: `../specs/2026-10-26-critter-quest-arcade-design.md` §10, §12 (langkah 1).
Target: game lama masih jalan tanpa perubahan perilaku; `npm test` hijau.

- [x] Pasang Vitest (`vitest@4.1.12`), skrip `npm test` / `npm run test:watch`, konfigurasi `test` di `vite.config.js` (lingkungan Node, pola `src/**/*.test.js`)
- [x] Pindah file (via `git mv`):
  | Lama | Baru |
  |---|---|
  | `rng.js`, `input.js`, `audio.js` | `core/` |
  | `game.js` | `run/run.js` (import `SPRITES` yang tak terpakai dihapus → `run/` bebas DOM) |
  | `render.js` | `render/world.js` |
  | `sprites.js` | `art/sprites.js` |
  | `scene.js` | `main.js` |
- [x] Pecah `data.js` → `data/balance.js` (arena, kurva EXP, `STAT_UPS`), `data/classes.js` (critter + senjata prototipe, diganti di langkah 3), `data/enemies.js` (musuh, gelombang, bos)
- [x] Ekstrak loop fixed-timestep dari `scene.js` ke `core/loop.js` (`STEP`, `startLoop(tick, frame)`)
- [x] Tes `run/run.test.js`: ronde jalan tanpa DOM untuk tiap critter + deterministik
- [x] Verifikasi: sidik jari simulasi 3 critter (≈60–110 detik, level-up & senjata baru) identik sebelum/sesudah; `npm run build` sukses; smoke test di Chrome headless (judul → mulai → gerak 4 detik, tanpa error JS)

Belum dibuat (menyusul langkah 2+): `meta/`, `ui/`, `art/doll.js`, `data/items.js`, `data/shop.js`. `rng.js` masih global — diubah jadi instans saat `itemgen` dibuat (langkah 4).
