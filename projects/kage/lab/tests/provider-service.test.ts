import { describe, expect, it } from 'vitest';
import { modelInterpretationJsonSchema, normalizeModelInterpretation, type ModelInterpretation } from '../server/model-schema';
import { providerOrder } from '../server/provider-service';
import type { ProviderStatusResponse } from '../src/generation/schema';
import { generateCreativeRun } from '../src/generation/orchestrator';

import { modelBlueprint } from './fixtures/experience-blueprint';
const status: ProviderStatusResponse = {
  defaultProvider: 'auto',
  providers: [
    { id: 'codex', available: true, model: 'configured', reason: null, capabilities: ['creative-analysis', 'code-synthesis', 'registered-three-runtime', 'browser-preview'] },
    { id: 'minimax', available: true, model: 'MiniMax-M3', reason: null, capabilities: ['creative-analysis', 'code-synthesis', 'registered-three-runtime', 'browser-preview'] },
    { id: 'openai', available: false, model: 'gpt-5.6-luna', reason: 'missing key', capabilities: ['creative-analysis', 'code-synthesis', 'registered-three-runtime', 'browser-preview'] },
    { id: 'local', available: true, model: 'baseline-keyword-v1', reason: null, capabilities: ['deterministic-analysis', 'registered-three-runtime', 'browser-preview'] }
  ]
};

const palette = { deep: '#07141c', surface: '#102a35', text: '#f1fbff', muted: '#9bb7c2', accent: '#83ddff', accentSoft: '#c8f1e7' };
const evidence = [
  { field: 'subject', source: 'explicit', excerpts: ['海洋记忆'], confidence: .9, decision: '主体是海洋记忆展陈。' },
  { field: 'audience', source: 'inferred', excerpts: [], confidence: .6, decision: '面向普通数字展览访客。' },
  { field: 'visual', source: 'explicit', excerpts: ['清冷'], confidence: .8, decision: '使用冷色空间信号。' },
  { field: 'structure', source: 'inferred', excerpts: [], confidence: .7, decision: '用不同空间隐喻和互动关系形成方案。' }
];

function effectDraft(
  id: string,
  route: ModelInterpretation['effectSpecs'][number]['route'],
  drivers: ModelInterpretation['effectSpecs'][number]['motion']['drivers'],
  technique: ModelInterpretation['effectSpecs'][number]['composition']['layers'][number]['techniques'][number]
): ModelInterpretation['effectSpecs'][number] {
  const chromatic = id === 'refracted-tide';
  return {
    id,
    title: chromatic ? '折射潮汐' : '证据群岛',
    thesis: chromatic ? '让档案图片像潮水一样逐层显影并形成情绪记忆。' : '把证据组织成可选择、可回看的空间关系。',
    route,
    goal: {
      subject: '海洋记忆数字展陈', audience: '普通访客',
      desiredOutcome: '让访客理解档案之间的时间关系并记住核心证据。', primaryAction: '选择一条路径继续探索'
    },
    direction: {
      signatureMoment: chromatic ? '一张关键档案从折射光幕中完整显现并短暂停留。' : '访客选择后证据群岛重新排列并汇合到共同结论。',
      spatialMetaphor: chromatic ? '可穿行的记忆潮汐' : '相互连接的证据群岛',
      visualGrammar: chromatic ? ['折射色层', '流体留白', '档案显影'] : ['结构网格', '证据节点', '冷静尺度'],
      moodArc: chromatic ? ['克制建立', '潮汐靠近', '档案显影'] : ['建立坐标', '提出选择', '证据聚合', '结论停留'],
      palette
    },
    composition: {
      mode: chromatic ? 'hybrid-2.5d' : 'spatial-3d',
      domRole: '承载档案说明、导航、行动入口与无 WebGL 回退。',
      webglRole: '承载空间关系、镜头变化、氛围和核心记忆点。',
      layers: [
        { id: 'semantic-content', role: 'content', purpose: '提供完整可阅读的档案说明和操作路径。', techniques: ['dom-layout'], assetRequirementIds: [], visibleOutcome: '所有关键信息都能被阅读和键盘访问。' },
        { id: 'memory-world', role: 'world', purpose: '把海洋档案组织成与目标一致的空间记忆。', techniques: [technique, 'lighting'], assetRequirementIds: [], visibleOutcome: chromatic ? '档案随折射光层形成逐步显影。' : '证据节点随选择改变空间关系。' }
      ]
    },
    motion: { pace: 'measured', cameraStrategy: '先建立整体关系，再靠近关键证据，最后以稳定构图收束。', drivers, reducedMotion: '保留关键前后状态，以淡入和静态构图替代连续位移。' },
    assetRequirements: [],
    constraints: { targetDevices: ['desktop', 'mobile'], qualityIntent: 'presentable', targetFrameTimeMs: 16.7, maxInitialAssetBytes: 8_000_000 },
    reasoning: ['空间隐喻直接服务档案关系的理解。', 'DOM 与 WebGL 分工保证信息和氛围同时成立。']
  };
}

describe('model provider boundary', () => {
  it('prefers configured/available providers and keeps local as the final fallback', () => {
    expect(providerOrder('auto', status, {})).toEqual(['codex', 'minimax', 'local']);
    expect(providerOrder('auto', status, { CREATIVE_PROVIDER: 'codex' })).toEqual(['codex', 'minimax', 'local']);
    expect(() => providerOrder('openai', status, {})).toThrow(/missing key/);
  });

  it('normalizes direct model EffectSpecs and preserves them through orchestration', async () => {
    const brief = { text: '为海洋记忆数字展陈设计可探索的沉浸式网页。', seed: 17 };
    const effectSpecs = [
      effectDraft('refracted-tide', 'cinematic-showcase', ['timeline'], 'shader'),
      effectDraft('evidence-islands', 'immersive-page', ['scroll', 'choice'], 'procedural-geometry')
    ];
    const result = normalizeModelInterpretation(
      { subject: '海洋记忆数字展陈', audience: '普通访客', intentTags: ['archive', 'ocean'], evidence, capabilityGaps: [], effectSpecs, experienceBlueprints: effectSpecs.map((item, index) => modelBlueprint(item.id, index)) },
      { requested: 'codex', selected: 'codex', model: 'configured', mode: 'remote', latencyMs: 1200, fallbackReason: null, cacheStatus: 'miss' },
      brief
    );
    expect(result.effectSpecs?.map((item) => item.provenance.source)).toEqual(['model', 'model']);
    expect(result.effectSpecs?.map((item) => item.route)).toEqual(['cinematic-showcase', 'immersive-page']);
    expect(result.directions.map((item) => item.structure)).toEqual(['journey', 'journey']);
    expect(result.directions.map((item) => item.scenePlugin)).toEqual(['composed-world', 'signal-world']);
    expect(result.directions.every((item) => item.id.startsWith('runtime-effect-'))).toBe(true);
    const run = await generateCreativeRun(
      brief,
      { id: 'direct-effect-test', interpret: async () => result },
      { quality: 'balanced', renderer: 'webgl', motion: 'full' }
    );
    expect(run.candidates.map((candidate) => candidate.effectSpec.provenance.source)).toEqual(['model', 'model']);
    expect(run.candidates.map((candidate) => candidate.effectSpec.route)).toEqual(['cinematic-showcase', 'immersive-page']);
    expect(run.candidates.map((candidate) => candidate.manifest.scenes.main.plugin)).toEqual(['composed-world', 'signal-world']);
    expect(run.candidates[0].manifest.scenes.main.recipe?.sourceEffectSpecId).toBe(run.candidates[0].effectSpec.id);
    expect(run.candidates.every((candidate) => candidate.experienceBlueprint !== null)).toBe(true);
    expect(run.candidates.map((candidate) => Object.keys(candidate.manifest.nodes).length)).toEqual([2, 2]);
  });

  it('exports a top-level object schema for Codex CLI constrained output', () => {
    const schema = modelInterpretationJsonSchema() as { type?: string; properties?: Record<string, unknown> };
    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties || {})).toContain('effectSpecs');
    expect(Object.keys(schema.properties || {})).toContain('experienceBlueprints');
  });

  it('accepts one model-authored best direction without forcing demo alternatives', () => {
    const brief = { text: '为夜间生物材料温室设计沉浸式发布网页。', seed: 41 };
    const original = effectDraft('living-envelope', 'immersive-page', ['scroll'], 'procedural-geometry');
    const result = normalizeModelInterpretation(
      {
        subject: '夜间生物材料温室', audience: '建筑师与材料研究者', intentTags: ['biomaterial', 'night'],
        evidence, capabilityGaps: [], effectSpecs: [original],
        experienceBlueprints: [modelBlueprint(original.id, 0)]
      },
      { requested: 'codex', selected: 'codex', model: 'gpt-5.6-terra', mode: 'remote', latencyMs: 900, fallbackReason: null, cacheStatus: 'miss' },
      brief
    );
    expect(result.effectSpecs).toHaveLength(1);
    expect(result.experienceBlueprints).toHaveLength(1);
    expect(result.directions).toHaveLength(1);
  });

  it('rejects candidates that only rename the same effect design', () => {
    const brief = { text: '为海洋记忆数字展陈设计可探索的沉浸式网页。', seed: 17 };
    const original = effectDraft('refracted-tide', 'cinematic-showcase', ['timeline'], 'shader');
    const renamed = { ...structuredClone(original), id: 'renamed-copy', title: '另一个标题' };
    expect(() => normalizeModelInterpretation(
      {
        subject: '海洋记忆数字展陈', audience: '普通访客', intentTags: ['archive', 'ocean'],
        evidence, capabilityGaps: [], effectSpecs: [original, renamed],
        experienceBlueprints: [modelBlueprint(original.id, 0), modelBlueprint(renamed.id, 1)]
      },
      { requested: 'codex', selected: 'codex', model: 'configured', mode: 'remote', latencyMs: 1200, fallbackReason: null, cacheStatus: 'miss' },
      brief
    )).toThrow(/至少需要 3 个/);
  });
});
