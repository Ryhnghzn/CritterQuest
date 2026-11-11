// Anime sample page (app/anime.html): the four classes from src/art/anime (the same code the game
// will use) on a stage — three views, walk, attacks and skill moves on the game's skeleton, hair
// styles and colours, smooth or pixel art (render3d/pixelate.js), all classes side by side, and
// a game-size preview next to the current style-D hero.
import { drawAnime, ANIME, CLASS_NAMES, ELEMENTS, HAIR_STYLES, HAIR_COLORS, ANIME_H, gaitRate } from '../src/art/anime/index.js';
import { glow } from '../src/art/anime/kit.js';
import { WINGS as WING_KINDS } from '../src/art/anime/wings.js';
import { setFxSink, drawFx } from '../src/art/anime/elemfx.js';
import { pixelData } from '../src/render3d/pixelate.js';
import { drawDoll } from '../src/art/doll.js';
import { moveDuration } from '../src/art/hero/rig.js';

const $ = (id) => document.getElementById(id);
const EYES = { amber: ['Kuning', '#ffb43a'], ice: ['Biru', '#46b8ff'], ruby: ['Merah', '#ff3a5a'], violet: ['Ungu', '#b46aff'], jade: ['Hijau', '#3ae0a0'] };
const RENDERS = { anime: ['Anime'], px48: ['Pixel kecil', 48], px80: ['Pixel sedang', 80], px120: ['Pixel besar', 120] };
const VIEWS = { side: ['Samping'], front: ['Depan'], back: ['Belakang'], spin: ['Putar otomatis'] };
const SKILLS = {
  warrior: { spin: 'Pusaran', shout: 'Teriakan', quake: 'Gempa', charge: 'Terjang', axe: 'Kapak' },
  archer: { rain: 'Hujan Panah', pierce: 'Panah Tembus', volley: 'Rentetan', leap: 'Lompat', trap: 'Jebakan' },
  mage: { nova: 'Nova', chain: 'Petir Berantai', meteor: 'Meteor', blink: 'Kilat', inferno: 'Inferno' },
  assassin: { shadow: 'Langkah Bayang', fan: 'Kipas Pisau', poison: 'Racun', smoke: 'Asap', shuriken: 'Shuriken' },
};
const DEFAULT = { // a look per class to start from
  warrior: { style: 'spiky', hair: 'silver', eye: 'amber', element: 'ice' },
  archer: { style: 'tail', hair: 'brown', eye: 'jade', element: 'storm' },
  mage: { style: 'long', hair: 'black', eye: 'violet', element: 'void' },
  assassin: { style: 'swept', hair: 'crimson', eye: 'ruby', element: 'blood' },
};
const ORDER = ['side', 'front', 'side', 'back'];
const state = { fxSmooth: true, cls: 'warrior', render: 'px80', view: 'side', walk: false, all: false, gallery: false, atk: -9, move: null, looks: {} };
for (const c of Object.keys(ANIME)) state.looks[c] = { ...DEFAULT[c], outfit: Object.keys(ANIME[c].OUTFITS)[0] };
// worn gear: rarity per slot (null = empty), shared by all classes so they compare side by side
const GEAR_SLOTS = { weapon: 'Senjata', helm: 'Helm', armor: 'Zirah', boots: 'Sepatu', amulet: 'Kalung', ring: 'Cincin' };
const WINGS = { none: 'Tanpa', ...Object.fromEntries(Object.entries(WING_KINDS).map(([k, v]) => [k, v.name])) };
const RAR = { x: '–', 0: 'Biasa', 1: 'Bagus', 2: 'Langka', 3: 'Epik', 4: 'Legend', 5: 'Mitos' };
state.gear = { weapon: 5, helm: 5, armor: 5, boots: 5, amulet: 5, ring: 5 };
state.wings = 'light';
const L = () => state.looks[state.cls];
const ATTACK = 0.9, TURN = 0.22; // s
let shown = 'side', prevShown = 'side', turnT = -9;
const now = () => performance.now() / 1000;

// ─── controls ──────────────────────────────────────────────────────────────
const rows = [];
function buttons(id, list, get, set) {
  const box = $(id);
  const draw = () => box.replaceChildren(...Object.entries(list()).map(([k, v]) => {
    const b = document.createElement('button');
    b.className = `btn${get() === k ? ' on' : ''}`; b.textContent = typeof v === 'string' ? v : v.name || v[0];
    b.onclick = () => { set(k); redraw(); };
    return b;
  }));
  rows.push(draw);
}
const redraw = () => rows.forEach((r) => r());
buttons('cls', () => CLASS_NAMES, () => state.cls, (k) => { state.cls = k; state.move = null; });
buttons('render', () => RENDERS, () => state.render, (k) => { state.render = k; });
buttons('view', () => VIEWS, () => state.view, (k) => { state.view = k; });
buttons('skills', () => SKILLS[state.cls], () => state.move?.id, (k) => { toSide(); state.move = { id: k, t0: now() + (shown === 'side' ? 0 : TURN), dur: moveDuration(state.cls, k, 1.2) }; });
buttons('outfit', () => ANIME[state.cls].OUTFITS, () => L().outfit, (k) => { L().outfit = k; });
buttons('element', () => ELEMENTS, () => L().element, (k) => { L().element = k; });
buttons('style', () => HAIR_STYLES, () => L().style, (k) => { L().style = k; });
buttons('hair', () => HAIR_COLORS, () => L().hair, (k) => { L().hair = k; });
buttons('eye', () => EYES, () => L().eye, (k) => { L().eye = k; });
{ // one row of rarity buttons per gear slot
  const box = $('gear');
  for (const [slot, name] of Object.entries(GEAR_SLOTS)) {
    const row = document.createElement('div'); row.className = 'opts'; row.style.marginBottom = '4px';
    const lbl = document.createElement('span'); lbl.textContent = name; lbl.style.cssText = 'width:52px;font-size:12.5px;color:#9a8f80;align-self:center';
    const opts = document.createElement('div'); opts.className = 'opts'; opts.id = `gear-${slot}`;
    row.append(lbl, opts); box.append(row);
    buttons(`gear-${slot}`, () => RAR, () => (state.gear[slot] == null ? 'x' : String(state.gear[slot])), (k) => { state.gear[slot] = k === 'x' ? null : Number(k); });
  }
}
buttons('wings', () => WINGS, () => state.wings, (k) => { state.wings = k; });
redraw();
$('gearMythic').onclick = () => { for (const k of Object.keys(GEAR_SLOTS)) state.gear[k] = 5; redraw(); };
$('gearOff').onclick = () => { for (const k of Object.keys(GEAR_SLOTS)) state.gear[k] = null; redraw(); };
const toggle = (id, key) => { $(id).onclick = () => { state[key] = !state[key]; $(id).classList.toggle('on', state[key]); }; };
toggle('walk', 'walk'); toggle('all', 'all'); toggle('gal', 'gallery'); toggle('galw', 'wingGallery'); toggle('fxs', 'fxSmooth');
function toSide() { if (state.view !== 'side' && state.view !== 'spin') { state.view = 'side'; redraw(); } }
const attack = () => { toSide(); state.atk = now() + (shown === 'side' ? 0 : TURN); };
$('atk').onclick = attack;
addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); attack(); } });
$('stage').addEventListener('pointerdown', attack);

// ─── pose ──────────────────────────────────────────────────────────────────
function viewNow(t) { // switching views plays a quick paper turn (narrow → wide)
  const want = state.view === 'spin' ? ORDER[Math.floor(t / 2.4) % ORDER.length] : state.view;
  if (want !== shown) { prevShown = shown; shown = want; turnT = t; }
  const p = (t - turnT) / TURN;
  if (p < 0 || p >= 1) return { view: shown, sq: 1 };
  return { view: p < 0.5 ? prevShown : shown, sq: Math.max(0.05, Math.abs(Math.cos(p * Math.PI))) };
}
function poseOf(t, view, cls) {
  const pose = { t, moving: state.walk ? 1 : 0, walk: t * 11 * gaitRate(cls), view, slow: true }; // each class runs at its own cadence
  if (view !== 'side') return pose;
  const a = (t - state.atk) / ATTACK;
  if (a >= 0 && a < 1) pose.attackPhase = a;
  const m = state.move;
  if (m && cls === state.cls) { const ph = (t - m.t0) / m.dur; if (ph >= 0 && ph < 1) pose.move = { id: m.id, ph, dur: m.dur }; }
  return pose;
}
const lookOf = (cls, style, wings = state.wings) => { const l = state.looks[cls]; return { ...l, style: style || l.style, eye: EYES[l.eye][1], gear: state.gear, wings: wings === 'none' ? null : wings }; };

// ─── pixel art (the game's filter, render3d/pixelate.js) ─────────────────
const PIX = { levels: 7, solid: 0.8, ink: [19, 11, 26] };
const BOX = { x0: -150, x1: 170, y0: -215, y1: 22 }; // the figure's box, art units (with the weapons)
const cache = new Map();
function pixelArt(cls, o, pose, hpx, key) {
  const s = hpx / ANIME_H, w = Math.ceil((BOX.x1 - BOX.x0) * s), h = Math.ceil((BOX.y1 - BOX.y0) * s);
  let c = cache.get(key);
  if (!c) { c = document.createElement('canvas'); cache.set(key, c); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d', { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
  g.setTransform(s, 0, 0, s, -BOX.x0 * s, -BOX.y0 * s);
  const fx = [];
  setFxSink(state.fxSmooth ? fx : null); // smooth effects are kept out of the pixel art and drawn on top
  try { drawAnime(g, cls, o, pose); } finally { setFxSink(null); }
  const img = g.getImageData(0, 0, w, h);
  pixelData(img.data, w, h, PIX);
  g.putImageData(img, 0, 0);
  return { c, s, fx };
}
// draw a class at k screen px per art unit, feet at (x, y)
function figure(g, cls, o, pose, k, x, y, sq, key, hpx = RENDERS[state.render][1]) {
  if (!hpx) { g.setTransform(k * sq, 0, 0, k, x, y); drawAnime(g, cls, o, pose); g.setTransform(1, 0, 0, 1, 0, 0); return; }
  const { c, s, fx } = pixelArt(cls, o, pose, hpx, key), z = k / s, ox = x + BOX.x0 * k * sq, oy = y + BOX.y0 * k;
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  g.drawImage(c, ox, oy, c.width * z * sq, c.height * z);
  g.imageSmoothingEnabled = true;
  if (fx.length) drawFx(g, fx, new DOMMatrix([z * sq, 0, 0, z, ox, oy]));
}

// ─── stage ─────────────────────────────────────────────────────────────────
const dpr = () => Math.min(devicePixelRatio || 1, 2);
function fit(c) {
  const w = Math.round(c.clientWidth * dpr()), h = Math.round(c.clientHeight * dpr());
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c.getContext('2d');
}
const EMBERS = Array.from({ length: 40 }, (_, i) => ({ x: (i * 0.618) % 1, s: 0.3 + ((i * 37) % 10) / 14, o: (i * 0.29) % 1 }));
function backdrop(g, W, H, t) {
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0a0814'); bg.addColorStop(0.65, '#1a1226'); bg.addColorStop(1, '#0c0810');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const E = ELEMENTS[L().element];
  glow(g, W * 0.5, H * 0.55, H * 0.55, E.glow, 0.1);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const e of EMBERS) {
    const u = (t * 0.05 * e.s + e.o) % 1;
    g.globalAlpha = Math.sin(u * Math.PI) * 0.6; g.fillStyle = E.rune;
    g.beginPath(); g.arc(e.x * W + Math.sin(t + e.o * 9) * 12, H * (1 - u), 1.6 * dpr() * e.s, 0, 7); g.fill();
  }
  g.restore();
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, H * 0.86, W, H * 0.14);
  if (state.walk && shown === 'side') { // running: the ground streams past under the feet
    const step = W / 9, off = (t * W * 0.55) % step;
    g.fillStyle = 'rgba(232,207,142,.10)';
    for (let x = -off; x < W; x += step) { g.fillRect(x, H * 0.875, step * 0.4, 2 * dpr()); g.fillRect(x + step * 0.5, H * 0.93, step * 0.25, 2 * dpr()); }
    g.strokeStyle = 'rgba(232,207,142,.12)'; g.lineWidth = 1.4 * dpr(); // speed lines
    for (let i = 0; i < 6; i++) { const y = H * (0.3 + i * 0.09), x = W - ((t * W * 1.4 + i * 197) % (W * 1.4)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + W * 0.12, y); g.stroke(); }
  }
}
function shadow(g, x, y, k) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x, y, 30 * k, 6 * k, 0, 0, 7); g.fill(); }
function label(g, text, x, y) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#e8cf8e'; g.font = `600 ${Math.round(13 * dpr())}px Barlow, sans-serif`; g.textAlign = 'center'; g.fillText(text, x, y); }

function drawStage(t) {
  const c = $('stage'), g = fit(c), W = c.width, H = c.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  backdrop(g, W, H, t);
  const v = viewNow(t);
  if (state.all) { // the four classes side by side
    const ids = Object.keys(ANIME), cw = W / ids.length, k = Math.min(H / 240, cw / 150);
    ids.forEach((cls, i) => {
      const x = cw * (i + 0.42), y = H * 0.86;
      shadow(g, x, y, k); figure(g, cls, lookOf(cls), poseOf(t, v.view, cls), k, x, y, v.sq, `all${i}`);
      label(g, CLASS_NAMES[cls], cw * (i + 0.5), 22 * dpr());
    });
    return;
  }
  if (state.wingGallery) { // every wing on the chosen class
    const ids = Object.keys(WING_KINDS), cols = 3, cw = W / cols, rh = H / 3, k = rh / 230;
    ids.forEach((id, i) => {
      const x = cw * (i % cols + 0.5), y = rh * (Math.floor(i / cols) + 1) - 6 * dpr();
      figure(g, state.cls, lookOf(state.cls, null, id), poseOf(t, v.view, state.cls), k, x, y, v.sq, `wing${i}`);
      label(g, WING_KINDS[id].name, x, rh * Math.floor(i / cols) + 16 * dpr());
    });
    return;
  }
  if (state.gallery) { // every hair style on the chosen class
    const ids = Object.keys(HAIR_STYLES), cols = 3, cw = W / cols, rh = H / 2, k = rh / 215;
    ids.forEach((id, i) => {
      const x = cw * (i % cols + 0.45), y = rh * (Math.floor(i / cols) + 1) - 6 * dpr();
      figure(g, state.cls, lookOf(state.cls, id), poseOf(t, v.view, state.cls), k, x, y, v.sq, `gal${i}`);
      label(g, HAIR_STYLES[id].name, cw * (i % cols + 0.5), rh * Math.floor(i / cols) + 18 * dpr());
    });
    return;
  }
  const k = H / 235, x = W * (v.view === 'side' ? 0.4 : 0.5), y = H * 0.88;
  shadow(g, x, y, k);
  figure(g, state.cls, lookOf(state.cls), poseOf(t, v.view, state.cls), k, x, y, v.sq, 'main');
}

const OLD = { hair: 1, hairColor: 2, gear: { weapon: { tier: 5, rarity: 4 }, armor: { tier: 5, rarity: 4 }, boots: { tier: 4, rarity: 3 } } };
function drawMini(t) {
  const c = $('mini'), g = fit(c), W = c.width, H = c.height, d = dpr();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#141a12'; g.fillRect(0, 0, W, H);
  const px = 66 * d, v = viewNow(t), o = lookOf(state.cls), pose = poseOf(t, v.view, state.cls);
  g.setTransform(1, 0, 0, 1, W * 0.18, H * 0.84); g.scale(px / 50, px / 50);
  drawDoll(g, state.cls, OLD, { t, moving: pose.moving, walk: pose.walk });
  figure(g, state.cls, o, pose, px / ANIME_H, W * 0.48, H * 0.84, v.sq, 'miniA', 0);
  figure(g, state.cls, o, pose, px / ANIME_H, W * 0.8, H * 0.84, v.sq, 'miniP', 66); // one art pixel per CSS pixel
}

// one part failing must not freeze the page: report it and keep the loop going
const errs = new Set();
const safe = (name, fn, t) => { try { fn(t); } catch (e) { if (!errs.has(name)) { errs.add(name); console.error(`[${name}]`, e); } } };
function frame() {
  const t = now();
  safe('panggung', drawStage, t); safe('mini', drawMini, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
