# Rencana: Bos yang Berkesan

Tujuan: pertarungan bos yang **sudah ada** lebih mudah dibaca dan punya momen untuk membalas, bukan sekadar lebih sulit. Nama, cerita, dungeon, hadiah dan save bos tidak berubah. Angka di `data/enemies.js` (per bos) dan `data/fx.js` (tampilan bersama).

Kerja per bagian; berhenti untuk cek manual pemilik tiap bagian, commit setelah oke. Yang selesai dicatat di `docs/fitur-game.md`.

## Audit singkat (sebelum)

- Semua bos: jurus dipilih acak tiap 2,2–2,8 detik (marah 1,2–1,8); jurus yang sama bisa beruntun.
- Cincin, spiral, panggilan, gema keluar **di frame yang sama** saat jurus dipilih; tandanya hanya suara `boss` yang sama.
- Tidak ada jendela membalas: setelah jurus bos langsung berjalan lagi; damage yang diterima selalu sama.
- Fase 2 menukar daftar jurus; "marah" hanya menambah jumlah (peluru, lengan, hantaman).

## Alat bersama (dinyalakan per bos lewat data)

- `tell: { ring, spiral, summon }` — **ancang-ancang** (detik) sebelum jurus itu keluar: bos berhenti, partikel berkumpul ke tubuhnya dengan warna jurus (cincin = mengumpul ke dalam; spiral = berputar searah putaran peluru; panggilan = asap naik + auman), bunyi sintetis berbeda per jenis.
- `noRepeat: true` — jurus yang sama tidak keluar dua kali beruntun.
- **Lelah** (`e.tired`): bos diam, tidak melukai dengan sentuhan, menerima damage lebih (memakai tanda `vulnT/vulnK` yang sudah ada), bintang berputar di atas kepala.

## Bagian

- [x] **A. Alat bersama + Raja Maw:**
  - Telan: kalau gigitan terakhir **meleset** (kabur, dodge, atau ditangkis) Maw **tersedak**: lelah 2,2 detik, damage +30%.
  - Bayang Kembar: bayangan menjadi **makhluk yang bisa dihancurkan** (HP 1% bos, 2,2 detik); yang hancur tidak menembak. Tanpa hadiah, tidak masuk buku monster, hilang sendiri.
  - Fase 2 "LAPAR!": Telan **dua kali** (bidik ulang), tersedak hanya bila gigitan kedua meleset; 3 bayangan.
  - Ancang-ancang cincin & panggilan; tanpa ulang beruntun.
  - Hanya jurus Maw sendiri: gema Sang Gerhana dan penjaga harta tetap seperti dulu.
  - Diubah dari usulan audit: "satu bayangan adalah Maw asli" diganti "bayangan bisa dihancurkan" (Maw asli di antara bayangan butuh gambar bayangan seukuran bos; bisa menyusul).
  - Tes: `run/bossmoves.test.js` "Raja Maw: membaca & membalas"; tes bench bos 60–90 dtk tetap lolos.
- [x] **B. Raja Mumi:**
  - Kutukan yang meledak di tubuh Mumi: 3% HP maks, lelah 2,2 detik, damage +30% ("KUTUKAN BERBALIK!").
  - Fase 2: 2 Penjaga Sarkofagus (HP 3% Mumi, tali emas + cincin perisai di `render/foes.js`); selama ada yang berdiri Mumi menerima 50% damage; yang terakhir hancur → "PERISAI RUNTUH!" (lelah 2,5 detik). Bidik otomatis mendahulukan sarkofagus (Mumi terlindung dihitung 2× lebih jauh).
  - Ancang-ancang & tanpa ulang beruntun.
  - Bench: bot memukul perisai dulu; rata-rata bos 83,9 dtk (sebelum 82,4). HP sarkofagus diturunkan 5% → 3% karena Mage (yang memang paling lambat) butuh 19 detik untuk memecahkannya.
  - Tes: `run/bossmoves.test.js` "Raja Mumi: kutukan berbalik & sarkofagus".
- [x] **C. Raja Lava:** setelah Meteor mendinginkan diri 2,6 detik (`e.vent`): diam, punggung (sisi jauh dari pemain) ×1,6 damage dalam irisan 140° yang digambar di tanah (`render/foes.js`); fase 2: kolam lava dalam 280 membatu. Bench rata-rata 84,0 dtk.
- Berikutnya (setelah prototipe disetujui): Raja Lava (Kepanasan), Golem Kristal (Kulit Kristal), Ratu Spora (jamur bisa dipukul), Sang Gerhana (gema berurutan), Bayangan Diri (meniru job).
