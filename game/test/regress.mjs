// The regression test run before every push (.githooks/pre-push): the whole campaign played through, sped up.
//   node test/regress.mjs [e1m3 e1m4 ...]
// 1. Every level's golden bot plays it headless at full sim speed (all levels at once), and must end where its
//    EXPECTED tick and state hash say.
// 2. A watchdog follows the player through each run and fails it on a death beyond the level's budget, or on the
//    bot standing still for STALL_S seconds or more anywhere that isn't one of the level's known waits (waits.json:
//    the puzzles that are waiting by design, like lying still while Satha passes).
// 3. The recorded autoplay (cheat mode's "let the AI play this level") is replayed and must end the same way.
// Then the campaign's length against README rule 3 (4x the golden runs, at least 90 min).
import { spawn, execSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), tmp = process.env.TMPDIR || '/tmp';
const url = 'file://' + join(here, '..', 'index.html') + '?agent';
const FILES = { e1m1: 'playthrough_e1m1.js', e1m2: 'playthrough.js', e1m3: 'playthrough_e1m3.js', e1m4: 'playthrough_e1m4.js',
  e1m5: 'playthrough_e1m5.js', e1m6: 'playthrough_e1m6.js', e1m7: 'playthrough_e1m7.js', e1m8: 'playthrough_e1m8.js' };
const STALL_S = 10, STALL_M = 2.0, HZ = 72;
const WAITS = JSON.parse(readFileSync(join(here, 'waits.json'), 'utf8'));
const levels = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FILES);

// one browser run, from a fresh profile (a stale lock from a crashed run wedges Chrome), killed if it hangs; a harness
// error (the page not ready under load) is retried once before it counts
const RUN_TIMEOUT = 240e3;
const run1 = (script, dir, env) => new Promise(res => {
  rmSync(join(tmp, dir), { recursive: true, force: true });
  const p = spawn('node', [join(here, 'cdp.mjs'), url, script, join(tmp, dir)], { cwd: here, env: { ...process.env, ...env } });
  let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  const kill = setTimeout(() => { out += '\n[harness error] timed out after ' + RUN_TIMEOUT / 1000 + 's'; p.kill('SIGTERM'); }, RUN_TIMEOUT);
  p.on('close', () => { clearTimeout(kill); res(out); });
});
const run = async (script, dir, env = {}) => { let out = await run1(script, dir, env); if (/\[harness error\]|\[EXCEPTION\]/.test(out) && !/PASS|FAIL|\[replay\]/.test(out)) out = await run1(script, dir, env); return out; };
const expected = l => { const m = readFileSync(join(here, FILES[l]), 'utf8').match(/const EXPECTED = \{ tick: (\d+), hash: '([0-9a-f]+)' \};/); return { tick: +m[1], hash: m[2] }; };

// stands: the bot stays within STALL_M metres of where it stopped for STALL_S seconds or more, in play, with no one at it
function stalls(pts) {
  const out = [];
  for (let i = 0; i < pts.length;) {
    let j = i;
    while (j + 1 < pts.length && pts[j + 1][4] === 'play' && Math.hypot(pts[j + 1][1] - pts[i][1], pts[j + 1][2] - pts[i][2]) < STALL_M) j++;
    const secs = (pts[j][0] - pts[i][0]) / HZ;
    const fighting = pts.slice(i, j + 1).filter(p => p[5]).length / (j - i + 1);   // standing your ground in a melee isn't standing still
    if (pts[i][4] === 'play' && secs >= STALL_S && fighting < 0.5) { out.push({ tick: pts[i][0], secs: +secs.toFixed(1), cell: [+(pts[i][1] / 2.5).toFixed(1), +(pts[i][2] / 2.5).toFixed(1)], hp: [pts[i][3], pts[j][3]] }); i = j + 1; }
    else i++;
  }
  return out;
}
const known = (l, st) => (WAITS[l]?.waits || []).find(w => Math.hypot(w.cell[0] - st.cell[0], w.cell[1] - st.cell[1]) <= (w.r || 2) && st.secs <= w.max);

// the build stamp (js/version.js, index.html's ?v=) must be the hash of the code as it is: else browsers mix versions
{ const want = execSync('sh ' + join(here, 'build_stamp.sh') + ' --print').toString().trim(), have = (readFileSync(join(here, '..', 'js', 'version.js'), 'utf8').match(/BUILD = '([0-9a-f]+)'/) || [])[1];
  if (want !== have) { console.log(`FAIL build stamp ${have} is not the code's ${want}: run test/record_autoplay.sh (it re-stamps)`); process.exit(1); } }
const t0 = Date.now();
// at most four levels at once: a dozen browsers on one machine starve each other
const pool = async (items, n, fn) => { const out = new Array(items.length); let next = 0; await Promise.all(Array.from({ length: n }, async () => { while (next < items.length) { const k = next++; out[k] = await fn(items[k]); } })); return out; };
const results = await pool(levels, 4, async l => {
  const wf = join(tmp, 'cim-watch-' + l + '.json'); try { rmSync(wf); } catch {}
  const exp = expected(l), out = await run(FILES[l], 'cim-regress-' + l, { CIM_WATCH: wf });
  const fin = (out.match(/(PASS|FAIL) (\{[^}]*\})/) || [])[2], w = existsSync(wf) ? readFileSync(wf, 'utf8') : null;
  const r = { l, exp, problems: [] };
  if (!fin) { r.problems.push('did not finish: ' + (out.match(/\[(EXCEPTION|harness error)\].*/) || ['no result'])[0].slice(0, 200)); return r; }
  r.fin = JSON.parse(fin);
  if (r.fin.mode !== 'done') r.problems.push('level not completed (mode ' + r.fin.mode + ')');
  if (r.fin.tick !== exp.tick || r.fin.hash !== exp.hash) r.problems.push(`run diverged: tick ${r.fin.tick} hash ${r.fin.hash}, expected ${exp.tick} ${exp.hash}`);
  if (w) {
    const W = JSON.parse(w), budget = WAITS[l]?.deaths ?? 0;
    if (W.deaths.length > budget) r.problems.push(`${W.deaths.length} death(s), budget ${budget}: ` + W.deaths.map(d => `t${d[0]} at ${d[1]},${d[2]} ${d[3]}`).join('; '));
    for (const st of stalls(W.pts)) if (!known(l, st)) r.problems.push(`stood still ${st.secs}s at cell ${st.cell} (t${st.tick}, hp ${st.hp[0]}->${st.hp[1]})`);
  } else r.problems.push('no watchdog report');
  // the autoplay recording, replayed as fast as the sim goes
  const rp = await run('replay.js', 'cim-replay-' + l, { CIM_REC: join(here, '..', 'autoplay', l + '.json') });
  const rf = (rp.match(/\[replay\] (\{.*\})/) || [])[1];
  if (!rf) r.problems.push('autoplay replay failed: ' + rp.slice(-200));
  else { const R = JSON.parse(rf); if (R.drift || R.mode !== 'done' || R.tick !== exp.tick || R.hash !== exp.hash) r.problems.push(`autoplay recording stale: replay ${R.drift ? 'drifts at ' + R.drift + ', ' : ''}ends ${R.mode} t${R.tick} ${R.hash} (re-run test/record_autoplay.sh)`); }
  return r;
});;

let bad = 0, total = 0;
for (const r of results) {
  total += r.fin?.tick || 0;
  const tag = r.problems.length ? 'FAIL' : 'ok  ';
  console.log(`${tag} ${r.l}  ${r.fin ? `${(r.fin.tick / HZ / 60).toFixed(1)} min run, ~${(r.fin.tick * 4 / HZ / 60).toFixed(1)} min first-time, ${r.fin.deaths} death(s), ${r.fin.kills} kills` : ''}`);
  for (const p of r.problems) console.log('       - ' + p);
  if (r.problems.length) bad++;
}
if (levels.length === Object.keys(FILES).length) {
  const min = total * 4 / HZ / 60;
  console.log(`campaign ~${min.toFixed(1)} min first-time (rule 3: at least 90)` + (min < 90 ? '  WARNING: under rule 3' : ''));
}
console.log(`${bad ? 'FAILED' : 'passed'} in ${Math.round((Date.now() - t0) / 1000)}s`);
process.exit(bad ? 1 : 0);
