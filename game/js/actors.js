'use strict';
// ---------------------------------------------------------------------------
// Actors: the book's people who play a scene rather than fight one (the kings at the conclave, Tsotha
// leading the prisoner down, Trocero at the king's side, Tamar's councilmen). Data in the level spec:
//   actors: [{ id, cast, at: [cx, cz], yaw, pose, hidden, seat, solid }]
// and moved by beats:  act: { <id>: { to: [cx, cz] | [[cx, cz], ...], sp, pose, yaw, face: 'player'|<id>|null,
//                                     lead: metres, escort: { of: <id>, side, back }, at, show, hide, seat } }
//   lead: walk the path, but wait whenever the hero is more than that far behind (Tsotha leading the march)
//   escort: keep a place beside the hero, side metres to his right and back metres behind (ahead, if back < 0), facing <of>
//   leash: he holds the prisoner's chain (drawn from his fist to the manacles)
// Everything lives in S and runs in the tick, so it is deterministic.
// ---------------------------------------------------------------------------
function actorsInit() {
  S.actors = (LEVEL.actors || []).map(a => ({ id: a.id, cast: a.cast || a.id, x: a.at[0] * CELL, z: a.at[1] * CELL, yaw: a.yaw || 0, pose: a.pose || 'stand', walk: 0, moving: false,
    path: [], sp: 1.6, lead: 0, escort: null, face: null, hidden: !!a.hidden, t: 0, solid: a.solid !== false, seat: a.seat || 0 }));
}
function actor(id) { return S.actors ? S.actors.find(a => a.id === id) : null; }
function directActors(spec) {
  for (const id in spec) {
    const a = actor(id), d = spec[id]; if (!a) continue;
    if (d.at) { a.x = d.at[0] * CELL; a.z = d.at[1] * CELL; }
    if (d.to) a.path = !d.to.length ? [] : (Array.isArray(d.to[0]) ? d.to : [d.to]).map(p => [p[0] * CELL, p[1] * CELL]);
    if (d.sp) a.sp = d.sp;
    if (d.pose) { a.pose = d.pose; a.t = 0; }
    if (d.yaw !== undefined) a.yaw = d.yaw;
    if ('face' in d) a.face = d.face;
    if ('lead' in d) a.lead = d.lead;
    if ('escort' in d) a.escort = d.escort;
    if ('leash' in d) a.leash = d.leash;
    if ('seat' in d) a.seat = d.seat;
    if (d.show) a.hidden = false;
    if (d.hide) a.hidden = true;
  }
}
function actorStep(a, tx, tz, sp) {
  const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz); if (d < 0.05) return d;
  const st = Math.min(d, sp * DT), r = collide(a.x + dx / d * st, a.z + dz / d * st, 0.35, groundInfo(a.x, a.z).floor, a, false);
  const m = Math.hypot(r[0] - a.x, r[1] - a.z); a.walk += m; a.moving = m > st * 0.3; a.x = r[0]; a.z = r[1];
  if (a.moving) a.yaw = turnTo(a.yaw, Math.atan2(dx, dz), 6 * DT);
  return d;
}
function turnTo(y, want, max) { let d = want - y; d = Math.atan2(Math.sin(d), Math.cos(d)); return y + clamp(d, -max, max); }
function updateActors() {
  for (const a of S.actors || []) {
    a.t += DT; a.moving = false;
    if (a.hidden) continue;
    if (a.escort) {                                     // a guard at the prisoner's elbow, between him and any thought of running
      const of = actor(a.escort.of), fx = of ? of.x - S.x : -Math.sin(S.yaw), fz = of ? of.z - S.z : -Math.cos(S.yaw), fl = Math.hypot(fx, fz) || 1;
      const ux = fx / fl, uz = fz / fl;
      let back = a.escort.back;
      if (back < 0 && of) back = Math.max(back, -(fl - 1.4));   // a place ahead of the prisoner (back < 0), but never on the heels of the man he follows
      const tx = S.x + uz * a.escort.side - ux * back, tz = S.z - ux * a.escort.side - uz * back;
      const d = Math.hypot(tx - a.x, tz - a.z);
      if (d > 0.4) actorStep(a, tx, tz, back < 0 ? Math.min(6, 1 + d * 3) : Math.min(5, 1 + d * 1.6));   // (the one ahead hurries more, to keep his place before you)
      if (d < 1.2) a.yaw = turnTo(a.yaw, Math.atan2(ux, uz), 4 * DT);
      continue;
    }
    if (a.path.length) {
      if (a.lead && Math.hypot(S.x - a.x, S.z - a.z) > a.lead) { a.yaw = turnTo(a.yaw, Math.atan2(S.x - a.x, S.z - a.z), 3 * DT); continue; }   // he waits for you, and looks back
      const [tx, tz] = a.path[0];
      if (actorStep(a, tx, tz, a.sp) < 0.15) a.path.shift();
      continue;
    }
    const f = a.face === 'player' ? { x: S.x, z: S.z } : a.face ? actor(a.face) : null;
    if (f) a.yaw = turnTo(a.yaw, Math.atan2(f.x - a.x, f.z - a.z), 3 * DT);
  }
}
function actorColliders(c, self) { for (const a of S.actors || []) if (!a.hidden && a.solid && a !== self) c.push({ x: a.x, z: a.z, r: 0.4 }); }
// the poses an actor can hold: Object.assign'ed over an idle pose (t: seconds since the pose was taken)
const ACTOR_POSES = {
  stand: () => ({}),
  guard: () => ({ we: 1.35 }),                                                   // the long-shafted axe grounded beside him
  lead: () => ({ we: 1.35, uxL: 0.35, fxL: -0.25, uzL: 0.45 }),                   // the axe in his right hand, his left fist back at his hip with the prisoner's chain in it
  // seated (on a divan): thighs about level, shins straight down, back against the cushions, hands on the thighs, the knees a little apart
  // (on a divan the thighs' pitch, the height and the place on the seat are fitted to the body: sitFit)
  sit: () => ({ plant: 0, txL: -1.57, txR: -1.57, sxL: 1.57, sxR: 1.57, tzL: 0.1, tzR: 0.1, lean: -0.12, unarmed: true, noShield: true, uxL: -0.45, fxL: -0.9, uzL: 0.1, uxR: -0.45, fxR: -0.9, uzR: 0.1 }),
  drink: t => ({ plant: 0, txL: -1.57, txR: -1.57, sxL: 1.57, sxR: 1.57, tzL: 0.1, tzR: 0.1, lean: -0.12, unarmed: true, noShield: true, uxL: -0.45, fxL: -0.9, uzL: 0.1,
    uxR: -1.0 - 0.25 * Math.max(0, Math.sin(t * 1.7)), fxR: -2.3, uzR: -0.25, headX: -0.15 * Math.max(0, Math.sin(t * 1.7)) }),
  speak: t => ({ uxR: -0.75 - 0.12 * Math.sin(t * 2.3), fxR: -0.7, uzR: 0.2, headX: 0.05 * Math.sin(t * 1.3) }),
  point: () => ({ uxR: -1.45, fxR: -0.1, uzR: 0.05 }),
  rush: t => ({ uxR: -2.2, fxR: -0.6, uzR: 0.2, lean: 0.2, twist: 0.2 }),          // sword up, running at you
  dust: t => { const k = smoothstep(0, 0.25, t); return { uxR: -1.6 * k, fxR: -0.2, uzR: -0.3 * (1 - k), lean: 0.18 * k, twist: 0.35 * k }; },   // the lean hand from the wide sleeve, flinging
  blind: t => ({ uxL: -2.0, uxR: -2.0, fxL: -2.1, fxR: -2.1, uzL: 0.3, uzR: -0.3, headX: 0.45, lean: -0.15 + 0.08 * Math.sin(t * 9), unarmed: true }),   // clutching at his eyes
  cheer: t => ({ uxR: -2.6, fxR: -0.3, uxL: -0.5, headX: -0.25 + 0.05 * Math.sin(t * 6), we: 0.2 }),
  laugh: t => ({ headX: -0.35, uxL: -2.3, uxR: -2.3, fxL: -0.4, fxR: -0.4, uzL: 0.6, uzR: -0.6, lean: -0.1 + 0.05 * Math.sin(t * 7) }),
  kneel: () => ({ txL: -1.5, sxL: 1.5, txR: 0.1, sxR: 1.75, fpR: 1.35, lean: 0.25, headX: 0.4, we: 1.35 }),   // on one knee (planted: the knee on the ground, the toes of that foot behind)
  ride: () => ({ plant: 0, txL: -1.4, txR: -1.4, sxL: 1.5, sxR: 1.5, tzL: 0.4, tzR: 0.4 }),
};
// render side: the pose each actor held before this one, so a change of pose is a movement, not a cut
const ACTOR_WAS = new WeakMap();
function actorPose(a) {
  const pose = p => { const c = CAST[a.cast] || {}, P = Object.assign({}, (ACTOR_POSES[p] || ACTOR_POSES.stand)(p === a.pose ? a.t : 9));
    if (P.we === undefined && P.wel === undefined && (c.weapon === 'sword' || c.weapon === 'greatsword')) P.we = -1.35;   // at his ease, the blade hangs point-down at his side
    if (c.shield && P.uxL === undefined && !P.noShield) Object.assign(P, { uxL: -0.3, fxL: -1.2, uzL: 0.22 });           // and the shield carried upright on his arm, not flat like a tray
    return P; };
  let w = ACTOR_WAS.get(a);
  if (!w || w.pose !== a.pose) { w = { pose: a.pose, from: w ? w.pose : a.pose, at: gameTime }; ACTOR_WAS.set(a, w); }
  const now = pose(a.pose), k = smoothstep(0, 0.45, gameTime - w.at);
  if (k >= 1 || w.from === a.pose) return now;
  const was = pose(w.from), out = Object.assign({}, now);
  for (const q of new Set([...Object.keys(was), ...Object.keys(now)])) {
    const A = was[q], B = now[q];
    if (q !== 'plant' && (typeof A === 'number' || typeof B === 'number')) out[q] = lerp(typeof A === 'number' ? A : 0, typeof B === 'number' ? B : 0, k);
  }
  return out;
}
function drawActors() {
  for (const a of S.actors || []) {
    if (a.hidden || Math.hypot(a.x - S.x, a.z - S.z) > 120) continue;
    const y = groundInfo(a.x, a.z).floor, l = sampleLight(a.x, y + 1.4, a.z);
    const P = poseIdle({}, gameTime + a.x);
    poseMove(P, a);
    Object.assign(P, actorPose(a));
    if (a.pose === 'ride') { drawHorse(a.x, y, a.z, a.yaw, a.moving ? a.walk * 0.6 : 0, l); drawCharacter(a.cast, a.x, y + seatY(), a.z, a.yaw, P, l); continue; }
    const st = a.seat ? seatOn(a) : null;
    if (st) { Object.assign(P, { txL: st.tx, txR: st.tx, sxL: -st.tx, sxR: -st.tx, lean: st.lean }); drawCharacter(a.cast, st.x, st.y, st.z, st.yaw, P, l); continue; }
    drawCharacter(a.cast, a.x, y + a.seat, a.z, a.yaw, P, l);
  }
}
// Sitting on a divan, fitted to the body. Hand-set numbers never suited both kings (Strabonus sank a hand's breadth into the
// cushions with his feet through the floor, Amalrus perched): so the built mesh, posed sitting, is measured once, and
//   the thighs are pitched so that with the seat of his breeches on the cushion his soles are flat on the floor, shins upright;
//   he sits that high; and he is set back on the seat until his back is against the cushions (unless that would put his
//   calves into the seat's front, then just clear of it). Drawn only: the sim keeps his place, so determinism is untouched.
const SIT_FIT = {};
function sitFit(id) {
  if (SIT_FIT[id] !== undefined) return SIT_FIT[id];
  const M = typeof SKINNED !== 'undefined' ? SKINNED[id] : null;
  if (!M || !M.prims.length || !M.prims.every(p => p.vbo)) return null;   // not built (the old rig keeps its seat) or not loaded yet
  const gl = R.gl, parts = [];
  for (const p of M.prims) {
    if (/cloak|skirt/.test(p.name)) continue;            // what hangs loose falls where it will
    const d = new Float32Array(p.nv * 16); gl.bindBuffer(gl.ARRAY_BUFFER, p.vbo); gl.getBufferSubData(gl.ARRAY_BUFFER, 0, d); parts.push(d);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  // each vertex by the bone that mostly moves it: 1 the seat (pelvis, thighs), 2 the lower legs (calves, feet), 3 the trunk and head; arms are left out
  const part = M.bones.map(b => /pelvis|thigh/.test(b.name) ? 1 : /calf|foot|ball/.test(b.name) ? 2 : /spine|neck|head|root/i.test(b.name) ? 3 : 0);
  const lean0 = ACTOR_POSES.sit(0).lean;
  const measure = (tx, lean = lean0) => {
    const P = Object.assign(poseIdle({}, 0), ACTOR_POSES.sit(0), { breathe: 0, lean, txL: tx, txR: tx, sxL: -tx, sxR: -tx }), { S } = skinSolve(M, m4ident(), P);
    let sole = 1e9, butt = 1e9, low = 1e9, high = 1e9, calf = 1e9;
    const V = [];
    for (const d of parts) for (let o = 0; o < d.length; o += 16) {
      let X = 0, Y = 0, Z = 0, wb = 0, jb = 0;
      for (let c = 0; c < 4; c++) {
        const w = d[o + 12 + c]; if (!w) continue; const j = d[o + 8 + c], k = j * 16; if (w > wb) { wb = w; jb = j; }
        X += w * (S[k] * d[o] + S[k + 4] * d[o + 1] + S[k + 8] * d[o + 2] + S[k + 12]); Y += w * (S[k + 1] * d[o] + S[k + 5] * d[o + 1] + S[k + 9] * d[o + 2] + S[k + 13]); Z += w * (S[k + 2] * d[o] + S[k + 6] * d[o + 1] + S[k + 10] * d[o + 2] + S[k + 14]);
      }
      const pt = part[jb]; if (!pt) continue;
      if (pt === 1) butt = Math.min(butt, Y); else if (pt === 2) sole = Math.min(sole, Y);
      V.push(pt, Y, Z);
    }
    for (let i = 0; i < V.length; i += 3) {
      const pt = V[i], y = V[i + 1], z = V[i + 2];
      if (pt !== 2 && y < butt + 0.25) low = Math.min(low, z);                  // the seat of him and the small of his back
      else if (pt !== 2 && y < butt + DIVAN.backH) high = Math.min(high, z);   // his shoulders, against the cushions
      if (pt === 2 && y < butt - 0.03) calf = Math.min(calf, z);                // the backs of his calves, below the seat's edge
    }
    return { sole, butt, low, high, calf };
  };
  const SINK = 0.015;                                    // into the silk, a little
  let lo = -1.95, hi = -1.15;                            // the thighs' pitch: raised (knees high) .. sloping down
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2, r = measure(m); if (r.butt - r.sole < DIVAN.seat - SINK) lo = m; else hi = m; }
  const tx = (lo + hi) / 2, r = measure(tx);
  // as far back on the seat as he goes: his seat against the cushions, unless his calves would be into the seat's front first
  const set = Math.max(DIVAN.back + 0.01 - r.low, DIVAN.front + 0.01 - r.calf);
  // and he lounges back until his shoulders are in the cushions (never forward of the pose's own lean)
  let lean = lean0;
  if (set + r.high > DIVAN.back) {
    let a = -0.6, b = lean0;
    for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if (set + measure(tx, m).high > DIVAN.back - 0.01) b = m; else a = m; }
    lean = (a + b) / 2;
  }
  return (SIT_FIT[id] = { tx, lean, lift: DIVAN.seat - SINK - r.butt, set });
}
// where a seated actor is drawn: on the divan under him, facing out from its back
function seatOn(a) {
  const F = sitFit(a.cast); if (!F) return null;
  let dv = null, best = 1.5;
  for (const p of LV.props) if (p.prefab === 'divan') { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d < best) { best = d; dv = p; } }
  if (!dv) return null;
  const yaw = dv.yaw || 0, c = Math.cos(yaw), s = Math.sin(yaw), u = c * (a.x - dv.x) - s * (a.z - dv.z);
  return { x: dv.x + c * u + s * F.set, z: dv.z - s * u + c * F.set, y: dv.y + F.lift, yaw, tx: F.tx, lean: F.lean };
}
