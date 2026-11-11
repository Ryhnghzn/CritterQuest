// PixelPalette — every colour of the prototype lives here. A ramp has five steps:
// [shadow, dark, base, light, highlight]. Muted, slightly cool shadows, warm lights.
export const INK = '#0c0a0f';

export const RAMPS = {
  grass:   ['#121a15', '#1c281d', '#2b3a27', '#415234', '#5e6c45'],
  leaf:    ['#0e150f', '#182619', '#263a22', '#3a542d', '#56713b'],
  leafOld: ['#18130f', '#2a2016', '#43321f', '#61482a', '#806339'],
  dirt:    ['#19130f', '#2a2019', '#413126', '#5b4633', '#786046'],
  stone:   ['#141519', '#23252b', '#373941', '#52545b', '#76767a'],
  wood:    ['#180f0b', '#2b1c13', '#45301f', '#634630', '#836140'],
  plaster: ['#1c1918', '#33302c', '#504943', '#71685b', '#918470'],
  roof:    ['#171012', '#2a1a1b', '#452825', '#633a30', '#825443'],
  metal:   ['#15171c', '#292e36', '#474f59', '#737d87', '#b2b9bd'],
  gold:    ['#2e200d', '#563b17', '#8a632a', '#b8913f', '#e0c27a'],
  skin:    ['#2a1915', '#55372a', '#865a43', '#ad7e5d', '#cfa27f'],
  hair:    ['#0f0b0b', '#1f1614', '#36241e', '#50362a', '#6c4a37'],
  red:     ['#1c0d0f', '#3a1517', '#5e211e', '#833428', '#a4523d'],
  blue:    ['#0e121c', '#192134', '#283452', '#3f5175', '#65789b'],
  leather: ['#170f0c', '#2c1e16', '#463122', '#634631', '#826346'],
  fur:     ['#100e13', '#1d1922', '#2f2836', '#463c50', '#62566e'],
  bone:    ['#2a2622', '#4a443c', '#706657', '#9a8d78', '#c4b69b'],
  flowerV: ['#1a1520', '#2f2638', '#4c3d5a', '#6f5c80', '#9584a6'],
  flowerY: ['#221b0e', '#3e3217', '#655025', '#8d7437', '#b49a55'],
  torch:   ['#4a1e0c', '#8a3c16', '#d0762a', '#f0b456', '#fff0b8'],
  ember:   ['#3a0e08', '#7a1e0e', '#c0401a', '#e8742a', '#ffb060'],
  smear:   ['#3a3632', '#6a645c', '#a29a8e', '#cec6b6', '#efe8da'],
  arcane:  ['#1c1030', '#3a1d5e', '#6a37a0', '#a06ad8', '#e6d2ff'],
  frost:   ['#0e1a2a', '#1e3e5e', '#3f7ba8', '#86c4e2', '#e2f7ff'],
  bolt:    ['#1a2040', '#3a5aa0', '#7aa8e8', '#c8e2ff', '#ffffff'],
  ui:      ['#09080b', '#121015', '#1c181f', '#2a242c', '#3a3239'],
};

// colours that glow by themselves (they ignore scene lighting)
export const EMISSIVE_RAMPS = new Set(['torch', 'ember', 'arcane', 'frost', 'bolt']);

export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const pack = ([r, g, b]) => (r << 16) | (g << 8) | b;
export const INK_RGB = pack(rgb(INK));

// RAMP[name] = packed colours; ramp lookup with clamped level
export const RAMP = Object.fromEntries(Object.entries(RAMPS).map(([k, v]) => [k, v.map((h) => pack(rgb(h)))]));

// smooth colour between ramp steps (for style A, which samples the same designs finely)
export function rampAt(name, level) {
  const r = RAMPS[name], l = Math.max(0, Math.min(4, level)), i = Math.min(3, Math.floor(l)), f = l - i;
  const a = rgb(r[i]), b = rgb(r[i + 1]);
  return pack([0, 1, 2].map((j) => Math.round(a[j] + (b[j] - a[j]) * f)));
}

// all palette colours (for the optional palette-lock pass)
export const ALL = [INK, ...Object.values(RAMPS).flat()].map(rgb);
