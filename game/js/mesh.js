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

function addBones(mb, x, y, z, seed, big) {
  const r = new RNG(seed);
  const n = big ? 3 : 1;
  for (let s = 0; s < n; s++) {
    const ox = x + (s ? r.range(-0.6, 0.6) : 0), oz = z + (s ? r.range(-0.6, 0.6) : 0);
    addRock(mb, ox, y + 0.12, oz, 0.16, 0.13, 0.19, seed + s, T.BONE, 0.15);
    addBox(mb, ox + 0.04, y + 0.12, oz + 0.13, 0.04, 0.03, 0.02, T.BLACK, 0);
  }
  for (let k = 0; k < (big ? 14 : 4); k++) addBox(mb, x + r.range(-0.9, 0.9), y + 0.04 + (big ? r.range(0, 0.25) : 0), z + r.range(-0.9, 0.9), 0.035, 0.035, r.range(0.15, 0.32), T.BONE, r.range(0, 3), ONE3, big ? r.range(-0.3, 0.3) : 0);
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
    case 'door': {                                        // a heavy door of black oak, banded with iron, in a frame of dressed stone; p.open: how far it stands ajar
      const t = [n[1], -n[0]], yaw = Math.atan2(n[0], n[1]), W = 1.0, H = 2.7, at = (u, y, v) => [p.x + t[0] * u + n[0] * v, p.y + y, p.z + t[1] * u + n[1] * v];
      for (const u of [-W - 0.14, W + 0.14]) { const q = at(u, H / 2, 0.08); addBox(mb, q[0], q[1], q[2], 0.16, H / 2, 0.2, T.HEWN, yaw); }
      { const q = at(0, H + 0.14, 0.08); addBox(mb, q[0], q[1], q[2], W + 0.3, 0.16, 0.22, T.HEWN, yaw); }
      const a = p.open || 0, hx = -W, lw = 2 * W - 0.06;   // hinged on one post, swung into the room
      const lc = (u, v) => at(hx + Math.cos(a) * u, 0, v * 0 + Math.sin(a) * u + 0.05);
      { const c = lc(lw / 2, 0); addBox(mb, c[0], p.y + H / 2 - 0.02, c[2], lw / 2, H / 2 - 0.04, 0.05, T.WOOD, yaw - a); }
      for (const y of [0.45, 1.35, 2.25]) { const c = lc(lw / 2, 0); addBox(mb, c[0] + n[0] * 0.06 * Math.cos(a), p.y + y, c[2] + n[1] * 0.06 * Math.cos(a), lw / 2, 0.05, 0.02, T.IRON, yaw - a); }
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
    case 'skull':
      addRock(mb, p.x, p.y + 0.17, p.z, 0.17, 0.15, 0.2, 11, T.BONE, 0.08);
      addBox(mb, p.x, p.y + 0.06, p.z + 0.08, 0.09, 0.05, 0.08, T.BONE);
      addBox(mb, p.x - 0.06, p.y + 0.19, p.z + 0.17, 0.04, 0.035, 0.03, T.BLACK); addBox(mb, p.x + 0.06, p.y + 0.19, p.z + 0.17, 0.04, 0.035, 0.03, T.BLACK);
      break;
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
        addBox(mb, tx, p.y + hgt - 1.7, tz, 0.03, 1.55, 1.1, T.BLACK, 0, ONE3, 0.05);            // the banner hanging from it: black against the red sky
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
  const ROWS = 3;
  let pA = null, pB = null;
  for (let r = 0; r <= ROWS; r++) {
    const t = r / ROWS, s = Math.sin(Math.PI * t);
    const ka = s * ca.bul * (0.6 + 0.8 * hrand(ca.gx, ca.gz, r * 7, 3));
    const kb = s * cb.bul * (0.6 + 0.8 * hrand(cb.gx, cb.gz, r * 7, 3));
    const A = [ca.x + ca.jx * ka, ba + (ta - ba) * t, ca.z + ca.jz * ka];
    const B = [cb.x + cb.jx * kb, bb + (tb - bb) * t, cb.z + cb.jz * kb];
    if (pA) mb.quad(pA, pB, B, A, layer, hx, 0, hz);
    pA = A; pB = B;
  }
}
function bakeLights(mb, lights, amb) {
  const d = mb.d;
  for (let i = 0; i < mb.n; i++) {
    const o = i * 10, px = d[o], py = d[o + 1], pz = d[o + 2], nx = d[o + 3], ny = d[o + 4], nz = d[o + 5];
    let r = amb[0], g = amb[1], b = amb[2];
    for (const L of lights) {
      const dx = L.x - px, dy = L.y - py, dz = L.z - pz, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > L.rad * L.rad) continue;
      const dist = Math.sqrt(d2) || 1e-3;
      let att = 1 - dist / L.rad; att *= att;
      const lam = Math.max(0, (dx * nx + dy * ny + dz * nz) / dist) * 0.75 + 0.25;
      const k = att * lam * L.i;
      r += L.r * k; g += L.g * k; b += L.b * k;
    }
    d[o + 6] = r; d[o + 7] = g; d[o + 8] = b;
  }
}
const AMBIENT = [0.07, 0.064, 0.056];
const DIRS = [[0, -1, 0, 0, 1, 0], [1, 0, 1, 0, 1, 1], [0, 1, 1, 1, 0, 1], [-1, 0, 0, 1, 0, 0]];
function buildLevelMesh() {
  const mb = new MeshBuilder(40000), W = LV.W, H = LV.H;
  const P = (q, y) => [q.x, y, q.z];
  // under the open sky a building has a body: the masonry about a roofed room stands up to just over its ceiling, with a
  // top, an outer face toward the sky and a roof over the room, not the bare inner planes of the room seen from behind
  const ROOF = 0.35, roofed = (x, z) => x >= 0 && z >= 0 && x < W && z < H && LV.kind[z * W + x] !== 0 && !(LV.flags[z * W + x] & F_SKY);
  const roofTop = (x, z) => { let t = -Infinity; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (roofed(x + dx, z + dz)) t = Math.max(t, LV.ceil[(z + dz) * W + x + dx]); return t + ROOF; };
  if (LEVEL.open) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const idx = j * W + i, x0 = i * CELL, x1 = x0 + CELL, z0 = j * CELL, z1 = z0 + CELL;
    if (LV.kind[idx] === 0) {                             // masonry about a roofed room: its flat top
      const t = roofTop(i, j); if (t === -Infinity) continue;
      mb.quad([x0, t, z0], [x0, t, z1], [x1, t, z1], [x1, t, z0], T.HEWN, 0, 1, 0);
      for (const d of DIRS) {                             // and its sides, where its neighbour masonry stands lower
        const nx = i + d[0], nz = j + d[1]; if (nx < 0 || nz < 0 || nx >= W || nz >= H || LV.kind[nz * W + nx] !== 0) continue;
        const tn = roofTop(nx, nz); if (tn >= t - 0.05) continue;
        const b = tn === -Infinity ? t - 6 : tn, ax = (i + d[2]) * CELL, az = (j + d[3]) * CELL, bx = (i + d[4]) * CELL, bz = (j + d[5]) * CELL;
        mb.quad([ax, b, az], [bx, b, bz], [bx, t, bz], [ax, t, az], T.HEWN, d[0], 0, d[1]);
      }
    } else if (!(LV.flags[idx] & F_SKY)) {                 // a roofed room: a roof over it
      const t = LV.ceil[idx] + ROOF;
      mb.quad([x0, t, z0], [x0, t, z1], [x1, t, z1], [x1, t, z0], T.HEWN, 0, 1, 0);
      for (const d of DIRS) {                             // and a band of stone over its ceiling's edge where it opens onto the sky
        const nx = i + d[0], nz = j + d[1]; if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const nI = nz * W + nx; if (LV.kind[nI] === 0 || !(LV.flags[nI] & F_SKY)) continue;
        const ax = (i + d[2]) * CELL, az = (j + d[3]) * CELL, bx = (i + d[4]) * CELL, bz = (j + d[5]) * CELL, b = LV.ceil[idx] - 0.05;
        mb.quad([ax, b, az], [bx, b, bz], [bx, t, bz], [ax, t, az], T.HEWN, d[0], 0, d[1]);
      }
    }
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const idx = j * W + i, k = LV.kind[idx];
    if (!k) continue;
    const fl = LV.flags[idx], tex = LV.tex[idx];
    const c0 = corner(i, j), c1 = corner(i + 1, j), c2 = corner(i + 1, j + 1), c3 = corner(i, j + 1);
    const fy = q => (k === 2 ? q.fp : q.fo);
    const fLayer = k === 2 ? (LV.void[idx] ? T.BLACK : T.SLIME) : T[tex.floor];   // a deep pit's bottom is black: a drop, not a puddle
    const diag = hash4(i, j, 2, 3) & 1;
    const f0 = P(c0, fy(c0)), f1 = P(c1, fy(c1)), f2 = P(c2, fy(c2)), f3 = P(c3, fy(c3));
    if (diag) { mb.tri(f0, f1, f2, fLayer, 0, 1, 0); mb.tri(f0, f2, f3, fLayer, 0, 1, 0); }
    else { mb.tri(f0, f1, f3, fLayer, 0, 1, 0); mb.tri(f1, f2, f3, fLayer, 0, 1, 0); }
    const open = LEVEL.open && (fl & F_SKY);              // under the open sky: no ceiling, and no wall at the world's edge
    if (fl & F_WATER) {                                   // the moat: still black water a little below the banks
      const wy = LEVEL.waterY || -1;
      mb.quad([c0.x, wy, c0.z], [c1.x, wy, c1.z], [c2.x, wy, c2.z], [c3.x, wy, c3.z], T.WATER, 0, 1, 0);
    }
    const cLayer = (fl & F_SKY) ? (tex.ceil === 'SUNSET' ? T.SUNSET : T.SKY) : T[tex.ceil];
    const e0 = P(c0, c0.c), e1 = P(c1, c1.c), e2 = P(c2, c2.c), e3 = P(c3, c3.c);
    if (!open) {
      if (diag) { mb.tri(e0, e1, e2, cLayer, 0, -1, 0); mb.tri(e0, e2, e3, cLayer, 0, -1, 0); }
      else { mb.tri(e0, e1, e3, cLayer, 0, -1, 0); mb.tri(e1, e2, e3, cLayer, 0, -1, 0); }
    }
    for (const d of DIRS) {
      const nk = kindAt(i + d[0], j + d[1]);
      const ca = corner(i + d[2], j + d[3]), cb = corner(i + d[4], j + d[5]);
      if (nk === 0 && open) {                               // the edge of the world: nothing; the masonry of a building: its outer face
        const t = roofTop(i + d[0], j + d[1]);
        if (t !== -Infinity) wallStrip(mb, ca, cb, fy(ca), fy(cb), t, t, T.HEWN, -d[0], -d[1]);
        continue;
      }
      if (nk === 0) wallStrip(mb, ca, cb, fy(ca), fy(cb), ca.c, cb.c, T[tex.wall], -d[0], -d[1]);
      else if (k === 2 && nk === 1) mb.quad(P(ca, ca.fp), P(cb, cb.fp), P(cb, cb.fo), P(ca, ca.fo), T[tex.wall], -d[0], 0, -d[1]);
    }
  }
  for (const p of LV.props) addPrefab(mb, p);
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
    case 'ring':
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; addBox(mb, Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0, 0.035, 0.055, 0.035, T.IRON, 0, ONE3, 0); }
      addBox(mb, 0, 0.18, -0.06, 0.07, 0.05, 0.08, T.IRON);
      break;
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
