# Rencana: Eksplorasi Dunia & Cerita Lingkungan

Tujuan: menjelajah terasa berharga dan misterius; pemain kadang menemukan sesuatu **tanpa** penanda quest. Memakai yang sudah ada (±200 reruntuhan lingkaran batu yang selama ini hanya hiasan, kerangka peristiwa diam Momen Acak, lingkaran petunjuk Buronan, isi peti harta, jam siang–malam). Tidak mengisi setiap ruang kosong.

Audit (ringkas): dunia besar & tersambung, 20 peti harta, 16 rumah tersembunyi, 6 gerbang dungeon yang dicari, peristiwa acak (termasuk Cahaya Aneh, Raksasa, Pedagang Kelana, Kabut). Kurang: reruntuhan hanya hiasan; dunia tidak bercerita tentang bosnya; menjelajah peta tanpa hadiah; tidak ada rahasia di luar peristiwa acak; "drop malam" hanya satu quest.

## Paket pertama (save tidak berubah)

- [x] **A. Lingkaran Batu malam:** ±1 dari 6 reruntuhan (`wakes`, hash posisi, sama untuk semua save) terjaga **hanya malam** (`run.phase === 'moon'`): partikel naik dari batu, genangan cahaya & rune di lantai (`render3d/field.js`, dari `run.stonesLit`), tulisan "Batu-batu itu bercahaya…" + denting saat terlihat (900). Berdiri di tengah (`inner` 0,55 × jari-jari) 3 detik → Debu 3–6, Kristal 1–2, 25% permata; sekali per malam per lingkaran (`nightOf`, ingatan perjalanan, tidak disimpan); hadiah langsung tersimpan lewat `eventsDone`. Angka `STONES` di `data/world.js`, logika `run/stones.js`, tes `run/stones.test.js`.
- [ ] **B. Peta Usang:** jatuh jarang dari elite dunia; lingkaran petunjuk di peta; gundukan dengan kilau yang terlihat saat dekat; berdiri 2 detik menggali → isi peti harta (kadang jebakan).

## Nanti (dicatat)

- **Jejak Kaki Besar:** peristiwa diam pagi/sore; jejak di lantai ±800 menuju sarang elite pucat yang tidur; +25 kill buku monster & 1 gear.
- **Prasasti Para Raja:** 3 lingkaran khusus per zona → potongan cerita bos zona; lengkap → Jurnal → Kenangan (save naik).
- **Penjelajah Zona:** 50%/100% kabut sebuah zona terbuka → Lencana & bahan (save naik).
- Ditunda: gua/jalan rahasia (ruang & aset baru).
