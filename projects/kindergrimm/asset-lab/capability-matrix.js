import { SOURCE_COMMIT, fingerprint } from './compiler.js';

export const CAPABILITY_MODES = [
  { id: 'character', label: '角色', count: 3, summary: 'Drawn / Voxel / Gloss' },
  { id: 'style', label: '风格', count: 15, summary: '6 Media + 9 History Styles' },
  { id: 'item', label: '物品', count: 13, summary: '13 Families × 4 Ranks' },
  { id: 'environment', label: '环境', count: 5, summary: 'Grass / Plant / Tree / Flower / Wildcard' },
  { id: 'scene', label: '场景编排', count: 4, summary: 'Demand → Character / Style / Item / Environment' },
  { id: 'usage', label: '使用场景', count: 3, summary: 'Narrative / Collection / World Placement' },
];

export const SOURCE_MEDIA = [
  { id: 'graphite', label: 'Graphite', kind: 'media', era: 'material', use: '草图、头像、低成本对话资产' },
  { id: 'ink', label: 'Ink', kind: 'media', era: 'material', use: '高对比卡片、任务标记' },
  { id: 'watercolor', label: 'Watercolour', kind: 'media', era: 'material', use: '儿童叙事、柔和场景角色' },
  { id: 'oil', label: 'Oil', kind: 'media', era: 'material', use: '厚重肖像、章节插画' },
  { id: 'chalk', label: 'Charcoal', kind: 'media', era: 'material', use: '暗场草图、记忆片段' },
  { id: 'marker', label: 'Marker', kind: 'media', era: 'material', use: '清晰图标、现代提示' },
];

export const HISTORY_STYLES = [
  { id: 'gothic', label: 'Gothic', kind: 'history', era: 1310, use: '宗教感、拱形背景、仪式场景' },
  { id: 'renaissance', label: 'Renaissance', kind: 'history', era: 1500, use: '平衡肖像、人物叙事' },
  { id: 'baroque', label: 'Baroque', kind: 'history', era: 1620, use: '戏剧光线、高潮演出' },
  { id: 'ukiyoe', label: 'Ukiyo-e', kind: 'history', era: 1830, use: '平面轮廓、旅行与风景' },
  { id: 'impressionism', label: 'Impressionism', kind: 'history', era: 1874, use: '空气感、户外与日光' },
  { id: 'expressionism', label: 'Expressionism', kind: 'history', era: 1910, use: '情绪压力、危险提示' },
  { id: 'cubism', label: 'Cubism', kind: 'history', era: 1911, use: '结构分解、异质角色' },
  { id: 'dadaism', label: 'Dada', kind: 'history', era: 1918, use: '荒诞界面、拼贴事件' },
  { id: 'surrealism', label: 'Surrealism', kind: 'history', era: 1929, use: '梦境、异常空间' },
];

export const STYLE_CAPABILITIES = [...SOURCE_MEDIA, ...HISTORY_STYLES];
export const ITEM_RANKS = ['sketch', 'inked', 'gilded', 'nightmare'];
export const ENVIRONMENT_SPECIES = ['grass', 'plant', 'tree', 'flower', 'wildcard'];
export const ENVIRONMENT_PALETTES = ['meadow', 'lime', 'fern', 'bloom', 'desert', 'tundra'];
export const ENVIRONMENT_FINISHES = ['matte', 'glaze', 'fuzz'];

export function styleProofUrl({ style = 'gothic', seed = 240824, species = 'human', n = 6 } = {}) {
  const valid = STYLE_CAPABILITIES.some(entry => entry.id === style) ? style : 'gothic';
  const query = new URLSearchParams({ style: valid, seed: String(seed), species, n: String(n), hand: valid === 'graphite' ? 'graphite' : 'brush' });
  query.set('shot', '');
  return `../upstream/styles.html?${query.toString().replace('shot=', 'shot')}`;
}

export function itemManifest(item, { px = 512 } = {}) {
  return {
    schemaVersion: 'kindergrimm-item-asset/1.0',
    source: { commit: SOURCE_COMMIT, builder: 'upstream/src/items/index.js · rollItem + thumbFor' },
    identity: { family: item.family, rank: item.rank, seed: item.seed },
    name: item.name,
    slot: item.slot,
    stats: item.stats,
    effects: item.fx,
    curse: item.curse?.id ?? null,
    copy: item.copy,
    hosts: ['card-hud', 'floor-prop', 'on-character'],
    output: { representation: 'procedural-2d-transparent-png', width: px, height: px },
    fingerprint: fingerprint({ family: item.family, rank: item.rank, seed: item.seed, P: item.P }),
  };
}

export function environmentRecipe({ seed = 240824, species = 'tree', palette = 'meadow', material = 'matte' } = {}) {
  const n = Number(seed);
  if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) throw new RangeError('Seed 必须是 1–2147483647 的整数。');
  return {
    seed: n,
    species: ENVIRONMENT_SPECIES.includes(species) ? species : 'tree',
    palette: ENVIRONMENT_PALETTES.includes(palette) ? palette : 'meadow',
    material: ENVIRONMENT_FINISHES.includes(material) ? material : 'matte',
    parts: {},
  };
}

export function environmentManifest(recipe, stats, output = {}) {
  return {
    schemaVersion: 'kindergrimm-environment-asset/1.0',
    source: { commit: SOURCE_COMMIT, builder: 'upstream/src/obj/orig.js · buildPlant' },
    recipe,
    representation: 'procedural-threejs-geometry',
    sceneUse: ['set-dressing', 'landmark', 'ground-cover', 'environment-proxy'],
    runtimeBoundary: 'PNG export is a transparent proxy; reusable scene geometry remains the source buildPlant result.',
    stats,
    output,
    fingerprint: fingerprint({ recipe, stats }),
  };
}

export function capabilitySummary() {
  return {
    modes: CAPABILITY_MODES.length,
    characterBackends: 3,
    media: SOURCE_MEDIA.length,
    historyStyles: HISTORY_STYLES.length,
    itemFamilies: 13,
    itemRanks: ITEM_RANKS.length,
    environmentSpecies: ENVIRONMENT_SPECIES.length,
    environmentPalettes: ENVIRONMENT_PALETTES.length,
  };
}




