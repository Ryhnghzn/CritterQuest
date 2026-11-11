// Auras (spec §19, plan "Efek Lebay" §D): a rune circle under the feet that grows
// every 10 levels, a rarity aura from the best gear worn, a pillar of light for a
// full Legendaris+ set standing still, and one loud look per unique effect.
// Drawn around a character standing at (x, y) = feet, in world units; used in
// town, inside houses and in the field / dungeon. Counts and colours live in
// data/aurafx.js; glow comes from the cached sprites of render/fxkit.js.
//
// o (options, all optional): host — any object kept per renderer, holds the aura
// state; lite — lite effects setting (fewer particles, fewer layers); level;
// set — lowest rarity over all slots (art/auratier.js setRarity); facing (±1);
// enemies — for the execute skulls; frenzyOn; shield (0–1 left); hurt (just hit).
import { RARITIES } from '../data/items.js';
import { LITE_MUL, BODY, RING, RARITY_AURA, SET_PILLAR, UNIQUE_AURA } from '../data/aurafx.js';
import { glow, star4 } from '../render/fxkit.js';
import { ringTier, fullSet, AuraState } from './auratier.js';

const TAU = Math.PI * 2;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
const RRGB = RARITIES.map((r) => hexRgb(r.color));
const RCOL = RARITIES.map((r) => r.color);
const GOLD = '255,210,110';

const states = new WeakMap();
const NO_HOST = {};
function stateOf(host) {
  let s = states.get(host);
  if (!s) { s = new AuraState(); states.set(host, s); }
  return s;
}
const cnt = (n, lite) => (lite ? Math.max(1, Math.ceil(n * LITE_MUL)) : n);
const fract = (v) => v - Math.floor(v);
const rgbHex = (rgb) => `#${rgb.split(',').map((v) => (+v).toString(16).padStart(2, '0')).join('')}`;

// little rune glyphs: segments in a 2×3 box
const GLYPHS = [
  [[0, 0, 0, 3], [0, 1, 2, 0], [0, 1.5, 2, 3]],
  [[1, 0, 1, 3], [0, 0.8, 2, 1.8], [2, 0.8, 0, 1.8]],
  [[0, 3, 1, 0], [1, 0, 2, 3], [0.5, 1.6, 1.5, 1.6]],
  [[0, 0, 0, 3], [0, 0, 2, 1], [2, 1, 0, 2]],
  [[0, 0, 2, 3], [2, 0, 0, 3], [1, 0, 1, 3]],
  [[0, 3, 0, 0], [0, 0, 2, 1.5], [2, 1.5, 0, 3]],
];
function rune(g, x, y, s, i, color, alpha) {
  const gl = GLYPHS[((i % GLYPHS.length) + GLYPHS.length) % GLYPHS.length];
  g.beginPath();
  for (const [a, b, c, d] of gl) { g.moveTo(x + (a - 1) * s, y + (b - 1.5) * s); g.lineTo(x + (c - 1) * s, y + (d - 1.5) * s); }
  g.globalAlpha = alpha; g.lineWidth = Math.max(0.6, s * 0.45); g.lineCap = 'round'; g.strokeStyle = color; g.stroke();
}

// flame tongue pointing up, base at (x, y)
function tongue(g, x, y, w, h, color) {
  g.beginPath();
  g.moveTo(x - w, y);
  g.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x, y - h);
  g.quadraticCurveTo(x + w * 0.9, y - h * 0.55, x + w, y);
  g.quadraticCurveTo(x, y + w * 0.6, x - w, y);
  g.fillStyle = color; g.fill();
}

// level ring (ground, behind the body)
// tier 1 ring · 2 runes turning · 3 double ring · 4 glow + pillar base · 5 big golden circle + rays
export function levelRing(g, x, y, level, t, o = {}) {
  const tier = ringTier(level);
  if (tier === 0) return;
  const rgb = RING.rgb[tier], gold = tier >= 5, lite = !!o.lite;
  const r = RING.r + tier * RING.rStep + (gold ? 6 : 0);
  g.save();
  g.translate(x, y);
  g.scale(1, 0.42);
  if (tier >= 4) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 + 0.1 * Math.sin(t * 2);
    glow(g, 0, 0, r + 14, rgbHex(rgb)); g.restore();
  }
  g.lineWidth = gold ? 1.8 : 1.2; g.strokeStyle = `rgba(${rgb},.8)`;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  if (tier >= 2) { // rune glyphs turning slowly on the ring
    g.save(); g.rotate(t * RING.spin);
    const n = cnt(RING.runes, lite);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      g.save(); g.translate(Math.cos(a) * (r - 3.2), Math.sin(a) * (r - 3.2)); g.rotate(a + Math.PI / 2);
      rune(g, 0, 0, 0.9, i, `rgba(${rgb},.9)`, 1);
      g.restore();
    }
    g.restore();
  }
  if (tier >= 3) { // second ring turning the other way
    g.save(); g.rotate(-t * 0.6); g.setLineDash([4, 3]); g.globalAlpha = 0.85;
    g.beginPath(); g.arc(0, 0, r + 4.5, 0, TAU); g.lineWidth = 1; g.stroke(); g.restore();
  }
  if (gold) { // turning golden rays + an outer circle
    g.save(); g.rotate(t * 0.2); g.globalCompositeOperation = 'lighter';
    const n = cnt(RING.rays, lite);
    for (let i = 0; i < n; i++) {
      g.rotate(TAU / n);
      g.beginPath(); g.moveTo(r + 7, -1.3); g.lineTo(r + 17 + 3 * Math.sin(t * 3 + i), 0); g.lineTo(r + 7, 1.3); g.closePath();
      g.fillStyle = `rgba(${GOLD},.75)`; g.fill();
    }
    g.restore();
    g.beginPath(); g.arc(0, 0, r + 8, 0, TAU); g.lineWidth = 0.8; g.strokeStyle = `rgba(${GOLD},.6)`; g.stroke();
  }
  g.restore();
}

// level ring, emissive part (front): rising motes, pillar, floating runes, crown
function levelFront(g, x, y, level, t, lite) {
  const tier = ringTier(level);
  if (tier < 3) return;
  const rgb = RING.rgb[tier], col = rgbHex(rgb), r = RING.r + tier * RING.rStep;
  const n = cnt(RING.motes, lite);
  for (let i = 0; i < n; i++) { // motes rising from the ring
    const ph = fract(t * 0.35 + i / n), a = i * 2.39 + t * 0.3;
    g.globalAlpha = (1 - ph) * 0.9;
    glow(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.42 - ph * RING.moteRise, 2.2 * (1 - ph * 0.5), col);
  }
  if (tier >= 4) { // thin pillar of light + runes floating around the body
    const h = RING.pillarH * (tier >= 5 ? 1.3 : 1);
    const gr = g.createLinearGradient(0, y - h, 0, y);
    gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(1, `rgba(${rgb},${0.16 + 0.05 * Math.sin(t * 3)})`);
    g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(x - r * 0.7, y - h, r * 1.4, h);
    if (!lite) for (let i = 0; i < RING.floaters; i++) {
      const a = t * 0.9 + (i / RING.floaters) * TAU;
      const fx = x + Math.cos(a) * (r + 4), fy = y - BODY.chest + Math.sin(a) * 5 + Math.sin(t * 2 + i) * 3;
      rune(g, fx, fy, 1.5, i + 2, `rgba(${rgb},1)`, 0.55 + 0.35 * Math.sin(a));
    }
  }
  if (tier >= 5) { // crown of light over the head
    const cy = y - BODY.top - 6 + Math.sin(t * 2) * 1.2;
    g.globalAlpha = 0.9;
    for (let i = 0; i < RING.crownPts; i++) {
      const a = (i / (RING.crownPts - 1) - 0.5) * 1.6;
      star4(g, x + Math.sin(a) * 7, cy - Math.cos(a) * 2.5 - (i % 2 ? 0 : 1.5), 2.3 + Math.sin(t * 4 + i) * 0.5, t * 0.5, rgbHex(GOLD));
    }
    g.beginPath(); g.ellipse(x, cy + 1.5, 7.5, 2.2, 0, 0, TAU);
    g.lineWidth = 0.9; g.strokeStyle = `rgba(${GOLD},.8)`; g.stroke();
  }
}

// behind the body
// Floor glows, mists, wings, thorn crown, full-set pillar, regen flowers.
// fx = { effect: value } from meta/gear.js gearEffects; best = best rarity worn (5th arg kept optional).
export function auraBack(g, x, y, fx, t, o = {}) {
  fx = fx || {};
  const lite = !!o.lite, best = o.best ?? -1;
  const st = stateOf(o.host || NO_HOST).update(x, y, t, !!fx.regen);
  g.save();

  // regen: flowers bloom where you walked
  if (fx.regen) for (const f of st.flowers) flower(g, f, t);

  // rarity: Epik+ mist at the feet; Mitos light shadow on the floor
  if (best >= 3) {
    const n = cnt(RARITY_AURA.mist, lite), rgb = RRGB[Math.min(best, 3)];
    for (let i = 0; i < n; i++) {
      const a = t * 0.7 + (i / n) * TAU;
      g.beginPath(); g.ellipse(x + Math.cos(a) * 12, y + Math.sin(a) * 4, 9, 3.4, 0, 0, TAU);
      g.fillStyle = `rgba(${rgb},${0.1 + 0.05 * Math.sin(t * 2 + i)})`; g.fill();
    }
  }
  if (best >= 5 && !lite) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.scale(1, 0.4);
    g.globalAlpha = 0.5; glow(g, 0, 0, 34, RCOL[5]); g.restore();
  }

  // full set: one big pillar of light after standing still
  const pk = st.pillar(t, fullSet(o.set ?? -1));
  if (pk > 0) setPillar(g, x, y, pk, t, lite, o.set);

  // Mitos: red-gold wings of light
  if (best >= 5 && !o.anime) lightWings(g, x, y, t, lite); // anime heroes draw their own (art/anime/wings.js)
  if (fx.phoenix && !o.anime) phoenixWings(g, x, y, t, lite);
  if (fx.lifesteal) { // red mist turning around the body
    const L = UNIQUE_AURA.lifesteal, n = cnt(L.mist, lite);
    for (let i = 0; i < n; i++) {
      const a = t * 1.6 + (i / n) * TAU;
      g.beginPath(); g.ellipse(x + Math.cos(a) * 13, y - 16 + Math.sin(a) * 7, 8, 4.5, a, 0, TAU);
      g.fillStyle = `rgba(${L.rgb},${0.2 + 0.08 * Math.sin(t * 3 + i)})`; g.fill();
    }
  }
  if (fx.thorns) thornCrown(g, x, y, t, lite, !!o.hurt);
  if (fx.frenzy) { // red blaze from the feet (behind); smoulders until frenzy kicks in
    const F = UNIQUE_AURA.frenzy, n = cnt(F.flames, lite), on = o.frenzyOn ?? true;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const ph = fract(t * (on ? 1.8 : 1) + i / n), px = x + Math.sin(i * 2.7) * 11;
      g.globalAlpha = (1 - ph) * (on ? 0.5 : 0.18);
      tongue(g, px, y - ph * 8, 3.5 * (1 - ph * 0.4), 14 + 10 * (1 - ph), `rgba(${F.rgb},1)`);
    }
    g.restore();
  }
  g.restore();
}

function flower(g, f, t) {
  const age = t - f.born, life = UNIQUE_AURA.regen.flowerLife;
  const open = Math.min(1, age / 0.3), fade = Math.min(1, (life - age) / 0.5);
  g.save();
  g.translate(f.x, f.y); g.scale(1, 0.55); g.rotate(f.seed);
  g.globalAlpha = fade;
  for (let i = 0; i < 5; i++) {
    g.rotate(TAU / 5);
    g.beginPath(); g.ellipse(2.6 * open, 0, 2.6 * open, 1.4 * open, 0, 0, TAU);
    g.fillStyle = i % 2 ? '#9dffb0' : '#ffd6f0'; g.fill();
  }
  g.beginPath(); g.arc(0, 0, 1.2 * open, 0, TAU); g.fillStyle = '#ffe27a'; g.fill();
  g.restore();
}

function setPillar(g, x, y, k, t, lite, setR) {
  const P = SET_PILLAR, h = P.h * (0.3 + 0.7 * k), w = P.w * (0.6 + 0.4 * k);
  const rgb = setR >= 5 ? '255,120,110' : GOLD;
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createLinearGradient(0, y - h, 0, y);
  gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.6, `rgba(${rgb},${0.22 * k})`); gr.addColorStop(1, `rgba(${rgb},${0.45 * k})`);
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w * 0.3, y - h); g.lineTo(x + w * 0.3, y - h); g.lineTo(x + w / 2, y); g.closePath(); g.fill();
  // bright core
  const core = g.createLinearGradient(0, y - h, 0, y);
  core.addColorStop(0, 'rgba(255,255,255,0)'); core.addColorStop(1, `rgba(255,255,255,${0.35 * k})`);
  g.fillStyle = core; g.fillRect(x - 2.5, y - h, 5, h);
  // rings climbing the pillar
  const n = lite ? 1 : P.rings;
  for (let i = 0; i < n; i++) {
    const ph = fract(t * 0.5 + i / n), ry = y - ph * h;
    g.beginPath(); g.ellipse(x, ry, w * 0.5 * (1 - ph * 0.4), 3, 0, 0, TAU);
    g.lineWidth = 1.2; g.strokeStyle = `rgba(${rgb},${(1 - ph) * 0.8 * k})`; g.stroke();
  }
  g.globalAlpha = 0.5 * k; glow(g, x, y, w * 1.4, rgbHex(rgb));
  g.restore();
}

function lightWings(g, x, y, t, lite) {
  const n = cnt(RARITY_AURA.wingFeathers, lite);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) {
    g.save(); g.translate(x + s * 3, y - BODY.chest - 6); g.scale(s, 1); g.rotate(-0.25 + Math.sin(t * 2.2) * 0.1);
    for (let i = 0; i < n; i++) {
      const a = -0.9 + (i / (n - 1)) * 1.3, len = 16 + i * 2.2;
      g.save(); g.rotate(a);
      const gr = g.createLinearGradient(0, 0, len, 0);
      gr.addColorStop(0, 'rgba(255,200,90,.55)'); gr.addColorStop(1, 'rgba(255,60,90,0)');
      g.beginPath(); g.moveTo(2, 0); g.quadraticCurveTo(len * 0.6, -3.5, len, 0); g.quadraticCurveTo(len * 0.6, 2, 2, 0);
      g.fillStyle = gr; g.fill();
      g.restore();
    }
    g.restore();
  }
  // halo
  g.beginPath(); g.ellipse(x, y - BODY.top - 2, 8, 2.6, 0, 0, TAU);
  g.lineWidth = 1.4; g.strokeStyle = `rgba(255,190,90,${0.6 + 0.25 * Math.sin(t * 3)})`; g.stroke();
  g.restore();
}

function phoenixWings(g, x, y, t, lite) {
  const P = UNIQUE_AURA.phoenix, n = cnt(P.feathers, lite);
  g.save();
  for (const s of [-1, 1]) {
    const flap = Math.sin(t * P.flap + (s > 0 ? 0.4 : 0)) * 0.22;
    g.save(); g.translate(x + s * 2, y - BODY.chest - 4); g.scale(s, 1); g.rotate(-0.35 + flap);
    for (let i = n - 1; i >= 0; i--) { // feathers fanning out, long at the top
      const a = -1.05 + (i / (n - 1)) * 1.25, len = 14 + (n - 1 - i) * 3.4;
      g.save(); g.rotate(a);
      const gr = g.createLinearGradient(0, 0, len, 0);
      gr.addColorStop(0, 'rgba(255,240,170,.95)'); gr.addColorStop(0.5, 'rgba(255,150,50,.85)'); gr.addColorStop(1, 'rgba(220,40,20,.15)');
      g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(len * 0.3, -4.5, len * 0.75, -4, len, -0.5 + Math.sin(t * 9 + i) * 0.8);
      g.bezierCurveTo(len * 0.7, 2.6, len * 0.3, 2.4, 0, 0);
      g.fillStyle = gr; g.fill();
      g.restore();
    }
    g.restore();
  }
  // tail of flame trailing from the lower back
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (lite ? 2 : 4); i++) {
    const sway = Math.sin(t * 5 + i) * 2;
    g.globalAlpha = 0.4 - i * 0.06;
    tongue(g, x + sway - 3 + i * 2, y - 12, 2.2 - i * 0.3, -(7 + i * 2.5), i % 2 ? 'rgba(255,200,80,1)' : 'rgba(255,110,40,1)');
  }
  g.restore();
}

function thornCrown(g, x, y, t, lite, hurt) {
  const T = UNIQUE_AURA.thorns, n = cnt(T.spikes, lite), len = T.spikeLen * (hurt ? 1.9 : 1);
  g.save(); g.translate(x, y); g.scale(1, 0.45); g.rotate(t * T.spin);
  g.beginPath(); g.arc(0, 0, T.r, 0, TAU); g.lineWidth = 2.6; g.strokeStyle = '#1c121c'; g.stroke();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, l = len * (0.7 + 0.3 * Math.sin(i * 3.1));
    const c = Math.cos(a), s = Math.sin(a);
    g.beginPath();
    g.moveTo(c * T.r - s * 2.4, s * T.r + c * 2.4);
    g.lineTo(c * (T.r + l), s * (T.r + l));
    g.lineTo(c * T.r + s * 2.4, s * T.r - c * 2.4);
    g.closePath();
    g.fillStyle = '#2a1a2a'; g.fill();
    g.lineWidth = 0.6; g.strokeStyle = hurt ? 'rgba(255,120,160,.9)' : 'rgba(150,90,170,.7)'; g.stroke();
  }
  g.restore();
}

// in front of the body (emissive)
// best: highest rarity among the gear worn.
export function auraFront(g, x, y, fx, best, t, o = {}) {
  fx = fx || {};
  const lite = !!o.lite, face = o.facing || 1;
  g.save();
  g.globalCompositeOperation = 'lighter';
  if (o.level) levelFront(g, x, y, o.level, t, lite);
  rarityFront(g, x, y, best, t, lite, face);
  const pk = o.host ? stateOf(o.host).pillar(t, fullSet(o.set ?? -1)) : 0;
  if (pk > 0) { g.globalAlpha = 0.6 * pk; glow(g, x, y - SET_PILLAR.h * 0.9, 18, o.set >= 5 ? RCOL[5] : '#ffd166'); }

  const rise = (i, n, speed, spread, h = 36) => {
    const ph = fract(t * speed + i / n);
    return [x + Math.sin(i * 7.3 + t * 1.3) * spread, y - 4 - ph * h, ph];
  };
  if (fx.phoenix) { // embers falling from the wings
    const P = UNIQUE_AURA.phoenix, n = cnt(P.embers, lite);
    for (let i = 0; i < n; i++) {
      const ph = fract(t * 0.6 + i / n), side = i % 2 ? 1 : -1;
      g.globalAlpha = (1 - ph) * 0.9;
      glow(g, x + side * (10 + (i * 5) % 14) + Math.sin(t * 4 + i) * 2, y - 38 + ph * 36, 2.2, '#ff9a3c');
    }
  }
  if (fx.lifesteal) { // blood drops circling into the chest
    const L = UNIQUE_AURA.lifesteal, n = cnt(L.drops, lite);
    for (let i = 0; i < n; i++) {
      const ph = fract(t * 0.7 + i / n), a = i * 2.4 + t * 2, r = 22 * (1 - ph);
      g.globalAlpha = 0.85 * Math.min(1, ph * 3);
      glow(g, x + Math.cos(a) * r, y - BODY.chest + Math.sin(a) * r * 0.6, 2, '#ff2a48');
    }
  }
  if (fx.explode) {
    const E = UNIQUE_AURA.explode, n = cnt(E.embers, lite);
    for (let i = 0; i < n; i++) {
      const [px, py, ph] = rise(i, n, 0.8, 11);
      g.globalAlpha = (1 - ph) * (0.7 + 0.3 * Math.sin(t * 20 + i));
      glow(g, px, py, 2.4 * (1 - ph * 0.5), '#ff8a32');
    }
  }
  if (fx.regen) { // leaves and green light spiralling up
    const R = UNIQUE_AURA.regen, n = cnt(R.leaves, lite);
    for (let i = 0; i < n; i++) {
      const ph = fract(t * 0.35 + i / n), a = ph * TAU * 1.5 + i * 0.9;
      const px = x + Math.cos(a) * 13, py = y - 2 - ph * 40;
      g.globalAlpha = (1 - ph) * 0.9;
      g.save(); g.translate(px, py); g.rotate(a * 2);
      g.beginPath(); g.ellipse(0, 0, 3, 1.4, 0, 0, TAU); g.fillStyle = i % 2 ? '#7dff9a' : '#c8ff5a'; g.fill();
      g.restore();
      glow(g, px, py, 3, '#78ff8c');
    }
  }
  if (fx.goldfind) { // coins orbiting and catching the light
    const G = UNIQUE_AURA.goldfind, n = cnt(G.coins, lite);
    for (let i = 0; i < n; i++) {
      const a = t * 1.8 + (i / n) * TAU, px = x + Math.cos(a) * G.orbit, py = y - 14 + Math.sin(a) * 5;
      const flip = Math.abs(Math.cos(t * 5 + i));
      g.globalAlpha = Math.sin(a) > 0 ? 1 : 0.55; // the far side is dimmer
      g.beginPath(); g.ellipse(px, py, 2.4 * flip + 0.4, 2.4, 0, 0, TAU); g.fillStyle = '#ffd166'; g.fill();
      if (flip > 0.95) star4(g, px, py, 3.5, 0, '#fff6c4');
    }
  }
  if (fx.expfind) { // blue runes floating up
    const X = UNIQUE_AURA.expfind, n = cnt(X.runes, lite);
    for (let i = 0; i < n; i++) {
      const [px, py, ph] = rise(i + 0.5, n, 0.3, 14, 44);
      rune(g, px, py, 1.6, i, '#78e6ff', (1 - ph) * 0.9);
      g.globalAlpha = (1 - ph) * 0.4; glow(g, px, py, 4, '#78e6ff');
    }
  }
  if (fx.chain) chainArcs(g, x, y, t, lite);
  if (fx.execute || fx.bossdmg) {
    const E = UNIQUE_AURA.execute, k = 0.5 + 0.5 * Math.sin(t * 4);
    g.globalAlpha = 0.6 + 0.4 * k;
    glow(g, x + face * 3.5, y - BODY.head, 3 + k * 1.5, '#ff2840'); // burning eye
    if (o.enemies) for (const e of o.enemies) {
      if (e.hp > 0 && e.hp < e.maxHp * E.skullBelow) skull(g, e.x, e.y - e.r - 14 + Math.sin(t * 3 + e.x) * 1.5, t);
    }
  }
  if (fx.dodgecd) windRibbons(g, x, y, t, lite, o.host ? stateOf(o.host) : null);
  if (fx.shield) hexDome(g, x, y, t, lite, o.shield ?? 1);
  if (fx.frenzy && (o.frenzyOn ?? true)) frenzyFront(g, x, y, t, lite);
  g.restore();
}

// Langka glint · Epik glint · Legendaris flames + motes + glowing weapon · Mitos rainbow + stars
function rarityFront(g, x, y, best, t, lite, face) {
  if (best < 2) return;
  const A = RARITY_AURA, hx = x + face * BODY.handX, hy = y - BODY.hand;
  const mythic = best >= 5;
  const col = mythic ? rgbHex(A.mythicRgb[Math.floor(t * 3) % A.mythicRgb.length]) : RCOL[best];
  // weapon glint every glintEvery s (Mitos: often, in rainbow)
  const every = mythic ? A.glintEvery / 3 : A.glintEvery;
  const ph = fract(t / every);
  if (ph < 0.18) {
    const k = Math.sin((ph / 0.18) * Math.PI);
    g.globalAlpha = k;
    star4(g, hx + face * 4, hy - 8, 4 + k * 3 + (best - 2), t * 2, col);
  }
  if (best >= 4) {
    g.globalAlpha = 0.55 + 0.2 * Math.sin(t * 5); glow(g, hx, hy - 4, 7, col); // the weapon burns
    const n = cnt(A.flames, lite);
    for (let i = 0; i < n; i++) { // soft flames hugging the body
      const p = fract(t * 1.2 + i / n), side = (i / n) * TAU;
      const fx = x + Math.cos(side) * 10, fy = y - 6 - Math.abs(Math.sin(side)) * 18;
      g.globalAlpha = (1 - p) * 0.45;
      tongue(g, fx, fy - p * 10, 3, 9 + 6 * (1 - p), mythic ? '#ff7a5a' : '#ffc86a');
      g.globalAlpha = (1 - p) * 0.35; glow(g, fx, fy - p * 10 - 4, 5, mythic ? '#ff4d6d' : '#ffb547');
    }
    const m = cnt(A.motes, lite);
    for (let i = 0; i < m; i++) {
      const p = fract(t * 0.45 + i / m);
      g.globalAlpha = (1 - p) * 0.85;
      glow(g, x + Math.sin(i * 7.3 + t * 1.3) * 13, y - 4 - p * 40, 2 * (1 - p * 0.5), RCOL[best]);
    }
  }
  if (mythic) {
    const n = cnt(A.stars, lite);
    for (let i = 0; i < n; i++) {
      const p = fract(t * 0.3 + i / n), a = i * 2.39 + t * 0.6;
      g.globalAlpha = Math.sin(p * Math.PI);
      star4(g, x + Math.cos(a) * (14 + p * 8), y - 20 + Math.sin(a) * 14 - p * 10, 2.4, t + i, rgbHex(A.mythicRgb[i % 3]));
    }
  }
}

function chainArcs(g, x, y, t, lite) {
  const C = UNIQUE_AURA.chain, n = cnt(C.arcs, lite);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let j = 0; j < n; j++) {
    if (((t * 14 + j * 5) | 0) % 3 === 0) continue; // crackle on and off
    const a = t * (7 + j) + j * 2.1, cy = y - BODY.chest;
    g.beginPath(); g.moveTo(x + Math.cos(a) * 10, cy + Math.sin(a) * 12);
    for (let k = 1; k <= 5; k++) {
      const b = a + k * 0.45, rr = 9 + ((k + ((t * 30) | 0)) % 2) * 5;
      g.lineTo(x + Math.cos(b) * rr, cy + Math.sin(b) * rr * 1.1);
    }
    g.globalAlpha = 0.9;
    g.lineWidth = 3; g.strokeStyle = 'rgba(160,130,255,.35)'; g.stroke();
    g.lineWidth = 1.1; g.strokeStyle = `rgba(${C.rgb},1)`; g.stroke();
  }
  const ph = fract(t / C.strikeEvery);
  if (ph < 0.1) { // a bolt jumps to the ground now and then
    const a = Math.floor(t / C.strikeEvery) * 2.3, gx = x + Math.cos(a) * 26, gy = y + Math.sin(a) * 9;
    g.globalAlpha = 1 - ph * 10;
    g.beginPath(); g.moveTo(x, y - BODY.chest);
    for (let k = 1; k < 5; k++) g.lineTo(x + (gx - x) * (k / 5) + Math.sin(k * 9 + a) * 4, y - BODY.chest + (gy - y + BODY.chest) * (k / 5));
    g.lineTo(gx, gy);
    g.lineWidth = 1.4; g.strokeStyle = '#f4ecff'; g.stroke();
    glow(g, gx, gy, 8, '#c9a8ff');
  }
}

function skull(g, x, y, t) {
  const k = 0.55 + 0.25 * Math.sin(t * 5);
  g.globalAlpha = k;
  glow(g, x, y, 9, '#ff2840');
  g.globalAlpha = k * 0.9;
  g.beginPath(); g.arc(x, y - 1, 4.2, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(x + 2.6, y + 3.8); g.lineTo(x - 2.6, y + 3.8); g.closePath();
  g.fillStyle = '#ffb3bd'; g.fill();
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(60,0,10,.9)';
  g.beginPath(); g.arc(x - 1.6, y - 0.6, 1.1, 0, TAU); g.arc(x + 1.6, y - 0.6, 1.1, 0, TAU); g.fill();
  g.fillRect(x - 0.4, y + 1, 0.8, 1.4);
  g.globalCompositeOperation = 'lighter';
}

function windRibbons(g, x, y, t, lite, st) {
  const D = UNIQUE_AURA.dodgecd, n = cnt(D.ribbons, lite);
  for (let i = 0; i < n; i++) {
    const a = t * 5 + (i / n) * TAU, h = 6 + i * 7;
    g.beginPath(); g.ellipse(x, y - h, 14 - i, 4.5, 0, a, a + 1.4);
    g.globalAlpha = 0.6; g.lineWidth = 1.3; g.lineCap = 'round'; g.strokeStyle = `rgba(${D.rgb},1)`; g.stroke();
  }
  if (!st || lite || Math.hypot(st.vx, st.vy) < 20) return; // afterimages only while moving
  for (let i = 1; i <= D.ghosts; i++) {
    const gx = x - st.vx * i * 0.045, gy = y - st.vy * i * 0.045;
    g.globalAlpha = 0.18 / i;
    g.beginPath(); g.ellipse(gx, gy - BODY.chest, 6, 15, 0, 0, TAU); g.fillStyle = `rgba(${D.rgb},1)`; g.fill();
  }
}

function hexDome(g, x, y, t, lite, left) {
  const S = UNIQUE_AURA.shield, n = cnt(S.hexes, lite), cy = y - BODY.chest;
  const a0 = 0.18 + 0.4 * left;
  g.beginPath(); g.ellipse(x, cy, S.r, S.r * 1.05, 0, 0, TAU);
  g.globalAlpha = a0 * (0.7 + 0.3 * Math.sin(t * 2)); g.lineWidth = 1; g.strokeStyle = `rgba(${S.rgb},1)`; g.stroke();
  for (let i = 0; i < n; i++) { // hexagons sliding around the dome surface
    const a = t * 0.8 + (i / n) * TAU, depth = Math.sin(a);
    const hx = x + Math.cos(a) * S.r * 0.75, hy = cy + Math.sin(i * 1.9) * S.r * 0.55;
    const s = 4.2 * (0.75 + 0.25 * depth);
    g.beginPath();
    for (let k = 0; k < 6; k++) { const b = (k / 6) * TAU; g.lineTo(hx + Math.cos(b) * s, hy + Math.sin(b) * s); }
    g.closePath();
    g.globalAlpha = a0 * (0.5 + 0.5 * depth);
    g.lineWidth = 0.8; g.stroke();
  }
}

function frenzyFront(g, x, y, t, lite) {
  const F = UNIQUE_AURA.frenzy, n = cnt(F.steam, lite);
  for (let i = 0; i < n; i++) { // rage steam from the shoulders
    const p = fract(t * 0.9 + i / n), side = i % 2 ? 1 : -1;
    g.globalAlpha = (1 - p) * 0.35;
    glow(g, x + side * (7 + p * 6), y - BODY.chest - 8 - p * 16, 4 + p * 5, '#ff6a50');
  }
  if (lite || !g.canvas) return;
  // thin red pulse at the screen edges
  const k = F.pulse * (0.5 + 0.5 * Math.sin(t * 6));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const W = g.canvas.width, H = g.canvas.height;
  const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  gr.addColorStop(0, 'rgba(255,30,30,0)'); gr.addColorStop(1, `rgba(255,30,30,${k.toFixed(3)})`);
  g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.restore();
}

// Rarity colour of the weapon, for weapon trails; null when Biasa / none.
export const trailRgb = (gear) => (gear?.weapon && gear.weapon.rarity >= 1 ? RRGB[gear.weapon.rarity] : null);
export const bestRarity = (gear) => Math.max(-1, ...Object.values(gear || {}).map((x) => x.rarity ?? -1));
