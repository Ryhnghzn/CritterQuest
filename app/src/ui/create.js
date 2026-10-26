// Buat Karakter: name, hair style × colour, class, with a live paper-doll preview.
import { el, button } from './screens.js';
import { portrait, HAIR_NAMES, HAIR_COLOR_NAMES, HAIR_PALETTE } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';
import { NAME_MAX } from '../data/balance.js';
import { validateName } from '../meta/character.js';

// onCreate({ name, look, classId }) may reject (e.g. save failed); the error is shown.
export function renderCreate(box, { onCreate, onBack }) {
  const form = { hair: 0, hairColor: 0, classId: 'warrior' };
  box.replaceChildren();

  const preview = el('div');
  const name = el('input', 'name');
  name.id = 'charname';
  name.maxLength = NAME_MAX * 2; // UTF-16 units; the real limit is checked by validateName
  name.placeholder = 'NAMA';
  name.autocomplete = 'off';

  const hairRow = el('div', 'row');
  const hairBtns = HAIR_NAMES.map((n, i) => button(n.toUpperCase(), 'chip', () => set('hair', i)));
  hairRow.append(...hairBtns);

  const colorRow = el('div', 'row');
  const colorBtns = HAIR_PALETTE.map(([main], i) => {
    const b = button('', 'swatch', () => set('hairColor', i));
    b.style.background = main;
    b.title = HAIR_COLOR_NAMES[i];
    return b;
  });
  colorRow.append(...colorBtns);

  const classRow = el('div', 'row');
  const classCards = Object.values(CLASSES).map((c) => {
    const card = el('div', 'card');
    card.dataset.class = c.id;
    card.append(
      el('div', 'nm', c.name),
      el('div', 'ds', c.desc),
      el('div', 'ds', `HP ${c.stats.maxHp} · ATK ${c.stats.atk}`),
    );
    card.addEventListener('click', () => set('classId', c.id));
    return card;
  });
  classRow.append(...classCards);

  const err = el('div', 'err');
  const ok = button('BUAT', 'btn', submit);
  ok.id = 'createok';
  const actions = el('div', 'row');
  actions.append(button('BATAL', 'btn ghost', onBack), ok);

  box.append(
    el('h1', 'logo small', 'BUAT KARAKTER'), preview, name,
    el('div', 'label', 'RAMBUT'), hairRow, colorRow,
    el('div', 'label', 'KELAS'), classRow, err, actions,
  );

  function set(key, value) { form[key] = value; refresh(); }

  function refresh() {
    const p = portrait(form.classId, form, 6);
    p.classList.add('doll');
    preview.replaceChildren(p);
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
