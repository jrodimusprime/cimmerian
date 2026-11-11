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
  spear: { name: 'spear', dmg: [34, 34, 40], period: 0.55, reach: 3.5, arc: 0.3, hitAt: 0.22 },   // thrust; or throw it (G). It breaks after 5 uses
};
const SPEAR_USES = 5, SPEAR_THROW_DMG = 60, SPEAR_CARRY = 10;   // a spear breaks after 5 blows; you can carry 10 (one in hand, nine on your back)
// parry (right-click or F): a short window that turns a blow aside and staggers the man who struck it
const PARRY = { window: 0.32, cool: 0.55, stagger: 1.0 };
const WEAPON_ORDER = ['fists', 'dagger', 'sword', 'spear'];
const KICK = { dmg: 6, period: 0.62, reach: 2.4, arc: 0.4, hitAt: 0.16, push: 11, stagger: 1.15 };
// The cast is the book's (README §1: canon cast only). Each entry cites where Howard puts them.
const FOES = {
  // "the Kothian guards looked on stolidly" (ch. II); Strabonus's Kothian spearmen and Shemitish archers (ch. I, V)
  warden: { hp: 70, speed: 3.3, reach: 2.4, dmg: 13, windup: 0.5, strike: 0.22, recover: 0.6, block: 'alternate', sight: 17, name: 'Kothian guard' },
  spearman: { hp: 55, speed: 3.1, reach: 3.3, dmg: 15, windup: 0.62, strike: 0.22, recover: 0.75, sight: 17, name: 'Kothian spearman', spears: 3, throwAt: [6, 15] },
  archer: { hp: 40, speed: 3.6, reach: 0, dmg: 12, windup: 0.85, strike: 0.15, recover: 1.0, ranged: true, keep: [7, 15], sight: 24, name: 'Shemite archer' },
  // ch. I: "dark-faced Kothian knights", "Ophirean knights in gilded mail"
  kknight: { hp: 80, speed: 3.4, reach: 2.5, dmg: 14, windup: 0.5, strike: 0.22, recover: 0.55, block: 'alternate', sight: 20, name: 'Kothian knight' },
  oknight: { hp: 75, speed: 3.6, reach: 2.5, dmg: 13, windup: 0.45, strike: 0.2, recover: 0.5, block: 'alternate', sight: 20, name: 'Ophirean knight' },
  // "the black giants who guarded him ... grasping their long-shafted axes" (ch. II): Tsotha's own guard
  axeman: { hp: 320, speed: 3.3, reach: 2.8, dmg: 32, windup: 0.75, strike: 0.3, recover: 0.9, pain: 0.5, lunge: 0.8, block: 'front', sight: 20, name: 'black axeman' },   // few, and each one a killer: twice the blood in him, and his blow takes a third of yours
  // "monsters with dripping jaws agape"; "something whimpered in fear and slunk away in the darkness" (ch. III-IV)
  thing: { hp: 48, speed: 4.6, reach: 1.9, dmg: 18, windup: 0.42, strike: 0.25, recover: 0.55, sight: 15, leap: 6, name: 'pit-thing' },
  // the weeping thing (ch. III): Conan fled it, "doubting the power of man-made weapons to harm it"
  // ---- e1m4-e1m8 ----
  // Yothga (ch. III): rooted; "the long tendrils arched toward him"; cut through the stem
  yothga: { hp: 560, speed: 0, reach: 4.2, dmg: 22, windup: 0.75, strike: 0.3, recover: 0.8, sight: 9, name: 'Yothga', boss: true, rooted: true },
  // Tamar (ch. IV): "the swaggering Pellian soldiery", the archers on the tower, Arpello
  pellian: { hp: 60, speed: 3.3, reach: 3.2, dmg: 14, windup: 0.6, strike: 0.22, recover: 0.7, block: 'alternate', sight: 18, name: 'Pellian man-at-arms', spears: 3, throwAt: [6, 14] },
  pellian_archer: { hp: 40, speed: 3.6, reach: 0, dmg: 12, windup: 0.85, strike: 0.15, recover: 1.0, ranged: true, keep: [7, 16], sight: 26, name: 'Pellian archer' },
  arpello: { hp: 230, speed: 4.0, reach: 2.7, dmg: 18, windup: 0.5, strike: 0.22, recover: 0.5, block: 'alternate', sight: 24, name: 'Arpello of Pellia', boss: true },
  // Shamar (ch. V): Strabonus among his palace troops, "his axe ... clanged on Conan's helmet"
  strabonus: { hp: 320, speed: 3.6, reach: 2.9, dmg: 22, windup: 0.62, strike: 0.26, recover: 0.6, block: 'front', sight: 24, name: 'Strabonus of Koth', boss: true },
  // the Tybor (ch. V): Tsotha at bay, throwing the globes of fire
  tsotha: { hp: 280, speed: 3.4, reach: 0, dmg: 0, windup: 0.9, strike: 0.2, recover: 1.1, ranged: true, globe: true, keep: [5, 13], sight: 30, name: 'Tsotha-lanti', boss: true },
  weeper: { hp: 1e9, speed: 2.7, reach: 1.9, dmg: 30, windup: 0.65, strike: 0.3, recover: 0.6, sight: 16, name: 'weeping thing', invulnerable: true, territory: null, leap: 9 },   // it rears, then its whole bulk lurches forward with the blow
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
      squad: !!(LEVEL.squads && LEVEL.squads.includes(e.group)), hp: FOES[e.class].hp, state: e.dormant !== undefined ? 'dormant' : e.lurk ? 'lurk' : 'idle', t: 0, walk: 0, vx: 0, vz: 0, alert: false, blockToggle: false, combo: 0, cool: 0,
      dead: false, deathT: 0, how: '', flash: 0, falling: 0, tx: 0, tz: 0, moving: false, lurk: !!e.lurk, delay: e.dormant || 0, vy: 0, sound: 0, hold: !!e.hold, post: !!e.post, territory: e.territory || FOES[e.class].territory || null, asleep: !!e.asleep, boss: !!FOES[e.class].boss };
  });
}

// ---- pathing: a flow field over the grid from the player's cell ------------
let FLOW = null, FLOW_BARS = null;
function walkableFor(idx) {
  return idx >= 0 && (LV.kind[idx] === 1 || (LV.kind[idx] === 2 && !LV.deep[idx])) && !(LV.flags[idx] & F_NOPASS) && !(LV.blockers.has(idx) && linkClosed(idx));   // a shallow dip is ground; a deep pit or a stake-pit is not
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
      if (f.falling) { f.vy = (f.vy || 0) - 24 * DT; f.y += f.vy * DT; if (f.fallTo !== undefined && f.y < f.fallTo) { f.y = f.fallTo; f.falling = 0; f.vy = 0; } }
      continue;
    }
    if (f.state === 'dormant') { if (f.wake !== undefined && S.tick >= f.wake) f.state = 'lurk'; continue; }
    if (f.state === 'sleep') continue;
    if (f.cls === 'yothga') yothgaHate(f);
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
    if (st.rooted) { f.vx = 0; f.vz = 0; }              // rooted in the stone: no blow shifts it
    if (Math.abs(f.vx) + Math.abs(f.vz) > 0.01) {
      const r = collide(f.x + f.vx * DT, f.z + f.vz * DT, 0.42, f.y, f, true);
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
    if (f.post && f.state !== 'rout' && LEVEL.postBreak && S.flags[LEVEL.postBreak]) { f.state = 'rout'; f.t = 0; }   // the host breaks: every post is abandoned
    if (st.meek && ['chase', 'windup', 'strike', 'recover', 'block', 'investigate', 'home'].includes(f.state)) { f.state = 'meek'; f.t = 0; }   // roused, a non-combatant runs
    switch (f.state) {
      case 'idle': f.yaw += Math.sin(S.tick * 0.01 + f.homeX) * 0.002;
        if (st.invulnerable && !f.hold && S.flags.found_it && f.territory && f.territory.includes(roomIdAt(S.x, S.z))) { f.state = 'chase'; f.alert = true; }   // the weeping thing hunts you down its tunnels by ear
        break;
      case 'home':                                      // back to its wallow, weeping again
        f.alert = false; S.alerted.delete(f.group);
        move(f.homeX, f.homeZ, st.speed * 0.6);
        if (Math.hypot(f.homeX - f.x, f.homeZ - f.z) < 0.8) f.state = 'idle';
        else if (f.t > 1.5 && (foeSees(f) || (st.invulnerable && S.flags.found_it)) && f.territory && f.territory.includes(roomIdAt(S.x, S.z))) { f.state = 'chase'; f.alert = true; }
        break;
      case 'cower':                                     // backs off from the flame, hissing, then comes again
        move(f.x - dx / (d || 1) * 3, f.z - dz / (d || 1) * 3, st.speed * 0.75); turn(10);
        if (f.t >= 0.9) { f.state = 'chase'; f.t = 0; f.cool = 0.5; }
        break;
      case 'meek': {                                    // away from you; cornered, he cowers with his arms over his head
        const ox = f.x, oz = f.z;
        if (d < 9) move(f.x - dx / (d || 1) * 4, f.z - dz / (d || 1) * 4, st.speed * 1.1);
        f.cower = d < 9 && Math.hypot(f.x - ox, f.z - oz) < st.speed * DT * 0.25;
        if (f.cower) f.yaw = Math.atan2(dx, dz);
        break;
      }
      case 'flee':                                      // slinks away into the dark, then the hunger brings it back
        move(f.x - dx / (d || 1) * 4, f.z - dz / (d || 1) * 4, st.speed * 1.05);
        if (f.t >= 2.6) { f.state = 'chase'; f.t = 0; f.cool = 0.4; }
        break;
      case 'investigate':
        move(f.tx, f.tz, st.speed * 0.8);
        if (Math.hypot(f.tx - f.x, f.tz - f.z) < 0.6) { f.state = 'idle'; }
        break;
      case 'post':                                      // a man holding a post: back to it, and there he stands, facing out
        if (LEVEL.postBreak && S.flags[LEVEL.postBreak]) { f.state = 'rout'; f.t = 0; break; }
        if (Math.hypot(f.homeX - f.x, f.homeZ - f.z) > 0.35) move(f.homeX, f.homeZ, st.speed * 0.8);
        else { let a = f.homeYaw - f.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); f.yaw += clamp(a, -4 * DT, 4 * DT); }
        if (mode === 'play' && Math.hypot(S.x - f.homeX, S.z - f.homeZ) < POST_R) { f.state = 'chase'; f.t = 0; }
        break;
      case 'rout':                                      // the host breaks: he throws down his post and runs for the river
      { const to = f.routTo || LEVEL.routTo;
        move(f.x + (to[0] * CELL - f.x), f.z + (to[1] * CELL - f.z), st.speed * 1.2);
        if (Math.hypot(to[0] * CELL - f.x, to[1] * CELL - f.z) < 1.5) { f.dead = true; f.gone = true; f.hp = 0; } }
        break;
      case 'chase':
        if (mode !== 'play') break;
        if (f.post && (Math.hypot(S.x - f.homeX, S.z - f.homeZ) > POST_R + 1.5 || (LEVEL.postBreak && S.flags[LEVEL.postBreak]))) { f.state = 'post'; f.t = 0; break; }   // he won't be drawn off his post
        if (f.territory && !f.territory.includes(roomIdAt(S.x, S.z))) { f.state = 'home'; f.t = 0; break; }
        if (f.cls === 'thing') {                         // things of the dark: "something whimpered in fear and slunk away in the darkness"
          if (!f.fled && f.hp < st.hp * 0.4) { f.state = 'flee'; f.t = 0; f.fled = true; Sfx.grunt(true, clamp(-dx / 15, -1, 1)); break; }   // badly hurt, it slinks off, and comes back
          const faced = (-Math.sin(S.yaw) * -dx - Math.cos(S.yaw) * -dz) / (d || 1);
          if (torchLit() && d < 3.4 && faced > 0.75 && S.tick >= (f.cowerAt || 0) && S.rng.next() < 0.03) { f.state = 'cower'; f.t = 0; f.cowerAt = S.tick + Math.round(3.5 * SIM_HZ); break; }   // the torch thrust in its face: it shies off
        }
        if (st.ranged) {
          const see = los(f.x, f.y + 1.6, f.z, S.x, S.y + 1.4, S.z);
          if (d < st.keep[0]) { const bx = f.x - dx / d * 2, bz = f.z - dz / d * 2; move(bx, bz, st.speed); turn(10); }
          else if (!see || d > st.keep[1]) approach(st.speed);
          else { turn(8); if (f.cool <= 0) { f.state = 'windup'; f.t = 0; Sfx.bowdraw(); } }
        } else if (st.spears && (f.spears === undefined ? st.spears : f.spears) > 1 && d > st.throwAt[0] && d < st.throwAt[1] && f.cool <= 0 && los(f.x, f.y + 1.6, f.z, S.x, S.y + 1.4, S.z)) {
          turn(8); f.state = 'windup'; f.t = 0; f.throwing = true; Sfx.ready(clamp(-dx / 15, -1, 1));   // he keeps his last spear in hand
        } else if (f.squad && squadChase(f, st, d, dx, dz, move, turn, approach)) {
          /* the squad moved him */
        } else if (d <= foeReach(f) * 0.92 && Math.abs(S.y - f.y) < 1.6) {
          turn(8);
          if (f.cool <= 0) { f.state = 'windup'; f.t = 0; f.throwing = false; Sfx.ready(clamp(-dx / 15, -1, 1)); }
        } else approach(st.speed);
        // separation from friends
        for (const o of S.foes) if (o !== f && !o.dead) { const ox = f.x - o.x, oz = f.z - o.z, od = Math.hypot(ox, oz); if (od < 0.9 && od > 1e-4) { f.x += ox / od * (0.9 - od) * 0.5; f.z += oz / od * (0.9 - od) * 0.5; } }
        break;
      case 'windup':
        turn(f.cls === 'axeman' ? 4.5 : f.cls === 'thing' ? 6 : f.cls === 'weeper' ? 0.8 : 3.2);       // slow to track: strafing out of a telegraphed blow is fair
        if (f.t >= st.windup * (f.combo ? 0.6 : 1)) { f.state = 'strike'; f.t = 0; foeStrike(f, st); }
        break;
      case 'strike':
        if (st.lunge && f.t < st.strike) {                // he throws his whole body after the axe
          const d = st.lunge * DT / st.strike, r = collide(f.x + Math.sin(f.yaw) * d, f.z + Math.cos(f.yaw) * d, 0.42, f.y, f, false);
          if (Math.hypot(r[0] - S.x, r[1] - S.z) > 0.9) { f.x = r[0]; f.z = r[1]; }
        }
        if (f.t >= st.strike) {
          if (st.combo && f.combo < st.combo - 1) { f.combo++; f.state = 'windup'; f.t = 0; }
          else { f.combo = 0; f.state = 'recover'; f.t = 0; }
        }
        break;
      case 'recover': if (f.t >= st.recover) { f.state = 'chase'; f.t = 0; f.cool = 0.25 + S.rng.next() * 0.5; } break;
      case 'block': if (f.t >= 0.32) { f.state = 'chase'; f.t = 0; } break;
      case 'pain': if (f.t >= (st.pain || 0.34)) { f.state = 'chase'; f.t = 0; f.cool = 0.2; } break;
      case 'stagger': if (f.t >= KICK.stagger) { f.state = 'chase'; f.t = 0; f.cool = 0.3; } break;
    }
  }
}
// a spearman with spears to spare throws one; with none left he fights with his sword
function foeReach(f) { return f.sidearm ? 2.6 : FOES[f.cls].reach; }
function foeStrike(f, st) {
  const dx = S.x - f.x, dz = S.z - f.z, d = Math.hypot(dx, dz);
  if (f.throwing) {
    f.throwing = false; f.spears = (f.spears === undefined ? st.spears : f.spears) - 1;
    const ox = f.x + Math.sin(f.yaw) * 0.5, oy = f.y + 1.6, oz = f.z + Math.cos(f.yaw) * 0.5;
    const lead = d / 20, tx = S.x + S.vx * lead + (S.rng.next() - 0.5) * 0.6, tz = S.z + S.vz * lead + (S.rng.next() - 0.5) * 0.6, ty = S.y + 1.2;
    const dd = Math.hypot(tx - ox, ty - oy, tz - oz) || 1;
    S.proj.push({ type: 'jav', x: ox, y: oy, z: oz, vx: (tx - ox) / dd * 20, vy: (ty - oy) / dd * 20 + 1.2, vz: (tz - oz) / dd * 20, life: 3, spin: 0, from: f.id, foe: true, uses: 0 });
    Sfx.swing(); f.cool = 1.2;
    if (f.spears <= 0) f.sidearm = true;
    return;
  }
  if (st.globe) {                                       // Tsotha: a globe of fire, lobbed
    const ox = f.x + Math.sin(f.yaw) * 0.6, oy = f.y + 1.6, oz = f.z + Math.cos(f.yaw) * 0.6, T_ = Math.max(0.6, d / 11);
    S.proj.push({ type: 'globe', x: ox, y: oy, z: oz, vx: (S.x + S.vx * T_ * 0.5 - ox) / T_, vy: (S.y + 0.5 - oy) / T_ + 4.9 * T_, vz: (S.z + S.vz * T_ * 0.5 - oz) / T_, life: 4, spin: 0, g: 9.8, from: f.id });
    Sfx.whoosh(); return;
  }
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
    const fwdX = -Math.sin(S.yaw), fwdZ = -Math.cos(S.yaw), toward = (-dx * fwdX - dz * fwdZ) / (d || 1);
    if (S.parryT > 0 && toward > 0.3 && !st.invulnerable) {   // turned aside: steel rings, he reels
      S.parryT = 0; f.state = 'stagger'; f.t = -PARRY.stagger + (FOES[f.cls].recover || 0.5); f.combo = 0;
      f.vx -= dx / (d || 1) * 6; f.vz -= dz / (d || 1) * 6; Sfx.clang(); punchView(-0.04, 0.03);
      for (let k = 0; k < 8; k++) particles.push({ m: 'spark', x: S.x + fwdX * 0.9, y: S.y + 1.4, z: S.z + fwdZ * 0.9, vx: (Math.random() - 0.5) * 5, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 5, life: 0.35, max: 0.35, g: 9, s: 0.5 });
      if (!S.hints.has('parried')) { S.hints.add('parried'); log('You turn the blow aside, and he reels. Strike now!', 'good'); }
      return;
    }
    const inDark = f.cls === 'thing' && LEVEL.torch && !torchLit();   // the dark is theirs: they strike harder where you can't see them coming
    hurt(Math.round((f.sidearm ? 13 : st.dmg) * (inDark ? 1.25 : 1)), f.cls === 'spearman' && !f.sidearm ? 'spear' : f.cls === 'thing' ? 'claws' : f.cls === 'weeper' ? 'weeper' : f.cls === 'axeman' ? 'axe' : 'blade');
    if (f.cls === 'thing' && mode === 'play') S.bleed = BLEED_SECS;   // and it bleeds
    if (f.cls === 'thing' && mode === 'play') {          // the bite of a thing of the pits: the world swims, the legs go weak, for ten seconds
      if (!(S.daze > 0) && !S.hints.has('daze')) { S.hints.add('daze'); log('Its teeth meet in your arm, and something in the bite makes the dark swim. Your legs go to water: you could not make a jump like this. It will pass.', 'bad'); }
      S.daze = DAZE_SECS;
    }
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
  if (h.w === 'spear') { S.spearUses++; if (S.spearUses >= SPEAR_USES) { Sfx.snapWood(); log('The spear\'s haft splits in your hands. You cast it aside' + (S.spears.length ? ' and pull another from your back.' : '.'), 'warn'); nextSpear(); } }
  const spec = h.kick ? KICK : WEAPONS[h.w], fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
  const inArc = (x, z, y) => {
    const dx = x - S.x, dz = z - S.z, d = Math.hypot(dx, dz);
    return d < spec.reach && (d < 0.8 || (dx * fx + dz * fz) / d > spec.arc) && Math.abs(y - S.y) < 2 && los(S.x, S.y + 1.3, S.z, x, y + 1.2, z) ? d : -1;
  };
  let hit = false;
  const targets = S.foes.filter(f => !f.dead && !FOES[f.cls].meek && f.state !== 'dormant' && f.state !== 'lurk' && inArc(f.x, f.z, f.y) >= 0).sort((a, b) => Math.hypot(a.x - S.x, a.z - S.z) - Math.hypot(b.x - S.x, b.z - S.z));
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
  if (!hit && !giantTaken() && g.state !== 'wait' && inArc(g.x, g.z, g.y) >= 0) { Sfx.stab(); log('You hammer at him. It is like striking an oak.', 'dim'); hit = true; }
  if (!hit) Sfx.miss();
}
// "he felt its hate emanate from it in almost tangible waves": once roused, Yothga sends a ring of livid light rolling out over
// the floor every few seconds. Jump it as it passes, or it sears you. (S.hate holds the rings; drawn in drawFoes.)
const HATE_EVERY = 3.0, HATE_SPEED = 4.2, HATE_MAX = 9;
const YOTHGA_CYCLE = 6.5, YOTHGA_OPEN = 4.5;   // its blossoms: shut for 4.5 s, then open for 2 s
function yothgaHate(f) {
  S.hate = S.hate || [];
  for (const w of S.hate) {
    const r0 = w.r; w.r += HATE_SPEED * DT;
    const d = Math.hypot(S.x - w.x, S.z - w.z);
    if (!w.hit && r0 < d && w.r >= d && mode === 'play' && S.y - groundInfo(S.x, S.z).floor < 0.3) { w.hit = true; hurt(9, 'hate'); punchView(0.05, 0.05); }
  }
  S.hate = S.hate.filter(w => w.r < HATE_MAX);
  if (!f.alert || Math.hypot(S.x - f.x, S.z - f.z) > 11) { f.open = false; return; }
  // its blossoms: shut, the stem is a knot of fibre a blade barely bites; they spread, spit seed-heads at you, and
  // stand open a while, the throat of the thing bared: that is the time to cut
  f.bT = (f.bT || 0) + DT;
  const ph = f.bT % YOTHGA_CYCLE, wasOpen = f.open;
  f.open = ph >= YOTHGA_OPEN;
  f.opening = clamp((ph - (YOTHGA_OPEN - 0.6)) / 0.6, 0, 1);
  if (f.open && !wasOpen) {
    Sfx.hate(clamp((f.x - S.x) / 15, -1, 1));
    const dx = S.x - f.x, dz = S.z - f.z, d = Math.hypot(dx, dz) || 1, T = clamp(d / 7, 0.55, 1.3);
    for (const sp of [-0.32, 0, 0.32]) {                 // three, fanned, lobbed where you'll be
      const tx = S.x + S.vx * T * 0.6 + Math.cos(Math.atan2(dz, dx) + Math.PI / 2) * sp * d, tz = S.z + S.vz * T * 0.6 + Math.sin(Math.atan2(dz, dx) + Math.PI / 2) * sp * d;
      const oy = f.y + 2.4, ty = groundInfo(tx, tz).floor;
      S.proj.push({ type: 'seed', x: f.x, y: oy, z: f.z, vx: (tx - f.x) / T, vy: (ty - oy + 0.5 * 9.8 * T * T) / T, vz: (tz - f.z) / T, life: 4, spin: 0, g: 9.8, from: f.id });
    }
    if (!S.hints.has('bloom')) { S.hints.add('bloom'); log('The livid blossoms spread wide and spit seed-heads at you. Under them the throat of the thing is bared: cut now!', 'warn'); }
  }
  if (f.open) for (let k = 0; k < 2; k++) particles.push({ m: 'blood', x: f.x + (Math.random() - 0.5) * 1.5, y: f.y + 2 + Math.random() * 0.8, z: f.z + (Math.random() - 0.5) * 1.5, vx: (Math.random() - 0.5) * 0.6, vy: 0.4 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 0.6, life: 1.4, max: 1.4, g: -0.2, s: 0.5 });   // pollen drifting up off it
  f.hateT = (f.hateT || 0) + DT;
  if (f.hateT >= HATE_EVERY) { f.hateT = 0; S.hate.push({ x: f.x, z: f.z, r: 0.6 }); Sfx.hate(clamp((f.x - S.x) / 15, -1, 1)); Sfx.rattle(); }
}
// Posts (entity post: true): a man who holds a place. He fights whoever comes within POST_R of it and goes back to it
// rather than be drawn away; when LEVEL.postBreak is set (the host breaks) he abandons it and runs for LEVEL.routTo.
const POST_R = 4;
const DAZE_SECS = 10, BLEED_SECS = 4, BLEED_RATE = 1.0;   // a thing's bite also bleeds: 1.5 a second for five seconds, till you eat or drink   // a thing's bite: slow and reeling, no strength for a jump
// Squads (LEVEL.squads): five or six men who fight as one. Far off they come on as a body, a line abreast at the pace of the
// slowest; close in they spread to ring the king, each at his own bearing, and only two strike at a time while the rest
// hold their places, so he is always flanked and never facing them one by one.
function squadChase(f, st, d, dx, dz, move, turn, approach) {
  const mates = S.foes.filter(o => o.group === f.group && !o.dead && !FOES[o.cls].ranged && (o.state === 'chase' || o.state === 'windup' || o.state === 'strike' || o.state === 'recover' || o.state === 'block'));
  const n = mates.length, k = mates.indexOf(f);
  if (n < 2 || k < 0 || Math.abs(S.y - f.y) > 1.6) return false;
  let cx = 0, cz = 0; for (const o of mates) { cx += o.x; cz += o.z; } cx /= n; cz /= n;
  const cd = Math.hypot(S.x - cx, S.z - cz) || 1;
  if (cd > 8 && d > 6) {                                   // the advance: abreast, keeping their dressing
    // the line forms at the front man's distance: the front halts until the laggards are up, then the whole line steps on
    const ux = (cx - S.x) / cd, uz = (cz - S.z) / cd, dists = mates.map(o => Math.hypot(o.x - S.x, o.z - S.z));
    const front = Math.min(...dists), dressed = Math.max(...dists) - front < 3, L = Math.max(6, front - (dressed ? 1.5 : 0));
    const off = (k - (n - 1) / 2) * 1.5, tx = S.x + ux * L + uz * off, tz = S.z + uz * L - ux * off, td = Math.hypot(tx - f.x, tz - f.z);
    let clear = true; for (let q = 1, m = Math.ceil(td / 1.2); q < m && clear; q++) { const i = cellIdx(Math.floor((f.x + (tx - f.x) * q / m) / CELL), Math.floor((f.z + (tz - f.z) * q / m) / CELL)); clear = i >= 0 && LV.kind[i] === 1 && !(LV.flags[i] & F_NOPASS); }
    if (!clear) approach(st.speed * 0.85);                  // stakes or a wall in the way: by the path
    else if (td > 0.5) move(tx, tz, td > 2.5 ? st.speed : st.speed * 0.7);
    turn(6);
    return true;
  }
  const reach = foeReach(f), base = Math.atan2(cx - S.x, cz - S.z), a = base + (k - (n - 1) / 2) * Math.min(0.95, 4.6 / n);
  const sx = S.x + Math.sin(a) * reach * 0.88, sz = S.z + Math.cos(a) * reach * 0.88;
  // a blow every half second at most, never more than two in the air, each from the man furthest round on the king's flank (he must keep turning)
  const busy = mates.filter(o => o.state === 'windup' || o.state === 'strike').length >= 2, fwdX = -Math.sin(S.yaw), fwdZ = -Math.cos(S.yaw);
  const flank = o => -((o.x - S.x) * fwdX + (o.z - S.z) * fwdZ) / (Math.hypot(o.x - S.x, o.z - S.z) || 1);
  const inReach = mates.filter(o => Math.hypot(o.x - S.x, o.z - S.z) <= foeReach(o) * 0.92 && o.cool <= 0);
  const mine = !busy && S.tick >= (S.squadBeat || 0) && inReach.length && inReach.reduce((b, o) => flank(o) > flank(b) ? o : b) === f;
  if (Math.hypot(sx - f.x, sz - f.z) > 0.7 && !mine) move(sx, sz, st.speed);   // to his place in the ring
  turn(8);
  if (mine) { f.state = 'windup'; f.t = 0; f.throwing = false; S.squadBeat = S.tick + Math.round(0.5 * SIM_HZ); Sfx.ready(clamp(-dx / 15, -1, 1)); }
  return true;
}
function hitFoe(f, dmg, kick) {
  const st = FOES[f.cls], dx = S.x - f.x, dz = S.z - f.z, d = Math.hypot(dx, dz) || 1;
  const front = (dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw)) / d > 0.3;
  alertGroup(f.group);
  if (f.cls === 'yothga' && !f.open && !kick) {          // the shut stem: the blade barely bites the fibre
    dmg *= 0.06;
    if (!S.hints.has('fibre')) { S.hints.add('fibre'); log('The blade bites into the knotted fibre of the stem and barely marks it. Watch the blossoms.', 'dim'); }
  }
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
      if (!S.hints.has('block')) { S.hints.add('block'); log('His shield turns your blow. Parry his stroke (right-click or F) and strike while he reels.', 'dim'); }
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
    else if (f.cls === 'axeman' && !['windup', 'strike', 'pain'].includes(f.state) && f.hp > 0) { f.state = 'pain'; f.t = 0; Sfx.grunt(false, panOf(f)); }   // the black giant winces at the bite of a blade, and comes on again; a blow in his wind-up he does not feel
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
  f.ragYaw = Math.atan2(f.x - S.x, f.z - S.z); f.ragPow = how === 'kick' ? 1.5 : how === 'crush' ? 2.2 : 0.8 + 0.5 * hrand(Math.round(f.homeX * 10), 5, 3, 3);   // the killing blow drives him away from you (drawn only: not in the state)
  Sfx.death(f.cls === 'thing', panOf(f)); if (how === 'fall') Sfx.scream();
  if (!FOES[f.cls].boss) log(DEATH_LINES[how](FOES[f.cls].name), 'good');   // a boss's death has its own lines, in the level's beats
  if (how === 'fall' || f.cls === 'yothga') return;
  fitDeath(f);
  // his weapon leaves his hand: a pickup if you can use it, otherwise it lies broken beside him
  const c = CAST[f.cls], w = c.weapon, tip = deathPoint(f, 0.9), side = deathPoint(f, 0.5, 0.9), far = deathPoint(f, 1.15, -0.7);
  const drop = (kind, name) => S.items.push({ id: 'drop_' + f.id, kind, name, x: side[0], z: side[1], y: groundInfo(side[0], side[1]).floor, taken: false });
  const free = k => !S.items.some(i => i.kind === k && !i.taken);
  f.debris = [];
  const deb = (m, p, k, s = 1) => f.debris.push({ m, x: p[0], z: p[1], yaw: f.dieYaw + k, s });
  if (w === 'sword' && !S.weapons.sword && free('sword')) drop('sword', 'Kothian sword');
  else if (w === 'spear' && LEVEL.links.some(l => l.name === 'portcullis') && !S.flags.has_spear && !S.flags.portcullis_open && free('spear')) drop('spear', 'spear');
  else if (w === 'spear' && (f.spears === undefined || f.spears > 0) && !LEVEL.links.some(l => l.name === 'portcullis')) S.items.push({ id: 'spear_' + f.id, kind: 'spear', name: 'spear', uses: 0, x: side[0], z: side[1], y: groundInfo(side[0], side[1]).floor, taken: false });
  else if (w === 'sword') { deb('broken:sword_hilt', side, 1.1); deb('broken:sword_tip', far, 2.3); }
  else if (w === 'spear') { deb('broken:spear_butt', side, 0.4); deb('broken:spear_head', far, 1.9); }
  else if (w === 'axe') { deb('broken:axe_head', side, 0.8); deb('broken:axe_haft', far, 2.6); }
  else if (w === 'bow') deb('broken:bow', side, 0.6);
  if (c.shield) { deb('broken:shield_half', tip, 0.5); deb('broken:shield_half', deathPoint(f, 0.6, -1.1), 3.4); }
  // a soldier carries his rations: about one man in two leaves a wine-skin or a heel of bread by his body (walk over it)
  const kit = RATIONS[f.cls], roll = hrand(Math.round(f.homeX * 7), Math.round(f.homeZ * 7), 11, 4);
  if (kit && roll < RATION_ODDS) {
    const p = deathPoint(f, 0.25, -0.9), wine = roll < RATION_ODDS / 2;
    S.items.push({ id: 'ration_' + f.id, kind: wine ? 'wine' : 'bread', name: 'the ' + kit + (wine ? '\'s wine-skin' : '\'s bread'), heal: wine ? 25 : 20, x: p[0], z: p[1], y: groundInfo(p[0], p[1]).floor, taken: false });
  }
}
// who carries food and drink into the fight (men, not monsters; bosses have their own ends)
const RATION_ODDS = 0.5;
const RATIONS = { warden: 'guard', spearman: 'spearman', archer: 'archer', kknight: 'knight', oknight: 'knight', axeman: 'axeman', pellian: 'man-at-arms', pellian_archer: 'archer' };
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
  if (f.ragYaw !== undefined) for (const o of offs) {   // the way the blow drives him: on his back if it took him from the front, on his face from behind
    const A = f.ragYaw + o, s = Math.cos(f.yaw - A) > 0 ? 1 : -1;
    if (clear(A)) { f.dieS = s; f.dieYaw = A - (s < 0 ? Math.PI : 0); f.slump = false; return; }
  }
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
// Ragdoll: the body topples as a falling mass from the feet (an inverted pendulum, kicked off by the blow),
// slides on along the ground, bounces once as it lands and settles; every joint hangs on a loose spring, so
// arms fling and flop, the head whips, the knees fold. Integrated on the corpse's own sim clock (deathT),
// so a replay draws it the same; it's drawing only, never part of the state.
const RAG_LIE = 1.52, RAG_DT = 1 / 144;
function ragStep(f, lie, start) {
  const h = k => hrand(Math.round(f.homeX * 10), Math.round(f.homeZ * 10), k, 61), pow = f.ragPow || 1, sc = CAST[f.cls] ? CAST[f.cls].scale : 1;
  let R = f.rag;
  const A = f.dieYaw + ((f.dieS || -1) < 0 ? Math.PI : 0), dx = Math.sin(A), dz = Math.cos(A);
  if (!R) {
    // the blow's push: along the way he falls, and across it (that part spins him onto his side)
    const side = f.ragYaw !== undefined ? Math.sin(f.ragYaw - A) : 0;
    R = f.rag = { t: 0, th: 0.04, w: 0.8 + 1.3 * pow, v: 0.6 + 1.1 * pow, off: 0, land: 0, J: {}, V: {},
      rl: 0, wr: side * (1.2 + 1.6 * pow) + (h(30) - 0.5) * 1.2, rlRest: (h(31) - 0.5) * 1.4 + side * 0.5, dy: 0, vy: 0, bounce: 0 };
    for (const k in lie) { R.J[k] = start[k] || 0; R.V[k] = 0; }
    const fling = (f.dieS || -1) < 0 ? 1 : -1;            // falling backward the arms fly up and forward; on the face they trail
    R.V.uxL = -5 * fling * (0.6 + h(1)); R.V.uxR = -5 * fling * (0.6 + h(2)); R.V.uzL = 3 * h(3); R.V.uzR = 3 * h(4); R.V.headX = 4 * fling;
  }
  const base = f.y;
  while (R.t + RAG_DT <= f.deathT && R.t < 5) {
    R.t += RAG_DT; const dt = RAG_DT;
    // over he goes: an inverted pendulum about the feet, pitch along the fall and roll across it
    if (!R.land) {
      const g = 9.8 / (1.05 * sc);
      R.w += g * Math.sin(R.th) * dt; R.th += R.w * dt;
      R.wr += g * Math.sin(R.rl) * 0.5 * dt - R.wr * 0.6 * dt; R.rl += R.wr * dt;
      if (R.th >= RAG_LIE) { R.th = RAG_LIE; R.w *= -0.28; R.land = 1; R.bounce = 1; for (const k in R.V) R.V[k] += (h(20 + k.length) - 0.5) * 9; }   // the thud jolts every limb
    } else {
      R.w += (-(R.th - RAG_LIE) * 140 - R.w * 10) * dt; R.th = Math.min(RAG_LIE, R.th + R.w * dt);   // a rebound off the stone, then still
      R.wr += (-(R.rl - R.rlRest) * 40 - R.wr * 7) * dt; R.rl += R.wr * dt;                         // rolling onto his side, or back off it
    }
    // the slide: along the floor, over a step or off a ledge (and down, under gravity), stopped by walls and furniture
    R.v = Math.max(0, R.v - (R.land ? 6 : 1.8) * dt);
    const nx = R.off + R.v * dt, px = f.x + dx * (nx + 0.6), pz = f.z + dz * (nx + 0.6), g = groundInfo(px, pz);
    const wall = g.kind === 0 || (g.flags & F_NOPASS) || g.floor > base + R.dy + 0.4 || LV.colliders.some(c => Math.hypot(c.x - px, c.z - pz) < c.r);
    if (wall || (g.kind === 2 && g.floor < base - 3)) R.v = 0; else R.off = nx;
    const fl = groundInfo(f.x + dx * (R.off + 0.6), f.z + dz * (R.off + 0.6)).floor - base;   // the ground under his body
    if (R.dy > fl + 0.01) { R.vy -= 24 * dt; R.dy += R.vy * dt; if (R.dy <= fl) { R.dy = fl; if (R.vy < -3) { R.w -= 1.5; R.land = 1; for (const k in R.V) R.V[k] += (h(40 + k.length) - 0.5) * 7; } R.vy = 0; } }
    else { R.dy = fl; R.vy = 0; }
    const q = R.th / RAG_LIE, fold = Math.sin(Math.PI * Math.min(1, q * 1.1));   // knees fold as he goes over, straighten as he lies
    for (const k in lie) {
      let T = lerp(start[k] || 0, lie[k], Math.min(1, q * 1.15));
      if (k === 'sxL' || k === 'sxR') T += 0.9 * fold; if (k === 'txL' || k === 'txR') T -= 0.5 * fold;
      R.V[k] += (55 * (T - R.J[k]) - 4.5 * R.V[k]) * dt; R.J[k] += R.V[k] * dt;   // underdamped: limbs overshoot and flop
    }
  }
  return R;
}
function ragOffset(f) {
  if (!f.rag || f.dieYaw === undefined) return [0, 0];
  const A = f.dieYaw + ((f.dieS || -1) < 0 ? Math.PI : 0);
  return [Math.sin(A) * f.rag.off, Math.cos(A) * f.rag.off];
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
  const sp = f.dieS === undefined ? -1 : f.dieS;
  // limbs relax toward the floor: on his back the knees fall up and out, face down the legs trail straight
  const back = sp < 0;
  const fin = { uzL: 0.3 + h(3) * 1.1, uzR: 0.3 + h(4) * 1.1,
    uxL: back ? -0.35 + h(5) * 0.5 : -0.2 + h(5) * 0.45, uxR: back ? -0.35 + h(6) * 0.5 : -0.2 + h(6) * 0.45, fxL: -0.15 - h(7) * 0.9, fxR: -0.15 - h(8) * 0.9,
    txL: back ? -0.15 - h(9) * 0.35 : 0.05 + h(9) * 0.15, txR: back ? -h(10) * 0.2 : h(10) * 0.12,
    sxL: back ? 0.15 + h(11) * 0.55 : h(11) * 0.35, sxR: back ? h(12) * 0.3 : h(12) * 0.2,
    tzL: 0.08 + h(13) * 0.3, tzR: 0.08 + h(14) * 0.25, headY: (h(15) - 0.5) * 1.5, headX: back ? -0.25 : 0.2 };
  fin.lean = sp > 0 ? 0.1 : -0.1;
  const R = ragStep(f, fin, P), q = R.th / RAG_LIE;
  Object.assign(P, R.J);
  P.pitch = sp * R.th; P.roll = R.rl * Math.max(0.35, q);
  P.drop = -0.14 * Math.sin(Math.PI * Math.min(1, q)) + (back ? 0.12 : 0.1) * q + R.dy;   // and down a step, if it carried him over one   // a sag as the knees go, then lying on the floor, not in it
  P.unarmed = true; P.noShield = true;
  return P;
}
function punchView(p, y) { punchPitch += p; punchYaw += y; }

// ---- drawing the foes ---------------------------------------------------------
function foePose(f) {
  const st = FOES[f.cls], P = poseIdle({}, gameTime + f.homeX), c = CAST[f.cls];
  if (f.cls === 'thing' && typeof SKINNED !== 'undefined' && SKINNED.thing) {   // the goblin body: a hunched lope on two legs
    const t = gameTime + f.homeX;
    if (f.dead) {                                     // a ragdoll like the men: over the way the blow drives it, limbs flung out, then still
      const sd = hrand(Math.round(f.homeX * 10), 3, 5, 5) < 0.5 ? -1 : 1, sp = f.dieS === undefined ? -1 : f.dieS;
      const lie = { lean: -0.2, headX: 0.5 * -sp, headY: 0.6 * sd, uxL: -0.6, uxR: -0.9, uzL: 1.3, uzR: 1.1, fxL: -0.8, fxR: -0.4, txL: -0.9, txR: -0.3, sxL: 1.4, sxR: 0.6 };
      const R = ragStep(f, lie, P), q = R.th / RAG_LIE;
      return Object.assign(P, R.J, { pitch: sp * R.th, roll: R.rl * Math.max(0.35, q) + 0.2 * sd * q, drop: 0.12 * q + R.dy });
    }
    if (f.state === 'lurk' || f.state === 'drop') return Object.assign(P, { pitch: Math.PI, drop: 0.42, uxL: -2.6, uxR: -2.6, fxL: -0.4, fxR: -0.4, txL: -0.6, txR: -0.6, sxL: 1.2, sxR: 1.2 });
    const ph = f.walk * 3.6, amt = f.moving ? 1 : 0.12, sw = Math.sin(ph) * amt;
    Object.assign(P, { lean: 0.5 + 0.1 * Math.abs(sw), headX: -0.45 + Math.sin(t * 3) * 0.06, drop: -0.16 - Math.abs(Math.cos(ph)) * 0.05 * amt,
      txL: -0.35 + sw * 0.6, txR: -0.35 - sw * 0.6, sxL: 0.65 + Math.max(0, -Math.sin(ph - 0.9)) * 0.7 * amt, sxR: 0.65 + Math.max(0, Math.sin(ph - 0.9)) * 0.7 * amt,
      uxL: -0.45 - sw * 0.5, uxR: -0.45 + sw * 0.5, uzL: 0.3, uzR: 0.3, fxL: -0.5, fxR: -0.5, roll: sw * 0.06 });
    if (f.state === 'windup') { const k = smoothstep(0, FOES.thing.windup, f.t); Object.assign(P, { lean: lerp(P.lean, 0.05, k), headX: lerp(P.headX, -0.1, k), uxL: lerp(P.uxL, -2.5, k), uxR: lerp(P.uxR, -2.5, k), uzL: 0.45, uzR: 0.45, fxL: -0.7, fxR: -0.7 }); }
    if (f.state === 'strike') Object.assign(P, { lean: 0.85, headX: -0.6, uxL: -1.5, uxR: -1.5, fxL: -0.05, fxR: -0.05, txL: -0.8, sxL: 0.9, drop: -0.25 });
    if (f.state === 'stagger' || f.state === 'pain') Object.assign(P, { lean: -0.15, roll: 0.35, headX: 0.35, uxL: 0.4, uxR: -0.2, uzL: 0.8, uzR: 0.8 });
    if (f.state === 'cower') Object.assign(P, { lean: -0.1, headX: 0.5, uxL: -1.6, uxR: -1.3, fxL: -1.4, fxR: -1.5, uzL: 0.2, uzR: 0.2, drop: -0.28 });   // arms up across its face against the light
    if (f.state === 'flee') Object.assign(P, { lean: 0.75, headX: -0.2, drop: -0.3 });   // low and scuttling
    return P;
  }
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
  if (FOES[f.cls].meek && !f.dead) {                     // a non-combatant: running from you, or cowering, arms over his head
    if (f.state === 'meek' && f.cower) return Object.assign(P, { lean: 0.5, headX: 0.6, drop: -0.35, uxL: -2.2, uxR: -2.3, fxL: -1.6, fxR: -1.5, uzL: 0.3, uzR: 0.3, txL: -0.9, txR: -0.9, sxL: 1.4, sxR: 1.4 });
    if (f.state === 'meek' && f.moving) { poseWalk(P, f.walk * 3.1, 1); P.lean = 0.3; P.headX = -0.1; return P; }
    return P;
  }
  if (c.weapon === 'axe' && !f.dead && !f.falling) return axePose(f, st, P);
  if (c.weapon !== 'bow') poseMenace(P, gameTime + f.homeX);
  if (c.shield) { P.uxL = -0.35; P.fxL = -1.25; P.uzL = 0.25; }
  if (c.weapon === 'spear' || c.weapon === 'axe') { P.uxR = -0.25; P.fxR = -1.2; P.we = 1.25; if (c.weapon === 'axe') { P.uxL = -0.6; P.fxL = -1.3; } }
  else if (c.weapon === 'sword') { P.uxR = -0.25; P.fxR = -0.9; P.we = 0.45; }
  else if (c.weapon === 'bow') { P.uxL = -0.2; P.fxL = -0.6; }
  if (f.dead) {
    if (f.falling) return Object.assign(P, { uzL: 1.4, uzR: 1.4, uxL: -2, uxR: -2.4, txL: -0.6, sxL: 0.8, unarmed: true });   // flailing down the well
    return deathPose(f, P);
  }
  if (f.moving) poseWalk(P, f.walk * 3.4, Math.min(1, 1), !c.shield && c.weapon !== 'spear');   // stride matched to the ground covered: no sliding feet
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
// Tsotha's black axemen: a menacing two-handed chop. Hunched and wide-legged, the great axe across the body; the wind-up heaves
// it high behind the horned helm, back arched, a step in, and it hangs a heartbeat at the top, trembling; then the whole body
// comes down behind it, sinking at the knee and bending at the waist, the head of the axe driven into the stones (sparks fly);
// it stays in the stone a moment before he heaves it up again.
function axePose(f, st, P) {
  const t = f.t, e = x => x * x * (3 - 2 * x), eo = x => 1 - (1 - x) * (1 - x) * (1 - x), mix = (A, B, k) => { for (const q in B) P[q] = lerp(A[q] ?? 0, B[q], k); };
  const breathe = Math.sin(gameTime * 2.1 + f.homeX) * 0.03;
  const STANCE = { lean: 0.32, headX: -0.28 + breathe, drop: -0.14, txL: -0.42, txR: 0.12, sxL: 0.55, sxR: 0.65, tzL: 0.12, tzR: -0.08, twist: 0.12,
    uxR: -0.95, fxR: -1.25, uzR: 0.25, uxL: -0.75, fxL: -1.55, uzL: -0.15, we: 0.95 + breathe, roll: breathe * 0.4 };
  Object.assign(P, STANCE);
  if (f.moving && f.state !== 'windup' && f.state !== 'strike') {   // a heavy stride, the axe carried across him
    const ph = f.walk * 3.0, sw = Math.sin(ph);
    Object.assign(P, { txL: -0.25 + sw * 0.55, txR: -0.05 - sw * 0.55, sxL: 0.4 + Math.max(0, -Math.sin(ph - 0.9)) * 0.9, sxR: 0.4 + Math.max(0, Math.sin(ph - 0.9)) * 0.9, drop: -0.1 - Math.abs(Math.cos(ph)) * 0.06, roll: sw * 0.05, twist: 0.12 - sw * 0.08 });
  }
  // the blow, two-handed and from the shoulder: heaved up over the right shoulder, held there trembling; then high,
  // and down across him to the left with his whole weight thrown after it, the head of the axe biting the floor at his feet
  const WIND = { lean: -0.15, headX: 0.1, drop: -0.1, txL: -0.5, sxL: 0.4, txR: 0.2, sxR: 0.35, twist: -0.3, roll: -0.12, uxR: -2.6, fxR: -1.4, uzR: 0.9, uxL: -1.5, fxL: -1.9, uzL: -0.5, we: 2.4 };
  const MID = { lean: 0.25, headX: -0.1, drop: -0.18, txL: -0.65, sxL: 0.7, txR: 0.28, sxR: 0.5, twist: 0.2, roll: 0, uxR: -1.9, fxR: -0.8, uzR: 0.1, uxL: -1.4, fxL: -1.1, uzL: -0.7, we: 1.5 };
  const CUT = { lean: 0.7, headX: -0.35, drop: -0.32, txL: -0.85, sxL: 1.0, txR: 0.35, sxR: 0.7, twist: 0.45, roll: 0.18, uxR: -0.8, fxR: -0.25, uzR: -0.55, uxL: -0.7, fxL: -0.45, uzL: -0.85, we: 0.4 };
  if (f.state === 'windup') {
    const W = st.windup * (f.combo ? 0.6 : 1), k = e(Math.min(1, t / (W * 0.75))), hold = Math.max(0, (t - W * 0.75) / (W * 0.25));
    mix(STANCE, WIND, k);
    if (hold > 0) { const sh = Math.sin(gameTime * 46) * 0.035 * hold; P.uxR += sh; P.uxL += sh; P.we += sh * 2; P.lean -= 0.05 * hold; }   // it hangs there, trembling
  } else if (f.state === 'strike') {
    const k = eo(Math.min(1, t / st.strike));
    if (k < 0.35) { Object.assign(P, WIND); mix(WIND, MID, k / 0.35); } else { Object.assign(P, MID); mix(MID, CUT, (k - 0.35) / 0.65); }
    if (k > 0.85 && !f.chopFx) {                         // the head bites the stones, down at his left
      f.chopFx = true; const a = f.yaw + 0.45, ax = f.x + Math.sin(a) * 1.6, az = f.z + Math.cos(a) * 1.6, ay = groundInfo(ax, az).floor + 0.1;
      for (let q = 0; q < 9; q++) particles.push({ m: 'spark', x: ax, y: ay, z: az, vx: (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 0.45, max: 0.45, g: 9, s: 0.9 });
    }
  } else if (f.state === 'recover') {
    f.chopFx = false;
    const R = st.recover, k = e(Math.max(0, (t - R * 0.35) / (R * 0.65)));   // a moment with the axe in the stone, then heaved up
    Object.assign(P, CUT); mix(CUT, STANCE, k);
    P.lean += Math.sin(Math.min(1, t / R) * Math.PI) * 0.06;  // his shoulders heave with it
  } else if (f.state === 'block') Object.assign(P, { uxR: -1.6, fxR: -1.0, uxL: -1.5, fxL: -1.2, uzL: 0.2, we: 1.5, lean: 0.05, headX: -0.1 });   // the haft up across him
  else if (f.state === 'pain' || f.state === 'stagger') {   // he winces: doubled over the wound, the free hand clutching at it, the axe hanging
    const k = f.state === 'stagger' ? Math.sin(Math.min(1, t / KICK.stagger) * Math.PI) : Math.sin(Math.min(1, t / (st.pain || 0.34)) * Math.PI);
    mix(STANCE, { lean: 0.45, headX: 0.5, drop: -0.22, roll: 0.15, twist: 0.1, uxL: -0.5, fxL: -2.2, uzL: -0.6, uxR: -0.5, fxR: -1.0, uzR: 0.2, we: 1.0, txL: -0.5, sxL: 0.9, txR: 0.1, sxR: 0.7 }, k);
  }
  return P;
}
function drawFoes() {
  for (const f of S.foes) {
    if (f.state === 'dormant' || f.gone || (f.dead && f.falling && f.y < -12)) continue;
    if (f.cls === 'weeper') { drawWeeper(f); continue; }
    if (f.dead && LEVEL.eagle && f.cls === LEVEL.eagle.foe && drawBeheaded(f)) continue;
    if (f.cls === 'yothga') { const l = sampleLight(f.x, f.y + 1.4, f.z);
      if (!f.dead) for (const w of S.hate || []) { const a = 1 - w.r / HATE_MAX; R.blend(true); drawM('hate_ring', m4mul(m4t(w.x, groundInfo(w.x, w.z).floor + 0.06, w.z), m4s3(w.r, 1, w.r)), [1, 1, 1], 1, 0.75 * a); R.blend(false); }
      drawYothga(f.x, f.y, f.z, f.yaw, gameTime, f.dead ? -0.8 * Math.min(1, f.deathT) : f.state === 'windup' || f.state === 'strike' ? 1 : 0.4, l, f.dead ? 0 : f.opening || 0); continue; }
    if (f.state === 'sleep') { const l = sampleLight(f.x, f.y + 1.4, f.z); drawCharacter(f.cls, f.x, f.y, f.z, f.yaw, Object.assign(poseIdle({}, gameTime * 0.3 + f.homeX), { lean: 0.35, headX: 0.7, drop: -0.35, txL: -1.4, txR: -1.4, sxL: 2.2, sxR: 2.2, uxL: -0.4, uxR: -0.4, fxL: -1.2, fxR: -1.2, unarmed: false, we: -1.2 }), l); continue; }   // slumped asleep against the wall
    const l = sampleLight(f.x, f.y + 1.4, f.z);
    const yaw = f.dead && f.dieYaw !== undefined && (f.cls !== 'thing' || f.rag) ? f.dieYaw : f.yaw;
    const cid = f.cls === 'thing' ? ['thing', 'thing_b', 'thing_c'][Math.floor(hrand(Math.round(f.homeX * 10), Math.round(f.homeZ * 10), 7, 1) * 3)] : f.cls;   // each malformed its own way
    const fp = foePose(f); if (f.sidearm) fp.weapon = 'sword';
    const ro = f.dead ? ragOffset(f) : [0, 0];          // the corpse slides on along the ground after the blow
    drawCharacter(cid, f.x + ro[0], f.y, f.z + ro[1], yaw, fp, l, f.flash > 0 ? 0.55 : 0);
    if (f.debris) for (const d of f.debris) {               // the weapon falls from his hand, and lies broken
      const k = smoothstep(0, 0.45, f.deathT), fl = groundInfo(d.x, d.z).floor;
      const x = lerp(f.x, d.x, k), z = lerp(f.z, d.z, k), y = lerp(f.y + 1.1, fl + 0.03, k * k);
      drawM(d.m, m4trs(x, y, z, d.yaw + (1 - k) * 4, Math.PI / 2 * k, (1 - k) * 2, d.s), sampleLight(x, y + 0.5, z));
    }
  }
}
