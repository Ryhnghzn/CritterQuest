// Bootstrap: opens the save, wires the game, renderer, input, audio and the
// DOM screens together and runs the fixed-timestep loop.
// Flow (spec §3): Judul → Pilih Slot → Buat Karakter / Kemah → Ronde → Hasil → Kemah.
import { Game, ST } from './run/run.js';
import { Renderer } from './render/world.js';
import { CRITTERS, CLASSES } from './data/classes.js';
import { iconCanvas } from './art/sprites.js';
import { input, pollMove, input as inp } from './core/input.js';
import { ensureAudio, startMusic, stopMusic, toggleMuted, setMuted, sfx } from './core/audio.js';
import { STEP, startLoop } from './core/loop.js';
import { openStore } from './meta/save.js';
import { createCharacter, applyRunResult } from './meta/character.js';
import { showScreen, confirmDialog, fmtTime } from './ui/screens.js';
import { renderSlots } from './ui/slots.js';
import { renderCreate } from './ui/create.js';
import { renderCamp } from './ui/camp.js';
import { renderResults } from './ui/results.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const game = new Game();
const R = new Renderer(canvas);

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
  $('hud').classList.add('hidden');
  $('weapons').classList.add('hidden');
}

// overlay during a run (levelup / pause); null = playing
function showOverlay(id) {
  screen = showScreen(id);
  $('hud').classList.remove('hidden');
  $('weapons').classList.toggle('hidden', id !== null && id !== 'levelup');
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
  // langkah 2: the run still plays a prototype critter mapped from the class
  game.start(CRITTERS.find((c) => c.id === CLASSES[current.classId].protoCritter));
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
$('mute').addEventListener('click', () => {
  ensureAudio();
  settings.muted = toggleMuted();
  $('mute').classList.toggle('muted', settings.muted);
  saveSettings();
});

// ——— keyboard shortcuts ———
inp.onAction.push((code) => {
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

// ——— HUD (DOM, updated ~10x/s is plenty) ———
let hudT = 0;
function updateHUD() {
  const s = game.stats;
  $('hpfill').style.transform = `scaleX(${Math.max(0, s.hp / s.maxHp)})`;
  $('hptext').textContent = `${Math.ceil(Math.max(0, s.hp))} / ${Math.round(s.maxHp)}`;
  $('xpfill').style.transform = `scaleX(${Math.min(1, game.xp / game.xpNeed)})`;
  $('lvltext').textContent = `LV ${game.level}`;
  $('time').textContent = fmtTime(game.time);
  $('kills').textContent = game.kills;
  $('best').textContent = fmtTime(Math.max(game.best.time, game.time));
  $('dmg').style.opacity = game.flash > 0 ? 0.9 : 0;
  const b = $('banner');
  if (game.bannerT > 0 && game.banner) { b.textContent = game.banner; b.style.opacity = 1; }
  else b.style.opacity = 0;
}

// ——— main loop ———
function tick() {
  simT += STEP;
  pollMove();
  game.moveVec = { x: input.x, y: input.y };
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
  if (hudT > 0.12 && game.state !== ST.TITLE) { hudT = 0; updateHUD(); }
  window.__SCENE_READY__ = true;
}

showMenu('title');
const loop = startLoop(tick, frame);

// ——— screenshot / debug hooks ———
window.__seek = (t) => {
  const v = Number(t) || 0;
  if (game.state === ST.TITLE) { game.start(CRITTERS[0]); showOverlay(null); }
  game.moveVec = { x: 0.6, y: 0.35 };
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
