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
    takeHit(dir, dmg = 1) {
      if (this.dead) return false;
      this.hp -= dmg;
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
      AK.sfx('enemyDie');
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
    constructor(scene, x, y, look) {
      look = look || { tex: 'flyer', anim: 'flyer-fly', tint: [0x3a2d4f, 0x5a4877, 0xff9a3c], body: [14, 12, 5, 4] };
      super(scene, x, y, look.tex, 'f0', { hp: 3, knock: 170, coins: 4, tint: look.tint });
      this.body.setAllowGravity(false);
      this.body.setSize(look.body[0], look.body[1]).setOffset(look.body[2], look.body[3]);
      this.home = { x, y };
      this.aggro = false;
      this.phase = Math.random() * Math.PI * 2;
      this.play(look.anim);
    }

    update(time, player) {
      if (this.dead) return;
      const tx = player.x, ty = player.y - 14;
      const d = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
      if (!this.aggro && d < 165) this.aggro = true;
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
            AK.sfx('windup');
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

    takeHit(dir, dmg) {
      // vurulunca hazırlığı / hücumu bozulur ve kısa bir süre tekrar saldıramaz
      const r = super.takeHit(dir, dmg);
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

  // ======================= Orman düşmanları =======================

  // Mantarcık: oyuncuyu görünce zıplaya zıplaya yaklaşır
  class Mushroom extends Enemy {
    constructor(scene, x, y) {
      super(scene, x, y, 'mushroom', 'idle', { hp: 2, knock: 150, coins: 3, tint: [0xb8324a, 0xe8dcc4, 0xffffff] });
      this.setOrigin(0.5, 1);
      this.body.setSize(14, 14).setOffset(3, 6);
      this.mode = 'idle';
      this.modeEnd = 0;
      this.nextHop = 0;
    }

    update(time, player) {
      if (this.dead || this.stunned(time)) return;
      const b = this.body;
      const dx = player.x - this.x;
      if (this.mode === 'idle') {
        b.setVelocityX(0);
        if (b.blocked.down && time > this.nextHop && Math.abs(dx) < 150 && Math.abs(player.y - this.y) < 70 && !player.dead) {
          this.dir = Math.sign(dx) || this.dir;
          this.mode = 'squash';
          this.modeEnd = time + 260;
          this.setFrame('squash');
        }
      } else if (this.mode === 'squash') {
        if (time >= this.modeEnd) {
          // kenarda ise yerinde zıplar, düşmez
          const vx = this.blockedAhead() ? 0 : this.dir * 95;
          b.setVelocity(vx, -290);
          this.mode = 'air';
          this.setFrame('air');
          this.airborneAt = time;
        }
      } else if (this.mode === 'air') {
        if (b.blocked.down && time - this.airborneAt > 100) {
          b.setVelocityX(0);
          this.mode = 'idle';
          this.setFrame('idle');
          this.nextHop = time + 650;
          this.scene.fx.dust.explode(3, this.x, this.y);
        }
      }
      this.setFlipX(this.dir < 0);
    }
  }

  // Diken Arısı: havada süzülür, titreyip oyuncunun üstüne dalar, sonra yerine döner
  class Wasp extends Enemy {
    constructor(scene, x, y) {
      super(scene, x, y, 'wasp', 'f0', { hp: 2, knock: 160, coins: 4, tint: [0xf2c75a, 0x2a2016, 0xffffff] });
      this.body.setAllowGravity(false);
      this.body.setSize(14, 10).setOffset(4, 6);
      this.home = { x, y };
      this.mode = 'hover';
      this.modeEnd = 0;
      this.next = 0;
      this.phase = Math.random() * Math.PI * 2;
      this.play('wasp-fly');
    }

    update(time, player) {
      if (this.dead || this.stunned(time)) return;
      const b = this.body;
      const tx = player.x, ty = player.y - 12;
      const dx = tx - this.x, dy = ty - this.y;
      switch (this.mode) {
        case 'hover': {
          const gx = this.home.x + Math.sin(time / 700 + this.phase) * 30;
          const gy = this.home.y + Math.sin(time / 350 + this.phase) * 8;
          b.setVelocity((gx - this.x) * 2, (gy - this.y) * 2);
          this.dir = Math.sign(dx) || this.dir;
          if (time > this.next && Math.abs(dx) < 150 && dy > -20 && dy < 190 && !player.dead) {
            this.mode = 'windup';
            this.modeEnd = time + 450;
            this.anims.stop();
            this.setFrame('dive');
            this.setTint(0xffa060);
          }
          break;
        }
        case 'windup':
          b.setVelocity(0, -10);
          this.x += Math.sin(time * 0.9) * 0.6;
          if (time >= this.modeEnd) {
            const d = Math.hypot(dx, dy) || 1;
            b.setVelocity((dx / d) * 220, (dy / d) * 220);
            this.clearTint();
            this.mode = 'dive';
            this.modeEnd = time + 900;
          }
          break;
        case 'dive':
          if (time >= this.modeEnd || b.blocked.down || b.blocked.left || b.blocked.right) {
            this.mode = 'return';
            this.play('wasp-fly');
          }
          break;
        case 'return': {
          const hx = this.home.x - this.x, hy = this.home.y - this.y, d = Math.hypot(hx, hy);
          if (d < 6) { this.mode = 'hover'; this.next = time + 1100; break; }
          b.setVelocity((hx / d) * 80, (hy / d) * 80);
          this.dir = Math.sign(hx) || this.dir;
          break;
        }
      }
      this.setFlipX(this.dir < 0);
    }

    takeHit(dir, dmg) {
      const r = super.takeHit(dir, dmg);
      if (r && !this.dead) { this.mode = 'return'; this.clearTint(); this.play('wasp-fly'); }
      return r;
    }
  }

  // Diken Sarmaşığı: yerinden kıpırdamaz, oyuncuya diken fırlatır
  class Thorn extends Enemy {
    constructor(scene, x, y) {
      super(scene, x, y, 'thorn', 'idle', { hp: 3, knock: 0, coins: 4, tint: [0x4f8a3a, 0x7fbf5a, 0xd8e8a0] });
      this.setOrigin(0.5, 1);
      this.body.setSize(12, 22).setOffset(5, 4);
      this.body.setAllowGravity(false); // yere kök salmış: hiç kıpırdamaz
      this.next = 0;
      this.firing = 0;
    }

    update(time, player) {
      if (this.dead) return;
      this.body.setVelocity(0, 0);
      const dx = player.x - this.x;
      if (!this.firing) this.dir = Math.sign(dx) || this.dir;
      if (!this.firing && time > this.next && Math.abs(dx) < 210 && Math.abs(player.y - this.y) < 60 && !player.dead) {
        this.firing = time + 320;
        this.setFrame('open');
        this.setTint(0xffe080);
      }
      if (this.firing && time >= this.firing) {
        this.firing = 0;
        this.clearTint();
        this.setFrame('idle');
        this.next = time + 1700;
        this.scene.fireProjectile(this.x + this.dir * 8, this.y - 16, this.dir * 150, 0, 'thornshot');
        AK.sfx('shoot');
      }
      this.setFlipX(this.dir < 0);
    }
  }

  // ======================= Şehir düşmanları =======================

  // Kalkanlı Nöbetçi: önden gelen kılıç darbelerini kalkanla engeller; mızrakla saplar
  class Guard extends Enemy {
    constructor(scene, x, y) {
      super(scene, x, y, 'guard', 'walk0', { hp: 3, knock: 90, coins: 6, tint: [0x463e60, 0x7d72a0, 0xc88a22] });
      this.setOrigin(0.5, 1);
      this.body.setSize(14, 24).setOffset(8, 8);
      this.mode = 'patrol';
      this.modeEnd = 0;
      this.next = 0;
      this.turnAt = 0; // oyuncu arkasına geçince dönmesi gecikir: arkadan vurma fırsatı
      this.play('guard-walk');
    }

    // kalkan önde mi? (saldırı anında açıkta kalır)
    shieldsFrom(attackerX) {
      if (this.mode === 'thrust' || this.mode === 'rest' || this.dead) return false;
      return Math.sign(attackerX - this.x) === this.dir;
    }

    update(time, player) {
      if (this.dead || this.stunned(time)) return;
      const b = this.body;
      const dx = player.x - this.x, dy = player.y - this.y;
      switch (this.mode) {
        case 'patrol':
          // oyuncuyu görünce ona döner ve yavaşça yaklaşır; arkasına geçilirse ancak bir süre sonra döner
          if (Math.abs(dx) < 140 && Math.abs(dy) < 40 && !player.dead && Math.sign(dx) !== this.dir) {
            if (!this.turnAt) this.turnAt = time + 700;
            if (time >= this.turnAt) { this.dir = Math.sign(dx) || this.dir; this.turnAt = 0; }
          } else {
            this.turnAt = 0;
          }
          if (time > this.next && Math.sign(dx) === this.dir && Math.abs(dx) < 62 && Math.abs(dy) < 30 && !player.dead) {
            this.mode = 'windup';
            this.modeEnd = time + 420;
            this.anims.stop();
            this.setFrame('windup');
            this.setTint(0xffa060);
            AK.sfx('windup');
            b.setVelocityX(0);
            break;
          }
          if (this.blockedAhead()) this.turn();
          b.setVelocityX(this.dir * 22);
          if (!this.anims.isPlaying) this.play('guard-walk');
          break;
        case 'windup':
          b.setVelocityX(0);
          if (time >= this.modeEnd) {
            this.clearTint();
            this.setFrame('thrust');
            this.mode = 'thrust';
            this.modeEnd = time + 220;
          }
          break;
        case 'thrust':
          b.setVelocityX(this.blockedAhead() ? 0 : this.dir * 170);
          if (time >= this.modeEnd) { this.mode = 'rest'; this.modeEnd = time + 600; b.setVelocityX(0); }
          break;
        case 'rest':
          b.setVelocityX(0);
          if (time >= this.modeEnd) { this.mode = 'patrol'; this.next = time + 900; this.setFrame('walk0'); }
          break;
      }
      this.setFlipX(this.dir < 0);
    }
  }

  // Çatı Okçusu: mesafesini korur, yayını gerip oyuncuya nişan alarak ok atar
  class Archer extends Enemy {
    constructor(scene, x, y) {
      super(scene, x, y, 'archer', 'idle', { hp: 2, knock: 130, coins: 5, tint: [0x3a3352, 0xe8dcc4, 0x7a5236] });
      this.setOrigin(0.5, 1);
      this.body.setSize(12, 22).setOffset(6, 6);
      this.drawUntil = 0;
      this.next = 0;
    }

    update(time, player) {
      if (this.dead || this.stunned(time)) return;
      const b = this.body;
      const dx = player.x - this.x, ady = Math.abs(player.y - this.y);
      if (!this.drawUntil) this.dir = Math.sign(dx) || this.dir;
      // çok yaklaşılırsa oyuncuya dönük kalarak geri çekil (kenardan düşmeden)
      b.setVelocityX(0);
      if (!this.drawUntil && Math.abs(dx) < 70 && ady < 40) {
        const face = this.dir;
        this.dir = -face; // blockedAhead geri çekilme yönüne baksın
        if (!this.blockedAhead()) b.setVelocityX(this.dir * 45);
        this.dir = face;
      }
      if (!this.drawUntil && time > this.next && Math.abs(dx) < 230 && ady < 170 && !player.dead) {
        const sx = this.x + this.dir * 10, sy = this.y - 14;
        if (this.scene.hasLineOfSight(sx, sy, player.x, player.y - 14)) {
          this.drawUntil = time + 650;
          this.setFrame('draw');
        } else if (!this.blockedAhead() && Math.abs(dx) > 40) {
          // görüş kapalı (çatı kenarı / bina): kenara doğru ilerle
          b.setVelocityX(this.dir * 35);
        }
      }
      if (this.drawUntil && time >= this.drawUntil) {
        this.drawUntil = 0;
        this.next = time + 1600;
        this.setFrame('idle');
        const sx = this.x + this.dir * 10, sy = this.y - 14;
        const tx = player.x - sx, ty = player.y - 14 - sy, d = Math.hypot(tx, ty) || 1;
        this.scene.fireProjectile(sx, sy, (tx / d) * 200, (ty / d) * 200, 'arrow');
        AK.sfx('shoot');
      }
      this.setFlipX(this.dir < 0);
    }
  }

  // Lağım Faresi: küçük ve hızlı; görünce koşarak saldırır
  class Rat extends Enemy {
    constructor(scene, x, y) {
      super(scene, x, y, 'rat', 'r0', { hp: 1, knock: 160, coins: 1, tint: [0x5a5470, 0x7a7490, 0xd08a9a] });
      this.setOrigin(0.5, 1);
      this.body.setSize(14, 8).setOffset(4, 3);
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.play('rat-run');
    }

    update(time, player) {
      if (this.dead || this.stunned(time)) return;
      const dx = player.x - this.x;
      const chasing = Math.abs(dx) < 170 && Math.abs(player.y - this.y) < 30 && !player.dead;
      if (chasing) this.dir = Math.sign(dx) || this.dir;
      if (this.blockedAhead()) { if (chasing) { this.body.setVelocityX(0); this.setFlipX(this.dir < 0); return; } this.turn(); }
      this.body.setVelocityX(this.dir * (chasing ? 115 : 40));
      this.anims.timeScale = chasing ? 1.6 : 0.8;
      this.setFlipX(this.dir < 0);
    }
  }

  // Yarasa: Gölge Sinek gibi kovalar, şehir görünümüyle
  class Bat extends Flyer {
    constructor(scene, x, y) {
      super(scene, x, y, { tex: 'bat', anim: 'bat-fly', tint: [0x3a2a4a, 0x4a3a5e, 0xff4a6a], body: [12, 10, 6, 4] });
      this.hp = 2;
    }
  }

  // ======================= Mermiler (diken, ok) =======================
  // Kalkanla engellenir, kılıçla havada kesilebilir, duvara çarpınca kırılır.
  class Projectile extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, vx, vy, tex) {
      super(scene, x, y, tex);
      scene.add.existing(this);
      scene.physics.add.existing(this);
      this.setDepth(9);
      this.body.setAllowGravity(false);
      this.body.setSize(Math.min(8, this.width), 3);
      this.body.setVelocity(vx, vy);
      this.setRotation(Math.atan2(vy, vx));
      this.dieAt = scene.time.now + 3000;
      this.solidAt = scene.time.now + 60; // ~12 px: bkz. GameScene mermi çarpışması
    }
  }

  AK.ENEMY_TYPES = { crawler: Crawler, flyer: Flyer, husk: Husk, mushroom: Mushroom, wasp: Wasp, thorn: Thorn, guard: Guard, archer: Archer, rat: Rat, bat: Bat };
  AK.FLYING_TYPES = ['flyer', 'wasp', 'bat'];
  AK.Projectile = Projectile;
  AK.Coin = Coin;
})();
