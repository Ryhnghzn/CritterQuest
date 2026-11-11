# Peta Proyek (Project Map)

Dokumen pengetahuan arsitektur untuk pengembang dan AI agent. Hanya berisi fakta yang diverifikasi langsung dari kode sumber; asumsi dan hal yang belum diperiksa ditandai. Spesifikasi & rencana kerja tetap berkedudukan di `docs/superpowers/` — dokumen ini memetakan *kode*, bukan fitur.

## 1. Tumpukan teknologi & titik masuk

- **Framework game:** tidak ada (hand-rolled). **Build/dev:** Vite 7. **Bahasa:** JavaScript murni (ES modules).
- **Runtime dependency tunggal:** `three@0.170.0` (`app/package.json`).
- **Render:** Canvas 2D (lapis datar + overlay) dan Three.js (WebGL, lapis 2.5D) — keduanya aktif, bukan transisi.
- **Tes:** Vitest, lingkungan Node, file `src/**/*.test.js` di samping modulnya (46 file tes).
- **Penyimpanan:** IndexedDB (`critter-quest`), fallback in-memory (`meta/save.js`).
- **Entry:** `app/index.html` → `app/src/main.js` (bootstrap satu modul yang memegang seluruh state machine scene).

## 2. Struktur direktori & peta modul

```
app/src/
  main.js          Glue: state machine scene (menu/town/run), semua wiring DOM/UI,
                   callback NPC/toko/tempa inline, peta keyboard, panel cheat, loop utama.
  core/            Infrastruktur netral-render:
    loop.js        Fixed timestep 60Hz (STEP=1/60), render per rAF, catch-up max 5 step.
    rng.js         PRNG deterministik mulberry32; replay frame-for-frame (__seek).
    input.js       Input (joystick/mouse/keyboard).
    audio.js       Suara file + sintetis.
  data/            SELURUH angka keseimbangan & definisi (balance, enemies, dungeons,
                   world, items, forge, quests, fx, potions, talents, classes, look, settings…).
                   Tidak boleh mengimpor logika/render. Pure constants.
  run/             Simulasi runtime (Game di run.js: kelas inti; player/skills/hits/enemies/
                   dungeon/field/vfx/traits/…). Logika murni, tak sentuh DOM.
  meta/            Transformasi karakter (character, gear, shop, forge, quests, world, bounties,
                   collection, stash, talents, itemgen) + save/schema (storage & migrasi).
                   Fungsi murni → objek baru.
  render/          Render 2D (view.js: kanvas bersama + zoom adaptif; world.js: Renderer
                   dungeon/wilayah 2D; town.js; light.js; fxkit/skillfx; aim; map).
  render3d/        Render 2.5D Three.js (stage.js: Stage WebGL berbagi; dungeon/field/town 2.5D;
                   actors.js: billboard + decal + overlay; spell3d, billprops, facing, pixelate…).
  town/            Simulasi jalan di kota (town.js) + peta (townmap.js). Murni.
  ui/              DOM/HUD (screens, hud, charpanel, npc, cheat, title, slots, …).
  art/             Gambar prosedural (sprites, doll, gear, aura, fx, groundart, hero/anime/pix…).
  i18n/            Kamus dua bahasa (EN default; ID). i18n.js: tr()/t()/num().
```

Ruang kerja mengandung folder prototipe yang **tidak ikut game utama** di root `app/` (`pixel/`, `anime/`, `item/`, `pet/`, `orang/`, `arah/`, `char/`, `warrior3d/`, `kota3d/`, `ui/`, `pov*/`, `masuk/`, `compare/`) — masing-masing punya `*.html` sendiri. Ada juga salinan worktree di `.superpowers/wt-kelas-hidup/`.

## 3. Lapisan & arah dependensi

Arah dependensi tegas (diverifikasi dari import):

```
data  →  (dibaca oleh)  run/meta  dan  render/render3d
run  →  dibaca oleh render (read-only)
meta  →  dipanggil main.js untuk mengubah save
render/render3d  →  membaca Game/render state, TIDAK menulis balik
ui  →  DOM; dipanggil main.js
main.js  →  merekatkan semua di atas
```

- `data/` bebas dependensi logika/render — aturan keseimbangan dipatuhi.
- `run/` dan `meta/` murni (tanpa DOM); `run/run.js` tetap memanggil `sfx` dan `tr()/t()` (presentasi/audio) — anomali kecil yang tercatat, tidak merusak tes.
- `render/` dan `render3d/` membaca state `game`/entitas dan hanya menggambar.

Siklus hidup state (diverifikasi):
- Karakter tersimpan = `current` (main.js); selama *run*, sumber kebenaran terpecah: `Game` memegang HP/EXP/skill hidup, `current` memegang karakter simpanan.
- Sinkronisasi manual & tersebar: `tripChar()`/`runSkillIds()` (main.js:529–537), `game.takeProgress()` (run.js:156), `commitField()` (main.js:736), `syncHp()` (main.js:371), `endRun()`/`endField()`.
- Save bermigrasi lewat `meta/schema.js`: `SAVE_VERSION = 20`, tabel `MIGRATIONS`, `validateSlot()` yang lengkap, `readSlot()` = migrate + validate.

## 4. Pipeline render: Canvas 2D ↔ Three.js

Dua kanvas layar-penuh bertumpuk:

1. **Stage.init()** (`render3d/stage.js:176`) membuat WebGLRenderer; kanvasnya (`#game3d`, z-index 0) disisipkan **di bawah** kanvas 2D `#game`. Kanvas 2D adalah overlay.
2. **Satu Stage bersama** untuk ketiga scene 2.5D (Dungeon25/Field25/Town25); kamera perspektif dengan *yaw* (putar) + zoom. Full quality: EffectComposer + bloom; lite: render langsung (`stage.js:278–284`).
3. **Pemetaan koordinat:** `S = 1/22` unit-game per meter (`stage.js:12`). Jembatan:
   - `screenToWorld` — raycast ke bidang datar (aim mouse).
   - `project(x,y,h)` — titik dunia → piksel CSS (untuk overlay), `null` jika di belakang kamera.
   - `pxPerUnit` — skala angka/bar.

4. **Lantai sebagai tekstur 2D:** `Dungeon25.buildRoom` (`render3d/dungeon.js:52`) melukis lantai dengan `drawRoom()` 2D ke kanvas off-screen, lalu jadi tekstur pada bidang THREE; dinding/pilar/lampu = blok 3D nyata (`InstancedMesh`), diterangi pool point light yang ditugaskan ke lampu terdekat tiap frame (`dungeon.js:206`).
5. **Actors** (`render3d/actors.js`) — tempat kedua sistem saling melebur:
   - **Ground decal:** `Renderer` "hantu" (`decalR`, actors.js:63) memakai ulang `drawRun`/`drawFx` 2D ke kanvas off-screen → tekstur bidang lain. Objek `game` hantu dibuat `Object.create(game)` dengan `enemies/floaters/hits` dikosongkan selektif (actors.js:183–190) supaya hanya efek lantai yang dilukis.
   - **Efek udara:** subset jenis partikel (`AIR_KINDS`, actors.js:26) diangkat ke 3D sebagai points/sprite aditif; sisanya tetap di decal.
   - **Hero & monster:** dilukis `drawDoll`/sprite 2D ke kanvas, lalu jadi billboard cut-out menghadap kamera (`drawHero`:203, `drawEnemies`:263).
   - **Overlay** (`actors.js:292`): bar HP, angka damage, flash, vignette, fade dilukis terakhir di kanvas 2D, berjangkar via `stage.project()`.

Urutan lapis (bawah → atas): dunia WebGL (tekstur lantai + dinding + billboard + partikel terangkat) → tekstur decal (efek lantai 2D dipanggang ke dunia) → kanvas 2D overlay (angka/bar/flash).

**Mode datar** masih kelas satu: `?2d` atau Settings → "2D" menyetel `FLAT` (main.js:90–91, 197–198), mengarah ke `render/world.js` dan `render/town.js` tanpa Three.js.

## 5. Konvensi & batasan (aturan keras proyek)

- Semua angka keseimbangan di `app/src/data/`, bukan di logika.
- `run/` dan `meta/` = logika murni tanpa DOM, wajib ada tes Vitest.
- Jangan ubah struktur save tanpa menaikkan `version` + menambah langkah `migrate()` (dan memperluas `validateSlot`).
- Teks baru bilingual: bungkus `tr()`/`t()`, tambah ke kamus `src/i18n/`.
- RNG: simulasi memakai `core/rng.js` (deterministik, replay); render memakai `Math.random` (agar tidak memengaruhi spawn/keacakan sim).
- Commit tanpa baris `Co-Authored-By`; jangan push tanpa diminta.
- Komunikasi proyek: Bahasa Indonesia.
- Hot loop (`run/run.js:step`) tanpa alokasi; entitas dipakai ulang + swap-remove.
- Loop: fixed-timestep; render terpisah dari sim (jangan kopel).
- Bahasa Inggris default; tombol EN·ID memicu reload (`main.js:switchLang`).

## 6. Utang teknis & risiko arsitektur

1. **`main.js` adalah god module** (1291 baris, tanpa tes): state machine, semua callback NPC/toko, peta keyboard, cheat, loop. Risiko tertinggi karena nyaris semua fitur menyentuhnya; orkestrasi save async (`await saveCurrent()` berselang dengan `enterTown`/`explore`/`loadWorld`) rawan bug state.
2. **Render ganda = utang perawatan permanen**, bukan scaffold. Setiap efek visual harus diterapkan dua kali, dan jalur 2.5D *menjangkau* render 2D lewat dua mekanisme rapuh:
   - `decalR = Object.create(Renderer.prototype)` dengan daftar field pilihan tangan (actors.js:63–66) — jika konstruktor `Renderer` bertambah state di kemudian hari, `decalR` diam-diam ketinggalan.
   - objek `game` hantu + `Object.assign(Object.create(game.vfx), …)` (actors.js:183–190) — bergantung nama properti persis; `AIR_KINDS` (actors.js:26) adalah daftar manual yang wajib sinkron dengan jenis partikel vfx.
   → Gejala paling umum: "efek muncul di 2D tapi hilang di 3D" (atau sebaliknya).
3. **Injeksi shader via `onBeforeCompile`** (string replace chunk internal three.js, `stage.js:28–38, 55–77, 94–98`). Upgrade minor three.js bisa memecah GLSL suntikan secara diam-diam.
4. **State karakter hidup ganda** (`current` vs `Game`) dengan sinkronisasi manual tersebar (lihat §3). Jalur sinkron yang terlewat = stat diam-diam kembali ke nilai simpanan. Slot skill adalah sisi tajam (skill yang diganti mid-run hanya ada di `game.skillDefs`).
5. **Kebocoran flag tampilan** (`data/look.js` MATANG vs LAMA via `?lama`): saklar data dengan konsekuensi yang bercabang inline `if (LOOK.anime/pixel/spells/shadows/mood)` di ±8 modul. Menghapus fallback `?lama` kelak adalah pembersihan luas, bukan hapus satu file.
6. **Sprawl prototipe & duplikasi:** banyak folder `app/<nama>/` tak terkirim + salinan worktree `.superpowers/wt-kelas-hidup/` — tidak ikut `index.html`, tapi berada di root build Vite, dan salinan menggandakan bobot repo.
7. **`render/` & `render3d/` minim tes** (hanya facing/pixelate/texkit/roomgrid/fieldprops/townkit/flora). Lapisan visual — tempat risiko paritas render ganda tinggal — diverifikasi manual.

## 7. Cara mengubah proyek ini dengan aman

Resep berurutan (setiap langkah memetakan ke file konkret):

1. **Angka dulu.** Tunable apa pun ke `data/` (mis. multiplier stat baru → `data/balance.js` atau `data/fx.js`), bukan inline di logika/render.
2. **Bentuk save:** field baru yang persisten JANGAN ditambal. Naikkan `SAVE_VERSION` (`meta/schema.js:21`), tambah entri `MIGRATIONS` (`schema.js:25`), perluas `validateSlot` (`schema.js:175`), tambah tes migrasi di `meta/schema.test.js`. Melewatkan ini = korupsi save diam-diam; lapisan schema adalah jaring pengaman yang kuat — pakai.
3. **Logika ke `run/` atau `meta/`, dengan tes.** Perilaku/tempur → perluas pipeline `Game.step` (`run/run.js:250`) atau tambah modul saudara (seperti `run/field.js`). Transformasi karakter/inventori → `meta/`, kembalikan objek baru. Ikuti konvensi hot loop (objek dipakai ulang, swap-remove) jika berjalan per-frame.
4. **Cerminkan di KEDUA renderer.** 2D: `render/world.js` `drawRun`/`drawFx`. 2.5D: tentukan *udara vs lantai* — visual berdiri biasanya otomatis lewat decal (tanpa perubahan); efek naik/bercahaya masuk `actors.js` `fx3d` dan harus ditambahkan ke `AIR_KINDS` atau peta `PROJ/BLAST` jika baru. Lalu uji `?2d` vs 2.5D berdampingan.
5. **i18n.** Bungkus `tr()`/`t()`, tambah ke `app/src/i18n/en-*.js`.
6. **Wiring di `main.js`** pakai pola yang sudah ada (`serve()`/`changeGear()` untuk aksi toko/inventori, callback `openNpc`, fungsi render-glue kecil) — jangan menumbuhkan daftar callback inline.
7. **Verifikasi:** `npm test` (logika/schema), lalu `npm run dev` + panel cheat (` atau CHEAT), `?2d`, `?lama` untuk menguji kedua tampilan + fallback.
8. **Kebiasaan terpenting** (akibat §6): sebelum & sesudah menambah apa pun yang visual, cek terhadap KEDUA jalur 2D/2.5D **dan** `?lama` — regresi biasanya "efek hilang di satu tampilan", bukan crash.

## 8. Asumsi & belum diperiksa

- Asumsi: konvensi komunikasi Bahasa Indonesia (dari CLAUDE.md) diterapkan ke dokumen ini.
- **Belum diverifikasi penuh** (belum dibaca baris-per-baris saat analisis, saat ini hanya dari nama/import/kepala): `render3d/field.js`, `render3d/town.js`, `render3d/spell3d.js`, `render3d/billprops.js`, `render3d/pixelate.js`, `render3d/texkit.js`, `render3d/kit3d.js`, `render3d/townbuild.js`/`townkit.js`, `render/town.js`, `render/light.js`, `render/field.js`/`dungeonroom.js`, `run/dungeon.js` (badan penuh), `run/skills.js`/`enemies.js`/`traits.js`/`hits.js`/`player.js`, `ui/*` (mayoritas), `art/*` (mayoritas).
- Reference `file:baris` pada §4–§7 diverifikasi; referensi lain dari struktur import.