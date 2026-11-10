# The game: The Scarlet Citadel, e1m1 to e1m8

All eight levels of the book are playable, told out of joint as README §9 plans: **e1m2, The Pits** opens cold in the chains, **e1m1, The Plain of Shamu** is the flashback to how the king got there, and from **e1m3, The Tunnels Below** the story runs straight on: **e1m4 Yothga**, **e1m5 The Scarlet Citadel**, **e1m6 The Tower of Tamar**, **e1m7 The Relief of Shamar** and **e1m8 The Tybor**, to the eagle and the ending. They are built on the engine from **The Endless Cave** (`colossal_cave_adventure_3d`): pure JavaScript and WebGL2, no build step and no asset files. It is drawn in the Quake manner: low resolution, every pixel snapped to the game's palette, banded light and a dark haze.

**Play:** https://jrodimusprime.github.io/cimmerian/ (the site opens straight into the game), or open `index.html` in a browser. Everything is generated at load time. A five-second title card opens the game, and each level opens with its story splash. `?level=e1m1` (or any `e1mN`) starts at that level. `?cheat=true` turns on god mode (no damage; a fatal fall puts you back at the last checkpoint) and lets **N** skip to the next level. `?cast` opens the **cast gallery**: every creature and person the campaign uses, prologue to the Tybor, front and profile in the game's own renderer (left and right arrows step through them; `?cast=gromel` starts at one). The rendered sheets are in [`docs/cast/`](../docs/cast/).

| Key | Action |
|---|---|
| W A S D, mouse | Move and look (Shift to run, Space to jump) |
| E | Use: read, take, try doors, wind winches |
| T | Shake out your torch (e1m3, when Satha comes) |
| Click | Strike (click, click, click for the sword's three-blow combination), or throw the bone you're holding |
| Right-click, F or Q | Kick: knocks men back, staggers them and breaks a shield's guard |
| 1 2 3, mouse wheel | Fists, dagger, sword |
| Esc | Pause (brightness, mouse sensitivity, restart) |
| P, K, F3, F4 | Render resolution, sound, debug line, the palette (Quake look) on or off |

## The levels: puzzle areas and action areas

Each level alternates puzzle areas and action areas (README §9). The HUD names each area as you enter, and entering one sets a checkpoint. When you die, enemies go back to their posts but keep their wounds, as Quake's monsters did.

Play order: e1m2 → e1m1 → e1m3 → e1m4 → … → e1m8. Map names keep the book's numbering.

### e1m2, The Pits

The book's chapter III, in its order (README §9). It opens cold, chained in the vault.

| # | Area | Type | What happens |
|---|---|---|---|
| 1 | The Vault | puzzle | Chained to a ring, a torch in the niche above. Satha comes out of the dark and rears over you: lie still, because moving draws her venom. The black comes in through the grille with a huge sword and Shukeli's stolen keys, taunts "Amra", and raises the sword; Satha takes him. The keys land almost at your feet, too far to bend to, so slip your foot free and grip them with your toes |
| 2 | The Grille | combat | Take the black's sword. Shukeli, who followed his stolen keys, slams the grille and gloats through the bars; strike through them. The bolt works only from outside: you are trapped |
| 3 | The Main Corridor | puzzle | Take the torch and go out through the dark arch. Satha's hunting ground: she passes every forty breaths, and you hide in the side tunnels |
| 4 | The Gnawed Tunnels | combat | The pits' nameless things in a side passage and an old hall |
| 5 | The Corridor East | puzzle | Back along the corridor past the serpent's hole, between her passes |
| 6 | The Old Vaults | combat | Pillared vaults of the ancient works, and the things' den |
| 7 | The Pitted Way | agility | The pits span the way from wall to wall, faintly lit from below. Leap the first, hop across the second on a single stone left standing in it, leap the third. A thing drops from the roof onto the strip between them |
| 8 | The Bone Pit | combat | Things among the bones; beyond, a woman is weeping |

### e1m1, The Plain of Shamu (the flashback)

The book's chapter I. A splash asks how the king came to lie in chains, and the level is the end of the battle, fought east across the plain toward the heap of dead under a red sunset. You can't win it: the more you kill, the closer the kings ride. About 5–10 minutes, with 23 foes.

The plain has no walls. It runs on to the horizon under a sky dome, with the sun going down in the west behind low hills and ground mist lying on the dead. A deep stream closes the north of the field (go down its bank and you drown), lines of weathered boulders close the west and south, and the ranks of the host close the east. Inside, the field runs in bands as wide as the plain, so no beat can be walked round.

| # | Area | Type | What happens |
|---|---|---|---|
| 1 | The Broken Charge | combat | You come to among the dead of the last charge. Kothian knights on foot finish the wounded |
| 2 | The Gully of Dead | agility | A sunken gully across the whole field, choked with the fallen: cover from the volleys, but its banks are steep. Drop in and jump the far bank |
| 3 | The Arrow Ground | puzzle | The Shemite captains bawl the order, and a volley falls on a fixed cadence. Dead horses are the only cover: run from one to the next between volleys |
| 4 | The Shemite Line | combat | Close with the archers on the rise; spearmen screen them |
| 5 | The Riderless Horses | puzzle | Ophirean knights in gilded mail charge down three lanes the length of the field, one after another. Cross each lane while it stands empty; a rider tramples you and throws you back |
| 6 | The Heap of Dead | combat | Your back to the heap, two waves: Kothian and Ophirean knights, then more stepping out of the ring of the host. Then Strabonus, Amalrus and Tsotha ride up, and the book's lines play out. Tsotha walks to you and offers you life; answer with the sword. The fang in his ring drops you rigid to the earth, and the level cuts back to the dark |

On this field the battle is on: a group that has seen you keeps coming even after you fall and come round at the last safe place.

### e1m3, The Tunnels Below

The book's chapter III, after the grille. About 5–10 minutes, with 16 pit-things and the weeping thing. Conan carries the torch from the vault, and down here it is the only light there is.

| # | Area | Type | What happens |
|---|---|---|---|
| 1 | The Weeping | puzzle | A woman weeping, somewhere ahead. Follow the sound through the forks: down a wrong turning it grows fainter, and things wait on the roof of the blind tunnels |
| 2 | The Weeping Thing | combat (flight) | In the low cave the weeping stops, then starts again behind you: the quaking jelly-thing with a frog's head comes out of its wallow by the tunnel mouth. No blade can harm it. Flee down the far tunnel and cut through the things it drives ahead of it. The tunnel floor has fallen in: drop into the break and jump the far ledge, with the things at your back. It won't follow past the break |
| 3 | The Well | puzzle | A well cuts across the chamber where the tunnels cross, too wide to step over. It breathes: the torch flame leans as the wind rises, then a gust blows you back the way you came. Run and leap between its breaths |
| 4 | The Dark | combat | On the far side the presence floats up out of the well, blows the torch out and tears it from your hand. Its wind drives you south into the black tunnels; fight the things there by their red eyes, leap the gap in the black tunnel, pale from below, and come round back to the chamber |
| 5 | The Crossing | puzzle | Find the torch by its ember on the well's rim and blow it alight. The dead's scratches say to go where the air comes from: the flame leans away from the one tunnel with a draft in it. Leap the well again, and when the presence comes up again you have five breaths to be in the right tunnel, or it takes the torch again |
| 6 | The Side Tunnels | combat | Back in the main corridor; things in the tunnels off it |
| 7 | Satha Returns | puzzle | Every torch bows: Satha comes up out of her hole between you and the far glow and crawls down the corridor toward you. Get into a side tunnel and shake out your torch (T). If she sees fire, she strikes into the tunnel mouth |

Exit: the cage of bars at the end of the corridor, with a garden in it.

**Combat** (README §13):
- **Fixed damage.** The same blow always does the same damage.
- **Telegraphs.** Every enemy blow is telegraphed by a wind-up of at least 0.4 seconds, so you can step out of it.
- **Shields.** Wardens block alternate frontal blows and the captain blocks every one, but a kick breaks any guard.
- **Kicks.** Knockback can put a man into the serpent's well, and Satha crushes wardens as readily as you.
- **Archers.** They keep their distance and lead their shots.
- **Pathing.** Enemies path with a flow field over the level grid.
- **Deaths.** A dying man's knees buckle, then he topples and settles, each one differently. Before he falls, the game tests the floor his body will cover. It tries his natural fall (backwards if kicked) and then sweeps around, so he never lies through a wall, a pillar or a drop. If he's cornered, he slides down the wall and sits.
- **Weapons.** A dead man's weapon leaves his hand. If you can use it (a sword you lack, a spear the winch needs), it drops as a pickup; otherwise it lies broken beside him: a snapped blade, a split shield, a broken bow, a cracked axe-haft.

## The cast

Only characters and creatures from Howard's text (README §1, *Canon cast only*).

| Model | Look |
|---|---|
| Tsotha-lanti | The lean vulture in silken robes: a shaven head with a painted hook-nosed face, a scarlet vest over a pale silk robe |
| Kothian and Ophirean knights | Kothian knights in dark mail, Ophireans in gilded mail; the riders of e1m1 on armoured horses |
| The black strangler | Ogre-built and bare-chested, with a heavy brow over sunken eyes, bared teeth, scars, iron armbands and rings in his ears |
| Shukeli | Bloated, sallow and blotched, with a leering mouth of teeth, jowls and a double chin, a bell robe with a jade hem, a sash, slippers, and the ring of keys at his belt |
| Kothian guard | A closed great helm with an eye-slit and breathing holes, spiked pauldrons, mail under a blood-stained scarlet serpent tabard, sword, a painted shield with a spiked boss |
| Kothian spearman | A kettle hat over a mail coif, the face veiled to the eyes, spear |
| Shemite archer | A deep leather hood with the face lost in shadow, leathers, quiver, recurve bow |
| Black axeman | One of Tsotha's black giants: a horned great helm with a scarlet crest, a scarlet cloak, spiked pauldrons, a long-shafted axe |
| The presence | What floats up out of the well: no body, a few faint wavering columns of pallor over the shaft, felt more than seen |
| Pit-thing | Tsotha's nameless pets, as Howard half-shows them: "shadowy forms, monstrous and abnormal in outline", "slavering lips", "the burning glare of hungry eyes". Low, hunched and spurred down the spine, a long skull with the jaw hanging agape on fangs and strings of slaver, a cluster of burning eyes, long knuckled arms ending in hooks. The hide is near-black and wet, painted Quake-style, so in torchlight you see mostly eyes and maw. Three builds, each malformed its own way. They cling to the roof and drop |
| Weeping thing | A quaking jelly mass with short tentacles, a frog's head, great unstable eyes and blubbery lips. It weeps like a woman and titters when it sees you |
| Satha | A smooth head and hinged jaw with everything painted into the skin, as Quake did it: crown shields, glowing amber eyes with slit pupils, nostrils, a lip line with fangs, a red mouth and a forked tongue. Her body is one smooth, scaled tube rebuilt every frame along her spine, and it grows out of the back of her skull. Her scales carry a faint shimmer, so she stays white under orange torchlight |
| The hero (first person) | His manacled right hand: a muscled forearm with veins and a scar, a riveted cuff with a broken chain, jointed fingers with nails |

Every human enemy stands like Quake's killers: hunched, knees bent, head thrust forward. All of them are built from compact specs, as README §8 and MODELS.md require: a 14-bone humanoid rig with rigid parts, smooth lofts and lathes for the body, and outfits as per-role overlays. They're posed procedurally (idle, walk, wind-up, strike, block, pain, stagger and death) and lit from the direction of their strongest nearby light, as Quake lit its alias models.

Walk into Satha and you die; lying still as she passes is the only safe way to be near her.

The title card is John Martin's *Pandemonium* (public domain, processed by `tools/splashgen.sh`; credits in `story/credits.json`). Each level's splash is painted procedurally: a tonal Piranesi-style scene engraved with hatching, with one scarlet accent. Each level ends in a black corridor that fades out as you walk into it.

## How it maps to the design

| README | Here |
|---|---|
| §5 level spec | `LEVEL` in `js/level.js`: areas, rooms, links, props, entities and a `puzzle:` block in the YAML shape, built into a grid |
| §7 palette | 128×128 textures built from the ramps: irregular hewn courses, worn flagstones, rotten straw, dripping cave rock, mud. A large-scale grime map breaks up the repetition across every surface. Every clue is carved into its wall as pale, unreadable glyphs. The final image is snapped to the 128-colour game palette through a lookup table (the Quake look, F4) |
| §9 pacing | The `areas:` list in the spec, with a `type` of puzzle or action |
| §10 solver | `solvePuzzle()` searches every flag state. It logs at load for every level (e.g. e1m2 *6 states*, e1m7 *14 states*): goal reachable, no softlocks |
| §11 determinism | Fixed 72 Hz tick, seeded RNG for every sim decision (AI included), FNV-1a state hash |
| §11 agent API | `window.CIM.step({forward, side, yaw, pitch, use, attack, parry, throwSpear, weapon, run, jump}, ticks)` returns an observation, including every enemy. Load with `?agent` to skip the splash |
| §11 recorded solutions | `test/run.sh` replays a full scripted playthrough of each level (fights included) in headless Chrome and checks the final tick and hash (e1m1 `11707` `9b1a737a`; e1m2 `9443` `dfd0cb36`; e1m3 `10602` `9a433ca7`; e1m4 `14276` `f0a50d2b`; e1m5 `15358` `f04118f8`; e1m6 `10537` `fa1fdb5a`; e1m7 `17111` `70de3dbc`; e1m8 `11218` `76d0c87e`). With `CIM_RECORD=file` a run's inputs are saved, and `test/video.js` replays them, grabbing a frame every 12 ticks (5× speed at 30 fps); `test/video_assemble.py` makes the MP4 in Blender |

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
| `js/chars/cast.js` | The cast as data: one entry per character, grouped by level, each with Howard's words for them |
| `js/chars/rig.js` | The 14-bone humanoid rig, the loft helpers, `drawCharacter` and the pose library |
| `js/chars/humanoid.js` | The shared part builder: heads and helms, outfits, limbs, weapons, shields |
| `js/chars/pitthing.js`, `weeper.js`, `demon.js`, `yothga.js`, `horse.js`, `eagle.js` | One builder per creature that isn't a man: the pit-things, the weeping thing, Thoth-Amon's baboon-shape, Yothga, the horses and Tsotha's steed, Pelias's eagle |
| `js/chars/broken.js` | Broken gear that dead men drop |
| `js/gallery.js` | The cast gallery (`?cast`, `?cast&face`): every creature and person in the campaign, front and profile |
| `js/skinned.js` | Loads the built cast (`models/cast/*.glb`, made by `tools/blender/`), skins them on the GPU and drives their skeletons with the pose library; static parts (weapons, Satha's head, the weeping thing, Yothga, the eagle) are drawn the same way |
| `models/cast/` | The built cast: CC0 MakeHuman bodies in Blender-built armour, the beasts, the weapons. Each level loads only its own |
| `js/combat.js` | Weapons, kicks, enemy AI, flow-field pathing |
| `js/textures.js` | Ramp-locked procedural textures and the game palette |
| `js/level.js` | The eight level specs, the puzzle solver and the grid queries |
| `js/beats.js` | The later levels' story beats: lines, flags, waking groups, sleepers, Pelias following, allied ranks, Tsotha's globes, the eagle |
| `js/audio.js` | Synthesised sound |
| `js/splash.js` | Splash text and the engraving painter |
| `js/game.js` | Sim tick, player, giant, Satha, Shukeli, puzzles, HUD, rendering and the `CIM` agent API |
| `test/` | Headless Chrome driver and a golden playthrough of each level (`run.sh` runs all three) |
