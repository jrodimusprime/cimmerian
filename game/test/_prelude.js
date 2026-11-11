await ev(`
const C = 2.5;
// whatever the bot is doing (fighting, walking, jumping), it eats or drinks from its satchel when it's low
{ const st = CIM.step.bind(CIM); CIM.step = (a = {}, n = 1) => { const s = CIM.state; if (s && s.health > 0 && s.health < 55 && s.pouch.length && !a.respawn) a = Object.assign({}, a, { drink: true });
  // fallen into a stake-pit: jump out, the way it was going
  if (s && s.onGround && !a.respawn) { const i = cellIdx(Math.floor(s.x / C), Math.floor(s.z / C)); if (i >= 0 && LV.spikes[i]) a = Object.assign({}, a, { jump: true, forward: 1, run: true }); }
  // Yothga's wave of hate rolling up: jump it as it passes
  if (s && s.onGround && !a.respawn && s.hate && s.hate.some(w => { const d = Math.hypot(s.x - w.x, s.z - w.z); return d > w.r && d - w.r < 0.55; })) a = Object.assign({}, a, { jump: true });
  return st(a, n); }; }
window.__face = (x, z, pitch = 0) => { const s = CIM.state; return CIM.step({ yaw: Math.atan2(-(x - s.x), -(z - s.z)), pitch }, 1); };
window.__go = (x, z, run = true, maxTicks = 3000) => {
  for (let i = 0; i < maxTicks; i++) {
    const s = CIM.state, dx = x - s.x, dz = z - s.z;
    if (Math.hypot(dx, dz) < 0.4) break;
    const o = CIM.step({ forward: 1, run, yaw: Math.atan2(-dx, -dz), pitch: 0 }, 1);
    if (o.mode !== 'play') break;
  }
  return CIM.obs();
};
// the level's boss, roused (on his feet and coming), within r metres
window.__boss = (r) => CIM.state.foes.find(q => FOES[q.cls].boss && !q.dead && !['dormant', 'sleep', 'idle', 'home', 'lurk'].includes(q.state) && Math.hypot(q.x - CIM.state.x, q.z - CIM.state.z) < r);
// firm ground all round (not a one-cell bridge over the drop): somewhere to stand and fight
window.__firm = (s) => { const gx = Math.floor(s.x / C), gz = Math.floor(s.z / C); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = cellIdx(gx + dx, gz + dz); if (i < 0 || LV.kind[i] !== 1 || Math.abs(LV.floor[i] - s.y) > 1.3) return false; } return __boss(8); };
// navigate with the game's own flow-field pathfinder (combat.js bfs)
window.__nav = (x, z, run = true, maxTicks = 4000) => {
  const tgt = cellIdx(Math.floor(x / C), Math.floor(z / C)), field = bfs(tgt);
  for (let i = 0; i < maxTicks; i++) {
    const s = CIM.state;
    if (Math.hypot(x - s.x, z - s.z) < 0.4 || CIM.obs().mode !== 'play') break;
    { const b = !window.__inFight && window.__fight && __boss(8) && __firm(s); if (b) { __fight([b.group], 9000, 14); continue; } }   // he comes at you: turn and face him, whatever you were about
    const here = cellIdx(Math.floor(s.x / C), Math.floor(s.z / C));
    const step = here === tgt ? null : flowStep({ x: s.x, z: s.z }, field);
    const [dx, dz] = step ? [step[0] - s.x, step[1] - s.z] : [x - s.x, z - s.z];
    CIM.step({ forward: 1, run, yaw: Math.atan2(-dx, -dz), pitch: 0 }, 1);
  }
  return CIM.obs();
};
window.__route = (pts, run = true) => { for (const [x, z] of pts) { __nav(x * C, z * C, run); if (CIM.obs().mode !== 'play') break; } return CIM.obs(); };
window.__wait = (ticks) => CIM.step({ yaw: CIM.state.yaw, pitch: CIM.state.pitch }, ticks);
window.__waitPhase = (lo, hi) => { for (let i = 0; i < 4000; i++) { const p = CIM.obs().satha.phase; if (p >= lo && p <= hi) break; __wait(1); } return CIM.obs(); };
window.__item = k => CIM.state.items.find(i => i.kind === k && !i.taken);
window.__take = (k) => { const it = __item(k); if (!it) return false; __nav(it.x, it.z, true); __go(it.x - 0.9, it.z, true); __face(it.x, it.z, -0.7); CIM.step({ use: true, yaw: CIM.state.yaw, pitch: -0.7 }, 1); return true; };
window.__use = (x, z, pitch = 0) => { __face(x * C, z * C, pitch); return CIM.step({ use: true, yaw: CIM.state.yaw, pitch }, 1); };
// fight: close with the nearest foe that knows we're here; parry a shield-man's blow then strike, step back from other wound-up blows
// maxSteps: ignore a foe whose path round is longer than this many cells (close as the crow flies, a long way on foot)
window.__fight = (groups, maxTicks = 6000, radius = 30, maxSteps = 1e9) => {
  window.__inFight = true; try { return __fight0(groups, maxTicks, radius, maxSteps); } finally { window.__inFight = false; }
};
window.__fight0 = (groups, maxTicks, radius, maxSteps) => {
  let blocked = 0, lastHits = -1, reachable = null, grace = 72;
  for (let i = 0; i < maxTicks; i++) {
    const s = CIM.state;
    if (s.health <= 0 || CIM.obs().mode === 'dead') { CIM.step({ respawn: true }, 1); reachable = null; continue; }
    if (s.health < 60 && s.pouch.length) { CIM.step({ drink: true, yaw: s.yaw, pitch: s.pitch }, 1); continue; }   // low: eat or drink from the satchel
    const shut = s.grille.open < 0.8 && s.x < GRILLE_X;
    if (!reachable || i % 36 === 0) reachable = bfs(cellIdx(Math.floor(s.x / C), Math.floor(s.z / C)));
    const live = s.foes.filter(f => !f.dead && !FOES[f.cls].meek && f.state !== "dormant" && f.state !== "lurk" && groups.includes(f.group) && ((reachable[cellIdx(Math.floor(f.x / C), Math.floor(f.z / C))] >= 0 && reachable[cellIdx(Math.floor(f.x / C), Math.floor(f.z / C))] <= maxSteps) || Math.hypot(f.x - s.x, f.z - s.z) < 2.5) && Math.hypot(f.x - s.x, f.z - s.z) < radius && !(shut && f.cls === 'archer' && f.x > GRILLE_X));
    { const b = __boss(10); if (b && !live.includes(b)) live.push(b); }   // the boss is always in the fight once he's roused and near
    if (!live.length) {   // a group held back (dormant) may be about to come in: give the beat a moment before calling it done
      if (grace-- > 0 && s.foes.some(q => !q.dead && groups.includes(q.group) && q.state === 'dormant')) { CIM.step({ yaw: s.yaw, pitch: s.pitch }, 1); continue; }
      break;
    }
    live.sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z));
    // the level's boss close by: face him, always, and fight him; the rest are only parried
    const boss = __boss(10);
    const f = boss || live[0], d = Math.hypot(f.x - s.x, f.z - s.z), yaw = Math.atan2(-(f.x - s.x), -(f.z - s.z));
    // a spear drawn back to throw: hold the aim on him until it leaves the hand
    if (s.throwKind === 'spear' && !s.throwFired) { CIM.step({ yaw, pitch: Math.atan2(f.y + 1.0 - s.y - 1.5, d) + d * 0.012 }, 1); continue; }
    const shielded = !!FOES[f.cls].block;
    const reach = s.weapon === 'sword' ? 2.6 : 2.0;
    let act = { yaw, pitch: Math.max(-0.4, Math.min(0.3, Math.atan2(f.y - s.y, d))) };
    // a blow about to land, from anyone: turn to it and parry (not with a spear in hand: right-click throws it)
    const blow = s.weapon !== 'spear' && s.parryCool <= 0 && s.swing <= 0 && s.foes.find(q => !q.dead && q.state === 'windup' && !q.throwing && !FOES[q.cls].ranged && !FOES[q.cls].invulnerable &&
      Math.hypot(q.x - s.x, q.z - s.z) < foeReach(q) + 0.7 && FOES[q.cls].windup * (q.combo ? 0.6 : 1) - q.t < 0.28 && FOES[q.cls].windup * (q.combo ? 0.6 : 1) - q.t > 0.04);
    const archer = FOES[f.cls].ranged && !FOES[f.cls].boss, armed = s.weapon === 'spear' || (s.spears && s.spears.length);
    // low, and food or drink lying close by (a fallen man's ration): go and take it, fighting can wait a moment
    const food = !boss && s.health < 55 && s.items.filter(it => !it.taken && it.heal && Math.abs((it.y || 0) - s.y) < 1.2 && Math.hypot(it.x - s.x, it.z - s.z) < 7 && los(s.x, s.y + 1, s.z, it.x, (it.y || 0) + 0.5, it.z)).sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0];
    if (blow) {
      const by = Math.atan2(-(blow.x - s.x), -(blow.z - s.z)), off = Math.abs(Math.atan2(Math.sin(by - yaw), Math.cos(by - yaw)));
      if (!boss || off < 1.3) { act.yaw = by; act.parry = true; }   // facing him still, near enough, to turn the blow
      else { act.forward = -1; act.side = Math.sin(by - yaw) > 0 ? -1 : 1; act.run = true; }   // from behind his shoulder: give ground, keep him and them in front
    }
    else if (food) { act.yaw = Math.atan2(-(food.x - s.x), -(food.z - s.z)); act.forward = 1; act.run = true; }
    else if (archer && armed && d > 5 && d < 22 && s.throwT <= 0 && s.swing <= 0 && los(s.x, s.y + 1.5, s.z, f.x, f.y + 1.2, f.z)) {   // an archer who keeps his distance: throw a spear at him
      if (s.weapon !== 'spear') act.weapon = 'spear'; else { act.throwSpear = true; act.pitch = Math.atan2(f.y + 1.0 - s.y - 1.5, d) + d * 0.012; }
    }
    else if (d > reach) {
      act.forward = 1; act.run = true;
      // a bank of stakes on the straight line: go round by the path, don't run onto them
      let staked = false; for (let k = 1, n = Math.ceil(d / 0.5); k < n && !staked; k++) { const i = cellIdx(Math.floor((s.x + (f.x - s.x) * k / n) / C), Math.floor((s.z + (f.z - s.z) * k / n) / C)); staked = i >= 0 && (LV.flags[i] & F_STAKE); }
      if (staked || !los(s.x, s.y + 1.2, s.z, f.x, f.y + 1.2, f.z)) {
        const st = flowStep({ x: s.x, z: s.z }, bfs(cellIdx(Math.floor(f.x / C), Math.floor(f.z / C))));
        if (st) act.yaw = Math.atan2(-(st[0] - s.x), -(st[1] - s.z));
        else if (f.x > GRILLE_X && s.x < GRILLE_X) { const bx = GRILLE_X - 0.5, bz = Math.max(33.2, Math.min(36.8, f.z)); act.yaw = Math.atan2(-(bx - s.x), -(bz - s.z)); }
      }
    }
    else if (f.state === 'windup' && f.t > 0.18 && f.cls !== 'archer' && shielded && s.parryCool <= 0) act.parry = true;   // turn his blow aside, then cut
    else if (f.state === 'windup' && f.t > 0.18 && f.cls !== 'archer') act.forward = -1;        // dodge the telegraphed blow
    else if (s.swing <= 0) {
      if (shielded && f.state === 'block') act.forward = -1;                                   // wait out his guard
      else act.attack = true;
    }
    if (f.state === 'block') blocked++;
    if (window.__dbg && i % 600 === 0) console.log('[fight]', i, (s.x / C).toFixed(1), (s.z / C).toFixed(1), 'hp', Math.round(s.health), live.map(q => q.id + ':' + q.state + '@' + (q.x / C).toFixed(1) + ',' + (q.z / C).toFixed(1)).join(' '));
    // pressed against a bank of stakes (knocked back onto it): step off it
    { const gx = Math.floor(s.x / C), gz = Math.floor(s.z / C); let ax = 0, az = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const i = cellIdx(gx + dx, gz + dz); if (i < 0 || !(LV.flags[i] & F_STAKE)) continue;
        const e = dx ? (dx > 0 ? (gx + 1) * C - s.x : s.x - gx * C) : (dz > 0 ? (gz + 1) * C - s.z : s.z - gz * C);
        if (e < 0.8) { ax -= dx; az -= dz; }
      }
      if (ax || az) { const yw = act.yaw ?? s.yaw, fw = -ax * Math.sin(yw) - az * Math.cos(yw), sd = ax * Math.cos(yw) - az * Math.sin(yw);
        act.forward = Math.abs(fw) > 0.3 ? Math.sign(fw) : 0; act.side = Math.abs(sd) > 0.3 ? Math.sign(sd) : 0; } }
    // an arrow or a thrown spear about to arrive: sidestep out of its line
    for (const p of s.proj) {
      if (p.type !== 'arrow' && p.type !== 'jav' && p.type !== 'seed') continue;
      const rx = s.x - p.x, rz = s.z - p.z, v2 = p.vx * p.vx + p.vz * p.vz, t = (rx * p.vx + rz * p.vz) / (v2 || 1);
      if (t <= 0 || t > 0.6) continue;
      const mx = rx - p.vx * t, mz = rz - p.vz * t;
      if (Math.hypot(mx, mz) > 0.9) continue;
      const yw = act.yaw ?? s.yaw;
      act.side = (mx * Math.cos(yw) - mz * Math.sin(yw)) >= 0 ? 1 : -1; act.run = true; break;
    }
    CIM.step(act, 1);
  }
  return CIM.obs();
};
window.__heal = () => { for (const it of CIM.state.items) if (!it.taken && it.heal && (CIM.state.health < 80 || CIM.state.pouch.length < 4) && Math.hypot(it.x - CIM.state.x, it.z - CIM.state.z) < 30) { __nav(it.x, it.z); __face(it.x, it.z, -0.8); CIM.step({ use: true, yaw: CIM.state.yaw, pitch: -0.8 }, 1); } return CIM.obs(); };
// run at (x, z), leaping any gap and jumping up any ledge on the way
window.__jumpTo = (x, z, maxTicks = 400) => {
  for (let i = 0; i < 2400 && CIM.state.daze > 0 && CIM.obs().mode === 'play'; i++) {   // dazed by a bite: no jump until it passes; fight off whatever's biting meanwhile
    const s = CIM.state, near = s.foes.filter(q => !q.dead && !FOES[q.cls].meek && !['dormant', 'lurk', 'sleep', 'idle', 'home'].includes(q.state) && Math.hypot(q.x - s.x, q.z - s.z) < 3);
    if (near.length && window.__fight) __fight([...new Set(near.map(q => q.group))], 900, 3); else CIM.step({ yaw: s.yaw, pitch: 0 }, 1);   // hold your ground: only what's on you
  }
  x *= C; z *= C;
  for (let i = 0; i < maxTicks; i++) {
    const s = CIM.state, dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz);
    if (CIM.obs().mode !== 'play' || (d < 0.5 && s.onGround)) break;
    const g = groundInfo(s.x + dx / d * 0.6, s.z + dz / d * 0.6);
    const jump = s.onGround && ((g.kind === 2 && g.floor < s.y - 3) || g.floor > s.y + 0.6);
    CIM.step({ forward: 1, run: true, jump, yaw: Math.atan2(-dx, -dz), pitch: 0 }, 1);
  }
  return CIM.obs();
};
true`);
const O = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const brief = o => `t${o.tick} ${o.mode} room=${o.room} hp=${Math.round(o.health)} kills=${o.kills} flags=${Object.entries(o.flags).filter(([, v]) => v).map(([k]) => k).join(',')}`;
// fight everything awake within reach of here (any group)
await ev(`window.__clear = (radius = 18, maxTicks = 6000) => __fight([...new Set(CIM.state.foes.filter(f => !f.dead && Math.hypot(f.x - CIM.state.x, f.z - CIM.state.z) < radius).map(f => f.group))], maxTicks, radius); true`);
const finish = async EXPECTED => { const fin = { tick: await ev('CIM.state.tick'), hash: await ev('CIM.hash()'), mode: await ev('mode'), deaths: await ev('CIM.state.deaths'), kills: await ev('CIM.state.kills') };
  log(fin.mode === 'done' && fin.tick === EXPECTED.tick && fin.hash === EXPECTED.hash ? 'PASS ' + JSON.stringify(fin) : 'FAIL ' + JSON.stringify(fin) + ' expected ' + JSON.stringify(EXPECTED)); };
await ev(`window.__heal = (r = 26, steps = 16) => { if (__boss(14)) return CIM.obs();   // never turn your back on him for bread
  const reach = bfs(cellIdx(Math.floor(CIM.state.x / C), Math.floor(CIM.state.z / C))); for (const it of CIM.state.items) if (!it.taken && it.heal && (CIM.state.health < 85 || CIM.state.pouch.length < 4) && Math.hypot(it.x - CIM.state.x, it.z - CIM.state.z) < r && reach[cellIdx(Math.floor(it.x / C), Math.floor(it.z / C))] >= 0 && reach[cellIdx(Math.floor(it.x / C), Math.floor(it.z / C))] <= steps && Math.abs((it.y || 0) - CIM.state.y) < 2.5) { __nav(it.x, it.z); __face(it.x, it.z, -0.8); CIM.step({ use: true, yaw: CIM.state.yaw, pitch: -0.8 }, 1); } return CIM.obs(); }; true`);
