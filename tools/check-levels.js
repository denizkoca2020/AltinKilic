// Bölüm kontrol aracı: savaşçının zıplama gücüyle her düşmana ve nesneye ulaşılabiliyor mu?
// Kullanım:  node tools/check-levels.js
//
// Basit model (karo cinsinden):
//  - "Durulabilir hücre": boş olan, altı dolu ve üstü (baş hizası) boş olan hücre.
//  - Aynı satırda yan yana durulabilir hücreler arasında yürünür.
//  - Zıplama: en fazla MAX_RISE karo yukarı, bu sırada en fazla MAX_JUMP_DX karo yana.
//  - Düşme: aşağıdaki herhangi bir yere, düşüş başına biraz daha uzağa.
//  - Çukurdan (harita dışına) düşülen yerler sayılmaz.
// Not: Gerçek zıplama ~66 piksel (4 karodan biraz fazla); güvenli sınır olarak 3 karo kullanılır.
const path = require('path');

global.window = {};
const AK = (global.AK = window.AK = { TILE_VARIANTS: 3, TILE_DEEP_BASE: 48 });
require(path.join(__dirname, '..', 'js', 'level.js'));

const MAX_RISE = 3;
const MAX_JUMP_DX = 5;
const FLYER_AGGRO_PX = 165;
const T = 16;

let failures = 0;

for (const L of Object.values(AK.LEVELS)) {
  const { grid } = L.build();
  const solid = (x, y) => (x < 0 || x >= L.W || y < 0 ? true : y >= L.H ? false : !!grid[y][x]);
  const standable = (x, y) => !solid(x, y) && !solid(x, y - 1) && solid(x, y + 1) && y + 1 < L.H;

  // başlangıç noktasından erişilebilen durulabilir hücreleri bul (BFS)
  const key = (x, y) => x + ',' + y;
  const start = L.OBJECTS.player;
  const seen = new Set([key(start.x, start.y)]);
  const queue = [[start.x, start.y]];
  const cells = [];
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (standable(x, y)) cells.push([x, y]);
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [nx, ny] of cells) {
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      const dx = Math.abs(nx - x), rise = y - ny;
      let ok = false;
      if (rise === 0 && dx === 1) ok = true; // yürüme
      else if (rise > 0 && rise <= MAX_RISE && dx <= MAX_JUMP_DX) ok = true; // zıplama
      else if (rise <= 0 && dx <= MAX_JUMP_DX + Math.floor(-rise / 2)) ok = true; // düz atlama / düşme
      if (ok) { seen.add(k); queue.push([nx, ny]); }
    }
  }
  const reach = (x, y) => seen.has(key(x, y));

  const problems = [];
  for (const e of L.OBJECTS.enemies || []) {
    if (e.type === 'flyer') {
      // uçan düşman: erişilebilir bir yerden fark edilebiliyor mu?
      const fx = e.x * T + 8, fy = e.y * T + 8;
      const near = [...seen].some((k) => {
        const [x, y] = k.split(',').map(Number);
        return Math.hypot(x * T + 8 - fx, (y + 1) * T - 14 - fy) < FLYER_AGGRO_PX;
      });
      if (!near) problems.push(`uçan düşman (${e.x},${e.y}) savaşçıyı hiç fark edemiyor`);
    } else if (!reach(e.x, e.y)) {
      problems.push(`${e.type} (${e.x},${e.y}) bulunduğu yere ulaşılamıyor`);
    }
  }
  const named = [
    ...(L.OBJECTS.benches || []).map((b) => ['bank', b]),
    ...(L.OBJECTS.doors || []).map((d) => ['kapı', d]),
    ...(L.OBJECTS.merchant ? [['tüccar', L.OBJECTS.merchant]] : []),
    ...(L.OBJECTS.boss ? [['boss', L.OBJECTS.boss]] : []),
    ...(L.OBJECTS.shrine ? [['sunak', L.OBJECTS.shrine]] : []),
  ];
  for (const [name, o] of named) if (!reach(o.x, o.y)) problems.push(`${name} (${o.x},${o.y}) ulaşılamıyor`);

  failures += problems.length;
  console.log(`${problems.length ? '✗' : '✓'} ${L.name}: ${seen.size} erişilebilir hücre`);
  problems.forEach((p) => console.log('    - ' + p));
}

process.exit(failures ? 1 : 0);
