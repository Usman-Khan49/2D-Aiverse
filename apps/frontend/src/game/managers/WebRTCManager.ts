/**
 * WebRTCManager - Uses native RTCPeerConnection (no simple-peer).
 * 
 * Call flow:
 * 1. Player A clicks "Call" → sends CALL_REQUEST via WebSocket
 * 2. Player B sees incoming call → clicks Accept
 * 3. Player B creates peer, gets mic, sends CALL_ACCEPTED
 * 4. Player A receives CALL_ACCEPTED → creates peer, creates offer, sends via WEBRTC_SIGNAL
 * 5. Normal SDP + ICE exchange via WEBRTC_SIGNAL messages
 */
export class WebRTCManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private streamPromise: Promise<MediaStream | null> | null = null;
  private socket: WebSocket | null = null;
  private myUserId: string | null = null;
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private iceServers: RTCIceServer[] | null = null;

  constructor(socket: WebSocket | null, myUserId: string | null) {

    this.socket = socket;
    this.myUserId = myUserId;
  }

  setSocket(socket: WebSocket | null) {
    this.socket = socket;
  }

  setMyUserId(userId: string | null) {
    this.myUserId = userId;
  }

  setIceServers(iceServers: RTCIceServer[]) {
    this.iceServers = iceServers;
    console.log("WebRTC: ICE Servers updated from backend.");
  }

  async initLocalStream() {
    if (this.streamPromise) return this.streamPromise;

    this.streamPromise = (async () => {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false, // Turn off to prevent choppy/clipping audio
            noiseSuppression: false, // Turn off to prevent the browser from muting parts of your voice
            autoGainControl: false,  // Turn off so volume doesn't wildly fluctuate
          },
          video: false,
        });
        this.localStream = micStream;
        console.log(`WebRTC: Microphone stream active. Tracks: ${micStream.getAudioTracks().length}`);
        return micStream;
      } catch (err) {
        console.warn("WebRTC: Failed to access microphone, falling back to test tone.", err);

        try {
          const audioCtx = new AudioContext();
          await audioCtx.resume();
          const osc = audioCtx.createOscillator();
          osc.frequency.value = 440;
          const gain = audioCtx.createGain();
          gain.gain.value = 0.15;
          const dest = audioCtx.createMediaStreamDestination();
          osc.connect(gain);
          gain.connect(dest);
          osc.start();

          this.localStream = dest.stream;
          console.log(`WebRTC: TEST TONE active. Tracks: ${dest.stream.getAudioTracks().length}`);
          return dest.stream;
        } catch (fallbackError) {
          console.warn("WebRTC: Failed to create fallback tone stream.", fallbackError);
          return null;
        }
      }
    })();

    return this.streamPromise;
  }

  // ── Signaling: receive a WEBRTC_SIGNAL from another user ──

  async handleSignal(fromUserId: string, data: any) {
    const pc = this.peers.get(fromUserId);

    if (data.type === "offer") {
      // We received an offer — we should already have a peer from acceptCall
      let targetPc = pc;
      if (!targetPc) {
        console.warn(`WebRTC: Got offer from ${fromUserId} but no peer exists. Creating one.`);
        await this.initLocalStream();
        targetPc = this.createPeerConnection(fromUserId);
      }
      
      try {
        console.log(`WebRTC: Setting remote offer from ${fromUserId}...`);
        await targetPc.setRemoteDescription(new RTCSessionDescription(data));
        await this.processPendingCandidates(fromUserId, targetPc);
        
        console.log(`WebRTC: Creating answer for ${fromUserId}...`);
        const answer = await targetPc.createAnswer();
        await targetPc.setLocalDescription(answer);
        console.log(`WebRTC: Sending answer back to ${fromUserId}...`);
        this.sendSignal(fromUserId, targetPc.localDescription!);
      } catch (err) {
        console.error("WebRTC Error processing offer:", err);
      }

    } else if (data.type === "answer") {
      console.log(`WebRTC: Received answer from ${fromUserId}!`);
      if (!pc) { console.warn(`WebRTC: Got answer but no peer for ${fromUserId}`); return; }
      try {
        console.log(`WebRTC: Setting remote answer from ${fromUserId}...`);
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        await this.processPendingCandidates(fromUserId, pc);
        console.log(`WebRTC: Answer processed successfully! ICE negotiation should finish now.`);
      } catch (err) {
        console.error("WebRTC Error processing answer:", err);
      }


    } else if (data.candidate) {
      // ICE candidate
      if (!pc) {
        this.queueCandidate(fromUserId, data);
        return;
      }
      
      if (!pc.remoteDescription) {
        // Remote description isn't set yet, queue the candidate!
        this.queueCandidate(fromUserId, data);
      } else {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch (err) {
          console.error("WebRTC Error adding ICE candidate:", err);
        }
      }
    }
  }

  private queueCandidate(userId: string, candidate: RTCIceCandidateInit) {
    console.log(`WebRTC: Queuing ICE candidate for ${userId}`);
    if (!this.pendingCandidates.has(userId)) {
      this.pendingCandidates.set(userId, []);
    }
    this.pendingCandidates.get(userId)!.push(candidate);
  }

  private async processPendingCandidates(userId: string, pc: RTCPeerConnection) {
    const candidates = this.pendingCandidates.get(userId);
    if (candidates && candidates.length > 0) {
      console.log(`WebRTC: Processing ${candidates.length} queued ICE candidates for ${userId}`);
      for (const candidate of candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("WebRTC Error processing queued candidate:", err);
        }
      }
      this.pendingCandidates.delete(userId);
    }
  }


  // ── Call Flow ──

  sendCallRequest(targetUserId: string) {
    if (this.peers.has(targetUserId) || targetUserId === this.myUserId) return;
    console.log(`WebRTC: Sending call request to ${targetUserId}`);
    this.sendWsMessage("CALL_REQUEST", { targetUserId });
  }

  async acceptCall(fromUserId: string) {
    if (this.peers.has(fromUserId)) return;
    console.log(`WebRTC: Accepting call from ${fromUserId}`);

    // 1. Get audio stream
    await this.initLocalStream();

    // 2. Create our peer connection (receiver side, will wait for offer)
    this.createPeerConnection(fromUserId);

    // 3. NOW tell the caller we're ready
    this.sendWsMessage("CALL_ACCEPTED", { targetUserId: fromUserId });
  }

  async startCallAsInitiator(targetUserId: string) {
    if (this.peers.has(targetUserId)) return;
    console.log(`WebRTC: Starting call as initiator to ${targetUserId}`);

    // 1. Get audio stream
    await this.initLocalStream();

    // 2. Create peer connection
    const pc = this.createPeerConnection(targetUserId);

    // 3. Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.sendSignal(targetUserId, pc.localDescription!);
  }

  declineCall(fromUserId: string) {
    console.log(`WebRTC: Declining call from ${fromUserId}`);
    this.sendWsMessage("CALL_DECLINED", { targetUserId: fromUserId });
  }

  removePlayer(userId: string) {
    const pc = this.peers.get(userId);
    if (pc) {
      pc.close();
      this.peers.delete(userId);
    }
    const el = document.getElementById(`rtc-audio-${userId}`);
    if (el) el.remove();
  }

  endCall(userId: string, options?: { notifyPeer?: boolean }) {
    const notifyPeer = options?.notifyPeer ?? true;
    this.removePlayer(userId);
    this.pendingCandidates.delete(userId);
    if (notifyPeer) {
      this.sendWsMessage("CALL_ENDED", { targetUserId: userId });
    }
  }

  // ── Internal ──

  private createPeerConnection(targetUserId: string): RTCPeerConnection {
    console.log(`WebRTC: Creating RTCPeerConnection for ${targetUserId}`);

    const defaultIceServers = [{
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    }];

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers ?? defaultIceServers,
    });


    // Add our local audio tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
        console.log(`WebRTC: Added local track (kind: ${track.kind})`);
      });
    }

    // Send ICE candidates to the other peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(targetUserId, event.candidate.toJSON());
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`WebRTC: Connection state with ${targetUserId}: ${pc.connectionState}`);
      if (pc.connectionState === "connected") {
        window.dispatchEvent(new CustomEvent("call-status", { detail: { status: "Connected!" } }));
      } else if (pc.connectionState === "failed") {
        window.dispatchEvent(new CustomEvent("call-status", { detail: { status: "Connection Failed" } }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`WebRTC: ICE state with ${targetUserId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "failed") {
        window.dispatchEvent(new CustomEvent("call-status", { detail: { status: "Network Blocked (ICE Failed)" } }));
      }
    };


    // Receive remote tracks
    pc.ontrack = (event) => {
      console.log(`WebRTC: Received remote track from ${targetUserId}. Kind: ${event.track.kind}, Muted: ${event.track.muted}`);

      let audio = document.getElementById(`rtc-audio-${targetUserId}`) as HTMLAudioElement;
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = `rtc-audio-${targetUserId}`;
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
      audio.play().then(() => {
        console.log(`WebRTC: ✅ Audio playing from ${targetUserId}!`);
      }).catch(e => {
        console.error("WebRTC: audio.play() error:", e);
      });

      event.track.onunmute = () => console.log(`WebRTC: Track from ${targetUserId} UNMUTED`);
      event.track.onmute = () => console.warn(`WebRTC: Track from ${targetUserId} MUTED`);
    };

    this.peers.set(targetUserId, pc);
    return pc;
  }

  private sendSignal(targetUserId: string, signal: RTCSessionDescriptionInit | RTCIceCandidateInit) {
    this.sendWsMessage("WEBRTC_SIGNAL", { targetUserId, signal });
  }

  private sendWsMessage(type: string, payload: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  destroy() {
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    document.querySelectorAll('audio[id^="rtc-audio-"]').forEach(el => el.remove());
  }
}
