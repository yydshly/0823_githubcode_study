import * as THREE from 'three';

export const NEUTRAL_INSPECTION_SCENE_PROFILE = Object.freeze({
  id: 'neutral-inspection-world-none',
  kind: 'scene',
  world: 'none',
  status: 'proven',
  externalAssetCount: 0,
  textureCount: 0,
  capabilities: Object.freeze([
    'independent-renderer',
    'inspection-light-rig',
    'contact-platform',
    'responsive-quality-tier',
  ]),
});

export function createNeutralInspectionScene(renderer) {
  const scene = new THREE.Scene();
  scene.name = 'cot-neutral-inspection-scene';
  scene.background = new THREE.Color(0x071014);
  scene.fog = new THREE.Fog(0x071014, 16, 38);

  const root = new THREE.Group();
  root.name = 'neutral-inspection-stage';
  scene.add(root);

  const resources = new Set();
  const remember = (...items) => items.forEach((item) => resources.add(item));
  const material = (options) => {
    const value = new THREE.MeshStandardMaterial(options);
    remember(value);
    return value;
  };
  const stageDark = material({ color: 0x111b1f, roughness: 0.74, metalness: 0.32 });
  const stageMetal = material({ color: 0x334247, roughness: 0.38, metalness: 0.72 });
  const cyan = material({ color: 0x5ddde8, emissive: 0x1b8792, emissiveIntensity: 1.8, roughness: 0.3 });
  const amber = material({ color: 0xf2a642, emissive: 0x8d490a, emissiveIntensity: 1.15, roughness: 0.35 });

  const addMesh = (geometry, meshMaterial, position, options = {}) => {
    remember(geometry);
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.position.fromArray(position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    mesh.castShadow = Boolean(options.castShadow);
    mesh.receiveShadow = options.receiveShadow !== false;
    root.add(mesh);
    return mesh;
  };

  addMesh(new THREE.CylinderGeometry(6.35, 6.8, 0.38, 72), stageDark, [0, -0.2, 0]);
  addMesh(new THREE.CylinderGeometry(5.55, 5.9, 0.13, 72), stageMetal, [0, 0.035, 0]);
  const inset = addMesh(new THREE.CylinderGeometry(4.8, 4.8, 0.08, 72), stageDark, [0, 0.14, 0]);
  inset.receiveShadow = true;

  const ringGeometry = new THREE.TorusGeometry(5.12, 0.035, 8, 96);
  const ring = addMesh(ringGeometry, cyan, [0, 0.225, 0], { rotation: [Math.PI / 2, 0, 0] });
  ring.name = 'stage-status-ring';

  const grid = new THREE.GridHelper(28, 28, 0x2c7880, 0x193238);
  grid.position.y = -0.405;
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (const gridMaterial of gridMaterials) {
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.32;
    gridMaterial.depthWrite = false;
    remember(gridMaterial);
  }
  remember(grid.geometry);
  root.add(grid);

  for (const side of [-1, 1]) {
    addMesh(new THREE.BoxGeometry(0.12, 7.4, 0.12), stageMetal, [side * 8.25, 3.1, -5.3]);
    addMesh(new THREE.BoxGeometry(1.55, 0.07, 0.12), cyan, [side * 7.55, 6.75, -5.3]);
    for (let index = 0; index < 3; index += 1) {
      addMesh(
        new THREE.BoxGeometry(1.85, 0.035, 0.08),
        index === 0 ? amber : cyan,
        [side * 7.35, 5.35 - index * 0.28, -5.35],
      );
    }
  }

  const haloGeometry = new THREE.TorusGeometry(4.6, 0.045, 8, 96, Math.PI * 1.38);
  const halo = addMesh(haloGeometry, cyan, [0, 3.2, -5.4], { rotation: [0, 0, -0.59] });
  halo.name = 'inspection-halo';

  const hemi = new THREE.HemisphereLight(0xa8e7f2, 0x101114, 1.35);
  scene.add(hemi);
  const key = new THREE.SpotLight(0xe8fbff, 92, 32, Math.PI / 5.3, 0.45, 1.25);
  key.position.set(7.5, 10.5, 8.5);
  key.target.position.set(0, 1.2, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.bias = -0.00025;
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0x46d9ef, 62, 28, Math.PI / 4.4, 0.62, 1.4);
  rim.position.set(-8, 6.5, -7);
  rim.target.position.set(0, 1.8, 0);
  scene.add(rim, rim.target);
  const fill = new THREE.DirectionalLight(0xffc47a, 1.65);
  fill.position.set(-5, 4, 6);
  scene.add(fill);

  const dustGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(150 * 3);
  for (let index = 0; index < 150; index += 1) {
    const radius = 7 + (index % 17) * 0.45;
    const angle = index * 2.399963;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = 0.4 + ((index * 37) % 100) / 13;
    positions[index * 3 + 2] = Math.sin(angle) * radius - 1.5;
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: 0x7fe0e6,
    size: 0.025,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  remember(dustGeometry, dustMaterial);
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.name = 'ambient-points';
  root.add(dust);

  function update(elapsedSeconds, reducedMotion = false) {
    if (reducedMotion) return;
    dust.rotation.y = elapsedSeconds * 0.018;
    ring.material.emissiveIntensity = 1.6 + Math.sin(elapsedSeconds * 1.4) * 0.22;
    halo.rotation.z = -0.59 + Math.sin(elapsedSeconds * 0.22) * 0.055;
  }

  function setQuality(tier) {
    const high = tier === 'high';
    renderer.shadowMap.enabled = high;
    key.castShadow = high;
    key.shadow.mapSize.set(high ? 1536 : 512, high ? 1536 : 512);
    key.shadow.needsUpdate = true;
    dust.visible = high;
  }

  function dispose() {
    scene.remove(root, hemi, key, key.target, rim, rim.target, fill);
    for (const resource of resources) resource.dispose?.();
    root.clear();
  }

  return Object.freeze({
    scene,
    root,
    subjectRoot: inset,
    profile: NEUTRAL_INSPECTION_SCENE_PROFILE,
    update,
    setQuality,
    dispose,
  });
}
