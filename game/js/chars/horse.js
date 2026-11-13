'use strict';
// ---- the horse (ch. I: "Riderless horses raced down the field") ----------------
// Built along +z, hooves at y=0. Legs are separate parts so the gallop animates.
function buildHorsePart(part) {
  const mb = new MeshBuilder(2048);
  switch (part) {
    case 'body':
      loft(mb, [S_(-0.95, 0.18, 0.3, 0.3, 1.25), S_(-0.7, 0.3, 0.36, 0.36, 1.3), S_(0, 0.33, 0.34, 0.4, 1.32), S_(0.6, 0.31, 0.36, 0.38, 1.38), S_(0.85, 0.22, 0.3, 0.28, 1.45)], 10, T.HIDE);
      loft(mb, [S_(0.7, 0.16, 0.2, 0.2, 1.55), S_(1.0, 0.13, 0.17, 0.15, 1.85), S_(1.2, 0.1, 0.13, 0.12, 2.05)], 8, T.HIDE);            // neck
      loft(mb, [S_(1.15, 0.1, 0.12, 0.12, 2.1), S_(1.45, 0.08, 0.09, 0.1, 1.95), S_(1.7, 0.06, 0.06, 0.07, 1.82), S_(1.78, 0.03, 0.03, 0.03, 1.8)], 8, T.HIDE);   // head
      for (const sx of [-1, 1]) addBox(mb, sx * 0.07, 2.18, 1.1, 0.02, 0.06, 0.03, T.HIDE);                                     // ears
      addBox(mb, 0, 1.95, 0.95, 0.025, 0.2, 0.15, T.HAIR, 0, ONE3, -0.6);                                                       // mane
      smoothLathe(mb, 0, 1.35, -0.95, [[0.07, 0], [0.06, 0.4], [0.02, 0.75]], 5, T.HAIR, ONE3, [0, -0.8, -0.6]);              // tail
      loft(mb, [S_(-0.35, 0.36, 0.08, 0.36, 1.32), S_(0.3, 0.37, 0.08, 0.37, 1.34)], 10, T.LEATHER);                            // saddle cloth
      break;
    case 'gaunt_body': {                                  // Tsotha's steed (ch. V): "a gaunt weird-looking steed whose stride no natural horse could match"
      loft(mb, [S_(-0.95, 0.14, 0.24, 0.22, 1.5), S_(-0.7, 0.24, 0.3, 0.26, 1.55), S_(0, 0.24, 0.28, 0.24, 1.55), S_(0.6, 0.25, 0.32, 0.3, 1.62), S_(0.85, 0.17, 0.26, 0.22, 1.7)], 10, T.PALE);
      for (let k = 0; k < 7; k++) for (const sx of [-1, 1]) addBox(mb, sx * 0.235, 1.48, -0.25 + k * 0.11, 0.012, 0.2, 0.025, T.PALE, 0, ONE3, sx * 0.15);   // ribs through the hide
      addRock(mb, 0, 1.82, -0.15, 0.06, 0.06, 0.6, 3, T.PALE, 0.15);                                                                 // the knobbed spine
      loft(mb, [S_(0.7, 0.12, 0.17, 0.16, 1.8), S_(1.05, 0.09, 0.13, 0.1, 2.2), S_(1.3, 0.07, 0.1, 0.09, 2.45)], 8, T.PALE);           // a long thin neck
      loft(mb, [S_(1.25, 0.08, 0.1, 0.1, 2.5), S_(1.6, 0.06, 0.07, 0.08, 2.32), S_(1.9, 0.045, 0.05, 0.05, 2.18), S_(1.98, 0.02, 0.02, 0.02, 2.15)], 8, T.BONE);   // a skull of a head
      for (const sx of [-1, 1]) { addBox(mb, sx * 0.06, 2.42, 1.42, 0.02, 0.02, 0.02, T.EYE); addSpike(mb, sx * 0.05, 2.55, 1.25, [sx * 0.2, 1, -0.3], 0.14, 0.02, 4, T.BONE); }
      addBox(mb, 0, 2.2, 1.0, 0.02, 0.25, 0.2, T.HAIR, 0, ONE3, -0.6);
      smoothLathe(mb, 0, 1.6, -0.95, [[0.05, 0], [0.04, 0.5], [0.01, 0.95]], 5, T.HAIR, ONE3, [0, -0.85, -0.5]);
      loft(mb, [S_(-0.35, 0.28, 0.06, 0.3, 1.56), S_(0.3, 0.29, 0.06, 0.3, 1.58)], 10, T.BLACK);                                     // a black saddle-cloth
      break;
    }
    case 'gaunt_leg':
      smoothLathe(mb, 0, 0, 0, [[0.07, -0.05], [0.075, 0.1], [0.04, 0.5], [0.05, 0.62], [0.03, 1.2], [0.05, 1.27], [0.05, 1.35]], 6, T.PALE, ONE3, [0, -1, 0]);
      break;
    case 'leg':                                           // hip-local, hanging down: upper, cannon, hoof
      smoothLathe(mb, 0, 0, 0, [[0.09, -0.05], [0.1, 0.1], [0.06, 0.45], [0.045, 0.6], [0.04, 0.95], [0.06, 1.0], [0.06, 1.08]], 6, T.HIDE, ONE3, [0, -1, 0]);
      break;
  }
  return mb.finish();
}
// the saddle's rise and fall through a stride of the gallop (highest in the moment all four hooves are off the ground): the rider rides it
function horseBob(gallop) { const u0 = ((gallop / (2 * Math.PI)) % 1 + 1) % 1; return 0.03 + 0.1 * Math.max(0, Math.sin(2 * Math.PI * (u0 - 0.62))); }
const HORSE_FOLD = [1, -1];   // which way the knee (fore) and the hock (hind) fold, in the rig's frame
function drawHorse(x, y, z, yaw, gallop, light, dead, gaunt) {
  const sid = gaunt ? 'steed' : 'horse';
  if (typeof SKINNED !== 'undefined' && SKINNED[sid]) {             // the built mesh: the same gallop, on real legs
    if (dead || !gallop) {
      const root = m4trs(x, y + (dead ? 0.25 : 0), z, yaw, 0, dead ? Math.PI / 2 : 0, 1), rots = {};
      if (!dead) return drawSkinnedRots(sid, root, rots, light);   // standing square
      for (const k of ['fl', 'fr', 'hl', 'hr']) { const a = 0.3 + 0.2 * k.length; rots['leg_' + k + '_u'] = m4rx(a); rots['leg_' + k + '_m'] = m4rx(0.5); rots['leg_' + k + '_l'] = m4rx(-0.25); }
      rots.neck = m4rx(0.6); rots.tail = m4rx(0);
      return drawSkinnedRots(sid, root, rots, light);
    }
    // the gallop, hind feet first: each hoof down for a short sweep under the body, then folded up and flung forward to reach
    // for the next stride; all four off the ground for a moment; the body rocking over the forehand and back, the neck against it
    const u0 = ((gallop / (2 * Math.PI)) % 1 + 1) % 1, rots = {}, duty = 0.3, FALL = { hl: 0, hr: 0.1, fl: 0.4, fr: 0.5 };
    for (const k in FALL) {
      const u = (u0 - FALL[k] + 1) % 1, fore = k[0] === 'f', A = fore ? 0.62 : 0.55;
      let a, bend;
      if (u < duty) { const q = u / duty; a = lerp(A, -A * 0.9, q); bend = 0.08 * Math.sin(Math.PI * q); }
      else { const q = (u - duty) / (1 - duty), e = q * q * (3 - 2 * q); a = lerp(-A * 0.9, A, e); bend = Math.sin(Math.PI * Math.pow(q, 0.7)) * (fore ? 1.25 : 0.95); }
      rots['leg_' + k + '_u'] = m4rx(-a); rots['leg_' + k + '_m'] = m4rx(bend * HORSE_FOLD[fore ? 0 : 1]); rots['leg_' + k + '_l'] = m4rx(-bend * 0.6 * HORSE_FOLD[fore ? 0 : 1]);
    }
    const rock = Math.sin(2 * Math.PI * (u0 - 0.15));
    const root = m4trs(x, y + horseBob(gallop), z, yaw, rock * 0.07, 0, 1);
    rots.neck = m4rx(-rock * 0.14); rots.tail = m4rx(-0.45 - 0.2 * rock);
    return drawSkinnedRots(sid, root, rots, light);
  }
  const root = m4trs(x, y, z, yaw, dead ? 0 : 0, dead ? Math.PI / 2 : 0, 1);
  const lift = dead ? 0 : Math.abs(Math.sin(gallop)) * 0.1;
  const base = m4mul(root, m4t(0, (dead ? -0.95 : 0) + lift, 0));
  drawM(gaunt ? 'horse:gaunt_body' : 'horse:body', base, light);
  const legs = [[-0.2, 0.65, 0], [0.2, 0.65, 0.9], [-0.2, -0.75, 2.1], [0.2, -0.75, 3.0]];
  for (const [lx, lz, ph] of legs) {
    const a = dead ? 0.3 : Math.sin(gallop + ph) * 0.7;
    drawM(gaunt ? 'horse:gaunt_leg' : 'horse:leg', m4mul(base, m4mul(m4t(lx, gaunt ? 1.35 : 1.08, lz), m4rx(a))), light);
  }
}
