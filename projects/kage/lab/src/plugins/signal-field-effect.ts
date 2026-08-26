import * as THREE from 'three';
import type { SceneDefinition } from '../experience/schema';
import type { EffectPlugin, PluginContext, RuntimeFrame } from '../runtime/plugin-contract';
import type { EffectiveQuality } from '../runtime/quality';
import { qualityProfiles } from '../runtime/quality';

const MAX_BEACONS = 96;
const MAX_PARTICLES = 720;

export class SignalFieldEffect implements EffectPlugin {
  readonly id = 'signal-field';
  private readonly world = new THREE.Group();
  private readonly rings = new THREE.Group();
  private readonly disposables: Array<{ dispose: () => void }> = [];
  private readonly clockColor = new THREE.Color();
  private readonly dummy = new THREE.Object3D();
  private beaconMesh!: THREE.InstancedMesh;
  private particles!: THREE.Points;
  private definition!: SceneDefinition;
  private quality: EffectiveQuality = 'balanced';
  private lastBeaconCount = 0;
  private lastParticleCount = 0;

  initialize(context: PluginContext): void {
    this.definition = context.definition;
    context.root.add(this.world);

    const floorGeometry = new THREE.CircleGeometry(18, 96);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: context.theme.surface, roughness: .78, metalness: .12, transparent: true, opacity: .72 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.25;
    floor.receiveShadow = true;
    this.world.add(floor);
    this.disposables.push(floorGeometry, floorMaterial);

    const beaconGeometry = new THREE.CylinderGeometry(.055, .14, 1, 7);
    const beaconMaterial = new THREE.MeshStandardMaterial({ color: context.theme.accent, emissive: context.theme.accent, emissiveIntensity: .32, roughness: .38, metalness: .5 });
    this.beaconMesh = new THREE.InstancedMesh(beaconGeometry, beaconMaterial, MAX_BEACONS);
    this.beaconMesh.castShadow = true;
    this.beaconMesh.receiveShadow = true;
    this.world.add(this.beaconMesh);
    this.disposables.push(beaconGeometry, beaconMaterial);

    for (let index = 0; index < 4; index += 1) {
      const geometry = new THREE.TorusGeometry(1.7 + index * .72, .018 + index * .008, 8, 96);
      const material = new THREE.MeshStandardMaterial({ color: index % 2 ? context.theme.accentSoft : context.theme.accent, emissive: context.theme.accent, emissiveIntensity: .28, transparent: true, opacity: .62, metalness: .7, roughness: .25 });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.set(Math.PI / 2 + index * .16, index * .31, 0);
      this.rings.add(ring);
      this.disposables.push(geometry, material);
    }
    this.world.add(this.rings);

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    for (let index = 0; index < MAX_PARTICLES; index += 1) {
      const radius = 2.5 + this.random(index) * 12;
      const angle = this.random(index + 91) * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = -.6 + this.random(index + 203) * 7;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: context.theme.accent, size: .045, transparent: true, opacity: .68, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.world.add(this.particles);
    this.disposables.push(particleGeometry, particleMaterial);
    this.addFlowLines(context.theme.accent);
  }

  setQuality(quality: EffectiveQuality): void {
    this.quality = quality;
    this.beaconMesh.castShadow = qualityProfiles[quality].shadows;
  }

  update({ state, elapsed }: RuntimeFrame): void {
    const profile = qualityProfiles[this.quality];
    const beaconCount = Math.max(8, Math.round(MAX_BEACONS * profile.instanceRatio * (.35 + state.density * .65)));
    const particleCount = Math.max(24, Math.round(MAX_PARTICLES * profile.particleRatio * (.32 + state.density * .68)));
    this.layoutBeacons(beaconCount, state.assembly, elapsed * state.energy);
    this.beaconMesh.count = beaconCount;
    this.particles.geometry.setDrawRange(0, particleCount);
    this.lastBeaconCount = beaconCount;
    this.lastParticleCount = particleCount;
    const material = this.beaconMesh.material as THREE.MeshStandardMaterial;
    material.color.lerp(state.accent, .08);
    material.emissive.copy(material.color);
    (this.particles.material as THREE.PointsMaterial).color.lerp(state.accent, .06);
    this.clockColor.copy(state.accent);
    this.rings.children.forEach((child, index) => {
      const ring = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      ring.rotation.z = elapsed * (.035 + index * .012) * (.25 + state.energy);
      ring.scale.setScalar(.78 + state.assembly * .22 + Math.sin(elapsed * .4 + index) * .012 * state.energy);
      ring.material.color.lerp(this.clockColor, .025);
    });
    this.particles.rotation.y = elapsed * .012 * state.energy;
    this.world.rotation.y = Math.sin(elapsed * .08) * .04 * state.energy;
  }

  snapshot() {
    return { id: this.id, metrics: { beacons: this.lastBeaconCount, particles: this.lastParticleCount, preset: this.definition.preset } };
  }

  dispose(): void {
    this.disposables.forEach((item) => item.dispose());
    this.world.removeFromParent();
  }

  private layoutBeacons(count: number, assembly: number, elapsed: number): void {
    for (let index = 0; index < count; index += 1) {
      const phase = index / Math.max(1, count - 1);
      let x = 0; let z = 0; let height = .8;
      if (this.definition.preset === 'archive-grid') {
        const side = Math.ceil(Math.sqrt(count));
        x = (index % side - (side - 1) / 2) * .72;
        z = (Math.floor(index / side) - (side - 1) / 2) * .72;
        height = .35 + (index % 5) * .27;
      } else if (this.definition.preset === 'flow-map') {
        x = (phase - .5) * 12;
        z = Math.sin(phase * Math.PI * 4 + elapsed * .18) * (1.2 + assembly * 1.4);
        height = .4 + Math.cos(phase * Math.PI * 6) * .35 + assembly * 1.3;
      } else {
        const angle = phase * Math.PI * 6 + elapsed * .04;
        const radius = 1.1 + phase * (5.6 - assembly * 1.8);
        x = Math.cos(angle) * radius; z = Math.sin(angle) * radius; height = .35 + phase * 1.8;
      }
      const spread = 1 + (1 - assembly) * .45;
      this.dummy.position.set(x * spread, -1.25 + height * .5, z * spread);
      this.dummy.scale.set(.8, height, .8);
      this.dummy.rotation.y = elapsed * .03 + index * .07;
      this.dummy.updateMatrix();
      this.beaconMesh.setMatrixAt(index, this.dummy.matrix);
    }
    this.beaconMesh.instanceMatrix.needsUpdate = true;
  }

  private addFlowLines(color: string): void {
    const positions: number[] = [];
    const count = this.definition.preset === 'archive-grid' ? 5 : 8;
    for (let band = 0; band < count; band += 1) for (let step = 0; step < 64; step += 1) {
      const a = step / 64 * Math.PI * 2; const b = (step + 1) / 64 * Math.PI * 2; const radius = 2.6 + band * 1.1;
      positions.push(Math.cos(a) * radius, -1.22, Math.sin(a) * radius, Math.cos(b) * radius, -1.22, Math.sin(b) * radius);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .12 });
    this.world.add(new THREE.LineSegments(geometry, material));
    this.disposables.push(geometry, material);
  }

  private random(index: number): number {
    const value = Math.sin(index * 12.9898 + this.definition.seed * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }
}
