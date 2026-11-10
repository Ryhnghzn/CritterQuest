# Prompt Gambar Karakter — Uji Set Pertama

Prompt untuk menguji karakter buatan generator gambar: satu set **Eclipse Warden** (emas-hitam, tema Gerhana).
Tujuannya melihat dulu apakah gambarnya bisa dipotong dan dipasang ke kerangka animasi, sebelum membuat set lain.
Prompt ditulis dalam bahasa Inggris karena hasil generator biasanya lebih baik.

Jangan menulis nama game lain atau nama armornya di prompt. Gaya dijelaskan lewat ciri-cirinya, supaya hasilnya
tetap desain sendiri. Gambar contoh AQW juga jangan diunggah sebagai referensi.

## Urutan kerja

1. Buat **Prompt 1** sampai dapat satu karakter yang benar-benar kamu suka (biasanya perlu 4–8 variasi).
2. Pakai gambar itu sebagai **gambar referensi** untuk Prompt 2 dan 3, supaya gaya dan warnanya sama.
   Kalau generatornya punya fitur ini, pakai: Character Reference, Style Reference, atau Image Reference.
3. Buat **Prompt 2** (lembar potongan armor) dan **Prompt 3** (badan polos).
4. Taruh hasil terbaik di satu folder, misalnya `~/Desktop/cq-karakter/`, lalu kabari aku.

**Latar:** kebanyakan generator tidak bisa membuat transparan sungguhan, jadi semua prompt meminta latar hijau polos.
Hijau itu nanti aku hapus. Kalau generatornya punya opsi latar transparan, pakai saja opsi itu.

**Ukuran:** sebesar yang tersedia, minimal 1024 px di sisi terpendek. Simpan sebagai PNG.

## GAYA DASAR (tempel di depan setiap prompt)

```
2D fantasy RPG character art, polished hand-drawn vector illustration, flash game character style,
clean confident ink lines with thick outer silhouette and thin tapered inner lines, smooth gradients
on metal, crisp cel shading, sharp specular highlights, saturated rich colors, anime-style face,
heroic adult proportions about seven heads tall, broad shoulders, flat solid bright green background
(#00FF00), no ground, no cast shadow
```

## NEGATIF (negative prompt)

```
text, letters, logo, watermark, signature, frame, border, scenery, ground, cast shadow, gradient background,
chibi, big head, child, cute, 3D render, photorealistic, photo, pixel art, sketch, painterly brush texture,
blurry, cropped, extra fingers, extra limbs, deformed hands, asymmetrical eyes, green armor, green glow
```

Kalau generatornya tidak punya kolom negatif, tambahkan di akhir prompt: `no text, no scenery, not chibi, not 3D`.

---

## Prompt 1 — Karakter utuh (rasio 2:3)

Ini yang menentukan gaya semua aset berikutnya. Pilih yang pose, wajah, dan armornya paling kamu suka.

```
Full body male fantasy warrior standing in a confident three-quarter view, body turned toward the right of
the image, near leg stepping forward, weight on the back leg. The near arm is on the left of the image and
fully detailed. The far arm and far leg are solid pure black silhouettes with no detail.
Young adult anime face with sharp amber eyes, determined expression, spiky silver-white hair.
Ornate black and gold armor themed on a solar eclipse: oversized layered curved gold-and-pale-steel pauldron
on the near shoulder, sculpted gold breastplate with a glowing ice-blue crystal at the center, black long coat
with wide flaring tails, gold-trimmed zigzag hem, dense gold filigree scrollwork covering the coat,
pale steel gauntlet and greaves with gold trim, thin gold crescent crown.
Holding a large ornate sword low in the near hand, blade pointing down and outward. Whole figure visible
from head to toes, nothing cropped, centered with margin on all sides.
```

## Prompt 2 — Lembar potongan armor (rasio 1:1)

Pakai gambar terbaik dari Prompt 1 sebagai referensi. Tiap potongan harus terpisah, tidak saling menempel, supaya mudah dipotong.

```
Game asset sheet of the exact same armor set as the reference character, same style, colors and line weight.
Separate pieces laid out in a clean grid with wide empty space between them, each piece fully visible and not
overlapping any other: crown, near shoulder pauldron, breastplate torso with coat collar, coat tail left panel,
coat tail right panel, upper arm armor, forearm vambrace, open gauntlet hand, closed gauntlet fist, thigh armor,
knee plate, shin greave, armored foot in side view, large ornate sword in full length.
All pieces in the same three-quarter view and same scale. Not worn by anyone, no body inside.
```

Kalau potongan masih menempel atau ada yang hilang, buat lebih sedikit sekaligus: minta 4–5 potongan per gambar.

## Prompt 3 — Badan polos (rasio 2:3)

Badan yang sama tanpa armor, jadi dasar semua perlengkapan. Pose harus sama dengan Prompt 1.

```
The exact same character and exact same pose as the reference image, wearing only a plain fitted dark grey
sleeveless undershirt and plain dark trousers, barefoot. No armor, no crown, no coat, no weapon.
Same face, same silver-white hair, same three-quarter view. Near arm and near leg fully detailed, far arm and far
leg solid pure black silhouettes. Whole figure visible from head to toes, nothing cropped.
```

---

## Tips kalau hasilnya belum bagus

- **Terlihat seperti lukisan atau 3D:** tambahkan `flat vector art, clean shapes, no brush texture`.
- **Tangan atau kaki belakang tidak hitam:** tulis ulang di akhir prompt `far arm and far leg are pure black #000000`.
- **Armor terlalu polos:** tambahkan `extremely ornate, dense gold filigree, layered plates`.
- **Terlalu chibi:** tambahkan `tall adult body, small head, long legs`.
- **Hijau muncul di armor:** ganti warna latar ke magenta polos (#FF00FF), dan di negatif ganti `green` jadi `magenta`.

## Yang aku periksa setelah gambar dikirim

1. Latar bisa dihapus bersih, tanpa tepi hijau.
2. Tiap potongan utuh dan bagian sendinya cukup untuk saling menimpa saat bergerak.
3. Sudut, ukuran, dan garis antarpotongan sama.
4. Hasilnya tetap terbaca pada ukuran kecil di layar HP.

Kalau lolos, aku pasang ke kerangka Warrior di halaman uji terpisah dan kita lihat saat berjalan dan menyerang.
