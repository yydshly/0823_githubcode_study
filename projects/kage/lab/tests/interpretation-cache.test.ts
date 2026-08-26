import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ModelInterpretation } from '../server/model-schema.ts';
import { InterpretationCache } from '../server/interpretation-cache.ts';
import { modelBlueprint } from './fixtures/experience-blueprint';

const palette = { deep: '#07141c', surface: '#102a35', text: '#f1fbff', muted: '#9bb7c2', accent: '#83ddff', accentSoft: '#c8f1e7' };

function draft(id: string, route: ModelInterpretation['effectSpecs'][number]['route']): ModelInterpretation['effectSpecs'][number] {
  const alternate = id === 'evidence-field';
  return {
    id,
    title: alternate ? '证据场' : '声音潮汐',
    thesis: alternate ? '把核心能力组织成可以选择和比较的空间证据。' : '让声音通过光和空间变化形成可以记住的情绪。',
    route,
    goal: { subject: '智能声音产品', audience: '独立创作者', desiredOutcome: '让访客理解产品能力并建立明确的品牌记忆。', primaryAction: '开始体验产品' },
    direction: {
      signatureMoment: alternate ? '选择能力后证据节点重新排列并形成清晰结论。' : '声音轨迹汇聚成稳定的发光主体并短暂停留。',
      spatialMetaphor: alternate ? '可检索的证据场' : '被冻结的声音潮汐',
      visualGrammar: alternate ? ['结构网格', '证据节点'] : ['折射光层', '流体轨迹'],
      moodArc: alternate ? ['建立坐标', '主动选择', '证据汇合'] : ['克制建立', '能量靠近', '稳定显现'],
      palette
    },
    composition: {
      mode: alternate ? 'spatial-3d' : 'hybrid-2.5d',
      domRole: '承载可读说明、导航、行动入口和语义回退。', webglRole: '承载空间记忆、镜头、氛围和互动反馈。',
      layers: [
        { id: 'content', role: 'content', purpose: '提供完整可阅读内容和明确行动路径。', techniques: ['dom-layout'], assetRequirementIds: [], visibleOutcome: '禁用 WebGL 后仍能完整理解内容。' },
        { id: 'world', role: 'world', purpose: '建立与目标一致的空间主体和氛围关系。', techniques: alternate ? ['procedural-geometry', 'particles'] : ['shader', 'lighting'], assetRequirementIds: [], visibleOutcome: alternate ? '证据节点形成可比较关系。' : '光层随进度聚合成声音主体。' }
      ]
    },
    motion: { pace: 'measured', cameraStrategy: alternate ? '从整体网格靠近选择节点，再回到汇合后的英雄构图。' : '从远景缓慢靠近声音轨迹，并在主体显现后稳定停留。', drivers: alternate ? ['scroll', 'choice'] : ['scroll', 'pointer'], reducedMotion: '保留关键状态，用静态构图和淡入替代连续位移。' },
    assetRequirements: [],
    constraints: { targetDevices: ['desktop', 'mobile'], qualityIntent: 'presentable', targetFrameTimeMs: 16.7, maxInitialAssetBytes: 8_000_000 },
    reasoning: ['空间关系直接服务用户理解目标。']
  };
}

const output: ModelInterpretation = {
  subject: '智能声音产品', audience: '独立创作者', intentTags: ['audio', 'creator'],
  evidence: [
    { field: 'subject', source: 'explicit', excerpts: ['智能声音产品'], confidence: .95, decision: '主体是智能声音产品。' },
    { field: 'audience', source: 'explicit', excerpts: ['独立创作者'], confidence: .95, decision: '面向独立创作者。' },
    { field: 'mood', source: 'inferred', excerpts: ['清冷'], confidence: .8, decision: '采用清冷克制的情绪基线。' },
    { field: 'visual', source: 'inferred', excerpts: [], confidence: .7, decision: '用声音轨迹和证据结构形成差异。' }
  ],
  capabilityGaps: [],
  effectSpecs: [draft('sound-tide', 'immersive-page'), draft('evidence-field', 'technical-visualization')],
  experienceBlueprints: [modelBlueprint('sound-tide', 0), modelBlueprint('evidence-field', 1)]
};

describe('interpretation cache', () => {
  it('persists validated model output under an opaque deterministic key', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'signal-lab-cache-test-'));
    const cache = new InterpretationCache(directory);
    const brief = { text: '为独立创作者设计智能声音产品发布网页。', seed: 17 };
    try {
      expect(await cache.read('codex', 'configured', brief)).toBeNull();
      const key = await cache.write('codex', 'configured', brief, output);
      expect(key).toMatch(/^[a-f0-9]{64}$/);
      const hit = await cache.read('codex', 'configured', brief);
      expect(hit).toMatchObject({ key, output: { subject: '智能声音产品' } });
      expect(cache.key('codex', 'configured', { ...brief, seed: 18 })).not.toBe(key);
      expect(cache.key('minimax', 'configured', brief)).not.toBe(key);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
