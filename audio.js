/* Drum Groove Editor - Web Audio percussion engine (original implementation) */
(function (global) {
  'use strict';

  const AudioEngine = {
    ctx: null,
    master: null,
    limiter: null,
    metBus: null,
    _noise: null,
    _metVol: 0.7,
    samples: null,      // sample id -> decoded AudioBuffer, once loaded
    gmMap: null,        // General MIDI drum note -> sample id (from samples.js)
    _loading: false,

    ensure() {
      if (!this.ctx) {
        const AC = global.AudioContext || global.webkitAudioContext;
        this.ctx = new AC();
        // master -> limiter -> output, so overlapping hits don't clip
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.8;
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -8;
        this.limiter.knee.value = 6;
        this.limiter.ratio.value = 12;
        this.limiter.attack.value = 0.003;
        this.limiter.release.value = 0.25;
        this.master.connect(this.limiter).connect(this.ctx.destination);
        this.metBus = this.ctx.createGain();
        this.metBus.gain.value = this._metVol;
        this.metBus.connect(this.master);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },

    now() { return this.ensure().currentTime; },

    setMetronomeVolume(v) {
      this._metVol = Math.max(0, Math.min(1, v));
      if (this.metBus) this.metBus.gain.value = this._metVol;
    },
    metronomeVolume() { return this._metVol; },

    noiseBuffer() {
      const ctx = this.ensure();
      if (!this._noise) {
        const len = Math.floor(ctx.sampleRate * 1.2);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this._noise = buf;
      }
      return this._noise;
    },

    noise(t, dur, type, freq, q, gain, dest) {
      const ctx = this.ensure();
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer();
      const filt = ctx.createBiquadFilter();
      filt.type = type; filt.frequency.value = freq;
      if (q) filt.Q.value = q;
      const env = ctx.createGain();
      env.gain.setValueAtTime(gain, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filt).connect(env).connect(dest || this.master);
      src.start(t); src.stop(t + dur + 0.05);
      return { src, filt, env };
    },

    beep(t, freq, dur, gain, type, dest) {
      const ctx = this.ensure();
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      env.gain.setValueAtTime(gain, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(env).connect(dest || this.master);
      osc.start(t); osc.stop(t + dur + 0.02);
      return osc;
    },

    kick(t, gain) {
      const g = gain == null ? 1 : gain;
      const ctx = this.ensure();
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(46, t + 0.12);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(g, t + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(env).connect(this.master);
      osc.start(t); osc.stop(t + 0.45);
      this.beep(t, 320, 0.03, 0.4 * g, 'triangle');
    },

    snare(t, gain) {
      const g = gain == null ? 1 : gain;
      this.noise(t, 0.2, 'highpass', 1500, 0, 0.9 * g);
      this.beep(t, 185, 0.12, 0.5 * g, 'triangle');
    },

    xstick(t, gain, dest) {
      const g = gain == null ? 1 : gain;
      this.noise(t, 0.05, 'bandpass', 2500, 6, 0.7 * g, dest);
      this.beep(t, 400, 0.05, 0.35 * g, 'square', dest);
    },

    hat(t, open, gain, dest) {
      const g = gain == null ? 1 : gain;
      this.noise(t, open ? 0.34 : 0.06, 'highpass', 7000, 0, 0.55 * g, dest);
    },

    crash(t, gain) {
      const g = gain == null ? 1 : gain;
      this.noise(t, 1.3, 'highpass', 4500, 0, 0.5 * g);
      this.noise(t, 0.6, 'bandpass', 9000, 1, 0.25 * g);
    },

    ride(t, gain) {
      const g = gain == null ? 1 : gain;
      this.noise(t, 0.5, 'highpass', 5000, 0, 0.22 * g);
      this.beep(t, 520, 0.5, 0.12 * g, 'square');
      this.beep(t, 780, 0.4, 0.08 * g, 'square');
    },

    rideBell(t, gain) {
      const g = gain == null ? 1 : gain;
      this.beep(t, 900, 0.5, 0.22 * g, 'square');
      this.beep(t, 1350, 0.4, 0.12 * g, 'square');
    },

    cowbell(t, gain, dest) {
      const g = gain == null ? 1 : gain;
      this.beep(t, 540, 0.25, 0.28 * g, 'square', dest);
      this.beep(t, 800, 0.22, 0.2 * g, 'square', dest);
    },

    tom(t, high, gain) {
      const g = gain == null ? 1 : gain;
      const f0 = high ? 220 : 120;
      const osc = this.beep(t, f0, 0.4, 0.8 * g, 'sine');
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.25);
    },

    click(t, accent) {
      this.beep(t, accent ? 1500 : 1000, 0.04, accent ? 0.35 : 0.2, 'square');
    },

    // Selectable metronome sounds, routed through the metronome gain bus.
    metronome(sound, t, accent) {
      const hi = !!accent;
      const dest = this.ensure().metBus;
      switch (sound) {
        case 'beep':
          this.beep(t, hi ? 1600 : 1040, 0.09, hi ? 0.36 : 0.22, 'sine', dest);
          return;
        case 'bell':
          this.beep(t, hi ? 1760 : 1320, 0.36, 0.26, 'sine', dest);
          this.beep(t, hi ? 2640 : 1980, 0.22, 0.10, 'sine', dest);
          return;
        case 'woodblock':
          this.noise(t, 0.04, 'bandpass', 1900, 8, hi ? 0.6 : 0.4, dest);
          this.beep(t, hi ? 1250 : 950, 0.05, hi ? 0.32 : 0.22, 'square', dest);
          return;
        case 'cowbell':
          this.cowbell(t, hi ? 0.85 : 0.55, dest);
          return;
        case 'rim':
          this.xstick(t, hi ? 0.95 : 0.6, dest);
          return;
        case 'hat':
          this.hat(t, hi, hi ? 0.7 : 0.42, dest);
          return;
        case 'click':
        default:
          this.beep(t, hi ? 1500 : 1000, 0.04, hi ? 0.35 : 0.2, 'square', dest);
          return;
      }
    },

    // Decode the embedded real drum samples (called on the first user gesture).
    loadSamples() {
      if (this._loading || !global.DRUM_SAMPLES) return;
      this._loading = true;
      this.samples = this.samples || {};
      this.gmMap = global.GM_DRUM_MAP || {};
      const ctx = this.ensure();
      const data = global.DRUM_SAMPLES;
      const jobs = Object.keys(data).map((k) =>
        fetch(data[k])
          .then((r) => r.arrayBuffer())
          .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
          .then((buf) => { this.samples[k] = buf; })
          .catch((e) => { console.warn('[drum] sample failed:', k, e && e.message); })
      );
      Promise.all(jobs).catch(() => { /* the synth fallback covers any misses */ });
    },

    samplesReady() { return !!(this.samples && Object.keys(this.samples).length); },

    // Play a percussion hit by General MIDI note number.
    byNote(note, t, gain) {
      const g = gain == null ? 1 : gain;
      if (this.samples && this.gmMap) {
        const buf = this.samples[this.gmMap[note]];
        if (buf) {
          const src = this.ensure().createBufferSource();
          src.buffer = buf;
          const env = this.ensure().createGain();
          env.gain.value = Math.min(1.6, g);
          src.connect(env).connect(this.master);
          src.start(t);
          return;
        }
      }
      switch (note) {
        case 35: case 36: return this.kick(t, gain);
        case 37: return this.xstick(t, gain);
        case 38: case 39: return this.snare(t, gain);
        case 40: return this.snare(t, gain * 1.15);      // rimshot
        case 42: return this.hat(t, false, gain);
        case 44: return this.hat(t, false, gain * 0.6);  // hi-hat foot
        case 46: return this.hat(t, true, gain);
        case 49: case 57: return this.crash(t, gain);
        case 51: case 59: return this.ride(t, gain);
        case 53: return this.rideBell(t, gain);
        case 56: return this.cowbell(t, gain);
        case 41: case 43: case 45: case 47: return this.tom(t, false, gain);
        case 48: case 50: return this.tom(t, true, gain);
        default: return this.hat(t, false, gain);
      }
    },
  };

  global.AudioEngine = AudioEngine;
})(window);
