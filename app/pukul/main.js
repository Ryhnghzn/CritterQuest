// Example page (spec §49, not in the build): the basic attack seen from the front, the side and
// the back for the four jobs, new (strike toward / away from the camera) against old (turn side-on).
import { drawAnime, ANIME_H, CLASS_LOOK, gaitRate } from '../src/art/anime/index.js';
import { setFxSink, drawFx } from '../src/art/anime/elemfx.js';
import { pixelData } from '../src/render3d/pixelate.js';

const CLASSES = ['warrior', 'archer', 'mage', 'assassin'];
const NAMES = { warrior: 'Prajurit', archer: 'Pemanah', mage: 'Penyihir', assassin: 'Pembunuh' };
const VIEWS = [['front', 'Depan · bidik ke bawah'], ['side', 'Samping'], ['back', 'Belakang · bidik ke atas']];
const ATTACK = 0.45, EVERY = 1.1, TURN = 0.16; // the game's ATTACK_ANIM; a swing every EVERY s; paper turn (LOOK.facing.turn)
const state = { mode: 'new', speed: 1, render: 'pixel', loop: true, walk: false, tap: -9 };
const $ = (id) => document.getElementById(id);

function buttons(id, list, key) {
  const box = $(id);
  for (const [v, label] of list) {
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = label;
    b.onclick = () => { state[key] = v; [...box.children].forEach((c) => c.classList.toggle('on', c === b)); };
    if (state[key] === v) b.classList.add('on');
    box.append(b);
  }
}
buttons('mode', [['new', 'Baru'], ['old', 'Lama (sekarang)']], 'mode');
buttons('speed', [[1, 'Kecepatan game'], [0.25, 'Pelan ×4']], 'speed');
buttons('render', [['pixel', 'Pixel (seperti game)'], ['smooth', 'Halus']], 'render');
$('loop').onclick = () => { state.loop = !state.loop; $('loop').classList.toggle('on', state.loop); };
$('walk').onclick = () => { state.walk = !state.walk; $('walk').classList.toggle('on', state.walk); };
$('stage').addEventListener('pointerdown', () => { state.tap = clock; });

const looks = Object.fromEntries(CLASSES.map((c) => [c, { style: 'spiky', hair: 'black', eye: CLASS_LOOK[c].eye, element: CLASS_LOOK[c].mythic, gear: { weapon: 4, helm: 3, armor: 3, boots: 3, amulet: null, ring: null } }]));

// the attack phase now (or undefined), and when it started
function swing(t) {
  const since = state.loop ? t % EVERY : t - state.tap;
  return since >= 0 && since < ATTACK ? since / ATTACK : undefined;
}
// what the old version shows in a front / back cell: it turns side-on for the swing, then back
function oldView(view, t) {
  const since = state.loop ? t % EVERY : t - state.tap, busy = since >= 0 && since < ATTACK + 0.05;
  const turned = busy ? since : since - ATTACK - 0.05; // seconds since the last change of view
  const p = turned / TURN, from = busy ? view : 'side', to = busy ? 'side' : view;
  if (!(p >= 0 && p < 1)) return { view: to, sq: 1 };
  return { view: p < 0.5 ? from : to, sq: Math.max(0.06, Math.abs(Math.cos(p * Math.PI))) };
}

// ─── pixel art (the game's filter) ─────────────────────────────────────────
const PIX = { levels: 7, solid: 0.8, ink: [19, 11, 26] };
const BOX = { x0: -150, x1: 170, y0: -230, y1: 22 };
const cache = new Map();
function figure(g, cls, pose, k, x, y, sq, key) {
  const o = looks[cls];
  if (state.render === 'smooth') { g.setTransform(k * sq, 0, 0, k, x, y); drawAnime(g, cls, o, pose); g.setTransform(1, 0, 0, 1, 0, 0); return; }
  const hpx = 84, s = hpx / ANIME_H, w = Math.ceil((BOX.x1 - BOX.x0) * s), h = Math.ceil((BOX.y1 - BOX.y0) * s);
  let c = cache.get(key);
  if (!c) { c = document.createElement('canvas'); cache.set(key, c); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const cg = c.getContext('2d', { willReadFrequently: true });
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, w, h);
  cg.setTransform(s, 0, 0, s, -BOX.x0 * s, -BOX.y0 * s);
  const fx = [];
  setFxSink(fx);
  try { drawAnime(cg, cls, o, pose); } finally { setFxSink(null); }
  const img = cg.getImageData(0, 0, w, h); pixelData(img.data, w, h, PIX); cg.putImageData(img, 0, 0);
  const z = k / s, ox = x + BOX.x0 * k * sq, oy = y + BOX.y0 * k;
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  g.drawImage(c, ox, oy, c.width * z * sq, c.height * z);
  g.imageSmoothingEnabled = true;
  if (fx.length) drawFx(g, fx, new DOMMatrix([z * sq, 0, 0, z, ox, oy]));
}

// ─── stage: a row per job, a column per view ───────────────────────────────
const cv = $('stage'), g = cv.getContext('2d');
let clock = 0, last = null;
function frame(now) {
  const dt = last == null ? 0 : Math.min(0.05, (now - last) / 1000); last = now;
  clock += dt * state.speed;
  const dpr = Math.min(devicePixelRatio || 1, 2), W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  const lab = 20 * dpr, cw = W / VIEWS.length, ch = (H - lab) / CLASSES.length, ph = swing(clock);
  g.font = `600 ${12 * dpr}px Barlow, sans-serif`; g.textAlign = 'center';
  VIEWS.forEach(([, vlabel], vi) => { g.fillStyle = '#e8cf8e'; g.fillText(vlabel, vi * cw + cw / 2, 14 * dpr); });
  CLASSES.forEach((cls, ci) => VIEWS.forEach(([view], vi) => cell(cls, view, vi * cw, lab + ci * ch, cw, ch, clock, ph, dpr)));
  requestAnimationFrame(frame);
}
function cell(cls, view, x, y, w, h, t, ph, dpr) {
  g.strokeStyle = '#1e1824'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  let v = { view, sq: 1 };
  if (state.mode === 'old' && view !== 'side') v = oldView(view, t);
  const pose = { t, moving: state.walk ? 1 : 0, walk: t * 11 * gaitRate(cls), view: v.view };
  if (ph !== undefined && (state.mode === 'new' || v.view === 'side')) pose.attackPhase = ph;
  const k = (h * 0.7) / ANIME_H, fx = x + w / 2, fy = y + h * 0.9;
  g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#c9a24a'; g.lineWidth = 1.5 * dpr; g.beginPath(); g.ellipse(fx, fy, h * 0.16, h * 0.05, 0, 0, Math.PI * 2); g.stroke(); g.restore();
  figure(g, cls, pose, k, fx, fy, v.sq, `${cls}-${view}`);
  if (view === 'front') { g.fillStyle = '#9a8f80'; g.textAlign = 'left'; g.fillText(NAMES[cls], x + 8 * dpr, y + 16 * dpr); g.textAlign = 'center'; }
}
requestAnimationFrame(frame);
