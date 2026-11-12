'use strict';
// ---------------------------------------------------------------------------
// Procedural 128x128 textures built from the Cimmerian ramps (README §7).
// e1m2 declares ramps [ink, jade, fire]: ink dominates, jade is the pits'
// damp and Satha's scales, fire is the only fullbright (torches, eyes).
// The hero's own skins use the earth ramp (MODELS.md: skin, leather), since
// he appears in every level. Texels are ordered-dithered between ramp entries,
// as Quake's textures were, so gradients stay palette-locked but smooth.
// UV-mapped skins (SATHA, ARM, MANACLE) take u around the body, v along it.
// Every texture gets the engraving hatch layer so the 3D world matches the
// engraved splash screens. The alpha channel is the EMISSIVE mask.
// ---------------------------------------------------------------------------

const TEX_NAMES = ['HEWN', 'ROCK', 'FLAG', 'SLIME', 'WATER', 'IRON', 'WOOD', 'SCALES', 'BELLY', 'SKIN', 'DARKSKIN',
  'CLOTH', 'ROBE', 'BONE', 'FIRE', 'EYE', 'VENOM', 'BLACK', 'STRAW', 'SKY',
  'SATHA', 'ARM', 'HANDSKIN', 'MANACLE', 'MOUTH', 'GRIP', 'STEEL', 'NAIL',
  'MAIL', 'LEATHER', 'TABARD', 'HAIR', 'SHIELD', 'BLOOD', 'BANNER', 'FACE',
  'CAVE', 'MUD', 'GRIME', 'PALE', 'SICK', 'PLANK', 'SCRATCH', 'TALLY1', 'TALLY2', 'TALLY3',
  'TURF', 'GILT', 'HIDE', 'SUNSET', 'BLACKMAIL', 'FACE_BRUTE', 'FACE_EUNUCH', 'FACE_VULTURE', 'SATHA_HEAD', 'SATHA_JAW', 'PIT_HIDE', 'PIT_HEAD', 'PIT_JAW',
  'LIVERY_POITAIN', 'LIVERY_PELLIA', 'LIVERY_BOSSON', 'LIVERY_GUNDER', 'VELVET', 'TAWNY', 'DEMON_HIDE', 'YOTHGA_STEM', 'YOTHGA_BLOOM', 'YOTHGA_LEAF',
  'FACE_CONAN', 'FACE_SAGE', 'FACE_OUTLAW', 'FEATHER', 'FLAME0', 'FLAME1', 'FLAME2', 'FLAME3', 'JELLY', 'TAPESTRY', 'MOSAIC', 'OAK', 'ASHLAR', 'JET', 'WINDOWS'];
const T = {};
TEX_NAMES.forEach((n, i) => { T[n] = i; });
const TEX_SIZE = 128;

// one frame of the flame sprite (64-texel space, tip at the top): a teardrop whose edge the noise tears into tongues, hot at the root
function flameTex(x, y, k) {
  const px = x / 64 - 0.5, h = 1 - y / 64, ty = ((y / 64 + k * 0.25) % 1 + 1) % 1;
  const sway = 0.05 * Math.sin(h * 5 + k * Math.PI / 2) * h;
  const w = 0.3 * (h < 0.2 ? Math.sqrt(h / 0.2) : Math.pow(Math.max(0, 1 - (h - 0.2) / 0.8), 0.9));
  const n = tfbm(x / 64, ty, 4, 3, 9100), n2 = tfbm(x / 64, ty, 8, 2, 9200);
  const edge = w * (0.6 + 0.8 * n), d = Math.abs(px - sway);
  const fleck = h > 0.55 && h < 0.97 && n2 > 0.68 && d < 0.16;                      // a torn-off tongue above the body
  if (h < 0.03 || (d > edge && !fleck)) return { v: 0, ramp: 'fire', cut: false };
  const core = fleck ? 0.2 : 1 - d / Math.max(edge, 1e-3);
  return { v: clamp(0.25 + 0.75 * core * (1.05 - 0.75 * h) + 0.15 * (n2 - 0.5), 0, 1), ramp: 'fire', lo: 0.05, hi: 1, cut: true };
}
function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
// n-step ramp between two anchors, slightly gamma-curved like Quake's palette rows
function makeRamp(lo, hi, n, gamma = 1.15, mid = null) {
  const a = hexRgb(lo), b = hexRgb(hi), m = mid && hexRgb(mid), out = [];
  for (let i = 0; i < n; i++) {
    const t = Math.pow(i / (n - 1), gamma);
    if (m) {                                             // through a middle colour, as Quake's fire row goes red, orange, yellow
      const [p, q, u] = t < 0.5 ? [a, m, t * 2] : [m, b, t * 2 - 1];
      out.push([0, 1, 2].map(k => Math.round(p[k] + (q[k] - p[k]) * u)));
    } else out.push([0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * t)));
  }
  return out;
}
const RAMPS = {
  ink: makeRamp('#0b0a09', '#e8dcc0', 16),
  jade: makeRamp('#08120c', '#7fa88a', 12),
  fire: makeRamp('#3c0600', '#ffd23c', 12, 0.9, '#d8480a'),
  scarlet: makeRamp('#2a0606', '#c4302b', 10),     // UI only in this level
  earth: makeRamp('#160e08', '#b08a66', 16),
  bronze: makeRamp('#20140a', '#d8a24a', 14),
  night: makeRamp('#0a0d14', '#6b7a96', 12),
  magic: makeRamp('#0a3020', '#e6fff0', 16, 0.9),
};
// The game palette (README §7): 6 lit ramps and 2 fullbright ramps of 16 shades, like the rows of
// Quake's palette.lmp. The final image is snapped to these 128 colours (renderer POST_FS).
const PALETTE_RAMPS = [['#0b0a09', '#e8dcc0'], ['#2a0606', '#c4302b'], ['#20140a', '#d8a24a'], ['#08120c', '#7fa88a'],
  ['#0a0d14', '#6b7a96'], ['#160e08', '#b08a66'], ['#3c0600', '#ffd23c', '#d8480a'], ['#0a3020', '#e6fff0'],
  ['#140a06', '#d6b29c'], ['#0b0c0f', '#b4b8c0'], ['#1c0b04', '#e8a070', '#9a4f28']];   // and torchlit skin, so flesh never snaps to fire   // flesh, and cold steel: the cast's skin and armour (Quake's palette has both)
function gamePalette() {
  const out = [];
  for (const [lo, hi, mid] of PALETTE_RAMPS) out.push(...makeRamp(lo, hi, 16, mid ? 0.9 : 1.15, mid));
  return out;
}
// For every colour on a 32-step grid, the nearest palette colour, weighted for the eye (as WEaBuse3D does it).
function paletteLut(pal) {
  const out = new Uint8Array(1024 * 32 * 4);
  for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) for (let r = 0; r < 32; r++) {
    const R = r * 255 / 31, G = g * 255 / 31, B = b * 255 / 31;
    let best = 0, bd = Infinity;
    for (let i = 0; i < pal.length; i++) {
      const dr = R - pal[i][0], dg = G - pal[i][1], db = B - pal[i][2], d = 3 * dr * dr + 4 * dg * dg + 2 * db * db;
      if (d < bd) { bd = d; best = i; }
    }
    const o = (g * 1024 + b * 32 + r) * 4;
    out[o] = pal[best][0]; out[o + 1] = pal[best][1]; out[o + 2] = pal[best][2]; out[o + 3] = 255;
  }
  return out;
}
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);
function rampAt(name, v, lo = 0, hi = 1, px = 0, py = 0) {
  const r = RAMPS[name], t = clamp(lo + (hi - lo) * v, 0, 0.999);
  return r[clamp(Math.floor(t * r.length + 0.5 + BAYER4[(py & 3) * 4 + (px & 3)] * 0.9), 0, r.length - 1)];
}

function tnoise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const p = a => ((a % period) + period) % period;
  const a = hrand(p(xi), p(yi), seed, 1), b = hrand(p(xi + 1), p(yi), seed, 1);
  const c = hrand(p(xi), p(yi + 1), seed, 1), d = hrand(p(xi + 1), p(yi + 1), seed, 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function tfbm(px, py, base, oct, seed) {
  let s = 0, amp = 1, tot = 0, per = base;
  for (let o = 0; o < oct; o++) { s += tnoise(px * per, py * per, per, seed + o * 17) * amp; tot += amp; amp *= 0.5; per *= 2; }
  return s / tot;
}
// periodic noise with separate x and y periods: streaks, drips and strata that still tile
function tnoiseP(x, y, Px, Py, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const wx = a => ((a % Px) + Px) % Px, wy = a => ((a % Py) + Py) % Py;
  const a = hrand(wx(xi), wy(yi), seed, 1), b = hrand(wx(xi + 1), wy(yi), seed, 1);
  const c = hrand(wx(xi), wy(yi + 1), seed, 1), d = hrand(wx(xi + 1), wy(yi + 1), seed, 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function tfbmP(px, py, bx, by, oct, seed) {
  let s = 0, amp = 1, tot = 0, fx = bx, fy = by;
  for (let o = 0; o < oct; o++) { s += tnoiseP(px * fx, py * fy, fx, fy, seed + o * 17) * amp; tot += amp; amp *= 0.5; fx *= 2; fy *= 2; }
  return s / tot;
}
function makeCells(n, seed) {
  const pts = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + hrand(i, j, seed, 5)) / n, (j + hrand(i, j, seed, 6)) / n, hrand(i, j, seed, 7)]);
  return { n, pts };
}
function cellAt(c, px, py) {
  const n = c.n, ci = Math.floor(px * n), cj = Math.floor(py * n);
  let f1 = 9, f2 = 9, id = 0;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const ii = ci + di, jj = cj + dj, wi = ((ii % n) + n) % n, wj = ((jj % n) + n) % n, p = c.pts[wj * n + wi];
    const d = Math.hypot(px - (p[0] + (ii - wi) / n), py - (p[1] + (jj - wj) / n));
    if (d < f1) { f2 = f1; f1 = d; id = p[2]; } else if (d < f2) f2 = d;
  }
  return { f1, f2, id };
}
const TAU = Math.PI * 2;

// Engraving hatch: diagonal lines at a 4 px pitch, cross-hatched in the
// shadows. Darker tones get more ink, like a burin cut.
function hatch(v, x, y, strength) {
  if ((x + y) % 4 === 0) v -= strength * (1 - v) * 0.9;
  if (v < 0.42 && ((x - y + 64) % 4 === 0)) v -= strength * (1 - v) * 0.7;
  return v;
}

// Each spec returns {v, ramp, lo, hi, e} per texel. 'ramp' picks one of the
// declared ramps, so no texture can use a colour outside the level's set.
const TEXGEN = {
  HEWN: { pre: s => {                                 // great dressed blocks in courses (Piranesi's prisons): each block its own tone, a lit arris above, shadow below
    const r = new RNG(s), rows = [], hs = [0.27, 0.23, 0.26, 0.24];
    let y = 0;
    for (let i = 0; i < 4; i++) { const n = r.int(2, 3), cuts = [0]; for (let k = 1; k < n; k++) cuts.push((k + r.range(-0.25, 0.25)) / n); cuts.push(1); rows.push({ y0: y, y1: y + hs[i], off: r.next(), cuts }); y += hs[i]; }
    return rows;
  }, f: (x, y, s, rows) => {
    const px = x / 64, py = y / 64;
    let row = 0; while (row < 3 && py >= rows[row].y1) row++;
    const R = rows[row], hgt = R.y1 - R.y0, ly = (py - R.y0) / hgt;
    const bxr = (px + R.off) % 1; let bi = 0; while (bi < R.cuts.length - 2 && bxr > R.cuts[bi + 1]) bi++;
    const w = R.cuts[bi + 1] - R.cuts[bi], lx = (bxr - R.cuts[bi]) / w;
    const dl = lx * w * 64, dr = (1 - lx) * w * 64, dt = ly * hgt * 64, db = (1 - ly) * hgt * 64;   // texels to each edge
    const chip = 0.45 + 1.1 * Math.pow(tfbm(px, py, 16, 2, s + 7), 3) * 3;
    const edge = Math.min(dl, dr, dt, db);
    if (edge < chip) return { v: 0.1 + 0.18 * tfbm(px, py, 16, 2, s + 3), ramp: 'ink', lo: 0, hi: 0.3 };   // the joint, and a chipped arris
    const id = hrand(row, bi, s, 4), id2 = hrand(row, bi, s, 6);
    let v = 0.4 + 0.16 * (id - 0.5) + 0.2 * (tfbm(px + id * 7, py, 6, 4, s) - 0.5) + 0.08 * (tfbm(px, py, 24, 2, s + 1) - 0.5);
    v += 0.16 * (1 - smoothstep(chip, chip + 1.6, dt)) + 0.08 * (1 - smoothstep(chip, chip + 1.4, dl));   // the lit arris, above and to the left
    v -= 0.2 * (1 - smoothstep(chip, chip + 2.6, db)) + 0.1 * (1 - smoothstep(chip, chip + 2, dr));    // and the shadowed one beneath
    v -= 0.1 * Math.pow(1 - Math.min(1, edge / 10), 2);                                                 // the face falls away toward its edges (rock-faced)
    if (hrand(Math.floor(x * 2), Math.floor(y * 2), s, 9) > 0.975) v -= 0.14;                           // tool marks
    if (Math.abs(tfbm(px + id * 3, py, 4, 3, s + 19) - 0.5) < 0.006 && id2 > 0.7) v -= 0.18;             // a hairline crack
    v -= 0.16 * smoothstep(0.55, 0.85, tfbmP(px, py, 12, 1.5, 3, s + 23));                              // water stains, running down
    if (id2 < 0.12 && tfbm(px, py, 8, 3, s + 9) > 0.55) return { v: v * 0.9, ramp: 'jade', lo: 0.04, hi: 0.5, h: 0.03 };   // a damp block
    return { v, ramp: 'ink', lo: 0.05, hi: 0.5, h: 0.03 };
  } },
  ROCK: { pre: s => makeCells(3, s), f: (x, y, s, c) => {    // raw pit rock: ridged and knobbed, bedded in layers, split along a few deep joints
    const px = x / 64, py = y / 64, ridge = 1 - Math.abs(tfbm(px, py, 4, 5, s) * 2 - 1), knob = tfbm(px, py, 8, 3, s + 21);
    const strata = tfbmP(px + 0.15 * ridge, py, 1, 7, 3, s + 4);
    let v = 0.2 + 0.26 * ridge + 0.16 * (knob - 0.5) + 0.06 * tfbm(px, py, 24, 2, s + 9) + 0.16 * (strata - 0.5);
    const lay = Math.abs(((py * 6 + 0.5 * ridge) % 1) - 0.5);
    if (lay < 0.035) v -= 0.12;                                                    // a bedding seam
    const j1 = Math.abs(tfbm(px, py, 3, 4, s + 31) - 0.5), j2 = Math.abs(tfbmP(px, py, 2, 5, 3, s + 37) - 0.5);
    const g = Math.min(j1, j2 * 1.3);
    if (g < 0.008) v -= 0.28;                                                        // a deep joint, wandering as rock splits
    else if (g < 0.03) v += 0.08 * (1 - g / 0.03) * (j1 < j2 * 1.3 ? 1 : -0.5);     // one lip catching the light, the other in shadow
    if (hrand(Math.floor(x * 2), Math.floor(y * 2), s, 2) > 0.98) v += 0.13;
    if (tfbm(px, py, 3, 3, s + 3) > 0.7 && knob < 0.5) return { v: v * 0.95, ramp: 'jade', lo: 0.03, hi: 0.3, h: 0.04 };   // damp in the hollows
    return { v, ramp: 'ink', lo: 0.03, hi: 0.44, h: 0.04 };
  } },
  FLAG: { pre: s => makeCells(5, s), f: (x, y, s, c) => {     // worn flagstones, dirt and wet in the joints
    const px = x / 64, py = y / 64, k = cellAt(c, px, py), gap = k.f2 - k.f1;
    if (gap < 0.02 + tfbm(px, py, 16, 2, s + 5) * 0.022) {
      const w = tfbm(px, py, 8, 2, s);
      return w > 0.56 ? { v: 0.3 + 0.4 * w, ramp: 'jade', lo: 0.02, hi: 0.4 } : { v: 0.1 + 0.2 * w, ramp: 'ink', lo: 0, hi: 0.28 };
    }
    let v = 0.33 + 0.24 * k.id + 0.24 * tfbm(px, py, 8, 4, s) + 0.12 * smoothstep(0.02, 0.12, gap) - 0.16 * (1 - smoothstep(0.022, 0.05, gap));
    if (hrand(Math.floor(x * 2), Math.floor(y * 2), s, 3) > 0.96) v -= 0.22;
    if (Math.abs(tfbm(px + k.id * 2, py, 4, 3, s + 13) - 0.5) < 0.01 && k.id > 0.55) v -= 0.3;
    v -= 0.26 * smoothstep(0.5, 0.76, tfbm(px, py, 2, 3, s + 29));
    return { v, ramp: 'ink', lo: 0.04, hi: 0.45, h: 0.04 };
  } },
  SLIME: { f: (x, y, s) => ({ v: tfbm(x / 64, y / 64, 4, 3, s), ramp: 'jade', lo: 0.15, hi: 0.95, e: 0.25 }) },
  WATER: { f: (x, y, s) => ({ v: tfbm(x / 64, y / 64, 4, 3, s), ramp: 'jade', hi: 0.45, e: 0.05 }) },
  IRON: { f: (x, y, s) => {
    const px = x / 64, py = y / 64, fx = (px * 4) % 1 - 0.5, fy = (py * 4) % 1 - 0.5;
    if (Math.hypot(fx, fy) < 0.12) return { v: 0.9, ramp: 'ink', lo: 0.1, hi: 0.5 };
    return { v: tfbm(px, py, 8, 3, s) * 0.8, ramp: 'ink', lo: 0.04, hi: 0.36, h: 0.2 };
  } },
  WOOD: { f: (x, y, s) => {
    const px = x / 64, py = y / 64, plank = Math.floor(py * 4), local = py * 4 - plank;
    if (local < 0.07) return { v: 0.02, ramp: 'ink', hi: 0.3 };
    return { v: 0.3 * tfbm(px, py, 2, 3, s + plank) + 0.35 + 0.3 * Math.sin(TAU * (py * 16 + tfbm(px, py, 4, 2, s) * 2)), ramp: 'ink', lo: 0.1, hi: 0.45, h: 0.25 };
  } },
  SCALES: { f: (x, y, s) => {                         // Satha: overlapping jade scales
    const px = x / 64 * 8, py = y / 64 * 8, row = Math.floor(py), fx = px + (row % 2) * 0.5 - Math.floor(px + (row % 2) * 0.5), fy = py - row;
    const d = Math.hypot(fx - 0.5, fy * 0.9);
    let v = 0.85 - d * 0.9 + 0.15 * tfbm(x / 64, y / 64, 4, 2, s);
    if (d > 0.52) v = 0.08;
    return { v, ramp: 'ink', lo: 0.4, hi: 1, h: 0.12 };   // Satha's head plates: shimmering white
  } },
  BELLY: { f: (x, y, s) => ({ v: 0.55 + 0.3 * ((Math.floor(y / 8)) % 2) + 0.15 * tfbm(x / 64, y / 64, 4, 2, s), ramp: 'jade', lo: 0.4, hi: 1 }) },
  SKIN: { f: (x, y, s) => ({ v: tfbm(x / 64, y / 64, 8, 4, s), ramp: 'ink', lo: 0.35, hi: 0.62, h: 0.15 }) },
  DARKSKIN: { f: (x, y, s) => ({ v: 0.5 + 0.5 * tfbm(x / 64, y / 64, 8, 3, s), ramp: 'earth', lo: 0.04, hi: 0.26, h: 0.06 }) },
  CLOTH: { f: (x, y, s) => ({ v: 0.35 + ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) * 0.15 + tfbm(x / 64, y / 64, 8, 2, s) * 0.35, ramp: 'ink', lo: 0.04, hi: 0.3 }) },
  ROBE: { f: (x, y, s) => {                           // Shukeli's robe: bone cloth, jade hem stripes
    const py = y / 64;
    if (py > 0.8 && py < 0.88) return { v: 0.6, ramp: 'jade', lo: 0.3, hi: 0.9 };
    return { v: 0.5 + 0.4 * tfbm(x / 64, py, 4, 3, s) + 0.1 * Math.sin(TAU * x / 8), ramp: 'ink', lo: 0.35, hi: 0.85, h: 0.3 };
  } },
  BONE: { f: (x, y, s) => ({ v: 0.5 + tfbm(x / 64, y / 64, 8, 3, s) * 0.5 - (hrand(x, y, s, 2) > 0.95 ? 0.4 : 0), ramp: 'ink', lo: 0.45, hi: 1, h: 0.15 }) },
  FIRE: { f: (x, y, s) => ({ v: 0.08 + 0.72 * tfbm(x / 64, y / 64, 4, 3, s), ramp: 'fire', hi: 0.85, e: 1 }) },   // orange and red, never pale
  // Quake-style fire: four frames of a cut-out flame, its tongues climbing from frame to frame (the noise scrolls a quarter-tile each)
  // the weeping thing's substance: "a quaking, jelly-like stuff which made him physically sick to look at": livid grey-green gel,
  // darker clots sunk in it, threads of blood, and a faint phosphor of its own
  JELLY: { f: (x, y, s) => {
    const px = x / 64, py = y / 64, n = tfbm(px, py, 4, 4, s), c = tfbm(px, py, 8, 2, s + 5);
    if (Math.abs(tfbm(px, py, 6, 3, s + 9) - 0.5) < 0.008) return { v: 0.5, ramp: 'scarlet', lo: 0.25, hi: 0.7, e: 0.12 };   // a thread of blood
    if (c > 0.68) return { v: 0.3 + 0.15 * n, ramp: 'jade', lo: 0.12, hi: 0.5, e: 0.12 };                                   // a clot, sunk in the gel
    return { v: 0.3 + 0.5 * n + 0.15 * c, ramp: 'jade', lo: 0.16, hi: 0.68, e: 0.24 };
  } },
  FLAME0: { f: (x, y, s) => flameTex(x, y, 0) }, FLAME1: { f: (x, y, s) => flameTex(x, y, 1) }, FLAME2: { f: (x, y, s) => flameTex(x, y, 2) }, FLAME3: { f: (x, y, s) => flameTex(x, y, 3) },
  EYE: { f: (x, y, s) => ({ v: 0.4 + 0.6 * tfbm(x / 64, y / 64, 8, 2, s), ramp: 'fire', lo: 0.4, e: 1 }) },
  VENOM: { f: (x, y, s) => ({ v: 0.3 + 0.7 * tfbm(x / 64, y / 64, 4, 3, s), ramp: 'jade', lo: 0.4, hi: 1, e: 0.7 }) },
  BLACK: { f: (x, y, s) => ({ v: tfbm(x / 64, y / 64, 8, 2, s), ramp: 'ink', hi: 0.08 }) },
  STRAW: { pre: s => { const r = new RNG(s), g = []; for (let i = 0; i < 150; i++) g.push([r.next(), r.next(), r.range(0, Math.PI), r.range(0.03, 0.1), r.next()]); return g; },
    f: (x, y, s, segs) => {                          // loose rotten straw over packed dirt
      const px = x / 64, py = y / 64;
      let hit = -1;
      for (const [sx, sy, a, len, t] of segs) {
        let dx = px - sx, dy = py - sy; dx -= Math.round(dx); dy -= Math.round(dy);
        const along = dx * Math.cos(a) + dy * Math.sin(a), perp = -dx * Math.sin(a) + dy * Math.cos(a);
        if (Math.abs(along) < len && Math.abs(perp) < 0.005 + 0.002 * t) hit = Math.max(hit, t);
      }
      if (hit >= 0) return { v: 0.35 + 0.45 * hit - 0.25 * tfbm(px, py, 16, 1, s), ramp: 'earth', lo: 0.2, hi: 0.78 };
      const v = 0.16 + 0.22 * tfbm(px, py, 8, 3, s) - (tfbm(px, py, 4, 2, s + 3) > 0.6 ? 0.1 : 0);
      return { v, ramp: 'earth', lo: 0.02, hi: 0.36, h: 0.04 };
    } },
  SKY: { f: (x, y, s) => ({ v: 0.6 + 0.4 * tfbm(x / 64, y / 64, 2, 3, s), ramp: 'ink', lo: 0.4, hi: 0.75, e: 1 }) },  // daylight through the grating
  // ---- UV-mapped skins ----------------------------------------------------
  // Satha: u around the body (0.5 = spine, 0/1 = belly), v along it.
  // Satha's head and jaw, painted as Quake painted its skins: one smooth shape, every detail in the texture.
  // u runs round the loft (0 underneath, 0.5 on the crown); a = distance from the crown line.
  SATHA_HEAD: { f: (x, y, s) => {
    const u = x / 64, z = (y / 64) * 3.6 - 0.75, a = Math.abs(u - 0.5), n = tfbm(x / 64, y / 64, 16, 2, s);
    const lip = 0.305 - 0.012 * z;
    const eye = ell(a, z, 0.172, 1.12, 0.042, 0.19);
    if (eye < 1) {                                       // the eye: amber, burning, a black slit across it
      if (Math.abs(z - 1.12) < 0.028 && eye < 0.9) return { v: 0.02, ramp: 'ink', lo: 0, hi: 0.1 };
      return { v: 0.5 + 0.5 * (1 - eye), ramp: 'fire', lo: 0.45, hi: 1, e: 1 };
    }
    if (eye < 1.18) return { v: 0.06, ramp: 'ink', lo: 0, hi: 0.3 };                                   // the dark rim of the socket
    const stripe = seg(a, z, 0.18, 0.92, 0.2, -0.3) < 0.01 ? 0.22 : 0;                                // a faint stripe back from the eye
    if (ell(a, z, 0.035, 2.52, 0.012, 0.05) < 1) return { v: 0.03, ramp: 'ink', lo: 0, hi: 0.2 };   // nostrils
    if (a > lip - 0.011 && a < lip + 0.011 && z > -0.1 && z < 2.6) return { v: 0.05, ramp: 'ink', lo: 0, hi: 0.25 };   // the lip line
    if (a >= lip + 0.011) {                             // under the lip: fangs, teeth, then the palate
      const below = a - lip - 0.011, fang = Math.abs(z - 1.98) < 0.075 * (1 - below / 0.07) && below < 0.07;
      const tooth = z > 0.4 && z < 1.8 && below < 0.022 && Math.abs(((z - 0.4) % 0.17) - 0.085) < 0.045 * (1 - below / 0.022);
      if (fang || tooth) return { v: 0.85 + 0.1 * n, ramp: 'ink', lo: 0.6, hi: 1 };
      return { v: 0.3 + 0.25 * n - 0.15 * (Math.floor(z * 6) % 2), ramp: 'scarlet', lo: 0.05, hi: 0.55 };
    }
    let t;
    if (a < 0.12 && z > -0.35 && z < 2.25) {           // the crown: great overlapping shields, a seam down the middle
      const zr = (z + 0.35) / 0.42, fz = zr - Math.floor(zr), fa = a / 0.12;
      if (fz < 0.07 || a < 0.006 || (fa > 0.92)) return { v: 0.1 + 0.1 * n, ramp: 'ink', lo: 0, hi: 0.4 };
      t = 0.82 - 0.3 * fz - 0.15 * fa + 0.1 * n;
    } else if (a < 0.155 && z > 0.75 && z < 1.55) {   // the brow plate over the eye, and its shadow beneath
      t = a > 0.145 ? 0.15 : 0.85 + 0.08 * n;
    } else {                                           // small keeled scales
      const su = u * 34, sv = (z + 2) * 7, row = Math.floor(sv), fu = (su + (row % 2) * 0.5) % 1, fv = sv - row;
      t = 0.72 - Math.hypot((fu - 0.5) * 1.2, fv - 0.35) * 0.9 + 0.2 * (1 - fv) + 0.1 * n;
      if (fv < 0.1) t -= 0.25;
    }
    t -= stripe + 0.22 * smoothstep(0.2, 0.3, a) + 0.18 * smoothstep(2.2, 2.75, z);        // turning under, and toward the snout
    return { v: t, ramp: 'ink', lo: 0.3, hi: 1, e: 0.12 };                               // "the great shimmering white form"
  } },
  SATHA_JAW: { f: (x, y, s) => {
    const u = x / 64, z = (y / 64) * 3.6 - 0.3, a = Math.abs(u - 0.5), n = tfbm(x / 64, y / 64, 16, 2, s);
    if (a < 0.19) {                                    // the mouth: wet red flesh, the forked tongue lying in it
      const fork = z > 2.0 ? Math.abs(a - (z - 2.0) * 0.06) : a;
      if (fork < 0.022 && z > 0.1 && z < 2.45) return { v: 0.12 + 0.2 * n, ramp: 'scarlet', lo: 0, hi: 0.35 };
      return { v: 0.45 + 0.3 * n - 0.2 * smoothstep(0.1, 0.19, a), ramp: 'scarlet', lo: 0.1, hi: 0.8 };
    }
    if (a < 0.235) {                                   // a row of teeth along each edge
      const tooth = z > 0.3 && z < 2.3 && Math.abs(((z - 0.3) % 0.17) - 0.085) < 0.05 * (1 - (a - 0.19) / 0.045);
      return tooth ? { v: 0.88 + 0.1 * n, ramp: 'ink', lo: 0.6, hi: 1 } : { v: 0.06, ramp: 'ink', lo: 0, hi: 0.25 };
    }
    if (a > 0.4) {                                     // under the chin: broad pale scutes
      const band = ((z + 1) * 4) % 1;
      return band < 0.1 ? { v: 0.2, ramp: 'ink', lo: 0.2, hi: 0.6 } : { v: 0.6 + 0.3 * (1 - band) + 0.1 * n, ramp: 'ink', lo: 0.45, hi: 0.9 };
    }
    const su = u * 30, sv = (z + 2) * 7, row = Math.floor(sv), fu = (su + (row % 2) * 0.5) % 1, fv = sv - row;
    return { v: 0.65 - Math.hypot((fu - 0.5) * 1.2, fv - 0.35) * 0.9 + 0.2 * (1 - fv) + 0.1 * n - (fv < 0.1 ? 0.25 : 0), ramp: 'ink', lo: 0.3, hi: 0.95, e: 0.12 };
  } },
  // The pits' things: "shadowy forms, monstrous and abnormal in outline", "slavering lips", "the burning
  // glare of hungry eyes" (ch. III). Near-black wet hide; only the eyes and the maw catch the light.
  PIT_HIDE: { f: (x, y, s) => {
    const u = x / 64, v = y / 64, n = tfbm(u, v, 8, 3, s), n2 = tfbm(u, v, 20, 2, s + 7), vein = Math.abs(tfbm(u, v, 6, 3, s + 3) * 2 - 1);
    const band = (v * 13 + 0.2 * n) % 1;
    if (n2 > 0.7) return { v: 0.35 + 0.5 * (n2 - 0.7) / 0.3, ramp: 'jade', lo: 0.15, hi: 0.6 };                // a wet sheen
    if (vein < 0.035) return { v: 0.45 + n * 0.2, ramp: 'ink', lo: 0.15, hi: 0.55 };                         // veins and old scars
    const t = 0.16 + 0.22 * n - (band < 0.16 ? 0.12 : 0) + 0.06 * (1 - band);                                  // ridged like ribs
    return { v: t, ramp: 'ink', lo: 0, hi: 0.42, h: 0.06 };
  } },
  PIT_HEAD: { f: (x, y, s) => {
    const u = x / 64, z = y / 64, a = Math.abs(u - 0.5), n = tfbm(u, z, 8, 3, s);
    // a cluster of eyes on each side of the crown, burning
    for (const [ea, ez, ra, rz] of [[0.07, 0.6, 0.022, 0.05], [0.12, 0.54, 0.018, 0.04], [0.15, 0.63, 0.014, 0.033], [0.1, 0.71, 0.013, 0.03], [0.045, 0.73, 0.01, 0.024]]) {
      const e = ell(a, z, ea, ez, ra, rz);
      if (e < 1) return { v: 0.55 + 0.45 * (1 - e), ramp: 'fire', lo: 0.4, hi: 1, e: 1 };
      if (e < 1.5) return { v: 0.04, ramp: 'ink', lo: 0, hi: 0.2 };
    }
    if (a > 0.33 && z > 0.25) {                         // under the lip: jagged teeth, then the wet red maw
      const below = a - 0.33, tooth = below < 0.05 && Math.abs(((z * 11) % 1) - 0.5) < 0.42 * (1 - below / 0.05);
      if (tooth) return { v: 0.8 + 0.15 * n, ramp: 'ink', lo: 0.5, hi: 0.95 };
      return { v: 0.3 + 0.35 * n, ramp: 'scarlet', lo: 0.05, hi: 0.7, e: 0.15 };
    }
    const t = 0.15 + 0.25 * n - 0.1 * smoothstep(0.2, 0.33, a) + 0.08 * Math.max(0, 1 - Math.abs(a - 0.13) / 0.04) * (z > 0.45 && z < 0.8 ? 1 : 0);   // a brow over the eyes
    return { v: t, ramp: 'ink', lo: 0, hi: 0.45, h: 0.06 };
  } },
  PIT_JAW: { f: (x, y, s) => {
    const u = x / 64, z = y / 64, a = Math.abs(u - 0.5), n = tfbm(u, z, 8, 3, s);
    if (a < 0.17) return { v: 0.25 + 0.4 * n - 0.2 * smoothstep(0.1, 0.17, a), ramp: 'scarlet', lo: 0.05, hi: 0.75, e: 0.15 };   // the gullet
    if (a < 0.23) {
      const tooth = z > 0.15 && Math.abs(((z * 10) % 1) - 0.5) < 0.42 * (1 - (a - 0.17) / 0.06);
      return tooth ? { v: 0.85, ramp: 'ink', lo: 0.5, hi: 0.95 } : { v: 0.05, ramp: 'ink', lo: 0, hi: 0.2 };
    }
    return { v: 0.14 + 0.24 * n, ramp: 'ink', lo: 0, hi: 0.4, h: 0.06 };
  } },
  SATHA: { f: (x, y, s) => {
    const u = x / 64, v = y / 64, bu = Math.min(u, 1 - u);
    if (bu < 0.13) {                                   // belly scutes: broad transverse plates
      const band = (v * 8) % 1;
      if (band < 0.09) return { v: 0.4, ramp: 'ink', lo: 0.35, hi: 0.7 };
      return { v: 0.55 + 0.35 * (1 - band) + 0.1 * tfbm(u, v, 8, 2, s), ramp: 'ink', lo: 0.45, hi: 0.85, h: 0.08 };
    }
    // overlapping keeled scales, rows offset, highlight on each scale's crown
    const su = u * 30, sv = v * 15, row = Math.floor(sv), fu = (su + (row % 2) * 0.5) % 1, fv = sv - row;
    const d = Math.hypot((fu - 0.5) * 1.2, (fv - 0.35) * 1.0);
    let t = 0.8 - d * 0.6 + 0.12 * (1 - fv) - (Math.abs(fu - 0.5) < 0.05 && fv < 0.7 ? 0.06 : 0);
    if (d > 0.55) t = 0.35;                                // the seams between scales: shadowed, not black
    t += 0.1 * tfbm(u, v, 4, 2, s);
    const du = Math.abs(u - 0.5);
    // dorsal saddles: dark diamonds with pale rims down the spine
    const dd = du / 0.2 + Math.abs(((v * 2) % 1) - 0.5) * 2.2;
    // "the great shimmering white form of Satha" (ch. III): pale scales, a faint grey saddle down the spine
    let lo = 0.55, hi = 1;
    if (dd < 0.9) { lo = 0.45; hi = 0.88; } else if (dd < 1.1) { lo = 0.6; hi = 1; }
    if (du > 0.3) { lo += 0.06; }
    return { v: t, ramp: 'ink', lo, hi, h: 0.05, e: 0.22 };                // a faint shimmer, so she stays white under orange torchlight
  } },
  // The hero's right forearm: u around (0.5 = back of the arm), v from wrist (0) to elbow (1).
  ARM: { f: (x, y, s) => {
    const u = x / 64, v = y / 64;
    let t = 0.58 + 0.06 * Math.sin(TAU * (u * 2 + v * 0.6)) + 0.12 * tfbm(u, v, 4, 3, s) - 0.1 * (1 - smoothstep(0, 0.2, v));
    const vein = Math.abs(u - (0.2 + 0.035 * Math.sin(v * 11) + 0.02 * Math.sin(v * 23)));
    if (vein < 0.012) t -= 0.14; else if (vein < 0.022) t += 0.05;
    const vein2 = Math.abs(u - (0.12 + 0.05 * v + 0.02 * Math.sin(v * 17 + 1)));
    if (v > 0.35 && vein2 < 0.009) t -= 0.1;
    if (u > 0.38 && u < 0.85 && hrand(Math.floor(x * 2), Math.floor(y * 0.7), s, 9) > 0.86) t -= 0.12;   // coarse hair
    const scar = Math.abs((u - 0.55) - (v - 0.55) * 0.8);
    if (scar < 0.012 && u > 0.5 && u < 0.72) t += 0.22;
    return { v: t, ramp: 'earth', lo: 0.22, hi: 0.8, h: 0.07 };
  } },
  HANDSKIN: { f: (x, y, s) => ({ v: 0.62 + 0.18 * tfbm(x / 64, y / 64, 8, 3, s) - (hrand(Math.floor(x * 2), Math.floor(y * 2), s, 4) > 0.93 ? 0.1 : 0), ramp: 'earth', lo: 0.28, hi: 0.8, h: 0.06 }) },
  NAIL: { f: (x, y, s) => ({ v: 0.6 + 0.3 * tfbm(x / 64, y / 64, 4, 2, s), ramp: 'ink', lo: 0.4, hi: 0.85 }) },
  // Manacle band: u around, v across the band. Riveted iron, rust where the skin rubs.
  MANACLE: { f: (x, y, s) => {
    const u = x / 64, v = y / 64, fu = (u * 8) % 1;
    const rd = Math.hypot(fu - 0.5, (v - 0.5) * 0.6);
    if (rd < 0.11) return { v: 0.95 - rd * 4, ramp: 'ink', lo: 0.15, hi: 0.75 };
    if (rd < 0.15) return { v: 0.05, ramp: 'ink', lo: 0, hi: 0.2 };
    let t = 0.45 + 0.3 * tfbm(u, v, 8, 3, s) - (v < 0.12 || v > 0.88 ? 0.25 : 0) + (v > 0.15 && v < 0.22 ? 0.2 : 0);
    if (tfbm(u, v, 4, 3, s + 5) > 0.58) return { v: t, ramp: 'earth', lo: 0.15, hi: 0.6, h: 0.1 };
    return { v: t, ramp: 'ink', lo: 0.06, hi: 0.5, h: 0.15 };
  } },
  MOUTH: { f: (x, y, s) => ({ v: 0.4 + 0.5 * tfbm(x / 64, y / 64, 4, 3, s) + 0.2 * Math.sin(TAU * y / 16), ramp: 'earth', lo: 0.05, hi: 0.5, e: 0.04 }) },
  GRIP: { f: (x, y) => { const band = ((x + y * 2) / 10) % 1; return { v: band < 0.15 ? 0.1 : 0.55 + 0.3 * Math.sin(band * Math.PI), ramp: 'earth', lo: 0.05, hi: 0.55 }; } },
  STEEL: { f: (x, y, s) => ({ v: 0.55 + 0.25 * tfbm(x / 64 * 0.2, y / 64 * 4, 4, 2, s) + 0.15 * Math.sin(TAU * y / 6), ramp: 'ink', lo: 0.35, hi: 1, e: 0.06 }) },
  // ---- the cast: the citadel's wardens wear Tsotha's scarlet over mail ----
  MAIL: { f: (x, y, s) => {                           // riveted rings, offset rows
    const row = Math.floor(y / 3), fx = ((x + (row % 2) * 1.5) / 3) % 1, fy = (y / 3) % 1;
    const d = Math.abs(Math.hypot(fx - 0.5, fy - 0.5) - 0.3);
    if (d < 0.12 && tfbm(x / 64, y / 64, 4, 3, s + 2) > 0.58) return { v: 0.6 - d * 3, ramp: 'earth', lo: 0.08, hi: 0.5 };   // rust
    return { v: d < 0.12 ? 0.75 - d * 3 : 0.1, ramp: 'ink', lo: 0.04, hi: 0.55 };
  } },
  LEATHER: { f: (x, y, s) => ({ v: 0.45 + 0.3 * tfbm(x / 64, y / 64, 8, 3, s) - (Math.abs(((y / 16) % 1) - 0.5) < 0.04 ? 0.25 : 0), ramp: 'earth', lo: 0.08, hi: 0.55, h: 0.12 }) },
  TABARD: { f: (x, y, s) => {                         // scarlet livery, a black serpent coiled on the breast
    const u = (x / 64) % 1, v = (y / 64) % 1, cx = u - 0.5, cy = v - 0.5, r = Math.hypot(cx, cy), a = Math.atan2(cy, cx);
    const coil = Math.abs(r - 0.18 - 0.04 * a) < 0.035 && r < 0.3;
    if (coil || (v < 0.06 || v > 0.94)) return { v: 0.15, ramp: 'ink', lo: 0, hi: 0.3 };
    const dirt = tfbm(u, v, 4, 3, s + 40);
    if (dirt > 0.6) return { v: 0.25 + 0.3 * tfbm(u, v, 16, 1, s), ramp: 'scarlet', lo: 0.02, hi: 0.4 };       // old blood, dried black
    return { v: 0.5 + 0.3 * tfbm(u, v, 8, 2, s) + 0.1 * Math.sin(TAU * x / 4) - 0.3 * v * v, ramp: 'scarlet', lo: 0.15, hi: 0.85, h: 0.12 };
  } },
  HAIR: { f: (x, y, s) => ({ v: 0.3 + 0.5 * Math.abs(Math.sin(TAU * (x / 3 + tfbm(x / 64, y / 64, 4, 2, s) * 2))), ramp: 'ink', lo: 0.02, hi: 0.3 }) },
  SHIELD: { f: (x, y, s) => {                         // painted planks: scarlet with an ink chevron
    const u = x / 64, v = y / 64, plank = Math.floor(u * 5);
    if ((u * 5) % 1 < 0.06) return { v: 0.1, ramp: 'ink', lo: 0, hi: 0.3 };
    const chev = Math.abs(Math.abs(u - 0.5) - (v - 0.3) * 0.6) < 0.08;
    const worn = tfbm(u, v, 8, 3, s + plank) > 0.62;
    if (worn) return { v: 0.4 + 0.3 * tfbm(u, v, 8, 2, s), ramp: 'earth', lo: 0.15, hi: 0.6 };
    return chev ? { v: 0.3, ramp: 'ink', lo: 0.05, hi: 0.35 } : { v: 0.6 + 0.3 * tfbm(u, v, 4, 2, s), ramp: 'scarlet', lo: 0.3, hi: 0.9, h: 0.12 };
  } },
  BLOOD: { f: (x, y, s) => ({ v: 0.4 + 0.5 * tfbm(x / 64, y / 64, 4, 2, s), ramp: 'scarlet', lo: 0.2, hi: 0.8 }) },
  BANNER: { f: (x, y, s) => {
    const u = x / 64, v = y / 64, cx = u - 0.5, cy = v - 0.45, r = Math.hypot(cx, cy * 0.8);
    if (Math.abs(r - 0.22) < 0.04 || (r < 0.1 && Math.abs(cx) < 0.03)) return { v: 0.8, ramp: 'ink', lo: 0.5, hi: 0.95 };
    return { v: 0.5 + 0.3 * tfbm(u, v, 4, 3, s) + 0.15 * Math.sin(TAU * u * 3), ramp: 'scarlet', lo: 0.2, hi: 0.9, h: 0.12 };
  } },
  TAPESTRY: { f: (x, y, s) => {                      // a hanging: a woven border round a field of hunters, beasts and trees, faded and moth-eaten
    const u = x / 64, v = y / 64, b = Math.min(u, 1 - u, v, 1 - v);
    if (b < 0.06) return { v: 0.55 + 0.25 * Math.sin(TAU * (u + v) * 16), ramp: 'bronze', lo: 0.2, hi: 0.85 };
    if (b < 0.09) return { v: 0.15, ramp: 'ink', lo: 0, hi: 0.3 };
    const weave = 0.06 * ((x + y) % 2), fig = tfbm(u * 1.4, v * 1.4, 4, 3, s + 3), tree = Math.abs(Math.sin(TAU * u * 2.5)) < 0.12 && v > 0.25;
    if (tfbm(u, v, 16, 2, s + 31) > 0.78) return { v: 0.12 + weave, ramp: 'ink', lo: 0, hi: 0.3 };   // moth-holes and wear
    if (tree) return { v: 0.35 + 0.3 * fig + weave, ramp: 'jade', lo: 0.05, hi: 0.6 };
    if (fig > 0.6) return { v: 0.45 + 0.4 * (fig - 0.6) + weave, ramp: 'bronze', lo: 0.1, hi: 0.8 };
    return { v: 0.35 + 0.35 * tfbm(u, v, 8, 2, s) + weave, ramp: 'scarlet', lo: 0.1, hi: 0.75, h: 0.06 };
  } },
  OAK: { f: (x, y, s) => {                            // old black oak in vertical boards: the grain running long and wavering round knots, dark seams between
    const u = x / 64, v = y / 64, board = Math.floor(u * 4), lu = u * 4 - board, id = hrand(board, 1, s, 3);
    if (lu < 0.05 || lu > 0.96) return { v: 0.05, ramp: 'ink', lo: 0, hi: 0.2 };
    const kx = 0.5 + 0.25 * Math.sin(board * 3.7 + s), ky = 0.3 + 0.5 * hrand(board, 2, s, 3), kd = Math.hypot((lu - kx) * 3, (v - ky) * 1.2);
    const grain = Math.sin(TAU * (lu * 9 + id * 3 + 0.6 * tfbm(u, v * 0.3, 4, 3, s + board) + 0.25 / (kd + 0.25)));
    let val = 0.34 + 0.12 * grain + 0.12 * id + 0.1 * tfbm(u * 2, v * 8, 8, 2, s);
    if (kd < 0.12) val = 0.12 + kd;                                              // a knot
    val -= 0.12 * smoothstep(0.85, 1, v);                                         // darker at the foot, where hands and boots have been
    return { v: val, ramp: 'earth', lo: 0.04, hi: 0.5, h: 0.05 };
  } },
  MOSAIC: { f: (x, y, s) => {                         // "a floor of many-hued mosaics": little squared stones, a meander border
    const tx = Math.floor(x / 4), ty = Math.floor(y / 4), id = hrand(tx, ty, s, 3);
    if (x % 4 === 0 || y % 4 === 0) return { v: 0.12, ramp: 'ink', lo: 0, hi: 0.3 };
    const ring = Math.floor(Math.hypot(tx - 15.5, ty - 15.5) / 3) % 3;
    const ramp = ['bronze', 'scarlet', 'ink'][ring], v = 0.3 + 0.25 * id + 0.15 * tfbm(x / 64, y / 64, 4, 2, s);
    return { v, ramp, lo: 0.06, hi: 0.55 };
  } },
  ASHLAR: { f: (x, y, s) => {                         // finer dressed stone for ribs, pilasters, quoins: paler, close-jointed, its arrises worn
    const px = x / 64, py = y / 64, bx = Math.floor(px * 4), by = Math.floor(py * 8), lx = px * 4 - bx, ly = py * 8 - by;
    const sx = (bx + (by % 2) * 0.5), lx2 = ((px * 4 + (by % 2) * 0.5) % 1 + 1) % 1, e = Math.min(lx2, 1 - lx2) * 16, ey = Math.min(ly, 1 - ly) * 8;
    if (Math.min(e, ey) < 0.55) return { v: 0.16, ramp: 'ink', lo: 0, hi: 0.4 };
    const id = hrand(Math.floor(sx), by, s, 3);
    let v = 0.55 + 0.12 * (id - 0.5) + 0.15 * (tfbm(px, py, 8, 3, s) - 0.5) + 0.12 * (1 - smoothstep(0.55, 1.6, ey)) * (ly < 0.5 ? 1 : -1.4);
    v -= 0.18 * smoothstep(0.6, 0.85, tfbmP(px, py, 10, 2, 3, s + 5));                  // soot and seep
    return { v, ramp: 'ink', lo: 0.05, hi: 0.5, h: 0.03 };
  } },
  JET: { f: (x, y, s) => {                            // carven jet: polished black, cut in deep interlaced relief whose edges take the light, a dark jewel at each knot
    const px = x / 64, py = y / 64, u = (px * 4) % 1, v = (py * 4) % 1, cu = Math.floor(px * 4), cv = Math.floor(py * 4);
    const ring = Math.abs(Math.hypot(u - 0.5, v - 0.5) - 0.34), diag = Math.min(Math.abs(u - v), Math.abs(u + v - 1)), knot = Math.hypot(u - 0.5, v - 0.5);
    if (knot < 0.055 && hrand(cu, cv, s, 9) > 0.7) return { v: 0.5 + 0.4 * (1 - knot / 0.055), ramp: hrand(cu, cv, s, 8) > 0.5 ? 'scarlet' : 'magic', lo: 0.05, hi: 0.45, e: 0.3 };   // a dark jewel, glimmering
    if (knot < 0.075) return { v: 0.03, ramp: 'ink', lo: 0, hi: 0.3 };
    const cut = Math.min(ring, diag * 0.8);
    let t = 0.12 + 0.08 * tfbm(px, py, 8, 2, s);
    if (cut < 0.03) t = 0.015;                                                       // the cut
    else if (cut < 0.065) t += 0.75 * (1 - (cut - 0.03) / 0.035);                    // its polished lip
    if (hrand(Math.floor(x * 2), Math.floor(y * 2), s, 4) > 0.997) t = 0.55;         // a glint
    return { v: t, ramp: 'ink', lo: 0, hi: 0.7 };
  } },
  WINDOWS: { f: (x, y, s) => {                        // a town wall by night: dark plastered stone, small deep windows, a few of them lamplit
    const px = x / 64, py = y / 64, cx = Math.floor(px * 3), cy = Math.floor(py * 2), u = px * 3 - cx, v = py * 2 - cy;
    if (Math.abs(u - 0.5) < 0.12 && Math.abs(v - 0.45) < 0.18) {
      const lit = hrand(cx, cy, s, 1) < 0.38;
      return lit ? { v: 0.55 + 0.35 * hrand(cx, cy, s, 2), ramp: 'fire', lo: 0.3, hi: 0.85, e: 1 } : { v: 0.02, ramp: 'ink', lo: 0, hi: 0.1 };
    }
    return { v: 0.25 + 0.25 * tfbm(px, py, 8, 3, s) - (Math.abs(v - 0.98) < 0.03 ? 0.15 : 0), ramp: 'ink', lo: 0.04, hi: 0.35, h: 0.03 };
  } },
  CAVE: { f: (x, y, s) => {                           // wet limestone: bedded in layers, flowstone running down it, pocked
    const px = x / 64, py = y / 64, drip = tfbmP(px, py, 20, 2, 3, s), lumps = tfbm(px, py, 4, 4, s + 5);
    const bed = tfbmP(px + 0.2 * lumps, py, 1, 6, 2, s + 2), layer = Math.abs(((py * 5 + 0.6 * lumps) % 1) - 0.5);
    let v = 0.26 + 0.26 * lumps + 0.16 * (drip - 0.5) + 0.1 * (bed - 0.5);
    v -= 0.1 * (1 - smoothstep(0.0, 0.06, layer)); v += 0.05 * (smoothstep(0.04, 0.08, layer) - smoothstep(0.08, 0.14, layer));   // the bedding planes
    if (tfbm(px, py, 16, 2, s + 6) > 0.7) v -= 0.12;                                                // pocks
    if (drip > 0.66 && tfbm(px, py, 2, 2, s + 8) > 0.55) return { v: v + 0.06, ramp: 'jade', lo: 0.05, hi: 0.5, h: 0.04 };   // wet flowstone
    return { v, ramp: 'ink', lo: 0.05, hi: 0.55, h: 0.04 };
  } },
  MUD: { pre: s => makeCells(11, s), f: (x, y, s, c) => {   // cave floor: trodden mud, loose stones lying in it, standing wet in the hollows
    const px = x / 64, py = y / 64, k = cellAt(c, px, py), rad = 0.012 + 0.016 * (k.id - 0.7) / 0.3;
    if (k.id > 0.7 && k.f1 < rad) {                                     // a stone: lit on its upper side, a shadow under it
      const ck = cellAt(c, px + 0.006, py + 0.006);
      return { v: 0.3 + 0.25 * k.id + (ck.f1 > k.f1 ? 0.12 : -0.05), ramp: 'ink', lo: 0.08, hi: 0.5 };
    }
    if (k.id > 0.7 && k.f1 < rad + 0.007) return { v: 0.06, ramp: 'earth', lo: 0, hi: 0.3 };
    const n = tfbm(px, py, 4, 3, s + 4);
    if (n > 0.7) return { v: 0.3 + 0.4 * tfbm(px, py, 16, 1, s), ramp: 'jade', lo: 0, hi: 0.26, e: 0.02 };    // standing wet
    let v = 0.2 + 0.25 * tfbm(px, py, 8, 3, s) + 0.08 * (tfbm(px, py, 32, 1, s + 2) - 0.5) - 0.1 * smoothstep(0.6, 0.7, n);
    if (hrand(Math.floor(x * 2), Math.floor(y * 2), s, 12) > 0.96) v += 0.15;                                  // grit
    if (Math.abs(tfbm(px, py, 6, 2, s + 11) - 0.5) < 0.012) v -= 0.1;                                       // footworn ruts
    return { v, ramp: 'earth', lo: 0.04, hi: 0.5, h: 0.03 };
  } },
  GRIME: { f: (x, y, s) => ({ v: 0.5 * tfbm(x / 64, y / 64, 2, 4, s) + 0.5 * tfbm(x / 64, y / 64, 4, 3, s + 3), ramp: 'ink', lo: 0, hi: 1 }) },   // large-scale stain map (renderer)
  PALE: { f: (x, y, s) => {                           // corpse-pale hide, blue-green veins
    const px = x / 64, py = y / 64;
    if (Math.abs(tfbm(px, py, 4, 3, s + 2) - 0.5) < 0.014) return { v: 0.4, ramp: 'jade', lo: 0.15, hi: 0.55 };
    return { v: 0.45 + 0.35 * tfbm(px, py, 8, 4, s) - (hrand(Math.floor(x * 2), Math.floor(y * 2), s, 5) > 0.95 ? 0.2 : 0), ramp: 'ink', lo: 0.3, hi: 0.7, h: 0.05 };
  } },
  SICK: { f: (x, y, s) => {                           // Shukeli: sallow, blotched, sweating
    const px = x / 64, py = y / 64, b = tfbm(px, py, 4, 3, s + 6);
    if (b > 0.6) return { v: 0.4 + 0.3 * tfbm(px, py, 16, 1, s), ramp: 'jade', lo: 0.3, hi: 0.68 };
    return { v: 0.5 + 0.3 * tfbm(px, py, 8, 4, s), ramp: 'earth', lo: 0.32, hi: 0.78, h: 0.05 };
  } },
  PLANK: { f: (x, y, s) => {                          // rotten planks
    const px = x / 64, py = y / 64, b = Math.floor(px * 4), l = px * 4 - b;
    if (l < 0.06) return { v: 0.05, ramp: 'ink', lo: 0, hi: 0.2 };
    return { v: 0.3 + 0.3 * tfbmP(px + b * 0.25, py, 32, 2, 3, s + b) - 0.2 * smoothstep(0.55, 0.8, tfbm(px, py, 4, 2, s)), ramp: 'earth', lo: 0.04, hi: 0.5, h: 0.05 };
  } },
  // ---- decals: alpha is a cut-out mask, so only the cuts are drawn ----------
  // Scratched writing: rows of angular glyphs gouged by hand, uneven pressure, a few false starts.
  SCRATCH: { pre: s => {
    const r = new RNG(s), segs = [];
    for (let row = 0; row < 5; row++) {
      let x = 0.05 + r.range(0, 0.04);
      while (x < 0.92) {
        const gx = x, gy = 0.14 + row * 0.18 + r.range(-0.015, 0.015), w = r.range(0.035, 0.07), n = r.int(2, 4);
        for (let k = 0; k < n; k++) {
          const a = [gx + r.range(0, w), gy + r.range(-0.05, 0.05)], b = [gx + r.range(0, w), gy + r.range(-0.05, 0.05)];
          segs.push([a, b, r.range(0.005, 0.009)]);
        }
        x += w + r.range(0.015, 0.035);
        if (r.chance(0.12)) x += 0.05;                     // a word gap
      }
    }
    return segs;
  }, f: (x, y, s, segs) => {
    const px = x / 64, py = y / 64;
    let best = 1;
    for (const [a, b, wd] of segs) {
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-6, t = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / l2, 0, 1);
      const d = Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t) / wd;
      if (d < best) best = d;
    }
    if (best >= 1) return { v: 0, ramp: 'ink', e: 0, cut: false };
    // the gouge: pale scraped stone, a dark lip on one side where the stone broke away
    return { v: best < 0.55 ? 0.75 + 0.2 * tfbm(px, py, 16, 1, s) : 0.12, ramp: 'ink', lo: 0.1, hi: 0.85, cut: true };
  } },
  TALLY1: { f: (x, y, s) => tallyTex(x, y, s, 1) },
  TALLY2: { f: (x, y, s) => tallyTex(x, y, s, 2) },
  TALLY3: { f: (x, y, s) => tallyTex(x, y, s, 3) },
  // ---- e1m1, the plain of Shamu -----------------------------------------
  TURF: { pre: s => makeCells(9, s), f: (x, y, s, c) => {       // trampled meadow: tufted grass, bare earth where the hosts trod it, a stone, dried blood
    const px = x / 64, py = y / 64, k = cellAt(c, px, py);
    if (k.id > 0.9 && k.f1 < 0.014) return { v: 0.45 + 0.3 * k.id, ramp: 'ink', lo: 0.1, hi: 0.5 };            // a stone
    const worn = tfbm(px, py, 3, 3, s + 7), blood = tfbm(px, py, 6, 3, s + 17);
    if (blood > 0.7 && tfbm(px, py, 24, 2, s + 19) > 0.42) return { v: 0.2 + 0.4 * tfbm(px, py, 16, 1, s), ramp: 'scarlet', lo: 0.02, hi: 0.32 };   // blood, dried dark
    const grass = smoothstep(0.4, 0.62, worn);                    // the earth shows where the grass is trodden away
    const tk = cellAt(c, px * 4, py * 4), tuft = tk.f1 * 4 < 0.05 + 0.04 * grass && tk.id < grass;   // tufts: dark at the root, the dry blade-tips lit
    if (tuft) { const t = 1 - tk.f1 * 4 / (0.09); return { v: 0.18 + 0.4 * t + 0.1 * hrand(Math.floor(x), Math.floor(y), s, 33), ramp: tk.id > 0.5 ? 'bronze' : 'jade', lo: 0.03, hi: tk.id > 0.5 ? 0.4 : 0.42 }; }
    if (grass > 0.3 && hrand(Math.floor(x), Math.floor(y), s, 34) < 0.25 * grass) return { v: 0.2 + 0.2 * grass, ramp: 'jade', lo: 0.03, hi: 0.36 };
    let v = 0.22 + 0.3 * tfbm(px, py, 8, 3, s + 3) - 0.08 * smoothstep(0.2, 0.35, -worn + 0.6);
    if (Math.abs(tfbm(px, py, 5, 2, s + 9) - 0.5) < 0.014) v -= 0.12;   // a hoof-scarred rut
    return { v, ramp: 'earth', lo: 0.04, hi: 0.48, h: 0.03 };
  } },
  GILT: { f: (x, y, s) => {                                     // Ophir's gilded mail
    const row = Math.floor(y / 3), fx = ((x + (row % 2) * 1.5) / 3) % 1, fy = (y / 3) % 1, d = Math.abs(Math.hypot(fx - 0.5, fy - 0.5) - 0.3);
    return { v: d < 0.12 ? 0.9 - d * 3 : 0.2, ramp: 'bronze', lo: 0.1, hi: 1, e: 0.05 };
  } },
  BLACKMAIL: { f: (x, y, s) => {                               // the king's black mail
    const row = Math.floor(y / 3), fx = ((x + (row % 2) * 1.5) / 3) % 1, fy = (y / 3) % 1, d = Math.abs(Math.hypot(fx - 0.5, fy - 0.5) - 0.3);
    return { v: d < 0.12 ? 0.6 - d * 3 : 0.05, ramp: 'night', lo: 0.0, hi: 0.6 };
  } },
  HIDE: { f: (x, y, s) => ({ v: 0.35 + 0.35 * tfbm(x / 64, y / 64, 8, 3, s) + 0.1 * Math.sin(TAU * y / 5), ramp: 'earth', lo: 0.04, hi: 0.5, h: 0.04 }) },
  SUNSET: { f: (x, y, s) => {                                   // "The sun sets": banded cloud over a red sky
    const px = x / 64, py = y / 64, band = 0.6 * tfbmP(px, py, 1, 4, 3, s) + 0.4 * tfbm(px, py, 2, 2, s + 4);
    return { v: 0.35 + 0.5 * band, ramp: 'scarlet', lo: 0.35, hi: 0.95, e: 0.9 };
  } },
  FACE: { f: (x, y, s) => ({ v: 0.6 + 0.2 * tfbm(x / 64, y / 64, 8, 3, s) - (hrand(Math.floor(x), Math.floor(y), s, 4) > 0.9 ? 0.12 : 0), ramp: 'earth', lo: 0.25, hi: 0.78, h: 0.05 }) },
  // ---- the later cast's liveries (the book names no colours for these hosts; ours keep each side apart at a glance)
  LIVERY_POITAIN: { f: (x, y, s) => livery(x, y, s, 'night', 'bronze', 'cross') },   // Trocero's Poitanians: night-blue, a bronze cross
  LIVERY_PELLIA: { f: (x, y, s) => livery(x, y, s, 'bronze', 'ink', 'halves') },     // Arpello's Pellians: tawny and black, per pale
  LIVERY_BOSSON: { f: (x, y, s) => ({ v: 0.4 + 0.3 * tfbm(x / 64, y / 64, 8, 3, s) - (Math.abs(((y / 16) % 1) - 0.5) < 0.04 ? 0.25 : 0), ramp: 'jade', lo: 0.08, hi: 0.5, h: 0.12 }) },   // a green jerkin
  LIVERY_GUNDER: { f: (x, y, s) => livery(x, y, s, 'ink', 'scarlet', 'cross') },      // Gunderland: a dark surcoat over the mail, a scarlet cross
  VELVET: { f: (x, y, s) => ({ v: 0.45 + 0.25 * tfbm(x / 64, y / 64, 8, 3, s) - 0.2 * tfbm(x / 64, y / 64, 2, 2, s + 9), ramp: 'scarlet', lo: 0.02, hi: 0.4, h: 0.08 }) },   // Ascalante's worn velvet
  TAWNY: { f: (x, y, s) => ({ v: 0.35 + 0.5 * Math.abs(Math.sin(TAU * (x / 3 + tfbm(x / 64, y / 64, 4, 2, s) * 2))), ramp: 'bronze', lo: 0.1, hi: 0.7 }) },   // "their tawny locks"
  DEMON_HIDE: { f: (x, y, s) => {                       // the baboon-shape: grey pelt, shadow in the fur
    const fur = Math.abs(Math.sin(TAU * (x / 2.5 + tfbm(x / 64, y / 64, 4, 2, s) * 3)));
    return { v: 0.25 + 0.35 * fur + 0.2 * tfbm(x / 64, y / 64, 8, 3, s + 1), ramp: 'night', lo: 0.02, hi: 0.55, h: 0.06 };
  } },
  YOTHGA_STEM: { f: (x, y, s) => {                      // "a repulsively supple stalk": pale, veined, wet
    const vein = Math.abs(Math.sin(TAU * (x / 64 * 3 + tfbm(x / 64, y / 64, 4, 2, s) * 1.5))) < 0.08;
    return vein ? { v: 0.4, ramp: 'scarlet', lo: 0.1, hi: 0.6, e: 0.15 } : { v: 0.5 + 0.3 * tfbm(x / 64, y / 64, 8, 3, s), ramp: 'jade', lo: 0.2, hi: 0.85, h: 0.05 };
  } },
  YOTHGA_BLOOM: { f: (x, y, s) => {                     // "a livid, unnatural crimson, like a perversity of flower-life"
    const u = x / 64, v = y / 64, rib = Math.abs(Math.sin(TAU * u * 5)) < 0.12;
    return { v: 0.55 + 0.3 * tfbm(u, v, 8, 2, s) - (rib ? 0.3 : 0) + 0.25 * v, ramp: 'scarlet', lo: 0.15, hi: 1, e: 0.35 };
  } },
  YOTHGA_LEAF: { f: (x, y, s) => {                      // "strangely pointed leaves"
    const u = x / 64, v = y / 64, vein = Math.abs(((u * 6) % 1) - 0.5) < 0.05 || Math.abs(u - 0.5) < 0.02;
    return { v: vein ? 0.75 : 0.3 + 0.3 * tfbm(u, v, 8, 2, s), ramp: 'jade', lo: 0.05, hi: 0.6 };
  } },
  FEATHER: { f: (x, y, s) => {                          // the eagle: barred brown feathers
    const u = x / 64, v = y / 64, bar = ((v * 9 + tfbm(u, v, 4, 2, s) * 0.6) % 1) < 0.25;
    return { v: (bar ? 0.2 : 0.55) + 0.2 * tfbm(u, v, 8, 2, s), ramp: 'earth', lo: 0.04, hi: 0.7, h: 0.05 };
  } },
};

// a herald's coat: field and charge from two ramps; worn, stained, hatched like the rest
function livery(x, y, s, field, charge, kind) {
  const u = (x / 64) % 1, v = (y / 64) % 1;
  const on = kind === 'cross' ? (Math.abs(u - 0.5) < 0.07 || Math.abs(v - 0.45) < 0.07) : kind === 'halves' ? u > 0.5 : Math.floor(v * 6) % 2 === 1;
  if (v < 0.04 || v > 0.96) return { v: 0.15, ramp: 'ink', lo: 0, hi: 0.3 };
  const dirt = tfbm(u, v, 4, 3, s + 40) > 0.64;
  if (dirt) return { v: 0.3 + 0.3 * tfbm(u, v, 16, 1, s), ramp: 'earth', lo: 0.02, hi: 0.35 };
  return { v: 0.55 + 0.3 * tfbm(u, v, 8, 2, s) + 0.1 * Math.sin(TAU * x / 4) - 0.25 * v * v, ramp: on ? charge : field, lo: 0.15, hi: 0.85, h: 0.12 };
}
function tallyTex(x, y, s, n) {                      // n deep vertical cuts, slightly crooked
  const px = x / 64, py = y / 64;
  for (let k = 0; k < n; k++) {
    const cx = 0.5 + (k - (n - 1) / 2) * 0.17 + (py - 0.5) * 0.06 * (k % 2 ? 1 : -1);
    const d = Math.abs(px - cx) / (0.025 * (1 - Math.abs(py - 0.5) * 0.6));
    if (py > 0.12 && py < 0.88 && d < 1) return { v: d < 0.5 ? 0.8 : 0.12, ramp: 'ink', lo: 0.1, hi: 0.85, cut: true };
  }
  return { v: 0, ramp: 'ink', cut: false };
}
// ---- painted faces (Quake's way: a plain head, the features in the skin) -------
// UV: u runs round the head with the face centred on u = 0; v runs up it (0.2 chin, 0.61 eyes, 1 crown).
function faceSpace(x, y) { const u = x / 64, v = y / 64; return { du: u > 0.5 ? u - 1 : u, v }; }
const ell = (du, v, cx, cy, rx, ry) => Math.hypot((du - cx) / rx, (v - cy) / ry);
function seg(du, v, x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy, t = clamp(((du - x0) * dx + (v - y0) * dy) / l2, 0, 1); return Math.hypot(du - x0 - dx * t, v - y0 - dy * t); }
function paintFace(x, y, s, F) {
  const { du, v } = faceSpace(x, y), a = Math.abs(du);
  let t = 0.5 + 0.12 * tfbm(x / 64, y / 64, 16, 2, s) - 0.25 * smoothstep(0.18, 0.3, a);       // turning away from the light
  t += 0.18 * Math.exp(-(ell(a, v, 0.075, 0.54, 0.05, 0.05) ** 2));                              // cheekbones
  t += F.brow * Math.exp(-(ell(a, v, 0.05, 0.68, 0.08, 0.02) ** 2));                              // brow ridge
  t -= F.hollow * Math.exp(-(ell(a, v, 0.085, 0.47, 0.03, 0.05) ** 2));                           // hollow cheeks
  t -= 0.12 * Math.exp(-(ell(du, v, 0, 0.3, 0.08, 0.06) ** 2));                                   // under the jaw
  if (F.jowls) t -= 0.22 * Math.exp(-(ell(a, v, 0.075, 0.36, 0.045, 0.035) ** 2)), t += 0.15 * Math.exp(-(ell(a, v, 0.07, 0.43, 0.05, 0.03) ** 2));
  // nose: a lit bridge, shadowed nostrils
  if (a < F.nose && v > 0.49 && v < 0.63) t += 0.2 * (1 - a / F.nose);
  if (ell(a, v, 0.017, 0.495, 0.011, 0.007) < 1) return { v: 0.04, ramp: 'ink', lo: 0, hi: 0.2 };
  // eyes in their sockets
  const sock = ell(a, v, 0.062, 0.61, F.sock[0], F.sock[1]);
  if (sock < 1) {
    const eye = ell(a, v, 0.062, 0.608, F.eye[0], F.eye[1]);
    if (eye < 1 && F.blue) return { v: eye < 0.45 ? 0.05 : 0.75, ramp: 'night', lo: 0.1, hi: 1, e: eye < 0.45 ? 0 : 0.25 };
    if (eye < 1) return F.glow ? { v: 0.6 + 0.4 * (1 - eye), ramp: 'fire', lo: 0.25, hi: 1, e: F.glow } : { v: eye < 0.45 ? 0.05 : 0.8, ramp: 'ink', lo: 0, hi: 0.9 };
    t -= 0.45 * (1 - sock * 0.6);
  }
  // mouth
  const m = F.mouth(du, v);
  if (m) return m;
  for (const [x0, y0, x1, y1] of F.scars || []) if (seg(du, v, x0, y0, x1, y1) < 0.006) return { v: 0.7, ramp: 'ink', lo: 0.3, hi: 0.6 };
  return F.skin(t, du, v);
}
const FACES = {
  // the strangler: "his eyes glinted redly in the torchlight", "showing white tusks", a shaved skull
  FACE_BRUTE: { brow: 0.3, hollow: 0.05, nose: 0.024, sock: [0.04, 0.034], eye: [0.018, 0.01], glow: 0.55, scars: [[0.04, 0.78, 0.11, 0.55], [-0.08, 0.42, -0.05, 0.33]],
    mouth: (du, v) => {
      const a = Math.abs(du), lip = 0.425 + 0.6 * du * du;                                     // a wide grin
      if (a < 0.055 && Math.abs(v - lip) < 0.018) {
        if (Math.abs(v - lip - 0.006) < 0.007 && (Math.floor(a * 160) % 2 === 0 || a > 0.03)) return { v: 0.85, ramp: 'ink', lo: 0.55, hi: 1 };   // teeth and tusks
        return { v: 0.1, ramp: 'scarlet', lo: 0, hi: 0.3 };
      }
      return null;
    },
    skin: (t) => ({ v: t, ramp: 'earth', lo: 0.04, hi: 0.5, h: 0.05 }) },
  // Shukeli: "a fat repellent figure", a face "like a fiendishly mocking carven gargoyle"
  FACE_EUNUCH: { brow: 0.05, hollow: 0, nose: 0.02, jowls: true, sock: [0.03, 0.016], eye: [0.012, 0.005], glow: 0,
    mouth: (du, v) => {
      const a = Math.abs(du), lip = 0.43 + 0.1 * (0.06 - a) - 6 * Math.max(0, a - 0.04) ** 2 * 30;   // a leer, turned up at the corners
      if (a < 0.065 && Math.abs(v - lip) < 0.009) return Math.abs(v - lip) < 0.004 && a < 0.04 && Math.floor(a * 130) % 2 ? { v: 0.8, ramp: 'ink', lo: 0.5, hi: 0.9 } : { v: 0.15, ramp: 'scarlet', lo: 0, hi: 0.35 };
      return null;
    },
    skin: (t, du, v) => hrand(Math.floor(du * 900), Math.floor(v * 400), 3, 3) > 0.985 ? { v: 0.9, ramp: 'ink', lo: 0.6, hi: 0.9 } : { v: t, ramp: 'earth', lo: 0.3, hi: 0.8, h: 0.04 } },
  // Tsotha-lanti: "the lean vulture", eyes like a beast's
  FACE_VULTURE: { brow: 0.2, hollow: 0.3, nose: 0.03, sock: [0.045, 0.038], eye: [0.013, 0.009], glow: 0.9, scars: [],
    mouth: (du, v) => Math.abs(du) < 0.04 && Math.abs(v - 0.42) < 0.004 ? { v: 0.05, ramp: 'ink', lo: 0, hi: 0.2 } : null,
    skin: (t, du, v) => (Math.abs(du) < 0.08 && v > 0.72 && v < 0.82 && Math.abs(((v * 90) % 1) - 0.5) < 0.08) ? { v: t - 0.2, ramp: 'ink', lo: 0.2, hi: 0.6 } : { v: t, ramp: 'ink', lo: 0.28, hi: 0.72, h: 0.04 } },
  // Conan: "his dark scarred face", "the savage blue eyes blazing", under "the tangled black mane"
  FACE_CONAN: { brow: 0.32, hollow: 0.08, nose: 0.026, sock: [0.042, 0.03], eye: [0.016, 0.008], glow: 0, blue: true, scars: [[0.05, 0.66, 0.1, 0.5], [-0.03, 0.4, 0.02, 0.36]],
    mouth: (du, v) => Math.abs(du) < 0.045 && Math.abs(v - 0.425 + 2 * du * du) < 0.006 ? { v: 0.06, ramp: 'scarlet', lo: 0, hi: 0.25 } : null,
    skin: (t) => ({ v: t, ramp: 'earth', lo: 0.12, hi: 0.68, h: 0.05 }) },
  // Pelias freed: "the worn face", "a high splendid forehead", eyes "dark and meditative"
  FACE_SAGE: { brow: 0.08, hollow: 0.35, nose: 0.024, sock: [0.04, 0.03], eye: [0.012, 0.008], glow: 0, scars: [],
    mouth: (du, v) => Math.abs(du) < 0.035 && Math.abs(v - 0.42 - 0.8 * du * du) < 0.004 ? { v: 0.05, ramp: 'ink', lo: 0, hi: 0.2 } : null,
    skin: (t, du, v) => ({ v: t + 0.08 * smoothstep(0.7, 0.9, v), ramp: 'ink', lo: 0.3, hi: 0.78, h: 0.04 }) },
  // Ascalante: "a sardonic countenance", the outlaw count
  FACE_OUTLAW: { brow: 0.18, hollow: 0.22, nose: 0.028, sock: [0.04, 0.026], eye: [0.013, 0.007], glow: 0, scars: [[-0.09, 0.62, -0.05, 0.4]],
    mouth: (du, v) => { const a = du, lip = 0.425 + 0.35 * Math.max(0, a) - 0.1 * Math.max(0, -a); return Math.abs(du) < 0.045 && Math.abs(v - lip) < 0.005 ? { v: 0.05, ramp: 'ink', lo: 0, hi: 0.2 } : null; },   // a one-sided smile
    skin: (t, du, v) => v < 0.42 && Math.abs(du) < 0.1 && tfbm(du * 6, v * 6, 16, 1, 7) > 0.55 ? { v: 0.12, ramp: 'ink', lo: 0, hi: 0.3 } : { v: t, ramp: 'earth', lo: 0.22, hi: 0.72, h: 0.05 } },   // a dark stubble
};
for (const k in FACES) TEXGEN[k] = { f: (x, y, s) => paintFace(x, y, s, FACES[k]) };

function generateTextures() {
  const S = TEX_SIZE, out = [];
  for (let li = 0; li < TEX_NAMES.length; li++) {
    const spec = TEXGEN[TEX_NAMES[li]], seed = 4000 + li * 131, pre = spec.pre ? spec.pre(seed) : null;
    const data = new Uint8Array(S * S * 4);
    const k = 64 / S;                                 // recipes are written in 64-texel space
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const r = spec.f(x * k, y * k, seed, pre);
      let v = r.v;
      if (r.h) v = hatch(v, x, y, r.h);
      const rgb = rampAt(r.ramp, clamp(v, 0, 1), r.lo || 0, r.hi === undefined ? 1 : r.hi, x, y);
      const o = (y * S + x) * 4;
      data[o] = rgb[0]; data[o + 1] = rgb[1]; data[o + 2] = rgb[2]; data[o + 3] = r.cut !== undefined ? (r.cut ? 255 : 0) : Math.round(clamp(r.e || 0, 0, 1) * 255);
    }
    out.push(data);
  }
  return out;
}
