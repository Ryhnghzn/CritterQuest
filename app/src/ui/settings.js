// Settings menu (spec §29): four tabs — Suara, Grafis, Permainan, Bahasa. Every change
// goes out at once through onChange(key, value); the caller applies and saves it.
import { el, button, keepView } from './screens.js';
import { tr } from '../i18n.js';

let tab = 'sound'; // kept between openings
const TABS = [['sound', 'Suara'], ['gfx', 'Grafis'], ['play', 'Permainan'], ['lang', 'Bahasa']];
// [key, label, kind, options?] — kind: vol (0–100 slider) | bool | pick ([value, label] pairs)
const ROWS = {
  sound: [['musicVol', 'Musik', 'vol'], ['sfxVol', 'Efek suara', 'vol'], ['muted', 'Bisukan semua', 'bool']],
  gfx: [
    ['view', 'Tampilan', 'pick', [['25d', '2.5D'], ['2d', '2D']]],
    ['effects', 'Kualitas efek', 'pick', [['auto', 'Otomatis'], ['full', 'Penuh'], ['lite', 'Ringan']]],
    ['sharp', 'Ketajaman', 'pick', [['save', 'Hemat'], ['normal', 'Normal'], ['sharp', 'Tajam']]],
    ['foeMotion', 'Animasi musuh', 'bool'], ['rimLight', 'Cahaya tepi karakter', 'bool'],
    ['showFps', 'Tampilkan FPS', 'bool'],
  ],
  play: [
    ['autoAttack', 'Serang otomatis', 'bool'], ['shake', 'Guncangan layar', 'bool'], ['dmgNumbers', 'Angka damage', 'bool'],
    ['zoom', 'Zoom kamera awal', 'pick', [['near', 'Dekat'], ['mid', 'Sedang'], ['far', 'Jauh']]],
    ['camSens', 'Sensitivitas putar kamera', 'pick', [['slow', 'Lambat'], ['normal', 'Normal'], ['fast', 'Cepat'], ['xfast', 'Sangat cepat']]],
    ['camera', 'Kamera (percobaan)', 'pick', [['top', '2.5D'], ['behind', 'Belakang'], ['follow', 'Belakang + ikut']]],
  ],
  lang: [['lang', 'Bahasa', 'pick', [['en', 'English'], ['id', 'Indonesia']]]],
};
const NOTES = {
  gfx: 'Otomatis: efek penuh, turun ke Ringan bila FPS rendah. Ketajaman lebih tinggi lebih berat di HP; berlaku penuh untuk tempat yang dimuat berikutnya. Animasi musuh & Cahaya tepi karakter bisa dimatikan bila HP berat (Cahaya tepi juga mati di Ringan).',
  play: 'Putar kamera: di HP geser atau putar dua jari, di PC tahan klik kanan lalu geser. Kamera Belakang masih percobaan: rendah di belakang hero; Belakang + ikut berputar sendiri mengikuti arah jalan.',
  lang: 'Game dimuat ulang setelah bahasa diganti.',
};

// s: the settings; onChange(key, value); onClose()
export function renderSettings(box, s, { onChange, onClose }) {
  keepView(box, `settings:${tab}`, () => build(box, s, onChange, onClose));
}

function build(box, s, onChange, onClose) {
  const redraw = () => renderSettings(box, s, { onChange, onClose });
  box.replaceChildren();
  const panel = el('div', 'panel settings');
  const tabs = el('div', 'stabs');
  for (const [id, label] of TABS) {
    const b = button(tr(label), `stab${id === tab ? ' on' : ''}`, () => { tab = id; redraw(); });
    b.dataset.tab = id;
    tabs.append(b);
  }
  const body = el('div', 'sbody');
  for (const [key, label, kind, opts] of ROWS[tab]) {
    const row = el('div', 'srow');
    row.dataset.key = key;
    row.append(el('span', 'slabel', tr(label)));
    if (kind === 'vol') {
      const input = el('input');
      input.type = 'range'; input.min = 0; input.max = 100; input.step = 5; input.value = s[key];
      const val = el('b', 'sval', `${s[key]}%`);
      input.addEventListener('input', () => { val.textContent = `${input.value}%`; onChange(key, +input.value); });
      row.append(input, val);
    } else if (kind === 'bool') {
      const b = button('', `tog${s[key] ? ' on' : ''}`, () => { onChange(key, !s[key]); redraw(); });
      b.append(el('i'));
      b.setAttribute('aria-pressed', String(!!s[key]));
      row.append(b);
    } else {
      const seg = el('div', 'seg');
      for (const [v, text] of opts) {
        const b = button(tr(text), v === s[key] ? 'on' : '', () => { if (v !== s[key]) { onChange(key, v); redraw(); } });
        b.dataset.value = v;
        seg.append(b);
      }
      row.append(seg);
    }
    body.append(row);
  }
  if (NOTES[tab]) body.append(el('div', 'note', tr(NOTES[tab])));
  const close = button(tr('Tutup'), 'btn ghost', onClose);
  close.id = 'settings-close';
  const foot = el('div', 'sfoot');
  foot.append(el('span', 'note', tr('Tersimpan otomatis')), close);
  const cols = el('div', 'scols');
  cols.append(tabs, body);
  panel.append(el('h2', 'h', tr('Pengaturan')), cols, foot);
  box.append(panel);
}
