export type RainPhase = "arrival" | "resonance" | "memory";

export interface DirectedState {
  progress: number;
  phase: RainPhase;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  lookY: number;
  subjectX: number;
  subjectY: number;
  subjectScale: number;
  membranePulse: number;
  waveExpansion: number;
  rainActivity: number;
  chamberGlow: number;
  recordLight: number;
  pointerParallaxX: number;
  pointerParallaxY: number;
  elapsed: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (a: number, b: number, value: number): number => {
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export class RainDirector {
  constructor(private readonly reducedMotion: boolean) {}

  evaluate(progress: number, pointer: { x: number; y: number }, elapsed: number): DirectedState {
    const p = clamp01(progress);
    const entering = smooth(0.08, 0.48, p);
    const settling = smooth(0.64, 0.9, p);
    const resonanceWindow = entering * (1 - settling);
    const resonanceShift = smooth(0.24, 0.5, p) * (1 - smooth(0.62, 0.78, p));
    const resolveShift = smooth(0.68, 0.9, p);
    const phase: RainPhase = p < 0.32 ? "arrival" : p < 0.76 ? "resonance" : "memory";
    const parallax = this.reducedMotion ? 0 : 1 - settling;

    return {
      progress: p,
      phase,
      cameraX: -0.16 + entering * 0.32,
      cameraY: 0.1 - entering * 0.08 + settling * 0.05,
      cameraZ: 5.25 - entering * 0.42 + settling * 0.2,
      lookY: 0.02,
      subjectX: 0.62 - resonanceShift * 1.28 + resolveShift * 0.2,
      subjectY: -0.04 + entering * 0.05,
      subjectScale: 1 + entering * 0.055 - settling * 0.02,
      membranePulse: this.reducedMotion ? resonanceWindow * 0.18 : resonanceWindow,
      waveExpansion: resonanceWindow,
      rainActivity: 1 - smooth(0.68, 0.91, p),
      chamberGlow: 0.12 + entering * 0.68 - settling * 0.25,
      recordLight: smooth(0.79, 0.94, p),
      pointerParallaxX: pointer.x * 0.055 * parallax,
      pointerParallaxY: pointer.y * 0.035 * parallax,
      elapsed
    };
  }
}
