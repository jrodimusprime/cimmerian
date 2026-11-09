'use strict';
// ---------------------------------------------------------------------------
// Skinned characters (README §8): the cast as real meshes, built in Blender from
// CC0 MakeHuman bodies (tools/blender/), exported as .glb with a 23-bone
// game-engine skeleton and baked textures. The game's own poses drive them: the
// pose library's joint angles (P.lean, P.uxR, ...) are applied at the skeleton's
// real joints, in frames aligned with the body (rest pose: standing, arms down),
// so every pose, attack and death the old part-built rig had carries over.
// The sim never looks at any of this: rendering only, so determinism is untouched.
// ---------------------------------------------------------------------------
const SKIN_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aJoint;
layout(location=4) in vec4 aWeight;
uniform mat4 uVP;
uniform mat4 uModel;
uniform mat4 uBones[32];
out vec3 vWPos;
out vec3 vNor;
out vec2 vUv;
void main() {
  mat4 sk = uBones[int(aJoint.x)] * aWeight.x + uBones[int(aJoint.y)] * aWeight.y + uBones[int(aJoint.z)] * aWeight.z + uBones[int(aJoint.w)] * aWeight.w;
  vec4 wp = uModel * sk * vec4(aPos, 1.0);
  vWPos = wp.xyz;
  vNor = normalize(mat3(uModel) * mat3(sk) * aNor);
  vUv = aUv;
  gl_Position = uVP * wp;
}`;
const SKIN_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2D uSkinTex;
uniform sampler2DArray uTex;
uniform vec3 uEntLight;
uniform vec3 uKeyDir;
uniform float uGlow;
uniform float uAlpha;
uniform vec3 uLampPos;
uniform vec3 uLampCol;
uniform float uLampRange;
uniform vec3 uCamPos;
uniform float uFog;
uniform float uTime;
uniform float uLightMul;
uniform vec3 uHaze;
uniform vec4 uGFog;
uniform vec3 uGFogCol;
uniform vec4 uVoid;
uniform float uVoidW;
uniform float uAlphaTest;
in vec3 vWPos;
in vec3 vNor;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 t = texture(uSkinTex, vUv);
  if (uAlphaTest > 0.5 && t.a < 0.5) discard;                     // hair and brows: cut-out cards
  vec3 n = normalize(vNor);
  if (dot(n, uCamPos - vWPos) < 0.0) n = -n;                     // two-sided cloth, and mirrored view-model hands
  float hl = dot(n, uKeyDir) * 0.5 + 0.5;
  vec3 light = uEntLight * (0.3 + 1.15 * hl * hl) * uLightMul;
  vec3 Ld = uLampPos - vWPos;
  float d = max(length(Ld), 0.001);
  float att = clamp(1.0 - d / uLampRange, 0.0, 1.0); att *= att;
  float lam = max(dot(n, Ld / d), 0.0) * 0.75 + 0.25;
  light += uLampCol * att * lam;
  // a rim of the key light round the silhouette, so a figure separates from the dark behind it
  vec3 vd = normalize(uCamPos - vWPos);
  light += uEntLight * pow(1.0 - max(dot(n, vd), 0.0), 3.0) * 0.35 * max(dot(n, uKeyDir) + 0.4, 0.0);
  light = floor(light * 16.0 + 0.5) / 16.0;
  float e = clamp((1.0 - t.a) * 0.0 + uGlow, 0.0, 1.0);
  vec3 col = t.rgb * (light * 1.6 * (1.0 - e) + e * 1.3);
  float fd = length(vWPos - uCamPos);
  float f = exp(-fd * uFog);
  vec3 rgb = mix(uHaze, col, f);
  if (uGFog.w > 0.5) {
    vec3 rd = vWPos - uCamPos; float L = length(rd), ry = rd.y, b = uGFog.y;
    float bank = texture(uTex, vec3(vWPos.xz * 0.012 + vec2(uTime * 0.006, uTime * 0.0025), ${T.GRIME}.0)).r;
    float a = uGFog.x * (0.45 + 1.1 * bank);
    float ray = min(abs(ry * b) > 1e-3 ? (1.0 - exp(-b * ry)) / (b * ry) : 1.0, 1.6);
    float amt = a * L * exp(-b * (uCamPos.y - uGFog.z)) * ray;
    rgb = mix(rgb, uGFogCol, clamp(1.0 - exp(-amt), 0.0, 0.92));
  }
  vec2 vv = uVoid.zw - uVoid.xy; float vl = length(vv);
  if (vl > 0.0) {
    vec2 vn = vv / vl, rel = vWPos.xz - uVoid.xy;
    float along = dot(rel, vn) / vl, lat = abs(dot(rel, vec2(-vn.y, vn.x)));
    if (lat < uVoidW && along > 0.0) rgb *= 1.0 - smoothstep(0.0, 1.0, along) * (1.0 - smoothstep(uVoidW - 1.0, uVoidW, lat));
  }
  outColor = vec4(rgb, uAlpha);
}`;

const SKINNED = {};
// bigger than any man MakeHuman will make: the giants of the book, scaled up whole
const SKIN_SCALE = { giant: 1.18, axeman: 1.12, demon: 1.25, gromel: 1.06, pikeman: 1.04 };                 // cast id -> loaded model, once its .glb has arrived
let skinProg = null, skinU = null;
function skinInit() {
  const gl = R.gl;
  skinProg = R.program(SKIN_VS, SKIN_FS);
  skinU = {};
  for (const n of ['uVP', 'uModel', 'uBones', 'uSkinTex', 'uTex', 'uEntLight', 'uKeyDir', 'uGlow', 'uAlpha', 'uLampPos', 'uLampCol', 'uLampRange', 'uCamPos', 'uFog', 'uTime', 'uLightMul', 'uHaze', 'uGFog', 'uGFogCol', 'uVoid', 'uVoidW', 'uAlphaTest'])
    skinU[n] = gl.getUniformLocation(skinProg, n);
  // the renderer's setCamera / beginScene / lightMul only reach the main program; mirror them here
  const sc = R.setCamera.bind(R), lm = R.lightMul.bind(R), bs = R.beginScene.bind(R);
  R.setCamera = (vp, camPos, lampPos, lampCol, lampRange, fog) => { sc(vp, camPos, lampPos, lampCol, lampRange, fog); R._cam = { vp, camPos, lampPos, lampCol, lampRange, fog }; };
  R.lightMul = v => { lm(v); R._lm = v; };
  R.beginScene = t => { bs(t); R._time = t; R._lm = 1; };
}

// ---- .glb loading --------------------------------------------------------------
async function loadGLB(url) {
  const buf = await new Promise((ok, no) => {          // XHR, not fetch: it also reads file:// pages (the tests)
    const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer';
    x.onload = () => (x.status === 200 || x.status === 0) && x.response && x.response.byteLength ? ok(x.response) : no(new Error(url));
    x.onerror = () => no(new Error(url)); x.send();
  }), dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('not a glb: ' + url);
  let off = 12, json = null, bin = null;
  while (off < buf.byteLength) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, len)));
    else if (type === 0x004E4942) bin = new Uint8Array(buf, off + 8, len);
    off += 8 + len;
  }
  const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const acc = i => {
    const a = json.accessors[i], bv = json.bufferViews[a.bufferView], C = COMP[a.componentType], n = NCOMP[a.type];
    const start = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || 0, es = C.BYTES_PER_ELEMENT;
    if (!stride || stride === n * es) return new C(bin.buffer.slice(start, start + a.count * n * es));
    const out = new C(a.count * n), src = new DataView(bin.buffer);
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) {
      const p = start + k * stride + c * es;
      out[k * n + c] = C === Float32Array ? src.getFloat32(p, true) : C === Uint16Array ? src.getUint16(p, true) : C === Uint8Array ? src.getUint8(p) : src.getUint32(p, true);
    }
    return out;
  };
  // node world matrices at rest (the armature's rest pose)
  const nodes = json.nodes, parent = new Array(nodes.length).fill(-1);
  nodes.forEach((n, i) => (n.children || []).forEach(c => { parent[c] = i; }));
  const local = n => {
    if (n.matrix) return new Float32Array(n.matrix);
    const t = n.translation || [0, 0, 0], r = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
    const [x, y, z, w] = r, m = new Float32Array(16);
    m[0] = (1 - 2 * (y * y + z * z)) * s[0]; m[1] = 2 * (x * y + z * w) * s[0]; m[2] = 2 * (x * z - y * w) * s[0];
    m[4] = 2 * (x * y - z * w) * s[1]; m[5] = (1 - 2 * (x * x + z * z)) * s[1]; m[6] = 2 * (y * z + x * w) * s[1];
    m[8] = 2 * (x * z + y * w) * s[2]; m[9] = 2 * (y * z - x * w) * s[2]; m[10] = (1 - 2 * (x * x + y * y)) * s[2];
    m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1;
    return m;
  };
  const worldM = [];
  const world = i => worldM[i] || (worldM[i] = parent[i] < 0 ? local(nodes[i]) : m4mul(world(parent[i]), local(nodes[i])));
  const skin = json.skins ? json.skins[0] : { joints: [] }, joints = skin.joints;   // a static part has no skin: one implicit root bone
  const jIndex = new Map(joints.map((n, j) => [n, j]));
  const bones = joints.map((n, j) => {
    const w = world(n);
    let p = parent[n]; while (p >= 0 && !jIndex.has(p)) p = parent[p];
    return { name: nodes[n].name, parent: p >= 0 ? jIndex.get(p) : -1, rest: [w[12], w[13], w[14]] };
  });
  // textures
  const images = await Promise.all((json.images || []).map(async im => {
    const bv = json.bufferViews[im.bufferView];
    const blob = new Blob([new Uint8Array(bin.buffer, bin.byteOffset + (bv.byteOffset || 0), bv.byteLength)], { type: im.mimeType });
    return createImageBitmap(blob, { imageOrientation: 'none', colorSpaceConversion: 'none' });
  }));
  const gl = R.gl;
  const texOf = img => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return t;
  };
  const textures = images.map(texOf);
  const white = (() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([200, 200, 200, 255])); return t; })();
  // every skinned primitive becomes one draw: interleaved pos, normal, uv, joints, weights
  const prims = [];
  json.nodes.forEach((node, ni) => {
    if (node.mesh === undefined) return;
    const meshW = world(ni);
    for (const p of json.meshes[node.mesh].primitives) {
      const A = p.attributes, pos = acc(A.POSITION), nor = acc(A.NORMAL), uv = A.TEXCOORD_0 !== undefined ? acc(A.TEXCOORD_0) : null;
      const jn = A.JOINTS_0 !== undefined ? acc(A.JOINTS_0) : null, wt = A.WEIGHTS_0 !== undefined ? acc(A.WEIGHTS_0) : null;
      const n = pos.length / 3, data = new Float32Array(n * 16);
      const rigid = node.skin === undefined;
      // a mesh parented to a bone (helmets, shields) rides that bone rigidly
      let rb = -1; { let q = ni; while (q >= 0 && rb < 0) { if (jIndex.has(q)) rb = jIndex.get(q); q = parent[q]; } }
      for (let k = 0; k < n; k++) {
        let x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2], nx = nor[k * 3], ny = nor[k * 3 + 1], nz = nor[k * 3 + 2];
        if (rigid) {                                    // bake the node's rest placement into the vertices
          const X = meshW[0] * x + meshW[4] * y + meshW[8] * z + meshW[12], Y = meshW[1] * x + meshW[5] * y + meshW[9] * z + meshW[13], Z = meshW[2] * x + meshW[6] * y + meshW[10] * z + meshW[14];
          const NX = meshW[0] * nx + meshW[4] * ny + meshW[8] * nz, NY = meshW[1] * nx + meshW[5] * ny + meshW[9] * nz, NZ = meshW[2] * nx + meshW[6] * ny + meshW[10] * nz;
          x = X; y = Y; z = Z; nx = NX; ny = NY; nz = NZ;
        }
        const o = k * 16;
        data[o] = x; data[o + 1] = y; data[o + 2] = z; data[o + 3] = nx; data[o + 4] = ny; data[o + 5] = nz;
        if (uv) { data[o + 6] = uv[k * 2]; data[o + 7] = uv[k * 2 + 1]; }
        if (jn && !rigid) for (let c = 0; c < 4; c++) { data[o + 8 + c] = jn[k * 4 + c]; data[o + 12 + c] = wt[k * 4 + c] / (wt instanceof Uint8Array ? 255 : wt instanceof Uint16Array ? 65535 : 1); }
        else { data[o + 8] = Math.max(0, rb); data[o + 12] = 1; }
      }
      const idx = acc(p.indices);
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const st = 64;
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, st, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, st, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, st, 24);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, st, 32);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.FLOAT, false, st, 48);
      const ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      const ix = idx instanceof Uint32Array ? idx : new Uint32Array(idx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ix, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      const mat = p.material !== undefined ? json.materials[p.material] : null;
      const ti = mat && mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorTexture ? json.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source : -1;
      const glow = mat && mat.emissiveFactor ? Math.max(...mat.emissiveFactor) : 0;
      prims.push({ vao, count: ix.length, tex: ti >= 0 ? textures[ti] : white, glow, blend: mat && mat.alphaMode === 'BLEND', alphaTest: !!(mat && mat.alphaMode === 'MASK'), name: mat ? mat.name : '' });
    }
  });
  if (!bones.length) bones.push({ name: 'root', parent: -1, rest: [0, 0, 0] });
  const byName = {}; bones.forEach((b, i) => { byName[b.name] = i; });
  return { bones, byName, prims, tris: prims.reduce((s, p) => s + p.count / 3, 0), hasShield: prims.some(p => /shield/i.test(p.name)) };
}

// ---- posing: the pose library's angles, at the real joints --------------------
const _rx = a => m4rx(a), _ry = a => m4ry(a), _rz = a => m4rz(a);
function skinPose(M, P) {
  const B = M.bones, R3 = new Array(B.length).fill(null), side = n => n.endsWith('_r') ? 'R' : n.endsWith('_l') ? 'L' : '';
  const set = (name, m) => { const i = M.byName[name]; if (i !== undefined) R3[i] = R3[i] ? m4mul(R3[i], m) : m; };
  set('pelvis', _rx(P.hip || 0));
  const lean = P.lean || 0, tw = P.twist || 0;
  for (const [n, f] of [['spine_01', 0.4], ['spine_02', 0.3], ['spine_03', 0.3]]) set(n, m4mul(_ry(tw * f), _rx(lean * f)));
  set('neck_01', m4mul(_ry((P.headY || 0) * 0.4), _rx((P.headX || 0) * 0.4)));
  set('head', m4mul(_ry((P.headY || 0) * 0.6), _rx((P.headX || 0) * 0.6)));
  for (const b of B) {
    const k = side(b.name); if (!k) continue;
    const s = Math.sign(b.rest[0]) || 1;               // abduction is always outward, whichever side this is
    if (b.name.startsWith('upperarm')) set(b.name, m4mul(_ry(s * (P['uy' + k] || 0)), m4mul(_rx(P['ux' + k] || 0), _rz(s * ((P['uz' + k] === undefined ? 0.1 : P['uz' + k]) - 0.1)))));
    else if (b.name.startsWith('lowerarm')) set(b.name, _rx((P['fx' + k] === undefined ? -0.15 : P['fx' + k]) + 0.15));
    else if (b.name.startsWith('thigh')) set(b.name, m4mul(_rx(P['tx' + k] || 0), _rz(s * ((P['tz' + k] === undefined ? 0.02 : P['tz' + k]) - 0.02))));
    else if (b.name.startsWith('calf')) set(b.name, _rx(P['sx' + k] || 0));
  }
  return R3;
}
// world matrices for every bone, and the skinning matrices
function skinSolve(M, root, P) {
  const R3 = skinPose(M, P), W = [], S = new Float32Array(32 * 16);
  M.bones.forEach((b, i) => {
    const p = b.parent, pr = p >= 0 ? M.bones[p].rest : [0, 0, 0];
    let w = m4mul(p >= 0 ? W[p] : root, m4t(b.rest[0] - pr[0], b.rest[1] - pr[1], b.rest[2] - pr[2]));
    if (R3[i]) w = m4mul(w, R3[i]);
    W[i] = w;
    if (i < 32) S.set(m4mul(w, m4t(-b.rest[0], -b.rest[1], -b.rest[2])), i * 16);
  });
  return { W, S };
}
// the old rig's weapon and shield mounts, from the skinned skeleton
function skinMounts(M, W) {
  const h = n => M.byName[n] !== undefined ? W[M.byName[n]] : null;
  return { handR: h('hand_r'), farmL: h('lowerarm_l'), handL: h('hand_l') };
}
// any skinned model with explicit per-bone rotations (the horses, the eagle): rots = { boneName: matrix }
function drawSkinnedRots(id, root, rots, light, glow = 0) {
  const M = SKINNED[id], R3 = M.bones.map(b => rots[b.name] || null), W = [], S = new Float32Array(32 * 16);
  M.bones.forEach((b, i) => {
    const p = b.parent, pr = p >= 0 ? M.bones[p].rest : [0, 0, 0];
    let w = m4mul(p >= 0 ? W[p] : m4ident(), m4t(b.rest[0] - pr[0], b.rest[1] - pr[1], b.rest[2] - pr[2]));
    if (R3[i]) w = m4mul(w, R3[i]);
    W[i] = w;
    if (i < 32) S.set(m4mul(w, m4t(-b.rest[0], -b.rest[1], -b.rest[2])), i * 16);
  });
  skinDraw(M, root, S, light, glow, 1);
}
function skinDraw(M, root, S, light, glow, alpha) {
  const gl = R.gl, c = R._cam;
  gl.useProgram(skinProg);
  gl.uniformMatrix4fv(skinU.uVP, false, c.vp);
  gl.uniformMatrix4fv(skinU.uModel, false, root);
  gl.uniformMatrix4fv(skinU.uBones, false, S);
  gl.uniform3fv(skinU.uCamPos, c.camPos); gl.uniform3fv(skinU.uLampPos, c.lampPos); gl.uniform3fv(skinU.uLampCol, c.lampCol);
  gl.uniform1f(skinU.uLampRange, c.lampRange); gl.uniform1f(skinU.uFog, c.fog);
  gl.uniform1f(skinU.uTime, R._time || 0); gl.uniform1f(skinU.uLightMul, R._lm === undefined ? 1 : R._lm);
  gl.uniform3fv(skinU.uHaze, R.haze); gl.uniform4fv(skinU.uGFog, R.gfog); gl.uniform3fv(skinU.uGFogCol, R.gfogCol);
  gl.uniform4fv(skinU.uVoid, R.voidLine); gl.uniform1f(skinU.uVoidW, R.voidW);
  gl.uniform3fv(skinU.uEntLight, light); gl.uniform3fv(skinU.uKeyDir, light.d || [0.3, 0.9, 0.3]);
  gl.uniform1f(skinU.uAlpha, alpha);
  gl.activeTexture(gl.TEXTURE1); gl.uniform1i(skinU.uSkinTex, 1);
  gl.uniform1i(skinU.uTex, 0);
  for (const p of M.prims) {
    gl.bindTexture(gl.TEXTURE_2D, p.tex);
    gl.uniform1f(skinU.uGlow, Math.min(1, glow + p.glow));
    gl.uniform1f(skinU.uAlphaTest, p.alphaTest ? 1 : 0);
    gl.bindVertexArray(p.vao);
    gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_INT, 0);
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindVertexArray(null);
  gl.useProgram(R.prog);
}
function drawSkinned(id, x, y, z, yaw, P, light, glow = 0, alpha = 1) {
  const M = SKINNED[id];
  const root = m4trs(x, y + (P.drop || 0), z, yaw, P.pitch || 0, P.roll || 0, SKIN_SCALE[id] || 1);
  const { W, S } = skinSolve(M, m4ident(), P);
  skinDraw(M, root, S, light, glow, alpha);
  // the weapon and shield, mounted on the skeleton's hands as the old rig mounted them
  const mt = skinMounts(M, W), c2 = CAST[id];
  if (c2 && c2.weapon && !P.unarmed && mt.handR) {
    const handR = m4mul(root, m4mul(mt.handR, m4t(0, -0.07, 0.025)));
    const wx = P.we !== undefined ? -P.we - ((P.uxR || 0) + (P.fxR === undefined ? -0.15 : P.fxR)) : (P.wx || 0);
    const wm = m4mul(handR, m4mul(m4rx(Math.PI / 2 + wx), m4ry(P.wy || 0)));
    const Mn = (part, m) => drawPart('w_' + part, 'char:' + id + ':' + part, m, light, glow);   // the built weapon, else the old one
    if (c2.weapon === 'bow') { if (mt.handL) Mn('bow', m4mul(m4mul(root, m4mul(mt.handL, m4t(0, -0.07, 0.025))), m4rx(Math.PI / 2 - 0.1))); }
    else Mn(c2.weapon, c2.weapon === 'spear' ? m4mul(wm, m4t(0, -0.35, 0)) : c2.weapon === 'pike' ? m4mul(wm, m4t(0, -0.9, 0)) : c2.weapon === 'axe' ? m4mul(wm, m4t(0, -0.45, 0)) : c2.weapon === 'greatsword' ? m4mul(wm, m4t(0, -0.05, 0)) : wm);
  }
  if (c2 && c2.shield && !P.noShield && mt.farmL && !M.hasShield)
    drawM('char:' + id + ':shield', m4mul(root, m4mul(mt.farmL, m4mul(m4t(0.06, -0.17, 0.04), m4mul(m4ry(Math.PI / 2 - 0.25), m4rx(0.1))))), light, glow);
}
// load whichever cast models exist (models/cast/<id>.glb), quietly keeping the old rig for the rest
const SKIN_LOADING = new Set();
async function loadCastModels(ids) {
  if (!skinProg) skinInit();
  ids = ids.filter(id => !SKINNED[id] && !SKIN_LOADING.has(id)); ids.forEach(id => SKIN_LOADING.add(id));
  await Promise.all(ids.map(async id => {
    try { SKINNED[id] = await loadGLB('models/cast/' + id + '.glb'); }
    catch (e) { /* not built yet: the part-built rig stands in */ }
  }));
}

// a static part (no skeleton), placed by one matrix
function drawStatic(id, m, light, glow = 0, alpha = 1) {
  const M = SKINNED[id], S = new Float32Array(32 * 16); S.set(m4ident(), 0);
  skinDraw(M, m, S, light, glow, alpha);
}
// a built part if it has loaded, else the old procedural one
function drawPart(sid, fallback, m, light, glow = 0, alpha = 1) {
  if (SKINNED[sid]) drawStatic(sid, m, light, glow, alpha);
  else if (alpha < 1) R.drawEntity(getModel(fallback), m, light, glow, alpha);
  else drawM(fallback, m, light, glow);
}
