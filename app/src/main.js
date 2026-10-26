// Bootstrap: opens the save, wires the game, renderer, input, audio and the
// DOM screens together and runs the fixed-timestep loop.
// Flow (spec §3): Judul → Pilih Slot → Buat Karakter / Kemah → Ronde → Hasil → Kemah.
import { Game, ST } from './run/run.js';
import { Renderer } from './render/world.js';
import { CLASSES, CLASS_BASE } from './data/classes.js';
import { iconCanvas } from './art/sprites.js';
import { input, pollMove, consumePressed } from './core/input.js';
import { ensureAudio, startMusic, stopMusic, toggleMuted, setMuted, sfx } from './core/audio.js';
import { STEP, startLoop } from './core/loop.js';
import { openStore } from './meta/save.js';
import { createCharacter, applyRunResult, finalStats } from './meta/character.js';
import { showScreen, confirmDialog } from './ui/screens.js';
import { renderSlots } from './ui/slots.js';
import { renderCreate } from './ui/create.js';
import { renderCamp } from './ui/camp.js';
import { renderResults } from './ui/results.js';
import { updateHUD, updateActions } from './ui/hud.js';
import { setupTouch, updateJoystick } from './ui/touch.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const game = new Game();
const R = new Renderer(canvas);
setupTouch();

let simT = 0;
let screen = 'title';
let slots = [];       // last store.loadSlots()
let current = null;   // character being played (save data)

// ——— save + settings ———
const store = await openStore();
if (!store.persistent) $('nosave').classList.remove('hidden');

function legacyMuted() {
  try { return localStorage.getItem('cs-muted') === '1'; } catch (_) { return false; }
}
const settings = (await store.loadSettings()) ?? { version: 1, muted: legacyMuted(), lastSlot: 0 };
setMuted(settings.muted);
$('mute').classList.toggle('muted', settings.muted);

function saveSettings() {
  store.saveSettings(settings).catch(() => { /* settings are a convenience; ignore */ });
}

// ——— screens ———
function showMenu(id) {
  game.state = ST.TITLE; // not in a run
  screen = showScreen(id);
  setRunUI(false, false);
}

// HUD visible during a run; weapons + action buttons only while actually playing or picking a card.
function setRunUI(hud, controls) {
  $('hud').classList.toggle('hidden', !hud);
  $('pausebtn').classList.toggle('hidden', !controls);
  $('actions').classList.toggle('hidden', !controls);
  $('weapons').classList.toggle('hidden', !hud);
  document.body.classList.toggle('playing', controls);
}

// overlay during a run (levelup / pause); null = playing
function showOverlay(id) {
  screen = showScreen(id);
  setRunUI(true, id === null);
}

async function toSlots() {
  stopMusic();
  slots = await store.loadSlots();
  renderSlots($('slotlist'), slots, { onOpen: openSlot, onCreate: toCreate, onDelete: deleteSlot });
  showMenu('slots');
}

function openSlot(slot) {
  const e = slots[slot];
  if (e.status === 'ok') toCamp(e.data);
}

function toCreate(slot) {
  renderCreate($('create'), { onCreate: (form) => createChar(slot, form), onBack: toSlots });
  showMenu('create');
  $('charname').focus();
}

async function createChar(slot, form) {
  const first = !slots.some((e) => e.status === 'ok');
  const char = createCharacter({ slot, ...form }, Date.now());
  await store.saveSlot(char);
  // ask the browser not to evict our data (spec §9.3); ignore if unsupported/denied
  if (first && store.persistent) navigator.storage?.persist?.().catch(() => {});
  ensureAudio(); sfx.pickCard();
  toCamp(char);
}

async function deleteSlot(slot) {
  const e = slots[slot];
  const what = e.status === 'ok' ? `${e.data.name} (LV ${e.data.level})` : `data rusak di slot ${slot + 1}`;
  if (!(await confirmDialog(`Hapus ${what}? Tidak bisa dibatalkan.`, 'Hapus'))) return;
  await store.deleteSlot(slot);
  await toSlots();
}

function toCamp(char) {
  current = char;
  settings.lastSlot = char.slot;
  saveSettings();
  stopMusic();
  renderCamp($('camp'), char, { onStart: startRun, onBack: toSlots });
  showMenu('camp');
}

// ——— run ———
function startRun() {
  ensureAudio(); startMusic();
  // until langkah 3C the class still fires a prototype weapon
  game.start({ classId: current.classId, stats: finalStats(current), weapon: CLASSES[current.classId].protoWeapon });
  game.best = { time: current.records.bestTime, kills: 0, level: 0 };
  R.avatar = { classId: current.classId, look: current.look };
  showOverlay(null);
  refreshWeaponBar();
}

// After death or surrender: apply rewards, auto-save, show Hasil (spec §5.6, §9.3).
async function endRun(died) {
  screen = 'ending';
  stopMusic();
  const result = game.result();
  const isRecord = Math.floor(result.time) > current.records.bestTime;
  const { char, levelsGained } = applyRunResult(current, result, Date.now());
  current = char; // keep progress in memory even if the write fails
  let saveError = null;
  try { await store.saveSlot(char); } catch (e) { saveError = e.message; }
  renderResults($('results'), { char, result, levelsGained, isRecord, died, saveError },
    { onContinue: () => toCamp(current) });
  showMenu('results');
}

// ——— level-up screen ———
function showLevelUp() {
  const box = $('choices');
  box.innerHTML = '';
  game.choices.forEach((c, i) => {
    const d = game.describeChoice(c);
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${i * 0.07}s`;
    const key = document.createElement('div'); key.className = 'key'; key.textContent = i + 1;
    const icon = document.createElement('div'); icon.className = 'iconbubble';
    icon.append(iconCanvas(d.icon || c.id, 44));
    const tag = document.createElement('div'); tag.className = 'tagline'; tag.textContent = c.label || 'BERKAH';
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = d.name;
    const ds = document.createElement('div'); ds.className = 'ds'; ds.textContent = d.desc;
    card.append(key, icon, tag, nm, ds);
    card.addEventListener('click', () => pickChoice(i));
    box.appendChild(card);
  });
  showOverlay('levelup');
}

function pickChoice(i) {
  if (game.state !== ST.LEVELUP || !game.choices[i]) return;
  game.applyChoice(game.choices[i]);
  refreshWeaponBar();
  if (game.state === ST.PLAY) showOverlay(null);
  else showLevelUp();
}

function refreshWeaponBar() {
  const bar = $('weapons');
  bar.innerHTML = '';
  for (const w of game.weapons) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.appendChild(iconCanvas(w.id, 30));
    const lv = document.createElement('em'); lv.textContent = w.level;
    slot.appendChild(lv);
    bar.appendChild(slot);
  }
}

function pause() { game.state = ST.PAUSE; showOverlay('pause'); }
function resume() { game.state = ST.PLAY; showOverlay(null); }

// ——— buttons ———
$('play').addEventListener('click', () => { ensureAudio(); toSlots(); });
$('slotsback').addEventListener('click', () => showMenu('title'));
$('resume').addEventListener('click', resume);
$('surrender').addEventListener('click', () => { game.surrender(); endRun(false); });
$('pausebtn').addEventListener('click', () => { if (game.state === ST.PLAY) pause(); });
$('mute').addEventListener('click', () => {
  ensureAudio();
  settings.muted = toggleMuted();
  $('mute').classList.toggle('muted', settings.muted);
  saveSettings();
});

// ——— keyboard shortcuts ———
input.onAction.push((code) => {
  if (code === 'KeyM') { $('mute').click(); return; }
  const go = code === 'Space' || code === 'Enter';
  if (screen === 'title' && go) { $('play').click(); return; }
  if (screen === 'results' && go) { $('tocamp').click(); return; }
  if (game.state === ST.PLAY && code === 'Escape') { pause(); return; }
  if (game.state === ST.PAUSE && code === 'Escape') { resume(); return; }
  if (game.state === ST.LEVELUP && code.startsWith('Digit')) {
    pickChoice(Number(code.slice(5)) - 1);
  }
});

let hudT = 0;

// ——— main loop ———
function tick() {
  simT += STEP;
  pollMove();
  const pressed = consumePressed(); // one-shot actions go to the first step of the frame
  const aimAt = !input.touch && input.mouse.active ? R.screenToWorld(input.mouse.x, input.mouse.y) : null;
  game.intent = { move: { x: input.x, y: input.y }, aimAt, dodge: pressed.has('dodge') };
  const wasPlaying = game.state === ST.PLAY;
  game.step(STEP);
  // react only on the PLAY -> LEVELUP/OVER transition; rebuilding the cards
  // every frame swaps the DOM between mousedown and mouseup and kills clicks
  if (!wasPlaying) return false;
  if (game.state === ST.LEVELUP) { showLevelUp(); refreshWeaponBar(); return true; }
  if (game.state === ST.OVER) { $('dmg').style.opacity = 0; endRun(true); return true; }
  return false;
}

function frame(dt) {
  R.draw(game, simT);
  hudT += dt;
  if (hudT > 0.12 && game.state !== ST.TITLE) { hudT = 0; updateHUD(game); }
  const playing = game.state === ST.PLAY;
  if (playing) updateActions(game);
  updateJoystick(playing);
  window.__SCENE_READY__ = true;
}

showMenu('title');
const loop = startLoop(tick, frame);

// ——— screenshot / debug hooks ———
window.__seek = (t) => {
  const v = Number(t) || 0;
  if (game.state === ST.TITLE) {
    game.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats }, weapon: CLASSES.warrior.protoWeapon });
    showOverlay(null);
  }
  game.intent = { move: { x: 0.6, y: 0.35 }, aimAt: null, dodge: false };
  const n = Math.floor(v / STEP);
  for (let i = 0; i < n && game.state === ST.PLAY; i++) {
    simT += STEP;
    game.step(STEP);
    if (game.state === ST.LEVELUP) game.applyChoice(game.choices[0]);
  }
  R.draw(game, simT);
};
window.__play = () => { loop.resetClock(); };
const T_PARAM = new URLSearchParams(location.search).get('t');
if (T_PARAM !== null) window.__seek(T_PARAM);
window.__game = game;
window.__input = input; // debug/test hook: lets scripts drive the joystick
