import * as THREE from 'three';
import type { PluginContext, RuntimeFrame, ScenePlugin } from '../runtime/plugin-contract';
import type { EffectiveQuality } from '../runtime/quality';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uEnergy;
  uniform float uAssembly;
  uniform vec2 uPointer;
  varying vec2 vUv;
  varying float vWave;
  varying float vEdge;

  void main() {
    vUv = uv;
    vec3 p = position;
    float phase = p.x * 0.58 + p.y * 0.24;
    float waveA = sin(phase + uTime * (0.16 + uEnergy * 0.22));
    float waveB = cos(p.x * 0.19 - p.y * 0.42 - uTime * 0.11);
    float reveal = smoothstep(-7.0, 6.0, p.x + uAssembly * 11.0);
    p.z += (waveA * 0.75 + waveB * 0.46) * (0.28 + uEnergy * 0.72) * reveal;
    p.y += sin(p.x * 0.22 + uTime * 0.08) * 0.34 * uEnergy;
    p.z += uPointer.x * (uv.y - 0.5) * 0.55 + uPointer.y * (uv.x - 0.5) * 0.4;
    vWave = waveA * 0.5 + 0.5;
    vEdge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uAccent;
  uniform vec3 uSoft;
  uniform float uOpacity;
  uniform float uEnergy;
  varying vec2 vUv;
  varying float vWave;
  varying float vEdge;

  void main() {
    float vertical = smoothstep(0.02, 0.98, vUv.y);
    vec3 first = mix(uDeep, uAccent, vertical);
    vec3 color = mix(first, uSoft, smoothstep(0.42, 0.96, vWave) * (0.22 + uEnergy * 0.42));
    float bands = 0.72 + 0.28 * sin((vUv.x + vUv.y) * 22.0 + vWave * 4.0);
    float edge = smoothstep(0.0, 0.16, vEdge);
    float alpha = uOpacity * edge * (0.54 + vWave * 0.46) * bands;
    gl_FragColor = vec4(color, alpha);
  }
`;

interface TideUniforms extends Record<string, THREE.IUniform> {
  uTime: { value: number };
  uEnergy: { value: number };
  uAssembly: { value: number };
  uPointer: { value: THREE.Vector2 };
  uDeep: { value: THREE.Color };
  uAccent: { value: THREE.Color };
  uSoft: { value: THREE.Color };
  uOpacity: { value: number };
}

const segments: Readonly<Record<EffectiveQuality, readonly [number, number]>> = {
  high: [112, 64], balanced: [72, 44], low: [36, 22]
};

export class ChromaticTidePlugin implements ScenePlugin {
  readonly id = 'chromatic-tide';
  private readonly group = new THREE.Group();
  private readonly ribbons = new THREE.Group();
  private readonly disposables: Array<{ dispose: () => void }> = [];
  private readonly materials: THREE.ShaderMaterial[] = [];
  private context!: PluginContext;
  private core!: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshPhysicalMaterial>;
  private halo!: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private quality: EffectiveQuality = 'balanced';
  private vertexCount = 0;

  initialize(context: PluginContext): void {
    this.context = context;
    context.scene.background = new THREE.Color(context.theme.deep);
    context.scene.fog = new THREE.FogExp2(context.theme.deep, .026);
    context.root.add(this.group);
    this.group.add(this.ribbons);

    const ambient = new THREE.AmbientLight(context.theme.text, 1.1);
    const key = new THREE.PointLight(context.theme.accentSoft, 12, 28, 1.8);
    key.position.set(2, 6, 4);
    const rim = new THREE.PointLight(context.theme.accent, 8, 24, 2);
    rim.position.set(-6, 1, -3);
    this.group.add(ambient, key, rim);

    const coreGeometry = new THREE.IcosahedronGeometry(1.05, 3);
    const coreMaterial = new THREE.MeshPhysicalMaterial({ color: context.theme.accentSoft, emissive: context.theme.accent, emissiveIntensity: .22, roughness: .18, metalness: .08, transmission: .32, thickness: .8, transparent: true, opacity: .82 });
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.core.position.set(.8, .8, -.8);
    this.group.add(this.core);

    const haloGeometry = new THREE.TorusGeometry(2.2, .014, 6, 160);
    const haloMaterial = new THREE.MeshBasicMaterial({ color: context.theme.accent, transparent: true, opacity: .48, blending: THREE.AdditiveBlending });
    this.halo = new THREE.Mesh(haloGeometry, haloMaterial);
    this.halo.position.copy(this.core.position);
    this.halo.rotation.set(1.1, .3, .2);
    this.group.add(this.halo);
    this.disposables.push(coreGeometry, coreMaterial, haloGeometry, haloMaterial);

    this.buildRibbons();
  }

  setQuality(quality: EffectiveQuality): void {
    if (this.quality === quality) return;
    this.quality = quality;
    this.buildRibbons();
  }

  update({ state, elapsed, pointer }: RuntimeFrame): void {
    this.materials.forEach((material, index) => {
      const uniforms = material.uniforms as unknown as TideUniforms;
      uniforms.uTime.value = elapsed + index * 8.4;
      uniforms.uEnergy.value = state.energy;
      uniforms.uAssembly.value = state.assembly;
      uniforms.uPointer.value.set(pointer.x, pointer.y);
      uniforms.uAccent.value.lerp(state.accent, .045);
      uniforms.uOpacity.value = .24 + state.density * .28 - index * .025;
    });
    this.ribbons.rotation.x = pointer.y * .018;
    this.ribbons.rotation.y = -.18 + Math.sin(elapsed * .07) * .08 * state.energy + pointer.x * .026;
    this.ribbons.rotation.z = -pointer.x * .012;
    this.ribbons.position.y = -1.2 + state.assembly * .75;
    this.core.rotation.x = elapsed * .08 * state.energy;
    this.core.rotation.y = elapsed * .13 * state.energy;
    this.core.scale.setScalar(.58 + state.assembly * .52);
    this.core.material.emissive.lerp(state.accent, .04);
    this.halo.rotation.z = elapsed * .09 * state.energy;
    this.halo.scale.setScalar(.72 + state.assembly * .34);
    this.halo.material.color.lerp(state.accent, .035);
    if (this.context.scene.fog instanceof THREE.FogExp2) this.context.scene.fog.density = .008 + state.fog * .035;
  }

  snapshot() {
    return { id: this.id, metrics: { ribbons: this.materials.length, vertices: this.vertexCount, shaderLayers: this.materials.length, preset: this.context.definition.preset } };
  }

  dispose(): void {
    this.clearRibbons();
    this.disposables.forEach((item) => item.dispose());
    this.group.removeFromParent();
  }

  private buildRibbons(): void {
    this.clearRibbons();
    const [widthSegments, heightSegments] = segments[this.quality];
    const layerCount = this.quality === 'low' ? 3 : 5;
    this.vertexCount = 0;
    for (let index = 0; index < layerCount; index += 1) {
      const geometry = new THREE.PlaneGeometry(17 - index * .7, 7.4 - index * .35, widthSegments, heightSegments);
      this.vertexCount += geometry.getAttribute('position').count;
      const uniforms: TideUniforms = {
        uTime: { value: index * 8.4 }, uEnergy: { value: .4 }, uAssembly: { value: .3 }, uPointer: { value: new THREE.Vector2() },
        uDeep: { value: new THREE.Color(this.context.theme.deep) }, uAccent: { value: new THREE.Color(this.context.theme.accent) }, uSoft: { value: new THREE.Color(this.context.theme.accentSoft) }, uOpacity: { value: .42 - index * .035 }
      };
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: index < 2 ? THREE.AdditiveBlending : THREE.NormalBlending });
      const ribbon = new THREE.Mesh(geometry, material);
      ribbon.position.set((index - 2) * .25, index * .58 - .4, -index * 1.1);
      ribbon.rotation.set(-.08 + index * .045, -.15 + index * .07, -.12 + index * .05);
      this.ribbons.add(ribbon);
      this.materials.push(material);
      this.disposables.push(geometry, material);
    }
  }

  private clearRibbons(): void {
    for (const child of [...this.ribbons.children]) {
      const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
      mesh.geometry.dispose(); mesh.material.dispose(); mesh.removeFromParent();
      const geometryIndex = this.disposables.indexOf(mesh.geometry); if (geometryIndex >= 0) this.disposables.splice(geometryIndex, 1);
      const materialIndex = this.disposables.indexOf(mesh.material); if (materialIndex >= 0) this.disposables.splice(materialIndex, 1);
    }
    this.materials.length = 0;
  }
}
