# Langkah 9 — Konten Grinding Jangka Panjang

Spesifikasi: `../specs/2026-10-26-critter-quest-arcade-design.md` §20. Urutan disetujui pemilik ("lakukan saja", 2026-10-27).
Tiap bagian dicek manual sebelum commit.

## 9A — Tempa, material, permata
- [x] `data/forge.js`: material, urai, tempa +0…+15 (peluang, biaya), asah ulang, 6 permata × 5 tingkat, soket per rarity
- [x] `meta/forge.js`: tempa, asah ulang, urai, pasang/lepas/gabung permata — tes
- [x] Save v7: `mats`, `gems`, item `plus` & `sockets` — tes
- [x] Dungeon: debu per lantai, kristal/inti/permata dari bos, debu dari elite; dibawa pulang (mati: separuh) — tes
- [x] Pandai Brom: tab Peti / Jual / Tempa / Urai; Tukang Permata Sari: tab Pasang / Gabung; detail gear menampilkan soket; cheat +Material / +Permata
- [x] Verifikasi: tes, build, screenshot PC & HP

## 9B — Pool skill & bakat
- [x] 4 skill baru per kelas (24 total), terbuka di LV 5/10/15/20; pilih 2 untuk Q & E — tes
- [x] 8 bakat × 5 tingkat, 1 poin tiap 2 level; efek stat & efek perjalanan (damage skill, energi, dodge, hisap darah, koin/EXP) — tes
- [x] Save v8: `skills`, `talents`; atur ulang bakat di Pelatih — tes
- [x] Tab Skill di panel Karakter (kota: ubah; dungeon: lihat saja)
- [x] Verifikasi: tes, build, screenshot PC & HP
## 9B+ — 4 slot skill, ultimate, tombol baru (§22, permintaan 2026-10-27)
- [x] Save v9: 4 slot skill; pasang/lepas di tab Skill — tes
- [x] Ultimate per kelas (LV 25) dengan bar dari kill & damage diterima — tes
- [x] Tombol: skill 1–4, ultimate 5, ramuan Z X C V, bicara E, Karakter I; HUD & tombol HP
- [x] Verifikasi: tes, build, screenshot PC & HP

## 9C — Papan Tugas & koleksi (§24)
- [x] `data/bounties.js`, `data/collection.js`; `meta/bounties.js` (gulir, progres, klaim, ganti, toko Lencana), `meta/collection.js` (bonus bestiari, kodeks) — tes
- [x] Save v10: `bounties`, `marks`, `records.bestiary`, `records.uniques` — tes
- [x] Run mencatat kill per jenis, elite, lantai bersih; `applyTrip` memajukan tugas & koleksi — tes
- [x] Kapten Vera: tab Tugas / Lencana; tab Koleksi di panel Karakter; hasil perjalanan menampilkan progres tugas; kamus EN
- [x] Verifikasi: tes, build, screenshot PC & HP
## 9D — Open world (§25)
### 9D-1 — Dunia & perjalanan
- [x] `data/world.js`: Hutan Kelam (jalan, rintangan, sungai & jembatan, reruntuhan, musuh, rentang level)
- [x] `run/field.js`: mode wilayah — kelompok musuh, batas jumlah, rintangan, skala level barat→timur, keluar wilayah — tes
- [x] `meta/world.js`: kabut (kisi bit base64), tumbang −10% koin, simpan berkala — tes
- [x] Save v11: `location`, `towns`, `regions` — tes
- [x] Render wilayah (tanah, jalan, pohon, sungai), peta M berkabut, peta mini HUD
- [x] Gerbang: Dungeon / Wilayah; masuk & keluar wilayah; kamus EN
- [x] Verifikasi: tes, build, screenshot PC & HP
### 9D-1b — Dunia besar, gerbang dungeon di dunia, ekspedisi (§25.5)
- [x] `data/world.js`: 4 wilayah 20000 × 12000 (biome, musuh, kepadatan), dungeon per wilayah, ekspedisi
- [x] `run/fieldmap.js`: tata letak prosedural (jalan + cabang, sungai & jembatan, danau, rumpun, reruntuhan) — cepat, deterministik — tes
- [x] `meta/world.js`: letak gerbang per karakter, temukan gerbang, ekspedisi — tes
- [x] Save v12: `world.seed`, `found`, `expedition` — tes
- [x] Mode wilayah: gerbang dungeon (dekat → E), kembali ke wilayah setelah dungeon, panah ekspedisi
- [x] Render 4 biome, gerbang, danau/lava; peta mini berjendela; panah penunjuk
- [x] Rolan tanpa daftar dungeon; Papan Tugas tab Ekspedisi; kamus EN
- [x] Verifikasi: tes, build, screenshot PC & HP
### 9D-2 — Kota besar & pedagang
### 9D-3 — Harta karun, mini bos, portal bos
### 9D-4 — Padang Es, Gurun Merah, Gunung Api, Makam Pasir
## 9E — Tingkat kesulitan & Celah tanpa batas
