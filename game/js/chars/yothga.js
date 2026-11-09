'use strict';
// ---------------------------------------------------------------------------
// Yothga (ch. III, e1m4): "a thick vine which seemed to grow through the solid
// stone of the floor. It was covered with strangely pointed leaves and crimson
// blossoms ... a livid, unnatural crimson, like a perversity of flower-life."
// "The root-stem, a repulsively supple stalk thicker than his thigh"; when Conan
// enters, "the petals of the livid blossoms spread like the hood of a cobra, the
// tendrils reared menacingly". Built from a stem, tendrils, leaves and blooms,
// posed each frame (MODELS.md: the stem and tendril rigs).
// ---------------------------------------------------------------------------
function buildYothgaPart(part) {
  const mb = new MeshBuilder(2048);
  switch (part) {
    case 'stem': {                                       // up through a crack in the floor, knotted, swelling to the crown
      const pts = [[0, -0.1, 0], [0.04, 0.3, 0.02], [-0.05, 0.7, 0.06], [0.03, 1.05, 0.0], [0.0, 1.35, -0.05]];
      const rad = [0.17, 0.15, 0.13, 0.14, 0.18];
      for (let k = 0; k < 4; k++) addSeg(mb, pts[k], pts[k + 1], rad[k], rad[k + 1], T.YOTHGA_STEM, ONE3);
      for (let k = 0; k < 5; k++) addRock(mb, pts[k][0] + 0.05 * Math.sin(k * 2), pts[k][1], pts[k][2] + 0.05 * Math.cos(k * 2), rad[k] * 0.7, 0.06, rad[k] * 0.7, k + 40, T.YOTHGA_STEM, 0.15);   // knots
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; addSeg(mb, [0, 0, 0], [Math.cos(a) * 0.5, -0.02, Math.sin(a) * 0.5], 0.07, 0.02, T.YOTHGA_STEM, ONE3); }   // roots into the stone
      addRock(mb, 0, 0.0, 0, 0.42, 0.06, 0.42, 47, T.ROCK, 0.3);                             // the cracked floor it comes through
      break;
    }
    case 'tendril': {                                    // along +z, base at the origin: tapering, with leaves in pairs
      const N = 6;
      for (let k = 0; k < N; k++) {
        const z0 = k / N * 1.6, z1 = (k + 1) / N * 1.6, r0 = 0.06 * (1 - k / N) + 0.012, r1 = 0.06 * (1 - (k + 1) / N) + 0.012;
        addSeg(mb, [0, 0.04 * Math.sin(k), z0], [0, 0.04 * Math.sin(k + 1), z1], r0, r1, T.YOTHGA_STEM, ONE3);
        if (k > 0) for (const sx of [-1, 1]) leaf(mb, [sx * r0, 0.02, z0 + 0.05], [sx, 0.35, 0.5], 0.2 - k * 0.015);
      }
      break;
    }
    case 'bloom': {                                      // the cobra-hood: petals spread wide round a wet black throat
      for (let k = 0; k < 5; k++) {
        const a = -1.2 + k / 4 * 2.4, ca = Math.cos(a), sa = Math.sin(a);
        const base = [sa * 0.04, ca * 0.04, 0.02], tip = [sa * 0.2, ca * 0.2 + 0.03, 0.16], side = [ca * 0.06, -sa * 0.06, 0];
        const mid = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2, (base[2] + tip[2]) / 2 + 0.04];
        const L = [mid[0] - side[0], mid[1] - side[1], mid[2]], R2 = [mid[0] + side[0], mid[1] + side[1], mid[2]];
        for (const [p, q, r] of [[base, R2, mid], [base, mid, L], [mid, R2, tip], [mid, tip, L]]) { mb.tri(p, q, r, T.YOTHGA_BLOOM, 0, 0, 1); mb.tri(p, r, q, T.YOTHGA_BLOOM, 0, 0, -1); }
      }
      addRock(mb, 0, 0, 0.0, 0.07, 0.07, 0.06, 51, T.MOUTH, 0.1);                               // the throat that drinks the soul
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; addSpike(mb, Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0.03, [Math.cos(a) * 0.3, Math.sin(a) * 0.3, 1], 0.09, 0.008, 4, T.YOTHGA_BLOOM); }   // stamens
      addSeg(mb, [0, 0, -0.35], [0, 0, -0.02], 0.03, 0.045, T.YOTHGA_STEM, ONE3);
      break;
    }
  }
  return mb.finish();
}
// a pointed leaf: a flat diamond along `dir` from `at`, a crease down the middle
function leaf(mb, at, dir, len) {
  const d = norm3(dir), side = norm3([d[2], 0, -d[0]]), w = len * 0.3;
  const tip = [at[0] + d[0] * len, at[1] + d[1] * len, at[2] + d[2] * len], mid = [at[0] + d[0] * len * 0.4, at[1] + d[1] * len * 0.4 + 0.02, at[2] + d[2] * len * 0.4];
  const l = [mid[0] - side[0] * w, mid[1] - 0.02, mid[2] - side[2] * w], r = [mid[0] + side[0] * w, mid[1] - 0.02, mid[2] + side[2] * w];
  for (const [p, q, s] of [[at, mid, l], [at, r, mid], [mid, tip, l], [mid, r, tip]]) { mb.tri(p, q, s, T.YOTHGA_LEAF, 0, 1, 0); mb.tri(p, s, q, T.YOTHGA_LEAF, 0, -1, 0); }
}
// Yothga at rest, or reared to strike (rear 0..1): tendrils arch out, the blooms lift and spread
function drawYothga(x, y, z, yaw, t, rear, light) {
  const root = m4trs(x, y, z, yaw, 0, 0, 1.25);
  drawM('yothga:stem', root, light, 0.05);
  const crown = m4mul(root, m4t(0, 1.35, -0.05));
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2 + 0.3, sw = Math.sin(t * (1.1 + k * 0.17) + k) * 0.18;
    const lift = -0.9 + rear * 0.7 + (k % 2) * 0.3, len = 0.6 + 0.12 * (k % 3);
    const tm = m4mul(crown, m4mul(m4ry(a + sw), m4mul(m4rx(lift), m4s3(1, 1, len))));
    drawM('yothga:tendril', tm, light, 0.05);
    const tip = m4mul(crown, m4mul(m4ry(a + sw), m4mul(m4rx(lift), m4t(0, 0.05, 1.62 * len))));
    drawM('yothga:bloom', m4mul(tip, m4mul(m4rx(-lift - 0.6 + rear * 0.5 + sw), m4s3(0.8, 0.8, 0.8))), light, 0.25);
  }
  drawM('yothga:bloom', m4mul(crown, m4mul(m4t(0, 0.12, 0.08), m4mul(m4rx(-0.5 + rear * 0.5), m4s3(1.4, 1.4, 1.4)))), light, 0.3);   // the great blossom
}
