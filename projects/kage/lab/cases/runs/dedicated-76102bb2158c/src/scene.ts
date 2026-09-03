import * as THREE from 'three';

export interface ViewportLike {
  width: number;
  height: number;
  dpr: number;
}

export type SceneState = {
  era: number;
  archiveMix: number;
  resolve: number;
  inspectionX: number;
  inspectionY: number;
  elapsed: number;
};

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uArchive;
  uniform float uHasTexture;
  uniform float uAspect;
  uniform float uViewAspect;
  uniform float uEra;
  uniform float uArchiveMix;
  uniform float uResolve;
  uniform vec2 uInspect;
  uniform float uTime;
  uniform float uSaved;

  vec2 coverUv(vec2 uv) {
    vec2 scale = vec2(1.0);
    if (uViewAspect > uAspect) scale.y = uAspect / uViewAspect;
    else scale.x = uViewAspect / uAspect;
    return (uv - 0.5) * scale + 0.5;
  }

  vec3 fallbackStreet(vec2 uv) {
    vec3 paper = vec3(0.91, 0.88, 0.79);
    float road = smoothstep(0.56, 0.58, uv.y);
    float building = step(0.24, uv.y) * (1.0 - step(0.72, uv.y));
    vec3 color = mix(paper, vec3(0.70, 0.67, 0.58), road);
    color = mix(color, vec3(0.79, 0.72, 0.58), building * 0.62);
    float signShape = step(0.29, uv.x) * (1.0 - step(0.66, uv.x)) * step(0.38, uv.y) * (1.0 - step(0.46, uv.y));
    color = mix(color, vec3(0.67, 0.22, 0.12), signShape);
    return color;
  }

  vec3 eraSample(vec2 uv, float eraIndex) {
    float panel = clamp(eraIndex, 0.0, 2.0);
    vec2 atlasUv = vec2((uv.x + panel) / 3.0, uv.y);
    return texture2D(uArchive, atlasUv).rgb;
  }

  void main() {
    vec2 uv = coverUv(vUv);
    float eraFloor = floor(uEra);
    float eraBlend = smoothstep(0.0, 1.0, fract(uEra));
    vec3 a = eraSample(uv, eraFloor);
    vec3 b = eraSample(uv, min(2.0, eraFloor + 1.0));
    vec3 image = mix(a, b, eraBlend);
    image = mix(fallbackStreet(uv), image, uHasTexture);

    float archiveBand = smoothstep(0.18, 0.34, uArchiveMix) * (1.0 - smoothstep(0.78, 0.94, uArchiveMix));
    float ticketA = step(abs(vUv.x - 0.18), 0.10) * step(abs(vUv.y - 0.73), 0.045);
    float ticketB = step(abs(vUv.x - 0.77), 0.12) * step(abs(vUv.y - 0.30), 0.038);
    float perforation = 0.55 + 0.45 * step(0.45, fract(vUv.x * 72.0));
    vec3 ticketInk = vec3(0.73, 0.30, 0.17);
    image = mix(image, ticketInk, (ticketA + ticketB) * archiveBand * 0.32 * perforation);

    float inspection = 1.0 - smoothstep(0.06, 0.31, distance(vUv, uInspect));
    image *= 0.92 + inspection * 0.08 * archiveBand;
    float daylight = 0.10 + 0.08 * vUv.y;
    image += vec3(0.96, 0.80, 0.55) * daylight;
    image = mix(image, image * vec3(1.03, 0.98, 0.90), uResolve);
    image += vec3(0.72, 0.25, 0.10) * uSaved * 0.035;

    float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(0.0, 0.16, 1.0 - vUv.x);
    edge *= smoothstep(0.0, 0.12, vUv.y) * smoothstep(0.0, 0.12, 1.0 - vUv.y);
    vec3 paper = vec3(0.95, 0.92, 0.84);
    image = mix(paper, image, 0.78 + edge * 0.22);
    gl_FragColor = vec4(image, 1.0);
  }
`;

export class CinemaScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly geometry = new THREE.PlaneGeometry(2, 2);
  private readonly material: THREE.ShaderMaterial;
  private readonly textureLoader = new THREE.TextureLoader();
  private texture: THREE.Texture | null = null;
  private disposed = false;
  private eraCurrent = 2;
  private savedCurrent = 0;

  constructor(canvas: HTMLCanvasElement, viewport: ViewportLike, quality: string) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: quality !== 'low', powerPreference: quality === 'low' ? 'low-power' : 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xf1eadb, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uArchive: { value: new THREE.Texture() },
        uHasTexture: { value: 0 },
        uAspect: { value: 1.5 },
        uViewAspect: { value: 1 },
        uEra: { value: 2 },
        uArchiveMix: { value: 0 },
        uResolve: { value: 0 },
        uInspect: { value: new THREE.Vector2(0.72, 0.45) },
        uTime: { value: 0 },
        uSaved: { value: 0 }
      }
    });
    this.scene.add(new THREE.Mesh(this.geometry, this.material));
    this.resize(viewport);
    this.textureLoader.setCrossOrigin('anonymous');
    this.textureLoader.load(
      '/creative-assets/cinema-memory-street-continuity-v1.png',
      (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        this.texture = texture;
        this.material.uniforms.uArchive.value = texture;
        const image = texture.image as { width?: number; height?: number };
        const width = image.width ?? 3;
        const height = image.height ?? 2;
        this.material.uniforms.uAspect.value = (width / 3) / height;
        this.material.uniforms.uHasTexture.value = 1;
      },
      undefined,
      () => {
        if (!this.disposed) this.material.uniforms.uHasTexture.value = 0;
      }
    );
  }

  applyState(state: SceneState, delta: number, reducedMotion: boolean): void {
    const response = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 8);
    this.eraCurrent = THREE.MathUtils.lerp(this.eraCurrent, state.era, response);
    this.material.uniforms.uEra.value = this.eraCurrent;
    this.material.uniforms.uArchiveMix.value = state.archiveMix;
    this.material.uniforms.uResolve.value = state.resolve;
    this.material.uniforms.uInspect.value.set(state.inspectionX, state.inspectionY);
    this.material.uniforms.uTime.value = state.elapsed;
    this.savedCurrent = THREE.MathUtils.lerp(this.savedCurrent, this.material.uniforms.uSaved.value, response);
  }

  setSaved(saved: boolean): void {
    this.material.uniforms.uSaved.value = saved ? 1 : 0;
  }

  resize(viewport: ViewportLike): void {
    const dpr = Math.min(viewport.dpr, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(viewport.width, viewport.height, false);
    this.material.uniforms.uViewAspect.value = viewport.width / Math.max(1, viewport.height);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    this.texture?.dispose();
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
