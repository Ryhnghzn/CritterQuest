// Keep the page itself at scroll (0,0). The game never scrolls the page (html/body overflow:hidden),
// but iOS Safari still scrolls it to lift a focused text field above the keyboard — and inside the
// itch.io iframe it does not scroll back. Fixed elements stay drawn where they were while touches are
// hit-tested against the scrolled page, so every tap lands off by that scroll. Scrolling inner panels
// (cheat, shop lists) is untouched: only the window's own scroll is reset.
export function pinPage() {
  const typing = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable); };
  const pin = () => { if ((scrollX || scrollY) && !typing()) scrollTo(0, 0); }; // let iOS lift the field while typing
  addEventListener('scroll', pin, { passive: true });
  addEventListener('resize', pin);
  addEventListener('orientationchange', pin);
  document.addEventListener('focusout', () => setTimeout(pin, 50)); // after the keyboard has closed
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', pin);
    visualViewport.addEventListener('scroll', pin);
  }
  pin();
}
