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
  // seated (on a divan): thighs level, shins straight down, back against the cushions, hands on the thighs (seat: about -0.45, the hips at the cushion)
  sit: () => ({ txL: -1.57, txR: -1.5, sxL: 1.57, sxR: 1.5, tzL: 0.1, tzR: -0.1, lean: -0.12, unarmed: true, noShield: true, uxL: -0.45, fxL: -0.9, uzL: 0.1, uxR: -0.45, fxR: -0.9, uzR: 0.1 }),
  drink: t => ({ txL: -1.57, txR: -1.5, sxL: 1.57, sxR: 1.5, tzL: 0.1, tzR: -0.1, lean: -0.12, unarmed: true, noShield: true, uxL: -0.45, fxL: -0.9, uzL: 0.1,
    uxR: -1.0 - 0.25 * Math.max(0, Math.sin(t * 1.7)), fxR: -2.3, uzR: -0.25, headX: -0.15 * Math.max(0, Math.sin(t * 1.7)) }),
  speak: t => ({ uxR: -0.75 - 0.12 * Math.sin(t * 2.3), fxR: -0.7, uzR: 0.2, headX: 0.05 * Math.sin(t * 1.3) }),
  point: () => ({ uxR: -1.45, fxR: -0.1, uzR: 0.05 }),
  rush: t => ({ uxR: -2.2, fxR: -0.6, uzR: 0.2, lean: 0.2, twist: 0.2 }),          // sword up, running at you
  dust: t => { const k = smoothstep(0, 0.25, t); return { uxR: -1.6 * k, fxR: -0.2, uzR: -0.3 * (1 - k), lean: 0.18 * k, twist: 0.35 * k }; },   // the lean hand from the wide sleeve, flinging
  blind: t => ({ uxL: -2.0, uxR: -2.0, fxL: -2.1, fxR: -2.1, uzL: 0.3, uzR: -0.3, headX: 0.45, lean: -0.15 + 0.08 * Math.sin(t * 9), unarmed: true }),   // clutching at his eyes
  cheer: t => ({ uxR: -2.6, fxR: -0.3, uxL: -0.5, headX: -0.25 + 0.05 * Math.sin(t * 6), we: 0.2 }),
  laugh: t => ({ headX: -0.35, uxL: -2.3, uxR: -2.3, fxL: -0.4, fxR: -0.4, uzL: 0.6, uzR: -0.6, lean: -0.1 + 0.05 * Math.sin(t * 7) }),
  kneel: () => ({ txL: -1.5, sxL: 1.5, txR: 0.1, sxR: 1.9, drop: -0.55, lean: 0.25, headX: 0.4, we: 1.35 }),
  ride: () => ({ txL: -1.4, txR: -1.4, sxL: 1.5, sxR: 1.5, tzL: 0.4, tzR: 0.4 }),
};
function drawActors() {
  for (const a of S.actors || []) {
    if (a.hidden || Math.hypot(a.x - S.x, a.z - S.z) > 120) continue;
    const y = groundInfo(a.x, a.z).floor, l = sampleLight(a.x, y + 1.4, a.z);
    const P = poseIdle({}, gameTime + a.x);
    if (a.moving) poseWalk(P, a.walk * 3.2, 0.8);
    Object.assign(P, (ACTOR_POSES[a.pose] || ACTOR_POSES.stand)(a.t));
    if (a.pose === 'ride') { drawHorse(a.x, y, a.z, a.yaw, a.moving ? a.walk * 0.6 : 0, l); drawCharacter(a.cast, a.x, y + seatY(), a.z, a.yaw, P, l); continue; }
    drawCharacter(a.cast, a.x, y + a.seat, a.z, a.yaw, P, l);
  }
}
