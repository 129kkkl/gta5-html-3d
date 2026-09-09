/**
 * Los Santos Audio Engine
 * Pure Web Audio API procedural synthesizer for engines, gunshots, explosions, sirens, radio stations & UI
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.engineGain = null;
    this.radioGain = null;

    this.isMuted = false;
    this.initialized = false;

    // Vehicle engine nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.isEngineRunning = false;

    // Radio
    this.currentStation = 0;
    this.radioPlaying = false;
    this.radioInterval = null;
    this.radioStep = 0;

    // Siren
    this.sirenOsc = null;
    this.sirenGain = null;
    this.isSirenPlaying = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.masterGain);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.35;
      this.engineGain.connect(this.masterGain);

      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.value = 0.45;
      this.radioGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ================= UI & COMBAT SOUNDS =================
  playClick() {
    if (!this.initialized) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playHitmarker() {
    if (!this.initialized) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1800, this.ctx.currentTime + 0.02);
    g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playCash() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    [1046.5, 1318.5, 1567.98, 2093].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      g.gain.setValueAtTime(0.2, now + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }

  playPunch() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);

    this.playNoiseBurst(0.08, 0.4, 600);
  }

  playNoiseBurst(duration, volume, filterFreq = 1000) {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  playGunshot(type = 'pistol') {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;

    let bassFreq = 160;
    let burstDur = 0.25;
    let noiseFilter = 2200;
    let vol = 0.7;

    switch (type) {
      case 'pistol':
        bassFreq = 180; burstDur = 0.22; noiseFilter = 2000; vol = 0.6;
        break;
      case 'smg':
        bassFreq = 150; burstDur = 0.18; noiseFilter = 2800; vol = 0.55;
        break;
      case 'rifle':
        bassFreq = 130; burstDur = 0.35; noiseFilter = 2400; vol = 0.75;
        break;
      case 'shotgun':
        bassFreq = 90; burstDur = 0.45; noiseFilter = 1800; vol = 0.95;
        break;
      case 'sniper':
        bassFreq = 80; burstDur = 0.6; noiseFilter = 1600; vol = 1.0;
        break;
      case 'rpg':
        bassFreq = 60; burstDur = 0.8; noiseFilter = 1200; vol = 1.0;
        break;
    }

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(bassFreq, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + burstDur);
    oscGain.gain.setValueAtTime(vol * 0.8, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + burstDur);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + burstDur);

    this.playNoiseBurst(burstDur * 0.8, vol, noiseFilter);
  }

  playExplosion() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);
    g.gain.setValueAtTime(0.9, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.2);

    this.playNoiseBurst(1.0, 0.85, 900);
  }

  playMissionPassed() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0.0, d: 0.2 },
      { f: 659.25, t: 0.18, d: 0.2 },
      { f: 783.99, t: 0.36, d: 0.2 },
      { f: 1046.5, t: 0.54, d: 0.6 },
      { f: 880.00, t: 0.90, d: 0.3 },
      { f: 1046.5, t: 1.20, d: 1.2 }
    ];

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now + n.t);

      g.gain.setValueAtTime(0.3, now + n.t);
      g.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }

  playWasted() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 2.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 2.5);

    g.gain.setValueAtTime(0.6, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 2.5);
  }

  // ================= VEHICLE ENGINE SYNTH =================
  startEngine(vehicleType = 'car') {
    if (!this.initialized || this.isEngineRunning) return;
    const now = this.ctx.currentTime;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';

    this.engineOsc1.frequency.setValueAtTime(45, now);
    this.engineOsc2.frequency.setValueAtTime(90, now);

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(350, now);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);

    this.engineOsc1.start(now);
    this.engineOsc2.start(now);
    this.isEngineRunning = true;
  }

  updateEngine(rpmRatio = 0.2, speedRatio = 0) {
    if (!this.isEngineRunning || !this.initialized) return;
    const now = this.ctx.currentTime;

    const baseFreq = 40 + rpmRatio * 180 + speedRatio * 40;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);

    const filterFreq = 300 + rpmRatio * 1200;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);
  }

  stopEngine() {
    if (!this.isEngineRunning || !this.initialized) return;
    const now = this.ctx.currentTime;
    try {
      this.engineOsc1.stop(now);
      this.engineOsc2.stop(now);
    } catch(e){}
    this.isEngineRunning = false;
  }

  playHorn() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(440, now);
    osc2.frequency.setValueAtTime(350, now);

    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  playTireSkid() {
    if (!this.initialized) return;
    this.playNoiseBurst(0.12, 0.3, 1400);
  }

  // ================= POLICE SIREN =================
  startSiren() {
    if (this.isSirenPlaying || !this.initialized) return;
    const now = this.ctx.currentTime;

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenGain = this.ctx.createGain();

    this.sirenOsc.type = 'sine';
    this.sirenGain.gain.setValueAtTime(0.25, now);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);
    this.sirenOsc.start(now);
    this.isSirenPlaying = true;

    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfoGain = this.ctx.createGain();
    this.sirenLfo.frequency.setValueAtTime(0.5, now);
    this.sirenLfoGain.gain.setValueAtTime(250, now);
    this.sirenOsc.frequency.setValueAtTime(900, now);

    this.sirenLfo.connect(this.sirenOsc.frequency);
    this.sirenLfo.start(now);
  }

  stopSiren() {
    if (!this.isSirenPlaying || !this.initialized) return;
    try {
      this.sirenOsc.stop();
      this.sirenLfo.stop();
    } catch(e){}
    this.isSirenPlaying = false;
  }

  // ================= RADIO MUSIC SYNTHESIZER =================
  setStation(stationIndex) {
    this.currentStation = stationIndex;
    if (stationIndex === -1) {
      this.stopRadio();
    } else {
      this.startRadio();
    }
  }

  startRadio() {
    if (!this.initialized || this.radioPlaying) return;
    this.radioPlaying = true;
    this.radioStep = 0;

    if (this.radioInterval) clearInterval(this.radioInterval);
    this.radioInterval = setInterval(() => this.playRadioBeat(), 220);
  }

  stopRadio() {
    this.radioPlaying = false;
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
  }

  playRadioBeat() {
    if (!this.radioPlaying || !this.initialized) return;
    const now = this.ctx.currentTime;
    const step = this.radioStep % 16;
    this.radioStep++;

    let bassFreq = 65.41;
    if (this.currentStation === 0) {
      const rockChords = [130.81, 130.81, 146.83, 164.81, 174.61, 196.00, 164.81, 146.83];
      bassFreq = rockChords[step % 8] / 2;
    } else if (this.currentStation === 1) {
      const gFunkBass = [73.42, 73.42, 82.41, 98.00, 110.00, 98.00, 82.41, 73.42];
      bassFreq = gFunkBass[step % 8];
    } else if (this.currentStation === 2) {
      const flyLoNotes = [110.00, 130.81, 164.81, 196.00, 220.00, 196.00, 146.83, 123.47];
      bassFreq = flyLoNotes[step % 8];
    } else {
      const trapBass = [55.00, 55.00, 65.41, 55.00, 73.42, 65.41, 55.00, 48.99];
      bassFreq = trapBass[step % 8];
    }

    if (step % 2 === 0) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = this.currentStation === 1 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(bassFreq, now);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(g);
      g.connect(this.radioGain);
      osc.start(now);
      osc.stop(now + 0.35);
    }

    if (step === 0 || step === 8) {
      const kick = this.ctx.createOscillator();
      const kg = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(120, now);
      kick.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      kg.gain.setValueAtTime(0.35, now);
      kg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      kick.connect(kg);
      kg.connect(this.radioGain);
      kick.start(now);
      kick.stop(now + 0.15);
    }

    if (step === 4 || step === 12) {
      this.playNoiseBurst(0.12, 0.2, 3000);
    }

    if (step % 2 === 0) {
      this.playNoiseBurst(0.04, 0.08, 8000);
    }
  }
}
