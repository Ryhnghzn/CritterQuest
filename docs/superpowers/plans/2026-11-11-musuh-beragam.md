# Musuh Beragam & Elite Bersifat Acak — Rencana Kerja (Proyek A §41)

> **Untuk agen:** kerjakan per bagian (A1–A4). Berhenti di akhir tiap bagian untuk cek manual oleh pemilik (agen cukup `npm test`, `npm run build`, jalankan server lokal dan beri alamatnya). Commit setelah pemilik oke. Centang langkah yang selesai.

**Tujuan:** pertarungan biasa memaksa bergerak dan memilih sasaran. Ada 10 musuh dengan 8 perilaku baru (dua per biome), dan elite mendapat sifat acak. Spesifikasi §41.1.

**Arsitektur:**
- `data/enemies.js`: musuh baru (`ai` baru + angka) dan `AFFIXES` (sifat elite) + `AFFIX_COUNT`.
- `run/affix.js` (baru): `rollAffixes(e, n)`, `affixStep(run, e, dt)` (Cepat, Pemanggil, Beraura, Penjelajah, pulih Berlapis), `affixHit(run, e, dmg)` → damage setelah perisai Berlapis + duri Berduri, `affixDeath(run, e)` (Meledak). Dipanggil dari `run/run.js` dan `run/dungeon.js` `makeElite`.
- `run/enemies.js`: perilaku baru di `aiStep`; RNG simulasi.
- `art/monsters.js`: sprite musuh baru (gaya yang sama).
- `render3d/actors.js` + `render/world.js`: nama sifat di atas elite, bilah perisai Berlapis, tanda cermin/totem/sinar kembar.
- `data/world.js` `enemies` per zona + `data/dungeons.js` gelombang: memasukkan musuh baru.

## Bagian A1 — Elite bersifat acak (cek manual)
- [x] A1.1 `data/enemies.js` `AFFIXES` (Cepat, Berlapis, Pemanggil, Berduri, Meledak, Beraura, Penjelajah; `not` = perilaku yang tidak cocok) + `AFFIX_COUNT` (1 sifat; 2 di level dunia ≥ 25 / lantai ≥ 4).
- [x] A1.2 `run/affix.js` + tes `run/affix.test.js`: sifat berbeda dan cocok dengan perilaku; Cepat mempercepat aksi; Berlapis menyerap lalu pulih setelah 4 dtk tanpa diserang; Pemanggil maks 4; Berduri paling sering tiap 1 dtk; Meledak meninggalkan lingkaran bahaya; Penjelajah memberi tanda lalu muncul dekat pemain.
- [x] A1.3 Sambungkan: `makeElite(e, n)` (dungeon & dunia), `damageEnemy` → `affixHit`, langkah musuh → `affixStep`, `killEnemy` → `affixDeath`.
- [x] A1.4 Tampilan: nama sifat di atas elite ("Cepat · Berlapis"), bilah perisai putih kebiruan di atas bilah HP (3D & 2D). Kamus EN.
- [x] A1.5 `npm test`, `npm run build`, server lokal → **cek manual pemilik**.

## Bagian A2 — Hutan & Es (cek manual)
- [x] A2.1 Katak Rawa `leap`, Semak Penyergap `ambush` + tes (logika di `run/foes.js`).
- [x] A2.2 Roh Embun `trail` (genangan es memperlambat; hazard sendiri `puddle` karena `zone` dipakai bos B), Penjaga Cermin `mirror` (memantulkan proyektil pemain dari depan) + tes.
- [x] A2.3 Sprite keempatnya dengan kit anime (`art/foes.js`, galeri `app/musuh.html`); semak menyamar, cermin, genangan & lompatan digambar 2D/3D (`render/foes.js`); masuk `data/world.js` (Hutan, Padang Es) dan gelombang dungeon Bayangan/Jamur (Katak Rawa) & Kristal (Roh Embun, Penjaga Cermin). Semak Penyergap hanya di wilayah (di dungeon musuh berjalan masuk lewat lorong, menyamar tidak masuk akal). Cheat: tombol 4 musuh baru.
- [x] A2.4 Tes, build, server → **cek manual pemilik**.

## Bagian A3 — Gurun & Gunung Api (cek manual)
- [x] A3.1 Hyena Pasir `pack` (mengepung, lolongan, serbu bersamaan), Kumbang Pembelah `split` (2 kecil → 2 tungau) + tes.
- [x] A3.2 Meriam Magma `mortar`, Totem Bara `totem` (aura +30% kecepatan & perisai 20% HP ke musuh sekitar) + tes.
- [x] A3.3 Sprite (termasuk kumbang kecil & tungau); masuk dunia (Gurun, Gunung Api) dan dungeon Makam & Lava.
- [x] A3.4 Tes, build, server → **cek manual pemilik**.

## Bagian A4 — Gerhana & rapikan (cek manual)
- [x] A4.1 Obelisk Hampa (`totem` + sinar berputar), Kembar Hampa `twin` (sinar penghubung melukai, bangkit 4 dtk kecuali keduanya mati) + tes.
- [x] A4.2 Sprite; masuk Tanah Gerhana & Menara Gerhana; buku monster (Koleksi) mengenal 10 musuh baru (save v24, migrate 23→24; anak kumbang & tungau dihitung sebagai Kumbang Pembelah). Wilayah: totem/obelisk datang sendiri bersama musuh lain (`single`), hyena 4–6 & kembar berpasangan (`group`); bukan penjaga harta.
- [x] A4.3 Kamus EN lengkap, `CLAUDE.md` status, tes, build, server → **cek manual pemilik**.
