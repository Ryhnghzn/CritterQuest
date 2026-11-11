// Cheat panel for testing without grinding. Only on in `npm run dev` or with
// ?cheat in the address; toggled with ` (backtick) or the CHEAT button.
// The panel only builds buttons — every action lives in main.js (`actions`).
import { SCENES } from '../data/scenes.js';
import { ENEMIES } from '../data/enemies.js';
import { el, button } from './screens.js';
import { RARITIES, SLOT_IDS, SLOTS } from '../data/items.js';
import { tr, t } from '../i18n.js';

export const CHEAT_ON = import.meta.env.DEV || new URLSearchParams(location.search).has('cheat');

let rarity = 3, slot = 'acak';

// ctx: { scene: 'town' | 'run' | 'menu', god: bool }; actions: see main.js cheat section
export function renderCheat(box, ctx, actions, redraw) {
  box.replaceChildren();
  const head = el('div', 'chhead');
  head.append(el('b', null, tr('Panel Cheat')), button('×', 'chx', actions.close));
  box.append(head);
  const section = (title, ...rows) => {
    const s = el('div', 'chsec');
    s.append(el('span', 'chtitle', tr(title)), ...rows);
    box.append(s);
  };
  const row = (...btns) => { const r = el('div', 'chrow'); r.append(...btns); return r; };
  const b = (label, fn) => button(tr(label), 'chb', fn);

  if (ctx.scene === 'menu') { box.append(el('div', 'note', tr('Muat karakter dulu.'))); return; }

  // every cutscene, to watch without playing the story through (spec §44)
  const ids = Object.keys(SCENES);
  section('Cutscene', ...Array.from({ length: Math.ceil(ids.length / 4) }, (_, i) => row(...ids.slice(i * 4, i * 4 + 4).map((id) => button(id, 'chb', () => actions.scene(id))))),
    row(b('Momen kawal', () => actions.scene('moment:escort')), b('Momen selamatkan', () => actions.scene('moment:rescue'))));

  const fx = (kind) => () => actions.fxTest(kind);
  section('Efek',
    ...(ctx.scene === 'run' ? [
      row(b('Ledakan uji', fx('boom')), b('Angka uji', fx('numbers')), b('Hit-stop', fx('stop'))),
      row(b('Getar ringan', fx('light')), b('Getar sedang', fx('medium')), b('Getar berat', fx('heavy')))] : []),
    row(b(ctx.fps ? 'FPS: sembunyikan' : 'FPS: tampilkan', actions.fps)));

  if (ctx.scene === 'town') {
    section('Karakter',
      row(b('+1.000 koin', () => actions.gold(1000)), b('+10.000 koin', () => actions.gold(10000))),
      row(b('+1 level', () => actions.level(1)), b('+5 level', () => actions.level(5)), b('Level 50', () => actions.level(99))),
      row(b('Ramuan penuh', actions.potions), b('HP penuh', actions.heal), b('Reset poin', actions.resetPoints)),
      row(b('+Material', actions.mats), b('+Permata', actions.gems), b('+10 Lencana', actions.marks), b('Selesaikan tugas', actions.bounties)),
      row(b('Buka semua dungeon', actions.unlockFloors), b('+3 jam', () => actions.hours(3)), b('+12 jam', () => actions.hours(12))),
      row(b('Kunjungi semua kota', actions.allTowns)));
  }

  const rar = el('div', 'chrow');
  RARITIES.forEach((r, i) => {
    const x = button(r.name, `chb rar${i === rarity ? ' on' : ''}`, () => { rarity = i; redraw(); });
    x.style.setProperty('--c', r.color);
    rar.append(x);
  });
  const slots = el('div', 'chrow');
  for (const s of ['acak', ...SLOT_IDS]) {
    slots.append(button(s === 'acak' ? tr('Acak') : SLOTS[s].name, `chb${s === slot ? ' on' : ''}`, () => { slot = s; redraw(); }));
  }
  if (ctx.scene === 'town') {
    section('Gear (masuk tas)', rar, slots,
      row(b('Beri 1', () => actions.gear(rarity, slot, 1)), b('Beri 10', () => actions.gear(rarity, slot, 10))),
      row(b('Semua item unik kelasku', actions.uniques), b('Kosongkan tas', actions.clearBag)),
      row(b('+Kuda', () => actions.mount('horse')), b('+Semua mount', () => actions.mount('all'))));
  } else {
    if (ctx.field) {
      section('Wilayah',
        row(b(ctx.god ? 'Kebal: NYALA' : 'Kebal: mati', actions.god), b('Bunuh semua musuh', actions.killAll), b('Elite 2 sifat', actions.elite)),
        row(...['marshfrog', 'bushling', 'mistwisp', 'mirrorguard'].map((id) => button(ENEMIES[id].name, 'chb', () => actions.foe(id)))),
        row(b('Buka seluruh peta', actions.revealMap), b('+100 EXP', () => actions.exp(100))),
        row(b('Ke ujung timur', () => actions.warp(0.97)), b('Ke tengah', () => actions.warp(0.5)), b('Ke gerbang', actions.warpGate), b('Ke harta', actions.warpTreasure)));
    } else {
      section('Dungeon',
        row(b(ctx.god ? 'Kebal: NYALA' : 'Kebal: mati', actions.god), b('Bunuh semua musuh', actions.killAll), b('Elite 2 sifat', actions.elite)),
        row(...['marshfrog', 'bushling', 'mistwisp', 'mirrorguard'].map((id) => button(ENEMIES[id].name, 'chb', () => actions.foe(id)))),
        row(b('Bersihkan lantai', actions.clearFloor), b('+100 EXP', () => actions.exp(100))),
        row(...[1, 2, 3, 4, 5].map((f) => button(t('Lantai {n}', { n: f }), 'chb', () => actions.floor(f)))));
    }
    section('Mount', row(b('+Kuda', () => actions.mount('horse')), b('+Semua mount', () => actions.mount('all'))));
    section('Jatuhkan gear di dekatku', rar,
      row(b('Jatuhkan 1', () => actions.drop(rarity, 1)), b('Jatuhkan 5', () => actions.drop(rarity, 5))));
  }
}
