# Rencana: Rasa Pukulan (Combat Game Feel)

Tujuan: pertarungan yang **sudah ada** terasa lebih mantap, responsif, dan berkesan. Tidak ada konten baru, tidak ada perubahan keseimbangan. Semua angka ada di `data/fx.js`. Efek baru hanya memakai sistem yang sudah ada (`run.vfx` pool, `addShake`, `addHitStop`, `FLOATER`, `sfx`), jadi ikut aturan Penuh/Ringan/Auto, pengaman beban, Guncangan layar, dan reduced-motion.

Kerja per bagian; berhenti untuk cek manual pemilik tiap bagian, commit setelah oke. Setiap bagian yang selesai dicatat di `docs/fitur-game.md`.

## Tangga dampak

| Momen | Jeda (hit-stop) | Guncangan | Angka | Lain |
|---|---|---|---|---|
| Pukulan biasa | – | – | kecil putih | musuh tersentak sedikit |
| Kritikal | 0,03 s (paling sering 1× per 0,18 s) | – | miring, besar | sentakan lebih jauh |
| Hit skill (pertama per hit) | 0,03 s (dibatasi) | – | sedang, warna elemen | sentakan sedang |
| Hit ultimate | 0,05 s (dibatasi) | ringan | emas | sentakan terjauh |
| Elite mati | 0,05 s | ringan | – | lingkaran emas |
| Bos ganti fase | 0,22 s | besar | banner | kilat, 2 lingkaran, suara |
| Bos tumbang | 0,25 s | besar | banner | (sudah ada) |

## Bagian

- [x] **A. Fondasi & tangga dampak (P0):** perbaikan guncangan `'big'` yang membuat getar mati permanen (NaN); tingkat `big`; hit-stop baru (`skill`, `ultHit`, `elite`, `phase`, `bossKill`) dengan jarak minimum untuk kritikal/skill agar AoE tidak tersendat; musuh tersentak saat dipukul (hanya gambar, `run/vfx.js` `recoilOf`); angka damage gaya `skill`; batas jumlah angka; elite & musuh biasa mati lebih jelas; bos ganti fase dramatis (ketujuh bos punya fase, dan garis murka selalu jatuh di garis fase, jadi tidak perlu efek murka terpisah). Tes `run/impact.test.js`.
- [x] **B. Kamera (P1):** `run.addPunch` + `PUNCH` (Mengamuk 4%, ultimate 7%, fase 10%, bos tumbang 14%), turun menurut waktu game (tertahan selama hit-stop), `Stage.leanIn` menghaluskan; `R.punchOn` = Guncangan layar nyala & bukan reduced-motion (tetap di Ringan).
- [x] **C. Identitas kelas (P1):** Murka: bara di kaki (× isi², mulai 15%) + auman saat Mengamuk; Panas: cahaya mulai 50, `overheatFx` (kilat, cincin, asap, desis); Bidik: `focusReadyFx` (ting + cincin); Kombo: `drawComboMark` (wajik di lantai, berdenyut saat penuh), `comboReadyFx` sekali saat penuh, `comboFinisherFx` (tebasan silang, jeda `ultHit`). Bunyi sintetis `roar`/`sizzle`/`ready` di `core/audio.js`.
- [ ] **D. Rapi (P2):** kilat `castFx` menghormati reduced-motion; overlay angka tanpa salinan objek per frame; guncangan berarah (opsional).
- P3 (tidak dikerjakan): sistem animasi kematian penuh, slow-motion global, efek pasca-proses baru.
