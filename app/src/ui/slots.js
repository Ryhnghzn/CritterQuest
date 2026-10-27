// Pilih Slot: three save slots — open, create, or delete (spec §3).
import { el, button, svgIcon, stage } from './screens.js';
import { portrait, OUTFIT } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';

// entries: from store.loadSlots(); handlers receive the slot number.
export function renderSlots(box, entries, { onOpen, onCreate, onDelete }) {
  box.replaceChildren();
  entries.forEach((e, i) => {
    const card = el('div', 'card slotcard');
    card.dataset.slot = e.slot;
    card.style.animationDelay = `${i * 0.06}s`;
    if (e.status === 'ok') {
      const c = e.data;
      const color = OUTFIT[c.classId][0];
      const st = stage(portrait(c.classId, c.look, 104), color);
      const lv = el('span', 'lvbadge', `LV ${c.level}`);
      st.append(lv);
      const cls = el('span', 'pill', CLASSES[c.classId].name);
      cls.style.setProperty('--c', color);
      const rec = el('div', 'ds');
      rec.append(svgIcon('trophy'), c.records.bestFloor > 0 ? ` Lantai ${c.records.bestFloor}` : ' Belum ke dungeon');
      card.append(
        st, el('div', 'nm', c.name), cls, rec,
        button('Hapus', 'btn ghost small danger', (ev) => { ev.stopPropagation(); onDelete(e.slot); }),
      );
      card.addEventListener('click', () => onOpen(e.slot));
    } else if (e.status === 'empty') {
      card.classList.add('empty');
      card.append(
        el('div', 'plus', '+'),
        el('div', 'nm', `Slot ${e.slot + 1}`),
        el('div', 'ds', 'Kosong — buat petualang baru'),
        button('Buat', 'btn small', (ev) => { ev.stopPropagation(); onCreate(e.slot); }),
      );
      card.addEventListener('click', () => onCreate(e.slot));
    } else {
      // corrupt: never overwritten; the player decides (export arrives in langkah 6)
      card.classList.add('bad');
      card.style.cursor = 'default';
      const w = el('div', 'warn');
      w.append(svgIcon('warn'));
      card.append(
        w,
        el('div', 'nm', 'Data rusak'),
        el('div', 'ds', `Slot ${e.slot + 1} tidak bisa dibaca.`),
        button('Hapus', 'btn ghost small danger', () => onDelete(e.slot)),
      );
    }
    box.appendChild(card);
  });
}
