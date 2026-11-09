'use strict';
// ---------------------------------------------------------------------------
// Procedural 64x64 textures built from the Cimmerian ramps (README §7).
// e1m2 declares ramps [ink, jade, fire]: ink dominates, jade is the pits'
// damp and Satha's scales, fire is the only fullbright (torches, eyes).
// Every texture gets the engraving hatch layer so the 3D world matches the
// engraved splash screens. The alpha channel is the EMISSIVE mask.
// ---------------------------------------------------------------------------

const TEX_NAMES = ['HEWN', 'ROCK', 'FLAG', 'SLIME', 'WATER', 'IRON', 'WOOD', 'SCALES', 'BELLY', 'SKIN', 'DARKSKIN',
  'CLOTH', 'ROBE', 'BONE', 'FIRE', 'EYE', 'VENOM', 'BLACK', 'STRAW', 'SKY'];
const T = {};
TEX_NAMES.forEach((n, i) => { T[n] = i; });
const TEX_SIZE = 64;

function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
// n-step ramp between two anchors, slightly gamma-curved like Quake's palette rows
function makeRamp(lo, hi, n, gamma = 1.15) {
  const a = hexRgb(lo), b = hexRgb(hi), out = [];
  for (let i = 0; i < n; i++) {
    const t = Math.pow(i / (n - 1), gamma);
    out.push([0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * t)));
  }
  return out;
}
const RAMPS = {
  ink: makeRamp('#0b0a09', '#e8dcc0', 16),
  jade: makeRamp('#08120c', '#7fa88a', 12),
  fire: makeRamp('#5a1a00', '#ffd27a', 10, 0.9),
  scarlet: makeRamp('#2a0606', '#c4302b', 10),     // UI only in this level
};
function rampAt(name, v, lo = 0, hi = 1) {
  const r = RAMPS[name], t = clamp(lo + (hi - lo) * v, 0, 0.999);
  return r[Math.floor(t * r.length)];
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
  HEWN: { pre: s => s, f: (x, y, s) => {             // dressed stone courses (Piranesi's prisons)
    const px = x / 64, py = y / 64, row = Math.floor(py * 4), off = (row % 2) * 0.5, bx = (px * 2 + off) % 1;
    const ly = py * 4 - row;
    if (ly < 0.06 || bx < 0.03) return { v: 0.05, ramp: 'ink', hi: 0.4 };
    let v = 0.45 + 0.35 * tfbm(px, py, 4, 3, s + row) + 0.12 * hrand(row, Math.floor(px * 2 + off), s, 4) - 0.25 * (ly > 0.88 ? 1 : 0);
    const damp = tfbm(px, py, 2, 3, s + 9);
    if (damp > 0.62 && py > 0.5) return { v: v * 0.8, ramp: 'jade', hi: 0.7, h: 0.3 };
    return { v, ramp: 'ink', hi: 0.42, h: 0.3 };
  } },
  ROCK: { pre: s => makeCells(5, s), f: (x, y, s, c) => {    // raw pit rock
    const px = x / 64, py = y / 64;
    let v = tfbm(px, py, 4, 4, s) * 0.85 + tfbm(px, py, 16, 2, s + 9) * 0.25;
    const k = cellAt(c, px, py); if (k.f2 - k.f1 < 0.015) v -= 0.4;
    if (tfbm(px, py, 2, 3, s + 3) > 0.6) return { v: v * 0.9, ramp: 'jade', hi: 0.6, h: 0.3 };
    return { v, ramp: 'ink', hi: 0.38, h: 0.3 };
  } },
  FLAG: { pre: s => makeCells(4, s), f: (x, y, s, c) => {     // wet flagstones, jade in the joints
    const px = x / 64, py = y / 64, k = cellAt(c, px, py);
    if (k.f2 - k.f1 < 0.035) return { v: 0.4 + 0.3 * tfbm(px, py, 8, 2, s), ramp: 'jade', hi: 0.5 };
    return { v: 0.35 + 0.35 * k.id + 0.25 * tfbm(px, py, 8, 3, s), ramp: 'ink', hi: 0.4, h: 0.25 };
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
    return { v, ramp: 'jade', lo: 0.12, hi: 1, h: 0.2 };
  } },
  BELLY: { f: (x, y, s) => ({ v: 0.55 + 0.3 * ((Math.floor(y / 8)) % 2) + 0.15 * tfbm(x / 64, y / 64, 4, 2, s), ramp: 'jade', lo: 0.4, hi: 1 }) },
  SKIN: { f: (x, y, s) => ({ v: tfbm(x / 64, y / 64, 8, 4, s), ramp: 'ink', lo: 0.35, hi: 0.62, h: 0.15 }) },
  DARKSKIN: { f: (x, y, s) => ({ v: tfbm(x / 64, y / 64, 8, 4, s), ramp: 'ink', lo: 0.06, hi: 0.3, h: 0.1 }) },
  CLOTH: { f: (x, y, s) => ({ v: 0.35 + ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) * 0.15 + tfbm(x / 64, y / 64, 8, 2, s) * 0.35, ramp: 'ink', lo: 0.04, hi: 0.3 }) },
  ROBE: { f: (x, y, s) => {                           // Shukeli's robe: bone cloth, jade hem stripes
    const py = y / 64;
    if (py > 0.8 && py < 0.88) return { v: 0.6, ramp: 'jade', lo: 0.3, hi: 0.9 };
    return { v: 0.5 + 0.4 * tfbm(x / 64, py, 4, 3, s) + 0.1 * Math.sin(TAU * x / 8), ramp: 'ink', lo: 0.35, hi: 0.85, h: 0.3 };
  } },
  BONE: { f: (x, y, s) => ({ v: 0.5 + tfbm(x / 64, y / 64, 8, 3, s) * 0.5 - (hrand(x, y, s, 2) > 0.95 ? 0.4 : 0), ramp: 'ink', lo: 0.45, hi: 1, h: 0.15 }) },
  FIRE: { f: (x, y, s) => ({ v: 0.2 + 0.8 * tfbm(x / 64, y / 64, 4, 3, s), ramp: 'fire', e: 1 }) },
  EYE: { f: (x, y, s) => ({ v: 0.4 + 0.6 * tfbm(x / 64, y / 64, 8, 2, s), ramp: 'fire', lo: 0.4, e: 1 }) },
  VENOM: { f: (x, y, s) => ({ v: 0.3 + 0.7 * tfbm(x / 64, y / 64, 4, 3, s), ramp: 'jade', lo: 0.4, hi: 1, e: 0.7 }) },
  BLACK: { f: (x, y, s) => ({ v: tfbm(x / 64, y / 64, 8, 2, s), ramp: 'ink', hi: 0.08 }) },
  STRAW: { f: (x, y, s) => ({ v: 0.3 + 0.5 * Math.abs(Math.sin(TAU * (x * 0.13 + tfbm(x / 64, y / 64, 4, 2, s) * 3))), ramp: 'ink', lo: 0.12, hi: 0.5, h: 0.2 }) },
  SKY: { f: (x, y, s) => ({ v: 0.6 + 0.4 * tfbm(x / 64, y / 64, 2, 3, s), ramp: 'ink', lo: 0.4, hi: 0.75, e: 1 }) },  // daylight through the grating
};

function generateTextures() {
  const S = TEX_SIZE, out = [];
  for (let li = 0; li < TEX_NAMES.length; li++) {
    const spec = TEXGEN[TEX_NAMES[li]], seed = 4000 + li * 131, pre = spec.pre ? spec.pre(seed) : null;
    const data = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const r = spec.f(x, y, seed, pre);
      let v = r.v;
      if (r.h) v = hatch(v, x, y, r.h);
      const rgb = rampAt(r.ramp, clamp(v, 0, 1), r.lo || 0, r.hi === undefined ? 1 : r.hi);
      const o = (y * S + x) * 4;
      data[o] = rgb[0]; data[o + 1] = rgb[1]; data[o + 2] = rgb[2]; data[o + 3] = Math.round(clamp(r.e || 0, 0, 1) * 255);
    }
    out.push(data);
  }
  return out;
}
