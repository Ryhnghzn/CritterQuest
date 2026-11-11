// Bayangan Diri (spec §43.10): the trial boss of Job Lanjutan is the player's own hero, drawn by the
// anime character system at boss size, swallowed in shadow, with red eyes. main.js sets whose
// shadow it is (setShadowLook) before the trial; until then a plain warrior.
import { drawAnime, animeLook } from '../anime/index.js';

let who = { classId: 'warrior', look: { hair: 0, hairColor: 0 } };
export function setShadowLook(classId, look) { who = { classId: classId === 'novice' ? 'warrior' : classId, look }; }

export const GLOW = 'rgba(130,60,220,.55)';
const INK = 'rgba(14,4,30,.82)';

function shade(g, at, front, phase) {
  g.save(); // swallow everything drawn so far in shadow
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = INK; g.fillRect(-400, -400, 800, 800);
  g.restore();
  if (!at) return;
  const [hx, hy] = at.head, eyes = front ? [[-4.5, -1], [4.5, -1]] : [[5, -1.5]];
  g.save();
  g.shadowColor = '#ff2040'; g.shadowBlur = phase > 1 ? 10 : 6; g.fillStyle = '#ff3a50';
  for (const [x, y] of eyes) { g.beginPath(); g.moveTo(hx + x - 2.6, hy + y); g.lineTo(hx + x + 2.6, hy + y - 1.2); g.lineTo(hx + x + 1.6, hy + y + 1); g.closePath(); g.fill(); }
  g.restore();
}

export function side(g, t, phase, attack) {
  const at = drawAnime(g, who.classId, animeLook(who.classId, who.look), { t, moving: 0.35, walk: t * 3, attackPhase: attack ?? undefined });
  shade(g, at, false, phase);
}
export function front(g, t, phase) {
  const at = drawAnime(g, who.classId, animeLook(who.classId, who.look), { view: 'front', t });
  shade(g, at, true, phase);
}
