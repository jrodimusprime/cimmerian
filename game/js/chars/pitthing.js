'use strict';
// A pit-thing on the humanoid rig: a hunched, spurred body, an oversized skull with the jaw hanging agape,
// long knuckled arms ending in hooks, crooked legs. All the detail is painted into the hide (as Quake did it).
function buildPitThing(part, c) {
  const mb = new MeshBuilder(2048), v = c.pit, b = c.bulk, al = c.arm, H = T.PIT_HIDE;
  const r = (k) => hrand(v, k, 17, 3);
  switch (part) {
    case 'hips': loftY(mb, [[-0.1, 0.07 * b, 0.06, 0.07], [0, 0.1 * b, 0.07, 0.09], [0.08, 0.09 * b, 0.07, 0.08]], 10, H, null, 1 / 0.6); break;
    case 'torso': {                                      // spine-local, 0 = waist, 0.55 = neck: a swollen back, a pinched waist
      const hump = [1, 1.45, 0.8][v];
      loftY(mb, [[0, 0.085 * b, 0.07, 0.08], [0.12, 0.12 * b, 0.085, 0.12 * hump], [0.26, 0.165 * b, 0.1, 0.17 * hump], [0.4, 0.2 * b, 0.11, 0.18 * hump, 0.02],
        [0.5, 0.17 * b, 0.1, 0.13 * hump, 0.04], [0.6, 0.07 * b, 0.06, 0.07, 0.07]], 14, H, null, 1 / 0.6);
      for (const sx of [-1, 1]) addRock(mb, sx * 0.19 * b, 0.46, -0.01, 0.08 * b, 0.07, 0.08, 4 + sx, H, 0.08);   // knotted shoulders
      const spurs = [6, 8, 4][v];
      for (let k = 0; k < spurs; k++) {                  // bony spurs down the spine, no two alike
        const y = 0.06 + k * (0.46 / spurs), back = (0.08 + 0.1 * Math.sin(Math.min(1, y / 0.42) * Math.PI * 0.95)) * hump;
        addSpike(mb, (r(k) - 0.5) * 0.04, y, -back + 0.01, [(r(k + 9) - 0.5) * 0.6, 0.5 + r(k + 3) * 0.4, -1], 0.05 + 0.1 * r(k + 5) * hump, 0.018, 4, T.BONE);
      }
      if (v === 2) for (const sx of [-1, 1]) addSpike(mb, sx * 0.13, 0.3, 0.06, [sx, -0.6, 0.6], 0.12, 0.018, 4, H);   // a pair of withered vestigial arms
      break;
    }
    case 'head': {                                       // head-local, 0 = neck base, +z forward: a long skull, the jaw slung open
      const hs = [1.35, 1.2, 1.55][v], drop = [0.6, 0.45, 0.75][v];
      smoothLathe(mb, 0, -0.04, 0, [[0.06 * b, 0], [0.065 * b, 0.07], [0.07 * b, 0.12]], 8, H, ONE3, [0, 1, 0.3]);   // neck
      const sk = [[-0.14, 0.05, 0.05, 0.04, 0.14], [-0.08, 0.1, 0.1, 0.06, 0.15], [0, 0.11, 0.09, 0.045, 0.14], [0.08, 0.09, 0.065, 0.032, 0.13],
        [0.16, 0.072, 0.048, 0.026, 0.12], [0.24, 0.05, 0.032, 0.02, 0.11], [0.3, 0.018, 0.015, 0.01, 0.105]].map(([z, w, ht, hb, cy]) => S_(z * hs, w * hs, ht * hs, hb * hs, cy * hs));
      loft(mb, sk, 14, T.PIT_HEAD, 1 / (0.44 * hs), null, 'z', 0.14 / 0.44);
      const jaw = [[-0.05, 0.085, 0.015, 0.04], [0.04, 0.08, 0.015, 0.04], [0.13, 0.062, 0.013, 0.032], [0.21, 0.04, 0.012, 0.022], [0.26, 0.015, 0.008, 0.01]]
        .map(([z, w, ht, hb]) => S_(z * hs, w * hs, ht * hs, hb * hs, (0.085 - (z + 0.05) * drop) * hs));
      loft(mb, jaw, 12, T.PIT_JAW, 1 / (0.31 * hs), null, 'z', 0.05 / 0.31);
      for (const sx of [-1, 1]) {                        // fangs, and strings of slaver between the jaws
        addSpike(mb, sx * 0.045 * hs, 0.1 * hs, 0.17 * hs, [sx * 0.1, -1, 0.15], 0.06 * hs, 0.011 * hs, 4, T.BONE);
        addSpike(mb, sx * 0.03 * hs, (0.085 - 0.25 * drop) * hs, 0.2 * hs, [0, 1, 0.2], 0.045 * hs, 0.009 * hs, 4, T.BONE);
        const zz = 0.1 * hs + sx * 0.02, top = 0.105 * hs, bot = (0.085 - (zz / hs + 0.05) * drop) * hs + 0.01;
        addBox(mb, sx * 0.055 * hs, (top + bot) / 2, zz, 0.004, (top - bot) / 2, 0.004, T.VENOM);
      }
      break;
    }
    case 'uarm': loftY(mb, [[-0.29 * al, 0.032, 0.034, 0.034], [-0.15 * al, 0.03, 0.03, 0.03], [0, 0.05 * b, 0.05, 0.05]], 8, H, null, 1 / 0.6);
      addRock(mb, 0, -0.29 * al, -0.01, 0.042, 0.04, 0.045, 7, H, 0.1); break;            // a knob of an elbow
    case 'farm': {
      loftY(mb, [[-0.32 * al, 0.022, 0.024, 0.024], [-0.16 * al, 0.026, 0.028, 0.028], [0, 0.033, 0.035, 0.035]], 8, H, null, 1 / 0.6);
      addRock(mb, 0, -0.33 * al, 0.02, 0.035, 0.03, 0.04, 9, H, 0.12);                    // the hand, and its hooks
      for (let k = -1; k <= 1; k++) addSpike(mb, k * 0.022, -0.34 * al, 0.03, [k * 0.25, -1, 0.75], 0.13 + 0.03 * (k === 0) + 0.03 * v, 0.011, 4, T.BONE);
      break;
    }
    case 'thigh': loftY(mb, [[-0.47, 0.035, 0.035, 0.035], [-0.22, 0.05 * b, 0.05, 0.05], [0, 0.065 * b, 0.06, 0.065]], 8, H, null, 1 / 0.6); break;
    case 'shin': {
      loftY(mb, [[-0.44, 0.022, 0.022, 0.022], [-0.2, 0.03, 0.03, 0.035], [0, 0.04, 0.04, 0.04]], 8, H, null, 1 / 0.6);
      for (let k = -1; k <= 1; k++) addSpike(mb, k * 0.025, -0.44, 0.02, [k * 0.3, -0.25, 1], 0.1, 0.012, 4, T.BONE);   // splayed toes
      break;
    }
  }
  return mb.finish();
}
