# The game: e1m2 "The Pits" and e1m3 "The Tunnels Below"

Two playable levels: **e1m2, The Pits** (README §9, milestone M4) and **e1m3, The Tunnels Below**, built on the engine from **The Endless Cave** (`colossal_cave_adventure_3d`): pure JavaScript and WebGL2, no build step and no asset files. It is drawn in the Quake manner: low resolution, every pixel snapped to the game's palette, banded light and a dark haze.

**Play:** https://jrodimusprime.github.io/cimmerian/ (the site opens straight into the game), or open `index.html` in a browser. Everything is generated at load time. A five-second title card opens the game, and each level opens with its story splash. `?level=e1m3` starts at the second level.

| Key | Action |
|---|---|
| W A S D, mouse | Move and look (Shift to run, Space to jump) |
| E | Use: read, take, try doors, wind winches |
| Click | Strike (click, click, click for the sword's three-blow combination), or throw the bone you're holding |
| Right-click, F or Q | Kick: knocks men back, staggers them and breaks a shield's guard |
| 1 2 3, mouse wheel | Fists, dagger, sword |
| Esc | Pause (brightness, mouse sensitivity, restart) |
| P, K, F3, F4 | Render resolution, sound, debug line, the palette (Quake look) on or off |

## The levels: puzzle areas and action areas

Each level alternates puzzle areas and action areas (README §9). The HUD names each area as you enter, and entering one sets a checkpoint. When you die, enemies go back to their posts but keep their wounds, as Quake's monsters did.

### e1m2, The Pits

About 5–10 minutes, with 12 enemies plus the jailer.

| # | Area | Type | What happens |
|---|---|---|---|
| 1 | The Cell | puzzle | You wake chained. An inscription names the rusted link; grinding it frees you |
| 2 | The Hall of the Serpent | puzzle (timing) | The black strangler comes with a huge sword and Shukeli's stolen keys to gloat over "Amra", and Satha's first pass takes him instead. **She passes every 40 seconds**: the torches gutter and the floor rumbles about 5 seconds before her head comes up out of the well. She fills the hall and spits at anything she can see, so get into an alcove. Take his sword |
| 3 | The Wardens' Post | action | Picking up the sword brings a Kothian guard up the south passage. Beyond it is the post: a guard, a Kothian spearman, and a Shemite archer on a gallery |
| 4 | The Grille | puzzle | Throw a bone against the bars from the dark niche. Shukeli waddles over to look; if he can't see you, strike him through the bars. Take his keys |
| 5 | The Guardroom and Barracks | action | His death-squeal raises the alarm. Four guards come to the bars and fight you through them, then in the guardroom |
| 6 | The Winch | puzzle | The portcullis winch's pawl is broken, so the portcullis falls when you let go. Jam the ratchet with a spear from the barracks rack |
| 7 | The Captain's Landing | action | One of Tsotha's black giants with a long-shafted axe (he blocks every frontal blow until kicked) and three soldiers, then the stair |

### e1m3, The Tunnels Below

About 5–10 minutes, with 14 pit-things and the weeping thing. Conan carries a torch through the tunnels, as he does in the book, and it gutters in the well's draft.

| # | Area | Type | What happens |
|---|---|---|---|
| 1 | The Marked Ways | puzzle | Pelias's dead apprentices marked the safe road with three cuts. One cut is a drop under rotten planks; two cuts hides something on the roof |
| 2 | The Warren | action | A pack of the pits' nameless things, two of them waiting on the ceiling |
| 3 | The Crossing | puzzle | Four vents breathe from the well (the book's "presence"). The flames over the ledge lean with the draft, and the draft pushes harder than you can run. Find the setting that makes them stand straight. Closing every vent pushes the other way |
| 4 | The Weeper's Lair | action (flight) | The weeping thing can't be harmed by a blade (in the book Conan fled it). Snatch the windlass crank from the dead apprentice and run; it won't follow you out of its tunnels |
| 5 | The Hanging Stone | puzzle | Swing the boom over the floor first, then let the stone down. Lower it over the shaft and the deep has it |
| 6 | The Sigil Gate | action | Set the sigil-stone. The slab sinks slowly while six things drop from the roof |

**Combat** (README §13):
- **Fixed damage.** The same blow always does the same damage.
- **Telegraphs.** Every enemy blow is telegraphed by a wind-up of at least 0.4 seconds, so you can step out of it.
- **Shields.** Wardens block alternate frontal blows and the captain blocks every one, but a kick breaks any guard.
- **Kicks.** Knockback can put a man into the serpent's well, and Satha crushes wardens as readily as you.
- **Archers.** They keep their distance and lead their shots.
- **Pathing.** Enemies path with a flow field over the level grid.

## The cast

Only characters and creatures from Howard's text (README §1, *Canon cast only*).

| Model | Look |
|---|---|
| The black strangler | Ogre-built and bare-chested, with a heavy brow over sunken eyes, bared teeth, scars, iron armbands and rings in his ears |
| Shukeli | Bloated, sallow and blotched, with a leering mouth of teeth, jowls and a double chin, a bell robe with a jade hem, a sash, slippers, and the ring of keys at his belt |
| Kothian guard | A closed great helm with an eye-slit and breathing holes, spiked pauldrons, mail under a blood-stained scarlet serpent tabard, sword, a painted shield with a spiked boss |
| Kothian spearman | A kettle hat over a mail coif, the face veiled to the eyes, spear |
| Shemite archer | A deep leather hood with the face lost in shadow, leathers, quiver, recurve bow |
| Black axeman | One of Tsotha's black giants: a horned great helm with a scarlet crest, a scarlet cloak, spiked pauldrons, a long-shafted axe |
| Pit-thing | The pits' nameless things: pale, gaunt and rib-thin, long-armed and clawed, on all fours, with ember pin-prick eyes and dripping jaws. They cling to the roof and drop |
| Weeping thing | A quaking jelly mass with short tentacles, a frog's head, great unstable eyes and blubbery lips. It weeps like a woman and titters when it sees you |
| Satha | A sculpted head with a hinged jaw, slit-pupil eyes, fangs and tongue; her body is one smooth, scaled tube rebuilt every frame along her spine |
| The hero (first person) | His manacled right hand: a muscled forearm with veins and a scar, a riveted cuff with a broken chain, jointed fingers with nails |

Every human enemy stands like Quake's killers: hunched, knees bent, head thrust forward. All of them are built from compact specs, as README §8 and MODELS.md require: a 14-bone humanoid rig with rigid parts, smooth lofts and lathes for the body, and outfits as per-role overlays. They're posed procedurally (idle, walk, wind-up, strike, block, pain, stagger and death) and lit from the direction of their strongest nearby light, as Quake lit its alias models.

Story splashes (README §12) bracket the level. Each is painted as a tonal scene (a Piranesi-style vaulted arcade with a stair, a bridge and chains, plus Satha or a torch-bearer), then engraved with anti-aliased hatching whose line weight carries the tone. Each has one scarlet accent.

## How it maps to the design

| README | Here |
|---|---|
| §5 level spec | `LEVEL` in `js/level.js`: areas, rooms, links, props, entities and a `puzzle:` block in the YAML shape, built into a grid |
| §7 palette | 128×128 textures built from the ramps: irregular hewn courses, worn flagstones, rotten straw, dripping cave rock, mud. A large-scale grime map breaks up the repetition across every surface. Every clue is carved into its wall as pale, unreadable glyphs. The final image is snapped to the 128-colour game palette through a lookup table (the Quake look, F4) |
| §9 pacing | The `areas:` list in the spec, with a `type` of puzzle or action |
| §10 solver | `solvePuzzle()` searches every flag state. It logs at load: e1m2 *21 states*, e1m3 *9 states*, goal reachable, no softlocks |
| §11 determinism | Fixed 72 Hz tick, seeded RNG for every sim decision (AI included), FNV-1a state hash |
| §11 agent API | `window.CIM.step({forward, side, yaw, pitch, use, attack, kick, weapon, run, jump}, ticks)` returns an observation, including every enemy. Load with `?agent` to skip the splash |
| §11 recorded solutions | `test/run.sh` replays a full scripted playthrough of each level (fights included) in headless Chrome and checks the final tick and hash (e1m2: `14315`, `345192a9`; e1m3: `5710`, `31e0ac69`) |

## Not the real build

This shows the design working. It is not the production pipeline:

- **Engine.** The plan is a WebQuake fork with QuakeC, BSP maps and `.mdl` models.
- **Art.** The splash art is procedural; the real build uses processed public-domain scans.
- **Palette.** Beyond e1m2's declared ramps, the demo also uses `earth` (the hero's skin, leather) and `scarlet` (Tsotha's livery and blood, as README §13 specifies).
- **Audio.** All sound is synthesised in WebAudio.
- **Floating-point maths.** The determinism is exact for repeated runs in one browser. Bit-identical results across JS engines would still need README §11's `dmath.js`.

## Files

| File | Purpose |
|---|---|
| `js/util.js`, `js/renderer.js` | Engine core from The Endless Cave. The renderer adds UV-mapped models, key lights, haze, gamma and the palette-snapping post pass |
| `js/mesh.js` | Mesh builder and primitives, the level mesher, prefabs, Satha, the view-model hand |
| `js/characters.js` | The cast: rig, part builders, poses |
| `js/combat.js` | Weapons, kicks, enemy AI, flow-field pathing |
| `js/textures.js` | Ramp-locked procedural textures and the game palette |
| `js/level.js` | The e1m2 spec, the puzzle solver and the grid queries |
| `js/audio.js` | Synthesised sound |
| `js/splash.js` | Splash text and the engraving painter |
| `js/game.js` | Sim tick, player, giant, Satha, Shukeli, puzzles, HUD, rendering and the `CIM` agent API |
| `test/` | Headless Chrome driver and the golden playthrough |
