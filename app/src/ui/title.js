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
const FPS = 12;      // redrawn like a sprite animation
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

// last: the save of the hero played last (null: none yet); lang: 'en' | 'id'
export function renderTitle(box, { last, lang, onContinue, onSlots, onSettings, onLang }) {
  box.replaceChildren();
  const seats = el('div', 'tseats'), camp = el('canvas', 'tcamp');
  seats.append(camp);
  runCamp(camp, last);
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
}
