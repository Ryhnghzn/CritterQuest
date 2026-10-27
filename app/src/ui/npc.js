// NPC dialogs in town (spec §13.2, §15): Inn, potion shop (5 potions + belt),
// gear shop (closed until langkah 5D), the dungeon gate (pick a floor) and
// townsfolk who just talk.
import { el, button, stage } from './screens.js';
import { portrait } from '../art/doll.js';
import { iconCanvas } from '../art/sprites.js';
import { POTIONS, POTION_IDS, POTION_MAX } from '../data/potions.js';
import { innPrice } from '../meta/shop.js';

const LINES = {
  inn: 'Selamat malam, petualang. Kasur hangat dan sup panas menunggumu.',
  potion: 'Hehehe… ramuan segar dari kuali. Mau yang mana?',
  gear: 'Tungkuku belum menyala. Kembalilah nanti — barang bagus sedang kutempa.',
  gate: 'Di balik gerbang ini ada Ruang Bawah Tanah Bayangan. Kau sudah siap?',
};
const TITLES = { inn: 'Penginapan', potion: 'Toko Ramuan', gear: 'Pandai Besi', gate: 'Gerbang Dungeon', talk: 'Warga' };

// ctx: { char, hp, maxHp, message: { text, ok } | null, line (talk: what they say now),
//        onInn, onBuyPotion(id), onBelt(slot), onEnter(floor), onClose }
export function renderNpc(box, npc, ctx) {
  const { char, hp, maxHp } = ctx;
  box.replaceChildren();
  const panel = el('div', 'panel npcpanel');

  const head = el('div', 'npchead');
  const info = el('div', 'info');
  const role = el('span', 'pill', npc.title || TITLES[npc.role]);
  role.style.setProperty('--c', npc.outfit[0]);
  info.append(el('div', 'nm', npc.name), role);
  head.append(stage(portrait(null, { ...npc.look, outfit: npc.outfit }, 92), npc.outfit[0]), info);
  panel.append(head, el('div', 'npcline', `“${npc.role === 'talk' ? ctx.line : LINES[npc.role]}”`));

  if (npc.role !== 'talk') {
    const wallet = el('div', 'records');
    for (const text of [`${char.gold} koin`, `HP ${Math.ceil(hp)} / ${Math.round(maxHp)}`]) wallet.append(el('span', 'hchip', text));
    panel.append(wallet);
  }

  const actions = el('div', 'row');
  if (npc.role === 'inn') {
    const b = button(`Tidur — ${innPrice(char)} koin`, 'btn', ctx.onInn);
    b.id = 'npc-inn';
    actions.append(b);
  } else if (npc.role === 'potion') {
    panel.append(potionList(char, ctx.onBuyPotion), beltEditor(char, ctx.onBelt));
  } else if (npc.role === 'gate') {
    const deepest = Math.max(1, char.records.bestFloor);
    const b = button(deepest > 1 ? `Lanjut ke Lantai ${deepest}` : 'Masuk Dungeon', 'btn big', () => ctx.onEnter(deepest));
    b.id = 'npc-enter';
    actions.append(b);
    if (deepest > 1) {
      const floors = el('div', 'floors');
      floors.append(el('span', 'note', 'atau mulai dari:'));
      for (let f = 1; f < deepest; f++) {
        const fb = button(`Lantai ${f}`, 'btn ghost small', () => ctx.onEnter(f));
        fb.dataset.floor = f;
        floors.append(fb);
      }
      panel.append(actions, floors);
    }
  }
  if (actions.childElementCount && !actions.parentNode) panel.append(actions);

  const msg = el('div', 'npcmsg');
  if (ctx.message) { msg.textContent = ctx.message.text; msg.classList.toggle('ok', ctx.message.ok); }
  else if (npc.role === 'gate' && hp < maxHp * 0.5) msg.textContent = 'HP-mu masih rendah. Istirahat dulu di Penginapan?';

  const close = button('Tutup', 'btn ghost', ctx.onClose);
  close.id = 'npc-close';
  panel.append(msg, close);
  box.append(panel);
}

function potionList(char, onBuy) {
  const list = el('div', 'shoplist');
  for (const id of POTION_IDS) {
    const p = POTIONS[id];
    const row = el('div', 'shoprow');
    const ic = el('span', 'sic');
    ic.append(iconCanvas(`pot_${id}`, 30));
    const txt = el('div', 'stx');
    txt.append(el('b', null, p.name), el('span', null, p.desc));
    const have = el('span', 'have', `${char.potions[id]}/${POTION_MAX}`);
    const buy = button(`${p.price}`, 'btn small buy', () => onBuy(id));
    buy.dataset.potion = id;
    buy.prepend(el('span', 'coin'));
    buy.disabled = char.potions[id] >= POTION_MAX || char.gold < p.price;
    row.append(ic, txt, have, buy);
    list.append(row);
  }
  return list;
}

// Four belt slots; tapping one puts the next potion type in it.
function beltEditor(char, onBelt) {
  const wrap = el('div', 'beltedit');
  wrap.append(el('span', 'note', 'Sabuk (tombol 1–4) — ketuk untuk ganti:'));
  const row = el('div', 'row');
  char.belt.forEach((id, i) => {
    const b = button('', 'beltslot', () => onBelt(i));
    b.dataset.slot = i;
    if (id) b.append(iconCanvas(`pot_${id}`, 26));
    b.append(el('kbd', null, String(i + 1)));
    b.title = id ? POTIONS[id].name : 'Kosong';
    row.append(b);
  });
  wrap.append(row);
  return wrap;
}
