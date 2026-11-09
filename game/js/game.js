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
const SIM_HZ = 72, DT = 1 / SIM_HZ, EYE = 1.6, RADIUS = 0.42, REACH = 2.7, TETHER = 3.2;
const BASE_SENS = 0.0022, RES_STEPS = [200, 240, 300, 360, 480, 600], SENS_KEY = 'cimmerian-sens', BRIGHT_KEY = 'cimmerian-bright';
const SATHA_SPEED = 7.5, SATHA_SPACING = 2.0, SATHA_SEGS = 12, SATHA_PERIOD = 40;
const GRILLE_X = 34 * CELL, HALL_Z = 14 * CELL;
let resIdx = 3, R = null, levelMesh = null, sensMul = 1, brightness = 1.14;
try { const v = parseFloat(localStorage.getItem(SENS_KEY)); if (v >= 0.1 && v <= 4) sensMul = v; } catch (e) { /* ignore */ }
try { const v = parseFloat(localStorage.getItem(BRIGHT_KEY)); if (v >= 0.8 && v <= 2.2) brightness = v; } catch (e) { /* ignore */ }

let mode = 'loading';            // loading | splash | play | paused | dead | done
let S = null;                    // simulation state
const keys = {};
let mouseDX = 0, mouseDY = 0, pressUse = false, pressFire = false, agentInput = null;
let acc = 0, lastFrame = 0, gameTime = 0, fade = 1, fadeTarget = 0, flash = 0, flashCol = [0.75, 0.06, 0.02];
let prev = { x: 0, y: 0, z: 0 }, renderAlpha = 0, hudT = 0, debugOn = false;
let particles = [], interactTarget = null, bobPhase = 0, bobAmt = 0, stepAcc = 0, chainSndT = 0, pressKick = false, wantWeapon = null;
let punchPitch = 0, punchYaw = 0;          // cosmetic view kick, never fed back into the sim

const modelCache = new Map();
function getModel(name) {
  let m = modelCache.get(name);
  if (!m) { m = R.createMesh(buildModel(name)); modelCache.set(name, m); }
  return m;
}
// draw a cached model; `light` comes from sampleLight and carries its key direction
function drawM(name, m, light, glow = 0, alpha = 1) {
  R.key = light.d || [0.3, 0.9, 0.3];
  R.drawEntity(getModel(name), m, light, glow, alpha, UV_MODELS.has(name));
}

// ---------------------------------------------------------------- text log
function log(text, cls = '') {
  if (!text) return;
  const el = document.createElement('div');
  el.className = 'line ' + cls;
  el.textContent = text;
  logEl.appendChild(el);
  while (logEl.children.length > 40) logEl.removeChild(logEl.firstChild);
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------------------------------------------------------------- state
const W = (gx, gz) => ({ x: gx * CELL, z: gz * CELL });
function feature(type) { return LV.features.find(f => f.type === type); }
function entitySpec(cls) { return LEVEL.entities.find(e => e.class === cls); }

// Satha's track: up out of the well, along the hall, into the serpent's hole
// and down into the rock. Corners are rounded so the body flows through them.
let SATHA_PATH = null;
function buildSathaPath() {
  const wx = 4 * CELL, tx = 28 * CELL, y = 0.85;
  const pts = [[wx, -36, HALL_Z], [wx, y, HALL_Z], [tx, y, HALL_Z], [tx, y, 12.3 * CELL], [tx, -14 + y, 4.5 * CELL], [tx, -52, 3.6 * CELL]];
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1], rad = 2.6;
    const d1 = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), d2 = norm3([c[0] - b[0], c[1] - b[1], c[2] - b[2]]);
    const p0 = [b[0] - d1[0] * rad, b[1] - d1[1] * rad, b[2] - d1[2] * rad], p2 = [b[0] + d2[0] * rad, b[1] + d2[1] * rad, b[2] + d2[2] * rad];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5, u = 1 - t;
      out.push([0, 1, 2].map(j => u * u * p0[j] + 2 * u * t * b[j] + t * t * p2[j]));
    }
  }
  out.push(pts[pts.length - 1]);
  const cum = [0];
  for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1], out[i][2] - out[i - 1][2]));
  SATHA_PATH = { pts: out, cum, len: cum[cum.length - 1] };
}
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
const SERP_ALPHA = 0.6, SERP_LAMBDA = 13;
const SERP_K = 2 * Math.PI / SERP_LAMBDA, SERP_AMP = SERP_ALPHA / SERP_K;    // lateral amplitude of that heading swing
function spineAt(s) {
  const p = pathAt(s), q = pathAt(s + 0.3), r = pathAt(s - 0.3);
  const tx = q[0] - r[0], tz = q[2] - r[2], th = Math.hypot(tx, tz), tl = Math.hypot(tx, q[1] - r[1], tz) || 1;
  // integrating heading alpha*sin(ks) gives a lateral offset of (alpha/k) * (1 - cos(ks)); centre it on the path
  const horiz = th / tl, ramp = smoothstep(0, 6, s - 36);            // straight while she rises out of the well
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
const SATHA_CHUNKS = 4;
let sathaMeshes = null;
const sathaRadius = t => t < 0.12 ? 0.68 + 0.17 * smoothstep(0, 0.12, t) : t < 0.45 ? 0.85 + 0.03 * smoothstep(0.12, 0.45, t) : Math.max(0.04, 0.88 * Math.pow(1 - (t - 0.45) / 0.55, 0.85));
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
  return {
    seed, level: LEVEL.level, tick: 0, rng: new RNG(hash4(seed, 0xC1, LEVEL.level.charCodeAt(3), 0)),
    x: sp.x, y: 0, z: sp.z, yaw: start.yaw, pitch: -0.12, vx: 0, vy: 0, vz: 0, onGround: true,
    health: carry ? Math.max(60, carry.health) : 100, deaths: carry ? carry.deaths : 0, passes: 0, kills: carry ? carry.kills : 0,
    flags: Object.fromEntries(LEVEL.puzzle.flags.map(f => [f, false])),
    read: new Set(), visited: new Set(), room: '', hints: carry ? new Set(carry.hints) : new Set(),
    items: LV.items.map(it => Object.assign({}, it, { taken: false })),
    door: { open: 0, target: 0 }, grille: { open: 0, target: 0 },
    giant: { state: g ? 'wait' : 'gone', x: gp.x, z: gp.z, y: 0, yaw: Math.PI, t: 0, walk: 0, arms: 0, grabT: 0, fall: 0 },
    satha: { start: null, active: false, cool: 0, spitCool: 0, pts: null, warned: 0, lastPhase: -1 },
    shukeli: { state: sh ? 'idle' : 'gone', x: shp.x, z: shp.z, homeX: shp.x, homeZ: shp.z, yaw: -Math.PI / 2, t: 0, walk: 0, tx: 0, tz: 0, sawT: 0, tauntT: 6, ignoreT: 0, fall: 0, seenOnce: false },
    proj: [], puddles: [], swing: 0, swingLen: 0.4, throwT: 0, kickT: 0, combo: 0, lastSwing: -999, pendingHit: null,
    weapons: carry ? Object.assign({}, carry.weapons) : { fists: true, dagger: false, sword: false }, weapon: carry ? carry.weapon : 'fists', hits: 0,
    foes: newFoes(), alerted: new Set(), areas: new Set([LEVEL.areas[0].id]), portc: { open: 0, target: 0, dropT: 0 },
    gates: Object.fromEntries(LEVEL.links.filter(l => !fixed.includes(l.name)).map(l => [l.name, { open: 0, target: 0 }])),
    valves: LEVEL.valves ? LEVEL.valves.at.map(() => 1) : [], wind: 0, windNow: 0, windSnd: 0,
    boom: { angle: LEVEL.boom ? LEVEL.boom.over : 0, target: LEVEL.boom ? LEVEL.boom.over : 0 }, stone: { drop: 0, target: 0 },
    checkpoint: { x: sp.x, z: sp.z, yaw: start.yaw }, timeFree: -1, doneT: -1, playTicks: carry ? carry.playTicks : 0,
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
function blockedCell(gx, gz, feet) {
  const idx = cellIdx(gx, gz);
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
  return c;
}
const GRILLE_CELLS = new Set();
function collide(x, z, r, feet, self) {
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
      if (!blockedCell(gx, gz, feet)) continue;
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
    if (S.vy < -15) { Sfx.thud && Sfx.thud(); const dmg = Math.round((-S.vy - 15) * 6); if (dmg > 2) hurt(dmg, 'fall'); }
    S.y = g.floor; S.vy = 0;
  }
  S.onGround = S.y - g.floor < 0.02;
  if (g.kind && S.y + 1.8 > g.ceil) { S.y = Math.max(g.floor, g.ceil - 1.8); if (S.vy > 0) S.vy = 0; }
  return { g, sp };
}

// ---------------------------------------------------------------- damage & death
const DEATHS = {
  crush: 'Satha\'s coils roll over you like a landslide of green iron. Bones go like kindling.',
  bite: 'The great head strikes faster than thought. The pits grow very quiet.',
  venom: 'The venom eats through you like fire through dry grass. You die on the flagstones of the hall.',
  fall: 'You go over the lip of the serpent\'s well. The dark below has no bottom that you live to find.',
  strangle: 'The giant\'s hands close and do not open again.',
  blade: 'A warden\'s blade finds you. The pits keep their prisoner after all.',
  spear: 'The spear goes in under your ribs, and the dark comes up to meet you.',
  arrow: 'The arrow takes you in the throat. You drown on dry stone.',
  axe: 'The long axe comes down like a falling tree.',
  claws: 'They are on you in the dark, all claws and dripping jaws, and the pits keep what they catch.',
  weeper: 'The quaking mass flows over you, and its laughter is the last thing you hear.',
};
function hurt(n, why) {
  if (mode !== 'play') return;
  S.health -= n;
  if (why === 'venom') flashCol = [0.12, 0.55, 0.3]; else flashCol = [0.75, 0.06, 0.02];
  flash = Math.min(0.6, flash + n / 70);
  if (n >= 5) Sfx.hurt();
  if (S.health <= 0) { S.health = 0; die(why); }
}
function die(why) {
  if (mode !== 'play') return;
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
  if (S.flags.shukeli_dead) alertGroup('barracks', true);      // the alarm has been raised; it stays raised
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
      if (S.flags.free) { log('The broken chain hangs from the ring like a dead snake.', 'dim'); return; }
      if (!S.read.has('insc_cell')) {
        Sfx.chain();
        log('You haul on the chain until the veins stand out on your neck. The ring does not so much as creak. There must be a weaker place.');
        if (!S.hints.has('ring')) { S.hints.add('ring'); log('(Something is scratched into the west wall.)', 'dim'); }
        return;
      }
      freeFromChain(); return;
    case 'clue':
      log(f.text, 'clue'); S.read.add(f.id); Sfx.blip(); return;
    case 'bones':
      if (S.flags.has_bone) { log('You already have a bone in hand.', 'dim'); return; }
      setFlag('has_bone'); Sfx.clatter();
      log('You pull a long thighbone from the heap. It is heavy enough to make a fine clatter. (Click to throw it.)');
      return;
    case 'door':
      if (S.door.open >= 0.5) return;
      if (S.flags.has_cellkey) {
        S.door.target = 1; setFlag('cell_open'); Sfx.clank(); Sfx.bars();
        log('The second key turns, and the barred door grinds open on the hall.', 'good');
      } else log('The door is barred iron and locked. The bars are as thick as your thumb.', 'dim');
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
    case 'valve': {
      const v = S.valves[f.idx] = 1 - S.valves[f.idx];
      Sfx.clank(); Sfx.grind();
      log(v ? 'You haul the lever up. The vent grinds open, and the air in it sighs.' : 'You drag the lever down. An iron shutter grinds across the vent.', 'dim');
      return;
    }
    case 'boom':
      if (S.stone.target > 0 && !S.flags.stone_down) { log('Not while the stone hangs on the rope.', 'dim'); return; }
      if (S.flags.stone_down) return;
      S.boom.target = S.boom.target === LEVEL.boom.over ? LEVEL.boom.floor : LEVEL.boom.over; Sfx.grind();
      log(S.boom.target === LEVEL.boom.floor ? 'You put your shoulder to the mast. The arm creaks round until the stone hangs over solid floor.' : 'You swing the arm back over the shaft.', 'dim');
      return;
    case 'windlass':
      if (S.flags.stone_down) return;
      if (!S.flags.has_crank) { log('The windlass has no crank. Someone took it.', 'dim'); return; }
      if (S.boom.target !== LEVEL.boom.floor) {
        log('You fit the crank and the stone begins to sink, straight toward the black mouth of the shaft. You stop. Let it down there, and the deep will have it.', 'warn');
        if (!S.hints.has('boom')) { S.hints.add('boom'); log('(Swing the arm out over the floor first.)', 'dim'); }
        return;
      }
      S.stone.target = 1; Sfx.chain(); Sfx.grind();
      log('You fit the crank and pay out the rope, hand over hand. The stone comes down out of the dark.', 'good');
      return;
    case 'sigil_door':
      if (S.gates.sigil_gate.target > 0) return;
      if (!S.flags.has_sigil) { log('A round socket is cut into the face of the slab, as wide as a cart-wheel\'s hub, ringed with carving.', 'dim'); return; }
      S.flags.has_sigil = false; S.gates.sigil_gate.target = 1; Sfx.magic ? Sfx.magic() : Sfx.sting(); Sfx.bars();
      log('You set the sigil-stone in the socket. The rings blaze cold and green, and the slab begins, very slowly, to sink into the floor.', 'good');
      for (const f of S.foes) if (f.group === 'gatewave' && f.state === 'dormant') f.wake = S.tick + Math.round(f.delay * SIM_HZ);
      log(ALERT_LINES.gatewave, 'bad'); S.alerted.add('gatewave');
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
    if (S.health >= 100) { log('You are not hurt. You leave the ' + it.name + ' for later.', 'dim'); return; }
    S.health = Math.min(100, S.health + it.heal); it.taken = true; Sfx.heal();
    log(it.kind === 'bread' ? 'You wolf down the ' + it.name + '. Stale, gritty, and better than any feast. (+' + it.heal + ')' : 'You drink the ' + it.name + '. It burns going down. (+' + it.heal + ')', 'good');
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
      log('You take up the strangler\'s sword: a huge blade, Kushite-forged, and your hand knows it at once. (Click, click, click for a three-blow combination; right-click or F to kick.)', 'good');
      const w0 = S.foes.find(f => f.id === 'w0');
      if (w0 && !w0.dead && !w0.alert) { w0.state = 'investigate'; w0.tx = 26.5 * CELL; w0.tz = 14.6 * CELL; w0.alert = true; S.alerted.add('scout'); log(ALERT_LINES.scout, 'warn'); }
    } else log('You take up the sword.', 'good');
  } else if (it.kind === 'cellkey') {
    setFlag('has_cellkey'); log('You snatch up the strangler\'s keys. Shukeli\'s keys: he stole them to come and gloat.', 'good');
  } else if (it.kind === 'crank') {
    setFlag('has_crank'); log('You pull the windlass crank from the dead apprentice\'s grip. His fingers do not want to let it go.', 'good');
  } else if (it.kind === 'sigil') {
    setFlag('has_sigil'); log('You lift the sigil-stone. The carved rings on its face glow faintly against your palm, cold as well-water.', 'good');
  } else if (it.kind === 'spear') {
    if (S.flags.has_spear) { it.taken = false; log('You already carry a spear.', 'dim'); return; }
    setFlag('has_spear'); log('You take up the dead man\'s spear and sling it across your back.');
  } else if (it.kind === 'keys') {
    setFlag('has_keys');
    log('You reach through the bars\' shadow and take up the ring of keys. They are warm from the jailer\'s belt.', 'good');
  }
}
function onFire(kick) {
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
// sword and in the other a bunch of keys". He stands in the hall to gloat. When the chain
// parts he swings the sword up, and the keys fly from his fist through the bars; then Satha.
function updateGiant() {
  if (S.giant.state === 'gone') return;
  const g = S.giant; g.t += DT;
  switch (g.state) {
    case 'wait': g.yaw = Math.PI; break;
    case 'raise':
      g.yaw = Math.PI;
      g.arms = Math.min(1, g.arms + DT * 2.5);
      if (g.t > 0.35 && !S.items.some(i => i.kind === 'cellkey')) {
        const kx = 7.5 * CELL + 0.3, kz = 11.7 * CELL;
        S.items.push({ id: 'cellkey', kind: 'cellkey', name: 'strangler\'s keys', x: kx, z: kz, y: groundInfo(kx, kz).floor, taken: false });
        Sfx.clatter(); Sfx.chain();
        log('The black giant roars and swings up his huge sword, and the keys fly from his other fist, skitter through the bars and lie almost at your feet.', 'warn');
      }
      break;
    case 'crushed':
      g.fall = Math.min(1, g.fall + DT * 2.2);
      break;
  }
  if (g.state === 'raise' && S.satha.pts) {
    const h = S.satha.pts[0];
    if (h.y > -0.5 && Math.hypot(h.x - g.x, h.z - g.z) < 2.6) {
      g.state = 'crushed'; g.t = 0; Sfx.crush(); Sfx.scream();
      S.items.push({ id: 'giant_sword', kind: 'sword', name: 'strangler\'s sword', x: g.x + 0.6, z: 36.9, y: groundInfo(g.x + 0.6, 36.9).floor, taken: false });
      log('Behind him the great head rises out of the dark. Satha takes him with his sword still raised. Bones crack like green wood, and the sword rings away across the flagstones.', 'warn');
      for (let k = 0; k < 18; k++) particles.push({ m: 'blood', x: g.x, y: 1 + Math.random(), z: g.z, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 0.9, max: 0.9, g: 9, s: 1.4 });
    }
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
  const sa = S.satha, t = sathaPhase();
  sa.cool -= DT; sa.spitCool -= DT;
  if (t < 0) { sa.active = false; sa.pts = null; return; }
  // warnings: README rule 4 (period stated in a clue, and visible in the world)
  if (sa.lastPhase > t || sa.lastPhase < 0) {
    sa.warned++; Sfx.rumble();
    if (sa.warned <= 2) log(sa.warned === 1 ? 'Every torch in the hall bows and gutters at once. Under your feet the stone begins to shiver.' : 'The torches bow and gutter. Something vast is coming up out of the well.', 'warn');
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
  const hidden = hiddenAt(S.x, S.z), py = S.y + 0.9;
  // crushing contact with any part of the body
  for (const p of sa.pts) {
    if (Math.abs(p.y - py) > p.r + 1.0) continue;
    const dx = S.x - p.x, dz = S.z - p.z, d = Math.hypot(dx, dz);
    if (d < p.r + RADIUS) { hurt(4.5, 'crush'); if (mode !== 'play') return; }
  }
  const h = sa.pts[0];
  if (h.y < -0.5) return;
  const dx = S.x - h.x, dz = S.z - h.z, d = Math.hypot(dx, dz);
  if (!hidden && d < 3.3 && Math.abs(S.y - h.y) < 2.5 && sa.cool <= 0) {
    sa.cool = 1.3; hurt(45, 'bite');
    if (mode !== 'play') return;
    log('The great head strikes, and you are flung across the hall!', 'bad');
    S.vx += dx / (d || 1) * 9; S.vz += dz / (d || 1) * 9; S.vy = 3; S.onGround = false;
  }
  const hx = Math.sin(h.yaw), hz = Math.cos(h.yaw), ahead = (dx * hx + dz * hz) / (d || 1);
  if (!hidden && sa.spitCool <= 0 && d > 3 && d < 22 && ahead > -0.2 && los(h.x, h.y + 0.6, h.z, S.x, S.y + 1.4, S.z)) {
    sa.spitCool = 2.3;
    const lead = d / 15;
    const tx = S.x + S.vx * lead + (S.rng.next() - 0.5) * 0.6, tz = S.z + S.vz * lead + (S.rng.next() - 0.5) * 0.6, ty = S.y + 1.1;
    const ox = h.x + hx * 1.3, oy = h.y + 0.4, oz = h.z + hz * 1.3, dd = Math.hypot(tx - ox, ty - oy, tz - oz) || 1;
    S.proj.push({ type: 'venom', x: ox, y: oy, z: oz, vx: (tx - ox) / dd * 15, vy: (ty - oy) / dd * 15 + 0.6, vz: (tz - oz) / dd * 15, life: 3, spin: 0 });
    Sfx.spit(clamp((h.x - S.x) / 20, -1, 1));
    if (!S.hints.has('venom')) { S.hints.add('venom'); log('She spits! Get out of her sight: into the wall, into an alcove!', 'bad'); }
  }
}

// ---------------------------------------------------------------- Shukeli, the jailer
const TAUNTS = [
  '"Ah, the lion of Aquilonia comes to sniff at my door! Back to your straw, lion."',
  '"Satha will be along presently, my king. She is never late."',
  'Shukeli giggles into his wine. "Closer, closer. Let me see the face of a king."',
  '"My master feeds his pets well. Tonight, he feeds them a king."',
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
      if (moveTo(sh.homeX, sh.homeZ, sh.state === 'retreat' ? 3.0 : 1.9)) sh.state = 'idle';
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
  const kx = GRILLE_X - 0.75, kz = sh.z;
  S.items.push({ id: 'keys', kind: 'keys', name: 'jailer\'s ring of keys', x: kx, z: kz, y: groundInfo(kx, kz).floor, taken: false });
  log('Your blade finds the soft place under his ear. Shukeli sags against the grille with a sigh like a punctured wineskin, and his ring of keys clinks onto the flagstones on your side of the bars.', 'good');
  alertGroup('barracks');
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
    p.vy -= (p.type === 'bone' ? 10 : p.type === 'arrow' ? 2 : 4) * DT; p.spin += DT * 12; p.life -= DT;
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
    if (p.type === 'arrow' && Math.hypot(p.x - S.x, p.y - (S.y + 1.1), p.z - S.z) < 0.6) {
      S.proj.splice(i, 1); hurt(FOES.archer.dmg, 'arrow'); punchView(0.04, (Math.random() - 0.5) * 0.08);
      if (mode === 'play' && !S.hints.has('arrow')) { S.hints.add('arrow'); log('An arrow! Close with the archer, or put stone between you.', 'bad'); }
      continue;
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
    if (f.type === 'door' && S.door.open > 0.5) continue;
    if (f.type === 'grille' && S.grille.target > 0) continue;
    if (f.type === 'bones' && S.flags.has_bone) continue;
    if (f.type === 'spear_rack' && (S.flags.has_spear || S.flags.portcullis_open)) continue;
    if (f.type === 'winch' && S.flags.portcullis_open) continue;
    if ((f.type === 'boom' || f.type === 'windlass') && S.flags.stone_down) continue;
    if (f.type === 'sigil_door' && S.gates.sigil_gate && S.gates.sigil_gate.target > 0) continue;
    consider({ type: f.type, f }, f.x, f.y - f.baseY, f.z, f.type === 'clue' ? 2.6 : f.type === 'ring' ? 3.7 : 3.0);
  }
  return best;
}
function promptText(t) {
  if (!t) return '';
  if (t.type === 'item') return t.it.heal ? '[E] ' + (t.it.kind === 'bread' ? 'eat' : 'drink') + ' the ' + t.it.name : '[E] take the ' + t.it.name;
  switch (t.type) {
    case 'ring': return S.read.has('insc_cell') ? '[E] grind the rusted link against the stone' : '[E] strain at the chain';
    case 'clue': return t.f.id.startsWith('mark') ? '[E] look at the marks' : '[E] read the scratches';
    case 'bones': return '[E] take a thighbone';
    case 'door': return S.flags.has_cellkey ? '[E] unlock the cell door' : '[E] try the cell door';
    case 'grille': return S.flags.has_keys ? '[E] unlock the grille' : '[E] try the grille';
    case 'spear_rack': return '[E] take a spear';
    case 'valve': return S.valves[t.f.idx] ? '[E] shut the vent' : '[E] open the vent';
    case 'boom': return '[E] swing the arm';
    case 'windlass': return S.flags.has_crank ? '[E] let the stone down' : '[E] try the windlass';
    case 'sigil_door': return S.flags.has_sigil ? '[E] set the sigil-stone in the gate' : '[E] look at the gate';
    case 'winch': return S.flags.has_spear ? '[E] wind the winch and jam the ratchet' : '[E] wind the winch';
  }
  return '';
}

// ---------------------------------------------------------------- rooms & objective
const ROOM_DESC = {
  cell: 'A cell cut from the living rock, four paces square. Straw rots on the floor. Far above, a grating lets down one grey thread of daylight.',
  hall: 'A long hall, vaulted high and narrow like the nave of a drowned temple. Its floor is worn into a smooth trough down the middle, as if something enormous passes along it often.',
  a2: 'Bones are heaped in this alcove: the leavings of the pits. Most of them are human.',
  niche: 'A deep niche beside the iron grille, black with shadow. From here you can hear the jailer breathing.',
  guard: 'Shukeli\'s guardroom: a table, a stool, a brazier, a jug of wine. The jailer lived well.',
  south_passage: 'A low passage runs south from the hall. Lamplight and the mutter of voices come up it.',
  post: 'The wardens\' post: pillars, a brazier, a dice table, a rack of blades. Men live down here, in shifts, beside the serpent.',
  barracks: 'Bunks, stale straw, a rack of spears. The guards of the pits sleep here.',
  winch: 'A great winch on trestles, its rope running up into the wall. It raises the portcullis on the stair.',
  stair: 'A stair climbs toward the citadel and the open air.',
  landing: 'A wide landing under Tsotha\'s scarlet banners. Daylight, real daylight, falls down the stair beyond.',
  foot: 'The keys open a door at the foot of the gaol stair, and below it the made stone ends. The tunnels go down into the hill, dank and breathing.',
  junction: 'Three ways lead on from here. Someone has scratched marks beside each mouth, and left candles burning down to nothing.',
  warren: 'A great wet cave, its roof hung with stone teeth. The floor is gnawed bone. Something has been living here, many somethings.',
  west_shelf: 'The tunnels cross here, at the lip of a well. A cold wind rises out of it, from far, far below, and the only way on is a ledge of rock across the dark.',
  lair: 'A dank, low cave that stinks of sweet rot. Something is weeping in here, piteously, like a woman.',
  stone: 'A high chamber over a shaft. A great carved stone hangs above the drop from a wooden arm, on a rope that runs back to a windlass.',
  gate: 'An old hall cut square in the rock, older than the citadel above. Its far end is a single slab of stone, with a round socket in its face.',
};
function objective() {
  const f = S.flags, live = g => S.foes.some(x => x.group === g && !x.dead && x.alert);
  if (LEVEL.level === 'e1m3') {
    if (live('nook') || live('warren')) return 'Fight! Kick them back.';
    if (!S.areas.has('warren')) return 'Find the safe road. Read the apprentices\' marks.';
    if (!f.crossed) return f.still_air ? 'The flames stand straight. Cross the ledge.' : 'Still the draft from the well, then cross the ledge.';
    if (!f.has_crank) return live('lair') ? 'It cannot be killed. Get what you came for, and RUN.' : 'Find the windlass crank.';
    if (!f.stone_down) return 'Let down the hanging stone.';
    if (!f.has_sigil && !f.gate_open && S.gates.sigil_gate.target === 0) return 'Take the sigil-stone to the gate.';
    if (!f.gate_open) return 'Hold them off until the gate is open.';
    return 'Through the gate.';
  }
  if (!f.free) return 'Free yourself from the chain.';
  if (!f.cell_open) return f.has_cellkey ? 'Unlock the cell door.' : S.giant.state === 'crushed' ? 'Take the keys.' : 'Survive.';
  if (!f.has_sword) return 'Take the strangler\'s sword.';
  if (live('scout') || live('post')) return 'Fight! Kick shields aside.';
  if (!f.shukeli_dead) return 'Reach the grille at the end of the hall. Deal with the jailer.';
  if (!f.has_keys) return 'Take the jailer\'s keys.';
  if (live('barracks')) return 'The guards are coming! Fight them at the bars.';
  if (!f.grille_open) return 'Unlock the grille.';
  if (!f.portcullis_open) return 'Raise the portcullis on the stair.';
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

// ---------------------------------------------------------------- e1m3: the tunnels' machinery
function updateTunnels() {
  if (LEVEL.valves) {                                   // the breath of the deep, through four mouths
    const V = LEVEL.valves;
    S.wind = V.base + V.weights.reduce((a, w, i) => a + w * S.valves[i], 0);
    S.windNow += (S.wind - S.windNow) * Math.min(1, DT * 1.5);
    if (Math.abs(S.wind) < 0.05) setFlag('still_air'); else S.flags.still_air = false;
    const g = groundInfo(S.x, S.z);
    if ((g.flags & F_WIND) && mode === 'play') {        // the presence pushes you off the ledge
      const gust = 1 + 0.35 * Math.sin(S.tick * 0.07) + 0.2 * Math.sin(S.tick * 0.031);
      const r = collide(S.x, S.z + S.windNow * 5 * gust * DT, RADIUS, S.y); S.x = r[0]; S.z = r[1];   // stronger than a man can run against
    }
    S.windSnd -= DT;
    if (S.windSnd <= 0 && Math.abs(S.windNow) > 0.1 && Math.hypot(S.x - 40 * CELL, S.z - 18.5 * CELL) < 25) { S.windSnd = 1.6; Sfx.wind(Math.min(1, Math.abs(S.windNow) * 0.5)); }
    if (S.room === 'east_shelf' || S.room === 'weeper_way') setFlag('crossed');
  }
  if (LEVEL.boom) {
    S.boom.angle += clamp(S.boom.target - S.boom.angle, -DT * 0.8, DT * 0.8);
    S.stone.drop = Math.min(S.stone.target, S.stone.drop + DT * 0.22);
    if (S.stone.drop >= 1 && !S.flags.stone_down) {
      setFlag('stone_down'); Sfx.crush();
      const p = boomTip();
      S.items.push({ id: 'sigil', kind: 'sigil', name: 'sigil-stone', x: p[0], z: p[1], y: groundInfo(p[0], p[1]).floor, taken: false });
      log('The stone settles on the floor with a sound like a closing tomb. Its carved face glows.', 'good');
    }
  }
  for (const k in S.gates) { const gt = S.gates[k]; gt.open += clamp(gt.target - gt.open, -DT, DT * 0.085); }
  if (S.gates.sigil_gate && S.gates.sigil_gate.open >= 0.8) setFlag('gate_open');
}
function boomTip() { const b = LEVEL.boom, a = S.boom.angle; return [b.post[0] * CELL + Math.cos(a) * b.len, b.post[1] * CELL + Math.sin(a) * b.len]; }

// ---------------------------------------------------------------- the tick
function humanInput() {
  const inp = {
    fwd: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0),
    side: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
    run: !!(keys.ShiftLeft || keys.ShiftRight), jump: !!keys.Space, use: pressUse, fire: pressFire, kick: pressKick, weapon: wantWeapon,
  };
  pressUse = pressFire = pressKick = false; wantWeapon = null;
  return inp;
}
function tick(inp) {
  S.tick++; S.playTicks++;
  if (inp.yaw !== undefined) S.yaw = inp.yaw;
  if (inp.pitch !== undefined) S.pitch = inp.pitch;
  prev = { x: S.x, y: S.y, z: S.z };
  chainSndT -= DT; S.swing = Math.max(0, S.swing - DT); S.throwT = Math.max(0, S.throwT - DT); S.kickT = Math.max(0, S.kickT - DT);
  if (inp.weapon && S.weapons[inp.weapon]) S.weapon = inp.weapon;
  const { g, sp } = updatePlayer(inp);
  for (const d of [S.door, S.grille, S.portc]) d.open += clamp(d.target - d.open, -DT * 0.9, DT * (d === S.portc && d.target === 0 ? 4 : 0.9));
  if (S.portc.dropT > 0) { S.portc.dropT -= DT; if (S.portc.dropT <= 0 && !S.flags.portcullis_open) { S.portc.target = 0; Sfx.clank(); Sfx.crush(); log('The pawl slips. The portcullis crashes down.', 'dim'); } }
  updateGiant();
  updateSatha();
  if (mode !== 'play') return;
  updateShukeli();
  updateFoes();
  updateTunnels();
  updateProjectiles();
  if (mode !== 'play') return;
  resolvePlayerHit();
  if (mode !== 'play') return;
  interactTarget = findTarget();
  if (inp.use) interact();
  if (inp.fire) onFire(false);
  if (inp.kick) onFire(true);
  if (g.kind === 2 && S.y < g.floor + 30 && S.y < -4) { die('fall'); return; }
  const id = roomIdAt(S.x, S.z);
  if (id && id !== S.room) {
    S.room = id; enterRoom(id);
    const area = LEVEL.areas.find(a => a.rooms.includes(id));
    if (area) enterArea(area);
  }
  if (S.onGround && sp > 0.8) { stepAcc += sp * DT; bobPhase += sp * DT * 2.2; if (stepAcc > 2.0) { stepAcc = 0; Sfx.step(hiddenAt(S.x, S.z)); } }
  bobAmt += ((S.onGround && sp > 0.8 ? Math.min(1, sp / 5) : 0) - bobAmt) * Math.min(1, DT * 8);
  const ex = LEVEL.entities.find(e => e.class === 'trigger_exit').rect;
  if (S.x > ex[0] * CELL && S.x < ex[2] * CELL && S.z > ex[1] * CELL && S.z < ex[3] * CELL && (LEVEL.level !== 'e1m3' || S.flags.gate_open)) finishLevel();
}

// ---------------------------------------------------------------- determinism helpers
function stateHash() {
  let h = 0x811c9dc5;
  const q = v => Math.round(v * 100);
  const sh = S.shukeli, g = S.giant;
  const parts = [S.tick, q(S.x), q(S.y), q(S.z), Math.round(S.health), Object.values(S.flags).map(Number).join(''), q(S.door.open), q(S.grille.open),
    S.satha.start, g.state, q(g.x), q(g.z), sh.state, q(sh.x), q(sh.z), S.proj.length, S.items.filter(i => i.taken).length,
    S.foes.map(f => f.state + q(f.x) + q(f.z) + f.hp).join(','), q(S.portc.open), S.weapon];
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
      use: !!action.use && i === 0, fire: !!action.attack && i === 0, kick: !!action.kick && i === 0, weapon: i === 0 ? action.weapon : null, yaw: action.yaw, pitch: action.pitch });
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
  await showSplash(LEVEL.level, '<div class="keys"><b>W A S D</b> move &nbsp; <b>mouse</b> look &nbsp; <b>Shift</b> run &nbsp; <b>E</b> use &nbsp; <b>Click</b> strike / throw &nbsp; <b>Right-click / F</b> kick &nbsp; <b>1 2 3</b> weapons &nbsp; <b>Esc</b> pause</div>');
  if (mode === 'splash') startPlay(false);
}
const LEVEL_INTRO = {
  e1m2: [['THE PITS', 'title'], ['You wake on wet straw with iron on your ankle and the taste of the wizard\'s poison still in your mouth.', ''],
    ['Beyond the bars of your cell door, a black giant watches you, and grins.', 'warn'], ['(E to use things. Read whatever the dead have left you.)', 'dim']],
  e1m3: [['THE TUNNELS BELOW', 'title'], ['The grille is bolted from the outside, and Shukeli lies dead against it. The only way left is down: into the pits, where the made stone ends.', ''],
    ['Somewhere far off, a woman is weeping.', 'warn']],
};
function startPlay(agent) {
  Sfx.init();
  hideOverlay(); hud.classList.remove('hidden');
  mode = 'play'; fade = 1; fadeTarget = 0; acc = 0;
  for (const [t, c] of LEVEL_INTRO[LEVEL.level] || []) log(t, c);
  if (!agent) lockPointer();
}
// load a level; `carry` brings the hero's state across (health, weapons, tally)
function loadLevel(id, carry) {
  LEVEL = LEVELS[id];
  buildLevel(LEVEL);
  if (entitySpec('scripted_satha')) buildSathaPath();
  if (levelMesh) R.deleteMesh(levelMesh);
  levelMesh = R.createMesh(buildLevelMesh());
  FLOW = null; GRILLE_CELLS.clear(); particles = []; interactTarget = null;
  const seed = parseInt(new URLSearchParams(location.search).get('seed'), 10) || 1;
  S = newState(seed, carry);
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
  overlay.innerHTML = '<div class="panel"><h2>Paused</h2><p class="sub">e1m2 · The Pits · tick ' + S.tick + ' · state ' + stateHash() + '</p>' +
    '<div class="keys"><b>W A S D</b> move · <b>mouse</b> look · <b>Shift</b> run · <b>Space</b> jump<br><b>E</b> use · <b>Click</b> strike or throw · <b>Right-click / F</b> kick · <b>1 2 3</b> fists, dagger, sword · <b>P</b> resolution · <b>F4</b> palette · <b>K</b> sound · <b>F3</b> debug</div>' +
    '<div class="setting"><label for="brIn">Brightness</label><input type="range" id="brIn" min="0.8" max="2.2" step="0.05" value="' + brightness + '"><span id="brVal">' + brightness.toFixed(2) + '</span></div>' +
    '<div class="setting"><label for="sensIn">Mouse sensitivity</label><input type="range" id="sensIn" min="0.1" max="4" step="0.05" value="' + sensMul + '"><span id="sensVal">' + sensMul.toFixed(2) + '×</span></div>' +
    '<div class="btns"><button id="bRes">Resume</button><button id="bRestart">Restart level</button></div></div>';
  $('sensIn').oninput = e => { sensMul = parseFloat(e.target.value); $('sensVal').textContent = sensMul.toFixed(2) + '×'; try { localStorage.setItem(SENS_KEY, String(sensMul)); } catch (err) { /* ignore */ } };
  $('brIn').oninput = e => { brightness = parseFloat(e.target.value); R.gamma = brightness; $('brVal').textContent = brightness.toFixed(2); try { localStorage.setItem(BRIGHT_KEY, String(brightness)); } catch (err) { /* ignore */ } };
  $('bRes').onclick = () => { hideOverlay(); mode = 'play'; lockPointer(); };
  $('bRestart').onclick = () => location.reload();
}
async function finishLevel() {
  if (mode !== 'play') return;
  mode = 'done'; S.doneT = S.tick; S.doneHash = stateHash(); fadeTarget = 1; Sfx.sting();
  document.exitPointerLock && document.exitPointerLock();
  const secs = Math.round(S.tick / SIM_HZ), slain = S.foes.filter(f => f.dead).length;
  const stats = '<p class="stats">' + LEVEL.level + ' complete · ' + Math.floor(secs / 60) + 'm ' + (secs % 60) + 's · ' + S.deaths + ' death' + (S.deaths === 1 ? '' : 's') +
    ' · ' + slain + ' of ' + S.foes.filter(f => FOES[f.cls].hp < 1e8).length + ' foes slain · tick ' + S.tick + ' · state ' + S.doneHash + '</p>';
  if (agentInput) return;                         // the test harness drives level changes itself
  await new Promise(r => setTimeout(r, 900));
  hud.classList.add('hidden');
  const next = LEVEL.next;
  if (next) {
    await showSplash(next, stats);
    loadLevel(next, { health: S.health, weapons: S.weapons, weapon: S.weapon, kills: S.kills, deaths: S.deaths, hints: [...S.hints], playTicks: S.playTicks });
    startPlay(false);
  } else {
    await showSplash('e1m4', stats + '<p class="sub">End of the demo. Yothga, Pelias and the climb through the citadel are next in the plan (README §9).</p>', 'Click to begin again');
    location.reload();
  }
}

// ---------------------------------------------------------------- HUD
function updateHUD() {
  $('hpFill').style.width = Math.max(0, S.health) + '%';
  $('hpNum').textContent = Math.ceil(Math.max(0, S.health));
  const carry = [S.flags.has_bone ? 'thighbone (click to throw)' : S.weapon === 'fists' ? 'bare fists' : 'the ' + S.weapon];
  if (S.flags.has_spear) carry.push('a spear, to jam the winch');
  if (S.flags.has_keys) carry.push('keys');
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
  const px = lerp(prev.x, S.x, alpha), py = lerp(prev.y, S.y, alpha), pz = lerp(prev.z, S.z, alpha);
  const bob = Math.sin(bobPhase * 2) * 0.05 * bobAmt, eyeY = py + EYE + bob;
  const proj = m4persp(72 * Math.PI / 180, R.aspect, 0.05, 200);
  const view = m4mul(m4rx(-S.pitch - punchPitch), m4mul(m4ry(-S.yaw - punchYaw), m4t(-px, -eyeY, -pz)));
  const vp = m4mul(proj, view), f = camFwd();
  const lampPos = [px + f[0] * 0.3, eyeY - 0.2, pz + f[2] * 0.3];
  let lc = [0.24, 0.215, 0.18], lampRange = 10;
  if (LEVEL.torch) {                                   // the torch in his left hand: warm, flickering, guttering in the draft
    const gutter = 1 - Math.min(0.55, Math.abs(S.windNow) * 0.3) * (0.6 + 0.4 * Math.sin(gameTime * 23));
    const fl = (0.88 + 0.08 * Math.sin(gameTime * 11.3) + 0.05 * Math.sin(gameTime * 29.1)) * gutter;
    lc = [1.0 * fl, 0.62 * fl, 0.3 * fl]; lampRange = 15;
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
  R.setCamera(vp, [px, eyeY, pz], lampPos, lc, lampRange, 0.034);
  R.drawWorld(levelMesh);
  // items
  for (const it of S.items) {
    if (it.taken) continue;
    const light = sampleLight(it.x, it.y + 0.5, it.z);
    const mesh = it.kind === 'wine' && it.name.startsWith('jug') ? 'jug' : it.kind === 'dagger' ? 'dagger2' : it.kind === 'cellkey' ? 'keys' : it.kind;
    const flat = it.kind === 'dagger' || it.kind === 'bone' || it.kind === 'keys' || it.kind === 'cellkey' || it.kind === 'sword' || it.kind === 'spear';
    const m = flat ? m4trs(it.x, it.y + 0.05, it.z, hrand(it.x * 10, it.z * 10, 1, 1) * 6, Math.PI / 2, 0, it.kind === 'dagger' ? 2.2 : it.kind === 'sword' || it.kind === 'spear' ? 1 : 1.2) : m4trs(it.x, it.y, it.z, 0.6, 0, 0, 1.3);
    drawM(mesh, m, light, 0.06 + 0.05 * Math.sin(gameTime * 3));
  }
  // ring and chain
  const ring = feature('ring') || { x: -1e4, y: 0, z: -1e4 }, rl = sampleLight(ring.x, 1, ring.z + 1);
  drawM('ring', m4trs(ring.x, ring.y, ring.z + 0.08, 0, 0, 0, 1.4), rl);
  const A = [ring.x, ring.y - 0.22, ring.z + 0.12];
  if (feature('ring')) {
  const B = S.flags.free ? [ring.x + 0.5, groundInfo(ring.x + 0.5, ring.z + 1.6).floor + 0.03, ring.z + 1.6] : [px, py + 0.12, pz];
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
  // the cell door (swings into the hall) and the grille (slides up)
  const dl = sampleLight(8 * CELL, 1.5, 12.2 * CELL);
  const has = n => LEVEL.links.some(l => l.name === n);
  if (has('cell_door')) drawM('bars:2.5:3.2', m4trs(7 * CELL, 0, 12 * CELL, 1.45 * smoothstep(0, 1, S.door.open), 0, 0, 1), dl);   // swings into the cell
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
    drawCharacter('giant', g.x, g.y, g.z, g.yaw, P, gl);
  }
  // Shukeli, the jailer
  const sh = S.shukeli, sl = sampleLight(sh.x, 1.5, sh.z), shy = groundInfo(sh.x, sh.z).floor;
  if (sh.state === 'gone') { /* not in this level */ } else if (sh.state === 'dead') {
    const k = smoothstep(0, 1, sh.fall);
    drawCharacter('shukeli', sh.x + 0.3 * k, shy, sh.z, -Math.PI / 2, { pitch: 0.5 * k, roll: 0.3 * k, drop: -0.35 * k, headX: 0.5 * k, uzL: 0.6 * k, uzR: 0.6 * k }, sl);
  } else {
    const P = poseIdle({}, gameTime * 0.8);
    const moving = sh.state === 'walk' || sh.state === 'return' || sh.state === 'retreat';
    if (moving) poseWalk(P, sh.walk * 3, 0.7);
    P.fxL = -1.0; P.fxR = -1.0; P.uxL = -0.3; P.uxR = -0.3;                                                // hands clasped over the belly
    if (sh.state === 'peer') Object.assign(P, { lean: 0.22, headX: 0.25, uxL: -0.9, uxR: -0.9, fxL: -0.9, fxR: -0.9 });
    if (sh.state === 'idle' && sh.tauntT > 9) Object.assign(P, { uxR: -1.6, fxR: -0.6, headX: -0.2 });      // a mocking wave
    drawCharacter('shukeli', sh.x, shy, sh.z, sh.yaw, P, sl);
  }
  drawFoes();
  // writing scratched into the walls wherever there is something to read
  for (const f of LV.features) {
    if (f.type !== 'clue' || !f.wall) continue;
    const n = wallIn(f.wall), yaw = Math.atan2(n[0], n[1]), l = sampleLight(f.x + n[0], f.y, f.z + n[1]);
    const mk = f.id.startsWith('mark') ? 'decal:tally' + ({ mark_one: 1, mark_two: 2, mark_three: 3 })[f.id] : 'decal:scratch';
    R.key = l.d; R.drawEntity(getModel(mk), m4trs(f.x + n[0] * 0.02, f.y, f.z + n[1] * 0.02, yaw, 0, 0, 1), l, 0, 1, true, true);
  }
  // e1m3: flames over the ledge lean with the draft; vents and their levers; the boom and its stone; the sigil slab
  if (LEVEL.flames) for (const [fx, fz] of LEVEL.flames) {
    const x = fx * CELL, z = fz * CELL, y = groundInfo(x, z).kind === 1 ? groundInfo(x, z).floor : 0, l = sampleLight(x, y + 2, z);
    drawM('stand', m4trs(x, y, z, 0, 0, 0, 1), l);
    const lean = clamp(S.windNow * 0.45, -1.1, 1.1) + Math.sin(gameTime * 13 + fx) * 0.06 * (1 + Math.abs(S.windNow));
    drawM('flame', m4trs(x, y + 2.0, z, 0, lean, 0, 1 + 0.08 * Math.sin(gameTime * 17 + fz)), l, 0.6);
  }
  if (LEVEL.valves) LEVEL.valves.at.forEach(([vx, vz, w], i) => {
    const n = wallIn(w), x = vx * CELL, z = vz * CELL, y = groundInfo(x + n[0], z + n[1]).floor, yaw = Math.atan2(n[0], n[1]), l = sampleLight(x + n[0], y + 1, z + n[1]);
    drawM('valve', m4trs(x + n[0] * 0.05, y + 0.6, z + n[1] * 0.05, yaw, 0, 0, 1), l);
    drawM('lever', m4mul(m4trs(x + n[0] * 0.15 + Math.cos(yaw) * 0.7, y + 0.6, z + n[1] * 0.15 - Math.sin(yaw) * 0.7, yaw, 0, 0, 1), m4rx(S.valves[i] ? -0.7 : 0.7)), l);
  });
  if (LEVEL.boom) {
    const b = LEVEL.boom, px = b.post[0] * CELL, pz = b.post[1] * CELL, py = groundInfo(px + 1, pz).floor, a = S.boom.angle, l = sampleLight(px, py + 4, pz);
    drawM('boom', m4trs(px, py + 5.4, pz, -a, 0, 0, 1), l);
    if (!S.items.some(i => i.kind === 'sigil')) {          // the stone on its rope, until it is set down
      const tip = boomTip(), top = py + 5.25, gt = groundInfo(tip[0], tip[1]), fl = gt.kind === 1 ? gt.floor : py;
      const y = lerp(py + 3.0, fl, S.stone.drop), len = Math.max(0.05, top - (y + 1.4));
      drawM('sigilstone', m4trs(tip[0], y, tip[1], -a, 0, 0, 1.4), sampleLight(tip[0], y + 1, tip[1]), 0.1);
      drawM('rope', m4mul(m4t(tip[0], y + 1.4, tip[1]), m4s3(1, len, 1)), l);
    }
  }
  if (S.gates.sigil_gate) {
    const gx = 43.5 * CELL, gz = 30 * CELL;
    drawM('slab', m4trs(gx, -S.gates.sigil_gate.open * 3.5, gz, 0, 0, 0, 1), sampleLight(gx + 1.5, 1.5, gz), S.gates.sigil_gate.target > 0 ? 0.15 : 0);
  }
  // Satha (README MODELS §5.2): sculpted head and jaw, and one smooth body tube
  // rebuilt each frame along her spine, drawn in chunks so each is lit locally.
  if (t >= 0) {
    const sHead = sathaS(t + alpha * DT);
    if (sHead - BODY_LEN < SATHA_PATH.len) {
      const raw = spineAt(sHead), ahead = spineAt(sHead + SERP_LAMBDA / 4), behind = spineAt(sHead - 0.8);
      const h = [lerp(raw[0], (ahead[0] + behind[0]) / 2, 0.45), raw[1], lerp(raw[2], (ahead[2] + behind[2]) / 2, 0.45)];   // the head rides steadier than the body
      const hg = groundInfo(h[0], h[2]);
      if (hg.kind === 1 && h[1] < hg.floor + 2.5) h[1] = hg.floor + 0.62 + 0.1 * Math.sin(gameTime * 2.3);                // held up, gently bobbing
      const fa = [ahead[0], h[1], ahead[2]], fb = behind;
      const tx = fa[0] - fb[0], ty = fa[1] - fb[1], tz = fa[2] - fb[2], th = Math.hypot(tx, tz);
      const yaw = th < 0.2 * Math.hypot(tx, ty, tz) ? (sHead < SATHA_PATH.len / 2 ? Math.PI / 2 : Math.PI) : Math.atan2(tx, tz);
      const hm = m4trs(h[0], h[1], h[2], yaw, -Math.atan2(ty, th), 0, 0.82);
      const hl = sampleLight(h[0], h[1] + 1, h[2]);
      if (h[1] > -10) {
        const jaw = clamp((S.satha.cool - 0.8) * 2.5, 0, 1) + clamp((S.satha.spitCool - 1.8) * 2.5, 0, 1);
        const jm = m4mul(hm, m4mul(m4t(0, -0.1, -0.3), m4mul(m4rx(Math.min(1, jaw) * 0.65 + 0.06 * Math.sin(gameTime * 3)), m4t(0, 0.1, 0.3))));
        drawM('satha_head_uv', hm, hl, 0.03); drawM('satha_head_parts', hm, hl);
        drawM('satha_jaw_uv', jm, hl, 0.03); drawM('satha_jaw_parts', jm, hl);
      }
      if (!sathaMeshes) sathaMeshes = Array.from({ length: SATHA_CHUNKS }, () => R.createMesh(new Float32Array(10)));
      const down = norm3([-hm[4], -hm[5], -hm[6]]), L = BODY_LEN, cl = L / SATHA_CHUNKS;
      let B = down;
      for (let c = 0; c < SATHA_CHUNKS; c++) {
        const d0 = c * cl, mid = onFloor(spineAt(sHead - 0.55 - d0 - cl / 2), 0.8);
        const data = buildSathaTube(d => onFloor(spineAt(sHead - 0.55 - d0 - d), sathaRadius(Math.min(1, (d0 + Math.max(0, d)) / L))), cl, 0.75, B, tt => sathaRadius((d0 + tt * cl) / L));
        // carry the frame across chunks: recompute 'down' at the chunk end from the last ring
        const e = onFloor(spineAt(sHead - 0.55 - d0 - cl), sathaRadius(Math.min(1, (d0 + cl) / L))), e2 = onFloor(spineAt(sHead - 0.55 - d0 - cl - 0.2), sathaRadius(Math.min(1, (d0 + cl + 0.2) / L))), Tn = norm3([e2[0] - e[0], e2[1] - e[1], e2[2] - e[2]]);
        const bd = B[0] * Tn[0] + B[1] * Tn[1] + B[2] * Tn[2]; B = norm3([B[0] - Tn[0] * bd, B[1] - Tn[1] * bd, B[2] - Tn[2] * bd]);
        // shift v so the pattern runs continuously from chunk to chunk
        for (let i = 7; i < data.length; i += 10) data[i] += d0 / 4.4;
        R.updateMesh(sathaMeshes[c], data);
        if (mid[1] < -14) continue;
        const lc = sampleLight(mid[0], mid[1] + 1, mid[2]);
        R.key = lc.d;
        R.drawEntity(sathaMeshes[c], m4ident(), lc, 0.03, 1, true);
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
  if (mode === 'play' || mode === 'paused') {
    R.clearDepth(); R.lightMul(1);
    R.setCamera(m4persp(60 * Math.PI / 180, R.aspect, 0.01, 10), [0, 0, 0], [0.1, 0.2, 0.3], [0, 0, 0], 1, 0);
    const am = sampleLight(px, py + 1.2, pz), vl = [am[0] + 0.05, am[1] + 0.045, am[2] + 0.04];
    if (LEVEL.torch) { vl[0] += 0.42 * lc[0]; vl[1] += 0.42 * lc[1]; vl[2] += 0.42 * lc[2]; am.d = norm3([am.d[0] - Math.cos(S.yaw) * 2, am.d[1] + 1, am.d[2] + Math.sin(S.yaw) * 2]); }   // his own torch lights the sword hand
    vl.d = rotDir(m4mul(m4rx(-S.pitch), m4ry(-S.yaw)), am.d);
    const sb = Math.sin(bobPhase) * 0.012 * bobAmt, cb = Math.abs(Math.cos(bobPhase)) * 0.012 * bobAmt;
    const prog = S.swing > 0 ? 1 - S.swing / S.swingLen : 0, sw = S.swing > 0 ? Math.sin(prog * Math.PI) : 0, th = S.throwT > 0 ? Math.sin((1 - S.throwT / 0.35) * Math.PI) : 0;
    const wep = S.flags.has_bone ? 'bone' : S.weapon;
    // the swing: dagger and fists thrust; the sword cuts right-to-left, left-to-right, then overhead
    let fwd, pos;
    if (wep === 'sword' && S.swing > 0) {
      const e = smoothstep(0, 1, prog), arcs = [[[0.9, 0.55, -0.6], [-1.0, -0.25, -0.7]], [[-0.9, 0.4, -0.6], [1.0, -0.3, -0.7]], [[0.05, 1.3, -0.4], [0.0, -0.9, -0.9]]][S.combo];
      fwd = norm3(arcs[0].map((v, i) => lerp(v, arcs[1][i], e)));
      pos = [0.15 - sb + fwd[0] * 0.06, -0.2 + cb + fwd[1] * 0.05, -0.36];
    } else {
      fwd = norm3([-0.1 - sw * 0.05, (wep === 'sword' ? 0.75 : 0.5) - sw * 0.35 + th * 0.4, -1]);
      pos = [0.17 - sb + fwd[0] * sw * 0.16, -0.19 + cb + fwd[1] * sw * 0.16 + th * 0.06, -0.33 + fwd[2] * sw * 0.16];
    }
    const X = [-fwd[0], -fwd[1], -fwd[2]];
    const arm = [0.62, -0.5, 0.6], ad = arm[0] * X[0] + arm[1] * X[1] + arm[2] * X[2];
    const Z = norm3([arm[0] - X[0] * ad, arm[1] - X[1] * ad, arm[2] - X[2] * ad]), Y = cross3(Z, X);
    const hand = new Float32Array([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, pos[0], pos[1], pos[2], 1]);
    drawM('vm_forearm', hand, vl); drawM('vm_manacle', hand, vl); drawM('vm_chain', hand, vl);
    drawM('vm_hand_grip', hand, vl);       // empty-handed, he makes a fist
    if (wep === 'bone') drawM('bone', m4mul(hand, m4trs(GRIP_C[0], GRIP_C[1], GRIP_C[2], Math.PI / 2, 0, 0, 0.42)), vl);
    else if (wep === 'dagger') drawM('dagger2', m4mul(hand, m4trs(0.05, GRIP_C[1], GRIP_C[2], 0, 0, Math.PI / 2, 1)), vl);
    else if (wep === 'sword') drawM('sword', m4mul(hand, m4trs(0.05, GRIP_C[1], GRIP_C[2], 0, 0, Math.PI / 2, 0.62)), vl);
    if (LEVEL.torch) {                     // the torch in his left fist: the right hand's model, mirrored
      const tf = norm3([-0.32 + sb * 2, 1.3, -0.7]), TX = [-tf[0], -tf[1], -tf[2]], tarm = [0.62, -0.55, 0.55];
      const td = tarm[0] * TX[0] + tarm[1] * TX[1] + tarm[2] * TX[2], TZ = norm3([tarm[0] - TX[0] * td, tarm[1] - TX[1] * td, tarm[2] - TX[2] * td]), TY = cross3(TZ, TX);
      const tpos = [0.5 - sb, -0.47 + cb, -0.52];
      const handR = new Float32Array([TX[0], TX[1], TX[2], 0, TY[0], TY[1], TY[2], 0, TZ[0], TZ[1], TZ[2], 0, tpos[0], tpos[1], tpos[2], 1]);
      const handL = m4mul(m4s3(-1, 1, 1), handR), tl = [0.85, 0.55, 0.3];
      tl.d = [0.2, 1, 0.3];
      drawM('vm_forearm', handL, tl); drawM('vm_hand_grip', handL, tl);
      const torch = m4mul(handL, m4trs(0.0, GRIP_C[1], GRIP_C[2], 0, 0, Math.PI / 2, 0.5));
      drawM('vm_torch', torch, tl);
      // the flame: three nested tongues, each flickering on its own, leaning with the draft
      const lean = clamp(S.windNow * 0.4, -0.9, 0.9);
      for (let k = 0; k < 3; k++) {
        const fl = 1 + 0.22 * Math.sin(gameTime * (13 + k * 5) + k * 2) + 0.1 * Math.sin(gameTime * (31 + k * 7));
        drawM(k === 2 ? 'vm_flame_core' : 'vm_flame', m4mul(torch, m4trs(0, 0.33, 0, gameTime * (1.5 + k) + k, lean + 0.08 * Math.sin(gameTime * 9 + k), 0.06 * Math.sin(gameTime * 7 + k * 3), [1.05, 0.8, 0.55][k] * fl)), tl, k === 2 ? 0.5 : 0.15);
      }
    }
    if (S.kickT > 0) {                     // the kick: a boot comes up from below
      const k = Math.sin((1 - S.kickT / KICK.period) * Math.PI);
      drawM('vm_leg', m4trs(0.05, -0.75 + k * 0.42, -0.55 - k * 0.15, 0, -1.35 + k * 0.4, 0, 1), vl);
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
  if (S) {
    if (mode === 'play' && !agentInput) {
      const sens = BASE_SENS * sensMul;
      S.yaw -= mouseDX * sens; S.pitch = clamp(S.pitch - mouseDY * sens, -1.45, 1.45);
      mouseDX = mouseDY = 0;
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 10 && mode === 'play') { tick(humanInput()); acc -= DT; n++; }
      if (n === 10) acc = 0;
    }
    renderAlpha = mode === 'play' && !agentInput ? clamp(acc / DT, 0, 1) : 1;
    updateParticles(dt);
    fade += (fadeTarget - fade) * Math.min(1, dt * (fadeTarget > fade ? 4 : 2));
    flash = Math.max(0, flash - dt * 1.2);
    punchPitch *= Math.pow(0.0005, dt); punchYaw *= Math.pow(0.0005, dt);
    render(renderAlpha);
    hudT -= dt;
    if (hudT <= 0 && mode !== 'splash') { hudT = 0.1; updateHUD(); }
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
  if (agentInput) { agentInput = null; log('[You take back control.]', 'dim'); }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.repeat) return;
  switch (e.code) {
    case 'KeyE': pressUse = true; break;
    case 'KeyF': case 'KeyQ': pressKick = true; break;
    case 'Digit1': wantWeapon = 'fists'; break;
    case 'Digit2': wantWeapon = 'dagger'; break;
    case 'Digit3': wantWeapon = 'sword'; break;
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

// ---------------------------------------------------------------- boot
function boot() {
  try { R = new Renderer(canvas); }
  catch (e) { overlay.innerHTML = '<div class="panel"><h2>No WebGL2</h2><p>This game needs a browser with WebGL2. (' + e.message + ')</p></div>'; return; }
  R.gamma = brightness;
  onResize();
  addEventListener('resize', onResize);
  setTimeout(() => {
    R.uploadTextures(generateTextures());
    R.setPalette(gamePalette());
    const q = new URLSearchParams(location.search);
    loadLevel(LEVELS[q.get('level')] ? q.get('level') : 'e1m2');
    lastFrame = performance.now();
    requestAnimationFrame(frame);
    if (q.has('agent')) { mode = 'splash'; return; }
    showIntro();
  }, 30);
}
boot();
