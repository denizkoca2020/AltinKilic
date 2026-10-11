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
    [90, 17, 92, 18], // sunak kaidesi
  ];
  const HALL_OBJECTS = {
    player: { x: 6, y: 18 },
    spawns: { fromCave: { x: 6, y: 18, facing: 1 }, fromForest: { x: 94, y: 18, facing: -1 } },
    doors: [
      { x: 3, y: 18, to: 'cave', spawn: 'fromHall' },
      { x: 96, y: 18, to: 'forest', spawn: 'fromHall' }, // boss yenilince parmaklık kalkar ve bu kapıya ulaşılır
    ],
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
    shrine: { x: 91, y: 16 },
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


  // ======================= 3. Fısıltı Ormanı =======================
  // Açık hava: tavan yok. Engebeli toprak, ağaç dalları (platformlar), iki çukur.
  const FOREST_W = 120;
  const FOREST_SOLIDS = [
    [0, 0, 1, 21], // sol uçurum duvarı
    [FOREST_W - 2, 0, FOREST_W - 1, 21], // sağ uçurum duvarı
    [0, 19, 22, 21], // zemin
    [23, 18, 40, 21], // hafif yükselti
    [44, 19, 60, 21], // 1. çukurdan sonra
    [61, 17, 75, 21], // tepe
    [76, 19, 86, 21],
    [90, 18, FOREST_W - 1, 21], // 2. çukurdan sonra
    [10, 16, 14, 16], // dallar
    [16, 13, 19, 13],
    [28, 15, 32, 15],
    [48, 16, 52, 16],
    [55, 13, 58, 13],
    [66, 14, 70, 14],
    [79, 16, 82, 16],
    [94, 15, 98, 15],
    [101, 12, 104, 12],
    [108, 15, 112, 15],
  ];
  const FOREST_OBJECTS = {
    player: { x: 5, y: 18 },
    spawns: { fromHall: { x: 5, y: 18, facing: 1 }, fromCity: { x: 113, y: 17, facing: -1 } },
    doors: [
      { x: 3, y: 18, to: 'hall', spawn: 'fromForest' },
      { x: 116, y: 17, to: 'city', spawn: 'fromForest' },
    ],
    benches: [{ x: 8, y: 18 }, { x: 64, y: 16 }],
    enemies: [
      { type: 'mushroom', x: 26, y: 17 },
      { type: 'wasp', x: 30, y: 10 },
      { type: 'mushroom', x: 36, y: 17 },
      { type: 'thorn', x: 51, y: 18 },
      { type: 'mushroom', x: 57, y: 12 },
      { type: 'wasp', x: 69, y: 9 },
      { type: 'thorn', x: 73, y: 16 },
      { type: 'mushroom', x: 81, y: 18 },
      { type: 'wasp', x: 96, y: 10 },
      { type: 'thorn', x: 103, y: 11 },
      { type: 'mushroom', x: 109, y: 17 },
    ],
    beams: [12, 34, 58, 84, 106],
  };

  // ======================= 4. Gölge Şehir =======================
  // Gece ve yağmur. Sokaklar ve çatılar: binaların üstünden atlayarak ilerlenir.
  const CITY_W = 120;
  const CITY_SOLIDS = [
    [0, 0, 1, 21], // sol duvar
    [CITY_W - 2, 0, CITY_W - 1, 21], // sağ duvar
    [0, 19, 51, 21], // sokak
    [55, 19, CITY_W - 1, 21], // kanalizasyon çukurundan sonra
    [12, 16, 18, 18], // binalar (çatılarına çıkılır)
    [22, 13, 27, 18],
    [31, 16, 36, 18],
    [39, 14, 42, 14], // tente
    [45, 12, 50, 18], // yüksek bina
    [58, 16, 63, 18],
    [66, 13, 71, 18],
    [74, 10, 78, 18], // kule
    [81, 14, 85, 14], // köprü
    [88, 16, 96, 18],
    [99, 13, 103, 13], // balkon
    [106, 16, 112, 18],
  ];
  const CITY_OBJECTS = {
    player: { x: 5, y: 18 },
    spawns: { fromForest: { x: 5, y: 18, facing: 1 } },
    doors: [{ x: 3, y: 18, to: 'forest', spawn: 'fromCity' }],
    benches: [{ x: 8, y: 18 }, { x: 92, y: 15 }],
    merchant: { x: 10, y: 18 },
    enemies: [
      { type: 'rat', x: 20, y: 18 },
      { type: 'rat', x: 29, y: 18 },
      { type: 'guard', x: 34, y: 15 },
      { type: 'archer', x: 48, y: 11 },
      { type: 'rat', x: 56, y: 18 },
      { type: 'guard', x: 61, y: 15 },
      { type: 'bat', x: 70, y: 8 },
      { type: 'archer', x: 76, y: 9 },
      { type: 'guard', x: 84, y: 18 },
      { type: 'rat', x: 86, y: 18 },
      { type: 'archer', x: 101, y: 12 },
      { type: 'bat', x: 100, y: 7 },
      { type: 'guard', x: 109, y: 15 },
    ],
    signs: [{ x: 115, y: 18, text: 'ŞEHRİN KALBİ KAPALI · DEVAMI YAKINDA' }],
    weather: 'rain',
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
    forest: makeLevel({ id: 'forest', name: 'FISILTI ORMANI', theme: 'forest', music: 'forest', W: FOREST_W, H: 22, SOLIDS: FOREST_SOLIDS, OBJECTS: FOREST_OBJECTS }),
    city: makeLevel({ id: 'city', name: 'GÖLGE ŞEHİR', theme: 'city', music: 'city', W: CITY_W, H: 22, SOLIDS: CITY_SOLIDS, OBJECTS: CITY_OBJECTS }),
  };
})();
