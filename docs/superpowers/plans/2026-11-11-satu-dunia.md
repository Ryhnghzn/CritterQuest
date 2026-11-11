# Satu Dunia Tersambung — Rencana Kerja

> **Untuk agen:** kerjakan per bagian (A–D). Berhenti di akhir tiap bagian yang bisa dilihat (B, C, D) untuk cek manual oleh pemilik (agen cukup `npm test`, `npm run build`, jalankan server lokal dan beri alamatnya). Commit setelah pemilik oke. Centang langkah yang selesai.

**Tujuan:** empat wilayah terpisah (§25) diganti satu dunia 70000 × 70000 dengan Kota Awal di pusat, biome dipisah pembatas alam (gunung, sungai, ngarai, tebing lava) yang diseberangi di celah/jembatan, kota besar di ujung tiap lengan. Spesifikasi §40.

**Arsitektur:**
- `data/worldmap.js`: semua angka dunia (ukuran, petak, lengan, pembatas, penyeberangan, kota, kepadatan per zona).
- `run/worldmap.js`: kerangka (`buildWorld`), `zoneAt`, `zoneToWorld`, `levelAt`, petak (`ensureChunks`), dan antarmuka peta yang sama dengan `run/fieldmap.js` (`blocked`, `pushOut`, `solidsNear`, `pathDist`) sehingga `run/field.js` dan renderer tetap memakai bentuk `map` yang sama.
- `run/field.js`: satu dunia; `run.region` = zona saat ini (berubah saat pindah zona).
- `meta/world.js`, `meta/quests.js`: letak dari `zoneToWorld`; save v22.
- `render3d/field.js` + `fieldprops.js`: props & benda padat per petak; tanah per biome.

## Bagian A — Kerangka & petak (logika murni)
- [x] A1 `data/worldmap.js`: `WORLD` (w, h, pusat, radius dataran, panjang lengan, petak), `ARMS` (zona → arah, kota), `BORDERS` (jenis pembatas, penyeberangan), `ECLIPSE` (kantong selatan).
- [x] A2 `run/worldmap.js` `zoneAt(x, y)`, `zoneToWorld(zone, fx, fy)`, `armFrac(zone, x, y)` → fx, `levelAt(x, y)`. Tes: tiap kota jatuh di zonanya, `zoneToWorld` ∘ `armFrac` bolak-balik, level naik keluar.
- [x] A3 Kerangka: jalan utama pusat → kota, cabang, jalan lingkar; pembatas sebagai polyline dengan celah; sungai kecil & danau per lengan; gerbang kota; kantong Gerhana. Tes: deterministik, tiap kota terhubung jalan ke pusat tanpa memotong pembatas kecuali di penyeberangan.
- [x] A4 Petak: `chunkAt`, `buildChunk(world, ix, iy)` (benda padat pembatas, pohon/batu sesuai zona, reruntuhan), cache dengan batas jumlah, `ensureChunks(world, x, y, budget)`. Tes: petak sama persis bila dibuat ulang; jalan & penyeberangan bebas benda padat; Hutan↔Gunung Api tertutup.
- [x] A5 Antarmuka peta: `blocked`, `pushOut`, `solidsNear`, `pathDist` lintas petak. Tes.

## Bagian B — Bisa dimainkan (cek manual)
- [x] B1 Save v22 (`meta/schema.js`): `world.fog`, `regions` jadi penanda; `migrate()` 21 + tes.
- [x] B2 `meta/world.js`: `gateSpots`, `treasureSpots` di koordinat dunia; `applyField` menulis `world.fog`. Tes.
- [x] B3 `meta/quests.js`: `hiddenXY`, `spotXY`, `questTarget` di koordinat dunia; target kota = gerbang kota. Tes.
- [x] B4 `run/field.js`: `startField(run, at)` di dunia (at = id kota atau {x,y}); musuh per zona + campur di penyeberangan; level `levelAt`; masuk kota lewat gerbang; Gerhana terkunci; pindah zona → `run.zoneChanged`. Tes.
- [x] B5 `main.js` + `ui/npc.js`: gerbang kota = "Keluar ke dunia"; simpan saat pindah zona; masuk kota dari gerbang dunia; `?region=` → `?world`.
- [x] B6 Renderer: `render3d/field.js` props & benda padat per petak (pakai gambar yang ada), tanah memakai biome di posisi ubin; `render/field.js` 2D cadangan tetap jalan.
- [ ] B7 `npm test`, `npm run build`, server lokal → **cek manual pemilik**.

## Bagian C — Pembatas & peralihan (cek manual)
- [ ] C1 Gambar pembatas: punggung gunung salju, sungai besar + jembatan batu, ngarai + jembatan gantung, sungai lava + tebing, tebing hitam Gerhana.
- [ ] C2 Tanah berbaur di penyeberangan; papan nama di tiap penyeberangan & simpang.
- [ ] C3 Dataran Kota Awal + gerbang kota di dunia (bangunan gerbang per gaya kota).

## Bagian D — Peta & rapikan (cek manual)
- [x] D1 Peta penuh (M) & peta mini: satu dunia, warna biome, pembatas, jalan, kota, gerbang, kabut.
- [ ] D2 Kamus EN untuk teks baru; perbarui §25 yang usang (rujuk §40); `CLAUDE.md` status.
- [ ] D3 Bersihkan kode wilayah lama yang tak terpakai (`layout` per wilayah, `exitZone`).
