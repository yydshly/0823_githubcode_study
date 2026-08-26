export interface DreamState {
  progress: number;
  opening: number;
  passage: number;
  resolution: number;
  openingCopy: number;
  memoryCopy: number;
  finalCopy: number;
  focus: number;
  corridorDepth: number;
  fragmentSpread: number;
  finalClarity: number;
  veil: number;
  cameraX: number;
  cameraY: number;
  breath: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smooth = (a: number, b: number, value: number): number => {
  const t = clamp01((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function directDream(
  progress: number,
  pointer: { x: number; y: number },
  elapsed: number,
  reducedMotion: boolean
): DreamState {
  const p = clamp01(progress);
  const memoryIn = smooth(0.23, 0.42, p);
  const finalIn = smooth(0.68, 0.9, p);
  const memoryOut = smooth(0.72, 0.94, p);
  const opening = 1 - smooth(0.3, 0.48, p);
  const passage = memoryIn * (1 - memoryOut);
  const resolution = finalIn;
  const pointerWeight = reducedMotion ? 0 : 0.038;
  const breath = reducedMotion ? 0 : Math.sin(elapsed * 0.34) * 0.006;

  return {
    progress: p,
    opening,
    passage,
    resolution,
    openingCopy: 1 - smooth(0.12, 0.3, p),
    memoryCopy: smooth(0.3, 0.46, p) * (1 - smooth(0.62, 0.76, p)),
    finalCopy: smooth(0.78, 0.92, p),
    focus: smooth(0.04, 0.22, p),
    corridorDepth: memoryIn * (1 - finalIn * 0.62),
    fragmentSpread: Math.sin(memoryIn * Math.PI) * (1 - finalIn * 0.48),
    finalClarity: resolution,
    veil: 0.16 - passage * 0.05 - resolution * 0.03,
    cameraX: pointer.x * pointerWeight * (0.55 + passage * 0.45),
    cameraY: pointer.y * pointerWeight * 0.36 + breath,
    breath
  };
}
