// Golden playthrough of e1m2, The Pits, through the CIM agent API (README §11).
// It plays the level in the book's order, using only player inputs.
const EXPECTED = { tick: 9218, hash: '151a5243' };
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
    if (s.health < 55 && s.pouch.length) { CIM.step({ drink: true, yaw: s.yaw, pitch: s.pitch }, 1); continue; }   // low: eat or drink from the satchel
    const shut = s.grille.open < 0.8 && s.x < GRILLE_X;
    if (!reachable || i % 36 === 0) reachable = bfs(cellIdx(Math.floor(s.x / C), Math.floor(s.z / C)));
    const live = s.foes.filter(f => !f.dead && f.state !== "dormant" && groups.includes(f.group) && (reachable[cellIdx(Math.floor(f.x / C), Math.floor(f.z / C))] >= 0 || Math.hypot(f.x - s.x, f.z - s.z) < 2.5) && Math.hypot(f.x - s.x, f.z - s.z) < radius && !(shut && f.cls === 'archer' && f.x > GRILLE_X));
    if (!live.length) break;
    live.sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z));
    const f = live[0], d = Math.hypot(f.x - s.x, f.z - s.z), yaw = Math.atan2(-(f.x - s.x), -(f.z - s.z));
    const shielded = !!FOES[f.cls].block;
    const reach = s.weapon === 'sword' ? 2.6 : 2.0;
    let act = { yaw, pitch: Math.max(-0.4, Math.min(0.3, Math.atan2(f.y - s.y, d))) };
    // a blow about to land, from anyone: turn to it and parry (not with a spear in hand: right-click throws it)
    const blow = s.weapon !== 'spear' && s.parryCool <= 0 && s.swing <= 0 && s.foes.find(q => !q.dead && q.state === 'windup' && !q.throwing && !FOES[q.cls].ranged && !FOES[q.cls].invulnerable &&
      Math.hypot(q.x - s.x, q.z - s.z) < foeReach(q) + 0.7 && FOES[q.cls].windup * (q.combo ? 0.6 : 1) - q.t < 0.28 && FOES[q.cls].windup * (q.combo ? 0.6 : 1) - q.t > 0.04);
    // low, and food or drink lying close by (a fallen man's ration): go and take it, fighting can wait a moment
    const food = s.health < 55 && s.items.filter(it => !it.taken && it.heal && Math.abs((it.y || 0) - s.y) < 1.2 && Math.hypot(it.x - s.x, it.z - s.z) < 7 && los(s.x, s.y + 1, s.z, it.x, (it.y || 0) + 0.5, it.z)).sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0];
    if (blow) { act.yaw = Math.atan2(-(blow.x - s.x), -(blow.z - s.z)); act.parry = true; }
    else if (food) { act.yaw = Math.atan2(-(food.x - s.x), -(food.z - s.z)); act.forward = 1; act.run = true; }
    else if (d > reach) {
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
    // an arrow or a thrown spear about to arrive: sidestep out of its line
    for (const p of s.proj) {
      if (p.type !== 'arrow' && p.type !== 'jav') continue;
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
const brief = o => `t${o.tick} ${o.mode} room=${o.room} hp=${Math.round(o.health)} wep=${o.weapon} kills=${o.kills} satha=${typeof o.satha.phase === 'number' ? o.satha.phase.toFixed(1) : o.satha.phase} flags=${Object.entries(o.flags).filter(([, v]) => v).map(([k]) => k).join(',')}`;
let o = await O('(CIM.load("e1m2"), CIM.step({}, 1))');
// THE VAULT (puzzle): lie still while Satha passes; the black; the keys at your feet
for (let i = 0; i < 120 && !o.flags.keys_down; i++) o = await O('__wait(36)');
log('keys down:', brief(o));
for (let i = 0; i < 60 && await ev('!!(CIM.state.satha.pts && inVault(CIM.state.satha.pts[CIM.state.satha.pts.length - 1].x, CIM.state.satha.pts[CIM.state.satha.pts.length - 1].z) || (CIM.state.satha.pts && inVault(CIM.state.satha.pts[0].x, CIM.state.satha.pts[0].z)))'); i++) o = await O('__wait(24)');
o = await O('(() => { const k = __item("cellkey"); __face(k.x, k.z, -0.8); CIM.step({ use: true, yaw: CIM.state.yaw, pitch: -0.8 }, 2); CIM.step({ use: true, yaw: CIM.state.yaw, pitch: -0.8 }, 2); return CIM.obs(); })()');
log('free:', brief(o));
o = await O('(__take("sword"), CIM.obs())'); log('sword:', brief(o));
// THE GRILLE (combat): Shukeli slams it; strike through the bars
await O('__go(18.75, 21.0, true)');
for (let i = 0; i < 40 && o.shukeli !== 'gloat'; i++) o = await O('__wait(12)');
await O('__face(CIM.state.shukeli.x, CIM.state.shukeli.z, 0.1)');
o = await O('CIM.step({attack: true, yaw: CIM.state.yaw, pitch: 0.1}, 40)'); log('shukeli:', brief(o));
await O('__go(16.6, 23.4, false)'); o = await O('__use(6.12, 9.4, 0.6)'); log('torch:', brief(o));
// THE MAIN CORRIDOR (puzzle): out through the arch between Satha's passes
o = await O('__waitPhase(19, 20)');
await O('__route([[7.5, 12.5], [7.5, 14], [26.5, 14.1], [26.5, 15.8]])');
// THE GNAWED TUNNELS (combat)
o = await O('__fight(["post"], 9000, 30)'); log('post:', brief(o));
await O('__heal()');
// THE CORRIDOR EAST (puzzle)
await O('__route([[26.5, 16]])'); o = await O('__waitPhase(18, 19)');
await O('__route([[26.5, 14], [33.6, 14.2], [36, 14]])');
// THE OLD VAULTS (combat)
o = await O('__fight(["vaults"], 9000, 30)'); log('vaults:', brief(o));
await O('__heal()');
// THE PITTED WAY (agility): leap the first pit, hop the stone across the second, leap the third
o = await O('__route([[45.5, 14], [52.5, 14], [53.4, 14]])');
o = await O('__jumpTo(55.5, 14)');
o = await O('__fight(["pits"], 3000, 20)'); log('pits:', brief(o));
o = await O('(__nav(55.5 * C, 11.5 * C), __jumpTo(59.5, 11.5))'); log('stone:', brief(o));
o = await O('(__nav(59.5 * C, 14 * C), __jumpTo(62, 14))');
// THE BONE PIT (combat), then the weeping tunnel
o = await O('__fight(["bonepit"], 9000, 20)'); log('bonepit:', brief(o));
o = await O('__route([[66, 14], [69.5, 14]])'); log('end:', brief(o));   // no heal detour: it wandered back over pit 3
const fin = { tick: await ev('CIM.state.tick'), hash: await ev('CIM.hash()'), mode: await ev('mode'), deaths: await ev('CIM.state.deaths'), kills: await ev('CIM.state.kills') };
log(fin.mode === 'done' && fin.tick === EXPECTED.tick && fin.hash === EXPECTED.hash ? 'PASS ' + JSON.stringify(fin) : 'FAIL ' + JSON.stringify(fin) + ' expected ' + JSON.stringify(EXPECTED));
