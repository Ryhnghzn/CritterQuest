// Pilih Slot: three save slots — open, create, or delete (spec §3).
import { branchOf } from '../meta/jobs.js';
import { el, button, svgIcon, stage, pressable } from './screens.js';
import { DUNGEONS } from '../data/dungeons.js';
import { portrait, outfitOf } from '../art/doll.js';
import { powerOf } from '../meta/power.js';
import { powerChip } from './power.js';
import { CLASSES } from '../data/classes.js';
import { tr, t } from '../i18n.js';

const row = (...kids) => { const r = el('div', 'slotio'); r.append(...kids); return r; };

// entries: from store.loadSlots(); handlers receive the slot number.
// onExport / onImport (spec §9.3): a slot to a .json file and back
export function renderSlots(box, entries, { onOpen, onCreate, onDelete, onExport, onImport }) {
  const io = (label, fn, slot) => button(tr(label), 'btn ghost small', (ev) => { ev.stopPropagation(); fn(slot); });
  box.replaceChildren();
  entries.forEach((e, i) => {
    const card = el('div', 'card slotcard');
    card.dataset.slot = e.slot;
    card.style.animationDelay = `${i * 0.06}s`;
    if (e.status === 'ok') {
      const c = e.data;
      const color = outfitOf(c.classId)[0]; // a Pengembara has no class colour of its own
      const st = stage(portrait(c.classId, c.look, 104), color);
      const lv = el('span', 'lvbadge', `LV ${c.level}`);
      st.append(lv);
      const br = branchOf(c), cls = el('span', 'pill', br ? `${CLASSES[c.classId].name} · ${br.name}` : CLASSES[c.classId].name); // Job Lanjutan (spec §43.10)
      cls.style.setProperty('--c', color);
      const rec = el('div', 'ds');
      // deepest dungeon reached
      const far = [...DUNGEONS].reverse().find((d) => c.records.dungeons[d.id].bestFloor > 0);
      rec.append(svgIcon('trophy'), far ? ` ${t('{d} · Lantai {n}', { d: far.short, n: c.records.dungeons[far.id].bestFloor })}` : ` ${tr('Belum ke dungeon')}`);
      card.append(
        st, el('div', 'nm', c.name), cls, powerChip(powerOf(c)), rec, // spec §47.6
        row(io('Ekspor', onExport, e.slot), io('Impor', onImport, e.slot)),
        button(tr('Hapus'), 'btn ghost small danger', (ev) => { ev.stopPropagation(); onDelete(e.slot); }),
      );
      pressable(card, () => onOpen(e.slot));
    } else if (e.status === 'empty') {
      card.classList.add('empty');
      card.append(
        el('div', 'plus', '+'),
        el('div', 'nm', t('Slot {n}', { n: e.slot + 1 })),
        el('div', 'ds', tr('Kosong. Buat petualang baru')),
        button(tr('Buat'), 'btn small', (ev) => { ev.stopPropagation(); onCreate(e.slot); }),
        io('Impor', onImport, e.slot),
      );
      pressable(card, () => onCreate(e.slot));
    } else {
      // corrupt: never overwritten; the player decides — export it to rescue it, or delete
      card.classList.add('bad');
      card.style.cursor = 'default';
      const w = el('div', 'warn');
      w.append(svgIcon('warn'));
      card.append(
        w,
        el('div', 'nm', tr('Data rusak')),
        el('div', 'ds', t('Slot {n} tidak bisa dibaca.', { n: e.slot + 1 })),
        io('Ekspor', onExport, e.slot),
        button(tr('Hapus'), 'btn ghost small danger', () => onDelete(e.slot)),
      );
    }
    box.appendChild(card);
  });
}
