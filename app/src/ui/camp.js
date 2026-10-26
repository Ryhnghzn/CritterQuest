// Kemah: portrait + stats, tabs Mulai Ronde / Gear / Toko (spec §3).
// Gear and Toko are placeholders until langkah 4–5.
import { el, button, fmtTime } from './screens.js';
import { portrait } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';
import { CHAR_LEVEL_MAX } from '../data/balance.js';
import { expToNext, finalStats } from '../meta/character.js';

const STAT_ROWS = [
  ['maxHp', 'HP', (v) => Math.round(v)],
  ['atk', 'ATK', (v) => Math.round(v)],
  ['def', 'DEF', (v) => Math.round(v)],
  ['atkSpd', 'KEC. SERANG', (v) => `×${v.toFixed(2)}`],
  ['crit', 'KRITIS', (v) => `${v}%`],
  ['critDmg', 'DMG KRITIS', (v) => `×${v.toFixed(1)}`],
  ['moveSpd', 'GERAK', (v) => Math.round(v)],
  ['cdr', 'CDR', (v) => `${v}%`],
  ['magnet', 'MAGNET', (v) => Math.round(v)],
];

const TABS = [['run', 'MULAI RONDE'], ['gear', 'GEAR'], ['shop', 'TOKO']];

export function renderCamp(box, char, { onStart, onBack }) {
  let tab = 'run';
  box.replaceChildren();

  const p = portrait(char.classId, char.look, 6);
  p.classList.add('doll');
  const maxed = char.level >= CHAR_LEVEL_MAX;
  const need = expToNext(char.level);
  const bar = el('div', 'mini');
  const fill = el('i');
  fill.style.transform = `scaleX(${maxed ? 1 : char.exp / need})`;
  bar.append(fill);
  const info = el('div');
  info.append(
    el('div', 'nm', char.name),
    el('div', 'ds', `${CLASSES[char.classId].name} · LV ${char.level}`),
    bar,
    el('div', 'ds', maxed ? 'LEVEL MAKS' : `EXP ${char.exp} / ${need}`),
    el('div', 'ds', `UANG ${char.gold}`),
  );
  const head = el('div', 'camphead');
  head.append(p, info);

  const tabRow = el('div', 'tabs');
  const tabBtns = TABS.map(([id, label]) => {
    const b = button(label, 'chip', () => { tab = id; refresh(); });
    b.dataset.tab = id;
    return b;
  });
  tabRow.append(...tabBtns);

  const panel = el('div', 'panel');
  box.append(head, tabRow, panel, button('GANTI SLOT', 'btn ghost', onBack));

  function runTab() {
    const grid = el('div', 'statgrid');
    const s = finalStats(char);
    for (const [key, label, fmt] of STAT_ROWS) grid.append(el('span', null, label), el('b', null, String(fmt(s[key]))));
    const r = char.records;
    const rec = el('div', 'ds');
    rec.style.cssText = 'font-size:8px;color:var(--dim);line-height:2;margin:14px 0';
    rec.textContent = `REKOR ${fmtTime(r.bestTime)} · RONDE ${r.runs} · KILL ${r.kills} · BOS ${r.bossKills}`;
    const start = button('MULAI RONDE', 'btn', onStart);
    start.id = 'startrun';
    return [grid, rec, start];
  }

  function refresh() {
    tabBtns.forEach((b) => b.classList.toggle('sel', b.dataset.tab === tab));
    if (tab === 'run') panel.replaceChildren(...runTab());
    else panel.replaceChildren(el('div', 'soon', tab === 'gear' ? 'GEAR — SEGERA HADIR' : 'TOKO — SEGERA HADIR'));
  }
  refresh();
}
