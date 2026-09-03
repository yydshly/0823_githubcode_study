export type SoundboardAudioProfile = {
  thickness: number;
  frequency: number;
  deflection: number;
};

export type SoundboardToneModel = {
  fundamentalHz: number;
  decaySeconds: number;
  brightnessHz: number;
  semitoneDelta: number;
  contrast: number;
  modeRatios: readonly number[];
  modeGains: readonly number[];
};

export type SoundboardAudio = {
  play: (profile: SoundboardAudioProfile) => Promise<boolean>;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  isMuted: () => boolean;
  isUnlocked: () => boolean;
  dispose: () => void;
};

type AudioWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

const REFERENCE_THICKNESS = 2.95;
const REFERENCE_FREQUENCY = 213.2;
const REFERENCE_DEFLECTION = 0.53;
const PERCEPTUAL_PITCH_SCALE = 2.35;

export function mapSoundboardTone(profile: SoundboardAudioProfile): SoundboardToneModel {
  const physicalSemitones = 12 * Math.log2(Math.max(80, profile.frequency) / REFERENCE_FREQUENCY);
  const semitoneDelta = clamp(physicalSemitones * PERCEPTUAL_PITCH_SCALE, -4.5, 4.5);
  const contrast = clamp((REFERENCE_THICKNESS - profile.thickness) / 0.60, -1, 1);
  const deflectionDelta = clamp((profile.deflection - REFERENCE_DEFLECTION) / 0.55, -1, 1);
  return {
    fundamentalHz: REFERENCE_FREQUENCY * 2 ** (semitoneDelta / 12),
    decaySeconds: clamp(1 + contrast * 0.58 + deflectionDelta * 0.12, 0.54, 1.72),
    brightnessHz: clamp(3400 + contrast * 1900 + deflectionDelta * 260, 1500, 6200),
    semitoneDelta,
    contrast,
    modeRatios: [
      1,
      2.04 - contrast * 0.19,
      3.08 - contrast * 0.28,
      4.32 - contrast * 0.31,
    ],
    modeGains: [
      0.25 - contrast * 0.025,
      0.105 + contrast * 0.045,
      0.058 + contrast * 0.032,
      0.03 + contrast * 0.02,
    ],
  };
}

export function createSoundboardAudio(): SoundboardAudio {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = false;
  let volume = 0.72;
  const activeSources = new Set<AudioScheduledSourceNode>();

  const ensureContext = async (): Promise<AudioContext | null> => {
    const AudioContextConstructor = window.AudioContext
      || (window as AudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!context) {
      context = new AudioContextConstructor();
      master = context.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') await context.resume();
    return context;
  };

  const release = (source: AudioScheduledSourceNode) => {
    activeSources.delete(source);
    source.disconnect();
  };

  const track = (source: AudioScheduledSourceNode) => {
    activeSources.add(source);
    source.addEventListener('ended', () => release(source), { once: true });
  };

  const stopActive = () => {
    for (const source of activeSources) {
      try { source.stop(); } catch { /* already stopped */ }
      source.disconnect();
    }
    activeSources.clear();
  };

  const play = async (profile: SoundboardAudioProfile): Promise<boolean> => {
    const audioContext = await ensureContext();
    if (!audioContext || !master || muted) return false;
    stopActive();

    const start = audioContext.currentTime + 0.018;
    const tone = mapSoundboardTone(profile);

    const impact = audioContext.createBufferSource();
    impact.buffer = createImpactBuffer(audioContext, 0.055);
    const impactFilter = audioContext.createBiquadFilter();
    impactFilter.type = 'bandpass';
    impactFilter.frequency.value = tone.brightnessHz;
    impactFilter.Q.value = 0.72;
    const impactGain = audioContext.createGain();
    impactGain.gain.setValueAtTime(0.0001, start);
    impactGain.gain.exponentialRampToValueAtTime(0.34, start + 0.004);
    impactGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);
    impact.connect(impactFilter).connect(impactGain).connect(master);
    track(impact);
    impact.start(start);
    impact.stop(start + 0.085);

    const modes = [
      { ratio: tone.modeRatios[0], gain: tone.modeGains[0], tail: 1 },
      { ratio: tone.modeRatios[1], gain: tone.modeGains[1], tail: 0.76 },
      { ratio: tone.modeRatios[2], gain: tone.modeGains[2], tail: 0.56 },
      { ratio: tone.modeRatios[3], gain: tone.modeGains[3], tail: 0.38 },
    ];
    for (const mode of modes) {
      const oscillator = audioContext.createOscillator();
      oscillator.type = mode.ratio === 1 ? 'sine' : 'triangle';
      oscillator.frequency.value = Math.max(80, tone.fundamentalHz * mode.ratio);
      oscillator.detune.value = (mode.ratio - 1) * tone.contrast * -5.2;
      const modeFilter = audioContext.createBiquadFilter();
      modeFilter.type = 'lowpass';
      modeFilter.frequency.value = tone.brightnessHz;
      const modeGain = audioContext.createGain();
      const duration = tone.decaySeconds * mode.tail;
      modeGain.gain.setValueAtTime(0.0001, start);
      modeGain.gain.exponentialRampToValueAtTime(mode.gain, start + 0.006);
      modeGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(modeFilter).connect(modeGain).connect(master);
      track(oscillator);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.025);
    }
    return true;
  };

  const applyLevel = () => {
    if (!context || !master) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, 0.015);
  };

  return {
    play,
    setMuted(nextMuted) {
      muted = nextMuted;
      if (muted) stopActive();
      applyLevel();
    },
    setVolume(nextVolume) {
      volume = clamp(nextVolume, 0, 1);
      applyLevel();
    },
    isMuted: () => muted,
    isUnlocked: () => context !== null && context.state === 'running',
    dispose() {
      stopActive();
      master?.disconnect();
      master = null;
      if (context && context.state !== 'closed') void context.close();
      context = null;
    },
  };
}

function createImpactBuffer(context: AudioContext, duration: number): AudioBuffer {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < frameCount; index += 1) {
    const envelope = Math.exp(-index / Math.max(1, frameCount * 0.12));
    const noise = Math.random() * 2 - 1;
    previous = previous * 0.42 + noise * 0.58;
    channel[index] = previous * envelope;
  }
  return buffer;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
