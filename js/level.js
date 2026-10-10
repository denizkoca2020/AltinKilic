// İlk bölüm: "Unutulmuş Mağara" - deneme / antrenman alanı.
// Harita dikdörtgenlerle tanımlanır; karo görünümleri komşulara göre otomatik seçilir.
(function () {
  const AK = (window.AK = window.AK || {});

  const W = 110;
  const H = 22;

  // [x0, y0, x1, y1] (dahil) katı bloklar
  const SOLIDS = [
    [0, 0, W - 1, 1], // tavan
    [0, 0, 1, H - 1], // sol duvar
    [W - 2, 0, W - 1, H - 1], // sağ duvar
    [0, 19, 41, H - 1], // zemin (çukura kadar)
    [46, 19, W - 1, H - 1], // zemin (çukurdan sonra)
    [8, 16, 12, 16], // platformlar
    [14, 13, 18, 13],
    [21, 10, 25, 10],
    [28, 17, 34, 18], // basamak
    [37, 15, 40, 15],
    [50, 16, 55, 16],
    [58, 13, 61, 13],
    [64, 10, 71, 10],
    [75, 2, 77, 12], // tavandan inen kaya sütunu
    [85, 16, W - 1, 18], // yükseltilmiş zemin
    [90, 12, 94, 12],
    [98, 9, 102, 9],
    [30, 2, 33, 4], // sarkıt kayalar
    [60, 2, 61, 5],
    [44, 2, 47, 3],
  ];

  // Dünya nesneleri (karo koordinatları)
  const OBJECTS = {
    player: { x: 5, y: 18 },
    dummies: [
      { x: 52, y: 18 },
      { x: 68, y: 9 },
      { x: 97, y: 15 },
    ],
    lanterns: [
      { x: 12, y: 2, len: 3 },
      { x: 23, y: 2, len: 5 },
      { x: 39, y: 2, len: 6 },
      { x: 55, y: 2, len: 4 },
      { x: 68, y: 2, len: 3 },
      { x: 82, y: 2, len: 5 },
      { x: 96, y: 2, len: 3 },
    ],
    beams: [16, 47, 80, 100],
  };

  function buildGrid() {
    const grid = [];
    for (let y = 0; y < H; y++) grid.push(new Array(W).fill(0));
    for (const [x0, y0, x1, y1] of SOLIDS)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 1;
    return grid;
  }

  // Phaser tilemap'i için karo indeksleri (-1 = boş)
  function tileIndices(grid) {
    const solid = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 1 : grid[y][x]);
    const out = [];
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) {
        if (!grid[y][x]) { row.push(-1); continue; }
        const v = (x * 7 + y * 13) % AK.TILE_VARIANTS;
        let mask = 0;
        if (!solid(x, y - 1)) mask |= 1;
        if (!solid(x + 1, y)) mask |= 2;
        if (!solid(x, y + 1)) mask |= 4;
        if (!solid(x - 1, y)) mask |= 8;
        let deep = mask === 0;
        if (deep)
          for (let dy = -1; dy <= 1 && deep; dy++)
            for (let dx = -1; dx <= 1; dx++) if (!solid(x + dx, y + dy)) { deep = false; break; }
        row.push(deep ? AK.TILE_DEEP_BASE + v : mask * AK.TILE_VARIANTS + v);
      }
      out.push(row);
    }
    return out;
  }

  AK.LEVEL = {
    W,
    H,
    OBJECTS,
    build() {
      const grid = buildGrid();
      return { grid, tiles: tileIndices(grid) };
    },
  };
})();
