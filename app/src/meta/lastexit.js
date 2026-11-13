// How the game was left last time (spec §50): while it runs it notes a heartbeat (time, where the
// player is, since when, whether the page is hidden); a clean exit (the page closed, a reload the game
// asked for) marks it closed. At the next start an unclosed note means the page was killed: in the
// background (the phone freeing memory for other apps, normal) or in front of the player (the phone
// ran out of memory while playing). Pure: the caller reads / writes the note (localStorage).
export const BEAT_EVERY = 3; // seconds between heartbeats

// the note to store now. prev: the note so far (same session) or null
export function beat(prev, now, scene, hidden = false) {
  return { t: now, since: prev?.since ?? now, scene: scene || 'title', hidden: !!hidden, clean: false };
}
// the note for a clean exit (reason: 'close' | 'update' | 'lang' …)
export const closed = (prev, now, reason = 'close') => ({ ...(prev || beat(null, now, 'title')), t: now, clean: true, reason });

// at start: what happened to the last session. null = nothing to say (first start, a clean exit,
// a very short session). kind: 'killed' (in front of the player) | 'background'.
export function verdict(note, now) {
  if (!note || typeof note.t !== 'number' || note.clean) return null;
  const minutes = Math.max(0, Math.round((note.t - (note.since ?? note.t)) / 60000));
  return { kind: note.hidden ? 'background' : 'killed', scene: note.scene || 'title', minutes, ago: Math.max(0, Math.round((now - note.t) / 1000)) };
}
