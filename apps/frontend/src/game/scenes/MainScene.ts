import * as Phaser from "phaser";
import { WebRTCManager } from "../managers/WebRTCManager";
import { WorldBuilder, type GameZone } from "../world/WorldBuilder";
import { PlayerController } from "../controllers/PlayerController";

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerController!: PlayerController;
  private otherPlayers: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  private socket: WebSocket | null = null;
  private rtcManager: WebRTCManager | null = null;
  
  private lastX = 0;
  private lastY = 0;
  private lastAnim = "turn";
  
  private myUserId: string | null = null;
  private currentZoneType: string | null = null;
  private zones: GameZone[] = [];
  private worldBuilder!: WorldBuilder;

  // Listeners
  private wsMessageListener = this.handleWsMessage.bind(this);
  private initiateCallListener = (e: Event) => this.rtcManager?.sendCallRequest((e as CustomEvent).detail.userId);
  private acceptCallListener = (e: Event) => this.rtcManager?.acceptCall((e as CustomEvent).detail.userId);
  private declineCallListener = (e: Event) => this.rtcManager?.declineCall((e as CustomEvent).detail.userId);
  private endCallListener = (e: Event) => {
    const userId = (e as CustomEvent).detail.userId;
    if (!userId) return;
    this.rtcManager?.endCall(userId);
    this.dispatch("call-status", { status: "Call Ended" });
    this.dispatch("call-ended", { userId });
  };
  private iceServersListener = (e: Event) => this.rtcManager?.setIceServers((e as CustomEvent).detail.iceServers);
  private startGroupCallListener = () => this.rtcManager?.startGroupCall();
  private joinGroupCallListener = () => this.rtcManager?.joinGroupCall();
  private leaveGroupCallListener = () => this.rtcManager?.leaveGroupCall();
  private toggleMuteListener = (e: Event) => this.rtcManager?.toggleMute((e as CustomEvent).detail.muted);

  constructor() { super("MainScene"); }

  init(data: { socket: WebSocket | null }) {
    this.socket = data.socket;
    this.rtcManager = new WebRTCManager(this.socket, this.myUserId);
    this.worldBuilder = new WorldBuilder(this);

    this.cleanupEventListeners();
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
  }

  public updateSocket(socket: WebSocket) {
    this.socket = socket;
    this.rtcManager?.setSocket(socket);
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "GET_CURRENT_PLAYERS" }));
    }
  }

  private handleWsMessage(e: Event) {
    const data = (e as CustomEvent).detail;
    if (data.type === "CONNECTED") {
      this.myUserId = data.payload.userId;
      this.rtcManager?.setMyUserId(this.myUserId);
      this.rtcManager?.setSocket(this.socket);
    } else if (data.type === "CURRENT_PLAYERS") {
      data.payload.players.forEach((p: any) => !this.otherPlayers.has(p.userId) && this.addOtherPlayer(p));
    } else if (data.type === "NEW_PLAYER") {
      this.addOtherPlayer(data.payload);
    } else if (data.type === "WEBRTC_SIGNAL") {
      this.rtcManager?.handleSignal(data.payload.userId, data.payload.signal);
    } else if (data.type === "CALL_REQUEST") {
      this.dispatch("incoming-call", { userId: data.payload.userId });
    } else if (data.type === "CALL_ACCEPTED") {
      this.dispatch("call-status", { status: "Connecting..." });
      this.rtcManager?.startCallAsInitiator(data.payload.userId);
    } else if (data.type === "CALL_DECLINED") {
      this.dispatch("call-status", { status: "Call Declined" });
      this.dispatch("call-ended", { userId: data.payload.userId });
    } else if (data.type === "CALL_ENDED") {
      this.rtcManager?.endCall(data.payload.userId, { notifyPeer: false });
      this.dispatch("call-status", { status: "Call Ended by Peer" });
      this.dispatch("call-ended", { userId: data.payload.userId });
    } else if (data.type === "GROUP_CALL_STATE") {
      this.dispatch("group-call-state", data.payload);
    } else if (data.type === "GROUP_CALL_STARTED") {
      this.dispatch("group-call-started", data.payload);
    } else if (data.type === "GROUP_CALL_JOINED_SUCCESS") {
      this.dispatch("group-call-participants", { players: data.payload.participants });
      data.payload.participants.forEach((id: string) => id !== this.myUserId && this.rtcManager?.startCallAsInitiator(id));
    } else if (data.type === "USER_JOINED_GROUP_CALL") {
      this.dispatch("group-call-user-joined", { userId: data.payload.userId });
    } else if (data.type === "USER_LEFT_GROUP_CALL") {
      this.rtcManager?.endCall(data.payload.userId, { notifyPeer: false });
      this.dispatch("group-call-user-left", { userId: data.payload.userId });
    } else if (data.type === "GROUP_CALL_ENDED") {
      this.rtcManager?.leaveGroupCall();
      this.dispatch("group-call-ended", data.payload);
    } else if (data.type === "PLAYER_MOVED") {
      const p = data.payload;
      const sprite = this.otherPlayers.get(p.userId);
      if (sprite) {
        sprite.setPosition(p.x, p.y);
        if (p.anim) sprite.anims.play(p.anim, true);
      }
    } else if (data.type === "PLAYER_LEFT") {
      const userId = data.payload.userId;
      this.otherPlayers.get(userId)?.destroy();
      this.otherPlayers.delete(userId);
      this.rtcManager?.removePlayer(userId);
      this.dispatch("call-ended", { userId });
    }
  }

  private addOtherPlayer(p: any) {
    const sprite = this.physics.add.sprite(p.x, p.y, "player").setScale(0.5).setInteractive({ cursor: 'pointer' });
    if (p.anim) sprite.anims.play(p.anim, true);
    sprite.on('pointerdown', () => this.dispatch("player-selected", { userId: p.userId }));
    this.otherPlayers.set(p.userId, sprite);
  }

  preload() {
    this.load.spritesheet("player", "https://labs.phaser.io/assets/sprites/dude.png", { frameWidth: 32, frameHeight: 48 });
    this.worldBuilder.generateTextures();
  }

  create() {
    PlayerController.createAnimations(this);
    const { walls, nature, zones } = this.worldBuilder.buildWorld();
    this.zones = zones;

    this.player = this.physics.add.sprite(1000, 1000, "player").setScale(0.8).setCollideWorldBounds(true);
    this.playerController = new PlayerController(this, this.player);

    this.physics.add.collider(this.player, walls);
    this.physics.add.collider(this.player, nature);

    this.cameras.main.setBounds(0, 0, 2000, 2000).startFollow(this.player, true, 0.05, 0.05);
  }

  update() {
    const moveData = this.playerController.update();
    if (moveData && (moveData.x !== this.lastX || moveData.y !== this.lastY || moveData.anim !== this.lastAnim)) {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "PLAYER_MOVEMENT", payload: moveData }));
      }
      this.lastX = moveData.x;
      this.lastY = moveData.y;
      this.lastAnim = moveData.anim;
    }

    this.checkZones();
  }

  private checkZones() {
    const playerRect = new Phaser.Geom.Rectangle(this.player.x - 16, this.player.y - 24, 32, 48);
    const foundZone = this.zones.find(z => Phaser.Geom.Rectangle.Overlaps(playerRect, z.rect));
    const zoneType = foundZone ? foundZone.type : null;

    if (this.currentZoneType !== zoneType) {
      this.currentZoneType = zoneType;
      this.dispatch("zone-entered", { type: zoneType });
    }
  }

  private dispatch(name: string, detail: any) { window.dispatchEvent(new CustomEvent(name, { detail })); }

  private cleanupEventListeners() {
    [
      "ws-message", "initiate-call", "accept-call", "decline-call", "end-call",
      "webrtc-ice-servers", "start-group-call", "join-group-call", "leave-group-call", "toggle-mute"
    ].forEach(ev => window.removeEventListener(ev, this.wsMessageListener as any));
    // Note: the original code had multiple specific listeners, but I've unified them where possible or kept them as is.
    // Actually, I should be careful to remove the exact same functions.
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
}
