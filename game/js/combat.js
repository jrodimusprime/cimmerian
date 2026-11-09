'use strict';
// ---------------------------------------------------------------------------
// Combat (README §13). Fixed damage, telegraphed attacks (every foe winds up
// for at least 0.4 s before a blow lands), shields that turn a blade but not
// a kick, and knockback that can put a warden into the serpent's well.
// All decisions run in the fixed tick and draw from S.rng (README §11).
// ---------------------------------------------------------------------------

const WEAPONS = {
  fists: { name: 'fists', dmg: [8, 8, 13], period: 0.42, reach: 2.0, arc: 0.5, hitAt: 0.13 },
  dagger: { name: 'dagger', dmg: [20, 20, 28], period: 0.36, reach: 2.35, arc: 0.45, hitAt: 0.12 },
  sword: { name: 'sword', dmg: [30, 30, 48], period: 0.5, reach: 3.0, arc: 0.25, hitAt: 0.2, cleave: true },
};
const WEAPON_ORDER = ['fists', 'dagger', 'sword'];
const KICK = { dmg: 6, period: 0.62, reach: 2.4, arc: 0.4, hitAt: 0.16, push: 11, stagger: 1.15 };
const FOES = {
  warden: { hp: 70, speed: 3.3, reach: 2.4, dmg: 13, windup: 0.5, strike: 0.22, recover: 0.6, block: 'alternate', sight: 17, name: 'warden' },
  spearman: { hp: 55, speed: 3.1, reach: 3.3, dmg: 15, windup: 0.62, strike: 0.22, recover: 0.75, sight: 17, name: 'spearman' },
  archer: { hp: 40, speed: 3.6, reach: 0, dmg: 12, windup: 0.85, strike: 0.15, recover: 1.0, ranged: true, keep: [7, 15], sight: 24, name: 'archer' },
  captain: { hp: 190, speed: 3.7, reach: 2.6, dmg: 18, windup: 0.44, strike: 0.2, recover: 0.42, block: 'front', combo: 2, sight: 20, name: 'captain' },
};
const ALERT_LINES = {
  scout: '"Who screamed? Who\'s there?" A warden comes up the south passage with his sword out.',
  post: '"The prisoner is loose! To me, to me!" The wardens at the post scramble for their weapons.',
  barracks: 'Shukeli\'s death-squeal rings through the pits. Boots thunder in the barracks!',
  landing: '"So the dog-king climbs. Kill him on the stair!" The captain of the pits draws his sword.',
};

function newFoes() {
  return LEVEL.entities.filter(e => FOES[e.class]).map(e => {
    const p = { x: e.at[0] * CELL, z: e.at[1] * CELL };
    return { id: e.id, cls: e.class, group: e.group, x: p.x, z: p.z, y: 0, homeX: p.x, homeZ: p.z, homeYaw: e.yaw, yaw: e.yaw,
      hp: FOES[e.class].hp, state: 'idle', t: 0, walk: 0, vx: 0, vz: 0, alert: false, blockToggle: false, combo: 0, cool: 0,
      dead: false, deathT: 0, how: '', flash: 0, falling: 0, tx: 0, tz: 0, moving: false };
  });
}

// ---- pathing: a flow field over the grid from the player's cell ------------
let FLOW = null, FLOW_BARS = null;
function walkableFor(idx) {
  return idx >= 0 && LV.kind[idx] === 1 && !(LV.flags[idx] & F_NOPASS) && !(LV.blockers.has(idx) && linkClosed(idx));
}
function bfs(startIdx) {
  const N = LV.W * LV.H, dist = new Int16Array(N).fill(-1);
  if (startIdx < 0) return dist;
  const q = [startIdx]; dist[startIdx] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], gx = i % LV.W, gz = (i / LV.W) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const j = cellIdx(gx + dx, gz + dz);
      if (j < 0 || dist[j] >= 0 || !walkableFor(j)) continue;
      if (dx && dz && (!walkableFor(cellIdx(gx + dx, gz)) || !walkableFor(cellIdx(gx, gz + dz)))) continue;
      if (Math.abs(LV.floor[j] - LV.floor[i]) > 1.3) continue;
      dist[j] = dist[i] + 1; q.push(j);
    }
  }
  return dist;
}
function computeFlow() {
  FLOW = bfs(cellIdx(Math.floor(S.x / CELL), Math.floor(S.z / CELL)));
  // when the grille is shut, guards on the far side press up against the bars instead
  FLOW_BARS = bfs(cellIdx(35, S.z < 14 * CELL ? 13 : 14));
}
function flowStep(f, field) {
  const gx = Math.floor(f.x / CELL), gz = Math.floor(f.z / CELL), here = field[cellIdx(gx, gz)];
  if (here < 0) return null;
  let best = here, bx = 0, bz = 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const j = cellIdx(gx + dx, gz + dz);
    if (j < 0 || field[j] < 0 || field[j] >= best) continue;
    if (dx && dz && (!walkableFor(cellIdx(gx + dx, gz)) || !walkableFor(cellIdx(gx, gz + dz)))) continue;
    best = field[j]; bx = dx; bz = dz;
  }
  if (!bx && !bz) return null;
  return [(gx + bx + 0.5) * CELL, (gz + bz + 0.5) * CELL];
}

// ---- perception ---------------------------------------------------------------
function foeSees(f) {
  const st = FOES[f.cls], dx = S.x - f.x, dz = S.z - f.z, d = Math.hypot(dx, dz);
  if (d > st.sight || (hiddenAt(S.x, S.z) && d > 3)) return false;
  const facing = (dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw)) / (d || 1);
  if (!f.alert && facing < -0.25 && d > 3.5) return false;
  return los(f.x, f.y + 1.6, f.z, S.x, S.y + 1.5, S.z);
}
function alertGroup(g, quiet) {
  let woke = false;
  for (const f of S.foes) if (f.group === g && !f.dead && !f.alert) { f.alert = true; if (f.state === 'idle' || f.state === 'investigate') { f.state = 'chase'; f.t = 0; } woke = true; }
  if (woke && !quiet && ALERT_LINES[g] && !S.alerted.has(g)) { S.alerted.add(g); log(ALERT_LINES[g], g === 'barracks' ? 'bad' : 'warn'); Sfx.shout(); }
}

// ---- the foes' tick ------------------------------------------------------------
function updateFoes() {
  if (S.tick % 18 === 0 || !FLOW) computeFlow();
  for (const f of S.foes) {
    const st = FOES[f.cls];
    f.flash = Math.max(0, f.flash - DT); f.cool -= DT; f.t += DT;
    if (f.dead) {
      f.deathT += DT;
      if (f.falling) { f.vy = (f.vy || 0) - 24 * DT; f.y += f.vy * DT; }
      continue;
    }
    // knockback, then fall if it carried them over a pit
    if (Math.abs(f.vx) + Math.abs(f.vz) > 0.01) {
      const r = collide(f.x + f.vx * DT, f.z + f.vz * DT, 0.42, f.y, f);
      f.x = r[0]; f.z = r[1]; f.vx *= Math.pow(0.02, DT); f.vz *= Math.pow(0.02, DT);
    }
    const g = groundInfo(f.x, f.z);
    if (g.kind === 2) { killFoe(f, 'fall'); f.falling = 1; f.vy = 0; continue; }
    f.y += (g.floor - f.y) * Math.min(1, DT * 12);
    const dx = S.x - f.x, dz = S.z - f.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz);
    if (!f.alert && mode === 'play' && foeSees(f)) alertGroup(f.group);
    f.moving = false;
    const turn = (rate) => { let a = want - f.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); f.yaw += clamp(a, -rate * DT, rate * DT); };
    const move = (tx, tz, spd) => {
      const ddx = tx - f.x, ddz = tz - f.z, dd = Math.hypot(ddx, ddz);
      if (dd < 0.05) return;
      const r = collide(f.x + ddx / dd * spd * DT, f.z + ddz / dd * spd * DT, 0.42, f.y, f);
      f.walk += Math.hypot(r[0] - f.x, r[1] - f.z); f.x = r[0]; f.z = r[1]; f.moving = true;
      let a = Math.atan2(ddx, ddz) - f.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); f.yaw += clamp(a, -8 * DT, 8 * DT);
    };
    const approach = (spd) => {
      if (d < 7 && los(f.x, f.y + 1.2, f.z, S.x, S.y + 1.2, S.z) && Math.abs(S.y - f.y) < 1.4) { move(S.x, S.z, spd); return; }
      const shut = S.grille.open < 0.8 && f.x > GRILLE_X && S.x < GRILLE_X;
      const step = flowStep(f, FLOW) || (shut ? flowStep(f, FLOW_BARS) : null);
      if (step) move(step[0], step[1], spd);
      else if (shut) move(GRILLE_X + 0.45, clamp(S.z, 13.2 * CELL, 14.8 * CELL), spd);          // press up against the bars nearest him
      else if (d < 20 && los(f.x, f.y + 1.2, f.z, S.x, S.y + 1.2, S.z)) move(S.x, S.z, spd);
    };
    switch (f.state) {
      case 'idle': f.yaw += Math.sin(S.tick * 0.01 + f.homeX) * 0.002; break;
      case 'investigate':
        move(f.tx, f.tz, st.speed * 0.8);
        if (Math.hypot(f.tx - f.x, f.tz - f.z) < 0.6) { f.state = 'idle'; }
        break;
      case 'chase':
        if (mode !== 'play') break;
        if (st.ranged) {
          const see = los(f.x, f.y + 1.6, f.z, S.x, S.y + 1.4, S.z);
          if (d < st.keep[0]) { const bx = f.x - dx / d * 2, bz = f.z - dz / d * 2; move(bx, bz, st.speed); turn(10); }
          else if (!see || d > st.keep[1]) approach(st.speed);
          else { turn(8); if (f.cool <= 0) { f.state = 'windup'; f.t = 0; Sfx.bowdraw(); } }
        } else if (d <= st.reach * 0.92 && Math.abs(S.y - f.y) < 1.6) {
          turn(8);
          if (f.cool <= 0) { f.state = 'windup'; f.t = 0; Sfx.ready(clamp(-dx / 15, -1, 1)); }
        } else approach(st.speed);
        // separation from friends
        for (const o of S.foes) if (o !== f && !o.dead) { const ox = f.x - o.x, oz = f.z - o.z, od = Math.hypot(ox, oz); if (od < 0.9 && od > 1e-4) { f.x += ox / od * (0.9 - od) * 0.5; f.z += oz / od * (0.9 - od) * 0.5; } }
        break;
      case 'windup':
        turn(f.cls === 'captain' ? 4.5 : 3.2);       // slow to track: strafing out of a telegraphed blow is fair
        if (f.t >= st.windup * (f.combo ? 0.6 : 1)) { f.state = 'strike'; f.t = 0; foeStrike(f, st); }
        break;
      case 'strike':
        if (f.t >= st.strike) {
          if (st.combo && f.combo < st.combo - 1) { f.combo++; f.state = 'windup'; f.t = 0; }
          else { f.combo = 0; f.state = 'recover'; f.t = 0; }
        }
        break;
      case 'recover': if (f.t >= st.recover) { f.state = 'chase'; f.t = 0; f.cool = 0.25 + S.rng.next() * 0.5; } break;
      case 'block': if (f.t >= 0.32) { f.state = 'chase'; f.t = 0; } break;
      case 'pain': if (f.t >= 0.34) { f.state = 'chase'; f.t = 0; f.cool = 0.2; } break;
      case 'stagger': if (f.t >= KICK.stagger) { f.state = 'chase'; f.t = 0; f.cool = 0.3; } break;
    }
  }
}
function foeStrike(f, st) {
  const dx = S.x - f.x, dz = S.z - f.z, d = Math.hypot(dx, dz);
  if (st.ranged) {                                      // loose an arrow, leading the target a little
    const ox = f.x + Math.sin(f.yaw) * 0.5, oy = f.y + 1.45 * CAST[f.cls].scale, oz = f.z + Math.cos(f.yaw) * 0.5;
    const lead = d / 24, tx = S.x + S.vx * lead + (S.rng.next() - 0.5) * 0.5, tz = S.z + S.vz * lead + (S.rng.next() - 0.5) * 0.5, ty = S.y + 1.25;
    const dd = Math.hypot(tx - ox, ty - oy, tz - oz) || 1;
    S.proj.push({ type: 'arrow', x: ox, y: oy, z: oz, vx: (tx - ox) / dd * 24, vy: (ty - oy) / dd * 24 + 0.5, vz: (tz - oz) / dd * 24, life: 3, spin: 0, from: f.id });
    Sfx.bow();
    return;
  }
  Sfx.swing();
  const facing = (dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw)) / (d || 1);
  if (mode === 'play' && d <= st.reach + 0.35 && facing > 0.5 && Math.abs(S.y - f.y) < 1.8 && los(f.x, f.y + 1.3, f.z, S.x, S.y + 1.3, S.z)) {
    hurt(st.dmg, f.cls === 'spearman' ? 'spear' : 'blade');
    punchView(0.06, (S.rng.next() - 0.5) * 0.06);
    S.vx += dx / (d || 1) * 3; S.vz += dz / (d || 1) * 3;
  }
}

// ---- the player's blows -------------------------------------------------------
function startAttack(kick) {
  if (kick) {
    if (S.kickT > 0 || S.swing > 0) return;
    S.kickT = KICK.period; S.pendingHit = { at: S.tick + Math.round(KICK.hitAt * SIM_HZ), kick: true };
    Sfx.whoosh(); return;
  }
  if (S.swing > 0 || S.kickT > 0 || S.throwT > 0) return;
  const w = WEAPONS[S.weapon];
  S.combo = (S.tick - S.lastSwing < (w.period + 0.35) * SIM_HZ) ? (S.combo + 1) % 3 : 0;
  S.lastSwing = S.tick; S.swing = w.period; S.swingLen = w.period;
  S.pendingHit = { at: S.tick + Math.round(w.hitAt * SIM_HZ), kick: false, w: S.weapon, n: S.combo };
  Sfx.whoosh();
}
function resolvePlayerHit() {
  const h = S.pendingHit; if (!h || S.tick < h.at) return; S.pendingHit = null;
  const spec = h.kick ? KICK : WEAPONS[h.w], fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
  const inArc = (x, z, y) => {
    const dx = x - S.x, dz = z - S.z, d = Math.hypot(dx, dz);
    return d < spec.reach && (d < 0.8 || (dx * fx + dz * fz) / d > spec.arc) && Math.abs(y - S.y) < 2 && los(S.x, S.y + 1.3, S.z, x, y + 1.2, z) ? d : -1;
  };
  let hit = false;
  const targets = S.foes.filter(f => !f.dead && inArc(f.x, f.z, f.y) >= 0).sort((a, b) => Math.hypot(a.x - S.x, a.z - S.z) - Math.hypot(b.x - S.x, b.z - S.z));
  for (const f of (spec.cleave || h.kick ? targets : targets.slice(0, 1))) { hitFoe(f, h.kick ? KICK.dmg : spec.dmg[h.n], h.kick); hit = true; }
  // the jailer through the bars, the serpent, the giant: the old interactions still hold
  const sh = S.shukeli;
  if (!h.kick && sh.state !== 'dead' && inArc(sh.x, sh.z, groundInfo(sh.x, sh.z).floor) >= 0) {
    if (h.w !== 'fists') killShukeli(); else { Sfx.miss(); log('You snatch at his robe through the bars. He squeals and tears free.', 'dim'); shukeliRetreat(); }
    hit = true;
  }
  const head = S.satha.pts && S.satha.active ? S.satha.pts[0] : null;
  if (!hit && head && head.y > -0.5 && Math.hypot(head.x - S.x, head.z - S.z) < spec.reach + 1.2) { Sfx.clank(); log(h.w === 'fists' || h.kick ? 'You might as well kick the mountain.' : 'Your blade skates off her scales like a stone off a tiled roof.', 'dim'); hit = true; }
  const g = S.giant;
  if (!hit && g.state !== 'crushed' && g.state !== 'wait' && inArc(g.x, g.z, g.y) >= 0) { Sfx.stab(); log('You hammer at him. It is like striking an oak.', 'dim'); hit = true; }
  if (!hit) Sfx.miss();
}
function hitFoe(f, dmg, kick) {
  const st = FOES[f.cls], dx = S.x - f.x, dz = S.z - f.z, d = Math.hypot(dx, dz) || 1;
  const front = (dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw)) / d > 0.3;
  alertGroup(f.group);
  if (!kick && st.block && front && !['stagger', 'windup', 'strike'].includes(f.state)) {
    f.blockToggle = !f.blockToggle;
    if (st.block === 'front' || f.blockToggle) {
      f.state = 'block'; f.t = 0; Sfx.clang(); punchView(-0.03, 0.02);
      for (let k = 0; k < 6; k++) particles.push({ m: 'spark', x: f.x + dx / d * 0.5, y: f.y + 1.3, z: f.z + dz / d * 0.5, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 0.25, max: 0.25, g: 9, s: 0.5 });
      if (!S.hints.has('block')) { S.hints.add('block'); log('His shield turns your blow. Kick him off his guard! (Right-click or F)', 'dim'); }
      return;
    }
  }
  f.hp -= dmg; f.flash = 0.12; S.hits++;
  Sfx.hit(); punchView(0.02, 0);
  for (let k = 0; k < (kick ? 3 : 9); k++) particles.push({ m: 'blood', x: f.x + dx / d * 0.35, y: f.y + 1.2 + Math.random() * 0.4, z: f.z + dz / d * 0.35, vx: -dx / d * 2 + (Math.random() - 0.5) * 3, vy: Math.random() * 2.5, vz: -dz / d * 2 + (Math.random() - 0.5) * 3, life: 0.7, max: 0.7, g: 9, s: 1 });
  if (kick) { f.state = 'stagger'; f.t = 0; f.combo = 0; f.vx = -dx / d * KICK.push; f.vz = -dz / d * KICK.push; Sfx.kick(); }
  else {
    f.vx -= dx / d * 2.2; f.vz -= dz / d * 2.2;
    if (f.cls !== 'captain' && dmg >= 40) { f.state = 'pain'; f.t = 0; f.combo = 0; Sfx.grunt(); }   // only a heavy blow breaks a wind-up
  }
  if (f.hp <= 0) killFoe(f, kick ? 'kick' : 'blade');
}
const DEATH_LINES = {
  blade: n => 'The ' + n + ' goes down and does not get up.',
  kick: n => 'Your heel caves in the ' + n + '\'s chest. He drops.',
  fall: n => 'The ' + n + ' goes over the lip of the well, screaming all the way down.',
  crush: n => 'Satha rolls over the ' + n + ' without slowing. There is not much left.',
};
function killFoe(f, how) {
  if (f.dead) return;
  f.dead = true; f.state = 'dead'; f.deathT = 0; f.how = how; f.hp = 0; S.kills++;
  Sfx.grunt(); if (how === 'fall') Sfx.scream();
  log(DEATH_LINES[how](FOES[f.cls].name), 'good');
  const drop = (kind, name) => S.items.push({ id: 'drop_' + f.id, kind, name, x: f.x, z: f.z, y: groundInfo(f.x, f.z).floor, taken: false });
  if (how !== 'fall' && how !== 'crush') {
    if ((f.cls === 'warden' || f.cls === 'captain') && !S.weapons.sword && !S.items.some(i => i.kind === 'sword' && !i.taken)) drop('sword', 'warden\'s sword');
    else if (f.cls === 'spearman') drop('spear', 'spear');
  }
}
function punchView(p, y) { punchPitch += p; punchYaw += y; }

// ---- drawing the foes ---------------------------------------------------------
function foePose(f) {
  const st = FOES[f.cls], P = poseIdle({}, gameTime + f.homeX), c = CAST[f.cls];
  if (c.shield) { P.uxL = -0.35; P.fxL = -1.25; P.uzL = 0.25; }
  if (c.weapon === 'spear') { P.uxR = -0.25; P.fxR = -1.2; P.we = 1.25; }
  else if (c.weapon === 'sword') { P.uxR = -0.25; P.fxR = -0.9; P.we = 0.45; }
  else if (c.weapon === 'bow') { P.uxL = -0.2; P.fxL = -0.6; }
  if (f.dead) {
    const k = smoothstep(0, 0.7, f.deathT);
    Object.assign(P, { pitch: -1.45 * k, drop: (f.falling ? 0 : 0.12) * k, uzL: 0.3 + 0.9 * k, uzR: 0.3 + 0.9 * k, uxL: -0.3 * k, uxR: -0.3 * k, txL: -0.5 * k, txR: -0.2 * k, sxL: 0.8 * k, sxR: 0.3 * k, headX: -0.3 * k });
    return P;
  }
  if (f.moving) poseWalk(P, f.walk * 2.6, Math.min(1, 1), !c.shield && c.weapon !== 'spear');
  const t = f.t;
  switch (f.state) {
    case 'windup': {
      const k = smoothstep(0, st.windup, t);
      if (c.weapon === 'sword') Object.assign(P, { uxR: lerp(P.uxR, -2.6, k), uzR: 0.4 * k, fxR: lerp(P.fxR, -1.3, k), twist: -0.45 * k, lean: -0.08 * k, we: lerp(0.45, 2.3, k) });
      else if (c.weapon === 'spear') Object.assign(P, { uxR: lerp(P.uxR, 0.35, k), fxR: lerp(-1.2, -1.9, k), twist: -0.35 * k, lean: -0.1 * k, we: lerp(1.25, 0.05, k) });
      else if (c.weapon === 'bow') Object.assign(P, { uxL: -1.5, uyL: 0.1, fxL: -0.05, uxR: -1.45, uzR: 0.35 * k, fxR: lerp(-0.5, -2.3, k), twist: 0.35, headY: -0.2 });
      break;
    }
    case 'strike': {
      const k = smoothstep(0, st.strike, t);
      if (c.weapon === 'sword') Object.assign(P, { uxR: lerp(-2.6, -0.5, k), uzR: 0.4 - 0.5 * k, fxR: lerp(-1.3, -0.15, k), twist: lerp(-0.45, 0.5, k), lean: lerp(-0.08, 0.28, k), we: lerp(2.3, -0.5, k) });
      else if (c.weapon === 'spear') Object.assign(P, { uxR: lerp(0.35, -1.45, k), fxR: lerp(-1.9, -0.05, k), twist: lerp(-0.35, 0.2, k), lean: 0.3 * k, we: 0.0 });
      else Object.assign(P, { uxL: -1.5, fxL: -0.05, uxR: -1.3, fxR: -0.6, twist: 0.35 });
      break;
    }
    case 'recover': if (c.weapon === 'sword') { const k = 1 - smoothstep(0, st.recover, t); P.uxR = lerp(P.uxR, -0.5, k); P.twist = 0.5 * k; P.lean = 0.28 * k; } break;
    case 'block': Object.assign(P, { uxL: -1.2, fxL: -1.35, uzL: 0.1, lean: -0.08 }); break;
    case 'pain': Object.assign(P, { lean: -0.3, headX: -0.35, uzL: 0.6, uzR: 0.6 }); break;
    case 'stagger': { const k = Math.sin(Math.min(1, t / KICK.stagger) * Math.PI); Object.assign(P, { lean: -0.5 * k, headX: -0.4 * k, uzL: 1.1 * k, uzR: 1.1 * k, uxL: -0.6 * k, uxR: -0.6 * k, txL: -0.5 * k, sxL: 0.6 * k }); break; }
  }
  return P;
}
function drawFoes() {
  for (const f of S.foes) {
    if (f.dead && f.falling && f.y < -12) continue;
    const l = sampleLight(f.x, f.y + 1.4, f.z);
    drawCharacter(f.cls, f.x, f.y, f.z, f.yaw, foePose(f), l, f.flash > 0 ? 0.55 : 0);
  }
}
