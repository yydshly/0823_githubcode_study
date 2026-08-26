export interface DirectedState {
  approach: number;
  interior: number;
  atlas: number;
  cameraX: number;
  cameraY: number;
  focus: number;
  telescopeTurn: number;
}

const saturate = (value: number): number => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number): number => {
  const t = saturate((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

export const directObservatory = (progress: number, pointerX: number, pointerY: number, elapsed: number, reducedMotion: boolean): DirectedState => {
  const approach = 1 - smooth(0.28, 0.51, progress);
  const interior = smooth(0.34, 0.62, progress) * (1 - smooth(0.68, 0.86, progress) * 0.22);
  const atlas = smooth(0.66, 0.9, progress);
  const stillness = reducedMotion ? 0 : Math.sin(elapsed * 0.16) * 0.012;
  return {
    approach,
    interior,
    atlas,
    cameraX: pointerX * 0.055 + stillness,
    cameraY: pointerY * 0.035,
    focus: 0.25 + atlas * 0.75,
    telescopeTurn: reducedMotion ? atlas * 0.13 : atlas * 0.13 + Math.sin(elapsed * 0.12) * 0.018
  };
};
