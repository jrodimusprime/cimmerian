// Golden playthrough of e1m1, the Plain of Shamu, through the CIM agent API (README §11).
const EXPECTED = { tick: 11707, hash: '33030d53' };
await ev(`
const C = 2.5;
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
// navigate with the game's own flow-field pathfinder (combat.js bfs)
window.__nav = (x, z, run = true, maxTicks = 4000) => {
  const tgt = cellIdx(Math.floor(x / C), Math.floor(z / C)), field = bfs(tgt);
  for (let i = 0; i < maxTicks; i++) {
    const s = CIM.state;
    if (Math.hypot(x - s.x, z - s.z) < 0.4 || CIM.obs().mode !== 'play') break;
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
window.__fight = (groups, maxTicks = 6000, radius = 30) => {
  let blocked = 0, lastHits = -1, reachable = null;
  for (let i = 0; i < maxTicks; i++) {
    const s = CIM.state;
    if (s.health <= 0 || CIM.obs().mode === 'dead') { CIM.step({ respawn: true }, 1); reachable = null; continue; }
    const shut = s.grille.open < 0.8 && s.x < GRILLE_X;
    if (!reachable || i % 36 === 0) reachable = bfs(cellIdx(Math.floor(s.x / C), Math.floor(s.z / C)));
    const live = s.foes.filter(f => !f.dead && groups.includes(f.group) && (reachable[cellIdx(Math.floor(f.x / C), Math.floor(f.z / C))] >= 0 || Math.hypot(f.x - s.x, f.z - s.z) < 2.5) && Math.hypot(f.x - s.x, f.z - s.z) < radius && !(shut && f.cls === 'archer' && f.x > GRILLE_X));
    if (!live.length) break;
    live.sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z));
    const f = live[0], d = Math.hypot(f.x - s.x, f.z - s.z), yaw = Math.atan2(-(f.x - s.x), -(f.z - s.z));
    const shielded = !!FOES[f.cls].block;
    const reach = s.weapon === 'sword' ? 2.6 : 2.0;
    let act = { yaw, pitch: Math.max(-0.4, Math.min(0.3, Math.atan2(f.y - s.y, d))) };
    if (d > reach) {
      act.forward = 1; act.run = true;
      if (!los(s.x, s.y + 1.2, s.z, f.x, f.y + 1.2, f.z)) {
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
    CIM.step(act, 1);
  }
  return CIM.obs();
};
window.__heal = (maxX = 1e9) => { for (const it of CIM.state.items) if (!it.taken && it.heal && it.x < maxX * C && CIM.state.health < 80 && Math.hypot(it.x - CIM.state.x, it.z - CIM.state.z) < 30) { __nav(it.x, it.z); __face(it.x, it.z, -0.8); CIM.step({ use: true, yaw: CIM.state.yaw, pitch: -0.8 }, 1); } return CIM.obs(); };
// run at (x, z), leaping any gap and jumping up any ledge on the way
window.__jumpTo = (x, z, maxTicks = 400) => {
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
await ev(`
// the arrow ground: wait for a volley to land, then run to the next dead horse
window.__dash = (x, z) => {
  const M = CIM.state.shamu;
  for (let i = 0; i < 800 && !(M.vt > 0.05 && M.vt < 0.6); i++) __wait(1);
  return __nav(x * C, z * C, true);
};
// the riders' ground: wait for lane i to stand empty, then cross it
window.__lane = (i, x, z) => {
  const M = CIM.state.shamu;
  for (let k = 0; k < 1500 && M.hoof[i] >= 0; k++) __wait(1);
  return __nav(x * C, z * C, true);
};
true`);
let o = await O('(CIM.load("e1m1"), CIM.step({}, 1))');
// THE BROKEN CHARGE (action)
o = await O('__fight(["charge"], 12000, 70)'); log('charge:', brief(o));
await O('__heal(33)');
// THE GULLY OF DEAD (agility): drop into the ditch, jump the far bank
await O('__route([[32, 31]])'); o = await O('__jumpTo(38.6, 31)'); log('gully:', brief(o));
// THE ARROW GROUND (puzzle): dead horse to dead horse between volleys
for (const [x, z] of [[38.1, 34], [44.6, 28], [50.1, 33], [54.1, 27], [58.1, 33]]) o = await O(`__dash(${x}, ${z})`);
log('arrows:', brief(o));
// THE SHEMITE LINE (action)
await O('__route([[60.4, 31]])');
o = await O('__fight(["line"], 12000, 50)'); log('line:', brief(o));
await O('__heal(69)');
// THE RIDERLESS HORSES (puzzle): cross the three lanes between charges
await O('__route([[70.2, 31]])');
for (const [i, x] of [[0, 73.75], [1, 77.25], [2, 81.2]]) { o = await O(`__lane(${i}, ${x}, 31)`); log(' lane', i, brief(o)); }
// THE HEAP OF DEAD (action): two waves, then the kings and the wizard
await O('__heal()');
await O('__route([[88, 31]])');
o = await O('__fight(["heap1", "heap2", "heap3"], 15000, 60)'); log('heap:', brief(o));
o = await O('__fight(["heap1", "heap2", "heap3"], 15000, 60)');
for (let i = 0; i < 60 && await ev('CIM.state.shamu.tsotha.state') !== 'offer'; i++) await O('__wait(72)');
const ts = await O('[CIM.state.shamu.tsotha.x, CIM.state.shamu.tsotha.z]');
await O(`__face(${ts[0]}, ${ts[1]}, 0.1)`);
o = await O('CIM.step({ attack: true, yaw: CIM.state.yaw, pitch: 0.1 }, 1)');
for (let i = 0; i < 20 && await ev('mode') === 'play'; i++) await O('__wait(72)');
const fin = { tick: await ev('CIM.state.tick'), hash: await ev('CIM.hash()'), mode: await ev('mode'), deaths: await ev('CIM.state.deaths'), kills: await ev('CIM.state.kills') };
log(fin.mode === 'done' && fin.tick === EXPECTED.tick && fin.hash === EXPECTED.hash ? 'PASS ' + JSON.stringify(fin) : 'FAIL ' + JSON.stringify(fin) + ' expected ' + JSON.stringify(EXPECTED));
