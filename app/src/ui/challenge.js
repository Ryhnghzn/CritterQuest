// Tab Tantangan of the Adventurers' Hall (spec §41.3): the difficulty, and the endless Rift (its record,
// entering from floor 1 or the deepest checkpoint); plus the blessing choice shown between Rift floors.
import { el, button } from './screens.js';
import { DIFFICULTY, DIFFICULTY_IDS } from '../data/difficulty.js';
import { BLESSINGS } from '../data/rift.js';
import { levelOpen } from '../meta/difficulty.js';
import { tr, t } from '../i18n.js';

const pct = (k) => `${Math.round(k * 100)}%`;
function diffLine(d) {
  if (d.id === 'normal') return tr('Angka biasa.');
  return t('Musuh HP ×{hp}, damage ×{dmg}; elite ×{e}, +{a} sifat; koin & EXP ×{r}; koin tersisa saat tumbang {k}.', { hp: d.hp, dmg: d.dmg, e: d.elite, a: d.affixes, r: d.reward, k: pct(d.goldKeep) })
    + (d.tempo !== 1 ? ` ${tr('Musuh beraksi lebih sering.')}` : '') + (d.mythic > 1 ? ` ${t('Mitos ×{n}.', { n: d.mythic })}` : '');
}

// ctx: onDifficulty(id), onRift(fromCheckpoint), inHome (the Rift's gate is in Kota Awal)
export function challengePanel(char, ctx) {
  const list = el('div', 'shoplist challenge');
  list.append(el('div', 'label', tr('Tingkat kesulitan — berlaku di dunia & dungeon. Ganti hanya di kota.')));
  for (const id of DIFFICULTY_IDS) {
    const d = DIFFICULTY[id], open = levelOpen(char, id), now = char.difficulty === id;
    const row = el('div', `shoprow${now ? ' worn' : ''}${open ? '' : ' locked'}`);
    const name = el('b', null, tr(d.name)); name.style.color = d.color;
    const txt = el('div', 'stx'); txt.append(name, el('span', null, open ? diffLine(d) : tr('Terbuka setelah mengalahkan Sang Gerhana di Sulit.')));
    const act = el('span', 'skbtns');
    if (now) act.append(el('span', 'have', tr('Dipakai')));
    else { const b = button(tr('Pakai'), 'btn small', () => ctx.onDifficulty(id)); b.disabled = !open; b.dataset.diff = id; act.append(b); }
    row.append(txt, act);
    list.append(row);
  }
  list.append(el('div', 'label', tr('Celah tanpa batas')));
  if (!char.unlocked.rift) { list.append(el('div', 'note', tr('Terbuka setelah kisah tamat (Sang Gerhana tumbang).'))); return list; }
  list.append(el('div', 'note', t('Rekor terdalam: lantai {b} · titik simpan: lantai {c}. Tiap 5 lantai bos lalu titik simpan; hadiah sampai titik simpan aman saat tumbang. Lantai biasa: pilih 1 dari 3 berkah.', { b: char.rift.best, c: char.rift.checkpoint })));
  const row = el('div', 'row');
  const go = button(tr('Masuk Celah (lantai 1)'), 'btn', () => ctx.onRift(false)); go.dataset.rift = '1';
  row.append(go);
  if (char.rift.checkpoint > 0) { const cp = button(t('Mulai dari lantai {n}', { n: char.rift.checkpoint + 1 }), 'btn', () => ctx.onRift(true)); cp.dataset.rift = 'cp'; row.append(cp); }
  if (!ctx.inHome) { for (const b of row.children) b.disabled = true; list.append(el('div', 'note', tr('Gerbang Celah ada di Kota Awal.'))); }
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
