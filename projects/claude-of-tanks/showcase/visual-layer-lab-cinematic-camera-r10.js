import * as THREE from 'three';

const params = new URLSearchParams(location.search);
const isCanonicalLab = params.get('showcase') === 'capabilities' && params.get('lab') === 'layers';

function installCinematicCamera() {
  const lab = window.__COT_VISUAL_LAYER_LAB;
  if (!lab?.r2 || lab.r10?.installed) return false;

  const baseSetCamera = lab.setCamera.bind(lab);
  lab.setCamera = function setCameraR10(kind) {
    if (kind !== 'cinematic') return baseSetCamera(kind);
    const actor = this.actors.find((item) => item.name === 'red-lead') || this.actors[0];
    const root = actor?.visual?.root;
    if (!actor || !root) return baseSetCamera(kind);

    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const yaw = actor.state?.yaw || 0;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const up = new THREE.Vector3(0, 1, 0);
    const scale = Math.max(size.z, size.x * 1.8, size.y * 2.5, 7.5);
    const preset = {
      pos: center.clone()
        .addScaledVector(right, scale * 1.62)
        .addScaledVector(forward, scale * 1.18)
        .addScaledVector(up, Math.max(3.1, size.y * 0.88))
        .toArray(),
      lookAt: center.clone().addScaledVector(up, size.y * 0.08).toArray(),
      fov: 40,
      mode: 'fly',
    };
    this.r2.cameraPresets.cinematic = preset;
    this.studio.setCamera(preset);
  };

  lab.r10 = {
    installed: true,
    framing: 'front-right-wide',
    fov: 40,
  };
  return true;
}

if (isCanonicalLab && !installCinematicCamera()) {
  const timer = setInterval(() => {
    if (installCinematicCamera()) clearInterval(timer);
  }, 50);
  setTimeout(() => clearInterval(timer), 30000);
}

export const VISUAL_LAYER_LAB_REFINEMENT_VERSION = 10;
