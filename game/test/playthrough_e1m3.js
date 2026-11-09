// Golden playthrough of e1m3 through the CIM agent API (README §11).
const EXPECTED = { tick: 5870, hash: '8bbc707f' };
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
const brief = o => `t${o.tick} ${o.mode} room=${o.room} hp=${Math.round(o.health)} kills=${o.kills} flags=${Object.entries(o.flags).filter(([, v]) => v).map(([k]) => k).join(',')}`;
let o = await O('(CIM.load("e1m3"), CIM.state.weapons.sword = true, CIM.state.weapon = "sword", CIM.step({}, 1))');
// THE MARKED WAYS (puzzle): read the foot inscription and the three-cut mark
await O('__use(6.96, 18.2)'); await O('__route([[11.5, 18.6]])'); o = await O('__use(12.96, 17.6)'); log('marks:', brief(o));
// THE WARREN (action)
await O('__route([[16, 18.6], [21.5, 18.5]])');
o = await O('__fight(["warren"], 9000, 30)'); log('warren:', brief(o));
await O('__heal()');
// THE CROSSING (puzzle): open only the second vent, then cross the ledge
await O('__route([[33.7, 14.9]])'); await O('__use(33.6, 14.05)');
await O('__route([[33.7, 23.1]])'); await O('__use(33.6, 23.95)'); await O('__route([[35.3, 23.1]])'); o = await O('__use(35.6, 23.95)');
log('vents:', JSON.stringify(await O('CIM.state.valves')), 'wind', await ev('CIM.state.wind'));
await O('__wait(150)');
o = await O('__route([[36.2, 18.5], [44.6, 18.5]])'); log('crossed:', brief(o));
// THE LAIR (action): the crank is behind the weeping thing; grab it and run
await O('__route([[50, 17.9], [55.5, 17.6]])');
await O('__route([[57.5, 20.5], [58.4, 19.8]])'); o = await O('(__take("crank"), CIM.obs())'); log('crank:', brief(o));
await O('__route([[58, 21.5], [58, 23.4]])');
o = await O('__fight(["lair"], 3000, 12)');
// THE HANGING STONE (puzzle)
await O('__route([[54.6, 27.9]])'); o = await O('__use(54, 27)'); o = await O('__wait(200)');
await O('__route([[53.6, 26.6]])'); o = await O('__use(53.4, 25.9, -0.2)'); o = await O('__wait(400)'); log('stone:', brief(o));
o = await O('(__take("sigil"), CIM.obs())'); log('sigil:', brief(o));
// THE SIGIL GATE (action): set the stone, hold them off, go through
await O('__route([[52.5, 30], [45, 30]])'); o = await O('__use(44.1, 30)'); log('set:', brief(o));
o = await O('__fight(["gatewave"], 9000, 30)'); log('wave:', brief(o));
o = await O('__wait(600)');
o = await O('__route([[42, 30], [31.5, 30]])'); log('end:', brief(o));
const fin = { tick: await ev('CIM.state.tick'), hash: await ev('CIM.hash()'), mode: await ev('mode'), deaths: await ev('CIM.state.deaths'), kills: await ev('CIM.state.kills') };
log(fin.mode === 'done' && fin.tick === EXPECTED.tick && fin.hash === EXPECTED.hash ? 'PASS ' + JSON.stringify(fin) : 'FAIL ' + JSON.stringify(fin) + ' expected ' + JSON.stringify(EXPECTED));
