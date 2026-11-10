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
// The cast is the book's (README §1: canon cast only). Each entry cites where Howard puts them.
const FOES = {
  // "the Kothian guards looked on stolidly" (ch. II); Strabonus's Kothian spearmen and Shemitish archers (ch. I, V)
  warden: { hp: 70, speed: 3.3, reach: 2.4, dmg: 13, windup: 0.5, strike: 0.22, recover: 0.6, block: 'alternate', sight: 17, name: 'Kothian guard' },
  spearman: { hp: 55, speed: 3.1, reach: 3.3, dmg: 15, windup: 0.62, strike: 0.22, recover: 0.75, sight: 17, name: 'Kothian spearman' },
  archer: { hp: 40, speed: 3.6, reach: 0, dmg: 12, windup: 0.85, strike: 0.15, recover: 1.0, ranged: true, keep: [7, 15], sight: 24, name: 'Shemite archer' },
  // ch. I: "dark-faced Kothian knights", "Ophirean knights in gilded mail"
  kknight: { hp: 80, speed: 3.4, reach: 2.5, dmg: 14, windup: 0.5, strike: 0.22, recover: 0.55, block: 'alternate', sight: 20, name: 'Kothian knight' },
  oknight: { hp: 75, speed: 3.6, reach: 2.5, dmg: 13, windup: 0.45, strike: 0.2, recover: 0.5, block: 'alternate', sight: 20, name: 'Ophirean knight' },
  // "the black giants who guarded him ... grasping their long-shafted axes" (ch. II): Tsotha's own guard
  axeman: { hp: 160, speed: 3.3, reach: 2.7, dmg: 20, windup: 0.7, strike: 0.26, recover: 0.85, block: 'front', sight: 20, name: 'black axeman' },
  // "monsters with dripping jaws agape"; "something whimpered in fear and slunk away in the darkness" (ch. III-IV)
  thing: { hp: 32, speed: 4.6, reach: 1.9, dmg: 9, windup: 0.42, strike: 0.25, recover: 0.55, sight: 15, leap: 6, name: 'pit-thing' },
  // the weeping thing (ch. III): Conan fled it, "doubting the power of man-made weapons to harm it"
  weeper: { hp: 1e9, speed: 2.7, reach: 1.7, dmg: 30, windup: 0.3, strike: 0.3, recover: 0.6, sight: 16, name: 'weeping thing', invulnerable: true, territory: null },
};
const ALERT_LINES = {
  scout: '"Who screamed? Who\'s there?" A Kothian guard comes up the south passage with his sword out.',
  post: 'Something whimpers in the dark of the passage, and something else answers it.',
  vaults: 'The dark between the pillars is full of movement.',
  bonepit: 'The bones shift. Things uncurl from among them, all dripping jaws.',
  pits: 'Something drops from the roof of the way.',
  charge: 'Kothian knights on foot come picking through the dead of the last charge, finishing the wounded. They see you.',
  line: 'The Shemites throw down their bows and close with you, their spearmen first.',
  heap1: 'They come at you over the dead: Kothian knights and Ophirean, in a ring.',
  heap2: 'More of them, wave on wave. About your iron-clad feet grows a ring of mangled corpses.',
  barracks: 'Shukeli\'s death-squeal rings through the pits. Boots thunder in the barracks!',
  landing: 'One of Tsotha\'s black giants bars the stair, his long-shafted axe across his chest, and the guards close in around him.',
  dead_n: 'Something drops from the roof with a wet slap.',
  dead_s: 'Something drops from the roof with a wet slap.',
  weeper: 'The weeping changes to an abominable high-pitched tittering, and the quaking thing hitches itself toward you.',
  driven: 'Ahead of it, things come scrambling down the tunnel, mad with fear, and they will not let you by.',
  dark: 'In the black, something moves; many somethings. Their eyes are pin-pricks of red.',
  side: 'The things of the side tunnels come out at your light.',
};

function newFoes() {
  return LEVEL.entities.filter(e => FOES[e.class]).map(e => {
    const p = { x: e.at[0] * CELL, z: e.at[1] * CELL };
    return { id: e.id, cls: e.class, group: e.group, x: p.x, z: p.z, y: 0, homeX: p.x, homeZ: p.z, homeYaw: e.yaw || 0, yaw: e.yaw || 0,
      hp: FOES[e.class].hp, state: e.dormant !== undefined ? 'dormant' : e.lurk ? 'lurk' : 'idle', t: 0, walk: 0, vx: 0, vz: 0, alert: false, blockToggle: false, combo: 0, cool: 0,
      dead: false, deathT: 0, how: '', flash: 0, falling: 0, tx: 0, tz: 0, moving: false, lurk: !!e.lurk, delay: e.dormant || 0, vy: 0, sound: 0, hold: !!e.hold, territory: e.territory || FOES[e.class].territory || null };
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
  if (f.state === 'lurk' || f.state === 'dormant' || f.state === 'drop') return false;
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
  const hasGrille = !!LEVEL.links.find(l => l.name === 'grille_gate');
  for (const f of S.foes) {
    const st = FOES[f.cls];
    f.flash = Math.max(0, f.flash - DT); f.cool -= DT; f.t += DT;
    if (f.dead) {
      f.deathT += DT;
      if (f.falling) { f.vy = (f.vy || 0) - 24 * DT; f.y += f.vy * DT; }
      continue;
    }
    if (f.state === 'dormant') { if (f.wake !== undefined && S.tick >= f.wake) f.state = 'lurk'; continue; }
    if (f.state === 'lurk') {                           // clinging to the roof in the dark, waiting for something warm
      f.y = groundInfo(f.x, f.z).ceil - 0.05;
      const near = Math.hypot(S.x - f.x, S.z - f.z);
      if (near < 4.2 || (f.alert && near < 10) || f.wake !== undefined) { f.state = 'drop'; f.t = 0; f.vy = 0; Sfx.screech(clamp((f.x - S.x) / 12, -1, 1)); }
      continue;
    }
    if (f.state === 'drop') {
      f.vy -= 24 * DT; f.y += f.vy * DT;
      const fl = groundInfo(f.x, f.z).floor;
      if (f.y <= fl) { f.y = fl; f.state = 'chase'; f.t = 0; f.cool = 0.3; if (!f.alert) alertGroup(f.group); }
      continue;
    }
    if (st.invulnerable) {                              // the weeping thing: weeps, then titters when it sees you
      f.sound -= DT;
      const dd = Math.hypot(S.x - f.x, S.z - f.z);
      if (f.sound <= 0 && dd < 34) { f.sound = f.alert ? 1.6 : 3.2; (f.alert ? Sfx.titter : Sfx.weep)(clamp((f.x - S.x) / 15, -1, 1), clamp(1.2 - dd / 30, 0.1, 1)); }
    }
    // knockback, then fall if it carried them over a pit
    if (Math.abs(f.vx) + Math.abs(f.vz) > 0.01) {
      const r = collide(f.x + f.vx * DT, f.z + f.vz * DT, 0.42, f.y, f);
      f.x = r[0]; f.z = r[1]; f.vx *= Math.pow(0.02, DT); f.vz *= Math.pow(0.02, DT);
    }
    const g = groundInfo(f.x, f.z);
    if (g.kind === 2 && !st.invulnerable && g.floor < f.y - 3) { killFoe(f, 'fall'); f.falling = 1; f.vy = 0; continue; }
    f.y += (g.floor - f.y) * Math.min(1, DT * 12);
    const dx = S.x - f.x, dz = S.z - f.z, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz);
    if (!f.alert && !f.hold && mode === 'play' && foeSees(f)) alertGroup(f.group);
    f.moving = false;
    const turn = (rate) => { let a = want - f.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); f.yaw += clamp(a, -rate * DT, rate * DT); };
    const move = (tx, tz, spd) => {
      const ddx = tx - f.x, ddz = tz - f.z, dd = Math.hypot(ddx, ddz);
      if (dd < 0.05) return;
      const r = collide(f.x + ddx / dd * spd * DT, f.z + ddz / dd * spd * DT, st.invulnerable ? 1.0 : 0.42, f.y, f);
      if (f.territory && !f.territory.includes(roomIdAt(r[0], r[1]))) { f.state = 'home'; f.t = 0; return; }   // it will not leave its tunnels
      f.walk += Math.hypot(r[0] - f.x, r[1] - f.z); f.x = r[0]; f.z = r[1]; f.moving = true;
      let a = Math.atan2(ddx, ddz) - f.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); f.yaw += clamp(a, -8 * DT, 8 * DT);
    };
    const approach = (spd) => {
      if (d < 7 && los(f.x, f.y + 1.2, f.z, S.x, S.y + 1.2, S.z) && Math.abs(S.y - f.y) < 1.4) { move(S.x, S.z, spd); return; }
      const shut = hasGrille && S.grille.open < 0.8 && f.x > GRILLE_X && S.x < GRILLE_X;
      const step = flowStep(f, FLOW) || (shut ? flowStep(f, FLOW_BARS) : null);
      if (step) move(step[0], step[1], spd);
      else if (shut) move(GRILLE_X + 0.45, clamp(S.z, 13.2 * CELL, 14.8 * CELL), spd);          // press up against the bars nearest him
      else if (d < 20 && los(f.x, f.y + 1.2, f.z, S.x, S.y + 1.2, S.z)) move(S.x, S.z, spd);
    };
    switch (f.state) {
      case 'idle': f.yaw += Math.sin(S.tick * 0.01 + f.homeX) * 0.002; break;
      case 'home':                                      // back to its wallow, weeping again
        f.alert = false; S.alerted.delete(f.group);
        move(f.homeX, f.homeZ, st.speed * 0.6);
        if (Math.hypot(f.homeX - f.x, f.homeZ - f.z) < 0.8) f.state = 'idle';
        else if (f.t > 1.5 && foeSees(f) && f.territory && f.territory.includes(roomIdAt(S.x, S.z))) { f.state = 'chase'; f.alert = true; }
        break;
      case 'investigate':
        move(f.tx, f.tz, st.speed * 0.8);
        if (Math.hypot(f.tx - f.x, f.tz - f.z) < 0.6) { f.state = 'idle'; }
        break;
      case 'chase':
        if (mode !== 'play') break;
        if (f.territory && !f.territory.includes(roomIdAt(S.x, S.z))) { f.state = 'home'; f.t = 0; break; }
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
        turn(f.cls === 'axeman' ? 4.5 : f.cls === 'thing' ? 6 : 3.2);       // slow to track: strafing out of a telegraphed blow is fair
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
  if (st.leap) { f.vx += Math.sin(f.yaw) * st.leap; f.vz += Math.cos(f.yaw) * st.leap; }    // it springs
  const facing = (dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw)) / (d || 1);
  if (mode === 'play' && d <= st.reach + 0.35 && facing > 0.5 && Math.abs(S.y - f.y) < 1.8 && los(f.x, f.y + 1.3, f.z, S.x, S.y + 1.3, S.z)) {
    hurt(st.dmg, f.cls === 'spearman' ? 'spear' : f.cls === 'thing' ? 'claws' : f.cls === 'weeper' ? 'weeper' : f.cls === 'axeman' ? 'axe' : 'blade');
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
  const targets = S.foes.filter(f => !f.dead && f.state !== 'dormant' && f.state !== 'lurk' && inArc(f.x, f.z, f.y) >= 0).sort((a, b) => Math.hypot(a.x - S.x, a.z - S.z) - Math.hypot(b.x - S.x, b.z - S.z));
  for (const f of (spec.cleave || h.kick ? targets : targets.slice(0, 1))) { hitFoe(f, h.kick ? KICK.dmg : spec.dmg[h.n], h.kick); hit = true; }
  // the jailer through the bars, the serpent, the giant: the old interactions still hold
  const sh = S.shukeli;
  if (!h.kick && sh.state !== 'dead' && sh.state !== 'gone' && inArc(sh.x, sh.z, groundInfo(sh.x, sh.z).floor) >= 0) {
    if (h.w !== 'fists') killShukeli(); else { Sfx.miss(); log('You snatch at his robe through the bars. He squeals and tears free.', 'dim'); shukeliRetreat(); }
    hit = true;
  }
  const head = S.satha.pts && S.satha.active ? S.satha.pts[0] : null;
  if (!hit && head && head.y > -0.5 && Math.hypot(head.x - S.x, head.z - S.z) < spec.reach + 1.2) { Sfx.clank(); log(h.w === 'fists' || h.kick ? 'You might as well kick the mountain.' : 'Your blade skates off her scales like a stone off a tiled roof.', 'dim'); hit = true; }
  const g = S.giant;
  if (!hit && g.state !== 'crushed' && g.state !== 'wait' && g.state !== 'gone' && inArc(g.x, g.z, g.y) >= 0) { Sfx.stab(); log('You hammer at him. It is like striking an oak.', 'dim'); hit = true; }
  if (!hit) Sfx.miss();
}
function hitFoe(f, dmg, kick) {
  const st = FOES[f.cls], dx = S.x - f.x, dz = S.z - f.z, d = Math.hypot(dx, dz) || 1;
  const front = (dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw)) / d > 0.3;
  alertGroup(f.group);
  if (st.invulnerable) {                                 // man-made weapons do not harm it
    Sfx.squelch(); f.flash = 0.1;
    if (!S.hints.has('weeper')) { S.hints.add('weeper'); log('Your blade sinks into the quaking jelly and comes out clean. It titters. Nothing you carry can harm this thing. RUN.', 'bad'); }
    if (kick) { f.vx -= dx / d * 3; f.vz -= dz / d * 3; }
    return;
  }
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
  Sfx.hit(f.cls === 'thing', panOf(f)); punchView(0.02, 0);
  for (let k = 0; k < (kick ? 3 : 9); k++) particles.push({ m: 'blood', x: f.x + dx / d * 0.35, y: f.y + 1.2 + Math.random() * 0.4, z: f.z + dz / d * 0.35, vx: -dx / d * 2 + (Math.random() - 0.5) * 3, vy: Math.random() * 2.5, vz: -dz / d * 2 + (Math.random() - 0.5) * 3, life: 0.7, max: 0.7, g: 9, s: 1 });
  if (kick) { f.state = 'stagger'; f.t = 0; f.combo = 0; f.vx = -dx / d * KICK.push; f.vz = -dz / d * KICK.push; Sfx.kick(); }
  else {
    f.vx -= dx / d * 2.2; f.vz -= dz / d * 2.2;
    if (f.cls !== 'axeman' && dmg >= 40) { f.state = 'pain'; f.t = 0; f.combo = 0; Sfx.grunt(f.cls === 'thing', panOf(f)); }   // only a heavy blow breaks a wind-up
  }
  if (f.hp <= 0) killFoe(f, kick ? 'kick' : 'blade');
}
function panOf(f) { const dx = f.x - S.x, dz = f.z - S.z; return clamp(dx * Math.cos(S.yaw) - dz * Math.sin(S.yaw), -6, 6) / 6; }   // left/right of where you face
const DEATH_LINES = {
  blade: n => 'The ' + n + ' goes down and does not get up.',
  kick: n => 'Your heel caves in the ' + n + '\'s chest. He drops.',
  fall: n => 'The ' + n + ' goes over the lip of the well, screaming all the way down.',
  crush: n => 'Satha rolls over the ' + n + ' without slowing. There is not much left.',
};
function killFoe(f, how) {
  if (f.dead) return;
  f.dead = true; f.state = 'dead'; f.deathT = 0; f.how = how; f.hp = 0; S.kills++;
  Sfx.death(f.cls === 'thing', panOf(f)); if (how === 'fall') Sfx.scream();
  log(DEATH_LINES[how](FOES[f.cls].name), 'good');
  if (how === 'fall') return;
  fitDeath(f);
  // his weapon leaves his hand: a pickup if you can use it, otherwise it lies broken beside him
  const c = CAST[f.cls], w = c.weapon, tip = deathPoint(f, 0.9), side = deathPoint(f, 0.5, 0.9), far = deathPoint(f, 1.15, -0.7);
  const drop = (kind, name) => S.items.push({ id: 'drop_' + f.id, kind, name, x: side[0], z: side[1], y: groundInfo(side[0], side[1]).floor, taken: false });
  const free = k => !S.items.some(i => i.kind === k && !i.taken);
  f.debris = [];
  const deb = (m, p, k, s = 1) => f.debris.push({ m, x: p[0], z: p[1], yaw: f.dieYaw + k, s });
  if (w === 'sword' && !S.weapons.sword && free('sword')) drop('sword', 'Kothian sword');
  else if (w === 'spear' && LEVEL.links.some(l => l.name === 'portcullis') && !S.flags.has_spear && !S.flags.portcullis_open && free('spear')) drop('spear', 'spear');
  else if (w === 'sword') { deb('broken:sword_hilt', side, 1.1); deb('broken:sword_tip', far, 2.3); }
  else if (w === 'spear') { deb('broken:spear_butt', side, 0.4); deb('broken:spear_head', far, 1.9); }
  else if (w === 'axe') { deb('broken:axe_head', side, 0.8); deb('broken:axe_haft', far, 2.6); }
  else if (w === 'bow') deb('broken:bow', side, 0.6);
  if (c.shield) { deb('broken:shield_half', tip, 0.5); deb('broken:shield_half', deathPoint(f, 0.6, -1.1), 3.4); }
}
// ---- falling well: a body must land on open floor, not through a wall ------------
// The body lies along a direction from the feet. Try his natural fall first (back if kicked,
// otherwise by a per-man hash), then sweep round; if nothing fits he slumps where he stands.
function fitDeath(f) {
  const c = CAST[f.cls], L = 1.95 * c.scale, h = k => hrand(Math.round(f.homeX * 10), Math.round(f.homeZ * 10), k, 77);
  const base = f.y, sPref = f.how === 'kick' ? -1 : (h(1) < 0.55 ? -1 : 1);
  const clear = A => {
    const dx = Math.sin(A), dz = Math.cos(A), px = -dz, pz = dx;
    for (let t = 0.25; t <= L + 0.15; t += 0.3) for (const w of [-0.4, 0, 0.4]) {
      const x = f.x + dx * t + px * w, z = f.z + dz * t + pz * w, g = groundInfo(x, z);
      if (g.kind !== 1 || (g.flags & F_NOPASS) || Math.abs(g.floor - base) > 0.45) return false;
      if (LV.colliders.some(cl => Math.hypot(cl.x - x, cl.z - z) < cl.r + 0.15)) return false;
    }
    return true;
  };
  const offs = [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8, 2.3, -2.3, Math.PI];
  for (const s of [sPref, -sPref]) for (const o of offs) {
    const A = f.yaw + (s < 0 ? Math.PI : 0) + o;       // the direction the body will lie along
    if (clear(A)) { f.dieS = s; f.dieYaw = A - (s < 0 ? Math.PI : 0); f.slump = false; return; }
  }
  f.dieS = -1; f.dieYaw = f.yaw; f.slump = true;
}
// a point along (t, in body lengths) and beside (w, metres) where the body will lie
function deathPoint(f, t, w = 0) {
  const L = 1.9 * CAST[f.cls].scale, A = f.dieYaw + (f.dieS < 0 ? Math.PI : 0), dx = Math.sin(A), dz = Math.cos(A);
  return [f.x + dx * L * t - dz * w, f.z + dz * L * t + dx * w];
}
// The collapse: the knees go, then he topples and settles, each man differently.
function deathPose(f, P) {
  const t = f.deathT, h = k => hrand(Math.round(f.homeX * 10), Math.round(f.homeZ * 10), k, 91);
  const buckle = smoothstep(0, 0.28, t), fall = Math.pow(smoothstep(0.18, 0.72, t), 1.6);
  const settle = t > 0.72 ? Math.exp(-(t - 0.72) * 9) * Math.sin((t - 0.72) * 26) * 0.07 : 0;
  const kneel = buckle * (1 - fall);
  if (f.slump) {                                        // cornered: he slides down the wall and sits
    const k = smoothstep(0, 0.6, t);
    return Object.assign(P, { drop: -0.52 * k, lean: -0.35 * k, txL: -1.45 * k, txR: -1.3 * k, sxL: 1.6 * k, sxR: 1.5 * k, tzL: 0.15 * k, tzR: 0.25 * k,
      uzL: 0.5 * k, uzR: 0.6 * k, uxL: 0.3 * k, uxR: 0.1 * k, fxL: -0.4, fxR: -0.6, headX: 0.7 * k, headY: (h(2) - 0.5) * 0.8 * k, unarmed: true, noShield: true });
  }
  const sp = f.dieS;
  // limbs relax toward the floor: on his back the knees fall up and out, face down the legs trail straight
  const back = sp < 0;
  const fin = { uzL: 0.3 + h(3) * 1.1, uzR: 0.3 + h(4) * 1.1,
    uxL: back ? -0.35 + h(5) * 0.5 : -0.2 + h(5) * 0.45, uxR: back ? -0.35 + h(6) * 0.5 : -0.2 + h(6) * 0.45, fxL: -0.15 - h(7) * 0.9, fxR: -0.15 - h(8) * 0.9,
    txL: back ? -0.15 - h(9) * 0.35 : 0.05 + h(9) * 0.15, txR: back ? -h(10) * 0.2 : h(10) * 0.12,
    sxL: back ? 0.15 + h(11) * 0.55 : h(11) * 0.35, sxR: back ? h(12) * 0.3 : h(12) * 0.2,
    tzL: 0.08 + h(13) * 0.3, tzR: 0.08 + h(14) * 0.25, headY: (h(15) - 0.5) * 1.5, headX: back ? -0.25 : 0.2 };
  for (const k in fin) P[k] = lerp(P[k] || 0, fin[k], fall);
  P.sxL += 1.3 * kneel; P.sxR += 1.3 * kneel; P.txL -= 0.8 * kneel; P.txR -= 0.8 * kneel;    // knees buckle
  P.lean = 0.45 * kneel + (sp > 0 ? 0.1 : -0.1) * fall; P.headX = (P.headX || 0) + 0.5 * kneel;
  P.pitch = sp * (1.52 * fall + settle); P.roll = (h(16) - 0.5) * 0.6 * fall;
  P.drop = -0.32 * kneel + (back ? 0.12 : 0.1) * fall;                  // down onto the knees, then lying on the floor, not in it
  P.unarmed = true; P.noShield = true;
  return P;
}
function punchView(p, y) { punchPitch += p; punchYaw += y; }

// ---- drawing the foes ---------------------------------------------------------
function foePose(f) {
  const st = FOES[f.cls], P = poseIdle({}, gameTime + f.homeX), c = CAST[f.cls];
  if (f.cls === 'thing') {
    if (f.dead) {                                     // rolls over, limbs curling up like a dead spider's
      const k = smoothstep(0, 0.5, f.deathT), sd = hrand(Math.round(f.homeX * 10), 3, 5, 5) < 0.5 ? -1 : 1;
      return Object.assign(poseCrawl(P, 0, 0, gameTime), { roll: sd * 2.6 * k, drop: -0.42 + 0.3 * k, uxL: 0.55 - 1.6 * k, uxR: 0.55 - 1.4 * k, fxL: -0.35 - 1.2 * k, fxR: -0.35 - 1.0 * k, sxL: 1.55 + 0.4 * k, sxR: 1.55 + 0.3 * k, headX: -1 + 0.8 * k });
    }
    poseCrawl(P, f.walk * 3.2, f.moving ? 1 : 0.15, gameTime + f.homeX);
    if (f.state === 'lurk' || f.state === 'drop') { P.pitch = Math.PI; P.drop = 0.42; }   // hanging from the roof
    if (f.state === 'windup') Object.assign(P, { lean: 0.55, headX: -0.4, uxL: -1.6, uxR: -1.6, fxL: -0.9, fxR: -0.9, drop: -0.2 });   // rears up
    if (f.state === 'strike') Object.assign(P, { lean: 1.0, uxL: -1.2, uxR: -1.2, fxL: -0.1, fxR: -0.1 });
    if (f.state === 'stagger' || f.state === 'pain') Object.assign(P, { roll: 0.5, headX: -0.4 });
    return P;
  }
  if (c.weapon !== 'bow') poseMenace(P, gameTime + f.homeX);
  if (c.shield) { P.uxL = -0.35; P.fxL = -1.25; P.uzL = 0.25; }
  if (c.weapon === 'spear' || c.weapon === 'axe') { P.uxR = -0.25; P.fxR = -1.2; P.we = 1.25; if (c.weapon === 'axe') { P.uxL = -0.6; P.fxL = -1.3; } }
  else if (c.weapon === 'sword') { P.uxR = -0.25; P.fxR = -0.9; P.we = 0.45; }
  else if (c.weapon === 'bow') { P.uxL = -0.2; P.fxL = -0.6; }
  if (f.dead) {
    if (f.falling) return Object.assign(P, { uzL: 1.4, uzR: 1.4, uxL: -2, uxR: -2.4, txL: -0.6, sxL: 0.8, unarmed: true });   // flailing down the well
    return deathPose(f, P);
  }
  if (f.moving) poseWalk(P, f.walk * 2.6, Math.min(1, 1), !c.shield && c.weapon !== 'spear');
  const t = f.t;
  switch (f.state) {
    case 'windup': {
      const k = smoothstep(0, st.windup, t);
      if (c.weapon === 'axe') Object.assign(P, { uxR: lerp(P.uxR, -2.8, k), uxL: lerp(P.uxL, -2.6, k), fxR: -0.6, fxL: -0.6, lean: -0.15 * k, headX: 0.2 * k, we: lerp(1.25, 2.6, k) });
      else if (c.weapon === 'sword') Object.assign(P, { uxR: lerp(P.uxR, -2.6, k), uzR: 0.4 * k, fxR: lerp(P.fxR, -1.3, k), twist: -0.45 * k, lean: -0.08 * k, we: lerp(0.45, 2.3, k) });
      else if (c.weapon === 'spear') Object.assign(P, { uxR: lerp(P.uxR, 0.35, k), fxR: lerp(-1.2, -1.9, k), twist: -0.35 * k, lean: -0.1 * k, we: lerp(1.25, 0.05, k) });
      else if (c.weapon === 'bow') Object.assign(P, { uxL: -1.5, uyL: 0.1, fxL: -0.05, uxR: -1.45, uzR: 0.35 * k, fxR: lerp(-0.5, -2.3, k), twist: 0.35, headY: -0.2 });
      break;
    }
    case 'strike': {
      const k = smoothstep(0, st.strike, t);
      if (c.weapon === 'axe') Object.assign(P, { uxR: lerp(-2.8, -0.7, k), uxL: lerp(-2.6, -0.6, k), fxR: -0.3, fxL: -0.3, lean: lerp(-0.15, 0.45, k), we: lerp(2.6, -0.6, k) });
      else if (c.weapon === 'sword') Object.assign(P, { uxR: lerp(-2.6, -0.5, k), uzR: 0.4 - 0.5 * k, fxR: lerp(-1.3, -0.15, k), twist: lerp(-0.45, 0.5, k), lean: lerp(-0.08, 0.28, k), we: lerp(2.3, -0.5, k) });
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
    if (f.state === 'dormant' || (f.dead && f.falling && f.y < -12)) continue;
    if (f.cls === 'weeper') { drawWeeper(f); continue; }
    const l = sampleLight(f.x, f.y + 1.4, f.z);
    const yaw = f.dead && f.dieYaw !== undefined && f.cls !== 'thing' ? f.dieYaw : f.yaw;
    const cid = f.cls === 'thing' ? ['thing', 'thing_b', 'thing_c'][Math.floor(hrand(Math.round(f.homeX * 10), Math.round(f.homeZ * 10), 7, 1) * 3)] : f.cls;   // each malformed its own way
    drawCharacter(cid, f.x, f.y, f.z, yaw, foePose(f), l, f.flash > 0 ? 0.55 : 0);
    if (f.debris) for (const d of f.debris) {               // the weapon falls from his hand, and lies broken
      const k = smoothstep(0, 0.45, f.deathT), fl = groundInfo(d.x, d.z).floor;
      const x = lerp(f.x, d.x, k), z = lerp(f.z, d.z, k), y = lerp(f.y + 1.1, fl + 0.03, k * k);
      drawM(d.m, m4trs(x, y, z, d.yaw + (1 - k) * 4, Math.PI / 2 * k, (1 - k) * 2, d.s), sampleLight(x, y + 0.5, z));
    }
  }
}
