# Quest Beragam — Rencana Kerja

> **Untuk agen:** kerjakan per bagian (A–D). Spesifikasi §42. `run/` & `meta/` murni + tes. Angka di `data/questev.js`. Teks baru `tr()`/`t()` + kamus EN. Commit tanpa Co-Authored-By. Sesi lain mungkin mengubah file yang sama: stage hanya hunk sendiri.

**Arsitektur:** langkah quest `event` (data/quests.js) → `meta/quests.js` `fieldQuests` mengirim event aktif ke dunia → `run/questev.js` menjalankan event (mulai di titik `at`, `stepEvents(run, dt)`, berhasil → `run.eventsDone`, gagal → reset) → `main.js` `commitField` → `applyField`/`countQuests` (`trip.events`) menyelesaikan langkah. Gambar di `render3d/field.js` (kartu & mesh) + `render/questev.js` (2D).

## Bagian A — Mesin event + Kawal & Bertahan
- [x] A1 `data/questev.js` angka; `run/questev.js` mesin (mulai, langkah, berhasil/gagal, reset) + Kawal + Bertahan; tes.
- [x] A2 `meta/quests.js`: langkah `event` (fieldQuests → events, countQuests trip.events, questTarget ke titik mulai / NPC kawalan), jurnal; tes.
- [x] A3 4 quest baru (2 Kawal, 2 Bertahan) + kamus EN.
- [x] A4 Gambar: NPC kawalan (kartu pixel + bar HP), altar ber-HP, lingkaran mulai; peta/minimap; panah.
## Bagian B — Buronan & Sarang (2 + 2 quest)
- [x] B1 Buronan: elite bernama, lingkaran jejak di peta (sedikit meleset dari tempatnya), kabur di 50% ke tempat kedua lalu pulih sedikit; hilang lagi bila ditinggal > 2600.
- [x] B2 Sarang: musuh diam ber-HP (`e.nest`), mengirim musuh berkala (batas 14), gagal bila ditinggal; mesh sarang 3D.
- [x] B3 4 quest (Si Ekor Merah, Lidah Bara, Sarang Gurun, Sarang Kawah) + kamus EN + tes.
## Bagian C — Penyelamatan & Balapan (2 + 2 quest; save v23 untuk rekor)
- [x] C1 Save v23: `quests.choices`, `quests.races` + migrate() 22 + tes.
- [x] C2 Penyelamatan: kamp (pagar, kandang), 6 penjaga (1 elite), kandang terbuka saat penjaga habis, masuk kandang = bebas.
- [x] C3 Balapan: cincin di jalan utama tiap 900, waktu medali dari panjang rute (perunggu bisa jalan kaki, emas perlu mount), hadiah koin per medali, rekor di save, jam di layar.
- [x] C4 4 quest (Ayah Kai, Murid Pandai Kaca, Jalur Pemburu, Balapan Kafilah) + kamus EN + tes.
## Bagian D — Pilihan (langkah `choice`, 2 quest) & Peristiwa dunia (3 jenis)
