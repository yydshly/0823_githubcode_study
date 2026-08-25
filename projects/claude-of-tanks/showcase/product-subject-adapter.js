import * as THREE from 'three';

export const PRODUCT_SUBJECT_ADAPTER_VERSION = 1;

function assert(condition, message) {
  if (!condition) throw new Error('[SubjectAdapter] ' + message);
}

function materialEntries(material) {
  return (Array.isArray(material) ? material : [material]).filter(Boolean);
}

function isTransparentRenderable(object) {
  return materialEntries(object.material).some((material) => (
    material.transparent
    || material.opacity < 0.98
    || (material.transmission || 0) > 0
  ));
}

function scoreShadowCandidate(object) {
  const geometry = object.geometry;
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const radius = geometry.boundingSphere?.radius || 0;
  const instances = object.isInstancedMesh ? Math.max(1, object.count) : 1;
  return Math.pow(radius, 3) * Math.sqrt(instances);
}

function validateDefinition(definition) {
  assert(definition?.id, 'definition.id is required');
  assert(typeof definition.factory === 'function', definition.id + ' requires a factory');
  assert(definition.overview?.position?.length === 3, definition.id + ' requires an overview position');
  assert(definition.overview?.target?.length === 3, definition.id + ' requires an overview target');
  assert(Array.isArray(definition.cameraPresets), definition.id + ' cameraPresets must be an array');
  assert(Array.isArray(definition.hotspots), definition.id + ' hotspots must be an array');
}

function validateAsset(definition, asset) {
  assert(asset?.root?.isObject3D, definition.id + ' factory must return root:Object3D');
  assert(asset.parts && typeof asset.parts === 'object', definition.id + ' requires parts');
  assert(asset.sockets && typeof asset.sockets === 'object', definition.id + ' requires sockets');
  assert(asset.manifest?.id === definition.id, definition.id + ' manifest id mismatch');
  assert(Array.isArray(asset.materialVariants), definition.id + ' requires materialVariants');
  assert(typeof asset.applyMaterialVariant === 'function', definition.id + ' requires applyMaterialVariant()');
  assert(typeof asset.dispose === 'function', definition.id + ' requires dispose()');

  const cameraIds = new Set(definition.cameraPresets.map((preset) => preset.id));
  for (const hotspot of definition.hotspots) {
    assert(asset.parts[hotspot.targetPartId], definition.id + ' hotspot ' + hotspot.id + ' has no part');
    assert(asset.sockets[hotspot.socketId], definition.id + ' hotspot ' + hotspot.id + ' has no socket');
    assert(cameraIds.has(hotspot.cameraPresetId), definition.id + ' hotspot ' + hotspot.id + ' has no camera');
  }
}

export function createProductSubjectAdapter(definition, options = {}) {
  validateDefinition(definition);
  const asset = definition.factory();
  validateAsset(definition, asset);

  const root = asset.root;
  const targetHeight = options.targetHeight || definition.targetHeight || 3.2;
  const stageY = options.stageY ?? 0.22;
  root.updateMatrixWorld(true);

  const sourceBounds = new THREE.Box3().setFromObject(root);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  assert(sourceSize.y > 0.001, definition.id + ' has an empty bounding box');

  const scale = THREE.MathUtils.clamp(targetHeight / sourceSize.y, 0.5, 1.5);
  root.scale.setScalar(scale);
  root.rotation.y = definition.initialYaw || 0;
  root.updateMatrixWorld(true);
  const normalizedBounds = new THREE.Box3().setFromObject(root);
  root.position.y += stageY - normalizedBounds.min.y;
  root.updateMatrixWorld(true);

  const partOrigins = new Map(
    Object.entries(asset.parts).map(([id, part]) => [id, part.position.clone()]),
  );
  const outlines = [];
  const renderables = [];
  const shadowCandidates = [];

  root.traverse((object) => {
    if (object.isLine || object.isLineSegments) {
      outlines.push(object);
      return;
    }
    if (!object.isMesh) return;
    renderables.push(object);
    object.receiveShadow = true;
    object.castShadow = false;
    if (!isTransparentRenderable(object)) shadowCandidates.push(object);
  });
  shadowCandidates.sort((a, b) => scoreShadowCandidate(b) - scoreShadowCandidate(a));

  const shadowCasterBudget = Math.max(
    0,
    Math.min(
      shadowCandidates.length,
      options.shadowCasterBudget ?? definition.shadowCasterBudget ?? 20,
    ),
  );
  let quality = 'high';

  function setQuality(tier) {
    quality = tier === 'high' ? 'high' : 'low';
    const activeCasters = quality === 'high' ? shadowCasterBudget : 0;
    for (const [index, object] of shadowCandidates.entries()) object.castShadow = index < activeCasters;
    for (const outline of outlines) outline.visible = quality === 'high';
    return getSnapshot();
  }

  function mount(parent) {
    assert(parent?.isObject3D, definition.id + ' mount parent must be Object3D');
    parent.add(root);
    return root;
  }

  function unmount() {
    root.removeFromParent();
    return root;
  }

  function applyMaterialVariant(id) {
    return asset.applyMaterialVariant(id);
  }

  function update(elapsedSeconds, deltaSeconds, reducedMotion = false) {
    asset.update?.(elapsedSeconds, deltaSeconds, reducedMotion);
  }

  function getSnapshot() {
    let visibleRenderables = 0;
    let activeShadowCasters = 0;
    for (const object of renderables) {
      if (object.visible) visibleRenderables += 1;
      if (object.castShadow) activeShadowCasters += 1;
    }
    return {
      version: PRODUCT_SUBJECT_ADAPTER_VERSION,
      contract: 'product-subject-v1',
      id: definition.id,
      sourceHeight: Number(sourceSize.y.toFixed(3)),
      normalizedHeight: Number((sourceSize.y * scale).toFixed(3)),
      scale: Number(scale.toFixed(4)),
      stageY,
      renderableCount: renderables.length,
      visibleRenderableCount: visibleRenderables,
      outlineCount: outlines.length,
      visibleOutlineCount: outlines.filter((entry) => entry.visible).length,
      shadowCandidateCount: shadowCandidates.length,
      shadowCasterBudget,
      activeShadowCasters,
      quality,
      externalModelCount: asset.manifest.externalModelCount || 0,
    };
  }

  let disposed = false;
  function dispose() {
    if (disposed) return false;
    disposed = true;
    unmount();
    return asset.dispose();
  }

  setQuality(quality);

  return Object.freeze({
    version: PRODUCT_SUBJECT_ADAPTER_VERSION,
    definition,
    asset,
    root,
    parts: asset.parts,
    sockets: asset.sockets,
    manifest: asset.manifest,
    materialVariants: asset.materialVariants,
    hotspots: definition.hotspots,
    overview: definition.overview,
    cameraPresets: definition.cameraPresets,
    explodeOffsets: definition.explodeOffsets,
    partOrigins,
    mount,
    unmount,
    setQuality,
    applyMaterialVariant,
    update,
    getSnapshot,
    dispose,
  });
}
