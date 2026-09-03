export type PointerState = Readonly<{ x: number; y: number }>;

export type DirectedState = Readonly<{
  phase: 'survey' | 'descent' | 'align' | 'mend' | 'read' | 'resolve';
  cameraZ: number;
  cameraY: number;
  cameraTilt: number;
  paperScale: number;
  damage: number;
  fibreDepth: number;
  fibreAlignment: number;
  patchFit: number;
  inkLegibility: number;
  restoredPage: number;
  inspectionX: number;
  inspectionY: number;
  lightWarmth: number;
}>;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (a: number, b: number, value: number): number => {
  const t = clamp01((value - a) / Math.max(0.0001, b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

export function direct(progress: number, pointer: PointerState, elapsed: number, reducedMotion: boolean): DirectedState {
  const p = clamp01(progress);
  const descend = smooth(0.12, 0.34, p);
  const align = smooth(0.30, 0.51, p);
  const mend = smooth(0.52, 0.70, p);
  const read = smooth(0.69, 0.84, p);
  const resolve = smooth(0.84, 0.96, p);
  const returnToTable = resolve;
  const pointerWeight = reducedMotion ? 0 : 0.035 * (1 - resolve);
  const breath = reducedMotion ? 0 : Math.sin(elapsed * 0.28) * 0.015 * (1 - resolve);

  let phase: DirectedState['phase'] = 'survey';
  if (p >= 0.16) phase = 'descent';
  if (p >= 0.34) phase = 'align';
  if (p >= 0.54) phase = 'mend';
  if (p >= 0.71) phase = 'read';
  if (p >= 0.88) phase = 'resolve';

  return {
    phase,
    cameraZ: mix(7.4, 2.2, descend) + mix(0, 5.5, returnToTable),
    cameraY: mix(0.25, -0.85, descend) + mix(0, 1.05, returnToTable),
    cameraTilt: mix(-0.08, -0.42, descend) + mix(0, 0.47, returnToTable),
    paperScale: mix(1, 1.48, descend) + mix(0, -0.42, returnToTable),
    damage: 1 - smooth(0.58, 0.88, p),
    fibreDepth: descend * (1 - smooth(0.72, 0.91, p)),
    fibreAlignment: align,
    patchFit: mend,
    inkLegibility: read,
    restoredPage: resolve,
    inspectionX: pointer.x * pointerWeight,
    inspectionY: pointer.y * pointerWeight + breath,
    lightWarmth: mix(0.35, 1, resolve)
  };
}
