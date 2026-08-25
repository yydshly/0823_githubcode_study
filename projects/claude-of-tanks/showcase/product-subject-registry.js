import { createAtlasInspectionRover } from '/@cot-research/industrial-showroom-asset.js';
import {
  INDUSTRIAL_CAMERA_PRESETS,
  INDUSTRIAL_HOTSPOTS,
  INDUSTRIAL_OVERVIEW_CAMERA,
  INDUSTRIAL_STAGE,
} from '/@cot-research/industrial-showroom-config.js';
import {
  createNovaFieldNode,
  NOVA_FIELD_NODE_VARIANTS,
} from '/@cot-research/nova-field-node-asset.js';

const point = (...values) => Object.freeze(values);
const camera = (id, position, target, fov) => Object.freeze({
  id,
  position: point(...position),
  target: point(...target),
  fov,
});

const atlasDefinition = Object.freeze({
  id: 'atlas-inspection-rover',
  code: 'ATLAS-01',
  label: 'Atlas 巡检车',
  shortLabel: 'Atlas 载具',
  kind: 'industrial-equipment',
  summary: '程序化巡检载具：59 个 Mesh 组成底盘、感知、能源与驱动层级，用来验证复杂移动设备的产品化表达。',
  factory: createAtlasInspectionRover,
  targetHeight: 3.18,
  initialYaw: INDUSTRIAL_STAGE.initialYaw,
  shadowCasterBudget: 24,
  overview: camera(
    'overview',
    INDUSTRIAL_OVERVIEW_CAMERA.pos,
    INDUSTRIAL_OVERVIEW_CAMERA.lookAt,
    INDUSTRIAL_OVERVIEW_CAMERA.fov,
  ),
  cameraPresets: Object.freeze(INDUSTRIAL_CAMERA_PRESETS.map((preset) => camera(
    preset.id,
    preset.pos,
    preset.lookAt,
    preset.fov,
  ))),
  hotspots: INDUSTRIAL_HOTSPOTS,
  explodeOffsets: Object.freeze({
    chassis: point(0, 0, 0),
    'sensor-system': point(0, 1.25, 0.28),
    'energy-module': point(-1.2, 0.3, -0.12),
    'all-terrain-drive': point(0, -0.34, 0),
    'safety-frame': point(0, 0.55, -0.72),
    'service-bay': point(0.78, 0.46, -0.42),
  }),
});

const novaHotspots = Object.freeze([
  Object.freeze({
    id: 'sensor-crown',
    index: 1,
    label: '感知冠环',
    eyebrow: '01 / SENSOR CROWN',
    detail: '三向传感舱与旋转冠环构成 360° 状态感知层，动画由主体自身提供。',
    targetPartId: 'sensor-crown',
    socketId: 'sensor-crown',
    cameraPresetId: 'sensor-crown',
  }),
  Object.freeze({
    id: 'power-core',
    index: 2,
    label: '能源核心',
    eyebrow: '02 / POWER CORE',
    detail: '透明发光核心、保护笼与热管理环共同表达能源流动和维护边界。',
    targetPartId: 'power-core',
    socketId: 'power-core',
    cameraPresetId: 'power-core',
  }),
  Object.freeze({
    id: 'stabilizers',
    index: 3,
    label: '稳定支腿',
    eyebrow: '03 / STABILIZERS',
    detail: '三点式伸展支腿与实例化脚垫，让静态设备与 Atlas 载具形成清晰类别差异。',
    targetPartId: 'stabilizers',
    socketId: 'stabilizers',
    cameraPresetId: 'stabilizers',
  }),
]);

const novaDefinition = Object.freeze({
  id: 'nova-field-node',
  code: 'NOVA-02',
  label: 'Nova 能源节点',
  shortLabel: 'Nova 节点',
  kind: 'industrial-energy-node',
  summary: '程序化固定式能源节点：用实例化支腿和散热片、透明核心及局部动画，验证同一展台能否承载非载具产品。',
  factory: createNovaFieldNode,
  targetHeight: 3.42,
  initialYaw: -0.18,
  shadowCasterBudget: 12,
  overview: camera('overview', [9.5, 5.05, 10.5], [0, 1.55, 0], 34),
  cameraPresets: Object.freeze([
    camera('sensor-crown', [5.8, 4.65, 6.6], [0, 3.0, 0], 30),
    camera('power-core', [5.5, 2.85, 5.3], [0, 1.65, 0], 31),
    camera('stabilizers', [-5.7, 1.7, 4.8], [0.75, 0.4, 0.25], 32),
  ]),
  hotspots: novaHotspots,
  materialVariants: NOVA_FIELD_NODE_VARIANTS,
  explodeOffsets: Object.freeze({
    structure: point(0, 0, 0),
    'power-core': point(0, 0.35, 0),
    'sensor-crown': point(0, 1.05, 0),
    stabilizers: point(0, -0.24, 0),
    'thermal-system': point(0.72, 0.14, -0.42),
  }),
});

export const PRODUCT_SUBJECT_REGISTRY_VERSION = 1;
export const PRODUCT_SUBJECT_DEFINITIONS = Object.freeze([atlasDefinition, novaDefinition]);

export function listProductSubjectDefinitions() {
  return PRODUCT_SUBJECT_DEFINITIONS;
}

export function getProductSubjectDefinition(id) {
  return PRODUCT_SUBJECT_DEFINITIONS.find((entry) => entry.id === id) || null;
}

export function auditProductSubjectDefinitions() {
  const ids = new Set();
  const issues = [];

  for (const definition of PRODUCT_SUBJECT_DEFINITIONS) {
    if (!definition.id || ids.has(definition.id)) issues.push('duplicate-or-empty-subject:' + definition.id);
    ids.add(definition.id);
    if (typeof definition.factory !== 'function') issues.push('missing-factory:' + definition.id);
    if (!definition.overview?.position || !definition.overview?.target) {
      issues.push('missing-overview-camera:' + definition.id);
    }

    const cameraIds = new Set(definition.cameraPresets.map((preset) => preset.id));
    const hotspotIds = new Set();
    for (const hotspot of definition.hotspots) {
      if (hotspotIds.has(hotspot.id)) issues.push('duplicate-hotspot:' + definition.id + ':' + hotspot.id);
      hotspotIds.add(hotspot.id);
      if (!cameraIds.has(hotspot.cameraPresetId)) {
        issues.push('missing-hotspot-camera:' + definition.id + ':' + hotspot.id);
      }
    }
  }

  return Object.freeze({
    version: PRODUCT_SUBJECT_REGISTRY_VERSION,
    subjectCount: PRODUCT_SUBJECT_DEFINITIONS.length,
    subjectIds: Object.freeze(PRODUCT_SUBJECT_DEFINITIONS.map((entry) => entry.id)),
    issues: Object.freeze(issues),
    valid: issues.length === 0,
  });
}
