// Golden playthrough of e1m5, the Scarlet Citadel, through the CIM agent API (README §11).
const EXPECTED = { tick: 12869, hash: 'a07fd0ac' };
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
// THE BARRACKS and the armoury
o = await O('__route([[38.5, 4.5], [34, 5]])'); o = await O('__fight(["barracks"], 12000, 30)'); await O('__heal()'); log('barracks:', brief(o));
o = await O('__route([[22, 4.5], [18, 4.5]])'); o = await O('__fight(["armoury", "barracks"], 12000, 30)'); await O('__heal()'); o = await waitFlag('armed', 8); log('armoury:', brief(o));
o = await O('__route([[38.5, 4.5], [44, 7]])');
// TSOTHA'S CHAMBERS
o = await O('__route([[54, 9]])'); o = await waitFlag('globe_seen', 12); await O('__heal()'); log('globe:', brief(o));
// THE TOWER STAIR
o = await O('__route([[61.5, 9]])'); o = await O('__fight(["tower"], 8000, 30)'); await O('__heal()'); log('tower:', brief(o));
// THE ROOF: across the battlements
o = await O('__route([[61.5, 22], [59, 26]])'); o = await O('__fight(["roof"], 3000, 10)'); o = await O('__jumpTo(54.5, 26)'); o = await O('__fight(["roof"], 6000, 14)');
o = await O('__jumpTo(47.5, 26)'); o = await O('__fight(["roof"], 6000, 14)'); o = await O('__jumpTo(40, 26)'); o = await O('__fight(["roof"], 6000, 14)'); await O('__heal()'); log('roof:', brief(o));
// THE WEST BATTLEMENTS, to the tallest tower
o = await O('__route([[35, 26]])'); o = await O('__fight(["roofw"], 4000, 8)'); o = await O('__jumpTo(30, 26)'); o = await O('__fight(["roofw"], 6000, 12)'); await O('__heal()');
o = await O('__route([[27, 26]])'); o = await O('__jumpTo(22, 26)'); o = await O('__fight(["roofw"], 6000, 14)'); log('west:', brief(o));
o = await O('__fight(["roofw", "roof"], 6000, 30)'); o = await waitFlag('beast_called', 15); o = await O('(CIM.state.x > 33 * C && (__route([[35, 26]]), __jumpTo(30, 26)), CIM.state.x > 25 * C && (__route([[27, 26]]), __jumpTo(22, 26)), __route([[18, 27]]))'); log('end:', brief(o));
await finish(EXPECTED);
