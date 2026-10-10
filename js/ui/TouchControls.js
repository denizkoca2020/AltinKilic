// iPad için ekran tuşları.
// Her dokunuşun konumu her olayda yeniden değerlendirilir; böylece
// - aynı anda birden çok tuşa basılabilir (koşarken zıpla + saldır),
// - parmak ◀ tuşundan ▶ tuşuna kaydırılınca yön anında değişir.
(function () {
  const AK = (window.AK = window.AK || {});

  // Basit piksel simgeler (SVG, keskin kenarlı)
  const px = (rects, color = '#f2c75a') =>
    `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects
      .map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c || color}"/>`)
      .join('')}</svg>`;

  const ICONS = {
    left: px([[9, 3, 2, 2], [7, 5, 2, 2], [5, 7, 2, 2], [7, 9, 2, 2], [9, 11, 2, 2], [7, 7, 6, 2]], '#dfe6f5'),
    right: px([[5, 3, 2, 2], [7, 5, 2, 2], [9, 7, 2, 2], [7, 9, 2, 2], [5, 11, 2, 2], [3, 7, 6, 2]], '#dfe6f5'),
    jump: px([[7, 2, 2, 2], [5, 4, 6, 2], [3, 6, 10, 2], [6, 8, 4, 6]], '#dfe6f5'),
    attack: px([
      [12, 1, 2, 2, '#fff2b0'], [10, 3, 2, 2], [8, 5, 2, 2], [6, 7, 2, 2],
      [3, 8, 2, 2, '#c88a22'], [7, 10, 2, 2, '#c88a22'], [4, 10, 2, 2, '#7a4a14'], [2, 12, 2, 2, '#f2c75a'],
    ]),
    shield: px([
      [3, 2, 10, 2, '#c88a22'], [3, 4, 10, 6, '#7d8dad'], [4, 10, 8, 2, '#7d8dad'], [6, 12, 4, 2, '#7d8dad'],
      [7, 4, 2, 7, '#f2c75a'], [5, 6, 6, 2, '#f2c75a'],
    ]),
    dash: px([[2, 4, 2, 2], [4, 6, 2, 2], [2, 10, 2, 2], [4, 8, 2, 2], [8, 4, 2, 2], [10, 6, 2, 2], [8, 10, 2, 2], [10, 8, 2, 2], [12, 7, 2, 2]], '#9fd7ff'),
  };

  const LABELS = { left: 'Sol', right: 'Sağ', jump: 'Zıpla', attack: 'Kılıç', shield: 'Kalkan', dash: 'Atıl' };

  class TouchControls {
    constructor(root, input) {
      this.root = root;
      this.input = input;
      this.buttons = [];

      const makeGroup = (cls) => {
        const g = document.createElement('div');
        g.className = 'pad ' + cls;
        root.appendChild(g);
        return g;
      };
      const left = makeGroup('pad-left');
      const right = makeGroup('pad-right');

      ['left', 'right'].forEach((a) => this.addButton(left, a, 'btn-dir'));
      // sağ küme: oyun kolu düzeni
      this.addButton(right, 'shield', 'btn-small btn-shield');
      this.addButton(right, 'dash', 'btn-small btn-dash');
      this.addButton(right, 'attack', 'btn-big btn-attack');
      this.addButton(right, 'jump', 'btn-big btn-jump');

      const opts = { passive: false };
      const handler = (e) => this.onTouch(e);
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((t) => window.addEventListener(t, handler, opts));

      // fareyle de tıklanabilsin (masaüstünde dokunmatik düzen denenirken)
      this.mouseAction = null;
      root.addEventListener('mousedown', (e) => {
        const b = this.hit(e.clientX, e.clientY);
        if (b) { this.mouseAction = b.action; this.apply(new Set([b.action])); }
      });
      window.addEventListener('mouseup', () => {
        if (this.mouseAction) { this.mouseAction = null; this.apply(new Set()); }
      });

      window.addEventListener('resize', () => this.measure());
      window.addEventListener('orientationchange', () => setTimeout(() => this.measure(), 300));
      this.measure();
    }

    addButton(parent, action, cls) {
      const el = document.createElement('div');
      el.className = 'btn ' + cls;
      el.innerHTML = ICONS[action] + `<span>${LABELS[action]}</span>`;
      parent.appendChild(el);
      this.buttons.push({ action, el, rect: null });
    }

    measure() {
      for (const b of this.buttons) b.rect = b.el.getBoundingClientRect();
    }

    // Parmağın altındaki tuşu bulur (biraz pay bırakarak, en yakın tuşu seçer)
    hit(x, y) {
      const PAD = 14;
      let best = null, bestD = Infinity;
      for (const b of this.buttons) {
        const r = b.rect;
        if (!r || r.width === 0) continue;
        if (x < r.left - PAD || x > r.right + PAD || y < r.top - PAD || y > r.bottom + PAD) continue;
        const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
        if (d < bestD) { bestD = d; best = b; }
      }
      return best;
    }

    onTouch(e) {
      // Overlay (menü vb.) açıkken dokunuşları engelleme
      if (e.target && e.target.closest && e.target.closest('.allow-touch')) return;
      e.preventDefault();
      if (!this.buttons[0].rect || this.buttons[0].rect.width === 0) this.measure();
      const active = new Set();
      for (const t of e.touches) {
        const b = this.hit(t.clientX, t.clientY);
        if (b) active.add(b.action);
      }
      this.apply(active);
    }

    apply(active) {
      for (const b of this.buttons) {
        const on = active.has(b.action);
        b.el.classList.toggle('down', on);
        this.input.set('touch', b.action, on);
      }
    }
  }

  AK.TouchControls = TouchControls;
})();
