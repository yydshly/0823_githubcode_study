import * as THREE from 'three';

export interface Direction {
  story: number;
  seedScale: number;
  fiberAssembly: number;
  greenhouseReveal: number;
  canopyBreath: number;
  seedPosition: THREE.Vector3;
  camera: THREE.Vector3;
  target: THREE.Vector3;
}

const camera = new THREE.Vector3();
const target = new THREE.Vector3();
const seedPosition = new THREE.Vector3();

function smoothstep(a: number, b: number, value: number): number {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function direct(progress: number, pointer: { x: number; y: number }, elapsed: number, reducedMotion: boolean): Direction {
  const story = THREE.MathUtils.clamp(progress, 0, 1);
  const assemble = smoothstep(0.12, 0.72, story);
  const arrive = smoothstep(0.64, 0.98, story);
  const drift = reducedMotion ? 0 : Math.sin(elapsed * 0.62) * 0.028 * (1 - arrive);
  const lookX = reducedMotion ? 0 : pointer.x * 0.08;
  const lookY = reducedMotion ? 0 : pointer.y * 0.045;

  camera.set(lookX * (1 - arrive), 0.24 + lookY + arrive * 0.16, 8.15 - arrive * 1.55);
  target.set(0, 0.08 + arrive * 0.1 + drift, -0.5 - arrive * 0.72);
  seedPosition.set(0.68 - story * 0.72, 0.18 + story * 0.08 + drift, -0.08 - story * 0.62);

  return {
    story,
    seedScale: 0.92 + assemble * 0.2 - arrive * 0.34,
    fiberAssembly: assemble,
    greenhouseReveal: arrive,
    canopyBreath: reducedMotion ? 0 : Math.sin(elapsed * 0.82) * 0.018 * assemble * (1 - arrive),
    seedPosition,
    camera,
    target
  };
}
