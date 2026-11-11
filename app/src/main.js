// Bootstrap: opens the save, wires scenes, renderers, input, audio and the DOM
// screens together and runs the fixed-timestep loop.
// Flow (spec §13.1): Judul → Pilih Slot → [Buat Karakter] → KOTA ⇄ DUNGEON → Hasil Perjalanan → KOTA.
// Scenes: 'menu' (title/slots/create/results over the town backdrop), 'town', 'run'.
import { ENEMIES } from './data/enemies.js';
import { setLang, getLang, applyDom, tr, t, num } from './i18n.js';
import { localizeData } from './i18n/data-en.js';
import { Game, ST } from './run/run.js';
import { View } from './render/view.js';
import { Lighting } from './render/light.js';
import { Renderer } from './render/world.js';
import { TownRenderer } from './render/town.js';
import './ui/theme-dark.css'; // dark UI theme (plan "Tampilan 2.5D" §5)
import { Dungeon25 } from './render3d/dungeon.js';
import { Field25 } from './render3d/field.js';
import { Town25 } from './render3d/town.js';
import { Stage, setSharpScale } from './render3d/stage.js';
import { SHARP_SCALE, ZOOM_START, CAM_SENS } from './data/settings.js';
import { renderSettings } from './ui/settings.js';
import { freshSettings } from './meta/schema.js';
import { CLASSES, CLASS_BASE } from './data/classes.js';
import { input, pollMove, consumePressed, cancelAim } from './core/input.js';
import { needsAim, aimShape } from './run/aim.js';
import { drawAim } from './render/aim.js';
import { ensureAudio, playMusic, stopMusic, toggleMuted, setMuted, setVolumes, sfx } from './core/audio.js';
import { STEP, startLoop } from './core/loop.js';
import { openStore } from './meta/save.js';
import { createCharacter, applyTrip, finalStats, currentHp, usePotion, addExp, allocate, spentPoints } from './meta/character.js';
import { innRest, buyPotion, setBelt, buyChest, sellItems, buyUpgrade, respec, respecPrice, changeLook } from './meta/shop.js';
import { enhance, reroll, salvage, socketGem, unsocket, combineGems } from './meta/forge.js';
import { codexFx } from './meta/collection.js';
import { activeMountSetup, mountFx, grantMount, buyMount, buySkin, setActiveMount, mountGains } from './meta/stable.js';
import { MOUNT_IDS } from './data/mounts.js';
import { mountGainText } from './ui/stable.js';
import { MAJESTIC_BY_ID } from './render/world.js';
import { claimBounty, rerollBounty, buyWithMarks, takeBounty, dropBounty } from './meta/bounties.js';
import { equip as equipSkill, raise, setUlt, wornIds, equippedUlt, umumFx, passiveFx, mergeFx, respecSp, spRespecPrice, spFree, jobOf, newJob, pickJob, changeJob, jobChangePrice } from './meta/jobs.js';
import { MATS, GEMS, GEM_TIER_NAMES } from './data/forge.js';
import { UPGRADES } from './data/shop.js';
import { equip, unequip, discard, gearEffects, dollGear } from './meta/gear.js';
import { itemName, makeItem, statText, gemName } from './meta/itemgen.js';
import { renderCheat, CHEAT_ON } from './ui/cheat.js';
import { showChestOpen, showMythicCard, showRewardPop } from './ui/reveal.js';
import { showLoading, loadingStep, hideLoading } from './ui/loading.js';
import { renderTitle } from './ui/title.js';
import { drawCampfire } from './art/titlebg.js';
import { UNIQUES, SLOT_IDS, LEGENDARY, RARITIES } from './data/items.js';
import { POTION_MAX } from './data/potions.js';
import { CHAR_LEVEL_MAX, INVENTORY_MAX, POINTS_PER_LEVEL, ULT } from './data/balance.js';
import { DUNGEONS, dungeonById } from './data/dungeons.js';
import { startFloor, makeElite } from './run/dungeon.js';
import { freshMount } from './run/mount.js';
import { GAME_MIN_PER_SEC } from './data/time.js';
import { FIELD, TREASURE, TOWNS, TOWN_IDS, REGIONS, regionById, regionOfDungeon, regionOpen } from './data/world.js';
import { WORLD } from './data/worldmap.js';
import { applyField, fieldDeath, encodeFog, decodeFog, explored, visitTown, teleport, regionGates, takeExpedition, claimExpedition, dropExpedition } from './meta/world.js';
import { buyDisplay, buyNight, buyMats, isNight } from './meta/market.js';
import { deposit, withdraw } from './meta/stash.js';
import { phaseOf } from './meta/clock.js';
import { drawRegionMap } from './render/regionmap.js';
import { isHeal, POTIONS, POTION_IDS } from './data/potions.js';
import { createTown, stepTown } from './town/town.js';
import { townMapInfo, playerSpot, townLegend } from './town/townmap.js';
import { townDef } from './data/towns.js';
import { drawTownMap } from './render/townmap.js';
import { renderTownLegend } from './ui/townmap.js';
import { showScreen, confirmDialog } from './ui/screens.js';
import { renderSlots } from './ui/slots.js';
import { renderCreate } from './ui/create.js';
import { renderResults } from './ui/results.js';
import { renderDeath } from './ui/death.js';
import { DEATH } from './data/dungeon.js';
import { renderEnding } from './ui/ending.js';
import { renderNpc, renderDungeonGate } from './ui/npc.js';
import { renderCharPanel, setCharTab } from './ui/charpanel.js';
import { stepText } from './ui/journal.js';
import { bountyText } from './ui/board.js';
import { setEvents, eventPoint } from './run/questev.js';
import { playCutscene, cutscenePlaying } from './ui/cutscene.js';
import { SCENES, momentScene } from './data/scenes.js';
import { talkOffers, npcMarks, questTalk, questTarget, activeQuests, syncQuests, shards, hiddenIn, fieldQuests, abandonQuest, trackQuest, questDef } from './meta/quests.js';
import { SHARDS, DROP_ITEMS } from './data/quests.js';
import { updateHUD, updateActions, updateTownHUD, updateClock, updateQuestTracker, updatePointsBadge } from './ui/hud.js';
import { setupTouch, updateJoystick } from './ui/touch.js';
import { FpsWatch, activeQuality } from './run/vfx.js';
import { registerOffline } from './core/pwa.js';
import { setRarity } from './art/auratier.js';
import { QUALITY, PALETTES } from './data/fx.js';
import { pinPage } from './core/pinpage.js';
import { setTouchDots } from './core/touchdot.js';

const $ = (id) => document.getElementById(id);
const view = new View($('game'));
const lighting = new Lighting(view);
const R = new Renderer(view, lighting);
const TR = new TownRenderer(view, lighting);
// 2.5D view (plan "Tampilan 2.5D"): dungeons for now; ?2d keeps the flat view
const STAGE = new Stage(view.c); // one WebGL canvas shared by the 2.5D scenes
const R3 = new Dungeon25(view, R, STAGE);
const R4 = new Field25(view, R, STAGE);
const T3 = new Town25(view, TR, STAGE);
const URL_2D = new URLSearchParams(location.search).has('2d');
let FLAT = URL_2D; // the flat 2D view: ?2d or Settings → Tampilan 2D (applySettings)
const runView = () => (FLAT ? R : game.field ? R4 : game.room ? R3 : R);
function drawRunView(t) {
  T3.hide(); const r = runView(); if (r !== R3) R3.hide(); if (r !== R4) R4.hide(); r.draw(game, t);
  drawAimMarker(r, t);
}
// Aimed casting (spec §37): with a mouse, a skill that needs a direction or a spot waits for a
// left click; a skill still cooling down, without its charge, or in auto mode fires as before.
function aimedSkill(action) { return action === 'ult' ? game.ult : game.skillDefs?.[Number(action.slice(5)) - 1]; }
input.aimFilter = (action) => {
  if (scene !== 'run' || game.state !== ST.PLAY || settings.autoAttack || !input.mouse.active) return false;
  const s = aimedSkill(action);
  if (!needsAim(s)) return false;
  if (action === 'ult') return game.ultCharge >= ULT.max;
  return game.skillCd[Number(action.slice(5)) - 1] <= 0;
};
function drawAimMarker(r, t) {
  const a = input.aim;
  document.body.classList.toggle('aiming', !!a);
  if (!a) return;
  if (scene !== 'run' || game.state !== ST.PLAY || !input.mouse.active) { cancelAim(); return; }
  const s = aimedSkill(a.action);
  if (!s) { cancelAim(); return; }
  const m = r.screenToWorld(input.mouse.x, input.mouse.y);
  const toScreen = r === R
    ? (x, y) => ({ x: (x - R.camX) * view.zoom + innerWidth / 2, y: (y - R.camY) * view.zoom + innerHeight / 2 })
    : (x, y) => STAGE.project(x, y, 0);
  drawAim(view.ctx, aimShape(s, game.px, game.py, m.x, m.y), toScreen, view.c.width / innerWidth, t);
}
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
let fieldSaveT = 0;    // seconds since the last save in a region (spec §25.1)
let minimapT = 0;
let dungeonReturn = null; // { region, x, y }: a dungeon entered from a gate in a region (spec §25.5)
let worldClock = 0;    // in-game minutes since day 1 (spec §18.4); written to the save on every save
let worldLoading = false; // a 3D place is being built behind the loading screen: no drawing, no simulation

// save + settings
const store = await openStore();
if (!store.persistent) $('nosave').classList.remove('hidden');

function legacyMuted() {
  try { return localStorage.getItem('cs-muted') === '1'; } catch (_) { return false; }
}
const settings = (await store.loadSettings()) ?? freshSettings(legacyMuted());
// language first: everything below renders in it (spec §23)
setLang(settings.lang);
localizeData();
applyDom();
document.documentElement.lang = settings.lang;
// switching language saves the setting and reloads, so every screen is rebuilt in it
function switchLang(lang = getLang() === 'en' ? 'id' : 'en') {
  settings.lang = lang;
  store.saveSettings(settings).finally(() => location.reload());
}

function renderAuto() {
  $('autobtn').classList.toggle('on', settings.autoAttack);
  $('autobtn').setAttribute('aria-pressed', String(settings.autoAttack));
}

function toggleAuto() {
  settings.autoAttack = !settings.autoAttack;
  renderAuto();
  saveSettings();
}

// Effects level (Settings → Grafis, plan "Efek Lebay" §A): auto / full / lite. Auto drops to
// lite for the session when FPS stays low in a fight; choosing again clears that.
const TOUCH = matchMedia('(pointer: coarse)').matches;
const CALM = matchMedia('(prefers-reduced-motion: reduce)');
const fpsWatch = new FpsWatch();
const fpsMeter = new FpsWatch({ fps: 0, seconds: Infinity }); // FPS readout only
let fxForcedLite = false, fpsShown = false, grayOn = false;
function applyEffects() {
  const id = activeQuality(settings.effects, fxForcedLite), q = QUALITY[id];
  game.vfx.setQuality(q, TOUCH ? q.touchCap : q.cap);
  R.shakeOn = q.shake && settings.shake && !CALM.matches;
  game.calm = CALM.matches; // the class peaks skip their flash and black-and-white (spec §31.8)
}
CALM.addEventListener('change', applyEffects);

// Everything the Settings menu controls (spec §29), applied at start and after each change.
function applySettings() {
  setMuted(settings.muted);
  setVolumes(settings.musicVol, settings.sfxVol);
  $('mute').classList.toggle('muted', settings.muted);
  renderAuto();
  applyEffects();
  R.numbersOn = settings.dmgNumbers;
  fpsShown = settings.showFps; fpsMeter.reset(); setTouchDots(fpsShown);
  $('fps').classList.toggle('hidden', !fpsShown);
  setSharpScale(SHARP_SCALE[settings.sharp]);
  STAGE.turnSens = CAM_SENS[settings.camSens];
  STAGE.resize();
  const flat = URL_2D || settings.view === '2d';
  if (flat !== FLAT) { FLAT = flat; T3.hide(); R3.hide(); R4.hide(); }
}
applySettings();
pinPage();
STAGE.setZoom(ZOOM_START[settings.zoom]);

function changeSetting(key, value) {
  if (key === 'lang') { switchLang(value); return; }
  settings[key] = value;
  if (key === 'effects') { fxForcedLite = false; fpsWatch.reset(); }
  if (key === 'zoom') STAGE.setZoom(ZOOM_START[value]);
  applySettings();
  if (key === 'sfxVol') { ensureAudio(); sfx.gem(); } // a sample at the new volume
  saveSettings();
}
function openSettings() {
  const box = $('settings');
  const close = () => { box.classList.add('hidden'); if (screen === 'title') showTitle(); };
  renderSettings(box, settings, { onChange: changeSetting, onClose: close });
  box.classList.remove('hidden');
}

function saveSettings() {
  store.saveSettings(settings).catch(() => { /* settings are a convenience; ignore */ });
}

let toastTimer = 0;
function toast(text, color = '') {
  $('toast').textContent = text;
  $('toast').style.color = color;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

// Writes the character; a failed write keeps playing from memory and says so.
async function saveCurrent() {
  if (trial) return null; // the training arena is never saved (spec §43.1)
  current = { ...current, clock: Math.floor(worldClock) };
  try { await store.saveSlot(current); return null; } catch (e) { toast(t('Gagal menyimpan: {err}', { err: e.message })); return e.message; }
}

// scene + HUD visibility
// hud: 'none' | 'town' | 'run'; controls: action buttons usable right now
function setUI(hud, controls) {
  $('hud').classList.toggle('hidden', hud !== 'run');
  $('townhud').classList.toggle('hidden', hud !== 'town');
  $('pausebtn').classList.toggle('hidden', !controls);
  $('autobtn').classList.toggle('hidden', !controls || hud !== 'run');
  $('charbtn').classList.toggle('hidden', !controls);
  $('actions').classList.toggle('hidden', !controls);
  $('belt').classList.toggle('hidden', !controls);
  $('minimap').classList.toggle('hidden', !(controls && ((hud === 'run' && game.field) || (hud === 'town' && town?.map === 'town'))));
  document.body.classList.toggle('playing', controls && hud === 'run');
  document.body.classList.toggle('intown', hud === 'town');
  if (!controls || hud !== 'town') $('prompt').classList.add('hidden');
  if (cheatOpen) drawCheat(); // the cheat panel offers different things per scene
}

function showMenu(id) {
  scene = 'menu';
  game.state = ST.TITLE;
  screen = showScreen(id);
  setUI('none', false);
  updateQuestTracker(null, false);
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

// menus
async function toSlots() {
  playMusic('judul');
  if (scene === 'town') { syncHp(); await saveCurrent(); }
  if (scene === 'run' && game.field) await commitField();
  slots = await store.loadSlots();
  renderSlots($('slotlist'), slots, { onOpen: openSlot, onCreate: toCreate, onDelete: deleteSlot });
  showMenu('slots');
}

function openSlot(slot) {
  const e = slots[slot];
  ptsSeen = 0; // a character just loaded: say so once if points wait to be spent
  if (e.status === 'ok') enterTown(e.data, 'spawn');
}

// Points waiting to be spent — mid-trip the level is the trip's and the points spent in it count.
let ptsSeen = 0;
function pointsLeft() {
  const run = scene === 'run', lv = run ? game.level : current.level;
  const tripSpent = run ? Object.values(tripAttrs).reduce((a, b) => a + b, 0) : 0;
  return { attr: POINTS_PER_LEVEL * (lv - 1) - spentPoints(current) - tripSpent, talent: spFree({ ...current, level: lv }) }; // talent = skill points (spec §43)
}
// The badge on the Karakter button, and a toast whenever the count goes up.
function checkPoints() {
  if (!current) return;
  const p = pointsLeft(), n = p.attr + p.talent;
  updatePointsBadge(p);
  if (n > ptsSeen) {
    const bits = [];
    if (p.attr > 0) bits.push(t('{n} poin atribut', { n: p.attr }));
    if (p.talent > 0) bits.push(t('{n} SP', { n: p.talent }));
    toast(t('{what} belum dibagi. Buka Karakter (I)', { what: bits.join(' & ') }));
  }
  ptsSeen = n;
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
  await playCutscene('opening', heroOf(char)); // the story begins (spec §44)
  enterTown(char, 'spawn');
}

async function deleteSlot(slot) {
  const e = slots[slot];
  const what = e.status === 'ok' ? `${e.data.name} (LV ${e.data.level})` : t('data rusak di slot {n}', { n: slot + 1 });
  if (!(await confirmDialog(t('Hapus {what}? Tidak bisa dibatalkan.', { what }), tr('Hapus')))) return;
  await store.deleteSlot(slot);
  await toSlots();
}

// town
function enterTown(char, at) {
  current = syncQuests(structuredClone(char)); // older saves catch up with what was already done
  if (current.spNotice) { // once after the skill-point update (spec §43)
    current = { ...current, spNotice: false };
    setTimeout(() => confirmDialog(tr('Bakat kini menjadi Poin Skill (SP): 2 SP tiap naik level untuk menaikkan level skill, ultimate, pasif, dan bakat Umum. Buka Karakter → Skill. Atur ulang SP pertama gratis di Pelatih.'), tr('Mengerti')).then(() => saveCurrent()), 600);
  }

  worldClock = char.clock;
  settings.lastSlot = char.slot;
  saveSettings();
  playMusic('kota');
  const s = finalStats(char);
  town = createTown({ id: char.location, moveSpd: s.moveSpd, hp: currentHp(char), maxHp: s.maxHp, at });
  town.marks = npcMarks(current, town.id);
  scene = 'town';
  game.state = ST.TITLE;
  $('banner').style.opacity = 0; // a region / floor title may still be fading
  showTownOverlay(null);
  updateTownHUD(current, town);
  const place = char.location === 'home' ? 'town' : REGIONS.find((r) => r.to === char.location)?.biome;
  loadWorld(T3.needsWarm(town), (step) => T3.warm(town, avatarOf(current), current.location, step), 'people', place);
}

// Builds a 3D place behind the loading screen (spec §29) when it is not built yet.
// place: the loading painting (ui/loading.js PLACES)
async function loadWorld(needed, warm, last = 'people', place = null) {
  if (FLAT || !needed || worldLoading) return;
  worldLoading = true;
  showLoading(current && avatarOf(current), place);
  try { await warm(loadingStep); } catch (e) { console.error(e); } // the first frame builds whatever is left
  await loadingStep(0.92, last);
  worldLoading = false; // the first (heaviest) frames draw under the loading screen
  await loadingStep(0.96);
  await hideLoading();
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
  current = { ...current, clock: Math.floor(worldClock) }; // shops read the day / night from it
  renderNpc($('npc'), npc, {
    char: current, hp: town.hp, maxHp: town.maxHp, message,
    line: npc.role === 'talk' ? npc.lines[(talkIdx[npc.id] ?? 0) % npc.lines.length] : null,
    quests: talkOffers(current, town.id, npc.id),
    onQuest: (id, pick = null) => { const before = current; serve((c, now) => questTalk(c, id, town.id, townNpc.id, now, Math.random, pick), (r) => { const m = questText(r); mountNews(before, r.char, r.mounts); return m; }); },
    onInn: () => serve(innRest, tr('Kamu tidur nyenyak. HP pulih penuh!')),
    onBuyPotion: (id) => serve((c, now) => buyPotion(c, id, now), t('{name}, segar dari kuali. Hehehe.', { name: POTIONS[id].name })),
    onBelt: (slot) => serve((c, now) => setBelt(c, slot, nextBeltPotion(c, slot), now), null),
    onBuyChest: (kind) => serve((c, now) => buyChest(c, kind, now), (r) => (showChestOpen(r.item), {
      text: t('Kau mendapat {item} ({rarity})!', { item: itemName(r.item), rarity: RARITIES[r.item.rarity].name }), color: RARITIES[r.item.rarity].color,
    })),
    onSell: (ids) => serve((c, now) => sellItems(c, ids, now), (r) => t('Terjual! +{n} koin.', { n: r.gold })),
    onEnhance: (id) => serve((c, now) => enhance(c, id, now), (r) => (r.success
      ? (showRewardPop({ title: tr('Tempa Berhasil!'), sub: t('Naik ke +{n}!', { n: r.plus }), items: [r.char.inventory.find((x) => x.id === id)].filter(Boolean) }),
        { text: t('Berhasil! Sekarang +{n}.', { n: r.plus }), color: '#e6c27a' })
      : { text: r.dropped ? t('Gagal… turun ke +{n}.', { n: r.plus }) : tr('Gagal… tingkatnya tetap.'), color: '#e0526a', bad: true })),
    onReroll: (id, line) => serve((c, now) => reroll(c, id, line, now), (r) => t('Bonus baru: {stat}', { stat: statText(r.bonus.stat, r.bonus.value) })),
    onSalvage: (ids) => serve((c, now) => salvage(c, ids, now), (r) => t('Diurai! {mats}', { mats: Object.entries(r.mats).filter(([, n]) => n).map(([m, n]) => `+${n} ${MATS[m].name}`).join(', ') }) + (r.gems.length ? t(' + {n} permata', { n: r.gems.length }) : '')),
    onSocket: (id, slot, gem, tier) => serve((c, now) => socketGem(c, id, slot, gem, tier, now), tr('Permata terpasang. Berkilau, bukan?')),
    onUnsocket: (id, slot) => serve((c, now) => unsocket(c, id, slot, now), tr('Permata dilepas dan kembali ke tasmu.')),
    onCombine: (gem, tier) => serve((c, now) => combineGems(c, gem, tier, now), tr('Tiga menjadi satu: permata naik tingkat!')),
    onTalentRespec: async () => { // skill points (spec §43): free the first time
      const price = jobOf(current).freeRespec ? 0 : spRespecPrice(current);
      if (await confirmDialog(price ? t('Atur ulang semua SP seharga {n} koin?', { n: price }) : tr('Atur ulang semua SP? Kali ini gratis.'), tr('Atur ulang'))) {
        serve(respecSp, tr('SP-mu kembali. Bagi lagi di tab Skill.'));
      } else openNpc(townNpc);
    },
    onUpgrade: (id) => serve((c, now) => buyUpgrade(c, id, now), t('{name} selesai. Kau makin kuat!', { name: UPGRADES[id].name })),
    onRespec: async () => {
      if (await confirmDialog(t('Atur ulang semua poin atribut seharga {n} koin?', { n: respecPrice(current) }), tr('Atur ulang'))) {
        serve(respec, tr('Poinmu kembali. Bagi lagi di panel Karakter (I).'));
      } else openNpc(townNpc);
    },
    onBuyMount: (id) => serve((c, now) => buyMount(c, id, now), t('{name} kini milikmu!', { name: MAJESTIC_BY_ID[id].name })),
    onBuySkin: (id, skin) => serve((c, now) => buySkin(c, id, skin, now), t('Warna {name} ditambahkan.', { name: MAJESTIC_BY_ID[id].skins[skin].name })),
    onSetMount: (id, skin) => serve((c, now) => setActiveMount(c, id, skin, now), t('{name} siap ditunggangi (tekan R di wilayah).', { name: MAJESTIC_BY_ID[id].name })),
    onHaircut: (look) => serve((c, now) => changeLook(c, look, now), tr('Nah, rapi sekali! Cocok untukmu.')),
    // jobs (spec §43.1): pick the first one free, change later for a price, try any in the arena
    onPickJob: async (id) => {
      if (await confirmDialog(t('Jadi {job}? Pilihan pertama gratis; ganti job nanti berbayar.', { job: CLASSES[id].name }), tr('Pilih'))) serve((c, now) => pickJob(c, id, now), t('Selamat, {job}! Senjata awalmu sudah di tangan, SP-mu siap dipakai.', { job: CLASSES[id].name }));
      else openNpc(townNpc);
    },
    onChangeJob: async (id) => {
      if (await confirmDialog(t('Ganti job ke {job} seharga {n} koin? Poin atribut dikembalikan; susunan skill tiap job tersimpan.', { job: CLASSES[id].name, n: jobChangePrice(current) }), tr('Ganti'))) serve((c, now) => changeJob(c, id, now), t('Kini kau seorang {job}.', { job: CLASSES[id].name }));
      else openNpc(townNpc);
    },
    onTryJob: (id) => tryJob(id),
    onBountyClaim: (i, sub = bountyText(current.bounties[i])) => serve((c, now) => claimBounty(c, i, Math.random, now), (r) => (rewardPop(tr('Tugas selesai!'), sub, { ...r.reward, mats: { dust: r.reward.dust } }, r.levelsGained), {
      text: t('Tugas selesai! +{g} koin, +{e} EXP, +{d} {dust}, +{m} Lencana.', { g: r.reward.gold, e: r.reward.exp, d: r.reward.dust, dust: MATS.dust.name, m: r.reward.marks })
        + (r.levelsGained ? ` ${tr('Naik level!')}` : ''), color: '#e6c27a',
    })),
    onBountyReroll: (i) => serve((c, now) => rerollBounty(c, i, Math.random, now), tr('Tugas baru ditempel di papan.')),
    onBountyTake: (i) => serve((c, now) => takeBounty(c, i, now), tr('Tugas diambil. Progresnya mulai dihitung dari perjalanan berikutnya.')),
    onBountyDrop: (i) => serve((c, now) => dropBounty(c, i, now), tr('Tugas dikembalikan ke papan.')),
    onMarkBuy: (id) => { const before = current; serve((c, now) => buyWithMarks(c, id, Math.random, now), (r) => (r.mount
      ? (!Object.keys(before.mounts.owned).length && toast(tr('Tekan R (atau tombol kuda) di wilayah untuk menunggang.')), mountGainText({ id: r.mount, isNew: true, skins: [] }))
      : r.item
      ? { text: t('Kau mendapat {item} ({rarity})!', { item: itemName(r.item), rarity: RARITIES[r.item.rarity].name }), color: RARITIES[r.item.rarity].color }
      : r.gem ? t('Kau mendapat {gem}!', { gem: gemName(r.gem.gem, r.gem.tier) }) : tr('Bahan masuk ke tasmu.'))); },
    onEnter: enterDungeon,
    onExpTake: (id) => serve((c, now) => takeExpedition(c, id, now), (r) => t('Ekspedisi diterima: {d}. Gerbangnya kutandai di petamu.', { d: dungeonById(r.char.expedition.dungeon).name })),
    onExpDrop: () => serve(dropExpedition, tr('Ekspedisi dibatalkan.')),
    onExpClaim: (sub = current.expedition && dungeonById(current.expedition.dungeon).name) => serve(claimExpedition, (r) => (rewardPop(tr('Ekspedisi tuntas!'), sub, r.reward, r.levelsGained), { text: t('Ekspedisi tuntas! +{g} koin, +{e} EXP, +{m} Lencana.', { g: r.reward.gold, e: r.reward.exp, m: r.reward.marks }) + (r.levelsGained ? ` ${tr('Naik level!')}` : ''), color: '#e6c27a' })),
    onExplore: () => explore(current.location),
    onTeleport: travel,
    onDeposit: (ids) => serve((c, now) => deposit(c, ids, now), null),
    onWithdraw: (ids) => serve((c, now) => withdraw(c, ids, now), null),
    onBuyDisplay: (key) => serve((c, now) => buyDisplay(c, c.location, townNpc.role, key, now), boughtText),
    onBuyNight: (key) => serve((c, now) => buyNight(c, c.location, key, now), (r) => (r.item ? boughtText(r) : t('Kau mendapat {gem}!', { gem: gemName(r.gem.gem, r.gem.tier) }))),
    onBuyMat: (key, n) => serve((c, now) => buyMats(c, c.location, key, n, now), (r) => t('+{n} {what}', { n: r.count, what: r.entry.kind === 'mat' ? MATS[r.entry.id].name : gemName(r.entry.id, r.entry.tier) })),
    onClose: closeTownOverlay,
  });
  if (screen !== 'npc') { ensureAudio(); sfx.pickCard(); }
  showTownOverlay('npc');
}

const REFUSE = {
  full: { inn: 'HP-mu sudah penuh.', potion: 'Tasmu sudah penuh ramuan itu.' },
  gold: 'Koinmu belum cukup.', bag: 'Tasmu penuh. Jual dulu beberapa barang.',
  equipped: 'Lepas dulu gear yang sedang dipakai.', none: 'Tidak ada yang perlu diubah.', locked: 'Belum terbuka.',
  max: 'Sudah mentok.', same: 'Itu gaya rambutmu sekarang.', bad: 'Tidak bisa.',
  owned: 'Sudah kamu miliki.', marks: 'Lencanamu belum cukup.', journal: 'Jurnalmu sudah penuh. Selesaikan atau batalkan side quest dulu.', give: 'Barangnya belum lengkap.', notdone: 'Tugas itu belum selesai.', taken: 'Tugas itu sudah kau ambil.', nottaken: 'Tugas itu belum kau ambil.',
  mats: 'Bahanmu belum cukup.', here: 'Kamu sudah di sini.', closed: 'Tokonya sedang tutup.', stashfull: 'Gudang sudah penuh.', soldout: 'Sudah habis untuk hari ini.', unknown: 'Kamu belum pernah ke sana.', socket: 'Soket itu tidak bisa dipakai.', gem: 'Permatamu belum cukup.', missing: 'Barang itu tidak ada.',
};

// Belt slot cycles: empty → each potion type in turn → empty.
function nextBeltPotion(char, slot) {
  const order = [null, ...POTION_IDS];
  return order[(order.indexOf(char.belt[slot]) + 1) % order.length];
}

// Runs a shop action (char, now) → { ok, char } | { ok: false, reason }, saves, redraws the dialog.
async function serve(action, okText) {
  current = { ...current, clock: Math.floor(worldClock) };
  const r = action(current, Date.now());
  if (r.ok && r.char.clock !== current.clock) worldClock = r.char.clock; // slept at the Inn
  if (!r.ok) {
    const why = tr(REFUSE[r.reason] && typeof REFUSE[r.reason] === 'string' ? REFUSE[r.reason] : REFUSE.full[townNpc.role]);
    openNpc(townNpc, { text: why, ok: false });
    toast(why, '#e0526a'); // the panel line can sit out of view on a phone
    return;
  }
  current = r.char;
  town.marks = npcMarks(current, town.id);
  const s = finalStats(current); // upgrades / respec change max HP and speed
  town.maxHp = s.maxHp; town.moveSpd = s.moveSpd; town.hp = currentHp(current);
  const ok = typeof okText === 'function' ? okText(r) : okText; // { bad: true } = it went through but went wrong (a failed forge roll)
  if (ok?.bad) sfx.fail(); else if (okText) sfx.heart(); else sfx.pickCard();
  const err = await saveCurrent();
  openNpc(townNpc, err ? { text: t('Gagal menyimpan: {err}', { err }), ok: false } : ok && (typeof ok === 'string' ? { text: ok, ok: true } : { ...ok, ok: !ok.bad }));
  if (!err && ok) toast(typeof ok === 'string' ? ok : ok.text, typeof ok === 'string' ? '#8ff5c8' : ok.color || (ok.bad ? '#e0526a' : '#8ff5c8'));
  updateTownHUD(current, town);
}

// After a quest talk: the reward when it finished, else what to do next (spec §26.3).
function questText(r) {
  const next = activeQuests(r.char).find((a) => a.id === r.id);
  if (!r.done) return { text: t('Quest: {step}', { step: next?.step ? stepText(next.step) : '' }), color: '#ffd24a' };
  const g = r.got, bits = [t('+{g} koin, +{e} EXP', { g: g.gold, e: g.exp })];
  if (g.shard) bits.push(t('Pecahan Segel {n}/{max}', { n: shards(r.char), max: SHARDS }));
  for (const it of g.items) bits.push(`${itemName(it)} (${RARITIES[it.rarity].name})`);
  for (const gm of g.gems) bits.push(gemName(gm.gem, gm.tier));
  if (g.marks) bits.push(t('+{n} Lencana', { n: g.marks }));
  for (const [m, n] of Object.entries(g.mats)) bits.push(`+${n} ${MATS[m].name}`);
  for (const [p, n] of Object.entries(g.potions)) bits.push(`+${n} ${POTIONS[p].name}`);
  rewardPop(tr('Quest selesai!'), questDef(r.id)?.title, g, g.levelsGained);
  if (g.shard) { const n = shards(r.char); setTimeout(() => story(`shard${n}`, ...(n >= SHARDS ? ['eclipse'] : [])), 300); } // spec §44
  const reply = r.pick != null && r.say ? `“${r.say}” ` : ''; // the answer to a choice (spec §42)
  return { text: `${reply}${tr('Quest selesai!')} ${bits.join(' · ')}${g.levelsGained ? ` ${tr('Naik level!')}` : ''}`, color: '#ffd24a' };
}

// The festive pop-up over whatever is open when a reward is claimed.
function rewardPop(title, sub, reward, levelsGained = 0) {
  ensureAudio();
  sfx.fanfare();
  if (levelsGained) sfx.levelup();
  showRewardPop({ title, sub, ...reward, levelsGained });
}

// Toasts for mounts just obtained (spec §35.2); the first mount also says how to ride it.
function mountNews(before, after, ids) {
  const gains = mountGains(before, after, ids);
  for (const g of gains) { const m = mountGainText(g); toast(m.text, m.color); }
  if (gains.some((g) => g.isNew) && !Object.keys(before.mounts.owned).length) toast(tr('Tekan R (atau tombol kuda) di wilayah untuk menunggang.'));
}

// A toast when the tracked quest moved on by itself (a gate found, a boss beaten, a town reached).
function questNews(before) {
  const a = activeQuests(current)[0], b = before.quests.main;
  if (!a?.def.main || (current.quests.main.ch === b.ch && current.quests.main.step === b.step)) return;
  toast(t('Quest: {step}', { step: stepText(a.step) }));
}

const boughtText = (r) => ({ text: t('Kau membeli {item} ({rarity})!', { item: itemName(r.item), rarity: RARITIES[r.item.rarity].name }), color: RARITIES[r.item.rarity].color });

// Teleport stone (spec §25.2): pay, save, appear on the plaza of the other town.
async function travel(townId) {
  syncHp();
  const r = teleport({ ...current, clock: Math.floor(worldClock) }, townId, Date.now());
  if (!r.ok) { openNpc(townNpc, { text: tr(REFUSE[r.reason] || REFUSE.bad), ok: false }); return; }
  current = r.char;
  const err = await saveCurrent();
  sfx.dodge();
  enterTown(current, 'spawn');
  toast(err ? t('Gagal menyimpan: {err}', { err }) : t('Kau tiba di {town}. −{n} koin.', { town: TOWNS[townId].name, n: r.price }));
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

// Skill change mid-trip (spec §31.6): saved at once, the new skill starts on its full cooldown.
// The worn skills live in the job's build (spec §43), so the save carries them.
function equipInRun(page, slot, id) {
  const r = equipSkill(tripChar(), page, slot, id, Date.now());
  if (!r.ok) { openCharPanel(); return; }
  current = { ...current, jobs: r.char.jobs };
  game.setSkills(wornIds(current, 0));
  saveCurrent();
  openCharPanel();
}

function openCharPanel() {
  if (scene === 'run') {
    game.state = ST.PAUSE;
    renderCharPanel($('charpanel'), tripChar(), game.stats.hp, { onClose: resume, onAllocate: allocateInRun, gear: { editable: false }, skill: { editable: true, treeEditable: false, onEquip: equipInRun } });
    showOverlay('charpanel');
    return;
  }
  syncHp();
  renderCharPanel($('charpanel'), current, town.hp, {
    onClose: closeTownOverlay, onAllocate: allocateInTown,
    skill: {
      editable: true, treeEditable: true, // skill points are spent in town (spec §43)
      onEquip: (page, slot, id) => changeGear((c, now) => equipSkill(c, page, slot, id, now)),
      onRaise: (id) => changeGear((c, now) => raise(c, id, now)),
      onUlt: (id) => changeGear((c, now) => setUlt(c, id, now)),
    },
    quest: {
      onTrack: (id) => changeGear((c, now) => trackQuest(c, id, now)),
      onMemory: (id) => story(id), // Kenangan (spec §44)
      onAbandon: async (id) => {
        if (await confirmDialog(tr('Batalkan quest ini? Progresnya hilang, tapi bisa diambil lagi.'), tr('Batalkan'))) changeGear((c, now) => abandonQuest(c, id, now));
        else openCharPanel();
      },
    },
    mount: { onSet: (id, skin) => changeGear((c, now) => setActiveMount(c, id, skin, now)) },
    gear: {
      editable: true,
      onEquip: (id) => changeGear((c, now) => equip(c, id, now)),
      onUnequip: (slot) => changeGear((c, now) => unequip(c, slot, now)),
      onDiscard: async (id) => {
        const it = current.inventory.find((x) => x.id === id);
        if (await confirmDialog(t('Buang {item}? Tidak bisa dikembalikan.', { item: itemName(it) }), tr('Buang'))) changeGear((c, now) => discard(c, id, now));
        else openCharPanel();
      },
    },
  });
  showTownOverlay('charpanel');
}

// Equip / unequip / discard in town: new stats, save, redraw.
async function changeGear(action) {
  syncHp();
  const r = action(current, Date.now());
  if (!r.ok) return;
  current = r.char;
  town.marks = npcMarks(current, town.id);
  const s = finalStats(current);
  town.maxHp = s.maxHp; town.moveSpd = s.moveSpd; town.hp = currentHp(current);
  sfx.pickCard();
  await saveCurrent();
  updateTownHUD(current, town);
  openCharPanel();
}

// classId + look with the visible gear, plus what drives the auras (unique effects, level)
// set: lowest rarity over all slots (full-set pillar); lite: effects setting (spec "Efek Lebay" §D)
// cutscenes (spec §44): the player's character on the stage; scenes played one after another
const heroOf = (c) => ({ classId: c.classId, look: avatarOf(c).look });
async function story(...ids) {
  for (const id of ids) await playCutscene(id, heroOf(current));
}
const bossSeen = new Set(); // a boss's entrance plays once per session (retries skip it)
// a scene in the middle of a fight or a walk: pause, play, go on
async function sceneInPlay(scene) {
  const was = game.state;
  game.state = ST.PAUSE;
  await playCutscene(scene, heroOf(current));
  if (game.state === ST.PAUSE && was === ST.PLAY) game.state = ST.PLAY;
}
const avatarOf = (c) => ({ classId: c.classId, look: { ...c.look, gear: dollGear(c) }, fx: gearEffects(c), level: c.level,
  set: setRarity(c), lite: activeQuality(settings.effects, fxForcedLite) === 'lite' });

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
    toast(tr(!id ? 'Slot sabuk kosong.' : current.potions[id] <= 0 ? 'Tidak punya ramuan itu.'
      : !isHeal(id) ? 'Ramuan ini hanya berguna di dungeon.' : 'HP sudah penuh.'));
    return;
  }
  current = next;
  town.hp = currentHp(current);
  sfx.heart();
  updateTownHUD(current, town);
  await saveCurrent();
}

// dungeon
// The character is saved at the gate; closing the browser mid-dungeon returns
// to this state (spec §13.4).
// The training arena (spec §43.1): the first floor of Bayangan as job `id` — its starting skills at
// level 1, a plain weapon of its own, the same level. Nothing is saved (saveCurrent skips while
// `trial` is set) and no rewards are kept; any end of the run brings the real character back to town.
let trial = null;
async function tryJob(id) {
  if (scene === 'town') syncHp();
  await saveCurrent();
  const real = current, t0 = structuredClone(real), w = makeItem({ slot: 'weapon', classId: id, rarity: 0, itemLevel: real.level }, Math.random);
  t0.classId = id; t0.jobs = { ...t0.jobs, [id]: newJob(id) }; t0.inventory.push(w); t0.equipped.weapon = w.id; t0.hp = null;
  for (const k in t0.attrs) t0.attrs[k] = 0;
  trial = { real };
  current = t0;
  toast(t('Latihan: {job}. Tidak ada hadiah; keluar lewat Jeda → Menyerah.', { job: CLASSES[id].name }));
  await enterDungeon('shadow', 1);
}

async function enterDungeon(dungeon = 'shadow', floor = 1) {
  if (scene === 'town') syncHp();
  await saveCurrent();
  townNpc = null;
  scene = 'run';
  ensureAudio(); playMusic('dungeon');
  const stats = finalStats(current);
  game.start({
    classId: current.classId, stats, hp: currentHp(current), potions: current.potions, belt: current.belt, floor, dungeon,
    level: current.level, exp: current.exp, luk: current.attrs.luk,
    effects: mergeFx(mergeFx(mergeFx(mergeFx(gearEffects(current), umumFx(current)), passiveFx(current)), codexFx(current)), mountFx(current)), skills: wornIds(current, 0), ult: equippedUlt(current), eclipse: regionOfDungeon(dungeon)?.id === 'eclipse',
  });
  tripAttrs = {};
  setupRunUI();
  await loadWorld(R3.needsWarm(game), (step) => R3.warm(game, step), 'foes', dungeon);
}

// The avatar and the pause menu for a dungeon trip or a region.
function setupRunUI() {
  R.avatar = avatarOf(current);
  game.weaponRarity = R.avatar.look.gear.weapon?.rarity ?? 0; // attack sparks (run/skillfx.js)
  // regions save as you go: no giving up, but back to the slots is fine (spec §25.1)
  $('surrender').classList.toggle('hidden', game.field);
  $('toslots').classList.toggle('hidden', !game.field);
  $('pausenote').classList.toggle('hidden', game.field);
  showOverlay(null);
}

// open world (spec §25.1, §40): at = a town id (out of its gate) or { x, y }
async function explore(at = current.location) {
  if (scene === 'town') syncHp();
  await saveCurrent();
  townNpc = null;
  scene = 'run';
  ensureAudio(); playMusic('wilayah');
  game.explore({
    classId: current.classId, stats: finalStats(current), hp: currentHp(current), potions: current.potions, belt: current.belt,
    level: current.level, exp: current.exp, luk: current.attrs.luk,
    effects: mergeFx(mergeFx(mergeFx(mergeFx(gearEffects(current), umumFx(current)), passiveFx(current)), codexFx(current)), mountFx(current)), skills: wornIds(current, 0), ult: equippedUlt(current),
    at, mount: activeMountSetup(current), fog: decodeFog(current.world.fog, WORLD), ...gatesAndTarget(), opened: current.treasures,
    eclipseOpen: regionOpen(regionById('eclipse'), shards(current)),
  });
  const region = game.region;
  markZone(region.id);
  const x = current.expedition, home = x && regionOfDungeon(x.dungeon);
  if (home && home.id !== region.id && !x.found) toast(t('Gerbang ekspedisi {d} ada di {r}.', { d: dungeonById(x.dungeon).name, r: home.name }));
  refreshFieldQuests();
  game.liveQuest = liveQuestTarget;
  game.clock = worldClock;
  tripAttrs = {};
  fieldSaveT = 0;
  setupRunUI();
  await loadWorld(R4.needsWarm(game), (step) => R4.warm(game, step), 'foes', region.biome);
}

// first steps in a zone count at once (a quest may wait for it)
function markZone(zone) {
  if (current.regions[zone]) return;
  const before = current;
  current = syncQuests({ ...structuredClone(current), regions: { ...current.regions, [zone]: {} } });
  questNews(before);
}

// This character's dungeon gates in the whole world and where the expedition arrow points.
function gatesAndTarget() {
  const gates = REGIONS.flatMap((r) => regionGates(current, r));
  const x = current.expedition;
  const g = x && gates.find((q) => q.dungeon === x.dungeon);
  return { gates, target: g ? { x: g.x, y: g.y } : null };
}

// A dungeon gate in a region (spec §25.5): save what was earned, then pick a floor.
async function openGate(g) {
  game.state = ST.PAUSE;
  await commitField();
  renderDungeonGate($('npc'), g.dungeon, {
    char: current,
    onEnter: (id, floor) => { dungeonReturn = { region: g.zone || game.region.id, x: g.x, y: g.y + 110 }; enterDungeon(id, floor); },
    onClose: () => resume(),
  });
  sfx.pickCard();
  showOverlay('npc');
}

// Writes what was earned in the region so far (EXP, coins, loot, bestiary, bounties, fog).
async function commitField() {
  const part = game.takeProgress();
  const before = current;
  // what was earned since the last save counts in the zone just left (when that is why we save)
  const zone = game.zoneChanged || game.region.id;
  game.zoneChanged = false;
  const r = applyField(current, { ...part, region: zone, fog: encodeFog(game.fog), found: game.gatesFound.splice(0), opened: game.treasuresOpened.splice(0), attrs: tripAttrs }, Date.now(), Math.random);
  tripAttrs = {};
  current = r.char;
  fieldSaveT = 0;
  refreshFieldQuests();
  mountNews(before, current, r.mountsFound);
  if (scene === 'run' && game.field && !game.mount.id) game.mount = freshMount(activeMountSetup(current)); // first mount found mid-region: R works right away
  if (!current.regions[game.region.id]) markZone(game.region.id);
  if (r.itemsLeft.length) toast(t('Tas penuh: {n} gear ditinggal.', { n: r.itemsLeft.length }));
  else if (current.quests.main.step !== before.quests.main.step || current.quests.main.ch !== before.quests.main.ch) questNews(before);
  else if (r.bountiesDone > 0) toast(t('{n} tugas selesai. Klaim di Balai Petualang', { n: r.bountiesDone }));
  return saveCurrent();
}

// Leaving the world: into a town's gate, or by falling (wake in the last town visited).
async function endField(died) {
  screen = 'ending';
  stopMusic();
  const region = game.region;
  await commitField();
  if (!died) {
    const to = game.exitTo;
    const first = !current.towns.includes(to);
    const before = current;
    current = visitTown(current, to, Date.now());
    await saveCurrent();
    if (first) {
      enterTown(current, 'gate');
      toast(t('Selamat datang di {town}! Batu teleport di alun-alun kini bisa membawamu ke sini.', { town: TOWNS[to].name }));
      setTimeout(() => questNews(before), 2000);
      return;
    }
  }
  if (died) { // a dialog says what happened; the only way on is waking in town
    const cause = game.deathCause();
    const r = fieldDeath(current, Date.now());
    current = r.char;
    const saveError = await saveCurrent();
    renderDeath($('results'), {
      region: region.name, town: TOWNS[current.location].name, cause, goldLost: r.goldLost,
      wakeHpPct: Math.round(DEATH.wakeHp * 100), saveError,
    }, () => enterTown(current, 'gate'));
    showMenu('results');
    return;
  }
  enterTown(current, 'gate');
  toast(t('Kembali ke {town}.', { town: TOWNS[current.location].name }));
}

function openMap() {
  if (!game.field) return;
  game.state = ST.PAUSE;
  showOverlay('fieldmap');
  $('maplegend').replaceChildren();
  const c = $('mapcanvas');
  const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawRegionMap(g, game.fmap, game.fog, { x: 0, y: 0, w, h }, { x: game.px, y: game.py }, { labels: true, title: false, gates: game.gates.filter((g) => g.found), target: game.target, quest: liveQuestTarget(), treasures: game.treasures, hidden: game.hidden, events: game.events });
  $('maptitle').textContent = `${game.region.name} · LV ${game.region.levels[0]}–${game.region.levels[1]}`;
  $('mapnote').textContent = t('Terjelajah {n}% · tekan M untuk menutup', { n: Math.round(explored(game.fog, WORLD) * 100) });
}

// Quests in this region (spec §26.5): who lives here, places to find, items that may drop, the target.
function refreshFieldQuests() {
  const fq = fieldQuests(current);
  game.hidden = hiddenIn(current);
  game.questSpots = fq.spots.filter((s) => !game.reached.includes(s.spot));
  game.questDrops = fq.drops;
  setEvents(game, fq.events); // spec §42: escorts, defences… out in the world
  game.questTarget = questTarget(current, null, { x: game.px, y: game.py });
}

// Someone living in the wild (spec §26.5): save what was earned, then talk.
async function openWild(h, message = null) {
  game.state = ST.PAUSE;
  if (!message) { await commitField(); talkIdx[h.id] = (talkIdx[h.id] ?? -1) + 1; }
  const npc = { id: h.id, role: 'talk', name: h.name, title: h.title, look: h.look, outfit: h.outfit, lines: h.lines };
  renderNpc($('npc'), npc, {
    char: current, hp: game.stats.hp, maxHp: game.stats.maxHp, message,
    line: h.lines[(talkIdx[h.id] ?? 0) % h.lines.length],
    quests: talkOffers(current, 'wild', h.id),
    onQuest: async (id, pick = null) => {
      const before = current;
      const r = questTalk(current, id, 'wild', h.id, Date.now(), Math.random, pick);
      if (!r.ok) { openWild(h, { text: tr(REFUSE[r.reason] || REFUSE.bad), ok: false }); return; }
      current = r.char;
      sfx.heart();
      const err = await saveCurrent();
      const msg = err ? { text: t('Gagal menyimpan: {err}', { err }), ok: false } : { ...questText(r), ok: true };
      mountNews(before, r.char, r.mounts);
      // rewards / hand-overs change level, potions and the bag: pick the region up again from the save
      if (r.done || r.given) { explore({ x: game.px, y: game.py }).then(() => toast(msg.text)); return; }
      refreshFieldQuests();
      openWild(h, msg);
    },
    onClose: () => resume(),
  });
  if (!message) { ensureAudio(); sfx.pickCard(); }
  showOverlay('npc');
}

// The quest target, with a gate found during this visit shown as found already.
function liveQuestTarget() {
  const q = game.questTarget;
  if (q?.kind === 'event') { // a running event follows its walker / altar; an outlaw not found is a circle
    const ev = game.events.find((e) => e.key === q.key), p = ev ? eventPoint(ev) : q;
    return p.hint ? { kind: 'hint', x: p.x, y: p.y, r: p.hint } : { ...q, ...p };
  }
  if (q?.kind !== 'hint') return q;
  const g = game.gates.find((x) => x.dungeon === q.dungeon && (x.found || game.gatesFound.includes(x.dungeon)));
  return g ? { kind: 'gate', x: g.x, y: g.y } : q;
}

function drawMinimap() {
  const c = $('minimap');
  const w = c.clientWidth, h = c.clientHeight;
  if (!w) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawRegionMap(g, game.fmap, game.fog, { x: 0, y: 0, w, h }, { x: game.px, y: game.py }, { labels: false, window: 5000, gates: game.gates.filter((g) => g.found), target: game.target, quest: liveQuestTarget(), treasures: game.treasures, hidden: game.hidden, events: game.events });
}
$('minimap').addEventListener('click', () => (scene === 'town' ? openTownMap() : openMap()));
$('mapclose').addEventListener('click', () => (scene === 'town' ? closeTownOverlay() : resume()));

// The town map (spec §30): shops, services and quests in this town; the minimap sits in the corner outdoors.
function townMap(withQuests = false) {
  return townMapInfo(town.id, { marks: town.marks, offers: withQuests ? (id) => talkOffers(current, town.id, id) : undefined, night: town.night });
}
function openTownMap(focus = null) {
  if (screen !== 'fieldmap') showTownOverlay('fieldmap');
  const info = townMap(true);
  const c = $('mapcanvas');
  const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawTownMap(g, info, { x: 0, y: 0, w, h }, playerSpot(info, town), { labels: true, t: 0, ground: townDef(town.id).theme.ground, focus });
  $('maptitle').textContent = TOWNS[town.id].name;
  $('mapnote').textContent = TOUCH ? tr('Ketuk baris di bawah untuk menandai tempatnya di peta.') : tr('Klik baris di bawah untuk menandai tempatnya · tekan M untuk menutup');
  renderTownLegend($('maplegend'), townLegend(info), (id) => openTownMap(id));
  if (focus) c.scrollIntoView({ block: 'center', behavior: CALM.matches ? 'auto' : 'smooth' }); // a row far down the list: bring the ring into view
}
function drawTownMinimap() {
  const c = $('minimap');
  c.classList.toggle('hidden', town.map !== 'town');
  const w = c.clientWidth, h = c.clientHeight;
  if (!w) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const info = townMap();
  drawTownMap(g, info, { x: 0, y: 0, w, h }, playerSpot(info, town), { t: town.t, ground: townDef(town.id).theme.ground });
}

// End of a trip — gold portal (died = false), death or giving up (died = true):
// apply rewards/penalty, auto-save, show Hasil Perjalanan (spec §13.4).
async function endRun(died) {
  if (trial) { // back from the training arena: the real character, as it was
    current = trial.real; trial = null;
    stopMusic();
    toast(tr('Latihan selesai.'));
    enterTown(current, 'gate');
    return;
  }
  if (game.field) { endField(died); return; }
  screen = 'ending';
  stopMusic();
  const r = game.result();
  const trip = {
    exp: r.exp, gold: r.gold, kills: r.kills, bossKills: r.bossKills, killsBy: r.killsBy, elites: r.elites, floorsCleared: r.floorsCleared,
    dungeon: r.dungeon, floor: r.floor, cleared: r.cleared && !died, died, hp: game.stats.hp, potions: game.potions,
    attrs: tripAttrs, items: r.items, mats: r.mats, gems: r.gems, mountRolls: r.mountRolls,
  };
  const newRecord = trip.floor > current.records.dungeons[r.dungeon].bestFloor;
  const before = current;
  const applied = applyTrip(current, trip, Date.now(), Math.random);
  const gains = mountGains(before, applied.char, applied.mountsFound);
  current = applied.char; // keep progress in memory even if the write fails
  questNews(before);
  const saveError = await saveCurrent();
  // back out of a gate in a region (gold portal), or wake in town (spec §25.5)
  const back = !died && dungeonReturn;
  dungeonReturn = null;
  const go = () => (back ? explore({ x: back.x, y: back.y }) : enterTown(current, 'gate'));
  renderResults($('results'), { ...applied, mountGains: gains, trip, newRecord, saveError, cause: died ? game.deathCause() : null },
    { onContinue: applied.ending ? async () => { playMusic('epilog'); await story('ending'); renderEnding($('ending'), current, go); showMenu('ending'); } : go,
      continueLabel: back ? t('Kembali ke {r}', { r: regionById(back.region).name })
        : died ? t('Bangkit di {town}', { town: TOWNS[current.location].name }) : null });
  showMenu('results');
}

function pause() { game.state = ST.PAUSE; showOverlay('pause'); }
function resume() {
  if (scene === 'town') { closeTownOverlay(); return; }
  if (game.field && screen === 'charpanel') commitField(); // points spent / stats seen: write them now
  game.state = ST.PLAY; showOverlay(null);
}

// buttons
$('slotsback').addEventListener('click', showTitle);
$('resume').addEventListener('click', resume);
$('surrender').addEventListener('click', () => { game.surrender(); endRun(true); });
$('toslots').addEventListener('click', toSlots);
$('pausesettings').addEventListener('click', openSettings);
$('pausebtn').addEventListener('click', () => {
  if (scene === 'run' && game.state === ST.PLAY) pause();
  else if (scene === 'town' && screen === null) townPause();
});
$('autobtn').addEventListener('click', toggleAuto);
$('charbtn').addEventListener('click', () => {
  if ((scene === 'town' && screen === null) || (scene === 'run' && game.state === ST.PLAY)) openCharPanel();
});
$('prompt').addEventListener('click', () => {
  if (scene === 'run' && game.field && game.nearGate && game.state === ST.PLAY) { openGate(game.nearGate); return; }
  if (scene === 'run' && game.field && game.nearHidden && game.state === ST.PLAY) { openWild(game.nearHidden); return; }
  if (town?.near && screen === null) openNpc(town.near);
});
$('mute').addEventListener('click', () => {
  ensureAudio();
  settings.muted = toggleMuted();
  $('mute').classList.toggle('muted', settings.muted);
  saveSettings();
});

// cheat panel (testing only, ui/cheat.js)
let cheatOpen = false;
const cheatScene = () => (scene === 'run' ? 'run' : scene === 'town' && current ? 'town' : 'menu');
function drawCheat() { renderCheat($('cheat'), { scene: cheatScene(), god: !!game.god, field: scene === 'run' && game.field, fps: fpsShown }, cheatActions, drawCheat); }
function toggleCheat() {
  cheatOpen = !cheatOpen;
  $('cheat').classList.toggle('hidden', !cheatOpen);
  if (cheatOpen) drawCheat();
}

// One piece of gear of a given rarity; slot 'acak' = any. Legendary / Mythic
// become a unique that fits (slot and class), if there is one.
function cheatItem(rarity, slot, level) {
  const classId = current.classId;
  const pickSlot = slot === 'acak' ? SLOT_IDS[Math.floor(Math.random() * SLOT_IDS.length)] : slot;
  if (rarity >= LEGENDARY) {
    const fits = UNIQUES.filter((u) => u.rarity === rarity && (u.classId === null || u.classId === classId) && (slot === 'acak' || u.slot === slot));
    if (fits.length) {
      const u = fits[Math.floor(Math.random() * fits.length)];
      return makeItem({ slot: u.slot, classId, rarity, itemLevel: level, unique: u.id }, Math.random);
    }
    rarity = 3;
  }
  if (pickSlot === 'ring') rarity = Math.max(1, rarity);
  return makeItem({ slot: pickSlot, classId, rarity, itemLevel: level }, Math.random);
}

// Change the character in town, save, refresh everything that shows it.
async function cheatChar(change, msg) {
  syncHp();
  const c = structuredClone(current);
  change(c);
  c.updatedAt = Date.now();
  current = c;
  const s = finalStats(current);
  town.maxHp = s.maxHp; town.moveSpd = s.moveSpd; town.hp = currentHp(current);
  updateTownHUD(current, town);
  await saveCurrent();
  toast(tr(msg));
  drawCheat();
  if (screen === 'charpanel') openCharPanel();
}

function addToBag(c, items) {
  const room = INVENTORY_MAX - c.inventory.length;
  c.inventory.push(...items.slice(0, room));
  return Math.min(room, items.length);
}

const cheatActions = {
  scene: (id) => { // spec §44
    const m = id.startsWith('moment:') && momentScene(id.slice(7), { name: 'Peziarah Tua', look: { hair: 4, hairColor: 3 }, outfit: ['#8a7a5a', '#5e523c'], bg: id.endsWith('escort') ? 'town' : 'ice' });
    if (scene === 'run' && game.state === ST.PLAY) sceneInPlay(m || id); else playCutscene(m || id, heroOf(current));
  },
  close: toggleCheat,
  mount: async (ids) => { // 'horse' or 'all'
    const give = (c) => { for (const id of ids === 'all' ? MOUNT_IDS : [ids]) grantMount(c, id); };
    const msg = ids === 'all' ? 'Semua mount didapat' : 'Kuda didapat';
    if (scene !== 'run') { cheatChar(give, msg); return; }
    // in a region: cheatChar would reset HP from the town; touch only the mounts, then call the mount right away
    const c = structuredClone(current);
    give(c);
    c.updatedAt = Date.now();
    current = c;
    if (game.field) game.mount = freshMount(activeMountSetup(current));
    await saveCurrent();
    toast(tr(msg)); drawCheat();
  },
  gold: (n) => cheatChar((c) => { c.gold += n; }, t('+{n} koin', { n })),
  level: (n) => cheatChar((c) => { c.level = Math.min(CHAR_LEVEL_MAX, c.level + n); c.exp = 0; }, 'Level naik'),
  potions: () => cheatChar((c) => { for (const id in c.potions) c.potions[id] = POTION_MAX; }, 'Ramuan penuh'),
  heal: () => cheatChar((c) => { c.hp = null; }, 'HP penuh'),
  resetPoints: () => cheatChar((c) => { for (const k in c.attrs) c.attrs[k] = 0; }, 'Poin dikembalikan'),
  hours: (n) => { worldClock += n * 60; toast(t('+{n} jam', { n })); },
  allTowns: () => cheatChar((c) => { c.towns = [...TOWN_IDS]; }, 'Semua kota dikunjungi'),
  mats: () => cheatChar((c) => { c.mats.dust += 500; c.mats.crystal += 100; c.mats.core += 20; }, 'Material bertambah'),
  gems: () => cheatChar((c) => { for (const g in c.gems) c.gems[g][0] += 6; }, 'Permata bertambah'),
  marks: () => cheatChar((c) => { c.marks += 10; }, 'Lencana bertambah'),
  bounties: () => cheatChar((c) => { for (const bt of c.bounties) { bt.taken = true; bt.have = bt.need; } }, 'Semua tugas selesai'),
  unlockFloors: () => cheatChar((c) => {
    for (const d of DUNGEONS) { const r = c.records.dungeons[d.id]; r.bestFloor = 5; r.clears = Math.max(1, r.clears); }
    c.found = DUNGEONS.map((d) => d.id);
  }, 'Semua gerbang ditemukan & lantai terbuka'),
  gear: (rarity, slot, n) => {
    let added = 0;
    return cheatChar((c) => { added = addToBag(c, Array.from({ length: n }, () => cheatItem(rarity, slot, c.level))); }, t('{n} gear dibuat', { n }))
      .then(() => { if (added < n) toast(t('Tas penuh: hanya {n} masuk', { n: added })); });
  },
  uniques: () => cheatChar((c) => {
    const mine = UNIQUES.filter((u) => u.classId === null || u.classId === c.classId);
    addToBag(c, mine.map((u) => makeItem({ slot: u.slot, classId: c.classId, rarity: u.rarity, itemLevel: c.level, unique: u.id }, Math.random)));
  }, 'Semua item unik masuk tas'),
  clearBag: () => cheatChar((c) => { c.inventory = []; for (const k in c.equipped) c.equipped[k] = null; }, 'Tas dikosongkan'),
  god: () => { game.god = !game.god; drawCheat(); },
  fps: () => { fpsShown = !fpsShown; fpsMeter.reset(); setTouchDots(fpsShown); $('fps').classList.toggle('hidden', !fpsShown); drawCheat(); },
  // effects test bench (plan "Efek Lebay" §A); runs at the player
  fxTest: (kind) => {
    const v = game.vfx, x = game.px, y = game.py;
    if (kind === 'light' || kind === 'medium' || kind === 'heavy') game.addShake(kind);
    else if (kind === 'stop') { game.addHitStop('ult'); game.addShake('heavy'); }
    else if (kind === 'numbers') {
      game.addFloater(x - 30, y - 30, '128', '#ffffff', 'normal');
      game.addFloater(x, y - 40, '1.024', PALETTES.fire[1], 'crit');
      game.addFloater(x + 34, y - 30, '9.999', PALETTES.lightning[1], 'ult');
    } else { // boom: every particle kind, a ring, a crack and a flash
      v.flash('#fff3c4', 0.45, 0.16);
      v.ring(x, y, { r1: 110, life: 0.5, color: PALETTES.fire[2], width: 6 });
      v.ring(x, y, { r1: 70, life: 0.35, color: PALETTES.holy[1], width: 3 });
      v.crack(x, y + 8, { rays: 8, len: 70, color: PALETTES.fire[2] });
      v.burst('blast', x, y, PALETTES.fire, { n: 30 });
      v.burst('smoke', x, y, '#3a2f3f', { n: 10 });
      v.burst('shards', x, y, PALETTES.steel);
      v.burst('stars', x, y, PALETTES.holy);
      v.burst('hit', x, y, PALETTES.lightning, { n: 14 });
      v.bolt(x - 60, y - 50, x + 60, y + 30, PALETTES.lightning[1]);
      game.addShake('heavy'); game.addHitStop('boss');
    }
  },
  warpGate: () => {
    if (!game.field || !game.gates.length) { toast(tr('Tidak ada gerbang di wilayah ini')); return; }
    const g = game.target || game.gates[0];
    game.px = g.x; game.py = g.y + 120;
  },
  warpTreasure: () => { // next chest not opened yet, just outside the guardian's reach
    const spot = game.field && game.treasures.find((x) => x.state !== 'open');
    if (!spot) { toast(tr('Semua harta di wilayah ini sudah dibuka')); return; }
    game.px = spot.x - TREASURE.triggerR - 60; game.py = spot.y;
  },
  revealMap: () => { if (game.fog) game.fog.fill(255); toast(tr('Peta terbuka')); },
  warp: (k) => { if (!game.field) return; game.px = game.fmap.w * k; game.py = game.fmap.paths[0].reduce((b, p) => (Math.abs(p[0] - game.px) < Math.abs(b[0] - game.px) ? p : b))[1]; },
  killAll: () => { for (const e of game.enemies) e.hp = 0; },
  elite: () => { // an elite with 2 random traits, a little in front of the player (spec §41.1)
    const pool = ['tank', 'spitter', 'charger', 'slink', 'wolf', 'healer'];
    const e = game.spawnEnemy(pool[Math.floor(Math.random() * pool.length)]);
    const a = Math.random() * Math.PI * 2;
    e.x = game.px + Math.cos(a) * 220; e.y = game.py + Math.sin(a) * 220;
    if (game.field) { e.level = game.enemies.find((o) => o.level)?.level ?? 1; e.zone = game.region?.id; }
    makeElite(e, 2);
  },
  foe: (type) => { // one of the new enemies (spec §41.1) a little in front of the player; hyenas as a pack, twins as a pair
    const n = ENEMIES[type].group?.[0] || 1, a0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const e = game.spawnEnemy(type), a = a0 + i * 0.5;
      e.x = game.px + Math.cos(a) * 240; e.y = game.py + Math.sin(a) * 240;
      if (game.field) { e.level = game.enemies.find((o) => o.level)?.level ?? 1; e.zone = game.region?.id; }
    }
  },
  clearFloor: () => {
    if (game.floorClear) return;
    game.wave = game.dungeon.floors[game.floor - 1].waves.length - 1;
    game.queueI = game.queue.length;
    for (const e of game.enemies) e.hp = 0;
  },
  exp: (n) => game.gems.push({ x: game.px, y: game.py, v: n, mag: true, big: true, t: 0 }),
  floor: (f) => { startFloor(game, f); drawCheat(); },
  drop: (rarity, n) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      game.gems.push({ x: game.px + Math.cos(a) * 50, y: game.py + Math.sin(a) * 50, v: 0, mag: false, big: false, gear: cheatItem(rarity, 'acak', game.level), t: i });
    }
  },
};
if (CHEAT_ON) {
  $('cheatbtn').classList.remove('hidden');
  $('cheatbtn').addEventListener('click', toggleCheat);
}

// phones play in landscape only (spec §27)
// Turning to portrait pauses a run (a card asks to turn back); Android can also lock it.
const portrait = matchMedia('(orientation: portrait) and (pointer: coarse) and (max-width: 900px)');
portrait.addEventListener('change', () => { if (portrait.matches && scene === 'run' && game.state === ST.PLAY) pause(); });
// pointerup, not pointerdown: a touch only counts as a user gesture once the finger lifts
addEventListener('pointerup', function lockLandscape() {
  const root = document.documentElement;
  if (!matchMedia('(pointer: coarse)').matches || !window.screen.orientation?.lock || !root.requestFullscreen) { removeEventListener('pointerup', lockLandscape); return; } // iPhone has no fullscreen: the card does the job
  root.requestFullscreen().then(() => {
    removeEventListener('pointerup', lockLandscape);
    return window.screen.orientation.lock('landscape');
  }).catch(() => { /* refused this time: the next tap tries again */ });
});

// keyboard shortcuts
input.onAction.push((code) => {
  if (CHEAT_ON && code === 'Backquote') { toggleCheat(); return; }
  if (!$('settings').classList.contains('hidden')) { if (code === 'Escape') $('settings-close').click(); return; } // Settings open: keys stay there
  if (code === 'KeyR' && scene === 'run' && game.field && game.state === ST.PLAY && !game.mount.id) toast(tr('Belum punya mount'));
  if (code === 'KeyM' && scene === 'town' && (screen === null || screen === 'fieldmap')) { if (screen === 'fieldmap') closeTownOverlay(); else openTownMap(); return; }
  if (code === 'KeyM') { // the map in a region or town, mute elsewhere
    if (scene === 'run' && game.field && (game.state === ST.PLAY || screen === 'fieldmap')) { if (screen === 'fieldmap') resume(); else openMap(); } else $('mute').click();
    return;
  }
  // Enter/Space on a focused control is that control's own press, not the screen's shortcut
  const go = (code === 'Space' || code === 'Enter') && !document.activeElement?.closest?.('button,[role=button],input,select');
  if (screen === 'title' && go) { ($('continue') || $('play')).click(); return; }
  if (screen === 'results' && go) { $('tocamp').click(); return; }
  if (scene === 'town') {
    if (code === 'Escape') { if (screen === null) townPause(); else closeTownOverlay(); return; }
    if (code === 'KeyI') { if (screen === null) openCharPanel(); else if (screen === 'charpanel') closeTownOverlay(); return; }
    if (code === 'KeyJ') { if (screen === null) { setCharTab('quest'); openCharPanel(); } else if (screen === 'charpanel') closeTownOverlay(); return; }
    if (code === 'Enter' && screen === null && town.near) openNpc(town.near);
    return;
  }
  if (code === 'KeyF' && game.state === ST.PLAY) { toggleAuto(); return; }
  if (code === 'KeyI' && game.state === ST.PLAY) { openCharPanel(); return; }
  if (code === 'KeyI' && screen === 'charpanel') { resume(); return; }
  if (code === 'KeyJ' && game.state === ST.PLAY) { setCharTab('quest'); openCharPanel(); return; }
  if (code === 'KeyJ' && screen === 'charpanel') { resume(); return; }
  if ((screen === 'charpanel' || screen === 'fieldmap') && code === 'Escape') { resume(); return; }
  if (game.state === ST.PLAY && code === 'Escape') { pause(); return; }
  if (game.state === ST.PAUSE && code === 'Escape') { resume(); return; }
});

let hudT = 0;

// main loop
function tickTown(pressed) {
  if (screen !== null) return;
  town.night = isNight(worldClock); // the night merchant (spec §25.2)
  stepTown(town, { move: FLAT ? { x: input.x, y: input.y } : STAGE.toWorld(input.x, input.y) }, STEP);
  if (town.entered) sfx.dodge();
  if ((minimapT += STEP) > 0.25) { minimapT = 0; drawTownMinimap(); }
  if (pressed.has('talk') && town.near) { openNpc(town.near); return; }
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
  const aimAt = !auto && !input.touch && input.mouse.active ? runView().screenToWorld(input.mouse.x, input.mouse.y) : null;
  const attack = input.touch ? input.attackHeld : input.mouse.down;
  game.intent = {
    move: runView() !== R ? STAGE.toWorld(input.x, input.y) : { x: input.x, y: input.y }, aimAt, attack, auto,
    dodge: pressed.has('dodge'), mount: pressed.has('mount'), potion: potionSlot(pressed), ult: pressed.has('ult'),
    skill1: pressed.has('skill1'), skill2: pressed.has('skill2'), skill3: pressed.has('skill3'), skill4: pressed.has('skill4'),
  };
  if (game.field) {
    game.clock = worldClock;
    game.night = phaseOf(worldClock).icon === 'moon';
    if (game.state === ST.PLAY && ((fieldSaveT += STEP) >= FIELD.saveEvery || game.zoneChanged || game.eventsDone.length)) commitField();
  }
  if (game.state === ST.PLAY && game.bossIntro) { // a boss's entrance (spec §44)
    const type = game.bossIntro; game.bossIntro = null;
    if (SCENES[`boss:${type}`] && !bossSeen.has(type)) { bossSeen.add(type); sceneInPlay(`boss:${type}`); return false; }
  }
  if (game.state === ST.PLAY && game.moment) { // after an escort / a rescue (spec §44)
    const m = game.moment; game.moment = null;
    sceneInPlay(momentScene(m.kind, { ...m, bg: m.kind === 'escort' ? 'town' : regionById(m.region)?.biome }));
    return false;
  }
  if (game.field && game.state === ST.PLAY && pressed.has('talk') && game.nearGate) { openGate(game.nearGate); return false; }
  if (game.field && game.state === ST.PLAY && pressed.has('talk') && game.nearHidden) { openWild(game.nearHidden); return false; }
  const wasPlaying = game.state === ST.PLAY;
  game.step(STEP);
  // react only on the PLAY -> OVER transition
  if (!wasPlaying) return false;
  if (game.state === ST.OVER) { $('dmg').style.opacity = 0; endRun(!game.returned); return true; }
  return false;
}

function tick() {
  if (worldLoading) return false;
  // hit-stop (crits, ultimates, bosses): hold the world for a few frames; key presses
  // stay queued for the first step after it
  if (scene === 'run' && game.state === ST.PLAY && game.hitStop > 0) { game.hitStop -= STEP; return false; }
  simT += STEP;
  pollMove();
  const pressed = consumePressed(); // one-shot actions go to the first step of the frame
  // the clock runs while walking in town and while fighting (not in menus or paused)
  if ((scene === 'town' && screen === null) || (scene === 'run' && game.state === ST.PLAY)) worldClock += GAME_MIN_PER_SEC * STEP;
  if (scene === 'town') { tickTown(pressed); return false; }
  if (scene === 'run') return tickRun(pressed);
  return false;
}

function frame(dt) {
  hudT += dt;
  if (game.mythicPick) { showMythicCard(game.mythicPick); game.mythicPick = null; } // set by run/dungeon.js gearPickedUp
  if (fpsShown && (fpsMeter.push(dt), fpsMeter.t === 0)) { // a half-second window just closed
    $('fps').textContent = `${Math.round(fpsMeter.last)} FPS · ${game.vfx.particles.size} fx${activeQuality(settings.effects, fxForcedLite) === 'lite' ? ' · lite' : ''}`;
  }
  if (scene === 'run' && game.state === ST.PLAY && settings.effects === 'auto' && !fxForcedLite && fpsWatch.push(dt)) {
    fxForcedLite = true;
    applyEffects();
    toast(tr('FPS rendah: efek diubah ke Ringan'));
  }
  if (worldLoading) return;
  const gray = scene === 'run' && game.vfx.grayT > 0; // Kombo execute (spec §31.8): both canvases in black and white
  if (gray !== grayOn) { grayOn = gray; document.body.classList.toggle('fxgray', gray); }
  if (scene === 'run') {
    drawRunView(simT);
    if (hudT > 0.12 && game.state !== ST.TITLE) { hudT = 0; updateHUD(game); updateClock(worldClock); updateQuestTracker(current, game.state === ST.PLAY); checkPoints(); }
    if (game.state === ST.PLAY) updateActions(game);
    if (game.state === ST.PLAY) playMusic(game.enemies.some((e) => e.boss) ? 'bos' : game.field ? 'wilayah' : 'dungeon');
    if (game.field && game.state === ST.PLAY && (minimapT += dt) > 0.25) { minimapT = 0; drawMinimap(); }
    const gate = game.field && game.state === ST.PLAY ? game.nearGate : null;
    const who = game.field && game.state === ST.PLAY && !gate ? game.nearHidden : null;
    $('prompt').classList.toggle('hidden', !gate && !who);
    if (gate) $('prompttext').textContent = t('Masuk {name}', { name: dungeonById(gate.dungeon).name });
    else if (who) $('prompttext').textContent = t('Bicara dengan {name}', { name: who.name });
  } else if (scene === 'menu') {
    R3.hide(); R4.hide(); T3.hide();
    drawMenuBackdrop();
  } else {
    R3.hide(); R4.hide();
    (FLAT ? TR : T3).draw(scene === 'town' ? town : null, simT, current && avatarOf(current), current ? worldClock : 20 * 60, current?.location || 'home');
    if (scene === 'town') {
      if (hudT > 0.12) { hudT = 0; updateTownHUD(current, town); updateClock(worldClock); updateQuestTracker(current, screen === null); checkPoints(); }
      const near = screen === null ? town.near : null;
      $('prompt').classList.toggle('hidden', !near);
      document.body.classList.toggle('near', !!near);
      if (near) $('prompttext').textContent = t('Bicara dengan {name}', { name: near.name });
    }
  }
  updateJoystick((scene === 'run' && game.state === ST.PLAY) || (scene === 'town' && screen === null));
  window.__SCENE_READY__ = true;
}

// Behind the title and slot screens: the campfire night (2D) — no 3D world is built until a game starts.
function drawMenuBackdrop() {
  const g = view.ctx, k = view.c.width / innerWidth;
  g.setTransform(k, 0, 0, k, 0, 0);
  drawCampfire(g, innerWidth, innerHeight, CALM.matches ? 0 : simT); // reduced motion: a still night
}

// The title (spec §29): Lanjutkan opens the hero played last (or the first one there is).
function showTitle() {
  const ok = slots.filter((e) => e.status === 'ok');
  const last = (slots[settings.lastSlot]?.status === 'ok' ? slots[settings.lastSlot] : ok[0])?.data ?? null;
  renderTitle($('title'), {
    last, lang: getLang(),
    onContinue: () => { ensureAudio(); openSlot(last.slot); },
    onSlots: () => { ensureAudio(); toSlots(); },
    onSettings: () => openSettings(),
    onLang: switchLang,
  });
  showMenu('title');
  playMusic('judul');
}
// browsers only let sound start from a gesture: the title's music begins with the first one
addEventListener('pointerup', ensureAudio, { once: true });
addEventListener('keydown', ensureAudio, { once: true });

slots = await store.loadSlots();
showTitle();
const loop = startLoop(tick, frame);
$('boot')?.classList.add('gone'); // the page loader (index.html) gives way to the title
setTimeout(() => $('boot')?.remove(), 500);

// screenshot / debug hooks
window.__seek = (t) => {
  const v = Number(t) || 0;
  if (game.state === ST.TITLE) {
    scene = 'run';
    const cls = CLASSES[new URLSearchParams(location.search).get('class')] ? new URLSearchParams(location.search).get('class') : 'warrior';
    const region = new URLSearchParams(location.search).get('region'); // ?region=forest|ice|… tests a region
    const town = region && TOWN_IDS.find((id) => REGIONS.find((r) => r.id === region)?.to === id); // ?region=forest|ice|… starts out of its town
    if (region) game.explore({ classId: cls, stats: { ...CLASS_BASE, ...CLASSES[cls].stats }, at: town || 'home', gates: [], opened: {} });
    else game.start({ classId: cls, stats: { ...CLASS_BASE, ...CLASSES[cls].stats } });
    showOverlay(null);
    screen = showScreen(null);
    if (!R.avatar) R.avatar = { classId: cls, look: { hair: 1, hairColor: 2, gear: {} } }; // so the test view shows a hero
  }
  game.intent = { move: { x: 0.6, y: 0.35 }, aimAt: null, dodge: false, attack: true };
  const n = Math.floor(v / STEP);
  for (let i = 0; i < n && game.state === ST.PLAY; i++) {
    simT += STEP;
    game.step(STEP);
  }
  drawRunView(simT);
};
window.__play = () => { loop.resetClock(); };
// a newer version was stored (spec §32): on the title screen just reload, in play only say so
registerOffline(() => { if (screen === 'title') location.reload(); else toast(tr('Versi baru terpasang. Muat ulang game untuk memakainya.')); });
const T_PARAM = new URLSearchParams(location.search).get('t');
if (T_PARAM !== null) window.__seek(T_PARAM);
window.__game = game;
window.__input = input; // debug/test hook: lets scripts drive the joystick
window.__town = () => town; // debug/test hook: live town state
window.__char = () => current;
window.__explore = (at) => explore(at); // debug/test hooks: walk out to a region / into a dungeon (loading screen)
window.__dungeon = (id) => enterDungeon(id);
window.__avatar = (a) => { R.avatar = a; }; // debug/test hook: dress the run's player (effects screenshots)
