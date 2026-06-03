
// Simple Web Audio API Synth for sound effects without external assets
class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;

  constructor() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        this.ctx = new Ctx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3; // Default volume
      }
    } catch (e) {
      console.error("Web Audio API not supported");
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
    return this.muted;
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
}

export const audioService = new AudioService();
