# Tampilan Matang (arah A) — Rencana Kerja

> **Untuk agen:** kerjakan per bagian. Berhenti di akhir tiap bagian untuk cek manual oleh pemilik (screenshot PC & iPhone), commit setelah oke. Centang langkah yang selesai.

**Tujuan:** dunia 2.5D terasa matang & atmosferik (spesifikasi §36) tanpa mengubah gameplay, save, karakter, maupun UI.

**Arsitektur:** angka tampilan di `data/look.js` (`LOOK`). `render3d/stage.js` meredam saturasi lewat satu potongan shader yang dipasang di `toon()` dan material tanah (`muted()`); bloom & exposure dari `LOOK`. Tiap adegan (kota, wilayah, dungeon, interior) mengalikan intensitas cahayanya dengan `LOOK.ambient/key/points`. Tekstur buatan kode (Bagian A2–A4) di modul baru `render3d/texkit.js` (sampler pola → `DataTexture`, dari prototipe `app/pixel/tiles.js` versi halus).

**Spesifikasi:** §36. **Prototipe acuan:** `app/pixel.html` gaya A.

## Aturan global
- Gameplay, `run/`, `meta/`, `data/` keseimbangan, save: **tidak disentuh**.
- Karakter, monster, gear, efek skill: tetap; hanya cahaya/glow di sekitarnya.
- Jalur 2D (`?2d`) tidak ikut diubah.
- Jangan lag di HP lemah: tekstur dibuat sekali (di loading), tanpa alokasi per frame; jumlah lampu tidak bertambah.
- Verifikasi tiap bagian: `npm test`, `npm run build`, cek manual PC & HP. Commit tanpa `Co-Authored-By`, jangan push.

## Bagian A1 — Cahaya & palet
- [x] **A1.1** `data/look.js`: `LOOK` (saturasi, exposure, bloom, cahaya sendiri billboard/tanah, pengali ambien/utama/titik).
- [x] **A1.2** `stage.js`: `muted()` (potongan shader saturasi) dipasang di `toon()`; bloom & `toneMappingExposure` dari `LOOK`.
- [x] **A1.3** `actors.js` `billMat(map, k)`: cahaya sendiri dari `LOOK.bill`, pemain `LOOK.heroBill`.
- [x] **A1.4** Kota (`town.js` sky/lights + bloom dinamis), wilayah (`field.js` sky/lights + tanah), dungeon (`dungeon.js`): pengali `LOOK`.
- [x] **A1.5** `npm test`, `npm run build`, cek pemilik → commit `Tampilan matang A1: cahaya & palet terpusat`.

## Bagian A2 — Material kota
- [x] **A2.1** `render3d/texkit.js`: peta detail abu-abu yang bisa diulang (plaster, stone, wood, roof, log, thatch; 128 = ×1), tes tanpa sambungan & rata-rata ≈ ×1.
- [x] **A2.2** `stage.js` `detailed()` + `toon(warna, rim, bahan)`: peta detail mengalikan warna, diambil menurut posisi dunia di sumbu utama permukaan (tanpa UV; cocok untuk Batch & instanced).
- [x] **A2.3** `townbuild.js`: tembok kota (batu / palisade kayu / lumpur), rumah (plester, kayu balok, alas batu, genteng / jerami / kubah lumpur), pondok gelondong, gerbang, cerobong, pagar.
- [x] **A2.4** `npm test`, `npm run build`, cek pemilik → commit `Tampilan matang A2: material bangunan kota`.

## Bagian A3 — Material wilayah
- [x] **A3.1** `texkit.js`: pola `rock` (batu alam), `soil`, `sand`, `snow`, `ash` (tanah per bioma).
- [x] **A3.2** Tanah wilayah 3D: peta detail di atas lukisan tanah (lukisan 2D tidak diubah, jalur `?2d` tetap); diganti per bioma lewat `setDetail()`.
- [x] **A3.3** Props: batu, batu es, batu melayang, batu tegak, tiang runtuhan → `rock`; gerbang dungeon & gerbang kota → `stone`; peti, rumah persembunyian, jembatan, papan arah → `wood`.
- [x] **A3.4** `npm test`, `npm run build`, cek pemilik → commit `Tampilan matang A3: material tanah & props wilayah`.

## Bagian A4 — Dungeon & interior
- [ ] Lantai & dinding 4 tema dungeon dan interior rumah bertekstur.

## Bagian A5 — Vegetasi & props
- [ ] Pohon, semak, batu: siluet berlapis, variasi ukuran.

## Bagian A6 — Efek & glow
- [ ] Glow efek skill/aura diselaraskan dengan cahaya baru; cek tidak silau di malam hari.

## Penutup
- [ ] Perbarui status di `CLAUDE.md`.
