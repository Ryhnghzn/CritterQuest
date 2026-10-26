// Fixed-timestep loop: the simulation always advances in STEP increments,
// rendering happens once per animation frame. Catch-up is capped at
// MAX_STEPS per frame so a hitch can't spiral.
export const STEP = 1 / 60;
const MAX_STEPS = 5;

// tick() runs one fixed step; returning true ends this frame's catch-up early.
// frame(dt) runs once per animation frame, after the steps.
export function startLoop(tick, frame) {
  let acc = 0, last = performance.now();
  function onFrame(now) {
    requestAnimationFrame(onFrame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS) {
      acc -= STEP; steps++;
      if (tick()) break;
    }
    if (steps === MAX_STEPS) acc = 0; // don't spiral after a hitch
    frame(dt);
  }
  requestAnimationFrame(onFrame);
  return { resetClock() { last = performance.now(); } };
}
