// Which way an upright 2D figure faces on screen (spec §38): measured on SCREEN, so it stays
// right however the camera is turned (A), and it turns like a sheet of paper (narrows to a
// sliver, widens mirrored, with a small hop) and leans into the walk (B). Numbers: LOOK.facing.
// C (light): a figure walking toward the camera shows its front, walking away its back; across,
// and while busy (attacking, a skill, a dodge), its side. Standing keeps the last view.
// Pure logic, no DOM; the renderers apply the result to a canvas or a mesh.
import { LOOK } from '../data/look.js';

// a world direction (game x right, y south) → its screen-x (right) and its part toward the camera
export const screenX = (x, y, yaw) => x * Math.cos(yaw) - y * Math.sin(yaw);
export const towardCam = (x, y, yaw) => x * Math.sin(yaw) + y * Math.cos(yaw);

export function makeFacing(face = 1) {
  return { face, cur: face, hopT: -9, t: null, view: 'side', prev: 'side', viewT: -9 };
}

// sx: screen-x of where the figure looks or walks (only its sign counts, past `dead`)
export function turnTo(f, sx, t, F = LOOK.facing) {
  const dt = f.t == null ? 0 : Math.max(0, Math.min(0.1, t - f.t));
  f.t = t;
  if (Math.abs(sx) > F.dead) {
    const want = sx > 0 ? 1 : -1;
    if (want !== f.face) { f.face = want; f.hopT = t; }
  }
  if (!(F.turn > 0)) { f.cur = f.face; return f; }
  const rate = (2 / F.turn) * dt;
  f.cur += Math.max(-rate, Math.min(rate, f.face - f.cur));
  return f;
}

const smooth = (x) => x * x * (3 - 2 * x);
// how to draw it this frame: w = signed width (−1..1, a thin sliver mid-turn), hop = lift in
// game units, lean = radians (positive leans right); lean01 = screen-x speed, −1..1
export function pose2d(f, t, lean01 = 0, F = LOOK.facing) {
  const k = Math.min(1, Math.abs(f.cur)), sign = f.cur === 0 ? f.face : Math.sign(f.cur);
  const w = F.turn > 0 ? sign * Math.max(0.06, smooth(k)) : f.face;
  const p = F.turn > 0 ? (t - f.hopT) / F.turn : 1;
  const hop = p >= 0 && p < 1 ? Math.sin(p * Math.PI) * F.hop : 0;
  const lean = Math.max(-1, Math.min(1, lean01)) * F.lean;
  return { w, hop, lean };
}

// sx, sz: the walk on screen (screen-x, toward the camera), length 0..1; busy → side.
// rest: the view while standing ('front' for townsfolk; null keeps the last one)
export function viewTo(f, sx, sz, t, busy = false, rest = null, F = LOOK.facing) {
  let v = f.view;
  if (!F.views || busy) v = 'side';
  else if (Math.hypot(sx, sz) > F.viewMin) {
    if (Math.abs(sz) > Math.abs(sx) * F.viewBand) v = sz > 0 ? 'front' : 'back';
    else if (Math.abs(sx) > Math.abs(sz) * F.viewBand) v = 'side'; // between the two: keep
  } else if (rest) v = rest;
  if (v !== f.view) { f.prev = f.view; f.view = v; f.viewT = t; }
  return f;
}
// the view drawn now: the old one until half-way through a quick paper turn, then the new one
export function viewNow(f, t, F = LOOK.facing) {
  const p = F.turn > 0 ? (t - f.viewT) / F.turn : 1;
  if (p < 0 || p >= 1) return { view: f.view, squash: 1 };
  return { view: p < 0.5 ? f.prev : f.view, squash: 1 - 0.7 * Math.sin(p * Math.PI) };
}
