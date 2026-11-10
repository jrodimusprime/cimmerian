'use strict';
// ---- the weeping thing (ch. III) --------------------------------------------
// "an amorphic bulk ... its unstable outlines somewhat suggested an octopus, but
// its malformed tentacles were too short for its size ... a quaking, jelly-like
// stuff ... a frog-like head ... great unstable eyes ... obscene blubbery lips."
function buildWeeperPart(part) {
  const mb = new MeshBuilder(2048);
  if (part === 'body') {
    loft(mb, [S_(-1.2, 0.2, 0.2, 0.15, 0.3), S_(-0.9, 1.1, 0.9, 0.2, 0.7), S_(-0.2, 1.5, 1.2, 0.25, 0.9), S_(0.6, 1.35, 1.1, 0.25, 0.85), S_(1.1, 0.8, 0.7, 0.2, 0.7), S_(1.35, 0.15, 0.2, 0.1, 0.6)], 12, T.VENOM, 1);
    for (let k = 0; k < 9; k++) addRock(mb, Math.sin(k * 2.1) * 0.9, 0.9 + Math.cos(k * 1.3) * 0.4, Math.cos(k * 2.1) * 0.7, 0.4, 0.3, 0.4, k + 3, T.VENOM, 0.25);
  } else if (part === 'tentacle') {                    // "its malformed tentacles were too short for its size": thick, stubby, lumpen
    loft(mb, [S_(0, 0.24, 0.2, 0.2, 0), S_(0.18, 0.26, 0.21, 0.21, -0.02), S_(0.38, 0.18, 0.16, 0.15, -0.08), S_(0.52, 0.13, 0.11, 0.1, -0.15), S_(0.6, 0.06, 0.05, 0.05, -0.2), S_(0.63, 0.01, 0.01, 0.01, -0.21)], 10, T.JELLY, 1.5);
  } else if (part === 'eye') {                         // "the great unstable eyes": a swollen wet ball, a slot of black
    addRock(mb, 0, 0, 0, 0.16, 0.16, 0.14, 3, T.EYE, 0.05);
    addBox(mb, 0, 0, 0.13, 0.016, 0.1, 0.02, T.BLACK);
  } else if (part === 'head') {                        // the frog head, mouth wide
    addRock(mb, 0, 0.25, 0.1, 0.55, 0.32, 0.5, 4, T.PALE, 0.15);
    addRock(mb, 0, 0.05, 0.25, 0.5, 0.12, 0.45, 6, T.PALE, 0.1);
    loft(mb, [S_(0.2, 0.42, 0.08, 0.08, 0.1), S_(0.55, 0.4, 0.1, 0.1, 0.12), S_(0.62, 0.32, 0.06, 0.06, 0.12)], 10, T.MOUTH);   // blubbery lips
    addBox(mb, 0, 0.12, 0.6, 0.32, 0.05, 0.04, T.BLACK);
    for (const sx of [-1, 1]) {
      addRock(mb, sx * 0.3, 0.55, 0.18, 0.18, 0.2, 0.18, 2 + sx, T.PALE, 0.08);           // bulging sockets
      addRock(mb, sx * 0.3, 0.57, 0.3, 0.12, 0.13, 0.08, 7 + sx, T.EYE, 0.3);             // great unstable eyes
      addBox(mb, sx * 0.3, 0.57, 0.37, 0.02, 0.09, 0.01, T.BLACK);
    }
  }
  return mb.finish();
}
// the mass itself is rebuilt every frame: a sprawling bulk whose outline heaves on several unrelated waves
// ("its unstable outlines"), hitching forward as it moves, a lump of neck rising at the front where the head rears out of it
const WEEP_NT = 14, WEEP_NP = 30;
let weeperMeshes = new Map();
function weeperBody(f, t) {
  const NT = WEEP_NT, NP = WEEP_NP, P = [], hitch = f.moving ? Math.sin(f.walk * 2.4) : 0;
  for (let i = 0; i <= NT; i++) {
    const th = i / NT * Math.PI, row = [];
    for (let j = 0; j <= NP; j++) {
      const ph = j / NP * Math.PI * 2, sx = Math.sin(th) * Math.sin(ph), sy = Math.cos(th), sz = Math.sin(th) * Math.cos(ph);
      let r = 1 + 0.13 * Math.sin(3 * ph + 2 * th + t * 1.7) + 0.09 * Math.sin(5 * ph - 3 * th - t * 2.3 + 1) + 0.06 * Math.sin(8 * ph + 5 * th + t * 3.6) + 0.05 * Math.sin(2 * ph - t * 0.9);
      r *= 1 + 0.28 * smoothstep(0.45, 1, th / Math.PI);                        // it sprawls where it meets the floor
      let x = sx * 1.35 * r, y = sy * 0.7 * r + 0.62, z = sz * 1.15 * r;
      const neck = Math.max(0, sz * 0.8 + sy * 0.6) ** 4;                        // the front-top swells up toward the head
      y += 0.55 * neck; z += 0.15 * neck;
      z *= 1 + 0.14 * hitch; y *= 1 - 0.08 * hitch;                              // hitching its bulk along
      y = Math.max(0.02, y);
      row.push([x, y, z]);
    }
    P.push(row);
  }
  const out = new Float32Array(NT * NP * 6 * 10); let o = 0;
  const nrm = (i, j) => { const a = P[Math.min(NT, i + 1)][j], b = P[Math.max(0, i - 1)][j], c = P[i][(j + 1) % NP], d = P[i][(j + NP - 1) % NP];
    return norm3(cross3([c[0] - d[0], c[1] - d[1], c[2] - d[2]], [a[0] - b[0], a[1] - b[1], a[2] - b[2]])); };
  const put = (i, j) => { const p = P[i][j], n = i === 0 ? [0, 1, 0] : nrm(i, j % NP); out.set([p[0], p[1], p[2], n[0], n[1], n[2], j / NP * 3, i / NT * 1.6 + t * 0.03, 0.9 + 0.1 * Math.sin(t * 2 + i), T.JELLY], o); o += 10; };
  for (let i = 0; i < NT; i++) for (let j = 0; j < NP; j++) { put(i, j); put(i + 1, j); put(i + 1, j + 1); put(i, j); put(i + 1, j + 1); put(i, j + 1); }
  return out;
}
function drawWeeper(f, lightOverride) {
  const l = lightOverride || sampleLight(f.x, f.y + 1, f.z), t = gameTime + f.homeX;
  const root = m4trs(f.x, f.y, f.z, f.yaw, 0, 0, 1);
  R.key = l.d;
  // stubby tentacles round the rim, writhing; more frantic when it comes after you
  const fast = f.state === 'chase' || f.moving ? 1.8 : 1;
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2 + 0.2, sway = Math.sin(t * 2.3 * fast + k * 1.7) * 0.5 + (f.moving ? Math.sin(f.walk * 3 + k) * 0.4 : 0), len = 1.1 + 0.35 * hrand(k, 3, 9, 2);
    drawM('weeper:tentacle', m4mul(root, m4trs(Math.sin(a) * 1.45, 0.22, Math.cos(a) * 1.25, a, 0.15 + sway * 0.35, sway * 0.5, len)), l, 0.12);
  }
  // the frog-like head rearing up out of the front of the mass, lunging when it strikes
  const lunge = f.state === 'windup' ? 0.3 : f.state === 'strike' ? 0.6 : 0, bob = Math.sin(t * 1.9) * 0.08;
  const hm = m4mul(root, m4trs(0, 1.55 + bob, 0.75 + lunge, 0, -0.2 - lunge * 0.4, Math.sin(t * 0.9) * 0.15, 1.1));
  // weeping, the head heaves slowly with its sobs; tittering (once it has seen you), it shudders fast
  const titter = f.alert ? 1 : 0, sob = titter ? 0.05 * Math.sin(t * 15) : 0.07 * Math.max(0, Math.sin(t * 2.2)) ** 2;
  drawPart('weeper_head', 'weeper:head', m4mul(hm, m4s3(1 + sob * 0.4, 1 + sob, 1)), l, 0.05);
  if (!titter && Math.random() < 0.06) { const sx = Math.random() < 0.5 ? -1 : 1, e = [0, 1, 2].map(i => hm[i] * sx * 0.3 + hm[4 + i] * 0.45 + hm[8 + i] * 0.34 + hm[12 + i]);   // tears from the great eyes
    particles.push({ m: 'drop', x: e[0], y: e[1], z: e[2], vx: 0, vy: -0.2, vz: 0, life: 0.9, max: 0.9, g: 6, s: 0.8 }); }
  for (const sx of [-1, 1]) {                         // "the great unstable eyes": they swell and shrink, each on its own
    const u = 1 + 0.28 * Math.sin(t * (2.1 + sx * 0.4)) + 0.12 * Math.sin(t * 5.3 + sx);
    drawM('weeper:eye', m4mul(hm, m4trs(sx * 0.3, 0.58, 0.28, sx * 0.15, 0, 0, u)), l, 0.4);
  }
  // the quaking body last, see-through, over the roots of all of it
  let mesh = weeperMeshes.get(f.id); if (!mesh) { mesh = R.createMesh(new Float32Array(10)); weeperMeshes.set(f.id, mesh); }
  R.updateMesh(mesh, weeperBody(f, t));
  R.blend(true);
  R.drawEntity(mesh, root, l, 0.22, 0.72, true);
  R.blend(false);
}
