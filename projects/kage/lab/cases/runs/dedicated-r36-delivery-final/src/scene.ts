import * as THREE from 'three';
import type { GeneratedViewport } from '@signal-lab/experience-sdk';
import type { Direction } from './director';

export interface GreenhouseScene {
  render(direction: Direction): void;
  resize(viewport: GeneratedViewport): void;
  dispose(): void;
}

type FiberMeta = {
  family: 'longitudinal' | 'transverse';
  index: number;
  total: number;
  points: number;
  phase: number;
};

function smooth01(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export function createGreenhouseScene(canvas: HTMLCanvasElement, quality: 'low' | 'balanced' | 'high', reducedMotion: boolean, viewport: GeneratedViewport): GreenhouseScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: quality !== 'low' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.setPixelRatio(Math.min(viewport.dpr, quality === 'low' ? 1.25 : 2));
  renderer.setSize(viewport.width, viewport.height, false);

  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, viewport.width / viewport.height, 0.1, 40);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  const fibers = new THREE.Group();
  const longitudinalMaterial = new THREE.LineBasicMaterial({
    color: 0xe0e3d5,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const transverseMaterial = new THREE.LineBasicMaterial({
    color: 0xb8c5ad,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  materials.add(longitudinalMaterial);
  materials.add(transverseMaterial);

  const longitudinalCount = quality === 'low' ? 8 : 12;
  const transverseCount = quality === 'low' ? 4 : 6;
  const pointCount = quality === 'low' ? 28 : 42;

  function addFiber(family: FiberMeta['family'], index: number, total: number): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pointCount * 3), 3));
    geometry.setDrawRange(0, pointCount);
    geometries.add(geometry);

    const fiber = new THREE.Line(
      geometry,
      family === 'longitudinal' ? longitudinalMaterial : transverseMaterial
    );
    fiber.frustumCulled = false;
    fiber.userData = {
      family,
      index,
      total,
      points: pointCount,
      phase: index * 0.76
    } satisfies FiberMeta;
    fibers.add(fiber);
  }

  for (let i = 0; i < longitudinalCount; i += 1) addFiber('longitudinal', i, longitudinalCount);
  for (let i = 0; i < transverseCount; i += 1) addFiber('transverse', i, transverseCount);
  world.add(fibers);

  const seedPoint = new THREE.Vector3();
  const skinPoint = new THREE.Vector3();

  function updateFiber(line: THREE.Line, direction: Direction): void {
    const meta = line.userData as FiberMeta;
    const position = line.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let j = 0; j < meta.points; j += 1) {
      const u = j / (meta.points - 1);
      const coil = meta.phase + u * Math.PI * 1.4;
      const coilRadius = 0.025 + u * 0.12;
      seedPoint.set(
        direction.seedPosition.x + Math.cos(coil) * coilRadius,
        direction.seedPosition.y + (u - 0.5) * 0.46 + Math.sin(coil) * 0.018,
        direction.seedPosition.z + Math.sin(coil) * coilRadius
      );

      if (meta.family === 'longitudinal') {
        const lane = (meta.index + 0.5) / meta.total;
        const angle = 0.18 + lane * (Math.PI - 0.36);
        const radius = 2.08 - u * 0.12;
        skinPoint.set(
          Math.cos(angle) * radius,
          -1.52 + Math.sin(angle) * (1.92 + direction.canopyBreath),
          -0.76 - u * 2.95
        );
      } else {
        const depth = (meta.index + 0.7) / meta.total;
        const angle = 0.18 + u * (Math.PI - 0.36);
        const radius = 2.08 - depth * 0.12;
        skinPoint.set(
          Math.cos(angle) * radius,
          -1.52 + Math.sin(angle) * (1.92 + direction.canopyBreath),
          -0.76 - depth * 2.95
        );
      }

      const directionalDelay = meta.family === 'longitudinal' ? u * 0.3 : 0.12 + u * 0.18;
      const growth = smooth01(direction.fiberAssembly * 1.35 - directionalDelay);
      position.setXYZ(
        j,
        THREE.MathUtils.lerp(seedPoint.x, skinPoint.x, growth),
        THREE.MathUtils.lerp(seedPoint.y, skinPoint.y, growth),
        THREE.MathUtils.lerp(seedPoint.z, skinPoint.z, growth)
      );
    }

    position.needsUpdate = true;
  }

  function render(direction: Direction): void {
    camera.position.copy(direction.camera);
    camera.lookAt(direction.target);

    for (const child of fibers.children) updateFiber(child as THREE.Line, direction);

    const emergence = smooth01((direction.story - 0.08) / 0.18);
    const retirement = 1 - smooth01((direction.story - 0.72) / 0.24);
    fibers.visible = emergence > 0.001 && retirement > 0.001;
    longitudinalMaterial.opacity = emergence * retirement * (0.08 + direction.fiberAssembly * 0.19);
    transverseMaterial.opacity = emergence * retirement * direction.fiberAssembly * 0.11;

    renderer.render(world, camera);
  }

  function resize(next: GeneratedViewport): void {
    camera.aspect = next.width / next.height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(next.dpr, quality === 'low' ? 1.25 : 2));
    renderer.setSize(next.width, next.height, false);
  }

  function dispose(): void {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    renderer.dispose();
  }

  return { render, resize, dispose };
}
