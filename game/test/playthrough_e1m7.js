// Golden playthrough of e1m7, the Relief of Shamar, through the CIM agent API (README §11).
const EXPECTED = { tick: 16224, hash: 'f83ae900' };
//@include _prelude.js
let o = await O('(CIM.load("e1m7"), CIM.step({}, 1))');
const waitFlag = async (f, max = 60) => { for (let i = 0; i < max && !(await ev(`CIM.state.flags.${f}`)); i++) o = await O('__wait(72)'); return o; };
// THE RIDGE, and down onto the Shemite line
o = await O('__route([[14, 22], [18, 22]])'); o = await O('__fight(["shemites"], 12000, 40)'); await O('__heal()'); o = await O('__fight(["shemites2"], 12000, 60)'); await O('__heal(40)'); log('shemites:', brief(o));
// THE SIEGE TOWER: its guard, then up the ladders, over the gap, to the top
o = await O('__route([[28, 20], [33, 17]])'); o = await O('__fight(["tower"], 9000, 30)'); await O('__heal()'); log('tower guard:', brief(o));
o = await O('__route([[33.5, 10.5]])'); o = await O('__jumpTo(40, 10.5)'); o = await O('__jumpTo(42.6, 10.6)'); log('gap:', brief(o));
o = await O('__jumpTo(42.6, 14.5)'); o = await O('__jumpTo(45.5, 13.5)'); o = await waitFlag('tower_fired', 6); log('fired:', brief(o));
o = await O('__jumpTo(42.6, 14.5)'); o = await O('__jumpTo(42.6, 10.6)'); o = await O('__jumpTo(40, 10.5)'); o = await O('__jumpTo(33.5, 10.5)'); log('down:', brief(o));
// THE SECOND TOWER
o = await O('__route([[33, 22]])'); o = await O('__fight(["tower2"], 9000, 35)'); await O('__heal()'); log('tower2 guard:', brief(o));
o = await O('__route([[33.5, 30.5]])'); o = await O('__jumpTo(40, 30.5)'); o = await O('__jumpTo(42.6, 30.6)'); o = await O('__fight(["tower2"], 3000, 20)');
o = await O('__jumpTo(42.6, 34.5)'); o = await O('__jumpTo(45.5, 33.5)'); o = await waitFlag('tower_fired', 6); log('fired2:', brief(o));
o = await O('__jumpTo(42.6, 34.5)'); o = await O('__jumpTo(42.6, 30.6)'); o = await O('__jumpTo(40, 30.5)'); o = await O('__jumpTo(33.5, 30.5)'); log('down2:', brief(o));
// THE KOTHIAN SPEARMEN, with the Gundermen
o = await O('__route([[34, 22], [44, 22], [49, 22]])'); o = await O('__fight(["spears"], 12000, 40)'); await O('__heal()'); log('spears:', brief(o));
// THE PRESS OF KNIGHTS
o = await O('__route([[60, 22]])'); o = await O('__fight(["press"], 15000, 40)'); await O('__heal()'); log('press:', brief(o));
// STRABONUS
o = await O('__route([[74, 22]])'); o = await O('__fight(["guards"], 15000, 50)'); await O('__heal(40)'); log('guards:', brief(o)); o = await O('__route([[76, 22]])'); o = await O('__fight(["palace", "guards"], 15000, 50)'); o = await waitFlag('strabonus_dead', 10); log('strabonus:', brief(o));
o = await O('__route([[89, 22]])'); log('end:', brief(o));
await finish(EXPECTED);
