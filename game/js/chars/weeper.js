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
  } else if (part === 'tentacle') {                    // "its malformed tentacles were too short for its size": thick at the root, tapering, curling up at the tip, a row of pale suckers under it
    loft(mb, [S_(0, 0.24, 0.2, 0.2, 0), S_(0.16, 0.25, 0.2, 0.2, 0.0), S_(0.32, 0.19, 0.16, 0.15, 0.02), S_(0.46, 0.14, 0.12, 0.11, 0.06), S_(0.57, 0.09, 0.08, 0.07, 0.12), S_(0.64, 0.05, 0.045, 0.04, 0.19), S_(0.68, 0.01, 0.01, 0.01, 0.25)], 10, T.JELLY, 1.5);
    for (let k = 0; k < 5; k++) { const z = 0.1 + k * 0.11, r = 0.05 - k * 0.007; addRock(mb, 0, -0.17 + k * 0.03 + (k > 3 ? 0.04 : 0), z, r, r * 0.5, r, 40 + k, T.PALE, 0.1); }
  } else if (part === 'jaw') {                         // the lower jaw: blubbery lower lip round a wet red mouth-floor, the tongue lying in it; origin at the hinge, +z forward
    loft(mb, [S_(0.0, 0.34, 0.05, 0.08, -0.02), S_(0.2, 0.4, 0.07, 0.1, -0.06), S_(0.42, 0.36, 0.08, 0.1, -0.06), S_(0.55, 0.26, 0.07, 0.07, -0.04), S_(0.6, 0.1, 0.04, 0.04, -0.02)], 12, T.MOUTH, 1);
    loft(mb, [S_(0.48, 0.3, 0.07, 0.03, 0.03), S_(0.56, 0.3, 0.075, 0.03, 0.03), S_(0.62, 0.22, 0.06, 0.02, 0.02)], 10, T.MOUTH, 1);   // the lower lip, thick and everted
    addBox(mb, 0, 0.02, 0.28, 0.3, 0.012, 0.24, T.MOUTH);
    loft(mb, [S_(0.08, 0.1, 0.04, 0.02, 0.05), S_(0.3, 0.12, 0.05, 0.02, 0.06), S_(0.48, 0.07, 0.03, 0.02, 0.07)], 8, T.BLOOD, 1);   // the tongue
  } else if (part === 'sac') {                         // the throat-sac under the jaw: a pallid bladder that swells as it sobs
    addRock(mb, 0, 0, 0, 0.32, 0.22, 0.28, 9, T.PALE, 0.08);
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
function weeperBody(f, t, core = false) {
  const NT = WEEP_NT, NP = WEEP_NP, P = [], hitch = f.moving ? Math.sin(f.walk * 2.4) : 0, sc = core ? 0.62 : 1, layer = core ? T.BLOOD : T.JELLY, tt = core ? t * 0.7 + 3 : t;
  for (let i = 0; i <= NT; i++) {
    const th = i / NT * Math.PI, row = [];
    for (let j = 0; j <= NP; j++) {
      const ph = j / NP * Math.PI * 2, sx = Math.sin(th) * Math.sin(ph), sy = Math.cos(th), sz = Math.sin(th) * Math.cos(ph);
      let r = sc * (1 + 0.13 * Math.sin(3 * ph + 2 * th + tt * 1.7) + 0.09 * Math.sin(5 * ph - 3 * th - tt * 2.3 + 1) + 0.06 * Math.sin(8 * ph + 5 * th + tt * 3.6) + 0.05 * Math.sin(2 * ph - tt * 0.9) + (core ? 0.12 * Math.sin(7 * ph + 4 * th + tt * 1.1) : 0));
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
  const put = (i, j) => { const p = P[i][j], n = i === 0 ? [0, 1, 0] : nrm(i, j % NP); out.set([p[0], p[1], p[2], n[0], n[1], n[2], j / NP * 3, i / NT * 1.6 + t * 0.03, 0.9 + 0.1 * Math.sin(t * 2 + i), layer], o); o += 10; };
  for (let i = 0; i < NT; i++) for (let j = 0; j < NP; j++) { put(i, j); put(i + 1, j); put(i + 1, j + 1); put(i, j); put(i + 1, j + 1); put(i, j + 1); }
  return out;
}
// The weeping thing is "Oozey the Slime" by Mophs (OpenGameArt, CC-BY 3.0): a mound of ooze rising into a frog's head, a gaping
// maw, eyes on stalks. A static mesh, so it is made to live here: it breathes and quakes, shudders as it titters, rears and
// lunges as it strikes, hitches its bulk along, and drools. (The procedural thing below stands in until it has loaded.)
const OOZE = { s: 0.45, cx: 0.41, cz: 0.18, y0: 0.103 };   // to ~3 m across (its body: 1.45 m round), set on its base, centred
function drawOozey(f, l, t) {
  const M = SKINNED.oozey, S = new Float32Array(32 * 16); S.set(m4ident(), 0);
  const titter = f.alert ? 1 : 0, hitch = f.moving ? Math.sin(f.walk * 2.4) : 0;
  const sob = titter ? 0.03 * Math.sin(t * 15) : 0.05 * Math.max(0, Math.sin(t * 2.2)) ** 2;          // weeping, slow heaves; tittering, a fast shudder
  const rear = f.state === 'windup' ? smoothstep(0, 0.4, f.t) : 0, lunge = f.state === 'strike' ? 1 : f.state === 'recover' ? Math.max(0, 1 - f.t * 2) : 0;
  const sy = (1 + 0.035 * Math.sin(t * 1.3) + sob + 0.12 * rear - 0.12 * lunge) * (1 - 0.07 * hitch), sxz = 1 / Math.sqrt(sy);
  const quake = 0.025 * Math.sin(t * 3.1) + 0.015 * Math.sin(t * 7.3 + 1);                              // the quaking jelly
  const root = m4mul(m4trs(f.x, f.y, f.z, f.yaw, 0, 0, 1), m4mul(m4trs(0, 0, 0.55 * lunge, 0, -0.18 * rear + 0.3 * lunge, quake, 1),
    m4mul(m4s3(sxz * (1 + 0.04 * Math.sin(t * 2.6)), sy, sxz * (1 + 0.1 * hitch)), m4mul(m4s(OOZE.s), m4t(OOZE.cx, OOZE.y0, OOZE.cz)))));
  R.key = l.d;
  skinDraw(M, root, S, l, 0.06, 1);
  if (Math.random() < (titter ? 0.12 : 0.05)) {                                                          // drool from the blubbery lower lip
    const u = (Math.random() - 0.5) * 1.6, p = [0, 1, 2].map(i => root[i] * (u - OOZE.cx) + root[4 + i] * (2.4 - OOZE.y0) + root[8 + i] * (2.55 - OOZE.cz) + root[12 + i]);
    particles.push({ m: 'drop', x: p[0], y: p[1], z: p[2], vx: 0, vy: -0.1, vz: 0, life: 0.9, max: 0.9, g: 7, s: 0.9 });
  }
}
function drawWeeper(f, lightOverride) {
  const l = lightOverride || sampleLight(f.x, f.y + 1, f.z), t = gameTime + f.homeX;
  if (typeof SKINNED !== 'undefined' && SKINNED.oozey) return drawOozey(f, l, t);
  const root = m4trs(f.x, f.y, f.z, f.yaw, 0, 0, 1);
  R.key = l.d;
  // stubby tentacles round the rim, writhing; more frantic when it comes after you
  const fast = f.state === 'chase' || f.moving ? 1.8 : 1;
  for (let k = 0; k < 12; k++) {                      // they lift and curl off the floor, each on its own, groping
    const a = k / 12 * Math.PI * 2 + 0.2, sway = Math.sin(t * 2.3 * fast + k * 1.7) * 0.5 + (f.moving ? Math.sin(f.walk * 3 + k) * 0.4 : 0), len = 1.05 + 0.35 * hrand(k, 3, 9, 2);
    const lift = -0.04 - 0.16 * Math.max(0, Math.sin(t * 1.3 * fast + k * 2.3));   // lying out on the floor, now and then one lifting to grope
    drawM('weeper:tentacle', m4mul(root, m4mul(m4trs(Math.sin(a) * 1.4, 0.2 + 0.04 * Math.sin(t + k), Math.cos(a) * 1.2, a + sway * 0.35, lift, sway * 0.6, len), m4s3(1.15, 0.85, 1))), l, 0.14);
  }
  // the frog-like head rearing up out of the front of the mass, lunging when it strikes
  const lunge = f.state === 'windup' ? 0.3 : f.state === 'strike' ? 0.6 : 0, bob = Math.sin(t * 1.9) * 0.08;
  const hm = m4mul(root, m4trs(0, 1.55 + bob, 0.75 + lunge, 0, -0.2 - lunge * 0.4, Math.sin(t * 0.9) * 0.15, 1.1));
  // weeping, the head heaves slowly with its sobs; tittering (once it has seen you), it shudders fast
  const titter = f.alert ? 1 : 0, sob = titter ? 0.05 * Math.sin(t * 15) : 0.07 * Math.max(0, Math.sin(t * 2.2)) ** 2;
  drawPart('weeper_head', 'weeper:head', m4mul(hm, m4s3(1 + sob * 0.4, 1 + sob, 1)), l, 0.05);
  // the lower jaw hangs open as it titters, gapes wide as it rears to strike; the throat-sac swells under it with each sob
  const gape = f.state === 'windup' ? 0.55 : f.state === 'strike' ? 0.75 : titter ? 0.18 + 0.1 * Math.abs(Math.sin(t * 15)) : 0.06 + 0.06 * Math.max(0, Math.sin(t * 2.2));
  drawM('weeper:jaw', m4mul(hm, m4trs(0, 0.1, 0.05, 0, gape, 0, 1.05)), l, 0.08);
  drawM('weeper:sac', m4mul(hm, m4mul(m4trs(0, -0.12, 0.25, 0, 0, 0, 1), m4s3(1 + sob * 2.5, 1 + sob * 4, 1 + sob * 2.5))), l, 0.06);
  if (!titter && Math.random() < 0.06) { const sx = Math.random() < 0.5 ? -1 : 1, e = [0, 1, 2].map(i => hm[i] * sx * 0.3 + hm[4 + i] * 0.45 + hm[8 + i] * 0.34 + hm[12 + i]);   // tears from the great eyes
    particles.push({ m: 'drop', x: e[0], y: e[1], z: e[2], vx: 0, vy: -0.2, vz: 0, life: 0.9, max: 0.9, g: 6, s: 0.8 }); }
  for (const sx of [-1, 1]) {                         // "the great unstable eyes": they swell and shrink, each on its own
    const u = 1 + 0.28 * Math.sin(t * (2.1 + sx * 0.4)) + 0.12 * Math.sin(t * 5.3 + sx);
    drawM('weeper:eye', m4mul(hm, m4trs(sx * 0.32, 0.6, 0.3, sx * 0.15, 0, 0, u * 1.35)), l, 0.45);
  }
  // inside the jelly, seen through it: the dark knotted mass of its guts, heaving to its own slower time
  let core = weeperMeshes.get(f.id + ':core'); if (!core) { core = R.createMesh(new Float32Array(10)); weeperMeshes.set(f.id + ':core', core); }
  R.updateMesh(core, weeperBody(f, t, true));
  R.drawEntity(core, root, l, 0.1, 1, true);
  // the quaking body last, see-through, over the roots of all of it
  let mesh = weeperMeshes.get(f.id); if (!mesh) { mesh = R.createMesh(new Float32Array(10)); weeperMeshes.set(f.id, mesh); }
  R.updateMesh(mesh, weeperBody(f, t));
  R.blend(true);
  R.drawEntity(mesh, root, l, 0.26, 0.55, true);
  R.blend(false);
}
