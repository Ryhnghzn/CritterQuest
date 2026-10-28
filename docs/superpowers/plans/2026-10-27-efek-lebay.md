# Efek Lebay — Skill, Aura & Item

Permintaan pemilik (2026-10-27): efek serangan skill, aura item, dan bentuk item dibuat "sangat keren, lebay tidak apa-apa, setiap item-nya".
Acuan visual: halaman perbandingan `app/compare.html` (versi piksel: putaran api, nova kristal, lingkaran rune, komet + ledakan, sayap bulu api, item Mitos berdenyut).
Gaya tetap **vektor kartun + dark fantasy** (pilihan murah, tanpa gambar ulang seluruh seni). Ide dari versi piksel diterjemahkan ke vektor.
Tiap bagian dicek manual (PC & HP) sebelum commit.

## Prinsip

- **Berlapis:** setiap efek punya 4 lapis — *antisipasi* (ancang-ancang 0,05–0,15 dtk), *ledakan inti* (kilat putih → warna elemen), *sisa* (partikel, asap, retakan, bara), dan *umpan balik* (getar layar, hit-stop, angka damage besar).
- **Satu elemen satu palet:** api (putih→kuning→oranye→merah tua), es (putih→sian→biru), petir (putih→ungu muda), racun (hijau limau→hijau tua), bayangan (ungu→hitam), baja/suci (putih→emas), darah (merah→merah tua). Disimpan di `data/fx.js`.
- **Glow murah:** `globalCompositeOperation = 'lighter'` + gradien radial yang di-cache ke kanvas kecil (bukan `shadowBlur` yang berat di HP).
- **Rarity terasa:** warna rarity (`RARITIES[].color`) mewarnai jejak senjata, kilat tebasan, dan partikel serangan dasar. Makin tinggi rarity, makin banyak lapisan.
- **Tetap terbaca:** efek pemain tidak boleh menutupi peluru/telegraf musuh. Alpha efek pemain dibatasi, telegraf bos selalu digambar di atasnya.
- **Anggaran HP:** batas partikel (mis. 400 di PC, 180 di HP), kumpulan objek dipakai ulang (pool), dan efek yang di luar layar tidak digambar.

## A — Fondasi mesin efek

- [x] `data/fx.js`: palet elemen, durasi, jumlah partikel, kekuatan getar & hit-stop per efek (semua angka di sini)
- [x] `render/fxkit.js`: pool partikel (titik, garis/percikan, asap, bara, kepingan, bintang 4 sudut), cincin kejut, kilat layar, retakan tanah, sprite glow yang di-cache per warna
- [x] Getar layar bertingkat (ringan / sedang / berat) + **hit-stop** 30–80 ms untuk kritis, ultimate, dan bos
- [x] Angka damage: kritis lebih besar, miring, bergetar, warna elemen; angka ultimate memakai garis tepi emas
- [x] Pengaturan **Efek: Penuh / Ringan** (Ringan = ½ partikel, tanpa getar). Pengaturan naik versi + langkah `migrate()`; label lewat `tr()` + kamus EN
- [x] Pengukur FPS di panel cheat; turunkan otomatis ke Ringan bila FPS < 40 selama 3 detik
- [x] Tes Vitest untuk logika murni (pool tidak melebihi batas, pemilihan tingkat kualitas)

Catatan A: logika pool & pengawas FPS di `run/vfx.js` (RNG sendiri, tidak memakai RNG simulasi); gambar di `render/fxkit.js`. Hit-stop ditahan di loop `main.js` (tombol tetap antre). Pengaturan v4 `effects: 'full'|'lite'`, tombol di layar Jeda. Turun otomatis ke Ringan hanya untuk sesi itu. Panel cheat → bagian Efek: ledakan/angka uji, hit-stop, getar 3 tingkat, FPS.

## B — Serangan dasar & jejak senjata

| Kelas | Sekarang | Versi lebay |
|---|---|---|
| Warrior — tebasan | busur tipis | busur tebal 3 lapis (inti putih, warna rarity, pinggir gelap) + percikan baja di titik kena + debu di kaki |
| Archer — panah | garis + jejak | panah berpendar, jejak pita warna rarity, ledakan bintang kecil saat kena, bulu panah tertinggal |
| Mage — bola api | bola + ledakan | bola api berinti putih, ekor bara bergoyang, ledakan dengan cincin kejut + asap + bara memantul |
| Assassin — tusukan | tusukan pendek | tusukan kembar bersilang, kilat "X" ungu, tetes bayangan |

- [x] Rarity Legendaris ke atas: tiap serangan ke-3 mengeluarkan "gema" (bayangan senjata transparan mengulang gerakan)
- [x] Mitos: jejak senjata memakai pelangi merah-emas-ungu yang mengalir

## C — Skill (24) & ultimate (4)

Catatan B+C: partikel di `run/skillfx.js` (castFx / stepHitFx / impactFx / stepPlayerFx, hanya menulis ke `run.vfx`), bentuk per id skill di `render/skillfx.js` (`hit.sid`), angka di `data/skillfx.js`. Tabel serangan dasar di atas sudah dibuat semua. Meteor: damage tetap instan, ekor meteor digambar "baru saja jatuh".

Skill yang sekarang berbagi tampilan (`look`) mendapat efek sendiri.

### Warrior
- [x] **Putaran Pedang** — 3 bilah api berputar, pusaran debu tersedot ke tengah, percikan terlempar keluar, cincin terakhir meledak
- [x] **Teriakan Baja** — badan menyala emas, 3 cincin kejut bertumpuk, tanah retak, tulisan rune "ᛉ" berkilat sesaat di atas kepala
- [x] **Hantaman Bumi** — melompat sedikit, pedang menghantam, tanah pecah membentuk bintang retakan, batu terlempar ke atas lalu jatuh, debu tebal
- [x] **Terjang** — bayangan sisa (afterimage) 4 lapis, jejak api di lantai, garis kecepatan, benturan berkilat di tiap musuh
- [x] **Lempar Kapak** — kapak berputar dengan cakram cahaya, jejak spiral, percikan di tiap tembusan, kapak berdesing kembali
- [x] **Amarah Perang** — aura merah menyala dari kaki, mata berkilat, uap amarah naik dari bahu selama buff
- [x] **Ultimate — Badai Pedang** — 6 bilah raksasa mengorbit, tornado debu & api, musuh tersedot terlihat jelas, layar sedikit kemerahan, ledakan penutup + hit-stop panjang

### Archer
- [x] **Hujan Panah** — lingkaran rune berputar di tanah, panah berkilau jatuh miring, tiap panah memercik bintang, panah tertancap sebentar
- [x] **Tembakan Tembus** — ancang-ancang (busur ditarik, cahaya terkumpul), sinar panah tebal menembus, gelombang udara berbentuk kerucut, garis sisa memudar
- [x] **Panah Beruntun** — 5 panah dengan pita warna masing-masing, kilat moncong busur berbentuk kipas
- [x] **Lompatan Mundur** — pusaran angin hijau, bulu beterbangan, ledakan es di titik awal dengan kristal mencuat
- [x] **Ladang Jebakan** — duri logam muncul dari tanah bergelombang, kilau logam, sulur tanaman melilit musuh yang lambat
- [x] **Mata Elang** — mata elang transparan di atas kepala, garis bidik tipis, bulu emas melayang
- [x] **Ultimate — Hujan Bintang** — langit menggelap, rasi bintang tergambar, bintang jatuh dengan ekor panjang, tiap jatuh meninggalkan kawah bercahaya

### Mage
- [x] **Nova Es** — kilat putih, cincin es dengan kristal mencuat, embun beku menjalar di lantai, kepingan salju, musuh beku dibungkus kristal
- [x] **Petir Berantai** — petir bercabang zig-zag tebal + tipis, kilat di tiap lompatan, sisa listrik menari di musuh, layar berkedip ungu sekilas
- [x] **Meteor** — bayangan target membesar, meteor berapi dengan ekor jatuh dari atas layar, ledakan besar, kawah membara, batu meleleh
- [x] **Teleportasi** — tubuh pecah jadi serpihan cahaya, garis rune menghubungkan dua titik, muncul dengan cincin sihir
- [x] **Bola Api Raksasa** — bola berputar dengan lidah api, menarik partikel sekitar, ledakan berlapis + cincin kejut + hujan bara
- [x] **Perisai Mana** — kubah heksagonal biru berputar, retak berkilat saat menahan damage, rune melayang
- [x] **Ultimate — Hujan Meteor** — langit merah, lingkaran sihir raksasa, meteor berbagai ukuran, tanah membara, getar terus-menerus

### Assassin
- [x] **Langkah Bayangan** — tubuh jadi asap ungu, garis potong hitam-ungu, tebasan "X" di tiap musuh yang dilewati
- [x] **Kipas Belati** — 11 belati dengan jejak ungu, kilau logam berputar, belati menancap sebentar lalu menghilang jadi asap
- [x] **Kabut Racun** — awan hijau bergelembung, tengkorak samar di dalam kabut, tetes racun di musuh
- [x] **Bom Asap** — ledakan asap tebal, bintang-bintang pusing di musuh beku, siluet pemain samar selama buff
- [x] **Shuriken** — shuriken berputar dengan cakram cahaya, percikan saat menembus
- [x] **Naluri Pembunuh** — mata merah menyala, aura bayangan berkobar, tanda target merah di musuh terdekat
- [x] **Ultimate — Tarian Seribu Bayangan** — 6 klon bayangan menebas bergantian dari berbagai arah, garis potong memenuhi area, layar menggelap ungu, ledakan potongan di akhir

## D — Aura

### Cincin level (per 10 level)
- [x] LV 10–19 cincin tipis · 20 rune berputar · 30 cincin ganda + partikel naik · 40 pilar cahaya tipis + rune melayang · 50 lingkaran emas besar, sinar berputar, mahkota cahaya kecil di atas kepala

### Aura rarity (gear terbaik yang dipakai)
- [x] Langka: kilau biru sesekali di senjata
- [x] Epik: kabut ungu tipis di kaki + kilau senjata
- [x] Legendaris: api emas lembut di sekitar badan, partikel naik, senjata menyala
- [x] Mitos: semua di atas + sayap/lingkaran cahaya merah-emas, kilat pelangi di senjata, bayangan cahaya di lantai, partikel bintang 4 sudut
- [x] **Set lengkap** (6 slot Legendaris+): aura menyatu jadi satu pilar besar saat diam 2 detik

### Efek unik (14) — dibuat jauh lebih ramai dari sekarang
- [x] `phoenix` — sayap bulu api (7 bulu per sisi, mengepak), ekor api, bara jatuh. Saat bangkit: ledakan api burung phoenix menutupi layar
- [x] `lifesteal` — kabut merah berputar + benang darah mengalir dari musuh yang dipukul ke badan
- [x] `thorns` — mahkota duri hitam berputar di kaki, duri mencuat saat dipukul
- [x] `explode` — bara melayang; tiap kill memicu ledakan kecil berlapis
- [x] `regen` — daun & cahaya hijau berputar naik, bunga kecil mekar di tanah saat berjalan
- [x] `goldfind` — koin berkilau berputar, kilau emas saat musuh jatuh
- [x] `expfind` — huruf rune biru melayang naik
- [x] `chain` — busur petir terus-menerus di sekitar badan, menyambar ke tanah sesekali
- [x] `execute` / `bossdmg` — mata merah menyala + tengkorak samar di atas musuh ber-HP rendah
- [x] `dodgecd` — pita angin berputar, bayangan sisa saat bergerak
- [x] `shield` — kubah heksagonal transparan, berkilat saat menahan
- [x] `frenzy` — kobaran merah dari kaki, uap amarah, denyut layar tipis

Catatan D: angka di `data/aurafx.js`; logika murni (tier cincin, `setRarity`, diam/bunga) di `art/auratier.js` + tes `art/aura.test.js`; event efek unik di `run/auraevents.js` (lewat `game.vfx`). `avatarOf` (main.js) membawa `set` & `lite` untuk kota/rumah.

## E — Bentuk item

### Ikon gear (`art/gear.js`) per rarity
- [x] Biasa → Bagus → Langka: bentuk makin rinci (gagang, ukiran, permata)
- [x] Epik: permata menyala, ukiran rune
- [x] Legendaris: bilah/zirah berpendar, rune bergerak, partikel emas di kartu ikon
- [x] Mitos: bentuk paling megah per slot (lihat bawah), halo berdenyut, api/kilat/racun bergerak, bingkai kartu beranimasi

### Bentuk Mitos per slot (mengikuti versi lebay di halaman perbandingan)
- [x] **Pedang** — bilah lebar bergerigi, rune menyala mengalir, pelindung tangan bersayap, api di ujung
- [x] **Busur** — busur bulan sabit dengan sayap, tali cahaya, panah bintang terpasang
- [x] **Tongkat** — bola kristal mengambang dikelilingi cincin rune, api ungu, kepingan melayang
- [x] **Belati** — belati kembar melengkung, tetes racun, asap bayangan
- [x] **Helm** — tanduk besar, celah mata menyala, mahkota api
- [x] **Zirah** — pelat dada dengan permata inti berdenyut, bahu bertanduk, retakan magma
- [x] **Sepatu** — sayap kecil di tumit, jejak api, sol berpendar
- [x] **Kalung** — mata naga berkedip di dalam permata, rantai emas
- [x] **Cincin** — batu permata berputar, cincin api kecil mengorbit

### Gear di badan (`art/doll.js`)
- [x] Senjata Legendaris+ terlihat menyala di tangan; Mitos punya partikel & jejak sendiri
- [x] Helm/zirah Mitos menampilkan detail yang sama dengan ikonnya (tanduk, permata inti)

### Jatuh & ambil
- [x] Drop di lantai: pilar cahaya warna rarity (Legendaris tinggi, Mitos sangat tinggi + berdenyut + cincin cahaya memancar seperti bunyi "ding")
- [x] Ambil Mitos: layar berkilat merah-emas, kartu item muncul besar sebentar dengan nama berkilau
- [x] Buka peti: tutup terlempar, sinar keluar sesuai rarity tertinggi di dalamnya

## F — Verifikasi
- [x] `npm test` lulus, `npm run build` sukses
- [ ] Cek manual tiap bagian di PC dan HP (FPS tetap ≥ 50 di PC, ≥ 40 di HP pada mode Penuh; Ringan selalu lancar)
- [x] Screenshot tiap kelas memakai skill + ultimate, aura LV 50 Mitos, dan semua ikon Mitos (headless; FPS di Chromium tanpa GPU 1280×720: ±52 dengan/tanpa efek penuh)

## Urutan kerja yang diusulkan

| Bagian | Isi | Perkiraan |
|---|---|---|
| A | Fondasi mesin efek + pengaturan | 1 sesi |
| B + C-Warrior | Serangan dasar semua kelas + skill Warrior | 1 sesi |
| C-Archer, C-Mage | Skill & ultimate | 1 sesi |
| C-Assassin + D | Skill Assassin + semua aura | 1 sesi |
| E | Ikon, gear di badan, drop & peti | 1 sesi |
