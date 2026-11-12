import { describe, it, expect } from 'vitest';
import { moodOf, lineText } from './mood.js';

describe('moodOf (spec §45.3)', () => {
  it('keeps a mood written on the line', () => {
    expect(moodOf({ t: 'Halo.', mood: 'worry' })).toBe('worry');
    expect(moodOf({ t: 'Kau siapa?', mood: 'nope' })).toBe('ask'); // unknown mood: read the text
  });
  it('reads questions, pauses and laughter', () => {
    expect(moodOf('Kau dari mana saja semalam?')).toBe('ask');
    expect(moodOf('Hmm… peta ini… sepertinya aku pernah melihatnya…')).toBe('think');
    expect(moodOf('Aku pernah sampai Lantai 4… lalu golem itu menginjakku. Hahaha.')).toBe('happy');
    expect(moodOf('Nanti saja')).toBeNull();
  });
  it('reads surprise and shouting', () => {
    expect(moodOf('Apa?! Kau mengalahkan Raja Maw?!')).toBe('shock');
    expect(moodOf('JANGAN PERGI TANPA RAMUAN!')).toBe('angry');
    expect(moodOf('Kak! Kak! Kakak petualang ya? Keren!')).toBe('shock');
  });
  it('gives the text of either form', () => {
    expect(lineText('a')).toBe('a');
    expect(lineText({ t: 'b' })).toBe('b');
    expect(lineText(null)).toBe('');
  });
});
