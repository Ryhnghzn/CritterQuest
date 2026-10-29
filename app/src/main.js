// Bootstrap: opens the save, wires scenes, renderers, input, audio and the DOM
// screens together and runs the fixed-timestep loop.
// Flow (spec §13.1): Judul → Pilih Slot → [Buat Karakter] → KOTA ⇄ DUNGEON → Hasil Perjalanan → KOTA.
// Scenes: 'menu' (title/slots/create/results over the town backdrop), 'town', 'run'.
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
import { SHARP_SCALE, ZOOM_START } from './data/settings.js';
import { renderSettings } from './ui/settings.js';
import { freshSettings } from './meta/schema.js';
import { CLASSES, CLASS_BASE } from './data/classes.js';
import { iconCanvas } from './art/sprites.js';
import { input, pollMove, consumePressed } from './core/input.js';
import { ensureAudio, startMusic, stopMusic, toggleMuted, setMuted, setVolumes, sfx } from './core/audio.js';
import { STEP, startLoop } from './core/loop.js';
import { openStore } from './meta/save.js';
import { createCharacter, applyTrip, finalStats, currentHp, usePotion, addExp, allocate, spentPoints } from './meta/character.js';
import { innRest, buyPotion, setBelt, buyChest, sellItems, buyUpgrade, respec, respecPrice, changeLook } from './meta/shop.js';
import { enhance, reroll, salvage, socketGem, unsocket, combineGems } from './meta/forge.js';
import { codexFx } from './meta/collection.js';
import { claimBounty, rerollBounty, buyWithMarks, takeBounty, dropBounty } from './meta/bounties.js';
import { equipSkill, allocateTalents, wornSkills, talentFx, mergeFx, respecTalents, talentRespecPrice, ultimateOf, talentPoints, spentTalents } from './meta/talents.js';
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
import { CHAR_LEVEL_MAX, INVENTORY_MAX, POINTS_PER_LEVEL } from './data/balance.js';
import { DUNGEONS, dungeonById } from './data/dungeons.js';
import { startFloor } from './run/dungeon.js';
import { GAME_MIN_PER_SEC } from './data/time.js';
import { FIELD, TREASURE, TOWNS, TOWN_IDS, regionById, regionOfDungeon } from './data/world.js';
import { applyField, fieldDeath, encodeFog, decodeFog, explored, visitTown, teleport, regionGates, takeExpedition, claimExpedition, dropExpedition } from './meta/world.js';
import { buyDisplay, buyNight, buyMats, isNight } from './meta/market.js';
import { deposit, withdraw } from './meta/stash.js';
import { phaseOf } from './meta/clock.js';
import { drawRegionMap } from './render/regionmap.js';
import { isHeal, POTIONS, POTION_IDS } from './data/potions.js';
import { createTown, stepTown } from './town/town.js';
import { showScreen, confirmDialog } from './ui/screens.js';
import { renderSlots } from './ui/slots.js';
import { renderCreate } from './ui/create.js';
import { renderResults } from './ui/results.js';
import { renderEnding } from './ui/ending.js';
import { renderNpc, renderDungeonGate } from './ui/npc.js';
import { renderCharPanel, setCharTab } from './ui/charpanel.js';
import { stepText } from './ui/journal.js';
import { bountyText } from './ui/board.js';
import { talkOffers, npcMarks, questTalk, questTarget, activeQuests, syncQuests, shards, hiddenIn, fieldQuests, abandonQuest, trackQuest, questDef } from './meta/quests.js';
import { SHARDS, DROP_ITEMS } from './data/quests.js';
import { updateHUD, updateActions, updateTownHUD, updateClock, updateQuestTracker, updatePointsBadge } from './ui/hud.js';
import { setupTouch, updateJoystick } from './ui/touch.js';
import { FpsWatch, activeQuality } from './run/vfx.js';
import { setRarity } from './art/auratier.js';
import { QUALITY, PALETTES } from './data/fx.js';

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
function drawRunView(t) { T3.hide(); const r = runView(); if (r !== R3) R3.hide(); if (r !== R4) R4.hide(); r.draw(game, t); }
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

// ——— save + settings ———
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
const fpsWatch = new FpsWatch();
const fpsMeter = new FpsWatch({ fps: 0, seconds: Infinity }); // FPS readout only
let fxForcedLite = false, fpsShown = false;
function applyEffects() {
  const id = activeQuality(settings.effects, fxForcedLite), q = QUALITY[id];
  game.vfx.setQuality(q, TOUCH ? q.touchCap : q.cap);
  R.shakeOn = q.shake && settings.shake;
}

// Everything the Settings menu controls (spec §29), applied at start and after each change.
function applySettings() {
  setMuted(settings.muted);
  setVolumes(settings.musicVol, settings.sfxVol);
  $('mute').classList.toggle('muted', settings.muted);
  renderAuto();
  applyEffects();
  R.numbersOn = settings.dmgNumbers;
  fpsShown = settings.showFps; fpsMeter.reset();
  $('fps').classList.toggle('hidden', !fpsShown);
  setSharpScale(SHARP_SCALE[settings.sharp]);
  STAGE.resize();
  const flat = URL_2D || settings.view === '2d';
  if (flat !== FLAT) { FLAT = flat; T3.hide(); R3.hide(); R4.hide(); }
}
applySettings();
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
function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 1800);
}

// Writes the character; a failed write keeps playing from memory and says so.
async function saveCurrent() {
  current = { ...current, clock: Math.floor(worldClock) };
  try { await store.saveSlot(current); return null; } catch (e) { toast(t('Gagal menyimpan: {err}', { err: e.message })); return e.message; }
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
  $('minimap').classList.toggle('hidden', !(controls && hud === 'run' && game.field));
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

// ——— menus ———
async function toSlots() {
  stopMusic();
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
  return { attr: POINTS_PER_LEVEL * (lv - 1) - spentPoints(current) - tripSpent, talent: talentPoints(lv) - spentTalents(current) };
}
// The badge on the Karakter button, and a toast whenever the count goes up.
function checkPoints() {
  if (!current) return;
  const p = pointsLeft(), n = p.attr + p.talent;
  updatePointsBadge(p);
  if (n > ptsSeen) {
    const bits = [];
    if (p.attr > 0) bits.push(t('{n} poin atribut', { n: p.attr }));
    if (p.talent > 0) bits.push(t('{n} poin bakat', { n: p.talent }));
    toast(t('{what} belum dibagi — buka Karakter (I)', { what: bits.join(' & ') }));
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
  enterTown(char, 'spawn');
}

async function deleteSlot(slot) {
  const e = slots[slot];
  const what = e.status === 'ok' ? `${e.data.name} (LV ${e.data.level})` : t('data rusak di slot {n}', { n: slot + 1 });
  if (!(await confirmDialog(t('Hapus {what}? Tidak bisa dibatalkan.', { what }), tr('Hapus')))) return;
  await store.deleteSlot(slot);
  await toSlots();
}

// ——— town ———
function enterTown(char, at) {
  current = syncQuests(structuredClone(char)); // older saves catch up with what was already done

  worldClock = char.clock;
  settings.lastSlot = char.slot;
  saveSettings();
  stopMusic();
  const s = finalStats(char);
  town = createTown({ id: char.location, moveSpd: s.moveSpd, hp: currentHp(char), maxHp: s.maxHp, at });
  town.marks = npcMarks(current, town.id);
  scene = 'town';
  game.state = ST.TITLE;
  $('banner').style.opacity = 0; // a region / floor title may still be fading
  showTownOverlay(null);
  updateTownHUD(current, town);
  loadWorld(T3.needsWarm(town), (step) => T3.warm(town, avatarOf(current), current.location, step));
}

// Builds a 3D place behind the loading screen (spec §29) when it is not built yet.
async function loadWorld(needed, warm, last = 'people') {
  if (FLAT || !needed || worldLoading) return;
  worldLoading = true;
  showLoading(current && avatarOf(current));
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
    onQuest: (id) => serve((c, now) => questTalk(c, id, town.id, townNpc.id, now), questText),
    onInn: () => serve(innRest, tr('Kamu tidur nyenyak. HP pulih penuh!')),
    onBuyPotion: (id) => serve((c, now) => buyPotion(c, id, now), t('{name}, segar dari kuali. Hehehe.', { name: POTIONS[id].name })),
    onBelt: (slot) => serve((c, now) => setBelt(c, slot, nextBeltPotion(c, slot), now), null),
    onBuyChest: (kind) => serve((c, now) => buyChest(c, kind, now), (r) => (showChestOpen(r.item), {
      text: t('Kau mendapat {item} ({rarity})!', { item: itemName(r.item), rarity: RARITIES[r.item.rarity].name }), color: RARITIES[r.item.rarity].color,
    })),
    onSell: (ids) => serve((c, now) => sellItems(c, ids, now), (r) => t('Terjual! +{n} koin.', { n: r.gold })),
    onEnhance: (id) => serve((c, now) => enhance(c, id, now), (r) => (r.success
      ? { text: t('Berhasil! Sekarang +{n}.', { n: r.plus }), color: '#e6c27a' }
      : { text: r.plus >= 10 || r.plus === 9 ? t('Gagal… turun ke +{n}.', { n: r.plus }) : tr('Gagal… tingkatnya tetap.'), color: '#e0526a' })),
    onReroll: (id, line) => serve((c, now) => reroll(c, id, line, now), (r) => t('Bonus baru: {stat}', { stat: statText(r.bonus.stat, r.bonus.value) })),
    onSalvage: (ids) => serve((c, now) => salvage(c, ids, now), (r) => t('Diurai! {mats}', { mats: Object.entries(r.mats).filter(([, n]) => n).map(([m, n]) => `+${n} ${MATS[m].name}`).join(', ') }) + (r.gems.length ? t(' + {n} permata', { n: r.gems.length }) : '')),
    onSocket: (id, slot, gem, tier) => serve((c, now) => socketGem(c, id, slot, gem, tier, now), tr('Permata terpasang. Berkilau, bukan?')),
    onUnsocket: (id, slot) => serve((c, now) => unsocket(c, id, slot, now), tr('Permata dilepas dan kembali ke tasmu.')),
    onCombine: (gem, tier) => serve((c, now) => combineGems(c, gem, tier, now), tr('Tiga menjadi satu — permata naik tingkat!')),
    onTalentRespec: async () => {
      if (await confirmDialog(t('Atur ulang semua bakat seharga {n} koin?', { n: talentRespecPrice(current) }), tr('Atur ulang'))) {
        serve(respecTalents, tr('Bakatmu kembali. Bagi lagi di tab Skill.'));
      } else openNpc(townNpc);
    },
    onUpgrade: (id) => serve((c, now) => buyUpgrade(c, id, now), t('{name} selesai. Kau makin kuat!', { name: UPGRADES[id].name })),
    onRespec: async () => {
      if (await confirmDialog(t('Atur ulang semua poin atribut seharga {n} koin?', { n: respecPrice(current) }), tr('Atur ulang'))) {
        serve(respec, tr('Poinmu kembali. Bagi lagi di panel Karakter (I).'));
      } else openNpc(townNpc);
    },
    onHaircut: (look) => serve((c, now) => changeLook(c, look, now), tr('Nah, rapi sekali! Cocok untukmu.')),
    onBountyClaim: (i, sub = bountyText(current.bounties[i])) => serve((c, now) => claimBounty(c, i, Math.random, now), (r) => (rewardPop(tr('Tugas selesai!'), sub, { ...r.reward, mats: { dust: r.reward.dust } }, r.levelsGained), {
      text: t('Tugas selesai! +{g} koin, +{e} EXP, +{d} {dust}, +{m} Lencana.', { g: r.reward.gold, e: r.reward.exp, d: r.reward.dust, dust: MATS.dust.name, m: r.reward.marks })
        + (r.levelsGained ? ` ${tr('Naik level!')}` : ''), color: '#e6c27a',
    })),
    onBountyReroll: (i) => serve((c, now) => rerollBounty(c, i, Math.random, now), tr('Tugas baru ditempel di papan.')),
    onBountyTake: (i) => serve((c, now) => takeBounty(c, i, now), tr('Tugas diambil. Progresnya mulai dihitung dari perjalanan berikutnya.')),
    onBountyDrop: (i) => serve((c, now) => dropBounty(c, i, now), tr('Tugas dikembalikan ke papan.')),
    onMarkBuy: (id) => serve((c, now) => buyWithMarks(c, id, Math.random, now), (r) => (r.item
      ? { text: t('Kau mendapat {item} ({rarity})!', { item: itemName(r.item), rarity: RARITIES[r.item.rarity].name }), color: RARITIES[r.item.rarity].color }
      : r.gem ? t('Kau mendapat {gem}!', { gem: gemName(r.gem.gem, r.gem.tier) }) : tr('Bahan masuk ke tasmu.'))),
    onEnter: enterDungeon,
    onExpTake: (id) => serve((c, now) => takeExpedition(c, id, now), (r) => t('Ekspedisi diterima: {d}. Gerbangnya kutandai di petamu.', { d: dungeonById(r.char.expedition.dungeon).name })),
    onExpDrop: () => serve(dropExpedition, tr('Ekspedisi dibatalkan.')),
    onExpClaim: (sub = current.expedition && dungeonById(current.expedition.dungeon).name) => serve(claimExpedition, (r) => (rewardPop(tr('Ekspedisi tuntas!'), sub, r.reward, r.levelsGained), { text: t('Ekspedisi tuntas! +{g} koin, +{e} EXP, +{m} Lencana.', { g: r.reward.gold, e: r.reward.exp, m: r.reward.marks }) + (r.levelsGained ? ` ${tr('Naik level!')}` : ''), color: '#e6c27a' })),
    onExplore: (id) => explore(id, regionById(id).from === current.location ? 'west' : 'east'),
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
  equipped: 'Lepas dulu gear yang sedang dipakai.', none: 'Tidak ada yang perlu diubah.',
  max: 'Sudah mentok.', same: 'Itu gaya rambutmu sekarang.', bad: 'Tidak bisa.',
  marks: 'Lencanamu belum cukup.', journal: 'Jurnalmu sudah penuh — selesaikan atau batalkan side quest dulu.', give: 'Barangnya belum lengkap.', notdone: 'Tugas itu belum selesai.', taken: 'Tugas itu sudah kau ambil.', nottaken: 'Tugas itu belum kau ambil.',
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
    openNpc(townNpc, { text: tr(REFUSE[r.reason] && typeof REFUSE[r.reason] === 'string' ? REFUSE[r.reason] : REFUSE.full[townNpc.role]), ok: false });
    return;
  }
  current = r.char;
  town.marks = npcMarks(current, town.id);
  const s = finalStats(current); // upgrades / respec change max HP and speed
  town.maxHp = s.maxHp; town.moveSpd = s.moveSpd; town.hp = currentHp(current);
  if (okText) sfx.heart(); else sfx.pickCard();
  const err = await saveCurrent();
  const ok = typeof okText === 'function' ? okText(r) : okText;
  openNpc(townNpc, err ? { text: t('Gagal menyimpan: {err}', { err }), ok: false } : ok && (typeof ok === 'string' ? { text: ok, ok: true } : { ...ok, ok: true }));
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
  return { text: `${tr('Quest selesai!')} ${bits.join(' · ')}${g.levelsGained ? ` ${tr('Naik level!')}` : ''}`, color: '#ffd24a' };
}

// The festive pop-up over whatever is open when a reward is claimed.
function rewardPop(title, sub, reward, levelsGained = 0) {
  ensureAudio();
  sfx.fanfare();
  if (levelsGained) sfx.levelup();
  showRewardPop({ title, sub, ...reward, levelsGained });
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

function openCharPanel() {
  if (scene === 'run') {
    game.state = ST.PAUSE;
    renderCharPanel($('charpanel'), tripChar(), game.stats.hp, { onClose: resume, onAllocate: allocateInRun, gear: { editable: false }, skill: { editable: false } });
    showOverlay('charpanel');
    return;
  }
  syncHp();
  renderCharPanel($('charpanel'), current, town.hp, {
    onClose: closeTownOverlay, onAllocate: allocateInTown,
    skill: {
      editable: true,
      onEquip: (slot, id) => changeGear((c, now) => equipSkill(c, slot, id, now)),
      onTalents: (add) => changeGear((c, now) => { const n = allocateTalents(c, add, now); return n ? { ok: true, char: n } : { ok: false }; }),
    },
    quest: {
      onTrack: (id) => changeGear((c, now) => trackQuest(c, id, now)),
      onAbandon: async (id) => {
        if (await confirmDialog(tr('Batalkan quest ini? Progresnya hilang, tapi bisa diambil lagi.'), tr('Batalkan'))) changeGear((c, now) => abandonQuest(c, id, now));
        else openCharPanel();
      },
    },
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

// ——— dungeon ———
// The character is saved at the gate; closing the browser mid-dungeon returns
// to this state (spec §13.4).
async function enterDungeon(dungeon = 'shadow', floor = 1) {
  if (scene === 'town') syncHp();
  await saveCurrent();
  townNpc = null;
  scene = 'run';
  ensureAudio(); startMusic();
  const stats = finalStats(current);
  game.start({
    classId: current.classId, stats, hp: currentHp(current), potions: current.potions, belt: current.belt, floor, dungeon,
    level: current.level, exp: current.exp, luk: current.attrs.luk,
    effects: mergeFx(mergeFx(gearEffects(current), talentFx(current)), codexFx(current)), skills: current.skills, ult: ultimateOf(current),
  });
  tripAttrs = {};
  setupRunUI();
  await loadWorld(R3.needsWarm(game), (step) => R3.warm(game, step), 'foes');
}

// Skill / ultimate buttons, the avatar and the pause menu for a dungeon trip or a region.
function setupRunUI() {
  wornSkills(current).forEach((sk, i) => {
    const btn = $(`act-s${i + 1}`);
    btn.classList.toggle('none', !sk);
    btn.querySelector('.ic').replaceChildren(...(sk ? [iconCanvas(sk.icon || sk.id, 30)] : []));
    btn.title = sk ? `${sk.name} (${i + 1})` : t('Slot {n} kosong', { n: i + 1 });
  });
  const ult = ultimateOf(current);
  $('act-ult').classList.toggle('locked', !ult);
  if (ult) { $('act-ult').querySelector('.ic').replaceChildren(iconCanvas(ult.icon, 30)); $('act-ult').title = `${ult.name} (5)`; }
  R.avatar = avatarOf(current);
  game.weaponRarity = R.avatar.look.gear.weapon?.rarity ?? 0; // attack sparks (run/skillfx.js)
  // regions save as you go: no giving up, but back to the slots is fine (spec §25.1)
  $('surrender').classList.toggle('hidden', game.field);
  $('toslots').classList.toggle('hidden', !game.field);
  $('pausenote').classList.toggle('hidden', game.field);
  showOverlay(null);
}

// ——— open world (spec §25.1) ———
async function explore(regionId, at = 'west') {
  if (scene === 'town') syncHp();
  await saveCurrent();
  townNpc = null;
  scene = 'run';
  ensureAudio(); startMusic();
  const region = regionById(regionId);
  if (!current.regions[regionId]) { // first steps in a region count at once (a quest may wait for it)
    const before = current;
    current = syncQuests({ ...structuredClone(current), regions: { ...current.regions, [regionId]: { fog: '' } } });
    questNews(before);
  }
  game.explore({
    classId: current.classId, stats: finalStats(current), hp: currentHp(current), potions: current.potions, belt: current.belt,
    level: current.level, exp: current.exp, luk: current.attrs.luk,
    effects: mergeFx(mergeFx(gearEffects(current), talentFx(current)), codexFx(current)), skills: current.skills, ult: ultimateOf(current),
    region: regionId, at, fog: decodeFog(current.regions[regionId]?.fog, region), ...gatesAndTarget(region), opened: current.treasures[regionId] || [],
  });
  const x = current.expedition, home = x && regionOfDungeon(x.dungeon);
  if (home && home.id !== regionId) toast(t('Gerbang ekspedisi {d} ada di {r}.', { d: dungeonById(x.dungeon).name, r: home.name }));
  refreshFieldQuests();
  game.liveQuest = liveQuestTarget;
  game.clock = worldClock;
  tripAttrs = {};
  fieldSaveT = 0;
  setupRunUI();
  await loadWorld(R4.needsWarm(game), (step) => R4.warm(game, step), 'foes');
}

// This character's dungeon gates in a region and where the expedition arrow points.
function gatesAndTarget(region) {
  const gates = regionGates(current, region);
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
    onEnter: (id, floor) => { dungeonReturn = { region: game.region.id, x: g.x, y: g.y + 110 }; enterDungeon(id, floor); },
    onClose: () => resume(),
  });
  sfx.pickCard();
  showOverlay('npc');
}

// Writes what was earned in the region so far (EXP, coins, loot, bestiary, bounties, fog).
async function commitField() {
  const part = game.takeProgress();
  const before = current;
  const r = applyField(current, { ...part, region: game.region.id, fog: encodeFog(game.fog), found: game.gatesFound.splice(0), opened: game.treasuresOpened.splice(0), attrs: tripAttrs }, Date.now());
  tripAttrs = {};
  current = r.char;
  fieldSaveT = 0;
  refreshFieldQuests();
  if (r.itemsLeft.length) toast(t('Tas penuh: {n} gear ditinggal.', { n: r.itemsLeft.length }));
  else if (current.quests.main.step !== before.quests.main.step || current.quests.main.ch !== before.quests.main.ch) questNews(before);
  else if (r.bountiesDone > 0) toast(t('{n} tugas selesai — klaim di Balai Petualang', { n: r.bountiesDone }));
  return saveCurrent();
}

// Leaving a region: off the west edge (its `from` town), the east edge (its `to`
// town) or by falling (wake in the last town visited).
async function endField(died) {
  screen = 'ending';
  stopMusic();
  const region = game.region;
  await commitField();
  if (!died) {
    const to = game.exitTo === 'east' ? region.to : region.from;
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
  let text = t('Kembali ke {town}.', { town: TOWNS[current.location].name });
  if (died) {
    const r = fieldDeath(current, Date.now());
    current = r.char;
    await saveCurrent();
    text = t('Kamu tumbang di {region} dan terbangun di {town}. −{n} koin.', { region: region.name, town: TOWNS[current.location].name, n: r.goldLost });
  }
  enterTown(current, 'gate');
  toast(text);
}

function openMap() {
  if (!game.field) return;
  game.state = ST.PAUSE;
  showOverlay('fieldmap');
  const c = $('mapcanvas');
  const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawRegionMap(g, game.fmap, game.fog, { x: 0, y: 0, w, h }, { x: game.px, y: game.py }, { labels: true, title: false, gates: game.gates.filter((g) => g.found), target: game.target, quest: liveQuestTarget(), treasures: game.treasures, hidden: game.hidden });
  $('maptitle').textContent = `${game.region.name} · LV ${game.region.levels[0]}–${game.region.levels[1]}`;
  $('mapnote').textContent = t('Terjelajah {n}% · tekan M untuk menutup', { n: Math.round(explored(game.fog, game.region) * 100) });
}

// Quests in this region (spec §26.5): who lives here, places to find, items that may drop, the target.
function refreshFieldQuests() {
  const id = game.region.id, fq = fieldQuests(current, id);
  game.hidden = hiddenIn(current, id);
  game.questSpots = fq.spots.filter((s) => !game.reached.includes(s.spot));
  game.questDrops = fq.drops;
  game.questTarget = questTarget(current, id, { x: game.px, y: game.py });
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
    onQuest: async (id) => {
      const r = questTalk(current, id, 'wild', h.id, Date.now());
      if (!r.ok) { openWild(h, { text: tr(REFUSE[r.reason] || REFUSE.bad), ok: false }); return; }
      current = r.char;
      sfx.heart();
      const err = await saveCurrent();
      const msg = err ? { text: t('Gagal menyimpan: {err}', { err }), ok: false } : { ...questText(r), ok: true };
      // rewards / hand-overs change level, potions and the bag: pick the region up again from the save
      if (r.done || r.given) { explore(game.region.id, { x: game.px, y: game.py }).then(() => toast(msg.text)); return; }
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
  drawRegionMap(g, game.fmap, game.fog, { x: 0, y: 0, w, h }, { x: game.px, y: game.py }, { labels: false, window: 5000, gates: game.gates.filter((g) => g.found), target: game.target, quest: liveQuestTarget(), treasures: game.treasures, hidden: game.hidden });
}
$('minimap').addEventListener('click', openMap);
$('mapclose').addEventListener('click', () => resume());

// End of a trip — gold portal (died = false), death or giving up (died = true):
// apply rewards/penalty, auto-save, show Hasil Perjalanan (spec §13.4).
async function endRun(died) {
  if (game.field) { endField(died); return; }
  screen = 'ending';
  stopMusic();
  const r = game.result();
  const trip = {
    exp: r.exp, gold: r.gold, kills: r.kills, bossKills: r.bossKills, killsBy: r.killsBy, elites: r.elites, floorsCleared: r.floorsCleared,
    dungeon: r.dungeon, floor: r.floor, cleared: r.cleared && !died, died, hp: game.stats.hp, potions: game.potions,
    attrs: tripAttrs, items: r.items, mats: r.mats, gems: r.gems,
  };
  const newRecord = trip.floor > current.records.dungeons[r.dungeon].bestFloor;
  const before = current;
  const applied = applyTrip(current, trip, Date.now());
  current = applied.char; // keep progress in memory even if the write fails
  questNews(before);
  const saveError = await saveCurrent();
  // back out of a gate in a region (gold portal), or wake in town (spec §25.5)
  const back = !died && dungeonReturn;
  dungeonReturn = null;
  const go = () => (back ? explore(back.region, { x: back.x, y: back.y }) : enterTown(current, 'gate'));
  renderResults($('results'), { ...applied, trip, newRecord, saveError },
    { onContinue: applied.ending ? () => { renderEnding($('ending'), current, go); showMenu('ending'); } : go,
      continueLabel: back ? t('Kembali ke {r}', { r: regionById(back.region).name }) : null });
  showMenu('results');
}

function pause() { game.state = ST.PAUSE; showOverlay('pause'); }
function resume() {
  if (scene === 'town') { closeTownOverlay(); return; }
  if (game.field && screen === 'charpanel') commitField(); // points spent / stats seen: write them now
  game.state = ST.PLAY; showOverlay(null);
}

// ——— buttons ———
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

// ——— cheat panel (testing only, ui/cheat.js) ———
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
  close: toggleCheat,
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
  fps: () => { fpsShown = !fpsShown; fpsMeter.reset(); $('fps').classList.toggle('hidden', !fpsShown); drawCheat(); },
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

// ——— phones play in landscape only (spec §27) ———
// Turning to portrait pauses a run (a card asks to turn back); Android can also lock it.
const portrait = matchMedia('(orientation: portrait) and (pointer: coarse) and (max-width: 900px)');
portrait.addEventListener('change', () => { if (portrait.matches && scene === 'run' && game.state === ST.PLAY) pause(); });
addEventListener('pointerdown', function lockLandscape() {
  removeEventListener('pointerdown', lockLandscape);
  if (!matchMedia('(pointer: coarse)').matches || !window.screen.orientation?.lock) return;
  document.documentElement.requestFullscreen?.().then(() => window.screen.orientation.lock('landscape')).catch(() => { /* not supported: the card does the job */ });
});

// ——— keyboard shortcuts ———
input.onAction.push((code) => {
  if (CHEAT_ON && code === 'Backquote') { toggleCheat(); return; }
  if (!$('settings').classList.contains('hidden')) { if (code === 'Escape') $('settings-close').click(); return; } // Settings open: keys stay there
  if (code === 'KeyM') { // the map in a region, mute elsewhere
    if (scene === 'run' && game.field && (game.state === ST.PLAY || screen === 'fieldmap')) { if (screen === 'fieldmap') resume(); else openMap(); } else $('mute').click();
    return;
  }
  const go = code === 'Space' || code === 'Enter';
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

// ——— main loop ———
function tickTown(pressed) {
  if (screen !== null) return;
  town.night = isNight(worldClock); // the night merchant (spec §25.2)
  stepTown(town, { move: FLAT ? { x: input.x, y: input.y } : STAGE.toWorld(input.x, input.y) }, STEP);
  if (town.entered) sfx.dodge();
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
    dodge: pressed.has('dodge'), potion: potionSlot(pressed), ult: pressed.has('ult'),
    skill1: pressed.has('skill1'), skill2: pressed.has('skill2'), skill3: pressed.has('skill3'), skill4: pressed.has('skill4'),
  };
  if (game.field) {
    game.clock = worldClock;
    game.night = phaseOf(worldClock).icon === 'moon';
    if (game.state === ST.PLAY && (fieldSaveT += STEP) >= FIELD.saveEvery) commitField();
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
    toast(tr('FPS rendah — efek diubah ke Ringan'));
  }
  if (worldLoading) return;
  if (scene === 'run') {
    drawRunView(simT);
    if (hudT > 0.12 && game.state !== ST.TITLE) { hudT = 0; updateHUD(game); updateClock(worldClock); updateQuestTracker(current, game.state === ST.PLAY); checkPoints(); }
    if (game.state === ST.PLAY) updateActions(game);
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
  drawCampfire(g, innerWidth, innerHeight, simT);
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
}

slots = await store.loadSlots();
showTitle();
const loop = startLoop(tick, frame);
$('boot')?.classList.add('gone'); // the page loader (index.html) gives way to the title
setTimeout(() => $('boot')?.remove(), 500);

// ——— screenshot / debug hooks ———
window.__seek = (t) => {
  const v = Number(t) || 0;
  if (game.state === ST.TITLE) {
    scene = 'run';
    const cls = CLASSES[new URLSearchParams(location.search).get('class')] ? new URLSearchParams(location.search).get('class') : 'warrior';
    const region = new URLSearchParams(location.search).get('region'); // ?region=forest|ice|… tests a region
    if (region) game.explore({ classId: cls, stats: { ...CLASS_BASE, ...CLASSES[cls].stats }, region, at: 'west', gates: [], opened: [] });
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
const T_PARAM = new URLSearchParams(location.search).get('t');
if (T_PARAM !== null) window.__seek(T_PARAM);
window.__game = game;
window.__input = input; // debug/test hook: lets scripts drive the joystick
window.__town = () => town; // debug/test hook: live town state
window.__char = () => current;
window.__explore = (id) => explore(id); // debug/test hooks: walk out to a region / into a dungeon (loading screen)
window.__dungeon = (id) => enterDungeon(id);
window.__avatar = (a) => { R.avatar = a; }; // debug/test hook: dress the run's player (effects screenshots)
