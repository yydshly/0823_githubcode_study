export const SOURCE_COMMIT = '5857b1e1cae2713d6714ad7dd7f89626bb242f0f';
export const INTENT_SCHEMA = 'kindergrimm-asset-intent/1.0';
export const MANIFEST_SCHEMA = 'kindergrimm-scene-asset-manifest/1.0';

export const SPECIES = [
  { id: 'human', label: '人类 NPC' },
  { id: 'cat', label: '猫科 NPC' },
  { id: 'dog', label: '犬类 NPC' },
  { id: 'nightmare', label: '梦魇生物' },
];

export const LOOKS = [
  { id: 'paper', label: '纸上素描', drawn: 'graphite', voxel: 'graphite', gloss: 'mist', material: 'rubber' },
  { id: 'harbour', label: '港湾彩色', drawn: 'watercolor', voxel: 'crayon', gloss: 'harbour', material: 'resin' },
  { id: 'field', label: '野外标记', drawn: 'marker', voxel: 'clay', gloss: 'meadow', material: 'flocked' },
  { id: 'gloom', label: '暗域墨线', drawn: 'ink', voxel: 'gloom', gloss: 'dusk', material: 'ceramic' },
];

export const PRESETS = [
  { id: 'harbour-courier', label: '港湾信使', seed: 240824, species: 'human', look: 'harbour', sceneRole: 'quest-giver' },
  { id: 'forest-scout', label: '林地侦察者', seed: 418203, species: 'cat', look: 'field', sceneRole: 'companion' },
  { id: 'watch-dog', label: '守门犬', seed: 731906, species: 'dog', look: 'paper', sceneRole: 'guardian' },
  { id: 'gloom-witness', label: '暗域目击者', seed: 902117, species: 'nightmare', look: 'gloom', sceneRole: 'encounter' },
];

const GLOSS_SPECIES = {
  human: { id: 'humanoid', fidelity: 'adapted', note: 'Gloss 使用 humanoid casting。' },
  cat: { id: 'cat', fidelity: 'exact', note: '物种语义可直接映射。' },
  dog: { id: 'bear', fidelity: 'adapted', note: 'Gloss 暂无 dog，以 bear 近似四肢与耳部轮廓。' },
  nightmare: { id: 'monster', fidelity: 'adapted', note: 'Gloss 使用 monster 表达威胁语义。' },
};

export function normalizeIntent(input = {}) {
  const seed = Number(input.seed);
  const species = SPECIES.some(item => item.id === input.species) ? input.species : 'human';
  const look = LOOKS.some(item => item.id === input.look) ? input.look : 'paper';
  const sceneRole = String(input.sceneRole || 'ambient-npc').trim() || 'ambient-npc';
  const assetId = String(input.assetId || `${species}-${seed}`).trim().replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  if (!Number.isSafeInteger(seed) || seed < 1 || seed > 2147483647) {
    throw new RangeError('Seed 必须是 1–2147483647 的整数。');
  }
  return { schemaVersion: INTENT_SCHEMA, assetId, seed, species, look, sceneRole };
}

export function compileIntent(input) {
  const intent = normalizeIntent(input);
  const look = LOOKS.find(item => item.id === intent.look);
  const glossSpecies = GLOSS_SPECIES[intent.species];
  const isBiped = intent.species === 'human' || intent.species === 'nightmare';
  const nativeRecipes = {
    drawn: {
      seed: intent.seed,
      species: intent.species,
      base: isBiped ? 'biped' : null,
      media: look.drawn,
      color: intent.look === 'paper' ? 'auto' : 'color',
      parts: {},
    },
    voxel: {
      seed: intent.seed,
      species: intent.species,
      base: isBiped ? 'biped' : null,
      palette: look.voxel,
      parts: {},
    },
    gloss: {
      seed: intent.seed,
      species: glossSpecies.id,
      body: intent.species === 'nightmare' ? 'cube' : 'sphere',
      stance: 'biped',
      palette: look.gloss,
      colorIx: intent.seed % 5,
      material: look.material,
      parts: {},
    },
  };
  const mapping = [
    { field: 'seed', level: 'exact', label: '精确', detail: '三个 Backend 接收同一个整数 Seed。' },
    { field: 'species', level: glossSpecies.fidelity, label: glossSpecies.fidelity === 'exact' ? '精确' : '适配', detail: glossSpecies.note },
    { field: 'look', level: 'adapted', label: '适配', detail: `${look.drawn} / ${look.voxel} / ${look.gloss} + ${look.material}` },
    { field: 'parts', level: 'local', label: '各自生成', detail: '三个源库 Backend 使用独立部件参数表。' },
    { field: 'hair · glasses · outfit · socket', level: 'unsupported', label: '未统一', detail: '尚无跨 Backend 的共享语义合同。' },
  ];
  return {
    intent,
    source: { repository: 'https://github.com/albertobeiz/kindergrimm', commit: SOURCE_COMMIT },
    nativeRecipes,
    mapping,
    fingerprint: fingerprint({ intent, nativeRecipes }),
  };
}

export function sceneReadiness(compiled) {
  return [
    {
      backend: 'drawn',
      representation: '2D transparent PNG',
      sceneUse: '对话头像、任务卡、2D 场景角色',
      ready: ['确定性身份', '透明导出', '动画 Rig 可继续接入'],
      gap: '尚未输出 sprite sheet 与统一碰撞框。',
      filename: `${compiled.intent.assetId}--drawn.png`,
    },
    {
      backend: 'voxel',
      representation: 'procedural 3D + PNG proxy',
      sceneUse: '可旋转世界角色、俯视场景 NPC、拾取物尺度验证',
      ready: ['真实几何', '体素/三角面统计', '部件动画面板'],
      gap: '本轮导出 PNG proxy；GLB/scene factory 仍是下一层。',
      filename: `${compiled.intent.assetId}--voxel.png`,
    },
    {
      backend: 'gloss',
      representation: 'procedural 3D + PNG proxy',
      sceneUse: '收藏品、角色肖像、风格化 3D 演出',
      ready: ['真实程序化几何', '材质变体', '标准化 PNG'],
      gap: 'Gloss 物种与 Drawn/Voxel 并非一一对应。',
      filename: `${compiled.intent.assetId}--gloss.png`,
    },
  ];
}

export function createManifest(compiled, outputs = []) {
  return {
    schemaVersion: MANIFEST_SCHEMA,
    assetId: compiled.intent.assetId,
    fingerprint: compiled.fingerprint,
    generatedAt: new Date().toISOString(),
    source: compiled.source,
    intent: compiled.intent,
    nativeRecipes: compiled.nativeRecipes,
    mapping: compiled.mapping,
    outputs,
    sceneReadiness: sceneReadiness(compiled),
    runtimeModel: 'none',
    notes: [
      'PNG files are standardized 768×768 scene proxies generated by upstream render builders.',
      'Detailed part identity is backend-local until a shared semantic-part contract exists.',
    ],
  };
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function fingerprint(value) {
  const text = stableJson(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `kg-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
