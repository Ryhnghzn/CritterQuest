# Gaya D — karakter komik gelap & animasi luwes

Permintaan pemilik (2026-10-28): karakter sekarang (chibi, kepala bulat) terasa "game anak kecil". Dari simulasi `app/char.html` dipilih **gaya D — komik gelap terinspirasi Hades** (desain sendiri): bentuk bersudut, bayangan cel tegas dari kiri atas, sorot hangat di sisi terang, cahaya tepi berwarna di sisi gelap, garis tinta tipis, proporsi heroik (kepala ±⅙). Animasi berkeyframe: ancang-ancang, jeda, serangan cepat, overshoot, langkah maju. "Ubah semuanya langsung" — dikerjakan per bagian, dicek manual tiap bagian.

Prinsip:
- Logika `run/` & `meta/` dan save **tidak berubah**; hanya `art/` (+ sedikit `render/` untuk waktu animasi).
- Titik masuk tetap `drawDoll(g, classId, look, pose)` — pemanggil (dunia, kota, interior, potret UI) tidak perlu diubah. Tinggi tetap ±44 unit agar ukuran di game sama.
- Kelas yang belum dipindah tetap memakai boneka lama sampai bagiannya selesai.
- Cahaya dihitung di ruang layar, jadi tetap dari kiri atas walau karakter menghadap kiri.

## Ciri khas kelas (keputusan pemilik 2026-10-28)
- Satu jenis tubuh per kelas (belum ada pilihan pria/wanita — save tidak berubah).
- Ukuran tampilan berbeda (hitbox & jangkauan tetap): Warrior ±110%, Archer & Mage ±105%, Assassin ±90%.
- **Warrior**: paling besar & kekar (bahu sangat lebar, lengan & paha tebal, leher pendek), **pedang satu tangan + perisai**, langkah berat, tebasan berat; cahaya tepi merah bara.
- **Archer**: ramping, tinggi, kaki panjang; tudung & mantel panjang, busur tinggi, tabung panah; cahaya tepi hijau zamrud.
- **Mage**: kurus jangkung, siluet jubah segitiga, tudung/topi lancip, tongkat lebih tinggi dari badan; cahaya tepi toska/ungu.
- **Assassin**: paling kecil, membungkuk, syal panjang, topeng, dua belati terbalik, gerak cepat; cahaya tepi ungu gelap.

## Bagian 1 — Mesin & Warrior
- [x] `art/hero/rig.js`: kerangka + keyframe dengan easing per segmen (profil cepat untuk game: tebasan terlihat ±0,1 dtk setelah serangan), pose terkena pukulan
- [x] `art/hero/cel.js`: bayangan cel, cahaya tepi, arsiran, anggota badan bersudut, palet redup untuk sisi belakang (tanpa `filter` agar jalan di Safari)
- [x] `art/hero/warrior.js`: 5 gaya rambut × 6 warna; gear per tingkat (helm 0–6, zirah 0–6, sepatu, senjata 0–6) dan rarity (warna rune/tepi/permata; Mitos menyala)
- [x] `drawDoll` meneruskan Warrior ke gaya D; potret UI ikut
- [x] `render/world.js`: waktu animasi serangan sendiri (tidak bergantung `ATTACK_POSE` 0,15 dtk)
- [x] Tes: semua kombinasi rambut × warna × gear × pose bisa digambar
- [x] Warrior besar + pedang & perisai (masukan pemilik), langkah berat
- [ ] Verifikasi: tes & build lulus; cek manual di game (PC & HP) oleh pemilik

## Bagian 2 — Archer, Mage, Assassin (badan, gear, serangan dasar)
- [x] `art/hero/common.js`: wajah, rambut, kaki & lengan ramping, palet, jejak senjata bersama; `rig.js` per kelas (postur, serangan lambat/cepat)
- [x] Archer: ramping, jubah panjang, tabung panah, tudung (tingkat helm), kulit → bertabur → sisik, busur tinggi; tarik tali → lepas
- [x] Mage: jubah segitiga, tudung/topi lancip/tudung dalam bermata menyala/bertanduk, mantel, tongkat & kristal per tingkat; dorong tongkat + tangan menyala
- [x] Assassin: kecil membungkuk, syal panjang, topeng, bandana/tudung, dua belati genggam terbalik; tusukan ganda
- [x] Tes semua kelas × rambut × warna × gear × pose; build
- [ ] Cek manual di game (PC & HP) oleh pemilik
## Bagian 3 — Gerakan skill & ultimate (24 + 4), menghindar
- [x] `run/skills.js`: tanda `castPose` (hanya untuk gambar; objek baru tiap pemakaian) — tes
- [x] `rig.js`: gerakan per skill (berputar, melompat-menghantam, menerjang, melempar, membidik ke langit, tarik penuh, lompat mundur, merapal ke atas, kubah, tusuk/lempar belati, putaran bayangan), lompat (lift), putaran (balik arah hadap), menghindar (merunduk)
- [x] `render/world.js`: memutar gerakan saat skill dipakai, fase menghindar dari `dodgeT`
- [x] Tes: semua skill punya gerakan, durasi wajar, semua fase bisa digambar
- [ ] Animasi mati ditunda: saat HP habis game langsung ke `ST.OVER`; perlu jeda di alur hasil (`main.js`, sedang diubah sesi lain)
- [ ] Cek manual di game (PC & HP) oleh pemilik
## Bagian 4 — Monster & bos (29 jenis)
- [x] `art/monsters.js`: 29 monster & bos digambar ulang (bersudut, bayangan cel, cahaya tepi warna bioma, mata menyala); varian es/pasir/magma punya detail sendiri (paku es, butir pasir, retakan bara)
- [x] `sprites.js` memakai gambar baru (`Object.assign(ENEMY_ART, MONSTER_ART)`); tetap dipanggang sekali per ukuran
- [ ] Cek manual di game (PC & HP) oleh pemilik
## Bagian 5 — NPC rakitan (bentuk badan, pakaian, kepala, barang, gerakan profesi)
- [x] `art/hero/npc.js`: 22 tipe dari peran & julukan (pandai besi, penjaga, tetua, nenek, anak, penyihir, pemburu, pedagang, pedagang malam, penari, penjual bunga, kapten, guru, juru tulis, …); badan normal/kekar/kurus/tua; tunik/rompi/celemek/zirah/jubah/gaun/mantel; tudung/kerudung/topi/helm/serban/topi lebar, janggut; palu/tombak/tongkat/buku/lentera/gunting/keranjang/ransel/busur
- [x] `rig.js`: gerakan diam per profesi (memukul landasan, berjaga, bertongkat, menggunting, membaca, menari, anak melompat, kuda-kuda)
- [x] `render/town.js` mengirim data NPC (`look.npc`); potret dialog menemukan tipenya lewat larik `outfit`
- [ ] NPC di `render/hideout.js` (milik sesi lain, belum di-commit) tampil sebagai warga biasa sampai file itu ikut mengirim `npc`
- [ ] Cek manual di game (PC & HP) oleh pemilik
## Bagian 6 — Ikon gear & sentuhan akhir (font/UI bila perlu)
