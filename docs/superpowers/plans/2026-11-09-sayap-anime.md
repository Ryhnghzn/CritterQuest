# Sayap Anime di Game — Rencana Implementasi (spesifikasi §39)

> Ini **Bagian B** dari `docs/superpowers/plans/2026-11-09-anime-lengkap.md`. Kerjakan setelah
> Bagian A di file itu (pekerjaan anime sudah di-commit, pose gaya D sudah dibuang).

> **Untuk agen pelaksana:** baca seluruh file ini dulu. Kerjakan tugas berurutan, centang yang selesai.
> Aturan proyek ada di `CLAUDE.md` (bahasa Indonesia untuk komunikasi, angka di `app/src/data/`,
> `run/` & `meta/` murni + tes Vitest, commit **tanpa** baris `Co-Authored-By`, jangan push).
> Pemilik menguji sendiri di browser: kamu cukup `npm test`, `npm run build`, lalu jalankan
> `npx vite --port 5180 --host` (folder `app/`) dan beri alamatnya. **Jangan** uji pakai browser otomatis.
> Setelah selesai, berhenti dan minta pemilik mengecek sebelum commit.

## Tujuan

Hero bergaya anime (spesifikasi §39) menampilkan **satu sayap** yang dipilih otomatis dari gear yang
dipakai (keputusan pemilik: "penanda gear", murni tampilan, tidak mengubah save atau keseimbangan).
Kesembilan desain sayap sudah dibuat di `app/src/art/anime/wings.js` dan bisa dilihat di
`app/anime.html` (tombol **Galeri sayap**). Yang belum ada: **aturan memilih sayap** di game, dan
kalung/cincin belum dikirim ke gambar karakter.

## Keadaan kode saat rencana ini ditulis (2026-11-09)

Commit terakhir: `af0b566` (arah hadap §38 bagian 1). **Banyak pekerjaan belum di-commit**, semuanya
dasar yang dipakai rencana ini:

| Bagian | File (belum di-commit) |
|---|---|
| Lapisan pixel karakter & monster (§39 langkah 1) | `app/src/render3d/pixelate.js` + tes, `app/src/data/look.js` (`pixel`, `anime`), `render3d/actors.js`, `render3d/town.js` |
| Hero anime (4 job, 3 arah, lari per job, elemen, equipment, sayap) | `app/src/art/anime/*` (kit, head, common, warrior, archer, mage, assassin, elemfx, gearfx, items, wings, index, anime.test.js), `art/hero/index.js` (`pose.anime`), `art/hero/rig.js` (`GAIT`, `pose.gait`), `art/aura.js` (`o.anime` melewati sayap lama) |
| Pose depan/belakang gaya D (§38 bagian 2) — **akan dibuang**, diganti anime | `art/hero/views.js`, `art/hero/warriorview.js`, bagian `VIEW` di `art/hero/index.js` + tesnya di `art/hero/hero.test.js` |
| Halaman contoh | `app/anime.html` + `app/anime/`, `app/item.html` + `app/item/` |
| Dokumen | spesifikasi §38–§39, `plans/2026-11-09-arah-hadap.md` |

**Perhatian — file yang diubah sesi/orang lain, jangan disentuh & jangan ikut di-commit:**
`app/index.html`, `app/src/main.js`, `app/src/i18n/en-game.js`, `docs/PROJECT_MAP.md`,
`app/src/art/pix/*`, `app/src/data/spell3d.js`, `app/src/render3d/spell3d.js`,
`docs/superpowers/plans/2026-11-06-tampilan-matang.md`, `CLAUDE.md`, dan dua baris `spell3d` di
`render3d/actors.js` (`h.kind === 'orbit' && this.spells` dan `h.fx === 'dagger'`).
Cek ulang dengan `git status` dan `git diff` sebelum mulai; kalau ragu, tanya pemilik.

## Cara kerja sistem yang dipakai

- `app/src/render3d/actors.js` `drawHero()` (pertarungan) dan `app/src/render3d/town.js` `people_()`
  (kota) memanggil `drawDoll(g, classId, look, pose)` dengan `pose.anime = LOOK.anime` dan
  `pose.wings = 'light' | 'phoenix' | null`.
- `art/hero/index.js` `drawHero`: bila `pose.anime`, membuat tampilan anime lewat
  `animeLook(classId, look)` (`art/anime/index.js`), menyalin `pose.wings` ke `al.wings`, lalu
  `drawAnime(...)`.
- `art/anime/index.js` `drawAnime`: menggambar `drawWings(g, o.wings, view, top, t, moving)`
  — dari samping & depan **di belakang** badan, dari belakang **di atas** punggung.
- `art/anime/wings.js` `WINGS`: `light` (Malaikat), `phoenix`, `ice` (Kristal), `void` (Iblis),
  `storm` (Petir), `blood` (Kelelawar), `wind` (Angin), `blade` (Bilah), `shadow` (Bayangan).
  Ukuran & kemiringan: `WING_SIZE = 1.4`, `WING_TILT = 0.42` (sudah diminta pemilik: besar,
  mengembang ke samping, tidak mengarah ke atas).
- Data hero untuk renderer (`main.js` `avatarOf`, **jangan diubah**):
  `{ classId, look: { ...c.look, gear: dollGear(c) }, fx: gearEffects(c), level, set: setRarity(c), lite }`.
  - `fx` = efek unik **dari gear saja** (`meta/gear.js` `gearEffects`), kunci: `phoenix`, `lifesteal`,
    `thorns`, `explode`, `regen`, `goldfind`, `expfind`, `chain`, `execute`, `dodgecd`, `shield`, `frenzy`.
  - `set` = rarity terendah dari semua slot, −1 kalau ada slot kosong; set lengkap =
    `fullSet(set)` (`art/auratier.js`, artinya `set >= 4` Legendaris).
  - `look.gear` = `dollGear(c)` = `{ weapon, helm, armor, boots }` → masing-masing `{ tier, rarity }`.
    **Kalung & cincin tidak ikut** (lihat Tugas 2).
- Sekarang (sementara) pilihan sayap ditulis langsung di renderer:
  - `actors.js`: `const wings = LOOK.anime ? (game.fx?.phoenix ? 'phoenix' : opt.best >= 5 ? 'light' : null) : null;`
  - `town.js`: `pose.wings = LOOK.anime ? (avatar.fx?.phoenix ? 'phoenix' : best >= 5 ? 'light' : null) : null;`
  Keduanya diganti oleh Tugas 1–3.

## Keputusan pemilik (tanya-jawab 2026-11-09)

1. Kesembilan sayap dipakai.
2. Cara dapat: **penanda gear** (otomatis dari gear, tanpa ubah save/keseimbangan).
3. Bayangan → **Assassin yang memakai senjata Mitos** (apa pun elemennya).
4. Bilah → **set lengkap Legendaris+**.
5. Angin → **efek unik Dodge** (`dodgecd`).
6. Prioritas bila beberapa berlaku: **efek unik > set lengkap > senjata Mitos**.
7. Elemen senjata Mitos → sayap: Cahaya→Malaikat, Api→Phoenix, Es→Kristal, Petir→Petir,
   Kehampaan→Iblis, Darah→Kelelawar. Efek unik Phoenix → Phoenix.

### Keputusan tambahan (dibuat penyusun rencana supaya lengkap — sampaikan ke pemilik di laporan)

- Elemen senjata Mitos di game **ditentukan job** (`art/anime/index.js` `CLASS_LOOK[cls].mythic`):
  Warrior Api, Archer Petir, Mage Kehampaan, Assassin Darah. Save tidak menyimpan elemen per item.
  Akibatnya Malaikat (Cahaya) dan Kristal (Es) tidak pernah datang dari senjata Mitos, maka:
  - **Kristal** ← efek unik **Shield** (`shield`, kubah heksagon pelindung — cocok dengan es).
  - **Petir** juga ← efek unik **Chain** (`chain`, petir berantai).
  - **Kelelawar** ← efek unik **Lifesteal** (`lifesteal`). (Senjata Mitos Assassin = Bayangan, sesuai keputusan 3.)
  - **Malaikat** ← memakai **gear Mitos apa pun** (selain senjata Mitos, yang sudah punya sayap sendiri).
    Ini sama dengan perilaku sekarang (`best >= 5`).
- Urutan bila **beberapa efek unik** sekaligus: `phoenix`, `lifesteal`, `chain`, `shield`, `dodgecd`
  (yang pertama ada yang dipakai).

### Tabel akhir (dari atas: yang pertama cocok menang)

| # | Syarat | Sayap |
|---|---|---|
| 1 | `fx.phoenix` | `phoenix` (Phoenix) |
| 2 | `fx.lifesteal` | `blood` (Kelelawar) |
| 3 | `fx.chain` | `storm` (Petir) |
| 4 | `fx.shield` | `ice` (Kristal) |
| 5 | `fx.dodgecd` | `wind` (Angin) |
| 6 | `fullSet(set)` (semua slot ≥ Legendaris) | `blade` (Bilah) |
| 7 | senjata Mitos & job Assassin | `shadow` (Bayangan) |
| 8 | senjata Mitos & job Warrior | `phoenix` (elemen Api) |
| 9 | senjata Mitos & job Archer | `storm` (elemen Petir) |
| 10 | senjata Mitos & job Mage | `void` (Iblis, elemen Kehampaan) |
| 11 | ada gear Mitos lain (helm/zirah/sepatu/kalung/cincin) | `light` (Malaikat) |
| 12 | selain itu | tanpa sayap |

`?lama` (`LOOK.anime = false`): tidak ada sayap anime; sayap lama `art/aura.js` tetap seperti dulu.

---

## Tugas 1 — Data aturan sayap

**Buat** `app/src/data/wings.js` (data murni, tanpa import):

```js
// Which wing an anime hero shows (spec §39, owner's Q&A 2026-11-09): picked from the worn gear,
// purely visual. Rules in order — the first that matches wins (art/anime/wingpick.js).
// unique: gear unique effects (meta/gear.js gearEffects) in priority order → wing
export const WING_UNIQUE = [
  ['phoenix', 'phoenix'],
  ['lifesteal', 'blood'],
  ['chain', 'storm'],
  ['shield', 'ice'],
  ['dodgecd', 'wind'],
];
export const WING_FULL_SET = 'blade';          // every slot Legendaris or better
// a Mitos weapon: by class (the class's Mitos element: Api, Petir, Kehampaan; Assassin = Bayangan)
export const WING_MYTHIC_WEAPON = { warrior: 'phoenix', archer: 'storm', mage: 'void', assassin: 'shadow' };
export const WING_MYTHIC_ANY = 'light';         // any other Mitos piece
```

## Tugas 2 — Kalung & cincin ikut ke gambar karakter

`meta/gear.js` `dollGear` hanya mengisi `['weapon', 'helm', 'armor', 'boots']`. Efek liontin dan
kilau cincin anime (`art/anime/gearfx.js` `pendant`, `ringGlint`) membaca `gear.amulet` dan
`gear.ring`, jadi di game tidak pernah muncul.

1. Ubah daftar slot di `dollGear` menjadi `['weapon', 'helm', 'armor', 'boots', 'amulet', 'ring']`
   (komentar: "What the paper doll wears"). Gambar gaya D (`art/hero/*.js`) hanya membaca
   weapon/helm/armor/boots, jadi kunci tambahan aman.
2. **Efek samping yang disengaja:** `bestRarity(look.gear)` (`art/aura.js`) kini ikut menghitung kalung
   & cincin, sehingga aura rarity lama juga menyala untuk kalung/cincin Mitos. Itu benar menurut arti
   "memakai gear Mitos". `bestRarity` (`art/aura.js` baris ±520) mengiterasi semua nilai
   (`Object.values(gear)`), jadi tidak perlu diubah.
3. Perbarui `app/src/meta/gear.test.js` (baris ±77, `expect(dollGear(c)).toEqual({ helm: ... })`)
   dan tambah satu tes: kalung + cincin yang dipakai muncul di `dollGear`.

## Tugas 3 — Logika pemilih sayap (murni, dengan tes)

**Buat** `app/src/art/anime/wingpick.js`:

```js
// Picks the anime hero's wing from what it wears (spec §39, data/wings.js). Pure: no DOM.
// avatar: { classId, look: { gear: { slot: { rarity } } }, fx: { effect: value }, set }
import { WING_UNIQUE, WING_FULL_SET, WING_MYTHIC_WEAPON, WING_MYTHIC_ANY } from '../../data/wings.js';
import { fullSet } from '../auratier.js';
import { MYTHIC } from '../../data/items.js';

export function pickWing(avatar) {
  if (!avatar) return null;
  const fx = avatar.fx || {}, gear = avatar.look?.gear || {};
  for (const [effect, wing] of WING_UNIQUE) if (fx[effect]) return wing;
  if (fullSet(avatar.set ?? -1)) return WING_FULL_SET;
  if (gear.weapon?.rarity >= MYTHIC) return WING_MYTHIC_WEAPON[avatar.classId] || WING_MYTHIC_ANY;
  for (const piece of Object.values(gear)) if (piece?.rarity >= MYTHIC) return WING_MYTHIC_ANY;
  return null;
}
```

Catatan: `art/auratier.js` meng-import `meta/schema.js` dan `meta/gear.js`; pastikan tidak terjadi
import melingkar (wingpick → auratier → meta/gear → … tidak kembali ke `art/anime`). Kalau ada masalah,
salin `fullSet` (satu baris: `setR >= LEGENDARY`) daripada meng-import.

**Buat** `app/src/art/anime/wingpick.test.js` (Vitest) — minimal kasus berikut:

| Kasus | Harapan |
|---|---|
| tanpa gear | `null` |
| helm Mitos saja, Warrior | `'light'` |
| senjata Mitos Warrior / Archer / Mage / Assassin | `'phoenix'` / `'storm'` / `'void'` / `'shadow'` |
| senjata Mitos Assassin + `fx.lifesteal` | `'blood'` (efek unik menang) |
| `set: 4` + senjata Mitos Mage | `'blade'` (set lengkap > senjata) |
| `set: 4` + `fx.dodgecd` | `'wind'` (efek unik > set) |
| `fx.phoenix` + `fx.shield` | `'phoenix'` (urutan efek unik) |
| `fx.chain` | `'storm'`; `fx.shield` → `'ice'` |
| `set: 3` (Epik) tanpa Mitos | `null` |
| semua wing hasil `pickWing` ada di `WINGS` (`art/anime/wings.js`) | untuk tiap baris data |

## Tugas 4 — Pakai di renderer

1. `app/src/render3d/actors.js` `drawHero`: ganti baris `const wings = LOOK.anime ? (...) : null;` dengan
   `const wings = LOOK.anime ? pickWing(a) : null;` (`a = this.avatar`, bentuknya sama dengan `avatarOf`).
   Import `pickWing` dari `'../art/anime/wingpick.js'`.
   **Jangan** memakai `game.fx` (itu gabungan gear + talenta); sayap hanya dari gear (`a.fx`).
2. `app/src/render3d/town.js` `people_()`: ganti ekspresi `pose.wings = ...` dengan
   `pose.wings = LOOK.anime ? pickWing(avatar) : null;`.
3. Hindari alokasi per frame: `pickWing` tidak membuat objek baru, cukup dipanggil per frame. Kalau mau,
   simpan hasilnya di `this` dan hitung ulang hanya bila `avatar` berganti objek.
4. `art/aura.js` sudah melewati sayap lama bila `o.anime` (`lightWings`, `phoenixWings`); biarkan.

## Tugas 5 — Batas billboard

Sayap sekarang lebih besar (`WING_SIZE 1.4`). Lebar satu sayap ≈ 70 × 1.4 ≈ 98 satuan anime
≈ 24 satuan game (1 satuan anime = `HERO_SCALE × 1.1 / 2.06 × DOLL_SCALE` ≈ 0.24 satuan game).
Billboard hero `actors.js`: `HX = 58`, `HT = 100`, `HB = 14` (satuan game) — cukup. Pastikan tidak
terpotong saat Mengamuk (`heroScale`) dengan menguji manual (pemilik); kalau terpotong, naikkan `HX`
sedikit (mis. 66) — itu hanya ukuran kanvas, tidak mengubah gameplay. Billboard kota (`town.js`
`canvasOf`, `HX`/`HT`/`HB` di file itu) sama, cek juga.

## Tugas 6 — Halaman contoh (opsional tapi disarankan)

Di `app/anime.html` bagian **Equipment**, tambah tombol **"Sayap otomatis"** yang memilih sayap dengan
`pickWing({ classId, look: { gear }, fx, set })`, memakai rarity yang dipilih di halaman, `set` = rarity
terendah dari keenam slot (−1 bila ada yang kosong), dan beberapa tombol efek unik
(Phoenix, Lifesteal, Chain, Shield, Dodge) untuk mencoba prioritas. Dengan begitu pemilik bisa
mengecek aturan tanpa masuk game. Kode halaman: `app/anime/main.js` (`state.gear`, `state.wings`,
`lookOf`). Jangan membuat halaman berat (lihat `safe()` & batas fps yang ada).

## Tugas 7 — Dokumen

1. Spesifikasi `docs/superpowers/specs/2026-10-26-critter-quest-arcade-design.md` §39: tambah poin
   **Sayap** berisi tabel akhir di atas + "murni tampilan; `?lama` tanpa sayap anime".
2. `CLAUDE.md` bagian Status: tambahkan satu kalimat tentang sayap anime **hanya bila pemilik setuju
   mengubah CLAUDE.md** (file itu sedang diubah sesi lain — lihat peringatan di atas).

## Pemeriksaan sebelum lapor

- `cd app && npm test` → semua lulus (sebelum rencana ini: 712 tes).
- `npm run build` → berhasil.
- Jalankan `npx vite --port 5180 --host`, beri pemilik:
  - game: `http://localhost:5180/` (pembanding `http://localhost:5180/?lama`),
  - contoh: `http://localhost:5180/anime.html`.
- Saran uji manual untuk pemilik (pakai panel cheat `` ` `` untuk memberi gear):
  1. Warrior tanpa Mitos → tanpa sayap; helm Mitos → Malaikat.
  2. Senjata Mitos tiap job → Phoenix / Petir / Iblis / Bayangan.
  3. Set lengkap Legendaris → Bilah; tambah gear unik Dodge → Angin.
  4. Gear unik Phoenix / Lifesteal / Chain / Shield → Phoenix / Kelelawar / Petir / Kristal.
  5. Kalung & cincin kini terlihat (liontin di dada, kilau di tangan).
  6. Sayap tidak terpotong saat lari, menyerang, Mengamuk; dari samping/depan/belakang.

## Commit (setelah pemilik oke)

Satu commit untuk rencana ini saja, berisi: `data/wings.js`, `art/anime/wingpick.js` + tes,
`meta/gear.js` + tes, perubahan di `render3d/actors.js` & `render3d/town.js` **hanya hunk sayap**
(pakai `git diff` → simpan patch → buang hunk lain → `git apply --cached`), halaman contoh bila
diubah, spesifikasi. Pesan commit bahasa Indonesia, tanpa `Co-Authored-By`, mis.:
`Sayap anime §39: dipilih otomatis dari gear (efek unik > set lengkap > senjata Mitos per job > Mitos lain); kalung & cincin ikut ke gambar karakter`.

Pekerjaan anime lain yang belum di-commit (lihat tabel "Keadaan kode") **bukan** bagian commit ini
kecuali pemilik meminta; tanyakan dulu.
