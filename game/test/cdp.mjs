// Minimal Chrome DevTools driver: node cdp.mjs <url> <script.js> <outdir>
// Launches headless Chrome (macOS path below; set CHROME to override).
// The script file holds an async function body with `ev(expr)`, `shot(name)`, `sleep(ms)` in scope.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const [url, scriptPath, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${outDir}/profile`,
  '--window-size=1280,720', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0;
const pending = new Map();
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = list.find(t => t.type === 'page'); } catch {}
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', m => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else if (msg.method === 'Runtime.consoleAPICalled') console.log('[console.' + msg.params.type + ']', msg.params.args.map(a => a.value ?? a.description).join(' '));
    else if (msg.method === 'Runtime.exceptionThrown') console.log('[EXCEPTION]', msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await sleep(2500);
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval error');
    return r.result?.result?.value;
  };
  const shot = async name => {
    await sleep(250);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.result.data, 'base64'));
    console.log('[shot]', name);
  };
  for (let i = 0; i < 100; i++) { if (await ev('!!(window.CIM && CIM.state)').catch(() => false)) break; await sleep(100); }   // the game has loaded its first level
  const body = readFileSync(scriptPath, 'utf8').replace(/^\/\/@include (\S+)$/m, (m, f) => readFileSync(join(dirname(resolve(scriptPath)), f), 'utf8'));
  // CIM_RECORD=file: log every agent call so the run can be replayed frame by frame (test/video.js)
  if (process.env.CIM_RECORD) await ev(`window.__rec = []; { const st = CIM.step.bind(CIM), ld = CIM.load.bind(CIM);
    CIM.step = (a = {}, n = 1) => { __rec.push([JSON.parse(JSON.stringify(a)), n]); return st(a, n); }; CIM.load = id => { __rec.push(['load', id]); return ld(id); }; } true`);
  const grab = async (path, quality = 82) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality }); writeFileSync(path, Buffer.from(r.result.data, 'base64')); };
  const fn = new Function('ev', 'shot', 'sleep', 'log', 'grab', 'readFileSync', `return (async () => { ${body} })();`);
  await fn(ev, shot, sleep, (...a) => console.log(...a), grab, readFileSync);
  if (process.env.CIM_RECORD) writeFileSync(process.env.CIM_RECORD, await ev('JSON.stringify(__rec)'));
} catch (e) { console.log('[harness error]', e.stack || e); }
finally { try { ws && ws.close(); } catch {} chrome.kill('SIGKILL'); process.exit(0); }
