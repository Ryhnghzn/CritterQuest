// Playing a cutscene (spec §44): a full-screen overlay with the pixel stage (render/cutscene.js),
// the line box with the speaker's portrait, the title card and a skip button. Tap / click /
// Space / Enter / E moves on; Esc or the button skips. Returns a promise that settles when done.
import { tr, t as tf } from '../i18n.js';
import { CUTSCENE, SCENES } from '../data/scenes.js';
import { makeCutscene, stepCutscene } from '../run/cutscene.js';
import { drawCutscene, drawPortrait } from '../render/cutscene.js';

let playing = null;
export const cutscenePlaying = () => !!playing;

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// scene: an id of SCENES or a scene object; hero: { classId, look } (the player's character)
export function playCutscene(scene, hero) {
  const def = typeof scene === 'string' ? SCENES[scene] : scene;
  if (!def || playing) return Promise.resolve(false);
  return new Promise((resolve) => {
    const cs = makeCutscene(def);
    const box = el('div', 'cutscene');
    const stage = el('canvas', 'cs-stage'); stage.width = CUTSCENE.w; stage.height = CUTSCENE.h;
    const layer = document.createElement('canvas'); layer.width = CUTSCENE.w; layer.height = CUTSCENE.h;
    const title = el('div', 'cs-title'), titleMain = el('div', 'cs-tmain'), titleSub = el('div', 'cs-tsub');
    title.append(titleMain, titleSub);
    const line = el('div', 'cs-line'), face = el('canvas', 'cs-face'), words = el('div', 'cs-words'), name = el('div', 'cs-name'), text = el('div', 'cs-text'), more = el('div', 'cs-more', '▼');
    face.width = face.height = 48;
    words.append(name, text);
    line.append(face, words, more);
    const skip = el('button', 'btn small cs-skip', tr('Lewati ▸▸'));
    box.append(stage, title, line, skip);
    document.body.append(box);
    let next = false, skipNow = false, last = performance.now(), faceOf = null;
    const onDown = (e) => { if (e.target !== skip) { next = true; e.preventDefault(); } };
    const onKey = (e) => { // every key belongs to the scene while it plays (the game behind stays still)
      if (e.code === 'Escape') skipNow = true;
      else if (['Space', 'Enter', 'KeyE', 'NumpadEnter'].includes(e.code)) next = true;
      e.preventDefault(); e.stopPropagation();
    };
    skip.onclick = () => { skipNow = true; };
    box.addEventListener('pointerdown', onDown);
    addEventListener('keydown', onKey, true);
    const g = stage.getContext('2d');
    playing = { cs };
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      stepCutscene(cs, dt, { next, skip: skipNow });
      next = false;
      if (cs.done) {
        removeEventListener('keydown', onKey, true);
        box.classList.add('out');
        setTimeout(() => box.remove(), 250);
        playing = null;
        resolve(!skipNow);
        return;
      }
      const t = now / 1000;
      drawCutscene(g, layer, cs, t, hero);
      // the line (or the illustration's caption)
      const L = cs.line || cs.panel;
      line.classList.toggle('on', !!L);
      line.classList.toggle('panel', !!cs.panel);
      if (L) {
        const full = tr(L.text), shown = full.slice(0, Math.ceil(full.length * (L.shown / Math.max(1, L.text.length))));
        if (text.textContent !== shown) text.textContent = shown;
        const who = cs.line?.name ? tr(cs.line.name) : '';
        if (name.textContent !== who) name.textContent = who;
        const speaker = cs.line?.who ? cs.actors[cs.line.who] : null;
        face.classList.toggle('none', !speaker);
        if (speaker && (speaker !== faceOf || Math.floor(t * 4) % 2 === 0)) { drawPortrait(face, speaker, t, hero); faceOf = speaker; }
        more.classList.toggle('on', L.shown >= L.text.length);
      }
      // the title card
      title.classList.toggle('on', !!cs.title && cs.title.t < cs.title.dur);
      if (cs.title) {
        const main = cs.title.vars ? tf(cs.title.text, cs.title.vars) : tr(cs.title.text);
        if (titleMain.textContent !== main) titleMain.textContent = main;
        const sub = cs.title.sub ? tr(cs.title.sub) : '';
        if (titleSub.textContent !== sub) titleSub.textContent = sub;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
