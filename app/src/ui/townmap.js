// The town map legend (spec §30): the quests waiting in town, then every shop and service.
// Tapping a row rings that place on the map (onFocus receives the place / person id).
import { el } from './screens.js';
import { iconCanvas } from '../art/sprites.js';
import { tr, t } from '../i18n.js';

// legend: town/townmap.js townLegend()
export function renderTownLegend(box, legend, onFocus) {
  box.replaceChildren();
  const col = (title) => { const c = el('div', 'tmcol'); c.append(el('div', 'label', tr(title))); box.append(c); return c; };
  const row = (c, icon, main, sub, id) => {
    const r = el('button', 'tmrow'); r.type = 'button';
    const txt = el('span', 'tmtxt'); txt.append(el('b', null, main), el('small', null, sub));
    r.append(icon, txt);
    r.addEventListener('click', () => onFocus(id));
    c.append(r);
  };
  const where = (x) => (x.where ? t('{who} · {where}', { who: x.who, where: tr(x.where) }) : x.who);

  const qc = col('Quest di kota ini');
  if (!legend.quests.length) qc.append(el('div', 'note', tr('Tidak ada quest di kota ini sekarang.')));
  for (const q of legend.quests) row(qc, el('span', `tmmark${q.mark === '?' ? ' step' : ''}`, q.mark), tr(q.title), where(q), q.id);

  const sc = col('Toko & layanan');
  for (const s of legend.shops) row(sc, iconCanvas(s.icon, 26), s.where ? tr(s.where) : s.who, s.where ? `${tr(s.text)} · ${s.who}` : tr(s.text), s.id);
}
