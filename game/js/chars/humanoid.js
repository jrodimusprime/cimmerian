'use strict';
// ---------------------------------------------------------------------------
// The shared humanoid part builder: heads and helms, torsos and outfits, arms,
// legs, weapons and shields, all chosen by a CAST entry's fields.
// ---------------------------------------------------------------------------
function buildCharPart(id, part) {
  if (CAST[id].pit !== undefined) return buildPitThing(part, CAST[id]);
  if (CAST[id].ape) return buildApe(part, CAST[id]);
  const c = CAST[id], b = c.bulk, fat = c.belly || 0, mb = new MeshBuilder(2048), sk = T[c.skin];
  const L = (layerName) => T[layerName];
  const clothOf = k => ({ mail: L(c.mail || 'MAIL'), leather: L(c.leatherTex || 'LEATHER'), robe: L(c.robeTex || 'ROBE'), bare: sk, loin: sk, trousers: L('CLOTH'), sleeves: L('ROBE') }[k] || sk);
  switch (part) {
    case 'torso': {                                     // spine-local: 0 = waist, 0.55 = neck base
      const lay = clothOf(c.torso), inf = c.torso === 'mail' ? 1.04 : 1;
      loftY(mb, [[0, 0.155 * b * inf, 0.1 + 0.03 * fat, 0.095], [0.12, (0.16 + 0.07 * fat) * b * inf, 0.115 + 0.15 * fat, 0.1], [0.25, (0.175 + 0.05 * fat) * b * inf, 0.122 + 0.1 * fat, 0.102],
        [0.37, 0.205 * b * inf, 0.128, 0.106], [0.46, 0.215 * b * inf, 0.112, 0.1], [0.52, 0.15 * b, 0.085, 0.08], [0.57, 0.07 * b, 0.06, 0.06]], 12, lay);
      for (const sx of [-1, 1]) addRock(mb, sx * 0.2 * b, 0.45, 0, 0.08 * b, 0.07, 0.08, 4 + sx, lay, 0.04);   // shoulder caps
      if (c.torso === 'bare') {                         // the strangler: an ogre's yoke of trapezius over a slab chest
        for (const sx of [-1, 1]) addRock(mb, sx * 0.11 * b, 0.5, -0.02, 0.1 * b, 0.07, 0.07, 3 + sx, sk, 0.05);
        for (const sx of [-1, 1]) addRock(mb, sx * 0.075 * b, 0.37, 0.105, 0.085 * b, 0.06, 0.035, 7 + sx, sk, 0.04);
        for (let r = 0; r < 3; r++) for (const sx of [-1, 1]) addRock(mb, sx * 0.034 * b, 0.25 - r * 0.07, 0.112, 0.032, 0.03, 0.016, r * 3 + sx + 11, sk, 0.05);
      }
      if (c.torso === 'gaunt') {                        // starved: ribs under the skin, a hollow belly
        for (let r = 0; r < 5; r++) for (const sx of [-1, 1]) addBox(mb, sx * 0.07 * b, 0.42 - r * 0.055, 0.1 - r * 0.004, 0.065 * b, 0.009, 0.02, sk, sx * 0.25, ONE3, 0.1);
        addRock(mb, 0, 0.32, -0.1, 0.05, 0.12, 0.03, 9, sk, 0.08);                         // a ridge of spine
      }
      if (c.torso === 'rags') {
        loftY(mb, [[-0.05, 0.16 * b, 0.11, 0.1], [0.3, 0.19 * b, 0.12, 0.11], [0.5, 0.2 * b, 0.1, 0.1]], 10, L('CLOTH'));
        for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; addBox(mb, Math.sin(a) * 0.17 * b, -0.1 - (k % 3) * 0.06, Math.cos(a) * 0.12, 0.03, 0.12 + (k % 3) * 0.05, 0.006, L('CLOTH'), a); }
      }
      if (c.torso === 'mail') {                         // scarlet tabard over the mail, front and back
        addBox(mb, 0, 0.2, 0.128 + 0.12 * fat, 0.15 * b, 0.25, 0.008, L(c.tabard || 'TABARD'), 0, ONE3, -0.05);
        addBox(mb, 0, 0.22, -0.112, 0.15 * b, 0.25, 0.008, L(c.tabard || 'TABARD'));
      }
      if (c.torso === 'leather') {
        addBox(mb, 0, 0.3, 0.13, 0.025, 0.2, 0.01, L('LEATHER'), 0, ONE3, 0); // baldric
        addBox(mb, 0.07, 0.25, 0.125, 0.02, 0.24, 0.012, L('IRON'));
      }
      if (c.torso === 'robe') {                         // open collar, a sash under the belly
        loftY(mb, [[0.05, 0.27 * b, 0.27, 0.13], [0.11, 0.27 * b, 0.27, 0.13]], 12, L('LEATHER'));
      }
      if (c.quiver) {
        smoothLathe(mb, 0.09, 0.05, -0.13, [[0.045, 0], [0.05, 0.05], [0.05, 0.45], [0.045, 0.5]], 7, L('LEATHER'), ONE3, [-0.25, 1, -0.1]);
        for (let k = 0; k < 5; k++) addBox(mb, 0.0 + k * 0.025, 0.58, -0.17 + (k % 2) * 0.02, 0.006, 0.05, 0.02, L('BONE'), 0.3);
      }
      if (c.cloak) loftY(mb, [[-0.55, 0.3 * b, -0.18, 0.2], [0, 0.26 * b, -0.15, 0.17], [0.4, 0.23 * b, -0.13, 0.15], [0.5, 0.2 * b, -0.11, 0.14]], 12, L('BANNER'));
      if (c.pauldrons) for (const sx of [-1, 1]) {
        addRock(mb, sx * 0.24 * b, 0.47, 0, 0.11 * b, 0.07, 0.11, 9 + sx, L('STEEL'), 0.03);
        if (c.spikes) for (let k = -1; k <= 1; k++) addSpike(mb, sx * 0.27 * b, 0.5, k * 0.06, [sx * 0.7, 0.8, k * 0.3], 0.12, 0.018, 4, L('IRON'));
      }
      break;
    }
    case 'hips': {                                      // hip-local: 0 = hip joint
      loftY(mb, [[-0.09, 0.15 * b, 0.1 + 0.04 * fat, 0.115], [-0.02, 0.155 * b, 0.1 + 0.04 * fat, 0.11], [0.06, 0.155 * b, 0.1 + 0.03 * fat, 0.1]], 12, clothOf(c.hips === 'loin' ? 'loin' : c.legs === 'trousers' ? 'trousers' : c.hips));
      if (c.hips !== 'robe') {
        ringY(mb, 0.0, 0.07, 0.165 * b, 0.113 + 0.05 * fat, 0.113, L('LEATHER'));
        addBox(mb, 0, 0.035, 0.12 + 0.05 * fat, 0.03, 0.03, 0.01, L('IRON'));
      }
      if (c.hips === 'mail') {                          // hauberk skirt to mid-thigh and the tabard's flaps
        loftY(mb, [[0.01, 0.168 * b, 0.115, 0.115], [-0.12, 0.185 * b, 0.13, 0.13], [-0.26, 0.205 * b, 0.15, 0.145]], 12, L('MAIL'));
        addBox(mb, 0, -0.15, 0.155, 0.12 * b, 0.15, 0.008, L(c.tabard || 'TABARD'), 0, ONE3, 0.08);
        addBox(mb, 0, -0.15, -0.15, 0.12 * b, 0.15, 0.008, L(c.tabard || 'TABARD'), 0, ONE3, -0.08);
      }
      if (c.hips === 'leather') loftY(mb, [[0.01, 0.168 * b, 0.115, 0.115], [-0.18, 0.19 * b, 0.135, 0.135]], 10, L(c.leatherTex || 'LEATHER'));
      if (c.hips === 'rag' || c.hips === 'rags') {
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; addBox(mb, Math.sin(a) * 0.15 * b, -0.12 - (k % 2) * 0.08, Math.cos(a) * 0.11, 0.035, c.hips === 'rags' ? 0.3 : 0.12, 0.006, L('CLOTH'), a); }
      }
      if (c.hips === 'loin') {
        addBox(mb, 0, -0.13, 0.115, 0.09, 0.14, 0.012, L('CLOTH'), 0, ONE3, 0.05);
        addBox(mb, 0, -0.12, -0.12, 0.1, 0.13, 0.012, L('CLOTH'), 0, ONE3, -0.05);
      }
      if (c.hips === 'robe') {                          // a bell of robe to the ankles
        loftY(mb, [[0.06, 0.2 * b, 0.17 + 0.12 * fat, 0.15], [-0.25, 0.25 * b, 0.21 + 0.08 * fat, 0.19], [-0.6, 0.29 * b, 0.25, 0.23], [-0.9, 0.31 * b, 0.27, 0.25], [-0.93, 0.29 * b, 0.25, 0.23]], 14, L('ROBE'));
        for (const sx of [-1, 1]) addRock(mb, sx * 0.085, -0.92, 0.2, 0.05, 0.03, 0.08, 3 + sx, L('LEATHER'), 0.05);   // slipper toes
      }
      if (id === 'shukeli') {                           // his ring of keys
        const kx = 0.2 * b, mbK = mb;
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; addBox(mbK, kx + Math.cos(a) * 0.05, -0.06 + Math.sin(a) * 0.05, 0.12, 0.012, 0.012, 0.008, L('IRON')); }
        for (let k = 0; k < 3; k++) addBox(mbK, kx - 0.03 + k * 0.03, -0.14, 0.12, 0.008, 0.06, 0.006, L('IRON'), 0, ONE3, 0);
      }
      break;
    }
    case 'head': {                                      // head-local: 0 = base of the neck
      smoothLathe(mb, 0, -0.02, 0, [[0.062 * b, 0], [0.058 * b, 0.06], [0.054 * b, 0.12]], 8, sk, ONE3, [0, 1, 0]);
      const hw = id === 'shukeli' ? 1.12 : 1;
      if (!c.face) loftY(mb, HEAD_SHAPE(hw), 12, sk);
      const brute = c.head === 'brute' && !c.face, ghoul = c.head === 'crawler' || c.head === 'weeper';
      const covered = ['coif', 'hood', 'helm_great', 'helm_horned', 'helm_crest', 'helm_crown', 'helm_kettle', 'mask', 'slouch', 'sage'].includes(c.head);   // README §8: hide faces under helms
      if (brute || ghoul || c.head === 'eunuch') {
        // a face built to frighten: a heavy brow over sunken sockets, the mouth open on teeth
        addRock(mb, 0, 0.232, 0.092, 0.085, 0.024, 0.03, 4, sk, 0.06);
        for (const sx of [-1, 1]) addBox(mb, sx * 0.034, 0.205, 0.093, 0.022, 0.016, 0.012, T.BLACK);
        if (c.head === 'crawler') for (const sx of [-1, 1]) addBox(mb, sx * 0.034, 0.205, 0.1, 0.006, 0.006, 0.004, T.EYE);   // ember pin-pricks
        addBox(mb, 0, 0.142, 0.1, ghoul ? 0.03 : 0.04, c.head === 'weeper' ? 0.04 : 0.018, 0.012, T.BLACK);
        for (let k = -3; k <= 3; k++) { addBox(mb, k * 0.011, 0.156, 0.108, 0.004, 0.007, 0.004, T.BONE); addBox(mb, k * 0.011, 0.128, 0.108, 0.004, 0.007, 0.004, T.BONE); }
        addBox(mb, 0, 0.185, 0.115, 0.016, 0.022, 0.016, sk, 0, ONE3, -0.4);      // a broken nose
      } else if (!covered && !c.face) addBox(mb, 0, 0.19, 0.112, 0.012, 0.03, 0.018, sk, 0, ONE3, -0.3);                    // nose
      if (!(brute || ghoul || covered || c.face)) {
        addBox(mb, 0, 0.228, 0.098, 0.068, 0.011, 0.014, sk, 0, [0.8, 0.8, 0.8]);
        for (const sx of [-1, 1]) addBox(mb, sx * 0.034, 0.208, 0.096, 0.015, 0.007, 0.006, T.BLACK);
        addBox(mb, 0, 0.143, 0.104, 0.024, 0.004, 0.005, T.BLACK);
      }
      if (!ghoul && !covered) for (const sx of [-1, 1]) addRock(mb, sx * 0.089, 0.2, -0.005, 0.014, 0.026, 0.02, 2 + sx, sk, 0.05);   // ears
      switch (c.head) {
        case 'vulture':                                 // Tsotha: "the lean vulture", bald, a thin forked beard, hollow eyes
          addRock(mb, 0, 0.1, 0.07, 0.04, 0.07, 0.03, 4, T.HAIR, 0.1);
          addBox(mb, -0.012, 0.03, 0.08, 0.008, 0.05, 0.008, T.HAIR, 0, ONE3, 0.2); addBox(mb, 0.012, 0.03, 0.08, 0.008, 0.05, 0.008, T.HAIR, 0, ONE3, 0.2);
          break;
        case 'brute':                                   // shaved skull, scars, iron rings in the ears
          for (const sx of [-1, 1]) addLathe(mb, sx * 0.092, 0.17, -0.005, [[0.012, 0], [0.016, 0.01], [0.012, 0.02]], 6, T.IRON, 0, ONE3, [1, 0, 0]);

          break;
        case 'crawler':                                 // a long bald skull, no ears, the jaw slung low
          addRock(mb, 0, 0.27, -0.06, 0.08, 0.075, 0.12, 5, sk, 0.06);
          addRock(mb, 0, 0.12, 0.07, 0.06, 0.03, 0.06, 8, sk, 0.08);
          break;
        case 'weeper':                                  // lank hair hanging over an eyeless face
          addRock(mb, 0, 0.29, -0.01, 0.095, 0.06, 0.1, 6, T.HAIR, 0.08);
          for (let k = 0; k < 11; k++) { const a = -1.6 + k / 10 * 3.2; addBox(mb, Math.sin(a) * 0.085, 0.12, Math.cos(a) * 0.09 - 0.01, 0.012, 0.17, 0.006, T.HAIR, a, ONE3, 0.05); }
          for (const sx of [-1, 1]) addBox(mb, sx * 0.034, 0.17, 0.1, 0.003, 0.03, 0.003, T.BLACK);   // tear-tracks
          break;
        case 'helm_great': case 'helm_horned': {        // closed great helm (Quake's knights): no face at all, only the slit
          smoothLathe(mb, 0, 0, 0, [[0.112, 0.05], [0.12, 0.09], [0.122, 0.2], [0.118, 0.3], [0.1, 0.34], [0.06, 0.4], [0.012, 0.46], [0, 0.47]], 12, T.STEEL, ONE3, [0, 1, 0]);
          addBox(mb, 0, 0.215, 0.118, 0.08, 0.009, 0.012, T.BLACK);                            // eye slit
          addBox(mb, 0, 0.18, 0.124, 0.008, 0.11, 0.01, T.IRON);                               // ridge
          for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) addBox(mb, 0.035 + k * 0.016, 0.12 + r * 0.02, 0.113, 0.004, 0.004, 0.006, T.BLACK);   // breaths
          smoothLathe(mb, 0, 0, 0, [[0.12, 0.06], [0.16, 0.0], [0.17, -0.04]], 12, T.MAIL, ONE3, [0, 1, 0]);   // mail cape
          if (c.head === 'helm_horned') {
            for (const sx of [-1, 1]) {
              const pts = [[sx * 0.11, 0.3, 0], [sx * 0.2, 0.36, 0.02], [sx * 0.26, 0.46, 0.04], [sx * 0.27, 0.58, 0.02], [sx * 0.24, 0.66, -0.02]];
              for (let k = 0; k < 4; k++) addSeg(mb, pts[k], pts[k + 1], 0.035 - k * 0.007, 0.028 - k * 0.007, T.BONE, ONE3);
            }
            addBox(mb, 0, 0.48, -0.03, 0.012, 0.05, 0.13, T.BANNER, 0, ONE3, 0.2);
          }
          break;
        }
        case 'coif':                                    // a full mail coif and kettle hat: only a dark band where the eyes are
          loftY(mb, [[0.05, 0.12, 0.12, 0.11], [0.12, 0.11, 0.125, 0.115], [0.21, 0.106, 0.122, 0.115], [0.29, 0.096, 0.1, 0.105], [0.33, 0.06, 0.06, 0.07]], 12, T.MAIL);
          addBox(mb, 0, 0.205, 0.117, 0.062, 0.017, 0.012, T.BLACK);
          smoothLathe(mb, 0, 0, 0, [[0.11, 0.25], [0.114, 0.29], [0.09, 0.34], [0.04, 0.37], [0, 0.375]], 12, T.STEEL, ONE3, [0, 1, 0]);
          smoothLathe(mb, 0, 0, 0, [[0.11, 0.245], [0.18, 0.222], [0.185, 0.228], [0.115, 0.26]], 12, T.STEEL, ONE3, [0, 1, 0]);
          break;
        case 'shaved':
          for (const sx of [-1, 1]) addLathe(mb, sx * 0.092, 0.17, -0.005, [[0.012, 0], [0.016, 0.01], [0.012, 0.02]], 6, T.NAIL, 0, ONE3, [1, 0, 0]);  // earrings
          break;
        case 'eunuch':                                  // a double chin and a gold ring in each ear (the jowls are painted)
          addRock(mb, 0, 0.075, 0.05, 0.06, 0.035, 0.05, 9, sk, 0.05);
          for (const sx of [-1, 1]) addLathe(mb, sx * 0.093, 0.17, -0.005, [[0.014, 0], [0.018, 0.01], [0.014, 0.02]], 6, T.NAIL, 0, ONE3, [1, 0, 0]);
          break;
        case 'helm_conical': case 'helm_crest': {       // Kothian helm with a nasal; a beard beneath
          addRock(mb, 0, 0.11, 0.08, 0.07, 0.06, 0.045, 12, T.HAIR, 0.06);
          addBox(mb, 0, 0.152, 0.104, 0.035, 0.008, 0.008, T.HAIR);
          const cone = c.head === 'helm_crest' ? [[0.108, 0.235], [0.112, 0.27], [0.1, 0.32], [0.075, 0.36], [0.03, 0.38], [0, 0.385]] : [[0.108, 0.235], [0.11, 0.265], [0.09, 0.32], [0.05, 0.38], [0.012, 0.43], [0, 0.44]];
          smoothLathe(mb, 0, 0, 0.0, cone.map(([r, y]) => [r, y]), 12, T.STEEL, ONE3, [0, 1, 0]);
          ringY(mb, 0.228, 0.248, 0.112, 0.112, 0.112, T.IRON);
          addBox(mb, 0, 0.19, 0.118, 0.011, 0.05, 0.007, T.STEEL);                              // nasal
          addBox(mb, 0, 0.15, -0.085, 0.09, 0.09, 0.03, T.MAIL);                                // aventail at the back
          if (c.head === 'helm_crest') {
            addBox(mb, 0, 0.42, -0.02, 0.012, 0.05, 0.12, T.BANNER, 0, ONE3, 0.15);             // scarlet crest
            for (const sx of [-1, 1]) addBox(mb, sx * 0.09, 0.16, 0.05, 0.01, 0.06, 0.045, T.STEEL, sx * 0.25);   // cheek plates
          }
          break;
        }
        case 'mane':                                    // Conan: "the tangled black mane which fell over his low broad forehead"
          addRock(mb, 0, 0.29, -0.02, 0.1, 0.07, 0.11, 21, T.HAIR, 0.12);
          for (let k = 0; k < 13; k++) { const a = -2.2 + k / 12 * 4.4; addBox(mb, Math.sin(a) * 0.09, 0.2 - Math.abs(a) * 0.025, Math.cos(a) * 0.085 - 0.02, 0.022, 0.1 + 0.03 * Math.abs(Math.sin(k * 3.1)), 0.012, T.HAIR, a, ONE3, Math.abs(a) < 0.9 ? -0.35 : 0.08); }
          for (let k = -2; k <= 2; k++) addBox(mb, k * 0.03, 0.29, 0.088, 0.016, 0.04, 0.01, T.HAIR, 0, ONE3, -0.6 + 0.1 * Math.abs(k));   // the forelock over the brow
          break;
        case 'scholar':                                 // Pelias: "the head was narrow and well-formed": cropped hair, a short beard
          addRock(mb, 0, 0.3, -0.03, 0.085, 0.05, 0.09, 23, T.HAIR, 0.06);
          addRock(mb, 0, 0.1, 0.07, 0.05, 0.05, 0.035, 24, T.HAIR, 0.08);
          break;
        case 'outlaw':                                  // Ascalante: long hair tied back
          addRock(mb, 0, 0.29, -0.03, 0.09, 0.06, 0.1, 25, T.HAIR, 0.08);
          addBox(mb, 0, 0.16, -0.11, 0.025, 0.1, 0.02, T.HAIR, 0, ONE3, 0.2);
          break;
        case 'slouch':                                  // Rinaldo: "had pulled his slouch cap down above his eyes"
          addRock(mb, 0, 0.26, 0, 0.1, 0.08, 0.11, 26, T.VELVET, 0.06);
          smoothLathe(mb, 0, 0, 0.0, [[0.09, 0.235], [0.16, 0.2], [0.17, 0.185], [0.1, 0.22]], 12, T.VELVET, ONE3, [0, 1, 0.25]);   // the brim, pulled down in front
          addBox(mb, 0, 0.19, 0.088, 0.075, 0.035, 0.03, T.BLACK);                              // the face lost under it
          addBox(mb, 0.05, 0.36, -0.03, 0.01, 0.09, 0.02, T.FEATHER, 0.3, ONE3, -0.6);         // a draggled feather
          for (const sx of [-1, 1]) addBox(mb, sx * 0.08, 0.12, 0.0, 0.025, 0.09, 0.05, T.HAIR, 0, ONE3, 0.1);
          break;
        case 'sage':                                    // Epemitreus: the ancient, a deep cowl and a long white beard
          addRock(mb, 0, 0.25, -0.01, 0.12, 0.12, 0.13, 27, T.ROBE, 0.04);
          addBox(mb, 0, 0.19, 0.08, 0.07, 0.07, 0.035, T.BLACK);
          for (const sx of [-1, 1]) addBox(mb, sx * 0.03, 0.2, 0.105, 0.008, 0.004, 0.004, T.EYE);      // two pale points in the cowl
          loftY(mb, [[-0.25, 0.02, 0.015, 0.015, 0.11], [-0.1, 0.045, 0.03, 0.025, 0.12], [0.05, 0.06, 0.035, 0.03, 0.11], [0.16, 0.065, 0.03, 0.03, 0.09]], 8, T.BONE);
          addBox(mb, 0, 0.14, -0.07, 0.11, 0.12, 0.05, T.ROBE);
          break;
        case 'mask':                                    // the rogues: "four masked figures", hoods up, cloth across the face
          addRock(mb, 0, 0.25, 0.0, 0.11, 0.11, 0.12, 28, T.CLOTH, 0.05);
          addBox(mb, 0, 0.16, 0.09, 0.075, 0.06, 0.025, T.CLOTH, 0, ONE3, 0.1);
          addBox(mb, 0, 0.215, 0.093, 0.07, 0.014, 0.02, T.BLACK);
          for (const sx of [-1, 1]) addBox(mb, sx * 0.03, 0.215, 0.11, 0.008, 0.004, 0.004, T.BONE);   // the whites of the eyes
          addBox(mb, 0, 0.14, -0.07, 0.11, 0.12, 0.05, T.CLOTH);
          break;
        case 'helm_crown': {                            // a king's helm: nasal and cheek-plates, a gold circlet round the brow
          addRock(mb, 0, 0.11, 0.08, 0.075, 0.065, 0.05, 29, T.HAIR, 0.06);
          smoothLathe(mb, 0, 0, 0, [[0.108, 0.2], [0.114, 0.26], [0.1, 0.32], [0.07, 0.37], [0.025, 0.4], [0, 0.405]], 12, T.STEEL, ONE3, [0, 1, 0]);
          ringY(mb, 0.235, 0.275, 0.12, 0.12, 0.12, T.GILT);
          for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; addSpike(mb, Math.sin(a) * 0.118, 0.27, Math.cos(a) * 0.118, [Math.sin(a) * 0.2, 1, Math.cos(a) * 0.2], 0.07, 0.018, 4, T.GILT); }
          addBox(mb, 0, 0.19, 0.118, 0.011, 0.05, 0.007, T.STEEL);
          for (const sx of [-1, 1]) addBox(mb, sx * 0.09, 0.15, 0.05, 0.01, 0.07, 0.045, T.STEEL, sx * 0.25);
          addBox(mb, 0, 0.15, -0.085, 0.09, 0.09, 0.03, T.MAIL);
          break;
        }
        case 'helm_kettle':                             // kettle hat: dome and a wide brim
          addRock(mb, 0, 0.1, 0.075, 0.065, 0.05, 0.04, 13, T.HAIR, 0.06);
          smoothLathe(mb, 0, 0, 0, [[0.1, 0.24], [0.104, 0.28], [0.085, 0.33], [0.04, 0.36], [0, 0.365]], 12, T.STEEL, ONE3, [0, 1, 0]);
          smoothLathe(mb, 0, 0, 0, [[0.1, 0.235], [0.17, 0.215], [0.175, 0.22], [0.105, 0.25]], 12, T.STEEL, ONE3, [0, 1, 0]);
          if (c.locks) for (let k = 0; k < 9; k++) { const a = 1.2 + k / 8 * 3.9; addBox(mb, Math.sin(a) * 0.1, 0.15, Math.cos(a) * 0.1, 0.02, 0.09, 0.01, T[c.locks], a, ONE3, 0.15); }   // locks blowing from under the cap
          break;
        case 'hood':                                    // a deep hood: the face is a shadow
          addRock(mb, 0, 0.25, 0.0, 0.12, 0.12, 0.13, 6, T.LEATHER, 0.05);
          addBox(mb, 0, 0.18, 0.085, 0.07, 0.08, 0.035, T.BLACK);
          addBox(mb, 0, 0.14, -0.07, 0.11, 0.12, 0.05, T.LEATHER);
          loftY(mb, [[0.02, 0.2, 0.11, 0.15], [0.07, 0.1, 0.08, 0.12]], 10, T.LEATHER);          // mantle on the shoulders
          addBox(mb, 0, 0.135, 0.103, 0.03, 0.006, 0.006, T.HAIR);                              // moustache
          break;
      }
      if (c.beard) loftY(mb, [[0.0, 0.03, 0.025, 0.02, 0.1], [0.06, 0.06, 0.04, 0.03, 0.09], [0.12, 0.08, 0.04, 0.035, 0.075], [0.16, 0.085, 0.03, 0.03, 0.065]], 10, T[c.beard]);   // "blue-black beards"
      if (c.plume) addBox(mb, 0, c.head === 'helm_great' ? 0.52 : 0.45, -0.04, 0.014, 0.08, 0.13, T[c.plume], 0, ONE3, 0.35);     // a plume, the colours of his lord
      if (c.collar) ringY(mb, 0.0, 0.05, 0.075 * b, 0.075, 0.075, T.IRON);                                                           // a slave's iron collar
      break;
    }
    case 'face': {                                      // the head, UV-painted with its face (Quake's way)
      const hw = id === 'shukeli' ? 1.12 : 1;
      loftY(mb, HEAD_SHAPE(hw), 16, T[c.face], null, 1 / 0.34);
      break;
    }
    case 'uarm': {                                      // shoulder-local, hanging down
      const lay = clothOf(c.arms), al = c.arm || 1;
      if (al !== 1) { smoothLathe(mb, 0, 0, 0, [[0.05 * b, -0.03], [0.064 * b, 0.04], [0.05 * b, 0.15 * al], [0.042 * b, 0.3 * al]], 8, lay, ONE3, DOWN); break; }
      smoothLathe(mb, 0, 0, 0, [[0.05 * b, -0.03], [0.064 * b, 0.04], [0.058 * b, 0.12], [0.05 * b, 0.24], [0.045 * b, 0.3]], 8, lay, ONE3, DOWN);
      if (c.arms === 'bare') ringY(mb, -0.19, -0.15, 0.056 * b, 0.056 * b, 0.056 * b, T.IRON);
      if (c.arms === 'sleeves') smoothLathe(mb, 0, 0, 0, [[0.07 * b, 0], [0.08 * b, 0.15], [0.09 * b, 0.3]], 8, lay, ONE3, DOWN);
      break;
    }
    case 'farm': {                                      // elbow-local: forearm, wrist and a closed hand
      if (c.arm && c.arm !== 1) {                       // the long-armed things: a wasted forearm and a clawed hand
        const al = c.arm;
        smoothLathe(mb, 0, 0, 0, [[0.042 * b, -0.02], [0.044 * b, 0.08], [0.03 * b, 0.27 * al], [0.028 * b, 0.3 * al]], 8, sk, ONE3, DOWN);
        addRock(mb, 0, -0.32 * al, 0.015, 0.035 * b, 0.05, 0.035, 3, sk, 0.05);
        for (let k = -1.5; k <= 1.5; k++) addSpike(mb, k * 0.016, -0.35 * al, 0.03, [0, -1, 0.5], 0.13, 0.008, 4, T.BONE);
        break;
      }
      smoothLathe(mb, 0, 0, 0, [[0.045 * b, -0.02], [0.05 * b, 0.06], [0.043 * b, 0.16], [0.034 * b, 0.25], [0.031 * b, 0.28]], 8, sk, ONE3, DOWN);
      if (c.arms === 'mail' || c.arms === 'leather') smoothLathe(mb, 0, 0, 0, [[0.05 * b, 0.05], [0.054 * b, 0.08], [0.046 * b, 0.22], [0.042 * b, 0.25]], 8, T.LEATHER, ONE3, DOWN);
      if (c.arms === 'bare') ringY(mb, -0.26, -0.22, 0.037 * b, 0.037 * b, 0.037 * b, T.IRON);
      if (c.arms === 'sleeves') smoothLathe(mb, 0, 0, 0, [[0.075 * b, 0], [0.1 * b, 0.12], [0.12 * b, 0.22], [0.1, 0.24]], 8, T.ROBE, ONE3, DOWN);
      addRock(mb, 0, -0.31, 0.012, 0.033 * b, 0.045, 0.04, 3, sk, 0.04);          // palm
      addRock(mb, 0, -0.35, 0.03, 0.031 * b, 0.03, 0.032, 5, sk, 0.06);           // curled fingers
      addRock(mb, -0.03, -0.32, 0.04, 0.012, 0.025, 0.014, 7, sk, 0.05);          // thumb
      break;
    }
    case 'thigh': {
      const lay = c.legs === 'bare' ? sk : clothOf(c.legs);
      smoothLathe(mb, 0, 0, 0, [[0.08 * b, -0.04], [0.088 * b, 0.05], [0.078 * b, 0.22], [0.06 * b, 0.4], [0.054 * b, 0.47]], 8, lay, ONE3, DOWN);
      addRock(mb, 0, -0.45, 0.04, 0.045 * b, 0.04, 0.03, 4, lay, 0.05);        // kneecap
      break;
    }
    case 'shin': {
      const boot = c.feet === 'boots';
      smoothLathe(mb, 0, 0, 0, [[0.054 * b, -0.02], [0.06 * b, 0.08], [0.064 * b, 0.15], [0.046 * b, 0.34], [0.04 * b, 0.43]], 8, c.legs === 'bare' ? sk : T.CLOTH, ONE3, DOWN);
      if (boot) smoothLathe(mb, 0, 0, 0, [[0.066 * b, 0.12], [0.07 * b, 0.15], [0.054 * b, 0.33], [0.05 * b, 0.43], [0.052 * b, 0.45]], 8, T.LEATHER, ONE3, DOWN);
      loft(mb, [S_(-0.06, 0.042, 0.04, 0.04, -0.45), S_(0.0, 0.048, 0.05, 0.04, -0.455), S_(0.08, 0.05, 0.032, 0.035, -0.47), S_(0.15, 0.04, 0.022, 0.022, -0.477), S_(0.19, 0.012, 0.012, 0.012, -0.48)], 10, boot ? T.LEATHER : sk);
      break;
    }
    case 'sword':                                       // along +y: pommel, grip, cross, blade
      addRock(mb, 0, -0.03, 0, 0.022, 0.022, 0.022, 2, T.IRON, 0.05);
      smoothLathe(mb, 0, 0, 0, [[0.016, -0.015], [0.018, 0.04], [0.016, 0.1]], 8, T.GRIP, ONE3, [0, 1, 0]);
      addBox(mb, 0, 0.11, 0, 0.09, 0.012, 0.016, T.IRON);
      loft(mb, [S_(0.12, 0.028, 0.006, 0.006, 0), S_(0.5, 0.025, 0.005, 0.005, 0), S_(0.8, 0.017, 0.004, 0.004, 0), S_(0.88, 0.001, 0.001, 0.001, 0)], 4, T.STEEL, 1, null, 'y');
      break;
    case 'axe':                                         // a long-shafted axe: a black haft, a broad bearded head
      smoothLathe(mb, 0, 0, 0, [[0.02, -0.9], [0.022, 0], [0.02, 1.25]], 6, T.WOOD, ONE3, [0, 1, 0]);
      loft(mb, [S_(0.95, 0.008, 0.02, 0.02, 0, 0.03), S_(1.05, 0.008, 0.16, 0.03, 0, 0.03), S_(1.25, 0.008, 0.2, 0.02, 0, 0.03), S_(1.32, 0.006, 0.12, 0.01, 0, 0.03)], 4, T.STEEL, 1, null, 'y');
      addSpike(mb, 0, 1.25, 0, [0, 1, 0], 0.16, 0.02, 4, T.STEEL);
      break;
    case 'greatsword':                                  // Prospero's two-handed sword: a long grip, a long blade
      addRock(mb, 0, -0.1, 0, 0.026, 0.026, 0.026, 2, T.IRON, 0.05);
      smoothLathe(mb, 0, 0, 0, [[0.017, -0.09], [0.019, 0.05], [0.017, 0.2]], 8, T.GRIP, ONE3, [0, 1, 0]);
      addBox(mb, 0, 0.21, 0, 0.13, 0.014, 0.018, T.IRON);
      loft(mb, [S_(0.22, 0.034, 0.007, 0.007, 0), S_(0.8, 0.03, 0.006, 0.006, 0), S_(1.2, 0.02, 0.005, 0.005, 0), S_(1.3, 0.001, 0.001, 0.001, 0)], 4, T.STEEL, 1, null, 'y');
      break;
    case 'dagger':
      smoothLathe(mb, 0, 0, 0, [[0.014, -0.01], [0.016, 0.03], [0.014, 0.08]], 6, T.GRIP, ONE3, [0, 1, 0]);
      addBox(mb, 0, 0.09, 0, 0.045, 0.01, 0.012, T.IRON);
      loft(mb, [S_(0.1, 0.02, 0.005, 0.005, 0), S_(0.25, 0.015, 0.004, 0.004, 0), S_(0.33, 0.001, 0.001, 0.001, 0)], 4, T.STEEL, 1, null, 'y');
      break;
    case 'pike':                                        // the Gundermen's pikes: a spear twice a man's height
      smoothLathe(mb, 0, 0, 0, [[0.018, -1.6], [0.02, 0], [0.018, 2.4]], 6, T.WOOD, ONE3, [0, 1, 0]);
      loft(mb, [S_(2.38, 0.02, 0.01, 0.01, 0), S_(2.5, 0.032, 0.008, 0.008, 0), S_(2.66, 0.014, 0.006, 0.006, 0), S_(2.75, 0.001, 0.001, 0.001, 0)], 4, T.STEEL, 1, null, 'y');
      break;
    case 'spear':
      smoothLathe(mb, 0, 0, 0, [[0.017, -0.7], [0.019, 0], [0.017, 1.5]], 6, T.WOOD, ONE3, [0, 1, 0]);
      smoothLathe(mb, 0, 0, 0, [[0.022, 1.48], [0.024, 1.56]], 6, T.IRON, ONE3, [0, 1, 0]);
      loft(mb, [S_(1.55, 0.02, 0.008, 0.008, 0), S_(1.66, 0.04, 0.008, 0.008, 0), S_(1.8, 0.022, 0.006, 0.006, 0), S_(1.9, 0.001, 0.001, 0.001, 0)], 4, T.STEEL, 1, null, 'y');
      break;
    case 'bow': {                                       // a recurve held vertically, string at -z
      const pts = [];
      for (let k = 0; k <= 10; k++) { const t = k / 10 * 2 - 1, y = t * 0.62; pts.push([0, y, 0.1 * (1 - t * t) - 0.03 * Math.pow(Math.abs(t), 6)]); }
      for (let k = 0; k < 10; k++) addSeg(mb, pts[k], pts[k + 1], k === 4 || k === 5 ? 0.02 : 0.014, k === 4 || k === 5 ? 0.02 : 0.012, T.WOOD, ONE3);
      addBox(mb, 0, 0, -0.02, 0.003, 0.6, 0.003, T.BONE);
      break;
    }
    case 'shield':                                      // round, painted, iron-rimmed, bossed; faces +z
      smoothLathe(mb, 0, 0, 0, [[0, 0.03], [0.24, 0.022], [0.3, 0.0], [0.3, -0.02], [0, -0.02]], 16, T.SHIELD, ONE3, [0, 0, 1]);
      smoothLathe(mb, 0, 0, 0, [[0.29, 0.03], [0.31, 0.015], [0.31, -0.025], [0.29, -0.02]], 16, T.IRON, ONE3, [0, 0, 1]);
      addRock(mb, 0, 0, 0.04, 0.07, 0.07, 0.04, 3, T.STEEL, 0.03);
      addSpike(mb, 0, 0, 0.06, [0, 0, 1], 0.12, 0.03, 5, T.IRON);   // a spike in the boss
      break;
  }
  return mb.finish();
}
