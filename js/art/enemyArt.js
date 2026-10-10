// Düşmanların, altın paranın ve HUD rakamlarının piksel sanatı. Tüm kareler sağa bakar.
(function () {
  const AK = (window.AK = window.AK || {});
  const P = AK.PAL;

  const C = {
    shell: '#b4582c', shellDark: '#7a3519', shellLight: '#e08a4f',
    bug: '#3b2b2b', leg: '#2a1d1d', eyeHot: '#ffd36e',

    fly: '#3a2d4f', flyDark: '#2a2039', flyLight: '#5a4877', wing: 'rgba(175,205,245,0.75)', wingEdge: 'rgba(220,235,255,0.9)',
    flyEye: '#ff9a3c', flyEyeHot: '#ffe08a',

    husk: '#6e6150', huskDark: '#4f453a', huskLight: '#8f816c', mask: '#e6e0d2', maskShade: '#b9b1a0', rust: '#9a5b3a', rustLight: '#c98a5e',
  };
  AK.ENEMY_COLORS = C;

  // ---------- Kabukböcek (yürüyen) 22x14 ----------
  function crawler(step) {
    const g = new AK.PixelGrid(22, 14);
    // bacaklar
    const legs = [6, 11, 16];
    legs.forEach((x, i) => {
      const off = (i + step) % 2 === 0 ? -1 : 1;
      g.line(x, 9, x + off, 12, C.leg, 1);
    });
    // kabuk
    g.ellipse(11, 8, 8, 5, C.shell);
    g.rect(2, 10, 19, 4, null);
    g.rect(3, 9, 17, 1, C.shellDark);
    [7, 11, 15].forEach((x) => g.line(x, 4, x, 8, C.shellDark));
    g.rect(8, 3, 3, 1, C.shellLight);
    g.rect(12, 3, 2, 1, C.shellLight);
    g.set(6, 5, C.shellLight);
    // kafa
    g.rect(18, 6, 3, 4, C.bug);
    g.set(20, 7, C.eyeHot);
    g.set(21, 8, C.leg); // anten
    g.outline(P.outline);
    return g;
  }

  // ---------- Gölge Sinek (uçan) 24x20 ----------
  function flyer(up) {
    const g = new AK.PixelGrid(24, 20);
    // kanatlar (gövdenin arkasında)
    if (up) {
      g.ellipse(9, 5, 5, 3, C.wing);
      g.line(5, 3, 12, 2, C.wingEdge);
    } else {
      g.ellipse(8, 15, 5, 2, C.wing);
      g.line(4, 16, 11, 17, C.wingEdge);
    }
    // iğne
    g.line(3, 13, 6, 12, C.flyDark, 2);
    // gövde
    g.ellipse(12, 11, 6, 5, C.fly);
    g.rect(8, 13, 8, 2, C.flyDark);
    g.rect(9, 7, 4, 1, C.flyLight);
    g.set(8, 8, C.flyLight);
    // gözler
    g.rect(15, 9, 2, 2, C.flyEye);
    g.set(16, 9, C.flyEyeHot);
    g.set(18, 10, C.flyEye);
    // ağız/hortum
    g.set(18, 13, C.flyDark);
    g.set(19, 14, C.flyDark);
    g.outline(P.outline);
    return g;
  }

  // ---------- Kabuk Muhafız (hücumcu) 28x32 ----------
  function husk(pose) {
    const g = new AK.PixelGrid(28, 32);
    const legs = { walk0: [-2, 2], walk1: [1, -1], windup: [-3, 1], charge: [-5, 4] }[pose];
    // bacaklar
    g.line(10, 24, 10 + legs[0], 30, C.huskDark, 2);
    g.line(14, 24, 14 + legs[1], 30, C.huskDark, 2);
    g.rect(9 + legs[0], 30, 4, 2, P.outline);
    g.rect(13 + legs[1], 30, 4, 2, P.outline);
    const lean = pose === 'charge' ? 2 : pose === 'windup' ? -1 : 0;
    // kambur kabuk gövde
    g.ellipse(11 + lean, 18, 7, 7, C.husk);
    g.rect(4 + lean, 18, 3, 6, C.huskDark);
    g.rect(7 + lean, 12, 5, 1, C.huskLight);
    g.set(6 + lean, 13, C.huskLight);
    g.line(6 + lean, 22, 16 + lean, 22, C.huskDark);
    // maske kafa
    g.ellipse(17 + lean, 12, 4, 4, C.mask);
    g.rect(14 + lean, 14, 3, 2, C.maskShade);
    g.rect(18 + lean, 11, 2, 2, P.outline);
    g.set(15 + lean, 7, C.mask); // boynuzlar
    g.set(14 + lean, 6, C.mask);
    g.set(19 + lean, 7, C.mask);
    g.set(20 + lean, 6, C.mask);
    // kol + paslı kılıç
    if (pose === 'windup') {
      g.line(15 + lean, 17, 12 + lean, 11, C.huskDark, 2);
      g.line(12 + lean, 10, 7 + lean, 3, C.rust, 2);
      g.set(7 + lean, 3, C.rustLight);
    } else if (pose === 'charge') {
      g.line(15 + lean, 18, 20 + lean, 19, C.huskDark, 2);
      g.line(21 + lean, 19, 27, 19, C.rust, 2);
      g.set(27, 19, C.rustLight);
    } else {
      g.line(15, 18, 17, 22, C.huskDark, 2);
      g.line(18, 23, 22, 28, C.rust, 2);
      g.set(22, 28, C.rustLight);
    }
    g.outline(P.outline);
    return g;
  }

  // ---------- Altın para 7x7, dönen 4 kare ----------
  function coin(rx) {
    const g = new AK.PixelGrid(7, 7);
    g.ellipse(3, 3, rx, 3, P.goldMid);
    if (rx > 1) {
      g.ellipse(3, 3, Math.max(0, rx - 1), 2, P.goldLight);
      g.set(3 - Math.floor(rx / 2), 2, P.goldShine);
    } else {
      g.rect(3, 1, 1, 5, P.goldLight);
    }
    return g;
  }

  // ---------- HUD rakamları 3x5 yazı tipi (+kontur) ----------
  const DIGITS = [
    '111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
    '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111',
  ];
  function digit(i) {
    const g = new AK.PixelGrid(5, 7);
    for (let k = 0; k < 15; k++) if (DIGITS[i][k] === '1') g.set(1 + (k % 3), 1 + Math.floor(k / 3), P.goldShine);
    g.outline(P.outline);
    return g;
  }

  AK.buildEnemyTextures = function (scene) {
    AK.addFrames(scene, 'crawler', 22, 14, [{ name: 'w0', grid: crawler(0) }, { name: 'w1', grid: crawler(1) }]);
    scene.anims.create({ key: 'crawler-walk', frames: [{ key: 'crawler', frame: 'w0' }, { key: 'crawler', frame: 'w1' }], frameRate: 6, repeat: -1 });

    AK.addFrames(scene, 'flyer', 24, 20, [{ name: 'f0', grid: flyer(true) }, { name: 'f1', grid: flyer(false) }]);
    scene.anims.create({ key: 'flyer-fly', frames: [{ key: 'flyer', frame: 'f0' }, { key: 'flyer', frame: 'f1' }], frameRate: 14, repeat: -1 });

    AK.addFrames(scene, 'husk', 28, 32, ['walk0', 'walk1', 'windup', 'charge'].map((n) => ({ name: n, grid: husk(n) })));
    scene.anims.create({ key: 'husk-walk', frames: [{ key: 'husk', frame: 'walk0' }, { key: 'husk', frame: 'walk1' }], frameRate: 4, repeat: -1 });

    AK.addFrames(scene, 'coin', 7, 7, [3, 2, 1, 2].map((rx, i) => ({ name: 'c' + i, grid: coin(rx) })));
    scene.anims.create({ key: 'coin-spin', frames: [0, 1, 2, 3].map((i) => ({ key: 'coin', frame: 'c' + i })), frameRate: 10, repeat: -1 });

    AK.addFrames(scene, 'digits', 5, 7, DIGITS.map((_, i) => ({ name: 'd' + i, grid: digit(i) })));
  };
})();
