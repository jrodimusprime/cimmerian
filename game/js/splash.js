'use strict';
// ---------------------------------------------------------------------------
// Story splash screens (README §12): a public-domain plate, the level's story, a keypress.
// Plates are public-domain engravings and paintings (README §6), processed by
// tools/splashgen.sh: cropped to the plate, palette-locked, one scarlet accent.
// Every source and licence is listed in story/credits.json.
const SPLASHES = {
  title: { image: 'art/title.jpg', credit: 'John Martin, <i>Pandemonium</i>, 1841' },
  e1m2: { title: 'THE PITS', image: 'art/e1m2.jpg', credit: 'G. B. Piranesi, <i>The Drawbridge</i>, Carceri d\'Invenzione VII, 1761',
    text: 'Beaten on the plain of Shamu and struck down by the wizard\'s poisoned ring, the king was carried in chains to Khorshemish. Before the kings who betrayed him he spat his defiance. Now Tsotha-lanti has given him to the dark beneath the Scarlet Citadel, where something vast moves in the tunnels.' },
  e1m3: { title: 'THE TUNNELS BELOW', image: 'art/e1m3.jpg', credit: 'G. B. Piranesi, <i>The Gothic Arch</i>, Carceri d\'Invenzione XIV, 1761',
    text: 'The jailer\'s keys are heavy in your fist, and the stair climbs toward the citadel. But the keys open more than one door, and the pits go deeper than any stair. Somewhere below, something is weeping, and a prisoner older than the citadel is waiting to be found.' },
  e1m4: { title: 'YOTHGA', image: 'art/e1m4.jpg', credit: 'G. B. Piranesi, <i>Prisoners on a Projecting Platform</i>, Carceri d\'Invenzione X, 1761',
    text: 'Beyond the sigil gate a cage of bars stands in the dark, and in it a garden that should not be: a pale stem, livid blossoms, tendrils that rear like cobras. In their grip hangs a man who is very old, or something wearing one. The flower is drinking his soul.' },
};
for (const k in SPLASHES) { const im = new Image(); im.src = SPLASHES[k].image; }   // fetch early: they show while the level loads

// Shows a splash; resolves when the player presses a key or clicks.
function showSplash(id, extraHtml, buttonLabel) {
  const sp = SPLASHES[id];
  overlay.classList.remove('hidden');
  overlay.className = 'splash';
  overlay.innerHTML = '<div class="plate"><img id="splashArt" src="' + sp.image + '" alt=""><div class="credit">' + sp.credit + '</div></div><div class="splashText"><div class="map">' + id.toUpperCase() + '</div><h1>' + sp.title + '</h1><p>' + sp.text + '</p>' +
    (extraHtml || '') + '<div class="go">' + (buttonLabel || 'Press any key') + '</div></div>';
  return new Promise(resolve => {
    let armed = false;
    setTimeout(() => { armed = true; }, 600);
    const go = e => {
      if (!armed) return;
      if (e && e.type === 'keydown' && ['F5', 'F12', 'Meta', 'Alt', 'Control', 'Shift'].includes(e.key)) return;
      removeEventListener('keydown', go); overlay.removeEventListener('mousedown', go);
      resolve();
    };
    addEventListener('keydown', go); overlay.addEventListener('mousedown', go);
  });
}

// The title card: five seconds, then the story. Embers rise; the plate pushes in.
function showTitleCard() {
  overlay.className = 'titlecard';
  overlay.innerHTML = '<img id="splashArt" src="' + SPLASHES.title.image + '" alt=""><canvas id="embers"></canvas><div class="tc"><div class="tc1">THE CIMMERIAN</div><div class="tc2">The Scarlet Citadel</div><div class="tc3">after Robert E. Howard</div></div><div class="tccredit">' + SPLASHES.title.credit + '</div>';
  const ec = $('embers'), ex = ec.getContext('2d');
  ec.width = innerWidth; ec.height = innerHeight;
  const embers = Array.from({ length: 90 }, () => ({ x: Math.random() * ec.width, y: ec.height + Math.random() * ec.height, v: 20 + Math.random() * 60, s: 1 + Math.random() * 2.5, w: Math.random() * 6 }));
  const t0 = performance.now();
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (done) return; done = true; removeEventListener('keydown', skip); overlay.removeEventListener('mousedown', skip); resolve(); };
    const skip = () => { if (performance.now() - t0 > 400) finish(); };
    addEventListener('keydown', skip); overlay.addEventListener('mousedown', skip);
    const tick = now => {
      if (done) return;
      const t = (now - t0) / 1000;
      ex.clearRect(0, 0, ec.width, ec.height);
      for (const e of embers) {
        e.y -= e.v * 0.016; e.x += Math.sin(t * 2 + e.w) * 0.4;
        if (e.y < -10) { e.y = ec.height + 10; e.x = Math.random() * ec.width; }
        const a = Math.max(0, Math.min(1, e.y / ec.height)) * (0.5 + 0.5 * Math.sin(t * 6 + e.w));
        ex.fillStyle = 'rgba(255,' + (120 + Math.floor(e.w * 15)) + ',40,' + a.toFixed(2) + ')';
        ex.fillRect(e.x, e.y, e.s, e.s);
      }
      if (t >= 5) finish(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
