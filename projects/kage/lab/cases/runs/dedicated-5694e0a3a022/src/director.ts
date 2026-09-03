export interface StoryPointer {
  x: number;
  y: number;
}

export interface RepairStoryState {
  progress: number;
  stage: 0 | 1 | 2;
  stageShift: number;
  explode: number;
  testPulse: number;
  finalLock: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  lookX: number;
  lookY: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function directRepairStory(
  rawProgress: number,
  pointer: StoryPointer,
  elapsed: number,
  reducedMotion: boolean
): RepairStoryState {
  const progress = clamp01(rawProgress);
  const stage: 0 | 1 | 2 = progress < 0.34 ? 0 : progress < 0.76 ? 1 : 2;
  const effective = reducedMotion ? (stage === 0 ? 0.12 : stage === 1 ? 0.58 : 1) : progress;

  // The assembly opens only for the inspection beat, then returns to a readable tested whole.
  const opening = smoothstep(0.25, 0.52, effective);
  const closing = smoothstep(0.72, 0.94, effective);
  const explode = opening * (1 - closing);
  const finalLock = smoothstep(0.82, 0.98, effective);
  const pulseClock = reducedMotion ? 0 : elapsed;
  const testPulse = stage === 2 && finalLock < 0.92 ? 0.5 + Math.sin(pulseClock * 3.2) * 0.5 : finalLock;
  const pointerWeight = reducedMotion ? 0 : 0.16 * (1 - finalLock);

  return {
    progress: effective,
    stage,
    stageShift: stage * -33.333,
    explode,
    testPulse,
    finalLock,
    cameraX: 0.25 + pointer.x * pointerWeight,
    cameraY: 0.3 - pointer.y * pointerWeight * 0.55,
    cameraZ: 8.9 - opening * 0.28 + finalLock * 0.18,
    lookX: 0.15 + pointer.x * pointerWeight * 0.22,
    lookY: 0.25 - pointer.y * pointerWeight * 0.12
  };
}
