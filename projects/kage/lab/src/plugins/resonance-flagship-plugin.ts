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
    vec3 transformed = position;
    float nearness = pow(vDepth, 1.65);
    transformed.z += (nearness - 0.22) * uDepthStrength * (0.42 + uAssembly * 0.58);
    transformed.xy += vec2(uPointer.x, uPointer.y) * nearness * 0.18;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uColor;
  uniform sampler2D uDepth;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uDensity;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    float nearness = pow(vDepth, 1.55);
    vec2 parallax = uPointer * (nearness - 0.16) * 0.012;
    float resonance = sin(vUv.y * 28.0 + uTime * 0.34) * sin(vUv.x * 12.0 - uTime * 0.22);
    vec2 flow = vec2(resonance, resonance * 0.35) * 0.0015 * uEnergy * (0.2 + nearness);
    vec2 sampleUv = clamp(vUv + parallax + flow, 0.002, 0.998);
    float split = 0.0011 * uEnergy * smoothstep(0.45, 0.95, nearness);
    vec3 color;
    color.r = texture2D(uColor, sampleUv + vec2(split, 0.0)).r;
    color.g = texture2D(uColor, sampleUv).g;
    color.b = texture2D(uColor, sampleUv - vec2(split, 0.0)).b;
    float edge = smoothstep(0.0, 0.14, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    float focusLift = smoothstep(0.48, 0.92, nearness) * uEnergy * 0.1;
    color = color * (0.78 + uDensity * 0.22) + vec3(0.24, 0.72, 0.88) * focusLift;
    gl_FragColor = vec4(color * edge, 1.0);
  }
`;

const rippleVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rippleFragment = /* glsl */ `
  uniform float uTime;
  uniform float uEnergy;
  uniform float uAssembly;
  uniform vec3 uAccent;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float rings = abs(sin(radius * 78.0 - uTime * 0.72 + sin(angle * 3.0) * 1.2));
    float line = smoothstep(0.94, 1.0, rings);
    float envelope = smoothstep(0.5, 0.08, radius) * smoothstep(0.08, 0.24, radius);
    float alpha = line * envelope * (0.05 + uEnergy * 0.2) * uAssembly;
    gl_FragColor = vec4(uAccent, alpha);
  }
`;

interface FlagshipUniforms extends Record<string, THREE.IUniform> {
  uColor: { value: THREE.Texture };
  uDepth: { value: THREE.Texture };
  uPointer: { value: THREE.Vector2 };
  uTime: { value: number };
  uAssembly: { value: number };
  uEnergy: { value: number };
  uDensity: { value: number };
  uDepthStrength: { value: number };
}

const planeSegments: Readonly<Record<EffectiveQuality, readonly [number, number]>> = {
  high: [144, 81], balanced: [96, 54], low: [36, 20]
};

const particleCounts: Readonly<Record<EffectiveQuality, number>> = { high: 900, balanced: 520, low: 180 };

export class ResonanceFlagshipPlugin implements ScenePlugin {
  readonly id = 'resonance-flagship';
  private readonly group = new THREE.Group();
  private readonly atmosphere = new THREE.Group();
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly colorPlaceholder = solidTexture([7, 13, 18, 255]);
  private readonly depthPlaceholder = solidTexture([48, 48, 48, 255]);
  private readonly uniforms: FlagshipUniforms = {
    uColor: { value: this.colorPlaceholder },
    uDepth: { value: this.depthPlaceholder },
    uPointer: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uAssembly: { value: 0 },
    uEnergy: { value: 0 },
    uDensity: { value: 0 },
    uDepthStrength: { value: .68 }
  };
  private context!: PluginContext;
  private background!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private ripple!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private particles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null;
  private colorTexture: THREE.Texture | null = null;
  private depthTexture: THREE.Texture | null = null;
  private quality: EffectiveQuality = 'balanced';
  private assetState: 'loading' | 'ready' | 'error' = 'loading';
  private disposed = false;
  private readonly pointerTarget = new THREE.Vector2();
  private readonly accentTarget = new THREE.Color();

  private depthStrengthBudget = .68;
  private lastFocus = 'listening';
  private lastAssembly = 0;
  private lastEnergy = 0;
  private lastDensity = 0;
  private lastDepthStrength = 0;
  initialize(context: PluginContext): void {
    this.context = context;
    context.scene.background = new THREE.Color(context.theme.deep);
    context.scene.fog = new THREE.FogExp2(context.theme.deep, .014);
    context.root.add(this.group);
    this.group.add(this.atmosphere);

    const material = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader, fragmentShader, depthWrite: true, depthTest: true });
    this.background = new THREE.Mesh(new THREE.PlaneGeometry(19.2, 10.8, ...planeSegments[this.quality]), material);
    this.background.position.set(0, 0, -4);
    this.group.add(this.background);

    const rippleUniforms = {
      uTime: { value: 0 }, uEnergy: { value: 0 }, uAssembly: { value: 0 }, uAccent: { value: new THREE.Color(context.theme.accent) }
    };
    this.ripple = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 5.8),
      new THREE.ShaderMaterial({ uniforms: rippleUniforms, vertexShader: rippleVertex, fragmentShader: rippleFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.ripple.position.set(3.18, .18, -1.9);
    this.group.add(this.ripple);
    this.buildParticles();
    void this.loadAssets();
  }

  setQuality(quality: EffectiveQuality): void {
    const changed = this.quality !== quality;
    this.quality = quality;
    if (changed) {
      const oldGeometry = this.background.geometry;
      this.background.geometry = new THREE.PlaneGeometry(19.2, 10.8, ...planeSegments[quality]);
      oldGeometry.dispose();
      this.buildParticles();
    }
    const hasDepth = Boolean(assetUri(this.context, 'hero-depth'));
    this.depthStrengthBudget = hasDepth ? quality === 'low' ? .28 : quality === 'high' ? .92 : .68 : 0;
    this.uniforms.uDepthStrength.value = this.depthStrengthBudget;
  }

  update({ state, elapsed, pointer }: RuntimeFrame): void {
    const depthFocus = state.focus === 'depth' ? .18 : state.focus === 'release' ? .1 : 0;
    const directionFocus = state.focus === 'direction' ? 1 : 0;
    const releaseFocus = state.focus === 'release' ? 1 : 0;
    const depthStrength = this.depthStrengthBudget * (.68 + state.assembly * .2 + depthFocus);
    this.uniforms.uTime.value = elapsed;
    this.uniforms.uAssembly.value = state.assembly;
    this.uniforms.uEnergy.value = state.energy;
    this.uniforms.uDensity.value = state.density;
    this.uniforms.uDepthStrength.value = depthStrength;
    this.pointerTarget.set(pointer.x, pointer.y);
    this.uniforms.uPointer.value.lerp(this.pointerTarget, .055);
    this.group.position.x = pointer.x * .045;
    this.group.position.y = pointer.y * .024;
    this.background.scale.setScalar(1.03 - state.assembly * .03 + depthFocus * .012);
    this.background.position.x = -.3 + state.assembly * .3 - depthFocus * .08;
    this.background.position.y = directionFocus * -.035 + releaseFocus * .025;
    const rippleUniforms = this.ripple.material.uniforms;
    rippleUniforms.uTime.value = elapsed;
    rippleUniforms.uEnergy.value = state.energy;
    rippleUniforms.uAssembly.value = state.assembly;
    this.accentTarget.set(state.accent);
    rippleUniforms.uAccent.value.lerp(this.accentTarget, .04);
    this.ripple.scale.setScalar(.68 + state.assembly * .26 + directionFocus * .13 + releaseFocus * .08);
    this.ripple.position.x = 3.18 - depthFocus * .32 + releaseFocus * .18;
    this.ripple.rotation.z = elapsed * (.012 + directionFocus * .018) * state.energy;
    this.atmosphere.rotation.y = pointer.x * .014 + pointer.velocityX * .0004 + directionFocus * .025;
    this.atmosphere.position.y = Math.sin(elapsed * .16) * .035 * state.energy;
    if (this.particles) this.particles.material.opacity = .12 + state.density * .28;
    if (this.context.scene.fog instanceof THREE.FogExp2) this.context.scene.fog.density = .004 + state.fog * .018;
    this.lastFocus = state.focus ?? 'ambient';
    this.lastAssembly = state.assembly;
    this.lastEnergy = state.energy;
    this.lastDensity = state.density;
    this.lastDepthStrength = depthStrength;
  }

  snapshot() {
    return {
      id: this.id,
      metrics: {
        assetState: this.assetState,
        colorAsset: assetUri(this.context, 'hero-color'),
        depthAsset: assetUri(this.context, 'hero-depth'),
        assetQuality: this.context.definition.assets?.find((asset) => asset.role === 'hero-color')?.qualityLevel ?? 'unknown',
        planeVertices: this.background.geometry.getAttribute('position').count,
        particles: particleCounts[this.quality],
        depthParallax: assetUri(this.context, 'hero-depth') ? this.quality === 'low' ? 'limited' : 'full' : 'none',
        omittedAssets: assetUri(this.context, 'hero-depth') ? 0 : 1,
        focus: this.lastFocus,
        assembly: Number(this.lastAssembly.toFixed(3)),
        energy: Number(this.lastEnergy.toFixed(3)),
        density: Number(this.lastDensity.toFixed(3)),
        depthStrength: Number(this.lastDepthStrength.toFixed(3)),
      }
    };
  }

  dispose(): void {
    this.disposed = true;
    this.background.geometry.dispose();
    this.background.material.dispose();
    this.ripple.geometry.dispose();
    this.ripple.material.dispose();
    this.clearParticles();
    this.colorTexture?.dispose();
    this.depthTexture?.dispose();
    this.colorPlaceholder.dispose();
    this.depthPlaceholder.dispose();
    this.group.removeFromParent();
  }

  private async loadAssets(): Promise<void> {
    const colorUri = assetUri(this.context, 'hero-color');
    const depthUri = assetUri(this.context, 'hero-depth');
    if (!colorUri) {
      this.assetState = 'error';
      this.context.invalidate();
      return;
    }
    try {
      const color = await this.textureLoader.loadAsync(colorUri);
      if (this.disposed) { color.dispose(); return; }
      color.colorSpace = THREE.SRGBColorSpace;
      color.minFilter = THREE.LinearMipmapLinearFilter;
      color.magFilter = THREE.LinearFilter;
      this.colorTexture = color;
      this.uniforms.uColor.value = color;
      if (depthUri) {
        try {
          const depth = await this.textureLoader.loadAsync(depthUri);
          if (this.disposed) { depth.dispose(); return; }
          depth.colorSpace = THREE.NoColorSpace;
          depth.minFilter = THREE.LinearMipmapLinearFilter;
          depth.magFilter = THREE.LinearFilter;
          this.depthTexture = depth;
          this.uniforms.uDepth.value = depth;
        } catch (error) {
          console.warn('[resonance-flagship] Depth asset unavailable; continuing with color-only staging.', error);
          this.uniforms.uDepthStrength.value = 0;
          this.depthStrengthBudget = 0;
        }
      } else {
        this.uniforms.uDepthStrength.value = 0;
        this.depthStrengthBudget = 0;
      }
      this.assetState = 'ready';
      this.context.invalidate();
    } catch (error) {
      console.warn('[resonance-flagship] Failed to load generated visual assets.', error);
      this.assetState = 'error';
      this.context.invalidate();
    }
  }

  private buildParticles(): void {
    this.clearParticles();
    const count = particleCounts[this.quality];
    const positions = new Float32Array(count * 3);
    const random = seededRandom(this.context.definition.seed + 97);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (random() - .5) * 17;
      positions[index * 3 + 1] = (random() - .48) * 8.2;
      positions[index * 3 + 2] = -3.2 + random() * 4.4;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: this.context.theme.accentSoft, size: this.quality === 'high' ? .026 : .02, transparent: true, opacity: .34, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.particles = new THREE.Points(geometry, material);
    this.atmosphere.add(this.particles);
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
