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
import { createCharacter, applyTrip, finalStats, currentHp, usePotion, addExp, allocate } from './meta/character.js';
import { innRest, buyPotion, setBelt } from './meta/shop.js';
import { isHeal, POTIONS, POTION_IDS } from './data/potions.js';
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
const talkIdx = {};    // townsfolk: which line they say next (npc id → index)
let townSaveT = 0;
let tripAttrs = {};    // points spent in the dungeon, saved with the trip result

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
  $('charbtn').classList.toggle('hidden', !controls);
  $('actions').classList.toggle('hidden', !controls);
  $('belt').classList.toggle('hidden', !controls);
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

// overlay during a run (pause / charpanel); null = playing
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
  if (npc.role === 'talk' && screen !== 'npc') talkIdx[npc.id] = (talkIdx[npc.id] ?? -1) + 1; // next line each chat
  townNpc = npc;
  syncHp();
  renderNpc($('npc'), npc, {
    char: current, hp: town.hp, maxHp: town.maxHp, message,
    line: npc.role === 'talk' ? npc.lines[(talkIdx[npc.id] ?? 0) % npc.lines.length] : null,
    onInn: () => serve(innRest, 'Kamu tidur nyenyak. HP pulih penuh!'),
    onBuyPotion: (id) => serve((c, now) => buyPotion(c, id, now), `${POTIONS[id].name}, segar dari kuali. Hehehe.`),
    onBelt: (slot) => serve((c, now) => setBelt(c, slot, nextBeltPotion(c, slot), now), null),
    onEnter: enterDungeon,
    onClose: closeTownOverlay,
  });
  if (screen !== 'npc') { ensureAudio(); sfx.pickCard(); }
  showTownOverlay('npc');
}

const REFUSE = { full: { inn: 'HP-mu sudah penuh.', potion: 'Tasmu sudah penuh ramuan itu.' }, gold: 'Koinmu belum cukup.' };

// Belt slot cycles: empty → each potion type in turn → empty.
function nextBeltPotion(char, slot) {
  const order = [null, ...POTION_IDS];
  return order[(order.indexOf(char.belt[slot]) + 1) % order.length];
}

// Runs a shop action (char, now) → { ok, char } | { ok: false, reason }, saves, redraws the dialog.
async function serve(action, okText) {
  const r = action(current, Date.now());
  if (!r.ok) {
    openNpc(townNpc, { text: r.reason === 'gold' ? REFUSE.gold : REFUSE.full[townNpc.role], ok: false });
    return;
  }
  current = r.char;
  town.hp = currentHp(current);
  if (okText) sfx.heart(); else sfx.pickCard();
  const err = await saveCurrent();
  openNpc(townNpc, err ? { text: `Gagal menyimpan: ${err}`, ok: false } : okText && { text: okText, ok: true });
  updateTownHUD(current, town);
}

function closeTownOverlay() {
  townNpc = null;
  showTownOverlay(null);
}

// The character as it stands mid-trip: EXP so far and points spent in the dungeon.
function tripChar() {
  const { char } = addExp(current, game.expGained);
  return allocate(char, tripAttrs, char.updatedAt) || char;
}

function openCharPanel() {
  if (scene === 'run') {
    game.state = ST.PAUSE;
    renderCharPanel($('charpanel'), tripChar(), game.stats.hp, { onClose: resume, onAllocate: allocateInRun });
    showOverlay('charpanel');
    return;
  }
  syncHp();
  renderCharPanel($('charpanel'), current, town.hp, { onClose: closeTownOverlay, onAllocate: allocateInTown });
  showTownOverlay('charpanel');
}

async function allocateInTown(add) {
  const next = allocate(current, add, Date.now());
  if (!next) return;
  current = next;
  const s = finalStats(current);
  town.maxHp = s.maxHp; town.moveSpd = s.moveSpd;
  sfx.pickCard();
  await saveCurrent();
  updateTownHUD(current, town);
  openCharPanel();
}

// In the dungeon the save stays as it was at the gate (spec §13.4); the points
// are applied to the run now and written with the trip result.
function allocateInRun(add) {
  if (!allocate(tripChar(), add, 0)) return;
  for (const [k, n] of Object.entries(add)) tripAttrs[k] = (tripAttrs[k] || 0) + n;
  const c = tripChar();
  game.setStats(finalStats(c));
  game.luk = c.attrs.luk;
  sfx.pickCard();
  openCharPanel();
}

function townPause() {
  $('surrender').classList.add('hidden');
  $('toslots').classList.remove('hidden');
  $('pausenote').classList.add('hidden');
  showTownOverlay('pause');
}

// Town: only healing potions do anything (buffs are for the dungeon).
async function drinkInTown(slot) {
  syncHp();
  const id = current.belt[slot];
  const next = usePotion(current, id, Date.now());
  if (next === current) {
    toast(!id ? 'Slot sabuk kosong.' : current.potions[id] <= 0 ? 'Tidak punya ramuan itu.'
      : !isHeal(id) ? 'Ramuan ini hanya berguna di dungeon.' : 'HP sudah penuh.');
    return;
  }
  current = next;
  town.hp = currentHp(current);
  sfx.heart();
  updateTownHUD(current, town);
  await saveCurrent();
}

// ——— dungeon ———
// The character is saved at the gate; closing the browser mid-dungeon returns
// to this state (spec §13.4).
async function enterDungeon(floor = 1) {
  syncHp();
  await saveCurrent();
  townNpc = null;
  scene = 'run';
  ensureAudio(); startMusic();
  const stats = finalStats(current);
  game.start({
    classId: current.classId, stats, hp: currentHp(current), potions: current.potions, belt: current.belt, floor,
    level: current.level, exp: current.exp, luk: current.attrs.luk,
  });
  tripAttrs = {};
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
    attrs: tripAttrs, items: r.items,
  };
  const newRecord = trip.floor > current.records.bestFloor;
  const applied = applyTrip(current, trip, Date.now());
  current = applied.char; // keep progress in memory even if the write fails
  const saveError = await saveCurrent();
  renderResults($('results'), { ...applied, trip, newRecord, saveError },
    { onContinue: () => enterTown(current, 'gate') });
  showMenu('results');
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
$('charbtn').addEventListener('click', () => {
  if ((scene === 'town' && screen === null) || (scene === 'run' && game.state === ST.PLAY)) openCharPanel();
});
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
  if (code === 'KeyC' && game.state === ST.PLAY) { openCharPanel(); return; }
  if (code === 'KeyC' && screen === 'charpanel') { resume(); return; }
  if (screen === 'charpanel' && code === 'Escape') { resume(); return; }
  if (game.state === ST.PLAY && code === 'Escape') { pause(); return; }
  if (game.state === ST.PAUSE && code === 'Escape') { resume(); return; }
});

let hudT = 0;

// ——— main loop ———
function tickTown(pressed) {
  if (screen !== null) return;
  stepTown(town, { move: { x: input.x, y: input.y } }, STEP);
  if (town.entered) sfx.dodge();
  if ((pressed.has('skill2') || pressed.has('talk')) && town.near) { openNpc(town.near); return; }
  const slot = potionSlot(pressed);
  if (slot >= 0) drinkInTown(slot);
  // regen is only written to the save now and then
  townSaveT += STEP;
  if (townSaveT > 10) { townSaveT = 0; syncHp(); saveCurrent(); }
}

// belt slot pressed this frame (keys 1–4 / R / belt buttons), or -1
function potionSlot(pressed) {
  for (let i = 0; i < 4; i++) if (pressed.has(`pot${i}`)) return i;
  return -1;
}

function tickRun(pressed) {
  const auto = settings.autoAttack; // auto mode: attack + aim on their own (spec §5.1)
  const aimAt = !auto && !input.touch && input.mouse.active ? R.screenToWorld(input.mouse.x, input.mouse.y) : null;
  const attack = input.touch ? input.attackHeld : input.mouse.down;
  game.intent = {
    move: { x: input.x, y: input.y }, aimAt, attack, auto,
    dodge: pressed.has('dodge'), skill1: pressed.has('skill1'), skill2: pressed.has('skill2'), potion: potionSlot(pressed),
  };
  const wasPlaying = game.state === ST.PLAY;
  game.step(STEP);
  // react only on the PLAY -> OVER transition
  if (!wasPlaying) return false;
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
