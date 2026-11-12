// Tab Tantangan of the Adventurers' Hall (spec §41.3): the endless Rift (its record, entering from floor 1 or the
// deepest checkpoint); plus the blessing choice shown between Rift floors. Difficulty follows Power (spec §47).
import { el, button } from './screens.js';
import { BLESSINGS } from '../data/rift.js';
import { tr, t } from '../i18n.js';

// ctx: onRift(fromCheckpoint), gate (true at the Rift's gate in Kota Awal: the Rift with its buttons; at the
// Adventurers' Hall its record)
export function challengePanel(char, ctx) {
  const list = el('div', 'shoplist challenge');
  list.append(el('div', 'label', tr('Celah tanpa batas')));
  if (!char.unlocked.rift) { list.append(el('div', 'note', tr('Terbuka setelah kisah tamat (Sang Gerhana tumbang).'))); return list; }
  list.append(el('div', 'note', t('Rekor terdalam: lantai {b} · titik simpan: lantai {c}. Tiap 5 lantai bos lalu titik simpan; hadiah sampai titik simpan aman saat tumbang. Lantai biasa: pilih 1 dari 3 berkah.', { b: char.rift.best, c: char.rift.checkpoint })));
  if (!ctx.gate) { list.append(el('div', 'note', tr('Masuk lewat Gerbang Celah di alun-alun Kota Awal.'))); return list; }
  const row = el('div', 'row');
  const go = button(tr('Masuk Celah (lantai 1)'), 'btn', () => ctx.onRift(false)); go.dataset.rift = '1';
  row.append(go);
  if (char.rift.checkpoint > 0) { const cp = button(t('Mulai dari lantai {n}', { n: char.rift.checkpoint + 1 }), 'btn', () => ctx.onRift(true)); cp.dataset.rift = 'cp'; row.append(cp); }
  list.append(row);
  return list;
}

// Between Rift floors: three blessing cards; onPick(id) once one is chosen.
export function showBlessings(ids, onPick) {
  const box = el('div', 'blesspick');
  box.append(el('div', 'blesstitle', tr('Pilih satu berkah')));
  const cards = el('div', 'blesscards');
  for (const id of ids) {
    const b = BLESSINGS.find((x) => x.id === id);
    const card = button('', 'blesscard', () => { box.remove(); onPick(id); });
    card.style.setProperty('--c', b.color);
    card.append(el('b', null, b.name), el('span', null, b.desc));
    card.dataset.bless = id;
    cards.append(card);
  }
  box.append(cards);
  document.body.append(box);
}
