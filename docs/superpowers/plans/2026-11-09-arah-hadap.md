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

## Bagian 2: pose depan/belakang Warrior — diganti gaya anime (§39)
- [x] Pilihan pose `viewTo`/`viewNow` (`facing.js`) — dipakai gaya anime
- [x] `drawHero` menerima `pose.view`; hero bertarung (`actors.js`) & di kota (`town.js`) memakai view
- [x] `art/hero/views.js` + `art/hero/warriorview.js` (badan & senjata depan/belakang gaya D) **dibuang**, diganti anime (§39)

## Bagian 3: Archer, Mage, Assassin
→ lihat plans/2026-11-09-anime-lengkap.md (diganti gaya anime §39)

## Bagian 4: NPC
→ lihat plans/2026-11-09-anime-lengkap.md (diganti gaya anime §39)