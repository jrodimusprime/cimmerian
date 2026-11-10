'use strict';
// ---------------------------------------------------------------------------
// Synthesised WebAudio (from The Endless Cave engine), with pit sounds added:
// Satha's hiss and rumble, chains, iron bars, the jailer's voice. Cosmetic
// randomness here uses Math.random: sound never feeds back into the sim.
// ---------------------------------------------------------------------------
const Sfx = (() => {
  let ac = null, master = null, nbuf = null, muted = false;
  // Recorded CC0 sounds (game/sound/, from OpenGameArt: see the README's credits). Each name is a family:
  // 'flesh' picks one of flesh_0..flesh_9 at random, with a little pitch variation. Synth stands in until they load.
  const BANK = {}, FAMILY = {};
  const LIST = 'step_stone:6 step_turf:6 swing:10 clash:10 flesh:10 hit:5 die:1 voice:15 beast_grunt:5 beast_hurt:5 beast_growl:7 beast_roar:3 beast_scream:2 metal_hit:5 keys:7 metal_fall:2 wood_hit:3'.split(' ');
  const SINGLE = ['beast_breath', 'metal_slam', 'metal_open', 'metal_close', 'door_open', 'lock_open', 'amb_dungeon', 'amb_drips', 'amb_horror'];
  let ambNow = null, ambWant = 'pits', ambNodes = [], dinOn = false;
  function fetchBuf(url) {
    return new Promise(ok => {                     // XHR, not fetch: it also reads file:// pages
      const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer';
      x.onload = () => (x.status === 200 || x.status === 0) && x.response ? ac.decodeAudioData(x.response, ok, () => ok(null)) : ok(null);
      x.onerror = () => ok(null); x.send();
    });
  }
  function loadBank() {
    for (const e of LIST) { const [n, c] = e.split(':'); FAMILY[n] = []; for (let i = 0; i < +c; i++) fetchBuf('sound/' + n + '_' + i + '.mp3').then(b => { if (b) FAMILY[n].push(b); }); }
    Promise.all(SINGLE.map(n => fetchBuf('sound/' + n + '.mp3').then(b => { if (b) BANK[n] = b; }))).then(() => setAmb(ambWant, true));
  }
  // play one of a family (or a single); false if nothing is loaded yet, so the caller can fall back to synth
  function play(name, vol = 0.5, pan, rate = 1, jitter = 0.08, delay = 0) {
    if (!ac || muted) return true;
    const fam = FAMILY[name], buf = fam ? fam[Math.floor(Math.random() * fam.length)] : BANK[name];
    if (!buf) return false;
    const s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
    const g = ac.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(out(pan)); s.start(ac.currentTime + delay);
    return true;
  }
  function loop(name, vol, rate = 1) {
    const b = BANK[name]; if (!b) return null;
    const s = ac.createBufferSource(); s.buffer = b; s.loop = true; s.playbackRate.value = rate;
    const g = ac.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(vol, ac.currentTime + 3);
    s.connect(g); g.connect(master); s.start(0, Math.random() * b.duration);
    return { s, g };
  }
  // the place's own sound: the pits drip and groan; the tunnels breathe; the field is wind and a battle far off
  function setAmb(kind, force) {
    ambWant = kind;
    if (!ac || (kind === ambNow && !force)) return;
    for (const n of ambNodes) { try { n.g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 2); n.s.stop(ac.currentTime + 2.2); } catch (e) {} }
    ambNodes = [];
    const add = n => { if (n) ambNodes.push(n); };
    if (kind === 'pits') { add(loop('amb_dungeon', 0.32)); add(loop('amb_drips', 0.25)); }
    else if (kind === 'tunnels') { add(loop('amb_horror', 0.28)); add(loop('amb_drips', 0.2, 0.85)); }
    else if (kind === 'field') {                    // no recording: wind over the plain, and the din of the host far off
      const w = ac.createBufferSource(); w.buffer = nbuf; w.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 380; f.Q.value = 0.6;
      const g = ac.createGain(); g.gain.value = 0.09; w.connect(f); f.connect(g); g.connect(master); w.start();
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.13; const lg = ac.createGain(); lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      ambNodes.push({ s: w, g }, { s: lfo, g: lg });
      const din = () => { if (ambNow !== 'field') { dinOn = false; return; } play('clash', 0.05, Math.random() * 2 - 1, 0.8, 0.2); if (Math.random() < 0.4) play('voice', 0.04, Math.random() * 2 - 1, 0.75, 0.1, 0.3); setTimeout(din, 700 + Math.random() * 2600); };
      if (!dinOn) { dinOn = true; setTimeout(din, 1500); }
    }
    ambNow = kind;
  }

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    ac = new C();
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = nbuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ambient();
    loadBank();
  }
  function out(pan) {
    if (pan === undefined || !ac.createStereoPanner) return master;
    const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(master); return p;
  }
  function env(g, t, vol, dur, att = 0.008) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(f, dur, type = 'sine', vol = 0.15, f2 = null, delay = 0, pan, att) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain(); env(g, t, vol, dur, att);
    o.connect(g); g.connect(out(pan));
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.2, freq = 1000, type = 'lowpass', f2 = null, delay = 0, q = 1, pan, att) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = nbuf; s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(freq, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain(); env(g, t, vol, dur, att);
    s.connect(fl); fl.connect(g); g.connect(out(pan));
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function ambient() {
    const s = ac.createBufferSource(); s.buffer = nbuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 70;
    const g = ac.createGain(); g.gain.value = 0.2;
    s.connect(f); f.connect(g); g.connect(master); s.start();
    const drone = ac.createOscillator(); drone.type = 'sine'; drone.frequency.value = 43;
    const dg = ac.createGain(); dg.gain.value = 0.03; drone.connect(dg); dg.connect(master); drone.start();
    const drip = () => {
      if (ambNow === 'field' || BANK.amb_drips) { setTimeout(drip, 4000); return; }   // the recorded drips have taken over
      const fr = 700 + Math.random() * 1200, pan = Math.random() * 2 - 1;
      tone(fr, 0.12, 'sine', 0.02 + Math.random() * 0.035, fr * 0.45, 0, pan);
      tone(fr * 0.9, 0.1, 'sine', 0.01, fr * 0.4, 0.3, -pan);
      setTimeout(drip, 1200 + Math.random() * 5000);
    };
    setTimeout(drip, 1500);
  }
  return {
    init,
    ambience(kind) { setAmb(kind); },
    stats() { return { families: Object.fromEntries(Object.entries(FAMILY).map(([k, v]) => [k, v.length])), singles: Object.keys(BANK), amb: ambNow, nodes: ambNodes.length }; },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    step(soft, surf = 'stone') { play('step_' + surf, soft ? 0.18 : 0.32, undefined, 1, 0.1) || noise(0.07, soft ? 0.05 : 0.08, 300 + Math.random() * 200, 'lowpass'); },
    pickup() { play('keys', 0.3, undefined, 1.2) || (tone(520, 0.1, 'triangle', 0.05), tone(780, 0.14, 'triangle', 0.05, null, 0.06)); },
    heal() { tone(330, 0.3, 'sine', 0.06, 440); tone(495, 0.4, 'sine', 0.04, null, 0.12); },
    chain() { play('keys', 0.45, undefined, 0.7, 0.1) || (() => { for (let i = 0; i < 6; i++) tone(1800 + Math.random() * 1600, 0.05, 'square', 0.025, null, i * 0.05 + Math.random() * 0.03); })(); },
    snap() { if (!play('metal_hit', 0.6, undefined, 1.1)) { noise(0.12, 0.25, 2500, 'bandpass', 800, 0, 3); tone(2400, 0.2, 'square', 0.05, 900); } this.chain(); },
    grind() { play('metal_open', 0.5, undefined, 0.8, 0.05) || noise(0.9, 0.12, 900, 'bandpass', 2400, 0, 6); },
    clank() { play('metal_slam', 0.6, undefined, 0.85, 0.06) || (tone(140, 0.5, 'square', 0.06, 70), tone(1200, 0.4, 'triangle', 0.04, 900, 0.02), noise(0.3, 0.12, 600, 'bandpass', 200, 0, 2)); },
    bars() { play('metal_open', 0.55, undefined, 0.6, 0.04) || (noise(1.4, 0.1, 400, 'bandpass', 1400, 0, 4), tone(90, 1.4, 'sawtooth', 0.03, 140)); },
    whoosh() { play('swing', 0.35, undefined, 0.9) || noise(0.22, 0.13, 500, 'bandpass', 2400, 0, 2); },
    stab() { play('flesh', 0.7, undefined, 0.9) || (noise(0.12, 0.16, 1400, 'bandpass', 300, 0, 2), tone(110, 0.18, 'sine', 0.12, 60, 0.04)); },
    miss() { play('swing', 0.25, undefined, 1.1) || noise(0.18, 0.08, 900, 'bandpass', 2600, 0, 3); },
    clatter(pan) { play('metal_fall', 0.45, pan, 1, 0.1) || (() => { for (let i = 0; i < 5; i++) tone(500 + Math.random() * 500, 0.06, 'triangle', 0.05, 300, i * 0.07 + Math.random() * 0.04, pan); })(); },
    hurt() { if (play('voice', 0.55, undefined, 0.88, 0.05)) { play('flesh', 0.45); return; } tone(150, 0.3, 'sawtooth', 0.11, 50); noise(0.18, 0.14, 800, 'lowpass'); },
    venom() { noise(0.5, 0.1, 3000, 'highpass'); tone(260, 0.4, 'sine', 0.05, 120); },
    spit(pan) { noise(0.25, 0.14, 2200, 'bandpass', 900, 0, 2, pan); },
    hiss(pan, vol = 0.12) { noise(1.8, vol, 4500, 'highpass', 2500, 0, 0.7, pan, 0.4); },
    rumble() { noise(4.0, 0.3, 90, 'lowpass', 45, 0, 1, undefined, 1.2); tone(38, 4, 'sine', 0.12, 30, 0, undefined, 1.0); },
    crush() { noise(0.6, 0.35, 220, 'lowpass', 60); tone(70, 0.6, 'sine', 0.2, 30); for (let i = 0; i < 4; i++) noise(0.05, 0.15, 1800, 'bandpass', null, 0.05 + i * 0.07, 4); },
    scream() { tone(520, 1.1, 'sawtooth', 0.06, 180); tone(530, 1.1, 'triangle', 0.05, 175, 0.02); },
    voice(pan) { // Shukeli: a high, wheedling sing-song
      const base = 260 + Math.random() * 40;
      for (let i = 0; i < 5; i++) tone(base * (1 + 0.25 * Math.sin(i * 2.1)), 0.13, 'triangle', 0.045, base * 0.9, i * 0.12, pan);
    },
    die() { if (play('voice', 0.7, undefined, 0.75, 0.02)) { play('flesh', 0.6, undefined, 0.7); play('die', 0.5, undefined, 0.8, 0, 0.25); return; } tone(200, 1.6, 'triangle', 0.12, 40); noise(1.2, 0.1, 600, 'lowpass', 60); },
    sting() { [196, 233, 294, 392].forEach((f, i) => tone(f, 1.2, 'triangle', 0.05, null, i * 0.16)); },
    blip() { tone(880, 0.05, 'square', 0.02); },
    // combat
    shout() { if (play('voice', 0.4, Math.random() - 0.5, 0.7, 0.05)) { play('voice', 0.3, Math.random() - 0.5, 0.8, 0.05, 0.2); return; } const b = 150 + Math.random() * 30; for (let i = 0; i < 3; i++) tone(b * (1 + 0.15 * i), 0.22, 'sawtooth', 0.05, b * 0.8, i * 0.15); },
    ready(pan) { tone(1400, 0.08, 'square', 0.03, 900, 0, pan); noise(0.12, 0.05, 2500, 'highpass', null, 0, 1, pan); },
    swing() { play('swing', 0.42) || noise(0.2, 0.11, 700, 'bandpass', 2600, 0, 2.5); },
    bowdraw() { noise(0.6, 0.04, 1800, 'bandpass', 900, 0, 6); },
    bow() { tone(180, 0.18, 'triangle', 0.08, 90); noise(0.15, 0.08, 3000, 'highpass'); },
    clang() { play('clash', 0.55) || (tone(1650, 0.35, 'square', 0.05, 1500), tone(2470, 0.3, 'triangle', 0.05, 2300, 0.01), noise(0.08, 0.15, 4000, 'highpass')); },
    hit(beast, pan) { if (play('flesh', 0.75, pan)) { play('hit', 0.35, pan, 0.9); return; } noise(0.14, 0.2, 900, 'lowpass', 200); tone(90, 0.16, 'sine', 0.12, 50); },
    thud() { play('flesh', 0.7, undefined, 0.6) || (noise(0.2, 0.25, 300, 'lowpass', 80), tone(60, 0.25, 'sine', 0.15, 35)); },
    death(beast, pan) { if (beast ? play('beast_hurt', 0.6, pan, 0.75) : play('voice', 0.5, pan, 0.72, 0.06)) { play('die', 0.35, pan, beast ? 0.7 : 0.9, 0.05, 0.15); return; } this.grunt(); },
    grunt(beast, pan) { if (beast ? play('beast_grunt', 0.55, pan, 0.8) : play('voice', 0.45, pan, 0.8, 0.08)) return; const b = 110 + Math.random() * 40; tone(b, 0.28, 'sawtooth', 0.06, b * 0.7); noise(0.2, 0.05, 600, 'bandpass'); },
    kick() { play('flesh', 0.8, undefined, 0.65) || (noise(0.18, 0.28, 300, 'lowpass', 80), tone(65, 0.22, 'sine', 0.18, 40)); },
    // e1m3
    screech(pan) { play(Math.random() < 0.5 ? 'beast_growl' : 'beast_roar', 0.5, pan, 0.85, 0.12) || (tone(900, 0.35, 'sawtooth', 0.05, 2400, 0, pan), noise(0.3, 0.12, 3200, 'bandpass', 1200, 0, 3, pan)); },
    weep(pan, vol = 1) {                              // a woman weeping piteously, somewhere in the dark
      const b = 420 + Math.random() * 40;
      for (let i = 0; i < 4; i++) tone(b * (1.08 - i * 0.05), 0.45, 'triangle', 0.035 * vol, b * (0.92 - i * 0.05), i * 0.38, pan, 0.08);
      noise(1.4, 0.02 * vol, 1500, 'bandpass', 900, 0, 2, pan, 0.3);
    },
    titter(pan, vol = 1) { const b = 760 + Math.random() * 80; for (let i = 0; i < 7; i++) tone(b * (1 + (i % 2) * 0.12), 0.08, 'square', 0.03 * vol, b * 0.9, i * 0.09, pan); },
    squelch() { play('flesh', 0.8, undefined, 0.5, 0.1) || (noise(0.35, 0.22, 500, 'lowpass', 120), tone(70, 0.3, 'sine', 0.12, 40)); },
    wind(vol) { noise(1.8, 0.12 * vol, 300, 'bandpass', 900, 0, 0.8, Math.random() * 2 - 1, 0.5); tone(55, 1.6, 'sine', 0.03 * vol, 48, 0.2); },
    magic() { tone(220, 1.2, 'sine', 0.08, 880); [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.9, 'triangle', 0.04, null, 0.15 + i * 0.12)); },
    arrow(pan) { noise(0.12, 0.06, 5000, 'highpass', null, 0, 1, pan); },
  };
})();
