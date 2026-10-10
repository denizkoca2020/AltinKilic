// Piksel sanat çizim yardımcıları.
// Grafikler resim dosyası yerine kodla, piksel piksel bir ızgaraya çizilir,
// ardından canvas'a aktarılıp Phaser dokusu (texture) olarak kaydedilir.
(function () {
  const AK = (window.AK = window.AK || {});

  // Ortak renk paleti (Hollow Knight esintili: koyu mavi mağara + altın vurgular)
  AK.PAL = {
    outline: '#0b0a12',

    armorDark: '#2c3550',
    armorMid: '#4a5878',
    armorLight: '#7d8dad',
    armorShine: '#c3cde0',

    capeDark: '#3f1424',
    capeMid: '#6e2135',
    capeLight: '#9c3247',

    goldDark: '#7a4a14',
    goldMid: '#c88a22',
    goldLight: '#f2c75a',
    goldShine: '#fff2b0',

    boot: '#1d2135',
    eye: '#ffe680',

    stoneDeep: '#121827',
    stoneDark: '#1b2338',
    stoneMid: '#28334d',
    stoneLight: '#3d4b6b',
    stoneRim: '#5b6d92',
    moss: '#3f6b5c',
    mossLight: '#6fa58a',

    wood: '#5a3a24',
    woodDark: '#3a2416',
    straw: '#c9a24e',
    strawDark: '#8e6c2c',
    sack: '#b59a72',
    sackDark: '#7d6649',
  };

  // Basit, tekrarlanabilir rastgele sayı üreteci (her açılışta aynı desen)
  AK.rng = function (seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  };

  class PixelGrid {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.px = new Array(w * h).fill(null);
    }
    set(x, y, c) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.px[y * this.w + x] = c;
    }
    get(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
      return this.px[y * this.w + x];
    }
    rect(x, y, w, h, c) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    }
    // Kalınlığı olan piksel çizgi (Bresenham)
    line(x0, y0, x1, y1, c, t = 1) {
      x0 = Math.round(x0); y0 = Math.round(y0);
      x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.rect(x0, y0, t, t, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    // Dolu elips
    ellipse(cx, cy, rx, ry, c) {
      for (let y = -ry; y <= ry; y++)
        for (let x = -rx; x <= rx; x++)
          if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) this.set(cx + x, cy + y, c);
    }
    // Boş piksellerden dolu bir komşusu olanları kontur rengine boyar
    outline(c) {
      const add = [];
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          if (this.get(x, y)) continue;
          if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push([x, y]);
        }
      for (const [x, y] of add) this.set(x, y, c);
    }
    drawTo(ctx, ox = 0, oy = 0) {
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          const c = this.px[y * this.w + x];
          if (!c) continue;
          ctx.fillStyle = c;
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
    }
  }
  AK.PixelGrid = PixelGrid;

  AK.makeCanvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx };
  };

  // Izgara listesini yatay bir sprite şeridine çevirip adlandırılmış kareler ekler
  AK.addFrames = function (scene, key, fw, fh, frames) {
    const { canvas, ctx } = AK.makeCanvas(fw * frames.length, fh);
    frames.forEach((f, i) => f.grid.drawTo(ctx, i * fw, 0));
    const tex = scene.textures.addCanvas(key, canvas);
    frames.forEach((f, i) => tex.add(f.name, 0, i * fw, 0, fw, fh));
    return tex;
  };

  // Tek bir ızgarayı doğrudan doku yapar
  AK.addGrid = function (scene, key, grid) {
    const { canvas, ctx } = AK.makeCanvas(grid.w, grid.h);
    grid.drawTo(ctx);
    scene.textures.addCanvas(key, canvas);
  };
})();
