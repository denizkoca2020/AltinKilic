// Boss arenası: GameScene'e eklenen yöntemler.
// Oyuncu arenaya girince iki yandaki demir parmaklıklar iner, boss uyanır, can barı görünür.
// Boss yenilince parmaklıklar kalkar ve arkadaki altın sunak açılır.
(function () {
  const AK = (window.AK = window.AK || {});
  const T = 16;
  const GATE_TOP = 2 * T; // tavanın hemen altı
  const GATE_H = 17 * T; // zemine kadar

  const BossArena = {
    setupBoss(def, shrineDef) {
      const floorY = (def.y + 1) * T;
      this.arena = { left: (def.gateL + 1) * T, right: def.gateR * T, triggerX: def.trigger * T, floorY };
      this.hazards = this.add.group();
      this.physics.add.overlap(this.player, this.hazards, (p, h) => this.onHazardContact(h));
      this.physics.add.collider(this.hazards, this.ground, (h) => { if (h.isRock) this.breakRock(h); });

      // demir parmaklıklar: görüntü (tileSprite) + çarpışma bölgesi (zone)
      this.gates = [def.gateL, def.gateR].map((gx) => {
        const x = gx * T + T / 2;
        const img = this.add.tileSprite(x, GATE_TOP, 16, GATE_H, 'gate').setOrigin(0.5, 0).setDepth(5);
        const zone = this.add.zone(x, GATE_TOP + GATE_H / 2, 12, GATE_H);
        this.physics.add.existing(zone, true);
        this.physics.add.collider(this.player, zone);
        return { img, zone };
      });

      const defeated = !!AK.save.bossKing;
      // giriş kapısı açık başlar; çıkış kapısı boss yenilene kadar kapalı
      this.setGate(this.gates[0], false, true);
      this.setGate(this.gates[1], !defeated, true);

      if (!defeated) {
        this.boss = new AK.Boss(this, def.x * T + T / 2, floorY, this.arena);
        this.physics.add.collider(this.boss, this.ground);
        this.gates.forEach((g) => this.physics.add.collider(this.boss, g.zone));
        this.physics.add.overlap(this.player, this.boss, () => {
          if (this.boss.mode !== 'dormant' && !this.boss.dead) this.onEnemyContact(this.boss);
        });
      }
      this.createBossBar();

      // ödül sunağı
      if (shrineDef) {
        const sx = shrineDef.x * T + T / 2, sy = (shrineDef.y + 1) * T;
        this.add.image(sx, sy - 18, 'glow').setDepth(0).setScale(1.8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
        this.add.image(sx, sy, 'shrine').setOrigin(0.5, 1).setDepth(4);
        if (!AK.save.shrineTaken) {
          const it = { x: sx, y: sy, w: 34, label: 'AL', use: () => this.takeShrine(it, sx, sy) };
          this.interactables.push(it);
        }
      }
    },

    setGate(g, closed, instant) {
      const closedY = GATE_TOP, openY = GATE_TOP - GATE_H - 8;
      g.zone.body.enable = closed;
      this.tweens.killTweensOf(g.img);
      if (instant) { g.img.y = closed ? closedY : openY; return; }
      this.tweens.add({
        targets: g.img, y: closed ? closedY : openY, duration: closed ? 350 : 1200,
        ease: closed ? 'Cubic.easeIn' : 'Sine.easeInOut',
        onComplete: () => { if (closed) { this.cameras.main.shake(200, 0.008); AK.sfx('slam'); } },
      });
    },

    // ---------- Can barı (ekranın üst ortası) ----------
    createBossBar() {
      this.bossBarBg = this.add.rectangle(0, 16, 10, 7, 0x0b0a12).setStrokeStyle(1, 0xc88a22).setScrollFactor(0).setDepth(100).setVisible(false);
      this.bossBarFill = this.add.rectangle(0, 16, 10, 5, 0xd0304a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101).setVisible(false);
      this.layoutBossBar();
    },

    layoutBossBar() {
      if (!this.bossBarBg) return;
      const w = Math.min(160, this.scale.gameSize.width - 170);
      this.bossBarW = w;
      const cx = this.scale.gameSize.width / 2 + 20;
      this.bossBarBg.setPosition(cx, 16).setSize(w + 4, 7);
      this.bossBarBg.setDisplaySize(w + 4, 7);
      this.bossBarFill.setPosition(cx - w / 2, 16);
      this.updateBossBar();
    },

    updateBossBar() {
      const b = this.boss;
      if (!b || !this.bossBarFill) return;
      const k = b.hp / b.maxHp;
      this.bossBarFill.setDisplaySize(Math.max(0, this.bossBarW * k), 5);
      this.bossBarFill.setFillStyle(b.enraged ? 0xff5a2a : 0xd0304a);
    },

    showBossBar(on) {
      this.bossBarBg.setVisible(on);
      this.bossBarFill.setVisible(on);
    },

    // ---------- Kare güncellemesi ----------
    updateBoss(time) {
      const b = this.boss;
      const p = this.player;
      if (b && b.mode === 'dormant' && p.x > this.arena.triggerX && !p.dead) {
        this.setGate(this.gates[0], true);
        b.awaken();
        AK.audio.playMusic('boss');
        AK.toast('KABUK KRAL', 2200);
        this.showBossBar(true);
        this.updateBossBar();
      }
      if (b && !b.dead) b.update(time, p);
      // şok dalgaları duvara ya da arena sınırına gelince söner
      for (const h of this.hazards.getChildren().slice()) {
        if (h.isRock) continue;
        if (h.body.blocked.left || h.body.blocked.right || h.x < this.arena.left || h.x > this.arena.right || time > h.dieAt) {
          this.fx.dust.explode(4, h.x, h.y - 2);
          h.destroy();
        }
      }
    },

    // Boss yere indi: şok dalgası (+ öfkeliyse kaya yağmuru)
    bossSlam(x, y, enraged) {
      AK.sfx('slam');
      this.cameras.main.shake(300, 0.014);
      this.fx.landDust(x - 14, y);
      this.fx.landDust(x + 14, y);
      [-1, 1].forEach((dir) => {
        const s = this.physics.add.sprite(x + dir * 16, y, 'shock', 'a').setOrigin(0.5, 1).setDepth(9);
        s.body.setAllowGravity(false);
        s.body.setSize(14, 10).setOffset(2, 4);
        s.body.setVelocityX(dir * (enraged ? 200 : 165));
        s.setFlipX(dir < 0);
        s.play('shock');
        s.dieAt = this.time.now + 2600;
        this.hazards.add(s);
      });
      if (enraged) this.dropRocks(4);
    },

    // Tavandan kaya düşür (önce toz dökülür, sonra kaya)
    dropRocks(n) {
      const { left, right } = this.arena;
      for (let i = 0; i < n; i++) {
        // birini doğrudan oyuncunun üstüne at
        const x = i === 0 ? Phaser.Math.Clamp(this.player.x, left + 10, right - 10) : Phaser.Math.Between(left + 10, right - 10);
        const delay = 150 + i * 260;
        this.time.delayedCall(delay, () => this.fx.dust.explode(3, x, GATE_TOP + 2));
        this.time.delayedCall(delay + 450, () => {
          if (!this.sys.isActive()) return;
          const r = this.physics.add.sprite(x, GATE_TOP + 4, 'rock').setDepth(9);
          r.isRock = true;
          r.body.setSize(8, 8).setOffset(1, 1);
          r.body.setMaxVelocityY(360);
          r.setAngularVelocity(Phaser.Math.Between(-200, 200));
          this.hazards.add(r);
        });
      }
    },

    breakRock(r) {
      this.fx.dust.explode(6, r.x, r.y);
      AK.sfx('land');
      r.destroy();
    },

    onHazardContact(h) {
      const p = this.player;
      const res = p.hurt(h.x);
      if (!res) return;
      if (res === 'blocked') {
        this.fx.blockSparks(p.x + p.facing * 9, p.y - 10);
        AK.sfx('block');
      } else {
        this.onPlayerDamaged(res);
      }
      if (h.isRock) this.breakRock(h);
      else h.destroy();
    },

    // ---------- Zafer ----------
    onBossDefeated(b) {
      this.hazards.getChildren().slice().forEach((h) => h.destroy());
      this.updateBossBar();
      AK.save.bossKing = true;
      AK.saveGame();
      AK.audio.stopMusic();
      this.cameras.main.shake(1500, 0.006);
      // ardışık patlamalar
      for (let i = 0; i < 7; i++) {
        this.time.delayedCall(i * 170, () => {
          this.fx.enemyBurst(b.x + Phaser.Math.Between(-18, 18), b.y - Phaser.Math.Between(10, 44), [0x6e6150, 0xe6e0d2, 0xf2c75a, 0x5a2d6b]);
          AK.sfx('enemyDie');
        });
      }
      this.time.delayedCall(1300, () => {
        this.fx.enemyBurst(b.x, b.y - 28, [0xffffff, 0xf2c75a, 0xfff2b0]);
        this.cameras.main.flash(400, 255, 240, 200);
        AK.sfx('slam');
        this.spawnCoins(b.x, b.y - 30, 35);
        b.destroy();
        this.boss = null;
        this.showBossBar(false);
      });
      this.time.delayedCall(2300, () => {
        AK.sfx('victory');
        AK.toast('KABUK KRAL YENİLDİ', 3200);
        this.gates.forEach((g) => this.setGate(g, false));
      });
      this.time.delayedCall(5000, () => AK.audio.playMusic(this.level.music));
    },

    takeShrine(it, x, y) {
      this.interactables.splice(this.interactables.indexOf(it), 1);
      this.activeInteract = null;
      AK.setInteract(null);
      this.promptArrow.setVisible(false);
      AK.save.shrineTaken = true;
      AK.saveGame();
      AK.sfx('victory');
      this.cameras.main.flash(500, 255, 230, 160);
      this.spawnCoins(x, y - 30, 30);
      AK.toast('TEBRİKLER! ALTIN SALON FETHEDİLDİ', 4000);
    },
  };

  Object.assign(AK.GameScene.prototype, BossArena);
})();
