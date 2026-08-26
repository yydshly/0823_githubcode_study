import * as THREE from "three";

export interface DirectorInput {
  progress: number;
  pointerX: number;
  pointerY: number;
  elapsed: number;
  reducedMotion: boolean;
}

export interface DirectedState {
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  assembly: number;
  reveal: number;
  membrane: number;
  signal: number;
  resolve: number;
  pointerDriftX: number;
  pointerDriftY: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smooth = (a: number, b: number, value: number): number => {
  const t = clamp01((value - a) / Math.max(0.0001, b - a));
  return t * t * (3 - 2 * t);
};

export class ExperienceDirector {
  private readonly camera = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly state: DirectedState = {
    cameraPosition: this.camera,
    cameraTarget: this.target,
    assembly: 0,
    reveal: 0,
    membrane: 0,
    signal: 0,
    resolve: 0,
    pointerDriftX: 0,
    pointerDriftY: 0,
  };

  public evaluate(input: DirectorInput): DirectedState {
    const p = clamp01(input.progress);
    const reveal = smooth(0.04, 0.24, p);
    const assembly = smooth(0.31, 0.61, p);
    const resolve = smooth(0.72, 0.91, p);
    const timeBreath = input.reducedMotion ? 0 : Math.sin(input.elapsed * 0.42) * 0.035;
    const pointerScale = input.reducedMotion ? 0 : 0.16 * (1 - resolve * 0.7);

    this.camera.set(
      THREE.MathUtils.lerp(1.45, 0.18, reveal) - assembly * 0.38 + resolve * 0.08 + input.pointerX * pointerScale,
      THREE.MathUtils.lerp(0.52, 0.08, assembly) + timeBreath + input.pointerY * pointerScale * 0.55,
      THREE.MathUtils.lerp(6.8, 5.45, assembly) + resolve * 0.18,
    );
    this.target.set(resolve * 0.12, -0.03, 0);

    this.state.assembly = assembly;
    this.state.reveal = reveal;
    this.state.membrane = smooth(0.18, 0.53, p) * (1 - resolve * 0.18);
    this.state.signal = smooth(0.36, 0.69, p);
    this.state.resolve = resolve;
    this.state.pointerDriftX = input.pointerX * pointerScale;
    this.state.pointerDriftY = input.pointerY * pointerScale;
    return this.state;
  }
}
