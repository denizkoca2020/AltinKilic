// Oyuncunun savaşçısı: hareket, değişken yükseklikte zıplama, kılıç saldırısı,
// kalkanla savunma ve atılma (dash).
(function () {
  const AK = (window.AK = window.AK || {});

  const TUNING = {
    runSpeed: 130,
    shieldSpeed: 45,
    jumpVelocity: -365,
    jumpCutVelocity: -70, // tuş bırakılınca yükselme bu hıza düşer (kısa zıplama)
    maxFall: 420,
    coyoteMs: 90, // kenardan düştükten hemen sonra hâlâ zıplanabilir
    jumpBufferMs: 130, // yere değmeden az önce basılan zıplama da sayılır
    attackCooldownMs: 330,
    attackDurationMs: 250,
    attackHitDelayMs: 55,
    dashSpeed: 370,
    dashMs: 170,
    dashCooldownMs: 480,
    maxHp: 5,
    hurtMs: 260, // darbe sonrası kontrolün kısa süre kaybı
    invulnMs: 1300, // darbe sonrası dokunulmazlık
    hurtKnockX: 170,
    hurtKnockY: -220,
    hitRecoil: 110, // düşmana vurunca geri tepme hızı
    blockRecoil: 150, // kalkanla engelleyince geri kayma
  };
  AK.TUNING = TUNING;

  class Warrior extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
      super(scene, x, y, 'warrior', 'idle0');
      scene.add.existing(this);
      scene.physics.add.existing(this);

      this.setOrigin(0.5, 1);
      this.body.setSize(10, 24);
      this.body.setOffset(15, 8);
      this.body.setMaxVelocityY(TUNING.maxFall);
      this.setDepth(10);

      this.facing = 1;
      this.state = 'normal'; // normal | attack | dash
      this.shielding = false;
      this.lastGroundAt = 0;
      this.jumpBufferUntil = 0;
      this.jumping = false;
      this.attackReadyAt = 0;
      this.attackEndAt = 0;
      this.attackHitAt = 0;
      this.dashReadyAt = 0;
      this.dashEndAt = 0;
      this.canAirDash = true;
      this.lastGhostAt = 0;
      this.wasOnGround = false;
      this.prevVy = 0;
      this.slash = null;
      this.hp = TUNING.maxHp;
      this.dead = false;
      this.hurtEndAt = 0;
      this.invulnUntil = 0;
      this.recoilUntil = 0;
      this.recoilVx = 0;

      this.play('w-idle');
    }

    get onGround() {
      return this.body.blocked.down || this.body.touching.down;
    }

    update(time, input) {
      const body = this.body;
      const onGround = this.onGround;
      if (this.dead) return;

      // dokunulmazken yanıp söner
      this.setAlpha(time < this.invulnUntil && Math.floor(time / 70) % 2 ? 0.35 : 1);

      if (onGround) {
        this.lastGroundAt = time;
        this.canAirDash = true;
        if (body.velocity.y >= 0) this.jumping = false;
      }

      // iniş efekti
      if (onGround && !this.wasOnGround && this.prevVy > 220) {
        this.scene.fx.landDust(this.x, this.y);
        AK.sfx('land');
      }
      this.wasOnGround = onGround;
      this.prevVy = body.velocity.y;

      if (input.consume('jump')) this.jumpBufferUntil = time + TUNING.jumpBufferMs;
      const wantAttack = input.consume('attack');
      const wantDash = input.consume('dash');

      // ---- Darbe aldı: kısa süre kontrol yok ----
      if (this.state === 'hurt') {
        if (time < this.hurtEndAt) { this.updateSlash(); return; }
        this.state = 'normal';
      }

      // ---- Atılma ----
      if (wantDash && time >= this.dashReadyAt && this.state !== 'dash' && (onGround || this.canAirDash)) {
        this.startDash(time, input, onGround);
      }
      if (this.state === 'dash') {
        if (time >= this.dashEndAt) {
          this.state = 'normal';
          body.setAllowGravity(true);
        } else {
          body.setVelocity(this.facing * TUNING.dashSpeed, 0);
          if (time - this.lastGhostAt > 28) {
            this.lastGhostAt = time;
            this.scene.fx.ghost(this);
          }
          this.updateSlash();
          return;
        }
      }

      // ---- Kalkan ----
      this.shielding = input.held.shield && this.state === 'normal';

      // ---- Yatay hareket ----
      const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
      const speed = this.shielding && onGround ? TUNING.shieldSpeed : TUNING.runSpeed;
      body.setVelocityX(time < this.recoilUntil ? this.recoilVx : dir * speed);
      // saldırı sırasında yön kilitlenir; kalkanla geri geri yürünebilir
      if (dir !== 0 && this.state !== 'attack' && !this.shielding) this.facing = dir;
      this.setFlipX(this.facing < 0);

      // ---- Zıplama ----
      const canJump = onGround || time - this.lastGroundAt < TUNING.coyoteMs;
      if (time < this.jumpBufferUntil && canJump && !this.jumping) {
        body.setVelocityY(TUNING.jumpVelocity);
        this.jumping = true;
        this.jumpBufferUntil = 0;
        this.lastGroundAt = -Infinity;
        this.scene.fx.jumpDust(this.x, this.y);
        AK.sfx('jump');
      }
      if (!input.held.jump && body.velocity.y < TUNING.jumpCutVelocity) {
        body.setVelocityY(TUNING.jumpCutVelocity);
      }

      // ---- Saldırı ----
      if (wantAttack && time >= this.attackReadyAt && !this.shielding && this.state === 'normal') {
        this.state = 'attack';
        this.attackReadyAt = time + TUNING.attackCooldownMs;
        this.attackEndAt = time + TUNING.attackDurationMs;
        this.attackHitAt = time + TUNING.attackHitDelayMs;
        this.play('w-attack', true);
        AK.sfx('swing');
      }
      if (this.state === 'attack') {
        if (this.attackHitAt && time >= this.attackHitAt) {
          this.attackHitAt = 0;
          this.spawnSlash();
          this.scene.onSwordSwing(this.swordHitbox());
        }
        if (time >= this.attackEndAt) this.state = 'normal';
      }

      this.updateSlash();
      this.updateAnim(dir, onGround);
    }

    // Geri tepme (düşmana vurunca ya da kalkanla engelleyince)
    recoil(vx, ms) {
      this.recoilVx = vx;
      this.recoilUntil = this.scene.time.now + ms;
    }

    // Düşman temas etti. Sonuç: 'blocked' | 'hurt' | 'dead' | null (dokunulmaz)
    hurt(sourceX) {
      const time = this.scene.time.now;
      if (this.dead || time < this.invulnUntil) return null;
      const away = Math.sign(this.x - sourceX) || -this.facing; // oyuncuyu iten yön

      // kalkan önden gelen saldırıyı engeller
      if (this.shielding && this.facing === -away) {
        this.recoil(away * TUNING.blockRecoil, 140);
        this.invulnUntil = time + 250;
        return 'blocked';
      }

      this.hp = Math.max(0, this.hp - 1);
      this.endDash();
      this.state = 'hurt';
      this.shielding = false;
      this.hurtEndAt = time + TUNING.hurtMs;
      this.invulnUntil = time + TUNING.invulnMs;
      this.jumping = false;
      this.body.setVelocity(away * TUNING.hurtKnockX, TUNING.hurtKnockY);
      this.play('w-hurt', true);
      if (this.hp === 0) {
        this.dead = true;
        this.body.setVelocity(away * 60, -150);
        return 'dead';
      }
      return 'hurt';
    }

    endDash() {
      if (this.state === 'dash') this.body.setAllowGravity(true);
    }

    startDash(time, input, onGround) {
      const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
      if (dir !== 0) this.facing = dir;
      this.setFlipX(this.facing < 0);
      this.state = 'dash';
      this.shielding = false;
      this.dashEndAt = time + TUNING.dashMs;
      this.dashReadyAt = time + TUNING.dashCooldownMs;
      if (!onGround) this.canAirDash = false;
      this.body.setAllowGravity(false);
      this.jumping = false;
      this.play('w-dash', true);
      this.scene.fx.dashBurst(this.x, this.y - 12, this.facing);
      AK.sfx('dash');
    }

    // Kılıcın vurduğu alan (dünya koordinatlarında)
    swordHitbox() {
      const w = 36, h = 40;
      const x = this.facing > 0 ? this.x + 2 : this.x - 2 - w;
      return new Phaser.Geom.Rectangle(x, this.y - 34, w, h);
    }

    spawnSlash() {
      if (this.slash) this.slash.destroy();
      const s = this.scene.add.sprite(this.x, this.y, 'slash', 's0').setDepth(11).setOrigin(2 / 38, 0.5);
      s.setFlipX(this.facing < 0);
      if (this.facing < 0) s.setOrigin(1 - 2 / 38, 0.5);
      s.setAlpha(0.95);
      s.play('slash');
      s.once('animationcomplete', () => { s.destroy(); if (this.slash === s) this.slash = null; });
      this.slash = s;
      this.updateSlash();
    }

    updateSlash() {
      if (!this.slash) return;
      this.slash.setPosition(this.x + this.facing * 4, this.y - 15);
    }

    updateAnim(dir, onGround) {
      let key;
      if (this.state === 'attack') return; // saldırı animasyonu bitene kadar sürer
      else if (this.shielding) key = 'w-shield';
      else if (!onGround) key = this.body.velocity.y < 0 ? 'w-jump' : 'w-fall';
      else if (dir !== 0) key = 'w-run';
      else key = 'w-idle';
      if (this.anims.currentAnim?.key !== key) this.play(key, true);
    }
  }

  AK.Warrior = Warrior;
})();
