# Langkah 4 — Kota & Dungeon

Spesifikasi: `../specs/2026-10-26-critter-quest-arcade-design.md` §13 (mengalahkan §3, §5.6, §7).
Dua bagian; tiap bagian dicek manual oleh pemilik sebelum commit.

## 4A — Kota (tema gelap)
- [x] Save versi 2 + `migrate()` v1 → v2 (`hp`, `potions`, `upgrades` tanpa potion, `records` baru) — tes
- [x] `meta/character.js`: `currentHp`, `usePotion`, `applyTrip` (pulang / mati) — tes
- [x] `meta/shop.js`: `innRest`, `buyPotion` — tes
- [x] `data/town.js`, `data/dungeon.js` (harga, hukuman, regen, potion)
- [x] `town/town.js`: gerak + tabrakan, NPC terdekat, regen HP — tes
- [x] Potion di ronde (R / tombol), HP awal ronde dari karakter — tes
- [x] `render/view.js` (kanvas bersama), `render/light.js` (gelap + cahaya), `render/town.js` (kota malam: batu, rumah, gerbang, api unggun, lentera, NPC)
- [x] `art/doll.js`: baju khusus NPC; ikon Inn & potion
- [x] `ui/npc.js` (Inn, Toko Ramuan, Toko Gear tutup, gerbang), `ui/charpanel.js`; Kemah dihapus; HUD kota (HP, koin, potion), menu Esc kota
- [x] Layar judul & menu memakai kota sebagai latar
- [x] Gerbang sementara → arena lama; akhir ronde memakai `applyTrip` (dianggap mati)
- [x] Verifikasi: tes, build, screenshot PC & HP, smoke (beli potion, tidur di Inn, simpan, muat ulang)

## 4B — Dungeon berlantai
- [x] `run/dungeon.js`: 5 lantai, gelombang, lantai selesai, portal turun/pulang — tes
- [x] Ruangan batu bundar + obor + jamur bercahaya, lorong masuk musuh, portal
- [x] Koin (drop + bonus lantai), Hasil Perjalanan, rekor baru
- [x] Verifikasi
