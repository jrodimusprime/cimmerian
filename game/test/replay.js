// Replays a recorded golden run (game/autoplay/<level>.json, from record_autoplay.sh) at full sim speed and reports
// how it ends: CIM_REC=file node cdp.mjs <url> replay.js <outdir>. Used by regress.mjs.
await ev(`window.__R = ${readFileSync(process.env.CIM_REC, 'utf8')}; true`);
log('[replay] ' + await ev(`(() => { for (const [a, n] of __R) { if (a === 'load') CIM.load(n); else CIM.step(a, n); }
  return JSON.stringify({ tick: CIM.state.tick, hash: CIM.hash(), mode: CIM.obs().mode }); })()`));
