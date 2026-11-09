'use strict';
// ---------------------------------------------------------------------------
// Pelias's eagle (ch. V, e1m8): "in the sky appeared a dot, that grew into a
// huge eagle as it approached. Swooping down from the sky, it drove at the
// head of Tsotha's steed". Built along +z, wings spread along x.
// ---------------------------------------------------------------------------
function buildEaglePart(part) {
  const mb = new MeshBuilder(2048), F = T.FEATHER;
  switch (part) {
    case 'body':
      loft(mb, [S_(-0.55, 0.06, 0.05, 0.05, 0), S_(-0.3, 0.16, 0.14, 0.12, 0), S_(0, 0.2, 0.17, 0.15, 0), S_(0.3, 0.14, 0.13, 0.1, 0.03), S_(0.45, 0.08, 0.08, 0.07, 0.06)], 10, F);
      addRock(mb, 0, 0.1, 0.55, 0.1, 0.1, 0.12, 3, T.BONE, 0.06);                           // the white head
      loft(mb, [S_(0.62, 0.035, 0.04, 0.03, 0.08), S_(0.72, 0.025, 0.03, 0.02, 0.06), S_(0.78, 0.008, 0.012, 0.012, 0.0)], 6, T.GILT);   // the hooked beak
      for (const sx of [-1, 1]) addBox(mb, sx * 0.07, 0.13, 0.6, 0.012, 0.012, 0.012, T.EYE);
      for (let k = 0; k < 7; k++) { const a = -0.6 + k / 6 * 1.2; addBox(mb, Math.sin(a) * 0.22, 0, -0.75 - Math.cos(a) * 0.15, 0.05, 0.012, 0.25, F, a); }   // the tail fan
      for (const sx of [-1, 1]) {                                                            // talons, reaching
        addSeg(mb, [sx * 0.08, -0.12, 0.05], [sx * 0.1, -0.35, 0.25], 0.03, 0.02, T.GILT, ONE3);
        for (let k = -1; k <= 1; k++) addSpike(mb, sx * 0.1 + k * 0.025, -0.36, 0.27, [k * 0.3, -0.5, 1], 0.08, 0.01, 4, T.BLACK);
      }
      break;
    case 'wing': {                                        // a wing along +x from the shoulder: arm, hand, and the long primaries
      const pts = [[0, 0, 0], [0.6, 0.06, -0.05], [1.3, 0.1, -0.2], [2.0, 0.05, -0.45]];
      for (let k = 0; k < 3; k++) {
        const p = pts[k], q = pts[k + 1], w0 = 0.55 - k * 0.12, w1 = 0.55 - (k + 1) * 0.12;
        const a = [p[0], p[1], p[2] + 0.05], b = [q[0], q[1], q[2] + 0.05], c = [q[0], q[1], q[2] - w1], d = [p[0], p[1], p[2] - w0];
        mb.tri(a, b, c, F, 0, 1, 0); mb.tri(a, c, d, F, 0, 1, 0); mb.tri(a, c, b, F, 0, -1, 0); mb.tri(a, d, c, F, 0, -1, 0);
      }
      for (let k = 0; k < 6; k++) addBox(mb, 1.75 + k * 0.05, 0.04, -0.55 - k * 0.07, 0.03, 0.006, 0.28, F, -0.35 - k * 0.12);   // splayed primaries
      break;
    }
  }
  return mb.finish();
}
function drawEagle(x, y, z, yaw, t, light) {
  const root = m4trs(x, y, z, yaw, 0.1, 0, 1.3);
  drawM('eagle:body', root, light);
  const flap = Math.sin(t * 3) * 0.35;
  drawM('eagle:wing', m4mul(root, m4mul(m4t(0.15, 0.05, 0.05), m4rz(flap))), light);
  drawM('eagle:wing', m4mul(root, m4mul(m4t(-0.15, 0.05, 0.05), m4mul(m4s3(-1, 1, 1), m4rz(flap)))), light);
}
