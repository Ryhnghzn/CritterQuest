import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const handlers = {};
let input;

const touchstart = (el, clientX = 100) => {
  const e = { target: el, changedTouches: [{ identifier: 1, clientX, clientY: 200 }], preventDefault: vi.fn() };
  handlers.touchstart(e);
  return e;
};

beforeAll(async () => {
  vi.stubGlobal('addEventListener', (type, fn) => { handlers[type] = fn; });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('innerWidth', 800);
  vi.stubGlobal('scrollTo', vi.fn());
  ({ input } = await import('./input.js'));
});

beforeEach(() => { input.joy = null; });

describe('touchstart', () => {
  it('starts the stick on the left half of the play field', () => {
    const e = touchstart({ id: 'game' });
    expect(input.joy).toMatchObject({ id: 1, ox: 100, oy: 200 });
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('leaves the right half of the play field free of the stick', () => {
    touchstart({ id: 'game' }, 500);
    expect(input.joy).toBeNull();
  });

  it.each(['minimap', 'prompt', 'qthead'])('keeps the tap on #%s, so its click still fires', (id) => {
    const e = touchstart({ id });
    expect(input.joy).toBeNull();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});

describe('focusout', () => {
  it('puts the page back after a field closes the phone keyboard', () => {
    handlers.focusout({ target: { matches: () => true } });
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('leaves the page alone when a button loses focus', () => {
    scrollTo.mockClear();
    handlers.focusout({ target: { matches: () => false } });
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
