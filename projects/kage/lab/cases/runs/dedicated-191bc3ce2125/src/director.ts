export type WindPhase = "haze" | "crossing" | "record";

export interface WindStoryState {
  phase: WindPhase;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  lookX: number;
  fiberBend: number;
  evidenceProgress: number;
  evidenceVisibility: number;
  environmentClarity: number;
  veilOpacity: number;
  slitPresence: number;
  copperWarmth: number;
}

interface PointerState {
  x: number;
  y: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smooth = (a: number, b: number, value: number): number => {
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function directWindStory(
  progress: number,
  pointer: PointerState,
  elapsed: number,
  reducedMotion: boolean
): WindStoryState {
  const p = clamp01(progress);
  const crossing = smooth(0.16, 0.58, p);
  const returning = smooth(0.67, 0.92, p);
  const resolve = smooth(0.78, 0.96, p);
  const phase: WindPhase = p < 0.25 ? "haze" : p < 0.78 ? "crossing" : "record";

  if (reducedMotion) {
    const stable = p < 0.34 ? 0 : p < 0.72 ? 0.55 : 1;
    return {
      phase,
      cameraX: stable === 0.55 ? 0.42 : 0,
      cameraY: 0.08,
      cameraZ: stable === 0.55 ? 4.45 : 5.4,
      lookX: stable === 0.55 ? 0.34 : 0,
      fiberBend: stable === 0 ? 0.08 : stable === 0.55 ? 0.72 : 0.34,
      evidenceProgress: stable,
      evidenceVisibility: stable === 0.55 ? 1 : stable,
      environmentClarity: stable === 0 ? 0.4 : stable === 0.55 ? 0.78 : 1,
      veilOpacity: stable === 0 ? 0.62 : stable === 0.55 ? 0.28 : 0.12,
      slitPresence: stable === 0.55 ? 1 : 0.16,
      copperWarmth: stable
    };
  }

  const restrainedBreath = phase === "record" ? 0 : Math.sin(elapsed * 0.42) * 0.018;
  const parallaxX = pointer.x * 0.055;
  const parallaxY = pointer.y * 0.035;
  const outward = crossing * (1 - returning);

  return {
    phase,
    cameraX: outward * 0.74 + parallaxX,
    cameraY: 0.08 + parallaxY + restrainedBreath,
    cameraZ: 5.45 - outward * 1.62,
    lookX: outward * 0.5,
    fiberBend: 0.08 + smooth(0.25, 0.6, p) * 0.92 - returning * 0.62,
    evidenceProgress: smooth(0.34, 0.74, p),
    evidenceVisibility: smooth(0.3, 0.46, p) * (1 - smooth(0.79, 0.94, p)),
    environmentClarity: 0.35 + smooth(0.04, 0.58, p) * 0.65,
    veilOpacity: 0.66 - smooth(0.03, 0.62, p) * 0.48 - resolve * 0.08,
    slitPresence: 0.12 + outward * 0.88,
    copperWarmth: smooth(0.48, 0.95, p)
  };
}
