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

// Inline icon from the <symbol> sprite in index.html.
export function svgIcon(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'i');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${id}`);
  svg.append(use);
  return svg;
}

// Round coloured backdrop with a character portrait (class colour via --c).
export function stage(canvas, color) {
  const s = el('div', 'stage');
  s.style.setProperty('--c', color);
  s.append(canvas);
  return s;
}
