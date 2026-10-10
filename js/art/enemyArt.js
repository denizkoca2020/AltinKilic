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

// ---------- Kabuk Kral (boss) 64x56 + şok dalgası + düşen kaya + sunak ----------
(function () {
  const AK = window.AK;
  const P = AK.PAL;
  const C = AK.ENEMY_COLORS;
  const K = {
    cape: '#3d1f4a', capeMid: '#5a2d6b', capeLight: '#7a3f8e',
    iron: '#4f5464', ironLight: '#9aa0b4', ironDark: '#30333f',
    eye: '#ff7a3c', eyeHot: '#ffd36e', gem: '#d0304a',
  };

  function greatsword(g, hx, hy, tx, ty) {
    const dx = tx - hx, dy = ty - hy, m = Math.hypot(dx, dy);
    const ux = dx / m, uy = dy / m, px = -uy, py = ux;
    // kabza + siper
    g.line(hx - ux * 4, hy - uy * 4, hx, hy, P.wood, 2);
    for (let k = -3; k <= 3; k++) g.set(hx + ux * 2 + px * k, hy + uy * 2 + py * k, P.goldMid);
    // namlu
    for (let i = 3; i <= m; i++) {
      const x = hx + ux * i, y = hy + uy * i;
      g.set(x + px, y + py, K.ironDark);
      g.set(x, y, K.iron);
      g.set(x - px, y - py, K.ironLight);
    }
    g.rect(hx - 1, hy - 1, 3, 3, C.huskDark); // el
  }

  function king(pose) {
    const g = new AK.PixelGrid(64, 56);
    const lean = { charge: 4, windup: -2, slam: 2 }[pose] || 0;
    const bob = pose === 'idle1' ? 1 : 0;
    const X = (x) => x + lean;
    const legs = {
      idle0: [[-3, 0], [3, 0]], idle1: [[-3, 0], [3, 0]], windup: [[-5, 0], [4, 0]],
      charge: [[-8, 1], [6, 2]], leap: [[-4, 6], [4, 5]], slam: [[-7, 0], [7, 0]],
    }[pose];
    const capeUp = pose === 'leap' ? 10 : 0;

    // pelerin
    for (let r = 0; r < 30 - capeUp; r++) {
      const y = 20 + bob + r;
      const xl = X(18) - Math.round(r * 0.45) - (pose === 'charge' ? Math.round(r * 0.4) : 0);
      for (let x = xl; x <= X(26); x++) {
        if (r === 29 - capeUp && (x + r) % 2) continue;
        g.set(x, y, x < xl + 2 ? K.cape : x > X(23) ? K.capeLight : K.capeMid);
      }
    }
    // bacaklar
    [[22, legs[0]], [30, legs[1]]].forEach(([hx, [dx, lift]], i) => {
      g.line(hx, 40, hx + dx, 52 - lift, i ? C.huskDark : '#3f372e', 4);
      g.rect(hx + dx - 1, 53 - lift, 7, 3, P.outline);
    });
    // kambur kabuk gövde
    g.ellipse(X(26), 31 + bob, 14, 12, C.husk);
    g.ellipse(X(24), 29 + bob, 9, 7, C.huskLight);
    g.ellipse(X(26), 33 + bob, 12, 8, C.husk);
    g.rect(X(13), 30 + bob, 3, 10, C.huskDark);
    g.line(X(14), 38 + bob, X(38), 38 + bob, C.huskDark, 1);
    g.line(X(16), 24 + bob, X(22), 22 + bob, '#b0a28a', 1);
    // maske kafa
    g.ellipse(X(39), 19 + bob, 8, 8, C.mask);
    g.rect(X(33), 23 + bob, 6, 3, C.maskShade);
    g.rect(X(37), 16 + bob, 2, 4, P.outline);
    g.rect(X(42), 16 + bob, 2, 4, P.outline);
    g.set(X(37), 17 + bob, K.eye);
    g.set(X(42), 17 + bob, K.eye);
    g.set(X(43), 16 + bob, K.eyeHot);
    // taç
    g.rect(X(32), 9 + bob, 14, 3, P.goldMid);
    g.rect(X(32), 9 + bob, 14, 1, P.goldLight);
    [33, 38, 43].forEach((x, i) => {
      g.rect(X(x), 5 + bob + (i === 1 ? -2 : 0), 2, 4 + (i === 1 ? 2 : 0), P.goldLight);
      g.set(X(x), 5 + bob + (i === 1 ? -2 : 0), P.goldShine);
    });
    g.set(X(36), 10 + bob, K.gem);
    g.set(X(41), 10 + bob, K.gem);
    // kılıç kolu
    const S = {
      idle0: [[44, 33], [56, 52]], idle1: [[44, 34], [56, 53]], windup: [[33, 14], [12, 2]],
      charge: [[46, 30], [63, 29]], leap: [[41, 15], [46, 0]], slam: [[45, 36], [60, 55]],
    }[pose];
    const [[hx, hy], [tx, ty]] = S;
    g.line(X(34), 28 + bob, X(hx), hy + bob, C.huskDark, 3);
    greatsword(g, X(hx), hy + bob, Math.min(63, X(tx)), ty + bob);
    g.outline(P.outline);
    return g;
  }

  // yere yayılan şok dalgası 18x14
  function shock(i) {
    const g = new AK.PixelGrid(18, 14);
    for (let x = 0; x < 18; x++) {
      const h = Math.round(4 + 8 * Math.sin((x / 17) * Math.PI) * (i ? 0.85 : 1));
      for (let y = 14 - h; y < 14; y++) {
        const k = (y - (14 - h)) / h;
        g.set(x, y, k < 0.25 ? '#fff2b0' : k < 0.6 ? '#f2c75a' : '#c8572a');
      }
    }
    return g;
  }

  // düşen kaya 10x10
  function rock() {
    const g = new AK.PixelGrid(10, 10);
    g.ellipse(5, 5, 4, 4, P.stoneMid);
    g.rect(3, 2, 3, 2, P.stoneLight);
    g.set(6, 6, P.stoneDark);
    g.set(3, 6, P.stoneDark);
    g.outline(P.outline);
    return g;
  }

  // altın sunak 28x30 (boss sonrası ödül)
  function shrine() {
    const g = new AK.PixelGrid(28, 30);
    g.rect(4, 22, 20, 8, P.stoneMid);
    g.rect(4, 22, 20, 1, P.stoneRim);
    g.rect(7, 12, 14, 10, P.stoneLight);
    g.rect(7, 12, 14, 1, P.stoneRim);
    g.rect(2, 10, 24, 2, P.goldMid);
    g.rect(2, 10, 24, 1, P.goldLight);
    // üstünde süzülen altın kılıç
    g.rect(13, 0, 2, 8, P.goldLight);
    g.set(13, 0, P.goldShine);
    g.rect(10, 6, 8, 1, P.goldMid);
    g.rect(13, 7, 2, 2, P.goldDark);
    g.outline(P.outline);
    return g;
  }

  const prev = AK.buildEnemyTextures;
  AK.buildEnemyTextures = function (scene) {
    prev(scene);
    AK.addFrames(scene, 'king', 64, 56, ['idle0', 'idle1', 'windup', 'charge', 'leap', 'slam'].map((n) => ({ name: n, grid: king(n) })));
    scene.anims.create({ key: 'king-idle', frames: [{ key: 'king', frame: 'idle0' }, { key: 'king', frame: 'idle1' }], frameRate: 3, repeat: -1 });
    AK.addFrames(scene, 'shock', 18, 14, [{ name: 'a', grid: shock(0) }, { name: 'b', grid: shock(1) }]);
    scene.anims.create({ key: 'shock', frames: [{ key: 'shock', frame: 'a' }, { key: 'shock', frame: 'b' }], frameRate: 14, repeat: -1 });
    AK.addGrid(scene, 'rock', rock());
    AK.addGrid(scene, 'shrine', shrine());
  };
})();

// ---------- Tüccar (dost karakter) 32x34 ----------
(function () {
  const AK = window.AK;
  const P = AK.PAL;
  function merchant(bob) {
    const g = new AK.PixelGrid(32, 34);
    const b = bob;
    // asa + fener
    g.rect(25, 8, 2, 26, P.woodDark);
    g.rect(25, 8, 1, 26, P.wood);
    g.rect(22, 9, 5, 1, P.woodDark);
    g.rect(21, 10, 3, 5, '#2b2f40');
    g.rect(22, 11, 1, 3, P.goldLight);
    // dev sırt çantası
    g.ellipse(9, 17 + b, 8, 9, '#6b4a2e');
    g.ellipse(8, 15 + b, 5, 5, '#86603c');
    g.rect(2, 20 + b, 14, 1, '#4a321e');
    g.rect(5, 8 + b, 3, 4, '#a07a4a'); // tava/kap
    g.rect(12, 6 + b, 4, 3, P.goldMid); // altın kese
    g.set(13, 6 + b, P.goldShine);
    // pelerinli gövde
    g.ellipse(17, 22 + b, 7, 9, '#2f4a3a');
    g.rect(11, 26 + b, 13, 6 - b, '#2f4a3a');
    g.rect(12, 28 + b, 11, 1, '#22362a');
    g.rect(14, 18 + b, 2, 9, '#3f6450');
    // ayaklar
    g.rect(13, 32, 4, 2, P.outline);
    g.rect(19, 32, 4, 2, P.outline);
    // kapüşon + maske yüz
    g.ellipse(18, 11 + b, 6, 6, '#2f4a3a');
    g.ellipse(19, 12 + b, 4, 4, '#e8dcc4');
    g.rect(17, 11 + b, 2, 2, P.outline);
    g.rect(21, 11 + b, 2, 2, P.outline);
    g.set(18, 11 + b, '#fff');
    g.set(22, 11 + b, '#fff');
    g.rect(14, 5 + b, 6, 2, '#3f6450');
    // kol (asayı tutan)
    g.rect(22, 18 + b, 4, 2, '#2f4a3a');
    g.rect(24, 17 + b, 2, 3, '#e8dcc4');
    g.outline(P.outline);
    return g;
  }
  const prev = AK.buildEnemyTextures;
  AK.buildEnemyTextures = function (scene) {
    prev(scene);
    AK.addFrames(scene, 'merchant', 32, 34, [{ name: 'm0', grid: merchant(0) }, { name: 'm1', grid: merchant(1) }]);
    scene.anims.create({ key: 'merchant-idle', frames: [{ key: 'merchant', frame: 'm0' }, { key: 'merchant', frame: 'm1' }], frameRate: 2, repeat: -1 });
  };
})();
