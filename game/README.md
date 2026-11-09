# The game: e1m2 "The Pits"

A playable vertical slice of **e1m2, The Pits** (README §9, milestone M4), built on the engine from **The Endless Cave** (`colossal_cave_adventure_3d`): pure JavaScript and WebGL2, no build step and no asset files. It is drawn in the Quake manner: low resolution, every pixel snapped to the game's palette, banded light and a dark haze.

**Play:** https://jrodimusprime.github.io/cimmerian/ (the site opens straight into the game), or open `index.html` in a browser. Everything is generated at load time.

| Key | Action |
|---|---|
| W A S D, mouse | Move and look (Shift to run, Space to jump) |
| E | Use: read, take, try doors, wind winches |
| Click | Strike (click, click, click for the sword's three-blow combination), or throw the bone you're holding |
| Right-click, F or Q | Kick: knocks men back, staggers them and breaks a shield's guard |
| 1 2 3, mouse wheel | Fists, dagger, sword |
| Esc | Pause (brightness, mouse sensitivity, restart) |
| P, K, F3, F4 | Render resolution, sound, debug line, the palette (Quake look) on or off |

## The level: puzzle areas and action areas

The level alternates puzzle areas and action areas (README §9). The HUD names each area as you enter, and entering one sets a checkpoint. It plays in about 5–10 minutes, with 12 enemies plus the jailer.

| # | Area | Type | What happens |
|---|---|---|---|
| 1 | The Cell | puzzle | You wake chained. An inscription names the rusted link; grinding it frees you |
| 2 | The Hall of the Serpent | puzzle (timing) | The black giant comes in to strangle you, and Satha's first pass takes him instead. **She passes every 40 seconds**: the torches gutter and the floor rumbles about 5 seconds before her head comes up out of the well. She fills the hall and spits at anything she can see, so get into an alcove. Take the giant's dagger |
| 3 | The Wardens' Post | action | Picking up the dagger brings a warden up the south passage. Beyond it is the post: a warden, a spearman, and an archer on a gallery. The first warden you kill drops a sword |
| 4 | The Grille | puzzle | Throw a bone against the bars from the dark niche. Shukeli waddles over to look; if he can't see you, strike him through the bars. Take his keys |
| 5 | The Guardroom and Barracks | action | His death-squeal raises the alarm. Four guards come to the bars and fight you through them, then in the guardroom |
| 6 | The Winch | puzzle | The portcullis winch's pawl is broken, so the portcullis falls when you let go. Jam the ratchet with a spear from the barracks rack |
| 7 | The Captain's Landing | action | The captain (shield, a two-blow combination) and three men, then the stair up to the citadel |

**Combat** (README §13):
- **Fixed damage.** The same blow always does the same damage.
- **Telegraphs.** Every enemy blow is telegraphed by a wind-up of at least 0.4 seconds, so you can step out of it.
- **Shields.** Wardens block alternate frontal blows and the captain blocks every one, but a kick breaks any guard.
- **Kicks.** Knockback can put a man into the serpent's well, and Satha crushes wardens as readily as you.
- **Archers.** They keep their distance and lead their shots.
- **Pathing.** Enemies path with a flow field over the level grid.

## The cast

| Model | Look |
|---|---|
| The black giant | Muscled and bare-chested, iron armbands, loincloth, shaved head and earrings |
| Shukeli | Fat and bald, with jowls and a double chin, a bell robe with a jade hem, a sash, slippers, and the ring of keys at his belt |
| Warden | Conical Kothian helm with a nasal and a mail aventail, a beard, a mail hauberk under Tsotha's scarlet serpent tabard, sword, painted round shield |
| Spearman | Kettle hat, mail and tabard, spear |
| Archer | Leather hood and mantle, leathers, quiver, recurve bow |
| Captain | Crested helm with cheek plates, steel pauldrons, a scarlet cloak, sword and shield |
| Satha | A sculpted head with a hinged jaw, slit-pupil eyes, fangs and tongue; her body is one smooth, scaled tube rebuilt every frame along her spine |
| The hero (first person) | His manacled right hand: a muscled forearm with veins and a scar, a riveted cuff with a broken chain, jointed fingers with nails |

All of them are built from compact specs, as README §8 and MODELS.md require: a 14-bone humanoid rig with rigid parts, smooth lofts and lathes for the body, and outfits as per-role overlays. They're posed procedurally (idle, walk, wind-up, strike, block, pain, stagger and death) and lit from the direction of their strongest nearby light, as Quake lit its alias models.

Story splashes (README §12) bracket the level. Each is painted as a tonal scene (a Piranesi-style vaulted arcade with a stair, a bridge and chains, plus Satha or a torch-bearer), then engraved with anti-aliased hatching whose line weight carries the tone. Each has one scarlet accent.

## How it maps to the design

| README | Here |
|---|---|
| §5 level spec | `LEVEL` in `js/level.js`: areas, rooms, links, props, entities and a `puzzle:` block in the YAML shape, built into a grid |
| §7 palette | 128×128 textures built from the ramps, with the engraving hatch layer. The final image is snapped to the 128-colour game palette through a lookup table (the Quake look, F4) |
| §9 pacing | The `areas:` list in the spec, with a `type` of puzzle or action |
| §10 solver | `solvePuzzle()` searches every flag state. It logs at boot: *21 states, goal reachable, no softlocks* |
| §11 determinism | Fixed 72 Hz tick, seeded RNG for every sim decision (AI included), FNV-1a state hash |
| §11 agent API | `window.CIM.step({forward, side, yaw, pitch, use, attack, kick, weapon, run, jump}, ticks)` returns an observation, including every enemy. Load with `?agent` to skip the splash |
| §11 recorded solutions | `test/run.sh` replays a full scripted playthrough (fights included) in headless Chrome and checks the final tick and hash (`19289`, `84ed4146`) |

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
