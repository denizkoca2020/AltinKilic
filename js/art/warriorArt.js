// Savaşçının piksel sanatı: her kare bir "poz" tanımından çizilir.
// Kare boyutu 40x32, karakter sağa bakar (sola bakarken Phaser aynalar).
(function () {
  const AK = (window.AK = window.AK || {});
  const P = AK.PAL;

  const FW = 40;
  const FH = 32;
  const OX = 4; // karakteri karenin ortasına almak için yatay kaydırma

  function drawSword(g, hx, hy, dx, dy, len) {
    const m = Math.hypot(dx, dy);
    dx /= m; dy /= m;
    const px = -dy, py = dx;
    // kabza topuzu
    g.set(hx - dx * 2, hy - dy * 2, P.goldLight);
    g.set(hx - dx, hy - dy, P.wood);
    // namlu (altın kılıç)
    for (let i = 2; i <= len; i++) {
      g.set(hx + dx * i + px, hy + dy * i + py, P.goldMid);
      g.set(hx + dx * i, hy + dy * i, i % 3 === 0 ? P.goldShine : P.goldLight);
    }
    g.set(hx + dx * (len + 1), hy + dy * (len + 1), P.goldShine);
    // siper
    for (let k = -2; k <= 2; k++) {
      g.set(hx + dx + px * k, hy + dy + py * k, Math.abs(k) === 2 ? P.goldLight : P.goldDark);
    }
    // eldiven
    g.rect(hx - 1, hy - 1, 2, 2, P.armorDark);
  }

  function drawCape(g, c, b) {
    const y0 = 15 + b;
    if (c.horizontal) {
      // atılma sırasında pelerin yatay dalgalanır
      for (let i = 0; i < c.len; i++) {
        const x = 13 - i;
        const wave = Math.round(Math.sin(i * 0.7) * 1);
        const th = Math.max(1, 5 - Math.floor(i / 3));
        for (let j = 0; j < th; j++) {
          g.set(x + OX, y0 + 1 + j + wave, j === 0 ? P.capeLight : j === th - 1 ? P.capeDark : P.capeMid);
        }
      }
      return;
    }
    for (let r = 0; r < c.len; r++) {
      const y = y0 + Math.round(r * (1 - (c.up || 0)));
      const xr = 15;
      const xl = 13 - Math.round((r * c.spread) / c.len) - Math.round(((c.sway || 0) * r) / c.len);
      const last = r === c.len - 1;
      for (let x = xl; x <= xr; x++) {
        if (last && (x + r) % 2 === 0) continue; // yırtık pelerin ucu
        let col = P.capeMid;
        if (x <= xl + 1) col = P.capeDark;
        else if (x === xr - 2 && r > 1) col = P.capeLight;
        g.set(x + OX, y, col);
      }
    }
  }

  function drawWarrior(p) {
    const g = new AK.PixelGrid(FW, FH);
    const b = p.b || 0;
    const L = p.lean || 0;
    const X = (x) => x + OX + L; // üst gövde (eğilme dahil)
    const XL = (x) => x + OX; // bacaklar

    drawCape(g, p.cape, b);

    // kılıç gövdenin arkasındaysa önce çizilir
    if (p.arm === 'dash') {
      g.line(X(17), 17 + b, X(14), 19 + b, P.armorDark, 2);
      drawSword(g, X(13), 19 + b, -1, 0.15, 9);
    }

    // arka bacak
    const [bdx, bl] = p.back;
    g.line(XL(13), 24 + b, XL(13 + bdx), 29 - bl, P.armorDark, 2);
    g.rect(XL(12 + bdx), 30 - bl, 4, 2, P.boot);

    // gövde zırhı
    g.rect(X(12), 15 + b, 8, 8, P.armorMid);
    g.rect(X(12), 15 + b, 1, 8, P.armorDark);
    g.rect(X(15), 16 + b, 3, 3, P.armorLight);
    g.set(X(16), 16 + b, P.armorShine);
    g.rect(X(13), 20 + b, 6, 1, P.armorDark);
    // kemer + toka
    g.rect(X(12), 22 + b, 8, 1, P.goldDark);
    g.set(X(17), 22 + b, P.goldLight);
    // etek
    g.rect(X(12), 23 + b, 8, 2, P.capeDark);
    g.set(X(14), 24 + b, P.capeMid);
    g.set(X(17), 24 + b, P.capeMid);

    // ön bacak
    const [fdx, fl] = p.front;
    g.line(XL(16), 24 + b, XL(16 + fdx), 29 - fl, P.armorMid, 2);
    g.set(XL(17 + fdx), 27 - fl, P.armorLight);
    g.rect(XL(16 + fdx), 30 - fl, 4, 2, P.boot);
    g.set(XL(19 + fdx), 30 - fl, P.armorDark);

    // miğfer
    g.rect(X(13), 5 + b, 7, 1, P.armorMid);
    g.rect(X(12), 6 + b, 9, 8, P.armorMid);
    g.rect(X(13), 14 + b, 7, 1, P.armorDark);
    g.rect(X(12), 6 + b, 1, 8, P.armorDark);
    g.rect(X(14), 6 + b, 5, 1, P.armorLight);
    g.rect(X(16), 5 + b, 1, 5, P.armorLight); // orta sırt
    g.set(X(14), 7 + b, P.armorShine);
    g.set(X(15), 7 + b, P.armorShine);
    g.rect(X(13), 12 + b, 7, 1, P.armorDark);
    // vizör yarığı + parlayan göz
    g.rect(X(16), 9 + b, 5, 1, P.outline);
    g.rect(X(17), 10 + b, 4, 1, P.outline);
    g.set(X(19), 9 + b, P.eye);
    g.set(X(18), 9 + b, P.goldMid);
    // sorguç (tüy)
    const pl = p.plume || 0;
    g.line(X(15), 4 + b, X(13), 2 + b, P.capeLight, 2);
    g.line(X(13), 2 + b, X(9), 3 + b + pl, P.capeMid, 2);
    g.line(X(9), 3 + b + pl, X(6), 6 + b + pl, P.capeDark, 1);

    // kol + kılıç
    const s = 16 + b; // omuz yüksekliği
    switch (p.arm) {
      case 'rest':
        g.line(X(19), s + 1, X(21), s + 4, P.armorMid, 2);
        drawSword(g, X(21), s + 5, 0.55, 0.85, 9);
        break;
      case 'runA':
        g.line(X(19), s + 1, X(22), s + 3, P.armorMid, 2);
        drawSword(g, X(22), s + 4, 0.9, 0.45, 9);
        break;
      case 'runB':
        g.line(X(19), s + 1, X(20), s + 4, P.armorMid, 2);
        drawSword(g, X(20), s + 5, 0.6, 0.8, 9);
        break;
      case 'air':
        g.line(X(19), s, X(22), s + 2, P.armorMid, 2);
        drawSword(g, X(22), s + 3, 0.8, 0.6, 9);
        break;
      case 'raise':
        g.line(X(18), s, X(15), s - 5, P.armorMid, 2);
        drawSword(g, X(15), s - 6, -0.5, -0.87, 9);
        break;
      case 'swing':
        g.line(X(19), s, X(24), s, P.armorMid, 2);
        drawSword(g, X(25), s, 1, 0, 9);
        break;
      case 'follow':
        g.line(X(19), s + 1, X(23), s + 3, P.armorMid, 2);
        drawSword(g, X(24), s + 3, 0.85, 0.5, 9);
        break;
    }

    // ön omuzluk
    g.rect(X(17), 14 + b, 5, 3, P.armorLight);
    g.rect(X(18), 14 + b, 3, 1, P.armorShine);
    g.rect(X(17), 16 + b, 5, 1, P.armorMid);

    // kalkan
    if (p.arm === 'shield') {
      const sx = X(20), sy = 12 + b;
      g.rect(sx, sy, 6, 11, P.armorMid);
      g.rect(sx + 1, sy + 11, 4, 1, P.armorMid);
      g.rect(sx + 2, sy + 12, 2, 1, P.armorMid);
      // altın kenar
      g.rect(sx, sy, 6, 1, P.goldMid);
      g.rect(sx + 5, sy, 1, 11, P.goldDark);
      g.rect(sx, sy, 1, 11, P.goldLight);
      // amblem
      g.rect(sx + 2, sy + 3, 2, 5, P.goldLight);
      g.rect(sx + 1, sy + 4, 4, 1, P.goldLight);
      g.set(sx + 2, sy + 3, P.goldShine);
      g.set(sx + 3, sy + 2, P.armorShine);
    }

    g.outline(P.outline);
    return g;
  }

  const stand = { back: [-1, 0], front: [1, 0] };
  const capeIdle = { len: 12, spread: 3, sway: 0 };

  const POSES = {
    idle0: { ...stand, b: 0, cape: capeIdle, arm: 'rest', plume: 0 },
    idle1: { ...stand, b: 1, cape: { ...capeIdle, sway: 1 }, arm: 'rest', plume: 1 },
    idle2: { ...stand, b: 1, cape: { ...capeIdle, sway: 1 }, arm: 'rest', plume: 1 },
    idle3: { ...stand, b: 0, cape: capeIdle, arm: 'rest', plume: 0 },

    run0: { back: [-3, 0], front: [3, 0], b: 1, cape: { len: 11, spread: 5, sway: 2 }, arm: 'runA', plume: 1 },
    run1: { back: [-1, 2], front: [1, 0], b: 0, cape: { len: 11, spread: 6, sway: 3 }, arm: 'runB', plume: 2 },
    run2: { back: [3, 0], front: [-3, 0], b: 1, cape: { len: 11, spread: 5, sway: 2 }, arm: 'runA', plume: 1 },
    run3: { back: [0, 0], front: [0, 2], b: 0, cape: { len: 11, spread: 6, sway: 3 }, arm: 'runB', plume: 2 },

    jump: { back: [-2, 2], front: [2, 3], b: 0, cape: { len: 10, spread: 4, sway: 1, up: 0.1 }, arm: 'air', plume: 2 },
    fall: { back: [-2, 0], front: [2, 1], b: 0, cape: { len: 12, spread: 3, sway: 0, up: 0.45 }, arm: 'air', plume: -2 },

    atk0: { back: [-3, 0], front: [3, 0], b: 1, cape: { len: 12, spread: 4, sway: 1 }, arm: 'raise', plume: 1 },
    atk1: { back: [-4, 0], front: [4, 0], b: 1, lean: 1, cape: { len: 12, spread: 6, sway: 3 }, arm: 'swing', plume: 2 },
    atk2: { back: [-3, 0], front: [3, 0], b: 1, lean: 1, cape: { len: 12, spread: 5, sway: 2 }, arm: 'follow', plume: 1 },

    shield: { back: [-3, 0], front: [2, 0], b: 1, cape: { len: 12, spread: 3, sway: 0 }, arm: 'shield', plume: 0 },

    dash: { back: [-5, 2], front: [2, 3], b: 1, lean: 2, cape: { horizontal: true, len: 13 }, arm: 'dash', plume: 3 },

    hurt: { back: [-3, 2], front: [3, 1], b: 0, lean: -2, cape: { len: 10, spread: 5, sway: 3, up: 0.3 }, arm: 'raise', plume: 3 },
  };

  AK.buildWarriorTextures = function (scene) {
    const frames = Object.keys(POSES).map((name) => ({ name, grid: drawWarrior(POSES[name]) }));
    AK.addFrames(scene, 'warrior', FW, FH, frames);

    const f = (names) => names.map((n) => ({ key: 'warrior', frame: n }));
    scene.anims.create({ key: 'w-idle', frames: f(['idle0', 'idle1', 'idle2', 'idle3']), frameRate: 4, repeat: -1 });
    scene.anims.create({ key: 'w-run', frames: f(['run0', 'run1', 'run2', 'run3']), frameRate: 11, repeat: -1 });
    scene.anims.create({ key: 'w-jump', frames: f(['jump']), frameRate: 1 });
    scene.anims.create({ key: 'w-fall', frames: f(['fall']), frameRate: 1 });
    scene.anims.create({ key: 'w-attack', frames: f(['atk0', 'atk1', 'atk2', 'atk2']), frameRate: 16 });
    scene.anims.create({ key: 'w-shield', frames: f(['shield']), frameRate: 1 });
    scene.anims.create({ key: 'w-dash', frames: f(['dash']), frameRate: 1 });
    scene.anims.create({ key: 'w-hurt', frames: f(['hurt']), frameRate: 1 });
  };

  AK.WARRIOR_FRAME = { w: FW, h: FH };
})();
