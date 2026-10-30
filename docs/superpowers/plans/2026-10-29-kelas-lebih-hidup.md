# Kelas Lebih Hidup — Rencana Kerja

> **Untuk agen:** kerjakan per bagian (A–E). Berhenti di akhir tiap bagian untuk cek manual oleh pemilik, commit setelah oke. Centang langkah yang selesai.

**Tujuan:** tiap kelas punya mekanik khas (Murka, Panas, Bidik, Kombo), 8 skill berubah bentuk jadi lebay, momen puncak sinematik, dan tab Skill yang mudah diatur kapan saja.

**Arsitektur:** logika mekanik khas di modul murni baru `run/traits.js`, dipanggil dari titik yang sudah ada di `run/run.js` (`damageEnemy`, `hurtPlayer`, `step`) dan `run/skills.js` (`stepAttack`, `stepSkills`). Angka di blok `trait` per kelas di `data/classes.js`. Jenis gerak skill baru ditambahkan di `run/hits.js` + `castSkill()`. Visual di `run/skillfx.js` / `render/skillfx.js` (RNG efek sendiri).

**Tech:** Vite 7, JS murni, canvas 2D, Vitest.

**Spesifikasi:** `docs/superpowers/specs/2026-10-26-critter-quest-arcade-design.md` §31.

## Aturan global
- Semua angka di `app/src/data/`, bukan di logika.
- `run/` & `meta/` murni tanpa DOM, wajib tes Vitest (`src/**/*.test.js` di samping modul).
- **Save tidak berubah** (mekanik khas hidup per ekspedisi; susunan skill tetap `char.skills`).
- Simulasi memakai `rand()` dari `core/rng.js`; efek visual **tidak boleh** memakai RNG simulasi (pakai RNG di `run/vfx.js`).
- Teks baru lewat `tr()` / `t()` + kamus EN di `src/i18n/`.
- Hot loop simulasi tanpa alokasi baru per frame (objek dipakai ulang).
- Commit tanpa baris `Co-Authored-By`. Jangan push.
- Verifikasi tiap bagian: `npm test` lulus, `npm run build` lulus, cek manual PC & HP (mode 2D dan 2.5D).

---

## Bagian A — Tab Skill baru & ganti skill kapan saja (§31.6)

**File:**
- Ubah: `src/ui/skilltab.js` (tampilan kartu slot + daftar pool, pilihan dua ketukan)
- Ubah: `src/ui/style.css` atau `src/ui/theme-dark.css` (gaya kartu slot, sorotan, lencana)
- Ubah: `src/main.js` (`openCharPanel` saat `scene === 'run'`: skill `editable: true` + `onEquip` yang memperbarui run)
- Ubah: `src/run/run.js` (metode baru `setSkills(ids)`)
- Ubah: `src/meta/character.js` (`addExp` memasang skill baru otomatis)
- Tes: `src/run/run.test.js`, `src/meta/character.test.js`

**Antarmuka:**
- `Game#setSkills(ids: (string|null)[4])`: ganti `skillDefs`; slot yang isinya berubah → `skillCd[i] = skillCdMax[i]` (jeda penuh); slot yang sama tidak diubah.
- `addExp(char, amount)` → `{ char, levelsGained, newSkills: [{ id, slot }] }`: skill yang `unlock`-nya terlewati (level lama < unlock ≤ level baru) dan belum terpasang masuk ke slot `null` pertama.

- [x] **A1. Tes `setSkills`** di `run/run.test.js`:
```js
it('setSkills: slot yang berubah mulai dengan jeda penuh, slot lain tetap', () => {
  const g = new Game();
  g.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, skills: ['spin', 'shout', null, null], level: 20 });
  g.skillCd[0] = 0.5;
  g.setSkills(['spin', 'warcry', null, null]);
  expect(g.skillDefs[1].id).toBe('warcry');
  expect(g.skillCd[1]).toBeCloseTo(g.skillCdMax[1]);
  expect(g.skillCd[0]).toBe(0.5);
});
```
- [x] **A2. Terapkan `setSkills`** di `run/run.js` (setelah `setStats`):
```js
  // Skills changed mid-trip (spec §31.6): a skill put into a slot starts on its full cooldown.
  setSkills(ids) {
    const pool = CLASSES[this.classId].skills;
    ids.forEach((id, i) => {
      if ((this.skillDefs[i]?.id ?? null) === id) return;
      this.skillDefs[i] = id ? pool.find((s) => s.id === id) : null;
      this.skillCdMax[i] = this.skillDefs[i] ? skillCooldown(this.stats, this.skillDefs[i]) : 0;
      this.skillCd[i] = this.skillCdMax[i];
    });
  }
```
- [x] **A3. Tes pasang otomatis** di `meta/character.test.js`: karakter warrior LV 4 dengan `skills: ['spin','shout',null,null]`, `addExp` cukup untuk LV 5 → `char.skills[2] === 'quake'`, `newSkills` = `[{ id: 'quake', slot: 2 }]`. Kasus kedua: semua slot penuh → tidak ada perubahan, `newSkills` kosong.
- [x] **A4. Terapkan** di `addExp`: catat `from = c.level` sebelum loop; setelah loop, untuk tiap skill kelas dengan `from < unlock <= c.level` yang belum ada di `c.skills`, isi `c.skills.indexOf(null)` bila ≥ 0. Pemanggil lain (`applyTrip`, `bounties`, `quests`, `world`) tidak perlu diubah karena memakai `char` hasilnya.
- [x] **A5. Pasang otomatis di dalam run:** di `run/run.js` loop naik level (`updateGems`), setelah `this.level++`, panggil fungsi kecil yang sama aturannya: skill dengan `unlock === this.level`, slot kosong pertama → `setSkills` + `showBanner(t('Skill baru: {name} (tombol {n})', …))`. Tes: run warrior LV 4 dengan slot kosong, beri EXP gem cukup → `skillDefs[2].id === 'quake'`.
- [x] **A6. Tab Skill baru** (`ui/skilltab.js`):
  - Baris atas `div.slots`: 4 `button.slotcard` (ikon 30 px, nama, nomor 1–4; kosong = `+`) + kartu Ultimate (5, tidak bisa dipilih). Kartu terisi punya tombol kecil × (lepas; minimal satu skill tetap).
  - Daftar pool: tiap baris `button.skill` (ikon, nama, deskripsi, energi · jeda); terpasang = lencana nomor; terkunci = `LV n`, tidak bisa diketuk.
  - State modul `picked = { slot: number|null, skill: string|null }`. Ketuk slot lalu skill (atau sebaliknya) → `opts.onEquip(slot, id)`, reset `picked`. Ketuk yang sama lagi = batal. Sorotan kelas `.picked`.
  - `data-slot` / `data-skill` dipertahankan untuk uji manual & cheat.
  - Bakat: tidak berubah; tetap `opts.talentsEditable` (hanya di kota).
- [x] **A7. `main.js`:** di run, `skill: { editable: true, talentsEditable: false, onEquip }` dengan
```js
onEquip: (slot, id) => {
  const r = equipSkill(tripChar(), slot, id, Date.now()); // level di tengah trip ikut dihitung
  if (!r.ok) return;
  current = { ...current, skills: r.char.skills };
  game.setSkills(current.skills);
  saveCurrent();
  openCharPanel();
},
```
  Di kota: `talentsEditable: true`. Ubah `skilltab.js` agar bakat memakai `opts.talentsEditable` (bukan `opts.editable`), dan catatan "Ganti skill & bakat di kota." diganti "Bakat hanya bisa diatur di kota."
- [x] **A8. Kamus EN** untuk teks baru (`Skill baru: {name} (tombol {n})`, `Bakat hanya bisa diatur di kota.`, label kartu kosong bila ada).
- [x] **A9. Verifikasi:** `npm test`, `npm run build`. Cek manual: ganti skill di kota, wilayah, dan dungeon (PC & HP), jeda penuh pada skill baru, pasang otomatis saat naik level.
- [x] **A10. Berhenti → cek pemilik → commit** `Kelas Lebih Hidup A: tab Skill kartu slot, ganti skill kapan saja, pasang otomatis`.

---

## Bagian B — Warrior: Murka & Mengamuk (§31.1–31.2)

**File:**
- Buat: `src/run/traits.js`, `src/run/traits.test.js`
- Ubah: `src/data/classes.js` (blok `trait` warrior, `moveSpd` 112, `charge.unlock` 1, `charge.resetOnKill: true`)
- Ubah: `src/run/run.js` (`reset`, `step`, `damageEnemy`, `hurtPlayer`, `applyBuffs`)
- Ubah: `src/run/skills.js` (`stepAttack` memakai jangkauan/sudut dari Murka; dash `resetOnKill`)
- Ubah: `index.html` + `src/ui/hud.js` + CSS (bar khas di bawah bar energi)

**Data** (`data/classes.js`, warrior):
```js
trait: {
  id: 'rage', max: 100, color: '#e0526a',
  perHit: 3,            // per enemy hit by a basic attack
  perHurtPct: 1.5,      // per 1% of max HP lost
  idleAfter: 3, decay: 12,
  arcR: [46, 72], arcDeg: [100, 160], lifesteal: 0.04, dmgTaken: 0.2, // scale 0 → max
  frenzy: { duration: 6, atkSpd: 0.4, wave: { r: 60, mult: 0.5, knock: 140 } },
},
```

**Antarmuka `run/traits.js`** (dipakai juga oleh bagian C):
- `initTrait(run)` → `run.trait = { v: 0, idle: 0, on: 0, lock: 0, hits: 0, focus: false }`
- `traitStep(run, dt, moving: boolean)`
- `traitBasicHit(run)` — dipanggil sekali per musuh yang kena serangan dasar
- `traitHurt(run, dmg)` — setelah damage dikurangi perisai
- `traitCast(run, skill)` → `number` (pengali damage untuk hit skill itu; 1 bila tidak ada)
- `traitMods(run)` → `{ arcR, arcDeg, lifesteal, dmgTaken, skillDmg, locked, slow, slowImmune }` (objek dipakai ulang, tidak dialokasi per frame)
- `traitLevel(run)` → `0..1` untuk HUD

- [x] **B1. Tes Murka** (`run/traits.test.js`), pakai objek run tiruan `{ classId: 'warrior', stats: { maxHp: 200 }, trait: null }`:
  - `traitBasicHit` ×10 → `v === 30`.
  - `traitHurt(run, 20)` (10% HP) → `v` bertambah 15.
  - Tidak bertarung 3 dtk lalu 1 dtk lagi → `v` turun 12; bertarung mereset `idle`.
  - `v = 50` → `traitMods` memberi `arcR 59`, `arcDeg 130`, `lifesteal 0.02`, `dmgTaken 0.9`.
  - `v` mencapai 100 → `on === 6`, `v === 0`; selama `on > 0` `traitBasicHit` tidak menambah `v`; `slowImmune === true`.
- [x] **B2. Terapkan** `run/traits.js` untuk `rage` sampai tes lulus. Mengamuk mulai: `run.showBanner(tr('MENGAMUK!'))`, `run.applyBuffs()` (atkSpd +40% lewat `applyBuffs` membaca `run.trait.on`).
- [x] **B3. Sambungkan ke run:**
  - `reset`: `initTrait(this)`.
  - `step`: `traitStep(this, dt, this.intent.move.x !== 0 || this.intent.move.y !== 0)` setelah `stepSkills`.
  - `stepAttack`: untuk `arc`, pakai `traitMods(run).arcR/arcDeg` bila kelas punya `trait`; selama Mengamuk tambahkan hit `wave` (makeArea kecil di depan, `knock`).
  - `damageEnemy`: bila hit dasar (`BASIC_FX` & `!h.skill`) → `traitBasicHit(this)`; lifesteal dari `traitMods` ditambahkan ke `fx.lifesteal`.
  - `hurtPlayer`: `dmg *= traitMods(this).dmgTaken` sebelum perisai; `traitHurt(this, dmg)` setelah; efek lambat diabaikan bila `slowImmune`.
  - `applyBuffs`: `if (this.trait?.on > 0 && CLASSES[this.classId].trait.frenzy) this.stats.atkSpd *= 1 + frenzy.atkSpd`.
- [x] **B4. Terjang pulih saat membunuh:** `castSkill` dash dengan `s.resetOnKill` → sweep diberi `resetSid = s.id`. Di `damageEnemy`, bila `e.hp <= 0 && h.resetSid` → `skillCd[skillDefs.findIndex(d => d?.id === h.resetSid)] = 0`. Tes di `run/run.test.js`: musuh HP 1 di jalur Terjang → jeda slot Terjang 0 setelah step.
- [x] **B5. Penyetelan data:** warrior `moveSpd: 112`; `charge.unlock: 1`. Pastikan tes lama yang memakai urutan unlock tetap lulus (perbarui ekspektasi bila ada).
- [x] **B6. HUD:** `<div class="trbar" id="trbar"><i id="trfill"></i><span id="trtext"></span></div>` di bawah `#enbar` (`index.html:692`). `updateHUD`: sembunyikan bila kelas tanpa `trait`; isi `scaleX(traitLevel(game))`, warna `--c` dari `trait.color`, teks `Murka {n}` / `MENGAMUK {s}s`. Kelas `.hot` saat Mengamuk (berdenyut, mati bila `prefers-reduced-motion`).
- [x] **B7. Kamus EN:** `Murka` → `Rage`, `MENGAMUK!` → `RAMPAGE!`, `Terjang` deskripsi baru ("cooldown pulih saat membunuh").
- [x] **B8. Perbarui deskripsi skill** Terjang di `data/classes.js`: `'Menerjang 220 px, 320% ke yang dilewati, kebal saat menerjang. Membunuh = siap lagi.'`
- [x] **B9. Verifikasi** (tes, build, main Warrior di dungeon & wilayah PC/HP) → **berhenti, cek pemilik, commit** `Kelas Lebih Hidup B: Warrior Murka & Mengamuk`.

---

## Bagian C — Mage Panas, Archer Bidik, Assassin Kombo (§31.3–31.5)

**Data** (`data/classes.js`):
```js
// mage
trait: { id: 'heat', max: 100, color: '#ff8a3d', perCost: 0.6, decay: 15, bonusAt: 80, skillDmg: 0.3, overheat: { duration: 2.5, slow: 0.3 } },
// archer
trait: { id: 'focus', max: 100, color: '#7be08a', rate: 60, shot: { pierce: 3, size: 2 } },
// assassin
trait: { id: 'combo', max: 5, color: '#b07cff', hitsPer: 3, idleAfter: 4, perPoint: 0.25, executeBelow: 0.3 },
```
Penyetelan: mage `nova.freeze: 1.5`.

- [x] **C1. Tes Panas:** `traitCast` Meteor (cost 55) → `v === 33`; `v = 40` → `skillDmg 0.15`; `v = 90` → `skillDmg 0.3`; `v` ≥ 100 → `lock === 2.5`, `slow === 0.3`, `locked === true`, `v === 0`; `lock` habis → `locked === false`; menyusut 15/dtk.
- [x] **C2. Tes Bidik:** diam 1 dtk (`moving=false`) & menyerang → `v === 60`; bergerak → `v === 0`; `v === 100` → `focus === true`; fungsi `traitFocusShot(run)` → `true` sekali lalu `v === 0`. Lompatan Mundur (`traitCast` skill `leap`) → `v === 100`.
- [x] **C3. Tes Kombo:** `traitBasicHit` ×9 → `v === 3`; 4 dtk tanpa serang → `v === 0`; `v = 5` → `traitCast` mengembalikan `2.25` dan `v === 0`, dan hit skill itu diberi `execute = 0.3`; `v = 2` → `1.5`, tanpa `execute`.
- [x] **C4. Terapkan** ketiganya di `run/traits.js`.
- [x] **C5. Sambungkan:**
  - `stepSkills`: lewati semua skill bila `traitMods(run).locked` (tampilkan `noEnergyT`-mirip `run.lockT` untuk HUD). Setelah `castSkill`, `const mul = traitCast(run, skill)`; set `h.mult *= mul` dan `h.execute` untuk hit baru (`before..length`).
  - `damageEnemy`: `skillDmg` dari `traitMods` ditambahkan ke bonus skill; eksekusi: `if (h.execute && !e.boss && !e.elite && e.hp < e.maxHp * h.execute) e.hp = 0`.
  - `stepAttack` Archer: bila `traitFocusShot(run)` → proyektil dasar diberi `pierce: shot.pierce`, `r × shot.size`, `crit: true` (paksa kritis di `damageEnemy`: `const crit = h.crit || rand() * 100 < s.crit`).
  - `stepPlayer`: kecepatan × `(1 - traitMods(run).slow)`.
  - Bidik hanya mengisi saat menyerang: `traitStep` menerima `attacking` (`intent.attack || intent.auto`) — perluas tanda tangan jadi `traitStep(run, dt, moving, attacking)` dan perbarui pemanggil & tes B.
- [x] **C6. HUD:** Panas (jingga, `Panas {n}` / `Kepanasan {s}s`), Bidik (hijau, `Bidik` + kelas `.ready` saat penuh), Kombo (5 belati: `#trbar` diganti 5 `<i class="pip">` bila `trait.id === 'combo'`). Tombol skill diberi kelas `.locked` saat Kepanasan.
- [x] **C7. Kamus EN:** `Panas`→`Heat`, `Kepanasan`→`Overheat`, `Bidik`→`Focus`, `Kombo`→`Combo`; deskripsi Nova Es (1,5 dtk).
- [x] **C8. Verifikasi** → **berhenti, cek pemilik, commit** `Kelas Lebih Hidup C: Panas, Bidik, Kombo`.

---

## Bagian D — 8 skill lebay (§31.7)

**Mesin gerak baru** (`run/hits.js`, murni, dites di `run/hits.test.js`):
- `delay` (umum, semua jenis hit): selama `h.delay > 0` hit tidak bergerak/mengenai, hanya menghitung mundur. Dipakai pilar berurutan, sambaran tertunda, belati melayang.
- `target` (area): posisi mengikuti `h.target` (musuh) — sambaran Badai Petir.
- `boomerang` (proj): saat `dist >= range` arah dibalik menuju `ctx.px/py`, `hitSet` dikosongkan sekali; mati saat jarak ke pemain < 20. `pull` → musuh yang kena diberi `kx/ky` searah gerak.
- `split` (proj): saat `dist >= split.at` proyektil mati dan menambah `split.count` proyektil baru (sebar `split.spread`°, `split.mult`).
- `shards` pada `explode`: setelah ledakan tambah `count` proyektil radial.
- `curve` (proj): kecepatan sudut (rad/dtk) — spiral belati.
- `orbit` (jenis baru): mengelilingi pemain `radius`, kecepatan sudut `spin`, tiap musuh paling sering sekali per `every` dtk (Map musuh→waktu), umur `duration`; saat habis menambah proyektil `throw` ke `ctx.aimX/aimY` (ctx diperluas dengan getter `aimPX/aimPY`).
- `trail` (proj): tiap `trail.every` dtk menaruh area kecil `trail` (ticks, mult) di posisinya.

Tiap fitur satu tes di `run/hits.test.js` (posisi/hitungan hit setelah step berulang dengan `dt = 1/60`).

**Data skill baru** (`data/classes.js`, id tetap):
```js
quake:    { kind: 'line', count: 5, step: 52, gap: 0.08, r: 45, mult: 1.2, freeze: 0.3, knock: 160, name: 'Retakan Bumi' },
axe:      { kind: 'proj', boomerang: true, pull: true, speed: 420, range: 360, r: 18, mult: 2, pierce: Infinity, name: 'Kapak Bumerang' },
pierce:   { kind: 'proj', delay: 0.3, speed: 560, range: 650, r: 16, mult: 6, pierce: Infinity, trail: { every: 0.1, r: 24, life: 2, ticks: 4, mult: 0.4 }, name: 'Panah Naga' },
volley:   { kind: 'fan', count: 3, spread: 24, speed: 520, range: 480, r: 5, mult: 1.2, split: { at: 160, count: 3, spread: 30 }, name: 'Panah Pecah' },
chain:    { kind: 'storm', count: 8, gap: 0.1, mult: 3.5, range: 450, jump: 200, name: 'Badai Petir' },
inferno:  { kind: 'proj', speed: 200, range: 480, r: 14, mult: 3, explode: { r: 85, shards: { count: 6, speed: 300, range: 160, r: 8, mult: 1.2 } }, trail: { every: 0.12, r: 26, life: 1.5, ticks: 3, mult: 0.2 }, name: 'Matahari Kecil' },
fan:      { kind: 'fan', count: 11, spread: 360, ring: 40, delay: 0.4, curve: 2.2, speed: 400, range: 320, r: 6, mult: 1.8, name: 'Lingkaran Belati' },
shuriken: { kind: 'orbit', radius: 70, spin: 7, every: 0.25, duration: 3, r: 22, mult: 0.8, throw: { speed: 520, range: 420, r: 16, mult: 3, pierce: Infinity }, name: 'Shuriken Raksasa' },
```
(biaya, jeda, unlock, ikon tetap; deskripsi diperbarui sesuai §31.7.)

- [x] **D1. Mesin `delay` + `target`** — tes, terapkan.
- [x] **D2. `line`** di `castSkill` (pilar `i` di `px + aim × step × (i+1)`, `delay = gap × i`) — tes jumlah & posisi pilar. Visual: retakan menjalar + pilar batu-api + musuh terlempar (`run/skillfx.js` `castFx`/`stepHitFx`, `render/skillfx.js` `drawHit`).
- [x] **D3. `boomerang` + `pull`** — tes pergi-pulang & 2 kali kena. Visual: kapak besar berputar, percikan.
- [x] **D4. `trail` + `delay` proj** (Panah Naga) — tes area jejak muncul. Visual: naga cahaya meliuk (sinus di sepanjang lintasan), jejak terbakar.
- [x] **D5. `split`** (Panah Pecah) — tes 3 → 9 proyektil. Visual: kilau kembang api saat pecah.
- [x] **D6. `storm`** di `castSkill` (pilih target seperti `chain()` yang ada, lalu area `target` + `delay = gap × i`) — tes 8 sambaran pada musuh berbeda dalam urutan waktu. Visual: awan gelap di atas pemain, kilat layar tipis per sambaran.
- [x] **D7. `explode.shards`** (Matahari Kecil) — tes 6 serpihan. Visual: bola api lambat besar, jalur terbakar.
- [x] **D8. `ring` + `curve`** pada `fan` (Lingkaran Belati) — tes posisi awal melingkar & lintasan melengkung. Visual: belati melayang berdenyut sebelum melesat.
- [x] **D9. `orbit` + `throw`** (Shuriken Raksasa) — tes jumlah kena per musuh ≤ `duration/every`, proyektil lempar muncul di akhir. Visual: shuriken besar berputar dengan bayangan gerak.
- [x] **D10. Setel damage** di cheat panel: bandingkan DPS rata-rata ke skill lama di Celah/dungeon yang sama; catat angka akhir di spesifikasi bila berubah.
- [x] **D11. Kamus EN** nama & deskripsi 8 skill; ikon tetap.
- [x] **D12. Verifikasi** (2D & 2.5D, mode efek Penuh/Ringan, FPS ≥ 50 PC, ≥ 40 HP) → **berhenti, cek pemilik, commit** `Kelas Lebih Hidup D: 8 skill lebay`.

---

## Bagian E — Momen puncak (§31.8)

Semua visual, tanpa logika simulasi baru; membaca `run.trait`.
- [x] **E1. Mengamuk:** di `render/world.js` (dan pemain 2.5D di `render3d/actors.js`) skala sosok ×1,15 selama `trait.on > 0`, mata menyala; `run.vfx.flash('#ff3040', 0.3, 0.2)` + `addShake('medium')` + `addHitStop` saat mulai (di `traits.js` lewat callback yang sudah ada di run, bukan RNG simulasi).
- [x] **E2. Panas:** tongkat Mage bercahaya jingga sebanding `v` di atas 80; saat Kepanasan asap naik dari pemain (`run/skillfx.js` `stepPlayerFx`).
- [x] **E3. Bidik penuh:** lingkaran bidik mengecil di depan Archer saat mengisi; saat tembakan: garis cahaya menembus layar searah tembakan + `addHitStop('crit')`.
- [x] **E4. Eksekusi:** layar hitam-putih 0,15 dtk (filter canvas `grayscale` di `render/world.js`) + tebasan merah membelah musuh.
- [x] **E5. Tingkat efek & gerak tenang:** Ringan = tanpa skala/asap/garis layar; `prefers-reduced-motion` = tanpa getar, kedip, dan hitam-putih.
- [x] **E6. Verifikasi** → **berhenti, cek pemilik, commit** `Kelas Lebih Hidup E: momen puncak`.

---

## Penutup
- [x] Perbarui status di `CLAUDE.md` (Kelas Lebih Hidup selesai; berikutnya brainstorming Job Lanjutan atau 9E).
- [x] Rapikan centang 9F-4b di `2026-10-27-langkah-9-grind.md` (sudah dikerjakan di `102ee65`).
