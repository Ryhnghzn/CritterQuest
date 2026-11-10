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
- [x] **B2** Es: Nova Es (dan ledakan es Lompatan Mundur) = cincin es di tanah + 18 kristal tumbuh–retak–runtuh bergelombang dari tengah, debu es, cahaya biru.
- [x] **B3** Petir & sihir: Badai Petir = tiap sambaran petir bercabang dari langit + bekas + kilat cahaya + percikan; Teleportasi = ledakan ungu di titik awal dan tujuan; Perisai Mana = ledakan ungu di pemain. Cek pemilik B2+B3 → commit.
- [x] **B4a** Warrior: tebasan dasar = sabit cahaya di depan pemain menghadap arah ayun (bergantian atas/bawah); Putaran Pedang & Badai Pedang = cincin pedang berputar datar setinggi pinggang mengikuti pemain; Retakan Bumi = pilar batu-api tumbuh–bertahan–runtuh di tiap titik + percikan + cahaya; Teriakan Baja / Amarah Perang = gelombang cincin emas di tanah + percikan emas/merah; Terjang = kepulan debu di sepanjang jalur; Kapak Bumerang = kapak bergambar berputar.
- [x] **B4b** Archer: panah bergambar (serangan dasar, Panah Pecah & pecahannya) menghadap arah terbang; Panah Naga = tombak cahaya berpita melingkar + cahaya ikut + percikan es; Hujan Panah = panah jatuh dari langit lalu menancap sebentar; Ladang Jebakan = rumpun duri tumbuh di area selama jebakan; Hujan Bintang = bintang jatuh satu per satu + percikan emas (sebelumnya ikut memakai meteor); Mata Elang = gelombang emas kecil; Lompatan Mundur = debu di titik lompat (ledakan es dari Nova).
- [x] **B4c** Assassin: tusukan ganda ungu dengan kilat X di ujung; belati bergambar (Lingkaran Belati, juga saat melayang); Shuriken Raksasa bergambar berputar saat mengitari & dilempar; Kabut Racun = kepulan hijau tembus pandang di area; Bom Asap = cincin kepulan asap; Langkah Bayangan = ledakan ungu di awal & akhir; Naluri Pembunuh = cincin ungu + percikan; Tarian Seribu Bayangan = cincin pedang berputar berwarna ungu.

## Bagian C — Dunia seperti prototipe A (permintaan pemilik 2026-11-06: "masih jauh dari pixel.html A")
Selisih terbesar dengan prototipe: tidak ada bayangan, props berupa bentuk 3D polos (bukan ilustrasi), tanah berupa ubin, cahaya netral. Dikerjakan berurutan, cek pemilik di tiap bagian.
- [x] **C1** Bayangan matahari nyata (Penuh saja; Ringan tanpa bayangan) untuk bangunan, props, dinding dungeon, dan billboard karakter (lewat alpha gambarnya); matahari rendah barat-barat daya mengikuti kamera (target menempel grid texel → bayangan tidak merayap); suasana senja: cahaya langit, pantulan tanah, matahari, kabut condong ke warna hangat prototipe di siang hari. `LOOK.shadows`, `LOOK.mood`, `stage.js` `sunAt` / `dusk` / `shade`.
- [x] **C2** Tanah dilukis (`art/groundart.js` + tes, `render3d/paintground.js`): rumput berpetak dengan rumpun bilah + bayangan kaki + bunga, jalan tanah berkerikil, batu jalan Voronoi; warna palet prototipe (saturasi dunia dibatalkan di piksel). Wilayah hutan: rumput + jalan tanah + teduh di bawah pohon/batu/semak (bulatan bayangan lama disembunyikan bila ada bayangan nyata). Kota Awal: rumput dengan alun-alun & jalan berbatu (kotak batu 3D lama tidak dipakai); Rimbawana: rumput dengan batu pijakan. `LOOK.paintGround`.
- [x] **C3** Props ilustrasi (`art/pix/props.js` dari prototipe + pinus bersalju & tutup batu salju, `render3d/billprops.js`): oak (3 varian, satu daun musim gugur), pinus, pinus salju, batu berlumut/bersalju, semak berbunga sebagai gambar berdiri; shader memutar bidang ke kamera (posisi + skala instance saja), salinan bayangannya ke arah matahari (bayangan selalu utuh). Wilayah hutan & es + pohon semua kota; bioma lain tetap 3D. `LOOK.illustrated`. (Folder `art/spell` → `art/pix`.) Rumput 3D berdiri belum (rumpun sudah dilukis di tanah).

- [x] **C4** Pernak-pernik: api bergambar 4 frame (prototipe) berdiri menghadap kamera, tiap api mulai dari fase sendiri (`flameSet`) — api unggun kota (3 nyala), cerobong tungku, obor dungeon (kristal tetap); kunang-kunang malam di wilayah hutan & Kota Awal/Rimbawana (`fireflies.js`); ranting gelap di sudut atas layar di tempat hijau (`frame.js`); rumput berdiri 3 rumpun di kaki tiap pohon hutan (`tuft`, ilustrasi).
- [x] **C5** Bioma lain: tanah salju (hanyutan, kerak berkilau, es licin beretak), pasir (riak 21 per ubin, semak kering, kerikil), abu (lempeng retak, bara di sebagian celah), Gerhana (ungu gelap, urat bercahaya, debu bintang); jalan per bioma (`BIOME_GROUND`); semua pola diuji berulang persis tiap 320 (sekalian membetulkan kerikil jalan tanah C2). Props ilustrasi: palem, kaktus, pohon hangus, kristal es, menara obsidian berurat ungu, batu es bersalju; kota es/gurun/vulkanik ikut (tanah + pohon). Tetap 3D: batu melayang, tiang & batu reruntuhan.

## Penutup
- [x] Perbarui status di `CLAUDE.md`.
