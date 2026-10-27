// NPC dialogs in town (spec §13.2): Inn, potion shop, gear shop (closed until
// langkah 5) and the dungeon gate.
import { el, button, stage } from './screens.js';
import { portrait } from '../art/doll.js';
import { POTION } from '../data/dungeon.js';
import { innPrice } from '../meta/shop.js';

const LINES = {
  inn: 'Selamat malam, petualang. Kasur hangat dan sup panas menunggumu.',
  potion: 'Hehehe… ramuan merah, segar dari kuali. Mau berapa botol?',
  gear: 'Tungkuku belum menyala. Kembalilah nanti — barang bagus sedang kutempa.',
  gate: 'Di balik gerbang ini ada Ruang Bawah Tanah Bayangan. Kau sudah siap?',
};
const TITLES = { inn: 'Penginapan', potion: 'Toko Ramuan', gear: 'Toko Gear', gate: 'Gerbang Dungeon' };

// ctx: { char, hp, maxHp, message: { text, ok } | null, onInn, onBuyPotion, onEnter, onClose }
export function renderNpc(box, npc, ctx) {
  const { char, hp, maxHp } = ctx;
  box.replaceChildren();
  const panel = el('div', 'panel npcpanel');

  const head = el('div', 'npchead');
  const info = el('div', 'info');
  const role = el('span', 'pill', TITLES[npc.role]);
  role.style.setProperty('--c', npc.outfit[0]);
  info.append(el('div', 'nm', npc.name), role);
  head.append(stage(portrait(null, { ...npc.look, outfit: npc.outfit }, 92), npc.outfit[0]), info);

  const wallet = el('div', 'records');
  for (const text of [`${char.gold} koin`, `HP ${Math.ceil(hp)} / ${Math.round(maxHp)}`, `Ramuan ${char.potions} / ${POTION.max}`]) {
    wallet.append(el('span', 'hchip', text));
  }

  const actions = el('div', 'row');
  if (npc.role === 'inn') {
    const b = button(`Tidur — ${innPrice(char)} koin`, 'btn', ctx.onInn);
    b.id = 'npc-inn';
    actions.append(b);
  } else if (npc.role === 'potion') {
    const b = button(`Beli Ramuan — ${POTION.price} koin`, 'btn', ctx.onBuyPotion);
    b.id = 'npc-buy';
    actions.append(b);
  } else if (npc.role === 'gate') {
    const b = button('Masuk Dungeon', 'btn big', ctx.onEnter);
    b.id = 'npc-enter';
    actions.append(b);
  }

  const msg = el('div', 'npcmsg');
  if (ctx.message) { msg.textContent = ctx.message.text; msg.classList.toggle('ok', ctx.message.ok); }
  else if (npc.role === 'gate' && hp < maxHp * 0.5) msg.textContent = 'HP-mu masih rendah. Istirahat dulu di Penginapan?';

  const close = button('Tutup', 'btn ghost', ctx.onClose);
  close.id = 'npc-close';
  panel.append(head, el('div', 'npcline', `“${LINES[npc.role]}”`), wallet, actions, msg, close);
  box.append(panel);
}
