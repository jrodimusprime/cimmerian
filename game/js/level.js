'use strict';
// ---------------------------------------------------------------------------
// e1m2 "The Pits", as a level spec in the shape of README §5 (rooms, links,
// props, entities, puzzle), built into a finite grid. The Endless Cave's
// chunk generator is replaced by this hand-authored spec, but the grid
// format, corner sharing, mesher and physics queries are the same engine.
//
// Grid: x runs east, z runs south (north is -z). One cell = CELL world units.
// Heights in the spec are in cells, like the README's level YAML.
// ---------------------------------------------------------------------------

const F_HIDE = 1, F_NOPASS = 2, F_TALL = 4, F_SKY = 8, F_SLIME = 16;

// Pacing (README §9): every level alternates PUZZLE areas (think, read,
// time things) and ACTION areas (fight). e1m2 runs:
//   cell (puzzle) -> hall (timing puzzle) -> wardens' post (action) ->
//   grille (puzzle) -> guardroom + barracks (action) -> winch (puzzle) ->
//   captain's landing (action) -> exit.
const LEVEL = {
  level: 'e1m2', title: 'The Pits', ramps: ['ink', 'jade', 'fire'], grid: [64, 32],
  areas: [
    { id: 'cell', type: 'puzzle', name: 'The Cell', rooms: ['cell', 'cell_door'] },
    { id: 'hall', type: 'puzzle', name: 'The Hall of the Serpent', rooms: ['hall', 'well', 'a1', 'a2', 'a3', 'n1', 'n2'] },
    { id: 'post', type: 'action', name: 'The Wardens\' Post', rooms: ['south_passage', 'post', 'gallery', 'gsteps'] },
    { id: 'grille', type: 'puzzle', name: 'The Grille', rooms: ['niche', 'grille'] },
    { id: 'guard', type: 'action', name: 'The Guardroom and Barracks', rooms: ['guard', 'barracks_door', 'barracks'] },
    { id: 'winch', type: 'puzzle', name: 'The Winch', rooms: ['winch', 'portcullis'] },
    { id: 'landing', type: 'action', name: 'The Captain\'s Landing', rooms: ['stair', 'landing', 'exit'] },
  ],
  rooms: [
    { id: 'cell', name: 'the Cell', at: [6, 8], size: [4, 4], h: 2.1, style: 'hewn', tex: { floor: 'STRAW' }, hide: true },
    { id: 'cell_door', name: 'the Cell Door', at: [7, 12], size: [1, 1], h: 1.3, style: 'hewn', hide: true },
    { id: 'hall', name: 'the Hall of the Serpent', at: [3, 13], size: [31, 2], h: 4, vault: 2.2, style: 'hewn' },
    { id: 'well', name: 'the Serpent\'s Well', at: [3, 13], size: [2, 2], pit: 40, style: 'rough', tex: { wall: 'ROCK' } },
    { id: 'a1', name: 'an alcove', at: [11, 15], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'a2', name: 'the Bone Alcove', at: [17, 15], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'a3', name: 'an alcove', at: [23, 15], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'n1', name: 'an alcove', at: [14, 11], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'n2', name: 'an alcove', at: [20, 11], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'niche', name: 'a niche by the grille', at: [32, 15], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'serpent', name: 'the Serpent\'s Hole', at: [27, 4], size: [2, 9], h: 2.4, style: 'rough', slope: [-14, 0], nopass: true, tex: { wall: 'ROCK', floor: 'SLIME', ceil: 'ROCK' } },
    { id: 'south_passage', name: 'the South Passage', at: [26, 15], size: [2, 5], h: 2, style: 'hewn', hide: true },
    { id: 'post', name: 'the Wardens\' Post', at: [20, 20], size: [12, 9], h: 3.6, vault: 1.4, style: 'hewn' },
    { id: 'gallery', name: 'the Archers\' Gallery', at: [32, 20], size: [3, 6], h: 2.4, floor: 2.4, style: 'hewn' },
    { id: 'gsteps', name: 'the Gallery Steps', at: [32, 26], size: [3, 3], h: 2.6, floor: 1.6, rise: -0.8, riseAxis: 'z', style: 'hewn' },
    { id: 'grille', name: 'the Grille', at: [34, 13], size: [1, 2], h: 3, style: 'hewn' },
    { id: 'guard', name: 'Shukeli\'s Guardroom', at: [35, 9], size: [10, 10], h: 3.4, floor: 0.4, vault: 1.2, style: 'hewn' },
    { id: 'barracks_door', name: 'the Barracks Door', at: [39, 8], size: [2, 1], h: 1.4, floor: 0.4, style: 'hewn' },
    { id: 'barracks', name: 'the Barracks', at: [35, 2], size: [10, 6], h: 2.6, floor: 0.4, style: 'hewn', tex: { floor: 'STRAW' } },
    { id: 'winch', name: 'the Winch', at: [45, 16], size: [1, 2], h: 1.4, floor: 0.4, style: 'hewn' },
    { id: 'portcullis', name: 'the Portcullis', at: [45, 13], size: [1, 2], h: 2.4, floor: 0.4, style: 'hewn' },
    { id: 'stair', name: 'the Stair', at: [46, 13], size: [7, 2], h: 2.6, floor: 1.4, rise: 1.0, style: 'hewn' },
    { id: 'landing', name: 'the Captain\'s Landing', at: [53, 9], size: [8, 10], h: 3.4, floor: 7.4, vault: 1.2, style: 'hewn' },
    { id: 'exit', name: 'the Citadel Stair', at: [61, 13], size: [2, 2], h: 1.6, floor: 7.4, style: 'hewn' },
  ],
  // the cell's grating: one tall cell open to a grey thread of daylight
  shafts: [{ at: [8, 9], h: 9 }],
  links: [
    { a: 'cell', b: 'hall', via: 'barred_door', name: 'cell_door', cells: [[7, 12]] },
    { a: 'hall', b: 'guard', via: 'iron_grille', name: 'grille_gate', cells: [[34, 13], [34, 14]] },
    { a: 'guard', b: 'stair', via: 'portcullis', name: 'portcullis', cells: [[45, 13], [45, 14]] },
  ],
  props: [
    // the hall
    { prefab: 'torch', at: [5.5, 13], wall: 'N' }, { prefab: 'torch', at: [10.5, 13], wall: 'N' }, { prefab: 'torch', at: [22.5, 13], wall: 'N' },
    { prefab: 'torch', at: [30.5, 13], wall: 'N' }, { prefab: 'torch', at: [15.5, 15], wall: 'S' }, { prefab: 'torch', at: [8.6, 15], wall: 'S' }, { prefab: 'torch', at: [29.5, 15], wall: 'S' },
    { prefab: 'bones', at: [17.6, 16.3], big: true }, { prefab: 'bones', at: [5.6, 14.6] }, { prefab: 'bones', at: [12.4, 16.4] },
    { prefab: 'bones', at: [29.2, 13.5] }, { prefab: 'skull', at: [5.2, 13.4] }, { prefab: 'skull', at: [24.6, 16.5] },
    { prefab: 'chains', at: [13, 13], wall: 'N' }, { prefab: 'chains', at: [19.5, 15], wall: 'S' }, { prefab: 'chains', at: [25.5, 13], wall: 'N' },
    { prefab: 'grating', at: [8, 9] },
    // the wardens' post
    { prefab: 'torch', at: [20, 23], wall: 'W' }, { prefab: 'torch', at: [20, 27], wall: 'W' }, { prefab: 'torch', at: [23, 20], wall: 'N' },
    { prefab: 'torch', at: [24, 29], wall: 'S' }, { prefab: 'torch', at: [30, 29], wall: 'S' }, { prefab: 'torch', at: [35, 22.5], wall: 'E' },
    { prefab: 'column', at: [23.5, 23.5] }, { prefab: 'column', at: [23.5, 26.5] }, { prefab: 'column', at: [28.5, 23.5] }, { prefab: 'column', at: [28.5, 26.5] },
    { prefab: 'brazier', at: [26, 25] }, { prefab: 'table', at: [21.8, 21.6] }, { prefab: 'stool', at: [23.2, 21.4] },
    { prefab: 'bunk', at: [21.2, 27.8] }, { prefab: 'rack', at: [20, 25], wall: 'W' }, { prefab: 'chains', at: [30, 20], wall: 'N' },
    // the guardroom and barracks
    { prefab: 'torch', at: [35, 16.5], wall: 'W' }, { prefab: 'torch', at: [45, 10.5], wall: 'E' }, { prefab: 'torch', at: [42, 19], wall: 'S' },
    { prefab: 'brazier', at: [38, 15.5] }, { prefab: 'table', at: [39.5, 12] }, { prefab: 'stool', at: [38.2, 12.9] },
    { prefab: 'column', at: [42.5, 12] }, { prefab: 'column', at: [42.5, 16] },
    { prefab: 'torch', at: [35, 4.5], wall: 'W' }, { prefab: 'torch', at: [45, 3.5], wall: 'E' },
    { prefab: 'bunk', at: [36.3, 2.9] }, { prefab: 'bunk', at: [38.9, 2.9] }, { prefab: 'bunk', at: [41.5, 2.9] }, { prefab: 'table', at: [40, 5.6] },
    { prefab: 'spear_rack', at: [45, 6], wall: 'E' },
    { prefab: 'winch', at: [45.5, 17.5] },
    // the stair and landing
    { prefab: 'torch', at: [49.5, 13], wall: 'N' }, { prefab: 'torch', at: [53, 11], wall: 'W' }, { prefab: 'torch', at: [53, 16.5], wall: 'W' },
    { prefab: 'torch', at: [61, 10.5], wall: 'E' }, { prefab: 'torch', at: [61, 17], wall: 'E' }, { prefab: 'brazier', at: [57, 13.8] },
    { prefab: 'column', at: [55.5, 11.5] }, { prefab: 'column', at: [55.5, 16.5] }, { prefab: 'column', at: [59, 11.5] }, { prefab: 'column', at: [59, 16.5] },
    { prefab: 'banner', at: [61, 13.5], wall: 'E' }, { prefab: 'banner', at: [61, 15.5], wall: 'E' },
  ],
  lights: [
    { at: [8.5, 9.5], y: 7, col: [0.55, 0.6, 0.7], rad: 16, i: 2.0 },          // daylight down the grating
    { at: [4, 14], y: -4, col: [0.25, 0.55, 0.38], rad: 10, i: 0.9 },             // slime glow in the well
    { at: [28, 7], y: -8, col: [0.25, 0.55, 0.38], rad: 9, i: 0.6 },              // slime glow in the serpent's hole
    { at: [39.5, 12.2], y: 1.6, col: [1.0, 0.6, 0.3], rad: 5, i: 0.7 },           // Shukeli's candle
    { at: [62, 14], y: 9.5, col: [0.6, 0.62, 0.7], rad: 12, i: 1.4 },             // daylight down the citadel stair
  ],
  features: [
    { type: 'ring', at: [7, 8.08], y: 1.0 },
    { type: 'clue', id: 'insc_cell', at: [6.04, 9.2], y: 1.3, wall: 'W',
      text: 'Scratched deep into the stone by some earlier prisoner: "The ring is older than the chain. The FOURTH LINK is rust. Grind it on the sill-stone and it will part."' },
    { type: 'clue', id: 'insc_hall', at: [9.5, 14.96], y: 1.3, wall: 'S',
      text: 'Tally marks, hundreds of them, then: "IT PASSES EVERY FORTY BREATHS. WHEN THE TORCHES BOW, GET INTO THE WALL. ITS SPIT FINDS ANY MAN IT CAN SEE."' },
    { type: 'clue', id: 'insc_grille', at: [32.04, 16.2], y: 1.3, wall: 'W',
      text: 'Scratched low in the niche: "The fat jailer comes to any sound, like a dog to the dish. He will not come near a man he can see. Strike from the dark."' },
    { type: 'clue', id: 'insc_post', at: [26.96, 17.5], y: 1.3, wall: 'E',
      text: 'Cut into the passage wall: "The wardens sleep at their post. A shield will turn a blade, but not a heel. KICK THEM OFF THEIR GUARD."' },
    { type: 'clue', id: 'insc_winch', at: [45.96, 16.6], y: 1.3, wall: 'E',
      text: 'A warning painted on the winch housing: "PAWL BROKEN. She will not hold. Wind her up and jam the ratchet with something long and stout before you let go."' },
    { type: 'bones', at: [17.9, 16], y: 0 },
    { type: 'door', link: 'cell_door', at: [7.5, 12.1], y: 1.2 },
    { type: 'grille', link: 'grille_gate', at: [34, 14], y: 1.2 },
    { type: 'spear_rack', at: [44.6, 6], y: 1.2 },
    { type: 'winch', at: [45.5, 17.2], y: 1.2 },
  ],
  items: [
    { kind: 'bread', name: 'crust of black bread', at: [9.4, 11.4], heal: 25 },
    { kind: 'wine', name: 'skin of sour wine', at: [23.8, 16.3], heal: 15 },
    { kind: 'wine', name: 'jug of the jailer\'s wine', at: [39.9, 11.8], heal: 15, y: 1.05 },
    { kind: 'bread', name: 'warden\'s ration loaf', at: [21.4, 21.0], heal: 25, y: 1.05 },
    { kind: 'wine', name: 'archer\'s wineskin', at: [34.2, 20.6], heal: 25 },
    { kind: 'bread', name: 'barracks bread', at: [40.6, 5.4], heal: 25, y: 1.05 },
    { kind: 'wine', name: 'captain\'s wine', at: [54, 17.6], heal: 25 },
  ],
  entities: [
    { class: 'info_player_start', at: [7, 9.4], yaw: Math.PI, flags: ['chained'] },
    { class: 'black_giant', at: [7.5, 13.8], yaw: 0 },
    { class: 'scripted_satha', period: 40, wake: 'free' },
    { class: 'monster_shukeli', at: [38.8, 13.2], behind: 'grille_gate' },
    // action areas: wardens wake on sight or on noise; 'group' wakes together
    { class: 'warden', id: 'w0', at: [27, 21.5], group: 'scout', yaw: 0 },
    { class: 'warden', id: 'w1', at: [22.6, 24.8], group: 'post', yaw: Math.PI / 2 },
    { class: 'spearman', id: 's1', at: [29.5, 27.4], group: 'post', yaw: -Math.PI / 2 },
    { class: 'archer', id: 'a1', at: [33.5, 22.0], group: 'post', yaw: -Math.PI / 2 },
    { class: 'warden', id: 'w2', at: [36.8, 4.6], group: 'barracks', yaw: Math.PI },
    { class: 'spearman', id: 's2', at: [39.6, 6.2], group: 'barracks', yaw: Math.PI },
    { class: 'archer', id: 'a2', at: [43.2, 4.4], group: 'barracks', yaw: Math.PI },
    { class: 'warden', id: 'w3', at: [41.6, 6.6], group: 'barracks', yaw: Math.PI },
    { class: 'captain', id: 'c1', at: [58.5, 14], group: 'landing', yaw: -Math.PI / 2 },
    { class: 'warden', id: 'w4', at: [56.5, 10.8], group: 'landing', yaw: -Math.PI / 2 },
    { class: 'spearman', id: 's3', at: [56.5, 17.2], group: 'landing', yaw: -Math.PI / 2 },
    { class: 'archer', id: 'a3', at: [60.2, 10.2], group: 'landing', yaw: -Math.PI / 2 },
    { class: 'trigger_exit', x: 61.6 },
  ],
  // README §10: flags and actions. solve() below proves it can't softlock.
  puzzle: {
    flags: ['free', 'has_dagger', 'has_bone', 'shukeli_at_bars', 'shukeli_dead', 'has_keys', 'grille_open', 'has_spear', 'portcullis_open'],
    actions: [
      { id: 'slip_chain', needs: [], sets: 'free', at: 'cell', clue: 'insc_cell' },
      { id: 'take_dagger', needs: ['free'], sets: 'has_dagger', at: 'hall' },
      { id: 'take_bone', needs: ['free'], sets: 'has_bone', at: 'a2', repeatable: true },
      { id: 'throw_bone', needs: ['has_bone'], sets: 'shukeli_at_bars', clears: ['has_bone'], at: 'niche', clue: 'insc_grille' },
      { id: 'strike', needs: ['shukeli_at_bars', 'has_dagger'], sets: 'shukeli_dead', at: 'niche' },
      { id: 'take_keys', needs: ['shukeli_dead'], sets: 'has_keys', at: 'niche' },
      { id: 'unlock', needs: ['has_keys'], sets: 'grille_open', at: 'grille' },
      { id: 'take_spear', needs: ['grille_open'], sets: 'has_spear', at: 'barracks', repeatable: true },
      { id: 'jam_winch', needs: ['has_spear'], sets: 'portcullis_open', clears: ['has_spear'], at: 'winch', clue: 'insc_winch' },
    ],
    goal: 'portcullis_open',
  },
};

// ---- tiny puzzle solver (README §10: reachable, and no softlocks) ---------
function solvePuzzle(pz) {
  const key = s => [...s].sort().join(',');
  const start = new Set(), seen = new Map(), queue = [start];
  seen.set(key(start), start);
  const next = s => pz.actions.filter(a => a.needs.every(f => s.has(f)) && (a.repeatable || !s.has(a.sets))).map(a => {
    const n = new Set(s); n.add(a.sets); (a.clears || []).forEach(f => n.delete(f));
    // transient flags: Shukeli wanders back from the bars, so it can always be re-earned
    return n;
  });
  while (queue.length) {
    const s = queue.shift();
    for (const n of next(s)) { const k = key(n); if (!seen.has(k)) { seen.set(k, n); queue.push(n); } }
  }
  const states = [...seen.values()];
  const canReach = s => {
    const q = [s], v = new Set([key(s)]);
    while (q.length) { const c = q.shift(); if (c.has(pz.goal)) return true; for (const n of next(c)) { const k = key(n); if (!v.has(k)) { v.add(k); q.push(n); } } }
    return false;
  };
  const stuck = states.filter(s => !canReach(s));
  return { states: states.length, goalReachable: states.some(s => s.has(pz.goal)), softlocks: stuck.map(key) };
}

// ---- build ------------------------------------------------------------------
const LV = {};
function buildLevel(spec) {
  const [W, H] = spec.grid, N = W * H;
  Object.assign(LV, {
    spec, W, H, kind: new Uint8Array(N), floor: new Float32Array(N), ceil: new Float32Array(N), flags: new Uint8Array(N),
    room: new Int8Array(N).fill(-1), rough: new Float32Array(N).fill(1), vault: new Float32Array(N), tex: new Array(N),
    rooms: spec.rooms, features: [], props: [], lights: [], colliders: [], items: [], blockers: new Set(), corners: null,
  });
  spec.rooms.forEach((r, ri) => {
    const st = r.style === 'hewn';
    const tex = Object.assign(st ? { floor: 'FLAG', wall: 'HEWN', ceil: 'HEWN' } : { floor: 'ROCK', wall: 'ROCK', ceil: 'ROCK' }, r.tex || {});
    for (let j = 0; j < r.size[1]; j++) for (let i = 0; i < r.size[0]; i++) {
      const gx = r.at[0] + i, gz = r.at[1] + j, idx = gz * W + gx;
      const wx = (gx + 0.5) * CELL, wz = (gz + 0.5) * CELL;
      let fl = (r.floor || 0) + (st ? (vnoise(wx * 0.5, wz * 0.5, 7) - 0.5) * 0.06 : (vnoise(wx * 0.4, wz * 0.4, 9) - 0.5) * 0.5);
      if (r.rise) fl = r.floor + (r.riseAxis === 'z' ? j : i) * r.rise;
      if (r.slope) fl = r.slope[0] + (r.slope[1] - r.slope[0]) * (j / (r.size[1] - 1));
      LV.kind[idx] = r.pit ? 2 : 1;
      LV.floor[idx] = r.pit ? fl - r.pit : fl;
      LV.ceil[idx] = r.pit ? LV.ceil[idx] || fl + 4 * CELL : fl + (r.h || 2) * CELL;
      LV.room[idx] = ri; LV.rough[idx] = st ? 0.12 : 1; LV.vault[idx] = r.vault || 0; LV.tex[idx] = tex;
      LV.flags[idx] = (r.hide ? F_HIDE : 0) | (r.nopass ? F_NOPASS : 0) | (r.id === 'serpent' ? F_SLIME : 0);
    }
  });
  for (const s of spec.shafts) {
    const idx = s.at[1] * W + s.at[0];
    LV.ceil[idx] = LV.floor[idx] + s.h * CELL; LV.flags[idx] |= F_TALL | F_SKY;
  }
  for (const l of spec.links) for (const [gx, gz] of l.cells) LV.blockers.add(gz * W + gx);
  // corners are shared by every cell that touches them: watertight, but jittered
  LV.corners = new Array((W + 1) * (H + 1));
  for (let gz = 0; gz <= H; gz++) for (let gx = 0; gx <= W; gx++) LV.corners[gz * (W + 1) + gx] = computeCorner(gx, gz);

  const W2 = (gx, gz) => [gx * CELL, gz * CELL];
  for (const p of spec.props) {
    const [x, z] = W2(p.at[0], p.at[1]);
    const prop = Object.assign({}, p, { x, z, y: groundInfo(x + wallIn(p.wall)[0] * 0.6, z + wallIn(p.wall)[1] * 0.6).floor });
    LV.props.push(prop);
    if (p.prefab === 'torch') {
      const n = wallIn(p.wall);
      LV.lights.push({ x: x + n[0] * 0.9, y: prop.y + 2.6, z: z + n[1] * 0.9, r: 1.0, g: 0.6, b: 0.28, rad: 15, i: 1.6 });
    } else if (p.prefab === 'brazier') {
      LV.lights.push({ x, y: prop.y + 1.6, z, r: 1.0, g: 0.55, b: 0.22, rad: 16, i: 1.9 });
      LV.colliders.push({ x, z, r: 0.75 });
    } else if (p.prefab === 'table') LV.colliders.push({ x, z, r: 1.15 });
    else if (p.prefab === 'column') LV.colliders.push({ x, z, r: 0.75 });
    else if (p.prefab === 'winch') LV.colliders.push({ x, z, r: 0.45 });
    else if (p.prefab === 'bunk') { LV.colliders.push({ x: x - 0.6, z, r: 0.55 }); LV.colliders.push({ x: x + 0.6, z, r: 0.55 }); }
    else if (p.prefab === 'stool') LV.colliders.push({ x, z, r: 0.35 });
  }
  for (const l of spec.lights) {
    const [x, z] = W2(l.at[0], l.at[1]);
    LV.lights.push({ x, y: l.y, z, r: l.col[0], g: l.col[1], b: l.col[2], rad: l.rad, i: l.i });
  }
  for (const f of spec.features) {
    const [x, z] = W2(f.at[0], f.at[1]);
    LV.features.push(Object.assign({}, f, { x, z, y: groundInfo(x + wallIn(f.wall)[0] * 0.5, z + wallIn(f.wall)[1] * 0.5).floor + (f.y || 0), baseY: f.y || 0 }));
  }
  spec.items.forEach((it, n) => {
    const [x, z] = W2(it.at[0], it.at[1]);
    LV.items.push(Object.assign({}, it, { id: 'i' + n, x, z, y: it.y !== undefined ? groundInfo(x, z).floor + it.y : groundInfo(x, z).floor }));
  });
}
// unit vector pointing out of a wall into the room
function wallIn(w) { return w === 'N' ? [0, 1] : w === 'S' ? [0, -1] : w === 'E' ? [-1, 0] : w === 'W' ? [1, 0] : [0, 0]; }

// ---- queries ----------------------------------------------------------------
function cellIdx(gx, gz) { return (gx < 0 || gz < 0 || gx >= LV.W || gz >= LV.H) ? -1 : gz * LV.W + gx; }
function kindAt(gx, gz) { const i = cellIdx(gx, gz); return i < 0 ? 0 : LV.kind[i]; }

function computeCorner(gx, gz) {
  let nOpen = 0, sumF = 0, nPit = 0, sumP = 0, nNS = 0, sumC = 0, maxC = -1e9, tall = false, sx = 0, sz = 0, nSolid = 0, rough = 0, vault = 0;
  for (let k = 0; k < 4; k++) {
    const ix = gx - 1 + (k & 1), iz = gz - 1 + (k >> 1), idx = cellIdx(ix, iz), kind = idx < 0 ? 0 : LV.kind[idx];
    if (kind === 0) { nSolid++; sx += ix + 0.5 - gx; sz += iz + 0.5 - gz; continue; }
    nNS++; const c = LV.ceil[idx]; sumC += c; if (c > maxC) maxC = c;
    rough += LV.rough[idx]; vault = Math.max(vault, LV.vault[idx]);
    if (LV.flags[idx] & F_TALL) tall = true;
    if (kind === 1) { nOpen++; sumF += LV.floor[idx]; } else { nPit++; sumP += LV.floor[idx]; }
  }
  rough = nNS ? rough / nNS : 1;
  const fo = nOpen ? sumF / nOpen : (nPit ? sumP / nPit : 0), fp = nPit ? sumP / nPit : fo;
  const h = hrand(gx, gz, 2, 33);
  let c = nNS ? (tall ? maxC : sumC / nNS + (h - 0.5) * 0.6 * rough) : 0;
  if (nSolid > 0 && vault > 0 && !tall) c -= vault;           // vaulted hewn ceilings
  let jx = 0, jz = 0;
  if (nSolid > 0 && nSolid < 4) { const l = Math.hypot(sx, sz); if (l > 0.01) { jx = sx / l; jz = sz / l; } }
  const amt = (0.12 + 0.3 * h) * CELL * rough;
  return { gx, gz, x: gx * CELL + jx * amt, z: gz * CELL + jz * amt, fo, fp, c, jx, jz, bul: (0.1 + 0.35 * hrand(gx, gz, 5, 99)) * CELL * rough };
}
function corner(gx, gz) { return LV.corners[clamp(gz, 0, LV.H) * (LV.W + 1) + clamp(gx, 0, LV.W)]; }

function groundInfo(x, z) {
  const gx = Math.floor(x / CELL), gz = Math.floor(z / CELL), idx = cellIdx(gx, gz), kind = idx < 0 ? 0 : LV.kind[idx];
  const info = { kind, idx, gx, gz, flags: idx < 0 ? 0 : LV.flags[idx], room: idx < 0 ? -1 : LV.room[idx], floor: 0, ceil: 0 };
  if (kind === 0) { info.floor = 1e9; info.ceil = -1e9; return info; }
  const fx = x / CELL - gx, fz = z / CELL - gz;
  const c00 = corner(gx, gz), c10 = corner(gx + 1, gz), c01 = corner(gx, gz + 1), c11 = corner(gx + 1, gz + 1);
  const f = kind === 2 ? 'fp' : 'fo';
  const bil = (a, b, c, d) => (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  info.floor = bil(c00[f], c10[f], c01[f], c11[f]);
  info.ceil = bil(c00.c, c10.c, c01.c, c11.c);
  return info;
}
function los(ax, ay, az, bx, by, bz) {
  const d = Math.hypot(bx - ax, by - ay, bz - az), n = Math.ceil(d / 0.5);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
    const idx = cellIdx(Math.floor(x / CELL), Math.floor(z / CELL));
    if (idx < 0 || LV.kind[idx] === 0) return false;
    if (LV.kind[idx] === 1 && (y < LV.floor[idx] - 0.4 || y > LV.ceil[idx] + 0.3)) return false;
  }
  return true;
}
function roomIdAt(x, z) { const g = groundInfo(x, z); return g.room >= 0 ? LV.rooms[g.room].id : ''; }
