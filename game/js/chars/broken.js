'use strict';
// ---- broken gear: what a dead man's weapon looks like when you can't take it --------
// All built along +y (they're laid flat by the caller), each break a ragged splinter.
function buildBroken(part) {
  const mb = new MeshBuilder(1024);
  const splinters = (y, r, n, layer, up) => { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; addSpike(mb, Math.cos(a) * r * 0.5, y, Math.sin(a) * r * 0.5, [Math.cos(a) * 0.3, up, Math.sin(a) * 0.3], 0.04 + (k % 3) * 0.03, r * 0.6, 3, layer); } };
  switch (part) {
    case 'sword_hilt':                                  // pommel, grip and cross, a hand's breadth of blade snapped off jagged
      addRock(mb, 0, -0.03, 0, 0.022, 0.022, 0.022, 2, T.IRON, 0.05);
      smoothLathe(mb, 0, 0, 0, [[0.016, -0.015], [0.018, 0.04], [0.016, 0.1]], 8, T.GRIP, ONE3, [0, 1, 0]);
      addBox(mb, 0, 0.11, 0, 0.09, 0.012, 0.016, T.IRON, 0, ONE3, 0.15);
      loft(mb, [S_(0.12, 0.028, 0.006, 0.006, 0), S_(0.22, 0.027, 0.005, 0.005, 0), S_(0.25, 0.01, 0.004, 0.004, 0.012)], 4, T.STEEL, 1, null, 'y');
      addSpike(mb, 0.012, 0.22, 0, [0.2, 1, 0], 0.06, 0.012, 3, T.STEEL);
      break;
    case 'sword_tip':
      loft(mb, [S_(0, 0.024, 0.005, 0.005, -0.01), S_(0.03, 0.025, 0.005, 0.005, 0), S_(0.33, 0.017, 0.004, 0.004, 0), S_(0.41, 0.001, 0.001, 0.001, 0)], 4, T.STEEL, 1, null, 'y');
      break;
    case 'spear_butt':                                  // the haft snapped across a knee, splinters at the break
      smoothLathe(mb, 0, 0, 0, [[0.017, -0.7], [0.019, 0], [0.018, 0.55]], 6, T.WOOD, ONE3, [0, 1, 0]);
      splinters(0.55, 0.035, 6, T.WOOD, 1);
      break;
    case 'spear_head':
      smoothLathe(mb, 0, 0, 0, [[0.017, 0.62], [0.017, 1.48]], 6, T.WOOD, ONE3, [0, 1, 0]);
      splinters(0.62, 0.035, 5, T.WOOD, -1);
      smoothLathe(mb, 0, 0, 0, [[0.022, 1.48], [0.024, 1.56]], 6, T.IRON, ONE3, [0, 1, 0]);
      loft(mb, [S_(1.55, 0.02, 0.008, 0.008, 0), S_(1.66, 0.04, 0.008, 0.008, 0), S_(1.8, 0.022, 0.006, 0.006, 0), S_(1.9, 0.001, 0.001, 0.001, 0)], 4, T.STEEL, 1, null, 'y');
      break;
    case 'axe_head':                                    // the head with a stub of haft, the bit notched
      smoothLathe(mb, 0, 0, 0, [[0.02, 0.7], [0.022, 1.25]], 6, T.WOOD, ONE3, [0, 1, 0]);
      splinters(0.7, 0.04, 5, T.WOOD, -1);
      loft(mb, [S_(0.95, 0.008, 0.02, 0.02, 0, 0.03), S_(1.05, 0.008, 0.16, 0.03, 0, 0.03), S_(1.18, 0.008, 0.17, 0.02, 0, 0.03), S_(1.25, 0.008, 0.08, 0.02, 0, 0.03), S_(1.32, 0.006, 0.12, 0.01, 0, 0.03)], 4, T.STEEL, 1, null, 'y');
      break;
    case 'axe_haft':
      smoothLathe(mb, 0, 0, 0, [[0.02, -0.9], [0.022, 0], [0.021, 0.62]], 6, T.WOOD, ONE3, [0, 1, 0]);
      splinters(0.62, 0.04, 6, T.WOOD, 1);
      break;
    case 'bow': {                                       // snapped at the grip, the string hanging slack
      const pts = [];
      for (let k = 0; k <= 10; k++) { const t = k / 10 * 2 - 1; pts.push([k < 5 ? -0.03 : 0.03, t * 0.62, 0.1 * (1 - t * t) * (k < 5 ? 0.6 : 1)]); }
      for (let k = 0; k < 10; k++) if (k !== 4) addSeg(mb, pts[k], pts[k + 1], 0.014, 0.012, T.WOOD, ONE3);
      splinters(0, 0.03, 4, T.WOOD, 1);
      addSeg(mb, [0, -0.62, 0], [0.12, -0.1, -0.04], 0.003, 0.003, T.BONE, ONE3);
      break;
    }
    case 'shield_half': {                               // split down the planks: half a painted disc, iron rim and all
      const N = 9;
      for (let k = 0; k < N; k++) {
        const a0 = -Math.PI / 2 + k / N * Math.PI, a1 = -Math.PI / 2 + (k + 1) / N * Math.PI, r = 0.3;
        const p0 = [Math.cos(a0) * r, Math.sin(a0) * r, 0], p1 = [Math.cos(a1) * r, Math.sin(a1) * r, 0];
        mb.tri([0.02, 0, 0.025], p0, p1, T.SHIELD, 0, 0, 1); mb.tri([0.02, 0, -0.02], p1, p0, T.SHIELD, 0, 0, -1);
        addBox(mb, (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0, 0.012, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 2 + 0.005, 0.024, T.IRON, 0, ONE3, 0);
      }
      for (let k = -4; k <= 4; k++) addBox(mb, 0.02 + (k % 2) * 0.012, k * 0.06, 0, 0.012, 0.028, 0.022, T.WOOD);   // the splintered edge
      break;
    }
  }
  return mb.finish();
}
