'use strict';
// ---------------------------------------------------------------------------
// e1m2 The Pits: player, puzzle chain, Satha, Shukeli, the black giant, HUD.
//
// Determinism (README §11): the simulation runs on a fixed 72 Hz tick. Sim
// randomness comes only from the seeded RNG in S.rng; Math.random is used
// for cosmetics (particles, sound) that never feed back. Input is sampled
// per tick, and window.CIM exposes an agent step() API plus a state hash.
// ---------------------------------------------------------------------------

const $ = id => document.getElementById(id);
const canvas = $('gl'), hud = $('hud'), logEl = $('log'), promptEl = $('prompt'), overlay = $('overlay');
const CHEAT = new URLSearchParams(location.search).get('cheat') === 'true';   // ?cheat=true: god mode, and N skips the level
const SIM_HZ = 72, DT = 1 / SIM_HZ, EYE = 1.6, RADIUS = 0.42, REACH = 2.7, TETHER = 3.2;
const BASE_SENS = 0.0022, RES_STEPS = [200, 240, 300, 360, 480, 600], SENS_KEY = 'cimmerian-sens', BRIGHT_KEY = 'cimmerian-bright', VOL_KEY = 'cimmerian-vol', AMB_KEY = 'cimmerian-amb';
const SATHA_SPEED = 7.5, SATHA_SPACING = 2.0, SATHA_SEGS = 12, SATHA_PERIOD = 40;
const GRILLE_X = 34 * CELL, HALL_Z = 14 * CELL;
let resIdx = 3, R = null, levelMesh = null, sensMul = 1, brightness = 1.14;
try { const v = parseFloat(localStorage.getItem(SENS_KEY)); if (v >= 0.1 && v <= 4) sensMul = v; } catch (e) { /* ignore */ }
try { const v = parseFloat(localStorage.getItem(BRIGHT_KEY)); if (v >= 0.8 && v <= 2.2) brightness = v; } catch (e) { /* ignore */ }
let volume = 1, ambience = 1;
try { const v = parseFloat(localStorage.getItem(VOL_KEY)); if (v >= 0 && v <= 1.5) volume = v; } catch (e) { /* ignore */ }
try { const v = parseFloat(localStorage.getItem(AMB_KEY)); if (v >= 0 && v <= 1.5) ambience = v; } catch (e) { /* ignore */ }
Sfx.setVolume(volume); Sfx.setAmbience(ambience);

let mode = 'loading';            // loading | splash | play | paused | dead | done
let S = null;                    // simulation state
const keys = {};
let mouseDX = 0, mouseDY = 0, pressUse = false, pressFire = false, agentInput = null;
let acc = 0, lastFrame = 0, gameTime = 0, fade = 1, fadeTarget = 0, flash = 0, flashCol = [0.75, 0.06, 0.02];
let prev = { x: 0, y: 0, z: 0 }, renderAlpha = 0, hudT = 0, debugOn = false;
let skyMesh = null, particles = [], interactTarget = null, bobPhase = 0, bobAmt = 0, stepAcc = 0, chainSndT = 0, pressKick = false, pressTorch = false, pressThrow = false, pressDrink = false, wantWeapon = null;
let punchPitch = 0, punchYaw = 0;          // cosmetic view kick, never fed back into the sim

const modelCache = new Map();
function getModel(name) {
  let m = modelCache.get(name);
  if (!m) { m = R.createMesh(buildModel(name)); modelCache.set(name, m); }
  return m;
}
// draw a cached model; `light` comes from sampleLight and carries its key direction
// the sword's three cuts (right-to-left, the backhand, overhead), each as key poses [blade dir, fist pos, forearm dir] in view space
const SWORD_CUTS = [
  [[[0.75, 0.55, 0.3], [0.3, 0.0, -0.3], [0.25, -0.85, 0.45]], [[-0.35, 0.3, -0.9], [0.1, -0.08, -0.5], [0.55, -0.45, 0.75]], [[-0.85, -0.15, 0.35], [-0.12, -0.16, -0.42], [0.8, -0.25, 0.55]]],
  [[[-0.8, 0.5, 0.25], [-0.08, 0.02, -0.32], [0.6, -0.7, 0.4]], [[0.25, 0.6, -0.75], [0.1, -0.06, -0.48], [0.75, -0.5, 0.45]], [[0.85, -0.2, 0.2], [0.32, -0.16, -0.4], [0.2, -0.6, 0.8]]],
  [[[0.05, 0.6, 0.8], [0.12, 0.1, -0.26], [0.3, -0.8, 0.5]], [[-0.1, 0.6, -0.8], [0.08, 0.02, -0.45], [0.55, -0.75, 0.35]], [[-0.35, -0.6, -0.7], [0.02, -0.08, -0.48], [0.45, -0.25, 0.85]]]];
// the view-model's pose: where the fist is, which way its grip runs, and which way the forearm runs back to the elbow (view space)
function viewPose(wep, prog, sw, th, sb, cb, combo, parryT) {
  // the swing: dagger and fists thrust; the sword cuts right-to-left, left-to-right, then overhead
  let fwd, pos, arm = [0.62, -0.5, 0.6], blade = null;   // arm: which way the forearm runs back from the fist to the elbow
  // strokes in three beats: draw back (anticipation), the cut (fast, eased out), follow-through and recovery
  const beat = (p, a0, a1) => clamp((p - a0) / (a1 - a0), 0, 1), eOut = t => 1 - (1 - t) * (1 - t) * (1 - t), eIo = t => t * t * (3 - 2 * t);
  const idleF = [-0.1, wep === 'sword' ? 0.75 : wep === 'spear' ? 0.05 : 0.5, -1], idleP = [0.17 - sb, -0.19 + cb, -0.33];
  if (parryT > 0 && (wep === 'sword' || wep === 'spear' || wep === 'dagger')) {          // parry: the blade across the body, high
    const k = Math.sin(Math.min(1, (PARRY.window - parryT) / 0.08) * Math.PI / 2);
    fwd = norm3([lerp(idleF[0], -1, k), lerp(idleF[1], 0.25, k), lerp(idleF[2], -0.35, k)]);
    pos = [lerp(idleP[0], 0.12, k), lerp(idleP[1], -0.05, k), lerp(idleP[2], -0.42, k)];
  } else if (wep === 'sword' && prog > 0) {
    // each cut in key poses (wind-up, mid-cut, follow-through), each [blade direction, fist position, forearm toward the elbow]:
    // the forearm always runs back out of the frame at the lower right, and the wrist cocks the blade off the line of the fist
    const K = SWORD_CUTS[combo], I = [idleF, idleP, [0.62, -0.5, 0.6]];
    const wind = eIo(beat(prog, 0, 0.28)), cut = eOut(beat(prog, 0.28, 0.52)), back = eIo(beat(prog, 0.58, 1));
    const pose = (a, b, t) => a.map((v, i) => (i === 0 ? norm3(v) : v).map((x, j) => lerp(x, (i === 0 ? norm3(b[i]) : b[i])[j], t)));
    let P = pose(I, K[0], wind);
    if (cut > 0) P = cut < 0.5 ? pose(K[0], K[1], cut * 2) : pose(K[1], K[2], cut * 2 - 1);
    if (back > 0) P = pose(K[2], I, back);
    blade = norm3(P[0]); pos = P[1]; arm = P[2];
    const w = wind * (1 - back), An = norm3(arm), bd = blade[0] * An[0] + blade[1] * An[1] + blade[2] * An[2];
    const perp = norm3([blade[0] - An[0] * bd, blade[1] - An[1] * bd, blade[2] - An[2] * bd]);
    // the fist follows the blade until the blade swings past 125 degrees off the forearm; beyond that the wrist takes up the rest
    const cl = bd / Math.hypot(...blade) < -0.57 ? norm3(perp.map((v, i) => v * 0.82 - An[i] * 0.57)) : blade;
    fwd = norm3(blade.map((v, i) => lerp(v, cl[i], w)));
  } else if (wep === 'fists' && prog > 0) {
    // a jab: cock back, then the fist turns over as it drives out, palm down and knuckles to the target,
    // the forearm running straight back below the eye (the elbow drops out of sight, never the arm's cut end in view), and snaps back to guard
    const cock = eIo(beat(prog, 0, 0.22)), drive = eOut(beat(prog, 0.22, 0.46)), ret = eIo(beat(prog, 0.62, 1)), out = drive * (1 - ret);
    const fC = [idleF[0] + 0.15, idleF[1] + 0.2, -1], pC = [idleP[0] + 0.03, idleP[1] - 0.02, idleP[2] + 0.07];
    const fO = [-1, 0.06, 0.38], pO = [0.085, -0.11, -0.46], aO = [0.4, -0.42, 1];
    const c = cock * (1 - drive);
    const turn = eIo(beat(prog, 0.06, 0.26)) * (1 - ret);   // the fist turns over while still low, before it drives: never mid-turn in the middle of the frame
    fwd = norm3(fO.map((v, i) => lerp(lerp(idleF[i], fC[i], c), v, turn)));
    pos = pO.map((v, i) => lerp(lerp(idleP[i], pC[i], c), v, out));
    pos[1] -= 0.08 * Math.sin(Math.PI * turn) * (1 - drive);   // and dips as it turns
    pos[1] -= 0.2 * Math.sin(Math.PI * ret); pos[0] += 0.06 * Math.sin(Math.PI * ret);   // pulled back low and out to the side: the fist turns back over below the frame
    arm = arm.map((v, i) => lerp(v, aO[i], turn));
  } else if ((wep === 'dagger' || wep === 'spear') && prog > 0) {
    // a jab or thrust: cock back, drive straight out, snap back
    const reach = wep === 'spear' ? 0.42 : wep === 'dagger' ? 0.3 : 0.26;
    const cock = eIo(beat(prog, 0, 0.25)), drive = eOut(beat(prog, 0.25, 0.5)), ret = eIo(beat(prog, 0.6, 1));
    const z = idleP[2] + 0.08 * cock - (reach + 0.08) * drive * (1 - ret) + 0.08 * cock * ret * 0;
    const out = drive * (1 - ret);
    fwd = norm3([idleF[0] + 0.05 * cock - 0.05 * out, idleF[1] - 0.25 * out, -1]);
    pos = [idleP[0] - 0.08 * out + 0.03 * cock, idleP[1] + 0.03 * cock + 0.06 * out, z + 0.08 * cock * (1 - drive)];
  } else {
    fwd = norm3([idleF[0] - sw * 0.05, idleF[1] - sw * 0.35 + th * 0.4, -1]);
    pos = [idleP[0] + fwd[0] * sw * 0.16, idleP[1] + fwd[1] * sw * 0.16 + th * 0.06, idleP[2] + fwd[2] * sw * 0.16];
  }
  fwd = norm3(fwd);
  // the hand's frame: X back along the grip, Z up the forearm toward the elbow
  const frame = (f, p) => {
    const X = [-f[0], -f[1], -f[2]], ad = arm[0] * X[0] + arm[1] * X[1] + arm[2] * X[2];
    const Z = norm3([arm[0] - X[0] * ad, arm[1] - X[1] * ad, arm[2] - X[2] * ad]), Y = cross3(Z, X);
    return new Float32Array([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, p[0], p[1], p[2], 1]);
  };
  const hand = frame(fwd, pos);
  let swordAt = hand;
  if (blade) {                                          // the blade on its own line, pivoting about the grip
    const ap = (m, v) => [0, 1, 2].map(i => m[i] * v[0] + m[4 + i] * v[1] + m[8 + i] * v[2] + m[12 + i]);
    const g = ap(hand, GRIP_C), gr = ap(frame(blade, [0, 0, 0]), GRIP_C);
    swordAt = frame(blade, [g[0] - gr[0], g[1] - gr[1], g[2] - gr[2]]);
  }
  // the upper arm: from inside the forearm's elbow end back to the shoulder, behind and below the eye
  const ap = (m, v) => [0, 1, 2].map(i => m[i] * v[0] + m[4 + i] * v[1] + m[8 + i] * v[2] + m[12 + i]);
  const E = ap(hand, [-0.003, 0.0, 0.24]), Sh = [0.24 - sb, -0.36 + cb, 0.16], L = [Sh[0] - E[0], Sh[1] - E[1], Sh[2] - E[2]];
  const ux = norm3(cross3(norm3(L), [hand[4], hand[5], hand[6]])), uy = norm3(cross3(ux, norm3(L)));
  const upper = new Float32Array([ux[0], ux[1], ux[2], 0, uy[0], uy[1], uy[2], 0, L[0], L[1], L[2], 0, E[0], E[1], E[2], 1]);
  return { hand, swordAt, blade, upper };
}
// Satha's colouring: a dark hide, dimmed head, and only a faint sheen of her own
const SATHA_HIDE = [28, 27, 20], SATHA_HEAD_L = [0.85, 0.85, 0.88], SATHA_GLOW = 0.04;
function drawM(name, m, light, glow = 0, alpha = 1) {
  R.key = light.d || [0.3, 0.9, 0.3];
  R.drawEntity(getModel(name), m, light, glow, alpha, UV_MODELS.has(name) || name.endsWith(':face') || name.startsWith('char:thing'));
}

// ---------------------------------------------------------------- text log
function log(text, cls = '') {
  if (!text) return;
  const last = logEl.lastElementChild;                  // the same line again: count it, don't repeat it
  if (last && last.dataset.text === text) { last.dataset.n = (+last.dataset.n || 1) + 1; last.textContent = text + '  (\u00d7' + last.dataset.n + ')'; last.dataset.t = typeof S !== 'undefined' && S ? S.tick : 0; last.style.opacity = 1; return; }
  const el = document.createElement('div');
  el.dataset.text = text;
  el.className = 'line ' + cls;
  el.textContent = text;
  el.dataset.t = typeof S !== 'undefined' && S ? S.tick : 0;   // lines fade by game time, so a sped-up replay reads the same
  logEl.appendChild(el);
  while (logEl.children.length > 40) logEl.removeChild(logEl.firstChild);
}
function fadeLog() {
  if (!S) return;
  for (const el of [...logEl.children]) {
    const age = (S.tick - (+el.dataset.t || 0)) / SIM_HZ;
    if (age < 0) { el.dataset.t = S.tick; continue; }                 // a new level restarted the clock
    const o = clamp(1 - (age - 14) / 2.5, 0, 1);
    if (o <= 0) el.remove(); else el.style.opacity = o;
  }
}
// the closing scene (LEVEL.cine: e1m8's eagle): seconds since it began, or -1
function cineT(alpha = 0) {
  const C = LEVEL && LEVEL.cine; if (!C || !S || !S.beats || !S.beats.fired.has(C.from)) return -1;
  return (S.tick - S.beats.when[C.from]) / SIM_HZ + alpha * DT;
}
// the camera swings slowly round the fallen wizard and rises, watching the eagle stoop on him and climb away into the sunset
function cineCam(alpha) {
  const t = cineT(alpha); if (t < 0) return null;
  const f = S.foes.find(q => q.cls === LEVEL.cine.foe); if (!f) return null;
  const E = typeof tsothaEnd === 'function' ? tsothaEnd(f, t) : { head: [f.x, f.y + 0.4, f.z], body: [f.x, f.y + 1, f.z], eagle: null };
  const gy = groundInfo(f.x, f.z).floor, sun = norm3(LEVEL.sun || [-1, 0.06, 0.2]);
  // four shots: the head where it fell; the eagle taking it up; the headless body rising and stumbling away; the sunset
  const west = [f.x + sun[0] * 140, gy + 16, f.z + sun[2] * 140], eagle = E.eagle ? [E.eagle[0], E.eagle[1], E.eagle[2]] : west;
  const shots = [[0, E.head], [2.3, eagle], [RISE0 - 0.4, E.body], [RISE0 + 5.5, west]];
  let tg = shots[0][1];
  for (let k = 1; k < shots.length; k++) { const w = smoothstep(shots[k][0], shots[k][0] + 0.9, t); tg = [lerp(tg[0], shots[k][1][0], w), lerp(tg[1], shots[k][1][1], w), lerp(tg[2], shots[k][1][2], w)]; }
  const a0 = Math.atan2(S.x - f.x, S.z - f.z), a = a0 + t * 0.12, r = lerp(4.2, 8.5, smoothstep(RISE0, RISE0 + 5, t)), up = lerp(1.7, 3.2, smoothstep(2, RISE0 + 5, t));
  const eye = [f.x + Math.sin(a) * r, gy + up, f.z + Math.cos(a) * r];
  const dx = tg[0] - eye[0], dy = tg[1] - eye[1], dz = tg[2] - eye[2];
  return { eye, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
// Cheat mode: the AI plays the level for you. It replays the golden bot's recorded run (game/autoplay/<level>.json,
// made by test/record_autoplay.sh) tick by tick in real time, from a fresh start of the level, exactly as the test
// replays it. Any key takes back control.
let AUTO = null;
const AUTO_FRESH = () => ({ health: 100, weapons: { fists: true, dagger: false, sword: false }, weapon: 'fists', kills: 0, deaths: 0, hints: [], playTicks: 0 });
function startAutoplay(speed) {
  const id = LEVEL.level, x = new XMLHttpRequest();
  x.open('GET', 'autoplay/' + id + '.json'); x.responseType = 'text';
  x.onload = () => {
    let R; try { R = JSON.parse(x.responseText); } catch (e) { log('[No recorded run for ' + id + '.]', 'bad'); return; }
    hideOverlay();
    if (R[0][0] !== 'load') loadLevel(id);               // e1m2's run begins as the game does
    AUTO = { R, i: 0, done: 0, acc: 0, speed }; agentInput = {}; mode = 'splash';
    log('[The AI plays ' + LEVEL.title + (speed > 1 ? ' at ' + speed + '× speed' : '') + '. Press any key to take back control.]', 'dim');
  };
  x.onerror = () => log('[No recorded run for ' + id + '.]', 'bad');
  x.send();
}
function autoplayFrame(dt) {
  const A = AUTO; A.acc += dt * SIM_HZ * A.speed;
  let n = 0;
  while (AUTO && A.acc >= 1 && n < 60 && (mode === 'play' || mode === 'splash' || mode === 'dead')) {
    if (A.i >= A.R.length) { AUTO = null; agentInput = null; return; }
    const [a, k] = A.R[A.i];
    if (a === 'load') { loadLevel(k, AUTO_FRESH()); mode = 'splash'; A.i++; continue; }
    let act = a;
    if (A.done > 0) act = Object.assign({}, a, { use: false, torch: false, attack: false, parry: false, kick: false, throwSpear: false, drink: false, weapon: undefined });
    if (A.done + 1 < k) act = Object.assign({}, act, { respawn: false });
    prev = { x: S.x, y: S.y, z: S.z };
    CIM.step(act, 1); A.done++; A.acc -= 1; n++;
    if (A.done >= k) { A.i++; A.done = 0; }
  }
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------------------------------------------------------------- state
const W = (gx, gz) => ({ x: gx * CELL, z: gz * CELL });
function feature(type) { return LV.features.find(f => f.type === type); }
function entitySpec(cls) { return LEVEL.entities.find(e => e.class === cls); }

// Satha's track: up out of the well, along the hall, into the serpent's hole
// and down into the rock. Corners are rounded so the body flows through them.
let SATHA_PATH = null, SATHA_PATHS = {};
function roundedPath(pts, rad) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const d1 = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), d2 = norm3([c[0] - b[0], c[1] - b[1], c[2] - b[2]]);
    const p0 = [b[0] - d1[0] * rad, b[1] - d1[1] * rad, b[2] - d1[2] * rad], p2 = [b[0] + d2[0] * rad, b[1] + d2[1] * rad, b[2] + d2[2] * rad];
    for (let k = 0; k <= 5; k++) { const t = k / 5, u = 1 - t; out.push([0, 1, 2].map(j => u * u * p0[j] + 2 * u * t * b[j] + t * t * p2[j])); }
  }
  out.push(pts[pts.length - 1]);
  const cum = [0];
  for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1], out[i][2] - out[i - 1][2]));
  return { pts: out, cum, len: cum[cum.length - 1] };
}
function buildSathaPath() {
  if (LEVEL.satha) {                                     // a level's own road for her (e1m3: out of her hole and down the main corridor)
    SATHA_PATHS.regular = SATHA_PATHS.vault = roundedPath(LEVEL.satha.path.map(([x, y, z]) => [x * CELL, y, z * CELL]), 2.6);
    SATHA_PATH = SATHA_PATHS.regular; return;
  }
  const wx = 4 * CELL, tx = 28 * CELL, y = 0.85, ax = 7.5 * CELL;
  const tail = [[tx, y, HALL_Z], [tx, y, 12.3 * CELL], [tx, -14 + y, 4.5 * CELL], [tx, -52, 3.6 * CELL]];
  SATHA_PATHS.regular = roundedPath([[wx, -36, HALL_Z], [wx, y, HALL_Z]].concat(tail), 2.6);
  // "Satha came out of the dark ... the head was poised high above his own, as the monster
  // investigated the torch": up the arch, a slow circle round the vault, and out again
  // she circles the far side of the vault, two metres off the chained king, and only her head comes to him
  SATHA_PATHS.vault = roundedPath([[wx, -36, HALL_Z], [wx, y, HALL_Z], [ax, y, HALL_Z], [ax, y, 11.6 * CELL], [9.1 * CELL, y, 11.0 * CELL],
    [9.3 * CELL, y, 9.4 * CELL], [8.6 * CELL, y, 8.5 * CELL], [7.8 * CELL, y, 8.8 * CELL], [7.75 * CELL, y, 9.9 * CELL], [8.1 * CELL, y, 11.1 * CELL], [ax, y, 12.6 * CELL], [9.5 * CELL, y, HALL_Z]].concat(tail), 1.3);
  SATHA_PATH = SATHA_PATHS.regular;
}
function sathaCycle() { const st = S.satha.start; return st === null || S.tick < st ? -1 : Math.floor((S.tick - st) / (SATHA_PERIOD * SIM_HZ)); }
function selectSathaPath() {
  const sp = entitySpec('scripted_satha'), c = sathaCycle();
  SATHA_PATH = sp && c >= 0 && c < (sp.vaultPasses || 0) ? SATHA_PATHS.vault : SATHA_PATHS.regular;
}
function inVault(x, z) { const i = cellIdx(Math.floor(x / CELL), Math.floor(z / CELL)); const r = i >= 0 && LV.room[i] >= 0 ? LV.rooms[LV.room[i]].id : ''; return r === 'cell' || r === 'arch'; }
function pathAt(s) {
  const P = SATHA_PATH;
  if (s <= 0) { const p = P.pts[0]; return [p[0], p[1] + s, p[2]]; }
  if (s >= P.len) { const a = P.pts[P.pts.length - 2], b = P.pts[P.pts.length - 1], d = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), e = s - P.len; return [b[0] + d[0] * e, b[1] + d[1] * e, b[2] + d[2] * e]; }
  let lo = 0, hi = P.cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.cum[m] <= s) lo = m; else hi = m; }
  const t = (s - P.cum[lo]) / (P.cum[hi] - P.cum[lo] || 1), a = P.pts[lo], b = P.pts[hi];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
const BODY_LEN = (SATHA_SEGS + 1) * SATHA_SPACING + 1.2;
// the slithering spine: the track plus a lateral wave fixed to track position
// Serpentine motion (lateral undulation): every point of the body follows the
// same track, so the track IS the motion. The track is a serpenoid curve
// (Hirose): heading = alpha * sin(2*pi*s / lambda) around the path, so its
// curvature varies smoothly instead of being a sine wobble glued on top.
// alpha ~ 35 degrees, lambda ~ half a body length: about two waves along her.
const SERP_ALPHA = 0.8, SERP_LAMBDA = 11;   // a lateral swing of 1.4 m: clear S-curves, still inside the 5 m corridor
const SERP_K = 2 * Math.PI / SERP_LAMBDA, SERP_AMP = SERP_ALPHA / SERP_K;    // lateral amplitude of that heading swing
function spineAt(s) {
  const p = pathAt(s), q = pathAt(s + 0.3), r = pathAt(s - 0.3);
  const tx = q[0] - r[0], tz = q[2] - r[2], th = Math.hypot(tx, tz), tl = Math.hypot(tx, q[1] - r[1], tz) || 1;
  // integrating heading alpha*sin(ks) gives a lateral offset of (alpha/k) * (1 - cos(ks)); centre it on the path
  const horiz = th / tl, ramp = smoothstep(0, 6, s - 36) * (inVault(p[0], p[2]) ? 0.12 : 1);   // straight out of the well, and in the narrow vault
  const lat = -SERP_AMP * Math.cos(SERP_K * s) * horiz * ramp;
  return th > 1e-4 ? [p[0] - tz / th * lat, p[1], p[2] + tx / th * lat] : p;
}
// her speed surges with each push of the body against the ground, rather than gliding at a constant rate
function sathaS(t) { return SATHA_SPEED * t + (0.22 / SERP_K) * Math.sin(t * SATHA_SPEED * SERP_K); }   // speed swings ±22%, one push per wave
// rest the body on the floor: belly down, whatever the radius at that point of her
function onFloor(p, r) {
  const g = groundInfo(p[0], p[2]);
  if (g.kind === 1 && p[1] < g.floor + 2.5) p[1] = g.floor + r * 0.8 + 0.02;
  return p;
}
const SATHA_CHUNKS = 1;   // one tube: each ring carries its own light (buildSathaTube shade), so no seams
let sathaMeshes = null;
const sathaRadius = t => t < 0.16 ? 0.4 + 0.45 * smoothstep(0.01, 0.16, t) : t < 0.45 ? 0.85 + 0.03 * smoothstep(0.16, 0.45, t) : Math.max(0.04, 0.88 * Math.pow(1 - (t - 0.45) / 0.55, 0.85));   // a viper's narrow neck behind the broad head, swelling into the body
// head (i=0), segments, tail: positions with a slither offset baked into the track
function sathaPoints(sHead) {
  const out = [];
  for (let i = 0; i <= SATHA_SEGS + 1; i++) {
    const s = sHead - (i === SATHA_SEGS + 1 ? SATHA_SEGS * SATHA_SPACING + 1.6 : i * SATHA_SPACING);
    const p = spineAt(s), q = spineAt(s + 0.3), r = spineAt(s - 0.3);
    const tx = q[0] - r[0], ty = q[1] - r[1], tz = q[2] - r[2], th = Math.hypot(tx, tz), tl = Math.hypot(tx, ty, tz) || 1;
    const yaw = th / tl < 0.2 ? (s < SATHA_PATH.len / 2 ? Math.PI / 2 : Math.PI) : Math.atan2(tx, tz);
    out.push({ x: p[0], y: p[1], z: p[2], yaw, pitch: -Math.atan2(ty, th), r: i === 0 ? 0.95 : 0.8 * (1 - 0.35 * i / (SATHA_SEGS + 1)) });
  }
  return out;
}

function newState(seed, carry) {
  const start = entitySpec('info_player_start'), sp = W(start.at[0], start.at[1]);
  const g = entitySpec('black_giant'), gp = g ? W(g.at[0], g.at[1]) : { x: -1e4, z: -1e4 };
  const sh = entitySpec('monster_shukeli'), shp = sh ? W(sh.at[0], sh.at[1]) : { x: -1e4, z: -1e4 };
  const fixed = ['cell_door', 'grille_gate', 'portcullis'];
  const armed = LEVEL.arms ? { fists: true, dagger: false, sword: true } : null;
  return {
    seed, level: LEVEL.level, tick: 0, rng: new RNG(hash4(seed, 0xC1, LEVEL.level.charCodeAt(3), 0)),
    x: sp.x, y: 0, z: sp.z, yaw: start.yaw, pitch: -0.12, vx: 0, vy: 0, vz: 0, onGround: true,
    health: carry ? Math.max(60, carry.health) : 100, deaths: carry ? carry.deaths : 0, passes: 0, kills: carry ? carry.kills : 0,
    flags: Object.fromEntries(LEVEL.puzzle.flags.map(f => [f, false])),
    read: new Set(), visited: new Set(), room: '', hints: carry ? new Set(carry.hints) : new Set(),
    items: LV.items.map(it => Object.assign({}, it, { taken: false })),
    door: { open: 0, target: 0 }, grille: { open: 0, target: 0 },
    giant: { state: g ? 'wait' : 'gone', x: gp.x, z: gp.z, y: 0, yaw: Math.PI, t: 0, walk: 0,  wp: 0, arms: 0, grabT: 0, fall: 0 },
    satha: { start: entitySpec('scripted_satha') ? -Math.round(8 * SIM_HZ) : null, active: false, cool: 0, spitCool: 0, pts: null, warned: 0, lastPhase: -1, dripCycle: -1 },
    shukeli: { state: sh ? 'away' : 'gone', x: shp.x, z: shp.z, homeX: shp.x, homeZ: shp.z, yaw: -Math.PI / 2, t: 0, walk: 0, tx: 0, tz: 0, sawT: 0, tauntT: 6, ignoreT: 0, fall: 0, seenOnce: false },
    proj: [], puddles: [], swing: 0, swingLen: 0.4, throwT: 0, kickT: 0, parryT: 0, parryCool: 0, spearUses: 0, spears: carry && carry.spears && !LEVEL.strip ? carry.spears.slice() : [], pouch: carry && carry.pouch && !LEVEL.strip ? carry.pouch.map(p => Object.assign({}, p)) : [], combo: 0, lastSwing: -999, pendingHit: null,
    weapons: armed || (carry && !LEVEL.strip ? Object.assign({}, carry.weapons) : { fists: true, dagger: false, sword: false }), weapon: armed ? 'sword' : carry && !LEVEL.strip ? carry.weapon : 'fists', hits: 0,
    foes: newFoes(), alerted: new Set(), areas: new Set([LEVEL.areas[0].id]), portc: { open: 0, target: 0, dropT: 0 },
    gates: Object.fromEntries(LEVEL.links.filter(l => !fixed.includes(l.name)).map(l => [l.name, { open: 0, target: 0 }])),
    wind: 0, windNow: 0, windSnd: 0,
    checkpoint: { x: sp.x, z: sp.z, yaw: start.yaw }, timeFree: -1, doneT: -1, playTicks: carry ? carry.playTicks : 0,
    planks: LV.planks.map(() => ({ state: 'whole', t: 0, fall: 0 })),
    shamu: LEVEL.level === 'e1m1' ? { vt: 0, shout: false, cool: 0, woke: new Set(), phase: 'fight', t: 0, line: 0, hoof: [-1, -1, -1],
      tsotha: { state: 'away', x: LEVEL.kings.tsotha[0] * CELL, z: LEVEL.kings.tsotha[1] * CELL, yaw: -Math.PI / 2, t: 0, walk: 0 } } : null,
    paralysed: 0,
    torch: LEVEL.torch ? 'lit' : 'none',               // e1m3: lit, dropped (an ember on the ground), or out (shaken out)
    tun: LEVEL.level === 'e1m3' ? { weepT: 2, woke: false, gt: 0, side: -1, pres: 'calm', pt: 0, rises: 0, draft: [0, 0], fear: 0 } : null,
  };
}

// ---------------------------------------------------------------- light
// Light at a point, as Quake lit its alias models: a colour plus a key
// direction (toward the strongest nearby lights) so models show their form.
function sampleLight(x, y, z) {
  const A = LEVEL.ambient || AMBIENT;
  let r = A[0], g = A[1], b = A[2], kx = 0.1, ky = 0.35, kz = 0.05;
  for (const l of LV.lights) {
    const dx = l.x - x, dy = l.y - y, dz = l.z - z, d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > l.rad * l.rad) continue;
    const d = Math.sqrt(d2) || 1e-3;
    let a = 1 - d / l.rad; a = a * a * l.i * 0.7;
    r += l.r * a; g += l.g * a; b += l.b * a;
    const w = a * (l.r + l.g + l.b);
    kx += dx / d * w; ky += dy / d * w; kz += dz / d * w;
  }
  const out = [r, g, b];
  out.d = norm3([kx, ky, kz]);
  return out;
}
function rotDir(m, v) { return norm3([m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]]); }

// ---------------------------------------------------------------- physics
function linkClosed(idx) {
  for (const l of LEVEL.links) for (const [gx, gz] of l.cells) if (gz * LV.W + gx === idx) return (l.name === 'cell_door' ? S.door.open : l.name === 'portcullis' ? S.portc.open : l.name === 'grille_gate' ? S.grille.open : S.gates[l.name].open) < 0.8;
  return false;
}
function blockedCell(gx, gz, feet, foe) {
  const idx = cellIdx(gx, gz);
  if (foe && idx >= 0 && LV.deep[idx]) return true;                 // monsters never go over the edge of a deep pit, or into the water
  if (idx < 0 || LV.kind[idx] === 0) return true;
  if (LV.flags[idx] & F_NOPASS) return true;
  if (LV.blockers.has(idx) && linkClosed(idx) && !GRILLE_CELLS.has(idx)) return true;   // the grille is a plane of bars, handled in collide()
  return LV.kind[idx] === 1 && LV.floor[idx] > feet + 1.25;
}
function dynColliders(self) {
  const c = [];
  const sh = S.shukeli; if (sh.state !== 'dead') c.push({ x: sh.x, z: sh.z, r: 0.55 });
  const g = S.giant; if (g.state !== 'crushed') c.push({ x: g.x, z: g.z, r: 0.6 });
  for (const f of S.foes) if (!f.dead && f !== self) c.push({ x: f.x, z: f.z, r: 0.42 });
  if (self) c.push({ x: S.x, z: S.z, r: RADIUS });
  // Satha's body is solid: you cannot walk through her coils (only lie still while she passes)
  else if (S.satha.pts && (!entitySpec('scripted_satha') || S.flags.free)) {
    const py = S.y + 0.9;
    for (const p of S.satha.pts) if (Math.abs(p.y - py) < p.r + 1.0) c.push({ x: p.x, z: p.z, r: p.r });
  }
  return c;
}
const GRILLE_CELLS = new Set();
function collide(x, z, r, feet, self, knocked) {
  const grille = LEVEL.links.find(l => l.name === 'grille_gate');
  if (grille && !GRILLE_CELLS.size) for (const [gx, gz] of grille.cells) GRILLE_CELLS.add(gz * LV.W + gx);
  const cols = LV.colliders.concat(dynColliders(self));
  // the closed grille: bars on the plane x = GRILLE_X, so men on either side can fight through them
  if (grille && S.grille.open < 0.8 && z > 13 * CELL - r && z < 15 * CELL + r) {
    const east = (self ? self.x : S.x) > GRILLE_X;
    x = east ? Math.max(x, GRILLE_X + r) : Math.min(x, GRILLE_X - r);
  }
  for (let it = 0; it < 3; it++) {
    for (const c of cols) {
      const dx = x - c.x, dz = z - c.z, rr = r + c.r, d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 < 1e-8) continue;
      const d = Math.sqrt(d2); x += dx / d * (rr - d); z += dz / d * (rr - d);
    }
    const gx0 = Math.floor((x - r) / CELL), gx1 = Math.floor((x + r) / CELL), gz0 = Math.floor((z - r) / CELL), gz1 = Math.floor((z + r) / CELL);
    for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) {
      if (!blockedCell(gx, gz, feet, !!self && !knocked)) continue;   // a monster won't walk into a pit; a blow can still send him over
      const minx = gx * CELL, maxx = minx + CELL, minz = gz * CELL, maxz = minz + CELL;
      const px = clamp(x, minx, maxx), pz = clamp(z, minz, maxz), dx = x - px, dz = z - pz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); x += dx / d * (r - d); z += dz / d * (r - d); }
      else {
        const dl = x - minx, dr = maxx - x, dn = z - minz, ds = maxz - z, m = Math.min(dl, dr, dn, ds);
        if (m === dl) x = minx - r; else if (m === dr) x = maxx + r; else if (m === dn) z = minz - r; else z = maxz + r;
      }
    }
  }
  return [x, z];
}
function camFwd() { const cp = Math.cos(S.pitch); return [-Math.sin(S.yaw) * cp, Math.sin(S.pitch), -Math.cos(S.yaw) * cp]; }
function hiddenAt(x, z) { const g = groundInfo(x, z); return !!(g.flags & F_HIDE); }

function updatePlayer(inp) {
  const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);
  const ix = fx * inp.fwd + rx * inp.side, iz = fz * inp.fwd + rz * inp.side, il = Math.hypot(ix, iz);
  if (S.plankDrop > 0) { S.plankDrop -= DT; inp = Object.assign({}, inp, { fwd: 0, side: 0, jump: false }); S.vx *= 0.8; S.vz *= 0.8; }   // falling with the plank: nothing to push off
  const speed = inp.run ? 7.2 : 4.4;
  const wx = il ? ix / il * speed : 0, wz = il ? iz / il * speed : 0;
  const k = Math.min(1, (S.onGround ? 14 : 2.5) * DT);
  S.vx += (wx - S.vx) * k; S.vz += (wz - S.vz) * k;
  const sp = Math.hypot(S.vx, S.vz), ox = S.x, oz = S.z;
  const steps = Math.max(1, Math.ceil(sp * DT / 0.3));
  for (let i = 0; i < steps; i++) { const r = collide(S.x + S.vx * DT / steps, S.z + S.vz * DT / steps, RADIUS, S.y); S.x = r[0]; S.z = r[1]; }
  if (feature('ring') && !S.flags.free) {                  // the chain: README e1m2 "chain-length radius"
    const ring = feature('ring'), dx = S.x - ring.x, dz = S.z - ring.z, d = Math.hypot(dx, dz);
    if (d > TETHER) { S.x = ring.x + dx / d * TETHER; S.z = ring.z + dz / d * TETHER; if (chainSndT <= 0 && sp > 1) { Sfx.chain(); chainSndT = 0.8; } }
  }
  let g = groundInfo(S.x, S.z);
  if (g.kind === 0) { S.x = ox; S.z = oz; g = groundInfo(S.x, S.z); }
  if (inp.jump && S.onGround) { S.vy = 6.8; S.onGround = false; }
  if (S.onGround && S.vy <= 0 && S.y - g.floor < 0.8) { S.y = g.floor; S.vy = 0; }
  else { S.vy -= 24 * DT; S.y += S.vy * DT; }
  if (S.y <= g.floor) {
    if (S.vy < -15) { Sfx.thud(); const dmg = Math.round((-S.vy - 15) * 6); if (dmg > 2) hurt(dmg, 'fall'); }
    S.y = g.floor; S.vy = 0;
  }
  S.onGround = S.y - g.floor < 0.02;
  if (g.kind && S.y + 1.8 > g.ceil) { S.y = Math.max(g.floor, g.ceil - 1.8); if (S.vy > 0) S.vy = 0; }
  return { g, sp };
}

// ---------------------------------------------------------------- damage & death
const DEATHS = {
  stakes: 'You go onto the sharpened stakes, and they hold you there.',
  fire: 'The globe bursts against you in a sheet of green fire, and you burn.',
  roots: 'You set your hands to the roots, and something below the stone takes hold of them. "Yothga\'s roots are set in hell."',
  drown: 'You go down the bank into the black water. The mail you fought in drags you under, and the plain goes on without you.',
  crush: 'Satha\'s coils roll over you like a landslide of white iron. Bones go like kindling.',
  blunder: 'You blunder into the great sliding body. The coils close on you like a fist, and the pits grow very quiet.',
  bite: 'The great head strikes faster than thought. The pits grow very quiet.',
  venom: 'The venom eats through you like fire through dry grass. You die on the flagstones of the hall.',
  fall: 'You go over the lip of the serpent\'s well. The dark below has no bottom that you live to find.',
  strangle: 'The giant\'s hands close and do not open again.',
  blade: 'A warden\'s blade finds you. The pits keep their prisoner after all.',
  spear: 'The spear goes in under your ribs, and the dark comes up to meet you.',
  arrow: 'The arrow takes you in the throat. You drown on dry stone.',
  axe: 'The long axe comes down like a falling tree.',
  trample: 'The charge rides you down. Hooves, and then nothing.',
  claws: 'They are on you in the dark, all claws and dripping jaws, and the pits keep what they catch.',
  weeper: 'The quaking mass flows over you, and its laughter is the last thing you hear.',
};
function hurt(n, why) {
  if (mode !== 'play') return;
  if (CHEAT && !AUTO) { flash = Math.min(0.3, flash + n / 140); flashCol = [0.75, 0.06, 0.02]; return; }   // god mode: you feel it, and nothing more (not while the AI plays: its run was recorded mortal)
  S.health -= n;
  if (why === 'venom') flashCol = [0.12, 0.55, 0.3]; else flashCol = [0.75, 0.06, 0.02];
  flash = Math.min(0.6, flash + n / 70);
  if (n >= 5) Sfx.hurt();
  if (S.health <= 0) { S.health = 0; die(why); }
}
function die(why) {
  if (mode !== 'play') return;
  if (CHEAT && !AUTO) {                                   // god mode: a fatal fall puts you back at the last safe place
    const c = S.checkpoint; S.x = c.x; S.z = c.z; S.y = groundInfo(c.x, c.z).floor; S.vx = S.vy = S.vz = 0; prev = { x: S.x, y: S.y, z: S.z };
    return;
  }
  mode = 'dead'; S.deaths++;
  Sfx.die(); fadeTarget = 0.75;
  log(DEATHS[why] || 'You are slain.', 'bad');
  document.exitPointerLock && document.exitPointerLock();
  overlay.className = '';
  overlay.innerHTML = '<div class="panel"><h2>You are slain.</h2><p>' + (DEATHS[why] || '') + '</p>' +
    '<p class="sub">But the tale is not yet told. Rise again at the last safe place.</p><div class="btns"><button id="bRise">Rise again (Enter)</button></div></div>';
  $('bRise').onclick = respawn;
}
function respawn() {
  if (mode !== 'dead') return;
  overlay.className = 'hidden'; overlay.innerHTML = '';
  const c = S.checkpoint;
  S.x = c.x; S.z = c.z; S.yaw = c.yaw; S.y = groundInfo(c.x, c.z).floor; S.vx = S.vy = S.vz = 0; S.health = 100;
  prev = { x: S.x, y: S.y, z: S.z };
  S.puddles = []; S.proj = S.proj.filter(p => p.type === 'bone');
  // the living go back to their posts, but keep their wounds, as Quake's monsters did
  for (const f of S.foes) if (!f.dead && f.state !== 'dormant' && f.state !== 'lurk') Object.assign(f, { x: f.homeX, z: f.homeZ, yaw: f.homeYaw, state: 'idle', alert: false, t: 0, vx: 0, vz: 0, combo: 0, y: groundInfo(f.homeX, f.homeZ).floor });
  S.pendingHit = null; S.swing = S.kickT = 0;
  mode = 'play'; fade = 1; fadeTarget = 0;
  log('You come to yourself again, cold and aching, at the last safe place.', 'dim');
  if (!agentInput) lockPointer();
}

// ---------------------------------------------------------------- the puzzle chain
function setFlag(f) { if (!S.flags[f]) { S.flags[f] = true; Sfx.blip(); } }
function freeFromChain() {
  setFlag('free');
  S.timeFree = S.tick;
  S.giant.state = 'raise'; S.giant.t = 0;
  S.satha.start = S.tick + Math.round(2.5 * SIM_HZ);     // the first pass is scripted to meet the giant
  S.checkpoint = { x: 8.5 * CELL, z: 10 * CELL, yaw: Math.PI };
  Sfx.grind(); setTimeout(() => Sfx.snap(), 700);
  log('You find the fourth link, scabbed with rust, and grind it against the sill-stone until it parts with a crack. The chain falls away.', 'good');
}
function interact() {
  const t = interactTarget;
  if (!t) return;
  if (t.type === 'item') { takeItem(t.it); return; }
  const f = t.f;
  switch (f.type) {
    case 'ring':
      if (S.flags.free) { log('The open shackle hangs from the ring.', 'dim'); return; }
      Sfx.chain(); log('The chain is short and fast to a ring set deep in the stone. No man could work it loose.', 'dim');
      return;
    case 'niche_torch':
      if (!S.flags.free) { log('The torch burns in its niche, above your head and out of reach of your chained hands.', 'dim'); return; }
      if (!S.flags.shukeli_dead) { log('Not now. The grille!', 'dim'); return; }
      setFlag('has_torch'); Sfx.pickup(); log('You take the torch from its niche, and go to seek another way out of the vault: through the dark arch, into the pits.', 'good');
      return;
    case 'clue':
      log(f.text, 'clue'); S.read.add(f.id); Sfx.blip(); return;
    case 'bones':
      if (S.flags.has_bone) { log('You already have a bone in hand.', 'dim'); return; }
      setFlag('has_bone'); Sfx.clatter();
      log('You pull a long thighbone from the heap. It is heavy enough to make a fine clatter. (Click to throw it.)');
      return;
    case 'door':
      if (S.flags.shukeli_dead) log('Your keys are futile against the bolt: it can be worked only from the outside. The bars are as hard as your sword.', 'dim');
      else log('The grille is iron, and dented with marks like the marks of incredible fangs.', 'dim');
      return;
    case 'grille':
      if (S.grille.target > 0) return;
      if (S.flags.has_keys) {
        setFlag('grille_open'); S.grille.target = 1; Sfx.clank(); Sfx.bars();
        S.checkpoint = { x: 36 * CELL, z: HALL_Z, yaw: -Math.PI / 2 };
        log('The third key turns. You heave, and the grille grinds up into the dark of the ceiling.', 'good');
        return;
      }
      if (S.shukeli.state !== 'dead') {
        log('The grille is locked. Beyond it, the jailer looks up from his wine and titters at you.', 'dim');
        if (!S.hints.has('grille')) { S.hints.add('grille'); log('(Shukeli wears the keys at his belt.)', 'dim'); }
      } else log('Locked. The jailer\'s keys lie on the flagstones at your feet.', 'dim');
      return;
    case 'spear_rack':
      if (S.flags.has_spear) { log('You already carry a spear.', 'dim'); return; }
      setFlag('has_spear'); Sfx.pickup(); log('You take a spear from the rack and sling it across your back.');
      return;
    case 'winch':
      if (S.flags.portcullis_open) { log('The spear shaft holds the ratchet fast. The portcullis stays up.', 'dim'); return; }
      Sfx.grind(); Sfx.chain();
      if (S.flags.has_spear) {
        S.portc.target = 1; S.portc.dropT = 0; S.flags.has_spear = false; setFlag('portcullis_open');
        S.checkpoint = { x: 44 * CELL, z: HALL_Z, yaw: -Math.PI / 2 };
        log('You haul the crank round until the portcullis is high, then ram the spear shaft into the ratchet. It groans, and holds.', 'good');
      } else {
        S.portc.target = 0.75; S.portc.dropT = 2.4;
        log('You heave the crank round and the portcullis rises, inch by inch... and the moment you ease off, the broken pawl slips.', 'warn');
        if (!S.hints.has('winch')) { S.hints.add('winch'); log('(Something long and stout in the ratchet would hold it. Read the housing.)', 'dim'); }
      }
      return;
  }
}
function takeItem(it) {
  if (it.heal) {
    if (S.health < 100) { it.taken = true; eat(it); return; }
    if (!stow(it)) log('You are not hurt, and your satchel is full. You leave the ' + it.name.replace(/^(a|an|the) /, '') + ' for later.', 'dim');
    return;
  }
  if (it.kind === 'bone') {
    if (S.flags.has_bone) { log('One bone in hand is enough.', 'dim'); return; }
    it.taken = true; setFlag('has_bone'); Sfx.pickup(); log('You pick up the thighbone again.'); return;
  }
  it.taken = true; Sfx.pickup();
  if (it.kind === 'dagger') {
    S.weapons.dagger = true; if (S.weapon === 'fists') S.weapon = 'dagger';
    log('You take the dagger.', 'good');
  } else if (it.kind === 'sword') {
    S.weapons.sword = true; S.weapon = 'sword';
    if (S.flags.has_sword === false) {
      setFlag('has_sword');
      log('You take up the black\'s huge sword, and your hand knows it at once. Now for the grille! (Click to strike; click, click, click for a combination; right-click or F to parry.)', 'good');
      const w0 = S.foes.find(f => f.id === 'w0');
      if (w0 && !w0.dead && !w0.alert) { w0.state = 'investigate'; w0.tx = 26.5 * CELL; w0.tz = 14.6 * CELL; w0.alert = true; S.alerted.add('scout'); log(ALERT_LINES.scout, 'warn'); }
    } else log('You take up the sword.', 'good');
  } else if (it.kind === 'cellkey') {
    if (!S.hints.has('stoop')) { it.taken = false; S.hints.add('stoop'); Sfx.chain(); log('You try to bend to them, but the chain is too short.', 'dim'); return; }
    setFlag('free'); Sfx.chain(); setTimeout(() => Sfx.snap(), 500);
    S.checkpoint = { x: 8.5 * CELL, z: 10.5 * CELL, yaw: Math.PI };
    log('Almost suffocated by the mad pounding of your heart, you slip one foot from its sandal and grip the keys with your toes. You draw them up, find the key, and the shackles fall away.', 'good');
  } else if (it.kind === 'ember') {
    S.torch = 'lit'; setFlag('torch_found'); Sfx.pickup();
    log('You find the torch by its ember and blow on it, gently, gently, until the pitch catches and the flame stands up again.', 'good');
  } else if (it.kind === 'spear' && LEVEL.links.some(l => l.name === 'portcullis')) {
    if (S.flags.has_spear) { it.taken = false; log('You already carry a spear.', 'dim'); return; }
    setFlag('has_spear'); log('You take up the dead man\'s spear and sling it across your back.');
  } else if (it.kind === 'spear') {
    if (S.weapons.spear) {                                // one in the hand, up to nine more slung on your back
      if (S.spears.length >= SPEAR_CARRY - 1) { it.taken = false; log('You carry ' + SPEAR_CARRY + ' spears already. Your back will take no more.', 'dim'); return; }
      S.spears.push(it.uses || 0); Sfx.pickup(); log('You sling the spear across your back with the others (' + (S.spears.length + 1) + ').', 'dim'); return;
    }
    S.weapons.spear = true; S.weapon = 'spear'; S.spearUses = it.uses || 0;
    log(S.hints.has('spear') ? 'You take up the spear.' : 'You take up the spear. Thrust with it, or throw it (G). A spear won\'t last: the haft splits after a few blows.', 'good'); S.hints.add('spear');
  } else if (it.kind === 'keys') {
    setFlag('has_keys');
    log('You reach through the bars\' shadow and take up the ring of keys. They are warm from the jailer\'s belt.', 'good');
  }
}
// food and drink: eaten now, or stowed in the satchel (POUCH_MAX) and taken later with H
const POUCH_MAX = 4;
function eat(it) {
  S.health = Math.min(100, S.health + it.heal); Sfx.heal();
  const nm = it.name.replace(/^(a|an|the) /, '');   // 'a camp loaf' -> 'the camp loaf'
  log(it.kind === 'bread' ? 'You wolf down the ' + nm + '. Stale, gritty, and better than any feast. (+' + it.heal + ')' : 'You drink the ' + nm + '. It burns going down. (+' + it.heal + ')', 'good');
}
function stow(it) {
  if (S.pouch.length >= POUCH_MAX) return false;
  it.taken = true; S.pouch.push({ name: it.name, kind: it.kind, heal: it.heal }); Sfx.pickup();
  log('You stow the ' + it.name.replace(/^(a|an|the) /, '') + ' in your satchel (' + S.pouch.length + '/' + POUCH_MAX + ').' + (S.hints.has('satchel') ? '' : ' Press H to eat or drink from it.'), 'dim');
  S.hints.add('satchel');
  return true;
}
// H: the satchel's smallest piece that makes good the hurt, else its biggest
function useSatchel() {
  if (!S.pouch.length) { log('Your satchel is empty.', 'dim'); return; }
  if (S.health >= 100) { log('You are not hurt.', 'dim'); return; }
  const miss = 100 - S.health, fits = S.pouch.filter(p => p.heal >= miss);
  const pick = fits.length ? fits.reduce((a, b) => b.heal < a.heal ? b : a) : S.pouch.reduce((a, b) => b.heal > a.heal ? b : a);
  S.pouch.splice(S.pouch.indexOf(pick), 1); eat(pick);
}
// walk over food or drink: eaten if you need all of it, else into the satchel if there's room
function autoFood() {
  for (const it of S.items) {
    if (it.taken || !it.heal || Math.hypot(it.x - S.x, it.z - S.z) > 1.1 || Math.abs((it.y || 0) - S.y) > 1.2) continue;
    if (100 - S.health >= it.heal) { it.taken = true; eat(it); }
    else stow(it);
  }
}
// spears on the ground come to you as you pass: into your hand if it's empty, otherwise onto your back (4 to draw one)
function autoSpears() {
  if (LEVEL.links.some(l => l.name === 'portcullis')) return;        // e1m2's one spear is a puzzle piece: you take that one yourself
  for (const it of S.items) {
    if (it.taken || it.kind !== 'spear' || Math.hypot(it.x - S.x, it.z - S.z) > 1.3 || Math.abs((it.y || 0) - S.y) > 1.2) continue;
    const have = S.spears.length + (S.weapon === 'spear' ? 1 : 0);
    if (have >= SPEAR_CARRY) return;
    it.taken = true; Sfx.pickup();
    if (S.weapon === 'fists') { S.weapons.spear = true; S.weapon = 'spear'; S.spearUses = it.uses || 0; log('You snatch up a spear.', 'dim'); }
    else { S.spears.push(it.uses || 0); S.weapons.spear = true; log('You sling a spear across your back (' + (have + 1) + '). Press 4 to draw one.', 'dim'); }
  }
}
// the field-works wound: run onto a bank of stakes and it throws you back bleeding; drop into a stake-pit and the stakes find you
function fieldWorks(g) {
  S.stakeT = (S.stakeT || 0) - DT;
  if (S.stakeT > 0 || mode !== 'play') return;
  if (g.idx >= 0 && LV.spikes[g.idx] && S.onGround) {
    S.stakeT = 1.1; hurt(22, 'stakes'); if (mode !== 'play') return;
    if (!S.hints.has('lily')) { S.hints.add('lily'); log('The ground gives under you: a pit, and a fire-hardened stake at the bottom of it. Jump out!', 'bad'); }
    return;
  }
  const gx = Math.floor(S.x / CELL), gz = Math.floor(S.z / CELL);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const idx = cellIdx(gx + dx, gz + dz); if (idx < 0 || !(LV.flags[idx] & F_STAKE)) continue;
    const ex = dx ? (dx > 0 ? (gx + 1) * CELL - S.x : S.x - gx * CELL) : 9, ez = dz ? (dz > 0 ? (gz + 1) * CELL - S.z : S.z - gz * CELL) : 9;
    const toward = dx * S.vx + dz * S.vz;
    if (Math.min(ex, ez) < RADIUS + 0.12 && toward > 1.2) {
      S.stakeT = 0.8; hurt(Math.round(6 + toward * 1.5), 'stakes'); if (mode !== 'play') return;
      S.vx -= dx * 6; S.vz -= dz * 6;
      if (!S.hints.has('stakes')) { S.hints.add('stakes'); log('Sharpened stakes, driven into a bank of earth: you run onto them. Find the gap.', 'bad'); }
      return;
    }
  }
}
function parry() {
  if (S.parryCool > 0 || S.swing > 0) return;
  S.parryT = PARRY.window; S.parryCool = PARRY.cool; Sfx.swing();
}
// throw the spear in your hand: it flies true, and lies where it lands to be picked up again
function throwSpear() {
  if (S.weapon !== 'spear' || S.throwT > 0 || S.swing > 0) return;
  const f = camFwd();
  S.throwT = 0.4;
  S.proj.push({ type: 'jav', x: S.x + f[0] * 0.6, y: S.y + 1.5 + f[1] * 0.6, z: S.z + f[2] * 0.6, vx: f[0] * 24, vy: f[1] * 24 + 1.0, vz: f[2] * 24, life: 3, spin: 0, uses: S.spearUses });
  nextSpear();
  Sfx.whoosh();
}
// the spear in hand is gone (thrown or broken): draw the next from your back, or fall back to the sword
function nextSpear() {
  if (S.spears.length) { S.spearUses = S.spears.pop(); S.weapons.spear = true; S.weapon = 'spear'; return; }
  S.weapons.spear = false; S.weapon = S.weapons.sword ? 'sword' : S.weapons.dagger ? 'dagger' : 'fists';
}
function onFire(kick) {
  if (S.shamu && S.shamu.tsotha.state === 'offer' && !kick) { startAttack(false); tsothaTouch(); return; }
  if (!kick && S.flags.has_bone) { if (S.swing <= 0 && S.throwT <= 0) throwBone(); return; }
  startAttack(kick);
}
function throwBone() {
  const f = camFwd();
  S.flags.has_bone = false; S.throwT = 0.35;
  S.proj.push({ type: 'bone', x: S.x + f[0] * 0.5, y: S.y + 1.4 + f[1] * 0.5, z: S.z + f[2] * 0.5, vx: f[0] * 15, vy: f[1] * 15 + 1.6, vz: f[2] * 15, life: 4, spin: 0, bounced: false });
  Sfx.whoosh();
}

// ---------------------------------------------------------------- the black giant
// The strangler (ch. III): "a gigantic black man, stark naked, bearing in one hand a huge
// sword and in the other a bunch of keys". He comes through the grille, pulls it partly to
// behind him, taunts "Amra", names his price, raises the sword; Satha takes him from behind.
const BLACK_LINES = [
  '"Long have I wished to meet you, Amra," says the black, in the sea-coast tongue of Kush. His eyes glint redly in the torchlight.',
  '"I have dared much for this meeting! Look! The keys to your chains! I stole them from Shukeli. What will you give me for them?"',
  'He yells and stamps in a frenzy. "Aye, you white dog: to a black man gold can never pay for blood. The price I ask is your head!"',
];
const BLACK_IDLE = [
  'He squats on his heels just out of your reach, jingling the keys, and grins at you. The huge sword lies across his knees.',
  'Far off down the corridor every flame bows and gutters. He does not see it; he is looking at your throat.',
  'He rises, and tests the edge of the sword with his thumb. Behind him, beyond the arch, the dark is moving.',
];
function updateGiant() {
  if (S.giant.state === 'gone') return;
  const g = S.giant; g.t += DT;
  const moveTo = (tx, tz, speed) => {
    const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const st = Math.min(d, speed * DT);
    g.x += dx / d * st; g.z += dz / d * st; g.walk += st; g.yaw = Math.atan2(dx, dz);
    return false;
  };
  // he comes in as soon as her first pass has left the vault
  const enterAt = S.satha.start + Math.round(16 * SIM_HZ), face = () => { g.yaw = Math.atan2(S.x - g.x, S.z - g.z); };
  switch (g.state) {
    case 'wait':
      g.yaw = 0;
      if (S.tick >= enterAt) { g.state = 'enter'; g.t = 0; S.door.target = 1; Sfx.clank(); Sfx.bars(); log('The grille creaks. A gigantic black man pads into the vault, stark naked, a huge sword in one hand and a bunch of keys in the other.', 'warn'); }
      break;
    case 'enter':
      if (g.z > 8.6 * CELL && S.door.target === 1) { S.door.target = 0.35; Sfx.clank(); }      // "pulling the grille partly to behind it"
      // through the middle of the grille's doorway (cell 7,7), not through the rock beside it
      g.wp = g.wp || 0;
      { const WP = [[7.5, 6.6], [7.5, 8.5], [8.7, 9.9]], w = WP[g.wp];
        if (moveTo(w[0] * CELL, w[1] * CELL, 1.9)) { if (++g.wp >= WP.length) { g.state = 'gloat'; g.t = 0; g.line = 0; } } }
      break;
    case 'gloat':
      face();
      if (g.line < BLACK_LINES.length && g.t > 0.4 + g.line * 4.5) { log(BLACK_LINES[g.line], 'voice'); Sfx.voice(0); g.line++; }
      if (g.line >= BLACK_LINES.length && (g.idle || 0) < BLACK_IDLE.length && g.t > 0.4 + BLACK_LINES.length * 4.5 + (g.idle || 0) * 5) { log(BLACK_IDLE[g.idle || 0], 'warn'); g.idle = (g.idle || 0) + 1; }   // while he gloats, Satha is coming back round
      if (g.line >= BLACK_LINES.length && S.satha.pts && Math.hypot(S.satha.pts[0].x - g.x, S.satha.pts[0].z - g.z) < 9) { g.state = 'raise'; g.t = 0; Sfx.scream(); log('He swings the huge sword up for your head, and freezes, for over his shoulder something vast is rising out of the dark.', 'warn'); }
      break;
    case 'raise':
      face(); g.arms = Math.min(1, g.arms + DT * 2.5);
      break;
    case 'crushed':
      g.fall = Math.min(1, g.fall + DT * 2.2);
      break;
  }
  if ((g.state === 'raise' || g.state === 'gloat') && S.satha.pts && S.satha.pts[0].y > -0.5 && Math.hypot(S.satha.pts[0].x - g.x, S.satha.pts[0].z - g.z) < 2.6) {
    g.state = 'crushed'; g.t = 0; Sfx.crush(); Sfx.scream(); setFlag('keys_down');
    const ring = feature('ring');
    S.items.push({ id: 'cellkey', kind: 'cellkey', name: 'keys to your chains', x: ring.x + 2.3, z: ring.z + 1.0, y: groundInfo(ring.x + 2.3, ring.z + 1.0).floor, taken: false });
    S.items.push({ id: 'giant_sword', kind: 'sword', name: 'black\'s sword', x: g.x + 1.2, z: g.z + 1.6, y: groundInfo(g.x + 1.2, g.z + 1.6).floor, taken: false });
    log('The gigantic sinuous shape whips round him in glistening coils that hide him from view, and the snap and splintering of bones comes plainly to your ears. The sword and the keys fly from his hands to crash and jangle on the stone, and the keys lie almost at your feet.', 'warn');
    for (let k = 0; k < 18; k++) particles.push({ m: 'blood', x: g.x, y: 1 + Math.random(), z: g.z, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 0.9, max: 0.9, g: 9, s: 1.4 });
  }
  g.y = groundInfo(g.x, g.z).floor;
}

// ---------------------------------------------------------------- Satha
function sathaPhase() {
  const st = S.satha.start;
  if (st === null || S.tick < st) return -1;
  return ((S.tick - st) % (SATHA_PERIOD * SIM_HZ)) / SIM_HZ;
}
function updateSatha() {
  selectSathaPath();
  const sa = S.satha, t = sathaPhase();
  sa.cool -= DT; sa.spitCool -= DT;
  if (t < 0) { sa.active = false; sa.pts = null; return; }
  // warnings: README rule 4 (period stated in a clue, and visible in the world)
  if (sa.lastPhase > t || sa.lastPhase < 0) {
    sa.warned++; Sfx.rumble();
    if (sa.warned <= 2) log(sa.warned === 1 ? 'Every flame in the pits bows and gutters at once. Under you the stone shivers, as if something vast were moving in it.' : 'The flames bow and gutter. Something vast is coming up out of the well.', 'warn');
  }
  if (sa.lastPhase < 3.0 && t >= 3.0) Sfx.hiss(clamp((4 * CELL - S.x) / 30, -1, 1));
  sa.lastPhase = t;
  const sHead = sathaS(t);
  const wasActive = sa.active;
  sa.active = sHead - BODY_LEN < SATHA_PATH.len;
  if (!sa.active) { if (wasActive) S.passes++; sa.pts = null; return; }
  sa.pts = sathaPoints(sHead);
  for (const f of S.foes) {
    if (f.dead) continue;
    for (const p of sa.pts) if (Math.abs(p.y - (f.y + 0.9)) < p.r + 1.0 && Math.hypot(f.x - p.x, f.z - p.z) < p.r + 0.42) { killFoe(f, 'crush'); break; }
  }
  if (mode !== 'play') return;
  const h = sa.pts[0], hdx = S.x - h.x, hdz = S.z - h.z, hd = Math.hypot(hdx, hdz), moving = Math.hypot(S.vx, S.vz) > 0.6;
  const vaultPass = sathaCycle() < ((entitySpec('scripted_satha') || {}).vaultPasses || 0);
  // walk into her and you die: lying still as she passes is the only safe way to be near her
  if (moving && (!entitySpec('scripted_satha') || S.flags.free)) {
    const py0 = S.y + 0.9;
    for (const p of sa.pts) {
      const dx = p.x - S.x, dz = p.z - S.z;
      if (Math.abs(p.y - py0) < p.r + 1.0 && Math.hypot(dx, dz) < p.r + RADIUS + 0.15 && dx * S.vx + dz * S.vz > 0) { die('blunder'); return; }
    }
  }
  if (entitySpec('scripted_satha') && (!S.flags.free || vaultPass)) {
    // in the vault (ch. III): "the monster would strike like lightning" at the first movement
    if (h.y > -0.5 && hd < 3.6) {
      if (moving && sa.cool <= 0) { sa.cool = 1.4; hurt(14, 'venom'); log('You stir, and the great head swings to the movement. Venom spatters you like white-hot iron.', 'bad'); }
      else if (!moving && sa.dripCycle !== sathaCycle()) {
        sa.dripCycle = sathaCycle(); hurt(3, 'venom');
        log('The head is poised high above your own. A drop of venom falls on your naked thigh, like a white-hot dagger driven into the flesh. You do not move.', 'warn');
      }
    }
    return;
  }
  const hidden = hiddenAt(S.x, S.z), py = S.y + 0.9;
  for (const p of sa.pts) {                             // crushing contact with any part of the body
    if (Math.abs(p.y - py) > p.r + 1.0) continue;
    const dx = S.x - p.x, dz = S.z - p.z, d = Math.hypot(dx, dz);
    if (d < p.r + RADIUS + 0.12 && !(sa.touch > 0)) {    // a heavy blow: the coils lash, and fling you off
      sa.touch = 0.6; hurt(35, 'crush'); if (mode !== 'play') return;
      log('The coils lash against you like a battering-ram, and fling you off.', 'bad');
      S.vx += dx / (d || 1) * 7; S.vz += dz / (d || 1) * 7; S.vy = 2.5; S.onGround = false;
      break;
    }
  }
  sa.touch = (sa.touch || 0) - DT;
  if (h.y < -0.5) return;
  const seesFire = LEVEL.satha && S.torch === 'lit' && hd < 7 && los(h.x, h.y + 0.5, h.z, S.x, S.y + 1.2, S.z);   // she goes for the light
  if (((!hidden && hd < 3.3) || seesFire) && Math.abs(S.y - h.y) < 2.5 && sa.cool <= 0) {
    sa.cool = 1.3; hurt(45, 'bite');
    if (mode !== 'play') return;
    log(seesFire && hidden ? 'The great head swings to your torchlight, and strikes into the tunnel mouth!' : 'The great head strikes, and you are flung across the corridor!', 'bad');
    S.vx += hdx / (hd || 1) * 9; S.vz += hdz / (hd || 1) * 9; S.vy = 3; S.onGround = false;
  }
  // her venom drips as she goes ("From them dripped a colorless liquid that he instinctively knew was death")
  if (sa.spitCool <= 0 && hd < 8) {
    sa.spitCool = 1.1;
    const hx = Math.sin(h.yaw), hz = Math.cos(h.yaw);
    S.proj.push({ type: 'venom', x: h.x + hx * 1.1, y: h.y + 0.1, z: h.z + hz * 1.1, vx: hx * 0.6, vy: 0, vz: hz * 0.6, life: 2, spin: 0 });
  }
}

// ---------------------------------------------------------------- Shukeli, the jailer
const TAUNTS = [
  'Shukeli squeals with laughter through the bars. "The lion of Aquilonia, loose in my vault! Satha will be along presently, my king."',
  '"Closer, closer," titters the eunuch, his fat face pressed to the bars. "Let me see the face of a king."',
  '"My master feeds his pets well," he wheezes. "Tonight he feeds them a king."',
];
function shukeliSees() {
  const sh = S.shukeli;
  if (hiddenAt(S.x, S.z)) return false;
  const d = Math.hypot(S.x - sh.x, S.z - sh.z);
  return d < 18 && los(sh.x, groundInfo(sh.x, sh.z).floor + 1.7, sh.z, S.x, S.y + 1.5, S.z);
}
function shukeliRetreat() { const sh = S.shukeli; sh.state = 'retreat'; sh.ignoreT = 5; S.flags.shukeli_at_bars = false; }
function noiseAt(x, z) {
  const sh = S.shukeli;
  Sfx.clatter(clamp((x - S.x) / 15, -1, 1));
  if (sh.state === 'dead' || sh.state === 'gone') return;
  const d = Math.hypot(x - GRILLE_X, z - HALL_Z);
  if (d > 12 || sh.state === 'retreat' || sh.state === 'peer' || sh.ignoreT > 0) { if (d > 12) log('The bone clatters away into the dark. Nothing stirs.', 'dim'); return; }
  sh.state = 'walk'; sh.t = 0;
  sh.tx = GRILLE_X + 0.95; sh.tz = clamp(z, 13.35 * CELL, 14.65 * CELL);
  Sfx.voice(0.6);
  log('Beyond the grille a stool scrapes back. "Rats? Rats in my pits?" The jailer comes waddling to see.', 'warn');
}
function updateShukeli() {
  if (S.shukeli.state === 'gone') return;
  const sh = S.shukeli; sh.t += DT; sh.tauntT -= DT; sh.ignoreT -= DT;
  const moveTo = (tx, tz, speed) => {
    const dx = tx - sh.x, dz = tz - sh.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const st = Math.min(d, speed * DT);
    sh.x += dx / d * st; sh.z += dz / d * st; sh.walk += st; sh.yaw = Math.atan2(dx, dz);
    return false;
  };
  switch (sh.state) {
    case 'away':                                         // he follows his stolen keys
      if (S.flags.free) { sh.state = 'come'; sh.t = 0; sh.x = 7.5 * CELL; sh.z = 4.2 * CELL; }
      break;
    case 'come':
      if (moveTo(7.5 * CELL, 7.6 * CELL, 3.2)) {
        sh.state = 'gloat'; sh.t = 0; sh.tauntT = 2.5; S.door.target = 0; S.door.open = 0; Sfx.clank(); Sfx.bars(); Sfx.voice(0);
        log('A squeal of high-pitched laughter shrills through the vaults, and the grille shoots home; the bolt crashes down. Through the bars peers a face like a fiendishly mocking carven gargoyle: Shukeli the eunuch, who has followed his stolen keys.', 'bad');
      }
      break;
    case 'gloat':
      sh.yaw = Math.atan2(S.x - sh.x, S.z - sh.z);
      if (sh.tauntT <= 0) { sh.tauntT = 6; Sfx.voice(0); log(TAUNTS[Math.floor(S.rng.next() * TAUNTS.length)], 'voice'); }
      break;
    case 'idle':
      sh.yaw = -Math.PI / 2;
      if (sh.tauntT <= 0 && S.x > 24 * CELL && shukeliSees()) {
        sh.tauntT = 11; Sfx.voice(0.5);
        log(TAUNTS[Math.floor(S.rng.next() * TAUNTS.length)], 'voice');
      }
      break;
    case 'walk':
      if (moveTo(sh.tx, sh.tz, 2.1)) { sh.state = 'peer'; sh.t = 0; sh.sawT = 0; sh.yaw = -Math.PI / 2; setFlag('shukeli_at_bars'); log('Shukeli presses his fat face to the bars, peering into the hall.', 'warn'); }
      break;
    case 'peer':
      sh.yaw = -Math.PI / 2;
      if (shukeliSees()) {
        sh.sawT += DT;
        if (sh.sawT > 1.1) {
          shukeliRetreat(); Sfx.voice(0.4);
          log('His little eyes find you. "Ah! Back, dog, back!" He scuttles away from the bars, wheezing with laughter.', 'voice');
          if (!sh.seenOnce) { sh.seenOnce = true; log('(He will not come near a man he can see.)', 'dim'); }
        }
      } else sh.sawT = Math.max(0, sh.sawT - DT);
      if (sh.state === 'peer' && sh.t > 6) {
        sh.state = 'return'; S.flags.shukeli_at_bars = false;
        log('"Rats," mutters the jailer, and waddles back to his wine.', 'voice');
      }
      break;
    case 'return': case 'retreat':
      if (moveTo(sh.homeX, sh.homeZ, sh.state === 'retreat' ? 3.0 : 1.9)) { sh.state = LEVEL.level === 'e1m2' ? 'away' : 'idle'; }
      break;
    case 'dead':
      sh.fall = Math.min(1, sh.fall + DT * 2);
      break;
  }
}
function killShukeli() {
  const sh = S.shukeli;
  sh.state = 'dead'; sh.t = 0; S.kills++;
  S.flags.shukeli_at_bars = false; setFlag('shukeli_dead');
  Sfx.stab(); Sfx.voice(0.2);
  for (let k = 0; k < 14; k++) particles.push({ m: 'drop', x: sh.x - 0.3, y: 1.4, z: sh.z, vx: -Math.random() * 3, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 3, life: 0.8, max: 0.8, g: 9, s: 1.2 });
  log('With a terrible curse you strike as a cobra strikes, and the great blade hisses between the bars. The fat eunuch bends at the middle, as if bowing to his killer, and crumples like tallow, his pudgy hands clutching at his belly.', 'good');
  log('But the bolt can be worked only from the outside. You are trapped. There is but one thing to do: seek some other outlet.', 'warn');
  S.checkpoint = { x: 8.5 * CELL, z: 10.5 * CELL, yaw: Math.PI };
}

// ---------------------------------------------------------------- projectiles & hazards
function barsHit(p, nx, nz) {
  if (!LEVEL.links.find(l => l.name === 'grille_gate')) return null;
  // closed grille (x plane) and cell door (z plane) stop thrown things
  if (S.grille.open < 0.8 && (p.x - GRILLE_X) * (nx - GRILLE_X) <= 0 && Math.abs(nz - HALL_Z) < CELL) return 'x';
  const dz = 12 * CELL;
  if (S.door.open < 0.5 && (p.z - dz) * (nz - dz) <= 0 && nx > 7 * CELL && nx < 8 * CELL) return 'z';
  return null;
}
function updateProjectiles() {
  for (let i = S.proj.length - 1; i >= 0; i--) {
    const p = S.proj[i];
    p.vy -= (p.g || (p.type === 'bone' ? 10 : p.type === 'arrow' ? 2 : 4)) * DT; p.spin += DT * 12; p.life -= DT;
    let nx = p.x + p.vx * DT, ny = p.y + p.vy * DT, nz = p.z + p.vz * DT;
    const hit = p.type === 'bone' && !p.bounced ? barsHit(p, nx, nz) : null;
    if (hit) {
      if (hit === 'x') p.vx = -p.vx * 0.25; else p.vz = -p.vz * 0.25;
      p.vy *= 0.3; p.bounced = true; nx = p.x; nz = p.z;
      noiseAt(p.x, p.z); p.noisy = true; Sfx.clank();
    }
    const g = groundInfo(nx, nz);
    if (g.kind === 0 || ny < g.floor || ny > g.ceil || p.life < 0 || ((g.flags & F_NOPASS) && ny < g.floor + 0.3)) {
      if (p.type === 'bone') {
        let x = p.x, z = p.z; const gg = groundInfo(x, z);
        if (gg.kind === 1 && !(gg.flags & F_NOPASS)) {
          S.items.push({ id: 'b' + S.tick, kind: 'bone', name: 'thighbone', x, z, y: gg.floor, taken: false });
          if (!p.noisy) noiseAt(x, z);
        } else Sfx.clatter();
      } else if (p.type === 'globe') {
        globeBurst(p.x, Math.max(p.y, groundInfo(p.x, p.z).floor), p.z);
      } else if (p.type === 'jav') {                     // a spear comes down and lies where it fell
        const gg = groundInfo(p.x, p.z);
        if (gg.kind === 1 && !(gg.flags & F_NOPASS) && p.uses < SPEAR_USES) S.items.push({ id: 'jav' + S.tick + '_' + i, kind: 'spear', name: 'spear', uses: p.uses, x: p.x, z: p.z, y: gg.floor, taken: false });
        Sfx.clatter(clamp((p.x - S.x) / 15, -1, 1));
      } else if (p.type === 'arrow') {
        if (Math.hypot(p.x - S.x, p.z - S.z) < 12) Sfx.arrow();
      } else if (p.type === 'venom') {
        const gg = groundInfo(p.x, p.z);
        if (gg.kind === 1) S.puddles.push({ x: p.x, z: p.z, y: gg.floor, t: 6 });
        for (let k = 0; k < 6; k++) particles.push({ m: 'venom', x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 3, life: 0.5, max: 0.5, g: 6, s: 0.6 });
      }
      S.proj.splice(i, 1); continue;
    }
    p.x = nx; p.y = ny; p.z = nz;
    if (p.type === 'arrow' && p.volley && p.vy < 0 && hiddenAt(S.x, S.z) && Math.hypot(p.x - S.x, p.z - S.z) < 1.5 && p.y < S.y + 2) {
      S.proj.splice(i, 1); Sfx.arrow();
      if (!S.hints.has('cover')) { S.hints.add('cover'); log('The shafts thud into the dead horse in front of you.', 'dim'); }
      continue;
    }
    if (p.type === 'arrow' && Math.hypot(p.x - S.x, p.y - (S.y + 1.1), p.z - S.z) < (p.volley ? 0.9 : 0.6)) {
      S.proj.splice(i, 1); hurt(FOES.archer.dmg, 'arrow'); punchView(0.04, (Math.random() - 0.5) * 0.08);
      if (mode === 'play' && !S.hints.has('arrow')) { S.hints.add('arrow'); log('An arrow! Close with the archer, or put stone between you.', 'bad'); }
      continue;
    }
    if (p.type === 'jav' && p.foe && Math.hypot(p.x - S.x, p.y - (S.y + 1.1), p.z - S.z) < 0.7) {
      S.proj.splice(i, 1); hurt(20, 'spear'); punchView(0.06, (Math.random() - 0.5) * 0.08);
      const gg = groundInfo(S.x, S.z); S.items.push({ id: 'jav' + S.tick + '_' + i, kind: 'spear', name: 'spear', uses: 1, x: S.x + 0.6, z: S.z, y: gg.floor, taken: false });
      continue;
    }
    if (p.type === 'jav' && !p.foe) {                    // your spear, into a man
      const t = S.foes.find(f => !f.dead && f.state !== 'dormant' && Math.hypot(f.x - p.x, f.z - p.z) < 0.7 && p.y > f.y && p.y < f.y + 2.2);
      if (t) { S.proj.splice(i, 1); p.uses++; hitFoe(t, SPEAR_THROW_DMG, false);
        if (p.uses < SPEAR_USES) { const gg = groundInfo(t.x, t.z); S.items.push({ id: 'jav' + S.tick + '_' + i, kind: 'spear', name: 'spear', uses: p.uses, x: t.x + 0.5, z: t.z, y: gg.floor, taken: false }); }
        else log('The spear\'s haft splits as it goes in.', 'dim');
        continue; }
    }
    if (p.type === 'venom' && Math.hypot(p.x - S.x, p.y - (S.y + 1.0), p.z - S.z) < 0.8) {
      S.proj.splice(i, 1); Sfx.venom(); hurt(22, 'venom');
      if (mode === 'play') log('Venom spatters you, and where it touches, it burns!', 'bad');
    }
  }
  for (let i = S.puddles.length - 1; i >= 0; i--) {
    const pd = S.puddles[i]; pd.t -= DT;
    if (pd.t <= 0) { S.puddles.splice(i, 1); continue; }
    if (Math.hypot(pd.x - S.x, pd.z - S.z) < 0.9 && S.y < pd.y + 0.3) hurt(14 * DT, 'venom');
  }
}

// ---------------------------------------------------------------- interaction targets
function findTarget() {
  const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
  let best = null, bestS = 1e9;
  const consider = (obj, x, y, z, range) => {
    const dx = x - S.x, dz = z - S.z, d = Math.hypot(dx, dz);
    if (d > range || Math.abs(y - S.y) > 2.5) return;
    const dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
    if (dot < 0.45 && d > 1.2) return;
    const s = d - dot * 1.5;
    if (s < bestS) { bestS = s; best = obj; }
  };
  for (const it of S.items) if (!it.taken) consider({ type: 'item', it }, it.x, it.y, it.z, 2.4);
  for (const f of LV.features) {
    if (f.type === 'ring' && S.flags.free) continue;
    if (f.type === 'niche_torch' && S.flags.has_torch) continue;
    if (f.type === 'door' && S.door.open > 0.5) continue;
    if (f.type === 'grille' && S.grille.target > 0) continue;
    if (f.type === 'bones' && S.flags.has_bone) continue;
    if (f.type === 'spear_rack' && (S.flags.has_spear || S.flags.portcullis_open)) continue;
    if (f.type === 'winch' && S.flags.portcullis_open) continue;
    consider({ type: f.type, f }, f.x, f.y - f.baseY, f.z, f.type === 'clue' ? 2.6 : f.type === 'ring' ? 3.7 : 3.0);
  }
  return best;
}
function promptText(t) {
  if (!t) return '';
  if (t.type === 'item' && t.it.kind === 'cellkey') return S.hints.has('stoop') ? '[E] slip your foot from its sandal and grip the keys with your toes' : '[E] bend to the keys';
  if (t.type === 'item' && t.it.kind === 'ember') return '[E] take up the torch and blow on the ember';
  if (t.type === 'item') return t.it.heal ? '[E] ' + (S.health < 100 ? (t.it.kind === 'bread' ? 'eat' : 'drink') + ' the ' + t.it.name.replace(/^(a|an|the) /, '') : 'stow the ' + t.it.name.replace(/^(a|an|the) /, '') + ' in your satchel') : '[E] take the ' + t.it.name.replace(/^(a|an|the) /, '');
  switch (t.type) {
    case 'ring': return '[E] strain at the chain';
    case 'niche_torch': return '[E] take the torch';
    case 'clue': return t.f.id.startsWith('mark') ? '[E] look at the marks' : '[E] read the scratches';
    case 'bones': return '[E] take a thighbone';
    case 'door': return '[E] try the grille';
    case 'grille': return S.flags.has_keys ? '[E] unlock the grille' : '[E] try the grille';
    case 'spear_rack': return '[E] take a spear';
    case 'winch': return S.flags.has_spear ? '[E] wind the winch and jam the ratchet' : '[E] wind the winch';
  }
  return '';
}

// ---------------------------------------------------------------- rooms & objective
const ROOM_DESC = {
  dank: 'A dank tunnel, beyond the made stone. Water beads on the rock. Somewhere ahead, a woman is weeping, piteously.',
  fork1: 'The tunnel forks. The weeping seems to come from everywhere at once.',
  dead_n: 'The weeping is fainter here. The tunnel ends in a slope of rubble and bones.',
  weep1: 'The weeping is louder here, and nearer.',
  dead_s: 'The weeping is fainter again. This way ends in the dark.',
  weep2: 'The weeping is just ahead now, piteous, heart-broken. It stops when you stop.',
  weep_den: 'A low cave that stinks of sweet rot. The weeping fills it.',
  cross_n: 'A chamber where the tunnels cross, cut in two by a well in the floor, too wide to step across. Out of it, from far below, comes a cold breath.',
  out1: 'A steady draft flows along this tunnel from somewhere big. It smells of old stone and torch smoke.',
  corridor_w: 'The main corridor of the pits again, vaulted high and narrow. Its floor is worn into a smooth trough down the middle.',
  garden: 'A cage of bars, and behind the bars, a garden.',
  cell: 'A vault cut from the living rock, far under the hill. Straw rots on the floor. A torch burns in a niche above the ring you are chained to, and the darkness presses in on it like a living thing.',
  hall: 'The main corridor of the pits, vaulted high and narrow like the nave of a drowned temple. Its floor is worn into a smooth trough down the middle, as if something enormous passes along it often.',
  charge: 'The field of the last charge. Five thousand knights rode into Koth behind you, and here they lie, slashed and trampled, their horses with them.',
  gully: 'A sunken gully choked with the dead of the charge. Its banks fall away waist-deep, and down here the arrows cannot find you.',
  arrowground: 'Open ground under the Shemite rise, feathered with spent shafts. The dead horses are the only cover.',
  rise: 'The rise where the Shemitish bowmen stood to shoot your knights down.',
  lanes: 'The ground the enemy horse rides over, again and again, churned to mire.',
  heap: 'A heap of dead horses and men. Here the last of your house-troops fell around you. Here you will stand.',
  south_passage: 'A low passage, its walls gnawed. Something whimpers in the dark at the bottom of it.',
  post: 'A hall of the ancient works, older than the citadel. Its floor is gnawed bone.',
  den: 'A low den, heaped with bones. Things have been living here, many things.',
  slope: 'The floor ahead is broken by pits. Watch where you put your feet.',
  bonepit: 'A pit of bones. Beyond it, down a smaller tunnel, a woman is weeping.',
  a2: 'Bones are heaped in this alcove: the leavings of the pits. Most of them are human.',
  niche: 'A deep niche beside the iron grille, black with shadow. From here you can hear the jailer breathing.',
  guard: 'Shukeli\'s guardroom: a table, a stool, a brazier, a jug of wine. The jailer lived well.',
  south_passage: 'A low passage runs south from the hall. Lamplight and the mutter of voices come up it.',
  post: 'The wardens\' post: pillars, a brazier, a dice table, a rack of blades. Men live down here, in shifts, beside the serpent.',
  barracks: 'Bunks, stale straw, a rack of spears. The guards of the pits sleep here.',
  winch: 'A great winch on trestles, its rope running up into the wall. It raises the portcullis on the stair.',
  stair: 'A stair climbs toward the citadel and the open air.',
  landing: 'A wide landing under Tsotha\'s scarlet banners. Daylight, real daylight, falls down the stair beyond.',
};
function objective() {
  const f = S.flags, live = g => S.foes.some(x => x.group === g && !x.dead && x.alert);
  if (LEVEL.objectives) {                                  // the later levels: the first objective whose flag isn't set yet
    if (S.foes.some(x => !x.dead && x.alert && x.state !== 'sleep' && Math.hypot(x.x - S.x, x.z - S.z) < 14 && FOES[x.cls].hp < 1e8)) return 'Fight!';
    const o = LEVEL.objectives.find(o => !f[o[0]]); return o ? o[1] : '';
  }
  if (LEVEL.level === 'e1m1') {
    const M = S.shamu;
    if (S.paralysed > 0) return '';
    if (M.tsotha.state === 'offer') return 'Answer him with the sword.';
    if (M.phase !== 'fight') return 'The kings ride up.';
    if (!S.areas.has('arrows')) return 'Fight your way east across the field, toward the standards.';
    if (!S.areas.has('line')) return 'Cross the arrow ground between volleys. Use the dead for cover.';
    if (!f.line_broken) return 'Break the Shemite line.';
    if (!f.lanes_crossed) return 'Cross the riders\' ground between charges.';
    return 'Make for the standards in the east: put your back to the heap of dead, and hold.';
  }
  if (LEVEL.level === 'e1m3') {
    const T = S.tun;
    if (live('weeper')) return 'Nothing you carry can harm it. RUN.';
    if (['driven', 'dark', 'side', 'dead_n', 'dead_s'].some(live)) return 'Fight!';
    if (!f.found_it) return 'Follow the weeping.';
    if (!f.crossed_well) return S.room === 'cross_n' ? 'Leap the well, between its breaths.' : 'Flee.';
    if (S.torch === 'dropped') return T.pres === 'up' ? 'Flee in the dark.' : 'Find your torch by its ember.';
    if (!f.got_out) return T.pres === 'rising' ? 'It is coming up again. Go where the air comes from!' : 'Find the way back to the main corridor. Watch your flame.';
    if (!f.satha_passed) return S.satha.start === null ? 'Back along the main corridor.' : S.torch === 'lit' ? 'Into a side tunnel, and shake out your torch! (T)' : 'Keep still in the dark.';
    return 'Toward the glow at the end of the corridor.';
  }
  if (!f.keys_down) return S.satha.active && !S.flags.free && S.satha.pts && inVault(S.satha.pts[0].x, S.satha.pts[0].z) ? 'Lie still.' : 'You are chained. Wait.';
  if (!f.free) return 'The keys lie almost at your feet.';
  if (!f.has_sword) return 'Take the black\'s sword.';
  if (!f.shukeli_dead) return S.shukeli.state === 'gloat' ? 'Strike through the bars!' : 'The grille!';
  if (!f.has_torch) return 'Take the torch. Seek another way out.';
  if (live('post') || live('vaults') || live('bonepit') || live('pits')) return 'Fight!';
  if (S.areas.has('bonepit')) return 'Somewhere ahead, a woman is weeping.';
  if (S.areas.has('pits')) return 'Watch the floor ahead.';
  return live('landing') ? 'Cut your way through the captain\'s men.' : 'Climb to the citadel.';
}
// first entry to an area: a checkpoint, and the area's name
function enterArea(a) {
  if (S.areas.has(a.id)) return;
  S.areas.add(a.id);
  log(a.name + (a.type === 'action' ? ' · a fight' : ''), 'title');
  if (a.cp && S.flags.free !== false) S.checkpoint = { x: a.cp[0] * CELL, z: a.cp[1] * CELL, yaw: a.cp[2] };
}
function enterRoom(id) {
  const room = LV.rooms.find(r => r.id === id);
  $('locName').textContent = room ? cap(room.name) : '';
  if (!room || S.visited.has(id)) return;
  S.visited.add(id);
  if (ROOM_DESC[id]) { log(cap(room.name), 'title'); log(ROOM_DESC[id]); }
}

// ---------------------------------------------------------------- e1m3: the tunnels below (ch. III)
function torchLit() { return LEVEL.torch ? S.torch === 'lit' : !!S.flags.has_torch; }
function torchInHand() { return LEVEL.torch ? S.torch !== 'dropped' : !!S.flags.has_torch; }
function shakeOutTorch() {
  if (!S.tun || S.torch !== 'lit') return;
  if (!S.areas.has('satha')) { log('Put out your only fire, down here? Not unless you must.', 'dim'); return; }
  S.torch = 'out'; Sfx.swing();
  log('You shake out the torch. The dark comes down on you like a lid.', 'warn');
}
// the presence blows the torch out and tears it from your hand; it falls by the well's rim, an ember
function blowOutTorch() {
  const W = LEVEL.well, x = W.ember[0] * CELL, z = W.ember[1] * CELL;
  S.torch = 'dropped'; S.flags.torch_found = false; Sfx.wind(1); Sfx.sting();
  S.items.push({ id: 'ember' + S.tun.rises, kind: 'ember', name: 'torch', x, z, y: groundInfo(x, z).floor, taken: false });
}
const PRESENCE_LINES = [
  'The wind rises out of the well, cold as the deep it comes from, and with it something comes floating up: vague, bodiless, a presence felt more than seen. Your torch goes out as if a hand had closed on it, and is torn from your fingers. You flee in the dark.',
  'Again the wind rises out of the well. The flame streams and gutters in your fist. It is coming up again.',
];
function updateTunnels() {
  for (const k in S.gates) { const gt = S.gates[k]; gt.open += clamp(gt.target - gt.open, -DT, DT * 0.085); }
  const T = S.tun, L = LEVEL;
  if (!T || mode !== 'play') return;
  // the weeping: piteous, like a woman's, from somewhere ahead. It moves when you do.
  const wp = S.foes.find(f => f.cls === 'weeper');
  if (!T.woke) {
    T.weepT -= DT;
    if (T.weepT <= 0) {
      const sx = L.weeping.from[0] * CELL, sz = L.weeping.from[1] * CELL, d = Math.hypot(sx - S.x, sz - S.z) || 1;
      T.weepT = 3.6;
      Sfx.weep(clamp(((sx - S.x) * Math.cos(S.yaw) - (sz - S.z) * Math.sin(S.yaw)) / d, -1, 1), clamp(16 / (d + 6), 0.15, 1));
    }
    const wk = L.weeping.wake;
    if (wp && S.room === wk.room && S.z < wk.z * CELL) {
      T.woke = true; setFlag('found_it');
      wp.hold = false; wp.state = 'chase'; wp.alert = true; alertGroup('weeper');
      for (const f of S.foes) if (f.group === 'driven') f.hold = false;
      alertGroup('driven', true);
      log('There is no woman. The weeping comes from behind you, out of the wallow by the tunnel mouth: a quaking, jelly-like mass, with a frog\'s head, great unstable eyes, and blubbery lips from which the weeping slobbers. Doubting any blade could harm it, you flee.', 'bad');
    }
  }
  // the well, in the chamber where the tunnels cross: it breathes in gusts, and something lives in the breath
  const W = L.well, wz0 = W.row * CELL, wz1 = (W.row + 1) * CELL;
  const inChamber = S.x > W.x[0] * CELL && S.x < W.x[1] * CELL && S.z > (W.row - 4) * CELL && S.z < (W.row + 6) * CELL;
  if (S.onGround && S.z < wz0) T.side = -1; else if (S.onGround && S.z > wz1) T.side = 1;
  let push = 0, gust = 0;
  T.pt += DT;
  if (T.pres === 'up') {                                 // the presence: a wind out of the well that drives you away south
    gust = 1; if (inChamber) push = 8.6;
    if (S.room === 'loop2' || S.room === 'loop3' || T.pt > 40) { T.pres = 'calm'; T.gt = 0; log('Behind you the wind falls away. Whatever came up out of the well has gone back down.', 'dim'); }
  } else if (T.pres === 'rising') {
    gust = 0.5 + 0.5 * smoothstep(0, 5, T.pt);
    if (S.room === 'out1' || S.room === 'out2') { T.pres = 'calm'; T.gt = 0; }
    else if (T.pt > 5) {
      T.pres = 'up'; T.pt = 0; T.rises = 1;
      if (['cross_s', 'well', 'blind', 'loop1', 'cross_n'].includes(S.room)) { blowOutTorch(); log('The presence comes up out of the well, and your torch dies in your hand and is gone. You flee in the dark again.', 'bad'); }
      else T.pres = 'calm';
    }
  } else {
    T.gt = (T.gt + DT) % W.period;                        // its breath: a rising, a gust, then still
    const rising = smoothstep(W.period - 1.6, W.period, T.gt), blowing = T.gt < 1.4;
    gust = blowing ? 1 : rising;
    if (blowing && inChamber && Math.abs(S.z - (wz0 + wz1) / 2) < 1.9 * CELL) push = -T.side * 9;   // blown back the way you came
    if (T.gt < DT * 1.5 && inChamber) { Sfx.wind(0.9); if (!S.hints.has('breath')) { S.hints.add('breath'); log('A wind gusts up out of the well, and your torch flame streams and gutters. Then it is still. The well is breathing.', 'warn'); } }
    // landing on the far side: the first time, it comes up and takes your torch; after, it comes up behind you
    if (S.room === 'cross_s' && S.onGround && S.torch === 'lit') {
      if (T.rises === 0) { T.rises = 1; T.pres = 'up'; T.pt = 0; setFlag('crossed_well'); blowOutTorch(); log(PRESENCE_LINES[0], 'bad'); }
      else if (S.flags.torch_found && T.side === 1 && T.armed) { T.armed = false; T.pres = 'rising'; T.pt = 0; Sfx.wind(1); log(PRESENCE_LINES[1], 'warn'); }
    }
    if (S.room === 'cross_n' && S.flags.torch_found) T.armed = true;
  }
  if (push && S.y > -1) { const r = collide(S.x, S.z + push * DT, RADIUS, S.y); S.x = r[0]; S.z = r[1]; }
  // the draft: air comes down from the main corridor through one tunnel, and goes down the well
  const mx = W.mouth[0] * CELL, mz = W.mouth[1] * CELL;
  let dx = 0, dz = 0;
  if (inChamber) { const d = Math.hypot(S.x - mx, S.z - mz) || 1; dx = (S.x - mx) / d; dz = (S.z - mz) / d; }
  else if (S.room === 'out1') dx = 1; else if (S.room === 'out2') dz = -1;
  T.draft = [dx * 0.7, dz * 0.7 - gust * T.side * 0.6];
  S.windNow = Math.max(gust * 1.8, Math.hypot(dx, dz) * 0.5);
  if (S.room === 'out1' && S.torch === 'lit') setFlag('got_out');
  // Satha returns: up out of her hole between you and the light, and down the main corridor toward you
  if (L.satha && S.satha.start === null && S.areas.has(L.satha.area)) {
    S.satha.start = S.tick + 3 * SIM_HZ;
    log('Far down the corridor every torch bows and gutters at once, and the stone shivers under your feet. Something vast is coming up out of the dark ahead, between you and that far glow.', 'bad');
    log('Get into a side tunnel, and put your torch out! (T)', 'warn');
  }
  const sp = S.satha.pts;
  if (sp && sp[0].y > 0 && !T.saw) { T.saw = true; log('Satha comes crawling up the corridor, sluggish from her recent grisly meal. The great head swings from side to side.', 'warn'); }
  if (S.passes > 0 || (sp && sp[0].y > 0 && sp[sp.length - 1].x < S.x - 6 && sp[sp.length - 1].y > -1)) setFlag('satha_passed');   // her tail has gone by
}

// ---------------------------------------------------------------- e1m1: the plain of Shamu (ch. I)
const SHAMU_KINGS = [
  ['Now through the yelling lines ride the lords of the conquerors: Strabonus, with his broad dark face and crafty eyes; Amalrus, slender, fastidious, treacherous, dangerous as a cobra; and the lean vulture Tsotha-lanti, clad only in silken robes.', 'warn'],
  ['"Arrows!" snarls Strabonus. "Who can take a man-eating tiger alive?"', 'voice'],
  ['"Take him alive," says Tsotha. He swings down from his horse and comes through the lines of the pikemen, who shrink back fearfully lest they so much as touch the skirts of his robe.', 'voice'],
];
// rotten planks over the deep pits: stand on one (or walk it) and it groans, then gives way. Run it, or jump.
function updatePlanks() {
  if (!S.planks || !S.planks.length) return;
  const g = groundInfo(S.x, S.z), on = S.onGround && g.plank !== undefined ? g.plank : -1;
  S.planks.forEach((p, i) => {
    if (p.state === 'gone') { p.fall += DT; return; }
    if (on === i) p.t += DT; else if (p.state === 'whole') p.t = Math.max(0, p.t - DT * 0.5);
    if (p.state === 'whole' && p.t > 0.18) { p.state = 'cracking'; Sfx.creak(); if (!S.hints.has('plank')) { S.hints.add('plank'); log('The plank groans and bows under you. It is rotten through!', 'warn'); } }
    if (p.state === 'cracking' && (p.t > 0.4 || (on !== i && p.t > 0.3))) { p.state = 'gone'; p.fall = 0; Sfx.snapWood(); if (on === i) { S.plankDrop = 0.45; S.vy = -3; S.onGround = false; log('The rotten plank snaps under you!', 'bad'); } }
  });
}
function updateShamu() {
  const M = S.shamu, L = LEVEL, room = S.room;
  if (!M) return;
  M.cool -= DT;
  const alive = g => S.foes.filter(f => f.group === g && !f.dead);
  const wake = (g) => { if (M.woke.has(g)) return; M.woke.add(g); for (const f of S.foes) if (f.group === g) f.hold = false; alertGroup(g); };
  if (S.areas.has('line')) wake('line');
  if (S.areas.has('heap')) wake('heap1');
  if (M.woke.has('heap1') && !alive('heap1').length) wake('heap2');
  if (M.woke.has('heap2') && !alive('heap2').length) wake('heap3');
  for (const g of M.woke) if (S.foes.some(f => f.group === g && !f.dead && !f.alert)) alertGroup(g, true);   // the battle is on: after a fall they come again
  if (S.areas.has('line') && !alive('line').length) setFlag('line_broken');
  if (S.room === 'heap') setFlag('lanes_crossed');
  // the Shemite volleys over the arrow ground
  const V = L.volley, archers = alive(V.group).filter(f => f.cls === 'archer');
  if (!M.woke.has(V.group) && V.rooms.includes(room) && archers.length && mode === 'play') {
    M.vt += DT;
    if (!M.shout && M.vt >= V.period - 1.2) { M.shout = true; Sfx.shout(); if (!S.hints.has('volley')) { S.hints.add('volley'); log('On the rise ahead the Shemite captains bawl the order, and the bows come up together. Get down behind the dead horses!', 'bad'); } }
    if (M.vt >= V.period) {
      M.vt = 0; M.shout = false; Sfx.bow();
      for (const a of archers) {
        const T = 1.5, g = 9, tx = S.x + (S.rng.next() - 0.5) * 3, tz = S.z + (S.rng.next() - 0.5) * 3, ty = S.y + 1.0;
        const ox = a.x, oy = a.y + 1.5, oz = a.z;
        S.proj.push({ type: 'arrow', x: ox, y: oy, z: oz, vx: (tx - ox) / T, vy: (ty - oy + 0.5 * g * T * T) / T, vz: (tz - oz) / T, life: 3, spin: 0, g, volley: true });
      }
    }
  } else { M.vt = Math.min(M.vt, V.period - 1.5); M.shout = false; }
  // the riders: Ophirean knights charge down three lanes on a fixed cadence
  const [z0, z1] = L.chargeSpan.map(v => v * CELL), span = z1 - z0;
  L.charges.forEach((c, i) => {
    const ph = ((S.tick / SIM_HZ + c.offset) % c.period) / (c.period * 0.62);
    if (ph > 1) { M.hoof[i] = -1; return; }
    if (M.hoof[i] < 0 && Math.abs(S.x - c.x * CELL) < 30) Sfx.rumble();
    const z = c.dir > 0 ? z0 + ph * span : z1 - ph * span; M.hoof[i] = z;
    if (mode === 'play' && Math.abs(S.x - c.x * CELL) < 1.3 && Math.abs(S.z - z) < 1.7 && M.cool <= 0) {
      M.cool = 1.0; hurt(30, 'trample'); S.vx += (S.x < c.x * CELL ? -1 : 1) * 8; punchView(0.1, 0.1);
      if (mode === 'play') log('A gilded knight rides you down and is gone, laughing.', 'bad');
    }
  });
  // the end of the field: the kings ride up; the wizard; the ring
  const ts = M.tsotha;
  if (M.phase === 'fight' && M.woke.has('heap3') && !alive('heap3').length) { M.phase = 'kings'; M.t = 0; M.line = 0; setFlag('heap_held'); }
  M.t += DT;
  if (M.phase === 'kings') {
    if (M.line < SHAMU_KINGS.length && M.t > 1 + M.line * 4) { log(SHAMU_KINGS[M.line][0], SHAMU_KINGS[M.line][1]); Sfx.voice(0.5); M.line++; }
    if (M.line >= SHAMU_KINGS.length && M.t > 13) { M.phase = 'wizard'; ts.state = 'walk'; }
  }
  if (ts.state === 'walk') {
    const dx = S.x - ts.x, dz = S.z - ts.z, d = Math.hypot(dx, dz);
    ts.yaw = Math.atan2(dx, dz);
    if (d > 2.25) { const st = Math.min(d - 2.2, 2.6 * DT); ts.x += dx / d * st; ts.z += dz / d * st; ts.walk += st; }
    else { ts.state = 'offer'; ts.t = 0; Sfx.voice(0.3); log('He steps over the corpses and comes face to face with you. "I offer you life, Conan," he says, a cruel mirth bubbling at the back of his voice.', 'voice'); }
  }
  if (ts.state === 'offer') { ts.yaw = Math.atan2(S.x - ts.x, S.z - ts.z); if (Math.hypot(S.x - ts.x, S.z - ts.z) > 3.5) ts.state = 'walk'; }
  if (S.paralysed > 0) { S.paralysed += DT; if (S.paralysed > 5 && mode === 'play') finishLevel(); }
}
function tsothaTouch() {
  const ts = S.shamu.tsotha;
  ts.state = 'touch'; setFlag('answered'); S.paralysed = 0.001; Sfx.swing(); Sfx.sting();
  log('"I give you death, wizard!" The great sword swings in a stroke meant to shear him in half.', 'good');
  log('But the wizard steps in, too quick for the eye to follow, and merely lays an open hand on your left forearm, where the mail has been hacked away. A steel fang darts from his ring like a snake\'s tongue. The blade veers from its arc, and you crash to the earth, rigid as a dead man, your eyes wide open.', 'bad');
  log('"Take him up and fear not," laughs Tsotha. "The lion\'s fangs are drawn."', 'voice');
  fadeTarget = 0.85;
}

// ---------------------------------------------------------------- the tick
function humanInput() {
  const inp = {
    fwd: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0),
    side: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
    run: !!(keys.ShiftLeft || keys.ShiftRight), jump: !!keys.Space, use: pressUse, torch: pressTorch, fire: pressFire, kick: pressKick, throwSpear: pressThrow, drink: pressDrink, weapon: wantWeapon,
  };
  pressUse = pressFire = pressKick = pressTorch = pressThrow = pressDrink = false; wantWeapon = null;
  return inp;
}
function tick(inp) {
  S.tick++; S.playTicks++;
  if (cineT() >= 0) {                                     // the closing scene plays itself: hands off
    inp = { fwd: 0, side: 0, run: false, jump: false, use: false, fire: false, kick: false };
    if (S.flags.the_end && mode === 'play') { finishLevel(); return; }
  }
  if (S.paralysed > 0) {                                  // the purple lotus: rigid, eyes open, falling back to the sky
    inp = { fwd: 0, side: 0, run: false, jump: false, use: false, fire: false, kick: false };
    S.pitch += (1.25 - S.pitch) * Math.min(1, DT * 1.5);
  }
  if (inp.yaw !== undefined) S.yaw = inp.yaw;
  if (inp.pitch !== undefined) S.pitch = inp.pitch;
  prev = { x: S.x, y: S.y, z: S.z };
  chainSndT -= DT; S.swing = Math.max(0, S.swing - DT); S.throwT = Math.max(0, S.throwT - DT); S.kickT = Math.max(0, S.kickT - DT); S.parryT = Math.max(0, S.parryT - DT); S.parryCool = Math.max(0, S.parryCool - DT);
  if (inp.weapon && S.weapons[inp.weapon] && inp.weapon !== S.weapon) {
    if (S.weapon === 'spear') S.spears.push(S.spearUses);          // the spear in hand goes back on the bundle
    if (inp.weapon === 'spear') S.spearUses = S.spears.pop() || 0;  // draw one from your back
    S.weapon = inp.weapon;
  }
  autoSpears(); autoFood();
  if (inp.torch) shakeOutTorch();
  const { g, sp } = updatePlayer(inp);
  for (const d of [S.door, S.grille, S.portc]) d.open += clamp(d.target - d.open, -DT * 0.9, DT * (d === S.portc && d.target === 0 ? 4 : 0.9));
  if (S.portc.dropT > 0) { S.portc.dropT -= DT; if (S.portc.dropT <= 0 && !S.flags.portcullis_open) { S.portc.target = 0; Sfx.clank(); Sfx.crush(); log('The pawl slips. The portcullis crashes down.', 'dim'); } }
  updateGiant();
  updateSatha();
  if (mode !== 'play') return;
  updateShukeli();
  updateFoes();
  updateTunnels();
  updateShamu();
  updatePlanks();
  updateBeats();
  updateProjectiles();
  if (mode !== 'play') return;
  resolvePlayerHit();
  if (mode !== 'play') return;
  interactTarget = findTarget();
  if (inp.use) interact();
  if (inp.fire) onFire(false);
  if (inp.kick) { if (S.weapon === 'spear') throwSpear(); else parry(); }   // right-click: with a spear in hand it's thrown; no parrying with a spear
  if (inp.throwSpear) throwSpear();
  if (inp.drink) useSatchel();
  if ((g.flags & F_WATER) && S.y < (LEVEL.waterY || -1) - 0.6) { die('drown'); return; }
  fieldWorks(g);
  if (g.kind === 2 && S.y < g.floor + 30 && S.y < -4) { die('fall'); return; }
  const id = roomIdAt(S.x, S.z);
  if (id && id !== S.room) {
    S.room = id; enterRoom(id);
    const area = LEVEL.areas.find(a => a.rooms.includes(id));
    if (area) enterArea(area);
  }
  if (S.onGround && sp > 0.8) { stepAcc += sp * DT; bobPhase += sp * DT * 2.2; if (stepAcc > 2.0) { stepAcc = 0; Sfx.step(hiddenAt(S.x, S.z), LEVEL.open ? 'turf' : 'stone'); } }
  bobAmt += ((S.onGround && sp > 0.8 ? Math.min(1, sp / 5) : 0) - bobAmt) * Math.min(1, DT * 8);
  const exE = LEVEL.entities.find(e => e.class === 'trigger_exit'), ex = exE ? exE.rect : [1e9, 1e9, 1e9, 1e9];
  if (S.x > ex[0] * CELL && S.x < ex[2] * CELL && S.z > ex[1] * CELL && S.z < ex[3] * CELL && (LEVEL.level !== 'e1m3' || S.flags.satha_passed) && (!LEVEL.exitNeeds || S.flags[LEVEL.exitNeeds])) finishLevel();
}

// ---------------------------------------------------------------- determinism helpers
function stateHash() {
  let h = 0x811c9dc5;
  const q = v => Math.round(v * 100);
  const sh = S.shukeli, g = S.giant;
  const parts = [S.tick, q(S.x), q(S.y), q(S.z), Math.round(S.health), Object.values(S.flags).map(Number).join(''), q(S.door.open), q(S.grille.open),
    S.satha.start, g.state, q(g.x), q(g.z), sh.state, q(sh.x), q(sh.z), S.proj.length, S.items.filter(i => i.taken).length, S.pouch.length,
    S.foes.map(f => f.state + q(f.x) + q(f.z) + f.hp).join(','), q(S.portc.open), S.weapon].concat(S.tun ? [S.torch, S.tun.pres, S.passes] : []);
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
// Agent API (README §11): same inputs a human has, held for N ticks.
window.CIM = {
  get state() { return S; },
  hash: () => stateHash(),
  obs() {
    return { tick: S.tick, hash: stateHash(), room: S.room, pos: [S.x, S.y, S.z], yaw: S.yaw, health: S.health, flags: Object.assign({}, S.flags),
      shukeli: S.shukeli.state, giant: S.giant.state, satha: { phase: sathaPhase(), active: S.satha.active, head: S.satha.pts ? S.satha.pts[0] : null },
      prompt: promptText(interactTarget), clues: [...S.read].map(id => LV.features.find(f => f.id === id).text), mode,
      weapon: S.weapon, kills: S.kills, foes: S.foes.map(f => ({ id: f.id, cls: f.cls, state: f.state, hp: f.hp, pos: [f.x, f.y, f.z], alert: f.alert })) };
  },
  step(action = {}, ticks = 1) {
    if (mode === 'splash') startPlay(true);
    agentInput = action;
    for (let i = 0; i < ticks && mode === 'play'; i++) tick({ fwd: action.forward || 0, side: action.side || 0, run: !!action.run, jump: !!action.jump,
      use: !!action.use && i === 0, torch: !!action.torch && i === 0, fire: !!action.attack && i === 0, kick: !!(action.parry || action.kick) && i === 0, throwSpear: !!action.throwSpear && i === 0, drink: !!action.drink && i === 0, weapon: i === 0 ? action.weapon : null, yaw: action.yaw, pitch: action.pitch });
    if (mode === 'dead' && action.respawn) respawn();
    return this.obs();
  },
  release() { agentInput = null; },
  load(id) { loadLevel(id, S ? { health: 100, weapons: S.weapons, weapon: S.weapon, kills: 0, deaths: 0, hints: [], playTicks: 0 } : null); mode = 'splash'; return this.obs(); },
  get level() { return LEVEL.level; },
  solve: () => solvePuzzle(LEVEL.puzzle),
};

// ---------------------------------------------------------------- flow
function lockPointer() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
function hideOverlay() { overlay.className = 'hidden'; overlay.innerHTML = ''; }
async function showIntro() {
  mode = 'splash'; hud.classList.add('hidden');
  await showTitleCard();
  await showSplash(LEVEL.level, '<div class="keys"><b>W A S D</b> move &nbsp; <b>mouse</b> look &nbsp; <b>Shift</b> run &nbsp; <b>E</b> use &nbsp; <b>Click</b> strike / throw &nbsp; <b>Right-click / F</b> parry (with a spear: throw) &nbsp; <b>G</b> throw spear &nbsp; <b>1 2 3 4</b> weapons &nbsp; <b>Esc</b> pause</div>');
  if (mode === 'splash') startPlay(false);
}
const LEVEL_INTRO = {
  e1m2: [['THE PITS', 'title'], ['Chained to a ring in a vault far beneath the hill. A torch burns in a niche above your head; the darkness presses in on it like a living thing.', ''],
    ['Out in the black beyond the arch, something vast is moving.', 'warn'], ['(E to use things. Read whatever the dead have left you.)', 'dim']],
  e1m1: [['THE PLAIN OF SHAMU', 'title'], ['Five thousand knights followed you over the border into Koth, to aid Amalrus of Ophir. Amalrus has betrayed you to Strabonus, and not one of the five thousand will leave the field alive.', ''],
    ['The sun is going down red on the last of them.', 'warn']],
  e1m3: [['THE TUNNELS BELOW', 'title'], ['Down the dank tunnel beyond the bone pit the made stone ends. You have the black\'s sword, the torch from the niche, and nothing else.', ''],
    ['Somewhere ahead, a woman is weeping.', 'warn']],
};
function startPlay(agent) {
  Sfx.init();
  hideOverlay(); hud.classList.remove('hidden');
  mode = 'play'; fade = 1; fadeTarget = 0; acc = 0;
  for (const [t, c] of LEVEL_INTRO[LEVEL.level] || LEVEL.intro || []) log(t, c);
  if (CHEAT && !agent) log('Cheat mode: god mode is on. N skips to the next level; Esc, then "Let the AI play this level", to watch it done.', 'dim');
  if (!agent) lockPointer();
}
// load a level; `carry` brings the hero's state across (health, weapons, tally)
function loadLevel(id, carry) {
  LEVEL = LEVELS[id];
  Sfx.ambience(LEVEL.open ? 'field' : LEVEL.torch ? 'tunnels' : 'pits');
  if (R && typeof loadCastModels === 'function') loadCastModels(levelCast(LEVEL));   // in the background: the old rig stands in until they arrive
  buildLevel(LEVEL);
  if (entitySpec('scripted_satha') || LEVEL.satha) buildSathaPath();
  if (levelMesh) R.deleteMesh(levelMesh);
  { const lm = buildLevelMesh(); levelMesh = R.createMesh(lm); buildWallDecals(lm); }
  if (skyMesh) { R.deleteMesh(skyMesh); skyMesh = null; }
  if (LEVEL.open) skyMesh = R.createMesh(buildSkyMesh(LEVEL.night ? (LEVEL.moon || [0.5, 0.35, -0.6]) : (LEVEL.sun || [-1, 0.05, 0.2]), LEVEL.night));
  R.haze = LEVEL.haze || [0.035, 0.026, 0.02];
  const gf = LEVEL.groundFog;                               // low fog lying on the field
  R.gfog = gf ? [gf.density, gf.falloff, gf.floor || 0, 1] : [0, 0, 0, 0]; R.gfogCol = gf ? gf.col : [0, 0, 0];
  FLOW = null; GRILLE_CELLS.clear(); particles = []; interactTarget = null;
  const seed = parseInt(new URLSearchParams(location.search).get('seed'), 10) || 1;
  S = newState(seed, carry); beatsInit();
  S.y = groundInfo(S.x, S.z).floor; prev = { x: S.x, y: S.y, z: S.z };
  S.room = roomIdAt(S.x, S.z); S.visited.add(S.room);
  const room = LV.rooms.find(r => r.id === S.room); $('locName').textContent = room ? cap(room.name) : '';
  logEl.innerHTML = '';
  const pz = solvePuzzle(LEVEL.puzzle);
  console.log('[solve] ' + id + ': ' + pz.states + ' states, goal ' + (pz.goalReachable ? 'reachable' : 'UNREACHABLE') + ', softlocks: ' + (pz.softlocks.length || 'none'));
}
function showPause() {
  mode = 'paused';
  overlay.className = '';
  overlay.innerHTML = '<div class="panel"><h2>Paused</h2><p class="sub">' + LEVEL.level + ' · tick ' + S.tick + ' · state ' + stateHash() + '</p>' +
    '<div class="keys"><b>W A S D</b> move · <b>mouse</b> look · <b>Shift</b> run · <b>Space</b> jump<br><b>E</b> use · <b>Click</b> strike or throw · <b>Right-click / F</b> parry (with a spear: throw) · <b>G</b> throw spear · <b>H</b> eat or drink from your satchel · <b>1 2 3 4</b> fists, dagger, sword, spear · <b>P</b> resolution · <b>F4</b> palette · <b>K</b> sound · <b>F3</b> debug</div>' +
    '<div class="setting"><label for="brIn">Brightness</label><input type="range" id="brIn" min="0.8" max="2.2" step="0.05" value="' + brightness + '"><span id="brVal">' + brightness.toFixed(2) + '</span></div>' +
    '<div class="setting"><label for="sensIn">Mouse sensitivity</label><input type="range" id="sensIn" min="0.1" max="4" step="0.05" value="' + sensMul + '"><span id="sensVal">' + sensMul.toFixed(2) + '×</span></div>' +
    '<div class="setting"><label for="volIn">Sound volume</label><input type="range" id="volIn" min="0" max="1.5" step="0.05" value="' + volume + '"><span id="volVal">' + Math.round(volume * 100) + '%</span></div>' +
    '<div class="setting"><label for="ambIn">Ambience</label><input type="range" id="ambIn" min="0" max="1.5" step="0.05" value="' + ambience + '"><span id="ambVal">' + Math.round(ambience * 100) + '%</span></div>' +
    '<div class="btns"><button id="bRes">Resume</button><button id="bRestart">Restart level</button>' + (CHEAT ? '<button id="bAuto">Let the AI play this level</button><button id="bAuto3">… at 3× speed</button>' : '') + '</div></div>';
  $('sensIn').oninput = e => { sensMul = parseFloat(e.target.value); $('sensVal').textContent = sensMul.toFixed(2) + '×'; try { localStorage.setItem(SENS_KEY, String(sensMul)); } catch (err) { /* ignore */ } };
  $('brIn').oninput = e => { brightness = parseFloat(e.target.value); R.gamma = brightness; $('brVal').textContent = brightness.toFixed(2); try { localStorage.setItem(BRIGHT_KEY, String(brightness)); } catch (err) { /* ignore */ } };
  $('volIn').oninput = e => { volume = parseFloat(e.target.value); Sfx.setVolume(volume); $('volVal').textContent = Math.round(volume * 100) + '%'; try { localStorage.setItem(VOL_KEY, String(volume)); } catch (err) { /* ignore */ } };
  $('ambIn').oninput = e => { ambience = parseFloat(e.target.value); Sfx.setAmbience(ambience); $('ambVal').textContent = Math.round(ambience * 100) + '%'; try { localStorage.setItem(AMB_KEY, String(ambience)); } catch (err) { /* ignore */ } };
  $('bRes').onclick = () => { hideOverlay(); mode = 'play'; lockPointer(); };
  if (CHEAT) { $('bAuto').onclick = () => startAutoplay(1); $('bAuto3').onclick = () => startAutoplay(3); }
  $('bRestart').onclick = () => location.reload();
}
async function finishLevel() {
  if (mode !== 'play') return;
  mode = 'done'; S.doneT = S.tick; S.doneHash = stateHash(); fadeTarget = 1; Sfx.sting();
  document.exitPointerLock && document.exitPointerLock();
  const secs = Math.round(S.tick / SIM_HZ), slain = S.foes.filter(f => f.dead).length;
  const stats = '<p class="stats">' + LEVEL.level + ' complete · ' + Math.floor(secs / 60) + 'm ' + (secs % 60) + 's · ' + S.deaths + ' death' + (S.deaths === 1 ? '' : 's') +
    ' · ' + slain + ' of ' + S.foes.filter(f => FOES[f.cls].hp < 1e8).length + ' foes slain · tick ' + S.tick + ' · state ' + S.doneHash + '</p>';
  if (agentInput && !AUTO) return;                // the test harness drives level changes itself
  if (AUTO) { AUTO = null; agentInput = null; }    // the AI's run is over: the game goes on as usual
  await new Promise(r => setTimeout(r, 900));
  hud.classList.add('hidden');
  const next = LEVEL.next;
  if (next) {
    await showSplash(next, stats);
    loadLevel(next, { health: S.health, weapons: S.weapons, weapon: S.weapon, spears: S.spears, pouch: S.pouch, kills: S.kills, deaths: S.deaths, hints: [...S.hints], playTicks: S.playTicks });
    startPlay(false);
  } else {
    await showSplash('end', stats + '<p class="sub">' + Math.round(S.playTicks / SIM_HZ / 60) + ' minutes in the saddle, the pits and the tower.</p>', 'Click to begin again');
    location.reload();
  }
}

// ---------------------------------------------------------------- HUD
function updateHUD() {
  $('hpFill').style.width = Math.max(0, S.health) + '%';
  $('hpNum').textContent = Math.ceil(Math.max(0, S.health));
  const carry = [S.flags.has_bone ? 'thighbone (click to throw)' : S.weapon === 'fists' ? 'bare fists' : 'the ' + S.weapon + (S.weapon === 'spear' && S.spears.length ? ' (' + S.spears.length + ' more on your back)' : '')];
  if (S.weapon !== 'spear' && S.spears.length) carry.push(S.spears.length + (S.spears.length > 1 ? ' spears' : ' spear') + ' on your back (4)');
  if (S.flags.has_spear) carry.push('a spear, to jam the winch');
  if (S.flags.has_keys) carry.push('keys');
  if (S.pouch.length) carry.push('satchel ' + S.pouch.length + '/' + POUCH_MAX + ' (H)');
  $('carry').textContent = carry.join(' · ') + (S.kills ? '  ·  ' + S.kills + ' slain' : '');
  $('objective').textContent = objective();
  promptEl.textContent = mode === 'play' ? promptText(interactTarget) : '';
  const dbg = $('debug');
  dbg.style.display = debugOn ? 'block' : 'none';
  if (debugOn) {
    const t = sathaPhase();
    dbg.textContent = 'tick ' + S.tick + '  hash ' + stateHash() + '  satha ' + (t < 0 ? '-' : t.toFixed(1) + 's/' + SATHA_PERIOD) + '  shukeli ' + S.shukeli.state + '  giant ' + S.giant.state +
      '\nflags ' + Object.entries(S.flags).filter(([, v]) => v).map(([k]) => k).join(' ') + '  pos ' + (S.x / CELL).toFixed(1) + ',' + (S.z / CELL).toFixed(1);
  }
}

// ---------------------------------------------------------------- render
function render(alpha) {
  let px = lerp(prev.x, S.x, alpha), py = lerp(prev.y, S.y, alpha), pz = lerp(prev.z, S.z, alpha);
  const bob = Math.sin(bobPhase * 2) * 0.05 * bobAmt;
  let eyeY = py + EYE + bob, cyaw = S.yaw + punchYaw, cpitch = S.pitch + punchPitch;
  const cc = cineCam(alpha);                              // the closing scene: a camera of its own
  if (cc) { px = cc.eye[0]; eyeY = cc.eye[1]; pz = cc.eye[2]; py = eyeY - EYE; cyaw = cc.yaw; cpitch = cc.pitch; }
  const proj = m4persp(72 * Math.PI / 180, R.aspect, LEVEL.open ? 0.1 : 0.05, LEVEL.open ? 2600 : 200);
  const view = m4mul(m4rx(-cpitch), m4mul(m4ry(-cyaw), m4t(-px, -eyeY, -pz)));
  const vp = m4mul(proj, view), f = camFwd();
  const lampPos = [px + f[0] * 0.3, eyeY - 0.2, pz + f[2] * 0.3];
  let lc = [0.24, 0.215, 0.18], lampRange = 10;
  if (S.tun && !torchLit()) { lc = [0.06, 0.056, 0.05]; lampRange = 6; }   // the dark below: no fire at all
  if (torchLit()) {                    // the torch in his left hand: warm, flickering, guttering in the draft
    const gutter = 1 - Math.min(0.55, Math.abs(S.windNow) * 0.3) * (0.6 + 0.4 * Math.sin(gameTime * 23));
    const fl = (0.88 + 0.08 * Math.sin(gameTime * 11.3) + 0.05 * Math.sin(gameTime * 29.1)) * gutter;
    const tb = S.tun ? 1.35 : 1;                            // down in the tunnels it is the only light there is
    lc = [1.0 * fl * tb, 0.62 * fl * tb, 0.3 * fl * tb]; lampRange = S.tun ? 18 : 15;
    lampPos[0] -= Math.cos(S.yaw) * 0.4; lampPos[2] += Math.sin(S.yaw) * 0.4;
  }
  // torches gutter as Satha comes (rule 4: timing visible in the world)
  const t = sathaPhase();
  // Quake's flicker lightstyle (world.qc: 'm' is normal), ten steps a second
  const LS = 'mmnmmommommnonmmonqnmmo', lsv = (LS.charCodeAt(Math.floor(gameTime * 10) % LS.length) - 97) / 12;
  let lm = 1 + (lsv - 1) * 0.35;
  if (t >= 0 && t < 6.5) lm *= 1 - 0.5 * smoothstep(0, 0.6, t) * (1 - smoothstep(5, 6.5, t)) * (0.75 + 0.25 * Math.sin(gameTime * 37));
  const ev = LEVEL.exitVoid;
  R.voidLine = ev ? [ev.from[0] * CELL, ev.from[1] * CELL, ev.to[0] * CELL, ev.to[1] * CELL] : [0, 0, 0, 0]; R.voidW = ev ? ev.w : 0;
  R.beginScene(gameTime);
  R.lightMul(lm);
  if (skyMesh) {                                         // the open sky: drawn first, with no haze, and always at the horizon
    R.setCamera(vp, [px, eyeY, pz], lampPos, lc, lampRange, 0);
    R.key = [0, 1, 0]; R.drawEntity(skyMesh, m4t(px, 0, pz), [0.3, 0.2, 0.2], 1, 1, false);
  }
  R.setCamera(vp, [px, eyeY, pz], lampPos, lc, lampRange, LEVEL.fog || 0.034);
  R.drawWorld(levelMesh);
  // items
  for (const it of S.items) {
    if (it.taken) continue;
    const light = sampleLight(it.x, it.y + 0.5, it.z);
    if (it.kind === 'ember') {                             // the dropped torch, lying on the rim, its head a red ember
      const tm = m4trs(it.x, it.y + 0.06, it.z, 0.7, Math.PI / 2, 0, 1.3), pulse = 0.55 + 0.3 * Math.sin(gameTime * 2.3) + 0.1 * Math.sin(gameTime * 7.1);
      drawM('vm_torch', tm, light); drawM('vm_flame_core', m4mul(tm, m4trs(0, 0.3, 0, 0, 0, 0, 0.45)), [0.9, 0.18, 0.06], pulse);
      continue;
    }
    const mesh = it.kind === 'wine' && it.name.startsWith('jug') ? 'jug' : it.kind === 'dagger' ? 'dagger2' : it.kind === 'cellkey' ? 'keys' : it.kind;
    const flat = it.kind === 'dagger' || it.kind === 'bone' || it.kind === 'keys' || it.kind === 'cellkey' || it.kind === 'sword' || it.kind === 'spear';
    const m = flat ? m4trs(it.x, it.y + 0.05, it.z, hrand(it.x * 10, it.z * 10, 1, 1) * 6, Math.PI / 2, 0, it.kind === 'dagger' ? 2.2 : it.kind === 'sword' || it.kind === 'spear' ? 1 : 1.2) : m4trs(it.x, it.y, it.z, 0.6, 0, 0, 1.3);
    drawM(mesh, m, light, 0.06 + 0.05 * Math.sin(gameTime * 3));
  }
  // ring and chain
  const ring = feature('ring') || { x: -1e4, y: 0, z: -1e4, wall: 'N' }, rn = wallIn(ring.wall), rl = sampleLight(ring.x + rn[0], 1, ring.z + rn[1]);
  drawM('ring', m4trs(ring.x + rn[0] * 0.08, ring.y, ring.z + rn[1] * 0.08, Math.atan2(rn[0], rn[1]), 0, 0, 1.4), rl);
  const A = [ring.x + rn[0] * 0.12, ring.y - 0.22, ring.z + rn[1] * 0.12];
  if (feature('ring')) {
  const fx = ring.x + rn[0] * 1.6 + rn[1] * 0.5, fz = ring.z + rn[1] * 1.6 + rn[0] * 0.5;
  const B = S.flags.free ? [fx, groundInfo(fx, fz).floor + 0.03, fz] : [px, py + 0.12, pz];
  const dist = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), n = Math.max(4, Math.ceil(dist / 0.17)), sag = Math.sqrt(Math.max(0, 3.6 * 3.6 - dist * dist)) * 0.45;
  let lp = A;
  for (let i = 1; i <= n; i++) {
    const tt = i / n, x = lerp(A[0], B[0], tt), z = lerp(A[2], B[2], tt);
    const y = Math.max(groundInfo(x, z).floor + 0.03, lerp(A[1], B[1], tt) - sag * Math.sin(Math.PI * tt));
    const dx = x - lp[0], dy = y - lp[1], dz = z - lp[2];
    drawM('link', m4trs((x + lp[0]) / 2, (y + lp[1]) / 2, (z + lp[2]) / 2, Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)), i % 2 ? Math.PI / 2 : 0, 1), sampleLight(x, y + 0.5, z));
    lp = [x, y, z];
  }
  }
  const nt = feature('niche_torch');
  if (nt && !S.flags.has_torch) {
    const tm = m4trs(nt.x + 0.16, nt.y + 0.1, nt.z, 0, 0, -0.25, 1.3), ll = [1, 0.7, 0.45]; ll.d = [0, 1, 0];   // a hand torch, about a metre long
    drawM('vm_torch', tm, ll);
    for (let k = 0; k < 3; k++) drawM(k === 2 ? 'vm_flame_core' : 'vm_flame', m4mul(tm, m4trs(0, 0.33, 0, gameTime * (1.5 + k) + k, 0.08 * Math.sin(gameTime * 9 + k), 0, [1.05, 0.8, 0.55][k] * (1 + 0.2 * Math.sin(gameTime * (13 + k * 5))))), ll, k === 2 ? 0.6 : 0.3);
  }
  // the cell door (swings into the hall) and the grille (slides up)
  const dl = sampleLight(8 * CELL, 1.5, 12.2 * CELL);
  const has = n => LEVEL.links.some(l => l.name === n);
  if (has('cell_door')) drawM('bars:2.5:3.2', m4trs(7 * CELL, 0, LEVEL.links.find(l => l.name === 'cell_door').cells[0][1] * CELL + CELL, 1.45 * smoothstep(0, 1, S.door.open), 0, 0, 1), dl);   // the vault's grille, swinging out
  const gl2 = sampleLight(GRILLE_X, 2, HALL_Z);
  if (has('grille_gate')) drawM('bars:5:7.5', m4trs(GRILLE_X, S.grille.open * 6.6, 13 * CELL + 5, Math.PI / 2, 0, 0, 1), gl2);
  if (has('portcullis')) drawM('bars:5:6', m4trs(45 * CELL, 0.4 + S.portc.open * 5.2, 13 * CELL + 5, Math.PI / 2, 0, 0, 1), sampleLight(45 * CELL, 2, HALL_Z));
  // the black giant
  const g = S.giant, gl = sampleLight(g.x, 1.5, g.z);
  if (g.state === 'gone') { /* not in this level */ } else if (g.state === 'crushed') {
    const k = smoothstep(0, 1, g.fall);
    drawCharacter('giant', g.x, g.y, g.z, g.yaw, { unarmed: true, pitch: -1.5 * k, roll: 0.3 * k, drop: 0.1 * k, uzL: 1.2 * k, uzR: 1.2 * k, txL: -0.4 * k, sxL: 0.8 * k, headX: -0.4 * k }, gl);
  } else {
    // at rest he stands tall and easy, gloating: sword point-down, keys dangling, weight shifting, eyes on you
    const P = poseIdle({}, gameTime), sway = Math.sin(gameTime * 0.7);
    let look = Math.atan2(S.x - g.x, S.z - g.z) - g.yaw; look = Math.atan2(Math.sin(look), Math.cos(look));
    Object.assign(P, { breathe: Math.sin(gameTime * 1.3) * 0.012, lean: -0.06, roll: sway * 0.03, twist: clamp(look, -0.5, 0.5) * 0.3,
      headY: clamp(look, -1.1, 1.1) * 0.6, headX: 0.12 + 0.04 * Math.sin(gameTime * 0.9),
      txL: 0.05 + sway * 0.04, txR: -0.05 - sway * 0.04, tzL: 0.08, tzR: 0.08, sxL: 0.05 + Math.max(0, sway) * 0.15, sxR: 0.05 + Math.max(0, -sway) * 0.15,
      uxR: 0.05, uzR: 0.14, fxR: -0.2, we: -1.35,                                    // the huge sword hanging point-down at his side
      uxL: 0.02, uzL: 0.12, fxL: -0.35 - 0.1 * Math.sin(gameTime * 2.1) });          // the keys jingling in the other fist
    if (g.arms > 0) Object.assign(P, { uxR: lerp(0.05, -2.9, g.arms), fxR: lerp(-0.2, -0.5, g.arms), uzR: lerp(0.14, 0.3, g.arms), we: lerp(-1.35, 2.5, g.arms),
      uxL: lerp(0.02, -0.6, g.arms), fxL: lerp(-0.35, -0.4, g.arms), lean: lerp(-0.06, -0.12, g.arms), headX: lerp(0.12, -0.25, g.arms), headY: P.headY * (1 - g.arms), twist: P.twist * (1 - g.arms) });
    if (g.state === 'enter') { poseWalk(P, g.walk * 2.9, 1.0, false); P.roll = Math.sin(g.walk * 2.9) * 0.05; P.lean = 0.04; P.uxL = 0.1 + Math.sin(g.walk * 2.9) * 0.25; P.headX = 0.05; }   // a big man's heavy, rolling stride, matched to the ground he covers
    drawCharacter('giant', g.x, g.y, g.z, g.yaw, P, gl);
  }
  // Shukeli, the jailer
  const sh = S.shukeli, sl = sampleLight(sh.x, 1.5, sh.z), shy = groundInfo(sh.x, sh.z).floor;
  if (sh.state === 'gone') { /* not in this level */ } else if (sh.state === 'dead') {
    const k = smoothstep(0, 1, sh.fall);
    const e2 = LEVEL.level === 'e1m2';
    drawCharacter('shukeli', sh.x + (e2 ? 0 : 0.3 * k), shy, sh.z + (e2 ? 0.25 * k : 0), e2 ? 0 : -Math.PI / 2, { pitch: 0.5 * k, roll: 0.3 * k, drop: -0.35 * k, headX: 0.5 * k, uzL: 0.6 * k, uzR: 0.6 * k }, sl);
  } else {
    const P = poseIdle({}, gameTime * 0.8);
    if (sh.state === 'away') { /* still up the stair */ } else {
    const moving = sh.state === 'walk' || sh.state === 'return' || sh.state === 'retreat' || sh.state === 'come';
    if (moving) poseWalk(P, sh.walk * 3, 0.7);
    P.fxL = -1.0; P.fxR = -1.0; P.uxL = -0.3; P.uxR = -0.3;                                                // hands clasped over the belly
    if (sh.state === 'peer') Object.assign(P, { lean: 0.22, headX: 0.25, uxL: -0.9, uxR: -0.9, fxL: -0.9, fxR: -0.9 });
    if (sh.state === 'idle' && sh.tauntT > 9) Object.assign(P, { uxR: -1.6, fxR: -0.6, headX: -0.2 });      // a mocking wave
    if (sh.state === 'gloat') Object.assign(P, { lean: 0.15, headX: 0.2, uxL: -1.0, fxL: -1.2, uxR: sh.tauntT > 4.5 ? -1.7 : -0.3, fxR: -0.7 });   // gripping the bars, mocking
    drawCharacter('shukeli', sh.x, shy, sh.z, sh.yaw, P, sl);
    }
  }
  drawFoes();
  drawNPC(); drawAllies(); drawEagleBeat();
  if (S.shamu) {
    const M = S.shamu;
    LEVEL.charges.forEach((c, i) => {
      if (M.hoof[i] < 0) return;
      const x = c.x * CELL, z = M.hoof[i], y = groundInfo(x, z).floor, yaw = c.dir > 0 ? 0 : Math.PI, l = sampleLight(x, y + 1.5, z), gal = gameTime * 14 + i;
      drawHorse(x, y, z, yaw, gal, l);
      drawCharacter('oknight', x, y + seatY() + Math.abs(Math.sin(gal)) * 0.1, z - (c.dir > 0 ? 0.1 : -0.1), yaw, { txL: -1.4, txR: -1.4, sxL: 1.5, sxR: 1.5, tzL: 0.4, tzR: 0.4, uxR: -1.4, fxR: -0.1, we: 0.05, lean: 0.2, uxL: -0.4, fxL: -1.2 }, l);
    });
    const hp = LV.props.find(q => q.prefab === 'heap');   // the dead piled round the heap: horses and men (drawn only; the sim never sees them)
    if (hp && Math.hypot(hp.x - S.x, hp.z - S.z) < 140) {
      for (let k = 0; k < 5; k++) {
        const a = k * 1.256 + 0.3, x = hp.x + Math.cos(a) * 2.9, z = hp.z + Math.sin(a) * 2.9, y = groundInfo(x, z).floor;
        drawHorse(x, y, z, a + 1.2 + k, 0, sampleLight(x, y + 1, z), true);
      }
      for (let k = 0; k < 7; k++) {
        const a = k * 0.9 + 0.75, r = 2.2 + (k % 3) * 0.5, x = hp.x + Math.cos(a) * r, z = hp.z + Math.sin(a) * r, y = groundInfo(x, z).floor;
        drawCharacter(['kknight', 'oknight', 'spearman'][k % 3], x, y + 0.12, z, a * 2.3 + k, { unarmed: true, noShield: true, pitch: -1.5, roll: 0.3 * (k % 2 ? 1 : -1), drop: 0.08, uzL: 1.0, uzR: 0.7, txL: -0.3, sxL: 0.6, headX: -0.3 }, sampleLight(x, y + 0.5, z));
      }
    }
    if (LEVEL.host) {                                  // the ranks of the host, pikes up, closing the field to the east
      const H = LEVEL.host;
      H.x.forEach((hx, r) => {
        for (let hz = H.z[0] + r * H.step / 2; hz <= H.z[1]; hz += H.step) {
          const x = hx * CELL, z = hz * CELL;
          if (Math.hypot(x - S.x, z - S.z) > 110) continue;
          const y = groundInfo(x, z).floor, P = poseIdle({}, gameTime * 0.7 + hz);
          drawCharacter('pikeman', x, y, z, -Math.PI / 2 + Math.sin(hz * 3.1) * 0.15, Object.assign(P, { we: 1.35 }), sampleLight(x, y + 1.5, z));   // "giants in their steel caps and mail brigandines"
        }
      });
    }
    if (M.phase !== 'fight') {                         // the kings, watching from their horses
      for (const [kx, kz, who] of LEVEL.kings.riders) {
        const x = kx * CELL, z = kz * CELL, y = groundInfo(x, z).floor, l = sampleLight(x, y + 1.5, z);
        drawHorse(x, y, z, -Math.PI / 2, 0, l); drawCharacter(who, x, y + seatY(), z, -Math.PI / 2, { txL: -1.4, txR: -1.4, sxL: 1.5, sxR: 1.5, tzL: 0.4, tzR: 0.4, unarmed: true, noShield: true }, l);
      }
      const ts = M.tsotha, tl = sampleLight(ts.x, 2, ts.z);
      const th = LEVEL.kings.horse; drawHorse(th[0] * CELL, groundInfo(th[0] * CELL, th[1] * CELL).floor, th[1] * CELL, -Math.PI / 2, 0, tl);
      if (ts.state !== 'away') {
        const P = poseIdle({}, gameTime);
        if (ts.state === 'walk') poseWalk(P, ts.walk * 3, 0.7);
        if (ts.state === 'offer') Object.assign(P, { uxR: -0.9, fxR: -0.8, headX: 0.15 });
        if (ts.state === 'touch') Object.assign(P, { uxL: -1.3, fxL: -0.3, lean: 0.25 });
        drawCharacter('tsotha', ts.x, groundInfo(ts.x, ts.z).floor, ts.z, ts.yaw, P, tl);
      }
    }
  }
  // the planks: whole, shaking as they crack, and the halves tumbling into the dark when they go
  if (S.planks) LV.planks.forEach((p, i) => {
    const st = S.planks[i], dx = p.x1 - p.x0, dz = p.z1 - p.z0, L = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2, l = sampleLight(cx, p.y + 0.5, cz);
    if (st.state !== 'gone') {
      const sh = st.state === 'cracking' ? Math.sin(gameTime * 60) * 0.015 : 0, sag = st.state === 'cracking' ? 0.06 : 0.015;
      drawM('plank', m4mul(m4trs(cx, p.y - 0.04 - sag + sh, cz, yaw, 0, 0, 1), m4s3(1, 1, L)), l);
    } else if (st.fall < 3) {                            // the two halves, hinged off the rims, then falling free
      const f = st.fall, drop = 4.9 * f * f;
      for (const s2 of [-1, 1]) {
        const ex = s2 < 0 ? p.x0 : p.x1, ez = s2 < 0 ? p.z0 : p.z1, mx = (ex + cx) / 2, mz = (ez + cz) / 2;
        drawM('plank', m4mul(m4trs(mx, p.y - 0.04 - drop * (0.6 + 0.4 * (s2 > 0)), mz, yaw + f * s2 * 0.8, s2 * Math.min(1.4, f * 3), f * 2 * s2, 1), m4s3(1, 1, L / 2)), l);
      }
    }
  });
  // writing scratched into the walls wherever there is something to read
  for (const d of WALL_DECALS) { R.key = d.l.d; R.drawEntity(d.mesh, m4ident(), d.l, 0, 1, true, true); }
  // e1m3: what comes up out of the well; the cage of bars with a garden in it
  if (S.tun) {
    const T = S.tun, W = LEVEL.well, a = T.pres === 'up' ? 0.13 : T.pres === 'rising' ? 0.03 + 0.1 * smoothstep(0, 5, T.pt) : T.gt < 1.4 ? 0.05 * (1 - T.gt / 1.4) : 0;
    if (a > 0.005) {
      const wx = (W.x[0] + W.x[1]) / 2 * CELL, wz = (W.row + 0.5) * CELL, pl = [0.55, 0.62, 0.68];
      pl.d = [0, 1, 0];
      R.blend(true);
      for (let k = 0; k < 3; k++) drawPart('presence', 'presence', m4mul(m4trs(wx + Math.sin(gameTime * 0.7 + k * 2.1) * 1.3, -1.5 + (T.pres === 'up' ? 0 : -2) + Math.sin(gameTime * 1.3 + k * 2) * 0.4, wz + Math.cos(gameTime * 0.5 + k) * 0.5, gameTime * (0.3 + k * 0.2) + k * 2, 0.08 * Math.sin(gameTime * 0.9 + k), 0.06 * Math.cos(gameTime * 1.1 + k), 1), m4s3(0.7 + 0.25 * k, 1 + 0.1 * Math.sin(gameTime * 2 + k), 0.7 + 0.25 * k)), pl, 0.25, a * (0.5 + 0.25 * Math.sin(gameTime * 5 + k * 1.7)));
      R.blend(false);
    }
    const gr = LV.rooms.find(r => r.id === 'garden');
    if (gr) for (let i = 0; i < 7; i++) {                 // the garden behind the bars: pale stems, jade leaves, livid blossoms
      const x = (gr.at[0] + 0.9 + hrand(i, 3, 7, 1) * (gr.size[0] - 1.4)) * CELL, z = (gr.at[1] + 0.6 + hrand(i, 5, 9, 1) * (gr.size[1] - 1.2)) * CELL;
      drawM('plant', m4trs(x, 0, z, hrand(i, 1, 2, 1) * 6.3, 0.05 * Math.sin(gameTime * 0.8 + i), 0, 0.8 + 0.6 * hrand(i, 2, 4, 1)), sampleLight(x, 1.5, z), 0.2);
    }
    if (gr) for (let i = 0; i < gr.size[1]; i++) drawM('bars:2.5:4.2', m4trs(gr.at[0] * CELL, 0, (gr.at[1] + i) * CELL, -Math.PI / 2, 0, 0, 1), sampleLight(gr.at[0] * CELL, 1.5, (gr.at[1] + i + 0.5) * CELL));
  }
  // Satha (README MODELS §5.2): sculpted head and jaw, and one smooth body tube
  // rebuilt each frame along her spine, drawn in chunks so each is lit locally.
  if (t >= 0) {
    selectSathaPath();
    const sHead = sathaS(t + alpha * DT);
    if (sHead - BODY_LEN < SATHA_PATH.len) {
      const raw = spineAt(sHead), ahead = spineAt(sHead + SERP_LAMBDA / 4), behind = spineAt(sHead - 0.8);
      const h = [lerp(raw[0], (ahead[0] + behind[0]) / 2, 0.45), raw[1], lerp(raw[2], (ahead[2] + behind[2]) / 2, 0.45)];   // the head rides steadier than the body
      const hg = groundInfo(h[0], h[2]);
      const rear = inVault(h[0], h[2]) ? 1.7 : 0;                                                                         // in the vault she rears over the king
      if (hg.kind === 1 && h[1] < hg.floor + 2.5) h[1] = hg.floor + 0.62 + rear + 0.1 * Math.sin(gameTime * 2.3);       // held up, gently bobbing
      const fa = [ahead[0], h[1], ahead[2]], fb = behind;
      const tx = fa[0] - fb[0], ty = fa[1] - fb[1], tz = fa[2] - fb[2], th = Math.hypot(tx, tz);
      let yaw = th < 0.2 * Math.hypot(tx, ty, tz) ? (sHead < SATHA_PATH.len / 2 ? Math.PI / 2 : Math.PI) : Math.atan2(tx, tz), hp = -Math.atan2(ty, th);
      if (rear) {                                         // "the head was poised high above his own": she turns it down to look at him
        const kd = Math.hypot(S.x - h[0], S.z - h[2]), w = clamp(1.6 - kd / 3.2, 0, 0.85);
        let dy = Math.atan2(S.x - h[0], S.z - h[2]) - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        yaw += dy * w; hp = lerp(hp, Math.atan2(h[1] - (S.y + 0.4), Math.max(0.5, kd)) * 0.8, w);
      }
      const hm = m4trs(h[0], h[1], h[2], yaw, hp, 0, typeof SKINNED !== 'undefined' && SKINNED.satha_head ? 1.15 : 0.82);   // the built head: a viper's, broader than her neck
      const hl0 = sampleLight(h[0], h[1] + 1, h[2]), hl = [hl0[0] * SATHA_HEAD_L[0], hl0[1] * SATHA_HEAD_L[1], hl0[2] * SATHA_HEAD_L[2]]; hl.d = hl0.d;   // the head's own texture is pale: dim the light on it to match the dark hide
      if (h[1] > -10) {
        const jaw = clamp((S.satha.cool - 0.8) * 2.5, 0, 1) + clamp((S.satha.spitCool - 1.8) * 2.5, 0, 1);
        const jm = m4mul(hm, m4mul(m4t(0, -0.1, -0.3), m4mul(m4rx(Math.min(1, jaw) * 0.65 + 0.06 * Math.sin(gameTime * 3)), m4t(0, 0.1, 0.3))));
        drawPart('satha_head', 'satha_head_uv', hm, hl, SATHA_GLOW); drawPart('satha_jaw', 'satha_jaw_uv', jm, hl, SATHA_GLOW);   // only a faint sheen of her own: the torch models her
      }
      if (!sathaMeshes) sathaMeshes = Array.from({ length: SATHA_CHUNKS }, () => R.createMesh(new Float32Array(10)));
      const down = norm3([-hm[4], -hm[5], -hm[6]]), L = BODY_LEN, cl = L / SATHA_CHUNKS, fw = norm3([hm[8], hm[9], hm[10]]);
      // the neck: the first stretch of the body grows out of the back of the skull, then joins the spine
      // the neck grows out of the skull's own stump (measured on the model: 0.4 m behind its origin, 0.21 m up, about 0.4 m across)
      const upv = norm3([hm[4], hm[5], hm[6]]), hs = typeof SKINNED !== 'undefined' && SKINNED.satha_head ? 1.15 : 0.82;
      const stump = [h[0] + upv[0] * 0.21 * hs - fw[0] * 0.4 * hs, h[1] + upv[1] * 0.21 * hs - fw[1] * 0.4 * hs, h[2] + upv[2] * 0.21 * hs - fw[2] * 0.4 * hs];
      const body = dd => {
        const p = onFloor(spineAt(sHead - 0.55 - dd), sathaRadius(Math.min(1, Math.max(0, dd) / L))); p[1] += rear * (1 - smoothstep(0, 5.5, dd));   // the reared neck eases down to the floor, no crease
        const w = smoothstep(-0.3, 2.4, dd), q = [stump[0] - fw[0] * dd, stump[1] - fw[1] * dd, stump[2] - fw[2] * dd];
        return [lerp(q[0], p[0], w), lerp(q[1], p[1], w), lerp(q[2], p[2], w)];
      };
      let B = down;
      const lum = l => l[0] + l[1] + l[2] + 1e-3, km = body(L * 0.3), key = sampleLight(km[0], km[1] + 1, km[2]).d;   // one key direction for the whole body
      for (let c = 0; c < SATHA_CHUNKS; c++) {
        const d0 = c * cl, st = c === 0 ? -0.55 : d0, len = d0 + cl - st, mid = body(d0 + cl / 2);   // the first chunk starts inside the skull
        const lc = sampleLight(mid[0], mid[1] + 1, mid[2]), lm = lum(lc);
        const shade = p => clamp(lum(sampleLight(p[0], p[1] + 1, p[2])) / lm, 0.5, 1.6);   // each ring lit where it is: no step in brightness at the joins
        const data = buildSathaTube(d => body(st + d), len, 0.6, B, tt => sathaRadius(Math.max(0, st + tt * len) / L), shade);
        B = buildSathaTube.endB;
        // shift v so the pattern runs continuously from chunk to chunk
        for (let i = 7; i < data.length; i += 10) data[i] += st / 4.4;
        R.updateMesh(sathaMeshes[c], data);
        if (mid[1] < -14) continue;
        R.key = key;
        R.drawEntity(sathaMeshes[c], m4ident(), lc, SATHA_GLOW / 2, 1, true);   // a faint sheen of her own, so she shows coming in the dark
      }
    }
  }
  for (const p of S.proj) {
    const light = sampleLight(p.x, p.y, p.z);
    if (p.type === 'bone') drawM('bone', m4trs(p.x, p.y, p.z, Math.atan2(p.vx, p.vz), p.spin, 0, 1.3), light);
    else if (p.type === 'arrow') drawM('arrow', m4trs(p.x, p.y, p.z, Math.atan2(p.vx, p.vz), -Math.atan2(p.vy, Math.hypot(p.vx, p.vz)), 0, 1.2), light);
    else drawM('venom', m4trs(p.x, p.y, p.z, Math.atan2(p.vx, p.vz), 0, p.spin, 1.2), light, 0.5);
  }
  for (const p of particles) {
    const name = p.m === 'venom' ? 'venom' : p.m === 'blood' ? 'blood' : p.m === 'spark' ? 'spark' : 'drop';
    drawM(name, m4trs(p.x, p.y, p.z, p.life * 3, 0, 0, p.s * (p.life / p.max) * (p.m === 'venom' ? 0.4 : 1)), sampleLight(p.x, p.y, p.z), p.m === 'venom' || p.m === 'spark' ? 0.6 : 0);
  }
  R.blend(true);
  for (const pd of S.puddles) drawM('puddle', m4trs(pd.x, pd.y, pd.z, 0, 0, 0, 0.6 + 0.4 * Math.min(1, (6 - pd.t) * 3)), sampleLight(pd.x, pd.y + 0.5, pd.z), 0.1, Math.min(0.6, pd.t * 0.5));
  R.blend(false);
  // view-model: the hero's manacled right hand, with whatever is in it
  if ((mode === 'play' || mode === 'paused') && !window.NO_VIEWMODEL && cineT() < 0) {   // NO_VIEWMODEL: for the gallery's photographs; none in the closing scene
    R.clearDepth(); R.lightMul(1);
    R.setCamera(m4persp(60 * Math.PI / 180, R.aspect, 0.01, 10), [0, 0, 0], [0.1, 0.2, 0.3], [0, 0, 0], 1, 0);
    const am = sampleLight(px, py + 1.2, pz), vl = [am[0] + 0.05, am[1] + 0.045, am[2] + 0.04];
    if (torchLit()) { vl[0] += 0.42 * lc[0]; vl[1] += 0.42 * lc[1]; vl[2] += 0.42 * lc[2]; am.d = norm3([am.d[0] - Math.cos(S.yaw) * 2, am.d[1] + 1, am.d[2] + Math.sin(S.yaw) * 2]); }   // his own torch lights the sword hand
    vl.d = rotDir(m4mul(m4rx(-S.pitch), m4ry(-S.yaw)), am.d);
    const sb = Math.sin(bobPhase) * 0.012 * bobAmt, cb = Math.abs(Math.cos(bobPhase)) * 0.012 * bobAmt;
    const prog = S.swing > 0 ? 1 - S.swing / S.swingLen : 0, sw = S.swing > 0 ? Math.sin(prog * Math.PI) : 0, th = S.throwT > 0 ? Math.sin((1 - S.throwT / 0.35) * Math.PI) : 0;
    const wep = S.flags.has_bone ? 'bone' : S.weapon;
    const { hand, swordAt, blade, upper } = viewPose(wep, prog, sw, th, sb, cb, S.combo, S.parryT);
    drawM('vm_upper', upper, vl);
    // his own forearm and fist (the CC0 body, his baked skin), else the old modelled ones
    if (typeof SKINNED !== 'undefined' && SKINNED.vm_arm) { drawStatic('vm_arm', hand, vl); drawM('vm_manacle', hand, vl); drawM('vm_chain', hand, vl); }
    else { drawM('vm_forearm', hand, vl); drawM('vm_manacle', hand, vl); drawM('vm_chain', hand, vl); drawM('vm_hand_grip', hand, vl); }
    if (wep === 'bone') drawM('bone', m4mul(hand, m4trs(GRIP_C[0], GRIP_C[1], GRIP_C[2], Math.PI / 2, 0, 0, 0.42)), vl);
    else if (wep === 'dagger') drawM('dagger2', m4mul(hand, m4trs(0.05, GRIP_C[1], GRIP_C[2], 0, 0, Math.PI / 2, 1)), vl);
    else if (wep === 'sword') { drawM('sword', m4mul(swordAt, m4trs(0.05, GRIP_C[1], GRIP_C[2], 0, 0, Math.PI / 2, 0.62)), vl); if (blade) drawM('vm_hilt', hand, vl); }   // the hilt seated in the fist while the wrist cocks the blade
    else if (wep === 'spear') drawPart('w_spear', 'spear', m4mul(hand, m4trs(0.05, GRIP_C[1], GRIP_C[2] - 0.0, 0, 0, Math.PI / 2, 0.55)), vl);
    if (torchInHand()) {                     // the torch in his left fist: the right hand's model, mirrored
      const tf = norm3([-0.32 + sb * 2, 1.3, -0.7]), TX = [-tf[0], -tf[1], -tf[2]], tarm = [0.62, -0.55, 0.55];
      const td = tarm[0] * TX[0] + tarm[1] * TX[1] + tarm[2] * TX[2], TZ = norm3([tarm[0] - TX[0] * td, tarm[1] - TX[1] * td, tarm[2] - TX[2] * td]), TY = cross3(TZ, TX);
      const tpos = [0.5 - sb, -0.47 + cb, -0.52];
      const handR = new Float32Array([TX[0], TX[1], TX[2], 0, TY[0], TY[1], TY[2], 0, TZ[0], TZ[1], TZ[2], 0, tpos[0], tpos[1], tpos[2], 1]);
      const handL = m4mul(m4s3(-1, 1, 1), handR), tl = [0.85, 0.55, 0.3];
      tl.d = [0.2, 1, 0.3];
      if (typeof SKINNED !== 'undefined' && SKINNED.vm_arm) drawStatic('vm_arm', handL, tl); else { drawM('vm_forearm', handL, tl); drawM('vm_hand_grip', handL, tl); }
      const torch = m4mul(handL, m4trs(0.0, GRIP_C[1], GRIP_C[2], 0, 0, Math.PI / 2, 0.5));
      drawM('vm_torch', torch, tl);
      // the flame: three nested tongues, each flickering on its own, leaning with the draft
      const dr = S.tun ? S.tun.draft : [0, 0], lat = dr[0] * Math.cos(S.yaw) - dr[1] * Math.sin(S.yaw), fwd = -dr[0] * Math.sin(S.yaw) - dr[1] * Math.cos(S.yaw);
      const lean = clamp(S.tun ? fwd * 0.9 : S.windNow * 0.4, -0.9, 0.9), roll = clamp(-lat * 0.9, -0.9, 0.9);
      for (let k = 0; k < 3 && torchLit(); k++) {
        const fl = 1 + 0.22 * Math.sin(gameTime * (13 + k * 5) + k * 2) + 0.1 * Math.sin(gameTime * (31 + k * 7));
        drawM(k === 2 ? 'vm_flame_core' : 'vm_flame', m4mul(m4mul(torch, m4trs(0, 0.33, 0, 0, lean + 0.08 * Math.sin(gameTime * 9 + k), roll + 0.06 * Math.sin(gameTime * 7 + k * 3))), m4trs(0, 0, 0, gameTime * (1.5 + k) + k, 0, 0, [1.05, 0.8, 0.55][k] * fl)), tl, 0.6);
      }
    }
  }
  R.present(fade, flash, flashCol);
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy -= (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const fl = groundInfo(p.x, p.z).floor; if (p.y < fl + 0.03) { p.y = fl + 0.03; p.vx *= 0.5; p.vz *= 0.5; p.vy = 0; }
  }
}

// ---------------------------------------------------------------- main loop
function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000 || 0.016);
  lastFrame = now; gameTime += dt;
  if (window.GALLERY_ON) { renderGallery(dt); requestAnimationFrame(frame); return; }   // index.html?cast: the cast gallery
  if (S) {
    if (AUTO) autoplayFrame(dt);
    if (mode === 'play' && !agentInput) {
      const sens = BASE_SENS * sensMul;
      S.yaw -= mouseDX * sens; S.pitch = clamp(S.pitch - mouseDY * sens, -1.45, 1.45);
      mouseDX = mouseDY = 0;
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 10 && mode === 'play') { tick(humanInput()); acc -= DT; n++; }
      if (n === 10) acc = 0;
    }
    renderAlpha = mode === 'play' && (!agentInput || AUTO) ? clamp((AUTO ? AUTO.acc : acc / DT), 0, 1) : 1;
    updateParticles(dt);
    fade += (fadeTarget - fade) * Math.min(1, dt * (fadeTarget > fade ? 4 : 2));
    flash = Math.max(0, flash - dt * 1.2);
    punchPitch *= Math.pow(0.0005, dt); punchYaw *= Math.pow(0.0005, dt);
    render(renderAlpha);
    hudT -= dt;
    if (hudT <= 0 && mode !== 'splash') { hudT = 0.1; updateHUD(); fadeLog(); }
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- input
function onResize() { R.resize(window.innerWidth, window.innerHeight, RES_STEPS[resIdx]); }
addEventListener('keydown', e => {
  if (mode === 'dead' && e.code === 'Enter') { respawn(); return; }
  if (mode === 'paused' && e.code === 'Enter') { hideOverlay(); mode = 'play'; lockPointer(); return; }
  if (e.code === 'F3') { e.preventDefault(); debugOn = !debugOn; return; }
  if (mode !== 'play') return;
  if (agentInput) { agentInput = null; AUTO = null; log('[You take back control.]', 'dim'); }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.repeat) return;
  switch (e.code) {
    case 'KeyE': pressUse = true; break;
    case 'KeyT': pressTorch = true; break;
    case 'KeyN': if (CHEAT && mode === 'play') finishLevel(); break;
    case 'KeyF': case 'KeyQ': pressKick = true; break;
    case 'KeyG': pressThrow = true; break;
    case 'KeyH': pressDrink = true; break;
    case 'Digit1': wantWeapon = 'fists'; break;
    case 'Digit2': wantWeapon = 'dagger'; break;
    case 'Digit3': wantWeapon = 'sword'; break;
    case 'Digit4': wantWeapon = 'spear'; break;
    case 'KeyP': resIdx = (resIdx + 1) % RES_STEPS.length; onResize(); log('Render resolution: ' + RES_STEPS[resIdx] + ' lines.', 'dim'); break;
    case 'KeyK': log(Sfx.toggleMute() ? 'Sound off.' : 'Sound on.', 'dim'); break;
    case 'F4': e.preventDefault(); R.palette = !R.palette; log(R.palette ? 'Palette on: the Quake look.' : 'Palette off: full colour.', 'dim'); break;
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas && mode === 'play') { mouseDX += e.movementX || 0; mouseDY += e.movementY || 0; }
});
canvas.addEventListener('mousedown', e => {
  Sfx.init();
  if (mode !== 'play') return;
  if (document.pointerLockElement !== canvas) { lockPointer(); return; }
  if (e.button === 0) pressFire = true;
  if (e.button === 2) pressKick = true;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => {
  if (mode !== 'play' || !S) return;
  const have = WEAPON_ORDER.filter(w => S.weapons[w]), i = have.indexOf(S.weapon);
  wantWeapon = have[(i + (e.deltaY > 0 ? 1 : have.length - 1)) % have.length];
}, { passive: true });
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && mode === 'play' && !agentInput) showPause();
});

// ---------------------------------------------------------------- writing cut into the walls
// The walls are jittered and bulged by the mesher, so a flat quad floats off them. Each scratching is
// instead projected onto the real wall: a grid of rays cast at the level mesh, the decal laid on the hits.
let WALL_DECALS = [];
function buildWallDecals(lm) {
  for (const d of WALL_DECALS) R.deleteMesh(d.mesh);
  WALL_DECALS = [];
  const tris = [];                                       // the level's near-vertical triangles, for ray tests
  for (let i = 0; i < lm.length; i += 30) {
    const ny = lm[i + 4];
    if (Math.abs(ny) < 0.6) tris.push(i);
  }
  const ray = (o, d) => {                                // nearest hit along d (Moller-Trumbore)
    let best = Infinity, bn = null;
    for (const i of tris) {
      const ax = lm[i], ay = lm[i + 1], az = lm[i + 2], e1 = [lm[i + 10] - ax, lm[i + 11] - ay, lm[i + 12] - az], e2 = [lm[i + 20] - ax, lm[i + 21] - ay, lm[i + 22] - az];
      if (Math.abs(ax - o[0]) > 6 || Math.abs(az - o[2]) > 6) continue;
      const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]], det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
      if (Math.abs(det) < 1e-9) continue;
      const inv = 1 / det, t0 = [o[0] - ax, o[1] - ay, o[2] - az], u = (t0[0] * p[0] + t0[1] * p[1] + t0[2] * p[2]) * inv;
      if (u < 0 || u > 1) continue;
      const q = [t0[1] * e1[2] - t0[2] * e1[1], t0[2] * e1[0] - t0[0] * e1[2], t0[0] * e1[1] - t0[1] * e1[0]], v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv;
      if (v < 0 || u + v > 1) continue;
      const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
      if (t > 0 && t < best) { best = t; bn = norm3([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]); }
    }
    return best < Infinity ? { t: best, n: bn } : null;
  };
  for (const f of LV.features) {
    if (f.type !== 'clue' || !f.wall) continue;
    const n = wallIn(f.wall), side = [n[1], 0, -n[0]];   // n points into the room; side runs along the wall
    const tally = f.id.startsWith('mark');
    const layer = tally ? T['TALLY' + ({ mark_one: 1, mark_two: 2, mark_three: 3 })[f.id]] : T.SCRATCH;
    const w = tally ? 0.32 : 0.75, h = 0.42, NX = 9, NY = 6, P = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const a = (i / NX * 2 - 1) * w, b = (j / NY * 2 - 1) * h;
      const o = [f.x + side[0] * a + n[0] * 1.2, f.y + b, f.z + side[2] * a + n[1] * 1.2];
      const hit = ray(o, [-n[0], 0, -n[1]]);
      const t = hit ? hit.t - 0.012 : 1.2 - 0.02;       // 12 mm proud of the stone, no more
      let nr = hit ? hit.n : [n[0], 0, n[1]]; if (nr[0] * n[0] + nr[2] * n[1] < 0) nr = [-nr[0], -nr[1], -nr[2]];
      P.push({ p: [o[0] - n[0] * t, o[1], o[2] - n[1] * t], nr, u: i / NX, v: 1 - j / NY });
    }
    const out = [];
    const V = q => out.push(q.p[0], q.p[1], q.p[2], q.nr[0], q.nr[1], q.nr[2], q.u, q.v, 1, layer);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = P[j * (NX + 1) + i], b = P[j * (NX + 1) + i + 1], c = P[(j + 1) * (NX + 1) + i + 1], d = P[(j + 1) * (NX + 1) + i];
      V(a); V(b); V(c); V(a); V(c); V(d);
    }
    const l = sampleLight(f.x + n[0], f.y, f.z + n[1]);
    WALL_DECALS.push({ mesh: R.createMesh(new Float32Array(out)), l });
  }
}

// ---------------------------------------------------------------- the cast's built models
// a rider's seat: the built war-horse stands taller than the old part-built one
function seatY() { return typeof SKINNED !== 'undefined' && SKINNED.horse ? 0.68 : 0.5; }
const W_MODELS = ['vm_arm', 'w_sword', 'w_greatsword', 'w_dagger', 'w_axe', 'w_spear', 'w_pike', 'w_bow'];
const ALL_MODELS = Object.keys(CAST).concat(['horse', 'steed', 'weeper_body', 'weeper_tentacle', 'weeper_head', 'yothga_stem', 'yothga_tendril', 'yothga_bloom', 'eagle_body', 'eagle_wing', 'satha_head', 'satha_jaw', 'presence'], W_MODELS);
// only what this level puts on screen
function levelCast(L) {
  const ids = new Set(W_MODELS.concat(L.satha || L.entities.some(e => e.class === 'scripted_satha') ? ['satha_head', 'satha_jaw'] : [])), map = { black_giant: ['giant'], monster_shukeli: ['shukeli'], thing: ['thing', 'thing_b', 'thing_c'], weeper: ['weeper_body', 'weeper_tentacle', 'weeper_head', 'presence'] };
  for (const e of L.entities) for (const id of (map[e.class] || (CAST[e.class] ? [e.class] : []))) ids.add(id);
  if (L.kings) { for (const r of L.kings.riders) ids.add(r[2]); ids.add('tsotha'); ids.add('horse'); ids.add('oknight'); }
  if (L.host) ids.add('pikeman');
  return [...ids];
}

// ---------------------------------------------------------------- boot
function boot() {
  try { R = new Renderer(canvas); }
  catch (e) { overlay.innerHTML = '<div class="panel"><h2>No WebGL2</h2><p>This game needs a browser with WebGL2. (' + e.message + ')</p></div>'; return; }
  R.gamma = brightness;
  onResize();
  addEventListener('resize', onResize);
  setTimeout(() => {
    R.uploadTextures(generateTextures());
    // Satha's hide: overlapping scales and belly plates (tools/textures/satha_scales.py), tinted dark (SATHA_HIDE)
    { const im = new Image(); im.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = TEX_SIZE; const x = c.getContext('2d'); x.drawImage(im, 0, 0, TEX_SIZE, TEX_SIZE);
        const d = x.getImageData(0, 0, TEX_SIZE, TEX_SIZE).data;
        let m = 0; for (let i = 0; i < d.length; i += 4) m += d[i]; m /= d.length / 4 * 255;
        for (let i = 0; i < d.length; i += 4) { const v = Math.min(1, 0.78 * (d[i] / 255) / m); d[i] = SATHA_HIDE[0] * v + 6; d[i + 1] = SATHA_HIDE[1] * v + 6; d[i + 2] = SATHA_HIDE[2] * v + 6; d[i + 3] = 0; }   // a dark hide: the scales' edges catch the torch, the rest stays in shadow
        R.updateLayer(T.SATHA, new Uint8Array(d.buffer));
      }; im.src = 'textures/satha_skin.png'; }
    R.setPalette(gamePalette());
    const q = new URLSearchParams(location.search);
    if (q.has('cast')) loadCastModels(ALL_MODELS).then(() => galleryShow(galleryIdx));
    loadLevel(LEVELS[q.get('level')] ? q.get('level') : 'e1m1');   // the campaign opens on the plain of Shamu; the pits come second
    lastFrame = performance.now();
    requestAnimationFrame(frame);
    if (q.has('cast')) { startGallery(q.get('cast')); return; }
    if (q.has('agent')) { mode = 'splash'; return; }
    showIntro();
  }, 30);
}
boot();
