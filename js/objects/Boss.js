// Kabuk Kral: Altın Salon'un bossu.
// Saldırılar:
//  - Hücum: turuncu parlayıp hazırlanır, sonra duvara kadar koşar (duvara çarpınca sersemler)
//  - Sıçrayıp ezme: oyuncunun üstüne sıçrar, yere inince iki yana şok dalgası yollar
// Canı yarıya inince öfkelenir: daha hızlı saldırır ve tavandan kaya düşürür.
(function () {
  const AK = (window.AK = window.AK || {});

  const MAX_HP = 20;

  class Boss extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, arena) {
      super(scene, x, y, 'king', 'idle0');
      scene.add.existing(this);
      scene.physics.add.existing(this);
      this.setOrigin(0.5, 1).setDepth(9);
      this.body.setSize(26, 40).setOffset(19, 16);
      this.arena = arena; // { left, right } dünya x sınırları
      this.maxHp = MAX_HP;
      this.hp = MAX_HP;
      this.mode = 'dormant';
      this.modeEnd = 0;
      this.dir = -1;
      this.enraged = false;
      this.dead = false;
      this.airborne = false;
      this.setFlipX(true);
      this.play('king-idle');
    }

    hitRect() {
      const b = this.body;
      return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
    }

    setMode(mode, ms) {
      this.mode = mode;
      this.modeEnd = this.scene.time.now + ms;
    }

    pose(frame) {
      this.anims.stop();
      this.setFrame(frame);
    }

    // Oyuncu arenaya girince
    awaken() {
      if (this.mode !== 'dormant') return;
      this.setMode('intro', 1600);
      this.pose('windup');
      AK.sfx('roar');
      this.scene.cameras.main.shake(900, 0.008);
    }

    update(time, player) {
      if (this.dead || this.mode === 'dormant') return;
      const b = this.body;
      const fast = this.enraged;
      const dx = player.x - this.x;

      switch (this.mode) {
        case 'intro':
          if (time >= this.modeEnd) this.toIdle();
          break;

        case 'idle':
          b.setVelocityX(0);
          this.dir = Math.sign(dx) || this.dir;
          if (time >= this.modeEnd && !player.dead) this.chooseAttack(Math.abs(dx));
          break;

        // ---- hücum ----
        case 'chargeWindup':
          b.setVelocityX(0);
          this.x += Math.sin(time * 0.8) * 0.5;
          if (time >= this.modeEnd) {
            this.clearTint();
            this.pose('charge');
            this.setMode('charge', 1800);
            this.scene.fx.dashBurst(this.x, this.y - 10, this.dir);
            AK.sfx('dash');
          }
          break;
        case 'charge': {
          b.setVelocityX(this.dir * (fast ? 300 : 245));
          const hitWall = (this.dir < 0 && b.blocked.left) || (this.dir > 0 && b.blocked.right);
          if (hitWall) {
            b.setVelocityX(-this.dir * 60);
            this.scene.cameras.main.shake(250, 0.012);
            AK.sfx('slam');
            if (fast) this.scene.dropRocks(3);
            this.pose('idle0');
            this.setMode('stunned', fast ? 650 : 950);
          } else if (time >= this.modeEnd) {
            this.toIdle();
          }
          break;
        }
        case 'stunned':
          b.setVelocityX(b.velocity.x * 0.9);
          if (time >= this.modeEnd) this.toIdle();
          break;

        // ---- sıçrayıp ezme ----
        case 'leapWindup':
          b.setVelocityX(0);
          if (time >= this.modeEnd) {
            const T = 0.85;
            const tx = Phaser.Math.Clamp(player.x, this.arena.left + 24, this.arena.right - 24);
            b.setVelocity((tx - this.x) / T, -425);
            this.dir = Math.sign(tx - this.x) || this.dir;
            this.pose('leap');
            this.airborne = false;
            this.setMode('leap', 2500);
            AK.sfx('jump');
          }
          break;
        case 'leap':
          if (!b.blocked.down) this.airborne = true;
          if (this.airborne && b.blocked.down) {
            b.setVelocityX(0);
            this.pose('slam');
            this.scene.bossSlam(this.x, this.y, fast);
            this.setMode('recover', fast ? 450 : 750);
          } else if (time >= this.modeEnd) {
            this.toIdle();
          }
          break;
        case 'recover':
          b.setVelocityX(0);
          if (time >= this.modeEnd) this.toIdle();
          break;
      }
      this.setFlipX(this.dir < 0);
    }

    toIdle() {
      this.clearTint();
      this.play('king-idle', true);
      this.setMode('idle', this.enraged ? 450 : 850);
    }

    chooseAttack(dist) {
      const r = Math.random();
      const charge = dist > 90 ? r < 0.55 : r < 0.25;
      if (charge) {
        this.pose('windup');
        this.setTint(0xffa060);
        this.setMode('chargeWindup', this.enraged ? 420 : 650);
        AK.sfx('windup');
      } else {
        this.pose('windup');
        this.setMode('leapWindup', this.enraged ? 280 : 420);
      }
    }

    takeHit(dmg) {
      if (this.dead || this.mode === 'dormant') return false;
      this.hp = Math.max(0, this.hp - dmg);
      this.setTintFill(0xffffff);
      this.scene.time.delayedCall(70, () => {
        if (this.dead) return;
        if (this.mode === 'chargeWindup') this.setTint(0xffa060);
        else this.clearTint();
      });
      // öfke evresi
      if (!this.enraged && this.hp <= this.maxHp / 2) {
        this.enraged = true;
        AK.sfx('roar');
        AK.toast('KABUK KRAL ÖFKELENDİ!', 1600);
        this.scene.cameras.main.shake(600, 0.01);
      }
      if (this.hp === 0) this.die();
      return true;
    }

    die() {
      this.dead = true;
      this.mode = 'dead';
      this.body.setVelocity(0, 0);
      this.pose('slam');
      this.setTint(0xffffff);
      this.scene.onBossDefeated(this);
    }
  }

  AK.Boss = Boss;
})();
