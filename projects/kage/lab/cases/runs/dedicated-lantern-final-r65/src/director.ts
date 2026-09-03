export interface DirectedState {
  progress: number;
  stage: number;
  weights: [number, number, number, number];
  lift: [number, number, number, number];
  open: number;
  light: number;
  observeX: number;
}

const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (a: number, b: number, value: number): number => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function direct(progress: number, pointerX: number, elapsed: number, reducedMotion: boolean): DirectedState {
  const p = clamp(progress);
  const first = smooth(0.18, 0.38, p);
  const second = smooth(0.46, 0.7, p);
  const third = smooth(0.78, 0.94, p);
  const weights: [number, number, number, number] = [1 - first, first * (1 - second), second * (1 - third), third];
  // These thresholds follow the actual DOM section boundaries so the product
  // always occupies the side opposite the active editorial copy.
  const stage = p < 0.47 ? 0 : p < 0.64 ? 1 : p < 0.91 ? 2 : 3;
  const observation = reducedMotion ? 0 : (pointerX - 0.5) * 10;
  const settled = p > 0.96 || reducedMotion ? 0 : Math.sin(elapsed * 0.35) * 0.6;
  return {
    progress: p,
    stage,
    weights,
    lift: [0, -4 * first, -7 * second, -4 * third],
    open: 0.12 + first * 0.3 + second * 0.48 + third * 0.1,
    light: third,
    observeX: observation + settled
  };
}
