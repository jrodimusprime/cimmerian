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
  S.beats = { fired: new Set(), queue: [], t: {} };
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
    B.fired.add(b.id);
    (b.lines || []).forEach(([t, c], i) => B.queue.push({ at: S.tick + Math.round(i * 2.6 * SIM_HZ), t, c: c || '' }));
    if (b.sets) setFlag(b.sets);
    for (const g of b.wake || []) alertGroup(g, false);
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
      if (a.loose) Object.assign(P, { uxL: -1.5, fxL: -0.1, uxR: -1.3, fxR: -1.6, headX: -0.1 });   // bows drawn
      else Object.assign(P, { we: 1.35 });
      drawCharacter(a.id, x, y, z, a.yaw + Math.sin(k * 3.1) * 0.12, P, sampleLight(x, y + 1.5, z));
    }
  }
}
// Tsotha's fire globes: "a globe that ... burst in a sheet of flame" (ch. V)
function globeBurst(x, y, z) {
  Sfx.crush();
  for (let k = 0; k < 26; k++) particles.push({ m: 'spark', x, y: y + 0.4, z, vx: (Math.random() - 0.5) * 9, vy: Math.random() * 6, vz: (Math.random() - 0.5) * 9, life: 0.7, max: 0.7, g: 6, s: 1.2 });
  const d = Math.hypot(S.x - x, S.z - z);
  if (d < 3.2) { hurt(Math.round(34 * (1 - d / 3.4)), 'fire'); S.vx += (S.x - x) / (d || 1) * 6; S.vz += (S.z - z) / (d || 1) * 6; }
}
