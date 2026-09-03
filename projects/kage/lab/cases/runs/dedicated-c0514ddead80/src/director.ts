import * as THREE from 'three';
import type { WaterAtlasScene } from './scene';

type GeneratedPointer = Readonly<{ x: number; y: number }>;

function clamp01(value: number): number { return Math.min(1, Math.max(0, value)); }
function smoothstep(start: number, end: number, value: number): number {
  const t = clamp01((value - start) / Math.max(0.0001, end - start));
  return t * t * (3 - 2 * t);
}

export class AtlasDirector {
  private readonly scene: WaterAtlasScene;
  private readonly initialReducedMotion: boolean;
  private readonly targetCamera = new THREE.Vector3();
  private settledProgress = 0;

  constructor(scene: WaterAtlasScene, reducedMotion: boolean) {
    this.scene = scene;
    this.initialReducedMotion = reducedMotion;
  }

  update(progress: number, pointer: GeneratedPointer, elapsed: number, delta: number, reducedMotion: boolean): void {
    const motionReduced = reducedMotion || this.initialReducedMotion;
    const safeProgress = clamp01(progress);
    const response = motionReduced ? 1 : Math.min(1, Math.max(0.04, delta * 5.5));
    this.settledProgress += (safeProgress - this.settledProgress) * response;
    const p = motionReduced ? safeProgress : this.settledProgress;
    const evidence = smoothstep(0.27, 0.64, p);
    const resolve = smoothstep(0.72, 0.94, p);
    const reveal = smoothstep(0.04, 0.22, p);
    const pointerBias = motionReduced ? 0 : THREE.MathUtils.clamp(pointer.x, -1, 1) * 0.025 * (1 - resolve);

    this.scene.mapMaterial.uniforms.uFold.value = reveal * (1 - resolve) * 0.22;
    this.scene.mapMaterial.uniforms.uFocus.value = evidence;
    this.scene.mapMaterial.uniforms.uResolve.value = resolve;

    this.scene.mapGroup.rotation.x = -0.025 * reveal * (1 - resolve);
    this.scene.mapGroup.rotation.y = pointerBias;
    this.scene.mapGroup.position.x = THREE.MathUtils.lerp(0.85, -0.15, evidence) + resolve * 0.5;
    this.scene.mapGroup.position.y = THREE.MathUtils.lerp(0.08, 0.28, evidence) - resolve * 0.2;
    this.scene.mapGroup.scale.setScalar(THREE.MathUtils.lerp(0.91, 1.02, evidence) - resolve * 0.06);

    this.scene.routeGroup.visible = true;
    this.scene.routeGroup.scale.setScalar(1);

    this.scene.stationMeshes.forEach((mesh, id) => {
      const selected = id === this.scene.selectedId;
      const nearest = id === 'library';
      const finalWeight = resolve * (nearest ? 1 : 0.22);
      mesh.position.z = 0.18 + evidence * (selected ? 0.08 : 0.02);
      mesh.scale.setScalar((selected ? 1.55 : 1) + evidence * (selected ? 0.35 : 0.05) + finalWeight * 0.25);
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.opacity = THREE.MathUtils.lerp(1, nearest ? 1 : 0.5, resolve);
      });
    });

    this.scene.stationHalos.forEach((halo, id) => {
      const finalNearest = resolve > 0.5 && id === 'library';
      halo.visible = finalNearest || id === this.scene.selectedId;
      const pulse = motionReduced ? 1 : 1 + Math.sin(elapsed * 2.2) * 0.025 * (1 - resolve);
      halo.scale.setScalar((1 + evidence * 0.55 + resolve * (id === 'library' ? 0.8 : 0)) * pulse);
    });

    this.targetCamera.set(THREE.MathUtils.lerp(0.18, 0, resolve), THREE.MathUtils.lerp(0.08, 0, resolve), 8);
    this.scene.camera.position.lerp(this.targetCamera, motionReduced ? 1 : 0.08);
    this.scene.camera.lookAt(0, 0, 0);
  }

  dispose(): void { this.settledProgress = 0; }
}
