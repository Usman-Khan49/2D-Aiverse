import * as Phaser from "phaser";

export class PlayerController {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private speed: number = 160;

  constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.player = player;
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
  }

  update(): { x: number; y: number; anim: string } | null {
    if (!this.player || !this.cursors) return null;

    this.player.setVelocity(0);
    let currentAnim = "turn";

    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-this.speed);
      currentAnim = "left";
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(this.speed);
      currentAnim = "right";
    } else if (this.cursors.up?.isDown) {
      this.player.setVelocityY(-this.speed);
      currentAnim = "right";
    } else if (this.cursors.down?.isDown) {
      this.player.setVelocityY(this.speed);
      currentAnim = "left";
    }

    this.player.anims.play(currentAnim, true);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body && body.velocity.x !== 0 && body.velocity.y !== 0) {
      body.velocity.normalize().scale(this.speed);
    }

    return { x: this.player.x, y: this.player.y, anim: currentAnim };
  }

  static createAnimations(scene: Phaser.Scene) {
    scene.anims.create({
      key: "left",
      frames: scene.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: "turn",
      frames: [{ key: "player", frame: 4 }],
      frameRate: 20,
    });
    scene.anims.create({
      key: "right",
      frames: scene.anims.generateFrameNumbers("player", { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });
  }
}
