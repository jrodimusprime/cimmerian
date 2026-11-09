# MODELS.md: hero and creature models

This is every model the game needs, with its rig (bones), triangle budget, skin size and animation frames. `tools/mdlgen.js` builds each one from a `chars/<id>.yaml` spec (see README §8) and **fails the build if a model exceeds its triangle or vertex cap**.

---

## 1. Quake reference: why these numbers

| Constraint | Value | Source |
|---|---|---|
| MDL hard limits | 2,048 triangles, 1,024 vertices, 256 frames per model | Quake MDL format |
| Skins | 8-bit, palette-indexed, one surface per model | Quake MDL format |
| Animation | Vertex animation only. **The file has no bones**, and every frame stores every vertex | Quake MDL format |
| Animation rate | 10 fps (QuakeC `nextthink = time + 0.1`) | Quake convention |
| id-era budget | About **300 triangles** per model, with most original monsters in the 200–400 range | Quake Specs v3.4; id-era developer accounts |

**Our rule is to model at Quake density, not at what the format allows.** Common enemies are about 300 triangles, named characters and bosses go up to 600, and nothing exceeds 600 triangles or 400 vertices, even though the format allows 2,048.

**Calibration (optional).** If you own Quake, `node tools/mdlstats.js /path/to/id1/pak0.pak` prints the triangle and vertex counts of id's models, so you can compare them with the tiers below. **Never commit or ship id's pak files**: the tool only reads them locally.

### Budget tiers

| Tier | Use | Triangles | Max verts | Skin | Frames |
|---|---|---|---|---|---|
| **V**: view-model | First-person arm and weapon | 180–260 | 160 | 256×128 | ≤ 40 |
| **C**: common | Rank-and-file enemies | **260–300** | 180 | 256×128 | 50–70 |
| **N**: named / elite | Named humans, NPCs, elites | 300–400 | 240 | 256×128 | 40–70 |
| **B**: boss | Bosses, big monsters | 400–600 | 400 | 256×256 | 50–90 |
| **S**: segment | Chain parts (serpent segments, tendrils) | 40–160 | 100 | 128×64 | 2–12 |
| **P**: prop / pickup / gib | Items, projectiles, gibs | 12–120 | 80 | 64×64 | 1–8 |

---

## 2. Rigs (authoring bones)

Bones exist only in `mdlgen.js`. Poses are written as bone rotations in `parts/poses.yaml`, interpolated, then **baked to per-frame vertex positions** in the `.mdl`. Every vertex is skinned rigidly to exactly one bone, which is Quake-style chunky deformation with no weight blending. That keeps the look faithful and the generator simple.

### 2.1 `humanoid`: 14 bones

| # | Bone | Parent | Covers | Tri share (of 300) |
|---|---|---|---|---|
| 0 | `pelvis` (root) | — | Hips, belt | 24 |
| 1 | `spine` | pelvis | Abdomen | 24 |
| 2 | `chest` | spine | Ribcage, shoulders | 36 |
| 3 | `head` | chest | Head and neck, helmet | 40 |
| 4 | `upperarm_L` | chest | Upper arm | 18 |
| 5 | `forearm_L` | upperarm_L | Forearm and hand (merged, as in Quake) | 22 |
| 6 | `upperarm_R` | chest | Upper arm | 18 |
| 7 | `forearm_R` | upperarm_R | Forearm and hand | 22 |
| 8 | `thigh_L` | pelvis | Thigh | 18 |
| 9 | `shin_L` | thigh_L | Shin and foot (merged) | 22 |
| 10 | `thigh_R` | pelvis | Thigh | 18 |
| 11 | `shin_R` | thigh_R | Shin and foot | 22 |
| 12 | `prop_R` | forearm_R | Weapon (rigid) | 10–30 |
| 13 | `prop_L` | forearm_L | Shield or off-hand item (rigid) | 0–20 |
| | | | **Total** | **≈ 300** |

**Builds** scale the bone lengths and thicknesses without changing the bone count: `lean`, `normal`, `heavy`, `giant` (×1.35 height) and `dwarf` (×0.75 height, ×1.2 girth). The player height is 56 Quake units, the same as the Quake player's bounding box.

### 2.2 Variants of `humanoid`

| Rig | Bones | Change |
|---|---|---|
| `humanoid_robed` | 16 | Adds `robe_F` and `robe_B` (parent `pelvis`) as stiff cloth panels. They take about 30 triangles from the legs, which are hidden |
| `ape` | 15 | Adds `jaw` (parent `head`). Arms ×1.4 length, spine bent forward 25°, knuckle-walk poses |

### 2.3 Special rigs

| Rig | Bones | Structure |
|---|---|---|
| `serpent_head` | 3 | `neck` → `head` → `jaw` |
| `serpent_seg` | 1 | `body`, with 2 baked squash and stretch poses for undulation |
| `serpent_tail` | 3 | `tail1` → `tail2` → `tail3` |
| `tendril` | 6 | `t1` → … → `t6` chain |
| `stem` | 5 | `base` → `stem1` → `stem2` → `stem3` → `bloom` |
| `view_arm` | 5 | `shoulder` → `upperarm` → `forearm` → `hand` → `prop` |
| `view_leg` | 3 | `thigh` → `shin` → `foot` (the kick view-model) |
| `cloth` | 2 | `pole` → `banner` (a standard swaying in 4 frames) |

Satha and Yothga are built from **several cheap entities** (a head plus segments, or a stem plus tendrils) driven by QuakeC, as in Quake's own multi-entity tricks. Long creatures stay at Quake triangle density, and their movement stays deterministic, because each segment follows its leader at a fixed tick delay.

---

## 3. Animation sets (at 10 fps)

Frames advance every **7 simulation ticks** (72 Hz ÷ 7 ≈ 10.3 fps). That is an integer number of ticks, so animation timing is exactly reproducible (README §11).

| Set | Frames | Used by |
|---|---|---|
| `stand` | 8 | All living models |
| `walk` | 8 | All walkers |
| `run` | 6 | All walkers |
| `atk_a` | 6 | Main attack (swing, thrust, shot) |
| `atk_b` | 6–8 | Second attack (heavy or ranged), N/B tiers only |
| `pain_a`, `pain_b` | 4 + 5 | All living models |
| `death_a`, `death_b` | 8 + 10 | All living models |
| `special` | 6–12 | Per-model set pieces (listed below) |

**Typical totals:** C-tier models have about 60 frames, N-tier 60–70 and B-tier 70–90. All are far below the format's 256-frame limit.

---

## 4. The hero: the Cimmerian

The game is first person, so the hero is mostly seen as **view-models**. A full-body model also exists for the chase camera (which is useful when debugging agent replays), the death sequence and the splash renders.

| Model | Rig | Tier | Tris | Skin | Frames (sets) | Notes |
|---|---|---|---|---|---|---|
| `v_sword.mdl` | view_arm | V | **240** | 256×128 | 34: idle 4, swing1–3 6 each, block 4, draw 4, throw 6 | Bare forearm with a vambrace, straight broadsword. `prop` swaps to a phoenix-etched skin after the prologue dream |
| `v_hilt.mdl` | view_arm | V | **180** | 256×128 | 22: idle 4, jab 6, draw 4, bash 8 | Prologue only: the broken sword |
| `v_axe.mdl` | view_arm | V | **250** | 256×128 | 30: idle 4, chop1–2 7 each, draw 4, throw 8 | Bearded battle-axe |
| `v_kick.mdl` | view_leg | V | **120** | 128×64 | 8: kick 8 | Drawn over the weapon during a kick |
| `player.mdl` | humanoid (heavy) | N | **300** | 256×128 | 62: standard sets + `special` mount 6 | Black mane, bare chest, kilt and greaves, sword on `prop_R` |
| `h_player.mdl` | — | P | **48** | 64×64 | 1 | Head gib (Quake convention) |

---

## 5. Creatures and characters

### 5.1 Prologue: *The Phoenix on the Sword* (`e0m1`)

| Model | Rig / build | Tier | Tris | Frames | Special set | Notes |
|---|---|---|---|---|---|---|
| `assassin.mdl` | humanoid / lean | C | **270** | 58 | — | Hooded, dagger. Has 3 skins (one mesh) for crowd variety |
| `gromel.mdl` | humanoid / giant | N | **340** | 64 | `sword_break` 6 | Full plate with a visor. Breaks the player's sword on his helmet (scripted) |
| `volmana.mdl` | humanoid / dwarf | N | **300** | 60 | — | Full armour, dwarfish |
| `rinaldo.mdl` | humanoid / lean | N | **290** | 60 | `dagger_lunge` 6 | The poet. Sword, then dagger |
| `ascalante.mdl` | humanoid / normal | N | **320** | 62 | `slain` 10 | Killed by the demon (scripted) |
| `demon_thoth.mdl` | ape | B | **460** | 72 | `seize` 8 | Hurt only by the phoenix-marked blade |
| `epemitreus.mdl` | humanoid_robed / lean | N | **300** | 20 | `mark_sword` 10 | Dream NPC: stand and `mark_sword` only |

### 5.2 *The Scarlet Citadel* enemies

| Model | Rig / build | Tier | Tris | Frames | Special set | Levels | Notes |
|---|---|---|---|---|---|---|---|
| `knight_ophir.mdl` | humanoid / heavy | C | **300** | 64 | `shield_block` 4 | e1m1 | Kite shield on `prop_L`, lance or sword on `prop_R` |
| `spear_koth.mdl` | humanoid / lean | C | **290** | 60 | — | e1m1, e1m8 | Conical helm, scale shirt, spear and round shield |
| `archer_shem.mdl` | humanoid / lean | C | **280** | 60 | `draw_loose` 8 | e1m1, e1m8 | Curled beard, short bow |
| `shukeli.mdl` | humanoid_robed / heavy | N | **340** | 64 | `taunt` 6 | e1m2, e1m4 | The eunuch jailer. Lured to the grille. His corpse is raised by Pelias (`special` stagger 8) |
| `black_giant.mdl` | humanoid / giant | N | **330** | 40 | `crushed` 12 | e1m2 | Scripted victim of Satha: stand, walk, crushed |
| `satha_head.mdl` | serpent_head | B | **300** | 36 | `strike` 8, `recoil` 6 | e1m2, e1m4 | Invulnerable set piece. Spits venom (damage zones) |
| `satha_seg.mdl` | serpent_seg | S | **48** × 12 | 2 | — | e1m2, e1m4 | 12 entities follow the head at a 6-tick delay each |
| `satha_tail.mdl` | serpent_tail | S | **80** | 6 | — | e1m2, e1m4 | |
| `crawler.mdl` | ape (low) | C | **260** | 56 | `drop_from_ceiling` 6 | e1m3 | *Invented filler* (not in Howard) |
| `yothga_stem.mdl` | stem | B | **380** | 30 | `expose` 8, `wither` 12 | e1m4 | Boss core, struck once all three tendrils are cut |
| `yothga_tendril.mdl` | tendril | S | **120** × 3 | 24 | `grab` 8, `sever` 6 | e1m4 | Regrows on a fixed 6 s timer (puzzle, README §10) |
| `servant_citadel.mdl` | humanoid / normal | C | **280** | 58 | — | e1m5 | *Invented filler*. Scarlet livery |
| `looter.mdl` | humanoid / normal | C | **270** | 58 | `loot` 6 | e1m6 | 3 skins |
| `soldier_pellia.mdl` | humanoid / normal | C | **300** | 60 | — | e1m6, e1m7 | The usurper's soldiers |
| `arpello.mdl` | humanoid / heavy | B | **400** | 76 | `disarmed` 6, `fall` 10 | e1m7 | Tower duel. Disarmed by parries, then kicked off |
| `strabonus.mdl` | humanoid / heavy | B | **420** | 78 | `charge` 8, `overhead` 8 | e1m8 | King of Koth. Axe |
| `tsotha.mdl` | humanoid_robed / lean | B | **420** | 80 | `throw_globe` 8, `dust` 6, `blink` 6, `behead` 10 | e1m1 (cameo), e1m9 | Final boss |

### 5.3 Allies and NPCs

| Model | Rig / build | Tier | Tris | Frames | Notes |
|---|---|---|---|---|---|
| `pelias.mdl` | humanoid_robed / lean | N | **320** | 44 | Stand, walk, `cast` 8, `raise_dead` 10, `banish` 8. Freed in e1m4 |
| `athemides.mdl` | humanoid / normal | N | **280** | 36 | Escort NPC. Stand, walk, run, `orate` 10 |
| `trocero.mdl` | **reuses** `knight_ophir` mesh | — | 0 extra | — | New skin only (Poitanian colours) |
| `ally_archer.mdl` | **reuses** `archer_shem` mesh | — | 0 extra | — | New skin only (Bossonian) |
| `ally_pike.mdl` | **reuses** `spear_koth` mesh | — | 0 extra | — | New skin only (Gunderman) |

Reused meshes rely on Quake's **multiple skins per MDL**: one `.mdl`, several skins, with the skin chosen by the entity's `skin` field.

### 5.4 Splash-only (no model)

The winged beast, Pelias's eagle, the crystal-globe vision of Tamar, and the march to Khorshemish are shown only in **splash art**. This saves a flying rig and a level.

---

## 6. Props, pickups, projectiles, gibs

| Model | Tier | Tris | Frames | Notes |
|---|---|---|---|---|
| `w_sword.mdl`, `w_axe.mdl` | P | 40, 44 | 1 | World pickups. `w_axe` is also the thrown projectile (spins via `avelocity`) |
| `w_dagger.mdl` | P | 24 | 1 | Throwable |
| `arrow.mdl` | P | 16 | 1 | |
| `globe.mdl` | P | 24 | 4 | Tsotha's explosive globe. Fullbright `magic` ramp |
| `venom.mdl` | P | 20 | 4 | Satha spit (projectile and decal blob) |
| `wineskin.mdl` | P | 60 | 1 | +15 health |
| `bread.mdl` | P | 40 | 1 | +25 health |
| `mail.mdl` | P | 80 | 1 | Armour |
| `keys.mdl` | P | 30 | 1 | Puzzle item (e1m2) |
| `bone.mdl` | P | 16 | 1 | Puzzle item: thrown to make a noise (e1m2) |
| `sigil_stone.mdl` | P | 40 | 1 | Puzzle key (e1m3) |
| `torch.mdl` | P | 40 | 1 | Holder only. The flame is a sprite (`flame.spr`) |
| `brazier.mdl` | P | 80 | 1 | Puzzle (e0m1). Lit and unlit skins |
| `chains.mdl` | P | 60 | 4 | Wall-ring chains. Swing frames |
| `crystal_globe.mdl` | P | 80 | 1 | Turnable (e1m5) |
| `standard.mdl` | P | 60 | 4 | `cloth` rig. Tsotha's ward standards (e1m9) and the rally standards (e1m1) |
| `h_human.mdl` | P | 48 | 1 | Head gib. 4 skins (bare, helm, hood, beard) |
| `h_beast.mdl` | P | 56 | 1 | Head gib for the demon and crawler |
| `gib1–3.mdl` | P | 12, 18, 24 | 1 | Flesh and bone chunks in the `scarlet` and `bone` ramps |

Doors, grilles, skull-jaws, winches, ropes, the counterweight lift and bridges are **brush entities** (`func_door`, `func_train`, `func_rotate`-style) built from prefabs, not models.

---

## 7. Totals and checks

| | Count | Triangles authored |
|---|---|---|
| Hero (view-models + body + gib) | 6 | ≈ 1,140 |
| Prologue cast | 7 | ≈ 2,280 |
| Citadel enemies (unique meshes) | 17 | ≈ 4,820 (counting Satha and Yothga parts once) |
| Allies and NPCs (unique meshes) | 2 | ≈ 600 |
| Props, pickups, projectiles, gibs | 22 | ≈ 910 |
| **Total** | **54 models** | **≈ 9,750** |

**On-screen budget** (README §14): at most **6,000 model triangles** visible. That's 16 commons at about 300 each (4,800), plus a view-model (about 250), plus props, or a boss fight with a few adds. For comparison, Satha in full is 300 + 12×48 + 80 = **956 triangles**.

**Build checks in `mdlgen.js`:**

- Triangles ≤ the tier maximum, and never more than 600
- Vertices ≤ the tier maximum, and never more than 400
- Frames ≤ 256
- Skin width a multiple of 8
- Only the ramps declared in the spec appear in the skin (README §7)
- Every rig bone has at least one vertex
- The bounding box matches the QuakeC `setsize` within 4 units
- Each frame name matches a `$frame` in the model's `.qc`

**Token cost:** about 54 specs at roughly 20 lines each, plus 7 rigs and about 40 parts written once. That comes to around 25–35k output tokens for every model in the game.
