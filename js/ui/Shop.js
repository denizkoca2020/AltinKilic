// Tüccar dükkânı: oyun durur, eşyalar altınla satın alınır. Yükseltmeler kaydedilir.
(function () {
  const AK = (window.AK = window.AK || {});

  const px = (rects) =>
    `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects
      .map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`)
      .join('')}</svg>`;

  const ICONS = {
    sword: px([
      [12, 1, 2, 2, '#fff2b0'], [10, 3, 2, 2, '#f2c75a'], [8, 5, 2, 2, '#f2c75a'], [6, 7, 2, 2, '#f2c75a'],
      [3, 8, 2, 2, '#c88a22'], [7, 10, 2, 2, '#c88a22'], [4, 10, 2, 2, '#7a4a14'], [2, 12, 2, 2, '#f2c75a'],
    ]),
    helm: px([
      [5, 2, 6, 1, '#f2c75a'], [4, 3, 8, 7, '#f2c75a'], [4, 3, 1, 7, '#c88a22'], [7, 2, 1, 4, '#fff2b0'],
      [7, 6, 5, 1, '#0b0a12'], [8, 7, 4, 1, '#0b0a12'], [5, 10, 6, 2, '#c88a22'],
    ]),
    potion: px([
      [7, 1, 2, 2, '#7a5236'], [6, 3, 4, 2, '#9fb7d9'], [4, 5, 8, 8, '#9fb7d9'], [5, 7, 6, 5, '#d0304a'],
      [5, 6, 2, 1, '#ffffff'], [5, 13, 6, 1, '#9fb7d9'],
    ]),
  };

  // Eşya tanımları: level() mevcut seviye, prices her seviyenin fiyatı
  const ITEMS = [
    {
      id: 'sword', name: 'Keskin Kılıç', icon: ICONS.sword,
      desc: 'Kılıç hasarı +1',
      level: () => AK.save.swordLv, max: 3, prices: [60, 150],
      buy: (scene) => { AK.save.swordLv++; scene.player.damage = AK.save.swordLv; },
    },
    {
      id: 'helm', name: 'Altın Miğfer', icon: ICONS.helm,
      desc: 'En yüksek can +1',
      level: () => AK.save.maxHp - 4, max: 3, prices: [45, 110],
      buy: (scene) => { AK.save.maxHp++; scene.player.hp = AK.save.maxHp; scene.updateHud(); },
    },
    {
      id: 'potion', name: 'Can İksiri', icon: ICONS.potion,
      desc: 'Canları anında doldurur',
      consumable: true, price: 15,
      canBuy: (scene) => scene.player.hp < AK.save.maxHp,
      buy: (scene) => { scene.player.hp = AK.save.maxHp; scene.updateHud(); },
    },
  ];

  const GREETINGS = [
    'Hoş geldin gezgin. Altının varsa, malım var.',
    'Bu salonlarda tek dost benim... tabii altının varsa.',
    'Kral\'ın kılıcı ağır, seninki keskin olsun.',
  ];

  class Shop {
    constructor() {
      this.el = document.getElementById('shop');
      this.scene = null;
      this.el.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-buy]');
        if (btn) this.buy(btn.dataset.buy);
        if (e.target.closest('[data-close]')) this.close();
      });
    }

    get isOpen() {
      return !!this.scene;
    }

    open(scene) {
      if (this.scene) return;
      this.scene = scene;
      scene.scene.pause();
      AK.input.releaseAll('kb');
      AK.input.releaseAll('touch');
      AK.setInteract(null);
      AK.sfx('ui');
      this.greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      this.render();
      this.el.classList.remove('hidden');
    }

    close() {
      if (!this.scene) return;
      const scene = this.scene;
      this.scene = null;
      this.el.classList.add('hidden');
      Object.keys(AK.input.pressed).forEach((k) => (AK.input.pressed[k] = false));
      AK.sfx('ui');
      scene.activeInteract = null; // tuşu yeniden göster
      scene.scene.resume();
    }

    priceOf(item) {
      if (item.consumable) return item.price;
      const lv = item.level();
      return lv >= item.max ? null : item.prices[lv - 1];
    }

    buy(id) {
      const item = ITEMS.find((i) => i.id === id);
      const price = this.priceOf(item);
      if (price == null || AK.save.coins < price || (item.canBuy && !item.canBuy(this.scene))) {
        AK.sfx('deny');
        return;
      }
      AK.save.coins -= price;
      item.buy(this.scene);
      AK.saveGame();
      this.scene.updateHud(true);
      AK.sfx('buy');
      this.render();
    }

    render() {
      const scene = this.scene;
      const rows = ITEMS.map((item) => {
        const price = this.priceOf(item);
        const maxed = price == null;
        const blocked = item.canBuy && !item.canBuy(scene);
        const afford = !maxed && AK.save.coins >= price;
        const pips = item.consumable ? '' :
          `<div class="pips">${Array.from({ length: item.max }, (_, i) => `<i class="${i < item.level() ? 'on' : ''}"></i>`).join('')}</div>`;
        const label = maxed ? 'TAMAM' : blocked ? 'DOLU' : `<span class="coin"></span>${price}`;
        return `<div class="item">
          <div class="icon">${item.icon}</div>
          <div class="info"><div class="name">${item.name}</div><div class="desc">${item.desc}</div>${pips}</div>
          <button class="buy ${afford && !blocked ? '' : 'off'}" data-buy="${item.id}" ${maxed ? 'disabled' : ''}>${label}</button>
        </div>`;
      }).join('');
      this.el.innerHTML = `<div class="shop-box">
        <div class="shop-head">
          <div><div class="shop-title">YAŞLI TÜCCAR</div><div class="shop-greet">“${this.greeting}”</div></div>
          <div class="shop-coins"><span class="coin"></span>${AK.save.coins}</div>
        </div>
        <div class="items">${rows}</div>
        <button class="close" data-close>KAPAT</button>
      </div>`;
    }
  }

  AK.Shop = Shop;
})();
