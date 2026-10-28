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
import { CLASSES, CLASS_BASE } from './data/classes.js';
import { iconCanvas } from './art/sprites.js';
import { input, pollMove, consumePressed } from './core/input.js';
import { ensureAudio, startMusic, stopMusic, toggleMuted, setMuted, sfx } from './core/audio.js';
import { STEP, startLoop } from './core/loop.js';
import { openStore } from './meta/save.js';
import { createCharacter, applyTrip, finalStats, currentHp, usePotion, addExp, allocate } from './meta/character.js';
import { innRest, buyPotion, setBelt, buyChest, sellItems, buyUpgrade, respec, respecPrice, changeLook } from './meta/shop.js';
import { enhance, reroll, salvage, socketGem, unsocket, combineGems } from './meta/forge.js';
import { codexFx } from './meta/collection.js';
import { claimBounty, rerollBounty, buyWithMarks } from './meta/bounties.js';
import { equipSkill, allocateTalents, wornSkills, talentFx, mergeFx, respecTalents, talentRespecPrice, ultimateOf } from './meta/talents.js';
import { MATS, GEMS, GEM_TIER_NAMES } from './data/forge.js';
import { UPGRADES } from './data/shop.js';
import { equip, unequip, discard, gearEffects, dollGear } from './meta/gear.js';
import { itemName, makeItem, statText } from './meta/itemgen.js';
import { renderCheat, CHEAT_ON } from './ui/cheat.js';
import { showChestOpen, showMythicCard } from './ui/reveal.js';
import { UNIQUES, SLOT_IDS, LEGENDARY, RARITIES } from './data/items.js';
import { POTION_MAX } from './data/potions.js';
import { CHAR_LEVEL_MAX, INVENTORY_MAX } from './data/balance.js';
import { DUNGEONS, dungeonById } from './data/dungeons.js';
import { startFloor } from './run/dungeon.js';
import { GAME_MIN_PER_SEC } from './data/time.js';
import { FIELD, TOWNS, TOWN_IDS, regionById, regionOfDungeon } from './data/world.js';
import { applyField, fieldDeath, encodeFog, decodeFog, explored, visitTown, teleport, regionGates, takeExpedition, claimExpedition, dropExpedition } from './meta/world.js';
import { phaseOf } from './meta/clock.js';
import { drawRegionMap } from './render/regionmap.js';
import { isHeal, POTIONS, POTION_IDS } from './data/potions.js';
import { createTown, stepTown } from './town/town.js';
import { showScreen, confirmDialog } from './ui/screens.js';
import { renderSlots } from './ui/slots.js';
import { renderCreate } from './ui/create.js';
import { renderResults } from './ui/results.js';
import { renderNpc, renderDungeonGate } from './ui/npc.js';
import { renderCharPanel } from './ui/charpanel.js';
import { updateHUD, updateActions, updateTownHUD, updateClock } from './ui/hud.js';
import { setupTouch, updateJoystick } from './ui/touch.js';
import { FpsWatch, activeQuality } from './run/vfx.js';
import { setRarity } from './art/auratier.js';
import { QUALITY, PALETTES } from './data/fx.js';

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
let fieldSaveT = 0;    // seconds since the last save in a region (spec §25.1)
let minimapT = 0;
let dungeonReturn = null; // { region, x, y }: a dungeon entered from a gate in a region (spec §25.5)
let worldClock = 0;    // in-game minutes since day 1 (spec §18.4); written to the save on every save

// ——— save + settings ———
const store = await openStore();
if (!store.persistent) $('nosave').classList.remove('hidden');

function legacyMuted() {
  try { return localStorage.getItem('cs-muted') === '1'; } catch (_) { return false; }
}
const settings = (await store.loadSettings()) ?? { version: 4, muted: legacyMuted(), lastSlot: 0, autoAttack: false, lang: 'en', effects: 'full' };
// language first: everything below renders in it (spec §23)
setLang(settings.lang);
localizeData();
applyDom();
document.documentElement.lang = settings.lang;
// switching language saves the setting and reloads, so every screen is rebuilt in it
function switchLang() {
  settings.lang = getLang() === 'en' ? 'id' : 'en';
  store.saveSettings(settings).finally(() => location.reload());
}
for (const id of ['langbtn', 'langbtn2']) {
  $(id).textContent = getLang() === 'en' ? 'EN · ID' : 'ID · EN';
  $(id).addEventListener('click', switchLang);
}
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

// Effects level (pause menu, plan "Efek Lebay" §A): full / lite. Full drops to lite for
// the session when FPS stays low in a fight; choosing again clears that.
const TOUCH = matchMedia('(pointer: coarse)').matches;
const fpsWatch = new FpsWatch();
const fpsMeter = new FpsWatch({ fps: 0, seconds: Infinity }); // cheat panel readout only
let fxForcedLite = false, fpsShown = false;
function applyEffects() {
  const id = activeQuality(settings.effects, fxForcedLite), q = QUALITY[id];
  game.vfx.setQuality(q, TOUCH ? q.touchCap : q.cap);
  R.shakeOn = q.shake;
  $('fxbtn').textContent = id === 'full' ? tr('Efek: Penuh') : fxForcedLite ? tr('Efek: Ringan (otomatis)') : tr('Efek: Ringan');
}
applyEffects();
$('fxbtn').addEventListener('click', () => {
  settings.effects = activeQuality(settings.effects, fxForcedLite) === 'full' ? 'lite' : 'full';
  fxForcedLite = false; fpsWatch.reset();
  applyEffects();
  saveSettings();
});

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
  const what = e.status === 'ok' ? `${e.data.name} (LV ${e.data.level})` : t('data rusak di slot {n}', { n: slot + 1 });
  if (!(await confirmDialog(t('Hapus {what}? Tidak bisa dibatalkan.', { what }), tr('Hapus')))) return;
  await store.deleteSlot(slot);
  await toSlots();
}

// ——— town ———
function enterTown(char, at) {
  current = char;
  worldClock = char.clock;
  settings.lastSlot = char.slot;
  saveSettings();
  stopMusic();
  const s = finalStats(char);
  town = createTown({ id: char.location, moveSpd: s.moveSpd, hp: currentHp(char), maxHp: s.maxHp, at });
  scene = 'town';
  game.state = ST.TITLE;
  $('banner').style.opacity = 0; // a region / floor title may still be fading
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
    onBountyClaim: (i) => serve((c, now) => claimBounty(c, i, Math.random, now), (r) => ({
      text: t('Tugas selesai! +{g} koin, +{e} EXP, +{d} {dust}, +{m} Lencana.', { g: r.reward.gold, e: r.reward.exp, d: r.reward.dust, dust: MATS.dust.name, m: r.reward.marks })
        + (r.levelsGained ? ` ${tr('Naik level!')}` : ''), color: '#e6c27a',
    })),
    onBountyReroll: (i) => serve((c, now) => rerollBounty(c, i, Math.random, now), tr('Tugas baru ditempel di papan.')),
    onMarkBuy: (id) => serve((c, now) => buyWithMarks(c, id, Math.random, now), (r) => (r.item
      ? { text: t('Kau mendapat {item} ({rarity})!', { item: itemName(r.item), rarity: RARITIES[r.item.rarity].name }), color: RARITIES[r.item.rarity].color }
      : r.gem ? t('Kau mendapat {gem}!', { gem: `${GEMS[r.gem.gem].name} ${GEM_TIER_NAMES[r.gem.tier - 1]}` }) : tr('Bahan masuk ke tasmu.'))),
    onEnter: enterDungeon,
    onExpTake: (id) => serve((c, now) => takeExpedition(c, id, now), (r) => t('Ekspedisi diterima: {d}. Gerbangnya kutandai di petamu.', { d: dungeonById(r.char.expedition.dungeon).name })),
    onExpDrop: () => serve(dropExpedition, tr('Ekspedisi dibatalkan.')),
    onExpClaim: () => serve(claimExpedition, (r) => ({ text: t('Ekspedisi tuntas! +{g} koin, +{e} EXP, +{m} Lencana.', { g: r.reward.gold, e: r.reward.exp, m: r.reward.marks }) + (r.levelsGained ? ` ${tr('Naik level!')}` : ''), color: '#e6c27a' })),
    onExplore: (id) => explore(id, regionById(id).from === current.location ? 'west' : 'east'),
    onTeleport: travel,
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
  marks: 'Lencanamu belum cukup.', notdone: 'Tugas itu belum selesai.',
  mats: 'Bahanmu belum cukup.', here: 'Kamu sudah di sini.', unknown: 'Kamu belum pernah ke sana.', socket: 'Soket itu tidak bisa dipakai.', gem: 'Permatamu belum cukup.', missing: 'Barang itu tidak ada.',
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
  const s = finalStats(current); // upgrades / respec change max HP and speed
  town.maxHp = s.maxHp; town.moveSpd = s.moveSpd; town.hp = currentHp(current);
  if (okText) sfx.heart(); else sfx.pickCard();
  const err = await saveCurrent();
  const ok = typeof okText === 'function' ? okText(r) : okText;
  openNpc(townNpc, err ? { text: t('Gagal menyimpan: {err}', { err }), ok: false } : ok && (typeof ok === 'string' ? { text: ok, ok: true } : { ...ok, ok: true }));
  updateTownHUD(current, town);
}

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
  game.explore({
    classId: current.classId, stats: finalStats(current), hp: currentHp(current), potions: current.potions, belt: current.belt,
    level: current.level, exp: current.exp, luk: current.attrs.luk,
    effects: mergeFx(mergeFx(gearEffects(current), talentFx(current)), codexFx(current)), skills: current.skills, ult: ultimateOf(current),
    region: regionId, at, fog: decodeFog(current.regions[regionId]?.fog, region), ...gatesAndTarget(region),
  });
  const x = current.expedition, home = x && regionOfDungeon(x.dungeon);
  if (home && home.id !== regionId) toast(t('Gerbang ekspedisi {d} ada di {r}.', { d: dungeonById(x.dungeon).name, r: home.name }));
  game.clock = worldClock;
  tripAttrs = {};
  fieldSaveT = 0;
  setupRunUI();
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
  const r = applyField(current, { ...part, region: game.region.id, fog: encodeFog(game.fog), found: game.gatesFound.splice(0), attrs: tripAttrs }, Date.now());
  tripAttrs = {};
  current = r.char;
  fieldSaveT = 0;
  if (r.itemsLeft.length) toast(t('Tas penuh: {n} gear ditinggal.', { n: r.itemsLeft.length }));
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
    current = visitTown(current, to, Date.now());
    await saveCurrent();
    if (first) {
      enterTown(current, 'gate');
      toast(t('Selamat datang di {town}! Batu teleport di alun-alun kini bisa membawamu ke sini.', { town: TOWNS[to].name }));
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
  drawRegionMap(g, game.fmap, game.fog, { x: 0, y: 0, w, h }, { x: game.px, y: game.py }, { labels: true, title: false, gates: game.gates.filter((g) => g.found), target: game.target });
  $('maptitle').textContent = `${game.region.name} · LV ${game.region.levels[0]}–${game.region.levels[1]}`;
  $('mapnote').textContent = t('Terjelajah {n}% · tekan M untuk menutup', { n: Math.round(explored(game.fog, game.region) * 100) });
}

function drawMinimap() {
  const c = $('minimap');
  const w = c.clientWidth, h = c.clientHeight;
  if (!w) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawRegionMap(g, game.fmap, game.fog, { x: 0, y: 0, w, h }, { x: game.px, y: game.py }, { labels: false, window: 5000, gates: game.gates.filter((g) => g.found), target: game.target });
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
  const applied = applyTrip(current, trip, Date.now());
  current = applied.char; // keep progress in memory even if the write fails
  const saveError = await saveCurrent();
  // back out of a gate in a region (gold portal), or wake in town (spec §25.5)
  const back = !died && dungeonReturn;
  dungeonReturn = null;
  renderResults($('results'), { ...applied, trip, newRecord, saveError },
    { onContinue: () => (back ? explore(back.region, { x: back.x, y: back.y }) : enterTown(current, 'gate')),
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
$('prompt').addEventListener('click', () => {
  if (scene === 'run' && game.field && game.nearGate && game.state === ST.PLAY) { openGate(game.nearGate); return; }
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
  bounties: () => cheatChar((c) => { for (const bt of c.bounties) bt.have = bt.need; }, 'Semua tugas selesai'),
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

// ——— keyboard shortcuts ———
input.onAction.push((code) => {
  if (CHEAT_ON && code === 'Backquote') { toggleCheat(); return; }
  if (code === 'KeyM') { // the map in a region, mute elsewhere
    if (scene === 'run' && game.field && (game.state === ST.PLAY || screen === 'fieldmap')) { if (screen === 'fieldmap') resume(); else openMap(); } else $('mute').click();
    return;
  }
  const go = code === 'Space' || code === 'Enter';
  if (screen === 'title' && go) { $('play').click(); return; }
  if (screen === 'results' && go) { $('tocamp').click(); return; }
  if (scene === 'town') {
    if (code === 'Escape') { if (screen === null) townPause(); else closeTownOverlay(); return; }
    if (code === 'KeyI') { if (screen === null) openCharPanel(); else if (screen === 'charpanel') closeTownOverlay(); return; }
    if (code === 'Enter' && screen === null && town.near) openNpc(town.near);
    return;
  }
  if (code === 'KeyF' && game.state === ST.PLAY) { toggleAuto(); return; }
  if (code === 'KeyI' && game.state === ST.PLAY) { openCharPanel(); return; }
  if (code === 'KeyI' && screen === 'charpanel') { resume(); return; }
  if ((screen === 'charpanel' || screen === 'fieldmap') && code === 'Escape') { resume(); return; }
  if (game.state === ST.PLAY && code === 'Escape') { pause(); return; }
  if (game.state === ST.PAUSE && code === 'Escape') { resume(); return; }
});

let hudT = 0;

// ——— main loop ———
function tickTown(pressed) {
  if (screen !== null) return;
  stepTown(town, { move: { x: input.x, y: input.y } }, STEP);
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
  const aimAt = !auto && !input.touch && input.mouse.active ? R.screenToWorld(input.mouse.x, input.mouse.y) : null;
  const attack = input.touch ? input.attackHeld : input.mouse.down;
  game.intent = {
    move: { x: input.x, y: input.y }, aimAt, attack, auto,
    dodge: pressed.has('dodge'), potion: potionSlot(pressed), ult: pressed.has('ult'),
    skill1: pressed.has('skill1'), skill2: pressed.has('skill2'), skill3: pressed.has('skill3'), skill4: pressed.has('skill4'),
  };
  if (game.field) {
    game.clock = worldClock;
    game.night = phaseOf(worldClock).icon === 'moon';
    if (game.state === ST.PLAY && (fieldSaveT += STEP) >= FIELD.saveEvery) commitField();
  }
  if (game.field && game.state === ST.PLAY && pressed.has('talk') && game.nearGate) { openGate(game.nearGate); return false; }
  const wasPlaying = game.state === ST.PLAY;
  game.step(STEP);
  // react only on the PLAY -> OVER transition
  if (!wasPlaying) return false;
  if (game.state === ST.OVER) { $('dmg').style.opacity = 0; endRun(!game.returned); return true; }
  return false;
}

function tick() {
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
  if (scene === 'run' && game.state === ST.PLAY && settings.effects === 'full' && !fxForcedLite && fpsWatch.push(dt)) {
    fxForcedLite = true;
    applyEffects();
    toast(tr('FPS rendah — efek diubah ke Ringan'));
  }
  if (scene === 'run') {
    R.draw(game, simT);
    if (hudT > 0.12 && game.state !== ST.TITLE) { hudT = 0; updateHUD(game); updateClock(worldClock); }
    if (game.state === ST.PLAY) updateActions(game);
    if (game.field && game.state === ST.PLAY && (minimapT += dt) > 0.25) { minimapT = 0; drawMinimap(); }
    const gate = game.field && game.state === ST.PLAY ? game.nearGate : null;
    $('prompt').classList.toggle('hidden', !gate);
    if (gate) $('prompttext').textContent = t('Masuk {name}', { name: dungeonById(gate.dungeon).name });
  } else {
    TR.draw(scene === 'town' ? town : null, simT, current && avatarOf(current), current ? worldClock : 20 * 60, current?.location || 'home');
    if (scene === 'town') {
      if (hudT > 0.12) { hudT = 0; updateTownHUD(current, town); updateClock(worldClock); }
      const near = screen === null ? town.near : null;
      $('prompt').classList.toggle('hidden', !near);
      document.body.classList.toggle('near', !!near);
      if (near) $('prompttext').textContent = t('Bicara dengan {name}', { name: near.name });
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
window.__avatar = (a) => { R.avatar = a; }; // debug/test hook: dress the run's player (effects screenshots)
