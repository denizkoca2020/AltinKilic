// Dünya grafikleri: taş zemin karoları, paralaks arka planlar, fener,
// antrenman kuklası, kılıç izi ve parçacık dokuları.
(function () {
  const AK = (window.AK = window.AK || {});
  const P = AK.PAL;

  const T = 16; // karo boyutu
  AK.TILE = T;
  AK.TILE_VARIANTS = 3;
  AK.TILE_DEEP_BASE = 16 * AK.TILE_VARIANTS; // derin iç karoların ilk indeksi

  // ---------- Bölüm temaları ----------
  AK.THEMES = {
    cave: {
      tile: { deep: P.stoneDeep, dark: P.stoneDark, mid: P.stoneMid, light: P.stoneLight, rim: P.stoneRim, moss: P.moss, mossLight: P.mossLight },
      bg: {
        sky: ['#070b16', '#142039', '#0c1322'],
        spireFar: ['#17233d', '#1f2e4d'], spireNear: ['#111a2e', '#1a2640'], stalac: '#080c18',
        midCol: '#0b111f', midEdge: '#152038', midHole: '#060912', roots: '#0a0f1c',
      },
      fog: '120,150,200',
    },
    // Altın Salon: kumtaşı, altın tozu, sıcak ışık
    hall: {
      tile: { deep: '#1c130e', dark: '#2b1d14', mid: '#45301f', light: '#664830', rim: '#a8834f', moss: '#b07a22', mossLight: '#f2c75a' },
      bg: {
        sky: ['#0e0806', '#2c1a10', '#140c08'],
        spireFar: ['#2a1a12', '#3a2618'], spireNear: ['#20140d', '#30200f'], stalac: '#0c0604',
        midCol: '#150c07', midEdge: '#2c1a0e', midHole: '#5a3a14', roots: '#120a06',
      },
      fog: '220,170,110',
    },
    // Fısıltı Ormanı: yosunlu toprak, ağaçlar, yeşil ışık
    forest: {
      tile: { deep: '#0c160f', dark: '#172619', mid: '#2a3a22', light: '#3f5530', rim: '#6f8f4a', moss: '#4f8a3a', mossLight: '#9fd36a' },
      bg: {
        style: 'trees',
        sky: ['#08140f', '#1b3a2a', '#0b1a12'],
        far: '#133024', farLit: '#1c4231', near: '#0b1c13', nearLit: '#163323', leaf: '#0f2a1b', leafLit: '#1f4a30',
      },
      fog: '150,210,160',
    },
    // Gölge Şehir: gece, mor taş, ışıklı pencereler
    city: {
      tile: { deep: '#100e18', dark: '#1d1929', mid: '#2f2942', light: '#463e60', rim: '#7d72a0', moss: '#4a4560', mossLight: '#8a83a8' },
      bg: {
        style: 'city',
        sky: ['#070512', '#241a3a', '#0f0b1c'],
        far: '#1a1430', near: '#0e0a1a', edge: '#2a2244', window: '#f2c75a', windowDim: '#7a5a2a', moon: '#e8e0c8',
      },
      fog: '150,130,200',
    },
  };

  // ---------- Orman ve şehir arka plan stilleri ----------
  AK.BG_STYLES = {
    trees(scene, name, B, H) {
      // uzak: degrade + ince uzun gövdeler, tepelerinde yaprak bulutları
      {
        const W = 480;
        const { canvas, ctx } = AK.makeCanvas(W, H);
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        B.sky.forEach((c, i) => grd.addColorStop(i / 2, c));
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
        const r = AK.rng(311);
        const blob = (cx, cy, rx, ry, col) => {
          ctx.fillStyle = col;
          for (let y = -ry; y <= ry; y++) {
            const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
            ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
          }
        };
        for (let i = 0; i < 16; i++) {
          const x = Math.floor(r() * W), w = 4 + Math.floor(r() * 6), top = 20 + Math.floor(r() * 70);
          wrapFill(ctx, W, (o) => {
            ctx.fillStyle = B.far;
            ctx.fillRect(x + o, top, w, H - top);
            ctx.fillStyle = B.farLit;
            ctx.fillRect(x + o, top, 1, H - top);
            for (let k = 0; k < 3; k++) blob(x + o + w / 2 + (k - 1) * 10, top + k * 6, 16, 10, k === 1 ? B.farLit : B.far);
          });
        }
        scene.textures.addCanvas('bg-far-' + name, canvas);
      }
      // orta: kalın gövdeler, kökler, sarmaşıklar, çalılar
      {
        const W = 640;
        const { canvas, ctx } = AK.makeCanvas(W, H);
        const r = AK.rng(911);
        for (let i = 0; i < 6; i++) {
          const x = Math.floor(r() * W), w = 14 + Math.floor(r() * 16);
          wrapFill(ctx, W, (o) => {
            ctx.fillStyle = B.near;
            ctx.fillRect(x + o, 0, w, H);
            // kökler
            for (let k = 0; k < 10; k++) ctx.fillRect(x + o - k, H - 10 + Math.floor(k / 2), w + k * 2, 1);
            ctx.fillStyle = B.nearLit;
            ctx.fillRect(x + o + w - 2, 0, 2, H);
            for (let y = 10; y < H; y += 23) ctx.fillRect(x + o + 3, y, w - 8, 1); // kabuk çizgisi
          });
        }
        // sarkan sarmaşıklar
        ctx.fillStyle = B.leaf;
        for (let i = 0; i < 22; i++) {
          const x = Math.floor(r() * W), len = 20 + Math.floor(r() * 80);
          wrapFill(ctx, W, (o) => {
            for (let y = 0; y < len; y++) ctx.fillRect(x + o + Math.round(Math.sin(y / 7) * 2), y, 2, 1);
          });
        }
        // yaprak tavanı
        for (let x = 0; x < W; x++) {
          const h = 12 + Math.round(Math.sin(x / 13) * 5 + Math.sin(x / 5) * 2);
          ctx.fillStyle = B.leaf;
          ctx.fillRect(x, 0, 1, h);
          ctx.fillStyle = B.leafLit;
          ctx.fillRect(x, h, 1, 1);
        }
        // çalılar
        ctx.fillStyle = B.near;
        for (let x = 0; x < W; x++) {
          const h = 22 + Math.round(Math.sin(x / 9) * 6 + Math.sin(x / 23) * 6);
          ctx.fillRect(x, H - h, 1, h);
        }
        scene.textures.addCanvas('bg-mid-' + name, canvas);
      }
    },

    city(scene, name, B, H) {
      // uzak: gece göğü, ay, yıldızlar, uzak bina siluetleri
      {
        const W = 480;
        const { canvas, ctx } = AK.makeCanvas(W, H);
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        B.sky.forEach((c, i) => grd.addColorStop(i / 2, c));
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
        const r = AK.rng(777);
        for (let i = 0; i < 50; i++) {
          ctx.fillStyle = r() < 0.3 ? '#ffffff' : '#8a83a8';
          ctx.fillRect(Math.floor(r() * W), Math.floor(r() * H * 0.5), 1, 1);
        }
        // ay
        ctx.fillStyle = B.moon;
        for (let y = -12; y <= 12; y++) {
          const w = Math.round(Math.sqrt(144 - y * y));
          ctx.fillRect(360 - w, 46 + y, w * 2, 1);
        }
        ctx.fillStyle = '#c8bfa4';
        ctx.fillRect(354, 42, 4, 3);
        ctx.fillRect(364, 52, 3, 3);
        let x = 0;
        while (x < W) {
          const w = 18 + Math.floor(r() * 30), h = 60 + Math.floor(r() * 110);
          ctx.fillStyle = B.far;
          ctx.fillRect(x, H - h, w, h);
          if (r() < 0.4) ctx.fillRect(x + Math.floor(w / 2) - 1, H - h - 10, 2, 10); // anten / kule
          for (let wy = H - h + 6; wy < H - 10; wy += 9)
            for (let wx = x + 3; wx < x + w - 3; wx += 6)
              if (r() < 0.18) { ctx.fillStyle = r() < 0.5 ? B.window : B.windowDim; ctx.fillRect(wx, wy, 2, 3); }
          x += w + Math.floor(r() * 6);
        }
        scene.textures.addCanvas('bg-far-' + name, canvas);
      }
      // orta: yakın binalar, çatılar, bacalar, ışıklı pencereler
      {
        const W = 640;
        const { canvas, ctx } = AK.makeCanvas(W, H);
        const r = AK.rng(4242);
        let x = 0;
        while (x < W - 30) {
          const w = 40 + Math.floor(r() * 40), h = 90 + Math.floor(r() * 100), top = H - h;
          ctx.fillStyle = B.near;
          ctx.fillRect(x, top, w, h);
          // üçgen çatı
          for (let i = 0; i < 14; i++) ctx.fillRect(x + i, top - 14 + i, w - i * 2, 1);
          ctx.fillStyle = B.edge;
          for (let i = 0; i < 14; i++) ctx.fillRect(x + i, top - 14 + i, 1, 1);
          ctx.fillRect(x + w - 2, top, 2, h);
          // baca
          ctx.fillStyle = B.near;
          ctx.fillRect(x + w - 14, top - 22, 6, 14);
          // pencereler
          for (let wy = top + 10; wy < H - 20; wy += 18)
            for (let wx = x + 6; wx < x + w - 10; wx += 14) {
              const lit = r() < 0.3;
              ctx.fillStyle = lit ? B.window : '#16112a';
              ctx.fillRect(wx, wy, 6, 8);
              if (lit) { ctx.fillStyle = B.windowDim; ctx.fillRect(wx, wy + 4, 6, 1); ctx.fillRect(wx + 3, wy, 1, 8); }
            }
          x += w + 10 + Math.floor(r() * 30);
        }
        scene.textures.addCanvas('bg-mid-' + name, canvas);
      }
    },
  };

  // ---------- Zemin karoları ----------
  // Maske bitleri: 1=üst boş, 2=sağ boş, 4=alt boş, 8=sol boş
  function drawTile(mask, variant, deep, S) {
    const g = new AK.PixelGrid(T, T);
    const r = AK.rng(1000 + mask * 7 + variant * 131 + (deep ? 977 : 0));

    if (deep) {
      g.rect(0, 0, T, T, S.deep);
      for (let i = 0; i < 6; i++) g.set(Math.floor(r() * T), Math.floor(r() * T), S.dark);
      return g;
    }

    // derz rengi
    g.rect(0, 0, T, T, S.deep);
    // iki sıra kaba taş blok
    const rows = [[0, 8], [8, 8]];
    rows.forEach(([y0, h], ri) => {
      let x = ri % 2 === 0 ? -Math.floor(r() * 4) : -4 - Math.floor(r() * 3);
      while (x < T) {
        const w = 6 + Math.floor(r() * 4);
        const tone = r() < 0.3 ? S.dark : S.mid;
        g.rect(x + 1, y0 + 1, w - 1, h - 1, tone);
        g.rect(x + 1, y0 + 1, w - 2, 1, S.light); // üst ışık
        g.rect(x + 1, y0 + 1, 1, h - 2, tone === S.mid ? S.light : S.mid);
        g.rect(x + 2, y0 + h - 1, w - 2, 1, S.dark); // alt gölge
        if (r() < 0.5) g.set(x + 2 + Math.floor(r() * (w - 3)), y0 + 3 + Math.floor(r() * 3), S.deep); // çatlak
        x += w;
      }
    });

    const up = mask & 1, right = mask & 2, down = mask & 4, left = mask & 8;
    if (up) {
      g.rect(0, 0, T, 1, S.rim);
      g.rect(0, 1, T, 1, S.light);
      // yosun
      for (let x = 0; x < T; x++) {
        if (r() < 0.55) g.set(x, 0, r() < 0.4 ? S.mossLight : S.moss);
        if (r() < 0.25) g.set(x, 1, S.moss);
        if (r() < 0.1) g.set(x, 2, S.moss);
      }
    }
    if (down) {
      g.rect(0, T - 1, T, 1, P.outline);
      g.rect(0, T - 2, T, 1, S.deep);
    }
    if (left) {
      g.rect(0, 0, 1, T, P.outline);
      g.rect(1, up ? 2 : 0, 1, T - (up ? 2 : 0), S.dark);
    }
    if (right) {
      g.rect(T - 1, 0, 1, T, P.outline);
      g.rect(T - 2, up ? 2 : 0, 1, T - (up ? 2 : 0), S.deep);
    }
    // yuvarlatılmış köşeler
    if (up && left) { g.px[0] = null; g.set(1, 0, P.outline); g.set(0, 1, P.outline); }
    if (up && right) { g.px[T - 1] = null; g.set(T - 2, 0, P.outline); g.set(T - 1, 1, P.outline); }
    if (down && left) { g.px[(T - 1) * T] = null; }
    if (down && right) { g.px[T * T - 1] = null; }
    if (up && !left && !right) {
      // üst kenarda koyu kontur çizgisi yok; yosunun üstü düz kalsın
    }
    return g;
  }

  function buildTileset(scene, key, S) {
    const count = AK.TILE_DEEP_BASE + AK.TILE_VARIANTS;
    const { canvas, ctx } = AK.makeCanvas(count * T, T);
    for (let m = 0; m < 16; m++)
      for (let v = 0; v < AK.TILE_VARIANTS; v++) drawTile(m, v, false, S).drawTo(ctx, (m * AK.TILE_VARIANTS + v) * T, 0);
    for (let v = 0; v < AK.TILE_VARIANTS; v++) drawTile(0, v, true, S).drawTo(ctx, (AK.TILE_DEEP_BASE + v) * T, 0);
    scene.textures.addCanvas(key, canvas);
  }

  // ---------- Arka planlar ----------
  // Yatayda kesintisiz tekrarlansın diye şekiller kenarlardan sarılarak çizilir.
  function wrapFill(ctx, W, drawFn) {
    drawFn(0);
    drawFn(-W);
    drawFn(W);
  }

  function spire(ctx, x, w, h, H, col, lit) {
    const top = H - h;
    ctx.fillStyle = col;
    ctx.fillRect(x, top + 6, w, h);
    // sivri / kubbe tepe
    for (let i = 0; i < 6; i++) {
      const inset = Math.round(((6 - i) * w) / 14);
      ctx.fillRect(x + inset, top + i, w - inset * 2, 1);
    }
    ctx.fillRect(Math.round(x + w / 2) - 1, top - 6, 2, 6);
    if (lit) {
      ctx.fillStyle = lit;
      ctx.fillRect(x, top + 6, 1, h);
    }
  }

  function buildBackgrounds(scene, name, B, fogRgb) {
    const H = 270;

    if (B.style) {
      AK.BG_STYLES[B.style](scene, name, B, H); // orman / şehir
    } else {
    // uzak katman: gökyüzü degradesi + uzak kuleler
    {
      const W = 480;
      const { canvas, ctx } = AK.makeCanvas(W, H);
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, B.sky[0]);
      grd.addColorStop(0.45, B.sky[1]);
      grd.addColorStop(1, B.sky[2]);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      const r = AK.rng(42);
      // en uzak sis kuleleri
      for (let i = 0; i < 14; i++) {
        const x = Math.floor(r() * W), w = 8 + Math.floor(r() * 16), h = 90 + Math.floor(r() * 120);
        wrapFill(ctx, W, (o) => spire(ctx, x + o, w, h, H, B.spireFar[0], B.spireFar[1]));
      }
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(r() * W), w = 14 + Math.floor(r() * 22), h = 60 + Math.floor(r() * 100);
        wrapFill(ctx, W, (o) => spire(ctx, x + o, w, h, H, B.spireNear[0], B.spireNear[1]));
      }
      // tavandan sarkıtlar
      ctx.fillStyle = B.stalac;
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(r() * W), w = 4 + Math.floor(r() * 10), h = 10 + Math.floor(r() * 50);
        wrapFill(ctx, W, (o) => {
          for (let y = 0; y < h; y++) {
            const ww = Math.max(1, Math.round(w * (1 - y / h)));
            ctx.fillRect(x + o + Math.round((w - ww) / 2), y, ww, 1);
          }
        });
      }
      scene.textures.addCanvas('bg-far-' + name, canvas);
    }

    // orta katman: yakın kayalar, kemerler, sütunlar
    {
      const W = 640;
      const { canvas, ctx } = AK.makeCanvas(W, H);
      const r = AK.rng(7);
      const col = B.midCol, edge = B.midEdge;
      for (let i = 0; i < 7; i++) {
        const x = Math.floor(r() * W), w = 18 + Math.floor(r() * 26), h = 120 + Math.floor(r() * 110);
        wrapFill(ctx, W, (o) => {
          ctx.fillStyle = col;
          ctx.fillRect(x + o, H - h, w, h);
          ctx.fillStyle = edge;
          ctx.fillRect(x + o + w - 2, H - h, 2, h);
          // sütun başlığı
          ctx.fillStyle = col;
          ctx.fillRect(x + o - 3, H - h, w + 6, 5);
          ctx.fillStyle = edge;
          ctx.fillRect(x + o - 3, H - h, w + 6, 1);
          // yuvarlak pencere/oyuk
          if (r() < 0.6) {
            ctx.fillStyle = B.midHole;
            const cy = H - h + 18 + Math.floor(r() * 30);
            for (let y = -4; y <= 4; y++) {
              const ww = Math.round(Math.sqrt(16 - y * y) * 1.2);
              ctx.fillRect(x + o + Math.round(w / 2) - ww, cy + y, ww * 2, 1);
            }
          }
        });
      }
      // zemin tepeleri
      ctx.fillStyle = col;
      for (let x = 0; x < W; x++) {
        const h = 26 + Math.round(Math.sin((x / W) * Math.PI * 6) * 8 + Math.sin((x / W) * Math.PI * 14) * 4);
        ctx.fillRect(x, H - h, 1, h);
      }
      // sarkan kökler
      ctx.fillStyle = B.roots;
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(r() * W), len = 20 + Math.floor(r() * 60);
        wrapFill(ctx, W, (o) => {
          for (let y = 0; y < len; y++) ctx.fillRect(x + o + Math.round(Math.sin(y / 6) * 2), y, 2, 1);
        });
      }
      scene.textures.addCanvas('bg-mid-' + name, canvas);
    }

    }

    // sis
    {
      const W = 320, Hh = 90;
      const { canvas, ctx } = AK.makeCanvas(W, Hh);
      const r = AK.rng(99);
      for (let i = 0; i < 18; i++) {
        const x = r() * W, y = 30 + r() * 50, rad = 20 + r() * 30;
        wrapFill(ctx, W, (o) => {
          const g = ctx.createRadialGradient(x + o, y, 0, x + o, y, rad);
          g.addColorStop(0, `rgba(${fogRgb},0.35)`);
          g.addColorStop(1, `rgba(${fogRgb},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x + o - rad, y - rad, rad * 2, rad * 2);
        });
      }
      scene.textures.addCanvas('fog-' + name, canvas);
    }

    // kenar karartma (vinyet)
    {
      const W = 480;
      const { canvas, ctx } = AK.makeCanvas(W, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(2,3,8,0.75)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      if (!scene.textures.exists('vignette')) scene.textures.addCanvas('vignette', canvas);
    }

    // tavandan süzülen ışık huzmesi
    {
      const W = 80, Hh = 300;
      const { canvas, ctx } = AK.makeCanvas(W, Hh);
      const g = ctx.createLinearGradient(0, 0, 0, Hh);
      g.addColorStop(0, 'rgba(200,220,255,0.55)');
      g.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(50, 0);
      ctx.lineTo(W, Hh);
      ctx.lineTo(0, Hh);
      ctx.closePath();
      ctx.fill();
      if (!scene.textures.exists('beam')) scene.textures.addCanvas('beam', canvas);
    }
  }

  // ---------- Nesneler ----------
  function buildProps(scene) {
    // fener
    {
      const g = new AK.PixelGrid(11, 20);
      g.rect(5, 0, 1, 5, '#3a3f55'); // zincir
      g.set(5, 1, '#59607a');
      g.set(5, 3, '#59607a');
      g.rect(3, 5, 5, 1, '#2b2f40'); // kapak
      g.rect(2, 6, 7, 1, '#454c66');
      g.rect(2, 7, 7, 9, '#2b2f40'); // kafes
      g.rect(3, 8, 5, 7, P.goldLight); // ışık
      g.rect(4, 9, 3, 5, P.goldShine);
      g.rect(5, 8, 1, 7, '#2b2f40'); // kafes teli
      g.rect(2, 16, 7, 1, '#454c66');
      g.rect(4, 17, 3, 1, '#2b2f40');
      g.outline(P.outline);
      AK.addGrid(scene, 'lantern', g);
    }

    // yumuşak ışık halesi (piksel değil, degrade)
    {
      const S = 128;
      const { canvas, ctx } = AK.makeCanvas(S, S);
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(255,225,140,0.7)');
      g.addColorStop(0.35, 'rgba(255,200,110,0.25)');
      g.addColorStop(1, 'rgba(255,190,100,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      scene.textures.addCanvas('glow', canvas);
    }

    // antrenman kuklası (alt-orta noktadan konumlanır)
    {
      const g = new AK.PixelGrid(22, 40);
      // direk
      g.rect(10, 18, 3, 22, P.wood);
      g.rect(10, 18, 1, 22, P.woodDark);
      g.rect(7, 38, 9, 2, P.woodDark);
      // kollar (yatay kiriş)
      g.rect(1, 17, 20, 2, P.wood);
      g.rect(1, 18, 20, 1, P.woodDark);
      // saman gövde
      g.ellipse(11, 22, 6, 8, P.straw);
      for (let y = 15; y < 30; y += 2) g.set(8 + ((y * 3) % 6), y, P.strawDark);
      g.rect(5, 19, 13, 1, P.sackDark); // ip
      g.rect(5, 25, 13, 1, P.sackDark);
      // çuval kafa
      g.ellipse(11, 8, 5, 6, P.sack);
      g.rect(7, 13, 9, 1, P.sackDark);
      g.rect(6, 4, 3, 3, P.sackDark);
      // dikişli X gözler
      g.set(8, 7, P.outline); g.set(10, 9, P.outline); g.set(10, 7, P.outline); g.set(8, 9, P.outline); g.set(9, 8, P.outline);
      g.set(13, 7, P.outline); g.set(15, 9, P.outline); g.set(15, 7, P.outline); g.set(13, 9, P.outline); g.set(14, 8, P.outline);
      // saman uçları
      g.set(11, 1, P.straw); g.set(9, 2, P.straw); g.set(13, 2, P.strawDark);
      g.set(3, 16, P.straw); g.set(19, 16, P.straw);
      g.outline(P.outline);
      AK.addGrid(scene, 'dummy', g);
    }

    // dinlenme bankı (alt-orta noktadan konumlanır)
    {
      const g = new AK.PixelGrid(36, 18);
      // sırt dayanağı
      g.rect(3, 1, 30, 3, P.wood);
      g.rect(3, 1, 30, 1, '#7a5236');
      g.rect(3, 3, 30, 1, P.woodDark);
      // altın süsler
      [8, 17, 26].forEach((x) => { g.rect(x, 0, 3, 5, P.goldMid); g.set(x + 1, 1, P.goldShine); g.set(x + 1, 3, P.goldLight); });
      // sırt bağlantıları
      g.rect(5, 4, 2, 4, P.woodDark);
      g.rect(29, 4, 2, 4, P.woodDark);
      // oturak
      g.rect(1, 8, 34, 3, P.wood);
      g.rect(1, 8, 34, 1, '#7a5236');
      g.rect(1, 10, 34, 1, P.woodDark);
      g.rect(0, 8, 1, 2, P.goldMid);
      g.rect(35, 8, 1, 2, P.goldMid);
      // taş ayaklar
      [[3, 11], [28, 11]].forEach(([x, y]) => {
        g.rect(x, y, 5, 7, P.stoneMid);
        g.rect(x, y, 5, 1, P.stoneRim);
        g.rect(x, y, 1, 7, P.stoneLight);
        g.rect(x + 4, y + 1, 1, 6, P.stoneDark);
      });
      g.outline(P.outline);
      AK.addGrid(scene, 'bench', g);
    }

    // büyük taş kapı (kemerli, içi karanlık, altın işlemeli) 40x56
    {
      const g = new AK.PixelGrid(40, 56);
      const st = P.stoneMid, stL = P.stoneLight, stD = P.stoneDark;
      // sütunlar
      g.rect(0, 12, 7, 44, st);
      g.rect(33, 12, 7, 44, st);
      g.rect(0, 12, 1, 44, stL);
      g.rect(33, 12, 1, 44, stL);
      g.rect(6, 12, 1, 44, stD);
      g.rect(39, 12, 1, 44, stD);
      for (let y = 18; y < 56; y += 8) { g.rect(0, y, 7, 1, stD); g.rect(33, y, 7, 1, stD); }
      // kemer
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 40; x++) {
          const d = Math.hypot((x - 19.5) / 20, (y - 16) / 16);
          if (d <= 1 && d > 0.62) g.set(x, y, d > 0.92 ? stL : st);
        }
      // karanlık iç (hafif altın parıltılı)
      for (let y = 4; y < 56; y++)
        for (let x = 7; x < 33; x++) {
          const inArch = y >= 16 || Math.hypot((x - 19.5) / 13, (y - 16) / 12) <= 1;
          if (inArch) g.set(x, y, y > 44 ? '#120c0a' : '#07060b');
        }
      // kilit taşı + altın işleme
      g.rect(17, 0, 6, 5, P.goldMid);
      g.rect(18, 1, 4, 3, P.goldLight);
      g.set(19, 2, P.goldShine);
      g.rect(2, 26, 3, 3, P.goldMid);
      g.rect(35, 26, 3, 3, P.goldMid);
      g.outline(P.outline);
      AK.addGrid(scene, 'door', g);
    }

    // demir parmaklık (boss arenası kapısı) 16x64
    {
      const g = new AK.PixelGrid(16, 64);
      for (let x = 1; x < 16; x += 4) {
        g.rect(x, 0, 2, 60, '#4a4f60');
        g.rect(x, 0, 1, 60, '#7a8096');
        g.rect(x, 60, 2, 3, '#4a4f60');
        g.set(x, 63, '#7a8096');
      }
      for (let y = 6; y < 60; y += 14) { g.rect(0, y, 16, 2, '#3a3e4c'); g.rect(0, y, 16, 1, '#6a7086'); }
      g.outline(P.outline);
      AK.addGrid(scene, 'gate', g);
    }

    // kraliyet sancağı (Altın Salon süsü) 14x34
    {
      const g = new AK.PixelGrid(14, 34);
      g.rect(0, 0, 14, 2, P.goldMid);
      g.rect(0, 0, 14, 1, P.goldLight);
      g.rect(2, 2, 10, 26, '#6e2135');
      g.rect(2, 2, 1, 26, '#9c3247');
      g.rect(11, 2, 1, 26, '#3f1424');
      // sivri alt uç
      for (let i = 0; i < 4; i++) { g.rect(2 + i, 28 + i, 5 - i, 1, '#6e2135'); g.rect(7, 28 + i, 5 - i, 1, '#6e2135'); }
      // altın kılıç amblemi
      g.rect(6, 7, 2, 13, P.goldLight);
      g.rect(4, 17, 6, 1, P.goldMid);
      g.rect(6, 19, 2, 3, P.goldDark);
      g.set(6, 7, P.goldShine);
      g.outline(P.outline);
      AK.addGrid(scene, 'banner', g);
    }

    // parlayan orman mantarı 12x14
    {
      const g = new AK.PixelGrid(12, 14);
      g.rect(5, 7, 2, 7, '#cfe8d8');
      g.ellipse(6, 5, 5, 3, '#3fc9b8');
      g.rect(1, 6, 10, 1, '#1f8a80');
      g.set(4, 3, '#b8fff4');
      g.set(7, 4, '#b8fff4');
      g.outline(P.outline);
      AK.addGrid(scene, 'shroom', g);
    }

    // sokak lambası 10x44
    {
      const g = new AK.PixelGrid(10, 44);
      g.rect(4, 8, 2, 34, '#2a2638');
      g.rect(4, 8, 1, 34, '#4a4560');
      g.rect(2, 42, 6, 2, '#2a2638');
      g.rect(1, 1, 8, 2, '#2a2638');
      g.rect(2, 3, 6, 5, P.goldLight);
      g.rect(3, 4, 4, 3, P.goldShine);
      g.rect(4, 0, 2, 1, '#2a2638');
      g.outline(P.outline);
      AK.addGrid(scene, 'streetlamp', g);
    }

    // tahta tabela 18x20
    {
      const g = new AK.PixelGrid(18, 20);
      g.rect(8, 8, 2, 12, P.woodDark);
      g.rect(1, 1, 16, 9, P.wood);
      g.rect(1, 1, 16, 1, '#7a5236');
      g.rect(3, 4, 9, 1, P.woodDark);
      g.rect(3, 6, 12, 1, P.woodDark);
      g.outline(P.outline);
      AK.addGrid(scene, 'sign', g);
    }

    // yağmur damlası
    {
      const g = new AK.PixelGrid(1, 6);
      g.rect(0, 0, 1, 6, '#9aa8d8');
      AK.addGrid(scene, 'rain', g);
    }

    // etkileşim oku (bank / kapı / tüccar üstünde süzülür)
    {
      const g = new AK.PixelGrid(7, 6);
      g.rect(0, 0, 7, 2, P.goldLight);
      g.rect(1, 2, 5, 2, P.goldLight);
      g.rect(2, 4, 3, 1, P.goldMid);
      g.set(3, 5, P.goldMid);
      g.rect(1, 0, 2, 1, P.goldShine);
      g.outline(P.outline);
      AK.addGrid(scene, 'prompt', g);
    }

    // küçük çim/yosun öbekleri (zemin üstü süs)
    {
      const frames = [];
      for (let v = 0; v < 4; v++) {
        const g = new AK.PixelGrid(16, 8);
        const r = AK.rng(500 + v);
        for (let i = 0; i < 7; i++) {
          const x = 1 + Math.floor(r() * 14), h = 2 + Math.floor(r() * 5);
          for (let y = 0; y < h; y++) g.set(x + (y > 2 && r() < 0.5 ? 1 : 0), 7 - y, y > h - 2 ? P.mossLight : P.moss);
        }
        frames.push({ name: 'g' + v, grid: g });
      }
      AK.addFrames(scene, 'grass', 16, 8, frames);
    }
  }

  // ---------- Efektler ----------
  function buildEffects(scene) {
    // Hilal şeklinde kılıç izi (3 kare: açılış, tam, sönüş)
    {
      const W = 38, H = 58, cx = 2, cy = 29;
      const frames = [];
      const specs = [
        { a0: -20, a1: 80, thick: 9, fade: 0 },
        { a0: -80, a1: 80, thick: 13, fade: 0 },
        { a0: -80, a1: 45, thick: 10, fade: 0 },
        { a0: -80, a1: 0, thick: 6, fade: 1 },
      ];
      specs.forEach((sp, fi) => {
        const g = new AK.PixelGrid(W, H);
        const rOut = 27;
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const dx = x - cx, dy = y - cy;
            const d = Math.hypot(dx, dy);
            const a = (Math.atan2(dy, dx) * 180) / Math.PI;
            if (a < sp.a0 || a > sp.a1) continue;
            // uçlara doğru incelen kalınlık
            const tnorm = 1 - Math.abs((a - (sp.a0 + sp.a1) / 2) / ((sp.a1 - sp.a0) / 2));
            const th = Math.max(1.5, sp.thick * Math.pow(tnorm, 0.5));
            const inner = rOut - th;
            if (d > rOut || d < inner) continue;
            const k = (d - inner) / th;
            let col = k > 0.55 ? '#ffffff' : k > 0.25 ? P.goldShine : P.goldLight;
            if (sp.fade && (x + y) % 2 === 0) continue;
            g.set(x, y, col);
          }
        frames.push({ name: 's' + fi, grid: g });
      });
      AK.addFrames(scene, 'slash', W, H, frames);
      scene.anims.create({
        key: 'slash',
        frames: [0, 1, 2, 3].map((i) => ({ key: 'slash', frame: 's' + i })),
        frameRate: 20,
      });
    }

    // parçacıklar
    {
      const spark = new AK.PixelGrid(3, 3);
      spark.rect(1, 0, 1, 3, '#ffffff');
      spark.rect(0, 1, 3, 1, '#ffffff');
      AK.addGrid(scene, 'spark', spark);

      const dot = new AK.PixelGrid(2, 2);
      dot.rect(0, 0, 2, 2, '#ffffff');
      AK.addGrid(scene, 'dot', dot);

      const dust = new AK.PixelGrid(4, 4);
      dust.rect(1, 0, 2, 4, '#9aa7c4');
      dust.rect(0, 1, 4, 2, '#9aa7c4');
      AK.addGrid(scene, 'dust', dust);

      const straw = new AK.PixelGrid(3, 1);
      straw.rect(0, 0, 3, 1, P.straw);
      AK.addGrid(scene, 'strawbit', straw);
    }

    // HUD: altın miğfer simgesi (can) - dolu ve boş
    {
      const mk = (full) => {
        const g = new AK.PixelGrid(11, 12);
        const a = full ? P.goldLight : '#2a3048';
        const b = full ? P.goldMid : '#1c2134';
        const c = full ? P.goldShine : '#353d5a';
        g.rect(2, 1, 7, 1, a);
        g.rect(1, 2, 9, 7, a);
        g.rect(1, 2, 1, 7, b);
        g.rect(2, 9, 7, 1, b);
        g.rect(3, 10, 5, 1, b);
        g.rect(5, 1, 1, 4, c);
        g.rect(5, 5, 4, 1, P.outline); // vizör
        g.rect(6, 6, 3, 1, P.outline);
        if (full) g.set(8, 5, '#ffffff');
        g.outline(P.outline);
        return g;
      };
      AK.addFrames(scene, 'hp', 11, 12, [
        { name: 'full', grid: mk(true) },
        { name: 'empty', grid: mk(false) },
      ]);
    }
  }

  AK.buildWorldTextures = function (scene) {
    for (const [name, th] of Object.entries(AK.THEMES)) {
      buildTileset(scene, 'tiles-' + name, th.tile);
      buildBackgrounds(scene, name, th.bg, th.fog);
    }
    buildProps(scene);
    buildEffects(scene);
  };
})();
