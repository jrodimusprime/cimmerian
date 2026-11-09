# Demo: e1m2 "The Pits"

A playable vertical slice of **e1m2, The Pits** (README §9, milestone M4), built on the engine from **The Endless Cave** (`colossal_cave_adventure_3d`): pure JavaScript and WebGL2, a low-resolution renderer with banded light and black fog, no build step and no asset files.

**Play:** open `index.html` in a browser. Everything is generated at load time.

| Key | Action |
|---|---|
| W A S D, mouse | Move and look (Shift to run, Space to jump) |
| E | Use: read, take, try doors |
| Click | Strike with the dagger, or throw the bone you're holding |
| Esc | Pause (mouse sensitivity, restart) |
| P, K, F3 | Render resolution, sound, debug line (tick, state hash, flags) |

Brightness and mouse sensitivity are on the pause screen.

## What's in it

The level follows README §10's puzzle chain for e1m2:

1. You wake chained in your cell. The chain limits how far you can move. An inscription tells you which link is rusted, and grinding it frees you.
2. The black giant opens your door to strangle you. Satha's first pass comes up the hall and takes him instead. His dagger is left in the hall.
3. **Satha passes on a fixed 40-second cycle.** The torches gutter and the floor rumbles about 5 seconds before her head comes out of the well. Her body fills the hall, and she spits at anything she can see, so get into an alcove.
4. Take a thighbone from the bone alcove. Hide in the niche beside the grille, and throw the bone against the bars. Shukeli comes to investigate. If he sees you, he backs off. If he doesn't, strike him through the bars.
5. Take his keys, unlock the grille and climb the stair. The e1m3 splash appears, with your time, deaths and final state hash.

Story splashes (README §12) bracket the level. Each one is painted as a tonal scene (a Piranesi-style vaulted corridor, arches, a stair, a bridge, chains, and Satha or the torch-bearer), then engraved with anti-aliased hatching whose line weight carries the tone. Each has one scarlet accent, standing in until the public-domain scans are processed.

## How it maps to the design

| README | Here |
|---|---|
| §5 level spec | `LEVEL` in `js/level.js`: rooms, links, props, entities and a `puzzle:` block in the YAML shape, built into a grid |
| §10 solver | `solvePuzzle()` searches every flag state. Its result is logged at boot: *15 states, goal reachable, no softlocks* |
| §7 palette | `js/textures.js` builds 128×128 textures from the `ink`, `jade` and `fire` ramps (the level's declared ramps), plus `earth` for the hero's own skin. Texels are ordered-dithered between ramp entries, and every texture has the engraving hatch layer. Satha, the forearm and the cuff have UV-mapped skins |
| §8 / MODELS.md | The humanoids are rigid parts on a small bone rig. Satha has a sculpted head and hinged jaw, and her body is one smooth UV-mapped tube rebuilt every frame along her spine; the sim still checks collisions against the 14 points MODELS.md describes. The first-person view-model is the hero's manacled right hand at view-model density: a muscled forearm, a riveted cuff, fingers with three joints and nails, and a thumb. Models are lit from the direction of their strongest nearby light, as Quake lit its alias models |
| §11 determinism | Fixed 72 Hz tick, seeded RNG for sim randomness, FNV-1a state hash |
| §11 agent API | `window.CIM.step({forward, side, yaw, pitch, use, attack, run, jump}, ticks)` returns an observation. Load with `?agent` to skip the splash. `CIM.solve()` runs the puzzle solver |
| §11 recorded solutions | `test/run.sh` replays a scripted solution in headless Chrome and checks the final tick and hash (`3467`, `dcbdf935`) |

## Not the real build

This demo shows the design working. It is not the production pipeline:

- **Engine.** The plan is a WebQuake fork with QuakeC, BSP maps and `.mdl` models. This demo uses the Endless Cave engine instead.
- **Art.** The splash art is procedural; the real build uses processed public-domain scans.
- **Audio.** All sound is synthesised in WebAudio.
- **Floating-point maths.** The determinism is exact for repeated runs in one browser. Bit-identical results across JS engines would still need README §11's `dmath.js`.

## Files

| File | Purpose |
|---|---|
| `js/util.js`, `js/renderer.js` | Engine core from The Endless Cave. The renderer adds a light multiplier so baked torchlight can gutter |
| `js/mesh.js` | Engine mesh builder and primitives, plus the level mesher, prefabs and every model |
| `js/textures.js` | Ramp-locked procedural textures |
| `js/level.js` | The e1m2 spec, the puzzle solver and the grid queries |
| `js/audio.js` | Synthesised sound: Satha's hiss and rumble, chains, bars, the jailer's voice |
| `js/splash.js` | Splash text and the engraving painter |
| `js/game.js` | Sim tick, player, giant, Satha, Shukeli, HUD, rendering and the `CIM` agent API |
| `test/` | Headless Chrome driver and the golden playthrough |
