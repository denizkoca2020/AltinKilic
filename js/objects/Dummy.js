// Antrenman kuklası: kılıç vuruşlarını denemek için. Vurulunca sallanır ve saman saçar.
(function () {
  const AK = (window.AK = window.AK || {});

  class Dummy extends Phaser.GameObjects.Image {
    constructor(scene, x, y) {
      super(scene, x, y, 'dummy');
      scene.add.existing(this);
      this.setOrigin(0.5, 1).setDepth(8);
      this.hits = 0;
    }

    getHitRect() {
      return new Phaser.Geom.Rectangle(this.x - 9, this.y - 38, 18, 38);
    }

    hit(dir) {
      this.hits++;
      const scene = this.scene;
      scene.tweens.killTweensOf(this);
      this.angle = 0;
      scene.tweens.add({
        targets: this,
        angle: { from: dir * 22, to: 0 },
        duration: 650,
        ease: 'Elastic.easeOut',
        easeParams: [1.2, 0.35],
      });
      this.setTintFill(0xffffff);
      scene.time.delayedCall(70, () => this.clearTint());
      scene.fx.straw(this.x, this.y - 22, dir);
      AK.sfx('thud');
    }
  }

  AK.Dummy = Dummy;
})();
