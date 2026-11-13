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

const F_HIDE = 1, F_NOPASS = 2, F_TALL = 4, F_SKY = 8, F_SLIME = 16, F_WIND = 32, F_WATER = 64, F_STAKE = 128;

// Pacing (README §9): every level alternates PUZZLE areas (think, read,
// time things) and ACTION areas (fight). e1m2 runs:
//   cell (puzzle) -> hall (timing puzzle) -> wardens' post (action) ->
//   grille (puzzle) -> guardroom + barracks (action) -> winch (puzzle) ->
//   captain's landing (action) -> exit.
const LEVEL_E1M2 = {
  // strip: the king wakes in chains; whatever he carried on the plain is gone
  level: 'e1m2', next: 'e1m3', strip: true, ambient: [0.06, 0.056, 0.05], exitVoid: { from: [65.5, 14], to: [72, 14], w: 3.5 }, title: 'The Pits', ramps: ['ink', 'jade', 'fire'], grid: [72, 32],
  // README §9, e1m2: the book's beats in the book's order (ch. II–III)
  // ch. II: the conclave in the citadel, and the march down to the pits, before the vault
  prologue: { start: [61, 27.6, 0], done: 'in_vault', objectives: [['answered', 'Hear them out, and answer them. (E)'], ['refused', 'Answer the wizard. (E)'], ['spat', 'Answer Amalrus. (E)'], ['marched', 'Stand.'], ['in_vault', 'Go where they march you.']] },
  areas: [
    { id: 'conclave', type: 'puzzle', name: 'The Conclave', rooms: ['conclave', 'censers', 'jetcorr', 'brassdoor'] },
    { id: 'vault', type: 'puzzle', name: 'The Vault', rooms: ['cell', 'arch'] },
    { id: 'hall', type: 'puzzle', name: 'The Main Corridor', rooms: ['hall', 'well', 'a1', 'a2', 'a3', 'n1', 'n2'], cp: [7.5, 12.4, Math.PI] },
    { id: 'post', type: 'action', name: 'The Gnawed Tunnels', rooms: ['south_passage', 'post', 'gallery', 'gsteps'], cp: [26.8, 16.5, Math.PI] },
    { id: 'east', type: 'puzzle', name: 'The Corridor East', rooms: ['niche', 'narrows'], cp: [32.6, 16, 0] },
    { id: 'vaults', type: 'action', name: 'The Old Vaults', rooms: ['guard', 'breach', 'den'], cp: [36.5, 14, -Math.PI / 2] },
    { id: 'pits', type: 'puzzle', name: 'The Pitted Way', rooms: ['nook', 'narrow', 'slope', 'landing', 'stone'], cp: [44.2, 14, -Math.PI / 2] },
    { id: 'bonepit', type: 'action', name: 'The Bone Pit', rooms: ['bonepit', 'exit'], cp: [60.6, 14, -Math.PI / 2] },
  ],
  rooms: [
    // "a chamber with a domed ceiling of carven jet, and the fretted arches of doorways glimmering with strange dark jewels"
    { id: 'conclave', name: 'a chamber domed with carven jet', at: [56, 21], size: [10, 9], h: 5.5, vault: 2.6, style: 'hewn', tex: { floor: 'MOSAIC', wall: 'JET', ceil: 'JET' } },
    // "a winding corridor, whose floor was of many-hued mosaics, whose walls were inlaid with gold tissue and silver chasing ... golden censers"
    { id: 'censers', name: 'the corridor of censers', at: [47, 24], size: [9, 2], h: 3.6, vault: 0.9, style: 'hewn', tex: { floor: 'MOSAIC', wall: 'HEWN', ceil: 'HEWN' } },
    // "a smaller corridor, done in jet and black jade, gloomy and awful, which ended at a brass door"
    { id: 'jetcorr', name: 'a corridor of jet and black jade', at: [45, 20], size: [2, 6], h: 3, style: 'hewn', tex: { floor: 'BLACK', wall: 'JET', ceil: 'BLACK' } },
    { id: 'brassdoor', name: 'the brass door', at: [45, 19], size: [2, 1], h: 3, style: 'hewn', tex: { floor: 'BLACK', wall: 'BLACK', ceil: 'BLACK' } },
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
    // the conclave: the kings' divans, braziers, hangings on the jet
    { prefab: 'divan', at: [59.3, 22.4] }, { prefab: 'divan', at: [62.7, 22.4] }, { prefab: 'brazier', at: [57.4, 22.6] }, { prefab: 'brazier', at: [64.6, 22.6] },
    { prefab: 'brazier', at: [57.4, 28.6], dim: 0.6 }, { prefab: 'brazier', at: [64.6, 28.6], dim: 0.6 }, { prefab: 'carpet', at: [61, 26], w: 0.9, l: 3.6 },
    { prefab: 'tapestry', at: [61, 21], wall: 'N', w: 1.6, h: 2.4, top: 4.2 }, { prefab: 'banner', at: [58.5, 21], wall: 'N' }, { prefab: 'banner', at: [63.5, 21], wall: 'N' },
    { prefab: 'tapestry', at: [56, 22.5], wall: 'W', w: 1.0, h: 2.2, top: 3.8 }, { prefab: 'tapestry', at: [66, 22.5], wall: 'E', w: 1.0, h: 2.2, top: 3.8 },
    { prefab: 'tapestry', at: [66, 27.5], wall: 'E', w: 1.0, h: 2.2, top: 3.8 }, { prefab: 'trophy', at: [56, 28], wall: 'W' }, { prefab: 'trophy', at: [61, 30], wall: 'S' },
    { prefab: 'chest', at: [64.8, 29.3] }, { prefab: 'table', at: [61, 23.6] },
    { prefab: 'censer', at: [54.5, 25] }, { prefab: 'censer', at: [51.5, 25] }, { prefab: 'censer', at: [48.5, 25] },
    { prefab: 'sconce', at: [53, 24], wall: 'N' }, { prefab: 'sconce', at: [50, 26], wall: 'S' }, { prefab: 'tapestry', at: [52, 26], wall: 'S', w: 1.0, h: 1.8 }, { prefab: 'tapestry', at: [49.5, 24], wall: 'N', w: 1.0, h: 1.8 },
    { prefab: 'carpet', at: [51.5, 25], w: 0.8, l: 4, yaw: Math.PI / 2 },
    { prefab: 'torch', at: [45, 21.5], wall: 'W', dim: 0.5 }, { prefab: 'door', at: [46, 19], wall: 'N' }, { prefab: 'skull', at: [45.4, 19.4] },
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
    // the pits' damp: slime running down the walls, glowing faintly jade, and pale fungus in the rough places (drawn only)
    { prefab: 'seep', at: [8.5, 13], wall: 'N' }, { prefab: 'seep', at: [5.5, 15], wall: 'S' }, { prefab: 'seep', at: [28.5, 13], wall: 'N', top: 3.2 }, { prefab: 'seep', at: [29.5, 15], wall: 'S' },
    { prefab: 'seep', at: [22.5, 20], wall: 'N' }, { prefab: 'seep', at: [25.5, 29], wall: 'S' }, { prefab: 'seep', at: [20, 24.5], wall: 'W' },
    { prefab: 'seep', at: [35, 17.5], wall: 'W' }, { prefab: 'seep', at: [45, 10.5], wall: 'E' }, { prefab: 'seep', at: [41.5, 19], wall: 'S' },
    { prefab: 'seep', at: [53.5, 9], wall: 'N' }, { prefab: 'seep', at: [59.5, 19], wall: 'S' }, { prefab: 'seep', at: [65, 16.2], wall: 'E', top: 2.4 },
    { prefab: 'fungus', at: [36.5, 3.5] }, { prefab: 'fungus', at: [43.6, 2.8] }, { prefab: 'fungus', at: [44.2, 6.6] }, { prefab: 'fungus', at: [26.3, 17.6] },
    { prefab: 'fungus', at: [49.5, 13.3] }, { prefab: 'fungus', at: [64.5, 16.4] }, { prefab: 'fungus', at: [68.5, 13.3] }, { prefab: 'fungus', at: [61.5, 16.5] },
  ],
  lights: [
    { at: [51.5, 25], y: 2.6, col: [1.0, 0.75, 0.4], rad: 12, i: 1.1 },          // the censers' smouldering glow
    { at: [61, 25], y: 4, col: [0.9, 0.55, 0.35], rad: 14, i: 0.9 },             // the conclave's lamps
    { at: [58.5, 25.5], y: 3.2, col: [1.0, 0.6, 0.3], rad: 9, i: 0.8 }, { at: [63.5, 25.5], y: 3.2, col: [1.0, 0.6, 0.3], rad: 9, i: 0.8 },   // and the braziers' glow thrown up into the dome
    { at: [4, 14], y: -4, col: [0.25, 0.55, 0.38], rad: 10, i: 0.9 },             // slime glow in the well
    { at: [28, 7], y: -8, col: [0.25, 0.55, 0.38], rad: 9, i: 0.6 },              // slime glow in the serpent's hole
    { at: [6.4, 9.4], y: 2.4, col: [1.0, 0.6, 0.28], rad: 14, i: 2.3 },           // the torch in the niche above the king: it lights the whole vault
    { at: [8.6, 10.6], y: 1.2, col: [0.8, 0.45, 0.22], rad: 8, i: 0.7 },          // and its glow thrown back off the far wall
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
    // the conclave: what is yours to say
    { type: 'act', id: 'answer', at: [61, 25.1], needs: ['c_open'], sets: 'answered', actor: 'tsotha', range: 9, prompt: 'answer him' },
    { type: 'act', id: 'refuse', at: [61, 25.1], needs: ['offered'], sets: 'refused', actor: 'tsotha', range: 9, prompt: 'refuse the parchment' },
    { type: 'act', id: 'spit', at: [62.7, 22.6], needs: ['fool'], sets: 'spat', actor: 'amalrus', range: 14, prompt: 'answer Amalrus as a Cimmerian would' },
  ],
  items: [
    { kind: 'bread', name: 'crust of black bread', at: [9.4, 11.4], heal: 25 },
    { kind: 'wine', name: 'dead man\'s water-skin', at: [23.8, 16.3], heal: 15 },
    { kind: 'bread', name: 'gnawed crust', at: [22.6, 27.6], heal: 25 },
    { kind: 'wine', name: 'rotted water-skin', at: [36.2, 17.6], heal: 25 },
    { kind: 'bread', name: 'dead prisoner\'s crust', at: [53.5, 9.6], heal: 25 },
    { kind: 'wine', name: 'acolyte\'s water-skin', at: [63.6, 12.4], heal: 25 },
    { kind: 'wine', potion: 'balm', name: 'a pot of wound-balm in a dead man\'s scrip', heal: 20, at: [36.6, 17.2] },
  ],
  entities: [
    { class: 'info_player_start', at: [6.9, 9.6], yaw: -Math.PI / 2, flags: ['chained'] },
    { class: 'black_giant', at: [7.5, 4.6], yaw: 0 },
    { class: 'scripted_satha', period: 40, vaultPasses: 2 },
    { class: 'monster_shukeli', at: [8.5, 3.6] },
    // "monsters with dripping jaws agape": the pits' nameless things, where the book puts them
    { class: 'thing', id: 'p0', at: [26.6, 18.6], group: 'post', lurk: true },
    
    { class: 'thing', id: 'p2', at: [28, 25], group: 'post', yaw: 0 },
    
    { class: 'thing', id: 'p4', at: [30, 21], group: 'post', lurk: true },
    
    { class: 'thing', id: 'v1', at: [37, 11], group: 'vaults', yaw: -Math.PI / 2 },
    
    { class: 'thing', id: 'v3', at: [36.5, 16], group: 'vaults', yaw: -Math.PI / 2 },
    
    { class: 'thing', id: 'v5', at: [40.5, 5], group: 'vaults', lurk: true },
    
    { class: 'thing', id: 'v7', at: [39, 8], group: 'vaults', yaw: Math.PI }, 
    { class: 'thing', id: 'p6', at: [25, 25], group: 'post', yaw: 0 }, 
    { class: 'thing', id: 'l1', at: [55.5, 15.5], group: 'pits', lurk: true },
    // more of the pits' nameless things: in the gnawed hall, and on the ledges of the pitted way between the pits
    { class: 'thing', id: 'q1', at: [21.5, 23], group: 'post' }, { class: 'thing', id: 'q3', at: [23, 27.8], group: 'post' },
    { class: 'thing', id: 'q5', at: [53.5, 16.5], group: 'pits' }, { class: 'thing', id: 'q7', at: [59.5, 16], group: 'pits' },
    { class: 'thing', id: 'b1', at: [62, 12.5], group: 'bonepit', yaw: -Math.PI / 2 },
    
    { class: 'thing', id: 'b3', at: [62.6, 13.8], group: 'bonepit', lurk: true },
    
    { class: 'thing', id: 'b5', at: [64.5, 14], group: 'bonepit', yaw: -Math.PI / 2 },
    
    { class: 'trigger_exit', rect: [68, 0, 72, 32] },
  ],
  // ch. II, the conclave: "In front of him stood Tsotha, and on divans lounged Strabonus and Amalrus in their silks and gold ...
  // On either side of him stood a dozen black giants, grasping their long-shafted axes."
  actors: [
    { id: 'strabonus', at: [59.3, 22.37], pose: 'drink', seat: -0.45 }, { id: 'amalrus', at: [62.7, 22.37], pose: 'sit', seat: -0.45 },
    { id: 'tsotha', at: [61, 25.1], pose: 'stand' },
    { id: 'g1', cast: 'axeman', at: [59.6, 27.0], yaw: Math.PI, pose: 'guard' }, { id: 'g2', cast: 'axeman', at: [59.6, 28.6], yaw: Math.PI, pose: 'guard' },
    { id: 'g3', cast: 'axeman', at: [62.4, 27.0], yaw: Math.PI, pose: 'guard' }, { id: 'g4', cast: 'axeman', at: [62.4, 28.6], yaw: Math.PI, pose: 'guard' },
    { id: 'g5', cast: 'axeman', at: [57.0, 24.4], yaw: Math.PI / 2, pose: 'guard' }, { id: 'g6', cast: 'axeman', at: [57.0, 26.6], yaw: Math.PI / 2, pose: 'guard' },
    { id: 'g7', cast: 'axeman', at: [65.0, 24.4], yaw: -Math.PI / 2, pose: 'guard' }, { id: 'g8', cast: 'axeman', at: [65.0, 26.6], yaw: -Math.PI / 2, pose: 'guard' },
    { id: 'shukeli', at: [45.5, 19.7], yaw: 0, pose: 'stand' },
  ],
  beats: [
    { id: 'c_open', at: 'conclave', after: 1.5, sets: 'c_open', act: { tsotha: { pose: 'speak' } },
      lines: [['Tsotha: "Our desires are quickly spoken, king of Aquilonia. It is our wish to extend our empire."', 'voice']] },
    { id: 'c_answer', needs: ['answered'], act: { tsotha: { pose: 'stand' }, amalrus: { pose: 'sit' } },
      lines: [['You: "And so you want to swine my kingdom."', ''],
        ['Amalrus: "What are you but an adventurer, seizing a crown to which you had no more claim than any other wandering barbarian? We are prepared to offer you suitable compensation—"', 'voice'],
        ['You: "Compensation! The price of infamy and treachery! I am a barbarian, so I shall sell my kingdom and its people for life and your filthy gold? Your fathers did the fighting and the suffering, and handed their crowns to you on golden platters."', ''],
        ['"You sit on satin and guzzle wine the people sweat for, and talk of divine rights of sovereignty—bah! I climbed out of the abyss of naked barbarism to the throne, and in that climb I spilt my blood as freely as I spilt that of others. If either of us has the right to rule men, by Crom, it is I!"', ''],
        ['"Today no Aquilonian noble dares maltreat the humblest of my subjects. And you would loot mine—ha! Free my hands and I\'ll varnish this floor with your brains!"', '']] },
    { id: 'c_offer', needs: ['answered'], quiet: true, after: 0.8, sets: 'offered', act: { tsotha: { pose: 'point' } },
      lines: [['Tsotha grins bleakly to see the rage of his kingly companions.', 'dim'],
        ['Tsotha: "All this, truthful though it be, is beside the point. Your responsibility is at an end when you sign this parchment: an abdication in favour of Prince Arpello of Pellia. We will give you arms and horse, and five thousand golden lunas, and escort you to the eastern frontier."', 'voice']] },
    { id: 'c_refuse', needs: ['refused'], act: { tsotha: { pose: 'stand' } },
      lines: [['You: "Setting me adrift where I was when I rode into Aquilonia, except with the added burden of a traitor\'s name! Arpello, eh? I\'ve had suspicions of that butcher of Pellia. I\'ll see you in hell first."', ''],
        ['Amalrus: "You\'re a fool! You are in our hands, and we can take both crown and life at our pleasure!"', 'voice']] },
    { id: 'c_fool', needs: ['refused'], quiet: true, sets: 'fool' },
    // "He spat full in Amalrus' eyes. The king of Ophir leaped up with a scream of outraged fury, groping for his slender sword"
    { id: 'c_spit', needs: ['spat'], act: { amalrus: { pose: 'rush', to: [62.2, 26.0], sp: 3.2, seat: 0 } },
      lines: [['You spit full in Amalrus\'s eyes.', 'warn'], ['The king of Ophir leaps up with a scream of outraged fury, drags out his slender sword, and rushes at you.', 'warn']] },
    { id: 'c_wait', needs: ['spat'], after: 1.6, act: { tsotha: { to: [61.6, 25.6], sp: 2.5, face: 'amalrus' }, amalrus: { face: 'tsotha' } },
      lines: [['Tsotha: "Wait, your majesty; this man is my prisoner."', 'voice'], ['Amalrus: "Aside, wizard!"', 'voice']] },
    { id: 'c_dust', needs: ['spat'], after: 7.2, act: { tsotha: { pose: 'dust', face: 'amalrus' }, amalrus: { pose: 'blind', to: [62.7, 23.4], sp: 1.2 } },
      lines: [['Tsotha: "Back, I say!" His lean hand comes from his wide sleeve and casts a shower of dust into the Ophirean\'s contorted face.', 'warn'],
        ['Amalrus cries out and staggers back, clutching at his eyes, the sword falling from his hand. Strabonus hurriedly gulps another goblet of wine, with hands that tremble.', '']] },
    { id: 'c_sit', needs: ['spat'], after: 12.5, sets: 'dusted', act: { amalrus: { pose: 'sit', at: [62.7, 22.37], seat: -0.45, face: null, yaw: 0 }, tsotha: { pose: 'speak', face: 'amalrus' } },
      lines: [['Amalrus: "I went blind. What did you do to me, wizard?"', 'voice'],
        ['Tsotha: "Merely a gesture to convince you who was the real master. Strabonus has learned his lesson; let you learn yours. It was but a dust I found in a Stygian tomb. If I brush out their sight again, I will leave you to grope in darkness for the rest of your life."', 'voice']] },
    // "At the wizard's gesture, the blacks laid hold of their prisoner and marched him behind Tsotha"
    { id: 'c_march', needs: ['dusted'], quiet: true, after: 1.0, sets: 'marched',
      act: { tsotha: { pose: 'stand', face: null, to: [[61, 24.6], [57.5, 24.9], [50, 24.9], [45.9, 24.8], [45.9, 21.2]], sp: 1.7, lead: 6 },
        // one black walks before you with your chain in his fist, two at his shoulders with their axes, the fourth at your back
        g1: { pose: 'lead', leash: true, escort: { of: 'tsotha', side: 0, back: -2.4 } }, g2: { pose: 'guard', escort: { of: 'tsotha', side: -1.35, back: -2.9 } },
        g3: { pose: 'guard', escort: { of: 'tsotha', side: 1.35, back: -2.9 } }, g4: { pose: 'guard', escort: { of: 'tsotha', side: 0.3, back: 1.9 } } },
      lines: [['At the wizard\'s gesture the blacks lay hold of you and march you out behind him, into a winding corridor floored with many-hued mosaics, where golden censers swing in dreamy perfumed clouds.', '']] },
    { id: 'c_jet', at: 'jetcorr', needs: ['marched'],
      lines: [['Down a smaller corridor, done in jet and black jade, gloomy and awful, to a brass door over whose arch a human skull grins. At the door stands a fat, repellent figure dangling a bunch of keys: Tsotha\'s chief eunuch, Shukeli.', '']] },
    // "The brass door let onto a narrow stair that seemed to wind down into the very bowels of the hill ... They made the king fast to a ring in the stone wall."
    { id: 'c_down', at: ['jetcorr', 'brassdoor'], needs: ['marched'], quiet: true, after: 1.0, sets: 'in_vault', teleport: [6.9, 9.6, -Math.PI / 2], sathaIn: 22,
      act: { tsotha: { at: [8.7, 9.9], face: 'player', lead: 0, to: [] }, g1: { hide: true, escort: null, leash: false }, g2: { hide: true, escort: null }, g3: { hide: true, escort: null }, g4: { hide: true, escort: null },
        shukeli: { hide: true }, strabonus: { hide: true }, amalrus: { hide: true }, g5: { hide: true }, g6: { hide: true }, g7: { hide: true }, g8: { hide: true } },
      lines: [['Down a narrow stair that winds into the very bowels of the hill; through an iron door built to withstand the battering of rams, and a grille of steel bars with a bolt that works only from outside. The blacks make you fast to a ring in the stone wall, set a torch in the niche above your head, and file out in stumbling haste, casting fearful glances at the dark.', ''],
        ['Tsotha: "And so, farewell, barbarian. I must ride to Shamar, and the siege. In ten days I will be in your palace in Tamar, with my warriors. What word from you shall I say to your women, before I flay their dainty skins for scrolls whereon to chronicle the triumphs of Tsotha-lanti?"', 'voice'],
        ['You answer with a searing Cimmerian curse. Tsotha laughs thinly and withdraws; through the bars you glimpse his vulture-like figure as he slides home the grate. The heavy outer door clangs, and silence falls like a pall.', ''],
        ['Out in the black beyond the arch, something vast is moving.', 'warn'], ['(E to use things. Read whatever the dead have left you.)', 'dim']] },
    { id: 'c_gone', needs: ['in_vault'], after: 27, act: { tsotha: { to: [7.5, 8.3], sp: 1.6, face: null } } },
    { id: 'c_gone2', needs: ['in_vault'], after: 29.5, act: { tsotha: { hide: true } } },
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
    { id: 'dark', type: 'action', name: 'The Dark', rooms: ['cross_s', 'blind', 'loop1', 'loop2', 'loop_gap', 'loop3', 'loop5', 'loop6', 'loop6_gap', 'loop7', 'loop8'], cp: [41, 25, Math.PI] },
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
    { id: 'loop3', name: 'a black tunnel', at: [46, 20], size: [2, 7], h: 2.4, style: 'rough', tex: CAVE_TEX },   // choked to the north with fallen rock: round by the east
    { id: 'loop5', name: 'a black tunnel', at: [48, 20], size: [7, 2], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'loop6', name: 'a black tunnel', at: [53, 9], size: [2, 11], h: 2.4, style: 'rough', tex: CAVE_TEX },
    { id: 'loop6_gap', name: 'a black tunnel', at: [53, 13], size: [2, 1], h: 2.4, pit: 40, void: true, style: 'rough', tex: CAVE_TEX },   // leapt in the dark again
    { id: 'loop7', name: 'a black tunnel', at: [48, 9], size: [5, 2], h: 2.2, style: 'rough', tex: CAVE_TEX },
    { id: 'loop8', name: 'a black tunnel', at: [46, 9], size: [2, 8], h: 2.4, style: 'rough', tex: CAVE_TEX },
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
    { prefab: 'bones', at: [36, 26.2], big: true }, { prefab: 'bones', at: [47, 20.3] }, { prefab: 'bones', at: [47, 17.6], big: true }, { prefab: 'bones', at: [51, 20.5] }, { prefab: 'skull', at: [54.2, 15.8] }, { prefab: 'bones', at: [49.5, 9.6], big: true }, { prefab: 'skull', at: [44, 28.3] },
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
  // a fall of stones chokes the tunnel north: nothing a man can shift. The weeping thing's bulk can, floundering into it
  choke: { rect: [38, 9, 40, 10], behind: [38, 5, 40, 6] },   // behind: the second fall, that walls you in when you are round the bend (game.js updateTunnels)
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
    { kind: 'bread', name: 'mouldy crust', at: [54, 18.6], heal: 25 },
    { kind: 'wine', name: 'a dead man\'s wine-skin', heal: 30, at: [50.5, 9.6] },
    { kind: 'wine', name: 'jug of water', at: [45, 34.2], heal: 25 },
    { kind: 'wine', potion: 'balm', name: 'a pot of wound-balm', heal: 20, at: [17.6, 5.8] }, { kind: 'wine', potion: 'xuthal', name: 'a flask of the golden wine of Xuthal', heal: 100, at: [45.4, 33.8] },
  ],
  entities: [
    { class: 'info_player_start', at: [3.5, 17], yaw: -Math.PI / 2 },
    { class: 'thing', id: 'n1', at: [10, 10], group: 'dead_n', lurk: true },
    { class: 'thing', id: 'n2', at: [22, 23.5], group: 'dead_s', lurk: true },
    { class: 'weeper', id: 'wp', at: [25, 9.2], group: 'weeper', yaw: 0, hold: true, territory: ['weep_den', 'hollow', 'flight', 'flight_break', 'flight2'] },
    { class: 'thing', id: 'd1', at: [32, 4], group: 'driven', yaw: Math.PI / 2, hold: true },
    
    { class: 'thing', id: 'd3', at: [39, 6.3], group: 'driven', yaw: 0, hold: true },
    { class: 'thing', id: 'k1', at: [41, 25.5], group: 'dark', lurk: true },
    
    { class: 'thing', id: 'k3', at: [47, 25], group: 'dark', lurk: true },
    
    { class: 'thing', id: 'k5', at: [36, 25.5], group: 'dark', lurk: true },
    { class: 'thing', id: 'k7', at: [47, 22], group: 'dark', lurk: true },
    { class: 'thing', id: 'k9', at: [36, 24.2], group: 'dark', yaw: 0 },
    { class: 'thing', id: 'k11', at: [39, 21.5], group: 'dark', lurk: true },
    { class: 'thing', id: 'k13', at: [53.6, 17], group: 'dark', lurk: true },
    { class: 'thing', id: 'k15', at: [53.5, 11], group: 'dark', yaw: Math.PI },
    { class: 'thing', id: 'k17', at: [48.4, 10.2], group: 'dark', yaw: -Math.PI / 2 },
    
    { class: 'thing', id: 's1', at: [31, 35.5], group: 'side', yaw: Math.PI },
    
    { class: 'thing', id: 's3', at: [21, 35], group: 'side', yaw: Math.PI },
    
    { class: 'thing', id: 's5', at: [35, 31], group: 'side', lurk: true },
    
    { class: 'thing', id: 's7', at: [20.5, 36], group: 'side', yaw: Math.PI },
    
    { class: 'thing', id: 's9', at: [31, 34.5], group: 'side', yaw: Math.PI }, 
    { class: 'thing', id: 's11', at: [37, 37.3], group: 'side', yaw: Math.PI }, { class: 'thing', id: 's13', at: [19.5, 31], group: 'side', yaw: -Math.PI / 2 },
    { class: 'trigger_exit', rect: [56, 29, 58, 33] },
  ],
  puzzle: {
    flags: ['found_it', 'choke_down', 'crossed_well', 'torch_found', 'got_out', 'satha_passed'],
    actions: [
      { id: 'follow_the_weeping', needs: [], sets: 'found_it', at: 'weep_den' },
      { id: 'let_it_bring_down_the_stones', needs: ['found_it'], sets: 'choke_down', at: 'flight2' },
      { id: 'leap_the_well', needs: ['found_it', 'choke_down'], sets: 'crossed_well', at: 'cross_s' },
      { id: 'blow_the_ember_alight', needs: ['crossed_well'], sets: 'torch_found', at: 'loop1' },
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
  squads: ['charge', 'heap1', 'heap2', 'heap3', 'heap4', 'heap5', 'heap6', 'heap7'],                // five or six men who fight as one (combat.js squadChase)
  ambient: [0.36, 0.21, 0.15], haze: [0.52, 0.1, 0.08], arms: 'sword',
  // no walls: the plain goes on to the horizon under the sky; a stream and lines of boulders close the field in
  open: true, fog: 0.011, sun: [-1, 0.07, 0.3], waterY: -0.5,
  groundFog: { density: 0.04, falloff: 0.9, floor: 0, col: [0.5, 0.15, 0.1] },   // the battle's smoke and the evening mist, lying on the dead
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
    { from: [103.4, 5.5], to: [103.4, 58], r: [1.0, 1.0], prefab: 'shieldwall', rot: -Math.PI / 2, deco: true },   // the host's front rank: shields planted rim to rim, spears over them
  ],
  scatter: [
    { prefab: 'fallen', n: 90, rect: [4, 7, 98, 50] },
    { prefab: 'deadhorse', n: 26, rect: [4, 8, 64, 49] },
    { prefab: 'deadhorse', n: 10, rect: [83, 8, 19, 49] },
    { prefab: 'standard', n: 14, rect: [4, 8, 100, 49] },
    { prefab: 'boulder', n: 9, rect: [6, 12, 54, 42], size: [1.2, 2.8] },     // outcrops in the field: cover, and a ragged skyline
    { prefab: 'boulder', n: 4, rect: [85, 10, 16, 44], size: [1.2, 2.4] },
    // (drawn only, none of them in anyone's way) the wreck of the day: the volleys' shafts in the turf, slanting back to the Shemite rise;
    // broken lances standing against the sky, shields, mounds of corpses, and the trodden grass between
    { prefab: 'arrows', n: 170, rect: [34, 6, 27, 51], from: Math.PI / 2 },
    { prefab: 'arrows', n: 50, rect: [8, 6, 26, 51], from: Math.PI / 2 },
    { prefab: 'arrows', n: 50, rect: [70, 6, 32, 51], from: Math.PI / 2 },
    { prefab: 'lance', n: 70, rect: [4, 6, 99, 51] },
    { prefab: 'shieldfall', n: 70, rect: [4, 6, 99, 51] },
    { prefab: 'mound', n: 16, rect: [6, 8, 26, 47] },
    { prefab: 'mound', n: 12, rect: [83, 8, 19, 47] },
    { prefab: 'tufts', n: 900, rect: [2, 5, 112, 54] },
  ],
  props: [
    // the arrow ground: dead horses are the only cover
    ...[[37.5, 12], [40, 22], [39, 34], [41, 47], [44, 16], [45.5, 28], [44, 40], [47, 53], [49.5, 9], [50, 21], [51, 33], [49.5, 45],
      [54, 14], [55, 27], [54.5, 39], [56, 51], [58.5, 20], [59, 33], [58, 44]].map(([x, z], k) => ({ prefab: 'deadhorse', at: [x, z], rot: 1.2 + (k % 5) * 0.2, cover: true })),
    { prefab: 'heap', at: [92, 31.5] }, { prefab: 'standard', at: [90, 28], rot: 0.4 }, { prefab: 'standard', at: [94.5, 35], rot: 2.4 },
  ],
  lights: [
    { at: [-40, 32], y: 26, col: [1.0, 0.5, 0.3], rad: 260, i: 1.7 },             // the sun going down in the west
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
  // the Shemite rise: the archers' stakes planted before them, a gap where the captains stand; stake-pits sown in the arrow ground
  stakes: [{ from: [61, 16], to: [61, 27], face: -Math.PI / 2 }, { from: [61, 35], to: [61, 46], face: -Math.PI / 2 },
    // the arrow ground's own works, bent to the lie of the land: wings that funnel the attack into the archers' killing ground
    { pts: [[40, 8], [44, 12], [46, 18], [45, 24]], face: -Math.PI / 2 }, { pts: [[45, 38], [47, 43], [45, 49], [41, 53]], face: -Math.PI / 2 },
    { pts: [[52, 12], [55, 17], [54, 23]], face: -Math.PI / 2 }, { pts: [[54, 39], [56, 44], [53, 50]], face: -Math.PI / 2 },
    // and before the heap, a crescent the knights rallied behind
    { pts: [[74, 9], [78, 14], [79, 21], [77, 25]], face: -Math.PI / 2 }, { pts: [[77, 37], [79, 42], [77, 48], [73, 52]], face: -Math.PI / 2 },
    // islands of stakes on the riders' ground itself, a man can shelter in their lee; the horses ride the clear lanes round them
    { from: [72, 19], to: [73, 19], face: 0 }, { from: [72, 20], to: [73, 20], face: Math.PI },
    { from: [72, 42], to: [73, 42], face: 0 }, { from: [72, 43], to: [73, 43], face: Math.PI }],
  // and the end of the riders' ground: a ditch sown with stakes the length of the field, to be leapt; no horse will take it
  lilia: [[41, 40], [47, 22], [52, 40], [56, 19], [48, 45], [43, 16], [72, 30], [73, 31], [72, 53]].concat(Array.from({ length: 49 }, (_, k) => [80, 9 + k])),
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
    { class: 'kknight', id: 'h13', at: [101.6, 32.6], group: 'heap3', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h14', at: [101.6, 36], group: 'heap3', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h15', at: [102.4, 39], group: 'heap3', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h16', at: [101.6, 30.5], group: 'heap3', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h17', at: [102.4, 26.5], group: 'heap4', yaw: Math.PI / 2, hold: true },     // a fourth, the last before the kings ride in
    { class: 'oknight', id: 'h18', at: [101.6, 29], group: 'heap4', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h19', at: [102.4, 31.5], group: 'heap4', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h20', at: [101.6, 34], group: 'heap4', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h21', at: [102.4, 36.5], group: 'heap4', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h22', at: [101.6, 38.5], group: 'heap4', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h23', at: [102.4, 27.5], group: 'heap5', yaw: Math.PI / 2, hold: true },     // and a fifth: "again and again"
    { class: 'kknight', id: 'h24', at: [101.6, 30], group: 'heap5', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h25', at: [102.4, 32.5], group: 'heap5', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h26', at: [101.6, 35], group: 'heap5', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h27', at: [102.4, 37.5], group: 'heap5', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h28', at: [102.4, 26], group: 'heap6', yaw: Math.PI / 2, hold: true },     // a sixth, Ophir's knights on foot
    { class: 'oknight', id: 'h29', at: [101.6, 28.5], group: 'heap6', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h30', at: [102.4, 31], group: 'heap6', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h31', at: [101.6, 33.5], group: 'heap6', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h32', at: [102.4, 36], group: 'heap6', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h33', at: [102.4, 38.2], group: 'heap6', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h34', at: [101.6, 26.5], group: 'heap7', yaw: Math.PI / 2, hold: true },     // and a seventh, the last of them before the kings
    { class: 'kknight', id: 'h35', at: [102.4, 29], group: 'heap7', yaw: Math.PI / 2, hold: true },
    { class: 'oknight', id: 'h36', at: [101.6, 31.5], group: 'heap7', yaw: Math.PI / 2, hold: true },
    { class: 'kknight', id: 'h37', at: [102.4, 34], group: 'heap7', yaw: Math.PI / 2, hold: true },
    { class: 'spearman', id: 'h38', at: [101.6, 36.5], group: 'heap7', yaw: Math.PI / 2, hold: true },
  ],
  // the arrow ground: "Strabonus' Shemitish bowmen had wrought havoc among his knights"
  volley: { rooms: ['gully', 'arrowground'], group: 'line', period: 4.2 },
  // the riders' ground: "Ophirean knights in gilded mail leaped their horses over mounds of corpses"
  //   seven of them riding their ground; no more than three charge at once (a gallop), the rest canter round
  //   they ride only ground a clear cell from any stake or stake-pit (no pocket to be caught in); a horse at speed kills
  riders: { n: 7, max: 2, field: [69, 77, 9, 57], speed: 19, canter: 10, lead: 0.3, turn: 1.0, veer: 3.0, chase: 3.2, every: [1.4, 3.0], kill: true,
    at: [[70, 12], [75.5, 27], [70, 30], [75.5, 34], [70, 38], [70, 48], [75, 55]] },
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
  level: 'e1m4', next: 'e1m5', torch: true, title: 'Yothga', ramps: ['ink', 'jade', 'scarlet'], grid: [64, 36], ambient: [0.075, 0.072, 0.065], arms: 'sword',
  intro: [['YOTHGA', 'title'], ['Within the bars lay a figure, "twined and bound about with the tendrils of a thick vine which seemed to grow through the solid stone of the floor." Crimson blossoms, "a livid, unnatural crimson, like a perversity of flower-life."', ''],
    ['You find a key for the cage among the keys you carry.', 'dim']],
  objectives: [['stem_cut', 'Cut the stem. Do not touch the roots.'], ['pelias_up', 'Wait for the freed man.'], ['works_crossed', 'Follow Pelias through the old works.'],
    ['satha_fled', 'Back to the main corridor.'], ['grille_open', 'To the grille.'], ['zz', 'Up the stair.']],
  npc: { id: 'pelias', at: [11.6, 19.2], yaw: -Math.PI / 2, mode: 'bound' },
  vine: true, overgrown: { room: 'cage', n: 22, clear: [[10, 18, 1.6], [11.6, 19.2, 1.0], [6.5, 18, 1.2]] },   // Yothga's garden: its vine round Pelias, creepers and pale growths through the cage
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
    { id: 'stair', name: 'the long stair', at: [32, 24], size: [4, 3], h: 3.4, floor: 3.3, rise: -0.9, riseAxis: 'x', style: 'hewn' },   // up from the grille, toward the citadel
    { id: 'stairhead', name: 'the head of the stair', at: [31, 25], size: [1, 1], h: 3.0, floor: 3.3, style: 'hewn' },
  ],
  shafts: [], links: [],
  props: [
    // the ossuary of the old works: the bones of the builders heaped along its walls, skulls set in rows
    { prefab: 'bones', at: [7, 23.6], big: true }, { prefab: 'bones', at: [9.5, 23.6], big: true }, { prefab: 'bones', at: [12.5, 23.7], big: true }, { prefab: 'bones', at: [13.4, 26.5], big: true },
    { prefab: 'skull', at: [8, 23.4] }, { prefab: 'skull', at: [8.6, 23.4] }, { prefab: 'skull', at: [11, 23.4] }, { prefab: 'skull', at: [11.6, 23.4] }, { prefab: 'skull', at: [13.6, 25] },
    { prefab: 'chains', at: [12.2, 23], wall: 'N' }, { prefab: 'candles', at: [6.6, 27.3] },
    { prefab: 'loculi', at: [7.6, 23], wall: 'N', w: 1.2 }, { prefab: 'loculi', at: [12.4, 23], wall: 'N', w: 1.0, tiers: 2 }, { prefab: 'loculi', at: [6, 25.5], wall: 'W', w: 1.2 }, { prefab: 'loculi', at: [14, 25.5], wall: 'E', w: 1.2 },
    
    { prefab: 'door', at: [32, 25.5], wall: 'W', open: 0.55, free: true }, { prefab: 'torch', at: [32, 24.5], wall: 'W', dim: 0.9 }, { prefab: 'torch', at: [32, 26.6], wall: 'W', dim: 0.9 },   // the stair ends at a door: the way out, standing ajar
    { prefab: 'torch', at: [6.5, 14], wall: 'N', dim: 0.7 }, { prefab: 'torch', at: [13.5, 22], wall: 'S', dim: 0.6 }, { prefab: 'torch', at: [31, 10], wall: 'N', dim: 0.6 },
    { prefab: 'torch', at: [48, 4], wall: 'N', dim: 0.7 }, { prefab: 'torch', at: [56, 4], wall: 'N', dim: 0.6 }, { prefab: 'torch', at: [40, 22], wall: 'N', dim: 0.8 },
    { prefab: 'fungus', at: [52.5, 33.5] }, { prefab: 'fungus', at: [44.5, 31.5] }, { prefab: 'fungus', at: [36.5, 33.5] }, { prefab: 'fungus', at: [27.5, 31.5] }, { prefab: 'fungus', at: [19.5, 33.5] }, { prefab: 'fungus', at: [11.5, 31.5] }, { prefab: 'fungus', at: [4.5, 33.5] }, { prefab: 'fungus', at: [3.5, 25.5] },
    { prefab: 'torch', at: [10, 23], wall: 'N', dim: 0.6 }, { prefab: 'torch', at: [20, 28], wall: 'N', dim: 0.6 },
    { prefab: 'bones', at: [16, 17] }, { prefab: 'bones', at: [52, 12], big: true }, { prefab: 'skull', at: [55, 9] }, { prefab: 'bones', at: [50, 32] }, { prefab: 'bones', at: [24, 32.5], big: true }, { prefab: 'skull', at: [19, 31.5] }, { prefab: 'bones', at: [3, 26] }, { prefab: 'bones', at: [8, 24], big: true }, { prefab: 'skull', at: [12, 24] }, { prefab: 'bones', at: [10, 27], big: true }, { prefab: 'skull', at: [7, 32] }, { prefab: 'column', at: [30, 13] }, { prefab: 'column', at: [30, 19] },
  ],
  lights: [{ at: [31.5, 25.5], y: 5, col: [1.0, 0.75, 0.45], rad: 7, i: 1.6 }, { at: [10, 18], y: 1.5, col: [0.7, 0.15, 0.2], rad: 9, i: 1.1 },   // and the warren's pale fungus
    { at: [52.5, 33.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [44.5, 31.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [36.5, 33.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [27.5, 31.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [19.5, 33.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [11.5, 31.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [4.5, 33.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }, { at: [3.5, 25.5], y: 0.4, col: [0.35, 0.6, 0.4], rad: 6, i: 0.7 }],
  features: [],
  // what the dead left: Tsotha's prisoners had bread and wine smuggled to them, once
  items: [{ kind: 'bread', name: 'a prisoner\'s crust, hidden in the straw', heal: 30, at: [3.2, 16.2] }, { kind: 'wine', name: 'a leather water-skin, half full', heal: 30, at: [4.6, 19.6] },
    { kind: 'bread', name: 'heel of black bread', heal: 30, at: [12.5, 24.5] }, { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [6.5, 27] }, { kind: 'bread', name: 'heel of black bread', heal: 30, at: [27, 18.5] }, { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [43, 13.5] },
    { kind: 'bread', name: 'heel of black bread', heal: 30, at: [57, 14] }, { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [60, 23] }, { kind: 'bread', name: 'heel of black bread', heal: 30, at: [43, 26] },
    { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [40, 32.5] }, { kind: 'bread', name: 'heel of black bread', heal: 30, at: [3, 30] }, { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [9, 25.5] }, { kind: 'wine', name: 'skin of sour wine', heal: 35, at: [33, 28.8] },
    { kind: 'wine', potion: 'balm', name: 'a pot of wound-balm', heal: 20, at: [27.4, 18.8] }, { kind: 'wine', potion: 'xuthal', name: 'a flask of the golden wine of Xuthal', heal: 100, at: [57.4, 14.3] },
  ],
  entities: [
    { class: 'info_player_start', at: [3.5, 18], yaw: -Math.PI / 2 },
    { class: 'yothga', id: 'yo', at: [10, 18], group: 'yothga', yaw: Math.PI / 2 },
    { class: 'thing', id: 'g1', at: [29, 12], group: 'gallery' }, { class: 'thing', id: 'g3', at: [30, 17], group: 'gallery' },
    { class: 'thing', id: 'g5', at: [29.5, 21], group: 'gallery', lurk: true }, 
    { class: 'thing', id: 'l1', at: [35, 13.5], group: 'ledge' }, { class: 'thing', id: 'l3', at: [44.8, 10], group: 'ledge' },
    { class: 'thing', id: 'd1', at: [51, 10], group: 'den' }, { class: 'thing', id: 'd3', at: [56, 9], group: 'den' }, 
    { class: 'thing', id: 'd5', at: [55, 13.5], group: 'den', lurk: true }, { class: 'thing', id: 'd7', at: [53, 9], group: 'den' }, 
    { class: 'thing', id: 't1', at: [59.5, 16], group: 'tunnel' }, { class: 'thing', id: 't3', at: [56, 32], group: 'tunnel' },
    { class: 'thing', id: 't5', at: [47, 32.5], group: 'tunnel' }, 
    { class: 'thing', id: 'w1', at: [36, 32], group: 'warren' }, { class: 'thing', id: 'w3', at: [28, 32.5], group: 'warren', lurk: true },
    { class: 'thing', id: 'w5', at: [18, 31.5], group: 'warren' }, { class: 'thing', id: 'w11', at: [30, 32.5], group: 'warren' }, 
    { class: 'thing', id: 'w7', at: [10, 32], group: 'warren2' }, { class: 'thing', id: 'w9', at: [3, 32.5], group: 'warren2' },
    
    { class: 'thing', id: 'o1', at: [8, 25], group: 'ossuary' }, { class: 'thing', id: 'o3', at: [12, 26.5], group: 'ossuary' }, 
    { class: 'thing', id: 'b1', at: [3, 26], group: 'backway' }, { class: 'thing', id: 'b3', at: [27, 29], group: 'backway', lurk: true },
    
    { class: 'thing', id: 'r1', at: [38, 24], group: 'stair' }, { class: 'thing', id: 'r3', at: [38, 27.5], group: 'stair', lurk: true },
    { class: 'trigger_exit', rect: [31, 25, 32, 26] },
  ],
  beats: [
    { id: 'cut', killed: 'yothga', sets: 'stem_cut', lines: [['You cut through the stem with a single stroke. The great vine lashes and knots like a beheaded serpent, then straightens out limply; a reeking white liquid oozes from the severed stump.', 'good'],
      ['The freed man is on his feet. His eyes are dark and meditative, alive with intelligence. "What year is this?"', 'voice'], ['You: "Today is the tenth day of the month Yuluk, of the year of the Gazelle."', ''],
      ['"Yagkoolan Ishtar! Ten years!" He draws a hand across his brow. "Who are you?" / You: "Conan, once of Cimmeria. Now king of Aquilonia." / "Indeed? And Namedides?" / You: "I strangled him on his throne the night I took the royal city."', 'voice'],
      ['"Tell me: why did you cut the stem of the plant Yothga instead of tearing it up by the roots?" / You: "Because I learned long ago to avoid touching with my flesh that which I do not understand."', 'voice'],
      ['"Well for you. Had you been able to tear it up, you might have found things clinging to the roots against which not even your sword would prevail. Yothga\'s roots are set in hell."', 'voice'],
      ['"Men called me Pelias." Pelias the sorcerer, Tsotha-lanti\'s rival, who vanished from the earth ten years ago. "Tsotha preferred to keep me alive, in shackles more grim than rusted iron."', 'voice'],
      ['"My powers begin to wake. I sense in your mind a great battle and a king trapped by treachery; and I see Tsotha-lanti riding hard for the Tybor with Strabonus and the king of Ophir. Let us go forth from these pits."', 'voice']], npc: 'stand' },
    { id: 'up', needs: ['stem_cut'], after: 9, sets: 'pelias_up', npc: 'follow', lines: [['Pelias follows a few paces behind you: east, he says, through the old works, and keep them off him.', 'dim']] },
    { id: 'works', at: ['gallery'], needs: ['pelias_up'], sets: 'works_crossed', wake: ['gallery'], lines: [['"They are coming. Keep them off me: I am weak yet, from ten years in that thing\'s arms."', 'voice'],
      ['You: "There is a cursed big snake creeping about these tunnels." / Pelias: "I remember him of old, the more as I was forced to watch while ten of my acolytes were fed to him. He is Satha, the Old One, chiefest of Tsotha\'s pets."', 'voice']] },
    { id: 'ledgeb', at: ['ledge'], wake: ['ledge'] },
    { id: 'satha', at: ['main'], needs: ['works_crossed'], sets: 'satha_fled', sound: 'rumble', lines: [['Pelias: "As for Tsotha, men say that a dancing-girl of Shadizar slept too near the pre-human ruins on Dagoth Hill and woke in the grip of a black demon; from that unholy union was spawned an accursed hybrid men call Tsotha-lanti—"', 'voice'],
      ['The torches bow. Up the corridor comes Satha, rearing high, an ageless hate in its eyes.', 'warn'],
      ['But the snake is not looking at you. It glares over your shoulder at Pelias, who stands with his arms folded, smiling; and in the great cold yellow eyes the hate dies out in a glitter of pure fear. With a swirling rush like the sweep of a strong wind, the great snake is gone.', 'voice'],
      ['You: "What did he see to frighten him?" / Pelias: "The scaled people see what escapes the mortal eye. You see my fleshly guise; he saw my naked soul."', 'voice']] },
    { id: 'den', at: ['den2'], wake: ['den'] },
    { id: 'tun', at: ['last', 'deep'], wake: ['tunnel'] },
    { id: 'warren', at: ['deep'], needs: ['satha_fled'], after: 4, wake: ['warren'], lines: [['"Their warren. Satha hunts them here, and they breed faster than she eats. West, and up: the old way round to the stair."', 'voice']] },
    { id: 'warren2', at: ['deep'], needs: ['satha_fled'], after: 14, wake: ['warren2'] },
    { id: 'oss', at: ['backway', 'ossuary'], wake: ['ossuary'] },
    { id: 'back', at: ['climb', 'backway'], wake: ['backway'], lines: [['A passage of dressed stone, older than the citadel. Something has followed you up out of the warren.', 'warn']] },
    { id: 'grille', at: ['grille_room'], needs: ['satha_fled'], wake: ['stair'], after: 2, sets: 'pelias_at_grille', npc: 'cast',
      lines: [['Pelias laughs, and his laugh is not pleasant to hear. "Who is our doorman? Lo, the noble Shukeli, who hanged my young men by their feet and skinned them!" / You: "He is dead." / "Dead or alive, he shall open the door for us."', 'voice'],
      ['He claps his hands sharply: "Rise, Shukeli! Rise from hell and rise from the bloody floor and open the door for your masters! Rise, I say!"', 'voice'],
      ['The body of Shukeli stirs, with infantile gropings of the fat hands, and reels upright, clutching at the bars, its glassy eyes empty. The dead fingers work the bolt.', 'warn']] },
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
const RED_HALL = { floor: 'FLAG', wall: 'REDSTONE', ceil: 'HEWN' };   // the Scarlet Citadel's own red stone
const LEVEL_E1M5 = {
  level: 'e1m5', next: 'e1m6', torch: true, title: 'The Scarlet Citadel', ramps: ['ink', 'scarlet', 'bronze'], grid: [70, 34], ambient: [0.07, 0.05, 0.045], arms: 'sword',
  open: true, night: true, mason: 'REDSTONE', moon: [-0.6, 0.3, 0.5], sun: [0.3, -0.2, 0.9], fog: 0.0075, haze: [0.025, 0.027, 0.05],
  intro: [['THE SCARLET CITADEL', 'title'], ['Up the long stair, Pelias leading. "Tsotha is away, riding for Shamar with the kings," he says. "His household will not trouble us tonight."', 'voice']],
  objectives: [['door_passed', 'Up the long stair behind Pelias, to the skull-crowned door.'], ['censers_passed', 'Through the silent citadel.'], ['in_chamber', 'On, behind Pelias.'], ['globe_ready', 'Drink.'],
    ['globe_seen', 'Look into Tsotha\'s crystal. (E)'], ['tower_climbed', 'Up the gold-worked stair to the pinnacles.'], ['beast_came', 'Across the battlements to the tallest tower.'], ['beast_called', 'Hear him out.'], ['zz', 'Mount, and ride.']],
  npc: { id: 'pelias', at: [3, 21], yaw: -Math.PI / 2, mode: 'follow' },
  exitNeeds: 'beast_called',
  areas: [
    { id: 'stair', type: 'puzzle', name: 'The Long Stair', rooms: ['stairfoot', 'longstair', 'skulldoor'], cp: [3.5, 20, -Math.PI / 2] },
    { id: 'black', type: 'puzzle', name: 'The Black Corridor', rooms: ['blackcorr'], cp: [20, 19.5, -Math.PI / 2] },
    { id: 'censer', type: 'puzzle', name: 'The Censers', rooms: ['censer'], cp: [38.5, 20, Math.PI] },
    { id: 'hall', type: 'puzzle', name: 'The Silent Halls', rooms: ['guardhall'], cp: [41, 8, -Math.PI / 2] },
    { id: 'barracks', type: 'action', name: 'The Soldiers\' Quarters', rooms: ['passage', 'barracks', 'armoury'], cp: [38.5, 4.5, Math.PI / 2] },
    { id: 'chambers', type: 'puzzle', name: 'The Gold-Domed Chamber', rooms: ['chambers'], cp: [53, 9, -Math.PI / 2] },
    { id: 'tower', type: 'puzzle', name: 'The Gold-Worked Stair', rooms: ['towerstair'], cp: [61, 10, Math.PI] },
    { id: 'roof', type: 'puzzle', name: 'The Pinnacles', rooms: ['roof1', 'roof2', 'roof3', 'roof4'], cp: [59, 26.5, Math.PI / 2] },
    { id: 'roofw', type: 'puzzle', name: 'The Tallest Tower', rooms: ['roof5', 'roof6'], cp: [38, 26.5, Math.PI / 2] },
  ],
  rooms: [
    { id: 'stairfoot', name: 'the foot of the long stair', at: [2, 18], size: [4, 5], h: 3, style: 'hewn' },
    { id: 'longstair', name: 'the long stair', at: [6, 19], size: [12, 3], h: 3, floor: 0.4, rise: 0.48, style: 'hewn' },
    { id: 'skulldoor', name: 'the brass, skull-crowned door', at: [18, 18], size: [3, 5], h: 3.4, floor: 6, style: 'hewn' },
    { id: 'blackcorr', name: 'the black corridor', at: [21, 18], size: [16, 3], h: 2.8, floor: 6, style: 'hewn', tex: { floor: 'BLACKMAIL', wall: 'JET', ceil: 'BLACK' } },
    { id: 'censer', name: 'the corridor of censers', at: [37, 8], size: [3, 15], h: 3.2, floor: 6, style: 'hewn', tex: RED_HALL },
    { id: 'guardhall', name: 'a hall with a golden-silled window', at: [40, 3], size: [12, 10], h: 4.2, floor: 6, vault: 1.2, style: 'hewn', tex: RED_HALL },
    { id: 'passage', name: 'a passage off the guard hall', at: [37, 4], size: [3, 2], h: 2.8, floor: 6, style: 'hewn', tex: RED_HALL },
    { id: 'barracks', name: 'the soldiers\' quarters', at: [21, 2], size: [16, 6], h: 3.2, floor: 6, style: 'hewn', tex: { floor: 'MUD', wall: 'REDSTONE', ceil: 'HEWN' } },
    { id: 'armoury', name: 'the armoury', at: [14, 1], size: [7, 8], h: 3.6, floor: 6, vault: 0.8, style: 'hewn', tex: RED_HALL },
    { id: 'chambers', name: 'a gold-domed chamber, floored with silver', at: [52, 5], size: [8, 8], h: 4.6, floor: 6, vault: 1.6, style: 'hewn', tex: { floor: 'TABARD', wall: 'REDSTONE', ceil: 'GILT' } },
    { id: 'towerstair', name: 'a flight of marble, gold-worked stairs', at: [60, 7], size: [3, 17], h: 3, floor: 6.4, rise: 0.5, riseAxis: 'z', style: 'hewn', tex: { floor: 'ASHLAR', wall: 'ASHLAR', ceil: 'GILT' } },
    { id: 'roof1', name: 'the battlements', at: [57, 24], size: [6, 5], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'REDSTONE', ceil: 'SKY' } },
    { id: 'gap1', name: 'a gap in the battlements', at: [56, 24], size: [1, 5], floor: 14.5, pit: 40, void: true, sky: true, style: 'hewn' },
    { id: 'roof2', name: 'the battlements', at: [50, 24], size: [6, 5], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'REDSTONE', ceil: 'SKY' } },
    { id: 'gap2', name: 'a gap in the battlements', at: [49, 24], size: [1, 5], floor: 14.5, pit: 40, void: true, sky: true, style: 'hewn' },
    { id: 'roof3', name: 'the battlements', at: [43, 24], size: [6, 5], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'REDSTONE', ceil: 'SKY' } },
    { id: 'gap3', name: 'a gap in the battlements', at: [42, 24], size: [1, 5], floor: 14.5, pit: 40, void: true, sky: true, style: 'hewn' },
    { id: 'gap4', name: 'a gap in the battlements', at: [33, 24], size: [1, 5], floor: 14.5, pit: 40, void: true, sky: true, style: 'hewn' },
    { id: 'roof5', name: 'the battlements', at: [26, 24], size: [7, 5], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'REDSTONE', ceil: 'SKY' } },
    { id: 'gap5', name: 'a gap in the battlements', at: [25, 24], size: [1, 5], floor: 14.5, pit: 40, void: true, sky: true, style: 'hewn' },
    { id: 'roof6', name: 'the roof of the tallest tower', at: [16, 24], size: [9, 6], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'REDSTONE', ceil: 'SKY' } },
    { id: 'roof4', name: 'the battlements', at: [34, 23], size: [8, 7], floor: 14.5, sky: true, style: 'hewn', tex: { floor: 'FLAG', wall: 'REDSTONE', ceil: 'SKY' } },
  ],
  shafts: [], links: [],
  planks: [{ from: [48.9, 27.5], to: [50.1, 27.5] }],
  props: [
    { prefab: 'torch', at: [3, 18], wall: 'N', dim: 0.8 }, { prefab: 'torch', at: [12, 19], wall: 'N', dim: 0.6 }, { prefab: 'torch', at: [19.5, 18], wall: 'N', dim: 0.8 },
    { prefab: 'torch', at: [26, 18], wall: 'N', dim: 0.5 }, { prefab: 'torch', at: [33, 21], wall: 'S', dim: 0.5 },
    { prefab: 'brazier', at: [38.5, 11] }, { prefab: 'brazier', at: [38.5, 16] }, { prefab: 'brazier', at: [38.5, 21] },
    { prefab: 'column', at: [43, 6] }, { prefab: 'column', at: [49, 6] }, { prefab: 'column', at: [43, 10] }, { prefab: 'column', at: [49, 10] },
    { prefab: 'torch', at: [46, 3], wall: 'N', dim: 0.9 }, { prefab: 'brazier', at: [56, 9] }, { prefab: 'table', at: [55, 7] },
    { prefab: 'torch', at: [63, 12], wall: 'E', dim: 0.6 }, { prefab: 'torch', at: [63, 18], wall: 'E', dim: 0.6 },
    // the citadel furnished: hangings, sconces and arms on the walls; the quarters strewn with the guards' gear
    { prefab: 'tapestry', at: [24, 18], wall: 'N', w: 1.1, h: 1.6, top: 2.5 }, { prefab: 'tapestry', at: [30, 21], wall: 'S', w: 1.1, h: 1.6, top: 2.5 },
    { prefab: 'sconce', at: [37, 14], wall: 'W' }, { prefab: 'sconce', at: [40, 18], wall: 'E' }, { prefab: 'tapestry', at: [37, 11.5], wall: 'W', w: 0.9, h: 1.8, top: 2.9 }, { prefab: 'tapestry', at: [40, 16.5], wall: 'E', w: 0.9, h: 1.8, top: 2.9 },
    { prefab: 'carpet', at: [38.5, 15.5], w: 0.8, l: 9 },
    { prefab: 'tapestry', at: [48.4, 3], wall: 'N', w: 1.4, h: 2.6, top: 3.9 }, { prefab: 'tapestry', at: [50.8, 13], wall: 'S', w: 0.9, h: 2.2, top: 3.6 }, { prefab: 'trophy', at: [40, 7], wall: 'W' },
    { prefab: 'banner', at: [44, 13], wall: 'S' }, { prefab: 'banner', at: [48, 13], wall: 'S' }, { prefab: 'sconce', at: [50, 3], wall: 'N' }, { prefab: 'sconce', at: [42, 3], wall: 'N' },
    { prefab: 'bunk', at: [24, 6.6] }, { prefab: 'bunk', at: [29, 6.6] }, { prefab: 'bunk', at: [34, 6.6] }, { prefab: 'cask', at: [26.5, 2.7] }, { prefab: 'cask', at: [31.5, 5.4], lie: true },
    { prefab: 'pegs', at: [27, 2], wall: 'N' }, { prefab: 'trophy', at: [32, 2], wall: 'N', bare: true }, { prefab: 'chest', at: [35.6, 3.0] }, { prefab: 'table', at: [30, 4.3] },
    { prefab: 'rack', at: [14, 3], wall: 'W' }, { prefab: 'spear_rack', at: [14, 6.5], wall: 'W' }, { prefab: 'pegs', at: [17.5, 1], wall: 'N' }, { prefab: 'trophy', at: [17.5, 9], wall: 'S' },
    { prefab: 'sconce', at: [15.5, 9], wall: 'S' }, { prefab: 'sconce', at: [19.8, 1], wall: 'N' }, { prefab: 'sconce', at: [15, 1], wall: 'N' },
    { prefab: 'divan', at: [57.5, 11.6], yaw: Math.PI }, { prefab: 'tapestry', at: [56, 13], wall: 'S', w: 1.1, h: 2.2, top: 3.4 }, { prefab: 'tapestry', at: [56, 5], wall: 'N', w: 1.2, h: 2.0, top: 3.4 },
    { prefab: 'sconce', at: [60, 16], wall: 'W' }, { prefab: 'sconce', at: [63, 20], wall: 'E' },
  ],
  lights: [{ at: [56, 9], y: 7.5, col: [0.4, 0.6, 1.0], rad: 10, i: 1.2 },
    { at: [-25, 67], y: 90, col: [0.5, 0.56, 0.8], rad: 600, i: 0.7, sky: true }],   // the moon over the battlements (only on what is under the sky)
  city: { seed: 31, n: 560, r0: 14, r1: 190, ground: -4, tall: 1.7, towers: 0.14 },   // Khorshemish below the citadel, lamplit
  items: [{ kind: 'wine', name: 'a wine-skin left on the battlements', heal: 35, at: [30, 27.5] }, { kind: 'wine', name: 'a forgotten cup of wine', heal: 35, at: [38.5, 21.6] },
    { kind: 'bread', name: 'a guard\'s black bread', heal: 30, at: [30, 4.5] }, { kind: 'wine', name: 'a guard\'s wine-skin', heal: 35, at: [19, 2] }, { kind: 'bread', name: 'a heel of bread from the quarters', heal: 30, at: [24.5, 4.5] },
    { kind: 'wine', name: 'Tsotha\'s wine', heal: 40, at: [55, 8] }, { kind: 'bread', name: 'a honey-cake on a gold dish', heal: 25, at: [45, 4.5] },
    { kind: 'wine', name: 'a flask of wine', heal: 30, at: [61, 22] },
    { kind: 'wine', potion: 'xuthal', name: 'a flask of golden wine from Tsotha\'s table, the wine of Xuthal', heal: 100, at: [55.4, 8.3] },
  ],
  // "The slaves and soldiers are quartered in another part of the citadel ... Tonight, their master being away, they doubtless lie drunk on wine or lotus-juice."
  // Pelias's way up through the citadel is silent. Tsotha's black guard lies drunk in its quarters, off it to the west: let them lie, or go in among them.
  entities: [
    { class: 'info_player_start', at: [3.5, 20], yaw: -Math.PI / 2 },
    { class: 'axeman', id: 'b1', at: [33, 3.2], group: 'quarters', asleep: true, yaw: Math.PI / 2 }, { class: 'axeman', id: 'b3', at: [27.5, 4.6], group: 'quarters', asleep: true, yaw: -Math.PI / 2 },
    { class: 'axeman', id: 'b5', at: [23, 3.2], group: 'quarters', asleep: true }, { class: 'axeman', id: 'a1', at: [16.5, 3.5], group: 'quarters', asleep: true, yaw: -Math.PI / 2 },
    { class: 'axeman', id: 'a2', at: [17.5, 6.5], group: 'quarters', asleep: true, yaw: -Math.PI / 2 },
    { class: 'trigger_exit', rect: [17, 25, 19, 29] },
  ],
  features: [
    { type: 'act', id: 'globe', at: [55, 7.1], y: 1.1, needs: ['globe_ready'], sets: 'globe_seen', range: 6, prompt: 'look into Tsotha\'s crystal' },
  ],
  beats: [
    { id: 'door', at: 'skulldoor', sets: 'door_passed', lines: [['Up the long stairs, and through the brass, skull-crowned door at the top. You grip your sword, expecting a rush of slaves; but silence grips the citadel.', '']] },
    { id: 'censer', at: 'censer', sets: 'censers_passed', lines: [['Through the black corridor, and into the one where the censers swing, billowing forth their everlasting incense. Still you see no one.', ''],
      ['Pelias: "The slaves and soldiers are quartered in another part of the citadel. Tonight, their master being away, they doubtless lie drunk on wine or lotus-juice."', 'voice']] },
    { id: 'window', at: 'guardhall', needs: ['censers_passed'], lines: [['Through an arched, golden-silled window you see the dark-blue, star-flecked sky. It was shortly after sunrise when they threw you into the pits; now it is past midnight. You are suddenly aware of thirst, and a ravenous appetite.', '']] },
    { id: 'quarters', at: ['passage', 'barracks'], lines: [['The soldiers\' quarters. Tsotha\'s black giants sprawl among spilled wine-jars, drunk and snoring, their axes by them. Walk softly: running feet will wake them.', 'warn']] },
    { id: 'chambers', at: 'chambers', needs: ['censers_passed'], after: 1, sets: 'in_chamber', npc: 'stay',
      lines: [['A gold-domed chamber, floored with silver, its lapis-lazuli walls pierced by the fretted arches of many doors. With a sigh Pelias sinks onto a silken divan.', ''],
        ['Pelias: "Gold and silks again. Tsotha affects to be above the pleasures of the flesh, but he is half devil. I am human, despite my black arts; I love ease and good cheer. That\'s how Tsotha trapped me: he caught me helpless with drink."', 'voice'],
        ['"Wine is a curse—by the ivory bosom of Ishtar, even as I speak of it, the traitor is here! Friend, please pour me a goblet—hold! I forgot that you are a king. I will pour."', 'voice'],
        ['You: "The devil with that." You fill a crystal goblet and hand it to him; then, lifting the jug, you drink deeply from the mouth. "The dog knows good wine. But by Crom, Pelias, are we to sit here until his soldiers awake and cut our throats?"', ''],
        ['Pelias: "No fear. Would you like to see how fortune holds with Strabonus?" He lifts a great shimmering globe from an ebony table. "Tsotha\'s crystal. A childish toy, but useful when there is lack of time for higher science. Look in, your majesty."', 'voice']] },
    { id: 'globe_ready', needs: ['in_chamber'], quiet: true, sets: 'globe_ready' },
    { id: 'globe', needs: ['globe_seen'], npc: 'follow',
      lines: [['Cloudy depths deepen and expand, and images crystallize out of mist and shadow: broad plains running to a wide winding river, and on its northern bank a walled town guarded by a moat. "By Crom! It\'s Shamar! The dogs besiege it!" The invaders swarm about its walls, their mail gleaming palely under the moon.', 'warn'],
        ['The scene changes. Tamar, your own capital, where all is confusion: the steel-clad knights of Poitain, your staunchest supporters, ride out of the gate hooted and hissed by the multitude; men-at-arms with the insignia of Pellia man the towers. Over all, like a phantasmal mirage, the dark, triumphant face of Prince Arpello of Pellia.', 'warn'],
        ['Pelias: "They have heard that you are dead. Naturally, they turn to the strongest noble, to avoid the horrors of anarchy. They do not trust the Poitanians, remembering former wars. But Arpello is on hand."', 'voice'],
        ['You: "When I come to Aquilonia again he will be but a headless corpse rotting on Traitor\'s Common! From Shamar to Tamar is five days\' ride, even if you kill your horses on the road. Oh Crom, Ymir, and Set! If I but had wings to fly like lightning to Tamar!"', ''],
        ['Pelias rises as with a definite purpose and beckons you to follow: up a flight of marble, gold-worked stairs.', 'voice']] },
    { id: 'tower', at: 'towerstair', needs: ['globe_seen'], npc: 'follow' },
    { id: 'climbed', at: 'roof1', sets: 'tower_climbed', lines: [['The pinnacles of the citadel, under the stars. A strong wind blows through the star-filled skies; far below twinkle the lights of Khorshemish. The tallest tower stands across the gaps.', '']] },
    { id: 'beast', at: 'roof6', needs: ['tower_climbed'], after: 2, sets: 'beast_came', npc: 'cast', sound: 'wind',
      lines: [['Pelias: "There are creatures, not alone of earth and sea, but of air and the far reaches of the skies as well, dwelling apart, unguessed of men. Watch, and fear not."', 'voice'],
        ['He lifts his hands to the skies and sounds a long weird call that shudders out into space. A beat of wings in the stars: a huge bat-like creature alights beside you. Its great calm eyes regard you; its giant wings spread forty feet. It is neither bat nor bird.', 'warn'],
        ['Pelias: "Mount and ride. By dawn it will bring you to Tamar." / You: "By Crom! What of you? I would not leave you alone among your enemies."', 'voice'],
        ['Pelias: "Be at ease regarding me. At dawn the people of Khorshemish will know they have a new master. Doubt not what the gods have sent you. I will meet you in the plain by Shamar."', 'voice']] },
    { id: 'mount', needs: ['beast_came'], quiet: true, sets: 'beast_called' },
  ],
  puzzle: {
    flags: ['door_passed', 'censers_passed', 'in_chamber', 'globe_ready', 'globe_seen', 'tower_climbed', 'beast_came', 'beast_called'],
    actions: [
      { id: 'climb_the_stair', needs: [], sets: 'door_passed', at: 'skulldoor' }, { id: 'through_the_silence', needs: ['door_passed'], sets: 'censers_passed', at: 'censer' },
      { id: 'follow_pelias', needs: ['censers_passed'], sets: 'in_chamber', at: 'chambers' }, { id: 'drink', needs: ['in_chamber'], sets: 'globe_ready', at: 'chambers' },
      { id: 'look_in_the_crystal', needs: ['globe_ready'], sets: 'globe_seen', at: 'chambers' }, { id: 'climb_the_stair', needs: ['globe_seen'], sets: 'tower_climbed', at: 'roof1' },
      { id: 'cross_to_the_tallest_tower', needs: ['tower_climbed'], sets: 'beast_came', at: 'roof6' }, { id: 'hear_him', needs: ['beast_came'], sets: 'beast_called', at: 'roof6' },
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
  squads: [ 'stair', 'stair3', 'lower', 'guard', 'guard3'],   // men who fight as one: they ring you, and never more than two blows in the air at once (combat.js squadChase)
  open: true, dawn: true, breaches: [[37.5, 13], [21.5, 24], [5.5, 23]],   // the parapet broken where the archers fled over it
  sun: [1, 0.06, 0.15], fog: 0.006, haze: [0.35, 0.12, 0.1],
  city: { seed: 9, n: 700, r0: 10, r1: 220, ground: 0, inside: true, maxH: 26, crowd: [30, 29, 18, 900] },
  // (the sun just up in the east, on the city and the leads: under the open sky only)   // Tamar below the leads, and its people in the square, "screaming their hate at Arpello"
  intro: [['THE TOWER OF TAMAR', 'title'], ['Under the great tower beside the royal palace the people swirl and mill, screaming their hate at Arpello, who stands on the turrets and laughs down at them while his archers range the parapets.', ''],
    ['Arpello: "Fools! Howl as you will! Conan is dead and Arpello is king!"', 'voice'],
    ['Out of the crimson dawn comes a flying speck that grows to a bat, then to an eagle. It roars over the great tower; from between its titan-wings you spring onto the turret, half naked, blood-stained, brandishing a great sword. From the multitude below rises a roar that rocks the towers: "The king! It is the king!"', 'warn']],
  objectives: [['arpello_hurled', 'Arpello stands transfixed. Then he leaps at you.'], ['laughed', ''], ['stair_cleared', 'Down the tower stair: his men still hold it.'],
    ['guard_broken', 'Down the lower stair: Arpello\'s household guard hold the gate-tower.'], ['zz', 'Out by the postern in the north wall of the guardroom, where the daylight comes in.']],
  exitNeeds: 'guard_broken',
  areas: [
    { id: 'arpello', type: 'action', name: 'Arpello', rooms: ['crown'], cp: [43, 17, -Math.PI / 2] },
    { id: 'turret', type: 'action', name: 'The Turret', rooms: ['turret1'], cp: [6, 19, -Math.PI / 2] },
    { id: 'leads', type: 'puzzle', name: 'The Leads', rooms: ['bridge1', 'roofA', 'bridge2', 'bridge3'], cp: [14, 19, -Math.PI / 2] },
    { id: 'archers', type: 'action', name: 'The Archers\' Turret', rooms: ['turret2'], cp: [35, 18, -Math.PI / 2] },
    { id: 'stair', type: 'action', name: 'The Tower Stair', rooms: ['tdoor', 'tstair', 'thall'], cp: [52.5, 15, Math.PI] },
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
    // the stair runs down inside the tower's wall, a cell of masonry between it and the open crown: in by a doorway at the top
    { id: 'tdoor', name: 'the head of the tower stair', at: [50, 14], size: [1, 2], h: 3, floor: 40, style: 'hewn' },
    { id: 'tstair', name: 'the tower stair', at: [51, 14], size: [3, 14], h: 3, floor: 40, rise: -0.9, riseAxis: 'z', style: 'hewn' },
    { id: 'lstair', name: 'the lower stair', at: [57, 13], size: [3, 13], h: 3, floor: 17.2, rise: 0.9, riseAxis: 'z', style: 'hewn' },
    { id: 'guardroom', name: 'the guardroom of the gate-tower', at: [53, 2], size: [11, 11], h: 4, floor: 17, vault: 1, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'HEWN' } },
    { id: 'postern', name: 'the postern gate', at: [53, 0], size: [2, 2], h: 3.4, floor: 17, vault: 0.8, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'HEWN' } },   // a vaulted gate passage in the north wall, behind a portcullis
    { id: 'thall', name: 'the hall at the stair\'s foot', at: [53, 26], size: [9, 7], h: 3.6, floor: 28, style: 'hewn', tex: { floor: 'FLAG', wall: 'HEWN', ceil: 'HEWN' } },
  ],
  shafts: [], links: [], features: [],
  planks: [{ from: [28.9, 19.5], to: [30.1, 19.5] }],
  props: [
    // Arpello's tower furnished: hangings and arms in the hall at the stair's foot, sconces down the stairs, the household's table
    { prefab: 'tapestry', at: [57.5, 33], wall: 'S', w: 1.5, h: 2.2, top: 3.3 }, { prefab: 'banner', at: [62, 28.5], wall: 'E' }, { prefab: 'banner', at: [62, 31.2], wall: 'E' },
    { prefab: 'sconce', at: [53, 30.5], wall: 'W' }, { prefab: 'trophy', at: [60, 26], wall: 'N' }, { prefab: 'table', at: [58.5, 30.6] }, { prefab: 'stool', at: [57.2, 30.9] }, { prefab: 'chest', at: [61.2, 32.3] },
    { prefab: 'sconce', at: [51, 18], wall: 'W' }, { prefab: 'sconce', at: [51, 23.5], wall: 'W' }, { prefab: 'sconce', at: [57, 16.5], wall: 'W' }, { prefab: 'sconce', at: [60, 21], wall: 'E' },
    { prefab: 'banner', at: [64, 6], wall: 'E' }, { prefab: 'sconce', at: [53, 4.2], wall: 'W' }, { prefab: 'tapestry', at: [57.5, 2], wall: 'N', w: 1.2, h: 2.0, top: 3.6 }, { prefab: 'cask', at: [63.2, 8.4] },
    { prefab: 'torch', at: [54, 15], wall: 'E', dim: 0.6 }, { prefab: 'torch', at: [54, 21], wall: 'E', dim: 0.6 }, { prefab: 'torch', at: [55, 26], wall: 'N', dim: 0.8 }, { prefab: 'brazier', at: [52.6, 2.6] }, { prefab: 'brazier', at: [55.6, 2.6] },
    // the postern: a heavy door at the end of the gate passage, standing ajar on the street, a torch either side
    { prefab: 'door', at: [54, 0], wall: 'N', open: 0.6 }, { prefab: 'torch', at: [53.2, 0], wall: 'N', dim: 0.9 }, { prefab: 'torch', at: [54.8, 0], wall: 'N', dim: 0.9 },
    // the guardroom of the gate-tower: the household guard's quarters
    { prefab: 'bunk', at: [61.6, 2.6] }, { prefab: 'bunk', at: [61.6, 12.2] },   // in the corners, the floor left open
    { prefab: 'table', at: [54.4, 12.2] }, { prefab: 'stool', at: [55.6, 12.4] }, { prefab: 'candles', at: [54.6, 12.3] },
    { prefab: 'rack', at: [53, 7], wall: 'W' }, { prefab: 'spear_rack', at: [53, 10], wall: 'W' }, { prefab: 'rack', at: [64, 11.5], wall: 'E' },
    { prefab: 'chains', at: [60.5, 2], wall: 'N' }, { prefab: 'brazier', at: [61, 12] },
    { prefab: 'standard', at: [45, 14], rot: 1.2 }, { prefab: 'bones', at: [22, 20] }],
  lights: [{ at: [54, -0.4], y: 19, col: [1.0, 0.7, 0.4], rad: 6, i: 1.4 }, { at: [54, 1.0], y: 19, col: [1.0, 0.8, 0.55], rad: 12, i: 1.3 },
    { at: [150, 30], y: 60, col: [1.0, 0.62, 0.4], rad: 900, i: 1.7, sky: true }],   // the crimson dawn on Tamar's roofs and streets
  items: [{ kind: 'wine', name: 'Arpello\'s wine-flask', heal: 40, at: [44, 13] }, { kind: 'bread', name: 'a guard\'s bread', heal: 30, at: [48.5, 21.5] }, { kind: 'wine', name: 'a guard\'s wine-skin', heal: 35, at: [52.5, 23.5] }, { kind: 'wine', name: 'archer\'s wine-skin', heal: 35, at: [9, 16] }, { kind: 'bread', name: 'soldier\'s bread', heal: 30, at: [24, 22] },
    { kind: 'wine', name: 'archer\'s wine-skin', heal: 35, at: [40, 21] }, { kind: 'bread', name: 'soldier\'s bread', heal: 30, at: [53, 20] },
    { kind: 'wine', name: 'a guardsman\'s wine-skin', heal: 35, at: [61, 28] }, { kind: 'bread', name: 'a guardsman\'s bread', heal: 30, at: [58, 14] }, { kind: 'wine', name: 'a cup of Arpello\'s wine', heal: 40, at: [62, 11] },
    { kind: 'bread', name: 'an archer\'s bread', heal: 30, at: [34.8, 16] }, { kind: 'wine', name: 'a guardsman\'s wine-skin', heal: 35, at: [59.2, 24.5] }, { kind: 'bread', name: 'a guardsman\'s bread', heal: 30, at: [54, 32] },
    { kind: 'wine', potion: 'balm', name: 'a pot of wound-balm', heal: 20, at: [53.4, 20.3] }, { kind: 'wine', potion: 'xuthal', name: 'a flask of the golden wine of Xuthal', heal: 100, at: [62.3, 11.3] },
  ],
  entities: [
    { class: 'info_player_start', at: [43.2, 17.5], yaw: -Math.PI / 2 },
    // "his archers ranged the parapets, bolts drawn": on the turret across the leads, shooting down at the crowd; when he goes over, their nerve breaks
    { class: 'pellian_archer', id: 'b1', at: [36, 14], group: 'archers' }, { class: 'pellian_archer', id: 'b2', at: [39.5, 15], group: 'archers' }, { class: 'pellian_archer', id: 'b3', at: [36, 21.5], group: 'archers' },
    { class: 'pellian_archer', id: 'b4', at: [40, 21], group: 'archers' }, { class: 'pellian', id: 'b5', at: [35.5, 18], group: 'archers', yaw: Math.PI / 2 }, { class: 'pellian_archer', id: 'b8', at: [39, 13.5], group: 'archers' },
    { class: 'pellian_archer', id: 'p4', at: [25, 14], group: 'roof' }, { class: 'pellian', id: 'p2', at: [23, 19], group: 'roof', yaw: Math.PI / 2 }, { class: 'pellian_archer', id: 'a1', at: [8, 16], group: 'turret' }, { class: 'pellian_archer', id: 'a2', at: [8.5, 21.5], group: 'turret' },
    { class: 'arpello', id: 'ar', at: [47, 17], group: 'arpello', yaw: -Math.PI / 2 },
    { class: 'pellian', id: 'd1', at: [52.5, 22], group: 'stair', yaw: Math.PI }, { class: 'pellian', id: 'd2', at: [52.5, 25], group: 'stair', yaw: Math.PI },
    { class: 'pellian', id: 'd3', at: [55, 28], group: 'stair' }, { class: 'pellian', id: 'd4', at: [58, 30], group: 'stair' }, { class: 'pellian_archer', id: 'd5', at: [60, 28], group: 'stair' },
    { class: 'pellian', id: 'd6', at: [57, 28], group: 'stair' }, { class: 'pellian_archer', id: 'd7', at: [61, 31], group: 'stair' },
    { class: 'pellian', id: 'e1', at: [58, 19], group: 'lower', yaw: Math.PI }, { class: 'pellian', id: 'e2', at: [58.5, 16], group: 'lower', yaw: Math.PI }, { class: 'pellian_archer', id: 'e3', at: [57.5, 13.5], group: 'lower' },
    { class: 'pellian', id: 'h1', at: [57, 9], group: 'guard' }, { class: 'pellian', id: 'h2', at: [60, 8], group: 'guard' }, { class: 'pellian', id: 'h3', at: [55, 6], group: 'guard' },
    { class: 'pellian_archer', id: 'h4', at: [62, 4], group: 'guard' }, { class: 'pellian_archer', id: 'h5', at: [54, 3], group: 'guard' }, 
    { class: 'pellian_archer', id: 'h8', at: [56, 11], group: 'guard' },
    { class: 'pellian', id: 'h9', at: [58, 23], group: 'guard3', dormant: -1, yaw: Math.PI }, { class: 'pellian', id: 'h10', at: [59, 24], group: 'guard3', dormant: -1, yaw: Math.PI }, { class: 'pellian_archer', id: 'h11', at: [58.5, 25.5], group: 'guard3', dormant: -1, yaw: Math.PI },
    { class: 'pellian', id: 'd8', at: [63.2, 3], group: 'stair3', dormant: -1 }, { class: 'pellian', id: 'd9', at: [63.4, 6.5], group: 'stair3', dormant: -1 }, { class: 'pellian', id: 'd10', at: [53.6, 4.5], group: 'stair3', dormant: -1 }, { class: 'pellian_archer', id: 'd11', at: [53.6, 7.5], group: 'stair3', dormant: -1 }, { class: 'pellian', id: 'd12', at: [58, 32], group: 'stair' },
    { class: 'pellian', id: 'h12', at: [57.6, 22.4], group: 'guard3', dormant: -1, yaw: Math.PI }, { class: 'pellian', id: 'h13', at: [59.3, 22.2], group: 'guard3', dormant: -1, yaw: Math.PI }, { class: 'pellian', id: 'h14', at: [58, 24.8], group: 'guard3', dormant: -1, yaw: Math.PI },
    
    { class: 'trigger_exit', rect: [53, 0, 55, 1.6] },
  ],
  beats: [
    { id: 'arpello', at: 'crown', after: 1.5, wake: ['arpello'], lines: [['Arpello stands transfixed; then with a cry he draws and leaps at you.', 'warn']] },
    { id: 'hurl', killed: 'arpello', hurl: 'ar', sets: 'arpello_hurled', rout: { archers: [37.5, 12.4], roof: [21, 23.6], turret: [5, 22.5] },
      lines: [['With a lion-like roar you parry the whistling blade, then drop your own sword, grip the prince by crotch and neck, and heave him high above your head.', 'good'],
        ['"Take your plots to hell with you!" Like a sack of salt you hurl the prince of Pellia far out, to fall through empty space for a hundred and fifty feet. The people give back as the body comes hurtling down to smash on the marble pave.', 'voice'],
        ['The archers on the tower shrink back, their nerve broken, and flee; the beleaguered councilmen sally from the palace and hew into them with joyous abandon. In the streets the fighting mills and eddies, and over all rises the roar of the mob.', 'good'],
        ['And high above all, half naked on the dizzy battlements, you rock and sway, mighty arms brandished, roaring with gargantuan laughter that mocks all mobs and princes, even yourself.', 'voice']] },
    { id: 'laugh', needs: ['arpello_hurled'], quiet: true, sets: 'laughed', lines: [['Arpello\'s household guard still hold the tower stair and the gate-tower below, not knowing yet that he is dead. Down, and send a swift rider after Trocero of Poitain to bring him back.', 'warn']] },
    { id: 'stair', at: 'tstair', needs: ['laughed'], wake: ['stair'] },
    { id: 'stair3', killed: 'stair', wake: ['stair3'], lines: [['Shouts from below: the guard in the gate-tower has heard, and sends men up the lower stair.', 'warn']] },
    { id: 'stair2', killed: 'stair3', sets: 'stair_cleared', lines: [['The Pellians in the hall are down. Below, through the arrow-slits, the mob is battering at the gate-tower.', 'good']] },
    { id: 'lower', at: 'lstair', wake: ['lower'], lines: [['Arpello\'s household guard hold the lower stair against the mob. They do not know yet that he is dead.', 'warn']] },
    { id: 'guard', at: 'guardroom', wake: ['guard'] },
    { id: 'guard3', killed: 'guard', wake: ['guard3'], lines: [['Boots on the stair below the guardroom: more of Arpello\'s household, come up from the gate.', 'warn']] },
    { id: 'guard2', killed: 'guard3', needs: ['stair_cleared'], sets: 'guard_broken', lines: [['The last of the Pellians break and run, down into the arms of the mob.', 'good'], ['In the street below the people of Tamar are roaring the king\'s name. The postern stands open.', 'good']] },
  ],
  puzzle: {
    flags: ['arpello_hurled', 'laughed', 'stair_cleared', 'guard_broken'],
    actions: [
      { id: 'hurl_arpello', needs: [], sets: 'arpello_hurled', at: 'crown' }, { id: 'laugh', needs: ['arpello_hurled'], sets: 'laughed', at: 'crown' },
      { id: 'drive_them_down', needs: ['laughed'], sets: 'stair_cleared', at: 'thall' },
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
// e1m7's siege lines (cells): the bank's two breastworks (x 39 and 41) and the walk between them (x 40); the north tower against
// its near side (x 33-38, z 8-13), the south tower against its far side (x 42-47, z 28-33). Each tower is a shell of timber and
// hides round a solid core, and a stair of single-cell steps runs round three sides of the core inside it.
function siegeLines() {
  const BANK = { floor: 'TURF', wall: 'MUD', ceil: 'SUNSET' }, HIDES = { floor: 'PLANK', wall: 'BULLHIDE', ceil: 'BULLHIDE' }, WALK = { floor: 'PLANK', wall: 'MUD', ceil: 'SUNSET' };
  const IN = { floor: 'PLANK', wall: 'PLANK', ceil: 'PLANK' };
  const R = [
    { id: 'bankW', solid: true, at: [39, 4], size: [1, 36], top: 7.2, tex: BANK }, { id: 'bankE', solid: true, at: [41, 4], size: [1, 36], top: 7.2, tex: BANK },
    { id: 'bankN', solid: true, at: [40, 4], size: [1, 2], top: 7.2, tex: BANK }, { id: 'bankS', solid: true, at: [40, 37], size: [1, 3], top: 7.2, tex: BANK },
    { id: 'walk', name: 'the wall-walk of the siege lines', at: [40, 6], size: [1, 31], floor: 6, sky: true, style: 'hewn', tex: WALK, noscatter: true },
    { id: 'towerN', solid: true, at: [33, 8], size: [6, 6], top: 12, tex: HIDES }, { id: 'towerS', solid: true, at: [41, 28], size: [6, 6], top: 12, tex: HIDES },
  ];
  const step = (id, name, x, z, fl) => R.push({ id, name, at: [x, z], size: [1, 1], floor: fl, h: 1.4, style: 'hewn', tex: IN, noscatter: true });
  // the north tower: in at the foot of its west face, up round the core, out at the top onto the walk
  step('ndoor', 'the door of a siege tower', 33, 9, 0.1);
  [[34, 9], [34, 10], [34, 11], [34, 12], [35, 12], [36, 12], [37, 12], [37, 11], [37, 10]].forEach(([x, z], k) => step('ns' + k, 'the stair inside the siege tower', x, z, 0.2 + 0.75 * k));
  step('ntop', 'the top of the siege tower', 38, 10, 6.15);
  R.push({ id: 'nout', name: 'the wall-walk of the siege lines', at: [39, 10], size: [1, 1], floor: 6, sky: true, style: 'hewn', tex: WALK, noscatter: true });
  // the south tower, built out from the bank's far face (a lane left between it and the spearmen's stakes): in from the walk at
  // its top, down round the core, out at the foot of its north face behind the lines
  step('stop', 'the top of the second siege tower', 41, 30, 6.15);
  [[42, 30], [42, 31], [42, 32], [43, 32], [44, 32], [45, 32], [45, 31], [45, 30], [45, 29]].forEach(([x, z], k) => step('ss' + k, 'the stair inside the second siege tower', x, z, 6.2 - 0.75 * k));
  step('sdoor', 'the door of the second siege tower', 45, 28, 0.1);
  return R;
}
const SIEGE_N = ['ndoor', 'ns0', 'ns1', 'ns2', 'ns3', 'ns4', 'ns5', 'ns6', 'ns7', 'ns8', 'ntop'], SIEGE_S = ['stop', 'ss0', 'ss1', 'ss2', 'ss3', 'ss4', 'ss5', 'ss6', 'ss7', 'ss8', 'sdoor'];
const MEADOW = { floor: 'TURF', wall: 'MUD', ceil: 'SUNSET' };
const LEVEL_E1M7 = {
  level: 'e1m7', next: 'e1m8', title: 'The Relief of Shamar', ramps: ['earth', 'night', 'scarlet'], grid: [96, 44], arms: 'sword',
  squads: ['palace', 'guards', 'press', 'spears'],   // men who fight as one: they ring you, and never more than two blows in the air at once (combat.js squadChase)
  ambient: [0.34, 0.24, 0.16], haze: [0.5, 0.32, 0.2], open: true, fog: 0.008, sun: [0.6, 0.35, -0.4],
  intro: [['THE RELIEF OF SHAMAR', 'title'], ['"It is King Conan!" Strabonus shrieks it, paling; Tsotha squalls that you have been in Satha\'s belly for days.', 'voice'],
    ['Beside you stand Count Trocero of Poitain, whom your rider brought back to you, and his captain Prospero, on foot with the knights of Poitain. On the ridge behind you the stolid Bossonians nock and draw; the Gundermen level their pikes. Down onto the plain!', '']],
  objectives: [['ridge_down', 'Down off the ridge.'], ['shemites_broken', 'Break the Shemite archers.'],
    ['spears_broken', 'The Kothian spearmen, with the Gunderman pikes beside you.'], ['press_through', 'Find the gap through the press of knights.'], ['guards_down', 'Cut through his palace troops.'], ['strabonus_dead', 'Strabonus.'], ['zz', 'The host breaks: east along the road between the camp-fires, after it to the river.']],
  exitNeeds: 'strabonus_dead', postBreak: 'strabonus_dead', routTo: [95.3, 22],
  // on the ridge, facing the enemy (+x): the Bossonian archers loosing over your head, the Gunderman pikes in reserve behind them
  allies: [{ id: 'bossonian', at: [8, 13], n: 18, cols: 3, step: 1.6, yaw: Math.PI / 2, loose: true }, { id: 'gunderman', at: [4, 26], n: 12, cols: 3, step: 1.5, yaw: Math.PI / 2, fight: ['shemites2', 'spears', 'press'] }],
  areas: [
    { id: 'ridge', type: 'action', name: 'The Ridge', rooms: ['ridge'], cp: [4.5, 21.5, -Math.PI / 2] },
    { id: 'towers', type: 'puzzle', name: 'The Siege Lines', rooms: ['field', ...SIEGE_N], cp: [32, 12, -Math.PI / 2] },
    { id: 'walk', type: 'action', name: 'The Wall-Walk', rooms: ['walk', 'nout'], cp: [40.5, 10.5, Math.PI] },
    { id: 'towers2', type: 'puzzle', name: 'The Second Tower', rooms: SIEGE_S, cp: [41.5, 30.5, -Math.PI / 2] },
    { id: 'shemites', type: 'action', name: 'The Shemite Archers', rooms: ['line1'], cp: [20, 22, -Math.PI / 2] },
    { id: 'spears', type: 'action', name: 'The Kothian Spearmen', rooms: ['line2'], cp: [50, 22, -Math.PI / 2] },
    { id: 'press', type: 'puzzle', name: 'The Press of Knights', rooms: ['press'], cp: [63, 22, -Math.PI / 2] },
    { id: 'strabonus', type: 'action', name: 'Strabonus', rooms: ['palace'], cp: [77, 22, -Math.PI / 2] },
  ],
  rooms: [
    { id: 'rim', name: 'the plain before Shamar', at: [0, 0], size: [96, 44], nopass: true, sky: true, tex: MEADOW },
    { id: 'ridge', name: 'the ridge', at: [3, 4], size: [12, 36], floor: 3.2, rise: -0.25, sky: true, tex: MEADOW },
    { id: 'line1', name: 'the Shemite line', at: [15, 4], size: [16, 36], sky: true, tex: MEADOW },
    // the siege lines of Koth across the plain: an earthen bank faced with timber, a wall-walk along its top between two breastworks,
    // and the siege towers, hung with raw bull-hides, built into it. No way over but up through a tower, along the walk, and down through the other.
    { id: 'field', name: 'before the siege lines of Koth', at: [31, 4], size: [8, 36], sky: true, tex: MEADOW },
    { id: 'behind', name: 'behind the siege lines', at: [42, 4], size: [5, 36], sky: true, tex: MEADOW },
    { id: 'line2', name: 'the Kothian spearmen', at: [47, 4], size: [12, 36], sky: true, tex: MEADOW },
    { id: 'press', name: 'the press of knights', at: [59, 4], size: [14, 36], sky: true, tex: MEADOW },
    { id: 'palace', name: 'Strabonus\'s palace troops', at: [73, 4], size: [18, 36], sky: true, tex: MEADOW },
    { id: 'road', name: 'the road east, to the river', at: [89, 19], size: [7, 6], sky: true, tex: { floor: 'MUD', wall: 'MUD', ceil: 'SUNSET' } },
    ...siegeLines(),
  ],
  boulders: [{ from: [2.5, 3], to: [2.5, 41], r: [1.6, 3.2] }, { from: [3, 41.2], to: [92, 41.2], r: [1.6, 3.4], jitter: 2 }, { from: [92.5, 3], to: [92.5, 17.5], r: [1.8, 3.6] }, { from: [92.5, 26.5], to: [92.5, 41], r: [1.8, 3.6] },   // a gap: the road east, to the river
    { from: [3, 2.8], to: [30, 2.8], r: [1.4, 3], jitter: 1.5 }, { from: [48, 2.8], to: [92, 2.8], r: [1.4, 3], jitter: 1.5 },
    // drawn only, on ground already barred: the stretch before the siege lines, the road's flanks, the holes in the southern line
    { from: [16.5, 2.8], to: [49, 2.8], r: [2.1, 3.0], jitter: 0.6, deco: true }, { from: [90, 17.9], to: [96, 17.9], r: [1.8, 2.6], deco: true }, { from: [90.5, 25.4], to: [96, 25.4], r: [1.4, 2.4], deco: true },
    { from: [4, 40.7], to: [14.5, 40.7], r: [1.3, 2.2], deco: true }, { from: [78.5, 40.7], to: [82, 40.7], r: [1.3, 2.2], deco: true }],
  scatter: [{ prefab: 'fallen', n: 60, rect: [14, 5, 76, 34] }, { prefab: 'standard', n: 10, rect: [16, 6, 72, 32] },
    // drawn only: the Bossonian shafts that went over your head into the Shemites, the wreck of the lines, the trodden grass
    { prefab: 'arrows', n: 120, rect: [15, 5, 18, 34], from: -Math.PI / 2 }, { prefab: 'arrows', n: 40, rect: [47, 5, 30, 34], from: -Math.PI / 2 },
    { prefab: 'lance', n: 50, rect: [44, 5, 46, 34] }, { prefab: 'shieldfall', n: 50, rect: [15, 5, 75, 34] }, { prefab: 'mound', n: 10, rect: [47, 6, 40, 32] },
    { prefab: 'tufts', n: 700, rect: [3, 4, 89, 37] }],
  city: { at: [48, -52], seed: 5, n: 160, r0: 0, r1: 70, ground: -1, wall: 80, wallH: 8, tall: 2.2, towers: 0.3 },   // Shamar on the Tybor, its walls and towers against the north
  shafts: [], links: [], features: [],
  lights: [{ at: [35.5, 11], y: 2.6, col: [1.0, 0.62, 0.3], rad: 9, i: 1.3 }, { at: [43.5, 32.5], y: 2.6, col: [1.0, 0.62, 0.3], rad: 9, i: 1.3 }],   // a lantern on each tower's stair
  props: [
    // "burning the pavilions": the lords' tents of the host pitched behind Strabonus's palace troops, and their fires
    { prefab: 'pavilion', at: [80, 6.5], rot: 0 }, { prefab: 'pavilion', at: [88, 6.8], rot: 0.4, cloth: 'velvet' }, { prefab: 'pavilion', at: [80, 37.5], rot: 3.1, cloth: 'velvet' }, { prefab: 'pavilion', at: [88.5, 37.2], rot: 2.8 },
    { prefab: 'campfire', at: [84, 9.2] }, { prefab: 'campfire', at: [84, 34.8] },
    { prefab: 'brazier', at: [89.5, 18.2] }, { prefab: 'brazier', at: [89.5, 25.8] }, { prefab: 'standard', at: [91, 18.8] }, { prefab: 'standard', at: [91.5, 25.2] }, { prefab: 'standard', at: [93.5, 19.5] }],   // the camp-fires of Koth burning at the road's mouth
  items: [{ kind: 'wine', name: 'a dead knight\'s wine-flask', heal: 40, at: [71.5, 20.5] }, { kind: 'bread', name: 'bread from a Kothian saddle-bag', heal: 35, at: [71.5, 24] },
    { kind: 'wine', name: 'a Shemite\'s wine-skin', heal: 35, at: [25, 12] }, { kind: 'bread', name: 'a Shemite\'s barley-cake', heal: 30, at: [26, 33] }, { kind: 'wine', name: 'a captain\'s wine-flask', heal: 40, at: [75.2, 30] }, { kind: 'wine', name: 'a palace-guard\'s wine-skin', heal: 35, at: [74.5, 21] }, { kind: 'bread', name: 'a palace-guard\'s bread', heal: 30, at: [77, 26] },
    { kind: 'bread', name: 'a Shemite\'s barley-cake', heal: 30, at: [19, 17] }, { kind: 'wine', name: 'a Shemite\'s wine-skin', heal: 35, at: [21, 27] }, { kind: 'wine', name: 'a dead knight\'s wine-skin', heal: 35, at: [28, 22] },
    { kind: 'bread', name: 'a Bossonian\'s bread', heal: 30, at: [32, 19] }, { kind: 'wine', name: 'a pikeman\'s wine-skin', heal: 35, at: [34, 38] },
    { kind: 'wine', name: 'a dead knight\'s wine-skin', heal: 35, at: [57, 14] }, { kind: 'bread', name: 'a camp loaf', heal: 30, at: [71.6, 28.5] }, { kind: 'wine', name: 'a wine-skin', heal: 35, at: [75, 12] },
    { kind: 'wine', name: 'a Gunderman\'s wine-skin', heal: 35, at: [56, 19] }, { kind: 'bread', name: 'a Gunderman\'s bread', heal: 30, at: [56, 25] }, { kind: 'wine', name: 'a dead knight\'s wine-skin', heal: 35, at: [69, 19.5] }, { kind: 'bread', name: 'a knight\'s saddle-bread', heal: 30, at: [69, 24.5] },
    { kind: 'bread', name: 'a tower-guard\'s bread', heal: 30, at: [37.5, 11.5] }, { kind: 'wine', name: 'a sentry\'s wine-skin', heal: 35, at: [40.5, 19] }, { kind: 'bread', name: 'a sentry\'s bread', heal: 30, at: [40.5, 28] },
    { kind: 'wine', name: 'a dead pikeman\'s wine-skin', heal: 35, at: [43.5, 25.5] }, { kind: 'bread', name: 'a Kothian\'s barley-loaf', heal: 30, at: [45.5, 14] },
    { kind: 'wine', potion: 'balm', name: 'a surgeon\'s pot of wound-balm', heal: 20, at: [28.4, 22.3] }, { kind: 'wine', potion: 'xuthal', name: 'a flask of the golden wine of Xuthal', heal: 100, at: [71.9, 20.8] },
  ],
  // the siege lines of Koth: banks of stakes before the spearmen and round the king's own troops, with gaps to sally through; stake-pits in the press
  stakes: [{ from: [48, 5], to: [48, 19], face: -Math.PI / 2 }, { from: [48, 25], to: [48, 39], face: -Math.PI / 2 }, { from: [73, 5], to: [73, 18], face: -Math.PI / 2 }, { from: [73, 26], to: [73, 39], face: -Math.PI / 2 },
    // the Shemites' line: curving banks on its flanks, so the way in bends toward its centre
    { pts: [[18, 6], [22, 9], [24, 13]], face: -Math.PI / 2 }, { pts: [[24, 31], [22, 35], [18, 38]], face: -Math.PI / 2 },
    // in the press of knights, banks thrown up in a crescent and a hook
    { pts: [[62, 6], [65, 9], [66, 14], [65, 17]], face: -Math.PI / 2 }, { pts: [[65, 27], [66, 31], [64, 36], [61, 38]], face: -Math.PI / 2 }],
  lilia: [[61, 12], [64, 31], [68, 15], [66, 34], [70, 28], [62, 36], [69, 8]],
  entities: [
    { class: 'info_player_start', at: [4.5, 21.5], yaw: -Math.PI / 2 },   // at the back of the ridge, behind your own archers
    { class: 'archer', id: 'a1', at: [22, 12], group: 'shemites' }, { class: 'archer', id: 'a2', at: [24, 18], group: 'shemites' }, { class: 'archer', id: 'a3', at: [23, 26], group: 'shemites' },
    { class: 'archer', id: 'a4', at: [25, 32], group: 'shemites' }, { class: 'spearman', id: 'a5', at: [20, 20], group: 'shemites', yaw: Math.PI / 2 }, { class: 'spearman', id: 'a6', at: [20, 25], group: 'shemites', yaw: Math.PI / 2 },
    { class: 'spearman', id: 'a7', at: [21, 30], group: 'shemites', yaw: Math.PI / 2 },
    { class: 'archer', id: 'm1', at: [28, 9], group: 'shemites2' }, { class: 'archer', id: 'm2', at: [29, 16], group: 'shemites2' }, { class: 'spearman', id: 'm3', at: [27, 22], group: 'shemites2', yaw: Math.PI / 2 },
    { class: 'archer', id: 'm4', at: [29, 29], group: 'shemites2' }, { class: 'spearman', id: 'm5', at: [27, 35], group: 'shemites2', yaw: Math.PI / 2 }, { class: 'spearman', id: 'm6', at: [26, 13], group: 'shemites2', yaw: Math.PI / 2 },
    { class: 'archer', id: 'm7', at: [29.5, 37], group: 'shemites2' },
    // the siege lines: men at the foot of the north tower and on its stair, on the wall-walk, and in the south tower and behind it
    { class: 'spearman', id: 'tg1', at: [32, 6.5], group: 'tower' }, { class: 'spearman', id: 'tg2', at: [36, 16], group: 'tower' }, { class: 'archer', id: 'tg3', at: [32, 18], group: 'tower' },
    { class: 'spearman', id: 'tg4', at: [37.5, 12.5], group: 'tower', yaw: -Math.PI / 2 },
    { class: 'spearman', id: 'w1', at: [40.5, 16], group: 'wall', yaw: Math.PI }, { class: 'archer', id: 'w2', at: [40.5, 22], group: 'wall', yaw: Math.PI }, { class: 'spearman', id: 'w3', at: [40.5, 26], group: 'wall', yaw: Math.PI },
    { class: 'archer', id: 'w4', at: [40.5, 35.5], group: 'wall', yaw: Math.PI },
    { class: 'spearman', id: 'u1', at: [43.5, 32.5], group: 'tower2', yaw: -Math.PI / 2 }, { class: 'kknight', id: 'u2', at: [44.5, 22], group: 'behind' }, { class: 'archer', id: 'u3', at: [44.5, 37], group: 'behind' }, { class: 'spearman', id: 'u4', at: [45.5, 18], group: 'behind' },
    { class: 'spearman', id: 's1', at: [52, 14], group: 'spears', yaw: Math.PI / 2 }, { class: 'spearman', id: 's2', at: [52, 19], group: 'spears', yaw: Math.PI / 2 }, { class: 'spearman', id: 's3', at: [52, 24], group: 'spears', yaw: Math.PI / 2 },
    { class: 'spearman', id: 's4', at: [53, 29], group: 'spears', yaw: Math.PI / 2 }, { class: 'spearman', id: 's5', at: [55, 17], group: 'spears', yaw: Math.PI / 2 }, { class: 'spearman', id: 's6', at: [55, 26], group: 'spears', yaw: Math.PI / 2 },
    { class: 'kknight', id: 'k1', at: [63, 16], group: 'press', yaw: Math.PI / 2 }, { class: 'oknight', id: 'k2', at: [64, 21], group: 'press', yaw: Math.PI / 2 }, { class: 'kknight', id: 'k3', at: [63, 26], group: 'press', yaw: Math.PI / 2 },
    { class: 'oknight', id: 'k4', at: [67, 19], group: 'press', yaw: Math.PI / 2 }, { class: 'kknight', id: 'k5', at: [67, 24], group: 'press', yaw: Math.PI / 2 }, { class: 'oknight', id: 'k6', at: [70, 22], group: 'press', yaw: Math.PI / 2 },
    { class: 'kknight', id: 'k7', at: [62, 10], group: 'press', yaw: Math.PI / 2 }, { class: 'oknight', id: 'k8', at: [62, 34], group: 'press', yaw: Math.PI / 2 },
    { class: 'kknight', id: 'k9', at: [70, 13], group: 'press', yaw: Math.PI / 2 }, { class: 'oknight', id: 'k10', at: [70, 31], group: 'press', yaw: Math.PI / 2 },
    { class: 'strabonus', id: 'st', at: [84, 22], group: 'palace', post: true, yaw: Math.PI / 2 }, { class: 'kknight', id: 'p1', at: [79, 18], group: 'palace', post: true, yaw: Math.PI / 2 }, { class: 'kknight', id: 'p2', at: [79, 26], group: 'palace', post: true, yaw: Math.PI / 2 },
    { class: 'spearman', id: 'p3', at: [82, 15], group: 'palace', post: true }, { class: 'spearman', id: 'p4', at: [82, 29], group: 'palace', post: true },
    { class: 'kknight', id: 'p5', at: [77, 12], group: 'guards' }, { class: 'archer', id: 'p6', at: [86, 10], group: 'guards' }, { class: 'kknight', id: 'p7', at: [77, 32], group: 'guards' },
    { class: 'archer', id: 'p8', at: [86, 34], group: 'guards' }, { class: 'spearman', id: 'p9', at: [80, 22], group: 'guards' }, { class: 'oknight', id: 'p10', at: [75, 25], group: 'guards' },
    // the road east is held: a rank of his household across its mouth, standing their ground; they run when he falls
    { class: 'kknight', id: 'g1', at: [90.4, 19.6], group: 'gate', yaw: -Math.PI / 2, post: true }, { class: 'spearman', id: 'g2', at: [90.6, 20.8], group: 'gate', yaw: -Math.PI / 2, post: true },
    { class: 'oknight', id: 'g3', at: [90.4, 22], group: 'gate', yaw: -Math.PI / 2, post: true }, { class: 'spearman', id: 'g4', at: [90.6, 23.2], group: 'gate', yaw: -Math.PI / 2, post: true },
    { class: 'kknight', id: 'g5', at: [90.4, 24.4], group: 'gate', yaw: -Math.PI / 2, post: true },
    { class: 'trigger_exit', rect: [92, 19, 95, 25] },
  ],
  beats: [
    { id: 'side', at: 'ridge', act: { trocero: { escort: { side: -3.0, back: 1.5 } }, prospero: { escort: { side: 3.0, back: 1.5 } } } },   // they keep at the king's side
    { id: 'down', at: 'line1', sets: 'ridge_down', wake: ['shemites'], lines: [['The Bossonians loose over your head: "the cord to the nock, shaft to the ear, the king of Koth for a mark!"', 'dim']] },
    { id: 'tower', at: ['field', ...SIEGE_N], wake: ['tower'], lines: [['The siege lines of Koth run across the plain: an earth bank faced with timber, and the siege towers built into it, hung with raw bull-hides. "The men on the battle-towers can mask any sorties."', ''], ['No way over the bank but up through a tower, along the wall-walk, and down through the other.', 'warn']] },
    { id: 'hold', at: SIEGE_N, act: { trocero: { escort: null, to: [31.5, 10.5], sp: 3 }, prospero: { escort: null, to: [31.5, 12.5], sp: 3 } }, lines: [['Trocero and Prospero hold the tower\'s foot with the knights, to bring them round when the lines are broken.', 'dim']] },
    { id: 'wall', at: ['ntop', 'nout', 'walk'], wake: ['wall'] },
    { id: 'tower2', at: SIEGE_S, wake: ['tower2'] },
    { id: 'behind', at: ['ss8', 'sdoor', 'behind'], wake: ['behind'] },
    { id: 'gunder', at: ['ss4', 'ss5', 'ss6', 'ss7', 'ss8', 'sdoor', 'behind'], alliesTo: [44.5, 36.5] },
    { id: 'over', at: 'behind', sets: 'over_lines', act: { trocero: { at: [43, 22], escort: { side: -3.0, back: 1.5 } }, prospero: { at: [45.5, 21], escort: { side: 3.0, back: 1.5 } } },
      lines: [['Out at the tower\'s foot, behind the lines. The Gundermen come through the tower after you, and Trocero and Prospero have brought the knights round the end of the bank.', 'good']] },
    { id: 'shem', killed: 'shemites', wake: ['shemites2'], lines: [['The first rank of Shemites breaks; behind it their second line nocks and draws.', 'warn']] },
    { id: 'shem2', killed: 'shemites2', sets: 'shemites_broken', lines: [['The Shemite line breaks and runs.', 'good']] },
    { id: 'spears', at: 'line2', wake: ['spears'], lines: [['The Kothian spearmen; and beside you, the Gundermen, "the purest blood of all the Hyborian peoples," whom no infantry can match.', '']] },
    { id: 'spears2', killed: 'spears', sets: 'spears_broken' },
    { id: 'press', at: 'press', needs: ['spears_broken'], wake: ['press'], lines: [['The press of knights mills in confusion. Cut a gap through it, as the charge did.', 'warn']] },
    { id: 'press2', killed: 'press', sets: 'press_through' },
    { id: 'guards', at: 'palace', needs: ['press_through'], wake: ['guards'], lines: [['The palace troops of Koth close round their king: picked men, in gilded mail.', 'warn']] },
    { id: 'strab', at: 'palace', needs: ['guards_down'], wake: ['palace'], kill: ['p3', 'p4'], act: { trocero: { escort: null, to: [81, 16], sp: 7 }, prospero: { escort: null, to: [81, 28], sp: 7 } }, lines: [['Trocero and his house troops, hewing desperately, cut their way to your side: the spearmen on Strabonus\'s flanks go down under the Poitanian swords.', 'good'], ['Strabonus among his palace troops, his axe up. "It clanged on Conan\'s helmet."', 'warn']] },
    { id: 'guards2', killed: 'guards', sets: 'guards_down' },
    { id: 'strab2', killed: 'palace', sets: 'strabonus_dead', act: { trocero: { escort: null, to: [80, 20], sp: 6 }, prospero: { escort: null, to: [82, 24], sp: 6 } }, lines: [['Strabonus goes down beneath the five-foot blade, his skull crushed, and the great banner of Koth goes down with him.', 'good'],
      ['Then behind the dazed and stricken invaders goes up a mighty clamour and the blaze of a huge conflagration: the defenders of Shamar have made a desperate sortie, cut down the men in the siege towers, and are burning the pavilions and the siege engines.', 'good'],
      ['Amalrus goes down dying, "his shoulder-bone hewn in twain by Prospero\'s two-handed sword." The host breaks, and runs for the river.', 'good'], ['The rank holding the road east throws down its spears and runs.', 'good'], ['East, between the camp-fires, the road to the Tybor. After them!', 'warn']] },
  ],
  // Trocero and Prospero at the king's side: "I see Trocero and his captain Prospero"
  actors: [{ id: 'trocero', at: [5, 19.5], yaw: Math.PI / 2, pose: 'stand' }, { id: 'prospero', at: [5, 24.5], yaw: Math.PI / 2, pose: 'stand' }],
  allyHold: { x: 31.5, until: 'over_lines' },          // the Gundermen keep this side of the siege lines till you are over
  puzzle: {
    flags: ['ridge_down', 'shemites_broken', 'spears_broken', 'press_through', 'guards_down', 'strabonus_dead'],
    actions: [
      { id: 'come_down', needs: [], sets: 'ridge_down', at: 'line1' },
      { id: 'break_the_shemites', needs: ['ridge_down'], sets: 'shemites_broken', at: 'line1' }, { id: 'break_the_spears', needs: ['shemites_broken'], sets: 'spears_broken', at: 'line2' },
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
  squads: ['camp', 'rear', 'rout', 'far', 'bay'],                // five or six men who fight as one (combat.js squadChase)
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
    { from: [92.5, 3], to: [92.5, 37], r: [1.8, 3.6] }, { from: [3, 2.8], to: [30, 2.8], r: [1.4, 3] }, { from: [54, 2.8], to: [92, 2.8], r: [1.4, 3] },
    // drawn only, on ground already barred: between the meadow and the reed-beds, and two holes
    { from: [65.5, 38.2], to: [81, 38.2], r: [2.4, 3.4], jitter: 0.8, deco: true }, { from: [65.5, 36.6], to: [81, 36.6], r: [1.6, 2.6], jitter: 0.8, deco: true }, { from: [66.2, 39.3], to: [80, 39.3], r: [1.3, 2.0], jitter: 0.5, deco: true }, { from: [85, 36.7], to: [88, 36.7], r: [1.3, 2], deco: true }, { from: [18.5, 2.6], to: [22, 2.6], r: [1.3, 2], deco: true }],
  scatter: [{ prefab: 'fallen', n: 40, rect: [4, 5, 25, 30] }, { prefab: 'standard', n: 9, rect: [5, 38, 22, 20] }, { prefab: 'fallen', n: 30, rect: [4, 37, 25, 22] }, { prefab: 'deadhorse', n: 6, rect: [5, 38, 22, 20] }, { prefab: 'deadhorse', n: 8, rect: [5, 6, 22, 28] }, { prefab: 'fallen', n: 14, rect: [55, 5, 10, 30] },
    // drawn only: the reed-beds along both banks and where the fugitives hid; the shafts and broken lances of the rout; trodden grass
    { prefab: 'reeds', n: 60, rect: [66, 40, 14, 20] }, { prefab: 'reeds', n: 30, rect: [27.5, 4, 2.5, 56] }, { prefab: 'reeds', n: 30, rect: [54, 4, 2.5, 56] },
    { prefab: 'arrows', n: 50, rect: [4, 5, 25, 55], from: Math.PI }, { prefab: 'lance', n: 30, rect: [4, 5, 25, 55] }, { prefab: 'shieldfall', n: 40, rect: [4, 5, 25, 55] },
    { prefab: 'tufts', n: 500, rect: [3, 4, 89, 57] }],
  city: { at: [12, -70], seed: 5, n: 160, r0: 0, r1: 70, ground: -1, wall: 80, wallH: 8, tall: 2.2, towers: 0.3 },   // Shamar, upstream on the Tybor
  shafts: [], links: [], features: [], lights: [], props: [
    // the camp of Koth by the river: the tents, cut loose and half struck, and the fires still burning
    { prefab: 'pavilion', at: [4.6, 44.5], rot: 1.6 }, { prefab: 'pavilion', at: [4.6, 51.5], rot: 1.5, cloth: 'velvet' }, { prefab: 'pavilion', at: [14, 59.6], rot: 3.1 }, { prefab: 'pavilion', at: [22, 59.6], rot: 3.2, cloth: 'velvet' }, { prefab: 'pavilion', at: [28.4, 57], rot: -1.5 },
    { prefab: 'campfire', at: [12, 54.5] }, { prefab: 'campfire', at: [22, 55.5] }, { prefab: 'campfire', at: [7.5, 47.8] },
  ],
  items: [{ kind: 'bread', name: 'a dead man\'s ration', heal: 30, at: [16, 31] }, { kind: 'wine', name: 'a dead man\'s wine-skin', heal: 35, at: [20.5, 27.5] }, { kind: 'bread', name: 'a dead man\'s ration', heal: 30, at: [13, 26] },   // the rear-guard's ground
    { kind: 'wine', name: 'a knight\'s wine-skin', heal: 35, at: [62, 40] }, { kind: 'bread', name: 'a fugitive\'s bread', heal: 30, at: [72, 50] },
    { kind: 'wine', name: 'a Kothian captain\'s wine', heal: 40, at: [14, 50] }, { kind: 'bread', name: 'camp bread', heal: 30, at: [24, 42] },
    { kind: 'wine', name: 'a dead man\'s wine-skin', heal: 35, at: [18, 14] }, { kind: 'bread', name: 'a camp loaf', heal: 30, at: [26, 28] },
    { kind: 'wine', name: 'a fugitive\'s wine-skin', heal: 35, at: [60, 12] }, { kind: 'bread', name: 'a fugitive\'s bread', heal: 30, at: [64, 30] },
    { kind: 'wine', name: 'a wine-skin thrown down in the rout', heal: 35, at: [10.5, 29] }, { kind: 'bread', name: 'bread thrown down in the rout', heal: 30, at: [9.5, 21] },
    { kind: 'wine', potion: 'balm', name: 'a pot of wound-balm', heal: 20, at: [24.4, 42.3] }, { kind: 'wine', potion: 'xuthal', name: 'a flask of the golden wine of Xuthal', heal: 100, at: [62.4, 40.3] },
  ],
  // the Kothian camp by the river, fortified on its landward side: a bank of stakes with a gate, stake-pits before it
  stakes: [{ from: [3, 36], to: [8, 36], face: Math.PI }, { from: [13, 36], to: [29, 36], face: Math.PI },
    // the rout's own works: the camp's outer bank curls round the river bank, and on the meadow the fugitives' last stand
    { pts: [[8, 9], [12, 12], [14, 17], [13, 22]], face: Math.PI }, { pts: [[20, 8], [24, 12], [25, 16]], face: Math.PI },
    { pts: [[70, 8], [74, 12], [75, 18]], face: -Math.PI / 2 }, { pts: [[80, 30], [84, 27], [88, 28]], face: Math.PI }],
  lilia: [[6, 32], [16, 31], [21, 33], [26, 30], [18, 27]],
  entities: [
    // the rear-guard: six of Koth's men who turn and stand on the bank while the rest run for the bridge
    { class: 'kknight', id: 'r1', at: [18, 27], group: 'rear', yaw: Math.PI }, { class: 'spearman', id: 'r2', at: [20, 28], group: 'rear', yaw: Math.PI },
    { class: 'oknight', id: 'r3', at: [22, 27], group: 'rear', yaw: Math.PI }, { class: 'spearman', id: 'r4', at: [19, 30], group: 'rear', yaw: Math.PI },
    { class: 'kknight', id: 'r5', at: [21, 30.5], group: 'rear', yaw: Math.PI }, { class: 'oknight', id: 'r6', at: [23.5, 29.5], group: 'rear', yaw: Math.PI },
    { class: 'info_player_start', at: [8, 57], yaw: Math.PI },
    { class: 'kknight', id: 'c1', at: [10, 50], group: 'camp' }, { class: 'spearman', id: 'c2', at: [14, 47], group: 'camp' }, { class: 'archer', id: 'c3', at: [20, 52], group: 'camp' },
    { class: 'oknight', id: 'c4', at: [18, 44], group: 'camp' }, { class: 'spearman', id: 'c5', at: [8, 41], group: 'camp' }, { class: 'spearman', id: 'c6', at: [24, 46], group: 'camp' },
    { class: 'archer', id: 'c7', at: [26, 39], group: 'camp' }, { class: 'kknight', id: 'c8', at: [13, 38], group: 'camp' }, { class: 'oknight', id: 'c9', at: [22, 37], group: 'camp' },
    { class: 'spearman', id: 'q1', at: [12, 15], group: 'rout' }, { class: 'kknight', id: 'q2', at: [14, 24], group: 'rout' }, { class: 'archer', id: 'q3', at: [17, 10], group: 'rout' },
    { class: 'spearman', id: 'q4', at: [19, 20], group: 'rout' }, { class: 'oknight', id: 'q5', at: [23, 25], group: 'rout' }, { class: 'spearman', id: 'q6', at: [24, 16], group: 'rout' },
    { class: 'kknight', id: 'q7', at: [26, 22], group: 'rout' }, { class: 'archer', id: 'q8', at: [27, 30], group: 'rout' },
    { class: 'spearman', id: 'f1', at: [57, 15], group: 'far' }, { class: 'kknight', id: 'f2', at: [58, 22], group: 'far' }, { class: 'spearman', id: 'f3', at: [60, 27], group: 'far' },
    { class: 'archer', id: 'f4', at: [63, 12], group: 'far' }, { class: 'oknight', id: 'f5', at: [62, 20], group: 'far' }, { class: 'archer', id: 'f6', at: [64, 30], group: 'far' },
    { class: 'kknight', id: 'y1', at: [60, 44], group: 'bay' }, { class: 'spearman', id: 'y2', at: [63, 48], group: 'bay' }, { class: 'archer', id: 'y3', at: [70, 46], group: 'bay' },
    { class: 'oknight', id: 'y4', at: [74, 52], group: 'bay' }, { class: 'spearman', id: 'y5', at: [68, 55], group: 'bay' }, { class: 'kknight', id: 'y6', at: [58, 54], group: 'bay' },
    { class: 'archer', id: 'y7', at: [77, 44], group: 'bay' },
    { class: 'spearman', id: 'f7', at: [56, 8], group: 'far' }, { class: 'kknight', id: 'f8', at: [62, 33], group: 'far' }, { class: 'oknight', id: 'f9', at: [59, 25], group: 'far' },
    { class: 'kknight', id: 'y8', at: [75, 56], group: 'bay' }, { class: 'spearman', id: 'y9', at: [62, 57], group: 'bay' },
    { class: 'tsotha', id: 'ts', at: [84, 20], group: 'tsotha', yaw: Math.PI / 2 },
    { class: 'trigger_exit', rect: [86, 17, 90, 24] },
  ],
  beats: [
    { id: 'camp', at: 'bank_s', wake: ['camp'], lines: [['The camp of Koth by the river: men cutting loose horses, men dragging plunder to the water, and some who turn and fight.', 'warn']] },
    { id: 'camp2', killed: 'camp', sets: 'camp_done', lines: [['North, along the bank, to the barge bridge.', 'dim']] },
    { id: 'rout', at: 'bank', wake: ['rout', 'rear'] },
    { id: 'rout2', killed: 'rout', needs: ['camp_done'], sets: 'rout_done', lines: [['The fugitives ahead of you scatter along the bank. Out on the river the men of Shamar hack at the lashings of the barge bridge.', 'warn']] },
    { id: 'bridge', at: ['b1', 'b2'], lines: [['The barges lurch under you; the lashings part one by one. Leap, and do not stop!', 'warn']] },
    { id: 'crossed', at: 'far', sets: 'crossed', wake: ['far'], lines: [['Behind you the bridge breaks up, and the fugitives on it go down into the Tybor. On the far bank some who crossed ahead of you turn at bay.', 'warn']] },
    { id: 'far2', killed: 'far', lines: [['More of them downstream, in the reed-beds: knights who threw away their horses, and will sell their lives dear.', 'warn']] },
    { id: 'bay', killed: 'far', after: 4, wake: ['bay'] },
    { id: 'bay2', killed: 'bay', needs: ['crossed'], sets: 'bank_cleared', lines: [['The far bank is yours. Away to the east, a dust-cloud: the gaunt steed\'s track.', 'dim']] },
    { id: 'meadow', at: 'meadow', needs: ['bank_cleared'], after: 3, sets: 'tsotha_found', wake: ['tsotha'], sound: 'scream',
      lines: [['Across the sunset meadow, the gaunt steed\'s track. "In the sky appeared a dot, that grew into a huge eagle"; it drives at the head of Tsotha\'s steed, which screams and rears, throwing its rider.', 'warn'],
        ['Old Tsotha rises and faces you, his eyes those of a maddened serpent, his face an inhuman mask. In each hand he holds something that shimmers. You: "Again we meet, wizard!"', 'voice'],
        ['Tsotha: "Keep off! I\'ll blast the flesh from your bones! You can not conquer me: if you hack me in pieces, the bits of flesh and bone will reunite and haunt you to your doom! I see the hand of Pelias in this, but I defy ye both!"', 'voice']] },
    { id: 'dead', killed: 'tsotha', sets: 'tsotha_dead', lines: [['"I am Tsotha, son of—" Your sword shears through his lean neck before he can throw again. The head shoots from his shoulders on an arching fount of blood; yet the mad black eyes glare up at you with no dimming of their feral light, and the hands grope, as if searching for it.', 'good'],
      ['With a swift rush of wings the eagle swoops, snatches up the dripping head and soars skyward, and from its throat booms human laughter in the voice of Pelias. The headless body rears up from the sand and staggers away after it on stiffening legs, hands blindly outstretched, until it fades in the dusk that purples the meadows.', 'voice'],
      ['You: "Crom! A murrain on these wizardly feuds! Pelias has dealt well with me, but I care not if I see him no more. Give me a clean sword and a clean foe to flesh it in. Damnation! What would I not give for a flagon of wine!"', '']] },
    { id: 'end', needs: ['tsotha_dead'], quiet: true, after: 3, sets: 'the_end' },
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
    room: new Int8Array(N).fill(-1), top: new Float32Array(N), rough: new Float32Array(N).fill(1), vault: new Float32Array(N), tex: new Array(N), deep: new Uint8Array(N), void: new Uint8Array(N), spikes: new Uint8Array(N), ride: null, planks: [],
    rooms: spec.rooms, features: [], props: [], lights: [], flames: [], colliders: [], items: [], blockers: new Set(), corners: null,
  });
  spec.rooms.forEach((r, ri) => {
    const st = r.style === 'hewn';
    const tex = Object.assign(st ? { floor: 'FLAG', wall: 'HEWN', ceil: 'HEWN' } : { floor: 'ROCK', wall: 'ROCK', ceil: 'ROCK' }, r.tex || {});
    for (let j = 0; j < r.size[1]; j++) for (let i = 0; i < r.size[0]; i++) {
      const gx = r.at[0] + i, gz = r.at[1] + j, idx = gz * W + gx;
      if (r.solid) {                                     // solid: masonry, an earth bank, a tower's timbers: no floor at all, a body standing to r.top
        LV.kind[idx] = 0; LV.room[idx] = -1; LV.flags[idx] = 0; LV.top[idx] = r.top || 0; LV.tex[idx] = r.tex ? Object.assign({ floor: 'HEWN', wall: 'HEWN', ceil: 'HEWN' }, r.tex) : undefined;
        continue;
      }
      LV.top[idx] = 0;
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
  // field-works (README rule 1: how the battle is fought): banks of stakes that block and wound, and stake-pits ("lilies")
  //   stakes: [{ from: [x, z], to: [x, z], face: yaw }]  cells along an axis; the stakes point toward face
  //   lilia: [[x, z], ...]                               single cells: a pit 0.9 deep, a stake at the bottom
  const fort = [];
  //   stakes: [{ pts: [[x, z], ...], face: yaw }]        a curving bank through the points (Catmull-Rom); each stake-cell turns
  //                                                       to the curve, its stakes pointing to whichever side faces `face`
  for (const st of spec.stakes || []) {
    if (!st.pts) continue;
    const P = st.pts, seen = new Set(), fx = Math.sin(st.face || 0), fz = Math.cos(st.face || 0);
    const cr = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)];
      for (let t = 0; t <= 1; t += 0.05) {
        const x = cr(a[0], b[0], c[0], d[0], t), z = cr(a[1], b[1], c[1], d[1], t);
        const tx = cr(a[0], b[0], c[0], d[0], Math.min(1, t + 0.05)) - cr(a[0], b[0], c[0], d[0], Math.max(0, t - 0.05)), tz = cr(a[1], b[1], c[1], d[1], Math.min(1, t + 0.05)) - cr(a[1], b[1], c[1], d[1], Math.max(0, t - 0.05));
        const gx = Math.floor(x), gz = Math.floor(z), idx = cellIdx(gx, gz);
        if (idx < 0 || LV.kind[idx] !== 1 || seen.has(idx)) continue;
        seen.add(idx); LV.flags[idx] |= F_NOPASS | F_STAKE;
        let nx = tz, nz = -tx; if (nx * fx + nz * fz < 0) { nx = -nx; nz = -nz; }
        fort.push({ prefab: 'stakes', at: [gx + 0.5, gz + 0.5], rot: Math.atan2(nx, nz) });
      }
    }
  }
  for (const st of spec.stakes || []) {
    if (st.pts) continue;
    const [x0, z0] = st.from, [x1, z1] = st.to, n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    for (let k = 0; k <= n; k++) {
      const gx = Math.round(x0 + (x1 - x0) * k / (n || 1)), gz = Math.round(z0 + (z1 - z0) * k / (n || 1)), idx = cellIdx(gx, gz);
      if (idx < 0 || LV.kind[idx] !== 1) continue;
      LV.flags[idx] |= F_NOPASS | F_STAKE;
      fort.push({ prefab: 'stakes', at: [gx + 0.5, gz + 0.5], rot: st.face || 0 });
    }
  }
  if (spec.choke) { const [x0, z0, x1, z1] = spec.choke.rect; for (let gz = z0; gz < z1; gz++) for (let gx = x0; gx < x1; gx++) LV.flags[cellIdx(gx, gz)] |= F_NOPASS; }   // the fall of stones: solid until something heavy enough comes
  for (const [gx, gz] of spec.lilia || []) {
    const idx = cellIdx(gx, gz); if (idx < 0 || LV.kind[idx] !== 1) continue;
    LV.kind[idx] = 2; LV.floor[idx] -= 0.9; LV.deep[idx] = 1; LV.spikes[idx] = 1;   // monsters keep out of them
    fort.push({ prefab: 'stakepit', at: [gx + 0.5, gz + 0.5] });
  }
  for (const p of spec.props.concat(scatterProps(spec), fort)) {
    let [x, z] = W2(p.at[0], p.at[1]);
    if (HUNG.has(p.prefab) && p.wall) { const n = wallIn(p.wall), rc = wallRecess(p, n); x -= n[0] * rc; z -= n[1] * rc; }   // hung on the wall as it really stands, not on the grid line in front of it
    const prop = Object.assign({}, p, { x, z, y: p.level !== undefined ? p.level : propFloor(x + wallIn(p.wall)[0] * 0.6, z + wallIn(p.wall)[1] * 0.6) });
    LV.props.push(prop);
    if (p.prefab === 'torch') {
      const n = wallIn(p.wall);
      LV.lights.push({ x: x + n[0] * 0.9, y: prop.y + 2.6, z: z + n[1] * 0.9, r: 1.0, g: 0.6, b: 0.28, rad: 15 * Math.sqrt(p.dim || 1), i: 1.6 * (p.dim || 1) });
      LV.flames.push({ x: x + n[0] * 0.5, y: prop.y + 2.58, z: z + n[1] * 0.5, w: 0.36, h: 0.6 });
    } else if (p.prefab === 'brazier') {
      LV.lights.push({ x, y: prop.y + 1.6, z, r: 1.0, g: 0.55, b: 0.22, rad: 16 * Math.sqrt(p.dim || 1), i: 1.9 * (p.dim || 1) });
      LV.flames.push({ x, y: prop.y + 1.0, z, w: 0.95, h: 1.3 }, { x: x + 0.18, y: prop.y + 1.0, z: z - 0.12, w: 0.6, h: 0.9 });
      LV.colliders.push({ x, z, r: 0.75 });
    } else if (p.prefab === 'table') { LV.colliders.push({ x, z, r: 1.15 }); LV.flames.push({ x: x - 0.4, y: prop.y + 1.26, z: z + 0.15, w: 0.07, h: 0.15 }); }
    else if (p.prefab === 'candles') for (let k = 0; k < 4; k++) LV.flames.push({ x: x + Math.cos(k * 2.3) * 0.25, y: prop.y + 0.08 + (k % 3) * 0.06, z: z + Math.sin(k * 2.3) * 0.25, w: 0.05, h: 0.1 });
    else if (p.prefab === 'heap') LV.colliders.push({ x, z, r: 2.0 });
    else if (p.prefab === 'boulder' && !p.deco) LV.colliders.push({ x, z, r: p.size * 0.85 });   // (a deco line stands on ground already barred: drawn, nothing more)
    else if (p.prefab === 'deadhorse') { LV.colliders.push({ x, z, r: 0.75 }); if (p.cover) { const ci = cellIdx(Math.floor(p.at[0]), Math.floor(p.at[1])); if (ci >= 0) LV.flags[ci] |= F_HIDE; } }
    else if (p.prefab === 'column') LV.colliders.push({ x, z, r: 0.75 });
    else if (p.prefab === 'winch') LV.colliders.push({ x, z, r: 0.45 });
    else if (p.prefab === 'stal') LV.colliders.push({ x, z, r: 0.7 });
    else if (p.prefab === 'post') LV.colliders.push({ x, z, r: 0.35 });
    else if (p.prefab === 'bunk') { LV.colliders.push({ x: x - 0.6, z, r: 0.55 }); LV.colliders.push({ x: x + 0.6, z, r: 0.55 }); }
    else if (p.prefab === 'stool') LV.colliders.push({ x, z, r: 0.35 });
    else if (p.prefab === 'divan') { const c = Math.cos(p.yaw || 0), sn = Math.sin(p.yaw || 0); for (const u of [-0.55, 0.55]) LV.colliders.push({ x: x + c * u, z: z - sn * u, r: 0.5 }); }
    else if (p.prefab === 'chest' || p.prefab === 'cask') LV.colliders.push({ x, z, r: 0.5 });
    else if (p.prefab === 'pavilion') LV.colliders.push({ x, z, r: (p.r || 2.2) + 0.1 });
    else if (p.prefab === 'campfire') { LV.flames.push({ x, y: prop.y + 0.2, z, w: 0.8, h: 1.0 }, { x: x + 0.15, y: prop.y + 0.2, z: z - 0.1, w: 0.5, h: 0.7 }); LV.lights.push({ x, y: prop.y + 1.2, z, r: 1.0, g: 0.55, b: 0.22, rad: 13, i: 1.5 }); }
    else if (p.prefab === 'seep') LV.lights.push({ x: x + wallIn(p.wall)[0] * 0.8, y: prop.y + 1.0, z: z + wallIn(p.wall)[1] * 0.8, r: 0.25, g: 0.6, b: 0.4, rad: 9.5, i: 0.95 });   // its own faint phosphor
    else if (p.prefab === 'fungus') LV.lights.push({ x, y: prop.y + 0.5, z, r: 0.3, g: 0.6, b: 0.45, rad: 7, i: 0.8 });
    else if (p.prefab === 'sconce') { LV.flames.push({ x: x + wallIn(p.wall)[0] * 0.22, y: prop.y + 2.0, z: z + wallIn(p.wall)[1] * 0.22, w: 0.06, h: 0.12 }); LV.lights.push({ x: x + wallIn(p.wall)[0] * 0.6, y: prop.y + 2.0, z: z + wallIn(p.wall)[1] * 0.6, r: 1.0, g: 0.66, b: 0.34, rad: 10, i: 1.4 }); }   // two candle-stubs: a small warm pool
  }
  // parapets: a crenellated wall along every edge of a high masonry roof that drops away into the void (not across a gap
  // meant to be leapt: level ground two or three cells over), so its edge has a body and a man doesn't walk off it
  LV.parapets = []; LV.breaches = [];
  if (spec.open) {
    const W = LV.W, H = LV.H, at = (x, z) => x >= 0 && z >= 0 && x < W && z < H ? z * W + x : -1;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const i = z * W + x, rm = LV.rooms[LV.room[i]];
      if (LV.kind[i] !== 1 || !(LV.flags[i] & F_SKY) || !rm || rm.style !== 'hewn' || LV.floor[i] < 6) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = at(x + dx, z + dz); if (j < 0) continue;
        const drop = LV.kind[j] === 2 ? LV.deep[j] || LV.void[j] || LV.floor[j] < LV.floor[i] - 6 : LV.kind[j] === 1 && LV.floor[j] < LV.floor[i] - 6;
        if (!drop) continue;
        let leap = false; for (const k of [2, 3]) { const q = at(x + dx * k, z + dz * k); if (q >= 0 && LV.kind[q] === 1 && Math.abs(LV.floor[q] - LV.floor[i]) < 1.5) leap = true; }
        if (leap) continue;
        const ex = (dx > 0 ? x + 1 : dx < 0 ? x : x + 0.5) * CELL, ez = (dz > 0 ? z + 1 : dz < 0 ? z : z + 0.5) * CELL, tx = dz !== 0 ? 1 : 0, tz = dx !== 0 ? 1 : 0, inset = 0.24;
        const cx = ex - dx * inset, cz = ez - dz * inset;
        if ((spec.breaches || []).some(([bx, bz]) => Math.hypot(bx * CELL - cx, bz * CELL - cz) < 1.3)) { LV.breaches = LV.breaches || []; LV.breaches.push({ x: cx, z: cz, y: LV.floor[i], nx: dx, nz: dz, tx, tz }); continue; }   // broken through: where the archers went over
        LV.parapets.push({ x0: cx - tx * CELL / 2, z0: cz - tz * CELL / 2, x1: cx + tx * CELL / 2, z1: cz + tz * CELL / 2, y: LV.floor[i], nx: dx, nz: dz });
        for (let k = 0; k <= 6; k++) LV.colliders.push({ x: cx + tx * CELL * (k / 6 - 0.5), z: cz + tz * CELL * (k / 6 - 0.5), r: 0.24 });
      }
    }
  }
  for (const l of spec.lights) {
    const [x, z] = W2(l.at[0], l.at[1]);
    LV.lights.push({ x, y: l.y, z, r: l.col[0], g: l.col[1], b: l.col[2], rad: l.rad, i: l.i, sky: l.sky });
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
    if (!m.wall || m.free) continue;   // (free: a door standing in an open doorway, not on a wall)
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
// Walls are not on the grid lines: each corner is set back into the rock (computeCorner: jx, jz) and each wall bows back
// between floor and ceiling (mesh.js wallStrip: bul, in three rows). How far the real face stands behind the grid line at
// a hung thing (its span along the wall, between its foot and its top), the least of it so nothing sinks into the stone.
const HUNG = new Set(['tapestry', 'banner', 'trophy', 'pegs', 'sconce', 'chains', 'seep', 'loculi']);
function wallRecess(p, n) {
  const along = n[0] === 0 ? 0 : 1, u0 = along === 0 ? p.at[0] : p.at[1], line = along === 0 ? Math.round(p.at[1]) : Math.round(p.at[0]);
  const g0 = Math.floor(u0), u = u0 - g0, ca = along === 0 ? corner(g0, line) : corner(line, g0), cb = along === 0 ? corner(g0 + 1, line) : corner(line, g0 + 1);
  const fl = groundInfo((along === 0 ? u0 : line) * CELL + n[0] * 0.6, (along === 0 ? line : u0) * CELL + n[1] * 0.6).floor;
  const top = p.prefab === 'tapestry' ? (p.top || 3.3) : p.prefab === 'banner' ? 4.2 : 2.3, foot = p.prefab === 'tapestry' ? top - (p.h || 1.6) : p.prefab === 'banner' ? 1.6 : 1.4;
  const rec = (c, y) => {                                 // set back at corner c, height y: the corner's own setback, plus the bow at that height
    const back = -((c.x - c.gx * CELL) * n[0] + (c.z - c.gz * CELL) * n[1]), dir = -(c.jx * n[0] + c.jz * n[1]);
    const t = clamp((y - c.fo) / Math.max(0.5, c.c - c.fo), 0, 1) * 3, r0 = Math.floor(Math.min(2.999, t)), f = t - r0;
    const k = r => Math.sin(Math.PI * r / 3) * c.bul * (0.6 + 0.8 * hrand(c.gx, c.gz, r * 7, 3));
    return back + dir * lerp(k(r0), k(r0 + 1), f);
  };
  let m = Infinity; for (const y of [fl + foot, fl + (foot + top) / 2, fl + top]) m = Math.min(m, lerp(rec(ca, y), rec(cb, y), u));
  return Math.max(0, m - 0.02);
}
// the floor a prop stands on: where it stands, or if that is in solid rock (a 'floor' of 1e9: the thing drawn a billion metres up,
// its faces streaking across the screen), the nearest open floor within a cell
function propFloor(x, z) {
  for (const [dx, dz] of [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6], [1.25, 0], [-1.25, 0], [0, 1.25], [0, -1.25], [1.25, 1.25], [-1.25, 1.25], [1.25, -1.25], [-1.25, -1.25]]) {
    const g = groundInfo(x + dx, z + dz); if (g.kind !== 0) return g.floor;
  }
  return 0;
}
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
      const h = q => hrand(k, q, si + 3, 61), [x0, z0, w, d] = sc.rect, ci = cellIdx(Math.floor(x0 + h(1) * w), Math.floor(z0 + h(2) * d));
      if (ci < 0 || LV.kind[ci] === 0 || (LV.room[ci] >= 0 && spec.rooms[LV.room[ci]].noscatter)) continue;   // not inside a wall, nor on a stair
      out.push({ prefab: sc.prefab, at: [x0 + h(1) * w, z0 + h(2) * d], rot: h(3) * 6.283, size: sc.size ? sc.size[0] + h(4) * (sc.size[1] - sc.size[0]) : 1, from: sc.from });
    }
  });
  (spec.boulders || []).forEach((ln, li) => {
    const [x0, z0] = ln.from, [x1, z1] = ln.to, L = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / L, nz = (x1 - x0) / L;
    for (let t = 0, k = 0; t <= L; k++) {
      const h = q => hrand(k, q, li + 11, 91), r = ln.r[0] + h(1) * (ln.r[1] - ln.r[0]), off = (h(2) - 0.5) * (ln.jitter || 1.2);
      out.push({ prefab: ln.prefab || 'boulder', at: [x0 + (x1 - x0) * t / L + nx * off, z0 + (z1 - z0) * t / L + nz * off], size: r, rot: ln.rot !== undefined ? ln.rot : h(3) * 6.283, deco: ln.deco });
      t += r / CELL * (0.75 + 0.35 * h(4));
    }
  });
  return out;
}
function nearPit(gx, gz) { for (let dz = -3; dz <= 2; dz++) for (let dx = -3; dx <= 2; dx++) { const i = cellIdx(gx + dx, gz + dz); if (i >= 0 && LV.kind[i] === 2) return true; } return false; }   // within two cells of a drop: a run-up is left level
function computeCorner(gx, gz) {
  let nOpen = 0, sumF = 0, nPit = 0, sumP = 0, nNS = 0, sumC = 0, maxC = -1e9, tall = false, sx = 0, sz = 0, nSolid = 0, rough = 0, vault = 0, fMin = 1e9, fMax = -1e9;
  for (let k = 0; k < 4; k++) {
    const ix = gx - 1 + (k & 1), iz = gz - 1 + (k >> 1), idx = cellIdx(ix, iz), kind = idx < 0 ? 0 : LV.kind[idx];
    if (kind === 0) { nSolid++; sx += ix + 0.5 - gx; sz += iz + 0.5 - gz; continue; }
    nNS++; const c = LV.ceil[idx]; sumC += c; if (c > maxC) maxC = c;
    rough += LV.rough[idx]; vault = Math.max(vault, LV.vault[idx]);
    if (LV.flags[idx] & F_TALL) tall = true;
    if (kind === 1) { nOpen++; sumF += LV.floor[idx]; fMin = Math.min(fMin, LV.floor[idx]); fMax = Math.max(fMax, LV.floor[idx]); } else { nPit++; sumP += LV.floor[idx]; }
  }
  rough = nNS ? rough / nNS : 1;
  let fo = nOpen ? sumF / nOpen : (nPit ? sumP / nPit : 0); const fp = nPit ? sumP / nPit : fo;
  // a cave's floor is never flat: worn hollow down the middle of a tunnel and rising to its walls, lumped and pitted between
  // (only where it is all one floor round the corner: never at a pit's lip, a ledge or a stair, so no leap is changed)
  if (rough >= 0.75 && nOpen > 0 && nPit === 0 && fMax - fMin < 0.6 && !(LEVEL && LEVEL.open) && !nearPit(gx, gz)) fo += (nSolid > 0 ? 0.16 + 0.12 * hrand(gx, gz, 8, 41) : (hrand(gx, gz, 9, 43) - 0.55) * 0.34) * rough;
  const h = hrand(gx, gz, 2, 33);
  let c = nNS ? (tall ? maxC : sumC / nNS + (h - 0.5) * 0.6 * rough) : 0;
  if (nSolid > 0 && vault > 0 && !tall) c -= vault;           // vaulted hewn ceilings
  let jx = 0, jz = 0;
  if (nSolid > 0 && nSolid < 4) { const l = Math.hypot(sx, sz); if (l > 0.01) { jx = sx / l; jz = sz / l; } }
  const amt = (0.12 + 0.3 * h) * CELL * rough;
  return { gx, gz, x: gx * CELL + jx * amt, z: gz * CELL + jz * amt, fo, fp, c, tall, jx, jz, bul: (0.1 + 0.35 * hrand(gx, gz, 5, 99)) * CELL * rough, ao: [1, 0.78, 0.62, 0.5, 1][nSolid] };   // ao: drawn only (mesh.js)
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
