// The game canvas shared by every scene: full device resolution, adaptive zoom
// (the short screen side shows ~VIEW world units) and the world → device transform.
const VIEW = 360;

export class View {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.onResize = [];   // (view) => void — scenes re-bake their art here
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const cssW = innerWidth, cssH = innerHeight;
    this.c.width = Math.round(cssW * dpr);
    this.c.height = Math.round(cssH * dpr);
    this.zoom = Math.max(1, Math.min(cssW, cssH) / VIEW); // CSS px per world unit
    this.S = this.zoom * dpr;                              // device px per world unit
    this.viewW = cssW / this.zoom; this.viewH = cssH / this.zoom;
    const W = this.c.width, H = this.c.height;
    this.vignette = this.ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    this.vignette.addColorStop(0, 'rgba(10,6,28,0)');
    this.vignette.addColorStop(1, 'rgba(10,6,28,.6)');
    for (const cb of this.onResize) cb(this);
  }

  // Sets the world transform with the camera centred on (cx, cy).
  begin(cx, cy) {
    const S = this.S;
    this.ctx.setTransform(S, 0, 0, S, this.c.width / 2 - cx * S, this.c.height / 2 - cy * S);
  }

  // CSS pixel → world point for a camera at (cx, cy).
  screenToWorld(x, y, cx, cy) {
    return { x: cx + (x - innerWidth / 2) / this.zoom, y: cy + (y - innerHeight / 2) / this.zoom };
  }

  vignetteOverlay() {
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = this.vignette;
    g.fillRect(0, 0, this.c.width, this.c.height);
  }
}
