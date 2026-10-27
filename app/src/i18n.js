// Two languages (spec §23): Indonesian is the source text written in the code;
// English comes from dictionaries keyed by that Indonesian text. A missing
// entry simply shows the Indonesian text. Pure — no DOM except applyDom().
//   tr('Masuk Dungeon')            → 'Enter Dungeon'
//   t('Lantai {n}', { n: 3 })       → 'Floor 3'   (placeholders {name})
//   num(4.5)                        → '4.5' in English, '4,5' in Indonesian
import UI from './i18n/en-ui.js';
import GAME from './i18n/en-game.js';
import DATA from './i18n/en-data.js';

export const LANGS = ['en', 'id'];
export const LANG_NAMES = { en: 'English', id: 'Bahasa Indonesia' };
const EN = { ...DATA, ...GAME, ...UI };

// Indonesian until main.js applies the saved setting (tests stay in Indonesian).
let lang = 'id';
export const getLang = () => lang;
export function setLang(l) { if (LANGS.includes(l)) lang = l; }

export function tr(s) {
  if (lang !== 'en' || typeof s !== 'string') return s;
  return EN[s] ?? s;
}

export function t(tpl, vars = {}) {
  return tr(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

// decimal separator per language
export function num(v) {
  const s = String(v);
  return lang === 'en' ? s : s.replace('.', ',');
}

// Static HTML: elements marked data-tr get their (Indonesian) text translated;
// data-tr-title / data-tr-label translate the title / aria-label attributes.
export function applyDom(root = document) {
  for (const el of root.querySelectorAll('[data-tr]')) {
    el.dataset.src ??= el.innerHTML;
    el.innerHTML = tr(el.dataset.src);
  }
  for (const el of root.querySelectorAll('[data-tr-title]')) el.title = tr(el.dataset.trTitle);
  for (const el of root.querySelectorAll('[data-tr-label]')) el.setAttribute('aria-label', tr(el.dataset.trLabel));
}
