export type VoiceId = 'whisper' | 'rain' | 'bell';
export type Direction = { chapter: number; light: number; shift: number };
export function deriveDirection(progress: number, pointer: { x: number; y: number }, elapsed: number, reducedMotion: boolean): Direction {
  const chapter = progress < 0.36 ? 0 : progress < 0.72 ? 1 : 2;
  const drift = reducedMotion ? 0 : Math.sin(elapsed * 0.00035) * 5 + pointer.x * 2;
  return { chapter, light: chapter === 0 ? 0.28 : chapter === 1 ? 0.58 : 0.9, shift: drift };
}
