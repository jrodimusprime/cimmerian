# THE CIMMERIAN: THE SCARLET CITADEL

A free, non-commercial browser game: a first-person sword-and-sorcery adaptation of Robert E. Howard's *The Scarlet Citadel* (Weird Tales, January 1933). It is built on a pure-JavaScript WebGL port of the Quake engine. Story splash screens sit between the levels, the art direction is a strict minimal palette, and every set, map, texture and character is generated from compact AI-written specs rather than hand-modelled.

**Play:** https://jrodimusprime.github.io/cimmerian/ (the site opens straight into the game). [`game/`](game/README.md) is a playable vertical slice of e1m2 *The Pits*, prototyped on The Endless Cave's WebGL2 engine.

## The three absolute rules

> **1. The game is the book.** Every level is a stretch of Howard's *The Scarlet Citadel*. Inside a level, the beats happen in the order Howard tells them, with the people and creatures Howard puts there, in the places he puts them. Nothing may change *what* happens, *who* is there, or *where the story goes next*. A level may only add *how* a beat is played: the shape of a fight, a puzzle built from the story's own objects, more of the opposition the book already puts in that stretch. When in doubt, read the chapter (section 9 quotes every beat) and do what it says.
>
> **2. Every level lasts as long as a Quake level.** About 10–15 minutes for a first-time player (rule 3 sets the floor), a dozen or more encounters, and a run of distinct spaces, like Quake's E1M1. Where the book's beat is short, the level is made longer **inside the story**: more of the place the book describes (its corridors, side tunnels, turrets, battle lines), filled with the opposition the book puts there. Combat corridors are welcome; invented scenes, characters and detours out of the story are not.

> **3. The game lasts at least an hour and a half.** The campaign, `e1m1` to `e1m8`, must take a first-time player at least **90 minutes** in total; the optional prologue doesn't count toward it. That's at least **11–12 minutes a level** on average. Lengthen a short level the rule-2 way: more of the place the book describes, more of the opposition it puts there, more agility over its own ground. Never pad with invented scenes. Each level's length is checked at build time against its recorded solution (section 11): a first-time player is assumed to take about **4×** the bot's recorded run (an estimate until playtests measure it), so each golden run should last about **3 minutes or more** of game time.
>
> | Level | Golden run | Est. first-time (4×) |
> |---|---|---|
> | `e1m1` The Plain of Shamu | 2:12 (9496 ticks) | ~8.8 min |
> | `e1m2` The Pits | 4:08 (17822 ticks) | ~16.5 min |
> | `e1m3` The Tunnels Below | 2:15 (9732 ticks) | ~9.0 min |
> | `e1m4` Yothga | 3:24 (14682 ticks) | ~13.6 min |
> | `e1m5` The Scarlet Citadel | 3:14 (13991 ticks) | ~13.0 min |
> | `e1m6` The Tower of Tamar | 2:04 (8908 ticks) | ~8.2 min |
> | `e1m7` The Relief of Shamar | 3:24 (14701 ticks) | ~13.6 min |
> | `e1m8` The Tybor | 3:19 (14346 ticks) | ~13.3 min |
> | **Campaign** | **24:00** (103678 ticks) | **~96 min** |
> | **Total** | **≥ 90 min** | | |

**Play order.** The campaign is played in the book's order: it opens on the plain of Shamu, the king's last stand, and the pits come second.

| Play order | Map | Level | Book |
|---|---|---|---|
| 1 | `e1m1` | The Plain of Shamu | I |
| 2 | `e1m2` | The Pits | II–III |
| 3 | `e1m3` | The Tunnels Below | III |
| 4–8 | `e1m4`–`e1m8` | Yothga to the Tybor | III–V |

Map names keep the book's numbering; the play order is the table above. The optional prologue `e0m1` stands outside it.

Every level plan in section 9 marks its areas `<<combat>>`, `<<puzzle>>` or `<<agility>>`, and alternates fights with the other two.

**Agility (a standing rule).** Conan is a leaper and a climber, and every level has jumping in it: at least one `<<agility>>` beat per level, and more where the place allows. Gaps to leap, ledges you must jump to climb, leaps timed against a hazard, narrow ways over drops, often with something coming at you. Like a fight, agility is only *how* a beat is played: it is set in the book's own places (a floor broken by pits, a broken stair, the roofs of Tamar, the barge bridge on the Tybor), never in an invented detour.

Two design pillars:

- **Deterministic.** The same seed plus the same inputs always gives the same game. An AI agent can play, learn and replay it, and every level ships with a recorded solution that runs as a test (section 11).
- **Puzzle-gated progress.** Every level has a story-based puzzle chain declared as data. The build tool proves that it's solvable and can't get stuck (section 10).

---

## To do

From play-testing, in no particular order:

- Nothing open. Add play-testing notes here.

Done since the list was made: the pit-things' own poses on the goblin body (a hunched lope, rearing to strike, a lunge, falling on their backs dead, where before the body sank through the floor); the strangler's stride matched to the ground he covers (no sliding feet), and every walker's; sword cuts in three beats (wind-up, fast cut, follow-through) with the arm travelling along each arc, a real jab for the fists and a thrust for dagger and spear; **parry** in place of the kick (right-click or F: turns a blow aside and staggers the man who struck it); **spears** you pick up, thrust with or throw (G), that break after 5 uses, while enemy spearmen throw two of their three and then draw a sword; cheat mode (`?cheat=true`: god mode, and N skips the level); rotten plank bridges over the deep pits in e1m2 and e1m3 (they give way if you walk, hold if you run); monsters never walk into a pit or the water (a blow can still knock one in); a sound volume and an ambience slider in the pause menu, and the treble cut well down; Pelias's nipples (painted out of his old skin and the dents left in the mesh smoothed flat); levels e1m4 to e1m8 built and the campaign lengthened to about 92 minutes; a 5× walkthrough video of the bots' runs. Then: a **satchel** for food and drink (four pieces, H to use, walk over food to take it), rations left by fallen soldiers, more food where the fights are hardest, the Tamar stair and guardroom fought in two waves, and a bot that parries, sidesteps missiles and keeps its satchel stocked (five deaths across the campaign, from thirty); Satha darkened; the hand's jab and sword cuts re-posed with an upper arm, and a shackle that goes all the way round.

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

> **As built (the web game):** every man in the cast is a real CC0 human body from MakeHuman (MPFB), shaped per character with MakeHuman's body and face targets (Conan's V-shape and low, scowling brow; Shukeli's belly; Tsotha's vulture face). Each wears CC0 hair, eyes and brows, and armour built over him in headless Blender. The helms' **face masks are cast from each man's own face**, so the closed helms read as steel death-masks. The beasts are built in Blender too: horses on a skin-modifier skeleton, the weeping thing from metaballs, Yothga and the eagle from tubes and leaves. Satha's head and jaw are sculpted the same way. All of it is baked with ambient occlusion into one texture per piece, exported as `.glb` with a 23-bone skeleton, and posed in the game by the same pose library as before. The pipeline and its licences are in [`tools/blender/README.md`](tools/blender/README.md), and every model can be inspected at `index.html?cast` (front and profile; `?cast&face` for heads). The part-built rig below remains the fallback while models load.

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

Each level below tells its stretch of the book, then lists its areas in play order, marked `<<combat>>` or `<<puzzle>>`. Every area cites what in the book it is built from. Sizes and length follow rules 2 and 3: about 11–15 minutes, six to eight areas, a dozen or more encounters.

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
4. `<<combat>>` **The Dark.** The presence blows your torch down to a red ember in your fist; for seven seconds you fight by its glow alone, then blow it alight again. A gap in the black tunnel, faintly pale from below, has to be leapt in the dark.
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
| e1m1 | The plain of Shamu | *(was: not built; then a walled field)* | **Done**: an open plain to the horizon, closed by a stream, boulders and the ranks of the host. The charge, the gully of dead (agility), the volleys over the arrow ground, the Shemite line, three charge lanes, three waves at the heap, the kings' lines from the book, Tsotha's offer and the fang |
| e1m2 | Keys gripped with his toes; Shukeli slams the grille; trapped; the pits behind | *(was: a rusted-link puzzle, a bone lure, soldiers in the pits)* | **Done**: rebuilt to the plan above |
| e1m3 | The weeping, the well and the presence, the torch blown out, Satha returns | *(was: marked ways, a vent puzzle, a hanging sigil-stone and a sigil gate)* | **Done**: rebuilt to the plan above. The weeping through the forks, the weeping thing and the things it drives, the well's breath, the presence and the torch's ember, the draft, the side tunnels, Satha down the corridor, the cage with a garden in it |
| e1m4 | Yothga in the cage of bars; Pelias freed; Satha flees from him; the dead Shukeli draws the bolt | not built | **Done**: told in beats (`js/beats.js`). Cut the stem; Pelias follows; the old works and their breaks; the gallery, the ledges, the main corridor where Satha turns from Pelias; the dens, the warren, the ossuary and the way the things do not use; the grille, and the dead man's fingers on the bolt |
| e1m5 | Up through the citadel, its household asleep under Pelias's spell; the roof, the steed called | not built | **Done**: the long stair and the skull door, the black corridor, the censers (walk, don't run: running wakes the sleepers), the guard hall, the barracks and armoury, Tsotha's chambers, the tower stair, five gaps of battlements to the tallest tower |
| e1m6 | Tamar: Arpello in the tower, hurled from the parapet | not built | **Done**: the turret, the leads and their gap, the archers' turret, Arpello on the crown (hurled down), the tower stair, the lower stair and the gate-tower's household guard, out by the postern |
| e1m7 | The relief of Shamar: the ridge, the siege towers, the Shemites, the spearmen, the press, Strabonus | not built | **Done**: the Bossonians drawn on the ridge and the Gundermen beside you; two Shemite lines; two siege towers to climb and fire; the Kothian spearmen; the press of knights; Strabonus's palace troops, then Strabonus |
| e1m8 | The rout to the Tybor, the barge bridge, the meadow, the eagle | not built | **Done**: the Kothian camp and the rout along the bank, barge to barge across the river (rotten lashings), the far bank and the reed-beds, the meadow; Pelias's eagle throws Tsotha, who fights with his globes; it takes the head |
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
| `e1m3` The Tunnels | Follow the weeping (wrong turnings grow fainter); flee the weeping thing; leap the well between its breaths; blow the torch alight from its ember after the presence takes the flame; go where the air comes from (the flame leans away from the draft) before it comes up again; when Satha comes, get into a side tunnel and shake out your torch |
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
- Sound (`game/sound/`, all **CC0** from OpenGameArt, converted to mono MP3): [sword swings](https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes) and clashes (StarNinjas), [footsteps on stone and sand](https://opengameart.org/content/fantozzis-footsteps-grasssand-stone) (Fantozzi), [blows to the body](https://opengameart.org/content/40-wet-towel-clubpoundhitattack-sounds) and [men in pain](https://opengameart.org/content/15-vocal-male-strainhurtpainjump-sounds), [hit and death sounds](https://opengameart.org/content/5-hit-sounds-dying), [creatures](https://opengameart.org/content/80-cc0-creature-sfx) (the pit-things), [metal and wood](https://opengameart.org/content/100-cc0-metal-and-wood-sfx) (grilles, keys, chains), and the ambiences [dungeon](https://opengameart.org/content/loopable-dungeon-ambience), [dripping water](https://opengameart.org/content/dripping-water-loop) and [ambient horror](https://opengameart.org/content/ambient-horror). The plain's wind and distant battle are synthesised from these.
- Art: see `story/credits.json`. Every source is public domain or CC0, with the artist's death year recorded.
- The cast's bodies: [MakeHuman / MPFB](https://static.makehumancommunity.org/mpfb.html) base mesh, shape targets, game-engine skeleton and weights, and the [MakeHuman system assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) and [Skins 02](https://static.makehumancommunity.org/assets/assetpacks/skins02.html) packs (skins, eyes, eyebrows, hair). All **CC0**. The war-horse and Tsotha's steed are OpenGameArt's CC0 [Rigged Horse](https://opengameart.org/content/rigged-horse), and the pit-things its CC0 [Goblin](https://opengameart.org/content/goblin-1). Satha's head is "Snake" by Swp, supplied by the project's owner, its hide darkened to match her body (licence as supplied). The weeping thing is ["Oozey the Slime"](https://opengameart.org/content/oozey-the-slime) by Mophs (OpenGameArt, **CC-BY 3.0**, after a CC0 concept from Surt's scraps), animated in the game's code. Photographed skins for Satha's head are CC0 from [ambientCG](https://ambientcg.com/). The armour, helms, masks, robes, other beasts and weapons are this project's own. How they're built: [`tools/blender/`](tools/blender/README.md).
- This project: GPL-2 code, CC0 generated assets. Non-commercial fan work, not affiliated with any rights holder.


# TASKS

- [x] Level2:walking of the guy in the vault is weird stilll, the one that gets eaten by the snake. the snake should grab him and do something to him that would be interesting if you can pull it off
  - *Done:* a big man's pad (0.8 m steps, not the splits). As Howard tells it, the strike knocks him across the corridor, a stretch of Satha winds round him in tightening coils that hide him, his bones crack, and she carries him off down the corridor leaving a smear of blood.

- [x] Level3: the character does get stuck temporarily in one spot for ages
  - *Done:* the bot stood for 33 s and then 48 s in the dark swinging at pit-things still lurking unseen in their niches; it now leaves lurkers alone (the run is 47 s shorter).



- [x] general: torch still looks weird… use ome kind of fire effect there that is compatable with quake 1 at the moment it looksl like a weird poly flower
  - *Done:* every torch, brazier and candle (and the one in your hand) burns as a Quake-style flame: four frames of a cut-out flame sprite turned to the eye, full-bright. Also found that e1m4's torch was being switched off by a duplicate setting: it has its torch now.

- [x] Level4: make the plant look more magical and do magical style sfx, things to dodge maybe to make the gameplay more interactive
  - *Done:* from the book, "waves of changing hues surged over them" (pulses of colour run round its tendrils and blooms) and "he felt its hate emanate from it in almost tangible waves": once roused it rolls out a ring of livid light every 3 s that you must jump, with a low beating hum and a rattle of leaves.

- [x] level 4 has weird alien type creatures are they from the book? they feel out of place like aliens dude… if they are suposed to be npcs make sure they have hitboxes etc so you cant walk through them and make them move and respond to the player like running away
  - *Done:* they're the book's ("monsters with dripping jaws agape", "shadowy forms, monstrous and abnormal in outline"), and they're enemies, solid to walk into. Less goblin now: the great ears folded back, no loincloth or earring, a hide near the pits' black with burning eyes, and each misshapen its own way (a hunchback, a starveling). They behave as Howard has them, "something whimpered in fear and slunk away in the darkness": thrust a torch in one's face and it shies off, and a badly hurt one slinks away into the dark and comes back.

- [x] level 7: the relief of shamwar leel has weird looking ugly spear me that dontdo anthing - fix it, also the AI gets jammed walking up onto towers there so fix whatever that was.
  - *Done:* the allies were drawn with the old box rig because the level never loaded their built models; now they have them, and the Gundermen's surcoat is a dark field with a scarlet cross instead of stripes. The Gundermen march behind you in ranks and close with the Kothian spearmen and the press, spitting them on their pikes ("they were met by the spears of the pikemen"). The tower jam was an invisible ledge on every smoothed ramp (the step test compared the next cell with your feet, which sit below the cell's floor on a ramp): fixed in the step test, so nobody jams on the ladders.


- [x] general: on any open field level it should have more of the roman style arrow things everywhere to make the terrain more  challenging and provide natural looking mazes. they shouldn’t all be straight either so make more curves and complexit
  - *Done:* stake banks can now follow a curve (`stakes: [{ pts: [...] }]`, each stake-cell turned to the bend). The plain of Shamu has wings funnelling the attack into the arrow ground and a crescent before the heap. Shamar has curving banks on the Shemites' flanks and a crescent and hook in the press. The Tybor has the camp's bank curling round the river bank and earthworks on the meadow.

- [x] general: what happened to the level with the weird Thog thing concan encounters that we tried to make bloody? can you add that back in as it was part of the novel but spend lots of time making the creature look right
  - *Done:* that's the weeping thing in e1m3 (its den, then the flight), still there. Its body was a heap of rocky metaballs; now it's built each frame to the book: "an amorphic bulk" of "quaking, jelly-like stuff" (a see-through livid gel with clots and threads of blood sunk in it, its outline heaving on several waves, hitching itself along), "malformed tentacles … too short for its size", the frog-like head reared out of it with "great unstable eyes" that swell and shrink and "obscene blubbery lips". It sobs with tears dripping while it weeps, and shudders when it titters.


- [x] general: level 8 and level 1 - make sure there are squads of lets say 5 and 6 guys that move together that are tactically ard to kill
  - *Done:* squads (`squads: [groups]`, combat.js `squadChase`). Far off they come on as a body, abreast and at the pace of the slowest; close in they spread to ring you, each at his own bearing, and the blows come from whoever is furthest round your flank, never more than two at once. On the plain: the last charge and four waves at the heap (a fourth added). On the Tybor: the camp, a new rear-guard on the bank, the rout, the far bank and the reed-beds.

- [x] e1m3: you still get stuck at one bit for some time
  - *Done:* after the fight in the dark the bot stood 36 s at the crossing and then marched round through the side tunnels for a wine-skin 40 cells away by the path (its food run measured only straight-line distance); the same bug sent the e1m4 bot from the warren round the backway into the grille room. Food runs and targets are now limited by path length. It also cleared a pit-thing off the corridor roof before hiding from Satha, instead of being bitten in the alcove.
- [x] e1m4: a weird dude with arms in the air, walking through him, NPC behaviour dodgy
  - *Done:* that's Pelias, the man freed from the vine, who leads Conan out (ch. III). He stood nine seconds with both arms thrust out after the cut; now he stands head bowed, chafing his wrists, and at the grille puts one hand out to the dead jailer. He is solid, gives way when you back into him, keeps out of the fighting (backs off from any roused thing near him, an arm up), catches up by the way you came instead of popping in behind you, and his name shows when you look at him. Pit-things still clinging to the roof no longer block the floor beneath them.
- [x] general: the walking noise is way too loud
  - *Done:* footfalls about a quarter as loud, low-passed, each a little different in pitch and weight.
- [x] rule 3: the campaign was at ~84 min, under 90. The bot stopped wasting time (food detours, deaths), so the golden runs shortened; e1m3's dark gained an eastern loop and e1m1 two more waves at the heap. Still to lengthen, the rule-2 way: e1m2, e1m6, e1m4 (shortest runs).
  - *Done:* back over 90 (~92 min), all of it play: the fall of stones the weeping thing must bring down, the eastern loop of the dark, Yothga's thirty-second fight, the daze of a thing's bite in the pits, the heap's last waves.
- [x] e1m6: the tower stair's walls look 1px thick from outside
  - *Done:* the stair ran down directly against the open crown and the air, so its walls were bare planes with nothing behind them. It now runs inside the tower's wall, a full cell of masonry between it and the outdoors, entered by a doorway at its head: closed in on the way down, and a solid block with a sloping roof seen from the crown.
- [x] e1m1: more horses, heading at you then running off; ground they can't cross; a spiked pit to jump; (then) they were gone: put them back, riding one area and chasing you, the area full of spikes, and Conan's job to get out without being hit
  - *Done:* seven Ophirean knights ("leaped their horses over mounds of corpses") ride the riders' ground all the while, cantering their circuit, in sight from the Shemite rise (before, they only came out once you were on the ground, so you could miss them). Come onto it and they break off one by one, no more than three at once, put their horses at where you'll be, gallop past and wheel back into the circuit; standing in the open you are ridden down every few seconds. The ground is sown with stakes: two crescents, clumps of stakes and stake-pits a man can shelter by and a horse must go round, and along its far side a ditch sown with stakes the length of the field. The way out is across it without being ridden down, and over the ditch: no horse will take it.
- [x] the AI dies in the black tunnel (cheat mode)
  - *Done:* the AI replays the golden run's recorded inputs; the run itself doesn't die there, but a browser holding an older copy of the game's code (GitHub Pages lets it cache files for ten minutes) replayed a newer recording against it, drifted, and walked into the pit in the dark. Every script and recording is now fetched with a build stamp (a hash of the code, `test/build_stamp.sh`), so a new version never mixes with an old one; and each recording carries checkpoints every five seconds of play: if the replay ever drifts from them the AI stops and says to reload, instead of walking you into a pit. The pre-push regression checks the stamp and the checkpoints.
- [x] e1m3: the black tunnels are too dark when the wind blows out the torch; let it go to an ember and come back in 7 seconds
  - *Done:* the presence no longer tears the torch from your hand. It blows it down to an ember in your fist, a red glow that lights a few paces; seven seconds later you blow it alight again (it brightens as you do). The same the second time it rises.


- [x] strabonus palace troops area there is a gap you can get to before the level finishes… it should be guarded by troops that then abandon it.... theres also a heap of troops that walk around weirdly… if they must guard and stand still then so they should
  - *Done:* the road east out of the palace ground (the gap) is now held by a rank of Strabonus's household across its mouth, standing at their posts facing you: they fight whoever comes within a few paces and go back to their places rather than be drawn off, and when Strabonus falls and the host breaks they throw down the post and run ("The rank holding the road east throws down its spears and runs"). The Gunderman pikes, who had trailed along ten metres behind you all the way round the palace, now halt once the press is broken and hold the field in rank, standing still, facing the palace.

- [x] spear throwing animation also no good, spend some ime doing that properly
  - *Done:* a real throw now. The spear is drawn back over the right shoulder, tip up, and leaves the hand as the drive begins (not at the click); the empty hand drives on along the line of the eye and drops away; then the next spear (or the sword) comes up from below. A snap throw, about a tenth of a second back: quick enough to use in a fight. It flies from the throwing hand, off to the right, not from the middle of your face.

- [x] the toad guy should block an area at least so it has to be part of the game… make him accidetanlly remove an obstacle that blocks the corridor or something? I dunno get creative but realistic
  - *Done:* a fall of stones chokes the tunnel you flee down, floor to roof, nothing a man could shift; behind you the weeping thing comes on. It now hunts you down its tunnels by ear (it used to give up at the break in the floor and go home), it rears before it strikes (you can see it coming, and it turns slowly while it rears), and its whole bulk lurches forward with the blow. Stand with your back to the stones, let it come, and as it rears get across to the far wall: its lurch carries it into the fall, and the stones go over under its weight with a roar. Run on while it heaves itself out of the rubble. (It can flounder through the shallow break now too.)

- [x] the way the spears appear as you throw them and when they come towards you look a bit weird… like a pixel ball? imrpove that
  - *Done:* a thrown spear had no drawing of its own and fell through to the venom-glob mesh: the pixel ball. Spears in flight (yours and those thrown at you) are now the spear itself, the shaft laid along its path and the head leading; yours shows once it is clear of your eye, so its shaft never sweeps through the camera.

- [x] there is so little danger of death at the moment also wth damage… may have to think that through a bit because the big combat areas are fun now as you dont die every 3 seconds but lower combat zones like tunnels etc become too easy? suggest a few solutions
  - *Done (three of them):* the small fights are the pits and the tunnels, so the danger goes in there, as the things' own: (1) a thing's bite dazes you ten seconds (slow, no spring in a jump, the world reeling); (2) it bleeds a little more after (it weakens you; it won't finish you on its own; food and drink staunch it); (3) the dark is theirs: with your torch out, or down to an ember, they bite harder. Other levers if it still feels easy: things hunting in packs that circle and come at you from behind (as the squads do on the battlefields); fewer rations in the tunnels; a smaller satchel down in the pits.

- [x] the snake taking the guy in boaconstrictor way looks dumb make him take him in his mouth
  - *Done:* the wedge-shaped head darts over his shoulder and her jaws close on him across the middle, opened wide; she bears him off down the corridor crosswise in her mouth, bent over her jaws, his legs kicking (weaker and weaker), bones splintering, dripping a trail of blood on the stones, until her head goes down into the dark.

- [x] the walking animation for the guy who gets eaten by the snake is clunkly and weird looking, maybe make him run with a precanned animation and turn?
  - *Done:* the book has him pad into the vault, so not a sprint: a big man's quick, soft lope, low and forward, a long stride with the knees lifting, the free arm pumping bent, the hips rolling, the huge sword carried trailing; at a bend he turns into it instead of snapping round, and at the end he turns his whole body to you.

- [x] when the AI is facing off against the end level boss dude it should always face him, it shouldn't pass a level without doing that
  - *Done:* measured: the bot had its back to Arpello a third of the time he was within reach, and to Strabonus most of the time (fighting his guards, fetching bread, walking a route while he chased it). Now once a boss is roused and near it fights him face to face whatever it was about: he's always in its fight, it faces him through the whole of it (parrying blows that come from near his side, giving ground to any from behind his shoulder), never turns its back on him for bread, and stops a walk to face him (but not on a one-cell bridge over a drop). Checked across e1m4, e1m6, e1m7 and e1m8: it never looks away from a roused boss within 8 m. Arpello's household, Tamar's guards and Strabonus's palace troops now fight as squads (no more than two blows in the air at once), and there's food on the Tybor bank and the palace approach: no deaths across the campaign.

- [x] the plant you fight should have some special particle effects and shoot things with cool effects you have to dodge so the fight takes a while - at least 30s of fighting it is fair i think?
  - *Done:* it had been dying in about six seconds, and not even to the sword: blows knocked it about like a man until it slid over a pit and "fell". Rooted things don't move now. The fight has a rhythm: shut, its stem is a knot of fibre a blade barely marks; every six and a half seconds the livid blossoms spread wide and burn, spit three glowing seed-heads at you in an arc (they burst where they land in a cloud of crimson dust; get out from under them), and stand open two seconds with the throat bared, pollen drifting up off it: that's the time to cut. With its rings of hate to jump between, the bot takes about 32 seconds over it.

- [x] when enemies die they dont really ragdoll with phyics do they? it currently looks like an animation still and a bit dodgy
  - *Done:* the dead had a little physics (a topple about the feet, a slide, flopping limbs), but always straight over one way, landing at the same angle. Now the fall is a pendulum in two directions: the blow's push along his facing pitches him over, the push across it spins him onto his side (each man to his own lean), and he thuds, rebounds and settles; the body slides on along the floor with the blow, stopped by walls and furniture, and if it carries him over a step or a ledge he drops under gravity and lands with a jolt through every limb; the limbs swing with their own weight, overshoot and come to rest each in its own place.

- [x] the tall axe guy animations are weak, spend time fixing those
  - *Done:* Tsotha's black axemen have their own body now. At guard: hunched and wide-legged, the great axe held two-handed across the body, head down, glaring, the axe rising and falling with their breath; walking, a heavy stride with the axe carried. The blow: the axe heaved high behind the horned helm, the back arched and a foot stepping in, and there it hangs a heartbeat, trembling; then the whole body comes down behind it, sinking at the knee and bending at the waist, and the head of the axe bites the stones before his feet (sparks fly); it stays there a moment before he heaves it up again. Blocking, the haft comes up across him; struck, he reels.

- [x] you can walk through horses
  - *Done:* a horse is solid: you're stopped by it as by a wall.

- [x] horses get stuck in spike traps, make them only patrol areas without spikes.
  - *Done:* the horses ride only ground a clear cell from every stake and stake-pit, so they can't be caught in a pocket of them; the stakes are gathered into islands (two crescents, two stake-hedges, two pairs of pits) with clear lanes round them for the horses, and shelter in their lee for you.

- [x] make the horses try follow closely to conan when tehy pass - like changing their overall direction to the point where conan as to dodge then.
  - *Done:* a charging knight keeps hauling his horse round after you as he passes, for three seconds, before he wheels away: sidestep late, and keep moving, or get behind the stakes.

- [x] a horse hitting you is instant kill
  - *Done:* ridden down is dead.

- [x] restart level actually takes you back to the start
  - *Done:* Restart level reloaded the whole page, which put you back at the start of the campaign. It now begins the level you're on again from its own start, with exactly the health, weapons and satchel you brought into it.

- [x] the snake boaconstrictor thing looks lame. make the snake carry him off in his mouth please
  - *Done:* (as above) she carries him off in her mouth now; no more coils.

- [x] E1M6 still has some edges of the castle that look thin like 1px with sky behind them... maybe have to round them off with a curve wall around it so tehy dont look like pixels
  - *Done:* the roofs and leads ended in the bare edge of a slab against the sky. Every edge of a high masonry roof that drops away into the void now has a crenellated parapet (a low wall, merlons on it, and a round post where runs meet, rounding off the corners), solid, so you don't walk off it; the edges of gaps meant to be leapt are left open. Tamar's turrets and leads, and the citadel's battlements in e1m5, all have them.

- [x] if you get bitten by the little dwarf creatures it means you slow down for 10s and get dizzy so you cant make the jumps
  - *Done:* a pit-thing's bite dazes you for ten seconds (a fresh bite starts it again): your legs go to water (six-tenths speed), there's no spring in a jump (you won't clear a gap), and the world reels (the view sways and rolls, easing off as it passes). The first time, it tells you so. The bots learn to hold their ground and fight off what's biting them until it passes before they try a leap.

- [x] E1M4 ending area isnt clear it just looks like a room perhaps use a door
  - *Done:* the long stair now climbs from the grille room (two and a half metres over its length) and ends at a heavy door of black oak, banded with iron, in a frame of dressed stone, standing ajar with a light beyond it and a torch either side: through it, and the level ends.

- [x] the axe swing animation in the corridor of the censers the dudes with the axes should have a cooler and more menacing swing
  - *Done:* (as above) the axemen in the corridor of censers swing that menacing two-handed chop.


- [x] killing little black slave children seems weird right?
  - *Done:* right. The book has them as "naked slave-boys ... pouring wine": servants, not fighters, and the game had made them enemies. Now they're no foes of yours: roused, they run from you, and cornered they cower with their arms over their heads; your blows pass them by, and a room counts as cleared without them. (There's wine and bread they dropped in the corridor of censers.)

- [x] you dont die when you fall off the tower in teh air over tamar
  - *Done:* the air round Tamar's tower is a forty-metre drop whose bottom is the ground, and a fall only counted as deadly below the floor of the world. Now any drop of more than nine metres kills, wherever it ends.

- [x] e1m5: an example of a super thin wall (the night roof, by the tower stair)
  - *Done:* found by scanning every level for roofed rooms that open straight onto the sky: under an open sky the level builder drew nothing where open ground met solid rock (the world's edge), so a building's masonry had no outer face and no top, and its inner walls showed from outside as bare planes with a knife edge against the sky. On open levels a building now has a body: the masonry about a roofed room stands up to just over its ceiling with an outer face and a top, every roofed room has a roof over it, and a band of stone covers a ceiling's edge where a room opens onto the sky. The tower stair onto the battlements reads as a stone tower now, the stair turret on Tamar's crown as stepped masonry.


- [x] the gauardroom gate tower needs more furniture and fittings in it. it is also unclear how the level ends and there's a weird open platform you can wlk onto that doesnt look right... maybe add a drawbridge or something
  - *Done:* the guardroom of the gate-tower is the household guard's quarters now: bunks in the corners, a table with stools and candles, weapon racks and a spear rack on the walls, chains, braziers (the floor in the middle left clear for the fight). The open platform hanging in the sky was the postern: it's a vaulted gate passage in the north wall now, barred by a portcullis that is wound up once the household guard is broken ("someone in the gate-tower winds the postern's portcullis up"), with a heavy door standing ajar at its end on the street, a light beyond it and a torch either side: through the door, and the level ends.


- [x] theres a weird bug where low poly characters load then the better ones load later... just wait for the level to load
  - *Done:* the built models were loading in the background while the part-built stand-ins showed. Now a level doesn't begin until its cast has arrived (a line says the cast is coming up out of the dark if it takes a moment), and the next level's cast starts loading while you read its title card.

- [x] display health bar for yothu, make his attacks more damaging
  - *Done:* a roused boss now has his name and a blood-bar over the field (Yothga, and the other bosses too). Yothga's lash does 22 (was 14), a seed-head bursting on you 17 (was 12).

- [x] a lot of the cave floors are flat, make them more uneven and tunnel like
  - *Done:* the rough floors rise toward the walls, like a tunnel worn hollow down its middle, and are lumped and pitted between; you walk on it, it's not just paint. Never within two cells of a pit or ledge, so no leap is changed. Scree and fallen rock heaped at the foot of the cave walls, and dripstone hanging from the roofs, clear of your head.

- [x] generally improve the detail of the walls of castles so they have tapestries, fittings, metal weapon things that are empty, whatever else goes in a castle i guess
  - *Done:* new furnishings: woven tapestries on poles, iron candle-sconces (lit), arms on the walls (a shield over crossed blades, or the bare blades), empty weapon pegs, golden censers hung from the vault, carpets, divans heaped with cushions, iron-bound chests, casks. The conclave and corridors of e1m2, and all through the citadel in e1m5 (halls, the censer corridor, the soldiers' quarters, the gold-domed chamber, the stair), along with e1m6's furnished guardroom.

- [x] pelias doesnt actually hae a vine hanging from the roof so add one, in that room add more plant matter around so the plant makes sense
  - *Done:* Yothga's vine comes down out of the vault and is wound round Pelias in three coils while he hangs in its grip; cut, a severed stump hangs from the roof. The cage is overgrown: creepers hanging from the vault, pale stems and livid blossoms through it (clear of the stem and the way in).

- [x] make the put things voice sound less like a squeak. 
  - *Done:* their grunts, screeches and death-cries are played far lower (a deep wet snarl), with a growl under the death-cry; the synthesized fallback is a low rasp, not a 900 Hz whistle.

- [x] have less pit things generally by half but make them twice as dangerous, make their mouths more toothy and bloody
  - *Done:* every group of them in e1m2-e1m4 is halved (30 to 16, 36 to 20, 46 to 24); each bites for 18 (was 9) and takes 48 to kill (was 32), on top of the daze and the bleeding. Their mouths are crowded with crooked fangs on blood-black gums, gore hanging from them. (A crust and a water-skin in the cell by Yothga's cage.)

- [x] the axe men at the black corridor etc their axe swing animation still looks bad and one hand goes up for no reason eitehr, make it a diagonal slash where it throws its body, also make it wince in pain. fewer axe men are required but make them more dangerous in damage and harder to kill, half the amount
  - *Done:* the blow is two-handed now (the left hand on the haft, no hand flung up): the axe heaved up over the right shoulder and held there trembling, then high, then down across him to the left with his whole weight thrown after it (he lunges in with it) and the head biting the floor at his feet. Struck, he winces: doubled over, the free hand clutching the wound. 320 to kill (was 160), 32 a blow (was 20). There are five of them in the citadel now (were twenty-five): see the silent citadel below.

- [x] taking health and potions should be made simpler with an inventory when you press the escape button, in there show a simple inventory with counts. taking inspiration from all otehr novels add the potions and health potions likely that would be possible - this should change the dynamic of fighting... and help the player have a pause to take them during battle
  - *Done:* Esc opens your satchel with the pause: what you carry, grouped with counts and what each does, a button to eat, drink or apply each one there and then, with the fight held while you do (and your health, bleeding and daze shown). It holds 8 now (was 4). Two potions from Howard's other tales, found rarely from e1m2 on and kept for when you need them (never drunk when you pick them up): the golden wine of Xuthal ("The Slithering Shadow": it heals all, and clears bleeding and daze) and a wound-balm (+20, stops the bleeding, clears a bite's daze). H still eats from the satchel, food first, keeping the potions back.

- [x] theh door at the end of E1m6 needs a better design to make them look more oaky. take some free art for it perhaps
  - *Done:* the door is rebuilt: five boards of old black oak (a new grain texture, knots and all, darker at the foot), ledges and a brace behind, three studded strap hinges with curled ends, nail-heads down every board, a ring on its plate, a stone sill. Every heavy door in the game uses it (e1m2's brass door, e1m4's stairhead, e1m6's postern).

- [x] some of the walls now they are thicker have pixel gaps between them. ensure they are done properly.
  - *Done:* two places a sliver of sky could show through: where neighbouring masonry tops differed by less than 5 cm no side was built (now any step gets its face), and masonry standing above a neighbouring room's roof had no face down to that roof (now it has). If you still see one, tell me where.

- [x] E1m7 there are archers on my side i think but i can walk throgh them.
  - *Done:* the Bossonian archers on the ridge are solid now: you shoulder past them. (The Gundermen in the thick of the fighting you can still slip between.)

- [x] E1m7 has a confusing layout where you have to stand on top of towers to trigger things... redesign the middle part of the map with the towers but make it more complicated, like have it walled off but you have to go inside those towers to walk down and through? makes it a more fun interactive map
  - *Done:* the middle of the plain is rebuilt. The siege lines of Koth run right across it: an earth bank faced with timber, 7 m high, a wall-walk along its top between two breastworks, and two siege towers built into it, hung with raw bull-hides (before, the "towers" were bare earth mounds with ramps, standing in strips of grey water, and you could walk round them). There's no way over but through them: in at the foot of the north tower, up the stair that turns round its solid core to the top, out onto the wall-walk and along it, fighting its sentries, into the top of the south tower, down round its core and out at its foot behind the lines. Each tower has its own guard, the stair is lit by a lantern, and there's food along the way. Trocero and Prospero hold the north tower's foot and bring the knights round when you're over; the Gundermen keep this side of the lines till you are across, then come up behind you. (New in the engine for it: `solid` rooms, masonry or earth with its own top height and texture, so an open level can have sheer walls and buildings with roofed rooms inside them; a roofed cell open to the sky no longer has its walls run up into the sky.)

- [ ] E1M8 put an underground trench to get through a wall of pikes, like a sortof man height trench you cant jump out of where troops are inside to make it more dynamic


- [x] Conan's defiance before the kings (ch. II) is one line on the e1m2 splash screen.
  - *Done:* e1m2 opens in the citadel now, in the chamber domed with carven jet: Strabonus and Amalrus on their divans (Strabonus drinking), Tsotha before you, the black giants on either side with their axes. You hear them out and answer them (E): the "swine my kingdom" and the "abyss of naked barbarism" speech; Tsotha's parchment (abdication in favour of Arpello, five thousand lunas) and your refusal; Amalrus's "You're a fool!", and you spit in his eyes. He rushes you with his sword, Tsotha stops him and blinds him with the Stygian dust. Then the blacks march you out behind Tsotha, through the corridor of censers and the corridor of jet to the brass door where Shukeli waits, and the scene cuts to the vault: Tsotha's farewell ("In ten days I will be in your palace in Tamar ... flay their dainty skins"), your Cimmerian curse, and he slides home the grate. This is the heart of the story:

he refuses to abdicate in favour of Arpello;
he gives the "I climbed out of the abyss of naked barbarism to the throne" speech and spits in Amalrus's eyes;
Tsotha blinds Amalrus with dust, and promises to flay Conan's women in Tamar in ten days.

- [x] Trocero is never in a level.
  - *Done:* the globe shows the knights of Poitain hooted out of Tamar; in e1m6 a rider goes after him; at Shamar (e1m7) Count Trocero and his captain Prospero ride at your side, mounted, from the ridge down across the plain; when you reach Strabonus, "Trocero and his house troops, hewing desperately, cut their way to your side" and cut down the spearmen on his flanks (his palace troops now hold their posts round their king); Prospero's two-handed sword for Amalrus as before. He holds Tamar for Conan and is driven out, then rides beside him at Shamar with Prospero. His model exists, but he isn't placed anywhere.

- [ ] Shamar (e1m7) has no cavalry battle. In the book:
Conan rides a black stallion in black armour under the lion banner;
the Bossonian arrows wipe out Koth's front rank, and their commander Arbanus dies;
Conan's knights charge through.
In the game you're on foot and the archers are background scenery.

- [x] Tamar's tower (e1m6) is in the wrong order, and its iconic ending is missing.
  - *Done:* the beast sets you down on the turret of the great tower itself, where Arpello is laughing down at the mob ("Fools! Howl as you will! Conan is dead and Arpello is king!"); "The king! It is the king!"; Arpello stands transfixed, then leaps at you, alone; you parry, grip him by crotch and neck and hurl him far out. His archers' nerve breaks and they flee across the leads, the councilmen sally from the palace, and you rock and sway on the battlements roaring with gargantuan laughter. Then down through the tower, where his household guard still hold the stair and the gate-tower (four fewer of them), and out by the postern; and a rider is sent after Trocero.

Arpello should be on the tower shouting "Conan is dead and Arpello is king!", leap at Conan the moment he lands, and be thrown off straight away.
The chapter ends on Conan "roaring with gargantuan laughter" on the battlements.
The game makes you clear the archers first, then fight your way out by a back gate.
- [x] Tsotha's last words and Conan's closing line are cut (e1m8).
  - *Done:* "Again we meet, wizard!" and his "Keep off! ... the bits of flesh and bone will reunite and haunt you to your doom! I see the hand of Pelias in this, but I defy ye both!" as he faces you; "I am Tsotha, son of—" as the sword takes his head; the eagle and the headless body as the book tells them; and the last word yours: "Crom! A murrain on these wizardly feuds! ... What would I not give for a flagon of wine!" Missing: "Again we meet, wizard!", Tsotha's "I am Tsotha, son of—", and Conan's "Give me a clean sword and a clean foe… What would I not give for a flagon of wine!"

- [x] The crystal globe shows the wrong things (e1m5).
  - *Done:* you look into it yourself now (E): Shamar besieged under the moon, then Tamar: Poitain's knights hooted out of the gate, Pellian men-at-arms on the towers, and over all Arpello's face; Pelias on why the people turned; your "If I but had wings to fly like lightning to Tamar!", which is why he takes you up to call the beast; and on the tower his "At dawn the people of Khorshemish will know they have a new master ... I will meet you in the plain by Shamar." (The "king trapped by treachery" is back where the book has it: Pelias reading your mind in the cage.)

It should show Shamar under siege and Arpello's face over Tamar, and Conan's "If I but had wings" is why Pelias calls the flying beast.
Pelias's promise "I will meet you in the plain by Shamar" is missing, so the eagle with his voice in e1m8 comes from nowhere.

- [x] The citadel is silent in the book, but the game makes it a fight.
  - *Done:* it is silent now. Up the long stair, through the skull door, the black corridor, the censers: "Still they saw no one." Pelias: "The slaves and soldiers are quartered in another part of the citadel ... drunk on wine or lotus-juice." The golden-silled window and the stars, the gold-domed chamber, the wine poured as the book has it, the crystal, the gold-worked stair to the pinnacles. No mail: you go to Tamar half naked. Tsotha's black guard lies drunk in its quarters off to the west, five of them: let them lie, or go in softly among them. "Silence gripped the citadel… Still they saw no one", yet e1m5 has five fights. Conan also puts on mail there, which contradicts him landing on Tamar's tower "half naked" in ch. IV.

- [ ] The chase across the river (e1m8) is missing. Conan rides after Tsotha alone, "leaping his steed from boat to boat" as the boat-bridge drifts apart. In the game you're on foot and Tsotha has already crossed.

- [x] Pelias's best lines are cut or replaced (e1m4).
  - *Done:* back as the book has them: the year ("the tenth day of the month Yuluk, of the year of the Gazelle"), Namedides strangled on his throne, the stem and the roots ("Yothga's roots are set in hell"), Pelias's name and his ten years, his reading of the battle in your mind; Satha and the ten acolytes; Tsotha's demon birth, cut off by Satha rearing; the snake's fear and "he saw my naked soul"; and at the grille "Rise, Shukeli! Rise from hell ..." Missing:

"Why did you cut the stem instead of tearing it up by the roots?", with Conan's reply;
"he saw my naked soul";
the spell over dead Shukeli: "Rise, Shukeli! Rise from hell…";
Tsotha's demon birth, which sets up "son of—".

- [x] The city's sortie is given to Conan (e1m7).
  - *Done:* you no longer climb and fire the siege towers, and Strabonus no longer waits on them: their guards come down off them at you, and when Strabonus falls, "behind the dazed and stricken invaders goes up a mighty clamour and the blaze of a huge conflagration": Shamar's defenders sally, cut down the men in the towers and burn the pavilions and the engines, as the book has it. In the book, Shamar's defenders sally out and burn the siege engines after Strabonus falls. In the game Conan fires the towers himself, and Strabonus can't die until he has.

- [x] e1m3: the frog thing: wall you in as well, the thing comes in to kill you and busts both walls open, and you run; and its hitbox (you could walk inside it)
  - *Done:* round the bend into the north tunnel with it after you, the roof comes down behind you too: walled in between two falls. It hears you and comes straight for the stones behind you and bursts through them; with your back to the far fall you dodge its lurch, and its bulk brings that fall down; out, and run. Its body is solid all the way to the edge of its jelly now (1.45 m, not a man's 0.42), for you and for its own movement, so neither of you ends up inside the other; it rears and strikes from that distance.
- [x] another iteration on the jelly frog beast
  - *Done:* the body is clearer, quaking jelly with the dark knot of its guts heaving inside it, seen through it; twelve stubby tentacles lying out round it, tips curling, now and then one lifting to grope, pale suckers under them; a lower jaw that hangs open as it titters and gapes as it rears, a wet red mouth and tongue in it; a pallid throat-sac that swells with its sobs; bigger, bulging, swelling eyes.
- [x] the axe guys' left arm is still in the air
  - *Done:* found it: his resting stance (standing, walking, closing in) held the left fist up by his chest, gripping nothing. The left arm hangs at his side now; the wince presses that hand to his belly instead of throwing it up; both hands go to the haft only for the blow.
- [x] some tapestries are floating in the air
  - *Done:* the dressed-stone walls are set back from the grid line at their corners and bow back between floor and ceiling (by up to a third of a metre), and the hangings were hung on the grid line in front of them. Every hanging, banner, arms-trophy, peg-rail, sconce and chain is hung on the wall as it really stands now. (Also: one tapestry that shared its place with a torch, and chains on top of another torch, moved.)
- [x] e1m2: the king doesn't sit right; the black guy walks funny: you pass out asleep and he wakes you up instead
  - *Done:* Strabonus and Amalrus sit on their divans now (back on the cushions, thighs level, knees bent, shins straight down, hands on their thighs, Strabonus at his wine). In the vault, after Tsotha's farewell and the serpent's venom, weariness takes you and you sleep; a foot jars your ribs and you wake with the strangler standing over you, the grille half open behind him. No walk.
- [x] the map is confusing at times: an explored map, top right, in a bubble
  - *Done:* a round map in the top right of everything you have seen of the level (round about you and not through rock; in the open, farther), turned to your heading with you at its heart, north marked, the walls' edges drawn, pits dark, Pelias a green dot. M hides or shows it.
- [x] e1m7: dudes walking around randomly with spears that don't do anything (they were meant to guard the exit); no horses at all
  - *Done:* the rank holding the road east stands at its posts and fights whoever comes close; when Strabonus falls they throw down their spears and run, each down his own lane, and are gone in two or three seconds (before, all five ran for one point, jammed against each other and the braziers, and shuffled there with their spears forever). The tower guards had the same ids as the gate rank: given their own. And no horses in e1m7 at all: Trocero and Prospero are on foot at your side, no dead horses on the field.
- [x] e1m2: the king still doesn't sit on the seat right
  - *Done:* the divans were a metre deep and the kings sat on the very front lip with their legs hanging off. Each divan is a real couch now (seat 0.66 deep, back and arms, bolsters at the ends), and each king sits back in it against the cushions, thighs on the seat, knees at its edge, feet on the floor.
- [x] e1m2: the chain you get pulled around on doesn't look right
  - *Done:* through the conclave and the march a chain ran from your feet, up into the air and right across the citadel to the vault's ring; now there's no chain until they make you fast in the vault. The ring is a real ring now, hanging from a staple leaded into the wall's face (it was a lump of studs). The chain hangs from the bottom of it, simulated link by link (in the render only): it lies in a loose curve on the floor when you're slack, comes up taut and straight when you strain at the end of it, and drops in a heap under the ring when it parts.
- [x] stop the snake from shooting poison
  - *Done:* Satha spits nothing now: no venom thrown, no burning puddles. As in the book her venom only drips from her fangs, "a colorless liquid that he instinctively knew was death", a clear drop now and then as she goes; the drops on your thigh while she's poised over you, and her bite, are as they were.
- [x] e1m7: the spear dudes that don't do anything, and you can walk through them
  - *Done:* the Gunderman pikemen marching with you were the one body in the game nobody collided with: you, the enemy and Trocero all walked through them. They're solid now. They also got jammed against the spearmen's stakes (a rule that kept them apart shoved them without regard to walls), so they hung back out of the fight; it's gone, and they come up and fight again.
- [x] nobody should be able to walk through anyone
  - *Done:* checked by replaying every level's golden run and testing every tick for a body inside another. Besides the Gundermen: the standing allies (the Bossonians on the ridge) and the kings' horses on the heap block the enemy as well as you; Trocero and Prospero are solid; at Shamu two pairs of men from different waves (second and third, fourth and sixth) stood on the same spot, and on the Tybor two of the rout stood inside the rear-guard (sharing their ids too); all placed apart.
- [x] the frog monster still is not ideal: three free models to compare
  - *Done:* three found and rendered in the game in its den, at its size: Slime Mold (Grefuntor, CC-BY 3.0), Oozey the Slime (Mophs, CC-BY 3.0) and Frog Guy (Drummyfish, CC0). Oozey was picked: a mound of ooze rising into a frog's head, a gaping toothy maw, eyes on stalks. It is a static mesh, so the game makes it live: it breathes and quakes, heaves with its sobs and shudders as it titters, rears back before a strike and lunges forward into it, hitches its bulk as it moves, and drools from its lip. Scaled to 3 m across, the size of its body. Credited in §17.
- [x] make the maps look cooler: textures, look, style; an hour of iterating on each level
  - *Done:* all of it drawn only (the sim, the bots and every state hash are unchanged). **Everywhere:** a sky of its own, per pixel (a sunset of banked clouds lit gold toward a barred sun over far ranges; a crimson dawn, violet above, at Tamar; a night of stars, a river of them and a moon over Khorshemish), and an ordered dither before the palette snap, so gradients stipple as Quake's did instead of banding. The stone redone: dressed blocks with lit and shadowed arrises and thin joints, raw rock bedded in layers and split along wandering joints, bedded limestone with wet flowstone, trodden mud with a few stones, tufted turf, finer ashlar, carven jet with dark jewels, the Scarlet Citadel's own red stone, lapped and laced bull-hides on the siege towers. Baked occlusion: walls dark at their feet and under the roof, floors dark along the walls. Dressed corridors ribbed in bays, each arch on pilasters. Caves: walls broken into ridges and hollows, flowstone drapes, puddles, water dripping from the roofs, pale motes rising out of the bottomless drops. Bones with knuckles, ribs and skulls with sockets; open water takes the sky's glare; wall sconces light their walls; the torch reaches further. **e1m1:** the volleys' arrows slanting in the turf, broken lances against the sky, shields, mounds of dead, grass, torn banners on the heap, a thinner mist. **e1m2:** slime seeps and pale fungus glowing jade in the pits; the conclave's jet carven, lit up from its braziers. **e1m4:** the ossuary's walls shelved in tiers of skulls. **e1m5:** Khorshemish lamplit below the battlements, the moon lighting what stands under the sky; the citadel red; Tsotha's chamber gold-domed; the tower stair marble. **e1m6:** Tamar below the leads and its multitude in the square. **e1m7, e1m8:** Shamar's walls and towers on the skyline; the wreck of the battle; reed-beds along the Tybor.
- [x] e1m2: when the guy is walking you with the chain, you can't see the chain; he should have two men walking with him, protecting him, until you are in the dungeon
  - *Done:* on the march from the conclave down to the vault one of Tsotha's blacks walks before you with your chain in his fist, and you see it, running from your manacles to his hand, sagging between and dragging if you lag. Two more walk at his shoulders with their axes, and the fourth at your back; Tsotha leads. They keep their places all the way down to the brass door (before, the four walked at your elbows and behind you, where you never saw them).
