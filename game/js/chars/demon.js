'use strict';
// ---------------------------------------------------------------------------
// The slave of the Ring (The Phoenix on the Sword, e0m1): Thoth-Amon's summoned
// thing. "Its outline was not unlike that of a gigantic baboon, but no such
// baboon ever walked the earth, not even in Stygia." Built on the humanoid rig:
// a mountain of shoulder, a dog's muzzle full of fangs, arms to the knee.
// ---------------------------------------------------------------------------
function buildApe(part, c) {
  const mb = new MeshBuilder(2048), b = c.bulk, al = c.arm, H = T[c.skin];
  switch (part) {
    case 'hips': loftY(mb, [[-0.12, 0.13 * b, 0.1, 0.12], [0, 0.16 * b, 0.11, 0.13], [0.08, 0.15 * b, 0.1, 0.12]], 10, H, null, 1 / 0.6); break;
    case 'torso': {                                      // a barrel chest, a hump of shoulder rising over the head
      loftY(mb, [[0, 0.15 * b, 0.11, 0.11], [0.14, 0.19 * b, 0.15, 0.15], [0.3, 0.25 * b, 0.17, 0.2], [0.44, 0.3 * b, 0.16, 0.24, 0.02],
        [0.54, 0.24 * b, 0.12, 0.2, 0.05], [0.62, 0.1 * b, 0.08, 0.1, 0.08]], 14, H, null, 1 / 0.6);
      for (const sx of [-1, 1]) addRock(mb, sx * 0.24 * b, 0.48, -0.03, 0.13 * b, 0.11, 0.13, 4 + sx, H, 0.1);   // the shoulders
      for (let k = 0; k < 9; k++) {                      // a mane of coarse fur standing up along the back
        const y = 0.2 + k * 0.045;
        addSpike(mb, (k % 2 - 0.5) * 0.06, y, -0.17 - 0.06 * Math.sin(k / 8 * Math.PI), [(k % 3 - 1) * 0.3, 0.6, -1], 0.12, 0.03, 4, H);
      }
      break;
    }
    case 'head': {                                       // head-local: a heavy brow, a long muzzle thrust forward, the lips peeled back
      smoothLathe(mb, 0, -0.04, 0, [[0.08 * b, 0], [0.085 * b, 0.07], [0.08 * b, 0.12]], 8, H, ONE3, [0, 1, 0.4]);
      addRock(mb, 0, 0.2, 0.0, 0.12, 0.11, 0.12, 6, H, 0.06);                               // the skull
      addRock(mb, 0, 0.26, 0.09, 0.12, 0.035, 0.05, 7, H, 0.05);                             // the brow shelf
      loft(mb, [S_(0.06, 0.08, 0.06, 0.05, 0.18), S_(0.16, 0.065, 0.05, 0.045, 0.17), S_(0.26, 0.05, 0.04, 0.03, 0.165), S_(0.31, 0.035, 0.03, 0.02, 0.16)], 10, H, 1);   // the muzzle
      addRock(mb, 0, 0.13, 0.27, 0.035, 0.022, 0.03, 8, T.BLACK, 0.08);                     // the nose
      addBox(mb, 0, 0.115, 0.2, 0.05, 0.01, 0.1, T.MOUTH);                                  // the gape
      for (const sx of [-1, 1]) {
        addSpike(mb, sx * 0.04, 0.14, 0.24, [sx * 0.1, -1, 0.1], 0.08, 0.014, 4, T.BONE);   // fangs above
        addSpike(mb, sx * 0.035, 0.09, 0.22, [0, 1, 0.15], 0.06, 0.012, 4, T.BONE);          // and below
        addBox(mb, sx * 0.05, 0.225, 0.13, 0.02, 0.012, 0.012, T.EYE);                       // "Look into his eyes and blast his soul"
        addRock(mb, sx * 0.13, 0.2, -0.02, 0.06, 0.08, 0.05, 9 + sx, H, 0.1);                 // ruffs of fur at the jowls
      }
      break;
    }
    case 'uarm': loftY(mb, [[-0.3 * al, 0.06, 0.06, 0.06], [-0.15 * al, 0.075 * b, 0.075, 0.075], [0, 0.095 * b, 0.09, 0.09]], 8, H, null, 1 / 0.6); break;
    case 'farm': {
      loftY(mb, [[-0.3 * al, 0.045, 0.05, 0.05], [-0.15 * al, 0.06 * b, 0.065, 0.065], [0, 0.065 * b, 0.065, 0.065]], 8, H, null, 1 / 0.6);
      addRock(mb, 0, -0.33 * al, 0.02, 0.06, 0.05, 0.06, 9, H, 0.1);                         // a great hand
      for (let k = -1.5; k <= 1.5; k++) addSpike(mb, k * 0.028, -0.36 * al, 0.04, [k * 0.15, -1, 0.5], 0.12, 0.013, 4, T.BONE);
      break;
    }
    case 'thigh': loftY(mb, [[-0.42, 0.06, 0.06, 0.06], [-0.2, 0.08 * b, 0.08, 0.085], [0, 0.1 * b, 0.09, 0.1]], 8, H, null, 1 / 0.6); break;
    case 'shin': {
      loftY(mb, [[-0.4, 0.04, 0.04, 0.04], [-0.2, 0.05, 0.05, 0.06], [0, 0.065, 0.06, 0.06]], 8, H, null, 1 / 0.6);
      addRock(mb, 0, -0.42, 0.06, 0.06, 0.03, 0.1, 5, H, 0.08);
      for (let k = -1; k <= 1; k++) addSpike(mb, k * 0.03, -0.43, 0.14, [k * 0.2, -0.3, 1], 0.07, 0.012, 4, T.BONE);
      break;
    }
  }
  return mb.finish();
}
