const point = (...values) => Object.freeze(values);

export const INDUSTRIAL_SHOWROOM_VERSION = 1;
export const INDUSTRIAL_SHOWROOM_SUBJECT = Object.freeze({
  id: 'atlas-inspection-rover',
  kind: 'industrial-equipment',
  rootName: 'atlas-inspection-rover',
});

export const INDUSTRIAL_SHOWROOM_PROVENANCE = Object.freeze({
  origin: 'procedural',
  qualityClaim: 'Prototype / L2 — procedural presentation asset; not a commercial production model',
  sourceModule: 'showcase/industrial-showroom-asset.js',
  externalModelCount: 0,
});

export const INDUSTRIAL_MATERIAL_VARIANTS = Object.freeze([
  Object.freeze({
    id: 'graphite-field',
    label: '石墨现场版',
    description: '低反射石墨外壳，琥珀识别件。',
    palette: Object.freeze({
      body: 0x313a3e,
      secondary: 0x151b1e,
      panel: 0x20282c,
      accent: 0xffa33f,
      hub: 0x87969b,
    }),
  }),
  Object.freeze({
    id: 'rescue-orange',
    label: '救援橙',
    description: '高识别工业橙，适合维护与救援场景。',
    palette: Object.freeze({
      body: 0xa94f22,
      secondary: 0x2b2522,
      panel: 0x4a2d20,
      accent: 0xffc15d,
      hub: 0xb7a28f,
    }),
  }),
  Object.freeze({
    id: 'arctic-service',
    label: '极地维护版',
    description: '冷白面板配青色识别件，强调洁净检测语义。',
    palette: Object.freeze({
      body: 0xb8c2c3,
      secondary: 0x344046,
      panel: 0x657379,
      accent: 0x46c7d8,
      hub: 0xd4dddd,
    }),
  }),
]);

export const INDUSTRIAL_HOTSPOTS = Object.freeze([
  Object.freeze({
    id: 'sensor-system',
    index: 1,
    label: '传感系统',
    eyebrow: '01 / SENSOR ARRAY',
    detail: '双目测距、环形 LiDAR 与状态灯构成可更换的巡检感知头。',
    targetPartId: 'sensor-system',
    socketId: 'sensor-system',
    cameraPresetId: 'sensor-system',
  }),
  Object.freeze({
    id: 'energy-module',
    index: 2,
    label: '能源模块',
    eyebrow: '02 / ENERGY PACK',
    detail: '侧抽式电池盒与热管理鳍片，强调现场快速维护路径。',
    targetPartId: 'energy-module',
    socketId: 'energy-module',
    cameraPresetId: 'energy-module',
  }),
  Object.freeze({
    id: 'all-terrain-drive',
    index: 3,
    label: '全地形驱动',
    eyebrow: '03 / DRIVE SYSTEM',
    detail: '四轮独立悬挂、宽胎与高离地底盘，为复杂厂区路面保留通过性。',
    targetPartId: 'all-terrain-drive',
    socketId: 'all-terrain-drive',
    cameraPresetId: 'all-terrain-drive',
  }),
]);

export const INDUSTRIAL_CAMERA_PRESETS = Object.freeze([
  Object.freeze({
    id: 'sensor-system',
    pos: point(5.2, 4.25, 5.7),
    lookAt: point(0, 2.45, 0.55),
    fov: 30,
  }),
  Object.freeze({
    id: 'energy-module',
    pos: point(-5.6, 2.75, -1.9),
    lookAt: point(-1.05, 1.35, -0.45),
    fov: 31,
  }),
  Object.freeze({
    id: 'all-terrain-drive',
    pos: point(5.4, 1.75, 4.65),
    lookAt: point(1.35, 0.7, 0.95),
    fov: 32,
  }),
]);

export const INDUSTRIAL_OVERVIEW_CAMERA = Object.freeze({
  id: 'overview',
  pos: point(9.6, 4.9, 10.8),
  lookAt: point(0, 1.35, 0.05),
  fov: 34,
});

export const INDUSTRIAL_STAGE = Object.freeze({
  anchor: point(30, -82),
  platformHeight: 0.18,
  initialYaw: -0.32,
  cameraTransitionMs: 680,
  autoRotateRadPerSecond: 0.11,
});

export function isIndustrialShowroomRoute(locationLike = globalThis.location) {
  if (!locationLike) return false;
  const params = new URLSearchParams(locationLike.search || '');
  return /^\/studio\/?$/.test(locationLike.pathname || '')
    && params.get('showcase') === 'industrial-showroom'
    && !params.has('lab');
}
