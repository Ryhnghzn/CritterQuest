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
import { equipSkill, allocateTalents, wornSkills, talentFx, mergeFx, respecTalents, talentRespecPrice, ultimateOf } from './meta/talents.js';
import { MATS } from './data/forge.js';
import { UPGRADES } from './data/shop.js';
import { equip, unequip, discard, gearEffects, dollGear } from './meta/gear.js';
import { itemName, makeItem, statText } from './meta/itemgen.js';
import { renderCheat, CHEAT_ON } from './ui/cheat.js';
import { UNIQUES, SLOT_IDS, LEGENDARY, RARITIES } from './data/items.js';
import { POTION_MAX } from './data/potions.js';
import { CHAR_LEVEL_MAX, INVENTORY_MAX } from './data/balance.js';
import { DUNGEONS, dungeonById } from './data/dungeons.js';
import { startFloor } from './run/dungeon.js';
import { GAME_MIN_PER_SEC } from './data/time.js';
import { isHeal, POTIONS, POTION_IDS } from './data/potions.js';
import { createTown, stepTown } from './town/town.js';
import { showScreen, confirmDialog } from './ui/screens.js';
import { renderSlots } from './ui/slots.js';
import { renderCreate } from './ui/create.js';
import { renderResults } from './ui/results.js';
import { renderNpc } from './ui/npc.js';
import { renderCharPanel } from './ui/charpanel.js';
import { updateHUD, updateActions, updateTownHUD, updateClock } from './ui/hud.js';
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
let worldClock = 0;    // in-game minutes since day 1 (spec §18.4); written to the save on every save

// ——— save + settings ———
const store = await openStore();
if (!store.persistent) $('nosave').classList.remove('hidden');

function legacyMuted() {
  try { return localStorage.getItem('cs-muted') === '1'; } catch (_) { return false; }
}
const settings = (await store.loadSettings()) ?? { version: 3, muted: legacyMuted(), lastSlot: 0, autoAttack: false, lang: 'en' };
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
    onInn: () => serve(innRest, tr('Kamu tidur nyenyak. HP pulih penuh!')),
    onBuyPotion: (id) => serve((c, now) => buyPotion(c, id, now), t('{name}, segar dari kuali. Hehehe.', { name: POTIONS[id].name })),
    onBelt: (slot) => serve((c, now) => setBelt(c, slot, nextBeltPotion(c, slot), now), null),
    onBuyChest: (kind) => serve((c, now) => buyChest(c, kind, now), (r) => ({
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
    onEnter: enterDungeon,
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
  mats: 'Bahanmu belum cukup.', socket: 'Soket itu tidak bisa dipakai.', gem: 'Permatamu belum cukup.', missing: 'Barang itu tidak ada.',
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
const avatarOf = (c) => ({ classId: c.classId, look: { ...c.look, gear: dollGear(c) }, fx: gearEffects(c), level: c.level });

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
  syncHp();
  await saveCurrent();
  townNpc = null;
  scene = 'run';
  ensureAudio(); startMusic();
  const stats = finalStats(current);
  game.start({
    classId: current.classId, stats, hp: currentHp(current), potions: current.potions, belt: current.belt, floor, dungeon,
    level: current.level, exp: current.exp, luk: current.attrs.luk,
    effects: mergeFx(gearEffects(current), talentFx(current)), skills: current.skills, ult: ultimateOf(current),
  });
  tripAttrs = {};
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
    dungeon: r.dungeon, floor: r.floor, cleared: r.cleared && !died, died, hp: game.stats.hp, potions: game.potions,
    attrs: tripAttrs, items: r.items, mats: r.mats, gems: r.gems,
  };
  const newRecord = trip.floor > current.records.dungeons[r.dungeon].bestFloor;
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

// ——— cheat panel (testing only, ui/cheat.js) ———
let cheatOpen = false;
const cheatScene = () => (scene === 'run' ? 'run' : scene === 'town' && current ? 'town' : 'menu');
function drawCheat() { renderCheat($('cheat'), { scene: cheatScene(), god: !!game.god }, cheatActions, drawCheat); }
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
  mats: () => cheatChar((c) => { c.mats.dust += 500; c.mats.crystal += 100; c.mats.core += 20; }, 'Material bertambah'),
  gems: () => cheatChar((c) => { for (const g in c.gems) c.gems[g][0] += 6; }, 'Permata bertambah'),
  unlockFloors: () => cheatChar((c) => {
    for (const d of DUNGEONS) { const r = c.records.dungeons[d.id]; r.bestFloor = 5; r.clears = Math.max(1, r.clears); }
  }, 'Semua dungeon & lantai terbuka di gerbang'),
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
  if (code === 'KeyM') { $('mute').click(); return; }
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
  // the clock runs while walking in town and while fighting (not in menus or paused)
  if ((scene === 'town' && screen === null) || (scene === 'run' && game.state === ST.PLAY)) worldClock += GAME_MIN_PER_SEC * STEP;
  if (scene === 'town') { tickTown(pressed); return false; }
  if (scene === 'run') return tickRun(pressed);
  return false;
}

function frame(dt) {
  hudT += dt;
  if (scene === 'run') {
    R.draw(game, simT);
    if (hudT > 0.12 && game.state !== ST.TITLE) { hudT = 0; updateHUD(game); updateClock(worldClock); }
    if (game.state === ST.PLAY) updateActions(game);
  } else {
    TR.draw(scene === 'town' ? town : null, simT, current && avatarOf(current), current ? worldClock : 20 * 60);
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
