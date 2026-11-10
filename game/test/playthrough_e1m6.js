// Golden playthrough of e1m6, the Tower of Tamar, through the CIM agent API (README §11).
const EXPECTED = { tick: 10537, hash: 'fa1fdb5a' };
//@include _prelude.js
let o = await O('(CIM.load("e1m6"), CIM.step({}, 1))');
const waitFlag = async (f, max = 60) => { for (let i = 0; i < max && !(await ev(`CIM.state.flags.${f}`)); i++) o = await O('__wait(72)'); return o; };
// THE TURRET
o = await O('__fight(["turret"], 8000, 30)'); await O('__heal()'); log('turret:', brief(o));
// THE LEADS
o = await O('__route([[13, 19], [19, 19]])'); o = await O('__fight(["roof"], 9000, 30)'); await O('__heal()'); log('roof:', brief(o));
o = await O('__route([[27.5, 18.6]])'); o = await O('__jumpTo(32, 18.6)'); log('leads:', brief(o));
// THE ARCHERS' TURRET
o = await O('__route([[35, 18.5]])'); o = await O('__fight(["archers"], 9000, 30)'); await O('__heal()'); log('archers:', brief(o));
// ARPELLO
o = await O('__route([[41.5, 18.5], [44, 18]])'); o = await O('__fight(["arpello"], 9000, 30)'); o = await waitFlag('arpello_hurled', 10); log('arpello:', brief(o));
// THE TOWER STAIR
o = await O('__route([[48, 15], [51.5, 15]])'); o = await O('__fight(["stair"], 9000, 40)'); await O('__heal()'); log('stair:', brief(o));
o = await waitFlag('stair_cleared', 10); await O('__heal()');
// THE LOWER STAIR and the gate-tower
o = await O('__route([[55, 28.5], [58, 25]])'); o = await O('__fight(["lower"], 9000, 30)'); await O('__heal()'); log('lower:', brief(o));
o = await O('__route([[58, 14]])'); o = await O('__fight(["guard", "lower"], 12000, 40)'); await O('__heal()'); log('guard:', brief(o));
o = await O('__fight(["guard", "lower", "stair"], 12000, 80)'); o = await waitFlag('guard_broken', 10); o = await O('__route([[54, 3]])'); log('end:', brief(o));
await finish(EXPECTED);
