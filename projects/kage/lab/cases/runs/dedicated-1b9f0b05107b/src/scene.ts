import * as THREE from "three";
import type { DirectedState } from "./director";

interface ViewportShape {
  width: number;
  height: number;
  dpr: number;
}

type QualityName = "low" | "balanced" | "high";

export class RainRecorderScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly world = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  private readonly subject = new THREE.Group();
  private readonly fallbackSubject = new THREE.Group();
  private subjectPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  private readonly generatedTextures: THREE.Texture[] = [];
  private readonly rain = new THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>();
  private readonly waves: THREE.Mesh[] = [];
  private readonly glow: THREE.Sprite;
  private readonly statusLamp: THREE.Sprite;
  private readonly textureLoader = new THREE.TextureLoader();
  private subjectMaterial: THREE.MeshBasicMaterial | null = null;
  private subjectTexture: THREE.Texture | null = null;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly reducedMotion: boolean;
  private readonly lowQuality: boolean;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, viewport: ViewportShape, quality: QualityName, reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
    this.lowQuality = quality === "low";
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: quality !== "low", powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.world.fog = new THREE.FogExp2(0x334047, 0.105);

    this.glow = this.createGlowSprite(0xd09a62, 2.2, 0.18);
    this.glow.position.set(0, -0.22, -0.16);
    this.subject.add(this.glow);

    this.statusLamp = this.createGlowSprite(0xf0ad63, 0.18, 0);
    this.statusLamp.position.set(0.2, -0.43, 0.15);
    this.subject.add(this.statusLamp);

    this.createSupportingWorld();
    this.createSubjectFallback();
    this.loadApprovedSubject();
    this.world.add(this.subject);
    this.resize(viewport);
  }

  private trackGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private trackMaterial<T extends THREE.Material>(material: T): T {
    this.materials.push(material);
    return material;
  }

  private createGlowSprite(color: number, scale: number, opacity: number): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,255,255,0.95)");
      gradient.addColorStop(0.24, "rgba(255,255,255,0.5)");
      gradient.addColorStop(0.58, "rgba(255,255,255,0.14)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    this.generatedTextures.push(texture);
    const material = this.trackMaterial(new THREE.SpriteMaterial({ map: texture, color, transparent: true, opacity, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale, scale, 1);
    sprite.renderOrder = 12;
    return sprite;
  }

  private createSupportingWorld(): void {
    const count = this.lowQuality ? 36 : 86;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const seed = index * 69.137;
      positions[index * 3] = ((seed * 0.73) % 7) - 3.5;
      positions[index * 3 + 1] = ((seed * 1.31) % 5.4) - 1.7;
      positions[index * 3 + 2] = -0.7 - ((seed * 0.41) % 2.8);
    }
    const rainGeometry = this.trackGeometry(new THREE.BufferGeometry());
    rainGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const rainMaterial = this.trackMaterial(new THREE.PointsMaterial({ color: 0xd8e0df, size: this.lowQuality ? 0.025 : 0.035, transparent: true, opacity: 0.42, depthWrite: false }));
    this.rain.geometry = rainGeometry;
    this.rain.material = rainMaterial;
    this.world.add(this.rain);

    for (let index = 0; index < 3; index += 1) {
      const geometry = this.trackGeometry(new THREE.RingGeometry(0.48 + index * 0.25, 0.488 + index * 0.25, 72));
      const material = this.trackMaterial(new THREE.MeshBasicMaterial({ color: 0xcdd8d7, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      const wave = new THREE.Mesh(geometry, material);
      wave.position.set(0, 0.18, -0.08 - index * 0.02);
      this.waves.push(wave);
      this.subject.add(wave);
    }
  }

  private createSubjectFallback(): void {
    const baseGeometry = this.trackGeometry(new THREE.CapsuleGeometry(0.72, 0.3, 6, 32));
    const baseMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({ color: 0xb5aaa0, roughness: 0.9, metalness: 0.02 }));
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.scale.set(1.15, 0.34, 0.44);
    base.position.y = -0.52;
    this.fallbackSubject.add(base);

    const membraneGeometry = this.trackGeometry(new THREE.CircleGeometry(0.74, 72));
    const membraneMaterial = this.trackMaterial(new THREE.MeshPhysicalMaterial({ color: 0xdce4e1, transparent: true, opacity: 0.28, transmission: 0.65, roughness: 0.2, side: THREE.DoubleSide }));
    const membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
    membrane.position.set(0, 0.16, 0);
    this.fallbackSubject.add(membrane);
    this.subject.add(this.fallbackSubject);

    const light = new THREE.HemisphereLight(0xe7ece8, 0x473c34, 1.6);
    this.world.add(light);
  }

  private loadApprovedSubject(): void {
    this.textureLoader.setCrossOrigin("anonymous");
    this.textureLoader.load(
      "/creative-assets/rain-memory-recorder-v1.png",
      (texture: THREE.Texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        const image = texture.image as { width?: number; height?: number };
        const width = typeof image.width === "number" && image.width > 0 ? image.width : 1;
        const height = typeof image.height === "number" && image.height > 0 ? image.height : 1;
        const aspect = width / height;
        const visualHeight = 2.9;
        const geometry = this.trackGeometry(new THREE.PlaneGeometry(visualHeight * aspect, visualHeight));
        const material = this.trackMaterial(new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.015, depthTest: false, depthWrite: false, toneMapped: false }));
        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(0, -0.03, 0.34);
        plane.renderOrder = 20;
        plane.scale.setScalar(this.camera.aspect < 0.72 ? 0.64 : 1);
        this.subject.add(plane);
        this.fallbackSubject.visible = false;
        this.subjectPlane = plane;
        this.subjectTexture = texture;
        this.subjectMaterial = material;
      },
      undefined,
      () => {
        this.subjectTexture = null;
        this.subjectMaterial = null;
      }
    );
  }

  render(state: DirectedState, delta: number): void {
    const safeDelta = Math.min(delta, 0.05);
    this.camera.position.set(state.cameraX + state.pointerParallaxX, state.cameraY + state.pointerParallaxY, state.cameraZ);
    this.camera.lookAt(0, state.lookY, 0);
    const narrowViewport = this.camera.aspect < 0.72;
    this.subject.position.set(narrowViewport ? state.subjectX * 0.12 : state.subjectX, narrowViewport ? state.subjectY - 0.42 : state.subjectY, 0);
    this.subject.scale.setScalar(state.subjectScale);

    const vibration = this.reducedMotion ? 0 : Math.sin(state.elapsed * 18) * 0.014 * state.membranePulse;
    this.subject.rotation.x += (vibration - this.subject.rotation.x) * Math.min(1, safeDelta * 9);

    this.rain.material.opacity = 0.08 + state.rainActivity * 0.4;
    if (!this.reducedMotion) this.rain.position.y = -((state.elapsed * 0.34) % 0.7);

    for (let index = 0; index < this.waves.length; index += 1) {
      const wave = this.waves[index];
      const material = wave.material as THREE.MeshBasicMaterial;
      const offset = index * 0.16;
      const cycle = Math.max(0, Math.min(1, state.waveExpansion * 1.45 - offset));
      wave.scale.setScalar(0.72 + cycle * 0.72);
      material.opacity = state.membranePulse * Math.sin(cycle * Math.PI) * 0.19;
    }

    (this.glow.material as THREE.SpriteMaterial).opacity = state.chamberGlow * 0.34;
    (this.statusLamp.material as THREE.SpriteMaterial).opacity = state.recordLight * 0.95;
    this.renderer.render(this.world, this.camera);
  }

  resize(viewport: ViewportShape): void {
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.subjectPlane?.scale.setScalar(this.camera.aspect < 0.72 ? 0.64 : 1);
    this.renderer.setPixelRatio(Math.min(viewport.dpr, this.lowQuality ? 1.25 : 2));
    this.renderer.setSize(width, height, false);
  }

  dispose(): void {
    this.disposed = true;
    this.subjectTexture?.dispose();
    for (const texture of this.generatedTextures) texture.dispose();
    this.subjectPlane = null;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.world.clear();
  }
}
