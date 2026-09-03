import * as THREE from 'three';
import type { DirectedState } from './director';

interface ViewportLike {
  width: number;
  height: number;
  dpr: number;
}

type ExperienceQuality = 'low' | 'balanced' | 'high';

const environmentVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const environmentFragment = `
  precision highp float;
  uniform sampler2D uRoomA;
  uniform sampler2D uRoomB;
  uniform float uHasA;
  uniform float uHasB;
  uniform float uBlend;
  uniform float uClarity;
  uniform float uAspect;
  uniform float uImageAspectA;
  uniform float uImageAspectB;
  uniform vec2 uFocus;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv, float imageAspect) {
    vec2 scale = vec2(1.0);
    if (uAspect > imageAspect) scale.y = imageAspect / uAspect;
    else scale.x = uAspect / imageAspect;
    return (uv - 0.5) * scale + 0.5;
  }

  vec3 fallbackRoom(vec2 uv) {
    float wall = smoothstep(0.18, 0.82, uv.y);
    vec3 low = vec3(0.16, 0.135, 0.105);
    vec3 high = vec3(0.67, 0.61, 0.49);
    float windowLight = smoothstep(0.52, 0.9, uv.x) * smoothstep(0.12, 0.78, uv.y);
    return mix(low, high, wall * 0.7) + vec3(0.16, 0.13, 0.08) * windowLight;
  }

  void main() {
    vec2 uvA = coverUv(vUv, uImageAspectA);
    vec2 uvB = coverUv(vUv, uImageAspectB);
    vec3 base = fallbackRoom(vUv);
    vec3 roomA = texture2D(uRoomA, uvA).rgb;
    vec3 roomB = texture2D(uRoomB, uvB).rgb;
    vec3 a = mix(base, roomA, uHasA);
    vec3 b = mix(a, roomB, uHasB);
    vec3 color = mix(a, b, uBlend * 0.42);
    float local = 1.0 - smoothstep(0.08, 0.48, distance(vUv, uFocus));
    float haze = (1.0 - uClarity) * (0.16 - local * 0.055);
    color = mix(color, vec3(0.72, 0.69, 0.61), haze);
    color *= mix(0.68, 1.0, uClarity);
    color = mix(color, vec3(dot(color, vec3(0.299, 0.587, 0.114))), (1.0 - uClarity) * 0.28);
    float vignette = smoothstep(0.88, 0.28, distance(vUv, vec2(0.5)));
    color *= mix(0.74, 1.05, vignette);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export class ScentScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly environmentScene: THREE.Scene;
  private readonly environmentCamera: THREE.Camera;
  private readonly environmentMaterial: THREE.ShaderMaterial;
  private readonly bottleGroup = new THREE.Group();
  private readonly layerGroup = new THREE.Group();
  private readonly bottleMaterial: THREE.MeshPhysicalMaterial;
  private readonly soilMaterial: THREE.MeshStandardMaterial;
  private readonly paperMaterial: THREE.MeshStandardMaterial;
  private readonly cottonMaterial: THREE.MeshStandardMaterial;
  private readonly sealMaterial: THREE.MeshStandardMaterial;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly textures: THREE.Texture[] = [];
  private readonly loader: THREE.TextureLoader;
  private readonly reducedMotion: boolean;
  private sealed = false;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, quality: ExperienceQuality, reducedMotion: boolean, viewport: ViewportLike) {
    this.reducedMotion = reducedMotion;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', alpha: true, powerPreference: quality === 'high' ? 'high-performance' : 'default' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.setClearColor(0x30291f, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    this.camera.position.set(0, 0.2, 7.2);

    this.environmentScene = new THREE.Scene();
    this.environmentCamera = new THREE.Camera();
    const emptyTexture = this.createFallbackTexture();
    this.environmentMaterial = new THREE.ShaderMaterial({
      vertexShader: environmentVertex,
      fragmentShader: environmentFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uRoomA: { value: emptyTexture },
        uRoomB: { value: emptyTexture },
        uHasA: { value: 0 },
        uHasB: { value: 0 },
        uBlend: { value: 0 },
        uClarity: { value: 0 },
        uAspect: { value: 1 },
        uImageAspectA: { value: 1.5 },
        uImageAspectB: { value: 1.5 },
        uFocus: { value: new THREE.Vector2(0.5, 0.5) }
      }
    });
    const environmentGeometry = new THREE.PlaneGeometry(2, 2);
    this.geometries.push(environmentGeometry);
    this.environmentScene.add(new THREE.Mesh(environmentGeometry, this.environmentMaterial));

    this.loader = new THREE.TextureLoader();
    this.loader.setCrossOrigin('anonymous');
    if (quality !== 'low') {
      this.loadEnvironment('/creative-assets/r20-scent-memory/scent-memory-environment-v1.png', 'uRoomA', 'uHasA', 'uImageAspectA');
    }

    this.bottleMaterial = new THREE.MeshPhysicalMaterial({ color: 0xf4efe4, roughness: 0.08, transmission: quality === 'low' ? 0.58 : 0.94, thickness: 0.12, transparent: true, opacity: 0.22, depthWrite: false, ior: 1.46, clearcoat: 1, side: THREE.DoubleSide });
    this.soilMaterial = new THREE.MeshStandardMaterial({ color: 0x554633, roughness: 0.92, metalness: 0, transparent: true, opacity: 0.34, depthWrite: false });
    this.paperMaterial = new THREE.MeshStandardMaterial({ color: 0xb99c6a, roughness: 0.77, metalness: 0, transparent: true, opacity: 0.25, depthWrite: false });
    this.cottonMaterial = new THREE.MeshStandardMaterial({ color: 0xe4d8ba, roughness: 1, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false });
    this.sealMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.9, transparent: true, opacity: 0.16, depthWrite: false });

    this.buildSpecimen();
    this.addLighting();
    this.resize(viewport);
  }

  private createFallbackTexture(): THREE.DataTexture {
    const pixels = new Uint8Array([80, 70, 55, 255, 164, 148, 116, 255, 57, 49, 39, 255, 126, 112, 88, 255]);
    const texture = new THREE.DataTexture(pixels, 2, 2, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.textures.push(texture);
    return texture;
  }

  private loadEnvironment(uri: string, samplerName: string, presenceName: string, aspectName: string): void {
    this.loader.load(uri, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      this.textures.push(texture);
      this.environmentMaterial.uniforms[samplerName].value = texture;
      this.environmentMaterial.uniforms[presenceName].value = 1;
      const image = texture.image as { width?: number; height?: number };
      if (typeof image.width === 'number' && typeof image.height === 'number' && image.height > 0) {
        this.environmentMaterial.uniforms[aspectName].value = image.width / image.height;
      }
    }, undefined, () => {
      this.environmentMaterial.uniforms[presenceName].value = 0;
    });
  }

  private buildSpecimen(): void {
    const profile = [
      new THREE.Vector2(0.02, -1.55), new THREE.Vector2(0.74, -1.5), new THREE.Vector2(0.88, -1.28),
      new THREE.Vector2(0.9, 0.62), new THREE.Vector2(0.78, 0.9), new THREE.Vector2(0.42, 1.12),
      new THREE.Vector2(0.35, 1.42), new THREE.Vector2(0.02, 1.45)
    ];
    const bottleGeometry = new THREE.LatheGeometry(profile, 48);
    this.geometries.push(bottleGeometry);
    const bottle = new THREE.Mesh(bottleGeometry, this.bottleMaterial);
    bottle.renderOrder = 4;
    this.bottleGroup.add(bottle);

    const neckGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.38, 32);
    const sealGeometry = new THREE.CylinderGeometry(0.39, 0.35, 0.38, 32);
    this.geometries.push(neckGeometry, sealGeometry);
    const neck = new THREE.Mesh(neckGeometry, this.bottleMaterial);
    neck.position.y = 1.48;
    const seal = new THREE.Mesh(sealGeometry, this.sealMaterial);
    seal.position.y = 1.78;
    this.bottleGroup.add(neck, seal);

    const layerGeometry = new THREE.CylinderGeometry(0.56, 0.62, 0.22, 40);
    this.geometries.push(layerGeometry);
    const soil = new THREE.Mesh(layerGeometry, this.soilMaterial);
    const paper = new THREE.Mesh(layerGeometry, this.paperMaterial);
    const cotton = new THREE.Mesh(layerGeometry, this.cottonMaterial);
    soil.name = 'soil';
    paper.name = 'paper';
    cotton.name = 'cotton';
    this.layerGroup.add(soil, paper, cotton);
    this.bottleGroup.add(this.layerGroup);
    this.bottleGroup.position.set(0, -0.15, 0);
    this.scene.add(this.bottleGroup);
  }

  private addLighting(): void {
    this.scene.add(new THREE.HemisphereLight(0xf1e2c2, 0x33291e, 1.8));
    const key = new THREE.DirectionalLight(0xffe4b5, 4.2);
    key.position.set(4, 5, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9caa91, 1.2);
    rim.position.set(-4, 1, 2);
    this.scene.add(rim);
  }

  setSealed(sealed: boolean): void {
    this.sealed = sealed;
  }

  render(state: DirectedState, delta: number): void {
    const uniforms = this.environmentMaterial.uniforms;
    uniforms.uBlend.value = state.formation;
    uniforms.uClarity.value = state.clarity;
    (uniforms.uFocus.value as THREE.Vector2).set(state.focusX, 1 - state.focusY);

    const portrait = this.width / this.height < 0.72;
    const baseX = portrait ? 0.22 : 0;
    const baseY = portrait ? -0.65 : -0.1;
    this.bottleGroup.position.x = baseX + state.cameraX;
    this.bottleGroup.position.y = baseY - state.cameraY;

    const hazeScale = portrait
      ? 0.46 + state.formation * 0.06
      : 0.68 + state.formation * 0.1;
    this.bottleGroup.scale.setScalar(hazeScale);
    this.bottleMaterial.opacity = 0.12 + state.clarity * 0.16;
    this.bottleMaterial.roughness = 0.2 - state.clarity * 0.12;

    const layers = this.layerGroup.children;
    const soil = layers[0];
    const paper = layers[1];
    const cotton = layers[2];
    const spread = state.separation * (portrait ? 0.26 : 0.38);
    const settle = state.resolution;

    soil.position.set(-spread, -0.62 + settle * 0.1, spread * 0.08);
    paper.position.set(0, -0.08, spread * 0.22);
    cotton.position.set(spread, 0.54 - settle * 0.1, spread * 0.08);
    soil.rotation.z = -spread * 0.14;
    paper.rotation.z = spread * 0.05;
    cotton.rotation.z = spread * 0.13;

    soil.scale.y = 0.55 + state.mix.soil * 0.35;
    paper.scale.y = 0.55 + state.mix.paper * 0.35;
    cotton.scale.y = 0.55 + state.mix.cotton * 0.35;

    const calm = state.resolution > 0.8 || this.reducedMotion || this.sealed;
    if (!calm) {
      const restrainedBreath = Math.sin(state.elapsed * 0.55) * 0.008 * state.separation;
      this.layerGroup.rotation.y = restrainedBreath;
    } else {
      this.layerGroup.rotation.y *= Math.max(0, 1 - delta * 5);
    }

    this.camera.position.x = state.cameraX * 0.5;
    this.camera.position.y = 0.2 - state.cameraY * 0.4;
    this.camera.lookAt(baseX * 0.12, 0.08, 0);

    this.renderer.autoClear = true;
    this.renderer.render(this.environmentScene, this.environmentCamera);
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = true;
  }

  resize(viewport: ViewportLike): void {
    this.width = Math.max(1, viewport.width);
    this.height = Math.max(1, viewport.height);
    this.renderer.setPixelRatio(Math.min(viewport.dpr, 2));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.environmentMaterial.uniforms.uAspect.value = this.width / this.height;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.environmentMaterial.dispose();
    this.bottleMaterial.dispose();
    this.soilMaterial.dispose();
    this.paperMaterial.dispose();
    this.cottonMaterial.dispose();
    this.sealMaterial.dispose();
    for (const texture of this.textures) texture.dispose();
    this.scene.clear();
    this.environmentScene.clear();
    this.renderer.dispose();
  }
}
