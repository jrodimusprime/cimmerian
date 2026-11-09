// Golden playthrough of e1m2 through the CIM agent API (README §11).
// It plays the whole level, fights included, using only player inputs.
// The final state hash must match EXPECTED on every run.
const EXPECTED = { tick: 14470, hash: '0c763bea' };
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
// fight: close with the nearest foe that knows we're here; kick shields, strike, step back from a wound-up blow
window.__fight = (groups, maxTicks = 6000, radius = 30) => {
  let blocked = 0, lastHits = -1;
  for (let i = 0; i < maxTicks; i++) {
    const s = CIM.state;
    if (s.health <= 0 || CIM.obs().mode === 'dead') { CIM.step({ respawn: true }, 1); continue; }
    const shut = s.grille.open < 0.8 && s.x < GRILLE_X;
    const live = s.foes.filter(f => !f.dead && groups.includes(f.group) && Math.hypot(f.x - s.x, f.z - s.z) < radius && !(shut && f.cls === 'archer' && f.x > GRILLE_X));
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
    else if (f.state === 'windup' && f.t > 0.18 && f.cls !== 'archer') act.forward = -1;        // dodge the telegraphed blow
    else if (s.swing <= 0 && s.kickT <= 0) {
      if (shielded && (f.state === 'block' || blocked > 0) && f.state !== 'stagger') { act.kick = true; blocked = 0; }
      else act.attack = true;
    }
    if (f.state === 'block') blocked++;
    if (window.__dbg && i % 600 === 0) console.log('[fight]', i, (s.x / C).toFixed(1), (s.z / C).toFixed(1), 'hp', Math.round(s.health), live.map(q => q.id + ':' + q.state + '@' + (q.x / C).toFixed(1) + ',' + (q.z / C).toFixed(1)).join(' '));
    CIM.step(act, 1);
  }
  return CIM.obs();
};
window.__heal = () => { for (const it of CIM.state.items) if (!it.taken && it.heal && CIM.state.health < 80 && Math.hypot(it.x - CIM.state.x, it.z - CIM.state.z) < 30) { __nav(it.x, it.z); __face(it.x, it.z, -0.8); CIM.step({ use: true, yaw: CIM.state.yaw, pitch: -0.8 }, 1); } return CIM.obs(); };
true`);
const O = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const brief = o => `t${o.tick} ${o.mode} room=${o.room} hp=${Math.round(o.health)} wep=${o.weapon} kills=${o.kills} satha=${typeof o.satha.phase === 'number' ? o.satha.phase.toFixed(1) : o.satha.phase} flags=${Object.entries(o.flags).filter(([, v]) => v).map(([k]) => k).join(',')}`;
let o = await O('CIM.step({}, 1)');
// THE CELL (puzzle)
await O('__go(16.0, 23.0, false)'); await O('__use(15.1 / 2.5, 23.0 / 2.5)');
await O('__go(17.5, 21.6, false)'); o = await O('__use(7, 8.08, -0.3)'); log('free:', brief(o));
await O('__go(22.5, 22.5, false)'); o = await O('__wait(1100)'); log('giant:', brief(o), await ev('CIM.state.giant.state'));
// THE HALL (timing): wait for Satha to clear, take the dagger; the scout comes
o = await O('__waitPhase(19, 20)');
o = await O('(__take("cellkey"), CIM.obs())'); log('keys:', brief(o));
await O('__go(18.75, 28.4, false)'); await O('__use(7.5, 12.1)'); await O('__wait(100)');
await O('__route([[7.5, 11.2], [7.5, 13.9]])'); o = await O('(__take("sword"), CIM.obs())'); log("sword:", brief(o));
// WARDENS' POST (action): meet the scout in the passage mouth, then the post
await O('__route([[26.5, 14.1], [26.5, 15.8]])');
o = await O('__fight(["scout"])'); log('scout:', brief(o));
await O('__route([[26.5, 19.5]])');
o = await O('__fight(["post"], 9000)'); log('post:', brief(o));
o = await O('(__take("sword"), CIM.obs())'); log('sword:', brief(o));
await O('__heal()');
// THE GRILLE (puzzle): bone, niche, lure, strike, keys
await O('__route([[26.5, 16]])'); o = await O('__waitPhase(18, 19)');
await O('__route([[26.5, 14], [17.9, 14.2], [17.9, 15.4]])'); await O('__use(17.9, 16, -0.4)');
await O('__route([[17.9, 14.2], [33.6, 14.2], [33.6, 15.35]])');
await O('__face(85.2, 36.6, 0.1)'); o = await O('CIM.step({attack: true, yaw: CIM.state.yaw, pitch: 0.1}, 1)');
for (let i = 0; i < 60 && o.shukeli !== 'peer'; i++) o = await O('__wait(10)');
const sh = await O('({x: CIM.state.shukeli.x, z: CIM.state.shukeli.z})');
await O(`__face(${sh.x}, ${sh.z}, 0.1)`); o = await O('CIM.step({attack: true, yaw: CIM.state.yaw, pitch: 0.1}, 1)'); o = await O('__wait(30)'); log('shukeli:', brief(o));
// GUARDROOM (action): the barracks come to the bars; fight through them, then take the keys
o = await O('__fight(["barracks"], 9000, 40)'); log('barracks:', brief(o));
o = await O('(__take("keys"), CIM.obs())');
await O('__route([[33.6, 14]])'); o = await O('__use(34, 14)'); o = await O('__wait(100)'); log('grille:', brief(o));
o = await O('__fight(["barracks"], 6000, 60)');
await O('__heal()');
// THE WINCH (puzzle): a spear from the barracks rack, then jam the ratchet
await O('__route([[40, 10], [40, 7.6], [43.6, 6]])'); o = await O('__use(44.6, 6)'); log('spear:', brief(o));
await O('__route([[40, 7.6], [40, 12], [44.6, 17]])'); o = await O('__use(45.5, 17.2)'); o = await O('__wait(120)'); log('winch:', brief(o));
// THE LANDING (action), then out
await O('__route([[44, 14], [52.5, 14]])');
o = await O('__fight(["landing"], 12000)'); log('landing:', brief(o));
await O('__heal()');
o = await O('__route([[60, 14], [69, 14]])'); log('end:', brief(o));
const fin = { tick: await ev('CIM.state.tick'), hash: await ev('CIM.hash()'), mode: await ev('mode'), deaths: await ev('CIM.state.deaths'), kills: await ev('CIM.state.kills') };
log(fin.mode === 'done' && fin.tick === EXPECTED.tick && fin.hash === EXPECTED.hash ? 'PASS ' + JSON.stringify(fin) : 'FAIL ' + JSON.stringify(fin) + ' expected ' + JSON.stringify(EXPECTED));
