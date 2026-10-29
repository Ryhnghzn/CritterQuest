// Title screen "Api Unggun" (spec §29): the four classes around the campfire (backdrop:
// art/titlebg.js), the logo, and the menu on the left — Lanjutkan with the last hero
// played, Pilih Petualang, Pengaturan, and the language.
import { el, button } from './screens.js';
import { portrait } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';
import { TOWNS } from '../data/world.js';
import { tr, t } from '../i18n.js';

const MYTH = { tier: 6, rarity: 5 }, LEG = { tier: 5, rarity: 4 }, EPIC = { tier: 4, rarity: 3 };
// who sits where around the fire: [class, look, left %, bottom %, height (vh), facing left]
const SEATS = [
  ['warrior', { hair: 1, hairColor: 2, gear: { weapon: MYTH, helm: LEG, armor: MYTH, boots: LEG } }, 43, 6, 30, false],
  ['archer', { hair: 3, hairColor: 4, gear: { weapon: LEG, armor: EPIC, boots: EPIC } }, 51, 15, 23, false],
  ['mage', { hair: 2, hairColor: 6, gear: { weapon: LEG, helm: EPIC, armor: LEG } }, 69, 15, 23, true],
  ['assassin', { hair: 0, hairColor: 0, gear: { weapon: EPIC, armor: EPIC, boots: LEG } }, 78, 6, 30, true],
];

// last: the save of the hero played last (null: none yet); lang: 'en' | 'id'
export function renderTitle(box, { last, lang, onContinue, onSlots, onSettings, onLang }) {
  box.replaceChildren();
  const seats = el('div', 'tseats');
  for (const [cls, look, x, y, vh, flip] of SEATS) {
    const s = el('div', `tseat${flip ? ' flip' : ''}`);
    s.style.left = `${x}%`; s.style.bottom = `${y}%`; s.style.setProperty('--h', `${vh}vh`);
    s.append(portrait(cls, look, 220));
    seats.append(s);
  }
  const logo = el('div', 'tlogo');
  logo.append(el('h1', 'logo', 'Critter Quest'), el('span', 'tag', tr('Gerhana di Ujung Dunia')));
  const menu = el('div', 'tmenu');
  if (last) {
    const c = button('', 'tcont', onContinue);
    c.id = 'continue';
    const txt = el('div', 'ct');
    txt.append(el('small', null, tr('Lanjutkan')), el('b', null, last.name),
      el('span', null, `${CLASSES[last.classId].name} · LV ${last.level} · ${TOWNS[last.location]?.name ?? ''}`));
    c.append(portrait(last.classId, last.look, 64), txt);
    menu.append(c);
  }
  const play = button(tr('Pilih Petualang'), last ? 'btn' : 'btn big', onSlots);
  play.id = 'play';
  const settings = button(tr('Pengaturan'), 'btn ghost', onSettings);
  settings.id = 'titlesettings';
  const langs = el('div', 'tlang');
  for (const [id, label] of [['en', 'English'], ['id', 'Indonesia']]) {
    const b = button(label, `btn ghost small${lang === id ? ' on' : ''}`, () => { if (lang !== id) onLang(id); });
    b.dataset.lang = id;
    langs.append(b);
  }
  menu.append(play, settings, langs);
  const foot = el('div', 'tfoot', last ? t('Enter — lanjutkan sebagai {name}', { name: last.name }) : tr('Enter — pilih petualang'));
  box.append(seats, logo, menu, foot);
}
