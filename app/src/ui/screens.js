// Screen manager + small DOM helpers shared by the menu screens.
const $ = (id) => document.getElementById(id);
const SCREENS = ['title', 'slots', 'create', 'camp', 'levelup', 'pause', 'results'];

// Shows one screen (null = none, during play) and returns its id.
export function showScreen(id) {
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  return id;
}

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function button(label, cls, onClick) {
  const b = el('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

export function fmtTime(t) { t = Math.floor(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; }

// In-game yes/no dialog → Promise<boolean>.
export function confirmDialog(text, yesLabel = 'YA') {
  const box = $('confirm');
  $('confirmtext').textContent = text;
  $('confirmyes').textContent = yesLabel;
  box.classList.remove('hidden');
  return new Promise((resolve) => {
    const done = (v) => () => {
      box.classList.add('hidden');
      $('confirmyes').onclick = $('confirmno').onclick = null;
      resolve(v);
    };
    $('confirmyes').onclick = done(true);
    $('confirmno').onclick = done(false);
  });
}
