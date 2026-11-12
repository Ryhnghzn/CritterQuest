// Title screen "Api Unggun" (spec §29): the four classes sitting round the campfire (backdrop:
// art/titlebg.js, seats on the logs of its painting), the logo, and the menu on the left — Lanjutkan with the last hero
// played, Pilih Petualang, Pengaturan, and the language.
import { el, button } from './screens.js';
import { portrait } from '../art/doll.js';
import { CLASSES } from '../data/classes.js';
import { TOWNS } from '../data/world.js';
import { artPoint, ART } from '../art/titlebg.js';
import { drawDoll } from '../art/doll.js';
import { SIT } from '../art/hero/rig.js';
import { LOOK } from '../data/look.js';
import { pixelateCanvas } from '../render3d/pixelate.js';
import { tr, t } from '../i18n.js';

// Around the fire (spec §29, reworked 2026-11-11): the four classes sit on the logs of the
// painting, side-on toward the fire, each busy with its own thing (rig.js SIT_ACT: a whetstone
// on the sword, the bow checked, hands held to the warmth, a dagger flipped). Drawn small and
// pixelated like the game, lit by the fire: warm on the side facing it, plum shadow on the other.
// Their gear is kept plain (no rarity glow) — the night is the fire's. The hero played last
// takes the front seat.
const PLAIN = { tier: 2, rarity: 1 }, STEEL = { tier: 3, rarity: 1 };
const LOOKS = {
  warrior: { hair: 1, hairColor: 2, gear: { weapon: PLAIN, armor: STEEL, boots: PLAIN } },
  archer: { hair: 3, hairColor: 4, gear: { weapon: PLAIN, armor: PLAIN, boots: PLAIN } },
  mage: { hair: 2, hairColor: 5, gear: { weapon: PLAIN, armor: PLAIN } },
  assassin: { hair: 0, hairColor: 0, gear: { weapon: PLAIN, armor: PLAIN, boots: PLAIN } },
};
// the logs: where a figure's feet go (fractions of the painting), its standing height (fraction of
// the painting's height) and which way it faces (toward the fire)
const SEATS = [
  { x: 0.535, y: 0.835, size: 0.3, face: 1 },   // front left
  { x: 0.56, y: 0.725, size: 0.22, face: 1 },   // back left
  { x: 0.835, y: 0.725, size: 0.22, face: -1 }, // back right
  { x: 0.885, y: 0.83, size: 0.3, face: -1 },   // front right
];
const ORDER = ['warrior', 'archer', 'mage', 'assassin'];
const FPS = 24;      // redrawn often enough that breathing reads as motion, not as twitches
const CHUNK = 3;     // CSS pixels per art pixel

// a figure's look on the title: plain gear, its own hair; the last hero keeps their hair
function campLook(classId, last, front) {
  const base = LOOKS[classId], mine = last && (last.classId === classId || (front && !ORDER.includes(last.classId)));
  return mine ? { ...base, hair: last.look.hair, hairColor: last.look.hairColor } : base;
}

function drawCamp(c, last, t) {
  const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  const fire = artPoint(w, h, ART.fire.x, ART.fire.y);
  // the last hero's job takes the front seat (a Pengembara, no job yet: lends their hair to the warrior there)
  const job = last && ORDER.includes(last.classId) ? last.classId : null;
  const order = job ? [job, ...ORDER.filter((x) => x !== job)] : ORDER;
  // back seats first, so the front ones overlap them
  [1, 2, 0, 3].forEach((i) => {
    const seat = SEATS[i], cls = order[i], p = artPoint(w, h, seat.x, seat.y);
    const H = p.k * seat.size, hip = (SIT.hip / -70) * H; // the feet sit this far under the log top
    const sh = Math.max(24, Math.round(H / CHUNK)), sw = Math.round(sh * 1.3), k = sh / 70;
    const f = figure(i, sw, sh);
    const fg = f.getContext('2d', { willReadFrequently: true });
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, sw, sh); fg.globalCompositeOperation = 'source-over';
    fg.translate(sw / 2, sh - 3 * k); fg.scale(k * seat.face, k); fg.lineJoin = 'round';
    drawDoll(fg, cls, campLook(cls, last, i === 0), { t: t + i * 1.7, sit: true, anime: true, view: 'side' });
    fg.setTransform(1, 0, 0, 1, 0, 0);
    if (LOOK.pixel) pixelateCanvas(f, LOOK.pixel);
    // firelight: warm toward the fire, plum shadow away from it, a little flicker
    const toFire = fire.x > p.x ? 1 : -1, fl = 0.9 + Math.sin(t * 7 + i) * 0.05 + Math.sin(t * 13 + i * 2) * 0.03;
    const lg = fg.createLinearGradient(toFire > 0 ? sw : 0, 0, toFire > 0 ? 0 : sw, 0);
    lg.addColorStop(0, `rgba(255,140,60,${(0.32 * fl).toFixed(3)})`); lg.addColorStop(0.45, 'rgba(120,60,60,0.12)'); lg.addColorStop(1, 'rgba(26,12,40,0.62)');
    fg.globalCompositeOperation = 'source-atop';
    fg.fillStyle = 'rgba(14,8,24,0.22)'; fg.fillRect(0, 0, sw, sh); // night over everything
    fg.fillStyle = lg; fg.fillRect(0, 0, sw, sh);
    fg.globalCompositeOperation = 'source-over';
    const W = sw * CHUNK * dpr, Hh = sh * CHUNK * dpr;
    g.drawImage(f, p.x * dpr - W / 2, (p.y + hip) * dpr - Hh, W, Hh);
  });
}
const FIG = [];
function figure(i, w, h) {
  let f = FIG[i];
  if (!f) { f = FIG[i] = document.createElement('canvas'); }
  if (f.width !== w || f.height !== h) { f.width = w; f.height = h; }
  return f;
}
function runCamp(c, last) {
  let at = 0;
  const loop = (now) => {
    if (!c.isConnected) return;
    if (now - at >= 1000 / FPS) { at = now; drawCamp(c, last, now / 1000); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// Title samples (owner 2026-11-12, `?judul=a|b|c`; ui/judul.css): A = the real 3D Kota Awal at
// night drifting behind (main.js), B = the painting as key art (slow zoom, parallax, fog, embers,
// logo centred, menu along the bottom), C = the campfire re-framed (closer, darker, text menu).
// D (tap to start) is the title now (owner 2026-11-12); `?judul=lama` = the old title, a / b / c = the other samples
const JUDUL = typeof location !== 'undefined' ? (new URLSearchParams(location.search).get('judul') || 'd').toLowerCase() : 'd';
export const TITLE_SAMPLE = JUDUL === 'lama' ? '' : JUDUL;

// where the fire is on screen: the zoom of B / C turns round it; C moves it to 62% / 66%
function aimAtFire() {
  const f = artPoint(innerWidth, innerHeight, ART.fire.x, ART.fire.y), b = document.body.style;
  b.setProperty('--fx', `${f.x}px`); b.setProperty('--fy', `${f.y}px`);
  // C zooms ZOOM_C× round the fire, then slides it toward 62% / 66% — but never so far that an
  // edge of the painting comes into view (left/top: tx ≤ fx(s−1), right/bottom: tx ≥ (w−fx)(1−s))
  const s = ZOOM_C, w = innerWidth, h = innerHeight, clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  b.setProperty('--zc', s);
  b.setProperty('--tx', `${clamp(w * 0.62 - f.x, (w - f.x) * (1 - s), f.x * (s - 1))}px`);
  b.setProperty('--ty', `${clamp(h * 0.66 - f.y, (h - f.y) * (1 - s), f.y * (s - 1))}px`);
}
const ZOOM_C = 1.38;
let sampleReady = false;
// D (tap to start): the splash shows once per page load; a key or tap that ends it must not
// also press Lanjutkan (main.js asks titleBusy())
let entered = false, enteredAt = 0;
export const titleBusy = () => TITLE_SAMPLE === 'd' && (!entered || performance.now() - enteredAt < 350);
function setupSample() {
  document.body.dataset.judul = TITLE_SAMPLE;
  if (sampleReady) return;
  sampleReady = true;
  aimAtFire();
  addEventListener('resize', aimAtFire);
  // B: the painting leans away from the pointer a little
  addEventListener('pointermove', (e) => {
    const b = document.body.style;
    b.setProperty('--px', `${((e.clientX / innerWidth) - 0.5) * -18}px`);
    b.setProperty('--py', `${((e.clientY / innerHeight) - 0.5) * -10}px`);
  });
}

// D: stage 1 = wide dark campfire, the logo letter by letter, "tap to start"; any key / tap =
// the fire flares, the view dives toward it, the logo moves to the corner and the menu comes in
function splash(box, logo) {
  const h1 = logo.querySelector('.logo'), text = h1.textContent;
  h1.replaceChildren(...[...text].map((ch, i) => { const s = el('span', 'lt', ch === ' ' ? '\u00a0' : ch); s.style.setProperty('--i', i); return s; }));
  // gold sparks drifting round the logo
  const sparks = el('div', 'tsparks');
  for (let i = 0; i < 16; i++) {
    const p = el('i');
    p.style.cssText = `left:${(i * 41) % 100}%;top:${20 + (i * 23) % 70}%;--d:${((i * 0.37) % 4).toFixed(2)}s;--s:${(2.4 + (i % 4) * 0.7).toFixed(1)}s;--x:${(i % 2 ? 1 : -1) * (8 + (i % 5) * 5)}px`;
    sparks.append(p);
  }
  logo.prepend(sparks);
  if (entered) { box.classList.add('in'); document.body.dataset.jstage = 'menu'; return; }
  document.body.dataset.jstage = 'splash';
  box.classList.add('splash');
  const touch = matchMedia('(pointer:coarse)').matches;
  box.append(el('div', 'tflare'), el('div', 'ttap', touch ? tr('Ketuk untuk mulai') : tr('Tekan tombol apa saja')));
  const go = (e) => {
    if (entered) return;
    if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
    entered = true; enteredAt = performance.now();
    removeEventListener('keydown', go, true); removeEventListener('pointerdown', go, true);
    e.preventDefault?.();
    box.classList.remove('splash'); box.classList.add('entering');
    document.body.dataset.jstage = 'menu';
    setTimeout(() => { box.classList.remove('entering'); box.classList.add('in'); }, 1400);
  };
  addEventListener('keydown', go, true);
  addEventListener('pointerdown', go, true);
}

// last: the save of the hero played last (null: none yet); lang: 'en' | 'id'
export function renderTitle(box, { last, lang, onContinue, onSlots, onSettings, onLang }) {
  box.replaceChildren();
  if (TITLE_SAMPLE) setupSample();
  box.dataset.v = TITLE_SAMPLE;
  const seats = el('div', 'tseats'), camp = el('canvas', 'tcamp');
  seats.append(camp);
  if (TITLE_SAMPLE !== 'a') runCamp(camp, last); // A: the 3D town has its own people
  const logo = el('div', 'tlogo');
  logo.append(el('h1', 'logo', 'Critter Quest'), el('span', 'tag', tr('Gerhana di Ujung Dunia')));
  const menu = el('div', 'tmenu');
  if (last) {
    const c = button('', 'tcont', onContinue);
    c.id = 'continue';
    const txt = el('div', 'ct');
    txt.append(el('small', null, tr('Lanjutkan')), el('b', null, last.name),
      el('span', null, `${CLASSES[last.classId].name} · LV ${last.level} · ${TOWNS[last.location]?.name ?? ''}`));
    c.append(portrait(last.classId, last.look, 64), txt);
    menu.append(c);
  }
  const play = button(tr('Pilih Petualang'), last ? 'btn' : 'btn big', onSlots);
  play.id = 'play';
  const settings = button(tr('Pengaturan'), 'btn ghost', onSettings);
  settings.id = 'titlesettings';
  const langs = el('div', 'tlang');
  for (const [id, label] of [['en', 'English'], ['id', 'Indonesia']]) {
    const b = button(label, `btn ghost small${lang === id ? ' on' : ''}`, () => { if (lang !== id) onLang(id); });
    b.dataset.lang = id;
    langs.append(b);
  }
  menu.append(play, settings, langs);
  const foot = el('div', 'tfoot', last ? t('Enter: lanjutkan sebagai {name}', { name: last.name }) : tr('Enter: pilih petualang'));
  box.append(seats, logo, menu, foot);
  if (TITLE_SAMPLE === 'd') splash(box, logo);
  if (TITLE_SAMPLE) {
    box.prepend(el('div', 'tveil'));
    if (TITLE_SAMPLE === 'b') {
      box.prepend(el('div', 'tfog f1'), el('div', 'tfog f2'));
      const em = el('div', 'tembers');
      for (let i = 0; i < 26; i++) {
        const e = el('i');
        e.style.cssText = `left:${(i * 37) % 100}%;--d:${((i * 0.53) % 7).toFixed(2)}s;--s:${(5 + (i % 5) * 1.3).toFixed(1)}s;--x:${(i % 2 ? 1 : -1) * (20 + (i % 7) * 9)}px;--z:${(0.6 + (i % 3) * 0.35).toFixed(2)}`;
        em.append(e);
      }
      box.append(em);
    }
  }
}
