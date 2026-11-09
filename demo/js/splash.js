'use strict';
// ---------------------------------------------------------------------------
// Story splash screens (README §12). The real build processes public-domain
// Piranesi scans; until those exist, this paints a procedural "Carceri"
// engraving: receding arches, a stair, hanging chains, cut in two-tone hatch
// (ink on bone) with one scarlet accent rectangle, as splashgen.js would.
// ---------------------------------------------------------------------------

const SPLASHES = {
  e1m2: {
    title: 'THE PITS',
    accent: [[0.62, 0.10, 0.95, 0.40]],
    text: 'Beaten on the plain of Shamu and struck down by the wizard\'s poisoned ring, the king was carried in chains to Khorshemish. Before the kings who betrayed him he spat his defiance. Now Tsotha-lanti has given him to the dark beneath the Scarlet Citadel, where something vast moves in the tunnels.',
    seed: 7,
  },
  e1m3: {
    title: 'THE TUNNELS BELOW',
    accent: [[0.05, 0.55, 0.30, 0.95]],
    text: 'The jailer\'s keys are heavy in your fist, and the stair climbs toward the citadel. But the keys open more than one door, and the pits go deeper than any stair. Somewhere below, something is weeping, and a prisoner older than the citadel is waiting to be found.',
    seed: 19,
  },
};
const INK = [11, 10, 9], BONE_C = [232, 220, 192], SCARLET = [196, 48, 43];

function paintCarceri(cv, seed, accents) {
  const Wd = 480, Ht = 270;
  cv.width = Wd; cv.height = Ht;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(Wd, Ht), d = img.data;
  const r = new RNG(seed);
  const vp = { x: 0.5 + r.range(-0.1, 0.12), y: 0.44 };
  const arches = [];
  for (let k = 0; k < 6; k++) {
    const s = 1.05 * Math.pow(0.66, k);
    arches.push({ s, cx: vp.x + (k % 2 ? 1 : -1) * r.range(0, 0.05) * s, ow: 0.36 * s, pw: 0.12 * s, top: vp.y - 0.62 * s, bot: vp.y + 0.62 * s, spring: vp.y - 0.05 * s });
  }
  const chains = [];
  for (let k = 0; k < 4; k++) chains.push({ x: r.range(0.1, 0.9), len: r.range(0.2, 0.55), k: r.int(1, 3) });
  const stairDir = r.chance(0.5) ? 1 : -1;
  const value = (u, v) => {
    // stairs in the foreground, climbing across the frame
    const su = stairDir > 0 ? u : 1 - u;
    const lineY = 1.02 - su * 0.62, inStair = v > lineY && v < lineY + 0.14 && su < 0.85;
    if (inStair) {
      const along = (su * 30) % 1;
      return along < 0.55 ? 0.62 + 0.15 * (1 - su) : 0.16;
    }
    for (let k = 0; k < arches.length; k++) {
      const a = arches[k];
      if (v < a.top || v > a.bot || u < a.cx - a.ow - a.pw || u > a.cx + a.ow + a.pw) continue;
      const dx = (u - a.cx) / a.ow;
      const inOpen = Math.abs(dx) < 1 && v > a.spring - a.ow * 0.95 * Math.sqrt(Math.max(0, 1 - dx * dx));
      if (inOpen) continue;                                  // look through to the next arch
      const fade = 0.1 + k * 0.1;                            // aerial perspective
      const course = ((v - a.top) / (0.05 * a.s)) % 1 < 0.12 ? -0.07 : 0;
      const edge = Math.abs(u - (a.cx - a.ow)) < 0.012 * a.s || Math.abs(u - (a.cx + a.ow)) < 0.012 * a.s ? 0.25 : 0;
      return fade + course + edge + 0.06 * vnoise(u * 40, v * 40, seed);
    }
    // the far light
    const glow = 1 - Math.hypot(u - vp.x, (v - vp.y) * 1.4) * 1.6;
    return clamp(0.55 + glow * 0.45, 0.3, 0.97) - (Math.sin((u + v) * 60) > 0.92 ? 0.12 : 0);
  };
  for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
    const u = x / Wd, v = y / Ht;
    let val = value(u, v);
    for (const c of chains) {
      if (v < c.len && Math.abs(u - c.x) < 0.004 + 0.003 * ((Math.floor(v * 90) % 2))) val = 0.04;
    }
    val -= 0.35 * Math.pow(Math.hypot(u - 0.5, v - 0.5) * 1.3, 2);   // vignette
    // engraving: line thickness carries the tone; cross-hatch in the shadows
    const p1 = (x + y) % 4, p2 = (x - y + 4096) % 4;
    let ink = p1 < (1 - val) * 3.2;
    if (val < 0.3) ink = ink || p2 < (0.3 - val) * 9;
    if (val > 0.85) ink = (x * 7 + y * 13) % 11 === 0;
    let c = ink ? INK : BONE_C;
    if (!ink) for (const [x0, y0, x1, y1] of accents) if (u > x0 && u < x1 && v > y0 && v < y1) c = SCARLET;
    const o = (y * Wd + x) * 4;
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
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
  paintCarceri($('splashArt'), sp.seed, sp.accent);
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
