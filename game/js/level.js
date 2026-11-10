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

const F_HIDE = 1, F_NOPASS = 2, F_TALL = 4, F_SKY = 8, F_SLIME = 16, F_WIND = 32, F_WATER = 64;

// Pacing (README §9): every level alternates PUZZLE areas (think, read,
// time things) and ACTION areas (fight). e1m2 runs:
//   cell (puzzle) -> hall (timing puzzle) -> wardens' post (action) ->
//   grille (puzzle) -> guardroom + barracks (action) -> winch (puzzle) ->
//   captain's landing (action) -> exit.
const LEVEL_E1M2 = {
  // strip: the king wakes in chains; whatever he carried on the plain is gone
  level: 'e1m2', next: 'e1m3', strip: true, ambient: [0.05, 0.046, 0.04], exitVoid: { from: [65.5, 14], to: [72, 14], w: 3.5 }, title: 'The Pits', ramps: ['ink', 'jade', 'fire'], grid: [72, 32],
  // README §9, e1m2: the book's beats in the book's order (ch. II–III)
  areas: [
    { id: 'vault', type: 'puzzle', name: 'The Vault', rooms: ['cell', 'arch'] },
    { id: 'hall', type: 'puzzle', name: 'The Main Corridor', rooms: ['hall', 'well', 'a1', 'a2', 'a3', 'n1', 'n2'], cp: [7.5, 12.4, Math.PI] },
    { id: 'post', type: 'action', name: 'The Gnawed Tunnels', rooms: ['south_passage', 'post', 'gallery', 'gsteps'], cp: [26.8, 16.5, Math.PI] },
    { id: 'east', type: 'puzzle', name: 'The Corridor East', rooms: ['niche', 'narrows'], cp: [32.6, 16, 0] },
    { id: 'vaults', type: 'action', name: 'The Old Vaults', rooms: ['guard', 'breach', 'den'], cp: [36.5, 14, -Math.PI / 2] },
    { id: 'pits', type: 'puzzle', name: 'The Pitted Way', rooms: ['nook', 'narrow', 'slope', 'landing', 'stone'], cp: [44.2, 14, -Math.PI / 2] },
    { id: 'bonepit', type: 'action', name: 'The Bone Pit', rooms: ['bonepit', 'exit'], cp: [60.6, 14, -Math.PI / 2] },
  ],
  rooms: [
    { id: 'stairfoot', name: 'the foot of the stair', at: [6, 3], size: [4, 4], h: 3, style: 'hewn' },
    { id: 'grille_door', name: 'the grille', at: [7, 7], size: [1, 1], h: 1.4, style: 'hewn' },
    { id: 'cell', name: 'the Vault', at: [6, 8], size: [4, 4], h: 2.1, style: 'hewn', tex: { floor: 'STRAW' }, hide: true },
    { id: 'arch', name: 'the dark arch', at: [7, 12], size: [1, 1], h: 1.3, style: 'hewn', hide: true },
    { id: 'hall', name: 'the Main Corridor', at: [3, 13], size: [31, 2], h: 4, vault: 2.2, style: 'hewn' },
    { id: 'well', name: 'the Serpent\'s Well', at: [3, 13], size: [2, 2], pit: 40, style: 'rough', tex: { wall: 'ROCK' } },
    { id: 'a1', name: 'a side tunnel', at: [11, 15], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'a2', name: 'a side tunnel', at: [17, 15], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'a3', name: 'a side tunnel', at: [23, 15], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'n1', name: 'a side tunnel', at: [14, 11], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'n2', name: 'a side tunnel', at: [20, 11], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'niche', name: 'a side tunnel', at: [32, 15], size: [2, 2], h: 1.6, style: 'hewn', hide: true },
    { id: 'serpent', name: 'the Serpent\'s Hole', at: [27, 4], size: [2, 9], h: 2.4, style: 'rough', slope: [-14, 0], nopass: true, tex: { wall: 'ROCK', floor: 'SLIME', ceil: 'ROCK' } },
    { id: 'south_passage', name: 'the Gnawed Passage', at: [26, 15], size: [2, 5], h: 2, style: 'rough', hide: true },
    { id: 'post', name: 'the Gnawed Hall', at: [20, 20], size: [12, 9], h: 3.6, vault: 1.4, style: 'hewn' },
    { id: 'gallery', name: 'a ledge', at: [32, 20], size: [3, 6], h: 2.4, floor: 2.4, style: 'hewn' },
    { id: 'gsteps', name: 'a broken stair', at: [32, 26], size: [3, 3], h: 2.6, floor: 1.6, rise: -0.8, riseAxis: 'z', style: 'hewn' },
    { id: 'narrows', name: 'the Narrows', at: [34, 13], size: [1, 2], h: 3, style: 'rough' },
    { id: 'guard', name: 'the Old Vaults', at: [35, 9], size: [10, 10], h: 3.4, floor: 0.4, vault: 1.2, style: 'hewn' },
    { id: 'breach', name: 'a breach', at: [39, 8], size: [2, 1], h: 1.4, floor: 0.4, style: 'rough' },
    { id: 'den', name: 'the Den', at: [35, 2], size: [10, 6], h: 2.6, floor: 0.4, style: 'rough' },
    { id: 'nook', name: 'a niche', at: [45, 16], size: [1, 2], h: 1.4, floor: 0.4, style: 'hewn' },
    { id: 'narrow', name: 'the Narrow Way', at: [45, 13], size: [1, 2], h: 2.4, floor: 0.4, style: 'rough' },
    { id: 'slope', name: 'the Pitted Way', at: [46, 13], size: [7, 2], h: 2.6, floor: 1.4, rise: 1.0, style: 'rough' },
    { id: 'landing', name: 'the Pitted Way', at: [53, 9], size: [8, 10], h: 3.4, floor: 7.4, vault: 1.2, style: 'hewn' },
    // the pits span the way from wall to wall: leap the first, cross the second on a single stone, leap the third
    { id: 'pit1', name: 'a pit', at: [54, 9], size: [1, 10], floor: 7.4, pit: 34, void: true, style: 'rough', tex: { wall: 'ROCK' } },
    { id: 'pit2', name: 'a pit', at: [56, 9], size: [3, 10], floor: 7.4, pit: 34, void: true, style: 'rough', tex: { wall: 'ROCK' } },
    { id: 'stone', name: 'a stone left standing', at: [57, 11], size: [1, 1], h: 3.4, floor: 7.4, style: 'rough' },
    { id: 'pit3', name: 'a pit', at: [60, 9], size: [1, 10], floor: 7.4, pit: 34, void: true, style: 'rough', tex: { wall: 'ROCK' } },
    { id: 'bonepit', name: 'the Bone Pit', at: [61, 11], size: [4, 6], h: 3, floor: 7.4, style: 'rough' },
    { id: 'exit', name: 'a dank tunnel', at: [65, 13], size: [6, 2], h: 1.6, floor: 7.4, style: 'rough' },
  ],
  // rotten planks laid across the pitted way: tempting, and they will not take a man's weight for long
  planks: [{ from: [53.9, 17.5], to: [55.1, 17.5] }, { from: [59.9, 10.5], to: [61.1, 10.5] }],
  shafts: [],
  links: [
    // "pulling the grille partly to behind it, leaving the bolt poised": the vault's grille, onto the stair foot
    { a: 'cell', b: 'stairfoot', via: 'barred_door', name: 'cell_door', cells: [[7, 7]] },
  ],
  props: [
    // the main corridor: a few old torches near the vault; beyond, only your own
    { prefab: 'torch', at: [10.5, 13], wall: 'N', dim: 0.7 }, { prefab: 'torch', at: [15.5, 15], wall: 'S', dim: 0.6 }, { prefab: 'torch', at: [22.5, 13], wall: 'N', dim: 0.5 },
    { prefab: 'torch', at: [7.5, 3], wall: 'N', dim: 0.5 },
    { prefab: 'bones', at: [17.6, 16.3], big: true }, { prefab: 'bones', at: [5.6, 14.6] }, { prefab: 'bones', at: [12.4, 16.4] },
    { prefab: 'bones', at: [29.2, 13.5] }, { prefab: 'skull', at: [5.2, 13.4] }, { prefab: 'skull', at: [24.6, 16.5] },
    { prefab: 'chains', at: [13, 13], wall: 'N' }, { prefab: 'chains', at: [19.5, 15], wall: 'S' }, { prefab: 'chains', at: [25.5, 13], wall: 'N' },
    { prefab: 'chains', at: [9, 8], wall: 'N' },
    // the gnawed hall: old pillars, gnawed bone
    { prefab: 'column', at: [23.5, 23.5] }, { prefab: 'column', at: [23.5, 26.5] }, { prefab: 'column', at: [28.5, 23.5] }, { prefab: 'column', at: [28.5, 26.5] },
    { prefab: 'bones', at: [26, 25], big: true }, { prefab: 'bones', at: [21.6, 21.6] }, { prefab: 'skull', at: [30.5, 27.8] }, { prefab: 'bones', at: [33.5, 24] },
    // the old vaults and the den
    { prefab: 'column', at: [38.5, 12] }, { prefab: 'column', at: [38.5, 16] }, { prefab: 'column', at: [42.5, 12] }, { prefab: 'column', at: [42.5, 16] },
    { prefab: 'bones', at: [40, 14], big: true }, { prefab: 'skull', at: [36.2, 17.6] },
    { prefab: 'bones', at: [37, 4], big: true }, { prefab: 'bones', at: [41.5, 3.5], big: true }, { prefab: 'bones', at: [43.5, 6.5] }, { prefab: 'skull', at: [39.5, 2.6] },
    // the pitted way and the bone pit
    { prefab: 'bones', at: [55.5, 17.6] }, { prefab: 'skull', at: [59.4, 9.5] },
    { prefab: 'bones', at: [62, 12], big: true }, { prefab: 'bones', at: [63.6, 15.6], big: true }, { prefab: 'skull', at: [64.3, 11.7] },
  ],
  lights: [
    { at: [4, 14], y: -4, col: [0.25, 0.55, 0.38], rad: 10, i: 0.9 },             // slime glow in the well
    { at: [28, 7], y: -8, col: [0.25, 0.55, 0.38], rad: 9, i: 0.6 },              // slime glow in the serpent's hole
    { at: [6.4, 9.4], y: 2.4, col: [1.0, 0.6, 0.28], rad: 11, i: 1.5 },           // the torch in the niche above the king
  ],
  features: [
    { type: 'ring', at: [6.08, 9.4], y: 1.0, wall: 'W' },
    { type: 'niche_torch', at: [6.12, 9.4], y: 2.4 },
    { type: 'clue', id: 'insc_cell', at: [6.04, 10.8], y: 1.3, wall: 'W',
      text: 'Scratched low in the stone, by some earlier prisoner: "IT COMES TO THE TORCH. LIE STILL AS STONE AND IT WILL GO."' },
    { type: 'clue', id: 'insc_hall', at: [9.5, 14.96], y: 1.3, wall: 'S',
      text: 'Tally marks, hundreds of them, then: "IT PASSES EVERY FORTY BREATHS. WHEN THE FLAMES BOW, GET INTO THE WALL."' },
    { type: 'clue', id: 'insc_post', at: [27.96, 17.5], y: 1.3, wall: 'E',
      text: 'Cut into the passage wall: "THE THINGS DOWN HERE GIVE THE SERPENT ROOM. WHEN SHE PASSES, THEY RUN. WHEN SHE IS GONE, THEY COME BACK."' },
    { type: 'clue', id: 'insc_pits', at: [48.5, 13.04], y: 1.3, wall: 'N',
      text: 'Gouged into the rock: "WATCH THE FLOOR. THE PITS HERE HAVE NO BOTTOM."' },
    { type: 'door', link: 'cell_door', at: [7.5, 8.1], y: 1.2 },
  ],
  items: [
    { kind: 'bread', name: 'crust of black bread', at: [9.4, 11.4], heal: 25 },
    { kind: 'wine', name: 'dead man\'s water-skin', at: [23.8, 16.3], heal: 15 },
    { kind: 'bread', name: 'gnawed crust', at: [22.6, 27.6], heal: 25 },
    { kind: 'wine', name: 'rotted water-skin', at: [36.2, 17.6], heal: 25 },
    { kind: 'bread', name: 'dead prisoner\'s crust', at: [53.5, 9.6], heal: 25 },
    { kind: 'wine', name: 'acolyte\'s water-skin', at: [63.6, 12.4], heal: 25 },
  ],
  entities: [
    { class: 'info_player_start', at: [6.9, 9.6], yaw: -Math.PI / 2, flags: ['chained'] },
    { class: 'black_giant', at: [7.5, 4.6], yaw: 0 },
    { class: 'scripted_satha', period: 40, vaultPasses: 2 },
    { class: 'monster_shukeli', at: [8.5, 3.6] },
    // "monsters with dripping jaws agape": the pits' nameless things, where the book puts them
    { class: 'thing', id: 'p0', at: [26.6, 18.6], group: 'post', lurk: true },
    { class: 'thing', id: 'p1', at: [24, 22], group: 'post', yaw: 0 },
    { class: 'thing', id: 'p2', at: [28, 25], group: 'post', yaw: 0 },
    { class: 'thing', id: 'p3', at: [22, 27], group: 'post', yaw: Math.PI / 2 },
    { class: 'thing', id: 'p4', at: [30, 21], group: 'post', lurk: true },
    { class: 'thing', id: 'p5', at: [33.5, 22.5], group: 'post', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'v1', at: [37, 11], group: 'vaults', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'v2', at: [41, 15], group: 'vaults', lurk: true },
    { class: 'thing', id: 'v3', at: [36.5, 16], group: 'vaults', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'v4', at: [37.5, 4], group: 'vaults', yaw: Math.PI },
    { class: 'thing', id: 'v5', at: [40.5, 5], group: 'vaults', lurk: true },
    { class: 'thing', id: 'v6', at: [43.5, 3], group: 'vaults', yaw: Math.PI },
    { class: 'thing', id: 'l1', at: [55.5, 15.5], group: 'pits', lurk: true },
    { class: 'thing', id: 'b1', at: [62, 12.5], group: 'bonepit', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'b2', at: [63.5, 15.2], group: 'bonepit', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'b3', at: [62.6, 13.8], group: 'bonepit', lurk: true },
    { class: 'thing', id: 'b4', at: [64, 12], group: 'bonepit', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'b5', at: [64.5, 14], group: 'bonepit', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'b6', at: [63, 16], group: 'bonepit', yaw: -Math.PI / 2 },
    { class: 'trigger_exit', rect: [68, 0, 72, 32] },
  ],
  // README §10: flags and actions, in the book's order. solve() proves it can't softlock.
  puzzle: {
    flags: ['keys_down', 'free', 'has_sword', 'shukeli_dead', 'has_torch'],
    actions: [
      { id: 'satha_takes_the_black', needs: [], sets: 'keys_down', at: 'cell', clue: 'insc_cell' },
      { id: 'grip_keys_with_toes', needs: ['keys_down'], sets: 'free', at: 'cell' },
      { id: 'take_sword', needs: ['free'], sets: 'has_sword', at: 'cell' },
      { id: 'strike_through_bars', needs: ['has_sword'], sets: 'shukeli_dead', at: 'cell' },
      { id: 'take_torch', needs: ['shukeli_dead'], sets: 'has_torch', at: 'cell' },
    ],
    goal: 'has_torch',
  },
};


// ---------------------------------------------------------------------------
// e1m3 "The Tunnels Below" (ch. III), beat by beat (README §9):
//   the weeping (puzzle) -> the weeping thing (combat, flight) -> the well (puzzle) ->
//   the dark (combat) -> the crossing (puzzle) -> the side tunnels (combat) ->
//   Satha returns (puzzle) -> the cage of bars with a garden in it.
// ---------------------------------------------------------------------------
const CAVE_TEX = { wall: 'CAVE', floor: 'MUD', ceil: 'CAVE' };
const LEVEL_E1M3 = {
  level: 'e1m3', next: 'e1m4', title: 'The Tunnels Below', ramps: ['ink', 'jade', 'magic'], grid: [64, 40], ambient: [0.06, 0.064, 0.058], arms: 'sword',
  torch: true,                                             // "lifting his torch" (ch. III): Conan carries the torch from the vault
  areas: [
    { id: 'weeping', type: 'puzzle', name: 'The Weeping', rooms: ['dank', 'fork1', 'dead_n', 'weep1', 'fork2', 'dead_s', 'weep2'] },
    { id: 'weeper', type: 'action', name: 'The Weeping Thing', rooms: ['weep_den', 'hollow', 'flight', 'flight_break', 'flight2'], cp: [22, 10, 0] },
    { id: 'well', type: 'puzzle', name: 'The Well', rooms: ['cross_n'], cp: [39, 14, Math.PI] },
    { id: 'dark', type: 'action', name: 'The Dark', rooms: ['cross_s', 'blind', 'loop1', 'loop2', 'loop_gap', 'loop3'], cp: [41, 25, Math.PI] },
    { id: 'crossing', type: 'puzzle', name: 'The Crossing', rooms: ['loop4'], cp: [44.5, 15, Math.PI / 2] },
    { id: 'side', type: 'action', name: 'The Side Tunnels', rooms: ['out1', 'out2', 'corridor_w', 'side1', 'side2', 'side3'], cp: [28, 24, Math.PI] },
    { id: 'satha', type: 'puzzle', name: 'Satha Returns', rooms: ['corridor_e', 'alcove1', 'alcove2'], cp: [40.5, 31.5, -Math.PI / 2] },
  ],
  // a rotten plank someone laid across the well: it will not hold for long
  planks: [{ from: [42.6, 16.9], to: [42.6, 18.1] }],
  rooms: [
    // the weeping: "a sound that made his skin crawl ... a woman weeping"
    { id: 'dank', name: 'a dank tunnel', at: [2, 16], size: [6, 2], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'fork1', name: 'a fork in the tunnels', at: [8, 14], size: [4, 6], h: 3, style: 'rough', tex: CAVE_TEX },
    { id: 'dead_n', name: 'a blind tunnel', at: [9, 8], size: [2, 6], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'weep1', name: 'a dank tunnel', at: [12, 16], size: [8, 2], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'fork2', name: 'a fork in the tunnels', at: [20, 14], size: [4, 6], h: 3, style: 'rough', tex: CAVE_TEX },
    { id: 'dead_s', name: 'a blind tunnel', at: [21, 20], size: [2, 5], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'weep2', name: 'a dank tunnel', at: [21, 7], size: [2, 7], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'weep_den', name: 'a low cave', at: [16, 1], size: [12, 6], h: 4, style: 'rough', tex: CAVE_TEX },
    { id: 'hollow', name: 'a wallow', at: [24, 7], size: [2, 3], h: 2.4, style: 'rough', tex: { wall: 'CAVE', floor: 'SLIME', ceil: 'CAVE' } },
    { id: 'flight', name: 'a tunnel', at: [28, 3], size: [12, 2], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'flight_break', name: 'a break in the tunnel floor', at: [31, 3], size: [3, 2], h: 2.4, pit: 0.8, style: 'rough', tex: CAVE_TEX },   // a step down, and a hop up the far side
    { id: 'flight2', name: 'a tunnel', at: [38, 5], size: [2, 8], h: 2.4, style: 'rough', tex: CAVE_TEX },
    // the well, in the chamber where the tunnels cross
    { id: 'cross_n', name: 'the chamber where the tunnels cross', at: [34, 13], size: [10, 4], h: 6, style: 'rough', tex: CAVE_TEX },
    { id: 'well', name: 'the well', at: [34, 17], size: [10, 1], h: 6, pit: 50, void: true, style: 'rough', tex: CAVE_TEX },
    { id: 'cross_s', name: 'the chamber where the tunnels cross', at: [34, 18], size: [10, 5], h: 6, style: 'rough', tex: CAVE_TEX },
    { id: 'blind', name: 'a tunnel choked with fallen rock', at: [35, 23], size: [2, 4], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'loop1', name: 'a black tunnel', at: [40, 23], size: [2, 4], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'loop2', name: 'a black tunnel', at: [40, 27], size: [8, 2], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'loop_gap', name: 'a black tunnel', at: [44, 27], size: [1, 2], h: 2.2, pit: 40, void: true, style: 'rough', tex: CAVE_TEX },   // leapt in the dark
    { id: 'loop3', name: 'a black tunnel', at: [46, 14], size: [2, 13], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'loop4', name: 'a black tunnel', at: [44, 14], size: [2, 2], h: 2.4, style: 'rough', tex: CAVE_TEX },
    // the way back to the main corridor, and the things in its side tunnels
    { id: 'out1', name: 'a tunnel with a draft in it', at: [27, 20], size: [7, 2], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'out2', name: 'a tunnel with a draft in it', at: [27, 22], size: [2, 8], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'corridor_w', name: 'the main corridor', at: [4, 30], size: [36, 3], h: 5, vault: 1.2, style: 'hewn' },
    { id: 'side1', name: 'a side tunnel', at: [30, 33], size: [2, 5], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'side2', name: 'a side tunnel', at: [36, 33], size: [2, 5], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'side3', name: 'a side tunnel', at: [20, 33], size: [2, 4], h: 2.2, style: 'rough', tex: CAVE_TEX },
    // Satha's return: "he leaped into a side tunnel and shook out his torch"
    { id: 'corridor_e', name: 'the main corridor', at: [40, 30], size: [18, 3], h: 5, vault: 1.2, style: 'hewn' },
    { id: 'alcove1', name: 'a side tunnel', at: [44, 33], size: [2, 2], h: 2.2, hide: true, style: 'rough', tex: CAVE_TEX },
    { id: 'alcove2', name: 'a side tunnel', at: [50, 33], size: [2, 2], h: 2.2, hide: true, style: 'rough', tex: CAVE_TEX },
    { id: 'serpent_hole', name: 'the serpent\'s hole', at: [54, 27], size: [2, 3], h: 5, nopass: true, style: 'rough', tex: { wall: 'CAVE', floor: 'SLIME', ceil: 'CAVE' } },
    { id: 'serpent_well', name: 'the serpent\'s well', at: [1, 30], size: [3, 3], h: 5, nopass: true, style: 'rough', tex: { wall: 'CAVE', floor: 'SLIME', ceil: 'CAVE' } },
    { id: 'garden', name: 'a cage of bars', at: [58, 29], size: [4, 5], h: 5, nopass: true, style: 'hewn', tex: { floor: 'TURF' } },
  ],
  shafts: [], links: [],
  props: [
    { prefab: 'bones', at: [10, 9] }, { prefab: 'skull', at: [9.4, 8.6] }, { prefab: 'bones', at: [22, 24.2], big: true },
    { prefab: 'stal', at: [18.5, 2.5] }, { prefab: 'stal', at: [26.5, 2.2] }, { prefab: 'bones', at: [20, 5.5] }, { prefab: 'bones', at: [25, 8.2], big: true },
    { prefab: 'bones', at: [34.5, 4.2] }, { prefab: 'stal', at: [35.2, 21.8] }, { prefab: 'stal', at: [42.8, 13.8] },
    { prefab: 'bones', at: [36, 26.2], big: true }, { prefab: 'bones', at: [47, 20] }, { prefab: 'skull', at: [44, 28.3] },
    { prefab: 'bones', at: [31, 37.2] }, { prefab: 'bones', at: [37, 37.2], big: true }, { prefab: 'bones', at: [21, 36.2] },
    { prefab: 'torch', at: [12, 30], wall: 'N' }, { prefab: 'torch', at: [21, 30], wall: 'N' }, { prefab: 'torch', at: [34, 30], wall: 'N' },
    { prefab: 'torch', at: [42, 30], wall: 'N' }, { prefab: 'torch', at: [49, 30], wall: 'N' }, { prefab: 'torch', at: [48, 33], wall: 'S' },
  ],
  lights: [
    { at: [60, 31.5], y: 2.5, col: [0.55, 0.85, 0.35], rad: 14, i: 1.8 }, { at: [59.5, 29.8], y: 3.5, col: [0.8, 0.7, 0.4], rad: 8, i: 0.9 },    // the garden glows behind its bars
    { at: [39, 17.5], y: -3, col: [0.5, 0.55, 0.6], rad: 7, i: 0.4 },       // a cold pallor down the well
    { at: [44.5, 28], y: -3, col: [0.45, 0.5, 0.55], rad: 5, i: 0.6 },      // and down the gap in the black tunnel
  ],
  // the weeping, "piteously, like a woman": where it seems to come from, until the thing shows itself
  weeping: { from: [22, 2.5], wake: { room: 'weep_den', z: 4.6 } },
  // the well's breath: gusts between which you leap; the presence; the draft from the main corridor
  well: { row: 17, x: [34, 44], ember: [39, 15.9], mouth: [33.6, 21], period: 5.5 },
  // Satha's road: up out of her hole by the cage, west down the main corridor, and down into her well
  satha: { area: 'satha', path: [[55, -36, 28], [55, 0.85, 28.4], [55, 0.85, 31.5], [6.5, 0.85, 31.5], [2.5, -9, 31.5], [2, -52, 31.5]] },
  features: [
    { type: 'clue', id: 'insc_dank', at: [2.04, 17], y: 1.3, wall: 'W',
      text: 'Scratched at the height of a crouching man: "Do not go after the weeping. It is not a woman."' },
    { type: 'clue', id: 'insc_well', at: [34.04, 14.6], y: 1.1, wall: 'W',
      text: 'Scratched low, by someone who lay here a long time: "It breathes up out of the well. Go where the air comes from, not where it goes."' },
    { type: 'clue', id: 'mark_three', at: [34.04, 19.4], y: 1.3, wall: 'W', text: 'Three cuts, gouged beside the tunnel mouth by some prisoner who went this way before you.' },
    { type: 'clue', id: 'insc_corridor', at: [31.5, 30.04], y: 1.4, wall: 'N',
      text: 'The flagstones of the main corridor are worn into a smooth trough down the middle, as if something enormous passes along it often.' },
  ],
  items: [
    { kind: 'bread', name: 'mouldy crust', at: [10, 9.6], heal: 25 },
    { kind: 'wine', name: 'leather water-skin', at: [17.2, 5.6], heal: 25 },
    { kind: 'wine', name: 'leather water-skin', at: [47, 22], heal: 25 },
    { kind: 'bread', name: 'mouldy crust', at: [31, 36.6], heal: 25 },
    { kind: 'wine', name: 'jug of water', at: [45, 34.2], heal: 25 },
  ],
  entities: [
    { class: 'info_player_start', at: [3.5, 17], yaw: -Math.PI / 2 },
    { class: 'thing', id: 'n1', at: [10, 10], group: 'dead_n', lurk: true },
    { class: 'thing', id: 'n2', at: [22, 23.5], group: 'dead_s', lurk: true },
    { class: 'weeper', id: 'wp', at: [25, 9.2], group: 'weeper', yaw: 0, hold: true, territory: ['weep_den', 'hollow', 'flight', 'flight2'] },
    { class: 'thing', id: 'd1', at: [32, 4], group: 'driven', yaw: Math.PI / 2, hold: true },
    { class: 'thing', id: 'd2', at: [36, 3.6], group: 'driven', yaw: Math.PI / 2, hold: true },
    { class: 'thing', id: 'd3', at: [39, 8], group: 'driven', yaw: 0, hold: true },
    { class: 'thing', id: 'k1', at: [41, 25.5], group: 'dark', lurk: true },
    { class: 'thing', id: 'k2', at: [46.3, 28], group: 'dark', yaw: Math.PI / 2 },
    { class: 'thing', id: 'k3', at: [47, 25], group: 'dark', lurk: true },
    { class: 'thing', id: 'k4', at: [47, 19], group: 'dark', yaw: Math.PI },
    { class: 'thing', id: 'k5', at: [36, 25.5], group: 'dark', lurk: true },
    { class: 'thing', id: 's1', at: [31, 35.5], group: 'side', yaw: Math.PI },
    { class: 'thing', id: 's2', at: [37, 36], group: 'side', lurk: true },
    { class: 'thing', id: 's3', at: [21, 35], group: 'side', yaw: Math.PI },
    { class: 'thing', id: 's4', at: [24, 31.5], group: 'side', yaw: -Math.PI / 2 },
    { class: 'thing', id: 's5', at: [35, 31], group: 'side', lurk: true },
    { class: 'thing', id: 's6', at: [30.5, 37], group: 'side', yaw: Math.PI },
    { class: 'thing', id: 's7', at: [20.5, 36], group: 'side', yaw: Math.PI },
    { class: 'thing', id: 's8', at: [36.5, 34], group: 'side', yaw: Math.PI },
    { class: 'trigger_exit', rect: [56, 29, 58, 33] },
  ],
  puzzle: {
    flags: ['found_it', 'crossed_well', 'torch_found', 'got_out', 'satha_passed'],
    actions: [
      { id: 'follow_the_weeping', needs: [], sets: 'found_it', at: 'weep_den' },
      { id: 'leap_the_well', needs: ['found_it'], sets: 'crossed_well', at: 'cross_s' },
      { id: 'find_the_ember', needs: ['crossed_well'], sets: 'torch_found', at: 'cross_n' },
      { id: 'go_where_the_air_comes_from', needs: ['torch_found'], sets: 'got_out', at: 'out1', clue: 'insc_well' },
      { id: 'hide_and_shake_out_the_torch', needs: ['got_out'], sets: 'satha_passed', at: 'alcove1' },
    ],
    goal: 'satha_passed',
  },
};

// ---------------------------------------------------------------------------
// e1m1 "The Plain of Shamu" (ch. I), played as the flashback after the pits.
// The last stand, fought across the field toward the heap of dead; it can't be
// won, and Tsotha's ring ends it.
// ---------------------------------------------------------------------------
const FIELD = { floor: 'TURF', wall: 'MUD', ceil: 'SUNSET' };   // open ground under the red sky
const STREAM = { floor: 'MUD', wall: 'MUD', ceil: 'SUNSET' };
const LEVEL_E1M1 = {
  level: 'e1m1', next: 'e1m2', title: 'The Plain of Shamu', ramps: ['earth', 'night', 'scarlet'], grid: [120, 64],
  ambient: [0.3, 0.18, 0.13], haze: [0.52, 0.1, 0.08], arms: 'sword',
  // no walls: the plain goes on to the horizon under the sky; a stream and lines of boulders close the field in
  open: true, fog: 0.011, sun: [-1, 0.07, 0.3], waterY: -0.5,
  groundFog: { density: 0.085, falloff: 0.7, floor: 0, col: [0.5, 0.15, 0.1] },   // the battle's smoke and the evening mist, lying on the dead
  areas: [
    { id: 'charge', type: 'action', name: 'The Broken Charge', rooms: ['charge'] },
    { id: 'arrows', type: 'puzzle', name: 'The Arrow Ground', rooms: ['gully', 'arrowground'], cp: [31, 31, -Math.PI / 2] },
    { id: 'line', type: 'action', name: 'The Shemite Line', rooms: ['rise'], cp: [58.5, 31, -Math.PI / 2] },
    { id: 'lanes', type: 'puzzle', name: 'The Riderless Horses', rooms: ['lanes'], cp: [67.5, 31, -Math.PI / 2] },
    { id: 'heap', type: 'action', name: 'The Heap of Dead', rooms: ['heap'], cp: [85, 31, -Math.PI / 2] },
  ],
  // the field runs west to east in bands as wide as the plain, so no beat can be walked round
  rooms: [
    { id: 'plain', name: 'the plain of Shamu', at: [0, 0], size: [120, 64], nopass: true, sky: true, tex: FIELD },
    { id: 'charge', name: 'the field of the last charge', at: [3, 5], size: [31, 53], sky: true, tex: FIELD },
    { id: 'arrowground', name: 'the arrow ground', at: [34, 5], size: [27, 53], sky: true, tex: FIELD },
    { id: 'gully', name: 'a gully of dead', at: [33, 5], size: [4, 26], floor: -1.0, hide: true, sky: true, tex: FIELD },   // a sunken gully: its banks slope down a metre; the arrows can't find you in it
    { id: 'gully', name: 'a gully of dead', at: [34, 31], size: [4, 27], floor: -1.0, hide: true, sky: true, tex: FIELD },
    { id: 'rise', name: 'the Shemite rise', at: [61, 5], size: [8, 53], floor: 1.0, sky: true, tex: FIELD },
    { id: 'lanes', name: 'the riders\' ground', at: [69, 5], size: [14, 53], sky: true, tex: FIELD },
    { id: 'heap', name: 'the heap of dead', at: [83, 5], size: [20, 53], sky: true, tex: FIELD },
    { id: 'kings', name: 'the ring of the host', at: [103, 5], size: [10, 53], nopass: true, sky: true, tex: FIELD },
    // a stream along the north of the field, deep and black: go down the bank and you drown
    { id: 'stream', name: 'a stream', at: [2, 2], size: [38, 6], pit: 30, water: true, sky: true, tex: STREAM },
    { id: 'stream', name: 'a stream', at: [40, 1], size: [34, 5], pit: 30, water: true, sky: true, tex: STREAM },
    { id: 'stream', name: 'a stream', at: [74, 2], size: [44, 7], pit: 30, water: true, sky: true, tex: STREAM },
  ],
  shafts: [], links: [],
  boulders: [
    { from: [2.4, 4], to: [2.4, 59.5], r: [1.8, 3.8] },
    { from: [2, 58.6], to: [118, 58.6], r: [1.6, 3.8], jitter: 2 },
    { from: [113.4, 3], to: [113.4, 59], r: [1.8, 3.8] },
  ],
  scatter: [
    { prefab: 'fallen', n: 90, rect: [4, 7, 98, 50] },
    { prefab: 'deadhorse', n: 26, rect: [4, 8, 64, 49] },
    { prefab: 'deadhorse', n: 10, rect: [83, 8, 19, 49] },
    { prefab: 'standard', n: 14, rect: [4, 8, 100, 49] },
    { prefab: 'boulder', n: 9, rect: [6, 12, 54, 42], size: [1.2, 2.8] },     // outcrops in the field: cover, and a ragged skyline
    { prefab: 'boulder', n: 4, rect: [85, 10, 16, 44], size: [1.2, 2.4] },
  ],
  props: [
    // the arrow ground: dead horses are the only cover
    ...[[37.5, 12], [40, 22], [39, 34], [41, 47], [44, 16], [45.5, 28], [44, 40], [47, 53], [49.5, 9], [50, 21], [51, 33], [49.5, 45],
      [54, 14], [55, 27], [54.5, 39], [56, 51], [58.5, 20], [59, 33], [58, 44]].map(([x, z], k) => ({ prefab: 'deadhorse', at: [x, z], rot: 1.2 + (k % 5) * 0.2, cover: true })),
    { prefab: 'heap', at: [92, 31.5] }, { prefab: 'standard', at: [90, 28], rot: 0.4 }, { prefab: 'standard', at: [94.5, 35], rot: 2.4 },
  ],
  lights: [
    { at: [-40, 32], y: 26, col: [1.0, 0.5, 0.3], rad: 260, i: 1.4 },             // the sun going down in the west
    { at: [60, 30], y: 40, col: [0.85, 0.42, 0.35], rad: 150, i: 0.6 },
    { at: [100, 32], y: 30, col: [0.8, 0.4, 0.35], rad: 90, i: 0.6 },
  ],
  features: [],
  items: [
    { kind: 'wine', name: 'dead knight\'s wineskin', at: [11, 15], heal: 25 },
    { kind: 'bread', name: 'trooper\'s ration', at: [27, 49], heal: 25 },
    { kind: 'wine', name: 'Shemite water-skin', at: [66, 45], heal: 25 },
    { kind: 'bread', name: 'trooper\'s ration', at: [66, 17], heal: 25 },
    { kind: 'wine', name: 'Ophirean wine', at: [86, 46], heal: 25 },
  ],
  // "Ophirean knights in gilded mail ... squat Shemites with blue-black beards, and dark-faced Kothian knights"
  entities: [
    { class: 'info_player_start', at: [6, 31], yaw: -Math.PI / 2 },
    { class: 'kknight', id: 'c1', at: [15, 24], group: 'charge', yaw: Math.PI / 2 },
    { class: 'kknight', id: 'c2', at: [17, 38], group: 'charge', yaw: Math.PI / 2 },
    { class: 'spearman', id: 'c3', at: [22, 30], group: 'charge', yaw: Math.PI / 2 },
    { class: 'kknight', id: 'c4', at: [26, 41], group: 'charge', yaw: Math.PI / 2 },
    { class: 'spearman', id: 'c5', at: [24, 19], group: 'charge', yaw: Math.PI / 2 },
    { class: 'kknight', id: 'c6', at: [29, 33], group: 'charge', yaw: Math.PI / 2 },
    { class: 'archer', id: 'l1', at: [64, 20], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'archer', id: 'l2', at: [63.5, 27], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'archer', id: 'l3', at: [64, 35], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'archer', id: 'l4', at: [63.5, 42], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'l5', at: [62, 24], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'l6', at: [62, 31], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'l7', at: [62, 38], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h1', at: [95, 26], group: 'heap1', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h2', at: [97, 32], group: 'heap1', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h3', at: [95, 38], group: 'heap1', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h4', at: [99, 29], group: 'heap1', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h5', at: [99, 35], group: 'heap1', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h6', at: [102.4, 27], group: 'heap2', yaw: Math.PI / 2, hold: true },     // the second wave steps out of the ring of the host
    { class: 'oknight', id: 'h7', at: [102.4, 32], group: 'heap2', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h8', at: [102.4, 37], group: 'heap2', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h9', at: [101.6, 29.5], group: 'heap2', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h10', at: [101.6, 34.5], group: 'heap2', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h11', at: [102.4, 25], group: 'heap3', yaw: Math.PI / 2, hold: true },     // and a third: "again and again they came"
    { class: 'spearman', id: 'h12', at: [101.6, 28], group: 'heap3', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h13', at: [102.4, 32], group: 'heap3', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h14', at: [101.6, 36], group: 'heap3', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h15', at: [102.4, 39], group: 'heap3', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h16', at: [101.6, 30.5], group: 'heap3', yaw: Math.PI / 2, hold: true },
  ],
  // the arrow ground: "Strabonus' Shemitish bowmen had wrought havoc among his knights"
  volley: { rooms: ['gully', 'arrowground'], group: 'line', period: 4.2 },
  // the riders' ground: "Ophirean knights in gilded mail leaped their horses over mounds of corpses"
  charges: [{ x: 72, period: 9.0, offset: 0.0, dir: 1 }, { x: 75.5, period: 9.0, offset: 3.0, dir: -1 }, { x: 79, period: 9.0, offset: 6.0, dir: 1 }],
  chargeSpan: [6, 57],
  // the kings watch from their horses in the ring of the host; Tsotha swings down and walks out to you
  // "Strabonus, with his broad dark face and crafty eyes; Amalrus, slender, fastidious" (ch. I), watching from their horses
  kings: { riders: [[108, 28, 'strabonus'], [108, 36, 'amalrus']], horse: [105.4, 32], tsotha: [104.6, 32] },
  // "the ring of attackers": the host stands round the heap in ranks of pikemen, giants in steel caps
  host: { x: [103.7, 105.2], z: [7, 57], step: 3.4 },
  puzzle: {
    flags: ['line_broken', 'lanes_crossed', 'heap_held', 'answered'],
    actions: [
      { id: 'cross_arrow_ground', needs: [], sets: 'line_broken', at: 'rise' },
      { id: 'cross_the_riders', needs: ['line_broken'], sets: 'lanes_crossed', at: 'lanes' },
      { id: 'hold_the_heap', needs: ['lanes_crossed'], sets: 'heap_held', at: 'heap' },
      { id: 'answer_the_wizard', needs: ['heap_held'], sets: 'answered', at: 'heap' },
    ],
    goal: 'answered',
  },
};
// ---------------------------------------------------------------------------
// e1m4 "Yothga" (ch. III): the cage, the plant, Pelias; the way back through the
// pits with him; Satha flees from what she sees in him; the dead jailer works the bolt.
// ---------------------------------------------------------------------------
const LEVEL_E1M4 = {
  level: 'e1m4', next: 'e1m5', title: 'Yothga', ramps: ['ink', 'jade', 'scarlet'], grid: [64, 36], ambient: [0.06, 0.06, 0.055], arms: 'sword', torch: false,
  intro: [['YOTHGA', 'title'], ['Within the bars lay a figure, "twined and bound about with the tendrils of a thick vine which seemed to grow through the solid stone of the floor." Crimson blossoms, "a livid, unnatural crimson, like a perversity of flower-life."', ''],
    ['You find a key for the cage among the keys you carry.', 'dim']],
  objectives: [['stem_cut', 'Cut the stem. Do not touch the roots.'], ['pelias_up', 'Wait for the freed man.'], ['works_crossed', 'Follow Pelias through the old works.'],
    ['satha_fled', 'Back to the main corridor.'], ['grille_open', 'To the grille.'], ['zz', 'Up the stair.']],
  npc: { id: 'pelias', at: [11.6, 19.2], yaw: -Math.PI / 2, mode: 'bound' },
  exitNeeds: 'grille_open',
  areas: [
    { id: 'cage', type: 'action', name: 'The Cage', rooms: ['cell', 'cage'], cp: [3.5, 18, -Math.PI / 2] },
    { id: 'works', type: 'puzzle', name: 'The Old Works', rooms: ['works_a', 'works_b', 'gallery'], cp: [15, 18, -Math.PI / 2] },
    { id: 'ledge', type: 'action', name: 'The Ledges', rooms: ['ledge', 'ledge2'], cp: [35, 13.5, -Math.PI / 2] },
    { id: 'main', type: 'puzzle', name: 'The Main Corridor', rooms: ['main'], cp: [46, 6, -Math.PI / 2] },
    { id: 'dens', type: 'action', name: 'The Way Back', rooms: ['den2', 'last', 'deep', 'climb', 'backway', 'ossuary'], cp: [53, 10, Math.PI] },
    { id: 'grille', type: 'puzzle', name: 'The Grille', rooms: ['grille_room', 'stair'], cp: [40, 25.5, Math.PI / 2] },
  ],
  planks: [{ from: [21.9, 17.5], to: [23.1, 17.5] }],
  rooms: [
    { id: 'cell', name: 'a broad cell', at: [2, 15], size: [4, 6], h: 2.6, style: 'hewn' },
    { id: 'cage', name: 'the cage of bars', at: [6, 14], size: [8, 8], h: 3.2, style: 'hewn', tex: { floor: 'MUD' } },
    { id: 'works_a', name: 'the old works', at: [14, 16], size: [14, 4], h: 2.6, style: 'rough', tex: CAVE_TEX },
    { id: 'breakA', name: 'a break in the works', at: [18, 16], size: [1, 4], h: 2.6, pit: 30, void: true, style: 'rough', tex: CAVE_TEX },
    { id: 'breakB', name: 'a break in the works', at: [22, 16], size: [1, 4], h: 2.6, pit: 30, void: true, style: 'rough', tex: CAVE_TEX },
    { id: 'gallery', name: 'a gallery of the old works', at: [28, 10], size: [6, 12], h: 3.4, style: 'hewn', vault: 1.0 },
    { id: 'ledge', name: 'a ledge over the pits', at: [34, 12], size: [10, 3], h: 3, style: 'rough', tex: CAVE_TEX },
    { id: 'chasm', name: 'the dark between the ledges', at: [38, 12], size: [1, 3], h: 3, pit: 40, void: true, style: 'rough', tex: CAVE_TEX },
    { id: 'ledge2', name: 'a ledge over the pits', at: [41, 12], size: [3, 3], h: 3, style: 'rough', tex: CAVE_TEX },
    { id: 'main', name: 'the main corridor', at: [44, 4], size: [18, 4], h: 4.2, style: 'hewn', vault: 1.2 },
    { id: 'link', name: 'a narrow way', at: [44, 8], size: [2, 7], h: 2.6, style: 'rough', tex: CAVE_TEX },
    { id: 'den2', name: 'a den of the things', at: [50, 8], size: [8, 7], h: 2.6, style: 'rough', tex: CAVE_TEX },
    { id: 'last', name: 'a dank tunnel', at: [58, 8], size: [3, 26], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'ossuary', name: 'an ossuary of the old works', at: [6, 23], size: [8, 5], h: 3.2, vault: 0.8, style: 'hewn' },
    { id: 'deep', name: 'the things\' warren', at: [2, 31], size: [59, 3], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'climb', name: 'a slimed climb', at: [2, 24], size: [3, 7], h: 2.6, floor: 0.7, rise: -0.1, riseAxis: 'z', style: 'rough', tex: CAVE_TEX },
    { id: 'backway', name: 'the way the things do not use', at: [5, 28], size: [31, 2], h: 2.2, style: 'hewn' },
    { id: 'grille_room', name: 'the foot of the stair, behind the grille', at: [36, 22], size: [8, 7], h: 3.4, style: 'hewn' },
    { id: 'stair', name: 'the long stair', at: [32, 24], size: [4, 3], h: 3.4, floor: 0.6, style: 'hewn' },
  ],
  shafts: [], links: [],
  props: [
    { prefab: 'torch', at: [6.5, 14], wall: 'N', dim: 0.7 }, { prefab: 'torch', at: [13.5, 22], wall: 'S', dim: 0.6 }, { prefab: 'torch', at: [31, 10], wall: 'N', dim: 0.6 },
    { prefab: 'torch', at: [48, 4], wall: 'N', dim: 0.7 }, { prefab: 'torch', at: [56, 4], wall: 'N', dim: 0.6 }, { prefab: 'torch', at: [40, 22], wall: 'N', dim: 0.8 },
    { prefab: 'fungus', at: [52.5, 33.5] }, { prefab: 'fungus', at: [44.5, 31.5] }, { prefab: 'fungus', at: [36.5, 33.5] }, { prefab: 'fungus', at: [27.5, 31.5] }, { prefab: 'fungus', at: [19.5, 33.5] }, { prefab: 'fungus', at: [11.5, 31.5] }, { prefab: 'fungus', at: [4.5, 33.5] }, { prefab: 'fungus', at: [3.5, 25.5] },
    { prefab: 'torch', at: [10, 23], wall: 'N', dim: 0.6 }, { prefab: 'torch', at: [20, 28], wall: 'N', dim: 0.6 },
    { prefab: 'bones', at: [16, 17] }, { prefab: 'bones', at: [52, 12], big: true }, { prefab: 'skull', at: [55, 9] }, { prefab: 'bones', at: [50, 32] }, { prefab: 'bones', at: [24, 32.5], big: true }, { prefab: 'skull', at: [19, 31.5] }, { prefab: 'bones', at: [3, 26] }, { prefab: 'bones', at: [8, 24], big: true }, { prefab: 'skull', at: [12, 24] }, { prefab: 'bones', at: [10, 27], big: true }, { prefab: 'skull', at: [7, 32] }, { prefab: 'column', at: [30, 13] }, { prefab: 'column', at: [30, 19] },
  ],
  lights: [{ at: [10, 18], y: 1.5, col: [0.7, 0.15, 0.2], rad: 9, i: 1.1 },   // and the warren's pale fungus
    { at: [52.5, 33.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [44.5, 31.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [36.5, 33.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [27.5, 31.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [19.5, 33.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [11.5, 31.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [4.5, 33.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [3.5, 25.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }],
  features: [],
  // what the dead left: Tsotha's prisoners had bread and wine smuggled to them, once
  items: [{ kind: 'bread', name: 'heel of black bread', heal: 30, at: [27, 18.5] }, { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [43, 13.5] },
    { kind: 'bread', name: 'heel of black bread', heal: 30, at: [57, 14] }, { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [60, 23] }, { kind: 'bread', name: 'heel of black bread', heal: 30, at: [43, 26] },
    { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [40, 32.5] }, { kind: 'bread', name: 'heel of black bread', heal: 30, at: [3, 30] }, { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [9, 25.5] }, { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [33, 28.8] }],
  entities: [
    { class: 'info_player_start', at: [3.5, 18], yaw: -Math.PI / 2 },
    { class: 'yothga', id: 'yo', at: [10, 18], group: 'yothga', yaw: Math.PI / 2 },
    { class: 'thing', id: 'g1', at: [29, 12], group: 'gallery' }, { class: 'thing', id: 'g2', at: [32, 14], group: 'gallery' }, { class: 'thing', id: 'g3', at: [30, 17], group: 'gallery' },
    { class: 'thing', id: 'g4', at: [32.5, 19.5], group: 'gallery' }, { class: 'thing', id: 'g5', at: [29.5, 21], group: 'gallery', lurk: true }, { class: 'thing', id: 'g6', at: [31, 11], group: 'gallery', lurk: true },
    { class: 'thing', id: 'l1', at: [35, 13.5], group: 'ledge' }, { class: 'thing', id: 'l2', at: [42.5, 13.5], group: 'ledge' }, { class: 'thing', id: 'l3', at: [44.8, 10], group: 'ledge' },
    { class: 'thing', id: 'd1', at: [51, 10], group: 'den' }, { class: 'thing', id: 'd2', at: [54, 12], group: 'den' }, { class: 'thing', id: 'd3', at: [56, 9], group: 'den' }, { class: 'thing', id: 'd4', at: [52, 14], group: 'den' },
    { class: 'thing', id: 'd5', at: [55, 13.5], group: 'den', lurk: true }, { class: 'thing', id: 'd6', at: [57, 11], group: 'den' },
    { class: 'thing', id: 't1', at: [59.5, 16], group: 'tunnel' }, { class: 'thing', id: 't2', at: [59, 21], group: 'tunnel' }, { class: 'thing', id: 't3', at: [56, 32], group: 'tunnel' },
    { class: 'thing', id: 't4', at: [51, 31.5], group: 'tunnel', lurk: true }, { class: 'thing', id: 't5', at: [47, 32.5], group: 'tunnel' }, { class: 'thing', id: 't6', at: [44, 32], group: 'tunnel' },
    { class: 'thing', id: 'w1', at: [36, 32], group: 'warren' }, { class: 'thing', id: 'w2', at: [32, 31.5], group: 'warren' }, { class: 'thing', id: 'w3', at: [28, 32.5], group: 'warren', lurk: true },
    { class: 'thing', id: 'w4', at: [23, 32], group: 'warren' }, { class: 'thing', id: 'w5', at: [18, 31.5], group: 'warren' }, { class: 'thing', id: 'w6', at: [15, 32.5], group: 'warren', lurk: true },
    { class: 'thing', id: 'w7', at: [10, 32], group: 'warren2' }, { class: 'thing', id: 'w8', at: [6, 31.5], group: 'warren2', lurk: true }, { class: 'thing', id: 'w9', at: [3, 32.5], group: 'warren2' },
    { class: 'thing', id: 'w10', at: [13, 32.5], group: 'warren2' },
    { class: 'thing', id: 'o1', at: [8, 25], group: 'ossuary' }, { class: 'thing', id: 'o2', at: [11, 24], group: 'ossuary', lurk: true }, { class: 'thing', id: 'o3', at: [12, 26.5], group: 'ossuary' }, { class: 'thing', id: 'o4', at: [7, 27], group: 'ossuary' },
    { class: 'thing', id: 'b1', at: [3, 26], group: 'backway' }, { class: 'thing', id: 'b2', at: [21, 28.5], group: 'backway' }, { class: 'thing', id: 'b3', at: [27, 29], group: 'backway', lurk: true },
    { class: 'thing', id: 'b4', at: [32, 28.5], group: 'backway' },
    { class: 'thing', id: 'r1', at: [38, 24], group: 'stair' }, { class: 'thing', id: 'r2', at: [41, 27], group: 'stair' }, { class: 'thing', id: 'r3', at: [38, 27.5], group: 'stair', lurk: true },
    { class: 'trigger_exit', rect: [32, 24, 33, 27] },
  ],
  beats: [
    { id: 'cut', killed: 'yothga', sets: 'stem_cut', lines: [['You cut through the stem with a single stroke. The great vine lashes and knots like a beheaded serpent, then straightens out limply; a reeking white liquid oozes from the severed stump.', 'good'],
      ['The freed man is on his feet. His eyes are dark and meditative, alive with intelligence. "What year is this?"', 'voice'], ['"Men called me Pelias."', 'voice'],
      ['"Tsotha preferred to keep me alive, in shackles more grim than rusted iron. Come: there is a way back that the things do not use. Keep close behind me."', 'voice']], npc: 'cast' },
    { id: 'up', needs: ['stem_cut'], after: 9, sets: 'pelias_up', npc: 'follow', lines: [['Pelias leads you east, through the old works.', 'dim']] },
    { id: 'works', at: ['gallery'], needs: ['pelias_up'], sets: 'works_crossed', wake: ['gallery'], lines: [['"They are coming. Keep them off me: I am weak yet, from ten years in that thing\'s arms."', 'voice']] },
    { id: 'ledgeb', at: ['ledge'], wake: ['ledge'] },
    { id: 'satha', at: ['main'], needs: ['works_crossed'], sets: 'satha_fled', sound: 'rumble', lines: [['The torches bow. Up the corridor comes Satha, rearing high, the great head swaying toward you.', 'warn'],
      ['"Stand still," says Pelias, and steps out in front of you. The serpent stares at him; then it turns, and flees back into the dark as if from death itself.', 'voice'], ['"She knows me," Pelias says.', 'voice']] },
    { id: 'den', at: ['den2'], wake: ['den'] },
    { id: 'tun', at: ['last', 'deep'], wake: ['tunnel'] },
    { id: 'warren', at: ['deep'], needs: ['satha_fled'], after: 4, wake: ['warren'], lines: [['"Their warren. Satha hunts them here, and they breed faster than she eats. West, and up: the old way round to the stair."', 'voice']] },
    { id: 'warren2', at: ['deep'], needs: ['satha_fled'], after: 14, wake: ['warren2'] },
    { id: 'oss', at: ['backway', 'ossuary'], wake: ['ossuary'] },
    { id: 'back', at: ['climb', 'backway'], wake: ['backway'], lines: [['A passage of dressed stone, older than the citadel. Something has followed you up out of the warren.', 'warn']] },
    { id: 'grille', at: ['grille_room'], needs: ['satha_fled'], wake: ['stair'], after: 2, sets: 'pelias_at_grille', npc: 'cast',
      lines: [['The grille, bolted from outside. Shukeli lies dead against it, where you killed him.', ''], ['Pelias laughs, a laughter "merciless as a flint hatchet." He speaks a word you do not hear.', 'voice'],
      ['The body of Shukeli stirs, with infantile gropings of the fat hands. It reels upright and clutches at the bars; its glassy eyes stare at nothing.', 'warn'], ['The dead fingers draw the bolt. The grille swings open; the body falls, and is still.', 'good']] },
    { id: 'open', needs: ['pelias_at_grille'], after: 12, sets: 'grille_open', npc: 'follow', sound: 'bars' },
  ],
  puzzle: {
    flags: ['stem_cut', 'pelias_up', 'works_crossed', 'satha_fled', 'grille_open'],
    actions: [
      { id: 'cut_the_stem', needs: [], sets: 'stem_cut', at: 'cage' }, { id: 'wait_for_pelias', needs: ['stem_cut'], sets: 'pelias_up', at: 'cage' },
      { id: 'follow_him', needs: ['pelias_up'], sets: 'works_crossed', at: 'gallery' }, { id: 'let_satha_see_him', needs: ['works_crossed'], sets: 'satha_fled', at: 'main' },
      { id: 'the_dead_work_the_bolt', needs: ['satha_fled'], sets: 'grille_open', at: 'grille_room' },
    ],
    goal: 'grille_open',
  },
};

// ---------------------------------------------------------------------------
// e1m5 "The Scarlet Citadel" (ch. II-III): up the long stair with Pelias, through
// his spell's silence, past sleepers, to Tsotha's chambers and the roof.
// ---------------------------------------------------------------------------
const HALL_TEX = { floor: 'FLAG', wall: 'HEWN', ceil: 'HEWN' };
const LEVEL_E1M5 = {
  level: 'e1m5', next: 'e1m6', title: 'The Scarlet Citadel', ramps: ['ink', 'scarlet', 'bronze'], grid: [70, 34], ambient: [0.07, 0.05, 0.045], arms: 'sword',
  open: true, night: true, moon: [-0.6, 0.3, 0.5], sun: [0.3, -0.2, 0.9], fog: 0.012, haze: [0.02, 0.02, 0.04],
  intro: [['THE SCARLET CITADEL', 'title'], ['Up the long stair, Pelias at your heels. "Tsotha\'s household sleeps," he says. "I have laid that on them. But a spell is thin where many men are; some will wake."', 'voice'],
    ['"Expected a rush of slaves, but silence gripped the citadel."', 'dim']],
  objectives: [['door_passed', 'Up the stair, to the skull-crowned door.'], ['black_cleared', 'Kill the black guards before they rouse the rest.'], ['censers_passed', 'Walk softly past the sleepers. Do not run.'],
    ['hall_cleared', 'Through the guard hall.'], ['armed', 'West, through the barracks, to the armoury: mail for your back.'], ['globe_seen', 'Tsotha\'s chambers.'], ['tower_climbed', 'Up the tower stair.'], ['beast_called', 'Across the battlements to the tallest tower.'], ['zz', 'Mount, and ride.']],
  npc: { id: 'pelias', at: [3, 21], yaw: -Math.PI / 2, mode: 'follow' },
  exitNeeds: 'beast_called',
  areas: [
    { id: 'stair', type: 'puzzle', name: 'The Long Stair', rooms: ['stairfoot', 'longstair', 'skulldoor'], cp: [3.5, 20, -Math.PI / 2] },
    { id: 'black', type: 'action', name: 'The Black Corridor', rooms: ['blackcorr'], cp: [20, 19.5, -Math.PI / 2] },
    { id: 'censer', type: 'puzzle', name: 'The Censers', rooms: ['censer'], cp: [38.5, 20, Math.PI] },
    { id: 'hall', type: 'action', name: 'The Guard Hall', rooms: ['guardhall'], cp: [41, 8, -Math.PI / 2] },
    { id: 'barracks', type: 'action', name: 'The Barracks', rooms: ['passage', 'barracks', 'armoury'], cp: [38.5, 4.5, Math.PI / 2] },
    { id: 'chambers', type: 'puzzle', name: 'Tsotha\'s Chambers', rooms: ['chambers'], cp: [53, 9, -Math.PI / 2] },
    { id: 'tower', type: 'action', name: 'The Tower Stair', rooms: ['towerstair'], cp: [61, 10, Math.PI] },
    { id: 'roof', type: 'action', name: 'The Roof', rooms: ['roof1', 'roof2', 'roof3', 'roof4'], cp: [59, 26.5, Math.PI / 2] },
    { id: 'roofw', type: 'action', name: 'The West Battlements', rooms: ['roof5', 'roof6'], cp: [38, 26.5, Math.PI / 2] },
  ],
  rooms: [
    { id: 'stairfoot', name: 'the foot of the long stair', at: [2, 18], size: [4, 5], h: 3, style: 'hewn' },
    { id: 'longstair', name: 'the long stair', at: [6, 19], size: [12, 3], h: 3, floor: 0.4, rise: 0.48, style: 'hewn' },
    { id: 'skulldoor', name: 'the brass, skull-crowned door', at: [18, 18], size: [3, 5], h: 3.4, floor: 6, style: 'hewn' },
    { id: 'blackcorr', name: 'the black corridor', at: [21, 18], size: [16, 3], h: 2.8, floor: 6, style: 'hewn', tex: { floor: 'BLACKMAIL', wall: 'HEWN', ceil: 'HEWN' } },
    { id: 'censer', name: 'the corridor of censers', at: [37, 8], size: [3, 15], h: 3.2, floor: 6, style: 'hewn', tex: HALL_TEX },
    { id: 'guardhall', name: 'the guard hall', at: [40, 3], size: [12, 10], h: 4.2, floor: 6, vault: 1.2, style: 'hewn', tex: HALL_TEX },
    { id: 'passage', name: 'a passage off the guard hall', at: [37, 4], size: [3, 2], h: 2.8, floor: 6, style: 'hewn', tex: HALL_TEX },
    { id: 'barracks', name: 'the barracks', at: [21, 2], size: [16, 6], h: 3.2, floor: 6, style: 'hewn', tex: { floor: 'MUD', wall: 'HEWN', ceil: 'HEWN' } },
    { id: 'armoury', name: 'the armoury', at: [14, 1], size: [7, 8], h: 3.6, floor: 6, vault: 0.8, style: 'hewn', tex: HALL_TEX },
    { id: 'chambers', name: 'Tsotha\'s chambers', at: [52, 5], size: [8, 8], h: 3.8, floor: 6, vault: 1, style: 'hewn', tex: { floor: 'TABARD', wall: 'HEWN', ceil: 'HEWN' } },
    { id: 'towerstair', name: 'the tower stair', at: [60, 7], size: [3, 17], h: 3, floor: 6.4, rise: 0.5, riseAxis: 'z', style: 'hewn' },
    { id: 'roof1', name: 'the battlements', at: [57, 24], size: [6, 5], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'SKY' } },
    { id: 'gap1', name: 'a gap in the battlements', at: [56, 24], size: [1, 5], floor: 14.5, pit: 40, void: true, sky: true, style: 'hewn' },
    { id: 'roof2', name: 'the battlements', at: [50, 24], size: [6, 5], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'SKY' } },
    { id: 'gap2', name: 'a gap in the battlements', at: [49, 24], size: [1, 5], floor: 14.5, pit: 40, void: true, sky: true, style: 'hewn' },
    { id: 'roof3', name: 'the battlements', at: [43, 24], size: [6, 5], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'SKY' } },
    { id: 'gap3', name: 'a gap in the battlements', at: [42, 24], size: [1, 5], floor: 14.5, pit: 40, void: true, sky: true, style: 'hewn' },
    { id: 'gap4', name: 'a gap in the battlements', at: [33, 24], size: [1, 5], floor: 14.5, pit: 40, void: true, sky: true, style: 'hewn' },
    { id: 'roof5', name: 'the battlements', at: [26, 24], size: [7, 5], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'SKY' } },
    { id: 'gap5', name: 'a gap in the battlements', at: [25, 24], size: [1, 5], floor: 14.5, pit: 40, void: true, sky: true, style: 'hewn' },
    { id: 'roof6', name: 'the roof of the tallest tower', at: [16, 24], size: [9, 6], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'SKY' } },
    { id: 'roof4', name: 'the battlements', at: [34, 23], size: [8, 7], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'SKY' } },
  ],
  shafts: [], links: [], features: [],
  planks: [{ from: [48.9, 27.5], to: [50.1, 27.5] }],
  props: [
    { prefab: 'torch', at: [3, 18], wall: 'N', dim: 0.8 }, { prefab: 'torch', at: [12, 19], wall: 'N', dim: 0.6 }, { prefab: 'torch', at: [19.5, 18], wall: 'N', dim: 0.8 },
    { prefab: 'torch', at: [26, 18], wall: 'N', dim: 0.5 }, { prefab: 'torch', at: [33, 21], wall: 'S', dim: 0.5 },
    { prefab: 'brazier', at: [38.5, 11] }, { prefab: 'brazier', at: [38.5, 16] }, { prefab: 'brazier', at: [38.5, 21] },
    { prefab: 'column', at: [43, 6] }, { prefab: 'column', at: [49, 6] }, { prefab: 'column', at: [43, 10] }, { prefab: 'column', at: [49, 10] },
    { prefab: 'torch', at: [46, 3], wall: 'N', dim: 0.9 }, { prefab: 'brazier', at: [56, 9] }, { prefab: 'table', at: [55, 7] },
    { prefab: 'torch', at: [63, 12], wall: 'E', dim: 0.6 }, { prefab: 'torch', at: [63, 18], wall: 'E', dim: 0.6 },
  ],
  lights: [{ at: [56, 9], y: 7.5, col: [0.4, 0.6, 1.0], rad: 10, i: 1.2 }],
  items: [{ kind: 'wine', name: 'the watch\'s wine-skin', heal: 35, at: [30, 27.5] },
    { kind: 'bread', name: 'a guard\'s black bread', heal: 30, at: [30, 4.5] }, { kind: 'wine', name: 'a guard\'s wine-skin', heal: 35, at: [19, 2] },
    { kind: 'wine', name: 'cup of Tsotha\'s wine', heal: 40, at: [55, 8] }, { kind: 'bread', name: 'honey-cake from a slave\'s tray', heal: 25, at: [39, 9] },
    { kind: 'wine', name: 'flask of wine', heal: 30, at: [61, 22] }, { kind: 'bread', name: 'loaf from a sleeping slave', heal: 25, at: [30, 20] }],
  entities: [
    { class: 'info_player_start', at: [3.5, 20], yaw: -Math.PI / 2 },
    { class: 'axeman', id: 'k1', at: [26, 19.5], group: 'black', yaw: Math.PI / 2 }, { class: 'axeman', id: 'k2', at: [31, 18.8], group: 'black', yaw: Math.PI / 2 },
    { class: 'slave', id: 'k3', at: [29, 20.2], group: 'black' }, { class: 'axeman', id: 'k4', at: [35, 19.5], group: 'black', yaw: Math.PI / 2 },
    { class: 'slave', id: 's1', at: [37.5, 12], group: 'censer', asleep: true, yaw: Math.PI / 2 }, { class: 'slave', id: 's2', at: [39.5, 14], group: 'censer', asleep: true, yaw: -Math.PI / 2 },
    { class: 'axeman', id: 's3', at: [37.5, 17], group: 'censer', asleep: true, yaw: Math.PI / 2 }, { class: 'slave', id: 's4', at: [39.5, 19], group: 'censer', asleep: true, yaw: -Math.PI / 2 },
    { class: 'axeman', id: 's5', at: [39.5, 10], group: 'censer', asleep: true, yaw: -Math.PI / 2 }, { class: 'slave', id: 's6', at: [37.5, 21.5], group: 'censer', asleep: true, yaw: Math.PI / 2 },
    { class: 'axeman', id: 'h1', at: [46, 5], group: 'hall', yaw: 0 }, { class: 'axeman', id: 'h2', at: [48, 11], group: 'hall', yaw: Math.PI }, { class: 'slave', id: 'h3', at: [44, 8], group: 'hall' },
    { class: 'slave', id: 'h4', at: [50, 7], group: 'hall' }, { class: 'axeman', id: 'h5', at: [42, 4], group: 'hall', asleep: true }, { class: 'slave', id: 'h6', at: [51, 12], group: 'hall', asleep: true },
    { class: 'axeman', id: 'b1', at: [33, 3], group: 'barracks', asleep: true }, { class: 'slave', id: 'b2', at: [31, 6.5], group: 'barracks', asleep: true }, { class: 'axeman', id: 'b3', at: [28, 4], group: 'barracks' },
    { class: 'slave', id: 'b4', at: [25, 6], group: 'barracks' }, { class: 'axeman', id: 'b5', at: [23, 3], group: 'barracks', asleep: true }, { class: 'slave', id: 'b6', at: [26, 2.5], group: 'barracks', asleep: true },
    { class: 'axeman', id: 'a1', at: [16, 3], group: 'armoury', yaw: -Math.PI / 2 }, { class: 'axeman', id: 'a2', at: [17, 7], group: 'armoury', yaw: -Math.PI / 2 }, { class: 'slave', id: 'a3', at: [15, 5], group: 'armoury' },
    { class: 'slave', id: 't1', at: [61, 12], group: 'tower' }, { class: 'axeman', id: 't2', at: [61, 16], group: 'tower', yaw: Math.PI }, { class: 'slave', id: 't3', at: [61.5, 19], group: 'tower' },
    { class: 'axeman', id: 't4', at: [60.5, 21], group: 'tower', yaw: Math.PI },
    { class: 'axeman', id: 'r1', at: [52, 26], group: 'roof', yaw: -Math.PI / 2 }, { class: 'axeman', id: 'r2', at: [45, 26.5], group: 'roof', yaw: -Math.PI / 2 }, { class: 'slave', id: 'r3', at: [46, 25], group: 'roof' },
    { class: 'axeman', id: 'r4', at: [38, 26], group: 'roof', yaw: -Math.PI / 2 }, { class: 'slave', id: 'r5', at: [36, 24.5], group: 'roof' },
    { class: 'axeman', id: 'q1', at: [29, 26], group: 'roofw', yaw: -Math.PI / 2 }, { class: 'slave', id: 'q2', at: [27, 27.5], group: 'roofw' }, { class: 'axeman', id: 'q3', at: [21, 26], group: 'roofw', yaw: -Math.PI / 2 },
    { class: 'slave', id: 'q4', at: [19, 28], group: 'roofw' }, { class: 'axeman', id: 'q5', at: [23, 28.5], group: 'roofw', asleep: true },
    { class: 'trigger_exit', rect: [17, 25, 19, 29] },
  ],
  beats: [
    { id: 'door', at: 'skulldoor', sets: 'door_passed', lines: [['The brass door with the skulls on it stands open. Beyond, a black corridor, and men in it.', 'warn'], ['"Some are awake," says Pelias. "Kill them before they rouse the rest."', 'voice']], wake: ['black'] },
    { id: 'black', killed: 'black', sets: 'black_cleared', lines: [['The black corridor is quiet again.', 'dim']] },
    { id: 'censer', at: 'censer', needs: ['black_cleared'], lines: [['Censers swing and smoke along the corridor; slaves and guards lie asleep against the walls, as though struck down.', ''], ['"Walk," Pelias breathes. "Do not run. The spell is thin here."', 'voice']] },
    { id: 'censer_done', at: 'guardhall', sets: 'censers_passed', wake: ['hall'], lines: [['The guard hall: black giants half-woken, groping for their long-shafted axes!', 'warn']] },
    { id: 'hall', killed: 'hall', sets: 'hall_cleared' },
    { id: 'barracks', at: 'barracks', needs: ['hall_cleared'], lines: [['"You cannot go up to Tsotha\'s rooms in a slave\'s rags," Pelias says. "The armoury is beyond the barracks. Quietly."', 'voice']] },
    { id: 'armoury', at: 'armoury', wake: ['armoury'], lines: [['Racks of mail, and swords, and the guards of the armoury between you and them.', 'warn']] },
    { id: 'armed', killed: 'armoury', sets: 'armed', lines: [['You pull a shirt of black mail over your head and belt on a dagger from the rack. "Now," says Pelias, "Tsotha\'s chambers."', 'good']] },
    { id: 'chambers', at: 'chambers', needs: ['hall_cleared', 'armed'], after: 2, sets: 'globe_seen', npc: 'cast',
      lines: [['Tsotha\'s chambers. Pelias pours the wizard\'s wine. You drink. "The dog knows good wine," you say.', 'voice'],
        ['Pelias brings you to a crystal globe. In it you see a battle, a king trapped by treachery; and Tamar, in turmoil, the mob in the streets.', ''],
        ['"Your kingdom is slipping from you," he says. "Come up to the roof. I will give you a steed that will bear you to Tamar by dawn."', 'voice']] },
    { id: 'tower', at: 'towerstair', needs: ['globe_seen'], wake: ['tower'], npc: 'follow' },
    { id: 'climbed', at: 'roof1', sets: 'tower_climbed', wake: ['roof'], lines: [['The battlements, under the stars. The tallest tower is across the gaps.', '']] },
    { id: 'west', at: 'roof4', wake: ['roofw'], lines: [['Torches on the western battlements: the watch on the tallest tower has seen you.', 'warn']] },
    { id: 'beast', at: 'roof6', needs: ['tower_climbed'], after: 3, sets: 'beast_called', npc: 'cast', sound: 'wind',
      lines: [['Pelias lifts his arms and calls into the night. A beat of wings in the stars: a huge bat-like creature alights beside you, its giant wings forty feet across. It is neither bat nor bird.', 'warn'],
        ['"Mount and ride," says Pelias. "By dawn it will bring you to Tamar."', 'voice']] },
  ],
  puzzle: {
    flags: ['door_passed', 'black_cleared', 'censers_passed', 'hall_cleared', 'armed', 'globe_seen', 'tower_climbed', 'beast_called'],
    actions: [
      { id: 'climb_the_stair', needs: [], sets: 'door_passed', at: 'skulldoor' }, { id: 'kill_the_wakers', needs: ['door_passed'], sets: 'black_cleared', at: 'blackcorr' },
      { id: 'walk_softly', needs: ['black_cleared'], sets: 'censers_passed', at: 'guardhall' }, { id: 'clear_the_hall', needs: ['censers_passed'], sets: 'hall_cleared', at: 'guardhall' },
      { id: 'arm_yourself', needs: ['hall_cleared'], sets: 'armed', at: 'armoury' }, { id: 'see_the_globe', needs: ['armed'], sets: 'globe_seen', at: 'chambers' }, { id: 'climb_the_tower', needs: ['globe_seen'], sets: 'tower_climbed', at: 'roof1' },
      { id: 'call_the_beast', needs: ['tower_climbed'], sets: 'beast_called', at: 'roof6' },
    ],
    goal: 'beast_called',
  },
};

// ---------------------------------------------------------------------------
// e1m6 "The Tower of Tamar" (ch. IV): dropped onto the turret at dawn among
// Arpello's archers; across the leads; Arpello hurled a hundred and fifty feet.
// ---------------------------------------------------------------------------
const ROOF_TEX = { floor: 'FLAG', wall: 'HEWN', ceil: 'SUNSET' };
const LEVEL_E1M6 = {
  level: 'e1m6', next: 'e1m7', title: 'The Tower of Tamar', ramps: ['ink', 'scarlet', 'bronze'], grid: [64, 36], ambient: [0.16, 0.1, 0.09], arms: 'sword',
  open: true, sun: [1, 0.06, 0.15], fog: 0.006, haze: [0.35, 0.12, 0.08],
  intro: [['THE TOWER OF TAMAR', 'title'], ['"Out of the crimson dawn came a flying speck that grew to a bat, then to an eagle." It roars over the great tower, and you spring from between its titan-wings onto the turret.', ''],
    ['Below, the mob in the square: "The king! It is the king!"', 'warn']],
  objectives: [['turret_cleared', 'Clear the turret.'], ['leads_crossed', 'Across the leads toward Arpello.'], ['archers_cleared', 'Silence the archers shooting down at the mob.'],
    ['arpello_hurled', 'Arpello. Throw him from the parapet.'], ['stair_cleared', 'Drive his men down the tower stair.'], ['guard_broken', 'Down the lower stair: Arpello\'s household guard hold the gate-tower.'], ['zz', 'Out by the postern, into the arms of the mob.']],
  exitNeeds: 'guard_broken',
  areas: [
    { id: 'turret', type: 'action', name: 'The Turret', rooms: ['turret1'], cp: [6, 19, -Math.PI / 2] },
    { id: 'leads', type: 'puzzle', name: 'The Leads', rooms: ['bridge1', 'roofA', 'bridge2', 'bridge3'], cp: [14, 19, -Math.PI / 2] },
    { id: 'archers', type: 'action', name: 'The Archers\' Turret', rooms: ['turret2'], cp: [35, 18, -Math.PI / 2] },
    { id: 'arpello', type: 'action', name: 'Arpello', rooms: ['crown'], cp: [43, 17, -Math.PI / 2] },
    { id: 'stair', type: 'action', name: 'The Tower Stair', rooms: ['tstair', 'thall'], cp: [51.5, 15, Math.PI] },
    { id: 'guard', type: 'action', name: 'The Gate-Tower', rooms: ['lstair', 'guardroom'], cp: [58, 24, Math.PI] },
  ],
  rooms: [
    { id: 'air', name: 'the air over Tamar', at: [0, 0], size: [50, 36], floor: 40, pit: 40, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'SUNSET' } },
    { id: 'turret1', name: 'the turret', at: [3, 15], size: [7, 8], floor: 40, sky: true, style: 'hewn', tex: ROOF_TEX },
    { id: 'bridge1', name: 'the leads', at: [10, 18], size: [8, 2], floor: 40, sky: true, style: 'hewn', tex: ROOF_TEX },
    { id: 'roofA', name: 'the palace roof', at: [18, 13], size: [8, 11], floor: 40, sky: true, style: 'hewn', tex: ROOF_TEX },
    { id: 'bridge2', name: 'the leads', at: [26, 18], size: [3, 2], floor: 40, sky: true, style: 'hewn', tex: ROOF_TEX },
    { id: 'bridge3', name: 'the leads', at: [30, 18], size: [4, 2], floor: 40, sky: true, style: 'hewn', tex: ROOF_TEX },
    { id: 'turret2', name: 'the archers\' turret', at: [34, 13], size: [7, 10], floor: 40, sky: true, style: 'hewn', tex: ROOF_TEX },
    { id: 'bridge4', name: 'the leads', at: [41, 17], size: [1, 3], floor: 40, sky: true, style: 'hewn', tex: ROOF_TEX },
    { id: 'crown', name: 'the crown of the great tower', at: [42, 12], size: [8, 11], floor: 40, sky: true, style: 'hewn', tex: ROOF_TEX },
    { id: 'tstair', name: 'the tower stair', at: [50, 14], size: [3, 14], h: 3, floor: 40, rise: -0.9, riseAxis: 'z', style: 'hewn' },
    { id: 'lstair', name: 'the lower stair', at: [57, 13], size: [3, 13], h: 3, floor: 17.2, rise: 0.9, riseAxis: 'z', style: 'hewn' },
    { id: 'guardroom', name: 'the guardroom of the gate-tower', at: [53, 2], size: [11, 11], h: 4, floor: 17, vault: 1, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'HEWN' } },
    { id: 'thall', name: 'the hall at the stair\'s foot', at: [53, 26], size: [9, 7], h: 3.6, floor: 28, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'HEWN' } },
  ],
  shafts: [], links: [], features: [],
  planks: [{ from: [28.9, 19.5], to: [30.1, 19.5] }],
  props: [{ prefab: 'torch', at: [53, 15], wall: 'E', dim: 0.6 }, { prefab: 'torch', at: [53, 21], wall: 'E', dim: 0.6 }, { prefab: 'torch', at: [55, 26], wall: 'N', dim: 0.8 },
    { prefab: 'standard', at: [45, 14], rot: 1.2 }, { prefab: 'bones', at: [22, 20] }],
  lights: [],
  items: [{ kind: 'wine', name: 'archer\'s wine-skin', heal: 35, at: [9, 16] }, { kind: 'bread', name: 'soldier\'s bread', heal: 30, at: [24, 22] },
    { kind: 'wine', name: 'archer\'s wine-skin', heal: 35, at: [40, 21] }, { kind: 'bread', name: 'soldier\'s bread', heal: 30, at: [52, 20] },
    { kind: 'wine', name: 'a guardsman\'s wine-skin', heal: 35, at: [61, 28] }, { kind: 'bread', name: 'a guardsman\'s bread', heal: 30, at: [58, 14] }, { kind: 'wine', name: 'a cup of Arpello\'s wine', heal: 40, at: [62, 11] }],
  entities: [
    { class: 'info_player_start', at: [5, 19], yaw: -Math.PI / 2 },
    { class: 'pellian_archer', id: 'a1', at: [8, 16], group: 'turret' }, { class: 'pellian_archer', id: 'a2', at: [8.5, 21.5], group: 'turret' },
    { class: 'pellian', id: 'a3', at: [7, 18.5], group: 'turret', yaw: Math.PI / 2 }, { class: 'pellian_archer', id: 'a4', at: [4, 16], group: 'turret' },
    { class: 'pellian', id: 'p1', at: [20, 15], group: 'roof', yaw: Math.PI / 2 }, { class: 'pellian', id: 'p2', at: [23, 19], group: 'roof', yaw: Math.PI / 2 },
    { class: 'pellian', id: 'p3', at: [21, 22], group: 'roof', yaw: Math.PI / 2 }, { class: 'pellian_archer', id: 'p4', at: [25, 14], group: 'roof' }, { class: 'pellian', id: 'p5', at: [24.5, 21], group: 'roof' },
    { class: 'pellian_archer', id: 'b1', at: [36, 14], group: 'archers' }, { class: 'pellian_archer', id: 'b2', at: [39.5, 15], group: 'archers' }, { class: 'pellian_archer', id: 'b3', at: [36, 21.5], group: 'archers' },
    { class: 'pellian_archer', id: 'b4', at: [40, 21], group: 'archers' }, { class: 'pellian', id: 'b5', at: [35.5, 18], group: 'archers', yaw: Math.PI / 2 }, { class: 'pellian', id: 'b6', at: [38, 17], group: 'archers' },
    { class: 'pellian', id: 'b7', at: [37, 20], group: 'archers' }, { class: 'pellian_archer', id: 'b8', at: [39, 13.5], group: 'archers' },
    { class: 'arpello', id: 'ar', at: [47, 17], group: 'arpello', yaw: Math.PI / 2 }, { class: 'pellian', id: 'c1', at: [45, 14], group: 'arpello' }, { class: 'pellian', id: 'c2', at: [45, 21], group: 'arpello' },
    { class: 'pellian', id: 'c3', at: [48, 13], group: 'arpello' }, { class: 'pellian', id: 'c4', at: [48, 21.5], group: 'arpello' },
    { class: 'pellian', id: 'd1', at: [51.5, 22], group: 'stair', yaw: Math.PI }, { class: 'pellian', id: 'd2', at: [51.5, 25], group: 'stair', yaw: Math.PI },
    { class: 'pellian', id: 'd3', at: [55, 28], group: 'stair' }, { class: 'pellian', id: 'd4', at: [58, 30], group: 'stair' }, { class: 'pellian_archer', id: 'd5', at: [60, 28], group: 'stair' },
    { class: 'pellian', id: 'd6', at: [57, 28], group: 'stair' }, { class: 'pellian_archer', id: 'd7', at: [61, 31], group: 'stair' },
    { class: 'pellian', id: 'e1', at: [58, 19], group: 'lower', yaw: Math.PI }, { class: 'pellian', id: 'e2', at: [58.5, 16], group: 'lower', yaw: Math.PI }, { class: 'pellian_archer', id: 'e3', at: [57.5, 13.5], group: 'lower' },
    { class: 'pellian', id: 'h1', at: [57, 9], group: 'guard' }, { class: 'pellian', id: 'h2', at: [60, 8], group: 'guard' }, { class: 'pellian', id: 'h3', at: [55, 6], group: 'guard' },
    { class: 'pellian_archer', id: 'h4', at: [62, 4], group: 'guard' }, { class: 'pellian_archer', id: 'h5', at: [54, 3], group: 'guard' }, { class: 'pellian', id: 'h6', at: [59, 4], group: 'guard' },
    { class: 'pellian', id: 'h7', at: [62, 10], group: 'guard' }, { class: 'pellian_archer', id: 'h8', at: [56, 11], group: 'guard' },
    { class: 'pellian', id: 'h9', at: [60, 6], group: 'guard' }, { class: 'pellian', id: 'h10', at: [55, 9], group: 'guard' }, { class: 'pellian_archer', id: 'h11', at: [61, 2.5], group: 'guard' },
    { class: 'pellian', id: 'd8', at: [54, 31], group: 'stair' }, { class: 'pellian', id: 'd9', at: [59, 27], group: 'stair' },
    { class: 'trigger_exit', rect: [53, 2, 55, 4] },
  ],
  beats: [
    { id: 'land', at: 'turret1', wake: ['turret'], lines: [['The archers on the turret whirl from the parapet, from shooting down at the crowd, and come at you.', 'warn']] },
    { id: 'turret', killed: 'turret', sets: 'turret_cleared' },
    { id: 'leads', at: 'roofA', needs: ['turret_cleared'], wake: ['roof'], lines: [['Pellian men-at-arms on the palace roof, spears levelled. Across the gaps, Arpello\'s turret.', '']] },
    { id: 'leads2', at: 'bridge3', sets: 'leads_crossed' },
    { id: 'archers', at: 'turret2', wake: ['archers'] },
    { id: 'archers2', killed: 'archers', sets: 'archers_cleared', lines: [['The archers are down. In the square below the mob roars your name.', 'good']] },
    { id: 'arpello', at: 'crown', wake: ['arpello'], lines: [['Arpello stands transfixed on the crown of the tower; "then with a cry he drew and leaped at Conan."', 'warn']] },
    { id: 'hurl', killed: 'arpello', hurl: 'ar', sets: 'arpello_hurled', lines: [['With a lion-like roar you parry the whistling blade, then drop your own sword, grip the prince "by crotch and neck," and heave him high above your head.', 'good'],
      ['"Take your plots to hell with you!" Like a sack of salt you hurl the prince of Pellia far out, to fall through empty space for a hundred and fifty feet.', 'voice'], ['The people give back as the body comes hurtling down, and the city rises.', 'good']] },
    { id: 'stair', at: 'tstair', needs: ['arpello_hurled'], wake: ['stair'] },
    { id: 'stair2', killed: 'stair', sets: 'stair_cleared', lines: [['The Pellians in the hall are down. Below, through the arrow-slits, the mob is battering at the gate-tower.', 'good']] },
    { id: 'lower', at: 'lstair', wake: ['lower'], lines: [['Arpello\'s household guard hold the lower stair against the mob. They do not know yet that he is dead.', 'warn']] },
    { id: 'guard', at: 'guardroom', wake: ['guard'] },
    { id: 'guard2', killed: 'guard', needs: ['stair_cleared'], sets: 'guard_broken', lines: [['The last of the Pellians break and run, down into the arms of the mob.', 'good'], ['In the street below the people of Tamar are roaring the king\'s name. The postern stands open.', 'good']] },
  ],
  puzzle: {
    flags: ['turret_cleared', 'leads_crossed', 'archers_cleared', 'arpello_hurled', 'stair_cleared', 'guard_broken'],
    actions: [
      { id: 'clear_the_turret', needs: [], sets: 'turret_cleared', at: 'turret1' }, { id: 'cross_the_leads', needs: ['turret_cleared'], sets: 'leads_crossed', at: 'bridge3' },
      { id: 'silence_the_archers', needs: ['leads_crossed'], sets: 'archers_cleared', at: 'turret2' }, { id: 'hurl_arpello', needs: ['archers_cleared'], sets: 'arpello_hurled', at: 'crown' },
      { id: 'drive_them_down', needs: ['arpello_hurled'], sets: 'stair_cleared', at: 'thall' },
      { id: 'break_the_guard', needs: ['stair_cleared'], sets: 'guard_broken', at: 'guardroom' },
    ],
    goal: 'guard_broken',
  },
};

// ---------------------------------------------------------------------------
// e1m7 "The Relief of Shamar" (ch. V): down off the ridge with the Bossonians
// loosing overhead, fire a siege tower, through Shemites, spearmen and the press
// of knights to Strabonus among his palace troops.
// ---------------------------------------------------------------------------
const MEADOW = { floor: 'TURF', wall: 'MUD', ceil: 'SUNSET' };
const LEVEL_E1M7 = {
  level: 'e1m7', next: 'e1m8', title: 'The Relief of Shamar', ramps: ['earth', 'night', 'scarlet'], grid: [96, 44], arms: 'sword',
  ambient: [0.34, 0.24, 0.16], haze: [0.5, 0.32, 0.2], open: true, fog: 0.008, sun: [0.6, 0.35, -0.4],
  intro: [['THE RELIEF OF SHAMAR', 'title'], ['"It is King Conan!" Strabonus shrieks it, paling; Tsotha squalls that you have been in Satha\'s belly for days.', 'voice'],
    ['On the ridge behind you the stolid Bossonians nock and draw; the Gundermen level their pikes. Down onto the plain!', '']],
  objectives: [['ridge_down', 'Down off the ridge.'], ['tower_fired', 'The siege towers mask any sortie from Shamar: climb them, and fire them both.'], ['shemites_broken', 'Break the Shemite archers.'],
    ['spears_broken', 'The Kothian spearmen, with the Gunderman pikes beside you.'], ['press_through', 'Find the gap through the press of knights.'], ['guards_down', 'Cut through his palace troops.'], ['strabonus_dead', 'Strabonus.'], ['zz', 'The host breaks: east along the road between the camp-fires, after it to the river.']],
  exitNeeds: 'strabonus_dead',
  allies: [{ id: 'bossonian', at: [4, 14], n: 18, cols: 3, step: 1.6, yaw: -Math.PI / 2, loose: true }, { id: 'gunderman', at: [46, 30], n: 12, cols: 4, step: 1.5, yaw: -Math.PI / 2 }],
  areas: [
    { id: 'ridge', type: 'action', name: 'The Ridge', rooms: ['ridge'], cp: [10, 22, -Math.PI / 2] },
    { id: 'towers', type: 'puzzle', name: 'The Siege Towers', rooms: ['climb1', 'tp1', 'tp2', 'climb2', 'ttop'], cp: [33, 12, -Math.PI / 2] },
    { id: 'towers2', type: 'puzzle', name: 'The Second Tower', rooms: ['climb1b', 'tp1b', 'tp2b', 'climb2b', 'ttopb'], cp: [33, 26, -Math.PI / 2] },
    { id: 'shemites', type: 'action', name: 'The Shemite Archers', rooms: ['line1'], cp: [20, 22, -Math.PI / 2] },
    { id: 'spears', type: 'action', name: 'The Kothian Spearmen', rooms: ['line2'], cp: [50, 22, -Math.PI / 2] },
    { id: 'press', type: 'puzzle', name: 'The Press of Knights', rooms: ['press'], cp: [63, 22, -Math.PI / 2] },
    { id: 'strabonus', type: 'action', name: 'Strabonus', rooms: ['palace'], cp: [77, 22, -Math.PI / 2] },
  ],
  rooms: [
    { id: 'rim', name: 'the plain before Shamar', at: [0, 0], size: [96, 44], nopass: true, sky: true, tex: MEADOW },
    { id: 'ridge', name: 'the ridge', at: [3, 4], size: [12, 36], floor: 3.2, rise: -0.25, sky: true, tex: MEADOW },
    { id: 'line1', name: 'the Shemite line', at: [15, 4], size: [16, 36], sky: true, tex: MEADOW },
    { id: 'field', name: 'the plain before the walls', at: [31, 18], size: [16, 22], sky: true, tex: MEADOW },
    { id: 'tbase', name: 'a siege tower hung with raw bull-hides', at: [37, 6], size: [10, 10], floor: 12, pit: 12, sky: true, tex: { floor: 'MUD', wall: 'HIDE', ceil: 'SUNSET' } },
    { id: 'tfoot', name: 'the foot of the siege tower', at: [31, 4], size: [6, 14], sky: true, tex: MEADOW },
    { id: 'climb1', name: 'the tower\'s ladders', at: [33, 10], size: [6, 2], floor: 0.4, rise: 1.0, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'tp1', name: 'a platform of the tower', at: [39, 10], size: [2, 2], floor: 6.0, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'tp2', name: 'a platform of the tower', at: [42, 10], size: [2, 3], floor: 6.4, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'climb2', name: 'the tower\'s ladders', at: [42, 13], size: [2, 2], floor: 7.0, rise: 1.0, riseAxis: 'z', sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'ttop', name: 'the top of the siege tower', at: [44, 12], size: [3, 3], floor: 8.6, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'tbase2', name: 'a siege tower hung with raw bull-hides', at: [37, 26], size: [10, 10], floor: 12, pit: 12, sky: true, tex: { floor: 'MUD', wall: 'HIDE', ceil: 'SUNSET' } },
    { id: 'climb1b', name: 'the tower\'s ladders', at: [33, 30], size: [6, 2], floor: 0.4, rise: 1.0, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'tp1b', name: 'a platform of the tower', at: [39, 30], size: [2, 2], floor: 6.0, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'tp2b', name: 'a platform of the tower', at: [42, 30], size: [2, 3], floor: 6.4, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'climb2b', name: 'the tower\'s ladders', at: [42, 33], size: [2, 2], floor: 7.0, rise: 1.0, riseAxis: 'z', sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'ttopb', name: 'the top of the second siege tower', at: [44, 32], size: [3, 3], floor: 8.6, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'line2', name: 'the Kothian spearmen', at: [47, 4], size: [12, 36], sky: true, tex: MEADOW },
    { id: 'press', name: 'the press of knights', at: [59, 4], size: [14, 36], sky: true, tex: MEADOW },
    { id: 'palace', name: 'Strabonus\'s palace troops', at: [73, 4], size: [18, 36], sky: true, tex: MEADOW },
    { id: 'road', name: 'the road east, to the river', at: [89, 19], size: [7, 6], sky: true, tex: { floor: 'MUD', wall: 'MUD', ceil: 'SUNSET' } },
  ],
  boulders: [{ from: [2.5, 3], to: [2.5, 41], r: [1.6, 3.2] }, { from: [3, 41.2], to: [92, 41.2], r: [1.6, 3.4], jitter: 2 }, { from: [92.5, 3], to: [92.5, 17.5], r: [1.8, 3.6] }, { from: [92.5, 26.5], to: [92.5, 41], r: [1.8, 3.6] },   // a gap: the road east, to the river
    { from: [3, 2.8], to: [30, 2.8], r: [1.4, 3], jitter: 1.5 }, { from: [48, 2.8], to: [92, 2.8], r: [1.4, 3], jitter: 1.5 }],
  scatter: [{ prefab: 'fallen', n: 60, rect: [14, 5, 76, 34] }, { prefab: 'deadhorse', n: 14, rect: [16, 6, 72, 32] }, { prefab: 'standard', n: 10, rect: [16, 6, 72, 32] }],
  shafts: [], links: [], features: [],
  lights: [],
  props: [{ prefab: 'brazier', at: [89.5, 18.2] }, { prefab: 'brazier', at: [89.5, 25.8] }, { prefab: 'standard', at: [91, 18.8] }, { prefab: 'standard', at: [91.5, 25.2] }, { prefab: 'standard', at: [93.5, 19.5] }],   // the camp-fires of Koth burning at the road's mouth
  items: [{ kind: 'wine', name: 'a Shemite\'s wine-skin', heal: 35, at: [25, 12] }, { kind: 'bread', name: 'a Shemite\'s barley-cake', heal: 30, at: [26, 33] }, { kind: 'wine', name: 'a captain\'s wine-flask', heal: 40, at: [74, 30] },
    { kind: 'bread', name: 'a Shemite\'s barley-cake', heal: 30, at: [19, 17] }, { kind: 'wine', name: 'a Shemite\'s wine-skin', heal: 35, at: [21, 27] }, { kind: 'wine', name: 'a dead knight\'s wine-skin', heal: 35, at: [28, 22] },
    { kind: 'bread', name: 'a Bossonian\'s bread', heal: 30, at: [32, 19] }, { kind: 'wine', name: 'a pikeman\'s wine-skin', heal: 35, at: [34, 38] },
    { kind: 'wine', name: 'a dead knight\'s wine-skin', heal: 35, at: [57, 14] }, { kind: 'bread', name: 'a camp loaf', heal: 30, at: [71, 28] }, { kind: 'wine', name: 'a wine-skin', heal: 35, at: [73, 12] }],
  entities: [
    { class: 'info_player_start', at: [9, 22], yaw: -Math.PI / 2 },
    { class: 'archer', id: 'a1', at: [22, 12], group: 'shemites' }, { class: 'archer', id: 'a2', at: [24, 18], group: 'shemites' }, { class: 'archer', id: 'a3', at: [23, 26], group: 'shemites' },
    { class: 'archer', id: 'a4', at: [25, 32], group: 'shemites' }, { class: 'spearman', id: 'a5', at: [20, 20], group: 'shemites', yaw: Math.PI / 2 }, { class: 'spearman', id: 'a6', at: [20, 25], group: 'shemites', yaw: Math.PI / 2 },
    { class: 'spearman', id: 'a7', at: [21, 30], group: 'shemites', yaw: Math.PI / 2 },
    { class: 'archer', id: 'm1', at: [28, 9], group: 'shemites2' }, { class: 'archer', id: 'm2', at: [29, 16], group: 'shemites2' }, { class: 'spearman', id: 'm3', at: [27, 22], group: 'shemites2', yaw: Math.PI / 2 },
    { class: 'archer', id: 'm4', at: [29, 29], group: 'shemites2' }, { class: 'spearman', id: 'm5', at: [27, 35], group: 'shemites2', yaw: Math.PI / 2 }, { class: 'spearman', id: 'm6', at: [26, 13], group: 'shemites2', yaw: Math.PI / 2 },
    { class: 'archer', id: 'm7', at: [29.5, 37], group: 'shemites2' },
    { class: 'spearman', id: 'g1', at: [33, 6], group: 'tower' }, { class: 'spearman', id: 'g2', at: [35, 14], group: 'tower' }, { class: 'archer', id: 'g3', at: [32, 16], group: 'tower' },
    { class: 'spearman', id: 'u1', at: [33, 27], group: 'tower2' }, { class: 'kknight', id: 'u2', at: [35, 37], group: 'tower2' }, { class: 'archer', id: 'u3', at: [31.5, 38], group: 'tower2' }, { class: 'spearman', id: 'u4', at: [36, 34], group: 'tower2' },
    { class: 'spearman', id: 's1', at: [52, 14], group: 'spears', yaw: Math.PI / 2 }, { class: 'spearman', id: 's2', at: [52, 19], group: 'spears', yaw: Math.PI / 2 }, { class: 'spearman', id: 's3', at: [52, 24], group: 'spears', yaw: Math.PI / 2 },
    { class: 'spearman', id: 's4', at: [53, 29], group: 'spears', yaw: Math.PI / 2 }, { class: 'spearman', id: 's5', at: [55, 17], group: 'spears', yaw: Math.PI / 2 }, { class: 'spearman', id: 's6', at: [55, 26], group: 'spears', yaw: Math.PI / 2 },
    { class: 'kknight', id: 'k1', at: [63, 16], group: 'press', yaw: Math.PI / 2 }, { class: 'oknight', id: 'k2', at: [64, 21], group: 'press', yaw: Math.PI / 2 }, { class: 'kknight', id: 'k3', at: [63, 26], group: 'press', yaw: Math.PI / 2 },
    { class: 'oknight', id: 'k4', at: [67, 19], group: 'press', yaw: Math.PI / 2 }, { class: 'kknight', id: 'k5', at: [67, 24], group: 'press', yaw: Math.PI / 2 }, { class: 'oknight', id: 'k6', at: [70, 22], group: 'press', yaw: Math.PI / 2 },
    { class: 'strabonus', id: 'st', at: [84, 22], group: 'palace', yaw: Math.PI / 2 }, { class: 'kknight', id: 'p1', at: [79, 18], group: 'palace', yaw: Math.PI / 2 }, { class: 'kknight', id: 'p2', at: [79, 26], group: 'palace', yaw: Math.PI / 2 },
    { class: 'spearman', id: 'p3', at: [82, 15], group: 'palace' }, { class: 'spearman', id: 'p4', at: [82, 29], group: 'palace' },
    { class: 'kknight', id: 'p5', at: [77, 12], group: 'guards' }, { class: 'archer', id: 'p6', at: [86, 10], group: 'guards' }, { class: 'kknight', id: 'p7', at: [77, 32], group: 'guards' },
    { class: 'archer', id: 'p8', at: [86, 34], group: 'guards' }, { class: 'spearman', id: 'p9', at: [80, 22], group: 'guards' }, { class: 'oknight', id: 'p10', at: [75, 25], group: 'guards' },
    { class: 'trigger_exit', rect: [92, 19, 95, 25] },
  ],
  beats: [
    { id: 'down', at: 'line1', sets: 'ridge_down', wake: ['shemites'], lines: [['The Bossonians loose over your head: "the cord to the nock, shaft to the ear, the king of Koth for a mark!"', 'dim']] },
    { id: 'tower', at: ['tfoot', 'climb1'], wake: ['tower'], lines: [['"The men on the battle-towers can mask any sorties": the siege towers, hung with raw bull-hides, roll against Shamar\'s walls.', '']] },
    { id: 'fired', at: 'ttop', after: 2, sets: 'tower1_fired', sound: 'crush', lines: [['You tear the bull-hides back and set fire to the timber beneath. The tower roars up in flame. There is another, to the south.', 'good']] },
    { id: 'tower2', at: ['climb1b', 'tp1b'], wake: ['tower2'] },
    { id: 'fired2', at: 'ttopb', after: 2, sets: 'tower2_fired', sound: 'crush' },
    { id: 'towers', needs: ['tower1_fired', 'tower2_fired'], sets: 'tower_fired', lines: [['The second tower goes up like a torch. Nothing masks the gates of Shamar now, and the garrison sallies.', 'good']] },
    { id: 'shem', killed: 'shemites', wake: ['shemites2'], lines: [['The first rank of Shemites breaks; behind it their second line nocks and draws.', 'warn']] },
    { id: 'shem2', killed: 'shemites2', sets: 'shemites_broken', lines: [['The Shemite line breaks and runs.', 'good']] },
    { id: 'spears', at: 'line2', wake: ['spears'], lines: [['The Kothian spearmen; and beside you, the Gundermen, "the purest blood of all the Hyborian peoples," whom no infantry can match.', '']] },
    { id: 'spears2', killed: 'spears', sets: 'spears_broken' },
    { id: 'press', at: 'press', needs: ['spears_broken'], wake: ['press'], lines: [['The press of knights mills in confusion. Cut a gap through it, as the charge did.', 'warn']] },
    { id: 'press2', killed: 'press', sets: 'press_through' },
    { id: 'guards', at: 'palace', needs: ['press_through'], wake: ['guards'], lines: [['The palace troops of Koth close round their king: picked men, in gilded mail.', 'warn']] },
    { id: 'strab', at: 'palace', needs: ['guards_down'], wake: ['palace'], lines: [['Strabonus among his palace troops, his axe up. "It clanged on Conan\'s helmet."', 'warn']] },
    { id: 'guards2', killed: 'guards', sets: 'guards_down' },
    { id: 'strab2', killed: 'palace', needs: ['tower_fired'], sets: 'strabonus_dead', lines: [['Strabonus goes down beneath the five-foot blade, his skull crushed.', 'good'],
      ['Amalrus goes down dying beneath the trampling hoofs, "his shoulder-bone hewn in twain by Prospero\'s two-handed sword." The host breaks, and runs for the river.', 'good'], ['East, between the camp-fires, the road to the Tybor. After them!', 'warn']] },
  ],
  puzzle: {
    flags: ['ridge_down', 'tower1_fired', 'tower2_fired', 'tower_fired', 'shemites_broken', 'spears_broken', 'press_through', 'guards_down', 'strabonus_dead'],
    actions: [
      { id: 'come_down', needs: [], sets: 'ridge_down', at: 'line1' }, { id: 'fire_a_tower', needs: ['ridge_down'], sets: 'tower1_fired', at: 'ttop' }, { id: 'fire_the_other', needs: ['ridge_down'], sets: 'tower2_fired', at: 'ttopb' },
      { id: 'both_burn', needs: ['tower1_fired', 'tower2_fired'], sets: 'tower_fired', at: 'field' },
      { id: 'break_the_shemites', needs: ['ridge_down'], sets: 'shemites_broken', at: 'line1' }, { id: 'break_the_spears', needs: ['tower_fired', 'shemites_broken'], sets: 'spears_broken', at: 'line2' },
      { id: 'through_the_press', needs: ['spears_broken'], sets: 'press_through', at: 'press' }, { id: 'cut_through_the_guards', needs: ['press_through'], sets: 'guards_down', at: 'palace' }, { id: 'kill_strabonus', needs: ['guards_down'], sets: 'strabonus_dead', at: 'palace' },
    ],
    goal: 'strabonus_dead',
  },
};

// ---------------------------------------------------------------------------
// e1m8 "The Tybor" (ch. V): the rout to the river; the barge bridge cut adrift
// under you; the far bank; Tsotha thrown by the eagle, at bay with his globes.
// ---------------------------------------------------------------------------
const LEVEL_E1M8 = {
  level: 'e1m8', title: 'The Tybor', ramps: ['earth', 'night', 'scarlet'], grid: [96, 64], arms: 'sword',
  ambient: [0.3, 0.18, 0.13], haze: [0.52, 0.16, 0.1], open: true, fog: 0.008, sun: [-1, 0.06, 0.2], waterY: -0.25,   // the Tybor runs high: just under the barges' decks and the banks
  groundFog: { density: 0.05, falloff: 0.6, floor: 0, col: [0.5, 0.2, 0.12] },
  intro: [['THE TYBOR', 'title'], ['The rout runs down to the river. The men of Shamar are cutting the barge bridge adrift, and the fugitives drown.', ''],
    ['Tsotha has crossed already, "riding like the wind on a gaunt weird-looking steed whose stride no natural horse could match."', 'warn']],
  objectives: [['camp_done', 'North along the bank, through the Kothian camp.'], ['rout_done', 'On to the barge bridge, through the breaking host.'], ['crossed', 'Across the barge bridge: leap from barge to barge before it breaks up.'],
    ['bank_cleared', 'The fugitives at bay on the far bank, and in the reeds downstream.'], ['tsotha_found', 'Follow Tsotha\'s track across the meadow.'], ['tsotha_dead', 'Tsotha. Close the distance, and behead him.'], ['zz', '']],
  exitNeeds: 'the_end',
  eagle: { from: 'meadow', dead: 'dead', foe: 'tsotha' },
  cine: { from: 'dead', foe: 'tsotha' },   // when he falls, the closing scene plays itself, and the game ends   // Pelias's eagle: drawn over the meadow (beats.js)
  areas: [
    { id: 'camp', type: 'action', name: 'The Camp', rooms: ['bank_s'], cp: [8, 56, Math.PI] },
    { id: 'rout', type: 'action', name: 'The Rout', rooms: ['bank'], cp: [10, 34, Math.PI] },
    { id: 'bridge', type: 'puzzle', name: 'The Barge Bridge', rooms: ['b1', 'b2', 'b3', 'b4', 'b5'], cp: [30, 21, -Math.PI / 2] },
    { id: 'farbank', type: 'action', name: 'The Far Bank', rooms: ['far', 'reeds'], cp: [58, 20, -Math.PI / 2] },
    { id: 'meadow', type: 'puzzle', name: 'The Meadow', rooms: ['meadow'], cp: [70, 20, -Math.PI / 2] },
  ],
  rooms: [
    { id: 'rim', name: 'the banks of the Tybor', at: [0, 0], size: [96, 64], nopass: true, sky: true, tex: MEADOW },
    { id: 'bank_s', name: 'the Kothian camp by the river', at: [3, 36], size: [27, 25], sky: true, tex: MEADOW },
    { id: 'bank', name: 'the river bank', at: [3, 4], size: [27, 32], sky: true, tex: MEADOW },
    { id: 'river', name: 'the Tybor', at: [30, 2], size: [24, 60], pit: 30, water: true, sky: true, tex: STREAM },
    { id: 'b1', name: 'a barge of the bridge', at: [30, 18], size: [3, 5], floor: 0.3, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'b2', name: 'a barge of the bridge', at: [34, 18], size: [4, 5], floor: 0.3, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'b3', name: 'a barge of the bridge', at: [39, 17], size: [4, 6], floor: 0.3, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'b4', name: 'a barge of the bridge', at: [44, 18], size: [4, 5], floor: 0.3, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'b5', name: 'a barge of the bridge', at: [49, 18], size: [4, 5], floor: 0.3, sky: true, tex: { floor: 'PLANK', wall: 'PLANK', ceil: 'SUNSET' } },
    { id: 'far', name: 'the far bank', at: [54, 4], size: [12, 56], sky: true, tex: MEADOW },
    { id: 'reeds', name: 'the reed-beds where the fugitives hid', at: [66, 40], size: [14, 20], sky: true, tex: MEADOW },
    { id: 'meadow', name: 'the meadow at sunset', at: [66, 4], size: [26, 32], sky: true, tex: MEADOW },
  ],
  planks: [{ from: [32.9, 19.5], to: [34.1, 19.5] }, { from: [37.9, 21.5], to: [39.1, 21.5] }, { from: [42.9, 19.5], to: [44.1, 19.5] }, { from: [47.9, 21.5], to: [49.1, 21.5] }, { from: [52.9, 20.5], to: [54.1, 20.5] }],
  boulders: [{ from: [2.5, 3], to: [2.5, 61], r: [1.6, 3.2] }, { from: [3, 61.2], to: [30, 61.2], r: [1.6, 3], jitter: 2 }, { from: [54, 61.2], to: [80, 61.2], r: [1.6, 3], jitter: 2 }, { from: [80.5, 37], to: [80.5, 61], r: [1.6, 3] }, { from: [66, 37.2], to: [92, 37.2], r: [1.6, 3], jitter: 2 },
    { from: [92.5, 3], to: [92.5, 37], r: [1.8, 3.6] }, { from: [3, 2.8], to: [30, 2.8], r: [1.4, 3] }, { from: [54, 2.8], to: [92, 2.8], r: [1.4, 3] }],
  scatter: [{ prefab: 'fallen', n: 40, rect: [4, 5, 25, 30] }, { prefab: 'standard', n: 9, rect: [5, 38, 22, 20] }, { prefab: 'fallen', n: 30, rect: [4, 37, 25, 22] }, { prefab: 'deadhorse', n: 6, rect: [5, 38, 22, 20] }, { prefab: 'deadhorse', n: 8, rect: [5, 6, 22, 28] }, { prefab: 'fallen', n: 14, rect: [55, 5, 10, 30] }],
  shafts: [], links: [], features: [], lights: [], props: [],
  items: [{ kind: 'wine', name: 'a knight\'s wine-skin', heal: 35, at: [62, 40] }, { kind: 'bread', name: 'a fugitive\'s bread', heal: 30, at: [72, 50] },
    { kind: 'wine', name: 'a Kothian captain\'s wine', heal: 40, at: [14, 50] }, { kind: 'bread', name: 'camp bread', heal: 30, at: [24, 42] },
    { kind: 'wine', name: 'a dead man\'s wine-skin', heal: 35, at: [18, 14] }, { kind: 'bread', name: 'a camp loaf', heal: 30, at: [26, 28] },
    { kind: 'wine', name: 'a fugitive\'s wine-skin', heal: 35, at: [60, 12] }, { kind: 'bread', name: 'a fugitive\'s bread', heal: 30, at: [64, 30] }],
  entities: [
    { class: 'info_player_start', at: [8, 57], yaw: Math.PI },
    { class: 'kknight', id: 'c1', at: [10, 50], group: 'camp' }, { class: 'spearman', id: 'c2', at: [14, 47], group: 'camp' }, { class: 'archer', id: 'c3', at: [20, 52], group: 'camp' },
    { class: 'oknight', id: 'c4', at: [18, 44], group: 'camp' }, { class: 'spearman', id: 'c5', at: [8, 41], group: 'camp' }, { class: 'spearman', id: 'c6', at: [24, 46], group: 'camp' },
    { class: 'archer', id: 'c7', at: [26, 39], group: 'camp' }, { class: 'kknight', id: 'c8', at: [13, 38], group: 'camp' }, { class: 'oknight', id: 'c9', at: [22, 37], group: 'camp' },
    { class: 'spearman', id: 'r1', at: [12, 15], group: 'rout' }, { class: 'kknight', id: 'r2', at: [14, 24], group: 'rout' }, { class: 'archer', id: 'r3', at: [17, 10], group: 'rout' },
    { class: 'spearman', id: 'r4', at: [19, 20], group: 'rout' }, { class: 'oknight', id: 'r5', at: [22, 27], group: 'rout' }, { class: 'spearman', id: 'r6', at: [24, 16], group: 'rout' },
    { class: 'kknight', id: 'r7', at: [26, 22], group: 'rout' }, { class: 'archer', id: 'r8', at: [27, 30], group: 'rout' },
    { class: 'spearman', id: 'f1', at: [57, 15], group: 'far' }, { class: 'kknight', id: 'f2', at: [58, 22], group: 'far' }, { class: 'spearman', id: 'f3', at: [60, 27], group: 'far' },
    { class: 'archer', id: 'f4', at: [63, 12], group: 'far' }, { class: 'oknight', id: 'f5', at: [62, 20], group: 'far' }, { class: 'archer', id: 'f6', at: [64, 30], group: 'far' },
    { class: 'kknight', id: 'y1', at: [60, 44], group: 'bay' }, { class: 'spearman', id: 'y2', at: [63, 48], group: 'bay' }, { class: 'archer', id: 'y3', at: [70, 46], group: 'bay' },
    { class: 'oknight', id: 'y4', at: [74, 52], group: 'bay' }, { class: 'spearman', id: 'y5', at: [68, 55], group: 'bay' }, { class: 'kknight', id: 'y6', at: [58, 54], group: 'bay' },
    { class: 'archer', id: 'y7', at: [77, 44], group: 'bay' },
    { class: 'tsotha', id: 'ts', at: [84, 20], group: 'tsotha', yaw: Math.PI / 2 },
    { class: 'trigger_exit', rect: [86, 17, 90, 24] },
  ],
  beats: [
    { id: 'camp', at: 'bank_s', wake: ['camp'], lines: [['The camp of Koth by the river: men cutting loose horses, men dragging plunder to the water, and some who turn and fight.', 'warn']] },
    { id: 'camp2', killed: 'camp', sets: 'camp_done', lines: [['North, along the bank, to the barge bridge.', 'dim']] },
    { id: 'rout', at: 'bank', wake: ['rout'] },
    { id: 'rout2', killed: 'rout', needs: ['camp_done'], sets: 'rout_done', lines: [['The fugitives ahead of you scatter along the bank. Out on the river the men of Shamar hack at the lashings of the barge bridge.', 'warn']] },
    { id: 'bridge', at: ['b1', 'b2'], lines: [['The barges lurch under you; the lashings part one by one. Leap, and do not stop!', 'warn']] },
    { id: 'crossed', at: 'far', sets: 'crossed', wake: ['far'], lines: [['Behind you the bridge breaks up, and the fugitives on it go down into the Tybor. On the far bank some who crossed ahead of you turn at bay.', 'warn']] },
    { id: 'far2', killed: 'far', lines: [['More of them downstream, in the reed-beds: knights who threw away their horses, and will sell their lives dear.', 'warn']] },
    { id: 'bay', killed: 'far', after: 4, wake: ['bay'] },
    { id: 'bay2', killed: 'bay', needs: ['crossed'], sets: 'bank_cleared', lines: [['The far bank is yours. Away to the east, a dust-cloud: the gaunt steed\'s track.', 'dim']] },
    { id: 'meadow', at: 'meadow', needs: ['bank_cleared'], after: 3, sets: 'tsotha_found', wake: ['tsotha'], sound: 'scream',
      lines: [['Across the sunset meadow, the gaunt steed\'s track. "In the sky appeared a dot, that grew into a huge eagle"; it drives at the head of Tsotha\'s steed, which screams and rears, throwing its rider.', 'warn'],
        ['Old Tsotha rises and faces you, "his eyes those of a maddened serpent, his face an inhuman mask." A globe of fire in each hand.', 'voice']] },
    { id: 'dead', killed: 'tsotha', sets: 'tsotha_dead', lines: [['The great sword takes his head before he can throw again.', 'good'],
      ['The eagle swoops, seizes the head, and is gone into the sunset, laughing in the voice of Pelias; and the headless body staggers away after it, across the meadow, and is lost to sight.', 'voice']] },
    { id: 'end', needs: ['tsotha_dead'], after: 11, sets: 'the_end' },
  ],
  puzzle: {
    flags: ['camp_done', 'rout_done', 'crossed', 'bank_cleared', 'tsotha_found', 'tsotha_dead', 'the_end'],
    actions: [
      { id: 'through_the_camp', needs: [], sets: 'camp_done', at: 'bank_s' }, { id: 'through_the_rout', needs: ['camp_done'], sets: 'rout_done', at: 'bank' }, { id: 'leap_the_barges', needs: ['rout_done'], sets: 'crossed', at: 'far' },
      { id: 'clear_the_bank', needs: ['crossed'], sets: 'bank_cleared', at: 'far' }, { id: 'follow_the_track', needs: ['bank_cleared'], sets: 'tsotha_found', at: 'meadow' },
      { id: 'behead_him', needs: ['tsotha_found'], sets: 'tsotha_dead', at: 'meadow' }, { id: 'the_eagle', needs: ['tsotha_dead'], sets: 'the_end', at: 'meadow' },
    ],
    goal: 'the_end',
  },
};

const LEVELS = { e1m1: LEVEL_E1M1, e1m2: LEVEL_E1M2, e1m3: LEVEL_E1M3, e1m4: LEVEL_E1M4, e1m5: LEVEL_E1M5, e1m6: LEVEL_E1M6, e1m7: LEVEL_E1M7, e1m8: LEVEL_E1M8 };
let LEVEL = LEVEL_E1M2;

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
    room: new Int8Array(N).fill(-1), rough: new Float32Array(N).fill(1), vault: new Float32Array(N), tex: new Array(N), deep: new Uint8Array(N), void: new Uint8Array(N), planks: [],
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
      LV.deep[idx] = r.pit > 3 ? 1 : 0; LV.void[idx] = r.void ? 1 : 0;
      LV.floor[idx] = r.pit ? fl - r.pit : fl;
      LV.ceil[idx] = r.pit ? LV.ceil[idx] || fl + 4 * CELL : fl + (r.h || 2) * CELL;
      LV.room[idx] = ri; LV.rough[idx] = st ? 0.12 : 1; LV.vault[idx] = r.vault || 0; LV.tex[idx] = tex;
      LV.flags[idx] = (r.hide ? F_HIDE : 0) | (r.nopass ? F_NOPASS : 0) | (r.id === 'serpent' ? F_SLIME : 0) | (r.wind ? F_WIND : 0) | (r.water ? F_WATER : 0);
      if (r.sky) { LV.flags[idx] |= F_SKY | F_TALL; LV.ceil[idx] = fl + 14 * CELL; }
    }
  });
  for (const s of spec.shafts) {
    const idx = s.at[1] * W + s.at[0];
    LV.ceil[idx] = LV.floor[idx] + s.h * CELL; LV.flags[idx] |= F_TALL | F_SKY;
  }
  for (const l of spec.links) for (const [gx, gz] of l.cells) LV.blockers.add(gz * W + gx);
  LV.wallErrors = checkWallMounts(spec);
  // corners are shared by every cell that touches them: watertight, but jittered
  LV.corners = new Array((W + 1) * (H + 1));
  for (let gz = 0; gz <= H; gz++) for (let gx = 0; gx <= W; gx++) LV.corners[gz * (W + 1) + gx] = computeCorner(gx, gz);

  const W2 = (gx, gz) => [gx * CELL, gz * CELL];
  // planks across deep pits: from/to in cells; the plank's top is the rim's floor at its ends
  for (const pk of spec.planks || []) {
    const [x0, z0] = W2(pk.from[0], pk.from[1]), [x1, z1] = W2(pk.to[0], pk.to[1]);
    LV.planks.push({ x0, z0, x1, z1, hw: 0.36, y: Math.max(groundInfo(x0, z0).floor, groundInfo(x1, z1).floor) });
  }
  for (const p of spec.props.concat(scatterProps(spec))) {
    const [x, z] = W2(p.at[0], p.at[1]);
    const prop = Object.assign({}, p, { x, z, y: p.level !== undefined ? p.level : groundInfo(x + wallIn(p.wall)[0] * 0.6, z + wallIn(p.wall)[1] * 0.6).floor });
    LV.props.push(prop);
    if (p.prefab === 'torch') {
      const n = wallIn(p.wall);
      LV.lights.push({ x: x + n[0] * 0.9, y: prop.y + 2.6, z: z + n[1] * 0.9, r: 1.0, g: 0.6, b: 0.28, rad: 15 * Math.sqrt(p.dim || 1), i: 1.6 * (p.dim || 1) });
    } else if (p.prefab === 'brazier') {
      LV.lights.push({ x, y: prop.y + 1.6, z, r: 1.0, g: 0.55, b: 0.22, rad: 16 * Math.sqrt(p.dim || 1), i: 1.9 * (p.dim || 1) });
      LV.colliders.push({ x, z, r: 0.75 });
    } else if (p.prefab === 'table') LV.colliders.push({ x, z, r: 1.15 });
    else if (p.prefab === 'heap') LV.colliders.push({ x, z, r: 2.0 });
    else if (p.prefab === 'boulder') LV.colliders.push({ x, z, r: p.size * 0.85 });
    else if (p.prefab === 'deadhorse') { LV.colliders.push({ x, z, r: 0.75 }); if (p.cover) { const ci = cellIdx(Math.floor(p.at[0]), Math.floor(p.at[1])); if (ci >= 0) LV.flags[ci] |= F_HIDE; } }
    else if (p.prefab === 'column') LV.colliders.push({ x, z, r: 0.75 });
    else if (p.prefab === 'winch') LV.colliders.push({ x, z, r: 0.45 });
    else if (p.prefab === 'stal') LV.colliders.push({ x, z, r: 0.7 });
    else if (p.prefab === 'post') LV.colliders.push({ x, z, r: 0.35 });
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
// Every wall-mounted thing (clue, torch, chains, banner, rack) must have rock behind it and
// open floor in front, or it floats in mid-air. Logged at load; test/run.sh fails on it.
function checkWallMounts(spec) {
  const bad = [];
  for (const m of spec.features.concat(spec.props)) {
    if (!m.wall) continue;
    const n = wallIn(m.wall), front = cellIdx(Math.floor(m.at[0] + n[0] * 0.3), Math.floor(m.at[1] + n[1] * 0.3)), back = cellIdx(Math.floor(m.at[0] - n[0] * 0.3), Math.floor(m.at[1] - n[1] * 0.3));
    if (front < 0 || LV.kind[front] === 0 || (back >= 0 && LV.kind[back] !== 0)) bad.push((m.id || m.prefab) + ' at ' + m.at.join(',') + ' wall ' + m.wall);
  }
  // anything set above the floor must sit on a table top (1.0 x 0.62 cells' worth of planks, in world units)
  for (const it of spec.items) {
    if (it.y === undefined) continue;
    const on = spec.props.some(p => p.prefab === 'table' && Math.abs((it.at[0] - p.at[0]) * CELL) < 0.85 && Math.abs((it.at[1] - p.at[1]) * CELL) < 0.5);
    if (!on) bad.push(it.name + ' at ' + it.at.join(',') + ' is not on a table');
  }
  if (bad.length) console.warn('[level] ' + spec.level + ': floating: ' + bad.join('; '));
  return bad;
}
// unit vector pointing out of a wall into the room
function wallIn(w) { return w === 'N' ? [0, 1] : w === 'S' ? [0, -1] : w === 'E' ? [-1, 0] : w === 'W' ? [1, 0] : [0, 0]; }

// ---- queries ----------------------------------------------------------------
function cellIdx(gx, gz) { return (!(gx >= 0) || !(gz >= 0) || gz < 0 || gx >= LV.W || gz >= LV.H) ? -1 : gz * LV.W + gx; }
function kindAt(gx, gz) { const i = cellIdx(gx, gz); return i < 0 ? 0 : LV.kind[i]; }

// Props a level asks for in bulk, placed by hash so every load is the same: scattered dead and wreckage,
// and lines of boulders that close an open level in (README: the plain of Shamu has no walls).
function scatterProps(spec) {
  const out = [];
  (spec.scatter || []).forEach((sc, si) => {
    for (let k = 0; k < sc.n; k++) {
      const h = q => hrand(k, q, si + 3, 61), [x0, z0, w, d] = sc.rect;
      out.push({ prefab: sc.prefab, at: [x0 + h(1) * w, z0 + h(2) * d], rot: h(3) * 6.283, size: sc.size ? sc.size[0] + h(4) * (sc.size[1] - sc.size[0]) : 1 });
    }
  });
  (spec.boulders || []).forEach((ln, li) => {
    const [x0, z0] = ln.from, [x1, z1] = ln.to, L = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / L, nz = (x1 - x0) / L;
    for (let t = 0, k = 0; t <= L; k++) {
      const h = q => hrand(k, q, li + 11, 91), r = ln.r[0] + h(1) * (ln.r[1] - ln.r[0]), off = (h(2) - 0.5) * (ln.jitter || 1.2);
      out.push({ prefab: 'boulder', at: [x0 + (x1 - x0) * t / L + nx * off, z0 + (z1 - z0) * t / L + nz * off], size: r, rot: h(3) * 6.283 });
      t += r / CELL * (0.75 + 0.35 * h(4));
    }
  });
  return out;
}
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
  if (kind === 2 && LV.planks.length) {                  // a plank across the pit holds you up (while it lasts)
    for (let i = 0; i < LV.planks.length; i++) {
      const p = LV.planks[i];
      if (typeof S !== 'undefined' && S && S.planks && S.planks[i] && S.planks[i].state === 'gone') continue;
      const dx = p.x1 - p.x0, dz = p.z1 - p.z0, L2 = dx * dx + dz * dz, t = ((x - p.x0) * dx + (z - p.z0) * dz) / L2;
      if (t < 0 || t > 1) continue;
      if (Math.hypot(x - p.x0 - dx * t, z - p.z0 - dz * t) < p.hw) { info.floor = p.y; info.plank = i; break; }
    }
  }
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
