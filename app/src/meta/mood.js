// The mood of a line (spec §45.3): it sets the portrait's motion and the symbol by the head in
// the dialog, and the small badge on a townsperson's speech bubble. A line is a string or
// { t, mood }; a string's mood is read from how it is written. Pure.
export const MOODS = ['angry', 'ask', 'shock', 'worry', 'happy', 'think'];

export const lineText = (line) => (line && typeof line === 'object' ? line.t : line) || '';

export function moodOf(line) {
  if (line && typeof line === 'object') return MOODS.includes(line.mood) ? line.mood : moodOf(line.t);
  const s = String(line || '').trim();
  if (!s) return null;
  if (/\b(ha){2,}|\bhe(he)+|\bhi(hi)+|♪/i.test(s)) return 'happy';
  if (/\?!|!\?/.test(s)) return 'shock';
  const upper = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (upper.length >= 8 && upper === upper.toUpperCase()) return 'angry'; // shouted
  if (/!$/.test(s) && /!.*!/.test(s)) return 'shock';                      // two or more !
  if (/\?["”']?$/.test(s)) return 'ask';
  if (/(…|\.\.\.)["”']?$/.test(s) || /^(hmm+|hm+|eh+)\b/i.test(s)) return 'think';
  if (/!["”']?$/.test(s)) return 'happy';
  return null;
}
