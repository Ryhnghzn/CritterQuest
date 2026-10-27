// Pilih Slot: three save slots — open, create, or delete (spec §3).
import { el, button, svgIcon, stage } from './screens.js';
import { DUNGEONS } from '../data/dungeons.js';
import { portrait, OUTFIT } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';
import { tr, t } from '../i18n.js';

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
      // deepest dungeon reached
      const far = [...DUNGEONS].reverse().find((d) => c.records.dungeons[d.id].bestFloor > 0);
      rec.append(svgIcon('trophy'), far ? ` ${t('{d} · Lantai {n}', { d: far.short, n: c.records.dungeons[far.id].bestFloor })}` : ` ${tr('Belum ke dungeon')}`);
      card.append(
        st, el('div', 'nm', c.name), cls, rec,
        button(tr('Hapus'), 'btn ghost small danger', (ev) => { ev.stopPropagation(); onDelete(e.slot); }),
      );
      card.addEventListener('click', () => onOpen(e.slot));
    } else if (e.status === 'empty') {
      card.classList.add('empty');
      card.append(
        el('div', 'plus', '+'),
        el('div', 'nm', t('Slot {n}', { n: e.slot + 1 })),
        el('div', 'ds', tr('Kosong — buat petualang baru')),
        button(tr('Buat'), 'btn small', (ev) => { ev.stopPropagation(); onCreate(e.slot); }),
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
        el('div', 'nm', tr('Data rusak')),
        el('div', 'ds', t('Slot {n} tidak bisa dibaca.', { n: e.slot + 1 })),
        button(tr('Hapus'), 'btn ghost small danger', () => onDelete(e.slot)),
      );
    }
    box.appendChild(card);
  });
}
