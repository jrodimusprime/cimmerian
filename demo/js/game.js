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
const BASE_SENS = 0.0022, RES_STEPS = [180, 240, 300, 400, 540], SENS_KEY = 'cimmerian-sens';
const SATHA_SPEED = 7.5, SATHA_SPACING = 2.0, SATHA_SEGS = 12, SATHA_PERIOD = 40;
const GRILLE_X = 34 * CELL, HALL_Z = 14 * CELL;
let resIdx = 2, R = null, levelMesh = null, sensMul = 1;
try { const v = parseFloat(localStorage.getItem(SENS_KEY)); if (v >= 0.1 && v <= 4) sensMul = v; } catch (e) { /* ignore */ }

let mode = 'loading';            // loading | splash | play | paused | dead | done
let S = null;                    // simulation state
const keys = {};
let mouseDX = 0, mouseDY = 0, pressUse = false, pressFire = false, agentInput = null;
let acc = 0, lastFrame = 0, gameTime = 0, fade = 1, fadeTarget = 0, flash = 0, flashCol = [0.75, 0.06, 0.02];
let prev = { x: 0, y: 0, z: 0 }, renderAlpha = 0, hudT = 0, debugOn = false;
let particles = [], interactTarget = null, bobPhase = 0, bobAmt = 0, stepAcc = 0, chainSndT = 0;

const modelCache = new Map();
function getModel(name) {
  let m = modelCache.get(name);
  if (!m) { m = R.createMesh(buildModel(name)); modelCache.set(name, m); }
  return m;
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
  const wx = 4 * CELL, tx = 28 * CELL, y = 1.2;
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
// head (i=0), segments, tail: positions with a slither offset baked into the track
function sathaPoints(sHead) {
  const out = [];
  for (let i = 0; i <= SATHA_SEGS + 1; i++) {
    const s = sHead - (i === SATHA_SEGS + 1 ? SATHA_SEGS * SATHA_SPACING + 1.6 : i * SATHA_SPACING);
    const p = pathAt(s), q = pathAt(s + 0.3), r = pathAt(s - 0.3);
    const tx = q[0] - r[0], ty = q[1] - r[1], tz = q[2] - r[2], th = Math.hypot(tx, tz), tl = Math.hypot(tx, ty, tz) || 1;
    const horiz = th / tl, wig = Math.sin(s * 0.45) * 0.38 * horiz;
    const px = th > 1e-4 ? -tz / th : 0, pz = th > 1e-4 ? tx / th : 0;
    // on the vertical runs the heading is undefined: face along the next horizontal leg
    const yaw = horiz < 0.2 ? (s < SATHA_PATH.len / 2 ? Math.PI / 2 : Math.PI) : Math.atan2(tx + px * Math.cos(s * 0.45) * 0.17 * horiz, tz + pz * Math.cos(s * 0.45) * 0.17 * horiz);
    out.push({ x: p[0] + px * wig, y: p[1], z: p[2] + pz * wig, yaw,
      pitch: -Math.atan2(ty, th), r: i === 0 ? 1.35 : 1.2 * (1 - 0.35 * i / (SATHA_SEGS + 1)) });
  }
  return out;
}

function newState(seed) {
  const start = entitySpec('info_player_start'), sp = W(start.at[0], start.at[1]);
  const g = entitySpec('black_giant'), gp = W(g.at[0], g.at[1]);
  const sh = entitySpec('monster_shukeli'), shp = W(sh.at[0], sh.at[1]);
  return {
    seed, tick: 0, rng: new RNG(hash4(seed, 0xC1, 2, 0)),
    x: sp.x, y: 0, z: sp.z, yaw: start.yaw, pitch: -0.12, vx: 0, vy: 0, vz: 0, onGround: true,
    health: 100, deaths: 0, passes: 0, kills: 0,
    flags: Object.fromEntries(LEVEL.puzzle.flags.map(f => [f, false])),
    read: new Set(), visited: new Set(), room: '', hints: new Set(),
    items: LV.items.map(it => Object.assign({}, it, { taken: false })),
    door: { open: 0, target: 0 }, grille: { open: 0, target: 0 },
    giant: { state: 'wait', x: gp.x, z: gp.z, y: 0, yaw: Math.PI, t: 0, walk: 0, arms: 0, grabT: 0, fall: 0 },
    satha: { start: null, active: false, cool: 0, spitCool: 0, pts: null, warned: 0, lastPhase: -1 },
    shukeli: { state: 'idle', x: shp.x, z: shp.z, homeX: shp.x, homeZ: shp.z, yaw: -Math.PI / 2, t: 0, walk: 0, tx: 0, tz: 0, sawT: 0, tauntT: 6, ignoreT: 0, fall: 0, seenOnce: false },
    proj: [], puddles: [], swing: 0, throwT: 0,
    checkpoint: { x: sp.x, z: sp.z, yaw: start.yaw }, timeFree: -1, doneT: -1,
  };
}

// ---------------------------------------------------------------- light
function sampleLight(x, y, z) {
  let r = AMBIENT[0], g = AMBIENT[1], b = AMBIENT[2];
  for (const l of LV.lights) {
    const dx = l.x - x, dy = l.y - y, dz = l.z - z, d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > l.rad * l.rad) continue;
    let a = 1 - Math.sqrt(d2) / l.rad; a = a * a * l.i * 0.7;
    r += l.r * a; g += l.g * a; b += l.b * a;
  }
  return [r, g, b];
}

// ---------------------------------------------------------------- physics
function linkClosed(idx) {
  for (const l of LEVEL.links) for (const [gx, gz] of l.cells) if (gz * LV.W + gx === idx) return (l.name === 'cell_door' ? S.door.open : S.grille.open) < 0.8;
  return false;
}
function blockedCell(gx, gz, feet) {
  const idx = cellIdx(gx, gz);
  if (idx < 0 || LV.kind[idx] === 0) return true;
  if (LV.flags[idx] & F_NOPASS) return true;
  if (LV.blockers.has(idx) && linkClosed(idx)) return true;
  return LV.kind[idx] === 1 && LV.floor[idx] > feet + 1.25;
}
function dynColliders() {
  const c = [];
  const sh = S.shukeli; if (sh.state !== 'dead') c.push({ x: sh.x, z: sh.z, r: 0.55 });
  const g = S.giant; if (g.state !== 'crushed') c.push({ x: g.x, z: g.z, r: 0.6 });
  return c;
}
function collide(x, z, r, feet) {
  const cols = LV.colliders.concat(dynColliders());
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
  if (!S.flags.free) {                                      // the chain: README e1m2 "chain-length radius"
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
  S.puddles = []; S.proj = S.proj.filter(p => p.type !== 'venom');
  mode = 'play'; fade = 1; fadeTarget = 0;
  log('You come to yourself again, cold and aching, at the last safe place.', 'dim');
  if (!agentInput) lockPointer();
}

// ---------------------------------------------------------------- the puzzle chain
function setFlag(f) { if (!S.flags[f]) { S.flags[f] = true; Sfx.blip(); } }
function freeFromChain() {
  setFlag('free');
  S.timeFree = S.tick;
  S.giant.state = 'unlock'; S.giant.t = 0;
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
      if (S.door.open < 0.5) log('The door is barred iron and locked. The bars are as thick as your thumb.', 'dim');
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
    setFlag('has_dagger');
    log('You take the strangler\'s dagger: a hand\'s breadth of good steel. Now you have teeth. (Click to strike.)', 'good');
  } else if (it.kind === 'keys') {
    setFlag('has_keys');
    log('You reach through the bars\' shadow and take up the ring of keys. They are warm from the jailer\'s belt.', 'good');
  }
}
function onFire() {
  if (S.swing > 0 || S.throwT > 0) return;
  if (S.flags.has_bone) { throwBone(); return; }
  S.swing = 0.38;
  const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
  const inReach = (x, z, reach) => { const dx = x - S.x, dz = z - S.z, d = Math.hypot(dx, dz); return d < reach && (dx * fx + dz * fz) / (d || 1) > 0.35; };
  const sh = S.shukeli;
  if (sh.state !== 'dead' && inReach(sh.x, sh.z, REACH)) {
    if (S.flags.has_dagger) { killShukeli(); return; }
    Sfx.miss(); log('You snatch at his robe through the bars. He squeals and tears free.', 'dim');
    shukeliRetreat(); return;
  }
  const head = S.satha.pts && S.satha.active ? S.satha.pts[0] : null;
  if (head && inReach(head.x, head.z, REACH + 1)) { Sfx.clank(); log(S.flags.has_dagger ? 'The dagger skates off her scales like a stone off a tiled roof.' : 'You might as well punch the mountain.', 'dim'); return; }
  const g = S.giant;
  if (g.state !== 'crushed' && g.state !== 'wait' && inReach(g.x, g.z, REACH)) { Sfx.stab(); log('You hammer at him. It is like striking an oak.', 'dim'); return; }
  Sfx.miss();
}
function throwBone() {
  const f = camFwd();
  S.flags.has_bone = false; S.throwT = 0.35;
  S.proj.push({ type: 'bone', x: S.x + f[0] * 0.5, y: S.y + 1.4 + f[1] * 0.5, z: S.z + f[2] * 0.5, vx: f[0] * 15, vy: f[1] * 15 + 1.6, vz: f[2] * 15, life: 4, spin: 0, bounced: false });
  Sfx.whoosh();
}

// ---------------------------------------------------------------- the black giant
function updateGiant() {
  const g = S.giant; g.t += DT;
  const moveTo = (tx, tz, speed) => {
    const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const st = Math.min(d, speed * DT);
    g.x += dx / d * st; g.z += dz / d * st; g.walk += st; g.yaw = Math.atan2(dx, dz);
    return false;
  };
  const door = feature('door');
  switch (g.state) {
    case 'wait': g.yaw = Math.PI; break;
    case 'unlock':
      if (g.t > 1.0 && S.door.target === 0) {
        S.door.target = 1; Sfx.clank(); Sfx.bars();
        log('The black giant at your door grins, turns a key, and swings the bars wide. He ducks inside, flexing hands like shovels.', 'warn');
      }
      if (g.t > 1.8) { g.state = 'enter'; g.t = 0; }
      break;
    case 'enter':
      g.arms = Math.min(1, g.arms + DT * 1.5);
      if (moveTo(door.x, 11.3 * CELL, 2.2)) { g.state = 'stalk'; g.t = 0; }
      break;
    case 'stalk': {
      g.arms = 1;
      const d = Math.hypot(S.x - g.x, S.z - g.z);
      if (d > 1.3) moveTo(S.x, S.z, 1.7);
      else {
        g.yaw = Math.atan2(S.x - g.x, S.z - g.z);
        g.grabT -= DT;
        if (g.grabT <= 0) { g.grabT = 1.1; hurt(11, 'strangle'); log('His fingers close on your throat...', 'bad'); }
      }
      break;
    }
    case 'flee':
      g.arms = Math.max(0, g.arms - DT * 3);
      if (g.leg === 0) { if (moveTo(door.x, HALL_Z, 5.2)) g.leg = 1; }
      else moveTo(GRILLE_X - 1, HALL_Z, 5.0);
      break;
    case 'crushed':
      g.fall = Math.min(1, g.fall + DT * 2.2);
      break;
  }
  // the serpent stirs: the giant forgets you and runs
  if ((g.state === 'stalk' || g.state === 'enter') && S.satha.start !== null && S.tick >= S.satha.start + Math.round(2.6 * SIM_HZ)) {
    g.state = 'flee'; g.leg = 0; g.t = 0;
    log('The giant freezes. From the hall comes a sound like wind through dry reeds, and the floor shivers. He forgets you entirely, and runs.', 'warn');
  }
  if (g.state === 'flee' && S.satha.pts) {
    const h = S.satha.pts[0];
    if (h.y > -0.5 && Math.hypot(h.x - g.x, h.z - g.z) < 2.4) {
      g.state = 'crushed'; g.t = 0; Sfx.crush(); Sfx.scream();
      S.items.push({ id: 'dagger', kind: 'dagger', name: 'strangler\'s dagger', x: g.x + 0.6, z: 36.9, y: groundInfo(g.x + 0.6, 36.9).floor, taken: false });
      log('Satha takes him from behind. There is a crack like an oak going over, then only the long rasp of scales on stone. By the dead man\'s hand, something glints.', 'warn');
      for (let k = 0; k < 18; k++) particles.push({ m: 'drop', x: g.x, y: 1 + Math.random(), z: g.z, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 0.9, max: 0.9, g: 9, s: 1.4 });
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
  const sHead = SATHA_SPEED * t;
  const wasActive = sa.active;
  sa.active = sHead - BODY_LEN < SATHA_PATH.len;
  if (!sa.active) { if (wasActive) S.passes++; sa.pts = null; return; }
  sa.pts = sathaPoints(sHead);
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
  if (sh.state === 'dead') return;
  const d = Math.hypot(x - GRILLE_X, z - HALL_Z);
  if (d > 12 || sh.state === 'retreat' || sh.state === 'peer' || sh.ignoreT > 0) { if (d > 12) log('The bone clatters away into the dark. Nothing stirs.', 'dim'); return; }
  sh.state = 'walk'; sh.t = 0;
  sh.tx = GRILLE_X + 0.95; sh.tz = clamp(z, 13.35 * CELL, 14.65 * CELL);
  Sfx.voice(0.6);
  log('Beyond the grille a stool scrapes back. "Rats? Rats in my pits?" The jailer comes waddling to see.', 'warn');
}
function updateShukeli() {
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
  log('Your dagger finds the soft place under his ear. Shukeli sags against the grille with a sigh like a punctured wineskin, and his ring of keys clinks onto the flagstones on your side of the bars.', 'good');
}

// ---------------------------------------------------------------- projectiles & hazards
function barsHit(p, nx, nz) {
  // closed grille (x plane) and cell door (z plane) stop thrown things
  if (S.grille.open < 0.8 && (p.x - GRILLE_X) * (nx - GRILLE_X) <= 0 && Math.abs(nz - HALL_Z) < CELL) return 'x';
  const dz = 12 * CELL;
  if (S.door.open < 0.5 && (p.z - dz) * (nz - dz) <= 0 && nx > 7 * CELL && nx < 8 * CELL) return 'z';
  return null;
}
function updateProjectiles() {
  for (let i = S.proj.length - 1; i >= 0; i--) {
    const p = S.proj[i];
    p.vy -= (p.type === 'bone' ? 10 : 4) * DT; p.spin += DT * 12; p.life -= DT;
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
      } else if (p.type === 'venom') {
        const gg = groundInfo(p.x, p.z);
        if (gg.kind === 1) S.puddles.push({ x: p.x, z: p.z, y: gg.floor, t: 6 });
        for (let k = 0; k < 6; k++) particles.push({ m: 'venom', x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 3, life: 0.5, max: 0.5, g: 6, s: 0.6 });
      }
      S.proj.splice(i, 1); continue;
    }
    p.x = nx; p.y = ny; p.z = nz;
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
    consider({ type: f.type, f }, f.x, f.y - f.baseY, f.z, f.type === 'clue' ? 2.6 : f.type === 'ring' ? 3.7 : 3.0);
  }
  return best;
}
function promptText(t) {
  if (!t) return '';
  if (t.type === 'item') return t.it.heal ? '[E] ' + (t.it.kind === 'bread' ? 'eat' : 'drink') + ' the ' + t.it.name : '[E] take the ' + t.it.name;
  switch (t.type) {
    case 'ring': return S.read.has('insc_cell') ? '[E] grind the rusted link against the stone' : '[E] strain at the chain';
    case 'clue': return '[E] read the scratches';
    case 'bones': return '[E] take a thighbone';
    case 'door': return '[E] try the cell door';
    case 'grille': return S.flags.has_keys ? '[E] unlock the grille' : '[E] try the grille';
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
  stair: 'A stair climbs into the dark, toward the citadel and the open air.',
};
function objective() {
  const f = S.flags;
  if (!f.free) return 'Free yourself from the chain.';
  if (!f.has_dagger) return S.giant.state === 'crushed' ? 'Find something to fight with.' : 'Survive.';
  if (!f.shukeli_dead) return 'Reach the grille at the end of the hall. Deal with the jailer.';
  if (!f.has_keys) return 'Take the jailer\'s keys.';
  if (!f.grille_open) return 'Unlock the grille.';
  return 'Climb the stair.';
}
function enterRoom(id) {
  const room = LV.rooms.find(r => r.id === id);
  $('locName').textContent = room ? cap(room.name) : '';
  if (!room || S.visited.has(id)) return;
  S.visited.add(id);
  if (ROOM_DESC[id]) { log(cap(room.name), 'title'); log(ROOM_DESC[id]); }
}

// ---------------------------------------------------------------- the tick
function humanInput() {
  const inp = {
    fwd: (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0),
    side: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
    run: !!(keys.ShiftLeft || keys.ShiftRight), jump: !!keys.Space, use: pressUse, fire: pressFire,
  };
  pressUse = pressFire = false;
  return inp;
}
function tick(inp) {
  S.tick++;
  if (inp.yaw !== undefined) S.yaw = inp.yaw;
  if (inp.pitch !== undefined) S.pitch = inp.pitch;
  prev = { x: S.x, y: S.y, z: S.z };
  chainSndT -= DT; S.swing = Math.max(0, S.swing - DT); S.throwT = Math.max(0, S.throwT - DT);
  const { g, sp } = updatePlayer(inp);
  for (const d of [S.door, S.grille]) d.open += clamp(d.target - d.open, -DT * 0.9, DT * 0.9);
  updateGiant();
  updateSatha();
  if (mode !== 'play') return;
  updateShukeli();
  updateProjectiles();
  if (mode !== 'play') return;
  interactTarget = findTarget();
  if (inp.use) interact();
  if (inp.fire) onFire();
  if (g.kind === 2 && S.y < g.floor + 30 && S.y < -4) { die('fall'); return; }
  const id = roomIdAt(S.x, S.z);
  if (id && id !== S.room) { S.room = id; enterRoom(id); }
  if (S.onGround && sp > 0.8) { stepAcc += sp * DT; bobPhase += sp * DT * 2.2; if (stepAcc > 2.0) { stepAcc = 0; Sfx.step(hiddenAt(S.x, S.z)); } }
  bobAmt += ((S.onGround && sp > 0.8 ? Math.min(1, sp / 5) : 0) - bobAmt) * Math.min(1, DT * 8);
  if (S.flags.grille_open && S.x > 46.6 * CELL) finishLevel();
}

// ---------------------------------------------------------------- determinism helpers
function stateHash() {
  let h = 0x811c9dc5;
  const q = v => Math.round(v * 100);
  const sh = S.shukeli, g = S.giant;
  const parts = [S.tick, q(S.x), q(S.y), q(S.z), Math.round(S.health), Object.values(S.flags).map(Number).join(''), q(S.door.open), q(S.grille.open),
    S.satha.start, g.state, q(g.x), q(g.z), sh.state, q(sh.x), q(sh.z), S.proj.length, S.items.filter(i => i.taken).length];
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
      prompt: promptText(interactTarget), clues: [...S.read].map(id => LV.features.find(f => f.id === id).text), mode };
  },
  step(action = {}, ticks = 1) {
    if (mode === 'splash') startPlay(true);
    agentInput = action;
    for (let i = 0; i < ticks && mode === 'play'; i++) tick({ fwd: action.forward || 0, side: action.side || 0, run: !!action.run, jump: !!action.jump,
      use: !!action.use && i === 0, fire: !!action.attack && i === 0, yaw: action.yaw, pitch: action.pitch });
    if (mode === 'dead' && action.respawn) respawn();
    return this.obs();
  },
  release() { agentInput = null; },
  solve: () => solvePuzzle(LEVEL.puzzle),
};

// ---------------------------------------------------------------- flow
function lockPointer() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
function hideOverlay() { overlay.className = 'hidden'; overlay.innerHTML = ''; }
async function showIntro() {
  mode = 'splash'; hud.classList.add('hidden');
  await showSplash('e1m2', '<div class="keys"><b>W A S D</b> move &nbsp; <b>mouse</b> look &nbsp; <b>Shift</b> run &nbsp; <b>E</b> use &nbsp; <b>Click</b> strike / throw &nbsp; <b>Esc</b> pause</div>');
  if (mode === 'splash') startPlay(false);
}
function startPlay(agent) {
  Sfx.init();
  hideOverlay(); hud.classList.remove('hidden');
  mode = 'play'; fade = 1; fadeTarget = 0; acc = 0;
  log('THE PITS', 'title');
  log('You wake on wet straw with iron on your ankle and the taste of the wizard\'s poison still in your mouth.');
  log('Beyond the bars of your cell door, a black giant watches you, and grins.', 'warn');
  log('(E to use things. Read whatever the dead have left you.)', 'dim');
  if (!agent) lockPointer();
}
function showPause() {
  mode = 'paused';
  overlay.className = '';
  overlay.innerHTML = '<div class="panel"><h2>Paused</h2><p class="sub">e1m2 · The Pits · tick ' + S.tick + ' · state ' + stateHash() + '</p>' +
    '<div class="keys"><b>W A S D</b> move · <b>mouse</b> look · <b>Shift</b> run · <b>Space</b> jump<br><b>E</b> use · <b>Click</b> strike or throw · <b>P</b> pixel size · <b>K</b> sound · <b>F3</b> debug</div>' +
    '<div class="setting"><label for="sensIn">Mouse sensitivity</label><input type="range" id="sensIn" min="0.1" max="4" step="0.05" value="' + sensMul + '"><span id="sensVal">' + sensMul.toFixed(2) + '×</span></div>' +
    '<div class="btns"><button id="bRes">Resume</button><button id="bRestart">Restart level</button></div></div>';
  $('sensIn').oninput = e => { sensMul = parseFloat(e.target.value); $('sensVal').textContent = sensMul.toFixed(2) + '×'; try { localStorage.setItem(SENS_KEY, String(sensMul)); } catch (err) { /* ignore */ } };
  $('bRes').onclick = () => { hideOverlay(); mode = 'play'; lockPointer(); };
  $('bRestart').onclick = () => location.reload();
}
async function finishLevel() {
  if (mode !== 'play') return;
  mode = 'done'; S.doneT = S.tick; fadeTarget = 1; Sfx.sting();
  document.exitPointerLock && document.exitPointerLock();
  const secs = Math.round(S.tick / SIM_HZ);
  await new Promise(r => setTimeout(r, 900));
  hud.classList.add('hidden');
  await showSplash('e1m3', '<p class="stats">e1m2 complete · ' + Math.floor(secs / 60) + 'm ' + (secs % 60) + 's · ' + S.deaths + ' death' + (S.deaths === 1 ? '' : 's') +
    ' · Satha passed ' + S.passes + ' time' + (S.passes === 1 ? '' : 's') + ' · tick ' + S.tick + ' · state ' + stateHash() + '</p><p class="sub">End of the demo. The Tunnels Below is the next level in the plan (README §9).</p>', 'Click to play The Pits again');
  location.reload();
}

// ---------------------------------------------------------------- HUD
function updateHUD() {
  $('hpFill').style.width = Math.max(0, S.health) + '%';
  $('hpNum').textContent = Math.ceil(Math.max(0, S.health));
  const carry = [];
  if (S.flags.has_dagger) carry.push('dagger');
  if (S.flags.has_bone) carry.push('thighbone');
  if (S.flags.has_keys) carry.push('keys');
  $('carry').textContent = carry.length ? carry.join(' · ') : 'bare hands';
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
function drawHumanoid(name, x, y, z, yaw, pose, light) {
  const def = CHAR_DEFS[name], b = def.bulk;
  const root = m4trs(x, y, z, yaw, pose.pitch || 0, pose.roll || 0, def.scale);
  const P = (part, m) => R.drawEntity(getModel('part:' + name + ':' + part), m, light);
  P('torso', root);
  P('head', m4mul(root, m4mul(m4t(0, 1.5, 0), m4mul(m4rx(pose.head || 0), m4t(0, -1.5, 0)))));
  const ph = pose.walk || 0;
  for (const side of [-1, 1]) {
    const swing = -Math.sin(ph) * 0.45 * side * (pose.moving ? 1 : 0);
    const up = pose.arms || 0;
    const ua = m4mul(root, m4mul(m4t(side * 0.3 * b, 1.47, 0), m4mul(m4rx(swing * (1 - up) - 1.35 * up), m4rz(side * (0.12 + 0.15 * (pose.spread || 0))))));
    P('uarm', ua);
    P('farm', m4mul(ua, m4mul(m4t(0, -0.31, 0), m4rx(-0.25 - 0.25 * up))));
    if (def.legs) {
      const leg = Math.sin(ph) * 0.55 * side * (pose.moving ? 1 : 0);
      const th = m4mul(root, m4mul(m4t(side * 0.11 * b, 0.9, 0), m4rx(leg)));
      P('thigh', th);
      P('shin', m4mul(th, m4mul(m4t(0, -0.45, 0), m4rx(Math.max(0, -leg) * 0.9))));
    }
  }
  if (pose.keys) R.drawEntity(getModel('part:shukeli:keys'), m4mul(root, m4trs(0.42, 0.98, 0.1, Math.PI / 2, 0, 0, 1)), light);
}
function render(alpha) {
  const px = lerp(prev.x, S.x, alpha), py = lerp(prev.y, S.y, alpha), pz = lerp(prev.z, S.z, alpha);
  const bob = Math.sin(bobPhase * 2) * 0.05 * bobAmt, eyeY = py + EYE + bob;
  const proj = m4persp(72 * Math.PI / 180, R.aspect, 0.05, 200);
  const view = m4mul(m4rx(-S.pitch), m4mul(m4ry(-S.yaw), m4t(-px, -eyeY, -pz)));
  const vp = m4mul(proj, view), f = camFwd();
  const lampPos = [px + f[0] * 0.3, eyeY - 0.2, pz + f[2] * 0.3], lc = [0.24, 0.22, 0.19];
  // torches gutter as Satha comes (rule 4: timing visible in the world)
  const t = sathaPhase();
  let lm = 1 + 0.035 * Math.sin(gameTime * 9.1) + 0.02 * Math.sin(gameTime * 23.7);
  if (t >= 0 && t < 6.5) lm *= 1 - 0.5 * smoothstep(0, 0.6, t) * (1 - smoothstep(5, 6.5, t)) * (0.75 + 0.25 * Math.sin(gameTime * 37));
  R.beginScene(gameTime);
  R.lightMul(lm);
  R.setCamera(vp, [px, eyeY, pz], lampPos, lc, 9, 0.045);
  R.drawWorld(levelMesh);
  // items
  for (const it of S.items) {
    if (it.taken) continue;
    const light = sampleLight(it.x, it.y + 0.5, it.z);
    const mesh = it.kind === 'wine' && it.name.startsWith('jug') ? 'jug' : it.kind;
    const flat = it.kind === 'dagger' || it.kind === 'bone' || it.kind === 'keys';
    const m = flat ? m4trs(it.x, it.y + 0.05, it.z, hrand(it.x * 10, it.z * 10, 1, 1) * 6, Math.PI / 2, 0, 1.2) : m4trs(it.x, it.y, it.z, 0.6, 0, 0, 1.3);
    R.drawEntity(getModel(mesh), m, light, 0.06 + 0.05 * Math.sin(gameTime * 3));
  }
  // ring and chain
  const ring = feature('ring'), rl = sampleLight(ring.x, 1, ring.z + 1);
  R.drawEntity(getModel('ring'), m4trs(ring.x, ring.y, ring.z + 0.08, 0, 0, 0, 1.4), rl);
  const A = [ring.x, ring.y - 0.22, ring.z + 0.12];
  const B = S.flags.free ? [ring.x + 0.5, groundInfo(ring.x + 0.5, ring.z + 1.6).floor + 0.03, ring.z + 1.6] : [px, py + 0.12, pz];
  const dist = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), n = Math.max(4, Math.ceil(dist / 0.17)), sag = Math.sqrt(Math.max(0, 3.6 * 3.6 - dist * dist)) * 0.45;
  let lp = A;
  for (let i = 1; i <= n; i++) {
    const tt = i / n, x = lerp(A[0], B[0], tt), z = lerp(A[2], B[2], tt);
    const y = Math.max(groundInfo(x, z).floor + 0.03, lerp(A[1], B[1], tt) - sag * Math.sin(Math.PI * tt));
    const dx = x - lp[0], dy = y - lp[1], dz = z - lp[2];
    R.drawEntity(getModel('link'), m4trs((x + lp[0]) / 2, (y + lp[1]) / 2, (z + lp[2]) / 2, Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)), i % 2 ? Math.PI / 2 : 0, 1), sampleLight(x, y + 0.5, z));
    lp = [x, y, z];
  }
  // the cell door (swings into the hall) and the grille (slides up)
  const dl = sampleLight(8 * CELL, 1.5, 12.2 * CELL);
  R.drawEntity(getModel('bars:2.5:3.2'), m4trs(7 * CELL, 0, 12 * CELL, 1.45 * smoothstep(0, 1, S.door.open), 0, 0, 1), dl);   // swings into the cell
  const gl2 = sampleLight(GRILLE_X, 2, HALL_Z);
  R.drawEntity(getModel('bars:5:7.5'), m4trs(GRILLE_X, S.grille.open * 6.6, 13 * CELL + 5, Math.PI / 2, 0, 0, 1), gl2);
  // the giant
  const g = S.giant;
  if (g.state === 'crushed') {
    const fall = smoothstep(0, 1, g.fall);
    drawHumanoid('giant', g.x, g.y + 0.25 * fall, g.z, g.yaw, { pitch: -1.5 * fall, roll: 0.3 * fall, spread: 1 }, sampleLight(g.x, 1, g.z));
  } else drawHumanoid('giant', g.x, g.y, g.z, g.yaw, { walk: g.walk * 2.2, moving: g.state === 'enter' || g.state === 'flee' || (g.state === 'stalk' && Math.hypot(S.x - g.x, S.z - g.z) > 1.3), arms: g.arms }, sampleLight(g.x, 1.5, g.z));
  // Shukeli
  const sh = S.shukeli, sl = sampleLight(sh.x, 1.5, sh.z);
  if (sh.state === 'dead') {
    const fall = smoothstep(0, 1, sh.fall);
    drawHumanoid('shukeli', sh.x + 0.25 * fall, groundInfo(sh.x, sh.z).floor, sh.z, -Math.PI / 2, { pitch: 0.55 * fall, roll: 0.25 * fall, head: 0.5 * fall, arms: 0 }, sl);
  } else {
    const moving = sh.state === 'walk' || sh.state === 'return' || sh.state === 'retreat';
    drawHumanoid('shukeli', sh.x, groundInfo(sh.x, sh.z).floor + (moving ? Math.abs(Math.sin(sh.walk * 3)) * 0.04 : 0), sh.z, sh.yaw,
      { walk: sh.walk * 3, moving, head: sh.state === 'peer' ? 0.25 : 0, pitch: sh.state === 'peer' ? 0.12 : 0, arms: sh.state === 'peer' ? 0.35 : 0, keys: true }, sl);
  }
  // Satha (head + 12 segments + tail, README MODELS §5.2), sampled at render time for smooth motion
  if (t >= 0) {
    const sHead = SATHA_SPEED * (t + alpha * DT);
    if (sHead - BODY_LEN < SATHA_PATH.len) {
      const pts = sathaPoints(sHead);
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        if (p.y < -12 && p.y < groundInfo(p.x, p.z).floor - 3) continue;
        const light = sampleLight(p.x, p.y + 0.5, p.z);
        const name = i === 0 ? 'satha_head' : i === pts.length - 1 ? 'satha_tail' : 'satha_seg';
        const sc = i === 0 ? 1.7 : p.r / 0.86;
        const roll = i === 0 ? 0 : Math.sin(i * 0.9 + sHead * 0.4) * 0.12;
        R.drawEntity(getModel(name), m4trs(p.x, p.y + (i === 0 ? -1.1 : 0), p.z, p.yaw, p.pitch, roll, sc), light, 0.04);
      }
    }
  }
  for (const p of S.proj) {
    const light = sampleLight(p.x, p.y, p.z);
    if (p.type === 'bone') R.drawEntity(getModel('bone'), m4trs(p.x, p.y, p.z, Math.atan2(p.vx, p.vz), p.spin, 0, 1.3), light);
    else R.drawEntity(getModel('venom'), m4trs(p.x, p.y, p.z, Math.atan2(p.vx, p.vz), 0, p.spin, 1.2), light, 0.5);
  }
  for (const p of particles) R.drawEntity(getModel(p.m === 'venom' ? 'venom' : 'drop'), m4trs(p.x, p.y, p.z, p.life * 3, 0, 0, p.s * (p.life / p.max) * (p.m === 'venom' ? 0.4 : 1)), sampleLight(p.x, p.y, p.z), p.m === 'venom' ? 0.5 : 0);
  R.blend(true);
  for (const pd of S.puddles) R.drawEntity(getModel('puddle'), m4trs(pd.x, pd.y, pd.z, 0, 0, 0, 0.6 + 0.4 * Math.min(1, (6 - pd.t) * 3)), [0.3, 0.3, 0.3], 0.4, Math.min(0.85, pd.t));
  R.blend(false);
  // view-model: the hero's manacled forearm, with whatever is in hand
  if (mode === 'play' || mode === 'paused') {
    R.clearDepth(); R.lightMul(1);
    R.setCamera(m4persp(60 * Math.PI / 180, R.aspect, 0.01, 10), [0, 0, 0], [0.1, 0.2, 0.3], [0, 0, 0], 1, 0);
    const am = sampleLight(px, py + 1.2, pz), vl = [am[0] + 0.06, am[1] + 0.055, am[2] + 0.05];
    const sb = Math.sin(bobPhase) * 0.012 * bobAmt, cb = Math.abs(Math.cos(bobPhase)) * 0.012 * bobAmt;
    const sw = S.swing > 0 ? Math.sin((1 - S.swing / 0.38) * Math.PI) : 0, th = S.throwT > 0 ? Math.sin((1 - S.throwT / 0.35) * Math.PI) : 0;
    const arm = m4trs(0.24 - sb - sw * 0.1, -0.29 + cb + sw * 0.07 + th * 0.12, -0.5 - sw * 0.2 - th * 0.1, 0.18 + sw * 0.2, 0.28 - th * 0.8, 0, 0.75);
    R.drawEntity(getModel('vm_arm'), arm, vl);
    if (S.flags.has_bone) R.drawEntity(getModel('bone'), m4mul(arm, m4trs(0, 0.02, -0.08, 0.5, 0.4, 0, 0.6)), vl);
    else if (S.flags.has_dagger) R.drawEntity(getModel('dagger'), m4mul(arm, m4trs(0, 0.0, -0.08, 0, -1.0 - sw * 0.5, 0, 0.62)), vl);
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
    case 'KeyP': resIdx = (resIdx + 1) % RES_STEPS.length; onResize(); log('Render resolution: ' + RES_STEPS[resIdx] + ' lines.', 'dim'); break;
    case 'KeyK': log(Sfx.toggleMute() ? 'Sound off.' : 'Sound on.', 'dim'); break;
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
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && mode === 'play' && !agentInput) showPause();
});

// ---------------------------------------------------------------- boot
function boot() {
  try { R = new Renderer(canvas); }
  catch (e) { overlay.innerHTML = '<div class="panel"><h2>No WebGL2</h2><p>This demo needs a browser with WebGL2. (' + e.message + ')</p></div>'; return; }
  onResize();
  addEventListener('resize', onResize);
  setTimeout(() => {
    R.uploadTextures(generateTextures());
    buildLevel(LEVEL);
    buildSathaPath();
    levelMesh = R.createMesh(buildLevelMesh());
    const seed = parseInt(new URLSearchParams(location.search).get('seed'), 10) || 1;
    S = newState(seed);
    S.y = groundInfo(S.x, S.z).floor; prev = { x: S.x, y: S.y, z: S.z };
    S.room = roomIdAt(S.x, S.z); S.visited.add(S.room); $('locName').textContent = 'The Cell';
    const pz = solvePuzzle(LEVEL.puzzle);
    console.log('[solve] e1m2: ' + pz.states + ' states, goal ' + (pz.goalReachable ? 'reachable' : 'UNREACHABLE') + ', softlocks: ' + (pz.softlocks.length || 'none'));
    lastFrame = performance.now();
    requestAnimationFrame(frame);
    if (new URLSearchParams(location.search).has('agent')) { mode = 'splash'; return; }
    showIntro();
  }, 30);
}
boot();
