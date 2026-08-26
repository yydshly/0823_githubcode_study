export type QualityPreference = 'auto' | 'high' | 'balanced' | 'low';
export type EffectiveQuality = Exclude<QualityPreference, 'auto'>;

export interface QualityProfile {
  dprCap: number;
  instanceRatio: number;
  shadows: boolean;
  particleRatio: number;
}

export const qualityProfiles: Record<EffectiveQuality, QualityProfile> = {
  high: { dprCap: 2, instanceRatio: 1, shadows: true, particleRatio: 1 },
  balanced: { dprCap: 1.5, instanceRatio: 0.62, shadows: true, particleRatio: 0.6 },
  low: { dprCap: 1, instanceRatio: 0.28, shadows: false, particleRatio: 0.25 }
};

export function resolveInitialQuality(preference: QualityPreference): EffectiveQuality {
  if (preference !== 'auto') return preference;
  const coarse = matchMedia('(hover: none), (pointer: coarse)').matches;
  const pixelLoad = innerWidth * innerHeight * devicePixelRatio * devicePixelRatio;
  if (coarse || pixelLoad > 3_200_000) return 'low';
  return 'balanced';
}

export class QualityGovernor {
  private readonly samples: number[] = [];
  private windowsSeen = 0;
  private badWindows = 0;
  private goodWindows = 0;
  private lastChange = -Infinity;

  constructor(
    private readonly enabled: boolean,
    private current: EffectiveQuality,
    private readonly onChange: (quality: EffectiveQuality) => void
  ) {}

  record(frameMs: number, now: number): void {
    if (!this.enabled || document.hidden || !Number.isFinite(frameMs) || frameMs > 250) return;
    this.samples.push(frameMs);
    if (this.samples.length < 120) return;

    const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    this.samples.length = 0;
    this.windowsSeen += 1;
    if (this.windowsSeen < 2 || now - this.lastChange < 5_000) return;

    if (average > 24) {
      this.badWindows += 1;
      this.goodWindows = 0;
    } else if (average < 16.5) {
      this.goodWindows += 1;
      this.badWindows = 0;
    } else {
      this.badWindows = 0;
      this.goodWindows = 0;
    }

    if (this.badWindows >= 2 && this.current !== 'low') {
      this.set(this.current === 'high' ? 'balanced' : 'low', now);
    } else if (this.goodWindows >= 4 && this.current !== 'high') {
      this.set(this.current === 'low' ? 'balanced' : 'high', now);
    }
  }

  private set(next: EffectiveQuality, now: number): void {
    this.current = next;
    this.badWindows = 0;
    this.goodWindows = 0;
    this.lastChange = now;
    this.onChange(next);
  }
}
