'use strict';
// ---------------------------------------------------------------------------
// The cast gallery: index.html?cast (or ?cast=<id>). Every creature and person
// the campaign uses, prologue to the Tybor, each shown front and profile side
// by side in the game's own renderer and palette. Left/right arrows step
// through them; the page's own screenshots are the review sheet.
// ---------------------------------------------------------------------------
const GALLERY_LIST = [
  ['conan', 'Conan, in the pits', 'all levels (chase camera, death)', 'naked but for a loin-cloth ... the tangled black mane'],
  ['conan_mail', 'Conan, in black mail', 'e1m1', 'the black-mailed figure ... the crested, dented helmet'],
  ['assassin', 'An assassin', 'e0m1', 'four masked figures ... cloaks wrapped closely about them'],
  ['gromel', 'Gromel', 'e0m1', 'the giant commander of the Black Legion'],
  ['volmana', 'Volmana', 'e0m1', 'the dwarfish count of Karaban'],
  ['rinaldo', 'Rinaldo', 'e0m1', 'had pulled his slouch cap down above his eyes'],
  ['ascalante', 'Ascalante', 'e0m1', 'a tall, lean man in worn velvet'],
  ['demon', 'The slave of the Ring', 'e0m1', 'not unlike that of a gigantic baboon'],
  ['epemitreus', 'Epemitreus', 'e0m1', 'dead for fifteen hundred years'],
  ['kknight', 'Kothian knight', 'e1m1, e1m7', 'dark-faced Kothian knights'],
  ['oknight', 'Ophirean knight', 'e1m1, e1m7', 'Ophirean knights in gilded mail'],
  ['spearman', 'Kothian spearman', 'e1m1, e1m7', 'the Kothian spearmen'],
  ['archer', 'Shemite archer', 'e1m1, e1m7', 'squat Shemites with blue-black beards'],
  ['pikeman', 'Pikeman of the host', 'e1m1', 'the giants in their steel caps and mail brigandines'],
  ['strabonus', 'Strabonus, king of Koth', 'e1m1, e1m7', 'his broad dark face and crafty eyes'],
  ['amalrus', 'Amalrus, king of Ophir', 'e1m1, e1m7', 'slender, fastidious, treacherous, dangerous as a cobra'],
  ['tsotha', 'Tsotha-lanti', 'e1m1, e1m8', 'the lean vulture ... clad only in silken robes'],
  ['@horse', 'War-horse', 'e1m1, e1m7', 'Riderless horses raced down the field'],
  ['giant', 'The strangler', 'e1m2', 'a gigantic black man, stark naked'],
  ['shukeli', 'Shukeli', 'e1m2, e1m4', 'a fat repellent figure'],
  ['@satha_head', 'Satha (head)', 'e1m2, e1m3, e1m4', 'the great shimmering white form'],
  ['thing', 'Pit-thing', 'e1m2, e1m3, e1m4', 'monsters with dripping jaws agape'],
  ['thing_b', 'Pit-thing (humped)', 'e1m2, e1m3, e1m4', 'shadowy forms ... monstrous and abnormal in outline'],
  ['thing_c', 'Pit-thing (long-armed)', 'e1m2, e1m3, e1m4', 'the burning glare of hungry eyes'],
  ['@weeper', 'The weeping thing', 'e1m3', 'an amorphic bulk ... a frog-like head'],
  ['@presence', 'The presence in the well', 'e1m3', 'something bodiless'],
  ['@yothga', 'Yothga', 'e1m4', 'a livid, unnatural crimson, like a perversity of flower-life'],
  ['pelias', 'Pelias', 'e1m4, e1m5', 'a high splendid forehead'],
  ['axeman', 'Black guard', 'e1m5', 'black giants, grasping their long-shafted axes'],
  ['slave', 'Citadel slave', 'e1m5', 'naked slave-boys ... pouring wine'],
  ['arpello', 'Arpello of Pellia', 'e1m6', 'that butcher of Pellia'],
  ['pellian', 'Pellian man-at-arms', 'e1m6', 'the swaggering Pellian soldiery'],
  ['pellian_archer', 'Pellian archer', 'e1m6', 'plumed helmets and steel caps'],
  ['trocero', 'Trocero of Poitain', 'e1m7', 'Trocero and his captain Prospero'],
  ['prospero', 'Prospero', 'e1m7', "Prospero's two-handed sword"],
  ['pknight', 'Poitanian knight', 'e1m7', 'the nineteen hundred knights of Conan'],
  ['bossonian', 'Bossonian archer', 'e1m7', 'stolid Bossonian archers'],
  ['gunderman', 'Gunderman pikeman', 'e1m7', 'their tawny locks blowing from under their steel caps'],
  ['@steed', "Tsotha's steed", 'e1m8', 'a gaunt weird-looking steed'],
  ['@eagle', 'The eagle', 'e1m8', 'a huge eagle ... drove at the head of Tsotha\'s steed'],
];
let galleryIdx = 0, galleryStage = null, galleryLabel = null;
window.GALLERY_ON = false;

function startGallery(want) {
  window.GALLERY_ON = true;
  R.resize(innerWidth, innerHeight, 720);                // judged at a high line count; the game itself runs lower
  onResize = () => R.resize(innerWidth, innerHeight, 720);
  for (const el of document.querySelectorAll('body > *:not(canvas)')) el.style.display = 'none';
  galleryLabel = document.createElement('div');
  galleryLabel.style.cssText = 'position:fixed;left:0;right:0;top:0;padding:14px 20px;font:15px/1.35 Georgia,serif;color:#e8dcc0;background:linear-gradient(#000c,#0000);pointer-events:none;';
  document.body.appendChild(galleryLabel);
  const i = GALLERY_LIST.findIndex(g => g[0] === want || g[0] === '@' + want);
  galleryShow(i >= 0 ? i : 0);
  addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') galleryShow(galleryIdx + 1);
    if (e.key === 'ArrowLeft') galleryShow(galleryIdx - 1);
  });
}
function galleryShow(i) {
  galleryIdx = (i + GALLERY_LIST.length) % GALLERY_LIST.length;
  const [id, name, lv, q] = GALLERY_LIST[galleryIdx];
  galleryLabel.innerHTML = `<div style="font-size:22px;letter-spacing:2px;color:#d8a24a">${name.toUpperCase()}</div>` +
    `<div style="opacity:.85"><i>"${q}"</i> &nbsp;·&nbsp; ${lv} &nbsp;·&nbsp; ${galleryIdx + 1}/${GALLERY_LIST.length}</div>` +
    `<div style="opacity:.6;font-size:12px;margin-top:2px">${id === '@horse' || id === '@steed' ? 'CC0 "Rigged Horse" (OpenGameArt), refitted in Blender (tools/blender)' : CAST[id] && CAST[id].pit !== undefined ? 'CC0 "Goblin" (OpenGameArt), refitted in Blender (tools/blender)' : CAST[id] && !CAST[id].pit && !CAST[id].ape ? 'CC0 MakeHuman body, skin, eyes and hair; armour and dress built in Blender (tools/blender)' : id.startsWith('@') ? 'built in Blender (tools/blender)' : 'CC0 MakeHuman body, reshaped; built in Blender (tools/blender)'}</div>` +
    `<div style="position:fixed;bottom:12px;left:0;right:0;display:flex;justify-content:space-around;opacity:.7;font-size:13px;letter-spacing:3px"><span>FRONT</span><span>PROFILE</span></div>`;
  return id;
}
window.galleryShow = galleryShow;

// how big each subject is, for framing: [height to frame, eye height]
function gallerySize(id) {
  if (new URLSearchParams(location.search).has('face') && SKINNED[id] && SKINNED[id].byName.head !== undefined && !(CAST[id].pit !== undefined || CAST[id].ape)) {   // ?cast&face: the head, close
    const hb = SKINNED[id].bones[SKINNED[id].byName.head].rest, k = SKIN_SCALE[id] || 1;
    return [0.42, (hb[1] + 0.03) * k];
  }
  if (id === '@horse' || id === '@steed') return [3.9, 1.4];
  if (id === '@yothga') return [3.6, 1.3];
  if (id === '@weeper') return [6.5, 1.6];
  if (id === '@eagle') return [5.5, 0.9];
  if (id === '@satha_head') return [4.2, 0.7];
  if (id === '@presence') return [10, 2.5];
  const c = CAST[id] || {};
  return [2.3 * (c.scale || 1), 1.0 * (c.scale || 1)];
}
// the pose each is shown in: Quake's killers hunched and armed, the others at their ease
function galleryPose(id, t) {
  const c = CAST[id], P = poseIdle({}, t);
  if (c.pit !== undefined && !SKINNED[id]) return poseCrawl(P, 0, 0.1, t);
  if (c.pit !== undefined) return Object.assign(poseMenace(P, t), { lean: 0.5, headX: -0.5, uxL: -0.5, uxR: -0.5, fxL: -0.6, fxR: -0.6, uzL: 0.3, uzR: 0.3 });
  if (c.ape) return Object.assign(poseMenace(P, t), { lean: 0.75, headX: -0.65, uxL: -0.75, uxR: -0.75, fxL: -0.3, fxR: -0.3, uzL: 0.3, uzR: 0.3, txL: -0.6, txR: -0.5, sxL: 0.9, sxR: 0.8, drop: -0.2 });
  if (!c.weapon) return P;
  if (c.weapon !== 'bow') poseMenace(P, t);
  if (c.shield) { P.uxL = -0.35; P.fxL = -1.25; P.uzL = 0.25; }
  if (['spear', 'axe', 'pike'].includes(c.weapon)) { P.uxR = -0.25; P.fxR = -1.2; P.we = 1.25; if (c.weapon === 'axe') { P.uxL = -0.6; P.fxL = -1.3; } }
  else if (c.weapon === 'sword' || c.weapon === 'greatsword') { P.uxR = -0.25; P.fxR = -0.9; P.we = 0.45; }
  else if (c.weapon === 'dagger') { P.uxR = -0.4; P.fxR = -1.1; P.we = 0.1; }
  else if (c.weapon === 'bow') { P.uxL = -0.2; P.fxL = -0.6; }
  return P;
}
function drawGallerySubject(id, t, light) {
  if (id === '@horse') return drawHorse(0, 0, 0, 0, 0, light, false);
  if (id === '@steed') return drawHorse(0, 0, 0, 0, 0, light, false, true);
  if (id === '@yothga') return drawYothga(0, 0, 0, 0, t, 0.6, light);
  if (id === '@eagle') return drawEagle(0, 0.9, 0, 0, t, light);
  if (id === '@weeper') return drawWeeper({ x: 0, y: 0, z: 0, yaw: 0, homeX: 0, state: 'idle', moving: false, walk: 0 }, light);
  if (id === '@satha_head') { const hm = m4trs(0, 0.3, 0, 0, 0, 0, 0.82); drawPart('satha_head', 'satha_head_uv', hm, light, 0.03); drawPart('satha_jaw', 'satha_jaw_uv', m4mul(hm, m4mul(m4t(0, -0.1, -0.3), m4mul(m4rx(0.45), m4t(0, 0.1, 0.3)))), light, 0.03); return; }
  if (id === '@presence') {
    R.blend(true);
    for (let k = 0; k < 3; k++) drawPart('presence', 'presence', m4mul(m4trs(Math.sin(t * 0.7 + k * 2.1) * 0.6, 0, Math.cos(t * 0.5 + k) * 0.3, t * (0.3 + k * 0.2) + k * 2, 0, 0, 1), m4s3(0.7 + 0.25 * k, 1, 0.7 + 0.25 * k)), light, 0.25, 0.5 + 0.25 * Math.sin(t * 5 + k * 1.7));
    R.blend(false);
    return;
  }
  drawCharacter(id, 0, 0, 0, 0, galleryPose(id, t), light);
}
let galleryBackdrop = null;
function renderGallery(dt) {
  if (!galleryBackdrop) {                               // a round stone room, lit from the front-left like a sculptor's table
    const mb = new MeshBuilder(4096);
    smoothLathe(mb, 0, 0, 0, [[18, -0.05], [18, 14]], 40, T.HEWN, ONE3, [0, 1, 0]);
    addBox(mb, 0, -0.05, 0, 19, 0.05, 19, T.FLAG);
    galleryBackdrop = R.createMesh(mb.finish());
  }
  const id = GALLERY_LIST[galleryIdx][0], [h, eye] = gallerySize(id), t = gameTime;
  const gl = R.gl, half = Math.floor(R.lw / 2), aspect = half / R.lh;
  const light = [0.7, 0.66, 0.6]; light.d = norm3([0.45, 0.8, 0.55]);
  R.beginScene(t);
  R.lightMul(1);
  for (const [vx, cyaw] of [[0, 0], [half, Math.PI / 2]]) {
    gl.viewport(vx, 0, half, R.lh);
    const d = h * 1.25 / Math.tan(30 * Math.PI / 180) * 0.6 + 0.6, cx = Math.sin(cyaw) * d, cz = Math.cos(cyaw) * d;
    const proj = m4persp(50 * Math.PI / 180, aspect, 0.05, 60);
    const view = m4mul(m4rx(0.04), m4mul(m4ry(-cyaw), m4t(-cx, -eye, -cz)));
    R.setCamera(m4mul(proj, view), [cx, eye, cz], [cx * 0.7 + 1.2, eye + 1.5, cz * 0.7 + 1.2], [0.34, 0.32, 0.3].map(v => v * (new URLSearchParams(location.search).has('face') ? 0.35 : 1)), 14, 0.01);
    const bl = [0.2, 0.17, 0.14]; bl.d = [0, 1, 0];
    R.key = bl.d; R.drawEntity(galleryBackdrop, m4t(0, 0, 0), bl, 0, 1, false);
    drawGallerySubject(id, t, light);
  }
  R.present(0, 0, [0, 0, 0]);
}
