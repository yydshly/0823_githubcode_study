import { contractFingerprint } from './contracts.js';

export const SCENE_INTENT_SCHEMA = 'kindergrimm-scene-intent-contract/1.0';
export const ASSET_RESOLUTION_SCHEMA = 'kindergrimm-asset-resolution-plan/1.0';

export const SCENE_INTENT_PRESETS = Object.freeze([
  Object.freeze({
    id: 'flood-warning',
    label: '山洪预警',
    intent: '做一个儿童山洪预警场景：夜晚山路上，一名年轻信使提着灯，扶正倒下的路标，帮助迷路家庭前往高地。画面紧张但不能恐怖，使用水粉风格，移动端可操作。'
  }),
  Object.freeze({
    id: 'moonharbor-letter',
    label: '月港送信',
    intent: '构建月港旧水闸的夜间送信场景：信使带着卷轴和信使包，管理员在闸门旁等待。画面神秘克制，使用墨刻风格，重点是按时交付回信。'
  }),
  Object.freeze({
    id: 'sunny-wayfinding',
    label: '森林指路',
    intent: '做一个温暖的儿童森林指路场景：白天山径旁有路标和护符，信使帮助迷路家庭找到回家方向，使用毛毡风格，画面轻松有希望。'
  })
]);

const STYLE_RULES = [
  { id: 'moonharbor-inkcut-props', label: 'Moonharbor Inkcut', tokens: ['墨刻','墨线','版画','月港','神秘','克制'] },
  { id: 'sunpatch-felt-props', label: 'Sunpatch Felt', tokens: ['毛毡','布艺','贴布','温暖','阳光','可爱'] },
  { id: 'mosslight-prop-gouache', label: 'Mosslight Gouache', tokens: ['水粉','水彩','柔和','苔光'] }
];

const SCENE_RULES = [
  { id: 'waystation-display', label: '旧水闸 / Waystation', tokens: ['水闸','闸门','港口','月港','码头','城门'] },
  { id: 'courier-post', label: '信使驿站 / Courier Post', tokens: ['驿站','邮局','信使站','出发点'] },
  { id: 'trail-shrine', label: '山径神龛 / Trail Shrine', tokens: ['山路','山径','森林','神龛','高地','洪水','疏散'] }
];

const PROP_RULES = [
  { id: 'lantern', label: '提灯', tokens: ['提灯','灯笼','灯','夜晚','黑暗'] },
  { id: 'waymark', label: '路标', tokens: ['路标','指路','方向','岔路','迷路'] },
  { id: 'scroll', label: '卷轴 / 回信', tokens: ['卷轴','回信','信件','送信','路线图'] },
  { id: 'satchel', label: '信使包', tokens: ['信使包','邮包','背包','信使'] },
  { id: 'charm', label: '护符', tokens: ['护符','徽记','封蜡','符牌'] }
];

const CHARACTER_RULES = [
  { id: 'courier', label: '信使', tokens: ['信使','邮差','送信','年轻人'] },
  { id: 'family', label: '迷路家庭', tokens: ['家庭','孩子','居民','迷路'] },
  { id: 'keeper', label: '守站人', tokens: ['守站人','老人','导师','驿站'] },
  { id: 'gatekeeper', label: '闸门管理员', tokens: ['管理员','闸门','水闸'] }
];

const GAP_RULES = [
  { id: 'boat', label: '船只', tokens: ['小船','船只','渡船','木船'], capability: 'vehicle-2d' },
  { id: 'bridge', label: '可交互桥梁', tokens: ['桥梁','木桥','吊桥','低桥'], capability: 'architecture-state-2d' },
  { id: 'dog', label: '动物伙伴', tokens: ['小狗','狗','狐狸','猫咪','动物'], capability: 'animal-character-2d' },
  { id: 'dragon', label: '大型幻想生物', tokens: ['巨龙','龙','怪兽'], capability: 'creature-character-2d' },
  { id: 'vehicle', label: '交通工具', tokens: ['自行车','汽车','马车'], capability: 'vehicle-2d' },
  { id: 'raincoat', label: '角色雨衣部件', tokens: ['雨衣','斗篷'], capability: 'character-wardrobe-part' }
];

function includesAny(text, tokens) {
  return tokens.some(token => text.includes(token));
}

function selectRule(text, rules, fallback) {
  return rules.find(rule => includesAny(text, rule.tokens)) || fallback;
}

function uniqueById(values) {
  return values.filter((value, index, all) => all.findIndex(item => item.id === value.id) === index);
}

function payload(contract) {
  const { fingerprint, ...rest } = contract;
  return rest;
}

export function compileSceneIntent(rawIntent) {
  const sourceText = String(rawIntent || '').trim().replace(/\s+/g, ' ');
  if (sourceText.length < 8) throw new Error('请至少描述场景、人物或行动中的两项需求。');
  const style = selectRule(sourceText, STYLE_RULES, STYLE_RULES[2]);
  const scene = selectRule(sourceText, SCENE_RULES, SCENE_RULES[2]);
  let props = uniqueById(PROP_RULES.filter(rule => includesAny(sourceText, rule.tokens)));
  if (!props.length) props = [PROP_RULES[1]];
  const characters = uniqueById(CHARACTER_RULES.filter(rule => includesAny(sourceText, rule.tokens)));
  if (!characters.length) characters.push(CHARACTER_RULES[0]);
  const gaps = uniqueById(GAP_RULES.filter(rule => includesAny(sourceText, rule.tokens)));
  const alertGoal = includesAny(sourceText, ['预警','洪水','疏散','警告','高地']);
  const deliveryGoal = includesAny(sourceText, ['送信','回信','信件','交付','卷轴']);
  const guideGoal = includesAny(sourceText, ['指路','迷路','帮助','方向','回家']);
  const narrativeGoal = alertGoal ? 'public-warning' : deliveryGoal ? 'delivery' : guideGoal ? 'wayfinding' : 'exploration';
  const interactions = [];
  if (props.some(prop => prop.id === 'lantern')) interactions.push('light-lantern');
  if (props.some(prop => prop.id === 'waymark')) interactions.push('repair-waymark');
  if (characters.some(character => character.id === 'family')) interactions.push('guide-family');
  if (deliveryGoal) interactions.push('deliver-letter');
  if (alertGoal) interactions.push('signal-public');
  if (!interactions.length) interactions.push('inspect-scene');
  const contract = {
    schemaVersion: SCENE_INTENT_SCHEMA,
    sourceText,
    seed: 240824,
    intentAdapter: 'local-explainable-rules',
    scene: { id: scene.id, label: scene.label },
    style: { id: style.id, label: style.label },
    narrativeGoal,
    audience: includesAny(sourceText, ['儿童','孩子','亲子','低龄']) ? 'children' : 'general',
    time: includesAny(sourceText, ['夜晚','夜间','黑暗','月光']) ? 'night' : includesAny(sourceText, ['黄昏','傍晚']) ? 'dusk' : 'day',
    mood: includesAny(sourceText, ['紧张','危险','风暴','洪水','预警']) ? 'urgent' : includesAny(sourceText, ['神秘','克制']) ? 'mysterious' : 'hopeful',
    safetyTone: includesAny(sourceText, ['不能恐怖','不恐怖','儿童']) ? 'gentle' : 'standard',
    tension: includesAny(sourceText, ['非常紧张','危险']) ? 3 : includesAny(sourceText, ['紧张','风暴','洪水']) ? 2 : 1,
    platform: includesAny(sourceText, ['移动端','手机','触摸']) ? 'mobile-first' : 'responsive-web',
    characters: characters.map(({ id, label }) => ({ id, label })),
    props: props.map(({ id, label }) => ({ id, label })),
    interactions,
    requestedGaps: gaps.map(({ id, label, capability }) => ({ id, label, capability })),
    provenance: { runtimeLlmCalls: 0, cloudApiCalls: 0, compiler: 'workspace-authored-rule-dictionary/1.0' }
  };
  return Object.freeze({ ...contract, fingerprint: contractFingerprint(contract) });
}

export function buildAssetResolutionPlan(contract) {
  const items = [];
  items.push({
    id: 'scene:' + contract.scene.id,
    kind: 'scene-component',
    requirement: contract.scene.label,
    status: 'matched',
    resolution: '复用已验证 Scene Component Recipe，并按合同重绘天气、时间与情绪。',
    targetId: contract.scene.id,
    provenance: 'local-authored-procedural-2d-scene-component'
  });
  contract.props.forEach(prop => items.push({
    id: 'prop:' + prop.id,
    kind: 'prop',
    requirement: prop.label,
    status: 'matched',
    resolution: '匹配稳定 Prop archetype；样式由当前 Style Grammar 决定。',
    targetId: prop.id,
    provenance: 'local-authored-procedural-canvas-2d'
  }));
  contract.characters.forEach(character => items.push({
    id: 'character:' + character.id,
    kind: 'character-token',
    requirement: character.label,
    status: 'generated-variant',
    resolution: '使用确定性角色 Token 语法生成场景姿态与颜色变体；不声明完整骨骼角色资产。',
    targetId: character.id,
    provenance: 'local-authored-procedural-character-token-2d'
  }));
  contract.interactions.forEach(interaction => items.push({
    id: 'interaction:' + interaction,
    kind: 'scene-state',
    requirement: interaction,
    status: 'generated-variant',
    resolution: '根据场景合同映射为可见状态与热点，不写入素材身份。',
    targetId: interaction,
    provenance: 'local-authored-runtime-state-mapping'
  }));
  contract.requestedGaps.forEach(gap => items.push({
    id: 'gap:' + gap.id,
    kind: 'capability-gap',
    requirement: gap.label,
    status: 'capability-gap',
    resolution: `需要新增 ${gap.capability} 能力；本轮不生成占位素材。`,
    targetId: gap.capability,
    provenance: 'unresolved-no-asset-generated'
  }));
  const counts = {
    matched: items.filter(item => item.status === 'matched').length,
    generatedVariant: items.filter(item => item.status === 'generated-variant').length,
    capabilityGap: items.filter(item => item.status === 'capability-gap').length
  };
  const data = {
    schemaVersion: ASSET_RESOLUTION_SCHEMA,
    sceneContractFingerprint: contract.fingerprint,
    strategy: 'reuse-then-variant-then-gap',
    items,
    counts,
    provenance: { runtimeLlmCalls: 0, cloudApiCalls: 0 }
  };
  return Object.freeze({ ...data, fingerprint: contractFingerprint(data) });
}

export function reviseSceneIntent(sourceText, revision) {
  const additions = {
    urgent: ' 画面更紧张，风暴和预警更明显。',
    gentle: ' 面向儿童，不能恐怖，画面保持温和。',
    felt: ' 使用毛毡风格。',
    inkcut: ' 使用墨刻风格，神秘克制。',
    gouache: ' 使用水粉风格，柔和但清晰。',
    mobile: ' 移动端可操作。'
  };
  const addition = additions[revision];
  if (!addition) throw new Error('不支持的场景修订：' + revision);
  let next = String(sourceText || '').trim();
  if (['felt','inkcut','gouache'].includes(revision)) next = next.replace(/使用(水粉|毛毡|墨刻)风格[，。]?/g, '');
  return (next + addition).trim();
}

export function validateSceneIntentContract(contract) {
  const errors = [];
  if (!contract || contract.schemaVersion !== SCENE_INTENT_SCHEMA) errors.push('schemaVersion');
  if (!contract?.sourceText || !contract?.scene?.id || !contract?.style?.id) errors.push('required-fields');
  if (!Array.isArray(contract?.props) || !Array.isArray(contract?.characters)) errors.push('asset-arrays');
  if (contract?.provenance?.runtimeLlmCalls !== 0 || contract?.provenance?.cloudApiCalls !== 0) errors.push('provenance');
  if (contract && contract.fingerprint !== contractFingerprint(payload(contract))) errors.push('fingerprint');
  return { ok: errors.length === 0, errors };
}
