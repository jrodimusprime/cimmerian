// Golden playthrough of e1m2 through the CIM agent API (README §11).
// The final state hash must match EXPECTED on every run and machine.
const EXPECTED = { tick: 3467, hash: 'dcbdf935' };
// helpers inside the page
await ev(`
window.__face = (x, z, pitch = 0) => { const s = CIM.state; return CIM.step({ yaw: Math.atan2(-(x - s.x), -(z - s.z)), pitch }, 1); };
window.__go = (x, z, run = false, maxTicks = 2000) => {
  let o;
  for (let i = 0; i < maxTicks; i++) {
    const s = CIM.state, dx = x - s.x, dz = z - s.z;
    if (Math.hypot(dx, dz) < 0.35) break;
    o = CIM.step({ forward: 1, run, yaw: Math.atan2(-dx, -dz), pitch: 0 }, 1);
    if (o.mode !== 'play') break;
  }
  CIM.step({ yaw: CIM.state.yaw }, 6);
  return CIM.obs();
};
window.__wait = (ticks) => CIM.step({ yaw: CIM.state.yaw, pitch: CIM.state.pitch }, ticks);
window.__waitPhase = (lo, hi) => { for (let i = 0; i < 4000; i++) { const p = CIM.obs().satha.phase; if (p >= lo && p <= hi) break; CIM.step({ yaw: CIM.state.yaw, pitch: CIM.state.pitch }, 1); } return CIM.obs(); };
window.__item = k => CIM.state.items.find(i => i.kind === k && !i.taken);
true`);
const O = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const brief = o => `t${o.tick} ${o.mode} room=${o.room} hp=${Math.round(o.health)} pos=${o.pos.map(v => v.toFixed(1))} giant=${o.giant} shuk=${o.shukeli} satha=${o.satha.phase.toFixed ? o.satha.phase.toFixed(1) : o.satha.phase} prompt="${o.prompt}" flags=${Object.entries(o.flags).filter(([, v]) => v).map(([k]) => k).join(',')}`;
let o = await O('CIM.step({}, 1)');
await ev('__face(17.5, 31.5, -0.05)');
// 1. read the inscription on the west wall
o = await O('__go(16.0, 23.0)'); log(brief(o));
o = await O('__face(15.1, 23.0, 0)'); log('facing clue:', o.prompt);
o = await O('CIM.step({use: true, yaw: CIM.state.yaw}, 1)'); log(brief(o));
// 2. slip the chain
o = await O('__go(17.5, 21.6)'); o = await O('__face(17.5, 20.2, -0.3)'); log('facing ring:', o.prompt);
o = await O('CIM.step({use: true, yaw: CIM.state.yaw, pitch: -0.3}, 1)'); log(brief(o));
// back into the corner and watch the giant
o = await O('__go(22.5, 22.5)');
o = await O('__face(18.75, 31, -0.05)');
o = await O('__wait(150)'); log(brief(o));
o = await O('__wait(150)'); log(brief(o));
for (let i = 0; i < 30 && o.giant !== 'flee'; i++) o = await O('__wait(20)');
log(brief(o));
// watch from the cell door (hidden) as Satha comes
o = await O('__go(18.75, 30.6, true)'); log(brief(o));
o = await O('__go(18.75, 32.2)'); o = await O('__face(10, 35, 0.1)');
o = await O('__wait(40)'); log(brief(o));
for (let i = 0; i < 40 && o.giant !== 'crushed'; i++) o = await O('__wait(10)');
log(brief(o));
o = await O('__face(40, 35, 0.0)');
o = await O('__wait(90)'); log(brief(o));
// 3. wait for the pass to clear, then fetch the dagger
o = await O('__waitPhase(20, 21)'); log('clear:', brief(o));
const dg = await O('__item("dagger")'); log('dagger at', dg && dg.x.toFixed(1), dg && dg.z.toFixed(1));
o = await O(`__go(${dg.x - 1.2}, ${dg.z - 0.6}, true)`);
o = await O(`__face(${dg.x}, ${dg.z}, -0.6)`); log('facing dagger:', o.prompt);
o = await O('CIM.step({use: true, yaw: CIM.state.yaw, pitch: -0.6}, 1)'); log(brief(o));
// 4. bones
o = await O('__go(44.75, 38.6, true)'); o = await O('__face(44.75, 40.5, -0.4)'); log('facing bones:', o.prompt);
o = await O('CIM.step({use: true, yaw: CIM.state.yaw, pitch: -0.4}, 1)'); log(brief(o));
// 5. to the niche by the grille (run, then hide)
o = await O('__go(70, 35.5, true)'); log(brief(o));
o = await O('__go(84.0, 38.4, true)'); log(brief(o));
o = await O('__face(97, 33, 0.05)');
o = await O('__face(85.2, 36.6, 0.1)');
o = await O('CIM.step({attack: true, yaw: CIM.state.yaw, pitch: 0.1}, 1)'); log('threw:', brief(o));
for (let i = 0; i < 60 && o.shukeli !== 'peer'; i++) o = await O('__wait(10)');
log(brief(o));
const sh = await O('({x: CIM.state.shukeli.x, z: CIM.state.shukeli.z})');
o = await O(`__face(${sh.x}, ${sh.z}, 0.1)`);
o = await O('CIM.step({attack: true, yaw: CIM.state.yaw, pitch: 0.1}, 1)'); log('strike:', brief(o));
o = await O('__wait(40)');
const k = await O('__item("keys")');
o = await O(`__face(${k.x}, ${k.z}, -0.7)`); log('facing keys:', o.prompt);
o = await O('CIM.step({use: true, yaw: CIM.state.yaw, pitch: -0.7}, 1)'); log(brief(o));
o = await O('__go(84.0, 35.2)'); o = await O('__face(85, 35, 0)'); log('facing grille:', o.prompt);
o = await O('CIM.step({use: true, yaw: CIM.state.yaw}, 1)'); o = await O('__wait(100)'); log(brief(o));
o = await O('__go(92, 35, true)'); o = await O('__face(98, 30, -0.05)');
o = await O('__go(103, 34.4, true)'); o = await O('__face(120, 34.4, 0.2)');
o = await O('__go(118, 34.4, true)'); log('end:', brief(o));
await sleep(1500);
log('hash', await ev('CIM.hash()'), 'deaths', await ev('CIM.state.deaths'));
const fin = { tick: await ev('CIM.state.tick'), hash: await ev('CIM.hash()'), mode: await ev('mode') };
log(fin.mode === 'done' && fin.tick === EXPECTED.tick && fin.hash === EXPECTED.hash ? 'PASS ' + JSON.stringify(fin) : 'FAIL ' + JSON.stringify(fin) + ' expected ' + JSON.stringify(EXPECTED));
