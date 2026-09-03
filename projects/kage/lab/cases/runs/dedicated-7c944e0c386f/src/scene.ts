import * as THREE from 'three';
import type { DirectedState } from './director';

export type SceneViewport = Readonly<{ width: number; height: number; dpr: number }>;
type Quality = 'low' | 'balanced' | 'high';

type Fibre = Readonly<{
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  scattered: THREE.Vector3;
  aligned: THREE.Vector3;
}>;

const ease = (value: number): number => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export class PaperScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
  private readonly fibreField = new THREE.Group();
  private readonly seam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly fibres: Fibre[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly reducedMotion: boolean;
  private readonly lowQuality: boolean;

  constructor(canvas: HTMLCanvasElement, quality: Quality, viewport: SceneViewport, reducedMotion: boolean) {
    this.lowQuality = quality === 'low';
    this.reducedMotion = reducedMotion;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: quality !== 'low',
      powerPreference: quality === 'high' ? 'high-performance' : 'default'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.camera.position.z = 2;
    this.scene.add(this.fibreField);

    this.createFibres(quality === 'high' ? 34 : quality === 'balanced' ? 24 : 14);
    const seamGeometry = new THREE.BufferGeometry().setFromPoints(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.32, 0.62, 0),
        new THREE.Vector3(0.24, 0.28, 0),
        new THREE.Vector3(0.08, -0.02, 0),
        new THREE.Vector3(0.16, -0.34, 0),
        new THREE.Vector3(0.03, -0.68, 0)
      ]).getPoints(48)
    );
    this.geometries.push(seamGeometry);
    this.seam = new THREE.Line(seamGeometry, new THREE.LineBasicMaterial({
      color: 0xe3c895,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.scene.add(this.seam);
    this.resize(viewport);
  }

  private createFibres(count: number): void {
    for (let index = 0; index < count; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const along = index / Math.max(1, count - 1);
      const anchorY = 0.66 - along * 1.34;
      const wave = Math.sin(index * 2.17) * 0.025;
      const points: THREE.Vector3[] = [];
      for (let point = 0; point <= 12; point += 1) {
        const t = point / 12;
        const x = 0.17 + side * t * (0.18 + (index % 5) * 0.017);
        const y = anchorY + Math.sin(t * Math.PI * 1.4 + index * 0.31) * (0.018 + along * 0.012);
        points.push(new THREE.Vector3(x, y, 0));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.geometries.push(geometry);
      const material = new THREE.LineBasicMaterial({
        color: index % 6 === 0 ? 0xd4aa6b : 0xe3d4b5,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const line = new THREE.Line(geometry, material);
      const scattered = new THREE.Vector3(side * (0.09 + (index % 4) * 0.018), wave * 4, 0);
      const aligned = new THREE.Vector3(side * 0.012, 0, 0);
      line.position.copy(scattered);
      this.fibreField.add(line);
      this.fibres.push({ line, scattered, aligned });
    }
  }

  render(state: DirectedState, delta: number): void {
    const settle = this.reducedMotion ? 1 : Math.min(1, Math.max(0.08, delta * 7));
    const detail = ease(state.fibreDepth) * (1 - ease(state.restoredPage));
    const alignment = ease(state.fibreAlignment);
    this.fibreField.scale.setScalar(THREE.MathUtils.lerp(this.fibreField.scale.x, 1 + detail * 0.18, settle));
    this.fibreField.position.x = THREE.MathUtils.lerp(this.fibreField.position.x, state.inspectionX * 0.35, settle);
    this.fibreField.position.y = THREE.MathUtils.lerp(this.fibreField.position.y, -state.inspectionY * 0.24, settle);

    this.fibres.forEach((fibre, index) => {
      const target = new THREE.Vector3().lerpVectors(fibre.scattered, fibre.aligned, alignment);
      fibre.line.position.lerp(target, settle);
      fibre.line.material.opacity = detail * (0.2 + (index % 5) * 0.035);
    });

    const seamPresence = ease(state.patchFit) * (1 - ease(state.restoredPage));
    this.seam.material.opacity = seamPresence * 0.58;
    this.seam.scale.x = THREE.MathUtils.lerp(1.07, 0.96, ease(state.patchFit));
    this.renderer.render(this.scene, this.camera);
  }

  resize(viewport: SceneViewport): void {
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    this.renderer.setPixelRatio(Math.min(viewport.dpr, this.lowQuality ? 1.1 : 1.7));
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    for (const fibre of this.fibres) fibre.line.material.dispose();
    this.seam.material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    this.renderer.dispose();
  }
}
