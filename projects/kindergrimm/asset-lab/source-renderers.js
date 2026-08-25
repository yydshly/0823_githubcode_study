import * as THREE from 'three';
import { buildCharacter, ensureParams } from '../upstream/src/rig.js';
import { U } from '../upstream/src/part.js';
import { buildVoxelCharacter, ensureVParams, VX } from '../upstream/src/voxel/vrig.js';
import { buildGloss, ensureGParams } from '../upstream/src/gloss/grig.js';
import { studioEnv, makeMaterialFactory as makeGlossMaterialFactory } from '../upstream/src/gloss/gmedia.js';
import { buildPlant, ensureOParams } from '../upstream/src/obj/orig.js';
import { plantStudio, makeMaterialFactory as makePlantMaterialFactory } from '../upstream/src/obj/omedia.js';

const PAPER = 0xf6f1e5;
const EXPORT_SIZE = 768;

function clone(value) {
  return structuredClone(value);
}

function createRenderer(host, { linear = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  if (linear) renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', host.dataset.canvasLabel || 'Generated asset preview');
  host.appendChild(renderer.domElement);
  return renderer;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 编码失败。')), 'image/png');
  });
}

class SourceRenderer {
  constructor(host, options) {
    this.host = host;
    this.renderer = createRenderer(host, options);
    this.width = 0;
    this.height = 0;
    this.pixelRatio = Math.min(devicePixelRatio || 1, 2);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
  }

  resize(width = Math.max(280, this.host.clientWidth), height = Math.max(280, this.host.clientHeight), pixelRatio = this.pixelRatio) {
    this.width = width;
    this.height = height;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.updateCamera(width, height);
    this.render();
  }

  async exportPng() {
    const restore = { width: this.width, height: this.height, pixelRatio: this.pixelRatio };
    this.resize(EXPORT_SIZE, EXPORT_SIZE, 1);
    this.render();
    const blob = await canvasBlob(this.renderer.domElement);
    this.resize(restore.width, restore.height, restore.pixelRatio);
    return { blob, width: EXPORT_SIZE, height: EXPORT_SIZE };
  }
}

export class DrawnSourceRenderer extends SourceRenderer {
  constructor(host) {
    super(host, { linear: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1.28, -1.28, 0.1, 100);
    this.camera.position.set(0, -0.28, 10);
    this.camera.lookAt(0, -0.28, 0);
    this.face = null;
  }

  setRecipe(input) {
    const recipe = clone(input);
    ensureParams(recipe);
    if (this.face) {
      this.scene.remove(this.face.group);
      this.face.dispose();
    }
    this.face = buildCharacter(recipe);
    this.face.group.position.y = -0.92 + this.face.F.B.floorY / U;
    this.scene.add(this.face.group);
    this.resize();
    return {
      parts: new Set(this.face.entries.map(entry => entry.id)).size,
      planes: this.face.entries.length,
      media: recipe.media,
      species: recipe.species,
      nativeRecipe: recipe,
    };
  }

  updateCamera(width, height) {
    const aspect = width / height;
    const halfH = Math.max(1.28, 1.08 / aspect);
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.left = -halfH * aspect;
    this.camera.right = halfH * aspect;
    this.camera.updateProjectionMatrix();
  }

  render() {
    if (this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }
}

export class VoxelSourceRenderer extends SourceRenderer {
  constructor(host) {
    super(host, { linear: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 200);
    this.face = null;
    this.view = { az: 0.58, el: 0.4, halfH: 1.3, targetY: 0.9 };
  }

  setRecipe(input) {
    const recipe = clone(input);
    ensureVParams(recipe);
    if (this.face) {
      this.scene.remove(this.face.group);
      this.face.dispose();
    }
    this.face = buildVoxelCharacter(recipe);
    const stats = this.face.stats;
    this.face.group.position.z = -stats.cz * VX;
    this.scene.add(this.face.group);
    this.view.targetY = stats.height * VX * 0.52;
    this.view.halfH = Math.max(0.75, Math.max(stats.height, stats.depth * 1.1) * VX * 0.74);
    this.resize();
    return { ...stats, palette: recipe.palette, species: recipe.species, nativeRecipe: recipe };
  }

  updateCamera(width, height) {
    const aspect = width / height;
    this.camera.top = this.view.halfH;
    this.camera.bottom = -this.view.halfH;
    this.camera.left = -this.view.halfH * aspect;
    this.camera.right = this.view.halfH * aspect;
    this.camera.updateProjectionMatrix();
    const radius = 40;
    const ce = Math.cos(this.view.el);
    this.camera.position.set(
      Math.sin(this.view.az) * ce * radius,
      Math.sin(this.view.el) * radius + this.view.targetY,
      Math.cos(this.view.az) * ce * radius,
    );
    this.camera.lookAt(0, this.view.targetY, 0);
  }

  render() {
    if (this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }
}

export class GlossSourceRenderer extends SourceRenderer {
  constructor(host) {
    super(host);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
    this.materialFor = makeGlossMaterialFactory(studioEnv(this.renderer));
    this.built = null;
  }

  setRecipe(input) {
    const recipe = clone(input);
    ensureGParams(recipe);
    if (this.built) {
      this.scene.remove(this.built.group);
      this.built.group.traverse(object => object.geometry?.dispose());
    }
    this.built = buildGloss(recipe, { materialFor: this.materialFor });
    this.scene.add(this.built.group);
    this.resize();
    return {
      ...this.built.stats,
      palette: recipe.palette,
      material: recipe.material,
      species: recipe.species,
      nativeRecipe: recipe,
    };
  }

  updateCamera(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (!this.built) return;
    const { L, bounds } = this.built;
    const distance = 3.2 * Math.max(L.H, L.W, bounds.h * 0.8);
    const yaw = 0.38;
    const pitch = 0.08;
    this.camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * distance,
      L.cy + Math.sin(pitch) * distance,
      Math.cos(yaw) * Math.cos(pitch) * distance,
    );
    this.camera.lookAt(0, L.cy * 0.96, 0);
  }

  render() {
    if (this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }
}

export class ObjectSourceRenderer extends SourceRenderer {
  constructor(host) {
    super(host);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
    this.materialFor = makePlantMaterialFactory(plantStudio(this.renderer));
    this.built = null;
    this.view = { azimuth: 0.6, elevation: 0.28, distance: 3.2, targetY: 1 };
  }

  setRecipe(input) {
    const recipe = clone(input);
    ensureOParams(recipe);
    if (this.built) {
      this.scene.remove(this.built.group);
      this.built.group.traverse(object => object.geometry?.dispose());
    }
    this.built = buildPlant(recipe, { materialFor: this.materialFor });
    this.scene.add(this.built.group);
    const { bounds } = this.built;
    const span = Math.max(bounds.w, bounds.h, 0.5);
    this.view.targetY = bounds.minY + bounds.h * 0.5;
    this.view.distance = span / Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * 0.72;
    this.resize();
    return {
      ...this.built.stats,
      bounds,
      species: recipe.species,
      palette: recipe.palette,
      material: recipe.material,
      nativeRecipe: recipe,
    };
  }

  updateCamera(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const { azimuth, elevation, distance, targetY } = this.view;
    const ce = Math.cos(elevation);
    this.camera.position.set(
      Math.sin(azimuth) * ce * distance,
      targetY + Math.sin(elevation) * distance,
      Math.cos(azimuth) * ce * distance,
    );
    this.camera.lookAt(0, targetY, 0);
  }

  render() {
    if (this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }
}
export class UsageWorldRenderer extends SourceRenderer {
  constructor(host) {
    super(host, { linear: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.01, 120);
    this.world = null;
    this.voxel = null;
    this.plant = null;
    this.view = { halfH: 1.8, targetY: 1 };
    this.plantMaterialFor = makePlantMaterialFactory(plantStudio(this.renderer));
  }

  clearWorld() {
    if (this.voxel) this.voxel.dispose();
    if (this.plant) this.plant.group.traverse(object => object.geometry?.dispose());
    if (this.world) {
      this.world.traverse(object => {
        if (object.userData.usageOwned) {
          object.geometry?.dispose();
          object.material?.dispose?.();
        }
      });
      this.scene.remove(this.world);
    }
    this.world = null;
    this.voxel = null;
    this.plant = null;
  }

  setAssets(characterInput, environmentInput) {
    const started = performance.now();
    this.clearWorld();
    const characterRecipe = clone(characterInput);
    const environmentRecipe = clone(environmentInput);
    ensureVParams(characterRecipe);
    ensureOParams(environmentRecipe);

    this.world = new THREE.Group();
    this.voxel = buildVoxelCharacter(characterRecipe);
    this.voxel.group.position.set(-0.62, 0, -this.voxel.stats.cz * VX);
    this.voxel.group.rotation.y = -0.28;
    this.world.add(this.voxel.group);

    this.plant = buildPlant(environmentRecipe, { materialFor: this.plantMaterialFor });
    const characterHeight = Math.max(0.8, this.voxel.stats.height * VX);
    const plantHeight = Math.max(0.2, this.plant.bounds.h);
    const plantScale = Math.min(1.25, Math.max(0.28, characterHeight * 0.92 / plantHeight));
    this.plant.group.scale.setScalar(plantScale);
    this.plant.group.position.set(0.72, -this.plant.bounds.minY * plantScale, 0.08);
    this.plant.group.rotation.y = 0.36;
    this.world.add(this.plant.group);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1.75, 48),
      new THREE.MeshBasicMaterial({ color: 0xd7d9c9, transparent: true, opacity: 0.76, side: THREE.DoubleSide }),
    );
    ground.userData.usageOwned = true;
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.015;
    this.world.add(ground);

    const path = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 1.02, 40, 1, -0.4, 3.9),
      new THREE.MeshBasicMaterial({ color: 0xb7ab92, transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
    );
    path.userData.usageOwned = true;
    path.rotation.x = -Math.PI / 2;
    path.position.y = -0.01;
    this.world.add(path);

    this.scene.add(this.world);
    this.view.targetY = characterHeight * 0.48;
    this.view.halfH = Math.max(1.15, characterHeight * 0.86);
    this.resize();
    this.render();
    return {
      buildMs: performance.now() - started,
      voxel: { ...this.voxel.stats, recipe: characterRecipe },
      plant: { ...this.plant.stats, bounds: this.plant.bounds, recipe: environmentRecipe },
      renderer: {
        calls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        geometries: this.renderer.info.memory.geometries,
      },
      representation: 'live procedural Three.js placement',
    };
  }

  updateCamera(width, height) {
    const aspect = width / height;
    this.camera.top = this.view.halfH;
    this.camera.bottom = -this.view.halfH;
    this.camera.left = -this.view.halfH * aspect;
    this.camera.right = this.view.halfH * aspect;
    this.camera.updateProjectionMatrix();
    const radius = 35;
    const azimuth = 0.68;
    const elevation = 0.48;
    const ce = Math.cos(elevation);
    this.camera.position.set(Math.sin(azimuth) * ce * radius, this.view.targetY + Math.sin(elevation) * radius, Math.cos(azimuth) * ce * radius);
    this.camera.lookAt(0, this.view.targetY, 0);
  }

  render() {
    if (this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }
}
export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export const sourceRendererMeta = {
  drawn: { builder: 'upstream/src/rig.js · buildCharacter', representation: 'drawn 2D planes' },
  voxel: { builder: 'upstream/src/voxel/vrig.js · buildVoxelCharacter', representation: 'procedural voxel solids' },
  gloss: { builder: 'upstream/src/gloss/grig.js · buildGloss', representation: 'procedural molded solids' },
  environment: { builder: 'upstream/src/obj/orig.js · buildPlant', representation: 'procedural plant solids' },
  usageWorld: { builder: 'buildVoxelCharacter + buildPlant', representation: 'combined procedural Three.js placement' },
  paper: PAPER,
};


