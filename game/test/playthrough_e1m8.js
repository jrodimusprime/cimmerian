// Golden playthrough of e1m8, the Tybor, through the CIM agent API (README §11).
const EXPECTED = { tick: 12533, hash: '42e98a91' };
//@include _prelude.js
let o = await O('(CIM.load("e1m8"), CIM.step({}, 1))');
const waitFlag = async (f, max = 60) => { for (let i = 0; i < max && !(await ev(`CIM.state.flags.${f}`)); i++) o = await O('__wait(72)'); return o; };
// THE ROUT along the bank
o = await O('__route([[10, 52]])'); o = await O('__fight(["camp"], 15000, 50)'); await O('__heal()'); log('camp:', brief(o));
o = await O('__route([[12, 34]])'); o = await O('__fight(["rear", "camp"], 15000, 50)'); await O('__heal()'); o = await O('__route([[10, 24]])'); o = await O('__fight(["rout", "rear", "camp"], 15000, 50)'); await O('__heal()'); log('rout:', brief(o));
o = await O('__heal()');
// THE BARGE BRIDGE: barge to barge, clear of the rotten lashings
o = await O('__route([[29, 18.5]])');
for (const x of [31.5, 36, 41, 46, 51, 56]) o = await O(`__jumpTo(${x}, 18.5)`);
log('crossed:', brief(o));
// THE FAR BANK
o = await O('__fight(["far"], 15000, 40)'); await O('__heal(70)'); log('far bank:', brief(o));
o = await O('__route([[60, 36], [64, 42], [70, 46]])'); o = await O('__fight(["bay", "far"], 15000, 80)'); await O('__heal()'); log('reeds:', brief(o));
o = await O('__route([[64, 30], [64, 20]])');
// THE MEADOW: the eagle throws Tsotha; behead him
o = await O('__route([[68, 20]])'); o = await waitFlag('tsotha_found', 10); o = await O('__fight(["tsotha"], 15000, 50)'); log('tsotha:', brief(o));
o = await waitFlag('the_end', 15); o = await O('__route([[88, 20]])'); log('end:', brief(o));
await finish(EXPECTED);
