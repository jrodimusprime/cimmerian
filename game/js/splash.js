'use strict';
// ---------------------------------------------------------------------------
// Story splash screens (README §12). The title card is a public-domain plate
// (John Martin's Pandemonium, via tools/splashgen.sh; story/credits.json).
// Level splashes are painted here: a tonal Piranesi-style scene, engraved with
// anti-aliased hatching, with one scarlet accent.
// ---------------------------------------------------------------------------

const SPLASHES = {
  e1m2: {
    title: 'THE PITS', scene: 'serpent', seed: 7,
    accent: [[0.6, 0.05, 0.13]],                                  // (u, v, radius): the citadel's glow; the painter adds her eye
    text: 'Beaten on the plain of Shamu and struck down by the wizard\'s poisoned ring, the king was carried in chains to Khorshemish. Before the kings who betrayed him he spat his defiance. Now Tsotha-lanti has given him to the dark beneath the Scarlet Citadel, where something vast moves in the tunnels.',
  },
  e1m3: {
    title: 'THE TUNNELS BELOW', scene: 'descent', seed: 19,
    accent: [],                                                   // the painter adds the torch
    text: 'Back in the dark, and the dark is real. The grille is bolted from outside, Shukeli lies dead against it, and the only way left is down, into the pits beneath the Scarlet Citadel. Somewhere in the tunnels a woman is weeping.',
  },
};
SPLASHES.e1m4 = {
  title: 'YOTHGA', scene: 'descent', seed: 31, accent: [],
  text: 'At the end of the main corridor a cage of bars stands in the dark, and in it a garden that should not be: a pale stem, livid blossoms, tendrils that rear like cobras. In their grip hangs a man who is very old, or something wearing one. The flower is drinking his soul.',
};
SPLASHES.e1m1 = {
  title: 'THE PLAIN OF SHAMU', scene: 'battle', seed: 11, accent: [[0.5, 0.18, 0.09]],
  text: 'How did the king come to lie in chains beneath the Scarlet Citadel? Remember. Remember the plain of Shamu: Amalrus of Ophir\'s betrayal, five thousand Aquilonian knights riding into a trap, and the sun going down red on the last of them.',
};
SPLASHES.title = { image: 'art/title.jpg', credit: 'John Martin, <i>Pandemonium</i>, 1841' };
new Image().src = SPLASHES.title.image;
const INK = [11, 10, 9], BONE_C = [232, 220, 192], SCARLET = [196, 48, 43];

// ---- 1. the tonal drawing (Canvas 2D, grey = light) -------------------------
function paintTone(c, W, H, sp) {
  const k = H / 640, r = new RNG(sp.seed), g = v => { v = clamp(Math.round(v), 0, 255); return 'rgb(' + v + ',' + v + ',' + v + ')'; };
  const poly = (pts, fill) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); c.fillStyle = fill; c.fill(); };
  const lin = (x0, y0, x1, y1, a, b) => { const gr = c.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, g(a)); gr.addColorStop(1, g(b)); return gr; };
  const line = (x0, y0, x1, y1, v, w = 1.5, alpha = 1) => { c.globalAlpha = alpha; c.strokeStyle = g(v); c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.globalAlpha = 1; };
  const lit = sp.scene === 'serpent' ? 1 : 0.55;
  const VP = { x: W * (0.55 + r.range(-0.03, 0.03)), y: H * 0.36 };
  const far = { l: VP.x - W * 0.07, r: VP.x + W * 0.07, t: VP.y - H * 0.14, b: VP.y + H * 0.1 };

  // far light, walls, floor and vault of the great corridor
  c.fillStyle = g(30); c.fillRect(0, 0, W, H);
  const rg = c.createRadialGradient(VP.x, VP.y, 0, VP.x, VP.y, W * 0.5);
  rg.addColorStop(0, g(255 * lit)); rg.addColorStop(0.3, g(200 * lit)); rg.addColorStop(1, g(50));
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  poly([[0, 0], [far.l, far.t], [far.l, far.b], [0, H]], lin(0, 0, far.l, 0, 60, 185 * lit));
  poly([[W, 0], [far.r, far.t], [far.r, far.b], [W, H]], lin(W, 0, far.r, 0, 40, 150 * lit));
  poly([[0, H], [far.l, far.b], [far.r, far.b], [W, H]], lin(0, H, 0, far.b, 95, 215 * lit));
  poly([[0, 0], [far.l, far.t], [far.r, far.t], [W, 0]], lin(0, 0, 0, far.t, 20, 120 * lit));
  for (let i = 0; i <= 18; i++) {                       // masonry courses and floor joints converge on the vanishing point
    const t = i / 18;
    line(0, t * H, far.l, far.t + (far.b - far.t) * t, 35, 1.6, 0.55);
    line(W, t * H, far.r, far.t + (far.b - far.t) * t, 25, 1.6, 0.55);
    line(t * W, H, far.l + (far.r - far.l) * t, far.b, 45, 1.4, 0.45);
  }
  for (let k = 1; k < 14; k++) {
    const q = Math.pow(k / 14, 2.2), y = far.b + (H - far.b) * q;
    line(far.l * (1 - q), y, far.r + (W - far.r) * q, y, 40, 1.4, 0.45);
  }
  // light shafts slanting down from a high grating
  c.globalAlpha = 0.16 * lit;
  for (let k = 0; k < 3; k++) {
    const x0 = W * (0.62 + k * 0.06);
    poly([[x0, 0], [x0 + W * 0.035, 0], [x0 - W * 0.12 + W * 0.05, H], [x0 - W * 0.2, H]], g(255));
  }
  c.globalAlpha = 1;

  // receding arches, far to near, each with pillars, archivolt, voussoirs and keystone
  for (let k = 6; k >= 0; k--) {
    const s = Math.pow(0.66, k), cx = VP.x + r.range(-1, 1) * W * 0.008 * s;
    const ow = W * (0.055 + 0.29 * s), pw = ow * 0.3, band = ow * 0.17;
    const floorY = far.b + (H * 1.02 - far.b) * s, apexY = far.t + (H * 0.04 - far.t) * s, springY = apexY + ow;
    const top = Math.min(apexY - band - ow * 0.5, 0), tone = 50 + 120 * (1 - s) * lit;
    c.beginPath();
    c.rect(cx - ow - pw, top, 2 * (ow + pw), floorY - top);
    c.moveTo(cx - ow, floorY); c.lineTo(cx - ow, springY); c.arc(cx, springY, ow, Math.PI, 0); c.lineTo(cx + ow, floorY); c.closePath();
    c.fillStyle = lin(cx - ow - pw, 0, cx + ow + pw, 0, tone + 25, tone - 15); c.fill('evenodd');
    const rev = ow * 0.1;                                   // lit reveal on the left, shadowed on the right, soffit under the arch
    poly([[cx - ow, floorY], [cx - ow, springY], [cx - ow + rev, springY + rev * 0.3], [cx - ow + rev, floorY - rev * 0.2]], g(tone + 60));
    poly([[cx + ow, floorY], [cx + ow, springY], [cx + ow - rev, springY + rev * 0.3], [cx + ow - rev, floorY - rev * 0.2]], g(tone - 30));
    c.beginPath(); c.arc(cx, springY + rev * 0.3, ow, Math.PI, 0); c.arc(cx, springY + rev * 0.3, ow - rev, 0, Math.PI, true); c.closePath(); c.fillStyle = g(tone - 15); c.fill();
    for (let a = 0; a <= 20; a++) {                         // voussoirs
      const ang = Math.PI + a / 20 * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang);
      line(cx + ca * ow, springY + sa * ow, cx + ca * (ow + band), springY + sa * (ow + band), tone - 45, Math.max(1, 2 * s));
    }
    c.beginPath(); c.arc(cx, springY, ow + band, Math.PI, 0); c.strokeStyle = g(tone - 50); c.lineWidth = Math.max(1, 3 * s); c.stroke();
    poly([[cx - band * 0.35, apexY - band * 1.15], [cx + band * 0.35, apexY - band * 1.15], [cx + band * 0.22, apexY + 2], [cx - band * 0.22, apexY + 2]], g(tone + 45));
    for (let y = springY; y < floorY; y += ow * 0.13) {      // pillar courses
      line(cx - ow - pw, y, cx - ow, y, tone - 40, Math.max(1, 1.6 * s));
      line(cx + ow, y, cx + ow + pw, y, tone - 40, Math.max(1, 1.6 * s));
    }
    for (let n = 0; n < 6; n++) {                            // weathering
      const x = cx + (r.chance(0.5) ? -1 : 1) * (ow + r.range(0, pw)), y = r.range(top + 10, floorY);
      line(x, y, x + r.range(-8, 8) * s, y + r.range(6, 30) * s, tone - 60, 1.2, 0.7);
    }
    if (k === 2) {                                           // a bridge across the third arch, with two tiny figures
      const by = springY - ow * 0.15;
      poly([[cx - ow - pw, by], [cx + ow + pw, by], [cx + ow + pw, by + ow * 0.12], [cx - ow - pw, by + ow * 0.12]], g(tone + 30));
      poly([[cx - ow - pw, by + ow * 0.12], [cx + ow + pw, by + ow * 0.12], [cx + ow + pw, by + ow * 0.2], [cx - ow - pw, by + ow * 0.2]], g(tone - 40));
      for (let x = cx - ow - pw; x < cx + ow + pw; x += ow * 0.07) line(x, by, x, by - ow * 0.1, tone - 20, 2);
      line(cx - ow - pw, by - ow * 0.1, cx + ow + pw, by - ow * 0.1, tone + 40, 3);
      for (const fx of [cx - ow * 0.3, cx + ow * 0.12]) {
        c.fillStyle = g(15); c.beginPath(); c.ellipse(fx, by - ow * 0.2, ow * 0.022, ow * 0.025, 0, 0, Math.PI * 2); c.fill();
        poly([[fx - ow * 0.03, by], [fx + ow * 0.03, by], [fx + ow * 0.02, by - ow * 0.17], [fx - ow * 0.02, by - ow * 0.17]], g(15));
      }
    }
    if (k === 1) {                                           // a stair climbing across the foreground arch
      const N = 16, ax = W * 0.98, ay = H * 1.0, bx = W * 0.6, byy = H * 0.5;
      for (let i = 0; i < N; i++) {
        const t = i / N, x = ax + (bx - ax) * t, y = ay + (byy - ay) * t, sw = W * (0.17 - 0.08 * t), st = (ay - byy) / N, run = (ax - bx) / N;
        poly([[x - run, y - st], [x - run + sw, y - st - sw * 0.12], [x + sw, y - sw * 0.12], [x, y]], g(200 * lit + 20));
        poly([[x - run, y - st], [x, y], [x, y + st * 0.9], [x - run, y + st * 0.1]], g(70));
      }
      poly([[ax, ay], [bx, byy], [bx, byy + H * 0.06], [ax, ay + H * 0.3]], lin(ax, ay, bx, byy, 25, 60));
      for (let i = 0; i <= N; i += 2) { const t = i / N; line(ax + (bx - ax) * t, ay + (byy - ay) * t, ax + (bx - ax) * t, ay + (byy - ay) * t - H * 0.07, 30, 3); }
      line(ax, ay - H * 0.07, bx, byy - H * 0.07, 210, 4);
    }
  }
  // hanging chains, link by link
  for (let n = 0; n < 4; n++) {
    const x0 = r.range(0.06, 0.94) * W, x1 = x0 + r.range(-0.2, 0.2) * W, sag = r.range(0.25, 0.6) * H, len = r.range(0.25, 0.45);
    for (let t = 0; t <= 1; t += 0.018) {
      const x = x0 + (x1 - x0) * t * len, y = Math.sin(t * Math.PI * 0.5) * sag;
      c.strokeStyle = g(15); c.lineWidth = 3; c.beginPath();
      if (Math.round(t / 0.018) % 2) c.ellipse(x, y, 4, 8, 0.1, 0, Math.PI * 2); else { c.moveTo(x, y - 7); c.lineTo(x, y + 7); }
      c.stroke();
    }
  }
  return sp.scene === 'serpent' ? paintSerpent(c, W, H, g, poly, k) : paintTorchbearer(c, W, H, g, poly, k);
}
function paintSerpent(c, W, H, g, poly, k) {
  // Satha rising out of her well in the left foreground
  const wx = W * 0.19, wy = H * 0.8;
  c.fillStyle = g(150); c.beginPath(); c.ellipse(wx, wy, W * 0.16, H * 0.085, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = g(4); c.beginPath(); c.ellipse(wx, wy + 4, W * 0.135, H * 0.065, 0, 0, Math.PI * 2); c.fill();
  for (let a = 0; a < 18; a++) {                     // rim stones
    const ang = a / 18 * Math.PI * 2;
    c.strokeStyle = g(60); c.lineWidth = 2; c.beginPath();
    c.moveTo(wx + Math.cos(ang) * W * 0.135, wy + Math.sin(ang) * H * 0.065); c.lineTo(wx + Math.cos(ang) * W * 0.16, wy + Math.sin(ang) * H * 0.085); c.stroke();
  }
  const P = [[wx, wy + 10 * k], [W * 0.12, H * 0.42], [W * 0.44, H * 0.56], [W * 0.38, H * 0.27]];
  const body = (w, v, alpha = 1, dx = 0, dy = 0, dash = null, off = 0) => {
    c.save(); c.translate(dx * k, dy * k); c.globalAlpha = alpha; c.lineCap = 'round'; c.lineWidth = w * k; c.strokeStyle = g(v);
    if (dash) { c.setLineDash(dash.map(v => v * k)); c.lineDashOffset = off * k; }
    c.beginPath(); c.moveTo(P[0][0], P[0][1]); c.bezierCurveTo(P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]); c.stroke(); c.restore();
  };
  body(118, 12);                                     // silhouette
  body(100, 95);                                     // body
  body(56, 170, 0.85, -10, -12);                     // light along the back
  body(96, 45, 0.75, 0, 0, [3, 8]);                  // scale rows
  body(70, 25, 0.6, -4, -4, [2, 11], 5);
  body(26, 205, 0.7, 14, 18, [12, 4]);               // belly scutes
  // head, turned up and toward the light, jaws parted
  const ang = Math.atan2(P[3][1] - P[2][1], P[3][0] - P[2][0]) + 0.9;
  c.save(); c.translate(P[3][0], P[3][1]); c.rotate(ang); c.scale(k, k);
  poly([[-40, -58], [40, -60], [130, -32], [178, -8], [170, 6], [100, 4], [20, 30], [-40, 52]], g(14));        // outline
  poly([[-34, -52], [40, -54], [126, -28], [168, -6], [104, -2], [24, 18], [-34, 44]], g(115));
  poly([[-30, -50], [40, -52], [120, -27], [150, -16], [60, -22], [0, -30]], g(185));                          // crown highlight
  poly([[20, 24], [104, 2], [168, 6], [150, 30], [90, 40], [10, 52]], g(70));                                   // lower jaw, parted
  poly([[40, 14], [160, 2], [150, 22], [60, 34]], g(8));                                                        // mouth
  poly([[128, 0], [138, 0], [131, 26]], g(240)); poly([[96, 4], [104, 4], [99, 24]], g(240));                  // fangs
  c.fillStyle = g(250); c.beginPath(); c.ellipse(78, -26, 13, 9, -0.2, 0, Math.PI * 2); c.fill();              // eye
  c.fillStyle = g(5); c.beginPath(); c.ellipse(80, -26, 2.5, 8, -0.2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = g(40); c.lineWidth = 2;
  for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(10 + i * 14, -40 + i * 2.4, 7, Math.PI * 0.1, Math.PI * 0.9); c.stroke(); }
  c.restore();
  const ex = P[3][0] + (Math.cos(ang) * 78 + Math.sin(ang) * 26) * k, ey = P[3][1] + (Math.sin(ang) * 78 - Math.cos(ang) * 26) * k;
  return [[ex / W, ey / H, 0.035]];                  // the scarlet accent sits on her eye
}
function paintTorchbearer(c, W, H, g, poly, k) {
  // the king, small against the dark, climbing with a torch
  const fx = W * 0.3, fy = H * 0.62;
  c.save(); c.translate(fx, fy); c.scale(k, k);
  const tg = c.createRadialGradient(36, -150, 0, 36, -150, 260);
  tg.addColorStop(0, 'rgba(255,255,255,0.95)'); tg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = tg; c.fillRect(-300, -420, 600, 600);
  const ink = g(8);
  // a broad-shouldered man in a ragged cloak, one foot on the next step, torch raised
  poly([[-26, -96], [26, -98], [34, -84], [22, -40], [24, -6], [-24, -6], [-20, -40], [-34, -82]], ink);        // torso
  poly([[-30, -90], [-52, -60], [-60, 10], [-38, 14], [-26, -30]], ink);                                    // cloak
  poly([[-20, -8], [-6, -8], [-10, 40], [-4, 78], [-20, 80], [-26, 40]], ink);                               // standing leg
  poly([[4, -8], [22, -8], [38, 22], [44, 46], [30, 50], [22, 26], [6, 10]], ink);                           // stepping leg
  poly([[44, 44], [62, 44], [62, 52], [30, 52]], ink);                                                       // foot on the step
  c.beginPath(); c.ellipse(0, -112, 13, 15, 0.1, 0, Math.PI * 2); c.fillStyle = ink; c.fill();               // head
  poly([[-10, -124], [14, -128], [20, -112], [10, -118], [-12, -108]], ink);                                 // mane
  poly([[20, -92], [30, -98], [52, -148], [44, -154]], ink);                                                 // raised arm
  poly([[44, -150], [50, -152], [62, -190], [57, -192]], g(30));                                             // torch
  c.fillStyle = g(255); c.beginPath(); c.ellipse(60, -202, 8, 15, 0.3, 0, Math.PI * 2); c.fill();             // flame
  poly([[-22, -84], [-30, -50], [-26, -30], [-20, -52]], ink);                                               // other arm
  poly([[-24, -36], [-20, -40], [-58, 30], [-62, 26]], g(40));                                               // sword at his hip
  c.restore();
  poly([[0, H * 0.72], [W * 0.5, H * 0.66], [W * 0.5, H], [0, H]], g(20));                   // the drop into the dark
  return [[(fx + 60 * k) / W, (fy - 202 * k) / H, 0.04]];
}

// The plain of Shamu at sunset: a red sky, a low sun, spear-ranks on the ridge, and on a heap
// of dead horses and men a lone figure in black mail with his sword up.
function paintBattle(c, W, H, sp) {
  const k = H / 640, r = new RNG(sp.seed), g = v => { v = clamp(Math.round(v), 0, 255); return 'rgb(' + v + ',' + v + ',' + v + ')'; };
  const poly = (pts, fill) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); c.fillStyle = fill; c.fill(); };
  const sky = c.createLinearGradient(0, 0, 0, H * 0.62); sky.addColorStop(0, g(40)); sky.addColorStop(0.7, g(200)); sky.addColorStop(1, g(245));
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  c.fillStyle = g(255); c.beginPath(); c.arc(W * 0.5, H * 0.58, H * 0.08, Math.PI, 0); c.fill();                     // the sun on the horizon
  for (let b = 0; b < 10; b++) { c.globalAlpha = 0.45; c.fillStyle = g(r.range(30, 110)); c.beginPath(); c.ellipse(r.range(0, W), r.range(0.05, 0.4) * H, r.range(0.15, 0.45) * W, r.range(0.012, 0.035) * H, 0, 0, Math.PI * 2); c.fill(); }
  c.globalAlpha = 1;
  poly([[0, H * 0.6], [W * 0.2, H * 0.56], [W * 0.45, H * 0.6], [W * 0.7, H * 0.55], [W, H * 0.59], [W, H], [0, H]], g(70));    // the ridge
  for (let x = 0; x < W; x += 5 * k) { const y = H * 0.565 + Math.sin(x * 0.01) * 6 * k; c.strokeStyle = g(20); c.lineWidth = 1.2 * k; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r.range(-1, 1) * k, y - r.range(18, 30) * k); c.stroke(); }   // the spears of Koth
  const fg = c.createLinearGradient(0, H * 0.6, 0, H); fg.addColorStop(0, g(110)); fg.addColorStop(1, g(30)); c.fillStyle = fg; c.fillRect(0, H * 0.62, W, H * 0.38);
  for (let i = 0; i < 40; i++) { const x = r.range(0, W), y = r.range(0.66, 0.98) * H, s = r.range(8, 22) * k * (y / H); c.fillStyle = g(15); c.beginPath(); c.ellipse(x, y, s * 1.6, s * 0.5, r.range(-0.3, 0.3), 0, Math.PI * 2); c.fill(); }   // the dead
  for (let i = 0; i < 14; i++) { const x = r.range(0, W), y = r.range(0.66, 0.95) * H; c.strokeStyle = g(10); c.lineWidth = 2 * k; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r.range(-40, 40) * k, y - r.range(30, 70) * k); c.stroke(); }   // broken lances
  const hx = W * 0.5, hy = H * 0.82;
  poly([[hx - 230 * k, hy + 40 * k], [hx - 120 * k, hy - 50 * k], [hx - 20 * k, hy - 80 * k], [hx + 90 * k, hy - 55 * k], [hx + 220 * k, hy + 40 * k]], g(12));   // the heap
  c.save(); c.translate(hx, hy - 78 * k); c.scale(k * 1.15, k * 1.15);
  const ink = g(4);
  poly([[-26, -96], [26, -98], [34, -84], [22, -40], [24, -4], [-24, -4], [-20, -40], [-34, -82]], ink);
  poly([[-22, -6], [-6, -6], [-14, 40], [-26, 78], [-40, 76], [-28, 38]], ink); poly([[6, -6], [22, -6], [30, 38], [44, 74], [30, 78], [16, 40]], ink);
  c.beginPath(); c.ellipse(0, -112, 13, 15, 0, 0, Math.PI * 2); c.fillStyle = ink; c.fill();
  poly([[-12, -124], [-28, -98], [-20, -96], [-8, -112]], ink); poly([[12, -124], [26, -98], [18, -96], [8, -112]], ink);
  poly([[20, -92], [30, -98], [56, -150], [48, -156]], ink); poly([[-22, -90], [-32, -94], [-58, -60], [-52, -54]], ink);
  poly([[46, -152], [56, -150], [96, -262], [90, -264]], g(60)); poly([[40, -152], [62, -148], [61, -142], [39, -146]], ink);   // the sword, raised
  c.restore();
  return [[hx / W, (hy - 200 * k) / H, 0.06]];
}

// ---- 2. engrave: anti-aliased hatching whose line weight carries the tone --
function paintCarceri(cv, sp) {
  const W = 1280, H = clamp(Math.round(1280 * innerHeight / Math.max(1, innerWidth)), 540, 1100);
  cv.width = W; cv.height = H;
  const tc = document.createElement('canvas'); tc.width = W; tc.height = H;
  const c = tc.getContext('2d');
  const accents = sp.accent.concat((sp.scene === 'battle' ? paintBattle(c, W, H, sp) : paintTone(c, W, H, sp)) || []);
  const src = c.getImageData(0, 0, W, H).data, N = W * H;
  let tone = new Float32Array(N);
  for (let i = 0; i < N; i++) tone[i] = src[i * 4] / 255;
  const blur = a => { const b = new Float32Array(N); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; b[i] = (a[i] * 4 + a[i - 1] + a[i + 1] + a[i - W] + a[i + W]) / 8; } return b; };
  tone = blur(blur(tone));
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
  const P1 = 5.5, P2 = 5, P3 = 4, a1 = 0.72, a2 = -0.6, c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2);
  const cover = (u, P, hw) => { const f = ((u % P) + P) % P, dist = Math.abs(f - P / 2); return clamp(hw - dist + 0.5, 0, 1); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, u = x / W, v = y / H;
    let t = tone[i] * (1 - 0.55 * ((u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5) * 1.6));
    const gx = x > 0 && x < W - 1 ? tone[i + 1] - tone[i - 1] : 0, gy = y > 0 && y < H - 1 ? tone[i + W] - tone[i - W] : 0;
    const edge = clamp((Math.hypot(gx, gy) - 0.06) * 9, 0, 1);
    const wob = (vnoise(x * 0.012, y * 0.012, sp.seed) - 0.5) * 3.5;
    let ink = cover(x * c1 + y * s1 + wob, P1, (1 - t) * P1 * 0.46);
    if (t < 0.6) ink = Math.max(ink, cover(x * c2 + y * s2 + wob * 0.7, P2, (0.6 - t) / 0.6 * P2 * 0.42));
    if (t < 0.26) ink = Math.max(ink, cover(x + wob * 0.5, P3, (0.26 - t) / 0.26 * P3 * 0.45));
    ink = Math.max(ink, edge * 0.85);
    let pr = BONE_C[0], pg = BONE_C[1], pb = BONE_C[2];
    const grain = 0.95 + 0.05 * hrand(x >> 1, y >> 1, 3, 1);
    for (const [au, av, ar] of accents) {
      const m = clamp(1.4 - Math.hypot((u - au) * W / H, v - av) / ar, 0, 1);
      if (m > 0) { pr = lerp(pr, SCARLET[0], m); pg = lerp(pg, SCARLET[1], m); pb = lerp(pb, SCARLET[2], m); }
    }
    const o = i * 4;
    d[o] = lerp(pr * grain, INK[0], ink); d[o + 1] = lerp(pg * grain, INK[1], ink); d[o + 2] = lerp(pb * grain, INK[2], ink); d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// Shows a splash; resolves when the player presses a key or clicks.
function showSplash(id, extraHtml, buttonLabel) {
  const sp = SPLASHES[id];
  overlay.classList.remove('hidden');
  overlay.className = 'splash';
  overlay.innerHTML = '<canvas id="splashArt"></canvas><div class="splashText"><div class="map">' + id.toUpperCase() + '</div><h1>' + sp.title + '</h1><p>' + sp.text + '</p>' +
    (extraHtml || '') + '<div class="go">' + (buttonLabel || 'Press any key') + '</div></div>';
  paintCarceri($('splashArt'), sp);
  return new Promise(resolve => {
    let armed = false;
    setTimeout(() => { armed = true; }, 600);
    const go = e => {
      if (!armed) return;
      if (e && e.type === 'keydown' && ['F5', 'F12', 'Meta', 'Alt', 'Control', 'Shift'].includes(e.key)) return;
      removeEventListener('keydown', go); overlay.removeEventListener('mousedown', go);
      resolve();
    };
    addEventListener('keydown', go); overlay.addEventListener('mousedown', go);
  });
}

// The title card: five seconds, then the story. Embers rise; the plate pushes in.
function showTitleCard() {
  overlay.className = 'titlecard';
  overlay.innerHTML = '<img id="splashArt" src="' + SPLASHES.title.image + '" alt=""><canvas id="embers"></canvas><div class="tc"><div class="tc1">THE CIMMERIAN</div><div class="tc2">The Scarlet Citadel</div><div class="tc3">after Robert E. Howard</div></div><div class="tccredit">' + SPLASHES.title.credit + '</div>';
  const ec = $('embers'), ex = ec.getContext('2d');
  ec.width = innerWidth; ec.height = innerHeight;
  const embers = Array.from({ length: 90 }, () => ({ x: Math.random() * ec.width, y: ec.height + Math.random() * ec.height, v: 20 + Math.random() * 60, s: 1 + Math.random() * 2.5, w: Math.random() * 6 }));
  const t0 = performance.now();
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (done) return; done = true; removeEventListener('keydown', skip); overlay.removeEventListener('mousedown', skip); resolve(); };
    const skip = () => { if (performance.now() - t0 > 400) finish(); };
    addEventListener('keydown', skip); overlay.addEventListener('mousedown', skip);
    const tick = now => {
      if (done) return;
      const t = (now - t0) / 1000;
      ex.clearRect(0, 0, ec.width, ec.height);
      for (const e of embers) {
        e.y -= e.v * 0.016; e.x += Math.sin(t * 2 + e.w) * 0.4;
        if (e.y < -10) { e.y = ec.height + 10; e.x = Math.random() * ec.width; }
        const a = Math.max(0, Math.min(1, e.y / ec.height)) * (0.5 + 0.5 * Math.sin(t * 6 + e.w));
        ex.fillStyle = 'rgba(255,' + (120 + Math.floor(e.w * 15)) + ',40,' + a.toFixed(2) + ')';
        ex.fillRect(e.x, e.y, e.s, e.s);
      }
      if (t >= 5) finish(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
