# Hack and Slash Serba Cepat — Rencana Kerja

> **Untuk agen:** kerjakan per bagian (A–C). Berhenti di akhir tiap bagian untuk cek manual oleh pemilik, commit setelah oke. Centang langkah yang selesai.

**Tujuan:** pemain bergerak & menyerang ±1,5× lebih cepat, musuh datang berkelompok lebih banyak dan lebih dekat, hadiah per lantai tetap kira-kira sama tapi lantai selesai lebih cepat.

**Arsitektur:** dua blok angka baru di `data/balance.js`: `TEMPO` (sisi pemain, dipakai di `run/player.js` & `run/skills.js` saat dipakai, jadi stat di layar karakter tidak berubah) dan `HORDE` (kedatangan musuh & hadiah, dipakai di `run/dungeon.js`, `run/field.js`, `run/run.js`). Angka yang cukup diganti langsung (jarak/jeda menghindar, lorong, jeda gelombang, portal, kawanan wilayah, isi ultimate) diubah di tempatnya dengan komentar `§33`. Kecepatan, telegraf, peluru musuh dan pola bos tidak disentuh.

**Tech:** Vite 7, JS murni, Vitest.

**Spesifikasi:** `docs/superpowers/specs/2026-10-26-critter-quest-arcade-design.md` §33.

## Aturan global
- Semua angka di `app/src/data/`, bukan di logika.
- `run/` murni tanpa DOM, wajib tes Vitest di samping modul.
- **Save tidak berubah.**
- Simulasi memakai `rand()`/`rrange()`/`rint()` dari `core/rng.js`.
- Hot loop tanpa alokasi baru per frame.
- Commit tanpa baris `Co-Authored-By`. Jangan push.
- Verifikasi tiap bagian: `npm test` lulus, `npm run build` lulus, cek manual PC & HP.

## Angka (ditambahkan di Bagian A/B, `data/balance.js`)
```js
// Hack-and-slash tempo (spec §33.1): player side only, applied where used (run/player.js, run/skills.js)
export const TEMPO = { move: 1.5, attackInterval: 0.7, projSpeed: 1.3 };
// Enemy arrival & rewards (spec §33.2–33.4)
export const HORDE = {
  count: 1.6,        // normal enemies per wave × this (bosses unchanged)
  hp: 0.8,           // HP of horde enemies (dungeon waves, region packs & escorts; not bosses, guardians)
  pack: [3, 6],      // a wave comes out of one lane in groups of this many
  packGap: 2.5,      // seconds between groups = wave.every × this
  nextAt: 0.4,       // next wave once alive ≤ this × the current wave's size
  liveCap: 45,       // dungeon: no new group while this many are alive
  eliteMul: 0.75,    // elite chance per enemy × this
  reward: 0.65,      // EXP, coin chance, gear chance, quest-item chance of normal enemies × this
  merge: 24,         // a new EXP gem joins a resting one within this many px
};
```

---

## Bagian 0 — Ukur dulu (tanpa commit)

- [x] **0.1** Tulis tes sementara `app/src/run/tempo.sim.test.js` (TIDAK di-commit) yang memainkan lantai 1–3 dungeon pertama untuk tiap kelas dan mencetak waktu per lantai, EXP, emas:
```js
import { it } from 'vitest';
import { Game, ST } from './run.js';
import { CLASSES, CLASS_BASE } from '../data/classes.js';

it('ukur tempo', () => {
  for (const classId of Object.keys(CLASSES)) {
    const g = new Game();
    g.start({ classId, stats: { ...CLASS_BASE, ...CLASSES[classId].stats, maxHp: 1e6, hp: 1e6 }, level: 10 });
    g.god = true;
    const out = [];
    let floorStart = 0, t = 0;
    while (g.floor <= 3 && t < 600 && g.state !== ST.OVER) {
      const e = g.nearestEnemy(2000);
      const aim = e ? { x: e.x, y: e.y } : null;
      const mv = e ? { x: Math.sign(e.x - g.px) * 0.5, y: Math.sign(e.y - g.py) * 0.5 } : { x: -g.px / 300, y: -g.py / 300 };
      g.intent = { move: mv, aimAt: aim, dodge: false, attack: true, auto: true };
      g.step(1 / 60); t += 1 / 60;
      if (g.floorClear) { out.push({ f: g.floor, s: +(t - floorStart).toFixed(1), exp: Math.round(g.expGained), gold: g.gold }); const f = g.floor; g.exit = null; g.nextFloor?.(); if (g.floor === f) break; floorStart = t; }
    }
    console.log(classId, JSON.stringify(out));
  }
});
```
  Sesuaikan cara pindah lantai dengan API `Game` yang ada (lihat `run/run.js` saat `exit === 'down'`). Jalankan `npx vitest run src/run/tempo.sim.test.js`, catat hasilnya di laporan Bagian C sebagai **sebelum**. Simpan file itu (tidak di-commit) untuk dipakai lagi di C.

---

## Bagian A — Tempo pemain (§33.1)

**File:** `data/balance.js`, `run/player.js`, `run/skills.js`, tes `run/player.test.js`, `run/skills.test.js`.

- [x] **A1. Data.** Tambahkan `TEMPO` (blok di atas) ke `data/balance.js`. Ubah `DODGE` jadi `{ distance: 180, duration: 0.18, invuln: 0.25, cooldown: 0.78 }` dengan komentar `// §33: 150 → 180 px, 1.2 → 0.78 s`.
- [x] **A2. Tes gerak** (`run/player.test.js`), gaya tes yang ada di file itu:
```js
it('gerak memakai TEMPO.move (stat di layar tetap)', () => {
  const g = mk(); // pembuat Game yang sudah ada di file ini
  const x0 = g.px;
  hold(g, 1, intent({ move: { x: 1, y: 0 } }));
  expect(g.px - x0).toBeCloseTo(g.stats.moveSpd * TEMPO.move, -1);
});
```
- [x] **A3. Tes serangan & proyektil** (`run/skills.test.js`): pegang serang 3 dtk tanpa musuh, hitung serangan (`attackT` naik) → `≈ 3 / (interval × 0.7 / atkSpd)`; panah Archer `Math.hypot(p.vx, p.vy) === attack.speed × TEMPO.projSpeed` dan `range` tetap.
- [x] **A4. Jalankan** → gagal.
- [x] **A5. Terapkan:** `run/player.js` baris gerak: `const spd = run.stats.moveSpd * TEMPO.move * …`; `run/skills.js` `stepAttack`: `run.atkCd += a.interval * TEMPO.attackInterval / run.stats.atkSpd;` dan proyektil dasar `speed: a.speed * TEMPO.projSpeed`. Proyektil skill tidak berubah.
- [x] **A6.** `npm test` (perbarui tes lama yang memakai angka gerak/serangan mentah, mis. tes Kepanasan "slowed" tetap relatif) dan `npm run build`.
- [x] **A7. Berhenti → cek pemilik → commit** `Serba cepat A: tempo pemain (gerak, serangan, proyektil, menghindar)`.

---

## Bagian B — Gerombolan di dungeon (§33.2)

**File:** `data/balance.js` (`HORDE`), `data/dungeon.js`, `run/dungeon.js`, `run/run.js`, tes `run/dungeon.test.js`.

- [x] **B1. Data.** Tambahkan `HORDE` ke `data/balance.js`. `data/dungeon.js`: `ROOM.laneLen: 140`, `WAVE = { gap: 0.6 }` (hapus `nextAlive`, diganti `HORDE.nextAt`), `PORTAL.armDelay: 0.4`; komentar `§33`.
- [x] **B2. Tes** (`run/dungeon.test.js`):
```js
it('jumlah gelombang ×HORDE.count, bos tetap satu', () => {
  const q = waveQueue({ mix: { slink: 5, boss: 1 } });
  expect(q.filter((x) => x === 'boss').length).toBe(1);
  expect(q.filter((x) => x === 'slink').length).toBe(Math.round(5 * HORDE.count));
  expect(q[0]).toBe('boss');
});
it('musuh keluar berkelompok dari satu lorong', () => {
  const g = startDungeonGame(); // pembuat yang sudah ada di file ini; floor 1
  g.spawnT = 0; stepDungeon(g, 1 / 60);
  expect(g.enemies.length).toBeGreaterThanOrEqual(HORDE.pack[0]);
  expect(new Set(g.enemies.map((e) => e.lane)).size).toBe(1);
});
it('tidak lebih dari HORDE.liveCap musuh hidup', () => { /* isi 45 musuh tiruan lewat g.spawnEnemy, spawnT=0, step → jumlah tetap 45 */ });
it('gelombang berikut saat hidup ≤ 40% ukuran gelombang', () => { /* habiskan antrean, sisakan ceil(0.4×n) musuh, step gap+0,1 dtk → wave naik; sisakan satu lebih banyak → tidak naik */ });
it('HP musuh gerombolan ×HORDE.hp, bos tidak', () => { /* spawnFromLane slink vs boss: maxHp dibanding ENEMIES[..].hp × hpMul */ });
it('peluang elite ×HORDE.eliteMul', () => { /* rata-rata 4000 spawnFromLane di lantai 5 ≈ ELITE.chance[4] × 0.75 ± 0.01 */ });
```
  Tulis isi tes yang dikomentari sebagai kode nyata memakai `g.enemies`, `g.queue`, `g.queueI`, `g.wave`, `stepDungeon`. Perbarui tes lama yang memakai `WAVE.nextAlive` (baris ~74) ke aturan 40%.
- [x] **B3. Jalankan** → gagal.
- [x] **B4. Terapkan** di `run/dungeon.js`:
  - `waveQueue`: `n = ENEMIES[type].boss ? n : Math.max(1, Math.round(n * HORDE.count))`.
  - `spawnFromLane(run, type, lane = null)`: pakai `lane` bila diberi; HP `×HORDE.hp` bila bukan bos (sebelum `makeElite`); elite `rand() < ELITE.chance[f] * HORDE.eliteMul`.
  - `stepDungeon` saat antrean belum habis dan `spawnT <= 0`: bila jenis berikut bos → spawn sendiri; selain itu `k = min(rint(HORDE.pack[0], HORDE.pack[1]), sisa antrean non-bos berturut-turut, HORDE.liveCap − hidup)`; bila `k <= 0` → `spawnT = 0.2` (coba lagi); selain itu pilih satu lorong `rand()`, spawn `k` musuh di lorong itu, `spawnT = every × HORDE.packGap`.
  - Ambang gelombang: `run.enemies.length <= Math.ceil(run.queue.length * HORDE.nextAt)`.
- [x] **B5.** `npm test`, `npm run build`. Main 1 dungeon tiap kelas di cheat panel, periksa FPS di HP (≥ 40) dengan 45 musuh.
- [x] **B6. Berhenti → cek pemilik → commit** `Serba cepat B: musuh berkelompok di dungeon, lorong pendek, gelombang tumpang tindih`.

---

## Bagian C — Wilayah & hadiah (§33.3–33.4)

**File:** `data/world.js`, `data/balance.js` (`ULT.kill`), `run/field.js`, `run/dungeon.js`, `run/run.js`, tes `run/field.test.js`, `run/run.test.js`.

- [x] **C1. Data.** `FIELD.pack: [5, 10]`, `packEvery: 3`, `nightPackEvery: 2`, `maxEnemies: 40`; `ULT.kill: 2`; komentar `§33`.
- [x] **C2. Tes:**
  - `field.test.js`: `spawnPack` → jumlah dalam `[5, 10]` (dibatasi `maxEnemies`), HP tiap musuh `≈ ENEMIES[type].hp × fieldScale(level).hp × HORDE.hp` (bukan elite); `spawnGuardian` HP sang penjaga tidak memakai `HORDE.hp`.
  - `run.test.js`: bunuh musuh biasa dengan `e.xp = 10` → permata `v === 10 × HORDE.reward`; elite/bos → tidak dikali. Dua bunuhan di titik sama → satu permata `v = 2 × 6.5`. Peluang koin & gear: ganti `rand` tidak bisa, jadi uji fungsi kecil `normalChance(base)` = `base × HORDE.reward` dan pastikan `dropCoins`/`dropLoot`/`questDrop` memakainya (tes rata-rata 4000 bunuhan koin ≈ `COINS.chance × 0.65 ± 0.02`).
- [x] **C3. Jalankan** → gagal.
- [x] **C4. Terapkan:**
  - `run/field.js` `spawnPack` & pengawal di `spawnGuardian`: HP `×HORDE.hp`; `FIELD.eliteChance × HORDE.eliteMul`; `questDrop`: `rand() >= d.chance * HORDE.reward`.
  - `run/dungeon.js`: ekspor `normalChance(base) => base * HORDE.reward`; `dropCoins` `rand() >= normalChance(COINS.chance)`; `dropLoot` `rand() < normalChance(DROP.enemyChance)`.
  - `run/run.js` `killEnemy`: `const v = e.elite ? e.xp : e.xp * HORDE.reward;` lalu cari permata EXP diam (`!g.mag && !g.coin && !g.gear && !g.heart`) dalam `HORDE.merge` px → `g.v += v; g.big = g.v >= 5`, selain itu push permata baru seperti sekarang.
- [x] **C5. Ukur sesudah:** jalankan lagi `tempo.sim.test.js` dari Bagian 0, bandingkan dengan **sebelum**. Sasaran: waktu per lantai turun ±35%, EXP & emas per lantai dalam ±20%. Bila meleset, setel `HORDE.reward`/`count` (hanya angka di data) dan catat angka akhir di spesifikasi §33. Hapus `tempo.sim.test.js`.
- [x] **C6.** `npm test`, `npm run build`. Tulis tabel sebelum/sesudah di laporan.
- [x] **C7. Berhenti → cek pemilik → commit** `Serba cepat C: kawanan wilayah lebih besar, hadiah per musuh disetel`.

## Penutup
- [ ] Perbarui status di `CLAUDE.md` (§33 selesai; berikutnya §34 Mount, lalu 9E).
