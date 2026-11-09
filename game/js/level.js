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
  level: 'e1m2', next: 'e1m3', ambient: [0.05, 0.046, 0.04], exitVoid: { from: [65.5, 14], to: [72, 14], w: 3.5 }, title: 'The Pits', ramps: ['ink', 'jade', 'fire'], grid: [72, 32],
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
// e1m3 "The Tunnels Below" (README §9-10): a horror maze under the pits.
//   marked ways (puzzle) -> warren (action) -> crossing (puzzle) ->
//   weeper's lair (action) -> hanging stone (puzzle) -> sigil gate (action).
// ---------------------------------------------------------------------------
const CAVE_TEX = { wall: 'CAVE', floor: 'MUD', ceil: 'CAVE' };
const LEVEL_E1M3 = {
  level: 'e1m3', title: 'The Tunnels Below', ramps: ['ink', 'jade', 'magic'], grid: [64, 34], exitVoid: { from: [42.5, 30], to: [32, 30], w: 3.5 }, ambient: [0.06, 0.066, 0.06],
  torch: true,                                             // "lifting his torch" (ch. III): Conan carries one through the tunnels
  areas: [
    { id: 'marks', type: 'puzzle', name: 'The Marked Ways', rooms: ['foot', 'junction', 'way_one', 'drop', 'way_two', 'nook'], cp: [4.5, 19, -Math.PI / 2] },
    { id: 'warren', type: 'action', name: 'The Warren', rooms: ['way_three', 'warren'], cp: [14, 18.9, -Math.PI / 2] },
    { id: 'crossing', type: 'puzzle', name: 'The Crossing', rooms: ['west_shelf', 'well', 'ledge'], cp: [35, 18.5, -Math.PI / 2] },
    { id: 'lair', type: 'action', name: 'The Weeper\'s Lair', rooms: ['east_shelf', 'weeper_way', 'lair'], cp: [45, 18.5, -Math.PI / 2] },
    { id: 'stone', type: 'puzzle', name: 'The Hanging Stone', rooms: ['stone_way', 'stone', 'shaft'], cp: [57.5, 23, Math.PI] },
    { id: 'gate', type: 'action', name: 'The Sigil Gate', rooms: ['gate', 'beyond'], cp: [50, 30, -Math.PI / 2] },
  ],
  rooms: [
    { id: 'foot', name: 'the Foot of the Stair', at: [2, 17], size: [5, 4], h: 2.4, style: 'hewn', tex: { floor: 'FLAG' } },
    { id: 'junction', name: 'the Junction', at: [7, 15], size: [6, 8], h: 3.2, style: 'rough', tex: CAVE_TEX },
    { id: 'way_one', name: 'a passage marked with one cut', at: [9, 9], size: [2, 6], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'drop', name: 'a passage marked with one cut', at: [9, 6], size: [2, 3], pit: 40, style: 'rough', tex: CAVE_TEX },
    { id: 'way_two', name: 'a passage marked with two cuts', at: [9, 23], size: [2, 6], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'nook', name: 'a dead end', at: [8, 29], size: [4, 3], h: 2.6, style: 'rough', tex: CAVE_TEX },
    { id: 'way_three', name: 'a passage marked with three cuts', at: [13, 18], size: [8, 2], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'warren', name: 'the Warren', at: [21, 12], size: [12, 13], h: 4.4, style: 'rough', tex: CAVE_TEX },
    { id: 'west_shelf', name: 'the Crossing', at: [33, 14], size: [4, 10], h: 7, style: 'rough', tex: CAVE_TEX },
    { id: 'well', name: 'the Well of the Crossing', at: [37, 14], size: [7, 10], pit: 50, style: 'rough', tex: CAVE_TEX },
    { id: 'ledge', name: 'the Ledge', at: [37, 18], size: [7, 1], h: 7, style: 'rough', wind: true, tex: CAVE_TEX },
    { id: 'east_shelf', name: 'the Crossing', at: [44, 14], size: [2, 10], h: 7, style: 'rough', tex: CAVE_TEX },
    { id: 'weeper_way', name: 'a weeping tunnel', at: [46, 17], size: [10, 2], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'lair', name: 'the Weeper\'s Lair', at: [56, 11], size: [6, 11], h: 4, style: 'rough', tex: CAVE_TEX },
    { id: 'stone_way', name: 'a passage', at: [57, 22], size: [2, 2], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'stone', name: 'the Chamber of the Hanging Stone', at: [52, 24], size: [8, 8], h: 7, style: 'rough', tex: CAVE_TEX },
    { id: 'shaft', name: 'the Shaft', at: [55, 26], size: [2, 2], pit: 60, style: 'rough', tex: CAVE_TEX },
    { id: 'gate', name: 'the Sigil Gate', at: [44, 27], size: [8, 6], h: 3.6, vault: 1.2, style: 'hewn' },
    { id: 'gate_door', name: 'the Sigil Gate', at: [43, 29], size: [1, 2], h: 2.4, style: 'hewn' },
    { id: 'beyond', name: 'beyond the gate', at: [30, 29], size: [13, 2], h: 2.4, style: 'rough', tex: CAVE_TEX },
  ],
  shafts: [],
  links: [
    { a: 'gate', b: 'beyond', via: 'sigil_slab', name: 'sigil_gate', cells: [[43, 29], [43, 30]] },
  ],
  props: [
    { prefab: 'torch', at: [2, 18.5], wall: 'W' }, { prefab: 'chains', at: [4, 17], wall: 'N' }, { prefab: 'bones', at: [5.5, 20.3] },
    { prefab: 'planks', at: [10, 7.5], level: 0 },
    { prefab: 'candles', at: [8.2, 16.2] }, { prefab: 'candles', at: [11.6, 21.6] },
    { prefab: 'bones', at: [10.5, 30.6], big: true }, { prefab: 'skull', at: [9.1, 30.2] },
    { prefab: 'stal', at: [24, 15] }, { prefab: 'stal', at: [29, 14.5] }, { prefab: 'stal', at: [26.5, 21] }, { prefab: 'stal', at: [31, 22.5] }, { prefab: 'stal', at: [22.5, 19.5] },
    { prefab: 'bones', at: [21.6, 13] }, { prefab: 'bones', at: [32.2, 18] }, { prefab: 'bones', at: [25, 24.2] }, { prefab: 'bones', at: [27.5, 17.5], big: true },
    { prefab: 'bones', at: [34.2, 22.6] }, { prefab: 'bones', at: [33.4, 15] },
    { prefab: 'bones', at: [50, 17.2] }, { prefab: 'bones', at: [58.5, 19.5], big: true }, { prefab: 'skull', at: [60.5, 12.4] }, { prefab: 'bones', at: [61.4, 15] },
    { prefab: 'winch', at: [53, 25.4] }, { prefab: 'post', at: [54, 27] }, { prefab: 'torch', at: [56.5, 32], wall: 'S' },
    { prefab: 'torch', at: [44, 31.5], wall: 'W' }, { prefab: 'brazier', at: [47, 28.4] }, { prefab: 'brazier', at: [47, 31.6] },
  ],
  lights: [
    { at: [8.2, 16.2], y: 0.6, col: [1.0, 0.65, 0.3], rad: 6, i: 0.8 }, { at: [11.6, 21.6], y: 0.6, col: [1.0, 0.65, 0.3], rad: 6, i: 0.8 },
    { at: [40.5, 19], y: -6, col: [0.25, 0.6, 0.45], rad: 14, i: 0.9 },
    { at: [36.5, 17.4], y: 2.2, col: [1, 0.6, 0.28], rad: 9, i: 1.1 }, { at: [40.5, 17.4], y: 2.2, col: [1, 0.6, 0.28], rad: 9, i: 1.1 }, { at: [43.8, 18.6], y: 2.2, col: [1, 0.6, 0.28], rad: 9, i: 1.1 },
    { at: [56, 27], y: -4, col: [0.4, 0.9, 0.6], rad: 10, i: 0.9 },
  ],
  flames: [[36.5, 17.4], [40.5, 17.4], [43.8, 18.6]],      // they lean with the draft over the ledge
  valves: { at: [[33.6, 14.05, 'N'], [35.6, 14.05, 'N'], [33.6, 23.95, 'S'], [35.6, 23.95, 'S']], weights: [1, 1.5, -0.5, 1], base: -1.5 },
  boom: { post: [54, 27], len: 5, over: 0, floor: Math.PI / 2 },
  features: [
    { type: 'clue', id: 'insc_foot', at: [4.5, 17.04], y: 1.3, wall: 'N',
      text: 'Scratched by a careful hand: "Pelias sent us down for him, and the dark took most of us. Those who lived marked the safe road with THREE CUTS. One cut is the drop. Two cuts is a thing that waits."' },
    { type: 'clue', id: 'mark_one', at: [8.6, 15.04], y: 1.3, wall: 'N', text: 'A single cut, gouged deep: |' },
    { type: 'clue', id: 'mark_two', at: [8.6, 22.96], y: 1.3, wall: 'S', text: 'Two cuts, side by side: | |' },
    { type: 'clue', id: 'mark_three', at: [12.96, 17.6], y: 1.3, wall: 'E', text: 'Three cuts, neat and patient: | | |' },
    { type: 'clue', id: 'insc_crossing', at: [34.6, 23.96], y: 1.3, wall: 'S',
      text: 'Scratched beside the drop: "The presence is only the breath of the deep. It comes up through four mouths. Shut and open them until the flames over the ledge stand straight, and it will not push you."' },
    { type: 'clue', id: 'insc_stone', at: [53.5, 24.04], y: 1.3, wall: 'N',
      text: 'Cut into the wall below the windlass: "Swing the arm out over the floor before you let her down, or the deep will have her. Aram took the crank and went on alone. He did not come back."' },
    { type: 'valve', idx: 0, at: [33.6, 14.05], y: 1.3 }, { type: 'valve', idx: 1, at: [35.6, 14.05], y: 1.3 },
    { type: 'valve', idx: 2, at: [33.6, 23.95], y: 1.3 }, { type: 'valve', idx: 3, at: [35.6, 23.95], y: 1.3 },
    { type: 'boom', at: [54, 27], y: 1.2 }, { type: 'windlass', at: [53.4, 25.9], y: 1.2 },
    { type: 'sigil_door', at: [44.1, 30], y: 1.3 },
  ],
  items: [
    { kind: 'bread', name: 'apprentice\'s bread', at: [10.6, 31], heal: 25 },
    { kind: 'wine', name: 'apprentice\'s wineskin', at: [28, 18.2], heal: 25 },
    { kind: 'wine', name: 'flask of Pelias\'s cordial', at: [35.8, 22.8], heal: 25 },
    { kind: 'crank', name: 'windlass crank', at: [58.9, 19.8] },
    { kind: 'bread', name: 'Aram\'s last bread', at: [60, 18.6], heal: 25 },
    { kind: 'wine', name: 'skin of wine', at: [50.5, 31.4], heal: 25 },
  ],
  entities: [
    { class: 'info_player_start', at: [4.2, 19], yaw: -Math.PI / 2 },
    { class: 'thing', id: 'k0', at: [9.8, 30.2], group: 'nook', lurk: true },
    { class: 'thing', id: 'k1', at: [24, 16], group: 'warren', lurk: true },
    { class: 'thing', id: 'k2', at: [29, 20.5], group: 'warren', lurk: true },
    { class: 'thing', id: 'k3', at: [27, 23], group: 'warren', yaw: 0 },
    { class: 'thing', id: 'k4', at: [31, 14], group: 'warren', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'k5', at: [23, 21.5], group: 'warren', yaw: Math.PI / 2 },
    { class: 'weeper', id: 'wp', at: [59.5, 14.5], group: 'lair', yaw: -Math.PI / 2 },
    { class: 'thing', id: 'k6', at: [57.5, 13], group: 'lair', lurk: true },
    { class: 'thing', id: 'k7', at: [60.5, 20.6], group: 'lair', yaw: Math.PI },
    { class: 'thing', id: 'g1', at: [45.5, 28.3], group: 'gatewave', lurk: true, dormant: 0.5 },
    { class: 'thing', id: 'g2', at: [49.5, 31.6], group: 'gatewave', lurk: true, dormant: 2.5 },
    { class: 'thing', id: 'g3', at: [48.5, 28.0], group: 'gatewave', lurk: true, dormant: 4.5 },
    { class: 'thing', id: 'g4', at: [45.0, 31.8], group: 'gatewave', lurk: true, dormant: 6.5 },
    { class: 'thing', id: 'g5', at: [50.8, 29.6], group: 'gatewave', lurk: true, dormant: 8.5 },
    { class: 'thing', id: 'g6', at: [46.6, 30.0], group: 'gatewave', lurk: true, dormant: 10.5 },
    { class: 'trigger_exit', rect: [30, 28, 33, 32] },
  ],
  puzzle: {
    flags: ['still_air', 'crossed', 'has_crank', 'boom_swung', 'stone_down', 'has_sigil', 'gate_open'],
    actions: [
      { id: 'set_vents', needs: [], sets: 'still_air', at: 'west_shelf', clue: 'insc_crossing' },
      { id: 'cross', needs: ['still_air'], sets: 'crossed', at: 'ledge' },
      { id: 'take_crank', needs: ['crossed'], sets: 'has_crank', at: 'lair' },
      { id: 'swing_boom', needs: ['crossed'], sets: 'boom_swung', at: 'stone', clue: 'insc_stone' },
      { id: 'lower_stone', needs: ['has_crank', 'boom_swung'], sets: 'stone_down', at: 'stone' },
      { id: 'take_sigil', needs: ['stone_down'], sets: 'has_sigil', at: 'stone' },
      { id: 'set_sigil', needs: ['has_sigil'], sets: 'gate_open', at: 'gate' },
    ],
    goal: 'gate_open',
  },
};
const LEVELS = { e1m2: LEVEL_E1M2, e1m3: LEVEL_E1M3 };
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
