# Arah Hadap — Rencana Kerja (spesifikasi §38)

> Kerjakan per bagian. Berhenti di akhir tiap bagian untuk cek manual oleh pemilik; commit setelah oke. `render3d/actors.js` juga sedang diubah sesi lain (efek skill B4): commit hanya hunk bagian ini.

**Tujuan:** karakter tidak selalu terlihat menyamping. Arah hadap benar walau kamera diputar, berbaliknya hidup, dan hero/NPC punya pose depan dan belakang saat berjalan/diam.

**Prototipe:** `app/arah.html` + `app/arah/` (`main.js` adegan, `pose.js` gambar depan/belakang Warrior & warga).

## Bagian 1: A + B di game
- [x] `render3d/facing.js` + tes: `screenX`, `towardCam`, `makeFacing`, `turnTo`, `pose2d`
- [x] `data/look.js` `facing` (Matang & `?lama`)
- [x] Hero bertarung (`render3d/actors.js` `drawHero`): hadap dari bidikan di layar, kertas + lompat + condong; arah guling ikut layar
- [x] Monster (`drawEnemies`): hadap ke hero/terjang di layar, kertas + lompat
- [x] Kota (`render3d/town.js`): hero & warga memakai `facing.js` (warga digambar ulang tiap frame saat berbalik)

## Bagian 2: pose depan/belakang Warrior
- [ ] `art/hero/views.js`: kepala depan/belakang, 5 rambut, badan Warrior depan/belakang (dari `app/arah/pose.js`), helm 4 jenis
- [ ] `facing.js`: pilih `front`/`side`/`back` dari arah jalan di layar (pita mati), animasi pergantian
- [ ] `drawDoll` menerima `pose.view`; serangan/skill/guling memaksa `side`
- [ ] Hero bertarung & di kota memakai view

## Bagian 3: Archer, Mage, Assassin
- [ ] Badan depan/belakang tiap kelas + senjatanya

## Bagian 4: NPC
- [ ] Warga umum depan/belakang; pose depan saat diam/diajak bicara; alat pekerjaan (palu, tombak, tongkat) di pose depan
