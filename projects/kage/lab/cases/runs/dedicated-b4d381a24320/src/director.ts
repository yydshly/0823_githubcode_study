export type TuningSource = 'scroll-demo' | 'manual';

export type TuningControl = {
  /** Set this once the visitor has taken control of the range input. */
  manual?: boolean;
  /** Lets the caller keep its DOM value separate from the effective value. */
  manualThickness?: number;
};

export type TuningState = {
  thickness: number;
  deflection: number;
  localDeflectionMm: number;
  frequency: number;
  risk: string;
  status: 'stiff' | 'balanced' | 'responsive' | 'thin';
  statusLabel: string;
  source: TuningSource;
  narrativeProgress: number;
  atlasPosition: number;
  nodeIntensity: number;
  bellyIntensity: number;
  phase: number;
};

const DEMO_START_THICKNESS = 3.15;
const DEMO_END_THICKNESS = 2.70;

export function direct(
  progress: number,
  thickness: number,
  elapsed: number,
  reducedMotion: boolean,
  control: TuningControl = {},
): TuningState {
  const narrativeProgress = smooth01(progress);
  const requestedThickness = control.manualThickness ?? thickness;
  // Manual ownership must be explicit. Inferring it from a numeric difference
  // makes a scroll-generated value indistinguishable from a real slider input.
  const manual = control.manual === true;
  const demoThickness = lerp(DEMO_START_THICKNESS, DEMO_END_THICKNESS, narrativeProgress);
  const effectiveThickness = clamp(manual ? requestedThickness : demoThickness, 2.35, 3.35);
  const response = clamp((DEMO_START_THICKNESS - effectiveThickness)
    / (DEMO_START_THICKNESS - DEMO_END_THICKNESS), 0, 1);
  const localDeflectionMm = 0.30 + (3.35 - effectiveThickness) * 0.58;
  const deflection = clamp((localDeflectionMm - 0.30) / 0.58, 0, 1);
  const frequency = 188 + (effectiveThickness - 2.35) * 42;
  const status = effectiveThickness > 3.16
    ? 'stiff'
    : effectiveThickness < 2.62
      ? 'thin'
      : effectiveThickness < 2.80
        ? 'responsive'
        : 'balanced';
  const statusLabel = status === 'stiff'
    ? '刚度偏高'
    : status === 'thin'
      ? '边缘偏薄'
      : status === 'responsive'
        ? '响应偏灵敏'
        : '响应平衡';
  const risk = status === 'stiff'
    ? '刚度偏高：响应会更克制'
    : status === 'thin'
      ? '边缘偏薄：建议保留外圈支撑'
      : status === 'responsive'
        ? '响应偏灵敏：建议复核局部挠度'
        : '厚度区间稳定：可继续复核敲击感';
  const nodeIntensity = 0.10 + response * 0.90;
  const bellyIntensity = 0.08 + response * 0.92;
  const phase = response * 0.18 + (reducedMotion ? 0 : Math.sin(elapsed * 0.42) * 0.012);

  return {
    thickness: effectiveThickness,
    deflection,
    localDeflectionMm,
    frequency,
    risk,
    status,
    statusLabel,
    source: manual ? 'manual' : 'scroll-demo',
    narrativeProgress,
    // The middle atlas frame contains the Chladni evidence. Keep that evidence
    // visible once revealed instead of fading through to the near-clean third
    // frame; this makes the scroll and range-control causality unambiguous.
    atlasPosition: response,
    nodeIntensity,
    bellyIntensity,
    phase,
  };
}

function smooth01(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
