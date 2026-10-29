// UI comparison page: four key screens built twice from the same markup — wrapped in
// .now (today's index.html look) and .new (the proposed dark-fantasy look) — using
// the game's own art: portraits, gear icons, potion and skill icons.
import { gearCanvas } from '../src/art/gear.js';
import { portrait } from '../src/art/doll.js';
import { iconCanvas } from '../src/art/sprites.js';
import { RARITIES } from '../src/data/items.js';
import { TOWN } from '../src/data/town.js';

const $ = (id) => document.getElementById(id);
function el(tag, cls, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
const txt = (tag, cls, s) => { const e = el(tag, cls); e.textContent = s; return e; };

const MYTH = { tier: 6, rarity: 5 };
const HERO_LOOK = { hair: 1, hairColor: 2, gear: { weapon: MYTH, helm: { tier: 5, rarity: 4 }, armor: MYTH, boots: { tier: 5, rarity: 4 } } };
const ODO = TOWN.npcs.find((n) => n.id === 'odo');
const item = (slot, variant, rarity, classId = 'warrior') => ({ slot, variant, rarity, classId, itemLevel: 12 + variant * 6 });

// ——— 1. HUD dungeon ———
function hud() {
  const s = el('div', 'scr dungeon');
  s.append(el('div', 'scene-figure', portrait('warrior', HERO_LOOK, 130)));
  // top-left: portrait, level, bars
  const bars = el('div', 'bars',
    el('div', 'barrow', txt('span', 'lbl', 'HP'), el('div', 'hpbar', el('i')), txt('span', 'num', '182 / 240')),
    el('div', 'barrow', txt('span', 'lbl', 'EN'), el('div', 'enbar', el('i')), txt('span', 'num', '64 / 100')),
    el('div', 'xpbar', el('i')));
  bars.querySelector('.hpbar i').style.width = '76%';
  bars.querySelector('.enbar i').style.width = '64%';
  bars.querySelector('.xpbar i').style.width = '42%';
  const hudTL = el('div', 'hud tl', el('div', 'mini', portrait('warrior', HERO_LOOK, 54)), el('div', 'who', txt('b', 'name', 'Raka'), txt('span', 'lv', 'LV 24 · Warrior'), bars));
  // top-right: floor, coins
  const hudTR = el('div', 'hud tr', txt('b', 'floor', 'Lantai 3'), txt('span', 'where', 'Gua Kristal'), el('div', 'coins', el('i', 'coin'), txt('span', null, '1.284')));
  // bottom: potions, skills, ultimate
  const pots = el('div', 'pots');
  for (const [k, id, n] of [['Z', 'pot_red', 4], ['X', 'pot_big', 1], ['C', 'pot_shield', 2], ['V', 'pot_wind', 0]]) {
    const slot = el('div', 'pot' + (n ? '' : ' empty'), iconCanvas(id, 26), txt('span', 'k', k), txt('span', 'n', String(n)));
    pots.append(slot);
  }
  const skills = el('div', 'skills');
  for (const [k, id, cd] of [['1', 'spin', 0], ['2', 'shout', 0.62], ['3', 'pow', 0], ['4', 'pierce', 0.25]]) {
    const sk = el('div', 'sk' + (cd ? ' cd' : ''), el('div', 'face', iconCanvas(id, 26)), txt('span', 'k', k));
    if (cd) { sk.style.setProperty('--cd', cd); sk.querySelector('.face').append(txt('span', 'cdn', (cd * 8).toFixed(1))); }
    skills.append(sk);
  }
  const ult = el('div', 'ult', el('div', 'face', iconCanvas('spin', 34)), txt('span', 'k', '5'));
  ult.style.setProperty('--ch', 0.8);
  skills.append(ult);
  const buffs = el('div', 'buffs', el('span', 'buff', iconCanvas('hst', 16), txt('i', null, '6s')), el('span', 'buff', iconCanvas('arm', 16), txt('i', null, '3s')));
  s.append(hudTL, hudTR, el('div', 'hud bl', buffs, pots), el('div', 'hud br', skills));
  return s;
}

// ——— 2. shop / bag ———
function shop() {
  const s = el('div', 'scr room');
  const tabs = el('div', 'tabs', txt('button', 'tab on', 'Beli'), txt('button', 'tab', 'Jual'), txt('button', 'tab', 'Tempa'));
  const grid = el('div', 'grid');
  const items = [item('weapon', 6, 5), item('helm', 5, 4), item('armor', 4, 3), item('boots', 3, 2), item('amulet', 4, 4), item('ring', 2, 1),
    item('weapon', 3, 3), item('armor', 2, 1), item('helm', 1, 0), item('boots', 5, 4), item('ring', 5, 5), item('amulet', 1, 2), null, null, null];
  items.forEach((it, i) => {
    const t = el('button', 'gtile' + (it ? '' : ' empty') + (i === 0 ? ' sel' : ''));
    if (it) { t.style.setProperty('--c', RARITIES[it.rarity].color); t.append(gearCanvas(it, 34), txt('span', 'ilv', String(it.itemLevel))); }
    grid.append(t);
  });
  const sel = items[0];
  const detail = el('div', 'detail',
    el('div', 'dhead', el('div', 'dic', gearCanvas(sel, 44)), el('div', null, txt('b', 'dname', 'Pedang Fajar Merah'), txt('span', 'dsub', 'Mitos · Senjata · LV 48'))),
    el('div', 'dlines', txt('span', 'base', 'ATK +86'), txt('span', 'bonus', '+12% Kritis'), txt('span', 'bonus', '+9% Kecepatan serang'), txt('span', 'bonus', '+140 HP maks'), txt('span', 'fx', 'Unik: tebasan ke-3 memanggil api')),
    el('div', 'cmp', txt('span', 'up', '▲ ATK +31'), txt('span', 'down', '▼ HP −20')),
    el('div', 'acts', el('button', 'btn primary', txt('span', null, 'Beli'), txt('i', 'price', '2.400')), txt('button', 'btn ghost', 'Tutup')));
  detail.style.setProperty('--c', RARITIES[sel.rarity].color);
  const panel = el('div', 'panel shop', el('div', 'phead', txt('b', 'ptitle', 'Pandai Brom'), txt('span', 'gold', 'Koin 3.120')), tabs, el('div', 'shopbody', grid, detail));
  s.append(panel);
  return s;
}

// ——— 3. NPC dialogue ———
function dialog() {
  const s = el('div', 'scr town');
  s.append(el('div', 'scene-figure npcfig', portrait(null, { ...ODO.look, outfit: ODO.outfit, npc: ODO }, 120)));
  const opts = el('div', 'opts');
  for (const [k, o] of [['1', 'Ceritakan tentang Raja Maw.'], ['2', 'Ada tugas untukku?'], ['3', 'Sampai jumpa, Kek.']]) opts.append(el('button', 'opt', txt('i', 'ok', k), txt('span', null, o)));
  const box = el('div', 'dialog',
    el('div', 'dport', portrait(null, { ...ODO.look, outfit: ODO.outfit, npc: ODO }, 84)),
    el('div', 'dbody', el('div', 'dname', txt('b', null, ODO.name), txt('span', 'dtitle', ODO.title)), txt('p', 'dtext', '“Dulu Ruang Bawah Tanah itu gudang anggur. Sampai Raja Maw bangun dari tidurnya. Bawa ramuan perisai, Nak — taringnya tidak mengenal ampun.”'), opts));
  s.append(box);
  return s;
}

// ——— 4. character panel ———
function character() {
  const s = el('div', 'scr room tall');
  const slots = el('div', 'slots');
  for (const it of [item('helm', 5, 4), item('weapon', 6, 5), item('armor', 6, 5), item('amulet', 4, 3), item('boots', 5, 4), item('ring', 3, 2)]) {
    const t = el('button', 'gtile'); t.style.setProperty('--c', RARITIES[it.rarity].color); t.append(gearCanvas(it, 30)); slots.append(t);
  }
  const stats = el('div', 'stats');
  for (const [k, v, up] of [['ATK', '214', 1], ['DEF', '58', 0], ['HP maks', '2.480', 1], ['Kritis', '24%', 0], ['Kec. serang', '1,32', 0], ['Gerak', '118', 0]]) {
    stats.append(el('div', 'stat', txt('span', null, k), txt('b', up ? 'up' : null, v)));
  }
  const attrs = el('div', 'attrs', txt('span', 'pts', '3 poin'), ...['STR', 'VIT', 'AGI', 'INT'].map((a, i) => el('div', 'attr', txt('span', null, a), txt('b', null, String([42, 30, 18, 6][i])), txt('button', 'plus', '+'))));
  const left = el('div', 'cleft', el('div', 'stage', portrait('warrior', HERO_LOOK, 128)), txt('b', 'cname', 'Raka'), txt('span', 'csub', 'Warrior · LV 24'), el('div', 'xpbar', el('i')), slots);
  left.querySelector('.xpbar i').style.width = '42%';
  const tabs = el('div', 'tabs', txt('button', 'tab on', 'Stat'), txt('button', 'tab', 'Skill'), txt('button', 'tab', 'Bakat'), txt('button', 'tab', 'Koleksi'));
  s.append(el('div', 'panel charp', el('div', 'phead', txt('b', 'ptitle', 'Karakter'), tabs), el('div', 'cbody', left, el('div', 'cright', stats, attrs))));
  return s;
}

const SECTIONS = [['HUD dungeon', hud], ['Toko / tas', shop], ['Dialog NPC', dialog], ['Panel karakter', character]];
for (const [title, build] of SECTIONS) {
  const sec = el('section', 'cmp-sec', txt('h2', null, title));
  const pair = el('div', 'pair');
  for (const [theme, label] of [['now', 'Sekarang'], ['new', 'Usulan']]) pair.append(el('div', `side ${theme}`, txt('div', 'tag', label), build()));
  sec.append(pair);
  $('sections').append(sec);
}
