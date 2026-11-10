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
  } else if (part === 'tentacle') {
    const pts = [[0, 0, 0], [0, -0.05, 0.35], [0, -0.15, 0.62], [0, -0.3, 0.8]];
    for (let k = 0; k < 3; k++) addSeg(mb, pts[k], pts[k + 1], 0.2 - k * 0.05, 0.15 - k * 0.04, T.VENOM, ONE3);
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
function drawWeeper(f, lightOverride) {
  const l = lightOverride || sampleLight(f.x, f.y + 1, f.z), t = gameTime + f.homeX;
  // it quakes: the whole mass wobbles on a few slow, unrelated waves
  const wob = (a, b) => 1 + 0.08 * Math.sin(t * a) + 0.05 * Math.sin(t * b + 1.3);
  const root = m4mul(m4trs(f.x, f.y, f.z, f.yaw, 0, 0, 1), m4s3(wob(2.1, 5.3), wob(1.7, 4.1) * (f.state === 'windup' ? 1.2 : 1), wob(2.6, 3.7)));
  R.key = l.d;
  R.blend(true);
  drawPart('weeper_body', 'weeper:body', root, l, 0.15, 0.82);
  R.blend(false);
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2, sway = Math.sin(t * 2.3 + k) * 0.5 + (f.moving ? Math.sin(f.walk * 3 + k) * 0.4 : 0);
    drawPart('weeper_tentacle', 'weeper:tentacle', m4mul(root, m4trs(Math.sin(a) * 1.2, 0.35, Math.cos(a) * 1.0, a, 0.3 + sway * 0.3, sway * 0.4, 1.2)), l, 0.1);
  }
  const lunge = f.state === 'windup' ? 0.3 : f.state === 'strike' ? 0.6 : 0;
  drawPart('weeper_head', 'weeper:head', m4mul(root, m4trs(0, (typeof SKINNED !== 'undefined' && SKINNED.weeper_head ? 1.25 : 1.55) + Math.sin(t * 1.9) * 0.08, 0.7 + lunge, 0, -0.2 - lunge * 0.4, Math.sin(t * 0.9) * 0.15, 1.1)), l, 0.05);
}
