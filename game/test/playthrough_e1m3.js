// Golden playthrough of e1m3, the Tunnels Below, through the CIM agent API (README §11).
const EXPECTED = { tick: 10610, hash: '798f959c' };
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
window.__heal = () => { for (const it of CIM.state.items) if (!it.taken && it.heal && CIM.state.health < 80 && Math.hypot(it.x - CIM.state.x, it.z - CIM.state.z) < 30) { __nav(it.x, it.z); __face(it.x, it.z, -0.8); CIM.step({ use: true, yaw: CIM.state.yaw, pitch: -0.8 }, 1); } return CIM.obs(); };
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
// the well: wait for it to be still, then run at the rim and leap
window.__leap = (x, zFrom, dir) => {
  const T = CIM.state.tun;
  __nav(x * C, zFrom * C, true);
  for (let i = 0; i < 900 && !(T.gt > 1.5 && T.gt < 3.2 && T.pres === 'calm'); i++) __wait(1);
  const yaw = dir > 0 ? Math.PI : 0, rim = (dir > 0 ? 17 : 18) * C;
  for (let i = 0; i < 200; i++) {
    const s = CIM.state, near = dir > 0 ? rim - s.z < 0.35 : s.z - rim < 0.35;
    const o = CIM.step({ forward: 1, run: true, jump: near && s.onGround, yaw, pitch: 0 }, 1);
    if (o.mode !== 'play' || (dir > 0 ? s.z > rim + 2.5 + 1.2 : s.z < rim - 2.5 - 1.2) && s.onGround) break;
  }
  return CIM.obs();
};
true`);
let o = await O('(CIM.load("e1m3"), CIM.step({}, 1))');
// THE WEEPING (puzzle): follow it through the forks
await O('__use(2.04, 17)');
o = await O('__route([[10, 17], [16, 17], [22, 17], [22, 10], [22, 4.2]])'); log('weeping:', brief(o));
// THE WEEPING THING (combat, flight): it comes out behind you; cut through the things it drives ahead
o = await O('__route([[27, 4], [30, 4]])');
o = await O('__fight(["driven"], 6000, 25)'); log('flight:', brief(o));
o = await O('__jumpTo(35, 4)'); o = await O('__fight(["driven"], 6000, 25)'); log('break:', brief(o));
o = await O('__route([[39, 4], [39, 12], [39, 15.4]])'); log('well:', brief(o));
// THE WELL (puzzle): leap it between its breaths; the presence takes the torch
o = await O('__leap(39, 15.4, 1)'); log('leapt:', brief(o), await ev('CIM.state.torch'));
// THE DARK (combat): driven south into the black tunnels; round to the crossing again
o = await O('__route([[41, 24]])');
o = await O('__fight(["dark"], 9000, 14)'); log('dark:', brief(o));
await O('__heal()');
o = await O('__route([[41, 27.8], [43.3, 27.8]])'); o = await O('__jumpTo(46, 27.8)'); log('gap:', brief(o));
o = await O('__fight(["dark"], 9000, 14)');
o = await O('__route([[47, 27.8], [47, 15], [44.5, 15], [41, 15.2]])');
// THE CROSSING (puzzle): the ember; go where the air comes from
o = await O('(__take("ember"), CIM.obs())'); log('ember:', brief(o), await ev('CIM.state.torch'));
o = await O('__leap(35, 15.4, 1)');
o = await O('__route([[33, 21], [28, 21], [28, 26]])'); log('out:', brief(o), await ev('CIM.state.torch'), await ev('CIM.state.tun.pres'));
// THE SIDE TUNNELS (combat)
o = await O('__route([[28, 31]])');
o = await O('__fight(["side"], 9000, 30)'); log('side:', brief(o));
await O('__heal()');
// SATHA RETURNS (puzzle): into a side tunnel, shake out the torch, keep still
o = await O('__route([[38, 31.5], [41, 31.5], [45, 31.5], [45, 34]])');
o = await O('CIM.step({ torch: true, yaw: 0, pitch: 0 }, 1)');
for (let i = 0; i < 60 && !(await ev('CIM.state.flags.satha_passed')); i++) o = await O('__wait(72)');
log('satha:', brief(o), await ev('CIM.state.torch'));
// the cage of bars, with a garden in it
o = await O('__route([[45, 31.5], [57, 31.5]])');
const fin = { tick: await ev('CIM.state.tick'), hash: await ev('CIM.hash()'), mode: await ev('mode'), deaths: await ev('CIM.state.deaths'), kills: await ev('CIM.state.kills') };
log(fin.mode === 'done' && fin.tick === EXPECTED.tick && fin.hash === EXPECTED.hash ? 'PASS ' + JSON.stringify(fin) : 'FAIL ' + JSON.stringify(fin) + ' expected ' + JSON.stringify(EXPECTED));
