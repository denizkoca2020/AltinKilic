// Bölümler. Her harita dikdörtgenlerle tanımlanır; karo görünümleri komşulara göre otomatik seçilir.
// Koordinatlar karo cinsinden (1 karo = 16 piksel). Nesnelerde y = üstünde durduğu karo satırı.
(function () {
  const AK = (window.AK = window.AK || {});

  // ======================= 1. Unutulmuş Mağara =======================
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
    [37, 16, 40, 16],
    [50, 16, 55, 16],
    [58, 13, 61, 13],
    [64, 10, 71, 10],
    [75, 2, 77, 12], // tavandan inen kaya sütunu
    [85, 16, W - 1, 18], // yükseltilmiş zemin
    [90, 13, 94, 13],
    [98, 10, 102, 10],
    [30, 2, 33, 4], // sarkıt kayalar
    [60, 2, 61, 5],
    [44, 2, 47, 3],
  ];

  // Dünya nesneleri (karo koordinatları)
  const OBJECTS = {
    player: { x: 7, y: 18 },
    // dinlenme bankları (y = durduğu karo satırı)
    benches: [
      { x: 4, y: 18 },
      { x: 88, y: 15 },
    ],
    // antrenman kuklaları başlangıç bölgesinde
    dummies: [
      { x: 16, y: 18 },
      { x: 23, y: 9 },
    ],
    // düşmanlar: y = durduğu karo satırı (uçanlar için havadaki konum)
    enemies: [
      { type: 'crawler', x: 31, y: 16 },
      { type: 'crawler', x: 52, y: 15 },
      { type: 'flyer', x: 58, y: 9 },
      { type: 'husk', x: 67, y: 9 },
      { type: 'crawler', x: 80, y: 18 },
      { type: 'flyer', x: 88, y: 8 },
      { type: 'husk', x: 100, y: 15 },
      { type: 'flyer', x: 104, y: 7 },
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
    // bölüm sonundaki büyük kapı -> Altın Salon
    doors: [{ x: 105, y: 15, to: 'hall', spawn: 'fromCave' }],
    spawns: { fromHall: { x: 102, y: 15, facing: -1 } },
  };


  // ======================= 2. Altın Salon =======================
  const HALL_W = 100;
  const HALL_SOLIDS = [
    [0, 0, HALL_W - 1, 1], // tavan
    [0, 0, 1, 21], // sol duvar
    [HALL_W - 2, 0, HALL_W - 1, 21], // sağ duvar
    [0, 19, 29, 21], // giriş zemini
    [33, 19, HALL_W - 1, 21], // çukurdan sonrası (boss arenası dahil)
    [22, 16, 25, 16], // koridor platformları (her biri bir öncekinden en fazla 3 karo yüksek)
    [35, 16, 39, 16],
    [42, 13, 46, 13],
    [40, 2, 41, 6], // sarkan sütun
    [57, 14, 60, 14], // arena yan platformları
    [76, 14, 79, 14],
    [52, 2, 54, 3], // arena tavan süsleri
    [83, 2, 85, 3],
    [93, 17, 95, 18], // sunak kaidesi
  ];
  const HALL_OBJECTS = {
    player: { x: 6, y: 18 },
    spawns: { fromCave: { x: 6, y: 18, facing: 1 } },
    doors: [{ x: 3, y: 18, to: 'cave', spawn: 'fromHall' }],
    benches: [{ x: 11, y: 18 }],
    merchant: { x: 17, y: 18 },
    dummies: [],
    enemies: [
      { type: 'husk', x: 42, y: 18 }, // çukurun ötesinde: giriş (bank + tüccar) güvenli kalsın
      { type: 'crawler', x: 37, y: 15 },
      { type: 'flyer', x: 38, y: 12 },
      { type: 'husk', x: 44, y: 12 },
      { type: 'flyer', x: 48, y: 10 },
    ],
    // boss arenası: oyuncu gateL'yi geçince kapılar kapanır
    boss: { x: 82, y: 18, gateL: 50, gateR: 89, trigger: 54 },
    shrine: { x: 94, y: 16 },
    lanterns: [
      { x: 14, y: 2, len: 4 },
      { x: 30, y: 2, len: 6 },
      { x: 62, y: 2, len: 4 },
      { x: 71, y: 2, len: 4 },
      { x: 94, y: 2, len: 5 },
    ],
    banners: [8, 20, 34, 56, 66, 75, 86],
    beams: [14, 60, 82],
  };

  // ======================= Ortak harita kurulumu =======================
  function buildGrid(L) {
    const grid = [];
    for (let y = 0; y < L.H; y++) grid.push(new Array(L.W).fill(0));
    for (const [x0, y0, x1, y1] of L.SOLIDS)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 1;
    return grid;
  }

  // Phaser tilemap'i için karo indeksleri (-1 = boş)
  function tileIndices(L, grid) {
    const { W, H } = L;
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

  function makeLevel(def) {
    def.build = function () {
      const grid = buildGrid(def);
      return { grid, tiles: tileIndices(def, grid) };
    };
    return def;
  }

  AK.LEVELS = {
    cave: makeLevel({ id: 'cave', name: 'UNUTULMUŞ MAĞARA', theme: 'cave', music: 'cave', W, H, SOLIDS, OBJECTS }),
    hall: makeLevel({ id: 'hall', name: 'ALTIN SALON', theme: 'hall', music: 'cave', W: HALL_W, H: 22, SOLIDS: HALL_SOLIDS, OBJECTS: HALL_OBJECTS }),
  };
})();
