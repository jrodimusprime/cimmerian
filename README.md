# THE CIMMERIAN: THE SCARLET CITADEL

A free, non-commercial browser game: a first-person sword-and-sorcery adaptation of Robert E. Howard's *The Scarlet Citadel* (Weird Tales, January 1933). It is built on a pure-JavaScript WebGL port of the Quake engine. Story splash screens sit between the levels, the art direction is a strict minimal palette, and every set, map, texture and character is generated from compact AI-written specs rather than hand-modelled.

**Play:** https://jrodimusprime.github.io/cimmerian/ (the site opens straight into the game). [`game/`](game/README.md) is a playable vertical slice of e1m2 *The Pits*, prototyped on The Endless Cave's WebGL2 engine.

## The two absolute rules

> **1. The game is the book.** Every level is a stretch of Howard's *The Scarlet Citadel*. Inside a level, the beats happen in the order Howard tells them, with the people and creatures Howard puts there, in the places he puts them. Nothing may change *what* happens, *who* is there, or *where the story goes next*. A level may only add *how* a beat is played: the shape of a fight, a puzzle built from the story's own objects, more of the opposition the book already puts in that stretch. When in doubt, read the chapter (section 9 quotes every beat) and do what it says.
>
> **2. Every level lasts as long as a Quake level.** About 5–10 minutes for a first-time player, a dozen or more encounters, and a run of distinct spaces, like Quake's E1M1. Where the book's beat is short, the level is made longer **inside the story**: more of the place the book describes (its corridors, side tunnels, turrets, battle lines), filled with the opposition the book puts there. Combat corridors are welcome; invented scenes, characters and detours out of the story are not.

**The telling is out of joint.** The game opens *in medias res*, in the pits, chained in the dark, the best possible first level. When the pits are behind you it flashes back to the plain of Shamu: *how did we get here?* Then it jumps forward again into the tunnels and follows the book to the end. This changes only the order in which levels are **played**, never what happens inside them; each level is still its stretch of the book, beat for beat. (Howard does the same: chapter III opens with the chained king remembering.)

| Play order | Map | Level | Book | Frame |
|---|---|---|---|---|
| 1 | `e1m2` | The Pits | II–III | Opens cold: chained in the vault |
| 2 | `e1m1` | The Plain of Shamu | I | Flashback: a splash asks how the king came to be in Tsotha's pits; the level ends at the ring's fang and cuts back to the dark |
| 3 | `e1m3` | The Tunnels Below | III | Forward again: the weeping in the dark |
| 4–8 | `e1m4`–`e1m8` | Yothga to the Tybor | III–V | In order |

Map names keep the book's numbering; the play order is the table above. The optional prologue `e0m1` stands outside it.

Every level plan in section 9 marks its areas `<<combat>>`, `<<puzzle>>` or `<<agility>>`, and alternates fights with the other two.

**Agility (a standing rule).** Conan is a leaper and a climber, and every level has jumping in it: at least one `<<agility>>` beat per level, and more where the place allows. Gaps to leap, ledges you must jump to climb, leaps timed against a hazard, narrow ways over drops, often with something coming at you. Like a fight, agility is only *how* a beat is played: it is set in the book's own places (a floor broken by pits, a broken stair, the roofs of Tamar, the barge bridge on the Tybor), never in an invented detour.

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
- **Nameless monsters only where the text puts them.** Howard's pits hold Tsotha's nameless "pets" and "demons", glimpsed and heard but never shown whole: "in the mouths of the tunnels caught glimpses of shadowy forms, monstrous and abnormal in outline"; "the greedy sucking-in of slavering lips, and ... the burning glare of hungry eyes"; "something whimpered in fear and slunk away in the darkness"; the chapter's verse has "monsters with dripping jaws agape". So the pits may hold nameless *pit-things*, drawn as Howard gives them: dark, misshapen shapes, each abnormal in its own way, with only burning eyes and a wet maw catching the light. In the book they keep out of Satha's corridor and never close with Conan; fighting them is rule 2's "more of the opposition the book puts there". A named creature that Howard never wrote may not be added.
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

### Levels: the story and the areas of each

Each level below tells its stretch of the book, then lists its areas in play order, marked `<<combat>>` or `<<puzzle>>`. Every area cites what in the book it is built from. Sizes and length follow rule 2: about 5–10 minutes, six to eight areas, a dozen or more encounters.

The book has no Tamar street level for Conan (he arrives on the tower by air), so the campaign is eight levels after the optional prologue.

#### `e0m1` The Phoenix *(optional prologue, from* The Phoenix on the Sword*)*

**Story.** Conan, newly king, dreams he walks a crypt where the dead sage Epemitreus marks his sword with the phoenix. He wakes to twenty assassins led by Ascalante breaking into his bedchamber. His sword breaks on Gromel; he takes a battle-axe from the wall and holds the room. A demon summoned by Thoth-Amon kills Ascalante, and Conan kills it with the phoenix-marked blade.

1. `<<puzzle>>` **The Dream Crypt.** Light the braziers in the order shown on the frieze; the sage marks your sword.
2. `<<combat>>` **The Bedchamber Door.** The first rush of assassins.
3. `<<combat>>` **The Broken Sword.** Gromel, Volmana and Rinaldo; the sword snaps on Gromel's helm.
4. `<<agility>>` **The Crypt Stair.** In the dream, the stair down to the sage's tomb under Golamira is broken: leap the fallen flights.
5. `<<puzzle>>` **The Axe on the Wall.** It hangs out of reach; knock its mount loose with the broken hilt.
6. `<<combat>>` **The Last Assassins.** Hold the room with the axe.
7. `<<combat>>` **The Demon.** Only the phoenix-marked blade harms it.

#### `e1m1` The Plain of Shamu (ch. I)

**Story.** Conan has led five thousand knights into Koth to aid Amalrus of Ophir, and Amalrus has betrayed him to Strabonus of Koth. Caught between the hosts, the knights charge again and again until "not one left the field alive." At sunset Conan stands alone "his back against a heap of dead horses and men", in black mail, with Ophirean knights in gilded mail, squat Shemites and Kothian knights ringing him. Strabonus calls for arrows; Tsotha-lanti says *take him alive*, swings down from his horse and walks through the pikemen, who shrink from his robe. "I offer you life, Conan." "I give you death, wizard," and the great sword swings, but Tsotha steps inside the blow and lays a hand on the king's bare forearm. A steel fang in his ring, steeped in the purple lotus of Stygia, drops Conan rigid to the earth: "the lion's fangs are drawn."

The level is the end of the battle, fought across the field toward the heap of dead where the book places the last stand. It can't be won; the more you kill, the closer the kings ride.

1. `<<combat>>` **The Broken Charge.** You come to among the dead of the last charge; Kothian knights on foot finish the wounded.
2. `<<agility>>` **The Gully of Dead.** A ditch choked with the fallen of the charge: cover from the first volleys, but its banks are steep, so leap down and jump the far bank.
3. `<<puzzle>>` **The Arrow Ground.** Shemite archers sweep the open field in volleys on a fixed cadence ("feathering them with shafts that found every crevice"). Cross it by the dead horses and the toppled standards, between volleys.
4. `<<combat>>` **The Shemite Line.** Close with the archers before they close the range; their spearmen screen them.
5. `<<puzzle>>` **The Riderless Horses.** Ophirean knights charge through the wreck ("Ophirean knights in gilded mail leaped their horses over mounds of corpses"). Read their lanes from the churned ground and step aside at the last moment; a knight unhorsed is a knight on foot.
6. `<<combat>>` **The Heap of Dead.** Your back to the heap, the ring of attackers: Kothian and Ophirean knights, Shemites, wave on wave; "about his iron-clad feet grew a ring of mangled corpses."
7. `<<combat>>` **The Kings Ride Up.** Strabonus, Amalrus and Tsotha ride in behind the pikemen ("giants in their steel caps and mail brigandines"); you can't reach the kings.
8. `<<puzzle>>` **The Wizard.** Tsotha walks to you through the pikemen and offers you life. You answer with the sword, as Conan did, and the ring's fang ends the level (scripted), fading to the Khorshemish splash.

#### `e1m2` The Pits (ch. II–III)

**Story.** *(The splash tells ch. II: Khorshemish, the kings, the descent through the citadel.)* Conan is chained to a ring in a vault under the citadel, a torch in a niche above him. Satha comes out of the dark, rears over him, investigates the torch; a drop of venom burns his thigh; he does not move, and she goes. A gigantic black slave comes through the grille with a huge sword and the keys he stole from Shukeli, taunts "Amra", names his price (the king's head) and raises the sword; Satha takes him from behind. The sword and keys fly from his hands, and the keys land almost at Conan's feet. The chain is too short to bend to them, so he slips one foot from its sandal and grips them with his toes, unlocks his chains and takes the sword. He runs for the grille; Shukeli, who followed his stolen keys, slams it shut under his fingers and bolts it, and Conan runs him through the bars. The bolt works only from outside: he is trapped. He takes the torch and seeks another way out, into the pits: the main corridor, Satha's hunting ground, "where the other monsters gave it room", with pits in its floor and dark side tunnels. Then he hears a woman weeping.

1. `<<puzzle>>` **The Vault.** Chained. Satha rears over you: stay still, because moving draws the venom. The black comes in with sword and keys and taunts you; Satha takes him. The keys lie beyond your hands; slip your foot free and grip them with your toes.
2. `<<combat>>` **The Grille.** Take the black's sword and run; Shukeli slams the grille and gloats through the bars. Strike before he backs away.
3. `<<puzzle>>` **The Main Corridor.** Take the torch from the niche. Satha's hunting ground: she passes on a fixed cycle ("forty breaths"); hide in the side alcoves when the torches bow.
4. `<<combat>>` **The Gnawed Tunnels.** A side passage and an old hall where the pits' nameless things den ("monsters with dripping jaws agape"); they scatter when Satha passes and come back when she's gone.
5. `<<puzzle>>` **The Corridor East.** Back along the main corridor past the serpent's hole on the next cycle.
6. `<<combat>>` **The Old Vaults.** Pillared vaults of the ancient works ("He did not dig them ... three thousand years ago"), full of things.
7. `<<agility>>` **The Pitted Way.** "Watching the floor ahead of him carefully, lest he fall into some pit": the pits span the way from wall to wall. Leap the first, cross the second on a single stone left standing in it, leap the third, while a thing drops from the roof between them.
8. `<<combat>>` **The Bone Pit.** The things' den at the end of the way.
Exit: the sound of a woman weeping down a smaller, dank tunnel.

#### `e1m3` The Tunnels Below (ch. III)

**Story.** Conan follows the weeping down a dank tunnel and finds no woman but a quaking jelly-thing with a frog's head, weeping from its blubbery lips; it titters and flounders after him, and he flees, doubting any blade could harm it. He takes a wrong tunnel and finds a well in the floor. A wind rises out of it, something bodiless floats up, and he flees in the dark. His torch is blown out, and he finds it again by its ember, back in the chamber where the tunnels cross. The presence comes again and he gets out. Back in the main corridor, Satha comes crawling, "sluggish from its recent grisly meal"; he leaps into a side tunnel and shakes out his torch. Beyond, he finds a cage of bars with a garden in it.

1. `<<puzzle>>` **The Weeping.** Follow the sound through a branching dank tunnel; it moves when you do.
2. `<<combat>>` **The Weeping Thing.** It can't be harmed. Flee down the far tunnel while the pits' things, driven ahead of it, block the way; the tunnel floor has fallen in, so drop into the break and jump the far ledge with them at your back.
3. `<<agility>>` **The Well.** A shaft across the tunnel floor, narrow enough to leap. The wind rises from below and leans your torch flame; something comes up out of it.
4. `<<combat>>` **The Dark.** The presence blows your torch out. Fight blind toward the red ember of the fallen torch; a gap in the black tunnel, faintly pale from below, has to be leapt in the dark.
5. `<<puzzle>>` **The Crossing.** The chamber where the tunnels cross. Relight the torch and find the tunnel back to the main corridor, read from the draft and the marks of the dead.
6. `<<combat>>` **The Side Tunnels.** Things in the tunnels off the main corridor.
7. `<<puzzle>>` **Satha Returns.** She comes up the corridor: get into a side tunnel and put your torch out before she reaches you.
Exit: the cage of bars with a garden in it.

#### `e1m4` Yothga (ch. III)

**Story.** Inside the cage stands a plant with a pale stem and livid blossoms; tendrils grip a man and its blossoms drink his soul. A key from Shukeli's ring opens the cage. The plant rears like a cobra; Conan cuts its stem and never touches its roots ("Yothga's roots are set in hell"). The man is Pelias, Tsotha's rival, held there ten years. They go back together; Satha rises before them, sees what Pelias is, and flees in fear. At the grille Pelias raises Shukeli's corpse, which works the bolt from outside and falls dead again.

1. `<<puzzle>>` **The Cage.** Which of Shukeli's keys fits: the lock and the ring tell you.
2. `<<combat>>` **Yothga.** Its tendrils lash and regrow; cut through to the stem. Touching the roots is death.
3. `<<agility>>` **Pelias.** He wakes and talks, and leads you by ways only he knows: ledges over the pits and breaks in the old works that you leap behind him.
4. `<<combat>>` **The Way Back.** The pits' things come at you both; Pelias is weak from his long sleep, so keep them off him.
5. `<<puzzle>>` **Satha.** She rises across the corridor. Stand by Pelias and do not strike; she flees from what she sees in him.
6. `<<combat>>` **The Last Tunnels.** Things scattered by her flight.
7. `<<puzzle>>` **The Grille.** Pelias raises Shukeli; the dead eunuch works the bolt.
Exit: the long stair up.

#### `e1m5` The Scarlet Citadel (ch. II–III)

**Story.** Up the long stair and through the brass, skull-crowned door. Conan expects "a rush of slaves, but silence gripped the citadel": Pelias's spell lies on Tsotha's household. Through the black corridor and the corridor of swinging censers, the way the king was dragged down, they come to Tsotha's chambers. They drink Tsotha's wine; "The dog knows good wine". Pelias shows Conan the crystal globe: a battle and a king trapped by treachery, and Tamar in turmoil. From the roof of the tallest tower Pelias calls a huge bat-like creature, and Conan flies for Tamar.

1. `<<puzzle>>` **The Long Stair and the Skull Door.** The brass door; the way the king was brought down, in reverse.
2. `<<combat>>` **The Black Corridor.** The spell is thin here: some of Tsotha's black guards stir ("until his soldiers awake and cut our throats"). Kill them before they rouse the rest.
3. `<<puzzle>>` **The Censers.** Sleeping slaves and guards along the censer corridor; pass without waking them.
4. `<<combat>>` **The Guard Hall.** A hall of Tsotha's black giants with their long axes, half-woken.
5. `<<puzzle>>` **Tsotha's Chambers.** The wine; the crystal globe, which shows Tamar.
6. `<<combat>>` **The Tower Stair.** The last waking guards on the stair to the roof.
7. `<<agility>>` **The Roof.** Across the citadel's battlements, leaping the gaps between them to the tower where Pelias calls the winged beast.
Exit: the flight to Tamar (splash).

#### `e1m6` The Tower of Tamar (ch. IV)

**Story.** Word of the king's death reached Tamar within hours. The barons deserted, the mob turned on Count Trocero, and Prince Arpello of Pellia took the city and proclaimed himself king. At dawn Arpello stands on the turrets of the great tower beside the palace, laughing down at the mob, with archers about him. Out of the crimson dawn a speck grows into a winged shape that swoops over the tower; a man drops onto the turret, and the crowd roars "The king!" Arpello leaps at Conan; Conan parries, seizes him "by crotch and neck" and hurls him a hundred and fifty feet to the pave. The archers break and flee, and the city rises against the Pellians.

1. `<<combat>>` **The Turret.** You land among Arpello's archers.
2. `<<agility>>` **The Leads.** Cross the tower roofs and the bridges between turrets toward Arpello, leaping the gaps under arrows from the far turret.
3. `<<combat>>` **The Archers' Turret.** Clear the archers who shoot down at the mob.
4. `<<puzzle>>` **The Broken Parapet.** Find the open edge where a man could be thrown.
5. `<<combat>>` **Arpello.** He leaps at you. Parry, then seize and hurl him from the parapet.
6. `<<combat>>` **The Tower Stair.** Pellian men-at-arms coming up as the archers flee; drive them down into the mob's arms.

#### `e1m7` The Relief of Shamar (ch. V)

**Story.** Shamar on the Tybor is under siege by Strabonus and Amalrus, with Tsotha beside them. The invaders have bridged the river with chained barges, and their siege towers, hung with raw bull-hides, roll against the walls. Conan comes with Trocero's Poitanian knights, Prospero, and a second army on ponies: stolid Bossonian archers and Gunderman pikemen. "It is King Conan!" Tsotha shrieks of sorcery. The Shemite archers, then the Kothian spearmen, then the mailed knights go in; Conan cuts through to Strabonus among his palace troops, takes an axe-blow on his helm and crushes the king's skull. Prospero kills Amalrus. The host breaks.

1. `<<combat>>` **The Ridge.** Down onto the plain with the Bossonians loosing over your head.
2. `<<agility>>` **The Siege Towers.** The towers mask any sortie from the city ("The men on the battle-towers can mask any sorties"). Fire or topple one, and Shamar's garrison sallies. Climb a tower's ladders and platforms to fire it from the top.
3. `<<combat>>` **The Shemite Archers.** The first of Arbanus's lines.
4. `<<combat>>` **The Kothian Spearmen.** With the Gunderman pikes beside you.
5. `<<puzzle>>` **The Press of Knights.** Find the gap the book's charge made, through the milling, disordered host.
6. `<<combat>>` **Strabonus.** Among his palace troops; his axe; the five-foot blade.

#### `e1m8` The Tybor (ch. V)

**Story.** The rout runs down to the river. The men of Shamar cut the barge bridge adrift and the fugitives drown. Tsotha has crossed already, riding hard across the meadow on "a gaunt weird-looking steed whose stride no natural horse could match". An eagle swoops at his steed and throws him. He faces Conan, swears his flesh will reunite, and hurls a globe that explodes in fire; Conan beheads him before he throws the second. The eagle takes the head, laughing in Pelias's voice, and the headless body staggers away after it.

1. `<<combat>>` **The Rout.** Along the river among breaking Kothians and Shemites.
2. `<<agility>>` **The Barge Bridge.** The men of Shamar are cutting it adrift. Leap from barge to barge while it breaks up under you.
3. `<<combat>>` **The Far Bank.** Fugitives who crossed ahead of you turn at bay.
4. `<<puzzle>>` **The Meadow.** Follow Tsotha's track across the sunset meadow; the eagle throws him.
5. `<<combat>>` **Tsotha.** His fire globes; close the distance and behead him.
Exit: the eagle takes the head (ending splash).

### Audit: the current build against this plan

| Where | Book | Current build | Fix |
|---|---|---|---|
| e1m1 | The plain of Shamu | *(was: not built)* | **Done**: built to the plan above. The charge, the volleys over the arrow ground, the Shemite line, three charge lanes, two waves at the heap (the second, with the pikemen, out of the kings' ground), the kings' lines from the book, Tsotha's offer and the fang |
| e1m2 | Keys gripped with his toes; Shukeli slams the grille; trapped; the pits behind | *(was: a rusted-link puzzle, a bone lure, soldiers in the pits)* | **Done**: rebuilt to the plan above |
| e1m3 | The weeping, the well and the presence, the torch blown out, Satha returns | *(was: marked ways, a vent puzzle, a hanging sigil-stone and a sigil gate)* | **Done**: rebuilt to the plan above. The weeping through the forks, the weeping thing and the things it drives, the well's breath, the presence and the torch's ember, the draft, the side tunnels, Satha down the corridor, the cage with a garden in it |
| Satha | "the great shimmering white form"; venom drips | *(was: green; spat)* | **Done**: white; drips |

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
| `e1m1` Plain of Shamu | Light puzzle (a combat level). The captains bawl before each volley, so dash from dead horse to dead horse between volleys; read the riders' lanes from the churned ground and cross each one while it stands empty. The level always ends with the scripted fang: answer Tsotha's offer with the sword |
| `e1m2` The Pits | Lie still while Satha passes (moving under her draws the venom); the strangler's keys land beyond your hands, so slip your foot free and grip them with your toes; Shukeli slams the grille, so strike through the bars before he flees |
| `e1m3` The Tunnels | Follow the weeping (wrong turnings grow fainter); flee the weeping thing; leap the well between its breaths; find the torch by its ember after the presence takes it; go where the air comes from (the flame leans away from the draft) before it comes up again; when Satha comes, get into a side tunnel and shake out your torch |
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
