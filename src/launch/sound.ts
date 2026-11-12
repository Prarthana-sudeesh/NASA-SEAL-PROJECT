// Tiny Web Audio synth: countdown beeps and engine rumble. No audio files; off by default.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function beep(freq = 880, duration = 0.12, volume = 0.08) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + duration);
  osc.connect(gain).connect(a.destination);
  osc.start();
  osc.stop(a.currentTime + duration + 0.02);
}

/** Starts a low engine rumble; returns a stop function. */
export function rumble(volume = 0.12): () => void {
  const a = audio();
  if (!a) return () => {};
  const length = a.sampleRate * 2;
  const buffer = a.createBuffer(1, length, a.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    // Brown noise
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const src = a.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  const gain = a.createGain();
  gain.gain.setValueAtTime(0.0001, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, a.currentTime + 0.4);
  src.connect(filter).connect(gain).connect(a.destination);
  src.start();
  return () => {
    try {
      gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.5);
      src.stop(a.currentTime + 0.6);
    } catch {
      /* already stopped */
    }
  };
}
