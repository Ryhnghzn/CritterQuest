// Panel Karakter (C in town): portrait, level, stats and records — replaces the camp screen.
import { el, button, svgIcon, stage } from './screens.js';
import { portrait, OUTFIT } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';
import { CHAR_LEVEL_MAX } from '../data/balance.js';
import { POTION } from '../data/dungeon.js';
import { expToNext, finalStats } from '../meta/character.js';

const STAT_ROWS = [
  ['maxHp', 'HP maks', (v) => Math.round(v)],
  ['atk', 'ATK', (v) => Math.round(v)],
  ['def', 'DEF', (v) => Math.round(v)],
  ['atkSpd', 'Kec. serang', (v) => `×${v.toFixed(2)}`],
  ['crit', 'Kritis', (v) => `${v}%`],
  ['critDmg', 'Dmg kritis', (v) => `×${v.toFixed(1)}`],
  ['moveSpd', 'Gerak', (v) => Math.round(v)],
  ['cdr', 'CDR', (v) => `${v}%`],
  ['magnet', 'Magnet', (v) => Math.round(v)],
];

// hp: current HP in town (live, not yet saved)
export function renderCharPanel(box, char, hp, { onClose }) {
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
  line.append(el('span', 'gold', `${char.gold} koin`), ` · Ramuan ${char.potions}/${POTION.max}`);
  const info = el('div', 'info');
  const top = el('div');
  top.append(cls);
  info.append(el('div', 'nm', char.name), top, meter, line);
  const head = el('div', 'camphead');
  head.append(st, info);

  const s = finalStats(char);
  const grid = el('div', 'statgrid');
  const hpCell = el('div', 'stat');
  hpCell.append(el('span', null, 'HP'), el('b', null, `${Math.ceil(hp)}`));
  grid.append(hpCell);
  for (const [key, label, fmt] of STAT_ROWS) {
    const cell = el('div', 'stat');
    cell.append(el('span', null, label), el('b', null, String(fmt(s[key]))));
    grid.append(cell);
  }
  const r = char.records;
  const rec = el('div', 'records');
  for (const [icon, text] of [['trophy', `Lantai terdalam ${r.bestFloor}`], ['trophy', `${r.clears}× tamat`], ['clock', `${r.trips} perjalanan`], ['skull', `${r.kills} kill`], ['skull', `${r.bossKills} bos`]]) {
    const chip = el('span', 'hchip');
    chip.append(svgIcon(icon), text);
    rec.append(chip);
  }
  const panel = el('div', 'panel');
  panel.append(grid, rec);
  const close = button('Tutup', 'btn ghost', onClose);
  close.id = 'char-close';
  box.append(head, panel, close);
}
