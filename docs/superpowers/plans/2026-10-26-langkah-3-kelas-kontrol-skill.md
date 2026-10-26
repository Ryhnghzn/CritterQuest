# Langkah 3 — Kelas, kontrol, skill (+ tampilan baru)

Spesifikasi: `../specs/2026-10-26-critter-quest-arcade-design.md` §4.2, §5.1–5.3, §5.5, §8, §12 (langkah 3).
Dipecah per bagian; tiap bagian dicek manual oleh pemilik sebelum commit.

Keputusan 2026-10-26: tampilan diganti dari pixel art ke **kartun vektor halus** (bentuk bulat, outline tebal, gradien, bayangan lembut, font Fredoka). Dikerjakan lebih dulu agar efek serangan/skill langsung memakai gaya baru.

## 3A — Tampilan baru
- [x] Spesifikasi §8 diperbarui ke gaya vektor
- [x] Renderer resolusi penuh (devicePixelRatio) dengan zoom adaptif (sisi pendek layar ≈ 360 unit dunia)
- [x] `art/doll.js` vektor: karakter chibi, 5 gaya × 6 warna rambut, ciri khas baju tiap kelas, pose idle/jalan/kena
- [x] `art/sprites.js` vektor: 4 musuh, permata, hati, dekor, ikon (senjata prototipe + berkah)
- [x] Dunia: tanah berpola, dekor, kabut di tepi arena, vinyet, bayangan entitas, efek senjata prototipe bergaya baru
- [x] Menu & HUD: font Fredoka, panel membulat, tombol pil bergradien, ikon SVG; tata letak HP dicek
- [x] Pemain di ronde digambar sebagai karakter (paper doll), bukan critter

## 3B — Stat kelas + kontrol
- [x] Ronde memakai `finalStats()` karakter
- [x] Bidik mouse (PC) / otomatis ke musuh terdekat (HP), dodge (Spasi / tombol)
- [x] Joystick sentuh setengah layar kiri, tombol Jeda di HUD

## 3C — Sistem hit + serangan dasar
- [x] `run/hits.js` + tes: sekali-kena per instans, area per tik
- [x] Serangan dasar 4 kelas (klik/tahan, tombol Serang), kritis, `def`
- [x] Kartu level-up hanya berkah stat (kartu senjata dihapus)

## 3D — Skill
- [x] Skill Q/E 4 kelas, cooldown + `cdr`, beku (Nova Es)
- [x] HUD ikon skill + cooldown; tombol skill sentuh
- [x] Mode AUTO (permintaan pemilik): serang + bidik otomatis, tombol F / tombol AUTO; `settings` naik ke versi 2 dengan migrasi + tes; spesifikasi §5.1 & §9.2 diperbarui
