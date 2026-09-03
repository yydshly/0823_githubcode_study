export interface DirectorInput {
  progress: number;
  elapsed: number;
  pointerX: number;
  pointerY: number;
  reducedMotion: boolean;
}

export interface DirectedState {
  reveal: number;
  planOpen: number;
  resolve: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  selectedZone: number;
  daylight: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (edge0: number, edge1: number, value: number): number => {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export function direct(input: DirectorInput): DirectedState {
  const p = clamp01(input.progress);
  if (input.reducedMotion) {
    return {
      reveal: 1,
      planOpen: 1,
      resolve: 1,
      cameraX: 0,
      cameraY: 0,
      cameraZ: 8.2,
      selectedZone: 1,
      daylight: 1,
    };
  }

  const reveal = smooth(0.04, 0.28, p);
  const planOpen = smooth(0.22, 0.62, p);
  const resolve = smooth(0.66, 0.9, p);
  const pointerInfluenceX = Math.max(-1, Math.min(1, input.pointerX)) * 0.08;
  const pointerInfluenceY = Math.max(-1, Math.min(1, input.pointerY)) * 0.05;

  return {
    reveal,
    planOpen,
    resolve,
    cameraX: -0.28 + planOpen * 0.28 + pointerInfluenceX,
    cameraY: 0.16 - planOpen * 0.16 + pointerInfluenceY,
    cameraZ: 8.65 - planOpen * 0.45,
    selectedZone: resolve,
    daylight: 0.45 + reveal * 0.55,
  };
}
