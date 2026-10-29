# Prompt Gambar — Critter Quest

Prompt untuk membuat gambar latar di generator gambar (Midjourney, DALL·E, Ideogram, Leonardo, SD, dll.).
Prompt ditulis dalam bahasa Inggris karena hasil generator biasanya lebih baik. Penjelasan dalam bahasa Indonesia.

## Cara pakai

1. Untuk setiap gambar, gabungkan: **GAYA DASAR** + **prompt gambar itu**. Isi **NEGATIF** ke kolom negative prompt
   (kalau generatornya tidak punya kolom ini, tambahkan `no text, no people` dst. di akhir prompt).
2. Rasio **16:9**, minimal **1920×1080** (lebih baik 2560×1440). Simpan sebagai PNG atau JPG kualitas tinggi;
   nanti aku ubah ke WebP supaya ringan.
3. **Area aman:** di HP mendatar layar lebih lebar (± 20:9), jadi gambar terpotong ±10% di atas dan bawah.
   Jangan taruh hal penting di pinggir atas/bawah.
4. Buat 2–4 variasi per gambar, pilih yang paling cocok, lalu beri nama sesuai kolom **File**.
5. Taruh semua file di satu folder (misalnya `~/Desktop/cq-img/`) lalu kabari aku.

## GAYA DASAR (tempel di depan setiap prompt)

```
Dark fantasy comic-book illustration, angular stylized shapes, bold hard cel-shading with deep
black shadows, thin dark ink linework, vivid colored rim lighting, painterly textured surfaces,
moody night atmosphere lit by warm firelight and torchlight, limited palette of charcoal black,
deep plum purple, burnt bronze and antique gold with crimson accents, high contrast, cinematic
wide composition, video game background art, 16:9
```

## NEGATIF (negative prompt)

```
text, letters, words, title, logo, watermark, signature, user interface, frame, border,
pixel art, chibi, cute, kawaii, big head, cartoon for kids, 3D render, photorealistic, photo,
anime, blurry, low detail, oversaturated neon, cropped
```

---

## A. Wajib

### A1. Latar halaman judul — `title_bg`

Adegan "Api Unggun" yang sekarang digambar kode. **Tanpa orang**: keempat pahlawan tetap digambar kode di atasnya
(supaya sama dengan tampilan di dalam game). Api di ±60% dari kiri, dekat bawah. Sisi kiri gelap dan polos untuk logo & menu.

```
A lonely campfire at the edge of a dark ancient forest at night, seen from slightly above eye level.
The campfire sits at about 60 percent from the left, near the bottom of the frame, with crossed logs,
bright orange and yellow flames and glowing embers drifting upward. A ring of flat stones and fallen
logs around the fire, empty, as if waiting for travelers. Behind it, layered silhouettes of tall
jagged pine trees. In the upper right sky a solar eclipse: a black moon covering the sun, with a thin
blazing golden corona, faint stars around it. The left third of the image is calm, very dark and
simple (deep purple shadows, soft mist) to leave room for a game menu. Warm firelight spills on the
ground, cold violet night everywhere else. No people, no creatures.
```

### A2. Latar loading umum — `loading_bg`

Di tengah layar loading ada cincin gerhana (progres) dan di bawahnya bar + tips. Jadi gambar ini harus **gelap, tengahnya kosong**,
bagian bawah sepertiga gelap polos.

```
A vast dark fantasy landscape at night seen from far away: distant mountains, a forest, a small walled
town with a few warm lit windows, all as dark silhouettes. A huge solar eclipse hangs in the center of
the sky, a black disc with a faint golden ring of light, its glow softly lighting thin clouds.
The center of the image is open sky with little detail. The bottom third is very dark, almost black,
calm ground with faint mist. Very low brightness overall, quiet and mysterious mood.
```

---

## B. Opsional — latar loading per tempat

Kalau dibuat, layar loading memakai gambar tempat tujuan; kalau tidak ada, pakai `loading_bg`.
Aturan komposisi sama dengan A2: **tengah kosong, bawah sepertiga gelap, keseluruhan redup**.
Tambahkan kalimat ini di akhir setiap prompt B:

```
Center of the image open and low in detail, bottom third very dark, overall dim and moody, no people.
```

| File | Tempat | Prompt |
|---|---|---|
| `load_town` | Kota Awal | `A small medieval fantasy town at night, timber houses with steep roofs, lanterns on posts, a stone well in a plaza, warm orange windows, wooden palisade, cold purple night sky.` |
| `load_forest` | Hutan Kelam (wilayah hutan) | `A dark twisted forest at night, giant gnarled trees, hanging moss, a narrow dirt path, faint green fireflies, an old wooden signpost, deep green and black shadows.` |
| `load_ice` | Padang Es | `A frozen plain at night, cracked blue ice, snow drifts, jagged ice spires, a pale aurora in the sky, cold cyan rim light, lonely broken watchtower in the distance.` |
| `load_desert` | Gurun Merah | `A red desert at dusk turning to night, wind-carved red rock arches, dunes, half-buried ancient statues, a giant skeleton in the sand, warm crimson and amber light.` |
| `load_volcano` | Gunung Api | `A volcanic wasteland, black basalt cliffs, rivers of glowing lava, ash falling like snow, a huge erupting volcano on the horizon, deep red and orange glow under a smoky sky.` |
| `load_eclipse` | Tanah Gerhana | `A cursed land under a permanent eclipse, cracked violet ground, floating rocks, dead white trees, rifts of purple light in the earth, a distant dark tower piercing the sky, faint ghostly wisps.` |
| `load_shadow` | Ruang Bawah Tanah Bayangan | `A deep stone dungeon corridor, slate gray-purple walls, iron torches with orange flames, cyan and violet magic runes glowing on the floor, chains and pillars fading into darkness.` |
| `load_crystal` | Gua Kristal | `A cavern full of huge blue and violet crystals glowing from within, cold blue light, an underground pool reflecting the crystals, narrow rocky path.` |
| `load_fungus` | Hutan Jamur Busuk | `An underground rotting mushroom forest, giant glowing fungi in toxic green and magenta, spore clouds in the air, slimy roots, murky swamp water.` |
| `load_tomb` | Makam Pasir | `An ancient sandstone tomb inside a desert, hieroglyph-like carvings without readable text, sarcophagi, sand pouring from cracks in the ceiling, warm amber torchlight and teal magic glow.` |
| `load_lava` | Benteng Lava | `A fortress built into a volcano, black iron gates, molten lava flowing in channels across the floor, chains, orange-red glow, heat haze and sparks.` |
| `load_spire` | Menara Gerhana | `Inside a colossal dark tower, a spiral stair rising around a void, floating stones, purple eclipse light pouring from above, golden runes in the walls, an ominous final-boss atmosphere.` |

---

## C. Opsional — latar epilog "Fajar Kembali" — `ending_bg`

Muncul sekali setelah bos akhir (Sang Gerhana) kalah; panel cerita ada di tengah, jadi tengahnya jangan terlalu ramai.

```
Dawn breaking over a fantasy world after a long darkness: the black eclipse in the sky cracks open
and shatters into fragments as golden sunlight pours through. Below, a ruined dark tower crumbles in
the distance, and the land (forest, snowy hills, desert, a volcano) is touched by the first warm light.
A small campfire still glows on a hill in the foreground. Hopeful, triumphant mood, gold and rose light
pushing back purple shadows. No people.
```

---

## Tidak disarankan (untuk sekarang)

- **Logo bertulisan "Critter Quest":** generator sering salah mengeja huruf. Logo tetap teks Cinzel dari kode.
- **Ilustrasi pahlawan/monster:** hasilnya tidak akan sama dengan karakter gaya D di dalam game, jadi terlihat
  seperti dua game berbeda.

## Yang aku lakukan setelah gambar dikirim

- Ubah ke WebP (± 200–400 KB per gambar), simpan di `app/public/img/`.
- **Judul:** gambar jadi latar, pahlawan dari kode tetap duduk di sekitar api; bara api & kilau api tetap
  bergerak lewat kanvas di atas gambar. Posisi pahlawan kusesuaikan dengan letak api di gambar.
- **Loading:** latar per tempat tujuan (atau `loading_bg`), cincin gerhana + bar + tips tetap di atasnya.
- **Epilog:** latar di belakang panel cerita.
- Gambar lama dari kode tetap jadi cadangan kalau file gambar gagal dimuat atau masih diunduh.
- Aturan "tanpa file gambar" di `CLAUDE.md` dan `DESIGN.md` kuperbarui (pengecualian: latar layar penuh).
