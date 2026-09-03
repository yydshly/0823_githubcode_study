export type StationState = {
  progress: number;
  density: number;
  water: number;
  mode: 'demo' | 'scroll' | 'manual' | 'paused';
};

export type DirectedState = {
  time: number;
  canopy: number;
  wet: number;
  heat: number;
  breeze: number;
};

export function direct(
  state: StationState,
  pointer: { x: number; y: number },
  elapsed: number,
  reducedMotion: boolean,
): DirectedState {
  const time = Math.max(0, Math.min(1, state.progress));
  const noon = Math.exp(-Math.pow((time - 0.55) / 0.23, 2));
  const afterWater = Math.max(0, (time - 0.62) / 0.38) * (state.water / 100);
  return {
    time,
    canopy: state.density / 100,
    wet: afterWater,
    heat: noon * (1 - state.density / 150),
    breeze: reducedMotion ? 0 : pointer.x * 0.025 + Math.sin(elapsed * 0.55) * 0.012,
  };
}
