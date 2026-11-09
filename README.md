# THE CIMMERIAN: THE SCARLET CITADEL

A free, non-commercial browser game: a first-person sword-and-sorcery adaptation of Robert E. Howard's *The Scarlet Citadel* (Weird Tales, January 1933). It is built on a pure-JavaScript WebGL port of the Quake engine. Story splash screens sit between the levels, the art direction is a strict minimal palette, and every set, map, texture and character is generated from compact AI-written specs rather than hand-modelled.

**Play:** https://jrodimusprime.github.io/cimmerian/ (the site opens straight into the game). [`game/`](game/README.md) is a playable vertical slice of e1m2 *The Pits*, prototyped on The Endless Cave's WebGL2 engine.

Two design pillars:

- **Deterministic.** The same seed plus the same inputs always gives the same game. An AI agent can play, learn and replay it, and every level ships with a recorded solution that runs as a test (section 11).
- **Puzzle-gated progress.** Every level has a story-based puzzle chain declared as data. The build tool proves that it's solvable and can't get stuck (section 10).

---

## 1. Source material

### Main story: *The Scarlet Citadel* (1933)

This is the best Conan story for a level-based game. Its five chapters already play like a campaign:

| Ch. | What happens | Game shape |
|---|---|---|
| 1 | King Conan's army is betrayed on the plain of Shamu. He fights on until the wizard Tsotha-lanti paralyses him with a poisoned ring | Unwinnable last stand |
| 2 | He's carried in chains to Khorshemish, spits defiance at the enemy kings, and is thrown into the pits under Tsotha's Scarlet Citadel | Story splash |
| 3 | The pits: Satha the giant serpent, the jailer Shukeli, things in the tunnels, the man-eating vine Yothga, and the captive sorcerer Pelias. Then the climb up through the citadel and a flight home on a winged beast | Dungeon crawl, stealth, boss |
| 4 | The capital, Tamar, has fallen to riot and to the usurper Arpello. Conan lands on the great tower and hurls Arpello from it | Tower level |
| 5 | The relief of besieged Shamar, the death of King Strabonus, the rout at the river Tybor, and Tsotha's end | Battle, two bosses |

### Optional prologue: *The Phoenix on the Sword* (1932)

This was the first Conan story published, and *Scarlet Citadel* follows on from it. It's a single tight arena: a dream crypt, then about 20 assassins in the royal bedchamber, then a demon. That makes it a good combat tutorial (Level 0).

### Canon cast only (a rule)

**Every character and creature in the game must appear in Howard's text.** Nobody is invented to fill a level.

- **Cite it.** Each enemy, NPC and boss is traced to a passage in the story (the cast tables in `game/js/combat.js` and `MODELS.md` cite chapter and line). If you can't cite it, it doesn't go in.
- **Nameless monsters only where the text puts them.** Howard says Tsotha's pits hold nameless things ("monsters with dripping jaws agape"; "something whimpered in fear and slunk away in the darkness"; the grille's bars bear "marks of incredible fangs"). So the pits may hold nameless *pit-things*. A named creature that Howard never wrote may not be added.
- **Soldiers come from the armies in the story.** That means Kothian guards and spearmen, Shemitish archers, Tsotha's black giants with their long-shafted axes, Ophirean knights and Aquilonian troops, each where the story could plausibly put them.
- **Monsters behave as the text says.** The weeping thing can't be killed with a sword, because Conan "doubted the power of man-made weapons to harm it" and fled. The strangler brings a huge sword and Shukeli's stolen keys.
- **Only puzzles are invented.** Puzzle mechanics (section 10) and the pacing of action areas (section 9) are the only additions to Howard's plot. They decide *how* a beat plays, never *who* is in it.

### Rights (Australia, non-commercial)

- Howard died in 1936, so his text is public domain in Australia, where authors who died before 1955 are out of copyright.
- All art sources listed in section 6 are by artists who died before 1955.
- This is a free fan project. "Conan" is a registered trademark and the site can be reached worldwide, so the project title uses **"The Cimmerian"** and the in-game text never uses "Conan" in branding.
- Never use later copyrighted material: de Camp's edits, Frazetta or Buscema art, the Marvel or Dark Horse comics, or the films.

---

## 2. Tech stack

| Layer | Choice | Licence | Notes |
|---|---|---|---|
| Engine | **WebQuake** (github.com/Triang3l/WebQuake), forked | GPL-2 (inherits Quake's) | Quake 1 hand-ported to JavaScript and WebGL with shader-based rendering, so it is pure JS at runtime |
| Gameplay | **QuakeC**, compiled to `progs.dat` with `fteqcc` | GPL-2 | Start from LibreQuake's GPL QuakeC (`qcsrc/`) for monster AI and movement |
| Base data | **LibreQuake** (github.com/lavenderdotpet/LibreQuake) | BSD-3 | Free stand-ins for the engine's required lumps (`gfx.wad`, `conchars`, `default.cfg`, menus). **Never ship id Software's `pak0.pak` or `pak1.pak`** |
| Map compile | **ericw-tools** (`qbsp`, `vis`, `light`, `bspinfo`) | GPL-2 | Native binaries, used at build time only |
| Asset tools | Node.js scripts in `tools/` | GPL-2 | Generate the palette, textures, maps, models and paks |
| Splash/HUD | Plain HTML and CSS overlay | — | No framework |

The project's own code is GPL-2. Generated assets are CC0.

---

## 3. Repository layout

```
cimmerian/
  engine/        WebQuake fork (splash hook, palette, perf tweaks)
  web/           index.html, splash.css, splash.js, touch controls
  qc/            QuakeC gameplay → build/progs.dat
  levels/        *.yaml level specs           ← AI writes
  prefabs/       *.map snippets (≤40 brushes) ← AI writes once
  textures/      *.yaml texture recipes       ← AI writes
  chars/         *.yaml character specs       ← AI writes
  parts/         parametric body/gear parts   ← AI writes once
  story/         splashes.json, credits.json  ← AI writes
  solutions/     *.cmdlog golden playthroughs (seed + per-tick inputs)
  agent/         headless runner + JSON observation/action API
  art/src/       public-domain scans (untouched)
  art/splash/    processed splash images (generated)
  tools/
    palette.js   → palette.lmp, colormap.lmp
    texgen.js    texture recipes → WAD2 (with mips)
    mapgen.js    level spec → .map
    mdlgen.js    character spec → .mdl
    splashgen.js PD scans → palette-locked splash images
    pak.js       → shared.pak + per-level files
    budget.js    bspinfo + entity counts → pass/fail report
    preview.js   level spec → top-down SVG
    navgen.js    level spec → nav graph (rooms, links, puzzle nodes) for agents
    solve.js     puzzle graph → solvability + no-softlock proof
    replay.js    runs solutions/*.cmdlog headless, checks state hashes
  build/
```

---

## 4. The pipeline

```
level.yaml ──mapgen──► .map ──qbsp──► .bsp ──vis──► ──light──► final .bsp ──┐
texture.yaml ──texgen──► textures.wad ───────────────────────────────────────┤
char.yaml + parts ──mdlgen──► .mdl ──────────────────────────────────────────┼─► pak.js ─► web/
qc/*.qc ──fteqcc──► progs.dat ───────────────────────────────────────────────┤
splashes.json + art/src ──splashgen──► splash images ────────────────────────┘
```

`npm run build` runs everything. `npm run level e1m2` rebuilds one level and prints its budget report, puzzle-solver report and SVG preview. `npm test` replays every solution headless.

---

## 5. Token-efficient AI design

**Rule: the AI never writes raw brush geometry for whole levels.** A detailed Quake `.map` runs to megabytes of plane coordinates, which would be hundreds of thousands of tokens per level. Instead the AI writes:

| AI writes | Size | Generated from it |
|---|---|---|
| Level spec (YAML) | 100–250 lines | Rooms, walls, doorways, stairs, sealing, entity placement, nav graph |
| Puzzle block (inside the level spec) | 10–30 lines | Triggers, doors, QuakeC flag state, solver proof |
| Solution | Recorded by playing, not written | `solutions/<map>.cmdlog` regression test |
| Prefab (`.map`) | ≤40 brushes, written once and reused | Arches, pillars, braziers, grilles, wall rings, thrones, stair runs |
| Texture recipe | 5–10 lines | 64×64 or 128×128 palette-indexed texture with mips |
| Character spec | 15–25 lines | Mesh, skin, baked animation frames, `.mdl` |
| Splash text | ≤90 words | Splash screen |

**Rough budget:** about 3–6k output tokens per level including entities and script, about 500 per character, and about 100 per texture. The 10 levels, 18 characters and 60 textures come to roughly 70–100k tokens. The QuakeC gameplay code is the largest single piece, at roughly 40–80k tokens.

**Review loop.** The AI never re-reads a generated `.map`. It reviews:

1. `budget.js` output (polys, leaks, entity counts, pass/fail)
2. the top-down SVG preview from `preview.js`
3. the `qbsp` leak report, if any

It then edits the YAML, not the output.

### Level spec format

One grid cell is 64 Quake units, and heights are in cells. The generator hollows rooms, cuts doorways, seals the hull, places prefabs and lights, and emits entities.

```yaml
level: e1m2
title: The Pits
ramps: [ink, jade]             # palette ramps allowed in this level (see §7)
grid: 64
rooms:
  - {id: cell,   at: [0,0],  size: [4,4,3], tex: {floor: pit_floor_wet, wall: hewn_rock}, light: [torch]}
  - {id: hall,   at: [4,1],  size: [22,2,4], style: hewn_tunnel, light: [torch, every: 6]}
  - {id: grille, at: [26,0], size: [4,4,4], tex: {wall: citadel_brick}}
links:
  - {a: cell, b: hall,   via: barred_door, name: cell_door}
  - {a: hall, b: grille, via: prefab:iron_grille, name: grille_gate}
props:
  - {prefab: wall_ring_chains, room: cell, wall: N}
  - {prefab: bones_pile, room: hall, at: [9,0]}
entities:
  - {class: info_player_start, room: cell, flags: [chained]}
  - {class: scripted_satha, path: [hall.w, hall.e], wake: t_wake, hazard: venom}
  - {class: monster_shukeli, room: grille, behind: grille_gate}
script:
  - {on: t_wake, do: [satha_pass, giant_dies]}
puzzle:                         # see §10. solve.js proves this graph
  flags: [free, has_bone, shukeli_at_bars, shukeli_dead]
  actions:
    - {id: slip_chain,  needs: [],                 sets: free,        at: cell,   clue: "insc_cell"}
    - {id: take_bone,   needs: [free],             sets: has_bone,    at: hall}
    - {id: throw_bone,  needs: [has_bone],         sets: shukeli_at_bars, at: grille, clue: "insc_grille"}
    - {id: strike,      needs: [shukeli_at_bars],  sets: shukeli_dead, at: grille}
  goal: shukeli_dead            # opens grille_gate → exit
```

Outdoor areas use `terrain: {heightgrid: 16x16, cell: 128}`, which becomes wedge brushes. A sky ceiling is always capped low, and the area is always enclosed by valley or canyon walls so `vis` stays effective.

---

## 6. Art sources (public domain in Australia)

Use scans that the holding institution has released as public domain or CC0 (the Met Open Access, Rijksmuseum, Smithsonian Open Access, Wikimedia Commons PD-Art). Record each one in `story/credits.json`.

| Artist (died) | Works | Used for |
|---|---|---|
| Giovanni Battista Piranesi (1778) | *Carceri d'invenzione* (Imaginary Prisons) | **The look of the pits.** Splash art and architectural reference for levels 2–4 |
| John Martin (1854) | *Pandemonium*, *The Fall of Babylon*, apocalyptic architecture | The Scarlet Citadel, Khorshemish, the scale of the sky |
| Gustave Doré (1883) | *Paradise Lost* (winged flight), Dante, *History of the Crusades*, *Rime of the Ancient Mariner* | Flight splash, battle splashes, hatching style for textures |
| Albrecht Dürer (1528) | *Apocalypse* woodcuts | Battle and boss splashes, woodcut line weight |
| Sidney Sime (1941) | Dunsany illustrations | Creature design: pit horrors, Yothga, the demon |
| Harry Clarke (1931) | Poe and Andersen illustrations | Sorcerers (Tsotha, Pelias, Thoth-Amon), ornament |
| Met Open Access (CC0) | Arms & Armor collection, Assyrian reliefs | Armour and weapon silhouettes for Koth, Ophir and Shem |

**Don't use yet:** J. Allen St. John (died 1957), who painted *Weird Tales* covers, isn't public domain in Australia until 1 January 2028. Check the death date of every *Weird Tales* interior artist before using their work.

**Splash processing (`tools/splashgen.sh`, ImageMagick):** crop the scan to the plate, convert to greyscale, apply levels so ink is ink and paper is bone, map onto the palette's ramps with error-diffusion dither, then add one soft scarlet accent where the eye should land. Sources live untouched in `art/src/`, outputs in `game/art/`, and every source is in `story/credits.json`.

In use now: John Martin's *Pandemonium* (1841) for the title card. The level splashes are painted procedurally (`game/js/splash.js`): a tonal Piranesi-style scene engraved with hatching, with one scarlet accent. The `plate()` step in `splashgen.sh` can turn *Carceri* scans into level plates if wanted.

**Why not Conan's own illustrators:** the *Weird Tales* Conan artists (Margaret Brundage, Hugh Rankin, J. Allen St. John) died after 1955, so their work isn't public domain in Australia yet.

---

## 7. Visual style: the minimal colour system

Quake uses one 256-colour palette (`palette.lmp`): 16 rows of 16 shades. Indices 224–255 are fullbright, meaning they aren't affected by lighting. `tools/palette.js` builds the palette and `colormap.lmp` from **6 lit ramps and 2 fullbright ramps**. Unused rows repeat the ink ramp, so no stray colours exist anywhere.

| Ramp | Dark → light anchors | Use |
|---|---|---|
| `ink` | `#0b0a09` → `#e8dcc0` (black to bone) | The dominant ramp, about 60% of all pixels: stone, parchment, shadow |
| `scarlet` | `#2a0606` → `#c4302b` | The citadel, blood, Tsotha's robes, UI titles |
| `bronze` | `#20140a` → `#d8a24a` | Armour, the gold dome, coins, Aquilonian heraldry |
| `jade` | `#08120c` → `#7fa88a` | Satha, Yothga, poison, the pits' damp |
| `night` | `#0a0d14` → `#6b7a96` | Sky, distance fog, steel |
| `earth` | `#160e08` → `#b08a66` | Skin, leather, plains, wood |
| `fire` (fullbright) | `#5a1a00` → `#ffd27a` | Torches, braziers, burning Tamar |
| `magic` (fullbright) | `#0a3020` → `#e6fff0` | Sorcery, the crystal globe, the phoenix mark |

**Rules:**

- Each level uses `ink` plus at most 2 other ramps. The level spec declares them in `ramps:`, and `budget.js` fails textures that break the rule.
- Each texture uses at most 3 ramps, at 64×64 or 128×128, with power-of-two sizes only.
- Texture recipes always add an engraving-style hatch layer (diagonal or cross-hatch at a 3–4 px pitch). This keeps the 3D world consistent with the engraved splash screens.
- **The Quake look.** The scene is drawn small (360 lines by default), then every pixel is snapped to the nearest colour of the game palette above (128 colours: the 8 ramps × 16 shades) through a 32×32×32 lookup table, and scaled up with hard edges. Flashes and fades are snapped too, as Quake's colormap did. F4 toggles it.
- **Atmosphere.** Distance fades into a dark, warm haze rather than to black, emissive surfaces (fire, eyes) cut through the haze, and torches flicker with Quake's lightstyle strings.

Area accents:

| Area | Ramps |
|---|---|
| Battlefields | `earth`, `night` |
| Citadel | `scarlet`, `bronze` |
| Pits | `jade` |
| Tamar | `bronze`, `fire` |
| Final meadow | `earth`, `scarlet` (sunset) |

### Texture recipe example

```yaml
id: citadel_brick
size: 64
ramps: [ink, scarlet]
layers:
  - brick: {rows: 4, offset: 0.5, mortar: ink.2, face: scarlet.9}
  - hatch: {angle: 45, pitch: 3, strength: 0.35}
  - noise: {scale: 8, ramp: ink, amount: 0.2}
  - edge_darken: {amount: 0.3}
```

---

## 8. Characters: how they're made

Characters are built from specs rather than sculpted. `mdlgen.js` does the following:

1. **Rig.** It loads a shared rig: `humanoid` (14 bones), `ape` (a humanoid with long arms and a hunched spine), `serpent` (a segment chain) or `tendril` (a branching chain).
2. **Mesh.** It attaches parametric parts from `parts/`: boxes, tapered boxes, lathes (helmets, pots, limbs) and extrusions (blades, shields). It welds them and decimates to the spec's `tris_max`.
3. **Skin.** It box-projects UVs per part and packs them into a skin of at most 256×256. It paints with the spec's ramps, with shading by face normal, the same hatch layer used for textures, and darkened edges. Faces and emblems come from a small stamp library.
4. **Animation.** It reads keyframe poses (bone rotations, written once per rig in `parts/poses.yaml`), interpolates them at 10 fps like Quake, and bakes every frame to vertex positions.
5. **Output.** It writes a Quake `.mdl` file with standard frame groups, which QuakeC references as `$frame` names.

Most enemies differ from each other only by parameters, which keeps each spec to about 20 lines.

**Preference: hide faces.** Wherever the text allows, cover faces with helmets, hoods, coifs, veils or masks: closed great helms with an eye-slit for Kothian guards, a mail coif and veil for spearmen, a hood whose face is only shadow for archers, a horned great helm for Tsotha's axemen. At Quake's triangle budget, a modelled face reads as cartoonish, while a helm reads as menace. A slit, a shadow or a pair of pin-prick eyes is scarier than any face we can model. Where a face must show (the strangler, Shukeli, Pelias, Tsotha), make it hard: a heavy brow over sunken sockets, teeth, scars.

**Posture: Quake's killers never stand up straight.** Enemies are hunched, with knees bent and the head thrust forward, and they keep that stance in every pose.

```yaml
id: kothian_spearman
rig: humanoid
height: 56            # Quake units (player ≈ 56)
build: lean           # lean | normal | heavy | giant | dwarf
parts: {head: helm_conical, torso: scale_cuirass, arms: bare, legs: greaves,
        r_hand: spear, l_hand: round_shield}
ramps: {primary: bronze, secondary: earth, accent: scarlet}
anims: {stand: 8, walk: 8, run: 6, attack_thrust: 6, pain: 4, death: 8}
tris_max: 290           # tier C (see MODELS.md)
```

### Cast

The full list of models, with bones, triangle counts, skins and animation frames, is in **[MODELS.md](MODELS.md)**. In summary:

- **Quake density.** Common enemies are about **300 triangles**, named characters 300–400, and bosses 400–600. Nothing exceeds 600 triangles or 400 vertices, though the MDL format allows 2,048.
- **The hero is first person.** Four view-models (sword, broken hilt, axe, kick leg) at 120–250 triangles each, plus a 300-triangle body for the chase camera and death sequence.
- **Rigs.** `humanoid` has 14 bones, with variants `robed` (16) and `ape` (15). Satha and Yothga use chain rigs and are assembled from several cheap entities.
- **54 models** in total, about 9,750 triangles authored. Allies reuse enemy meshes with new skins.
- The winged beast, the eagle and the globe's vision appear only in splash art, which saves a flying rig and a level.

---

## 9. Level plan: the story map

**Rule: the game is the book, in the book's order.** Every level is a stretch of *The Scarlet Citadel*, and inside each level the beats happen in the order Howard tells them. A level may add *how* a beat is played (a puzzle, a fight's shape), never *what* happens, *who* is there, or *where* the story goes next. Each level's exit is the book's next scene. This section is the reference for every level: check a level against it before building or changing it.

Quotes are from the Wikisource text of the story (public domain in Australia).

### The book, beat by beat

| Ch. | Beat | Book anchor |
|---|---|---|
| I | The trap on the plain of Shamu: Conan's five thousand knights die to the last man; he stands alone on a heap of dead | "his back against a heap of dead horses and men" |
| I | Kothian knights, Ophirean knights and Shemite archers ring him; Tsotha says take him alive and fells him with a poisoned ring | "Strabonus called on his Shemitish archers to loose their arrows"; "Take him alive" |
| II | In chains to Khorshemish; before Strabonus and Amalrus, Conan defies them | "naked slave-boys beside them pouring wine" |
| II | Tsotha's black giants take him down through the citadel: the censer corridor, the jet corridor, the brass skull door where Shukeli waits with his keys, the long stair, the iron door to the pits | "a dozen black giants, grasping their long-shafted axes"; "a brass door, over whose arch a human skull grinned" |
| III | Chained to a ring in a vault, a torch in a niche above. Satha comes and goes; her venom burns his thigh; he stays still | "A drop of venom fell on his naked thigh" |
| III | The black strangler comes through the grille with a huge sword and Shukeli's stolen keys, taunts "Amra", raises the sword for his head; Satha takes him from behind | "bearing in one hand a huge sword and in the other a bunch of keys" |
| III | The keys land at his feet; the chain is too short to bend; he grips them with his toes and frees himself, and takes the black's sword | "slipped one foot from its sandal, and gripped them with his toes" |
| III | Shukeli, following his keys, slams the grille shut under his fingers; Conan runs him through the bars; the bolt works only from outside, so he is trapped in the pits | "Shukeli the eunuch, who had followed his stolen keys"; "a bolt which can be worked only from the outside" |
| III | The main corridor, Satha's hunting ground, with pits in the floor and side tunnels; the other monsters give her room | "monsters with dripping jaws agape"; "something whimpered in fear and slunk away" |
| III | The weeping: a woman's sobs lead to the jelly-thing; it titters and flounders after him; he flees, doubting any blade could harm it | "an amorphic bulk ... a frog-like head" |
| III | The crossing chamber and the well: wind rises from below, a presence floats up, his torch is blown out and he finds his way back by its ember | "a shadowy wind, rising from the well" |
| III | Satha returns down the corridor; he hides in a side tunnel with his torch out | "he leaped to the darkness of a near-by tunnel, shaking out his torch" |
| III | A cage of bars with a garden in it: Yothga holds Pelias; one of Shukeli's keys opens the cage; Conan cuts the stem and does not touch the roots | "found a key among the keys he carried"; "why did you cut the stem ... instead of tearing it up by the roots?" |
| III | Satha meets them, sees Pelias's soul, and flees in fear | "the hate died out in a glitter of pure fear" |
| III | Pelias raises Shukeli's corpse, which works the bolt and falls dead again | "Rise, Shukeli! Rise from hell" |
| III | Up the long stair, through the skull door; the citadel is silent, its men under Pelias's spell; Tsotha's chambers: wine, the crystal globe shows Tamar and Shamar | "expecting a rush of slaves, but silence gripped the citadel"; "Tsotha's crystal" |
| III | The tower roof: Pelias calls the winged beast and Conan flies for Tamar | "a huge bat-like creature alighted beside him" |
| IV | Tamar at dawn: Arpello has seized the crown; Conan lands on the great tower among Arpello's archers, parries Arpello and hurls him to the pave; the city rises | "heaved him high above his head by crotch and neck" |
| V | The relief of Shamar: Bossonian archers and Gunderman pikes beside Trocero's and Prospero's knights, against Shemite archers, Kothian spearmen and the knights of Koth and Ophir; Conan cuts through to Strabonus and kills him; Prospero kills Amalrus | "stolid Bossonian archers, and keen pikemen from Gunderland"; "The five-foot blade crushed Strabonus' casque" |
| V | The rout: the men of Shamar cut the barge bridge adrift; Tsotha flees across it on an unnatural steed; Pelias's eagle throws him; he hurls a fire globe; Conan beheads him; the eagle takes the head, laughing in Pelias's voice | "riding like the wind on a gaunt weird-looking steed"; "Conan's sword sheared through his lean neck" |

### Levels

| # | Map | Title | Book | Beats, in order | Where the action comes from (in the book) | Exit = next scene |
|---|---|---|---|---|---|---|
| 0 | `e0m1` | The Phoenix *(optional)* | *Phoenix on the Sword* | Dream crypt, the sage marks the sword; the assassins in the bedchamber; Gromel breaks the sword; the axe from the wall; the demon kills Ascalante; Conan kills the demon | Ascalante's band, the demon | The splash for Shamu |
| 1 | `e1m1` | The Plain of Shamu | I | The last stand on the heap of dead; it can't be won; Tsotha's ring | Kothian and Ophirean knights, Kothian spearmen, Shemite archers | The ring's sting: fade to the Khorshemish splash (ch. II is told in the splash) |
| 2 | `e1m2` | The Pits | II–III | Chained in the vault; Satha passes and her venom burns; the black strangler, his sword raised; Satha takes him; the keys at your feet, gripped with your toes; the black's sword; Shukeli slams the grille, and you kill him through the bars; trapped | Satha's venom; the strangler; Shukeli at the bars | Down into the pits behind the vault |
| 3 | `e1m3` | The Tunnels Below | III | The main corridor and its pits; Satha's hunting ground; the weeping thing (flee); the crossing chamber, the well's wind and presence, the torch blown out; Satha returns, and you hide with the torch out | The pits' nameless monsters; the weeping thing; Satha | The cage of bars with a garden in it |
| 4 | `e1m4` | Yothga | III | Open the cage with Shukeli's keys; Yothga (cut the stem, don't tear the roots); Pelias freed; Satha meets you and flees from Pelias; Pelias raises Shukeli to work the bolt | Yothga's tendrils; the pits' monsters on the way back | Up the long stair |
| 5 | `e1m5` | The Scarlet Citadel | II–III | The skull door; the jet and censer corridors (the ones you were dragged down in ch. II); Tsotha's chambers, the wine, the crystal globe showing Tamar and Shamar; the tower roof; the winged beast | Tension, not swordplay: Tsotha's men sleep under Pelias's spell, and you pass them. Fighting is only for when one wakes | The flight to Tamar (splash) |
| 6 | `e1m6` | The Tower of Tamar | IV | Land on the great tower at dawn; Arpello's archers on the turrets; Arpello himself; hurl him from the tower; his men break | Arpello's archers and Pellian men-at-arms on the tower | The splash for the march south (told in the splash) |
| 7 | `e1m7` | The Relief of Shamar | V | The plain before Shamar; Bossonian archers and Gunderman pikes alongside you; through the Shemite archers, the Kothian spearmen and the knights; Strabonus and his axe | The armies of Koth and Ophir | The rout to the river |
| 8 | `e1m8` | The Tybor | V | The rout; the men of Shamar cut the barge bridge adrift; Tsotha's flight on his weird steed; the eagle; the fire globes; the beheading; the eagle takes the head | Routed soldiers; Tsotha | The ending splash: the eagle laughing in Pelias's voice |

The book has no Tamar street level for Conan (he arrives on the tower by air), so the old `Tamar Burning` level is gone and the campaign has eight levels after the optional prologue.

Sizes: S is about 8–15 rooms, M about 15–30, L about 30–45 (rooms or areas, as counted in the level spec). The yardstick is Quake's E1M1: about 5–10 minutes to play, a dozen or more enemies, and a few distinct spaces.

### Pacing: puzzle areas and action areas

Every level alternates **puzzle areas** (read, think, time things, use objects) and **action areas** (fight or flee). Each area is declared in the level spec (`areas:`, with `type: puzzle | action`), the HUD names it when you enter, and entering it sets a checkpoint.

**The book decides who you fight.** Action areas use only the opposition the book puts in that stretch of the story (the table above, *Where the action comes from*). If the book has no fight in a stretch (the silent citadel), the action is tension instead: being seen, being heard, running. Pacing never adds soldiers, monsters or scenes the book doesn't have.

### Audit: the current build against the book

The playable build (`game/`) was made before this rule and departs from the book in places. Each must be fixed:

| Where | Book | Current build | Fix |
|---|---|---|---|
| e1m2 freeing | Satha's venom drop; the keys at his feet; gripped with his toes | A rusted link, ground through after reading a clue | The keys land beyond reach of your hands; a toe-grip action picks them up |
| e1m2 Shukeli | He slams the grille as you reach it and you strike through the bars, at once | A thrown-bone lure from a niche, much later | Shukeli comes after the giant dies, slams the vault grille, and you have seconds to strike |
| e1m2 after the grille | You are trapped; the pits behind you are the way on | You take Shukeli's keys, open the grille, and fight up through a guardroom, barracks, winch and landing | Remove the guardroom, barracks, winch and landing fights; the level ends going down into the pits |
| e1m2 soldiers | No soldiers in the pits | Kothian guards, spearmen, Shemite archers and a black axeman | Move them to the levels where the book has them (e1m1, e1m6, e1m7) |
| e1m3 entry | Through the pits, from the vault | "Shukeli's keys open the door at the foot of the gaol stair" | Rewrite: you enter from the vault |
| e1m3 Yothga's cage | Opened with a key from Shukeli's ring | A sigil-stone lowered on a windlass, a gate | Replace with the cage of bars and the keys (the hanging-stone puzzle can't stay as a key) |
| e1m3 the presence | The wind from the well and a bodiless presence; the torch blown out | A draft puzzle (four vents) that pushes you off a ledge | Keep the draft (it is the book's wind), add the torch going out |
| Satha | "the great shimmering white form" | Green scales; she spits venom | Make her white; her venom drips (the book), she doesn't spit |

The puzzle mechanics in section 10 decide how a beat plays; the cast and the order of events are the book's (section 1, *Canon cast only*).

---

## 10. Puzzle progression

Each level is a **gated chain**: explore, find a clue, act on it, open the way on. The puzzles come from the story's own objects (chains, grilles, sigils, ropes, wards), so they never feel bolted on.

### Puzzle rules

1. **Declared as data.** Each level spec's `puzzle:` block is a small graph of **flags** (world state) and **actions** (`needs` flags → `sets` flags, at a room, with an optional clue entity). `mapgen.js` emits the matching triggers, doors and QuakeC state from it, so the puzzle logic and the map can't drift apart.
2. **Proved solvable.** `solve.js` searches every reachable flag state, breadth-first, and fails the build unless:
   - the goal can be reached;
   - from every reachable state, the goal can still be reached (no softlocks);
   - every `needs` item can be obtained in a room the player can reach at that point (checked against the nav graph);
   - no item that's required can be destroyed or lost.
3. **Readable clues.** Clues are inscription, mural or NPC-line entities. Each has a plain-text `message` for both the player and the agent observation. The visual (a carving, a mosaic) is only a restatement of the text, so the game never relies on pixel-hunting.
4. **Fair timing.** Any timing element (Satha's patrol, regrowing tendrils, a swinging counterweight) runs on a fixed cycle measured in ticks. Each window is at least 0.5 s, and its period is stated in the clue or visible in the world.
5. **Fair movement.** No jump needs more than 80% of the player's maximum jump. `navgen.js` checks clearances, and precision platforming isn't used anywhere.
6. **Story first.** The steps happen in the order Howard tells them. Puzzles decide how you do each beat, never whether it happens.

### Puzzle per level

| Map | Puzzle chain (clue → action → unlock) |
|---|---|
| `e0m1` The Phoenix | The crypt frieze shows four braziers in an order → light them in that order → the sage wakes and marks your sword (the only weapon that hurts the demon). In the bedchamber, the axe is mounted high, so knock its wall mount loose with the broken hilt to drop it |
| `e1m1` Plain of Shamu | Light puzzle (a combat level). Three rally standards: holding each in turn delays the waves and opens the next fallback position. The level always ends with the scripted fang |
| `e1m2` The Pits | Lie still while Satha passes (moving under her draws the venom); the strangler's keys land beyond your hands, so slip your foot free and grip them with your toes; Shukeli slams the grille, so strike through the bars before he flees |
| `e1m3` The Tunnels | Satha's corridor on a fixed cycle (hide in side tunnels with your torch out); flee the weeping thing; in the crossing chamber the well's wind blows your torch out, so find your way back by its ember. (The current build's marked ways, vents and hanging stone predate this plan; see the audit in §9) |
| `e1m4` Yothga | Open the cage with one of Shukeli's keys. Cut Yothga's stem, never its roots (the book: touching the roots is death). Pelias needs no puzzle to scare Satha off; he raises Shukeli to work the bolt |
| `e1m5` The Scarlet Citadel | Pass Tsotha's sleeping men without waking them; read the crystal globe (Tamar and Shamar, as in the book); on the roof, Pelias calls the winged beast |
| `e1m6` The Tower of Tamar | Clear Arpello's archers from the turrets; parry Arpello, then seize and hurl him from the tower (a grapple action, as in the book) |
| `e1m7` The Relief of Shamar | Fight beside the Bossonian archers and Gunderman pikes; break the Kothian line where it wavers; reach Strabonus and his axe |
| `e1m8` The Tybor | The barge bridge is cut adrift (the men of Shamar do it); chase Tsotha across the meadow; dodge his fire globes; behead him before he throws again |

**Token cost.** A `puzzle:` block is 10–30 lines, and `solve.js` checks it instantly. The AI fixes failures from the solver's report, which names the stuck state and the missing step, without re-reading the map.

---

## 11. Determinism and AI play

**The guarantee: `seed + per-tick inputs → identical game state on every machine and every run.`** This lets an AI agent learn the game, lets solutions be recorded and replayed as tests, and makes bugs reproducible.

### Simulation rules (engine fork and QuakeC)

| Area | Rule |
|---|---|
| Timestep | The server/simulation runs at a **fixed 72 Hz tick**, never from real elapsed time. The renderer interpolates between ticks and can run at any frame rate |
| Randomness | QuakeC `random()` and every simulation use of `Math.random` are replaced with a **seeded PRNG** (xorshift128+). Each entity has its own stream, seeded with `hash(levelSeed, edictNum)`, so adding one entity doesn't change the others' rolls |
| Cosmetics | Particles, view bob, screen shake and sound variation use a separate cosmetic PRNG on the client. They never feed back into the simulation |
| Maths | `Math.sin`, `cos`, `atan2`, `pow`, `exp` and `log` can differ between JS engines, so the simulation uses a bundled deterministic implementation (a port of fdlibm) via `engine/dmath.js`. `Math.sqrt` and the basic arithmetic operators are exact under IEEE 754 and are used directly. Values stored as float32 go through `Math.fround` |
| Clock | No `Date.now`, `performance.now` or timers inside the simulation. QuakeC `time` is derived from the tick count |
| Order | Entities think in edict order, triggers fire in a stable order, and level spawn order comes from the level spec order |
| Combat | Damage values are fixed: no random crits or random damage. Enemy attack choice uses the entity's seeded stream, so it's varied but reproducible |
| Loading | A level always starts at tick 0 with an identical state, whatever happened on the splash screen or in the menus |
| Desync check | Every 72 ticks the simulation hashes player state, entity states and puzzle flags (FNV-1a). Replays compare these hashes |

### Agent interface (`agent/`)

The agent runs **headless in Node**, reusing WebQuake's Node dedicated-server code with no renderer, so it can run faster than real time.

```js
const env = await Cimmerian.make({ map: "e1m2", seed: 1 });
let obs = env.reset();
obs = env.step({ forward: 1, side: 0, yaw: 90, pitch: 0, attack: false, use: false, jump: false, ticks: 6 });
```

**Actions.** The agent gets the same inputs a human has: move axes, view angles, attack, use, jump, kick, throw and weapon select, held for `ticks`. There are no privileged commands.

**Observation (JSON).** Each observation includes:

- `tick` and `stateHash`
- the player's position, angles, velocity, health, armour, weapon and inventory
- puzzle `flags` (only the ones the player has discovered)
- visible entities (id, class, position, health, state)
- interactables within reach, plus clue `message` text once it has been read
- the current room id
- an optional low-resolution RGB frame for vision-based agents

**Nav graph.** `navgen.js` exports a nav graph (rooms, links, door states, and which puzzle action sits in which room) as `maps/<map>.nav.json`. The agent can plan at the room and puzzle level, then steer locally. The graph only reveals rooms the player has seen, so it isn't a cheat.

**Splash screens** auto-advance in agent mode, and their text is included in the observation.

### Recorded solutions

- `solutions/<map>.cmdlog` stores the seed, the map and per-tick inputs (run-length encoded, a few KB).
- Solutions can be recorded by a human playing in the browser (`?record=1`) or by an agent.
- **CI:** `replay.js` runs every solution headless. It must reach `level_complete` with the same final `stateHash` each run, and in the browser build too, checked by comparing the hashes. Any gameplay change that breaks a solution fails the build.
- `solve.js` proves each level is solvable in principle; the cmdlog proves it's solvable in practice.

---

## 12. Splash screens

The splash screens are HTML overlays drawn over the WebGL canvas. They're shown on every level change and also hide the loading time.

```json
{ "e1m2": {
    "title": "THE PITS",
    "image": "art/splash/carceri_07.png",
    "accent": [[0.62,0.10,0.95,0.40]],
    "text": "Beaten on the plain of Shamu and struck down by the wizard's poisoned ring, the king was carried in chains to Khorshemish. Before the kings who betrayed him he spat his defiance. Now Tsotha-lanti has given him to the dark beneath the Scarlet Citadel, where something vast moves in the tunnels.",
    "quote": null } }
```

**How it works:**

1. **Engine hook.** Hook WebQuake's changelevel / loading-plaque path. When the server starts loading map X, `splash.js` shows `story/splashes.json[X]`.
2. **Load behind the splash.** The next level loads while the splash is up. The "Press any key" prompt appears only when the load finishes, so players never see a loading bar.
3. **Locked palette.** Splash images use the game palette only. Typeset with a public-domain-era style serif (e.g. a revival of Caslon or Jenson under the OFL), bone on ink with scarlet titles.
4. **Optional quote.** `quote` may hold one short line from Howard's text, which is public domain in Australia.
5. **Mid-level cutscenes.** These use the same overlay, triggered from QuakeC with `stuffcmd(self, "splash e1m1_fang\n")`. Add a matching console command in the engine fork.

---

## 13. Gameplay (QuakeC)

**Weapons:**

| Weapon | Behaviour |
|---|---|
| Sword | 3-swing combo using traceline arcs |
| Broken hilt | Prologue only |
| Axe | Slower and heavier |
| Thrown axe/dagger | Pick it back up after throwing |
| Kick | Knockback and guard-breaking. (Arpello is seized and hurled, as in the book, not kicked) |

There are no ammo weapons.

**Pickups:**

- Wine (+15 health)
- Bread and meat (+25)
- Mail shirt (armour)
- Phoenix mark (prologue only)

**Combat feel:**

- `punchangle` view kick
- knockback
- blood particles in the `scarlet` ramp
- a short stagger on heavy hits
- enemies telegraph attacks with a 0.3 s wind-up frame

**AI and set pieces:**

- Monster AI starts from LibreQuake's GPL `ai.qc` state machine. Every `random()` call is routed through the entity's seeded stream (section 11).
- Interaction uses a dedicated `use` button that fires a traceline at 64 units. Levers, valves, jaws, ropes, globes and speech all go through it, so puzzles have one consistent verb for both players and agents.
- A `team` field lets factions fight each other: Bossonians and Gundermen beside you against the invaders at Shamar.
- Set pieces are built from standard entities (`trigger_relay`, `func_train`, `path_corner`, `trigger_push`, `trigger_hurt`) plus a small `script.qc` that `mapgen.js` fills from each level's `script:` block.
- Armies are faked. Keep at most 16 live monsters near the player, and use billboard sprite crowds plus ambient battle audio beyond that.

---

## 14. Performance budget

Quake-era limits keep the game fast on laptops and phones. `budget.js` fails the build if a level breaks any of these:

| Metric | Budget |
|---|---|
| World polys visible from any point | ≤ 700 |
| Model triangles on screen | ≤ 6,000 (e.g. 16 × 300-tri enemies + view-model + props) |
| Live monsters in the PVS | ≤ 16 (≤ 60 per map) |
| Unique textures per map | ≤ 32, each ≤ 128×128 |
| `.bsp` size | ≤ 2 MB (≈ 0.6 MB with Brotli) |
| Total download | ≤ 25 MB |
| Target frame rate | 60 fps at 1080p on integrated GPUs; 30+ on mid-range phones |

**How to stay inside the budget:**

- **Always run full `vis`.** Without vis the engine draws everything; a WebQuake test once rendered about 62,000 triangles on a single map with every leaf visible.
- **Use `func_detail`** for all prefabs and props, so they don't split the BSP.
- **Add hint brushes** at the chokepoints the level spec marks.
- **Keep outdoor areas as valleys or canyons** with a low sky cap. Battles are staged in long, broken valleys, never open fields.
- **Bake all lighting** (`light -extra4 -bounce 1`). Torches and fires flicker through lightstyles, which cost almost nothing. Avoid dynamic lights except brief sorcery flashes.
- **Cap particles** at 512.
- **Load per level.** A shared `pak` holds the palette, `gfx`, `progs.dat`, models and sounds. Each map is fetched while its splash is showing. Check how the fork fetches files and make the loading asynchronous if it isn't.
- **Pre-serve compressed files** (Brotli or gzip) for `.bsp`, `.pak` and `.mdl`.

---

## 15. Audio

- **Sound effects:** CC0 sounds only (for example, freesound.org filtered to CC0), plus procedurally generated whooshes and impacts. Record each one in `credits.json`.
- **Music:** public-domain recordings of public-domain compositions (for example from Musopen), or original tracks. Both the composition and the recording must be free.
- **The Weeper and the presence:** these are audio-led creatures, so their positional sound matters more than any model.

---

## 16. Milestones

| Milestone | Goal |
|---|---|
| M0 | WebQuake fork boots in the browser using LibreQuake data. Add the fixed 72 Hz tick, the seeded PRNG and `dmath.js`, and confirm the headless Node build and the browser build produce identical state hashes |
| M1 | `palette.js` and `texgen.js` work. A single test room is built through `mapgen.js` and passes `budget.js` |
| M2 | Combat prototype: sword combo, kick, one enemy (Kothian spearman) generated by `mdlgen.js` |
| M3 | Splash system and the console `splash` command. Puzzle graph → `solve.js` → generated triggers. Agent API, `.cmdlog` recording, `replay.js` in CI |
| M4 | **Vertical slice: `e1m2` The Pits**, including Satha, Shukeli, the full puzzle chain, the full art pass, and one human and one agent solution that both replay cleanly |
| M5 | Remaining levels in story order, then bosses (Yothga, Arpello, Strabonus, Tsotha) |
| M6 | Performance pass on low-end mobile, plus touch controls |
| M7 | Optional prologue `e0m1`, credits screen, release |

---

## 17. Credits and licences

- Story: Robert E. Howard, *The Scarlet Citadel* (1933) and *The Phoenix on the Sword* (1932). Public domain in Australia.
- Engine: WebQuake by Triang3l, from Quake by id Software (GPL-2).
- Base data and QuakeC: LibreQuake contributors (BSD-3 data, GPL-2+ QuakeC).
- Map tools: ericw-tools (GPL-2).
- Art: see `story/credits.json`. Every source is public domain or CC0, with the artist's death year recorded.
- This project: GPL-2 code, CC0 generated assets. Non-commercial fan work, not affiliated with any rights holder.
