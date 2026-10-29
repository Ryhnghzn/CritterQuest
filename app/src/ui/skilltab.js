// Skill tab of the Karakter panel (spec §21, §22): the ultimate (key 5), the
// class's 6 skills (locked ones show their level) with slot buttons 1–4, and the
// talents with [+] / Simpan.
// Changes only in town; in the dungeon the tab is read-only.
import { el, button } from './screens.js';
import { iconCanvas } from '../art/sprites.js';
import { CLASSES } from '../data/classes.js';
import { TALENTS } from '../data/talents.js';
import { freeTalents } from '../meta/talents.js';
import { tr, t, num } from '../i18n.js';

const pending = {}; // talent id → ranks marked but not saved

// opts: { editable, onEquip(slot, id), onTalents(add) }
export function renderSkillTab(char, opts, redraw) {
  const wrap = el('div', 'cpbody');
  const skills = el('div', 'panel skills');
  const ult = CLASSES[char.classId].ult;
  const urow = el('div', `skill ult${ult.unlock > char.level ? ' locked' : ' worn'}`);
  const uic = el('span', 'sic'); uic.append(iconCanvas(ult.icon, 30));
  const utx = el('div', 'stx');
  utx.append(el('b', null, `${ult.name} · Ultimate`), el('span', null, ult.desc), el('span', 'meta', tr('Tombol 5 · bar terisi dari kill & damage diterima')));
  const ubox = el('div', 'skbtns');
  ubox.append(el('span', 'lock', ult.unlock > char.level ? `LV ${ult.unlock}` : '5'));
  urow.append(uic, utx, ubox);
  skills.append(urow, el('div', 'attrhead', tr('Skill (pasang maksimal 4, tombol 1–4)')));
  for (const s of CLASSES[char.classId].skills) {
    const locked = s.unlock > char.level, slot = char.skills.indexOf(s.id);
    const row = el('div', `skill${locked ? ' locked' : ''}${slot >= 0 ? ' worn' : ''}`);
    const ic = el('span', 'sic');
    ic.append(iconCanvas(s.icon || s.id, 30));
    const txt = el('div', 'stx');
    txt.append(el('b', null, s.name), el('span', null, s.desc), el('span', 'meta', t('Energi {e} · jeda {cd} dtk', { e: s.cost, cd: num(s.cd) })));
    const act = el('div', 'skbtns');
    if (locked) act.append(el('span', 'lock', `LV ${s.unlock}`));
    else {
      for (let i = 0; i < 4; i++) {
        const b = button(String(i + 1), `btn small skkey${slot === i ? ' on' : ''}`, () => opts.onEquip(i, s.id));
        b.dataset.skill = `${s.id}-${i + 1}`;
        b.disabled = !opts.editable || slot === i;
        act.append(b);
      }
      if (slot >= 0 && opts.editable) {
        const off = button('×', 'btn ghost small skkey', () => opts.onEquip(slot, null));
        off.title = tr('Lepas dari tombol');
        off.dataset.skill = `${s.id}-off`;
        act.append(off);
      }
    }
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
    plus.disabled = !opts.editable || free <= 0 || have + add >= tl.max;
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
  if (!opts.editable) tal.append(el('div', 'note', tr('Ganti skill & bakat di kota.')));
  wrap.append(skills, tal);
  return wrap;
}
