import * as Phaser from "phaser";

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private otherPlayers: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  private socket: WebSocket | null = null;
  
  private lastX = 0;
  private lastY = 0;
  private lastAnim = "turn";

  constructor() {
    super("MainScene");
  }

  init(data: { socket: WebSocket | null }) {
    this.socket = data.socket;
    
    // Listen for custom events from the React component
    window.addEventListener("ws-message", this.handleWsMessage.bind(this));
  }

  private handleWsMessage(e: Event) {
    const customEvent = e as CustomEvent;
    const data = customEvent.detail;

    if (data.type === "CURRENT_PLAYERS") {
      data.payload.players.forEach((p: any) => {
        if (!this.otherPlayers.has(p.userId)) {
          this.addOtherPlayer(p);
        }
      });
    } else if (data.type === "NEW_PLAYER") {
      this.addOtherPlayer(data.payload);
    } else if (data.type === "PLAYER_MOVED") {
      const p = data.payload;
      const sprite = this.otherPlayers.get(p.userId);
      if (sprite) {
        sprite.setPosition(p.x, p.y);
        if (p.anim) sprite.anims.play(p.anim, true);
      }
    } else if (data.type === "PLAYER_LEFT") {
      const sprite = this.otherPlayers.get(data.payload.userId);
      if (sprite) {
        sprite.destroy();
        this.otherPlayers.delete(data.payload.userId);
      }
    }
  }

  private addOtherPlayer(p: any) {
    const sprite = this.physics.add.sprite(p.x, p.y, "player");
    sprite.setScale(0.5);
    if (p.anim) sprite.anims.play(p.anim, true);
    this.otherPlayers.set(p.userId, sprite);
  }

  preload() {
    // Load player spritesheet
    this.load.spritesheet("player", "https://labs.phaser.io/assets/sprites/dude.png", {
      frameWidth: 32,
      frameHeight: 48,
    });

    // Generate procedural textures
    this.generateTextures();
  }

  private generateTextures() {
    const createTileTexture = (key: string, color: number, pattern?: (g: Phaser.GameObjects.Graphics) => void) => {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(color, 1);
      graphics.fillRect(0, 0, 16, 16);
      if (pattern) pattern(graphics);
      graphics.generateTexture(key, 16, 16);
    };

    createTileTexture("grass", 0x2d5a27, (g) => {
      g.fillStyle(0x3d7a35, 1);
      g.fillRect(2, 2, 2, 2);
      g.fillRect(8, 10, 2, 2);
    });

    createTileTexture("office_floor", 0x94a3b8, (g) => {
      g.lineStyle(1, 0x64748b, 0.3);
      g.strokeRect(0, 0, 16, 16);
    });

    createTileTexture("wall", 0x334155, (g) => {
      g.lineStyle(1, 0x1e293b, 1);
      g.strokeRect(0, 0, 16, 16);
      g.fillStyle(0x475569, 1);
      g.fillRect(2, 2, 12, 12);
    });

    const bushGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    bushGraphics.fillStyle(0x166534, 1);
    bushGraphics.fillCircle(8, 8, 8);
    bushGraphics.generateTexture("bush", 16, 16);
  }

  create() {
    this.createAnimations();

    const worldSize = 2000;
    this.physics.world.setBounds(0, 0, worldSize, worldSize);

    // 1. Grass Everywhere
    this.add.tileSprite(worldSize / 2, worldSize / 2, worldSize, worldSize, "grass");

    // 2. Office Building
    const officeSize = 800;
    const officeX = (worldSize - officeSize) / 2;
    const officeY = (worldSize - officeSize) / 2;

    this.add.tileSprite(officeX + officeSize / 2, officeY + officeSize / 2, officeSize, officeSize, "office_floor");

    // 3. Walls
    const walls = this.physics.add.staticGroup();
    walls.add(this.add.tileSprite(officeX + officeSize / 2, officeY, officeSize + 16, 16, "wall"));
    walls.add(this.add.tileSprite(officeX + officeSize / 2, officeY + officeSize, officeSize + 16, 16, "wall"));
    walls.add(this.add.tileSprite(officeX, officeY + officeSize / 2, 16, officeSize, "wall"));
    walls.add(this.add.tileSprite(officeX + officeSize, officeY + officeSize / 2, 16, officeSize, "wall"));

    // 4. Nature
    const nature = this.physics.add.staticGroup();
    for (let i = 0; i < 80; i++) {
      const rx = Phaser.Math.Between(0, worldSize);
      const ry = Phaser.Math.Between(0, worldSize);
      if (rx > officeX - 50 && rx < officeX + officeSize + 50 && ry > officeY - 50 && ry < officeY + officeSize + 50) continue;
      const bush = nature.create(rx, ry, "bush");
      bush.setScale(Phaser.Math.FloatBetween(0.8, 1.5));
      bush.refreshBody();
    }

    // 5. Grid
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xffffff, 0.05);
    for (let i = 0; i <= worldSize; i += 200) {
      graphics.moveTo(i, 0); graphics.lineTo(i, worldSize);
      graphics.moveTo(0, i); graphics.lineTo(worldSize, i);
    }
    graphics.strokePath();

    this.player = this.physics.add.sprite(worldSize / 2, worldSize / 2, "player");
    this.player.setScale(0.8);
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, walls);
    this.physics.add.collider(this.player, nature);

    this.cameras.main.setBounds(0, 0, worldSize, worldSize);
    this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }
  }

  private createAnimations() {
    this.anims.create({
      key: "left",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "turn",
      frames: [{ key: "player", frame: 4 }],
      frameRate: 20,
    });
    this.anims.create({
      key: "right",
      frames: this.anims.generateFrameNumbers("player", { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  update() {
    if (!this.player || !this.cursors) return;

    const speed = 160;
    this.player.setVelocity(0);
    let currentAnim = "turn";

    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-speed);
      currentAnim = "left";
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(speed);
      currentAnim = "right";
    } else if (this.cursors.up?.isDown) {
      this.player.setVelocityY(-speed);
      currentAnim = "right";
    } else if (this.cursors.down?.isDown) {
      this.player.setVelocityY(speed);
      currentAnim = "left";
    }

    this.player.anims.play(currentAnim, true);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body && body.velocity.x !== 0 && body.velocity.y !== 0) {
      body.velocity.normalize().scale(speed);
    }

    if ((this.player.x !== this.lastX || this.player.y !== this.lastY || currentAnim !== this.lastAnim) && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: "PLAYER_MOVEMENT",
        payload: { x: this.player.x, y: this.player.y, anim: currentAnim },
      }));
      this.lastX = this.player.x;
      this.lastY = this.player.y;
      this.lastAnim = currentAnim;
    }
  }
}
