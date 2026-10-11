// Ana oyun sahnesi: bölüm, paralaks arka plan, ışıklar, savaşçı, kamera ve HUD.
// Sahne her bölüm geçişinde / ölümde { level, spawn, respawn } verisiyle yeniden başlatılır.
(function () {
  const AK = (window.AK = window.AK || {});
  const T = () => AK.TILE;

  class GameScene extends Phaser.Scene {
    constructor() {
      super('Game');
    }

    create(data) {
      data = data || {};
      // Hangi bölüm? Kapıdan geçildiyse hedef bölüm; ölümde ya da ilk açılışta son kayıt noktası
      const cp = AK.save.checkpoint;
      const respawn = !!data.respawn || !data.level;
      const levelId = data.level || (respawn && cp && AK.LEVELS[cp.level] ? cp.level : 'cave');
      const L = (this.level = AK.LEVELS[levelId]);
      // sahne nesnesi yeniden kullanılır: önceki bölümden kalanları sıfırla
      this.leaving = false;
      this.boss = null;
      this.hazards = null;
      this.gates = null;
      this.bossBarBg = null;
      this.bossBarFill = null;
      const t = T();
      const worldW = L.W * t;
      const worldH = L.H * t;
      this.worldW = worldW;
      this.worldH = worldH;
      const { grid, tiles } = L.build();

      this.fx = new AK.FX(this);
      this.createBackground();

      // ---- Zemin (tilemap) ----
      const map = this.make.tilemap({ data: tiles, tileWidth: t, tileHeight: t });
      const tileset = map.addTilesetImage('tiles', 'tiles-' + L.theme, t, t, 0, 0);
      this.ground = map.createLayer(0, tileset, 0, 0).setDepth(2);
      this.ground.setCollisionByExclusion([-1]);

      // Alt sınır açık: çukura düşülebilsin
      this.physics.world.setBounds(0, 0, worldW, worldH + 200);
      this.physics.world.setBoundsCollision(true, true, true, false);

      this.decorate(grid);

      // ---- Kuklalar ----
      this.dummies = (L.OBJECTS.dummies || []).map((d) => new AK.Dummy(this, d.x * t + t / 2, (d.y + 1) * t));

      // ---- Dinlenme bankları ----
      this.interactables = [];
      this.benches = (L.OBJECTS.benches || []).map((b, i) => {
        const bx = b.x * t + t / 2, by = (b.y + 1) * t;
        const img = this.add.image(bx, by, 'bench').setOrigin(0.5, 1).setDepth(4);
        const glow = this.add.image(bx, by - 10, 'glow').setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1.4);
        const bench = { index: i, x: bx, y: by, img, glow };
        this.interactables.push({ x: bx, y: by, w: 40, label: 'OTUR', use: () => this.restAtBench(bench) });
        return bench;
      });

      // ---- Tüccar ----
      const m = L.OBJECTS.merchant;
      if (m) {
        const mx = m.x * t + t / 2, my = (m.y + 1) * t;
        this.add.image(mx, my - 14, 'glow').setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setScale(0.8);
        this.add.sprite(mx, my, 'merchant', 'm0').setOrigin(0.5, 1).setDepth(4).setFlipX(true).play('merchant-idle');
        this.interactables.push({ x: mx, y: my, w: 48, label: 'KONUŞ', use: () => AK.shop.open(this) });
      }

      // ---- Tabelalar ----
      for (const sg of L.OBJECTS.signs || []) {
        const sx = sg.x * t + t / 2, sy = (sg.y + 1) * t;
        this.add.image(sx, sy, 'sign').setOrigin(0.5, 1).setDepth(4);
        this.interactables.push({ x: sx, y: sy, w: 30, label: 'OKU', use: () => AK.toast(sg.text, 3500) });
      }

      // ---- Kapılar (bölümler arası geçiş) ----
      for (const d of L.OBJECTS.doors || []) {
        const dx = d.x * t + t / 2, dy = (d.y + 1) * t;
        this.add.image(dx, dy, 'door').setOrigin(0.5, 1).setDepth(1);
        this.add.image(dx, dy - 24, 'glow').setDepth(0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.25).setScale(1.2);
        this.interactables.push({ x: dx, y: dy, w: 30, label: 'GİR', use: () => this.enterDoor(d) });
      }

      // ---- Savaşçı ----
      // Kapıdan gelindiyse kapının yanında; ölünce/ilk açılışta son oturulan bankta; yoksa bölüm başında doğar
      const spawn = data.spawn && L.OBJECTS.spawns ? L.OBJECTS.spawns[data.spawn] : null;
      const respawnBench = !spawn && respawn && cp && cp.level === levelId ? this.benches[cp.bench] : null;
      const ps = spawn || L.OBJECTS.player;
      this.player = new AK.Warrior(this, ps.x * t + t / 2, (ps.y + 1) * t);
      if (spawn && spawn.facing) this.player.facing = spawn.facing;
      if (respawnBench) {
        this.player.setPosition(respawnBench.x, respawnBench.y);
        this.player.sit(respawnBench.x, respawnBench.y);
        respawnBench.glow.setAlpha(0.5);
      }

      // etkileşim oku
      this.promptArrow = this.add.image(0, 0, 'prompt').setOrigin(0.5, 1).setDepth(20).setVisible(false);
      this.activeInteract = null;
      AK.setInteract(null);
      this.physics.add.collider(this.player, this.ground);
      this.safePos = { x: this.player.x, y: this.player.y };

      // ---- Düşmanlar ve altınlar ----
      this.enemies = this.add.group();
      for (const e of L.OBJECTS.enemies || []) {
        const Cls = AK.ENEMY_TYPES[e.type];
        const ex = e.x * t + t / 2;
        const ey = e.type === 'flyer' ? e.y * t + t / 2 : (e.y + 1) * t;
        this.enemies.add(new Cls(this, ex, ey));
      }
      this.coins = this.add.group();
      this.physics.add.collider(this.enemies, this.ground);
      this.physics.add.collider(this.coins, this.ground);
      this.physics.add.overlap(this.player, this.enemies, (p, e) => this.onEnemyContact(e));
      this.physics.add.overlap(this.player, this.coins, (p, c) => this.collectCoin(c));
      // düşman mermileri (diken, ok)
      this.projectiles = this.add.group();
      this.physics.add.overlap(this.player, this.projectiles, (p, pr) => this.onProjectileContact(pr));
      // zemine/duvara çarpma, update içinde okun ucuyla kontrol edilir (bkz. updateProjectiles)

      // ---- Kamera ----
      const cam = this.cameras.main;
      cam.setBounds(0, 0, worldW, worldH);
      cam.startFollow(this.player, true, 0.12, 0.12);
      cam.setFollowOffset(0, 26);
      cam.setRoundPixels(true);
      cam.fadeIn(600, 5, 7, 13);

      this.fx.ambient(worldW, worldH, L.theme);
      if (L.OBJECTS.weather === 'rain') this.fx.rain();
      AK.audio.playMusic(L.music);
      if (data.level || !data.respawn) this.time.delayedCall(500, () => AK.toast(L.name, 2600));

      // ---- Boss arenası (varsa) ----
      if (L.OBJECTS.boss) this.setupBoss(L.OBJECTS.boss, L.OBJECTS.shrine);
      this.createOverlay();

      this.scale.on('resize', this.onResize, this);
      this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
      this.onResize(this.scale.gameSize);

      if (new URLSearchParams(location.search).has('debug')) this.physics.world.createDebugGraphic();
      AK.scene = this; // geliştirme/test kolaylığı
    }

    // ---------- Arka plan ----------
    createBackground() {
      const { width, height } = this.scale.gameSize;
      const th = this.level.theme;
      this.bgFar = this.add.tileSprite(0, 0, width, height, 'bg-far-' + th).setOrigin(0).setScrollFactor(0).setDepth(-20);
      this.bgMid = this.add.tileSprite(0, 0, width, height, 'bg-mid-' + th).setOrigin(0).setScrollFactor(0).setDepth(-15);

      // tavandan süzülen ışık huzmeleri
      for (const bx of this.level.OBJECTS.beams || []) {
        const b = this.add.image(bx * T(), 24, 'beam').setOrigin(0.5, 0).setScrollFactor(0.85, 1)
          .setDepth(-10).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.1);
        this.tweens.add({ targets: b, alpha: 0.05, duration: 2600 + Math.random() * 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }

    // ---------- Süslemeler: fenerler, çimler, sancaklar ----------
    decorate(grid) {
      const t = T();
      const L = this.level;
      const r = AK.rng(1234);

      // kraliyet sancakları
      for (const bx of L.OBJECTS.banners || []) {
        const b = this.add.image(bx * t + t / 2, 2 * t, 'banner').setOrigin(0.5, 0).setDepth(-1);
        this.tweens.add({ targets: b, scaleX: 0.94, duration: 1800 + r() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }

      // ormanda parlayan mantarlar, şehirde sokak lambaları (yüzeylere serpiştirilir)
      const surfaces = [];
      for (let y = 1; y < L.H; y++)
        for (let x = 2; x < L.W - 2; x++) if (grid[y][x] && !grid[y - 1][x]) surfaces.push([x, y]);
      if (L.theme === 'forest') {
        for (const [x, y] of surfaces) {
          if (r() > 0.09) continue;
          const sx = x * t + t / 2 + Math.round(r() * 6 - 3), sy = y * t;
          this.add.image(sx, sy + 1, 'shroom').setOrigin(0.5, 1).setDepth(3).setFlipX(r() < 0.5);
          const gl = this.add.image(sx, sy - 6, 'glow').setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setTint(0x60ffe0).setScale(0.45).setAlpha(0.5);
          this.tweens.add({ targets: gl, alpha: 0.25, duration: 1200 + r() * 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      }
      if (L.theme === 'city') {
        let lastX = -99;
        for (const [x, y] of surfaces) {
          if (y !== 19 || x - lastX < 9) continue; // yalnızca sokak hizasında, aralıklı
          lastX = x;
          const sx = x * t + t / 2, sy = y * t;
          this.add.image(sx, sy, 'streetlamp').setOrigin(0.5, 1).setDepth(1);
          const gl = this.add.image(sx, sy - 38, 'glow').setDepth(6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
          this.tweens.add({ targets: gl, alpha: 0.38, duration: 120 + r() * 200, yoyo: true, repeat: -1, repeatDelay: 600 + r() * 2000 });
          this.add.image(sx, sy - 10, 'glow').setDepth(-5).setScale(2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.15);
        }
      }

      // yüzeylerdeki yosun / çim öbekleri (mağara ve ormanda)
      if (L.theme === 'cave' || L.theme === 'forest') for (let y = 1; y < L.H; y++)
        for (let x = 0; x < L.W; x++) {
          if (!grid[y][x] || grid[y - 1][x] || r() > 0.4) continue;
          this.add.image(x * t + t / 2, y * t + 1, 'grass', 'g' + Math.floor(r() * 4)).setOrigin(0.5, 1).setDepth(3);
        }

      // asılı fenerler (hafifçe sallanır, ışığı titrer)
      for (const ln of L.OBJECTS.lanterns || []) {
        const x = ln.x * t + t / 2, y = ln.y * t;
        const chainLen = ln.len * t;
        const c = this.add.container(x, y).setDepth(1);
        const chain = this.add.rectangle(0, 0, 1, chainLen, 0x3a3f55).setOrigin(0.5, 0);
        const lamp = this.add.image(0, chainLen, 'lantern').setOrigin(0.5, 0);
        c.add([chain, lamp]);
        this.tweens.add({ targets: c, angle: { from: -2.5, to: 2.5 }, duration: 2200 + r() * 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        const glow = this.add.image(x, y + chainLen + 12, 'glow').setDepth(6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55);
        this.tweens.add({ targets: glow, alpha: 0.4, scale: 0.92, duration: 140 + r() * 220, yoyo: true, repeat: -1, repeatDelay: r() * 900 });
        const wide = this.add.image(x, y + chainLen + 12, 'glow').setDepth(-5).setScale(2.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.22);
        this.tweens.add({ targets: wide, alpha: 0.16, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }

    // ---------- Ekran üstü katmanlar: sis, vinyet, HUD ----------
    createOverlay() {
      const { width, height } = this.scale.gameSize;
      this.fog = this.add.tileSprite(0, height - 80, width, 90, 'fog-' + this.level.theme).setOrigin(0).setScrollFactor(0).setDepth(13).setAlpha(0.35);
      this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(90).setDisplaySize(width, height);

      // can (altın miğferler) - en fazla 7, görünür sayısı en yüksek cana göre
      this.hud = [];
      for (let i = 0; i < 7; i++) {
        this.hud.push(this.add.image(12 + i * 14, 12, 'hp', 'full').setOrigin(0).setScrollFactor(0).setDepth(100));
      }
      // altın sayacı
      this.coinIcon = this.add.sprite(14, 34, 'coin', 'c0').setOrigin(0).setScrollFactor(0).setDepth(100).play('coin-spin');
      this.coinDigits = [];
      for (let i = 0; i < 5; i++) {
        this.coinDigits.push(this.add.image(24 + i * 5, 34, 'digits', 'd0').setOrigin(0).setScrollFactor(0).setDepth(100));
      }
      this.updateHud();
    }

    updateHud(bumpCoins) {
      this.hud.forEach((img, i) => {
        img.setVisible(i < AK.save.maxHp);
        img.setFrame(i < this.player.hp ? 'full' : 'empty');
      });
      const str = String(AK.save.coins);
      this.coinDigits.forEach((img, i) => {
        img.setVisible(i < str.length);
        if (i < str.length) img.setFrame('d' + str[i]);
      });
      if (bumpCoins) {
        this.tweens.killTweensOf(this.coinIcon);
        this.coinIcon.setScale(1);
        this.tweens.add({ targets: this.coinIcon, scale: 1.5, duration: 80, yoyo: true });
      }
    }

    // Can simgesi kırılırken kısa bir efekt
    hudLoseHp() {
      const img = this.hud[this.player.hp];
      if (!img) return;
      img.setFrame('full');
      this.tweens.add({
        targets: img, x: img.x + 2, duration: 40, yoyo: true, repeat: 3,
        onComplete: () => { img.x = 12 + this.hud.indexOf(img) * 14; img.setFrame('empty'); },
      });
    }

    onResize(gameSize) {
      const { width, height } = gameSize;
      this.cameras.main.setSize(width, height);
      this.bgFar.setSize(width, height);
      this.bgMid.setSize(width, height);
      // arka plan dokuları 270px; ekran daha kısaysa alttan hizala
      this.bgFar.tilePositionY = 270 - height;
      this.bgMid.tilePositionY = 270 - height;
      this.fog.setSize(width, 90).setY(height - 80);
      this.vignette.setDisplaySize(width, height);
      if (this.layoutBossBar) this.layoutBossBar();
    }

    // ---------- Yardımcılar ----------
    isSolidAt(x, y) {
      const tile = this.ground.getTileAtWorldXY(x, y);
      return !!tile && tile.index !== -1;
    }

    // iki nokta arasında duvar/zemin yok mu? (okçunun nişan alması için)
    // (mermilerin zemine çarpmadığı ilk 12 px atlanır; okun kalınlığı için iki çizgi kontrol edilir)
    hasLineOfSight(x0, y0, x1, y1) {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.ceil(d / 3);
      for (const off of [-2, 3]) {
        for (let i = Math.ceil(12 / 3); i < n; i++) {
          if (this.isSolidAt(x0 + ((x1 - x0) * i) / n, y0 + off + ((y1 - y0) * i) / n)) return false;
        }
      }
      return true;
    }

    spawnCoins(x, y, n) {
      for (let i = 0; i < n; i++) this.coins.add(new AK.Coin(this, x, y));
    }

    collectCoin(c) {
      if (this.time.now < c.collectableAt || !c.active) return;
      this.fx.coinSparkle(c.x, c.y);
      c.destroy();
      AK.save.coins++;
      AK.sfx('coin');
      AK.saveGame();
      this.updateHud(true);
    }

    // ---------- Savaş ----------
    onEnemyContact(e) {
      if (e.dead) return;
      const p = this.player;
      const res = p.hurt(e.x);
      if (!res) return;
      if (res === 'blocked') {
        if (e.bounceOff) e.bounceOff(-Math.sign(p.x - e.x) || p.facing);
        this.fx.blockSparks(p.x + p.facing * 9, p.y - 14);
        AK.sfx('block');
        this.cameras.main.shake(70, 0.003);
        return;
      }
      this.onPlayerDamaged(res);
    }

    onPlayerDamaged(res) {
      this.hudLoseHp();
      this.cameras.main.shake(160, 0.01);
      this.cameras.main.flash(120, 120, 20, 30);
      this.fx.hitSparks(this.player.x, this.player.y - 14);
      this.hitStop(110);
      AK.sfx(res === 'dead' ? 'death' : 'hurt');
      if (res === 'dead') this.playerDied();
    }

    playerDied() {
      const p = this.player;
      this.time.delayedCall(500, () => {
        p.setTintFill(0xffffff);
        this.fx.enemyBurst(p.x, p.y - 14, [0xf2c75a, 0x7d8dad, 0x9c3247]);
        p.setVisible(false);
      });
      this.time.delayedCall(1100, () => this.cameras.main.fadeOut(700, 5, 7, 13));
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ respawn: true }));
    }

    onSwordSwing(rect) {
      let hit = false;
      let blocked = false; // bir nöbetçinin kalkanına çarptı mı
      const p = this.player;
      for (const e of this.enemies.getChildren().slice()) {
        if (e.dead) continue;
        const r = e.hitRect();
        if (!Phaser.Geom.Intersects.RectangleToRectangle(rect, r)) continue;
        // Kalkanlı Nöbetçi önden gelen darbeyi engeller
        if (e.shieldsFrom && e.shieldsFrom(p.x)) {
          blocked = true;
          this.fx.blockSparks(e.x + e.dir * 10, p.y - 16);
          AK.sfx('block');
          continue;
        }
        hit = true;
        e.takeHit(p.facing, p.damage);
        if (!e.dead) AK.sfx('hit');
        this.fx.hitSparks(Phaser.Math.Clamp(p.x + p.facing * 16, r.left, r.right), Phaser.Math.Clamp(p.y - 16, r.top, r.bottom));
      }
      const boss = this.boss;
      if (boss && !boss.dead && boss.mode !== 'dormant') {
        const r = boss.hitRect();
        if (Phaser.Geom.Intersects.RectangleToRectangle(rect, r)) {
          hit = true;
          boss.takeHit(p.damage);
          AK.sfx('hit');
          this.fx.hitSparks(Phaser.Math.Clamp(p.x + p.facing * 16, r.left, r.right), Phaser.Math.Clamp(p.y - 16, r.top, r.bottom));
          this.updateBossBar();
        }
      }
      if (blocked) p.recoil(-p.facing * 190, 170); // kalkandan sekme daha güçlü
      else if (hit) p.recoil(-p.facing * AK.TUNING.hitRecoil, 110);
      // havadaki mermiler kılıçla kesilebilir
      for (const pr of this.projectiles.getChildren().slice()) {
        if (!Phaser.Geom.Intersects.RectangleToRectangle(rect, pr.getBounds())) continue;
        this.fx.hitSparks(pr.x, pr.y);
        AK.sfx('parry');
        pr.destroy();
      }
      for (const d of this.dummies) {
        const r = d.getHitRect();
        if (!Phaser.Geom.Intersects.RectangleToRectangle(rect, r)) continue;
        hit = true;
        d.hit(this.player.facing);
        const ix = Phaser.Math.Clamp(this.player.x + this.player.facing * 16, r.left, r.right);
        this.fx.hitSparks(ix, this.player.y - 16);
      }
      if (hit) {
        this.cameras.main.shake(90, 0.006);
        this.hitStop(70);
      }
    }

    // ---------- Mermiler ----------
    fireProjectile(x, y, vx, vy, tex) {
      this.projectiles.add(new AK.Projectile(this, x, y, vx, vy, tex));
    }

    // Okun ucu duvara/zemine girince kırılır. Atıldıktan hemen sonra (yay boyu, ~12 px) kontrol edilmez,
    // böylece çatı kenarından yapılan atışlar kenarı sıyırıp kırılmaz (hasLineOfSight ile aynı kural).
    updateProjectiles(time) {
      for (const pr of this.projectiles.getChildren().slice()) {
        if (time > pr.dieAt) { pr.destroy(); continue; }
        if (time < pr.solidAt) continue;
        const v = pr.body.velocity, sp = Math.hypot(v.x, v.y) || 1;
        if (this.isSolidAt(pr.x + (v.x / sp) * 5, pr.y + (v.y / sp) * 5)) this.breakProjectile(pr);
      }
    }

    breakProjectile(pr) {
      this.fx.dust.explode(3, pr.x, pr.y);
      pr.destroy();
    }

    onProjectileContact(pr) {
      const p = this.player;
      const res = p.hurt(pr.x - Math.sign(pr.body.velocity.x || 1) * 4);
      if (!res) return;
      if (res === 'blocked') {
        this.fx.blockSparks(p.x + p.facing * 9, pr.y);
        AK.sfx('block');
      } else {
        this.onPlayerDamaged(res);
      }
      pr.destroy();
    }

    // Vuruş anında kısa donma: darbeye ağırlık katar
    hitStop(ms) {
      if (this.physics.world.isPaused) return;
      this.physics.pause();
      this.player.anims.pause();
      this.time.delayedCall(ms, () => {
        this.physics.resume();
        this.player.anims.resume();
      });
    }

    // ---------- Dinlenme bankı ----------
    restAtBench(bench) {
      const p = this.player;
      if (p.state === 'sit') return;
      p.sit(bench.x, bench.y);
      p.hp = AK.save.maxHp;
      p.invulnUntil = 0;
      this.updateHud();
      AK.save.checkpoint = { level: this.level.id, bench: bench.index };
      AK.saveGame();
      AK.sfx('bench');
      AK.toast('DİNLENDİN · CANLAR DOLDU · KAYIT ALINDI');
      this.benches.forEach((b) => b.glow.setAlpha(0));
      this.tweens.add({ targets: bench.glow, alpha: { from: 1, to: 0.5 }, duration: 1200 });
      this.fx.hitSparks(bench.x, bench.y - 12);
    }

    // ---------- Bölüm geçişi ----------
    enterDoor(door) {
      if (this.leaving) return;
      this.leaving = true;
      const p = this.player;
      p.state = 'hurt'; // kontrolü kilitle
      p.hurtEndAt = Infinity;
      p.body.setVelocity(0, 0);
      AK.sfx('door');
      AK.setInteract(null);
      this.cameras.main.fadeOut(600, 5, 7, 13);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ level: door.to, spawn: door.spawn }));
    }

    // Yakındaki etkileşim noktasını bul, oku ve tuşu göster
    updateInteract() {
      const p = this.player;
      let best = null;
      if (!p.dead && !this.leaving && p.state !== 'sit' && p.state !== 'dash' && p.onGround) {
        for (const it of this.interactables) {
          if (Math.abs(p.x - it.x) < it.w / 2 && Math.abs(p.y - it.y) < 20) { best = it; break; }
        }
      }
      if (best !== this.activeInteract) {
        this.activeInteract = best;
        AK.setInteract(best ? best.label : null);
        this.promptArrow.setVisible(!!best);
      }
      if (best) this.promptArrow.setPosition(best.x, best.y - 30 + Math.round(Math.sin(this.time.now / 220) * 2));
      if (AK.input.consume('interact') && best) best.use();
    }

    update(time) {
      if (this.physics.world.isPaused) return;
      const p = this.player;
      p.update(time, AK.input);
      this.updateInteract();
      for (const e of this.enemies.getChildren().slice()) e.update(time, p);
      if (this.boss || this.hazards) this.updateBoss(time);
      this.updateProjectiles(time);

      if (p.onGround && p.state !== 'dash') { this.safePos.x = p.x; this.safePos.y = p.y; }

      // çukura düşünce son güvenli noktaya dön
      // (düşmek bir cana mal olur)
      if (p.y > this.worldH + 60 && !p.dead) {
        p.setPosition(this.safePos.x - p.facing * 20, this.safePos.y - 4);
        p.body.setVelocity(0, 0);
        p.hp = Math.max(0, p.hp - 1);
        p.invulnUntil = time + AK.TUNING.invulnMs;
        if (p.hp === 0) {
          p.dead = true;
          this.onPlayerDamaged('dead');
        } else {
          this.hudLoseHp();
          this.cameras.main.flash(250, 20, 25, 45);
        }
      }

      // kamera bakış yönüne doğru biraz öne kayar
      const cam = this.cameras.main;
      cam.followOffset.x = Phaser.Math.Linear(cam.followOffset.x, -p.facing * 28, 0.04);

      // paralaks
      this.bgFar.tilePositionX = cam.scrollX * 0.12;
      this.bgMid.tilePositionX = cam.scrollX * 0.35;
      this.fog.tilePositionX = cam.scrollX * 1.2 + time * 0.008;
    }
  }

  AK.GameScene = GameScene;
})();
