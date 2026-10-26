// Pilih Slot: three save slots — open, create, or delete (spec §3).
import { el, button, fmtTime } from './screens.js';
import { portrait } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';

// entries: from store.loadSlots(); handlers receive the slot number.
export function renderSlots(box, entries, { onOpen, onCreate, onDelete }) {
  box.replaceChildren();
  for (const e of entries) {
    const card = el('div', 'card slotcard');
    card.dataset.slot = e.slot;
    if (e.status === 'ok') {
      const c = e.data;
      const p = portrait(c.classId, c.look, 3);
      p.classList.add('doll');
      card.append(
        p,
        el('div', 'nm', c.name),
        el('div', 'ds', `${CLASSES[c.classId].name} · LV ${c.level}`),
        el('div', 'ds', `Rekor ${fmtTime(c.records.bestTime)}`),
        button('HAPUS', 'btn ghost small', (ev) => { ev.stopPropagation(); onDelete(e.slot); }),
      );
      card.addEventListener('click', () => onOpen(e.slot));
    } else if (e.status === 'empty') {
      card.append(
        el('div', 'nm', `SLOT ${e.slot + 1}`),
        el('div', 'ds', 'Kosong'),
        button('BUAT', 'btn small', (ev) => { ev.stopPropagation(); onCreate(e.slot); }),
      );
      card.addEventListener('click', () => onCreate(e.slot));
    } else {
      // corrupt: never overwritten; the player decides (export arrives in langkah 6)
      card.classList.add('bad');
      card.style.cursor = 'default';
      card.append(
        el('div', 'nm', 'DATA RUSAK'),
        el('div', 'ds', `Slot ${e.slot + 1} tidak bisa dibaca.`),
        button('HAPUS', 'btn ghost small', () => onDelete(e.slot)),
      );
    }
    box.appendChild(card);
  }
}
