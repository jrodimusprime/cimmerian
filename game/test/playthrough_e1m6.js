// Golden playthrough of e1m6, the Tower of Tamar, through the CIM agent API (README §11).
const EXPECTED = { tick: 6084, hash: '0a24e58a' };
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
o = await waitFlag('stair_cleared', 10); o = await O('__route([[51.5, 26.5], [55, 28.5], [61, 29.5]])'); log('end:', brief(o));
await finish(EXPECTED);
