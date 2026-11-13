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
  if (typeof SKINNED !== 'undefined' && SKINNED[id]) return drawSkinned(id, x, y, z, yaw, P, light, glow);   // the built mesh, once loaded
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
  const weapon = P.weapon || c.weapon;
  if (weapon && !P.unarmed) {
    // the weapon sits in the right fist, blade pointing along the forearm's forward axis
    // P.we: blade elevation above horizontal, in the body's frame (arm angles subtracted out)
    const wx = P.we !== undefined ? -P.we - ((P.uxR || 0) + (P.fxR === undefined ? -0.15 : P.fxR)) : (P.wx || 0);
    const wm = m4mul(handR, m4mul(m4rx(Math.PI / 2 + wx), m4ry(P.wy || 0)));
    if (weapon === 'bow') {
      const lh = m4mul(farmL, m4t(0, -0.32, 0.03));
      M('bow', m4mul(lh, m4rx(Math.PI / 2 - 0.1)));
    } else M(weapon, weapon === 'spear' ? m4mul(wm, m4t(0, -0.35, 0)) : weapon === 'pike' ? m4mul(wm, m4t(0, -0.9, 0)) : weapon === 'axe' ? m4mul(wm, m4t(0, -0.45, 0)) : weapon === 'greatsword' ? m4mul(wm, m4t(0, -0.05, 0)) : wm);
  }
  if (c.shield && !P.noShield) M('shield', m4mul(farmL, m4mul(m4t(-0.06, -0.17, 0.04), m4mul(m4ry(-Math.PI / 2 + 0.25), m4rx(0.1)))));
}

// Pose library: f = the actor, t = time, w = walk phase. Returns joint angles.
// The walk: ph = metres walked x k (so a full stride is 2π/k metres and the feet don't slide), amt 0..1, run 0 (a walk) .. 1 (a run).
// The built bodies solve their legs to the feet (skinGait); the angles set here are the part-built rig's.
function poseWalk(P, ph, amt, armsFree = true, run = 0, k = 3.4) {
  const c = Math.cos(ph + 0.25) * amt;
  P.gait = { ph, k, amt, run };
  P.txL = -Math.cos(ph) * 0.6 * amt; P.txR = Math.cos(ph) * 0.6 * amt;   // (the left foot comes down ahead at ph = 0)
  P.sxL = Math.max(0, -Math.sin(ph)) * 0.9 * amt; P.sxR = Math.max(0, Math.sin(ph)) * 0.9 * amt;   // the knee bends on the swing, not under the weight
  if (armsFree) {                                       // the arms against the legs: loose at a walk, pumping, elbows bent, at a run
    const A = lerp(0.32, 0.6, run);
    P.uxL = c * A; P.uxR = -c * A;
    P.fxL = lerp(-0.3, -1.35, run) - Math.max(0, -c) * lerp(0.25, 0.35, run); P.fxR = lerp(-0.3, -1.35, run) - Math.max(0, c) * lerp(0.25, 0.35, run);
    P.uzL = Math.max(P.uzL || 0, 0.12); P.uzR = Math.max(P.uzR || 0, 0.12);
  }
  P.drop = -Math.abs(Math.cos(ph)) * 0.04 * amt;
  P.lean = Math.max(P.lean || 0, lerp(0.05, 0.22, run) * amt);
  P.headX = (P.headX || 0) - lerp(0, 0.1, run) * amt;    // the head kept level as he leans into it
  return P;
}
// poseWalk for something that walks (o.walk: metres walked, o.moving), its pace read off how fast o.walk grows: a walk, a jog,
// a run, the stride lengthening with it; the phase kept here (render side), so a change of pace never jumps the legs, and the
// stride eased in as it sets off and out as it stops. walkK/runK: radians per metre at a walk and at a run (2π/k: the stride).
const GAIT_ST = new WeakMap();
function poseMove(P, o, armsFree = true, { moving = o.moving, walkK = 4.3, runK = 3.3, runAt = 2.0, crouch = 0 } = {}) {
  let r = GAIT_ST.get(o); const now = gameTime;
  if (!r || now - r.t > 0.5 || o.walk < r.w) { r = { w: o.walk, t: now, v: moving ? runAt : 0, ph: o.walk * walkK, amt: moving ? 1 : 0, x: o.x, z: o.z, back: 1 }; GAIT_ST.set(o, r); }
  const dt = now - r.t, dw = o.walk - r.w;
  if (dt > 0) { r.v = lerp(r.v, dw / dt, Math.min(1, dt * 5)); r.amt = clamp(r.amt + (moving ? 1 : -1) * dt * 5, 0, 1); }
  // backing away (still facing you): the stride runs backward, so the feet step back instead of skating
  const mx = (o.x || 0) - (r.x || 0), mz = (o.z || 0) - (r.z || 0), ml = Math.hypot(mx, mz);
  if (ml > 1e-4 && o.yaw !== undefined) r.back = lerp(r.back, (mx * Math.sin(o.yaw) + mz * Math.cos(o.yaw)) / ml < -0.3 ? -1 : 1, Math.min(1, dt * 8));
  const run = smoothstep(runAt, runAt + 1, r.v) * (r.back > 0 ? 1 : 0.4), k = lerp(walkK, runK, run);
  r.ph += dw * k * Math.sign(r.back || 1); r.w = o.walk; r.t = now; r.x = o.x; r.z = o.z;
  if (r.amt <= 0) return P;
  poseWalk(P, r.ph, smoothstep(0, 1, r.amt), armsFree, run, k);
  if (crouch) P.gait.crouch = crouch;
  return P;
}
function poseIdle(P, t) { P.plant = 1; P.breathe = Math.sin(t * 1.6) * 0.006; P.uzL = 0.12; P.uzR = 0.12; P.fxL = -0.25; P.fxR = -0.25; return P; }
// Quake's killers never stand up straight: hunched, knees bent, head thrust forward; the left foot ahead, the weight between
function poseMenace(P, t) {
  const sw = Math.sin(t * 0.9) * 0.04;                  // the weight shifting from foot to foot
  Object.assign(P, { lean: 0.2, headX: -0.18, txL: -0.42 + sw, txR: 0.08 + sw, sxL: 0.55, sxR: 0.5, tzL: 0.08, tzR: 0.06, fpR: 0.05, twist: 0.1, drop: -0.06, uzL: 0.32, uzR: 0.28, breathe: Math.sin(t * 2.4) * 0.01 });
  return P;
}
// the crawler goes on all fours: spine flat, head craned up, long arms planted ahead
function poseCrawl(P, ph, amt, t) {
  const s = Math.sin(ph) * amt;
  Object.assign(P, { lean: 1.2, headX: -1.0 + Math.sin(t * 3) * 0.08, drop: -0.42, uxL: -0.85 + s * 0.45, uxR: -0.85 - s * 0.45, fxL: -0.35, fxR: -0.35, uzL: 0.22, uzR: 0.22,   // arms swung forward to plant ahead of the body
    txL: -1.05 - s * 0.4, txR: -1.05 + s * 0.4, sxL: 1.55, sxR: 1.55 });
  return P;
}
