// Touch check (on while "Show FPS" is on): a ring where the game read each touch, plus the element
// that touch hit, so a phone screenshot shows whether taps land where the finger is.
let on = false;
export function setTouchDots(v) { on = v; }

addEventListener('touchstart', (e) => {
  if (!on) return;
  for (const t of e.changedTouches) {
    const d = document.createElement('div'), tg = t.target;
    d.style.cssText = `position:fixed;left:${t.clientX - 14}px;top:${t.clientY - 14}px;width:28px;height:28px;border:3px solid #ff3b6b;border-radius:50%;z-index:99;pointer-events:none;`
      + 'font:700 11px/1 system-ui;color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap;text-indent:34px;padding-top:6px;box-sizing:border-box';
    d.textContent = `${Math.round(t.clientX)},${Math.round(t.clientY)} ${tg.id || tg.className || tg.tagName} sy${Math.round(scrollY)} vv${window.visualViewport ? `${Math.round(visualViewport.offsetTop)}×${visualViewport.scale.toFixed(2)}` : '-'}`;
    document.body.append(d);
    setTimeout(() => d.remove(), 2500);
  }
}, { passive: true, capture: true });
