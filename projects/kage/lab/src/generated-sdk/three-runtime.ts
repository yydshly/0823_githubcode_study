import * as THREE from 'three';
import type { GeneratedQuality, GeneratedViewport } from './index.ts';

export interface GeneratedThreeRuntimeOptions {
  quality: GeneratedQuality;
  camera?: Readonly<{ fov?: number; near?: number; far?: number }>;
  renderer?: Omit<THREE.WebGLRendererParameters, 'canvas'>;
  clearColor?: THREE.ColorRepresentation;
  clearAlpha?: number;
  toneMapping?: THREE.ToneMapping;
  toneMappingExposure?: number;
  maxDpr?: number;
  lowQualityMaxDpr?: number;
}

export interface GeneratedThreeRuntime {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  geometry<T extends THREE.BufferGeometry>(resource: T): T;
  material<T extends THREE.Material>(resource: T): T;
  texture<T extends THREE.Texture>(resource: T): T;
  resize(viewport: GeneratedViewport): void;
  render(): void;
  dispose(): void;
}

export function generatedDprCap(quality: GeneratedQuality, options: Pick<GeneratedThreeRuntimeOptions, 'maxDpr' | 'lowQualityMaxDpr'> = {}): number {
  if (quality === 'low') return options.lowQualityMaxDpr ?? 1;
  return options.maxDpr ?? (quality === 'high' ? 2 : 1.5);
}

export function createGeneratedThreeRuntime(canvas: HTMLCanvasElement, options: GeneratedThreeRuntimeOptions): GeneratedThreeRuntime {
  const renderer = new THREE.WebGLRenderer({
    antialias: options.quality !== 'low',
    alpha: true,
    powerPreference: options.quality === 'low' ? 'low-power' : 'high-performance',
    ...options.renderer,
    canvas,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = options.toneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.toneMappingExposure ?? 1;
  renderer.setClearColor(options.clearColor ?? 0x000000, options.clearAlpha ?? 0);

  const scene = new THREE.Scene();
  const cameraOptions = options.camera ?? {};
  const camera = new THREE.PerspectiveCamera(cameraOptions.fov ?? 40, 1, cameraOptions.near ?? 0.1, cameraOptions.far ?? 100);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let disposed = false;

  const geometry = <T extends THREE.BufferGeometry>(resource: T): T => {
    geometries.add(resource);
    return resource;
  };
  const material = <T extends THREE.Material>(resource: T): T => {
    materials.add(resource);
    return resource;
  };
  const texture = <T extends THREE.Texture>(resource: T): T => {
    textures.add(resource);
    return resource;
  };
  const resize = (viewport: GeneratedViewport): void => {
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    renderer.setPixelRatio(Math.min(Math.max(1, viewport.dpr), generatedDprCap(options.quality, options)));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const render = (): void => renderer.render(scene, camera);
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    scene.traverse((object) => {
      const renderable = object as THREE.Object3D & {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };
      if (renderable.geometry instanceof THREE.BufferGeometry) geometries.add(renderable.geometry);
      const objectMaterials = renderable.material ? (Array.isArray(renderable.material) ? renderable.material : [renderable.material]) : [];
      for (const objectMaterial of objectMaterials) materials.add(objectMaterial);
    });
    for (const resource of materials) {
      for (const value of Object.values(resource)) if (value instanceof THREE.Texture) textures.add(value);
    }
    for (const resource of textures) resource.dispose();
    for (const resource of geometries) resource.dispose();
    for (const resource of materials) resource.dispose();
    scene.clear();
    renderer.renderLists.dispose();
    renderer.dispose();
  };

  return { renderer, scene, camera, geometry, material, texture, resize, render, dispose };
}
