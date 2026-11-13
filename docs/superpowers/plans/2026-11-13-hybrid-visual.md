# Rencana: Hybrid 2D/3D — prototipe penyatuan visual

Tujuan: karakter 2D terasa **berdiri di dalam** dunia 3D yang diterangi, bukan stiker di atasnya. Arsitektur tetap (Three.js + billboard + filter pixel + efek halus di atasnya, gaya HD-2D). Semua angka di `data/look.js`; `?lama` mematikan semuanya; `?tanpa=rim,miring,bayang,gerak` mematikan satu per satu untuk membandingkan.

Audit (ringkas): dunia 3D dari kode + tanah & props lukisan (props **sudah** bergaris tepi, `s.outline()`); hero, warga, bos beranimasi kerangka; musuh biasa gambar diam yang digoyang; billboard diterangi rata (tanpa sisi terang/gelap); bayangan matahari hanya di Penuh; billboard tegak lurus dilihat kamera ±47° dari atas (tampak lebih pendek).

## Bagian (prototipe, menunggu cek manual pemilik)

- [x] **1. Cahaya sisi & tepi (`LOOK.rim`, `?tanpa=rim`):** shader `billMat` (`render3d/actors.js` `lit`): sisi gambar yang menghadap matahari/bulan lebih terang, sisi lain lebih gelap (±22%); tepi yang menghadap matahari/bulan dan obor/lentera terdekat mendapat garis cahaya tipis berwarna cahayanya. Arah dihitung di layar dari lampu adegan (tanpa angka per adegan). Berlaku untuk hero, musuh, bos, warga, kartu NPC.
- [x] **2. Bayangan kontak (`LOOK.contact`, `?tanpa=bayang`):** `render/world.js` `contactShadow`: bayangan lembut (gradien) di kaki, sedikit terdorong menjauhi matahari; hero (dulu sangat tipis), musuh & bos (dulu elips hitam keras), kartu NPC dunia luar (dulu tidak ada). Juga di mode Ringan (lapisan lantai).
- [x] **3. Miring ke kamera (`LOOK.lean` 0,3 rad ≈ 17°, `?tanpa=miring`):** `stand()` memutar billboard ke kamera dan memiringkannya ke belakang; kaki tetap di tempat (dicek dengan Three.js untuk beberapa arah kamera). Hero, musuh, bos, kartu NPC, warga & hero di kota.
- [x] **4. Musuh biasa bergerak (`LOOK.foeAnim`, `?tanpa=gerak`):** tanpa gambar baru — bagian atas gambar dilenturkan (vertex shader `uBend`): condong ke arah jalan, mundur & merunduk saat ancang-ancang (`wind`/`fuse`/tell), menerjang saat seruduk, tertinggal saat dipukul, bernapas saat diam; yang mati **jatuh & memudar** 0,35 detik lalu dibebaskan.
- [x] **Ringan:** cahaya tepi mati (`BILL_U.uRimOn`, diisi `Stage.setQuality`; juga saat Auto turun ke Ringan karena FPS rendah). Bayangan kontak (kini satu gambar yang dicap, bukan gradien per figur), kemiringan dan gerak musuh tetap: biaya GPU-nya hampir nol. Perbaikan: bayangan lembut sempat ikut dipakai untuk setiap permata/koin di tanah (ratusan gradien per frame) — kini hanya untuk hero, musuh, bos, NPC.
- [x] **5. Cek manual pemilik:** "oke" (PC pemilik sedang berat, FPS rendah di semua tampilan — bukan karena prototipe).

- [x] **6. Musuh benar-benar bergerak (`LOOK.foeFrames`, `?tanpa=animasi`):** contoh di `app/gerak.html`; di game untuk Serigala Bayang, Golem, Lendir. `art/foeanim.js` (bagian tubuh kit anime yang digerakkan, `FRAME_PLAN` 23 gambar: diam 4, jalan 6, ancang-ancang 3, serang 3, kena pukul 2, mati 5; `frameAt`; tes) + `render3d/foeframes.js` (lembar gambar per jenis, dibuat **sekali** saat pertama terlihat dengan ukuran & filter pixel yang sama dengan sprite lama; waktu & ukuran dicatat di console `[cq] foe frames`). Tiap musuh punya salinan tekstur yang berbagi satu gambar di GPU dan hanya menggeser jendelanya (12 fps): tanpa menggambar saat bermain. Keadaan: kena pukul (kilat), ancang-ancang, seruduk, gigit/hantam saat menempel (berulang), jalan, diam; mati memutar gambar jatuh lalu memudar. Kilat putih & beku biru lewat shader (`uTint`). Perkiraan memori ±0,5–1,2 MB per jenis.

- [x] **7. Pengaturan → Grafis:** "Animasi musuh" (`foeMotion`, `data/look.js` `setFoeMotion`, bisa diubah saat bermain: musuh kembali ke satu gambar) dan "Cahaya tepi karakter" (`rimLight`, `stage.js` `setRimLight`, lewat uniform yang sama dengan Ringan). Pengaturan v8 + migrasi 7 → 8 (keduanya nyala).

## Kriteria berhasil

- Di screenshot iPhone landscape karakter tidak terlihat ditempel: sisi terangnya searah bayangan pohon, kaki menapak, ada kilau obor di tepi tubuh di malam hari/dungeon.
- Lendir/serigala terasa hidup seperti hero; Raja Maw satu keluarga dengan mereka.
- Perbedaannya jelas dibanding `?lama` (bukan setelan halus).
- FPS di iPhone tidak turun nyata (shader menambah 3 bacaan tekstur per piksel karakter saja).
- Gameplay, save, tes tidak berubah.

## Berikutnya (setelah disetujui)

Semua musuh ke kit anime; cahaya arena bos per fase; tanda bentuk senjata Unik; animasi mati khas per kelas.
