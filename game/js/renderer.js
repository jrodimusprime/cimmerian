'use strict';
// ---------------------------------------------------------------------------
// Tiny WebGL2 renderer in the spirit of 1996 software rendering (from The
// Endless Cave engine). Additions for The Cimmerian: uLightMul so baked
// torchlight can gutter, UV-mapped models (uUV: aCol = u, v, shade), a key
// light direction per model so form reads, gamma, and dynamic meshes:
// low internal resolution, nearest-neighbour texels, banded light levels,
// overbright lighting, black fog, then a chunky upscale to the screen.
// ---------------------------------------------------------------------------

const SCENE_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec3 aCol;
layout(location=3) in float aLayer;
uniform mat4 uVP;
uniform mat4 uModel;
uniform float uEnt;
uniform float uTexScale;
uniform float uUV;
out vec3 vWPos;
out vec3 vNor;
out vec3 vCol;
out vec2 vUv;
out vec2 vUv2;
flat out float vLayer;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWPos = wp.xyz;
  vNor = normalize(mat3(uModel) * aNor);
  vCol = aCol;
  vLayer = aLayer;
  vec3 tp = (uEnt > 0.5 ? aPos : wp.xyz) * uTexScale;
  vec3 an = abs(aNor);
  vUv = an.y > 0.7 ? tp.xz : (an.x > an.z ? tp.zy : tp.xy);
  if (uUV > 0.5) vUv = aCol.xy;
  vec3 gp = wp.xyz * 0.045;                                      // large-scale grime, world space
  vUv2 = an.y > 0.7 ? gp.xz : (an.x > an.z ? gp.zy : gp.xy);
  gl_Position = uVP * wp;
}`;

const SCENE_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uTex;
uniform float uEnt;
uniform vec3 uEntLight;
uniform float uGlow;
uniform float uAlpha;
uniform vec3 uLampPos;
uniform vec3 uLampCol;
uniform float uLampRange;
uniform vec3 uCamPos;
uniform float uFog;
uniform float uTime;
uniform float uLightMul;
uniform float uUV;
uniform vec3 uKeyDir;
uniform vec3 uHaze;
uniform vec4 uGFog;     // ground fog: density, falloff with height, floor height, on
uniform vec3 uGFogCol;
uniform float uDecal;
uniform vec4 uVoid;
uniform float uVoidW;
in vec3 vWPos;
in vec3 vNor;
in vec3 vCol;
in vec2 vUv;
in vec2 vUv2;
flat in float vLayer;
out vec4 outColor;
void main() {
  vec2 uv = vUv;
  if (abs(vLayer - ${T.WATER}.0) < 0.5) uv += vec2(sin(uv.y * 5.0 + uTime * 1.3), cos(uv.x * 5.0 + uTime * 1.1)) * 0.05;
  if (abs(vLayer - ${T.SLIME}.0) < 0.5) uv += vec2(sin(uv.y * 2.0 + uTime * 0.4) * 0.04, uTime * 0.05);
  if (abs(vLayer - ${T.FIRE}.0) < 0.5) uv.y -= uTime * 1.5;
  vec4 t = texture(uTex, vec3(uv, vLayer));
  if (uDecal > 0.5) { if (t.a < 0.5) discard; t.a = 0.0; }        // a decal: only the cuts are drawn
  vec3 n = normalize(vNor);
  vec3 light = vCol;
  if (uEnt > 0.5) { float hl = dot(n, uKeyDir) * 0.5 + 0.5; light = uEntLight * (0.38 + 1.05 * hl * hl); }
  light *= uLightMul;
  vec3 Ld = uLampPos - vWPos;
  float d = max(length(Ld), 0.001);
  float att = clamp(1.0 - d / uLampRange, 0.0, 1.0);
  att *= att;
  float lam = max(dot(n, Ld / d), 0.0) * 0.75 + 0.25;
  light += uLampCol * att * lam;
  light = floor(light * 12.0 + 0.5) / 12.0;       // light-level banding
  vec3 tint = uEnt > 0.5 ? (uUV > 0.5 ? vec3(vCol.z) : vCol) : vec3(1.0);
  float e = clamp(t.a + uGlow, 0.0, 1.0);
  vec3 col = t.rgb * tint * (light * 1.9 * (1.0 - e) + e * 1.3);
  if (abs(vLayer - ${T.WATER}.0) < 0.5 && uEnt < 0.5) {      // open water takes the sky's glare at a low angle
    vec3 vd = normalize(vWPos - uCamPos);
    float fres = pow(1.0 - abs(vd.y), 3.0) * (0.55 + 0.45 * t.g / max(t.r + t.g + t.b, 0.05) * 3.0 * 0.5);   // broken by the ripples
    vec3 sky = uGFog.w > 0.5 || uHaze.r > 0.2 ? mix(uHaze * 1.1, vec3(1.0, 0.42, 0.16), 0.45) : uHaze * 1.4;
    col = mix(col * 0.7, sky, clamp(fres, 0.0, 0.85));
  }
  // stains and soot at the scale of rooms, so no wall reads as one tile repeated
  if (uEnt < 0.5) col *= mix(0.42, 1.12, texture(uTex, vec3(vUv2, ${T.GRIME}.0)).r * (1.0 - e) + e);
  float fd = length(vWPos - uCamPos);
  float f = exp(-fd * uFog);
  f = mix(f, sqrt(f), e);
  vec3 rgb = mix(uHaze, col, f);                         // distance fades into the pits' haze
  if (uGFog.w > 0.5) {
    // ground fog: exponential in height, integrated along the view ray, drifting in slow banks
    vec3 rd = vWPos - uCamPos; float L = length(rd), ry = rd.y, b = uGFog.y;
    float bank = texture(uTex, vec3(vWPos.xz * 0.012 + vec2(uTime * 0.006, uTime * 0.0025), ${T.GRIME}.0)).r;
    float a = uGFog.x * (0.45 + 1.1 * bank);
    float ray = min(abs(ry * b) > 1e-3 ? (1.0 - exp(-b * ry)) / (b * ry) : 1.0, 1.6);   // a ditch holds mist, but not a solid slab of it
    float amt = a * L * exp(-b * (uCamPos.y - uGFog.z)) * ray;
    rgb = mix(rgb, uGFogCol, clamp(1.0 - exp(-amt), 0.0, 0.92));
  }
  // the way out: a corridor that goes black as it goes on (uVoid = from.xz, to.xz)
  vec2 vd = uVoid.zw - uVoid.xy; float vl = length(vd);
  if (vl > 0.0) {
    vec2 vn = vd / vl, rel = vWPos.xz - uVoid.xy;
    float along = dot(rel, vn) / vl, lat = abs(dot(rel, vec2(-vn.y, vn.x)));
    if (lat < uVoidW && along > 0.0) rgb *= 1.0 - smoothstep(0.0, 1.0, along) * (1.0 - smoothstep(uVoidW - 1.0, uVoidW, lat));
  }
  outColor = vec4(rgb, uAlpha);
}`;

const POST_VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;
const POST_FS = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform float uFade;
uniform float uFlash;
uniform vec3 uFlashCol;
uniform float uGamma;
uniform sampler2D uLut;
uniform float uPal;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 c = texture(uScene, vUv).rgb;
  c = pow(max(c, vec3(0.0)), vec3(1.0 / uGamma));
  vec2 d = vUv - 0.5;
  c *= 1.0 - dot(d, d) * 0.9;
  c = mix(c, uFlashCol, uFlash);
  c *= 1.0 - uFade;
  // the Quake look: every pixel snapped to the nearest colour of the game's palette
  if (uPal > 0.5) {
    // ordered dither on the low-res pixel grid, so a gradient (a sky, a torch's falloff) breaks into Quake's stipple, not hard bands
    ivec2 pp = ivec2(vUv * vec2(textureSize(uScene, 0))) & 3;
    int bi = pp.y * 4 + pp.x;
    float bay = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0)[bi] / 16.0 - 0.47;
    c += bay * 0.055 * (0.35 + c);
    vec3 q = floor(clamp(c, 0.0, 1.0) * 31.0 + 0.5); c = texture(uLut, vec2((q.r + 32.0 * q.b + 0.5) / 1024.0, (q.g + 0.5) / 32.0)).rgb; }
  outColor = vec4(c, 1.0);
}`;

// The open sky, per pixel: a sunset of banked, sun-lit cloud over far ridges, or a night of stars and a moon.
const SKY_VS = `#version 300 es
out vec2 vNdc;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  vNdc = p;
  gl_Position = vec4(p, 0.9999, 1.0);
}`;
const SKY_FS = `#version 300 es
precision highp float;
uniform mat4 uInvVP;
uniform vec3 uSun;
uniform vec3 uHaze;
uniform float uNight;
uniform float uTime;
in vec2 vNdc;
out vec4 outColor;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
float ridge(float az, float k, float amp, float base) {   // a far skyline: a sharp-crested mountain wall
  float r = 0.0, a = 1.0, f = k;
  for (int i = 0; i < 4; i++) { r += a * (1.0 - abs(vn(vec2(az * f, 3.7 * float(i) + base * 11.0)) * 2.0 - 1.0)); a *= 0.5; f *= 2.1; }
  return base + amp * r / 1.875;
}
void main() {
  vec4 a = uInvVP * vec4(vNdc, -1.0, 1.0), b = uInvVP * vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(b.xyz / b.w - a.xyz / a.w);
  vec3 sun = normalize(uSun);
  float e = d.y, az = atan(d.z, d.x), sd = dot(d, sun);
  vec3 col;
  float dawn = step(1.5, uNight);                        // dawn: the same crimson at the horizon, a cold violet sky above it
  if (uNight < 0.5 || dawn > 0.5) {
    // the sunset: a burning band at the horizon, crimson above it, a bruised dusk at the top of the sky
    float sh = max(dot(normalize(d.xz), normalize(sun.xz)), 0.0);               // how far round toward the sun
    vec3 hor = mix(uHaze * 1.25, vec3(1.05, 0.48, 0.16), 0.35 + 0.65 * pow(sh, 3.0));
    vec3 mid = mix(vec3(0.62, 0.13, 0.09), vec3(0.58, 0.2, 0.24), dawn), top = mix(vec3(0.16, 0.035, 0.06), vec3(0.1, 0.1, 0.24), dawn);
    float t = clamp(e, 0.0, 1.0);
    col = mix(hor, mid, smoothstep(0.0, 0.16, t));
    col = mix(col, top, smoothstep(0.14, 0.75, t));
    col += vec3(1.0, 0.5, 0.18) * pow(max(sd, 0.0), 10.0) * 0.55 + vec3(1.0, 0.7, 0.3) * pow(max(sd, 0.0), 120.0) * 0.8;   // the glow about the sun
    // the sun itself: a great disc, struck through with bars of cloud low down
    float disc = smoothstep(0.9984, 0.9988, sd);
    vec3 sp = d - sun * sd; float sy = dot(sp, vec3(0.0, 1.0, 0.0)) / 0.05;
    if (disc > 0.0 && !(sy < 0.0 && fract(sy * 3.0 + 0.1 * uTime) < 0.25 + 0.5 * -sy)) col = mix(col, vec3(1.25, 0.82, 0.38) + vec3(0.25, 0.2, 0.1) * (sy * 0.5 + 0.5), disc);
    // clouds: long streaks banked over the plain, lit gold where they face the sun and dark plum where they don't
    if (e > 0.0) {
      vec2 cp = d.xz / (e + 0.06);
      float n = fbm(cp * vec2(0.35, 1.6) + vec2(uTime * 0.004, 0.0));
      float n2 = fbm(cp * vec2(0.9, 3.2) + vec2(-uTime * 0.006, 4.0));
      float c = smoothstep(0.5, 0.78, n * 0.75 + n2 * 0.4) * smoothstep(0.0, 0.08, e) * (1.0 - smoothstep(0.45, 0.9, e));
      float lit = pow(max(sd * 0.5 + 0.5, 0.0), 3.0);
      vec3 cc = mix(mix(vec3(0.24, 0.055, 0.07), vec3(0.2, 0.15, 0.26), dawn), mix(vec3(1.0, 0.42, 0.14), vec3(1.0, 0.5, 0.35), dawn), lit * (0.4 + 0.6 * smoothstep(0.6, 0.85, n2)));
      col = mix(col, cc, c * 0.85);
    }
    // the far mountains, two ranges, the nearer darker, hazed into the glow
    float r1 = ridge(az, 2.0, 0.05, 0.012), r2 = ridge(az + 1.3, 3.5, 0.03, 0.004);
    if (e < r1) col = mix(col, uHaze * 0.85 + vec3(0.06, 0.02, 0.02) * sh, 0.8);
    if (e < r2) col = mix(col, uHaze * 0.62, 0.9);
    if (e < 0.0) col = uHaze * 0.62;
  } else {
    // the night: a deep blue-black sky, paler at the horizon, thick with stars, a low moon
    float t = clamp(e, 0.0, 1.0);
    col = mix(vec3(0.075, 0.075, 0.12), vec3(0.012, 0.014, 0.03), smoothstep(0.0, 0.6, t));
    vec2 sg = vec2(az * 120.0, asin(clamp(e, -1.0, 1.0)) * 120.0);
    float st = h21(floor(sg)), tw = 0.75 + 0.25 * sin(uTime * 3.0 + st * 60.0);
    if (st > 0.985 && e > 0.04) col += vec3(0.9, 0.88, 0.8) * (st - 0.985) / 0.015 * tw * smoothstep(0.04, 0.2, e);
    float band = exp(-pow(dot(d, normalize(vec3(0.3, 0.8, -0.5))) / 0.18, 2.0));   // the river of stars
    col += vec3(0.05, 0.05, 0.07) * band * fbm(sg * 0.05);
    float md = smoothstep(0.9991, 0.9994, sd);
    col += vec3(0.25, 0.25, 0.3) * pow(max(sd, 0.0), 200.0) + vec3(0.1, 0.1, 0.13) * pow(max(sd, 0.0), 20.0);
    if (md > 0.0) col = mix(col, vec3(0.95, 0.92, 0.82) * (0.85 + 0.15 * fbm((d - sun).xy * 400.0)), md);
    if (e > 0.0) {
      vec2 cp = d.xz / (e + 0.08);
      float c = smoothstep(0.55, 0.8, fbm(cp * vec2(0.4, 1.4) + vec2(uTime * 0.003, 0.0))) * smoothstep(0.02, 0.1, e) * (1.0 - smoothstep(0.4, 0.8, e));
      col = mix(col, vec3(0.03, 0.03, 0.05) + vec3(0.12, 0.12, 0.14) * pow(max(sd, 0.0), 6.0), c * 0.8);
    }
    float r1 = ridge(az, 2.0, 0.045, 0.01);
    if (e < r1) col = vec3(0.012, 0.012, 0.022);
    if (e < 0.0) col = uHaze;
  }
  outColor = vec4(col, 1.0);
}`;

// the glass of a mirror: what the mirror pass saw, at this very pixel (it was drawn from this camera, through the reflection),
// silvered: a little dark and warm, with a faint bloom of old tarnish toward the frame
const MIRROR_VS = `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uVP;
uniform mat4 uModel;
out vec2 vQ;
void main() { vQ = aPos.xy; gl_Position = uVP * uModel * vec4(aPos, 1.0); }`;
const MIRROR_FS = `#version 300 es
precision highp float;
uniform sampler2D uMir;
uniform vec2 uSize;
uniform vec3 uTint;
uniform float uLive;
in vec2 vQ;
out vec4 outColor;
void main() {
  vec3 c = uLive > 0.5 ? texture(uMir, gl_FragCoord.xy / uSize).rgb : vec3(0.02, 0.018, 0.016);
  float edge = max(abs(vQ.x), abs(vQ.y * 2.0 - 1.0));
  c *= uTint * (1.0 - 0.35 * smoothstep(0.75, 1.0, edge));
  outColor = vec4(c, 1.0);
}`;

class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.gl = gl; this.canvas = canvas;
    this.prog = this.program(SCENE_VS, SCENE_FS);
    this.post = this.program(POST_VS, POST_FS);
    this.skyProg = this.program(SKY_VS, SKY_FS);
    this.mirProg = this.program(MIRROR_VS, MIRROR_FS);
    this.mu = {}; for (const n of ['uVP', 'uModel', 'uMir', 'uSize', 'uTint', 'uLive']) this.mu[n] = gl.getUniformLocation(this.mirProg, n);
    this.su = {};
    for (const n of ['uInvVP', 'uSun', 'uHaze', 'uNight', 'uTime']) this.su[n] = gl.getUniformLocation(this.skyProg, n);
    this.u = {};
    for (const n of ['uVP', 'uModel', 'uEnt', 'uTexScale', 'uTex', 'uEntLight', 'uGlow', 'uAlpha', 'uLampPos', 'uLampCol', 'uLampRange', 'uCamPos', 'uFog', 'uTime', 'uLightMul', 'uUV', 'uKeyDir', 'uHaze', 'uGFog', 'uGFogCol', 'uDecal', 'uVoid', 'uVoidW'])
      this.u[n] = gl.getUniformLocation(this.prog, n);
    this.pu = {};
    for (const n of ['uScene', 'uFade', 'uFlash', 'uFlashCol', 'uGamma', 'uLut', 'uPal']) this.pu[n] = gl.getUniformLocation(this.post, n);
    this.ident = m4ident();
    this.postVao = gl.createVertexArray();
    this.fbo = null; this.aspect = 1; this.lw = 1; this.lh = 1;
    this.key = [0.3, 0.9, 0.3]; this.gamma = 1.3; this.haze = [0.035, 0.026, 0.02]; this.gfog = [0, 0, 0, 0]; this.gfogCol = [0, 0, 0]; this.palette = true; this.voidLine = [0, 0, 0, 0]; this.voidW = 0;
  }
  program(vs, fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  uploadTextures(layers) {
    const gl = this.gl, S = TEX_SIZE;
    const all = new Uint8Array(S * S * 4 * layers.length);
    layers.forEach((d, i) => all.set(d, i * S * S * 4));
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.tex);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, S, S, layers.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, all);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }
  updateLayer(layer, rgba) {                                  // replace one texture layer (a photographed skin, once it loads)
    const gl = this.gl, S = TEX_SIZE;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.tex);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, S, S, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  }
  resize(w, h, lowH) {
    const gl = this.gl, dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr); this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.aspect = w / h;
    this.lh = lowH; this.lw = Math.max(1, Math.round(lowH * w / h));
    if (this.fbo) { gl.deleteFramebuffer(this.fbo); gl.deleteTexture(this.fboTex); gl.deleteRenderbuffer(this.fboDepth); }
    if (this.mir) { gl.deleteFramebuffer(this.mir.fbo); gl.deleteTexture(this.mir.tex); gl.deleteRenderbuffer(this.mir.depth); this.mir = null; }
    this.fboTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.lw, this.lh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fboDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.fboDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, this.lw, this.lh);
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.fboDepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  createMesh(data) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const st = 40;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, st, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, st, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, st, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, st, 36);
    gl.bindVertexArray(null);
    return { vao, vbo, count: data.length / 10 };
  }
  setPalette(pal) {
    const gl = this.gl;
    this.lutTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1024, 32, 0, gl.RGBA, gl.UNSIGNED_BYTE, paletteLut(pal));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  updateMesh(m, data) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    m.count = data.length / 10;
  }
  deleteMesh(m) { if (!m) return; this.gl.deleteBuffer(m.vbo); this.gl.deleteVertexArray(m.vao); }

  // the mirror pass's own target (made when first wanted, the size of the scene's)
  mirrorTarget() {
    if (this.mir) return this.mir;
    const gl = this.gl, tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.lw, this.lh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const depth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, this.lw, this.lh);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return (this.mir = { fbo, tex, depth });
  }
  // a mirror's glass (a unit quad, x -1..1, y 0..1, placed by model), showing the mirror pass if live, else dark
  drawMirror(m, model, vp, tint, live) {
    const gl = this.gl, u = this.mu;
    gl.useProgram(this.mirProg);
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uModel, false, model);
    gl.uniform2f(u.uSize, this.lw, this.lh); gl.uniform3fv(u.uTint, tint); gl.uniform1f(u.uLive, live ? 1 : 0);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, live ? this.mirrorTarget().tex : null); gl.uniform1i(u.uMir, 3);
    gl.bindVertexArray(m.vao); gl.drawArrays(gl.TRIANGLES, 0, m.count);
    gl.activeTexture(gl.TEXTURE0); gl.useProgram(this.prog);
  }
  beginScene(time, mirror = false) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, mirror ? this.mirrorTarget().fbo : this.fbo);
    gl.viewport(0, 0, this.lw, this.lh);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.tex);
    gl.uniform1i(this.u.uTex, 0);
    gl.uniform1f(this.u.uTime, time);
    gl.uniform1f(this.u.uLightMul, 1);
    gl.uniform3fv(this.u.uHaze, this.haze);
    gl.uniform4fv(this.u.uGFog, this.gfog); gl.uniform3fv(this.u.uGFogCol, this.gfogCol);
    gl.uniform4fv(this.u.uVoid, this.voidLine); gl.uniform1f(this.u.uVoidW, this.voidW);
  }
  drawSky(vp, sun, night, time) {                             // before the world, behind everything; leaves the scene program bound
    const gl = this.gl, u = this.su;
    gl.useProgram(this.skyProg);
    gl.depthMask(false);
    gl.uniformMatrix4fv(u.uInvVP, false, m4inv(vp)); gl.uniform3fv(u.uSun, sun); gl.uniform3fv(u.uHaze, this.haze);
    gl.uniform1f(u.uNight, night === 'dawn' ? 2 : night ? 1 : 0); gl.uniform1f(u.uTime, time);
    gl.bindVertexArray(this.postVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.useProgram(this.prog);
  }
  lightMul(v) { this.gl.uniform1f(this.u.uLightMul, v); }
  setCamera(vp, camPos, lampPos, lampCol, lampRange, fog) {
    const gl = this.gl, u = this.u;
    gl.uniformMatrix4fv(u.uVP, false, vp);
    gl.uniform3fv(u.uCamPos, camPos);
    gl.uniform3fv(u.uLampPos, lampPos);
    gl.uniform3fv(u.uLampCol, lampCol);
    gl.uniform1f(u.uLampRange, lampRange);
    gl.uniform1f(u.uFog, fog);
  }
  drawWorld(m, alpha = 1) {
    if (!m || !m.count) return;
    const gl = this.gl, u = this.u;
    gl.uniformMatrix4fv(u.uModel, false, this.ident);
    gl.uniform1f(u.uEnt, 0); gl.uniform1f(u.uUV, 0); gl.uniform1f(u.uDecal, 0); gl.uniform1f(u.uTexScale, 0.24); gl.uniform1f(u.uGlow, 0); gl.uniform1f(u.uAlpha, alpha);
    gl.bindVertexArray(m.vao);
    gl.drawArrays(gl.TRIANGLES, 0, m.count);
  }
  drawEntity(m, model, light, glow = 0, alpha = 1, uv = false, decal = false) {
    const gl = this.gl, u = this.u;
    gl.uniform1f(u.uUV, uv ? 1 : 0); gl.uniform1f(u.uDecal, decal ? 1 : 0); gl.uniform3fv(u.uKeyDir, this.key);
    gl.uniformMatrix4fv(u.uModel, false, model);
    gl.uniform1f(u.uEnt, 1); gl.uniform1f(u.uTexScale, 3.0);
    gl.uniform3fv(u.uEntLight, light); gl.uniform1f(u.uGlow, glow); gl.uniform1f(u.uAlpha, alpha);
    gl.bindVertexArray(m.vao);
    gl.drawArrays(gl.TRIANGLES, 0, m.count);
  }
  blend(on) {
    const gl = this.gl;
    if (on) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
    else { gl.disable(gl.BLEND); gl.depthMask(true); }
  }
  clearDepth() { const gl = this.gl; gl.clear(gl.DEPTH_BUFFER_BIT); }
  present(fade, flash, flashCol) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(this.post);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
    gl.uniform1i(this.pu.uScene, 1);
    gl.uniform1f(this.pu.uFade, fade);
    gl.uniform1f(this.pu.uFlash, flash);
    gl.uniform3fv(this.pu.uFlashCol, flashCol);
    gl.uniform1f(this.pu.uGamma, this.gamma);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(this.pu.uLut, 2); gl.uniform1f(this.pu.uPal, this.palette && this.lutTex ? 1 : 0);
    gl.bindVertexArray(this.postVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  }
}
