// Ramps for the prototype-style pictures: spell frames and illustrated props (app/pixel). A ramp has five steps:
// [shadow, dark, base, light, highlight]. Pure data.
export const INK = '#0c0a0f';

export const RAMPS = {
  stone:   ['#141519', '#23252b', '#373941', '#52545b', '#76767a'],
  grass:   ['#121a15', '#1c281d', '#2b3a27', '#415234', '#5e6c45'],
  leaf:    ['#0e150f', '#182619', '#263a22', '#3a542d', '#56713b'],
  leafOld: ['#18130f', '#2a2016', '#43321f', '#61482a', '#806339'],
  wood:    ['#180f0b', '#2b1c13', '#45301f', '#634630', '#836140'],
  flowerV: ['#1a1520', '#2f2638', '#4c3d5a', '#6f5c80', '#9584a6'],
  flowerY: ['#221b0e', '#3e3217', '#655025', '#8d7437', '#b49a55'],
  snow:    ['#3a4658', '#6a7a90', '#a4b4c8', '#d4e0ee', '#f4f8ff'],
  palm:    ['#1e140c', '#3a2818', '#5c4228', '#7e6038', '#a07e4c'],
  cactus:  ['#0e1a12', '#1a3020', '#2a4a30', '#3e6a40', '#5a8a52'],
  ice:     ['#0e1a2a', '#24425e', '#4a7aa0', '#8ec0e0', '#e0f4ff'],
  iceStone:['#1a2230', '#2e3a4c', '#4a5a70', '#6e8098', '#98aac0'],
  obsidian:['#08060c', '#141020', '#221a30', '#342848', '#4a3a66'],
  charred: ['#181210', '#2c201b', '#42322a', '#5e4838', '#7c624c'],
  torch:   ['#4a1e0c', '#8a3c16', '#d0762a', '#f0b456', '#fff0b8'],
  ember:   ['#3a0e08', '#7a1e0e', '#c0401a', '#e8742a', '#ffb060'],
  smear:   ['#3a3632', '#6a645c', '#a29a8e', '#cec6b6', '#efe8da'],
  arcane:  ['#1c1030', '#3a1d5e', '#6a37a0', '#a06ad8', '#e6d2ff'],
  frost:   ['#0e1a2a', '#1e3e5e', '#3f7ba8', '#86c4e2', '#e2f7ff'],
  bolt:    ['#1a2040', '#3a5aa0', '#7aa8e8', '#c8e2ff', '#ffffff'],
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
