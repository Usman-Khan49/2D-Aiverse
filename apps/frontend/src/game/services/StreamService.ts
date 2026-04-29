export class StreamService {
  private localStream: MediaStream | null = null;
  private streamPromise: Promise<MediaStream | null> | null = null;

  async getStream(): Promise<MediaStream | null> {
    if (this.streamPromise) return this.streamPromise;

    this.streamPromise = (async () => {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        });
        this.localStream = micStream;
        console.log(`StreamService: Microphone stream active. Tracks: ${micStream.getAudioTracks().length}`);
        return micStream;
      } catch (err) {
        console.warn("StreamService: Failed to access microphone, falling back to test tone.", err);
        return this.createFallbackStream();
      }
    })();

    return this.streamPromise;
  }

  private async createFallbackStream(): Promise<MediaStream | null> {
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
      console.log(`StreamService: TEST TONE active. Tracks: ${dest.stream.getAudioTracks().length}`);
      return dest.stream;
    } catch (fallbackError) {
      console.warn("StreamService: Failed to create fallback tone stream.", fallbackError);
      return null;
    }
  }

  toggleMute(mute: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !mute;
      });
    }
  }

  stop() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      this.streamPromise = null;
    }
  }
}
