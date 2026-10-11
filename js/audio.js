// Ses motoru: tüm efektler ve müzik Web Audio ile kodla üretilir (ses dosyası yok).
// iPad'de ses ancak bir dokunuştan sonra açılabilir; unlock() başlangıç ekranında çağrılır.
(function () {
  const AK = (window.AK = window.AK || {});

  // nota adı -> frekans (ör. 'D4')
  const NOTE = {};
  ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].forEach((n, i) => {
    for (let o = 1; o <= 6; o++) NOTE[n + o] = 440 * Math.pow(2, (i - 9) / 12 + (o - 4));
  });

  class Audio {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.music = null; // { name, gain, nodes, timer }
      this.wantMusic = null;
      this.last = {}; // aynı sesi çok sık çalmamak için
    }

    // ---------- Kurulum ----------
    unlock() {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        // iOS 17+: sessiz moddayken de ses çalsın
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* yok */ }
        const ctx = (this.ctx = new Ctx());
        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(ctx.destination);
        this.sfx = ctx.createGain();
        this.sfx.gain.value = 0.8;
        this.sfx.connect(this.master);
        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = 0.42;
        this.musicBus.connect(this.master);
        // mağara yankısı
        this.reverb = ctx.createConvolver();
        this.reverb.buffer = this.makeImpulse(2.8, 2.6);
        this.reverbOut = ctx.createGain();
        this.reverbOut.gain.value = 0.55;
        this.reverb.connect(this.reverbOut);
        this.reverbOut.connect(this.master);
        this.noiseBuf = this.makeNoise(1.5);
        // iOS için sessiz bir tampon çal
        const b = ctx.createBufferSource();
        b.buffer = ctx.createBuffer(1, 1, 22050);
        b.connect(ctx.destination);
        b.start(0);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.wantMusic && !this.music) this.playMusic(this.wantMusic);
    }

    get ready() {
      return !!this.ctx && this.ctx.state === 'running';
    }

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    }

    makeNoise(sec) {
      const len = Math.floor(this.ctx.sampleRate * sec);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }

    makeImpulse(sec, decay) {
      const rate = this.ctx.sampleRate, len = Math.floor(rate * sec);
      const buf = this.ctx.createBuffer(2, len, rate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    throttle(name, ms) {
      const now = performance.now();
      if (this.last[name] && now - this.last[name] < ms) return true;
      this.last[name] = now;
      return false;
    }

    // ---------- Yapı taşları ----------
    // Zarflı osilatör
    tone({ type = 'square', f, f2, dur = 0.15, vol = 0.2, a = 0.004, delay = 0, verb = 0, out, detune = 0 }) {
      const ctx = this.ctx, t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(f, t);
      if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(out || this.sfx);
      if (verb) this.send(g, verb);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    // Süzgeçten geçen gürültü (vuş, patlama, çıtırtı)
    noise({ dur = 0.2, vol = 0.3, type = 'bandpass', f = 1000, f2, q = 1, a = 0.004, delay = 0, verb = 0, out }) {
      const ctx = this.ctx, t = ctx.currentTime + delay;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const flt = ctx.createBiquadFilter();
      flt.type = type;
      flt.Q.value = q;
      flt.frequency.setValueAtTime(f, t);
      if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(flt);
      flt.connect(g);
      g.connect(out || this.sfx);
      if (verb) this.send(g, verb);
      src.start(t, Math.random() * 0.5);
      src.stop(t + dur + 0.05);
    }

    send(node, amount) {
      const s = this.ctx.createGain();
      s.gain.value = amount;
      node.connect(s);
      s.connect(this.reverb);
    }

    // ---------- Ses efektleri ----------
    play(name, opt) {
      if (!this.ready || this.muted) return;
      const fn = this['sfx_' + name];
      if (fn) fn.call(this, opt || {});
    }

    sfx_swing() {
      this.noise({ dur: 0.16, vol: 0.32, type: 'bandpass', f: 600, f2: 3200, q: 1.2, a: 0.02, verb: 0.15 });
      this.noise({ dur: 0.1, vol: 0.12, type: 'highpass', f: 4000, delay: 0.03 });
    }
    sfx_hit() {
      this.tone({ type: 'square', f: 180, f2: 60, dur: 0.12, vol: 0.28 });
      this.noise({ dur: 0.1, vol: 0.4, type: 'lowpass', f: 2500, f2: 300, verb: 0.2 });
      this.tone({ type: 'triangle', f: 1400, f2: 900, dur: 0.08, vol: 0.12 });
    }
    sfx_thud() {
      this.noise({ dur: 0.14, vol: 0.35, type: 'lowpass', f: 900, f2: 200 });
      this.tone({ type: 'sine', f: 140, f2: 70, dur: 0.12, vol: 0.25 });
    }
    sfx_enemyDie() {
      this.noise({ dur: 0.45, vol: 0.4, type: 'lowpass', f: 3000, f2: 120, verb: 0.35 });
      this.tone({ type: 'sawtooth', f: 320, f2: 40, dur: 0.4, vol: 0.18 });
    }
    sfx_jump() {
      if (this.throttle('jump', 60)) return;
      this.tone({ type: 'square', f: 220, f2: 420, dur: 0.09, vol: 0.07 });
      this.noise({ dur: 0.07, vol: 0.1, type: 'highpass', f: 2000 });
    }
    sfx_land() {
      if (this.throttle('land', 120)) return;
      this.noise({ dur: 0.09, vol: 0.18, type: 'lowpass', f: 700, f2: 150 });
    }
    sfx_dash() {
      this.noise({ dur: 0.22, vol: 0.3, type: 'bandpass', f: 2500, f2: 500, q: 0.8, verb: 0.2 });
      this.tone({ type: 'sine', f: 900, f2: 300, dur: 0.18, vol: 0.06 });
    }
    sfx_coin() {
      if (this.throttle('coin', 45)) return;
      const p = 1 + Math.random() * 0.06;
      this.tone({ type: 'square', f: 988 * p, dur: 0.07, vol: 0.06 });
      this.tone({ type: 'square', f: 1319 * p, dur: 0.18, vol: 0.06, delay: 0.06, verb: 0.25 });
    }
    sfx_hurt() {
      this.tone({ type: 'sawtooth', f: 400, f2: 80, dur: 0.3, vol: 0.22 });
      this.noise({ dur: 0.25, vol: 0.4, type: 'lowpass', f: 1500, f2: 200, verb: 0.3 });
    }
    sfx_block() {
      this.tone({ type: 'triangle', f: 1800, dur: 0.35, vol: 0.18, verb: 0.4 });
      this.tone({ type: 'triangle', f: 2410, dur: 0.25, vol: 0.1 });
      this.noise({ dur: 0.06, vol: 0.3, type: 'highpass', f: 3000 });
    }
    sfx_windup() {
      this.tone({ type: 'sawtooth', f: 90, f2: 160, dur: 0.4, vol: 0.12, a: 0.1 });
    }
    sfx_death() {
      this.tone({ type: 'sine', f: 440, f2: 55, dur: 1.4, vol: 0.25, verb: 0.6 });
      this.tone({ type: 'sine', f: 523, f2: 65, dur: 1.4, vol: 0.15, verb: 0.6 });
      this.noise({ dur: 1.0, vol: 0.25, type: 'lowpass', f: 1200, f2: 80, verb: 0.5 });
    }
    // bankta dinlenme: yumuşak akor
    sfx_bench() {
      ['D4', 'A4', 'D5', 'F5'].forEach((n, i) =>
        this.tone({ type: 'sine', f: NOTE[n], dur: 1.8, vol: 0.08, a: 0.05, delay: i * 0.09, verb: 0.7 }));
    }
    sfx_door() {
      this.noise({ dur: 0.9, vol: 0.3, type: 'lowpass', f: 400, f2: 120, a: 0.2, verb: 0.5 });
      this.tone({ type: 'sine', f: 110, f2: 90, dur: 0.9, vol: 0.18, a: 0.2 });
    }
    sfx_buy() {
      ['A5', 'C#6', 'E6'].forEach((n, i) => this.tone({ type: 'square', f: NOTE[n], dur: 0.14, vol: 0.06, delay: i * 0.07, verb: 0.3 }));
    }
    sfx_deny() {
      this.tone({ type: 'square', f: 160, dur: 0.12, vol: 0.08 });
      this.tone({ type: 'square', f: 120, dur: 0.16, vol: 0.08, delay: 0.1 });
    }
    sfx_shoot() {
      if (this.throttle('shoot', 80)) return;
      this.noise({ dur: 0.12, vol: 0.18, type: 'bandpass', f: 1800, f2: 700, q: 2 });
      this.tone({ type: 'triangle', f: 700, f2: 300, dur: 0.1, vol: 0.06 });
    }
    sfx_parry() {
      this.tone({ type: 'triangle', f: 2200, dur: 0.18, vol: 0.12, verb: 0.3 });
      this.noise({ dur: 0.05, vol: 0.25, type: 'highpass', f: 4000 });
    }
    sfx_ui() {
      this.tone({ type: 'square', f: 660, dur: 0.05, vol: 0.05 });
    }
    sfx_roar() {
      this.tone({ type: 'sawtooth', f: 70, f2: 50, dur: 1.2, vol: 0.3, a: 0.1, verb: 0.5 });
      this.tone({ type: 'sawtooth', f: 105, f2: 70, dur: 1.2, vol: 0.2, a: 0.1, detune: 15 });
      this.noise({ dur: 1.1, vol: 0.35, type: 'bandpass', f: 400, f2: 200, q: 2, a: 0.1, verb: 0.4 });
    }
    sfx_slam() {
      this.tone({ type: 'sine', f: 120, f2: 30, dur: 0.5, vol: 0.45 });
      this.noise({ dur: 0.5, vol: 0.5, type: 'lowpass', f: 1800, f2: 80, verb: 0.4 });
    }
    sfx_victory() {
      ['D4', 'F4', 'A4', 'D5', 'F5', 'A5'].forEach((n, i) =>
        this.tone({ type: 'triangle', f: NOTE[n], dur: 1.6, vol: 0.1, delay: i * 0.12, verb: 0.6 }));
    }

    // ---------- Müzik ----------
    playMusic(name) {
      this.wantMusic = name;
      if (!this.ctx) return;
      if (this.music && this.music.name === name) return;
      this.stopMusic();
      const ctx = this.ctx;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2);
      gain.connect(this.musicBus);
      const m = (this.music = { name, gain, nodes: [], next: ctx.currentTime + 0.1, step: 0 });
      if (name === 'cave') this.startCave(m);
      if (name === 'boss') this.startBoss(m);
      if (name === 'forest') this.startForest(m);
      if (name === 'city') this.startCity(m);
      m.timer = setInterval(() => this.schedule(m), 90);
    }

    stopMusic() {
      const m = this.music;
      if (!m) return;
      this.music = null;
      clearInterval(m.timer);
      const t = this.ctx.currentTime;
      m.gain.gain.cancelScheduledValues(t);
      m.gain.gain.setValueAtTime(m.gain.gain.value, t);
      m.gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      setTimeout(() => {
        m.nodes.forEach((n) => { try { n.stop(); } catch (_) { /* zaten durdu */ } });
        m.gain.disconnect();
      }, 1400);
    }

    // Mağara: alçak uğultu + yankılı, seyrek çan notaları (Re minör)
    startCave(m) {
      const ctx = this.ctx;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 380;
      const dg = ctx.createGain();
      dg.gain.value = 0.14;
      lp.connect(dg);
      dg.connect(m.gain);
      [[NOTE.D2, -6], [NOTE.D2, 7], [NOTE.A2, 0]].forEach(([f, det]) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(lp);
        o.start();
        m.nodes.push(o);
      });
      // yavaş nefes alan süzgeç
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lg = ctx.createGain();
      lg.gain.value = 160;
      lfo.connect(lg);
      lg.connect(lp.frequency);
      lfo.start();
      m.nodes.push(lfo);
      m.scale = ['D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'A5'];
    }

    // Uzun süren sabit bir uğultu sesi (orman / şehir için)
    drone(m, notes, type, cutoff, vol) {
      const ctx = this.ctx;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = cutoff;
      const g = ctx.createGain();
      g.gain.value = vol;
      lp.connect(g);
      g.connect(m.gain);
      notes.forEach(([f, det]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(lp);
        o.start();
        m.nodes.push(o);
      });
    }

    // Orman: yumuşak uğultu, La majör pentatonik tıngırtılar, ara sıra kuş
    startForest(m) {
      this.drone(m, [[NOTE.A2, 0], [NOTE.E3, 4]], 'sine', 600, 0.12);
      m.scale = ['A4', 'B4', 'C#5', 'E5', 'F#5', 'A5', 'B5'];
    }

    // Şehir: sürekli yağmur + derin uğultu + seyrek hüzünlü notalar (Do minör)
    startCity(m) {
      this.drone(m, [[NOTE.C2, -5], [NOTE.G2, 5]], 'triangle', 300, 0.16);
      const ctx = this.ctx;
      const rain = ctx.createBufferSource();
      rain.buffer = this.noiseBuf;
      rain.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 2600;
      hp.Q.value = 0.4;
      const rg = ctx.createGain();
      rg.gain.value = 0.08;
      rain.connect(hp);
      hp.connect(rg);
      rg.connect(m.gain);
      rain.start();
      m.nodes.push(rain);
      m.scale = ['C4', 'D#4', 'F4', 'G4', 'G#4', 'C5', 'D#5'];
    }

    // Boss: hızlı bas, davul, gergin melodi
    startBoss(m) {
      m.bass = ['D2', 'D2', 'D3', 'D2', 'F2', 'D2', 'G2', 'A2', 'D2', 'D2', 'D3', 'D2', 'A#2', 'A2', 'G2', 'F2'];
      m.lead = ['D5', null, 'F5', null, 'E5', null, 'D5', 'C5', 'A4', null, null, null, 'A#4', null, 'A4', null];
    }

    schedule(m) {
      if (this.music !== m) return;
      const ctx = this.ctx;
      while (m.next < ctx.currentTime + 0.3) {
        const t = m.next - ctx.currentTime;
        if (m.name === 'cave') {
          // her adım 0.5 sn; notaların çoğu sessiz kalır
          if (Math.random() < 0.38) {
            const n = m.scale[Math.floor(Math.random() * m.scale.length)];
            this.tone({ type: 'sine', f: NOTE[n], dur: 2.4, vol: 0.09, a: 0.01, delay: Math.max(0, t), verb: 0.9, out: m.gain });
            this.tone({ type: 'triangle', f: NOTE[n] * 2, dur: 0.8, vol: 0.02, delay: Math.max(0, t), out: m.gain });
          }
          m.next += 0.5;
        } else if (m.name === 'forest') {
          const d = Math.max(0, t);
          if (Math.random() < 0.5) {
            const n = m.scale[Math.floor(Math.random() * m.scale.length)];
            this.tone({ type: 'triangle', f: NOTE[n], dur: 0.9, vol: 0.07, delay: d, verb: 0.6, out: m.gain });
          }
          // kuş cıvıltısı
          if (Math.random() < 0.06) {
            const f = 2400 + Math.random() * 1200;
            for (let i = 0; i < 3; i++) this.tone({ type: 'sine', f, f2: f * 1.3, dur: 0.06, vol: 0.025, delay: d + i * 0.09, out: m.gain, verb: 0.3 });
          }
          m.next += 0.35;
        } else if (m.name === 'city') {
          const d = Math.max(0, t);
          if (Math.random() < 0.3) {
            const n = m.scale[Math.floor(Math.random() * m.scale.length)];
            this.tone({ type: 'sine', f: NOTE[n], dur: 2.6, vol: 0.08, a: 0.02, delay: d, verb: 0.8, out: m.gain });
            this.tone({ type: 'sine', f: NOTE[n] * 1.5, dur: 1.2, vol: 0.02, delay: d + 0.02, out: m.gain });
          }
          m.next += 0.6;
        } else if (m.name === 'boss') {
          const s = m.step % 16;
          const d = Math.max(0, t);
          this.tone({ type: 'sawtooth', f: NOTE[m.bass[s]], dur: 0.18, vol: 0.13, delay: d, out: m.gain });
          if (s % 4 === 0) this.tone({ type: 'sine', f: 150, f2: 40, dur: 0.2, vol: 0.5, delay: d, out: m.gain });
          if (s % 8 === 4) this.noise({ dur: 0.15, vol: 0.25, type: 'bandpass', f: 1800, q: 0.7, delay: d, out: m.gain, verb: 0.2 });
          this.noise({ dur: 0.04, vol: 0.05, type: 'highpass', f: 7000, delay: d, out: m.gain });
          const ln = m.lead[s];
          if (ln && (Math.floor(m.step / 16) % 2 === 1)) this.tone({ type: 'square', f: NOTE[ln], dur: 0.3, vol: 0.05, delay: d, out: m.gain, verb: 0.3 });
          m.step++;
          m.next += 0.2;
        }
      }
    }
  }

  AK.audio = new Audio();
  AK.sfx = (name, opt) => AK.audio.play(name, opt);
})();
