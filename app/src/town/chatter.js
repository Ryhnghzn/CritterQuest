// Townsfolk talking to themselves (spec §45.4): the ones near the player, each with a speech
// bubble over the head that shows one of its lines for a while, then the next. Only plain
// talkers (role 'talk') without a quest mark; the nearest few. Pure.
import { npcAt } from './town.js';
import { lineText, moodOf } from '../meta/mood.js';

// npcs: the NPCs of the map; at: { x, y } of the player; t: town time (s); marks: { npcId: mark }
// opt: radius (game units), max bubbles, every (s per line), speed (letters per s), quiet (s
// between lines). Returns [{ npc, x, y, text, mood, shown }] nearest first.
export function chatter(npcs, at, t, marks = {}, { radius = 420, max = 3, every = 6, speed = 30, quiet = 1.2, night = false } = {}) {
  const out = [];
  for (const n of npcs) {
    if (n.role !== 'talk' || !n.lines?.length || marks[n.id] || (n.night && !night)) continue;
    const p = npcAt(n, t), d = Math.hypot(p.x - at.x, p.y - at.y);
    if (d > radius) continue;
    // each NPC keeps its own rhythm so the bubbles do not change all at once
    const off = ((n.x * 7 + n.y * 13) % 997) / 997 * every, k = (t + off) / every;
    const line = n.lines[Math.floor(k) % n.lines.length], into = (k % 1) * every;
    if (into > every - quiet) continue; // a breath between lines
    const text = lineText(line);
    out.push({ npc: n, x: p.x, y: p.y, d, text, mood: moodOf(line), shown: Math.min(text.length, Math.floor(into * speed)) });
  }
  return out.sort((a, b) => a.d - b.d).slice(0, max);
}
