// Ramps for the spell frames (from the look prototype app/pixel). A ramp has five steps:
// [shadow, dark, base, light, highlight]. Pure data.
export const INK = '#0c0a0f';

export const RAMPS = {
  stone:   ['#141519', '#23252b', '#373941', '#52545b', '#76767a'],
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
