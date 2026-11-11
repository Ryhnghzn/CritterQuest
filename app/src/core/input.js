// Keyboard, mouse and touch input (spec §5.1).
// - Movement: WASD / arrows, or a floating joystick on the left half of the screen.
// - Aim: mouse position (PC); touch play uses auto-aim in the run.
// - One-shot actions (dodge, …) are queued and consumed once per fixed step.
export const input = {
  x: 0, y: 0,                       // movement vector, length ≤ 1
  keys: new Set(),
  joy: null,                        // { id, ox, oy, dx, dy } while the stick is held
  mouse: { x: 0, y: 0, active: false, down: false },
  attackHeld: false,                // touch attack button held
  touch: matchMedia('(pointer: coarse)').matches, // touch controls in use
  pressed: new Set(),               // queued one-shot actions
  held: new Set(),                  // actions whose key / button is down right now (tempo skills, spec §43.7)
  onAction: [],                     // code => void ; menus/shortcuts (Esc, M, 1-3, …)
  onTouchMode: [],                  // () => void ; first touch switches to touch controls
  aim: null,                        // { action } while a skill waits for a left click (spec §37)
  aimFilter: null,                  // (action) => true when that skill should wait (set by main.js)
};

// Queues a one-shot action. With a mouse, a skill that needs aiming waits instead (spec §37):
// its marker shows until a left click casts it; the same key again casts at once.
export function queueAction(action, mouse = !input.touch) {
  if (mouse && input.aimFilter && (action.startsWith('skill') || action === 'ult')) {
    if (input.aim?.action === action) { input.aim = null; input.pressed.add(action); return; }
    if (input.aimFilter(action)) { input.aim = { action }; return; }
  }
  if (action.startsWith('skill') || action === 'ult') input.aim = null;
  input.pressed.add(action);
}
export function cancelAim() { input.aim = null; }

export const JOY_RADIUS = 56;       // CSS px of stick travel for full speed

const KEYMAP = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};
// skills on 1–4, ultimate on 5, potion belt on Z X C V, E talks in town (spec §22)
const ACTION_KEYS = {
  Space: 'dodge', KeyE: 'talk', KeyR: 'mount', KeyQ: 'swap', // Q: the other skill page (spec §43.6)
  Digit1: 'skill1', Digit2: 'skill2', Digit3: 'skill3', Digit4: 'skill4', Digit5: 'ult',
  KeyZ: 'pot0', KeyX: 'pot1', KeyC: 'pot2', KeyV: 'pot3',
};

addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return; // typing a name, not playing
  if (KEYMAP[e.code]) { input.keys.add(e.code); e.preventDefault(); }
  if (e.code === 'Escape' && input.aim) { input.aim = null; return; } // Esc cancels the aim (not a pause)
  if (ACTION_KEYS[e.code]) { e.preventDefault(); input.held.add(ACTION_KEYS[e.code]); if (!e.repeat) queueAction(ACTION_KEYS[e.code]); }
  for (const cb of input.onAction) cb(e.code);
});
addEventListener('keyup', (e) => { input.keys.delete(e.code); if (ACTION_KEYS[e.code]) input.held.delete(ACTION_KEYS[e.code]); });
addEventListener('focusout', (e) => { if (e.target.matches('input, textarea')) scrollTo(0, 0); }); // iPhone leaves the page shifted after its keyboard closes
addEventListener('blur', () => { input.keys.clear(); input.held.clear(); input.mouse.down = false; input.attackHeld = false; input.joy = null; input.aim = null; });

addEventListener('mousemove', (e) => {
  if (input.touch) return; // ignore the emulated mouse events that follow taps
  input.mouse.x = e.clientX; input.mouse.y = e.clientY; input.mouse.active = true;
});
addEventListener('mousedown', (e) => {
  if (e.target.id !== 'game') return;
  if (input.aim) { // left: cast where the marker is (this click is not an attack); right: cancel
    if (e.button === 0) input.pressed.add(input.aim.action);
    if (e.button === 0 || e.button === 2) input.aim = null;
    return;
  }
  if (e.button === 0) input.mouse.down = true;
});
addEventListener('mouseup', (e) => { if (e.button === 0) input.mouse.down = false; });
addEventListener('mousedown', (e) => { if (e.button === 2 && input.held.size) input.pressed.add('cancel'); }); // right click lets a charging skill go unused (spec §43.7)

function setTouchMode() {
  if (input.touch) return;
  input.touch = true;
  input.mouse.active = false;
  for (const cb of input.onTouchMode) cb();
}

addEventListener('touchstart', (e) => {
  setTouchMode();
  if (e.target.id !== 'game') return; // the stick starts on the play field; anything else keeps its tap
  for (const t of e.changedTouches) {
    if (input.joy || t.clientX > innerWidth / 2) continue; // stick lives on the left half
    input.joy = { id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 };
  }
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
    if (m > 8) { const k = Math.min(1, m / JOY_RADIUS) / m; x += input.joy.dx * k; y += input.joy.dy * k; }
  }
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  input.x = x; input.y = y;
}

// Returns and clears the queued one-shot actions.
export function consumePressed() {
  const p = new Set(input.pressed);
  input.pressed.clear();
  return p;
}
