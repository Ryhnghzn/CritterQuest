// Potions (spec §15.2): sold at Toko Ramuan, carried per type, drunk from a
// 4-slot belt (keys 1–4 / belt buttons). heal = fraction of max HP; buffs last `dur` s.
export const POTIONS = {
  red: { name: 'Ramuan Merah', desc: 'Pulih 40% HP', price: 25, heal: 0.4, color: '#e8264f', light: '#ff8aa3' },
  big: { name: 'Ramuan Besar', desc: 'Pulih 80% HP', price: 60, heal: 0.8, color: '#c2185b', light: '#ff6fae' },
  shield: { name: 'Ramuan Perisai', desc: 'Perisai 30% HP maks selama 8 detik', price: 45, shield: 0.3, dur: 8, color: '#3f7ee0', light: '#9fd0ff' },
  wind: { name: 'Ramuan Angin', desc: 'Gerak +35%, jeda dodge −50% selama 10 detik', price: 40, moveSpd: 0.35, dodgeCd: 0.5, dur: 10, color: '#22a56f', light: '#8ff5c8' },
  rage: { name: 'Ramuan Amuk', desc: 'ATK +30%, kec. serang +20% selama 10 detik', price: 50, atk: 0.3, atkSpd: 0.2, dur: 10, color: '#e0701a', light: '#ffc27a' },
};
export const POTION_IDS = Object.keys(POTIONS);
export const POTION_MAX = 5;      // carried per type
export const POTION_CD = 1;       // seconds between drinks
export const BELT_SIZE = 4;
export const DEFAULT_BELT = ['red', 'big', 'shield', 'rage'];
export const isHeal = (id) => POTIONS[id].heal > 0;
