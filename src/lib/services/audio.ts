"use client";

class SoundManager {
  private ctx: AudioContext | null = null;
  
  // Ambient Wind nodes
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windLowpass: BiquadFilterNode | null = null;
  private windLfo: OscillatorNode | null = null;
  private windWhistleFilter: BiquadFilterNode | null = null;
  
  private isMuted: boolean = true;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      // Load preference from localStorage (default is muted: true)
      const storedMute = localStorage.getItem("silkroad_sound_muted");
      this.isMuted = storedMute !== "false";
    }
  }

  private init() {
    if (this.isInitialized) return;
    if (typeof window === "undefined") return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      this.ctx = new AudioCtx();
      this.isInitialized = true;
      
      // If we are unmuted, start the ambient windscape immediately
      if (!this.isMuted) {
        this.startWind();
      }
    } catch (err) {
      console.warn("Web Audio API not supported or failed to initialize:", err);
    }
  }

  private resumeContext() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.init();
    this.resumeContext();
    
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("silkroad_sound_muted", String(this.isMuted));
    }

    if (this.isMuted) {
      this.stopWind();
    } else {
      this.startWind();
    }

    return this.isMuted;
  }

  public getMuteStatus(): boolean {
    return this.isMuted;
  }

  // --- AMBIENT DESERT WIND SYNTHESIS ---
  private startWind() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    try {
      this.resumeContext();
      
      // Stop existing if any
      this.stopWind();

      const sampleRate = this.ctx.sampleRate;
      const bufferSize = sampleRate * 2; // 2 seconds of noise
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      // Fill buffer with white noise
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      // 1. Noise Source
      this.windSource = this.ctx.createBufferSource();
      this.windSource.buffer = noiseBuffer;
      this.windSource.loop = true;

      // 2. Lowpass Filter for deep wind rumble
      this.windLowpass = this.ctx.createBiquadFilter();
      this.windLowpass.type = "lowpass";
      this.windLowpass.Q.value = 2.0;
      this.windLowpass.frequency.value = 350;

      // 3. Whistling High-Pass/Bandpass filter for wind howling through oases
      this.windWhistleFilter = this.ctx.createBiquadFilter();
      this.windWhistleFilter.type = "bandpass";
      this.windWhistleFilter.Q.value = 25.0; // Resonant whistle
      this.windWhistleFilter.frequency.value = 1600;

      // 4. LFO to modulate filter frequencies (creates gusts)
      this.windLfo = this.ctx.createOscillator();
      this.windLfo.type = "sine";
      this.windLfo.frequency.value = 0.07; // Very slow cycle (approx 14s)

      const lfoGainLowpass = this.ctx.createGain();
      lfoGainLowpass.gain.value = 180; // modulate frequency by +/- 180Hz

      const lfoGainWhistle = this.ctx.createGain();
      lfoGainWhistle.gain.value = 350; // modulate whistle by +/- 350Hz

      // Connect LFO modulation
      this.windLfo.connect(lfoGainLowpass);
      lfoGainLowpass.connect(this.windLowpass.frequency);

      this.windLfo.connect(lfoGainWhistle);
      lfoGainWhistle.connect(this.windWhistleFilter.frequency);

      // 5. Gain & Volume mapping
      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
      
      // Connections
      this.windSource.connect(this.windLowpass);
      this.windSource.connect(this.windWhistleFilter);

      // Separate mix volumes
      const windLowpassGain = this.ctx.createGain();
      windLowpassGain.gain.value = 0.65;
      this.windLowpass.connect(windLowpassGain);
      windLowpassGain.connect(this.windGain);

      const windWhistleGain = this.ctx.createGain();
      windWhistleGain.gain.value = 0.08; // whistle should be soft and subtle
      this.windWhistleFilter.connect(windWhistleGain);
      windWhistleGain.connect(this.windGain);

      this.windGain.connect(this.ctx.destination);

      // Start nodes
      this.windSource.start(0);
      this.windLfo.start(0);

      // Smooth fade in
      this.windGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 2.0);
    } catch (err) {
      console.warn("Failed to start ambient wind synth:", err);
    }
  }

  private stopWind() {
    try {
      if (this.windGain && this.ctx) {
        // Smooth fade out
        const currentGain = this.windGain.gain.value;
        this.windGain.gain.setValueAtTime(currentGain, this.ctx.currentTime);
        this.windGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        
        const sourceToStop = this.windSource;
        const lfoToStop = this.windLfo;
        
        setTimeout(() => {
          try {
            sourceToStop?.stop();
            lfoToStop?.stop();
          } catch (e) {}
        }, 600);
      }
    } catch (err) {
      // fail silently
    } finally {
      this.windSource = null;
      this.windGain = null;
      this.windLowpass = null;
      this.windLfo = null;
      this.windWhistleFilter = null;
    }
  }

  // --- SOUND EFFECTS (SFX) ---

  /**
   * Tactile metallic coin click for map oases node clicks
   */
  public playClick() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.resumeContext();

    try {
      const now = this.ctx.currentTime;
      
      // Simulate coin clink with 3 high frequencies
      const freqs = [850, 1075, 2200, 3100];
      const gains = [0.15, 0.12, 0.08, 0.05];
      
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        
        // Quick decay envelope
        gainNode.gain.setValueAtTime(gains[idx], now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx!.destination);
        
        osc.start(now);
        osc.stop(now + 0.15);
      });
    } catch (err) {
      // fail silently
    }
  }

  /**
   * Oasis bell chime triggered on successful challenge execution
   */
  public playChime() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.resumeContext();

    try {
      const now = this.ctx.currentTime;
      
      // Arpeggiate C-Major pentatonic notes: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      
      // Setup Delay & Feedback for spacious desert chime echo
      const delay = this.ctx.createDelay();
      delay.delayTime.value = 0.15;
      
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.35; // 35% echo persistence
      
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.ctx.destination);

      notes.forEach((freq, index) => {
        const timeOffset = now + index * 0.07; // fast arpeggio
        
        const osc = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, timeOffset);
        // Add subtle vibrato (pitch variation)
        osc.frequency.linearRampToValueAtTime(freq + 8, timeOffset + 0.4);
        
        gainNode.gain.setValueAtTime(0.12, timeOffset);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, timeOffset + 0.8);
        
        osc.connect(gainNode);
        
        // Direct routing & delay routing
        gainNode.connect(this.ctx!.destination);
        gainNode.connect(delay);
        
        osc.start(timeOffset);
        osc.stop(timeOffset + 1.0);
      });
    } catch (err) {
      // fail silently
    }
  }

  /**
   * Low pitch sweeps + filtered noise burst representing a heavy wooden thud
   */
  public playThud() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.resumeContext();

    try {
      const now = this.ctx.currentTime;
      
      // Sweep low triangle oscillator down
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.2);
      
      gainNode.gain.setValueAtTime(0.35, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.25);

      // Low pass noise burst for thud impact
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = sampleRate * 0.15; // 150ms noise
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(110, now);
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      
      noise.start(now);
      noise.stop(now + 0.18);
    } catch (err) {
      // fail silently
    }
  }

  /**
   * Soft parchment paper sweep sound effect for speech bubble displays
   */
  public playRustle() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.resumeContext();

    try {
      const now = this.ctx.currentTime;
      
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = sampleRate * 0.12; // 120ms noise
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      
      // Bandpass filter centered at 950Hz
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(1.5, now);
      
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.07, now + 0.02); // quick fade in
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      
      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      noise.start(now);
      noise.stop(now + 0.15);
    } catch (err) {
      // fail silently
    }
  }
}

// Export a client-safe global singleton
export const audio = new SoundManager();
