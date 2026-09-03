import * as THREE from 'three';
import type { DirectedState } from './director';

type Viewport = { width: number; height: number; dpr: number };

function radialTexture(rgb: string): THREE.CanvasTexture {
  const source = document.createElement('canvas');
  source.width = 256;
  source.height = 256;
  const context = source.getContext('2d')!;
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 126);
  gradient.addColorStop(0, `rgba(${rgb},1)`);
  gradient.addColorStop(0.48, `rgba(${rgb},.5)`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(source);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class CoolingScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  private imageTexture: THREE.Texture;
  private imageMaterial: THREE.MeshBasicMaterial;
  private imagePlane: THREE.Mesh;
  private imageAspect = 16 / 9;
  private viewportAspect = 16 / 9;
  private shadeTexture = radialTexture('21,41,25');
  private wetTexture = radialTexture('104,150,150');
  private heatTexture = radialTexture('247,205,126');
  private shade: THREE.Sprite;
  private wet: THREE.Sprite;
  private heat: THREE.Sprite;

  constructor(canvas: HTMLCanvasElement, viewport: Viewport, quality: 'low' | 'balanced' | 'high') {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: quality === 'high' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera.position.z = 2;

    this.imageTexture = new THREE.TextureLoader().load('/creative-assets/r82-tree-canopy/street-canopy-hero-v1.png', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.imageAspect = texture.image.width / Math.max(1, texture.image.height);
      this.updateCover();
    });
    this.imageTexture.colorSpace = THREE.SRGBColorSpace;
    this.imageMaterial = new THREE.MeshBasicMaterial({ map: this.imageTexture, color: '#ffffff' });
    this.imagePlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.imageMaterial);
    this.imagePlane.position.z = -1;
    this.scene.add(this.imagePlane);

    this.shade = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.shadeTexture, transparent: true, depthWrite: false, opacity: 0.2 }));
    this.shade.position.set(0.22, -0.62, 0);
    this.shade.scale.set(1.8, 0.7, 1);
    this.scene.add(this.shade);

    this.wet = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.wetTexture, transparent: true, depthWrite: false, opacity: 0 }));
    this.wet.position.set(0.32, -0.72, 0.1);
    this.wet.scale.set(1.25, 0.34, 1);
    this.scene.add(this.wet);

    this.heat = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.heatTexture, transparent: true, depthWrite: false, opacity: 0 }));
    this.heat.position.set(-0.45, -0.26, 0.05);
    this.heat.scale.set(1.4, 1.15, 1);
    this.scene.add(this.heat);
    this.resize(viewport);
  }

  resize(viewport: Viewport): void {
    this.viewportAspect = viewport.width / Math.max(1, viewport.height);
    this.updateCover();
    this.renderer.setPixelRatio(Math.min(viewport.dpr, 1.6));
    this.renderer.setSize(viewport.width, viewport.height, false);
  }

  private updateCover(): void {
    if (!this.imageTexture) return;
    if (this.viewportAspect > this.imageAspect) {
      const visibleHeight = this.imageAspect / this.viewportAspect;
      this.imageTexture.repeat.set(1, visibleHeight);
      this.imageTexture.offset.set(0, (1 - visibleHeight) * 0.5);
    } else {
      const visibleWidth = this.viewportAspect / this.imageAspect;
      this.imageTexture.repeat.set(visibleWidth, 1);
      this.imageTexture.offset.set((1 - visibleWidth) * 0.5, 0);
    }
    this.imageTexture.needsUpdate = true;
  }

  render(state: DirectedState, viewport: Viewport): void {
    this.resize(viewport);
    const daylight = 0.78 + (1 - Math.abs(state.time - 0.5) * 2) * 0.19;
    const brightness = Math.max(0.68, Math.min(1, daylight - state.canopy * 0.09 + state.wet * 0.025));
    this.imageMaterial.color.setRGB(brightness * 0.98, brightness, brightness * 0.94);
    this.shade.position.x = 0.18 - state.time * 0.08 + state.breeze;
    this.shade.scale.set(1.35 + state.canopy * 0.72, 0.42 + state.canopy * 0.36, 1);
    (this.shade.material as THREE.SpriteMaterial).opacity = 0.08 + state.canopy * 0.25;
    (this.wet.material as THREE.SpriteMaterial).opacity = state.wet * 0.34;
    this.wet.scale.set(1.05 + state.wet * 0.45, 0.26 + state.wet * 0.16, 1);
    (this.heat.material as THREE.SpriteMaterial).opacity = state.heat * 0.13;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    [this.shade, this.wet, this.heat].forEach((sprite) => (sprite.material as THREE.SpriteMaterial).dispose());
    this.shadeTexture.dispose();
    this.wetTexture.dispose();
    this.heatTexture.dispose();
    this.imagePlane.geometry.dispose();
    this.imageMaterial.dispose();
    this.imageTexture.dispose();
    this.renderer.dispose();
  }
}
