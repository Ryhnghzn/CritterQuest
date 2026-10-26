// Buat Karakter: name, hair style × colour, class, with a live paper-doll preview.
import { el, button, stage } from './screens.js';
import { portrait, OUTFIT, HAIR_NAMES, HAIR_COLOR_NAMES, HAIR_PALETTE } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';
import { NAME_MAX } from '../data/balance.js';
import { validateName } from '../meta/character.js';

// onCreate({ name, look, classId }) may reject (e.g. save failed); the error is shown.
export function renderCreate(box, { onCreate, onBack }) {
  const form = { hair: 0, hairColor: 0, classId: 'warrior' };
  box.replaceChildren();

  const preview = el('div', 'preview');
  const className = el('span', 'pill');

  const name = el('input', 'name');
  name.id = 'charname';
  name.maxLength = NAME_MAX * 2; // UTF-16 units; the real limit is checked by validateName
  name.placeholder = 'Nama petualang';
  name.autocomplete = 'off';

  const hairRow = el('div', 'row');
  const hairBtns = HAIR_NAMES.map((n, i) => button(n, 'chip', () => set('hair', i)));
  hairRow.append(...hairBtns);

  const colorRow = el('div', 'row');
  const colorBtns = HAIR_PALETTE.map(([main], i) => {
    const b = button('', 'swatch', () => set('hairColor', i));
    b.style.background = main;
    b.title = HAIR_COLOR_NAMES[i];
    b.setAttribute('aria-label', HAIR_COLOR_NAMES[i]);
    return b;
  });
  colorRow.append(...colorBtns);

  const classGrid = el('div', 'classgrid');
  const classCards = Object.values(CLASSES).map((c) => {
    const card = el('div', 'card classcard');
    card.dataset.class = c.id;
    card.style.setProperty('--c', OUTFIT[c.id][0]);
    const top = el('div', 'top');
    top.append(el('span', 'dotc'), el('span', 'nm', c.name));
    card.append(top, el('div', 'ds', c.desc), el('div', 'st', `HP ${c.stats.maxHp} · ATK ${c.stats.atk} · Kritis ${c.stats.crit}%`));
    card.addEventListener('click', () => set('classId', c.id));
    return card;
  });
  classGrid.append(...classCards);

  const field = (label, ...kids) => {
    const f = el('div', 'field');
    f.append(el('div', 'label', label), ...kids);
    return f;
  };

  const err = el('div', 'err');
  const ok = button('Buat Petualang', 'btn', submit);
  ok.id = 'createok';
  const actions = el('div', 'row');
  actions.append(button('Batal', 'btn ghost', onBack), ok);

  const formCol = el('div', 'formcol');
  formCol.append(field('Nama', name), field('Rambut', hairRow, colorRow), field('Kelas', classGrid));
  const grid = el('div', 'create-grid');
  grid.append(preview, formCol);
  box.append(el('h2', 'h', 'Buat Petualang'), grid, err, actions);

  function set(key, value) { form[key] = value; refresh(); }

  function refresh() {
    const color = OUTFIT[form.classId][0];
    className.textContent = CLASSES[form.classId].name;
    className.style.setProperty('--c', color);
    preview.replaceChildren(stage(portrait(form.classId, form, 172), color), className);
    hairBtns.forEach((b, i) => b.classList.toggle('sel', i === form.hair));
    colorBtns.forEach((b, i) => b.classList.toggle('sel', i === form.hairColor));
    classCards.forEach((c) => c.classList.toggle('sel', c.dataset.class === form.classId));
  }

  async function submit() {
    const n = validateName(name.value);
    if (!n) { err.textContent = `Nama harus 1–${NAME_MAX} karakter.`; name.focus(); return; }
    err.textContent = '';
    ok.disabled = true;
    try {
      await onCreate({ name: n, look: { hair: form.hair, hairColor: form.hairColor }, classId: form.classId });
    } catch (e) {
      err.textContent = `Gagal menyimpan: ${e.message}`;
      ok.disabled = false;
    }
  }

  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  refresh();
}
