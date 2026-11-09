'use strict';
// ---------------------------------------------------------------------------
// The rig: one 14-bone humanoid (README §8), rigid parts per bone (Quake-style
// chunky deformation, no weights), the loft helpers the part builders share,
// drawCharacter, and the pose library.
// ---------------------------------------------------------------------------
// the head: a lofted skull, nose and brow carried by the cross-sections, the features painted on
const HEAD_SHAPE = hw => [[0.07, 0.055 * hw, 0.09, 0.03, 0.01], [0.11, 0.075 * hw, 0.1, 0.07], [0.15, 0.084 * hw, 0.104, 0.092], [0.19, 0.086, 0.112, 0.1],
  [0.23, 0.088, 0.105, 0.105], [0.27, 0.083, 0.088, 0.1], [0.31, 0.065, 0.052, 0.08], [0.335, 0.02, 0.015, 0.03]];
const RIG = { hipY: 0.95, spineY: 1.0, neckY: 0.55, shoulderY: 0.46, shoulderX: 0.225, hipX: 0.1, upper: 0.29, fore: 0.3, thigh: 0.47, shin: 0.44 };

// vertical loft: stations [y, halfWidth, front, back, forward offset]
function loftY(mb, st, sides, layer, shade, vScale = 1) {
  loft(mb, st.map(s => S_(s[0], s[1], s[3], s[2], -(s[4] || 0))), sides, layer, vScale, shade || null, 'y');
}
function ringY(mb, y0, y1, w, f, bk, layer, cz = 0) { loftY(mb, [[y0, w * 0.97, f * 0.97, bk * 0.97, cz], [y0 + 0.004, w, f, bk, cz], [y1 - 0.004, w, f, bk, cz], [y1, w * 0.97, f * 0.97, bk * 0.97, cz]], 10, layer); }
const DOWN = [0, -1, 0];

// ---- posing and drawing ------------------------------------------------------
// A pose is a bag of joint angles; anything missing is zero.
function drawCharacter(id, x, y, z, yaw, P, light, glow = 0) {
  const c = CAST[id], b = c.bulk, M = (part, m) => drawM('char:' + id + ':' + part, m, light, glow);
  const root = m4trs(x, y + (P.drop || 0), z, yaw, P.pitch || 0, P.roll || 0, c.scale);
  const hips = m4mul(root, m4mul(m4t(0, RIG.hipY, 0), m4rx(P.hip || 0)));
  const spine = m4mul(root, m4mul(m4t(0, RIG.spineY + (P.breathe || 0), 0), m4mul(m4ry(P.twist || 0), m4rx(P.lean || 0))));
  M('hips', hips);
  M('torso', spine);
  const headM = m4mul(spine, m4mul(m4t(0, RIG.neckY, 0), m4mul(m4ry(P.headY || 0), m4rx(P.headX || 0))));
  M('head', headM);
  if (c.face) M('face', headM);
  let handR = null, farmL = null;
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'L' : 'R';
    const ua = m4mul(spine, m4mul(m4t(s * RIG.shoulderX * b, RIG.shoulderY, 0), m4mul(m4ry(s * (P['uy' + k] || 0)), m4mul(m4rx(P['ux' + k] || 0), m4rz(s * (P['uz' + k] || 0.1))))));
    M('uarm', ua);
    const al = c.arm || 1;
    const fa = m4mul(ua, m4mul(m4t(0, -RIG.upper * al, 0), m4rx(P['fx' + k] || -0.15)));
    M('farm', fa);
    if (s > 0) handR = m4mul(fa, m4t(0, -0.32 * al, 0.03)); else farmL = fa;
    if (c.legs !== 'none') {
      const th = m4mul(hips, m4mul(m4t(s * RIG.hipX * b, 0, 0), m4mul(m4rx(P['tx' + k] || 0), m4rz(s * (P['tz' + k] || 0.02)))));
      M('thigh', th);
      M('shin', m4mul(th, m4mul(m4t(0, -RIG.thigh, 0), m4rx(P['sx' + k] || 0))));
    }
  }
  if (c.weapon && !P.unarmed) {
    // the weapon sits in the right fist, blade pointing along the forearm's forward axis
    // P.we: blade elevation above horizontal, in the body's frame (arm angles subtracted out)
    const wx = P.we !== undefined ? -P.we - ((P.uxR || 0) + (P.fxR === undefined ? -0.15 : P.fxR)) : (P.wx || 0);
    const wm = m4mul(handR, m4mul(m4rx(Math.PI / 2 + wx), m4ry(P.wy || 0)));
    if (c.weapon === 'bow') {
      const lh = m4mul(farmL, m4t(0, -0.32, 0.03));
      M('bow', m4mul(lh, m4rx(Math.PI / 2 - 0.1)));
    } else M(c.weapon, c.weapon === 'spear' ? m4mul(wm, m4t(0, -0.35, 0)) : c.weapon === 'pike' ? m4mul(wm, m4t(0, -0.9, 0)) : c.weapon === 'axe' ? m4mul(wm, m4t(0, -0.45, 0)) : c.weapon === 'greatsword' ? m4mul(wm, m4t(0, -0.05, 0)) : wm);
  }
  if (c.shield && !P.noShield) M('shield', m4mul(farmL, m4mul(m4t(-0.06, -0.17, 0.04), m4mul(m4ry(-Math.PI / 2 + 0.25), m4rx(0.1)))));
}

// Pose library: f = the actor, t = time, w = walk phase. Returns joint angles.
function poseWalk(P, ph, amt, armsFree = true) {
  const s = Math.sin(ph) * amt;
  P.txL = s * 0.6; P.txR = -s * 0.6;
  P.sxL = Math.max(0, -Math.sin(ph - 0.9)) * 0.9 * amt; P.sxR = Math.max(0, Math.sin(ph - 0.9)) * 0.9 * amt;
  if (armsFree) { P.uxL = -s * 0.45; P.uxR = s * 0.45; }
  P.drop = -Math.abs(Math.cos(ph)) * 0.04 * amt;
  P.lean = 0.06 * amt;
  return P;
}
function poseIdle(P, t) { P.breathe = Math.sin(t * 1.6) * 0.006; P.uzL = 0.12; P.uzR = 0.12; P.fxL = -0.25; P.fxR = -0.25; return P; }
// Quake's killers never stand up straight: hunched, knees bent, head thrust forward
function poseMenace(P, t) {
  Object.assign(P, { lean: 0.2, headX: -0.18, txL: -0.28, txR: -0.18, sxL: 0.45, sxR: 0.35, drop: -0.06, uzL: 0.32, uzR: 0.28, breathe: Math.sin(t * 2.4) * 0.01 });
  return P;
}
// the crawler goes on all fours: spine flat, head craned up, long arms planted ahead
function poseCrawl(P, ph, amt, t) {
  const s = Math.sin(ph) * amt;
  Object.assign(P, { lean: 1.2, headX: -1.0 + Math.sin(t * 3) * 0.08, drop: -0.42, uxL: 0.55 + s * 0.45, uxR: 0.55 - s * 0.45, fxL: -0.35, fxR: -0.35, uzL: 0.18, uzR: 0.18,
    txL: -1.05 - s * 0.4, txR: -1.05 + s * 0.4, sxL: 1.55, sxR: 1.55 });
  return P;
}
