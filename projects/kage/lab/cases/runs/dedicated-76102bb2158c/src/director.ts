import { CinemaScene, SceneState } from './scene';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = clamp01((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

export class ArchiveDirector {
  private selectedEra = 2;
  private readonly scene: CinemaScene;
  private readonly reducedMotion: boolean;

  constructor(scene: CinemaScene, reducedMotion: boolean) {
    this.scene = scene;
    this.reducedMotion = reducedMotion;
  }

  selectEra(index: number): void {
    this.selectedEra = Math.min(2, Math.max(0, Math.round(index)));
  }

  getSelectedEra(): number {
    return this.selectedEra;
  }

  update(progress: number, pointerX: number, pointerY: number, elapsed: number, delta: number): void {
    const p = clamp01(progress);
    const evidenceArrival = smoothstep(0.24, 0.58, p);
    const resolution = smoothstep(0.78, 0.96, p);

    // 开场保持今日街景；中段由访客选择年代；结尾回到今日，使旧痕迹与仍亮的招牌共处。
    let era = 2;
    if (p > 0.25 && p < 0.84) era = this.selectedEra;

    // 指针只移动检查光域，并在档案比对段生效，不驱动主体追逐。
    const inspectX = p > 0.24 && p < 0.84 ? 0.5 + pointerX * 0.18 : 0.72;
    const inspectY = p > 0.24 && p < 0.84 ? 0.5 - pointerY * 0.12 : 0.45;

    const state: SceneState = {
      era,
      archiveMix: evidenceArrival * (1 - resolution * 0.72),
      resolve: resolution,
      inspectionX: inspectX,
      inspectionY: inspectY,
      elapsed: this.reducedMotion ? 0 : elapsed
    };
    this.scene.applyState(state, delta, this.reducedMotion);
  }

  dispose(): void {
    // Director owns no external resources.
  }
}
