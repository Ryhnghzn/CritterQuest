# Karakter Anime & Pixel — Rencana Implementasi Lengkap (spesifikasi §38–§39)

> **Untuk agen pelaksana:** baca seluruh file ini dulu. Kerjakan **per bagian, berurutan (A → E)**.
> Di akhir **setiap bagian**: `cd app && npm test`, `npm run build`, jalankan
> `npx vite --port 5180 --host` (dari folder `app/`), beri pemilik alamatnya
> (`http://localhost:5180/`, pembanding `?lama`), lalu **berhenti** dan tunggu pemilik mengecek.
> Commit hanya setelah pemilik bilang oke. Pemilik menguji sendiri: **jangan** uji pakai browser
> otomatis (Playwright dsb.).
>
> Aturan proyek (`CLAUDE.md`): komunikasi bahasa Indonesia; semua angka di `app/src/data/`;
> `run/` & `meta/` murni + tes Vitest; teks baru dibungkus `tr()`/`t()` + kamus EN di `src/i18n/`;
> jangan ubah **struktur** save tanpa menaikkan `version` + langkah `migrate()`; commit **tanpa**
> baris `Co-Authored-By`; jangan push. Hot loop tanpa alokasi baru per frame.

## Latar belakang (apa yang sudah ada)

Pemilik memilih karakter **gaya anime fantasi** yang ditampilkan sebagai **pixel art** (gaya HD-2D:
karakter & monster pixel di dunia 3D halus; efek skill tetap halus). Semua sudah **ditulis tetapi
belum di-commit** (commit terakhir `af0b566`):

| Bagian | Di mana | Status |
|---|---|---|
| Arah hadap ikut layar + berbalik seperti kertas (§38 bagian 1) | `render3d/facing.js` | ✅ sudah di-commit |
| Pose depan/belakang **gaya D** (§38 bagian 2) | `art/hero/views.js`, `art/hero/warriorview.js`, `VIEW` di `art/hero/index.js`, tes di `art/hero/hero.test.js` | ❌ **dibuang** (Bagian A) |
| Pilihan pose depan/samping/belakang (`viewTo`, `viewNow`) | `render3d/facing.js` + tes, `data/look.js` `facing.views/viewMin/viewBand` | ✅ dipakai anime |
| Lapisan pixel hero, warga kota, monster | `render3d/pixelate.js` + tes, `data/look.js` `pixel`, `render3d/actors.js`, `render3d/town.js` | ✅ jalan |
| Hero anime 4 job (samping di kerangka `rig.js`, depan, belakang), lari per job, elemen senjata & efeknya, bentuk senjata/zirah per rarity, efek helm/zirah/sepatu/kalung/cincin, 9 sayap | `art/anime/*` (kit, head, common, warrior, archer, mage, assassin, elemfx, gearfx, items, wings, index, anime.test.js), `art/hero/index.js` (`pose.anime`), `art/hero/rig.js` (`GAIT`, `pose.gait`), `art/aura.js` (`o.anime`), `data/look.js` `anime` | ✅ jalan |
| Ikon item anime | `art/anime/items.js` | ✅ gambar jadi, ❌ belum dipakai UI (Bagian C) |
| Halaman contoh | `app/anime.html` + `app/anime/main.js` (karakter), `app/item.html` + `app/item/main.js` (ikon) | ✅ |
| Dokumen | spesifikasi §38, §39; `plans/2026-11-09-arah-hadap.md`; `plans/2026-11-09-sayap-anime.md` | ✅ |

Cara kerjanya singkat:
- Renderer (`render3d/actors.js` hero bertarung, `render3d/town.js` hero di kota) memanggil
  `drawDoll(g, classId, look, pose)` dengan `pose.anime = LOOK.anime`, `pose.view` (dari `viewNow`),
  `pose.wings`. `art/hero/index.js` `drawHero` → `drawAnime(g, classId, animeLook(classId, look), pose)`.
- `animeLook` (`art/anime/index.js`) memetakan save → anime: rambut `STYLE_OF`, warna `COLOUR_OF`,
  elemen dari rarity senjata (`items.js` `itemElement`), rarity per slot ke `gear`.
- Efek elemen senjata dikumpulkan (`elemfx.js` `setFxSink`) dan digambar **setelah** filter pixel
  supaya halus.
- `LOOK` (`data/look.js`) punya dua set: Matang (bawaan) dan `?lama` (`pixel: null`, `anime: false`,
  `facing.views: false`) untuk pembanding.

### File yang diubah sesi/orang lain — jangan disentuh, jangan ikut di-commit

`app/index.html`, `app/src/main.js`, `app/src/i18n/en-game.js`, `docs/PROJECT_MAP.md`,
`app/src/art/pix/*`, `app/src/data/spell3d.js`, `app/src/render3d/spell3d.js`,
`docs/superpowers/plans/2026-11-06-tampilan-matang.md`, `CLAUDE.md`, `.claude/`, `.superpowers/`,
`app/orang/`, `app/pixel.html`, `app/pixel/`, `docs/2026-10-30-prompt-karakter.md`, dan dua baris
`spell3d` di `render3d/actors.js` (`if (h.kind === 'orbit' && this.spells) continue;` dan
`if (this.spells && h.fx === 'dagger') continue;`). Sebelum mulai: `git status` + `git diff` untuk
memastikan; kalau keadaannya beda dari daftar ini, tanya pemilik.

Catatan Bagian D menyentuh `i18n` — pakai `app/src/i18n/data-en.js` (bukan `en-game.js`).

---

## Bagian A — Rapikan & commit pekerjaan yang ada

### A1. Buang pose depan/belakang gaya D

1. Hapus `app/src/art/hero/views.js` dan `app/src/art/hero/warriorview.js` (belum pernah di-commit).
2. `app/src/art/hero/index.js`: hapus `import { drawWarriorView } from './warriorview.js';`,
   konstanta `VIEW`, `export const hasView`, dan blok `const view = (pose.view === 'front' || ...) && VIEW[classId]; if (view) { ... }`.
   **Biarkan** blok `if (pose.anime && !isNpc) { ... }` dan import `drawAnime`, `animeLook`, `Z`.
3. `app/src/art/hero/hero.test.js`: hapus `describe('pose depan & belakang (spesifikasi §38)', ...)`
   dan `hasView` dari import.
4. `docs/superpowers/plans/2026-11-09-arah-hadap.md` Bagian 2–4: tandai "diganti gaya anime
   (§39)" — centang yang selesai lewat anime: pilihan pose (`viewTo`/`viewNow`), `drawHero` menerima
   `pose.view`, hero bertarung & kota memakai view; Bagian 3–4 (kelas lain, NPC) → "lihat
   plans/2026-11-09-anime-lengkap.md".
5. `npm test` & `npm run build` harus lulus.

### A2. Commit (setelah pemilik oke)

Satu commit, isi (lihat `git status`):
- Baru: `app/src/art/anime/` (semua), `app/src/render3d/pixelate.js`, `app/src/render3d/pixelate.test.js`,
  `app/anime.html`, `app/anime/`, `app/item.html`, `app/item/`,
  `docs/superpowers/plans/2026-11-09-sayap-anime.md`, `docs/superpowers/plans/2026-11-09-anime-lengkap.md`.
- Diubah: `app/src/art/aura.js`, `app/src/art/hero/index.js`, `app/src/art/hero/hero.test.js`,
  `app/src/art/hero/rig.js`, `app/src/data/look.js`, `app/src/render3d/facing.js`,
  `app/src/render3d/facing.test.js`, `app/src/render3d/town.js`,
  `docs/superpowers/plans/2026-11-09-arah-hadap.md`,
  `docs/superpowers/specs/2026-10-26-critter-quest-arcade-design.md` (cek `git diff` file ini: hanya
  §38–§39 milik pekerjaan ini; kalau ada perubahan lain, tanya pemilik).
- `app/src/render3d/actors.js`: **hanya hunk pekerjaan ini** (pixel, anime, sayap, fx sink, gait).
  Cara: `git diff app/src/render3d/actors.js > /tmp/a.patch`, buang hunk berisi `spell3d` /
  `h.kind === 'orbit' && this.spells` / `h.fx === 'dagger'`, lalu `git apply --cached --recount`.

Pesan commit (contoh):
`Karakter anime pixel §39: hero 4 job gaya anime fantasi (rig yang sama, depan/belakang, lari per job, elemen & efek senjata, bentuk per rarity, efek equipment, 9 sayap), lapisan pixel hero/warga/monster, ikon item anime (belum di UI), halaman anime.html & item.html; pose depan/belakang gaya D dibuang`

---

## Bagian B — Sayap dari gear

Kerjakan file **`docs/superpowers/plans/2026-11-09-sayap-anime.md`** seluruhnya (Tugas 1–7). Bagian
"Keadaan kode" di file itu ditulis sebelum Bagian A; setelah A, pekerjaan anime sudah di-commit —
abaikan tabel "belum di-commit" di sana. Isi penting file itu: aturan pemilihan sayap
(`data/wings.js`, `art/anime/wingpick.js` + tes), **kalung & cincin ikut `dollGear`**, renderer pakai
`pickWing(avatar)`, batas billboard.

---

## Bagian C — Ikon item anime di UI (pixel 40 px)

Keputusan pemilik: ikon item **gaya anime, pixel 40 px** (lihat `app/item.html`).

### C1. Pisahkan filter pixel dari three.js

`render3d/pixelate.js` meng-import `three`; UI tidak boleh ikut bergantung pada itu.
1. Buat `app/src/art/pixeldata.js` berisi `pixelData(d, w, h, P)` (pindahkan fungsi + `BAYER` +
   `solidBuf` dari `render3d/pixelate.js`, tanpa import apa pun; `P` wajib diberikan).
2. `render3d/pixelate.js`: `import { pixelData } from '../art/pixeldata.js'` dan
   `export { pixelData }` (tes lama `pixelate.test.js` tetap jalan). Default `P = LOOK.pixel` tetap di
   `pixelateCanvas`/`pixelCopy`.

### C2. Satu fungsi ikon untuk semua tempat

Di `app/src/art/gear.js` tambah:

```js
// Item icon for the UI and the ground (spec §39): the anime icon as 40-px pixel art when the anime
// look is on, the style-D icon otherwise (?lama). Centred at the origin inside size × size.
import { LOOK } from '../data/look.js';
import { drawAnimeItem } from './anime/items.js';
import { CLASS_LOOK } from './anime/index.js';
import { pixelData } from './pixeldata.js';
const ICON_PX = 40; // pixel-art icon size (owner's choice, app/item.html)
let small = null;
export function drawItemIcon(g, item, size, t = 0) {
  if (!LOOK.anime) { drawGearIcon(g, item, size, t); return; }
  const element = CLASS_LOOK[item.classId]?.mythic || 'fire';
  if (!LOOK.pixel || typeof document === 'undefined') { drawAnimeItem(g, item, size, t, element); return; }
  small ||= document.createElement('canvas');
  small.width = small.height = ICON_PX;
  const sg = small.getContext('2d', { willReadFrequently: true });
  sg.setTransform(1, 0, 0, 1, ICON_PX / 2, ICON_PX / 2);
  drawAnimeItem(sg, item, ICON_PX, t, element);
  const img = sg.getImageData(0, 0, ICON_PX, ICON_PX);
  pixelData(img.data, ICON_PX, ICON_PX, LOOK.pixel);
  sg.putImageData(img, 0, 0);
  const smooth = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(small, -size / 2, -size / 2, size, size);
  g.imageSmoothingEnabled = smooth;
}
```

Catatan:
- Cek import melingkar: `art/anime/index.js` → `art/hero/rig.js` dan `art/anime/*`; tidak ada yang
  meng-import `art/gear.js`, jadi aman. Kalau ternyata melingkar, pindahkan `CLASS_LOOK` ke
  `data/` (mis. `data/anime.js`) dan import dari sana di kedua tempat.
- `small` dipakai bergantian; `drawItemIcon` sinkron, jadi aman.

Lalu ganti pemakaian:
1. `art/gear.js` `paintIcon`: `drawGearIcon(g, c._item, c.width, t)` → `drawItemIcon(...)`. Ini
   mencakup semua `gearCanvas` (tas `ui/gear.js`, tempa `ui/forge.js`, pasar `ui/market.js`, jurnal
   `ui/journal.js`, koleksi `ui/collection.js`, NPC `ui/npc.js`, hasil `ui/results.js`, kartu hadiah
   `ui/reveal.js`).
2. `ui/reveal.js` ±baris 151: `drawGearIcon(g, item, 34, t)` → `drawItemIcon(g, item, 34, t)`.
3. `render/world.js` ±baris 538 (item jatuh di tanah, juga dipakai decal tanah 3D):
   `drawGearIcon(g, item, 15, t)` → `drawItemIcon(g, item, 15, t)`. Lingkaran latar gelap di
   belakangnya biarkan.
4. Animasi: `gearCanvas` menganimasikan ikon mulai `ICON_FX.animFrom` (`data/itemfx.js`, sekarang 4 =
   Legendaris). Ikon anime punya efek sejak Langka (2). Biarkan 4 (ikon Langka/Epik tetap tergambar
   dengan efek diam); jangan menurunkannya tanpa izin pemilik (beban CPU di HP).
5. Tes: `app/src/art/gear.test.js` (buat bila belum ada): `drawItemIcon` dengan context tiruan
   (lihat `fakeCtx` di `art/anime/anime.test.js`) untuk semua slot × rarity, di Node (`document`
   tidak ada → jalur anime halus). Tes `pixeldata` di `render3d/pixelate.test.js` tetap lulus.

Uji manual pemilik: buka tas, tempa, pasar, kartu hadiah; ambil item di tanah; bandingkan `?lama`.

---

## Bagian D — Potret anime & Tukang Cukur 6 gaya rambut

### D1. Potret

`art/doll.js` `portrait(classId, look, height)` dipakai di `ui/slots.js`, `ui/npc.js` (Tukang Cukur
pratinjau & potret NPC), `ui/charpanel.js`, `ui/create.js`, `ui/title.js`. Bingkainya
(`s = c.height / 52`, lebar 0.8 × tinggi) dibuat untuk tinggi gaya D; rambut runcing, sayap, dan
senjata besar anime akan terpotong.

Ubah `portrait` (hanya bila `LOOK.anime && classId`; NPC dan `?lama` tetap seperti sekarang):
1. Lebar = tinggi (bukan 0.8 ×), skala `s = c.height / 70` dan kaki di `c.height - 4 * s`
   (sesuaikan sampai rambut tertinggi dan pedang Mitos tidak terpotong; uji dengan rambut Jabrik +
   senjata Mitos + sayap).
2. Gambar dengan `drawDoll(g, classId, look, { t: 1, anime: true, view: 'front' })`.
   **Pose depan** untuk potret (wajah terlihat). Sayap: `wings: pickWing({ classId, look, fx: {}, set: -1 })`
   bila Bagian B sudah selesai, kalau tidak, tanpa sayap.
3. Pixel: gambar dulu di kanvas kecil (tinggi = `Math.round(height / 2)` px), olah dengan `pixelData`
   (`LOOK.pixel`), lalu `drawImage` ke kanvas potret dengan `imageSmoothingEnabled = false` (tiap
   piksel art = 2 px CSS). `portrait` tetap mengembalikan satu `<canvas>` dengan ukuran CSS yang sama
   seperti sebelumnya (kecuali lebar), supaya layout UI tidak berubah — cek tiap layar di atas tidak
   rusak karena kanvas lebih lebar; kalau rusak, kembalikan lebar 0.8 × dan perkecil skala.

### D2. Tukang Cukur & pembuatan karakter: gaya rambut ke-6

Anime punya 6 gaya (`art/anime/head.js` `HAIR_STYLES`): `slick, spiky, long, part, tail, swept`.
Save menyimpan `look.hair` 0–4 (`data/balance.js` `HAIR_STYLES = 5`).

1. `data/balance.js`: `HAIR_STYLES = 6`. Struktur save **tidak** berubah (masih satu bilangan);
   `meta/schema.js` memvalidasi `0..HAIR_STYLES-1`, jadi save lama tetap sah dan save baru boleh 5.
   **Tidak** perlu menaikkan versi save. Jalankan tes `meta/` — perbarui tes yang menganggap 5 gaya.
2. `art/doll.js` `HAIR_NAMES`: tambah `'Poni Samping'`. `i18n/data-en.js` `HAIR_EN`: tambah
   `'Poni Samping': 'Side Swept'`.
3. `art/anime/index.js` `STYLE_OF`: tambah `'swept'` di indeks 5.
4. Gaya D (`?lama`): `art/hero/common.js` `HAIR` hanya 5 bentuk; indeks 5 jatuh ke bentuk 0 lewat
   `HAIR[look.hair] || HAIR[0]` (aman). **Tetapi** `art/doll.js` baris ±218 memanggil
   `HAIR_FRONT[look.hair](g, ...)` tanpa pengaman → error untuk indeks 5. Ganti menjadi
   `(HAIR_FRONT[look.hair] || HAIR_FRONT[0])(g, ...)`; baris ±182 (`HAIR_BACK[look.hair]?.(...)`) sudah
   aman. Tidak perlu menggambar bentuk gaya D baru. Tambah tes: `drawDoll` gaya D dengan `hair: 5`
   tidak error.
5. `ui/npc.js` (Tukang Cukur, ±baris 343) dan `ui/create.js` (±baris 24) membuat tombol dari
   `HAIR_NAMES` → otomatis 6 tombol. Cek tata letaknya muat di HP (lebar 375 px).
6. Tes: `meta/shop.js` (ganti gaya rambut) menerima `hair: 5`; `meta/schema.js` menerima save
   dengan `hair: 5`; `animeLook('warrior', { hair: 5, hairColor: 0 }).style === 'swept'`.

---

## Bagian E — Ringan di HP

Pemilik memakai iPhone (Safari iOS). Gambar anime lebih berat dari gaya D.

### E1. Penghitung FPS

Tambah overlay FPS (rata-rata per detik + ms per frame) yang dinyalakan dari panel cheat
(tombol CHEAT / `` ` ``, `app/src/ui/cheat.js`) **dan** lewat `?fps` di URL. Teks
pendek di pojok kiri atas, tanpa alokasi per frame (perbarui teks sekali per detik). Teks UI baru →
`tr()` + kamus EN bila berupa kata (angka saja tidak perlu).

### E2. Warga kota digambar lebih jarang

`render3d/town.js` `people_()` menggambar ulang tiap warga **setiap 2 frame** (dan tiap frame saat
berbalik), lalu menjalankan filter pixel. Ganti dengan jatah per detik, angka di `data/look.js`:

```js
// how often townsfolk billboards are redrawn (frames per second of their animation); pixel art
// at ~8 fps reads as a sprite animation and costs a fraction of redrawing every frame
npcFps: { idle: 8, walk: 12, far: 4, farDist: 520 },
```

- Simpan per billboard waktu gambar terakhir (`b.drawnT`); gambar ulang bila
  `t - b.drawnT >= 1 / fps` (fps = `far` bila jarak ke kamera > `farDist`, `walk` bila berjalan,
  selain itu `idle`), atau bila sedang berbalik (`b.face.cur !== b.face.face`), atau `b.fresh`.
- `?lama` (`LOOK.pixel` null): perilaku lama (tiap 2 frame) — `LAMA` di `data/look.js` tanpa `npcFps`.

### E3. Kartu di wilayah ikut pixel

`render3d/field.js` `paintCard` menggambar NPC tersembunyi, penjaga gerbang, dan titik quest **beserta
label teks** di kanvas yang sama, pada resolusi `sharp('card')` — jadi tidak pixel, tidak serasi
dengan hero/warga.
1. Untuk kartu NPC (`cd.home`) dan penjaga (`cd.guard`): gambar sosoknya di kanvas kecil terpisah
   per kartu (`cd.fig`) pada `LOOK.pixel.k` piksel per satuan game, olah dengan `pixelData`, lalu
   `drawImage` ke kanvas kartu (skala `k_card / LOOK.pixel.k`, `imageSmoothingEnabled = false`).
2. Label (`tag(...)`) dan titik quest (`drawQuestSpot`) digambar **sesudahnya** langsung di kanvas
   kartu, tetap halus dan tajam.
3. `?lama`: tetap seperti sekarang.

### E4. Ukur

Minta pemilik membandingkan FPS di kota ramai dan di pertarungan ramai, `?lama` vs bawaan, di iPhone.
Catat angkanya di spesifikasi §39. Bila masih berat, langkah berikutnya (jangan dikerjakan tanpa
izin): menyimpan frame jadi untuk warga kota (cache per gerakan), atau menurunkan `LOOK.pixel.k`.

---

## Di luar rencana ini

- **Warga kota & NPC gaya anime:** pemilik meminta contoh desain dibuat dulu (oleh Claude, halaman
  contoh terpisah) dan disetujui sebelum ada rencana implementasi. Jangan dikerjakan agen.
- Gear per **tier** (sekarang tampilan anime mengikuti rarity, bukan tier/level item).
- Kosmetik sayap di Lemari (keputusan pemilik: sekarang penanda gear saja).

## Ringkas urutan

| Bagian | Isi | Berhenti untuk cek pemilik | Commit |
|---|---|---|---|
| A | buang pose gaya D, commit semua pekerjaan anime/pixel | ✓ | 1 commit |
| B | sayap dari gear (`plans/2026-11-09-sayap-anime.md`) | ✓ | 1 commit |
| C | ikon item anime pixel 40 px di semua UI & tanah | ✓ | 1 commit |
| D | potret anime, gaya rambut ke-6 | ✓ | 1 commit |
| E | FPS meter, warga kota lebih jarang digambar, kartu wilayah pixel | ✓ | 1 commit |

Setiap commit: hanya file bagian itu; perbarui spesifikasi §39 (satu poin per bagian) dan centang
rencana ini.

## Status (2026-11-11)

- A–D dikerjakan agen lain, masuk commit `b1246ba` ("Snapshot pekerjaan terkini").
- E: E1 tidak perlu (penghitung FPS sudah ada di panel cheat). E2 (`LOOK.npcFps`, `render3d/town.js`) dan E3 (`render3d/field.js` kartu pixel) dikerjakan Claude; belum di-commit, menunggu cek pemilik. E4 (ukur di iPhone) menunggu pemilik.
- NPC anime: contoh desain dibuat Claude di `app/npc.html`.
