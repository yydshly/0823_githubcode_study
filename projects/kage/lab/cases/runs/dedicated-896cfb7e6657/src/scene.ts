import * as THREE from 'three';
import type { DirectedState } from './director';

interface Layer {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  texture: THREE.Texture | null;
}

export interface ObservatoryScene {
  resize(width: number, height: number, dpr: number): void;
  render(state: DirectedState): void;
  dispose(): void;
}

const makeLayer = (): Layer => {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  return { mesh: new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material), texture: null };
};

const coverLayer = (layer: Layer, width: number, height: number): void => {
  if (!layer.texture || !layer.texture.image) return;
  const image = layer.texture.image as { width: number; height: number };
  if (image.width <= 0 || image.height <= 0) return;
  const viewportAspect = width / height;
  const imageAspect = image.width / image.height;
  if (viewportAspect > imageAspect) layer.mesh.scale.set(1, viewportAspect / imageAspect, 1);
  else layer.mesh.scale.set(imageAspect / viewportAspect, 1, 1);
};

export const createObservatoryScene = (canvas: HTMLCanvasElement, quality: 'low' | 'balanced' | 'high'): ObservatoryScene => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x07111c, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
  camera.position.z = 3;
  const opening = makeLayer();
  const dome = makeLayer();
  const atlas = makeLayer();
  opening.mesh.position.z = 0;
  dome.mesh.position.z = 0.03;
  atlas.mesh.position.z = 0.06;
  scene.add(opening.mesh, dome.mesh, atlas.mesh);

  const fieldCount = quality === 'high' ? 220 : quality === 'balanced' ? 130 : 64;
  const positions = new Float32Array(fieldCount * 3);
  for (let i = 0; i < fieldCount; i += 1) {
    const a = i * 0.61803398875 * Math.PI * 2;
    const r = 0.15 + ((i * 37) % fieldCount) / fieldCount * 1.16;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.sin(a) * r * 0.62;
    positions[i * 3 + 2] = 0;
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starsMaterial = new THREE.PointsMaterial({ color: 0xd9e8ed, size: quality === 'low' ? 0.009 : 0.012, transparent: true, opacity: 0, depthWrite: false });
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  stars.position.z = 0.1;
  scene.add(stars);

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const load = (path: string, layer: Layer): void => {
    loader.load(path, (texture: THREE.Texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      layer.texture = texture;
      layer.mesh.material.color.set(0xffffff);
      layer.mesh.material.map = texture;
      layer.mesh.material.needsUpdate = true;
    }, undefined, () => { layer.mesh.material.color.set(0x173246); });
  };
  load('/creative-assets/observatory-approach-v1.png', opening);
  load('/creative-assets/observatory-dome-interior-v1.png', dome);
  load('/creative-assets/observatory-star-atlas-v1.png', atlas);

  let viewWidth = 1;
  let viewHeight = 1;
  return {
    resize(width: number, height: number, dpr: number): void {
      viewWidth = Math.max(1, width);
      viewHeight = Math.max(1, height);
      renderer.setPixelRatio(Math.min(dpr, quality === 'high' ? 2 : 1.5));
      renderer.setSize(viewWidth, viewHeight, false);
      coverLayer(opening, viewWidth, viewHeight);
      coverLayer(dome, viewWidth, viewHeight);
      coverLayer(atlas, viewWidth, viewHeight);
    },
    render(state: DirectedState): void {
      const midpoint = Math.min(1, state.interior / 0.78);
      opening.mesh.material.opacity = state.approach;
      dome.mesh.material.opacity = midpoint * (1 - state.atlas * 0.45);
      atlas.mesh.material.opacity = state.atlas;
      starsMaterial.opacity = state.atlas * 0.9;
      stars.rotation.z = state.telescopeTurn;
      stars.position.x = state.cameraX;
      stars.position.y = state.cameraY;
      opening.mesh.position.x = state.cameraX * -0.18;
      dome.mesh.position.x = state.cameraX * -0.08;
      atlas.mesh.position.x = state.cameraX * 0.04;
      renderer.render(scene, camera);
    },
    dispose(): void {
      scene.remove(opening.mesh, dome.mesh, atlas.mesh, stars);
      [opening, dome, atlas].forEach((layer: Layer) => {
        layer.mesh.geometry.dispose();
        layer.mesh.material.dispose();
        if (layer.texture) layer.texture.dispose();
      });
      starsGeometry.dispose();
      starsMaterial.dispose();
      renderer.dispose();
    }
  };
};
