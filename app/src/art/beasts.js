// The older enemies redrawn with the anime kit (proposal for the owner, spec §41.1 follow-up):
// sharp cel-shaded families, recoloured per biome. Same frame as art/foes.js (facing right,
// kit units, body ≈ ±60; FOE_UNIT units per r). Shown in app/musuh.html beside the old art.
import { limb, pal, glow, mix } from './anime/kit.js';
import { part, eye, fangs, blade } from './foes.js';

// a family colour set: skin, dark (far side), accent (glow), eye
const T = (skin, rim, accent, eyeC, dark = null) => ({
  skin: pal(skin, { rim }), dark: pal(dark || mix(skin, '#0a0612', 0.45), { rim: null }), accent, eye: eyeC,
});

// Lendir: a dripping slime with a glowing core and a sharp-toothed maw, drips like spikes
export function ooze(g, c, k = 1) {
  g.save(); g.scale(k, k);
  part(g, [[-52, 30], [-58, 6], [-44, -24], [-18, -44], [12, -46], [38, -30], [54, -4], [56, 24], [44, 40], [34, 28], [22, 42], [8, 30], [-6, 44], [-20, 30], [-34, 42]], c.skin, { sd: 6 });
  glow(g, -10, 4, 26, c.accent, 0.55);
  part(g, [[-20, -6], [-8, -18], [6, -8], [-6, 6]], pal(mix(c.accent, '#ffffff', 0.3), { rim: null }), { sd: 1, lw: 1.2 }); // core
  part(g, [[8, 2], [48, -2], [44, 18], [14, 16]], pal('#12060c', { rim: null }), { sd: 1, lw: 1.4 });                    // maw
  fangs(g, 12, 46, 0, 6, 7); fangs(g, 16, 42, 16, 5, 5, false);
  eye(g, 16, -20, 5, c.eye); eye(g, 36, -16, 4, c.eye);
  for (const [x, y, len, a] of [[-40, -20, 12, -2.4], [-10, -42, 12, -1.7], [26, -40, 10, -1.2]]) part(g, blade(x, y, len, a, 5), c.skin, { sd: 1, lw: 1.2 });
  g.restore();
}

// Kelelawar: a gaunt bat, torn membrane wings with finger bones, fanged snarl
export function bat(g, c) {
  for (const s of [-1, 1]) {
    part(g, [[s * 8, -6], [s * 30, -40], [s * 62, -46], [s * 52, -26], [s * 64, -14], [s * 44, -10], [s * 52, 6], [s * 26, 0]], s < 0 ? c.dark : c.skin, { sd: 3 });
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.4; g.beginPath();
    g.moveTo(s * 30, -40); g.lineTo(s * 52, -26); g.moveTo(s * 30, -40); g.lineTo(s * 44, -10); g.stroke();
  }
  part(g, [[-14, 16], [-18, -10], [-12, -26], [-16, -40], [-4, -30], [4, -30], [16, -40], [12, -26], [18, -10], [14, 16], [0, 26]], c.skin, { sd: 3 });
  eye(g, -6, -14, 4, c.eye, 0.3); eye(g, 7, -14, 4, c.eye, -0.3);
  part(g, [[-8, 0], [8, 0], [5, 8], [-5, 8]], pal('#12060c', { rim: null }), { sd: 1, lw: 1.1 });
  fangs(g, -7, 7, 0, 2, 7);
}

// Golem: stacked angular stone slabs, a glowing core seen through the cracks, one heavy fist forward
export function golem(g, c) {
  part(g, limb([-22, 20], [-28, 44], 18, 14), c.dark, { sd: 2 }); part(g, limb([14, 20], [20, 44], 18, 14), c.dark, { sd: 2 });
  part(g, [[-52, 4], [-60, 26], [-42, 34], [-36, 10]], c.dark, { sd: 2 });                                                   // far fist
  part(g, [[-38, 28], [-44, -18], [-24, -40], [14, -44], [36, -26], [40, 8], [32, 30]], c.skin, { sd: 6 });                  // torso
  part(g, [[-12, -38], [-8, -60], [16, -64], [26, -44], [12, -36]], c.skin, { sd: 3 });                                       // head block
  eye(g, 14, -50, 4, c.accent, 0);
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const l of [[[-24, -20], [-10, -6], [-18, 10], [-6, 24]], [[14, -28], [6, -12], [18, 2]]]) {
    g.beginPath(); l.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.lineWidth = 6; g.strokeStyle = mix(c.accent, '#000000', 0.5); g.globalAlpha = 0.5; g.stroke();
    g.lineWidth = 2; g.globalAlpha = 1; g.strokeStyle = c.accent; g.stroke();
  }
  g.restore();
  glow(g, -4, -6, 22, c.accent, 0.5);
  part(g, limb([30, -10], [50, 14], 18, 14), c.skin, { sd: 3 });                                                              // arm
  part(g, [[42, 8], [64, 6], [66, 30], [44, 34]], c.skin, { sd: 3 });                                                         // fist
}

// Katak Ludah: a squat toad with a glowing throat sac that swells before it spits
export function toad(g, c, sac = 1) {
  part(g, limb([-24, 14], [-48, -6], 22, 14), c.skin, { sd: 3 }); part(g, [[-50, -2], [-60, 36], [-36, 38], [-30, 16]], c.skin, { sd: 2 });
  part(g, [[-44, 30], [-48, 0], [-30, -26], [0, -34], [30, -28], [50, -8], [54, 18], [36, 32], [-6, 36]], c.skin, { sd: 6 });
  glow(g, 34, 20, 18 * sac, c.accent, 0.8);
  part(g, [[22, 12], [42, 6], [52, 22], [36, 34], [20, 28]], pal(mix(c.accent, '#ffffff', 0.25), { rim: null }), { sd: 2, lw: 1.4 }); // throat sac
  part(g, [[20, 0], [56, 0], [52, 8], [24, 8]], pal('#12060c', { rim: null }), { sd: 1, lw: 1.2 });
  part(g, [[10, -30], [16, -48], [30, -50], [34, -30]], c.skin, { sd: 2 }); part(g, [[30, -26], [40, -44], [52, -38], [52, -18]], c.skin, { sd: 2 });
  eye(g, 24, -40, 4.5, c.eye); eye(g, 44, -30, 4, c.eye);
  for (const [x, y] of [[-20, -14], [-4, -22], [-30, 4]]) glow(g, x, y, 8, c.accent, 0.7);
}

// Babi Batu: an armoured boar, stone plates down its back, curved tusks, low charging stance
export function boar(g, c) {
  part(g, limb([-30, 12], [-36, 42], 14, 9), c.dark, { sd: 2 }); part(g, limb([18, 12], [22, 42], 14, 9), c.dark, { sd: 2 });
  part(g, [[-60, 10], [-56, -14], [-30, -30], [10, -34], [40, -22], [52, 0], [44, 20], [-40, 22]], c.skin, { sd: 6 });
  for (const [x, y, len, a] of [[-44, -18, 18, -2.1], [-26, -28, 22, -1.9], [-6, -32, 22, -1.7], [14, -30, 18, -1.5]]) part(g, blade(x, y, len, a, 8), c.dark, { sd: 2, lw: 1.4 });
  part(g, [[40, -20], [62, -10], [66, 6], [50, 14], [42, 2]], c.skin, { sd: 3 });                                             // snout
  part(g, [[54, 6], [70, -8], [72, -20], [62, -2]], pal('#efe6d2', { rim: null }), { sd: 1, lw: 1.3 });                         // tusk
  eye(g, 46, -10, 3.5, c.eye);
  part(g, limb([-40, 14], [-46, 44], 15, 10), c.skin, { sd: 2 }); part(g, limb([26, 12], [32, 44], 15, 10), c.skin, { sd: 2 });
}

// Serigala Bayang: a lean wolf of shadow, spiked ruff, a tail trailing into smoke
export function wolf(g, c) {
  part(g, limb([-28, 8], [-36, 40], 9, 6), c.dark, { sd: 2 }); part(g, limb([18, 8], [14, 40], 9, 6), c.dark, { sd: 2 });
  part(g, [[-50, -4], [-70, -20], [-62, -2], [-72, 6], [-54, 6]], c.dark, { sd: 2 });                                         // smoky tail
  part(g, [[-52, 4], [-46, -14], [-16, -22], [16, -26], [30, -14], [26, 10], [-12, 14], [-44, 14]], c.skin, { sd: 5 });
  for (const [x, y, len, a] of [[4, -24, 16, -2.0], [14, -26, 18, -1.7], [24, -22, 14, -1.3]]) part(g, blade(x, y, len, a, 5), c.dark, { sd: 1, lw: 1.2 });
  part(g, [[22, -26], [40, -30], [64, -14], [62, -4], [38, -2], [24, -8]], c.skin, { sd: 3 });                                // head
  part(g, [[34, -6], [62, -8], [56, 0], [36, 0]], pal('#100810', { rim: null }), { sd: 1, lw: 1.2 });
  fangs(g, 38, 60, -7, 5, 4);
  part(g, [[26, -26], [28, -42], [36, -28]], c.skin, { sd: 1, lw: 1.2 });
  eye(g, 42, -18, 3.5, c.eye);
  part(g, limb([-34, 10], [-42, 42], 10, 7), c.skin, { sd: 2 }); part(g, limb([20, 6], [26, 42], 10, 7), c.skin, { sd: 2 });
}

// Kerkas Nasar: a bald vulture, ragged wings half open, hooked beak
export function vulture(g, c) {
  part(g, [[-6, -4], [-56, -36], [-48, -16], [-66, -4], [-38, 2], [-30, 14]], c.dark, { sd: 3 });
  part(g, [[-30, 22], [-26, -14], [10, -20], [28, -2], [20, 22], [-8, 30]], c.skin, { sd: 5 });
  part(g, [[12, -16], [20, -40], [38, -44], [42, -30], [26, -12]], pal('#c07a7a', { rim: 'rgba(255,200,110,.6)' }), { sd: 2 });
  part(g, [[36, -40], [56, -32], [48, -22], [40, -28]], pal('#d8b060', { rim: null }), { sd: 1, lw: 1.3 });
  part(g, [[4, -18], [30, -16], [22, -8], [8, -10]], pal('#e8dcc8', { rim: null }), { sd: 1, lw: 1.2 });
  eye(g, 30, -34, 3.5, c.eye, 0);
  part(g, [[-2, -4], [-48, -30], [-42, -10], [-58, 4], [-30, 6], [-20, 18]], c.skin, { sd: 3 });
  part(g, limb([-6, 26], [-10, 44], 6, 4), c.dark, { sd: 1, lw: 1.2 }); part(g, limb([8, 26], [10, 44], 6, 4), c.dark, { sd: 1, lw: 1.2 });
}

// Dukun Tengkorak: a hunched hooded shade with a horned skull for a face and a cursed staff
export function shaman(g, c) {
  part(g, limb([26, -50], [30, 44], 6, 6), pal('#4a3424', { rim: null }), { sd: 1, lw: 1.3 });                                  // staff
  glow(g, 28, -54, 16, c.accent, 0.9);
  part(g, [[20, -56], [28, -66], [36, -56], [28, -46]], pal(mix(c.accent, '#ffffff', 0.3), { rim: null }), { sd: 1, lw: 1.2 });
  part(g, [[-34, 44], [-38, 0], [-26, -30], [-6, -46], [16, -40], [24, -10], [20, 44], [8, 34], [-4, 44], [-18, 34]], c.skin, { sd: 6 }); // robe
  part(g, [[-12, -34], [-14, -50], [4, -56], [14, -44], [10, -28], [-4, -24]], pal('#e8dcc8', { rim: 'rgba(255,255,255,.6)' }), { sd: 2 }); // skull
  part(g, [[-14, -48], [-30, -62], [-18, -46]], pal('#e8dcc8', { rim: null }), { sd: 1, lw: 1.2 }); part(g, [[6, -54], [12, -70], [14, -50]], pal('#e8dcc8', { rim: null }), { sd: 1, lw: 1.2 });
  eye(g, -4, -42, 3.5, c.eye, 0); eye(g, 8, -40, 3, c.eye, 0);
  part(g, limb([10, -20], [26, -14], 10, 7), c.skin, { sd: 2 });
}

// Peri Lumut: a floating bark-bodied wisp with sharp glowing leaves for wings
export function sprite(g, c) {
  glow(g, 0, 0, 50, c.accent, 0.4);
  for (const [a, len] of [[-2.6, 44], [-2.0, 40], [-1.1, 40], [-0.5, 44]]) part(g, blade(0, -6, len, a, 12), pal(mix(c.accent, '#2e5222', 0.4), { rim: 'rgba(200,255,150,.8)' }), { sd: 2, lw: 1.3 });
  part(g, [[-14, 28], [-18, -6], [-8, -30], [8, -30], [18, -6], [14, 28], [0, 44]], c.skin, { sd: 4 });
  eye(g, -5, -10, 3.5, c.eye, 0); eye(g, 7, -10, 3.5, c.eye, 0);
  for (const [x, y] of [[-6, 10], [6, 18]]) glow(g, x, y, 6, c.accent, 0.8);
}

// Jamur Bom: a squat toadstool with a jagged cap, a lit fuse on top and furious eyes
export function shroom(g, c) {
  part(g, [[-18, 42], [-22, 4], [22, 4], [18, 42]], pal('#d8c8a8', { rim: 'rgba(255,200,140,.6)' }), { sd: 3 });
  eye(g, -6, 20, 4, c.eye, 0); eye(g, 10, 20, 4, c.eye, 0);
  part(g, [[-50, 12], [-46, -18], [-26, -40], [0, -48], [26, -40], [46, -18], [50, 12], [30, 4], [14, 12], [0, 4], [-14, 12], [-30, 4]], c.skin, { sd: 6 });
  for (const [x, y, sz] of [[-24, -18, 8], [4, -32, 7], [26, -14, 8]]) part(g, [[x - sz, y], [x, y - sz * 0.8], [x + sz, y], [x, y + sz * 0.8]], pal('#f0d8c8', { rim: null }), { sd: 1, lw: 1.1 });
  g.beginPath(); g.moveTo(0, -48); g.lineTo(8, -60); g.lineTo(4, -66); g.lineWidth = 2.5; g.strokeStyle = '#3a2a22'; g.stroke();
  glow(g, 4, -66, 12, c.accent, 1); glow(g, 4, -66, 4, '#fff2b0', 1);
}

// Penjaga Sarkofagus (plan "Bos Berkesan" B): an upright gilded coffin, a pharaoh's mask, a glowing seal
export function sarcophagus(g, c) {
  glow(g, 0, -6, 46, c.accent, 0.4);
  part(g, [[-26, 46], [-30, -10], [-24, -40], [-12, -54], [12, -54], [24, -40], [30, -10], [26, 46]], c.skin, { sd: 5 });            // the lid
  for (const y of [-16, 8, 28]) part(g, [[-28, y], [28, y], [27, y + 6], [-27, y + 6]], pal('#e8c070', { rim: null }), { sd: 1, lw: 1 }); // gold bands
  part(g, [[-14, -48], [14, -48], [16, -30], [8, -20], [-8, -20], [-16, -30]], pal('#f2d38a', { rim: 'rgba(255,230,160,.8)' }), { sd: 2, lw: 1.2 }); // the mask
  part(g, [[-20, -50], [-14, -48], [-16, -30], [-24, -26]], pal('#2a4a8a', { rim: null }), { sd: 1, lw: 1 });
  part(g, [[20, -50], [14, -48], [16, -30], [24, -26]], pal('#2a4a8a', { rim: null }), { sd: 1, lw: 1 });
  eye(g, -6, -38, 3, c.eye, 0); eye(g, 6, -38, 3, c.eye, 0);
  glow(g, 0, 0, 14, c.accent, 1); glow(g, 0, 0, 5, '#fff2b0', 1);                                                                 // the seal
}

// Kura Baja: an armoured turtle-beetle behind a riveted plate shell
export function shellback(g, c) {
  part(g, limb([-28, 14], [-34, 40], 12, 9), c.dark, { sd: 2 }); part(g, limb([16, 14], [20, 40], 12, 9), c.dark, { sd: 2 });
  part(g, [[30, -10], [52, -16], [60, 0], [48, 12], [30, 10]], c.dark, { sd: 2 });                                            // head
  eye(g, 48, -4, 3.5, c.eye);
  part(g, [[-56, 18], [-58, -8], [-40, -34], [-6, -46], [26, -36], [40, -10], [36, 18]], c.skin, { sd: 6 });                  // shell
  for (const l of [[[-40, -20], [-10, -36], [22, -24]], [[-46, 4], [-8, -10], [34, 0]]]) { g.beginPath(); l.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = 1.6; g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke(); }
  for (const [x, y] of [[-30, -10], [-6, -22], [16, -12], [-18, 8], [10, 10]]) { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); }
  part(g, limb([-36, 18], [-42, 42], 13, 9), c.skin, { sd: 2 }); part(g, limb([22, 16], [28, 42], 13, 9), c.skin, { sd: 2 });
}

// Yeti: a hulking shaggy beast, jagged fur, small horns, frost breath glow in its maw
export function yeti(g, c) {
  part(g, limb([-24, 20], [-28, 44], 18, 14), c.dark, { sd: 2 }); part(g, limb([14, 20], [18, 44], 18, 14), c.dark, { sd: 2 });
  part(g, [[-46, 26], [-56, 0], [-48, -30], [-20, -50], [14, -50], [38, -30], [46, 0], [38, 26], [20, 34], [0, 26], [-20, 34]], c.skin, { sd: 7 });
  for (const [x, y, len, a] of [[-44, -14, 14, -2.6], [-34, -36, 14, -2.2], [-10, -50, 14, -1.7], [16, -48, 12, -1.3], [36, -30, 12, -0.8]]) part(g, blade(x, y, len, a, 6), c.skin, { sd: 1, lw: 1.2 });
  part(g, [[0, -38], [-6, -54], [4, -44]], pal('#d8c8a8', { rim: null }), { sd: 1, lw: 1.1 }); part(g, [[22, -38], [26, -56], [30, -40]], pal('#d8c8a8', { rim: null }), { sd: 1, lw: 1.1 });
  part(g, [[8, -18], [36, -20], [32, -2], [12, 0]], pal('#16304a', { rim: null }), { sd: 1, lw: 1.3 });
  glow(g, 22, -10, 12, c.accent, 0.7); fangs(g, 10, 34, -19, 5, 5);
  eye(g, 12, -30, 3.5, c.eye); eye(g, 28, -30, 3.5, c.eye);
  part(g, limb([30, -10], [52, 16], 16, 12), c.skin, { sd: 3 });
  part(g, [[46, 10], [64, 14], [60, 30], [44, 28]], c.skin, { sd: 2 });
}

// Roh Es: a floating diamond of frost with a ring of orbiting shards
export function frostwisp(g, c) {
  glow(g, 0, 0, 56, c.accent, 0.5);
  part(g, [[0, -46], [24, -6], [14, 30], [0, 44], [-14, 30], [-24, -6]], c.skin, { sd: 4 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, x = Math.cos(a) * 46, y = Math.sin(a) * 26; part(g, [[x, y - 10], [x + 5, y], [x, y + 10], [x - 5, y]], pal('#dff2ff', { rim: 'rgba(255,255,255,.9)', hi: '#ffffff' }), { sd: 1, lw: 1.1 }); }
  eye(g, -6, -8, 3.5, c.eye, 0); eye(g, 7, -8, 3.5, c.eye, 0);
}

// Kalajengking: a black-red scorpion, pincers forward, a venom-glowing stinger arched high
export function scorpion(g, c) {
  for (const x of [-30, -16, -2, 12]) part(g, limb([x, 10], [x - 10, 36], 5, 3), c.dark, { sd: 1, lw: 1.2 });
  part(g, [[-40, 16], [-42, -4], [-20, -14], [20, -14], [36, -2], [30, 16]], c.skin, { sd: 4 });
  part(g, limb([-36, -2], [-54, -24], 14, 11), c.skin, { sd: 2 }); part(g, limb([-54, -24], [-50, -50], 11, 9), c.skin, { sd: 2 });
  part(g, limb([-50, -50], [-26, -62], 9, 7), c.skin, { sd: 2 });
  part(g, [[-28, -66], [-10, -64], [-18, -54], [-26, -56]], pal(mix(c.accent, '#ffffff', 0.2), { rim: null }), { sd: 1, lw: 1.2 });
  glow(g, -16, -60, 12, c.accent, 0.9);
  part(g, [[30, -4], [54, -18], [64, -8], [52, -2], [64, 6], [52, 12], [32, 8]], c.skin, { sd: 2 });                           // pincer
  eye(g, 26, -6, 3, c.eye); eye(g, 18, -8, 2.5, c.eye);
}

// Cacing Pasir: a segmented worm rearing out of the sand, a ring of fangs for a mouth
export function sandworm(g, c) {
  part(g, [[-58, 44], [-40, 30], [40, 30], [58, 44]], pal('#a07a44', { rim: 'rgba(255,200,110,.6)' }), { sd: 2 });
  for (let i = 0; i < 4; i++) { const y = 30 - i * 18, w = 26 - i * 2; part(g, [[-w, y], [-w + 2, y - 18], [w - 2, y - 18], [w, y]], i % 2 ? c.skin : c.dark, { sd: 2, lw: 1.4 }); }
  part(g, [[-24, -40], [-28, -60], [0, -68], [28, -60], [24, -40]], c.skin, { sd: 3 });
  part(g, [[-16, -50], [0, -62], [16, -50], [0, -40]], pal('#2a0a08', { rim: null }), { sd: 1, lw: 1.2 });
  fangs(g, -14, 14, -52, 6, 6); glow(g, 0, -50, 10, c.accent, 0.6);
}

// Imp Api: a small horned devil, bat wings, forked tail, a fireball cupped in its claw
export function imp(g, c) {
  part(g, [[-6, -10], [-46, -40], [-40, -18], [-54, -8], [-30, -2]], c.dark, { sd: 2 });
  part(g, [[-14, 6], [-46, 22], [-56, 14], [-50, 30], [-42, 24]], c.dark, { sd: 1, lw: 1.2 });                                 // tail
  part(g, [[-16, 36], [-20, 0], [-10, -20], [12, -22], [22, 0], [16, 36]], c.skin, { sd: 4 });
  part(g, [[-8, -18], [-12, -40], [6, -46], [18, -34], [14, -18]], c.skin, { sd: 2 });
  part(g, [[-8, -40], [-18, -56], [-2, -44]], pal('#2a1416', { rim: null }), { sd: 1, lw: 1.1 }); part(g, [[8, -44], [14, -60], [16, -40]], pal('#2a1416', { rim: null }), { sd: 1, lw: 1.1 });
  eye(g, 2, -32, 3.5, c.eye); eye(g, 12, -30, 3, c.eye);
  part(g, limb([14, -6], [30, -10], 8, 6), c.skin, { sd: 2 });
  glow(g, 38, -12, 14, c.accent, 1); glow(g, 38, -12, 5, '#fff2b0', 1);
  part(g, [[6, -6], [40, -36], [34, -16], [48, -6], [22, 2]], c.skin, { sd: 2 });
}

// Salamander: a long fire lizard, a ridge of flame spines down its back
export function salamander(g, c) {
  part(g, [[-40, 6], [-70, -6], [-60, 6], [-70, 16], [-40, 16]], c.dark, { sd: 2 });                                         // tail
  for (const [x, k] of [[-26, -1], [16, 1]]) part(g, limb([x, 10], [x + k * 8 - 4, 34], 9, 6), c.dark, { sd: 1, lw: 1.3 });
  part(g, [[-44, 14], [-40, -6], [-10, -16], [24, -16], [46, -8], [62, -2], [58, 8], [30, 14], [-10, 18]], c.skin, { sd: 4 });
  for (let i = 0; i < 5; i++) { const x = -34 + i * 14; part(g, blade(x, -12, 14 + (i % 2) * 4, -1.7, 5), pal(mix(c.accent, '#ffffff', 0.2), { rim: null }), { sd: 1, lw: 1.1 }); glow(g, x, -20, 8, c.accent, 0.6); }
  eye(g, 48, -6, 3, c.eye);
  for (const [x, k] of [[-32, -1], [24, 1]]) part(g, limb([x, 12], [x + k * 8, 36], 10, 6), c.skin, { sd: 1, lw: 1.3 });
}

// Hantu Gerhana: a hooded shade with a cracked mask, long claws and a tail of mist
export function wraith(g, c) {
  glow(g, 0, 0, 52, c.accent, 0.35);
  part(g, [[-22, -40], [0, -54], [22, -40], [28, -6], [20, 22], [30, 46], [10, 32], [0, 52], [-10, 32], [-30, 46], [-20, 22], [-28, -6]], c.skin, { sd: 5 });
  part(g, [[-12, -38], [10, -40], [14, -22], [0, -12], [-12, -22]], pal('#e8dcff', { rim: null }), { sd: 2, lw: 1.3 });        // mask
  g.strokeStyle = 'rgba(40,20,60,.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(2, -40); g.lineTo(-2, -28); g.lineTo(4, -18); g.stroke();
  eye(g, -6, -28, 3, c.eye, 0); eye(g, 6, -28, 3, c.eye, 0);
  for (const s of [-1, 1]) part(g, [[s * 22, -10], [s * 46, 0], [s * 56, 16], [s * 40, 8], [s * 28, 6]], c.dark, { sd: 1, lw: 1.3 });
}

const RIM = { toxic: 'rgba(150,255,110,.8)', ice: 'rgba(150,225,255,.9)', sand: 'rgba(255,200,110,.8)', fire: 'rgba(255,130,60,.9)', void: 'rgba(190,130,255,.9)', stone: 'rgba(255,160,90,.75)', shadow: 'rgba(190,120,255,.8)' };
const C = (skin, rim, accent, eyeC = accent) => T(skin, RIM[rim], accent, eyeC);
// every older enemy, by type: [draw, colours, extra args]
const SET = {
  slink: [ooze, C('#6a2c88', 'toxic', '#b8ff6a')], mini: [ooze, C('#7a3a98', 'toxic', '#b8ff6a'), 0.85],
  frostslink: [ooze, C('#4a7aa8', 'ice', '#d8f4ff')], sandslink: [ooze, C('#9a6a34', 'sand', '#ffd27a')],
  magmaslink: [ooze, C('#3a1e1e', 'fire', '#ff8a3c')], voidslink: [ooze, C('#241a40', 'void', '#c79bff')],
  dart: [bat, C('#4a1e2e', 'shadow', '#ff4a5a')], voiddart: [bat, C('#22183a', 'void', '#d8b8ff')], vulture: [vulture, C('#4a3220', 'sand', '#ffcf5a')],
  tank: [golem, C('#57525e', 'stone', '#ff9a3a')], frosttank: [golem, C('#6a8aa8', 'ice', '#7fd8ff')], voidtank: [golem, C('#2a2238', 'void', '#b98aff')],
  spitter: [toad, C('#3d6428', 'toxic', '#a8ff5a', '#c8ff6a')], frostspitter: [toad, C('#7aa0c0', 'ice', '#bfe8ff')], voidspitter: [toad, C('#2e2248', 'void', '#c79bff')],
  charger: [boar, C('#4a3630', 'stone', '#ff5a3a')], wolf: [wolf, C('#2e2a40', 'ice', '#9fe8ff')],
  summoner: [shaman, C('#3a2a4a', 'shadow', '#c26bd8', '#ff5a8a')], healer: [sprite, C('#5a4028', 'toxic', '#9dff6a')],
  bomber: [shroom, C('#8a1a26', 'fire', '#ffb347')], emberbomber: [shroom, C('#3a1a14', 'fire', '#ff7a2a')],
  shielder: [shellback, C('#4a5a6a', 'stone', '#ff9a3a', '#ffcf5a')], yeti: [yeti, C('#c8d8e8', 'ice', '#7fd8ff', '#3a8ad8')],
  icewisp: [frostwisp, C('#6ab8e8', 'ice', '#7fd8ff', '#ffffff')], scorpion: [scorpion, C('#3a1a1e', 'fire', '#9dff6a', '#ff5a3a')],
  sandworm: [sandworm, C('#8a6a3a', 'sand', '#ff8a3c')], imp: [imp, C('#8a2a22', 'fire', '#ff7a2a', '#ffd25a')],
  salamander: [salamander, C('#5a1e14', 'fire', '#ff8a3c', '#ffd25a')], wraith: [wraith, C('#2a1e40', 'void', '#c79bff', '#e8d8ff')],
  tombguard: [sarcophagus, C('#5a3a1e', 'sand', '#ffcf5a', '#ffe08a')], // Penjaga Sarkofagus (plan "Bos Berkesan")
  mawshade: [wraith, C('#1a0e26', 'shadow', '#c26bd8', '#ff5f9e')], // Bayang Maw (plan "Bos Berkesan")
};
export const BEAST_ART = Object.fromEntries(Object.entries(SET).map(([id, [f, c, k]]) => [id, (g) => (k ? f(g, c, k) : f(g, c))]));
