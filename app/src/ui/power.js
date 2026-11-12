// Power on screen (spec §47.6): a sword chip with the number, a +/− change, and a place's recommended
// Power coloured by how you stand against it.
import './power.css';
import { el, svgIcon } from './screens.js';
import { getLang, tr, t } from '../i18n.js';
import { POWER_LOOK } from '../data/power.js';

export const fmtPower = (n) => Math.round(n).toLocaleString(getLang() === 'id' ? 'id-ID' : 'en-US');

// the chip: ⚔ 12.450 (title "Power")
export function powerChip(n, cls = '') {
  const c = el('span', `powerchip ${cls}`.trim());
  c.title = tr('Power: kekuatan karaktermu dari level, stat, gear, dan skill');
  c.append(svgIcon('sword'), el('b', null, fmtPower(n)));
  return c;
}

// +850 / −300
export function powerDeltaChip(d) {
  const up = d >= 0;
  return el('span', `powerdelta ${up ? 'up' : 'down'}`, `${up ? '+' : '−'}${fmtPower(Math.abs(d))}`);
}

// "Disarankan 4.300–6.700 · kamu 12.450", coloured (power: meta/destination.js info.power)
export function powerRecLine(power) {
  const line = el('div', `powerrec ${power.tone}`);
  line.style.setProperty('--tone', POWER_LOOK.colors[power.tone]);
  const range = power.lo === power.hi ? fmtPower(power.hi) : `${fmtPower(power.lo)}–${fmtPower(power.hi)}`;
  const word = { safe: tr('aman'), even: tr('setara'), danger: tr('berbahaya') }[power.tone];
  line.append(svgIcon('sword'), el('span', null, t('Power disarankan {r} · kamu {p}', { r: range, p: fmtPower(power.mine) })), el('b', null, word));
  return line;
}
