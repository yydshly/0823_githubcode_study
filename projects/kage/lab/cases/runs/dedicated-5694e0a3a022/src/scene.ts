import * as THREE from 'three';
import type { RepairStoryState } from './director';

export type FaultKind = 'stalled' | 'noise' | 'weak';

interface ViewportLike {
  width: number;
  height: number;
  dpr: number;
}

interface PartRecord {
  object: THREE.Object3D;
  homeX: number;
  explodeX: number;
}

export class RepairScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  private readonly assembly = new THREE.Group();
  private readonly bladeHub = new THREE.Group();
  private readonly parts: PartRecord[] = [];
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly faultMaterials: Record<FaultKind, THREE.MeshStandardMaterial[]>;
  private readonly accent = new THREE.Color('#e9563f');
  private readonly neutral = new THREE.Color('#315a6b');
  private readonly lowQuality: boolean;
  private compact = false;

  constructor(canvas: HTMLCanvasElement, viewport: ViewportLike, lowQuality: boolean) {
    this.lowQuality = lowQuality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowQuality, alpha: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.scene.fog = new THREE.Fog('#f4efd9', 10, 18);

    const blue = this.material('#315a6b', 0.72);
    const red = this.material('#e9563f', 0.62);
    const yellow = this.material('#e8b83f', 0.58);
    const mint = this.material('#83b99b', 0.65);
    const cream = this.material('#f4efd9', 0.78);
    const dark = this.material('#173743', 0.78);

    this.faultMaterials = { stalled: [yellow, dark], noise: [red, blue], weak: [mint, red] };

    this.buildFan({ blue, red, yellow, mint, cream, dark });
    this.scene.add(this.assembly);

    const key = new THREE.DirectionalLight('#fff6d5', 3.1);
    key.position.set(-4, 6, 7);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight('#8fc3ca', 1.3);
    fill.position.set(5, 1, 4);
    this.scene.add(fill);
    this.scene.add(new THREE.HemisphereLight('#fff9e8', '#8aa19a', 1.55));

    this.camera.position.set(0.25, 0.3, 8.3);
    this.resize(viewport);
  }

  private material(color: string, roughness: number): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.12 });
    this.materials.add(material);
    return material;
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    this.geometries.add(geometry);
    return new THREE.Mesh(geometry, material);
  }

  private addPart(object: THREE.Object3D, homeX: number, explodeX: number): void {
    object.position.x = homeX;
    this.parts.push({ object, homeX, explodeX });
    this.assembly.add(object);
  }

  private buildFan(m: Record<'blue' | 'red' | 'yellow' | 'mint' | 'cream' | 'dark', THREE.MeshStandardMaterial>): void {
    const base = this.mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.28, 40), m.blue);
    base.scale.z = 0.62;
    base.position.set(0, -2.35, 0);
    this.assembly.add(base);

    const neck = this.mesh(new THREE.CylinderGeometry(0.17, 0.23, 1.55, 20), m.red);
    neck.position.set(0, -1.48, 0);
    this.assembly.add(neck);

    const pivot = this.mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.42, 24), m.yellow);
    pivot.rotation.x = Math.PI / 2;
    pivot.position.set(0, -0.65, 0);
    this.assembly.add(pivot);

    const rear = new THREE.Group();
    const motor = this.mesh(new THREE.CylinderGeometry(0.68, 0.78, 1.05, 32), m.dark);
    motor.rotation.x = Math.PI / 2;
    rear.add(motor);
    const vent = this.mesh(new THREE.TorusGeometry(0.47, 0.055, 10, 32), m.mint);
    vent.position.z = -0.56;
    rear.add(vent);
    rear.position.y = 0.55;
    this.addPart(rear, 0, -2.0);

    const rearCage = this.makeCage(m.blue);
    rearCage.position.y = 0.55;
    this.addPart(rearCage, 0, -1.0);

    const blades = this.bladeHub;
    const hub = this.mesh(new THREE.SphereGeometry(0.34, 24, 16), m.yellow);
    blades.add(hub);
    for (let i = 0; i < 4; i += 1) {
      const blade = this.mesh(new THREE.CapsuleGeometry(0.3, 1.05, 8, 16), m.mint);
      blade.scale.set(0.72, 1, 0.16);
      blade.position.y = 0.78;
      blade.rotation.z = -0.32;
      const carrier = new THREE.Group();
      carrier.rotation.z = i * Math.PI * 0.5;
      carrier.add(blade);
      blades.add(carrier);
    }
    blades.position.y = 0.55;
    blades.position.z = 0.18;
    this.addPart(blades, 0, 0.3);

    const frontCage = this.makeCage(m.red);
    frontCage.position.y = 0.55;
    frontCage.position.z = 0.47;
    this.addPart(frontCage, 0, 1.55);

    const badge = this.mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.1, 28), m.cream);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0, 0.55, 0.77);
    this.addPart(badge, 0, 2.3);

    this.assembly.rotation.y = -0.1;
    this.assembly.scale.setScalar(0.82);
    this.assembly.position.x = 1.55;
  }

  private makeCage(material: THREE.Material): THREE.Group {
    const cage = new THREE.Group();
    [0.78, 1.28, 1.72].forEach((radius) => {
      const ring = this.mesh(new THREE.TorusGeometry(radius, 0.026, 7, this.lowQuality ? 36 : 64), material);
      cage.add(ring);
    });
    for (let i = 0; i < 12; i += 1) {
      const spoke = this.mesh(new THREE.BoxGeometry(0.028, 1.72, 0.025), material);
      spoke.position.y = 0.86;
      spoke.rotation.z = i * Math.PI / 6;
      cage.add(spoke);
    }
    return cage;
  }

  setFault(fault: FaultKind): void {
    const active = new Set<THREE.Material>(this.faultMaterials[fault]);
    this.materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.copy(active.has(material) ? this.accent : new THREE.Color(0x000000));
        material.emissiveIntensity = active.has(material) ? 0.18 : 0;
      }
    });
  }

  render(state: RepairStoryState, fault: FaultKind, delta: number): void {
    this.parts.forEach((part, index) => {
      const stagger = Math.max(0, Math.min(1, state.explode * 1.35 - index * 0.07));
      const eased = stagger * stagger * (3 - 2 * stagger);
      part.object.position.x = THREE.MathUtils.lerp(part.homeX, part.explodeX, eased);
    });

    const testedSpeed = state.stage === 2 ? (0.35 + state.testPulse * 0.35) : 0;
    this.bladeHub.rotation.z -= Math.min(delta, 0.05) * testedSpeed;
    this.assembly.rotation.y = THREE.MathUtils.lerp(-0.1, -0.035, state.finalLock);
    const openingX = this.compact ? 0.28 : 1.55;
    const resolvedX = this.compact ? 0.1 : 1.25;
    this.assembly.position.x = THREE.MathUtils.lerp(openingX, resolvedX, state.finalLock);

    this.camera.position.set(state.cameraX, state.cameraY, state.cameraZ);
    this.camera.lookAt(state.lookX, state.lookY, 0);

    const selected = new Set<THREE.Material>(this.faultMaterials[fault]);
    this.assembly.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
      meshMaterials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          const emphasis = selected.has(material) ? 0.2 + state.testPulse * 0.18 : 0;
          material.emissive.copy(selected.has(material) ? this.accent : this.neutral);
          material.emissiveIntensity = emphasis;
        }
      });
    });

    this.renderer.render(this.scene, this.camera);
  }

  resize(viewport: ViewportLike): void {
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    this.compact = width < 760;
    this.assembly.scale.setScalar(this.compact ? 0.52 : 0.82);
    this.renderer.setPixelRatio(Math.min(viewport.dpr, this.lowQuality ? 1.25 : 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.renderer.dispose();
  }
}
