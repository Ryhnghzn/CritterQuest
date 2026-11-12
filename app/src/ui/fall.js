// Falling (owner 2026-11-12): before the death dialog, the frozen world drains to grey, TUMBANG
// slams in letter by letter with a crack under it, the cause fades in, then all goes to black and
// the dialog follows on black. A tap or key after the first second hurries it on. Resolves when
// the dialog may show.
import { tr } from '../i18n.js';

const CALM = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const LEN = 3000, SKIP_AFTER = 1000;

export function playFall(cause = '') {
  return new Promise((done) => {
    const box = document.createElement('div');
    box.id = 'fall';
    const word = document.createElement('div'); word.className = 'fword';
    [...tr('Tumbang')].forEach((ch, i) => { const s = document.createElement('span'); s.textContent = ch; s.style.setProperty('--i', i); word.append(s); });
    const crack = document.createElement('i'); crack.className = 'fcrack';
    const why = document.createElement('div'); why.className = 'fcause'; why.textContent = cause;
    box.append(word, crack, why);
    document.body.append(box);
    document.body.classList.add('falling');
    const t0 = performance.now();
    let ended = false;
    const end = () => {
      if (ended) return; ended = true;
      removeEventListener('pointerdown', skip, true); removeEventListener('keydown', skip, true);
      box.classList.add('black');
      setTimeout(() => { box.remove(); done(); }, 450);
    };
    const skip = (e) => { if (performance.now() - t0 < SKIP_AFTER) return; e.preventDefault?.(); e.stopPropagation?.(); end(); };
    addEventListener('pointerdown', skip, true); addEventListener('keydown', skip, true);
    setTimeout(end, CALM.matches ? 1200 : LEN);
  });
}

// the world's colour comes back once the next screen is up
export function clearFall() { document.body.classList.remove('falling'); }
