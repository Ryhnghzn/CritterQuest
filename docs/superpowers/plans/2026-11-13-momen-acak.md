# Rencana: Momen Acak di Dunia (eksplorasi yang hidup)

Tujuan: saat menjelajah, sesekali ada sesuatu yang membuat pemain berhenti: "Eh… apa itu?". Bukan konten besar, bukan sistem baru: **"Peristiwa dunia" yang sudah ada** (`run/questev.js` `stepHappenings`, angka `HAPPEN` di `data/questev.js`) diperluas.

Kerja per bagian; berhenti untuk cek manual pemilik tiap bagian, commit setelah oke. Yang selesai dicatat di `docs/fitur-game.md`.

## Prinsip

- **Tetap jarang:** satu peristiwa dunia sekaligus, jeda 5–8 menit (sudah ada). Tiap jenis punya bobot dan waktu munculnya sendiri (pagi/siang/sore/malam).
- **Tanda halus, bukan pengumuman:** jenis "diam" (`quiet`) tidak memasang banner dan tidak muncul di peta sampai pemain melihatnya sendiri (cahaya, partikel, debu, suara, tanah bergetar).
- **Boleh diabaikan:** semuanya hilang sendiri (habis waktu atau ditinggal jauh) dan membersihkan musuh/partikelnya.
- **Simpan tidak berubah:** peristiwa tidak disimpan; memuat ulang = peristiwa hilang. Hadiahnya masuk lewat jalur perjalanan yang sudah ada (koin, bahan, permata, gear, buku monster, peluang mount).
- **Performa:** tidak ada objek 3D/kanvas baru; cahaya dibuat dari partikel pool `run.vfx`, tanda tanah digambar di lapisan tanah yang sudah ada.

## Bobot & waktu (`HAPPEN.kinds`)

| Jenis | Kapan | Bobot | Sifat |
|---|---|---|---|
| Karavan | pagi, siang | 1 | tugas (lama) |
| Serbuan | kapan saja | 1 | tugas (lama) |
| Hujan Meteor | kapan saja | 0,8 | bahaya + hadiah (lama) |
| **Cahaya Aneh** | sore, malam | 1 | misteri: kejar → hadiah 70% / jebakan 30% |
| **Raksasa Pengembara** | kapan saja, malam ×3 | 0,25 | bos langka, boleh dilawan/dihindari; jeda 15 menit |
| Pedagang Kelana (B) | malam | 0,6 | pedagang 1–2 barang langka |
| Kabut Sunyi (B) | pagi, sore | 0,5 | suasana saja |

## Bagian

- [x] **A. Kerangka + 2 peristiwa:** syarat waktu & bobot per jenis (`game.phase` dari `main.js`), jenis diam + "terlihat" (peta & tanda baru muncul saat dekat), waktu habis per jenis, jeda per jenis; **Cahaya Aneh** dan **Raksasa Pengembara**; bunyi sintetis `rumble`/`glint`; perbaiki guncangan `'small'` → `'light'`; perbaiki label 3D yang membaca `who.x` saat Hujan Meteor berjalan (tidak ada npc/altar); `spawnGiant` & `treasureLoot` dipisah dari penjaga harta dan dipakai bersama; tes di `run/questev.test.js`.
- [ ] **B. Pedagang Kelana + Kabut Sunyi.**
- Tidak dikerjakan: rantai peristiwa (lebih cocok sebagai side quest biasa di sistem quest yang sudah ada), menyimpan peristiwa di save.
