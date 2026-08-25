import * as THREE from 'three';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const VARIANT_ROLES = Object.freeze(['shell', 'frame', 'panel', 'accent', 'core']);

export const NOVA_FIELD_NODE_VARIANTS = Object.freeze([
  Object.freeze({
    id: 'reactor-cyan',
    label: '反应堆青',
    description: '冷青能源核心与深石墨框架。',
    palette: Object.freeze({
      shell: 0x2c383d,
      frame: 0x11181b,
      panel: 0x405158,
      accent: 0x66e3eb,
      core: 0x9cf7ff,
    }),
  }),
  Object.freeze({
    id: 'hazard-amber',
    label: '警戒琥珀',
    description: '用于临时能源和危险区域的高识别配色。',
    palette: Object.freeze({
      shell: 0x4a3524,
      frame: 0x181512,
      panel: 0x6c4e2b,
      accent: 0xffb348,
      core: 0xffdda0,
    }),
  }),
  Object.freeze({
    id: 'polar-white',
    label: '极地白',
    description: '冷白外壳与青蓝核心，强调洁净能源语义。',
    palette: Object.freeze({
      shell: 0xbac8ca,
      frame: 0x263238,
      panel: 0x687a80,
      accent: 0x43cadd,
      core: 0xd9fcff,
    }),
  }),
]);

function fingerprint(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createNovaFieldNode() {
  const root = new THREE.Group();
  root.name = 'nova-field-node';
  root.userData.subjectId = 'nova-field-node';
  root.userData.kind = 'industrial-energy-node';
  root.userData.origin = 'procedural';

  const materials = {
    shell: new THREE.MeshStandardMaterial({ color: 0x2c383d, roughness: 0.5, metalness: 0.52 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x11181b, roughness: 0.7, metalness: 0.4 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x405158, roughness: 0.38, metalness: 0.68 }),
    accent: new THREE.MeshStandardMaterial({
      color: 0x66e3eb,
      emissive: 0x1b7d87,
      emissiveIntensity: 1.45,
      roughness: 0.32,
      metalness: 0.35,
    }),
    core: new THREE.MeshPhysicalMaterial({
      color: 0x9cf7ff,
      emissive: 0x2bbccb,
      emissiveIntensity: 2.3,
      roughness: 0.1,
      metalness: 0.06,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      transmission: 0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12,
    }),
    dark: new THREE.MeshStandardMaterial({ color: 0x070b0c, roughness: 0.88, metalness: 0.12 }),
  };

  const geometries = {
    unitBeam: new THREE.CylinderGeometry(0.09, 0.11, 1, 12),
    foot: new THREE.CylinderGeometry(0.54, 0.62, 0.18, 24),
    pylon: new THREE.BoxGeometry(0.18, 1.1, 0.22),
    fin: new THREE.BoxGeometry(0.08, 0.72, 0.34),
    sensorPod: new THREE.BoxGeometry(0.48, 0.32, 0.58),
  };

  const parts = {
    structure: new THREE.Group(),
    'power-core': new THREE.Group(),
    'sensor-crown': new THREE.Group(),
    stabilizers: new THREE.Group(),
    'thermal-system': new THREE.Group(),
  };
  for (const [id, part] of Object.entries(parts)) {
    part.name = `nova-part-${id}`;
    part.userData.partId = id;
    root.add(part);
  }

  const renderables = [];
  const uniqueGeometries = new Set(Object.values(geometries));
  const uniqueMaterials = new Set(Object.values(materials));

  function addMesh(parent, name, geometry, materialRole, position, options = {}) {
    uniqueGeometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, materials[materialRole]);
    mesh.name = name;
    mesh.position.fromArray(position);
    if (options.rotation) mesh.rotation.set(...options.rotation);
    if (options.scale) mesh.scale.fromArray(options.scale);
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = options.receiveShadow !== false;
    mesh.userData.partId = parent.userData.partId || 'structure';
    mesh.userData.materialRole = materialRole;
    parent.add(mesh);
    renderables.push(mesh);
    return mesh;
  }

  function beam(parent, name, from, to, radiusScale = 1) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const mesh = addMesh(
      parent,
      name,
      geometries.unitBeam,
      'frame',
      start.clone().add(end).multiplyScalar(0.5).toArray(),
      { scale: [radiusScale, direction.length(), radiusScale] },
    );
    mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
    return mesh;
  }

  addMesh(parts.structure, 'nova-lower-base', new THREE.CylinderGeometry(1.42, 1.68, 0.34, 36), 'frame', [0, 0.28, 0]);
  addMesh(parts.structure, 'nova-upper-base', new THREE.CylinderGeometry(1.18, 1.42, 0.28, 36), 'shell', [0, 0.57, 0]);
  addMesh(parts.structure, 'nova-service-ring', new THREE.TorusGeometry(1.23, 0.075, 10, 48), 'accent', [0, 0.78, 0], {
    rotation: [Math.PI / 2, 0, 0],
    castShadow: false,
  });

  const legAngles = [Math.PI / 2, Math.PI / 2 + (Math.PI * 2) / 3, Math.PI / 2 + (Math.PI * 4) / 3];
  for (const [index, angle] of legAngles.entries()) {
    const inner = [Math.cos(angle) * 0.82, 0.55, Math.sin(angle) * 0.82];
    const outer = [Math.cos(angle) * 2.25, 0.2, Math.sin(angle) * 2.25];
    beam(parts.stabilizers, `nova-leg-${index + 1}`, inner, outer, 1.15);
  }

  const footPads = new THREE.InstancedMesh(geometries.foot, materials.shell, 3);
  footPads.name = 'nova-stabilizer-foot-pads';
  footPads.userData.partId = 'stabilizers';
  footPads.userData.materialRole = 'shell';
  const matrix = new THREE.Matrix4();
  for (const [index, angle] of legAngles.entries()) {
    matrix.makeRotationY(-angle);
    matrix.setPosition(Math.cos(angle) * 2.25, 0.11, Math.sin(angle) * 2.25);
    footPads.setMatrixAt(index, matrix);
  }
  footPads.instanceMatrix.needsUpdate = true;
  footPads.castShadow = true;
  footPads.receiveShadow = true;
  parts.stabilizers.add(footPads);
  renderables.push(footPads);

  addMesh(parts['power-core'], 'nova-core-cage', new THREE.CylinderGeometry(0.66, 0.78, 2.42, 24, 1, true), 'frame', [0, 1.86, 0]);
  addMesh(parts['power-core'], 'nova-energy-core', new THREE.CylinderGeometry(0.42, 0.5, 2.05, 28), 'core', [0, 1.86, 0], {
    castShadow: false,
  });
  addMesh(parts['power-core'], 'nova-core-cap-lower', new THREE.CylinderGeometry(0.74, 0.88, 0.22, 28), 'panel', [0, 0.79, 0]);
  addMesh(parts['power-core'], 'nova-core-cap-upper', new THREE.CylinderGeometry(0.78, 0.68, 0.22, 28), 'panel', [0, 2.95, 0]);
  addMesh(parts['power-core'], 'nova-core-ring-a', new THREE.TorusGeometry(0.62, 0.055, 8, 36), 'accent', [0, 1.28, 0], {
    rotation: [Math.PI / 2, 0, 0],
    castShadow: false,
  });
  addMesh(parts['power-core'], 'nova-core-ring-b', new THREE.TorusGeometry(0.62, 0.055, 8, 36), 'accent', [0, 2.44, 0], {
    rotation: [Math.PI / 2, 0, 0],
    castShadow: false,
  });

  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2;
    const pylon = addMesh(
      parts.structure,
      `nova-pylon-${index + 1}`,
      geometries.pylon,
      'shell',
      [Math.cos(angle) * 0.94, 1.37, Math.sin(angle) * 0.94],
    );
    pylon.rotation.y = -angle;
  }

  const thermalFins = new THREE.InstancedMesh(geometries.fin, materials.panel, 9);
  thermalFins.name = 'nova-thermal-fins';
  thermalFins.userData.partId = 'thermal-system';
  thermalFins.userData.materialRole = 'panel';
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2;
    matrix.makeRotationY(-angle);
    matrix.setPosition(Math.cos(angle) * 0.88, 1.86, Math.sin(angle) * 0.88);
    thermalFins.setMatrixAt(index, matrix);
  }
  thermalFins.instanceMatrix.needsUpdate = true;
  thermalFins.castShadow = true;
  thermalFins.receiveShadow = true;
  parts['thermal-system'].add(thermalFins);
  renderables.push(thermalFins);

  addMesh(parts['sensor-crown'], 'nova-crown-bearing', new THREE.CylinderGeometry(0.5, 0.62, 0.25, 24), 'frame', [0, 3.18, 0]);
  addMesh(parts['sensor-crown'], 'nova-crown-ring', new THREE.TorusGeometry(1.08, 0.09, 10, 48), 'accent', [0, 3.44, 0], {
    rotation: [Math.PI / 2, 0, 0],
    castShadow: false,
  });
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2;
    const pod = addMesh(
      parts['sensor-crown'],
      `nova-sensor-pod-${index + 1}`,
      geometries.sensorPod,
      index === 0 ? 'accent' : 'shell',
      [Math.cos(angle) * 1.08, 3.44, Math.sin(angle) * 1.08],
    );
    pod.rotation.y = -angle;
    addMesh(
      parts['sensor-crown'],
      `nova-sensor-lens-${index + 1}`,
      new THREE.CylinderGeometry(0.13, 0.13, 0.08, 20),
      'core',
      [Math.cos(angle) * 1.39, 3.44, Math.sin(angle) * 1.39],
      { rotation: [Math.PI / 2, 0, -angle], castShadow: false },
    );
  }
  addMesh(parts['sensor-crown'], 'nova-scan-beacon', new THREE.CylinderGeometry(0.16, 0.22, 0.48, 20), 'accent', [0, 3.83, 0]);

  const sockets = {
    'sensor-crown': new THREE.Object3D(),
    'power-core': new THREE.Object3D(),
    stabilizers: new THREE.Object3D(),
  };
  sockets['sensor-crown'].name = 'nova-socket-sensor-crown';
  sockets['sensor-crown'].position.set(1.36, 3.55, 0.24);
  parts['sensor-crown'].add(sockets['sensor-crown']);
  sockets['power-core'].name = 'nova-socket-power-core';
  sockets['power-core'].position.set(0.62, 1.86, 0.2);
  parts['power-core'].add(sockets['power-core']);
  sockets.stabilizers.name = 'nova-socket-stabilizers';
  sockets.stabilizers.position.set(2.28, 0.28, 0.1);
  parts.stabilizers.add(sockets.stabilizers);

  let selectedVariantId = NOVA_FIELD_NODE_VARIANTS[0].id;

  function getMaterialFingerprint() {
    const signature = VARIANT_ROLES.map((role) => {
      const entry = materials[role];
      return `${role}:${entry.color.getHexString()}:${entry.roughness.toFixed(3)}:${entry.metalness.toFixed(3)}`;
    }).join('|');
    return fingerprint(signature);
  }

  function applyMaterialVariant(id) {
    const variant = NOVA_FIELD_NODE_VARIANTS.find((entry) => entry.id === id);
    if (!variant) throw new Error(`Unknown Nova material variant: ${id}`);
    for (const role of VARIANT_ROLES) {
      materials[role].color.setHex(variant.palette[role]);
      materials[role].needsUpdate = true;
    }
    selectedVariantId = variant.id;
    return getMaterialFingerprint();
  }

  const materialVariants = Object.freeze(NOVA_FIELD_NODE_VARIANTS.map((variant) => Object.freeze({
    id: variant.id,
    label: variant.label,
    description: variant.description,
    targets: VARIANT_ROLES,
  })));

  const manifest = Object.freeze({
    version: 1,
    id: 'nova-field-node',
    kind: 'industrial-energy-node',
    origin: 'procedural',
    qualityClaim: 'Prototype / L2 — procedural presentation asset; not a commercial production model',
    sourceModule: 'showcase/nova-field-node-asset.js',
    externalModelCount: 0,
    generatedMeshCount: renderables.length,
    instanceCount: 12,
    meshFingerprint: fingerprint(renderables.map((entry) => `${entry.name}:${entry.userData.partId}`).sort().join('|')),
    partIds: Object.freeze(Object.keys(parts)),
    sockets: Object.freeze(Object.keys(sockets)),
    materialVariantIds: Object.freeze(materialVariants.map((variant) => variant.id)),
    animationIds: Object.freeze(['sensor-crown-rotation', 'core-pulse']),
  });
  root.userData.manifest = manifest;

  function update(elapsedSeconds, deltaSeconds, reducedMotion = false) {
    if (!reducedMotion) parts['sensor-crown'].rotation.y += deltaSeconds * 0.22;
    materials.core.emissiveIntensity = reducedMotion
      ? 2.1
      : 2.1 + Math.sin(elapsedSeconds * 2.2) * 0.34;
  }

  let disposed = false;
  function dispose() {
    if (disposed) return false;
    disposed = true;
    for (const geometry of uniqueGeometries) geometry.dispose();
    for (const material of uniqueMaterials) material.dispose();
    root.clear();
    return true;
  }

  applyMaterialVariant(selectedVariantId);

  return Object.freeze({
    root,
    parts: Object.freeze(parts),
    sockets: Object.freeze(sockets),
    meshes: Object.freeze(renderables),
    materials: Object.freeze(materials),
    materialVariants,
    manifest,
    applyMaterialVariant,
    getMaterialFingerprint,
    update,
    get selectedVariantId() { return selectedVariantId; },
    dispose,
  });
}
