# Langkah 6 — Pelatih, Tukang Cukur, Ekspor/Impor, Polesan

Spesifikasi: `../specs/2026-10-26-critter-quest-arcade-design.md` §7 (upgrade), §9.3 (ekspor/impor), §17.
Tiga bagian; tiap bagian dicek manual oleh pemilik sebelum commit.

## 6A — Pelatih & Tukang Cukur
- [x] `data/shop.js`: upgrade HP/ATK/Magnet, harga atur ulang poin, harga cukur
- [x] `meta/shop.js`: `buyUpgrade`, `respec`, `changeLook`; upgrade di `finalStats` — tes
- [x] NPC Pelatih di Balai Petualang (upgrade + atur ulang poin)
- [x] Tukang Cukur: kios di kota, pilih gaya & warna rambut dengan pratinjau
- [x] Verifikasi: tes, build, screenshot PC & HP

## 6B — Ekspor / impor save
- [ ] Ekspor slot ke file JSON, impor dengan validasi + konfirmasi timpa — tes

## 6C — Polesan & penyeimbangan
- [ ] Uji main tiap kelas, setel angka, perbaikan kecil
