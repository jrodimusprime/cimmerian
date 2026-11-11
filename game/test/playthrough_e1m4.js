// Golden playthrough of e1m4, Yothga, through the CIM agent API (README §11).
const EXPECTED = { tick: 15980, hash: 'b34d04e7' };
//@include _prelude.js
let o = await O('(CIM.load("e1m4"), CIM.step({}, 1))');
const waitFlag = async (f, max = 60) => { for (let i = 0; i < max && !(await ev(`CIM.state.flags.${f}`)); i++) o = await O('__wait(72)'); return o; };
// THE CAGE: cut through the stem
o = await O('__route([[7, 18]])'); o = await O('__fight(["yothga"], 4000, 20)'); log('yothga:', brief(o));
o = await waitFlag('pelias_up'); log('pelias:', brief(o));
// THE OLD WORKS: leap the breaks (south of the plank), then the gallery
o = await O('__route([[16, 19]])'); o = await O('__jumpTo(20, 19)'); o = await O('__jumpTo(26, 19)'); log('works:', brief(o));
o = await O('__route([[30, 18]])'); o = await O('__fight(["gallery"], 6000, 25)'); await O('__heal()'); log('gallery:', brief(o));
// THE LEDGES
o = await O('__route([[35, 13.5]])'); o = await O('__fight(["ledge"], 4000, 14)'); o = await O('__jumpTo(40.5, 13.5)'); o = await O('__fight(["ledge"], 4000, 14)'); await O('__heal()'); log('ledges:', brief(o));
// THE MAIN CORRIDOR: Satha sees Pelias
o = await O('__route([[45, 12], [45, 6], [49, 6]])'); o = await waitFlag('satha_fled', 10); log('satha:', brief(o));
// THE WAY BACK
o = await O('__route([[53, 7]])'); o = await O('__fight(["den"], 6000, 25)'); await O('__heal()'); log('den:', brief(o));
o = await O('__route([[59.5, 12], [59.5, 20]])'); o = await O('__fight(["tunnel"], 6000, 30)'); await O('__heal()'); log('tunnel:', brief(o));
o = await O('__route([[59.5, 30], [52, 32]])'); o = await O('__fight(["tunnel"], 6000, 30)'); await O('__heal()'); log('deep:', brief(o));
// THE WARREN, and the way the things do not use
o = await O('__route([[40, 32]])'); o = await O('__fight(["warren"], 9000, 30, 14)'); await O('__heal()'); log('warren:', brief(o));
o = await O('__route([[18, 32]])'); o = await O('__fight(["warren", "warren2"], 12000, 40, 14)'); await O('__heal()'); log('warren2:', brief(o));
o = await O('__route([[6, 32], [3.5, 27]])'); o = await O('__fight(["warren", "warren2", "backway"], 12000, 40)'); await O('__heal()'); log('climb:', brief(o));
o = await O('__route([[5.5, 28.5], [9, 26]])'); o = await O('__fight(["ossuary", "backway"], 12000, 40)'); await O('__heal()'); log('ossuary:', brief(o));
o = await O('__route([[9, 28.5], [30, 28.5]])'); o = await O('__fight(["warren", "warren2", "backway", "ossuary"], 12000, 40)'); await O('__heal()'); log('backway:', brief(o));
o = await O('__route([[34, 28.5], [38, 27]])'); o = await O('__fight(["warren", "warren2", "backway", "ossuary", "stair"], 12000, 60)'); await O('__heal()'); log('stair:', brief(o));
// THE GRILLE: the dead jailer works the bolt
o = await waitFlag('grille_open', 40); log('grille:', brief(o));
o = await O('__route([[34, 25.5], [32.4, 25.5], [31.5, 25.5]])'); log('end:', brief(o));
await finish(EXPECTED);
