// Kemah: portrait + stats, tabs Mulai Ronde / Gear / Toko (spec §3).
// Gear and Toko are placeholders until langkah 4–5.
import { el, button, fmtTime, svgIcon, stage } from './screens.js';
import { portrait, OUTFIT } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';
import { CHAR_LEVEL_MAX } from '../data/balance.js';
import { expToNext, finalStats } from '../meta/character.js';

const STAT_ROWS = [
  ['maxHp', 'HP', (v) => Math.round(v)],
  ['atk', 'ATK', (v) => Math.round(v)],
  ['def', 'DEF', (v) => Math.round(v)],
  ['atkSpd', 'Kec. serang', (v) => `×${v.toFixed(2)}`],
  ['crit', 'Kritis', (v) => `${v}%`],
  ['critDmg', 'Dmg kritis', (v) => `×${v.toFixed(1)}`],
  ['moveSpd', 'Gerak', (v) => Math.round(v)],
  ['cdr', 'CDR', (v) => `${v}%`],
  ['magnet', 'Magnet', (v) => Math.round(v)],
];

const TABS = [['run', 'Mulai Ronde'], ['gear', 'Gear'], ['shop', 'Toko']];

export function renderCamp(box, char, { onStart, onBack }) {
  let tab = 'run';
  box.replaceChildren();
  const color = OUTFIT[char.classId][0];

  const st = stage(portrait(char.classId, char.look, 100), color);
  st.append(el('span', 'lvbadge', `LV ${char.level}`));
  const maxed = char.level >= CHAR_LEVEL_MAX;
  const need = expToNext(char.level);
  const meter = el('div', 'meter');
  const fill = el('i');
  fill.style.transform = `scaleX(${maxed ? 1 : char.exp / need})`;
  meter.append(fill);
  const cls = el('span', 'pill', CLASSES[char.classId].name);
  cls.style.setProperty('--c', color);
  const line = el('div', 'note');
  line.append(maxed ? 'Level maks' : `EXP ${char.exp} / ${need}`, ' · ');
  line.append(el('span', 'gold', `${char.gold} koin`));
  const info = el('div', 'info');
  const top = el('div');
  top.append(cls);
  info.append(el('div', 'nm', char.name), top, meter, line);
  const head = el('div', 'camphead');
  head.append(st, info);

  const tabRow = el('div', 'tabs');
  const tabBtns = TABS.map(([id, label]) => {
    const b = button(label, 'chip', () => { tab = id; refresh(); });
    b.dataset.tab = id;
    return b;
  });
  tabRow.append(...tabBtns);

  const panel = el('div', 'panel');
  box.append(head, tabRow, panel, button('Ganti Slot', 'btn ghost', onBack));

  function runTab() {
    const grid = el('div', 'statgrid');
    const s = finalStats(char);
    for (const [key, label, fmt] of STAT_ROWS) {
      const cell = el('div', 'stat');
      cell.append(el('span', null, label), el('b', null, String(fmt(s[key]))));
      grid.append(cell);
    }
    const r = char.records;
    const rec = el('div', 'records');
    for (const [icon, text] of [['trophy', `Rekor ${fmtTime(r.bestTime)}`], ['clock', `${r.runs} ronde`], ['skull', `${r.kills} kill`], ['skull', `${r.bossKills} bos`]]) {
      const chip = el('span', 'hchip');
      chip.append(svgIcon(icon), text);
      rec.append(chip);
    }
    const start = button('Mulai Ronde', 'btn big', onStart);
    start.id = 'startrun';
    return [grid, rec, start];
  }

  function soon(text) {
    const s = el('div', 'soon');
    s.append(svgIcon('lock'), text);
    return s;
  }

  function refresh() {
    tabBtns.forEach((b) => b.classList.toggle('sel', b.dataset.tab === tab));
    if (tab === 'run') panel.replaceChildren(...runTab());
    else panel.replaceChildren(soon(tab === 'gear' ? 'Gear segera hadir' : 'Toko segera hadir'));
  }
  refresh();
}
