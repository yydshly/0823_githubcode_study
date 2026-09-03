export interface ScentMix {
  soil: number;
  paper: number;
  cotton: number;
}

export interface DirectedState {
  progress: number;
  formation: number;
  separation: number;
  resolution: number;
  clarity: number;
  cameraX: number;
  cameraY: number;
  focusX: number;
  focusY: number;
  mix: ScentMix;
  memoryText: string;
  elapsed: number;
  reducedMotion: boolean;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smooth = (edge0: number, edge1: number, value: number): number => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export class MemoryDirector {
  private readonly reducedMotion: boolean;

  constructor(reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
  }

  sample(progressValue: number, pointerXValue: number, pointerYValue: number, elapsed: number): DirectedState {
    const progress = clamp01(progressValue);
    const pointerX = clamp01((pointerXValue + 1) * 0.5);
    const pointerY = clamp01((pointerYValue + 1) * 0.5);

    const formation = smooth(0.08, 0.44, progress);
    const separationIn = smooth(0.28, 0.55, progress);
    const separationOut = 1 - smooth(0.7, 0.93, progress);
    const separation = separationIn * separationOut;
    const resolution = smooth(0.72, 0.96, progress);

    const soilRaw = 0.24 + (1 - pointerY) * 0.34;
    const paperRaw = 0.24 + pointerX * 0.3;
    const cottonRaw = 0.24 + pointerY * 0.32 + (1 - pointerX) * 0.12;
    const total = soilRaw + paperRaw + cottonRaw;
    const mix: ScentMix = {
      soil: soilRaw / total,
      paper: paperRaw / total,
      cotton: cottonRaw / total
    };

    let memoryText = '雨停不久，玻璃上的雾气还没有散。';
    if (progress > 0.3) {
      if (mix.soil >= mix.paper && mix.soil >= mix.cotton) {
        memoryText = '湿土的气息更近了，像鞋底带回房间的一小片院子。';
      } else if (mix.paper >= mix.cotton) {
        memoryText = '纸页吸收了潮气，旧书柜在安静的午后慢慢打开。';
      } else {
        memoryText = '棉布还留着日光，像晾衣绳经过肩头的一阵暖风。';
      }
    }
    if (resolution > 0.78) memoryText = '泥土、纸张与棉布已经汇合，成为只属于今天的气味标本。';

    const motionScale = this.reducedMotion ? 0 : 1;
    return {
      progress,
      formation,
      separation,
      resolution,
      clarity: this.reducedMotion ? (progress < 0.32 ? 0.24 : progress < 0.76 ? 0.7 : 1) : smooth(0.03, 0.82, progress),
      cameraX: (pointerX - 0.5) * 0.18 * motionScale,
      cameraY: (pointerY - 0.5) * 0.1 * motionScale,
      focusX: pointerX,
      focusY: pointerY,
      mix,
      memoryText,
      elapsed,
      reducedMotion: this.reducedMotion
    };
  }
}
