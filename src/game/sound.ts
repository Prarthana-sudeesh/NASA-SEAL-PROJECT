// Procedural sound: a looping space-ambience soundtrack and game sound effects, all synthesised
// with Web Audio (no audio files). Everything is silent while sound is switched off in the menu.
// Browsers only allow audio after the player clicks or taps, so audio starts on the first gesture.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let enabled = false;
let musicWanted = true;
let musicStop: (() => void) | null = null;
let unlocked = false;

const MUSIC_VOL = 0.32;
const SFX_VOL = 0.9;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !unlocked) return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.8;
      // Gentle limiter so stacked effects never clip.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      master.connect(comp).connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = MUSIC_VOL;
      musicBus.connect(master);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = SFX_VOL;
      sfxBus.connect(master);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Turns all sound on or off (driven by the settings store). */
export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on) {
    musicStop?.();
    musicStop = null;
    return;
  }
  if (musicWanted) startMusic();
}

/** Call from the first user gesture so the browser lets audio play. */
export function unlockAudio() {
  unlocked = true;
  if (!enabled) return;
  audio();
  if (musicWanted && !musicStop) startMusic();
}

// ---------- building blocks ----------

let noiseBuf: AudioBuffer | null = null;
function noise(a: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === a.sampleRate) return noiseBuf;
  const len = a.sampleRate * 2;
  noiseBuf = a.createBuffer(1, len, a.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

let brownBuf: AudioBuffer | null = null;
function brown(a: AudioContext): AudioBuffer {
  if (brownBuf && brownBuf.sampleRate === a.sampleRate) return brownBuf;
  const len = a.sampleRate * 2;
  brownBuf = a.createBuffer(1, len, a.sampleRate);
  const d = brownBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return brownBuf;
}

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  to?: number; // glide target
  at?: number; // delay in seconds
  dur?: number;
  vol?: number;
  attack?: number;
  detune?: number;
}

function tone(o: ToneOpts, bus?: AudioNode | null) {
  const a = audio();
  if (!a || !enabled) return;
  const t0 = a.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.15;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  if (o.detune) osc.detune.value = o.detune;
  const vol = o.vol ?? 0.2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(bus ?? sfxBus!);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

interface NoiseOpts {
  at?: number;
  dur?: number;
  vol?: number;
  type?: BiquadFilterType;
  freq?: number;
  to?: number;
  q?: number;
  attack?: number;
  brownian?: boolean;
}

function burst(o: NoiseOpts) {
  const a = audio();
  if (!a || !enabled) return;
  const t0 = a.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.3;
  const src = a.createBufferSource();
  src.buffer = o.brownian ? brown(a) : noise(a);
  src.loop = true;
  const f = a.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 1000, t0);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  f.Q.value = o.q ?? 1;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t0 + (o.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(sfxBus!);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

// ---------- sound effects ----------

const NOTES = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };

const EFFECTS = {
  /** Generic UI button. */
  click: () => {
    tone({ type: 'square', freq: 1400, to: 900, dur: 0.05, vol: 0.06 });
    tone({ type: 'sine', freq: 2600, dur: 0.03, vol: 0.04 });
  },
  /** Soft tick when hovering a big button. */
  hover: () => tone({ type: 'sine', freq: 1900, dur: 0.035, vol: 0.025 }),
  /** Big "go" button (ENTER, BUILD, LAUNCH). */
  confirm: () => {
    tone({ type: 'triangle', freq: NOTES.C5, dur: 0.12, vol: 0.14 });
    tone({ type: 'triangle', freq: NOTES.G5, at: 0.07, dur: 0.18, vol: 0.14 });
    tone({ type: 'sine', freq: NOTES.C6, at: 0.14, dur: 0.3, vol: 0.1 });
  },
  /** Login: systems powering up. */
  powerUp: () => {
    tone({ type: 'sawtooth', freq: 110, to: 880, dur: 0.6, vol: 0.06, attack: 0.05 });
    tone({ type: 'sine', freq: 220, to: 1760, dur: 0.6, vol: 0.08, attack: 0.05 });
    burst({ type: 'highpass', freq: 400, to: 6000, dur: 0.6, vol: 0.06, attack: 0.1 });
    tone({ type: 'triangle', freq: NOTES.E6, at: 0.55, dur: 0.4, vol: 0.08 });
  },
  /** Holographic swoosh when changing screens. */
  whoosh: () => burst({ type: 'bandpass', freq: 300, to: 3000, dur: 0.35, vol: 0.12, q: 2 }),
  /** Picking up a part. */
  pickup: () => tone({ type: 'triangle', freq: 400, to: 800, dur: 0.12, vol: 0.12 }),
  /** Part clamps onto the rocket: metal clank plus servo. */
  snap: () => {
    burst({ type: 'bandpass', freq: 2500, dur: 0.08, vol: 0.35, q: 8 });
    tone({ type: 'square', freq: 180, to: 90, dur: 0.12, vol: 0.12 });
    tone({ type: 'sine', freq: 1200, at: 0.02, dur: 0.25, vol: 0.06 });
    burst({ type: 'lowpass', freq: 600, at: 0.08, dur: 0.25, vol: 0.12 });
  },
  /** Dropped somewhere that doesn't fit. */
  error: () => {
    tone({ type: 'square', freq: 220, dur: 0.12, vol: 0.09 });
    tone({ type: 'square', freq: 165, at: 0.12, dur: 0.18, vol: 0.09 });
  },
  /** Dial turned one notch. */
  tick: () => tone({ type: 'square', freq: 2200, dur: 0.018, vol: 0.035 }),
  /** Dial entered its green zone. */
  zone: () => {
    tone({ type: 'sine', freq: NOTES.E6, dur: 0.12, vol: 0.06 });
    tone({ type: 'sine', freq: NOTES.G6, at: 0.06, dur: 0.15, vol: 0.06 });
  },
  /** Typing blip for speech bubbles. */
  blip: () => tone({ type: 'square', freq: 600 + Math.random() * 300, dur: 0.03, vol: 0.025 }),
  /** Quiz: right answer. */
  correct: () =>
    [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) =>
      tone({ type: 'triangle', freq: f, at: i * 0.08, dur: 0.3, vol: 0.13 }),
    ),
  /** Quiz: wrong answer. */
  wrong: () => {
    tone({ type: 'sawtooth', freq: 300, to: 120, dur: 0.4, vol: 0.08 });
    tone({ type: 'square', freq: 150, to: 80, dur: 0.4, vol: 0.05 });
  },
  /** Countdown beep. */
  count: () => tone({ type: 'sine', freq: 880, dur: 0.14, vol: 0.18 }),
  /** Final GO beep. */
  go: () => {
    tone({ type: 'sine', freq: 1320, dur: 0.5, vol: 0.2 });
    tone({ type: 'triangle', freq: 660, dur: 0.5, vol: 0.1 });
  },
  /** Engines ignite. */
  ignition: () => {
    burst({
      brownian: true,
      type: 'lowpass',
      freq: 200,
      to: 1200,
      dur: 1.2,
      vol: 0.9,
      attack: 0.05,
    });
    burst({ type: 'highpass', freq: 1500, dur: 0.8, vol: 0.2, attack: 0.02 });
    tone({ type: 'sawtooth', freq: 55, to: 40, dur: 1.4, vol: 0.18 });
  },
  /** Breaking through the sound barrier. */
  boom: () => {
    burst({ brownian: true, type: 'lowpass', freq: 300, to: 60, dur: 0.9, vol: 0.9 });
    tone({ type: 'sine', freq: 70, to: 35, dur: 0.8, vol: 0.4 });
  },
  /** Jump to light speed. */
  warp: () => {
    tone({ type: 'sawtooth', freq: 80, to: 1600, dur: 1.4, vol: 0.07, attack: 0.3 });
    tone({ type: 'sine', freq: 160, to: 3200, dur: 1.4, vol: 0.06, attack: 0.3 });
    burst({ type: 'bandpass', freq: 200, to: 8000, dur: 1.5, vol: 0.18, q: 3, attack: 0.4 });
    tone({ type: 'sine', freq: 40, at: 1.3, dur: 1, vol: 0.3 });
  },
  /** Approaching a planet: sonar ping. */
  ping: () => {
    tone({ type: 'sine', freq: 1200, dur: 0.9, vol: 0.12 });
    tone({ type: 'sine', freq: 1200, at: 0.45, dur: 0.6, vol: 0.05 });
  },
  /** Retro-rocket landing and touchdown thud. */
  landing: () => {
    burst({ brownian: true, type: 'lowpass', freq: 500, to: 200, dur: 1.6, vol: 0.5, attack: 0.2 });
    burst({ brownian: true, type: 'lowpass', freq: 150, at: 1.6, dur: 0.5, vol: 0.9 });
    tone({ type: 'sine', freq: 60, to: 30, at: 1.6, dur: 0.4, vol: 0.4 });
  },
  /** Re-entry burn and parachutes on the way home. */
  reentry: () => {
    burst({ type: 'bandpass', freq: 800, to: 300, dur: 2, vol: 0.25, q: 0.7, attack: 0.5 });
    burst({ type: 'highpass', freq: 3000, at: 1.6, dur: 0.15, vol: 0.2 });
  },
  /** Something went wrong. */
  explosion: () => {
    burst({ brownian: true, type: 'lowpass', freq: 1500, to: 80, dur: 1.8, vol: 1 });
    burst({ type: 'lowpass', freq: 4000, to: 200, dur: 0.7, vol: 0.5 });
    tone({ type: 'sine', freq: 90, to: 25, dur: 1.2, vol: 0.5 });
  },
  /** Systems shutting down (out of fuel). */
  powerDown: () => {
    tone({ type: 'sawtooth', freq: 880, to: 55, dur: 1.6, vol: 0.07 });
    tone({ type: 'sine', freq: 440, to: 30, dur: 1.6, vol: 0.1 });
  },
  /** Hull leak hiss. */
  hiss: () => burst({ type: 'highpass', freq: 4000, dur: 1.5, vol: 0.2, attack: 0.05 }),
  /** Warning siren. */
  alarm: () => {
    for (let i = 0; i < 3; i++) {
      tone({ type: 'square', freq: 700, to: 950, at: i * 0.4, dur: 0.2, vol: 0.07 });
      tone({ type: 'square', freq: 950, to: 700, at: i * 0.4 + 0.2, dur: 0.2, vol: 0.07 });
    }
  },
  /** Mission success fanfare. */
  fanfare: () => {
    const seq: [number, number, number][] = [
      [NOTES.C5, 0, 0.15],
      [NOTES.C5, 0.15, 0.1],
      [NOTES.C5, 0.25, 0.1],
      [NOTES.G5, 0.35, 0.5],
      [NOTES.E5, 0.85, 0.15],
      [NOTES.G5, 1.0, 0.15],
      [NOTES.C6, 1.15, 0.8],
    ];
    seq.forEach(([f, at, dur]) => {
      tone({ type: 'square', freq: f, at, dur, vol: 0.07 });
      tone({ type: 'triangle', freq: f / 2, at, dur, vol: 0.1 });
    });
  },
  /** Mission failed jingle. */
  sad: () =>
    [392, 370, 349, 262].forEach((f, i) =>
      tone({ type: 'triangle', freq: f, at: i * 0.25, dur: i === 3 ? 0.8 : 0.25, vol: 0.13 }),
    ),
  /** Score counting up. */
  coin: () => {
    tone({ type: 'square', freq: 988, dur: 0.06, vol: 0.05 });
    tone({ type: 'square', freq: 1319, at: 0.06, dur: 0.15, vol: 0.05 });
  },
  /** Confetti pops. */
  pop: () =>
    burst({ type: 'bandpass', freq: 1500 + Math.random() * 2000, dur: 0.06, vol: 0.18, q: 4 }),
} as const;

export type SfxName = keyof typeof EFFECTS;

const lastPlayed = new Map<SfxName, number>();
/** Plays a sound effect. Rapid repeats of the same effect are rate-limited. */
export function sfx(name: SfxName, minGapMs = 30) {
  if (!enabled) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -1e9) < minGapMs) return;
  lastPlayed.set(name, now);
  try {
    EFFECTS[name]();
  } catch (e) {
    console.warn('sfx failed', name, e);
    /* audio unavailable */
  }
}

// ---------- background music ----------

// Slow chord pads drifting through a dreamy progression (Am – F – C – G, voiced wide).
const CHORDS = [
  [110, 164.81, 220, 261.63, 329.63],
  [87.31, 130.81, 174.61, 220, 261.63],
  [130.81, 196, 261.63, 329.63, 392],
  [98, 146.83, 196, 246.94, 293.66],
];
const SPARKLE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
const CHORD_SECONDS = 8;

/** Starts the looping space soundtrack (no-op if already playing or sound is off). */
export function startMusic() {
  musicWanted = true;
  if (!enabled || musicStop) return;
  const a = audio();
  if (!a || !musicBus) return;
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, a.currentTime);
  out.gain.exponentialRampToValueAtTime(1, a.currentTime + 3);
  out.connect(musicBus);

  // Echo for the sparkles.
  const delay = a.createDelay(2);
  delay.delayTime.value = 0.45;
  const fb = a.createGain();
  fb.gain.value = 0.45;
  const wet = a.createGain();
  wet.gain.value = 0.5;
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(out);

  // Pad filter swept by a slow LFO.
  const padFilter = a.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 900;
  padFilter.Q.value = 3;
  const lfo = a.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoAmt = a.createGain();
  lfoAmt.gain.value = 500;
  lfo.connect(lfoAmt).connect(padFilter.frequency);
  lfo.start();
  padFilter.connect(out);

  // Deep space wind.
  const wind = a.createBufferSource();
  wind.buffer = noise(a);
  wind.loop = true;
  const windF = a.createBiquadFilter();
  windF.type = 'bandpass';
  windF.frequency.value = 500;
  windF.Q.value = 0.8;
  const windLfo = a.createOscillator();
  windLfo.frequency.value = 0.05;
  const windAmt = a.createGain();
  windAmt.gain.value = 300;
  windLfo.connect(windAmt).connect(windF.frequency);
  windLfo.start();
  const windG = a.createGain();
  windG.gain.value = 0.05;
  wind.connect(windF).connect(windG).connect(out);
  wind.start();

  // Sub drone.
  const sub = a.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 55;
  const subG = a.createGain();
  subG.gain.value = 0.12;
  sub.connect(subG).connect(out);
  sub.start();

  let chord = 0;
  const playChord = () => {
    const t0 = a.currentTime;
    const notes = CHORDS[chord % CHORDS.length];
    sub.frequency.setTargetAtTime(notes[0] / 2, t0, 1.5);
    for (const f of notes) {
      for (const det of [-7, 7]) {
        const o = a.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.022, t0 + 2.5);
        g.gain.setValueAtTime(0.022, t0 + CHORD_SECONDS - 1);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + CHORD_SECONDS + 2);
        o.connect(g).connect(padFilter);
        o.start(t0);
        o.stop(t0 + CHORD_SECONDS + 2.1);
      }
    }
    chord++;
  };
  const sparkle = () => {
    const t0 = a.currentTime;
    const f = SPARKLE[Math.floor(Math.random() * SPARKLE.length)];
    const o = a.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
    o.connect(g);
    g.connect(out);
    g.connect(delay);
    o.start(t0);
    o.stop(t0 + 1.5);
  };

  playChord();
  const chordTimer = window.setInterval(playChord, CHORD_SECONDS * 1000);
  const sparkleTimer = window.setInterval(() => {
    if (Math.random() < 0.55) sparkle();
  }, 900);

  musicStop = () => {
    window.clearInterval(chordTimer);
    window.clearInterval(sparkleTimer);
    const t = a.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    window.setTimeout(() => {
      for (const n of [lfo, windLfo, wind, sub]) {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      }
      out.disconnect();
    }, 1400);
  };
}

/** Lowers the soundtrack (e.g. under the rocket engines) or brings it back. */
export function duckMusic(duck: boolean) {
  const a = audio();
  if (!a || !musicBus) return;
  musicBus.gain.setTargetAtTime(duck ? MUSIC_VOL * 0.25 : MUSIC_VOL, a.currentTime, 0.4);
}

// ---------- engine rumble (launch) ----------

/** Starts a low engine rumble; returns a stop function. */
export function rumble(volume = 0.35): () => void {
  const a = audio();
  if (!a || !enabled || !sfxBus) return () => {};
  const src = a.createBufferSource();
  src.buffer = brown(a);
  src.loop = true;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 450;
  // Flutter so it sounds like a live engine.
  const flutter = a.createOscillator();
  flutter.frequency.value = 9;
  const flutterAmt = a.createGain();
  flutterAmt.gain.value = 120;
  flutter.connect(flutterAmt).connect(filter.frequency);
  flutter.start();
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, a.currentTime + 0.4);
  src.connect(filter).connect(gain).connect(sfxBus);
  src.start();
  return () => {
    try {
      gain.gain.cancelScheduledValues(a.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, a.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.8);
      src.stop(a.currentTime + 0.9);
      flutter.stop(a.currentTime + 0.9);
    } catch {
      /* already stopped */
    }
  };
}

/** Back-compat helper. */
export function beep(freq = 880, duration = 0.12, volume = 0.08) {
  tone({ freq, dur: duration, vol: volume });
}
