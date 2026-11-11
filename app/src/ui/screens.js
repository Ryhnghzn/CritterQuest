// Screen manager + small DOM helpers shared by the menu screens.
import { tr } from '../i18n.js';
const $ = (id) => document.getElementById(id);
const SCREENS = ['title', 'slots', 'create', 'npc', 'charpanel', 'pause', 'results', 'ending', 'fieldmap'];

// Shows one screen (null = none, during play) and returns its id.
export function showScreen(id) {
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  return id;
}

// A card that is clicked as a whole: reachable with Tab and pressed with Enter/Space (not when a button inside has focus).
export function pressable(node, onPress) {
  node.tabIndex = 0;
  node.setAttribute('role', 'button');
  node.addEventListener('click', onPress);
  node.addEventListener('keydown', (e) => {
    if (e.target !== node || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    e.stopPropagation();
    onPress(e);
  });
  return node;
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

// Redraws a screen in place: when the same view (key) is already showing, scroll
// positions survive and entry animations stay still (class "still"), so a tap
// on a button does not look like the whole screen was reset.
export function keepView(box, key, build) {
  const same = box.dataset.view === key && !box.classList.contains('hidden');
  const saved = same ? scrollSpots(box) : null;
  build();
  box.dataset.view = key;
  box.classList.toggle('still', same);
  if (saved) for (const [e, top] of scrollSpots(box, saved)) e.scrollTop = top;
}

// [element, scrollTop] of every scrolled element; with `from`, the elements of this tree
// that sit where the scrolled ones of an earlier tree did (same tag, class and order).
function scrollSpots(root, from = null) {
  const seen = new Map(), out = [];
  for (const e of [root, ...root.querySelectorAll('*')]) {
    const k = e === root ? 'root' : `${e.tagName}.${e.className}`, i = seen.get(k) || 0;
    seen.set(k, i + 1);
    if (from) { const hit = from.find((f) => f.k === k && f.i === i); if (hit) out.push([e, hit.top]); }
    else if (e.scrollTop > 0) out.push({ k, i, top: e.scrollTop });
  }
  return out;
}

// In-game yes/no dialog → Promise<boolean>.
// noLabel: the second button's text for a two-way choice (Job Lanjutan's branches), else "Batal"
export function confirmDialog(text, yesLabel = 'YA', noLabel = null) {
  const box = $('confirm'), no = $('confirmno'), noText = no.textContent;
  $('confirmtext').textContent = tr(text);
  $('confirmyes').textContent = tr(yesLabel);
  if (noLabel) no.textContent = noLabel;
  box.classList.remove('hidden');
  return new Promise((resolve) => {
    const done = (v) => () => {
      box.classList.add('hidden');
      if (noLabel) no.textContent = noText;
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
