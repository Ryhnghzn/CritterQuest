// Night lighting (spec §13.2): an ambient darkness layer with soft holes cut
// around light sources, then a faint additive tint in each light's colour.
// lights: [{ x, y, r, rgb: 'r,g,b', tint }] in world units; tint = additive strength.
export class Lighting {
  constructor(view) {
    this.view = view;
    this.c = document.createElement('canvas');
    view.onResize.push(() => this.resize());
    this.resize();
  }

  resize() {
    this.c.width = this.view.c.width;
    this.c.height = this.view.c.height;
  }

  draw(cx, cy, lights, ambient) {
    const v = this.view, S = v.S, W = this.c.width, H = this.c.height;
    const l = this.c.getContext('2d');
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, W, H);
    l.fillStyle = ambient;
    l.fillRect(0, 0, W, H);
    l.globalCompositeOperation = 'destination-out';
    l.setTransform(S, 0, 0, S, W / 2 - cx * S, H / 2 - cy * S);
    for (const p of lights) {
      const gr = l.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(0.45, 'rgba(0,0,0,.75)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = gr;
      l.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    const g = v.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.c, 0, 0);
    g.save();
    v.begin(cx, cy);
    g.globalCompositeOperation = 'lighter';
    for (const p of lights) {
      if (!p.tint) continue;
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 0.8);
      gr.addColorStop(0, `rgba(${p.rgb},${p.tint})`);
      gr.addColorStop(1, `rgba(${p.rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    g.restore();
  }
}
