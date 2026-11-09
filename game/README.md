# The game: e1m2 "The Pits", e1m1 "The Plain of Shamu" and e1m3 "The Tunnels Below"

Three playable levels, told out of joint as README §9 plans: **e1m2, The Pits** opens cold in the chains (milestone M4), **e1m1, The Plain of Shamu** is the flashback to how the king got there, and **e1m3, The Tunnels Below** jumps forward again. All three are built on the engine from **The Endless Cave** (`colossal_cave_adventure_3d`): pure JavaScript and WebGL2, no build step and no asset files. It is drawn in the Quake manner: low resolution, every pixel snapped to the game's palette, banded light and a dark haze.

**Play:** https://jrodimusprime.github.io/cimmerian/ (the site opens straight into the game), or open `index.html` in a browser. Everything is generated at load time. A five-second title card opens the game, and each level opens with its story splash. `?level=e1m1` or `?level=e1m3` starts at that level.

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

Play order: e1m2 → e1m1 → e1m3. Map names keep the book's numbering.

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
| 7 | The Pitted Way | puzzle | A floor broken by bottomless pits, faintly lit from below; one dropping from the roof |
| 8 | The Bone Pit | combat | Things among the bones; beyond, a woman is weeping |

### e1m1, The Plain of Shamu (the flashback)

The book's chapter I. A splash asks how the king came to lie in chains, and the level is the end of the battle, fought east across an open field under a red sunset toward the heap of dead. You can't win it: the more you kill, the closer the kings ride. About 5–10 minutes, with 19 foes.

| # | Area | Type | What happens |
|---|---|---|---|
| 1 | The Broken Charge | combat | You come to among the dead of the last charge. Kothian knights on foot finish the wounded |
| 2 | The Arrow Ground | puzzle | The Shemite captains bawl the order, and a volley falls on a fixed cadence. Dead horses are the only cover: run from one to the next between volleys |
| 3 | The Shemite Line | combat | Close with the archers on the rise; spearmen screen them |
| 4 | The Riderless Horses | puzzle | Ophirean knights in gilded mail charge down three lanes, one after another. Cross each lane while it stands empty; a rider tramples you and throws you back |
| 5 | The Heap of Dead | combat | Your back to the heap, two waves: Kothian and Ophirean knights, then more with the pikemen out of the kings' ground. Then Strabonus, Amalrus and Tsotha ride up, and the book's lines play out. Tsotha walks to you and offers you life; answer with the sword. The fang in his ring drops you rigid to the earth, and the level cuts back to the dark |

On this field the battle is on: a group that has seen you keeps coming even after you fall and come round at the last safe place.

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
| Pit-thing | The pits' nameless things: pale, gaunt and rib-thin, long-armed and clawed, on all fours, with ember pin-prick eyes and dripping jaws. They cling to the roof and drop |
| Weeping thing | A quaking jelly mass with short tentacles, a frog's head, great unstable eyes and blubbery lips. It weeps like a woman and titters when it sees you |
| Satha | A sculpted head with a hinged jaw, slit-pupil eyes, fangs and tongue; her body is one smooth, scaled tube rebuilt every frame along her spine |
| The hero (first person) | His manacled right hand: a muscled forearm with veins and a scar, a riveted cuff with a broken chain, jointed fingers with nails |

Every human enemy stands like Quake's killers: hunched, knees bent, head thrust forward. All of them are built from compact specs, as README §8 and MODELS.md require: a 14-bone humanoid rig with rigid parts, smooth lofts and lathes for the body, and outfits as per-role overlays. They're posed procedurally (idle, walk, wind-up, strike, block, pain, stagger and death) and lit from the direction of their strongest nearby light, as Quake lit its alias models.

The title card is John Martin's *Pandemonium* (public domain, processed by `tools/splashgen.sh`; credits in `story/credits.json`). Each level's splash is painted procedurally: a tonal Piranesi-style scene engraved with hatching, with one scarlet accent. Each level ends in a black corridor that fades out as you walk into it.

## How it maps to the design

| README | Here |
|---|---|
| §5 level spec | `LEVEL` in `js/level.js`: areas, rooms, links, props, entities and a `puzzle:` block in the YAML shape, built into a grid |
| §7 palette | 128×128 textures built from the ramps: irregular hewn courses, worn flagstones, rotten straw, dripping cave rock, mud. A large-scale grime map breaks up the repetition across every surface. Every clue is carved into its wall as pale, unreadable glyphs. The final image is snapped to the 128-colour game palette through a lookup table (the Quake look, F4) |
| §9 pacing | The `areas:` list in the spec, with a `type` of puzzle or action |
| §10 solver | `solvePuzzle()` searches every flag state. It logs at load: e1m2 *6 states*, e1m1 *5 states*, e1m3 *9 states*, goal reachable, no softlocks |
| §11 determinism | Fixed 72 Hz tick, seeded RNG for every sim decision (AI included), FNV-1a state hash |
| §11 agent API | `window.CIM.step({forward, side, yaw, pitch, use, attack, kick, weapon, run, jump}, ticks)` returns an observation, including every enemy. Load with `?agent` to skip the splash |
| §11 recorded solutions | `test/run.sh` replays a full scripted playthrough of each level (fights included) in headless Chrome and checks the final tick and hash (e1m2: `10360`, `21a65357`; e1m1: `8821`, `7b58280b`; e1m3: `5870`, `8bbc707f`) |

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
| `js/level.js` | The e1m2, e1m1 and e1m3 specs, the puzzle solver and the grid queries |
| `js/audio.js` | Synthesised sound |
| `js/splash.js` | Splash text and the engraving painter |
| `js/game.js` | Sim tick, player, giant, Satha, Shukeli, puzzles, HUD, rendering and the `CIM` agent API |
| `test/` | Headless Chrome driver and a golden playthrough of each level (`run.sh` runs all three) |
