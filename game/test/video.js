// Replays recorded golden runs (cdp.mjs with CIM_RECORD) and grabs a frame every 12 ticks: 5x speed at 30 fps.
//   CIM_RECS="a.json b.json" CIM_FRAMES=dir node cdp.mjs <url> video.js <outdir>
const recs = process.env.CIM_RECS.split(' ').filter(Boolean), dir = process.env.CIM_FRAMES;
let frame = 0;
await ev(`window.__chunk = (T) => {
  const R = __R, P = __P; let got = 0;
  while (P.i < R.length && got < T) {
    const [a, n] = R[P.i];
    if (a === 'load') { CIM.load(n); P.i++; P.done = 0; return 'load ' + n; }
    if (a === 'chk') { P.i++; continue; }
    const k = Math.min(n - P.done, T - got), last = P.done + k >= n;
    let act = a;
    if (P.done > 0) act = Object.assign({}, a, { use: false, torch: false, attack: false, parry: false, kick: false, throwSpear: false, weapon: undefined });
    if (!last) act = Object.assign({}, act, { respawn: false });
    CIM.step(act, k); P.done += k; got += k;
    if (last) { P.i++; P.done = 0; }
  }
  return P.i < R.length ? 'ok' : 'end';
}; true`);
for (const rec of recs) {
  const tag = rec.split('/').pop().replace('.json', ''); frame = 0;
  await ev(`window.__R = ${readFileSync(rec, 'utf8')}; window.__P = { i: 0, done: 0 }; true`);
  for (;;) {
    const r = await ev('__chunk(' + (+process.env.CIM_EVERY || 12) + ')');
    if (r === 'end') break;
    if (r.startsWith('load')) continue;
    const tk = await ev('CIM.state.tick');
    if (process.env.CIM_TO && tk > +process.env.CIM_TO) break;
    if (process.env.CIM_FROM && tk < +process.env.CIM_FROM) continue;
    await grab(`${dir}/${tag}_${String(frame++).padStart(6, '0')}.jpg`);
    if (frame % 300 === 0) log('frames', frame, rec, await ev('CIM.state.tick'));
  }
  log(rec, 'done at tick', await ev('CIM.state.tick'), 'hash', await ev('CIM.hash()'), 'frames', frame);
}
