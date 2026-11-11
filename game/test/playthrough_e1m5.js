// Golden playthrough of e1m5, the Scarlet Citadel, through the CIM agent API (README §11).
const EXPECTED = { tick: 13991, hash: 'd0ee1617' };
//@include _prelude.js
let o = await O('(CIM.load("e1m5"), CIM.step({}, 1))');
const waitFlag = async (f, max = 60) => { for (let i = 0; i < max && !(await ev(`CIM.state.flags.${f}`)); i++) o = await O('__wait(72)'); return o; };
// THE LONG STAIR and the skull door
o = await O('__route([[8, 20.5], [17, 20.5], [19.5, 20]])'); log('door:', brief(o));
// THE BLACK CORRIDOR and THE CENSERS: silence; still they see no one
o = await O('__route([[35.5, 19.5], [38.6, 19.5], [38.6, 12.4], [41, 12.4]], false)'); log('censers:', brief(o));
// THE SOLDIERS' QUARTERS: in among Tsotha's drunken guard, and kill them before they're well awake
o = await O('__route([[38.5, 4.5], [34.5, 5]], false)'); o = await O('__fight(["quarters"], 14000, 30)'); await O('__heal()'); log('quarters:', brief(o));
o = await O('__route([[38.5, 4.5], [44, 7]])');
// THE GOLD-DOMED CHAMBER: the wine, and Tsotha's crystal
o = await O('__route([[54, 9]])'); o = await waitFlag('globe_ready', 50);
o = await O('(__face(55 * C, 7.1 * C, -0.35), CIM.step({ use: true, yaw: CIM.state.yaw, pitch: -0.35 }, 1), CIM.obs())'); o = await waitFlag('globe_seen', 5); log('globe:', brief(o));
o = await O('__wait(72 * 8)');
// THE GOLD-WORKED STAIR, and across the pinnacles to the tallest tower
o = await O('__route([[61.5, 9], [61.5, 22], [59, 26]])');
o = await O('__jumpTo(54.5, 26)'); o = await O('__jumpTo(47.5, 26)'); o = await O('__jumpTo(40, 26)'); log('roof:', brief(o));
o = await O('__route([[35, 26]])'); o = await O('__jumpTo(30, 26)'); o = await O('__route([[27, 26]])'); o = await O('__jumpTo(22, 26)'); log('west:', brief(o));
o = await O('__route([[20, 27]])'); o = await waitFlag('beast_called', 60); o = await O('(__route([[18, 27]]), CIM.obs())'); log('end:', brief(o));
await finish(EXPECTED);
