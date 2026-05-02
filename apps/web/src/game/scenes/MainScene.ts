import * as Phaser from "phaser";
import { WebRTCManager } from "../managers/WebRTCManager";

interface GameZone {
  rect: Phaser.Geom.Rectangle;
  type: string;
}

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private otherPlayers: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  private socket: WebSocket | null = null;
  
  private lastX = 0;
  private lastY = 0;
  private lastAnim = "turn";
  
  private rtcManager: WebRTCManager | null = null;
  private myUserId: string | null = null;
  private currentZoneType: string | null = null;
  private zones: GameZone[] = [];
  private libraryProp!: Phaser.GameObjects.Sprite;
  private isNearLibrary = false;
  private eKey!: Phaser.Input.Keyboard.Key;
  private wsMessageListener = this.handleWsMessage.bind(this);
  private initiateCallListener = (e: Event) => {
    const targetUserId = (e as CustomEvent).detail.userId;
    this.rtcManager?.sendCallRequest(targetUserId);
  };
  private acceptCallListener = (e: Event) => {
    const targetUserId = (e as CustomEvent).detail.userId;
    this.rtcManager?.acceptCall(targetUserId);
  };
  private declineCallListener = (e: Event) => {
    const targetUserId = (e as CustomEvent).detail.userId;
    this.rtcManager?.declineCall(targetUserId);
  };
  private endCallListener = (e: Event) => {
    const targetUserId = (e as CustomEvent).detail.userId;
    if (!targetUserId) return;
    this.rtcManager?.endCall(targetUserId);
    window.dispatchEvent(new CustomEvent("call-status", { detail: { status: "Call Ended" } }));
    window.dispatchEvent(new CustomEvent("call-ended", { detail: { userId: targetUserId } }));
  };
  private iceServersListener = (e: Event) => {
    const event = e as CustomEvent<{ iceServers: RTCIceServer[] }>;
    this.rtcManager?.setIceServers(event.detail.iceServers);
  };
  private startGroupCallListener = () => {
    this.rtcManager?.startGroupCall();
  };
  private joinGroupCallListener = () => {
    this.rtcManager?.joinGroupCall();
  };
  private leaveGroupCallListener = () => {
    this.rtcManager?.leaveGroupCall();
  };
  private toggleMuteListener = (e: Event) => {
    const muted = (e as CustomEvent).detail.muted;
    this.rtcManager?.toggleMute(muted);
  };

  constructor() {
    super("MainScene");
  }

  init(data: { socket: WebSocket | null }) {
    this.socket = data.socket;
    
    // Initialize WebRTC Manager (don't call initLocalStream yet — wait for user gesture)
    this.rtcManager = new WebRTCManager(this.socket, this.myUserId);

    // If this scene is restarted, remove stale listeners before adding new ones.
    this.cleanupEventListeners();

    // Listen for custom events from the React component
    window.addEventListener("ws-message", this.wsMessageListener);
    window.addEventListener("initiate-call", this.initiateCallListener);
    window.addEventListener("accept-call", this.acceptCallListener);
    window.addEventListener("decline-call", this.declineCallListener);
    window.addEventListener("end-call", this.endCallListener);
    window.addEventListener("webrtc-ice-servers", this.iceServersListener);
    window.addEventListener("start-group-call", this.startGroupCallListener);
    window.addEventListener("join-group-call", this.joinGroupCallListener);
    window.addEventListener("leave-group-call", this.leaveGroupCallListener);
    window.addEventListener("toggle-mute", this.toggleMuteListener);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupEventListeners, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupEventListeners, this);
  }



  public updateSocket(socket: WebSocket) {
    this.socket = socket;
    if (this.rtcManager) {
      this.rtcManager.setSocket(socket);
    }
    
    // Once socket is available, ask for players just in case we missed the broadcast
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "GET_CURRENT_PLAYERS" }));
    }
  }





  private handleWsMessage(e: Event) {
    const customEvent = e as CustomEvent;
    const data = customEvent.detail;

    if (data.type === "CONNECTED") {
      this.myUserId = data.payload.userId;
      // Update the existing manager with the correct userId and socket
      // Don't recreate it — the event listeners reference this.rtcManager
      if (this.rtcManager) {
        this.rtcManager.setMyUserId(this.myUserId);
        this.rtcManager.setSocket(this.socket);
      } else {
        this.rtcManager = new WebRTCManager(this.socket, this.myUserId);
      }
    }

    if (data.type === "CURRENT_PLAYERS") {
      data.payload.players.forEach((p: any) => {
        if (!this.otherPlayers.has(p.userId)) {
          this.addOtherPlayer(p);
        }
      });
    } else if (data.type === "NEW_PLAYER") {
      this.addOtherPlayer(data.payload);
    } else if (data.type === "WEBRTC_SIGNAL") {
      this.rtcManager?.handleSignal(data.payload.userId, data.payload.signal);
    } else if (data.type === "CALL_REQUEST") {
      // Someone wants to call us — show the incoming call UI
      console.log(`Call request from ${data.payload.userId}`);
      window.dispatchEvent(new CustomEvent("incoming-call", { 
        detail: { userId: data.payload.userId } 
      }));
    } else if (data.type === "CALL_ACCEPTED") {
      // Our call was accepted — now start WebRTC as initiator
      console.log(`Call accepted by ${data.payload.userId}`);
      window.dispatchEvent(new CustomEvent("call-status", { detail: { status: "Connecting..." } }));
      this.rtcManager?.startCallAsInitiator(data.payload.userId);
    } else if (data.type === "CALL_DECLINED") {
      console.log(`Call declined by ${data.payload.userId}`);
      window.dispatchEvent(new CustomEvent("call-status", { detail: { status: "Call Declined" } }));
      window.dispatchEvent(new CustomEvent("call-ended", { detail: { userId: data.payload.userId } }));
    } else if (data.type === "CALL_ENDED") {
      const userId = data.payload.userId;
      this.rtcManager?.endCall(userId, { notifyPeer: false });
      window.dispatchEvent(new CustomEvent("call-status", { detail: { status: "Call Ended by Peer" } }));
      window.dispatchEvent(new CustomEvent("call-ended", { detail: { userId } }));
    } else if (data.type === "GROUP_CALL_STATE") {
      window.dispatchEvent(new CustomEvent("group-call-state", { detail: data.payload }));
    } else if (data.type === "GROUP_CALL_STARTED") {
      window.dispatchEvent(new CustomEvent("group-call-started", { detail: data.payload }));
    } else if (data.type === "GROUP_CALL_JOINED_SUCCESS") {
      const players = data.payload.participants;
      window.dispatchEvent(new CustomEvent("group-call-participants", { detail: { players } }));
      players.forEach((userId: string) => {
        if (userId !== this.myUserId) {
          this.rtcManager?.startCallAsInitiator(userId);
        }
      });
    } else if (data.type === "USER_JOINED_GROUP_CALL") {
      const joinerId = data.payload.userId;
      window.dispatchEvent(new CustomEvent("group-call-user-joined", { detail: { userId: joinerId } }));
      // We are waiting for their offer, handled by handleSignal
    } else if (data.type === "USER_LEFT_GROUP_CALL") {
      const leftId = data.payload.userId;
      this.rtcManager?.endCall(leftId, { notifyPeer: false });
      window.dispatchEvent(new CustomEvent("group-call-user-left", { detail: { userId: leftId } }));
    } else if (data.type === "GROUP_CALL_ENDED") {
      this.rtcManager?.leaveGroupCall();
      window.dispatchEvent(new CustomEvent("group-call-ended", { detail: data.payload }));
    } else if (data.type === "PLAYER_MOVED") {


      const p = data.payload;
      const sprite = this.otherPlayers.get(p.userId);
      if (sprite) {
        sprite.setPosition(p.x, p.y);
        if (p.anim) sprite.anims.play(p.anim, true);
      }
    } else if (data.type === "PLAYER_LEFT") {
      const userId = data.payload.userId;
      const sprite = this.otherPlayers.get(userId);
      if (sprite) {
        sprite.destroy();
        this.otherPlayers.delete(userId);
      }
      this.rtcManager?.removePlayer(userId);
      window.dispatchEvent(new CustomEvent("call-ended", { detail: { userId } }));
    }

  }

  private cleanupEventListeners() {
    window.removeEventListener("ws-message", this.wsMessageListener);
    window.removeEventListener("initiate-call", this.initiateCallListener);
    window.removeEventListener("accept-call", this.acceptCallListener);
    window.removeEventListener("decline-call", this.declineCallListener);
    window.removeEventListener("end-call", this.endCallListener);
    window.removeEventListener("webrtc-ice-servers", this.iceServersListener);
    window.removeEventListener("start-group-call", this.startGroupCallListener);
    window.removeEventListener("join-group-call", this.joinGroupCallListener);
    window.removeEventListener("leave-group-call", this.leaveGroupCallListener);
    window.removeEventListener("toggle-mute", this.toggleMuteListener);
  }

  private addOtherPlayer(p: any) {
    const sprite = this.physics.add.sprite(p.x, p.y, "player");
    sprite.setScale(0.5);
    if (p.anim) sprite.anims.play(p.anim, true);
    
    // Make interactive
    sprite.setInteractive({ cursor: 'pointer' });
    sprite.on('pointerdown', () => {
      window.dispatchEvent(new CustomEvent("player-selected", { 
        detail: { userId: p.userId } 
      }));
    });

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
      const graphics = this.make.graphics({ x: 0, y: 0 });
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

    const bushGraphics = this.make.graphics({ x: 0, y: 0 });
    bushGraphics.fillStyle(0x166534, 1);
    bushGraphics.fillCircle(8, 8, 8);
    bushGraphics.generateTexture("bush", 16, 16);

    // Create Library Prop Texture
    const libGraphics = this.make.graphics({ x: 0, y: 0 });
    libGraphics.fillStyle(0x4f46e5, 1); // Primary indigo
    libGraphics.fillRect(0, 0, 32, 32);
    libGraphics.lineStyle(2, 0xffffff, 1);
    libGraphics.strokeRect(4, 4, 24, 24);
    // Add "pages" look
    libGraphics.fillStyle(0xffffff, 1);
    libGraphics.fillRect(8, 8, 16, 4);
    libGraphics.fillRect(8, 16, 16, 4);
    libGraphics.generateTexture("library_prop", 32, 32);
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

    // ZONES
    const zoneWidth = officeSize / 2;
    const zoneHeight = officeSize / 2;

    const workingRect = new Phaser.Geom.Rectangle(officeX, officeY, zoneWidth, zoneHeight);
    const meetingRect = new Phaser.Geom.Rectangle(officeX + zoneWidth, officeY, zoneWidth, zoneHeight);
    const restingRect = new Phaser.Geom.Rectangle(officeX, officeY + zoneHeight, zoneWidth, zoneHeight);
    const knowledgeRect = new Phaser.Geom.Rectangle(officeX + zoneWidth, officeY + zoneHeight, zoneWidth, zoneHeight);

    this.zones = [
      { rect: workingRect, type: "working" },
      { rect: meetingRect, type: "meeting" },
      { rect: restingRect, type: "resting" },
      { rect: knowledgeRect, type: "knowledge" },
    ];

    // Colors: light blue, light red, light green, light yellow
    const graphicsZone = this.add.graphics();
    graphicsZone.fillStyle(0xadd8e6, 0.3);
    graphicsZone.fillRectShape(workingRect);
    graphicsZone.fillStyle(0xffb6c1, 0.3);
    graphicsZone.fillRectShape(meetingRect);
    graphicsZone.fillStyle(0x90ee90, 0.3);
    graphicsZone.fillRectShape(restingRect);
    graphicsZone.fillStyle(0xffffe0, 0.3);
    graphicsZone.fillRectShape(knowledgeRect);


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
      this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    // Add Library Prop in Knowledge Zone
    const libX = officeX + zoneWidth + zoneWidth/2;
    const libY = officeY + zoneHeight + zoneHeight/2;
    this.libraryProp = this.add.sprite(libX, libY, "library_prop");
    this.physics.add.existing(this.libraryProp, true);
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

    // Check Zones Overlap
    let insideZone = false;
    let foundZoneType: string | null = null;
    const playerRect = new Phaser.Geom.Rectangle(this.player.x - 16, this.player.y - 24, 32, 48);

    for (const zone of this.zones) {
      if (Phaser.Geom.Rectangle.Overlaps(playerRect, zone.rect)) {
        insideZone = true;
        foundZoneType = zone.type;
        break;
      }
    }

    if (insideZone) {
      if (this.currentZoneType !== foundZoneType) {
        this.currentZoneType = foundZoneType;
        window.dispatchEvent(new CustomEvent("zone-entered", { detail: { type: foundZoneType } }));
      }
    } else {
      if (this.currentZoneType !== null) {
        this.currentZoneType = null;
        window.dispatchEvent(new CustomEvent("zone-entered", { detail: { type: null } }));
      }
    }

    // Check interaction with Library Prop
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.libraryProp.x, this.libraryProp.y);
    const near = dist < 60;
    
    if (near !== this.isNearLibrary) {
      this.isNearLibrary = near;
      window.dispatchEvent(new CustomEvent("near-library", { detail: { near } }));
    }

    if (this.isNearLibrary && Phaser.Input.Keyboard.JustDown(this.eKey)) {
      window.dispatchEvent(new CustomEvent("open-library"));
    }
  }
}
