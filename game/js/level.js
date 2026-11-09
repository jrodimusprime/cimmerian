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

const F_HIDE = 1, F_NOPASS = 2, F_TALL = 4, F_SKY = 8, F_SLIME = 16, F_WIND = 32;

// Pacing (README §9): every level alternates PUZZLE areas (think, read,
// time things) and ACTION areas (fight). e1m2 runs:
//   cell (puzzle) -> hall (timing puzzle) -> wardens' post (action) ->
//   grille (puzzle) -> guardroom + barracks (action) -> winch (puzzle) ->
//   captain's landing (action) -> exit.
const LEVEL_E1M2 = {
  level: 'e1m2', next: 'e1m1', ambient: [0.05, 0.046, 0.04], exitVoid: { from: [65.5, 14], to: [72, 14], w: 3.5 }, title: 'The Pits', ramps: ['ink', 'jade', 'fire'], grid: [72, 32],
  // README §9, e1m2: the book's beats in the book's order (ch. II–III)
  areas: [
    { id: 'vault', type: 'puzzle', name: 'The Vault', rooms: ['cell', 'arch'] },
    { id: 'hall', type: 'puzzle', name: 'The Main Corridor', rooms: ['hall', 'well', 'a1', 'a2', 'a3', 'n1', 'n2'], cp: [7.5, 12.4, Math.PI] },
    { id: 'post', type: 'action', name: 'The Gnawed Tunnels', rooms: ['south_passage', 'post', 'gallery', 'gsteps'], cp: [26.8, 16.5, Math.PI] },
    { id: 'east', type: 'puzzle', name: 'The Corridor East', rooms: ['niche', 'narrows'], cp: [32.6, 16, 0] },
    { id: 'vaults', type: 'action', name: 'The Old Vaults', rooms: ['guard', 'breach', 'den'], cp: [36.5, 14, -Math.PI / 2] },
    { id: 'pits', type: 'puzzle', name: 'The Pitted Way', rooms: ['nook', 'narrow', 'slope', 'landing'], cp: [44.2, 14, -Math.PI / 2] },
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
    { id: 'pit1', name: 'a pit', at: [55, 9], size: [1, 6], floor: 7.4, pit: 34, style: 'rough', tex: { wall: 'ROCK' } },
    { id: 'pit2', name: 'a pit', at: [57, 13], size: [1, 6], floor: 7.4, pit: 34, style: 'rough', tex: { wall: 'ROCK' } },
    { id: 'pit3', name: 'a pit', at: [59, 9], size: [1, 6], floor: 7.4, pit: 34, style: 'rough', tex: { wall: 'ROCK' } },
    { id: 'bonepit', name: 'the Bone Pit', at: [61, 11], size: [4, 6], h: 3, floor: 7.4, style: 'rough' },
    { id: 'exit', name: 'a dank tunnel', at: [65, 13], size: [6, 2], h: 1.6, floor: 7.4, style: 'rough' },
  ],
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
    { prefab: 'bones', at: [54, 17.5] }, { prefab: 'skull', at: [60.3, 9.6] },
    { prefab: 'bones', at: [62, 12], big: true }, { prefab: 'bones', at: [63.6, 15.6], big: true }, { prefab: 'skull', at: [64.3, 11.7] },
  ],
  lights: [
    { at: [4, 14], y: -4, col: [0.25, 0.55, 0.38], rad: 10, i: 0.9 },             // slime glow in the well
    { at: [28, 7], y: -8, col: [0.25, 0.55, 0.38], rad: 9, i: 0.6 },              // slime glow in the serpent's hole
    { at: [6.4, 9.4], y: 2.4, col: [1.0, 0.6, 0.28], rad: 11, i: 1.5 },           // the torch in the niche above the king
    { at: [55.5, 12], y: -3, col: [0.25, 0.6, 0.4], rad: 6, i: 0.8 }, { at: [57.5, 16], y: -3, col: [0.25, 0.6, 0.4], rad: 6, i: 0.8 }, { at: [59.5, 12], y: -3, col: [0.25, 0.6, 0.4], rad: 6, i: 0.8 },
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
    { kind: 'bread', name: 'dead prisoner\'s crust', at: [54.6, 9.6], heal: 25 },
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
    { class: 'thing', id: 'l1', at: [56, 16.5], group: 'pits', lurk: true },
    { class: 'thing', id: 'b1', at: [62, 12.5], group: 'bonepit', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'b2', at: [63.5, 15.2], group: 'bonepit', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'b3', at: [62.6, 13.8], group: 'bonepit', lurk: true },
    { class: 'thing', id: 'b4', at: [64, 12], group: 'bonepit', yaw: -Math.PI / 2 },
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
  level: 'e1m3', title: 'The Tunnels Below', ramps: ['ink', 'jade', 'magic'], grid: [64, 40], ambient: [0.06, 0.064, 0.058], arms: 'sword',
  torch: true,                                             // "lifting his torch" (ch. III): Conan carries the torch from the vault
  areas: [
    { id: 'weeping', type: 'puzzle', name: 'The Weeping', rooms: ['dank', 'fork1', 'dead_n', 'weep1', 'fork2', 'dead_s', 'weep2'] },
    { id: 'weeper', type: 'action', name: 'The Weeping Thing', rooms: ['weep_den', 'hollow', 'flight', 'flight2'], cp: [22, 10, 0] },
    { id: 'well', type: 'puzzle', name: 'The Well', rooms: ['cross_n'], cp: [39, 14, Math.PI] },
    { id: 'dark', type: 'action', name: 'The Dark', rooms: ['cross_s', 'blind', 'loop1', 'loop2', 'loop3'], cp: [41, 25, Math.PI] },
    { id: 'crossing', type: 'puzzle', name: 'The Crossing', rooms: ['loop4'], cp: [44.5, 15, Math.PI / 2] },
    { id: 'side', type: 'action', name: 'The Side Tunnels', rooms: ['out1', 'out2', 'corridor_w', 'side1', 'side2', 'side3'], cp: [28, 24, Math.PI] },
    { id: 'satha', type: 'puzzle', name: 'Satha Returns', rooms: ['corridor_e', 'alcove1', 'alcove2'], cp: [40.5, 31.5, -Math.PI / 2] },
  ],
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
    { id: 'flight2', name: 'a tunnel', at: [38, 5], size: [2, 8], h: 2.4, style: 'rough', tex: CAVE_TEX },
    // the well, in the chamber where the tunnels cross
    { id: 'cross_n', name: 'the chamber where the tunnels cross', at: [34, 13], size: [10, 4], h: 6, style: 'rough', tex: CAVE_TEX },
    { id: 'well', name: 'the well', at: [34, 17], size: [10, 1], h: 6, pit: 50, style: 'rough', tex: CAVE_TEX },
    { id: 'cross_s', name: 'the chamber where the tunnels cross', at: [34, 18], size: [10, 5], h: 6, style: 'rough', tex: CAVE_TEX },
    { id: 'blind', name: 'a tunnel choked with fallen rock', at: [35, 23], size: [2, 4], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'loop1', name: 'a black tunnel', at: [40, 23], size: [2, 4], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'loop2', name: 'a black tunnel', at: [40, 27], size: [8, 2], h: 2.2, style: 'rough', tex: CAVE_TEX },
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
    { class: 'thing', id: 'k2', at: [44, 28], group: 'dark', yaw: Math.PI / 2 },
    { class: 'thing', id: 'k3', at: [47, 25], group: 'dark', lurk: true },
    { class: 'thing', id: 'k4', at: [47, 19], group: 'dark', yaw: Math.PI },
    { class: 'thing', id: 'k5', at: [36, 25.5], group: 'dark', lurk: true },
    { class: 'thing', id: 's1', at: [31, 35.5], group: 'side', yaw: Math.PI },
    { class: 'thing', id: 's2', at: [37, 36], group: 'side', lurk: true },
    { class: 'thing', id: 's3', at: [21, 35], group: 'side', yaw: Math.PI },
    { class: 'thing', id: 's4', at: [24, 31.5], group: 'side', yaw: -Math.PI / 2 },
    { class: 'thing', id: 's5', at: [35, 31], group: 'side', lurk: true },
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
const FIELD = { floor: 'TURF', wall: 'SUNSET', ceil: 'SUNSET' };   // open ground: the red sky all round
const LEVEL_E1M1 = {
  level: 'e1m1', next: 'e1m3', title: 'The Plain of Shamu', ramps: ['earth', 'night', 'scarlet'], grid: [66, 30],
  ambient: [0.3, 0.18, 0.13], haze: [0.52, 0.1, 0.08], arms: 'sword',
  groundFog: { density: 0.16, falloff: 0.8, floor: 0, col: [0.47, 0.21, 0.2] },   // the battle's smoke and the evening mist, lying on the dead
  areas: [
    { id: 'charge', type: 'action', name: 'The Broken Charge', rooms: ['charge'] },
    { id: 'arrows', type: 'puzzle', name: 'The Arrow Ground', rooms: ['gully', 'arrowground'], cp: [17, 15, -Math.PI / 2] },
    { id: 'line', type: 'action', name: 'The Shemite Line', rooms: ['rise'], cp: [33, 15, -Math.PI / 2] },
    { id: 'lanes', type: 'puzzle', name: 'The Riderless Horses', rooms: ['lanes'], cp: [41.5, 15, -Math.PI / 2] },
    { id: 'heap', type: 'action', name: 'The Heap of Dead', rooms: ['heap'], cp: [50.5, 15, -Math.PI / 2] },
  ],
  rooms: [
    { id: 'charge', name: 'the field of the last charge', at: [2, 9], size: [14, 12], sky: true, tex: FIELD },
    { id: 'gully', name: 'a gully of dead', at: [16, 12], size: [4, 6], sky: true, tex: FIELD },
    { id: 'arrowground', name: 'the arrow ground', at: [20, 7], size: [14, 16], sky: true, tex: FIELD },
    { id: 'rise', name: 'the Shemite rise', at: [34, 9], size: [8, 12], floor: 1.0, sky: true, tex: FIELD },
    { id: 'lanes', name: 'the riders\' ground', at: [42, 5], size: [8, 20], floor: 1.0, sky: true, tex: FIELD },
    { id: 'heap', name: 'the heap of dead', at: [50, 8], size: [11, 14], floor: 1.0, sky: true, tex: FIELD },
    { id: 'kings', name: 'the kings\' ground', at: [61, 10], size: [4, 10], floor: 1.0, sky: true, nopass: true, tex: FIELD },
  ],
  shafts: [], links: [],
  props: [
    { prefab: 'deadhorse', at: [5, 12], rot: 0.4 }, { prefab: 'deadhorse', at: [9, 17.5], rot: 2.0 }, { prefab: 'fallen', at: [7, 14], rot: 1.2 }, { prefab: 'fallen', at: [12, 11], rot: 3.0 },
    { prefab: 'fallen', at: [11, 18.6], rot: 0.3 }, { prefab: 'standard', at: [4, 18], rot: 1.0 }, { prefab: 'fallen', at: [14, 15], rot: 2.2 },
    { prefab: 'fallen', at: [17, 14], rot: 0.9 }, { prefab: 'deadhorse', at: [18, 16.5], rot: 1.6 },
    // the arrow ground: dead horses are the only cover
    { prefab: 'deadhorse', at: [22.5, 10.5], rot: 1.57, cover: true }, { prefab: 'deadhorse', at: [24.5, 15.5], rot: 1.4, cover: true }, { prefab: 'deadhorse', at: [26.5, 19.5], rot: 1.8, cover: true },
    { prefab: 'deadhorse', at: [28.5, 12.5], rot: 1.5, cover: true }, { prefab: 'deadhorse', at: [30.5, 17.5], rot: 1.7, cover: true }, { prefab: 'deadhorse', at: [32.5, 9.5], rot: 1.3, cover: true },
    { prefab: 'fallen', at: [23.5, 13], rot: 0.5 }, { prefab: 'fallen', at: [27.5, 16], rot: 2.5 }, { prefab: 'fallen', at: [31.5, 13.5], rot: 1.0 }, { prefab: 'standard', at: [29.5, 21], rot: 2.6 },
    { prefab: 'fallen', at: [36, 12], rot: 1.9 }, { prefab: 'fallen', at: [39.5, 17.5], rot: 0.2 },
    { prefab: 'deadhorse', at: [43, 4.8], rot: 0 }, { prefab: 'deadhorse', at: [48, 25.2], rot: 3.1 },
    { prefab: 'heap', at: [55.5, 15] }, { prefab: 'fallen', at: [53, 11.5], rot: 1.2 }, { prefab: 'fallen', at: [58, 18.5], rot: 2.2 }, { prefab: 'fallen', at: [52.5, 18], rot: 0.7 },
    { prefab: 'standard', at: [57.5, 10.5], rot: 0.4 },
  ],
  lights: [
    { at: [0, 15], y: 14, col: [1.0, 0.5, 0.3], rad: 80, i: 1.4 },             // the sun going down in the west
    { at: [33, 15], y: 20, col: [0.9, 0.45, 0.35], rad: 60, i: 0.8 },
    { at: [55, 15], y: 18, col: [0.8, 0.4, 0.35], rad: 40, i: 0.7 },
  ],
  features: [],
  items: [
    { kind: 'wine', name: 'dead knight\'s wineskin', at: [13.5, 12.5], heal: 25 },
    { kind: 'wine', name: 'Shemite water-skin', at: [37.5, 18.5], heal: 25 },
    { kind: 'bread', name: 'trooper\'s ration', at: [41.2, 10.5], heal: 25 },
    { kind: 'wine', name: 'Ophirean wine', at: [51.5, 9.5], heal: 25 },
  ],
  // "Ophirean knights in gilded mail ... squat Shemites with blue-black beards, and dark-faced Kothian knights"
  entities: [
    { class: 'info_player_start', at: [3.5, 15], yaw: -Math.PI / 2 },
    { class: 'kknight', id: 'c1', at: [8, 12.5], group: 'charge', yaw: Math.PI / 2 },
    { class: 'kknight', id: 'c2', at: [10, 16.5], group: 'charge', yaw: Math.PI / 2 },
    { class: 'spearman', id: 'c3', at: [13, 13.5], group: 'charge', yaw: Math.PI / 2 },
    { class: 'kknight', id: 'c4', at: [14.5, 18.5], group: 'charge', yaw: Math.PI / 2 },
    { class: 'archer', id: 'l1', at: [36.5, 11], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'archer', id: 'l2', at: [37, 14], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'archer', id: 'l3', at: [36.5, 17], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'archer', id: 'l4', at: [39.5, 15.5], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'l5', at: [35, 13], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'l6', at: [35, 16.5], group: 'line', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h1', at: [57, 12], group: 'heap1', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h2', at: [58.5, 15], group: 'heap1', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h3', at: [57.5, 18.5], group: 'heap1', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h4', at: [59.5, 13], group: 'heap1', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h5', at: [62.5, 12], group: 'heap2', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h6', at: [62.5, 15], group: 'heap2', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h7', at: [62.5, 18], group: 'heap2', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h8', at: [63.5, 13.5], group: 'heap2', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h9', at: [63.5, 16.5], group: 'heap2', yaw: Math.PI / 2, hold: true },
  ],
  // the arrow ground: "Strabonus' Shemitish bowmen had wrought havoc among his knights"
  volley: { rooms: ['gully', 'arrowground'], group: 'line', period: 4.2 },
  // the riders' ground: "Ophirean knights in gilded mail leaped their horses over mounds of corpses"
  charges: [{ x: 43.5, period: 6.0, offset: 0.0, dir: 1 }, { x: 46, period: 6.0, offset: 2.0, dir: -1 }, { x: 48.5, period: 6.0, offset: 4.0, dir: 1 }],
  chargeSpan: [4, 26],
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
const LEVELS = { e1m1: LEVEL_E1M1, e1m2: LEVEL_E1M2, e1m3: LEVEL_E1M3 };
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
      LV.flags[idx] = (r.hide ? F_HIDE : 0) | (r.nopass ? F_NOPASS : 0) | (r.id === 'serpent' ? F_SLIME : 0) | (r.wind ? F_WIND : 0);
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
  for (const p of spec.props) {
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
