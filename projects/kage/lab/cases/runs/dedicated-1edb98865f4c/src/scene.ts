import * as THREE from "three";
import type { DirectedState } from "./director";

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dpr: number;
  quality: string;
  reducedMotion: boolean;
}

interface DisposableMaterial extends THREE.Material {
  map?: THREE.Texture | null;
}

const PRODUCT_URI = "/creative-assets/acoustic-resonance-instrument-v1.png";

export class AcousticScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  private readonly root = new THREE.Group();
  private readonly productGroup = new THREE.Group();
  private readonly productMaterial: THREE.MeshBasicMaterial;
  private readonly productPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly fallback: THREE.Group;
  private readonly rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly shards: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly signal: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private productTexture: THREE.Texture | null = null;
  private textureRequest: THREE.Texture | null = null;
  private assetReady = false;
  private disposed = false;
  private viewportWidth = 1;
  private viewportHeight = 1;
  private mobile = false;

  public constructor(options: SceneOptions) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      alpha: true,
      antialias: options.quality !== "low",
      powerPreference: options.quality === "low" ? "low-power" : "high-performance",
    });
    this.renderer.setClearColor(0x071017, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.fog = new THREE.FogExp2(0x071017, 0.075);
    this.scene.add(this.root);

    this.productMaterial = new THREE.MeshBasicMaterial({
      color: 0xf1fbfc,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.productPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.productMaterial);
    this.productPlane.renderOrder = 4;
    this.productGroup.add(this.productPlane);
    this.root.add(this.productGroup);

    this.fallback = this.createFallback();
    this.productGroup.add(this.fallback);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x75d9ef,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let index = 0; index < 5; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.05 + index * 0.34, 1.065 + index * 0.34, 96),
        ringMaterial.clone(),
      );
      ring.position.set(0.44, -0.04, -0.18 - index * 0.045);
      ring.rotation.y = -0.16;
      this.rings.push(ring);
      this.root.add(ring);
    }

    const shardMaterial = new THREE.MeshBasicMaterial({
      color: 0x9bdae5,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let index = 0; index < 9; index += 1) {
      const shard = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.72 + (index % 3) * 0.28), shardMaterial.clone());
      const angle = (index / 9) * Math.PI * 2;
      shard.position.set(Math.cos(angle) * 2.25 + 0.4, Math.sin(angle) * 1.42, -0.5);
      shard.rotation.z = angle;
      this.shards.push(shard);
      this.root.add(shard);
    }

    const signalPositions: number[] = [];
    const segmentCount = options.quality === "low" ? 34 : 70;
    for (let index = 0; index < segmentCount; index += 1) {
      const x = -3.4 + (index / segmentCount) * 6.8;
      const nextX = -3.4 + ((index + 1) / segmentCount) * 6.8;
      signalPositions.push(x, 0, -0.7, nextX, 0, -0.7);
    }
    const signalGeometry = new THREE.BufferGeometry();
    signalGeometry.setAttribute("position", new THREE.Float32BufferAttribute(signalPositions, 3));
    this.signal = new THREE.LineSegments(
      signalGeometry,
      new THREE.LineBasicMaterial({ color: 0x80e7f4, transparent: true, opacity: 0 }),
    );
    this.root.add(this.signal);

    this.loadProductTexture();
    this.resize(options.width, options.height, options.dpr, options.quality);
  }

  private createFallback(): THREE.Group {
    const group = new THREE.Group();
    const wire = new THREE.MeshBasicMaterial({ color: 0xa9d9e2, wireframe: true, transparent: true, opacity: 0.32 });
    const glow = new THREE.MeshBasicMaterial({ color: 0x77d9eb, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending });
    const body = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.045, 10, 80), wire);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 2), glow);
    const membrane = new THREE.Mesh(new THREE.CircleGeometry(0.76, 72), new THREE.MeshBasicMaterial({ color: 0xbceaf0, transparent: true, opacity: 0.06, side: THREE.DoubleSide }));
    membrane.position.z = -0.03;
    group.add(body, core, membrane);
    return group;
  }

  private loadProductTexture(): void {
    const loader = new THREE.TextureLoader();
    this.textureRequest = loader.load(
      PRODUCT_URI,
      (texture: THREE.Texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        const image = texture.image as { width?: number; height?: number };
        const aspect = (image.width ?? 1) / Math.max(1, image.height ?? 1);
        const displayHeight = 3.82;
        this.productPlane.scale.set(displayHeight * aspect, displayHeight, 1);
        this.productMaterial.map = texture;
        this.productMaterial.needsUpdate = true;
        this.productTexture = texture;
        this.assetReady = true;
        this.fallback.visible = false;
      },
      undefined,
      () => {
        this.assetReady = false;
        this.fallback.visible = true;
      },
    );
  }

  public update(state: DirectedState, elapsed: number): void {
    this.camera.position.copy(state.cameraPosition);
    this.camera.lookAt(state.cameraTarget);

    const revealOpacity = 0.3 + state.reveal * 0.7;
    this.productMaterial.opacity = this.assetReady ? revealOpacity : 0;
    this.fallback.visible = !this.assetReady;
    this.fallback.scale.setScalar(0.88 + state.reveal * 0.18);
    this.fallback.rotation.z = state.resolve * 0.08;

    for (let index = 0; index < this.shards.length; index += 1) {
      const shard = this.shards[index];
      const angle = (index / this.shards.length) * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(2.6, 1.62, state.assembly);
      shard.position.x = 0.42 + Math.cos(angle) * radius;
      shard.position.y = Math.sin(angle) * radius * 0.65;
      shard.rotation.z = THREE.MathUtils.lerp(angle + 0.8, angle + Math.PI * 0.5, state.assembly);
      shard.scale.y = 0.65 + state.assembly * 0.55;
      shard.material.opacity = (0.05 + state.assembly * 0.17) * (1 - state.resolve * 0.72);
    }

    for (let index = 0; index < this.rings.length; index += 1) {
      const ring = this.rings[index];
      const phase = state.resolve > 0.82 ? 0 : Math.sin(elapsed * 0.72 - index * 0.6) * 0.035 * state.membrane;
      ring.scale.setScalar(0.84 + state.membrane * index * 0.07 + phase);
      ring.material.opacity = (0.035 + state.membrane * 0.11) * (1 - state.resolve * 0.58);
      ring.rotation.z = (index % 2 === 0 ? 1 : -1) * state.assembly * 0.06;
    }

    const positions = this.signal.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const envelope = Math.exp(-Math.abs(x) * 0.34);
      const wave = Math.sin(x * 4.7 - elapsed * 1.55) * 0.16 * envelope * state.signal * (1 - state.resolve);
      positions.setY(index, wave - 1.18 + state.signal * 0.3);
    }
    positions.needsUpdate = true;
    this.signal.material.opacity = state.signal * (1 - state.resolve) * 0.48;

    const openingX = this.mobile ? 0.7 : 1.0;
    const revealedX = this.mobile ? 0.34 : 0.54;
    const finalShift = this.mobile ? -0.12 : -0.42;
    this.productGroup.position.x = THREE.MathUtils.lerp(openingX, revealedX, state.reveal) + state.resolve * finalShift;
    this.productGroup.position.y = this.mobile ? -0.28 + state.resolve * 0.18 : -0.05;
    this.productGroup.rotation.y = THREE.MathUtils.lerp(-0.19, 0, state.resolve);
    this.root.position.x = state.pointerDriftX * 0.3;
    this.root.position.y = state.pointerDriftY * 0.18;
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number, dpr: number, quality: string): void {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    this.mobile = this.viewportWidth < 650;
    const dprLimit = quality === "low" ? 1 : quality === "balanced" ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(dpr, dprLimit));
    this.renderer.setSize(this.viewportWidth, this.viewportHeight, false);
    this.camera.aspect = this.viewportWidth / this.viewportHeight;
    this.camera.fov = this.mobile ? 39 : 34;
    this.camera.updateProjectionMatrix();
    this.root.scale.setScalar(this.mobile ? 0.92 : 1);
  }

  public dispose(): void {
    this.disposed = true;
    if (this.textureRequest !== null && this.textureRequest !== this.productTexture) this.textureRequest.dispose();
    if (this.productTexture !== null) this.productTexture.dispose();
    this.scene.traverse((object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry instanceof THREE.BufferGeometry) mesh.geometry.dispose();
      const materialValue = mesh.material as THREE.Material | THREE.Material[] | undefined;
      const materials = Array.isArray(materialValue) ? materialValue : materialValue ? [materialValue] : [];
      for (const material of materials) {
        const disposable = material as DisposableMaterial;
        if (disposable.map !== null && disposable.map !== undefined && disposable.map !== this.productTexture) disposable.map.dispose();
        material.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
