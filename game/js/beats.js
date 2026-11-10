'use strict';
// ---------------------------------------------------------------------------
// The later levels (e1m4-e1m8) are told in beats: data in the level spec, run here.
//   beats: [{ id, at: room or [rooms], needs: [flags], killed: group, after: secs, sets: flag,
//             lines: [[text, cls]], wake: [groups], npc: 'follow'|'stay', hurl: true }]
// A beat fires once, the first tick its conditions all hold. Its lines come one by one.
// Also here: sleeping guards (wake to running feet nearby, or to a fight), the
// companion who follows you (Pelias), the bosses' special draws, allied ranks,
// and fire globes. All of it is deterministic: it lives in S and runs in the tick.
// ---------------------------------------------------------------------------
function beatsInit() {
  S.beats = { fired: new Set(), queue: [], t: {}, when: {} };
  const n = LEVEL.npc;
  S.npc = n ? { id: n.id, x: n.at[0] * CELL, z: n.at[1] * CELL, yaw: n.yaw || 0, walk: 0, mode: n.mode || 'stay', t: 0 } : null;
  for (const f of S.foes) if (f.asleep) f.state = 'sleep';
}
function roomsOf(at) { return Array.isArray(at) ? at : [at]; }
function groupDead(g) { const m = S.foes.filter(f => f.group === g); return m.length > 0 && m.every(f => f.dead); }
function updateBeats() {
  if (!LEVEL.beats || !S.beats) return;
  const B = S.beats;
  for (const b of LEVEL.beats) {
    if (B.fired.has(b.id)) continue;
    if (b.needs && !b.needs.every(f => S.flags[f])) continue;
    if (b.at && !roomsOf(b.at).includes(S.room)) continue;
    if (b.killed && !groupDead(b.killed)) continue;
    if (b.after !== undefined) { B.t[b.id] = (B.t[b.id] || 0) + DT; if (B.t[b.id] < b.after) continue; }
    B.fired.add(b.id); B.when[b.id] = S.tick;
    (b.lines || []).forEach(([t, c], i) => B.queue.push({ at: S.tick + Math.round(i * 2.6 * SIM_HZ), t, c: c || '' }));
    if (b.sets) setFlag(b.sets);
    for (const g of b.wake || []) { for (const f of S.foes) if (f.group === g && f.state === 'dormant' && f.delay < 0) f.state = 'idle'; alertGroup(g, false); }   // delay -1: held back, out of sight, until a beat sends them in
    if (b.npc && S.npc) S.npc.mode = b.npc;
    if (b.sound) Sfx[b.sound] && Sfx[b.sound](1);
    if (b.hurl) { const f = S.foes.find(q => q.id === b.hurl); if (f) { f.y += 2.2; f.vy = 5; f.falling = 1; f.vx = 0; f.fallTo = 0; const a = f.yaw + Math.PI; f.x += Math.sin(a) * 0; f.z -= 14; } }   // over the parapet: far out, and down
    if (b.cp) S.checkpoint = { x: b.cp[0] * CELL, z: b.cp[1] * CELL, yaw: b.cp[2] || 0 };
  }
  while (B.queue.length && B.queue[0].at <= S.tick) { const q = B.queue.shift(); log(q.t, q.c); if (q.c === 'voice') Sfx.voice(0); }
  updateSleepers();
  updateNPC();
}
// the citadel under Pelias's spell: guards asleep where they stand; running feet or a fight close by rouse them
function updateSleepers() {
  const sp = Math.hypot(S.vx, S.vz);
  for (const f of S.foes) {
    if (f.dead || f.state !== 'sleep') continue;
    const d = Math.hypot(f.x - S.x, f.z - S.z);
    const fight = S.foes.some(o => o !== f && !o.dead && o.alert && o.state !== 'sleep' && Math.hypot(o.x - f.x, o.z - f.z) < 7);
    if ((sp > 5.5 && d < 7) || d < 1.6 || fight || f.hp < FOES[f.cls].hp) {
      f.state = 'chase'; f.alert = true; f.t = 0;
      if (!S.hints.has('woke')) { S.hints.add('woke'); log('A sleeper starts up at the noise, groping for his axe!', 'warn'); }
      Sfx.grunt(false, 0);
    }
  }
}
// Pelias: once freed he follows a few paces behind, and never into a pit
function updateNPC() {
  const n = S.npc; if (!n) return;
  n.t += DT;
  if (n.mode !== 'follow') return;
  const dx = S.x - n.x, dz = S.z - n.z, d = Math.hypot(dx, dz);
  if (d > 30) { n.x = S.x - Math.sin(S.yaw) * -2; n.z = S.z - Math.cos(S.yaw) * -2; return; }   // left far behind: he finds his own way
  if (d > 2.6) {
    const sp = Math.min(d - 2.4, (d > 8 ? 6.5 : 4.2) * DT), st = flowToward(n.x, n.z, S.x, S.z);
    const tx = st ? st[0] - n.x : dx, tz = st ? st[1] - n.z : dz, tl = Math.hypot(tx, tz) || 1;
    const r = collide(n.x + tx / tl * sp, n.z + tz / tl * sp, 0.35, groundInfo(n.x, n.z).floor, n, false);
    n.walk += Math.hypot(r[0] - n.x, r[1] - n.z); n.x = r[0]; n.z = r[1]; n.yaw = Math.atan2(tx, tz);
  } else n.yaw = Math.atan2(dx, dz);
}
function flowToward(x, z, tx, tz) {
  const g = groundInfo(tx, tz); if (g.idx < 0) return null;
  if (!S.npcFlow || S.npcFlow.idx !== g.idx || S.tick % 36 === 0) S.npcFlow = { idx: g.idx, d: bfs(g.idx) };
  return flowStep({ x, z }, S.npcFlow.d);
}
function drawNPC() {
  const n = S.npc; if (!n) return;
  const y = groundInfo(n.x, n.z).floor, l = sampleLight(n.x, y + 1.4, n.z);
  const P = poseIdle({}, gameTime);
  if (n.mode === 'follow' && n.walk > 0) { const moving = Math.hypot(S.x - n.x, S.z - n.z) > 2.7; if (moving) poseWalk(P, n.walk * 3.4, 0.8); }
  if (n.mode === 'bound') Object.assign(P, { uxL: -2.4, uxR: -2.4, uzL: 0.5, uzR: 0.5, headX: 0.5, drop: -0.1, lean: 0.15 });   // held up in the vine's grip
  if (n.mode === 'cast') Object.assign(P, { uxL: -2.0, uxR: -1.6, fxL: -0.3, fxR: -0.3, headX: -0.2 });
  drawCharacter(n.id, n.x, y, n.z, n.yaw, P, l);
}
// allied ranks (the Bossonians and Gundermen on the ridge): drawn, not simulated
function drawAllies() {
  for (const a of LEVEL.allies || []) {
    for (let k = 0; k < a.n; k++) {
      const x = (a.at[0] + (k % a.cols) * a.step) * CELL, z = (a.at[1] + Math.floor(k / a.cols) * a.step) * CELL;
      if (Math.hypot(x - S.x, z - S.z) > 120) continue;
      const y = groundInfo(x, z).floor, P = poseIdle({}, gameTime * 0.8 + k);
      if (a.loose) {                                     // nock, draw, loose, and again: each man on his own rhythm
        const cyc = 4.2 + (k % 5) * 0.31, ph = ((gameTime + k * 1.37) % cyc) / cyc, draw = ph < 0.55 ? smoothstep(0.1, 0.55, ph) : ph < 0.6 ? 1 : 1 - smoothstep(0.6, 0.8, ph);
        Object.assign(P, { uxL: lerp(-0.4, -1.5, draw), fxL: lerp(-0.6, -0.1, draw), uxR: lerp(-0.4, -1.3, draw), fxR: lerp(-0.8, -1.6, draw), headX: -0.1 * draw, twist: -0.25 * draw });
        allyArrow(a, k, x, y, z, cyc, (gameTime + k * 1.37) % cyc);
      }
      else Object.assign(P, { we: 1.35 });
      drawCharacter(a.id, x, y, z, a.yaw + Math.sin(k * 3.1) * 0.12, P, sampleLight(x, y + 1.5, z));
    }
  }
}
// a Bossonian's shaft in flight: loosed at the top of the draw, arcing high over the field onto the enemy line (drawn only)
function allyArrow(a, k, x, y, z, cyc, t) {
  const fly = t - cyc * 0.58, dur = 1.7; if (fly < 0 || fly > dur) return;
  const live = g => S.foes.some(f => f.group === g && !f.dead);
  const tgt = live('shemites') ? [22, 20] : live('spears') ? [53, 22] : live('press') ? [65, 22] : [80, 22];
  const tx = (tgt[0] + (hrand(k, 1, 7, 2) - 0.5) * 6) * CELL, tz = (tgt[1] + (hrand(k, 2, 7, 2) - 0.5) * 16) * CELL, ty = groundInfo(tx, tz).floor + 0.3;
  const u = fly / dur, px = lerp(x, tx, u), pz = lerp(z, tz, u), py = lerp(y + 1.6, ty, u) + Math.sin(u * Math.PI) * 14;
  const vy = (ty - y - 1.6) / dur + Math.cos(u * Math.PI) * Math.PI * 14 / dur, vh = Math.hypot(tx - x, tz - z) / dur;
  drawM('arrow', m4trs(px, py, pz, Math.atan2(tx - x, tz - z), -Math.atan2(vy, vh), 0, 1.3), sampleLight(px, py, pz));
}
// Tsotha's fire globes: "a globe that ... burst in a sheet of flame" (ch. V)
function globeBurst(x, y, z) {
  Sfx.crush();
  for (let k = 0; k < 26; k++) particles.push({ m: 'spark', x, y: y + 0.4, z, vx: (Math.random() - 0.5) * 9, vy: Math.random() * 6, vz: (Math.random() - 0.5) * 9, life: 0.7, max: 0.7, g: 6, s: 1.2 });
  const d = Math.hypot(S.x - x, S.z - z);
  if (d < 3.2) { hurt(Math.round(34 * (1 - d / 3.4)), 'fire'); S.vx += (S.x - x) / (d || 1) * 6; S.vz += (S.z - z) / (d || 1) * 6; }
}
// Pelias's eagle (e1m8): circles high over Tsotha once he is thrown; when he falls it stoops on
// the body, takes the head, and climbs away west into the sunset. Drawn only: nothing in S.
function drawEagleBeat() {
  const p = eaglePos(renderAlpha); if (!p) return;
  drawEagle(p[0], p[1], p[2], p[3], gameTime * (p[4] ? 2 : 1), sampleLight(p[0], p[1], p[2]));
}
function eaglePos(alpha) {
  const E = LEVEL.eagle; if (!E || !S.beats || !S.beats.fired.has(E.from)) return null;
  const ts = S.foes.find(f => f.cls === E.foe); if (!ts) return null;
  const t0 = S.beats.when[E.from], t = (S.tick - t0) / SIM_HZ + (alpha || 0) * DT;
  const gy = groundInfo(ts.x, ts.z).floor;
  let x, y, z, yaw;
  const circle = tt => { const a = tt * 0.45; return [ts.x + Math.cos(a) * 9, gy + 13 + Math.sin(tt * 0.7), ts.z + Math.sin(a) * 9, -a]; };
  if (!ts.dead) {
    const dive = clamp(t / 2.5, 0, 1);                  // it came down out of the sky at the steed's head, then rose to circle
    [x, y, z, yaw] = circle(t); y += (1 - dive) * 30;
  } else {
    const td = (S.tick - (S.beats.when[E.dead] || S.tick)) / SIM_HZ + (alpha || 0) * DT;
    const [cx, cy, cz] = circle(t), k = clamp(td / 2, 0, 1), up = clamp((td - 2.6) / 6, 0, 1);
    x = lerp(cx, ts.x, k) - up * 90; y = lerp(cy, gy + 0.6, k) + up * 40; z = lerp(cz, ts.z, k) - up * 20;
    yaw = up > 0 ? -Math.PI / 2 : Math.atan2(ts.x - cx, ts.z - cz);
    if (up >= 1) return null;
  }
  return [x, y, z, yaw, ts.dead];
}
// Tsotha's end (ch. V): "the great sword ... took his head"; the eagle "seized it" and was gone into the sunset,
// and "the headless body ... staggered away after it" across the meadow. Drawn only: the wizard is simply dead in the sim.
const RISE0 = 4.8;                                     // when the headless body gets up
// where the closing scene's players are: the head (on the ground, then in the talons) and the body (lying, then walking away)
function tsothaEnd(f, td) {
  const ro = ragOffset(f), dp = deathPoint(f, 1.02), ep = eaglePos(renderAlpha);
  const head = td > 2.0 && ep ? [ep[0], ep[1] - 0.6, ep[2]] : [dp[0] + ro[0], groundInfo(dp[0] + ro[0], dp[1] + ro[1]).floor + 0.18, dp[1] + ro[1]];
  const sun = norm3(LEVEL.sun || [-1, 0.06, 0.2]), walk = Math.max(0, td - RISE0 - 1.4) * 1.1, bx = f.x + ro[0] + sun[0] * walk, bz = f.z + ro[1] + sun[2] * walk;
  return { head, body: [bx, groundInfo(bx, bz).floor + 1.0, bz], eagle: ep };
}
function drawBeheaded(f) {
  const E = LEVEL.eagle, when = S.beats && S.beats.when[E.dead];
  if (when === undefined || typeof SKINNED === 'undefined' || !SKINNED[f.cls]) return false;
  const td = (S.tick - when) / SIM_HZ + renderAlpha * DT, l = sampleLight(f.x, f.y + 1.4, f.z);
  const ro = ragOffset(f), bx = f.x + ro[0], bz = f.z + ro[1];
  // the head: where it fell, then in the eagle's talons
  const ep = eaglePos(renderAlpha), dp = deathPoint(f, 1.02);
  let hx = dp[0] + ro[0], hz = dp[1] + ro[1], hy = groundInfo(hx, hz).floor + 0.18, hyaw = f.dieYaw + 1.2, hp = 0.4;
  if (td > 2.0 && ep) { hx = ep[0]; hy = ep[1] - 0.6; hz = ep[2]; hyaw = ep[3]; hp = 0.3 + Math.sin(td * 4) * 0.15; }
  if (td <= 2.0 || ep) drawCharacter(f.cls, hx, hy, hz, hyaw, { cut: 'body', pitch: hp, unarmed: true, noShield: true }, sampleLight(hx, hy + 0.3, hz));
  // the body: lying headless, then up, and away after the eagle, arms groping
  const P = foePose(f); P.cut = 'head'; P.unarmed = true; P.noShield = true;
  const rise = smoothstep(RISE0, RISE0 + 1.4, td);
  let x = bx, z = bz, yaw = f.dieYaw;
  if (rise > 0) {
    const sun = norm3(LEVEL.sun || [-1, 0.06, 0.2]), walk = Math.max(0, td - RISE0 - 1.4) * 1.1;
    x = bx + sun[0] * walk; z = bz + sun[2] * walk; yaw = lerp(f.dieYaw, Math.atan2(sun[0], sun[2]), rise);
    const W = poseWalk(poseIdle({}, gameTime), walk * 2.6, Math.min(1, walk), true);
    Object.assign(W, { lean: 0.2, roll: Math.sin(td * 2.1) * 0.2 * rise, uxL: -1.3, uxR: -0.9, fxL: -0.3, fxR: -0.5, cut: 'head', unarmed: true, noShield: true });
    for (const k of ['pitch', 'drop', 'uxL', 'uxR', 'fxL', 'fxR', 'txL', 'txR', 'sxL', 'sxR', 'lean', 'roll']) W[k] = lerp(P[k] || 0, W[k] || 0, rise);
    if (walk > 40) return true;                           // lost to sight across the meadow
    drawCharacter(f.cls, x, groundInfo(x, z).floor, z, yaw, W, sampleLight(x, f.y + 1.4, z));
    return true;
  }
  drawCharacter(f.cls, x, f.y, z, yaw, P, l);
  return true;
}
