# Prompt Musik & Daftar File Suara — Critter Quest

Prompt untuk membuat musik latar di generator musik AI (Suno, Udio, dll.), ditambah daftar nama file
untuk efek suara yang dicari sendiri. Prompt ditulis dalam bahasa Inggris karena hasil generator
biasanya lebih baik. Penjelasan dalam bahasa Indonesia.

## Status file (2026-10-31)

**Sudah terpasang di game (17 file):**

| Kelompok | File | Dipakai untuk |
|---|---|---|
| Musik | `musik-judul`, `musik-kota`, `musik-dungeon`, `musik-bos`, `musik-epilog` | Sesuai namanya; musik bos menggantikan musik lain selama bos hidup |
| Musik | `musik-wilayah`, `musik-wilayah2` | Dunia terbuka, bergantian acak dan tidak pernah sama dua kali berturut-turut |
| Jingle | `jingle-naik-level`, `jingle-tamat`, `jingle-kalah` | Naik level, lantai bersih, kalah |
| Serangan | `sfx-serang-pedang`, `sfx-serang-panah`, `sfx-serang-sihir`, `sfx-serang-belati` | Serangan dasar tiap kelas |
| Kena serangan | `sfx-hit-biasa`, `sfx-hit-keras`, `sfx-hit-kritis` | Hit biasa, hit ke elite/bos, kritis |

**Belum ada (45 file efek suara, masih memakai suara dari kode):** kelompok Musuh mati (3), Pemain (5),
Skill (12), Ultimate (4), Mekanik kelas (4), Item (5), Dunia (4), Menu (8). Rinciannya di bagian C.

**Variasi:** nama berakhiran angka (`sfx-hit-biasa2`, dst.) dipakai bergantian secara acak. Setelah
menambah file, kabari aku supaya dicatat di `app/src/data/audio.js`, atau jalankan `npm run audio` lalu
tambahkan sendiri namanya di sana.

## Tempat menaruh file

| Isi | Folder |
|---|---|
| Musik & jingle | `art-src/audio/musik/` |
| Efek suara | `art-src/audio/sfx/` |

Folder `art-src/` adalah tempat file asli dan tidak masuk git. Setelah file siap, kabari aku: file akan
kukompres ke `app/public/audio/` lalu dipasang ke game. Yang belum tersedia tetap memakai suara dari
kode, jadi file boleh masuk bertahap.

## Cara pakai prompt

1. Aktifkan mode **Instrumental**. Tanpa vokal sama sekali.
2. Untuk setiap lagu, gabungkan **GAYA DASAR** + **prompt lagu itu**. Isi **NEGATIF** ke kolom exclude
   kalau generatornya punya; kalau tidak, tambahkan `no vocals, no singing, no EDM` di
   akhir prompt.
3. Buat 2–4 variasi per lagu, pilih yang paling cocok.
4. Durasi 1–2 menit. Pilih hasil yang awal dan akhirnya tenang dengan suasana sama, supaya mudah
   dibuat berulang. Generator jarang menghasilkan loop sempurna; potongan loop-nya aku kerjakan.
5. Unduh sebagai WAV kalau tersedia, MP3 juga bisa. Beri nama sesuai kolom **File**, tanpa diubah.
6. Pastikan paket/lisensi generatornya mengizinkan pemakaian di game yang dirilis, karena game ini
   ada di itch.io.

## GAYA DASAR (tempel di depan setiap prompt)

```
Instrumental dark fantasy video game soundtrack, cinematic and atmospheric, melancholic and mysterious,
minor key, acoustic and orchestral instruments, warm analog recording, loopable, steady mood from start
to finish, no big ending
```

## NEGATIF (exclude)

```
vocals, singing, choir lyrics, spoken words, rap, EDM, dubstep, trap beat, pop, synthwave, chiptune,
8-bit, cheerful, comedy, cute, fade out ending
```

---

## A. Musik latar (6 lagu, berulang)

### A1. Layar judul — `musik-judul`

Dipakai di halaman judul "Api Unggun": empat petualang duduk mengelilingi api di tepi hutan pada malam
hari. Tenang, mengundang, dan menjadi tema utama game.

```
Main theme, intimate campfire at night at the edge of an ancient forest. Solo nylon guitar and low cello
carry a simple memorable melody, soft frame drum, distant wooden flute, gentle swelling strings. Quiet,
wistful, a sense of a long journey ahead. 70 BPM.
```

### A2. Kota — `musik-kota`

Didengar paling lama saat belanja, tempa, dan mengurus karakter, jadi harus nyaman dan tidak melelahkan.

```
Peaceful medieval village under a dark sky, a safe haven. Lute and hammered dulcimer play a warm folk
melody, soft fiddle, light hand percussion, plucked harp. Calm, cozy but slightly weary, never busy,
pleasant to hear for a long time. 85 BPM.
```

### A3. Wilayah terbuka — `musik-wilayah`

Menjelajah dunia terbuka dan bertemu musuh berkelompok. Bergerak maju tanpa terasa tegang terus-menerus.

```
Exploration across wild dangerous lands. Driving low strings ostinato, taiko and frame drums at moderate
intensity, wooden flute and fiddle answering each other, open wide horizon feel, adventurous yet ominous,
restless forward motion. 105 BPM.
```

### A4. Dungeon — `musik-dungeon`

Pertarungan cepat di ruang bawah tanah (hack and slash). Paling energik di antara musik non-bos, dan
tidak boleh bersaing dengan efek suara: hindari melodi tinggi yang rapat.

```
Fast relentless dungeon combat. Pounding war drums and taiko, aggressive staccato cellos and basses,
dark brass stabs, low distorted hurdy-gurdy, tense rhythmic drive, sparse melody, deep underground stone
reverb, urgent and heavy. 140 BPM.
```

### A5. Bos — `musik-bos`

Paling besar dan mengancam. Diputar selama lawan bos.

```
Epic boss battle against an ancient evil. Massive orchestral hits, thunderous taiko ensemble, furious
string runs, roaring low brass, pipe organ, wordless ominous atmosphere without vocals, escalating dread,
climactic and overwhelming. 155 BPM.
```

### A6. Epilog — `musik-epilog`

Layar penutup setelah Menara Gerhana. Sang Gerhana sudah kalah; lega dan sedih bercampur. Memakai
melodi yang terasa seperti versi tenang `musik-judul`.

```
Quiet ending after a long war, the eclipse has passed and dawn arrives. Solo piano and cello, slow
nylon guitar, soft warm strings slowly rising, bittersweet relief, hopeful and tender, sparse and spacious.
60 BPM.
```

---

## B. Jingle (3 file, sekali putar, pendek)

Generator musik kadang sulit membuat lagu sesingkat ini. Buat seperti biasa lalu potong bagian terbaiknya,
atau cari saja bersama efek suara. Isi NEGATIF yang sama tetap dipakai.

### B1. Naik level — `jingle-naik-level` (2–3 detik)

```
Short triumphant fantasy level up sting, rising brass fanfare with bright harp and bell shimmer, 3 seconds,
clean ending.
```

### B2. Lantai/dungeon tamat — `jingle-tamat` (3–5 detik)

```
Short victory fanfare, dark fantasy, proud low brass and strings resolving to a strong major chord,
timpani roll, 5 seconds, clean ending.
```

### B3. Kalah — `jingle-kalah` (3–5 detik)

```
Short somber defeat sting, slow descending cello and low brass, single deep drum hit, fading to silence,
5 seconds.
```

---

## C. Daftar file efek suara (52 file, dicari sendiri)

Semua masuk ke `art-src/audio/sfx/`. Kata kunci di kolom **Cari** bisa dipakai di Freesound, Kenney, dll.
Pilih yang berlisensi CC0 atau yang jelas boleh dipakai di game. Format WAV kalau ada, MP3 juga bisa;
mono, tanpa hening di awal, durasi 0,1–1,5 detik (ultimate sampai 3 detik). Gaya tebal dan realistis,
bukan 8-bit. Ekstensi file mengikuti aslinya.

### Serangan dasar (4)

| File | Bunyi | Cari |
|---|---|---|
| `sfx-serang-pedang` | Tebasan pedang Warrior | sword swing whoosh |
| `sfx-serang-panah` | Lepasan anak panah Archer | bow arrow shot |
| `sfx-serang-sihir` | Bola sihir Mage | magic bolt cast |
| `sfx-serang-belati` | Tusukan cepat Assassin | dagger stab quick |

### Kena serangan (3)

| File | Bunyi | Cari |
|---|---|---|
| `sfx-hit-biasa` | Serangan mengenai musuh | melee hit flesh impact |
| `sfx-hit-keras` | Mengenai musuh berlapis/logam | metal armor hit |
| `sfx-hit-kritis` | Serangan kritis | critical hit heavy impact |

### Musuh mati (3)

| File | Bunyi | Cari |
|---|---|---|
| `sfx-mati-kecil` | Musuh kecil tumbang | creature death short |
| `sfx-mati-besar` | Musuh besar tumbang | monster death growl |
| `sfx-mati-bos` | Elite atau bos tumbang | boss death roar explosion |

### Pemain (5)

| File | Bunyi | Cari |
|---|---|---|
| `sfx-luka-ringan` | Terluka sedikit | hurt grunt |
| `sfx-luka-berat` | Terluka parah | pain groan heavy |
| `sfx-pemain-mati` | Pemain tumbang | player death |
| `sfx-menghindar` | Dodge | dash whoosh |
| `sfx-energi-habis` | Skill gagal, energi kurang | magic fizzle fail |

### Skill (12)

| File | Bunyi | Cari |
|---|---|---|
| `sfx-skill-putar` | Tebasan berputar | sword spin whirlwind |
| `sfx-skill-buff` | Teriakan dan penguat | war cry power up |
| `sfx-skill-api` | Bola api, ledakan api | fireball explosion |
| `sfx-skill-es` | Ledakan es, membeku | ice shatter freeze |
| `sfx-skill-petir` | Sambaran petir | lightning strike |
| `sfx-skill-tanah` | Retakan bumi, pilar batu | earth crack rumble |
| `sfx-skill-panah-kuat` | Tembakan panah besar | magic arrow power shot |
| `sfx-skill-hujan-panah` | Hujan panah | arrow rain volley |
| `sfx-skill-belati` | Belati melayang | throwing knives |
| `sfx-skill-racun` | Kabut racun | poison gas hiss |
| `sfx-skill-terjang` | Terjang, teleportasi | teleport dash |
| `sfx-skill-jebakan` | Jebakan aktif | trap spring snap |

### Ultimate (4)

| File | Bunyi | Cari |
|---|---|---|
| `sfx-ult-badai-pedang` | Warrior: Badai Pedang | blade storm whirlwind epic |
| `sfx-ult-hujan-bintang` | Archer: Hujan Bintang | starfall magic rain epic |
| `sfx-ult-hujan-meteor` | Mage: Hujan Meteor | meteor impact epic |
| `sfx-ult-seribu-bayangan` | Assassin: Tarian Seribu Bayangan | shadow slash flurry |

### Mekanik kelas (4)

| File | Bunyi | Cari |
|---|---|---|
| `sfx-kelas-mengamuk` | Warrior: Mengamuk aktif | rage roar power up |
| `sfx-kelas-panas` | Mage: Kepanasan | overheat steam hiss |
| `sfx-kelas-bidik` | Archer: Bidik siap | bow draw ready ping |
| `sfx-kelas-kombo` | Assassin: Kombo penuh | combo full chime |

### Item (5)

| File | Bunyi | Cari |
|---|---|---|
| `sfx-item-koin` | Ambil koin | coin pickup |
| `sfx-item-exp` | Ambil permata EXP | gem pickup sparkle |
| `sfx-item-gear` | Ambil gear biasa | item pickup equipment |
| `sfx-item-langka` | Ambil gear langka | rare loot legendary |
| `sfx-item-ramuan` | Minum ramuan | potion drink gulp |

### Dunia (4)

| File | Bunyi | Cari |
|---|---|---|
| `sfx-portal-muncul` | Portal terbuka | portal open magic |
| `sfx-portal-masuk` | Masuk portal | portal enter whoosh |
| `sfx-peti-buka` | Peti terbuka | treasure chest open |
| `sfx-bos-muncul` | Bos datang | boss appear horn roar |

### Menu (8)

| File | Bunyi | Cari |
|---|---|---|
| `sfx-menu-klik` | Tekan tombol | ui click wood |
| `sfx-menu-buka` | Buka panel | ui open parchment |
| `sfx-menu-tutup` | Tutup panel | ui close book |
| `sfx-menu-gagal` | Aksi ditolak | ui error dull |
| `sfx-menu-beli` | Beli barang | shop purchase coins |
| `sfx-tempa-berhasil` | Tempa berhasil | anvil success chime |
| `sfx-tempa-gagal` | Tempa gagal | anvil fail clank |
| `sfx-quest-selesai` | Quest selesai | quest complete fanfare |
