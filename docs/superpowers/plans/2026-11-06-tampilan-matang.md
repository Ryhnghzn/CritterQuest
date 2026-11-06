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
- [x] **A4.1** `texkit.js` pola `slab` (batu lantai besar); lantai dungeon (di atas lukisan lantai), dinding & tutup dinding dungeon `stone`, tiang lampu `wood`.
- [x] **A4.2** Interior: dinding `plaster`, list & lambrisering `wood` (lantai lukisan papan dibiarkan).
- [x] **A4.3** `npm test`, `npm run build`, cek pemilik → commit `Tampilan matang A4: material dungeon & interior`.
- [x] **A4.4** Setelan lebih berani (pemilik 2026-11-06: "masih seperti yang lama"): saturasi 0,6, kontras detail ×1,9, ambien 0,5, lampu ×1,7, cahaya sendiri billboard 0,12 (pemain 0,26); `?lama` di URL menampilkan tampilan lama untuk dibandingkan.

## Sisipan — Bidik skill (§37)
- [x] `run/aim.js` (+ tes): skill mana yang menunggu bidikan, bentuk penanda. `render/aim.js`: gambar penanda lewat proyeksi kamera.
- [x] `core/input.js`: `queueAction` (mode bidik, tombol sama = cast cepat), klik kiri lepas, klik kanan / Esc batal; `ui/touch.js` tombol HUD diklik mouse ikut membidik; `main.js` `aimFilter` + gambar penanda.
- [x] Cek pemilik → commit `Bidik skill dulu, klik kiri untuk melepas (§37)`.

## Bagian A5 — Vegetasi & props
- [x] **A5.1** `render3d/flora.js` (+ tes): oak (batang miring, cabang, tajuk 8–10 gumpalan), pinus 5 tingkat bergerigi (versi salju: salju hanya di permukaan menghadap langit, bagian atas tiap tingkat), semak, tumpukan batu (lumut/salju di atas); warna per titik gelap→terang, 3 varian per jenis.
- [x] **A5.2** Wilayah: `propGeometry(kind, biome, varian)`, satu InstancedMesh per jenis+varian (`propKey`), shading halus untuk tanaman; semak di kaki sebagian pohon hutan (3D saja, tanpa tabrakan).
- [x] **A5.3** Kota: pinus, oak, pinus salju memakai flora.js (varian per pohon).
- [x] **A5.4** `npm test`, `npm run build`, cek pemilik → commit `Tampilan matang A5: pohon, semak, batu berlapis`.

## Bagian B — Efek skill gaya prototipe (menggantikan A6)
Efek berdiri di dunia 3D seperti prototipe A (`app/pixel`): gambar dari `art/spell/` (PixelSprite, k = 3), dipasang `render3d/spell3d.js` (billboard beranimasi, bekas di tanah, lampu, percikan 3D bergravitasi). Simulasi tidak disentuh; lapisan tanah 2D (cincin, retakan) tetap. `?lama` = efek lama. Angka di `data/spell3d.js`.
- [x] **B1** Api Penyihir: bola api terbang (serangan dasar, Matahari Kecil) dengan nyala menghadap arah terbang, jejak percikan dan cahaya ikut; ledakan (api → asap) + bekas hangus + kilat cahaya; Meteor jatuh dari langit lalu meledak; Hujan Meteor: tiap meteor jatuh satu per satu. Cek pemilik → commit.
- [ ] **B2** Es: Nova Es = cincin es di tanah + kristal tumbuh–retak–runtuh, debu es.
- [ ] **B3** Petir & sihir: Badai Petir = sambaran dari langit + bekas; Teleportasi & Perisai Mana.
- [ ] **B4** Kelas lain (dibahas setelah Penyihir); cek silau malam hari.

## Penutup
- [ ] Perbarui status di `CLAUDE.md`.
