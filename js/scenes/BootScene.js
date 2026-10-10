// Açılış sahnesi: tüm piksel sanat dokularını kodla üretir, sonra oyuna geçer.
(function () {
  const AK = (window.AK = window.AK || {});

  class BootScene extends Phaser.Scene {
    constructor() {
      super('Boot');
    }

    create() {
      AK.buildWorldTextures(this);
      AK.buildWarriorTextures(this);
      this.scene.start('Game');
    }
  }

  AK.BootScene = BootScene;
})();
