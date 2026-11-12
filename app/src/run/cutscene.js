// The cutscene player (spec §44): runs a scene's steps (data/scenes.js) over time and keeps
// what the stage shows — the camera, the actors, the line being typed, an illustration, a
// title, effects, the fade. Pure: no DOM; render/cutscene.js draws it, ui/cutscene.js plays it.
import { CUTSCENE } from '../data/scenes.js';

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

export function makeCutscene(scene) {
  return {
    scene, i: 0, t: 0, done: false,
    bg: 'town', cam: { x: 0, y: -40, zoom: CUTSCENE.zoom }, actors: {},
    tweens: [], block: null,           // running moves / pans; the one the script waits for
    line: null,                        // { who, name, text, shown, t } — waits for a tap or its reading time
    panel: null,                       // { id, text, shown, t }
    title: null, fx: [], fade: 1, fadeTo: 1, fadeV: 0,
  };
}

const readTime = (text) => CUTSCENE.read + CUTSCENE.perChar * text.length;

// one step of the script: set it going; returns a thing to wait for (or null)
function start(cs, s) {
  if (s.bg) { cs.bg = s.bg; return null; }
  if (s.put) {
    const { put, ...a } = s;
    cs.actors[put] = { x: 0, y: 0, face: 1, view: 'side', scale: 1, ...a, id: put, moving: 0, walk: 0, visible: true };
    return null;
  }
  if (s.hide) { if (cs.actors[s.hide]) cs.actors[s.hide].visible = false; return null; }
  if (s.look) {
    const a = cs.actors[s.look];
    if (a) { if (s.face) a.face = s.face; if (s.view) a.view = s.view; }
    return null;
  }
  if (s.cam) {
    const [x, y, zoom = cs.cam.zoom] = s.cam;
    if (!s.dur) { cs.cam = { x, y, zoom }; return null; }
    const tw = { kind: 'cam', from: { ...cs.cam }, to: { x, y, zoom }, t: 0, dur: s.dur };
    cs.tweens.push(tw);
    return tw;
  }
  if (s.move) {
    const a = cs.actors[s.move];
    if (!a) return null;
    const [x, y = a.y] = s.to;
    if (x !== a.x) a.face = x > a.x ? 1 : -1;
    a.view = 'side';
    const tw = { kind: 'move', a, from: { x: a.x, y: a.y }, to: { x, y }, t: 0, dur: s.dur || 1, run: !!s.run };
    cs.tweens.push(tw);
    return tw;
  }
  if (s.say !== undefined) {
    const a = s.say && cs.actors[s.say];
    cs.line = { who: s.say, name: s.who || a?.name || null, text: s.text, shown: 0, t: 0 };
    return cs.line;
  }
  if (s.panel) { cs.panel = { id: s.panel, text: s.text, shown: 0, t: 0 }; return cs.panel; }
  if (s.title) { cs.title = { text: s.title, sub: s.sub || null, vars: s.vars || null, t: 0, dur: s.dur || 2 }; return cs.title; }
  if (s.fx) { const f = { kind: s.fx, at: s.at || [cs.cam.x, 0], t: 0, dur: s.dur || 1 }; cs.fx.push(f); return f; }
  if (s.fade) { cs.fadeTo = s.fade === 'out' ? 1 : 0; cs.fadeV = 1 / Math.max(0.05, s.dur || 0.5); return { kind: 'fade' }; }
  if (s.wait) return { kind: 'wait', t: 0, dur: s.wait };
  return null;
}

const finished = (cs, w) => {
  if (!w) return true;
  if (w === cs.line || w === cs.panel) return false; // until tapped / read
  if (w.kind === 'fade') return cs.fade === cs.fadeTo;
  return w.t >= w.dur;
};

// input: { next: a tap / key this frame, skip: leave the scene }
export function stepCutscene(cs, dt, input = {}) {
  if (cs.done) return cs;
  if (input.skip) { cs.done = true; return cs; }
  cs.t += dt;
  // moves and pans
  for (const tw of cs.tweens) {
    tw.t = Math.min(tw.dur, tw.t + dt);
    const k = ease(tw.t / tw.dur);
    if (tw.kind === 'cam') { cs.cam.x = tw.from.x + (tw.to.x - tw.from.x) * k; cs.cam.y = tw.from.y + (tw.to.y - tw.from.y) * k; cs.cam.zoom = tw.from.zoom + (tw.to.zoom - tw.from.zoom) * k; }
    if (tw.kind === 'move') {
      const lin = tw.t / tw.dur;
      tw.a.x = tw.from.x + (tw.to.x - tw.from.x) * lin; tw.a.y = tw.from.y + (tw.to.y - tw.from.y) * lin;
      tw.a.moving = tw.t < tw.dur ? 1 : 0;
      tw.a.walk += dt * (tw.run ? 16 : 11);
    }
  }
  cs.tweens = cs.tweens.filter((tw) => tw.t < tw.dur);
  for (const f of cs.fx) f.t += dt;
  cs.fx = cs.fx.filter((f) => f.t < f.dur + 0.6); // a little past its time, to fade away
  if (cs.title) { cs.title.t += dt; if (cs.title.t > cs.title.dur + 0.4) cs.title = null; }
  if (cs.block?.kind === 'wait') cs.block.t += dt;
  // the fade
  if (cs.fade !== cs.fadeTo) {
    const d = cs.fadeV * dt;
    cs.fade = cs.fade < cs.fadeTo ? Math.min(cs.fadeTo, cs.fade + d) : Math.max(cs.fadeTo, cs.fade - d);
  }
  // the line / illustration: types in; a tap shows it all, the next tap (or its reading time) moves on
  for (const box of [cs.line, cs.panel]) {
    if (!box) continue;
    box.t += dt;
    box.shown = Math.min(box.text.length, box.shown + dt * CUTSCENE.type);
    const all = box.shown >= box.text.length;
    if (input.next && !all) { box.shown = box.text.length; input = { ...input, next: false }; }
    else if ((input.next && all) || (all && box.t > readTime(box.text) + box.text.length / CUTSCENE.type)) {
      if (box === cs.line) cs.line = null; else cs.panel = null;
      input = { ...input, next: false };
      if (cs.block === box) cs.block = null;
    }
  }
  // on through the script until something must be waited for
  let guard = 0;
  while (!cs.done && guard++ < 64) {
    if (cs.block && !finished(cs, cs.block)) break;
    cs.block = null;
    if (cs.i >= cs.scene.steps.length) { if (!cs.tweens.length && !cs.line && !cs.panel) cs.done = true; break; }
    const s = cs.scene.steps[cs.i++], w = start(cs, s);
    if (w && !s.go) cs.block = w;
  }
  if (cs.t > (cs.scene.maxLen || CUTSCENE.maxLen) + 30) cs.done = true; // never stuck (a long scene says its own length)
  return cs;
}

// the shake of the camera now (from shake effects)
export function shakeOf(cs) {
  let s = 0;
  for (const f of cs.fx) if (f.kind === 'shake' && f.t < f.dur) s = Math.max(s, 1 - f.t / f.dur);
  return s;
}
