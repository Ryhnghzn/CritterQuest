// Skill tab of the Karakter panel (spec §21, §22, §31.6): a row of slot cards (keys 1–4 + the
// ultimate on 5), the class's skill pool below it (locked ones show their level) and the
// talents with [+] / Simpan.
// Equipping is two taps — a slot and a skill, in either order. Skills change anywhere
// (town or mid-trip); talents only in town (opts.talentsEditable).
import { el, button } from './screens.js';
import { iconCanvas } from '../art/sprites.js';
import { CLASSES } from '../data/classes.js';
import { TALENTS } from '../data/talents.js';
import { freeTalents } from '../meta/talents.js';
import { tr, t, num } from '../i18n.js';

const pending = {}; // talent id → ranks marked but not saved
const picked = { slot: null, skill: null }; // first tap of the two-tap equip

// Applies the second tap; the first one only highlights.
function pick(opts, redraw, key, value) {
  if (picked[key] === value) { picked[key] = null; redraw(); return; } // same again = cancel
  picked[key] = value;
  if (picked.slot !== null && picked.skill !== null) {
    const { slot, skill } = picked;
    picked.slot = null; picked.skill = null;
    opts.onEquip(slot, skill);
    return;
  }
  redraw();
}

// opts: { editable, talentsEditable, onEquip(slot, id), onTalents(add) }
export function renderSkillTab(char, opts, redraw) {
  const wrap = el('div', 'cpbody');
  const skills = el('div', 'panel skills');
  const cls = CLASSES[char.classId];
  const ult = cls.ult, canEdit = !!opts.editable;
  const byId = (id) => cls.skills.find((s) => s.id === id);
  if (!canEdit) { picked.slot = null; picked.skill = null; }

  const slots = el('div', 'slots');
  for (let i = 0; i < 4; i++) {
    const s = char.skills[i] ? byId(char.skills[i]) : null;
    const card = button('', `skslot${s ? ' filled' : ' empty'}${picked.slot === i ? ' picked' : ''}`, () => pick(opts, redraw, 'slot', i));
    card.dataset.slot = String(i);
    card.disabled = !canEdit;
    card.setAttribute('aria-pressed', picked.slot === i ? 'true' : 'false');
    const ic = el('span', 'sic');
    if (s) ic.append(iconCanvas(s.icon || s.id, 30)); else ic.append(el('span', 'plus', '+'));
    card.append(ic, el('span', 'sname', s ? s.name : tr('Kosong')), el('span', 'snum', String(i + 1)));
    const cell = el('div', 'skcell');
    cell.append(card);
    if (s) {
      const off = button('×', 'skoff', (e) => { e.stopPropagation(); opts.onEquip(i, null); });
      off.title = tr('Lepas dari tombol');
      off.setAttribute('aria-label', tr('Lepas dari tombol'));
      off.dataset.skill = `${s.id}-off`;
      off.disabled = !canEdit || char.skills.filter(Boolean).length <= 1;
      cell.append(off);
    }
    slots.append(cell);
  }
  const ucard = el('div', `skslot ult${ult.unlock > char.level ? ' locked' : ' filled'}`);
  const uic = el('span', 'sic'); uic.append(iconCanvas(ult.icon, 30));
  ucard.append(uic, el('span', 'sname', ult.name), el('span', 'snum', ult.unlock > char.level ? `LV ${ult.unlock}` : '5'));
  ucard.title = `${ult.name} · Ultimate — ${ult.desc}`;
  slots.append(ucard);
  skills.append(slots, el('div', 'attrhead', tr('Skill (pasang maksimal 4, tombol 1–4)')));
  if (canEdit) skills.append(el('span', 'note', tr('Ketuk satu slot lalu satu skill untuk memasang.')));

  for (const s of cls.skills) {
    const locked = s.unlock > char.level, slot = char.skills.indexOf(s.id);
    const row = button('', `skill${locked ? ' locked' : ''}${slot >= 0 ? ' worn' : ''}${picked.skill === s.id ? ' picked' : ''}`, () => pick(opts, redraw, 'skill', s.id));
    row.dataset.skill = s.id;
    row.disabled = locked || !canEdit;
    row.setAttribute('aria-pressed', picked.skill === s.id ? 'true' : 'false');
    const ic = el('span', 'sic');
    ic.append(iconCanvas(s.icon || s.id, 30));
    const txt = el('span', 'stx');
    txt.append(el('b', null, s.name), el('span', null, s.desc), el('span', 'meta', t('Energi {e} · jeda {cd} dtk', { e: s.cost, cd: num(s.cd) })));
    const act = el('span', 'skbtns');
    if (locked) act.append(el('span', 'lock', `LV ${s.unlock}`));
    else if (slot >= 0) act.append(el('span', 'badgeno', String(slot + 1)));
    row.append(ic, txt, act);
    skills.append(row);
  }

  const marked = Object.values(pending).reduce((a, b) => a + b, 0);
  const free = freeTalents(char) - marked;
  const tal = el('div', 'panel attrs talents');
  const head = el('div', 'attrhead');
  head.append(el('b', null, tr('Bakat')), el('span', free > 0 ? 'pts on' : 'pts', t('{n} poin', { n: free })));
  tal.append(head, el('span', 'note', tr('1 poin bakat tiap 2 level. Atur ulang di Pelatih.')));
  for (const tl of TALENTS) {
    const have = char.talents[tl.id], add = pending[tl.id] || 0;
    const row = el('div', 'attr');
    const val = el('b', null, `${have}/${tl.max}`);
    if (add) val.append(el('span', 'add', ` +${add}`));
    const plus = button('+', 'btn small plus', () => { pending[tl.id] = add + 1; redraw(); });
    plus.disabled = !opts.talentsEditable || free <= 0 || have + add >= tl.max;
    plus.dataset.talent = tl.id;
    row.append(el('span', 'an', tl.name), val, el('span', 'ad', tl.desc), plus);
    tal.append(row);
  }
  if (marked) {
    const act = el('div', 'row');
    const save = button(tr('Simpan'), 'btn small', () => { const add = { ...pending }; for (const k in pending) delete pending[k]; opts.onTalents(add); });
    save.id = 'talent-save';
    act.append(save, button(tr('Batal'), 'btn ghost small', () => { for (const k in pending) delete pending[k]; redraw(); }));
    tal.append(act);
  }
  if (!opts.talentsEditable) tal.append(el('div', 'note', tr('Bakat hanya bisa diatur di kota.')));
  wrap.append(skills, tal);
  return wrap;
}
