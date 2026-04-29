import * as Phaser from "phaser";

export interface GameZone {
  rect: Phaser.Geom.Rectangle;
  type: string;
}

export class WorldBuilder {
  private scene: Phaser.Scene;
  private worldSize: number;

  constructor(scene: Phaser.Scene, worldSize: number = 2000) {
    this.scene = scene;
    this.worldSize = worldSize;
  }

  generateTextures() {
    const createTileTexture = (key: string, color: number, pattern?: (g: Phaser.GameObjects.Graphics) => void) => {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });
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

    const bushGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    bushGraphics.fillStyle(0x166534, 1);
    bushGraphics.fillCircle(8, 8, 8);
    bushGraphics.generateTexture("bush", 16, 16);
  }

  buildWorld(): { walls: Phaser.Physics.Arcade.StaticGroup; nature: Phaser.Physics.Arcade.StaticGroup; zones: GameZone[] } {
    this.scene.physics.world.setBounds(0, 0, this.worldSize, this.worldSize);

    // 1. Grass Everywhere
    this.scene.add.tileSprite(this.worldSize / 2, this.worldSize / 2, this.worldSize, this.worldSize, "grass");

    // 2. Office Building
    const officeSize = 800;
    const officeX = (this.worldSize - officeSize) / 2;
    const officeY = (this.worldSize - officeSize) / 2;

    this.scene.add.tileSprite(officeX + officeSize / 2, officeY + officeSize / 2, officeSize, officeSize, "office_floor");

    // 3. Walls
    const walls = this.scene.physics.add.staticGroup();
    walls.add(this.scene.add.tileSprite(officeX + officeSize / 2, officeY, officeSize + 16, 16, "wall"));
    walls.add(this.scene.add.tileSprite(officeX + officeSize / 2, officeY + officeSize, officeSize + 16, 16, "wall"));
    walls.add(this.scene.add.tileSprite(officeX, officeY + officeSize / 2, 16, officeSize, "wall"));
    walls.add(this.scene.add.tileSprite(officeX + officeSize, officeY + officeSize / 2, 16, officeSize, "wall"));

    // 4. Zones
    const zoneWidth = officeSize / 2;
    const zoneHeight = officeSize / 2;

    const zones: GameZone[] = [
      { rect: new Phaser.Geom.Rectangle(officeX, officeY, zoneWidth, zoneHeight), type: "working" },
      { rect: new Phaser.Geom.Rectangle(officeX + zoneWidth, officeY, zoneWidth, zoneHeight), type: "meeting" },
      { rect: new Phaser.Geom.Rectangle(officeX, officeY + zoneHeight, zoneWidth, zoneHeight), type: "resting" },
      { rect: new Phaser.Geom.Rectangle(officeX + zoneWidth, officeY + zoneHeight, zoneWidth, zoneHeight), type: "knowledge" },
    ];

    const graphicsZone = this.scene.add.graphics();
    const colors = [0xadd8e6, 0xffb6c1, 0x90ee90, 0xffffe0];
    zones.forEach((zone, i) => {
      graphicsZone.fillStyle(colors[i], 0.3);
      graphicsZone.fillRectShape(zone.rect);
    });

    // 5. Nature
    const nature = this.scene.physics.add.staticGroup();
    for (let i = 0; i < 80; i++) {
      const rx = Phaser.Math.Between(0, this.worldSize);
      const ry = Phaser.Math.Between(0, this.worldSize);
      if (rx > officeX - 50 && rx < officeX + officeSize + 50 && ry > officeY - 50 && ry < officeY + officeSize + 50) continue;
      const bush = nature.create(rx, ry, "bush");
      bush.setScale(Phaser.Math.FloatBetween(0.8, 1.5));
      bush.refreshBody();
    }

    // 6. Grid
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(1, 0xffffff, 0.05);
    for (let i = 0; i <= this.worldSize; i += 200) {
      graphics.moveTo(i, 0); graphics.lineTo(i, this.worldSize);
      graphics.moveTo(0, i); graphics.lineTo(this.worldSize, i);
    }
    graphics.strokePath();

    return { walls, nature, zones };
  }
}
