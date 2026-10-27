// Panel Karakter (C, in town and in the dungeon): portrait, level, attribute
// points (spec §14.1), stats and records.
import { el, button, svgIcon, stage } from './screens.js';
import { portrait, OUTFIT } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';
import { CHAR_LEVEL_MAX, ATTRS } from '../data/balance.js';
import { POTION_IDS } from '../data/potions.js';
import { expToNext, finalStats, freePoints, allocate } from '../meta/character.js';
import { dollGear } from '../meta/gear.js';
import { renderGearTab } from './gear.js';
import { renderSkillTab } from './skilltab.js';
import { renderCollectionTab } from './collection.js';
import { DUNGEONS } from '../data/dungeons.js';
import { tr, t, num } from '../i18n.js';

let tab = 'status'; // 'status' | 'skill' | 'gear' | 'coll', kept between openings

const STAT_ROWS = [
  ['maxHp', 'HP maks', (v) => Math.round(v)],
  ['atk', 'ATK', (v) => Math.round(v)],
  ['def', 'DEF', (v) => num(Math.round(v * 10) / 10)],
  ['atkSpd', 'Kec. serang', (v) => `×${v.toFixed(2)}`],
  ['crit', 'Kritis', (v) => `${num(+v.toFixed(1))}%`],
  ['critDmg', 'Dmg kritis', (v) => `×${v.toFixed(2)}`],
  ['moveSpd', 'Gerak', (v) => Math.round(v)],
  ['cdr', 'CDR', (v) => `${num(+v.toFixed(1))}%`],
  ['magnet', 'Magnet', (v) => Math.round(v)],
];

// hp: current HP (live, not yet saved); onAllocate(add): spend points (add = { str: n, … }).
// Points are only marked with [+] until Simpan, so a stray tap costs nothing.
// gear: options for the Gear tab (ui/gear.js).
export function renderCharPanel(box, char, hp, { onClose, onAllocate, gear, skill }) {
  const pending = Object.fromEntries(ATTRS.map((a) => [a.id, 0]));
  const draw = () => drawPanel(box, char, hp, pending, {
    onClose, gear, skill, redraw: () => draw(),
    onAdd: (id) => { pending[id] += 1; draw(); },
    onCancel: () => { for (const k in pending) pending[k] = 0; draw(); },
    onSave: () => onAllocate({ ...pending }),
  });
  draw();
}

function drawPanel(box, char, hp, pending, { onClose, onAdd, onCancel, onSave, gear, skill, redraw }) {
  box.replaceChildren();
  const marked = Object.values(pending).reduce((a, b) => a + b, 0);
  const preview = (marked && allocate(char, pending, char.updatedAt)) || char;
  const free = freePoints(char) - marked;
  const color = OUTFIT[char.classId][0];
  const st = stage(portrait(char.classId, { ...char.look, gear: dollGear(char) }, 100), color);
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
  line.append(maxed ? tr('Level maks') : `EXP ${char.exp} / ${need}`, ' · ');
  line.append(el('span', 'gold', t('{n} koin', { n: char.gold })), ` · ${t('Ramuan {n}', { n: POTION_IDS.reduce((n, id) => n + char.potions[id], 0) })}`);
  const info = el('div', 'info');
  const top = el('div');
  top.append(cls);
  info.append(el('div', 'nm', char.name), top, meter, line);
  const head = el('div', 'camphead');
  head.append(st, info);

  const attrs = el('div', 'panel attrs');
  const attrHead = el('div', 'attrhead');
  attrHead.append(el('b', null, tr('Atribut')), el('span', free > 0 ? 'pts on' : 'pts', t('{n} poin', { n: free })));
  attrs.append(attrHead);
  for (const a of ATTRS) {
    const row = el('div', 'attr');
    const val = el('b', null, String(char.attrs[a.id]));
    if (pending[a.id]) val.append(el('span', 'add', ` +${pending[a.id]}`));
    const plus = button('+', 'btn small plus', () => onAdd(a.id));
    plus.disabled = free <= 0;
    plus.dataset.attr = a.id;
    plus.setAttribute('aria-label', t('Tambah {a}', { a: a.name }));
    row.append(el('span', 'an', a.name), val, el('span', 'ad', a.desc), plus);
    attrs.append(row);
  }
  if (marked) {
    const act = el('div', 'row');
    const save = button(tr('Simpan'), 'btn small', onSave);
    save.id = 'attr-save';
    act.append(save, button(tr('Batal'), 'btn ghost small', onCancel));
    attrs.append(act);
  }

  const s = finalStats(preview);
  const base = finalStats(char);
  const grid = el('div', 'statgrid');
  const hpCell = el('div', 'stat');
  hpCell.append(el('span', null, 'HP'), el('b', null, `${Math.ceil(hp)}`));
  grid.append(hpCell);
  for (const [key, label, fmt] of STAT_ROWS) {
    const cell = el('div', 'stat');
    const v = el('b', s[key] > base[key] + 1e-9 ? 'up' : null, String(fmt(s[key])));
    cell.append(el('span', null, tr(label)), v);
    grid.append(cell);
  }
  const r = char.records;
  const rec = el('div', 'records');
  const reached = DUNGEONS.filter((d) => r.dungeons[d.id].bestFloor > 0)
    .map((d) => ['trophy', `${d.short} ${r.dungeons[d.id].bestFloor}/5${r.dungeons[d.id].clears ? ` · ${t('tamat {n}×', { n: r.dungeons[d.id].clears })}` : ''}`]);
  for (const [icon, text] of [...reached, ['clock', t('{n} perjalanan', { n: r.trips })], ['skull', t('{n} kill', { n: r.kills })], ['skull', t('{n} bos', { n: r.bossKills })]]) {
    const chip = el('span', 'hchip');
    chip.append(svgIcon(icon), text);
    rec.append(chip);
  }
  const panel = el('div', 'panel');
  panel.append(grid, rec);
  const close = button(tr('Tutup'), 'btn ghost', onClose);
  close.id = 'char-close';
  const tabs = el('div', 'tabs');
  for (const [id, label] of [['status', tr('Status')], ['skill', tr('Skill')], ['gear', t('Gear ({n})', { n: char.inventory.length })], ['coll', tr('Koleksi')]]) {
    const b = button(label, `tab${tab === id ? ' on' : ''}`, () => { tab = id; redraw(); });
    b.dataset.tab = id;
    tabs.append(b);
  }
  let body = el('div', 'cpbody');
  if (tab === 'gear') body.append(renderGearTab(char, gear, redraw));
  else if (tab === 'skill') body = renderSkillTab(char, skill, redraw);
  else if (tab === 'coll') body = renderCollectionTab(char);
  else body.append(attrs, panel);
  box.append(head, tabs, body, close);
}
