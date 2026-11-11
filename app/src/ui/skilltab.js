// Skill tab of the Karakter panel (spec §43.2): the free skill points, the worn slots (keys 1–4) and
// the ultimate (key 5), then the job's tree in four tabs — Aktif · Ultimate · Pasif · Umum — each row
// with its level dots and a [+] that spends SP. Equipping is two taps (a slot and a skill, in either
// order) and works anywhere; SP are spent in town only (opts.treeEditable). Page B joins in part D.
import { el, button } from './screens.js';
import { iconCanvas } from '../art/sprites.js';
import { CLASSES } from '../data/classes.js';
import { wornIds, equippedUlt, spFree, nextCost, treeRows } from '../meta/jobs.js';
import { tr, t, num } from '../i18n.js';

const picked = { slot: null, skill: null }; // first tap of the two-tap equip
let tab = 'skill';
const TABS = [['skill', 'Aktif'], ['ult', 'Ultimate'], ['passive', 'Pasif'], ['umum', 'Umum']];

function pick(opts, redraw, key, value) {
  if (picked[key] === value) { picked[key] = null; redraw(); return; } // same again = cancel
  picked[key] = value;
  if (picked.slot !== null && picked.skill !== null) {
    const { slot, skill } = picked;
    picked.slot = null; picked.skill = null;
    opts.onEquip(0, slot, skill);
    return;
  }
  redraw();
}
const dots = (level, max) => el('span', 'lvdots', '●'.repeat(level) + '○'.repeat(Math.max(0, max - level)));

// opts: { editable, treeEditable, onEquip(page, slot, id), onRaise(id), onUlt(id) }
export function renderSkillTab(char, opts, redraw) {
  const wrap = el('div', 'cpbody');
  const skills = el('div', 'panel skills');
  const cls = CLASSES[char.classId], canEdit = !!opts.editable, canTree = !!opts.treeEditable;
  const byId = (id) => cls.skills.find((s) => s.id === id);
  const worn = wornIds(char, 0), ult = equippedUlt(char), free = spFree(char), rows = treeRows(char);
  if (!canEdit) { picked.slot = null; picked.skill = null; }

  const head = el('div', 'attrhead');
  head.append(el('b', null, tr('Poin Skill')), el('span', free > 0 ? 'pts on' : 'pts', t('{n} SP', { n: free })));
  skills.append(head, el('span', 'note', canTree ? tr('2 SP tiap naik level. Atur ulang di Pelatih.') : tr('SP hanya bisa dibagi di kota; skill tetap bisa dipasang.')));

  const slots = el('div', 'slots');
  for (let i = 0; i < 4; i++) {
    const s = worn[i] ? byId(worn[i]) : null;
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
      const off = button('×', 'skoff', (e) => { e.stopPropagation(); picked.slot = null; picked.skill = null; opts.onEquip(0, i, null); });
      off.title = tr('Lepas dari tombol'); off.setAttribute('aria-label', tr('Lepas dari tombol'));
      off.dataset.skill = `${s.id}-off`;
      off.disabled = !canEdit || worn.filter(Boolean).length <= 1;
      cell.append(off);
    }
    slots.append(cell);
  }
  const novice = !rows.ult.length; // a Pengembara: two fixed skills, no tree (spec §43.1)
  const uDef = ult || rows.ult[0]?.def;
  if (uDef) {
  const ucard = el('div', `skslot ult${ult ? ' filled' : ' locked'}`);
  const uic = el('span', 'sic'); uic.append(iconCanvas(uDef.icon, 30));
  ucard.append(uic, el('span', 'sname', ult ? ult.name : tr('Belum ada')), el('span', 'snum', '5'));
  ucard.title = ult ? `${ult.name} · Ultimate — ${ult.desc}` : tr('Pelajari ultimate di tab Ultimate, lalu pakai.');
  slots.append(ucard);
  }
  skills.append(slots);
  if (novice) {
    skills.append(el('div', 'note', tr('Pengembara memakai dua skill tetap. Pilih job di Pelatih mulai level 5; SP yang terkumpul siap dipakai saat itu.')));
    wrap.append(skills);
    return wrap;
  }
  if (canEdit) skills.append(el('span', 'note', tr('Ketuk satu slot lalu satu skill untuk memasang.')));

  const tabs = el('div', 'sktabs');
  for (const [id, label] of TABS) tabs.append(button(tr(label), `chip${tab === id ? ' on' : ''}`, () => { tab = id; redraw(); }));
  skills.append(tabs);

  for (const r of rows[tab]) {
    const d = r.def, locked = (d.unlock ?? 1) > char.level, cost = nextCost(char, r.id);
    const slot = r.kind === 'skill' ? worn.indexOf(r.id) : -1, learned = r.level > 0;
    const isSkill = r.kind === 'skill';
    const row = (isSkill ? button : (_, cls2) => el('div', cls2))('', `skill${locked ? ' locked' : ''}${slot >= 0 ? ' worn' : ''}${picked.skill === r.id ? ' picked' : ''}`, () => pick(opts, redraw, 'skill', r.id));
    row.dataset.skill = r.id;
    if (isSkill) { row.disabled = locked || !learned || !canEdit; row.setAttribute('aria-pressed', picked.skill === r.id ? 'true' : 'false'); }
    const ic = el('span', 'sic');
    ic.append(iconCanvas(d.icon || (isSkill ? d.id : r.kind === 'ult' ? d.icon : 'hst'), 30));
    const txt = el('span', 'stx');
    txt.append(el('b', null, d.name), dots(r.level, r.max), el('span', null, d.desc));
    if (isSkill) txt.append(el('span', 'meta', t('Energi {e} · jeda {cd} dtk', { e: d.cost, cd: num(d.cd) })));
    if (d.up) d.up.forEach((u, k) => txt.append(el('span', `lvup${r.level >= (k ? 5 : 3) ? ' on' : ''}`, `L${k ? 5 : 3} · ${u}`))); // spec §43.4
    const act = el('span', 'skbtns');
    if (locked) act.append(el('span', 'lock', `LV ${d.unlock}`));
    else {
      if (slot >= 0) act.append(el('span', 'badgeno', String(slot + 1)));
      if (r.kind === 'ult' && learned) {
        const use = button(ult?.id === r.id ? tr('Dipakai') : tr('Pakai'), 'btn small', (e) => { e.stopPropagation(); opts.onUlt(r.id); });
        use.disabled = ult?.id === r.id || !canEdit;
        act.append(use);
      }
      if (cost !== null) {
        const plus = button(`+ ${cost} SP`, 'btn small plus', (e) => { e.stopPropagation(); opts.onRaise(r.id); });
        plus.disabled = !canTree || cost > free;
        plus.dataset.raise = r.id;
        act.append(plus);
      }
    }
    row.append(ic, txt, act);
    skills.append(row);
  }
  wrap.append(skills);
  return wrap;
}
