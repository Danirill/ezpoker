let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

function tone(
  frequency: number,
  start: number,
  duration: number,
  options: { type?: OscillatorType; volume?: number; endFreq?: number } = {},
): void {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const volume = options.volume ?? 0.12;

  osc.type = options.type ?? 'sine';
  osc.frequency.setValueAtTime(frequency, start);
  if (options.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(options.endFreq, start + duration);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noiseBurst(start: number, duration: number, volume = 0.04): void {
  const ctx = getCtx();
  if (!ctx) return;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = 1200;

  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

export function unlockAudio(): void {
  getCtx();
}

export function playChipSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  noiseBurst(t, 0.05, 0.05);
  tone(180, t, 0.08, { type: 'triangle', volume: 0.08 });
}

export function playDealSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(520, t, 0.06, { type: 'sine', volume: 0.07, endFreq: 380 });
  tone(760, t + 0.05, 0.05, { type: 'sine', volume: 0.05 });
}

export function playFoldSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(280, t, 0.12, { type: 'triangle', volume: 0.07, endFreq: 120 });
}

export function playCheckSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(440, t, 0.05, { type: 'sine', volume: 0.06 });
}

export function playWinSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => {
    tone(freq, t + i * 0.1, 0.18, { type: 'sine', volume: 0.09 });
  });
}

export function playYourTurnSound(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(660, t, 0.1, { type: 'sine', volume: 0.08 });
  tone(880, t + 0.12, 0.14, { type: 'sine', volume: 0.07 });
}
