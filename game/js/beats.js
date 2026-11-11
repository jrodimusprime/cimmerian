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
  S.npcTrail = [];
  S.npc = n ? { id: n.id, x: n.at[0] * CELL, z: n.at[1] * CELL, yaw: n.yaw || 0, walk: 0, mode: n.mode || 'stay', t: 0 } : null;
  for (const f of S.foes) if (f.asleep) f.state = 'sleep';
  // allies who fight (the Gundermen): simulated men, in S, marching behind the king and closing with the enemy
  S.allyMen = []; S.allyAnchor = null;
  for (const a of LEVEL.allies || []) if (a.fight) for (let k = 0; k < a.n; k++)
    S.allyMen.push({ id: a.id, k, x: (a.at[0] + (k % a.cols) * a.step) * CELL, z: (a.at[1] + Math.floor(k / a.cols) * a.step) * CELL, yaw: a.yaw, walk: 0, t: hrand(k, 3, 5, 1) * 1.4, tgt: null, mv: false, groups: a.fight });
}
function roomsOf(at) { return Array.isArray(at) ? at : [at]; }
function groupDead(g) { const m = S.foes.filter(f => f.group === g && !FOES[f.cls].meek); return m.length > 0 && m.every(f => f.dead); }   // non-combatants (meek) don't count
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
    if (b.npc && S.npc) { S.npc.mode = b.npc; S.npc.castAt = S.npc.t; }
    if (b.sound) Sfx[b.sound] && Sfx[b.sound](1);
    if (b.hurl) { const f = S.foes.find(q => q.id === b.hurl); if (f) { f.y += 2.2; f.vy = 5; f.falling = 1; f.vx = 0; f.fallTo = 0; const a = f.yaw + Math.PI; f.x += Math.sin(a) * 0; f.z -= 14; } }   // over the parapet: far out, and down
    if (b.cp) S.checkpoint = { x: b.cp[0] * CELL, z: b.cp[1] * CELL, yaw: b.cp[2] || 0 };
  }
  while (B.queue.length && B.queue[0].at <= S.tick) { const q = B.queue.shift(); log(q.t, q.c); if (q.c === 'voice') Sfx.voice(0); }
  updateSleepers();
  updateNPC();
  updateAllyMen();
}
// "they were met by the spears of the pikemen. No infantry was a match for the wild Gundermen" (ch. V):
// the pike line follows the king in ranks ten metres behind him, and any of the enemy who come within reach of it are spitted.
// Nobody singles them out (the fight is the king's), so they come to no harm.
const ALLY_COLS = 4, ALLY_GAP = 1.9, PIKE_REACH = 3.0, PIKE_PERIOD = 1.4;
function updateAllyMen() {
  const M = S.allyMen; if (!M || !M.length) return;
  const A = S.allyAnchor || (S.allyAnchor = { x: M[0].x, z: M[0].z });
  if (S.flags.press_through) { A.x = 70 * CELL; A.z = 22 * CELL; }   // the press broken, they halt and hold the field in rank: they don't trail you round the palace
  else { A.x = Math.max(A.x, S.x - 10); A.z += (S.z - A.z) * 0.02; }
  if (!S.allyFlow || S.tick % 36 === 0) { const g = groundInfo(A.x, A.z); S.allyFlow = g.idx >= 0 ? bfs(g.idx) : null; }
  for (const m of M) {
    m.t += DT; m.mv = false;
    if (!m.tgt || m.tgt.dead || S.tick % 18 === m.k % 18) {
      let best = 12, tg = null;
      for (const f of S.foes) { if (f.dead || !m.groups.includes(f.group) || f.state === 'dormant' || f.state === 'lurk' || f.state === 'sleep') continue; const d = Math.hypot(f.x - m.x, f.z - m.z); if (d < best && Math.abs(f.y - groundInfo(m.x, m.z).floor) < 1.5) { best = d; tg = f; } }
      m.tgt = tg;
    }
    let tx, tz, sp = 3.6;
    if (m.tgt) {
      const f = m.tgt, d = Math.hypot(f.x - m.x, f.z - m.z);
      m.yaw = Math.atan2(f.x - m.x, f.z - m.z);
      if (d > PIKE_REACH - 0.2) { tx = f.x; tz = f.z; sp = 4.2; }
      if (m.t >= PIKE_PERIOD) m.t -= PIKE_PERIOD;
      if (m.t >= 0.5 && m.t - DT < 0.5 && d < PIKE_REACH + 0.4) allyHit(f, 13 + (m.k % 3) * 2, m);   // the thrust lands at the end of the draw-back
    } else {
      const row = Math.floor(m.k / ALLY_COLS), col = m.k % ALLY_COLS;
      tx = A.x - row * ALLY_GAP; tz = A.z + (col - (ALLY_COLS - 1) / 2) * ALLY_GAP;
      m.t = Math.min(m.t, 0.2);
    }
    if (tx !== undefined) {
      const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz);
      if (d > 0.3) {
        let ux = dx / d, uz = dz / d;
        const st = !m.tgt && d > 6 && S.allyFlow ? flowStep({ x: m.x, z: m.z }, S.allyFlow) : null;
        if (st) { const sx = st[0] - m.x, sz = st[1] - m.z, sl = Math.hypot(sx, sz) || 1; ux = sx / sl; uz = sz / sl; }
        const step = Math.min(d, sp * DT), r = collide(m.x + ux * step, m.z + uz * step, 0.35, groundInfo(m.x, m.z).floor, m, false);
        m.walk += Math.hypot(r[0] - m.x, r[1] - m.z); m.mv = Math.hypot(r[0] - m.x, r[1] - m.z) > step * 0.3; m.x = r[0]; m.z = r[1];
        if (!m.tgt) m.yaw = Math.atan2(ux, uz);
      } else if (!m.tgt) m.yaw = Math.PI / 2;
    }
    for (const o of M) if (o !== m) { const ox = m.x - o.x, oz = m.z - o.z, od = Math.hypot(ox, oz); if (od < 0.8 && od > 1e-4) { m.x += ox / od * (0.8 - od) * 0.5; m.z += oz / od * (0.8 - od) * 0.5; } }   // shoulder to shoulder, not inside each other
  }
}
function allyHit(f, dmg, m) {
  if (f.dead) return;
  f.hp -= dmg; f.flash = 0.12; Sfx.stab && Sfx.stab();
  for (let q = 0; q < 5; q++) particles.push({ m: 'blood', x: f.x, y: f.y + 1.2, z: f.z, vx: (Math.random() - 0.5) * 2 + Math.sin(m.yaw) * 2, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 2 + Math.cos(m.yaw) * 2, life: 0.6, max: 0.6, g: 9, s: 1 });
  if (f.hp <= 0) killFoe(f, 'blade');
  else if (!['windup', 'strike', 'stagger'].includes(f.state)) { f.state = 'pain'; f.t = 0; }
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
// Pelias: once freed he follows a few paces behind, never into a pit, and keeps out of the fighting
// ("Keep them off me: I am weak yet"): any roused thing near him and he backs away from it, and comes on again once it's down.
const NPC_SHY = 7, NPC_GIVE = 1.25;
function npcThreat(n) {
  let best = null, bd = NPC_SHY;
  for (const f of S.foes) {
    if (f.dead || !f.alert || f.state === 'dormant' || f.state === 'lurk' || f.state === 'sleep' || FOES[f.cls].invulnerable) continue;
    const d = Math.hypot(f.x - n.x, f.z - n.z); if (d < bd) { bd = d; best = f; }
  }
  return best;
}
function npcMove(n, dx, dz, sp) {                         // a step along (dx, dz), stopped by walls, pits and bodies
  const l = Math.hypot(dx, dz) || 1, fl = groundInfo(n.x, n.z).floor;
  const r = collide(n.x + dx / l * sp, n.z + dz / l * sp, 0.35, fl, n, false);
  const moved = Math.hypot(r[0] - n.x, r[1] - n.z);
  n.walk += moved; n.x = r[0]; n.z = r[1]; n.moving = moved > sp * 0.3;
}
function updateNPC() {
  const n = S.npc; if (!n) return;
  n.t += DT; n.moving = false; n.shy = false;
  if (S.tick % 36 === 0) { (S.npcTrail ||= []).push([S.x, S.z]); if (S.npcTrail.length > 40) S.npcTrail.shift(); }   // the way you came, for him to follow
  if (n.mode !== 'follow') return;
  const dx = S.x - n.x, dz = S.z - n.z, d = Math.hypot(dx, dz);
  const foe = npcThreat(n);
  if (foe) {                                              // back off from it: of a ring of steps, the one that puts most ground between him and it, not straying far from you
    n.shy = true;
    const fl = groundInfo(n.x, n.z).floor;
    let bx = 0, bz = 0, bs = -1e9;
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2, px = n.x + Math.sin(a) * 1.2, pz = n.z + Math.cos(a) * 1.2;
      if (blockedCell(Math.floor(px / CELL), Math.floor(pz / CELL), fl, true)) continue;
      const sc = Math.hypot(px - foe.x, pz - foe.z) - 0.4 * Math.max(0, Math.hypot(px - S.x, pz - S.z) - 12);
      if (sc > bs) { bs = sc; bx = Math.sin(a); bz = Math.cos(a); }
    }
    if (bs > Math.hypot(n.x - foe.x, n.z - foe.z) + 0.05) npcMove(n, bx, bz, 3.6 * DT);
    n.yaw = Math.atan2(foe.x - n.x, foe.z - n.z);       // backing away, eyes on it
    return;
  }
  if (d > 30 && S.npcTrail) {                             // left far behind: he comes up the way you came, out of your sight
    const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
    for (let i = S.npcTrail.length - 1; i >= 0; i--) {
      const [tx, tz] = S.npcTrail[i], td = Math.hypot(tx - S.x, tz - S.z);
      if (td < 6) continue;
      if (((tx - S.x) * fx + (tz - S.z) * fz) / td > 0.2 && los(S.x, S.y + 1.5, S.z, tx, groundInfo(tx, tz).floor + 1.5, tz)) continue;
      n.x = tx; n.z = tz; break;
    }
    return;
  }
  if (d < NPC_GIVE) { npcMove(n, -dx, -dz, 3 * DT); n.yaw = Math.atan2(dx, dz); return; }   // you've backed into him: he gives way
  if (d > 2.6) {
    const sp = Math.min(d - 2.4, (d > 8 ? 6.5 : 4.2) * DT), st = flowToward(n.x, n.z, S.x, S.z);
    const tx = st ? st[0] - n.x : dx, tz = st ? st[1] - n.z : dz;
    npcMove(n, tx, tz, sp); n.yaw = Math.atan2(tx, tz);
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
  if (n.moving) poseWalk(P, n.walk * 3.4, 0.8);
  if (n.shy) Object.assign(P, { lean: -0.12, headX: 0.15, uxL: -0.7, fxL: -1.7, uzL: 0.15 });   // an arm up across him, wary
  if (n.mode === 'bound') Object.assign(P, { uxL: -2.4, uxR: -2.4, uzL: 0.5, uzR: 0.5, headX: 0.5, drop: -0.1, lean: 0.15 });   // held up in the vine's grip
  if (n.mode === 'stand') Object.assign(P, { headX: 0.35, lean: 0.12, uxL: -0.35, uxR: -0.4, fxL: -1.3, fxR: -1.2, uzL: -0.25, uzR: -0.25 });   // head bowed, chafing the wrists the vine held
  if (n.mode === 'cast') {                                // one hand out to what he speaks to, the other low
    const k = smoothstep(0, 0.8, n.t - (n.castAt || 0));
    Object.assign(P, { uxR: -1.45 * k, fxR: -0.15, uzR: 0.1, headX: -0.1 });
  }
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
      if (a.fight) continue;                             // these march and fight: drawn from S.allyMen below
      drawCharacter(a.id, x, y, z, a.yaw + Math.sin(k * 3.1) * 0.12, P, sampleLight(x, y + 1.5, z));
    }
  }
  for (const m of S.allyMen || []) {
    if (Math.hypot(m.x - S.x, m.z - S.z) > 120) continue;
    const y = groundInfo(m.x, m.z).floor, P = poseIdle({}, gameTime * 0.8 + m.k);
    if (m.mv) poseWalk(P, m.walk * 3.4, 0.8, false);
    if (m.tgt) {                                         // pike levelled; draw back, then drive it home
      const u = m.t;
      if (u < 0.5) { const k = smoothstep(0, 0.5, u); Object.assign(P, { uxR: lerp(-0.6, 0.35, k), fxR: lerp(-1.3, -1.9, k), twist: -0.35 * k, lean: -0.1 * k, we: 0.05 }); }
      else if (u < 0.75) { const k = smoothstep(0.5, 0.62, u); Object.assign(P, { uxR: lerp(0.35, -1.45, k), fxR: lerp(-1.9, -0.05, k), twist: lerp(-0.35, 0.2, k), lean: 0.3 * k, we: 0.0 }); }
      else { const k = smoothstep(0.75, 1.4, u); Object.assign(P, { uxR: lerp(-1.45, -0.6, k), fxR: lerp(-0.05, -1.3, k), lean: 0.3 * (1 - k), we: 0.05 }); }
    } else Object.assign(P, { we: 1.35 });
    drawCharacter(m.id, m.x, y, m.z, m.yaw, P, sampleLight(m.x, y + 1.5, m.z));
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
