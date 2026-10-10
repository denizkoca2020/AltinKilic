// Ortak giriş durumu: klavye ve dokunmatik tuşlar aynı eylemleri besler.
// Eylemler: left, right, jump, attack, shield, dash
(function () {
  const AK = (window.AK = window.AK || {});

  const ACTIONS = ['left', 'right', 'jump', 'attack', 'shield', 'dash'];

  class InputState {
    constructor() {
      this.sources = {}; // kaynak -> { eylem: bool }
      this.held = {};
      this.pressed = {};
      ACTIONS.forEach((a) => { this.held[a] = false; this.pressed[a] = false; });
    }

    set(source, action, down) {
      const src = (this.sources[source] = this.sources[source] || {});
      src[action] = down;
      const was = this.held[action];
      const now = Object.values(this.sources).some((s) => s[action]);
      this.held[action] = now;
      // Aynı karede basılıp bırakılsa bile kaçmasın diye basış ayrıca saklanır
      if (now && !was) this.pressed[action] = true;
    }

    // Tek seferlik basışı okur ve sıfırlar
    consume(action) {
      const p = this.pressed[action];
      this.pressed[action] = false;
      return p;
    }

    releaseAll(source) {
      ACTIONS.forEach((a) => this.set(source, a, false));
    }
  }

  AK.input = new InputState();

  // ---------- Klavye (bilgisayarda test için) ----------
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
    KeyX: 'attack', KeyJ: 'attack',
    KeyC: 'shield', KeyK: 'shield',
    KeyZ: 'dash', KeyL: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
  };

  window.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!e.repeat) AK.input.set('kb', a, true);
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    AK.input.set('kb', a, false);
  });
  window.addEventListener('blur', () => {
    AK.input.releaseAll('kb');
    AK.input.releaseAll('touch');
  });
})();
