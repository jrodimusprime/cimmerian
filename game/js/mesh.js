'use strict';
// ---------------------------------------------------------------------------
// Geometry (from The Endless Cave engine): flat-shaded low-poly meshes.
// Vertex = pos3 nor3 col3 layer1.
// For world meshes `col` is baked light; for entity models it is a tint.
// ---------------------------------------------------------------------------

class MeshBuilder {
  constructor(cap = 4096) { this.d = new Float32Array(cap * 10); this.n = 0; }
  ensure(k) {
    if ((this.n + k) * 10 > this.d.length) {
      const nd = new Float32Array(Math.max(this.d.length * 2, (this.n + k) * 10));
      nd.set(this.d); this.d = nd;
    }
  }
  v(p, nx, ny, nz, col, l) {
    const o = this.n * 10, d = this.d;
    d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = nx; d[o + 4] = ny; d[o + 5] = nz;
    d[o + 6] = col[0]; d[o + 7] = col[1]; d[o + 8] = col[2]; d[o + 9] = l;
    this.n++;
  }
  // triangle with a facing hint vector; the normal is flipped to agree with it
  tri(a, b, c, layer, hx, hy, hz, col = ONE3) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) return;
    nx /= len; ny /= len; nz /= len;
    this.ensure(3);
    if (nx * hx + ny * hy + nz * hz < 0) { nx = -nx; ny = -ny; nz = -nz; this.v(a, nx, ny, nz, col, layer); this.v(c, nx, ny, nz, col, layer); this.v(b, nx, ny, nz, col, layer); }
    else { this.v(a, nx, ny, nz, col, layer); this.v(b, nx, ny, nz, col, layer); this.v(c, nx, ny, nz, col, layer); }
  }
  // triangle facing away from a centre point (convex shapes)
  triC(a, b, c, layer, ctr, col) {
    this.tri(a, b, c, layer, (a[0] + b[0] + c[0]) / 3 - ctr[0], (a[1] + b[1] + c[1]) / 3 - ctr[1], (a[2] + b[2] + c[2]) / 3 - ctr[2], col);
  }
  quad(a, b, c, d, layer, hx, hy, hz, col) { this.tri(a, b, c, layer, hx, hy, hz, col); this.tri(a, c, d, layer, hx, hy, hz, col); }
  // a triangle with a colour per corner (baked occlusion: the light is multiplied into it later)
  triV(a, b, c, layer, hx, hy, hz, ka, kb, kc) {
    const n0 = this.n; this.tri(a, b, c, layer, hx, hy, hz);
    if (this.n === n0) return;
    const d = this.d, o1 = (n0 + 1) * 10, flip = d[o1] === c[0] && d[o1 + 1] === c[1] && d[o1 + 2] === c[2] && !(b[0] === c[0] && b[1] === c[1] && b[2] === c[2]);   // tri() wrote a, c, b
    const ks = flip ? [ka, kc, kb] : [ka, kb, kc];
    for (let q = 0; q < 3; q++) { const o = (n0 + q) * 10; d[o + 6] = ks[q]; d[o + 7] = ks[q]; d[o + 8] = ks[q]; }
  }
  quadV(a, b, c, d, layer, hx, hy, hz, ka, kb, kc, kd) { this.triV(a, b, c, layer, hx, hy, hz, ka, kb, kc); this.triV(a, c, d, layer, hx, hy, hz, ka, kc, kd); }
  quadC(a, b, c, d, layer, ctr, col) { this.triC(a, b, c, layer, ctr, col); this.triC(a, c, d, layer, ctr, col); }
  finish() { return this.d.slice(0, this.n * 10); }
}
const ONE3 = [1, 1, 1];

// ---- primitive helpers ----------------------------------------------------
// lathe around an arbitrary axis. profile = [[radius, height], ...]
function addLathe(mb, ox, oy, oz, profile, sides, layer, rot = 0, col = ONE3, axis = null) {
  let ax = [0, 1, 0], u = [1, 0, 0], w = [0, 0, 1];
  if (axis) {
    ax = axis;
    const ref = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    u = norm3(cross3(ax, ref)); w = cross3(ax, u);
  }
  let ymin = 1e9, ymax = -1e9;
  for (const p of profile) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
  const ym = (ymin + ymax) / 2;
  const ctr = [ox + ax[0] * ym, oy + ax[1] * ym, oz + ax[2] * ym];
  const P = (r, h, a) => {
    const c = Math.cos(a) * r, s = Math.sin(a) * r;
    return [ox + ax[0] * h + u[0] * c + w[0] * s, oy + ax[1] * h + u[1] * c + w[1] * s, oz + ax[2] * h + u[2] * c + w[2] * s];
  };
  for (let k = 0; k < profile.length - 1; k++) {
    const [r0, h0] = profile[k], [r1, h1] = profile[k + 1];
    for (let s = 0; s < sides; s++) {
      const a0 = s / sides * Math.PI * 2 + rot, a1 = (s + 1) / sides * Math.PI * 2 + rot;
      mb.quadC(P(r0, h0, a0), P(r0, h0, a1), P(r1, h1, a1), P(r1, h1, a0), layer, ctr, col);
    }
  }
}
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm3(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

function addBox(mb, cx, cy, cz, hx, hy, hz, layer, rotY = 0, col = ONE3, rotX = 0) {
  const c = Math.cos(rotY), s = Math.sin(rotY), cx2 = Math.cos(rotX), sx2 = Math.sin(rotX);
  const P = (x, y, z) => {
    const y2 = y * cx2 - z * sx2, z2 = y * sx2 + z * cx2;
    return [cx + x * c + z2 * s, cy + y2, cz - x * s + z2 * c];
  };
  const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
  const ctr = [cx, cy, cz];
  const F = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
  for (const f of F) mb.quadC(v[f[0]], v[f[1]], v[f[2]], v[f[3]], layer, ctr, col);
}

const ICO_V = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  return [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm3);
})();
const ICO_F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
function addRock(mb, x, y, z, sx, sy, sz, seed, layer, jitter = 0.35, col = ONE3) {
  const v = ICO_V.map((p, i) => {
    const k = 1 - jitter / 2 + jitter * hrand(seed, i, 7, 3);
    return [x + p[0] * sx * k, y + p[1] * sy * k, z + p[2] * sz * k];
  });
  const ctr = [x, y, z];
  for (const f of ICO_F) mb.triC(v[f[0]], v[f[1]], v[f[2]], layer, ctr, col);
}
function addSpike(mb, bx, by, bz, dir, len, r, sides, layer, col = ONE3) {
  addLathe(mb, bx, by, bz, [[0, 0], [r, 0.02], [r, len * 0.72], [0, len]], sides, layer, 0.3, col, norm3(dir));
}

function addSkull(mb, x, y, z, yaw, seed, s = 1) {      // a skull: the cranium, the face under it with its dark sockets and nose, the teeth
  const c = Math.cos(yaw), sn = Math.sin(yaw), P = (u, v) => [x + u * c + v * sn, z - u * sn + v * c];
  addRock(mb, x, y + 0.13 * s, z, 0.12 * s, 0.11 * s, 0.14 * s, seed, T.BONE, 0.08);
  const f = P(0, 0.09 * s); addRock(mb, f[0], y + 0.08 * s, f[1], 0.085 * s, 0.07 * s, 0.07 * s, seed + 1, T.BONE, 0.1);
  for (const e of [-1, 1]) { const q = P(e * 0.045 * s, 0.14 * s); addRock(mb, q[0], y + 0.11 * s, q[1], 0.03 * s, 0.028 * s, 0.025 * s, seed + 2, T.BLACK, 0.1); }
  const no = P(0, 0.155 * s); addRock(mb, no[0], y + 0.07 * s, no[1], 0.014 * s, 0.022 * s, 0.015 * s, seed + 3, T.BLACK, 0.1);
  const t = P(0, 0.135 * s); addBox(mb, t[0], y + 0.03 * s, t[1], 0.05 * s, 0.012 * s, 0.01 * s, T.BONE, yaw);
}
function addLongBone(mb, a, b, r) {                     // a thigh- or arm-bone: a shaft and a knuckle at each end
  addSeg(mb, a, b, r, r * 0.85, T.BONE, ONE3);
  for (const [p, k] of [[a, 3], [b, 5]]) addRock(mb, p[0], p[1], p[2], r * 1.9, r * 1.5, r * 1.9, k + Math.floor(p[0] * 31), T.BONE, 0.3);
}
function addBones(mb, x, y, z, seed, big) {
  const r = new RNG(seed);
  for (let s = 0; s < (big ? 3 : 1); s++) {
    const ox = x + (s ? r.range(-0.6, 0.6) : 0), oz = z + (s ? r.range(-0.6, 0.6) : 0);
    addSkull(mb, ox, y + (big && s === 0 ? 0.2 : 0), oz, r.range(0, 6.28), seed + s * 7, 0.95 + r.range(0, 0.25));
  }
  for (let k = 0; k < (big ? 12 : 4); k++) {             // long bones lying every way, heaped on one another in a pile
    const cx = x + r.range(-0.85, 0.85), cz = z + r.range(-0.85, 0.85), a = r.range(0, 6.28), L = r.range(0.32, 0.5), h = y + 0.035 + (big ? r.range(0, 0.22) * (1 - Math.hypot(cx - x, cz - z)) : 0);
    addLongBone(mb, [cx - Math.cos(a) * L / 2, h, cz - Math.sin(a) * L / 2], [cx + Math.cos(a) * L / 2, h + r.range(-0.05, 0.08), cz + Math.sin(a) * L / 2], 0.022);
  }
  for (let k = 0; k < (big ? 3 : 1); k++) {              // a run of ribs, still curving round nothing
    const cx = x + r.range(-0.6, 0.6), cz = z + r.range(-0.6, 0.6), yaw = r.range(0, 6.28), c = Math.cos(yaw), sn = Math.sin(yaw);
    for (let q = 0; q < 5; q++) for (let w = 0; w < 4; w++) {
      const v = (q - 2) * 0.07, a0 = w / 4 * 1.4, a1 = (w + 1) / 4 * 1.4, R0 = 0.2 - q * 0.012;
      const p0 = [cx + (Math.cos(a0) * R0) * c + v * sn, y + 0.02 + Math.sin(a0) * R0 * 0.6, cz - (Math.cos(a0) * R0) * sn + v * c];
      const p1 = [cx + (Math.cos(a1) * R0) * c + v * sn, y + 0.02 + Math.sin(a1) * R0 * 0.6, cz - (Math.cos(a1) * R0) * sn + v * c];
      addSeg(mb, p0, p1, 0.01, 0.009, T.BONE, ONE3);
    }
  }
}

// ---- prefabs baked into the level mesh (README: prefab library) ------------
function addPrefab(mb, p) {
  const n = wallIn(p.wall);
  switch (p.prefab) {
    case 'torch': {
      const bx = p.x + n[0] * 0.12, bz = p.z + n[1] * 0.12, by = p.y + 2.2, yaw = Math.atan2(n[0], n[1]);
      addBox(mb, bx, by, bz, 0.1, 0.16, 0.06, T.IRON, yaw);
      addLathe(mb, bx + n[0] * 0.1, by - 0.1, bz + n[1] * 0.1, [[0.03, 0], [0.05, 0], [0.07, 0.55], [0.0, 0.58]], 5, T.WOOD, 0, ONE3, norm3([n[0] * 0.5, 1, n[1] * 0.5]));
      break;                                              // its flame is a sprite (LV.flames, drawn each frame)
    }
    case 'door': {                                        // a heavy door of black oak boards, braced and banded with iron, strap hinges and a ring, in a frame of dressed stone; p.open: how far it stands ajar
      const t = [n[1], -n[0]], yaw = Math.atan2(n[0], n[1]), W = 1.0, H = 2.7, at = (u, y, v) => [p.x + t[0] * u + n[0] * v, p.y + y, p.z + t[1] * u + n[1] * v];
      for (const u of [-W - 0.14, W + 0.14]) { const q = at(u, H / 2, 0.08); addBox(mb, q[0], q[1], q[2], 0.16, H / 2, 0.2, T.HEWN, yaw); }
      { const q = at(0, H + 0.14, 0.08); addBox(mb, q[0], q[1], q[2], W + 0.3, 0.16, 0.22, T.HEWN, yaw); }
      { const q = at(0, 0.02, 0.08); addBox(mb, q[0], q[1], q[2], W + 0.3, 0.03, 0.24, T.HEWN, yaw); }   // the sill
      const a = p.open || 0, hx = -W, lw = 2 * W - 0.06, ca = Math.cos(a), sa = Math.sin(a);   // hinged on one post, swung into the room
      const lc = (u, v) => at(hx + ca * u - sa * v, 0, sa * u + ca * v + 0.05);
      const leaf = (u, y, v, hu, hy, hv, tex) => { const c = lc(u, v); addBox(mb, c[0], p.y + y, c[2], hu, hy, hv, tex, yaw - a); };
      for (let k = 0; k < 5; k++) leaf(lw / 10 + k * lw / 5, H / 2 - 0.02, 0, lw / 10 - 0.008, H / 2 - 0.04 - (k % 2) * 0.01, 0.055, T.OAK);   // five boards
      for (const y of [0.5, 2.2]) leaf(lw / 2, y, -0.075, lw / 2 - 0.08, 0.07, 0.025, T.OAK);                                        // ledges behind
      for (let k = 0; k < 7; k++) { const f = k / 6; leaf(0.12 + f * (lw - 0.24), 0.55 + f * 1.6, -0.075, 0.07, 0.07, 0.024, T.OAK); }   // the brace
      for (const y of [0.45, 1.35, 2.25]) {                                                                                         // strap hinges, studded, curling at the ends
        leaf(lw * 0.36, y, 0.062, lw * 0.36, 0.045, 0.012, T.IRON);
        for (let k = 0; k < 6; k++) leaf(0.1 + k * lw * 0.13, y, 0.076, 0.018, 0.018, 0.01, T.IRON);
        leaf(lw * 0.72, y + 0.05, 0.062, 0.04, 0.09, 0.012, T.IRON);
      }
      for (let k = 0; k < 5; k++) for (const y of [0.9, 1.8]) leaf(lw / 10 + k * lw / 5, y, 0.07, 0.016, 0.016, 0.01, T.IRON);       // nail-heads down every board
      { const c = lc(lw - 0.25, 0.1); smoothLathe(mb, c[0], p.y + 1.15, c[2], [[0.07, -0.012], [0.07, 0.012]], 10, T.IRON, ONE3, [t[0] * ca - n[0] * sa, 0, t[1] * ca - n[1] * sa]); leaf(lw - 0.25, 1.25, 0.065, 0.05, 0.05, 0.012, T.IRON); }   // the ring and its plate
      break;
    }
    case 'brazier':
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; addBox(mb, p.x + Math.cos(a) * 0.38, p.y + 0.4, p.z + Math.sin(a) * 0.38, 0.04, 0.42, 0.04, T.IRON, -a, ONE3, 0.2); }
      addLathe(mb, p.x, p.y + 0.75, p.z, [[0.1, 0], [0.55, 0.2], [0.62, 0.42], [0.5, 0.42], [0.0, 0.3]], 8, T.IRON);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; addRock(mb, p.x + Math.cos(a) * 0.25, p.y + 1.1, p.z + Math.sin(a) * 0.25, 0.14, 0.08, 0.14, k + 3, T.BLACK); }
      break;
    case 'table':
      addBox(mb, p.x, p.y + 0.98, p.z, 1.0, 0.06, 0.62, T.WOOD, 0.08);
      for (const [dx, dz] of [[-0.85, -0.5], [0.85, -0.5], [-0.85, 0.5], [0.85, 0.5]]) {
        const c = Math.cos(0.08), s = Math.sin(0.08);
        addBox(mb, p.x + dx * c + dz * s, p.y + 0.46, p.z - dx * s + dz * c, 0.06, 0.46, 0.06, T.WOOD, 0.08);
      }
      addLathe(mb, p.x - 0.4, p.y + 1.04, p.z + 0.15, [[0, 0], [0.07, 0], [0.07, 0.22], [0, 0.22]], 6, T.BONE);   // candle
      addLathe(mb, p.x + 0.3, p.y + 1.04, p.z - 0.2, [[0, 0], [0.16, 0], [0.13, 0.04], [0, 0.04]], 7, T.IRON);      // plate
      addRock(mb, p.x + 0.3, p.y + 1.12, p.z - 0.2, 0.1, 0.06, 0.08, 4, T.STRAW);
      break;
    case 'stool':
      addLathe(mb, p.x, p.y, p.z, [[0.0, 0], [0.22, 0], [0.12, 0.08], [0.12, 0.48], [0.26, 0.5], [0.26, 0.58], [0, 0.6]], 6, T.WOOD);
      break;
    case 'bones': addBones(mb, p.x, p.y, p.z, Math.floor(p.x * 13 + p.z * 7), p.big); break;
    case 'skull': addSkull(mb, p.x, p.y, p.z, p.rot || Math.floor(p.x * 7 + p.z * 3) * 0.7, Math.floor(p.x * 11 + p.z * 5), 1.2); break;
    case 'chains': {
      const bx = p.x + n[0] * 0.1, bz = p.z + n[1] * 0.1, yaw = Math.atan2(n[0], n[1]);
      addBox(mb, bx, p.y + 4.2, bz, 0.12, 0.12, 0.06, T.IRON, yaw);
      for (let k = 0; k < 10; k++) {
        const y = p.y + 4.0 - k * 0.24;
        addBox(mb, bx + n[0] * 0.05, y, bz + n[1] * 0.05, k % 2 ? 0.02 : 0.07, 0.11, k % 2 ? 0.07 : 0.02, T.IRON, yaw);
      }
      addBox(mb, bx + n[0] * 0.05, p.y + 1.5, bz + n[1] * 0.05, 0.14, 0.09, 0.14, T.IRON, yaw);   // open manacle
      break;
    }
    case 'column': {                                     // a dressed stone pier with base and capital
      const top = groundInfo(p.x, p.z).ceil + 0.5;
      addLathe(mb, p.x, p.y - 0.2, p.z, [[0, 0], [0.85, 0], [0.85, 0.35], [0.66, 0.5], [0.6, top - p.y - 1.2], [0.8, top - p.y - 0.6], [0.8, top - p.y + 0.2], [0, top - p.y + 0.2]], 8, T.HEWN, Math.PI / 8);
      break;
    }
    case 'bunk':                                         // plank cot with a straw pallet
      addBox(mb, p.x, p.y + 0.42, p.z, 1.2, 0.06, 0.5, T.WOOD);
      for (const [dx, dz] of [[-1.1, -0.42], [1.1, -0.42], [-1.1, 0.42], [1.1, 0.42]]) addBox(mb, p.x + dx, p.y + 0.2, p.z + dz, 0.06, 0.22, 0.06, T.WOOD);
      addBox(mb, p.x, p.y + 0.53, p.z, 1.1, 0.06, 0.44, T.STRAW);
      addRock(mb, p.x - 0.85, p.y + 0.62, p.z, 0.25, 0.08, 0.3, 3, T.CLOTH, 0.1);
      break;
    case 'rack': case 'spear_rack': {                    // weapons in a wall rack
      const bx = p.x + n[0] * 0.25, bz = p.z + n[1] * 0.25, yaw = Math.atan2(n[0], n[1]);
      const sx = Math.cos(yaw), sz = -Math.sin(yaw);
      addBox(mb, bx, p.y + 0.5, bz, 1.0, 0.05, 0.12, T.WOOD, yaw); addBox(mb, bx, p.y + 1.6, bz, 1.0, 0.05, 0.12, T.WOOD, yaw);
      for (let k = -2; k <= 2; k++) {
        const x = bx + sx * k * 0.4, z = bz + sz * k * 0.4;
        if (p.prefab === 'spear_rack') {
          smoothLathe(mb, x, p.y + 0.1, z, [[0.017, 0], [0.017, 2.4]], 5, T.WOOD, ONE3, [0, 1, 0]);
          loft(mb, [S_(p.y + 2.5, 0.02, 0.008, 0.008, -z, x), S_(p.y + 2.62, 0.04, 0.008, 0.008, -z, x), S_(p.y + 2.8, 0.001, 0.001, 0.001, -z, x)], 4, T.STEEL, 1, null, 'y');
        } else {
          smoothLathe(mb, x, p.y + 0.35, z, [[0.016, 0], [0.018, 0.1], [0.016, 0.2]], 6, T.GRIP, ONE3, [0, 1, 0]);
          addBox(mb, x, p.y + 0.57, z, 0.09, 0.012, 0.016, T.IRON, yaw);
          addBox(mb, x, p.y + 1.0, z, 0.025, 0.42, 0.006, T.STEEL, yaw);
        }
      }
      break;
    }
    case 'winch': {                                      // a drum on trestles with a crank and a ratchet wheel
      for (const dz of [-0.55, 0.55]) addBox(mb, p.x, p.y + 0.45, p.z + dz, 0.12, 0.45, 0.25, T.WOOD);
      smoothLathe(mb, p.x, p.y + 0.85, p.z, [[0.32, -0.5], [0.34, -0.45], [0.34, 0.45], [0.32, 0.5]], 10, T.WOOD, ONE3, [0, 0, 1]);
      smoothLathe(mb, p.x, p.y + 0.85, p.z - 0.62, [[0.3, -0.03], [0.3, 0.03]], 12, T.IRON, ONE3, [0, 0, 1]);
      addBox(mb, p.x, p.y + 0.85, p.z + 0.68, 0.04, 0.04, 0.12, T.IRON); addBox(mb, p.x, p.y + 0.62, p.z + 0.8, 0.03, 0.25, 0.03, T.IRON);
      addBox(mb, p.x, p.y + 0.4, p.z + 0.8, 0.05, 0.05, 0.12, T.WOOD);
      smoothLathe(mb, p.x, p.y + 0.85, p.z, [[0.025, 0], [0.025, 3]], 5, T.WOOD, ONE3, [-1, 1, -0.6]);
      break;
    }
    case 'banner': {                                     // Tsotha's scarlet serpent banner
      const bx = p.x + n[0] * 0.08, bz = p.z + n[1] * 0.08, yaw = Math.atan2(n[0], n[1]);
      addBox(mb, bx, p.y + 4.2, bz, 0.06, 0.06, 0.9, T.WOOD, yaw + Math.PI / 2);
      addBox(mb, bx, p.y + 2.9, bz, 0.8, 1.25, 0.02, T.BANNER, yaw);
      break;
    }
    case 'pavilion': {                                   // a lord's pavilion of the host: a round tent of dyed cloth, its peak on a pole with a pennon, guy-ropes pegged out
      const r = p.r || 2.2, cl = p.cloth === 'velvet' ? T.VELVET : T.TABARD, yaw = p.rot || 0;
      addLathe(mb, p.x, p.y, p.z, [[r, 0], [r * 0.98, 1.7], [r * 0.9, 1.8], [r * 0.25, 3.3], [0.05, 3.55]], 12, cl, yaw);
      addLathe(mb, p.x, p.y + 1.7, p.z, [[r + 0.08, 0], [r * 0.98, 0.35], [r * 0.95, 0.38], [r + 0.04, 0.02]], 12, T.GILT, yaw);   // the scalloped valance
      smoothLathe(mb, p.x, p.y, p.z, [[0.05, 0], [0.04, 4.4]], 5, T.WOOD, ONE3, [0, 1, 0]);
      addBox(mb, p.x + 0.45, p.y + 4.15, p.z, 0.45, 0.18, 0.01, T.BANNER, 0.2);                                     // the pennon
      { const a = yaw, dx = Math.sin(a), dz = Math.cos(a); addBox(mb, p.x + dx * (r - 0.02), p.y + 0.8, p.z + dz * (r - 0.02), 0.5, 0.8, 0.04, T.BLACK, a); }   // the door-flap thrown back
      for (let k = 0; k < 6; k++) { const a = yaw + 0.5 + k / 6 * Math.PI * 2, x0 = p.x + Math.sin(a) * r * 0.95, z0 = p.z + Math.cos(a) * r * 0.95, x1 = p.x + Math.sin(a) * (r + 1.3), z1 = p.z + Math.cos(a) * (r + 1.3);
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, L = Math.hypot(x1 - x0, z1 - z0) + 0.1; addBox(mb, mx, p.y + 0.95, mz, 0.012, 0.012, L / 2 * 1.25, T.ROBE, Math.atan2(x1 - x0, z1 - z0), ONE3, 0.62);
        addBox(mb, x1, p.y + 0.1, z1, 0.03, 0.12, 0.03, T.WOOD); }
      break;
    }
    case 'campfire': {                                   // a camp-fire: a ring of stones, the logs fallen in, the embers (its flame and light: level.js)
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; addRock(mb, p.x + Math.cos(a) * 0.65, p.y + 0.08, p.z + Math.sin(a) * 0.65, 0.16, 0.11, 0.14, k + 21, T.ROCK, 0.3); }
      for (let k = 0; k < 4; k++) { const a = k * 0.9 + 0.3; addBox(mb, p.x, p.y + 0.12, p.z, 0.06, 0.06, 0.45, T.WOOD, a, ONE3, 0.15); }
      addRock(mb, p.x, p.y + 0.06, p.z, 0.32, 0.05, 0.32, 5, T.BLACK, 0.3);
      break;
    }
    case 'tapestry': {                                   // a woven hanging on a pole, its foot weighted and hanging a hand off the wall
      const bx = p.x + n[0] * 0.1, bz = p.z + n[1] * 0.1, yaw = Math.atan2(n[0], n[1]), w = p.w || 1.1, h = p.h || 1.6, top = p.y + (p.top || 3.3);
      addBox(mb, bx, top + 0.05, bz, 0.04, 0.04, w + 0.15, T.WOOD, yaw + Math.PI / 2);
      for (const e of [-1, 1]) { const t = [n[1], -n[0]]; addLathe(mb, bx + t[0] * e * (w + 0.18), top - 0.03, bz + t[1] * e * (w + 0.18), [[0, 0], [0.06, 0.04], [0.06, 0.1], [0, 0.14]], 6, T.GILT); }
      addBox(mb, bx + n[0] * 0.02, top - h / 2, bz + n[1] * 0.02, w, h / 2, 0.015, T.TAPESTRY, yaw);
      addBox(mb, bx + n[0] * 0.03, top - h - 0.02, bz + n[1] * 0.03, w + 0.02, 0.03, 0.03, T.WOOD, yaw);
      break;
    }
    case 'trophy': {                                     // arms hung on the wall: a round shield over two crossed blades (or crossed spears, or empty pegs)
      const bx = p.x + n[0] * 0.08, bz = p.z + n[1] * 0.08, yaw = Math.atan2(n[0], n[1]), t = [n[1], -n[0]], y0 = p.y + (p.at || 2.0);
      for (const e of [-1, 1]) {                          // the blades, crossed behind
        const a = e * 0.75, c = Math.cos(a), sa = Math.sin(a);
        for (let k = -6; k <= 6; k++) { const u = k * 0.09; addBox(mb, bx + t[0] * (sa * u) - n[0] * 0.02, y0 + c * u, bz + t[1] * (sa * u) - n[1] * 0.02, 0.022, 0.05, 0.006, k > 3 ? T.GRIP : T.STEEL, yaw); }
        addBox(mb, bx + t[0] * sa * 0.36 - n[0] * 0.01, y0 + c * 0.36, bz + t[1] * sa * 0.36 - n[1] * 0.01, 0.09, 0.015, 0.012, T.IRON, yaw);
      }
      if (!p.bare) smoothLathe(mb, bx + n[0] * 0.04, y0, bz + n[1] * 0.04, [[0.0, 0], [0.42, 0.0], [0.4, 0.05], [0.12, 0.09], [0.0, 0.1]], 12, T.SHIELD, ONE3, [n[0], 0, n[1]]);
      addBox(mb, bx, y0 + 0.55, bz, 0.04, 0.04, 0.05, T.IRON, yaw);   // the peg
      break;
    }
    case 'pegs': {                                       // an empty weapon rack: pegs and the pale ghosts of what hung there
      const bx = p.x + n[0] * 0.05, bz = p.z + n[1] * 0.05, yaw = Math.atan2(n[0], n[1]), t = [n[1], -n[0]];
      addBox(mb, bx, p.y + 1.7, bz, 0.9, 0.06, 0.05, T.WOOD, yaw);
      for (let k = -2; k <= 2; k++) addBox(mb, bx + t[0] * k * 0.38 + n[0] * 0.07, p.y + 1.76, bz + t[1] * k * 0.38 + n[1] * 0.07, 0.025, 0.025, 0.08, T.IRON, yaw);
      break;
    }
    case 'sconce': {                                     // an iron candle-sconce on the wall, two stubs burning
      const bx = p.x + n[0] * 0.1, bz = p.z + n[1] * 0.1, yaw = Math.atan2(n[0], n[1]);
      addBox(mb, bx, p.y + 1.9, bz, 0.06, 0.14, 0.03, T.IRON, yaw);
      addLathe(mb, bx + n[0] * 0.12, p.y + 1.78, bz + n[1] * 0.12, [[0, 0], [0.11, 0.02], [0.12, 0.05], [0, 0.04]], 7, T.IRON);
      addLathe(mb, bx + n[0] * 0.12, p.y + 1.82, bz + n[1] * 0.12, [[0, 0], [0.035, 0], [0.035, 0.14], [0, 0.14]], 6, T.BONE);
      break;
    }
    case 'divan': {                                      // a low couch heaped with silk cushions: "on divans lounged Strabonus and Amalrus in their silks and gold"
      const yaw = p.yaw || 0, c = Math.cos(yaw), s2 = Math.sin(yaw), at = (u, v) => [p.x + c * u + s2 * v, p.z - s2 * u + c * v];
      // a seat 0.66 deep (front edge at v 0.33), its cushion top 0.5 high; the back and the arms rise above it
      { const q = at(0, 0); addBox(mb, q[0], p.y + 0.2, q[1], 1.05, 0.2, 0.33, T.WOOD, yaw); addBox(mb, q[0], p.y + 0.44, q[1], 1.0, 0.06, 0.32, T.VELVET, yaw); }
      { const q = at(0, -0.3); addBox(mb, q[0], p.y + 0.75, q[1], 1.05, 0.33, 0.07, T.VELVET, yaw); }
      for (const e of [-1, 1]) { const q = at(e * 1.0, 0); addBox(mb, q[0], p.y + 0.6, q[1], 0.08, 0.18, 0.33, T.GILT, yaw); }
      for (const [u, v] of [[-0.68, -0.17], [0.7, -0.17]]) { const q = at(u, v); addRock(mb, q[0], p.y + 0.66, q[1], 0.22, 0.16, 0.08, Math.floor(u * 9 + 20), T.TABARD, 0.1); }   // bolsters at the ends, clear of whoever sits in the middle
      break;
    }
    case 'censer': {                                     // "golden censers, filling the corridor with dreamy perfumed clouds": hung from the vault on a chain
      const top = groundInfo(p.x, p.z).ceil, y1 = p.y + (p.at || 2.4);
      for (let k = 0; y1 + 0.3 + k * 0.2 < top; k++) addBox(mb, p.x, y1 + 0.35 + k * 0.2, p.z, k % 2 ? 0.015 : 0.04, 0.09, k % 2 ? 0.04 : 0.015, T.GILT);
      addLathe(mb, p.x, y1 - 0.2, p.z, [[0, 0], [0.12, 0.04], [0.2, 0.18], [0.21, 0.26], [0.14, 0.3], [0.17, 0.38], [0.05, 0.5], [0, 0.55]], 10, T.GILT);
      break;
    }
    case 'carpet':                                       // a runner of dyed wool along the floor
      addBox(mb, p.x, p.y + 0.012, p.z, p.w || 0.9, 0.012, p.l || 3, T.TAPESTRY, p.yaw || 0);
      break;
    case 'chest':                                        // an iron-bound chest
      addBox(mb, p.x, p.y + 0.32, p.z, 0.6, 0.32, 0.38, T.WOOD, p.yaw || 0);
      addBox(mb, p.x, p.y + 0.66, p.z, 0.62, 0.05, 0.4, T.WOOD, p.yaw || 0);
      for (const u of [-0.4, 0.4]) addBox(mb, p.x + Math.cos(p.yaw || 0) * u, p.y + 0.36, p.z - Math.sin(p.yaw || 0) * u, 0.035, 0.36, 0.4, T.IRON, p.yaw || 0);
      break;
    case 'cask':
      smoothLathe(mb, p.x, p.y + 0.5, p.z, [[0.34, -0.5], [0.42, -0.25], [0.44, 0], [0.42, 0.25], [0.34, 0.5]], 10, T.WOOD, ONE3, p.lie ? [1, 0, 0] : [0, 1, 0]);
      break;
    case 'planks':                                       // rotten planks laid over a drop: they will not hold
      for (let k = -2; k <= 2; k++) addBox(mb, p.x + k * 0.52, p.y - 0.06, p.z + Math.sin(k * 7) * 0.15, 0.24, 0.05, 3.3, T.PLANK, Math.sin(k * 3) * 0.05);
      break;
    case 'candles':                                      // the apprentices' candle stubs, burned down to puddles
      for (let k = 0; k < 4; k++) {
        const cx = p.x + Math.cos(k * 2.3) * 0.25, cz = p.z + Math.sin(k * 2.3) * 0.25, h = 0.08 + (k % 3) * 0.06;
        addLathe(mb, cx, p.y, cz, [[0, 0], [0.06, 0], [0.05, h], [0, h]], 6, T.BONE);
      }
      break;
    case 'stal': {                                       // a stalagmite and the stalactite reaching down to it
      const c = groundInfo(p.x, p.z).ceil, hgt = c - p.y;
      addLathe(mb, p.x, p.y - 0.2, p.z, [[0, 0], [0.8, 0], [0.55, hgt * 0.25], [0.3, hgt * 0.45], [0, hgt * 0.55]], 7, T.CAVE, p.x);
      addLathe(mb, p.x + 0.1, c + 0.3, p.z, [[0, 0], [0.6, 0], [0.3, -hgt * 0.25], [0, -hgt * 0.38]], 7, T.CAVE, p.z);
      break;
    }
    case 'fungus':                                       // pale glowing caps in the damp
      for (let k = 0; k < 6; k++) {
        const fx = p.x + Math.cos(k * 1.9) * 0.4, fz = p.z + Math.sin(k * 1.9) * 0.4, sc = 0.15 + (k % 3) * 0.08;
        addLathe(mb, fx, p.y, fz, [[0, 0], [0.03, 0], [0.025, sc * 1.4], [0, sc * 1.4]], 5, T.BONE);
        addLathe(mb, fx, p.y + sc * 1.2, fz, [[0, 0], [sc, 0.02], [sc * 0.7, sc * 0.5], [0, sc * 0.6]], 7, T.SLIME);
      }
      break;
    case 'post':                                         // the boom's mast
      addLathe(mb, p.x, p.y, p.z, [[0, 0], [0.3, 0], [0.26, 5.6], [0, 5.7]], 8, T.WOOD);
      for (const y of [0.4, 5.2]) addLathe(mb, p.x, p.y + y, p.z, [[0.3, 0], [0.32, 0.06], [0.32, 0.16], [0.3, 0.22]], 8, T.IRON);
      break;
    case 'stakes': {                                      // a field-work: a heaped earth bank, sharpened stakes driven into it, slanting at the enemy
      const yaw = p.rot || 0, fx = Math.sin(yaw), fz = Math.cos(yaw), px = fz, pz = -fx, sd = Math.floor(p.x * 7 + p.z * 13);
      for (let k = -1; k <= 1; k++) addRock(mb, p.x + px * k * 0.85 - fx * 0.2, p.y + 0.18, p.z + pz * k * 0.85 - fz * 0.2, 0.75, 0.5, 0.85, sd + k, T.MUD, 0.25);
      for (let row = 0; row < 2; row++) for (let k = 0; k < 6; k++) {
        const w = (k - 2.5) * 0.42 + (row ? 0.2 : 0) + (hrand(sd, k, row, 3) - 0.5) * 0.12, back = row ? -0.35 : 0.15;
        const bx = p.x + px * w + fx * back, bz = p.z + pz * w + fz * back, tilt = 0.75 + hrand(sd, k, row, 4) * 0.25;
        addSpike(mb, bx, p.y + 0.35 + row * 0.15, bz, [fx * tilt, 0.65, fz * tilt], 1.5 + hrand(sd, k, row, 5) * 0.5, 0.065, 5, T.WOOD);
      }
      break;
    }
    case 'stakepit': {                                    // a lily: a pit with a fire-hardened stake at the bottom, and more around it
      const sd = Math.floor(p.x * 5 + p.z * 11);
      for (let k = 0; k < 9; k++) {
        const a = k / 9 * Math.PI * 2 + hrand(sd, k, 1, 1), r = k ? 0.35 + hrand(sd, k, 2, 2) * 0.55 : 0;
        addSpike(mb, p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r, [(hrand(sd, k, 3, 3) - 0.5) * 0.3, 1, (hrand(sd, k, 4, 4) - 0.5) * 0.3], 0.7 + hrand(sd, k, 5, 5) * 0.35, 0.06, 5, T.WOOD);
      }
      for (let k = 0; k < 5; k++) addBox(mb, p.x + (hrand(sd, k, 6, 6) - 0.5) * 1.6, p.y + 0.85, p.z + (hrand(sd, k, 7, 7) - 0.5) * 1.6, 0.6, 0.02, 0.03, T.WOOD, hrand(sd, k, 8, 8) * 6);   // brush that hid it, fallen in
      break;
    }
    case 'deadhorse': {                                   // a dead horse on its side: cover from arrows
      const yaw = p.rot || 0, c = Math.cos(yaw), sn = Math.sin(yaw), P = (lx, lz) => [p.x + lx * c + lz * sn, p.z - lx * sn + lz * c];
      const b = P(0, 0); addRock(mb, b[0], p.y + 0.45, b[1], 0.55, 0.45, 1.0, 11, T.HIDE, 0.12);
      const h = P(0.1, 1.25); addRock(mb, h[0], p.y + 0.25, h[1], 0.18, 0.2, 0.42, 5, T.HIDE, 0.1);
      for (const [lx, lz] of [[0.35, 0.6], [0.45, 0.4], [0.35, -0.55], [0.45, -0.75]]) { const q = P(lx, lz); addBox(mb, q[0] + 0.3 * c, p.y + 0.25, q[1] - 0.3 * sn, 0.5, 0.05, 0.05, T.HIDE, yaw); }
      const sd = P(-0.3, 0); addBox(mb, sd[0], p.y + 0.8, sd[1], 0.05, 0.35, 0.4, T.LEATHER, yaw);
      break;
    }
    case 'fallen': {                                      // a dead knight in his mail
      const yaw = p.rot || 0, c = Math.cos(yaw), sn = Math.sin(yaw), P = (lz) => [p.x + lz * sn, p.z + lz * c];
      const t = P(0), hd = P(0.75), l = P(-0.7);
      addRock(mb, t[0], p.y + 0.16, t[1], 0.26, 0.15, 0.4, 3, T.MAIL, 0.1);
      addRock(mb, hd[0], p.y + 0.14, hd[1], 0.13, 0.13, 0.15, 6, T.STEEL, 0.05);
      addBox(mb, l[0] + 0.12 * c, p.y + 0.09, l[1] - 0.12 * sn, 0.08, 0.08, 0.45, T.CLOTH, yaw + 0.1);
      addBox(mb, l[0] - 0.12 * c, p.y + 0.09, l[1] + 0.12 * sn, 0.08, 0.08, 0.45, T.CLOTH, yaw - 0.15);
      addBox(mb, t[0] + 0.5 * c, p.y + 0.06, t[1] - 0.5 * sn, 0.4, 0.02, 0.025, T.STEEL, yaw + 1.2);    // his sword
      break;
    }
    case 'standard': {                                    // a toppled standard, its banner in the mud
      const yaw = p.rot || 0;
      addBox(mb, p.x, p.y + 0.06, p.z, 0.04, 0.04, 1.8, T.WOOD, yaw, ONE3, 0.05);
      addBox(mb, p.x + Math.sin(yaw) * 1.3 + Math.cos(yaw) * 0.5, p.y + 0.04, p.z + Math.cos(yaw) * 1.3 - Math.sin(yaw) * 0.5, 0.5, 0.02, 0.45, T.BANNER, yaw);
      break;
    }
    case 'arrows': {                                      // a volley's shafts driven into the turf, all slanting the way they came ("feathering them with shafts")
      const sd = Math.floor(p.x * 17 + p.z * 29), from = p.from !== undefined ? p.from : 0, n = 4 + Math.floor(hrand(sd, 1, 1, 1) * 8);
      for (let k = 0; k < n; k++) {
        const a = hrand(sd, k, 2, 2) * 6.283, r = Math.sqrt(hrand(sd, k, 3, 3)) * 1.3, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, y = groundInfo(x, z).floor;
        const yaw = from + (hrand(sd, k, 4, 4) - 0.5) * 0.4, tilt = 0.5 + hrand(sd, k, 5, 5) * 0.35, L = 0.55 + hrand(sd, k, 6, 6) * 0.3;
        const dx = Math.sin(yaw) * Math.sin(tilt), dy = Math.cos(tilt), dz = Math.cos(yaw) * Math.sin(tilt), top = [x + dx * L, y + dy * L, z + dz * L];
        addSeg(mb, [x - dx * 0.05, y - dy * 0.05, z - dz * 0.05], top, 0.012, 0.012, T.WOOD, ONE3);
        for (const q of [0, 1.57]) {                     // the fletching: two crossed vanes
          const ux = Math.cos(yaw + q) * 0.035, uz = -Math.sin(yaw + q) * 0.035, b = [top[0] - dx * 0.16, top[1] - dy * 0.16, top[2] - dz * 0.16];
          mb.quad([b[0] - ux, b[1], b[2] - uz], [b[0] + ux, b[1], b[2] + uz], [top[0] + ux * 0.6, top[1], top[2] + uz * 0.6], [top[0] - ux * 0.6, top[1], top[2] - uz * 0.6], T.FEATHER, uz, 0, -ux);
        }
      }
      break;
    }
    case 'lance': {                                       // a broken lance left standing where it fell, its splintered end to the sky
      const sd = Math.floor(p.x * 13 + p.z * 31), yaw = p.rot || 0, tilt = 0.15 + hrand(sd, 1, 1, 1) * 0.55, L = 2.2 + hrand(sd, 2, 2, 2) * 2.2;
      const d = [Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), Math.cos(yaw) * Math.sin(tilt)], top = [p.x + d[0] * L, p.y + d[1] * L, p.z + d[2] * L];
      addSeg(mb, [p.x, p.y - 0.3, p.z], top, 0.045, 0.035, T.WOOD, ONE3);
      for (let k = 0; k < 3; k++) addSpike(mb, top[0], top[1] - 0.05, top[2], [d[0] + (hrand(sd, k, 3, 3) - 0.5) * 0.4, d[1], d[2] + (hrand(sd, k, 4, 4) - 0.5) * 0.4], 0.18 + 0.12 * k, 0.018, 3, T.WOOD);   // splinters
      if (hrand(sd, 3, 5, 5) < 0.45) {                    // a rag of pennon still bound below the break
        const b = [p.x + d[0] * (L - 0.5), p.y + d[1] * (L - 0.5), p.z + d[2] * (L - 0.5)], sx = Math.cos(yaw) * 0.55, sz = -Math.sin(yaw) * 0.55;
        mb.quad(b, [b[0], b[1] - 0.35, b[2]], [b[0] + sx, b[1] - 0.5, b[2] + sz], [b[0] + sx * 1.1, b[1] - 0.12, b[2] + sz * 1.1], T.BANNER, -sz, 0, sx);
      }
      break;
    }
    case 'tufts': {                                       // grass: a few tufts, dry blades fanned out from the root
      const sd = Math.floor(p.x * 7 + p.z * 19);
      for (let k = 0; k < 5; k++) {
        const x = p.x + (hrand(sd, k, 1, 1) - 0.5) * 2.2, z = p.z + (hrand(sd, k, 2, 2) - 0.5) * 2.2, y = groundInfo(x, z).floor - 0.02, h = 0.3 + hrand(sd, k, 3, 3) * 0.45;
        for (let b = 0; b < 6; b++) {
          const a = b / 6 * 6.283 + hrand(sd, k, b, 4), lean = 0.25 + hrand(sd, k, b, 5) * 0.4, w = 0.05;
          const tx = x + Math.cos(a) * h * lean, tz = z + Math.sin(a) * h * lean, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
          mb.tri([x + px, y, z + pz], [x - px, y, z - pz], [tx, y + h * (0.8 + 0.3 * hrand(sd, k, b, 6)), tz], b % 3 ? T.STRAW : T.YOTHGA_LEAF, Math.cos(a), 0.6, Math.sin(a));
        }
      }
      break;
    }
    case 'shieldfall': {                                  // a shield in the mud, face up or tipped on its rim against the dead
      const sd = Math.floor(p.x * 11 + p.z * 23), up = hrand(sd, 1, 1, 1) < 0.6, yaw = p.rot || 0;
      const ax = up ? [Math.sin(yaw) * 0.15, 1, Math.cos(yaw) * 0.15] : [Math.sin(yaw), 0.5, Math.cos(yaw)];
      smoothLathe(mb, p.x, p.y + (up ? 0.03 : 0.38), p.z, [[0.0, 0], [0.4, 0.0], [0.38, 0.05], [0.12, 0.09], [0.0, 0.1]], 12, hrand(sd, 2, 2, 2) < 0.5 ? T.SHIELD : T.GILT, ONE3, ax);
      break;
    }
    case 'mound': {                                       // "mounds of corpses": men and a horse fallen across one another
      const sd = Math.floor(p.x * 5 + p.z * 37);
      addRock(mb, p.x, p.y + 0.35, p.z, 0.9, 0.42, 1.2, sd, T.HIDE, 0.25);
      for (let k = 0; k < 4; k++) {
        const a = k * 1.9 + hrand(sd, k, 1, 1), r = 0.5 + hrand(sd, k, 2, 2) * 0.6, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
        addRock(mb, x, p.y + 0.3 + (k % 2) * 0.25, z, 0.25, 0.16, 0.42, sd + k, k % 2 ? T.MAIL : T.GILT, 0.15);
        addRock(mb, x + Math.cos(a) * 0.45, p.y + 0.22, z + Math.sin(a) * 0.45, 0.12, 0.12, 0.14, sd + k + 7, T.STEEL, 0.05);
      }
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; addBox(mb, p.x + Math.cos(a) * 0.4, p.y + 0.7, p.z + Math.sin(a) * 0.4, 0.025, 0.025, 1.1, T.WOOD, a, ONE3, 0.3 + k * 0.2); }
      break;
    }
    case 'seep': {                                        // the pits' damp: a glistening run of slime down the wall, pooling at its foot
      const t = [n[1], -n[0]], sd = Math.floor(p.x * 17 + p.z * 5), top = p.y + (p.top || 2.8), NS = 8;
      let prev = null;
      for (let k = 0; k <= NS; k++) {
        const v = k / NS, y = top - (top - p.y) * v, wid = 0.12 + 0.22 * Math.sin(v * 3.1) * (0.6 + 0.6 * hrand(sd, k, 1, 1)), dx = (hrand(sd, k, 2, 2) - 0.5) * 0.25 + Math.sin(v * 5 + sd) * 0.1;
        const cx = p.x + n[0] * 0.03 + t[0] * dx, cz = p.z + n[1] * 0.03 + t[1] * dx, a = [cx - t[0] * wid, y, cz - t[1] * wid], b = [cx + t[0] * wid, y, cz + t[1] * wid];
        if (prev) mb.quad(prev[0], prev[1], b, a, T.SLIME, n[0], 0, n[1]);
        prev = [a, b];
      }
      for (let k = 0; k < 7; k++) {                       // the pool
        const a0 = k / 7 * Math.PI * 2, a1 = (k + 1) / 7 * Math.PI * 2, r0 = 0.45 + 0.3 * hrand(sd, k, 3, 3), r1 = 0.45 + 0.3 * hrand(sd, (k + 1) % 7, 3, 3);
        const c = [p.x + n[0] * 0.5, p.y + 0.015, p.z + n[1] * 0.5];
        mb.tri(c, [c[0] + Math.cos(a0) * r0, c[1], c[2] + Math.sin(a0) * r0 * 0.8], [c[0] + Math.cos(a1) * r1, c[1], c[2] + Math.sin(a1) * r1 * 0.8], T.SLIME, 0, 1, 0);
      }
      break;
    }
    case 'loculi': {                                      // an ossuary wall: stone shelves in tiers, dark recesses behind, skulls in rows on them and long bones stacked between
      const t = [n[1], -n[0]], w = p.w || 1.1, yaw = Math.atan2(n[0], n[1]), sd = Math.floor(p.x * 13 + p.z * 17), tiers = p.tiers || 3;
      addBox(mb, p.x + n[0] * 0.02, p.y + 0.35 + tiers * 0.55 / 2, p.z + n[1] * 0.02, w, tiers * 0.55 / 2 + 0.05, 0.02, T.BLACK, yaw);   // the dark of the recesses
      for (let q = 0; q <= tiers; q++) addBox(mb, p.x + n[0] * 0.15, p.y + 0.32 + q * 0.55, p.z + n[1] * 0.15, w + 0.06, 0.04, 0.15, T.ASHLAR, yaw);   // the shelves
      for (const e of [-1, 0, 1]) addBox(mb, p.x + n[0] * 0.15 + t[0] * e * w, p.y + 0.35 + tiers * 0.55 / 2, p.z + n[1] * 0.15 + t[1] * e * w, 0.05, tiers * 0.55 / 2 + 0.03, 0.15, T.ASHLAR, yaw);   // and the uprights
      for (let q = 0; q < tiers; q++) {
        const y = p.y + 0.36 + q * 0.55, row = hrand(sd, q, 1, 1) < 0.6;
        if (row) for (let k = 0; k < 6; k++) { const u = -w + 0.2 + k * (2 * w - 0.4) / 5; if (Math.abs(u) < 0.08 || hrand(sd, q, k, 2) < 0.15) continue; addSkull(mb, p.x + n[0] * 0.15 + t[0] * u, y, p.z + n[1] * 0.15 + t[1] * u, yaw + (hrand(sd, q, k, 3) - 0.5) * 0.6, sd + q * 9 + k, 0.85); }
        else for (let k = 0; k < 4; k++) for (const e of [-1, 1]) {
          const h = y + 0.03 + k * 0.045, a = [p.x + n[0] * (0.08 + 0.05 * (k % 2)) + t[0] * e * 0.12, h, p.z + n[1] * (0.08 + 0.05 * (k % 2)) + t[1] * e * 0.12];
          addLongBone(mb, a, [a[0] + t[0] * e * (w - 0.3), h, a[2] + t[1] * e * (w - 0.3)], 0.022);
        }
      }
      break;
    }
    case 'reeds': {                                       // a reed-bed: tall stems in a clump, bowed every way, a few with their brown heads
      const sd = Math.floor(p.x * 23 + p.z * 7);
      for (let k = 0; k < 22; k++) {
        const a = hrand(sd, k, 1, 1) * 6.283, r = Math.sqrt(hrand(sd, k, 2, 2)) * 1.4, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, y = groundInfo(x, z).floor - 0.05;
        const h = 1.1 + hrand(sd, k, 3, 3) * 1.2, la = hrand(sd, k, 4, 4) * 6.283, lean = 0.1 + hrand(sd, k, 5, 5) * 0.3, w = 0.03;
        const tx = x + Math.cos(la) * h * lean, tz = z + Math.sin(la) * h * lean, px = -Math.sin(la) * w, pz = Math.cos(la) * w;
        mb.tri([x + px, y, z + pz], [x - px, y, z - pz], [tx, y + h, tz], k % 3 ? T.STRAW : T.YOTHGA_LEAF, Math.cos(la), 0.3, Math.sin(la));
        if (k % 4 === 0) addRock(mb, x + (tx - x) * 0.85, y + h * 0.85, z + (tz - z) * 0.85, 0.035, 0.12, 0.035, sd + k, T.HIDE, 0.1);   // a bulrush head
      }
      break;
    }
    case 'boulder': {                                     // a weathered boulder, sunk into the turf, often with a smaller one leaning on it
      const r = p.size, sd = Math.floor(p.x * 13 + p.z * 7);
      addRock(mb, p.x, p.y + r * 0.3, p.z, r, r * (0.6 + 0.3 * hrand(sd, 1, 2, 3)), r * (0.8 + 0.3 * hrand(sd, 2, 2, 3)), sd, T.ROCK, 0.45);
      if (hrand(sd, 3, 2, 3) < 0.6) { const a = p.rot, q = r * 0.55; addRock(mb, p.x + Math.cos(a) * r * 0.9, p.y + q * 0.25, p.z + Math.sin(a) * r * 0.9, q, q * 0.7, q, sd + 5, T.ROCK, 0.5); }
      break;
    }
    case 'heap': {                                        // "a heap of dead horses and men": a mound you can see across the field
      for (let k = 0; k < 18; k++) {
        const a = k * 2.399, r = 0.2 + (k % 6) * 0.32, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, hgt = 2.6 - r * 1.05;
        addRock(mb, x, p.y + hgt * 0.5, z, 0.65, hgt * 0.55, 0.95, 20 + k, k % 3 ? T.HIDE : k % 2 ? T.MAIL : T.GILT, 0.22);
      }
      for (let k = 0; k < 9; k++) { const a = k * 1.7; addBox(mb, p.x + Math.cos(a) * 0.9, p.y + 1.6 + (k % 3) * 0.3, p.z + Math.sin(a) * 0.9, 0.03, 0.03, 1.6, T.WOOD, a, ONE3, 0.5 + (k % 3) * 0.2); }   // broken lances
      // "the heavy regal folds of silken standards": three left standing in the heap, seen over the mist from across the field
      for (const [dx, dz, hgt, lean] of [[-0.3, -0.5, 9.5, 0.08], [0.6, 0.4, 8.0, -0.15], [-0.7, 0.8, 6.8, 0.22]]) {
        const bx = p.x + dx, bz = p.z + dz, tx = bx + Math.sin(lean) * hgt, tz = bz;
        addSeg(mb, [bx, p.y + 0.5, bz], [tx, p.y + hgt, tz], 0.09, 0.06, T.BLACK, ONE3);
        addBox(mb, tx, p.y + hgt - 0.1, tz, 0.05, 0.05, 1.2, T.BLACK, 0);                           // the crossbar
        addRag(mb, [tx, p.y + hgt - 0.12, tz - 1.1], [0, 0, 2.2], 3.1, T.BLACK, Math.floor(hgt * 10));   // the banner hanging from it: black against the red sky, torn
      }
      break;
    }
    case 'grating': {
      const cx = (p.at[0] + 0.5) * CELL, cz = (p.at[1] + 0.5) * CELL, y = groundInfo(cx, cz).ceil - 0.3;
      for (let k = -2; k <= 2; k++) {
        addBox(mb, cx + k * 0.45, y, cz, 0.05, 0.05, 1.3, T.IRON);
        addBox(mb, cx, y - 0.08, cz + k * 0.45, 1.3, 0.05, 0.05, T.IRON);
      }
      break;
    }
  }
}

// ---- the level mesh -------------------------------------------------------
function wallStrip(mb, ca, cb, ba, bb, ta, tb, layer, hx, hz) {
  const rough = Math.max(ca.bul, cb.bul) > 0.2;   // a cave wall: broken into ridges and hollows, set back into the rock
  const ROWS = rough ? 6 : 3, COLS = rough ? 3 : 1;
  const P = [];
  for (let r = 0; r <= ROWS; r++) {
    const t = r / ROWS, s = Math.sin(Math.PI * t), row = [];
    const ka = s * ca.bul * (0.6 + 0.8 * hrand(ca.gx, ca.gz, Math.round(t * 3 * 7), 3)), kb = s * cb.bul * (0.6 + 0.8 * hrand(cb.gx, cb.gz, Math.round(t * 3 * 7), 3));
    for (let c = 0; c <= COLS; c++) {
      const u = c / COLS;
      let x = ca.x + ca.jx * ka + (cb.x + cb.jx * kb - ca.x - ca.jx * ka) * u, z = ca.z + ca.jz * ka + (cb.z + cb.jz * kb - ca.z - ca.jz * ka) * u;
      if (rough && c > 0 && c < COLS) {                 // a ridge or a hollow between the corners, deeper toward the middle of the wall's height
        const k = s * (0.12 + 0.5 * hrand(ca.gx * 7 + cb.gx, ca.gz * 7 + cb.gz, r * 5 + c, 4)) * CELL * 0.22;
        x -= hx * k; z -= hz * k;
      }
      const y = ba + (ta - ba) * t + (bb - ba + (tb - ta - bb + ba) * t) * u, fl = ba + (bb - ba) * u, hgt = y - fl;
      const deep = rough && c > 0 && c < COLS ? (0.12 + 0.5 * hrand(ca.gx * 7 + cb.gx, ca.gz * 7 + cb.gz, r * 5 + c, 4)) * s : 0;
      row.push([x, y, z, (0.5 + 0.5 * smoothstep(0, 1.4, hgt)) * (1 - 0.18 * (1 - smoothstep(0, 0.35, 1 - t))) * (1 - 0.55 * deep)]);   // dark at its foot, under the roof, in its hollows
    }
    P.push(row);
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const a = P[r][c], b = P[r][c + 1], e = P[r + 1][c + 1], f = P[r + 1][c]; mb.quadV(a, b, e, f, layer, hx, 0, hz, a[3], b[3], e[3], f[3]); }
}
// A city spread out below a high place (e1m5: Khorshemish round the Scarlet Citadel), drawn only and far out of reach: flat-roofed
// houses, domes, towers with lamplit windows, a ring of walls with towers, all sunk below the level's own ground.
function addCity(mb, C) {
  const rng = new RNG(C.seed || 77), X = LV.W * CELL, Z = LV.H * CELL, y0 = C.ground !== undefined ? C.ground : -2;
  const cx = C.at ? C.at[0] * CELL : X / 2, cz = C.at ? C.at[1] * CELL : Z / 2, hx = C.at ? 0 : X / 2, hz = C.at ? 0 : Z / 2;   // round the level, or round a point of its own
  const inPit = (x, z, r) => { for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) { const i = cellIdx(Math.floor((x + dx) / CELL), Math.floor((z + dz) / CELL)); if (i >= 0 && LV.kind[i] !== 2) return false; } return true; };
  const clear = (x, z, r) => x + r > -8 && x - r < X + 8 && z + r > -8 && z - r < Z + 8 && !(C.inside && inPit(x, z, r + 2));   // keep off the citadel itself (but a city may fill the drop below the roofs)
  for (let k = 0; k < (C.n || 260); k++) {
    const a = rng.range(0, Math.PI * 2), d = rng.range(C.r0 || 20, C.r1 || 230), inner = C.inside && k % 3 === 0;
    const x = inner ? rng.range(0, X) : cx + Math.cos(a) * (d + hx), z = inner ? rng.range(0, Z) : cz + Math.sin(a) * (d + hz);
    let w = rng.range(5, 12), dp = rng.range(5, 12), h = rng.range(4, 9) * (d < 60 ? 1.25 : 1) * (C.tall || 1), yaw = rng.range(0, 0.3) + (k % 2) * Math.PI / 2;
    if (clear(x, z, Math.max(w, dp))) continue;
    if (C.crowd && Math.hypot(x / CELL - C.crowd[0], z / CELL - C.crowd[1]) < C.crowd[2] / CELL + Math.max(w, dp) / CELL) continue;   // the square stays open
    if (C.maxH) h = Math.min(h, C.maxH);
    addBox(mb, x, y0 + h / 2, z, w / 2, h / 2, dp / 2, T.WINDOWS, yaw);
    const kind = rng.next(), m = Math.min(w, dp);
    addBox(mb, x, y0 + h + 0.15, z, w / 2 + 0.15, 0.15, dp / 2 + 0.15, kind < 0.5 ? T.MUD : T.HEWN, yaw);       // its flat roof
    if (kind < 0.16) smoothLathe(mb, x, y0 + h + 0.3, z, [[m * 0.42, 0], [m * 0.4, m * 0.18], [m * 0.3, m * 0.36], [0.15, m * 0.46], [0.05, m * 0.56], [0, m * 0.58]], 10, k % 3 ? T.GILT : T.HEWN, ONE3, [0, 1, 0]);   // a dome
    else if (kind < 0.16 + (C.towers || 0.06)) {                                    // a tower, with a conical cap
      const th = h + rng.range(5, 13) * (C.tall || 1), tr = rng.range(1.5, 2.4);
      addLathe(mb, x, y0, z, [[tr, 0], [tr, th], [tr * 1.25, th + 0.6], [tr * 1.25, th + 1.2], [0, th + 1.2]], 8, T.WINDOWS);
      addLathe(mb, x, y0 + th + 1.2, z, [[tr * 1.3, 0], [0, tr * 2.2]], 8, T.SHIELD);
    } else if (kind < 0.5) for (let q = 0; q < 4; q++) {                          // a parapet round the roof terrace
      const e = q < 2 ? 1 : -1, along = q % 2 === 0, c = Math.cos(yaw), sn = Math.sin(yaw), lx = along ? 0 : e * w / 2, lz = along ? e * dp / 2 : 0;
      addBox(mb, x + lx * c + lz * sn, y0 + h + 0.6, z - lx * sn + lz * c, along ? w / 2 : 0.15, 0.35, along ? 0.15 : dp / 2, T.HEWN, yaw);
    }
  }
  if (C.crowd) {                                                                 // the multitude in the square below: a thousand dark heads and shoulders
    const [qx, qz, qr, qn] = C.crowd;
    for (let k = 0; k < qn; k++) {
      const a = rng.range(0, Math.PI * 2), r = Math.sqrt(rng.next()) * qr, x = (qx + Math.cos(a) * r / CELL) * CELL, z = (qz + Math.sin(a) * r / CELL) * CELL, h = rng.range(1.55, 1.85), tint = rng.next();
      addBox(mb, x, y0 + h * 0.4, z, 0.22, h * 0.4, 0.15, tint < 0.3 ? T.CLOTH : tint < 0.6 ? T.ROBE : tint < 0.8 ? T.TABARD : T.LEATHER, rng.range(0, 3));
      addRock(mb, x, y0 + h * 0.88, z, 0.13, 0.14, 0.13, k, rng.next() < 0.5 ? T.HAIR : T.SKIN, 0.1);
      if (rng.next() < 0.3) addBox(mb, x + 0.2, y0 + h + 0.15, z, 0.04, 0.35, 0.04, T.SKIN, 0, ONE3, rng.range(-0.3, 0.3));   // a fist raised, shaking at Arpello
    }
  }
  if (C.nowall) return;
  const R = C.at ? C.wall : Math.max(X, Z) / 2 + (C.wall || 210), N = C.at ? 24 : 36, WH = C.wallH || 7;   // the city wall, with a tower at every turn
  for (let k = 0; k < N; k++) {
    const a0 = k / N * Math.PI * 2, a1 = (k + 1) / N * Math.PI * 2, x0 = cx + Math.cos(a0) * R, z0 = cz + Math.sin(a0) * R * 0.8, x1 = cx + Math.cos(a1) * R, z1 = cz + Math.sin(a1) * R * 0.8;
    const L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0);
    addBox(mb, (x0 + x1) / 2, y0 + WH, (z0 + z1) / 2, 2.2, WH, L / 2 + 1, T.HEWN, yaw);
    for (let q = 0; q < Math.floor(L / 3); q++) { const u = (q + 0.5) / Math.floor(L / 3); addBox(mb, x0 + (x1 - x0) * u, y0 + WH * 2 + 0.7, z0 + (z1 - z0) * u, 0.7, 0.7, 0.9, T.HEWN, yaw); }   // merlons
    addLathe(mb, x0, y0, z0, [[5, 0], [5, WH * 2 + 5], [5.8, WH * 2 + 5.5], [5.8, WH * 2 + 7], [0, WH * 2 + 7]], 8, T.HEWN);
    for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2; addBox(mb, x0 + Math.cos(a) * 5.4, y0 + WH * 2 + 7.6, z0 + Math.sin(a) * 5.4, 0.7, 0.6, 0.7, T.HEWN, a); }
  }
}
function bakeLights(mb, lights, amb) {
  const d = mb.d;
  for (let i = 0; i < mb.n; i++) {
    const o = i * 10, px = d[o], py = d[o + 1], pz = d[o + 2], nx = d[o + 3], ny = d[o + 4], nz = d[o + 5];
    let r = amb[0], g = amb[1], b = amb[2];
    let outside = -1;
    for (const L of lights) {
      const dx = L.x - px, dy = L.y - py, dz = L.z - pz, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > L.rad * L.rad) continue;
      if (L.sky) {                                        // the moon: on what stands under the open sky, not into the halls
        if (outside < 0) { const gx = Math.floor((px - nx * 0.05) / CELL), gz = Math.floor((pz - nz * 0.05) / CELL), ci = cellIdx(gx, gz); outside = ci < 0 || LV.kind[ci] === 0 || (LV.flags[ci] & F_SKY) ? 1 : 0; }
        if (!outside) continue;
      }
      const dist = Math.sqrt(d2) || 1e-3;
      let att = 1 - dist / L.rad; att *= att;
      const lam = Math.max(0, (dx * nx + dy * ny + dz * nz) / dist) * 0.75 + 0.25;
      const k = att * lam * L.i;
      r += L.r * k; g += L.g * k; b += L.b * k;
    }
    d[o + 6] = r * d[o + 6]; d[o + 7] = g * d[o + 7]; d[o + 8] = b * d[o + 8];   // the vertex colour is its occlusion
  }
}
const AMBIENT = [0.07, 0.064, 0.056];
// Dressed corridors are ribbed: every two cells a transverse arch follows the vault across, sprung from a pilaster on each
// wall (with a plinth and a corbel), so a long passage reads in bays as Piranesi drew them, not as one plain tube.
// Drawn only, and kept within a hand of the wall, inside a man's radius, so nothing walks into them.
function addRibs(mb) {
  const W = LV.W, T0 = 0.22, HW = 0.2;
  LV.spec.rooms.forEach((r, ri) => {
    if (r.style !== 'hewn' || r.solid || r.pit || r.sky || r.noribs || !r.size) return;
    const [w, d] = r.size, along = w >= d ? 'x' : 'z', L = Math.max(w, d), S = Math.min(w, d);
    if (S > 4 || L < 4) return;
    for (let k = 2; k < L - 1; k += 2) {
      const line = along === 'x' ? r.at[0] + k : r.at[1] + k;           // the grid line the rib stands on
      const cells = [];
      for (let j = 0; j < S; j++) for (const back of [-1, 0]) {
        const gx = along === 'x' ? line + back : r.at[0] + j, gz = along === 'x' ? r.at[1] + j : line + back, i = cellIdx(gx, gz);
        cells.push(i >= 0 && LV.room[i] === ri && LV.kind[i] === 1 && !(LV.flags[i] & (F_TALL | F_SKY)));
      }
      if (!cells.every(Boolean)) continue;
      const tex = T.ASHLAR;
      const cs = [];
      for (let j = 0; j <= S; j++) cs.push(along === 'x' ? corner(line, r.at[1] + j) : corner(r.at[0] + j, line));
      const off = along === 'x' ? [1, 0] : [0, 1];                        // the rib's thickness runs along the corridor
      const pt = (q, dy, e) => [(along === 'x' ? line * CELL : q.x) + off[0] * e * HW, q.c + dy, (along === 'x' ? q.z : line * CELL) + off[1] * e * HW];
      for (let j = 0; j < S; j++) {
        const a = cs[j], b = cs[j + 1];
        mb.quad(pt(a, -T0, -1), pt(b, -T0, -1), pt(b, -T0, 1), pt(a, -T0, 1), tex, 0, -1, 0);                       // its soffit
        for (const e of [-1, 1]) mb.quad(pt(a, 0.05, e), pt(b, 0.05, e), pt(b, -T0, e), pt(a, -T0, e), tex, off[0] * e, 0, off[1] * e);   // its faces
      }
      for (const [q, inward] of [[cs[0], 1], [cs[S], -1]]) {               // the pilasters, where a wall stands behind
        const gx = along === 'x' ? line : r.at[0] + (inward > 0 ? -1 : S), gz = along === 'x' ? r.at[1] + (inward > 0 ? -1 : S) : line;
        const gx2 = along === 'x' ? line - 1 : gx, gz2 = along === 'x' ? gz : line - 1;
        if (kindAt(gx, gz) !== 0 || kindAt(gx2, gz2) !== 0) continue;
        const nx = along === 'x' ? 0 : inward, nz = along === 'x' ? inward : 0, x = (along === 'x' ? line * CELL : q.x) + nx * 0.1, z = (along === 'x' ? q.z : line * CELL) + nz * 0.1;
        const f = q.fo, top = q.c - T0, yaw = along === 'x' ? 0 : Math.PI / 2;
        addBox(mb, x, (f + top) / 2, z, HW, (top - f) / 2, 0.13, tex, yaw);
        addBox(mb, x + nx * 0.03, f + 0.2, z + nz * 0.03, HW + 0.06, 0.2, 0.17, tex, yaw);                 // the plinth
        addBox(mb, x + nx * 0.05, top - 0.1, z + nz * 0.05, HW + 0.07, 0.1, 0.2, tex, yaw);                // the corbel the arch springs from
      }
    }
  });
}
const DIRS = [[0, -1, 0, 0, 1, 0], [1, 0, 1, 0, 1, 1], [0, 1, 1, 1, 0, 1], [-1, 0, 0, 1, 0, 0]];
function buildLevelMesh() {
  const mb = new MeshBuilder(40000), W = LV.W, H = LV.H;
  const P = (q, y) => [q.x, y, q.z];
  // under the open sky a building has a body: the masonry about a roofed room stands up to just over its ceiling, with a
  // top, an outer face toward the sky and a roof over the room, not the bare inner planes of the room seen from behind
  const ROOF = 0.35, roofed = (x, z) => x >= 0 && z >= 0 && x < W && z < H && LV.kind[z * W + x] !== 0 && !(LV.flags[z * W + x] & F_SKY);
  const masonTex = (x, z, w) => { const t = x >= 0 && z >= 0 && x < W && z < H ? LV.tex[z * W + x] : null; return t && LV.kind[z * W + x] === 0 && T[t[w]] !== undefined ? T[t[w]] : T.HEWN; };   // a solid room's own face (an earth bank, raw hides), or plain masonry
  const roofTop = (x, z) => { if (x >= 0 && z >= 0 && x < W && z < H && LV.kind[z * W + x] === 0 && LV.top[z * W + x] > 0) return LV.top[z * W + x]; let t = -Infinity; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (roofed(x + dx, z + dz)) t = Math.max(t, LV.ceil[(z + dz) * W + x + dx]); return t + ROOF; };
  if (LEVEL.open) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const idx = j * W + i, x0 = i * CELL, x1 = x0 + CELL, z0 = j * CELL, z1 = z0 + CELL;
    if (LV.kind[idx] === 0) {                             // masonry about a roofed room: its flat top
      const t = roofTop(i, j); if (t === -Infinity) continue;
      mb.quad([x0, t, z0], [x0, t, z1], [x1, t, z1], [x1, t, z0], masonTex(i, j, 'floor'), 0, 1, 0);
      for (const d of DIRS) {                             // and its sides, where its neighbour (masonry, or a room's roof) stands lower: no step left open, however small
        const nx = i + d[0], nz = j + d[1]; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const nI = nz * W + nx, tn = LV.kind[nI] === 0 ? roofTop(nx, nz) : !(LV.flags[nI] & F_SKY) ? LV.ceil[nI] + ROOF : null;
        if (tn === null || tn >= t - 0.001) continue;
        const b = tn === -Infinity ? t - 6 : tn, ax = (i + d[2]) * CELL, az = (j + d[3]) * CELL, bx = (i + d[4]) * CELL, bz = (j + d[5]) * CELL;
        mb.quad([ax, b, az], [bx, b, bz], [bx, t, bz], [ax, t, az], masonTex(i, j, 'wall'), d[0], 0, d[1]);
      }
    } else if (!(LV.flags[idx] & F_SKY)) {                 // a roofed room: a roof over it
      const t = LV.ceil[idx] + ROOF;
      mb.quad([x0, t, z0], [x0, t, z1], [x1, t, z1], [x1, t, z0], T.HEWN, 0, 1, 0);
      for (const d of DIRS) {                             // and a band of stone over its ceiling's edge where it opens onto the sky
        const nx = i + d[0], nz = j + d[1]; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const nI = nz * W + nx; if (LV.kind[nI] === 0 || !(LV.flags[nI] & F_SKY)) continue;
        const ax = (i + d[2]) * CELL, az = (j + d[3]) * CELL, bx = (i + d[4]) * CELL, bz = (j + d[5]) * CELL, b = LV.ceil[idx] - 0.05;
        mb.quad([ax, b, az], [bx, b, bz], [bx, t, bz], [ax, t, az], LV.tex[idx] && T[LV.tex[idx].wall] !== undefined && LEVEL.level === 'e1m7' ? T[LV.tex[idx].wall] : T.HEWN, d[0], 0, d[1]);   // (a siege tower's lintel is timber)
      }
    }
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const idx = j * W + i, k = LV.kind[idx];
    if (!k) continue;
    const fl = LV.flags[idx], tex = LV.tex[idx];
    const c0 = corner(i, j), c1 = corner(i + 1, j), c2 = corner(i + 1, j + 1), c3 = corner(i, j + 1);
    const fy = q => (k === 2 ? q.fp : q.fo);
    const fLayer = k === 2 ? (LV.void[idx] ? T.BLACK : LEVEL.open && !(fl & F_WATER) ? T.MUD : T.SLIME) : T[tex.floor];   // (a pit dug in a field has earth at its bottom)   // a deep pit's bottom is black: a drop, not a puddle
    const diag = hash4(i, j, 2, 3) & 1;
    const f0 = P(c0, fy(c0)), f1 = P(c1, fy(c1)), f2 = P(c2, fy(c2)), f3 = P(c3, fy(c3));
    const ao = q => (q.ao === undefined ? 1 : q.ao), a0 = ao(c0), a1 = ao(c1), a2 = ao(c2), a3 = ao(c3);   // the floor darkens where it meets a wall
    if (diag) { mb.triV(f0, f1, f2, fLayer, 0, 1, 0, a0, a1, a2); mb.triV(f0, f2, f3, fLayer, 0, 1, 0, a0, a2, a3); }
    else { mb.triV(f0, f1, f3, fLayer, 0, 1, 0, a0, a1, a3); mb.triV(f1, f2, f3, fLayer, 0, 1, 0, a1, a2, a3); }
    const open = LEVEL.open && (fl & F_SKY);              // under the open sky: no ceiling, and no wall at the world's edge
    if (k === 1 && LV.rough[idx] >= 0.75 && !LEVEL.open && !(fl & F_WATER) && hrand(i, j, 3, 78) < 0.09) {   // a puddle in a hollow of the cave floor, lying on it
      const cx = (i + 0.3 + 0.4 * hrand(i, j, 1, 79)) * CELL, cz = (j + 0.3 + 0.4 * hrand(i, j, 2, 79)) * CELL, R0 = 0.5 + 0.5 * hrand(i, j, 4, 79), NP = 9;
      const at = (a, rr) => { const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr * 0.8; return [x, groundInfo(x, z).floor + 0.025, z]; };
      const c = at(0, 0);
      for (let q = 0; q < NP; q++) {
        const a0 = q / NP * Math.PI * 2, a1 = (q + 1) / NP * Math.PI * 2, r0 = R0 * (0.7 + 0.5 * hrand(i, j, q, 80)), r1 = R0 * (0.7 + 0.5 * hrand(i, j, (q + 1) % NP, 80));
        mb.tri(c, at(a0, r0 * 0.5), at(a1, r1 * 0.5), T.WATER, 0, 1, 0); mb.quad(at(a0, r0 * 0.5), at(a0, r0), at(a1, r1), at(a1, r1 * 0.5), T.WATER, 0, 1, 0);
      }
    }
    if (fl & F_WATER) {                                   // the moat: still black water a little below the banks
      const wy = LEVEL.waterY || -1;
      mb.quad([c0.x, wy, c0.z], [c1.x, wy, c1.z], [c2.x, wy, c2.z], [c3.x, wy, c3.z], T.WATER, 0, 1, 0);
    }
    const cLayer = (fl & F_SKY) ? (tex.ceil === 'SUNSET' ? T.SUNSET : T.SKY) : T[tex.ceil];
    // under the open sky a roofed cell's corner can be shared with the sky's: its walls and ceiling stop at its own roof, not run up to the sky's
    const cy = LEVEL.open && !(fl & F_SKY) ? q => (q.tall ? Math.min(q.c, LV.ceil[idx] + 0.2) : q.c) : q => q.c;   // (only a corner the sky shares: between two roofed cells the corner stays shared, watertight)
    const e0 = P(c0, cy(c0)), e1 = P(c1, cy(c1)), e2 = P(c2, cy(c2)), e3 = P(c3, cy(c3));
    if (!open) {
      const cA = q => 0.55 + 0.45 * ao(q);
      if (diag) { mb.triV(e0, e1, e2, cLayer, 0, -1, 0, cA(c0), cA(c1), cA(c2)); mb.triV(e0, e2, e3, cLayer, 0, -1, 0, cA(c0), cA(c2), cA(c3)); }
      else { mb.triV(e0, e1, e3, cLayer, 0, -1, 0, cA(c0), cA(c1), cA(c3)); mb.triV(e1, e2, e3, cLayer, 0, -1, 0, cA(c1), cA(c2), cA(c3)); }
      if (k === 1 && LV.rough[idx] >= 0.75 && !LEVEL.open) for (let q = 0; q < 3; q++) {   // a cave's roof: dripstone hanging from it, clear of a man's head
        if (hrand(i, j, q + 40, 81) > 0.3) continue;
        const x = (i + 0.15 + 0.7 * hrand(i, j, q, 82)) * CELL, z = (j + 0.15 + 0.7 * hrand(i, j, q, 83)) * CELL, g = groundInfo(x, z), room = g.ceil - g.floor - 2.3;
        if (room < 0.15) continue;
        const len = Math.min(room, 0.25 + 0.75 * hrand(i, j, q, 84)), r = 0.05 + 0.08 * hrand(i, j, q, 85);
        addSpike(mb, x, g.ceil + 0.1, z, [0, -1, 0], len + 0.1, r, 5, LV.tex[idx] && T[LV.tex[idx].wall] !== undefined ? T[LV.tex[idx].wall] : T.ROCK);
      }
    }
    for (const d of DIRS) {
      const nk = kindAt(i + d[0], j + d[1]);
      const ca = corner(i + d[2], j + d[3]), cb = corner(i + d[4], j + d[5]);
      if (nk === 0 && open) {                               // the edge of the world: nothing; the masonry of a building: its outer face
        const t = roofTop(i + d[0], j + d[1]);
        if (t !== -Infinity) wallStrip(mb, ca, cb, fy(ca), fy(cb), t, t, masonTex(i + d[0], j + d[1], 'wall'), -d[0], -d[1]);
        continue;
      }
      if (nk === 0) wallStrip(mb, ca, cb, fy(ca), fy(cb), cy(ca), cy(cb), T[tex.wall], -d[0], -d[1]);
      if (nk === 0 && k === 1 && LV.rough[idx] >= 0.75 && !LEVEL.open) {   // a cave: fallen rock and scree heaped at the foot of its walls
        for (let q = 0; q < 3; q++) {
          const h = hrand(i * 4 + d[0] + 7, j * 4 + d[1] + 7, q, 71); if (h > 0.62) continue;
          const u = 0.15 + 0.7 * hrand(i, j, q * 3 + d[0] * 5 + d[1] * 11, 72), ax = ca.x + (cb.x - ca.x) * u, az = ca.z + (cb.z - ca.z) * u;
          const sz = 0.12 + 0.3 * hrand(i, j, q + 9, 73), x = ax - d[0] * (sz + 0.12), z = az - d[1] * (sz + 0.12), y = groundInfo(x, z).floor;
          addRock(mb, x, y + sz * 0.35, z, sz * 1.3, sz * 0.8, sz * 1.1, i * 131 + j * 17 + q, q === 2 ? T.ROCK : T[tex.wall], 0.4);
        }
        if (hrand(i * 3 + d[0], j * 3 + d[1], 5, 74) < 0.22) {   // flowstone: a drape of it down the wall from the roof, sunk in the wall, never a hand out from it
          const u = 0.3 + 0.4 * hrand(i, j, d[0] * 3 + d[1], 75), ax = ca.x + (cb.x - ca.x) * u, az = ca.z + (cb.z - ca.z) * u, g = groundInfo(ax - d[0] * 0.5, az - d[1] * 0.5);
          const full = hrand(i, j, 7, 76) < 0.35, n = 7, sd = i * 37 + j * 11 + d[0] * 5;
          for (let q = 0; q < n; q++) {
            const t = q / (n - 1), y = g.ceil - (g.ceil - g.floor) * (full ? t : t * 0.6), r = full ? 0.32 + 0.12 * Math.sin(t * 9 + sd) : 0.38 * (1 - t * 0.7);
            const x = ax - d[0] * (r * 0.55), z = az - d[1] * (r * 0.55), wob = (hrand(sd, q, 1, 77) - 0.5) * 0.25;
            addRock(mb, x + d[1] * wob, y, z - d[0] * wob, r * (d[0] ? 0.7 : 1.1), (g.ceil - g.floor) / n * 0.9, r * (d[1] ? 0.7 : 1.1), sd + q, T[tex.wall], 0.35);
          }
        }
      }
      else if (k === 2 && nk === 1) mb.quad(P(ca, ca.fp), P(cb, cb.fp), P(cb, cb.fo), P(ca, ca.fo), T[tex.wall], -d[0], 0, -d[1]);
    }
  }
  for (const p of LV.props) addPrefab(mb, p);
  addRibs(mb);
  for (const q of LV.parapets || []) {                  // the crenellated parapet: a low wall, merlons on it, a round post at each end of a run
    const len = Math.hypot(q.x1 - q.x0, q.z1 - q.z0), yaw = Math.atan2(q.x1 - q.x0, q.z1 - q.z0), mx = (q.x0 + q.x1) / 2, mz = (q.z0 + q.z1) / 2;
    addBox(mb, mx, q.y + 0.5, mz, 0.22, 0.5, len / 2, T.HEWN, yaw);
    for (let k = 0; k < 2; k++) { const u = (k + 0.5) / 2 - 0.5, x = mx + (q.x1 - q.x0) * u, z = mz + (q.z1 - q.z0) * u; addBox(mb, x, q.y + 1.22, z, 0.24, 0.24, len * 0.16, T.HEWN, yaw); }
    for (const [x, z] of [[q.x0, q.z0], [q.x1, q.z1]]) addLathe(mb, x, q.y, z, [[0.3, 0], [0.3, 1.05], [0.36, 1.1], [0.36, 1.25], [0, 1.3]], 8, T.HEWN);   // rounded off where runs meet
  }
  if (LEVEL.open) {                                       // the plain runs on past the boulders to the horizon, with low hills far off
    const X = W * CELL, Z = H * CELL, F = 1600, g = -0.05, ring = [[-F, -F], [X + F, -F], [X + F, Z + F], [-F, Z + F]], inner = [[0, 0], [X, 0], [X, Z], [0, Z]];
    for (let k = 0; k < 4; k++) {
      const a = inner[k], b = inner[(k + 1) % 4], c = ring[(k + 1) % 4], d = ring[k];
      mb.quad([a[0], g, a[1]], [b[0], g, b[1]], [c[0], g, c[1]], [d[0], g, d[1]], T.TURF, 0, 1, 0);
    }
    for (let k = 0; k < 26; k++) {
      const a = k / 26 * Math.PI * 2 + hrand(k, 1, 4, 4) * 0.2, rr = 260 + 260 * hrand(k, 2, 4, 4), cx = X / 2 + Math.cos(a) * rr, cz = Z / 2 + Math.sin(a) * rr * 0.8;
      addRock(mb, cx, -6, cz, 50 + 60 * hrand(k, 3, 4, 4), 10 + 16 * hrand(k, 4, 4, 4), 40 + 50 * hrand(k, 5, 4, 4), 300 + k, k % 3 ? T.TURF : T.ROCK, 0.3);
    }
  }
  if (LEVEL.city) addCity(mb, LEVEL.city);
  bakeLights(mb, LV.lights, LEVEL.ambient || AMBIENT);
  return mb.finish();
}

// ---- the sky over an open level: a dome graded from a burning horizon to a dark zenith, and the sun going down
function buildSkyMesh(sunDir, night) {
  const mb = new MeshBuilder(night ? 16384 : 8192), R = 1000, rings = 44, seg = 36, TX = night ? T.SKY : T.SUNSET;   // night: the pale ink ramp, not the sunset's reds
  const grade = night ? e => [lerp(0.16, 0.015, Math.min(1, e / 0.6)), lerp(0.11, 0.015, Math.min(1, e / 0.6)), lerp(0.13, 0.035, Math.min(1, e / 0.6))] : e => e < 0.12 ? [1.25, 0.55, 0.32] : e < 0.35 ? [lerp(1.25, 0.62, (e - 0.12) / 0.23), lerp(0.55, 0.15, (e - 0.12) / 0.23), lerp(0.32, 0.12, (e - 0.12) / 0.23)]
    : [lerp(0.62, 0.2, Math.min(1, (e - 0.35) / 0.65)), lerp(0.15, 0.035, Math.min(1, (e - 0.35) / 0.65)), lerp(0.12, 0.05, Math.min(1, (e - 0.35) / 0.65))];
  const pt = (el, az) => [Math.cos(el) * Math.cos(az) * R, Math.sin(el) * R, Math.cos(el) * Math.sin(az) * R];
  for (let r = 0; r < rings; r++) {
    const e0 = -0.25 + (Math.PI / 2 + 0.25) * r / rings, e1 = -0.25 + (Math.PI / 2 + 0.25) * (r + 1) / rings, col = grade(Math.max(0, (e0 + e1) / 2) / (Math.PI / 2));
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2;
      mb.quad(pt(e0, a0), pt(e0, a1), pt(e1, a1), pt(e1, a0), TX, 0, -1, 0, col);
    }
  }
  if (night) {                                          // "under the stars": a field of them, and a low moon
    const rng = new RNG(97);
    for (let k = 0; k < 900; k++) {
      const el = Math.asin(rng.range(0.16, 1)), az = rng.range(0, Math.PI * 2), c = pt(el, az).map(v => v * 0.97), sz = rng.range(1.2, 3.2), b = rng.range(0.6, 1.6);
      const up = [0, 1, 0], n = norm3(c), uu = norm3(cross3(Math.abs(n[1]) > 0.95 ? [1, 0, 0] : up, n)), ww = cross3(n, uu);
      const p = (i, j) => [c[0] + (uu[0] * i + ww[0] * j) * sz, c[1] + (uu[1] * i + ww[1] * j) * sz, c[2] + (uu[2] * i + ww[2] * j) * sz];
      mb.quad(p(-1, -1), p(1, -1), p(1, 1), p(-1, 1), TX, -n[0], -n[1], -n[2], [b, b * 0.95, b * 0.85]);
      mb.quad(p(-1, -1), p(-1, 1), p(1, 1), p(1, -1), TX, n[0], n[1], n[2], [b, b * 0.95, b * 0.85]);
    }
  }
  const d = norm3(sunDir), up = [0, 1, 0], u = norm3(cross3(up, d)), w = cross3(d, u);
  for (const [rad, col, dist] of night ? [[70, [0.22, 0.2, 0.22], 960], [26, [1.3, 1.2, 1.0], 940]] : [[150, [0.9, 0.18, 0.08], 960], [80, [1.6, 0.55, 0.22], 950], [52, [1.9, 0.95, 0.45], 940]]) {   // a halo, then the disc
    const c = [d[0] * dist, d[1] * dist, d[2] * dist];
    for (let k = 0; k < 24; k++) {
      const a0 = k / 24 * Math.PI * 2, a1 = (k + 1) / 24 * Math.PI * 2, p = a => [c[0] + (u[0] * Math.cos(a) + w[0] * Math.sin(a)) * rad, c[1] + (u[1] * Math.cos(a) + w[1] * Math.sin(a)) * rad, c[2] + (u[2] * Math.cos(a) + w[2] * Math.sin(a)) * rad];
      mb.tri(c, p(a0), p(a1), TX, -d[0], -d[1], -d[2], col);
    }
  }
  return mb.finish();
}

// ---- entity models (built at the origin, +z forward, feet at y=0) ---------
function buildKeys(mb, s) {
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; addBox(mb, Math.cos(a) * 0.08 * s, 0.1 * s + Math.sin(a) * 0.08 * s, 0, 0.025 * s, 0.025 * s, 0.012 * s, T.IRON, 0, ONE3, 0); }
  for (let k = 0; k < 3; k++) {
    const a = -0.5 + k * 0.5, x = Math.sin(a) * 0.2 * s, y = 0.1 * s - Math.cos(a) * 0.2 * s;
    addBox(mb, x, y, 0, 0.018 * s, 0.13 * s, 0.01 * s, T.IRON, 0, ONE3, 0);
    addBox(mb, x + 0.03 * s, y - 0.1 * s, 0, 0.03 * s, 0.025 * s, 0.01 * s, T.IRON);
  }
}
function buildModel(name) {
  if (name.startsWith('satha_head') || name.startsWith('satha_jaw')) return buildSathaHead(name);
  if (name === 'vm_hand_grip') return buildHand('grip');
  if (name === 'vm_hand_open') return buildHand('open');
  if (['vm_forearm', 'vm_manacle', 'vm_chain', 'vm_hilt', 'vm_upper', 'dagger2'].includes(name)) return buildViewModel(name);
  const mb = new MeshBuilder(512);
  if (name.startsWith('char:')) { const [, id, part] = name.split(':'); return buildCharPart(id, part); }
  if (name.startsWith('weeper:')) return buildWeeperPart(name.split(':')[1]);
  if (name.startsWith('horse:')) return buildHorsePart(name.split(':')[1]);
  if (name.startsWith('yothga:')) return buildYothgaPart(name.split(':')[1]);
  if (name.startsWith('eagle:')) return buildEaglePart(name.split(':')[1]);
  if (name.startsWith('broken:')) return buildBroken(name.split(':')[1]);
  if (name.startsWith('bars:')) {
    // a run of iron bars along +x, from 0 to len, base at y=0
    const [, len, h] = name.split(':').map(Number);
    for (let x = 0.15; x < len; x += 0.3) addBox(mb, x, h / 2, 0, 0.035, h / 2, 0.035, T.IRON);
    for (const y of [0.15, h * 0.42, h - 0.12]) addBox(mb, len / 2, y, 0, len / 2, 0.05, 0.06, T.IRON);
    return mb.finish();
  }
  if (name === 'vinestem') {                            // a length of Yothga's vine, 1 m along +y: pale, knotted, sprouting thorns and small jade leaves
    smoothLathe(mb, 0, 0, 0, [[0.06, 0], [0.05, 0.25], [0.065, 0.5], [0.05, 0.75], [0.06, 1.0]], 7, T.SICK, ONE3, [0, 1, 0]);
    for (let k = 0; k < 4; k++) { const a = k * 2.3, h = 0.15 + k * 0.23; addSpike(mb, Math.cos(a) * 0.04, h, Math.sin(a) * 0.04, [Math.cos(a), 0.4, Math.sin(a)], k % 2 ? 0.08 : 0.2, k % 2 ? 0.012 : 0.05, 3, k % 2 ? T.BONE : T.SLIME); }
    return mb.finish();
  }
  if (name === 'vinecoil') {                            // a loop of the vine, round a man's body: radius 1 in xz
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; addBox(mb, Math.cos(a), Math.sin(k * 1.7) * 0.03, Math.sin(a), 0.06, 0.055, 0.25, T.SICK, -a); }
    return mb.finish();
  }
  if (name === 'creeper') {                             // creepers hanging from the vault, 1 m long down -y, leaves along them
    for (let s = 0; s < 3; s++) { const ox = (s - 1) * 0.12, oz = Math.sin(s * 2.1) * 0.08;
      smoothLathe(mb, ox, -1, oz, [[0.008, 0], [0.018, 0.5], [0.025, 1]], 5, T.SICK, ONE3, [0, 1, 0]);
      for (let k = 0; k < 5; k++) addSpike(mb, ox, -0.15 - k * 0.18 - s * 0.05, oz, [Math.cos(k * 2 + s), -0.4, Math.sin(k * 2 + s)], 0.14, 0.05, 3, T.SLIME); }
    return mb.finish();
  }
  if (name === 'maw') {                                 // a pit-thing's mouthful: crowded, crooked fangs on blood-black gums, and gore hanging from them; origin at the mouth, +z out of it, mouth ~0.1 wide
    const r = new RNG(77);
    for (const [row, n, y, dir] of [[0, 9, 0.012, -1], [1, 7, -0.03, 1]]) {
      for (let k = 0; k < n; k++) {
        const a = (k / (n - 1) - 0.5) * 2.4, w = row ? 0.042 : 0.05, x = Math.sin(a) * w, z = Math.cos(a) * w * 0.9 - w * 0.6;
        addBox(mb, x, y, z, 0.008, 0.006, 0.008, T.BLOOD);                                                                  // the gum
        const len = (0.022 + r.next() * 0.03) * (Math.abs(a) > 0.9 ? 1.4 : 1);
        addSpike(mb, x, y, z, [Math.sin(a) * 0.25 + (r.next() - 0.5) * 0.3, dir, 0.2 + (r.next() - 0.5) * 0.3], len, 0.0075, 4, r.next() > 0.6 ? T.BLOOD : T.BONE);
      }
    }
    for (let k = 0; k < 4; k++) addBox(mb, (k - 1.5) * 0.022, -0.035 - r.next() * 0.03, 0.01 - r.next() * 0.02, 0.003, 0.02 + r.next() * 0.02, 0.003, T.BLOOD);   // gore and slaver hanging
    return mb.finish();
  }
  if (name === 'plank') {                               // a rotten plank: two boards side by side, cleats, nails; length 1 along z
    for (const sx of [-1, 1]) addBox(mb, sx * 0.12, 0, 0, 0.115, 0.03, 0.5, T.WOOD, 0, ONE3, 0);
    for (const z of [-0.42, 0.42]) addBox(mb, 0, -0.045, z, 0.25, 0.025, 0.04, T.WOOD);
    for (const sx of [-1, 1]) for (const z of [-0.42, 0.42]) addBox(mb, sx * 0.12, 0.032, z, 0.012, 0.006, 0.012, T.IRON);
    return mb.finish();
  }
  switch (name) {
    case 'satha_head': {
      addRock(mb, 0, 0.5, 0.35, 0.72, 0.42, 1.05, 31, T.SCALES, 0.1);                 // skull plate
      addRock(mb, 0, 0.22, 0.3, 0.6, 0.22, 0.95, 33, T.BELLY, 0.1);                   // jaw
      addRock(mb, 0, 0.42, -0.45, 0.62, 0.48, 0.6, 35, T.SCALES, 0.12);               // neck
      for (const sx of [-1, 1]) {
        addBox(mb, sx * 0.48, 0.72, 0.62, 0.12, 0.07, 0.12, T.EYE, sx * 0.4);         // eyes (fire, fullbright)
        addBox(mb, sx * 0.5, 0.8, 0.6, 0.18, 0.04, 0.2, T.SCALES, sx * 0.4);          // brow ridge
        addSpike(mb, sx * 0.3, 0.32, 1.12, [0, -1, 0.15], 0.3, 0.05, 4, T.BONE);      // fangs
        addBox(mb, sx * 0.18, 0.58, 1.33, 0.05, 0.04, 0.03, T.BLACK);                 // nostrils
      }
      addBox(mb, 0, 0.3, 1.2, 0.4, 0.03, 0.15, T.BLACK);                              // mouth line
      break;
    }
    case 'satha_seg':
      addLathe(mb, 0, 0, 0, [[0.5, -0.8], [0.82, -0.45], [0.86, 0.1], [0.78, 0.6], [0.55, 0.85]], 7, T.SCALES, 0.2, ONE3, [0, 0, 1]);
      addBox(mb, 0, -0.72, 0, 0.42, 0.08, 0.7, T.BELLY);
      break;
    case 'satha_tail':
      addLathe(mb, 0, 0, 0, [[0.6, 0.6], [0.6, 0.3], [0.4, -0.8], [0.18, -1.9], [0, -2.6]], 6, T.SCALES, 0.2, ONE3, [0, 0, 1]);
      break;
    case 'ring': {                                       // an iron ring hanging from a staple leaded into the stone (origin at the wall's face, +z out of it)
      addBox(mb, 0, 0, 0.012, 0.07, 0.08, 0.012, T.IRON);                                   // the plate
      for (const sx of [-0.035, 0.035]) addBox(mb, sx, 0, 0.04, 0.012, 0.012, 0.03, T.IRON);   // the staple's legs
      addBox(mb, 0, 0, 0.068, 0.047, 0.012, 0.012, T.IRON);                                 // and its bridge, the ring through it
      const prof = []; for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI * 2; prof.push([0.115 + Math.cos(a) * 0.02, Math.sin(a) * 0.02]); }
      addLathe(mb, 0, -0.115, 0.05, prof, 14, T.IRON, 0, ONE3, [0, 0, 1]);                  // hanging flat to the wall
      break;
    }
    case 'link':
      addBox(mb, -0.05, 0, 0, 0.018, 0.018, 0.1, T.IRON); addBox(mb, 0.05, 0, 0, 0.018, 0.018, 0.1, T.IRON);
      addBox(mb, 0, 0, 0.09, 0.06, 0.018, 0.018, T.IRON); addBox(mb, 0, 0, -0.09, 0.06, 0.018, 0.018, T.IRON);
      break;
    case 'dagger':
      addBox(mb, 0, 0.07, 0, 0.022, 0.07, 0.022, T.WOOD);
      addBox(mb, 0, 0.15, 0, 0.07, 0.015, 0.025, T.IRON);
      addLathe(mb, 0, 0.16, 0, [[0.04, 0], [0.035, 0.18], [0, 0.32]], 4, T.BONE, Math.PI / 4);
      break;
    case 'choke': {                                       // a fall of stones from the roof, filling the tunnel floor to roof, 5 m by 2.5 m
      for (let k = 0; k < 26; k++) { const a = k * 2.399, u = hrand(k, 1, 7, 3), v = hrand(k, 2, 7, 3), h = hrand(k, 3, 7, 3);
        addRock(mb, (u - 0.5) * 4.4, 0.3 + h * 1.9 - Math.abs(u - 0.5) * 0.8, (v - 0.5) * 2.0, 0.45 + 0.35 * hrand(k, 4, 7, 3), 0.35 + 0.3 * hrand(k, 5, 7, 3), 0.45 + 0.3 * hrand(k, 6, 7, 3), 40 + k, T.ROCK, 0.4); }
      break;
    }
    case 'choke_down': {                                  // the same stones, brought down and spread across the floor
      for (let k = 0; k < 22; k++) { const u = hrand(k, 1, 9, 3), v = hrand(k, 2, 9, 3);
        addRock(mb, (u - 0.5) * 4.6, 0.12, (v - 0.5) * 5.5, 0.35 + 0.3 * hrand(k, 4, 9, 3), 0.14 + 0.12 * hrand(k, 5, 9, 3), 0.35 + 0.3 * hrand(k, 6, 9, 3), 70 + k, T.ROCK, 0.4); }
      break;
    }
    case 'bone':
      addLathe(mb, 0, 0, 0, [[0, -0.3], [0.05, -0.29], [0.03, -0.22], [0.025, 0.22], [0.05, 0.28], [0, 0.3]], 5, T.BONE, 0, ONE3, [0, 0, 1]);
      addRock(mb, 0.03, 0, 0.29, 0.05, 0.04, 0.04, 2, T.BONE); addRock(mb, -0.03, 0, -0.29, 0.05, 0.04, 0.04, 3, T.BONE);
      break;
    case 'keys': buildKeys(mb, 1); break;
    case 'sword': return buildCharPart('warden', 'sword');
    case 'plant': {                                       // a garden plant that should not be: a pale stem, jade leaves, livid blossoms
      smoothLathe(mb, 0, 0, 0, [[0.07, 0], [0.05, 0.8], [0.035, 1.6], [0.02, 2.2]], 6, T.SICK, ONE3, [0.05, 1, 0.02]);
      for (let k = 0; k < 7; k++) { const a = k * 2.4, h = 0.25 + k * 0.27; addSpike(mb, 0, h, 0, [Math.cos(a), 0.35 + 0.1 * (k % 3), Math.sin(a)], 0.55 - k * 0.04, 0.09, 3, T.SLIME); }
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.5; addRock(mb, Math.cos(a) * 0.25, 1.7 + k * 0.22, Math.sin(a) * 0.25, 0.16, 0.12, 0.16, 40 + k, T.BLOOD, 0.2); }
      break;
    }
    case 'presence':                                      // what floats up out of the well: no body, a wavering column of pallor
      smoothLathe(mb, 0, 0, 0, [[0.05, -2], [0.7, -1], [1.1, 0.4], [1.3, 1.4], [1.0, 2.4], [0.8, 3.2], [1.0, 4.1], [0.8, 5.0], [0.4, 5.9], [0.05, 6.6]], 16, T.PALE, ONE3, [0, 1, 0]);
      break;
    case 'vm_torch':                                      // a pitch torch: a tapered haft, an iron collar, a fat head of tarred rag
      smoothLathe(mb, 0, 0, 0, [[0.016, -0.42], [0.021, -0.1], [0.026, 0.2]], 7, T.WOOD, ONE3, [0, 1, 0]);
      smoothLathe(mb, 0, 0, 0, [[0.03, 0.19], [0.032, 0.2], [0.032, 0.225], [0.03, 0.235]], 8, T.IRON, ONE3, [0, 1, 0]);
      for (let k = 0; k < 4; k++) smoothLathe(mb, 0.004 * Math.sin(k * 2), 0, 0.004 * Math.cos(k * 2), [[0.03, 0.22 + k * 0.03], [0.045 - k * 0.003, 0.235 + k * 0.03], [0.04 - k * 0.003, 0.255 + k * 0.03]], 8, T.CLOTH, ONE3, [0.05 * Math.sin(k), 1, 0]);
      smoothLathe(mb, 0, 0, 0, [[0.036, 0.33], [0.028, 0.345], [0, 0.35]], 8, T.BLACK, ONE3, [0, 1, 0]);
      break;
    case 'vm_flame': case 'vm_flame_core': {              // a twisted teardrop of fire, ragged at the top
      const core = name === 'vm_flame_core';
      loft(mb, [S_(0, 0.045, 0.045, 0.045, 0), S_(0.05, 0.06, 0.06, 0.06, 0), S_(0.11, 0.045, 0.045, 0.045, 0.005), S_(0.17, 0.025, 0.025, 0.025, 0.012), S_(0.22, 0.004, 0.004, 0.004, 0.02)].map(st => Object.assign(st, { x: 0 })), 7, T.FIRE, 1, null, 'y');
      for (let k = 0; k < (core ? 0 : 4); k++) { const a = k / 4 * Math.PI * 2; addSpike(mb, Math.cos(a) * 0.03, 0.06, Math.sin(a) * 0.03, [Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35], 0.12 + 0.03 * (k % 2), 0.018, 4, T.FIRE); }
      break;
    }
    case 'decal:scratch': case 'decal:tally1': case 'decal:tally2': case 'decal:tally3': {   // a flat quad for an alpha-tested decal
      const layer = { 'decal:scratch': T.SCRATCH, 'decal:tally1': T.TALLY1, 'decal:tally2': T.TALLY2, 'decal:tally3': T.TALLY3 }[name];
      const w = name === 'decal:scratch' ? 0.75 : 0.32, h = name === 'decal:scratch' ? 0.42 : 0.42, c = [[-w, -h, 0, 1], [w, -h, 1, 1], [w, h, 1, 0], [-w, h, 0, 0]];
      for (const i of [0, 1, 2, 0, 2, 3]) mb.v([c[i][0], c[i][1], 0], 0, 0, 1, [c[i][2], c[i][3], 1], layer);
      break;
    }
    case 'spear': return buildCharPart('spearman', 'spear');
    case 'arrow':                                        // along +z
      smoothLathe(mb, 0, 0, 0, [[0.008, -0.4], [0.008, 0.3]], 4, T.WOOD, ONE3, [0, 0, 1]);
      loft(mb, [S_(0.3, 0.014, 0.004, 0.004, 0), S_(0.38, 0.001, 0.001, 0.001, 0)], 4, T.STEEL);
      addBox(mb, 0, 0.012, -0.34, 0.002, 0.014, 0.06, T.BONE); addBox(mb, 0, -0.012, -0.34, 0.002, 0.014, 0.06, T.BONE);
      break;
    case 'blood': addRock(mb, 0, 0, 0, 0.045, 0.045, 0.045, 4, T.BLOOD, 0.3); break;
    case 'spark': addRock(mb, 0, 0, 0, 0.03, 0.03, 0.03, 4, T.FIRE, 0.3); break;
    case 'hate_ring': {                                   // a flat ring of radius 1 (scaled to the wave's radius), a hand's breadth of livid light
      const N = 64;
      for (let k = 0; k < N; k++) {
        const a0 = k / N * Math.PI * 2, a1 = (k + 1) / N * Math.PI * 2, P = (a, r) => [Math.cos(a) * r, 0, Math.sin(a) * r];
        const q = [P(a0, 0.9), P(a1, 0.9), P(a1, 1.0), P(a0, 1.0)];
        for (const i of [0, 2, 1, 0, 3, 2]) mb.v(q[i], 0, 1, 0, ONE3, T.YOTHGA_BLOOM);
      }
      break;
    }
    case 'flame_sprite:0': case 'flame_sprite:1': case 'flame_sprite:2': case 'flame_sprite:3': {   // a unit quad, root at the origin, for one flame frame
      const layer = T['FLAME' + name.slice(-1)], c = [[-0.5, 0, 0, 1], [0.5, 0, 1, 1], [0.5, 1, 1, 0], [-0.5, 1, 0, 0]];
      for (const i of [0, 1, 2, 0, 2, 3]) mb.v([c[i][0], c[i][1], 0], 0, 0, 1, [c[i][2], c[i][3], 1], layer);
      break;
    }
    case 'vm_leg':                                       // the kick: a booted shin and foot, sole forward (+z is up the leg)
      smoothLathe(mb, 0, 0, 0, [[0.06, -0.02], [0.068, 0.1], [0.06, 0.3], [0.055, 0.42]], 8, T.LEATHER, ONE3, [0, 0, 1]);
      loft(mb, [S_(-0.06, 0.05, 0.05, 0.05, 0), S_(-0.1, 0.055, 0.06, 0.05, 0.03), S_(-0.16, 0.05, 0.035, 0.035, 0.08), S_(-0.2, 0.03, 0.02, 0.02, 0.1)], 10, T.LEATHER);
      break;
    case 'bread': addRock(mb, 0, 0.09, 0, 0.17, 0.09, 0.12, 6, T.STRAW, 0.25); break;
    case 'wine':
      addRock(mb, 0, 0.14, 0, 0.17, 0.13, 0.22, 9, T.CLOTH, 0.15);
      addLathe(mb, 0, 0.12, 0.2, [[0.04, 0], [0.03, 0.12], [0, 0.13]], 5, T.CLOTH, 0, ONE3, [0, 0.5, 1]);
      break;
    case 'jug':
      addLathe(mb, 0, 0, 0, [[0, 0], [0.09, 0], [0.13, 0.1], [0.11, 0.2], [0.05, 0.27], [0.06, 0.31], [0, 0.31]], 7, T.WOOD);
      break;
    case 'venom': addRock(mb, 0, 0, 0, 0.16, 0.16, 0.22, 2, T.VENOM, 0.3); break;
    case 'puddle': addLathe(mb, 0, 0.02, 0, [[0, 0], [1.0, 0], [0.8, 0.04], [0, 0.05]], 9, T.VENOM); break;
    case 'puff': addRock(mb, 0, 0, 0, 0.1, 0.1, 0.1, 2, T.BLACK, 0.3); break;
    case 'drop': addRock(mb, 0, 0, 0, 0.05, 0.05, 0.05, 4, T.DARKSKIN, 0.3); break;
    // first-person view-model: the hero's right forearm, still manacled
    case 'vm_arm':
      addLathe(mb, 0, 0, 0.02, [[0.045, 0], [0.055, 0.18], [0.065, 0.42]], 6, T.SKIN, 0, ONE3, [0, 0, 1]);   // forearm
      addLathe(mb, 0, 0, 0.06, [[0.07, 0], [0.074, 0.03], [0.074, 0.08], [0.07, 0.11]], 6, T.IRON, 0, ONE3, [0, 0, 1]);   // manacle
      addRock(mb, 0, 0.005, -0.03, 0.055, 0.05, 0.06, 13, T.SKIN, 0.15);   // fist
      addBox(mb, 0, 0.075, 0.12, 0.02, 0.012, 0.035, T.IRON);         // broken link
      break;
    default: addBox(mb, 0, 0.1, 0, 0.1, 0.1, 0.1, T.BONE);
  }
  return mb.finish();
}

// ===========================================================================
// Detailed models (Quake view-model / boss density): smooth normals, UVs.
// UV meshes put (u, v, shade) in the colour slot and draw with uv = true.
// ===========================================================================
const UV_MODELS = new Set(['weeper:tentacle', 'satha_head_uv', 'satha_jaw_uv', 'vm_forearm', 'vm_upper', 'vm_manacle', 'decal:scratch', 'decal:tally1', 'decal:tally2', 'decal:tally3']);

// Loft through elliptical stations along +z. Each station: {z, w, ht, hb, cy, x?}
// (half-width, height above and below the centre). u runs around from the
// bottom (0) over the top (0.5), v = z * vScale. Smooth per-vertex normals.
function loft(mb, st, sides, layer, vScale = 1, shade = null, axis = 'z', vOff = 0) {
  const ring = [];
  for (let i = 0; i < st.length; i++) {
    const s = st[i], prev = st[Math.max(0, i - 1)], next = st[Math.min(st.length - 1, i + 1)];
    const dz = next.z - prev.z || 1, dw = (next.w - prev.w) / dz;
    const r = [];
    for (let k = 0; k <= sides; k++) {
      const a = k / sides * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), h = ca > 0 ? s.hb : s.ht;
      const x = (s.x || 0) + sa * s.w, y = s.cy - ca * h;
      let n = norm3([sa / Math.max(s.w, 1e-3), -ca / Math.max(h, 1e-3), -dw * 0.6]);
      let p = [x, y, s.z];
      if (axis === 'y') { p = [x, s.z, -y]; n = [n[0], n[2], -n[1]]; }     // loft along +y instead
      r.push({ p, n, u: k / sides, v: s.z * vScale + vOff, sh: shade ? shade(k / sides, i / (st.length - 1)) : 1 });
    }
    ring.push(r);
  }
  const uv = layer === T.JELLY || layer === T.SATHA || layer === T.SATHA_HEAD || layer === T.SATHA_JAW || layer === T.PIT_HIDE || layer === T.PIT_HEAD || layer === T.PIT_JAW || layer === T.ARM || layer === T.MANACLE || layer === T.FACE_BRUTE || layer === T.FACE_EUNUCH || layer === T.FACE_VULTURE;   // UV skins carry (u, v, shade); others a grey tint
  for (let i = 0; i < ring.length - 1; i++) for (let k = 0; k < sides; k++) {
    const a = ring[i][k], b = ring[i][k + 1], c = ring[i + 1][k + 1], d = ring[i + 1][k];
    for (const q of [a, b, c, a, c, d]) { mb.ensure(1); mb.v(q.p, q.n[0], q.n[1], q.n[2], uv ? [q.u, q.v, q.sh] : [q.sh, q.sh, q.sh], layer); }
  }
}
const S_ = (z, w, ht, hb, cy, x) => ({ z, w, ht, hb, cy, x });

// ---- Satha's head: skull + hinged jaw, sculpted in lofted cross-sections ---
function buildSathaHead(part) {
  const mb = new MeshBuilder(2048);
  switch (part) {
    case 'satha_head_uv':                                   // skull: broad temples, flat crown, tapering snout
      loft(mb, [S_(-0.7, 0.92, 0.8, 0.8, 0), S_(-0.2, 1.0, 0.82, 0.62, 0.08), S_(0.35, 1.12, 0.78, 0.42, 0.22), S_(0.9, 1.1, 0.7, 0.3, 0.3),
        S_(1.45, 0.92, 0.58, 0.24, 0.32), S_(1.95, 0.7, 0.46, 0.2, 0.3), S_(2.35, 0.48, 0.34, 0.16, 0.26), S_(2.62, 0.27, 0.22, 0.12, 0.22), S_(2.76, 0.07, 0.07, 0.06, 0.2)],
      20, T.SATHA_HEAD, 1 / 3.6, null, 'z', 0.75 / 3.6);
      break;
    case 'satha_jaw_uv':                                    // lower jaw, pivots at its root
      loft(mb, [S_(-0.3, 0.9, 0.1, 0.55, -0.3), S_(0.4, 0.98, 0.1, 0.45, -0.18), S_(1.2, 0.84, 0.08, 0.32, -0.08), S_(1.9, 0.6, 0.07, 0.22, -0.02),
        S_(2.4, 0.36, 0.06, 0.14, 0.0), S_(2.62, 0.1, 0.04, 0.05, 0.02)], 16, T.SATHA_JAW, 1 / 3.6, null, 'z', 0.3 / 3.6);
      break;
  }
  return mb.finish();
}

// ---- Satha's body: one smooth tube rebuilt every frame along her spine ------
// spine(d) gives the point d units behind the head; B0 is the head's "down".
const TUBE_SIDES = 12;
function buildSathaTube(spine, len, step, B0, radius, shade) {   // shade(point): this ring's light relative to the chunk's (smooth across chunks)
  const n = Math.ceil(len / step) + 1, mb = new MeshBuilder(n * TUBE_SIDES * 6);
  let B = B0, prevRing = null;
  for (let i = 0; i < n; i++) {
    const d = Math.min(len, i * step), c = spine(d), a = spine(d + 0.2), b = spine(Math.max(0, d - 0.2));
    const Tn = norm3([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);     // points toward the tail
    const bd = B[0] * Tn[0] + B[1] * Tn[1] + B[2] * Tn[2];
    B = norm3([B[0] - Tn[0] * bd, B[1] - Tn[1] * bd, B[2] - Tn[2] * bd]);   // parallel transport
    const Sd = cross3(Tn, B), r = radius(d / len), sh = shade ? shade(c) : 1;
    const ring = [];
    for (let k = 0; k <= TUBE_SIDES; k++) {
      const ang = k / TUBE_SIDES * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
      const h = ca > 0 ? r * 0.78 : r * 0.92, w = r;               // flatter belly
      const p = [c[0] + B[0] * ca * h + Sd[0] * sa * w, c[1] + B[1] * ca * h + Sd[1] * sa * w, c[2] + B[2] * ca * h + Sd[2] * sa * w];
      const nn = norm3([B[0] * ca / h + Sd[0] * sa / w, B[1] * ca / h + Sd[1] * sa / w, B[2] * ca / h + Sd[2] * sa / w]);
      ring.push({ p, n: nn, u: k / TUBE_SIDES, v: d / 4.4, s: sh });
    }
    if (prevRing) for (let k = 0; k < TUBE_SIDES; k++) {
      const q0 = prevRing[k], q1 = prevRing[k + 1], q2 = ring[k + 1], q3 = ring[k];
      for (const q of [q0, q1, q2, q0, q2, q3]) mb.v(q.p, q.n[0], q.n[1], q.n[2], [q.u, q.v, q.s], T.SATHA);
    }
    prevRing = ring;
  }
  buildSathaTube.endB = B;                              // the frame at the last ring: the next chunk starts from it, so the scales don't twist at the join
  return mb.finish();
}

// ---- the hero's right hand (view-model) ------------------------------------
// Hand space: wrist at the origin, forearm along +z, fingers along -z, palm
// facing -y, thumb on the -x side. The grip axis runs across the palm (x).
const GRIP_C = [0, -0.03, -0.083];
// lathe along an arbitrary axis with smooth (Gouraud) normals: fingers, thumb
function smoothLathe(mb, ox, oy, oz, profile, sides, layer, col, axis) {
  const ax = norm3(axis), ref = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = norm3(cross3(ax, ref)), w = cross3(ax, u);
  const rings = profile.map(([r, h], i) => {
    const pr = profile[Math.max(0, i - 1)], nx = profile[Math.min(profile.length - 1, i + 1)];
    const slope = (nx[0] - pr[0]) / ((nx[1] - pr[1]) || 1);
    const out = [];
    for (let k = 0; k <= sides; k++) {
      const a = k / sides * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const rad = [u[0] * c + w[0] * s, u[1] * c + w[1] * s, u[2] * c + w[2] * s];
      const n = r < 1e-4 ? ax.map(v => v * Math.sign(h || 1)) : norm3([rad[0] - ax[0] * slope, rad[1] - ax[1] * slope, rad[2] - ax[2] * slope]);
      out.push({ p: [ox + ax[0] * h + rad[0] * r, oy + ax[1] * h + rad[1] * r, oz + ax[2] * h + rad[2] * r], n });
    }
    return out;
  });
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < sides; k++) {
    const a = rings[i][k], b = rings[i][k + 1], c = rings[i + 1][k + 1], d = rings[i + 1][k];
    for (const q of [a, b, c, a, c, d]) { mb.ensure(1); mb.v(q.p, q.n[0], q.n[1], q.n[2], col, layer); }
  }
}
function addFinger(mb, base, lens, rad, curls, col) {
  let p = base, th = 0;
  for (let j = 0; j < 3; j++) {
    th += curls[j];
    const d = [0, -Math.sin(th), -Math.cos(th)], L = lens[j], r = rad[j];
    smoothLathe(mb, p[0], p[1], p[2], [[r * 0.5, -r * 0.6], [r * 0.95, -r * 0.2], [r * 1.02, L * 0.12], [r * 0.9, L * 0.55], [r * 0.86, L * 0.85], [r * 0.6, L + r * 0.35], [0, L + r * 0.7]], 8, T.HANDSKIN, col, d);
    if (j === 2) {                                           // nail on the back of the last joint
      const dor = [0, Math.cos(th), -Math.sin(th)], q = [p[0] + d[0] * L * 0.62 + dor[0] * r * 0.82, p[1] + d[1] * L * 0.62 + dor[1] * r * 0.82, p[2] + d[2] * L * 0.62 + dor[2] * r * 0.82];
      addBox(mb, q[0], q[1], q[2], r * 0.7, 0.0018, L * 0.32, T.NAIL, 0, ONE3, th);
    }
    p = [p[0] + d[0] * L * 0.94, p[1] + d[1] * L * 0.94, p[2] + d[2] * L * 0.94];
  }
}
// a hanging cloth: from a top edge (origin, span vector), falling `h`, rippled, its foot cut ragged into tongues
function addRag(mb, o, span, h, layer, seed, col = ONE3) {
  const NX = 6, NY = 5, L = Math.hypot(span[0], span[2]) || 1, nx = -span[2] / L, nz = span[0] / L, P = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const u = i / NX, v = j / NY, tongue = j === NY ? (i % 2 ? -0.28 : 0.05) * h + (hrand(seed, i, 1, 2) - 0.5) * 0.25 * h : 0;
    const ripple = Math.sin(u * 7 + seed) * 0.12 * (0.3 + v) + (hrand(seed, i, j, 3) - 0.5) * 0.06;
    P.push([o[0] + span[0] * u + nx * ripple, o[1] - v * h * (1 - 0.1 * u) + tongue * (j === NY ? 1 : 0), o[2] + span[2] * u + nz * ripple]);
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    if (j === NY - 1 && hrand(seed, i, 7, 4) < 0.2) continue;               // a hole torn out of the hem
    const a = P[j * (NX + 1) + i], b = P[j * (NX + 1) + i + 1], c = P[(j + 1) * (NX + 1) + i + 1], d = P[(j + 1) * (NX + 1) + i];
    mb.quad(a, b, c, d, layer, nx, 0, nz, col);
  }
}
function addSeg(mb, a, b, r0, r1, layer, col) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]);
  smoothLathe(mb, a[0], a[1], a[2], [[r0 * 0.5, -r0 * 0.6], [r0, -r0 * 0.1], [(r0 + r1) * 0.48, L * 0.5], [r1, L * 0.85], [r1 * 0.55, L + r1 * 0.4], [0, L + r1 * 0.7]], 8, layer, col, norm3(d));
}
function buildHand(pose) {
  const mb = new MeshBuilder(2048), grip = pose === 'grip';
  // palm and back of the hand: wrist to knuckles, the back slightly arched
  loft(mb, [S_(0.004, 0.033, 0.022, 0.022, 0), S_(-0.035, 0.044, 0.024, 0.021, -0.002), S_(-0.075, 0.05, 0.022, 0.018, -0.003), S_(-0.09, 0.047, 0.016, 0.014, -0.002)],
    10, T.HANDSKIN, 1, (u) => 0.82 + 0.18 * Math.max(0, -Math.cos(u * Math.PI * 2)));
  for (const kx of [-0.033, -0.011, 0.011, 0.033]) addRock(mb, kx, 0.013, -0.084, 0.012, 0.008, 0.011, 5, T.HANDSKIN, 0.05);   // knuckles
  const shade = [0.9, 0.9, 0.9];
  const fingers = [[-0.033, 1.0, 0.98], [-0.011, 1.08, 1.0], [0.011, 1.02, 0.96], [0.033, 0.82, 0.88]];
  for (const [fx, ls, rs] of fingers) {
    const curls = grip ? [1.3, 1.45, 1.0] : [0.45, 0.6, 0.45];
    addFinger(mb, [fx, -0.002, -0.088], [0.043 * ls, 0.027 * ls, 0.021 * ls], [0.0105 * rs, 0.0095 * rs, 0.0085 * rs], curls, shade);
  }
  // thumb: thenar pad, then two joints wrapping over the grip
  const t0 = [-0.04, -0.012, -0.012], t1 = [-0.058, -0.022, -0.05], t2 = grip ? [-0.042, -0.04, -0.088] : [-0.066, -0.03, -0.088], t3 = grip ? [-0.02, -0.046, -0.104] : [-0.062, -0.034, -0.118];
  addRock(mb, -0.03, -0.018, -0.03, 0.02, 0.016, 0.03, 9, T.HANDSKIN, 0.05);
  addSeg(mb, t0, t1, 0.016, 0.013, T.HANDSKIN, ONE3);
  addSeg(mb, t1, t2, 0.013, 0.012, T.HANDSKIN, ONE3);
  addSeg(mb, t2, t3, 0.012, 0.01, T.HANDSKIN, ONE3);
  const tn = norm3([t3[0] - t2[0], t3[1] - t2[1], t3[2] - t2[2]]);
  addBox(mb, t3[0] - tn[0] * 0.008 - 0.004, t3[1] - tn[1] * 0.008 + 0.006, t3[2] - tn[2] * 0.008, 0.007, 0.0018, 0.008, T.NAIL, Math.atan2(tn[0], tn[2]));
  return mb.finish();
}
function buildViewModel(name) {
  const mb = new MeshBuilder(2048);
  switch (name) {
    case 'vm_forearm':                                      // muscled forearm, belly of the muscle toward the elbow
      loft(mb, [S_(-0.004, 0.032, 0.023, 0.023, 0), S_(0.05, 0.039, 0.029, 0.027, 0.002), S_(0.14, 0.046, 0.036, 0.031, 0.004), S_(0.26, 0.056, 0.046, 0.037, 0.006),
        S_(0.38, 0.06, 0.049, 0.04, 0.006), S_(0.5, 0.057, 0.047, 0.041, 0.004), S_(0.62, 0.054, 0.046, 0.043, 0)], 12, T.ARM, 1 / 0.62);
      break;
    case 'vm_manacle':
      // a closed iron band: lip, outer face, lip, then the inner face back again, centred on the arm's wrist
      // (models/cast/vm_arm.glb measured across z 0.016..0.092: centre (0.011, 0.014), at most 0.035 x 0.032 half-size)
      { const cx = 0.011, cy = 0.014, wi = 0.038, hi = 0.035, wo = 0.045, ho = 0.042;
        loft(mb, [S_(0.016, wi, hi, hi, cy, cx), S_(0.019, wo, ho, ho, cy, cx), S_(0.089, wo, ho, ho, cy, cx), S_(0.092, wi, hi, hi, cy, cx), S_(0.016, wi, hi, hi, cy, cx)], 16, T.MANACLE, 1 / 0.076); }
      break;
    case 'vm_upper':                                        // the upper arm, elbow (z 0) to shoulder (z 1): placed each frame so the arm never ends on screen
      loft(mb, [S_(0, 0.05, 0.05, 0.05, 0), S_(0.04, 0.056, 0.055, 0.055, 0), S_(0.5, 0.062, 0.06, 0.06, 0), S_(1, 0.07, 0.066, 0.066, 0)], 14, T.ARM, 2);
      break;
    case 'vm_hilt':                                         // a wrapped grip through the fist and a pommel at the little finger
      smoothLathe(mb, -0.045, GRIP_C[1], GRIP_C[2], [[0.012, 0], [0.013, 0.05], [0.012, 0.095]], 8, T.GRIP, ONE3, [1, 0, 0]);
      addRock(mb, 0.058, GRIP_C[1], GRIP_C[2], 0.016, 0.016, 0.016, 2, T.IRON, 0.05);
      break;
    case 'vm_chain':                                        // the broken chain still hanging from the cuff
      addBox(mb, 0.011, -0.034, 0.055, 0.008, 0.012, 0.012, T.IRON);   // the staple, on the underside of the band
      for (let k = 0; k < 3; k++) {
        const y = -0.048 - k * 0.026;
        if (k % 2) { addBox(mb, 0.002, y, 0.055, 0.003, 0.014, 0.003, T.IRON); addBox(mb, 0.02, y, 0.055, 0.003, 0.014, 0.003, T.IRON); }
        else { addBox(mb, 0.011, y, 0.046, 0.003, 0.014, 0.003, T.IRON); addBox(mb, 0.011, y, 0.064, 0.003, 0.014, 0.003, T.IRON); }
      }
      break;
    case 'dagger2':                                         // along +y: pommel, wrapped grip, guard, diamond blade
      addRock(mb, 0, 0, 0, 0.016, 0.016, 0.016, 2, T.IRON, 0.05);
      addLathe(mb, 0, 0.008, 0, [[0.011, 0], [0.013, 0.045], [0.011, 0.09]], 8, T.GRIP);
      addBox(mb, 0, 0.098, 0, 0.052, 0.007, 0.013, T.IRON);
      addRock(mb, -0.052, 0.098, 0, 0.011, 0.011, 0.014, 4, T.IRON, 0.05); addRock(mb, 0.052, 0.098, 0, 0.011, 0.011, 0.014, 6, T.IRON, 0.05);
      loft(mb, [S_(0.1, 0.02, 0.006, 0.006, 0), S_(0.25, 0.017, 0.005, 0.005, 0), S_(0.38, 0.009, 0.003, 0.003, 0), S_(0.44, 0.001, 0.001, 0.001, 0)], 4, T.STEEL, 1, null, 'y');
      break;
  }
  return mb.finish();
}

// a thin cut on the wall plane (z = 0), rotated in-plane by angle a
function addBoxRot(mb, cx, cy, len, a) {
  const c = Math.cos(a), sn = Math.sin(a), w = 0.007;
  const P = (x, y, z) => [cx + x * c - y * sn, cy + x * sn + y * c, z];
  const v = [P(-len, -w, 0), P(len, -w, 0), P(len, w, 0), P(-len, w, 0), P(-len, -w, 0.008), P(len, -w, 0.008), P(len, w, 0.008), P(-len, w, 0.008)];
  const F = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
  for (const f of F) mb.quadC(v[f[0]], v[f[1]], v[f[2]], v[f[3]], T.BONE, [cx, cy, 0.004]);   // fresh cuts show pale on dirty stone
}
