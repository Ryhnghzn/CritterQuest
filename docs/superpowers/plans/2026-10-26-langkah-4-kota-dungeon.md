# Langkah 4 — Kota & Dungeon

Spesifikasi: `../specs/2026-10-26-critter-quest-arcade-design.md` §13 (mengalahkan §3, §5.6, §7).
Dua bagian; tiap bagian dicek manual oleh pemilik sebelum commit.

## 4A — Kota (tema gelap)
- [ ] Save versi 2 + `migrate()` v1 → v2 (`hp`, `potions`, `upgrades` tanpa potion, `records` baru) — tes
- [ ] `meta/character.js`: `currentHp`, `usePotion`, `applyTrip` (pulang / mati) — tes
- [ ] `meta/shop.js`: `innRest`, `buyPotion` — tes
- [ ] `data/town.js`, `data/dungeon.js` (harga, hukuman, regen, potion)
- [ ] `town/town.js`: gerak + tabrakan, NPC terdekat, regen HP — tes
- [ ] Potion di ronde (R / tombol), HP awal ronde dari karakter — tes
- [ ] `render/view.js` (kanvas bersama), `render/light.js` (gelap + cahaya), `render/town.js` (kota malam: batu, rumah, gerbang, api unggun, lentera, NPC)
- [ ] `art/doll.js`: baju khusus NPC; ikon Inn & potion
- [ ] `ui/npc.js` (Inn, Toko Ramuan, Toko Gear tutup, gerbang), `ui/charpanel.js`; Kemah dihapus; HUD kota (HP, koin, potion), menu Esc kota
- [ ] Layar judul & menu memakai kota sebagai latar
- [ ] Gerbang sementara → arena lama; akhir ronde memakai `applyTrip` (dianggap mati)
- [ ] Verifikasi: tes, build, screenshot PC & HP, smoke (beli potion, tidur di Inn, simpan, muat ulang)

## 4B — Dungeon berlantai
- [ ] `run/dungeon.js`: 5 lantai, gelombang, lantai selesai, portal turun/pulang — tes
- [ ] Ruangan batu bundar + obor + jamur bercahaya, lorong masuk musuh, portal
- [ ] Koin (drop + bonus lantai), Hasil Perjalanan, rekor baru
- [ ] Verifikasi
