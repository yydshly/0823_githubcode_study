import * as THREE from 'three';

export interface DirectedState {
  camera: THREE.Vector3;
  target: THREE.Vector3;
  subjectX: number;
  subjectY: number;
  subjectScale: number;
  subjectOpacity: number;
  subjectReveal: number;
  subjectDissolve: number;
  distortion: number;
  veilSpread: number;
  threadEnergy: number;
  particleSpread: number;
  bloom: number;
  phase: number;
  worldRotation: number;
}

export interface Director {
  sample(progress: number, pointer: THREE.Vector2, elapsed: number): DirectedState;
}

const smooth = (edge0: number, edge1: number, value: number): number => {
  const x = THREE.MathUtils.clamp((value - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
  return x * x * (3 - 2 * x);
};

export function createDirector(reducedMotion: boolean): Director {
  const state: DirectedState = {
    camera: new THREE.Vector3(),
    target: new THREE.Vector3(),
    subjectX: 0,
    subjectY: 0,
    subjectScale: 1,
    subjectOpacity: 1,
    subjectReveal: 1,
    subjectDissolve: 0,
    distortion: 0,
    veilSpread: 0,
    threadEnergy: 0,
    particleSpread: 0,
    bloom: 0,
    phase: 0,
    worldRotation: 0
  };

  return {
    sample(progress, pointer, elapsed) {
      const p = THREE.MathUtils.clamp(progress, 0, 1);
      const establish = smooth(0, 0.16, p);
      const release = smooth(0.18, 0.48, p);
      const reweave = smooth(0.5, 0.78, p);
      const resolve = smooth(0.78, 0.96, p);
      const middle = release * (1 - reweave);
      const finalHold = smooth(0.9, 1, p);
      const pointerWeight = reducedMotion ? 0 : (1 - finalHold) * 0.18;
      const breath = reducedMotion || finalHold > 0.05 ? 0 : Math.sin(elapsed * 0.46) * 0.025;

      state.camera.set(
        pointer.x * pointerWeight + release * 0.26 - reweave * 0.42,
        pointer.y * pointerWeight * 0.45 + p * 0.16,
        5.65 - establish * 0.62 - middle * 0.34 + resolve * 0.82
      );
      state.target.set(-release * 0.12 + reweave * 0.2, -0.04 - resolve * 0.12, 0);
      state.subjectX = -0.04 + release * 0.38 - reweave * 0.62 + resolve * 0.18;
      state.subjectY = -0.02 + breath - middle * 0.08;
      state.subjectScale = 0.94 + establish * 0.12 + middle * 0.11 - resolve * 0.13;
      state.subjectOpacity = 0.72 + establish * 0.28 - middle * 0.08;
      state.subjectReveal = 0.55 + establish * 0.45;
      state.subjectDissolve = middle * 0.84;
      state.distortion = reducedMotion ? 0.06 : 0.14 + middle * 0.78 + resolve * 0.12;
      state.veilSpread = establish * 0.38 + release * 1.42 - reweave * 0.64;
      state.threadEnergy = 0.26 + middle * 0.74 + resolve * 0.18;
      state.particleSpread = middle * 1.52 + resolve * 0.24;
      state.bloom = 0.36 + establish * 0.34 + middle * 0.42 - resolve * 0.22;
      state.phase = reducedMotion ? p * 1.6 : elapsed * 0.22 + p * 3.4;
      state.worldRotation = pointer.x * pointerWeight * -0.12 + middle * -0.055;
      return state;
    }
  };
}
