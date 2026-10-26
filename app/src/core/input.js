// Keyboard + touch input. Movement is a normalized direction vector.
// Touch: dragging anywhere on screen acts as a floating joystick.
export const input = { x: 0, y: 0, keys: new Set(), joy: null };

const KEYMAP = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return; // typing a name, not playing
  if (KEYMAP[e.code]) { input.keys.add(e.code); e.preventDefault(); }
  if (e.code === 'Space') e.preventDefault();
  for (const cb of input.onAction) cb(e.code);
});
addEventListener('keyup', (e) => input.keys.delete(e.code));
addEventListener('blur', () => input.keys.clear());

input.onAction = []; // code => void ; used for Esc/M/Space/1-3 etc.

addEventListener('touchstart', (e) => {
  if (e.target.closest('.screen, .modal, #mute')) return;
  const t = e.changedTouches[0];
  input.joy = { id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 };
  e.preventDefault();
}, { passive: false });

addEventListener('touchmove', (e) => {
  if (!input.joy) return;
  for (const t of e.changedTouches) {
    if (t.identifier !== input.joy.id) continue;
    input.joy.dx = t.clientX - input.joy.ox;
    input.joy.dy = t.clientY - input.joy.oy;
  }
  e.preventDefault();
}, { passive: false });

function endTouch(e) {
  if (!input.joy) return;
  for (const t of e.changedTouches) if (t.identifier === input.joy.id) input.joy = null;
}
addEventListener('touchend', endTouch);
addEventListener('touchcancel', endTouch);

// Recompute the movement vector once per frame from held keys + joystick.
export function pollMove() {
  let x = 0, y = 0;
  for (const code of input.keys) {
    const d = KEYMAP[code];
    if (d) { x += d[0]; y += d[1]; }
  }
  if (input.joy) {
    const m = Math.hypot(input.joy.dx, input.joy.dy);
    if (m > 8) { x += input.joy.dx / m; y += input.joy.dy / m; }
  }
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  input.x = x; input.y = y;
}
