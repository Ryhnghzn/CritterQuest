// Panel Karakter (C, in town and in the dungeon): portrait, level, attribute
// points (spec §14.1), stats and records.
import { branchOf } from '../meta/jobs.js';
import { el, button, svgIcon, stage, keepView } from './screens.js';
import { portrait, outfitOf } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';
import { CHAR_LEVEL_MAX, ATTRS } from '../data/balance.js';
import { POTION_IDS } from '../data/potions.js';
import { expToNext, finalStats, freePoints, allocate } from '../meta/character.js';
import { powerOf } from '../meta/power.js';
import { powerChip, powerDeltaChip } from './power.js';

const lastPower = new Map(); // slot → Power last shown: a change flashes with +/− (spec §47.6)
import { dollGear } from '../meta/gear.js';
import { renderGearTab } from './gear.js';
import { renderSkillTab } from './skilltab.js';
import { renderCollectionTab } from './collection.js';
import { renderQuestTab } from './journal.js';
import { renderStableList } from './stable.js';
import { DUNGEONS } from '../data/dungeons.js';
import { tr, t, num } from '../i18n.js';

let tab = 'status'; // 'status' | 'skill' | 'gear' | 'quest' | 'mount' | 'coll', kept between openings
export const setCharTab = (id) => { tab = id; };

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
// quest: { onTrack, onAbandon } for the Quest tab (town only)
// mount: { onSet(id, skin) } for the Mount tab (town only; without it the tab is view-only)
export function renderCharPanel(box, char, hp, { onClose, onAllocate, gear, skill, quest, mount }) {
  const pending = Object.fromEntries(ATTRS.map((a) => [a.id, 0]));
  const draw = () => drawPanel(box, char, hp, pending, {
    onClose, gear, skill, quest, mount, redraw: () => draw(),
    onAdd: (id) => { pending[id] += 1; draw(); },
    onCancel: () => { for (const k in pending) pending[k] = 0; draw(); },
    onSave: () => onAllocate({ ...pending }),
  });
  draw();
}

function drawPanel(box, char, hp, pending, opts) {
  keepView(box, `char:${tab}`, () => buildPanel(box, char, hp, pending, opts));
}

function buildPanel(box, char, hp, pending, { onClose, onAdd, onCancel, onSave, gear, skill, quest, mount, redraw }) {
  box.replaceChildren();
  const marked = Object.values(pending).reduce((a, b) => a + b, 0);
  const preview = (marked && allocate(char, pending, char.updatedAt)) || char;
  const free = freePoints(char) - marked;
  const color = outfitOf(char.classId)[0];
  const st = stage(portrait(char.classId, { ...char.look, gear: dollGear(char) }, 100), color);
  st.append(el('span', 'lvbadge', `LV ${char.level}`));
  const maxed = char.level >= CHAR_LEVEL_MAX;
  const need = expToNext(char.level);
  const meter = el('div', 'meter');
  const fill = el('i');
  fill.style.transform = `scaleX(${maxed ? 1 : char.exp / need})`;
  meter.append(fill);
  const br = branchOf(char), cls = el('span', 'pill', br ? `${CLASSES[char.classId].name} · ${br.name}` : CLASSES[char.classId].name); // Job Lanjutan (spec §43.10)
  if (br) cls.style.color = br.color;
  cls.style.setProperty('--c', color);
  const line = el('div', 'note');
  line.append(maxed ? tr('Level maks') : `EXP ${char.exp} / ${need}`, ' · ');
  line.append(el('span', 'gold', t('{n} koin', { n: char.gold })), ` · ${t('Ramuan {n}', { n: POTION_IDS.reduce((n, id) => n + char.potions[id], 0) })}`);
  const info = el('div', 'info');
  const top = el('div');
  top.append(cls);
  const pw = powerOf(preview), was = lastPower.get(char.slot);
  const chip = powerChip(pw, 'big');
  const pline = el('div', 'powerline');
  pline.append(chip);
  if (was !== undefined && was !== pw && !marked) { chip.classList.add('flash'); pline.append(powerDeltaChip(pw - was)); }
  if (!marked) lastPower.set(char.slot, pw);
  else if (pw !== powerOf(char)) { const d = powerDeltaChip(pw - powerOf(char)); d.classList.add('still'); pline.append(d); } // points marked: what they would add
  info.append(el('div', 'nm', char.name), top, pline, meter, line);
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
  for (const [id, label] of [['status', tr('Status')], ['skill', tr('Skill')], ['gear', t('Gear ({n})', { n: char.inventory.length })], ['quest', tr('Quest')], ['mount', tr('Mount')], ['coll', tr('Koleksi')]]) {
    const b = button(label, `tab${tab === id ? ' on' : ''}`, () => { tab = id; redraw(); });
    b.dataset.tab = id;
    tabs.append(b);
  }
  let body = el('div', 'cpbody');
  if (tab === 'gear') body.append(renderGearTab(char, gear, redraw));
  else if (tab === 'skill') body = renderSkillTab(char, skill, redraw);
  else if (tab === 'coll') body = renderCollectionTab(char);
  else if (tab === 'quest') body = renderQuestTab(char, quest);
  else if (tab === 'mount') body.append(renderStableList(char, { canChange: !!mount?.onSet, onSetMount: mount?.onSet })); // change only in town
  else body.append(attrs, panel);
  box.append(head, tabs, body, close);
}
