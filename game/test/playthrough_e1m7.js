// Golden playthrough of e1m7, the Relief of Shamar, through the CIM agent API (README §11).
const EXPECTED = { tick: 12848, hash: '43ba6e4c' };
//@include _prelude.js
let o = await O('(CIM.load("e1m7"), CIM.step({}, 1))');
const waitFlag = async (f, max = 60) => { for (let i = 0; i < max && !(await ev(`CIM.state.flags.${f}`)); i++) o = await O('__wait(72)'); return o; };
// THE RIDGE, and down onto the Shemite line
o = await O('__route([[14, 22], [18, 22]])'); o = await O('__fight(["shemites"], 12000, 40)'); await O('__heal()'); o = await O('__fight(["shemites2"], 12000, 60)'); await O('__heal(40)'); log('shemites:', brief(o));
// THE SIEGE TOWERS: their guards come down at you (Shamar's own sortie will burn them)
o = await O('__route([[28, 20]])'); o = await O('__fight(["tower", "shemites2"], 9000, 50)'); await O('__heal(40)'); o = await O('__route([[33, 17]])'); o = await O('__fight(["tower"], 9000, 50)'); await O('__heal(40)'); log('tower guard:', brief(o));
// THE SECOND TOWER's guard
o = await O('__route([[33, 22]])'); o = await O('__fight(["tower2"], 9000, 35)'); await O('__heal()'); log('tower2 guard:', brief(o));
// THE KOTHIAN SPEARMEN, with the Gundermen
o = await O('__route([[34, 22], [44, 22], [49, 22]])'); o = await O('__fight(["spears"], 12000, 40)'); await O('__heal()'); log('spears:', brief(o));
// THE PRESS OF KNIGHTS
o = await O('__route([[60, 22]])'); o = await O('__fight(["press"], 15000, 40)'); await O('__heal()'); log('press:', brief(o));
// STRABONUS
o = await O('__route([[74, 22]])'); o = await O('__fight(["guards"], 15000, 50)'); await O('__heal(40)'); log('guards:', brief(o)); await O('__heal(60, 40)'); o = await O('__route([[76, 22]])'); o = await O('__fight(["palace", "guards"], 15000, 50)');
for (let k = 0; k < 4 && !(await ev('CIM.state.flags.strabonus_dead')); k++) { o = await O('__wait(36)'); o = await O('__fight(["palace", "guards", "press"], 15000, 90)'); }
o = await waitFlag('strabonus_dead', 10); log('strabonus:', brief(o));
o = await O('__route([[89, 22], [94, 22]])'); log('end:', brief(o));
await finish(EXPECTED);
