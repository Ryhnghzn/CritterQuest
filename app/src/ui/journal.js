// Quest journal (spec §26.3): a tab of the character panel (and key J). The main
// quest's chapter with the steps done so far, then the side quests being worked on.
import { dungeonById } from '../data/dungeons.js';
import { ENEMIES } from '../data/enemies.js';
import { TOWNS, regionOfDungeon, regionById } from '../data/world.js';
import { MAIN, SHARDS, SIDE_MAX, DROP_ITEMS, SPOTS, hiddenById } from '../data/quests.js';
import { MATS, GEMS, GEM_TIER_NAMES, GEM_IDS } from '../data/forge.js';
import { POTIONS } from '../data/potions.js';
import { RARITIES, UNIQUES } from '../data/items.js';
import { activeQuests, shards, mainDone, spotsDone } from '../meta/quests.js';
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
    case 'gate': return t('Temukan gerbang {d} di {r}', { d: dungeonById(s.dungeon).name, r: regionOfDungeon(s.dungeon)?.name ?? '' });
    case 'boss': return t('Kalahkan bos {d} (lantai 5)', { d: dungeonById(s.dungeon).name });
    case 'kill': return s.region ? t('Kalahkan {n} {enemy} di {r}', { n: s.n, enemy: ENEMIES[s.enemy].name, r: regionById(s.region).name }) : t('Kalahkan {n} {enemy}', { n: s.n, enemy: ENEMIES[s.enemy].name });
    case 'elite':
      if (s.enemy) return t('Kalahkan {n} {enemy} elite di {r}', { n: s.n, enemy: ENEMIES[s.enemy].name, r: regionById(s.region).name });
      return s.region ? t('Kalahkan {n} elite di {r}', { n: s.n, r: regionById(s.region).name }) : t('Kalahkan {n} elite', { n: s.n });
    case 'reach': return t('Temukan {n} {what} di {r}', { n: s.spots.length, what: tr(s.label), r: regionById(SPOTS[s.spots[0]].region).name });
    case 'drop': return t('Kumpulkan {n} {item} dari {enemy} di {r}', { n: s.n, item: DROP_ITEMS[s.item].name, enemy: ENEMIES[s.enemy].name, r: regionById(s.region).name });
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

// "Pecahan Segel · gear Epik · permata tk 2 · koin & EXP"
export function rewardText(reward) {
  const out = [];
  if (reward.unique) out.push(UNIQUES.find((u) => u.id === reward.unique).name);
  if (reward.shard) out.push(tr('Pecahan Segel'));
  if (reward.gear) out.push(t('gear {r}', { r: RARITIES[reward.gear.rarity].name }));
  for (const g of reward.gems || []) out.push(t('permata tk {n}', { n: g.tier }));
  if (reward.marks) out.push(t('{n} Lencana', { n: reward.marks }));
  for (const [m, n] of Object.entries(reward.mats || {})) out.push(`${n} ${MATS[m].name}`);
  for (const [p, n] of Object.entries(reward.potions || {})) out.push(`${n} ${POTIONS[p].name}`);
  if (reward.gold || reward.exp) out.push(tr('koin & EXP'));
  return out.join(' · ');
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
  card.append(steps, el('div', 'qreward', `${tr('Hadiah')}: ${rewardText(a.def.reward)}`));
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
  else if (mainDone(char)) main.append(el('div', 'note', tr('Kelima Pecahan Segel sudah terkumpul. Kisahnya berlanjut… (segera)')));
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
