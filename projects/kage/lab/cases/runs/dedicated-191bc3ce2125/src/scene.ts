import * as THREE from "three";
import type { WindStoryState } from "./director";

interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

export interface WindScene {
  render(state: WindStoryState, delta: number): void;
  resize(viewport: Viewport): void;
  dispose(): void;
}

interface Fiber {
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  positions: Float32Array;
  rootX: number;
  length: number;
  phase: number;
}

function makeRingMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
}

export function createWindScene(
  canvas: HTMLCanvasElement,
  viewport: Viewport,
  quality: string,
  reducedMotion: boolean
): WindScene {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: quality !== "low", powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(viewport.dpr, quality === "low" ? 1.25 : 2));
  renderer.setSize(viewport.width, viewport.height, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, viewport.width / Math.max(1, viewport.height), 0.1, 30);
  camera.position.set(0, 0.08, 5.45);

  const device = new THREE.Group();
  device.position.set(0.68, -0.5, 0);
  scene.add(device);

  const ceramic = new THREE.MeshStandardMaterial({ color: 0xe6e1d5, roughness: 0.82, metalness: 0.02 });
  const copper = new THREE.MeshStandardMaterial({ color: 0x76503c, roughness: 0.58, metalness: 0.42 });
  const baseGeometry = new THREE.CylinderGeometry(0.62, 0.72, 0.2, quality === "low" ? 32 : 64);
  const base = new THREE.Mesh(baseGeometry, ceramic);
  base.position.y = -0.56;
  device.add(base);

  const arcGeometry = new THREE.TorusGeometry(0.58, 0.035, quality === "low" ? 8 : 14, quality === "low" ? 44 : 80, Math.PI * 1.52);
  const arc = new THREE.Mesh(arcGeometry, copper);
  arc.rotation.z = -Math.PI * 0.76;
  arc.position.y = 0.06;
  device.add(arc);

  const ambient = new THREE.HemisphereLight(0xeae5d8, 0x3a3731, 1.35);
  const moon = new THREE.DirectionalLight(0xf1eee4, 2.1);
  moon.position.set(-3, 4, 5);
  scene.add(ambient, moon);

  const fiberCount = quality === "low" ? 9 : 15;
  const fiberSegments = quality === "low" ? 16 : 24;
  const fibers: Fiber[] = [];
  const fiberMaterial = new THREE.LineBasicMaterial({ color: 0xcac4b7, transparent: true, opacity: 0.72 });
  for (let index = 0; index < fiberCount; index += 1) {
    const positions = new Float32Array((fiberSegments + 1) * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const line = new THREE.Line(geometry, fiberMaterial.clone());
    line.position.set(0.68, -0.38, 0.02 + (index % 3) * 0.012);
    scene.add(line);
    fibers.push({
      line,
      positions,
      rootX: -0.45 + (index / Math.max(1, fiberCount - 1)) * 0.9,
      length: 0.72 + (index % 4) * 0.045,
      phase: index * 0.61
    });
  }

  const evidenceGroup = new THREE.Group();
  evidenceGroup.position.set(-0.9, 0.18, 0.16);
  scene.add(evidenceGroup);
  const ringGeometry = new THREE.RingGeometry(0.055, 0.071, 32);
  const evidenceColors = [0xb18465, 0xd7d2c5, 0x9a765f];
  const evidence = evidenceColors.map((color, index) => {
    const ring = new THREE.Mesh(ringGeometry, makeRingMaterial(color));
    ring.position.z = index * 0.02;
    evidenceGroup.add(ring);
    return ring;
  });

  const aim = new THREE.Vector3();
  const tempColor = new THREE.Color();
  let smoothedBend = 0.08;

  function updateFibers(bend: number, elapsedDelta: number): void {
    smoothedBend += (bend - smoothedBend) * Math.min(1, elapsedDelta * (reducedMotion ? 10 : 4.5));
    for (let f = 0; f < fibers.length; f += 1) {
      const fiber = fibers[f];
      for (let point = 0; point <= fiberSegments; point += 1) {
        const t = point / fiberSegments;
        const offset = point * 3;
        fiber.positions[offset] = fiber.rootX + smoothedBend * t * t * (0.42 + f * 0.006);
        fiber.positions[offset + 1] = t * fiber.length;
        fiber.positions[offset + 2] = Math.sin(t * Math.PI + fiber.phase) * smoothedBend * 0.035 * t;
      }
      const attribute = fiber.line.geometry.getAttribute("position");
      attribute.needsUpdate = true;
    }
  }

  function updateEvidence(state: WindStoryState): void {
    for (let index = 0; index < evidence.length; index += 1) {
      const local = Math.min(1, Math.max(0, state.evidenceProgress * 1.45 - index * 0.2));
      const ring = evidence[index];
      ring.position.x = local * 2.2;
      ring.position.y = Math.sin(local * Math.PI) * (0.22 + index * 0.06) - index * 0.12;
      ring.scale.setScalar(0.78 + local * 0.34);
      const material = ring.material;
      if (Array.isArray(material)) {
        for (const item of material) {
          item.transparent = true;
          item.opacity = state.evidenceVisibility * (0.5 + local * 0.45);
        }
      } else {
        material.transparent = true;
        material.opacity = state.evidenceVisibility * (0.5 + local * 0.45);
      }
    }
  }

  return {
    render(state, delta) {
      camera.position.set(state.cameraX, state.cameraY, state.cameraZ);
      aim.set(state.lookX, -0.02, 0);
      camera.lookAt(aim);
      updateFibers(state.fiberBend, Math.max(0, Math.min(delta, 0.1)));
      updateEvidence(state);
      tempColor.setRGB(0.46 + state.copperWarmth * 0.09, 0.31 + state.copperWarmth * 0.035, 0.23);
      copper.color.copy(tempColor);
      renderer.render(scene, camera);
    },

    resize(nextViewport) {
      camera.aspect = nextViewport.width / Math.max(1, nextViewport.height);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(nextViewport.dpr, quality === "low" ? 1.25 : 2));
      renderer.setSize(nextViewport.width, nextViewport.height, false);
    },

    dispose() {
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line)) return;
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) {
          for (const item of material) item.dispose();
        } else {
          material.dispose();
        }
      });
      renderer.dispose();
    }
  };
}
