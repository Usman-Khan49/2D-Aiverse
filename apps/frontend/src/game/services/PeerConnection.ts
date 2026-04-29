export interface PeerConnectionConfig {
  targetUserId: string;
  iceServers: RTCIceServer[];
  localStream: MediaStream | null;
  onSignal: (signal: RTCSessionDescriptionInit | RTCIceCandidateInit) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
}

export class PeerConnection {
  private pc: RTCPeerConnection;
  private targetUserId: string;

  constructor(config: PeerConnectionConfig) {
    this.targetUserId = config.targetUserId;
    this.pc = new RTCPeerConnection({ iceServers: config.iceServers });

    if (config.localStream) {
      config.localStream.getTracks().forEach(track => {
        this.pc.addTrack(track, config.localStream!);
      });
    }

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        config.onSignal(event.candidate.toJSON());
      }
    };

    this.pc.onconnectionstatechange = () => {
      config.onConnectionStateChange(this.pc.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      config.onIceConnectionStateChange(this.pc.iceConnectionState);
    };

    this.pc.ontrack = (event) => {
      this.handleRemoteTrack(event);
    };
  }

  private handleRemoteTrack(event: RTCTrackEvent) {
    console.log(`PeerConnection: Received remote track from ${this.targetUserId}. Kind: ${event.track.kind}`);

    let audio = document.getElementById(`rtc-audio-${this.targetUserId}`) as HTMLAudioElement;
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = `rtc-audio-${this.targetUserId}`;
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audio.controls = true;
      audio.volume = 1.0;
      audio.style.position = "fixed";
      audio.style.bottom = "20px";
      audio.style.right = "20px";
      audio.style.zIndex = "9999";
      document.body.appendChild(audio);
    }

    audio.srcObject = event.streams[0];
    audio.play().catch(e => console.error("PeerConnection: audio.play() error:", e));
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(description));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  hasRemoteDescription(): boolean {
    return !!this.pc.remoteDescription;
  }

  close() {
    this.pc.close();
    const el = document.getElementById(`rtc-audio-${this.targetUserId}`);
    if (el) el.remove();
  }
}
