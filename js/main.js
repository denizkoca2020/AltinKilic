// Oyunu başlatır: Phaser ayarları, ekran boyutu, başlangıç ekranı ve dokunmatik tuşlar.
(function () {
  const AK = (window.AK = window.AK || {});

  const GAME_H = 240; // sabit iç çözünürlük yüksekliği (piksel sanat ölçeği)

  // Ekran oranına göre iç genişlik (iPad 4:3 ≈ 320, geniş ekran ≈ 430)
  function gameWidth() {
    const w = window.innerWidth, h = window.innerHeight;
    if (h > w) return 430; // dikey: zaten "çevirin" uyarısı görünür
    return Phaser.Math.Clamp(Math.round((GAME_H * w) / h), 300, 560);
  }

  const params = new URLSearchParams(location.search);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#05070d',
    pixelArt: true,
    roundPixels: true,
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: gameWidth(),
      height: GAME_H,
    },
    // Girişleri kendi sistemimiz yönetiyor (bkz. input.js, TouchControls.js)
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 1000 }, debug: false },
    },
    scene: [AK.BootScene, AK.GameScene],
  });
  AK.game = game;

  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const w = gameWidth();
      if (w !== game.scale.gameSize.width) game.scale.setGameSize(w, GAME_H);
      else game.scale.refresh();
    }, 120);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // ---- iPad: yakınlaştırma / kaydırma / uzun basma menüsünü engelle ----
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) =>
    document.addEventListener(t, (e) => e.preventDefault(), { passive: false })
  );
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

  // ---- Dokunmatik tuşlar ----
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || params.has('touch');
  const controlsRoot = document.getElementById('controls');
  if (isTouch) {
    document.body.classList.add('touch');
    AK.touchControls = new AK.TouchControls(controlsRoot, AK.input);
  } else {
    document.body.classList.add('keyboard');
  }

  // ---- Ses ----
  // iPad sesi ancak bir dokunuştan sonra açar; arka plandan dönünce de yeniden açılması gerekir
  const unlockAudio = () => AK.audio.unlock();
  ['touchend', 'click', 'keydown'].forEach((t) => window.addEventListener(t, unlockAudio, true));
  const muteBtn = document.getElementById('mute');
  const SPEAKER = (on) => `<svg viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect x="2" y="6" width="3" height="4" fill="#dfe6f5"/><rect x="5" y="5" width="1" height="6" fill="#dfe6f5"/>
    <rect x="6" y="4" width="1" height="8" fill="#dfe6f5"/><rect x="7" y="3" width="1" height="10" fill="#dfe6f5"/>
    ${on ? '<rect x="10" y="6" width="1" height="4" fill="#f2c75a"/><rect x="12" y="4" width="1" height="8" fill="#f2c75a"/>'
         : '<rect x="10" y="5" width="1" height="1" fill="#e06060"/><rect x="11" y="6" width="1" height="1" fill="#e06060"/><rect x="12" y="7" width="1" height="2" fill="#e06060"/><rect x="11" y="9" width="1" height="1" fill="#e06060"/><rect x="10" y="10" width="1" height="1" fill="#e06060"/><rect x="13" y="6" width="1" height="1" fill="#e06060"/><rect x="14" y="5" width="1" height="1" fill="#e06060"/><rect x="13" y="9" width="1" height="1" fill="#e06060"/><rect x="14" y="10" width="1" height="1" fill="#e06060"/>'}
  </svg>`;
  const applyMute = () => {
    AK.audio.setMuted(!!AK.save.muted);
    muteBtn.innerHTML = SPEAKER(!AK.save.muted);
  };
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    AK.save.muted = !AK.save.muted;
    AK.saveGame();
    applyMute();
  });
  applyMute();

  // ---- Başlangıç ekranı ----
  const title = document.getElementById('title');
  const start = () => {
    if (title.classList.contains('hidden')) return;
    title.classList.add('hidden');
    AK.input.releaseAll('kb');
    AK.input.releaseAll('touch');
    Object.keys(AK.input.pressed).forEach((k) => (AK.input.pressed[k] = false));
    // Mümkünse tam ekran (iPad Safari destekliyorsa)
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (isTouch && req && !params.has('nofs')) {
      try {
        const p = req.call(el);
        if (p && p.catch) p.catch(() => {});
      } catch (_) { /* desteklenmiyor */ }
    }
    setTimeout(() => AK.touchControls && AK.touchControls.measure(), 400);
  };
  title.addEventListener('click', start);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'Space') start();
  });
  if (params.has('skip')) start();
})();
