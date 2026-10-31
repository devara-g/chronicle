// ─── Web Audio API Sound Synthesizer for Telephone Ringing & Dial Tones ────────
// Ringan 100%, 0 KB aset eksternal, bekerja instan di semua browser

class RingtoneService {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private isRinging: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Nada sambung saat memanggil (Outgoing dial tone: "Tuut... tuut...")
  startOutgoingTone() {
    this.stop();
    this.isRinging = true;

    const playTone = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.2);
        osc2.stop(ctx.currentTime + 1.2);
      } catch (e) {
        console.warn('AudioContext dialtone error:', e);
      }
    };

    playTone();
    this.intervalId = setInterval(playTone, 3000);
  }

  // Nada dering panggilan masuk (Incoming call ring: "Dring-dring...")
  startIncomingRing() {
    this.stop();
    this.isRinging = true;

    const playRing = () => {
      if (!this.isRinging) return;
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        const beep = (offset: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now + offset); // Note C5
          osc.frequency.setValueAtTime(659.25, now + offset + 0.15); // Note E5
          osc.frequency.setValueAtTime(783.99, now + offset + 0.3); // Note G5

          gain.gain.setValueAtTime(0.12, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + offset);
          osc.stop(now + offset + 0.45);
        };

        beep(0);
        beep(0.5);
      } catch (e) {
        console.warn('AudioContext ring error:', e);
      }
    };

    playRing();
    this.intervalId = setInterval(playRing, 2500);
  }

  // Berhenti berdering
  stop() {
    this.isRinging = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const ringtone = new RingtoneService();

