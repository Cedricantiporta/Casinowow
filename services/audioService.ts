
// Simple Web Audio API Synth for sound effects without external assets
class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private volume: number = 0.675; // Master volume (was 0.45, +50% again)
  private bufferCache: Record<string, AudioBuffer> = {};

  constructor() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        this.ctx = new Ctx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = this.volume;
      }
    } catch (e) {
      console.error("Web Audio API not supported");
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
    return this.muted;
  }

  // ── Base64 / data-URI sample playback ───────────────────────────────
  // Decodes a short base64-encoded clip once, caches it, and plays it.
  // Honors a single shared master gain so mute + volume apply uniformly.
  playBase64(key: string, dataUri: string, gainScale: number = 1) {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const fire = (buf: AudioBuffer) => {
      const src = this.ctx!.createBufferSource();
      src.buffer = buf;
      const g = this.ctx!.createGain();
      g.gain.value = gainScale;
      src.connect(g); g.connect(this.masterGain!);
      src.start();
    };
    const cached = this.bufferCache[key];
    if (cached) { fire(cached); return; }
    try {
      const b64 = dataUri.split(',')[1] || dataUri;
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      this.ctx.decodeAudioData(bytes.buffer, (buf) => { this.bufferCache[key] = buf; fire(buf); }, () => {});
    } catch (e) { /* ignore bad sample */ }
  }

  playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  playSpinStart() {
    // Completely silent as requested
  }

  playReelStop() {
    this.playTone(150, 'sine', 0.05); 
  }
  
  playScatterTrigger() {
    if (!this.ctx) return;
    for (let i = 0; i < 40; i++) {
        const startTime = i * 0.05; 
        const freq = i % 2 === 0 ? 750 : 800;
        this.playTone(freq, 'square', 0.05, startTime);
    }
  }

  playWinCheer() {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const t = this.ctx.currentTime;

    // Create Brown/Pinkish noise for "roar"
    const bufferSize = this.ctx.sampleRate * 3; // 3 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; 
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(1000, t);
    noiseFilter.frequency.linearRampToValueAtTime(500, t + 2);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.4, t + 0.2);
    noiseGain.gain.linearRampToValueAtTime(0, t + 3);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);

    for(let i=0; i<30; i++) {
        const start = t + (Math.random() * 2.5);
        this.playClap(start);
    }
  }

  playClap(startTime: number) {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100 + Math.random() * 200, startTime);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.1);
  }

  playWinSmall() {
    this.playTone(523.25, 'triangle', 0.2, 0); 
    this.playTone(659.25, 'triangle', 0.2, 0.1); 
    this.playTone(783.99, 'triangle', 0.4, 0.2); 
  }

  playWinBig() {
    [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 523.25].forEach((freq, i) => {
      this.playTone(freq, 'sawtooth', 0.15, i * 0.08);
    });
  }

  playLevelUp() {
    this.playTone(440, 'sine', 0.5);
    this.playTone(880, 'sine', 1.0, 0.1);
  }
  
  playClick() {
      this.playTone(1200, 'sine', 0.05);
  }

  playStoneBreak() {
      // White noise burst for stone breaking/poof
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator(); // Using oscillator for low rumble
      osc.type = 'square';
      osc.frequency.setValueAtTime(50, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.1);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
  }

  playGemFound() {
      // High pitched sparkling sound
      this.playTone(1200, 'sine', 0.2, 0);
      this.playTone(1500, 'sine', 0.2, 0.1);
      this.playTone(1800, 'sine', 0.4, 0.2);
      this.playTone(2200, 'triangle', 0.5, 0.3);
  }

  // ── New short SFX (compact synth, no external assets) ───────────────

  // Single coin "ting" — bright two-tone metallic pop
  playCoin() {
      this.playTone(1318.5, 'triangle', 0.08, 0);
      this.playTone(1975.5, 'sine', 0.12, 0.04);
  }

  // Coin counting tick — short metallic ping, slightly randomised pitch
  // Call this once per ~80ms step inside a count-up interval.
  playCoinTick(speed: number = 1) {
      if (!this.ctx || !this.masterGain) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const freq = 1200 + Math.random() * 400; // 1200–1600 Hz randomised
      const dur = Math.max(0.025, 0.06 / speed);
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, this.ctx.currentTime + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.connect(g); g.connect(this.masterGain);
      osc.start(); osc.stop(this.ctx.currentTime + dur);
  }

  // Cascading coin shower — rapid descending tings
  playCoinShower() {
      for (let i = 0; i < 12; i++) {
          const f = 1800 - i * 60 + (Math.random() * 120 - 60);
          this.playTone(f, 'triangle', 0.09, i * 0.045);
      }
  }

  // Tumble/cascade pop for falling symbols
  playCascade() {
      this.playTone(300, 'sine', 0.06, 0);
      this.playTone(420, 'sine', 0.08, 0.05);
  }

  // Soft UI hover tick
  playHover() {
      this.playTone(2000, 'sine', 0.03, 0);
  }

  // Cash-register "cha-ching" purchase confirm
  playPurchase() {
      this.playTone(1046.5, 'square', 0.06, 0);
      this.playTone(1567.98, 'square', 0.06, 0.06);
      this.playTone(2093, 'triangle', 0.25, 0.12);
      this.playTone(2637, 'sine', 0.3, 0.16);
  }

  // Error / not-enough / denied — descending buzz
  playError() {
      this.playTone(300, 'sawtooth', 0.12, 0);
      this.playTone(200, 'sawtooth', 0.18, 0.1);
  }

  // Whoosh — quick filtered noise sweep (transitions / spin kickoff)
  playWhoosh() {
      if (!this.ctx || !this.masterGain) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const size = Math.floor(this.ctx.sampleRate * 0.35);
      const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(3000, t + 0.3);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      noise.connect(filter); filter.connect(g); g.connect(this.masterGain);
      noise.start(t); noise.stop(t + 0.35);
  }

  // Sparkle — fast arpeggio shimmer
  playSparkle() {
      [1568, 1976, 2349, 2637, 3136].forEach((f, i) => this.playTone(f, 'sine', 0.12, i * 0.04));
  }

  // Card flip — short woody click pair
  playCardFlip() {
      this.playTone(600, 'square', 0.03, 0);
      this.playTone(900, 'triangle', 0.05, 0.04);
  }

  // Unlock / achievement — rising fanfare
  playUnlock() {
      [523.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.playTone(f, 'triangle', 0.18, i * 0.09));
  }

  // Countdown tick (timers)
  playTick() {
      this.playTone(880, 'square', 0.04, 0);
  }

  // Mega win fanfare — big triumphant run
  playMegaWin() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
          this.playTone(f, 'sawtooth', 0.18, i * 0.1);
      });
      for (let i = 0; i < 16; i++) this.playTone(2200 + Math.random() * 800, 'sine', 0.1, 0.4 + i * 0.05);
  }

  // Wheel / roulette spin — accelerating ticks
  playWheelSpin() {
      for (let i = 0; i < 22; i++) {
          this.playTone(1000, 'square', 0.02, Math.pow(i / 22, 1.6) * 1.6);
      }
  }
}

export const audioService = new AudioService();
