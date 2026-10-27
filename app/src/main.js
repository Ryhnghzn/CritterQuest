// Bootstrap: opens the save, wires scenes, renderers, input, audio and the DOM
// screens together and runs the fixed-timestep loop.
// Flow (spec §13.1): Judul → Pilih Slot → [Buat Karakter] → KOTA ⇄ DUNGEON → Hasil Perjalanan → KOTA.
// Scenes: 'menu' (title/slots/create/results over the town backdrop), 'town', 'run'.
import { Game, ST } from './run/run.js';
import { View } from './render/view.js';
import { Lighting } from './render/light.js';
import { Renderer } from './render/world.js';
import { TownRenderer } from './render/town.js';
import { CLASSES, CLASS_BASE } from './data/classes.js';
import { iconCanvas } from './art/sprites.js';
import { input, pollMove, consumePressed } from './core/input.js';
import { ensureAudio, startMusic, stopMusic, toggleMuted, setMuted, sfx } from './core/audio.js';
import { STEP, startLoop } from './core/loop.js';
import { openStore } from './meta/save.js';
import { createCharacter, applyTrip, finalStats, currentHp, usePotion } from './meta/character.js';
import { innRest, buyPotion } from './meta/shop.js';
import { createTown, stepTown } from './town/town.js';
import { showScreen, confirmDialog } from './ui/screens.js';
import { renderSlots } from './ui/slots.js';
import { renderCreate } from './ui/create.js';
import { renderResults } from './ui/results.js';
import { renderNpc } from './ui/npc.js';
import { renderCharPanel } from './ui/charpanel.js';
import { updateHUD, updateActions, updateTownHUD } from './ui/hud.js';
import { setupTouch, updateJoystick } from './ui/touch.js';

const $ = (id) => document.getElementById(id);
const view = new View($('game'));
const lighting = new Lighting(view);
const R = new Renderer(view, lighting);
const TR = new TownRenderer(view, lighting);
const game = new Game();
setupTouch();

let simT = 0;
let scene = 'menu';
let screen = 'title';  // visible DOM screen, null = playing/walking
let slots = [];        // last store.loadSlots()
let current = null;    // character being played (save data)
let town = null;       // town/town.js state while in town
let townNpc = null;    // NPC whose dialog is open
let townSaveT = 0;

// ——— save + settings ———
const store = await openStore();
if (!store.persistent) $('nosave').classList.remove('hidden');

function legacyMuted() {
  try { return localStorage.getItem('cs-muted') === '1'; } catch (_) { return false; }
}
const settings = (await store.loadSettings()) ?? { version: 2, muted: legacyMuted(), lastSlot: 0, autoAttack: false };
setMuted(settings.muted);
$('mute').classList.toggle('muted', settings.muted);

function renderAuto() {
  $('autobtn').classList.toggle('on', settings.autoAttack);
  $('autobtn').setAttribute('aria-pressed', String(settings.autoAttack));
}
renderAuto();

function toggleAuto() {
  settings.autoAttack = !settings.autoAttack;
  renderAuto();
  saveSettings();
}

function saveSettings() {
  store.saveSettings(settings).catch(() => { /* settings are a convenience; ignore */ });
}

let toastTimer = 0;
function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

// Writes the character; a failed write keeps playing from memory and says so.
async function saveCurrent() {
  try { await store.saveSlot(current); return null; } catch (e) { toast(`Gagal menyimpan: ${e.message}`); return e.message; }
}

// ——— scene + HUD visibility ———
// hud: 'none' | 'town' | 'run'; controls: action buttons usable right now
function setUI(hud, controls) {
  $('hud').classList.toggle('hidden', hud !== 'run');
  $('townhud').classList.toggle('hidden', hud !== 'town');
  $('pausebtn').classList.toggle('hidden', !controls);
  $('autobtn').classList.toggle('hidden', !controls || hud !== 'run');
  $('charbtn').classList.toggle('hidden', !controls || hud !== 'town');
  $('actions').classList.toggle('hidden', !controls);
  document.body.classList.toggle('playing', controls && hud === 'run');
  document.body.classList.toggle('intown', hud === 'town');
  if (!controls || hud !== 'town') $('prompt').classList.add('hidden');
}

function showMenu(id) {
  scene = 'menu';
  game.state = ST.TITLE;
  screen = showScreen(id);
  setUI('none', false);
}

// overlay during a run (levelup / pause); null = playing
function showOverlay(id) {
  screen = showScreen(id);
  setUI('run', id === null);
}

// overlay in town (npc / charpanel / pause); null = walking
function showTownOverlay(id) {
  screen = showScreen(id);
  setUI('town', id === null);
}

// ——— menus ———
async function toSlots() {
  stopMusic();
  if (scene === 'town') { syncHp(); await saveCurrent(); }
  slots = await store.loadSlots();
  renderSlots($('slotlist'), slots, { onOpen: openSlot, onCreate: toCreate, onDelete: deleteSlot });
  showMenu('slots');
}

function openSlot(slot) {
  const e = slots[slot];
  if (e.status === 'ok') enterTown(e.data, 'spawn');
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
  enterTown(char, 'spawn');
}

async function deleteSlot(slot) {
  const e = slots[slot];
  const what = e.status === 'ok' ? `${e.data.name} (LV ${e.data.level})` : `data rusak di slot ${slot + 1}`;
  if (!(await confirmDialog(`Hapus ${what}? Tidak bisa dibatalkan.`, 'Hapus'))) return;
  await store.deleteSlot(slot);
  await toSlots();
}

// ——— town ———
function enterTown(char, at) {
  current = char;
  settings.lastSlot = char.slot;
  saveSettings();
  stopMusic();
  const s = finalStats(char);
  town = createTown({ moveSpd: s.moveSpd, hp: currentHp(char), maxHp: s.maxHp, at });
  scene = 'town';
  game.state = ST.TITLE;
  showTownOverlay(null);
  updateTownHUD(current, town);
}

// Copies the live town HP into the character (whole number, null when full).
function syncHp() {
  const hp = Math.floor(town.hp);
  current = { ...current, hp: hp >= town.maxHp ? null : hp };
}

function openNpc(npc, message = null) {
  townNpc = npc;
  syncHp();
  renderNpc($('npc'), npc, {
    char: current, hp: town.hp, maxHp: town.maxHp, message,
    onInn: () => serve(innRest, 'Kamu tidur nyenyak. HP pulih penuh!'),
    onBuyPotion: () => serve(buyPotion, 'Satu ramuan merah untukmu. Hehehe.'),
    onEnter: enterDungeon,
    onClose: closeTownOverlay,
  });
  if (screen !== 'npc') { ensureAudio(); sfx.pickCard(); }
  showTownOverlay('npc');
}

const REFUSE = { full: { inn: 'HP-mu sudah penuh.', potion: 'Tasmu sudah penuh ramuan.' }, gold: 'Koinmu belum cukup.' };

async function serve(action, okText) {
  const r = action(current, Date.now());
  if (!r.ok) {
    openNpc(townNpc, { text: r.reason === 'gold' ? REFUSE.gold : REFUSE.full[townNpc.role], ok: false });
    return;
  }
  current = r.char;
  town.hp = currentHp(current);
  sfx.heart();
  const err = await saveCurrent();
  openNpc(townNpc, { text: err ? `Gagal menyimpan: ${err}` : okText, ok: !err });
  updateTownHUD(current, town);
}

function closeTownOverlay() {
  townNpc = null;
  showTownOverlay(null);
}

function openCharPanel() {
  syncHp();
  renderCharPanel($('charpanel'), current, town.hp, { onClose: closeTownOverlay });
  showTownOverlay('charpanel');
}

function townPause() {
  $('surrender').classList.add('hidden');
  $('toslots').classList.remove('hidden');
  $('pausenote').classList.add('hidden');
  showTownOverlay('pause');
}

async function drinkInTown() {
  syncHp();
  const next = usePotion(current, Date.now());
  if (next === current) { toast(current.potions <= 0 ? 'Tidak punya ramuan.' : 'HP sudah penuh.'); return; }
  current = next;
  town.hp = currentHp(current);
  sfx.heart();
  updateTownHUD(current, town);
  await saveCurrent();
}

// ——— dungeon ———
// The character is saved at the gate; closing the browser mid-dungeon returns
// to this state (spec §13.4).
async function enterDungeon() {
  syncHp();
  await saveCurrent();
  townNpc = null;
  scene = 'run';
  ensureAudio(); startMusic();
  const stats = finalStats(current);
  game.start({ classId: current.classId, stats, hp: currentHp(current), potions: current.potions });
  CLASSES[current.classId].skills.forEach((sk, i) => {
    const btn = $(i ? 'act-e' : 'act-q');
    btn.querySelector('.ic').replaceChildren(iconCanvas(sk.id, 30));
    btn.title = `${sk.name} (${i ? 'E' : 'Q'})`;
  });
  R.avatar = { classId: current.classId, look: current.look };
  $('surrender').classList.remove('hidden');
  $('toslots').classList.add('hidden');
  $('pausenote').classList.remove('hidden');
  showOverlay(null);
}

// End of a trip — gold portal (died = false), death or giving up (died = true):
// apply rewards/penalty, auto-save, show Hasil Perjalanan (spec §13.4).
async function endRun(died) {
  screen = 'ending';
  stopMusic();
  const r = game.result();
  const trip = {
    exp: r.exp, gold: r.gold, kills: r.kills, bossKills: r.bossKills,
    floor: r.floor, cleared: r.cleared && !died, died, hp: game.stats.hp, potions: game.potions,
  };
  const newRecord = trip.floor > current.records.bestFloor;
  const { char, levelsGained, goldLost } = applyTrip(current, trip, Date.now());
  current = char; // keep progress in memory even if the write fails
  const saveError = await saveCurrent();
  renderResults($('results'), { char, trip, levelsGained, goldLost, newRecord, saveError },
    { onContinue: () => enterTown(current, 'gate') });
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
  if (game.state === ST.PLAY) showOverlay(null);
  else showLevelUp();
}

function pause() { game.state = ST.PAUSE; showOverlay('pause'); }
function resume() {
  if (scene === 'town') { closeTownOverlay(); return; }
  game.state = ST.PLAY; showOverlay(null);
}

// ——— buttons ———
$('play').addEventListener('click', () => { ensureAudio(); toSlots(); });
$('slotsback').addEventListener('click', () => showMenu('title'));
$('resume').addEventListener('click', resume);
$('surrender').addEventListener('click', () => { game.surrender(); endRun(true); });
$('toslots').addEventListener('click', toSlots);
$('pausebtn').addEventListener('click', () => {
  if (scene === 'run' && game.state === ST.PLAY) pause();
  else if (scene === 'town' && screen === null) townPause();
});
$('autobtn').addEventListener('click', toggleAuto);
$('charbtn').addEventListener('click', () => { if (scene === 'town' && screen === null) openCharPanel(); });
$('prompt').addEventListener('click', () => { if (town?.near && screen === null) openNpc(town.near); });
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
  if (scene === 'town') {
    if (code === 'Escape') { if (screen === null) townPause(); else closeTownOverlay(); return; }
    if (code === 'KeyC') { if (screen === null) openCharPanel(); else if (screen === 'charpanel') closeTownOverlay(); return; }
    if (code === 'Enter' && screen === null && town.near) openNpc(town.near);
    return;
  }
  if (code === 'KeyF' && game.state === ST.PLAY) { toggleAuto(); return; }
  if (game.state === ST.PLAY && code === 'Escape') { pause(); return; }
  if (game.state === ST.PAUSE && code === 'Escape') { resume(); return; }
  if (game.state === ST.LEVELUP && code.startsWith('Digit')) {
    pickChoice(Number(code.slice(5)) - 1);
  }
});

let hudT = 0;

// ——— main loop ———
function tickTown(pressed) {
  if (screen !== null) return;
  stepTown(town, { move: { x: input.x, y: input.y } }, STEP);
  if ((pressed.has('skill2') || pressed.has('talk')) && town.near) { openNpc(town.near); return; }
  if (pressed.has('potion')) drinkInTown();
  // regen is only written to the save now and then
  townSaveT += STEP;
  if (townSaveT > 10) { townSaveT = 0; syncHp(); saveCurrent(); }
}

function tickRun(pressed) {
  const auto = settings.autoAttack; // auto mode: attack + aim on their own (spec §5.1)
  const aimAt = !auto && !input.touch && input.mouse.active ? R.screenToWorld(input.mouse.x, input.mouse.y) : null;
  const attack = input.touch ? input.attackHeld : input.mouse.down;
  game.intent = {
    move: { x: input.x, y: input.y }, aimAt, attack, auto,
    dodge: pressed.has('dodge'), skill1: pressed.has('skill1'), skill2: pressed.has('skill2'), potion: pressed.has('potion'),
  };
  const wasPlaying = game.state === ST.PLAY;
  game.step(STEP);
  // react only on the PLAY -> LEVELUP/OVER transition; rebuilding the cards
  // every frame swaps the DOM between mousedown and mouseup and kills clicks
  if (!wasPlaying) return false;
  if (game.state === ST.LEVELUP) { showLevelUp(); return true; }
  if (game.state === ST.OVER) { $('dmg').style.opacity = 0; endRun(!game.returned); return true; }
  return false;
}

function tick() {
  simT += STEP;
  pollMove();
  const pressed = consumePressed(); // one-shot actions go to the first step of the frame
  if (scene === 'town') { tickTown(pressed); return false; }
  if (scene === 'run') return tickRun(pressed);
  return false;
}

function frame(dt) {
  hudT += dt;
  if (scene === 'run') {
    R.draw(game, simT);
    if (hudT > 0.12 && game.state !== ST.TITLE) { hudT = 0; updateHUD(game); }
    if (game.state === ST.PLAY) updateActions(game);
  } else {
    TR.draw(scene === 'town' ? town : null, simT, current && { classId: current.classId, look: current.look });
    if (scene === 'town') {
      if (hudT > 0.12) { hudT = 0; updateTownHUD(current, town); }
      const near = screen === null ? town.near : null;
      $('prompt').classList.toggle('hidden', !near);
      document.body.classList.toggle('near', !!near);
      if (near) $('prompttext').textContent = `Bicara dengan ${near.name}`;
    }
  }
  updateJoystick((scene === 'run' && game.state === ST.PLAY) || (scene === 'town' && screen === null));
  window.__SCENE_READY__ = true;
}

showMenu('title');
const loop = startLoop(tick, frame);

// ——— screenshot / debug hooks ———
window.__seek = (t) => {
  const v = Number(t) || 0;
  if (game.state === ST.TITLE) {
    scene = 'run';
    game.start({ classId: 'warrior', stats: { ...CLASS_BASE, ...CLASSES.warrior.stats } });
    showOverlay(null);
  }
  game.intent = { move: { x: 0.6, y: 0.35 }, aimAt: null, dodge: false, attack: true };
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
window.__town = () => town; // debug/test hook: live town state
window.__char = () => current;
