// Quest journal (spec §26.3): a tab of the character panel (and key J). The main
// quest's chapter with the steps done so far, then the side quests being worked on.
import { dungeonById } from '../data/dungeons.js';
import { ENEMIES } from '../data/enemies.js';
import { TOWNS, regionOfDungeon, regionById } from '../data/world.js';
import { MAIN, SHARDS, SIDE_MAX, DROP_ITEMS, SPOTS, hiddenById } from '../data/quests.js';
import { MATS, GEMS, GEM_TIER_NAMES, GEM_IDS } from '../data/forge.js';
import { POTIONS } from '../data/potions.js';
import { RARITIES, UNIQUES } from '../data/items.js';
import { activeQuests, shards, mainDone, spotsDone, rewardPreview } from '../meta/quests.js';
import { gemName } from '../meta/itemgen.js';
import { gearCanvas } from '../art/gear.js';
import { iconCanvas } from '../art/sprites.js';
import { el, button } from './screens.js';
import { tr, t } from '../i18n.js';

const town = (id) => TOWNS[id]?.name ?? id;
// a town, or the region a hidden person lives in
const where = (s) => (s.town === 'wild' ? regionById(hiddenById(s.npc).region).name : town(s.town));

// One line for a step: "Temukan gerbang Gua Kristal di Padang Es"
export function stepText(s) {
  switch (s.kind) {
    case 'talk': return t('Bicara dengan {who} di {town}', { who: s.who, town: where(s) });
    case 'town': return t('Pergi ke {town}', { town: town(s.town) });
    case 'region': return t('Masuki {r} (gerbang {town})', { r: regionById(s.region).name, town: town(regionById(s.region).from) });
    case 'gate': return t('Temukan gerbang {d} di {r}', { d: dungeonById(s.dungeon).name, r: regionOfDungeon(s.dungeon)?.name ?? '' });
    case 'boss': return t('Kalahkan bos {d} (lantai 5)', { d: dungeonById(s.dungeon).name });
    case 'kill': return s.region ? t('Kalahkan {n} {enemy} di {r}', { n: s.n, enemy: ENEMIES[s.show || s.enemy].name, r: regionById(s.region).name }) : t('Kalahkan {n} {enemy}', { n: s.n, enemy: ENEMIES[s.enemy].name });
    case 'elite':
      if (s.enemy) return t('Kalahkan {n} {enemy} elite di {r}', { n: s.n, enemy: ENEMIES[s.enemy].name, r: regionById(s.region).name });
      return s.region ? t('Kalahkan {n} elite di {r}', { n: s.n, r: regionById(s.region).name }) : t('Kalahkan {n} elite', { n: s.n });
    case 'reach': return t('Temukan {n} {what} di {r}', { n: s.spots.length, what: tr(s.label), r: regionById(SPOTS[s.spots[0]].region).name });
    case 'drop':
      if (s.enemy === '*') return t('Kumpulkan {n} {item} dari musuh di {r} pada malam hari', { n: s.n, item: DROP_ITEMS[s.item].name, r: regionById(s.region).name });
      return t('Kumpulkan {n} {item} dari {enemy} di {r}', { n: s.n, item: DROP_ITEMS[s.item].name, enemy: ENEMIES[s.enemy].name, r: regionById(s.region).name });
    case 'event': {
      const text = { escort: 'Kawal {name} di {r}', defend: 'Pertahankan {name} di {r}', outlaw: 'Buru {name} di {r}', nest: 'Hancurkan {name} di {r}' }[s.event];
      return t(text, { name: s.name, r: regionById(s.region).name });
    }
    case 'guard': return s.lord ? t('Kalahkan Penguasa {r} (peti harta terakhir)', { r: regionById(s.region).name }) : t('Kalahkan {n} penjaga harta di {r}', { n: s.n || 1, r: regionById(s.region).name });
    case 'give': return t('Serahkan barang kepada {who} di {town}', { who: s.who, town: where(s) });
    default: return '';
  }
}

// What a give step asks for, one line each with whether the character has it: [{ text, ok }]
export function giveLines(s, char) {
  const out = [];
  for (const [m, n] of Object.entries(s.mats || {})) out.push({ text: `${n} ${MATS[m].name}`, ok: char.mats[m] >= n });
  for (const g of s.gems || []) {
    const have = g.gem ? char.gems[g.gem][g.tier - 1] : GEM_IDS.reduce((a, id) => a + char.gems[id][g.tier - 1], 0);
    out.push({ text: g.gem ? `${g.n || 1} ${GEMS[g.gem].name} ${GEM_TIER_NAMES[g.tier - 1]}` : t('{n} permata {tier}', { n: g.n || 1, tier: GEM_TIER_NAMES[g.tier - 1] }), ok: have >= (g.n || 1) });
  }
  for (const [p, n] of Object.entries(s.potions || {})) out.push({ text: `${n} ${POTIONS[p].name}`, ok: char.potions[p] >= n });
  if (s.gear) {
    const have = char.inventory.filter((it) => it.rarity >= s.gear.rarity && !Object.values(char.equipped).includes(it.id)).length;
    out.push({ text: t('{n} gear {r} atau lebih', { n: s.gear.n || 1, r: RARITIES[s.gear.rarity].name }), ok: have >= (s.gear.n || 1) });
  }
  return out;
}

// A gear piece to draw in a reward chip (a unique as it is; random gear as an armour of that rarity)
const pvItem = (char, slot, rarity, unique = null) => ({ id: 'pv', slot, classId: slot === 'weapon' ? char.classId : null, variant: 0, rarity, itemLevel: char.level, base: {}, bonuses: [], unique, plus: 0, sockets: [] });

// The reward spelled out, one chip each with its icon: gear (with its rarity), gems,
// Lencana, materials, potions, then the exact coins & EXP at the character's level.
export function rewardChips(char, reward) {
  const p = rewardPreview(char, reward), box = el('div', 'rwchips');
  const chip = (icon, text, color = null) => {
    const c = el('span', 'rwchip');
    if (color) c.style.setProperty('--c', color);
    if (icon) c.append(icon);
    c.append(el('span', null, text));
    box.append(c);
  };
  if (p.shard) chip(iconCanvas('zap', 20), tr('Pecahan Segel'), '#ffd24a');
  if (p.unique) {
    const u = UNIQUES.find((x) => x.id === p.unique);
    chip(gearCanvas(pvItem(char, u.slot, u.rarity, u.id), 26), `${u.name} · ${RARITIES[u.rarity].name}`, RARITIES[u.rarity].color);
  }
  if (p.gear) chip(gearCanvas(pvItem(char, 'armor', p.gear.rarity), 26), t('Gear {r} acak · LV {n}', { r: RARITIES[p.gear.rarity].name, n: char.level }), RARITIES[p.gear.rarity].color);
  for (const g of p.gems) chip(iconCanvas('gem', 20), g.gem ? gemName(g.gem, g.tier) : t('Permata {tier} acak', { tier: GEM_TIER_NAMES[g.tier - 1] }), g.gem ? GEMS[g.gem].color : '#b9a7e8');
  if (p.marks) chip(el('span', 'markic'), t('{n} Lencana', { n: p.marks }), '#9fe0ff');
  for (const [m, n] of Object.entries(p.mats)) { const d = el('i', 'matdot'); d.style.background = MATS[m].color; chip(d, `${n} ${MATS[m].name}`, MATS[m].color); }
  for (const [id, n] of Object.entries(p.potions)) chip(iconCanvas(`pot_${id}`, 20), `${n} ${POTIONS[id].name}`);
  if (p.gold) chip(el('span', 'coin'), t('+{n} koin', { n: p.gold }), '#e6c27a');
  if (p.exp) chip(null, t('+{n} EXP', { n: p.exp }), '#8ff5c8');
  return box;
}

function questCard(a, main, char, opts) {
  const card = el('div', `quest${main ? ' main' : ''}`);
  card.dataset.quest = a.id;
  const head = el('div', 'qhead');
  head.append(el('span', 'pill', main ? t('Bab {n}', { n: a.def.ch + 1 }) : tr('Side quest')), el('b', null, a.def.title));
  card.append(head);
  const steps = el('ol', 'qsteps');
  a.def.steps.forEach((s, i) => {
    if (i > a.state.step) return; // what comes next stays a surprise
    const li = el('li', i < a.state.step ? 'done' : 'now', stepText(s));
    if (i === a.state.step && (s.kind === 'kill' || s.kind === 'elite' || s.kind === 'drop')) li.append(el('span', 'qprog', ` ${a.state.prog}/${s.n}`));
    if (i === a.state.step && s.kind === 'reach') li.append(el('span', 'qprog', ` ${spotsDone(s, a.state.prog)}/${s.spots.length}`));
    steps.append(li);
  });
  const rw = el('div', 'qreward');
  rw.append(el('span', 'qrlabel', tr('Hadiah')), rewardChips(char, a.def.reward));
  card.append(steps, rw);
  const tracked = (char.quests.track || activeQuests(char)[0]?.id) === a.id;
  if (opts?.onTrack || opts?.onAbandon) {
    const row = el('div', 'row qbtns');
    if (tracked) row.append(el('span', 'hchip ok', tr('Dilacak')));
    else if (opts.onTrack) { const b = button(tr('Lacak'), 'btn small ghost', () => opts.onTrack(a.id)); b.dataset.track = a.id; row.append(b); }
    if (!main && opts.onAbandon) { const b = button(tr('Batalkan'), 'btn small ghost', () => opts.onAbandon(a.id)); b.dataset.abandon = a.id; row.append(b); }
    card.append(row);
  } else if (tracked) card.classList.add('tracked');
  return card;
}

// opts: { onTrack(id), onAbandon(id) } — in town only
export function renderQuestTab(char, opts = null) {
  const body = el('div', 'cpbody journal');
  const main = el('div', 'panel');
  const head = el('div', 'attrhead');
  head.append(el('h3', null, tr('Quest Utama')), el('span', 'pts shards', t('Pecahan Segel {n}/{max}', { n: shards(char), max: SHARDS })));
  main.append(head);
  const list = activeQuests(char);
  const m = list.find((a) => a.def.main);
  if (m) main.append(questCard(m, true, char, opts));
  else if (mainDone(char)) main.append(el('div', 'note', tr('Kisah utama tamat. Gerhana sudah dikalahkan; Menara Gerhana bisa didaki lagi kapan saja.')));
  const done = MAIN.filter((q) => char.quests.done.includes(q.id));
  if (done.length) {
    const past = el('div', 'qdone');
    for (const q of done) past.append(el('span', 'hchip', `✓ ${q.title}`));
    main.append(past);
  }
  const side = el('div', 'panel');
  const sides = list.filter((a) => !a.def.main);
  const sh = el('div', 'attrhead');
  sh.append(el('h3', null, tr('Side Quest')), el('span', 'pts', `${sides.length} / ${SIDE_MAX}`));
  side.append(sh);
  if (sides.length) for (const a of sides) side.append(questCard(a, false, char, opts));
  else side.append(el('div', 'note', tr('Belum ada side quest. Carilah orang bertanda ! di kota dan di jalan.')));
  body.append(main, side);
  return body;
}
