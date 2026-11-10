// Golden playthrough of e1m5, the Scarlet Citadel, through the CIM agent API (README §11).
const EXPECTED = { tick: 6789, hash: 'd2e8621e' };
//@include _prelude.js
let o = await O('(CIM.load("e1m5"), CIM.step({}, 1))');
const waitFlag = async (f, max = 60) => { for (let i = 0; i < max && !(await ev(`CIM.state.flags.${f}`)); i++) o = await O('__wait(72)'); return o; };
// THE LONG STAIR and the skull door
o = await O('__route([[8, 20.5], [17, 20.5], [19.5, 20]])'); log('door:', brief(o));
// THE BLACK CORRIDOR: kill the wakers
o = await O('__fight(["black"], 8000, 40)'); await O('__heal()'); log('black:', brief(o));
// THE CENSERS: walk, don't run
o = await O('__route([[35.5, 19.5], [38.6, 19.5], [38.6, 12.4], [41, 12.4]], false)'); log('censers:', brief(o));
// THE GUARD HALL
o = await O('__fight(["hall", "censer"], 9000, 30)'); await O('__heal()'); log('hall:', brief(o));
// TSOTHA'S CHAMBERS
o = await O('__route([[54, 9]])'); o = await waitFlag('globe_seen', 12); await O('__heal()'); log('globe:', brief(o));
// THE TOWER STAIR
o = await O('__route([[61.5, 9]])'); o = await O('__fight(["tower"], 8000, 30)'); await O('__heal()'); log('tower:', brief(o));
// THE ROOF: across the battlements
o = await O('__route([[61.5, 22], [59, 26]])'); o = await O('__fight(["roof"], 3000, 10)'); o = await O('__jumpTo(54.5, 26)'); o = await O('__fight(["roof"], 6000, 14)');
o = await O('__jumpTo(47.5, 26)'); o = await O('__fight(["roof"], 6000, 14)'); o = await O('__jumpTo(40, 26)'); log('roof:', brief(o));
o = await waitFlag('beast_called', 15); o = await O('__route([[36, 26]])'); log('end:', brief(o));
await finish(EXPECTED);
