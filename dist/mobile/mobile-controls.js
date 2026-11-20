/* Input adapter only. Never changes collision, scoring, physics, or unlock rules. */
(() => {
  'use strict';
  const activePointers = new Map();
  const keyButtons = [...document.querySelectorAll('[data-driving-key]')];
  const signalLeft = document.getElementById('mobile-ind-left');
  const signalRight = document.getElementById('mobile-ind-right');
  const hud = document.getElementById('hud-screen');

  function engine() { return window.__desiDriveMobileEngine; }

  function syncKeys() {
    const g = engine();
    if (!g) return;
    for (const button of keyButtons) {
      const key = button.dataset.drivingKey;
      const held = [...activePointers.values()].includes(key);
      g.keys[key] = held && g.isPlaying;
      button.classList.toggle('held', held && g.isPlaying);
      button.setAttribute('aria-pressed', String(held && g.isPlaying));
    }
  }

  function releaseAll() {
    activePointers.clear();
    syncKeys();
  }

  for (const button of keyButtons) {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const g = engine();
      if (!g || !g.isPlaying) return;
      button.setPointerCapture?.(event.pointerId);
      activePointers.set(event.pointerId, button.dataset.drivingKey);
      syncKeys();
    });
    const release = (event) => {
      event.preventDefault();
      activePointers.delete(event.pointerId);
      syncKeys();
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  function syncSignals() {
    const g = engine();
    if (!g) return;
    signalLeft.setAttribute('aria-pressed', String(g.ind.l));
    signalRight.setAttribute('aria-pressed', String(g.ind.r));
    signalLeft.querySelector('small').textContent = g.ind.l ? 'ON' : 'OFF';
    signalRight.querySelector('small').textContent = g.ind.r ? 'ON' : 'OFF';
  }

  function toggleSignal(which, event) {
    event.preventDefault();
    const g = engine();
    if (!g || !g.isPlaying) return;
    g.ind[which] = !g.ind[which];
    g.ind[which === 'l' ? 'r' : 'l'] = false;
    g.updateUIIndicators();
    syncSignals();
  }

  signalLeft.addEventListener('click', (event) => toggleSignal('l', event));
  signalRight.addEventListener('click', (event) => toggleSignal('r', event));
  for (const button of [signalLeft, signalRight]) {
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  window.addEventListener('blur', releaseAll);
  window.addEventListener('pagehide', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  window.addEventListener('keyup', syncSignals);

  // The core hides HUD on collision. Immediately release held keys as the
  // overlay changes, so TRY AGAIN never resumes with a phantom accelerator.
  const watcher = new MutationObserver(() => {
    if (hud.classList.contains('hidden') || !engine()?.isPlaying) releaseAll();
    syncSignals();
  });
  watcher.observe(hud, { attributes:true, attributeFilter:['class'] });
  watcher.observe(document.getElementById('game-over-screen'), { attributes:true, attributeFilter:['class'] });
  watcher.observe(document.getElementById('garage-screen'), { attributes:true, attributeFilter:['class'] });
  syncSignals();
})();
