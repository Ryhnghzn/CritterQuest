// Speech bubbles over the townsfolk (spec §45.4): a DOM layer over the 3D town, one bubble per
// talker that town/chatter.js picks, placed over its head every frame, the line typed out with a
// small mood badge. Under the HUD and every panel (first child of #ui).
const BADGE = { ask: '?', shock: '!', happy: '♪', think: '…', angry: '!', worry: '…' };
let layer = null;
const pool = new Map(); // npc id → { el, text }

// list: town/chatter.js output; project(x, y) → { x, y } on screen (CSS px) or null
export function updateBubbles(list, project) {
  if (!layer) {
    layer = document.createElement('div'); layer.id = 'bubbles';
    document.getElementById('ui').prepend(layer);
  }
  const live = new Set();
  for (const c of list) {
    const p = project(c.x, c.y);
    if (!p) continue;
    live.add(c.npc.id);
    let b = pool.get(c.npc.id);
    if (!b) {
      const e = document.createElement('div'); e.className = 'bub';
      e.innerHTML = '<i class="be"></i><span></span>';
      layer.append(e);
      b = { el: e, text: '', mood: null }; pool.set(c.npc.id, b);
    }
    const shown = c.text.slice(0, c.shown);
    if (b.text !== shown) { b.text = shown; b.el.lastChild.textContent = shown; }
    if (b.mood !== c.mood) { b.mood = c.mood; const be = b.el.firstChild; be.textContent = BADGE[c.mood] || ''; be.className = `be${c.mood ? ` on m-${c.mood}` : ''}`; }
    b.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
    b.el.classList.toggle('show', shown.length > 0);
  }
  for (const [id, b] of pool) if (!live.has(id)) { b.el.remove(); pool.delete(id); }
}
