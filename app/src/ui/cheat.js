// Cheat panel for testing without grinding. Only on in `npm run dev` or with
// ?cheat in the address; toggled with ` (backtick) or the CHEAT button.
// The panel only builds buttons — every action lives in main.js (`actions`).
import { el, button } from './screens.js';
import { RARITIES, SLOT_IDS, SLOTS } from '../data/items.js';

export const CHEAT_ON = import.meta.env.DEV || new URLSearchParams(location.search).has('cheat');

let rarity = 3, slot = 'acak';

// ctx: { scene: 'town' | 'run' | 'menu', god: bool }; actions: see main.js cheat section
export function renderCheat(box, ctx, actions, redraw) {
  box.replaceChildren();
  const head = el('div', 'chhead');
  head.append(el('b', null, 'Panel Cheat'), button('×', 'chx', actions.close));
  box.append(head);
  const section = (title, ...rows) => {
    const s = el('div', 'chsec');
    s.append(el('span', 'chtitle', title), ...rows);
    box.append(s);
  };
  const row = (...btns) => { const r = el('div', 'chrow'); r.append(...btns); return r; };
  const b = (label, fn) => button(label, 'chb', fn);

  if (ctx.scene === 'menu') { box.append(el('div', 'note', 'Muat karakter dulu.')); return; }

  if (ctx.scene === 'town') {
    section('Karakter',
      row(b('+1.000 koin', () => actions.gold(1000)), b('+10.000 koin', () => actions.gold(10000))),
      row(b('+1 level', () => actions.level(1)), b('+5 level', () => actions.level(5)), b('Level 50', () => actions.level(99))),
      row(b('Ramuan penuh', actions.potions), b('HP penuh', actions.heal), b('Reset poin', actions.resetPoints)),
      row(b('Buka semua dungeon', actions.unlockFloors), b('+3 jam', () => actions.hours(3)), b('+12 jam', () => actions.hours(12))));
  }

  const rar = el('div', 'chrow');
  RARITIES.forEach((r, i) => {
    const x = button(r.name, `chb rar${i === rarity ? ' on' : ''}`, () => { rarity = i; redraw(); });
    x.style.setProperty('--c', r.color);
    rar.append(x);
  });
  const slots = el('div', 'chrow');
  for (const s of ['acak', ...SLOT_IDS]) {
    slots.append(button(s === 'acak' ? 'Acak' : SLOTS[s].name, `chb${s === slot ? ' on' : ''}`, () => { slot = s; redraw(); }));
  }
  if (ctx.scene === 'town') {
    section('Gear (masuk tas)', rar, slots,
      row(b('Beri 1', () => actions.gear(rarity, slot, 1)), b('Beri 10', () => actions.gear(rarity, slot, 10))),
      row(b('Semua item unik kelasku', actions.uniques), b('Kosongkan tas', actions.clearBag)));
  } else {
    section('Dungeon',
      row(b(ctx.god ? 'Kebal: NYALA' : 'Kebal: mati', actions.god), b('Bunuh semua musuh', actions.killAll)),
      row(b('Bersihkan lantai', actions.clearFloor), b('+100 EXP', () => actions.exp(100))),
      row(...[1, 2, 3, 4, 5].map((f) => b(`Lantai ${f}`, () => actions.floor(f)))));
    section('Jatuhkan gear di dekatku', rar,
      row(b('Jatuhkan 1', () => actions.drop(rarity, 1)), b('Jatuhkan 5', () => actions.drop(rarity, 5))));
  }
}
