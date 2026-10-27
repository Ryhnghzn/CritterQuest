// Skill tab of the Karakter panel (spec §21): the class's 6 skills (locked ones
// show their level) with "Q" / "E" buttons, and the talents with [+] / Simpan.
// Changes only in town; in the dungeon the tab is read-only.
import { el, button } from './screens.js';
import { iconCanvas } from '../art/sprites.js';
import { CLASSES } from '../data/classes.js';
import { TALENTS } from '../data/talents.js';
import { freeTalents } from '../meta/talents.js';

const pending = {}; // talent id → ranks marked but not saved

// opts: { editable, onEquip(slot, id), onTalents(add) }
export function renderSkillTab(char, opts, redraw) {
  const wrap = el('div', 'cpbody');
  const skills = el('div', 'panel skills');
  skills.append(el('div', 'attrhead', 'Skill — pilih 2 untuk Q & E'));
  for (const s of CLASSES[char.classId].skills) {
    const locked = s.unlock > char.level, slot = char.skills.indexOf(s.id);
    const row = el('div', `skill${locked ? ' locked' : ''}${slot >= 0 ? ' worn' : ''}`);
    const ic = el('span', 'sic');
    ic.append(iconCanvas(s.icon || s.id, 30));
    const txt = el('div', 'stx');
    txt.append(el('b', null, s.name), el('span', null, s.desc), el('span', 'meta', `Energi ${s.cost} · jeda ${s.cd} dtk`));
    const act = el('div', 'skbtns');
    if (locked) act.append(el('span', 'lock', `LV ${s.unlock}`));
    else for (const [i, key] of [[0, 'Q'], [1, 'E']]) {
      const b = button(key, `btn small skkey${slot === i ? ' on' : ''}`, () => opts.onEquip(i, s.id));
      b.dataset.skill = `${s.id}-${key}`;
      b.disabled = !opts.editable || slot === i;
      act.append(b);
    }
    row.append(ic, txt, act);
    skills.append(row);
  }

  const marked = Object.values(pending).reduce((a, b) => a + b, 0);
  const free = freeTalents(char) - marked;
  const tal = el('div', 'panel attrs talents');
  const head = el('div', 'attrhead');
  head.append(el('b', null, 'Bakat'), el('span', free > 0 ? 'pts on' : 'pts', `${free} poin`));
  tal.append(head, el('span', 'note', '1 poin bakat tiap 2 level. Atur ulang di Pelatih.'));
  for (const t of TALENTS) {
    const have = char.talents[t.id], add = pending[t.id] || 0;
    const row = el('div', 'attr');
    const val = el('b', null, `${have}/${t.max}`);
    if (add) val.append(el('span', 'add', ` +${add}`));
    const plus = button('+', 'btn small plus', () => { pending[t.id] = add + 1; redraw(); });
    plus.disabled = !opts.editable || free <= 0 || have + add >= t.max;
    plus.dataset.talent = t.id;
    row.append(el('span', 'an', t.name), val, el('span', 'ad', t.desc), plus);
    tal.append(row);
  }
  if (marked) {
    const act = el('div', 'row');
    const save = button('Simpan', 'btn small', () => { const add = { ...pending }; for (const k in pending) delete pending[k]; opts.onTalents(add); });
    save.id = 'talent-save';
    act.append(save, button('Batal', 'btn ghost small', () => { for (const k in pending) delete pending[k]; redraw(); }));
    tal.append(act);
  }
  if (!opts.editable) tal.append(el('div', 'note', 'Ganti skill & bakat di kota.'));
  wrap.append(skills, tal);
  return wrap;
}
