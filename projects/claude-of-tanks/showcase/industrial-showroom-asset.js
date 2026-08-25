import * as THREE from 'three';
import {
  INDUSTRIAL_MATERIAL_VARIANTS,
  INDUSTRIAL_SHOWROOM_PROVENANCE,
  INDUSTRIAL_SHOWROOM_SUBJECT,
} from '/@cot-research/industrial-showroom-config.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const VARIANT_TARGETS = Object.freeze(['body', 'secondary', 'panel', 'accent', 'hub']);

function fingerprint(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function disposeMaterial(material, disposedTextures) {
  for (const value of Object.values(material)) {
    if (value?.isTexture && !disposedTextures.has(value)) {
      disposedTextures.add(value);
      value.dispose();
    }
  }
  material.dispose();
}

export function createAtlasInspectionRover() {
  const root = new THREE.Group();
  root.name = INDUSTRIAL_SHOWROOM_SUBJECT.rootName;
  root.userData.subjectId = INDUSTRIAL_SHOWROOM_SUBJECT.id;
  root.userData.kind = INDUSTRIAL_SHOWROOM_SUBJECT.kind;
  root.userData.origin = INDUSTRIAL_SHOWROOM_PROVENANCE.origin;

  const materials = {
    body: new THREE.MeshStandardMaterial({ color: 0x313a3e, roughness: 0.58, metalness: 0.48 }),
    secondary: new THREE.MeshStandardMaterial({ color: 0x151b1e, roughness: 0.72, metalness: 0.28 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x20282c, roughness: 0.48, metalness: 0.58 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xffa33f, roughness: 0.4, metalness: 0.42 }),
    hub: new THREE.MeshStandardMaterial({ color: 0x87969b, roughness: 0.34, metalness: 0.76 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x090c0d, roughness: 0.92, metalness: 0.02 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x30383b, roughness: 0.36, metalness: 0.82 }),
    sensorGlass: new THREE.MeshPhysicalMaterial({
      color: 0x91eaff,
      emissive: 0x174f61,
      emissiveIntensity: 1.4,
      roughness: 0.14,
      metalness: 0.08,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
    }),
    emitter: new THREE.MeshStandardMaterial({
      color: 0xc8f8ff,
      emissive: 0x37d6ff,
      emissiveIntensity: 2.1,
      roughness: 0.26,
      metalness: 0.18,
    }),
  };

  const parts = {
    chassis: new THREE.Group(),
    'sensor-system': new THREE.Group(),
    'energy-module': new THREE.Group(),
    'all-terrain-drive': new THREE.Group(),
    'safety-frame': new THREE.Group(),
    'service-bay': new THREE.Group(),
  };
  for (const [id, group] of Object.entries(parts)) {
    group.name = `atlas-part-${id}`;
    group.userData.partId = id;
    root.add(group);
  }

  const meshes = [];
  const outlineResources = [];

  function addMesh(parent, name, geometry, materialRole, position, rotation = null, options = {}) {
    const mesh = new THREE.Mesh(geometry, materials[materialRole]);
    mesh.name = name;
    mesh.position.fromArray(position);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = options.receiveShadow !== false;
    mesh.userData.partId = parent.userData.partId || 'structure';
    mesh.userData.materialRole = materialRole;
    parent.add(mesh);
    meshes.push(mesh);
    if (options.outline) {
      const edges = new THREE.EdgesGeometry(geometry, options.outlineThreshold || 32);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: options.outlineColor || 0x91a6ad,
        transparent: true,
        opacity: options.outlineOpacity ?? 0.22,
        depthWrite: false,
      });
      const line = new THREE.LineSegments(edges, lineMaterial);
      line.name = `${name}-edge-detail`;
      mesh.add(line);
      outlineResources.push(edges, lineMaterial);
    }
    return mesh;
  }

  function box(parent, name, size, position, materialRole, rotation = null, options = {}) {
    return addMesh(
      parent,
      name,
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      materialRole,
      position,
      rotation,
      options,
    );
  }

  function cylinder(parent, name, radii, height, position, materialRole, rotation = null, segments = 24, options = {}) {
    return addMesh(
      parent,
      name,
      new THREE.CylinderGeometry(radii[0], radii[1], height, segments),
      materialRole,
      position,
      rotation,
      options,
    );
  }

  function beam(parent, name, from, to, radius, materialRole) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const mesh = cylinder(
      parent,
      name,
      [radius, radius],
      direction.length(),
      start.clone().add(end).multiplyScalar(0.5).toArray(),
      materialRole,
      null,
      12,
    );
    mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
    return mesh;
  }

  // Chassis: a compact inspection platform with a deliberately non-weapon silhouette.
  box(parts.chassis, 'atlas-lower-skid', [3.15, 0.22, 3.55], [0, 0.62, 0], 'darkMetal', null, { outline: true });
  box(parts.chassis, 'atlas-main-frame', [2.85, 0.54, 3.18], [0, 0.92, -0.02], 'secondary', null, { outline: true });
  box(parts.chassis, 'atlas-upper-shell', [2.46, 0.72, 2.35], [0, 1.42, -0.22], 'body', null, { outline: true });
  box(parts.chassis, 'atlas-forward-cowl', [2.18, 0.48, 0.92], [0, 1.26, 1.25], 'body', [-0.18, 0, 0], { outline: true });
  box(parts.chassis, 'atlas-front-bumper', [3.24, 0.24, 0.3], [0, 0.67, 1.83], 'accent', null, { outline: true });
  box(parts.chassis, 'atlas-rear-bumper', [3.08, 0.22, 0.28], [0, 0.72, -1.78], 'secondary', null, { outline: true });
  box(parts.chassis, 'atlas-left-step', [0.44, 0.12, 1.25], [-1.62, 0.7, 0.1], 'darkMetal');
  box(parts.chassis, 'atlas-right-step', [0.44, 0.12, 1.25], [1.62, 0.7, 0.1], 'darkMetal');
  box(parts.chassis, 'atlas-front-light-left', [0.5, 0.18, 0.08], [-0.67, 1.42, 1.72], 'emitter');
  box(parts.chassis, 'atlas-front-light-right', [0.5, 0.18, 0.08], [0.67, 1.42, 1.72], 'emitter');
  box(parts.chassis, 'atlas-service-label', [0.82, 0.28, 0.035], [0, 1.5, 1.69], 'panel');

  // Service bay details make the top read as maintained equipment, not a turret.
  box(parts['service-bay'], 'atlas-service-deck', [1.55, 0.12, 1.15], [0.22, 1.84, -0.48], 'panel', null, { outline: true });
  for (let index = 0; index < 5; index++) {
    box(
      parts['service-bay'],
      `atlas-cooling-fin-${index + 1}`,
      [0.08, 0.28, 0.82],
      [-0.38 + index * 0.25, 2.02, -0.52],
      'darkMetal',
    );
  }
  cylinder(parts['service-bay'], 'atlas-access-cap', [0.27, 0.27], 0.09, [0.86, 1.94, -0.56], 'accent', null, 28);

  // Sensor system: mast, LiDAR ring and two optical windows.
  cylinder(parts['sensor-system'], 'atlas-sensor-mast-base', [0.34, 0.4], 0.26, [0, 1.93, 0.48], 'darkMetal', null, 24);
  cylinder(parts['sensor-system'], 'atlas-sensor-mast', [0.11, 0.13], 0.72, [0, 2.3, 0.48], 'hub', null, 18);
  box(parts['sensor-system'], 'atlas-sensor-head', [1.02, 0.44, 0.56], [0, 2.68, 0.5], 'secondary', null, { outline: true });
  cylinder(parts['sensor-system'], 'atlas-lidar-ring', [0.39, 0.39], 0.19, [0, 2.96, 0.48], 'sensorGlass', null, 36);
  cylinder(parts['sensor-system'], 'atlas-lidar-cap', [0.29, 0.35], 0.1, [0, 3.1, 0.48], 'accent', null, 28);
  cylinder(parts['sensor-system'], 'atlas-optic-left', [0.13, 0.13], 0.08, [-0.27, 2.7, 0.8], 'sensorGlass', [Math.PI / 2, 0, 0], 24);
  cylinder(parts['sensor-system'], 'atlas-optic-right', [0.13, 0.13], 0.08, [0.27, 2.7, 0.8], 'sensorGlass', [Math.PI / 2, 0, 0], 24);
  box(parts['sensor-system'], 'atlas-status-bar', [0.5, 0.07, 0.035], [0, 2.53, 0.805], 'emitter');

  // Energy module: side-draw enclosure, segmented cells and passive cooling fins.
  box(parts['energy-module'], 'atlas-energy-carrier', [0.42, 0.94, 1.74], [-1.42, 1.31, -0.42], 'panel', null, { outline: true });
  for (let index = 0; index < 3; index++) {
    box(
      parts['energy-module'],
      `atlas-energy-cell-${index + 1}`,
      [0.11, 0.64, 0.42],
      [-1.66, 1.32, -0.96 + index * 0.55],
      index === 1 ? 'accent' : 'secondary',
      null,
      { outline: true, outlineOpacity: 0.18 },
    );
  }
  for (let index = 0; index < 6; index++) {
    box(
      parts['energy-module'],
      `atlas-energy-fin-${index + 1}`,
      [0.07, 0.52, 0.16],
      [-1.72, 1.38, -1.08 + index * 0.28],
      'darkMetal',
    );
  }
  box(parts['energy-module'], 'atlas-energy-indicator', [0.035, 0.12, 0.72], [-1.73, 1.67, -0.42], 'emitter');
  beam(parts['energy-module'], 'atlas-energy-handle', [-1.7, 1.9, -0.75], [-1.7, 1.9, -0.08], 0.045, 'hub');

  // All-terrain drive: four independent wheel stations and exposed serviceable links.
  const wheelStations = [
    [-1.58, 0.68, 1.22, 'front-left'],
    [1.58, 0.68, 1.22, 'front-right'],
    [-1.58, 0.68, -1.28, 'rear-left'],
    [1.58, 0.68, -1.28, 'rear-right'],
  ];
  for (const [x, y, z, id] of wheelStations) {
    cylinder(parts['all-terrain-drive'], `atlas-wheel-${id}`, [0.66, 0.66], 0.48, [x, y, z], 'rubber', [0, 0, Math.PI / 2], 28, { outline: true, outlineOpacity: 0.12 });
    cylinder(parts['all-terrain-drive'], `atlas-hub-${id}`, [0.31, 0.31], 0.51, [x, y, z], 'hub', [0, 0, Math.PI / 2], 24, { outline: true });
    const outerX = x + Math.sign(x) * 0.27;
    cylinder(parts['all-terrain-drive'], `atlas-hub-cap-${id}`, [0.16, 0.2], 0.06, [outerX, y, z], 'accent', [0, 0, Math.PI / 2], 20);
    beam(parts['all-terrain-drive'], `atlas-suspension-${id}`, [Math.sign(x) * 1.08, 0.96, z], [x, y, z], 0.1, 'darkMetal');
  }
  box(parts['all-terrain-drive'], 'atlas-drive-guard-left', [0.16, 0.23, 1.1], [-1.46, 1.05, -0.02], 'secondary');
  box(parts['all-terrain-drive'], 'atlas-drive-guard-right', [0.16, 0.23, 1.1], [1.46, 1.05, -0.02], 'secondary');

  // A low safety frame protects service hardware while keeping the sensor head dominant.
  beam(parts['safety-frame'], 'atlas-rail-left', [-1.15, 1.8, -1.35], [-1.15, 2.12, -0.88], 0.045, 'accent');
  beam(parts['safety-frame'], 'atlas-rail-right', [1.15, 1.8, -1.35], [1.15, 2.12, -0.88], 0.045, 'accent');
  beam(parts['safety-frame'], 'atlas-rail-cross', [-1.15, 2.12, -0.88], [1.15, 2.12, -0.88], 0.045, 'accent');

  const sockets = {
    'sensor-system': new THREE.Object3D(),
    'energy-module': new THREE.Object3D(),
    'all-terrain-drive': new THREE.Object3D(),
  };
  sockets['sensor-system'].name = 'atlas-socket-sensor-system';
  sockets['sensor-system'].position.set(0.45, 2.96, 0.72);
  parts['sensor-system'].add(sockets['sensor-system']);
  sockets['energy-module'].name = 'atlas-socket-energy-module';
  sockets['energy-module'].position.set(-1.78, 1.5, -0.42);
  parts['energy-module'].add(sockets['energy-module']);
  sockets['all-terrain-drive'].name = 'atlas-socket-all-terrain-drive';
  sockets['all-terrain-drive'].position.set(1.78, 0.75, 1.24);
  parts['all-terrain-drive'].add(sockets['all-terrain-drive']);

  let selectedVariantId = INDUSTRIAL_MATERIAL_VARIANTS[0].id;
  function applyMaterialVariant(id) {
    const variant = INDUSTRIAL_MATERIAL_VARIANTS.find((item) => item.id === id);
    if (!variant) throw new Error(`Unknown industrial material variant: ${id}`);
    for (const role of VARIANT_TARGETS) {
      materials[role].color.setHex(variant.palette[role]);
      materials[role].needsUpdate = true;
    }
    selectedVariantId = variant.id;
    return getMaterialFingerprint();
  }

  function getMaterialFingerprint() {
    const signature = VARIANT_TARGETS.map((role) => {
      const material = materials[role];
      return [
        role,
        material.color.getHexString(),
        material.roughness.toFixed(3),
        material.metalness.toFixed(3),
      ].join(':');
    }).join('|');
    return fingerprint(signature);
  }

  const meshSignature = meshes
    .map((mesh) => `${mesh.name}:${mesh.geometry.type}:${mesh.userData.partId}:${mesh.userData.materialRole}`)
    .sort()
    .join('|');
  const meshFingerprint = fingerprint(meshSignature);
  const materialVariants = Object.freeze(INDUSTRIAL_MATERIAL_VARIANTS.map((variant) => Object.freeze({
    id: variant.id,
    label: variant.label,
    description: variant.description,
    targets: VARIANT_TARGETS,
  })));
  const manifest = Object.freeze({
    version: 1,
    id: INDUSTRIAL_SHOWROOM_SUBJECT.id,
    kind: INDUSTRIAL_SHOWROOM_SUBJECT.kind,
    origin: INDUSTRIAL_SHOWROOM_PROVENANCE.origin,
    qualityClaim: INDUSTRIAL_SHOWROOM_PROVENANCE.qualityClaim,
    sourceModule: INDUSTRIAL_SHOWROOM_PROVENANCE.sourceModule,
    externalModelCount: 0,
    generatedMeshCount: meshes.length,
    meshFingerprint,
    partIds: Object.freeze(Object.keys(parts)),
    sockets: Object.freeze(Object.keys(sockets)),
    materialVariantIds: Object.freeze(materialVariants.map((variant) => variant.id)),
  });
  root.userData.manifest = manifest;

  let disposed = false;
  function dispose() {
    if (disposed) return false;
    disposed = true;
    const geometries = new Set();
    const materialSet = new Set();
    const textures = new Set();
    root.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      const entries = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of entries) if (material) materialSet.add(material);
    });
    for (const resource of outlineResources) {
      if (resource?.isBufferGeometry) geometries.add(resource);
      else if (resource?.isMaterial) materialSet.add(resource);
    }
    for (const geometry of geometries) geometry.dispose();
    for (const material of materialSet) disposeMaterial(material, textures);
    root.clear();
    return true;
  }

  applyMaterialVariant(selectedVariantId);

  return Object.freeze({
    root,
    parts: Object.freeze(parts),
    sockets: Object.freeze(sockets),
    meshes: Object.freeze(meshes),
    materials: Object.freeze(materials),
    materialVariants,
    manifest,
    applyMaterialVariant,
    getMaterialFingerprint,
    get selectedVariantId() { return selectedVariantId; },
    dispose,
  });
}
