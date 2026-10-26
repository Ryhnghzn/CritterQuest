// Touch controls (spec §5.1): body.touch switches the HUD to thumb-sized buttons,
// action buttons queue their action on press, and the joystick ring follows the
// stick that core/input.js tracks on the left half of the screen.
import { input, JOY_RADIUS } from '../core/input.js';

const $ = (id) => document.getElementById(id);

export function setupTouch() {
  const sync = () => document.body.classList.toggle('touch', input.touch);
  input.onTouchMode.push(sync);
  sync();
  // hold buttons (attack): active while a finger stays on them
  for (const b of document.querySelectorAll('.act[data-hold]')) {
    const set = (v) => (e) => { e.preventDefault(); input[b.dataset.hold] = v; };
    b.addEventListener('pointerdown', (e) => { b.setPointerCapture?.(e.pointerId); set(true)(e); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, set(false));
  }
  for (const b of document.querySelectorAll('.act[data-action]')) {
    // pointerdown, not click: a thumb resting on the button should react at once
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input.pressed.add(b.dataset.action);
    });
  }
}

export function updateJoystick(playing) {
  const el = $('joy');
  const j = input.joy;
  if (!playing || !j) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.style.left = `${j.ox}px`;
  el.style.top = `${j.oy}px`;
  const m = Math.hypot(j.dx, j.dy) || 1;
  const k = Math.min(1, JOY_RADIUS / m);
  el.firstElementChild.style.transform = `translate(${j.dx * k}px, ${j.dy * k}px)`;
}
