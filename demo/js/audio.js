'use strict';
// ---------------------------------------------------------------------------
// Synthesised WebAudio (from The Endless Cave engine), with pit sounds added:
// Satha's hiss and rumble, chains, iron bars, the jailer's voice. Cosmetic
// randomness here uses Math.random: sound never feeds back into the sim.
// ---------------------------------------------------------------------------
const Sfx = (() => {
  let ac = null, master = null, nbuf = null, muted = false;

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
      const fr = 700 + Math.random() * 1200, pan = Math.random() * 2 - 1;
      tone(fr, 0.12, 'sine', 0.02 + Math.random() * 0.035, fr * 0.45, 0, pan);
      tone(fr * 0.9, 0.1, 'sine', 0.01, fr * 0.4, 0.3, -pan);
      setTimeout(drip, 1200 + Math.random() * 5000);
    };
    setTimeout(drip, 1500);
  }
  return {
    init,
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    step(soft) { noise(0.07, soft ? 0.05 : 0.08, 300 + Math.random() * 200, 'lowpass'); },
    pickup() { tone(520, 0.1, 'triangle', 0.05); tone(780, 0.14, 'triangle', 0.05, null, 0.06); },
    heal() { tone(330, 0.3, 'sine', 0.06, 440); tone(495, 0.4, 'sine', 0.04, null, 0.12); },
    chain() { for (let i = 0; i < 6; i++) tone(1800 + Math.random() * 1600, 0.05, 'square', 0.025, null, i * 0.05 + Math.random() * 0.03); },
    snap() { noise(0.12, 0.25, 2500, 'bandpass', 800, 0, 3); tone(2400, 0.2, 'square', 0.05, 900); this.chain(); },
    grind() { noise(0.9, 0.12, 900, 'bandpass', 2400, 0, 6); },
    clank() { tone(140, 0.5, 'square', 0.06, 70); tone(1200, 0.4, 'triangle', 0.04, 900, 0.02); noise(0.3, 0.12, 600, 'bandpass', 200, 0, 2); },
    bars() { noise(1.4, 0.1, 400, 'bandpass', 1400, 0, 4); tone(90, 1.4, 'sawtooth', 0.03, 140); },
    whoosh() { noise(0.22, 0.13, 500, 'bandpass', 2400, 0, 2); },
    stab() { noise(0.12, 0.16, 1400, 'bandpass', 300, 0, 2); tone(110, 0.18, 'sine', 0.12, 60, 0.04); },
    miss() { noise(0.18, 0.08, 900, 'bandpass', 2600, 0, 3); },
    clatter(pan) { for (let i = 0; i < 5; i++) tone(500 + Math.random() * 500, 0.06, 'triangle', 0.05, 300, i * 0.07 + Math.random() * 0.04, pan); },
    hurt() { tone(150, 0.3, 'sawtooth', 0.11, 50); noise(0.18, 0.14, 800, 'lowpass'); },
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
    die() { tone(200, 1.6, 'triangle', 0.12, 40); noise(1.2, 0.1, 600, 'lowpass', 60); },
    sting() { [196, 233, 294, 392].forEach((f, i) => tone(f, 1.2, 'triangle', 0.05, null, i * 0.16)); },
    blip() { tone(880, 0.05, 'square', 0.02); },
  };
})();
