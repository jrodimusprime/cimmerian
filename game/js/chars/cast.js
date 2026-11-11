'use strict';
// ---------------------------------------------------------------------------
// The cast (README §8, MODELS.md), as data: one entry per character, grouped by
// the level they first appear in, each with the book's words for them. The parts
// named here are built by humanoid.js; `pit`, `ape` and friends hand the body to
// a creature builder instead. Units: metres for a 1.85 m man; `scale` and `bulk`
// vary the build.
// ---------------------------------------------------------------------------
const CAST = {
  // ---- the king --------------------------------------------------------------------------------------------
  // In the pits: "naked but for a loin-cloth, shackles on his mighty limbs, his blue eyes blazing beneath the tangled
  // black mane which fell over his low broad forehead" (ch. II). On the plain: "the black-mailed figure", "the crested,
  // dented helmet", "his black armor was hacked to tatters" (ch. I). Seen in the chase camera and death sequence.
  conan: { face: 'FACE_CONAN', scale: 1.06, bulk: 1.3, belly: 0, skin: 'DARKSKIN', head: 'mane', torso: 'bare', hips: 'loin', arms: 'bare', legs: 'bare', feet: 'bare', weapon: 'sword' },
  conan_mail: { scale: 1.06, bulk: 1.3, belly: 0, skin: 'FACE', head: 'helm_crest', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'sword', mail: 'BLACKMAIL', tabard: 'BLACKMAIL', pauldrons: true },

  // ---- e0m1 The Phoenix (prologue, The Phoenix on the Sword) ----------------------------------------------------
  // "sixteen desperate rogues of mine"; "four masked figures ... cloaks wrapped closely about them"
  assassin: { scale: 0.98, bulk: 0.95, belly: 0, skin: 'FACE', head: 'mask', torso: 'leather', hips: 'leather', arms: 'leather', legs: 'trousers', feet: 'boots', weapon: 'dagger', cloak: true },
  // "Gromel, the giant commander of the Black Legion", "in full armor", "the closed vizors"; he "came like a charging bull"
  gromel: { scale: 1.22, bulk: 1.35, belly: 0.1, skin: 'FACE', head: 'helm_great', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'sword', mail: 'BLACKMAIL', tabard: 'BLACKMAIL', pauldrons: true, spikes: true },
  // "Volmana, the dwarfish count of Karaban", in full armour, visor closed
  volmana: { scale: 0.8, bulk: 1.35, belly: 0.2, skin: 'FACE', head: 'helm_great', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'sword', shield: true, pauldrons: true, tabard: 'LIVERY_PELLIA' },
  // "Rinaldo, the hare-brained minstrel"; "Rinaldo had pulled his slouch cap down above his eyes"
  rinaldo: { scale: 0.98, bulk: 0.85, belly: 0, skin: 'FACE', head: 'slouch', torso: 'leather', hips: 'leather', arms: 'leather', legs: 'trousers', feet: 'boots', weapon: 'dagger', leatherTex: 'VELVET' },
  // "a tall, lean man in worn velvet", "a sardonic countenance": Ascalante, the outlaw
  ascalante: { face: 'FACE_OUTLAW', scale: 1.06, bulk: 0.9, belly: 0, skin: 'FACE', head: 'outlaw', torso: 'leather', hips: 'leather', arms: 'leather', legs: 'trousers', feet: 'boots', weapon: 'sword', leatherTex: 'VELVET' },
  // "Its outline was not unlike that of a gigantic baboon, but no such baboon ever walked the earth"
  demon: { ape: true, scale: 1.45, bulk: 1.2, skin: 'DEMON_HIDE', arm: 1.35 },
  // "Epemitreus the Sage has been dead for fifteen hundred years": the ancient in the crypt under Golamira
  epemitreus: { scale: 1.02, bulk: 0.8, belly: 0, skin: 'PALE', head: 'sage', torso: 'robe', hips: 'robe', arms: 'sleeves', legs: 'none', feet: 'slippers', robeTex: 'ROBE' },

  // ---- e1m1 The Plain of Shamu (ch. I) ----------------------------------------------------------------------------
  // "dark-faced Kothian knights"; "Ophirean knights in gilded mail"
  kknight: { scale: 1.04, bulk: 1.12, belly: 0.1, skin: 'FACE', head: 'helm_great', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'sword', shield: true, pauldrons: true },
  oknight: { scale: 1.02, bulk: 1.06, belly: 0, skin: 'FACE', head: 'helm_crest', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'sword', shield: true, mail: 'GILT', tabard: 'GILT' },
  // the Kothian spearmen; and "squat Shemites with blue-black beards", the archers
  spearman: { scale: 1.02, bulk: 1.0, belly: 0.15, skin: 'FACE', head: 'coif', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'spear' },
  archer: { scale: 0.97, bulk: 0.95, belly: 0, skin: 'FACE', head: 'hood', torso: 'leather', hips: 'leather', arms: 'leather', legs: 'trousers', feet: 'boots', weapon: 'bow', quiver: true, beard: 'HAIR' },
  // "the giants in their steel caps and mail brigandines", the pikemen Tsotha walks through
  pikeman: { scale: 1.12, bulk: 1.15, belly: 0.1, skin: 'FACE', head: 'helm_kettle', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'pike' },
  // "Strabonus, with his broad dark face and crafty eyes"; in ch. V his axe "clanged on Conan's helmet"
  strabonus: { scale: 1.02, bulk: 1.32, belly: 0.35, skin: 'DARKSKIN', head: 'helm_crown', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'axe', pauldrons: true, cloak: true },
  // "Amalrus, slender, fastidious, treacherous, dangerous as a cobra"
  amalrus: { scale: 1.0, bulk: 0.88, belly: 0, skin: 'FACE', head: 'helm_crown', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'sword', mail: 'GILT', tabard: 'GILT', cloak: true },
  // "the lean vulture Tsotha-lanti, clad only in silken robes ... a face that was like that of a bird of prey"
  tsotha: { face: 'FACE_VULTURE', scale: 1.04, bulk: 0.78, belly: 0, skin: 'PALE', head: 'vulture', torso: 'robe', hips: 'robe', arms: 'sleeves', legs: 'none', feet: 'slippers', robeTex: 'TABARD' },

  // ---- e1m2 The Pits (ch. II-III) ----------------------------------------------------------------------------------
  // the strangler: "a gigantic black man, stark naked, bearing in one hand a huge sword"
  giant: { face: 'FACE_BRUTE', scale: 1.34, bulk: 1.38, belly: 0, skin: 'DARKSKIN', head: 'brute', torso: 'bare', hips: 'loin', arms: 'bare', legs: 'bare', feet: 'bare', weapon: 'sword' },
  // Shukeli: "a fat repellent figure"; his corpse is raised again in e1m4
  shukeli: { face: 'FACE_EUNUCH', scale: 0.98, bulk: 1.2, belly: 1.25, skin: 'SICK', head: 'eunuch', torso: 'robe', hips: 'robe', arms: 'sleeves', legs: 'none', feet: 'slippers' },
  // the old jailer's guard (kept for the sword view-model's mesh)
  warden: { scale: 1.02, bulk: 1.1, belly: 0.1, skin: 'FACE', head: 'helm_great', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'sword', shield: true, pauldrons: true, spikes: true },
  // e1m3: "monsters with dripping jaws agape", the nameless things of Tsotha's pits
  // Howard never shows them whole: "shadowy forms ... monstrous and abnormal in outline", "the greedy sucking-in of
  // slavering lips", "the burning glare of hungry eyes". So: dark shapes, eyes and a wet maw; each one malformed its own way.
  thing: { pit: 0, scale: 0.95, bulk: 1, skin: 'PIT_HIDE', arm: 1.4 },
  thing_b: { pit: 1, scale: 1.05, bulk: 1.15, skin: 'PIT_HIDE', arm: 1.25 },
  thing_c: { pit: 2, scale: 0.88, bulk: 0.85, skin: 'PIT_HIDE', arm: 1.65 },

  // ---- e1m4 Yothga (ch. III) ------------------------------------------------------------------------------------------
  // Pelias freed: "the worn face", "the head was narrow and well-formed, with a high splendid forehead"; ten years
  // in the vine's grip left him naked and starved
  pelias: { face: 'FACE_SAGE', scale: 1.04, bulk: 0.82, belly: 0, skin: 'PALE', head: 'scholar', torso: 'gaunt', hips: 'loin', arms: 'bare', legs: 'bare', feet: 'bare' },

  // ---- e1m5 The Scarlet Citadel (ch. II-III) -----------------------------------------------------------------------
  // Tsotha's guard: "a dozen black giants, grasping their long-shafted axes" (ch. II)
  axeman: { scale: 1.3, bulk: 1.3, belly: 0, skin: 'DARKSKIN', head: 'helm_horned', torso: 'bare', hips: 'mail', arms: 'bare', legs: 'bare', feet: 'boots', weapon: 'axe', pauldrons: true, spikes: true, cloak: true },

  // ---- e1m6 The Tower of Tamar (ch. IV) ------------------------------------------------------------------------------
  // "Prince Arpello of Pellia", "that butcher of Pellia"; "he drew and leaped at Conan"
  arpello: { scale: 1.06, bulk: 1.22, belly: 0.25, skin: 'FACE', head: 'helm_great', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'sword', tabard: 'LIVERY_PELLIA', plume: 'LIVERY_PELLIA', pauldrons: true },
  // "the swaggering Pellian soldiery"; "plumed helmets and steel caps"
  pellian: { scale: 1.0, bulk: 1.05, belly: 0.1, skin: 'FACE', head: 'helm_kettle', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'spear', tabard: 'LIVERY_PELLIA', shield: true },
  pellian_archer: { scale: 0.98, bulk: 0.95, belly: 0, skin: 'FACE', head: 'helm_kettle', torso: 'leather', hips: 'leather', arms: 'leather', legs: 'trousers', feet: 'boots', weapon: 'bow', quiver: true, leatherTex: 'LIVERY_PELLIA' },

  // ---- e1m7 The Relief of Shamar (ch. V) -------------------------------------------------------------------------------
  // Conan's side. "Trocero and his captain Prospero"; Amalrus dies "his shoulder-bone hewn in twain by Prospero's two-handed sword"
  trocero: { scale: 1.04, bulk: 1.12, belly: 0.15, skin: 'FACE', head: 'helm_great', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'sword', shield: true, tabard: 'LIVERY_POITAIN', plume: 'LIVERY_POITAIN', pauldrons: true },
  prospero: { scale: 1.06, bulk: 1.1, belly: 0, skin: 'FACE', head: 'helm_crest', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'greatsword', tabard: 'LIVERY_POITAIN', pauldrons: true },
  pknight: { scale: 1.02, bulk: 1.08, belly: 0.05, skin: 'FACE', head: 'helm_great', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'sword', shield: true, tabard: 'LIVERY_POITAIN' },
  // "stolid Bossonian archers, and keen pikemen from Gunderland, their tawny locks blowing from under their steel caps"
  bossonian: { scale: 1.0, bulk: 1.05, belly: 0.05, skin: 'FACE', head: 'helm_kettle', torso: 'leather', hips: 'leather', arms: 'leather', legs: 'trousers', feet: 'boots', weapon: 'bow', quiver: true, leatherTex: 'LIVERY_BOSSON' },
  gunderman: { scale: 1.06, bulk: 1.05, belly: 0, skin: 'FACE', head: 'helm_kettle', torso: 'mail', hips: 'mail', arms: 'mail', legs: 'trousers', feet: 'boots', weapon: 'pike', tabard: 'LIVERY_GUNDER', locks: 'TAWNY' },
  yothga: { scale: 1, bulk: 1 },   // drawn by drawYothga; here only so the shared foe code finds a scale
};
