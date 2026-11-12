// Golden playthrough of e1m7, the Relief of Shamar, through the CIM agent API (README §11).
const EXPECTED = { tick: 14701, hash: 'bd7f0d27' };
//@include _prelude.js
let o = await O('(CIM.load("e1m7"), CIM.step({}, 1))');
const waitFlag = async (f, max = 60) => { for (let i = 0; i < max && !(await ev(`CIM.state.flags.${f}`)); i++) o = await O('__wait(72)'); return o; };
// THE RIDGE, and down onto the Shemite line
o = await O('__route([[14, 22], [18, 22]])'); o = await O('__fight(["shemites"], 12000, 40)'); await O('__heal(40, 30)'); o = await O('__fight(["shemites2"], 12000, 60)'); await O('__heal(40)'); log('shemites:', brief(o));
// THE SIEGE LINES: the guard at the north tower's foot and on its stair
o = await O('__route([[28, 20]])'); o = await O('__fight(["tower", "shemites2"], 9000, 50)'); await O('__heal(40)'); o = await O('__route([[32, 12]])'); o = await O('__fight(["tower"], 9000, 50)'); await O('__heal(40)'); log('tower guard:', brief(o));
// up through the north tower and onto the wall-walk; its men
o = await O('__route([[34.5, 10.5], [37.5, 12.5], [40.5, 10.5]])'); o = await O('__fight(["wall", "tower"], 9000, 40)'); await O('__heal(40)'); log('wall:', brief(o));
// along the walk and down through the south tower; its guard and the men behind the lines
o = await O('__route([[40.5, 29.5], [42.5, 30.5]])'); o = await O('__fight(["tower2", "wall"], 9000, 20)'); await O('__heal(20, 12)');
o = await O('__route([[45.5, 30.5], [45.5, 26.5]])'); o = await O('__fight(["behind", "tower2"], 9000, 40)'); await O('__heal(40, 30)'); log('tower2 guard:', brief(o));
// THE KOTHIAN SPEARMEN, with the Gundermen
o = await O('__route([[45, 22], [49, 22]])'); o = await O('__fight(["spears"], 12000, 40)'); await O('__heal(40, 30)'); log('spears:', brief(o));
// THE PRESS OF KNIGHTS
o = await O('__route([[60, 22]])'); o = await O('__fight(["press"], 15000, 40)'); await O('__heal()'); log('press:', brief(o));
// STRABONUS
o = await O('__route([[74, 22]])'); o = await O('__fight(["guards"], 15000, 50)'); await O('__heal(40)'); log('guards:', brief(o)); await O('__heal(60, 40)'); o = await O('__route([[76, 22]])'); o = await O('__fight(["palace", "guards"], 15000, 50)');
for (let k = 0; k < 4 && !(await ev('CIM.state.flags.strabonus_dead')); k++) { o = await O('__wait(36)'); o = await O('__fight(["palace", "guards", "press"], 15000, 90)'); }
o = await waitFlag('strabonus_dead', 10); log('strabonus:', brief(o));
o = await O('__route([[89, 22], [94, 22]])'); log('end:', brief(o));
await finish(EXPECTED);
