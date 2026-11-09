# THE CIMMERIAN: THE SCARLET CITADEL

A free, non-commercial browser game: a first-person sword-and-sorcery adaptation of Robert E. Howard's *The Scarlet Citadel* (Weird Tales, January 1933). It is built on a pure-JavaScript WebGL port of the Quake engine. Story splash screens sit between the levels, the art direction is a strict minimal palette, and every set, map, texture and character is generated from compact AI-written specs rather than hand-modelled.

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
| 4 | The capital, Tamar, has fallen to riot and to the usurper Arpello. Conan duels him on a tower | Urban level, tower duel |
| 5 | The relief of besieged Shamar, the death of King Strabonus, the rout at the river Tybor, and Tsotha's end | Battle, two bosses |

### Optional prologue: *The Phoenix on the Sword* (1932)

This was the first Conan story published, and *Scarlet Citadel* follows on from it. It's a single tight arena: a dream crypt, then about 20 assassins in the royal bedchamber, then a demon. That makes it a good combat tutorial (Level 0).

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

**Splash processing (`splashgen.js`):** crop to 16:9, convert to greyscale, apply a levels/threshold step to the ink→bone ramp, ordered-dither to the palette, then add one scarlet accent mask that the AI specifies as a rectangle or polygon list.

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
- There is no post-process shader by default. An optional single-pass ordered dither can be toggled in the menu, and it's off on mobile.

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

```yaml
id: kothian_spearman
rig: humanoid
height: 56            # Quake units (player ≈ 56)
build: lean           # lean | normal | heavy | giant | dwarf
parts: {head: helm_conical, torso: scale_cuirass, arms: bare, legs: greaves,
        r_hand: spear, l_hand: round_shield}
ramps: {primary: bronze, secondary: earth, accent: scarlet}
anims: {stand: 8, walk: 8, run: 6, attack_thrust: 6, pain: 4, death: 8}
tris_max: 450
```

### Cast

| Character | Rig / build | Tris | Role and mechanic |
|---|---|---|---|
| **Player view-model** | Hands, sword, broken hilt, axe | 300 | First person, so the player model is only seen as weapons. The hero appears in full only in splash art |
| Ophirean knight | humanoid / heavy | 500 | Shield blocks from the front, slow |
| Kothian spearman | humanoid / lean | 450 | Reach attack, comes in groups |
| Shemite archer | humanoid / lean | 400 | Ranged, keeps its distance |
| Shukeli (jailer) | humanoid / heavy, robed | 450 | Taunts from behind the grille. Lure him close to the bars to strike |
| Black giant | humanoid / giant | 550 | Scripted victim of Satha |
| **Satha** | serpent, 12 segments | 120 per segment | Invulnerable set piece. Segments are separate entities following path corners. Its venom leaves damage zones, so you hide in alcoves |
| Pit crawler *(invented filler)* | ape / low | 350 | Common pit enemy |
| The Weeper / the presence at the well | none | 0 | Sound and particles only. Linger and you lose health; the presence is an invisible push toward the well |
| **Yothga** | tendril | 800 | Boss. Tendrils grab and pull you; sever them to expose the stem |
| Pelias | humanoid / lean, robed | 450 | Ally NPC. Drives off Satha and raises Shukeli's corpse to open the grille |
| Citadel servant *(invented filler)* | humanoid / normal | 400 | Light resistance during the climb |
| Tamar looter, Pellian soldier | humanoid / normal | 400 | Mob fights and street battles. Looters also fight soldiers |
| **Arpello** | humanoid / heavy | 600 | Tower duel boss. Disarm him, then kick him off the tower |
| **Strabonus** | humanoid / heavy, axe | 700 | Battle boss with charge and overhead attacks |
| **Tsotha-lanti** | humanoid / lean, robed | 650 | Final boss. Throws explosive globes (arcing, like grenades), uses a blinding dust flash, and short teleports |
| *Prologue:* assassins, Gromel, Volmana, Rinaldo, Ascalante | humanoid variants | 400–550 | Wave arena |
| *Prologue:* Thoth-Amon's demon | ape | 600 | Can only be hurt by the phoenix-marked blade |

The winged beast appears only in splash art, which saves a model and a flying level.

---

## 9. Level plan

| # | Map | Title | Story beat | Play | Size |
|---|---|---|---|---|---|
| 0 | `e0m1` | The Phoenix *(optional)* | *Phoenix on the Sword* | Dream crypt (explore; the dead sage marks your sword), then wake and hold the bedchamber against assassin waves. Your sword breaks on Gromel, so take the axe from the wall. The demon kills Ascalante, then you kill the demon | S |
| 1 | `e1m1` | The Plain of Shamu | Ch. 1 | Valley last stand against knights, spearmen and archers in waves. It's unwinnable: after wave 4 Tsotha appears and the ring fang fades the screen to the splash | M |
| 2 | `e1m2` | The Pits | Ch. 2–3 | Wake chained, Satha passes (hide from the venom), the giant dies and you get free. Lure Shukeli to the grille and kill him | M |
| 3 | `e1m3` | The Tunnels Below | Ch. 3 | Horror and stealth maze: the Weeper's tunnel, the crossing chamber, the ledge over the well with the invisible push, crawlers in side tunnels | M |
| 4 | `e1m4` | Yothga | Ch. 3 | Boss arena: free Pelias. On the way back Satha returns and Pelias drives it off, then raises Shukeli's corpse to open the grille | S |
| 5 | `e1m5` | The Scarlet Citadel | Ch. 2–3 | Climb through the mosaic corridor, the jet corridor, the brass skull-door and the gold-domed chamber, where the crystal globe shows Tamar burning. Reach the roof and mount the winged beast (splash) | M |
| 6 | `e1m6` | Tamar Burning | Ch. 4 | Streets of looting and riot, the market-square speech (ambient event), Trocero's camp as a resupply hub | L |
| 7 | `e1m7` | The Tower | Ch. 4 | Climb the great tower and duel Arpello on the turrets | S |
| 8 | `e1m8` | The Siege of Shamar | Ch. 5 | Siege lines, walls, then the battle plain with a few allied archers. Cut through to Strabonus | L |
| 9 | `e1m9` | The Tybor | Ch. 5 | Rout across the barge bridge, then the sunset meadow and the Tsotha boss. The finisher is his beheading, followed by the eagle ending splash | M |

Sizes: S is about 8–15 rooms, M about 15–30, L about 30–45 (rooms or areas, as counted in the level spec).

The "invented filler" enemies and the puzzle mechanics in section 10 are the only additions to Howard's plot. Everything else follows the text's own sequence of places and fights.

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
| `e1m2` The Pits | Chain-length radius → slip the wall ring at the rusted link (inscription) → **Satha passes on a fixed 40 s cycle**, so time your dash between alcoves → take a bone → throw it to make noise and draw Shukeli to the bars → strike through the grille → keys |
| `e1m3` The Tunnels | Scratches left by Pelias's dead apprentices mark safe routes. In the crossing chamber, set four tunnel valves so the draft (shown by torch flames) stops the presence pushing you into the well. Lower a hanging stone, which is the sigil-key for Yothga's cell |
| `e1m4` Yothga | Three tendrils regrow on a fixed timer. Cut all three within one 6 s window to expose the stem, then strike it. Pelias tells you the word that drives Satha off; say it at the right moment (an interaction) when Satha returns. He raises Shukeli's corpse, which unbars the grille from the inside |
| `e1m5` The Scarlet Citadel | The mosaic corridor shows a sequence of four beasts → set the brass skull-door's four rotating jaws to match → in the gold-domed chamber, turn the crystal globe to find Tamar (it reveals the beast's command word) → on the roof, speak the word to call the winged beast |
| `e1m6` Tamar Burning | A hub with a dependency graph. Find Athemides and escort him to the market square → his speech turns the mob → the mob opens the barricaded west gate → Trocero's knights enter → the tower gate unlocks. A side branch puts out the granary fire for extra supplies (optional, not on the critical path) |
| `e1m7` The Tower | Raise the lift with a counterweight in two stages (move two weights between pans). Arpello can't be killed with the sword: parry three times to disarm him, then manoeuvre him to the broken parapet (marked by a stain) and kick him off |
| `e1m8` Siege of Shamar | Turn two winches on the walls (each guarded) to raise the sally-port portcullis. The garrison sorties, the enemy lines break, and Strabonus is reachable on the plain |
| `e1m9` The Tybor | Cut the barge bridge's mooring ropes in the order the ferryman calls (downstream first) to break the bridge. Tsotha's ward is fed by three ensorcelled standards; cut them to drop the ward, dodge the globes, then finish him |

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
| Kick | Knockback, used to throw Arpello off the tower |

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
- A `team` field lets factions fight each other: looters against soldiers, and allies against invaders at Shamar.
- Set pieces are built from standard entities (`trigger_relay`, `func_train`, `path_corner`, `trigger_push`, `trigger_hurt`) plus a small `script.qc` that `mapgen.js` fills from each level's `script:` block.
- Armies are faked. Keep at most 16 live monsters near the player, and use billboard sprite crowds plus ambient battle audio beyond that.

---

## 14. Performance budget

Quake-era limits keep the game fast on laptops and phones. `budget.js` fails the build if a level breaks any of these:

| Metric | Budget |
|---|---|
| World polys visible from any point | ≤ 700 |
| Model triangles on screen | ≤ 2,500 |
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
