// Görsel efektler: toz, kıvılcım, atılma izi, saman parçaları, ortam parçacıkları.
(function () {
  const AK = (window.AK = window.AK || {});

  class FX {
    constructor(scene) {
      this.scene = scene;

      this.dust = scene.add.particles(0, 0, 'dust', {
        lifespan: { min: 300, max: 550 },
        speed: { min: 15, max: 55 },
        angle: { min: 190, max: 350 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.6, end: 0 },
        gravityY: 40,
        emitting: false,
      }).setDepth(9);

      this.sparks = scene.add.particles(0, 0, 'spark', {
        lifespan: { min: 150, max: 320 },
        speed: { min: 90, max: 230 },
        scale: { start: 1.2, end: 0 },
        tint: [0xffffff, 0xfff2b0, 0xf2c75a],
        blendMode: 'ADD',
        emitting: false,
      }).setDepth(12);

      // vuruş yönüne göre saçılan saman parçaları (sağa / sola)
      const strawCfg = (angle) => ({
        lifespan: { min: 500, max: 900 },
        speed: { min: 60, max: 150 },
        angle,
        gravityY: 450,
        rotate: { min: 0, max: 360 },
        alpha: { start: 1, end: 0 },
        emitting: false,
      });
      this.strawRight = scene.add.particles(0, 0, 'strawbit', strawCfg({ min: -80, max: 10 })).setDepth(9);
      this.strawLeft = scene.add.particles(0, 0, 'strawbit', strawCfg({ min: 170, max: 260 })).setDepth(9);
    }

    // havada süzülen ışık zerreleri
    ambient(worldW, worldH) {
      this.scene.add.particles(0, 0, 'dot', {
        x: { min: 0, max: worldW },
        y: { min: 0, max: worldH },
        lifespan: { min: 5000, max: 9000 },
        speedX: { min: -6, max: 6 },
        speedY: { min: -12, max: -3 },
        alpha: { values: [0, 0.7, 0] },
        scale: { min: 0.5, max: 1 },
        tint: [0xffe9a8, 0xbfd8ff, 0xffffff],
        frequency: 90,
        maxAliveParticles: 110,
        blendMode: 'ADD',
      }).setDepth(7);
    }

    landDust(x, y) {
      this.dust.explode(8, x, y - 1);
    }

    jumpDust(x, y) {
      this.dust.explode(5, x, y - 1);
    }

    dashBurst(x, y, dir) {
      this.dust.explode(6, x - dir * 8, y + 10);
    }

    hitSparks(x, y) {
      this.sparks.explode(12, x, y);
    }

    // düşman ölünce renkli parça patlaması
    enemyBurst(x, y, tints) {
      const em = this.scene.add.particles(x, y, 'dot', {
        lifespan: { min: 300, max: 700 },
        speed: { min: 40, max: 160 },
        scale: { start: 1.6, end: 0 },
        gravityY: 250,
        tint: tints,
        emitting: false,
      }).setDepth(12);
      em.explode(22);
      this.sparks.explode(10, x, y);
      this.scene.time.delayedCall(900, () => em.destroy());
    }

    // kalkana çarpma: mavi-beyaz kıvılcım
    blockSparks(x, y) {
      const em = this.scene.add.particles(x, y, 'spark', {
        lifespan: { min: 120, max: 260 },
        speed: { min: 80, max: 200 },
        scale: { start: 1, end: 0 },
        tint: [0x9fd7ff, 0xffffff],
        blendMode: 'ADD',
        emitting: false,
      }).setDepth(12);
      em.explode(10);
      this.scene.time.delayedCall(400, () => em.destroy());
    }

    coinSparkle(x, y) {
      this.sparks.explode(4, x, y);
    }

    straw(x, y, dir) {
      (dir > 0 ? this.strawRight : this.strawLeft).explode(10, x, y);
    }

    // atılma sırasında arkada kalan hayalet görüntü
    ghost(sprite) {
      const g = this.scene.add.image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
        .setOrigin(sprite.originX, sprite.originY)
        .setFlipX(sprite.flipX)
        .setDepth(sprite.depth - 1)
        .setTintFill(0x9fd7ff)
        .setAlpha(0.55);
      this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
    }
  }

  AK.FX = FX;
})();
