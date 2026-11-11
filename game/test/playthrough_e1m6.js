// Golden playthrough of e1m6, the Tower of Tamar, through the CIM agent API (README §11).
const EXPECTED = { tick: 8908, hash: '5f624822' };
//@include _prelude.js
let o = await O('(CIM.load("e1m6"), CIM.step({}, 1))');
const waitFlag = async (f, max = 60) => { for (let i = 0; i < max && !(await ev(`CIM.state.flags.${f}`)); i++) o = await O('__wait(72)'); return o; };
// ARPELLO, on the turret of the great tower: he leaps at you; over the parapet with him
o = await O('__fight(["arpello"], 9000, 30)'); o = await waitFlag('laughed', 40); await O('__heal()'); log('arpello:', brief(o));
// THE TOWER STAIR
o = await O('__route([[48, 15], [50.5, 14.9], [52.5, 15]])'); o = await O('__fight(["stair"], 9000, 16)'); await O('__heal()'); o = await O('__fight(["stair3"], 9000, 60)'); await O('__heal()'); log('stair:', brief(o));
o = await waitFlag('stair_cleared', 10); await O('__heal()');
// THE LOWER STAIR and the gate-tower
o = await O('__route([[55, 28.5], [58, 25]])'); o = await O('__fight(["lower"], 9000, 30)'); await O('__heal()'); log('lower:', brief(o));
o = await O('__route([[58, 14]])'); o = await O('__fight(["guard", "lower"], 12000, 40)'); await O('__heal()'); log('guard:', brief(o));
o = await O('__wait(36)'); o = await O('__fight(["guard", "guard3", "lower", "stair"], 15000, 80)'); o = await waitFlag('guard_broken', 10); o = await O('__route([[54, 3], [54, 0.8]])'); log('end:', brief(o));
await finish(EXPECTED);
