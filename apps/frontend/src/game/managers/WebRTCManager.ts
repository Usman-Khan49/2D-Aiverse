import { StreamService } from "../services/StreamService";
import { PeerConnection } from "../services/PeerConnection";

export class WebRTCManager {
  private peers: Map<string, PeerConnection> = new Map();
  private streamService: StreamService = new StreamService();
  private socket: WebSocket | null = null;
  private myUserId: string | null = null;
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private iceServers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
  ];

  constructor(socket: WebSocket | null, myUserId: string | null) {
    this.socket = socket;
    this.myUserId = myUserId;
  }

  setSocket(socket: WebSocket | null) { this.socket = socket; }
  setMyUserId(userId: string | null) { this.myUserId = userId; }
  setIceServers(iceServers: RTCIceServer[]) {
    this.iceServers = iceServers;
    console.log("WebRTCManager: ICE Servers updated.");
  }

  async handleSignal(fromUserId: string, data: any) {
    let pc = this.peers.get(fromUserId);

    if (data.type === "offer") {
      if (!pc) {
        const stream = await this.streamService.getStream();
        pc = this.createPeer(fromUserId, stream);
      }
      await pc.setRemoteDescription(data);
      await this.processPendingCandidates(fromUserId, pc);
      const answer = await pc.createAnswer();
      this.sendSignal(fromUserId, answer);

    } else if (data.type === "answer") {
      if (!pc) return;
      await pc.setRemoteDescription(data);
      await this.processPendingCandidates(fromUserId, pc);

    } else if (data.candidate) {
      if (!pc || !pc.hasRemoteDescription()) {
        this.queueCandidate(fromUserId, data);
      } else {
        await pc.addIceCandidate(data);
      }
    }
  }

  private createPeer(targetUserId: string, stream: MediaStream | null): PeerConnection {
    const pc = new PeerConnection({
      targetUserId,
      iceServers: this.iceServers,
      localStream: stream,
      onSignal: (signal) => this.sendSignal(targetUserId, signal),
      onConnectionStateChange: (state) => {
        if (state === "connected") this.dispatchStatus("Connected!");
        if (state === "failed") this.dispatchStatus("Connection Failed");
      },
      onIceConnectionStateChange: (state) => {
        if (state === "failed") this.dispatchStatus("Network Blocked (ICE Failed)");
      }
    });
    this.peers.set(targetUserId, pc);
    return pc;
  }

  // Group Call
  async startGroupCall() {
    await this.streamService.getStream();
    this.sendWsMessage("START_GROUP_CALL", {});
  }

  async joinGroupCall() {
    await this.streamService.getStream();
    this.sendWsMessage("JOIN_GROUP_CALL", {});
  }

  leaveGroupCall() {
    this.peers.forEach((_, id) => this.removePlayer(id));
    this.streamService.stop();
    this.sendWsMessage("LEAVE_GROUP_CALL", {});
  }

  // Audio Zones
  async joinAudioZone(zoneId: string) {
    await this.streamService.getStream();
    this.sendWsMessage("JOIN_AUDIO_ZONE", { zoneId });
  }

  leaveAudioZone() {
    this.peers.forEach((_, id) => this.removePlayer(id));
    this.streamService.stop();
    this.sendWsMessage("LEAVE_AUDIO_ZONE", {});
  }

  // 1-to-1 Calls
  sendCallRequest(targetUserId: string) {
    if (this.peers.has(targetUserId) || targetUserId === this.myUserId) return;
    this.sendWsMessage("CALL_REQUEST", { targetUserId });
  }

  async acceptCall(fromUserId: string) {
    if (this.peers.has(fromUserId)) return;
    const stream = await this.streamService.getStream();
    this.createPeer(fromUserId, stream);
    this.sendWsMessage("CALL_ACCEPTED", { targetUserId: fromUserId });
  }

  async startCallAsInitiator(targetUserId: string) {
    if (this.peers.has(targetUserId)) return;
    const stream = await this.streamService.getStream();
    const pc = this.createPeer(targetUserId, stream);
    const offer = await pc.createOffer();
    this.sendSignal(targetUserId, offer);
  }

  declineCall(fromUserId: string) {
    this.sendWsMessage("CALL_DECLINED", { targetUserId: fromUserId });
  }

  removePlayer(userId: string) {
    const pc = this.peers.get(userId);
    if (pc) {
      pc.close();
      this.peers.delete(userId);
    }
  }

  endCall(userId: string, options?: { notifyPeer?: boolean }) {
    this.removePlayer(userId);
    this.pendingCandidates.delete(userId);
    if (options?.notifyPeer !== false) {
      this.sendWsMessage("CALL_ENDED", { targetUserId: userId });
    }
  }

  toggleMute(mute: boolean) { this.streamService.toggleMute(mute); }

  private queueCandidate(userId: string, candidate: RTCIceCandidateInit) {
    if (!this.pendingCandidates.has(userId)) this.pendingCandidates.set(userId, []);
    this.pendingCandidates.get(userId)!.push(candidate);
  }

  private async processPendingCandidates(userId: string, pc: PeerConnection) {
    const candidates = this.pendingCandidates.get(userId);
    if (candidates) {
      for (const cand of candidates) await pc.addIceCandidate(cand);
      this.pendingCandidates.delete(userId);
    }
  }

  private sendSignal(targetUserId: string, signal: any) {
    this.sendWsMessage("WEBRTC_SIGNAL", { targetUserId, signal });
  }

  private sendWsMessage(type: string, payload: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  private dispatchStatus(status: string) {
    window.dispatchEvent(new CustomEvent("call-status", { detail: { status } }));
  }

  destroy() {
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.streamService.stop();
  }
}
