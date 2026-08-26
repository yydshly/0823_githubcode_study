import * as THREE from 'three';
import type { PluginContext, RuntimeFrame, ScenePlugin } from '../runtime/plugin-contract';
import type { EffectiveQuality } from '../runtime/quality';

const vertexShader = /* glsl */ `
  uniform sampler2D uDepth;
  uniform vec2 uPointer;
  uniform float uAssembly;
  uniform float uDepthStrength;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    vDepth = texture2D(uDepth, uv).r;
    vec3 displaced = position;
    float nearField = pow(vDepth, 1.45);
    displaced.z += (nearField - 0.3) * uDepthStrength * (0.55 + uAssembly * 0.45);
    displaced.xy += uPointer * nearField * 0.14;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uColor;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uDensity;
  uniform vec3 uAccent;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    float nearField = pow(vDepth, 1.35);
    float water = sin(vUv.x * 24.0 + uTime * 0.18) * cos(vUv.y * 18.0 - uTime * 0.13);
    vec2 current = vec2(water, -water * 0.35) * 0.0016 * (0.25 + uEnergy);
    vec2 parallax = uPointer * (nearField - 0.22) * 0.011;
    vec2 sampleUv = clamp(vUv + current + parallax, 0.002, 0.998);
    vec3 color = texture2D(uColor, sampleUv).rgb;
    float caustic = pow(max(0.0, water), 6.0) * (0.03 + uEnergy * 0.06);
    float focus = smoothstep(0.48, 0.9, nearField) * uEnergy * 0.08;
    color += uAccent * (caustic + focus);
    color *= 0.82 + uDensity * 0.18;
    float edge = smoothstep(0.0, 0.12, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    gl_FragColor = vec4(color * edge, 1.0);
  }
`;

interface ArchiveUniforms extends Record<string, THREE.IUniform> {
  uColor: { value: THREE.Texture };
  uDepth: { value: THREE.Texture };
  uPointer: { value: THREE.Vector2 };
  uTime: { value: number };
  uAssembly: { value: number };
  uEnergy: { value: number };
  uDensity: { value: number };
  uDepthStrength: { value: number };
  uAccent: { value: THREE.Color };
}

const planeSegments: Readonly<Record<EffectiveQuality, readonly [number, number]>> = {
  high: [144, 81], balanced: [96, 54], low: [36, 20]
};
const particleCounts: Readonly<Record<EffectiveQuality, number>> = { high: 720, balanced: 420, low: 140 };

export class TidalArchivePlugin implements ScenePlugin {
  readonly id = 'tidal-archive';
  private readonly group = new THREE.Group();
  private readonly driftGroup = new THREE.Group();
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly colorPlaceholder = solidTexture([4, 18, 24, 255]);
  private readonly depthPlaceholder = solidTexture([42, 42, 42, 255]);
  private readonly pointerTarget = new THREE.Vector2();
  private readonly accentTarget = new THREE.Color();
  private readonly archivePlates: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>[] = [];
  private readonly archivePlateRest: Array<{ position: THREE.Vector3; rotation: THREE.Euler }> = [];
  private readonly threads: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = [];
  private readonly uniforms: ArchiveUniforms = {
    uColor: { value: this.colorPlaceholder },
    uDepth: { value: this.depthPlaceholder },
    uPointer: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uAssembly: { value: 0 },
    uEnergy: { value: 0 },
    uDensity: { value: 0 },
    uDepthStrength: { value: 0.72 },
    uAccent: { value: new THREE.Color('#8ee9ef') }
  };
  private context!: PluginContext;
  private backdrop!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private particles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null;
  private colorTexture: THREE.Texture | null = null;
  private depthTexture: THREE.Texture | null = null;
  private quality: EffectiveQuality = 'balanced';
  private assetState: 'loading' | 'ready' | 'error' = 'loading';
  private disposed = false;

  initialize(context: PluginContext): void {
    this.context = context;
    context.scene.background = new THREE.Color(context.theme.deep);
    context.scene.fog = new THREE.FogExp2(context.theme.deep, 0.016);
    context.root.add(this.group);
    this.group.add(this.driftGroup);

    this.backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(19.2, 10.8, ...planeSegments[this.quality]),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader, fragmentShader })
    );
    this.backdrop.position.set(0, 0, -4);
    this.group.add(this.backdrop);
    this.buildArchivePlates();
    this.buildThreads();
    this.buildParticles();
    void this.loadAssets();
  }

  setQuality(quality: EffectiveQuality): void {
    if (this.quality === quality) return;
    this.quality = quality;
    const previous = this.backdrop.geometry;
    this.backdrop.geometry = new THREE.PlaneGeometry(19.2, 10.8, ...planeSegments[quality]);
    previous.dispose();
    this.uniforms.uDepthStrength.value = assetUri(this.context, 'hero-depth') ? quality === 'low' ? 0.25 : quality === 'high' ? 0.84 : 0.62 : 0;
    this.archivePlates.forEach((plate, index) => { plate.visible = quality !== 'low' || index < 3; });
    this.threads.forEach((thread, index) => { thread.visible = quality !== 'low' || index === 0; });
    this.buildParticles();
  }

  update({ state, elapsed, pointer }: RuntimeFrame): void {
    this.uniforms.uTime.value = elapsed;
    this.uniforms.uAssembly.value = state.assembly;
    this.uniforms.uEnergy.value = state.energy;
    this.uniforms.uDensity.value = state.density;
    this.pointerTarget.set(pointer.x, pointer.y);
    this.uniforms.uPointer.value.lerp(this.pointerTarget, 0.045);
    this.accentTarget.set(state.accent);
    this.uniforms.uAccent.value.lerp(this.accentTarget, 0.035);
    this.group.position.x = pointer.x * 0.042;
    this.group.position.y = pointer.y * 0.022;
    this.backdrop.scale.setScalar(1.03 - state.assembly * 0.03);
    this.driftGroup.position.y = Math.sin(elapsed * 0.11) * 0.055 * state.energy;
    this.driftGroup.rotation.z = Math.sin(elapsed * 0.07) * 0.006;
    this.archivePlates.forEach((plate, index) => {
      const phase = index * 0.83;
      const rest = this.archivePlateRest[index];
      plate.position.copy(rest.position);
      plate.position.y += Math.sin(elapsed * 0.16 + phase) * 0.026 * state.energy;
      plate.rotation.copy(rest.rotation);
      plate.rotation.z += Math.sin(elapsed * 0.09 + phase) * 0.014 * state.energy * (index % 2 ? -1 : 1);
      plate.material.opacity = 0.035 + state.assembly * 0.08;
    });
    this.threads.forEach((thread, index) => {
      thread.material.opacity = (0.08 + state.energy * 0.18) * (1 - index * 0.16);
    });
    if (this.particles) {
      this.particles.rotation.y = elapsed * 0.006;
      this.particles.material.opacity = 0.16 + state.density * 0.25;
    }
    if (this.context.scene.fog instanceof THREE.FogExp2) this.context.scene.fog.density = 0.006 + state.fog * 0.018;
  }

  snapshot() {
    return {
      id: this.id,
      metrics: {
        assetState: this.assetState,
        colorAsset: assetUri(this.context, 'hero-color'),
        depthAsset: assetUri(this.context, 'hero-depth'),
        planeVertices: this.backdrop.geometry.getAttribute('position').count,
        archivePlates: this.archivePlates.filter((plate) => plate.visible).length,
        memoryThreads: this.threads.filter((thread) => thread.visible).length,
        particles: particleCounts[this.quality],
        depthParallax: assetUri(this.context, 'hero-depth') ? this.quality === 'low' ? 'limited' : 'full' : 'none'
      }
    };
  }

  dispose(): void {
    this.disposed = true;
    this.backdrop.geometry.dispose();
    this.backdrop.material.dispose();
    this.clearParticles();
    this.archivePlates.forEach((plate) => { plate.geometry.dispose(); plate.material.dispose(); });
    this.threads.forEach((thread) => { thread.geometry.dispose(); thread.material.dispose(); });
    this.colorTexture?.dispose();
    this.depthTexture?.dispose();
    this.colorPlaceholder.dispose();
    this.depthPlaceholder.dispose();
    this.group.removeFromParent();
  }

  private async loadAssets(): Promise<void> {
    const colorUri = assetUri(this.context, 'hero-color');
    const depthUri = assetUri(this.context, 'hero-depth');
    if (!colorUri) { this.assetState = 'error'; this.context.invalidate(); return; }
    try {
      const color = await this.textureLoader.loadAsync(colorUri);
      if (this.disposed) { color.dispose(); return; }
      color.colorSpace = THREE.SRGBColorSpace;
      color.minFilter = THREE.LinearMipmapLinearFilter;
      this.colorTexture = color;
      this.uniforms.uColor.value = color;
      if (depthUri) {
        try {
          const depth = await this.textureLoader.loadAsync(depthUri);
          if (this.disposed) { depth.dispose(); return; }
          depth.colorSpace = THREE.NoColorSpace;
          depth.minFilter = THREE.LinearMipmapLinearFilter;
          this.depthTexture = depth;
          this.uniforms.uDepth.value = depth;
        } catch (error) {
          console.warn('[tidal-archive] Depth asset unavailable; continuing with a flat hero plate.', error);
          this.uniforms.uDepthStrength.value = 0;
        }
      } else this.uniforms.uDepthStrength.value = 0;
      this.assetState = 'ready';
      this.context.invalidate();
    } catch (error) {
      console.warn('[tidal-archive] Failed to load generated archive assets.', error);
      this.assetState = 'error';
      this.context.invalidate();
    }
  }

  private buildArchivePlates(): void {
    const random = seededRandom(this.context.definition.seed + 43);
    for (let index = 0; index < 8; index += 1) {
      const geometry = new THREE.PlaneGeometry(0.55 + random() * 0.75, 0.32 + random() * 0.45);
      const material = new THREE.MeshPhysicalMaterial({
        color: index % 3 === 0 ? this.context.theme.accentSoft : this.context.theme.accent,
        transparent: true, opacity: 0.07, roughness: 0.22, metalness: 0, transmission: 0.58,
        thickness: 0.08, side: THREE.DoubleSide, depthWrite: false
      });
      const plate = new THREE.Mesh(geometry, material);
      plate.position.set(-4.8 + random() * 10.2, -2.2 + random() * 4.8, -2.1 + random() * 2.6);
      plate.rotation.set((random() - 0.5) * 0.34, (random() - 0.5) * 0.45, (random() - 0.5) * 0.5);
      this.archivePlateRest.push({ position: plate.position.clone(), rotation: plate.rotation.clone() });
      this.archivePlates.push(plate);
      this.driftGroup.add(plate);
    }
  }

  private buildThreads(): void {
    const origins: readonly THREE.Vector3[] = [new THREE.Vector3(-4.8, -1.2, -1.6), new THREE.Vector3(-2.4, 1.8, -1.7), new THREE.Vector3(4.6, -1.6, -1.4)];
    origins.forEach((origin, index) => {
      const curve = new THREE.CatmullRomCurve3([
        origin,
        new THREE.Vector3(origin.x * 0.55, origin.y + (index - 1) * 0.7, -0.9),
        new THREE.Vector3(1.2 + index * 0.35, 0.2 - index * 0.12, -0.55)
      ]);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
      const material = new THREE.LineBasicMaterial({ color: index === 1 ? this.context.theme.accentSoft : this.context.theme.accent, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
      const thread = new THREE.Line(geometry, material);
      this.threads.push(thread);
      this.driftGroup.add(thread);
    });
  }

  private buildParticles(): void {
    this.clearParticles();
    const count = particleCounts[this.quality];
    const positions = new Float32Array(count * 3);
    const random = seededRandom(this.context.definition.seed + 91);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (random() - 0.5) * 18;
      positions[index * 3 + 1] = (random() - 0.5) * 9;
      positions[index * 3 + 2] = -3.3 + random() * 4.2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: this.context.theme.accent, size: this.quality === 'high' ? 0.022 : 0.017, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.particles = new THREE.Points(geometry, material);
    this.driftGroup.add(this.particles);
  }

  private clearParticles(): void {
    if (!this.particles) return;
    this.particles.geometry.dispose();
    this.particles.material.dispose();
    this.particles.removeFromParent();
    this.particles = null;
  }
}

function solidTexture(rgba: readonly [number, number, number, number]): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array(rgba), 1, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

function assetUri(context: PluginContext, role: string): string {
  return context.definition.assets?.find((asset) => asset.role === role)?.uri ?? '';
}

function seededRandom(seed: number): () => number {
  let value = seed || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}
