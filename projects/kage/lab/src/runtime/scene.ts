import * as THREE from 'three';
import type { StoryConfig, WorldPreset } from '../config/schema';
import type { CameraPose } from './camera-director';
import type { EffectiveQuality } from './quality';
import { qualityProfiles } from './quality';
import type { SceneState } from './scene-state';

const MAX_BEACONS = 96;
const MAX_PARTICLES = 720;

export interface RuntimeSnapshot {
  lifecycle: 'running' | 'context-lost';
  framesRendered: number;
  drawCalls: number;
  triangles: number;
  points: number;
  dpr: number;
  quality: EffectiveQuality;
  beacons: number;
  particles: number;
}

export class SignalScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  private readonly world = new THREE.Group();
  private readonly rings = new THREE.Group();
  private readonly beaconMesh: THREE.InstancedMesh;
  private readonly particles: THREE.Points;
  private readonly disposables: Array<{ dispose: () => void }> = [];
  private readonly clockColor = new THREE.Color();
  private readonly dummy = new THREE.Object3D();
  private lifecycle: RuntimeSnapshot['lifecycle'] = 'running';
  private quality: EffectiveQuality;
  private lastBeaconCount = 0;
  private lastParticleCount = 0;
  private framesRendered = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly story: StoryConfig,
    quality: EffectiveQuality,
    private readonly onContextLost: () => void,
    private readonly onContextRestored: () => void
  ) {
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.background = new THREE.Color(story.theme.deep);
    this.scene.fog = new THREE.FogExp2(story.theme.deep, 0.045);
    this.scene.add(this.world);

    const hemi = new THREE.HemisphereLight(story.theme.text, story.theme.deep, 1.4);
    const key = new THREE.DirectionalLight(story.theme.accentSoft, 3.1);
    key.position.set(5, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(hemi, key);

    const floorGeometry = new THREE.CircleGeometry(18, 96);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: story.theme.surface, roughness: 0.78, metalness: 0.12, transparent: true, opacity: 0.72 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.25;
    floor.receiveShadow = true;
    this.world.add(floor);
    this.disposables.push(floorGeometry, floorMaterial);

    const beaconGeometry = new THREE.CylinderGeometry(0.055, 0.14, 1, 7);
    const beaconMaterial = new THREE.MeshStandardMaterial({ color: story.theme.accent, emissive: story.theme.accent, emissiveIntensity: 0.32, roughness: 0.38, metalness: 0.5 });
    this.beaconMesh = new THREE.InstancedMesh(beaconGeometry, beaconMaterial, MAX_BEACONS);
    this.beaconMesh.castShadow = true;
    this.beaconMesh.receiveShadow = true;
    this.world.add(this.beaconMesh);
    this.disposables.push(beaconGeometry, beaconMaterial);

    for (let index = 0; index < 4; index += 1) {
      const geometry = new THREE.TorusGeometry(1.7 + index * 0.72, 0.018 + index * 0.008, 8, 96);
      const material = new THREE.MeshStandardMaterial({ color: index % 2 ? story.theme.accentSoft : story.theme.accent, emissive: story.theme.accent, emissiveIntensity: 0.28, transparent: true, opacity: 0.62, metalness: 0.7, roughness: 0.25 });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.set(Math.PI / 2 + index * 0.16, index * 0.31, 0);
      this.rings.add(ring);
      this.disposables.push(geometry, material);
    }
    this.world.add(this.rings);

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    for (let index = 0; index < MAX_PARTICLES; index += 1) {
      const radius = 2.5 + this.random(index, story.world.seed) * 12;
      const angle = this.random(index + 91, story.world.seed) * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = -0.6 + this.random(index + 203, story.world.seed) * 7;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setDrawRange(0, MAX_PARTICLES);
    const particleMaterial = new THREE.PointsMaterial({ color: story.theme.accent, size: 0.045, transparent: true, opacity: 0.68, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.world.add(this.particles);
    this.disposables.push(particleGeometry, particleMaterial);

    this.addFlowLines(story.world.preset);
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
    this.setQuality(quality);
    this.resize();
  }

  setQuality(quality: EffectiveQuality): void {
    this.quality = quality;
    const profile = qualityProfiles[quality];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, profile.dprCap));
    this.renderer.shadowMap.enabled = profile.shadows;
    this.beaconMesh.castShadow = profile.shadows;
    this.resize();
  }

  resize(): void {
    const width = Math.max(1, innerWidth);
    const height = Math.max(1, innerHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(pose: CameraPose, state: SceneState, elapsed: number, pointer: { x: number; y: number }): void {
    if (this.lifecycle !== 'running') return;
    const profile = qualityProfiles[this.quality];
    const beaconCount = Math.max(8, Math.round(MAX_BEACONS * profile.instanceRatio * (0.35 + state.density * 0.65)));
    const particleCount = Math.max(24, Math.round(MAX_PARTICLES * profile.particleRatio * (0.32 + state.density * 0.68)));
    this.layoutBeacons(this.story.world.preset, beaconCount, state.assembly, elapsed * state.energy);
    this.beaconMesh.count = beaconCount;
    this.particles.geometry.setDrawRange(0, particleCount);
    this.lastBeaconCount = beaconCount;
    this.lastParticleCount = particleCount;

    const beaconMaterial = this.beaconMesh.material as THREE.MeshStandardMaterial;
    beaconMaterial.color.lerp(state.accent, 0.08);
    beaconMaterial.emissive.copy(beaconMaterial.color);
    (this.particles.material as THREE.PointsMaterial).color.lerp(state.accent, 0.06);
    this.clockColor.copy(state.accent);
    this.rings.children.forEach((child, index) => {
      const ring = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      ring.rotation.z = elapsed * (0.035 + index * 0.012) * (0.25 + state.energy);
      ring.scale.setScalar(0.78 + state.assembly * 0.22 + Math.sin(elapsed * 0.4 + index) * 0.012 * state.energy);
      ring.material.color.lerp(this.clockColor, 0.025);
    });
    this.particles.rotation.y = elapsed * 0.012 * state.energy;
    this.world.rotation.y = Math.sin(elapsed * 0.08) * 0.04 * state.energy;
    if (this.scene.fog instanceof THREE.FogExp2) this.scene.fog.density = 0.012 + state.fog * 0.055;

    this.camera.position.copy(pose.position);
    this.camera.position.x += pointer.x * 0.22;
    this.camera.position.y += pointer.y * 0.12;
    this.camera.quaternion.copy(pose.quaternion);
    if (Math.abs(this.camera.fov - pose.fov) > 0.01) {
      this.camera.fov = pose.fov;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.render(this.scene, this.camera);
    this.framesRendered += 1;
  }

  snapshot(): RuntimeSnapshot {
    return {
      lifecycle: this.lifecycle,
      framesRendered: this.framesRendered,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      points: this.renderer.info.render.points,
      dpr: this.renderer.getPixelRatio(),
      quality: this.quality,
      beacons: this.lastBeaconCount,
      particles: this.lastParticleCount
    };
  }

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.disposables.forEach((item) => item.dispose());
    this.renderer.dispose();
  }

  private layoutBeacons(preset: WorldPreset, count: number, assembly: number, elapsed: number): void {
    for (let index = 0; index < count; index += 1) {
      const phase = index / Math.max(1, count - 1);
      let x = 0;
      let z = 0;
      let height = 0.8;
      if (preset === 'archive-grid') {
        const side = Math.ceil(Math.sqrt(count));
        x = (index % side - (side - 1) / 2) * 0.72;
        z = (Math.floor(index / side) - (side - 1) / 2) * 0.72;
        height = 0.35 + (index % 5) * 0.27;
      } else if (preset === 'flow-map') {
        x = (phase - 0.5) * 12;
        z = Math.sin(phase * Math.PI * 4 + elapsed * 0.18) * (1.2 + assembly * 1.4);
        height = 0.4 + Math.cos(phase * Math.PI * 6) * 0.35 + assembly * 1.3;
      } else {
        const angle = phase * Math.PI * 2 * 3 + elapsed * 0.04;
        const radius = 1.1 + phase * (5.6 - assembly * 1.8);
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        height = 0.35 + phase * 1.8;
      }
      const spread = 1 + (1 - assembly) * 0.45;
      this.dummy.position.set(x * spread, -1.25 + height * 0.5, z * spread);
      this.dummy.scale.set(0.8, height, 0.8);
      this.dummy.rotation.y = elapsed * 0.03 + index * 0.07;
      this.dummy.updateMatrix();
      this.beaconMesh.setMatrixAt(index, this.dummy.matrix);
    }
    this.beaconMesh.instanceMatrix.needsUpdate = true;
  }

  private addFlowLines(preset: WorldPreset): void {
    const positions: number[] = [];
    const rings = preset === 'archive-grid' ? 5 : 8;
    for (let band = 0; band < rings; band += 1) {
      const radius = 2.6 + band * 1.1;
      for (let step = 0; step < 64; step += 1) {
        const a = (step / 64) * Math.PI * 2;
        const b = ((step + 1) / 64) * Math.PI * 2;
        positions.push(Math.cos(a) * radius, -1.22, Math.sin(a) * radius, Math.cos(b) * radius, -1.22, Math.sin(b) * radius);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: this.story.theme.accent, transparent: true, opacity: 0.12 });
    this.world.add(new THREE.LineSegments(geometry, material));
    this.disposables.push(geometry, material);
  }

  private random(index: number, seed: number): number {
    const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.lifecycle = 'context-lost';
    this.onContextLost();
  };

  private readonly handleContextRestored = (): void => {
    this.lifecycle = 'running';
    this.onContextRestored();
  };
}
