import { SOURCE_COMMIT, fingerprint } from './compiler.js';

export const SCENE_PRESETS = [
  { id: 'storm-harbour-delivery', label: '暴雨后的港口回信', title: '暴雨后的港口回信', purpose: '信使穿过退潮后的码头，把求救信交给守灯人。', seed: 605203, sceneType: 'rescue', mood: 'urgent', biome: 'harbour', interaction: 'deliver', actor: 'human' },
  { id: 'moonlit-forest-rendezvous', label: '月光林地的秘密会面', title: '月光林地的秘密会面', purpose: '猫侦察者在异常植物旁等待交换一件危险信物。', seed: 731409, sceneType: 'mystery', mood: 'uncanny', biome: 'forest', interaction: 'negotiate', actor: 'cat' },
  { id: 'winter-greenhouse-shelter', label: '冬日温室的临时庇护', title: '冬日温室的临时庇护', purpose: '守门犬保护受伤旅人，在结霜植物间寻找可以照明和休息的位置。', seed: 418804, sceneType: 'shelter', mood: 'hopeful', biome: 'winter', interaction: 'protect', actor: 'dog' },
];

export const SCENE_TYPES = [
  { id: 'rescue', label: '救援 / 传递' }, { id: 'mystery', label: '调查 / 秘密' },
  { id: 'shelter', label: '庇护 / 休息' }, { id: 'encounter', label: '遭遇 / 冲突' },
];
export const SCENE_MOODS = [
  { id: 'urgent', label: '紧迫' }, { id: 'hopeful', label: '希望' },
  { id: 'uncanny', label: '异常' }, { id: 'calm', label: '平静' },
];
export const SCENE_BIOMES = [
  { id: 'harbour', label: '港口 / 盐碱地' }, { id: 'forest', label: '森林' },
  { id: 'garden', label: '花园' }, { id: 'ruin', label: '遗迹' }, { id: 'winter', label: '冬季温室' },
];
export const SCENE_INTERACTIONS = [
  { id: 'deliver', label: '传递物件' }, { id: 'protect', label: '守护' },
  { id: 'discover', label: '发现线索' }, { id: 'rest', label: '休息' }, { id: 'negotiate', label: '交换 / 谈判' },
];
export const SCENE_ACTORS = [
  { id: 'human', label: '人类 NPC' }, { id: 'cat', label: '猫科 NPC' },
  { id: 'dog', label: '犬类 NPC' }, { id: 'nightmare', label: '梦魇生物' },
];

const TYPE_ROLE = {
  rescue: ['quest-giver', '任务信息必须清晰，角色被匹配为任务发起者。'],
  mystery: ['witness', '调查场景需要可辨认的目击者或线索持有者。'],
  shelter: ['guardian', '庇护场景需要承担保护关系的角色。'],
  encounter: ['encounter', '冲突场景需要明确的威胁主体。'],
};
const MOOD_STYLE = {
  urgent: ['expressionism', 'gloom', 'nightmare', '紧迫情绪使用高张力轮廓与最高道具等级。'],
  hopeful: ['watercolor', 'field', 'gilded', '希望情绪使用柔和媒介与较明亮角色配色。'],
  uncanny: ['surrealism', 'gloom', 'nightmare', '异常情绪使用梦境风格与暗域角色配色。'],
  calm: ['ukiyoe', 'paper', 'inked', '平静情绪使用平面秩序和较克制的道具等级。'],
};
const BIOME_OBJECT = {
  harbour: ['grass', 'desert', 'matte', '盐碱港口匹配低矮、耐候的草本轮廓。'],
  forest: ['tree', 'fern', 'matte', '森林需要可作空间锚点的乔木体量。'],
  garden: ['flower', 'bloom', 'glaze', '花园需要高辨识花形和湿润表面。'],
  ruin: ['wildcard', 'tundra', 'fuzz', '遗迹使用不规则植物与灰冷表面表达失序。'],
  winter: ['plant', 'tundra', 'fuzz', '冬季温室使用耐寒植物和柔灰表面。'],
};
const INTERACTION_ITEM = {
  deliver: ['charm', '传递行为匹配体积小、可作为任务信物的 Charm。'],
  protect: ['shield', '守护行为匹配可读性直接的 Shield。'],
  discover: ['lantern', '调查行为匹配能进入地面照明宿主的 Lantern。'],
  rest: ['bed', '休息行为匹配源库注册的 Bed 地面对象。'],
  negotiate: ['doll', '交换行为匹配带叙事含义、可作为筹码的 Doll。'],
};

function valid(list, value, fallback) { return list.some(item => item.id === value) ? value : fallback; }
function offsetSeed(seed, offset) { return ((seed + offset - 1) % 2147483647) + 1; }

export function normalizeSceneIntent(input = {}) {
  const seed = Number(input.seed);
  if (!Number.isSafeInteger(seed) || seed < 1 || seed > 2147483647) throw new RangeError('Scene Seed 必须是 1–2147483647 的整数。');
  return {
    schemaVersion: 'kindergrimm-scene-demand/1.0',
    title: String(input.title || '未命名场景').trim().slice(0, 60) || '未命名场景',
    purpose: String(input.purpose || '').trim().slice(0, 220),
    seed,
    sceneType: valid(SCENE_TYPES, input.sceneType, 'mystery'),
    mood: valid(SCENE_MOODS, input.mood, 'calm'),
    biome: valid(SCENE_BIOMES, input.biome, 'forest'),
    interaction: valid(SCENE_INTERACTIONS, input.interaction, 'discover'),
    actor: valid(SCENE_ACTORS, input.actor, 'human'),
  };
}

export function matchSceneDemand(input = {}) {
  const intent = normalizeSceneIntent(input);
  const [sceneRole, roleReason] = TYPE_ROLE[intent.sceneType];
  const [style, look, rank, styleReason] = MOOD_STYLE[intent.mood];
  const [environmentSpecies, palette, material, environmentReason] = BIOME_OBJECT[intent.biome];
  const [itemFamily, itemReason] = INTERACTION_ITEM[intent.interaction];
  const plan = {
    schemaVersion: 'kindergrimm-scene-material-plan/1.0',
    source: { repository: 'https://github.com/albertobeiz/kindergrimm', commit: SOURCE_COMMIT, runtimeModel: 'none' },
    intent,
    selections: {
      character: { seed: intent.seed, species: intent.actor, look, sceneRole, assetId: `scene-${intent.seed}-${intent.actor}` },
      style: { id: style, seed: offsetSeed(intent.seed, 17), n: 6 },
      item: { family: itemFamily, rank, seed: offsetSeed(intent.seed, 101) },
      environment: { species: environmentSpecies, palette, material, seed: offsetSeed(intent.seed, 211) },
    },
    explanations: [
      { capability: 'character', signal: `sceneType:${intent.sceneType}`, decision: `${intent.actor} / ${sceneRole} / ${look}`, reason: roleReason, source: 'compileIntent → buildCharacter / buildVoxelCharacter / buildGloss', representation: '2D planes + procedural 3D', gap: '跨 Backend 仍不共享部件几何。' },
      { capability: 'style', signal: `mood:${intent.mood}`, decision: style, reason: styleReason, source: 'styles.html / stylesheet.js', representation: 'source contact sheet', gap: '风格样张用于选型，不是场景几何。' },
      { capability: 'item', signal: `interaction:${intent.interaction}`, decision: `${itemFamily} / ${rank}`, reason: itemReason, source: 'rollItem + thumbFor', representation: 'procedural 2D transparent asset', gap: 'PNG 不冒充 3D 模型。' },
      { capability: 'environment', signal: `biome:${intent.biome}`, decision: `${environmentSpecies} / ${palette} / ${material}`, reason: environmentReason, source: 'buildPlant', representation: 'procedural Three.js geometry', gap: '包内 PNG 只是目录代理；运行时资产是 Group。' },
    ],
  };
  plan.fingerprint = fingerprint({ intent: plan.intent, selections: plan.selections });
  return plan;
}

export function createScenePackageManifest(plan, assets = []) {
  return {
    schemaVersion: 'kindergrimm-scene-material-package/1.0',
    packageId: `${plan.fingerprint}-${plan.intent.seed}`,
    generatedAt: new Date().toISOString(),
    source: plan.source,
    intent: plan.intent,
    selections: plan.selections,
    explanations: plan.explanations,
    assets,
    assemblyBoundary: 'This package provides source-backed materials and provenance for later scene assembly; it is not a composed game level.',
  };
}
