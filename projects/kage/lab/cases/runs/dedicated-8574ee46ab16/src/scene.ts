import * as THREE from "three";
import type { DreamState } from "./director";

interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

type Quality = "low" | "balanced" | "high";

const MEMORY_URI = "/creative-assets/dream-memory-fragments-v1.png";

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform float uOpacity;
  uniform float uImageAspect;
  uniform float uViewAspect;
  uniform float uBreath;
  uniform vec2 uParallax;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv) {
    float ratio = uViewAspect / max(uImageAspect, 0.001);
    if (ratio > 1.0) {
      uv.y = (uv.y - 0.5) / ratio + 0.5;
    } else {
      uv.x = (uv.x - 0.5) * ratio + 0.5;
    }
    return uv;
  }

  void main() {
    vec2 breathingUv = (vUv - 0.5) * (1.0 + uBreath) + 0.5;
    vec2 uv = coverUv(breathingUv) + uParallax;
    vec2 px = vec2(0.0025);

    vec3 image = texture2D(uMap, uv).rgb * 0.52;
    image += texture2D(uMap, uv + vec2(px.x, 0.0)).rgb * 0.12;
    image += texture2D(uMap, uv - vec2(px.x, 0.0)).rgb * 0.12;
    image += texture2D(uMap, uv + vec2(0.0, px.y)).rgb * 0.12;
    image += texture2D(uMap, uv - vec2(0.0, px.y)).rgb * 0.12;

    float luminance = dot(image, vec3(0.2126, 0.7152, 0.0722));
    float luminanceMask = smoothstep(0.16, 0.72, luminance);
    float feather =
      smoothstep(0.0, 0.18, vUv.x) *
      smoothstep(0.0, 0.18, vUv.y) *
      smoothstep(0.0, 0.18, 1.0 - vUv.x) *
      smoothstep(0.0, 0.18, 1.0 - vUv.y);
    float alpha = uOpacity * uHasMap * luminanceMask * feather;

    gl_FragColor = vec4(image, alpha);
  }
`;

export class DreamRoomScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
  private readonly geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly echo: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly fallbackTexture: THREE.DataTexture;
  private memoryTexture: THREE.Texture | null = null;
  private readonly quality: Quality;
  private readonly reducedMotion: boolean;
  private viewport: Viewport;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    viewport: Viewport,
    quality: Quality,
    reducedMotion: boolean
  ) {
    this.viewport = viewport;
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: quality !== "low",
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: quality === "high" ? "high-performance" : "default"
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;

    this.fallbackTexture = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 0]),
      1,
      1,
      THREE.RGBAFormat
    );
    this.fallbackTexture.needsUpdate = true;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uMap: { value: this.fallbackTexture },
        uHasMap: { value: 0 },
        uOpacity: { value: 0 },
        uImageAspect: { value: 16 / 9 },
        uViewAspect: {
          value: viewport.width / Math.max(1, viewport.height)
        },
        uBreath: { value: 0 },
        uParallax: { value: new THREE.Vector2() }
      }
    });

    this.echo = new THREE.Mesh(this.geometry, this.material);
    this.echo.frustumCulled = false;
    this.scene.add(this.echo);

    this.camera.position.set(0, 0, 3.5);
    this.loadMemoryTexture();
    this.resize(viewport);
  }

  private loadMemoryTexture(): void {
    new THREE.TextureLoader().load(
      MEMORY_URI,
      (texture: THREE.Texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        this.memoryTexture = texture;

        const image = texture.image as { width?: number; height?: number };
        const aspect = image.width && image.height
          ? image.width / image.height
          : 16 / 9;

        this.material.uniforms.uMap.value = texture;
        this.material.uniforms.uHasMap.value = 1;
        this.material.uniforms.uImageAspect.value = aspect;
      }
    );
  }

  resize(viewport: Viewport): void {
    this.viewport = viewport;
    this.renderer.setPixelRatio(
      Math.min(viewport.dpr, this.quality === "high" ? 2 : 1.35)
    );
    this.renderer.setSize(viewport.width, viewport.height, false);
    this.camera.aspect = viewport.width / Math.max(1, viewport.height);
    this.camera.updateProjectionMatrix();

    const viewHeight =
      2 *
      Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) *
      this.camera.position.z;
    const viewWidth = viewHeight * this.camera.aspect;
    this.echo.scale.set(viewWidth * 0.5, viewHeight * 0.5, 1);
    this.material.uniforms.uViewAspect.value = this.camera.aspect;
  }

  render(state: DreamState, _delta: number): void {
    this.material.uniforms.uOpacity.value = Math.min(0.08, state.passage * 0.08);
    this.material.uniforms.uBreath.value = this.reducedMotion
      ? 0
      : state.breath * 0.35;
    this.material.uniforms.uParallax.value.set(
      this.reducedMotion ? 0 : state.cameraX * 0.03,
      this.reducedMotion ? 0 : state.cameraY * 0.02
    );

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    this.scene.remove(this.echo);
    this.material.dispose();
    this.geometry.dispose();
    this.memoryTexture?.dispose();
    this.memoryTexture = null;
    this.fallbackTexture.dispose();
    this.scene.clear();
    this.renderer.dispose();
  }
}
