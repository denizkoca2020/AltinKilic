// Düşmanlar ve düşürdükleri altın paralar.
//  - Kabukböcek (crawler): platformda gidip gelir, kenara gelince döner.
//  - Gölge Sinek (flyer): havada süzülür, oyuncu yaklaşınca kovalar.
//  - Kabuk Muhafız (husk): devriye gezer, oyuncuyu görünce hazırlanıp hücum eder.
(function () {
  const AK = (window.AK = window.AK || {});

  class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, frame, cfg) {
      super(scene, x, y, texture, frame);
      scene.add.existing(this);
      scene.physics.add.existing(this);
      this.setDepth(9);
      this.hp = cfg.hp;
      this.knock = cfg.knock;
      this.coinDrop = cfg.coins;
      this.burstTint = cfg.tint;
      this.dir = -1;
      this.stunUntil = 0;
      this.dead = false;
    }

    hitRect() {
      const b = this.body;
      return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
    }

    stunned(time) {
      return time < this.stunUntil;
    }

    // Kılıç darbesi: geri itilir, beyaz parlar; can biterse ölür
    takeHit(dir) {
      if (this.dead) return false;
      this.hp--;
      this.stunUntil = this.scene.time.now + 200;
      this.body.setVelocityX(dir * this.knock);
      if (!this.body.allowGravity) this.body.setVelocityY(-40);
      this.setTintFill(0xffffff);
      this.scene.time.delayedCall(80, () => { if (!this.dead) this.clearTint(); });
      if (this.hp <= 0) this.die(dir);
      return true;
    }

    // Kalkana çarpınca geri sekme
    bounceOff(dir) {
      this.stunUntil = this.scene.time.now + 250;
      this.body.setVelocityX(dir * this.knock * 0.8);
    }

    die(dir) {
      this.dead = true;
      this.body.enable = false;
      const cy = this.y - this.displayHeight * this.originY + this.displayHeight / 2;
      this.scene.fx.enemyBurst(this.x, cy, this.burstTint);
      this.scene.spawnCoins(this.x, cy, this.coinDrop);
      this.setTintFill(0xffffff);
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        angle: dir * 70,
        y: this.y - 6,
        duration: 260,
        onComplete: () => this.destroy(),
      });
    }

    // önünde duvar veya uçurum var mı?
    blockedAhead() {
      const b = this.body;
      if ((this.dir < 0 && b.blocked.left) || (this.dir > 0 && b.blocked.right)) return true;
      if (!b.blocked.down) return false;
      const fx = this.dir > 0 ? b.right + 2 : b.left - 2;
      return !this.scene.isSolidAt(fx, b.bottom + 2);
    }

    turn() {
      this.dir = -this.dir;
    }
  }

  // ---------- Kabukböcek ----------
  class Crawler extends Enemy {
    constructor(scene, x, y) {
      super(scene, x, y, 'crawler', 'w0', { hp: 2, knock: 140, coins: 3, tint: [0xb4582c, 0xe08a4f, 0x3b2b2b] });
      this.setOrigin(0.5, 1);
      this.body.setSize(18, 10).setOffset(2, 4);
      this.play('crawler-walk');
    }

    update(time) {
      if (this.dead) return;
      if (this.stunned(time)) return;
      if (this.blockedAhead()) this.turn();
      this.body.setVelocityX(this.dir * 28);
      this.setFlipX(this.dir < 0);
    }
  }

  // ---------- Gölge Sinek ----------
  class Flyer extends Enemy {
    constructor(scene, x, y) {
      super(scene, x, y, 'flyer', 'f0', { hp: 3, knock: 170, coins: 4, tint: [0x3a2d4f, 0x5a4877, 0xff9a3c] });
      this.body.setAllowGravity(false);
      this.body.setSize(14, 12).setOffset(5, 4);
      this.home = { x, y };
      this.aggro = false;
      this.phase = Math.random() * Math.PI * 2;
      this.play('flyer-fly');
    }

    update(time, player) {
      if (this.dead) return;
      const tx = player.x, ty = player.y - 14;
      const d = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
      if (!this.aggro && d < 140) this.aggro = true;
      if (this.aggro && d > 260) this.aggro = false;
      if (this.stunned(time)) return;

      let gx, gy, speed;
      if (this.aggro) {
        gx = tx; gy = ty + Math.sin(time / 260 + this.phase) * 8; speed = 62;
      } else {
        gx = this.home.x + Math.sin(time / 900 + this.phase) * 24;
        gy = this.home.y + Math.sin(time / 400 + this.phase) * 6;
        speed = 30;
      }
      const ang = Math.atan2(gy - this.y, gx - this.x);
      const dist = Phaser.Math.Distance.Between(this.x, this.y, gx, gy);
      const s = Math.min(speed, dist * 3);
      const v = this.body.velocity;
      v.x = Phaser.Math.Linear(v.x, Math.cos(ang) * s, 0.05);
      v.y = Phaser.Math.Linear(v.y, Math.sin(ang) * s, 0.05);
      if (Math.abs(tx - this.x) > 4 && this.aggro) this.dir = Math.sign(tx - this.x);
      else if (Math.abs(v.x) > 3) this.dir = Math.sign(v.x);
      this.setFlipX(this.dir < 0);
    }
  }

  // ---------- Kabuk Muhafız ----------
  class Husk extends Enemy {
    constructor(scene, x, y) {
      super(scene, x, y, 'husk', 'walk0', { hp: 4, knock: 110, coins: 6, tint: [0x6e6150, 0xe6e0d2, 0x9a5b3a] });
      this.setOrigin(0.5, 1);
      this.body.setSize(12, 24).setOffset(8, 8);
      this.mode = 'patrol';
      this.modeEnd = 0;
      this.nextAttack = 0;
      this.play('husk-walk');
    }

    setMode(mode, time, ms) {
      this.mode = mode;
      this.modeEnd = time + ms;
    }

    update(time, player) {
      if (this.dead) return;
      if (this.stunned(time)) return;
      const b = this.body;

      switch (this.mode) {
        case 'patrol': {
          const dx = player.x - this.x, dy = player.y - this.y;
          if (time > this.nextAttack && Math.abs(dx) < 120 && Math.abs(dy) < 40 && !player.dead) {
            this.dir = Math.sign(dx) || this.dir;
            this.setMode('windup', time, 450);
            this.anims.stop();
            this.setFrame('windup');
            this.setTint(0xffb070);
            b.setVelocityX(0);
            break;
          }
          if (this.blockedAhead()) this.turn();
          b.setVelocityX(this.dir * 24);
          if (!this.anims.isPlaying) this.play('husk-walk');
          break;
        }
        case 'windup':
          b.setVelocityX(0);
          // hazırlanırken titrer
          this.x += Math.sin(time * 0.9) * 0.4;
          if (time >= this.modeEnd) {
            this.clearTint();
            this.setFrame('charge');
            this.setMode('charge', time, 480);
            this.scene.fx.dashBurst(this.x, this.y - 10, this.dir);
          }
          break;
        case 'charge':
          if (this.blockedAhead() || time >= this.modeEnd) {
            b.setVelocityX(0);
            this.setFrame('walk0');
            this.setMode('rest', time, 550);
          } else {
            b.setVelocityX(this.dir * 210);
          }
          break;
        case 'rest':
          b.setVelocityX(0);
          if (time >= this.modeEnd) {
            this.mode = 'patrol';
            this.nextAttack = time + 1100;
          }
          break;
      }
      this.setFlipX(this.dir < 0);
    }

    takeHit(dir) {
      // vurulunca hazırlığı / hücumu bozulur ve kısa bir süre tekrar saldıramaz
      const r = super.takeHit(dir);
      if (r && !this.dead) {
        this.mode = 'patrol';
        this.nextAttack = this.scene.time.now + 700;
        this.anims.stop();
        this.setFrame('walk0');
      }
      return r;
    }
  }

  // ---------- Altın para ----------
  class Coin extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
      super(scene, x, y, 'coin', 'c0');
      scene.add.existing(this);
      scene.physics.add.existing(this);
      this.setDepth(8);
      this.body.setSize(5, 5).setOffset(1, 1);
      this.body.setBounce(0.45, 0.45);
      this.body.setDragX(80);
      this.body.setMaxVelocityY(380);
      this.body.setVelocity(Phaser.Math.Between(-70, 70), Phaser.Math.Between(-220, -130));
      this.collectableAt = scene.time.now + 250;
      this.play({ key: 'coin-spin', startFrame: Phaser.Math.Between(0, 3) });
    }
  }

  AK.ENEMY_TYPES = { crawler: Crawler, flyer: Flyer, husk: Husk };
  AK.Coin = Coin;
})();
