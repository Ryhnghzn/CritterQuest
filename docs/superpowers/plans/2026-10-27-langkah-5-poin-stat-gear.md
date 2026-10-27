# Langkah 5 — Poin Stat & Gear

Spesifikasi: `../specs/2026-10-26-critter-quest-arcade-design.md` §14 (mengalahkan §4.1, §4.3, §5.5, §6).
Empat bagian; tiap bagian dicek manual oleh pemilik sebelum commit.

## 5A — Poin stat (ganti kartu level-up)
- [x] Save v3 + `migrate()` v2 → v3 (`attrs`, slot `boots`/`amulet`) — tes
- [x] `data/balance.js`: atribut per poin, poin per level
- [x] `meta/character.js`: `freePoints`, `allocate`, atribut di `finalStats`, `applyTrip` menerima `attrs` perjalanan — tes
- [x] `run/`: hapus level ronde & kartu; EXP karakter langsung, naik level di dungeon (spanduk), `setStats` saat poin dipakai — tes
- [x] `ui/charpanel.js`: atribut + [+] / Simpan / Batal; bisa dibuka di dungeon (C / ikon, menjeda)
- [x] Hapus layar kartu level-up; HUD dungeon = level & EXP karakter
- [x] Verifikasi: tes, build, screenshot PC & HP

## 5B — Item & drop
- [x] `data/items.js`: 6 slot, 6 rarity, varian, bonus, efek khusus Legendaris/Mitos, peluang drop
- [x] `meta/itemgen.js` (RNG ber-seed) — tes
- [x] Musuh elite; drop gear di dungeon (sinar warna rarity), dibawa pulang; hilang 50% saat mati — tes

## Sela — Kota, ramuan, lanjut dungeon (§15, permintaan 2026-10-27)
- [x] Rumah bisa dimasuki: 4 interior bertema, penjual di dalam, papan nama & tampilan luar sesuai jualan — tes
- [x] Warga yang bisa diajak bicara (kota & dalam rumah), sebagian berjalan-jalan — tes
- [x] 5 ramuan + sabuk 4 slot, perisai/angin/amuk di dungeon, save v4 — tes
- [x] Pilih lantai di gerbang (sampai lantai terdalam) — tes
- [x] Verifikasi: tes, build, screenshot PC & HP

## 5C — Inventori & paper doll
- [ ] Tab Gear di panel Karakter: daftar, pasang/lepas, perbandingan stat, buang
- [ ] Gear di `finalStats`; efek khusus di ronde — tes
- [ ] Paper doll: senjata, helm, armor, sepatu per varian; kilau Epik+

## 5D — Toko Gear
- [ ] Jual item, Peti Gear (biasa & mahal) — tes
- [ ] Verifikasi akhir: smoke (dapat gear → pasang → terlihat → simpan → muat ulang)
