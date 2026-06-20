
class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxMuted: boolean = false;
  private musicMuted: boolean = false;
  private volume: number = 0.675;
  private bufferCache: Record<string, AudioBuffer> = {};
  private musicEl: HTMLAudioElement | null = null;
  private currentMusicSrc = '';

  constructor() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        this.ctx = new Ctx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = this.volume;
      }
    } catch (e) {}
    this.preloadSfx();
  }

  private preloadSfx() {
    const paths = [
      '/sfx/bigwin_soundeffect.wav', '/sfx/greatwin_soundeffect.wav',
      '/sfx/epicwin_soundeffect.wav', '/sfx/megawin_soundeffect.wav',
      '/sfx/ultimatewin_soundeffect.wav', '/sfx/grandjackpot_soundeffect.wav',
      '/sfx/majorjackpot_soundeffect.wav', '/sfx/megajackpot_soundeffect.wav',
      '/sfx/minijackpot_soundeffect.wav', '/sfx/minorjackpot_soundeffect.wav',
      '/sfx/scatter_soundeffect.wav', '/sfx/cointcount_soundeffect.wav',
      '/sfx/freespin_soundeffect.wav', '/sfx/bonus_soundeffect.wav',
    ];
    paths.forEach(p => this.loadBuffer(p));
  }

  private loadBuffer(path: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return Promise.resolve(null);
    if (this.bufferCache[path]) return Promise.resolve(this.bufferCache[path]);
    return fetch(path)
      .then(r => r.arrayBuffer())
      .then(ab => this.ctx!.decodeAudioData(ab))
      .then(buf => { this.bufferCache[path] = buf; return buf; })
      .catch(() => null);
  }

  get isSfxMuted() { return this.sfxMuted; }
  get isMusicMuted() { return this.musicMuted; }

  toggleMute() {
    this.sfxMuted = !this.sfxMuted;
    this.musicMuted = this.sfxMuted;
    if (this.masterGain) this.masterGain.gain.value = this.sfxMuted ? 0 : this.volume;
    if (this.musicEl) this.musicEl.muted = this.musicMuted;
    return this.sfxMuted;
  }

  toggleSfxMute() {
    this.sfxMuted = !this.sfxMuted;
    if (this.masterGain) this.masterGain.gain.value = this.sfxMuted ? 0 : this.volume;
    return this.sfxMuted;
  }

  toggleMusicMute() {
    this.musicMuted = !this.musicMuted;
    if (this.musicEl) this.musicEl.muted = this.musicMuted;
    return this.musicMuted;
  }

  // ── File-based SFX via Web Audio API buffer ─────────────────────────────────
  private playSfxFile(path: string, vol = 1, opts?: { rate?: number; stopAfter?: number }) {
    if (this.sfxMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.loadBuffer(path).then(buf => {
      if (!buf || !this.ctx || !this.masterGain) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      if (opts?.rate) src.playbackRate.value = opts.rate;
      const g = this.ctx.createGain();
      g.gain.value = Math.min(1, vol);
      src.connect(g);
      g.connect(this.masterGain);
      src.start();
      if (opts?.stopAfter != null) src.stop(this.ctx.currentTime + opts.stopAfter);
    });
  }

  // ── Background music ────────────────────────────────────────────────────────
  playMusic(path: string, vol = 0.28) {
    if (path === this.currentMusicSrc && this.musicEl) return;
    this.currentMusicSrc = path;
    if (this.musicEl) { this.musicEl.pause(); this.musicEl = null; }
    if (this.musicMuted) return;
    const el = new Audio(path);
    el.loop = true;
    el.volume = vol;
    el.muted = this.musicMuted;
    el.play().catch(() => {});
    this.musicEl = el;
  }

  stopMusic() {
    this.currentMusicSrc = '';
    if (this.musicEl) { this.musicEl.pause(); this.musicEl = null; }
  }

  playLobbyMusic() { this.playMusic('/sfx/lobby_music.mp3'); }
  playHighLimitMusic() { this.playMusic('/sfx/highlimit_music.mp3'); }

  playSlotMusic(theme: string) {
    const map: Record<string, string> = {
      'ARCTIC':  '/sfx/arctic_music.mp3',
      'NEON':    '/sfx/neon_music.mp3',
      'PIGGY':   '/sfx/piggy_music.mp3',
      'PIRATE':  '/sfx/pirate_music.mp3',
      'CANDY':   '/sfx/sugar_music.mp3',
      'DRAGON':  '/sfx/dragon_music.mp3',
    };
    const src = map[theme];
    if (src) this.playMusic(src, 0.28);
    else this.stopMusic();
  }

  // ── Win tier SFX ────────────────────────────────────────────────────────────
  playWinTier(tier: string) {
    const map: Record<string, string> = {
      'BIG WIN':     '/sfx/bigwin_soundeffect.wav',
      'GREAT WIN':   '/sfx/greatwin_soundeffect.wav',
      'EPIC WIN':    '/sfx/epicwin_soundeffect.wav',
      'MEGA WIN':    '/sfx/megawin_soundeffect.wav',
      'ULTIMATE WIN':'/sfx/ultimatewin_soundeffect.wav',
    };
    const src = map[tier];
    if (!src) { this.playWinBig(); return; }
    this.loadBuffer(src).then(buf => {
      if (buf) this.playSfxFile(src, 0.9);
      else this.playWinBig();
    });
  }

  // ── Jackpot SFX ─────────────────────────────────────────────────────────────
  playJackpotSound(tier: string) {
    const map: Record<string, string> = {
      'MINI':  '/sfx/minijackpot_soundeffect.wav',
      'MINOR': '/sfx/minorjackpot_soundeffect.wav',
      'MAJOR': '/sfx/majorjackpot_soundeffect.wav',
      'MEGA':  '/sfx/megajackpot_soundeffect.wav',
      'GRAND': '/sfx/grandjackpot_soundeffect.wav',
    };
    const src = map[tier];
    if (!src) return;
    this.loadBuffer(src).then(buf => {
      if (buf) this.playSfxFile(src, 1.0);
      else this.playWinBig();
    });
  }

  // ── Scatter / free spins ────────────────────────────────────────────────────
  playScatterTrigger() {
    this.playSfxFile('/sfx/scatter_soundeffect.wav', 0.9);
  }

  playFreeSpinTrigger() {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.loadBuffer('/sfx/freespin_soundeffect.wav').then(buf => {
      if (buf) { this.playSfxFile('/sfx/freespin_soundeffect.wav', 0.9); return; }
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + i * 0.08);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.5, t + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);
        osc.connect(g); g.connect(this.masterGain!);
        osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.4);
      });
      [2637, 3136].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + 0.6 + i * 0.07);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.35, t + 0.6 + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6 + i * 0.07 + 0.3);
        osc.connect(g); g.connect(this.masterGain!);
        osc.start(t + 0.6 + i * 0.07); osc.stop(t + 0.6 + i * 0.07 + 0.35);
      });
    });
  }

  playBonusTrigger() {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.loadBuffer('/sfx/bonus_soundeffect.wav').then(buf => {
      if (buf) { this.playSfxFile('/sfx/bonus_soundeffect.wav', 0.9); return; }
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      const boom = this.ctx.createOscillator();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(90, t);
      boom.frequency.exponentialRampToValueAtTime(35, t + 0.45);
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.75, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      boom.connect(bg); bg.connect(this.masterGain);
      boom.start(t); boom.stop(t + 0.5);
      [220, 277.18, 329.63, 440, 554.37, 659.25].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + 0.15 + i * 0.09);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.4, t + 0.15 + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15 + i * 0.09 + 0.3);
        osc.connect(g); g.connect(this.masterGain!);
        osc.start(t + 0.15 + i * 0.09); osc.stop(t + 0.15 + i * 0.09 + 0.35);
      });
    });
  }

  // ── Coin count-up tick — 40% shorter, very quiet ───────────────────────────
  playCoinTick(_speed: number = 1) {
    this.playSfxFile('/sfx/cointcount_soundeffect.wav', 0.03, { rate: 1.667 });
  }

  // ── Synth helpers (kept for fallbacks + misc UI) ────────────────────────────
  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  playSpinStart() {}
  playReelStop() { this.playTone(150, 'sine', 0.05); }

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

  playWinCheer() {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 3;
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
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1000, t);
    noiseFilter.frequency.linearRampToValueAtTime(500, t + 2);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.4, t + 0.2);
    noiseGain.gain.linearRampToValueAtTime(0, t + 3);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(this.masterGain);
    noise.start(t);
    for (let i = 0; i < 30; i++) {
      const start = t + (Math.random() * 2.5);
      this.playClap(start);
    }
  }

  private playClap(startTime: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100 + Math.random() * 200, startTime);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(startTime); osc.stop(startTime + 0.1);
  }

  playLevelUp() { this.playTone(440, 'sine', 0.5); this.playTone(880, 'sine', 1.0, 0.1); }
  playClick() { this.playTone(1200, 'sine', 0.05); }

  playStoneBreak() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(50, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.1);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.15);
  }

  playGemFound() {
    this.playTone(1200, 'sine', 0.2, 0);
    this.playTone(1500, 'sine', 0.2, 0.1);
    this.playTone(1800, 'sine', 0.4, 0.2);
    this.playTone(2200, 'triangle', 0.5, 0.3);
  }

  playCoin() { this.playTone(1318.5, 'triangle', 0.08, 0); this.playTone(1975.5, 'sine', 0.12, 0.04); }
  playCoinShower() { for (let i = 0; i < 12; i++) { const f = 1800 - i * 60 + (Math.random() * 120 - 60); this.playTone(f, 'triangle', 0.09, i * 0.045); } }
  playCascade() { this.playTone(300, 'sine', 0.06, 0); this.playTone(420, 'sine', 0.08, 0.05); }
  playHover() { this.playTone(2000, 'sine', 0.03, 0); }

  playPurchase() {
    this.playTone(1046.5, 'square', 0.06, 0);
    this.playTone(1567.98, 'square', 0.06, 0.06);
    this.playTone(2093, 'triangle', 0.25, 0.12);
    this.playTone(2637, 'sine', 0.3, 0.16);
  }

  playError() { this.playTone(300, 'sawtooth', 0.12, 0); this.playTone(200, 'sawtooth', 0.18, 0.1); }

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

  playSparkle() { [1568, 1976, 2349, 2637, 3136].forEach((f, i) => this.playTone(f, 'sine', 0.12, i * 0.04)); }
  playCardFlip() { this.playTone(600, 'square', 0.03, 0); this.playTone(900, 'triangle', 0.05, 0.04); }
  playUnlock() { [523.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.playTone(f, 'triangle', 0.18, i * 0.09)); }
  playTick() { this.playTone(880, 'square', 0.04, 0); }

  playMegaWin() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
      this.playTone(f, 'sawtooth', 0.18, i * 0.1);
    });
    for (let i = 0; i < 16; i++) this.playTone(2200 + Math.random() * 800, 'sine', 0.1, 0.4 + i * 0.05);
  }

  playWheelSpin() {
    for (let i = 0; i < 22; i++) {
      this.playTone(1000, 'square', 0.02, Math.pow(i / 22, 1.6) * 1.6);
    }
  }

  // kept for compatibility
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
    try {
      const b64 = dataUri.split(',')[1] || dataUri;
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      this.ctx.decodeAudioData(bytes.buffer, (buf) => { fire(buf); }, () => {});
    } catch (e) {}
  }
}

export const audioService = new AudioService();
